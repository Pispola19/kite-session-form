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
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  });
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
  window.VENTO_LIVE_ENABLE_TEST_HOOKS = true;

  runScript(window, "translations.js");
  runScript(window, "ui-lab/mock-engine/mock_engine.browser.js");
  runScript(window, "ui-lab/mock-ui/static_data.js");
  runScript(window, "ui-lab/mock-ui/ventolive_i18n_v1.js");
  runScript(window, "ui-lab/mock-ui/user_intent_gate_v1.js");
  runScript(window, "ui-lab/mock-ui/ventolive_api_routing_v1.js");
  runScript(window, "ui-lab/mock-ui/server_contract_passive_v1.js");
  runScript(window, "ui-lab/mock-ui/wind_ui_visual_presentation_v1.js");
  runScript(window, "ui-lab/mock-ui/live_spot_wind_adapter_v1.js");
  runScript(window, "ui-lab/mock-ui/wind_ui_single_writer_v1.js");
  runScript(window, "ui-lab/mock-ui/mock_ui.js");

  return dom;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildLockContractFromEngine(engine) {
  const product = engine["WIND DECISION OUTPUT V1"] || {};
  const trend = product["WIND TREND (1h / 2h / 3h)"] || {};
  const spot = typeof product["SPOT RESOLVED"] === "string" ? product["SPOT RESOLVED"].trim() : "";
  const wind = product["WIND NOW (knots)"];
  const gust = product["GUST NOW (knots)"];
  const dir = typeof product["WIND DIRECTION (kite-relevant)"] === "string"
    ? product["WIND DIRECTION (kite-relevant)"].trim().toUpperCase()
    : "";
  const kite = typeof product["KITE DECISION"] === "string" ? product["KITE DECISION"].trim().toUpperCase() : "";
  const rel = typeof product.RELIABILITY === "string" ? product.RELIABILITY.trim().toUpperCase() : "";
  const hasWind = typeof wind === "number" && !Number.isNaN(wind);
  const hasDir = Boolean(dir);
  const hasSpot = Boolean(spot);
  let data_state = "error";
  if (hasWind || hasDir || hasSpot) {
    data_state = hasWind && hasDir && hasSpot ? "full" : "partial";
  }
  const fc = (key) => {
    const v = trend[key];
    if (typeof v === "number" && !Number.isNaN(v)) {
      return { state: "present", text: `${v} kn` };
    }
    return { state: "no_forecast", text: "" };
  };
  return {
    contract_version: "server_contract_schema_lock_v1",
    schema_version: "wind_decision_output_engine_v1",
    generated_at: engine.generated_at || "2026-05-25T02:34:00.000Z",
    updated_at: engine.updated_at || "2026-05-25T02:34:00.000Z",
    data_state,
    display: {
      wind: hasWind ? { state: "present", text: `${wind} kn` } : { state: "missing_data", text: "" },
      gust: typeof gust === "number" ? { state: "present", text: `${gust} kn` } : { state: "missing_data", text: "" },
      direction: hasDir ? { state: "present", text: dir } : { state: "missing_data", text: "" },
      wind_name: hasDir ? { state: "present", text: dir } : { state: "missing_data", text: "" },
      kite_decision: kite ? { state: "present", text: kite === "NO_GO" ? "NO GO" : kite } : { state: "missing_data", text: "" },
      reliability: rel ? { state: "present", text: rel } : { state: "missing_data", text: "" },
      spot: hasSpot ? { state: "present", text: spot } : { state: "missing_data", text: "" },
      updated_at: { state: "present", text: "04:34" },
      forecast_1h: fc("1h"),
      forecast_2h: fc("2h"),
      forecast_3h: fc("3h")
    },
    extensions: {}
  };
}

