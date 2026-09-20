/**
 * NUOVA_UX — Sheet = specchio di controllo dopo durable. Non è B. Se cade, B sopravvive.
 * Stesso webhook già in opera. Non parte da 127.0.0.1. Non parte sul mock.
 */
(function initNuovaUxSheetControl(global) {
  "use strict";

  const WEBHOOK_URL =
    "https://script.google.com/macros/s/AKfycbyBvRK58kLL13TwOPPNqyAmNn-eRb-lYKzHsfKr1OG0UAVzHzyhG1l2T_svP_it3IICag/exec";
  const TIMEOUT_MS = 25000;

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
    const doc = global.document;
    if (!doc || !doc.body) {
      return Promise.resolve({ ok: false, control: true, error: "no_document" });
    }
    return new Promise(function (resolve) {
      const targetName = "nuova-ux-sheet-" + Date.now();
      const iframe = doc.createElement("iframe");
      const postForm = doc.createElement("form");
      let settled = false;
      const settle = function (value) {
        if (settled) return;
        settled = true;
        try {
          postForm.remove();
        } catch (_e) {}
        try {
          iframe.remove();
        } catch (_e2) {}
        resolve(value);
      };
      const timer = global.setTimeout(function () {
        settle({ ok: false, control: true, error: "sheet_timeout" });
      }, TIMEOUT_MS);
      try {
        iframe.name = targetName;
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.display = "none";
        iframe.addEventListener("load", function () {
          global.clearTimeout(timer);
          settle({ ok: true, control: true, probable: true });
        });
        postForm.method = "POST";
        postForm.action = WEBHOOK_URL;
        postForm.target = targetName;
        postForm.style.display = "none";
        Object.keys(row).forEach(function (key) {
          const input = doc.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = row[key] == null ? "" : String(row[key]);
          postForm.appendChild(input);
        });
        doc.body.appendChild(iframe);
        doc.body.appendChild(postForm);
        postForm.submit();
      } catch (_err) {
        global.clearTimeout(timer);
        settle({ ok: false, control: true, error: "sheet_failed" });
      }
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
