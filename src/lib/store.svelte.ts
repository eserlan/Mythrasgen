import { careerSkillOptions, careers, cultures, restoreCareerAllocation, restoreLegacyCareerIndex, selectCareerProfessional, type CultureKind } from "./content";
import { BACKGROUND_EVENT_COUNTS, calculateStartingMoney, CULTURE_MONEY_MULTIPLIERS, classMoneyMultiplier, reconcileBackgroundEvents, type BackgroundEvent } from "./background-rules";
import { migrateCharacterStep, migrateCultureTables, normalizeAgeCategory, normalizeBackground, normalizeRace } from "./migrations";
import { baseName, formulaVal, nativeTongueName, normalizeAge, rollAge, skillDef, sum } from "./calc";
import { culturePassions } from "./passions";
import { allocationValue, selectedCareer, selectedCulture, skillsForStage } from "./creation";
import { cultureSkills, reconcileCultureCombatStyle, validateCultureAllocation } from "./culture";
import { migrateCharacter } from "./migration";
import { AGE_CATEGORIES, bonusCap, bonusPool, MAGIC, PER_SKILL_CAP, POOLS, STANDARD, STATS, type AgeCategory, type Chars, type Kind, type PassionCategory } from "./rules";

export interface Passion {
  type: "Loyalty" | "Love" | "Hate";
  subject: string;
  category: PassionCategory;
  subjectPow?: number;
  subjectCha?: number;
}

