"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildLegacyMessageId,
  legacyMessageIdFields
} = require("./mock_engine");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listCaseDirs(rootName, caseType) {
  const root = path.join(__dirname, rootName);
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ caseDir: path.join(root, entry.name), caseType }))
    .sort();
}

function readSourceNote(caseDir) {
  const notePath = path.join(caseDir, "source-note.md");
  if (!fs.existsSync(notePath)) {
    return "";
  }
  return fs.readFileSync(notePath, "utf8");
}

function isNotVerifiable(caseDir, caseType) {
  if (caseType !== "golden") {
    return false;
  }
  return readSourceNote(caseDir).toLowerCase().includes("hash parity: not verifiable");
}

function runCase({ caseDir, caseType }) {
  const expected = readJson(path.join(caseDir, "expected-legacy-payload.json"));
  const generatedMessageId = buildLegacyMessageId(expected);
  const expectedMessageId = expected.message_id || "";
  const notVerifiable = isNotVerifiable(caseDir, caseType);
  const equal = expectedMessageId === generatedMessageId;

  return {
    case_name: path.basename(caseDir),
    case_type: caseType,
    expected_message_id: expectedMessageId,
    generated_message_id: generatedMessageId,
    equal,
    not_verifiable: notVerifiable,
    status: equal ? "matched" : notVerifiable ? "not_verifiable" : "mismatched",
    fields_used_for_hash: legacyMessageIdFields()
  };
}

function main() {
  const cases = [
    ...listCaseDirs("test-cases", "mock"),
    ...listCaseDirs("golden-cases", "golden")
  ];
  const reports = cases.map(runCase);
  const matched = reports.filter((entry) => entry.status === "matched").length;
  const mismatched = reports.filter((entry) => entry.status === "mismatched").length;
  const notVerifiable = reports.filter((entry) => entry.status === "not_verifiable").length;

  const report = {
    report: "REPORT_LEGACY_HASH_PARITY",
    cases: reports,
    summary: {
      total_cases: reports.length,
      matched,
      mismatched,
      not_verifiable: notVerifiable,
      all_hash_equal: mismatched === 0 && notVerifiable === 0
    }
  };

  console.log("REPORT_LEGACY_HASH_PARITY");
  console.log(JSON.stringify(report, null, 2));
}

main();
