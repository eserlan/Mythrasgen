import { describe, expect, test } from "bun:test";
import { BACKGROUND_EVENT_COUNTS, backgroundEventText, calculateStartingMoney, isSocialClassResolvedForCulture, reconcileBackgroundEvents, resolvedBackgroundEvents, SOCIAL_CLASSES, socialClassForRoll } from "../src/lib/background-rules";
import { CORE_BACKGROUND_EVENTS, coreBackgroundEventForRange, coreBackgroundEventForRoll } from "../src/lib/background-events";

describe("Core Background Events catalogue", () => {
  test("contains all supplied rows and resolves each d100 result exactly once", () => {
    expect(CORE_BACKGROUND_EVENTS).toHaveLength(55);
    for (let roll = 1; roll <= 100; roll++) {
      const matches = CORE_BACKGROUND_EVENTS.filter(event => roll >= event.min && roll <= event.max);
      expect(matches).toHaveLength(1);
      expect(coreBackgroundEventForRoll(roll)).toBe(matches[0]);
    }
  });

  test("returns stable identity, display range, and text, including 100 as 99-00", () => {
    expect(coreBackgroundEventForRoll(100)).toEqual(CORE_BACKGROUND_EVENTS.at(-1));
    expect(coreBackgroundEventForRoll(100)?.range).toBe("99-00");
    expect(coreBackgroundEventForRoll(100)).toBe(coreBackgroundEventForRoll(99));
    expect(coreBackgroundEventForRoll(1)?.text).toContain("mistaken identity");
    expect(coreBackgroundEventForRoll(0)).toBeUndefined();
    expect(coreBackgroundEventForRoll(101)).toBeUndefined();
    expect(coreBackgroundEventForRoll(1.5)).toBeUndefined();
  });

  test("resolves canonical ranges back to their entries", () => {
    expect(coreBackgroundEventForRange("69-70")).toBe(coreBackgroundEventForRoll(69));
    expect(coreBackgroundEventForRange("99-00")).toBe(coreBackgroundEventForRoll(100));
    expect(coreBackgroundEventForRange("bogus")).toBeUndefined();
    expect(coreBackgroundEventForRange("")).toBeUndefined();
  });
});

describe("background event counts", () => {
  test("uses the age category event totals", () => {
    expect(BACKGROUND_EVENT_COUNTS).toEqual({ young: 0, adult: 1, middleAged: 2, senior: 3, old: 4 });
  });

  test("preserves displaced results and restores them when slots expand", () => {
    const resolved = [{ roll: 18, range: "18-19", source: "rolled" as const }, { roll: 0, range: "25", source: "chosen" as const }];
    const reduced = reconcileBackgroundEvents(resolved, [], 1);
    expect(reduced.events).toEqual([resolved[0]]);
    expect(reduced.archived).toEqual([resolved[1]]);
    expect(reconcileBackgroundEvents(reduced.events, reduced.archived, 2)).toEqual({ events: resolved, archived: [] });
  });

  test("creates empty slots without rolling an event", () => {
    expect(reconcileBackgroundEvents([], [], 2).events).toEqual([{ roll: 0, range: "" }, { roll: 0, range: "" }]);
  });

  test("does not retain unused blank slots when an age category has fewer events", () => {
    expect(reconcileBackgroundEvents([{ roll: 0, range: "" }], [], 0)).toEqual({ events: [], archived: [] });
  });

  test("resolves official event text from the canonical range", () => {
    expect(backgroundEventText({ roll: 69, range: "69-70" })).toBe(coreBackgroundEventForRoll(69)?.text);
    expect(backgroundEventText({ roll: 0, range: "99-00" })).toBe(coreBackgroundEventForRoll(100)?.text);
    expect(backgroundEventText({ roll: 0, range: "" })).toBe("");
  });

  test("keeps original slot numbers when unresolved events are omitted from the sheet", () => {
    expect(resolvedBackgroundEvents([{ roll: 0, range: "" }, { roll: 0, range: "40-41", source: "chosen" as const }]))
      .toEqual([{ event: { roll: 0, range: "40-41", source: "chosen" }, index: 1 }]);
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

  test("retain the official culture-specific result bands, modifiers, equipment and resources", () => {
    expect(SOCIAL_CLASSES.Civilised.map(({ min, max, name, money }) => [min, max, name, money])).toEqual([
      [1, 2, "Outcast", .25], [3, 20, "Slave", .5], [21, 70, "Freeman", 1],
      [71, 95, "Gentry", 3], [96, 99, "Aristocracy", 5], [100, 100, "Ruling", 10],
    ]);
    expect(SOCIAL_CLASSES.Barbarian.map(({ min, max, name, money }) => [min, max, name, money])).toEqual([
      [1, 5, "Outcast", .25], [6, 15, "Slave", .5], [16, 80, "Freeman", 1], [81, 95, "Gentry", 3], [96, 100, "Ruling", 5],
    ]);
    expect(SOCIAL_CLASSES.Nomadic.map(({ min, max, name, money }) => [min, max, name, money])).toEqual([
      [1, 5, "Outcast", .25], [6, 10, "Slave", .5], [11, 90, "Freeman", 1], [91, 100, "Ruling", 5],
    ]);
    expect(SOCIAL_CLASSES.Primitive.map(({ min, max, name, money }) => [min, max, name, money])).toEqual([
      [1, 5, "Outcast", .25], [6, 80, "Freeman", 1], [81, 100, "Ruling", 2],
    ]);
    expect(SOCIAL_CLASSES.Barbarian.at(-1)?.equipment).toBe("As Gentry, with several mounts");
    expect(SOCIAL_CLASSES.Nomadic.at(-1)?.possessions).toContain("boats or carts");
    expect(SOCIAL_CLASSES.Primitive.at(-1)?.possessions).toBe("Large hall; valuable trophies, skins or totems");
    expect(SOCIAL_CLASSES.Civilised.at(-1)?.possessions).toContain("fealty from a nation");
  });

  test("applies both culture and social-class starting-money multipliers", () => {
    expect(calculateStartingMoney(14, "Civilised", SOCIAL_CLASSES.Civilised[2].money)).toBe(1050);
    expect(calculateStartingMoney(14, "Barbarian", SOCIAL_CLASSES.Civilised[3].money)).toBe(2100);
    expect(calculateStartingMoney(14, "Primitive", SOCIAL_CLASSES.Primitive[2].money)).toBe(280);
  });

  test("maps a manually recorded social-class roll to its class", () => {
    expect(socialClassForRoll("Civilised", 20).name).toBe("Slave");
    expect(socialClassForRoll("Civilised", 21).name).toBe("Freeman");
  });

  test("keeps matching results valid and requires reconciliation when a culture changes the result", () => {
    const barbarianFreeman = SOCIAL_CLASSES.Barbarian[2];
    expect(isSocialClassResolvedForCulture("Civilised", {
      rank: barbarianFreeman.name, roll: 50, method: "rolled", money: barbarianFreeman.money,
      equipment: barbarianFreeman.equipment, resources: barbarianFreeman.possessions,
    })).toBe(true);
    const barbarianRuling = SOCIAL_CLASSES.Barbarian.at(-1)!;
    expect(isSocialClassResolvedForCulture("Civilised", {
      rank: barbarianRuling.name, roll: 99, method: "rolled", money: barbarianRuling.money,
      equipment: barbarianRuling.equipment, resources: barbarianRuling.possessions,
    })).toBe(false);
    expect(isSocialClassResolvedForCulture("Civilised", {
      rank: "Not a class", roll: 50, method: "chosen", money: 1, equipment: "", resources: "",
    })).toBe(false);
  });
});
