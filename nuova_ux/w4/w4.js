/**
 * NUOVA_UX W4 — finestra KiteAware. Posto riservato, non operativo.
 * Non calcola vento. Non è W1.KA (chip da display.kite_decision). Non è un tubo.
 */
(function initNuovaUxW4(global) {
  "use strict";

  function tt(key) {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.t === "function") return apply.t(key);
    return key;
  }

  function paint(root) {
    if (!root) return;
    const el = root.querySelector("[data-w4-hold]");
    if (el) el.textContent = tt("nuova_ux_w4_hold");
  }

  function boot(root) {
    if (!root) return;
    root.setAttribute("data-w4-ready", "0");
    paint(root);
    document.addEventListener("nuova-ux-lang", function () {
      paint(root);
    });
  }

  global.NuovaUxW4 = Object.freeze({ boot, paint });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document.querySelector("[data-slot=w4]"));
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document.querySelector("[data-slot=w4]"));
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
