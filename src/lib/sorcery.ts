/** Core Sorcery rules data and per-character Sorcery configuration. */
export type SorcerySource = "core" | "campaign" | "custom";
export type ShapingComponent = "Combine" | "Duration" | "Magnitude" | "Range" | "Targets" | "Ablation" | "Focus" | "Fortune" | "Precision" | "Swiftness";

export interface SorcerySpell {
  id: string;
  name: string;
  source: SorcerySource;
  /** Canonical family and subject are kept separately for specialised spells. */
  baseFamily?: string;
  specialisation?: { kind: "subject" | "form"; value: string };
  description?: string;
  notes?: string;
}

export interface SorceryShapingRules {
  addComponents?: ShapingComponent[];
  removeComponents?: ShapingComponent[];
  metadata?: Record<string, unknown>;
}

export interface SorcerySchool {
  id: string;
  name: string;
  source: SorcerySource;
  spellIds: string[];
  organisationId?: string;
  sourceDescription?: string;
  notes?: string;
  shapingRules?: SorceryShapingRules;
}

export interface SorceryOrder {
  id: string;
  name: string;
  source: SorcerySource;
  spellIds: string[];
  notes?: string;
}

export interface SorceryKnownSpell {
  spellId: string;
  sourceDescription?: string;
  acquiredFrom?: string;
  starting?: boolean;
  notes?: string;
}

/** A character's way of accessing a School, independent of the School and any Order. */
export interface SorcerySchoolAccess {
  schoolId: string;
  sourceType?: string;
  sourceDescription?: string;
  organisationId?: string;
}

export interface SorceryState {
  /** Acquired Schools can grow over the character's lifetime. */
  schoolIds: string[];
  startingSchoolId?: string;
  schoolAccess: SorcerySchoolAccess[];
  /** Undefined means use the union of learned School pools; an array is an explicit restriction. */
  availableSpellIds?: string[];
  knownSpells: SorceryKnownSpell[];
  customSchools: SorcerySchool[];
  customSpells: SorcerySpell[];
  /** Campaign/order/rank rules may narrow availability independently of School contents. */
  organisationAvailability?: Record<string, string[]>;
  /** Per-character effective Shaping overrides; catalogue rules are never mutated. */
  shapingRules?: SorceryShapingRules;
}

export interface SorceryStartingEntitlement {
  active: boolean;
  invocationValue: number;
  count: number;
  rule: "one spell per 20% or part thereof";
}

export interface SorceryDerivedStatistics {
  intensity: number;
  shapingPoints: number;
  memorisedSpellCapacity: number;
}

export const CORE_SHAPING_COMPONENTS: readonly ShapingComponent[] = ["Combine", "Duration", "Magnitude", "Range", "Targets"];
export const OPTIONAL_SHAPING_COMPONENTS: readonly ShapingComponent[] = ["Ablation", "Focus", "Fortune", "Precision", "Swiftness"];

const spellKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const spell = (family: string, specialisation?: string, kind: "subject" | "form" = "subject"): SorcerySpell => ({
  id: `core:sorcery:${spellKey(family)}${specialisation ? `:${spellKey(specialisation)}` : ""}`,
  name: specialisation ? `${family} (${specialisation})` : family,
  source: "core",
  baseFamily: family,
  ...(specialisation ? { specialisation: { kind, value: specialisation } } : {}),
});

type CoreSpellRow = [family: string, specialisation?: string, kind?: "subject" | "form"];
const coreSpellRows: CoreSpellRow[] = [
  ["Abjure"], ["Abjure", "Decay"], ["Abjure", "Process"], ["Abjure", "Substance"],
  ["Animate", "Darkness"], ["Attract Missile"], ["Banish"], ["Bypass Armour"], ["Castback"],
  ["Damage Enhancement"], ["Damage Resistance"], ["Diminish"], ["Diminish", "Characteristic"],
  ["Dominate"], ["Dominate", "Creatures"], ["Dominate", "Reptiles"], ["Dominate", "Undead"],
  ["Draw", "Creatures"], ["Enlarge"], ["Enslave", "Creatures"], ["Enhance"], ["Enhance", "Characteristic"],
  ["Evoke", "Entity"], ["Fly"], ["Haste"], ["Holdfast"], ["Imprison"], ["Intuition"],
  ["Mystic", "Sense"], ["Neutralise Magic"], ["Palsy"], ["Perceive", "Sense"], ["Phantom", "Sense"],
  ["Project", "Sense"], ["Protective Ward"], ["Regenerate"], ["Repulse", "Vermin"], ["Revivify"],
  ["Sculpt", "Darkness"], ["Sculpt", "Substance"], ["Sense", "Knowledge"], ["Shapechange"],
  ["Shapechange", "Creature", "form"], ["Shrink"], ["Smother"], ["Spirit Resistance"], ["Spell Resistance"],
  ["Switch Body"], ["Tap", "Characteristic"], ["Teleport"], ["Teleport", "via Shadows"], ["Telepathy"],
  ["Transmogrify"], ["Transmogrify", "to Substance", "form"], ["Transfer Wound"], ["Trap Soul"],
  ["Undeath"], ["Wrack"], ["Wrack", "Darkness"],
];

