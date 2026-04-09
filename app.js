"use strict";

(() => {
  const translations = window.RDK_TRANSLATIONS || {};
  if (!translations.en) return;

  const WHATSAPP_NUMBER = "393345280521";
  const BACKEND_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz1XcFkqp6LTeLEhe8nhMuv5F8ArXeX65gAY_HpmCjXDOtgCcYNoqWbPl46gDh-NNNQ/exec";
  const BOARD_SIZE_OTHER = "__rdk_other__";
  const BRAND_OTHER = "__brand_other__";
  const MODEL_OTHER = "__model_other__";
  const AIRUSH_BRAND = "Airush";
  const BEST_BRAND = "Best";
  const CABRINHA_BRAND = "Cabrinha";
  const CRAZYFLY_BRAND = "CrazyFly";
  const DUOTONE_BRAND = "Duotone Kiteboarding";
  const ELEVEIGHT_BRAND = "Eleveight";
  const CORE_BRAND = "Core Kiteboarding";
  const F_ONE_BRAND = "F-One";
  const FLYSURFER_BRAND = "Flysurfer";
  const GAASTRA_BRAND = "Gaastra Kiteboarding";
  const HARLEM_BRAND = "Harlem Kitesurfing";
  const LIQUID_FORCE_BRAND = "Liquid Force";
  const NAISH_BRAND = "Naish Kiteboarding";
  const NOBILE_BRAND = "Nobile Kiteboarding";
  const OCEAN_RODEO_BRAND = "Ocean Rodeo";
  const NORTH_BRAND = "North Kiteboarding";
  const OZONE_BRAND = "Ozone";
  const RRD_BRAND = "RRD";
  const SLINGSHOT_BRAND = "Slingshot";
  const LS_DRAFT_SESSION = "draft_kite_session";
  const LS_LAST_SESSION = "last_kite_session";
  const LS_FIRST_SUBMIT = "rdk_first_submit";

  const AIRUSH_MODELS = [
    "Ultra v5",
    "Ultra Team DS v5",
    "Lithium v14",
    "Lithium Team v14",
    "Lift v3",
    "Lift Kite v4",
    "Lift Team v4",
    "Razor v10",
    "Session v2",
    "Session Team v2",
    "Lithium v13",
    "Lithium Team v13"
  ];

  const BEST_MODELS = [
    "AYRA",
    "ROCA",
    "HEX",
    "SWOX",
    "JET",
    "STORM",
    "ZEPHYR",
    "TRIO",
    "AYRA Ultralight"
  ];

  const CABRINHA_MODELS = [
    "Switchblade",
    "Switchblade Apex",
    "Nitro",
    "Nitro Apex",
    "Drifter",
    "Drifter Apex",
    "Moto X",
    "Moto X Lite",
    "Moto XL",
    "Moto XL Apex",
    "FX",
    "FX2"
  ];

  const CRAZYFLY_MODELS = [
    "Sculp",
    "Hyper",
    "Nuke"
  ];

  const DUOTONE_MODELS = [
    "Evo",
    "Evo SLS",
    "Evo D/Lab",
    "Evo Concept Blue",
    "Rebel",
    "Rebel SLS",
    "Rebel D/Lab",
    "Neo",
    "Neo SLS",
    "Neo D/Lab",
    "Juice",
    "Juice D/Lab",
    "Vegas",
    "Vegas Concept Blue",
    "Vegas D/Lab",
    "Volt",
    "Volt D/Lab"
  ];

  const ELEVEIGHT_MODELS = [
    "RS V9",
    "RS+ V3",
    "RS Pro 2025",
    "FS V8",
    "XS V5",
    "WS V8",
    "PS V8"
  ];

  const CORE_MODELS = [
    "XR5",
    "XR6",
    "XR7",
    "XR8",
    "XR8 LW",
    "XR Pro",
    "XR Pro 2",
    "Nexus",
    "Nexus 2",
    "Nexus 3",
    "Nexus 4",
    "Nexus LW",
    "Pace",
    "Pace Pro",
    "Section",
    "Section 2",
    "Section 3",
    "Section 4",
    "Section 5",
    "Section LW",
    "GTS5",
    "GTS6",
    "GTS6 LW",
    "Xlite",
    "Xlite 2",
    "Impact",
    "Impact 2",
    "Xperience",
    "Air",
    "Air Pro"
  ];

  const F_ONE_MODELS = [
    "Bandit",
    "Bandit TEC",
    "Bandit XV",
    "Bandit-S",
    "Breeze",
    "Addikt",
    "Chrono Foil",
    "Trax Foil",
    "Cobra Foil",
    "Kyankka Foil"
  ];

  const FLYSURFER_MODELS = [
    "Era",
    "Era 2",
    "Speed3",
    "Peak3",
    "Soul3",
    "Hybrid",
    "Hybrid²",
    "Indie"
  ];

  const GAASTRA_MODELS = [
    "Spark",
    "Pure",
    "One",
    "Max",
    "IQ"
  ];

  const HARLEM_MODELS = [
    "Thrive",
    "Peak",
    "Hadlow Pro",
    "Force"
  ];

  const LIQUID_FORCE_MODELS = [
    "NV",
    "NV V8",
    "NV V9",
    "Solo",
    "WOW V3",
    "WOW V4",
    "Recon",
    "Momentum",
    "Testament",
    "Trinity"
  ];

  const NAISH_MODELS = [
    "Pivot",
    "Pivot Nvision",
    "Psycho",
    "Dash",
    "Ride",
    "Slash",
    "Torch"
  ];

  const NOBILE_MODELS = [
    "Childhood",
    "Childhood Light",
    "Peanut",
    "Peanut Light",
    "Freedom",
    "Maverick",
    "Scrap",
    "Step",
    "Squirt",
    "Squirt Light"
  ];

  const OCEAN_RODEO_MODELS = [
    "Flite A-Series",
    "Prodigy",
    "Razor",
    "Roam",
    "Crave",
    "Rise 5"
  ];

  const NORTH_MODELS = [
    "Reach",
    "Orbit",
    "Orbit Pro",
    "Orbit Ultra",
    "Carve",
    "Pulse",
    "Code Zero",
    "Code Zero Pro"
  ];

  const OZONE_MODELS = [
    "Enduro",
    "Edge",
    "Catalyst",
    "Vortex",
    "AMP",
    "Reo",
    "Zephyr",
    "Zephyr Ultra-X",
    "Chrono",
    "Chrono V5"
  ];

  const RRD_MODELS = [
    "Passion Y30",
    "Passion LW Y30",
    "Vision Y27",
    "Religion Y30"
  ];

  const SLINGSHOT_MODELS = [
    "Code V2",
    "Code NXT",
    "Rally",
    "Ghost V3",
    "SST",
    "RPM",
    "RPX",
    "Mistral"
  ];

  const BOARD_SIZE_BY_TYPE = {
    twintip: [
      "125x38", "129x38", "130x39", "132x39", "133x39", "133x40",
      "134x40", "135x40", "136x40.5", "137x40.5", "137x41", "138x41",
      "138x42", "139x41", "140x41", "140x42", "141x41", "141x42",
      "142x42", "144x41.5", "144x44", "145x43", "146x43", "147x44",
      "148x45", "160x45", "160x46"
    ],
    surfboard: [
      "5'0", "5'1", "5'2", "5'3", "5'4", "5'5", "5'6", "5'7", "5'8",
      "5'9", "5'10", "5'11", "6'0", "6'1", "6'2", "6'3", "6'4"
    ],
    foil: ["120", "130", "140", "150"]
  };

  const CANONICAL_VALUES = {
    board: {
      twintip: "Twintip",
      surfboard: "Surfboard",
      foil: "Foil"
    },
    level: {
      beginner: "Beginner",
      independent: "Independent",
      advanced: "Advanced"
    },
    water: {
      flat: "Flat",
      chop_light: "Chop light",
      chop: "Chop",
      chop_strong: "Chop strong",
      small_waves: "Small waves",
      waves: "Waves",
      big_waves: "Big waves"
    },
    result: {
      underpowered: "Underpowered",
      good: "Good",
      powered: "Powered",
      overpowered: "Overpowered",
      survival: "Survival"
    }
  };

  const CANONICAL_LABELS = {
    weight: "Weight (kg)",
    board: "Board type",
    boardSize: "Board size",
    level: "Level",
    kite: "Kite (m²)",
    brand: "Brand",
    model: "Model",
    wind: "Wind (kts)",
    location: "Spot",
    water: "Water conditions",
    result: "Session result",
    notes: "Notes"
  };

  const NUMERIC_RULES = {
    weight: { min: 30, max: 150, maxLength: 3, labelKey: "label_weight" },
    wind: { min: 0, max: 80, maxLength: 2, labelKey: "label_wind" },
    kite: { min: 3, max: 25, maxLength: 2, labelKey: "label_kite_size" }
  };

  const form = document.getElementById("kiteForm");
  const preview = document.getElementById("previewText");
  const resetBtn = document.getElementById("resetBtn");
  const sendBtn = document.getElementById("sendBtn");
  const copyMessageBtn = document.getElementById("copyMessageBtn");
  const sendNotice = document.getElementById("sendNotice");
  const copyNotice = document.getElementById("copyNotice");
  const safariSuggestion = document.getElementById("safariSuggestion");
  const validationNotice = document.getElementById("validationNotice");
  const flagButtons = Array.from(document.querySelectorAll(".flag-btn[data-lang]"));

  let currentLang = "it";
  let sendAudioCtx = null;
  let lastPreparedMessage = "";

  function t(key){
    const pack = translations[currentLang] || translations.en;
    return pack[key] ?? translations.en[key] ?? "";
  }

  function interpolate(template, values){
    return String(template || "").replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }

  function hasFirstSubmitDone(){
    try {
      return localStorage.getItem(LS_FIRST_SUBMIT) === "true";
    } catch (_) {
      return true;
    }
  }

  function markFirstSubmitDone(){
    try {
      localStorage.setItem(LS_FIRST_SUBMIT, "true");
    } catch (_) {}
  }

  function loadStoredJson(key){
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function storeJson(key, value){
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function removeStoredValue(key){
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function isBackendWebhookConfigured(){
    return Boolean(BACKEND_WEBHOOK_URL) && !BACKEND_WEBHOOK_URL.includes("YOUR_WEBHOOK_URL");
  }

  function setPreparedMessage(message){
    lastPreparedMessage = String(message || "");
  }

  function invalidatePreparedMessage(){
    lastPreparedMessage = "";
  }

  function hideTransientNotice(el){
    if (!el) return;
    const timerId = Number(el.dataset.hideTimer || 0);
    if (timerId) window.clearTimeout(timerId);
    delete el.dataset.hideTimer;
    el.style.display = "none";
    el.textContent = "";
  }

  function showTransientNotice(el, message){
    if (!el) return;
    hideTransientNotice(el);
    el.textContent = message;
    el.style.display = "block";
    el.dataset.hideTimer = String(window.setTimeout(() => {
      hideTransientNotice(el);
    }, 2600));
  }

  function setValidationNotice(message){
    if (!validationNotice) return;
    if (!message) {
      validationNotice.textContent = "";
      validationNotice.style.display = "none";
      validationNotice.setAttribute("aria-hidden", "true");
      return;
    }

    validationNotice.textContent = message;
    validationNotice.style.display = "block";
    validationNotice.setAttribute("aria-hidden", "false");
  }

  function isIphoneChromeIos(){
    const ua = String(window.navigator.userAgent || "");
    return /iPhone/i.test(ua) && /CriOS/i.test(ua);
  }

  function syncSafariSuggestion(){
    if (!safariSuggestion) return;
    safariSuggestion.hidden = !isIphoneChromeIos();
  }

  function applyTranslations(lang){
    if (!translations[lang]) lang = "en";
    currentLang = lang;

    try {
      localStorage.setItem("rdk_lang", lang);
    } catch (_) {}

    document.documentElement.lang = t("htmlLang") || "en";
    document.title = t("pageTitle") || "Are you using the right kite?";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", t(key));
    });

    syncFlagUI();
    syncSafariSuggestion();
    syncBoardSizeOptions();
    validateFormFields({ showNotice: Boolean(validationNotice?.textContent) });
    refreshPreview();
  }

  function syncFlagUI(){
    flagButtons.forEach((btn) => {
      const lang = btn.getAttribute("data-lang");
      btn.setAttribute("aria-pressed", lang === currentLang ? "true" : "false");
    });
  }

  function val(id){
    return String(document.getElementById(id)?.value || "").trim();
  }

  function setFieldValue(id, value){
    const el = document.getElementById(id);
    if (!el) return;
    el.value = String(value || "");
  }

  function getGenderValue(){
    const value = val("gender").toUpperCase();
    if (value === "M" || value === "F") return value;
    return null;
  }

  function setGenderValue(value){
    setFieldValue("gender", String(value || "").trim().toUpperCase());
  }

  function selectedText(id){
    const el = document.getElementById(id);
    if (!el || !("selectedIndex" in el)) return "";
    const option = el.options[el.selectedIndex];
    return String(option?.textContent || "").trim();
  }

  function syncBoardSizeCustomUI(){
    const sel = document.getElementById("boardSize");
    const custom = document.getElementById("boardSizeCustom");
    if (!sel || !custom) return;

    const show = !sel.disabled && sel.value === BOARD_SIZE_OTHER;
    if (!show) custom.value = "";
    custom.hidden = !show;
  }

  function syncBrandCustomUI(){
    const select = document.getElementById("brand");
    const custom = document.getElementById("brandCustom");
    if (!select || !custom) return;

    const show = select.value === BRAND_OTHER;
    if (!show) custom.value = "";
    custom.hidden = !show;
  }

  function getFilteredModelValue(){
    const modelSelect = document.getElementById("modelSelect");
    if (!modelSelect) return "";
    if (modelSelect.value === MODEL_OTHER) return val("modelCustom");
    return val("modelSelect");
  }

  function getPresetModelsForBrand(brand){
    if (brand === AIRUSH_BRAND) return AIRUSH_MODELS;
    else if (brand === BEST_BRAND) return BEST_MODELS;
    else if (brand === CABRINHA_BRAND) return CABRINHA_MODELS;
    else if (brand === CRAZYFLY_BRAND) return CRAZYFLY_MODELS;
    else if (brand === DUOTONE_BRAND) return DUOTONE_MODELS;
    else if (brand === ELEVEIGHT_BRAND) return ELEVEIGHT_MODELS;
    else if (brand === CORE_BRAND) return CORE_MODELS;
    else if (brand === F_ONE_BRAND) return F_ONE_MODELS;
    else if (brand === FLYSURFER_BRAND) return FLYSURFER_MODELS;
    else if (brand === GAASTRA_BRAND) return GAASTRA_MODELS;
    else if (brand === HARLEM_BRAND) return HARLEM_MODELS;
    else if (brand === LIQUID_FORCE_BRAND) return LIQUID_FORCE_MODELS;
    else if (brand === NAISH_BRAND) return NAISH_MODELS;
    else if (brand === NOBILE_BRAND) return NOBILE_MODELS;
    else if (brand === OCEAN_RODEO_BRAND) return OCEAN_RODEO_MODELS;
    else if (brand === NORTH_BRAND) return NORTH_MODELS;
    else if (brand === OZONE_BRAND) return OZONE_MODELS;
    else if (brand === RRD_BRAND) return RRD_MODELS;
    else if (brand === SLINGSHOT_BRAND) return SLINGSHOT_MODELS;
    return null;
  }

  function populateModelOptions(brand){
    const modelSelect = document.getElementById("modelSelect");
    if (!modelSelect) return;

    const models = getPresetModelsForBrand(brand) || [];
    const previousBrand = modelSelect.getAttribute("data-model-brand") || "";
    const previousValue = previousBrand === brand ? modelSelect.value : "";

    modelSelect.innerHTML = "";

    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = t("opt_model_prompt");
    modelSelect.appendChild(prompt);

    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    const other = document.createElement("option");
    other.value = MODEL_OTHER;
    other.textContent = t("opt_model_other");
    modelSelect.appendChild(other);

    if (models.includes(previousValue)) modelSelect.value = previousValue;
    else if (previousValue === MODEL_OTHER) modelSelect.value = MODEL_OTHER;
    else modelSelect.value = "";

    modelSelect.setAttribute("data-model-brand", brand);
  }

  function syncModelUI(){
    const modelInput = document.getElementById("model");
    const modelSelect = document.getElementById("modelSelect");
    const modelCustom = document.getElementById("modelCustom");
    const brand = val("brand");
    const presetModels = getPresetModelsForBrand(brand);

    if (!modelInput || !modelSelect || !modelCustom) return;

    if (brand === AIRUSH_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === CABRINHA_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === BEST_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === CRAZYFLY_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === DUOTONE_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        const availableModels = Array.from(modelSelect.options).map((option) => option.value);
        if (availableModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === ELEVEIGHT_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === CORE_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === F_ONE_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === FLYSURFER_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === GAASTRA_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === HARLEM_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === LIQUID_FORCE_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === NAISH_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === NOBILE_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === OCEAN_RODEO_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === NORTH_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === OZONE_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === RRD_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else if (brand === SLINGSHOT_BRAND) {
      const typedModel = String(modelInput.value || "").trim();
      populateModelOptions(brand);
      modelInput.hidden = true;
      modelSelect.hidden = false;

      if (!modelSelect.value && typedModel) {
        if (presetModels.includes(typedModel)) modelSelect.value = typedModel;
        else {
          modelSelect.value = MODEL_OTHER;
          modelCustom.value = typedModel;
        }
      }

      const showCustom = modelSelect.value === MODEL_OTHER;
      if (!showCustom) modelCustom.value = "";
      modelCustom.hidden = !showCustom;
      return;
    } else {
      const selectedModel = getFilteredModelValue();
      if (selectedModel) modelInput.value = selectedModel;

      modelInput.hidden = false;
      modelSelect.hidden = true;
      modelSelect.value = "";
      modelSelect.setAttribute("data-model-brand", "");
      modelCustom.hidden = true;
      modelCustom.value = "";
    }
  }

  function syncBoardSizeOptions(){
    const boardVal = val("board");
    const sel = document.getElementById("boardSize");
    const hintAbove = document.getElementById("boardSizeHintAbove");
    if (!sel) return;

    const sizes = boardVal ? BOARD_SIZE_BY_TYPE[boardVal] : null;
    const prev = sel.value;

    sel.innerHTML = "";

    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = t("opt_board_size_prompt");
    sel.appendChild(prompt);

    if (!sizes){
      sel.disabled = true;
      sel.value = "";
      if (hintAbove) hintAbove.hidden = true;
      syncBoardSizeCustomUI();
      return;
    }

    sel.disabled = false;

    const other = document.createElement("option");
    other.value = BOARD_SIZE_OTHER;
    other.textContent = t("opt_board_size_other");
    sel.appendChild(other);

    sizes.forEach((size) => {
      const option = document.createElement("option");
      option.value = size;
      option.textContent = size;
      sel.appendChild(option);
    });

    if (sizes.includes(prev)) sel.value = prev;
    else if (prev === BOARD_SIZE_OTHER) sel.value = BOARD_SIZE_OTHER;

    if (hintAbove) hintAbove.hidden = false;
    syncBoardSizeCustomUI();
  }

  function sanitizeNumericField(id){
    const el = document.getElementById(id);
    const rule = NUMERIC_RULES[id];
    if (!el || !rule) return;
    el.value = String(el.value || "").replace(/[^\d]/g, "").slice(0, rule.maxLength);
  }

  function getBrandValue(){
    const brand = val("brand");
    if (brand === BRAND_OTHER) return val("brandCustom");
    return brand;
  }

  function getModelValue(){
    const brand = val("brand");
    if (brand === AIRUSH_BRAND) return getFilteredModelValue();
    else if (brand === BEST_BRAND) return getFilteredModelValue();
    else if (brand === CABRINHA_BRAND) return getFilteredModelValue();
    else if (brand === CRAZYFLY_BRAND) return getFilteredModelValue();
    else if (brand === DUOTONE_BRAND) return getFilteredModelValue();
    else if (brand === ELEVEIGHT_BRAND) return getFilteredModelValue();
    else if (brand === CORE_BRAND) return getFilteredModelValue();
    else if (brand === F_ONE_BRAND) return getFilteredModelValue();
    else if (brand === FLYSURFER_BRAND) return getFilteredModelValue();
    else if (brand === GAASTRA_BRAND) return getFilteredModelValue();
    else if (brand === HARLEM_BRAND) return getFilteredModelValue();
    else if (brand === LIQUID_FORCE_BRAND) return getFilteredModelValue();
    else if (brand === NAISH_BRAND) return getFilteredModelValue();
    else if (brand === NOBILE_BRAND) return getFilteredModelValue();
    else if (brand === OCEAN_RODEO_BRAND) return getFilteredModelValue();
    else if (brand === NORTH_BRAND) return getFilteredModelValue();
    else if (brand === OZONE_BRAND) return getFilteredModelValue();
    else if (brand === RRD_BRAND) return getFilteredModelValue();
    else if (brand === SLINGSHOT_BRAND) return getFilteredModelValue();
    return val("model");
  }

  function validateNumericField(id){
    const el = document.getElementById(id);
    const rule = NUMERIC_RULES[id];
    if (!el || !rule) return true;

    const raw = String(el.value || "").trim();
    let message = "";

    if (!raw) {
      if (el.required) {
        const requiredKey = id === "wind" ? "validation_required_wind" : "validation_required";
        message = interpolate(t(requiredKey), { field: t(rule.labelKey) });
      }
    } else if (!/^\d+$/.test(raw)) {
      message = interpolate(t("validation_integer"), { field: t(rule.labelKey) });
    } else {
      const value = Number(raw);
      if (!Number.isInteger(value) || value < rule.min || value > rule.max) {
        message = interpolate(t("validation_range"), {
          field: t(rule.labelKey),
          min: rule.min,
          max: rule.max
        });
      }
    }

    el.setCustomValidity(message);
    return !message;
  }

  function validateFormFields({ showNotice = false } = {}){
    let firstMessage = "";

    Object.keys(NUMERIC_RULES).forEach((id) => {
      const valid = validateNumericField(id);
      if (!valid && !firstMessage) {
        firstMessage = document.getElementById(id)?.validationMessage || "";
      }
    });

    if (showNotice) setValidationNotice(firstMessage);
    else if (!firstMessage) setValidationNotice("");

    return !firstMessage;
  }

  function randomRdkId(){
    const length = 10;
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const chars = [];

    if (window.crypto?.getRandomValues) {
      const buffer = new Uint8Array(length);
      window.crypto.getRandomValues(buffer);
      for (let i = 0; i < length; i += 1) {
        chars.push(alphabet[buffer[i] % alphabet.length]);
      }
    } else {
      for (let i = 0; i < length; i += 1) {
        chars.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
      }
    }

    return chars.join("");
  }

  function rdkTimestampRfc3339(){
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const offsetMinutes = -d.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offsetMinutes);
    const offsetHours = Math.floor(absoluteOffset / 60);
    const offsetRemainder = absoluteOffset % 60;

    return [
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      `${sign}${pad(offsetHours)}:${pad(offsetRemainder)}`
    ].join("");
  }

  function signatureDigestHex(text){
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function generateSignatureSync(text){
    const digest = signatureDigestHex(text);
    return digest.slice(0, 10);
  }

  function appendTechnicalBlockSync(body){
    const id = randomRdkId();
    const ts = rdkTimestampRfc3339();

    let block = `${body}\n---\nID: ${id}\nTS: ${ts}\nSRC: rdk_v1`;
    const sig = generateSignatureSync(block);
    block += `\nSIG: ${sig}\n---`;
    return block;
  }

  function canonicalValue(group, value){
    return CANONICAL_VALUES[group]?.[value] || value;
  }

  function buildSessionData(){
    const boardSizeSelection = val("boardSize");

    return {
      weight: val("weight"),
      gender: getGenderValue(),
      board: val("board"),
      boardSize: boardSizeSelection === BOARD_SIZE_OTHER ? val("boardSizeCustom") : boardSizeSelection,
      level: val("level"),
      kite: val("kite"),
      wind: val("wind"),
      brand: getBrandValue(),
      model: getModelValue(),
      location: val("location"),
      water: val("water"),
      result: val("result"),
      note: val("note"),
      ts: new Date().toISOString()
    };
  }

  function buildDraftData(){
    return {
      weight: val("weight"),
      gender: getGenderValue(),
      board: val("board"),
      boardSize: val("boardSize"),
      boardSizeCustom: val("boardSizeCustom"),
      level: val("level"),
      kite: val("kite"),
      wind: val("wind"),
      brand: val("brand"),
      brandCustom: val("brandCustom"),
      model: val("model"),
      modelSelect: val("modelSelect"),
      modelCustom: val("modelCustom"),
      location: val("location"),
      water: val("water"),
      result: val("result"),
      note: val("note"),
      ts: new Date().toISOString()
    };
  }

  function saveLastSession(sessionData = buildSessionData()){
    return storeJson(LS_LAST_SESSION, sessionData);
  }

  function saveDraftSession(){
    return storeJson(LS_DRAFT_SESSION, buildDraftData());
  }

  function clearDraftSession(){
    removeStoredValue(LS_DRAFT_SESSION);
  }

  function restoreDraftSession(){
    const draft = loadStoredJson(LS_DRAFT_SESSION);
    if (!draft || typeof draft !== "object") return false;

    setFieldValue("weight", draft.weight);
    setGenderValue(draft.gender);
    setFieldValue("board", draft.board);
    setFieldValue("level", draft.level);
    setFieldValue("kite", draft.kite);
    setFieldValue("wind", draft.wind);
    setFieldValue("brand", draft.brand);
    setFieldValue("brandCustom", draft.brandCustom);
    setFieldValue("location", draft.location);
    setFieldValue("water", draft.water);
    setFieldValue("result", draft.result);
    setFieldValue("note", draft.note);

    syncBoardSizeOptions();
    setFieldValue("boardSize", draft.boardSize);
    setFieldValue("boardSizeCustom", draft.boardSizeCustom);
    syncBoardSizeCustomUI();

    syncBrandCustomUI();
    syncModelUI();
    setFieldValue("model", draft.model);
    setFieldValue("modelSelect", draft.modelSelect);
    setFieldValue("modelCustom", draft.modelCustom);
    syncModelUI();

    Object.keys(NUMERIC_RULES).forEach(validateNumericField);
    refreshPreview();
    return true;
  }

  function buildCoreMessage(){
    const weight = val("weight");
    const board = val("board");
    const boardSizeSelection = val("boardSize");
    const boardSize = boardSizeSelection === BOARD_SIZE_OTHER ? val("boardSizeCustom") : boardSizeSelection;
    const level = val("level");
    const kite = val("kite");
    const brand = getBrandValue();
    const model = getModelValue();
    const wind = val("wind");
    const location = val("location");
    const water = val("water");
    const result = val("result");
    const note = val("note");

    const lines = [];
    if (weight) lines.push(`⚖️ ${CANONICAL_LABELS.weight}: ${weight}`);
    if (board) lines.push(`🪵 ${CANONICAL_LABELS.board}: ${selectedText("board") || board}`);
    if (boardSize) lines.push(`🪵 ${CANONICAL_LABELS.boardSize}: ${boardSize}`);
    if (level) lines.push(`🎯 ${CANONICAL_LABELS.level}: ${selectedText("level") || level}`);
    if (kite) lines.push(`🪁 ${CANONICAL_LABELS.kite}: ${kite}`);
    if (brand) lines.push(`🏷️ ${CANONICAL_LABELS.brand}: ${brand}`);
    if (model) lines.push(`🪁 ${CANONICAL_LABELS.model}: ${model}`);
    if (wind) lines.push(`🌬️ ${CANONICAL_LABELS.wind}: ${wind}`);
    if (location) lines.push(`📍 ${CANONICAL_LABELS.location}: ${location}`);
    if (water) lines.push(`🌊 ${CANONICAL_LABELS.water}: ${selectedText("water") || water}`);
    if (result) lines.push(`✅ ${CANONICAL_LABELS.result}: ${selectedText("result") || result}`);
    if (note) lines.push(`${CANONICAL_LABELS.notes}: ${note}`);

    return lines.join("\n");
  }

  function buildOutgoingBody(){
    const core = buildCoreMessage();
    if (!core) return "";
    if (hasFirstSubmitDone()) return core;
    return `${t("first_submit_prefix")}\n\n${core}`;
  }

  function buildOutgoingMessageSync(){
    const body = buildOutgoingBody();
    if (!body) return "";
    return appendTechnicalBlockSync(body);
  }

  async function sendSessionToBackend(sessionData){
    if (!isBackendWebhookConfigured()) return false;

    try {
      const payload = JSON.stringify(sessionData);
      console.log("SEND BACKEND", sessionData);

      if (window.navigator?.sendBeacon) {
        const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
        const queued = window.navigator.sendBeacon(BACKEND_WEBHOOK_URL, blob);
        if (queued) return true;
      }

      const response = await fetch(BACKEND_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: payload,
        keepalive: true
      });

      if (!response.ok) {
        console.warn("Backend save failed", response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.warn("Backend save failed", error);
      return false;
    }
  }

  function refreshPreview(){
    const body = buildOutgoingBody();
    preview.textContent = body || t("preview_empty");
  }

  function playSendFeedback(){
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;

      sendAudioCtx = sendAudioCtx || new AudioContextCtor();
      const ctx = sendAudioCtx;
      if (ctx.state === "suspended") void ctx.resume();

      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1040, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    } catch (_) {}
  }

  function showSendNotice(){
    showTransientNotice(sendNotice, t("send_notice"));
  }

  function openWhatsAppWithMessage(message){
    const number = String(WHATSAPP_NUMBER).replace(/\D/g, "");
    const cleanMessage = String(message)
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\uFFFD/g, "");
    const encoded = encodeURIComponent(cleanMessage);
    const deepLink = `whatsapp://send?phone=${number}&text=${encoded}`;
    window.location.href = deepLink;

    if (!/Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)) {
      window.setTimeout(() => {
        window.location.href = `https://wa.me/${number}?text=${encoded}`;
      }, 800);
    }
  }

  function bindPreviewField(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", refreshPreview);
    el.addEventListener("change", refreshPreview);
  }

  function bindDraftField(id){
    const el = document.getElementById(id);
    if (!el) return;

    const persistDraft = () => {
      invalidatePreparedMessage();
      saveDraftSession();
    };

    el.addEventListener("input", persistDraft);
    el.addEventListener("change", persistDraft);
  }

  async function copyTextToClipboard(text){
    if (window.navigator?.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(text);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    helper.style.pointerEvents = "none";
    document.body.appendChild(helper);
    helper.select();
    helper.setSelectionRange(0, helper.value.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (_) {
      copied = false;
    }

    helper.remove();
    return copied;
  }

  Object.keys(NUMERIC_RULES).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      sanitizeNumericField(id);
      validateFormFields({ showNotice: false });
      refreshPreview();
    });

    el.addEventListener("blur", () => {
      validateFormFields({ showNotice: true });
    });
  });

  ["board", "boardSize", "boardSizeCustom", "brand", "brandCustom", "level", "model", "modelSelect", "modelCustom", "location", "water", "result", "note"].forEach(bindPreviewField);

  document.getElementById("board")?.addEventListener("change", () => {
    syncBoardSizeOptions();
    refreshPreview();
  });

  document.getElementById("boardSize")?.addEventListener("change", () => {
    syncBoardSizeCustomUI();
    refreshPreview();
  });

  document.getElementById("brand")?.addEventListener("change", () => {
    syncBrandCustomUI();
    syncModelUI();
    refreshPreview();
  });

  document.getElementById("modelSelect")?.addEventListener("change", () => {
    syncModelUI();
    refreshPreview();
  });

  ["weight", "board", "boardSize", "boardSizeCustom", "level", "kite", "wind", "brand", "brandCustom", "model", "modelSelect", "modelCustom", "location", "water", "result", "note"].forEach(bindDraftField);
  bindDraftField("gender");

  flagButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyTranslations(btn.getAttribute("data-lang") || "en");
    });
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const valid = validateFormFields({ showNotice: true });
    if (!valid || !form.reportValidity()) return;

    sendBtn.disabled = true;

    try {
      const sessionData = buildSessionData();
      saveLastSession(sessionData);
      saveDraftSession();
      const message = buildOutgoingMessageSync();
      if (!message) return;

      setPreparedMessage(message);
      await sendSessionToBackend(sessionData);
      openWhatsAppWithMessage(message);
      markFirstSubmitDone();
      refreshPreview();
      playSendFeedback();
      showSendNotice();
      setValidationNotice("");
    } finally {
      sendBtn.disabled = false;
    }
  });

  resetBtn?.addEventListener("click", () => {
    form?.reset();
    clearDraftSession();
    invalidatePreparedMessage();
    Object.keys(NUMERIC_RULES).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setCustomValidity("");
    });
    setValidationNotice("");
    hideTransientNotice(sendNotice);
    hideTransientNotice(copyNotice);
    syncBoardSizeOptions();
    syncBrandCustomUI();
    syncModelUI();
    refreshPreview();
  });

  copyMessageBtn?.addEventListener("click", async () => {
    try {
      const message = lastPreparedMessage || buildOutgoingMessageSync();
      if (!message) {
        showTransientNotice(copyNotice, t("copy_notice_empty"));
        return;
      }

      const copied = await copyTextToClipboard(message);
      if (!copied) throw new Error("copy_failed");

      setPreparedMessage(message);
      showTransientNotice(copyNotice, t("copy_notice_success"));
    } catch (_) {
      showTransientNotice(copyNotice, t("copy_notice_failure"));
    }
  });

  try {
    currentLang = localStorage.getItem("rdk_lang") || "it";
  } catch (_) {
    currentLang = "it";
  }

  applyTranslations(translations[currentLang] ? currentLang : "it");
  if (!restoreDraftSession()) {
    syncBrandCustomUI();
    syncModelUI();
    refreshPreview();
  }
})();
