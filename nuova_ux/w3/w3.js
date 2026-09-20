/**
 * NUOVA_UX W3 — grazie dopo durable. Popup al centro. Non è un tubo. Se manca, W2 sopravvive.
 */
(function initNuovaUxW3(global) {
  "use strict";

  function tt(key) {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.t === "function") return apply.t(key);
    return key;
  }

  function paint(root) {
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = tt(key);
    });
  }

  function boot(root) {
    if (!root) return;
    const windows = global.NuovaUxSlotWindowV1;
    if (windows && typeof windows.bind === "function") windows.bind(root);
    document.addEventListener("nuova-ux-durable", function (ev) {
      root.hidden = false;
      if (root.tagName === "DETAILS") root.open = true;
      paint(root);
      if (ev && ev.detail && ev.detail.session_id) {
        root.setAttribute("data-w3-session", ev.detail.session_id);
      }
      if (ev && ev.detail && ev.detail.receipt_id) {
        root.setAttribute("data-w3-receipt", String(ev.detail.receipt_id));
      }
    });
    root.addEventListener("toggle", function () {
      if (!root.open) root.hidden = true;
    });
    document.addEventListener("nuova-ux-lang", function () {
      if (root.open) paint(root);
    });
  }

  global.NuovaUxW3 = Object.freeze({ boot });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document.querySelector("[data-slot=w3]"));
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document.querySelector("[data-slot=w3]"));
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
