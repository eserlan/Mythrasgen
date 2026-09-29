import { emptyFolkMagicState, normalizeFolkMagicState, type FolkMagicState } from "./folk-magic";
import { emptyMysticismState, normalizeMysticismState, type MysticismState } from "./mysticism";

export const MAGIC_DISCIPLINES = ["Folk Magic", "Animism", "Mysticism", "Sorcery", "Theism"] as const;
export type MagicDiscipline = typeof MAGIC_DISCIPLINES[number];
export type MagicSkillOrigin = "culture" | "career" | "bonus";
export type MagicStatus = "detected" | "needs-configuration" | "complete" | "action-required";

export interface MagicSkillRecord {
  name: string;
  value: number;
  origins: MagicSkillOrigin[];
}

export interface MagicDisciplineState {
  discipline: MagicDiscipline;
  skills: MagicSkillRecord[];
  status: MagicStatus;
  /** Reserved for follow-up discipline configuration; preserved during reconciliation. */
  configuration?: Record<string, unknown>;
}

export interface MagicTradition {
  id: string;
  name: string;
  sourceType: string;
  disciplines: MagicDiscipline[];
  organisationId?: string;
  details?: Record<string, unknown>;
}

export interface OrganisationMembership {
  id: string;
  name: string;
  organisationType: string;
  details?: Record<string, unknown>;
}

export interface StartingAbilityEntitlement {
  discipline: MagicDiscipline;
  sourceSkill: string;
  sourceSkillValue: number;
  ruleId: string;
  rate: number;
  count: number;
}

export interface MagicState {
  disciplines: MagicDisciplineState[];
  /** Inactive records retain future user configuration but are not active capabilities. */
  archivedDisciplines: MagicDisciplineState[];
  traditions: MagicTradition[];
  startingAbilityEntitlements: StartingAbilityEntitlement[];
  /** Folk Magic spell knowledge and custom catalogue extensions, separate from its skill record. */
  folkMagic: FolkMagicState;
  /** Mysticism paths and Talent knowledge are independent from other disciplines. */
  mysticism: MysticismState;
}

export const emptyMagicState = (): MagicState => ({
  disciplines: [], archivedDisciplines: [], traditions: [], startingAbilityEntitlements: [], folkMagic: emptyFolkMagicState(), mysticism: emptyMysticismState(),
});

export interface DetectedMagicSkill {
  name: string;
  value: number;
  origins: MagicSkillOrigin[];
}

const isSpecialised = (skill: string, base: string) => skill.startsWith(`${base} (`) && skill.endsWith(")");

/** Interpret existing canonical skill identities as independent magical disciplines. */
export function detectMagicDisciplines(skills: readonly DetectedMagicSkill[]): MagicDisciplineState[] {
  const relevant: Record<MagicDiscipline, (name: string) => boolean> = {
    "Folk Magic": name => name === "Folk Magic",
    Animism: name => name === "Trance" || isSpecialised(name, "Binding"),
    Mysticism: name => name === "Mysticism" || isSpecialised(name, "Mysticism"),
    Sorcery: name => isSpecialised(name, "Invocation") || name === "Shaping",
    Theism: name => isSpecialised(name, "Devotion") || name === "Exhort",
  };
  return MAGIC_DISCIPLINES.flatMap(discipline => {
    const matched = skills.filter(skill => relevant[discipline](skill.name));
    return matched.length ? [{ discipline, skills: matched, status: "needs-configuration" as const }] : [];
  });
}

const VALID_STATUSES = new Set<MagicStatus>(["detected", "needs-configuration", "complete", "action-required"]);
const validDiscipline = (value: unknown): value is MagicDiscipline => MAGIC_DISCIPLINES.includes(value as MagicDiscipline);
const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

