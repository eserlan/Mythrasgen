import { describe, expect, test } from "bun:test";
import { EQUIPMENT_CATALOGUE } from "./equipment-catalogue";
import { HIT_LOCATIONS, summarizeArmour } from "./armour-rules";
import { carriedLoad } from "./encumbrance";
import { addExpense, addGift, addPurchase, changeInventoryItem, ledgerSpentCp, moveInventoryItem, normalizeInventoryOrder, normalizeInventoryState, reconcileBalance, refundPurchase, removeInventoryItem, type InventoryState } from "./equipment-inventory";

const item = (id: string) => {
  const found = EQUIPMENT_CATALOGUE.find(entry => entry.source.id === id);
  if (!found) throw new Error(`Fixture not found: ${id}`);
  return found.source;
};
const blank = (): InventoryState => ({ inventory: [], equipmentTransactions: [] });

describe("Page VIII equipment ledger", () => {
  test("moves only adjacent owned equipment positions and normalizes legacy ordering", () => {
    const state = addGift(addGift(addGift(blank(), item("one_handed-dagger"), 1, "gifted"), item("one_handed-broadsword"), 2, "gifted"), item("one_handed-battleaxe"), 1, "gifted");
    const original = structuredClone(state);
    const ids = state.inventory.map(owned => owned.id);
    expect(normalizeInventoryOrder(undefined, state.inventory)).toEqual(ids);
    expect(moveInventoryItem(state.inventory, ids, ids[1], -1)).toEqual([ids[1], ids[0], ids[2]]);
    expect(moveInventoryItem(state.inventory, ids, ids[1], 1)).toEqual([ids[0], ids[2], ids[1]]);
    expect(moveInventoryItem(state.inventory, ids, ids[0], -1)).toEqual(ids);
    expect(moveInventoryItem(state.inventory, ids, ids[2], 1)).toEqual(ids);
    expect(state).toEqual(original);
    const moved = moveInventoryItem(state.inventory, ids, ids[1], -1);
    expect(normalizeInventoryOrder(moved, state.inventory)).toEqual([ids[1], ids[0], ids[2]]);
    expect(normalizeInventoryState(structuredClone({ ...state, inventoryOrder: moved }))).toEqual(state);
  });

  test("purchases a known-price quantity in integer CP and preserves transaction snapshot", () => {
    const state = addPurchase(blank(), item("one_handed-dagger"), 3, undefined, "2026-01-02T03:04:05.000Z");
    expect(state.inventory[0].quantity).toBe(3);
    expect(state.equipmentTransactions[0]).toMatchObject({ amountCp: 900, amountSource: "catalogue_candidate",
      catalogueVersion: expect.any(String), recordedAt: "2026-01-02T03:04:05.000Z" });
    expect(reconcileBalance(100, state.equipmentTransactions)).toEqual({ startingCp: 1000, spentCp: 900, remainingCp: 100 });
  });

  test("charges shield purchases by quantity while free acquisitions and legacy saves keep their semantics", () => {
    const shieldPricesCp = [500, 1500, 3000, 3000, 1500, 4500, 1500, 3000];
    const shields = ["buckler", "heater", "hoplite", "kite", "peltast", "scutum", "target", "viking"];
    for (const [index, name] of shields.entries()) {
      const purchase = addPurchase(blank(), item(`shields-${name}`), 3);
      expect(purchase.equipmentTransactions[0]?.amountCp).toBe(shieldPricesCp[index]! * 3);
    }
    const viking = item("shields-viking");
    const purchased = addPurchase(blank(), viking, 2);
    expect(purchased.inventory).toHaveLength(1);
    expect(purchased.inventory[0]).toMatchObject({ catalogueId: "shields-viking", name: "Viking Shield", quantity: 2, encPerUnit: 3 });
    expect(purchased.equipmentTransactions[0]).toMatchObject({ name: "Viking Shield", quantity: 2, amountCp: 6000 });
    expect(reconcileBalance(10000, purchased.equipmentTransactions)).toEqual({ startingCp: 100000, spentCp: 6000, remainingCp: 94000 });

    const gifted = addGift(blank(), viking, 1, "inherited");
    expect(gifted.inventory[0]).toMatchObject({ name: "Viking Shield", acquiredAs: "inherited", quantity: 1 });
    expect(gifted.equipmentTransactions).toEqual([]);
    expect(reconcileBalance(10000, gifted.equipmentTransactions)).toEqual({ startingCp: 100000, spentCp: 0, remainingCp: 100000 });

    for (const legacy of [
      { id: "legacy-id", catalogueId: "shields-viking", name: "Viking", quantity: 2, acquiredAs: "inherited" },
      { id: "legacy-name", catalogueId: null, name: "Viking", quantity: 1, acquiredAs: "legacy" },
      { id: "already-named", catalogueId: "shields-viking", name: "Viking Shield", quantity: 1, acquiredAs: "purchased" },
    ]) {
      const restored = normalizeInventoryState({ inventory: [legacy] });
      expect(restored.inventory).toHaveLength(1);
      expect(restored.inventory[0]).toMatchObject({ name: "Viking Shield", quantity: legacy.quantity });
    }

    const custom = normalizeInventoryState({ inventory: [{ id: "custom-viking", catalogueId: null, name: "Viking", quantity: 1,
      customItem: { id: "custom-viking", type: "gear", name: "Viking" } }] });
    expect(custom.inventory[0]).toMatchObject({ name: "Viking", customItem: { type: "gear", name: "Viking" } });
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

  test("keeps profile stacks separate when the catalogue assigns different ENC", () => {
    const melee = item("one_handed-shortspear");
    const ranged = item("ranged-shortspear");
    expect(melee.physical_item_key).toBe(ranged.physical_item_key);
    expect(melee.enc_candidate).toBe(2);
    expect(ranged.enc_candidate).toBe(1);

    for (const [first, second] of [[melee, ranged], [ranged, melee]]) {
      const bought = addPurchase(addPurchase(blank(), first, 1), second, 1);
      expect(bought.inventory).toHaveLength(2);
      expect(carriedLoad(bought.inventory).load).toBe(3);

      const gifted = addGift(addGift(blank(), first, 1, "gifted"), second, 1, "gifted");
      expect(gifted.inventory).toHaveLength(2);
      expect(carriedLoad(gifted.inventory).load).toBe(3);
    }
  });

  test("catalogue ENC follows purchased, gifted, and inherited items and survives reload", () => {
    const sword = item("one_handed-broadsword");
    expect(sword.enc_candidate).toBe(2);
    for (const state of [
      addPurchase(blank(), sword, 2),
      addGift(blank(), sword, 1, "gifted"),
      addGift(blank(), sword, 1, "inherited"),
    ]) {
      expect(state.inventory[0]).toMatchObject({ encPerUnit: 2, encSource: "catalogue_candidate" });
      expect(normalizeInventoryState(structuredClone(state)).inventory[0].encPerUnit).toBe(2);
    }
    const two = addPurchase(blank(), sword, 2);
    expect(carriedLoad(two.inventory).load).toBe(4);
    expect(carriedLoad([{ ...two.inventory[0], state: "stored" }]).load).toBe(0);
    expect(normalizeInventoryState({ inventory: [{ id: "old", catalogueId: sword.id, name: sword.name, quantity: 1 }] }).inventory[0])
      .toMatchObject({ encPerUnit: 2, encSource: "catalogue_candidate" });
  });

  test("catalogue ENC never replaces an explicit GM override or invents unknown values", () => {
    const sword = item("one_handed-broadsword");
    const overridden = addPurchase(blank(), sword, 1);
    overridden.inventory[0].encPerUnit = 3;
    overridden.inventory[0].encSource = "gm_override";
    expect(normalizeInventoryState(structuredClone(overridden)).inventory[0]).toMatchObject({ encPerUnit: 3, encSource: "gm_override" });
    const unknown = item("one_handed-dagger");
    expect(unknown.enc_candidate).toBeUndefined();
    expect(addPurchase(blank(), unknown, 1).inventory[0]).toMatchObject({ encPerUnit: null, encSource: "unresolved" });
  });

  test("preserves recorded current weapon HP when restoring an inventory save", () => {
    const state = addGift(blank(), item("one_handed-battleaxe"), 1, "gifted");
    const damaged = changeInventoryItem(state, state.inventory[0]!.id, { currentHp: 3 });
    expect(normalizeInventoryState(structuredClone(damaged)).inventory[0]).toMatchObject({ currentHp: 3 });
    expect(() => changeInventoryItem(state, state.inventory[0]!.id, { currentHp: 9 })).toThrow("maximum HP");
    expect(() => changeInventoryItem(state, state.inventory[0]!.id, { currentHp: 1.5 })).toThrow("maximum HP");
  });

  test("tracks and restores current HP independently for every weapon in a stack", () => {
    const state = addGift(blank(), item("one_handed-battleaxe"), 2, "gifted");
    const damaged = changeInventoryItem(state, state.inventory[0]!.id, { currentHpByUnit: [8, 3] });
    expect(normalizeInventoryState(structuredClone(damaged)).inventory[0]).toMatchObject({ quantity: 2, currentHpByUnit: [8, 3] });
    const legacyStack = normalizeInventoryState({ inventory: [{ ...state.inventory[0], currentHp: 4 }], equipmentTransactions: [] });
    expect(legacyStack.inventory[0]).toMatchObject({ currentHpByUnit: [4, 4] });
    expect(() => changeInventoryItem(state, state.inventory[0]!.id, { currentHpByUnit: [8] })).toThrow("one valid whole number per item");
    expect(() => changeInventoryItem(state, state.inventory[0]!.id, { currentHpByUnit: [8, 9] })).toThrow("maximum HP");
    expect(() => changeInventoryItem(state, state.inventory[0]!.id, { currentHp: 8 })).toThrow("per physical item");
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
    let state = addPurchase(blank(), item("armour-half-plate"), 1, undefined, undefined, { material: "iron", locations: ["Head"] });
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

  test("persists the owned armour GM material override with its selected material", () => {
    let state = addPurchase(blank(), item("armour-half-plate"), 1, undefined, undefined, { material: "iron", locations: ["Chest"] });
    const ownedId = state.inventory[0].id;
    state = changeInventoryItem(state, ownedId, { armour: {
      material: "ivory", compatibility: "incompatible", gmCompatibilityOverride: true,
    } });
    const restored = normalizeInventoryState(structuredClone(state));
    expect(restored.inventory[0]).toMatchObject({ id: ownedId, armour: {
      material: "ivory", compatibility: "incompatible", gmCompatibilityOverride: true,
    } });
    expect(restored.inventory[0].encPerUnit).toBe(state.inventory[0].encPerUnit);
  });

  test("records selected armour material, locations, adjusted ENC, and per-location price snapshots", () => {
    const selection = { material: "iron" as const, locations: [...HIT_LOCATIONS] };
    const purchased = addPurchase(blank(), item("armour-plated-mail"), 1, undefined, "2026-01-02T03:04:05.000Z", selection);
    expect(item("armour-plated-mail")).toMatchObject({ price_cp_candidate: 14000, base_enc_per_location: 6 });
    expect(purchased.equipmentTransactions[0]).toMatchObject({ amountCp: 98000, quantity: 1 });
    expect(purchased.inventory[0]).toMatchObject({ encPerUnit: 6, armour: { material: "iron", locations: HIT_LOCATIONS, coverageResolved: true } });
    expect(normalizeInventoryState(structuredClone(purchased))).toEqual(purchased);

    const steel = addGift(blank(), item("armour-plated-mail"), 1, "gifted", { material: "steel", locations: ["Head", "Chest"] });
    expect(steel.inventory[0]).toMatchObject({ encPerUnit: 4.5, armour: { material: "steel", locations: ["Head", "Chest"] } });
    expect(carriedLoad(steel.inventory).load).toBe(4.5);
    expect(normalizeInventoryState(structuredClone(steel)).inventory[0]).toMatchObject({ encPerUnit: 4.5, armour: { material: "steel" } });
  });

  test("shows nominal Half Plate AP from a persisted unresolved-fit record and retains effective protection after reload", () => {
    const selected = ["Chest", "Abdomen", "Right Arm", "Left Arm"] as const;
    const bought = addPurchase(blank(), item("armour-half-plate"), 1, undefined, undefined, { material: "iron", locations: [...selected] });
    const owned = bought.inventory[0];
    expect(owned.armour).toMatchObject({ construction: "half_plate", material: "iron", locations: selected });
    const persisted = structuredClone(bought);
    const restored = normalizeInventoryState(persisted);
    const unresolvedPiece = { id: restored.inventory[0].id, name: restored.inventory[0].name, ...restored.inventory[0].armour! };
    const unresolvedSummary = summarizeArmour([unresolvedPiece]);
    expect(selected.map(location => unresolvedSummary.nominalApByLocation[location])).toEqual([5, 5, 5, 5]);
    expect(selected.map(location => unresolvedSummary.apByLocation[location])).toEqual([null, null, null, null]);
    expect(unresolvedSummary).toMatchObject({ fullWornEnc: 16, loadEnc: 8 });
    expect(carriedLoad(restored.inventory).load).toBe(8);

    const fitted = changeInventoryItem(restored, owned.id, { armour: { fit: "fitted" } });
    const fittedSummary = summarizeArmour([{ id: fitted.inventory[0].id, name: fitted.inventory[0].name, ...fitted.inventory[0].armour! }]);
    expect(selected.map(location => fittedSummary.nominalApByLocation[location])).toEqual([5, 5, 5, 5]);
    expect(fittedSummary.apByLocation)
      .toMatchObject({ Chest: 5, Abdomen: 5, "Right Arm": 5, "Left Arm": 5, Head: 0 });

    const legacy = normalizeInventoryState({ inventory: [{ id: "old-half-plate", catalogueId: "armour-half-plate", name: "Half Plate", quantity: 1,
      state: "worn", armour: { locations: [...selected], fit: "unresolved", compatibility: "compatible", state: "worn", coverageResolved: true } }] });
    expect(legacy.inventory[0].armour).toMatchObject({ construction: "half_plate", material: "iron", fit: "unresolved" });
    const legacySummary = summarizeArmour([{ id: legacy.inventory[0].id, name: legacy.inventory[0].name, ...legacy.inventory[0].armour! }]);
    expect(legacySummary.nominalApByLocation.Chest).toBe(5);
    expect(legacySummary.apByLocation.Chest).toBeNull();

    const nameOnly = normalizeInventoryState({ inventory: [{ id: "name-only-half-plate", name: "Half Plate", quantity: 1,
      state: "worn", armour: { locations: [...selected], fit: "unresolved", compatibility: "compatible", state: "worn", coverageResolved: true } }] });
    expect(nameOnly.inventory[0].armour).toMatchObject({ construction: "half_plate", material: "iron" });
  });

  test("does not infer catalogue armour from a custom item's name", () => {
    const gear = normalizeInventoryState({ inventory: [{ id: "custom-gear-half-plate", name: "Half Plate", quantity: 1,
      customItem: { id: "custom-gear", type: "gear", name: "Half Plate" } }] });
    expect(gear.inventory[0].armour).toBeUndefined();

    const customArmour = normalizeInventoryState({ inventory: [{ id: "custom-armour-half-plate", name: "Half Plate", quantity: 1,
      customItem: { id: "custom-armour", type: "armour", name: "Half Plate" },
      armour: { construction: null, material: null, locations: ["Chest"], fit: "fitted", compatibility: "compatible", state: "worn" } }] });
    expect(customArmour.inventory[0].armour).toMatchObject({ construction: null, material: null });
  });

  test("rejects unlisted material combinations unless explicitly GM-authorized", () => {
    const selection = { material: "silk" as const, locations: ["Chest" as const] };
    expect(() => addGift(blank(), item("armour-plated-mail"), 1, "gifted", selection)).toThrow("explicit GM compatibility override");
    const allowed = addGift(blank(), item("armour-plated-mail"), 1, "gifted", { ...selection, gmCompatibilityOverride: true });
    expect(allowed.inventory[0].armour).toMatchObject({ material: "silk", compatibility: "incompatible", gmCompatibilityOverride: true });
  });

  test("material edits update the persisted effective ENC snapshot", () => {
    const state = addGift(blank(), item("armour-half-plate"), 1, "gifted", { material: "iron", locations: ["Chest"] });
    const changed = changeInventoryItem(state, state.inventory[0].id, { armour: { material: "steel" } });
    expect(changed.inventory[0]).toMatchObject({ encPerUnit: 3, encSource: "catalogue_candidate", armour: { material: "steel" } });
    expect(normalizeInventoryState(structuredClone(changed)).inventory[0].encPerUnit).toBe(3);
  });
});
