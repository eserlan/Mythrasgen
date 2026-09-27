import { AGE_CATEGORIES, ageRollBounds, CHAR_ROLL, COMBAT_STYLE, MAGIC, POINT_BUY, PROFESSIONAL, STANDARD, STATS, pointBuyMin, type AgeCategory, type Chars, type PassionCategory, type Stat, type Term } from "./rules";

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const d = (n: number, random: () => number) => 1 + Math.floor(random() * n);

export function roll(expr: string, random: () => number = Math.random): number {
  const m = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(expr)!;
  return sum(Array.from({ length: +m[1] }, () => d(+m[2], random))) + (+m[3] || 0);
}
export const rollStat = (k: Stat, random: () => number = Math.random) => roll(CHAR_ROLL[k], random);
export const rollAge = (category: AgeCategory) => roll(AGE_CATEGORIES[category].roll);
export function normalizeAge(age: number, category: AgeCategory, random: () => number = Math.random): number {
  const [min, max] = ageRollBounds(category);
  return Number.isInteger(age) && age >= min && age <= max ? age : roll(AGE_CATEGORIES[category].roll, random);
}

export const pointBuyTotal = (chars: Chars) => sum(STATS.map(k => chars[k]));
export const canFinishPointBuy = (chars: Chars) => pointBuyTotal(chars) === POINT_BUY.budget
  && STATS.every(k => Number.isInteger(chars[k]) && chars[k] >= pointBuyMin(k) && chars[k] <= POINT_BUY.max);

export const baseName = (n: string) => n.trim().replace(/\s*\(.*\)$/, "").trim();
export const nativeTongueName = (language: string) => language.trim() ? `Native Tongue (${language.trim()})` : "Native Tongue";

export function formulaVal(f: Term[], c: Chars): number {
  return sum(f.map(t => typeof t === "number" ? t : Array.isArray(t) ? c[t[0]] * t[1] : c[t]));
}

/** Workbook p.4 starting Passion value, including the subject's stats when needed. */
export function passionStartingValue(category: PassionCategory, chars: Chars, subject: { pow?: number; cha?: number } = {}): number | null {
  const { POW, INT } = chars;
  switch (category) {
    case "romantic/familial": return subject.pow == null || subject.cha == null ? null : 30 + subject.pow + subject.cha;
    case "platonic": case "adverse": return subject.cha == null ? null : 30 + POW + subject.cha;
    case "organisation/group": case "place/concept/ideal": return 30 + POW + INT;
    case "race/species": case "object/substance": return 30 + POW * 2;
  }
}

export function skillDef(name: string, combatStyles: readonly string[] = []): { f: Term[]; pro: boolean } {
  const b = baseName(name);
  if (combatStyles.includes(name.trim())) return { f: COMBAT_STYLE[1], pro: true };
  const s = STANDARD.find(x => x[0] === b), p = PROFESSIONAL.find(x => x[0] === b), m = MAGIC.find(x => x[0] === b);
  if (s) return { f: s[1], pro: false };
  if (p || m) return { f: (p ?? m)![1], pro: true };
  if (b === COMBAT_STYLE[0]) return { f: COMBAT_STYLE[1], pro: true };
  throw new Error(`Unknown skill "${name}". Use a registered skill or a specialisation of one.`);
}

export function dmgMod(v: number): string {
  const bands: [number, string][] = [
    [5, "-1d8"], [10, "-1d6"], [15, "-1d4"], [20, "-1d2"], [25, "+0"],
    [30, "+1d2"], [35, "+1d4"], [40, "+1d6"], [45, "+1d8"], [50, "+1d10"],
    [60, "+1d12"], [70, "+2d6"], [80, "+1d8+1d6"], [90, "+2d8"],
    [100, "+1d10+1d8"], [110, "+2d10"], [120, "+2d10+1d2"],
  ];
  const listed = bands.find(([max]) => v <= max);
  if (listed) return listed[1];
  const extraBands = Math.ceil((v - 120) / 10);
  const addedD10s = Math.floor(extraBands / 6);
  const remainder = extraBands % 6;
  const dice = `${2 + addedD10s}d10`;
  return remainder === 0 ? `+${dice}` : `+${dice}+1d${2 + remainder * 2}`;
}

export interface HitLocation { name: string; roll: string; hp: number }
export function deriveStats(c: Chars) {
  const up6 = (v: number) => Math.max(1, Math.ceil(v / 6));
  const hpBand = Math.max(0, Math.ceil((c.CON + c.SIZ) / 5) - 1);
  const leg = 1 + hpBand, abdomen = 2 + hpBand, chest = 3 + hpBand;
  const arm = Math.max(1, hpBand);
  const loc: HitLocation[] = [
    { name: "Right Leg", roll: "1-3", hp: leg }, { name: "Left Leg", roll: "4-6", hp: leg },
    { name: "Abdomen", roll: "7-9", hp: abdomen }, { name: "Chest", roll: "10-12", hp: chest },
    { name: "Right Arm", roll: "13-15", hp: arm }, { name: "Left Arm", roll: "16-18", hp: arm },
    { name: "Head", roll: "19-20", hp: leg },
  ];
  const stats: [string, string | number][] = [
    ["Action Points", Math.max(1, Math.ceil((c.INT + c.DEX) / 12))], ["Damage Modifier", dmgMod(c.STR + c.SIZ)],
    ["Experience Mod", c.CHA <= 6 ? -1 : c.CHA <= 12 ? 0 : Math.ceil((c.CHA - 12) / 6)], ["Healing Rate", up6(c.CON)],
    ["Initiative", Math.ceil((c.INT + c.DEX) / 2)], ["Luck Points", up6(c.POW)],
    ["Magic Points", c.POW], ["Movement", "6m"],
  ];
  return { stats, loc };
}
