import { describe, expect, test } from "bun:test";
import { canFinishPointBuy, roll, rollStat } from "./calc";
import { CHAR_ROLL, POINT_BUY, STATS, pointBuyMin } from "./rules";

const chars = (values = {}) => Object.fromEntries(STATS.map(stat => [stat, values[stat] ?? pointBuyMin(stat)]));

describe("human characteristics", () => {
  test("point-buy uses 75 points and the correct per-stat bounds", () => {
    expect(POINT_BUY.budget).toBe(75);
    expect(POINT_BUY.max).toBe(18);
    for (const stat of ["STR", "CON", "DEX", "POW", "CHA"]) expect(pointBuyMin(stat)).toBe(3);
    expect(pointBuyMin("INT")).toBe(8);
    expect(pointBuyMin("SIZ")).toBe(8);
    expect(POINT_BUY.max).toBe(18);
  });

  test("point-buy only completes when all 75 points are spent", () => {
    const complete = { STR: 13, CON: 10, SIZ: 8, DEX: 10, INT: 8, POW: 13, CHA: 13 };
    expect(Object.values(complete).reduce((sum, value) => sum + value, 0)).toBe(75);
    expect(canFinishPointBuy(complete)).toBe(true);
    expect(canFinishPointBuy(chars())).toBe(false);
    expect(canFinishPointBuy({ ...complete, STR: 14 })).toBe(false);
    expect(canFinishPointBuy({ ...complete, INT: 7, CHA: 14 })).toBe(false);
    expect(canFinishPointBuy({ ...complete, STR: 19, CHA: 7 })).toBe(false);
  });

  test("human rolls use five 3d6 and two 2d6+6 results", () => {
    expect(CHAR_ROLL).toEqual({ STR: "3d6", CON: "3d6", SIZ: "2d6+6", DEX: "3d6", INT: "2d6+6", POW: "3d6", CHA: "3d6" });
    expect(roll("3d6", () => 0)).toBe(3);
    expect(roll("3d6", () => 0.999)).toBe(18);
    expect(roll("2d6+6", () => 0)).toBe(8);
    expect(roll("2d6+6", () => 0.999)).toBe(18);
    const rolls = [0, 0.5, 0.999];
    expect(rollStat("STR", () => rolls.shift())).toBe(11);
    expect(rollStat("INT", () => 0.5)).toBe(14);
  });
});
