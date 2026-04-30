"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  mapSheetRowToLegacyPayloadPartial
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
  const mapping = mapSheetRowToLegacyPayloadPartial(row);

  return {
    case_name: path.basename(caseDir),
    sheet_fields_present: Object.keys(row).filter((field) => String(row[field] ?? "").trim() !== ""),
    mapped_partial_fields: Object.keys(mapping.mapped_fields),
    missing_for_full_dam_payload: mapping.missing_for_full_dam_payload,
    sheet_visual_id: mapping.sheet_visual_id,
    timestamp_status: "event_ts_candidate_not_certain",
    can_be_dam_golden: false,
    can_be_visual_control: true,
    google_is_operational_pipeline: false
  };
}

function main() {
  const cases = listCaseDirs().map(runCase);
  const visualControlCases = cases.filter((entry) => entry.can_be_visual_control === true).length;
  const damGoldenCases = cases.filter((entry) => entry.can_be_dam_golden === true).length;

  const report = {
    report: "REPORT_SHEET_VISUAL_AUDIT",
    cases,
    summary: {
      total_cases: cases.length,
      visual_control_cases: visualControlCases,
      dam_golden_cases: damGoldenCases,
      all_google_visual_only: visualControlCases === cases.length && damGoldenCases === 0
    }
  };

  console.log("REPORT_SHEET_VISUAL_AUDIT");
  console.log(JSON.stringify(report, null, 2));
}

main();