export interface Character {
  name: string; race: string; nativeLanguage: string; chars: Chars; ageCategory: AgeCategory; age: number; culture: number; career: number;
  cultureSelections: { standard: string[][]; professional: string[]; combatStyle: string };
  cultureMigration?: boolean;
  alloc: Record<Kind, Record<string, number>>; hobbySkill: string; extras: string[]; careerProfessional: string[]; step: number;
  passionsEnabled: boolean; passions: Passion[];
  background: {
    events: BackgroundEvent[]; archivedEvents: BackgroundEvent[]; socialClassRoll: number; socialClass: string;
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
  "Use age-based bonus points to round out learned skills and one optional hobby skill.",
  "The people, events, and possessions your hero starts with.",
  "Your hero, ready for the table.",
];

const blank = (): Character => ({
  name: "", race: "", nativeLanguage: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars,
  ageCategory: "adult", age: rollAge("adult"), culture: 0, career: 0,
  cultureSelections: { standard: [], professional: [], combatStyle: "" },
  alloc: { culture: {}, career: {}, bonus: {} }, hobbySkill: "", extras: [], careerProfessional: [], step: 0,
  passionsEnabled: false, passions: [],
  socialTable: "Barbarian", moneyTable: "Barbarian",
  background: { events: [{ roll: 0, text: "" }], archivedEvents: [], socialClassRoll: 50, socialClass: "Freeman",
    parentsRoll: 50, parents: "", siblingsRoll: 50, siblings: "", extendedFamilyRoll: 50, extendedFamily: "",
    standingRoll: 50, familyTies: [], connectionsRoll: 50, connections: [], startingMoneyRoll: 14,
    equipment: "Tools; simple weapons; rented accommodation", purchases: [] },
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});
function normalize(value: Partial<Character> | null, home = true): Character {
  const fallback = blank();
  const migrated = migrateCharacter(value ?? fallback);
  const legacyCareer = !!value && value.career !== undefined && !Array.isArray(value.careerProfessional);
  const cultureKind = cultures[migrated.culture ?? fallback.culture]?.kind;
  const ageCategory = normalizeAgeCategory(migrated.ageCategory, fallback.ageCategory);
  const normalized = {
    ...fallback,
    ...migrated,
    career: legacyCareer ? restoreLegacyCareerIndex(migrated.career ?? fallback.career) : migrated.career ?? fallback.career,
    cultureSelections: { ...fallback.cultureSelections, ...migrated.cultureSelections },
    step: migrateCharacterStep(migrated.step ?? fallback.step, !!migrated.background),
    ...migrateCultureTables(cultureKind, migrated.socialTable, migrated.moneyTable),
    ageCategory,
    age: normalizeAge(Number.isFinite(migrated.age) ? migrated.age! : fallback.age, ageCategory),
    background: normalizeBackground(migrated.background, fallback.background),
    alloc: { ...fallback.alloc, ...(migrated.alloc ?? {}) },
    extras: Array.isArray(migrated.extras) ? migrated.extras.filter(x => typeof x === "string") : [],
    careerProfessional: Array.isArray(migrated.careerProfessional) ? migrated.careerProfessional : [],
    hobbySkill: typeof migrated.hobbySkill === "string" ? migrated.hobbySkill : "",
    race: normalizeRace(migrated.race),
    nativeLanguage: typeof migrated.nativeLanguage === "string" ? migrated.nativeLanguage : "",
    home,
  } as Character;
  const eventSlots = reconcileBackgroundEvents(normalized.background.events, normalized.background.archivedEvents, BACKGROUND_EVENT_COUNTS[ageCategory]);
  normalized.background.events = eventSlots.events;
  normalized.background.archivedEvents = eventSlots.archived;
  restoreCareer(normalized, legacyCareer);
  if (!Object.hasOwn(AGE_CATEGORIES, normalized.ageCategory)) normalized.ageCategory = "adult";
  if (normalized.generation !== "roll") normalized.generation = "pointBuy";
  if (!Array.isArray(normalized.rollResults) || normalized.rollResults.length !== STATS.length) normalized.rollResults = null;
  if (!Array.isArray(normalized.rollAssignments) || normalized.rollAssignments.length !== STATS.length
      || new Set(normalized.rollAssignments).size !== STATS.length
      || normalized.rollAssignments.some(i => !Number.isInteger(i) || i < 0 || i >= STATS.length)) {
    normalized.rollAssignments = STATS.map((_, i) => i);
  }
  const learned = new Set([
    ...cultureSkills(selectedCulture(normalized.culture), normalized.cultureSelections.standard, normalized.cultureSelections.professional, normalized.cultureSelections.combatStyle),
    ...selectedCareer(normalized.career).standard, ...normalized.careerProfessional,
  ]);
  if (normalized.nativeLanguage.trim()) {
    if (learned.delete("Native Tongue")) learned.add(`Native Tongue (${normalized.nativeLanguage.trim()})`);
    for (const kind of Object.keys(normalized.alloc) as Kind[]) {
      const points = normalized.alloc[kind]["Native Tongue"];
      if (points !== undefined) {
        delete normalized.alloc[kind]["Native Tongue"];
        normalized.alloc[kind][`Native Tongue (${normalized.nativeLanguage.trim()})`] = points;
      }
    }
  }
  let validHobby = false;
  if (normalized.hobbySkill) {
    try { validHobby = skillDef(normalized.hobbySkill, [normalized.cultureSelections.combatStyle, ...normalized.extras].filter(Boolean)).pro; }
    catch { /* discard invalid legacy hobby skills */ }
  }
  if (learned.has(normalized.hobbySkill) || (normalized.hobbySkill && !validHobby)) normalized.hobbySkill = "";
  normalized.alloc.bonus = Object.fromEntries(Object.entries(normalized.alloc.bonus ?? {}).filter(([name]) =>
    learned.has(name) || normalized.extras.includes(name) || name === normalized.hobbySkill));
  if (normalized.step === STEPS.length - 1 && sum(Object.values(normalized.alloc.bonus)) < bonusPool(normalized.ageCategory)) normalized.step = 4;
  return normalized;
}
function restoreCareer(character: Character, legacy = false) {
  const selected = careers[character.career] ?? careers[0];
  const allocation = Object.fromEntries(Object.entries(character.alloc.career).map(([name, points]) =>
    [/^Native Tongue \(.+\)$/.test(name) ? "Native Tongue" : name, points]));
  const restored = restoreCareerAllocation(selected, legacy ? undefined : character.careerProfessional, allocation);
  character.careerProfessional = restored.professional;
  character.alloc.career = Object.fromEntries(Object.entries(restored.allocation).map(([name, points]) =>
    [name === "Native Tongue" ? nativeTongueName(character.nativeLanguage) : name, points]));
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
export const nativeTongue = () => nativeTongueName(char.nativeLanguage);
const resolveNativeTongue = (skills: string[]) => skills.map(name => name === "Native Tongue" ? nativeTongue() : name);
export const learnedSkills = () => [...new Set([
  ...resolveNativeTongue(cultureSkills(culture(), char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle)),
  ...resolveNativeTongue([...career().standard, ...char.careerProfessional]),
])];
export const poolFor = (kind: Kind) => kind === "bonus" ? bonusPool(char.ageCategory) : POOLS[kind];
export const capFor = (kind: Kind) => kind === "bonus" ? bonusCap(char.ageCategory) : PER_SKILL_CAP;

export const eventCount = () => BACKGROUND_EVENT_COUNTS[char.ageCategory];
export const moneyMultiplier = () => CULTURE_MONEY_MULTIPLIERS[char.moneyTable];
export const startingMoney = () => calculateStartingMoney(char.background.startingMoneyRoll, char.moneyTable, char.socialTable, char.background.socialClass);
export const socialClassMoney = (kind: CultureKind, rank: string) => classMoneyMultiplier(kind, rank);
export const spentMoney = () => char.background.purchases.reduce((total, item) => total + Math.max(0, item.cost), 0);
export const availableMoney = () => startingMoney() - spentMoney();
export const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;
export const rollPercentile = () => rollDie(100);
export const roll4d6 = () => rollDie(6) + rollDie(6) + rollDie(6) + rollDie(6);

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
  if (kind === "career" && !resolveNativeTongue(careerSkillOptions(career(), char.careerProfessional)).includes(name)) return;
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
export function setCultureCombatStyle(value: string) {
  const style = value.trim();
  const previous = char.cultureSelections.combatStyle;
  if (style === previous) return;
  reconcileCultureCombatStyle(previous, style,
    cultureSkills(culture(), char.cultureSelections.standard, char.cultureSelections.professional, ""), char.alloc.culture);
  char.cultureSelections.combatStyle = style;
  char.cultureMigration = false;
  refreshBonusEligibility();
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
  const eventSlots = reconcileBackgroundEvents(char.background.events, char.background.archivedEvents, BACKGROUND_EVENT_COUNTS[ageCategory]);
  char.background.events = eventSlots.events;
  char.background.archivedEvents = eventSlots.archived;
  char.alloc.bonus = {};
  if (char.step > 4) char.step = 4;
}
export function setNativeLanguage(language: string) {
  const previous = nativeTongue();
  char.nativeLanguage = language;
  const next = nativeTongue();
  if (previous === next) return;
  for (const kind of Object.keys(char.alloc) as Kind[]) {
    const points = char.alloc[kind][previous];
    if (points !== undefined) {
      delete char.alloc[kind][previous];
      char.alloc[kind][next] = (char.alloc[kind][next] ?? 0) + points;
    }
  }
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
export function seedCulturePassions(prompts: string[] = culture().passions) {
  char.passions = culturePassions(prompts);
}
export function addPassion() {
  char.passions.push({ type: "Love", subject: "", category: "platonic" });
}

export function allSkills(): string[] {
  const c = culture(), k = career();
  const pickedCulture = cultureSkills(c, char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle);
  return [...new Set(resolveNativeTongue([...STANDARD.map(s => s[0]), ...MAGIC.map(s => s[0]), ...pickedCulture, ...k.standard,
    ...(k.combatStyle ?? []), ...char.careerProfessional, ...bonusEligible(),
    ...(Object.keys(char.alloc) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))]))];
}
export function stepSkills(kind: Kind): string[] {
  if (kind === "culture") return resolveNativeTongue(cultureSkills(culture(), char.cultureSelections.standard, char.cultureSelections.professional, char.cultureSelections.combatStyle));
  if (kind === "career") return resolveNativeTongue(skillsForStage(kind, culture(), career(), [], [], char.careerProfessional));
  return bonusEligible();
}

export { baseName };
