/**
 * USER INTENT GATE V1 — nessun fetch/render vento senza intenzione utente.
 */
(function initUserIntentGate(global) {
  "use strict";

  /**
   * @param {{ spot?: string|null, intentActive?: boolean }} state
   */
  function hasUserIntent(state) {
    if (!state || typeof state !== "object") return false;
    if (!state.intentActive) return false;
    const spot = state.spot != null ? String(state.spot).trim() : "";
    return spot.length > 0;
  }

  function idleViewModel(lang) {
    const i18n = global.VentoLiveI18nV1;
    const tt = i18n && typeof i18n.t === "function" ? (k) => i18n.t(k, lang) : (k) => k;
    const missing = tt("wind_ui_field_missing");
    return {
      contract: "wind_decision_output_v1",
      uiRenderState: "idle",
      loading: false,
      ok: false,
      spot: "",
      cache: "ui_idle",
      windDisplay: missing,
      gustDisplay: missing,
      windNameDisplay: missing,
      directionDisplay: missing,
      reliabilityDisplay: missing,
      updatedAtDisplay: missing,
      kiteScoreLine: missing,
      trend1: { wind: missing, direction: missing, name: missing },
      trend2: { wind: missing, direction: missing, name: missing },
      trend3: { wind: missing, direction: missing, name: missing }
    };
  }

  global.UserIntentGateV1 = Object.freeze({
    hasUserIntent,
    idleViewModel
  });
})(typeof window !== "undefined" ? window : globalThis);
