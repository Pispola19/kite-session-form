var FIXED_SCHEMA = [
  "timestamp",
  "event_ts",
  "ingest_ts",
  "ID",
  "technical_id",
  "session_id_raw",
  "src",
  "weight",
  "gender",
  "board",
  "board_size",
  "level",
  "kite_size",
  "wind",
  "brand",
  "model",
  "location",
  "water",
  "result",
  "note"
];

var LABEL_TO_FIELD = {
  "ID": "ID",
  "Technical ID": "technical_id",
  "Session ID": "session_id_raw",
  "Event TS": "event_ts",
  "Ingest TS": "ingest_ts",
  "SRC": "src",
  "Weight (kg)": "weight",
  "Gender": "gender",
  "Board type": "board",
  "Board size": "board_size",
  "Level": "level",
  "Kite (m²)": "kite_size",
  "Kite size (m²)": "kite_size",
  "Wind (kts)": "wind",
  "Wind": "wind",
  "Brand": "brand",
  "Model": "model",
  "Spot": "location",
  "Water conditions": "water",
  "Session result": "result",
  "Notes": "note",
  "Note": "note"
};

var HEADER_ALIASES = {
  "timestamp": "timestamp",
  "event_ts": "event_ts",
  "event ts": "event_ts",
  "ingest_ts": "ingest_ts",
  "ingest ts": "ingest_ts",
  "id": "ID",
  "technical_id": "technical_id",
  "technical id": "technical_id",
  "session_id": "session_id_raw",
  "session id": "session_id_raw",
  "session_id_raw": "session_id_raw",
  "session id raw": "session_id_raw",
  "src": "src",
  "weight": "weight",
  "gender": "gender",
  "board": "board",
  "board_size": "board_size",
  "board size": "board_size",
  "level": "level",
  "kite_size": "kite_size",
  "kite size": "kite_size",
  "wind": "wind",
  "brand": "brand",
  "model": "model",
  "location": "location",
  "water": "water",
  "result": "result",
  "note": "note",
  "notes": "note"
};

var FRONTEND_TO_FIELD = {
  "ts": "event_ts",
  "timestamp": "event_ts",
  "ID": "ID",
  "id": "ID",
  "technical_id": "technical_id",
  "session_id": "session_id_raw",
  "session_id_raw": "session_id_raw",
  "event_ts": "event_ts",
  "src": "src",
  "weight": "weight",
  "gender": "gender",
  "board": "board",
  "boardSize": "board_size",
  "board_size": "board_size",
  "level": "level",
  "kite": "kite_size",
  "kite_size": "kite_size",
  "wind": "wind",
  "brand": "brand",
  "model": "model",
  "location": "location",
  "water": "water",
  "result": "result",
  "note": "note"
};

var TECHNICAL_BLOCK_RE = /\n---\nTS:\s*([^\n]+)\nSIG:\s*([a-f0-9]{8,10})\n---\s*$/i;
var LEGACY_TECHNICAL_BLOCK_RE = /\n---\nID:\s*([a-z0-9]{10})\nTS:\s*([^\n]+)\nSRC:\s*([^\n]+)\nSIG:\s*([a-f0-9]{8,10})\n---\s*$/i;

