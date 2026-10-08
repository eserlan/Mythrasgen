import { careers, cultures, restoreCareerAllocation, restoreLegacyCareerIndex, selectCareerProfessional, type CultureKind } from "./content";
import { BACKGROUND_EVENT_COUNTS, calculateStartingMoney, CULTURE_MONEY_MULTIPLIERS, classMoneyMultiplier, isSocialClassResolvedForCulture, reconcileBackgroundEvents, SOCIAL_CLASSES, socialClassForRoll, type BackgroundEvent } from "./background-rules";
import { migrateCharacterStep, migrateCultureTables, normalizeAgeCategory, normalizeBackground, normalizeIdentityFields, normalizeRace } from "./migrations";
import { baseName, formulaVal, nativeTongueName, normalizeAge, rollAge, skillDef, sum } from "./calc";
import { culturePassions } from "./passions";
import { allocationValue, selectedCareer, selectedCulture } from "./creation";
import { cultureSkills, reconcileCultureCombatStyle, validateCultureAllocation } from "./culture";
import { migrateCharacter } from "./migration";
import { AGE_CATEGORIES, bonusCap, bonusPool, MAGIC, PER_SKILL_CAP, POOLS, RESISTANCES, STANDARD, STATS, type AgeCategory, type Chars, type Kind, type PassionCategory } from "./rules";
import { createCharacterRepository } from "./character-library";
import { swapAssignedValues } from "./characteristics";
import { availableFrames, bodyRanges, FRAMES, isInRange, reconcileMeasurements, type Frame } from "./body";
import { attachCharacterStyle, CORE_COMBAT_STYLES, detachCharacterStyle, legacyCombatStyle, normalizeCombatStyles, type CharacterCombatStyle, type CombatStyleSelection } from "./combat-styles";
import { hasMeaningfulSpecialisation, requiresSpecialisation, resolveSkillTemplate, specialisationStageErrors } from "./specialisations";
import { hobbySkillName, restoreHobbySkill, type HobbySkill } from "./hobby-skills";
import type { FamilyRelationship } from "./family-relationships";
import { detectMagicDisciplines, emptyMagicState, normalizeMagicState, reconcileMagicState, type MagicState, type OrganisationMembership } from "./magic";
import { reconcileAnimism } from "./animism";
import { CORE_THEIST_CULTS } from "./theism";
import { genericRankForTitle, normalizeOrganisationMemberships, normalizeOrganisations, rankTitle, type Organisation, type GenericOrganisationRank } from "./organisations";
import { CORE_MYSTICISM_ORGANISATIONS } from "./mysticism";
import { CORE_SORCERY_SCHOOLS } from "./sorcery";
import { syncMagicOrganisationMemberships } from "./magic-organisations";

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
  combatStyles: CharacterCombatStyle[];
  skillSpecialisations: { culture: Record<string, string>; career: Record<string, string> };
  cultureMigration?: boolean;
  alloc: Record<Kind, Record<string, number>>; hobbySkill: HobbySkill | null; careerProfessional: string[]; careerCombatStyles: string[]; step: number;
  passionsEnabled: boolean; passions: Passion[];
  background: {
    events: BackgroundEvent[]; archivedEvents: BackgroundEvent[]; socialClassRoll: number; socialClass: string;
    socialClassCulture: CultureKind; socialClassMethod: "rolled" | "chosen"; socialClassMoney: number;
    socialClassEquipment: string; socialClassResources: string;
    parentsRoll: number; parents: string; siblingsRoll: number; siblings: string; extendedFamilyRoll: number; extendedFamily: string;
    standingRoll: number; standingResolved: boolean; familyReputationCountRoll: number; familyTies: string[]; connectionsRoll: number;
    connectionsResolved: boolean; connections: string[]; relationships: FamilyRelationship[]; startingMoneyRoll: number;
    startingMoneyKey: string; startingMoneyTotal: number; currentMoney: number; equipment: string;
    purchases: { name: string; cost: number }[];
  };
  magic: MagicState;
  organisations: Organisation[];
  memberships: OrganisationMembership[];
  socialTable: CultureKind;
  moneyTable: CultureKind;
  generation: "pointBuy" | "roll"; rollResults: number[] | null; rollAssignments: number[];
  /** True while the landing page is showing. */
  home: boolean;
}
export const STEPS = ["Concept", "Characteristics", "Culture", "Career", "Bonus Skills", "Magic & Cults", "Background", "Combat", "Sheet"];
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
export const INTRO = [
  "Name your hero and choose their culture and career.",
  "The raw measure of body and mind. Roll the dice, or set each by hand.",
  "The customs and skills every child of your people learns.",
  "The trade or calling that shaped your adult years.",
  "Use age-based bonus points to round out learned skills and one optional hobby skill.",
  "Review magical capabilities and record membership in cults, brotherhoods, and other organisations.",
  "The people, events, and possessions your hero starts with.",
  "Combat Styles, their weapons, and the training that governs them.",
  "Your hero, ready for the table.",
];

