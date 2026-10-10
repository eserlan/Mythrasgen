import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";

const page = readFileSync(new URL("../src/components/Combat.svelte", import.meta.url), "utf8");
const inventory = readFileSync(new URL("../src/components/EquipmentInventory.svelte", import.meta.url), "utf8");

test("Page VIII keeps Combat Styles compact and separates training from possessions", () => {
  expect(page).toContain("EquipmentInventory");
  expect(page).toContain("<details class=\"combat-styles-compact\">");
  expect(page).toContain("Combat Styles are training, not possessions");
  expect(compile(page, { filename: "src/components/Combat.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("equipment UI starts with categories and exposes compact selectable rows with global search", () => {
  for (const text of ["type=\"search\"", "Search all equipment", "Global search", "categoryGroups", "categoryCount(id)",
    "class=\"catalogue-row\"", "aria-pressed={selectedId === record.id}", "Choose a group to browse the source categories",
    "No equipment matches this search or category.", "aria-labelledby=\"selected-item-title\""])
    expect(inventory).toContain(text);
  expect(inventory).not.toContain("{#each shown as entry (entry.source.id)}\n      {@const record = entry.source}\n      {@const unavailable = record.price_cp_candidate === null}");
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("equipment selection keeps provenance and the single purchase form discoverable", () => {
  for (const text of ["Source {record.id}", "Price unavailable", "GM price (CP)",
    "GM-approved zero price", "Acquire as", "Starting / spent / remaining", "Starting</small>", "Spent", "Remaining", "Transaction history", "Record refund…",
    "ENC per covered location", "wielding profile, not a separate physical possession", "do not create carried inventory"])
    expect(inventory).toContain(text);
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
});
