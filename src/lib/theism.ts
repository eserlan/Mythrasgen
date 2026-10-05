/** Core Theism rules, catalogue, cult presets, and character membership data. */
export type TheistRank = "Lay Member" | "Initiate" | "Acolyte" | "Priest" | "High Priest";
export type TheismSource = "core" | "campaign" | "custom";

export interface TheistMiracle {
  id: string;
  name: string;
  source: TheismSource;
  minimumRank: Exclude<TheistRank, "Lay Member">;
  mpCost: number;
  exhortationTime: string;
  traits: string[];
  description?: string;
}

export interface TheistCultMiracle {
  miracleId: string;
  /** Cult-facing name, e.g. True Scimitar for the generic True (Weapon) miracle. */
  name?: string;
  /** Overrides availability in this cult without changing canonical miracle metadata. */
  minimumRank?: TheistRank;
}

export interface TheistCult {
  id: string;
  name: string;
  deity: string;
  source: TheismSource;
  description?: string;
  miracles: TheistCultMiracle[];
}

export interface TheistCultMembership {
  id: string;
  cultId: string;
  rank: TheistRank;
  devotionSpecialisation: string;
  devotionValue: number;
  exhortValue: number;
  devotionalPool: number;
  knownMiracleIds: string[];
}

export interface TheismState {
  /** Campaign/custom definitions are stored here; Core definitions remain in the shared catalogue. */
  customCults: TheistCult[];
  memberships: TheistCultMembership[];
}

