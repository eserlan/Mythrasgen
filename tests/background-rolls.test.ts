import { describe, expect, test } from "bun:test";
import {
  CORE_BACKGROUND_EVENTS,
  coreBackgroundEventForRoll,
  rollUniqueCoreBackgroundEvent,
} from "../src/lib/background-events";

describe("rollUniqueCoreBackgroundEvent", () => {
  test("returns a valid roll resolving to the returned event", () => {
    for (let i = 0; i < 50; i++) {
      const { roll, event } = rollUniqueCoreBackgroundEvent([]);
      expect(Number.isInteger(roll)).toBe(true);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(100);
      expect(coreBackgroundEventForRoll(roll)).toBe(event);
    }
  });

  test("never returns an event already held in another slot", () => {
    const taken = ["18-19", "25", "69-70"];
    for (let i = 0; i < 50; i++) {
      const { event } = rollUniqueCoreBackgroundEvent(taken);
      expect(taken).not.toContain(event.range);
    }
  });

  test("treats distinct rolls in the same range as the same event", () => {
    // rng 0.035 -> roll 4, which is range 03-04; excluding that range must skip it.
    expect(rollUniqueCoreBackgroundEvent(["03-04"], () => 0.035).event.range).not.toBe("03-04");
    // Unknown ranges in the exclusion list are ignored.
    const { event } = rollUniqueCoreBackgroundEvent(["bogus"], () => 0.035);
    expect(event.range).toBe("03-04");
  });

  test("honours the provided rng", () => {
    expect(rollUniqueCoreBackgroundEvent([], () => 0)).toEqual({
      roll: 1,
      event: coreBackgroundEventForRoll(1),
    });
    expect(rollUniqueCoreBackgroundEvent([], () => 0.9999).roll).toBe(100);
  });

  test("falls back to a valid event when every entry is taken", () => {
    const all = CORE_BACKGROUND_EVENTS.map(entry => entry.range);
    const { roll, event } = rollUniqueCoreBackgroundEvent(all, () => 0.42);
    expect(Number.isInteger(roll)).toBe(true);
    expect(coreBackgroundEventForRoll(roll)).toBe(event);
  });
});
