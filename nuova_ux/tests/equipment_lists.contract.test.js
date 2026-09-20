"use strict";

/**
 * NUOVA_UX — fetta liste attrezzo: hold oggi, stesso buco MOCK_DATA quando ready.
 * Run: node nuova_ux/tests/equipment_lists.contract.test.js
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

function main() {
  const labIndex = readText("nuova_ux/index.html");
  const prodIndex = readText("index.html");
  const sliceSrc = readText("nuova_ux/connectors/equipment_face_slice_v1.js");
  const listsSrc = readText("nuova_ux/connectors/equipment_lists_v1.js");
  const w2Src = readText("nuova_ux/w2/w2.js");

  assert(labIndex.indexOf("equipment_face_slice_v1.js") !== -1, "lab loads the empty slice");
  assert(labIndex.indexOf("equipment_lists_v1.js") !== -1, "lab loads the list hole");
  assert(prodIndex.indexOf("equipment_face_slice_v1.js") !== -1, "live face loads the empty slice");
  assert(prodIndex.indexOf("equipment_lists_v1.js") !== -1, "live face loads the list hole");
  assert(
    labIndex.indexOf("static_data.js") < labIndex.indexOf("equipment_face_slice_v1.js") &&
      labIndex.indexOf("equipment_face_slice_v1.js") < labIndex.indexOf("equipment_lists_v1.js") &&
      labIndex.indexOf("equipment_lists_v1.js") < labIndex.indexOf("w2/w2.js"),
    "static_data → slice → apply → W2"
  );
  assert(sliceSrc.indexOf("FakeBrand") === -1, "slice must not ship test brands");
  assert(listsSrc.indexOf("fetch(") === -1, "list hole must not fetch");
  assert(listsSrc.indexOf("ux_equipment_registry") === -1, "list hole is not Registry");
  assert(listsSrc.indexOf("collector.db") === -1, "list hole is not L3");
  assert(w2Src.indexOf("MOCK_DATA") !== -1, "W2 still reads the same list hole");
  assert(w2Src.indexOf("brand_id") === -1, "W2 must not send catalog ids");

  const sliceReady = /ready:\s*true/.test(sliceSrc) || /"ready":\s*true/.test(sliceSrc);
  if (!sliceReady) {
    assert(sliceSrc.indexOf("ready: false") !== -1, "slice stays off until Anora is done");
  } else {
    assert(sliceSrc.indexOf("BRAND_LIST") !== -1, "ready slice lists brands");
    assert(sliceSrc.indexOf("fetch(") === -1, "ready slice must not fetch");
  }

  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "https://ventolive.com/nuova_ux/"
  });
  const { window } = dom;
  runScript(window, "ui-lab/mock-ui/static_data.js");
  const before = (window.MOCK_DATA.BRAND_LIST || []).slice();
  assert(before.indexOf("Airush") !== -1, "static_data still has Airush");
  runScript(window, "nuova_ux/connectors/equipment_face_slice_v1.js");
  runScript(window, "nuova_ux/connectors/equipment_lists_v1.js");
  const lists = window.NuovaUxEquipmentListsV1;
  assert(lists && lists.lastApply, "list hole reports apply result");
  if (!sliceReady) {
    assert(lists.lastApply.applied === false, "hold does not rewrite lists");
    assert(window.MOCK_DATA.BRAND_LIST.join("\n") === before.join("\n"), "rider lists unchanged while hold");
  } else {
    assert(lists.lastApply.applied === true, "Anora slice replaces gear lists");
    assert((window.MOCK_DATA.BRAND_LIST || []).length > 0, "ready slice brands appear");
    assert(window.MOCK_DATA.BRAND_LIST.indexOf("Other") === -1, "Other is not a brand");
  }

  window.NuovaUxEquipmentFaceSliceV1 = {
    schema: "nuova_ux_equipment_face_slice_v1",
    ready: true,
    BRAND_LIST: [],
    MODELS_BY_BRAND: { BRAND_ESEMPIO: ["MODELLO_ESEMPIO"] },
    BOARD_SIZE_BY_TYPE: { twintip: ["136x41"] }
  };
  const empty = lists.applyOntoMock(window);
  assert(empty.applied === false && empty.reason === "empty", "ready with no brands keeps static_data");
  assert(window.MOCK_DATA.BRAND_LIST.indexOf("Airush") !== -1, "empty ready must not wipe Airush");

  window.NuovaUxEquipmentFaceSliceV1 = {
    schema: "nuova_ux_equipment_face_slice_v1",
    ready: true,
    BRAND_LIST: ["BRAND_ESEMPIO", "Other", "__brand_other__"],
    MODELS_BY_BRAND: { BRAND_ESEMPIO: ["MODELLO_ESEMPIO"] },
    BOARD_SIZE_BY_TYPE: { twintip: ["136x41"], directional: ["nope"] }
  };
  const on = lists.applyOntoMock(window);
  assert(on.applied === true, "full slice replaces gear lists");
  assert(window.MOCK_DATA.BRAND_LIST.indexOf("BRAND_ESEMPIO") !== -1, "new brand appears");
  assert(window.MOCK_DATA.BRAND_LIST.indexOf("Other") === -1, "Other is not a brand");
  assert(window.MOCK_DATA.MODELS_BY_BRAND.BRAND_ESEMPIO.indexOf("MODELLO_ESEMPIO") !== -1, "model follows brand");
  assert(window.MOCK_DATA.BOARD_SIZE_BY_TYPE.twintip.indexOf("136x41") !== -1, "twintip sizes from slice");
  assert(window.MOCK_DATA.BOARD_SIZE_BY_TYPE.directional == null, "unknown board type is dropped");
  assert(window.MOCK_DATA.CANONICAL_VALUES.board.twintip, "session enums stay on MOCK_DATA");

  console.log("NUOVA_UX_EQUIPMENT_LISTS_OK");
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
