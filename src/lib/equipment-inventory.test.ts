import { describe, expect, test } from "bun:test";
import { EQUIPMENT_CATALOGUE } from "./equipment-catalogue";
import { addExpense, addGift, addPurchase, changeInventoryItem, ledgerSpentCp, normalizeInventoryState, reconcileBalance, refundPurchase, removeInventoryItem, type InventoryState } from "./equipment-inventory";

const item = (id: string) => {
  const found = EQUIPMENT_CATALOGUE.find(entry => entry.source.id === id);
  if (!found) throw new Error(`Fixture not found: ${id}`);
  return found.source;
};
const blank = (): InventoryState => ({ inventory: [], equipmentTransactions: [] });

describe("Page VIII equipment ledger", () => {
  test("purchases a known-price quantity in integer CP and preserves transaction snapshot", () => {
    const state = addPurchase(blank(), item("one_handed-dagger"), 3, undefined, "2026-01-02T03:04:05.000Z");
    expect(state.inventory[0].quantity).toBe(3);
    expect(state.equipmentTransactions[0]).toMatchObject({ amountCp: 900, amountSource: "catalogue_candidate",
      catalogueVersion: expect.any(String), recordedAt: "2026-01-02T03:04:05.000Z" });
    expect(reconcileBalance(100, state.equipmentTransactions)).toEqual({ startingCp: 1000, spentCp: 900, remainingCp: 100 });
  });

  test("requires a GM amount for unknown prices and records explicit zero distinctly", () => {
    const unknown = EQUIPMENT_CATALOGUE.find(entry => entry.source.price_cp_candidate === null)!.source;
    expect(() => addPurchase(blank(), unknown, 1)).toThrow("price unavailable");
    const zero = addPurchase(blank(), unknown, 2, 0);
    expect(zero.equipmentTransactions[0]).toMatchObject({ amountCp: 0, amountSource: "gm_entered", quantity: 2 });
  });

  test("gifts do not spend money and two profiles for one physical item share one possession", () => {
    const first = item("one_handed-battleaxe");
    const second = item("two_handed-battleaxe");
    let state = addGift(blank(), first, 1, "inherited");
    state = addGift(state, second, 2, "inherited");
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0].quantity).toBe(3);
    expect(state.inventory[0].sourceIds).toEqual([first.id, second.id]);
    expect(ledgerSpentCp(state.equipmentTransactions)).toBe(0);
  });

  test("removal does not refund; an explicit refund is a separate transaction", () => {
    let state = addPurchase(blank(), item("one_handed-dagger"), 1);
    const purchase = state.equipmentTransactions[0];
    state = removeInventoryItem(state, state.inventory[0].id);
    expect(state.equipmentTransactions).toHaveLength(1);
    state = refundPurchase(state, purchase.id, 100);
    expect(state.equipmentTransactions[1]).toMatchObject({ kind: "refund", amountCp: 100, amountSource: "gm_entered" });
    expect(ledgerSpentCp(state.equipmentTransactions)).toBe(200);
    expect(() => refundPurchase(state, purchase.id, 201)).toThrow("Refund exceeds the amount paid");
  });

  test("expenses have no inventory and reduced starting funds retain a visible deficit", () => {
    const state = addExpense(blank(), item("accommodation-private-room"), 1, 500);
    expect(state.inventory).toHaveLength(0);
    expect(reconcileBalance(20, state.equipmentTransactions).remainingCp).toBe(-300);
  });

  test("normalization preserves saved items and immutable transaction history", () => {
    const original = addPurchase(blank(), item("one_handed-dagger"), 2, undefined, "2026-01-02T03:04:05.000Z");
    const restored = normalizeInventoryState(structuredClone(original));
    expect(restored).toEqual(original);
  });

  test("persists armour coverage and fit, and keeps inventory state synchronized", () => {
    let state = addPurchase(blank(), item("armour-half-plate"), 1);
    const owned = state.inventory[0];
    state = changeInventoryItem(state, owned.id, { armour: {
      material: "steel", locations: ["Head", "Chest"], coverageResolved: true, fit: "fitted", compatibility: "compatible", encOverride: 1.25,
    } });
    state = changeInventoryItem(state, owned.id, { state: "carried" });
    const restored = normalizeInventoryState(structuredClone(state));
    expect(restored.inventory[0]).toMatchObject({ state: "carried", armour: {
      construction: "half_plate", material: "steel", locations: ["Head", "Chest"], state: "carried", fit: "fitted",
      encOverride: 1.25,
    } });
  });
});
