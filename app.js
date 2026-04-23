"use strict";

(() => {
  const translations = window.RDK_TRANSLATIONS || {};
  if (!translations.en) return;

  const WHATSAPP_NUMBER = "393345280521";
  const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyBvRK58kLL13TwOPPNqyAmNn-eRb-lYKzHsfKr1OG0UAVzHzyhG1l2T_svP_it3IICag/exec";
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
  const LS_PENDING_LOCAL_SUBMIT = "pending_local_submit";
  const LS_PENDING_GOOGLE_SUBMIT = "pending_google_submit";
  const SESSION_ID_MONTH_CODES = ["ge", "fe", "ma", "ap", "mg", "gi", "lu", "ag", "se", "ot", "no", "di"];
  let pendingGoogleSubmit = null;
  let statusModalState = "";
  let statusModalTimerId = 0;
  let isFormSubmitting = false;

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
    "Moto",
    "Nitro",
    "Nitro Apex",
    "Drifter",
    "Drifter Apex",
    "Moto X",
    "Moto X Lite",
    "Moto XL",
    "Moto XL Apex",
    "FX",
    "FX2",
    "Contra"
  ];

  const CRAZYFLY_MODELS = [
    "Sculp",
    "Hyper",
    "Nuke"
  ];

  const DUOTONE_MODELS = [
    "Evo",
    "Evo SLS / D-Lab",
    "Evo SLS",
    "Evo D/Lab",
    "Evo Concept Blue",
    "Rebel",
    "Rebel SLS / D-Lab",
    "Rebel SLS",
    "Rebel D/Lab",
    "Neo",
    "Neo SLS",
    "Neo D/Lab",
    "Dice",
    "Juice",
    "Juice Dlab",
    "Juice D/Lab",
    "Vegas",
    "Vegas Concept Blue",
    "Vegas D/Lab",
    "Mono",
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
    "XR",
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
    "GTS",
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
    "Bandit S",
    "Bandit-S",
    "Breeze",
    "Bullit",
    "Diablo",
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
    "Triad",
    "Psycho",
    "Dash",
    "Ride",
    "Slash",
    "Boxer",
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
    "Alpha",
    "Catalyst",
    "Vortex",
    "AMP",
    "Reo",
    "Zephyr",
    "Zephyr Ultra-X",
    "Chrono",
    "Chrono V5",
    "Hyperlink"
  ];

  const RRD_MODELS = [
    "Addiction",
    "Emotion",
    "Obsession",
    "Obsession Gold",
    "Passion",
    "Passion Y30",
    "Religion",
    "Passion LW Y30",
    "Vision",
    "Vision Y27",
    "Religion Y30"
  ];

  const SLINGSHOT_MODELS = [
    "Rally GT",
    "Code",
    "Code V2",
    "Code NXT",
    "Rally",
    "Ghost",
    "Ghost V3",
    "SST",
    "UFO",
    "RPM",
    "RPX",
    "Mistral"
  ];

  const BOARD_SIZE_BY_TYPE = {
    twintip: [
      "125x38", "129x38", "130x39", "132x39", "133x39", "133x40",
      "134x39", "134x40", "135x40", "136x40", "136x40.5", "137x40",
      "137x40.5",
      "137x41", "138x41",
      "138x42", "139x41", "139x42", "140x41", "140x42", "141x41",
      "141x42",
      "142x42", "144x41.5", "144x44", "145x43", "146x43", "147x44",
      "148x45", "150x45", "150x46", "160x45", "160x46"
    ],
    surfboard: [
      "5'0", "5'1", "5'2", "5'3", "5'4", "5'5", "5'6", "5'7", "5'8",
      "5'9", "5'10", "5'11", "6'0", "6'1", "6'2", "6'3", "6'4"
    ],
    foil: [
      "50", "60", "65", "70", "75", "80", "85", "90", "95", "100",
      "104", "110", "120", "130", "140", "150"
    ]
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
  const sendBtn = document.getElementById("sendBtn");
  const validationNotice = document.getElementById("validationNotice");
  const installBanner = document.getElementById("installBanner");
  const shareAppBtn = document.getElementById("shareAppBtn");
  const shareAppStatus = document.getElementById("shareAppStatus");
  const statusModal = document.getElementById("statusModal");
  const statusModalTitle = document.getElementById("statusModalTitle");
  const statusModalBody = document.getElementById("statusModalBody");
  const statusModalSpinner = document.getElementById("statusModalSpinner");
  const statusModalClose = document.getElementById("statusModalClose");
  const flagButtons = Array.from(document.querySelectorAll(".flag-btn[data-lang]"));

  let currentLang = "it";
  let sendAudioCtx = null;

  function lockSubmitState(reason = "submit"){
    isFormSubmitting = true;
    if (sendBtn) sendBtn.disabled = true;
    console.log("SUBMIT START", reason);
  }

  function unlockSubmitState(reason = "submit"){
    isFormSubmitting = false;
    if (sendBtn) sendBtn.disabled = false;
    console.log("UNLOCK", reason);
  }

  function t(key){
    const pack = translations[currentLang] || translations.en;
    return pack[key] ?? translations.en[key] ?? "";
  }

  function shuffleInPlace(arr){
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function rotateCommunityExamples(){
    const lines = Array.from(document.querySelectorAll('.community-line[data-i18n^="community_example_"]'));
    if (!lines.length) return;

    const entries = lines
      .map((el) => ({ el, key: el.getAttribute("data-i18n") || "" }))
      .filter((item) => Boolean(item.key));

    if (!entries.length) return;

    const spotNames = ["Punta Trettu", "Stagnone", "Is Solinas"];
    const keyToText = (key) => t(key);

    const pickedKeys = new Set();
    const fixedPicks = [];

    spotNames.forEach((spot) => {
      const variants = entries
        .map((item) => item.key)
        .filter((key) => keyToText(key).includes(spot));

      if (!variants.length) return;

      shuffleInPlace(variants);
      const chosen = variants[0];
      if (!pickedKeys.has(chosen)) {
        pickedKeys.add(chosen);
        fixedPicks.push(chosen);
      }
    });

    const remaining = entries
      .map((item) => item.key)
      .filter((key) => !pickedKeys.has(key));

    shuffleInPlace(remaining);
    const randomPicks = remaining.slice(0, Math.max(0, 8 - fixedPicks.length));

    const finalKeys = [...fixedPicks, ...randomPicks].slice(0, 8);
    shuffleInPlace(finalKeys);

    entries.forEach(({ el }) => {
      el.style.display = "none";
    });

    finalKeys.forEach((key, idx) => {
      if (!entries[idx]) return;
      const { el } = entries[idx];
      el.textContent = keyToText(key);
      el.style.display = "";
    });
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
    window.dispatchEvent(new CustomEvent("rdk:first-submit-done"));
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

  function loadPendingLocalSubmit(){
    const pending = loadStoredJson(LS_PENDING_LOCAL_SUBMIT);
    if (!pending || typeof pending !== "object") return null;
    if (!pending.payload || typeof pending.payload !== "object") return null;
    return pending;
  }

  function savePendingLocalSubmit(payload){
    return storeJson(LS_PENDING_LOCAL_SUBMIT, {
      state: "pending_local_submit",
      created_at: new Date().toISOString(),
      session_id: payload?.session_id || "",
      technical_id: payload?.technical_id || "",
      src: payload?.src || "",
      payload
    });
  }

  function clearPendingLocalSubmit(){
    removeStoredValue(LS_PENDING_LOCAL_SUBMIT);
  }

  function hideStatusModal({ enableSend = true } = {}){
    if (!statusModal) return;
    window.clearTimeout(statusModalTimerId);
    statusModalTimerId = 0;
    statusModalState = "";
    statusModal.hidden = true;
    statusModal.setAttribute("aria-hidden", "true");
    statusModal.classList.remove("status-modal--pending", "status-modal--success", "status-modal--error");
    document.body.classList.remove("modal-open");
    if (enableSend && sendBtn) {
      sendBtn.disabled = false;
    }
  }

  function renderStatusModal(state = "pending"){
    if (!statusModal) return;
    const modalCopyByState = {
      pending: {
        title: "status_modal_pending_title",
        body: "",
        className: "status-modal--pending",
        showSpinner: true,
        showClose: false
      },
      success: {
        title: "send_notice_success_title",
        body: "send_notice_success_body",
        className: "status-modal--success",
        showSpinner: false,
        showClose: false
      },
      probable: {
        title: "send_notice_success_title",
        body: "send_notice_success_body",
        className: "status-modal--success",
        showSpinner: false,
        showClose: false
      },
      error: {
        title: "send_notice_error_title",
        body: "send_notice_error_body",
        className: "status-modal--error",
        showSpinner: false,
        showClose: true
      }
    };
    const normalizedState = modalCopyByState[state] ? state : "pending";
    const modalCopy = modalCopyByState[normalizedState];

    statusModalState = normalizedState;
    statusModal.classList.remove("status-modal--pending", "status-modal--success", "status-modal--error");
    statusModal.classList.add(modalCopy.className);
    statusModal.setAttribute("aria-hidden", "false");
    if (statusModalTitle) {
      statusModalTitle.textContent = t(modalCopy.title);
    }
    if (statusModalBody) {
      const bodyText = modalCopy.body ? t(modalCopy.body) : "";
      statusModalBody.textContent = bodyText;
      statusModalBody.hidden = !bodyText;
    }
    if (statusModalSpinner) {
      statusModalSpinner.hidden = !modalCopy.showSpinner;
    }
    if (statusModalClose) {
      statusModalClose.hidden = !modalCopy.showClose;
    }
  }

  function showStatusModal(state = "pending"){
    if (!statusModal) return;
    window.clearTimeout(statusModalTimerId);
    statusModalTimerId = 0;
    renderStatusModal(state);
    statusModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function scheduleStatusModalClose(delayMs = 1800){
    if (!statusModal) {
      if (sendBtn) sendBtn.disabled = false;
      return;
    }
    window.clearTimeout(statusModalTimerId);
    statusModalTimerId = window.setTimeout(() => {
      hideStatusModal({ enableSend: true });
    }, delayMs);
  }

  function hidePostSubmitPanel(){
    if (!installBanner) return;
    installBanner.hidden = true;
    if (shareAppStatus) {
      shareAppStatus.textContent = "";
      shareAppStatus.hidden = true;
    }
  }

  function showPostSubmitPanel(){
    if (!installBanner) return;
    installBanner.hidden = false;
  }

  function renderUIState(uiState){
    const state = typeof uiState === "string" ? { name: uiState } : uiState || {};

    if (state.name === "submit_prepare") {
      hideStatusModal({ enableSend: false });
      hidePostSubmitPanel();
      setValidationNotice("");
      clearInvalidFieldHighlights();
      return;
    }

    if (state.name === "submit_pending") {
      showStatusModal("pending");
      return;
    }

    if (state.name === "post_submit_panel") {
      showPostSubmitPanel();
      return;
    }

    if (state.name === "submit_result") {
      showStatusModal(state.status);
      setValidationNotice("");
      return;
    }

    if (state.name === "submit_message_empty") {
      hideStatusModal({ enableSend: false });
      setValidationNotice("");
      return;
    }

    if (state.name === "submit_error") {
      setValidationNotice("");
      showStatusModal("error");
      return;
    }

    if (state.name === "submit_autoclose") {
      scheduleStatusModalClose(state.delayMs);
    }
  }

  function setShareAppStatus(message, translationKey = ""){
    if (!shareAppStatus) return;
    if (!message) {
      shareAppStatus.textContent = "";
      shareAppStatus.removeAttribute("data-i18n-status");
      shareAppStatus.hidden = true;
      return;
    }
    shareAppStatus.textContent = message;
    if (translationKey) {
      shareAppStatus.setAttribute("data-i18n-status", translationKey);
    } else {
      shareAppStatus.removeAttribute("data-i18n-status");
    }
    shareAppStatus.hidden = false;
  }

  async function copyTextFallback(text){
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "true");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    helper.setSelectionRange(0, helper.value.length);
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) {
      throw new Error("share_copy_failed");
    }
  }

  async function handleShareApp(){
    const shareUrl = window.location.href;
    const shareData = {
      title: document.title || t("pageTitle"),
      text: t("share_app_text"),
      url: shareUrl
    };

    try {
      if (typeof window.navigator.share === "function") {
        await window.navigator.share(shareData);
        setShareAppStatus(t("share_app_status_shared"), "share_app_status_shared");
        return;
      }

      if (window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(shareUrl);
        setShareAppStatus(t("share_app_status_copied"), "share_app_status_copied");
        return;
      }

      await copyTextFallback(shareUrl);
      setShareAppStatus(t("share_app_status_copied"), "share_app_status_copied");
    } catch (error) {
      if (error?.name === "AbortError") return;
      setShareAppStatus(t("share_app_status_failed"), "share_app_status_failed");
    }
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

  function getHumanFieldLabel(el){
    if (!el) return "";
    const id = el.getAttribute?.("id") || "";
    if (!id) return "";
    const escaped = window.CSS?.escape ? window.CSS.escape(id) : id.replace(/"/g, "\\\"");
    const label = document.querySelector(`label[for="${escaped}"]`);
    if (!label) return "";
    return String(label.textContent || "")
      .replace(/\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function clearFirstInvalidHighlight(){
    if (!form) return;
    form.querySelectorAll(".first-invalid").forEach((el) => el.classList.remove("first-invalid"));
  }

  function clearInvalidFieldHighlights(){
    if (!form) return;
    form.querySelectorAll(".invalid-field").forEach((el) => el.classList.remove("invalid-field"));
    clearFirstInvalidHighlight();
  }

  function listInvalidFields(){
    if (!form) return [];
    return Array.from(form.querySelectorAll("input:invalid, select:invalid, textarea:invalid"));
  }

  function markInvalidFields(invalidFields){
    if (!form) return;
    clearInvalidFieldHighlights();
    invalidFields.forEach((el) => el.classList.add("invalid-field"));
    if (invalidFields[0]) invalidFields[0].classList.add("first-invalid");
  }

  function focusFirstInvalidField(){
    if (!form) return null;
    clearFirstInvalidHighlight();

    const invalid = form.querySelector("input:invalid, select:invalid, textarea:invalid");
    if (!invalid) return null;

    invalid.classList.add("first-invalid");
    try {
      invalid.focus({ preventScroll: true });
    } catch (_) {
      try { invalid.focus(); } catch (_) {}
    }
    try {
      invalid.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) {
      try { invalid.scrollIntoView(true); } catch (_) {}
    }
    return invalid;
  }

  function requiredFieldsCountMessage(count){
    if (!count) return "";
    if (count === 1) return "Manca 1 campo obbligatorio.";
    return `Mancano ${count} campi obbligatori.`;
  }

  function applyTranslations(lang){
    lang = String(lang || "en").split("-")[0];
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

    rotateCommunityExamples();

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", t(key));
    });

    if (statusModal && !statusModal.hidden) {
      renderStatusModal(statusModalState || "pending");
    }
    if (shareAppStatus && !shareAppStatus.hidden) {
      setShareAppStatus(shareAppStatus.getAttribute("data-i18n-status") ? t(shareAppStatus.getAttribute("data-i18n-status")) : shareAppStatus.textContent);
    }

    syncFlagUI();
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

  function decideNumericValidationKind(raw, required, min, max){
    const normalized = String(raw || "").trim();

    if (!normalized) {
      return required ? "required" : "ok";
    }

    if (!/^\d+$/.test(normalized)) {
      return "integer";
    }

    const value = Number(normalized);
    if (!Number.isInteger(value) || value < min || value > max) {
      return "range";
    }

    return "ok";
  }

  function validateNumericField(id){
    const el = document.getElementById(id);
    const rule = NUMERIC_RULES[id];
    if (!el || !rule) return true;

    const raw = String(el.value || "").trim();
    let message = "";

    const validationKind = decideNumericValidationKind(raw, el.required, rule.min, rule.max);

    if (validationKind === "required") {
      const requiredKey = id === "wind" ? "validation_required_wind" : "validation_required";
      message = interpolate(t(requiredKey), { field: t(rule.labelKey) });
    } else if (validationKind === "integer") {
      message = interpolate(t("validation_integer"), { field: t(rule.labelKey) });
    } else if (validationKind === "range") {
      message = interpolate(t("validation_range"), {
        field: t(rule.labelKey),
        min: rule.min,
        max: rule.max
      });
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

  function randomRdkId(length = 10){
    const size = typeof length === "number" && length > 0 ? Math.floor(length) : 10;
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const chars = [];

    if (window.crypto?.getRandomValues) {
      const buffer = new Uint8Array(size);
      window.crypto.getRandomValues(buffer);
      for (let i = 0; i < size; i += 1) {
        chars.push(alphabet[buffer[i] % alphabet.length]);
      }
    } else {
      for (let i = 0; i < size; i += 1) {
        chars.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
      }
    }

    return chars.join("");
  }

  function padSessionIdPart(value){
    return String(value).padStart(2, "0");
  }

  function getRomeSessionIdParts(){
    const now = new Date();

    if (window.Intl?.DateTimeFormat) {
      try {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Rome",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).formatToParts(now);
        const values = {};
        parts.forEach(({ type, value }) => {
          if (type !== "literal") values[type] = value;
        });

        const monthIndex = Number(values.month) - 1;
        if (SESSION_ID_MONTH_CODES[monthIndex]) {
          return {
            day: values.day,
            monthCode: SESSION_ID_MONTH_CODES[monthIndex],
            hour: values.hour,
            minute: values.minute,
            yearDigit: String(values.year).slice(-1)
          };
        }
      } catch (_) {}
    }

    return {
      day: padSessionIdPart(now.getDate()),
      monthCode: SESSION_ID_MONTH_CODES[now.getMonth()] || "xx",
      hour: padSessionIdPart(now.getHours()),
      minute: padSessionIdPart(now.getMinutes()),
      yearDigit: String(now.getFullYear()).slice(-1)
    };
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
    const ts = rdkTimestampRfc3339();

    let block = `${body}\n---\nTS: ${ts}`;
    const sig = generateSignatureSync(block);
    block += `\nSIG: ${sig}\n---`;
    return block;
  }

  function canonicalValue(group, value){
    return CANONICAL_VALUES[group]?.[value] || value;
  }

  // ADDED: session id
  function generateSessionId() {
    const parts = getRomeSessionIdParts();
    return `${parts.day}${parts.monthCode}${parts.hour}${parts.minute}${parts.yearDigit}${randomRdkId(4)}`;
  }

  function generateTechnicalId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID().replace(/-/g, "");
    }

    if (window.crypto?.getRandomValues) {
      const buffer = new Uint8Array(16);
      window.crypto.getRandomValues(buffer);
      return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    return `${Date.now().toString(36)}${randomRdkId(20)}`;
  }

  function generateMessageId(formData) {
    const stableParts = [
      formData.session_id,
      formData.technical_id,
      formData.event_ts,
      formData.src,
      formData.weight,
      formData.gender,
      formData.board,
      formData.boardSize,
      formData.level,
      formData.kite,
      formData.wind,
      formData.brand,
      formData.model,
      formData.location,
      formData.water,
      formData.result,
      formData.note
    ].map((value) => value == null ? "" : String(value)).join("\u001f");
    const digest = `${signatureDigestHex(stableParts)}${signatureDigestHex([...stableParts].reverse().join(""))}`;
    const sourceId = String(formData.technical_id || formData.session_id || "").slice(0, 12);
    return `msg_${digest}_${sourceId}`;
  }

  function collectFormData(){
    const boardSizeSelection = val("boardSize");
    const eventTimestamp = new Date().toISOString();

    const formData = {
      session_id: generateSessionId(),
      technical_id: generateTechnicalId(),
      event_ts: eventTimestamp,
      src: "form_v1",
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
      ts: eventTimestamp
    };
    formData.message_id = generateMessageId(formData);

    Object.defineProperties(formData, {
      __boardText: { value: selectedText("board") },
      __levelText: { value: selectedText("level") },
      __waterText: { value: selectedText("water") },
      __resultText: { value: selectedText("result") }
    });

    return formData;
  }

  function buildSessionData(){
    return collectFormData();
  }

  function buildPayload(formData){
    return formData;
  }

  async function submitPayload(payload){
    const response = await fetch("http://127.0.0.1:8000/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error("local_submit_error");
    }
    const result = await response.json();
    if (result?.ok !== true || result?.durable !== true) {
      throw new Error("local_submit_error");
    }
    return result;
  }

  function clearPendingGoogleSubmit(){
    try {
      window.localStorage.removeItem(LS_PENDING_GOOGLE_SUBMIT);
    } catch (_) {}
  }

  // ADDED: postMessage confirmation
  window.addEventListener("message", function(event) {
    if (!pendingGoogleSubmit) return;
    if (pendingGoogleSubmit.frameWindow && event.source !== pendingGoogleSubmit.frameWindow) return;
    if (pendingGoogleSubmit.settled) return;
    if (!event.data) return;

    if (event.data.ok === false) {
      pendingGoogleSubmit.settled = true;
      pendingGoogleSubmit.cleanup();
      pendingGoogleSubmit.reject(new Error("google_submit_error"));
      pendingGoogleSubmit = null;
      return;
    }

    if (event.data.ok !== true) return;

    if (event.data.duplicate) {
      console.log("Duplicate ignored");
    } else {
      console.log("Saved");
    }
    pendingGoogleSubmit.settled = true;
    pendingGoogleSubmit.cleanup();
    pendingGoogleSubmit.resolve(event.data);
    pendingGoogleSubmit = null;
  });

  window.addEventListener("pageshow", function() {
    pendingGoogleSubmit = null;
    hideStatusModal({ enableSend: true });
    unlockSubmitState("pageshow");
  });

  async function submitSessionToGoogleSheets(sessionData){
    if (!GOOGLE_SHEETS_WEBHOOK_URL) return false;

    const targetName = `rdk-google-submit-${Date.now()}`;
    const iframe = document.createElement("iframe");
    const postForm = document.createElement("form");
    const payload = {
      session_id: sessionData.session_id,
      technical_id: sessionData.technical_id,
      event_ts: sessionData.event_ts || sessionData.ts || "",
      src: sessionData.src,
      peso_kg: sessionData.weight,
      gender: sessionData.gender,
      tavola_tipo: sessionData.board,
      tavola_misura: sessionData.boardSize,
      livello: sessionData.level,
      kite_m2: sessionData.kite,
      marca: sessionData.brand,
      modello: sessionData.model,
      vento_kn: sessionData.wind,
      spot: sessionData.location,
      acqua: sessionData.water,
      risultato: sessionData.result,
      note: sessionData.note
    };

    return await new Promise((resolve, reject) => {
      const timeoutMs = 25000;
      const loadGraceMs = 1500;
      let submitted = false;
      let loadFailTimeoutId = 0;
      const cleanup = () => {
        iframe.removeEventListener("load", handleLoad);
        window.clearTimeout(timeoutId);
        window.clearTimeout(loadFailTimeoutId);
        postForm.remove();
        iframe.remove();
      };

      const handleLoad = () => {
        if (!submitted || requestState.settled) return;
        try {
          if (iframe.contentWindow?.location?.href === "about:blank") return;
        } catch (_) {}

        window.clearTimeout(loadFailTimeoutId);
        loadFailTimeoutId = window.setTimeout(() => {
          if (requestState.settled) return;
          requestState.settled = true;
          cleanup();
          if (pendingGoogleSubmit === requestState) {
            pendingGoogleSubmit = null;
          }
          resolve({ ok: false, probable: true, source: "iframe_load" });
        }, loadGraceMs);
      };

      const requestState = {
        cleanup,
        frameWindow: null,
        reject,
        resolve,
        settled: false
      };

      const timeoutId = window.setTimeout(() => {
        if (requestState.settled) return;
        requestState.settled = true;
        cleanup();
        if (pendingGoogleSubmit === requestState) {
          pendingGoogleSubmit = null;
        }
        reject(new Error("google_submit_timeout"));
      }, timeoutMs);

      iframe.hidden = true;
      iframe.name = targetName;
      iframe.setAttribute("aria-hidden", "true");
      iframe.addEventListener("load", handleLoad);

      postForm.method = "POST";
      postForm.action = GOOGLE_SHEETS_WEBHOOK_URL;
      postForm.target = targetName;
      postForm.hidden = true;

      Object.entries(payload).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value == null ? "" : String(value);
        postForm.appendChild(input);
      });

      document.body.appendChild(iframe);
      document.body.appendChild(postForm);
      requestState.frameWindow = iframe.contentWindow;
      pendingGoogleSubmit = requestState;
      submitted = true;
      postForm.submit();
    });
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

  function resetFormAfterSuccessfulSubmit(){
    form?.reset();
    clearDraftSession();
    Object.keys(NUMERIC_RULES).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setCustomValidity("");
    });
    setValidationNotice("");
    syncBoardSizeOptions();
    syncBrandCustomUI();
    syncModelUI();
    refreshPreview();
  }

  function buildCoreMessage(formData){
    const useFormData = formData && typeof formData === "object";
    const weight = useFormData ? String(formData.weight || "").trim() : val("weight");
    const board = useFormData ? String(formData.board || "").trim() : val("board");
    const boardSizeSelection = useFormData ? String(formData.boardSize || "").trim() : val("boardSize");
    const boardSize = useFormData ? boardSizeSelection : boardSizeSelection === BOARD_SIZE_OTHER ? val("boardSizeCustom") : boardSizeSelection;
    const level = useFormData ? String(formData.level || "").trim() : val("level");
    const kite = useFormData ? String(formData.kite || "").trim() : val("kite");
    const brand = useFormData ? String(formData.brand || "").trim() : getBrandValue();
    const model = useFormData ? String(formData.model || "").trim() : getModelValue();
    const wind = useFormData ? String(formData.wind || "").trim() : val("wind");
    const location = useFormData ? String(formData.location || "").trim() : val("location");
    const water = useFormData ? String(formData.water || "").trim() : val("water");
    const result = useFormData ? String(formData.result || "").trim() : val("result");
    const note = useFormData ? String(formData.note || "").trim() : val("note");
    const boardText = useFormData ? String(formData.__boardText || "").trim() : selectedText("board");
    const levelText = useFormData ? String(formData.__levelText || "").trim() : selectedText("level");
    const waterText = useFormData ? String(formData.__waterText || "").trim() : selectedText("water");
    const resultText = useFormData ? String(formData.__resultText || "").trim() : selectedText("result");

    const lines = [];
    if (weight) lines.push(`⚖️ ${CANONICAL_LABELS.weight}: ${weight}`);
    if (board) lines.push(`🪵 ${CANONICAL_LABELS.board}: ${boardText || board}`);
    if (boardSize) lines.push(`🪵 ${CANONICAL_LABELS.boardSize}: ${boardSize}`);
    if (level) lines.push(`🎯 ${CANONICAL_LABELS.level}: ${levelText || level}`);
    if (kite) lines.push(`🪁 ${CANONICAL_LABELS.kite}: ${kite}`);
    if (brand) lines.push(`🏷️ ${CANONICAL_LABELS.brand}: ${brand}`);
    if (model) lines.push(`🪁 ${CANONICAL_LABELS.model}: ${model}`);
    if (wind) lines.push(`🌬️ ${CANONICAL_LABELS.wind}: ${wind}`);
    if (location) lines.push(`📍 ${CANONICAL_LABELS.location}: ${location}`);
    if (water) lines.push(`🌊 ${CANONICAL_LABELS.water}: ${waterText || water}`);
    if (result) lines.push(`✅ ${CANONICAL_LABELS.result}: ${resultText || result}`);
    if (note) lines.push(`${CANONICAL_LABELS.notes}: ${note}`);

    return lines.join("\n");
  }

  function buildOutgoingBody(formData){
    const core = buildCoreMessage(formData);
    if (!core) return "";
    if (hasFirstSubmitDone()) return core;
    return `${t("first_submit_prefix")}\n\n${core}`;
  }

  function buildOutgoingMessageSync(formData){
    const body = buildOutgoingBody(formData);
    if (!body) return "";
    return appendTechnicalBlockSync(body);
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

  function openWhatsAppWithMessage(message){
    const number = String(WHATSAPP_NUMBER).replace(/\D/g, "");
    const encoded = encodeURIComponent(String(message || ""));
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
      hideStatusModal();
      hidePostSubmitPanel();
      saveDraftSession();
    };

    el.addEventListener("input", persistDraft);
    el.addEventListener("change", persistDraft);
  }

  Object.keys(NUMERIC_RULES).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      hideStatusModal();
      hidePostSubmitPanel();
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

  statusModalClose?.addEventListener("click", () => {
    hideStatusModal({ enableSend: true });
  });

  shareAppBtn?.addEventListener("click", () => {
    handleShareApp();
  });

  async function handleFormSubmit(e) {
    e.preventDefault();

    if (isFormSubmitting) {
      console.log("SUBMIT START", "blocked_already_submitting");
      return;
    }

    if (form) form.classList.add("was-submitted");

    const valid = validateFormFields({ showNotice: true });
    const htmlValid = Boolean(form?.checkValidity?.());
    if (!valid || !htmlValid) {
      const invalidFields = listInvalidFields();
      markInvalidFields(invalidFields);

      const invalidEl = invalidFields[0] || focusFirstInvalidField();
      if (invalidEl) {
        try {
          invalidEl.focus({ preventScroll: true });
        } catch (_) {
          try { invalidEl.focus(); } catch (_) {}
        }
        try {
          invalidEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (_) {
          try { invalidEl.scrollIntoView(true); } catch (_) {}
        }
      }

      const label = getHumanFieldLabel(invalidEl);
      const count = invalidFields.length;

      if (label) {
        setValidationNotice(`Manca un campo obbligatorio: ${label}`);
      } else {
        setValidationNotice(requiredFieldsCountMessage(count) || "Compila tutti i campi obbligatori evidenziati in rosso.");
      }
      return;
    }

    renderUIState({ name: "submit_prepare" });
    lockSubmitState("form_submit");
    renderUIState({ name: "submit_pending" });

    let sessionDataToSend = null;
    let message = "";
    let shouldAutoCloseModal = false;
    let shouldOpenWhatsApp = false;
    let localDurableConfirmed = false;

    try {
      const pendingLocalSubmit = loadPendingLocalSubmit();
      const formData = pendingLocalSubmit?.payload || collectFormData();
      const payload = pendingLocalSubmit?.payload || buildPayload(formData);
      if (!pendingLocalSubmit && !savePendingLocalSubmit(payload)) {
        throw new Error("local_pending_error");
      }
      await submitPayload(payload);
      localDurableConfirmed = true;
      clearPendingLocalSubmit();
      sessionDataToSend = payload;
      clearPendingGoogleSubmit();
      saveLastSession(sessionDataToSend);
      saveDraftSession();
      message = buildOutgoingMessageSync(payload);
      if (!message) {
        throw new Error("submit_message_empty");
      }

      console.log("Submitting:", sessionDataToSend);
      const submitResult = await submitSessionToGoogleSheets(sessionDataToSend);
      const isCertainSuccess = submitResult?.ok === true;
      const isProbableSuccess = submitResult?.probable === true;

      if (!isCertainSuccess && !isProbableSuccess) {
        throw new Error("google_submit_error");
      }

      console.log("Sent session_id:", sessionDataToSend.session_id);
      markFirstSubmitDone();
      renderUIState({ name: "post_submit_panel" });
      playSendFeedback();
      renderUIState({ name: "submit_result", status: isCertainSuccess ? "success" : "probable" });
      shouldAutoCloseModal = true;
      shouldOpenWhatsApp = true;
    } catch (error) {
      console.error(error);
      if (error?.message === "submit_message_empty") {
        renderUIState({ name: "submit_message_empty" });
      } else {
        renderUIState({ name: "submit_error" });
      }
    } finally {
      clearPendingGoogleSubmit();
      if (localDurableConfirmed) {
        resetFormAfterSuccessfulSubmit();
      }
      console.log("SUBMIT END");
      unlockSubmitState("finally");
      if (shouldAutoCloseModal) {
        renderUIState({ name: "submit_autoclose", delayMs: 2200 });
      }
      if (shouldOpenWhatsApp && message) {
        openWhatsAppWithMessage(message);
      }
    }
  }

  if (form) {
    if (window.__rdkFormSubmitHandler) {
      form.removeEventListener("submit", window.__rdkFormSubmitHandler);
    }
    form.addEventListener("submit", handleFormSubmit);
    window.__rdkFormSubmitHandler = handleFormSubmit;
    window.__formListenerAttached = true;

    const clearInvalidOnInput = () => {
      if (!form.classList.contains("was-submitted")) return;

      const invalidFields = listInvalidFields();
      markInvalidFields(invalidFields);

      if (form.checkValidity()) {
        setValidationNotice("");
        return;
      }

      if (!validationNotice?.textContent) {
        setValidationNotice(requiredFieldsCountMessage(invalidFields.length) || "Compila tutti i campi obbligatori evidenziati in rosso.");
      }
    };
    form.addEventListener("input", clearInvalidOnInput);
    form.addEventListener("change", clearInvalidOnInput);
  }

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
