import { describe, expect, test } from "bun:test";
import { migrateCharacterStep, migrateCultureTables, normalizeAgeCategory, normalizeBackground, normalizeRace } from "../src/lib/migrations";

describe("race normalization", () => {
  test("keeps a saved race and defaults missing or malformed legacy values to blank", () => {
    expect(normalizeRace("Elf")).toBe("Elf");
    expect(normalizeRace(undefined)).toBe("");
    expect(normalizeRace(42)).toBe("");
  });
});

describe("legacy character step migration", () => {
  test("keeps old sheet saves on the sheet after inserting Combat", () => {
    expect(migrateCharacterStep(5, false)).toBe(7);
  });

  test("leaves the current Background step in place and shifts old Sheet saves", () => {
    expect(migrateCharacterStep(5, true)).toBe(5);
    expect(migrateCharacterStep(6, true)).toBe(7);
  });
});

describe("legacy background table migration", () => {
  test.each([
    ["Barbarian", "Barbarian"],
    ["Nomadic", "Nomadic"],
    ["Primitive", "Primitive"],
  ] as const)("uses the selected %s culture table defaults", (kind, expected) => {
    expect(migrateCultureTables(kind)).toEqual({ socialTable: expected, moneyTable: expected });
  });

  test("keeps explicit table choices and defaults custom cultures to Civilised", () => {
    expect(migrateCultureTables(null, "Nomadic", "Primitive")).toEqual({ socialTable: "Nomadic", moneyTable: "Primitive" });
    expect(migrateCultureTables(null)).toEqual({ socialTable: "Civilised", moneyTable: "Civilised" });
  });
});

describe("imported background normalization", () => {
  const fallback = {
    events: [{ roll: 0, text: "" }], archivedEvents: [], socialClassRoll: 50, socialClass: "Freeman",
    socialClassCulture: "Civilised" as const, socialClassMethod: "rolled" as const, socialClassMoney: 1,
    socialClassEquipment: "Tools", socialClassResources: "Rented accommodation",
    parentsRoll: 50, parents: "", siblingsRoll: 50, siblings: "", extendedFamilyRoll: 50, extendedFamily: "",
    standingRoll: 50, familyTies: [], connectionsRoll: 50, connections: [], startingMoneyRoll: 14,
    equipment: "Tools", purchases: [],
  };

  test("replaces malformed imported collections and fields with safe defaults", () => {
    const value = normalizeBackground({ events: null, familyTies: null, connections: null, purchases: null, parents: 7 }, fallback);
    expect(value.events).toEqual(fallback.events);
    expect(value.familyTies).toEqual([]);
    expect(value.connections).toEqual([]);
    expect(value.purchases).toEqual([]);
    expect(value.parents).toBe("");
  });

  test("filters malformed collection entries without losing valid ones", () => {
    const value = normalizeBackground({
      events: [{ roll: 40, text: "Valid", source: "chosen" }, null, { roll: 101, text: "Invalid" }],
      archivedEvents: [{ roll: 12, text: "Retained" }, { roll: -1, text: "Invalid" }],
      purchases: [{ name: "Torch", cost: 2 }, { name: "Invalid", cost: -1 }],
    }, fallback);
    expect(value.events).toEqual([{ roll: 0, eventId: "40-41", source: "chosen" }]);
    expect(value.archivedEvents).toEqual([{ roll: 12, eventId: "11-12" }]);
    expect(value.purchases).toEqual([{ name: "Torch", cost: 2 }]);
  });

  test("migrates saved event text to catalogue identity and keeps actual random rolls", () => {
    const value = normalizeBackground({
      events: [{ roll: 69, text: "Copied catalogue paragraph", source: "rolled" }],
    }, fallback);
    expect(value.events).toEqual([{ roll: 69, eventId: "69-70", source: "rolled" }]);
  });

  test("preserves resolved social-class rules data in saved background records", () => {
    const value = normalizeBackground({
      socialClass: "Gentry", socialClassCulture: "Civilised", socialClassMethod: "chosen",
      socialClassMoney: 3, socialClassEquipment: "Tools; weapons; armour; mount", socialClassResources: "Farmstead",
    }, fallback);
    expect(value).toMatchObject({
      socialClass: "Gentry", socialClassCulture: "Civilised", socialClassMethod: "chosen",
      socialClassMoney: 3, socialClassEquipment: "Tools; weapons; armour; mount", socialClassResources: "Farmstead",
    });
  });

  test("defaults unknown persisted age categories", () => {
    expect(normalizeAgeCategory("unknown", "adult")).toBe("adult");
  });

  test("maps legacy age categories to the current rules", () => {
    expect(normalizeAgeCategory("Young", "adult")).toBe("young");
    expect(normalizeAgeCategory("Adult", "young")).toBe("adult");
    expect(normalizeAgeCategory("Middle-Aged", "adult")).toBe("middleAged");
  });
});
