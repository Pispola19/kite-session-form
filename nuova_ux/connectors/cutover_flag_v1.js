/**
 * NUOVA_UX — interruttore faccia. FACE_LIVE true = sito pubblico NUOVA_UX.
 * Non innesta B. Non tocca 5050.
 */
(function initNuovaUxCutoverFlag(global) {
  "use strict";

  global.NuovaUxCutoverFlagV1 = Object.freeze({
    schema: "nuova_ux_cutover_flag_v1",
    FACE_LIVE: true
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxCutoverFlagV1;
}
