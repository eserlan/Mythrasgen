import { careerSkillOptions, careers, cultures, restoreCareerAllocation, restoreLegacyCareerIndex, selectCareerProfessional, type CultureKind } from "./content";
import { BACKGROUND_EVENT_COUNTS, calculateStartingMoney, CULTURE_MONEY_MULTIPLIERS, classMoneyMultiplier, isSocialClassResolvedForCulture, reconcileBackgroundEvents, SOCIAL_CLASSES, socialClassForRoll, type BackgroundEvent } from "./background-rules";
import { migrateCharacterStep, migrateCultureTables, normalizeAgeCategory, normalizeBackground, normalizeIdentityFields, normalizeRace } from "./migrations";
import { baseName, formulaVal, nativeTongueName, normalizeAge, rollAge, skillDef, sum } from "./calc";
import { culturePassions } from "./passions";
import { allocationValue, selectedCareer, selectedCulture, skillsForStage } from "./creation";
import { cultureSkills, reconcileCultureCombatStyle, validateCultureAllocation } from "./culture";
import { migrateCharacter } from "./migration";
import { AGE_CATEGORIES, bonusCap, bonusPool, MAGIC, PER_SKILL_CAP, POOLS, STANDARD, STATS, type AgeCategory, type Chars, type Kind, type PassionCategory } from "./rules";
import { createCharacterRepository } from "./character-library";
import { swapAssignedValues } from "./characteristics";
import { availableFrames, bodyRanges, FRAMES, isInRange, reconcileMeasurements, type Frame } from "./body";
import { hasMeaningfulSpecialisation, requiresSpecialisation, resolveSkillTemplate, specialisationStageErrors } from "./specialisations";

export interface Passion {
  type: "Loyalty" | "Love" | "Hate";
  subject: string;
  category: PassionCategory;
  subjectPow?: number;
  subjectCha?: number;
}

