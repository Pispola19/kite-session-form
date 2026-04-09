var FIXED_SCHEMA = [
  "timestamp",
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
  "ts": "timestamp",
  "timestamp": "timestamp",
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

var TECHNICAL_BLOCK_RE = /\n---\nID:\s*([a-z0-9]{10})\nTS:\s*([^\n]+)\nSRC:\s*([^\n]+)\nSIG:\s*([a-f0-9]{10})\n---\s*$/;

function doGet() {
  return ContentService
    .createTextOutput("WEBHOOK OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var parsedInput = parseIncomingRequest_(e);
    var record = parsedInput.kind === "json" || parsedInput.kind === "form"
      ? normalizeFrontendPayload_(parsedInput.data)
      : parseWhatsAppMessage_(parsedInput.data);
    record.timestamp = formatRomeDate_(new Date());
    var sheet = getTargetSheet_();
    var headers = getSheetHeaders_(sheet);
    var row = buildSheetRow_(record, headers);

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);

    return jsonResponse_(200, {
      ok: true,
      mode: parsedInput.kind,
      written_fields: headers.length
    });
  } catch (error) {
    return jsonResponse_(500, {
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function parseIncomingRequest_(e) {
  if (e && e.parameter && hasKnownFrontendKeys_(e.parameter)) {
    return {
      kind: "form",
      data: e.parameter
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
  return record;
}

function parseWhatsAppMessage_(rawText) {
  var text = String(rawText || "").trim();
  var record = blankRecord_();
  var coreText = text;
  var technicalMatch = text.match(TECHNICAL_BLOCK_RE);

  if (technicalMatch) {
    record.timestamp = String(technicalMatch[2] || "").trim() || null;
    coreText = text.slice(0, technicalMatch.index).replace(/\s+$/, "");
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
  return values[0];
}

function buildSheetRow_(record, headers) {
  return headers.map(function(header) {
    var normalized = normalizeHeader_(header);
    if (!normalized) return "";
    var value = record[normalized];
    return value === null || typeof value === "undefined" ? "" : value;
  });
}

function jsonResponse_(status, payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatRomeDate_(date) {
  return Utilities.formatDate(date, "Europe/Rome", "yyyy-MM-dd");
}