function normalizeDisciplineState(value: unknown): MagicDisciplineState | null {
  const source = record(value);
  if (!source || !validDiscipline(source.discipline)) return null;
  const skills = Array.isArray(source.skills) ? source.skills.flatMap(item => {
    const skill = record(item);
    if (!skill || typeof skill.name !== "string" || typeof skill.value !== "number" || !Number.isFinite(skill.value)) return [];
    const origins = Array.isArray(skill.origins)
      ? skill.origins.filter((origin): origin is MagicSkillOrigin => origin === "culture" || origin === "career" || origin === "bonus")
      : [];
    return [{ name: skill.name, value: skill.value, origins }];
  }) : [];
  const status = VALID_STATUSES.has(source.status as MagicStatus) ? source.status as MagicStatus : "needs-configuration";
  const configuration = record(source.configuration);
  return { discipline: source.discipline, skills, status, ...(configuration ? { configuration } : {}) };
}

/** Safely restore the plural magic model from current or legacy character saves. */
export function normalizeMagicState(value: unknown): MagicState {
  const source = record(value);
  if (!source) return emptyMagicState();
  const normalizeStates = (items: unknown) => Array.isArray(items)
    ? items.map(normalizeDisciplineState).filter((item): item is MagicDisciplineState => item !== null)
    : [];
  const traditions = Array.isArray(source.traditions) ? source.traditions.flatMap(item => {
    const tradition = record(item);
    if (!tradition || typeof tradition.id !== "string" || typeof tradition.name !== "string" || typeof tradition.sourceType !== "string") return [];
    const disciplines = Array.isArray(tradition.disciplines) ? tradition.disciplines.filter(validDiscipline) : [];
    const details = record(tradition.details);
    return [{ id: tradition.id, name: tradition.name, sourceType: tradition.sourceType, disciplines,
      ...(typeof tradition.organisationId === "string" ? { organisationId: tradition.organisationId } : {}), ...(details ? { details } : {}) }];
  }) : [];
  const startingAbilityEntitlements = Array.isArray(source.startingAbilityEntitlements)
    ? source.startingAbilityEntitlements.flatMap(item => {
      const entitlement = record(item);
      if (!entitlement || !validDiscipline(entitlement.discipline) || typeof entitlement.sourceSkill !== "string"
          || typeof entitlement.ruleId !== "string" || ![entitlement.sourceSkillValue, entitlement.rate, entitlement.count].every(value => typeof value === "number" && Number.isFinite(value))) return [];
      return [{ discipline: entitlement.discipline, sourceSkill: entitlement.sourceSkill,
        sourceSkillValue: entitlement.sourceSkillValue as number, ruleId: entitlement.ruleId,
        rate: entitlement.rate as number, count: entitlement.count as number }];
    }) : [];
  return { disciplines: normalizeStates(source.disciplines), archivedDisciplines: normalizeStates(source.archivedDisciplines), traditions, startingAbilityEntitlements,
    folkMagic: normalizeFolkMagicState(source.folkMagic), mysticism: normalizeMysticismState(source.mysticism) };
}

/** Reconcile detected skills while preserving configuration and explicitly archiving lost capabilities. */
export function reconcileMagicState(current: MagicState, detected: MagicDisciplineState[]): MagicState {
  const existing = new Map([...current.archivedDisciplines, ...current.disciplines].map(state => [state.discipline, state]));
  const activeNames = new Set(detected.map(state => state.discipline));
  const archivedDisciplines = [...current.archivedDisciplines.filter(state => !activeNames.has(state.discipline)),
    ...current.disciplines.filter(state => !activeNames.has(state.discipline))];
  return {
    ...current,
    disciplines: detected.map(state => {
      const previous = existing.get(state.discipline);
      return previous ? { ...state, status: previous.status, ...(previous.configuration ? { configuration: previous.configuration } : {}) } : state;
    }),
    archivedDisciplines,
  };
}

export function normalizeMemberships(value: unknown): OrganisationMembership[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const membership = record(item);
    if (!membership || typeof membership.id !== "string" || typeof membership.name !== "string" || typeof membership.organisationType !== "string") return [];
    const details = record(membership.details);
    return [{ id: membership.id, name: membership.name, organisationType: membership.organisationType, ...(details ? { details } : {}) }];
  });
}
