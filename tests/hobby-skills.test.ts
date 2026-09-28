import { describe, expect, test } from "bun:test";
import { HOBBY_PROFESSIONAL_SKILLS, mergeHobbyProfessionalSkillTemplates, restoreHobbySkill, sortHobbyProfessionalSkills } from "../src/lib/hobby-skills";
import { CORE_COMBAT_STYLES, resolveCoreCombatStyle } from "../src/lib/combat-styles";
import { careers } from "../src/lib/content";

// Bun runs the store module without Svelte's compiler, so provide its identity rune.
(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const store = await import("../src/lib/store.svelte");

describe("optional Page V Hobby Skill", () => {
  test("sorts complete option labels alphabetically regardless of source insertion order", () => {
    const labels = [
      "Trance", "Craft (Mining)", "Lore (any)", "Craft (any)", "Binding (Cult, Totem or Tradition)",
      "Craft (Animal Husbandry)", "Acrobatics", "Craft (Alchemy)", "Craft (Hunting Related)",
    ];
    const expected = [
      "Acrobatics", "Binding (Cult, Totem or Tradition)", "Craft (Alchemy)",
      "Craft (Animal Husbandry)", "Craft (any)", "Craft (Hunting Related)", "Craft (Mining)",
      "Lore (any)", "Trance",
    ];

    expect(sortHobbyProfessionalSkills(labels)).toEqual(expected);
    expect(sortHobbyProfessionalSkills([...labels].reverse())).toEqual(expected);
    expect(sortHobbyProfessionalSkills([...HOBBY_PROFESSIONAL_SKILLS].reverse())).toEqual(HOBBY_PROFESSIONAL_SKILLS);
  });

  test("merges a bare core Binding into the specialised catalogue template", () => {
    const catalogue = mergeHobbyProfessionalSkillTemplates([
      ["Acrobatics", "Binding"],
      ["Binding (Cult, Totem or Tradition)"],
    ]);

    expect(catalogue.filter(name => name === "Binding" || name.startsWith("Binding ("))).toEqual([
      "Binding (Cult, Totem or Tradition)",
    ]);
    expect(HOBBY_PROFESSIONAL_SKILLS.filter(name => name === "Binding" || name.startsWith("Binding ("))).toEqual([
      "Binding (Cult, Totem or Tradition)",
    ]);
    expect(catalogue.indexOf("Binding (Cult, Totem or Tradition)")).toBe(catalogue.indexOf("Acrobatics") + 1);
  });

  test("offers registered Professional Skills and requires concrete specialisations", () => {
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Art (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Craft (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Language (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Lore (any)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Devotion (Pantheon, Cult or God)");
    expect(HOBBY_PROFESSIONAL_SKILLS).toContain("Invocation (Cult, School or Grimoire)");
    expect(restoreHobbySkill("Binding (Cult, Totem or Tradition)")).toBeNull();
    expect(restoreHobbySkill({
      type: "professionalSkill", template: "Binding (Cult, Totem or Tradition)", specialisation: " ",
    })).toBeNull();
    expect(HOBBY_PROFESSIONAL_SKILLS.some(name => name.startsWith("Combat Style"))).toBe(false);
    expect(restoreHobbySkill({ type: "professionalSkill", template: "Lore (any)", specialisation: "any" })).toBeNull();
    expect(restoreHobbySkill("Lore (any)")).toBeNull();
    expect(restoreHobbySkill("Lore (Astronomy)")).toEqual({
      type: "professionalSkill", template: "Lore (any)", specialisation: "Astronomy", name: "Lore (Astronomy)",
    });
    expect(restoreHobbySkill("Devotion (Pantheon, Cult or God)")).toBeNull();
    expect(restoreHobbySkill({ type: "professionalSkill", template: "Invocation (Cult, School or Grimoire)", specialisation: " " })).toBeNull();
  });

  test.each([
    ["Binding (Cult, Totem or Tradition)", "Bear Totem", "Ancestor Tradition"],
    ["Devotion (Pantheon, Cult or God)", "Orlanth", "Cult of Mithras"],
    ["Invocation (Cult, School or Grimoire)", "College of Pyromancy", "The Black Grimoire"],
  ])("keeps %s concrete through allocation changes and save/load", (template, first, second) => {
    const { char, replace, setHobbyProfessionalSkill, setAlloc, bonusEligible } = store;
    replace({ ...char, hobbySkill: null, alloc: { culture: {}, career: {}, bonus: {} } });

    setHobbyProfessionalSkill(template, first);
    const firstName = `${template.split(" (")[0]} (${first})`;
    expect(char.hobbySkill).toEqual({ type: "professionalSkill", template, specialisation: first, name: firstName });
    expect(bonusEligible()).toContain(firstName);
    setAlloc("bonus", firstName, 8);

    setHobbyProfessionalSkill(template, second);
    const secondName = `${template.split(" (")[0]} (${second})`;
    expect(char.hobbySkill).toEqual({ type: "professionalSkill", template, specialisation: second, name: secondName });
    expect(char.alloc.bonus[firstName]).toBeUndefined();
    expect(bonusEligible()).toContain(secondName);

    const saved = JSON.parse(JSON.stringify(char));
    replace(saved);
    expect(char.hobbySkill).toEqual({ type: "professionalSkill", template, specialisation: second, name: secondName });

    setAlloc("bonus", secondName, 7);
    setHobbyProfessionalSkill(template);
    expect(char.hobbySkill).toBeNull();
    expect(char.alloc.bonus[secondName]).toBeUndefined();
  });

  test("rejects a Binding hobby already learned through a Career and checks source selectors", () => {
    const { char, replace, setHobbyProfessionalSkill } = store;
    const template = "Binding (Cult, Totem or Tradition)";
    const shaman = careers.findIndex(item => item.name === "Shaman");
    expect(careers[shaman].professional.filter(name => name === "Binding" || name.startsWith("Binding ("))).toEqual([template]);
    expect(careers.every(item => !(item.professional.includes("Binding")
      && item.professional.some(name => name.startsWith("Binding ("))))).toBe(true);

    replace({
      ...char,
      career: shaman,
      careerProfessional: [template],
      skillSpecialisations: { culture: {}, career: { [template]: "Bear Totem" } },
      hobbySkill: null,
      alloc: { culture: {}, career: {}, bonus: {} },
    });
    setHobbyProfessionalSkill(template, "Bear Totem");
    expect(char.hobbySkill).toBeNull();
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
