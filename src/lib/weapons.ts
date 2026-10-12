import { EQUIPMENT_CATALOGUE, type EquipmentSourceRecord } from "./equipment-catalogue";

export interface WeaponRecord {
  id: string;
  name: string;
  damage: string;
  size: string;
  ap: number;
  hp: number;
  reach?: string;
  range?: string;
  force?: "Yes" | "No";
  load?: number;
  impale?: string;
  notes?: string;
  source: string;
}

const source = "Mythras Imperative, Sample Weapons tables";

/** A focused catalogue drawn from the publisher's open Mythras Imperative weapon tables. */
export const WEAPON_CATALOGUE: WeaponRecord[] = [
  { id: "spear", name: "Spear", damage: "1d8+1", size: "M", ap: 4, hp: 5, source },
  { id: "shortsword", name: "Shortsword", damage: "1d6", size: "M", ap: 6, hp: 8, source },
  { id: "javelin", name: "Javelin", damage: "1d8+1", size: "M", ap: 3, hp: 8, range: "10/20/50 m", force: "Yes", load: 0, impale: "M", source },
  { id: "sling", name: "Sling", damage: "1d8", size: "L", ap: 1, hp: 2, range: "10/150/300 m", force: "No", load: 2, source },
];

const combatWeaponCategories = new Set(["one_handed", "two_handed", "shields", "ranged"]);

/** Weapon and shield names available when editing a Combat Style. These records are references only. */
export const CORE_COMBAT_STYLE_WEAPONS: readonly EquipmentSourceRecord[] = EQUIPMENT_CATALOGUE
  .filter(record => (record.kind === "physical_item" || record.kind === "wielding_profile") && combatWeaponCategories.has(record.source.category))
  .map(record => record.source);

function normalizeWeaponName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function resolveWeapon(catalogueId: string | undefined, name: string): WeaponRecord | undefined {
  if (catalogueId) {
    const byId = WEAPON_CATALOGUE.find(record => record.id === catalogueId);
    if (byId) return byId;
  }
  const normalized = normalizeWeaponName(name);
  return WEAPON_CATALOGUE.find(record => normalizeWeaponName(record.name) === normalized);
}

/** Resolves only an unambiguous Core catalogue match; a saved stable ID always wins. */
export function resolveCoreCombatStyleWeapon(catalogueId: string | undefined, name: string): EquipmentSourceRecord | undefined {
  if (catalogueId) {
    const byId = CORE_COMBAT_STYLE_WEAPONS.find(record => record.id === catalogueId);
    if (byId) return byId;
  }
  const matches = CORE_COMBAT_STYLE_WEAPONS.filter(record => normalizeWeaponName(record.name) === normalizeWeaponName(name));
  return matches.length === 1 ? matches[0] : undefined;
}

export function isCoreCombatStyleWeaponName(name: string): boolean {
  return CORE_COMBAT_STYLE_WEAPONS.some(record => normalizeWeaponName(record.name) === normalizeWeaponName(name));
}
