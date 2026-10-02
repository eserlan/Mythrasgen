/** Structured Core and campaign data for the Animism rules foundation. */
import { criticalRange, roll as rollDice } from "./calc";

export type AnimismSource = "core" | "campaign" | "custom";
export type AnimismRank = "Follower" | "Spirit Worshipper" | "Shaman" | "High Shaman";
export type SpiritAttitude = "friendly" | "neutral" | "hostile";

export interface SpiritType {
  id: string;
  name: string;
  source: AnimismSource;
  provenance?: string;
  description?: string;
}

export interface SpiritTradition {
  id: string;
  name: string;
  source: AnimismSource;
  organisationId?: string;
  description?: string;
  notes?: string;
  friendlySpiritTypeIds: string[];
  neutralSpiritTypeIds: string[];
  hostileSpiritTypeIds: string[];
  hostileTraditionIds: string[];
  startingGrants: AnimismStartingGrant[];
  rank?: AnimismRank;
  rules?: Record<string, unknown>;
  customSpiritTypes: SpiritType[];
  customSpiritTemplates: SpiritTemplate[];
}

export interface AnimismStartingGrant {
  id: string;
  kind: "spirit-type-access" | "spirit-ally" | "bound-spirit" | "campaign-benefit";
  source: string;
  spiritId?: string;
  spiritTypeId?: string;
  description?: string;
}

export interface SpiritTemplate {
  id: string;
  name: string;
  spiritTypeId: string;
  source: AnimismSource;
  provenance?: string;
  intensity?: number;
  pow?: number;
  powRange?: [number, number];
  int?: number;
  ins?: number;
  cha?: number;
  magicPoints?: number;
  spectralCombat?: number;
  willpower?: number;
  stealth?: number;
  actionPoints?: number;
  initiative?: number;
  skills?: SpiritSkill[];
  typeData?: Record<string, unknown>;
  generation?: SpiritGeneration;
  abilities?: string[];
  notes?: string;
}

export interface SpiritRecord {
  id: string;
  name: string;
  spiritTypeId: string;
  templateId?: string;
  source: AnimismSource;
  provenance?: string;
  attitude?: SpiritAttitude;
  intensity?: number;
  pow?: number;
  powRange?: [number, number];
  int?: number;
  ins?: number;
  cha?: number;
  magicPoints?: number;
  spectralCombat?: number;
  willpower?: number;
  stealth?: number;
  actionPoints?: number;
  initiative?: number;
  skills?: SpiritSkill[];
  typeData?: Record<string, unknown>;
  generation?: SpiritGeneration;
  abilities: string[];
  notes?: string;
}

export interface SpiritSkill { name: string; value: number }
export interface SpiritChoiceRequirement { id: string; count?: number; maximumCount?: number; options?: string[]; description: string }
export interface SpiritGeneration {
  method: "core-generated" | "manual" | "legacy";
  pendingChoices: SpiritChoiceRequirement[];
  rolls?: Record<string, number[]>;
}
export interface SpiritDerivedStatistics {
  magicPoints?: number;
  spectralCombat?: number;
  willpower?: number;
  stealth?: number;
  actionPoints?: number;
  initiative?: number;
}

type SpiritRoll = { dice: number; sides: number; modifier?: number };
type SpiritCharacteristicRule = SpiritRoll | "species" | "host" | "shaman" | "intensity-pow" | "same-as-ins";
export interface CoreSpiritRule {
  id: string;
  characteristics: Partial<Record<"int" | "ins" | "cha", SpiritCharacteristicRule>>;
  inherentAbilities: readonly string[];
  choices?: readonly SpiritChoiceRequirement[];
  selectableAbilities?: readonly string[];
  abilityCount?: "intensity" | "up-to-intensity" | "1d3+intensity" | "one-or-more";
}

export interface SpiritAlly {
  spiritId: string;
  attitude: SpiritAttitude;
  source: string;
  notes?: string;
}

export type SpiritBindingVessel = "fetish/object" | "place" | "creature" | "campaign-defined";
export interface SpiritBinding {
  id: string;
  spiritId: string;
  vessel: SpiritBindingVessel;
  objectName?: string;
  description?: string;
  countsAgainstCapacity: boolean;
  source: string;
  notes?: string;
}

export interface AnimismState {
  traditionId?: string;
  /** Structured link from the canonical Binding specialisation to its tradition record. */
  bindingSpecialisation?: { skillName: string; traditionId: string };
  rank?: AnimismRank;
  traditions: SpiritTradition[];
  customSpiritTypes: SpiritType[];
  spiritTemplates: SpiritTemplate[];
  spirits: SpiritRecord[];
  accessibleSpiritTypeIds: string[];
  allies: SpiritAlly[];
  bindings: SpiritBinding[];
  /** Derived warnings are recomputed on character reconciliation and never remove records. */
  reconciliationIssues: AnimismReconciliationIssue[];
}

export const CORE_SPIRIT_TYPES: readonly SpiritType[] = [
  ["ancestor", "Ancestor spirits"], ["bane", "Bane spirits"], ["curse", "Curse spirits"],
  ["death", "Death spirits"], ["elemental", "Elemental spirits"], ["guardian", "Guardian spirits"],
  ["haunt", "Haunts"], ["medicine", "Medicine spirits"], ["nature", "Nature spirits"],
  ["predator", "Predator spirits"], ["sickness", "Sickness spirits"], ["fetch", "Fetches"],
].map(([id, name]) => ({ id: `core:animism:${id}`, name, source: "core" as const }));

