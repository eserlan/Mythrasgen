import { describe, expect, test } from "bun:test";
import { ARMOUR_CONSTRUCTIONS, armourEncumbrance, armourMaterialCompatibility, summarizeArmour, type ArmourPiece } from "./armour-rules";

const plate = (material: "iron" | "steel" = "iron"): ArmourPiece => ({
  id: "plate", construction: "half_plate", material,
  locations: ["Head", "Chest", "Abdomen", "Right Arm", "Left Arm", "Right Leg", "Left Leg"],
  state: "worn", fit: "fitted", compatibility: "compatible", coverageResolved: true,
});

describe("location armour calculations", () => {
  test("retains the Core construction AP sequence", () => {
    expect(Object.values(ARMOUR_CONSTRUCTIONS).map(construction => construction.ap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("applies Core material multipliers without rounding fractional ENC early", () => {
    expect(armourEncumbrance("plated_mail", "iron")).toBe(6);
    expect(armourEncumbrance("plated_mail", "steel")).toBe(4.5);
    expect(summarizeArmour([{ ...plate(), construction: "plated_mail", material: "steel" }]))
      .toMatchObject({ fullWornEnc: 31.5, loadEnc: 15.75, initiativePenalty: 7 });
  });

  test("enforces construction notes and keeps GM material overrides explicit", () => {
    expect(armourMaterialCompatibility("half_plate", "leather")).toBe("compatible");
    expect(armourMaterialCompatibility("mail", "leather")).toBe("incompatible");
    expect(armourMaterialCompatibility("plated_mail", "silk")).toBe("incompatible");
  });

  test("calculates seven-location iron and steel Half Plate without intermediate rounding", () => {
    expect(summarizeArmour([plate()])).toMatchObject({ fullWornEnc: 28, loadEnc: 14, initiativePenalty: 6 });
    expect(summarizeArmour([plate("steel")])).toMatchObject({ fullWornEnc: 21, loadEnc: 10.5, initiativePenalty: 5 });
  });

  test("catalogue Half Plate AP protects only selected locations and material changes ENC only", () => {
    const halfPlate = { ...plate("iron"), locations: ["Chest", "Abdomen", "Right Arm", "Left Arm"] as ArmourPiece["locations"] };
    const iron = summarizeArmour([halfPlate]);
    const steel = summarizeArmour([{ ...halfPlate, material: "steel" }]);
    for (const location of halfPlate.locations) {
      expect(iron.apByLocation[location]).toBe(5);
      expect(steel.apByLocation[location]).toBe(5);
    }
    expect(iron.apByLocation.Head).toBe(0);
    expect(iron.fullWornEnc).toBe(16);
    expect(steel.fullWornEnc).toBe(12);
  });

  test("fit warnings use a readable name and unresolved fit grants no protection", () => {
    const summary = summarizeArmour([{ ...plate(), id: "aaf8c360-42d8-4b2a-a06c-7093466715cf-1", name: "Half Plate", fit: "unresolved",
      locations: ["Chest", "Abdomen", "Right Arm", "Left Arm"] }]);
    expect(summary.apByLocation.Chest).toBeNull();
    expect(summary.unresolved.join("; ")).toContain("Half Plate: armour fit needs attention. Open Armour locations and fit, then check the armour's size and fit settings.");
    expect(summary.unresolved.join("; ")).not.toContain("aaf8c360-42d8-4b2a-a06c-7093466715cf");
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

  test("keeps carried armour load unknown until its covered locations are resolved", () => {
    expect(summarizeArmour([{ ...plate(), state: "carried", locations: [], coverageResolved: false }]))
      .toMatchObject({ fullWornEnc: 0, loadEnc: null });
    expect(summarizeArmour([{ ...plate(), state: "carried", locations: [], coverageResolved: false }]).unresolved[0]).toContain("armour coverage needs attention");
  });

  test("applies a GM ENC override per covered location", () => {
    expect(summarizeArmour([{ ...plate(), locations: ["Head", "Chest"], encOverride: 1.25 }]))
      .toMatchObject({ fullWornEnc: 2.5, loadEnc: 1.25 });
  });
});