export const CORE_SORCERY_SPELLS: readonly SorcerySpell[] = coreSpellRows.map(([family, subject, kind]) => spell(family, subject, kind));
const coreSpellId = (family: string, subject?: string) => `core:sorcery:${spellKey(family)}${subject ? `:${spellKey(subject)}` : ""}`;
const school = (id: string, name: string, spellIds: string[]): SorcerySchool => ({ id: `core:${id}`, name, source: "core", spellIds });

export const CORE_SORCERY_SCHOOLS: readonly SorcerySchool[] = [
  school("school:stygian-path", "Stygian Path", [
    coreSpellId("Animate", "Darkness"), coreSpellId("Dominate", "Reptiles"), coreSpellId("Palsy"),
    coreSpellId("Sculpt", "Darkness"), coreSpellId("Smother"), coreSpellId("Teleport", "via Shadows"), coreSpellId("Wrack", "Darkness"),
  ]),
  school("school:masters-of-metamorphosis", "Masters of Metamorphosis", [
    coreSpellId("Abjure"), coreSpellId("Diminish"), coreSpellId("Enhance"), coreSpellId("Haste"),
    coreSpellId("Regenerate"), coreSpellId("Shapechange"), coreSpellId("Transmogrify"),
  ]),
];

const order = (id: string, name: string, entries: [string, string?][]): SorceryOrder => ({
  id: `core:order:${id}`, name, source: "core", spellIds: entries.map(([family, subject]) => coreSpellId(family, subject)),
});
export const CORE_SORCERY_ORDERS: readonly SorceryOrder[] = [
  order("military", "Military Order", [["Attract Missile"], ["Bypass Armour"], ["Damage Enhancement"], ["Damage Resistance"], ["Haste"], ["Protective Ward"], ["Transfer Wound"]]),
  order("necromantic", "Necromantic Order", [["Abjure", "Decay"], ["Dominate", "Undead"], ["Revivify"], ["Spirit Resistance"], ["Transfer Wound"], ["Trap Soul"], ["Undeath"]]),
  order("alchemical", "Alchemical Order", [["Diminish", "Characteristic"], ["Enlarge"], ["Holdfast"], ["Neutralise Magic"], ["Sculpt", "Substance"], ["Shrink"], ["Transmogrify", "to Substance"]]),
  order("scholastic", "Scholastic Order", [["Abjure", "Process"], ["Intuition"], ["Mystic", "Sense"], ["Neutralise Magic"], ["Perceive", "Sense"], ["Project", "Sense"], ["Sense", "Knowledge"]]),
  order("hermetic", "Hermetic Order", [["Abjure", "Substance"], ["Banish"], ["Damage Resistance"], ["Mystic", "Sense"], ["Protective Ward"], ["Spirit Resistance"], ["Spell Resistance"]]),
  order("dark-forces", "Dark Forces Order", [["Castback"], ["Enslave", "Creatures"], ["Evoke", "Entity"], ["Imprison"], ["Smother"], ["Tap", "Characteristic"], ["Wrack"]]),
  order("communication", "Communication Order", [["Fly"], ["Haste"], ["Intuition"], ["Phantom", "Sense"], ["Project", "Sense"], ["Telepathy"], ["Teleport"]]),
  order("medical", "Medical Order", [["Abjure"], ["Damage Resistance"], ["Neutralise Magic"], ["Palsy"], ["Regenerate"], ["Repulse", "Vermin"], ["Transfer Wound"]]),
  order("transmutation", "Transmutation Order", [["Dominate", "Creatures"], ["Draw", "Creatures"], ["Enhance", "Characteristic"], ["Haste"], ["Perceive", "Sense"], ["Shapechange", "Creature"], ["Switch Body"]]),
];

