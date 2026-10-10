import sourceIndex from "../../catalogue_source_index.json";

export const EQUIPMENT_CATALOGUE_VERSION = "mythras-core-3e-provisional-2026-10-10";
export const EQUIPMENT_CATALOGUE_SCHEMA_VERSION = 1;

export type EquipmentCategory =
  | "one_handed" | "shields" | "two_handed" | "siege" | "vehicles" | "ranged"
  | "armour" | "materials" | "accommodation" | "clothing" | "food" | "livestock"
  | "ammunition" | "tools";

export type FieldVerification = "source_indexed" | "provisional" | "visually_checked" | "unresolved";

export interface EquipmentSourceRecord {
  readonly id: string;
  readonly category: EquipmentCategory;
  readonly name: string;
  readonly source_printed_page: number;
  readonly source_line: string;
  readonly price_cp_candidate: number | null;
  readonly verification: string;
  readonly combat_profile_candidate?: Readonly<{ damage: string; size: string; reach: string }>;
  readonly ap_candidate?: number;
  readonly hp_candidate?: number;
  readonly wielding_hands?: number;
  readonly physical_item_key?: string;
  readonly price_basis?: string;
  readonly ap?: number;
  readonly base_enc_per_location?: number;
  readonly enc_multiplier?: number;
}

export type CatalogueRecordKind = "physical_item" | "non_carried_purchase" | "wielding_profile" | "armour_material_modifier";

export interface ImportedEquipmentRecord {
  readonly source: EquipmentSourceRecord;
  readonly kind: CatalogueRecordKind;
  readonly fieldVerification: Readonly<Record<string, FieldVerification>>;
  readonly shieldRules?: Readonly<{
    passiveBlocking: Readonly<{ value: boolean | null; verification: FieldVerification }>;
    rangedParry: Readonly<{ value: boolean | null; verification: FieldVerification }>;
  }>;
}

/** Ownership-only state; these values never mutate the canonical construction or material records. */
export interface OwnedArmourState {
  readonly catalogueId: string;
  readonly state: "worn" | "carried";
  readonly fit: "fitted" | "ill_fitting" | "unresolved";
  readonly coverageByLocation?: readonly {
    readonly locationId: string;
    readonly ap: number | null;
    readonly verification: FieldVerification;
  }[];
  readonly materialCompatibility?: readonly {
    readonly materialId: string;
    readonly status: "compatible" | "incompatible" | "conditional" | "unresolved";
    readonly gmOverride?: boolean;
  }[];
}

