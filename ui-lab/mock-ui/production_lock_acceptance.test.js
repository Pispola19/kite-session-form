"use strict";

/**
 * PRODUCTION LOCK V1 — acceptance (UI passive + hard gate).
 * Run: node ui-lab/mock-ui/production_lock_acceptance.test.js
 */
const fs = require("node:fs");
const path = require("node:path");

let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch (_) {
  console.error("Missing jsdom. Run: npm install");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "../..");
const LOCK = "server_contract_schema_lock_v1";
const ENGINE_LEAK = [
  "WIND DECISION OUTPUT V1",
  "wind_knots",
  "wind_kt",
  "wind_direction",
  "gust_knots",
  "guardrails",
  "trust_enrichment_v1"
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function readText(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function runScript(window, rel) {
  const code = readText(rel);
  const fn = new Function("window", "globalThis", `${code}\n//# sourceURL=${rel}`);
  fn(window, window);
}

function loadProductionChain(window) {
  window.RDK_TRANSLATIONS = { en: {}, it: {}, de: {}, es: {}, fr: {}, pl: {} };
  runScript(window, "ui-lab/mock-ui/ventolive_i18n_v1.js");
  runScript(window, "ui-lab/mock-ui/server_contract_passive_v1.js");
  runScript(window, "ui-lab/mock-ui/wind_ui_visual_presentation_v1.js");
  runScript(window, "ui-lab/mock-ui/wind_ui_single_writer_v1.js");
}

function main() {
  const indexHtml = readText("index.html");
  assert(!indexHtml.includes("resolve_wind_contract_v1.js"), "resolve must not be in production index");
  assert(!indexHtml.includes("single_truth_display_v1.js"), "single_truth must not be in production index");
  assert(!indexHtml.includes("time_ui_v1.js"), "time_ui wind must not be in production index");
  assert(indexHtml.includes("server_contract_passive_v1.js"), "passive gate required in index");
  assert(indexHtml.includes("wind_ui_visual_presentation_v1.js"), "visual presentation required in index");
  assert(indexHtml.includes("wind_ui_single_writer_v1.js"), "single writer required in index");

  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://ventolive.com/" });
  const { window } = dom;
  loadProductionChain(window);

  const passive = window.ServerContractPassiveV1;
  assert(passive, "ServerContractPassiveV1 must load");

  const legacyEngine = {
    "WIND DECISION OUTPUT V1": { "WIND NOW (knots)": 42, "KITE DECISION": "GO", RELIABILITY: "HIGH" }
  };
  const gateLegacy = passive.hardGate(legacyEngine);
  assert(gateLegacy.blocked === true, "engine envelope must hard-block");

  const lockPayload = {
    contract_version: LOCK,
    data_state: "full",
    display: {
      wind: { state: "present", text: "9.4 kn" },
      gust: { state: "present", text: "11.1 kn" },
      direction: { state: "present", text: "W" },
      wind_name: { state: "present", text: "W" },
      kite_decision: { state: "present", text: "NO GO" },
      reliability: { state: "present", text: "HIGH" },
      spot: { state: "present", text: "Is Solinas" },
      updated_at: { state: "present", text: "20:29" },
      forecast_1h: { state: "present", text: "1.8 kn" },
      forecast_2h: { state: "present", text: "2.3 kn" },
      forecast_3h: { state: "present", text: "0.5 kn" }
    }
  };
  const gateOk = passive.hardGate(lockPayload);
  assert(gateOk.allowed === true && gateOk.blocked === false, "lock contract must pass hard gate");

  const panel = window.document.createElement("section");
  panel.className = "cockpit-grid";
  panel.innerHTML = `
    <article class="info-card status-ok">
      <dd data-live-spot-dd="wind"></dd>
      <dd data-live-spot-dd="direction"></dd>
      <dd data-live-spot-dd="anemometer"></dd>
    </article>
    <article class="info-card status-search">
      <dd data-live-spot-dd="overview_confidence"></dd>
    </article>
    <div class="hours">
      <div data-live-spot-fc="1"><strong></strong></div>
    </div>
  `;
  window.renderWindUI(panel, lockPayload, { lang: "en", viewMode: "kite" });
  const windDd = panel.querySelector('[data-live-spot-dd="wind"]');
  const dirDd = panel.querySelector('[data-live-spot-dd="direction"]');
  const anemDd = panel.querySelector('[data-live-spot-dd="anemometer"]');
  assert(windDd.textContent === "9.4 kn", "UI must render display.wind only");
  assert(windDd.textContent.indexOf("42") === -1, "UI must not parse engine wind");
  assert(dirDd.classList.contains("wind-dir-arrow"), "kite view must render direction arrow");
  assert(dirDd.textContent === "→", "W downwind arrow for kite view");
  assert(anemDd.textContent.includes("Dir"), "anemometer line must use display fields");
  assert(anemDd.textContent.includes("9.4 kn"), "anemometer must include display wind");
  assert(anemDd.textContent.indexOf("NO GO") === -1, "kite_decision must not replace anemometer line");

  for (let i = 0; i < ENGINE_LEAK.length; i += 1) {
    assert(!Object.prototype.hasOwnProperty.call(lockPayload, ENGINE_LEAK[i]), "lock payload must not leak engine keys");
  }

  console.log("PRODUCTION_LOCK_ACCEPTANCE_OK");
  console.log(JSON.stringify({ ok: true, contract: LOCK, checks: ["index_chain", "hard_gate", "passive_render"] }, null, 2));
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
