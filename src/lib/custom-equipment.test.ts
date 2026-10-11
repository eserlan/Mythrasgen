import { describe, expect, test } from "bun:test";
import { summarizeArmour } from "./armour-rules";
import { carriedLoad } from "./encumbrance";
import { customEquipmentInventoryItem, normalizeCustomEquipment, validateCustomEquipment, type CustomEquipmentDefinition } from "./custom-equipment";
import { normalizeInventoryState } from "./equipment-inventory";

const sword: CustomEquipmentDefinition = { id: "custom-sword", name: "Town sword", type: "weapon", description: "",
  priceCp: 1750, enc: 2, damage: "1d8", size: "Medium", reach: "Medium", ap: 6, hp: 10, hands: 1, traits: "", updatedAt: "2026-01-01" };

describe("character custom equipment", () => {
  test("validates type-specific fields and rejects malformed damage and negative values", () => {
    const { id: _id, updatedAt: _updatedAt, ...swordFields } = sword;
    expect(validateCustomEquipment(swordFields)).toEqual([]);
    expect(validateCustomEquipment({ ...sword, damage: "1d8xyz", enc: -1, priceCp: -10 })).toEqual(expect.arrayContaining([
      "Enter damage as a valid expression, such as 1d8.", "ENC must be zero or more, or blank if unknown.", "Price must be a whole number of CP or blank.",
    ]));
    expect(validateCustomEquipment({ name: "Tunic", type: "clothing", description: "", priceCp: null, enc: 1 })).toEqual([]);
  });

  test("creates an inventory snapshot with known ENC and custom armour protects selected locations only", () => {
    const ownedSword = customEquipmentInventoryItem(sword, "purchased", 1, "owned-sword");
    expect(carriedLoad([ownedSword])).toMatchObject({ load: 2, knownLoad: 2 });
    const armour: CustomEquipmentDefinition = { id: "custom-coat", name: "Iron coat", type: "armour", description: "",
      priceCp: null, enc: 2, ap: 6, protectedLocations: ["Chest", "Abdomen"], updatedAt: "2026-01-01" };
    const ownedArmour = customEquipmentInventoryItem(armour, "gifted", 1, "owned-coat");
    const saved = normalizeInventoryState({ inventory: [ownedArmour], equipmentTransactions: [] });
    const summary = summarizeArmour([{ id: "owned-coat", ...saved.inventory[0].armour! }]);
    expect(summary.apByLocation).toMatchObject({ Chest: 6, Abdomen: 6, Head: 0, "Right Arm": 0 });
    expect(carriedLoad(saved.inventory)).toMatchObject({ load: 2, knownLoad: 2 });
    expect(saved.inventory[0].customItem?.id).toBe(armour.id);
  });

  test("requires an explicit GM override for nonstandard custom armour materials", () => {
    const customArmour = { name: "Silk plate", type: "armour" as const, description: "", priceCp: null, enc: 2,
      ap: 4, protectedLocations: ["Chest" as const], construction: "plated_mail", material: "silk" };
    expect(validateCustomEquipment(customArmour)).toContain("This construction and material need an explicit GM compatibility override.");
    expect(validateCustomEquipment({ ...customArmour, gmCompatibilityOverride: true })).toEqual([]);
  });

  test("keeps missing price and ENC unresolved and drops duplicate saved definition IDs", () => {
    const clothing = { id: "custom-tunic", name: "Tunic", type: "clothing", description: "", priceCp: null, enc: null, updatedAt: "2026-01-01" };
    expect(normalizeCustomEquipment([clothing, clothing])).toHaveLength(1);
    const owned = customEquipmentInventoryItem(clothing as CustomEquipmentDefinition, "granted", 1, "owned-tunic");
    expect(owned).toMatchObject({ encPerUnit: null, encSource: "unresolved" });
    expect(carriedLoad([owned])).toMatchObject({ load: null, knownLoad: 0, unresolvedItems: ["Tunic"] });
  });
});
