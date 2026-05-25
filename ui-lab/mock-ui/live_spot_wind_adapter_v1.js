/**
 * Live Spot fetch adapter — SERVER CONTRACT SCHEMA LOCK V1 only.
 */
(function initLiveSpotWindAdapterV1(global) {
  "use strict";

  const passive = () => global.ServerContractPassiveV1;
  const WIND_LATEST_URL = "https://api.ventolive.com/wind/latest";

  async function parseWindLatestResponse(response) {
    let body = null;
    try {
      body = await response.json();
    } catch (_e) {
      return null;
    }
    const P = passive();
    if (P && typeof P.hardGate === "function") {
      const gate = P.hardGate(body);
      if (gate.allowed && !gate.blocked) return body;
      return null;
    }
    if (P && typeof P.isLockContract === "function" && P.isLockContract(body)) {
      return body;
    }
    return null;
  }

  function normalizeLiveSpotPayload(data) {
    const P = passive();
    if (P && typeof P.acceptPayload === "function") {
      return P.acceptPayload(data).view;
    }
    return data;
  }

  function hasUsableLiveSpotData(data) {
    const P = passive();
    if (P && typeof P.hasUsableWindData === "function") {
      return P.hasUsableWindData(data);
    }
    return false;
  }

  function loadingPlaceholder() {
    const P = passive();
    if (P && typeof P.fetchingPayload === "function") {
      return P.fetchingPayload();
    }
    return { contract_version: "server_contract_schema_lock_v1", data_state: "fetching", display: null };
  }

  global.LiveSpotWindAdapterV1 = Object.freeze({
    WIND_LATEST_URL,
    hasUsableLiveSpotData,
    parseWindLatestResponse,
    normalizeLiveSpotPayload,
    loadingPlaceholder
  });

  global.WindDecisionV1Contract = global.LiveSpotWindAdapterV1;
})(typeof window !== "undefined" ? window : globalThis);
