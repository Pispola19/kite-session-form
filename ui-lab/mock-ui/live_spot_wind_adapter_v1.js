/**
 * Live Spot fetch adapter — delega al Universal Contract V1.
 * Nessun parse parallelo, nessun legacy.
 */
(function initWindDecisionV1Adapter(global) {
  "use strict";

  const contract = global.WindContractV1;
  const PRODUCT_KEY = contract ? contract.PRODUCT_KEY : "WIND DECISION OUTPUT V1";
  const WIND_LATEST_URL = "https://api.ventolive.com/wind/latest";

  function resolve(payload) {
    if (contract && typeof contract.resolveWindContractV1 === "function") {
      return contract.resolveWindContractV1(payload);
    }
    return {
      valid: false,
      state: "invalid",
      productKey: null,
      model: { contract: "wind_decision_output_v1", loading: true, cache: "ui_loading" },
      legacyRejected: false
    };
  }

  async function parseWindLatestResponse(response) {
    let body = null;
    try {
      body = await response.json();
    } catch (_e) {
      return null;
    }
    if (body && body.needs_disambiguation) return body;
    if (contract && typeof contract.hasWindDecisionV1 === "function" && contract.hasWindDecisionV1(body)) {
      return body;
    }
    const resolved = resolve(body);
    return resolved.valid || resolved.hasAnyWindData ? body : null;
  }

  function normalizeLiveSpotPayload(data) {
    return resolve(data).model;
  }

  function hasUsableLiveSpotData(data) {
    if (data && data.needs_disambiguation) return true;
    const r = resolve(data);
    return Boolean(r.valid || r.hasAnyWindData);
  }

  function loadingPlaceholder() {
    return contract && typeof contract.loadingModel === "function"
      ? contract.loadingModel()
      : { contract: "wind_decision_output_v1", loading: true, cache: "ui_loading" };
  }

  global.LiveSpotWindAdapterV1 = Object.freeze({
    WIND_LATEST_URL,
    PRODUCT_KEY,
    hasWindDecisionV1: contract ? contract.hasWindDecisionV1 : () => false,
    hasUsableLiveSpotData,
    parseWindLatestResponse,
    normalizeLiveSpotPayload,
    loadingPlaceholder,
    resolveWindContractV1: resolve
  });

  global.WindDecisionV1Contract = global.LiveSpotWindAdapterV1;
})(typeof window !== "undefined" ? window : globalThis);
