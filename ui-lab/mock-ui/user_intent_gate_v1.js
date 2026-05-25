/**
 * USER INTENT GATE V1 — nessun fetch/render vento senza intenzione utente.
 */
(function initUserIntentGate(global) {
  "use strict";

  function hasUserIntent(state) {
    if (!state || typeof state !== "object") return false;
    if (!state.intentActive) return false;
    const spot = state.spot != null ? String(state.spot).trim() : "";
    return spot.length > 0;
  }

  function idleViewModel(_lang) {
    const passive = global.ServerContractPassiveV1;
    if (passive && typeof passive.idlePayload === "function") {
      return passive.idlePayload();
    }
    return {
      contract_version: "server_contract_schema_lock_v1",
      data_state: "idle",
      display: null
    };
  }

  global.UserIntentGateV1 = Object.freeze({
    hasUserIntent,
    idleViewModel
  });
})(typeof window !== "undefined" ? window : globalThis);
