import { describe, expect, test } from "bun:test";
import { passionStartingValue } from "../src/lib/calc";
import { deriveStats, dmgMod } from "../src/lib/calc";
import type { Chars, PassionCategory } from "../src/lib/rules";

const chars: Chars = { STR: 10, CON: 11, SIZ: 12, DEX: 13, INT: 14, POW: 15, CHA: 16 };

describe("Mythras Workbook starting Passion formulas", () => {
  const cases: [PassionCategory, { pow?: number; cha?: number }, number][] = [
    ["romantic/familial", { pow: 12, cha: 13 }, 55], // 30 + loved one's POW + CHA
    ["platonic", { cha: 13 }, 58], // 30 + character POW + subject CHA
    ["adverse", { cha: 13 }, 58], // 30 + character POW + subject CHA
    ["organisation/group", {}, 59], // 30 + character POW + INT
    ["race/species", {}, 60], // 30 + character POW x 2
    ["place/concept/ideal", {}, 59], // 30 + character POW + INT
    ["object/substance", {}, 60], // 30 + character POW x 2
  ];

  test.each(cases)("%s", (category, subject, expected) => {
    expect(passionStartingValue(category, chars, subject)).toBe(expected);
  });

  test("does not claim a value until required subject characteristics are entered", () => {
    expect(passionStartingValue("romantic/familial", chars)).toBeNull();
    expect(passionStartingValue("romantic/familial", chars, { pow: 12 })).toBeNull();
    expect(passionStartingValue("platonic", chars)).toBeNull();
    expect(passionStartingValue("adverse", chars)).toBeNull();
  });
});

const defaultChars = (overrides: Partial<Chars> = {}): Chars => ({
  STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10, ...overrides,
});
const stat = (name: string, c: Chars) => deriveStats(c).stats.find(([key]) => key === name)![1];

describe("derived characteristic tables", () => {
  test.each([
    [5, "-1d8"], [6, "-1d6"], [10, "-1d6"], [11, "-1d4"], [15, "-1d4"], [16, "-1d2"],
    [20, "-1d2"], [21, "+0"], [25, "+0"], [26, "+1d2"], [30, "+1d2"], [31, "+1d4"],
    [35, "+1d4"], [36, "+1d6"], [40, "+1d6"], [41, "+1d8"], [45, "+1d8"],
    [46, "+1d10"], [50, "+1d10"], [51, "+1d12"], [60, "+1d12"], [61, "+2d6"],
    [70, "+2d6"], [71, "+1d8+1d6"], [80, "+1d8+1d6"], [81, "+2d8"], [90, "+2d8"],
    [91, "+1d10+1d8"], [100, "+1d10+1d8"], [101, "+2d10"], [110, "+2d10"],
    [111, "+2d10+1d2"], [120, "+2d10+1d2"], [121, "+2d10+1d4"], [130, "+2d10+1d4"],
  ])("damage modifier at STR+SIZ %i", (total, expected) => {
    expect(dmgMod(total)).toBe(expected);
  });

  test.each([
    [12, 1], [13, 2], [24, 2], [25, 3], [36, 3], [37, 4], [48, 4], [49, 5],
  ])("action points at INT+DEX %i", (total, expected) => {
    expect(stat("Action Points", defaultChars({ INT: total - 10, DEX: 10 }))).toBe(expected);
  });

  test.each([
    [6, -1], [7, 0], [12, 0], [13, 1], [18, 1], [19, 2], [24, 2], [25, 3],
  ])("experience modifier at CHA %i", (cha, expected) => {
    expect(stat("Experience Mod", defaultChars({ CHA: cha }))).toBe(expected);
  });

  test.each([
    [3, 1], [6, 1], [7, 2], [12, 2], [13, 3], [18, 3], [19, 4], [24, 4],
  ])("healing rate at CON %i", (con, expected) => {
    expect(stat("Healing Rate", defaultChars({ CON: con }))).toBe(expected);
  });

  test.each([
    [3, 1], [6, 1], [7, 2], [12, 2], [13, 3], [18, 3], [19, 4], [24, 4],
  ])("luck points at POW %i", (pow, expected) => {
    expect(stat("Luck Points", defaultChars({ POW: pow }))).toBe(expected);
  });

  test.each([
    [5, [1, 2, 3, 1, 1]], [6, [2, 3, 4, 1, 2]], [10, [2, 3, 4, 1, 2]],
    [11, [3, 4, 5, 2, 3]], [15, [3, 4, 5, 2, 3]], [16, [4, 5, 6, 3, 4]],
    [20, [4, 5, 6, 3, 4]], [21, [5, 6, 7, 4, 5]], [25, [5, 6, 7, 4, 5]],
    [26, [6, 7, 8, 5, 6]], [30, [6, 7, 8, 5, 6]], [31, [7, 8, 9, 6, 7]],
    [35, [7, 8, 9, 6, 7]], [36, [8, 9, 10, 7, 8]], [40, [8, 9, 10, 7, 8]],
    [41, [9, 10, 11, 8, 9]], [45, [9, 10, 11, 8, 9]],
    [46, [10, 11, 12, 9, 10]], [50, [10, 11, 12, 9, 10]],
  ])("location HP at CON+SIZ %i", (total, expected) => {
    const locations = deriveStats(defaultChars({ CON: total - 10, SIZ: 10 })).loc;
    expect([locations[0].hp, locations[2].hp, locations[3].hp, locations[4].hp, locations[6].hp]).toEqual(expected);
  });

  test("uses 6m movement and rounds an odd INT+DEX average up for initiative", () => {
    const c = defaultChars({ INT: 13, DEX: 12 });
    expect(stat("Movement", c)).toBe("6m");
    expect(stat("Initiative", c)).toBe(13);
  });
});
