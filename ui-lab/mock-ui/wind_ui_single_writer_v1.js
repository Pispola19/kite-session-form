/**
 * PRODUCTION LOCK V1 — UI SINGLE WRITER (passive only).
 * Reads only display.* via ServerContractPassiveV1 hardGate; no wind logic.
 */
(function initWindUISingleWriter(global) {
  "use strict";

  const LOCK_VERSION = "server_contract_schema_lock_v1";

  function panelLabels(lang) {
    const i18n = global.VentoLiveI18nV1;
    const tt = i18n && typeof i18n.t === "function" ? (k) => i18n.t(k, lang) : (k) => k;
    return {
      fetching: tt("wind_ui_state_fetching"),
      error: tt("wind_ui_state_empty"),
      idle: tt("wind_ui_state_idle")
    };
  }

  function normalizeView(payload) {
    const passive = global.ServerContractPassiveV1;
    if (!passive || typeof passive.hardGate !== "function") {
      return {
        contract_version: LOCK_VERSION,
        data_state: "error",
        display: null,
        hard_blocked: true
      };
    }
    return passive.hardGate(payload).view;
  }

  function isHardBlocked(view) {
    return Boolean(view && view.hard_blocked);
  }

  function fieldText(field, panelMessage) {
    if (panelMessage) return panelMessage;
    if (field == null) return "";
    if (typeof field === "string") return field;
    if (typeof field !== "object") return "";
    return field.text == null ? "" : String(field.text);
  }

  function paintWindPanel(panelEl, view, lang) {
    if (!panelEl || !view) return;

    const L = panelLabels(lang);

    if (isHardBlocked(view)) {
      const cards = Array.from(panelEl.querySelectorAll(".info-card"));
      const windNow = cards.find((card) => String(card.className || "").includes("status-ok")) || null;
      if (windNow) {
        const windDd = windNow.querySelector('[data-live-spot-dd="wind"]');
        if (windDd) windDd.textContent = L.error;
        ["gust", "direction", "wind_name", "anemometer"].forEach((slot) => {
          const el = windNow.querySelector(`[data-live-spot-dd="${slot}"]`);
          if (el) el.textContent = "";
        });
      }
      const spotOverview = cards.find((card) => String(card.className || "").includes("status-search")) || null;
      if (spotOverview) {
        ["overview_spot", "overview_confidence", "overview_updated"].forEach((slot) => {
          const el = spotOverview.querySelector(`[data-live-spot-dd="${slot}"]`);
          if (el) el.textContent = "";
        });
      }
      const hours = panelEl.querySelector(".hours");
      if (hours) {
        ["1", "2", "3"].forEach((slot) => {
          const box = hours.querySelector(`[data-live-spot-fc="${slot}"]`);
          const valueEl = box && box.querySelector("strong");
          if (valueEl) valueEl.textContent = L.error;
        });
      }
      return;
    }

    const display = view.display;
    const dataState = view.data_state || "error";
    const panelMessage =
      dataState === "fetching" ? L.fetching : dataState === "error" ? L.error : null;

    const cards = Array.from(panelEl.querySelectorAll(".info-card"));
    const windNow = cards.find((card) => String(card.className || "").includes("status-ok")) || null;
    const spotOverview = cards.find((card) => String(card.className || "").includes("status-search")) || null;

    if (windNow) {
      const windDd = windNow.querySelector('[data-live-spot-dd="wind"]');
      const dirDd = windNow.querySelector('[data-live-spot-dd="direction"]');
      const windNameDd = windNow.querySelector('[data-live-spot-dd="wind_name"]');
      const gustDd = windNow.querySelector('[data-live-spot-dd="gust"]');
      const kiteDd = windNow.querySelector('[data-live-spot-dd="anemometer"]');

      if (!display) {
        if (windDd) windDd.textContent = "";
        if (gustDd) gustDd.textContent = "";
        if (dirDd) dirDd.textContent = "";
        if (windNameDd) windNameDd.textContent = "";
        if (kiteDd) kiteDd.textContent = "";
      } else {
        if (windDd) windDd.textContent = fieldText(display.wind, panelMessage);
        if (gustDd) gustDd.textContent = fieldText(display.gust, panelMessage);
        if (dirDd) dirDd.textContent = fieldText(display.direction, panelMessage);
        if (windNameDd) windNameDd.textContent = fieldText(display.wind_name, panelMessage);
        if (kiteDd) kiteDd.textContent = fieldText(display.kite_decision, panelMessage);
      }
    }

    if (spotOverview) {
      if (!display) {
        const spotDd0 = spotOverview.querySelector('[data-live-spot-dd="overview_spot"]');
        const confDd0 = spotOverview.querySelector('[data-live-spot-dd="overview_confidence"]');
        const updatedDd0 = spotOverview.querySelector('[data-live-spot-dd="overview_updated"]');
        if (spotDd0) spotDd0.textContent = "";
        if (confDd0) confDd0.textContent = "";
        if (updatedDd0) updatedDd0.textContent = "";
      } else {
      const spotDd = spotOverview.querySelector('[data-live-spot-dd="overview_spot"]');
      const confDd = spotOverview.querySelector('[data-live-spot-dd="overview_confidence"]');
      const updatedDd = spotOverview.querySelector('[data-live-spot-dd="overview_updated"]');

        if (spotDd) spotDd.textContent = fieldText(display.spot, panelMessage);
        if (confDd) confDd.textContent = fieldText(display.reliability, panelMessage);
        if (updatedDd) updatedDd.textContent = fieldText(display.updated_at, panelMessage);
      }
    }

    const hours = panelEl.querySelector(".hours");
    if (!hours) return;
    if (!display) {
      ["1", "2", "3"].forEach((slot) => {
        const box = hours.querySelector(`[data-live-spot-fc="${slot}"]`);
        if (!box) return;
        const valueEl = box.querySelector("strong");
        if (valueEl) valueEl.textContent = "";
      });
      return;
    }

    const setFc = (slot, fcField) => {
      const box = hours.querySelector(`[data-live-spot-fc="${slot}"]`);
      if (!box) return;

      const valueEl = box.querySelector("strong");
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

      if (panelMessage) {
        if (valueEl) valueEl.textContent = panelMessage;
        directionEl.hidden = false;
        windNameEl.hidden = false;
        directionEl.textContent = panelMessage;
        windNameEl.textContent = panelMessage;
        return;
      }

      const noForecast = fcField && fcField.state === "no_forecast";
      const hasWind =
        (typeof fcField === "string" && fcField.trim()) ||
        (fcField && fcField.state === "present" && fcField.text);

      if (valueEl) {
        valueEl.textContent = hasWind ? fieldText(fcField, null) : "";
      }

      if (noForecast || !hasWind) {
        directionEl.hidden = true;
        windNameEl.hidden = true;
        directionEl.textContent = "";
        windNameEl.textContent = "";
        return;
      }

      directionEl.hidden = true;
      windNameEl.hidden = true;
    };

    setFc("1", display.forecast_1h);
    setFc("2", display.forecast_2h);
    setFc("3", display.forecast_3h);
  }

  function renderIdleUI(panelEl, lang) {
    const passive = global.ServerContractPassiveV1;
    const view =
      passive && typeof passive.idlePayload === "function"
        ? passive.idlePayload()
        : { contract_version: LOCK_VERSION, data_state: "idle", display: null };
    paintWindPanel(panelEl, view, lang);
  }

  function renderWindUI(panelEl, payload, options) {
    if (!panelEl) return;
    const lang = (options && options.lang) || global.__ventoLiveUiLang || "en";
    const view = normalizeView(payload);
    paintWindPanel(panelEl, view, lang);
  }

  global.WindUISingleWriterV1 = Object.freeze({
    renderWindUI,
    renderIdleUI,
    paintWindPanel
  });

  global.renderWindUI = renderWindUI;
  global.renderIdleUI = renderIdleUI;
})(typeof window !== "undefined" ? window : globalThis);
