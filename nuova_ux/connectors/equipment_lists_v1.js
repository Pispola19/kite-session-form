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

  function cleanSizeMap(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const out = {};
    BOARD_TYPES.forEach(function (type) {
      const list = cleanNames(src[type]);
      if (list.length) out[type] = list;
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
    const sizes = cleanSizeMap(slice.BOARD_SIZE_BY_TYPE);
    if (!brands.length) {
      return { applied: false, reason: "empty" };
    }
    where.MOCK_DATA = Object.freeze({
      CANONICAL_VALUES: base.CANONICAL_VALUES,
      BRAND_LIST: Object.freeze(brands),
      MODELS_BY_BRAND: Object.freeze(models),
      BOARD_SIZE_BY_TYPE: Object.freeze(
        Object.assign({}, base.BOARD_SIZE_BY_TYPE || {}, sizes)
      )
    });
    return { applied: true, reason: "slice" };
  }

  const result = applyOntoMock(global);

  global.NuovaUxEquipmentListsV1 = Object.freeze({
    applyOntoMock: applyOntoMock,
    lastApply: result
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxEquipmentListsV1;
}
