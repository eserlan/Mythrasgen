import { describe, expect, test } from "bun:test";
import { availableFrames, bodyRanges, FRAMES, HUMAN_BODY_TABLE, isInRange, reconcileMeasurements } from "./body";

describe("official human SIZ body ranges", () => {
  test.each(Object.entries(HUMAN_BODY_TABLE).map(([siz, row]) => [Number(siz), row] as const))(
    "SIZ %i height bounds are inclusive",
    (siz, row) => {
      expect(isInRange(row.height.min, row.height)).toBe(true);
      expect(isInRange(row.height.max, row.height)).toBe(true);
      expect(isInRange(row.height.min - 1, row.height)).toBe(false);
      expect(isInRange(row.height.max + 1, row.height)).toBe(false);
      expect(bodyRanges(siz, "Medium")?.height).toEqual(row.height);
    },
  );

  test.each(Object.entries(HUMAN_BODY_TABLE).flatMap(([siz, row]) => FRAMES.map(frame => [Number(siz), frame, row.weight[frame]] as const)))(
    "SIZ %i %s weight bounds are inclusive",
    (siz, frame, range) => {
      expect(bodyRanges(siz, frame)?.weight).toEqual(range);
      expect(isInRange(range.min, range)).toBe(true);
      expect(isInRange(range.max, range)).toBe(true);
      expect(isInRange(range.min - 1, range)).toBe(false);
      expect(isInRange(range.max + 1, range)).toBe(false);
    },
  );

  test("only accepts integer values and supports future frame restrictions", () => {
    expect(isInRange(160.5, { min: 150, max: 170 })).toBe(false);
    expect(availableFrames()).toEqual(["Lithe", "Medium", "Heavy"]);
    expect(availableFrames(["Heavy"])).toEqual(["Heavy"]);
  });

  test("clears only measurements invalidated by the new table row or frame", () => {
    expect(reconcileMeasurements(161, 67, bodyRanges(10, "Medium"))).toEqual({ height: 161, weight: 67, cleared: [] });
    expect(reconcileMeasurements(161, 67, bodyRanges(10, "Lithe"))).toEqual({ height: 161, weight: null, cleared: ["weight"] });
    expect(reconcileMeasurements(161, 67, bodyRanges(8, "Medium"))).toEqual({ height: null, weight: null, cleared: ["height", "weight"] });
  });
});
