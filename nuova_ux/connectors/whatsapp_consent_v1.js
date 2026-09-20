/**
 * NUOVA_UX — WhatsApp = consenso dopo durable. Non è B. Non si apre da solo.
 * Stesso numero già in opera. Non parte da 127.0.0.1. Non parte sul mock.
 */
(function initNuovaUxWhatsAppConsent(global) {
  "use strict";

  const PHONE = "393205316981";
  const SUMMARY_KEYS = Object.freeze([
    ["label_weight", "weight"],
    ["label_board", "board"],
    ["label_board_size", "boardSize"],
    ["label_level", "level"],
    ["label_kite_size", "kite"],
    ["label_brand", "brand"],
    ["label_model", "model"],
    ["label_wind", "wind"],
    ["label_location", "location"],
    ["label_water", "water"],
    ["label_result", "result"],
    ["label_notes", "note"]
  ]);

  function ports() {
    return global.NuovaUxPortsV1 || {};
  }

  function plugged() {
    const wa = ports().whatsapp;
    return !!(wa && wa.plugged);
  }

  function armed(loc) {
    const host = loc && loc.hostname ? String(loc.hostname) : "";
    return host === "ventolive.com" || host === "www.ventolive.com";
  }

  function skip(reason) {
    return { ok: true, skipped: true, consent: true, reason: reason || "skipped" };
  }

  function tt(key) {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.t === "function") return apply.t(key);
    return key;
  }

  function summary(legacy) {
    const lp = legacy && typeof legacy === "object" ? legacy : {};
    const lines = ["VENTO LIVE"];
    SUMMARY_KEYS.forEach(function (pair) {
      const value = lp[pair[1]];
      if (value == null || String(value).trim() === "") return;
      lines.push(tt(pair[0]) + ": " + String(value));
    });
    return lines.join("\n");
  }

  function consentHref(legacy) {
    const phone = String(PHONE).replace(/\D/g, "");
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(summary(legacy));
  }

  function hide(anchor) {
    if (!anchor) return;
    anchor.hidden = true;
    anchor.removeAttribute("href");
  }

  function offer(root, detail, loc) {
    const slot = root || (global.document && global.document.querySelector("[data-slot=w3]"));
    const anchor = slot && slot.querySelector("[data-wa-consent]");
    const payload = detail && detail.legacy;
    if (!plugged()) {
      hide(anchor);
      return skip("unplugged");
    }
    if (detail && detail.mock) {
      hide(anchor);
      return skip("mock");
    }
    if (!armed(loc || global.location)) {
      hide(anchor);
      return skip("not_online");
    }
    if (!anchor || !payload) {
      hide(anchor);
      return skip("no_button");
    }
    anchor.hidden = false;
    anchor.setAttribute("href", consentHref(payload));
    anchor.setAttribute("rel", "noopener noreferrer");
    return { ok: true, consent: true, href: anchor.getAttribute("href") };
  }

  function onDurable(ev) {
    offer(null, ev && ev.detail ? ev.detail : {}, global.location);
  }

  function boot() {
    if (!global.document) return;
    global.document.addEventListener("nuova-ux-durable", onDurable);
  }

  global.NuovaUxWhatsAppConsentV1 = Object.freeze({
    PHONE,
    plugged,
    armed,
    summary,
    consentHref,
    offer,
    skip
  });

  boot();
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxWhatsAppConsentV1;
}