const choice = (id: string, description: string, options?: string[]): SpiritChoiceRequirement => ({ id, description, ...(options ? { options } : {}) });
const d = (dice: number, sides: number, modifier = 0): SpiritRoll => ({ dice, sides, ...(modifier ? { modifier } : {}) });
const FETCH_ABILITIES = ["Animate", "Autonomy", "Cannibalistic", "Comprehension", "Conjugate", "Covert", "Deadly", "Discorporate", "Domination", "Healing", "Eternal", "Mana", "Manifestation", "Perceptive", "Persistent", "Sagacity", "Shapechange", "Spellcasting", "Subjugate", "Warding"] as const;
const HAUNT_ABILITIES = ["Glamour", "Miasma", "Spellcasting", "Telekinesis", "Wither"] as const;
const ANCESTOR_ABILITIES = ["Discorporate", "Sagacity", "Spellcasting", "Subjugate"] as const;

/** Core spirit creation profiles. Characteristics marked species/host/shaman need an explicit campaign input. */
export const CORE_SPIRIT_RULES: Readonly<Record<string, CoreSpiritRule>> = {
  "core:animism:ancestor": { id: "ancestor", characteristics: { int: "species", cha: "species" }, inherentAbilities: ["Eternal"], selectableAbilities: ANCESTOR_ABILITIES, abilityCount: "1d3+intensity", choices: [choice("ancestor-species", "Use the mortal species' INT and CHA; record the deceased's species and values."), choice("ancestor-abilities", "Choose the ancestor's ability selections.", [...ANCESTOR_ABILITIES])] },
  "core:animism:bane": { id: "bane", characteristics: { ins: d(1, 6), cha: d(1, 6) }, inherentAbilities: ["Cannibalistic", "Deadly"] },
  "core:animism:curse": { id: "curse", characteristics: { ins: d(2, 6), cha: d(2, 6) }, inherentAbilities: ["Curse", "Covert", "Manifestation"], choices: [choice("curse-effects", "Choose the curse effects / conditions this spirit inflicts.")] },
  "core:animism:death": { id: "death", characteristics: { ins: d(3, 6), cha: d(3, 6) }, inherentAbilities: ["Deadly", "Manifestation"] },
  "core:animism:elemental": { id: "elemental", characteristics: {}, inherentAbilities: ["Animate", "Demesne"], choices: [choice("element", "Choose the element or natural force represented by this spirit.", ["Earth", "Air", "Fire", "Water", "Darkness", "Other natural force"])] },
  "core:animism:guardian": { id: "guardian", characteristics: { ins: d(1, 6, 6), cha: d(1, 6, 6) }, inherentAbilities: ["Warding"] },
  "core:animism:haunt": { id: "haunt", characteristics: { int: "species", cha: "species" }, inherentAbilities: ["Eternal", "Manifestation"], selectableAbilities: HAUNT_ABILITIES, abilityCount: "intensity", choices: [choice("haunt-characteristics", "Use the deceased mortal's characteristics or generate suitable values."), choice("haunt-abilities", "Select abilities equal to Intensity.", [...HAUNT_ABILITIES]), choice("haunt-anchor", "Record the place, object, or event that anchors the haunt.")] },
  "core:animism:medicine": { id: "medicine", characteristics: { ins: d(1, 6, 6), cha: d(1, 6, 6) }, inherentAbilities: ["Healing"] },
  "core:animism:nature": { id: "nature", characteristics: {}, inherentAbilities: [], selectableAbilities: ["Bless", "Demesne", "Domination", "Endowment"], abilityCount: "up-to-intensity", choices: [choice("nature-kind", "Choose the animal, plant, or region represented by this spirit.", ["animal", "regional"]), choice("nature-characteristics", "Use the associated species' characteristics, or the regional spirit's Core characteristic rolls."), choice("nature-abilities", "Choose up to Intensity abilities that express the represented species or plant-life.", ["Bless", "Demesne", "Domination", "Endowment"])] },
  "core:animism:predator": { id: "predator", characteristics: { ins: d(2, 6, 6), cha: d(1, 6, 6) }, inherentAbilities: ["Persistent", "Puppeteer"], selectableAbilities: ["Bless"], abilityCount: "intensity", choices: [choice("predator-host", "Choose and record the host creature; STR, CON, SIZ and DEX use the host's values."), choice("predator-blessings", "Choose one Bless target for each Intensity level.", ["Armour Points", "Damage Modifier", "Movement", "Other relevant attribute"])] },
  "core:animism:sickness": { id: "sickness", characteristics: { ins: d(2, 6), cha: d(2, 6) }, inherentAbilities: ["Covert", "Disease", "Manifestation"], choices: [choice("disease", "Choose the specific disease carried by this spirit.")] },
  "core:animism:fetch": { id: "fetch", characteristics: { int: "shaman", cha: "shaman" }, inherentAbilities: [], selectableAbilities: FETCH_ABILITIES, abilityCount: "1d3+intensity", choices: [choice("fetch-kind", "Choose Awakened Fetch or Allied Fetch.", ["Awakened Fetch", "Allied Fetch"]), choice("fetch-abilities", "Select or roll 1d3 + Intensity abilities.", [...FETCH_ABILITIES])] },
};

/** Combines spirit type sources by ID so keyed UI lists never receive duplicate records. */
export function listAnimismSpiritTypes(state: Pick<AnimismState, "customSpiritTypes" | "traditions">): SpiritType[] {
  const types = new Map<string, SpiritType>();
  for (const type of [...CORE_SPIRIT_TYPES, ...state.customSpiritTypes, ...state.traditions.flatMap(tradition => tradition.customSpiritTypes)]) {
    if (!types.has(type.id)) types.set(type.id, type);
  }
  return [...types.values()];
}

