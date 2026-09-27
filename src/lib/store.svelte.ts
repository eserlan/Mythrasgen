import { careers, cultures } from "./content";
import { baseName, formulaVal, rollAge, skillDef, sum } from "./calc";
import { AGE_CATEGORIES, bonusCap, bonusPool, PER_SKILL_CAP, POOLS, STANDARD, STATS, type AgeCategory, type Chars, type Kind } from "./rules";

export interface Character {
  name: string; chars: Chars; ageCategory: AgeCategory; age: number; culture: number; career: number;
  alloc: Record<Kind, Record<string, number>>; hobbySkill: string; extras: string[]; step: number;
  generation: "pointBuy" | "roll"; rollResults: number[] | null; rollAssignments: number[];
  /** True while the landing page is showing. */
  home: boolean;
}
const KEY = "mythresgen.v1";
export const STEPS = ["Concept", "Characteristics", "Culture", "Career", "Bonus Skills", "Sheet"];
export const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
export const INTRO = [
  "Name your hero and choose the people who raised them.",
  "The raw measure of body and mind. Roll the dice, or set each by hand.",
  "The customs and skills every child of your people learns.",
  "The trade or calling that shaped your adult years.",
  "Personal passions and hard-won lessons. Spend these freely.",
  "Your hero, ready for the table.",
];

