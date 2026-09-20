/**
 * NUOVA_UX — Sheet = specchio di controllo dopo durable. Non è B. Se cade, B sopravvive.
 * Stesso webhook già in opera. Non parte da 127.0.0.1. Non parte sul mock.
 */
(function initNuovaUxSheetControl(global) {
  "use strict";

  const WEBHOOK_URL =
    "https://script.google.com/macros/s/AKfycbyBvRK58kLL13TwOPPNqyAmNn-eRb-lYKzHsfKr1OG0UAVzHzyhG1l2T_svP_it3IICag/exec";
  const TIMEOUT_MS = 8000;

  function ports() {
    return global.NuovaUxPortsV1 || {};
  }

  function plugged() {
    const sheet = ports().sheet;
    return !!(sheet && sheet.plugged);
  }

  function armed(loc) {
    const host = loc && loc.hostname ? String(loc.hostname) : "";
    return host === "ventolive.com" || host === "www.ventolive.com";
  }

  function skip(reason) {
    return { ok: true, skipped: true, control: true, reason: reason || "skipped" };
  }

  function toControlRow(legacy) {
    const lp = legacy && typeof legacy === "object" ? legacy : {};
    return {
      session_id: lp.session_id,
      technical_id: lp.technical_id,
      event_ts: lp.event_ts,
      src: lp.src,
      peso_kg: lp.weight,
      gender: lp.gender,
      tavola_tipo: lp.board,
      tavola_misura: lp.boardSize,
      livello: lp.level,
      kite_m2: lp.kite,
      marca: lp.brand,
      modello: lp.model,
      vento_kn: lp.wind,
      spot: lp.location,
      acqua: lp.water,
      risultato: lp.result,
      note: lp.note
    };
  }

  function postRow(row) {
    if (typeof global.fetch !== "function") {
      return Promise.resolve({ ok: false, control: true, error: "fetch_missing" });
    }
    const body = new URLSearchParams();
    Object.keys(row).forEach(function (key) {
      body.append(key, row[key] == null ? "" : String(row[key]));
    });
    const controller = typeof global.AbortController === "function" ? new global.AbortController() : null;
    const timer = global.setTimeout(function () {
      if (controller) controller.abort();
    }, TIMEOUT_MS);
    const opts = {
      method: "POST",
      mode: "no-cors",
      body: body,
      keepalive: true,
      cache: "no-store"
    };
    if (controller) opts.signal = controller.signal;
    return global
      .fetch(WEBHOOK_URL, opts)
      .then(function () {
        global.clearTimeout(timer);
        return { ok: true, control: true, opaque: true };
      })
      .catch(function () {
        global.clearTimeout(timer);
        return { ok: false, control: true, error: "sheet_failed" };
      });
  }

  function mirror(legacy, opts) {
    const options = opts || {};
    if (!plugged()) return Promise.resolve(skip("unplugged"));
    if (options.mock) return Promise.resolve(skip("mock"));
    if (!armed(options.location || global.location)) return Promise.resolve(skip("not_online"));
    return postRow(toControlRow(legacy)).catch(function () {
      return { ok: false, control: true, error: "sheet_failed" };
    });
  }

  function onDurable(ev) {
    const detail = ev && ev.detail ? ev.detail : {};
    Promise.resolve(mirror(detail.legacy, { mock: !!detail.mock, location: global.location })).catch(
      function () {
        return skip("sheet_failed");
      }
    );
  }

  function boot() {
    if (!global.document) return;
    global.document.addEventListener("nuova-ux-durable", onDurable);
  }

  global.NuovaUxSheetControlV1 = Object.freeze({
    WEBHOOK_URL,
    plugged,
    armed,
    toControlRow,
    mirror,
    skip
  });

  boot();
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxSheetControlV1;
}