export const CORE_ANIMISM_RANKS: readonly AnimismRank[] = ["Follower", "Spirit Worshipper", "Shaman", "High Shaman"];
export type TranceTask = "observe" | "converse" | "project-or-draw" | "drag-souls";
export type TrancePreparation = "1 hour" | "1 minute" | "1 round" | "1 action";
export const CORE_TRANCE_PREPARATION: Readonly<Record<AnimismRank, Partial<Record<TranceTask, TrancePreparation>>>> = {
  Follower: { observe: "1 hour" },
  "Spirit Worshipper": { observe: "1 minute", converse: "1 hour" },
  Shaman: { observe: "1 round", converse: "1 minute", "project-or-draw": "1 hour" },
  "High Shaman": { observe: "1 action", converse: "1 round", "project-or-draw": "1 minute", "drag-souls": "1 hour" },
};

export interface TranceCapabilitySummary {
  canObserve: boolean;
  canConverse: boolean;
  canProjectIntoSpiritWorld: boolean;
  canDrawOrExpelSpirit: boolean;
  canDragOtherSouls: boolean;
  preparation: Partial<Record<TranceTask, TrancePreparation>>;
}

export function getTranceCapabilities(rank?: AnimismRank): TranceCapabilitySummary {
  const preparation = rank ? CORE_TRANCE_PREPARATION[rank] : {};
  return {
    canObserve: !!preparation.observe,
    canConverse: !!preparation.converse,
    canProjectIntoSpiritWorld: !!preparation["project-or-draw"],
    canDrawOrExpelSpirit: !!preparation["project-or-draw"],
    canDragOtherSouls: !!preparation["drag-souls"],
    preparation,
  };
}

export const BOUND_SPIRIT_CAPACITY_FRACTIONS: Readonly<Record<AnimismRank, number>> = {
  Follower: 1 / 4, "Spirit Worshipper": 1 / 2, Shaman: 3 / 4, "High Shaman": 1,
};

/** Mythras rounds fractions up; this is capacity only and never grants spirits. */
export function getBoundSpiritCapacity(character: { chars?: { CHA?: number }; CHA?: number }, rank?: AnimismRank): number {
  const cha = character.chars?.CHA ?? character.CHA;
  if (!Number.isFinite(cha) || !rank) return 0;
  return Math.ceil(Math.max(0, cha!) * BOUND_SPIRIT_CAPACITY_FRACTIONS[rank]);
}

export const getMaximumControllableSpiritPow = (binding: number): number => 3 * criticalRange(binding);

export interface SpiritDamageBand { min: number; max?: number; damage: string; average: number }
export const CORE_SPIRIT_DAMAGE: readonly SpiritDamageBand[] = [
  { min: 1, max: 20, damage: "1d2", average: 2 }, { min: 21, max: 40, damage: "1d4", average: 3 },
  { min: 41, max: 60, damage: "1d6", average: 4 }, { min: 61, max: 80, damage: "1d8", average: 5 },
  { min: 81, max: 100, damage: "1d10", average: 6 }, { min: 101, max: 120, damage: "2d6", average: 7 },
  { min: 121, max: 140, damage: "1d8+1d6", average: 8 }, { min: 141, max: 160, damage: "2d8", average: 9 },
  { min: 161, max: 180, damage: "1d10+1d8", average: 10 }, { min: 181, max: 200, damage: "2d10", average: 11 },
  { min: 201, max: 220, damage: "2d10+1d2", average: 13 }, { min: 221, max: 240, damage: "2d10+1d4", average: 14 },
  { min: 241, max: 260, damage: "2d10+1d6", average: 15 }, { min: 261, max: 280, damage: "2d10+1d8", average: 16 },
  { min: 281, max: 300, damage: "3d10", average: 17 },
];
export function getSpiritDamage(binding: number): string | undefined {
  const value = Number.isFinite(binding) ? Math.max(0, binding) : 0;
  if (value <= 0) return undefined;
  const band = CORE_SPIRIT_DAMAGE.find(item => value >= item.min && (item.max === undefined || value <= item.max));
  if (band) return band.damage;
  const steps = Math.floor((value - 301) / 20) + 1;
  const extraDice = Math.floor(steps / 6);
  const remainder = steps % 6;
  const base = `${3 + extraDice}d10`;
  return remainder === 0 ? base : `${base}+1d${remainder * 2}`;
}

export interface SpiritIntensityBand { intensity: number; minPow: number; maxPow: number; formula: string }
export const CORE_SPIRIT_INTENSITY: readonly SpiritIntensityBand[] = Array.from({ length: 6 }, (_, intensity) => ({
  intensity, minPow: intensity * 6 + 1, maxPow: intensity * 6 + 6, formula: intensity ? `1d6+${intensity * 6}` : "1d6",
}));
export function spiritIntensityBand(intensity: number): SpiritIntensityBand {
  const level = Math.max(0, Math.floor(Number.isFinite(intensity) ? intensity : 0));
  return CORE_SPIRIT_INTENSITY[level] ?? { intensity: level, minPow: level * 6 + 1, maxPow: level * 6 + 6, formula: `1d6+${level * 6}` };
}
/** Returns the canonical Intensity band for an exact individual spirit POW. */
export function spiritIntensityForPow(pow: number): number | undefined {
  if (!Number.isInteger(pow) || pow < 1) return undefined;
  return Math.floor((pow - 1) / 6);
}
export function spiritPowMatchesIntensity(pow: number, intensity: number): boolean {
  const band = spiritIntensityBand(intensity);
  return Number.isInteger(pow) && pow >= band.minPow && pow <= band.maxPow;
}

