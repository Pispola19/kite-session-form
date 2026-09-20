/**
 * NUOVA_UX — connettore A: candidati + /wind/latest. Riusa routing e hardGate. Zero numeri inventati.
 */
(function initNuovaUxWindFromA(global) {
  "use strict";

  function routing() {
    return global.VENTOLIVE_ROUTING_V1;
  }

  function gate() {
    return global.ServerContractPassiveV1;
  }

  function candidatesAdapter() {
    return global.LiveSpotCandidatesAdapterV1;
  }

  function scrittaUnplugged() {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.t === "function") return apply.t("nuova_ux_port_unplugged_wind");
    return "Vento Live is not plugged in yet";
  }

  function windPlugged() {
    const p = global.NuovaUxPortsV1;
    return !!(p && p.wind && p.wind.plugged);
  }

  function scrittaNonDisponibile() {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.t === "function") return apply.t("nuova_ux_wind_unavailable");
    const i18n = global.VentoLiveI18nV1;
    if (i18n && typeof i18n.t === "function") {
      return i18n.t("nuova_ux_wind_unavailable", global.__ventoLiveUiLang);
    }
    return "Wind not available";
  }

  function fieldText(field) {
    if (field == null) return "";
    if (typeof field === "string") return field.trim();
    if (typeof field !== "object") return "";
    return field.text == null ? "" : String(field.text).trim();
  }

  function pickNum() {
    for (let i = 0; i < arguments.length; i += 1) {
      if (arguments[i] == null || arguments[i] === "") continue;
      const n = Number(arguments[i]);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function pickGeo(coords, candidate, spot) {
    const lat = pickNum(
      coords && coords.lat,
      candidate && candidate.lat,
      spot && spot.lat
    );
    const lon = pickNum(
      coords && coords.lon,
      candidate && candidate.lon,
      spot && spot.lon
    );
    return { lat: lat, lon: lon };
  }

  function uiLang() {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.currentLang === "function") return apply.currentLang();
    return global.__ventoLiveUiLang || "it";
  }

  function applyF4WindName(view, lat, lon) {
    const F4 = global.F4WindNameV1;
    if (!F4 || typeof F4.resolveWindName !== "function" || !view || !view.display) {
      return view;
    }
    const direction = fieldText(view.display.direction);
    const current = fieldText(view.display.wind_name);
    const hint = F4.isCompassToken(direction) ? direction : F4.isCompassToken(current) ? current : direction;
    const key = F4.resolveWindName(hint, lat, lon);
    if (!key) return view;
    const text = F4.labelWindName(key, uiLang());
    if (!text) return view;
    return Object.assign({}, view, {
      display: Object.assign({}, view.display, {
        wind_name: { state: "present", text: text }
      })
    });
  }

  function fetchDefaults() {
    const r = routing();
    return (r && r.FETCH_DEFAULTS) || { cache: "no-store" };
  }

  function normalizeCandidate(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = String(raw.name || raw.label || "").trim();
    if (!name) return null;
    return {
      name: name,
      label: String(raw.label || name).trim(),
      lat: raw.lat,
      lon: raw.lon,
      country: String(raw.country || "").trim(),
      region: String(raw.region || raw.admin1 || "").trim()
    };
  }

  async function fetchSpotCandidates(query, opts) {
    if (!windPlugged()) return { ok: true, candidates: [], unplugged: true };
    const r = routing();
    const adapter = candidatesAdapter();
    if (!r || typeof r.canonicalSpotCandidatesUrl !== "function") {
      return { ok: false, candidates: [] };
    }
    const url = r.canonicalSpotCandidatesUrl(query);
    const fetchOpts = Object.assign({}, fetchDefaults());
    if (opts && opts.signal) fetchOpts.signal = opts.signal;
    const res = await global.fetch(url, fetchOpts);
    if (!res.ok) return { ok: false, candidates: [] };
    const payload = await res.json();
    const normalized =
      adapter && typeof adapter.normalizeCandidatesPayload === "function"
        ? adapter.normalizeCandidatesPayload(payload)
        : payload;
    const list = normalized && Array.isArray(normalized.candidates) ? normalized.candidates : [];
    return {
      ok: true,
      candidates: list.map(normalizeCandidate).filter(Boolean)
    };
  }

  function prefixFilter(candidates, typed) {
    const q = String(typed || "").trim().toLowerCase();
    const list = Array.isArray(candidates) ? candidates.slice() : [];
    const lang =
      (global.NuovaUxI18nApplyV1 && global.NuovaUxI18nApplyV1.currentLang()) ||
      global.__ventoLiveUiLang ||
      "it";
    list.sort(function (a, b) {
      const la = String((a && a.label) || (a && a.name) || "");
      const lb = String((b && b.label) || (b && b.name) || "");
      return la.localeCompare(lb, lang);
    });
    if (!q) return list;
    return list.filter(function (c) {
      const label = String((c && c.label) || "").toLowerCase();
      const name = String((c && c.name) || "").toLowerCase();
      return label.indexOf(q) === 0 || name.indexOf(q) === 0;
    });
  }

  async function fetchWindLatest(spotText, candidate) {
    if (!windPlugged()) {
      return {
        ok: false,
        blocked: true,
        unplugged: true,
        view: null,
        scritta: scrittaUnplugged()
      };
    }
    const r = routing();
    const adapter = candidatesAdapter();
    const g = gate();
    const scritta = scrittaNonDisponibile();
    if (!r || typeof r.canonicalWindLatestUrl !== "function" || !g) {
      return { ok: false, blocked: true, view: g ? g.blockedPayload() : null, scritta: scritta };
    }
    let extra = null;
    if (adapter && typeof adapter.windLatestQueryParams === "function") {
      extra = adapter.windLatestQueryParams(spotText, candidate);
    }
    const spot = extra && extra.spot ? extra.spot : spotText;
    const coords =
      extra && extra.lat != null && extra.lon != null ? { lat: extra.lat, lon: extra.lon } : extra;
    const url = r.canonicalWindLatestUrl(spot, coords);
    let payload = null;
    try {
      const res = await global.fetch(url, fetchDefaults());
      if (!res.ok) {
        return { ok: false, blocked: true, view: g.blockedPayload(), scritta: scritta };
      }
      payload = await res.json();
    } catch (_err) {
      return { ok: false, blocked: true, view: g.blockedPayload(), scritta: scritta };
    }
    const gated = g.hardGate(payload);
    if (!gated.allowed || gated.blocked || !gated.view || !gated.view.display) {
      return {
        ok: false,
        blocked: Boolean(gated.blocked),
        view: gated.view,
        scritta: scritta
      };
    }
    const geo = pickGeo(coords, candidate, payload && payload.spot);
    return {
      ok: true,
      blocked: false,
      view: applyF4WindName(gated.view, geo.lat, geo.lon),
      geo: geo,
      scritta: ""
    };
  }

  global.NuovaUxWindFromA = Object.freeze({
    get SCRITTA_NON_DISPONIBILE() {
      return scrittaNonDisponibile();
    },
    fetchSpotCandidates,
    prefixFilter,
    fetchWindLatest,
    applyF4WindName
  });
})(typeof window !== "undefined" ? window : globalThis);