const blank = (): Character => ({
  id: "", name: "", race: "", ...normalizeIdentityFields(null), nativeLanguage: "", chars: Object.fromEntries(STATS.map(k => [k, 10])) as Chars,
  frame: "Medium", height: null, weight: null,
  ageCategory: "adult", age: rollAge("adult"), culture: 0, career: 0,
  combatStyles: [],
  cultureSelections: { standard: [], professional: [], combatStyle: "" },
  skillSpecialisations: { culture: {}, career: {} },
  alloc: { culture: {}, career: {}, bonus: {} }, hobbySkill: null, careerProfessional: [], careerCombatStyles: [], step: 0,
  passionsEnabled: false, passions: [],
  magic: emptyMagicState(), organisations: [], memberships: [],
  socialTable: "Barbarian", moneyTable: "Barbarian",
  background: { events: [{ roll: 0 }], archivedEvents: [], socialClassRoll: 50, socialClass: "Freeman",
    socialClassCulture: "Barbarian", socialClassMethod: "rolled", socialClassMoney: 1,
    socialClassEquipment: "Tools; simple weapons", socialClassResources: "Rented accommodation; may own a few livestock",
    parentsRoll: 0, parents: "", siblingsRoll: 0, siblings: "", extendedFamilyRoll: 0, extendedFamily: "",
    standingRoll: 0, standingResolved: false, familyReputationCountRoll: 0, familyTies: [], connectionsRoll: 0,
    connectionsResolved: false, connections: [], relationships: [], startingMoneyRoll: 14, startingMoneyKey: "", startingMoneyTotal: 700, currentMoney: 700,
    equipment: "Tools; simple weapons; rented accommodation", purchases: [] },
  generation: "pointBuy", rollResults: null, rollAssignments: STATS.map((_, i) => i), home: true,
});
function resolveNativeTongue(skills: string[], language = char.nativeLanguage) { return skills.map(name => name === "Native Tongue" ? nativeTongueName(language) : name); }
const designationLabels = new Set([...cultures.map(item => item.name), ...careers.map(item => item.name)]);
const isSkillName = (name: unknown): name is string => typeof name === "string" && !designationLabels.has(name);

