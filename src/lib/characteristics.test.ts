import { describe, expect, test } from "bun:test";
import { deriveStats } from "./calc";
import { canSwapCharacteristics, swapAssignedValues, swapCancellationAnnouncement } from "./characteristics";
import { bodyRanges, reconcileMeasurements } from "./body";
import { STATS, type Chars } from "./rules";

const values = (): Chars => ({ STR: 11, CON: 8, SIZ: 12, DEX: 10, INT: 16, POW: 9, CHA: 13 });

describe("rolled characteristic swaps", () => {
  test.each([
    ["STR", "CON"], ["STR", "DEX"], ["STR", "POW"], ["STR", "CHA"],
    ["CON", "DEX"], ["CON", "POW"], ["CON", "CHA"],
    ["DEX", "POW"], ["DEX", "CHA"], ["POW", "CHA"],
    ["SIZ", "INT"],
  ] as const)("allows %s ↔ %s within the same dice group", (first, second) => {
    expect(canSwapCharacteristics(first, second)).toBe(true);
    const chars = values();
    const assignments = STATS.map((_, index) => index);
    expect(swapAssignedValues(chars, assignments, first, second)).toBe(true);
  });

  test.each([
    ["STR", "SIZ"], ["STR", "INT"], ["CON", "SIZ"], ["CON", "INT"],
    ["DEX", "SIZ"], ["DEX", "INT"], ["POW", "SIZ"], ["POW", "INT"],
    ["CHA", "SIZ"], ["CHA", "INT"],
  ] as const)("rejects %s ↔ %s across dice groups", (first, second) => {
    const chars = values();
    const original = { ...chars };
    const assignments = STATS.map((_, index) => index);
    const originalAssignments = [...assignments];
    expect(canSwapCharacteristics(first, second)).toBe(false);
    expect(swapAssignedValues(chars, assignments, first, second)).toBe(false);
    expect(chars).toEqual(original);
    expect(assignments).toEqual(originalAssignments);
  });

  test("only announces cancellation when reroll clears an active swap selection", () => {
    expect(swapCancellationAnnouncement(true)).toBe("Swap selection cancelled.");
    expect(swapCancellationAnnouncement(false)).toBe("");
  });

  test("exchanges two current values and their assignments without changing the roll results", () => {
    const chars = values();
    const rollResults = [...STATS.map(stat => chars[stat])];
    const assignments = STATS.map((_, index) => index);

    expect(swapAssignedValues(chars, assignments, "STR", "CON")).toBe(true);
    expect(chars.STR).toBe(8);
    expect(chars.CON).toBe(11);
    expect(assignments.slice(0, 2)).toEqual([1, 0]);
    expect(rollResults).toEqual([11, 8, 12, 10, 16, 9, 13]);
  });

  test("swapping SIZ with INT updates derived characteristics and SIZ-based body ranges", () => {
    const chars = values();
    const assignments = STATS.map((_, index) => index);
    const before = deriveStats(chars).stats;

    expect(swapAssignedValues(chars, assignments, "SIZ", "INT")).toBe(true);
    expect(chars.SIZ).toBe(16);
    expect(chars.INT).toBe(12);
    expect(assignments[STATS.indexOf("SIZ")]).toBe(STATS.indexOf("INT"));
    expect(deriveStats(chars).stats).not.toEqual(before);
    expect(bodyRanges(chars.SIZ, "Medium")).not.toEqual(bodyRanges(12, "Medium"));
    expect(reconcileMeasurements(173, 80, bodyRanges(chars.SIZ, "Medium"))).toEqual({
      height: null, weight: null, cleared: ["height", "weight"],
    });
  });

  test("same-card and invalid assignments do not change values", () => {
    const chars = values();
    const original = { ...chars };
    const assignments = STATS.map((_, index) => index);

    expect(swapAssignedValues(chars, assignments, "INT", "INT")).toBe(false);
    expect(swapAssignedValues(chars, assignments.slice(0, -1), "INT", "SIZ")).toBe(false);
    expect(chars).toEqual(original);
  });
});
