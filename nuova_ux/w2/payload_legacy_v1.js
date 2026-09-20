/**
 * NUOVA_UX — stesso vocabolario di ui-lab/mock-engine (LegacyPayload). Non include display.* / Live Wind.
 */
(function initNuovaUxPayloadLegacy(global) {
  "use strict";

  const LEGACY_FIELDS = Object.freeze([
    "session_id",
    "technical_id",
    "event_ts",
    "src",
    "weight",
    "gender",
    "board",
    "boardSize",
    "boardSize_other_text",
    "boardSize_user_raw",
    "level",
    "kite",
    "wind",
    "brand",
    "model",
    "model_other_text",
    "model_user_raw",
    "location",
    "water",
    "result",
    "note",
    "ts",
    "message_id"
  ]);

  const REQUIRED_USER = Object.freeze(["weight", "board", "level", "kite", "wind", "result"]);

  function normalizeNumericString(value) {
    const matches = String(value == null ? "" : value).match(/\d+/g);
    return matches ? matches.join("") : "";
  }

  function normalizeOptionalString(value) {
    return String(value == null ? "" : value).trim();
  }

  function buildOtherTextFields(selectValue, otherText) {
    const selected = normalizeOptionalString(selectValue);
    const other = normalizeOptionalString(otherText);
    if (selected !== "Other") {
      return { other_text: "", user_raw: "" };
    }
    return { other_text: other, user_raw: other };
  }

  function signatureDigestHex(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function buildLegacyMessageId(input) {
    const payload = input || {};
    const stableParts = [
      payload.session_id,
      payload.technical_id,
      payload.event_ts,
      payload.src,
      payload.weight,
      payload.gender,
      payload.board,
      payload.boardSize,
      payload.level,
      payload.kite,
      payload.wind,
      payload.brand,
      payload.model,
      payload.location,
      payload.water,
      payload.result,
      payload.note
    ]
      .map(function (value) {
        return value == null ? "" : String(value);
      })
      .join("\u001f");
    const reversedParts = [...stableParts].reverse().join("");
    const digest = [
      signatureDigestHex(stableParts),
      signatureDigestHex(reversedParts),
      signatureDigestHex(stableParts + "\u001e" + reversedParts),
      signatureDigestHex(reversedParts + "\u001e" + stableParts)
    ].join("");
    const sourceId = String(payload.technical_id || payload.session_id || "").slice(0, 12);
    return "msg_" + digest + "_" + sourceId;
  }

  function buildRuntimeMeta() {
    const now = new Date();
    const iso = now.toISOString();
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const compactDate =
      String(now.getUTCDate()).padStart(2, "0") +
      months[now.getUTCMonth()] +
      String(now.getUTCHours()).padStart(2, "0") +
      String(now.getUTCMinutes()).padStart(2, "0");
    const randomPart = Math.random().toString(36).slice(2, 10);
    const randomPart2 = Math.random().toString(36).slice(2, 10);
    return {
      session_id: compactDate + randomPart,
      technical_id: randomPart + randomPart2,
      event_ts: iso,
      ts: iso,
      src: "form_v1"
    };
  }

  function buildPayloadContractV1(uiState, fixedMeta) {
    const state = uiState || {};
    const rider = state.rider || {};
    const board = state.board || {};
    const kite = state.kite || {};
    const windUserInput = state.windUserInput || {};
    const spot = state.spot || {};
    const water = state.water || {};
    const result = state.result || {};
    const note = state.note || {};
    const meta = state.meta || {};
    const modelOtherFields = buildOtherTextFields(kite.model, kite.modelOtherText);
    const boardSizeOtherFields = buildOtherTextFields(board.boardSize, board.boardSizeOtherText);
    const fm = fixedMeta || {};
    const payloadSeed = {
      session_id: normalizeOptionalString(fm.session_id),
      technical_id: normalizeOptionalString(fm.technical_id),
      event_ts: normalizeOptionalString(fm.event_ts),
      src: normalizeOptionalString(fm.src) || "form_v1",
      weight: normalizeNumericString(rider.weight),
      gender: rider.gender === null || rider.gender === undefined ? null : normalizeOptionalString(rider.gender),
      board: normalizeOptionalString(board.board),
      boardSize: normalizeOptionalString(board.boardSize),
      level: normalizeOptionalString(rider.level),
      kite: normalizeNumericString(kite.kite),
      wind: normalizeNumericString(windUserInput.wind),
      brand: normalizeOptionalString(kite.brand),
      model: normalizeOptionalString(kite.model),
      model_other_text: modelOtherFields.other_text,
      model_user_raw: modelOtherFields.user_raw,
      boardSize_other_text: boardSizeOtherFields.other_text,
      boardSize_user_raw: boardSizeOtherFields.user_raw,
      location: normalizeOptionalString(spot.location),
      water: normalizeOptionalString(water.water),
      result: normalizeOptionalString(result.result),
      note: normalizeOptionalString(note.note),
      ts: normalizeOptionalString(fm.ts)
    };
    return {
      payload_contract_version: "v1",
      ui_version: normalizeOptionalString(meta.ui_version) || "nuova_ux_lab_v1",
      submit_channel: normalizeOptionalString(meta.submit_channel) || "mock",
      ...payloadSeed,
      message_id: normalizeOptionalString(fm.message_id) || buildLegacyMessageId(payloadSeed)
    };
  }

  function toLegacyPayload(payloadContract) {
    const contract = payloadContract || {};
    return LEGACY_FIELDS.reduce(function (legacy, field) {
      legacy[field] = Object.prototype.hasOwnProperty.call(contract, field) ? contract[field] : "";
      return legacy;
    }, {});
  }

  function missingRequired(legacyPayload) {
    const payload = legacyPayload || {};
    return REQUIRED_USER.filter(function (field) {
      const v = payload[field];
      return v == null || String(v).trim() === "";
    });
  }

  function assertNoWindDisplayLeak(legacyPayload) {
    const payload = legacyPayload || {};
    const forbidden = ["readonly", "liveWind", "gust", "display", "forecast_1h", "kite_decision"];
    return forbidden.filter(function (k) {
      return Object.prototype.hasOwnProperty.call(payload, k);
    });
  }

  global.NuovaUxPayloadLegacyV1 = Object.freeze({
    LEGACY_FIELDS,
    REQUIRED_USER,
    buildRuntimeMeta,
    buildPayloadContractV1,
    toLegacyPayload,
    missingRequired,
    assertNoWindDisplayLeak
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxPayloadLegacyV1;
}
