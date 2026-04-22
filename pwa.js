"use strict";

(() => {
  const SCOPE_PATH = "/kite-session-form/";
  const SW_URL = `${SCOPE_PATH}sw.js`;

  function registerServiceWorker() {
    if (!window.isSecureContext || !("serviceWorker" in window.navigator)) return;

    window.addEventListener("load", () => {
      window.navigator.serviceWorker.register(SW_URL, { scope: SCOPE_PATH }).catch(() => {});
    });
  }

  registerServiceWorker();
})();
