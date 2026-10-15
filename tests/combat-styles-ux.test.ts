import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const component = readFileSync(new URL("../src/components/CombatStyles.svelte", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/components/Combat.svelte", import.meta.url), "utf8");
const skills = readFileSync(new URL("../src/components/Skills.svelte", import.meta.url), "utf8");

describe("Combat Style display", () => {
  test("Warrior career style opportunities explain their separate roles", () => {
    expect(skills).toContain("Cultural Combat Style (optional)");
    expect(skills).toContain("same cultural style chosen on Page III");
    expect(skills).toContain("Speciality Combat Style (optional)");
    expect(skills).toContain("Choose an existing style or create a custom style");
    expect(skills).toContain("careerCombatStyleRole(career(), i)");
  });

  test("Page VIII does not mount a duplicate Combat Styles editor", () => {
    expect(page).not.toContain("CombatStyles");
    expect(page).not.toContain("combat-styles-compact");
    expect(page).toContain("EquipmentInventory");
  });

  test("keeps saved style summaries compact and read-only on the character sheet", () => {
    expect(component).toContain("class=\"style-card\"");
    expect(component).toContain("class=\"style-list\"");
    expect(component).toContain("combatStyleSummary()");
    expect(component).toContain("Associated weapons");
    expect(component).toContain("<dt>Origin</dt>");
    expect(component).toContain("style.notes");
    expect(component).toContain("style.percentage");
    expect(component).toContain("style.origins");
    expect(component).not.toContain("editing");
    expect(component).not.toContain("style.weapons.push");
    expect(component).not.toContain("background.inventory");
  });

  test("keeps trait rules and source collapsed behind native keyboard-accessible disclosures", () => {
    expect(component).toContain("<details><summary>{trait.displayName}</summary>");
    expect(component).toContain("{trait.description}");
    expect(component).toContain("{trait.source.libraryName}");
  });

  test("keeps associated weapons separate from equipment ownership", () => {
    expect(component).toContain("Associated weapons");
    expect(component).toContain("style.weapons.map");
    expect(component).not.toContain("background.inventory");
    expect(component).not.toContain("currentMoney");
  });
});
