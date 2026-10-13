import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { deriveStats } from "../src/lib/calc";
import { HIT_LOCATIONS } from "../src/lib/armour-rules";

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

  test("aligns both location tables to the canonical Mythras order", () => {
    const expectedOrder = ["Head", "Left Arm", "Right Arm", "Chest", "Abdomen", "Left Leg", "Right Leg"];
    expect(HIT_LOCATIONS).toEqual(expectedOrder);
    expect(sheet.match(/\{#each orderedLoc as location\}/g)).toHaveLength(2);

    const { loc } = deriveStats({ STR: 10, CON: 18, SIZ: 12, DEX: 10, INT: 10, POW: 10, CHA: 10 });
    const ordered = HIT_LOCATIONS.map(name => loc.find(location => location.name === name)!);
    expect(ordered.map(({ name, roll, hp }) => [name, roll, hp])).toEqual([
      ["Head", "19-20", 6], ["Left Arm", "16-18", 5], ["Right Arm", "13-15", 5],
      ["Chest", "10-12", 8], ["Abdomen", "7-9", 7], ["Left Leg", "4-6", 6], ["Right Leg", "1-3", 6],
    ]);
  });

  test("keeps page one readable and stacks its skill panels in three independent columns", () => {
    const pageOne = sheet.split('aria-label="Page 2: Combat and equipment"')[0];
    const pageStyles = sheet.slice(sheet.indexOf("<style>"));
    expect(pageStyles).toContain("sheet-facts dd{text-align:left}");
    expect(pageStyles).toContain("overflow-wrap:break-word");
    expect(pageStyles).toContain("sheet-background{font-size:.82rem;line-height:1.48}");
    expect(pageOne).toContain("{#each STATS as key}");
    expect(pageStyles).toContain("repeat(7,minmax(0,1fr))");
    expect(pageStyles).toContain("sheet-derived{display:grid");
    expect(pageOne).toContain("sheet-skill-columns");
    expect(pageOne).toContain("<div class=\"sheet-skill-column\">\n        <section class=\"sheet-panel\"><h3>Standard skills</h3>");
    expect(pageOne).toContain("<h3>Professional skills</h3>");
    expect(pageOne).toContain("<h3>Magical skills</h3>");
    expect(pageOne).toContain("<h3>Resistances</h3>");
    expect(pageOne).toContain("<h3>Languages</h3>");
    expect(pageOne.indexOf("<h3>Professional skills</h3>")).toBeLessThan(pageOne.indexOf("<h3>Magical skills</h3>"));
    expect(pageOne.indexOf("<h3>Resistances</h3>")).toBeLessThan(pageOne.indexOf("<h3>Languages</h3>"));
    expect(pageStyles).toContain("sheet-skill-list li{display:grid;grid-template-columns:minmax(0,1fr) auto");
    expect(pageOne).not.toContain("<b>Starting money:</b>");
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