export interface Character {
  id: string; name: string; race: string; gender: string; homeland: string; handedness: string; description: string; nativeLanguage: string; chars: Chars; ageCategory: AgeCategory; age: number; culture: number; career: number;
  frame: Frame; height: number | null; weight: number | null;
  /** Optional race/template restriction; omitted for human characters. */
  frameOptions?: Frame[];
  cultureSelections: { standard: string[][]; professional: string[]; combatStyle: string };
  skillSpecialisations: { culture: Record<string, string>; career: Record<string, string> };
  cultureMigration?: boolean;
  alloc: Record<Kind, Record<string, number>>; hobbySkill: string; extras: string[]; careerProfessional: string[]; step: number;
  passionsEnabled: boolean; passions: Passion[];
  background: {
    events: BackgroundEvent[]; archivedEvents: BackgroundEvent[]; socialClassRoll: number; socialClass: string;
    socialClassCulture: CultureKind; socialClassMethod: "rolled" | "chosen"; socialClassMoney: number;
    socialClassEquipment: string; socialClassResources: string;
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
  id: "", name: "", race: "", ...normalizeIdentityFields(null), nativeLanguage: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars,
  frame: "Medium", height: null, weight: null,
  ageCategory: "adult", age: rollAge("adult"), culture: 0, career: 0,
  cultureSelections: { standard: [], professional: [], combatStyle: "" },
  skillSpecialisations: { culture: {}, career: {} },
  alloc: { culture: {}, career: {}, bonus: {} }, hobbySkill: "", extras: [], careerProfessional: [], step: 0,
  passionsEnabled: false, passions: [],
  socialTable: "Barbarian", moneyTable: "Barbarian",
  background: { events: [{ roll: 0, text: "" }], archivedEvents: [], socialClassRoll: 50, socialClass: "Freeman",
    socialClassCulture: "Barbarian", socialClassMethod: "rolled", socialClassMoney: 1,
    socialClassEquipment: "Tools; simple weapons", socialClassResources: "Rented accommodation; may own a few livestock",
    parentsRoll: 50, parents: "", siblingsRoll: 50, siblings: "", extendedFamilyRoll: 50, extendedFamily: "",
    standingRoll: 50, familyTies: [], connectionsRoll: 50, connections: [], startingMoneyRoll: 14,
    equipment: "Tools; simple weapons; rented accommodation", purchases: [] },
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});
function resolveNativeTongue(skills: string[], language = char.nativeLanguage) { return skills.map(name => name === "Native Tongue" ? nativeTongueName(language) : name); }
function normalize(value: Partial<Character> | null, home = true): Character {
  const fallback = blank();
  const migrated = migrateCharacter(value ?? fallback);
  const restoreSpecialisations = (values: unknown): Record<string, string> =>
    values && typeof values === "object" && !Array.isArray(values)
      ? Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
  const legacyCareer = !!value && value.career !== undefined && !Array.isArray(value.careerProfessional);
  const cultureKind = cultures[migrated.culture ?? fallback.culture]?.kind;
  const ageCategory = normalizeAgeCategory(migrated.ageCategory, fallback.ageCategory);
  const normalized = {
    ...fallback,
    ...migrated,
    id: typeof migrated.id === "string" && migrated.id ? migrated.id : fallback.id,
    career: legacyCareer ? restoreLegacyCareerIndex(migrated.career ?? fallback.career) : migrated.career ?? fallback.career,
    cultureSelections: { ...fallback.cultureSelections, ...migrated.cultureSelections },
    skillSpecialisations: {
      culture: restoreSpecialisations(migrated.skillSpecialisations?.culture),
      career: restoreSpecialisations(migrated.skillSpecialisations?.career),
    },
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
    ...normalizeIdentityFields(migrated),
    nativeLanguage: typeof migrated.nativeLanguage === "string" ? migrated.nativeLanguage : "",
    home,
  } as Character;
  const resolvedCulture = (migrated.background as Partial<Character["background"]> | undefined)?.socialClassCulture
    ?? migrated.socialTable ?? cultureKind ?? "Civilised";
  normalized.socialTable = cultureKind ?? "Civilised";
  normalized.moneyTable = cultureKind ?? "Civilised";
  normalized.background.socialClassCulture = resolvedCulture;
  // Upgrade legacy saves with a snapshot of the official class data they resolved.
  const savedClass = SOCIAL_CLASSES[resolvedCulture]?.find(row => row.name === normalized.background.socialClass);
  if (savedClass && !(migrated.background as Partial<Character["background"]> | undefined)?.socialClassEquipment) {
    normalized.background.socialClassMoney = savedClass.money;
    normalized.background.socialClassEquipment = savedClass.equipment;
    normalized.background.socialClassResources = savedClass.possessions;
  }
  normalized.frameOptions = Array.isArray(migrated.frameOptions)
    ? migrated.frameOptions.filter((frame): frame is Frame => FRAMES.includes(frame as Frame))
    : undefined;
  if (!FRAMES.includes(normalized.frame) || !availableFrames(normalized.frameOptions).includes(normalized.frame)) {
    normalized.frame = availableFrames(normalized.frameOptions)[0] ?? "Medium";
  }
  const bodyRange = bodyRanges(normalized.chars.SIZ, normalized.frame);
  normalized.height = isInRange(Number.isInteger(migrated.height) ? migrated.height : null, bodyRange?.height) ? migrated.height! : null;
  normalized.weight = isInRange(Number.isInteger(migrated.weight) ? migrated.weight : null, bodyRange?.weight) ? migrated.weight! : null;
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
  const resolve = (templates: string[], values: Record<string, string>) => templates
    .map(template => resolveSkillTemplate(template, values[template])).filter((name): name is string => !!name);
  const learned = new Set([
    ...cultureSkills(selectedCulture(normalized.culture), normalized.cultureSelections.standard,
      resolve(normalized.cultureSelections.professional, normalized.skillSpecialisations.culture), normalized.cultureSelections.combatStyle),
    ...selectedCareer(normalized.career).standard, ...resolve(normalized.careerProfessional, normalized.skillSpecialisations.career),
  ]);
  const unresolvedCultureTemplates = normalized.cultureSelections.professional.filter(template =>
    requiresSpecialisation(template) && !resolveSkillTemplate(template, normalized.skillSpecialisations.culture[template]));
  const cultureEligible = new Set(resolveNativeTongue(cultureSkills(selectedCulture(normalized.culture), normalized.cultureSelections.standard,
    [...resolve(normalized.cultureSelections.professional, normalized.skillSpecialisations.culture), ...unresolvedCultureTemplates], normalized.cultureSelections.combatStyle), normalized.nativeLanguage));
  normalized.alloc.culture = Object.fromEntries(Object.entries(normalized.alloc.culture ?? {}).filter(([name]) => cultureEligible.has(name)));
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
  const unresolvedProfessionalTemplates = new Set([
    ...unresolvedCultureTemplates,
    ...normalized.careerProfessional.filter(template => requiresSpecialisation(template)
      && !resolveSkillTemplate(template, normalized.skillSpecialisations.career[template])),
  ]);
  let validHobby = false;
  if (normalized.hobbySkill) {
    try { validHobby = skillDef(normalized.hobbySkill, [normalized.cultureSelections.combatStyle, ...normalized.extras].filter(Boolean)).pro; }
    catch { /* discard invalid legacy hobby skills */ }
  }
  if (learned.has(normalized.hobbySkill) || (normalized.hobbySkill && !validHobby)) normalized.hobbySkill = "";
  normalized.alloc.bonus = Object.fromEntries(Object.entries(normalized.alloc.bonus ?? {}).filter(([name]) =>
    learned.has(name) || unresolvedProfessionalTemplates.has(name) || normalized.extras.includes(name) || name === normalized.hobbySkill));
  if (normalized.step === STEPS.length - 1 && sum(Object.values(normalized.alloc.bonus)) < bonusPool(normalized.ageCategory)) normalized.step = 4;
  return normalized;
}
function restoreCareer(character: Character, legacy = false) {
  const selected = careers[character.career] ?? careers[0];
  const professional = character.careerProfessional.map(template => resolveSkillTemplate(template, character.skillSpecialisations.career[template])).filter((name): name is string => !!name);
  const unresolvedTemplates = character.careerProfessional.filter(template =>
    requiresSpecialisation(template) && !resolveSkillTemplate(template, character.skillSpecialisations.career[template]));
  const restoreOptions = [...professional, ...unresolvedTemplates];
  const allocation = Object.fromEntries(Object.entries(character.alloc.career).map(([name, points]) =>
    [/^Native Tongue \(.+\)$/.test(name) ? "Native Tongue" : name, points]));
  const restored = restoreCareerAllocation({ ...selected, professional: legacy ? selected.professional : restoreOptions }, legacy ? undefined : restoreOptions, allocation);
  if (legacy) character.careerProfessional = restored.professional.filter(name => selected.professional.includes(name));
  character.alloc.career = Object.fromEntries(Object.entries(restored.allocation).map(([name, points]) =>
    [name === "Native Tongue" ? nativeTongueName(character.nativeLanguage) : name, points]));
}

