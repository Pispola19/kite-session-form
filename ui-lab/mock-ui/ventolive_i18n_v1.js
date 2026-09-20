/**
 * VENTO LIVE I18N GLOBAL RULE V1 — tutti i testi UX vento via t(key, lang).
 */
(function initVentoLiveI18n(global) {
  "use strict";

  const DEFAULT_LANG = "en";
  const SUPPORTED = Object.freeze(["en", "it", "de", "es", "fr", "pl"]);

  function normalizeLang(lang) {
    const lc = String(lang || DEFAULT_LANG).trim().toLowerCase();
    return SUPPORTED.includes(lc) ? lc : DEFAULT_LANG;
  }

  /**
   * @param {string} key
   * @param {string} [lang]
   * @returns {string}
   */
  function t(key, lang) {
    const lc = normalizeLang(lang || global.__ventoLiveUiLang || DEFAULT_LANG);
    const T = global.RDK_TRANSLATIONS;
    if (!T || !key) return key || "";
    if (T[lc] && Object.prototype.hasOwnProperty.call(T[lc], key)) {
      const v = T[lc][key];
      if (v != null && String(v).length) return String(v);
    }
    if (T.en && Object.prototype.hasOwnProperty.call(T.en, key)) {
      return String(T.en[key]);
    }
    return key;
  }

  function formatTemplate(key, lang, vars) {
    let out = t(key, lang);
    if (!vars || typeof vars !== "object") return out;
    Object.keys(vars).forEach((name) => {
      out = out.split(`{${name}}`).join(String(vars[name]));
    });
    return out;
  }

  function reliabilityLabel(code, lang) {
    const key = `wind_ui_reliability_${String(code || "").trim().toLowerCase()}`;
    const mapped = t(key, lang);
    if (mapped !== key) return mapped;
    return t("wind_ui_field_missing", lang);
  }

  function kiteStatusLabel(status, lang) {
    const map = {
      GO: "wind_ui_status_go",
      "NO GO": "wind_ui_status_no_go",
      BORDERLINE: "wind_ui_status_borderline"
    };
    const key = map[String(status || "").trim().toUpperCase()];
    return key ? t(key, lang) : t("wind_ui_field_missing", lang);
  }

  function kiteScoreLine(score, status, lang) {
    return formatTemplate("wind_ui_kite_score_line", lang, {
      score: String(score),
      status: kiteStatusLabel(status, lang)
    });
  }

  function windKnLabel(knots, lang) {
    if (typeof knots !== "number" || Number.isNaN(knots)) {
      return t("wind_ui_forecast_missing", lang);
    }
    return formatTemplate("wind_ui_wind_knots", lang, { value: String(Math.round(knots * 10) / 10) });
  }

  global.VentoLiveI18nV1 = Object.freeze({
    DEFAULT_LANG,
    SUPPORTED,
    t,
    formatTemplate,
    reliabilityLabel,
    kiteStatusLabel,
    kiteScoreLine,
    windKnLabel
  });

  global.ventoLiveT = t;
})(typeof window !== "undefined" ? window : globalThis);
