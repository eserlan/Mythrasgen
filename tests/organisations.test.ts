import { describe, expect, test } from "bun:test";
import {
  createOrganisationMembership, genericRankForTitle, GENERIC_ORGANISATION_RANKS, joinOrganisation, joinOrganisationMembership, normalizeOrganisationMemberships, normalizeOrganisations,
  rankTitle, upsertOrganisation, validateOrganisationMembership, type Organisation, type OrganisationMembership,
} from "../src/lib/organisations";
import { emptyMagicState } from "../src/lib/magic";
import { syncAnimismMembershipRankFromState, syncMagicOrganisationMemberships, syncTheistRankFromMembership } from "../src/lib/magic-organisations";

describe("shared organisation model", () => {
  test("maps generic ranks to comparative titles without replacing custom overrides", () => {
    const theist: Organisation = { id: "cult", name: "Cult", kind: { type: "magical-cult", discipline: "Theism" } };
    const animist: Organisation = { id: "tradition", name: "Tradition", kind: { type: "magical-cult", discipline: "Animism" } };
    const guild: Organisation = { id: "guild", name: "Glass Guild", kind: { type: "brotherhood", subtype: "guild" } };
    const religiousCult: Organisation = { id: "religion", name: "River Cult", kind: { type: "custom", category: "religious cult" } };
    expect(GENERIC_ORGANISATION_RANKS).toEqual(["Common", "Dedicated", "Proven", "Overseer", "Leader"]);
    expect(GENERIC_ORGANISATION_RANKS.map(rank => rankTitle(rank, guild))).toEqual(["Associate", "Apprentice", "Journeyman", "Master", "Grand Master"]);
    expect(rankTitle("Common", religiousCult)).toBe("Lay Member");
    expect(rankTitle("Common", theist)).toBe("Lay Member");
    expect(rankTitle("Leader", animist)).toBe("Spirit Lord");
    expect(genericRankForTitle("High Shaman", "Animism")).toBe("Overseer");
    expect(genericRankForTitle("Spirit Lord", "Animism")).toBe("Leader");
    expect(rankTitle("Dedicated", { ...theist, rankTitles: { Dedicated: "Chosen" } })).toBe("Chosen");
  });

  test("keeps memberships explicit, supports multiple organisations, and round trips details", () => {
    const organisations = normalizeOrganisations([
      { id: "guild", name: "Glass Guild", kind: { type: "brotherhood", subtype: "guild" },
        details: { skillsTaught: ["Craft"], duties: ["Keep the guild's secrets"], privileges: ["Use the guild hall"] } },
      { id: "cult", name: "River Cult", kind: { type: "magical-cult", discipline: "Theism" }, deity: "River" },
    ]);
    const memberships = normalizeOrganisationMemberships([
      createOrganisationMembership("guild-member", "guild"), { id: "cult-member", organisationId: "cult", rank: "Proven", notes: "Initiated" },
    ]);
    const restoredOrganisations = normalizeOrganisations(JSON.parse(JSON.stringify(organisations)));
    const restoredMemberships = normalizeOrganisationMemberships(JSON.parse(JSON.stringify(memberships)));
    expect(restoredOrganisations).toEqual(organisations);
    expect(restoredMemberships).toEqual(memberships);
    expect(restoredMemberships.map(item => item.rank)).toEqual(["Common", "Proven"]);
    expect(validateOrganisationMembership(restoredMemberships[0]!, restoredOrganisations)).toEqual([]);
    expect(normalizeOrganisationMemberships([...restoredMemberships, ...restoredMemberships])).toHaveLength(2);
  });

  test("joining an organisation again reuses the stable membership identity", () => {
    const memberships = [createOrganisationMembership("existing-member", "campaign:guild", "Dedicated")];
    const joined = joinOrganisationMembership(memberships, "campaign:guild", "new-id", "Common");
    expect(joined.id).toBe("existing-member");
    expect(joined.rank).toBe("Common");
    expect(memberships).toHaveLength(1);
  });

  test("joining a catalogue cult stores its definition with the character membership", () => {
    const organisations: Organisation[] = [];
    const memberships: OrganisationMembership[] = [];
    const cult: Organisation = { id: "core:cult", name: "River Cult", deity: "River", kind: { type: "magical-cult", discipline: "Theism" } };
    const joined = joinOrganisation(organisations, memberships, cult, "member-id", "Dedicated");
    expect(organisations).toEqual([cult]);
    expect(joined).toMatchObject({ id: "member-id", organisationId: cult.id, rank: "Dedicated" });
  });

  test("supports non-magical subtypes and does not cap membership count", () => {
    const organisations = Array.from({ length: 3 }, (_, index) => ({ id: `org-${index}`, name: `Group ${index}`,
      kind: { type: "brotherhood" as const, subtype: ["company", "college", "gang"][index]! } }));
    const memberships = organisations.map((organisation, index) => createOrganisationMembership(`member-${index}`, organisation.id));
    expect(normalizeOrganisations(organisations)).toHaveLength(3);
    expect(normalizeOrganisationMemberships(memberships)).toHaveLength(3);
  });

  test("updates the shared organisation when an existing cult is edited", () => {
    const organisations: Organisation[] = [{ id: "cult", name: "Old name", deity: "Old deity", description: "Old description",
      kind: { type: "magical-cult", discipline: "Theism" }, rankTitles: { Common: "Believer" }, details: { notes: "Local notes" } }];
    upsertOrganisation(organisations, { id: "cult", name: "New name", deity: "New deity", description: undefined,
      kind: { type: "magical-cult", discipline: "Theism" } });
    expect(organisations).toEqual([{ id: "cult", name: "New name", deity: "New deity",
      kind: { type: "magical-cult", discipline: "Theism" }, rankTitles: { Common: "Believer" }, details: { notes: "Local notes" } }]);
  });
});

