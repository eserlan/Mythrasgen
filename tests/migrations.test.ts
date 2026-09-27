import { describe, expect, test } from "bun:test";
import { migrateCharacterStep } from "../src/lib/migrations";

describe("legacy character step migration", () => {
  test("keeps old sheet saves on the sheet after inserting Background", () => {
    expect(migrateCharacterStep(5, false)).toBe(6);
  });

  test("leaves current background and sheet steps unchanged", () => {
    expect(migrateCharacterStep(5, true)).toBe(5);
    expect(migrateCharacterStep(6, true)).toBe(6);
  });
});
