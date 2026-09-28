import { describe, expect, test } from "bun:test";
import { canVisitStep, isLandingView } from "../src/lib/navigation";

describe("step navigation", () => {
  test("cannot reach the sheet while culture allocation is incomplete", () => {
    expect(canVisitStep(8, true, false)).toBe(false);
  });

  test("can reach the sheet after characteristics and culture are complete", () => {
    expect(canVisitStep(8, true, true)).toBe(true);
  });
});

describe("landing and library navigation", () => {
  test("keeps the landing page behind the library so Back returns there", () => {
    expect(isLandingView(true, true)).toBe(false);
    expect(isLandingView(true, false)).toBe(true);
  });

  test("keeps the library visible when deleting the final character creates a home character", () => {
    expect(isLandingView(true, true)).toBe(false);
  });
});
