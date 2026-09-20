/**
 * NUOVA_UX — foglio “Come”: chrome. Non è vento, non è tubo B, non è KiteAware.
 * Si apre solo se l’utente lo chiede. Chiudi visibile + sfondo + Escape.
 */
(function initNuovaUxHow(global) {
  "use strict";

  function isOpen(dialog) {
    return !!(dialog && (dialog.open || dialog.hasAttribute("open")));
  }

  function openHow(dialog) {
    if (!dialog) return false;
    if (typeof dialog.showModal === "function") {
      try {
        if (!dialog.open) dialog.showModal();
      } catch (_e) {
        dialog.setAttribute("open", "");
      }
    } else {
      dialog.setAttribute("open", "");
    }
    const closeBtn = dialog.querySelector("[data-how-close]");
    if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
    return true;
  }

  function closeHow(dialog, trigger) {
    if (!dialog) return false;
    if (typeof dialog.close === "function" && dialog.open) {
      try {
        dialog.close();
      } catch (_e) {
        dialog.removeAttribute("open");
      }
    } else {
      dialog.removeAttribute("open");
    }
    if (trigger && typeof trigger.focus === "function") trigger.focus();
    return true;
  }

  function bind(doc) {
    const root = doc || global.document;
    if (!root) return;
    const dialog = root.querySelector("[data-how]");
    const trigger = root.querySelector("[data-how-open]");
    if (!dialog || !trigger) return;
    if (trigger.getAttribute("data-how-bound") === "1") return;
    trigger.setAttribute("data-how-bound", "1");

    trigger.addEventListener("click", function (ev) {
      ev.preventDefault();
      openHow(dialog);
    });

    dialog.querySelectorAll("[data-how-close]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        closeHow(dialog, trigger);
      });
    });

    dialog.addEventListener("click", function (ev) {
      if (ev.target === dialog) closeHow(dialog, trigger);
    });

    root.addEventListener("nuova-ux-durable", function () {
      if (isOpen(dialog)) closeHow(dialog, trigger);
    });
  }

  global.NuovaUxHowV1 = Object.freeze({
    bind: bind,
    open: openHow,
    close: closeHow,
    isOpen: isOpen
  });

  if (global.document && global.document.readyState !== "loading") {
    bind(global.document);
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      bind(global.document);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxHowV1;
}
