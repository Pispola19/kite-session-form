"use strict";

const MISSING_FOR_FULL_DAM_PAYLOAD = Object.freeze([
  "session_id",
  "technical_id",
  "event_ts_certo",
  "ts",
  "message_id"
]);

function cleanSheetValue(value) {
  return String(value ?? "").trim();
}

function normalizeSheetGender(value) {
  const normalized = cleanSheetValue(value).toUpperCase();
  if (normalized === "M" || normalized === "F") {
    return normalized;
  }
  if (normalized === "MALE") {
    return "M";
  }
  if (normalized === "FEMALE") {
    return "F";
  }
  return "";
}

function mapSheetRowToLegacyPayloadPartial(sheetRow) {
  const row = sheetRow || {};
  const mapped = {
    event_ts_candidate: cleanSheetValue(row.timestamp),
    weight: cleanSheetValue(row.weight),
    gender: normalizeSheetGender(row.gender),
    board: cleanSheetValue(row.board),
    boardSize: cleanSheetValue(row.board_size),
    level: cleanSheetValue(row.level),
    kite: cleanSheetValue(row.kite_size),
    brand: cleanSheetValue(row.brand),
    model: cleanSheetValue(row.model),
    wind: cleanSheetValue(row.wind),
    location: cleanSheetValue(row.location),
    water: cleanSheetValue(row.water),
    result: cleanSheetValue(row.result),
    note: cleanSheetValue(row.notes),
    sheet_visual_id: cleanSheetValue(row.ID),
    src: cleanSheetValue(row.src)
  };

  return {
    mapped_fields: mapped,
    missing_for_full_dam_payload: [...MISSING_FOR_FULL_DAM_PAYLOAD],
    sheet_visual_id: mapped.sheet_visual_id,
    id_used_as_message_id: false,
    id_used_as_session_id: false,
    id_used_as_technical_id: false,
    google_is_operational_pipeline: false,
    is_full_dam_payload: false
  };
}

function validateSheetMappingResult(result) {
  const mapped = result?.mapped_fields || {};
  const missing = result?.missing_for_full_dam_payload || [];
  const requiredMissing = MISSING_FOR_FULL_DAM_PAYLOAD.every((field) => missing.includes(field));

  return Boolean(
    requiredMissing &&
    result?.id_used_as_message_id === false &&
    result?.id_used_as_session_id === false &&
    result?.id_used_as_technical_id === false &&
    result?.google_is_operational_pipeline === false &&
    result?.is_full_dam_payload === false &&
    !Object.prototype.hasOwnProperty.call(mapped, "message_id") &&
    !Object.prototype.hasOwnProperty.call(mapped, "session_id") &&
    !Object.prototype.hasOwnProperty.call(mapped, "technical_id")
  );
}

module.exports = {
  MISSING_FOR_FULL_DAM_PAYLOAD,
  cleanSheetValue,
  normalizeSheetGender,
  mapSheetRowToLegacyPayloadPartial,
  validateSheetMappingResult
};
