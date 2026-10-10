import { EQUIPMENT_CATALOGUE_VERSION, createEquipmentPurchase, type EquipmentSourceRecord } from "./equipment-catalogue";

export type EquipmentState = "carried" | "worn" | "stored";
export type EquipmentAcquisition = "purchased" | "gifted" | "inherited" | "granted";
export interface InventoryItem {
  id: string;
  catalogueId: string | null;
  sourceIds: string[];
  physicalItemKey?: string;
  name: string;
  quantity: number;
  acquiredAs: EquipmentAcquisition | "legacy";
  state: EquipmentState;
}
export interface InventoryTransaction {
  id: string;
  kind: "purchase" | "refund" | "legacy_spend" | "expense";
  catalogueId: string | null;
  name: string;
  quantity: number;
  amountCp: number;
  amountSource: "catalogue_candidate" | "gm_entered" | "legacy";
  catalogueVersion: string;
  recordedAt: string;
  relatedTransactionId?: string;
}

export interface InventoryState {
  inventory: InventoryItem[];
  equipmentTransactions: InventoryTransaction[];
}

const validInt = (value: unknown, minimum = 0): value is number => Number.isSafeInteger(value) && (value as number) >= minimum;
const uid = () => globalThis.crypto?.randomUUID?.() ?? `equipment-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function normalizeInventoryState(value: unknown): InventoryState {
  const saved = value && typeof value === "object" ? value as Partial<InventoryState> : {};
  const inventory = Array.isArray(saved.inventory) ? saved.inventory.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const row = item as InventoryItem;
    if (typeof row.name !== "string" || !validInt(row.quantity, 1)) return [];
    return [{
      id: typeof row.id === "string" && row.id ? row.id : uid(),
      catalogueId: typeof row.catalogueId === "string" ? row.catalogueId : null,
      sourceIds: Array.isArray(row.sourceIds) ? row.sourceIds.filter((id): id is string => typeof id === "string") : [],
      ...(typeof row.physicalItemKey === "string" ? { physicalItemKey: row.physicalItemKey } : {}),
      name: row.name,
      quantity: row.quantity,
      acquiredAs: ["purchased", "gifted", "inherited", "granted", "legacy"].includes(row.acquiredAs) ? row.acquiredAs : "legacy",
      state: ["carried", "worn", "stored"].includes(row.state) ? row.state : "carried",
    } as InventoryItem];
  }) : [];
  const equipmentTransactions = Array.isArray(saved.equipmentTransactions) ? saved.equipmentTransactions.flatMap(transaction => {
    if (!transaction || typeof transaction !== "object") return [];
    const row = transaction as InventoryTransaction;
    if (typeof row.name !== "string" || !validInt(row.amountCp) || !validInt(row.quantity, 1)) return [];
    if (!["purchase", "refund", "legacy_spend", "expense"].includes(row.kind)) return [];
    const amountSource = ["catalogue_candidate", "gm_entered", "legacy"].includes(row.amountSource) ? row.amountSource : "legacy";
    return [{
      id: typeof row.id === "string" && row.id ? row.id : uid(),
      kind: row.kind,
      catalogueId: typeof row.catalogueId === "string" ? row.catalogueId : null,
      name: row.name,
      quantity: row.quantity,
      amountCp: row.amountCp,
      amountSource,
      catalogueVersion: typeof row.catalogueVersion === "string" ? row.catalogueVersion : "legacy",
      recordedAt: typeof row.recordedAt === "string" ? row.recordedAt : new Date(0).toISOString(),
      ...(typeof row.relatedTransactionId === "string" ? { relatedTransactionId: row.relatedTransactionId } : {}),
    } as InventoryTransaction];
  }) : [];
  return { inventory, equipmentTransactions };
}

export function migrateLegacyPurchases(purchases: readonly { name: string; cost: number }[]): InventoryTransaction[] {
  return purchases.flatMap(item => {
    if (!Number.isFinite(item.cost) || item.cost < 0) return [];
    const amountCp = Math.round(item.cost * 10);
    if (!Number.isSafeInteger(amountCp)) return [];
    return [{ id: uid(), kind: "legacy_spend", catalogueId: null, name: item.name, quantity: 1,
      amountCp, amountSource: "legacy", catalogueVersion: "legacy-sp", recordedAt: new Date(0).toISOString() }];
  });
}

export function ledgerSpentCp(transactions: readonly InventoryTransaction[]): number {
  return transactions.reduce((total, transaction) => {
    const next = total + (transaction.kind === "refund" ? -transaction.amountCp : transaction.amountCp);
    if (!Number.isSafeInteger(next)) throw new Error("Ledger total exceeds safe integer CP range");
    return next;
  }, 0);
}

export function addPurchase(
  state: InventoryState,
  record: EquipmentSourceRecord,
  quantity: number,
  gmEnteredPriceCp?: number,
  recordedAt?: string,
): InventoryState {
  if (!validInt(quantity, 1)) throw new Error("Quantity must be a positive integer");
  const created = createEquipmentPurchase(record.id, { quantity, ...(gmEnteredPriceCp !== undefined ? { gmEnteredPriceCp } : {}), recordedAt });
  const group = record.physical_item_key;
  const inventory = state.inventory.map(item => ({ ...item, sourceIds: [...item.sourceIds] }));
  const existing = inventory.find(item => item.acquiredAs === "purchased"
    && (group ? item.physicalItemKey === group : item.catalogueId === record.id));
  const sourceIds = [...new Set([...(existing?.sourceIds ?? []), record.id])];
  if (existing) {
    if (!Number.isSafeInteger(existing.quantity + quantity)) throw new Error("Quantity is too large");
    existing.quantity += quantity;
    existing.sourceIds = sourceIds;
  } else inventory.push({ id: uid(), catalogueId: record.id, sourceIds, ...(group ? { physicalItemKey: group } : {}),
    name: record.name, quantity, acquiredAs: "purchased", state: record.category === "armour" ? "worn" : "carried" });
  const transaction: InventoryTransaction = { id: uid(), kind: "purchase", catalogueId: record.id, name: record.name,
    quantity, amountCp: created.transaction.amountCp * quantity, amountSource: created.transaction.amountSource,
    catalogueVersion: created.transaction.catalogueVersion, recordedAt: created.transaction.recordedAt };
  if (!Number.isSafeInteger(transaction.amountCp)) throw new Error("Total price is too large");
  return { inventory, equipmentTransactions: [...state.equipmentTransactions, transaction] };
}

export function addGift(state: InventoryState, record: EquipmentSourceRecord, quantity: number, acquiredAs: "gifted" | "inherited" | "granted"): InventoryState {
  if (!validInt(quantity, 1)) throw new Error("Quantity must be a positive integer");
  const existing = state.inventory.find(item => item.acquiredAs === acquiredAs && (record.physical_item_key
    ? item.physicalItemKey === record.physical_item_key : item.catalogueId === record.id));
  if (existing) {
    if (!Number.isSafeInteger(existing.quantity + quantity)) throw new Error("Quantity is too large");
    return { ...state, inventory: state.inventory.map(item => item.id === existing.id
      ? { ...item, quantity: item.quantity + quantity, sourceIds: [...new Set([...item.sourceIds, record.id])] } : item) };
  }
  return { ...state, inventory: [...state.inventory, { id: uid(), catalogueId: record.id, sourceIds: [record.id],
    ...(record.physical_item_key ? { physicalItemKey: record.physical_item_key } : {}), name: record.name, quantity,
    acquiredAs, state: record.category === "armour" ? "worn" : "carried" }] };
}

export function addExpense(state: InventoryState, record: EquipmentSourceRecord, quantity: number, gmEnteredPriceCp?: number, recordedAt?: string): InventoryState {
  if (!validInt(quantity, 1)) throw new Error("Quantity must be a positive integer");
  const created = createEquipmentPurchase(record.id, { quantity, ...(gmEnteredPriceCp !== undefined ? { gmEnteredPriceCp } : {}), recordedAt });
  const amountCp = created.transaction.amountCp * quantity;
  if (!Number.isSafeInteger(amountCp)) throw new Error("Total price is too large");
  return { ...state, equipmentTransactions: [...state.equipmentTransactions, { id: uid(), kind: "expense", catalogueId: record.id,
    name: record.name, quantity, amountCp, amountSource: created.transaction.amountSource,
    catalogueVersion: created.transaction.catalogueVersion, recordedAt: created.transaction.recordedAt }] };
}

export function removeInventoryItem(state: InventoryState, id: string): InventoryState {
  return { ...state, inventory: state.inventory.filter(item => item.id !== id) };
}

export function changeInventoryItem(state: InventoryState, id: string, update: Partial<Pick<InventoryItem, "quantity" | "state">>): InventoryState {
  if (update.quantity !== undefined && !validInt(update.quantity, 1)) throw new Error("Quantity must be a positive integer");
  return { ...state, inventory: state.inventory.map(item => item.id === id ? { ...item, ...update } : item) };
}

export function refundPurchase(state: InventoryState, transactionId: string, amountCp: number, recordedAt?: string): InventoryState {
  if (!validInt(amountCp)) throw new Error("Refund must be a non-negative integer number of CP");
  const purchase = state.equipmentTransactions.find(item => item.id === transactionId && item.kind === "purchase");
  if (!purchase) throw new Error("Choose a purchase transaction to refund");
  const refunded = state.equipmentTransactions.filter(item => item.kind === "refund" && item.relatedTransactionId === transactionId)
    .reduce((total, item) => total + item.amountCp, 0);
  if (refunded + amountCp > purchase.amountCp) throw new Error("Refund exceeds the amount paid for this purchase");
  return { ...state, equipmentTransactions: [...state.equipmentTransactions, { id: uid(), kind: "refund",
    catalogueId: purchase.catalogueId, name: purchase.name, quantity: purchase.quantity, amountCp,
    amountSource: "gm_entered", catalogueVersion: purchase.catalogueVersion, recordedAt: recordedAt ?? new Date().toISOString(),
    relatedTransactionId: purchase.id }] };
}

export function reconcileBalance(startingMoneySp: number, transactions: readonly InventoryTransaction[]): { startingCp: number; spentCp: number; remainingCp: number } {
  const startingCp = Math.round(startingMoneySp * 10);
  const spentCp = ledgerSpentCp(transactions);
  return { startingCp, spentCp, remainingCp: startingCp - spentCp };
}
