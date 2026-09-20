/**
 * NUOVA_UX W1 — collega input spot → A → esposizione. Nessun submit, nessun payload sessione.
 * Recenti + omonimi in lista; chrome via i18n.
 */
(function initNuovaUxW1(global) {
  "use strict";

  const DEBOUNCE_MS = 160;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function i18n() {
    return global.NuovaUxI18nApplyV1;
  }

  function tt(key) {
    const api = i18n();
    if (api && typeof api.t === "function") return api.t(key);
    const engine = global.VentoLiveI18nV1;
    if (engine && typeof engine.t === "function") {
      return engine.t(key, global.__ventoLiveUiLang);
    }
    return key;
  }

  function missingMark() {
    return tt("wind_ui_field_missing") || "—";
  }

  function setText(el, value) {
    if (el) el.textContent = value == null || value === "" ? missingMark() : String(value);
  }

  function kaTone(text) {
    const raw = String(text || "")
      .trim()
      .toUpperCase()
      .replace(/_/g, " ");
    if (raw === "GO") return "ok";
    if (raw === "NO GO") return "danger";
    if (raw === "BORDERLINE") return "caution";
    return "";
  }

  function kaLabel(text) {
    const engine = global.VentoLiveI18nV1;
    const lang =
      (i18n() && i18n().currentLang && i18n().currentLang()) || global.__ventoLiveUiLang;
    if (engine && typeof engine.kiteStatusLabel === "function" && String(text || "").trim()) {
      return engine.kiteStatusLabel(text, lang);
    }
    return text ? String(text) : missingMark();
  }

  function paintKa(root, text) {
    const card = root.querySelector("[data-w1-ka]");
    const el = root.querySelector('[data-w1="ka"]');
    const tone = kaTone(text);
    if (card) {
      if (tone) card.setAttribute("data-tone", tone);
      else card.removeAttribute("data-tone");
    }
    if (el) el.textContent = tone ? kaLabel(text) : missingMark();
  }

  function visual() {
    return global.WindUIVisualPresentationV1;
  }

  function uiLang() {
    return (
      (i18n() && typeof i18n().currentLang === "function" && i18n().currentLang()) ||
      global.__ventoLiveUiLang ||
      "it"
    );
  }

  function clearDirVisual(el) {
    if (!el) return;
    el.classList.remove("wind-dir-arrow", "wind-dir-meteo");
  }

  function paintDir(el, displayObj) {
    const V = visual();
    if (!el) return;
    if (!displayObj || !V || typeof V.formatDirectionForView !== "function") {
      clearDirVisual(el);
      setText(el, "");
      return;
    }
    const dirText = V.formatDirectionForView(displayObj, V.VIEW_MODE.KITE, uiLang());
    if (!dirText || dirText === "—") {
      clearDirVisual(el);
      setText(el, missingMark());
      return;
    }
    V.applyDirectionVisual(el, dirText, V.VIEW_MODE.KITE);
  }

  function fcVisualDisplay(fcField, nowDisplay) {
    const V = visual();
    const nested = V && typeof V.fieldText === "function" ? V.fieldText(fcField && fcField.direction) : "";
    if (nested) {
      return {
        direction: fcField.direction,
        wind_name: fcField.wind_name || fcField.direction
      };
    }
    return nowDisplay;
  }

  function paintOptional(root, key, value) {
    const el = root.querySelector('[data-w1="' + key + '"]');
    if (!el) return;
    const on = !!(value && String(value).trim());
    el.hidden = !on;
    el.textContent = on ? String(value) : "";
  }

  function setStage(root, stage) {
    const idle = root.querySelector("[data-w1-idle]");
    const grid = root.querySelector("[data-w1-grid]");
    const next = root.querySelector("[data-w1-next]");
    if (idle) idle.hidden = stage !== "idle";
    if (grid) grid.hidden = stage !== "wind";
    if (next) next.hidden = stage !== "wind";
  }

  function paintExpose(root, exposed, scritta, display) {
    const msg = $('[data-w1="msg"]', root);
    const dirKeys = ["now-dir", "fc1-dir", "fc2-dir", "fc3-dir"];
    if (scritta) {
      if (msg) msg.textContent = scritta;
      [
        "spot",
        "reliability",
        "updated",
        "now-wind",
        "now-gust",
        "now-dir",
        "now-name",
        "fc1-wind",
        "fc1-dir",
        "fc2-wind",
        "fc2-dir",
        "fc3-wind",
        "fc3-dir"
      ].forEach(function (key) {
        const el = root.querySelector('[data-w1="' + key + '"]');
        if (el) el.textContent = missingMark();
      });
      paintOptional(root, "fc1-gust", "");
      paintOptional(root, "fc2-gust", "");
      paintOptional(root, "fc3-gust", "");
      dirKeys.forEach(function (key) {
        clearDirVisual(root.querySelector('[data-w1="' + key + '"]'));
      });
      paintKa(root, "");
      return;
    }
    if (msg) msg.textContent = "";
    if (!exposed) return;
    const V = visual();
    setText(root.querySelector('[data-w1="spot"]'), exposed.spot);
    setText(root.querySelector('[data-w1="reliability"]'), exposed.reliability);
    setText(root.querySelector('[data-w1="updated"]'), exposed.updated_at);
    setText(root.querySelector('[data-w1="now-wind"]'), exposed.now.wind);
    setText(root.querySelector('[data-w1="now-gust"]'), exposed.now.gust);
    if (V && display) {
      paintDir(root.querySelector('[data-w1="now-dir"]'), display);
    } else {
      setText(root.querySelector('[data-w1="now-dir"]'), exposed.now.direction);
    }
    setText(root.querySelector('[data-w1="now-name"]'), exposed.now.wind_name);
    setText(root.querySelector('[data-w1="fc1-wind"]'), exposed.forecast.h1.wind);
    paintOptional(root, "fc1-gust", exposed.forecast.h1.gust);
    setText(root.querySelector('[data-w1="fc2-wind"]'), exposed.forecast.h2.wind);
    paintOptional(root, "fc2-gust", exposed.forecast.h2.gust);
    setText(root.querySelector('[data-w1="fc3-wind"]'), exposed.forecast.h3.wind);
    paintOptional(root, "fc3-gust", exposed.forecast.h3.gust);
    paintDir(root.querySelector('[data-w1="fc1-dir"]'), fcVisualDisplay(display && display.forecast_1h, display));
    paintDir(root.querySelector('[data-w1="fc2-dir"]'), fcVisualDisplay(display && display.forecast_2h, display));
    paintDir(root.querySelector('[data-w1="fc3-dir"]'), fcVisualDisplay(display && display.forecast_3h, display));
    paintKa(root, exposed.kite_decision);
  }

  function placeTitle(place) {
    return String((place && (place.name || place.label)) || "");
  }

  function appendGroup(listEl, title, items, onPick) {
    if (!items.length) return;
    const head = document.createElement("li");
    head.className = "w1-list__group";
    head.textContent = title;
    listEl.appendChild(head);
    items.forEach(function (c) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      const titleEl = document.createElement("strong");
      titleEl.textContent = placeTitle(c);
      btn.appendChild(titleEl);
      if (c.where) {
        const where = document.createElement("span");
        where.className = "w1-list__where";
        where.textContent = c.where;
        btn.appendChild(where);
      }
      if (c.sameNameCount > 1) {
        const badge = document.createElement("em");
        badge.className = "w1-list__same";
        badge.textContent = tt("nuova_ux_same_name_badge");
        btn.appendChild(badge);
      }
      btn.addEventListener("click", function () {
        onPick(c);
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function renderPicker(listEl, groups, onPick, waiting) {
    listEl.innerHTML = "";
    const recents = (groups && groups.recents) || [];
    const world = (groups && groups.world) || [];
    if (!recents.length && !world.length && !waiting) {
      listEl.hidden = true;
      return;
    }
    if (waiting && !world.length) {
      const wait = document.createElement("li");
      wait.className = "w1-list__banner";
      wait.textContent = tt("nuova_ux_spot_wait");
      listEl.appendChild(wait);
    }
    if (groups && groups.sameName) {
      const banner = document.createElement("li");
      banner.className = "w1-list__banner";
      banner.textContent = tt("nuova_ux_same_name");
      listEl.appendChild(banner);
    }
    appendGroup(listEl, tt("nuova_ux_yours"), recents, onPick);
    appendGroup(listEl, tt("nuova_ux_other_places"), world, onPick);
    listEl.hidden = false;
  }

  function boot(root) {
    const exposeApi = global.NuovaUxExposeDisplayV1;
    const fromA = global.NuovaUxWindFromA;
    const memory = global.NuovaUxLocalConvenienceV1;
    if (!root || !exposeApi || !fromA) return;

    const input = $("[data-w1-spot-input]", root);
    const listEl = $("[data-w1-candidates]", root);
    if (!input || !listEl) return;

    let debounceTimer = null;
    let lastCandidates = [];
    let lastTyped = "";
    let lastFailed = false;
    let lastExposed = null;
    let lastDisplay = null;
    let lastGeo = null;
    let searchSeq = 0;
    let waitingPlaces = false;
    let searchAbort = null;

    setStage(root, "idle");

    function groupsFor(typed, world) {
      if (memory && typeof memory.pickerGroups === "function") {
        return memory.pickerGroups(typed, world);
      }
      return { recents: [], world: world || [], sameName: false };
    }

    function paintList() {
      renderPicker(listEl, groupsFor(lastTyped, lastCandidates), onPick, waitingPlaces);
    }

    function publishSpot(location, openSession) {
      if (typeof global.CustomEvent !== "function") return;
      document.dispatchEvent(
        new global.CustomEvent("nuova-ux-spot", {
          detail: {
            location: location,
            from: "w1",
            openSession: !!openSession
          }
        })
      );
    }

    async function loadWind(spotText, candidate) {
      const result = await fromA.fetchWindLatest(spotText, candidate);
      if (!result.ok) {
        lastFailed = true;
        lastExposed = null;
        lastDisplay = null;
        lastGeo = null;
        setStage(root, "fail");
        paintExpose(root, null, tt("nuova_ux_wind_unavailable"));
        return;
      }
      lastFailed = false;
      const exposed = exposeApi.exposeWindDisplay(result.view.display);
      lastExposed = exposed;
      lastDisplay = result.view.display;
      lastGeo = result.geo || null;
      setStage(root, "wind");
      paintExpose(root, exposed, "", lastDisplay);
      publishSpot((exposed && exposed.spot) || spotText, true);
    }

    function onPick(candidate) {
      const name = placeTitle(candidate);
      input.value = name;
      lastTyped = name;
      listEl.hidden = true;
      if (memory && typeof memory.rememberSpot === "function") {
        memory.rememberSpot(candidate);
      }
      publishSpot(name, true);
      loadWind(name, candidate);
    }

    async function searchTyped(typed) {
      lastTyped = typed;
      if (!String(typed || "").trim()) {
        lastCandidates = [];
        waitingPlaces = false;
        if (searchAbort) searchAbort.abort();
        paintList();
        return;
      }
      paintList();
      const seq = (searchSeq += 1);
      if (searchAbort) searchAbort.abort();
      searchAbort = typeof global.AbortController === "function" ? new global.AbortController() : null;
      waitingPlaces = true;
      paintList();
      try {
        const res = await fromA.fetchSpotCandidates(typed, searchAbort ? { signal: searchAbort.signal } : {});
        if (seq !== searchSeq) return;
        lastCandidates = res.candidates || [];
      } catch (_err) {
        if (seq !== searchSeq) return;
      }
      waitingPlaces = false;
      paintList();
    }

    input.addEventListener("focus", function () {
      lastTyped = input.value;
      paintList();
      if (String(input.value || "").trim()) searchTyped(input.value);
    });

    input.addEventListener("input", function () {
      const typed = input.value;
      lastTyped = typed;
      paintList();
      publishSpot(typed, false);
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(function () {
        searchTyped(typed);
      }, DEBOUNCE_MS);
    });

    document.addEventListener("nuova-ux-spot", function (ev) {
      const detail = ev && ev.detail;
      if (!detail || detail.from === "w1") return;
      const loc = detail.location;
      if (loc == null) return;
      if (input.value !== loc) {
        input.value = loc;
        lastTyped = loc;
      }
    });

    document.addEventListener("nuova-ux-lang", function () {
      if (lastFailed) {
        setStage(root, "fail");
        paintExpose(root, null, tt("nuova_ux_wind_unavailable"));
      } else if (lastDisplay) {
        if (fromA && typeof fromA.applyF4WindName === "function" && lastGeo) {
          const refreshed = fromA.applyF4WindName({ display: lastDisplay }, lastGeo.lat, lastGeo.lon);
          lastDisplay = refreshed.display || lastDisplay;
          lastExposed = exposeApi.exposeWindDisplay(lastDisplay);
        }
        paintExpose(root, lastExposed, "", lastDisplay);
      }
      if (!listEl.hidden) paintList();
    });
  }

  global.NuovaUxW1 = Object.freeze({ boot, paintExpose, paintOptional, setStage, renderPicker, kaTone });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document.querySelector("[data-slot=w1]"));
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document.querySelector("[data-slot=w1]"));
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
