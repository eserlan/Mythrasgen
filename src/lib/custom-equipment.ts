import { ARMOUR_CONSTRUCTIONS, ARMOUR_MATERIALS, HIT_LOCATIONS, type HitLocationName } from "./armour-rules";
import type { InventoryItem } from "./equipment-inventory";

export const CUSTOM_EQUIPMENT_TYPES = ["weapon", "shield", "armour", "clothing", "gear", "ammunition", "vehicle", "supply", "service", "other"] as const;
export type CustomEquipmentType = typeof CUSTOM_EQUIPMENT_TYPES[number];
export interface CustomEquipmentDefinition {
  id: string;
  name: string;
  type: CustomEquipmentType;
  description: string;
  priceCp: number | null;
  enc: number | null;
  damage?: string;
  size?: string;
  reach?: string;
  ap?: number;
  hp?: number;
  hands?: number;
  traits?: string;
  protectedLocations?: HitLocationName[];
  construction?: string;
  material?: string;
  updatedAt: string;
}

const validNumber = (value: unknown, min = 0): value is number => typeof value === "number" && Number.isFinite(value) && value >= min;
const validDamage = (value: string) => /^[1-9]\d*d(?:[2-9]|[1-9]\d*)(?:[+-](?:[1-9]\d*d(?:[2-9]|[1-9]\d*)|[1-9]\d*))?$/i.test(value.trim());
export function validateCustomEquipment(value: Omit<CustomEquipmentDefinition, "id" | "updatedAt">): string[] {
  const errors: string[] = [];
  if (!value.name.trim()) errors.push("Enter an item name.");
  if (!CUSTOM_EQUIPMENT_TYPES.includes(value.type)) errors.push("Choose a valid item type.");
  if (value.priceCp !== null && (!Number.isSafeInteger(value.priceCp) || value.priceCp < 0)) errors.push("Price must be a whole number of CP or blank.");
  if (value.enc !== null && !validNumber(value.enc)) errors.push("ENC must be zero or more, or blank if unknown.");
  if (["weapon", "shield"].includes(value.type)) {
    if (value.damage?.trim() && !validDamage(value.damage)) errors.push("Enter damage as a valid expression, such as 1d8.");
    if (value.ap !== undefined && (!Number.isSafeInteger(value.ap) || value.ap < 0)) errors.push("AP must be a whole number of zero or more.");
    if (value.hp !== undefined && (!Number.isSafeInteger(value.hp) || value.hp < 0)) errors.push("HP must be a whole number of zero or more.");
    if (value.type === "weapon" && (![1, 2].includes(value.hands ?? 0))) errors.push("Choose one or two hands required.");
  }
  if (value.type === "armour") {
    if (value.ap !== undefined && (!Number.isSafeInteger(value.ap) || value.ap < 0)) errors.push("Protection AP must be a whole number of zero or more.");
    if (!value.protectedLocations?.length || value.protectedLocations.some(location => !HIT_LOCATIONS.includes(location))) errors.push("Select at least one valid protected hit location.");
  }
  return errors;
}

export function normalizeCustomEquipment(value: unknown): CustomEquipmentDefinition[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((raw): CustomEquipmentDefinition[] => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as CustomEquipmentDefinition;
    if (typeof row.id !== "string" || !row.id.startsWith("custom-") || ids.has(row.id)
        || typeof row.name !== "string" || !CUSTOM_EQUIPMENT_TYPES.includes(row.type)) return [];
    if (row.priceCp !== null && row.priceCp !== undefined && (!validNumber(row.priceCp) || !Number.isSafeInteger(row.priceCp))) return [];
    if (row.enc !== null && row.enc !== undefined && !validNumber(row.enc)) return [];
    ids.add(row.id);
    const numericField = (field: unknown) => field === undefined ? undefined : typeof field === "number" ? field : Number.NaN;
    const candidate = { ...row, name: row.name.trim(), description: typeof row.description === "string" ? row.description : "",
      priceCp: row.priceCp === null || row.priceCp === undefined ? null : row.priceCp,
      enc: row.enc === null || row.enc === undefined ? null : row.enc,
      damage: typeof row.damage === "string" ? row.damage : undefined,
      size: typeof row.size === "string" ? row.size : undefined,
      reach: typeof row.reach === "string" ? row.reach : undefined,
      ap: numericField(row.ap), hp: numericField(row.hp), hands: numericField(row.hands),
      traits: typeof row.traits === "string" ? row.traits : undefined,
      protectedLocations: Array.isArray(row.protectedLocations) ? row.protectedLocations.filter((location): location is HitLocationName => HIT_LOCATIONS.includes(location)) : [],
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString() };
    if (validateCustomEquipment(candidate).length) return [];
    return [candidate];
  });
}

export function customEquipmentInventoryItem(definition: CustomEquipmentDefinition, acquiredAs: "purchased" | "gifted" | "inherited" | "granted", quantity: number, id: string): InventoryItem {
  if (definition.type === "service") throw new Error("Services do not create inventory.");
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive whole number.");
  return { id, catalogueId: null, sourceIds: [], name: definition.name, quantity, acquiredAs,
    state: definition.type === "armour" ? "worn" : "carried", encPerUnit: definition.enc,
    encSource: definition.enc === null ? "unresolved" : "gm_override",
    customItem: { ...definition, ...(definition.protectedLocations ? { protectedLocations: [...definition.protectedLocations] } : {}) },
    ...(definition.type === "armour" ? { armour: { construction: definition.construction && Object.hasOwn(ARMOUR_CONSTRUCTIONS, definition.construction)
      ? definition.construction as keyof typeof ARMOUR_CONSTRUCTIONS : null,
    material: definition.material && Object.hasOwn(ARMOUR_MATERIALS, definition.material) ? definition.material as keyof typeof ARMOUR_MATERIALS : null,
    locations: [...(definition.protectedLocations ?? [])], coverageResolved: true, state: "worn" as const,
    fit: "fitted" as const, compatibility: "compatible" as const, apOverride: definition.ap,
    ...(definition.enc !== null ? { encOverride: definition.enc } : {}) } } : {}) };
}
