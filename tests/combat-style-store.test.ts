import { describe, expect, test } from "bun:test";
import { careers } from "../src/lib/content";
import { CORE_COMBAT_STYLES } from "../src/lib/combat-styles";

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
