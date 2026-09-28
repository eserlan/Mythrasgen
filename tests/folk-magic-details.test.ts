import { describe, expect, test } from "bun:test";
import {
  CORE_FOLK_MAGIC_DETAILS, CORE_FOLK_MAGIC_SPELLS, FOLK_MAGIC_TRAIT_HELP,
  normalizeFolkMagicState,
} from "../src/lib/folk-magic";

describe("Core Folk Magic chooser details", () => {
  test("provides canonical effects and traits for every Core spell", () => {
    expect(Object.keys(CORE_FOLK_MAGIC_DETAILS)).toHaveLength(CORE_FOLK_MAGIC_SPELLS.length);
    for (const spell of CORE_FOLK_MAGIC_SPELLS) {
      expect(spell.details.traits.length).toBeGreaterThan(0);
      expect(spell.details.effect.length).toBeGreaterThan(0);
    }
    expect(CORE_FOLK_MAGIC_DETAILS.Bladesharp.effect).toContain("one die step");
    expect(CORE_FOLK_MAGIC_DETAILS.Disruption.effect).toContain("1d3 damage");
    expect(CORE_FOLK_MAGIC_DETAILS.Breath.mechanicsGap).toBeUndefined();
    expect(FOLK_MAGIC_TRAIT_HELP.Ranged).toContain("Folk Magic skill in metres");
  });

  test("uses the Core traits and spell limits for historically error-prone details", () => {
    expect(CORE_FOLK_MAGIC_DETAILS.Bypass.traits).toEqual(["Touch", "Trigger"]);
    expect(CORE_FOLK_MAGIC_DETAILS.Calculate.traits).toEqual(["Instant", "Ranged"]);
    expect(CORE_FOLK_MAGIC_DETAILS.Incognito.traits).toEqual(["Resist (Endurance)", "Touch", "Trigger"]);
    expect(CORE_FOLK_MAGIC_DETAILS.Chill.traits).toContain("Instant");
    expect(CORE_FOLK_MAGIC_DETAILS.Heat.effect).toContain("one third of the caster's POW");
    expect(CORE_FOLK_MAGIC_DETAILS.Heal.effect).toContain("Minor Wound");
    expect(FOLK_MAGIC_TRAIT_HELP.Trigger).toContain("later activation");
    expect(FOLK_MAGIC_TRAIT_HELP["Resist (Special)"]).toContain("specifies how the target resists");
  });

  test("uses Babble as the display name while retaining the saved Babel spell ID", () => {
    expect(CORE_FOLK_MAGIC_SPELLS.find(spell => spell.name === "Babble")?.id).toBe("folk-magic:babel");
    expect(CORE_FOLK_MAGIC_SPELLS.some(spell => spell.name === "Babel")).toBe(false);
  });

  test("stores separate Find subjects as separately learned spells", () => {
    const state = normalizeFolkMagicState({
      knownSpells: ["Livestock", "Sickness"].map(specialisation => ({
        spell: { spellId: "folk-magic:find", specialisation }, provenance: [],
      })),
      customSpells: [],
    });
    expect(state.knownSpells).toHaveLength(2);
    expect(state.knownSpells.map(item => item.spell.specialisation)).toEqual(["Livestock", "Sickness"]);
    expect(CORE_FOLK_MAGIC_DETAILS.Find.specialisation?.examples).toContain("Livestock");
    expect(CORE_FOLK_MAGIC_DETAILS.Find.specialisation?.customSubjects).toBe(true);
  });

  test("keeps custom descriptions separate from Core spell details", () => {
    const state = normalizeFolkMagicState({
      customSpells: [{ id: "custom:folk-magic:1", name: "Bladesharp", description: "Campaign version", source: "custom" }],
      knownSpells: [],
    });
    expect(state.customSpells[0].description).toBe("Campaign version");
    expect(CORE_FOLK_MAGIC_DETAILS.Bladesharp.effect).not.toBe(state.customSpells[0].description);
  });
});
