import { CORE_MYSTICISM_ORGANISATIONS, CORE_MYSTICISM_PATHS, type MysticismPath } from "./mysticism";
import { CORE_SORCERY_SCHOOLS, type SorcerySchool } from "./sorcery";
import { CORE_THEIST_CULTS } from "./theism";
import type { AnimismRank, AnimismState } from "./animism";
import type { MagicState } from "./magic";
import { createOrganisationMembership, normalizeOrganisationMemberships, normalizeOrganisations, type Organisation, type OrganisationMembership, type GenericOrganisationRank } from "./organisations";

type Affiliation = { organisation: Organisation; membership: OrganisationMembership };

/** A Theist cult type alone is not a character-level magic affiliation. */
export function hasActiveTheistAffiliation(
  magic: MagicState,
  membership: OrganisationMembership,
  organisation: Organisation | undefined,
  hasTheismCapability: boolean,
): boolean {
  if (organisation?.kind.type !== "magical-cult" || organisation.kind.discipline !== "Theism") return false;
  const theist = magic.theism.memberships.find(item => item.id === membership.id || item.cultId === organisation.id);
  if (!theist) return false;
  const defaultSpecialisation = organisation.deity
    ?? magic.theism.customCults.find(item => item.id === organisation.id)?.deity
    ?? CORE_THEIST_CULTS.find(item => item.id === organisation.id)?.deity;
  const hasSavedSpecialisation = defaultSpecialisation
    ? theist.devotionSpecialisation !== defaultSpecialisation
    : !!theist.devotionSpecialisation;
  return hasTheismCapability || theist.devotionValue > 0 || theist.exhortValue > 0
    || theist.devotionalPool > 0 || theist.knownMiracleIds.length > 0 || hasSavedSpecialisation;
}

const ANIMISM_RANK_TO_ORGANISATION: Record<AnimismRank, GenericOrganisationRank> = {
  Follower: "Common", "Spirit Worshipper": "Dedicated", Shaman: "Proven", "High Shaman": "Overseer",
};
const ORGANISATION_RANK_TO_ANIMISM: Record<GenericOrganisationRank, AnimismRank> = {
  Common: "Follower", Dedicated: "Spirit Worshipper", Proven: "Shaman", Overseer: "High Shaman", Leader: "High Shaman",
};

function affiliation(discipline: "Animism" | "Mysticism" | "Sorcery", organisation: Organisation, rank: GenericOrganisationRank = "Common"): Affiliation {
  return { organisation, membership: createOrganisationMembership(`magic:${discipline.toLowerCase()}:${organisation.id}`, organisation.id, rank) };
}

function linkedAffiliations(magic: MagicState): Affiliation[] {
  const linked: Affiliation[] = [];
  const animism = magic.animism as AnimismState;
  const tradition = animism.traditions.find(item => item.id === animism.traditionId);
  if (tradition?.organisationId) {
    const rank: GenericOrganisationRank = ({ Follower: "Common", "Spirit Worshipper": "Dedicated", Shaman: "Proven", "High Shaman": "Overseer" } as const)[animism.rank ?? tradition.rank ?? "Follower"];
    linked.push(affiliation("Animism", { id: tradition.organisationId, name: tradition.name,
      kind: { type: "magical-cult", discipline: "Animism" }, ...(tradition.description ? { description: tradition.description } : {}),
      ...(tradition.notes ? { details: { notes: tradition.notes } } : {}) }, rank));
  }

  const mysticism = magic.mysticism;
  const pathIds = new Set([...mysticism.pathIds, ...(mysticism.startingPathId ? [mysticism.startingPathId] : [])]);
  const paths: MysticismPath[] = [...CORE_MYSTICISM_PATHS, ...mysticism.customPaths].filter(item => pathIds.has(item.id));
  for (const path of paths) {
    if (!path.organisationId) continue;
    const catalogue = [...CORE_MYSTICISM_ORGANISATIONS, ...mysticism.organisations].find(item => item.id === path.organisationId);
    linked.push(affiliation("Mysticism", { id: path.organisationId, name: catalogue?.name ?? path.name,
      kind: { type: "magical-cult", discipline: "Mysticism" }, ...(catalogue?.notes ? { details: { notes: catalogue.notes } } : {}) }));
  }

  const sorcery = magic.sorcery;
  const schoolIds = new Set([...sorcery.schoolIds, ...(sorcery.startingSchoolId ? [sorcery.startingSchoolId] : [])]);
  const schools: SorcerySchool[] = [...CORE_SORCERY_SCHOOLS, ...sorcery.customSchools].filter(item => schoolIds.has(item.id));
  for (const school of schools) {
    const organisationId = sorcery.schoolAccess.find(item => item.schoolId === school.id)?.organisationId ?? school.organisationId;
    if (!organisationId) continue;
    linked.push(affiliation("Sorcery", { id: organisationId, name: school.name,
      kind: { type: "magical-cult", discipline: "Sorcery" }, ...(school.notes ? { details: { notes: school.notes } } : {}) }));
  }
  return linked;
}

