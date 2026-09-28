import { describe, expect, test } from "bun:test";
import { HOBBY_PROFESSIONAL_SKILLS, restoreHobbySkill } from "../src/lib/hobby-skills";
import { CORE_COMBAT_STYLES, resolveCoreCombatStyle } from "../src/lib/combat-styles";

// Bun runs the store module without Svelte's compiler, so provide its identity rune.
(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const store = await import("../src/lib/store.svelte");

describe("optional Page V Hobby Skill", () => {
  test("offers registered Professional Skills and requires concrete specialisations", () => {
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Art (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Craft (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Language (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Lore (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS.some(name => name.startsWith("Combat Style"))).toBe(false);
    expect(restoreHobbySkill({ type: "professionalSkill", template: "Lore (any)", specialisation: "any" })).toBeNull();
    expect(restoreHobbySkill("Lore (any)")).toBeNull();
    expect(restoreHobbySkill("Lore (Astronomy)")).toEqual({
      type: "professionalSkill", template: "Lore (any)", specialisation: "Astronomy", name: "Lore (Astronomy)",
    });
  });

  test("allows one hobby at a time and reconciles bonus allocations when switching branches", () => {
    const { char, replace, setHobbyProfessionalSkill, chooseBonusCombatStyle, setAlloc, bonusEligible } = store;
    replace({
      ...char,
      cultureSelections: { standard: [], professional: [], combatStyle: "Street Brawler" },
      careerProfessional: [], careerCombatStyles: [], combatStyles: [], hobbySkill: null,
      alloc: { culture: {}, career: {}, bonus: {} },
    });

    setHobbyProfessionalSkill("Craft (any)", "Blacksmithing");
    expect(char.hobbySkill).toEqual({ type: "professionalSkill", template: "Craft (any)", specialisation: "Blacksmithing", name: "Craft (Blacksmithing)" });
    expect(bonusEligible()).toContain("Craft (Blacksmithing)");
    setAlloc("bonus", "Craft (Blacksmithing)", 12);

    const style = resolveCoreCombatStyle(CORE_COMBAT_STYLES[1], [0], [0])!;
    chooseBonusCombatStyle(style);
    expect(char.hobbySkill).toEqual({ type: "combatStyle", name: style.name });
    expect(char.cultureSelections.combatStyle).toBe("Street Brawler");
    expect(char.alloc.bonus["Craft (Blacksmithing)"]).toBeUndefined();
    expect(bonusEligible()).toContain(style.name);
    setAlloc("bonus", style.name, 10);

    setHobbyProfessionalSkill("Lore (any)", "Astronomy");
    expect(char.hobbySkill).toEqual({ type: "professionalSkill", template: "Lore (any)", specialisation: "Astronomy", name: "Lore (Astronomy)" });
    expect(char.alloc.bonus[style.name]).toBeUndefined();
    expect(char.combatStyles.some(item => item.name === style.name)).toBe(false);
    expect(bonusEligible()).toContain("Lore (Astronomy)");
    expect(bonusEligible()).not.toContain(style.name);
  });

  test("round trips typed selections and drops legacy arbitrary extras", () => {
    const { char, replace, bonusEligible } = store;
    replace({
      ...char,
      hobbySkill: { type: "professionalSkill", template: "Art (any)", specialisation: "Painting", name: "Art (Painting)" },
      extras: ["Invented Skill"],
      alloc: { culture: {}, career: {}, bonus: { "Art (Painting)": 8, "Invented Skill": 9 } },
    } as Parameters<typeof replace>[0]);

    const saved = JSON.parse(JSON.stringify(char));
    replace(saved);
    expect(char.hobbySkill).toEqual({ type: "professionalSkill", template: "Art (any)", specialisation: "Painting", name: "Art (Painting)" });
    expect(char.alloc.bonus).toEqual({ "Art (Painting)": 8 });
    expect(bonusEligible()).not.toContain("Invented Skill");

    replace({ ...char, hobbySkill: "Lore (Astronomy)", extras: ["Invented Skill"] } as Parameters<typeof replace>[0]);
    expect(char.hobbySkill).toEqual({ type: "professionalSkill", template: "Lore (any)", specialisation: "Astronomy", name: "Lore (Astronomy)" });
    replace({ ...char, hobbySkill: "Invented Skill", extras: ["Invented Skill"] } as Parameters<typeof replace>[0]);
    expect(char.hobbySkill).toBeNull();
    expect(bonusEligible()).not.toContain("Invented Skill");
  });
});
