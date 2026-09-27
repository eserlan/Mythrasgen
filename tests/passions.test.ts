import { describe, expect, test } from "bun:test";
import { passionRemovalLabel } from "../src/lib/passions";

describe("Passion removal accessible names", () => {
  test("identifies each row and its subject, including blank subjects", () => {
    expect(passionRemovalLabel("Loyalty", "Town", 0)).toBe("Remove passion 1: Loyalty (Town)");
    expect(passionRemovalLabel("Love", "", 1)).toBe("Remove passion 2: Love (unnamed)");
  });
});