const categories = new Set<EquipmentCategory>([
  "one_handed", "shields", "two_handed", "siege", "vehicles", "ranged", "armour",
  "materials", "accommodation", "clothing", "food", "livestock", "ammunition", "tools",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSourceRecords(value: unknown): asserts value is EquipmentSourceRecord[] {
  if (!Array.isArray(value)) throw new Error("Equipment source index must be an array");
  const ids = new Set<string>();
  for (const [index, candidate] of value.entries()) {
    if (!isObject(candidate)) throw new Error(`Equipment source row ${index + 1} must be an object`);
    const row = candidate;
    if (typeof row.id !== "string" || !/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(row.id)) {
      throw new Error(`Equipment source row ${index + 1} has an invalid stable id`);
    }
    if (ids.has(row.id)) throw new Error(`Duplicate equipment stable id: ${row.id}`);
    ids.add(row.id);
    if (typeof row.category !== "string" || !categories.has(row.category as EquipmentCategory)) {
      throw new Error(`Equipment ${row.id} has an unknown category`);
    }
    if (typeof row.name !== "string" || row.name.trim() === "") throw new Error(`Equipment ${row.id} has no name`);
    if (!Number.isInteger(row.source_printed_page) || (row.source_printed_page as number) < 1) {
      throw new Error(`Equipment ${row.id} has an invalid printed page`);
    }
    if (typeof row.source_line !== "string") throw new Error(`Equipment ${row.id} has an invalid source line`);
    if (row.price_cp_candidate !== null && (!Number.isSafeInteger(row.price_cp_candidate) || (row.price_cp_candidate as number) < 0)) {
      throw new Error(`Equipment ${row.id} has an invalid candidate price`);
    }
    if (typeof row.verification !== "string" || row.verification.trim() === "") {
      throw new Error(`Equipment ${row.id} has no record verification status`);
    }
    for (const key of ["ap", "ap_candidate", "hp_candidate", "wielding_hands", "enc_multiplier"] as const) {
      const field = row[key];
      if (field !== undefined && (typeof field !== "number" || !Number.isFinite(field))) {
        throw new Error(`Equipment ${row.id} has invalid ${key}`);
      }
    }
    if (row.combat_profile_candidate !== undefined) {
      const profile: unknown = row.combat_profile_candidate;
      if (!isObject(profile) || ["damage", "size", "reach"].some(key => typeof profile[key] !== "string")) {
        throw new Error(`Equipment ${row.id} has a malformed combat profile`);
      }
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

const rawSourceIndex: unknown = sourceIndex;
validateSourceRecords(rawSourceIndex);

const checkedRecordPattern = /visually checked|checked against/i;
export const EQUIPMENT_CATALOGUE: readonly ImportedEquipmentRecord[] = deepFreeze(rawSourceIndex.map(source => {
  const fieldVerification: Record<string, FieldVerification> = {};
  for (const [field, value] of Object.entries(source)) {
    if (field === "verification") fieldVerification[field] = "source_indexed";
    else if (field === "source_line" && value === "") fieldVerification[field] = "unresolved";
    else if (field === "price_cp_candidate" && value === null) fieldVerification[field] = "unresolved";
    else if (["id", "category", "name", "source_printed_page", "source_line"].includes(field)) fieldVerification[field] = "source_indexed";
    else fieldVerification[field] = checkedRecordPattern.test(source.verification) ? "visually_checked" : "provisional";
  }
  const kind: CatalogueRecordKind = source.category === "materials"
    ? "armour_material_modifier"
    : source.category === "accommodation"
      ? "non_carried_purchase"
    : source.physical_item_key
      ? "wielding_profile"
      : "physical_item";
  return {
    source,
    kind,
    fieldVerification,
    ...(source.category === "shields" ? {
      shieldRules: {
        passiveBlocking: { value: null, verification: "unresolved" as const },
        rangedParry: { value: null, verification: "unresolved" as const },
      },
    } : {}),
  };
}));

export function displayEquipmentPrice(record: EquipmentSourceRecord): string {
  return record.price_cp_candidate === null ? "Price unavailable" : formatCopperPrice(record.price_cp_candidate);
}

export function formatCopperPrice(copper: number): string {
  if (!Number.isSafeInteger(copper) || copper < 0) throw new Error("Price must be a non-negative integer number of CP");
  const gold = Math.floor(copper / 1000);
  const silver = Math.floor((copper % 1000) / 10);
  const remainingCopper = copper % 10;
  return [gold && `${gold} GP`, silver && `${silver} SP`, remainingCopper && `${remainingCopper} CP`]
    .filter(Boolean).join(" ") || "0 CP";
}

export interface OwnedEquipment {
  readonly catalogueId: string;
  readonly acquiredAs: "purchased" | "gifted" | "inherited" | "granted";
  readonly quantity: number;
}

export interface EquipmentTransaction {
  readonly catalogueId: string;
  readonly catalogueVersion: string;
  readonly kind: "purchase";
  readonly amountCp: number;
  readonly amountSource: "catalogue_candidate" | "gm_entered";
  readonly recordedAt: string;
}

function requireCatalogueItem(catalogueId: string): EquipmentSourceRecord {
  const found = EQUIPMENT_CATALOGUE.find(record => record.source.id === catalogueId)?.source;
  if (!found) throw new Error(`Unknown equipment catalogue id: ${catalogueId}`);
  return found;
}

export function acquireWithoutPurchase(catalogueId: string, acquiredAs: "gifted" | "inherited" | "granted", quantity = 1): OwnedEquipment {
  requireCatalogueItem(catalogueId);
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive integer");
  return Object.freeze({ catalogueId, acquiredAs, quantity });
}

export function createEquipmentPurchase(
  catalogueId: string,
  options: { gmEnteredPriceCp?: number; recordedAt?: string; quantity?: number } = {},
): { owned: OwnedEquipment; transaction: EquipmentTransaction } {
  const item = requireCatalogueItem(catalogueId);
  const quantity = options.quantity ?? 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive integer");
  const explicitPrice = options.gmEnteredPriceCp;
  if (explicitPrice !== undefined && (!Number.isSafeInteger(explicitPrice) || explicitPrice < 0)) {
    throw new Error("GM-entered price must be a non-negative integer number of CP");
  }
  if (item.price_cp_candidate === null && explicitPrice === undefined) {
    throw new Error(`${item.name}: price unavailable; enter a GM price or acquire it as gifted, inherited, or granted`);
  }
  const transaction = Object.freeze({
    catalogueId,
    catalogueVersion: EQUIPMENT_CATALOGUE_VERSION,
    kind: "purchase" as const,
    amountCp: explicitPrice ?? item.price_cp_candidate!,
    amountSource: explicitPrice === undefined ? "catalogue_candidate" as const : "gm_entered" as const,
    recordedAt: options.recordedAt ?? new Date().toISOString(),
  });
  return {
    owned: Object.freeze({ catalogueId, acquiredAs: "purchased", quantity }),
    transaction,
  };
}
