import { describe, expect, test } from "bun:test";
import { cultures } from "../src/lib/content";
import { formulaVal, skillDef } from "../src/lib/calc";
import { cultureSkills, validateCultureAllocation } from "../src/lib/culture";

describe("core culture templates", () => {
  test("provide the four official cultures with their conditional skill choices and passions", () => {
    expect(cultures.map(c => c.name)).toEqual(["Barbarian", "Civilised", "Nomadic", "Primitive"]);
    expect(cultures.map(c => c.standard)).toEqual([
      ["Athletics", "Brawn", "Endurance", "First Aid", "Locale", "Perception"],
      ["Conceal", "Deceit", "Drive", "Influence", "Insight", "Locale", "Willpower"],
      ["Endurance", "First Aid", "Locale", "Perception", "Stealth"],
      ["Brawn", "Endurance", "Evade", "Locale", "Perception", "Stealth"],
    ]);
    expect(cultures.map(c => c.professional)).toEqual([
      ["Craft (any)", "Healing", "Lore (any)", "Musicianship", "Navigate", "Seamanship", "Survival", "Track"],
      ["Art (any)", "Commerce", "Craft (any)", "Courtesy", "Language (any)", "Lore (any)", "Musicianship", "Streetwise"],
      ["Craft (any)", "Culture (any)", "Language (any)", "Lore (any)", "Musicianship", "Navigate", "Survival", "Track"],
      ["Craft (any)", "Healing", "Lore (any)", "Musicianship", "Navigate", "Survival", "Track"],
    ]);
    expect(cultures.map(c => c.professional.length)).toEqual([8, 8, 8, 7]);
    expect(cultures.map(c => c.passions.length)).toEqual([3, 3, 3, 3]);
    expect(cultures[0].standardChoices[0].options).toEqual(["Boating", "Ride"]);
    expect(cultures[2].standardChoices[0]).toMatchObject({ count: 2, options: ["Athletics", "Boating", "Swim", "Drive", "Ride"] });
    expect(cultures[3].standardChoices[0]).toMatchObject({ count: 1, options: ["Athletics", "Boating", "Swim"] });
  });

  test("Customs and Native Tongue each include their independent +40 base", () => {
    const chars = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 } as const;
    expect(formulaVal(skillDef("Customs").f, chars)).toBe(60);
    expect(formulaVal(skillDef("Native Tongue").f, chars)).toBe(60);
  });

  test.each(cultures)("$name accepts a complete 100 point allocation", culture => {
    const standard = culture.standardChoices.map(group => group.options.slice(0, group.count));
    const professional = culture.professional.slice(0, 3);
    const selection = { standard, professional, combatStyle: "People's Combat Style" };
    const eligible = cultureSkills(culture, standard, professional, selection.combatStyle);
    const allocation = Object.fromEntries(eligible.slice(0, 8).map((name, i) => [name, i < 6 ? 15 : 5]));
    expect(validateCultureAllocation(culture, selection, allocation)).toEqual([]);
  });

  test("allows fewer than three professional skills but requires valid choices and the full pool", () => {
    const culture = cultures[0];
    const selection = { standard: [["Boating"]], professional: ["Healing", "Track"], combatStyle: "" };
    const errors = validateCultureAllocation(culture, selection, { Athletics: 15 });
    expect(errors).toContain("Spend all 100 cultural points.");
    const noProfessionals = { ...selection, professional: [] };
    const allocation = Object.fromEntries(cultureSkills(culture, noProfessionals.standard, [], "").map((name, i) => [name, i === 6 ? 10 : 15]));
    expect(validateCultureAllocation(culture, noProfessionals, allocation)).toEqual([]);
    expect(validateCultureAllocation(culture, { ...selection, standard: [["Swim"]], professional: ["Healing", "Track", "Survival"] }, {}))
      .toContain("Complete the culture's standard skill choices.");
    expect(validateCultureAllocation(culture, { ...selection, professional: [...culture.professional.slice(0, 4)] }, {}))
      .toContain("Select up to three valid Professional Skills.");
  });

  test("rejects allocations outside +5..+15 and unavailable skills", () => {
    const culture = cultures[1];
    const selection = { standard: [], professional: culture.professional.slice(0, 3), combatStyle: "" };
    const allocation = { Conceal: 4, Deceit: 16, "Unlisted Skill": 80 };
    expect(validateCultureAllocation(culture, selection, allocation)).toContain("Each cultural skill allocation must be +5 to +15 and use an available skill.");
  });
});
