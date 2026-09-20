/**
 * NUOVA_UX — applica la lingua a tutta la faccia visibile. Un catalogo, t(key).
 * Non traduce display.* da A né i nomi propri (spot, marca, modello).
 */
(function initNuovaUxI18nApply(global) {
  "use strict";

  const LANG_KEY = "nuova_ux_ui_lang_v1";
  const OPTION_I18N_KEYS = Object.freeze({
    level: Object.freeze({
      beginner: "opt_level_beginner",
      independent: "opt_level_independent",
      advanced: "opt_level_advanced"
    }),
    gender: Object.freeze({
      M: "opt_gender_male",
      F: "opt_gender_female"
    }),
    board: Object.freeze({
      twintip: "opt_board_twintip",
      surfboard: "opt_board_surfboard",
      foil: "opt_board_foil"
    }),
    water: Object.freeze({
      flat: "opt_water_flat",
      chop_light: "opt_water_chop_light",
      chop: "opt_water_chop",
      chop_strong: "opt_water_chop_strong",
      small_waves: "opt_water_small_waves",
      waves: "opt_water_waves",
      big_waves: "opt_water_big_waves"
    }),
    result: Object.freeze({
      underpowered: "opt_result_underpowered",
      good: "opt_result_good",
      powered: "opt_result_powered",
      overpowered: "opt_result_overpowered",
      survival: "opt_result_survival"
    })
  });

  function engine() {
    return global.VentoLiveI18nV1;
  }

  function supported() {
    const i18n = engine();
    return (i18n && i18n.SUPPORTED) || ["en", "it", "de", "es", "fr", "pl"];
  }

  function normalizeLang(lang) {
    const i18n = engine();
    const lc = String(lang || "").trim().toLowerCase();
    const list = supported();
    if (list.indexOf(lc) !== -1) return lc;
    return (i18n && i18n.DEFAULT_LANG) || "en";
  }

  function readStoredLang() {
    try {
      const store = global.localStorage;
      if (!store) return "";
      const raw = store.getItem(LANG_KEY);
      if (!raw) return "";
      return normalizeLang(raw);
    } catch (_e) {
      return "";
    }
  }

  function writeStoredLang(lang) {
    try {
      const store = global.localStorage;
      if (!store) return;
      store.setItem(LANG_KEY, normalizeLang(lang));
    } catch (_e) {
      /* ignore quota */
    }
  }

  function currentLang() {
    return normalizeLang(global.__ventoLiveUiLang || readStoredLang() || "it");
  }

  function t(key, vars) {
    const i18n = engine();
    const lang = currentLang();
    if (!i18n) return key || "";
    if (vars && typeof i18n.formatTemplate === "function") {
      return i18n.formatTemplate(key, lang, vars);
    }
    return i18n.t(key, lang);
  }

  function optionLabel(category, value) {
    const raw = String(value == null ? "" : value);
    if (raw === "Other") {
      if (category === "boardSize") return t("opt_board_size_other");
      if (category === "brand") return t("opt_brand_other");
      return t("opt_model_other");
    }
    const map = OPTION_I18N_KEYS[category];
    if (map && map[raw]) return t(map[raw]);
    return raw;
  }

  function optionCanonical(category, displayed) {
    const raw = String(displayed == null ? "" : displayed).trim();
    if (!raw) return "";
    if (raw === "Other") return "Other";
    const otherLabel =
      category === "boardSize"
        ? t("opt_board_size_other")
        : category === "brand"
          ? t("opt_brand_other")
          : t("opt_model_other");
    if (raw === otherLabel) return "Other";
    const map = OPTION_I18N_KEYS[category];
    if (map && Object.prototype.hasOwnProperty.call(map, raw)) return raw;
    if (map) {
      const keys = Object.keys(map);
      for (let i = 0; i < keys.length; i += 1) {
        if (t(map[keys[i]]) === raw) return keys[i];
      }
    }
    return raw;
  }

  function apply(root) {
    const doc = root || global.document;
    if (!doc) return;
    const html = doc.documentElement;
    if (html) html.setAttribute("lang", currentLang());
    const lang = currentLang();
    doc.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const translated = t(key);
      if (el.tagName === "TITLE") {
        el.textContent = translated;
        if (doc.defaultView && doc.defaultView.document) {
          doc.defaultView.document.title = translated;
        }
        return;
      }
      el.textContent = translated;
    });
    doc.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", t(key));
    });
    doc.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-aria");
      if (key) el.setAttribute("aria-label", t(key));
    });
    const select = doc.getElementById("languageSelect");
    if (select) select.value = lang;
  }

  function setLang(lang) {
    const lc = normalizeLang(lang);
    global.__ventoLiveUiLang = lc;
    writeStoredLang(lc);
    apply(global.document);
    if (global.document && typeof global.document.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
      global.document.dispatchEvent(new global.CustomEvent("nuova-ux-lang", { detail: { lang: lc } }));
    }
    return lc;
  }

  function boot(doc) {
    const root = doc || global.document;
    if (!root) return;
    setLang(readStoredLang() || "it");
    const select = root.getElementById("languageSelect");
    if (select && !select.getAttribute("data-nuova-ux-lang-bound")) {
      select.setAttribute("data-nuova-ux-lang-bound", "1");
      select.addEventListener("change", function () {
        setLang(select.value);
      });
    }
  }

  global.NuovaUxI18nApplyV1 = Object.freeze({
    LANG_KEY,
    OPTION_I18N_KEYS,
    supported,
    normalizeLang,
    currentLang,
    t,
    optionLabel,
    optionCanonical,
    apply,
    setLang,
    boot
  });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document);
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxI18nApplyV1;
}
