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
    chooseCareerCombatStyle(1, style);
    setAlloc("career", style.name, 10);
    expect(char.alloc.career[style.name]).toBe(10);

    chooseCareerCombatStyle(1, null);
    expect(char.alloc.career[style.name]).toBeUndefined();
    expect(stepSkills("career")).not.toContain(style.name);
  });

  test("Warrior career points improve the existing cultural style without adding a second style", () => {
    const { char, replace, chooseCultureCombatStyle, setAlloc, stepSkills, normalizeCharacter, combatStyleSummary } = store;
    replace({
      ...char,
      career: careers.findIndex(career => career.name === "Warrior"),
      careerProfessional: [],
      careerCombatStyles: [],
      cultureSelections: { standard: [], professional: [], combatStyle: "" },
      combatStyles: [],
      alloc: { culture: {}, career: {}, bonus: {} },
    });
    const style = CORE_COMBAT_STYLES[0];
    chooseCultureCombatStyle(style);

    expect(stepSkills("career")).toContain(style.name);
    setAlloc("career", style.name, 15);
    expect(char.alloc.career[style.name]).toBe(15);
    expect(char.combatStyles).toHaveLength(1);
    expect(combatStyleSummary()[0].origins).toEqual(["culture", "career"]);

    const restored = normalizeCharacter(JSON.parse(JSON.stringify(char)));
    expect(restored.combatStyles).toHaveLength(1);
    expect(restored.alloc.career[style.name]).toBe(15);
    expect(restored.combatStyles[0].origins).toEqual(["culture", "career"]);
  });

  test("changing careers clears old career style picks while retaining cultural styles", () => {
    const { char, replace, chooseCultureCombatStyle, chooseCareerCombatStyle, setAlloc, setCareer, stepSkills } = store;
    replace({
      ...char,
      career: careers.findIndex(career => career.name === "Warrior"),
      careerProfessional: [],
      careerCombatStyles: [],
      cultureSelections: { standard: [], professional: [], combatStyle: "" },
      combatStyles: [],
      alloc: { culture: {}, career: {}, bonus: {} },
    });
    const cultural = CORE_COMBAT_STYLES[0];
    const speciality = CORE_COMBAT_STYLES[1];
    chooseCultureCombatStyle(cultural);
    chooseCareerCombatStyle(1, speciality);
    setAlloc("career", cultural.name, 10);
    setAlloc("career", speciality.name, 10);
    replace(JSON.parse(JSON.stringify(char)));

    setCareer(careers.findIndex(career => career.name === "Agent"));

    expect(char.careerCombatStyles).toEqual([]);
    expect(char.alloc.career).toEqual({});
    expect(stepSkills("career")).not.toContain(speciality.name);
    expect(char.combatStyles.find(style => style.name === cultural.name)?.origins).toEqual(["culture"]);
    expect(char.combatStyles.some(style => style.name === speciality.name)).toBe(false);
  });

  test("migrates an old Warrior first-slot choice to the speciality slot", () => {
    const { char, normalizeCharacter } = store;
    const speciality = CORE_COMBAT_STYLES[1];
    const restored = normalizeCharacter({
      ...char,
      career: careers.findIndex(career => career.name === "Warrior"),
      cultureSelections: { standard: [], professional: [], combatStyle: "" },
      careerCombatStyles: [speciality.name],
      combatStyles: [],
      alloc: { culture: {}, career: { [speciality.name]: 12 }, bonus: {} },
    });

    expect(restored.careerCombatStyles).toEqual(["", speciality.name]);
    expect(restored.alloc.career[speciality.name]).toBe(12);
  });
});

describe("Culture Combat Style selection", () => {
  test("changing culture clears career points on the Warrior's former cultural style", () => {
    const { char, replace, chooseCultureCombatStyle, setAlloc, setCulture, stepSkills } = store;
    replace({
      ...char,
      career: careers.findIndex(career => career.name === "Warrior"),
      cultureSelections: { standard: [], professional: [], combatStyle: "" },
      careerCombatStyles: [],
      combatStyles: [],
      alloc: { culture: {}, career: {}, bonus: {} },
    });

    const style = CORE_COMBAT_STYLES[0];
    chooseCultureCombatStyle(style);
    setAlloc("career", style.name, 10);
    expect(char.alloc.career[style.name]).toBe(10);

    setCulture(1);

    expect(char.culture).toBe(1);
    expect(char.alloc.career[style.name]).toBeUndefined();
    expect(stepSkills("career")).not.toContain(style.name);
  });

  test("changing culture removes only the former Combat Style (...) allocation fallback", () => {
    const { char, replace, setCultureCombatStyle, setAlloc, setCulture, stepSkills } = store;
    replace({
      ...char,
      career: careers.findIndex(career => career.name === "Warrior"),
      cultureSelections: { standard: [], professional: [], combatStyle: "" },
      careerCombatStyles: [],
      combatStyles: [],
      alloc: { culture: {}, career: {}, bonus: {} },
    });
    const formerCulturalStyle = "Combat Style (Legacy Cultural Style)";
    const unrelatedLegacyStyle = "Combat Style (Saved Legacy Style)";
    setCultureCombatStyle(formerCulturalStyle);
    char.alloc.career[unrelatedLegacyStyle] = 15;
    char.alloc.career[formerCulturalStyle] = 10;

    setCulture(1);

    expect(char.alloc.career[formerCulturalStyle]).toBeUndefined();
    expect(char.alloc.career[unrelatedLegacyStyle]).toBe(15);
    expect(stepSkills("career")).not.toContain(formerCulturalStyle);
    expect(stepSkills("career")).toContain(unrelatedLegacyStyle);
  });

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