let browserStorage: Storage | null = null;
try { browserStorage = typeof localStorage === "undefined" ? null : localStorage; } catch { /* storage blocked */ }
const repository = createCharacterRepository<Character>(
  browserStorage ?? { getItem: () => null, setItem: () => {} },
  () => { const { id: _id, ...data } = blank(); return data; },
);
const initialCharacter = repository.getCharacter(repository.getActiveCharacterId() ?? "") ?? repository.createCharacter();
export const char: Character = $state(normalize(initialCharacter, true));
export const characterLibrary = $state({ characters: repository.listCharacters() as Character[] });
function refreshLibrary() { characterLibrary.characters = repository.listCharacters() as Character[]; }

export function persist() { repository.saveCharacter({ ...char }); refreshLibrary(); }
export const reset = (home = true) => Object.assign(char, blank(), { id: char.id, home });
export const replace = (c: Partial<Character>) => Object.assign(char, normalize({ ...c, id: char.id }, false));
export function createCharacter() {
  persist();
  const created = repository.createCharacter();
  Object.assign(char, normalize(created, false));
  refreshLibrary();
  return created.id;
}
export function selectCharacter(id: string) {
  persist();
  if (!repository.setActiveCharacter(id)) return false;
  const selected = repository.getCharacter(id);
  if (!selected) return false;
  Object.assign(char, normalize(selected, false));
  refreshLibrary();
  return true;
}
export function deleteCharacter(id: string) {
  persist();
  if (!repository.deleteCharacter(id)) return false;
  const fallbackId = repository.getActiveCharacterId();
  const fallback = fallbackId ? repository.getCharacter(fallbackId) : null;
  if (fallback) Object.assign(char, normalize(fallback, false));
  else {
    const created = repository.createCharacter();
    Object.assign(char, normalize(created, true));
  }
  refreshLibrary();
  return true;
}
export function renameCharacter(id: string, name: string) {
  const existing = repository.getCharacter(id);
  if (!existing) return;
  repository.saveCharacter({ ...existing, name: name.trim() });
  if (char.id === id) char.name = name.trim();
  refreshLibrary();
}
export function setRollResults(results: number[]) {
  if (results.length !== STATS.length) return "";
  char.generation = "roll";
  char.rollResults = [...results];
  char.rollAssignments = STATS.map((_, i) => i);
  STATS.forEach((k, i) => { char.chars[k] = results[i]; });
  return reconcileBodyMeasurements();
}
export function swapCharacteristics(first: (typeof STATS)[number], second: (typeof STATS)[number]) {
  if (char.generation !== "roll" || !char.rollResults || !swapAssignedValues(char.chars, char.rollAssignments, first, second)) return "";
  return first === "SIZ" || second === "SIZ" ? reconcileBodyMeasurements() : "";
}
function reconcileBodyMeasurements(): string {
  const reconciled = reconcileMeasurements(char.height, char.weight, bodyRanges(char.chars.SIZ, char.frame));
  char.height = reconciled.height;
  char.weight = reconciled.weight;
  return reconciled.cleared.length
    ? `${reconciled.cleared.map(value => value[0].toUpperCase() + value.slice(1)).join(" and ")} cleared because the new SIZ/Frame range no longer allows the previous value.`
    : "";
}
export function setCharacteristic(stat: (typeof STATS)[number], value: number): string {
  char.chars[stat] = value;
  return stat === "SIZ" ? reconcileBodyMeasurements() : "";
}
export function setFrame(frame: Frame): string {
  if (!availableFrames(char.frameOptions).includes(frame)) return "";
  char.frame = frame;
  return reconcileBodyMeasurements();
}
export function setHeight(value: number | null): boolean {
  if (value === null) { char.height = null; return true; }
  if (!isInRange(value, bodyRanges(char.chars.SIZ, char.frame)?.height)) return false;
  char.height = value;
  return true;
}
export function setWeight(value: number | null): boolean {
  if (value === null) { char.weight = null; return true; }
  if (!isInRange(value, bodyRanges(char.chars.SIZ, char.frame)?.weight)) return false;
  char.weight = value;
  return true;
}
export const hasProgress = () => !!char.name || char.step > 0 || used("culture") + used("career") + used("bonus") > 0
  || STATS.some(k => char.chars[k] !== 10);

