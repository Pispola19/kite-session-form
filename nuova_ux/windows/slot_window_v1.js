/**
 * NUOVA_UX — finestra a comparsa.
 * Titolo: apre e può chiudere. Chiudi: chiude. W2 si apre anche quando si scrive lo spot in W1.
 */
(function initNuovaUxSlotWindow(global) {
  "use strict";

  function bind(root) {
    if (!root || String(root.tagName || "").toUpperCase() !== "DETAILS") return;
    const closeBtn = root.querySelector("[data-window-close]");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        root.open = false;
      });
    }
  }

  function open(root) {
    if (!root || String(root.tagName || "").toUpperCase() !== "DETAILS") return false;
    root.open = true;
    return true;
  }

  function boot(doc) {
    const rootDoc = doc || global.document;
    if (!rootDoc) return;
    rootDoc.querySelectorAll("[data-window-slot]").forEach(bind);
  }

  global.NuovaUxSlotWindowV1 = Object.freeze({ bind, boot, open });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document);
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxSlotWindowV1;
}