export const emptySorceryState = (): SorceryState => ({ schoolIds: [], schoolAccess: [], knownSpells: [], customSchools: [], customSpells: [] });

const record = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const sourceTypes = new Set<SorcerySource>(["core", "campaign", "custom"]);
const validComponents = new Set<ShapingComponent>([...CORE_SHAPING_COMPONENTS, ...OPTIONAL_SHAPING_COMPONENTS]);
function normalizeShapingRules(value: unknown): SorceryShapingRules | undefined {
  const item = record(value);
  if (!item) return undefined;
  const metadata = record(item.metadata);
  const addComponents = Array.isArray(item.addComponents) ? item.addComponents.filter((component): component is ShapingComponent => validComponents.has(component as ShapingComponent)) : [];
  const removeComponents = Array.isArray(item.removeComponents) ? item.removeComponents.filter((component): component is ShapingComponent => validComponents.has(component as ShapingComponent)) : [];
  return { ...(addComponents.length ? { addComponents: [...new Set(addComponents)] } : {}), ...(removeComponents.length ? { removeComponents: [...new Set(removeComponents)] } : {}), ...(metadata ? { metadata } : {}) };
}
function normalizeSpell(value: unknown): SorcerySpell | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sourceTypes.has(item.source as SorcerySource)) return null;
  const specialisation = record(item.specialisation);
  const kind = specialisation?.kind === "subject" || specialisation?.kind === "form" ? specialisation.kind : undefined;
  return { id: item.id, name: item.name, source: item.source as SorcerySource,
    ...(typeof item.baseFamily === "string" ? { baseFamily: item.baseFamily } : {}),
    ...(kind && typeof specialisation?.value === "string" ? { specialisation: { kind, value: specialisation.value } } : {}),
    ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}) };
}
function normalizeSchool(value: unknown): SorcerySchool | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sourceTypes.has(item.source as SorcerySource)) return null;
  return { id: item.id, name: item.name, source: item.source as SorcerySource,
    spellIds: Array.isArray(item.spellIds) ? item.spellIds.filter((id): id is string => typeof id === "string") : [],
    ...(typeof item.organisationId === "string" ? { organisationId: item.organisationId } : {}),
    ...(typeof item.sourceDescription === "string" ? { sourceDescription: item.sourceDescription } : {}),
    ...(typeof item.notes === "string" ? { notes: item.notes } : {}), ...(normalizeShapingRules(item.shapingRules) ? { shapingRules: normalizeShapingRules(item.shapingRules) } : {}) };
}
export function normalizeSorceryState(value: unknown): SorceryState {
  const item = record(value);
  if (!item) return emptySorceryState();
  const customSpells = Array.isArray(item.customSpells) ? item.customSpells.map(normalizeSpell).filter((spell): spell is SorcerySpell => !!spell && spell.source !== "core") : [];
  const customSchools = Array.isArray(item.customSchools) ? item.customSchools.map(normalizeSchool).filter((school): school is SorcerySchool => !!school && school.source !== "core") : [];
  const knownSpells = Array.isArray(item.knownSpells) ? item.knownSpells.flatMap(entry => {
    const known = record(entry);
    if (!known || typeof known.spellId !== "string") return [];
    return [{ spellId: known.spellId, ...(typeof known.sourceDescription === "string" ? { sourceDescription: known.sourceDescription } : {}),
      ...(typeof known.acquiredFrom === "string" ? { acquiredFrom: known.acquiredFrom } : {}), ...(typeof known.starting === "boolean" ? { starting: known.starting } : {}),
      ...(typeof known.notes === "string" ? { notes: known.notes } : {}) }];
  }) : [];
  const schoolAccess = Array.isArray(item.schoolAccess) ? item.schoolAccess.flatMap(entry => {
    const access = record(entry);
    if (!access || typeof access.schoolId !== "string") return [];
    return [{ schoolId: access.schoolId, ...(typeof access.sourceType === "string" ? { sourceType: access.sourceType } : {}),
      ...(typeof access.sourceDescription === "string" ? { sourceDescription: access.sourceDescription } : {}), ...(typeof access.organisationId === "string" ? { organisationId: access.organisationId } : {}) }];
  }) : [];
  const organisationAvailability = record(item.organisationAvailability);
  const availability = organisationAvailability ? Object.fromEntries(Object.entries(organisationAvailability).flatMap(([id, ids]) => Array.isArray(ids) ? [[id, ids.filter((value): value is string => typeof value === "string")]] : [])) : undefined;
  const shapingRules = normalizeShapingRules(item.shapingRules);
  return { schoolIds: Array.isArray(item.schoolIds) ? [...new Set(item.schoolIds.filter((id): id is string => typeof id === "string") )] : [],
    ...(typeof item.startingSchoolId === "string" ? { startingSchoolId: item.startingSchoolId } : {}),
    ...(Array.isArray(item.availableSpellIds) ? { availableSpellIds: [...new Set(item.availableSpellIds.filter((id): id is string => typeof id === "string") )] } : {}),
    schoolAccess, knownSpells, customSchools, customSpells, ...(availability ? { organisationAvailability: availability } : {}), ...(shapingRules ? { shapingRules } : {}) };
}

