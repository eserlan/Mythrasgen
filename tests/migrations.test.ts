import { describe, expect, test } from "bun:test";
import { migrateCharacterStep, migrateCultureTables } from "../src/lib/migrations";

describe("legacy character step migration", () => {
  test("keeps old sheet saves on the sheet after inserting Background", () => {
    expect(migrateCharacterStep(5, false)).toBe(6);
  });

  test("leaves current background and sheet steps unchanged", () => {
    expect(migrateCharacterStep(5, true)).toBe(5);
    expect(migrateCharacterStep(6, true)).toBe(6);
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
