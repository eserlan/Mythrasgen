/** Shared organisation and membership records for cults and brotherhoods. */
export const GENERIC_ORGANISATION_RANKS = ["Common", "Dedicated", "Proven", "Overseer", "Leader"] as const;
export type GenericOrganisationRank = typeof GENERIC_ORGANISATION_RANKS[number];

export type OrganisationKind =
  | { type: "magical-cult"; discipline: "Theism" | "Animism" | "Sorcery" | "Mysticism" }
  | { type: "brotherhood"; subtype: string }
  | { type: "custom"; category?: string };

export interface OrganisationDetails {
  skillsTaught?: string[];
  duties?: string[];
  restrictions?: string[];
  privileges?: string[];
  benefits?: string[];
  contacts?: string[];
  affiliations?: string[];
  notes?: string;
  [key: string]: unknown;
}

export interface Organisation {
  id: string;
  name: string;
  kind: OrganisationKind;
  description?: string;
  deity?: string;
  pantheon?: string;
  focus?: string;
  rankTitles?: Partial<Record<GenericOrganisationRank, string>>;
  details?: OrganisationDetails;
}

export interface OrganisationMembership {
  id: string;
  organisationId: string;
  rank: GenericOrganisationRank;
  titleOverride?: string;
  notes?: string;
  status?: "active" | "inactive" | "left" | "suspended" | string;
}

/** Joining establishes Common standing unless a discipline's training rules say otherwise. */
export function createOrganisationMembership(id: string, organisationId: string, rank: GenericOrganisationRank = "Common"): OrganisationMembership {
  return { id, organisationId, rank, status: "active" };
}

export const DEFAULT_RANK_TITLES: Record<GenericOrganisationRank, string> = {
  Common: "Common", Dedicated: "Dedicated", Proven: "Proven", Overseer: "Overseer", Leader: "Leader",
};

export const ORGANISATION_RANK_TITLES: Record<string, Record<GenericOrganisationRank, string>> = {
  Theism: { Common: "Lay Member", Dedicated: "Initiate", Proven: "Acolyte", Overseer: "Priest", Leader: "High Priest" },
  Animism: { Common: "Follower", Dedicated: "Spirit Worshipper", Proven: "Shaman", Overseer: "High Shaman", Leader: "Spirit Lord" },
  Sorcery: { Common: "Novice", Dedicated: "Apprentice", Proven: "Adept", Overseer: "Mage", Leader: "Arch Mage" },
  Mysticism: { Common: "Aspirant", Dedicated: "Student", Proven: "Disciple", Overseer: "Master", Leader: "Sage" },
  Brotherhood: { Common: "Associate", Dedicated: "Apprentice", Proven: "Journeyman", Overseer: "Master", Leader: "Grand Master" },
};

export function rankTitle(rank: GenericOrganisationRank, organisation?: Pick<Organisation, "kind" | "rankTitles">): string {
  const discipline = organisation?.kind.type === "magical-cult" ? organisation.kind.discipline : undefined;
  return organisation?.rankTitles?.[rank] ?? (discipline ? ORGANISATION_RANK_TITLES[discipline]?.[rank] : undefined)
    ?? (organisation?.kind.type === "brotherhood" ? ORGANISATION_RANK_TITLES.Brotherhood[rank] : undefined)
    ?? DEFAULT_RANK_TITLES[rank];
}

export function genericRankForTitle(title: string, discipline?: string): GenericOrganisationRank | undefined {
  const titles = discipline ? ORGANISATION_RANK_TITLES[discipline] : undefined;
  return GENERIC_ORGANISATION_RANKS.find(rank => titles?.[rank] === title)
    ?? GENERIC_ORGANISATION_RANKS.find(rank => ORGANISATION_RANK_TITLES.Brotherhood[rank] === title)
    ?? (GENERIC_ORGANISATION_RANKS.includes(title as GenericOrganisationRank) ? title as GenericOrganisationRank : undefined);
}

