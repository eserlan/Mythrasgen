import { describe, expect, test } from "bun:test";
import {
  createOrganisationMembership, genericRankForTitle, normalizeOrganisationMemberships, normalizeOrganisations,
  rankTitle, upsertOrganisation, validateOrganisationMembership, type Organisation,
} from "../src/lib/organisations";

describe("shared organisation model", () => {
  test("maps generic ranks to comparative titles without replacing custom overrides", () => {
    const theist: Organisation = { id: "cult", name: "Cult", kind: { type: "magical-cult", discipline: "Theism" } };
    const animist: Organisation = { id: "tradition", name: "Tradition", kind: { type: "magical-cult", discipline: "Animism" } };
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

test("legacy Theist cult membership migrates once into the shared membership while preserving magic state", () => {
  const { char, replace } = store;
  const theistMembership = { id: "theist:one", cultId: "core:cult-of-myceras", rank: "Acolyte", devotionSpecialisation: "Myceras",
    devotionValue: 45, exhortValue: 40, devotionalPool: 2, knownMiracleIds: ["core:theism:shield"] };
  replace({ memberships: [], organisations: [], magic: { ...char.magic, theism: { customCults: [], memberships: [theistMembership] } } });
  expect(char.memberships).toEqual([{ id: "theist:one", organisationId: "core:cult-of-myceras", rank: "Proven" }]);
  expect(char.organisations).toContainEqual(expect.objectContaining({ id: "core:cult-of-myceras", kind: { type: "magical-cult", discipline: "Theism" } }));
  expect(char.magic.theism.memberships[0]).toMatchObject({ ...theistMembership });
  replace({ ...char });
  expect(char.memberships).toHaveLength(1);
  expect(char.magic.theism.memberships).toHaveLength(1);
});
