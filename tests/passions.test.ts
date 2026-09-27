import { describe, expect, test } from "bun:test";
import { clearCopiedSubjectStats, passionRemovalLabel } from "../src/lib/passions";

describe("Passion removal accessible names", () => {
  test("identifies each row and its subject, including blank subjects", () => {
    expect(passionRemovalLabel("Loyalty", "Town", 0)).toBe("Remove passion 1: Loyalty (Town)");
    expect(passionRemovalLabel("Love", "", 1)).toBe("Remove passion 2: Love (unnamed)");
  });
});

describe("legacy Passion subject stats", () => {
  test("clears copied character stats while preserving distinct entered subject stats", () => {
    const passions = clearCopiedSubjectStats([
      { subject: "Seeded", subjectPow: 14, subjectCha: 12 },
      { subject: "Entered", subjectPow: 16, subjectCha: 13 },
    ], { POW: 14, CHA: 12 });

    expect(passions).toEqual([
      { subject: "Seeded", subjectPow: undefined, subjectCha: undefined },
      { subject: "Entered", subjectPow: 16, subjectCha: 13 },
    ]);
  });
});
