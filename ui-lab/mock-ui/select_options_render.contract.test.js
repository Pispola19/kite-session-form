"use strict";

const fs = require("node:fs");
const path = require("node:path");

let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch (_) {
  console.error("Missing dependency: jsdom. Run npm install before npm run test:ui-contract.");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "../..");
const mockUiDir = path.join(repoRoot, "ui-lab/mock-ui");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function runScript(window, relativePath) {
  const scriptPath = path.join(repoRoot, relativePath);
  window.eval(readText(scriptPath) + "\n//# sourceURL=" + scriptPath);
}

function field(document, pathName) {
  const el = document.querySelector(`[data-state-field="${pathName}"]`);
  assert(el, `Missing field: ${pathName}`);
  return el;
}

function optionValues(selectEl) {
  return Array.from(selectEl.options).map((option) => option.value);
}

function setValue(window, selectEl, value) {
  selectEl.value = value;
  selectEl.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function pickBrandPair(data) {
  const brands = data.BRAND_LIST || [];
  const modelsByBrand = data.MODELS_BY_BRAND || {};
  const fromBrand = brands.find((brand) => (modelsByBrand[brand] || []).length > 0);
  assert(fromBrand, "No brand with models found");
  const selectedModel = modelsByBrand[fromBrand][0];
  const toBrand = brands.find((brand) => brand !== fromBrand && !(modelsByBrand[brand] || []).includes(selectedModel));
  assert(toBrand, "No incompatible brand found for selected model");
  return { fromBrand, toBrand, selectedModel };
}

function pickBoardPair(data) {
  const sizesByType = data.BOARD_SIZE_BY_TYPE || {};
  const fromType = Object.keys(sizesByType).find((type) => (sizesByType[type] || []).length > 0);
  assert(fromType, "No board type with sizes found");
  const selectedSize = sizesByType[fromType][0];
  const toType = Object.keys(sizesByType).find((type) => type !== fromType && !(sizesByType[type] || []).includes(selectedSize));
  assert(toType, "No incompatible board type found for selected size");
  return { fromType, toType, selectedSize };
}

function createHarness() {
  const html = readText(path.join(mockUiDir, "index.html"));
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1/mock-ui/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });

  const { window } = dom;
  window.fetch = async () => {
    throw new Error("Network disabled in UI contract test");
  };
  window.open = () => null;
  window.scrollTo = () => {};
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
  window.VENTO_LIVE_ENABLE_TEST_HOOKS = true;

  runScript(window, "translations.js");
  runScript(window, "ui-lab/mock-engine/mock_engine.browser.js");
  runScript(window, "ui-lab/mock-ui/static_data.js");
  runScript(window, "ui-lab/mock-ui/mock_ui.js");

  return dom;
}

function main() {
  const dom = createHarness();
  const { window } = dom;
  const { document } = window;
  const data = window.MOCK_DATA;

  assert(data, "MOCK_DATA not loaded");
  assert(window.MockEngine, "MockEngine not loaded");

  const brandSelect = field(document, "kite.brand");
  const modelSelect = field(document, "kite.model");
  const boardSelect = field(document, "board.board");
  const boardSizeSelect = field(document, "board.boardSize");

  assert(optionValues(brandSelect).length > 1, "Brand select was not populated");
  assert(optionValues(boardSelect).includes("twintip"), "Board select missing twintip");

  const { fromBrand, toBrand, selectedModel } = pickBrandPair(data);
  setValue(window, brandSelect, fromBrand);
  assert(optionValues(modelSelect).includes(selectedModel), "Model select missing model for selected brand");
  setValue(window, modelSelect, selectedModel);
  setValue(window, brandSelect, toBrand);
  assert(modelSelect.value !== selectedModel, "Model retained an incompatible value after brand change");

  const { fromType, toType, selectedSize } = pickBoardPair(data);
  setValue(window, boardSelect, fromType);
  assert(optionValues(boardSizeSelect).includes(selectedSize), "Board size select missing size for selected board");
  setValue(window, boardSizeSelect, selectedSize);
  setValue(window, boardSelect, toType);
  assert(boardSizeSelect.value !== selectedSize, "Board size retained an incompatible value after board change");

  setValue(window, brandSelect, fromBrand);
  setValue(window, modelSelect, selectedModel);
  setValue(window, boardSelect, fromType);
  setValue(window, boardSizeSelect, selectedSize);
  const languageButton = document.querySelector('[data-language="EN"]');
  assert(languageButton, "Missing EN language button");
  languageButton.click();
  assert(brandSelect.value === fromBrand, "Language change did not preserve brand value");
  assert(modelSelect.value === selectedModel, "Language change did not preserve compatible model value");
  assert(boardSelect.value === fromType, "Language change did not preserve board value");
  assert(boardSizeSelect.value === selectedSize, "Language change did not preserve compatible board size value");

  const hooks = window.VENTO_LIVE_TEST_HOOKS || {};
  assert(
    typeof hooks.resetVisualFormAfterSuccess === "function",
    "Missing resetVisualFormAfterSuccess test hook"
  );
  hooks.resetVisualFormAfterSuccess();
  const brandAfterReset = field(document, "kite.brand");
  const modelAfterReset = field(document, "kite.model");
  const boardAfterReset = field(document, "board.board");
  const boardSizeAfterReset = field(document, "board.boardSize");
  assert(brandAfterReset.value === "" || brandAfterReset.value !== fromBrand, "Reset retained previous brand");
  assert(modelAfterReset.value !== selectedModel, "Reset retained previous model");
  assert(boardAfterReset.value === "" || boardAfterReset.value !== fromType, "Reset retained previous board");
  assert(boardSizeAfterReset.value !== selectedSize, "Reset retained previous board size");

  console.log("REPORT_UI_SELECT_OPTIONS_RENDER_CONTRACT");
  console.log(JSON.stringify({
    ok: true,
    contracts: [
      "selects_exist",
      "brand_model_parent_child",
      "board_board_size_parent_child",
      "language_change_preserves_compatible_values",
      "reset_after_success_contract"
    ]
  }, null, 2));
}

main();
