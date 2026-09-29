import { describe, expect, test } from "bun:test";
import { detectMagicDisciplines, emptyMagicState, normalizeMagicState, reconcileMagicState } from "../src/lib/magic";
import { availableMysticismTalentIds, calculateMysticismStartingEntitlement, CORE_MYSTICISM_ORGANISATIONS, CORE_MYSTICISM_PATHS, CORE_MYSTICISM_TALENTS, mysticismCatalogue, reconcileMysticismTalents } from "../src/lib/mysticism";
import { careers } from "../src/lib/content";
import {
  calculateFolkMagicStartingEntitlement, CORE_FOLK_MAGIC_CAREER_SUGGESTIONS, CORE_FOLK_MAGIC_SPELLS,
  FOLK_MAGIC_SPECIALIST_ENTITLEMENT, folkMagicConfigurationStatus, resolveFolkMagicCareerSuggestion,
} from "../src/lib/folk-magic";
import {
  availableSorcerySpellIds, calculateShapingPoints, calculateSorceryDerivedStatistics, calculateSorceryIntensity,
  calculateSorceryStartingEntitlement, CORE_SHAPING_COMPONENTS, CORE_SORCERY_ORDERS, CORE_SORCERY_SCHOOLS,
  CORE_SORCERY_SPELLS, effectiveShapingComponents, emptySorceryState, normalizeSorceryState, sorceryCatalogue,
  withStartingSorcerySchool,
} from "../src/lib/sorcery";

