import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";
import { EQUIPMENT_CATALOGUE } from "../src/lib/equipment-catalogue";

const page = readFileSync(new URL("../src/components/Combat.svelte", import.meta.url), "utf8");
const inventory = readFileSync(new URL("../src/components/EquipmentInventory.svelte", import.meta.url), "utf8");

test("Page VIII separates combat training from possessions", () => {
  expect(page).toContain("EquipmentInventory");
  expect(page).toContain("<details class=\"combat-styles-compact\">");
  expect(page).toContain("Combat Styles are training, not possessions");
  expect(compile(page, { filename: "src/components/Combat.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("equipment starts with three activities and four plain-language groups", () => {
  for (const text of ["Choose equipment", "Your equipment", "Review your character", "Weapons", "Armour & shields", "Clothing & gear", "Supplies & services", "group-buttons"])
    expect(inventory).toContain(text);
  expect(inventory).toContain("aria-current={view === \"choose\" ? \"page\" : undefined}");
  expect(inventory).toContain("Searches all {EQUIPMENT_CATALOGUE.length} equipment records.");
  const groups = ["one_handed", "two_handed", "ranged", "ammunition", "siege", "vehicles", "armour", "shields", "materials", "clothing", "tools", "food", "livestock", "accommodation"];
  expect(new Set(groups)).toEqual(new Set(EQUIPMENT_CATALOGUE.map(item => item.source.category)));
  expect(inventory).toContain("aria-pressed={selectedId === record.id}");
  expect(inventory).toContain("aria-labelledby=\"selected-item-title\"");
  expect(inventory).toContain("Search all equipment");
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("purchase safeguards and outcomes are accessible and preserve GM pricing", () => {
  for (const text of ["GM price (CP)", "GM-approved zero price", "remaining money", "disabled={!canTransact(record)}", "positive whole quantity", "Ask the GM for a price", "aria-live=\"polite\"", "closeDetails(record.id)"])
    expect(inventory).toContain(text);
  expect(inventory).toContain("quantity[record.id] ?? \"1\"");
  expect(inventory).toContain("gmPrice[record.id] ?? \"\"");
  expect(inventory).toContain("editInventoryQuantity(item.id, item.name, event.currentTarget.value)");
  expect(inventory).toContain("It does not add a second item.");
  expect(inventory).toContain("without adding carried equipment");
});

test("technical provenance and armour location data are secondary disclosures", () => {
  expect(inventory).toContain("<summary>Rules &amp; sources</summary>");
  expect(inventory).toContain("<summary>Money and transaction history</summary>");
  expect(inventory).toContain("{#if armourItems.length}");
  expect(inventory).toContain("No armour recorded");
  expect(inventory).toContain("filter(ap => ap !== null && ap > 0).length} locations protected");
  expect(inventory).toContain("No equipment yet. Choose equipment to add an item.");
});
