import { describe, expect, test } from "bun:test";
import { BACKGROUND_EVENT_COUNTS, calculateStartingMoney, reconcileBackgroundEvents, setBackgroundEventResult, SOCIAL_CLASSES, socialClassForRoll } from "../src/lib/background-rules";

describe("background event counts", () => {
  test("uses the age category event totals", () => {
    expect(BACKGROUND_EVENT_COUNTS).toEqual({ young: 0, adult: 1, middleAged: 2, senior: 3, old: 4 });
  });

  test("preserves displaced results and restores them when slots expand", () => {
    const resolved = [{ roll: 18, text: "Recorded event", source: "rolled" as const }, { roll: 27, text: "Another event", source: "chosen" as const }];
    const reduced = reconcileBackgroundEvents(resolved, [], 1);
    expect(reduced.events).toEqual([resolved[0]]);
    expect(reduced.archived).toEqual([resolved[1]]);
    expect(reconcileBackgroundEvents(reduced.events, reduced.archived, 2)).toEqual({ events: resolved, archived: [] });
  });

  test("creates empty slots without rolling an event", () => {
    expect(reconcileBackgroundEvents([], [], 2).events).toEqual([{ roll: 0, text: "" }, { roll: 0, text: "" }]);
  });

  test("does not retain unused blank slots when an age category has fewer events", () => {
    expect(reconcileBackgroundEvents([{ roll: 0, text: "" }], [], 0)).toEqual({ events: [], archived: [] });
  });

  test("keeps text entered before resolving an event slot", () => {
    expect(setBackgroundEventResult({ roll: 0, text: "Recorded before rolling" }, 42, "rolled"))
      .toEqual({ roll: 42, text: "Recorded before rolling", source: "rolled" });
  });

  test("clears text when the resolved result changes", () => {
    expect(setBackgroundEventResult({ roll: 41, text: "Old event" }, 42, "chosen"))
      .toEqual({ roll: 42, text: "", source: "chosen" });
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
