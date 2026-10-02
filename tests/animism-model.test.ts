import { describe, expect, test } from "bun:test";
import {
  CORE_SPIRIT_RULES, deriveSpiritStatistics, generateCoreSpirit, normalizeAnimismState, reconcileAnimism,
  spiritIntensityBand, validateSpirit,
} from "../src/lib/animism";

const constant = (value: number) => () => value;

describe("Core spirit records and generation", () => {
  test("Intensity POW ranges and rolls use 1d6 + six per Intensity", () => {
    expect(spiritIntensityBand(4)).toMatchObject({ minPow: 25, maxPow: 30, formula: "1d6+24" });
    expect(generateCoreSpirit({ id: "spirit", spiritTypeId: "core:animism:bane", intensity: 4, random: constant(0) }))
      .toMatchObject({ pow: 25, intensity: 4 });
  });

  test("derivatives recalculate from source Characteristics", () => {
    expect(deriveSpiritStatistics({ pow: 20, cha: 6, ins: 4, int: 2, typeData: { ruleId: "bane" } }))
      .toEqual({ magicPoints: 20, spectralCombat: 76, willpower: 90, actionPoints: 2, initiative: 4 });
    expect(deriveSpiritStatistics({ pow: 20, cha: 8, ins: 5, int: 2, typeData: { ruleId: "curse" } }))
      .toEqual({ magicPoints: 20, spectralCombat: 78, willpower: 90, actionPoints: 2, initiative: 5, stealth: 63 });
  });

  test("different Core generation patterns roll, inherit, and leave choices explicit", () => {
    const bane = generateCoreSpirit({ id: "bane", spiritTypeId: "core:animism:bane", intensity: 1, random: constant(0) });
    expect(bane).toMatchObject({ ins: 1, cha: 1, abilities: ["Cannibalistic", "Deadly"] });

    const ancestor = generateCoreSpirit({ id: "ancestor", spiritTypeId: "core:animism:ancestor", intensity: 2, random: constant(0), typeData: { species: "human", int: 13, cha: 12 } });
    expect(ancestor).toMatchObject({ int: 13, cha: 12, abilities: ["Eternal"] });
    expect(ancestor.generation?.pendingChoices.map(item => item.id)).toContain("ancestor-abilities");

    const regional = generateCoreSpirit({ id: "region", spiritTypeId: "core:animism:nature", intensity: 2, random: constant(0), typeData: { variant: "regional", "nature-kind": "forest" } });
    expect(regional).toMatchObject({ ins: 1, cha: 3, abilities: [] });
    expect(regional.generation?.pendingChoices.find(item => item.id === "nature-abilities")).toMatchObject({ maximumCount: 2 });

    const alliedFetch = generateCoreSpirit({ id: "fetch", spiritTypeId: "core:animism:fetch", intensity: 0, random: constant(0), typeData: { variant: "allied" } });
    expect(alliedFetch).toMatchObject({ pow: 13, intensity: 2, int: 8, cha: 8 });
    expect(alliedFetch.generation?.pendingChoices.map(item => item.id)).toContain("fetch-abilities");

    const awakenedFetch = generateCoreSpirit({ id: "awakened", spiritTypeId: "core:animism:fetch", intensity: 0, random: constant(0), typeData: { variant: "awakened", pow: 24, int: 15, cha: 11 } });
    expect(awakenedFetch).toMatchObject({ pow: 24, intensity: 3, int: 15, cha: 11 });
    const unresolvedFetch = generateCoreSpirit({ id: "unresolved-fetch", spiritTypeId: "core:animism:fetch", intensity: 0, random: constant(0) });
    expect(unresolvedFetch.pow).toBeUndefined();
    expect(unresolvedFetch.generation?.pendingChoices.map(item => item.id)).toContain("fetch-kind");
  });

  test("Ancestor d3 face and required count are explicit, validated, and saved without rerolling", () => {
    const ancestor = generateCoreSpirit({ id: "ancestor-roll", spiritTypeId: "core:animism:ancestor", intensity: 0, abilityCountDie: 3, random: constant(0), typeData: { species: "human", int: 13, cha: 12, abilityDetails: ["Willpower skill and known Folk Magic"] }, abilities: ["Discorporate", "Sagacity", "Spellcasting"] });
    expect(ancestor.generation?.rolls).toMatchObject({ abilityCountDie: [3], abilityCount: [3] });
    expect(validateSpirit(ancestor)).toEqual([]);
    const loaded = normalizeAnimismState(JSON.parse(JSON.stringify({ spirits: [ancestor] })));
    expect(loaded.spirits[0].generation?.rolls).toMatchObject({ abilityCountDie: [3], abilityCount: [3] });
    expect(validateSpirit(loaded.spirits[0])).toEqual([]);
    expect(validateSpirit({ ...ancestor, abilities: ["Discorporate", "Sagacity"] })).toContainEqual(expect.objectContaining({ code: "ability-count", message: "Select 3 abilities." }));
    expect(validateSpirit({ ...ancestor, typeData: { species: "human", int: 13, cha: 12 }, abilities: ["Discorporate", "Sagacity", "Spellcasting"] }))
      .toContainEqual(expect.objectContaining({ code: "missing-ancestor-ability-details" }));
  });

  test("incomplete migrated Ancestors retain missing values and report concrete requirements", () => {
    const loaded = normalizeAnimismState({ spirits: [{ id: "tiny-tim", name: "Tiny Tim", spiritTypeId: "core:animism:ancestor", source: "custom", intensity: 4, pow: 27, abilities: [] }] });
    expect(loaded.spirits[0]).not.toHaveProperty("int");
    expect(loaded.spirits[0]).not.toHaveProperty("cha");
    expect(loaded.spirits[0].generation?.rolls).toBeUndefined();
    expect(validateSpirit(loaded.spirits[0]).map(issue => issue.code)).toEqual(expect.arrayContaining(["missing-int", "missing-cha", "missing-ancestor-species"]));
  });

  test("all catalogue types have type-specific generation metadata and core abilities", () => {
    expect(Object.keys(CORE_SPIRIT_RULES)).toHaveLength(12);
    expect(CORE_SPIRIT_RULES["core:animism:bane"].inherentAbilities).toEqual(["Cannibalistic", "Deadly"]);
    expect(CORE_SPIRIT_RULES["core:animism:ancestor"].selectableAbilities).toContain("Subjugate");
    expect(CORE_SPIRIT_RULES["core:animism:nature"].selectableAbilities).toEqual(["Bless", "Demesne", "Domination", "Endowment"]);
    expect(CORE_SPIRIT_RULES["core:animism:fetch"].selectableAbilities).toHaveLength(20);
  });

  test("validation flags incompatible values and ability selections", () => {
    expect(validateSpirit({ spiritTypeId: "core:animism:bane", intensity: 1, pow: 20, ins: 0, cha: 1, abilities: ["Healing"] }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "intensity-pow-mismatch" }),
        expect.objectContaining({ code: "invalid-ins" }),
        expect.objectContaining({ code: "incompatible-ability" }),
      ]));
  });

  test("legacy saves preserve spirits and relationships while marking missing generation choices", () => {
    const migrated = normalizeAnimismState({
      spirits: [{ id: "legacy", name: "Old spirit", spiritTypeId: "core:animism:bane", source: "campaign", intensity: 1, pow: 7, ins: 2, cha: 4, abilities: ["Cannibalistic"] }],
      allies: [{ spiritId: "legacy", attitude: "friendly", source: "old save" }],
      bindings: [{ id: "vessel", spiritId: "legacy", vessel: "place", countsAgainstCapacity: true, source: "old save" }],
    });
    expect(migrated.spirits[0]).toMatchObject({ name: "Old spirit", pow: 7, spectralCombat: 61, willpower: 64, generation: { method: "legacy" } });
    expect(migrated.spirits[0].generation?.pendingChoices).toContainEqual(expect.objectContaining({ id: "legacy-spirit-details" }));
    expect(migrated.allies).toHaveLength(1);
    expect(migrated.bindings[0]).toMatchObject({ vessel: "place", spiritId: "legacy" });
  });

  test("richer type choices, provenance, and generation metadata survive round-trip serialization", () => {
    const original = generateCoreSpirit({ id: "region", name: "Old Pine", spiritTypeId: "core:animism:nature", intensity: 2, random: constant(0), source: "campaign",
      typeData: { variant: "regional", species: "pine forest", "nature-kind": "regional forest", completedChoices: ["nature-kind"], abilityDetails: [{ ability: "Demesne", subject: "pine forest" }] },
      abilities: ["Demesne"] });
    original.provenance = "Pinewatch oral tradition";
    const loaded = normalizeAnimismState(JSON.parse(JSON.stringify({ spirits: [original] })));
    expect(loaded.spirits[0]).toMatchObject({ source: "campaign", provenance: "Pinewatch oral tradition", typeData: original.typeData,
      generation: { method: "core-generated", rolls: original.generation?.rolls } });
  });

  test("reconciliation recalculates derived values after manual source edits", () => {
    const state = normalizeAnimismState({ spirits: [{ id: "manual", name: "Manual", spiritTypeId: "core:animism:bane", source: "custom", intensity: 1, pow: 7, ins: 2, cha: 4, abilities: ["Cannibalistic", "Deadly"] }] });
    state.spirits[0].pow = 12;
    state.spirits[0].cha = 8;
    reconcileAnimism(state, undefined, 10);
    expect(state.spirits[0]).toMatchObject({ magicPoints: 12, spectralCombat: 70, willpower: 74 });
  });

  test("changing Intensity preserves a manual POW and reports its new range mismatch", () => {
    const state = normalizeAnimismState({ spirits: [{ id: "manual", name: "Manual", spiritTypeId: "core:animism:bane", source: "custom", intensity: 1, pow: 9, ins: 2, cha: 4, abilities: ["Cannibalistic", "Deadly"] }] });
    state.spirits[0].intensity = 2;
    const issues = reconcileAnimism(state, undefined, 10);
    expect(state.spirits[0].pow).toBe(9);
    expect(issues).toContainEqual(expect.objectContaining({ code: "intensity-pow-mismatch", spiritId: "manual" }));
  });
});
