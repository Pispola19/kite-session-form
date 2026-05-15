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

function typeText(window, inputEl, value) {
  inputEl.value = value;
  inputEl.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function assertPassiveSlot(slot, slotId) {
  assert(slot, `Missing ${slotId}`);
  assert(!slot.hasAttribute("data-state-field"), `${slotId} must not expose data-state-field`);
  assert(!slot.hasAttribute("name"), `${slotId} must not expose name`);
  assert(!slot.hasAttribute("required"), `${slotId} must not expose required`);
}

function slotInput(slot, slotId) {
  const input = slot.querySelector("input");
  assert(input, `${slotId} missing custom input`);
  assert(!input.hasAttribute("data-state-field"), `${slotId} input must not expose data-state-field`);
  assert(!input.hasAttribute("name"), `${slotId} input must not expose name`);
  assert(!input.hasAttribute("required"), `${slotId} input must not expose required`);
  return input;
}

function assertSlotHiddenAndEmpty(slot, slotId) {
  assert(slot.hidden, `${slotId} should be hidden`);
  assert(!slot.querySelector("input"), `${slotId} should not keep a custom input`);
}

function assertOtherInputVisible(slot, slotId) {
  assert(!slot.hidden, `${slotId} should be visible`);
  return slotInput(slot, slotId);
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
  const modelOtherSlot = document.getElementById("modelOtherTextSlot");
  const boardSizeOtherSlot = document.getElementById("boardSizeOtherTextSlot");

  assertPassiveSlot(modelOtherSlot, "modelOtherTextSlot");
  assertPassiveSlot(boardSizeOtherSlot, "boardSizeOtherTextSlot");

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
  assert(optionValues(modelSelect).includes("Other"), "Model select missing Other option");
  setValue(window, modelSelect, "Other");
  let modelOtherInput = assertOtherInputVisible(modelOtherSlot, "modelOtherTextSlot");
  typeText(window, modelOtherInput, "Custom model contract");
  assert(modelSelect.value === "Other", "Model legacy value did not remain Other");
  setValue(window, modelSelect, selectedModel);
  assertSlotHiddenAndEmpty(modelOtherSlot, "modelOtherTextSlot");
  setValue(window, modelSelect, "Other");
  modelOtherInput = assertOtherInputVisible(modelOtherSlot, "modelOtherTextSlot");
  assert(modelOtherInput.value === "", "Model Other text was not cleared after selecting a normal model");

  setValue(window, boardSelect, "twintip");
  const twintipSizes = data.BOARD_SIZE_BY_TYPE.twintip || [];
  assert(twintipSizes.length > 0, "No twintip board sizes found");
  const selectedTwintipSize = twintipSizes[0];
  assert(optionValues(boardSizeSelect).includes("Other"), "Board size select missing Other option");
  setValue(window, boardSizeSelect, "Other");
  let boardSizeOtherInput = assertOtherInputVisible(boardSizeOtherSlot, "boardSizeOtherTextSlot");
  typeText(window, boardSizeOtherInput, "Custom size contract");
  assert(boardSizeSelect.value === "Other", "Board size legacy value did not remain Other");
  setValue(window, boardSizeSelect, selectedTwintipSize);
  assertSlotHiddenAndEmpty(boardSizeOtherSlot, "boardSizeOtherTextSlot");
  setValue(window, boardSizeSelect, "Other");
  boardSizeOtherInput = assertOtherInputVisible(boardSizeOtherSlot, "boardSizeOtherTextSlot");
  assert(boardSizeOtherInput.value === "", "Board size Other text was not cleared after selecting a normal size");

  setValue(window, brandSelect, fromBrand);
  setValue(window, modelSelect, "Other");
  modelOtherInput = assertOtherInputVisible(modelOtherSlot, "modelOtherTextSlot");
  typeText(window, modelOtherInput, "Language model text");
  setValue(window, boardSelect, "twintip");
  setValue(window, boardSizeSelect, "Other");
  boardSizeOtherInput = assertOtherInputVisible(boardSizeOtherSlot, "boardSizeOtherTextSlot");
  typeText(window, boardSizeOtherInput, "Language board size text");
  const languageButton = document.querySelector('[data-language="EN"]');
  assert(languageButton, "Missing EN language button");
  languageButton.click();
  assert(brandSelect.value === fromBrand, "Language change did not preserve brand value");
  assert(modelSelect.value === "Other", "Language change did not preserve Other model value");
  assert(assertOtherInputVisible(modelOtherSlot, "modelOtherTextSlot").value === "Language model text", "Language change did not preserve model Other text");
  assert(boardSelect.value === "twintip", "Language change did not preserve board value");
  assert(boardSizeSelect.value === "Other", "Language change did not preserve Other board size value");
  assert(assertOtherInputVisible(boardSizeOtherSlot, "boardSizeOtherTextSlot").value === "Language board size text", "Language change did not preserve board size Other text");

  setValue(window, brandSelect, toBrand);
  assert(modelSelect.value === "Other", "Brand change did not preserve legacy Other model value");
  assert(assertOtherInputVisible(modelOtherSlot, "modelOtherTextSlot").value === "", "Brand change did not clear model Other text");

  const boardTypeForClear = optionValues(boardSelect).includes("surfboard") ? "surfboard" : "foil";
  setValue(window, boardSelect, boardTypeForClear);
  assert(boardSizeSelect.value === "Other", "Board type change did not preserve legacy Other board size value");
  assert(assertOtherInputVisible(boardSizeOtherSlot, "boardSizeOtherTextSlot").value === "", "Board type change did not clear board size Other text");

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
  assertSlotHiddenAndEmpty(modelOtherSlot, "modelOtherTextSlot");
  assertSlotHiddenAndEmpty(boardSizeOtherSlot, "boardSizeOtherTextSlot");

  console.log("REPORT_UI_SELECT_OPTIONS_RENDER_CONTRACT");
  console.log(JSON.stringify({
    ok: true,
    contracts: [
      "selects_exist",
      "brand_model_parent_child",
      "board_board_size_parent_child",
      "language_change_preserves_compatible_values",
      "reset_after_success_contract",
      "other_text_slots_are_passive",
      "other_text_model_show_hide_clear",
      "other_text_board_size_show_hide_clear",
      "other_text_language_preserves_values",
      "other_text_parent_change_clears_values",
      "other_text_reset_clears_values",
      "other_text_legacy_value_remains_other"
    ]
  }, null, 2));
}

main();
