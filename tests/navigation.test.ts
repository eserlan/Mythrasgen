import { describe, expect, test } from "bun:test";
import { canVisitStep } from "../src/lib/navigation";

describe("step navigation", () => {
  test("cannot reach the sheet while culture allocation is incomplete", () => {
    expect(canVisitStep(5, true, false)).toBe(false);
  });

  test("can reach the sheet after characteristics and culture are complete", () => {
    expect(canVisitStep(5, true, true)).toBe(true);
  });
});
