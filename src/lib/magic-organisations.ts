import { CORE_MYSTICISM_ORGANISATIONS, CORE_MYSTICISM_PATHS, type MysticismPath } from "./mysticism";
import { CORE_SORCERY_SCHOOLS, type SorcerySchool } from "./sorcery";
import type { AnimismState } from "./animism";
import type { MagicState } from "./magic";
import { createOrganisationMembership, normalizeOrganisationMemberships, normalizeOrganisations, type Organisation, type OrganisationMembership, type GenericOrganisationRank } from "./organisations";

type Affiliation = { organisation: Organisation; membership: OrganisationMembership };

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
}

/** Convert a shared Theism rank edit back to the legacy rules-facing title. */
export function syncTheistRankFromMembership(magic: MagicState, membership: OrganisationMembership, organisation?: Organisation): void {
  if (organisation?.kind.type !== "magical-cult" || organisation.kind.discipline !== "Theism") return;
  const theist = magic.theism.memberships.find(item => item.id === membership.id);
  if (theist) theist.rank = ({
    Common: "Lay Member", Dedicated: "Initiate", Proven: "Acolyte", Overseer: "Priest", Leader: "High Priest",
  } as const)[membership.rank];
}