export function deriveSpiritStatistics(spirit: Pick<SpiritRecord, "pow" | "cha" | "ins" | "int" | "typeData">): SpiritDerivedStatistics {
  const result: SpiritDerivedStatistics = {};
  const mentalCharacteristic = spirit.int ?? spirit.ins;
  if (Number.isFinite(spirit.pow) && spirit.pow! >= 0) result.magicPoints = spirit.pow;
  if (Number.isFinite(spirit.pow) && Number.isFinite(spirit.cha)) result.spectralCombat = 50 + spirit.pow! + spirit.cha!;
  if (Number.isFinite(spirit.pow)) result.willpower = 50 + spirit.pow! * 2;
  if (Number.isFinite(spirit.pow) && Number.isFinite(mentalCharacteristic)) result.actionPoints = Math.max(1, Math.ceil((mentalCharacteristic! + spirit.pow!) / 12));
  if (Number.isFinite(mentalCharacteristic) && Number.isFinite(spirit.cha)) result.initiative = Math.ceil((mentalCharacteristic! + spirit.cha!) / 2);
  if (Number.isFinite(spirit.pow) && Number.isFinite(spirit.ins) && Number.isFinite(spirit.cha)
      && ["core:animism:curse", "core:animism:sickness", "core:animism:predator"].some(id => spirit.typeData?.ruleId === CORE_SPIRIT_RULES[id].id)) {
    result.stealth = 50 + spirit.ins! + spirit.cha!;
  }
  return result;
}
export function recalculateSpiritStatistics(spirit: SpiritRecord): SpiritDerivedStatistics {
  for (const key of ["magicPoints", "spectralCombat", "willpower", "stealth", "actionPoints", "initiative"] as const) delete spirit[key];
  const derived = deriveSpiritStatistics(spirit);
  Object.assign(spirit, derived);
  return derived;
}

export interface GenerateCoreSpiritOptions {
  id: string;
  name?: string;
  spiritTypeId: string;
  intensity: number;
  source?: AnimismSource;
  random?: () => number;
  characteristics?: Partial<Pick<SpiritRecord, "pow" | "int" | "ins" | "cha">>;
  /** Explicit values such as species, host, element, or type-specific selections. */
  typeData?: Record<string, unknown>;
  abilities?: string[];
  notes?: string;
}

