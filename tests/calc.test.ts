import { describe, expect, test } from "bun:test";
import { passionStartingValue } from "../src/lib/calc";
import type { Chars, PassionCategory } from "./rules";

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
});
