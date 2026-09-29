/** Structured Core and campaign data for the Animism rules foundation. */
import { criticalRange } from "./calc";

export type AnimismSource = "core" | "campaign" | "custom";
export type AnimismRank = "Follower" | "Spirit Worshipper" | "Shaman" | "High Shaman";
export type SpiritAttitude = "friendly" | "neutral" | "hostile";

export interface SpiritType {
  id: string;
  name: string;
  source: AnimismSource;
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
  intensity?: number;
  pow?: number;
  powRange?: [number, number];
  int?: number;
  ins?: number;
  cha?: number;
  magicPoints?: number;
  spectralCombat?: number;
  abilities?: string[];
  notes?: string;
}

export interface SpiritRecord {
  id: string;
  name: string;
  spiritTypeId: string;
  templateId?: string;
  source: AnimismSource;
  attitude?: SpiritAttitude;
  intensity?: number;
  pow?: number;
  powRange?: [number, number];
  int?: number;
  ins?: number;
  cha?: number;
  magicPoints?: number;
  spectralCombat?: number;
  abilities: string[];
  notes?: string;
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

export const emptyAnimismState = (): AnimismState => ({ traditions: [], customSpiritTypes: [], spiritTemplates: [], spirits: [], accessibleSpiritTypeIds: [], allies: [], bindings: [], reconciliationIssues: [] });

const record = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
const source = (value: unknown): AnimismSource => value === "core" || value === "campaign" ? value : "custom";
function normalizeSpiritType(value: unknown): SpiritType | null {
  const item = record(value);
  return item && typeof item.id === "string" && typeof item.name === "string"
    ? { id: item.id, name: item.name, source: source(item.source), ...(typeof item.description === "string" ? { description: item.description } : {}) } : null;
}
function normalizeTemplate(value: unknown): SpiritTemplate | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.spiritTypeId !== "string") return null;
  return { id: item.id, name: item.name, spiritTypeId: item.spiritTypeId, source: source(item.source),
    ...(["intensity", "pow", "int", "ins", "cha", "magicPoints", "spectralCombat"].reduce((out, key) => { if (typeof item[key] === "number" && Number.isFinite(item[key])) out[key] = item[key] as number; return out; }, {} as Record<string, number>)),
    ...(Array.isArray(item.powRange) && item.powRange.length === 2 && item.powRange.every(Number.isFinite) ? { powRange: item.powRange as [number, number] } : {}),
    ...(strings(item.abilities).length ? { abilities: strings(item.abilities) } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}) };
}
function normalizeSpirit(value: unknown): SpiritRecord | null {
  const item = normalizeTemplate(value);
  if (!item) return null;
  const data = record(value)!;
  const attitude = data.attitude === "friendly" || data.attitude === "neutral" || data.attitude === "hostile" ? data.attitude : undefined;
  return { ...item, ...(typeof data.templateId === "string" ? { templateId: data.templateId } : {}), ...(attitude ? { attitude } : {}), abilities: item.abilities ?? [] };
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
      if (!data || !["over-capacity", "unavailable-spirit-type", "missing-bound-spirit", "exceeds-binding-limit"].includes(data.code as string) || typeof data.message !== "string") return [];
      return [{ code: data.code as AnimismReconciliationIssue["code"], message: data.message, ...(typeof data.spiritId === "string" ? { spiritId: data.spiritId } : {}) }];
    }) : [],
  };
}

export interface AnimismReconciliationIssue { code: "over-capacity" | "unavailable-spirit-type" | "missing-bound-spirit" | "exceeds-binding-limit"; spiritId?: string; message: string }
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
  if (Number.isFinite(bindingValue)) {
    const maximumPow = getMaximumControllableSpiritPow(bindingValue!);
    for (const binding of bound) {
      const spirit = state.spirits.find(item => item.id === binding.spiritId);
      if (spirit?.pow !== undefined && spirit.pow > maximumPow) issues.push({ code: "exceeds-binding-limit", spiritId: spirit.id, message: `Spirit POW ${spirit.pow} exceeds current Binding control limit ${maximumPow}; binding is preserved.` });
    }
  }
  const available = new Set(tradition
    ? [...tradition.friendlySpiritTypeIds, ...tradition.neutralSpiritTypeIds, ...tradition.hostileSpiritTypeIds]
    : state.accessibleSpiritTypeIds);
  for (const spirit of state.spirits) {
    if ((tradition || state.accessibleSpiritTypeIds.length > 0) && !available.has(spirit.spiritTypeId)) issues.push({ code: "unavailable-spirit-type", spiritId: spirit.id, message: `Spirit type ${spirit.spiritTypeId} is not listed by the current tradition; the spirit is preserved.` });
  }
  const ids = new Set(state.spirits.map(spirit => spirit.id));
  for (const binding of state.bindings) if (!ids.has(binding.spiritId)) issues.push({ code: "missing-bound-spirit", spiritId: binding.spiritId, message: `Binding ${binding.id} refers to a spirit record that is missing; binding is preserved.` });
  state.reconciliationIssues = issues;
  return issues;
}

export const animismAccessGuidelines = { friendlyTypes: "1d3+3", neutralTypes: "1d3", requireHostileTradition: true } as const;
