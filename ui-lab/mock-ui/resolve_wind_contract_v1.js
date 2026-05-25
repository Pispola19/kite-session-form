/**
 * SIERRA — NOT IN PRODUCTION LOCK V1 CHAIN. Do not load in index.html.
 * VENTO LIVE UNIVERSAL CONTRACT V1 — unica verità logica frontend.
 * API → WIND DECISION OUTPUT V1 → resolveWindContractV1 → UX render.
 * Nessun legacy, nessun fallback semantico, nessuna interpretazione parallela del vento.
 */
(function initWindContractV1(global) {
  "use strict";

  const PRODUCT_KEY = "WIND DECISION OUTPUT V1";
  const CONTRACT_ID = "wind_decision_output_v1";

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

  function isLegacyWindPayload(data) {
    if (!data || typeof data !== "object") return false;
    if (hasWindDecisionV1(data)) return false;
    if (data.contract === CONTRACT_ID) return false;
    return (
      typeof data.wind_knots === "number" ||
      typeof data.wind_kt === "number" ||
      typeof data.latest === "object" ||
      typeof data.wind === "object"
    );
  }

  function emptyModel() {
    const base = {
      contract: CONTRACT_ID,
      loading: false,
      ok: false,
      uiRenderState: "empty",
      data_state: "error",
      spot: "",
      wind_knots: null,
      gust_knots: null,
      wind_direction: null,
      wind_direction_label: null,
      kite_decision: null,
      reliability: null,
      updated_at: "",
      cache: "ui_empty",
      forecast_1h: null,
      forecast_2h: null,
      forecast_3h: null
    };
    return attachDisplay(base);
  }

  function loadingModel() {
    const base = {
      contract: CONTRACT_ID,
      loading: true,
      ok: false,
      uiRenderState: "fetching",
      data_state: "fetching",
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
    return attachDisplay(base);
  }

  function idleModel() {
    const base = {
      contract: CONTRACT_ID,
      loading: false,
      ok: false,
      uiRenderState: "idle",
      data_state: "idle",
      spot: "",
      wind_knots: null,
      gust_knots: null,
      wind_direction: null,
      wind_direction_label: null,
      kite_decision: null,
      reliability: null,
      updated_at: "",
      cache: "ui_idle",
      forecast_1h: null,
      forecast_2h: null,
      forecast_3h: null
    };
    return attachDisplay(base);
  }

  function hasWindNow(model) {
    return isNumber(model.wind_knots);
  }

  function hasDirection(model) {
    if (typeof model.wind_direction_label === "string" && model.wind_direction_label.trim()) {
      return true;
    }
    if (isNumber(model.wind_direction)) return true;
    const raw = model._raw_v1 && model._raw_v1["WIND DIRECTION (kite-relevant)"];
    return directionToDeg(raw) != null;
  }

  function hasSpotResolved(model) {
    return typeof model.spot === "string" && model.spot.trim().length > 0;
  }

  /** Almeno uno tra wind_now, direction, spot_resolved. */
  function hasAnyWindData(model) {
    if (!model || typeof model !== "object") return false;
    return hasWindNow(model) || hasDirection(model) || hasSpotResolved(model);
  }

  function deriveUiRenderState(model) {
    if (!hasAnyWindData(model)) return "empty";
    if (hasWindNow(model) && hasDirection(model) && hasSpotResolved(model)) return "full";
    return "partial";
  }

  function isResolvedContractModel(data) {
    return Boolean(
      data &&
      typeof data === "object" &&
      data.contract === CONTRACT_ID &&
      !data[PRODUCT_KEY]
    );
  }

  function parseWindDecisionV1(data) {
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

    const trendHour = (hour) => (isNumber(trend[hour]) ? roundKn(trend[hour]) : null);

    const updatedAt =
      (typeof d.updated_at === "string" && d.updated_at) ||
      (typeof data.updated_at === "string" && data.updated_at) ||
      (typeof data.generated_at === "string" && data.generated_at) ||
      "";

    const model = {
      contract: CONTRACT_ID,
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
    model.uiRenderState = deriveUiRenderState(model);
    model.data_state = model.uiRenderState === "empty" ? "error" : model.uiRenderState;
    const buildDisplay =
      global.SingleTruthDisplayV1 && global.SingleTruthDisplayV1.buildSingleTruthDisplay;
    if (typeof buildDisplay === "function") {
      const timeLayer = global.TimeUILayerV1;
      const normalizeTime = global.normalizeTimeToUI || (timeLayer && timeLayer.normalizeTimeToUI);
      model.display = buildDisplay(model, {
        formatTime: typeof normalizeTime === "function" ? normalizeTime : null
      });
    }
    return model;
  }

  function attachDisplay(model) {
    if (!model || typeof model !== "object") return model;
    const buildDisplay =
      global.SingleTruthDisplayV1 && global.SingleTruthDisplayV1.buildSingleTruthDisplay;
    if (typeof buildDisplay !== "function") return model;
    const timeLayer = global.TimeUILayerV1;
    const normalizeTime = global.normalizeTimeToUI || (timeLayer && timeLayer.normalizeTimeToUI);
    const uiState = model.uiRenderState || deriveUiRenderState(model);
    const next = Object.assign({}, model, {
      uiRenderState: uiState,
      data_state: uiState === "empty" ? "error" : uiState
    });
    next.display = buildDisplay(next, {
      formatTime: typeof normalizeTime === "function" ? normalizeTime : null
    });
    return next;
  }

  /**
   * Unico resolver contratto — tutti i dati vento devono passare da qui.
   * @param {object|null} payload — risposta API o model già risolto
   * @returns {{ valid: boolean, state: string, productKey: string|null, model: object, legacyRejected: boolean }}
   */
  function resolveWindContractV1(payload) {
    if (isResolvedContractModel(payload)) {
      if (payload.loading || payload.uiRenderState === "fetching") {
        return {
          valid: false,
          state: "fetching",
          productKey: PRODUCT_KEY,
          model: payload,
          legacyRejected: false,
          hasAnyWindData: false
        };
      }
      const any = hasAnyWindData(payload);
      const uiState = payload.uiRenderState || deriveUiRenderState(payload);
      return {
        valid: any,
        state: any ? uiState : "empty",
        productKey: PRODUCT_KEY,
        model: attachDisplay(Object.assign({}, payload, { uiRenderState: uiState, loading: false })),
        legacyRejected: false,
        hasAnyWindData: any
      };
    }

    if (isLegacyWindPayload(payload)) {
      return {
        valid: false,
        state: "legacy_rejected",
        productKey: null,
        model: emptyModel(),
        legacyRejected: true,
        hasAnyWindData: false
      };
    }

    if (!hasWindDecisionV1(payload)) {
      return {
        valid: false,
        state: "empty",
        productKey: null,
        model: emptyModel(),
        legacyRejected: false,
        hasAnyWindData: false
      };
    }

    const model = attachDisplay(parseWindDecisionV1(payload));
    const any = hasAnyWindData(model);
    return {
      valid: any,
      state: model.data_state || model.uiRenderState,
      productKey: PRODUCT_KEY,
      model,
      legacyRejected: false,
      hasAnyWindData: any
    };
  }

  global.WindContractV1 = Object.freeze({
    PRODUCT_KEY,
    CONTRACT_ID,
    hasWindDecisionV1,
    isLegacyWindPayload,
    hasAnyWindData,
    deriveUiRenderState,
    loadingModel,
    emptyModel,
    idleModel,
    attachDisplay,
    resolveWindContractV1,
    directionToDeg
  });

  global.resolveWindContractV1 = resolveWindContractV1;
})(typeof window !== "undefined" ? window : globalThis);
