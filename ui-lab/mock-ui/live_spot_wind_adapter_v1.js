/**
 * WIND DECISION OUTPUT V1 — UNICO CONTRATTO (definitivo).
 * Nessun legacy. Nessun fallback numerico. Nessuna modifica valori API.
 */
(function initWindDecisionV1Contract(global) {
  "use strict";

  const PRODUCT_KEY = "WIND DECISION OUTPUT V1";
  const WIND_LATEST_URL = "https://api.ventolive.com/wind/latest";

  const DIR_DEG_BY_ABBR = Object.freeze({
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5
  });

  function isNumber(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function roundKn(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function directionToDeg(value) {
    if (isNumber(value)) return ((value % 360) + 360) % 360;
    if (typeof value !== "string") return null;
    const key = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
    return Object.prototype.hasOwnProperty.call(DIR_DEG_BY_ABBR, key)
      ? DIR_DEG_BY_ABBR[key]
      : null;
  }

  function hasWindDecisionV1(data) {
    return Boolean(
      data &&
      typeof data === "object" &&
      data[PRODUCT_KEY] &&
      typeof data[PRODUCT_KEY] === "object"
    );
  }

  /** @returns {null | object} view model for render — null = show loading only */
  function parseWindDecisionV1(data) {
    if (!hasWindDecisionV1(data)) return null;

    const d = data[PRODUCT_KEY];
    const trend =
      d["WIND TREND (1h / 2h / 3h)"] && typeof d["WIND TREND (1h / 2h / 3h)"] === "object"
        ? d["WIND TREND (1h / 2h / 3h)"]
        : {};

    const directionRaw =
      typeof d["WIND DIRECTION (kite-relevant)"] === "string"
        ? d["WIND DIRECTION (kite-relevant)"].trim()
        : null;
    const directionDeg = directionToDeg(d["WIND DIRECTION (kite-relevant)"]);

    const windNow = isNumber(d["WIND NOW (knots)"]) ? roundKn(d["WIND NOW (knots)"]) : null;
    const gustNow = isNumber(d["GUST NOW (knots)"]) ? roundKn(d["GUST NOW (knots)"]) : null;

    const trendHour = (hour) =>
      isNumber(trend[hour]) ? roundKn(trend[hour]) : null;

    const updatedAt =
      (typeof d.updated_at === "string" && d.updated_at) ||
      (typeof data.updated_at === "string" && data.updated_at) ||
      (typeof data.generated_at === "string" && data.generated_at) ||
      "";

    return {
      contract: "wind_decision_output_v1",
      loading: false,
      ok: true,
      spot: typeof d["SPOT RESOLVED"] === "string" ? d["SPOT RESOLVED"].trim() : "",
      wind_knots: windNow,
      gust_knots: gustNow,
      wind_direction: directionDeg,
      wind_direction_label: directionRaw,
      kite_decision:
        typeof d["KITE DECISION"] === "string" ? d["KITE DECISION"].trim() : null,
      reliability:
        typeof d.RELIABILITY === "string" ? d.RELIABILITY.trim().toUpperCase() : null,
      updated_at: updatedAt,
      cache: "api_v1_direct",
      forecast_1h: {
        wind_knots: trendHour("1h"),
        wind_direction: directionDeg,
        gust_knots: null,
        forecast_at: null
      },
      forecast_2h: {
        wind_knots: trendHour("2h"),
        wind_direction: directionDeg,
        gust_knots: null,
        forecast_at: null
      },
      forecast_3h: {
        wind_knots: trendHour("3h"),
        wind_direction: directionDeg,
        gust_knots: null,
        forecast_at: null
      },
      _raw_v1: d
    };
  }

  function loadingPlaceholder() {
    return {
      contract: "wind_decision_output_v1",
      loading: true,
      ok: false,
      spot: "",
      wind_knots: null,
      gust_knots: null,
      wind_direction: null,
      wind_direction_label: null,
      kite_decision: null,
      reliability: null,
      updated_at: "",
      cache: "ui_loading",
      forecast_1h: null,
      forecast_2h: null,
      forecast_3h: null
    };
  }

  async function parseWindLatestResponse(response) {
    let body = null;
    try {
      body = await response.json();
    } catch (_e) {
      return null;
    }
    if (hasWindDecisionV1(body)) return body;
    return null;
  }

  function normalizeLiveSpotPayload(data) {
    const parsed = parseWindDecisionV1(data);
    return parsed || loadingPlaceholder();
  }

  function hasUsableLiveSpotData(data) {
    return hasWindDecisionV1(data);
  }

  global.LiveSpotWindAdapterV1 = Object.freeze({
    WIND_LATEST_URL,
    PRODUCT_KEY,
    hasWindDecisionV1,
    hasUsableLiveSpotData,
    parseWindDecisionV1,
    parseWindLatestResponse,
    normalizeLiveSpotPayload,
    loadingPlaceholder,
    directionToDeg
  });

  global.WindDecisionV1Contract = global.LiveSpotWindAdapterV1;
})(typeof window !== "undefined" ? window : globalThis);