export function normalizeCharacter(value: Partial<Character> | null, home = true): Character {
  const restoreSpecialisations = (values: unknown): Record<string, string> =>
    values && typeof values === "object" && !Array.isArray(values)
      ? Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
  const fallback = blank();
  // Older saves could place a culture/career label in a skill-choice field.
  // Restore that designation to its proper index before the legacy migration
  // runs, then keep it out of the skill registry inputs below.
  const savedSelections = value?.cultureSelections as Partial<Character["cultureSelections"]> | undefined;
  const savedCultureLabels = [
    ...(typeof value?.culture === "string" ? [value.culture] : []),
    ...(Array.isArray(savedSelections?.standard) ? savedSelections.standard.flat() : []),
    ...(Array.isArray(savedSelections?.professional) ? savedSelections.professional : []),
    ...(typeof savedSelections?.combatStyle === "string" ? [savedSelections.combatStyle] : []),
    ...(Array.isArray(value?.careerProfessional) ? value.careerProfessional : []),
  ];
  const savedCareerLabels = [
    ...(typeof value?.career === "string" ? [value.career] : []),
    ...savedCultureLabels,
  ];
  const cultureLabel = savedCultureLabels.find(name => cultures.some(item => item.name === name));
  // A numeric career is an old index and must keep using the legacy index map.
  // String career values, and labels recovered from the old choice fields, are
  // already current names and must not be remapped as legacy indices later.
  const careerLabel = typeof value?.career === "number"
    ? undefined
    : savedCareerLabels.find(name => careers.some(item => item.name === name));
  const migrated = migrateCharacter({
    ...(value ?? fallback),
    ...(cultureLabel ? { culture: cultures.findIndex(item => item.name === cultureLabel) } : {}),
    ...(careerLabel ? { career: careers.findIndex(item => item.name === careerLabel) } : {}),
  });
  const legacyHobby = migrated.hobbySkill;
  const legacyCareer = !!value && value.career !== undefined && !Array.isArray(value.careerProfessional) && !careerLabel;
  const cultureKind = cultures[migrated.culture ?? fallback.culture]?.kind;
  const ageCategory = normalizeAgeCategory(migrated.ageCategory, fallback.ageCategory);
  const restoreCultureChoices = (candidate: unknown): string[][] => {
    if (!Array.isArray(candidate)) return fallback.cultureSelections.standard;
    return candidate.every(Array.isArray)
      ? candidate.map(group => group.filter(isSkillName))
      : [candidate.filter(isSkillName)];
  };
  const normalized = {
    ...fallback,
    ...migrated,
    id: typeof migrated.id === "string" && migrated.id ? migrated.id : fallback.id,
    career: legacyCareer ? restoreLegacyCareerIndex(migrated.career ?? fallback.career) : migrated.career ?? fallback.career,
    cultureSelections: {
      ...fallback.cultureSelections,
      ...migrated.cultureSelections,
      standard: restoreCultureChoices(migrated.cultureSelections?.standard),
      professional: Array.isArray(migrated.cultureSelections?.professional)
        ? migrated.cultureSelections.professional.filter(isSkillName)
        : fallback.cultureSelections.professional,
      combatStyle: isSkillName(migrated.cultureSelections?.combatStyle) ? migrated.cultureSelections.combatStyle : "",
    },
    combatStyles: normalizeCombatStyles(migrated.combatStyles),
    skillSpecialisations: {
      culture: restoreSpecialisations(migrated.skillSpecialisations?.culture),
      career: restoreSpecialisations(migrated.skillSpecialisations?.career),
    },
    step: migrateCharacterStep(migrated.step ?? fallback.step, !!migrated.background, !!migrated.magic),
    magic: normalizeMagicState(migrated.magic),
    organisations: [], memberships: [],
    ...migrateCultureTables(cultureKind, migrated.socialTable, migrated.moneyTable),
    ageCategory,
    age: normalizeAge(Number.isFinite(migrated.age) ? migrated.age! : fallback.age, ageCategory),
    background: normalizeBackground(migrated.background, fallback.background),
    alloc: { ...fallback.alloc, ...(migrated.alloc ?? {}) },
    careerProfessional: Array.isArray(migrated.careerProfessional) ? migrated.careerProfessional.filter(isSkillName) : [],
    careerCombatStyles: Array.isArray(migrated.careerCombatStyles) ? migrated.careerCombatStyles.filter(name => typeof name === "string") : [],
    hobbySkill: null,
    race: normalizeRace(migrated.race),
    ...normalizeIdentityFields(migrated),
    nativeLanguage: typeof migrated.nativeLanguage === "string" ? migrated.nativeLanguage : "",
    home,
  } as Character;
  // Older saves stored organisation labels in `memberships`; restore those as Common memberships.
  const oldMembershipRows: unknown[] = Array.isArray(migrated.memberships) ? migrated.memberships as unknown[] : [];
  const oldOrganisations = oldMembershipRows.flatMap(row => {
    if (!row || typeof row !== "object") return [];
    const old = row as Record<string, unknown>;
    if (typeof old.id !== "string" || typeof old.name !== "string") return [];
    return [{ id: old.id, name: old.name, kind: { type: "custom" as const,
      ...(typeof old.organisationType === "string" ? { category: old.organisationType } : {}) },
      ...(old.details && typeof old.details === "object" ? { details: old.details as Organisation["details"] } : {}) }];
  });
  const magicOrganisations: Organisation[] = normalized.magic.theism.memberships.flatMap(membership => {
    const cult = [...CORE_THEIST_CULTS, ...normalized.magic.theism.customCults].find(item => item.id === membership.cultId);
    if (!cult) return [];
    return [{ id: cult.id, name: cult.name, kind: { type: "magical-cult" as const, discipline: "Theism" as const }, deity: cult.deity,
      ...(cult.description ? { description: cult.description } : {}) }];
  });
  const linkedMagicOrganisations: Organisation[] = [
    ...CORE_MYSTICISM_ORGANISATIONS.map(organisation => ({ id: organisation.id, name: organisation.name,
      kind: { type: "magical-cult" as const, discipline: "Mysticism" as const }, ...(organisation.notes ? { details: { notes: organisation.notes } } : {}) })),
    ...normalized.magic.mysticism.organisations.map(organisation => ({ id: organisation.id, name: organisation.name,
      kind: { type: "magical-cult" as const, discipline: "Mysticism" as const }, ...(organisation.notes ? { details: { notes: organisation.notes } } : {}) })),
    ...normalized.magic.animism.traditions.flatMap(tradition => tradition.organisationId ? [{ id: tradition.organisationId,
      name: tradition.name, kind: { type: "magical-cult" as const, discipline: "Animism" as const },
      ...(tradition.description ? { description: tradition.description } : {}), ...(tradition.notes ? { details: { notes: tradition.notes } } : {}) }] : []),
    ...[...CORE_SORCERY_SCHOOLS, ...normalized.magic.sorcery.customSchools].flatMap(school => school.organisationId ? [{ id: school.organisationId,
      name: school.name, kind: { type: "magical-cult" as const, discipline: "Sorcery" as const },
      ...(school.notes ? { details: { notes: school.notes } } : {}) }] : []),
  ];
  normalized.organisations = normalizeOrganisations([
    ...linkedMagicOrganisations, ...magicOrganisations, ...oldOrganisations, ...(Array.isArray(migrated.organisations) ? migrated.organisations : []),
  ]);
  const legacyGenericMemberships = oldMembershipRows.flatMap(row => {
    if (!row || typeof row !== "object") return [];
    const old = row as Record<string, unknown>;
    return typeof old.id === "string" ? [{ id: old.id, organisationId: old.id, rank: "Common" }] : [];
  });
  const theistMemberships = normalized.magic.theism.memberships.map(membership => ({
    id: membership.id, organisationId: membership.cultId,
    rank: genericRankForTitle(membership.rank, "Theism") ?? "Common" as GenericOrganisationRank,
  }));
  const genericMemberships = normalizeOrganisationMemberships([...theistMemberships, ...legacyGenericMemberships,
    ...(Array.isArray(migrated.memberships) ? migrated.memberships.filter(item => item && typeof item === "object" && "organisationId" in item) : [])]);
  normalized.memberships = genericMemberships;
  // Generic membership rank is authoritative; Theism keeps its discipline title for existing rules/UI.
  for (const membership of normalized.memberships) {
    const theist = normalized.magic.theism.memberships.find(item => item.id === membership.id);
    const organisation = normalized.organisations.find(item => item.id === membership.organisationId);
    if (theist && organisation?.kind.type === "magical-cult" && organisation.kind.discipline === "Theism") {
      theist.rank = rankTitle(membership.rank, { kind: organisation.kind }) as typeof theist.rank;
    }
  }
  for (const membership of normalized.memberships) {
    if (!normalized.organisations.some(organisation => organisation.id === membership.organisationId)) {
      normalized.organisations.push({ id: membership.organisationId, name: membership.organisationId,
        kind: { type: "custom", category: "legacy" } });
    }
  }
  syncMagicOrganisationMemberships(normalized.magic, normalized.organisations, normalized.memberships);
  const legacyNames = [
    ...(normalized.cultureSelections.combatStyle ? [[normalized.cultureSelections.combatStyle, "culture"] as const] : []),
    ...normalized.careerCombatStyles.filter(Boolean).map(name => [name, "career"] as const),
    ...(typeof legacyHobby === "string" && (/^Combat Style \(/.test(legacyHobby)
      || CORE_COMBAT_STYLES.some(style => style.name === legacyHobby)
      || normalized.combatStyles.some(style => style.name === legacyHobby)) ? [[legacyHobby, "bonus"] as const] : []),
    ...(["culture", "career", "bonus"] as const).flatMap(origin => Object.keys(normalized.alloc[origin] ?? {})
      .filter(name => /^Combat Style \(.+\)$/.test(name)).map(name => [name, origin] as const)),
  ];
  for (const [name, origin] of legacyNames) {
    const existing = normalized.combatStyles.find(style => style.name === name);
    if (existing) {
      if (!existing.origins.includes(origin)) existing.origins.push(origin);
    } else {
      normalized.combatStyles = attachCharacterStyle(normalized.combatStyles, legacyCombatStyle(name, origin), origin);
    }
  }
  normalized.hobbySkill = restoreHobbySkill(legacyHobby, [
    ...CORE_COMBAT_STYLES.map(style => style.name), ...normalized.combatStyles.map(style => style.name),
  ]);
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
  const moneyReady = isSocialClassResolvedForCulture(normalized.socialTable, {
    rank: normalized.background.socialClass,
    roll: normalized.background.socialClassRoll,
    method: normalized.background.socialClassMethod,
    money: normalized.background.socialClassMoney,
    equipment: normalized.background.socialClassEquipment,
    resources: normalized.background.socialClassResources,
  });
  const moneyKey = `${normalized.background.startingMoneyRoll}:${normalized.moneyTable}:${moneyReady ? normalized.background.socialClassMoney : "pending"}`;
  normalized.background.startingMoneyTotal = moneyReady
    ? calculateStartingMoney(normalized.background.startingMoneyRoll, normalized.moneyTable, normalized.background.socialClassMoney)
    : 0;
  const migratedCurrentMoney = migrated.background?.currentMoney;
  const savedCurrentMoney = typeof migratedCurrentMoney === "number"
    && Number.isFinite(migratedCurrentMoney) && migratedCurrentMoney >= 0;
  if (!savedCurrentMoney) {
    const spent = normalized.background.purchases.reduce((total, item) => total + item.cost, 0);
    normalized.background.currentMoney = Math.max(0, normalized.background.startingMoneyTotal - spent);
  } else if (normalized.background.startingMoneyKey !== moneyKey) {
    normalized.background.currentMoney = normalized.background.startingMoneyTotal;
  }
  normalized.background.startingMoneyKey = moneyKey;
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
  normalized.combatStyles = normalized.combatStyles.map(style => ({
    ...style,
    allocations: Object.fromEntries((Object.keys(POOLS) as Kind[]).flatMap(kind =>
      normalized.alloc[kind][style.name] === undefined ? [] : [[kind, normalized.alloc[kind][style.name]]])),
  }));
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
    ...selectedCareer(normalized.career).standard, ...normalized.careerCombatStyles,
    ...resolve(normalized.careerProfessional, normalized.skillSpecialisations.career),
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
  const hobbyName = hobbySkillName(normalized.hobbySkill);
  let validHobby = false;
  if (normalized.hobbySkill?.type === "combatStyle") {
    validHobby = normalized.combatStyles.some(style => style.name === hobbyName)
      || CORE_COMBAT_STYLES.some(style => style.name === hobbyName);
  } else if (normalized.hobbySkill?.type === "professionalSkill") {
    try { validHobby = skillDef(hobbyName).pro; } catch { /* discard invalid legacy hobby skills */ }
  }
  if (learned.has(hobbyName) || (normalized.hobbySkill && !validHobby)) normalized.hobbySkill = null;
  normalized.alloc.bonus = Object.fromEntries(Object.entries(normalized.alloc.bonus ?? {}).filter(([name]) =>
    learned.has(name) || unresolvedProfessionalTemplates.has(name) || name === hobbyName && !!normalized.hobbySkill));
  if (normalized.step === STEPS.length - 1 && sum(Object.values(normalized.alloc.bonus)) < bonusPool(normalized.ageCategory)) normalized.step = 4;
  normalized.magic = reconcileMagicState(normalized.magic, detectMagicDisciplines(magicSkillsFor(normalized)));
  const animismBinding = magicSkillsFor(normalized).find(skill => skill.name === "Binding" || skill.name.startsWith("Binding ("));
  reconcileAnimism(normalized.magic.animism, normalized.magic.animism.rank, normalized.chars.CHA, normalized.magic.animism.traditionId, animismBinding?.value);
  return normalized;
}

function magicSkillsFor(character: Character) {
  const cultureLearned = cultureSkills(selectedCulture(character.culture), character.cultureSelections.standard,
    character.cultureSelections.professional.map(template => resolveSkillTemplate(template, character.skillSpecialisations.culture[template]))
      .filter((name): name is string => !!name), character.cultureSelections.combatStyle);
  const careerLearned = [...new Set([...selectedCareer(character.career).standard, ...character.careerCombatStyles.filter(Boolean),
    ...character.careerProfessional.map(template => resolveSkillTemplate(template, character.skillSpecialisations.career[template]))
      .filter((name): name is string => !!name)])];
  const hobby = hobbySkillName(character.hobbySkill);
  const names = [...new Set([...cultureLearned, ...careerLearned, ...(hobby ? [hobby] : []), ...Object.keys(character.alloc.bonus)])];
  return names.map(name => {
    const origins = [
      ...(cultureLearned.includes(name) ? ["culture" as const] : []),
      ...(careerLearned.includes(name) ? ["career" as const] : []),
      ...(name === hobby || (character.alloc.bonus[name] ?? 0) > 0 ? ["bonus" as const] : []),
    ];
    const value = formulaVal(skillDef(name, [...character.careerCombatStyles, character.cultureSelections.combatStyle].filter(Boolean)).f, character.chars)
      + sum((Object.keys(POOLS) as Kind[]).map(kind => character.alloc[kind][name] ?? 0));
    return { name, value, origins };
  });
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
  const eligible = new Set([...selected.standard, ...character.careerCombatStyles, ...restoreOptions]);
  // Keep pre-structured career style names intact when loading old saves.
  for (const name of Object.keys(allocation)) if (/^Combat Style \(/.test(name)) eligible.add(name);
  character.alloc.career = Object.fromEntries(Object.entries(restored.allocation).filter(([name]) => eligible.has(name)).map(([name, points]) =>
    [name === "Native Tongue" ? nativeTongueName(character.nativeLanguage) : name, points]));
}
let browserStorage: Storage | null = null;
try { browserStorage = typeof localStorage === "undefined" ? null : localStorage; } catch { /* storage blocked */ }
const repository = createCharacterRepository<Character>(
  browserStorage ?? { getItem: () => null, setItem: () => {} },
  () => { const { id: _id, ...data } = blank(); return data; },
);
const initialCharacter = repository.getCharacter(repository.getActiveCharacterId() ?? "") ?? repository.createCharacter();
export const char: Character = $state(normalizeCharacter(initialCharacter, true));
export const characterLibrary = $state({ characters: repository.listCharacters() as Character[] });
function refreshLibrary() { characterLibrary.characters = repository.listCharacters() as Character[]; }

export function persist() { recalculateStartingMoney(); repository.saveCharacter({ ...char }); refreshLibrary(); }
export function reconcileMagic() {
  char.magic = reconcileMagicState(char.magic, detectMagicDisciplines(magicSkillsFor(char)));
  const binding = magicSkillsFor(char).find(skill => skill.name === "Binding" || skill.name.startsWith("Binding ("));
  reconcileAnimism(char.magic.animism, char.magic.animism.rank, char.chars.CHA, char.magic.animism.traditionId, binding?.value);
}
export const reset = (home = true) => Object.assign(char, blank(), { id: char.id, home });
export const replace = (c: Partial<Character>) => Object.assign(char, normalizeCharacter({ ...c, id: char.id }, false));
export function createCharacter() {
  persist();
  const created = repository.createCharacter();
  Object.assign(char, normalizeCharacter(created, false));
  refreshLibrary();
  return created.id;
}
export function selectCharacter(id: string) {
  persist();
  if (!repository.setActiveCharacter(id)) return false;
  const selected = repository.getCharacter(id);
  if (!selected) return false;
  Object.assign(char, normalizeCharacter(selected, false));
  refreshLibrary();
  return true;
}
export function deleteCharacter(id: string) {
  persist();
  if (!repository.deleteCharacter(id)) return false;
  const fallbackId = repository.getActiveCharacterId();
  const fallback = fallbackId ? repository.getCharacter(fallbackId) : null;
  if (fallback) Object.assign(char, normalizeCharacter(fallback, false));
  else {
    const created = repository.createCharacter();
    Object.assign(char, normalizeCharacter(created, true));
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
const careerSkills = () => [...new Set([...career().standard, ...char.careerCombatStyles.filter(Boolean), ...resolvedProfessional("career"),
  ...char.careerProfessional.filter(template => requiresSpecialisation(template) && !resolveSkillTemplate(template, char.skillSpecialisations.career[template])),
  ...Object.keys(char.alloc.career).filter(name => /^Combat Style \(/.test(name))])];
export const nativeTongue = () => nativeTongueName(char.nativeLanguage);

export const learnedSkills = () => [...new Set([
  ...RESISTANCES,
  ...resolveNativeTongue(cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle)),
  ...resolveNativeTongue(careerSkills()),
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
  recalculateStartingMoney();
};
export function recalculateStartingMoney() {
  const ready = socialClassReady();
  const key = `${char.background.startingMoneyRoll}:${char.moneyTable}:${ready ? char.background.socialClassMoney : "pending"}`;
  const total = ready
    ? calculateStartingMoney(char.background.startingMoneyRoll, char.moneyTable, char.background.socialClassMoney)
    : 0;
  if (char.background.startingMoneyKey !== key) char.background.currentMoney = total;
  char.background.startingMoneyKey = key;
  char.background.startingMoneyTotal = total;
  return total;
}
export function setStartingMoneyRoll(roll: number) {
  char.background.startingMoneyRoll = Math.max(4, Math.min(24, Math.round(Number(roll) || 4)));
  return recalculateStartingMoney();
}
export const startingMoney = () => char.background.startingMoneyTotal;
export const socialClassMoney = (kind: CultureKind, rank: string) => classMoneyMultiplier(kind, rank);
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
    : resolveNativeTongue(careerSkills());
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
      : resolveNativeTongue(careerSkills()).includes(previous);
    if (!stillEligible) delete char.alloc[stage][previous];
  }
  refreshBonusEligibility();
}
export function reconcileCultureSelection() {
  reconcileStageAllocation("culture");
  refreshBonusEligibility();
}

const combatStyles = () => [char.cultureSelections.combatStyle, ...char.careerCombatStyles,
  ...char.combatStyles.map(style => style.name), ...(career().combatStyle ?? []), hobbySkillName(char.hobbySkill)].filter(Boolean);
// Keep older saved specialisations renderable when their source skill is not registered.
export const skillDefinition = (n: string) => skillDef(n, combatStyles());
export const base = (n: string) => formulaVal(skillDefinition(n).f, char.chars);
export const added = (n: string) => sum((Object.keys(POOLS) as Kind[]).map(k => char.alloc[k][n] ?? 0));
export const total = (n: string) => base(n) + added(n);
export const combatStyleSummary = () => char.combatStyles.map(style => ({
  ...style,
  percentage: formulaVal(style.baseFormula, char.chars) + added(style.name),
}));
export const used = (k: Kind) => sum(Object.values(char.alloc[k]));

export function setAlloc(kind: Kind, name: string, v: number) {
  if (kind === "bonus" && !bonusEligible().includes(name)) return;
  if (kind === "career" && !resolveNativeTongue(careerSkills()).includes(name)) return;
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
  const style = char.combatStyles.find(item => item.name === name);
  if (style) {
    if (n) style.allocations[kind] = n;
    else delete style.allocations[kind];
  }
}
export function setCultureCombatStyle(value: string, definition?: CombatStyleSelection) {
  const style = value.trim();
  const previous = char.cultureSelections.combatStyle;
  if (style === previous) {
    if (definition) char.combatStyles = attachCharacterStyle(char.combatStyles, definition, "culture");
    return;
  }
  reconcileCultureCombatStyle(previous, style,
    cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), ""), char.alloc.culture);
  if (previous) char.combatStyles = detachCharacterStyle(char.combatStyles, previous, "culture");
  char.cultureSelections.combatStyle = style;
  if (style) char.combatStyles = attachCharacterStyle(char.combatStyles, definition ?? legacyCombatStyle(style, "culture"), "culture");
  char.cultureMigration = false;
  refreshBonusEligibility();
}
export function chooseCultureCombatStyle(definition: CombatStyleSelection | null) {
  const name = definition?.name ?? "";
  setCultureCombatStyle(name, definition ?? undefined);
}
export function chooseBonusCombatStyle(definition: CombatStyleSelection | null) {
  if (!definition) { clearHobbySkill(); return; }
  if (learnedSkills().includes(definition.name)) return;
  clearHobbySkill();
  char.combatStyles = attachCharacterStyle(char.combatStyles, definition, "bonus");
  char.hobbySkill = { type: "combatStyle", name: definition.name };
}
export function chooseCareerCombatStyle(slot: number, definition: CombatStyleSelection | null) {
  if (slot < 0 || slot >= (career().combatStyle?.length ?? 0)) return;
  const previous = char.careerCombatStyles[slot] ?? "";
  if (definition) {
    char.combatStyles = attachCharacterStyle(char.combatStyles, definition, "career");
    char.careerCombatStyles[slot] = definition.name;
  } else char.careerCombatStyles[slot] = "";
  if (previous && !char.careerCombatStyles.includes(previous)) char.combatStyles = detachCharacterStyle(char.combatStyles, previous, "career");
  if (previous && !careerSkills().includes(previous)) delete char.alloc.career[previous];
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
function clearHobbySkill() {
  const previous = hobbySkillName(char.hobbySkill);
  if (previous) {
    delete char.alloc.bonus[previous];
    if (char.hobbySkill?.type === "combatStyle") char.combatStyles = detachCharacterStyle(char.combatStyles, previous, "bonus");
  }
  char.hobbySkill = null;
}
export { clearHobbySkill };
export function setHobbyProfessionalSkill(template: string, specialisation = "") {
  const choice = restoreHobbySkill({ type: "professionalSkill", template, specialisation, name: "" });
  if (choice?.type !== "professionalSkill") {
    if (char.hobbySkill?.type === "professionalSkill" && char.hobbySkill.template === template) clearHobbySkill();
    return;
  }
  if (learnedSkills().includes(choice.name)) {
    if (char.hobbySkill?.type === "professionalSkill" && char.hobbySkill.template === template) clearHobbySkill();
    return;
  }
  if (hobbySkillName(char.hobbySkill) === choice.name && char.hobbySkill?.type === "professionalSkill") return;
  clearHobbySkill();
  char.hobbySkill = choice;
}
export function refreshBonusEligibility() {
  if (char.hobbySkill && learnedSkills().includes(hobbySkillName(char.hobbySkill))) clearHobbySkill();
  const eligible = new Set(bonusEligible());
  for (const name of Object.keys(char.alloc.bonus)) if (!eligible.has(name)) delete char.alloc.bonus[name];
}
export const canComplete = () => used("bonus") === bonusPool(char.ageCategory);

export function bonusEligible(): string[] {
  return [...new Set([...learnedSkills(), ...(char.hobbySkill ? [hobbySkillName(char.hobbySkill)] : [])])];
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
    ...careerSkills(), ...bonusEligible(),
    ...(Object.keys(char.alloc) as Kind[]).flatMap(x => Object.keys(char.alloc[x]))]))];
}
export function stepSkills(kind: Kind): string[] {
  if (kind === "culture") return resolveNativeTongue(cultureSkills(culture(), char.cultureSelections.standard, resolvedProfessional("culture"), char.cultureSelections.combatStyle));
  if (kind === "career") return resolveNativeTongue(careerSkills());
  return bonusEligible();
}

export { baseName };
