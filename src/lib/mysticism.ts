/** Structured Mysticism paths, organisations, and talents. */
export type MysticismSource = "core" | "campaign" | "custom";
export type MysticismTalentFamily = "augment-skill" | "invoke-trait" | "enhance-attribute" | "custom";

export interface MysticismOrganisation {
  id: string;
  name: string;
  source: MysticismSource;
  notes?: string;
}

export interface MysticismTalent {
  id: string;
  name: string;
  source: MysticismSource;
  family?: MysticismTalentFamily;
  /** Canonical skill, characteristic, derived attribute, or named trait. */
  target?: string;
  description?: string;
  notes?: string;
}

export interface MysticismPath {
  id: string;
  name: string;
  source: MysticismSource;
  organisationId?: string;
  talentIds: string[];
  description?: string;
  notes?: string;
  teacher?: string;
  /** Reserved for campaign, organisation, and rank availability rules. */
  availability?: Record<string, unknown>;
}

export interface MysticismKnownTalent {
  talentId: string;
  source?: string;
  notes?: string;
}

export interface MysticismState {
  /** Paths acquired over a character's lifetime; chargen uses startingPathId. */
  pathIds: string[];
  startingPathId?: string;
  /** Optional restriction supplied by campaign or organisation rules. */
  availableTalentIds?: string[];
  /** Starting choices remain separately identifiable from later known Talents. */
  startingTalentIds: string[];
  knownTalents: MysticismKnownTalent[];
  /** Future custom content is stored per character; Core data lives in the catalogue. */
  customPaths: MysticismPath[];
  customTalents: MysticismTalent[];
  organisations: MysticismOrganisation[];
}

