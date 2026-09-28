import { describe, expect, test } from "bun:test";
import { detectMagicDisciplines, emptyMagicState, normalizeMagicState, reconcileMagicState } from "../src/lib/magic";

(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;

describe("magical discipline detection", () => {
  test("detects multiple disciplines from canonical and specialised skill identities", () => {
    const found = detectMagicDisciplines([
      { name: "Folk Magic", value: 46, origins: ["culture"] },
      { name: "Trance", value: 51, origins: ["career"] },
      { name: "Binding (Wolf Totem)", value: 58, origins: ["career", "bonus"] },
      { name: "Meditation", value: 49, origins: ["bonus"] },
      { name: "Mysticism (Path of the Wind)", value: 62, origins: ["career"] },
      { name: "Invocation (Ash School)", value: 54, origins: ["career"] },
      { name: "Shaping", value: 47, origins: ["career"] },
      { name: "Devotion (Orlanth)", value: 60, origins: ["career"] },
      { name: "Exhort", value: 43, origins: ["career"] },
    ]);

    expect(found.map(item => item.discipline)).toEqual(["Folk Magic", "Animism", "Mysticism", "Sorcery", "Theism"]);
    expect(found.find(item => item.discipline === "Animism")?.skills.map(skill => skill.name))
      .toEqual(["Trance", "Binding (Wolf Totem)"]);
    expect(found.find(item => item.discipline === "Mysticism")?.skills[1].name).toBe("Mysticism (Path of the Wind)");
  });

  test("does not detect a discipline from unrelated or generic specialised skills", () => {
    expect(detectMagicDisciplines([
      { name: "Meditation", value: 45, origins: ["career"] },
      { name: "Binding", value: 45, origins: ["career"] },
      { name: "Invocation", value: 45, origins: ["career"] },
      { name: "Devotion", value: 45, origins: ["career"] },
    ]).map(item => item.discipline)).toEqual(["Mysticism"]);
  });
});

describe("magic state reconciliation and migration", () => {
  test("archives a removed capability and restores its configuration if detected again", () => {
    const detected = detectMagicDisciplines([{ name: "Folk Magic", value: 46, origins: ["culture"] }]);
    const configured = { ...emptyMagicState(), disciplines: [{ ...detected[0], status: "complete" as const, configuration: { tradition: "Village lore" } }] };
    const removed = reconcileMagicState(configured, []);
    expect(removed.disciplines).toEqual([]);
    expect(removed.archivedDisciplines[0].configuration).toEqual({ tradition: "Village lore" });
    const returned = reconcileMagicState(removed, detected);
    expect(returned.disciplines[0]).toMatchObject({ status: "complete", configuration: { tradition: "Village lore" } });
    expect(returned.archivedDisciplines).toEqual([]);
  });

  test("defaults old or malformed saves to plural empty collections and preserves traditions", () => {
    expect(normalizeMagicState(undefined)).toEqual(emptyMagicState());
    const state = normalizeMagicState({
      disciplines: [{ discipline: "Animism", skills: [], status: "complete" }],
      traditions: [{ id: "totem", name: "Wolf Totem", sourceType: "animist-tradition", disciplines: ["Animism", "Folk Magic"] }],
      startingAbilityEntitlements: [{ discipline: "Animism", sourceSkill: "Binding (Wolf Totem)", sourceSkillValue: 58, ruleId: "binding-rate", rate: 20, count: 2 }],
    });
    expect(state.disciplines).toHaveLength(1);
    expect(state.traditions[0].disciplines).toEqual(["Animism", "Folk Magic"]);
    expect(state.startingAbilityEntitlements[0]).toMatchObject({ sourceSkill: "Binding (Wolf Totem)", sourceSkillValue: 58, ruleId: "binding-rate" });
  });
});

describe("character Magic skill provenance", () => {
  test("detects existing specialized career skills with their source and percentage", async () => {
    const { char, replace, reconcileMagic } = await import("../src/lib/store.svelte");
    const { careers } = await import("../src/lib/content");
    const career = careers.findIndex(item => item.name === "Shaman");
    const binding = "Binding (Cult, Totem or Tradition)";
    const trance = "Trance";
    replace({
      career,
      careerProfessional: [binding, trance, "Folk Magic"],
      skillSpecialisations: { culture: {}, career: { [binding]: "Wolf Totem" } },
      alloc: { culture: {}, career: { "Binding (Wolf Totem)": 12, Trance: 8 }, bonus: {} },
    });
    reconcileMagic();
    expect(char.magic.disciplines).toContainEqual(expect.objectContaining({
      discipline: "Animism", status: "needs-configuration",
      skills: expect.arrayContaining([
        expect.objectContaining({ name: "Binding (Wolf Totem)", origins: ["career"], value: expect.any(Number) }),
        expect.objectContaining({ name: "Trance", origins: ["career"], value: expect.any(Number) }),
      ]),
    }));
    expect(char.magic.disciplines.map(item => item.discipline)).toContain("Folk Magic");
    const saved = JSON.parse(JSON.stringify(char));
    replace(saved);
    expect(char.magic.disciplines.map(item => item.discipline)).toEqual(["Folk Magic", "Animism"]);
  });
});
