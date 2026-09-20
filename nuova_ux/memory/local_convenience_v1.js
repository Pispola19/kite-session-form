/**
 * NUOVA_UX — memoria locale browser. Nomi sulla chiave VECCHIA_UX (solo stringhe).
 * Scelta precisa (lat/lon) su chiave lab, così due luoghi omonimi restano distinti.
 */
(function initNuovaUxLocalConvenience(global) {
  "use strict";

  const NAMES_KEY = "vento_live_recent_spots_v1";
  const RICH_KEY = "nuova_ux_recent_spots_rich_v1";
  const WEIGHT_KEY = "vento_live_rider_weight_kg_v1";
  const KIT_KEY = "nuova_ux_rider_kit_v1";
  const LIMIT = 5;
  const KIT_FIELDS = Object.freeze([
    "level",
    "gender",
    "board",
    "boardSize",
    "boardSizeOther",
    "brand"
  ]);
  const WEIGHT_MIN = 20;
  const WEIGHT_MAX = 200;

  function storage() {
    try {
      return global.localStorage || null;
    } catch (_e) {
      return null;
    }
  }

  function cleanName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function readJson(key, fallback) {
    const store = storage();
    if (!store) return fallback;
    try {
      const raw = JSON.parse(store.getItem(key) || "null");
      return raw == null ? fallback : raw;
    } catch (_e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    const store = storage();
    if (!store) return false;
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch (_e) {
      return false;
    }
  }

  function readNameRecents() {
    const raw = readJson(NAMES_KEY, []);
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach(function (item) {
      if (typeof item !== "string") return;
      const name = cleanName(item);
      const key = name.toLocaleLowerCase();
      if (!name || out.some(function (s) { return s.toLocaleLowerCase() === key; })) return;
      if (out.length < LIMIT) out.push(name);
    });
    return out;
  }

  function writeNameRecents(names) {
    const cleaned = [];
    (names || []).forEach(function (item) {
      const name = cleanName(item);
      if (!name || cleaned.some(function (s) { return s.toLocaleLowerCase() === name.toLocaleLowerCase(); })) return;
      if (cleaned.length < LIMIT) cleaned.push(name);
    });
    return writeJson(NAMES_KEY, cleaned);
  }

  function readRichRecents() {
    const raw = readJson(RICH_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(function (item) {
      return item && typeof item === "object" && cleanName(item.name || item.label);
    }).slice(0, LIMIT);
  }

  function rememberSpot(place) {
    const name = cleanName(
      place && typeof place === "object" ? place.name || place.label : place
    );
    if (!name) return;
    const names = [name].concat(
      readNameRecents().filter(function (item) {
        return item.toLocaleLowerCase() !== name.toLocaleLowerCase();
      })
    );
    writeNameRecents(names);

    if (place && typeof place === "object") {
      const rich = {
        name: cleanName(place.name || place.label),
        label: cleanName(place.label || place.name),
        lat: place.lat == null ? null : Number(place.lat),
        lon: place.lon == null ? null : Number(place.lon),
        country: cleanName(place.country),
        region: cleanName(place.region)
      };
      const key =
        [rich.name, rich.lat, rich.lon, rich.country, rich.region].join("|").toLocaleLowerCase();
      const next = [rich].concat(
        readRichRecents().filter(function (item) {
          const k = [item.name, item.lat, item.lon, item.country, item.region].join("|").toLocaleLowerCase();
          return k !== key;
        })
      ).slice(0, LIMIT);
      writeJson(RICH_KEY, next);
    }
  }

  function whereLine(place) {
    if (!place || typeof place !== "object") return "";
    return [place.region, place.country].filter(Boolean).join(", ");
  }

  function nameKey(place) {
    return cleanName((place && (place.name || place.label)) || "").toLocaleLowerCase();
  }

  function annotateSameName(list) {
    const counts = {};
    (list || []).forEach(function (c) {
      const k = nameKey(c);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    return (list || []).map(function (c) {
      const k = nameKey(c);
      return Object.assign({}, c, {
        sameNameCount: counts[k] || 1,
        where: whereLine(c)
      });
    });
  }

  function prefixMatch(place, typed) {
    const q = String(typed || "").trim().toLowerCase();
    if (!q) return true;
    const label = String((place && place.label) || "").toLowerCase();
    const name = String((place && place.name) || "").toLowerCase();
    return label.indexOf(q) === 0 || name.indexOf(q) === 0;
  }

  function pickerGroups(typed, worldCandidates) {
    const q = String(typed || "").trim();
    const world = annotateSameName(
      (worldCandidates || []).filter(function (c) {
        return prefixMatch(c, q);
      })
    );
    const rich = readRichRecents().filter(function (c) {
      return prefixMatch(c, q);
    });
    const richKeys = {};
    rich.forEach(function (c) {
      richKeys[nameKey(c)] = true;
    });
    const nameOnly = readNameRecents()
      .filter(function (name) {
        return prefixMatch({ name: name, label: name }, q) && !richKeys[name.toLocaleLowerCase()];
      })
      .map(function (name) {
        return { name: name, label: name, fromMemory: true, where: "" };
      });
    const recents = annotateSameName(rich.map(function (c) {
      return Object.assign({ fromMemory: true }, c);
    }).concat(nameOnly));
    const sameName = world.some(function (c) {
      return c.sameNameCount > 1;
    });
    return { recents: recents, world: world, sameName: sameName };
  }

  function cleanRiderWeightKg(value) {
    const raw = String(value == null ? "" : value).trim().replace(",", ".");
    if (!/^\d+(?:\.\d+)?$/.test(raw)) return "";
    const weight = Number(raw);
    if (!Number.isFinite(weight) || weight < WEIGHT_MIN || weight > WEIGHT_MAX) return "";
    return String(weight);
  }

  function readStoredWeight() {
    const store = storage();
    if (!store) return "";
    try {
      return cleanRiderWeightKg(store.getItem(WEIGHT_KEY));
    } catch (_e) {
      return "";
    }
  }

  function writeStoredWeight(value) {
    const weight = cleanRiderWeightKg(value);
    const store = storage();
    if (!store) return false;
    try {
      if (!weight) {
        store.removeItem(WEIGHT_KEY);
        return true;
      }
      store.setItem(WEIGHT_KEY, weight);
      return true;
    } catch (_e) {
      return false;
    }
  }

  function cleanKit(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const out = {};
    KIT_FIELDS.forEach(function (key) {
      const value = src[key] == null ? "" : String(src[key]).trim();
      if (value) out[key] = value;
    });
    return out;
  }

  function readStoredKit() {
    return cleanKit(readJson(KIT_KEY, {}));
  }

  function writeStoredKit(raw) {
    const kit = cleanKit(raw);
    if (!Object.keys(kit).length) {
      const store = storage();
      if (!store) return false;
      try {
        store.removeItem(KIT_KEY);
        return true;
      } catch (_e) {
        return false;
      }
    }
    return writeJson(KIT_KEY, kit);
  }

  global.NuovaUxLocalConvenienceV1 = Object.freeze({
    NAMES_KEY,
    RICH_KEY,
    WEIGHT_KEY,
    KIT_KEY,
    KIT_FIELDS,
    LIMIT,
    readNameRecents,
    writeNameRecents,
    readRichRecents,
    rememberSpot,
    whereLine,
    annotateSameName,
    prefixMatch,
    pickerGroups,
    cleanRiderWeightKg,
    readStoredWeight,
    writeStoredWeight,
    readStoredKit,
    writeStoredKit
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxLocalConvenienceV1;
}
