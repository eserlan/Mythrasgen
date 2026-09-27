import { describe, expect, test } from "bun:test";
import { migrateCharacter } from "../src/lib/migration";

describe("character migration", () => {
  test.each([
    [0, 1, "Citizen Militia"],
    [1, 0, "Tribal Warrior"],
    [2, 2, "Horse Archer"],
    [3, 2, "Boarding Party"],
  ])("migrates legacy culture %i to %i", (oldCulture, culture, combatStyle) => {
    const old = {
      culture: oldCulture,
      step: 4,
      alloc: { culture: { Athletics: 15 }, career: { Commerce: 10 }, bonus: {} },
      name: "Saved character",
    };
    expect(migrateCharacter(old)).toMatchObject({
      culture,
      step: 0,
      cultureSelections: { standard: [], professional: [], combatStyle },
      alloc: { culture: {}, career: { Commerce: 10 } },
      cultureMigration: true,
      name: old.name,
    });
  });

  test("leaves current-format characters untouched", () => {
    const current = { culture: 1, cultureSelections: { standard: [], professional: [], combatStyle: "" } };
    expect(migrateCharacter(current)).toBe(current);
  });

  test("does not treat an empty character as a legacy save", () => {
    const empty = {};
    expect(migrateCharacter(empty)).toBe(empty);
  });
});
