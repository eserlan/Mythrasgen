import { careerSkillOptions, careers, cultures, selectCareerProfessional } from "./content";
import { baseName, formulaVal, skillDef, sum } from "./calc";
import { PER_SKILL_CAP, POOLS, STANDARD, STATS, type Chars, type Kind } from "./rules";

export interface Character {
  name: string; chars: Chars; culture: number; career: number;
  alloc: Record<Kind, Record<string, number>>; extras: string[]; careerProfessional: string[]; step: number;
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
  name: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars, culture: 0, career: 0,
  alloc: { culture: {}, career: {}, bonus: {} }, extras: [], careerProfessional: [], step: 0, home: true,
});
function load(): Character {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) ?? "null") }; } catch { return blank(); }
}
export const char: Character = $state(load());

export function persist() { try { localStorage.setItem(KEY, JSON.stringify(char)); } catch { /* storage unavailable */ } }
export const reset = (home = true) => Object.assign(char, blank(), { home });
export const replace = (c: Partial<Character>) => Object.assign(char, blank(), c, { home: false });
export const hasProgress = () => !!char.name || char.step > 0 || used("culture") + used("career") + used("bonus") > 0
  || STATS.some(k => char.chars[k] !== 10);

export const culture = () => cultures[char.culture] ?? cultures[0];
export const career = () => careers[char.career] ?? careers[0];

export const base = (n: string) => formulaVal(skillDef(n).f, char.chars);
export const added = (n: string) => sum((Object.keys(POOLS) as Kind[]).map(k => char.alloc[k][n] ?? 0));
export const total = (n: string) => base(n) + added(n);
export const used = (k: Kind) => sum(Object.values(char.alloc[k]));

export function setAlloc(kind: Kind, name: string, v: number) {
  if (kind === "career" && !careerSkillOptions(career(), char.careerProfessional).includes(name)) return;
  const a = char.alloc[kind], room = POOLS[kind] - used(kind) + (a[name] ?? 0);
  const n = Math.max(0, Math.min(PER_SKILL_CAP, room, Math.round(v) || 0));
  if (n) a[name] = n; else delete a[name];
}
export function toggleCareerProfessional(name: string) {
  const selected = char.careerProfessional;
  const next = selectCareerProfessional(career(), selected, name);
  if (next !== selected) {
    char.careerProfessional = next;
    if (!next.includes(name)) {
      if (!careerSkillOptions(career(), char.careerProfessional).includes(name)) delete char.alloc.career[name];
    }
  }
}
export function addExtra(name: string) {
  const v = name.trim(); if (v && !char.extras.includes(v)) char.extras.push(v);
}

export function allSkills(): string[] {
  const c = culture(), k = career();
  return [...new Set([...STANDARD.map(s => s[0]), c.combatStyle, ...c.professional, ...k.standard,
    ...(k.combatStyle ?? []), ...char.careerProfessional,
    ...char.extras, ...(Object.keys(POOLS) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))])];
}
export function stepSkills(kind: Kind): string[] {
  const c = culture(), k = career();
  if (kind === "culture") return [...new Set([...c.standard, c.combatStyle, ...c.professional])];
  if (kind === "career") return careerSkillOptions(k, char.careerProfessional);
  return allSkills();
}
export { baseName };
