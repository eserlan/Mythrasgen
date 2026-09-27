// Core mechanics: characteristics, skill formulas, creation pools.
// Adjust here if your edition differs.
export const STATS = ["STR", "CON", "SIZ", "DEX", "INT", "POW", "CHA"] as const;
export type Stat = (typeof STATS)[number];
export const STAT_NAMES: Record<Stat, string> = {
  STR: "Strength", CON: "Constitution", SIZ: "Size", DEX: "Dexterity", INT: "Intelligence", POW: "Power", CHA: "Charisma",
};
export type Chars = Record<Stat, number>;
/** A stat, a constant, or [stat, multiplier]. A formula is the sum of its terms. */
export type Term = Stat | number | [Stat, number];
export type Skill = [name: string, formula: Term[]];

export const CHAR_ROLL: Record<Stat, string> = {
  STR: "3d6", CON: "3d6", SIZ: "2d6+6", DEX: "3d6", INT: "2d6+6", POW: "3d6", CHA: "3d6",
};
export const POINT_BUY = { budget: 75, min: 3, max: 18, specialMin: { INT: 8, SIZ: 8 } } as const;
export const pointBuyMin = (stat: Stat) => stat === "INT" || stat === "SIZ" ? POINT_BUY.specialMin[stat] : POINT_BUY.min;
export const POOLS = { culture: 100, career: 100, bonus: 150 } as const;
export type Kind = keyof typeof POOLS;
/** Max points added to a single skill in each step. */
export const PER_SKILL_CAP = 15;

export const AGE_CATEGORIES = {
  young: { label: "Young", roll: "1d6+10", bonus: 100, maxPerSkill: 10, backgroundEvents: 0, ageing: false },
  adult: { label: "Adult", roll: "2d6+15", bonus: 150, maxPerSkill: 15, backgroundEvents: 1, ageing: false },
  middleAged: { label: "Middle Aged", roll: "3d6+25", bonus: 200, maxPerSkill: 20, backgroundEvents: 2, ageing: false },
  senior: { label: "Senior", roll: "4d6+40", bonus: 250, maxPerSkill: 25, backgroundEvents: 3, ageing: true },
  old: { label: "Old", roll: "5d6+60", bonus: 300, maxPerSkill: 30, backgroundEvents: 4, ageing: true },
} as const;
export type AgeCategory = keyof typeof AGE_CATEGORIES;

export const bonusPool = (age: AgeCategory) => AGE_CATEGORIES[age].bonus;
export const bonusCap = (age: AgeCategory) => AGE_CATEGORIES[age].maxPerSkill;
export const ageRollBounds = (age: AgeCategory): [number, number] => {
  const { roll } = AGE_CATEGORIES[age];
  const [, count, sides, modifier = "0"] = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(roll)!;
  return [+count + +modifier, +count * +sides + +modifier];
};

export const STANDARD: Skill[] = [
  ["Athletics", ["STR", "DEX"]], ["Boating", ["STR", "CON"]], ["Brawn", ["STR", "SIZ"]],
  ["Conceal", ["DEX", "POW"]], ["Customs", [["INT", 2], 40]], ["Dance", ["DEX", "CHA"]],
  ["Deceit", ["INT", "CHA"]], ["Drive", ["DEX", "POW"]], ["Endurance", [["CON", 2]]],
  ["Evade", [["DEX", 2]]], ["First Aid", ["INT", "DEX"]], ["Influence", [["CHA", 2]]],
  ["Insight", ["INT", "POW"]], ["Locale", [["INT", 2]]], ["Native Tongue", ["INT", "CHA", 40]],
  ["Perception", ["INT", "POW"]], ["Ride", ["DEX", "POW"]], ["Sing", ["CHA", "POW"]],
  ["Stealth", ["DEX", "INT"]], ["Swim", ["STR", "CON"]], ["Unarmed", ["STR", "DEX"]],
  ["Willpower", [["POW", 2]]],
];
export const PROFESSIONAL: Skill[] = [
  ["Acrobatics", ["STR", "DEX"]], ["Acting", ["CHA", "INT"]], ["Bureaucracy", [["INT", 2]]],
  ["Commerce", ["INT", "CHA"]], ["Courtesy", ["INT", "CHA"]], ["Craft", ["INT", "DEX"]],
  ["Disguise", ["INT", "CHA"]], ["Engineering", [["INT", 2]]], ["Gambling", ["INT", "POW"]],
  ["Healing", ["INT", "POW"]], ["Language", ["INT", "CHA"]], ["Lore", [["INT", 2]]],
  ["Mechanisms", ["DEX", "INT"]], ["Musicianship", ["DEX", "CHA"]], ["Navigation", ["INT", "POW"]],
  ["Oratory", ["POW", "CHA"]], ["Seduction", ["INT", "CHA"]], ["Sleight", ["DEX", "CHA"]],
  ["Streetwise", ["POW", "CHA"]], ["Survival", ["CON", "POW"]], ["Teach", ["INT", "CHA"]],
  ["Track", ["INT", "CON"]],
];
export const COMBAT_STYLE_FORMULA: Term[] = ["STR", "DEX"];
