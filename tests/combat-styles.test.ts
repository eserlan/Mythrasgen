import { describe, expect, test } from "bun:test";
import { attachCharacterStyle, CORE_COMBAT_STYLES, customCombatStyle, legacyCombatStyle, type CharacterCombatStyle } from "../src/lib/combat-styles";
import { CHARACTER_LIBRARY_KEY, createCharacterRepository, type StorageLike } from "../src/lib/character-library";

describe("structured Combat Styles", () => {
  test("ships source-supported Core examples as searchable data with STR + DEX bases", () => {
    expect(CORE_COMBAT_STYLES.map(style => style.name)).toEqual(["Meerish Infantry", "Meerish Slinger"]);
    expect(CORE_COMBAT_STYLES[0]).toMatchObject({
      baseFormula: ["STR", "DEX"],
      weapons: [{ name: "Spear" }, { name: "Hoplite Shield" }, { name: "Javelin" }],
      traits: [{ name: "Formation Fighting" }],
      source: { libraryId: "mythras-core" },
    });
    expect(CORE_COMBAT_STYLES[1].weapons.map(weapon => weapon.name)).toEqual(["Shortsword", "Peltast Shield", "Sling"]);
    expect(CORE_COMBAT_STYLES[1].traits[0].name).toBe("Skirmishing");
  });

  test("creates custom styles with structured weapons, traits, notes and campaign source", () => {
    const style = customCombatStyle("River Guard", ["Spear", " Shield ", ""], [{
      id: "custom:trait:hold-the-line", name: "Hold the Line", displayName: "Hold the Line",
      source: { libraryId: "custom-campaign", libraryName: "Custom / Campaign" },
    }], "Local militia training");
    expect(style).toMatchObject({
      name: "River Guard", status: "custom", baseFormula: ["STR", "DEX"],
      weapons: [{ name: "Spear" }, { name: "Shield" }],
      traits: [{ displayName: "Hold the Line" }], notes: "Local militia training",
      source: { libraryId: "custom-campaign" },
    });
  });

  test("attaches a preset once across stages and keeps distinct custom definitions separate", () => {
    const style = CORE_COMBAT_STYLES[0];
    let character: CharacterCombatStyle[] = attachCharacterStyle([], style, "culture");
    character[0].allocations.culture = 10;
    character = attachCharacterStyle(character, style, "career");
    expect(character).toHaveLength(1);
    expect(character[0].origin).toBe("culture");
    expect(character[0].origins).toEqual(["culture", "career"]);
    expect(character[0].allocations.culture).toBe(10);

    const first = customCombatStyle("Guard", ["Spear"], []);
    const second = customCombatStyle("Guard", ["Bow"], []);
    expect(attachCharacterStyle(attachCharacterStyle(character, first, "custom"), second, "custom")).toHaveLength(3);
  });

  test("migrates legacy names without guessing weapons or traits", () => {
    const known = legacyCombatStyle("Meerish Slinger");
    expect(known.id).toBe("mythras-core:meerish-slinger");
    expect(known.weapons.map(weapon => weapon.name)).toEqual(["Shortsword", "Peltast Shield", "Sling"]);
    expect(known.traits.map(trait => trait.name)).toEqual(["Skirmishing"]);
    expect(legacyCombatStyle("My Campaign Style")).toMatchObject({
      name: "My Campaign Style", status: "custom", weapons: [], traits: [],
      source: { libraryId: "custom-campaign" }, origin: "legacy",
    });
  });

  test("character repository save/load preserves structured style data", () => {
    const values = new Map<string, string>();
    const storage: StorageLike = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
    const initial = createCharacterRepository<{ id: string; combatStyles: CharacterCombatStyle[] }>(storage,
      () => ({ combatStyles: [] }), undefined, () => "character");
    const styles = [
      { ...legacyCombatStyle("Meerish Infantry", "culture"), allocations: { culture: 10 } },
    ];
    initial.saveCharacter({ id: "character", combatStyles: styles });
    const restored = createCharacterRepository<{ id: string; combatStyles: CharacterCombatStyle[] }>(storage,
      () => ({ combatStyles: [] }), undefined, () => "other");
    expect(values.has(CHARACTER_LIBRARY_KEY)).toBe(true);
    expect(restored.getCharacter("character")?.combatStyles).toEqual(styles);
  });
});
