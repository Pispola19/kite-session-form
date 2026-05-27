/**
 * VENTOLIVE ROUTING V1 — canonical public API URLs (frontend only).
 * ventolive.com must NEVER call local IP or apex /wind/latest.
 */
(function initVentoLiveRouting(global) {
  "use strict";

  const API_BASE = "https://api.ventolive.com";
  const WIND_LATEST_URL = API_BASE + "/wind/latest";
  const SPOT_CANDIDATES_URL = API_BASE + "/spot/candidates";

  const BLOCKED_HOST_PATTERNS = [
    /^https?:\/\/100\.108\.166\.103/i,
    /^https?:\/\/ventolive\.com\/wind\//i,
    /^http:\/\/127\.0\.0\.1/i,
    /^http:\/\/localhost/i
  ];

  function canonicalSpotCandidatesUrl(query) {
    const q = query != null ? String(query).trim() : "";
    if (!q) return SPOT_CANDIDATES_URL;
    return SPOT_CANDIDATES_URL + "?q=" + encodeURIComponent(q);
  }

  function canonicalWindLatestUrl(spot, queryExtra) {
    const q = spot != null && String(spot).trim() !== ""
      ? "?spot=" + encodeURIComponent(String(spot).trim())
      : "";
    let url = WIND_LATEST_URL + q;
    if (queryExtra && typeof queryExtra === "object") {
      const parts = [];
      if (queryExtra.lat != null) parts.push("lat=" + encodeURIComponent(String(queryExtra.lat)));
      if (queryExtra.lon != null) parts.push("lon=" + encodeURIComponent(String(queryExtra.lon)));
      if (parts.length) url += (q ? "&" : "?") + parts.join("&");
    }
    return url;
  }

  function coerceCanonicalUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return WIND_LATEST_URL;
    for (let i = 0; i < BLOCKED_HOST_PATTERNS.length; i += 1) {
      if (BLOCKED_HOST_PATTERNS[i].test(raw)) {
        try {
          const u = new URL(raw);
          return WIND_LATEST_URL + (u.search || "");
        } catch (_e) {
          return WIND_LATEST_URL;
        }
      }
    }
    if (/^https?:\/\/ventolive\.com\//i.test(raw) && !/^https?:\/\/api\.ventolive\.com/i.test(raw)) {
      return raw.replace(/^https?:\/\/ventolive\.com/i, API_BASE);
    }
    return raw;
  }

  /** Fetch failed: NO synthetic wind data — UI must show loading only. */
  function buildFetchFailSafeWindResponse(_spot) {
    return null;
  }

  const FETCH_DEFAULTS = Object.freeze({ cache: "no-store" });

  global.VENTOLIVE_ROUTING_V1 = Object.freeze({
    API_BASE,
    WIND_LATEST_URL,
    SPOT_CANDIDATES_URL,
    FETCH_DEFAULTS,
    canonicalSpotCandidatesUrl,
    canonicalWindLatestUrl,
    coerceCanonicalUrl,
    buildFetchFailSafeWindResponse
  });
})(typeof window !== "undefined" ? window : globalThis);
