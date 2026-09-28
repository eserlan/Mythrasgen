import { describe, expect, test } from "bun:test";
import { attachCharacterStyle, CORE_COMBAT_STYLES, CORE_COMBAT_TRAITS, customCombatStyle, legacyCombatStyle, normalizeCombatStyles, resolveCoreCombatStyle, type CharacterCombatStyle } from "../src/lib/combat-styles";
import { CHARACTER_LIBRARY_KEY, createCharacterRepository, type StorageLike } from "../src/lib/character-library";

// Bun runs the store without Svelte's compiler, so provide the identity state helper.
(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const store = await import("../src/lib/store.svelte");

// Name fixture audited against Mythras Core Rules, 3rd edition, Combat Style Traits table (p. 89).
const CORE_TRAIT_SOURCE_FIXTURE = [
  "Assassination", "Batter Aside", "Beast-back Lancer", "Blind Fighting", "Cautious Fighter", "Chariot Fighting",
  "Daredevil", "Defensive Minded", "Do or Die", "Excellent Footwork", "Formation Fighting", "Hidden Weapons",
  "Intimidating Scream", "Knockout Blow", "Mancatcher", "Mounted Combat", "Ranged Marksman", "Shield Splitter",
  "Shield Wall", "Siege Warfare", "Skirmishing", "Swashbuckling", "Throw Weapons", "Trained Beast",
  "Unarmed Prowess", "Water Combat",
];

describe("structured Combat Styles", () => {
  test("contains every trait from the Core table in one canonical, sourced catalogue", () => {
    expect(CORE_COMBAT_TRAITS.map(trait => trait.name)).toEqual(CORE_TRAIT_SOURCE_FIXTURE);
    expect(new Set(CORE_COMBAT_TRAITS.map(trait => trait.id)).size).toBe(CORE_TRAIT_SOURCE_FIXTURE.length);
    for (const trait of CORE_COMBAT_TRAITS) {
      expect(trait).toMatchObject({
        id: `mythras-core:trait:${trait.name.toLowerCase().replaceAll(" ", "-")}`,
        displayName: trait.name,
        source: { libraryId: "mythras-core", libraryName: "Mythras Core", reference: "Mythras Core Rules, 3rd edition: Combat Style Traits, p. 89" },
      });
      expect(trait.description?.length).toBeGreaterThan(10);
    }
    expect(Object.isFrozen(CORE_COMBAT_TRAITS)).toBe(true);
  });

  test("ships exactly the ten Sample Combat Styles with core weapons, traits, and STR + DEX bases", () => {
    expect(CORE_COMBAT_STYLES.map(style => style.name)).toEqual([
      "Street Brawler", "Assassin", "Barbarian Warrior", "Cavalry", "City Watch", "Gladiator", "Marine", "Master Archer", "Meerish Slinger", "Noble Warrior",
    ]);
    expect(CORE_COMBAT_STYLES.every(style => style.baseFormula.join("+") === "STR+DEX" && style.source.libraryId === "mythras-core"
      && style.source.reference?.includes("Characters, p. 12"))).toBe(true);
    expect(CORE_COMBAT_STYLES.map(style => style.weapons.map(weapon => weapon.name))).toEqual([
      ["Fists", "Feet", "Knife", "Club"], ["Dagger", "Shortsword"], ["Greatsword", "Broadsword", "Battleaxe", "Shield"],
      ["Sword", "Long Spear/Lance", "Shield"], ["Spear", "Shield", "Shortsword"], ["Shortsword", "Buckler", "Net", "Trident"],
      ["Club", "Main Gauche"], ["Dagger", "Shortsword", "Long Bow"], ["Shortsword", "Shield", "Sling"], ["Longsword", "Shield", "Main Gauche", "Bow"],
    ]);
    expect(CORE_COMBAT_STYLES[7].traits).toEqual([]);
    expect(CORE_COMBAT_STYLES[9].traits.map(trait => trait.name)).toEqual(["Defensive Minded"]);
    expect(CORE_COMBAT_STYLES.some(style => style.name === "Meerish Infantry")).toBe(false);
    expect(Object.isFrozen(CORE_COMBAT_STYLES)).toBe(true);
    expect(Object.isFrozen(CORE_COMBAT_STYLES[0].traitChoices?.[0])).toBe(true);
    expect(CORE_COMBAT_STYLES.map(style => (style.traitChoices ?? []).map(group => group.map(trait => trait.name)))).toEqual([
      [["Batter Aside", "Unarmed Prowess"]], [["Assassination", "Ranged Marksman"]], [["Do or Die", "Intimidating Scream"]],
      [["Beast-back Lancer", "Mounted Combat"]], [["Cautious Fighter", "Formation Fighting"]], [["Daredevil", "Mancatcher"]],
      [["Excellent Footwork", "Swashbuckling"]], [["Ranged Marksman", "Skirmishing"]], [["Knockout Blow", "Shield Wall"]], [],
    ]);
    expect(CORE_COMBAT_STYLES.map(style => (style.weaponChoices ?? []).map(group => group.map(weapon => weapon.name)))).toEqual([
      [], [["Bow", "Crossbow"]], [], [], [], [], [["Falchion", "Rapier"]], [], [], [],
    ]);
    for (const style of CORE_COMBAT_STYLES) {
      for (const trait of [...style.traits, ...(style.traitChoices ?? []).flat()]) {
        expect(typeof trait.id).toBe("string");
        expect(trait.displayName).toBe(trait.name);
        expect(trait.source.libraryId).toBe("mythras-core");
        expect(CORE_COMBAT_TRAITS.find(coreTrait => coreTrait.id === trait.id)).toBe(trait);
      }
    }
  });

  test("preserves OR alternatives and resolves every choice explicitly before selection", () => {
    const streetBrawler = CORE_COMBAT_STYLES[0];
    expect(streetBrawler.traitChoices?.[0].map(trait => trait.name)).toEqual(["Batter Aside", "Unarmed Prowess"]);
    expect(resolveCoreCombatStyle(streetBrawler)).toBeNull();
    expect(resolveCoreCombatStyle(streetBrawler, [], [1])?.traits.map(trait => trait.name)).toEqual(["Unarmed Prowess"]);

    const assassin = CORE_COMBAT_STYLES[1];
    expect(resolveCoreCombatStyle(assassin, [], [0])).toBeNull();
    expect(resolveCoreCombatStyle(assassin, [1], [0])).toMatchObject({
      weapons: [{ name: "Dagger" }, { name: "Shortsword" }, { name: "Crossbow" }],
      traits: [{ name: "Assassination" }],
    });
    const resolvedAssassin = resolveCoreCombatStyle(assassin, [0], [1])!;
    const characterStyle = attachCharacterStyle([], resolvedAssassin, "culture")[0];
    expect(characterStyle.traits.map(trait => trait.name)).toEqual(["Ranged Marksman"]);
    expect("traitChoices" in characterStyle).toBe(false);
    expect(assassin.traitChoices?.[0].map(trait => trait.name)).toEqual(["Assassination", "Ranged Marksman"]);
    expect(CORE_COMBAT_STYLES[3].aliases).toEqual(["Mounted Knight"]);
    expect(CORE_COMBAT_STYLES[4].aliases).toEqual(["Hoplite"]);
    expect(CORE_COMBAT_STYLES[6].aliases).toEqual(["Pirate"]);
    expect(CORE_COMBAT_STYLES[6].weaponChoices?.[0].map(weapon => weapon.name)).toEqual(["Falchion", "Rapier"]);
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
    const style = resolveCoreCombatStyle(CORE_COMBAT_STYLES[0], [], [0])!;
    let character: CharacterCombatStyle[] = attachCharacterStyle([], style, "culture");
    character[0].allocations.culture = 10;
    character[0].weapons.push({ name: "Campaign axe" });
    character = attachCharacterStyle(character, style, "career");
    expect(character).toHaveLength(1);
    expect(character[0].origin).toBe("culture");
    expect(character[0].origins).toEqual(["culture", "career"]);
    expect(character[0].allocations.culture).toBe(10);
    expect(character[0].weapons.at(-1)?.name).toBe("Campaign axe");
    expect(style.weapons.map(weapon => weapon.name)).toEqual(["Fists", "Feet", "Knife", "Club"]);

    const first = customCombatStyle("Guard", ["Spear"], []);
    const second = customCombatStyle("Guard", ["Bow"], []);
    expect(attachCharacterStyle(attachCharacterStyle(character, first, "custom"), second, "custom")).toHaveLength(3);
  });

  test("migrates legacy names without guessing weapons or traits", () => {
    const known = legacyCombatStyle("Meerish Slinger");
    expect(known.id).toBe("mythras-core:meerish-slinger");
    expect(known.weapons.map(weapon => weapon.name)).toEqual(["Shortsword", "Shield", "Sling"]);
    expect(known.traits).toEqual([]);
    expect(legacyCombatStyle("Meerish Infantry")).toMatchObject({
      id: "mythras-core:meerish-infantry", name: "Meerish Infantry", origin: "legacy",
      weapons: [{ name: "Spear" }, { name: "Hoplite Shield" }, { name: "Javelin" }],
      traits: [{ name: "Formation Fighting" }],
    });
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
    const custom = customCombatStyle("River Guard", ["Spear"], [CORE_COMBAT_TRAITS.find(trait => trait.name === "Blind Fighting")!]);
    const selectedAssassin = attachCharacterStyle([], resolveCoreCombatStyle(CORE_COMBAT_STYLES[1], [0], [1])!, "career")[0];
    const styles = [{ ...legacyCombatStyle("Meerish Infantry", "culture"), allocations: { culture: 10 } },
      selectedAssassin,
      { ...custom, origin: "custom" as const, origins: ["custom" as const], allocations: {} }];
    initial.saveCharacter({ id: "character", combatStyles: styles });
    const restored = createCharacterRepository<{ id: string; combatStyles: CharacterCombatStyle[] }>(storage,
      () => ({ combatStyles: [] }), undefined, () => "other");
    expect(values.has(CHARACTER_LIBRARY_KEY)).toBe(true);
    expect(restored.getCharacter("character")?.combatStyles).toEqual(styles);
    expect(restored.getCharacter("character")?.combatStyles[1].traits.map(trait => trait.name)).toEqual(["Ranged Marksman"]);
    expect("traitChoices" in restored.getCharacter("character")!.combatStyles[1]).toBe(false);
    expect(normalizeCombatStyles([{ ...selectedAssassin, traitChoices: CORE_COMBAT_STYLES[1].traitChoices }])[0]).not.toHaveProperty("traitChoices");
  });
  test("choosing an already learned bonus Combat Style preserves an unrelated hobby and its points", () => {
    const { char, replace, chooseBonusCombatStyle } = store;
    replace({
      ...char,
      cultureSelections: { standard: [], professional: [], combatStyle: "Street Brawler" },
      hobbySkill: "Craft (Carpentry)",
      alloc: { culture: {}, career: {}, bonus: { "Craft (Carpentry)": 8 } },
    });

    chooseBonusCombatStyle(resolveCoreCombatStyle(CORE_COMBAT_STYLES[0], [], [0])!);

    expect(char.hobbySkill).toBe("Craft (Carpentry)");
    expect(char.alloc.bonus["Craft (Carpentry)"]).toBe(8);
  });
});
