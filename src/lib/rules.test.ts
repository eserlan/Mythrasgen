import { describe, expect, test } from "bun:test";
import { deriveStats, dmgMod, formulaVal } from "./calc";
import { careers, cultures } from "./content";
import { allocationValue, skillsForStage } from "./creation";
import { CHAR_ROLL, POINT_BUY, pointBuyMin, POOLS, PROFESSIONAL, STANDARD, STATS, type Chars } from "./rules";

// Authority policy: detailed Mythras 3rd-printing rules control core mode;
// the official Character Creation Workbook is a checklist. The issue notes
// that the detailed rule/Workbook give INT and SIZ point-buy minimum 8 even
// though a later core summary prints 6; use 8. Workbook skill-base entries
// that conflict with the core Standard Skills table do not override that table.
// Companion alternatives (including Skill Pyramid) are outside core mode.

const c: Chars = { STR: 11, CON: 13, SIZ: 15, DEX: 9, INT: 14, POW: 7, CHA: 12 };

describe("human characteristics", () => {
  test.each(Object.entries({ STR: "3d6", CON: "3d6", SIZ: "2d6+6", DEX: "3d6", INT: "2d6+6", POW: "3d6", CHA: "3d6" }))(
    "%s uses the core roll %s", (stat, expr) => expect(CHAR_ROLL[stat as keyof Chars]).toBe(expr),
  );
  test.each([
    ["STR", 3, 18], ["CON", 3, 18], ["SIZ", 8, 18], ["DEX", 3, 18], ["INT", 8, 18], ["POW", 3, 18], ["CHA", 3, 18],
  ] as const)("%s point-buy and dice bounds are %i–%i", (stat, min, max) => {
    const [, count, sides, bonus] = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(CHAR_ROLL[stat])!;
    const extra = +(bonus ?? "0");
    expect(+count + extra).toBe(min);
    expect(+count * +sides + extra).toBe(max);
    expect(pointBuyMin(stat)).toBe(min);
    expect(POINT_BUY.max).toBe(max);
  });
  test("point-buy budget and human bounds keep INT/SIZ at 8 minimum", () => {
    expect(POINT_BUY.budget).toBe(75);
    expect(STATS.map(pointBuyMin)).toEqual([3, 3, 8, 3, 8, 3, 3]);
    expect(STATS.map(pointBuyMin).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(POINT_BUY.budget);
  });
});

describe("skill base formulas", () => {
  const expectedStandard: Record<string, number> = {
    Athletics: 20, Boating: 24, Brawn: 26, Conceal: 16, Customs: 68, Dance: 21, Deceit: 26,
    Drive: 16, Endurance: 26, Evade: 18, "First Aid": 23, Influence: 24, Insight: 21, Locale: 28,
    "Native Tongue": 66, Perception: 21, Ride: 16, Sing: 19, Stealth: 23, Swim: 24, Unarmed: 20, Willpower: 14,
  };
  const expectedProfessional: Record<string, number> = {
    Acrobatics: 20, Acting: 24, Art: 19, Bureaucracy: 28, Commerce: 26, Courtesy: 26, Craft: 23,
    Culture: 28, Disguise: 26, Engineering: 28, Exhort: 26, Gambling: 21, Healing: 21, Language: 26,
    Literacy: 28, Lockpicking: 18, Lore: 28, Mechanisms: 23, Musicianship: 21, Navigation: 21,
    Oratory: 19, Seamanship: 27, Seduction: 26, Sleight: 21, Streetwise: 19, Survival: 20,
    Teach: 26, Track: 27,
  };
  test.each([["Standard", STANDARD, expectedStandard], ["Professional", PROFESSIONAL, expectedProfessional]] as const)(
    "%s skill table matches the core characteristic formulas", (_group, rows, expected) => {
      expect(rows.map(([name]) => name).sort()).toEqual(Object.keys(expected).sort());
      for (const [name, formula] of rows) expect(formulaVal(formula, c)).toBe(expected[name]);
    },
  );
  test("Combat Style uses STR + DEX", () => expect(formulaVal(["STR", "DEX"], c)).toBe(20));
  test("magic-specific skill bases are not silently added in core mode", () => expect(PROFESSIONAL.some(([n]) => n === "Magic")).toBe(false));
});

describe("derived attribute boundaries", () => {
  test.each([
    [5, "-1d8"], [6, "-1d6"], [10, "-1d6"], [11, "-1d4"], [15, "-1d4"], [16, "-1d2"],
    [20, "-1d2"], [21, "+0"], [25, "+0"], [26, "+1d2"], [30, "+1d2"], [31, "+1d4"],
    [35, "+1d4"], [36, "+1d6"], [40, "+1d6"], [41, "+1d8"], [45, "+1d8"],
    [46, "+1d10"], [50, "+1d10"], [51, "+1d12"], [60, "+1d12"], [61, "+2d6"],
    [70, "+2d6"], [71, "+1d8+1d6"], [80, "+1d8+1d6"], [81, "+2d8"], [90, "+2d8"],
    [91, "+1d10+1d8"], [100, "+1d10+1d8"], [101, "+2d10"], [110, "+2d10"],
    [111, "+2d10+1d2"], [120, "+2d10+1d2"], [121, "+2d10+1d4"],
  ])("damage modifier at STR+SIZ %i", (sum, result) => expect(dmgMod(sum)).toBe(result));

  test.each([
    [5, 1], [6, 1], [11, 2], [12, 2], [13, 3], [17, 3], [18, 3], [19, 4],
  ])("characteristic bands use ceiling divisions for value %i", (v, expected) => {
    const d = deriveStats({ ...c, CON: v, POW: v, CHA: v });
    expect(d.stats.find(([n]) => n === "Healing Rate")?.[1]).toBe(expected);
    expect(d.stats.find(([n]) => n === "Luck Points")?.[1]).toBe(expected);
    expect(d.stats.find(([n]) => n === "Experience Mod")?.[1]).toBe(expected - 2);
  });
  test.each([[11, 1], [12, 1], [13, 2], [23, 2], [24, 2], [25, 3]])(
    "Action Points boundary INT+DEX %i", (total, expected) => {
      expect(deriveStats({ ...c, INT: total, DEX: 0 }).stats.find(([n]) => n === "Action Points")?.[1]).toBe(expected);
    },
  );
  test.each([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]])("initiative boundary INT+DEX %i", (half, expected) => {
    expect(deriveStats({ ...c, INT: half, DEX: half }).stats.find(([n]) => n === "Initiative")?.[1]).toBe(expected);
  });
  test("all derived attributes and hit locations have stable fixture values", () => {
    const d = deriveStats(c);
    expect(d.stats).toEqual([
      ["Action Points", 2], ["Damage Modifier", "+1d2"], ["Experience Mod", 0], ["Healing Rate", 3],
      ["Initiative", 12], ["Luck Points", 2], ["Magic Points", 7], ["Movement", "6m"],
    ]);
    expect(d.loc.map(({ hp }) => hp)).toEqual([6, 6, 7, 8, 5, 5, 6]);
  });
  test.each([[1, 3, 1], [2, 3, 1], [3, 3, 2], [4, 3, 2], [5, 3, 2], [6, 3, 2], [7, 3, 2], [8, 3, 3]])(
    "hit-point base bands at CON+SIZ %i", (con, siz, base) => {
      const { loc } = deriveStats({ ...c, CON: con, SIZ: siz });
      expect(loc[0].hp).toBe(base);
      expect(loc[2].hp).toBe(base + 1);
      expect(loc[3].hp).toBe(base + 2);
      expect(loc[4].hp).toBe(Math.max(1, base - 1));
    },
  );
});

