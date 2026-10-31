/**
 * NUOVA_UX W1 — collega input spot → A → esposizione. Nessun submit, nessun payload sessione.
 * Recenti + omonimi in lista; chrome via i18n.
 */
(function initNuovaUxW1(global) {
  "use strict";

  const DEBOUNCE_MS = 160;
  const WAIT_HINT_MS = 300;

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

  function reliabilityText(raw) {
    const code = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (code === "high" || code === "medium" || code === "low") {
      const labeled = tt("wind_ui_reliability_" + code);
      if (labeled && labeled !== "wind_ui_reliability_" + code) {
        return labeled.charAt(0).toUpperCase() + labeled.slice(1);
      }
    }
    return raw;
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

  function tzApi() {
    return global.NuovaUxTimezoneFaceV1;
  }

  function memoryApi() {
    return global.NuovaUxLocalConvenienceV1;
  }

  function chosenZone() {
    const mem = memoryApi();
    const stored = mem && typeof mem.readStoredTz === "function" ? mem.readStoredTz() : "";
    if (stored) return stored;
    const api = tzApi();
    return api && typeof api.phoneZone === "function" ? api.phoneZone() : "UTC";
  }

  const TZ_CITY_KEYS = {
    "Europe/Rome": "nuova_ux_tz_rome",
    "Atlantic/Canary": "nuova_ux_tz_canary",
    "Europe/Lisbon": "nuova_ux_tz_lisbon",
    "Europe/Madrid": "nuova_ux_tz_madrid",
    "Africa/Casablanca": "nuova_ux_tz_casablanca",
    "Asia/Dubai": "nuova_ux_tz_dubai",
    "Asia/Manila": "nuova_ux_tz_manila"
  };

  function tzCityLabel(id) {
    const key = TZ_CITY_KEYS[id];
    if (key) return tt(key);
    const api = tzApi();
    return api && typeof api.cityOf === "function" ? api.cityOf(id) : id;
  }

  function tzRowLabel(id, phone) {
    if (!id || id === phone) return tt("nuova_ux_tz_phone");
    return tzCityLabel(id);
  }

  function paintUpdatedClock(root, exposed, display) {
    const api = tzApi();
    const el = root.querySelector('[data-w1="updated"]');
    const label = root.querySelector("[data-w1-updated-label]");
    const box = root.querySelector("[data-w1-tz]");
    const zone = chosenZone();
    const field = display && display.updated_at;
    const fallback = exposed && exposed.updated_at;
    const painted =
      api && typeof api.paintClock === "function"
        ? api.paintClock(fallback, field, zone, uiLang())
        : { text: fallback || "", hasInstant: false, zone: zone };
    setText(el, painted.text);
    if (label) {
      const key = painted.hasInstant ? "live_spot_mock_last_update" : "live_spot_mock_last_update_rome";
      label.setAttribute("data-i18n", key);
      label.textContent = tt(key);
    }
    if (box) {
      box.hidden = false;
      const sum = box.querySelector("[data-w1-tz-summary]");
      if (sum) {
        sum.textContent = tzCityLabel(zone);
      }
    }
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

  const CONSULTS_SHOW_FROM = 1000;

  function formatConsultCount(total, lang) {
    try {
      return new Intl.NumberFormat(lang).format(total);
    } catch (_e) {
      return String(total);
    }
  }

  function formatConsultSince(iso, lang) {
    const raw = String(iso || "").trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw.slice(0, 10);
    try {
      return new Intl.DateTimeFormat(lang, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
      }).format(d);
    } catch (_e) {
      return raw.slice(0, 10);
    }
  }

  function paintConsults(root, payload) {
    const el = root.querySelector('[data-w1="consults"]');
    if (!el) return;
    const total = payload && payload.total;
    if (total == null || !Number.isFinite(Number(total)) || Number(total) < CONSULTS_SHOW_FROM) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    const lang = uiLang();
    const api = i18n();
    const n = formatConsultCount(Number(total), lang);
    const since = formatConsultSince(payload.started_at, lang);
    el.textContent =
      api && typeof api.t === "function"
        ? api.t("nuova_ux_wind_consults", { n: n, since: since })
        : n;
    el.hidden = false;
  }

  function setStage(root, stage) {
    const idle = root.querySelector("[data-w1-idle]");
    const grid = root.querySelector("[data-w1-grid]");
    const next = root.querySelector("[data-w1-next]");
    const working = root.querySelector("[data-w1-working]");
    if (idle) idle.hidden = stage !== "idle";
    if (grid) grid.hidden = stage !== "wind";
    if (next) next.hidden = stage !== "wind";
    if (working) working.hidden = stage !== "wait";
    if (stage === "wait") root.setAttribute("aria-busy", "true");
    else root.removeAttribute("aria-busy");
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
    setText(root.querySelector('[data-w1="reliability"]'), reliabilityText(exposed.reliability));
    paintUpdatedClock(root, exposed, display);
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
    const doc = listEl.ownerDocument || global.document;
    if (title) {
      const head = doc.createElement("li");
      head.className = "w1-list__group";
      head.textContent = title;
      listEl.appendChild(head);
    }
    items.forEach(function (c) {
      const li = doc.createElement("li");
      const btn = doc.createElement("button");
      btn.type = "button";
      const titleEl = doc.createElement("strong");
      titleEl.textContent = placeTitle(c);
      btn.appendChild(titleEl);
      if (c.where) {
        const where = doc.createElement("span");
        where.className = "w1-list__where";
        where.textContent = c.where;
        btn.appendChild(where);
      }
      if (c.sameNameCount > 1) {
        const badge = doc.createElement("em");
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
    if (!recents.length && !world.length) {
      listEl.hidden = true;
      return;
    }
    const doc = listEl.ownerDocument || global.document;
    if (groups && groups.sameName) {
      const banner = doc.createElement("li");
      banner.className = "w1-list__banner";
      banner.textContent = tt("nuova_ux_same_name");
      listEl.appendChild(banner);
    }
    appendGroup(listEl, recents.length ? tt("nuova_ux_yours") : "", recents, onPick);
    appendGroup(listEl, recents.length ? tt("nuova_ux_other_places") : "", world, onPick);
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
    let lastConsults = null;
    let searchSeq = 0;
    let windSeq = 0;
    let waitingPlaces = false;
    let waitingWind = false;
    let waitHintTimer = null;
    let searchAbort = null;

    setStage(root, "idle");

    const next = root.querySelector("[data-w1-next]");
    if (next) {
      next.addEventListener("click", function () {
        const w2 = global.document && global.document.querySelector("[data-slot=w2]");
        if (w2 && String(w2.tagName || "").toUpperCase() === "DETAILS") w2.open = true;
      });
    }

    async function refreshConsults() {
      if (typeof fromA.fetchConsults !== "function") {
        lastConsults = null;
        paintConsults(root, null);
        return;
      }
      const res = await fromA.fetchConsults();
      lastConsults = res && res.ok ? res : null;
      paintConsults(root, lastConsults);
    }

    refreshConsults();

    function bindTz() {
      const box = root.querySelector("[data-w1-tz]");
      if (!box || box.getAttribute("data-bound") === "1") return;
      box.setAttribute("data-bound", "1");
      const q = box.querySelector("[data-w1-tz-q]");
      const list = box.querySelector("[data-w1-tz-list]");

      function refreshList() {
        const api = tzApi();
        if (!api || !list) return;
        const phone = api.phoneZone();
        const query = q ? q.value : "";
        const searching = String(query || "").trim() !== "";
        const ids = api.suggestions(query, phone);
        list.textContent = "";
        ids.forEach(function (id) {
          const li = global.document.createElement("li");
          const btn = global.document.createElement("button");
          btn.type = "button";
          btn.textContent = tzRowLabel(id, searching ? "" : phone);
          btn.addEventListener("click", function () {
            if (memory && typeof memory.writeStoredTz === "function") {
              memory.writeStoredTz(id === phone ? "" : id);
            }
            box.open = false;
            if (lastExposed) paintExpose(root, lastExposed, "", lastDisplay);
            else paintUpdatedClock(root, lastExposed, lastDisplay);
          });
          li.appendChild(btn);
          list.appendChild(li);
        });
      }

      if (q) q.addEventListener("input", refreshList);
      box.addEventListener("toggle", function () {
        if (box.open) refreshList();
      });
    }

    bindTz();

    function groupsFor(typed, world) {
      if (memory && typeof memory.pickerGroups === "function") {
        return memory.pickerGroups(typed, world);
      }
      return { recents: [], world: world || [], sameName: false };
    }

    function paintSearching(on) {
      const hint = root.querySelector("[data-w1-searching]");
      if (!hint) return;
      const label = hint.querySelector("[data-i18n=\"nuova_ux_spot_wait\"]");
      if (label) label.textContent = tt("nuova_ux_spot_wait");
      hint.hidden = !on;
    }

    function setWaitingPlaces(on) {
      waitingPlaces = !!on;
      window.clearTimeout(waitHintTimer);
      if (waitingPlaces) {
        listEl.setAttribute("aria-busy", "true");
        waitHintTimer = window.setTimeout(function () {
          if (!waitingPlaces) return;
          paintSearching(true);
        }, WAIT_HINT_MS);
      } else {
        listEl.removeAttribute("aria-busy");
        paintSearching(false);
      }
    }

    function paintList() {
      renderPicker(listEl, groupsFor(lastTyped, lastCandidates), onPick, waitingPlaces);
      const idle = root.querySelector("[data-w1-idle]");
      if (idle && !idle.hidden) {
        const hasRows = listEl.querySelectorAll("button").length > 0;
        idle.textContent = hasRows ? tt("nuova_ux_spot_tap") : tt("nuova_ux_w1_idle");
      }
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

    async function loadWind(spotText, candidate, seq) {
      const result = await fromA.fetchWindLatest(spotText, candidate);
      if (seq != null && seq !== windSeq) return;
      waitingWind = false;
      if (!result.ok) {
        lastFailed = true;
        lastExposed = null;
        lastDisplay = null;
        lastGeo = null;
        setStage(root, "fail");
        paintExpose(root, null, tt("nuova_ux_wind_unavailable"));
        publishSpot(spotText, true);
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
      refreshConsults();
    }

    function onPick(candidate) {
      const name = placeTitle(candidate);
      input.value = name;
      lastTyped = name;
      searchSeq += 1;
      const seq = (windSeq += 1);
      setWaitingPlaces(false);
      if (searchAbort) searchAbort.abort();
      listEl.hidden = true;
      const msg = root.querySelector('[data-w1="msg"]');
      if (msg) msg.textContent = "";
      waitingWind = true;
      setStage(root, "wait");
      if (memory && typeof memory.rememberSpot === "function") {
        memory.rememberSpot(candidate);
      }
      loadWind(name, candidate, seq);
    }

    async function searchTyped(typed) {
      lastTyped = typed;
      if (!String(typed || "").trim()) {
        lastCandidates = [];
        setWaitingPlaces(false);
        if (searchAbort) searchAbort.abort();
        paintList();
        return;
      }
      paintList();
      const seq = (searchSeq += 1);
      if (searchAbort) searchAbort.abort();
      searchAbort = typeof global.AbortController === "function" ? new global.AbortController() : null;
      setWaitingPlaces(true);
      paintList();
      try {
        const res = await fromA.fetchSpotCandidates(typed, searchAbort ? { signal: searchAbort.signal } : {});
        if (seq !== searchSeq) return;
        lastCandidates = res.candidates || [];
      } catch (_err) {
        if (seq !== searchSeq) return;
      }
      setWaitingPlaces(false);
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
      if (waitingWind) {
        setStage(root, "wait");
      } else if (lastFailed) {
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
      paintConsults(root, lastConsults);
      if (waitingPlaces) paintSearching(true);
      if (!listEl.hidden) paintList();
    });
  }

  global.NuovaUxW1 = Object.freeze({ boot, paintExpose, paintOptional, paintConsults, setStage, renderPicker, kaTone });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document.querySelector("[data-slot=w1]"));
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document.querySelector("[data-slot=w1]"));
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