export const culture = () => selectedCulture(char.culture);
export const career = () => selectedCareer(char.career);
export const nativeTongue = () => nativeTongueName(char.nativeLanguage);
export const learnedSkills = () => [...new Set([
  ...resolveNativeTongue(cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle)),
  ...resolveNativeTongue([...career().standard, ...resolvedProfessional("career")]),
])];
export const poolFor = (kind: Kind) => kind === "bonus" ? bonusPool(char.ageCategory) : POOLS[kind];
export const capFor = (kind: Kind) => kind === "bonus" ? bonusCap(char.ageCategory) : PER_SKILL_CAP;

export const eventCount = () => BACKGROUND_EVENT_COUNTS[char.ageCategory];
export const moneyMultiplier = () => CULTURE_MONEY_MULTIPLIERS[char.moneyTable];
export const socialClassReady = () => isSocialClassResolvedForCulture(char.socialTable, {
  rank: char.background.socialClass,
  roll: char.background.socialClassRoll,
  method: char.background.socialClassMethod,
  money: char.background.socialClassMoney,
  equipment: char.background.socialClassEquipment,
  resources: char.background.socialClassResources,
});
export const resolveSocialClass = (row: ReturnType<typeof socialClassForRoll>, method: "rolled" | "chosen" = "rolled") => {
  char.background.socialClass = row.name;
  char.background.socialClassCulture = char.socialTable;
  char.background.socialClassMethod = method;
  char.background.socialClassMoney = row.money;
  char.background.socialClassEquipment = row.equipment;
  char.background.socialClassResources = row.possessions;
  char.background.equipment = `${row.equipment}. ${row.possessions}.`;
};
export const startingMoney = () => socialClassReady()
  ? calculateStartingMoney(char.background.startingMoneyRoll, char.moneyTable, char.background.socialClassMoney)
  : 0;