/** Deterministic when a random source is supplied; unresolved GM choices remain in generation.pendingChoices. */
export function generateCoreSpirit(options: GenerateCoreSpiritOptions): SpiritRecord {
  const random = options.random ?? Math.random;
  const profile = CORE_SPIRIT_RULES[options.spiritTypeId];
  const band = spiritIntensityBand(options.intensity);
  const typeData: Record<string, unknown> = { ...(options.typeData ?? {}), ...(profile ? { ruleId: profile.id } : {}) };
  const fetchVariant = profile?.id === "fetch" ? typeData.variant : undefined;
  const alliedFetch = fetchVariant === "allied";
  const awakenedFetch = fetchVariant === "awakened";
  const fetchUnresolved = profile?.id === "fetch" && !alliedFetch && !awakenedFetch;
  const inheritedPow = Number.isFinite(typeData.pow) ? typeData.pow as number : undefined;
  const pow = options.characteristics?.pow ?? (awakenedFetch ? inheritedPow : fetchUnresolved ? undefined : rollDice(alliedFetch ? "1d6+12" : band.formula, random));
  const rolls: Record<string, number[]> = pow === undefined ? {} : { ...(options.characteristics?.pow === undefined && !awakenedFetch ? { pow: [pow] } : {}) };
  const stats: Partial<Pick<SpiritRecord, "int" | "ins" | "cha">> = {};
  const characteristics = profile?.characteristics ?? {};
  for (const key of ["int", "ins", "cha"] as const) {
    const rule = characteristics[key];
    const supplied = options.characteristics?.[key];
    if (supplied !== undefined) { stats[key] = supplied; continue; }
    if (typeof rule === "object") {
      const value = rollDice(`${rule.dice}d${rule.sides}${rule.modifier ? `+${rule.modifier}` : ""}`, random);
      stats[key] = value;
      rolls[key] = [value];
    } else if (rule === "same-as-ins" && stats.ins !== undefined) stats[key] = stats.ins;
    else if (rule === "species" && Number.isFinite(typeData[key])) stats[key] = typeData[key] as number;
    else if (rule === "host" && Number.isFinite(typeData[key])) stats[key] = typeData[key] as number;
    else if (rule === "shaman" && Number.isFinite(typeData[key])) stats[key] = typeData[key] as number;
  }
  if (typeData.variant === "regional" && profile?.id === "nature") {
    stats.ins ??= rollDice("1d6", random);
    stats.cha ??= rollDice("3d6", random);
    rolls.ins ??= [stats.ins]; rolls.cha ??= [stats.cha];
  }
  if (profile?.id === "nature" && typeData.variant !== "regional") {
    if (stats.ins === undefined && Number.isFinite(typeData.ins)) stats.ins = typeData.ins as number;
    if (stats.cha === undefined && stats.ins !== undefined) stats.cha = stats.ins;
  }
  if (alliedFetch) {
    stats.int ??= rollDice("2d6+6", random);
    stats.cha ??= rollDice("2d6+6", random);
    if (options.characteristics?.pow === undefined && pow !== undefined) rolls.pow = [pow];
  }
  if (awakenedFetch) {
    stats.int ??= Number.isFinite(typeData.int) ? typeData.int as number : undefined;
    stats.cha ??= Number.isFinite(typeData.cha) ? typeData.cha as number : undefined;
  }
  const exactPow = rolls.pow?.at(-1) ?? pow;
  const exactIntensity = alliedFetch || awakenedFetch ? (exactPow === undefined ? undefined : spiritIntensityForPow(exactPow)) : fetchUnresolved ? undefined : options.intensity;
  const knownSelections = options.abilities ?? [];
  const abilityCountRoll = profile?.abilityCount === "1d3+intensity" && exactIntensity !== undefined ? 1 + Math.floor(random() * 3) + exactIntensity
    : (profile?.abilityCount === "intensity" || profile?.abilityCount === "up-to-intensity") ? exactIntensity : undefined;
  if (abilityCountRoll !== undefined) rolls.abilityCount = [abilityCountRoll];
  const choiceRequirements = [...(profile?.choices ?? [])];
  if (profile?.id === "ancestor" && knownSelections.some(value => ["Sagacity", "Spellcasting", "Subjugate"].includes(value))) {
    choiceRequirements.push(choice("ancestor-ability-details", "Record the Sagacity skill, known Folk Magic spells, or lesser-Intensity ally for each selected ability."));
  }
  if (profile?.id === "nature" && knownSelections.some(value => ["Bless", "Endowment"].includes(value))) {
    choiceRequirements.push(choice("nature-ability-details", "Record the Attribute or Skill blessed, or the creature trait granted, for each selected ability."));
  }
  if (profile?.id === "predator" && knownSelections.includes("Bless")) {
    choiceRequirements.push(choice("predator-bless-targets", "Record the Attribute or creature value targeted by each Bless."));
  }
  if (profile?.id === "haunt" && knownSelections.includes("Spellcasting")) {
    choiceRequirements.push(choice("haunt-spells", "Record retained Folk Magic or the spells selected for this haunt."));
  }
  const pendingChoices = choiceRequirements.filter(item => {
    if (item.id.endsWith("abilities") || item.id.endsWith("blessings")) {
      return profile?.abilityCount === "up-to-intensity" ? knownSelections.length === 0 : knownSelections.length < (abilityCountRoll ?? 1);
    }
    if (item.id === "ancestor-species" || item.id === "haunt-characteristics") return !(typeData.species && stats.int !== undefined && stats.cha !== undefined);
    if (item.id === "nature-characteristics") return typeData.variant !== "regional" && !(typeData.species && stats.ins !== undefined && stats.cha !== undefined);
    if (item.id === "predator-host") return !typeData.host;
    if (item.id === "fetch-kind") return typeData.variant !== "awakened" && typeData.variant !== "allied";
    if (item.id.endsWith("ability-details") || item.id.endsWith("bless-targets") || item.id === "haunt-spells") return !Array.isArray(typeData.abilityDetails) || !typeData.abilityDetails.length;
    return typeData[item.id] === undefined && !strings(typeData.completedChoices).includes(item.id);
  }).map(item => ({ ...item, ...(item.id.endsWith("abilities") || item.id.endsWith("blessings")
    ? (profile?.abilityCount === "up-to-intensity" ? { maximumCount: abilityCountRoll } : { count: abilityCountRoll }) : {}) }));
  const allAbilities = [...(profile?.inherentAbilities ?? []), ...knownSelections];
  const spirit: SpiritRecord = {
    id: options.id, name: options.name ?? "", spiritTypeId: options.spiritTypeId, source: options.source ?? "core",
    ...(exactIntensity !== undefined ? { intensity: exactIntensity } : {}), ...(exactPow !== undefined ? { pow: exactPow } : {}), ...stats, abilities: allAbilities,
    typeData, generation: { method: "core-generated", pendingChoices, rolls },
    ...(options.notes ? { notes: options.notes } : {}),
  };
  recalculateSpiritStatistics(spirit);
  return spirit;
}

