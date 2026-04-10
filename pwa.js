"use strict";

(() => {
  const SCOPE_PATH = "/kite-session-form/";
  const SW_URL = `${SCOPE_PATH}sw.js`;
  const FIRST_SUBMIT_KEY = "rdk_first_submit";

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
  }

  function isAndroid() {
    return /android/i.test(window.navigator.userAgent || "");
  }

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }

  function hasFirstSubmitDone() {
    try {
      return window.localStorage.getItem(FIRST_SUBMIT_KEY) === "true";
    } catch (_) {
      return true;
    }
  }

  function toggleInstallBanner() {
    const banner = document.getElementById("installBanner");
    if (!banner) return;

    if (isStandalone() || !hasFirstSubmitDone()) {
      banner.hidden = true;
      return;
    }

    const showIos = isIos();
    const showAndroid = isAndroid();
    const iosHint = document.getElementById("installBannerIos");
    const androidHint = document.getElementById("installBannerAndroid");

    if (iosHint) iosHint.hidden = !showIos;
    if (androidHint) androidHint.hidden = !showAndroid;

    banner.hidden = !(showIos || showAndroid);
  }

  function registerServiceWorker() {
    if (!window.isSecureContext || !("serviceWorker" in window.navigator)) return;

    window.addEventListener("load", () => {
      window.navigator.serviceWorker.register(SW_URL, { scope: SCOPE_PATH }).catch(() => {});
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    toggleInstallBanner();
  });

  window.addEventListener("rdk:first-submit-done", toggleInstallBanner);

  window.addEventListener("appinstalled", () => {
    const banner = document.getElementById("installBanner");
    if (banner) banner.hidden = true;
  });

  registerServiceWorker();
})();
