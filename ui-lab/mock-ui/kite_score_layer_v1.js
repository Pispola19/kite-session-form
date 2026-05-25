/**
 * SIERRA — NOT IN PRODUCTION LOCK V1 CHAIN.
 * KITE SCORE LAYER V1 — UX only. Traduce WIND DECISION OUTPUT V1 in score 0–100.
 * Non modifica backend, engine, contract V1 né decisioni API.
 */
(function initKiteScoreLayer(global) {
  "use strict";

  const PRODUCT_KEY = "WIND DECISION OUTPUT V1";

  function isNumber(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function clamp(min, max, value) {
    return Math.min(max, Math.max(min, value));
  }

  function statusFromScore(score) {
    if (score <= 39) return "NO GO";
    if (score <= 69) return "BORDERLINE";
    return "GO";
  }

  /**
   * @param {object} payload — risposta API (con WIND DECISION OUTPUT V1) o view model parseato
   * @returns {{ kite_score: number, kite_status: string }}
   */
  function computeKiteScore(payload) {
    if (!payload || typeof payload !== "object") {
      return { kite_score: 0, kite_status: "NO GO" };
    }

    const product =
      payload[PRODUCT_KEY] && typeof payload[PRODUCT_KEY] === "object"
        ? payload[PRODUCT_KEY]
        : payload;

    let windNow = product["WIND NOW (knots)"];
    if (!isNumber(windNow)) windNow = payload.wind_knots;
    if (!isNumber(windNow)) windNow = 0;

    let reliability = product.RELIABILITY;
    if (typeof reliability !== "string") reliability = payload.reliability;
    const rel = typeof reliability === "string" ? reliability.trim().toUpperCase() : "";

    let score = Number(windNow) * 6;
    if (rel === "HIGH") score += 10;
    else if (rel === "LOW") score -= 10;

    score = clamp(0, 100, score);
    const kite_score = Math.round(score);
    const kite_status = statusFromScore(kite_score);

    return { kite_score, kite_status };
  }

  function formatKiteScoreLine(payload, loading) {
    if (loading) return "aggiornamento in corso";
    const { kite_score, kite_status } = computeKiteScore(payload);
    return `KITE SCORE: ${kite_score} / 100 · STATUS: ${kite_status}`;
  }

  global.KiteScoreLayerV1 = Object.freeze({
    computeKiteScore,
    formatKiteScoreLine,
    statusFromScore
  });

  global.computeKiteScore = computeKiteScore;
})(typeof window !== "undefined" ? window : globalThis);
