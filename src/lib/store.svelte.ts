import { careerSkillOptions, careers, cultures, restoreCareerAllocation, restoreLegacyCareerIndex, selectCareerProfessional } from "./content";
import { allocationValue, selectedCareer, skillsForStage } from "./creation";
import { cultureSkills, validateCultureAllocation } from "./culture";
import { migrateCharacter } from "./migration";
import { clearCopiedSubjectStats } from "./passions";
import { baseName, formulaVal, skillDef, sum } from "./calc";
import { PER_SKILL_CAP, POOLS, STANDARD, STATS, type Chars, type Kind, type PassionCategory } from "./rules";

export interface Passion {
  type: "Loyalty" | "Love" | "Hate";
  subject: string;
  category: PassionCategory;
  subjectPow?: number;
  subjectCha?: number;
}

export interface Character {
  name: string; chars: Chars; culture: number; career: number;
  cultureSelections: { standard: string[][]; professional: string[]; combatStyle: string };
  cultureMigration?: boolean;
  alloc: Record<Kind, Record<string, number>>; extras: string[]; careerProfessional: string[]; step: number;
  passionsEnabled: boolean; passions: Passion[]; passionStatsVersion: number;
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
  cultureSelections: { standard: [], professional: [], combatStyle: "" },
  alloc: { culture: {}, career: {}, bonus: {} }, extras: [], careerProfessional: [], step: 0,
  passionsEnabled: false, passions: [], passionStatsVersion: 1,
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});
function restoreCareer(character: Character, legacy = false) {
  const selectedCareer = careers[character.career] ?? careers[0];
  const restored = restoreCareerAllocation(selectedCareer, legacy ? undefined : character.careerProfessional, character.alloc.career);
  character.careerProfessional = restored.professional;
  character.alloc.career = restored.allocation;
}
function load(): Character {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Character> | null;
    const legacyCareer = !!stored && stored.career !== undefined && !Array.isArray(stored.careerProfessional);
    const legacyPassionStats = !!stored && stored.passionStatsVersion !== 1;
    const migrated = migrateCharacter(stored ?? {});
    const saved = { ...blank(), ...migrated, cultureSelections: { ...blank().cultureSelections, ...migrated.cultureSelections },
      alloc: { ...blank().alloc, ...migrated.alloc }, extras: migrated.extras ?? [] } as Character;
    if (legacyPassionStats) saved.passions = clearCopiedSubjectStats(saved.passions ?? [], saved.chars);
    saved.passionStatsVersion = 1;
    if (legacyCareer) saved.career = restoreLegacyCareerIndex(saved.career);
    restoreCareer(saved, legacyCareer);
    return saved;
  } catch { return blank(); }
}
export const char: Character = $state(load());

export function persist() { try { localStorage.setItem(KEY, JSON.stringify(char)); } catch { /* storage unavailable */ } }
export const reset = (home = true) => Object.assign(char, blank(), { home });
export const replace = (c: Partial<Character>) => {
  const legacyCareer = c.career !== undefined && !Array.isArray(c.careerProfessional);
  const legacyPassionStats = c.passionStatsVersion !== 1;
  const migrated = migrateCharacter(c);
  Object.assign(char, blank(), migrated, { home: false });
  char.cultureSelections = { ...blank().cultureSelections, ...migrated.cultureSelections };
  char.alloc = { ...blank().alloc, ...migrated.alloc };
  char.extras ??= [];
  if (legacyPassionStats) char.passions = clearCopiedSubjectStats(char.passions ?? [], char.chars);
  char.passionStatsVersion = 1;
  if (legacyCareer) char.career = restoreLegacyCareerIndex(char.career);
  restoreCareer(char, legacyCareer);
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

export const culture = () => cultures[char.culture] ?? cultures[0];
export const career = () => selectedCareer(char.career);

export function cultureAllocationErrors(): string[] {
  return validateCultureAllocation(culture(), char.cultureSelections, char.alloc.culture, POOLS.culture);
}

const combatStyles = () => [char.cultureSelections.combatStyle, ...(career().combatStyle ?? []), ...char.extras].filter(Boolean);
// Older saves may contain arbitrary bonus skills, which previously used the Combat Style formula as a fallback.
export const skillDefinition = (n: string) => skillDef(n, combatStyles());
export const base = (n: string) => formulaVal(skillDefinition(n).f, char.chars);
export const added = (n: string) => sum((Object.keys(POOLS) as Kind[]).map(k => char.alloc[k][n] ?? 0));
export const total = (n: string) => base(n) + added(n);
export const used = (k: Kind) => sum(Object.values(char.alloc[k]));

export function setAlloc(kind: Kind, name: string, v: number) {
  if (kind === "career" && !careerSkillOptions(career(), char.careerProfessional).includes(name)) return;
  if (kind === "culture" && !cultureSkills(culture(), char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle).includes(name)) return;
  const a = char.alloc[kind];
  const n = kind === "culture"
    ? (() => {
        const room = POOLS.culture - used(kind) + (a[name] ?? 0);
        const raw = Math.round(v) || 0;
        return raw <= 0 || room < 5 ? 0 : Math.max(5, Math.min(PER_SKILL_CAP, room, raw));
      })()
    : allocationValue(v, POOLS[kind], used(kind), a[name] ?? 0);
  if (n) a[name] = n; else delete a[name];
}
export function toggleCareerProfessional(name: string) {
  const selected = char.careerProfessional;
  const next = selectCareerProfessional(career(), selected, name);
  if (next !== selected) {
    char.careerProfessional = next;
    if (!next.includes(name) && !careerSkillOptions(career(), char.careerProfessional).includes(name)) delete char.alloc.career[name];
  }
}
export function addExtra(name: string): boolean {
  const v = name.trim();
  if (!v || char.extras.includes(v)) return false;
  try { skillDef(v, combatStyles()); } catch { return false; }
  char.extras.push(v);
  return true;
}

export function seedCulturePassions(prompts: string[] = culture().passions) {
  char.passions = prompts.map(prompt => {
    const type = prompt.startsWith("Loyalty") ? "Loyalty" : prompt.startsWith("Hate") ? "Hate" : "Love";
    const subject = prompt.replace(/^Loyalty to\s*/i, "").replace(/^(?:Love|Hate)\s*\(/, "").replace(/\)$/, "");
    return {
      type, subject,
      category: type === "Loyalty" ? "organisation/group" : type === "Hate" ? "adverse" : "platonic",
      subjectPow: undefined, subjectCha: undefined,
    };
  });
}
export function addPassion() {
  char.passions.push({ type: "Love", subject: "", category: "platonic" });
}

export function allSkills(): string[] {
  const c = culture(), k = career();
  const pickedCulture = cultureSkills(c, char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle);
  return [...new Set([
    ...STANDARD.map(([name]) => name), ...pickedCulture,
    ...k.standard, ...(k.combatStyle ?? []), ...char.careerProfessional,
    ...char.extras, ...(Object.keys(POOLS) as Kind[]).flatMap(x => Object.keys(char.alloc[x])),
  ])];
}
export function stepSkills(kind: Kind): string[] {
  const c = culture(), k = career();
  if (kind === "culture") return cultureSkills(c, char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle);
  if (kind === "career") return skillsForStage(kind, c, k, [], [], char.careerProfessional);
  return allSkills();
}

export { baseName };
