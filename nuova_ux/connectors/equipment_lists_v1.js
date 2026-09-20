/**
 * NUOVA_UX — un buco liste. Se la fetta non è ready, MOCK_DATA resta com'è.
 * Se ready e le liste sono piene, sostituisce solo marca / modello / misura tavola.
 * Payload B resta stringa. W2 non cambia. Niente fetch, niente Registry, niente L3.
 */
(function initNuovaUxEquipmentLists(global) {
  "use strict";

  const BOARD_TYPES = Object.freeze(["twintip", "surfboard", "foil"]);

  function cleanName(value) {
    return String(value || "").trim();
  }

  function cleanNames(list) {
    const out = [];
    const seen = {};
    (Array.isArray(list) ? list : []).forEach(function (item) {
      const name = cleanName(item);
      if (!name || name === "Other" || name.indexOf("__") === 0) return;
      const key = name.toLocaleLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(name);
    });
    return out;
  }

  function cleanModelMap(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const out = {};
    Object.keys(src).forEach(function (brand) {
      const name = cleanName(brand);
      if (!name) return;
      out[name] = cleanNames(src[brand]);
    });
    return out;
  }

  function looksLikeLxW(name) {
    return /^\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*cm)?$/i.test(String(name || "").trim());
  }

  function looksLikeBoardSize(type, name) {
    const n = String(name || "").trim();
    if (!n) return false;
    if (type === "twintip") return looksLikeLxW(n) && !/\bcm\b/i.test(n);
    if (type === "surfboard") return /^\d+\s*'\s*\d{1,2}\s*"?$/.test(n);
    if (type === "foil") {
      if (looksLikeLxW(n)) return true;
      return /^\d+(?:[.,]\d+)?\s*l(?:itri|iters)?$/i.test(n);
    }
    return false;
  }

  function cleanSizeMap(raw, base) {
    const src = raw && typeof raw === "object" ? raw : {};
    const fromBase = base && typeof base === "object" ? base : {};
    const out = {};
    BOARD_TYPES.forEach(function (type) {
      const keep = function (label) {
        return looksLikeBoardSize(type, label);
      };
      const fromSlice = cleanNames(src[type]).filter(keep);
      const merged = cleanNames((fromBase[type] || []).concat(fromSlice)).filter(keep);
      if (merged.length) out[type] = merged;
    });
    return out;
  }

  function applyOntoMock(target) {
    const where = target || global;
    const base = where.MOCK_DATA;
    const slice = where.NuovaUxEquipmentFaceSliceV1;
    if (!base || !slice || slice.ready !== true) {
      return { applied: false, reason: "hold" };
    }
    const brands = cleanNames(slice.BRAND_LIST);
    const models = cleanModelMap(slice.MODELS_BY_BRAND);
    const sizes = cleanSizeMap(slice.BOARD_SIZE_BY_TYPE, base.BOARD_SIZE_BY_TYPE);
    if (!brands.length) {
      return { applied: false, reason: "empty" };
    }
    where.MOCK_DATA = Object.freeze({
      CANONICAL_VALUES: base.CANONICAL_VALUES,
      BRAND_LIST: Object.freeze(brands),
      MODELS_BY_BRAND: Object.freeze(models),
      BOARD_SIZE_BY_TYPE: Object.freeze(sizes)
    });
    return { applied: true, reason: "slice" };
  }

  const result = applyOntoMock(global);

  global.NuovaUxEquipmentListsV1 = Object.freeze({
    applyOntoMock: applyOntoMock,
    looksLikeBoardSize: looksLikeBoardSize,
    lastApply: result
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxEquipmentListsV1;
}