const blank = (): Character => ({
  name: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars,
  ageCategory: "adult", age: rollAge("adult"), culture: 0, career: 0,
  alloc: { culture: {}, career: {}, bonus: {} }, hobbySkill: "", extras: [], step: 0,
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});
function load(): Character {
  try { return normalize(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { return blank(); }
}
function normalize(saved: Partial<Character> | null, home = true): Character {
  const fallback = blank();
  const c = {
    ...fallback, ...saved,
    alloc: { ...fallback.alloc, ...saved?.alloc },
    extras: Array.isArray(saved?.extras) ? saved.extras.filter(x => typeof x === "string") : [],
    home,
  } as Character;
  if (!Object.hasOwn(AGE_CATEGORIES, c.ageCategory)) c.ageCategory = "adult";
  if (!Number.isFinite(c.age)) c.age = rollAge(c.ageCategory);
  if (typeof c.hobbySkill !== "string") c.hobbySkill = "";
  if (c.generation !== "roll") c.generation = "pointBuy";
  if (!Array.isArray(c.rollResults) || c.rollResults.length !== STATS.length) c.rollResults = null;
  if (!Array.isArray(c.rollAssignments) || c.rollAssignments.length !== STATS.length
      || new Set(c.rollAssignments).size !== STATS.length
      || c.rollAssignments.some(i => !Number.isInteger(i) || i < 0 || i >= STATS.length)) {
    c.rollAssignments = STATS.map((_, i) => i);
  }
  const cu = cultures[c.culture] ?? cultures[0], ca = careers[c.career] ?? careers[0];
  const learned = new Set([...cu.standard, cu.combatStyle, ...cu.professional, ...ca.standard, ...ca.professional]);
  if (learned.has(c.hobbySkill) || (c.hobbySkill && !skillDef(c.hobbySkill).pro)) c.hobbySkill = "";
  c.alloc.bonus = Object.fromEntries(Object.entries(c.alloc.bonus ?? {}).filter(([name]) => bonusEligibleFor(c, learned, name)));
  if (c.step === STEPS.length - 1 && sum(Object.values(c.alloc.bonus)) < bonusPool(c.ageCategory)) c.step = 4;
  return c;
}
function bonusEligibleFor(c: Character, learned: Set<string>, name: string) {
  return learned.has(name) || c.extras.includes(name) || name === c.hobbySkill;
}
export const char: Character = $state(load());

export function persist() { try { localStorage.setItem(KEY, JSON.stringify(char)); } catch { /* storage unavailable */ } }
export const reset = (home = true) => Object.assign(char, blank(), { home });
export const replace = (c: Partial<Character>) => Object.assign(char, normalize(c, false));
export function setRollResults(results: number[]) {
  if (results.length !== STATS.length) return;
  char.generation = "roll";
  char.rollResults = [...results];
  char.rollAssignments = STATS.map((_, i) => i);
  STATS.forEach((k, i) => { char.chars[k] = results[i]; });
}
export function assignRoll(stat: (typeof STATS)[number], resultIndex: number) {
  if (char.generation !== "roll" || !char.rollResults || resultIndex < 0 || resultIndex >= STATS.length) return;
  const statIndex = STATS.indexOf(stat);
  const current = char.rollAssignments[statIndex];
  const otherStat = char.rollAssignments.indexOf(resultIndex);
  if (otherStat < 0 || otherStat === statIndex) return;
  char.rollAssignments[statIndex] = resultIndex;
  char.rollAssignments[otherStat] = current;
  char.chars[stat] = char.rollResults[resultIndex];
  char.chars[STATS[otherStat]] = char.rollResults[current];
}
export const hasProgress = () => !!char.name || char.step > 0 || used("culture") + used("career") + used("bonus") > 0
  || STATS.some(k => char.chars[k] !== 10);

export const culture = () => cultures[char.culture] ?? cultures[0];
export const career = () => careers[char.career] ?? careers[0];
export const learnedSkills = () => {
  const c = culture(), k = career();
  return [...new Set([...c.standard, c.combatStyle, ...c.professional, ...k.standard, ...k.professional])];
};
export const poolFor = (kind: Kind) => kind === "bonus" ? bonusPool(char.ageCategory) : POOLS[kind];
export const capFor = (kind: Kind) => kind === "bonus" ? bonusCap(char.ageCategory) : PER_SKILL_CAP;

export const base = (n: string) => formulaVal(skillDef(n).f, char.chars);
export const added = (n: string) => sum((Object.keys(char.alloc) as Kind[]).map(k => char.alloc[k][n] ?? 0));
export const total = (n: string) => base(n) + added(n);
export const used = (k: Kind) => sum(Object.values(char.alloc[k]));

export function setAlloc(kind: Kind, name: string, v: number) {
  if (kind === "bonus" && !bonusEligible().includes(name)) return;
  const a = char.alloc[kind], room = poolFor(kind) - used(kind) + (a[name] ?? 0);
  const n = Math.max(0, Math.min(capFor(kind), room, Math.round(v) || 0));
  if (n) a[name] = n; else delete a[name];
}
export function addExtra(name: string) {
  const v = name.trim();
  if (v && !char.extras.includes(v)) char.extras.push(v);
}
export function setAgeCategory(ageCategory: AgeCategory) {
  char.ageCategory = ageCategory;
  char.age = rollAge(ageCategory);
  char.alloc.bonus = {};
  if (char.step > 4) char.step = 4;
}
export function rollCharacterAge() { char.age = rollAge(char.ageCategory); }
export function setHobbySkill(name: string) {
  const v = name.trim();
  if (!v) {
    if (char.hobbySkill) delete char.alloc.bonus[char.hobbySkill];
    char.hobbySkill = "";
    return;
  }
  if (skillDef(v).pro && !learnedSkills().includes(v)) {
    const previous = char.hobbySkill;
    if (previous) delete char.alloc.bonus[previous];
    char.hobbySkill = v;
  }
}
export function refreshBonusEligibility() {
  if (char.hobbySkill && learnedSkills().includes(char.hobbySkill)) {
    delete char.alloc.bonus[char.hobbySkill];
    char.hobbySkill = "";
  }
  const eligible = new Set(bonusEligible());
  for (const name of Object.keys(char.alloc.bonus)) if (!eligible.has(name)) delete char.alloc.bonus[name];
}
export const canComplete = () => used("bonus") === bonusPool(char.ageCategory);

export function allSkills(): string[] {
  const c = culture(), k = career();
  return [...new Set([...STANDARD.map(s => s[0]), c.combatStyle, ...c.standard, ...c.professional, ...k.standard, ...k.professional,
    ...char.extras, ...(char.hobbySkill ? [char.hobbySkill] : []),
    ...(Object.keys(char.alloc) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))])];
}
export function bonusEligible(): string[] {
  return [...new Set([...learnedSkills(), ...char.extras, ...(char.hobbySkill ? [char.hobbySkill] : [])])];
}
export function stepSkills(kind: Kind): string[] {
  const c = culture(), k = career();
  if (kind === "culture") return [...new Set([...c.standard, c.combatStyle, ...c.professional])];
  if (kind === "career") return [...new Set([...k.standard, ...k.professional])];
  return bonusEligible();
}
export { baseName };
