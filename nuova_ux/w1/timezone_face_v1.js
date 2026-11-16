/**
 * NUOVA_UX W1 — dipinge display.updated_at.iso nel fuso scelto.
 * Default = fuso del telefono. Lista corta = ~24 fusi mondo (UTC−11…+12).
 * Cerca: tutti gli IANA del browser. Senza geo, senza libreria.
 */
(function initNuovaUxTimezoneFace(global) {
  "use strict";

  /** Un rappresentante per fascia oraria tipica (non i posti del viaggio). */
  const WORLD_24 = Object.freeze([
    "Pacific/Pago_Pago",
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Halifax",
    "America/Sao_Paulo",
    "Atlantic/South_Georgia",
    "Atlantic/Azores",
    "UTC",
    "Europe/Rome",
    "Europe/Athens",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Dhaka",
    "Asia/Bangkok",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Pacific/Noumea",
    "Pacific/Auckland"
  ]);

  /** Alias legacy: PIN = stessa lista mondo (test / chiamate vecchie). */
  const PIN = WORLD_24;

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
    if (raw === "UTC" || raw === "Etc/UTC") return "UTC";
    const last = raw.split("/").pop() || raw;
    return last.replace(/_/g, " ");
  }

  function utcOffsetLabel(id, atMs) {
    const zone = isIana(id) ? id : "UTC";
    const ms = typeof atMs === "number" && !Number.isNaN(atMs) ? atMs : Date.now();
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: zone,
        timeZoneName: "shortOffset",
        hour: "2-digit"
      }).formatToParts(new Date(ms));
      let i;
      for (i = 0; i < parts.length; i += 1) {
        if (parts[i].type === "timeZoneName") {
          const raw = String(parts[i].value || "").replace("GMT", "UTC");
          return raw === "UTC" ? "UTC+0" : raw;
        }
      }
    } catch (_e) {
      /* fall through */
    }
    return "";
  }

  function rowLabel(id, atMs) {
    const off = utcOffsetLabel(id, atMs);
    const city = cityOf(id);
    return off ? off + " · " + city : city;
  }

  const SEARCH_ALIAS = {
    "Pacific/Pago_Pago": "samoa pago",
    "Pacific/Honolulu": "hawaii honolulu",
    "America/Anchorage": "alaska anchorage",
    "America/Los_Angeles": "los angeles pacific la california",
    "America/Denver": "denver mountain",
    "America/Chicago": "chicago central",
    "America/New_York": "new york eastern nyc",
    "America/Halifax": "halifax atlantic",
    "America/Sao_Paulo": "sao paulo brasil brazil",
    "Atlantic/South_Georgia": "south georgia",
    "Atlantic/Azores": "azores",
    UTC: "utc gmt greenwich",
    "Europe/Rome": "roma rome italy italia",
    "Europe/Athens": "athens greece",
    "Europe/Moscow": "moscow russia",
    "Asia/Dubai": "dubai uae",
    "Asia/Karachi": "karachi pakistan",
    "Asia/Dhaka": "dhaka bangladesh",
    "Asia/Bangkok": "bangkok thailand",
    "Asia/Shanghai": "shanghai china beijing",
    "Asia/Tokyo": "tokyo japan",
    "Australia/Sydney": "sydney australia",
    "Pacific/Noumea": "noumea new caledonia",
    "Pacific/Auckland": "auckland new zealand",
    "Atlantic/Canary": "canarie canary islands las palmas tenerife",
    "Europe/Lisbon": "lisbona lisboa",
    "Europe/Madrid": "madrid",
    "Africa/Casablanca": "casablanca",
    "Asia/Manila": "manila",
    "Indian/Mauritius": "mauritius bel ombre"
  };

  function hayOf(id) {
    return (
      String(id || "") +
      " " +
      cityOf(id) +
      " " +
      utcOffsetLabel(id) +
      " " +
      (SEARCH_ALIAS[id] || "")
    )
      .toLowerCase()
      .replace(/_/g, " ");
  }

  function allZones() {
    try {
      if (typeof Intl.supportedValuesOf === "function") {
        return Intl.supportedValuesOf("timeZone");
      }
    } catch (_e) {
      /* keep WORLD_24 */
    }
    return WORLD_24.slice();
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
      WORLD_24.forEach(push);
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
    WORLD_24,
    looksLikeIso,
    instantFromUpdated,
    isIana,
    phoneZone,
    cityOf,
    utcOffsetLabel,
    rowLabel,
    suggestions,
    paintClock
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxTimezoneFaceV1;
}
