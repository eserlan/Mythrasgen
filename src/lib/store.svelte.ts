import { careerSkillOptions, careers, cultures, restoreCareerAllocation, restoreLegacyCareerIndex, selectCareerProfessional } from "./content";
import { cultureSkills, validateCultureAllocation } from "./culture";
import { migrateCharacter } from "./migration";
import { baseName, formulaVal, normalizeAge, rollAge, skillDef, sum } from "./calc";
import { allocationValue, selectedCareer, selectedCulture, skillsForStage } from "./creation";
import { AGE_CATEGORIES, bonusCap, bonusPool, MAGIC, PER_SKILL_CAP, POOLS, STANDARD, STATS, type AgeCategory, type Chars, type Kind } from "./rules";

export interface Character {
  name: string; chars: Chars; ageCategory: AgeCategory; age: number; culture: number; career: number;
  cultureSelections: { standard: string[][]; professional: string[]; combatStyle: string };
  cultureMigration?: boolean;
  alloc: Record<Kind, Record<string, number>>; hobbySkill: string; extras: string[]; careerProfessional: string[]; step: number;
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
  cultureSelections: { standard: [], professional: [], combatStyle: "" },
  alloc: { culture: {}, career: {}, bonus: {} }, hobbySkill: "", extras: [], careerProfessional: [], step: 0,
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});

function normalize(saved: Partial<Character> | null, home = true): Character {
  const fallback = blank();
  const legacyCareer = !!saved && saved.career !== undefined && !Array.isArray(saved.careerProfessional);
  const migrated = migrateCharacter(saved ?? fallback);
  const c = {
    ...fallback, ...migrated,
    cultureSelections: { ...fallback.cultureSelections, ...migrated.cultureSelections },
    alloc: { ...fallback.alloc, ...migrated.alloc },
    extras: Array.isArray(migrated.extras) ? migrated.extras.filter(x => typeof x === "string") : [],
    home,
  } as Character;
  if (legacyCareer) c.career = restoreLegacyCareerIndex(c.career);
  restoreCareer(c, legacyCareer);
  if (!Object.hasOwn(AGE_CATEGORIES, c.ageCategory)) c.ageCategory = "adult";
  c.age = normalizeAge(c.age, c.ageCategory);
  if (typeof c.hobbySkill !== "string") c.hobbySkill = "";
  if (c.generation !== "roll") c.generation = "pointBuy";
  if (!Array.isArray(c.rollResults) || c.rollResults.length !== STATS.length) c.rollResults = null;
  if (!Array.isArray(c.rollAssignments) || c.rollAssignments.length !== STATS.length
      || new Set(c.rollAssignments).size !== STATS.length
      || c.rollAssignments.some(i => !Number.isInteger(i) || i < 0 || i >= STATS.length)) {
    c.rollAssignments = STATS.map((_, i) => i);
  }
  const culture = selectedCulture(c.culture), career = selectedCareer(c.career);
  const learned = new Set([
    ...cultureSkills(culture, c.cultureSelections.standard, c.cultureSelections.professional, c.cultureSelections.combatStyle),
    ...career.standard, ...c.careerProfessional,
  ]);
  let validHobby = false;
  if (c.hobbySkill) {
    try { validHobby = skillDef(c.hobbySkill, [c.cultureSelections.combatStyle, ...c.extras].filter(Boolean)).pro; }
    catch { /* discard invalid legacy hobby skills */ }
  }
  if (learned.has(c.hobbySkill) || (c.hobbySkill && !validHobby)) c.hobbySkill = "";
  c.alloc.bonus = Object.fromEntries(Object.entries(c.alloc.bonus ?? {}).filter(([name]) =>
    learned.has(name) || c.extras.includes(name) || name === c.hobbySkill));
  if (c.step === STEPS.length - 1 && sum(Object.values(c.alloc.bonus)) < bonusPool(c.ageCategory)) c.step = 4;
  return c;
}

