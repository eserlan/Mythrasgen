import { describe, expect, test } from "bun:test";
import { sheetEquipmentSummary } from "./sheet-equipment";
import type { InventoryItem, InventoryTransaction } from "./equipment-inventory";

const armour: InventoryItem = {
  id: "mail", catalogueId: "armour-mail", sourceIds: ["armour-mail"], name: "Mail",
  quantity: 1, acquiredAs: "gifted", state: "worn", encPerUnit: null, encSource: "unresolved",
  armour: { construction: "mail", material: "iron", locations: ["Chest"], coverageResolved: true,
    state: "worn", fit: "fitted", compatibility: "compatible" },
};
const ledger: InventoryTransaction[] = [
  { id: "p", kind: "purchase", catalogueId: "rope", name: "Rope", quantity: 1, amountCp: 75,
    amountSource: "catalogue_candidate", catalogueVersion: "test", recordedAt: "2026-01-01" },
  { id: "r", kind: "refund", catalogueId: "rope", name: "Rope", quantity: 1, amountCp: 15,
    amountSource: "gm_entered", catalogueVersion: "test", recordedAt: "2026-01-02", relatedTransactionId: "p" },
];

describe("Page IX equipment summary", () => {
  test("uses persisted equipment, shared armour/load rules, and the CP ledger", () => {
    const result = sheetEquipmentSummary([armour], 10, 100, ledger);
    expect(result.funds).toEqual({ startingCp: 1000, spentCp: 60, remainingCp: 940 });
    expect(result.armour.apByLocation.Chest).toBe(6);
    expect(result.armour.apByLocation.Head).toBe(0);
    expect(result.armour.initiativePenalty).toBe(1);
    expect(result.load.load).toBe(2.5);
    expect(result.load.band).toBe("unburdened");
  });

  test("keeps unknown ENC and unresolved worn armour out of exact totals", () => {
    const unknownItem: InventoryItem = {
      id: "unknown", catalogueId: null, sourceIds: [], name: "Unknown item", quantity: 1,
      acquiredAs: "legacy", state: "carried", encPerUnit: null, encSource: "unresolved",
    };
    const unresolvedArmour = { ...armour, armour: { ...armour.armour!, material: null, fit: "unresolved" as const } };
    const result = sheetEquipmentSummary([unknownItem, unresolvedArmour], 10, 0, []);
    expect(result.load.load).toBeNull();
    expect(result.load.knownLoad).toBe(0);
    expect(result.load.band).toBe("unknown");
    expect(result.armour.apByLocation.Chest).toBeNull();
    expect(result.armour.initiativePenalty).toBeNull();
  });
});
