/**
 * TIME + UX STABILITY V1 — timezone unico Europe/Rome per tutta la UI vento.
 * Frontend only. Input API = ISO UTC; output = ora Italia (mai UTC in UI).
 */
(function initTimeUI(global) {
  "use strict";

  const UI_TIMEZONE = "Europe/Rome";
  const UI_LOCALE = "it-IT";

  const romeClockFormatter = new Intl.DateTimeFormat(UI_LOCALE, {
    timeZone: UI_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  function parseUtcInstant(timestamp) {
    if (timestamp == null || timestamp === "") return null;
    const raw = String(timestamp).trim();
    if (!raw) return null;

    const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw);
    const normalized = hasZone ? raw : `${raw}Z`;
    const ms = Date.parse(normalized);
    if (Number.isNaN(ms)) return null;
    return new Date(ms);
  }

  /**
   * @param {string} timestamp — ISO UTC dal backend (updated_at, generated_at, …)
   * @returns {string} es. "04:34" in Europe/Rome, oppure "" se invalido
   */
  function normalizeTimeToUI(timestamp) {
    const instant = parseUtcInstant(timestamp);
    if (!instant) return "";

    const parts = romeClockFormatter.formatToParts(instant);
    let hour = "";
    let minute = "";
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part.type === "hour") hour = part.value;
      if (part.type === "minute") minute = part.value;
    }
    if (!hour || !minute) {
      const fallback = romeClockFormatter.format(instant);
      const m = fallback.match(/(\d{1,2}):(\d{2})/);
      if (!m) return "";
      hour = m[1].padStart(2, "0");
      minute = m[2];
    }
    return `${hour.padStart(2, "0")}:${minute}`;
  }

  /**
   * Primo timestamp disponibile da payload API / view model.
   * @param {object} payload
   * @returns {string}
   */
  function pickApiTimestamp(payload) {
    const p = payload && typeof payload === "object" ? payload : {};
    if (typeof p.updated_at === "string" && p.updated_at.trim()) return p.updated_at.trim();
    if (typeof p.generated_at === "string" && p.generated_at.trim()) return p.generated_at.trim();
    const raw = p._raw_v1;
    if (raw && typeof raw.updated_at === "string" && raw.updated_at.trim()) return raw.updated_at.trim();
    return "";
  }

  global.TimeUILayerV1 = Object.freeze({
    UI_TIMEZONE,
    UI_LOCALE,
    normalizeTimeToUI,
    pickApiTimestamp,
    parseUtcInstant
  });

  global.normalizeTimeToUI = normalizeTimeToUI;
})(typeof window !== "undefined" ? window : globalThis);
