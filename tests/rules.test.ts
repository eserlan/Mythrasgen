import { describe, expect, test } from "bun:test";
import { formulaVal, nativeTongueName, skillDef } from "../src/lib/calc";
import { MAGIC, PROFESSIONAL, STANDARD } from "../src/lib/rules";

const cases: [string, string][] = [
  ["Athletics", "STR+DEX"], ["Boating", "STR+CON"], ["Brawn", "STR+SIZ"],
  ["Conceal", "DEX+POW"], ["Customs", "INTx2+40"], ["Dance", "DEX+CHA"],
  ["Deceit", "INT+CHA"], ["Drive", "DEX+POW"], ["Endurance", "CONx2"],
  ["Evade", "DEXx2"], ["First Aid", "INT+DEX"], ["Influence", "CHAx2"],
  ["Insight", "INT+POW"], ["Locale", "INTx2"], ["Native Tongue", "INT+CHA+40"],
  ["Perception", "INT+POW"], ["Ride", "DEX+POW"], ["Sing", "CHA+POW"],
  ["Stealth", "DEX+INT"], ["Swim", "STR+CON"], ["Unarmed", "STR+DEX"], ["Willpower", "POWx2"],
  ["Acrobatics", "STR+DEX"], ["Acting", "CHAx2"], ["Art", "POW+CHA"],
  ["Bureaucracy", "INTx2"], ["Commerce", "INT+CHA"], ["Courtesy", "INT+CHA"],
  ["Craft", "DEX+INT"], ["Culture", "INTx2"], ["Disguise", "INT+CHA"],
  ["Engineering", "INTx2"], ["Exhort", "INT+CHA"], ["Gambling", "INT+POW"],
  ["Healing", "INT+POW"], ["Language", "INT+CHA"], ["Literacy", "INTx2"],
  ["Lockpicking", "DEXx2"], ["Lore", "INTx2"], ["Mechanisms", "DEX+INT"],
  ["Musicianship", "DEX+CHA"], ["Navigation", "INT+POW"], ["Navigate", "INT+POW"], ["Oratory", "POW+CHA"],
  ["Seamanship", "INT+CON"], ["Seduction", "INT+CHA"], ["Sleight", "DEX+CHA"],
  ["Streetwise", "POW+CHA"], ["Survival", "CON+POW"], ["Teach", "INT+CHA"],
  ["Track", "INT+CON"],
  ["Binding", "POW+CHA"], ["Devotion", "POW+CHA"], ["Folk Magic", "POW+CHA"],
  ["Invocation", "INTx2"], ["Meditation", "INT+CON"], ["Mysticism", "POW+CON"],
  ["Shaping", "INT+POW"], ["Trance", "POW+CON"],
  ["Combat Style", "STR+DEX"],
];

const formula = (terms: typeof STANDARD[number][1]) => terms.map(term => {
  if (typeof term === "number") return String(term);
  return Array.isArray(term) ? `${term[0]}x${term[1]}` : term;
}).join("+");

describe("skill definitions", () => {
  test.each(cases)("%s uses %s", (name, expected) => {
    expect(formula(skillDef(name).f)).toBe(expected);
  });

  test("every registered skill has a tested definition", () => {
    const registered = [...STANDARD, ...PROFESSIONAL, ...MAGIC].map(([name]) => name).sort();
    const covered = cases.filter(([name]) => name !== "Combat Style").map(([name]) => name).sort();
    expect(covered).toEqual(registered);
  });

  test.each(["Craft (Leatherwork)", "Culture (Border Kingdoms)", "Language (Trade)", "Lore (Astronomy)"])(
    "%s keeps its parent skill formula", name => {
      expect(skillDef(name).f).toEqual(skillDef(name.replace(/\s*\(.*\)$/, "")).f);
    },
  );

  test("native language names use Native Tongue while additional languages use Language", () => {
    const chars = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 } as const;
    expect(nativeTongueName("Elvish")).toBe("Native Tongue (Elvish)");
    expect(skillDef(nativeTongueName("Elvish")).f).toEqual(skillDef("Native Tongue").f);
    expect(formula(skillDef(nativeTongueName("Elvish")).f)).toBe("INT+CHA+40");
    expect(skillDef("Language (Trade)").pro).toBe(true);
    expect(formulaVal(skillDef(nativeTongueName("Elvish")).f, chars)).toBe(60);
  });

  test("registered combat style names and Combat Style specialisations use STR+DEX", () => {
    expect(skillDef("Citizen Militia", ["Citizen Militia"]).f).toEqual(skillDef("Combat Style").f);
    expect(skillDef("Combat Style (Citizen Militia)").f).toEqual(skillDef("Combat Style").f);
  });

  test("legacy custom bonus skills can retain their previous combat-style formula", () => {
    expect(skillDef("Tracking the Lost", ["Tracking the Lost"]).f).toEqual(skillDef("Combat Style").f);
  });

  test("a selected cultural Combat Style is professional", () => {
    const style = "People's Combat Style";
    expect(skillDef(style, [style]).pro).toBe(true);
  });

  test("unknown names never default to the Combat Style formula", () => {
    expect(() => skillDef("Unregistered Skill")).toThrow(/Unknown skill/);
  });
});
