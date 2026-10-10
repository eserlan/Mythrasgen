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

test("equipment UI exposes catalogue search, provenance, acquisition, money, and ledger history", () => {
  for (const text of ["type=\"search\"", "Category", "Source {record.id}", "Price unavailable", "GM price (CP)",
    "GM-approved zero price", "Acquire as", "Starting Money", "Spent", "Remaining", "Transaction history", "Record refund…"])
    expect(inventory).toContain(text);
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
});
