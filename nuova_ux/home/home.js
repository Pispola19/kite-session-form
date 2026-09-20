/**
 * NUOVA_UX — Salva in Home. Chrome, non pelle, non vento, non tubo B.
 * Chrome/Android/Edge: prompt nativo se il browser lo offre.
 * iOS Safari: solo i tre tap (Apple non lascia aggiungerlo da codice).
 */
(function initNuovaUxHomeScreen(global) {
  "use strict";

  let deferred = null;

  function tt(key) {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.t === "function") return apply.t(key);
    return key;
  }

  function armed(loc) {
    const host = loc && loc.hostname ? String(loc.hostname) : "";
    return host === "ventolive.com" || host === "www.ventolive.com";
  }

  function standalone() {
    const nav = global.navigator || {};
    if (nav.standalone === true) return true;
    if (typeof global.matchMedia !== "function") return false;
    try {
      return global.matchMedia("(display-mode: standalone)").matches;
    } catch (_e) {
      return false;
    }
  }

  function iosPhone() {
    const nav = global.navigator || {};
    const ua = String(nav.userAgent || "");
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    return nav.platform === "MacIntel" && Number(nav.maxTouchPoints || 0) > 1;
  }

  function androidPhone() {
    return /Android/i.test(String((global.navigator && global.navigator.userAgent) || ""));
  }

  function howApi() {
    return global.NuovaUxHowV1;
  }

  function inAppBrowser() {
    const ua = String((global.navigator && global.navigator.userAgent) || "");
    return /Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|WhatsApp/i.test(ua);
  }

  function paintSteps(dialog) {
    const body = dialog && dialog.querySelector("[data-home-steps]");
    if (!body) return;
    if (inAppBrowser()) body.textContent = tt("nuova_ux_home_inapp");
    else if (iosPhone()) body.textContent = tt("nuova_ux_home_ios");
    else if (androidPhone()) body.textContent = tt("nuova_ux_home_android");
    else body.textContent = tt("nuova_ux_home_desktop");
  }

  function registerSw() {
    if (!armed(global.location)) return;
    if (!global.navigator || !global.navigator.serviceWorker) return;
    if (typeof global.navigator.serviceWorker.register !== "function") return;
    global.navigator.serviceWorker.register("/sw.js").catch(function () {});
  }

  function bind(doc) {
    const root = doc || global.document;
    if (!root) return;
    const trigger = root.querySelector("[data-home-open]");
    const dialog = root.querySelector("[data-home]");
    if (!trigger) return;
    if (trigger.getAttribute("data-home-bound") === "1") return;
    trigger.setAttribute("data-home-bound", "1");

    if (standalone()) {
      trigger.hidden = true;
      return;
    }

    registerSw();
    paintSteps(dialog);

    global.addEventListener("beforeinstallprompt", function (ev) {
      ev.preventDefault();
      deferred = ev;
    });

    trigger.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (deferred && typeof deferred.prompt === "function") {
        const ask = deferred;
        deferred = null;
        ask.prompt();
        return;
      }
      const api = howApi();
      if (dialog && api && typeof api.open === "function") {
        paintSteps(dialog);
        api.open(dialog);
      }
    });

    if (dialog) {
      dialog.querySelectorAll("[data-home-close]").forEach(function (btn) {
        btn.addEventListener("click", function (ev) {
          ev.preventDefault();
          const api = howApi();
          if (api && typeof api.close === "function") api.close(dialog, trigger);
        });
      });
      dialog.addEventListener("click", function (ev) {
        if (ev.target !== dialog) return;
        const api = howApi();
        if (api && typeof api.close === "function") api.close(dialog, trigger);
      });
    }

    root.addEventListener("nuova-ux-lang", function () {
      paintSteps(dialog);
    });
    root.addEventListener("nuova-ux-durable", function () {
      const api = howApi();
      if (dialog && api && typeof api.isOpen === "function" && api.isOpen(dialog) && typeof api.close === "function") {
        api.close(dialog, trigger);
      }
    });
  }

  global.NuovaUxHomeScreenV1 = Object.freeze({
    bind: bind,
    armed: armed,
    standalone: standalone
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
  module.exports = globalThis.NuovaUxHomeScreenV1;
}
