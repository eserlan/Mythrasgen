import { careerSkillOptions, careers, cultures, restoreCareerAllocation, restoreLegacyCareerIndex, selectCareerProfessional } from "./content";
import { baseName, formulaVal, skillDef, sum } from "./calc";
import { allocationValue, selectedCareer, selectedCulture, skillsForStage } from "./creation";
import { POOLS, STANDARD, STATS, type Chars, type Kind } from "./rules";

export interface Character {
  name: string; chars: Chars; culture: number; career: number;
  alloc: Record<Kind, Record<string, number>>; extras: string[]; careerProfessional: string[]; step: number;
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
  name: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars, culture: 0, career: 0,
  alloc: { culture: {}, career: {}, bonus: {} }, extras: [], careerProfessional: [], step: 0,
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});
function load(): Character {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Character> | null;
    const legacy = stored?.career !== undefined && !Array.isArray(stored.careerProfessional);
    const saved = { ...blank(), ...stored } as Character;
    if (legacy) saved.career = restoreLegacyCareerIndex(saved.career);
    restoreCareer(saved, legacy);
    return saved;
  } catch { return blank(); }
}
function restoreCareer(character: Character, legacy = false) {
  const selectedCareer = careers[character.career] ?? careers[0];
  const restored = restoreCareerAllocation(selectedCareer, legacy ? undefined : character.careerProfessional, character.alloc.career);
  character.careerProfessional = restored.professional;
  character.alloc.career = restored.allocation;
}
export const char: Character = $state(load());

export function persist() { try { localStorage.setItem(KEY, JSON.stringify(char)); } catch { /* storage unavailable */ } }
export const reset = (home = true) => Object.assign(char, blank(), { home });
export const replace = (c: Partial<Character>) => {
  const legacy = c.career !== undefined && !Array.isArray(c.careerProfessional);
  Object.assign(char, blank(), c, { home: false });
  if (legacy) char.career = restoreLegacyCareerIndex(char.career);
  restoreCareer(char, legacy);
};
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

export const culture = () => selectedCulture(char.culture);
export const career = () => selectedCareer(char.career);

const COMBAT_STYLES = cultures.map(c => c.combatStyle);
// Older saves may contain arbitrary bonus skills, which previously used the
// Combat Style formula as a fallback. Keep those entries renderable.
export const skillDefinition = (n: string) => skillDef(n, [...COMBAT_STYLES, ...char.extras]);
export const base = (n: string) => formulaVal(skillDefinition(n).f, char.chars);
export const added = (n: string) => sum((Object.keys(POOLS) as Kind[]).map(k => char.alloc[k][n] ?? 0));
export const total = (n: string) => base(n) + added(n);
export const used = (k: Kind) => sum(Object.values(char.alloc[k]));

export function setAlloc(kind: Kind, name: string, v: number) {
  if (kind === "career" && !careerSkillOptions(career(), char.careerProfessional).includes(name)) return;
  const a = char.alloc[kind];
  const n = allocationValue(v, POOLS[kind], used(kind), a[name] ?? 0);
  if (n) a[name] = n; else delete a[name];
}
export function toggleCareerProfessional(name: string) {
  const selected = char.careerProfessional;
  const next = selectCareerProfessional(career(), selected, name);
  if (next !== selected) {
    char.careerProfessional = next;
    if (!next.includes(name) && !careerSkillOptions(career(), char.careerProfessional).includes(name)) {
      delete char.alloc.career[name];
    }
  }
}
export function addExtra(name: string): boolean {
  const v = name.trim();
  if (!v || char.extras.includes(v)) return false;
  try { skillDef(v, [...COMBAT_STYLES, ...char.extras]); } catch { return false; }
  char.extras.push(v);
  return true;
}

export function allSkills(): string[] {
  const c = culture(), k = career();
  return [...new Set([
    ...skillsForStage("bonus", c, k, char.extras,
      (Object.keys(POOLS) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))),
    ...STANDARD.map(([name]) => name), c.combatStyle, ...c.professional, ...k.standard,
    ...(k.combatStyle ?? []), ...char.careerProfessional,
  ])];
}
export function stepSkills(kind: Kind): string[] {
  const c = culture(), k = career();
  if (kind === "culture") return skillsForStage(kind, c, k, char.extras,
    (Object.keys(POOLS) as Kind[]).flatMap(x => Object.keys(char.alloc[x])));
  if (kind === "career") return careerSkillOptions(k, char.careerProfessional);
  return allSkills();
}
export { baseName };
