/**
 * UI SINGLE WRITER MODE V1 — un solo punto scrive il DOM vento Live Spot.
 * Pipeline: payload V1 → kite_score (dati) → ux_trust (dati) → renderWindUI (DOM).
 */
(function initWindUISingleWriter(global) {
  "use strict";

  const LOADING_FALLBACK = "Caricamento…";
  const EMPTY_CONNECTION_LABEL = "Connessione vento…";
  const MISSING_FIELD = "—";

  function resolveContractPayload(payload) {
    const resolver = global.WindContractV1 || global;
    const fn = resolver.resolveWindContractV1 || global.resolveWindContractV1;
    if (typeof fn !== "function") {
      return {
        valid: false,
        state: "fetching",
        model: payload && typeof payload === "object" ? payload : { loading: true, cache: "ui_loading" }
      };
    }
    return fn(payload);
  }

  function resolveContractModel(payload) {
    return resolveContractPayload(payload).model;
  }

  function buildWindUIViewModel(payload) {
    const p = resolveContractModel(payload);
    const kiteLayer = global.KiteScoreLayerV1;
    const trustLayer = global.UxTrustLayerV1;

    const kite =
      kiteLayer && typeof kiteLayer.computeKiteScore === "function"
        ? kiteLayer.computeKiteScore(p)
        : { kite_score: 0, kite_status: "NO GO" };

    const trust =
      trustLayer && typeof trustLayer.normalizeTrustUI === "function"
        ? trustLayer.normalizeTrustUI(p)
        : {
            loading: true,
            windDisplay: LOADING_FALLBACK,
            gustDisplay: LOADING_FALLBACK,
            directionDisplay: LOADING_FALLBACK,
            windNameDisplay: LOADING_FALLBACK,
            reliabilityDisplay: LOADING_FALLBACK,
            spotDisplay: LOADING_FALLBACK,
            updatedAtDisplay: "",
            trend1: { wind: LOADING_FALLBACK, direction: LOADING_FALLBACK, name: LOADING_FALLBACK },
            trend2: { wind: LOADING_FALLBACK, direction: LOADING_FALLBACK, name: LOADING_FALLBACK },
            trend3: { wind: LOADING_FALLBACK, direction: LOADING_FALLBACK, name: LOADING_FALLBACK }
          };

    const uiRenderState =
      p.uiRenderState || trust.uiRenderState || (trust.loading ? "fetching" : "empty");
    const isFetching = uiRenderState === "fetching";
    const isEmpty = uiRenderState === "empty";

    return {
      uiRenderState,
      loading: isFetching,
      empty: isEmpty,
      wind: trust.windDisplay,
      gust: trust.gustDisplay,
      windName: trust.windNameDisplay,
      reliability: trust.reliabilityDisplay,
      updatedAt: isEmpty ? EMPTY_CONNECTION_LABEL : resolveUpdatedAtForUI(p) || MISSING_FIELD,
      spot: trust.spotDisplay,
      kiteScore: kite.kite_score,
      kiteStatus: kite.kite_status,
      kiteScoreLine: isFetching
        ? LOADING_FALLBACK
        : isEmpty
          ? EMPTY_CONNECTION_LABEL
          : `KITE SCORE: ${kite.kite_score} / 100 · STATUS: ${kite.kite_status}`,
      trend1: trust.trend1,
      trend2: trust.trend2,
      trend3: trust.trend3,
      raw: {
        wind_direction: p.wind_direction,
        wind_direction_label: p.wind_direction_label,
        forecast_1h: p.forecast_1h,
        forecast_2h: p.forecast_2h,
        forecast_3h: p.forecast_3h || (p.meta && p.meta.forecast_3h) || null
      }
    };
  }

  function resolveUpdatedAtForUI(payload) {
    const timeLayer = global.TimeUILayerV1;
    const pick =
      timeLayer && typeof timeLayer.pickApiTimestamp === "function"
        ? timeLayer.pickApiTimestamp(payload)
        : payload && typeof payload.updated_at === "string"
          ? payload.updated_at
          : "";
    const normalize =
      global.normalizeTimeToUI ||
      (timeLayer && timeLayer.normalizeTimeToUI);
    if (typeof normalize === "function") return normalize(pick) || "—";
    return "—";
  }

  /**
   * Unico writer DOM per vento Live Spot.
   * @param {HTMLElement} panelEl
   * @param {object} payload — view model post-adapter V1
   * @param {object} [options]
   */
  function renderWindUI(panelEl, payload, options) {
    if (!panelEl) return;

    const ui = buildWindUIViewModel(payload);
    const opts = options && typeof options === "object" ? options : {};
    const loadingLabel = opts.loadingLabel || LOADING_FALLBACK;
    const emptyLabel = opts.emptyLabel || EMPTY_CONNECTION_LABEL;
    const fieldMissing = opts.missingField || MISSING_FIELD;
    const formatDir =
      typeof opts.formatDirectionForMode === "function"
        ? opts.formatDirectionForMode
        : () => ui.windName;
    const formatName =
      typeof opts.formatWindName === "function"
        ? opts.formatWindName
        : () => ui.windName;

    const cards = Array.from(panelEl.querySelectorAll(".info-card"));
    const windNow = cards.find((card) => String(card.className || "").includes("status-ok")) || null;
    const spotOverview = cards.find((card) => String(card.className || "").includes("status-search")) || null;

    if (windNow) {
      const windDd = windNow.querySelector('[data-live-spot-dd="wind"]');
      const dirDd = windNow.querySelector('[data-live-spot-dd="direction"]');
      const windNameDd = windNow.querySelector('[data-live-spot-dd="wind_name"]');
      const gustDd = windNow.querySelector('[data-live-spot-dd="gust"]');
      const scoreDd = windNow.querySelector('[data-live-spot-dd="anemometer"]');

      const panelLabel = ui.loading ? loadingLabel : ui.empty ? emptyLabel : null;

      if (windDd) windDd.textContent = panelLabel || ui.wind;
      if (gustDd) gustDd.textContent = panelLabel || ui.gust;
      if (dirDd) {
        dirDd.textContent = panelLabel
          ? panelLabel
          : ui.windName === fieldMissing && ui.raw.wind_direction == null
            ? fieldMissing
            : formatDir(ui.raw.wind_direction, ui.raw.wind_direction_label);
      }
      if (windNameDd) windNameDd.textContent = panelLabel || ui.windName;
      if (scoreDd) scoreDd.textContent = panelLabel || ui.kiteScoreLine;
    }

    if (spotOverview) {
      const spotDd = spotOverview.querySelector('[data-live-spot-dd="overview_spot"]');
      const confDd = spotOverview.querySelector('[data-live-spot-dd="overview_confidence"]');
      const updatedDd = spotOverview.querySelector('[data-live-spot-dd="overview_updated"]');
      const panelLabel = ui.loading ? loadingLabel : ui.empty ? emptyLabel : null;

      if (spotDd) spotDd.textContent = panelLabel || ui.spot;
      if (confDd) confDd.textContent = panelLabel || ui.reliability;
      if (updatedDd) updatedDd.textContent = panelLabel || ui.updatedAt || fieldMissing;
    }

    const hours = panelEl.querySelector(".hours");
    if (!hours) return;

    const roundKn = (v) => Math.round(Number(v) * 10) / 10;
    const setFc = (slot, fc, trendUi) => {
      const box = hours.querySelector(`[data-live-spot-fc="${slot}"]`);
      if (!box) return;

      const fcWind = fc && typeof fc.wind_knots === "number" && fc.wind_knots >= 0 ? fc.wind_knots : null;
      const fcDir = fc && fc.wind_direction != null ? fc.wind_direction : ui.raw.wind_direction;
      const hasDirection =
        fcDir != null || (ui.raw.wind_direction_label && String(ui.raw.wind_direction_label).trim());

      const valueEl = box.querySelector("strong");
      if (valueEl) {
        valueEl.textContent = ui.loading
          ? loadingLabel
          : ui.empty
            ? emptyLabel
            : trendUi
              ? trendUi.wind
              : fcWind != null
                ? `${roundKn(fcWind)} kn`
                : "— kn";
      }

      let directionEl = box.querySelector(".forecast-direction");
      let windNameEl = box.querySelector(".forecast-name");
      if (!directionEl) {
        directionEl = document.createElement("span");
        directionEl.className = "forecast-direction";
        box.appendChild(directionEl);
      }
      if (!windNameEl) {
        windNameEl = document.createElement("span");
        windNameEl.className = "forecast-name";
        box.appendChild(windNameEl);
      }

      if (ui.loading || ui.empty) {
        directionEl.hidden = false;
        windNameEl.hidden = false;
        directionEl.textContent = ui.loading ? loadingLabel : emptyLabel;
        windNameEl.textContent = ui.loading ? loadingLabel : emptyLabel;
        return;
      }

      if (fcWind == null && !hasDirection) {
        directionEl.hidden = true;
        windNameEl.hidden = true;
        directionEl.textContent = "";
        windNameEl.textContent = "";
        return;
      }

      directionEl.hidden = false;
      windNameEl.hidden = false;
      if (trendUi) {
        directionEl.textContent = formatDir(fcDir, ui.raw.wind_direction_label);
        windNameEl.textContent = trendUi.name;
      } else {
        directionEl.textContent = hasDirection
          ? formatDir(fcDir, ui.raw.wind_direction_label)
          : "—";
        windNameEl.textContent = hasDirection
          ? formatName(fcDir, ui.raw.wind_direction_label)
          : "—";
      }
    };

    setFc("1", ui.raw.forecast_1h, ui.trend1);
    setFc("2", ui.raw.forecast_2h, ui.trend2);
    setFc("3", ui.raw.forecast_3h, ui.trend3);
  }

  global.WindUISingleWriterV1 = Object.freeze({
    buildWindUIViewModel,
    renderWindUI
  });

  global.renderWindUI = renderWindUI;
  global.buildWindUIViewModel = buildWindUIViewModel;
})(typeof window !== "undefined" ? window : globalThis);
