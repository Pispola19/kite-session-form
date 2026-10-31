/**
 * NUOVA_UX W1 — dipinge display.updated_at.iso nel fuso scelto.
 * Senza ISO non converte "HH:MM". Niente geo, niente libreria.
 */
(function initNuovaUxTimezoneFace(global) {
  "use strict";

  const PIN = Object.freeze([
    "Europe/Rome",
    "Atlantic/Canary",
    "Europe/Lisbon",
    "Europe/Madrid",
    "Africa/Casablanca",
    "Asia/Dubai",
    "Asia/Manila"
  ]);

  function looksLikeIso(value) {
    const s = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return false;
    return !Number.isNaN(Date.parse(s));
  }

  function instantFromUpdated(field) {
    if (field == null) return null;
    if (typeof field === "string") return looksLikeIso(field) ? Date.parse(field) : null;
    if (typeof field !== "object") return null;
    const keys = ["iso", "instant"];
    let i;
    for (i = 0; i < keys.length; i += 1) {
      if (looksLikeIso(field[keys[i]])) return Date.parse(field[keys[i]]);
    }
    if (looksLikeIso(field.text)) return Date.parse(field.text);
    return null;
  }

  function isIana(id) {
    const zone = String(id || "").trim();
    if (!zone) return false;
    try {
      Intl.DateTimeFormat("en", { timeZone: zone }).format(new Date());
      return true;
    } catch (_e) {
      return false;
    }
  }

  function phoneZone() {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return isIana(zone) ? zone : "UTC";
    } catch (_e) {
      return "UTC";
    }
  }

  function cityOf(id) {
    const raw = String(id || "");
    const last = raw.split("/").pop() || raw;
    return last.replace(/_/g, " ");
  }

  const SEARCH_ALIAS = {
    "Europe/Rome": "roma rome",
    "Atlantic/Canary": "canarie canary islands las palmas tenerife",
    "Europe/Lisbon": "lisbona lisboa",
    "Europe/Madrid": "madrid",
    "Africa/Casablanca": "casablanca",
    "Asia/Dubai": "dubai",
    "Asia/Manila": "manila"
  };

  function hayOf(id) {
    return (String(id || "") + " " + cityOf(id) + " " + (SEARCH_ALIAS[id] || ""))
      .toLowerCase()
      .replace(/_/g, " ");
  }

  function allZones() {
    try {
      if (typeof Intl.supportedValuesOf === "function") {
        return Intl.supportedValuesOf("timeZone");
      }
    } catch (_e) {
      /* keep PIN */
    }
    return PIN.slice();
  }

  function suggestions(query, phone) {
    const q = String(query || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ");
    const zones = allZones();
    const out = [];
    const seen = {};

    function push(id) {
      if (!id || seen[id] || !isIana(id)) return;
      seen[id] = true;
      out.push(id);
    }

    if (!q) {
      push(phone || phoneZone());
      PIN.forEach(push);
      return out;
    }

    zones.forEach(function (id) {
      if (hayOf(id).indexOf(q) !== -1) push(id);
    });
    return out.slice(0, 40);
  }

  function paintClock(exposedText, field, zone, lang) {
    const fallback = exposedText == null ? "" : String(exposedText);
    const ms = instantFromUpdated(field);
    const tz = isIana(zone) ? zone : phoneZone();
    if (ms == null) {
      return { text: fallback, hasInstant: false, zone: tz };
    }
    const text = new Intl.DateTimeFormat(lang || "it", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: tz
    }).format(new Date(ms));
    return { text: text, hasInstant: true, zone: tz };
  }

  global.NuovaUxTimezoneFaceV1 = Object.freeze({
    PIN,
    looksLikeIso,
    instantFromUpdated,
    isIana,
    phoneZone,
    cityOf,
    suggestions,
    paintClock
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxTimezoneFaceV1;
}