export interface SpiritValidationIssue { code: string; message: string }
export function validateSpirit(spirit: Pick<SpiritRecord, "spiritTypeId" | "intensity" | "pow" | "int" | "ins" | "cha" | "abilities" | "typeData" | "generation">): SpiritValidationIssue[] {
  const issues: SpiritValidationIssue[] = [];
  if (spirit.intensity === undefined) issues.push({ code: "missing-intensity", message: "Intensity is required for this spirit." });
  if (spirit.intensity !== undefined && (!Number.isInteger(spirit.intensity) || spirit.intensity < 0)) issues.push({ code: "invalid-intensity", message: "Intensity must be a non-negative integer." });
  if (spirit.pow === undefined) issues.push({ code: "missing-pow", message: "POW is required for this spirit." });
  if (spirit.pow !== undefined && (!Number.isInteger(spirit.pow) || spirit.pow < 1)) issues.push({ code: "invalid-pow", message: "POW must be a positive integer." });
  if (spirit.pow !== undefined && spirit.intensity !== undefined && !spiritPowMatchesIntensity(spirit.pow, spirit.intensity)) issues.push({ code: "intensity-pow-mismatch", message: `POW ${spirit.pow} is outside the range for Intensity ${spirit.intensity}.` });
  const profile = CORE_SPIRIT_RULES[spirit.spiritTypeId];
  if (!profile) return issues;
  for (const key of ["int", "ins", "cha"] as const) {
    const rule = profile.characteristics[key];
    const value = spirit[key];
    if (rule && value === undefined) issues.push({ code: `missing-${key}`, message: `${key.toUpperCase()} is required for this spirit type.` });
    if (value !== undefined && (!Number.isInteger(value) || value < (typeof rule === "object" ? rule.dice + (rule.modifier ?? 0) : 1) || (typeof rule === "object" && value > rule.dice * rule.sides + (rule.modifier ?? 0)))) issues.push({ code: `invalid-${key}`, message: `${key.toUpperCase()} is outside the allowed range for this spirit type.` });
  }
  if (profile.id === "nature") {
    if (!spirit.typeData?.species && spirit.typeData?.variant !== "regional") issues.push({ code: "missing-nature-species", message: "Choose the nature spirit's animal, plant, or region." });
    if (spirit.typeData?.variant === "regional") {
      if (spirit.ins !== undefined && (spirit.ins < 1 || spirit.ins > 6)) issues.push({ code: "invalid-ins", message: "Regional nature spirit INS must be 1d6." });
      if (spirit.cha !== undefined && (spirit.cha < 3 || spirit.cha > 18)) issues.push({ code: "invalid-cha", message: "Regional nature spirit CHA must be 3d6." });
    } else if (spirit.ins !== undefined && spirit.cha !== undefined && spirit.cha !== spirit.ins) {
      issues.push({ code: "nature-cha-mismatch", message: "An animal nature spirit's CHA equals its INS." });
    }
  }
  if (profile.id === "predator" && !spirit.typeData?.host) issues.push({ code: "missing-host", message: "Choose the predator spirit's host creature." });
  const selectable = new Set(profile.selectableAbilities ?? []);
  for (const ability of spirit.abilities) if (!selectable.has(ability) && !profile.inherentAbilities.includes(ability)) issues.push({ code: "incompatible-ability", message: `${ability} is not an ability choice for this spirit type.` });
  for (const ability of profile.inherentAbilities) if (!spirit.abilities.includes(ability)) issues.push({ code: "missing-inherent-ability", message: `${ability} is required for this spirit type.` });
  const selectedAbilityCount = spirit.abilities.filter(ability => selectable.has(ability)).length;
  const rolledAbilityCount = spirit.generation?.rolls?.abilityCount?.[0];
  if (profile.abilityCount === "intensity" && spirit.intensity !== undefined && selectedAbilityCount !== spirit.intensity) {
    issues.push({ code: "ability-count", message: `Select ${spirit.intensity} abilities for this spirit's Intensity.` });
  } else if (profile.abilityCount === "1d3+intensity" && spirit.intensity !== undefined) {
    const min = spirit.intensity + 1;
    const max = spirit.intensity + 3;
    if (rolledAbilityCount !== undefined ? selectedAbilityCount !== rolledAbilityCount : selectedAbilityCount < min || selectedAbilityCount > max) {
      issues.push({ code: "ability-count", message: rolledAbilityCount !== undefined ? `Select ${rolledAbilityCount} abilities.` : `Select between ${min} and ${max} abilities.` });
    }
  } else if (profile.abilityCount === "up-to-intensity" && spirit.intensity !== undefined && selectedAbilityCount > spirit.intensity) {
    issues.push({ code: "ability-count", message: `Nature spirits cannot have more than ${spirit.intensity} selectable abilities.` });
  }
  return issues;
}

export const emptyAnimismState = (): AnimismState => ({ traditions: [], customSpiritTypes: [], spiritTemplates: [], spirits: [], accessibleSpiritTypeIds: [], allies: [], bindings: [], reconciliationIssues: [] });