async function main() {
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
  const languageSelect = document.getElementById("languageSelect");
  assert(languageSelect, "Missing #languageSelect");
  setValue(window, languageSelect, "en");
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

  const idleWindOnLoad = document.querySelector('[data-live-spot-dd="wind"]');
  assert(idleWindOnLoad, "Missing wind dd on load");
  assert(idleWindOnLoad.textContent.trim() === "", "Idle UI must be empty before user intent");
  assert(!idleWindOnLoad.textContent.includes("Caricamento"), "No loading before user fetch");
  assert(!idleWindOnLoad.textContent.includes("Connessione vento"), "No connection message before user fetch");

  window.fetch = async () => ({
    ok: true,
    json: async () =>
      buildLockContractFromEngine({
        "WIND DECISION OUTPUT V1": {
          "SPOT RESOLVED": "Punta Trettu",
          "WIND NOW (knots)": 12.5,
          "WIND TREND (1h / 2h / 3h)": { "1h": 13, "2h": 14, "3h": 15 },
          "WIND DIRECTION (kite-relevant)": "NE",
          "KITE DECISION": "GO",
          "RELIABILITY": "HIGH",
          updated_at: "2026-05-25T02:34:00.000Z"
        }
      })
  });

  const liveSpotInput = field(document, "spot.location");
  typeText(window, liveSpotInput, "Punta Trettu");
  const langSelectEl = document.getElementById("languageSelect");
  if (langSelectEl) {
    langSelectEl.value = "it";
    langSelectEl.dispatchEvent(new window.Event("change"));
  }
  await wait(50);
  const showLiveSpot = document.getElementById("showLiveSpot");
  assert(showLiveSpot, "Missing #showLiveSpot");
  showLiveSpot.click();
  await wait(800);

  const liveSpotPanel = document.getElementById("liveSpotPanel");
  assert(liveSpotPanel, "Missing #liveSpotPanel");
  const liveWind = liveSpotPanel.querySelector('[data-live-spot-dd="wind"]');
  const liveDirection = liveSpotPanel.querySelector('[data-live-spot-dd="direction"]');
  const liveWindName = liveSpotPanel.querySelector('[data-live-spot-dd="wind_name"]');
  const liveReliability = liveSpotPanel.querySelector('[data-live-spot-dd="overview_confidence"]');
  const liveUpdated = liveSpotPanel.querySelector('[data-live-spot-dd="overview_updated"]');
  const liveDecision = liveSpotPanel.querySelector('[data-live-spot-dd="anemometer"]');
  const liveForecast3 = liveSpotPanel.querySelector('[data-live-spot-fc="3"] strong');
  assert(liveWind && liveWind.textContent.trim() === "12.5 kn", "V1 wind was not rendered");
  assert(liveDirection && liveDirection.classList.contains("wind-dir-arrow"), "Kite view must show direction arrow");
  assert(liveDirection && liveDirection.textContent.trim() === "↙", "NE downwind arrow in kite view");
  assert(liveWindName && liveWindName.textContent.trim() === "Grecale", "Wind name from display + i18n presentation");
  assert(liveReliability && liveReliability.textContent.trim() === "HIGH", "V1 reliability must be raw contract");
  assert(liveUpdated && liveUpdated.textContent.trim() === "04:34", "Europe/Rome time was not rendered");
  assert(!liveUpdated || !liveUpdated.textContent.includes("UTC"), "UTC must not appear in updated time");
  assert(liveDecision && liveDecision.textContent.includes("Dir"), "Anemometer line from display wind/gust/direction");
  assert(liveDecision && liveDecision.textContent.includes("12.5 kn"), "Anemometer includes display wind");
  assert(!liveDecision || !liveDecision.textContent.includes("KITE SCORE"), "UI must not compute kite score");
  assert(!liveDecision || !liveDecision.textContent.includes("Decisione"), "Legacy decision text forbidden");
  assert(!liveDecision || !liveDecision.textContent.includes("Rel HIGH"), "Legacy Rel HIGH forbidden");
  assert(!liveDecision || liveDecision.textContent.trim() !== "GO", "kite_decision must not replace anemometer slot");
  assert(liveForecast3 && liveForecast3.textContent.trim() === "15 kn", "V1 forecast 3h was not rendered");

  window.fetch = async () => ({
    ok: true,
    json: async () => ({
      "WIND DECISION OUTPUT V1": {
        "SPOT RESOLVED": "Legacy",
        "WIND NOW (knots)": 99,
        "WIND DIRECTION (kite-relevant)": "N",
        "KITE DECISION": "GO",
        RELIABILITY: "HIGH"
      }
    })
  });
  typeText(window, liveSpotInput, "LegacyLeak");
  showLiveSpot.click();
  await wait(150);
  const blockedWind = liveSpotPanel.querySelector('[data-live-spot-dd="wind"]');
  assert(
    blockedWind && blockedWind.textContent.includes("Connessione vento"),
    "Legacy engine envelope must hard-block render (no wind parsing)"
  );
  assert(blockedWind.textContent.indexOf("99") === -1, "Legacy wind_knots must not appear in UI");

  window.fetch = async () => ({
    ok: true,
    json: async () =>
      buildLockContractFromEngine({
        "WIND DECISION OUTPUT V1": {
          "SPOT RESOLVED": "Chia",
          "WIND NOW (knots)": 2.9,
          "WIND TREND (1h / 2h / 3h)": { "1h": null, "2h": null, "3h": null },
          "WIND DIRECTION (kite-relevant)": null,
          "KITE DECISION": "NO GO",
          RELIABILITY: "HIGH"
        }
      })
  });
  typeText(window, liveSpotInput, "Chia");
  showLiveSpot.click();
  await wait(150);
  const partialWind = liveSpotPanel.querySelector('[data-live-spot-dd="wind"]');
  const partialSpot = liveSpotPanel.querySelector('[data-live-spot-dd="overview_spot"]');
  const partialDir = liveSpotPanel.querySelector('[data-live-spot-dd="wind_name"]');
  assert(partialWind && partialWind.textContent.trim() === "2.9 kn", "Partial state must render wind");
  assert(partialSpot && partialSpot.textContent.trim() === "Chia", "Partial state must render spot");
  assert(partialDir && partialDir.textContent.trim() === "", "Partial missing direction must be empty per contract");
  assert(
    !partialWind.textContent.includes("Caricamento"),
    "Partial state must not show loading when wind data exists"
  );

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
      "other_text_legacy_value_remains_other",
      "server_contract_schema_lock_v1_passive_render",
      "zero_drift_ui_hard_gate_blocks_legacy_engine",
      "ux_safe_render_partial_state_v1",
      "user_intent_gate_idle_v1"
    ]
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
