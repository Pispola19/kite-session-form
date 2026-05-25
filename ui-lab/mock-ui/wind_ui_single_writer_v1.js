/**
 * PRODUCTION LOCK V1 — UI SINGLE WRITER (passive only).
 * Reads only display.* via ServerContractPassiveV1 hardGate; visual layer is presentation-only.
 */
(function initWindUISingleWriter(global) {
  "use strict";

  const LOCK_VERSION = "server_contract_schema_lock_v1";

  function visual() {
    return global.WindUIVisualPresentationV1;
  }

  function fieldText(field, panelMessage) {
    if (panelMessage) return panelMessage;
    if (field == null) return "";
    if (typeof field === "string") return field;
    if (typeof field !== "object") return "";
    return field.text == null ? "" : String(field.text);
  }

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

  function resolveViewMode(options) {
    const V = visual();
    const mode = options && options.viewMode;
    if (V && typeof V.normalizeViewMode === "function") return V.normalizeViewMode(mode);
    return mode === "meteo" ? "meteo" : "kite";
  }

  function paintWindPanel(panelEl, view, lang, options) {
    if (!panelEl || !view) return;

    const L = panelLabels(lang);
    const viewMode = resolveViewMode(options);
    const V = visual();

    if (isHardBlocked(view)) {
      const cards = Array.from(panelEl.querySelectorAll(".info-card"));
      const windNow = cards.find((card) => String(card.className || "").includes("status-ok")) || null;
      if (windNow) {
        const windDd = windNow.querySelector('[data-live-spot-dd="wind"]');
        if (windDd) windDd.textContent = L.error;
        ["gust", "direction", "wind_name", "anemometer"].forEach((slot) => {
          const el = windNow.querySelector(`[data-live-spot-dd="${slot}"]`);
          if (el) {
            el.textContent = "";
            el.classList.remove("wind-dir-arrow", "wind-dir-meteo");
          }
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
          const dirEl = box && box.querySelector(".forecast-direction");
          const nameEl = box && box.querySelector(".forecast-name");
          if (dirEl) {
            dirEl.hidden = true;
            dirEl.textContent = "";
          }
          if (nameEl) {
            nameEl.hidden = true;
            nameEl.textContent = "";
          }
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
      const anemDd = windNow.querySelector('[data-live-spot-dd="anemometer"]');

      if (!display) {
        if (windDd) windDd.textContent = "";
        if (gustDd) gustDd.textContent = "";
        if (dirDd) {
          dirDd.textContent = "";
          dirDd.classList.remove("wind-dir-arrow", "wind-dir-meteo");
        }
        if (windNameDd) windNameDd.textContent = "";
        if (anemDd) anemDd.textContent = "";
      } else if (panelMessage) {
        if (windDd) windDd.textContent = panelMessage;
        if (gustDd) gustDd.textContent = panelMessage;
        if (windNameDd) windNameDd.textContent = panelMessage;
        if (anemDd) anemDd.textContent = panelMessage;
        if (dirDd && V && typeof V.applyDirectionVisual === "function") {
          V.applyDirectionVisual(dirDd, panelMessage, viewMode);
        } else if (dirDd) dirDd.textContent = panelMessage;
      } else {
        if (windDd) windDd.textContent = fieldText(display.wind, null);
        if (gustDd) gustDd.textContent = fieldText(display.gust, null);
        if (windNameDd) {
          windNameDd.textContent =
            V && typeof V.formatWindNameForView === "function"
              ? V.formatWindNameForView(display, lang)
              : fieldText(display.wind_name, null);
        }
        if (anemDd) {
          anemDd.textContent =
            V && typeof V.formatAnemometerLine === "function"
              ? V.formatAnemometerLine(display, lang)
              : fieldText(display.kite_decision, null);
        }
        if (dirDd) {
          const dirText =
            V && typeof V.formatDirectionForView === "function"
              ? V.formatDirectionForView(display, viewMode, lang)
              : fieldText(display.direction, null);
          if (V && typeof V.applyDirectionVisual === "function") {
            V.applyDirectionVisual(dirDd, dirText, viewMode);
          } else {
            dirDd.textContent = dirText;
          }
        }
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
        const dirEl = box.querySelector(".forecast-direction");
        const nameEl = box.querySelector(".forecast-name");
        if (dirEl) {
          dirEl.hidden = true;
          dirEl.textContent = "";
        }
        if (nameEl) {
          nameEl.hidden = true;
          nameEl.textContent = "";
        }
      });
      return;
    }

    const setFc = (slot, fcField) => {
      const box = hours.querySelector(`[data-live-spot-fc="${slot}"]`);
      if (!box) return;

      const valueEl = box.querySelector("strong");
      let directionEl = box.querySelector(".forecast-direction");
      let windNameEl = box.querySelector(".forecast-name");
      const doc = panelEl.ownerDocument || global.document;
      if (!directionEl && doc && typeof doc.createElement === "function") {
        directionEl = doc.createElement("span");
        directionEl.className = "forecast-direction";
        box.appendChild(directionEl);
      }
      if (!windNameEl && doc && typeof doc.createElement === "function") {
        windNameEl = doc.createElement("span");
        windNameEl.className = "forecast-name";
        box.appendChild(windNameEl);
      }

      if (panelMessage) {
        if (valueEl) valueEl.textContent = panelMessage;
        directionEl.hidden = false;
        windNameEl.hidden = false;
        if (V && typeof V.applyDirectionVisual === "function") {
          V.applyDirectionVisual(directionEl, panelMessage, viewMode);
        } else {
          directionEl.textContent = panelMessage;
        }
        windNameEl.textContent = panelMessage;
        return;
      }

      const noForecast = fcField && fcField.state === "no_forecast";
      const fcText = fieldText(fcField, null);
      const hasWind = Boolean(fcText);

      if (valueEl) {
        valueEl.textContent = hasWind ? fcText : "";
      }

      if (noForecast || !hasWind) {
        directionEl.hidden = true;
        windNameEl.hidden = true;
        directionEl.textContent = "";
        windNameEl.textContent = "";
        directionEl.classList.remove("wind-dir-arrow", "wind-dir-meteo");
        return;
      }

      const hasDirection = Boolean(V && V.displayDirectionContext && V.displayDirectionContext(display));
      directionEl.hidden = false;
      windNameEl.hidden = false;

      if (hasDirection && V) {
        const dirText =
          typeof V.formatDirectionForView === "function"
            ? V.formatDirectionForView(display, viewMode, lang)
            : "";
        if (typeof V.applyDirectionVisual === "function") {
          V.applyDirectionVisual(directionEl, dirText, viewMode);
        } else {
          directionEl.textContent = dirText;
        }
        windNameEl.textContent =
          typeof V.formatWindNameForView === "function"
            ? V.formatWindNameForView(display, lang)
            : fieldText(display.wind_name, null);
      } else {
        directionEl.hidden = true;
        windNameEl.textContent = fieldText(display.wind_name, null) || "";
      }
    };

    setFc("1", display.forecast_1h);
    setFc("2", display.forecast_2h);
    setFc("3", display.forecast_3h);
  }

  function renderIdleUI(panelEl, lang, options) {
    const passive = global.ServerContractPassiveV1;
    const view =
      passive && typeof passive.idlePayload === "function"
        ? passive.idlePayload()
        : { contract_version: LOCK_VERSION, data_state: "idle", display: null };
    paintWindPanel(panelEl, view, lang, options);
  }

  function renderWindUI(panelEl, payload, options) {
    if (!panelEl) return;
    const lang = (options && options.lang) || global.__ventoLiveUiLang || "en";
    const view = normalizeView(payload);
    paintWindPanel(panelEl, view, lang, options);
  }

  global.WindUISingleWriterV1 = Object.freeze({
    renderWindUI,
    renderIdleUI,
    paintWindPanel
  });

  global.renderWindUI = renderWindUI;
  global.renderIdleUI = renderIdleUI;
})(typeof window !== "undefined" ? window : globalThis);
