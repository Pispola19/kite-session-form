"use strict";

/*
 * Browser wrapper temporaneo allineato a mock_engine.js.
 * Espone funzioni pure su window.MockEngine per la mock-ui file-based.
 * Non legge DOM, non salva dati, non invia dati.
 */
(function exposeMockEngine(window) {
  const LEGACY_FIELDS = Object.freeze([
    "session_id",
    "technical_id",
    "event_ts",
    "src",
    "weight",
    "gender",
    "board",
    "boardSize",
    "level",
    "kite",
    "wind",
    "brand",
    "model",
    "location",
    "water",
    "result",
    "note",
    "ts",
    "message_id"
  ]);

  const READONLY_LEAK_FIELDS = Object.freeze([
    "readonly",
    "liveWind",
    "speed",
    "gust",
    "direction",
    "updated_at",
    "provider"
  ]);

  function normalizeNumericString(value) {
    const matches = String(value ?? "").match(/\d+/g);
    return matches ? matches.join("") : "";
  }

  function normalizeOptionalString(value) {
    return String(value ?? "").trim();
  }

  function signatureDigestHex(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function legacyMessageIdStableValues(input) {
    const payload = input || {};
    return [
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
    ];
  }

  function legacyMessageIdFields() {
    return [
      "session_id",
      "technical_id",
      "event_ts",
      "src",
      "weight",
      "gender",
      "board",
      "boardSize",
      "level",
      "kite",
      "wind",
      "brand",
      "model",
      "location",
      "water",
      "result",
      "note"
    ];
  }

  function buildLegacyMessageId(input) {
    const stableParts = legacyMessageIdStableValues(input)
      .map((value) => value == null ? "" : String(value))
      .join("\u001f");
    const reversedParts = [...stableParts].reverse().join("");
    const digest = [
      signatureDigestHex(stableParts),
      signatureDigestHex(reversedParts),
      signatureDigestHex(`${stableParts}\u001e${reversedParts}`),
      signatureDigestHex(`${reversedParts}\u001e${stableParts}`)
    ].join("");
    const sourceId = String(input?.technical_id || input?.session_id || "").slice(0, 12);
    return `msg_${digest}_${sourceId}`;
  }

  function buildPayloadContractV1(uiState, fixedMeta = {}) {
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

    const payloadSeed = {
      session_id: normalizeOptionalString(fixedMeta.session_id),
      technical_id: normalizeOptionalString(fixedMeta.technical_id),
      event_ts: normalizeOptionalString(fixedMeta.event_ts),
      src: normalizeOptionalString(fixedMeta.src) || "form_v1",
      weight: normalizeNumericString(rider.weight),
      gender: rider.gender === null || rider.gender === undefined ? null : normalizeOptionalString(rider.gender),
      board: normalizeOptionalString(board.board),
      boardSize: normalizeOptionalString(board.boardSize),
      level: normalizeOptionalString(rider.level),
      kite: normalizeNumericString(kite.kite),
      wind: normalizeNumericString(windUserInput.wind),
      brand: normalizeOptionalString(kite.brand),
      model: normalizeOptionalString(kite.model),
      location: normalizeOptionalString(spot.location),
      water: normalizeOptionalString(water.water),
      result: normalizeOptionalString(result.result),
      note: normalizeOptionalString(note.note),
      ts: normalizeOptionalString(fixedMeta.ts)
    };

    return {
      payload_contract_version: "v1",
      ui_version: normalizeOptionalString(meta.ui_version) || "ui_lab_mock_v1",
      submit_channel: normalizeOptionalString(meta.submit_channel) || "mock",
      ...payloadSeed,
      message_id: normalizeOptionalString(fixedMeta.message_id) || buildLegacyMessageId(payloadSeed)
    };
  }

  function toLegacyPayload(payloadContract) {
    const contract = payloadContract || {};
    return LEGACY_FIELDS.reduce((legacy, field) => {
      legacy[field] = Object.prototype.hasOwnProperty.call(contract, field) ? contract[field] : "";
      return legacy;
    }, {});
  }

  function diffPayload(expected, actual) {
    const expectedPayload = expected || {};
    const actualPayload = actual || {};
    const expectedKeys = Object.keys(expectedPayload);
    const actualKeys = Object.keys(actualPayload);
    const missingFields = expectedKeys.filter((field) => !Object.prototype.hasOwnProperty.call(actualPayload, field));
    const extraFields = actualKeys.filter((field) => !Object.prototype.hasOwnProperty.call(expectedPayload, field));
    const changedFields = expectedKeys
      .filter((field) => Object.prototype.hasOwnProperty.call(actualPayload, field))
      .filter((field) => JSON.stringify(expectedPayload[field]) !== JSON.stringify(actualPayload[field]))
      .map((field) => ({
        field,
        expected: expectedPayload[field],
        actual: actualPayload[field]
      }));

    return {
      missing_fields: missingFields,
      extra_fields: extraFields,
      changed_fields: changedFields,
      equal: missingFields.length === 0 && extraFields.length === 0 && changedFields.length === 0
    };
  }

  function assertNoReadonlyLeak(legacyPayload) {
    const payload = legacyPayload || {};
    const leakedFields = Object.keys(payload).filter((field) => READONLY_LEAK_FIELDS.includes(field));
    return {
      ok: leakedFields.length === 0,
      leaked_fields: leakedFields
    };
  }

  window.MockEngine = Object.freeze({
    LEGACY_FIELDS,
    normalizeNumericString,
    normalizeOptionalString,
    signatureDigestHex,
    legacyMessageIdFields,
    buildLegacyMessageId,
    buildPayloadContractV1,
    toLegacyPayload,
    diffPayload,
    assertNoReadonlyLeak
  });
})(window);
