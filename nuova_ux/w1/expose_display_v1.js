/**
 * NUOVA_UX — espone display.* così come arriva da A. Non calcola, non copia NOW sul forecast.
 */
(function initNuovaUxExposeDisplay(global) {
  "use strict";

  function fieldText(field) {
    if (field == null) return "";
    if (typeof field === "string") return field;
    if (typeof field !== "object") return "";
    return field.text == null ? "" : String(field.text);
  }

  function nestedText(parent, key) {
    if (!parent || typeof parent !== "object") return "";
    return fieldText(parent[key]);
  }

  /**
   * @param {object|null} display lock display
   * @returns {object|null}
   */
  function exposeWindDisplay(display) {
    if (!display || typeof display !== "object") return null;
    const fc1 = display.forecast_1h;
    const fc2 = display.forecast_2h;
    const fc3 = display.forecast_3h;
    return {
      spot: fieldText(display.spot),
      reliability: fieldText(display.reliability),
      updated_at: fieldText(display.updated_at),
      kite_decision: fieldText(display.kite_decision),
      now: {
        wind: fieldText(display.wind),
        gust: fieldText(display.gust),
        direction: fieldText(display.direction),
        wind_name: fieldText(display.wind_name)
      },
      forecast: {
        h1: {
          wind: fieldText(fc1),
          gust: nestedText(fc1, "gust"),
          direction: nestedText(fc1, "direction")
        },
        h2: {
          wind: fieldText(fc2),
          gust: nestedText(fc2, "gust"),
          direction: nestedText(fc2, "direction")
        },
        h3: {
          wind: fieldText(fc3),
          gust: nestedText(fc3, "gust"),
          direction: nestedText(fc3, "direction")
        }
      }
    };
  }

  global.NuovaUxExposeDisplayV1 = Object.freeze({
    fieldText,
    exposeWindDisplay
  });
})(typeof window !== "undefined" ? window : globalThis);
