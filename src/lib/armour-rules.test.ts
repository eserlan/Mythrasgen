import { describe, expect, test } from "bun:test";
import { summarizeArmour, type ArmourPiece } from "./armour-rules";

const plate = (material: "iron" | "steel" = "iron"): ArmourPiece => ({
  id: "plate", construction: "half_plate", material,
  locations: ["Head", "Chest", "Abdomen", "Right Arm", "Left Arm", "Right Leg", "Left Leg"],
  state: "worn", fit: "fitted", compatibility: "compatible", coverageResolved: true,
});

describe("location armour calculations", () => {
  test("calculates seven-location iron and steel Half Plate without intermediate rounding", () => {
    expect(summarizeArmour([plate()])).toMatchObject({ fullWornEnc: 28, loadEnc: 14, initiativePenalty: 6 });
    expect(summarizeArmour([plate("steel")])).toMatchObject({ fullWornEnc: 21, loadEnc: 10.5, initiativePenalty: 5 });
  });

  test("uses the highest overlapping AP while counting every worn piece ENC", () => {
    const lower = { ...plate(), id: "mail", construction: "mail" as const, locations: ["Head"] as ["Head"] };
    const upper = { ...plate(), locations: ["Head"] as ["Head"] };
    expect(summarizeArmour([lower, upper])).toMatchObject({ apByLocation: { Head: 6 }, fullWornEnc: 9, loadEnc: 4.5 });
  });

  test("keeps missing construction, fit, and compatibility visible", () => {
    const unresolved: ArmourPiece = { ...plate(), construction: null, fit: "unresolved", compatibility: "unresolved" };
    expect(summarizeArmour([unresolved])).toMatchObject({ fullWornEnc: null, loadEnc: null, initiativePenalty: null });
    expect(summarizeArmour([unresolved]).unresolved.length).toBeGreaterThan(0);
  });

  test("carried armour adds full ENC but does not add a worn-armour initiative penalty", () => {
    expect(summarizeArmour([{ ...plate(), state: "carried" }])).toMatchObject({
      apByLocation: { Head: 0, Chest: 0, Abdomen: 0, "Right Arm": 0, "Left Arm": 0, "Right Leg": 0, "Left Leg": 0 },
      fullWornEnc: 0, loadEnc: 28, initiativePenalty: 0, unresolved: [],
    });
  });

  test("applies a GM ENC override per covered location", () => {
    expect(summarizeArmour([{ ...plate(), locations: ["Head", "Chest"], encOverride: 1.25 }]))
      .toMatchObject({ fullWornEnc: 2.5, loadEnc: 1.25 });
  });
});
