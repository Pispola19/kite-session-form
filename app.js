"use strict";

(() => {
  const translations = window.RDK_TRANSLATIONS || {};
  if (!translations.en) return;

  const WHATSAPP_NUMBER = "393345280521";
  const BOARD_SIZE_OTHER = "__rdk_other__";
  const BRAND_OTHER = "__brand_other__";
  const MODEL_OTHER = "__model_other__";
  const DUOTONE_BRAND = "Duotone Kiteboarding";
  const LS_FIRST_SUBMIT = "rdk_first_submit";

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
  const sendNotice = document.getElementById("sendNotice");
  const validationNotice = document.getElementById("validationNotice");
  const flagButtons = Array.from(document.querySelectorAll(".flag-btn[data-lang]"));

  let currentLang = "it";
  let sendAudioCtx = null;

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

  function getDuotoneModelValue(){
    const modelSelect = document.getElementById("modelSelect");
    if (!modelSelect) return "";
    if (modelSelect.value === MODEL_OTHER) return val("modelCustom");
    return val("modelSelect");
  }

  function syncModelUI(){
    const modelInput = document.getElementById("model");
    const modelSelect = document.getElementById("modelSelect");
    const modelCustom = document.getElementById("modelCustom");
    const showDuotoneModels = val("brand") === DUOTONE_BRAND;

    if (!modelInput || !modelSelect || !modelCustom) return;

    if (showDuotoneModels) {
      const typedModel = String(modelInput.value || "").trim();
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
    }

    const selectedModel = getDuotoneModelValue();
    if (selectedModel) modelInput.value = selectedModel;

    modelInput.hidden = false;
    modelSelect.hidden = true;
    modelSelect.value = "";
    modelCustom.hidden = true;
    modelCustom.value = "";
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
    if (val("brand") === DUOTONE_BRAND) return getDuotoneModelValue();
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

  async function sha256Hex(text){
    if (window.crypto?.subtle) {
      const data = new TextEncoder().encode(text);
      const digest = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  async function generateSignature(text){
    const digest = await sha256Hex(text);
    return digest.slice(0, 10);
  }

  async function appendTechnicalBlock(body){
    const id = randomRdkId();
    const ts = rdkTimestampRfc3339();

    let block = `${body}\n---\nID: ${id}\nTS: ${ts}\nSRC: rdk_v1`;
    const sig = await generateSignature(block);
    block += `\nSIG: ${sig}\n---`;
    return block;
  }

  function canonicalValue(group, value){
    return CANONICAL_VALUES[group]?.[value] || value;
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
    if (!sendNotice) return;
    sendNotice.textContent = t("send_notice");
    sendNotice.style.display = "block";
    window.setTimeout(() => {
      sendNotice.style.display = "none";
    }, 2600);
  }

  function openWhatsAppWithMessage(message){
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function bindPreviewField(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", refreshPreview);
    el.addEventListener("change", refreshPreview);
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
      const body = buildOutgoingBody();
      const message = await appendTechnicalBlock(body);

      markFirstSubmitDone();
      refreshPreview();
      playSendFeedback();
      showSendNotice();
      openWhatsAppWithMessage(message);
      setValidationNotice("");
    } finally {
      sendBtn.disabled = false;
    }
  });

  resetBtn?.addEventListener("click", () => {
    form?.reset();
    Object.keys(NUMERIC_RULES).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setCustomValidity("");
    });
    setValidationNotice("");
    syncBoardSizeOptions();
    syncBrandCustomUI();
    syncModelUI();
    refreshPreview();
  });

  try {
    currentLang = localStorage.getItem("rdk_lang") || "it";
  } catch (_) {
    currentLang = "it";
  }

  applyTranslations(translations[currentLang] ? currentLang : "it");
  syncBrandCustomUI();
  syncModelUI();
})();
