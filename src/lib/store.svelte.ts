import { careers, cultures } from "./content";
import { baseName, formulaVal, skillDef, sum } from "./calc";
import { PER_SKILL_CAP, POOLS, STANDARD, STATS, type Chars, type Kind } from "./rules";

export interface Character {
  name: string; chars: Chars; culture: number; career: number;
  alloc: Record<Kind, Record<string, number>>; extras: string[]; step: number;
}
const KEY = "mythresgen.v1";
export const STEPS = ["Concept", "Characteristics", "Culture", "Career", "Bonus Skills", "Sheet"];

const blank = (): Character => ({
  name: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars, culture: 0, career: 0,
  alloc: { culture: {}, career: {}, bonus: {} }, extras: [], step: 0,
});
function load(): Character {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) ?? "null") }; } catch { return blank(); }
}
export const char: Character = $state(load());

export function persist() { try { localStorage.setItem(KEY, JSON.stringify(char)); } catch { /* storage unavailable */ } }
export const reset = () => Object.assign(char, blank());
export const replace = (c: Partial<Character>) => Object.assign(char, blank(), c);

export const culture = () => cultures[char.culture] ?? cultures[0];
export const career = () => careers[char.career] ?? careers[0];

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
