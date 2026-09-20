/**
 * SERVER CONTRACT SCHEMA LOCK V1 — passive UI + ZERO DRIFT HARD GATE.
 * Rejects any non-lock contract; never parses engine raw fields.
 */
(function initServerContractPassiveV1(global) {
  "use strict";

  const CONTRACT_VERSION = "server_contract_schema_lock_v1";
  const ENGINE_PRODUCT_KEY = "WIND DECISION OUTPUT V1";

  const REQUIRED_DISPLAY_KEYS = [
    "wind",
    "gust",
    "direction",
    "wind_name",
    "kite_decision",
    "reliability",
    "spot",
    "updated_at",
    "forecast_1h",
    "forecast_2h",
    "forecast_3h"
  ];

  const ENGINE_LEAK_KEYS = [
    ENGINE_PRODUCT_KEY,
    "wind_knots",
    "wind_kt",
    "wind_direction",
    "gust_knots",
    "guardrails",
    "trust_enrichment_v1"
  ];

  function hasEngineLeak(payload) {
    if (!payload || typeof payload !== "object") return true;
    for (let i = 0; i < ENGINE_LEAK_KEYS.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(payload, ENGINE_LEAK_KEYS[i])) return true;
    }
    return false;
  }

  function validateDisplayShape(display) {
    if (!display || typeof display !== "object") return false;
    for (let i = 0; i < REQUIRED_DISPLAY_KEYS.length; i += 1) {
      const key = REQUIRED_DISPLAY_KEYS[i];
      const field = display[key];
      if (!field || typeof field !== "object") return false;
      if (typeof field.text !== "string") return false;
      if (!field.state) return false;
    }
    return true;
  }

  function isLockContract(payload) {
    return Boolean(
      payload &&
      typeof payload === "object" &&
      payload.contract_version === CONTRACT_VERSION &&
      !hasEngineLeak(payload) &&
      validateDisplayShape(payload.display)
    );
  }

  function blockedPayload() {
    return {
      contract_version: CONTRACT_VERSION,
      data_state: "error",
      display: null,
      hard_blocked: true
    };
  }

  function idlePayload() {
    return {
      contract_version: CONTRACT_VERSION,
      data_state: "idle",
      display: null,
      hard_blocked: false
    };
  }

  function fetchingPayload() {
    return {
      contract_version: CONTRACT_VERSION,
      data_state: "fetching",
      display: null,
      hard_blocked: false
    };
  }

  function errorPayload() {
    return blockedPayload();
  }

  /**
   * ZERO DRIFT UI HARD GATE — stop render if contract is not lock v1.
   * @returns {{ allowed: boolean, blocked: boolean, view: object }}
   */
  function hardGate(payload) {
    if (payload && payload.loading === true) {
      return { allowed: false, blocked: false, view: fetchingPayload() };
    }
    if (payload && payload.contract_version === CONTRACT_VERSION && payload.data_state === "idle") {
      return { allowed: true, blocked: false, view: idlePayload() };
    }
    if (!isLockContract(payload)) {
      return { allowed: false, blocked: true, view: blockedPayload() };
    }
    return {
      allowed: true,
      blocked: false,
      view: {
        contract_version: CONTRACT_VERSION,
        data_state: payload.data_state || "error",
        display: payload.display,
        hard_blocked: false
      }
    };
  }

  function acceptPayload(payload) {
    const gate = hardGate(payload);
    return {
      valid: gate.allowed && !gate.blocked && (payload.data_state === "full" || payload.data_state === "partial"),
      blocked: gate.blocked,
      view: gate.view
    };
  }

  function hasUsableWindData(payload) {
    if (!isLockContract(payload)) return false;
    return payload.data_state === "full" || payload.data_state === "partial";
  }

  global.ServerContractPassiveV1 = Object.freeze({
    CONTRACT_VERSION,
    REQUIRED_DISPLAY_KEYS,
    hasEngineLeak,
    validateDisplayShape,
    isLockContract,
    hardGate,
    idlePayload,
    fetchingPayload,
    errorPayload,
    blockedPayload,
    acceptPayload,
    hasUsableWindData
  });
})(typeof window !== "undefined" ? window : globalThis);