/** Add shared records only for explicit, saved magical affiliations. Existing shared ranks remain authoritative. */
export function syncMagicOrganisationMemberships(magic: MagicState, organisations: Organisation[], memberships: OrganisationMembership[]): void {
  const linked = linkedAffiliations(magic);
  const linkedIds = new Set(linked.map(item => item.membership.id));
  const normalizedOrganisations = normalizeOrganisations([...linked.map(item => item.organisation), ...organisations]);
  organisations.splice(0, organisations.length, ...normalizedOrganisations);
  const currentMemberships = memberships.filter(item => !item.id.startsWith("magic:") || linkedIds.has(item.id));
  const present = new Set(currentMemberships.map(item => item.id));
  const presentOrganisations = new Set(currentMemberships.map(item => item.organisationId));
  const normalizedMemberships = normalizeOrganisationMemberships([...currentMemberships, ...linked.map(item => item.membership)
    .filter(item => !present.has(item.id) && !presentOrganisations.has(item.organisationId))]);
  memberships.splice(0, memberships.length, ...normalizedMemberships);

  const tradition = (magic.animism as AnimismState).traditions.find(item => item.id === magic.animism.traditionId);
  const animismMembership = tradition?.organisationId
    ? memberships.find(item => item.organisationId === tradition.organisationId)
    : undefined;
  if (tradition && animismMembership && organisations.some(item => item.id === tradition.organisationId
    && item.kind.type === "magical-cult" && item.kind.discipline === "Animism")) {
    magic.animism.rank = ORGANISATION_RANK_TO_ANIMISM[animismMembership.rank];
  }
}

/** Keep a linked Animism membership aligned when its rules-facing rank is edited. */
export function syncAnimismMembershipRankFromState(magic: MagicState, organisations: Organisation[], memberships: OrganisationMembership[]): void {
  const tradition = magic.animism.traditions.find(item => item.id === magic.animism.traditionId);
  if (!tradition?.organisationId || !magic.animism.rank) return;
  if (!organisations.some(item => item.id === tradition.organisationId
    && item.kind.type === "magical-cult" && item.kind.discipline === "Animism")) return;
  const membership = memberships.find(item => item.organisationId === tradition.organisationId);
  if (membership) membership.rank = ANIMISM_RANK_TO_ORGANISATION[magic.animism.rank];
}

/** Convert a shared Theism rank edit back to the legacy rules-facing title. */
export function syncTheistRankFromMembership(magic: MagicState, membership: OrganisationMembership, organisation?: Organisation): void {
  if (organisation?.kind.type !== "magical-cult" || organisation.kind.discipline !== "Theism") return;
  const theist = magic.theism.memberships.find(item => item.id === membership.id);
  if (theist) theist.rank = ({
    Common: "Lay Member", Dedicated: "Initiate", Proven: "Acolyte", Overseer: "Priest", Leader: "High Priest",
  } as const)[membership.rank];
}
