import { describe, expect, test } from "bun:test";
import { rollUniqueBackgroundResult } from "../src/lib/background-rules";

describe("rollUniqueBackgroundResult", () => {
  test("returns a valid d100 result", () => {
    for (let i = 0; i < 50; i++) {
      const roll = rollUniqueBackgroundResult([]);
      expect(Number.isInteger(roll)).toBe(true);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(100);
    }
  });

  test("avoids results already held in other slots", () => {
    const taken = [18, 27, 42];
    for (let i = 0; i < 50; i++) {
      expect(taken).not.toContain(rollUniqueBackgroundResult(taken));
    }
  });

  test("ignores invalid and unresolved entries", () => {
    // 0 means unresolved; only 42 is really taken.
    for (let i = 0; i < 50; i++) {
      const roll = rollUniqueBackgroundResult([0, 0, 42, -5, 101, 1.5, NaN]);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(100);
    }
    // With a stub rng, an invalid-heavy list still resolves deterministically.
    expect(rollUniqueBackgroundResult([0, -1, 101], () => 0)).toBe(1);
  });

  test("honours the provided rng", () => {
    expect(rollUniqueBackgroundResult([], () => 0)).toBe(1);
    expect(rollUniqueBackgroundResult([], () => 0.9999)).toBe(100);
    // A taken result is skipped via reroll.
    expect(rollUniqueBackgroundResult([1], () => 0)).toBeGreaterThanOrEqual(2);
  });

  test("falls back to a valid roll when every result is taken", () => {
    const all = Array.from({ length: 100 }, (_, i) => i + 1);
    const roll = rollUniqueBackgroundResult(all, () => 0.42);
    expect(Number.isInteger(roll)).toBe(true);
    expect(roll).toBeGreaterThanOrEqual(1);
    expect(roll).toBeLessThanOrEqual(100);
  });
});
