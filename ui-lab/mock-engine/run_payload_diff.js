"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildPayloadContractV1,
  toLegacyPayload,
  diffPayload,
  assertNoReadonlyLeak
} = require("./mock_engine");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildFixedMetaFromExpected(expectedLegacyPayload) {
  return {
    session_id: expectedLegacyPayload.session_id,
    technical_id: expectedLegacyPayload.technical_id,
    event_ts: expectedLegacyPayload.event_ts,
    src: expectedLegacyPayload.src,
    ts: expectedLegacyPayload.ts,
    message_id: expectedLegacyPayload.message_id
  };
}

function listCaseDirs() {
  const root = path.join(__dirname, "test-cases");
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ caseDir: path.join(root, entry.name), caseType: "mock" }))
    .sort();
}

function listGoldenCaseDirs() {
  const root = path.join(__dirname, "golden-cases");
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ caseDir: path.join(root, entry.name), caseType: "golden" }))
    .sort();
}

function resolveCaseDirs() {
  const argPath = process.argv[2];
  if (!argPath) {
    return [...listCaseDirs(), ...listGoldenCaseDirs()];
  }
  if (argPath === "all") {
    return [...listCaseDirs(), ...listGoldenCaseDirs()];
  }
  if (argPath === "mock") {
    return listCaseDirs();
  }
  if (argPath === "golden") {
    return listGoldenCaseDirs();
  }
  return [{ caseDir: path.resolve(process.cwd(), argPath), caseType: "custom" }];
}

function runCase({ caseDir, caseType }) {
  const uiStatePath = path.join(caseDir, "ui-state.json");
  const expectedPath = path.join(caseDir, "expected-legacy-payload.json");
  const uiState = readJson(uiStatePath);
  const expectedLegacyPayload = readJson(expectedPath);
  const fixedMeta = buildFixedMetaFromExpected(expectedLegacyPayload);
  const payloadContract = buildPayloadContractV1(uiState, fixedMeta);
  const legacyPayload = toLegacyPayload(payloadContract);
  const diff = diffPayload(expectedLegacyPayload, legacyPayload);
  const readonlyLeak = assertNoReadonlyLeak(legacyPayload);
  const equal = diff.equal && readonlyLeak.ok;

  return {
    case_name: path.basename(caseDir),
    case_type: caseType,
    expected_fields_count: Object.keys(expectedLegacyPayload).length,
    actual_fields_count: Object.keys(legacyPayload).length,
    missing_fields: diff.missing_fields,
    extra_fields: diff.extra_fields,
    changed_fields: diff.changed_fields,
    readonly_leak: !readonlyLeak.ok,
    readonly_leak_fields: readonlyLeak.leaked_fields,
    equal
  };
}

function main() {
  const cases = resolveCaseDirs();
  const caseReports = cases.map(runCase);
  const passed = caseReports.filter((entry) => entry.equal).length;
  const failed = caseReports.length - passed;
  const mockCases = caseReports.filter((entry) => entry.case_type === "mock").length;
  const goldenCases = caseReports.filter((entry) => entry.case_type === "golden").length;

  const report = {
    report: "REPORT_GOLDEN_PAYLOAD_DIFF",
    cases: caseReports,
    summary: {
      total_cases: caseReports.length,
      mock_cases: mockCases,
      golden_cases: goldenCases,
      passed,
      failed,
      all_equal: failed === 0
    }
  };

  console.log("REPORT_GOLDEN_PAYLOAD_DIFF");
  console.log(JSON.stringify(report, null, 2));
}

main();
