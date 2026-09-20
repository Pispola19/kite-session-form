/**
 * NUOVA_UX — prese dei moduli. Punto X = innesto.
 * A (Vento Live) innestata: W1 espone display.*.
 * B (trasporto) innestata in lab. Sheet e WhatsApp dopo durable; armati solo su ventolive.com.
 */
(function initNuovaUxPorts(global) {
  "use strict";

  global.NuovaUxPortsV1 = Object.freeze({
    POINT_X: "module_connection",
    wind: Object.freeze({
      id: "A",
      name: "VENTO_LIVE",
      plugged: true
    }),
    transport: Object.freeze({
      id: "B",
      name: "DAM_TRANSPORT",
      plugged: true
    }),
    sheet: Object.freeze({
      id: "control",
      name: "SHEET_CONTROL",
      plugged: true
    }),
    whatsapp: Object.freeze({
      id: "consent",
      name: "WHATSAPP_CONSENT",
      plugged: true
    })
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxPortsV1;
}