(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;

describe("magical discipline detection", () => {
  test("detects multiple disciplines from canonical and specialised skill identities", () => {
    const found = detectMagicDisciplines([
      { name: "Folk Magic", value: 46, origins: ["culture"] },
      { name: "Trance", value: 51, origins: ["career"] },
      { name: "Binding (Wolf Totem)", value: 58, origins: ["career", "bonus"] },
      { name: "Meditation", value: 49, origins: ["bonus"] },
      { name: "Mysticism", value: 62, origins: ["career"] },
      { name: "Invocation (Ash School)", value: 54, origins: ["career"] },
      { name: "Shaping", value: 47, origins: ["career"] },
      { name: "Devotion (Orlanth)", value: 60, origins: ["career"] },
      { name: "Exhort", value: 43, origins: ["career"] },
    ]);

    expect(found.map(item => item.discipline)).toEqual(["Folk Magic", "Animism", "Mysticism", "Sorcery", "Theism"]);
    expect(found.find(item => item.discipline === "Animism")?.skills.map(skill => skill.name))
      .toEqual(["Trance", "Binding (Wolf Totem)"]);
    expect(found.find(item => item.discipline === "Mysticism")?.skills[0].name).toBe("Mysticism");
  });

  test("Shaping alone does not activate Sorcery; Invocation does", () => {
    expect(detectMagicDisciplines([
      { name: "Meditation", value: 45, origins: ["career"] },
      { name: "Binding", value: 45, origins: ["career"] },
      { name: "Devotion", value: 45, origins: ["career"] },
    ])).toEqual([]);
    expect(detectMagicDisciplines([{ name: "Shaping", value: 45, origins: ["career"] }])).toEqual([]);
    expect(detectMagicDisciplines([{ name: "Invocation", value: 45, origins: ["career"] }]).map(item => item.discipline)).toEqual(["Sorcery"]);
    expect(detectMagicDisciplines([{ name: "Mysticism (Path of Shadows)", value: 45, origins: ["career"] }]))
      .toContainEqual(expect.objectContaining({ discipline: "Mysticism", skills: [expect.objectContaining({ name: "Mysticism (Path of Shadows)" })] }));
  });
});

describe("Sorcery rules and structured Core data", () => {
  test.each([[0, 0], [1, 1], [20, 1], [21, 2], [40, 2], [41, 3], [57, 3], [60, 3], [61, 4], [80, 4], [81, 5], [100, 5]])
  ("starting entitlement at Invocation %i%% is %i", (skill, count) => {
    expect(calculateSorceryStartingEntitlement(skill).count).toBe(count);
  });

  test.each([[0, 0], [1, 1], [10, 1], [11, 2], [57, 6], [60, 6], [61, 7]])
  ("Intensity at Invocation %i%% is %i", (skill, intensity) => expect(calculateSorceryIntensity(skill)).toBe(intensity));

  test.each([[0, 0], [1, 1], [10, 1], [11, 2], [48, 5], [50, 5], [51, 6]])
  ("Shaping Points at Shaping %i%% is %i", (skill, points) => expect(calculateShapingPoints(skill)).toBe(points));

  test("starting entitlement, derived statistics, and INT memorisation capacity are separate", () => {
    expect(calculateSorceryStartingEntitlement(undefined)).toMatchObject({ active: false, count: 0 });
    expect(calculateSorceryDerivedStatistics(57, 48, 13)).toEqual({ intensity: 6, shapingPoints: 5, memorisedSpellCapacity: 13 });
    expect(calculateSorceryStartingEntitlement(57).count).toBe(3);
    expect(emptySorceryState()).toMatchObject({ schoolIds: [], knownSpells: [] });
  });

  test("Core Schools and all nine Order portfolios resolve to canonical Sorcery spell IDs", () => {
    const ids = new Set(CORE_SORCERY_SPELLS.map(item => item.id));
    expect(CORE_SORCERY_SCHOOLS.map(item => item.name)).toEqual(["Stygian Path", "Masters of Metamorphosis"]);
    expect(CORE_SORCERY_SCHOOLS.every(item => item.spellIds.every(id => ids.has(id)))).toBe(true);
    expect(CORE_SORCERY_ORDERS).toHaveLength(9);
    expect(CORE_SORCERY_ORDERS.every(item => item.spellIds.length === 7 && item.spellIds.every(id => ids.has(id)))).toBe(true);
    expect(CORE_SORCERY_SCHOOLS.every(item => item.organisationId === undefined)).toBe(true);
  });

  test("specialisations are structured and availability differs from known spells", () => {
    const dominate = CORE_SORCERY_SPELLS.find(item => item.name === "Dominate (Reptiles)")!;
    expect(dominate).toMatchObject({ baseFamily: "Dominate", specialisation: { kind: "subject", value: "Reptiles" } });
    const state = normalizeSorceryState({ startingSchoolId: "core:school:stygian-path", knownSpells: [{ spellId: dominate.id }] });
    expect(availableSorcerySpellIds(state)).toContain(dominate.id);
    expect(state.knownSpells).toEqual([{ spellId: dominate.id }]);
    expect(CORE_SORCERY_SPELLS.find(spell => spell.id === state.knownSpells[0].spellId)?.specialisation).toEqual({ kind: "subject", value: "Reptiles" });
    expect(availableSorcerySpellIds({ ...state, organisationAvailability: { order: ["core:sorcery:palsy"] } })).not.toContain(dominate.id);
  });

  test("changing the starting School does not retain the previous selection as acquired", () => {
    const first = CORE_SORCERY_SCHOOLS[0];
    const second = CORE_SORCERY_SCHOOLS[1];
    const acquired = { id: "custom:acquired-school", name: "Acquired School", source: "custom" as const, spellIds: [first.spellIds[0]] };
    const newSpell = { id: "custom:new-spell", name: "New Spell", source: "custom" as const };
    const newlyCreated = { id: "custom:new-school", name: "New School", source: "custom" as const, spellIds: [newSpell.id] };
    const state = { ...emptySorceryState(), customSchools: [acquired], schoolIds: [first.id, acquired.id], startingSchoolId: first.id };

    const changed = withStartingSorcerySchool(state, second.id);
    expect(changed.startingSchoolId).toBe(second.id);
    expect(changed.schoolIds).toEqual([acquired.id, second.id]);
    expect(availableSorcerySpellIds(changed)).toEqual([...acquired.spellIds, ...second.spellIds]);
    expect(state.schoolIds).toEqual([first.id, acquired.id]);

    const created = withStartingSorcerySchool({ ...state, customSchools: [...state.customSchools, newlyCreated], customSpells: [newSpell] }, newlyCreated.id);
    expect(created.schoolIds).toEqual([acquired.id, newlyCreated.id]);
    expect(availableSorcerySpellIds(created)).toEqual([...acquired.spellIds, ...newlyCreated.spellIds]);
  });

  test("custom Schools may mix Core and custom spells without changing Core records", () => {
    const original = structuredClone(CORE_SORCERY_SCHOOLS);
    const coreSpell = CORE_SORCERY_SPELLS[0];
    const customSpell = { id: "custom:sorcery:abjure", name: coreSpell.name, source: "custom" as const, baseFamily: "Abjure", description: "Campaign variant." };
    const customSchool = { id: "campaign:school:twilight", name: "Twilight School", source: "campaign" as const, organisationId: "campaign:order:circle", sourceDescription: "Taught by a mentor", spellIds: [coreSpell.id, customSpell.id] };
    const state = normalizeSorceryState({ customSchools: [customSchool], customSpells: [customSpell], schoolIds: [customSchool.id],
      schoolAccess: [{ schoolId: customSchool.id, sourceType: "mentor", sourceDescription: "Elder Sable", organisationId: "campaign:order:circle" }],
      knownSpells: [{ spellId: customSpell.id, starting: true }] });
    const restored = normalizeSorceryState(JSON.parse(JSON.stringify(state)));
    expect(availableSorcerySpellIds(restored)).toEqual([coreSpell.id, customSpell.id]);
    expect(sorceryCatalogue(restored).filter(item => item.name === coreSpell.name).map(item => [item.id, item.source])).toContainEqual([customSpell.id, "custom"]);
    expect(restored.customSchools[0]).toMatchObject({ organisationId: "campaign:order:circle", sourceDescription: "Taught by a mentor" });
    expect(restored.schoolAccess).toEqual([{ schoolId: customSchool.id, sourceType: "mentor", sourceDescription: "Elder Sable", organisationId: "campaign:order:circle" }]);
    expect(CORE_SORCERY_SCHOOLS).toEqual(original);
  });

  test("Shaping components have a Core default and configurable overrides", () => {
    expect(effectiveShapingComponents()).toEqual(CORE_SHAPING_COMPONENTS);
    expect(effectiveShapingComponents({ addComponents: ["Focus"], removeComponents: ["Range"] })).toEqual(["Combine", "Duration", "Magnitude", "Targets", "Focus"]);
  });
});

describe("Mysticism rules and structured Core data", () => {
  test.each([[0, 0], [1, 1], [20, 1], [21, 2], [40, 2], [41, 3], [57, 3], [60, 3], [61, 4], [80, 4], [81, 5], [100, 5]])
  ("starting entitlement at Mysticism %i%% is %i", (skill, count) => {
    expect(calculateMysticismStartingEntitlement(skill).count).toBe(count);
    expect(calculateMysticismStartingEntitlement(skill).rule).toBe("1 Talent per 20% or part thereof");
  });

  test("no Mysticism is inactive, and detected Mysticism awaits Path configuration", () => {
    expect(calculateMysticismStartingEntitlement(undefined)).toMatchObject({ active: false, skillValue: 0, count: 0, pathConfigured: false });
    expect(calculateMysticismStartingEntitlement(57)).toMatchObject({ active: true, skillValue: 57, count: 3, pathConfigured: false });
    expect(calculateMysticismStartingEntitlement(57, "core:path-of-shadows").pathConfigured).toBe(true);
  });

  test("seven Core Paths have valid Talent and separate organisation references", () => {
    const talents = new Set(CORE_MYSTICISM_TALENTS.map(talent => talent.id));
    const organisations = new Set(CORE_MYSTICISM_ORGANISATIONS.map(organisation => organisation.id));
    expect(CORE_MYSTICISM_PATHS).toHaveLength(7);
    for (const path of CORE_MYSTICISM_PATHS) {
      expect(path.talentIds).toHaveLength(7);
      expect(path.talentIds.every(id => talents.has(id))).toBe(true);
      expect(organisations.has(path.organisationId!)).toBe(true);
      expect(path.id).not.toBe(path.organisationId);
    }
    expect(CORE_MYSTICISM_PATHS.find(path => path.name === "Path of Shadows")?.organisationId).toBe("core:school-of-impenetrable-silence");
    expect(CORE_MYSTICISM_TALENTS.find(talent => talent.name === "Augment Perception")).toMatchObject({ family: "augment-skill", target: "Perception", source: "core" });
    expect(CORE_MYSTICISM_TALENTS.find(talent => talent.name === "Enhance Action Points")).toMatchObject({ family: "enhance-attribute", target: "Action Points" });
    expect(CORE_MYSTICISM_TALENTS.find(talent => talent.name === "Invoke Dark Sight")).toMatchObject({ family: "invoke-trait", target: "Dark Sight" });
  });

  test("custom Paths and Talents coexist with Core records and can mix their references", () => {
    const coreTalent = CORE_MYSTICISM_TALENTS.find(talent => talent.name === "Augment Insight")!;
    const customTalent = { id: "custom:insight", name: coreTalent.name, source: "custom" as const, family: "custom" as const, description: "Campaign interpretation." };
    const customPath = { id: "custom:scholar", name: "Scholar's Path", source: "custom" as const, talentIds: [coreTalent.id, customTalent.id] };
    const state = normalizeMagicState({ mysticism: { customTalents: [customTalent], customPaths: [customPath], pathIds: [customPath.id], knownTalents: [{ talentId: coreTalent.id }] } }).mysticism;
    expect(mysticismCatalogue(state).talents.filter(talent => talent.name === coreTalent.name).map(talent => talent.id)).toEqual([coreTalent.id, customTalent.id]);
    expect(availableMysticismTalentIds(state)).toEqual([coreTalent.id, customTalent.id]);
    const restricted = normalizeMagicState({ mysticism: { ...state, availableTalentIds: [customTalent.id] } }).mysticism;
    expect(availableMysticismTalentIds(restricted)).toEqual([customTalent.id]);
    expect(reconcileMysticismTalents(restricted)).toMatchObject({ knownTalents: state.knownTalents, unavailableTalentIds: [coreTalent.id] });
    expect(CORE_MYSTICISM_PATHS.map(path => path.name)).toContain("Way of All Knowledge");
  });
});

describe("Folk Magic rules data", () => {
  test.each([[0, 0], [1, 1], [20, 1], [21, 2], [46, 3], [63, 4]])("standard entitlement at %i%% is %i", (skill, count) => {
    expect(calculateFolkMagicStartingEntitlement(skill).count).toBe(count);
  });

  test.each([[0, 0], [1, 1], [10, 1], [11, 2], [46, 5], [63, 7]])("specialist entitlement at %i%% is %i", (skill, count) => {
    expect(calculateFolkMagicStartingEntitlement(skill, FOLK_MAGIC_SPECIALIST_ENTITLEMENT).count).toBe(count);
  });

  test("supports no skill and configured rates with rule provenance", () => {
    expect(calculateFolkMagicStartingEntitlement(undefined)).toMatchObject({ skillValue: 0, count: 0, rate: 20 });
    expect(calculateFolkMagicStartingEntitlement(46, { id: "campaign-rate", rate: 15, reason: "Campaign rule" }))
      .toMatchObject({ ruleId: "campaign-rate", rate: 15, count: 4, reason: "Campaign rule" });
  });

  test("requires an exact known-spell count and preserves selections when entitlement falls", () => {
    expect(folkMagicConfigurationStatus(3, 3)).toBe("complete");
    expect(folkMagicConfigurationStatus(3, 3, true)).toBe("action-required");
    expect(folkMagicConfigurationStatus(2, 3)).toBe("action-required");
    expect(folkMagicConfigurationStatus(4, 3)).toBe("action-required");
    const knownSpells = ["folk-magic:alarm", "folk-magic:find", "folk-magic:heal"];
    const lowerEntitlement = calculateFolkMagicStartingEntitlement(21);
    expect(lowerEntitlement.count).toBe(2);
    expect(knownSpells).toHaveLength(3);
    expect(folkMagicConfigurationStatus(knownSpells.length, lowerEntitlement.count)).toBe("action-required");
  });

  test("maps canonical careers to advisory lists and represents Any as unrestricted", () => {
    expect(Object.keys(CORE_FOLK_MAGIC_CAREER_SUGGESTIONS).sort()).toEqual(careers.map(career => career.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")).sort());
    expect(CORE_FOLK_MAGIC_CAREER_SUGGESTIONS.alchemist).toEqual({ mode: "unrestricted" });
    expect(CORE_FOLK_MAGIC_CAREER_SUGGESTIONS.fisher).toBeDefined();
    expect(Object.values(CORE_FOLK_MAGIC_CAREER_SUGGESTIONS).flatMap(suggestion => suggestion.mode === "selected" ? suggestion.spellIds : [])
      .every(id => CORE_FOLK_MAGIC_SPELLS.some(spell => spell.id === id))).toBe(true);
  });

  test("resolves overrides without mutating Core suggestions", () => {
    const base = CORE_FOLK_MAGIC_CAREER_SUGGESTIONS.agent;
    if (base.mode !== "selected") throw new Error("Expected selected suggestion list");
    const removedId = base.spellIds[0];
    const addition = CORE_FOLK_MAGIC_SPELLS.find(spell => spell.name === "Heal")!.id;
    expect(resolveFolkMagicCareerSuggestion("agent", { removeSpellIds: [removedId], addSpellIds: [addition] }))
      .toMatchObject({ mode: "selected", spellIds: expect.not.arrayContaining([removedId]) });
    expect(resolveFolkMagicCareerSuggestion("alchemist")).toEqual({ mode: "unrestricted" });
    expect(resolveFolkMagicCareerSuggestion("alchemist", { mode: "selected", replaceSpellIds: [addition] })).toEqual({ mode: "selected", spellIds: [addition] });
    expect(CORE_FOLK_MAGIC_CAREER_SUGGESTIONS.agent).toEqual(base);
  });

  test("keeps custom and Core spells distinct and known spell records separate from skill records across save/load", () => {
    const coreAlarm = CORE_FOLK_MAGIC_SPELLS.find(spell => spell.name === "Alarm")!;
    const magic = normalizeMagicState({
      disciplines: [{ discipline: "Folk Magic", skills: [{ name: "Folk Magic", value: 46, origins: ["culture"] }], status: "complete" }],
      folkMagic: {
        customSpells: [{ id: "custom:alarm", name: "Alarm", description: "A campaign-specific variation", source: "custom" }],
        knownSpells: [
          { spell: { spellId: coreAlarm.id }, provenance: [{ type: "career", name: "Agent" }] },
          { spell: { spellId: "custom:alarm" }, provenance: [{ type: "teacher", name: "Old Mara" }] },
        ],
      },
    });
    const restored = normalizeMagicState(JSON.parse(JSON.stringify(magic)));
    expect(restored.disciplines[0].skills).toEqual([{ name: "Folk Magic", value: 46, origins: ["culture"] }]);
    expect(restored.folkMagic.customSpells[0]).toMatchObject({ id: "custom:alarm", name: "Alarm", source: "custom" });
    expect(restored.folkMagic.knownSpells).toHaveLength(2);
    expect(restored.folkMagic.knownSpells.map(item => item.spell.spellId)).toEqual([coreAlarm.id, "custom:alarm"]);
    expect(normalizeMagicState({ disciplines: [{ discipline: "Folk Magic", skills: [], status: "detected" }] }).folkMagic.knownSpells).toEqual([]);
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
    expect(state.mysticism).toEqual(emptyMagicState().mysticism);
  });

  test("round trips Mysticism while preserving Folk Magic and other disciplines", () => {
    const state = normalizeMagicState({
      disciplines: [{ discipline: "Mysticism", skills: [{ name: "Mysticism", value: 57, origins: ["career"] }], status: "needs-configuration" },
        { discipline: "Folk Magic", skills: [{ name: "Folk Magic", value: 46, origins: ["culture"] }], status: "complete" }],
      folkMagic: { knownSpells: [{ spell: { spellId: "folk-magic:heal" } }] },
      mysticism: { pathIds: ["core:path-of-shadows"], startingPathId: "core:path-of-shadows",
        startingTalentIds: [CORE_MYSTICISM_TALENTS[0].id], knownTalents: [{ talentId: CORE_MYSTICISM_TALENTS[0].id }],
        availableTalentIds: [CORE_MYSTICISM_TALENTS[0].id] },
      sorcery: { schoolIds: ["core:school:stygian-path"], knownSpells: [{ spellId: "core:sorcery:palsy", starting: true }] },
    });
    const restored = normalizeMagicState(JSON.parse(JSON.stringify(state)));
    expect(restored.mysticism).toMatchObject({ pathIds: ["core:path-of-shadows"], startingPathId: "core:path-of-shadows", startingTalentIds: [CORE_MYSTICISM_TALENTS[0].id] });
    expect(restored.folkMagic.knownSpells).toHaveLength(1);
    expect(restored.sorcery).toMatchObject({ schoolIds: ["core:school:stygian-path"], knownSpells: [{ spellId: "core:sorcery:palsy", starting: true }] });
    expect(restored.disciplines.map(item => item.discipline)).toEqual(["Mysticism", "Folk Magic"]);
  });

  test("old saves default Sorcery to empty without affecting other disciplines", () => {
    const restored = normalizeMagicState({ folkMagic: { knownSpells: [{ spell: { spellId: "folk-magic:heal" } }] }, mysticism: { pathIds: ["path"] } });
    expect(restored.sorcery).toEqual(emptySorceryState());
    expect(restored.folkMagic.knownSpells).toHaveLength(1);
    expect(restored.mysticism.pathIds).toEqual(["path"]);
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
