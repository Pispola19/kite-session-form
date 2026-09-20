/**
 * NUOVA_UX — fetta liste attrezzo per W2. Stesse chiavi di MOCK_DATA.
 * Oggi ready=false: la faccia resta su static_data. Quando Anora chiude, si riempie qui.
 * Non è Registry, non è L3, non è tubo B. Niente id, niente vento.
 */
(function initNuovaUxEquipmentFaceSlice(global) {
  "use strict";

  global.NuovaUxEquipmentFaceSliceV1 = Object.freeze({
    schema: "nuova_ux_equipment_face_slice_v1",
    ready: false,
    BRAND_LIST: Object.freeze([]),
    MODELS_BY_BRAND: Object.freeze({}),
    BOARD_SIZE_BY_TYPE: Object.freeze({})
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxEquipmentFaceSliceV1;
}
