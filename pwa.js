"use strict";

(() => {
  const SCOPE_PATH = "/kite-session-form/";
  const SW_URL = `${SCOPE_PATH}sw.js`;
  const DISMISS_KEY = "rdk_install_banner_dismissed";

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
  }

  function isAndroid() {
    return /android/i.test(window.navigator.userAgent || "");
  }

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }

  function readDismissed() {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function writeDismissed() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch (_) {}
  }

  function toggleInstallBanner() {
    const banner = document.getElementById("installBanner");
    if (!banner) return;

    if (isStandalone() || readDismissed()) {
      banner.hidden = true;
      return;
    }

    const showIos = isIos();
    const showAndroid = isAndroid();
    const showGeneric = false;
    const iosHint = document.getElementById("installBannerIos");
    const androidHint = document.getElementById("installBannerAndroid");
    const genericHint = document.getElementById("installBannerGeneric");

    if (iosHint) iosHint.hidden = !showIos;
    if (androidHint) androidHint.hidden = !showAndroid;
    if (genericHint) genericHint.hidden = !showGeneric;

    banner.hidden = !(showIos || showAndroid);
  }

  function registerServiceWorker() {
    if (!window.isSecureContext || !("serviceWorker" in window.navigator)) return;

    window.addEventListener("load", () => {
      window.navigator.serviceWorker.register(SW_URL, { scope: SCOPE_PATH }).catch(() => {});
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const dismissBtn = document.getElementById("installBannerDismiss");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        writeDismissed();
        const banner = document.getElementById("installBanner");
        if (banner) banner.hidden = true;
      });
    }

    toggleInstallBanner();
  });

  window.addEventListener("appinstalled", () => {
    const banner = document.getElementById("installBanner");
    if (banner) banner.hidden = true;
    writeDismissed();
  });

  registerServiceWorker();
})();