export function calculateSorceryStartingEntitlement(invocation: number | undefined): SorceryStartingEntitlement {
  const value = Number.isFinite(invocation) ? Math.max(0, invocation!) : 0;
  return { active: invocation !== undefined && Number.isFinite(invocation), invocationValue: value, count: Math.ceil(value / 20), rule: "one spell per 20% or part thereof" };
}
export const calculateSorceryIntensity = (invocation: number | undefined): number => Math.ceil((Number.isFinite(invocation) ? Math.max(0, invocation!) : 0) / 10);
export const calculateShapingPoints = (shaping: number | undefined): number => Math.ceil((Number.isFinite(shaping) ? Math.max(0, shaping!) : 0) / 10);
export const calculateSorceryDerivedStatistics = (invocation: number | undefined, shaping: number | undefined, intelligence: number): SorceryDerivedStatistics => ({
  intensity: calculateSorceryIntensity(invocation), shapingPoints: calculateShapingPoints(shaping), memorisedSpellCapacity: Math.max(0, Number.isFinite(intelligence) ? intelligence : 0),
});

export function sorceryCatalogue(state: SorceryState = emptySorceryState()): SorcerySpell[] {
  return [...CORE_SORCERY_SPELLS, ...state.customSpells];
}
export function sorcerySchoolCatalogue(state: SorceryState = emptySorceryState()): SorcerySchool[] {
  return [...CORE_SORCERY_SCHOOLS, ...state.customSchools];
}
export function availableSorcerySpellIds(state: SorceryState): string[] {
  const schools = new Map(sorcerySchoolCatalogue(state).map(item => [item.id, item]));
  const learnedSchoolIds = [...new Set([...state.schoolIds, ...(state.startingSchoolId ? [state.startingSchoolId] : [])])];
  const schoolPool = [...new Set(learnedSchoolIds.flatMap(id => schools.get(id)?.spellIds ?? []))];
  const explicit = state.availableSpellIds === undefined ? schoolPool : schoolPool.filter(id => state.availableSpellIds!.includes(id));
  const rankPools = Object.values(state.organisationAvailability ?? {});
  return rankPools.length ? explicit.filter(id => rankPools.some(pool => pool.includes(id))) : explicit;
}
/** Replace the character-creation School while preserving any other acquired Schools. */
export function withStartingSorcerySchool(state: SorceryState, schoolId: string | undefined): SorceryState {
  const previousId = state.startingSchoolId;
  return {
    ...state,
    startingSchoolId: schoolId || undefined,
    schoolIds: [...new Set([...state.schoolIds.filter(id => id !== previousId), ...(schoolId ? [schoolId] : [])])],
  };
}
export function effectiveShapingComponents(rules?: SorceryShapingRules): ShapingComponent[] {
  const added = rules?.addComponents ?? [];
  const removed = new Set(rules?.removeComponents ?? []);
  return [...new Set([...CORE_SHAPING_COMPONENTS, ...added])].filter(component => !removed.has(component));
}
/** Preserve known entries when rules change; expose stale IDs for reconciliation/UI without deleting player data. */
export function reconcileSorceryKnownSpells(state: SorceryState): { state: SorceryState; unavailableSpellIds: string[] } {
  const available = new Set(availableSorcerySpellIds(state));
  const knownIds = [...new Set(state.knownSpells.map(spell => spell.spellId))];
  return { state: { ...state, knownSpells: state.knownSpells }, unavailableSpellIds: knownIds.filter(id => !available.has(id)) };
}
