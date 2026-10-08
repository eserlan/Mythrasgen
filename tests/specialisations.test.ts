import { describe, expect, test } from "bun:test";
import { formulaVal, skillDef } from "../src/lib/calc";
import { careers, cultures } from "../src/lib/content";
import { concreteSkillName, hasMeaningfulSpecialisation, professionalSkillMetadata, requiresSpecialisation, resolveSkillTemplate, specialisationStageErrors } from "../src/lib/specialisations";

// Bun runs this store module without Svelte's compiler, so provide the identity
// implementation needed to exercise its module initialization and plain state.
(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const store = await import("../src/lib/store.svelte");

describe("Professional Skill specialisations", () => {
  test.each(["Art (any)", "Craft (any)", "Language (any)", "Lore (any)"])("resolves %s to a concrete skill", template => {
    expect(requiresSpecialisation(template)).toBe(true);
    const concrete = resolveSkillTemplate(template, "  Example  ");
    expect(concrete).toBe(`${template.split(" ")[0]} (Example)`);
    expect(skillDef(concrete!).f).toEqual(skillDef(template.split(" ")[0]).f);
  });

  test.each([
    ["Binding (Cult, Totem or Tradition)", "Binding", "Cult, Totem or Tradition", "Bear Totem"],
    ["Devotion (Pantheon, Cult or God)", "Devotion", "Pantheon, Cult or God", "Orlanth"],
    ["Invocation (Cult, School or Grimoire)", "Invocation", "Cult, School or Grimoire", "College of Pyromancy"],
  ])("uses shared metadata to resolve %s", (template, name, prompt, value) => {
    expect(professionalSkillMetadata(template)).toEqual({
      name, requiresSpecialisation: true, specialisationPrompt: prompt,
    });
    expect(resolveSkillTemplate(template, "   ")).toBeNull();
    expect(resolveSkillTemplate(template, value)).toBe(`${name} (${value})`);
    expect(specialisationStageErrors([template], { [template]: "   " })).toHaveLength(1);
    expect(specialisationStageErrors([template], { [template]: value })).toEqual([]);
  });

  test("flags selected incomplete templates and accepts only meaningful text", () => {
    expect(specialisationStageErrors(["Art (any)"], {})).toHaveLength(1);
    expect(specialisationStageErrors(["Art (any)"], { "Art (any)": "   " })).toHaveLength(1);
    expect(specialisationStageErrors(["Art (any)"], { "Art (any)": "any" })).toHaveLength(1);
    expect(specialisationStageErrors(["Art (any)"], { "Art (any)": "Painting" })).toEqual([]);
    expect(hasMeaningfulSpecialisation("---")).toBe(false);
    expect(resolveSkillTemplate("Lore (any)", "any")).toBeNull();
  });

  test("keeps stage duplicates unified and different specialisations distinct", () => {
    const cultureTemplate = cultures[1].professional.find(name => name === "Lore (any)")!;
    const careerTemplate = careers.find(item => item.name === "Courtier")!.professional.find(name => name === "Lore (any)")!;
    const learned = new Set([
      resolveSkillTemplate(cultureTemplate, "Wilderness"),
      resolveSkillTemplate(careerTemplate, "Wilderness"),
      resolveSkillTemplate(careerTemplate, "History"),
    ]);
    expect([...learned]).toEqual(["Lore (Wilderness)", "Lore (History)"]);
  });

  test("keeps additional Language distinct from Native Tongue and resolves official placeholder metadata", () => {
    expect(concreteSkillName("Language (any)", "Dwarven")).toBe("Language (Dwarven)");
    expect(resolveSkillTemplate("Language (any)", "Dwarven")).not.toBe("Native Tongue (Dwarven)");
    const chars = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 12 } as const;
    expect(formulaVal(skillDef("Language (Dwarven)").f, chars)).toBe(27);
    expect(requiresSpecialisation("Craft (Primary)")).toBe(true);
    expect(requiresSpecialisation("Lore (Agriculture)")).toBe(false);
  });

  test("initializes the store and accepts allocations for resolved culture and career skills", () => {
    const { char, setAlloc, setSkillSpecialisation } = store;
    char.culture = cultures.findIndex(item => item.name === "Barbarian");
    char.cultureSelections.professional = ["Lore (any)"];
    char.skillSpecialisations.culture = { "Lore (any)": "Wilderness" };
    char.alloc.culture = {};
    setAlloc("culture", "Lore (Wilderness)", 10);
    expect(char.alloc.culture["Lore (Wilderness)"]).toBe(10);

    char.career = careers.findIndex(item => item.name === "Scholar");
    char.careerProfessional = ["Lore (Primary)"];
    char.skillSpecialisations.career = { "Lore (Primary)": "History" };
    char.alloc.career = {};
    setAlloc("career", "Lore (History)", 10);
    expect(char.alloc.career["Lore (History)"]).toBe(10);

    // Keep this test from affecting later tests that share the singleton store.
    setSkillSpecialisation("culture", "Lore (any)", "");
  });

  test("hydrates legacy culture and career labels without validating them as skills", () => {
    const { normalizeCharacter } = store;
    const restored = normalizeCharacter({
      id: "legacy-barbarian",
      name: "Old Barbarian",
      cultureSelections: { standard: [], professional: ["Barbarian"], combatStyle: "" },
      careerProfessional: ["Barbarian", "Hunter"],
      alloc: { culture: {}, career: {}, bonus: {} },
    });

    expect(restored).toMatchObject({ id: "legacy-barbarian", name: "Old Barbarian",
      culture: cultures.findIndex(item => item.name === "Barbarian"),
      career: careers.findIndex(item => item.name === "Hunter") });
    expect(restored.cultureSelections.professional).toEqual([]);
    expect(restored.careerProfessional).toEqual([]);
    expect(restored.magic.disciplines).toEqual([]);

    // Current-name career strings must not be reinterpreted as legacy indices.
    const stringCareer = normalizeCharacter(JSON.parse('{"id":"legacy-career","career":"Hunter"}'));
    expect(stringCareer.career).toBe(careers.findIndex(item => item.name === "Hunter"));
  });

  test("preserves old template allocations until a specialisation can receive them", () => {
    const { char, replace, setSkillSpecialisation } = store;
    const scholar = careers.findIndex(item => item.name === "Scholar");
    replace({
      ...char,
      culture: cultures.findIndex(item => item.name === "Barbarian"),
      career: scholar,
      cultureSelections: { standard: [], professional: ["Lore (any)"], combatStyle: "" },
      careerProfessional: ["Lore (Primary)"],
      skillSpecialisations: { culture: {}, career: {} },
      alloc: {
        culture: { "Lore (any)": 10 },
        career: { "Lore (Primary)": 10 },
        bonus: { "Lore (any)": 10 },
      },
    });
    expect(char.alloc.culture["Lore (any)"]).toBe(10);
    expect(char.alloc.career["Lore (Primary)"]).toBe(10);
    expect(char.alloc.bonus["Lore (any)"]).toBe(10);

    setSkillSpecialisation("culture", "Lore (any)", "Wilderness");
    setSkillSpecialisation("career", "Lore (Primary)", "History");
    expect(char.alloc.culture).toEqual({ "Lore (Wilderness)": 10 });
    expect(char.alloc.career).toEqual({ "Lore (History)": 10 });
    expect(char.alloc.bonus).toEqual({ "Lore (Wilderness)": 10 });
  });
});