describe("core culture and career packages", () => {
  // These fixtures lock the bundled core choices. Culture and career skills
  // are stage-eligible exactly where listed; a combat style enters at culture.
  test.each([
    ["Civilised", "Civilised", "Citizen Militia", ["Customs", "Influence", "Locale", "Native Tongue", "Perception", "Willpower"], ["Bureaucracy", "Commerce", "Courtesy", "Streetwise"]],
    ["Barbarian", "Barbarian", "Tribal Warrior", ["Athletics", "Brawn", "Endurance", "Evade", "Native Tongue", "Stealth", "Swim"], ["Survival", "Track", "Lore (Tribal Lore)"]],
    ["Nomad", "Nomadic", "Horse Archer", ["Athletics", "Endurance", "Native Tongue", "Perception", "Ride"], ["Navigation", "Survival", "Track", "Craft (Leatherwork)"]],
    ["Seafarer", null, "Boarding Party", ["Athletics", "Boating", "Brawn", "Endurance", "Native Tongue", "Swim"], ["Navigation", "Craft (Seamanship)", "Survival"]],
  ] as const)("culture fixture %s", (name, kind, style, standard, professional) => {
    const culture = cultures.find(x => x.name === name)!;
    expect(culture).toEqual({ name, kind, combatStyle: style, standard: [...standard], professional: [...professional] });
    expect(skillsForStage("culture", culture, careers[0])).toEqual([...new Set([...standard, style, ...professional])]);
  });
  test.each([
    ["Warrior", ["Athletics", "Brawn", "Endurance", "Evade", "Unarmed"], ["Lore (Tactics)", "Survival", "Streetwise"]],
    ["Merchant", ["Influence", "Insight", "Deceit", "Perception"], ["Commerce", "Courtesy", "Language (Trade)", "Navigation"]],
    ["Scholar", ["Insight", "Perception", "Willpower"], ["Lore (Any)", "Teach", "Language (Ancient)", "Engineering"]],
    ["Thief", ["Conceal", "Stealth", "Evade", "Deceit", "Perception"], ["Mechanisms", "Sleight", "Streetwise", "Acrobatics"]],
    ["Healer", ["First Aid", "Insight", "Perception", "Willpower"], ["Healing", "Lore (Herbs)", "Teach"]],
    ["Hunter", ["Athletics", "Endurance", "Perception", "Stealth"], ["Survival", "Track", "Craft (Bowyer)"]],
  ] as const)("career fixture %s", (name, standard, professional) => {
    const career = careers.find(x => x.name === name)!;
    expect(career).toEqual({ name, standard: [...standard], professional: [...professional] });
    expect(skillsForStage("career", cultures[0], career)).toEqual([...new Set([...standard, ...professional])]);
  });

  test("culture/career/bonus pools and each per-skill increase are bounded", () => {
    expect(POOLS).toEqual({ culture: 100, career: 100, bonus: 150 });
    for (const pool of Object.values(POOLS)) {
      expect(allocationValue(18, pool, 0, 0)).toBe(15);
      expect(allocationValue(5, pool, pool - 2, 0)).toBe(2);
      expect(allocationValue(5, pool, pool, 0)).toBe(0);
      expect(allocationValue(-2, pool, 0, 0)).toBe(0);
    }
  });
  test("professional skills and combat styles appear in the allowed stages", () => {
    const cultureSkills = skillsForStage("culture", cultures[0], careers[0]);
    const careerSkills = skillsForStage("career", cultures[0], careers[0]);
    const bonusSkills = skillsForStage("bonus", cultures[0], careers[0], ["Passion (Family)"], ["Lore (Tactics)"]);
    expect(cultureSkills).toContain("Bureaucracy");
    expect(cultureSkills).toContain("Citizen Militia");
    expect(careerSkills).toContain("Lore (Tactics)");
    expect(careerSkills).not.toContain("Citizen Militia");
    expect(bonusSkills).toContain("Citizen Militia");
    expect(bonusSkills).toContain("Passion (Family)");
    expect(bonusSkills).toContain("Lore (Tactics)");
  });

  test("specialized extra allocations stay specialized in the bonus skill list", () => {
    const bonusSkills = skillsForStage("bonus", cultures[0], careers[0], ["Passion (Family)"], ["Passion (Family)"]);
    expect(bonusSkills).toContain("Passion (Family)");
    expect(bonusSkills).not.toContain("Passion");
  });
});
