/**
 * UI SINGLE WRITER MODE V1 — unico DOM writer vento Live Spot.
 * Richiede USER INTENT GATE + I18N per testi.
 */
(function initWindUISingleWriter(global) {
  "use strict";

  function labels(lang) {
    const i18n = global.VentoLiveI18nV1;
    const tt = i18n && typeof i18n.t === "function" ? (k) => i18n.t(k, lang) : (k) => k;
    return {
      loading: tt("wind_ui_state_fetching"),
      empty: tt("wind_ui_state_empty"),
      idle: tt("wind_ui_state_idle"),
      missing: tt("wind_ui_field_missing"),
      forecastMissing: tt("wind_ui_forecast_missing")
    };
  }

  function resolveContractPayload(payload) {
    const fn = global.resolveWindContractV1 ||
      (global.WindContractV1 && global.WindContractV1.resolveWindContractV1);
    if (typeof fn !== "function") {
      return {
        valid: false,
        state: "fetching",
        model: { loading: true, cache: "ui_loading", uiRenderState: "fetching" }
      };
    }
    return fn(payload);
  }

  function resolveContractModel(payload) {
    return resolveContractPayload(payload).model;
  }

  function buildWindUIViewModel(payload, lang) {
    const p = resolveContractModel(payload);
    const L = labels(lang);
    const kiteLayer = global.KiteScoreLayerV1;
    const trustLayer = global.UxTrustLayerV1;
    const i18n = global.VentoLiveI18nV1;

    const kite =
      kiteLayer && typeof kiteLayer.computeKiteScore === "function"
        ? kiteLayer.computeKiteScore(p)
        : { kite_score: 0, kite_status: "NO GO" };

    const trust =
      trustLayer && typeof trustLayer.normalizeTrustUI === "function"
        ? trustLayer.normalizeTrustUI(p, lang)
        : {
            loading: true,
            uiRenderState: "fetching",
            windDisplay: L.loading,
            gustDisplay: L.loading,
            windNameDisplay: L.loading,
            reliabilityDisplay: L.loading,
            spotDisplay: L.loading,
            trend1: { wind: L.loading, name: L.loading },
            trend2: { wind: L.loading, name: L.loading },
            trend3: { wind: L.loading, name: L.loading }
          };

    const uiRenderState =
      p.uiRenderState || trust.uiRenderState || (trust.loading ? "fetching" : "empty");
    const isFetching = uiRenderState === "fetching";
    const isEmpty = uiRenderState === "empty";
    const isIdle = uiRenderState === "idle";

    const kiteScoreLine =
      i18n && typeof i18n.kiteScoreLine === "function"
        ? i18n.kiteScoreLine(kite.kite_score, kite.kite_status, lang)
        : `KITE SCORE: ${kite.kite_score} / 100 · STATUS: ${kite.kite_status}`;

    return {
      uiRenderState,
      loading: isFetching,
      empty: isEmpty,
      idle: isIdle,
      labels: L,
      wind: trust.windDisplay,
      gust: trust.gustDisplay,
      windName: trust.windNameDisplay,
      reliability: trust.reliabilityDisplay,
      updatedAt: isEmpty
        ? L.empty
        : isIdle
          ? L.idle
          : resolveUpdatedAtForUI(p, lang) || L.missing,
      spot: trust.spotDisplay,
      kiteScoreLine: isFetching ? L.loading : isEmpty ? L.empty : isIdle ? L.idle : kiteScoreLine,
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

  function resolveUpdatedAtForUI(payload, lang) {
    const L = labels(lang);
    const timeLayer = global.TimeUILayerV1;
    const pick =
      timeLayer && typeof timeLayer.pickApiTimestamp === "function"
        ? timeLayer.pickApiTimestamp(payload)
        : payload && typeof payload.updated_at === "string"
          ? payload.updated_at
          : "";
    const normalize = global.normalizeTimeToUI || (timeLayer && timeLayer.normalizeTimeToUI);
    if (typeof normalize === "function") return normalize(pick) || L.missing;
    return L.missing;
  }

  function paintWindPanel(panelEl, ui, options) {
    const opts = options && typeof options === "object" ? options : {};
    const L = ui.labels;
    const loadingLabel = opts.loadingLabel || L.loading;
    const emptyLabel = opts.emptyLabel || L.empty;
    const idleLabel = opts.idleLabel || L.idle;
    const fieldMissing = opts.missingField || L.missing;
    const forecastMissing = opts.forecastMissing || L.forecastMissing;
    const formatDir =
      typeof opts.formatDirectionForMode === "function"
        ? opts.formatDirectionForMode
        : () => ui.windName;
    const formatName =
      typeof opts.formatWindName === "function"
        ? opts.formatWindName
        : () => ui.windName;

    const globalLabel = ui.loading ? loadingLabel : ui.empty ? emptyLabel : ui.idle ? idleLabel : null;

    const cards = Array.from(panelEl.querySelectorAll(".info-card"));
    const windNow = cards.find((card) => String(card.className || "").includes("status-ok")) || null;
    const spotOverview = cards.find((card) => String(card.className || "").includes("status-search")) || null;

    if (windNow) {
      const windDd = windNow.querySelector('[data-live-spot-dd="wind"]');
      const dirDd = windNow.querySelector('[data-live-spot-dd="direction"]');
      const windNameDd = windNow.querySelector('[data-live-spot-dd="wind_name"]');
      const gustDd = windNow.querySelector('[data-live-spot-dd="gust"]');
      const scoreDd = windNow.querySelector('[data-live-spot-dd="anemometer"]');

      if (windDd) windDd.textContent = globalLabel || ui.wind;
      if (gustDd) gustDd.textContent = globalLabel || ui.gust;
      if (dirDd) {
        dirDd.textContent = globalLabel
          ? globalLabel
          : ui.windName === fieldMissing && ui.raw.wind_direction == null
            ? fieldMissing
            : formatDir(ui.raw.wind_direction, ui.raw.wind_direction_label);
      }
      if (windNameDd) windNameDd.textContent = globalLabel || ui.windName;
      if (scoreDd) scoreDd.textContent = globalLabel || ui.kiteScoreLine;
    }

    if (spotOverview) {
      const spotDd = spotOverview.querySelector('[data-live-spot-dd="overview_spot"]');
      const confDd = spotOverview.querySelector('[data-live-spot-dd="overview_confidence"]');
      const updatedDd = spotOverview.querySelector('[data-live-spot-dd="overview_updated"]');

      if (spotDd) spotDd.textContent = globalLabel || ui.spot;
      if (confDd) confDd.textContent = globalLabel || ui.reliability;
      if (updatedDd) updatedDd.textContent = globalLabel || ui.updatedAt || fieldMissing;
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
        valueEl.textContent = globalLabel
          ? globalLabel
          : trendUi
            ? trendUi.wind
            : fcWind != null
              ? `${roundKn(fcWind)} kn`
              : forecastMissing;
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

      if (globalLabel) {
        directionEl.hidden = false;
        windNameEl.hidden = false;
        directionEl.textContent = globalLabel;
        windNameEl.textContent = globalLabel;
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
          : fieldMissing;
        windNameEl.textContent = hasDirection
          ? formatName(fcDir, ui.raw.wind_direction_label)
          : fieldMissing;
      }
    };

    setFc("1", ui.raw.forecast_1h, ui.trend1);
    setFc("2", ui.raw.forecast_2h, ui.trend2);
    setFc("3", ui.raw.forecast_3h, ui.trend3);
  }

  function renderIdleUI(panelEl, lang, options) {
    if (!panelEl) return;
    const gate = global.UserIntentGateV1;
    const idleModel =
      gate && typeof gate.idleViewModel === "function"
        ? gate.idleViewModel(lang)
        : { uiRenderState: "idle", cache: "ui_idle" };
    const ui = buildWindUIViewModel(idleModel, lang);
    paintWindPanel(panelEl, ui, options);
  }

  function renderWindUI(panelEl, payload, options) {
    if (!panelEl) return;
    const lang = (options && options.lang) || global.__ventoLiveUiLang || "en";
    const ui = buildWindUIViewModel(payload, lang);
    paintWindPanel(panelEl, ui, options);
  }

  global.WindUISingleWriterV1 = Object.freeze({
    buildWindUIViewModel,
    renderWindUI,
    renderIdleUI
  });

  global.renderWindUI = renderWindUI;
  global.renderIdleUI = renderIdleUI;
  global.buildWindUIViewModel = buildWindUIViewModel;
})(typeof window !== "undefined" ? window : globalThis);
