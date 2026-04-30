"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  mapSheetRowToLegacyPayloadPartial,
  validateSheetMappingResult
} = require("./sheet_row_mapping");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listCaseDirs() {
  const root = path.join(__dirname, "sheet-row-cases");
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .sort();
}

function runCase(caseDir) {
  const row = readJson(path.join(caseDir, "sheet-row.json"));
  const result = mapSheetRowToLegacyPayloadPartial(row);
  const passed = validateSheetMappingResult(result);

  return {
    case_name: path.basename(caseDir),
    mapped_fields: result.mapped_fields,
    missing_for_full_dam_payload: result.missing_for_full_dam_payload,
    sheet_visual_id: result.sheet_visual_id,
    id_used_as_message_id: result.id_used_as_message_id,
    id_used_as_session_id: result.id_used_as_session_id,
    id_used_as_technical_id: result.id_used_as_technical_id,
    google_is_operational_pipeline: result.google_is_operational_pipeline,
    passed
  };
}

function main() {
  const reports = listCaseDirs().map(runCase);
  const passed = reports.filter((entry) => entry.passed).length;
  const failed = reports.length - passed;

  const report = {
    report: "REPORT_SHEET_ROW_MAPPING",
    cases: reports,
    summary: {
      total_cases: reports.length,
      passed,
      failed,
      all_passed: failed === 0
    }
  };

  console.log("REPORT_SHEET_ROW_MAPPING");
  console.log(JSON.stringify(report, null, 2));
}

main();
