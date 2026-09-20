/**
 * Live Spot geo candidates — /spot/candidates (outside PRODUCTION LOCK wind contract).
 */
(function initLiveSpotCandidatesAdapterV1(global) {
  "use strict";

  function formatCandidateLabel(candidate, fallback) {
    if (!candidate || typeof candidate !== "object") {
      return fallback || "";
    }
    const label = candidate.label != null ? String(candidate.label).trim() : "";
    if (label) return label;
    const name = candidate.name != null ? String(candidate.name).trim() : "";
    const country = candidate.country != null ? String(candidate.country).trim() : "";
    const admin1 = candidate.admin1 != null ? String(candidate.admin1).trim() : "";
    if (name && country) return name + " (" + country + ")";
    if (name && admin1) return name + " (" + admin1 + ")";
    return name || fallback || "";
  }

  function hasCandidateCoordinates(candidate) {
    if (!candidate || typeof candidate !== "object") return false;
    const lat = candidate.lat;
    const lon = candidate.lon;
    if (lat == null || lon == null) return false;
    const latN = Number(lat);
    const lonN = Number(lon);
    return Number.isFinite(latN) && Number.isFinite(lonN);
  }

  function needsChooser(payload) {
    if (!payload || typeof payload !== "object") return false;
    const list = Array.isArray(payload.candidates) ? payload.candidates : [];
    const withCoords = list.filter(hasCandidateCoordinates);
    if (withCoords.length <= 1) return false;
    if (payload.needs_disambiguation === true) return true;
    return withCoords.length > 1;
  }

  function singleCandidate(payload) {
    if (!payload || !Array.isArray(payload.candidates) || payload.candidates.length !== 1) {
      return null;
    }
    const only = payload.candidates[0];
    return hasCandidateCoordinates(only) ? only : null;
  }

  async function fetchCandidates(query, timeoutMs) {
    const q = query != null ? String(query).trim() : "";
    if (!q) return null;

    const routing = global.VENTOLIVE_ROUTING_V1;
    let url =
      routing && typeof routing.canonicalSpotCandidatesUrl === "function"
        ? routing.canonicalSpotCandidatesUrl(q)
        : "https://api.ventolive.com/spot/candidates?q=" + encodeURIComponent(q);

    if (routing && typeof routing.coerceCanonicalUrl === "function") {
      url = routing.coerceCanonicalUrl(url);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs || 5000);
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const body = await res.json();
      if (!body || typeof body !== "object") return null;
      if (body.ok === false) return null;
      return body;
    } catch (_err) {
      return null;
    }
  }

  global.LiveSpotCandidatesAdapterV1 = Object.freeze({
    fetchCandidates,
    needsChooser,
    singleCandidate,
    formatCandidateLabel,
    hasCandidateCoordinates
  });
})(typeof window !== "undefined" ? window : globalThis);
