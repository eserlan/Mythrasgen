import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const component = readFileSync(new URL("../src/components/CombatStyles.svelte", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/components/Combat.svelte", import.meta.url), "utf8");

describe("Combat Style display", () => {
  test("Page VIII does not mount a duplicate Combat Styles editor", () => {
    expect(page).not.toContain("CombatStyles");
    expect(page).not.toContain("combat-styles-compact");
    expect(page).toContain("EquipmentInventory");
  });

  test("keeps saved style summaries available on the character sheet", () => {
    expect(component).toContain("combat-style-list");
    expect(component).toContain("combat-percentage");
    expect(component).toContain("combat-origin");
    expect(component).toContain("aria-expanded={editing.includes(style.id)}");
    expect(component).toContain("{#if editing.includes(style.id)}<button class=\"secondary combat-remove-weapon\"");
    expect(component).not.toContain("weapon-stats");
    expect(component).not.toContain("Custom / unlisted weapon");
  });

  test("keeps trait rules and source collapsed behind native keyboard-accessible disclosures", () => {
    expect(component).toContain("<details><summary>{trait.displayName}</summary>");
    expect(component).toContain("{trait.description}");
    expect(component).toContain("{trait.source.libraryName}");
  });

  test("keeps the sheet's weapon association controls independent of inventory and money", () => {
    expect(component).toContain("Search Core catalogue");
    expect(component).toContain("CORE_COMBAT_STYLE_WEAPONS");
    expect(component).toContain("Custom weapon name");
    expect(component).toContain("style.weapons.push");
    expect(component).not.toContain("background.inventory");
    expect(component).not.toContain("currentMoney");
    expect(component).not.toContain("combatStyleSummary().*alloc");
  });
});
