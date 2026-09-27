import { describe, expect, test } from "bun:test";
import { formulaVal, skillDef } from "../src/lib/calc";
import { careers, cultures } from "../src/lib/content";
import { concreteSkillName, hasMeaningfulSpecialisation, requiresSpecialisation, resolveSkillTemplate, specialisationStageErrors } from "../src/lib/specialisations";

describe("Professional Skill specialisations", () => {
  test.each(["Art (any)", "Craft (any)", "Language (any)", "Lore (any)"])("resolves %s to a concrete skill", template => {
    expect(requiresSpecialisation(template)).toBe(true);
    const concrete = resolveSkillTemplate(template, "  Example  ");
    expect(concrete).toBe(`${template.split(" ")[0]} (Example)`);
    expect(skillDef(concrete!).f).toEqual(skillDef(template.split(" ")[0]).f);
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
});