const record = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
const source = (value: unknown): AnimismSource => value === "core" || value === "campaign" ? value : "custom";
function normalizeSpiritType(value: unknown): SpiritType | null {
  const item = record(value);
  return item && typeof item.id === "string" && typeof item.name === "string"
    ? { id: item.id, name: item.name, source: source(item.source), ...(typeof item.provenance === "string" ? { provenance: item.provenance } : {}), ...(typeof item.description === "string" ? { description: item.description } : {}) } : null;
}
function normalizeTemplate(value: unknown): SpiritTemplate | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.spiritTypeId !== "string") return null;
  return { id: item.id, name: item.name, spiritTypeId: item.spiritTypeId, source: source(item.source), ...(typeof item.provenance === "string" ? { provenance: item.provenance } : {}),
    ...(["intensity", "pow", "int", "ins", "cha", "magicPoints", "spectralCombat", "willpower", "stealth", "actionPoints", "initiative"].reduce((out, key) => { if (typeof item[key] === "number" && Number.isFinite(item[key])) out[key] = item[key] as number; return out; }, {} as Record<string, number>)),
    ...(Array.isArray(item.powRange) && item.powRange.length === 2 && item.powRange.every(Number.isFinite) ? { powRange: item.powRange as [number, number] } : {}),
    ...(strings(item.abilities).length ? { abilities: strings(item.abilities) } : {}),
    ...(Array.isArray(item.skills) ? { skills: item.skills.flatMap(skill => { const data = record(skill); return data && typeof data.name === "string" && Number.isFinite(data.value) ? [{ name: data.name, value: data.value as number }] : []; }) } : {}),
    ...(record(item.typeData) ? { typeData: record(item.typeData) } : {}), ...(normalizeGeneration(item.generation) ? { generation: normalizeGeneration(item.generation)! } : {}),
    ...(typeof item.notes === "string" ? { notes: item.notes } : {}) };
}
function normalizeGeneration(value: unknown): SpiritGeneration | undefined {
  const item = record(value);
  if (!item || !["core-generated", "manual", "legacy"].includes(item.method as string)) return undefined;
  const pendingChoices = Array.isArray(item.pendingChoices) ? item.pendingChoices.flatMap(choiceValue => {
    const pending = record(choiceValue);
    if (!pending || typeof pending.id !== "string" || typeof pending.description !== "string") return [];
    return [{ id: pending.id, description: pending.description, ...(Number.isInteger(pending.count) ? { count: pending.count as number } : {}), ...(Number.isInteger(pending.maximumCount) ? { maximumCount: pending.maximumCount as number } : {}), ...(strings(pending.options).length ? { options: strings(pending.options) } : {}) }];
  }) : [];
  const rolls = record(item.rolls);
  return { method: item.method as SpiritGeneration["method"], pendingChoices, ...(rolls ? { rolls: Object.fromEntries(Object.entries(rolls).flatMap(([key, values]) => Array.isArray(values) && values.every(Number.isFinite) ? [[key, values as number[]]] : [])) } : {}) };
}
function normalizeSpirit(value: unknown): SpiritRecord | null {
  const item = normalizeTemplate(value);
  if (!item) return null;
  const data = record(value)!;
  const attitude = data.attitude === "friendly" || data.attitude === "neutral" || data.attitude === "hostile" ? data.attitude : undefined;
  const profile = CORE_SPIRIT_RULES[item.spiritTypeId];
  const pendingChoices = profile?.choices?.map(requirement => ({ ...requirement })) ?? [];
  const spirit: SpiritRecord = { ...item, ...(typeof data.templateId === "string" ? { templateId: data.templateId } : {}), ...(attitude ? { attitude } : {}), abilities: item.abilities ?? [],
    ...(profile ? { typeData: { ruleId: profile.id, ...(item.typeData ?? {}) } } : {}),
    generation: item.generation ?? { method: "legacy", pendingChoices: [{ id: "legacy-spirit-details", description: "Review this migrated spirit's type-specific characteristics, derived values, and abilities; no missing values were fabricated." }, ...pendingChoices] }, };
  recalculateSpiritStatistics(spirit);
  return spirit;
}
function normalizeTradition(value: unknown): SpiritTradition | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string") return null;
  const rank = CORE_ANIMISM_RANKS.includes(item.rank as AnimismRank) ? item.rank as AnimismRank : undefined;
  return { id: item.id, name: item.name, source: source(item.source),
    ...(typeof item.organisationId === "string" ? { organisationId: item.organisationId } : {}),
    ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
    friendlySpiritTypeIds: strings(item.friendlySpiritTypeIds), neutralSpiritTypeIds: strings(item.neutralSpiritTypeIds), hostileSpiritTypeIds: strings(item.hostileSpiritTypeIds),
    hostileTraditionIds: strings(item.hostileTraditionIds), startingGrants: Array.isArray(item.startingGrants) ? item.startingGrants.flatMap(grant => {
      const data = record(grant); if (!data || typeof data.id !== "string" || typeof data.kind !== "string" || typeof data.source !== "string") return [];
      if (!["spirit-type-access", "spirit-ally", "bound-spirit", "campaign-benefit"].includes(data.kind)) return [];
      return [{ id: data.id, kind: data.kind as AnimismStartingGrant["kind"], source: data.source, ...(typeof data.spiritId === "string" ? { spiritId: data.spiritId } : {}), ...(typeof data.spiritTypeId === "string" ? { spiritTypeId: data.spiritTypeId } : {}), ...(typeof data.description === "string" ? { description: data.description } : {}) }];
    }) : [], ...(rank ? { rank } : {}), ...(record(item.rules) ? { rules: record(item.rules) } : {}),
    customSpiritTypes: Array.isArray(item.customSpiritTypes) ? item.customSpiritTypes.map(normalizeSpiritType).filter((v): v is SpiritType => !!v) : [],
    customSpiritTemplates: Array.isArray(item.customSpiritTemplates) ? item.customSpiritTemplates.map(normalizeTemplate).filter((v): v is SpiritTemplate => !!v) : [] };
}

