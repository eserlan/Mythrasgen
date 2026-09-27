import { describe, expect, test } from "bun:test";
import { normalizeAge, rollAge } from "../src/lib/calc.ts";
import { AGE_CATEGORIES, ageRollBounds, bonusCap, bonusPool } from "../src/lib/rules.ts";

const expected = [
  ["young", 100, 10, 0, false, [11, 16]],
  ["adult", 150, 15, 1, false, [17, 27]],
  ["middleAged", 200, 20, 2, false, [28, 43]],
  ["senior", 250, 25, 3, true, [44, 64]],
  ["old", 300, 30, 4, true, [65, 90]],
];

describe("age categories", () => {
  for (const [key, pool, cap, events, ageing, bounds] of expected) {
    test(`${AGE_CATEGORIES[key].label} rules and age roll`, () => {
      expect(bonusPool(key)).toBe(pool);
      expect(bonusCap(key)).toBe(cap);
      expect(AGE_CATEGORIES[key].backgroundEvents).toBe(events);
      expect(AGE_CATEGORIES[key].ageing).toBe(ageing);
      expect(ageRollBounds(key)).toEqual(bounds);
      for (let i = 0; i < 100; i++) {
        expect(rollAge(key)).toBeGreaterThanOrEqual(bounds[0]);
        expect(rollAge(key)).toBeLessThanOrEqual(bounds[1]);
      }
    });
  }

  test("normalizes ages outside the selected category's integer bounds", () => {
    expect(normalizeAge(17, "adult", () => 0)).toBe(17);
    expect(normalizeAge(16, "adult", () => 0)).toBe(17);
    expect(normalizeAge(28, "adult", () => 0)).toBe(17);
    expect(normalizeAge(20.5, "adult", () => 0)).toBe(17);
    expect(normalizeAge(Number.NaN, "adult", () => 0)).toBe(17);
  });
});
