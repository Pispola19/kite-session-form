/**
 * UX TRUST LAYER MINIMO V1 — solo presentazione, zero modifica dati API.
 * Applica DOPO parse V1, PRIMA del render DOM.
 */
(function initUxTrustLayer(global) {
  "use strict";

  const LOADING_STATUS = "aggiornamento in corso";
  const EMPTY_CONNECTION_STATUS = "Connessione vento…";
  const MISSING_FIELD = "—";

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
    if (!isNumber(value)) return "— kn";
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
    const uiState =
      p.uiRenderState ||
      (Boolean(p.loading) || p.cache === "ui_loading" ? "fetching" : "empty");

    if (uiState === "fetching") {
      return {
        loading: true,
        uiRenderState: "fetching",
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

    if (uiState === "empty") {
      return {
        loading: false,
        uiRenderState: "empty",
        statusLine: EMPTY_CONNECTION_STATUS,
        windDisplay: EMPTY_CONNECTION_STATUS,
        gustDisplay: EMPTY_CONNECTION_STATUS,
        directionDisplay: EMPTY_CONNECTION_STATUS,
        windNameDisplay: EMPTY_CONNECTION_STATUS,
        reliabilityDisplay: EMPTY_CONNECTION_STATUS,
        spotDisplay: EMPTY_CONNECTION_STATUS,
        updatedAtDisplay: EMPTY_CONNECTION_STATUS,
        trend1: { wind: EMPTY_CONNECTION_STATUS, direction: EMPTY_CONNECTION_STATUS, name: EMPTY_CONNECTION_STATUS },
        trend2: { wind: EMPTY_CONNECTION_STATUS, direction: EMPTY_CONNECTION_STATUS, name: EMPTY_CONNECTION_STATUS },
        trend3: { wind: EMPTY_CONNECTION_STATUS, direction: EMPTY_CONNECTION_STATUS, name: EMPTY_CONNECTION_STATUS }
      };
    }

    const dirLabel = p.wind_direction_label || null;
    const relUi = formatReliability(p.reliability);
    const hasWind = isNumber(p.wind_knots);
    const hasDir =
      (typeof dirLabel === "string" && dirLabel.trim()) || p.wind_direction != null;
    const hasSpot = typeof p.spot === "string" && p.spot.trim();

    return {
      loading: false,
      uiRenderState: uiState,
      statusLine: "",
      windDisplay: hasWind ? formatWindKn(p.wind_knots) : "— kn",
      gustDisplay: isNumber(p.gust_knots) ? formatWindKn(p.gust_knots) : "— kn",
      directionDisplay: hasDir ? formatDirection(p.wind_direction, dirLabel) : MISSING_FIELD,
      windNameDisplay: hasDir ? formatDirection(p.wind_direction, dirLabel) : MISSING_FIELD,
      reliabilityDisplay: p.reliability ? relUi : MISSING_FIELD,
      spotDisplay: hasSpot ? String(p.spot).trim() : MISSING_FIELD,
      updatedAtDisplay: "",
      trend1: formatTrendSlot(p.forecast_1h, dirLabel),
      trend2: formatTrendSlot(p.forecast_2h, dirLabel),
      trend3: formatTrendSlot(p.forecast_3h, dirLabel)
    };
  }

  global.UxTrustLayerV1 = Object.freeze({
    normalizeTrustUI,
    LOADING_STATUS,
    EMPTY_CONNECTION_STATUS,
    MISSING_FIELD,
    RELIABILITY_UI,
    KITE_DECISION_UI
  });
})(typeof window !== "undefined" ? window : globalThis);
