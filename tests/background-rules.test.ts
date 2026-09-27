import { describe, expect, test } from "bun:test";
import { BACKGROUND_EVENT_COUNTS, calculateStartingMoney, SOCIAL_CLASSES, socialClassForRoll } from "../src/lib/background-rules";

describe("background event counts", () => {
  test("uses the age category event totals", () => {
    expect(BACKGROUND_EVENT_COUNTS).toEqual({ young: 0, adult: 1, middleAged: 2, senior: 3, old: 4 });
  });
});

describe("social class tables", () => {
  test("cover each percentile result once for every community type", () => {
    for (const [kind, rows] of Object.entries(SOCIAL_CLASSES) as [keyof typeof SOCIAL_CLASSES, typeof SOCIAL_CLASSES[keyof typeof SOCIAL_CLASSES]][]) {
      const results = Array.from({ length: 100 }, (_, index) => socialClassForRoll(kind, index + 1));
      expect(results.every(Boolean)).toBe(true);
      expect(rows[0].min).toBe(1);
      expect(rows.at(-1)?.max).toBe(100);
      for (let roll = 1; roll <= 100; roll++) {
        expect(rows.filter(row => roll >= row.min && roll <= row.max)).toHaveLength(1);
      }
    }
  });

  test("applies both culture and social-class starting-money multipliers", () => {
    expect(calculateStartingMoney(14, "Civilised", "Civilised", "Freeman")).toBe(1050);
    expect(calculateStartingMoney(14, "Barbarian", "Civilised", "Gentry")).toBe(2100);
    expect(calculateStartingMoney(14, "Primitive", "Primitive", "Ruling")).toBe(280);
  });

  test("maps a manually recorded social-class roll to its class", () => {
    expect(socialClassForRoll("Civilised", 20).name).toBe("Slave");
    expect(socialClassForRoll("Civilised", 21).name).toBe("Freeman");
  });
});