function restoreCareer(character: Character, legacy = false) {
  const selectedCareer = careers[character.career] ?? careers[0];
  const restored = restoreCareerAllocation(selectedCareer, legacy ? undefined : character.careerProfessional, character.alloc.career);
  character.careerProfessional = restored.professional;
  character.alloc.career = restored.allocation;
}

function load(): Character {
  try { return normalize(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { return blank(); }
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

export const culture = () => selectedCulture(char.culture);
export const career = () => selectedCareer(char.career);
export const learnedSkills = () => [...new Set([
  ...cultureSkills(culture(), char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle),
  ...career().standard, ...char.careerProfessional,
])];
export const poolFor = (kind: Kind) => kind === "bonus" ? bonusPool(char.ageCategory) : POOLS[kind];
export const capFor = (kind: Kind) => kind === "bonus" ? bonusCap(char.ageCategory) : PER_SKILL_CAP;

export function cultureAllocationErrors(): string[] {
  return validateCultureAllocation(culture(), char.cultureSelections, char.alloc.culture, POOLS.culture);
}

const combatStyles = () => [char.cultureSelections.combatStyle, ...(career().combatStyle ?? []), ...char.extras].filter(Boolean);
// Keep older saved specialisations renderable when their source skill is not registered.
export const skillDefinition = (n: string) => skillDef(n, combatStyles());
export const base = (n: string) => formulaVal(skillDefinition(n).f, char.chars);
export const added = (n: string) => sum((Object.keys(POOLS) as Kind[]).map(k => char.alloc[k][n] ?? 0));
export const total = (n: string) => base(n) + added(n);
export const used = (k: Kind) => sum(Object.values(char.alloc[k]));

export function setAlloc(kind: Kind, name: string, v: number) {
  if (kind === "bonus" && !bonusEligible().includes(name)) return;
  if (kind === "career" && !careerSkillOptions(career(), char.careerProfessional).includes(name)) return;
  if (kind === "culture" && !cultureSkills(culture(), char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle).includes(name)) return;
  const a = char.alloc[kind];
  const n = kind === "culture"
    ? (() => {
        const room = POOLS.culture - used(kind) + (a[name] ?? 0);
        const raw = Math.round(v) || 0;
        return raw <= 0 || room < 5 ? 0 : Math.max(5, Math.min(PER_SKILL_CAP, room, raw));
      })()
    : allocationValue(v, poolFor(kind), used(kind), a[name] ?? 0, capFor(kind));
  if (n) a[name] = n; else delete a[name];
}
export function toggleCareerProfessional(name: string) {
  const selected = char.careerProfessional;
  const next = selectCareerProfessional(career(), selected, name);
  if (next !== selected) {
    char.careerProfessional = next;
    if (!next.includes(name) && !careerSkillOptions(career(), char.careerProfessional).includes(name)) delete char.alloc.career[name];
    refreshBonusEligibility();
  }
}
export function addExtra(name: string): boolean {
  const v = name.trim();
  if (!v || char.extras.includes(v)) return false;
  try { skillDef(v, combatStyles()); } catch { return false; }
  char.extras.push(v);
  return true;
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
  let professional = false;
  try { professional = skillDefinition(v).pro; } catch { return; }
  if (professional && !learnedSkills().includes(v)) {
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

export function bonusEligible(): string[] {
  return [...new Set([...learnedSkills(), ...char.extras, ...(char.hobbySkill ? [char.hobbySkill] : [])])];
}
export function allSkills(): string[] {
  const c = culture(), k = career();
  const pickedCulture = cultureSkills(c, char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle);
  return [...new Set([...STANDARD.map(s => s[0]), ...MAGIC.map(s => s[0]), ...pickedCulture, ...k.standard,
    ...(k.combatStyle ?? []), ...char.careerProfessional, ...bonusEligible(),
    ...(Object.keys(char.alloc) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))])];
}
export function stepSkills(kind: Kind): string[] {
  if (kind === "culture") return cultureSkills(culture(), char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle);
  if (kind === "career") return skillsForStage(kind, culture(), career(), [], [], char.careerProfessional);
  return bonusEligible();
}