// Bun runs this store module without Svelte's compiler, so provide its identity rune.
(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const store = await import("../src/lib/store.svelte");

test("fresh character initialization has usable organisation collections", () => {
  const { char, replace } = store;
  replace({ memberships: [], organisations: [], magic: emptyMagicState() });
  expect(char.memberships).toEqual([]);
  expect(char.organisations.every(item => item.id && item.name && item.kind)).toBe(true);
  expect(char.magic.disciplines).toEqual([]);
  expect(char.home).toBe(false);
});

test("pre-shared-organisation saves migrate without losing organisation details", () => {
  const { char, replace } = store;
  replace({ memberships: [{ id: "legacy:guild", name: "Glass Guild", organisationType: "guild",
    details: { skillsTaught: ["Craft"], duties: ["Keep the guild's secrets"] } }],
  organisations: [], magic: emptyMagicState() });

  expect(char.organisations).toContainEqual(expect.objectContaining({ id: "legacy:guild", name: "Glass Guild",
    kind: { type: "custom", category: "guild" }, details: { skillsTaught: ["Craft"], duties: ["Keep the guild's secrets"] } }));
  expect(char.memberships).toContainEqual({ id: "legacy:guild", organisationId: "legacy:guild", rank: "Common" });
});

test("legacy Theist cult membership migrates once into the shared membership while preserving magic state", () => {
  const { char, replace } = store;
  const theistMembership = { id: "theist:one", cultId: "core:cult-of-myceras", rank: "Acolyte", devotionSpecialisation: "Myceras",
    devotionValue: 45, exhortValue: 40, devotionalPool: 2, knownMiracleIds: ["core:theism:shield"] };
  replace({ memberships: [], organisations: [], magic: { ...char.magic, theism: { customCults: [], memberships: [theistMembership] } } });
  expect(char.memberships).toEqual([{ id: "theist:one", organisationId: "core:cult-of-myceras", rank: "Proven" }]);
  expect(char.organisations).toContainEqual(expect.objectContaining({ id: "core:cult-of-myceras", kind: { type: "magical-cult", discipline: "Theism" } }));
  expect(char.magic.theism.memberships[0]).toMatchObject({ ...theistMembership });
  char.memberships[0]!.rank = "Overseer";
  syncTheistRankFromMembership(char.magic, char.memberships[0]!, char.organisations.find(item => item.id === "core:cult-of-myceras"));
  expect(char.magic.theism.memberships[0]!.rank).toBe("Priest");
  replace({ ...char });
  expect(char.memberships).toHaveLength(1);
  expect(char.magic.theism.memberships).toHaveLength(1);
  expect(char.memberships[0]!.rank).toBe("Overseer");
  expect(char.magic.theism.memberships[0]!.rank).toBe("Priest");
  expect(char.magic.theism.memberships[0]!.devotionalPool).toBe(2);
  expect(char.magic.theism.memberships[0]!.knownMiracleIds).toEqual(["core:theism:shield"]);
});

test("explicit magical affiliations sync with mixed ordinary memberships and survive reload without duplicates", () => {
  const { char, replace } = store;
  const magic = emptyMagicState();
  magic.animism.traditions = [{ id: "animism:river", name: "River Tradition", source: "custom", organisationId: "animism:river-cult",
    friendlySpiritTypeIds: ["water"], neutralSpiritTypeIds: [], hostileSpiritTypeIds: [], hostileTraditionIds: [], startingGrants: [], customSpiritTypes: [], customSpiritTemplates: [] }];
  magic.animism.traditionId = "animism:river";
  magic.animism.rank = "Shaman";
  magic.mysticism.pathIds = ["core:path-of-healing"];
  magic.sorcery.schoolIds = ["core:school:stygian-path"];
  magic.sorcery.schoolAccess = [{ schoolId: "core:school:stygian-path", organisationId: "sorcery:stygian-order" }];
  replace({ memberships: [{ id: "guild-member", organisationId: "glass-guild", rank: "Dedicated" }],
    organisations: [{ id: "glass-guild", name: "Glass Guild", kind: { type: "brotherhood", subtype: "guild" } }], magic });
  expect(char.memberships.map(item => item.organisationId)).toEqual(expect.arrayContaining([
    "glass-guild", "animism:river-cult", "core:brotherhood-of-the-healing-hands", "sorcery:stygian-order",
  ]));
  expect(char.memberships.find(item => item.organisationId === "animism:river-cult")?.rank).toBe("Proven");
  expect(char.magic.animism.traditions[0]).toMatchObject({ friendlySpiritTypeIds: ["water"], organisationId: "animism:river-cult" });
  const expectedMemberships = char.memberships.length;
  replace({ ...char });
  expect(char.memberships).toHaveLength(expectedMemberships);
  expect(char.memberships.filter(item => item.organisationId === "sorcery:stygian-order")).toHaveLength(1);
  expect(char.memberships.find(item => item.organisationId === "glass-guild")?.rank).toBe("Dedicated");
  char.magic.animism.traditions[0]!.organisationId = undefined;
  syncMagicOrganisationMemberships(char.magic, char.organisations, char.memberships);
  expect(char.memberships.some(item => item.organisationId === "animism:river-cult")).toBe(false);
});

test("magic skills alone and an unlinked Spirit Tradition do not create memberships", () => {
  const magic = emptyMagicState();
  magic.disciplines = [
    { discipline: "Animism", skills: [{ name: "Binding", value: 55, origins: ["culture"] }], status: "complete" },
    { discipline: "Mysticism", skills: [{ name: "Mysticism", value: 55, origins: ["career"] }], status: "complete" },
    { discipline: "Sorcery", skills: [{ name: "Invocation", value: 55, origins: ["bonus"] }], status: "complete" },
  ];
  magic.animism.traditions = [{ id: "tradition", name: "Forest Tradition", source: "custom",
    friendlySpiritTypeIds: [], neutralSpiritTypeIds: [], hostileSpiritTypeIds: [], hostileTraditionIds: [], startingGrants: [], customSpiritTypes: [], customSpiritTemplates: [] }];
  magic.animism.traditionId = "tradition";
  const organisations: Organisation[] = [];
  const memberships = [] as ReturnType<typeof normalizeOrganisationMemberships>;
  syncMagicOrganisationMemberships(magic, organisations, memberships);
  expect(organisations).toEqual([]);
  expect(memberships).toEqual([]);
});

test("linked Animism ranks stay aligned between shared memberships and rules state", () => {
  const magic = emptyMagicState();
  magic.animism.traditions = [{ id: "tradition", name: "Forest Tradition", source: "custom", organisationId: "forest-cult",
    friendlySpiritTypeIds: [], neutralSpiritTypeIds: [], hostileSpiritTypeIds: [], hostileTraditionIds: [], startingGrants: [], customSpiritTypes: [], customSpiritTemplates: [] }];
  magic.animism.traditionId = "tradition";
  const organisations: Organisation[] = [{ id: "forest-cult", name: "Forest Tradition", kind: { type: "magical-cult", discipline: "Animism" } }];
  const memberships = [{ id: "forest-member", organisationId: "forest-cult", rank: "Overseer" as const }];

  syncMagicOrganisationMemberships(magic, organisations, memberships);
  expect(magic.animism.rank).toBe("High Shaman");
  magic.animism.rank = "Shaman";
  syncAnimismMembershipRankFromState(magic, organisations, memberships);
  expect(memberships[0]!.rank).toBe("Proven");
  syncMagicOrganisationMemberships(magic, organisations, memberships);
  expect(magic.animism.rank).toBe("Shaman");
});
