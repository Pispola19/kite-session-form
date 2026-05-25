/**
 * SIERRA — NOT IN PRODUCTION LOCK V1 CHAIN. Do not load in index.html.
 * SINGLE TRUTH DISPLAY CONTRACT V1 — mappa V1 → display passivo (unica logica ammessa prima del render).
 * Nessuna interpretazione meteo: solo presenza campi + formattazione layout (kn, ora).
 */
(function initSingleTruthDisplay(global) {
  "use strict";

  const FIELD_PRESENT = "present";
  const FIELD_MISSING = "missing_data";
  const FIELD_NO_FORECAST = "no_forecast";

  function isNumber(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function roundKn(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function fieldPresent(text) {
    return { state: FIELD_PRESENT, text: text == null ? "" : String(text) };
  }

  function fieldMissing() {
    return { state: FIELD_MISSING, text: "" };
  }

  function fieldNoForecast() {
    return { state: FIELD_NO_FORECAST, text: "" };
  }

  function layoutWindKn(knots) {
    if (!isNumber(knots)) return fieldMissing();
    return fieldPresent(`${roundKn(knots)} kn`);
  }

  function layoutDirection(label) {
    if (typeof label === "string" && label.trim()) {
      return fieldPresent(label.trim().toUpperCase());
    }
    return fieldMissing();
  }

  function layoutForecastSlot(fc) {
    if (!fc || !isNumber(fc.wind_knots)) return fieldNoForecast();
    return layoutWindKn(fc.wind_knots);
  }

  function layoutUpdatedAt(iso, timeFormatFn) {
    if (!iso || !String(iso).trim()) return fieldMissing();
    if (typeof timeFormatFn === "function") {
      const t = timeFormatFn(iso);
      return t ? fieldPresent(t) : fieldMissing();
    }
    return fieldPresent(String(iso).trim());
  }

  /**
   * @param {object} model — modello risolto da WIND DECISION OUTPUT V1
   * @param {{ formatTime?: function }} [opts]
   */
  function buildSingleTruthDisplay(model, opts) {
    const m = model && typeof model === "object" ? model : {};
    const formatTime =
      opts && typeof opts.formatTime === "function" ? opts.formatTime : null;

    let data_state = "missing_data";
    if (m.uiRenderState === "fetching") data_state = "fetching";
    else if (m.uiRenderState === "idle") data_state = "idle";
    else if (m.uiRenderState === "empty") data_state = "error";
    else if (m.uiRenderState === "full") data_state = "full";
    else if (m.uiRenderState === "partial") data_state = "partial";

    const dir = layoutDirection(m.wind_direction_label);

    return {
      data_state,
      wind: layoutWindKn(m.wind_knots),
      gust: layoutWindKn(m.gust_knots),
      direction: dir,
      wind_name: dir,
      spot:
        typeof m.spot === "string" && m.spot.trim() ? fieldPresent(m.spot.trim()) : fieldMissing(),
      reliability:
        typeof m.reliability === "string" && m.reliability.trim()
          ? fieldPresent(m.reliability.trim().toUpperCase())
          : fieldMissing(),
      kite_decision:
        typeof m.kite_decision === "string" && m.kite_decision.trim()
          ? fieldPresent(m.kite_decision.trim().toUpperCase())
          : fieldMissing(),
      updated_at: layoutUpdatedAt(m.updated_at, formatTime),
      forecast_1h: layoutForecastSlot(m.forecast_1h),
      forecast_2h: layoutForecastSlot(m.forecast_2h),
      forecast_3h: layoutForecastSlot(m.forecast_3h)
    };
  }

  global.SingleTruthDisplayV1 = Object.freeze({
    FIELD_PRESENT,
    FIELD_MISSING,
    FIELD_NO_FORECAST,
    buildSingleTruthDisplay
  });
})(typeof window !== "undefined" ? window : globalThis);