const miracleId = (name: string) => `core:theism:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
const miracle = (name: string, minimumRank: TheistMiracle["minimumRank"]): TheistMiracle => {
  const rankData = minimumRank === "Initiate" ? [1, "1 Turn"] as const : minimumRank === "Acolyte" ? [2, "2 Turns"] as const : [3, "3 Turns"] as const;
  return { id: miracleId(name), name, source: "core", minimumRank, mpCost: rankData[0], exhortationTime: rankData[1], traits: [] };
};

const initiate = ["Absorption", "Aegis", "Backlash", "Behold", "Berserk", "Breathe Water", "Cure Malady", "Dismiss Elemental", "Dismiss Magic", "Elemental Summoning", "Enthrall", "Fear", "Fortify", "Harmonise", "Heal Wound", "Illusion", "Lay to Rest", "Lightning", "Madness", "Mindblast", "Mindlink", "Mirage", "Perseverance", "Reflection", "Ripen", "Sacred Band", "Shield", "Soul Sight", "Spirit Block", "Steadfast", "Sureshot", "True (Weapon)"] as const;
const acolyte = ["Beast Form", "Bind Ghost", "Bless Crops", "Call Winds", "Chameleon", "Clear Skies", "Cloud Call", "Consecrate", "Corruption", "Cure Sense", "Entangle", "Exorcism", "Fecundity", "Heal Body", "Heal Mind", "Leeching", "Pacify", "Propitiate", "Raise Undead", "Sunspear", "Thunderclap"] as const;
const priest = ["Awaken", "Earthquake", "Excommunicate", "Extension", "Growth", "Heart Seizure", "Obliterate", "Rain of (Substance)", "Rejuvenate", "Resurrect", "Sever Spirit"] as const;

export const THEIST_RANKS: readonly TheistRank[] = ["Lay Member", "Initiate", "Acolyte", "Priest", "High Priest"];
export const CORE_THEIST_MIRACLES: TheistMiracle[] = [
  ...initiate.map(name => miracle(name, "Initiate")),
  ...acolyte.map(name => miracle(name, "Acolyte")),
  ...priest.map(name => miracle(name, "Priest")),
];

const byName = (name: string) => CORE_THEIST_MIRACLES.find(item => item.name === name)!.id;
const offerings = (names: readonly string[]): TheistCultMiracle[] => names.map(name => ({ miracleId: byName(name) }));
export const CORE_THEIST_CULTS: TheistCult[] = [
  { id: "core:cult-of-myceras", name: "Cult of Myceras", deity: "Myceras", source: "core", miracles: offerings(["Beast Form", "Berserk", "Clear Skies", "Consecrate", "Fortify", "Sacred Band", "Shield", "Sunspear"]) },
  { id: "core:seven-badoshi-devils", name: "Seven Badoshi Devils", deity: "Seven Badoshi Devils", source: "core", miracles: [
    ...offerings(["Bind Ghost", "Chameleon", "Consecrate", "Earthquake", "Madness", "Perseverance"]),
    { miracleId: byName("True (Weapon)"), name: "True Scimitar" },
  ] },
];

const rankIndex = (rank: TheistRank) => THEIST_RANKS.indexOf(rank);
const finiteNonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const asRecord = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

/** Pool maximum from POW and explicit cult rank; personal Magic Points are not involved. */
export function devotionalPoolMaximum(pow: number, rank: TheistRank): number {
  if (!finiteNonnegative(pow)) return 0;
  const fraction = rank === "Lay Member" ? 0 : rank === "Initiate" ? 0.25 : rank === "Acolyte" ? 0.5 : rank === "Priest" ? 0.75 : 1;
  return Math.ceil(pow * fraction);
}

export function startingMiracleLimit(devotion: number): number {
  return finiteNonnegative(devotion) ? Math.ceil(devotion / 20) : 0;
}

export function miracleMagnitude(devotion: number): number {
  return finiteNonnegative(devotion) ? Math.ceil(devotion / 10) : 0;
}

export const miracleIntensity = miracleMagnitude;

export function effectiveMiracleMinimumRank(miracle: TheistMiracle, offering?: TheistCultMiracle): TheistRank {
  return offering?.minimumRank ?? miracle.minimumRank;
}

export function miracleAvailableAtRank(miracle: TheistMiracle, rank: TheistRank, offering?: TheistCultMiracle): boolean {
  return rankIndex(rank) >= rankIndex(effectiveMiracleMinimumRank(miracle, offering));
}

export interface KnownMiracleValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the starting selection against cult offerings, effective rank, and Devotion limit. */
export function validateKnownMiracles(
  knownIds: readonly string[], cult: TheistCult, rank: TheistRank, devotion: number,
  catalogue: readonly TheistMiracle[] = CORE_THEIST_MIRACLES,
): KnownMiracleValidation {
  const errors: string[] = [];
  const known = new Set(knownIds);
  if (known.size !== knownIds.length) errors.push("Known miracles must be unique.");
  if (knownIds.length > startingMiracleLimit(devotion)) errors.push("Known miracles exceed the starting limit for Devotion.");
  for (const id of known) {
    const offering = cult.miracles.find(item => item.miracleId === id);
    if (!offering) { errors.push(`Miracle ${id} is not offered by this cult.`); continue; }
    const entry = catalogue.find(item => item.id === id);
    if (!entry) { errors.push(`Miracle ${id} is not in the available catalogue.`); continue; }
    if (!miracleAvailableAtRank(entry, rank, offering)) errors.push(`${offering.name ?? entry.name} is not available at ${rank} rank.`);
  }
  return { valid: errors.length === 0, errors };
}

/** Ensure multiple cult pools, if acquired later, never store more than total POW. */
export function devotionalPoolsWithinPow(memberships: readonly Pick<TheistCultMembership, "devotionalPool">[], pow: number): boolean {
  return finiteNonnegative(pow) && memberships.every(item => finiteNonnegative(item.devotionalPool))
    && memberships.reduce((total, item) => total + item.devotionalPool, 0) <= pow;
}

export const emptyTheismState = (): TheismState => ({ customCults: [], memberships: [] });

function normalizeMiracleOffer(value: unknown): TheistCultMiracle | null {
  const source = asRecord(value);
  if (!source || typeof source.miracleId !== "string") return null;
  const minimumRank = THEIST_RANKS.includes(source.minimumRank as TheistRank) ? source.minimumRank as TheistRank : undefined;
  return { miracleId: source.miracleId, ...(typeof source.name === "string" ? { name: source.name } : {}), ...(minimumRank ? { minimumRank } : {}) };
}

function normalizeCult(value: unknown): TheistCult | null {
  const source = asRecord(value);
  if (!source || typeof source.id !== "string" || typeof source.name !== "string" || typeof source.deity !== "string") return null;
  const sourceType: TheismSource = source.source === "campaign" || source.source === "custom" ? source.source : "custom";
  const miracles = Array.isArray(source.miracles) ? source.miracles.map(normalizeMiracleOffer).filter((item): item is TheistCultMiracle => item !== null) : [];
  return { id: source.id, name: source.name, deity: source.deity, source: sourceType, ...(typeof source.description === "string" ? { description: source.description } : {}), miracles };
}

function normalizeMembership(value: unknown): TheistCultMembership | null {
  const source = asRecord(value);
  if (!source || typeof source.id !== "string" || typeof source.cultId !== "string" || !THEIST_RANKS.includes(source.rank as TheistRank)
      || typeof source.devotionSpecialisation !== "string" || !finiteNonnegative(source.devotionValue) || !finiteNonnegative(source.exhortValue) || !finiteNonnegative(source.devotionalPool)) return null;
  const knownMiracleIds = Array.isArray(source.knownMiracleIds) ? source.knownMiracleIds.filter((id): id is string => typeof id === "string") : [];
  return { id: source.id, cultId: source.cultId, rank: source.rank as TheistRank, devotionSpecialisation: source.devotionSpecialisation,
    devotionValue: source.devotionValue, exhortValue: source.exhortValue, devotionalPool: source.devotionalPool, knownMiracleIds };
}

/** Missing legacy Theism data stays empty; normalization never infers a membership from skills. */
export function normalizeTheismState(value: unknown): TheismState {
  const source = asRecord(value);
  if (!source) return emptyTheismState();
  return { customCults: Array.isArray(source.customCults) ? source.customCults.map(normalizeCult).filter((item): item is TheistCult => item !== null) : [],
    memberships: Array.isArray(source.memberships) ? source.memberships.map(normalizeMembership).filter((item): item is TheistCultMembership => item !== null) : [] };
}