const talentId = (family: string, name: string) => `core:mysticism:${family}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
const augment = (target: string): MysticismTalent => ({ id: talentId("augment-skill", target), name: `Augment ${target}`, source: "core", family: "augment-skill", target });
const invoke = (target: string): MysticismTalent => ({ id: talentId("invoke-trait", target), name: `Invoke ${target}`, source: "core", family: "invoke-trait", target });
const enhance = (target: string): MysticismTalent => ({ id: talentId("enhance-attribute", target), name: `Enhance ${target}`, source: "core", family: "enhance-attribute", target });

export const CORE_MYSTICISM_ORGANISATIONS: MysticismOrganisation[] = [
  { id: "core:monastic-order-of-epistemology", name: "Monastic Order of Epistemology", source: "core" },
  { id: "core:brotherhood-of-the-healing-hands", name: "Brotherhood of the Healing Hands", source: "core" },
  { id: "core:school-of-impenetrable-silence", name: "School of Impenetrable Silence", source: "core" },
  { id: "core:fellowship-of-the-snake", name: "Fellowship of the Snake", source: "core" },
  { id: "core:school-of-the-leaping-tiger", name: "School of the Leaping Tiger", source: "core" },
  { id: "core:order-of-asceticism", name: "Order of Asceticism", source: "core" },
  { id: "core:academy-of-enlightened-being", name: "Academy of Enlightened Being", source: "core" },
];

const path = (id: string, name: string, organisationId: string, talents: MysticismTalent[]): MysticismPath => ({
  id: `core:${id}`, name, source: "core", organisationId, talentIds: talents.map(talent => talent.id),
});

const corePathTalents: [string, string, string, MysticismTalent[]][] = [
  ["way-of-all-knowledge", "Way of All Knowledge", "core:monastic-order-of-epistemology", [augment("Insight"), augment("Language"), augment("Lore"), invoke("Aura (Wisdom)"), invoke("Awareness"), invoke("Denial (Ignorance)"), invoke("Magic Sense")]],
  ["path-of-healing", "Path of Healing", "core:brotherhood-of-the-healing-hands", [augment("Endurance"), augment("First Aid"), augment("Healing"), invoke("Disease Immunity"), invoke("Poison Immunity"), enhance("Healing Rate"), enhance("Fatigue")]],
  ["path-of-shadows", "Path of Shadows", "core:school-of-impenetrable-silence", [augment("Perception"), augment("Stealth"), augment("Unarmed"), augment("Ranged Combat Style"), invoke("Adhesion"), invoke("Dark Sight"), enhance("Movement")]],
  ["path-of-deceit", "Path of Deceit", "core:fellowship-of-the-snake", [augment("Conceal"), augment("Deceit"), augment("Influence"), augment("Sleight"), augment("Willpower"), invoke("Night Sight"), enhance("Movement")]],
  ["way-of-the-tiger", "Way of the Tiger", "core:school-of-the-leaping-tiger", [augment("Athletics"), augment("Brawn"), augment("Endurance"), augment("Unarmed"), invoke("Formidable Natural Weapons"), enhance("Action Points"), enhance("Damage Modifier")]],
  ["way-of-abjuration", "Way of Abjuration", "core:order-of-asceticism", [augment("Endurance"), augment("Survival"), invoke("Denial (Food)"), invoke("Denial (Water)"), invoke("Denial (Sleep)"), enhance("Fatigue"), enhance("Hit Points")]],
  ["way-of-reason", "Way of Reason", "core:academy-of-enlightened-being", [augment("Customs"), augment("Influence"), augment("Insight"), augment("Willpower"), invoke("Aura (Authority)"), invoke("Aura (Wisdom)"), enhance("Initiative")]],
];

export const CORE_MYSTICISM_TALENTS: MysticismTalent[] = [...new Map(
  corePathTalents.flatMap(([, , , talents]) => talents).map(talent => [talent.id, talent] as const),
).values()];
export const CORE_MYSTICISM_PATHS: MysticismPath[] = corePathTalents.map(([id, name, organisationId, talents]) => path(id, name, organisationId, talents));

export const emptyMysticismState = (): MysticismState => ({
  pathIds: [], startingTalentIds: [], knownTalents: [], customPaths: [], customTalents: [], organisations: [],
});

const asRecord = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const sources = new Set<MysticismSource>(["core", "campaign", "custom"]);
const normalizeTalent = (value: unknown): MysticismTalent | null => {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sources.has(item.source as MysticismSource)) return null;
  const families = new Set<MysticismTalentFamily>(["augment-skill", "invoke-trait", "enhance-attribute", "custom"]);
  const family = families.has(item.family as MysticismTalentFamily) ? item.family as MysticismTalentFamily : undefined;
  return { id: item.id, name: item.name, source: item.source as MysticismSource, ...(family ? { family } : {}),
    ...(typeof item.target === "string" ? { target: item.target } : {}), ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}) };
};
const normalizePath = (value: unknown): MysticismPath | null => {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sources.has(item.source as MysticismSource)) return null;
  const availability = asRecord(item.availability);
  return { id: item.id, name: item.name, source: item.source as MysticismSource,
    ...(typeof item.organisationId === "string" ? { organisationId: item.organisationId } : {}),
    talentIds: Array.isArray(item.talentIds) ? item.talentIds.filter((id): id is string => typeof id === "string") : [],
    ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
    ...(typeof item.teacher === "string" ? { teacher: item.teacher } : {}), ...(availability ? { availability } : {}) };
};

export function normalizeMysticismState(value: unknown): MysticismState {
  const item = asRecord(value);
  if (!item) return emptyMysticismState();
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  const customPaths = Array.isArray(item.customPaths) ? item.customPaths.map(normalizePath).filter((path): path is MysticismPath => !!path) : [];
  const customTalents = Array.isArray(item.customTalents) ? item.customTalents.map(normalizeTalent).filter((talent): talent is MysticismTalent => !!talent) : [];
  const knownTalents = Array.isArray(item.knownTalents) ? item.knownTalents.flatMap(value => {
    const known = asRecord(value);
    return known && typeof known.talentId === "string" ? [{ talentId: known.talentId,
      ...(typeof known.source === "string" ? { source: known.source } : {}), ...(typeof known.notes === "string" ? { notes: known.notes } : {}) }] : [];
  }) : [];
  const organisations = Array.isArray(item.organisations) ? item.organisations.flatMap(value => {
    const org = asRecord(value);
    return org && typeof org.id === "string" && typeof org.name === "string" && sources.has(org.source as MysticismSource)
      ? [{ id: org.id, name: org.name, source: org.source as MysticismSource, ...(typeof org.notes === "string" ? { notes: org.notes } : {}) }] : [];
  }) : [];
  return { pathIds: strings(item.pathIds), ...(typeof item.startingPathId === "string" ? { startingPathId: item.startingPathId } : {}),
    ...(Array.isArray(item.availableTalentIds) ? { availableTalentIds: strings(item.availableTalentIds) } : {}),
    startingTalentIds: strings(item.startingTalentIds), knownTalents, customPaths, customTalents, organisations };
}

export interface MysticismStartingEntitlement {
  active: boolean;
  skillValue: number;
  count: number;
  ruleId: "mysticism:one-per-20";
  rule: "1 Talent per 20% or part thereof";
  pathConfigured: boolean;
}

export function calculateMysticismStartingEntitlement(skillValue: number | undefined, startingPathId?: string): MysticismStartingEntitlement {
  const active = skillValue !== undefined && Number.isFinite(skillValue);
  const value = active ? Math.max(0, skillValue!) : 0;
  return { active, skillValue: value, count: active ? Math.ceil(value / 20) : 0,
    ruleId: "mysticism:one-per-20", rule: "1 Talent per 20% or part thereof", pathConfigured: !!startingPathId };
}

export function mysticismCatalogue(state: MysticismState) {
  return { talents: [...CORE_MYSTICISM_TALENTS, ...state.customTalents], paths: [...CORE_MYSTICISM_PATHS, ...state.customPaths],
    organisations: [...CORE_MYSTICISM_ORGANISATIONS, ...state.organisations] };
}

/** Resolve Talents taught by selected Paths, then apply any campaign availability restriction. */
export function availableMysticismTalentIds(state: MysticismState, pathIds = [...new Set([...state.pathIds, ...(state.startingPathId ? [state.startingPathId] : [])])]) {
  const { paths } = mysticismCatalogue(state);
  const inPaths = new Set(paths.filter(path => pathIds.includes(path.id)).flatMap(path => path.talentIds));
  return [...inPaths].filter(id => state.availableTalentIds === undefined || state.availableTalentIds.includes(id));
}

/** Preserve known selections and explicitly report any no longer available through the current Paths/rules. */
export function reconcileMysticismTalents(state: MysticismState, pathIds?: string[]) {
  const availableTalentIds = availableMysticismTalentIds(state, pathIds);
  const available = new Set(availableTalentIds);
  const retainedSelections = [...new Set([...state.startingTalentIds, ...state.knownTalents.map(talent => talent.talentId)])];
  return { availableTalentIds, knownTalents: state.knownTalents,
    unavailableTalentIds: retainedSelections.filter(id => !available.has(id)) };
}