export const socialClassMoney = (kind: CultureKind, rank: string) => classMoneyMultiplier(kind, rank);
export const spentMoney = () => char.background.purchases.reduce((total, item) => total + Math.max(0, item.cost), 0);
export const availableMoney = () => socialClassReady() ? startingMoney() - spentMoney() : 0;
export const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;
export const rollPercentile = () => rollDie(100);
export const roll4d6 = () => rollDie(6) + rollDie(6) + rollDie(6) + rollDie(6);

export function cultureAllocationErrors(): string[] {
  return [...specialisationStageErrors(char.cultureSelections.professional, char.skillSpecialisations.culture),
    ...validateCultureAllocation(culture(), char.cultureSelections, char.alloc.culture, POOLS.culture, resolvedProfessional("culture"))];
}
export function careerAllocationErrors(): string[] {
  return specialisationStageErrors(char.careerProfessional, char.skillSpecialisations.career);
}

function resolvedProfessional(stage: "culture" | "career"): string[] {
  const templates = stage === "culture" ? char.cultureSelections.professional : char.careerProfessional;
  return templates.map(template => resolveSkillTemplate(template, char.skillSpecialisations[stage][template]))
    .filter((name): name is string => !!name);
}

function reconcileStageAllocation(kind: "culture" | "career") {
  const eligible = kind === "culture"
    ? cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle)
    : resolveNativeTongue(careerSkillOptions(career(), resolvedProfessional("career")));
  for (const name of Object.keys(char.alloc[kind])) if (!eligible.includes(name)) delete char.alloc[kind][name];
}

export function setSkillSpecialisation(stage: "culture" | "career", template: string, value: string) {
  const values = char.skillSpecialisations[stage];
  const previous = resolveSkillTemplate(template, values[template]);
  const nextValue = value.trim();
  if (hasMeaningfulSpecialisation(nextValue)) values[template] = nextValue; else delete values[template];
  const next = resolveSkillTemplate(template, values[template]);
  const pendingAllocation = next ? char.alloc[stage][template] ?? 0 : 0;
  const pendingBonus = next ? char.alloc.bonus[template] ?? 0 : 0;
  if (pendingAllocation) delete char.alloc[stage][template];
  if (pendingBonus) delete char.alloc.bonus[template];
  reconcileStageAllocation(stage);
  if (pendingAllocation && next) char.alloc[stage][next] = (char.alloc[stage][next] ?? 0) + pendingAllocation;
  if (pendingBonus && next) char.alloc.bonus[next] = (char.alloc.bonus[next] ?? 0) + pendingBonus;
  if (previous && previous !== next) {
    const stillEligible = stage === "culture"
      ? cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle).includes(previous)
      : resolveNativeTongue(careerSkillOptions(career(), resolvedProfessional("career"))).includes(previous);
    if (!stillEligible) delete char.alloc[stage][previous];
  }
  refreshBonusEligibility();
}
export function reconcileCultureSelection() {
  reconcileStageAllocation("culture");
  refreshBonusEligibility();
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
  if (kind === "career" && !resolveNativeTongue(careerSkillOptions(career(), resolvedProfessional("career"))).includes(name)) return;
  if (kind === "culture" && !cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle).includes(name)) return;
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
    if (!next.includes(name)) delete char.skillSpecialisations.career[name];
    char.careerProfessional = next;
    reconcileStageAllocation("career");
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
  const pickedCulture = cultureSkills(c, char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle);
  return [...new Set(resolveNativeTongue([...STANDARD.map(s => s[0]), ...MAGIC.map(s => s[0]), ...pickedCulture, ...k.standard,
    ...(k.combatStyle ?? []), ...resolvedProfessional("career"), ...bonusEligible(),
    ...(Object.keys(char.alloc) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))]))];
}
export function stepSkills(kind: Kind): string[] {
  if (kind === "culture") return resolveNativeTongue(cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle));
  if (kind === "career") return resolveNativeTongue(skillsForStage(kind, culture(), career(), [], [], resolvedProfessional("career")));
  return bonusEligible();
}

export { baseName };
