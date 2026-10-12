import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const component = readFileSync(new URL("../src/components/CombatStyles.svelte", import.meta.url), "utf8");

describe("Page VIII Combat Styles compact editing UI", () => {
  test("shows compact style summaries and only exposes weapon removal in edit mode", () => {
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

  test("offers catalogue search and custom weapon entry without touching inventory or money", () => {
    expect(component).toContain("Search Core catalogue");
    expect(component).toContain("CORE_COMBAT_STYLE_WEAPONS");
    expect(component).toContain("Custom weapon name");
    expect(component).toContain("style.weapons.push");
    expect(component).not.toContain("background.inventory");
    expect(component).not.toContain("currentMoney");
    expect(component).not.toContain("combatStyleSummary().*alloc");
  });
});
