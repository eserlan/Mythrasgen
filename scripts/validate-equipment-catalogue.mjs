import { readFile } from "node:fs/promises";

const jsonPath = new URL("../catalogue_source_index.json", import.meta.url);
const csvPath = new URL("../catalogue_source_index.csv", import.meta.url);
const reportPath = new URL("../validation_report.json", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("CSV ends inside a quoted field");
  if (field !== "" || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateRow(row, index) {
  const label = `row ${index + 1}`;
  assert(row && typeof row === "object" && !Array.isArray(row), `${label}: expected object`);
  assert(typeof row.id === "string" && /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(row.id), `${label}: invalid stable id`);
  assert(typeof row.category === "string" && row.category.length > 0, `${row.id}: missing category`);
  assert(typeof row.name === "string" && row.name.trim(), `${row.id}: missing name`);
  assert(Number.isInteger(row.source_printed_page) && row.source_printed_page > 0, `${row.id}: invalid source page`);
  assert(typeof row.source_line === "string", `${row.id}: source_line must be a string`);
  assert(row.price_cp_candidate === null || (Number.isSafeInteger(row.price_cp_candidate) && row.price_cp_candidate >= 0), `${row.id}: price must be non-negative integer CP or null`);
  assert(typeof row.verification === "string" && row.verification.trim(), `${row.id}: missing verification status`);
  for (const key of ["ap", "ap_candidate", "hp_candidate", "wielding_hands", "base_enc_per_location", "enc_multiplier"]) {
    assert(row[key] === undefined || (typeof row[key] === "number" && Number.isFinite(row[key])), `${row.id}: malformed ${key}`);
  }
  if (row.combat_profile_candidate !== undefined) {
    const profile = row.combat_profile_candidate;
    assert(profile && typeof profile === "object" && ["damage", "size", "reach"].every(k => typeof profile[k] === "string"), `${row.id}: malformed combat profile`);
  }
}

try {
  const [sourceText, csvText, reportText] = await Promise.all([
    readFile(jsonPath, "utf8"), readFile(csvPath, "utf8"), readFile(reportPath, "utf8"),
  ]);
  const records = JSON.parse(sourceText);
  const csvRows = parseCsv(csvText);
  const report = JSON.parse(reportText);
  assert(Array.isArray(records), "source index must be an array");
  const ids = new Set();
  const categories = {};
  const pages = {};
  let missingPrices = 0;
  let missingSourceMatches = 0;
  let provisionalFieldCount = 0;
  records.forEach((row, index) => {
    validateRow(row, index);
    assert(!ids.has(row.id), `duplicate stable id: ${row.id}`);
    ids.add(row.id);
    categories[row.category] = (categories[row.category] ?? 0) + 1;
    pages[row.source_printed_page] = (pages[row.source_printed_page] ?? 0) + 1;
    if (row.price_cp_candidate === null) missingPrices += 1;
    if (/source-indexed/i.test(row.verification)) provisionalFieldCount += Object.keys(row).filter(k => !["id", "category", "name", "source_printed_page", "source_line", "verification"].includes(k)).length;
  });
  assert(csvRows.length > 0, "CSV is empty");
  const csvHeader = csvRows[0];
  const csvIdColumn = csvHeader.indexOf("id");
  assert(csvIdColumn >= 0, "CSV is missing id column");
  const csvFieldIndexes = new Map(csvHeader.map((field, index) => [field, index]));
  const crossCheckFields = ["id", "category", "name", "source_printed_page", "price_cp_candidate", "verification", "source_line"];
  assert(crossCheckFields.every(field => csvFieldIndexes.has(field)), "CSV is missing a JSON cross-check column");
  const csvDataRows = csvRows.slice(1).filter(row => row.length > 1);
  assert(csvDataRows.every(row => row.length === csvHeader.length), "CSV contains a row with the wrong number of columns");
  const csvIds = csvDataRows.map(row => row[csvIdColumn]);
  assert(csvIds.length === records.length, `CSV has ${csvIds.length} data rows; JSON has ${records.length}`);
  assert(new Set(csvIds).size === csvIds.length, "CSV contains duplicate IDs");
  assert(csvIds.every(id => ids.has(id)), "CSV contains an ID absent from JSON");
  const csvRowsById = new Map(csvDataRows.map(row => [row[csvIdColumn], row]));
  for (const record of records) {
    const csvRow = csvRowsById.get(record.id);
    for (const field of crossCheckFields) {
      const expected = record[field] === null ? "" : String(record[field]);
      assert(csvRow[csvFieldIndexes.get(field)] === expected, `CSV ${field} does not match JSON for ${record.id}`);
    }
  }
  assert(report.total_source_index_records === records.length, "validation report total does not match JSON");
  assert(Object.keys(report.categories ?? {}).length === Object.keys(categories).length
    && Object.entries(categories).every(([category, count]) => report.categories[category] === count), "validation report category counts do not match JSON");
  const reportedMissingIds = report.source_line_missing ?? [];
  const knownIds = new Set(records.map(row => row.id));
  assert(reportedMissingIds.every(id => knownIds.has(id)), "validation report has unknown source-line IDs");
  const expectedMissingSourceIds = records.filter(row => !row.source_line).map(row => row.id).sort();
  assert(JSON.stringify([...reportedMissingIds].sort()) === JSON.stringify(expectedMissingSourceIds), "validation report source-line IDs do not match JSON");
  missingSourceMatches = reportedMissingIds.length;
  const reportedMissingPriceIds = report.price_candidate_missing ?? [];
  const expectedMissingPriceIds = records.filter(row => row.price_cp_candidate === null).map(row => row.id).sort();
  assert(JSON.stringify([...reportedMissingPriceIds].sort()) === JSON.stringify(expectedMissingPriceIds), "validation report missing-price IDs do not match JSON");

  console.log(`Catalogue validation passed: ${records.length} records; ${csvIds.length} CSV cross-checks; ${ids.size} unique stable IDs.`);
  console.log(`Category counts: ${Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, count]) => `${category}=${count}`).join(", ")}`);
  console.log(`Missing / uncertain: ${missingPrices} null price candidates; ${missingSourceMatches} source-line matches flagged; ${provisionalFieldCount} candidate fields on source-indexed rows remain provisional.`);
  console.log(`Source printed-page coverage: ${Object.entries(pages).sort(([a], [b]) => Number(a) - Number(b)).map(([page, count]) => `${page}=${count}`).join(", ")}`);
} catch (error) {
  console.error(`Catalogue validation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
