import { careers, cultures, type CultureKind } from "./content";
import { BACKGROUND_EVENT_COUNTS, calculateStartingMoney, CULTURE_MONEY_MULTIPLIERS, classMoneyMultiplier } from "./background-rules";
import { migrateCharacterStep } from "./migrations";
import { baseName, formulaVal, skillDef, sum } from "./calc";
import { PER_SKILL_CAP, POOLS, STANDARD, STATS, type Chars, type Kind } from "./rules";

export interface Character {
  name: string; chars: Chars; culture: number; career: number;
  alloc: Record<Kind, Record<string, number>>; extras: string[]; step: number;
  ageCategory: "Young" | "Adult" | "Middle-Aged"; age: number;
  background: {
    events: { roll: number; text: string }[]; socialClassRoll: number; socialClass: string;
    parentsRoll: number; parents: string; siblingsRoll: number; siblings: string; extendedFamilyRoll: number; extendedFamily: string;
    standingRoll: number; familyTies: string[]; connectionsRoll: number;
    connections: string[]; startingMoneyRoll: number; equipment: string;
    purchases: { name: string; cost: number }[];
  };
  socialTable: CultureKind;
  moneyTable: CultureKind;
  generation: "pointBuy" | "roll"; rollResults: number[] | null; rollAssignments: number[];
  /** True while the landing page is showing. */
  home: boolean;
}
const KEY = "mythresgen.v1";
export const STEPS = ["Concept", "Characteristics", "Culture", "Career", "Bonus Skills", "Background", "Sheet"];
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const INTRO = [
  "Name your hero and choose their culture and career.",
  "The raw measure of body and mind. Roll the dice, or set each by hand.",
  "The customs and skills every child of your people learns.",
  "The trade or calling that shaped your adult years.",
  "Personal passions and hard-won lessons. Spend these freely.",
  "The people, events, and possessions your hero starts with.",
  "Your hero, ready for the table.",
];

const blank = (): Character => ({
  name: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars, culture: 0, career: 0,
  alloc: { culture: {}, career: {}, bonus: {} }, extras: [], step: 0,
  ageCategory: "Adult", age: 22, socialTable: "Civilised", moneyTable: "Civilised",
  background: { events: [{ roll: 0, text: "" }], socialClassRoll: 50, socialClass: "Freeman",
    parentsRoll: 50, parents: "", siblingsRoll: 50, siblings: "", extendedFamilyRoll: 50, extendedFamily: "",
    standingRoll: 50, familyTies: [], connectionsRoll: 50, connections: [], startingMoneyRoll: 14,
    equipment: "Tools; simple weapons; rented accommodation", purchases: [] },
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});
function normalize(value: Partial<Character>): Character {
  const fallback = blank();
  return {
    ...fallback,
    ...value,
    step: migrateCharacterStep(value.step ?? fallback.step, !!value.background),
    background: { ...fallback.background, ...(value.background ?? {}) },
    alloc: { ...fallback.alloc, ...(value.alloc ?? {}) },
  };
}
function load(): Character {
  try { return normalize(JSON.parse(localStorage.getItem(KEY) ?? "null") ?? {}); } catch { return blank(); }
}
export const char: Character = $state(load());

export function persist() { try { localStorage.setItem(KEY, JSON.stringify(char)); } catch { /* storage unavailable */ } }
export const reset = (home = true) => Object.assign(char, blank(), { home });
export const replace = (c: Partial<Character>) => Object.assign(char, normalize(c), { home: false });
export function setRollResults(results: number[]) {
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

export const eventCount = () => BACKGROUND_EVENT_COUNTS[char.ageCategory];
export const moneyMultiplier = () => CULTURE_MONEY_MULTIPLIERS[char.moneyTable];
export const startingMoney = () => calculateStartingMoney(char.background.startingMoneyRoll, char.moneyTable, char.socialTable, char.background.socialClass);
export const socialClassMoney = (kind: CultureKind, rank: string) => classMoneyMultiplier(kind, rank);
export const spentMoney = () => char.background.purchases.reduce((total, item) => total + Math.max(0, item.cost), 0);
export const availableMoney = () => startingMoney() - spentMoney();
export const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;
export const rollPercentile = () => rollDie(100);
export const roll4d6 = () => rollDie(6) + rollDie(6) + rollDie(6) + rollDie(6);

export const base = (n: string) => formulaVal(skillDef(n).f, char.chars);
export const added = (n: string) => sum((Object.keys(POOLS) as Kind[]).map(k => char.alloc[k][n] ?? 0));
export const total = (n: string) => base(n) + added(n);
export const used = (k: Kind) => sum(Object.values(char.alloc[k]));

export function setAlloc(kind: Kind, name: string, v: number) {
  const a = char.alloc[kind], room = POOLS[kind] - used(kind) + (a[name] ?? 0);
  const n = Math.max(0, Math.min(PER_SKILL_CAP, room, Math.round(v) || 0));
  if (n) a[name] = n; else delete a[name];
}
export function addExtra(name: string) {
  const v = name.trim(); if (v && !char.extras.includes(v)) char.extras.push(v);
}

export function allSkills(): string[] {
  const c = culture(), k = career();
  return [...new Set([...STANDARD.map(s => s[0]), c.combatStyle, ...c.professional, ...k.professional,
    ...char.extras, ...(Object.keys(POOLS) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))])];
}
export function stepSkills(kind: Kind): string[] {
  const c = culture(), k = career();
  if (kind === "culture") return [...new Set([...c.standard, c.combatStyle, ...c.professional])];
  if (kind === "career") return [...new Set([...k.standard, ...k.professional])];
  return allSkills();
}
export { baseName };
