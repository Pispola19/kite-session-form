/**
 * NUOVA_UX — nasconde il marchio lab solo se FACE_LIVE. Non è un tubo.
 */
(function initNuovaUxCutoverFace(global) {
  "use strict";

  function live() {
    const flag = global.NuovaUxCutoverFlagV1;
    return !!(flag && flag.FACE_LIVE === true);
  }

  function boot(doc) {
    const root = doc || global.document;
    if (!root || !live()) return;
    const mark = root.querySelector("[data-i18n='nuova_ux_lab_mark']");
    if (mark) mark.hidden = true;
    const skinTitle = root.querySelector(".nuova-ux-shell__title");
    if (skinTitle) skinTitle.hidden = true;
    root.querySelectorAll(".nuova-ux-slot__id").forEach(function (el) {
      el.hidden = true;
    });
    const title = root.querySelector("title");
    if (title) title.textContent = "VENTO LIVE";
    if (root.defaultView && root.defaultView.document) {
      root.defaultView.document.title = "VENTO LIVE";
    } else {
      root.title = "VENTO LIVE";
    }
  }

  global.NuovaUxCutoverFaceV1 = Object.freeze({ boot: boot });

  if (global.document) {
    global.document.addEventListener("nuova-ux-lang", function () {
      boot(global.document);
    });
  }

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document);
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxCutoverFaceV1;
}
