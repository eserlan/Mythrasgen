import { describe, expect, test } from "bun:test";
import { normalizeIdentityFields } from "./migrations";

describe("optional identity fields", () => {
  test("legacy saves receive blank descriptive values", () => {
    expect(normalizeIdentityFields({ id: "legacy", name: "Ari", race: "Human" })).toEqual({
      gender: "", homeland: "", handedness: "", description: "",
    });
  });

  test("saved descriptive values are preserved while malformed values become blank", () => {
    expect(normalizeIdentityFields({
      gender: "Nonbinary", homeland: "The coast", handedness: "Ambidextrous", description: "A weathered traveler.",
    })).toEqual({
      gender: "Nonbinary", homeland: "The coast", handedness: "Ambidextrous", description: "A weathered traveler.",
    });
    expect(normalizeIdentityFields({ gender: 3, homeland: null, handedness: [], description: false })).toEqual({
      gender: "", homeland: "", handedness: "", description: "",
    });
  });
});
