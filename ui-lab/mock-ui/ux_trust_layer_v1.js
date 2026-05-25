/**
 * UX TRUST LAYER MINIMO V1 — solo presentazione dati, zero DOM.
 * Tutti i testi via VentoLiveI18nV1.t(key, lang).
 */
(function initUxTrustLayer(global) {
  "use strict";

  function tt(key, lang) {
    const i18n = global.VentoLiveI18nV1;
    if (i18n && typeof i18n.t === "function") return i18n.t(key, lang);
    return key;
  }

  function isNumber(v) {
    return typeof v === "number" && !Number.isNaN(v);
  }

  function roundKn(v) {
    return Math.round(Number(v) * 10) / 10;
  }

  function formatWindKn(value, lang) {
    const i18n = global.VentoLiveI18nV1;
    if (i18n && typeof i18n.windKnLabel === "function") {
      return i18n.windKnLabel(value, lang);
    }
    if (!isNumber(value)) return tt("wind_ui_forecast_missing", lang);
    return `${roundKn(value)} kn`;
  }

  function formatDirection(value, label, lang) {
    if (typeof label === "string" && label.trim()) return label.trim().toUpperCase();
    if (value == null || value === "") return tt("wind_ui_field_missing", lang);
    return tt("wind_ui_field_missing", lang);
  }

  function formatReliability(code, lang) {
    const i18n = global.VentoLiveI18nV1;
    if (i18n && typeof i18n.reliabilityLabel === "function") {
      return i18n.reliabilityLabel(code, lang);
    }
    if (!code) return tt("wind_ui_field_missing", lang);
    return tt("wind_ui_field_missing", lang);
  }

  function formatTrendSlot(fc, fallbackLabel, lang) {
    const missing = tt("wind_ui_field_missing", lang);
    const missingKn = tt("wind_ui_forecast_missing", lang);
    if (!fc || !isNumber(fc.wind_knots) || fc.wind_knots < 0) {
      return { wind: missingKn, direction: missing, name: fallbackLabel || missing, stable: true };
    }
    return {
      wind: formatWindKn(fc.wind_knots, lang),
      direction: formatDirection(fc.wind_direction, fallbackLabel, lang),
      name: formatDirection(null, fallbackLabel, lang),
      stable: false
    };
  }

  /**
   * @param {object} payload — view model contract V1
   * @param {string} [lang]
   */
  function normalizeTrustUI(payload, lang) {
    const p = payload && typeof payload === "object" ? payload : {};
    const uiState =
      p.uiRenderState ||
      (Boolean(p.loading) || p.cache === "ui_loading" ? "fetching" : "empty");

    if (uiState === "fetching") {
      const fetching = tt("wind_ui_state_fetching", lang);
      return {
        loading: true,
        uiRenderState: "fetching",
        statusLine: fetching,
        windDisplay: fetching,
        gustDisplay: fetching,
        directionDisplay: fetching,
        windNameDisplay: fetching,
        reliabilityDisplay: fetching,
        spotDisplay: fetching,
        updatedAtDisplay: "",
        trend1: { wind: fetching, direction: fetching, name: fetching },
        trend2: { wind: fetching, direction: fetching, name: fetching },
        trend3: { wind: fetching, direction: fetching, name: fetching }
      };
    }

    if (uiState === "empty") {
      const empty = tt("wind_ui_state_empty", lang);
      return {
        loading: false,
        uiRenderState: "empty",
        statusLine: empty,
        windDisplay: empty,
        gustDisplay: empty,
        directionDisplay: empty,
        windNameDisplay: empty,
        reliabilityDisplay: empty,
        spotDisplay: empty,
        updatedAtDisplay: empty,
        trend1: { wind: empty, direction: empty, name: empty },
        trend2: { wind: empty, direction: empty, name: empty },
        trend3: { wind: empty, direction: empty, name: empty }
      };
    }

    if (uiState === "idle") {
      const idle = tt("wind_ui_state_idle", lang);
      return {
        loading: false,
        uiRenderState: "idle",
        statusLine: idle,
        windDisplay: idle,
        gustDisplay: idle,
        directionDisplay: idle,
        windNameDisplay: idle,
        reliabilityDisplay: idle,
        spotDisplay: idle,
        updatedAtDisplay: idle,
        trend1: { wind: idle, direction: idle, name: idle },
        trend2: { wind: idle, direction: idle, name: idle },
        trend3: { wind: idle, direction: idle, name: idle }
      };
    }

    const dirLabel = p.wind_direction_label || null;
    const relUi = formatReliability(p.reliability, lang);
    const missing = tt("wind_ui_field_missing", lang);
    const hasWind = isNumber(p.wind_knots);
    const hasDir =
      (typeof dirLabel === "string" && dirLabel.trim()) || p.wind_direction != null;
    const hasSpot = typeof p.spot === "string" && p.spot.trim();

    return {
      loading: false,
      uiRenderState: uiState,
      statusLine: "",
      windDisplay: hasWind ? formatWindKn(p.wind_knots, lang) : tt("wind_ui_forecast_missing", lang),
      gustDisplay: isNumber(p.gust_knots) ? formatWindKn(p.gust_knots, lang) : tt("wind_ui_forecast_missing", lang),
      directionDisplay: hasDir ? formatDirection(p.wind_direction, dirLabel, lang) : missing,
      windNameDisplay: hasDir ? formatDirection(p.wind_direction, dirLabel, lang) : missing,
      reliabilityDisplay: p.reliability ? relUi : missing,
      spotDisplay: hasSpot ? String(p.spot).trim() : missing,
      updatedAtDisplay: "",
      trend1: formatTrendSlot(p.forecast_1h, dirLabel, lang),
      trend2: formatTrendSlot(p.forecast_2h, dirLabel, lang),
      trend3: formatTrendSlot(p.forecast_3h, dirLabel, lang)
    };
  }

  global.UxTrustLayerV1 = Object.freeze({
    normalizeTrustUI
  });
})(typeof window !== "undefined" ? window : globalThis);
