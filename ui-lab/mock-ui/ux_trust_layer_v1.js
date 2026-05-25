/**
 * UX TRUST LAYER MINIMO V1 — solo presentazione, zero modifica dati API.
 * Applica DOPO parse V1, PRIMA del render DOM.
 */
(function initUxTrustLayer(global) {
  "use strict";

  const LOADING_STATUS = "aggiornamento in corso";

  const RELIABILITY_UI = Object.freeze({
    HIGH: "affidabile",
    MEDIUM: "discreto",
    LOW: "dati parziali"
  });

  const KITE_DECISION_UI = Object.freeze({
    GO: "buono",
    "NO GO": "non consigliato",
    BORDERLINE: "incerto"
  });

  function isNumber(v) {
    return typeof v === "number" && !Number.isNaN(v);
  }

  function roundKn(v) {
    return Math.round(Number(v) * 10) / 10;
  }

  function formatWindKn(value) {
    if (!isNumber(value) || value <= 0) return "— kn";
    return `${roundKn(value)} kn`;
  }

  function formatDirection(value, label) {
    if (typeof label === "string" && label.trim()) return label.trim().toUpperCase();
    if (value == null || value === "") return "—";
    return "—";
  }

  function formatReliability(code) {
    if (!code) return "—";
    const key = String(code).trim().toUpperCase();
    return RELIABILITY_UI[key] || "dati parziali";
  }

  function formatKiteDecision(code) {
    if (!code) return "—";
    const key = String(code).trim().toUpperCase();
    return KITE_DECISION_UI[key] || String(code);
  }

  function formatTrendSlot(fc, fallbackLabel) {
    if (!fc || !isNumber(fc.wind_knots) || fc.wind_knots < 0) {
      return { wind: "— kn", direction: "—", name: fallbackLabel || "—", stable: true };
    }
    return {
      wind: `${roundKn(fc.wind_knots)} kn`,
      direction: formatDirection(fc.wind_direction, fallbackLabel),
      name: formatDirection(null, fallbackLabel),
      stable: false
    };
  }

  /**
   * @param {object} payload — view model da LiveSpotWindAdapterV1 (post-V1)
   * @returns {object} campi solo display
   */
  function normalizeTrustUI(payload) {
    const p = payload && typeof payload === "object" ? payload : {};
    const loading = Boolean(p.loading) || p.cache === "ui_loading";

    if (loading) {
      return {
        loading: true,
        statusLine: LOADING_STATUS,
        windDisplay: LOADING_STATUS,
        gustDisplay: LOADING_STATUS,
        directionDisplay: LOADING_STATUS,
        windNameDisplay: LOADING_STATUS,
        reliabilityDisplay: LOADING_STATUS,
        spotDisplay: LOADING_STATUS,
        updatedAtDisplay: "",
        trend1: { wind: LOADING_STATUS, direction: LOADING_STATUS, name: LOADING_STATUS },
        trend2: { wind: LOADING_STATUS, direction: LOADING_STATUS, name: LOADING_STATUS },
        trend3: { wind: LOADING_STATUS, direction: LOADING_STATUS, name: LOADING_STATUS }
      };
    }

    const dirLabel = p.wind_direction_label || null;
    const relUi = formatReliability(p.reliability);

    return {
      loading: false,
      statusLine: "",
      windDisplay: formatWindKn(p.wind_knots),
      gustDisplay: formatWindKn(p.gust_knots),
      directionDisplay: formatDirection(p.wind_direction, dirLabel),
      windNameDisplay: formatDirection(p.wind_direction, dirLabel),
      reliabilityDisplay: relUi,
      spotDisplay: (p.spot && String(p.spot).trim()) || "—",
      updatedAtDisplay: "",
      trend1: formatTrendSlot(p.forecast_1h, dirLabel),
      trend2: formatTrendSlot(p.forecast_2h, dirLabel),
      trend3: formatTrendSlot(p.forecast_3h, dirLabel)
    };
  }

  global.UxTrustLayerV1 = Object.freeze({
    normalizeTrustUI,
    LOADING_STATUS,
    RELIABILITY_UI,
    KITE_DECISION_UI
  });
})(typeof window !== "undefined" ? window : globalThis);
