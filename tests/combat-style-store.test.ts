import { describe, expect, test } from "bun:test";
import { careers } from "../src/lib/content";
import { CORE_COMBAT_STYLES, resolveCoreCombatStyle } from "../src/lib/combat-styles";

// Bun runs this store module without Svelte's compiler, so provide its identity rune.
(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const store = await import("../src/lib/store.svelte");

describe("career Combat Style selection", () => {
  test("removing a style also removes its career allocation and eligibility", () => {
    const { char, replace, chooseCareerCombatStyle, setAlloc, stepSkills } = store;
    replace({
      ...char,
      career: careers.findIndex(career => career.name === "Warrior"),
      careerProfessional: [],
      careerCombatStyles: [],
      combatStyles: [],
      cultureSelections: { standard: [], professional: [], combatStyle: "" },
      alloc: { culture: {}, career: {}, bonus: {} },
    });

    const style = CORE_COMBAT_STYLES[0];
    chooseCareerCombatStyle(0, style);
    setAlloc("career", style.name, 10);
    expect(char.alloc.career[style.name]).toBe(10);

    chooseCareerCombatStyle(0, null);
    expect(char.alloc.career[style.name]).toBeUndefined();
    expect(stepSkills("career")).not.toContain(style.name);
  });
});

describe("Culture Combat Style selection", () => {
  test("the selected style is eligible for cultural points and removing it clears its allocation", () => {
    const { char, replace, chooseCultureCombatStyle, setAlloc, stepSkills } = store;
    replace({
      ...char,
      culture: 0,
      cultureSelections: { standard: [["Boating"]], professional: [], combatStyle: "" },
      combatStyles: [],
      alloc: { culture: {}, career: {}, bonus: {} },
    });

    const style = CORE_COMBAT_STYLES[0];
    chooseCultureCombatStyle(style);
    expect(stepSkills("culture")).toContain(style.name);
    setAlloc("culture", style.name, 10);
    expect(char.alloc.culture[style.name]).toBe(10);

    chooseCultureCombatStyle(null);
    expect(char.alloc.culture[style.name]).toBeUndefined();
    expect(stepSkills("culture")).not.toContain(style.name);
  });
});

describe("Combat Style data and equipment ownership remain separate", () => {
  test("character normalization preserves custom weapons, selected traits, allocations, and origins", () => {
    const { char, replace, setAlloc, normalizeCharacter } = store;
    const selected = resolveCoreCombatStyle(CORE_COMBAT_STYLES[0], [], [1])!;
    const style = {
      ...selected,
      origin: "culture" as const,
      origins: ["culture" as const, "career" as const],
      allocations: { culture: 15 },
      weapons: [...selected.weapons, { name: "Campaign spear" }],
    };
    replace({
      ...char,
      career: careers.findIndex(career => career.name === "Warrior"),
      cultureSelections: { standard: [], professional: [], combatStyle: style.name },
      combatStyles: [style],
      alloc: { culture: {}, career: {}, bonus: {} },
    });
    setAlloc("culture", style.name, 15);
    const restored = normalizeCharacter(JSON.parse(JSON.stringify(char)));

    expect(restored.combatStyles).toHaveLength(1);
    expect(restored.combatStyles[0]).toMatchObject({
      id: style.id, name: style.name, origin: "culture", origins: ["culture", "career"],
      weapons: [...style.weapons], traits: [...style.traits], allocations: { culture: 15 },
    });
  });

  test("acquiring owned weapons does not create or change Combat Style training", () => {
    const { char, replace, acquireEquipment } = store;
    const selected = resolveCoreCombatStyle(CORE_COMBAT_STYLES[0], [], [0])!;
    const style = { ...selected, origin: "culture" as const, origins: ["culture" as const], allocations: { culture: 12 } };
    replace({
      ...char,
      cultureSelections: { standard: [], professional: [], combatStyle: style.name },
      combatStyles: [style],
      background: { ...char.background, inventory: [], equipmentTransactions: [] },
    });
    const before = structuredClone(char.combatStyles);

    acquireEquipment("one_handed-dagger", 1, "gifted");

    expect(char.background.inventory.map(item => item.name)).toContain("Dagger");
    expect(char.combatStyles).toEqual(before);
  });
});