const object = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const stringList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;

export function normalizeOrganisations(value: unknown): Organisation[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, Organisation>();
  for (const item of value) {
    const source = object(item);
    if (!source || typeof source.id !== "string" || !source.id || typeof source.name !== "string" || !source.name) continue;
    const rawKind = object(source.kind);
    const discipline = rawKind?.discipline;
    let kind: OrganisationKind;
    if (rawKind?.type === "magical-cult" && ["Theism", "Animism", "Sorcery", "Mysticism"].includes(discipline as string)) {
      kind = { type: "magical-cult", discipline: discipline as "Theism" | "Animism" | "Sorcery" | "Mysticism" };
    } else if (rawKind?.type === "brotherhood" && typeof rawKind.subtype === "string") kind = { type: "brotherhood", subtype: rawKind.subtype };
    else if (rawKind?.type === "custom") kind = { type: "custom", ...(typeof rawKind.category === "string" ? { category: rawKind.category } : {}) };
    else {
      // Older saves used membership-shaped records as the organisation picker catalogue.
      const old = typeof source.organisationType === "string" ? source.organisationType : "custom";
      kind = { type: "custom", category: old };
    }
    const rawTitles = object(source.rankTitles);
    const rankTitles = rawTitles ? Object.fromEntries(GENERIC_ORGANISATION_RANKS.flatMap(rank =>
      typeof rawTitles[rank] === "string" ? [[rank, rawTitles[rank] as string]] : [])) : undefined;
    const rawDetails = object(source.details);
    const details = rawDetails ? { ...rawDetails,
      ...Object.fromEntries(["skillsTaught", "duties", "restrictions", "privileges", "benefits", "contacts", "affiliations"].flatMap(key => {
        const list = stringList(rawDetails[key]); return list ? [[key, list]] : [];
      })), ...(typeof rawDetails.notes === "string" ? { notes: rawDetails.notes } : {}) } : undefined;
    unique.set(source.id, { id: source.id, name: source.name, kind,
      ...(typeof source.description === "string" ? { description: source.description } : {}),
      ...(typeof source.deity === "string" ? { deity: source.deity } : {}), ...(typeof source.pantheon === "string" ? { pantheon: source.pantheon } : {}),
      ...(typeof source.focus === "string" ? { focus: source.focus } : {}), ...(rankTitles ? { rankTitles } : {}), ...(details ? { details } : {}) });
  }
  return [...unique.values()];
}

export function normalizeOrganisationMemberships(value: unknown): OrganisationMembership[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, OrganisationMembership>();
  for (const item of value) {
    const source = object(item);
    if (!source || typeof source.id !== "string" || !source.id || typeof source.organisationId !== "string" || !source.organisationId) continue;
    const rank = GENERIC_ORGANISATION_RANKS.includes(source.rank as GenericOrganisationRank) ? source.rank as GenericOrganisationRank : "Common";
    unique.set(source.id, { id: source.id, organisationId: source.organisationId, rank,
      ...(typeof source.titleOverride === "string" ? { titleOverride: source.titleOverride } : {}),
      ...(typeof source.notes === "string" ? { notes: source.notes } : {}), ...(typeof source.status === "string" ? { status: source.status } : {}) });
  }
  return [...unique.values()];
}

export function validateOrganisationMembership(membership: OrganisationMembership, organisations: readonly Organisation[]): string[] {
  const errors: string[] = [];
  if (!membership.id.trim()) errors.push("Membership needs a stable ID.");
  if (!organisations.some(organisation => organisation.id === membership.organisationId)) errors.push("Membership must reference an existing organisation.");
  if (!GENERIC_ORGANISATION_RANKS.includes(membership.rank)) errors.push("Membership rank is invalid.");
  return errors;
}

export function validateOrganisation(organisation: Organisation): string[] {
  return organisation.id.trim() && organisation.name.trim() ? [] : ["Organisation needs a stable ID and name."];
}
