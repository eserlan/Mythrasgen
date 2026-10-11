import { EQUIPMENT_CATALOGUE, EQUIPMENT_CATALOGUE_VERSION, createEquipmentPurchase, type EquipmentSourceRecord } from "./equipment-catalogue";
import type { ArmourPiece, ArmourConstructionId, ArmourMaterialId, CompatibilityState, FitState, HitLocationName } from "./armour-rules";
import { ARMOUR_CONSTRUCTIONS, ARMOUR_MATERIALS, HIT_LOCATIONS, armourEncumbrance, armourMaterialCompatibility, standardArmourMaterial } from "./armour-rules";
import type { CustomEquipmentDefinition } from "./custom-equipment";

export type EquipmentState = "carried" | "worn" | "stored";
export type EquipmentAcquisition = "purchased" | "gifted" | "inherited" | "granted";
export type EncumbranceValueSource = "catalogue_candidate" | "gm_override" | "unresolved";
export interface InventoryItem {
  id: string;
  catalogueId: string | null;
  sourceIds: string[];
  physicalItemKey?: string;
  name: string;
  quantity: number;
  acquiredAs: EquipmentAcquisition | "legacy";
  state: EquipmentState;
  /** ENC per unit. Null means unknown; it is never treated as zero. */
  encPerUnit: number | null;
  encSource: EncumbranceValueSource;
  /** Everyday clothing does not count toward load; otherwise zero-ENC stacks count in groups of 20. */
  encumbranceExempt?: boolean;
  armour?: Omit<ArmourPiece, "id">;
  customItem?: CustomEquipmentDefinition;
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
const encumbranceForRecord = (record: EquipmentSourceRecord) => record.enc_candidate ?? record.base_enc_per_location ?? null;
const armourConstructionForCatalogue: Record<string, ArmourConstructionId> = {
  "armour-natural-cured": "natural_cured", "armour-padded-quilted": "padded_quilted", "armour-laminated": "laminated",
  "armour-scaled": "scaled", "armour-half-plate": "half_plate", "armour-mail": "mail",
  "armour-plated-mail": "plated_mail", "armour-articulated-plate": "articulated_plate",
};
const armourConstructionFor = (catalogueId: unknown, name: string): ArmourConstructionId | null => {
  if (typeof catalogueId === "string" && armourConstructionForCatalogue[catalogueId]) return armourConstructionForCatalogue[catalogueId];
  return Object.entries(ARMOUR_CONSTRUCTIONS).find(([, construction]) => construction.name === name)?.[0] as ArmourConstructionId | undefined ?? null;
};
export interface ArmourAcquisitionSelection {
  material: ArmourMaterialId;
  locations: HitLocationName[];
  gmCompatibilityOverride?: boolean;
}

function newArmourConfig(catalogueId: string, state: EquipmentState, selection?: ArmourAcquisitionSelection, knownConstruction?: ArmourConstructionId | null): Omit<ArmourPiece, "id"> {
  const construction = knownConstruction ?? armourConstructionFor(catalogueId, "");
  if (selection && (!Object.hasOwn(ARMOUR_MATERIALS, selection.material)
      || selection.locations.some(location => !HIT_LOCATIONS.includes(location))
      || new Set(selection.locations).size !== selection.locations.length)) throw new Error("Choose a valid material and unique protected locations.");
  const material = selection?.material ?? (construction ? standardArmourMaterial(construction) : null);
  const materialStatus = construction && material ? armourMaterialCompatibility(construction, material) : "conditional";
  if (materialStatus !== "compatible" && !selection?.gmCompatibilityOverride) throw new Error("This material needs an explicit GM compatibility override.");
  return { construction, material, locations: selection?.locations ?? [], coverageResolved: !!selection?.locations.length,
    state: state === "stored" ? "stored" : state === "carried" ? "carried" : "worn",
    fit: "unresolved", compatibility: materialStatus === "compatible" ? "compatible" : "incompatible",
    ...(selection?.gmCompatibilityOverride ? { gmCompatibilityOverride: true } : {}) };
}

export function normalizeInventoryState(value: unknown): InventoryState {
  const saved = value && typeof value === "object" ? value as Partial<InventoryState> : {};
  const inventory = Array.isArray(saved.inventory) ? saved.inventory.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const row = item as InventoryItem;
    if (typeof row.name !== "string" || !validInt(row.quantity, 1)) return [];
    const catalogueEnc = typeof row.catalogueId === "string"
      ? EQUIPMENT_CATALOGUE.find(entry => entry.source.id === row.catalogueId)?.source.enc_candidate
      : undefined;
    const savedEnc = typeof row.encPerUnit === "number" && Number.isFinite(row.encPerUnit) && row.encPerUnit >= 0 ? row.encPerUnit : null;
    const identifiableConstruction = armourConstructionFor(row.catalogueId, row.name);
    const encPerUnit = savedEnc ?? catalogueEnc ?? null;
    const encSource = row.encSource === "gm_override" && savedEnc !== null ? "gm_override"
      : savedEnc !== null && row.encSource === "catalogue_candidate" ? "catalogue_candidate"
        : catalogueEnc !== undefined ? "catalogue_candidate" : "unresolved";
    const normalizedItem = {
      id: typeof row.id === "string" && row.id ? row.id : uid(),
      catalogueId: typeof row.catalogueId === "string" ? row.catalogueId : null,
      sourceIds: Array.isArray(row.sourceIds) ? row.sourceIds.filter((id): id is string => typeof id === "string") : [],
      ...(typeof row.physicalItemKey === "string" ? { physicalItemKey: row.physicalItemKey } : {}),
      name: row.name,
      quantity: row.quantity,
      acquiredAs: ["purchased", "gifted", "inherited", "granted", "legacy"].includes(row.acquiredAs) ? row.acquiredAs : "legacy",
      state: ["carried", "worn", "stored"].includes(row.state) ? row.state : "carried",
      encPerUnit,
      encSource,
      ...(typeof row.encumbranceExempt === "boolean" ? { encumbranceExempt: row.encumbranceExempt } : {}),
      ...(row.customItem && typeof row.customItem === "object" ? { customItem: row.customItem } : {}),
      ...(row.armour && typeof row.armour === "object" ? { armour: {
        construction: typeof row.armour.construction === "string" && Object.hasOwn(ARMOUR_CONSTRUCTIONS, row.armour.construction)
          ? row.armour.construction as ArmourConstructionId
          : identifiableConstruction,
        material: typeof row.armour.material === "string" && Object.hasOwn(ARMOUR_MATERIALS, row.armour.material)
          ? row.armour.material as ArmourMaterialId
          : row.armour.material === undefined && identifiableConstruction
            ? standardArmourMaterial(identifiableConstruction) : null,
        locations: Array.isArray(row.armour.locations) ? row.armour.locations.filter((location): location is HitLocationName =>
          ["Head", "Chest", "Abdomen", "Right Arm", "Left Arm", "Right Leg", "Left Leg"].includes(location)) : [],
        coverageResolved: typeof row.armour.coverageResolved === "boolean" ? row.armour.coverageResolved : false,
        state: ["worn", "carried", "stored"].includes(row.armour.state) ? row.armour.state : "worn",
        fit: ["fitted", "ill_fitting", "unresolved"].includes(row.armour.fit) ? row.armour.fit as FitState : "unresolved",
        compatibility: ["compatible", "incompatible", "conditional", "unresolved"].includes(row.armour.compatibility)
          ? row.armour.compatibility as CompatibilityState : "unresolved",
        ...(typeof row.armour.gmCompatibilityOverride === "boolean" ? { gmCompatibilityOverride: row.armour.gmCompatibilityOverride } : {}),
        ...(typeof row.armour.encOverride === "number" && row.armour.encOverride >= 0 ? { encOverride: row.armour.encOverride } : {}),
        ...(typeof row.armour.apOverride === "number" && row.armour.apOverride >= 0 ? { apOverride: row.armour.apOverride } : {}),
      } } : {}),
    } as InventoryItem;
    if (!normalizedItem.armour && identifiableConstruction) {
      normalizedItem.armour = newArmourConfig(normalizedItem.catalogueId ?? "", normalizedItem.state, undefined, identifiableConstruction);
    }
    return [normalizedItem];
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
  armourSelection?: ArmourAcquisitionSelection,
): InventoryState {
  if (!validInt(quantity, 1)) throw new Error("Quantity must be a positive integer");
  const locationCount = record.category === "armour" ? armourSelection?.locations.length ?? 0 : 1;
  if (record.category === "armour" && locationCount < 1) throw new Error("Select at least one protected hit location.");
  if (!Number.isSafeInteger(quantity * locationCount)) throw new Error("Total price is too large");
  const created = createEquipmentPurchase(record.id, { quantity, ...(gmEnteredPriceCp !== undefined ? { gmEnteredPriceCp } : {}), recordedAt });
  const group = record.physical_item_key;
  const inventory = state.inventory.map(item => ({ ...item, sourceIds: [...item.sourceIds] }));
  const armourConfig = record.category === "armour" ? newArmourConfig(record.id, "worn", armourSelection) : undefined;
  const encPerUnit = armourConfig?.construction && armourConfig.material
    ? armourEncumbrance(armourConfig.construction, armourConfig.material) : encumbranceForRecord(record);
  const existing = inventory.find(item => item.acquiredAs === "purchased"
    && (group ? item.physicalItemKey === group : item.catalogueId === record.id)
    && item.encPerUnit === encPerUnit
    && (!armourSelection || (item.armour?.material === armourSelection.material
      && item.armour.locations.join("|") === armourSelection.locations.join("|"))));
  const sourceIds = [...new Set([...(existing?.sourceIds ?? []), record.id])];
  if (existing) {
    if (!Number.isSafeInteger(existing.quantity + quantity)) throw new Error("Quantity is too large");
    existing.quantity += quantity;
    existing.sourceIds = sourceIds;
  } else inventory.push({ id: uid(), catalogueId: record.id, sourceIds, ...(group ? { physicalItemKey: group } : {}),
    name: record.name, quantity, acquiredAs: "purchased", state: record.category === "armour" ? "worn" : "carried",
    encPerUnit,
    encSource: encPerUnit === null ? "unresolved" : "catalogue_candidate",
    ...(armourConfig ? { armour: armourConfig } : {}) });
  const transaction: InventoryTransaction = { id: uid(), kind: "purchase", catalogueId: record.id, name: record.name,
    quantity, amountCp: created.transaction.amountCp * quantity * locationCount, amountSource: created.transaction.amountSource,
    catalogueVersion: created.transaction.catalogueVersion, recordedAt: created.transaction.recordedAt };
  if (!Number.isSafeInteger(transaction.amountCp)) throw new Error("Total price is too large");
  return { inventory, equipmentTransactions: [...state.equipmentTransactions, transaction] };
}

export function addGift(state: InventoryState, record: EquipmentSourceRecord, quantity: number, acquiredAs: "gifted" | "inherited" | "granted", armourSelection?: ArmourAcquisitionSelection): InventoryState {
  if (!validInt(quantity, 1)) throw new Error("Quantity must be a positive integer");
  if (record.category === "armour" && !armourSelection?.locations.length) throw new Error("Select at least one protected hit location.");
  const armourConfig = record.category === "armour" ? newArmourConfig(record.id, "worn", armourSelection) : undefined;
  const encPerUnit = armourConfig?.construction && armourConfig.material
    ? armourEncumbrance(armourConfig.construction, armourConfig.material) : encumbranceForRecord(record);
  const existing = state.inventory.find(item => item.acquiredAs === acquiredAs && (record.physical_item_key
    ? item.physicalItemKey === record.physical_item_key : item.catalogueId === record.id)
    && item.encPerUnit === encPerUnit
    && (!armourSelection || (item.armour?.material === armourSelection.material
      && item.armour.locations.join("|") === armourSelection.locations.join("|"))));
  if (existing) {
    if (!Number.isSafeInteger(existing.quantity + quantity)) throw new Error("Quantity is too large");
    return { ...state, inventory: state.inventory.map(item => item.id === existing.id
      ? { ...item, quantity: item.quantity + quantity, sourceIds: [...new Set([...item.sourceIds, record.id])] } : item) };
  }
  return { ...state, inventory: [...state.inventory, { id: uid(), catalogueId: record.id, sourceIds: [record.id],
    ...(record.physical_item_key ? { physicalItemKey: record.physical_item_key } : {}), name: record.name, quantity,
    acquiredAs, state: record.category === "armour" ? "worn" : "carried",
    encPerUnit,
    encSource: encPerUnit === null ? "unresolved" : "catalogue_candidate",
    ...(armourConfig ? { armour: armourConfig } : {}) }] };
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

export function changeInventoryItem(state: InventoryState, id: string, update: Partial<Pick<InventoryItem, "quantity" | "state" | "encPerUnit" | "encumbranceExempt">> & { armour?: Partial<Omit<ArmourPiece, "id">> }): InventoryState {
  if (update.quantity !== undefined && !validInt(update.quantity, 1)) throw new Error("Quantity must be a positive integer");
  if (update.encPerUnit !== undefined && update.encPerUnit !== null && (!Number.isFinite(update.encPerUnit) || update.encPerUnit < 0)) throw new Error("ENC must be a non-negative number");
  const { armour: armourUpdate, ...fields } = update;
  return { ...state, inventory: state.inventory.map(item => {
    if (item.id !== id) return item;
    const armourChanged = !!armourUpdate || (!!fields.state && !!item.armour);
    const armour = armourChanged ? { ...(item.armour ?? newArmourConfig(item.catalogueId ?? "", item.state)), ...armourUpdate,
      ...(fields.state ? { state: fields.state } : {}) } : item.armour;
    const armourEncChanged = !!armourUpdate && ["construction", "material", "encOverride"].some(key => Object.hasOwn(armourUpdate, key));
    const derivedArmourEnc = armour?.encOverride ?? (armour?.construction && armour.material
      ? armourEncumbrance(armour.construction, armour.material) : null);
    return { ...item, ...fields,
      ...(armourChanged ? { armour } : {}),
      ...(armourEncChanged ? { encPerUnit: derivedArmourEnc, encSource: derivedArmourEnc === null ? "unresolved" as const : armour?.encOverride !== undefined ? "gm_override" as const : "catalogue_candidate" as const } : {}),
      ...(Object.hasOwn(update, "encPerUnit") ? { encSource: update.encPerUnit === null ? "unresolved" as const : "gm_override" as const } : {}) };
  }) };
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