function doGet() {
  return ContentService
    .createTextOutput("WEBHOOK OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var sheet = getTargetSheet_();
    var parsedInput = parseIncomingRequest_(e);
    var record = parsedInput.kind === "json" || parsedInput.kind === "form"
      ? normalizeFrontendPayload_(parsedInput.data)
      : parseWhatsAppMessage_(parsedInput.data);
    var headers = getSheetHeaders_(sheet);
    var ingestDate = new Date();
    var eventTimestamp = cleanValue_(record.event_ts || record.timestamp);
    var storageSeed = cleanValue_(record.technical_id || record.session_id_raw || record.ID);
    var storageId = buildStoredId_(storageSeed);

    record.event_ts = eventTimestamp;
    record.ingest_ts = formatIsoTimestamp_(ingestDate);
    record.timestamp = eventTimestamp || record.ingest_ts;

    if (isDuplicateRecord_(sheet, headers, {
      technical_id: record.technical_id,
      session_id_raw: record.session_id_raw,
      ID: storageId
    })) {
      return postMessageHtmlResponse_(true);
    }

    record.ID = storageId || generateSheetId_();
    record.src = resolveRecordSource_(parsedInput.kind, record.src);

    var row = buildSheetRow_(record, headers);

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);

    // ADDED: postMessage confirmation
    return postMessageHtmlResponse_(false);
  } catch (error) {
    return jsonResponse_(500, {
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function parseIncomingRequest_(e) {
  // ADDED: robust parameter parsing (form + JSON)
  var data = e && e.parameter ? e.parameter : {};
  var body = {};

  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {}
  }

  function getValue(key) {
    return data[key] || body[key] || "";
  }

  var mergedPayload = {};
  Object.keys(FRONTEND_TO_FIELD).forEach(function(key) {
    var value = getValue(key);
    if (value !== "") {
      mergedPayload[key] = value;
    }
  });

  // ADDED: ID and src support
  if (getValue("ID") !== "") mergedPayload.ID = getValue("ID");
  if (getValue("id") !== "") mergedPayload.id = getValue("id");
  if (getValue("session_id") !== "") mergedPayload.session_id = getValue("session_id");
  if (getValue("session_id_raw") !== "") mergedPayload.session_id_raw = getValue("session_id_raw");
  if (getValue("technical_id") !== "") mergedPayload.technical_id = getValue("technical_id");
  if (getValue("event_ts") !== "") mergedPayload.event_ts = getValue("event_ts");
  if (getValue("src") !== "") mergedPayload.src = getValue("src");
  if (getValue("peso_kg") !== "") mergedPayload.peso_kg = getValue("peso_kg");
  if (getValue("tavola_tipo") !== "") mergedPayload.tavola_tipo = getValue("tavola_tipo");
  if (getValue("tavola_misura") !== "") mergedPayload.tavola_misura = getValue("tavola_misura");
  if (getValue("livello") !== "") mergedPayload.livello = getValue("livello");
  if (getValue("kite_m2") !== "") mergedPayload.kite_m2 = getValue("kite_m2");
  if (getValue("marca") !== "") mergedPayload.marca = getValue("marca");
  if (getValue("modello") !== "") mergedPayload.modello = getValue("modello");
  if (getValue("vento_kn") !== "") mergedPayload.vento_kn = getValue("vento_kn");
  if (getValue("spot") !== "") mergedPayload.spot = getValue("spot");
  if (getValue("acqua") !== "") mergedPayload.acqua = getValue("acqua");
  if (getValue("risultato") !== "") mergedPayload.risultato = getValue("risultato");
  if (getValue("note") !== "") mergedPayload.note = getValue("note");

  if (hasKnownFrontendKeys_(mergedPayload)) {
    return {
      kind: "form",
      data: mergedPayload
    };
  }

  var body = extractRequestBody_(e);
  var trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("Empty request body");

  if (trimmed.charAt(0) === "{") {
    return {
      kind: "json",
      data: JSON.parse(trimmed)
    };
  }

  return {
    kind: "whatsapp",
    data: trimmed
  };
}

function extractRequestBody_(e) {
  if (!e || !e.postData || typeof e.postData.contents !== "string") {
    throw new Error("Missing request body");
  }
  return e.postData.contents;
}

function hasKnownFrontendKeys_(payload) {
  return Object.keys(FRONTEND_TO_FIELD).some(function(key) {
    return Object.prototype.hasOwnProperty.call(payload, key);
  });
}

function blankRecord_() {
  var record = {};
  FIXED_SCHEMA.forEach(function(field) {
    record[field] = null;
  });
  return record;
}

function cleanValue_(value) {
  if (value === null || typeof value === "undefined") return null;
  var normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeGender_(value) {
  var normalized = String(value || "").trim().toUpperCase();
  if (normalized === "M" || normalized === "F") return normalized;
  if (normalized === "MALE") return "M";
  if (normalized === "FEMALE") return "F";
  return null;
}

function normalizeFrontendPayload_(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid JSON payload");
  }

  var record = blankRecord_();
  Object.keys(FRONTEND_TO_FIELD).forEach(function(sourceKey) {
    if (!Object.prototype.hasOwnProperty.call(payload, sourceKey)) return;
    var targetKey = FRONTEND_TO_FIELD[sourceKey];
    var value = cleanValue_(payload[sourceKey]);
    if (value === null) return;
    record[targetKey] = targetKey === "gender" ? normalizeGender_(value) : value;
  });

  // ADDED: ITALIAN KEYS SUPPORT
  var fallbackValues = {
    ID: cleanValue_(payload.ID || payload.id),
    technical_id: cleanValue_(payload.technical_id),
    session_id_raw: cleanValue_(payload.session_id_raw || payload.session_id || payload.ID || payload.id),
    timestamp: cleanValue_(payload.event_ts || payload.ts || payload.timestamp),
    event_ts: cleanValue_(payload.event_ts || payload.ts || payload.timestamp),
    src: cleanValue_(payload.src),
    weight: cleanValue_(payload.weight || payload.peso_kg),
    gender: cleanValue_(payload.gender),
    board: cleanValue_(payload.board || payload.tavola_tipo),
    board_size: cleanValue_(payload.boardSize || payload.board_size || payload.tavola_misura),
    level: cleanValue_(payload.level || payload.livello),
    kite_size: cleanValue_(payload.kite || payload.kite_size || payload.kite_m2),
    wind: cleanValue_(payload.wind || payload.vento_kn),
    brand: cleanValue_(payload.brand || payload.marca),
    model: cleanValue_(payload.model || payload.modello),
    location: cleanValue_(payload.location || payload.spot),
    water: cleanValue_(payload.water || payload.acqua),
    result: cleanValue_(payload.result || payload.risultato),
    note: cleanValue_(payload.note || payload.notes)
  };

  Object.keys(fallbackValues).forEach(function(targetKey) {
    var value = fallbackValues[targetKey];
    if (value === null) return;
    record[targetKey] = targetKey === "gender" ? normalizeGender_(value) : value;
  });

  return record;
}

function parseWhatsAppMessage_(rawText) {
  var text = String(rawText || "").trim();
  var record = blankRecord_();
  var coreText = text;
  var technicalMatch = text.match(TECHNICAL_BLOCK_RE);
  var legacyTechnicalMatch = null;

  if (technicalMatch) {
    record.timestamp = String(technicalMatch[1] || "").trim() || null;
    record.event_ts = record.timestamp;
    coreText = text.slice(0, technicalMatch.index).replace(/\s+$/, "");
  } else {
    legacyTechnicalMatch = text.match(LEGACY_TECHNICAL_BLOCK_RE);
    if (legacyTechnicalMatch) {
      record.timestamp = String(legacyTechnicalMatch[2] || "").trim() || null;
      record.event_ts = record.timestamp;
      record.session_id_raw = String(legacyTechnicalMatch[1] || "").trim() || null;
      record.src = String(legacyTechnicalMatch[3] || "").trim() || null;
      coreText = text.slice(0, legacyTechnicalMatch.index).replace(/\s+$/, "");
    }
  }

  coreText.split(/\r?\n/).forEach(function(line) {
    if (line.indexOf(":") === -1) return;

    var separatorIndex = line.indexOf(":");
    var rawLabel = line.slice(0, separatorIndex);
    var rawValue = line.slice(separatorIndex + 1);
    var fieldName = LABEL_TO_FIELD[normalizeLabel_(rawLabel)];
    var value = cleanValue_(rawValue);

    if (!fieldName || value === null) return;
    record[fieldName] = fieldName === "gender" ? normalizeGender_(value) : value;
  });

  return record;
}

function normalizeLabel_(label) {
  return String(label || "")
    .replace(/^[^A-Za-z]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader_(header) {
  var compact = String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");
  return HEADER_ALIASES[compact] || null;
}

function getTargetSheet_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty("GOOGLE_SHEET_ID");
  var sheetName = props.getProperty("GOOGLE_SHEET_NAME");
  var spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) throw new Error("Spreadsheet not available");

  var sheet = sheetName
    ? spreadsheet.getSheetByName(sheetName)
    : spreadsheet.getSheets()[0];

  if (!sheet) throw new Error("Target sheet not found");
  return sheet;
}

function getSheetHeaders_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (!lastColumn) throw new Error("Sheet has no headers");

  var values = sheet.getRange(1, 1, 1, lastColumn).getValues();
  return ensureFixedSchemaHeaders_(sheet, values[0]);
}

function ensureFixedSchemaHeaders_(sheet, headers) {
  var currentHeaders = headers.slice();
  var knownHeaders = {};

  currentHeaders.forEach(function(header) {
    var normalized = normalizeHeader_(header);
    if (normalized) knownHeaders[normalized] = true;
  });

  var missingHeaders = FIXED_SCHEMA.filter(function(field) {
    return !knownHeaders[field];
  });

  if (!missingHeaders.length) return currentHeaders;

  sheet
    .getRange(1, currentHeaders.length + 1, 1, missingHeaders.length)
    .setValues([missingHeaders]);

  return currentHeaders.concat(missingHeaders);
}

function buildSheetRow_(record, headers) {
  return headers.map(function(header) {
    var normalized = normalizeHeader_(header);
    if (!normalized) return "";
    var value = record[normalized];
    return value === null || typeof value === "undefined" ? "" : value;
  });
}

function getHeaderIndex_(headers, targetKey) {
  for (var i = 0; i < headers.length; i += 1) {
    if (normalizeHeader_(headers[i]) === targetKey) return i;
  }
  return -1;
}

function isDuplicateRecord_(sheet, headers, identities) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  var technicalId = cleanValue_(identities && identities.technical_id);
  var sessionIdRaw = cleanValue_(identities && identities.session_id_raw);
  var storageId = cleanValue_(identities && identities.ID);
  var checks = [];

  if (technicalId !== null) {
    checks.push({ header: "technical_id", value: technicalId });
  }

  if (sessionIdRaw !== null) {
    checks.push({ header: "session_id_raw", value: sessionIdRaw });
  }

  if (!checks.length && storageId !== null) {
    checks.push({ header: "ID", value: storageId });
  }

  return checks.some(function(check) {
    var columnIndex = getHeaderIndex_(headers, check.header);
    if (columnIndex === -1) return false;

    var values = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1).getValues();
    return values.some(function(row) {
      return cleanValue_(row[0]) === check.value;
    });
  });
}

function resolveRecordSource_(kind, currentSource) {
  if (kind === "form" || kind === "json") return "form_v1";
  return cleanValue_(currentSource) || "whatsapp_v1";
}

function buildStoredId_(value) {
  var seed = cleanValue_(value);
  if (!seed) return null;

  var hash = 2166136261;
  var text = String(seed);
  for (var i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  var hex = (hash >>> 0).toString(16).padStart(8, "0");
  return ("gs" + hex).slice(0, 10);
}

function generateSheetId_() {
  var random = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return ("gs" + random).slice(0, 10);
}

function jsonResponse_(status, payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function postMessageHtmlResponse_(isDuplicate) {
  var duplicateFlag = isDuplicate ? ", duplicate: true" : "";
  return HtmlService
    .createHtmlOutput('<!doctype html><html><body><script>window.parent.postMessage({ ok: true' + duplicateFlag + ' }, "*");</script></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function formatIsoTimestamp_(date) {
  return new Date(date).toISOString();
}