export function normalizeAnimismState(value: unknown): AnimismState {
  const item = record(value);
  if (!item) return emptyAnimismState();
  const rank = CORE_ANIMISM_RANKS.includes(item.rank as AnimismRank) ? item.rank as AnimismRank : undefined;
  const traditions = Array.isArray(item.traditions) ? item.traditions.map(normalizeTradition).filter((v): v is SpiritTradition => !!v) : [];
  const spirits = Array.isArray(item.spirits) ? item.spirits.map(normalizeSpirit).filter((v): v is SpiritRecord => !!v) : [];
  const bindingSpecialisation = record(item.bindingSpecialisation);
  return { ...(typeof item.traditionId === "string" ? { traditionId: item.traditionId } : {}),
    ...(bindingSpecialisation && typeof bindingSpecialisation.skillName === "string" && typeof bindingSpecialisation.traditionId === "string"
      ? { bindingSpecialisation: { skillName: bindingSpecialisation.skillName, traditionId: bindingSpecialisation.traditionId } } : {}),
    ...(rank ? { rank } : {}), traditions,
    customSpiritTypes: Array.isArray(item.customSpiritTypes) ? item.customSpiritTypes.map(normalizeSpiritType).filter((v): v is SpiritType => !!v) : [],
    spiritTemplates: Array.isArray(item.spiritTemplates) ? item.spiritTemplates.map(normalizeTemplate).filter((v): v is SpiritTemplate => !!v) : [], spirits,
    accessibleSpiritTypeIds: strings(item.accessibleSpiritTypeIds),
    allies: Array.isArray(item.allies) ? item.allies.flatMap(ally => { const a = record(ally); return a && typeof a.spiritId === "string" && typeof a.source === "string" && (a.attitude === "friendly" || a.attitude === "neutral" || a.attitude === "hostile") ? [{ spiritId: a.spiritId, attitude: a.attitude, source: a.source, ...(typeof a.notes === "string" ? { notes: a.notes } : {}) }] : []; }) : [],
    bindings: Array.isArray(item.bindings) ? item.bindings.flatMap(binding => { const b = record(binding); return b && typeof b.id === "string" && typeof b.spiritId === "string" && typeof b.source === "string" && ["fetish/object", "place", "creature", "campaign-defined"].includes(b.vessel as string) ? [{ id: b.id, spiritId: b.spiritId, vessel: b.vessel as SpiritBindingVessel, countsAgainstCapacity: b.countsAgainstCapacity !== false, source: b.source, ...(typeof b.objectName === "string" ? { objectName: b.objectName } : {}), ...(typeof b.description === "string" ? { description: b.description } : {}), ...(typeof b.notes === "string" ? { notes: b.notes } : {}) }] : []; }) : [],
    reconciliationIssues: Array.isArray(item.reconciliationIssues) ? item.reconciliationIssues.flatMap(issue => {
      const data = record(issue);
      if (!data || !["over-capacity", "unavailable-spirit-type", "missing-bound-spirit", "exceeds-binding-limit", "unresolved-spirit-pow", "intensity-pow-mismatch"].includes(data.code as string) || typeof data.message !== "string") return [];
      return [{ code: data.code as AnimismReconciliationIssue["code"], message: data.message, ...(typeof data.spiritId === "string" ? { spiritId: data.spiritId } : {}) }];
    }) : [],
  };
}

export interface AnimismReconciliationIssue { code: "over-capacity" | "unavailable-spirit-type" | "missing-bound-spirit" | "exceeds-binding-limit" | "unresolved-spirit-pow" | "intensity-pow-mismatch"; spiritId?: string; message: string }
export function reconcileAnimism(state: AnimismState, rank: AnimismRank | undefined, cha: number, traditionId?: string, bindingValue?: number): AnimismReconciliationIssue[] {
  if (traditionId !== undefined) state.traditionId = traditionId;
  const tradition = state.traditions.find(entry => entry.id === state.traditionId);
  const effectiveRank = rank ?? state.rank ?? tradition?.rank;
  if (effectiveRank) state.rank = effectiveRank;
  else delete state.rank;
  const capacity = getBoundSpiritCapacity({ CHA: cha }, effectiveRank);
  const bound = state.bindings.filter(binding => binding.countsAgainstCapacity);
  const issues: AnimismReconciliationIssue[] = [];
  if (bound.length > capacity) issues.push({ code: "over-capacity", message: `${bound.length} bound spirits count against capacity ${capacity}; resolve without deleting bindings.` });
  const maximumPow = Number.isFinite(bindingValue) ? getMaximumControllableSpiritPow(bindingValue!) : undefined;
  for (const binding of state.bindings) {
    const spirit = state.spirits.find(item => item.id === binding.spiritId);
    if (!spirit) continue;
    if (spirit.pow === undefined) issues.push({ code: "unresolved-spirit-pow", spiritId: spirit.id, message: `${spirit.name} has no exact POW recorded; choose a POW within its Intensity band to validate this binding. The binding is preserved.` });
    else if (maximumPow !== undefined && spirit.pow > maximumPow) issues.push({ code: "exceeds-binding-limit", spiritId: spirit.id, message: `${spirit.name} has POW ${spirit.pow}, exceeding the current Spirit Control Limit (POW ${maximumPow}); the binding is preserved.` });
  }
  const available = new Set(tradition
    ? [...tradition.friendlySpiritTypeIds, ...tradition.neutralSpiritTypeIds, ...tradition.hostileSpiritTypeIds]
    : state.accessibleSpiritTypeIds);
  for (const spirit of state.spirits) {
    recalculateSpiritStatistics(spirit);
    if (spirit.pow !== undefined && spirit.intensity !== undefined && !spiritPowMatchesIntensity(spirit.pow, spirit.intensity)) {
      issues.push({ code: "intensity-pow-mismatch", spiritId: spirit.id, message: `${spirit.name} has POW ${spirit.pow}, outside the POW ${spiritIntensityBand(spirit.intensity).minPow}–${spiritIntensityBand(spirit.intensity).maxPow} range for Intensity ${spirit.intensity}; the spirit is preserved.` });
    }
    if ((tradition || state.accessibleSpiritTypeIds.length > 0) && !available.has(spirit.spiritTypeId)) issues.push({ code: "unavailable-spirit-type", spiritId: spirit.id, message: `Spirit type ${spirit.spiritTypeId} is not listed by the current tradition; the spirit is preserved.` });
  }
  const ids = new Set(state.spirits.map(spirit => spirit.id));
  for (const binding of state.bindings) if (!ids.has(binding.spiritId)) issues.push({ code: "missing-bound-spirit", spiritId: binding.spiritId, message: `Binding ${binding.id} refers to a spirit record that is missing; binding is preserved.` });
  state.reconciliationIssues = issues;
  return issues;
}

export const animismAccessGuidelines = { friendlyTypes: "1d3+3", neutralTypes: "1d3", requireHostileTradition: true } as const;
