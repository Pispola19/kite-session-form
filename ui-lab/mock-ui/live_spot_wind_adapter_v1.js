/**
 * UX EMERGENCY ROLLBACK V1 — frontend-only wind adapter.
 * Supports legacy /wind/latest payload + WIND DECISION OUTPUT V1.
 * Never blocks render when V1 exists; UI fallbacks only (no backend changes).
 */
(function initLiveSpotWindAdapter(global) {
  "use strict";

  const DIR_DEG_BY_ABBR = Object.freeze({
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5
  });

  const RELIABILITY_CONFIDENCE = Object.freeze({
    HIGH: 0.82,
    MEDIUM: 0.55,
    LOW: 0.28
  });

  const UI_DEFAULT_WIND_KNOTS = 12;
  const UI_DEFAULT_DIRECTION_DEG = 0;

  function isNumber(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function readFirst(source, keys) {
    if (!source || typeof source !== "object") return null;
    for (let i = 0; i < keys.length; i += 1) {
      const value = source[keys[i]];
      if (value != null && value !== "") return value;
    }
    return null;
  }

  function normalizeWindDirection(value) {
    if (isNumber(value)) return ((value % 360) + 360) % 360;
    if (typeof value !== "string") return null;
    const key = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
    return Object.prototype.hasOwnProperty.call(DIR_DEG_BY_ABBR, key)
      ? DIR_DEG_BY_ABBR[key]
      : null;
  }

  function reliabilityToConfidence(reliability) {
    if (typeof reliability !== "string") return null;
    const key = reliability.trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(RELIABILITY_CONFIDENCE, key)
      ? RELIABILITY_CONFIDENCE[key]
      : null;
  }

  function forecastSliceFromTrend(trend, hour, directionDeg, gustKnots) {
    const wind = trend && isNumber(trend[hour]) ? trend[hour] : null;
    if (wind == null && directionDeg == null && gustKnots == null) return null;
    return {
      wind_knots: wind,
      gust_knots: gustKnots != null ? gustKnots : null,
      wind_direction: directionDeg,
      forecast_at: null
    };
  }

  function normalizeForecastSlice(raw, fallbackWind, fallbackDirection) {
    if (!raw || typeof raw !== "object") {
      if (!isNumber(fallbackWind) && fallbackDirection == null) return null;
      return {
        wind_knots: isNumber(fallbackWind) ? fallbackWind : null,
        gust_knots: null,
        wind_direction: fallbackDirection,
        forecast_at: null
      };
    }
    const wind_knots = isNumber(raw.wind_knots) ? raw.wind_knots : (isNumber(fallbackWind) ? fallbackWind : null);
    const gust_knots = isNumber(raw.gust_knots) ? raw.gust_knots : null;
    let wind_direction = normalizeWindDirection(raw.wind_direction);
    if (wind_direction == null) wind_direction = fallbackDirection;
    const forecast_at = typeof raw.forecast_at === "string" ? raw.forecast_at : null;
    if (wind_knots == null && gust_knots == null && wind_direction == null && forecast_at == null) {
      return null;
    }
    return { wind_knots, gust_knots, wind_direction, forecast_at };
  }

  function normalizeWindDecisionOutput(data) {
    const decision = data && typeof data === "object" ? data["WIND DECISION OUTPUT V1"] : null;
    if (!decision || typeof decision !== "object") return null;

    const trend =
      decision["WIND TREND (1h / 2h / 3h)"] && typeof decision["WIND TREND (1h / 2h / 3h)"] === "object"
        ? decision["WIND TREND (1h / 2h / 3h)"]
        : {};

    const direction = normalizeWindDirection(decision["WIND DIRECTION (kite-relevant)"]);
    const reliability =
      typeof decision.RELIABILITY === "string" ? decision.RELIABILITY.trim().toUpperCase() : null;

    let wind_knots = isNumber(decision["WIND NOW (knots)"]) ? decision["WIND NOW (knots)"] : null;
    if (wind_knots == null) {
      for (const hour of ["1h", "2h", "3h"]) {
        if (isNumber(trend[hour])) {
          wind_knots = trend[hour];
          break;
        }
      }
    }

    const gust_knots = isNumber(decision["GUST NOW (knots)"]) ? decision["GUST NOW (knots)"] : null;

    return {
      ok: true,
      spot: typeof decision["SPOT RESOLVED"] === "string" ? decision["SPOT RESOLVED"] : "",
      wind_knots,
      gust_knots,
      wind_direction: direction,
      source: "wind_decision_output_v1",
      source_type: "decision_output",
      confidence: reliabilityToConfidence(reliability),
      reliability,
      kite_decision: typeof decision["KITE DECISION"] === "string" ? decision["KITE DECISION"] : null,
      observed_at: null,
      updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
      cache: typeof data.cache === "string" ? data.cache : "api_live",
      error: typeof data.error === "string" ? data.error : null,
      resolution: null,
      sources_used: null,
      forecast_1h: forecastSliceFromTrend(trend, "1h", direction, gust_knots),
      forecast_2h: forecastSliceFromTrend(trend, "2h", direction, gust_knots),
      forecast_3h: forecastSliceFromTrend(trend, "3h", direction, gust_knots)
    };
  }

  function normalizeLegacyPayload(data) {
    if (!data || typeof data !== "object") return null;
    const source = data.latest || data.data || data.wind || data;
    const root = typeof source === "object" ? source : data;

    const wind_knots = readFirst(root, ["wind_knots", "wind_kt", "wind_kts", "wind", "speed_knots"]);
    const gust_knots = readFirst(root, ["gust_knots", "gust_kt", "gust_kts", "gust"]);
    const wind_direction = normalizeWindDirection(
      readFirst(root, ["wind_direction", "direction", "direction_deg", "wind_dir", "wind_dir_deg"])
    );

    const forecasts = Array.isArray(data.forecasts) ? data.forecasts : [];
    const pickForecast = (index) => {
      if (forecasts[index] && typeof forecasts[index] === "object") return forecasts[index];
      return null;
    };

    const legacy = {
      ok: Boolean(data.ok !== false),
      spot: String(readFirst(root, ["spot", "station", "canonical_spot", "location"]) || data.spot || ""),
      wind_knots: isNumber(Number(wind_knots)) ? Number(wind_knots) : null,
      gust_knots: isNumber(Number(gust_knots)) ? Number(gust_knots) : null,
      wind_direction,
      source: typeof data.source === "string" ? data.source : null,
      sources_used: Array.isArray(data.sources_used) ? data.sources_used : null,
      source_type: typeof data.source_type === "string" ? data.source_type : null,
      confidence: isNumber(data.confidence) ? data.confidence : null,
      reliability: typeof data.reliability === "string" ? data.reliability : null,
      kite_decision: typeof data.kite_decision === "string" ? data.kite_decision : null,
      observed_at: typeof data.observed_at === "string" ? data.observed_at : null,
      updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
      cache: typeof data.cache === "string" ? data.cache : "api_live",
      error: typeof data.error === "string" ? data.error : null,
      resolution: data.resolution && typeof data.resolution === "object" ? data.resolution : null,
      forecast_1h: normalizeForecastSlice(data.forecast_1h || pickForecast(0), null, wind_direction),
      forecast_2h: normalizeForecastSlice(data.forecast_2h || pickForecast(1), null, wind_direction),
      forecast_3h: normalizeForecastSlice(data.forecast_3h || pickForecast(2), null, wind_direction)
    };

    if (!legacy.reliability && isNumber(legacy.confidence)) {
      if (legacy.confidence >= 0.74) legacy.reliability = "HIGH";
      else if (legacy.confidence >= 0.45) legacy.reliability = "MEDIUM";
      else legacy.reliability = "LOW";
    }

    return legacy;
  }

  function applyUiWindFallback(normalized) {
    const p = Object.assign({}, normalized || {});
    const fallbackDir =
      p.wind_direction != null ? p.wind_direction : UI_DEFAULT_DIRECTION_DEG;

    if (!p.reliability) {
      if (p.confidence != null && p.confidence >= 0.74) p.reliability = "HIGH";
      else if (p.confidence != null && p.confidence >= 0.45) p.reliability = "MEDIUM";
      else p.reliability = "LOW";
    }

    if (p.confidence == null && p.reliability) {
      p.confidence = reliabilityToConfidence(p.reliability);
    }

    if (!isNumber(p.wind_knots)) {
      for (const key of ["forecast_1h", "forecast_2h", "forecast_3h"]) {
        const fc = p[key];
        if (fc && isNumber(fc.wind_knots)) {
          p.wind_knots = fc.wind_knots;
          break;
        }
      }
    }

    if (!isNumber(p.wind_knots)) {
      p.wind_knots = UI_DEFAULT_WIND_KNOTS;
      p.cache = p.cache || "ui_estimated_wind";
    }

    if (p.wind_direction == null) {
      p.wind_direction = fallbackDir;
    }

    const baseWind = p.wind_knots;
    const deltas = [0, -0.4, 0.3];
    p.forecast_1h = normalizeForecastSlice(p.forecast_1h, baseWind + deltas[0], fallbackDir);
    p.forecast_2h = normalizeForecastSlice(
      p.forecast_2h,
      isNumber(p.forecast_1h && p.forecast_1h.wind_knots) ? p.forecast_1h.wind_knots + deltas[1] : baseWind + deltas[1],
      fallbackDir
    );
    p.forecast_3h = normalizeForecastSlice(
      p.forecast_3h,
      isNumber(p.forecast_2h && p.forecast_2h.wind_knots) ? p.forecast_2h.wind_knots + deltas[2] : baseWind + deltas[2],
      fallbackDir
    );

    if (!p.kite_decision) {
      const w = p.wind_knots;
      if (w >= 14 && w <= 25) p.kite_decision = "GO";
      else if (w >= 10 && w <= 30) p.kite_decision = "BORDERLINE";
      else p.kite_decision = "NO GO";
    }

    p.ok = true;
    return p;
  }

  function normalizeLiveSpotPayload(data) {
    const fromV1 = normalizeWindDecisionOutput(data);
    const fromLegacy = fromV1 ? null : normalizeLegacyPayload(data);
    const merged = fromV1 || fromLegacy || {
      ok: false,
      spot: "",
      wind_knots: null,
      gust_knots: null,
      wind_direction: null,
      cache: "mock_no_data"
    };
    return applyUiWindFallback(merged);
  }

  function hasUsableLiveSpotData(data) {
    if (!data || typeof data !== "object") return false;
    if (data.needs_disambiguation) return false;

    if (data["WIND DECISION OUTPUT V1"] && typeof data["WIND DECISION OUTPUT V1"] === "object") {
      return true;
    }

    const normalized = normalizeLiveSpotPayload(data);
    return isNumber(normalized.wind_knots) && normalized.wind_direction != null;
  }

  async function parseWindLatestResponse(response) {
    let body = null;
    try {
      body = await response.json();
    } catch (_err) {
      body = null;
    }

    if (body && typeof body === "object" && body["WIND DECISION OUTPUT V1"]) {
      return body;
    }

    if (!response.ok) {
      if (body && typeof body === "object") return body;
      throw new Error("HTTP_" + response.status);
    }

    return body;
  }

  global.LiveSpotWindAdapterV1 = Object.freeze({
    normalizeWindDirection,
    normalizeWindDecisionOutput,
    normalizeLegacyPayload,
    normalizeLiveSpotPayload,
    applyUiWindFallback,
    hasUsableLiveSpotData,
    parseWindLatestResponse,
    reliabilityToConfidence
  });
})(typeof window !== "undefined" ? window : globalThis);
