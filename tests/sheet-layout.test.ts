import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const sheet = readFileSync(new URL("../src/components/Sheet.svelte", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/CombatStyles.svelte", import.meta.url), "utf8");

describe("Page IX character sheet", () => {
  test("groups the reference into two responsive, print-paginated pages", () => {
    expect(sheet).toContain("Page 1: Character and skills");
    expect(sheet).toContain("Page 2: Combat and equipment");
    expect(sheet).toContain("@media(max-width:560px)");
    expect(sheet).toContain("@media print");
    expect(sheet).toContain("page-break-after:always");
  });

  test("retains the character, background, skill, combat, money, and owned-equipment values", () => {
    for (const label of ["Identity", "Background &amp; family", "Characteristics &amp; derived attributes", "Money &amp; wealth",
      "Standard skills", "Professional skills", "Resistances", "Magical skills", "Languages", "Passions", "Hit locations",
      "Armour by location", "Load &amp; encumbrance", "Melee weapons &amp; shields", "Ranged weapons", "Owned equipment"]) {
      expect(sheet).toContain(label);
    }
    expect(sheet).toContain("resolvedBackgroundEvents");
    expect(sheet).toContain("char.description.trim()");
    expect(sheet).toContain("equipment.funds.remainingCp");
    expect(sheet).toContain("equipment.armour.apByLocation");
    expect(sheet).toContain("equipment.load.unresolvedItems");
  });

  test("uses owned weapons for weapon tables and does not edit character choices", () => {
    expect(sheet).toContain("char.background.inventory.flatMap");
    expect(sheet).toContain("CombatStyles");
    expect(sheet).not.toContain("char.combatStyles.push");
    expect(sheet).not.toContain("setAlloc(");
    expect(styles).toContain("Associated weapons");
    expect(styles).not.toContain("style.weapons.push");
    expect(styles).not.toContain("background.inventory");
  });

  test("makes horizontally scrollable sheet tables keyboard accessible and labeled", () => {
    for (const label of ["Hit locations", "Armour by location", "Melee weapons and shields", "Ranged weapons", "Owned equipment"]) {
      expect(sheet).toContain(`role="region" aria-label="${label}" tabindex="0"`);
    }
    expect(styles).toContain('role="region" aria-label="Combat styles" tabindex="0"');
  });
});
