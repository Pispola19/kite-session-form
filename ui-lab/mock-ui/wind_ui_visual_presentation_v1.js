/**
 * WIND UI VISUAL PRESENTATION V1 — display.* → arrows, layout, anemometer line.
 * No meteo logic, no API/engine fields; presentation only.
 */
(function initWindUIVisualPresentationV1(global) {
  "use strict";

  const VIEW_MODE = Object.freeze({ KITE: "kite", METEO: "meteo" });

  const DIR_ABBR_16 = Object.freeze([
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  ]);

  const DIR_ARROW_16 = Object.freeze([
    "↑", "↗", "↗", "→", "→", "↘", "↘", "↓",
    "↓", "↙", "↙", "←", "←", "↖", "↖", "↑"
  ]);

  const DIR_DEG_BY_ABBR = Object.freeze({
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5
  });

  function fieldText(field) {
    if (field == null) return "";
    if (typeof field === "string") return field.trim();
    if (typeof field !== "object") return "";
    return field.text == null ? "" : String(field.text).trim();
  }

  function parseDirectionAbbr(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    const degAbbr = raw.match(/(\d+(?:\.\d+)?)\s*°?\s*([A-Z]{1,3})\b/i);
    if (degAbbr) return degAbbr[2].toUpperCase();
    const letters = raw.toUpperCase().replace(/[^A-Z]/g, "");
    if (letters && Object.prototype.hasOwnProperty.call(DIR_DEG_BY_ABBR, letters)) {
      return letters;
    }
    return null;
  }

  function abbrToDeg(abbr) {
    if (!abbr) return null;
    const key = String(abbr).toUpperCase();
    return Object.prototype.hasOwnProperty.call(DIR_DEG_BY_ABBR, key) ? DIR_DEG_BY_ABBR[key] : null;
  }

  function presentationFromAbbr(abbr) {
    const deg = abbrToDeg(abbr);
    if (deg == null) return null;
    const idx = Math.round(deg / 22.5) % 16;
    return { arrow: DIR_ARROW_16[idx], abbr: DIR_ABBR_16[idx], idx, deg };
  }

  function displayDirectionContext(display) {
    const label = fieldText(display && display.direction);
    const nameLabel = fieldText(display && display.wind_name);
    const abbr = parseDirectionAbbr(label) || parseDirectionAbbr(nameLabel);
    return presentationFromAbbr(abbr);
  }

  function translateWindName(idx, lang, fallbackAbbr) {
    const T = global.RDK_TRANSLATIONS;
    const pack = T && (T[lang] || T.en || T.it);
    const key = `live_spot_mock_wind_name_${idx}`;
    if (pack && pack[key]) return String(pack[key]).trim();
    return fallbackAbbr || "—";
  }

  function formatDirectionForView(display, viewMode, lang) {
    const ctx = displayDirectionContext(display);
    if (!ctx) return "—";
    if (normalizeViewMode(viewMode) === VIEW_MODE.KITE) {
      const downDeg = (ctx.deg + 180) % 360;
      const downIdx = Math.round(downDeg / 22.5) % 16;
      return DIR_ARROW_16[downIdx];
    }
    const degText = Number.isInteger(ctx.deg) ? String(ctx.deg) : String(Number(ctx.deg.toFixed(1)));
    return `${degText}° ${ctx.abbr}`;
  }

  function formatWindNameForView(display, lang) {
    const ctx = displayDirectionContext(display);
    if (!ctx) {
      const raw = fieldText(display && display.wind_name);
      return raw || "";
    }
    return translateWindName(ctx.idx, lang, ctx.abbr);
  }

  function formatAnemometerLine(display, lang) {
    const ctx = displayDirectionContext(display);
    const wind = fieldText(display && display.wind);
    const gust = fieldText(display && display.gust);
    if (!ctx && !wind && !gust) return "—";
    const dirPart = ctx
      ? `${Number.isInteger(ctx.deg) ? ctx.deg : Number(ctx.deg.toFixed(1))}° ${ctx.abbr}`
      : fieldText(display && display.direction) || "—";
    const parts = [];
    if (dirPart) parts.push(`Dir ${dirPart}`);
    if (wind) parts.push(`Vel ${wind}`);
    if (gust) parts.push(`Raff ${gust}`);
    return parts.length ? parts.join(" · ") : "—";
  }

  function normalizeViewMode(mode) {
    return mode === VIEW_MODE.METEO ? VIEW_MODE.METEO : VIEW_MODE.KITE;
  }

  function applyDirectionVisual(el, text, viewMode) {
    if (!el) return;
    el.textContent = text == null ? "" : String(text);
    const isKite = normalizeViewMode(viewMode) === VIEW_MODE.KITE;
    el.classList.toggle("wind-dir-arrow", isKite && Boolean(text && text.length <= 2));
    el.classList.toggle("wind-dir-meteo", !isKite);
  }

  global.WindUIVisualPresentationV1 = Object.freeze({
    VIEW_MODE,
    fieldText,
    parseDirectionAbbr,
    displayDirectionContext,
    formatDirectionForView,
    formatWindNameForView,
    formatAnemometerLine,
    applyDirectionVisual,
    normalizeViewMode
  });
})(typeof window !== "undefined" ? window : globalThis);
