/** A ranged-table cell distinguishes a printed dash from a missing transcription. */
export type RangedCell<T> =
  | Readonly<{ status: "value"; value: T }>
  | Readonly<{ status: "not_applicable" }>
  | Readonly<{ status: "unknown" }>;

const value = <T>(item: T): RangedCell<T> => ({ status: "value", value: item });
const dash: RangedCell<never> = { status: "not_applicable" };

export interface RangedWeaponStats {
  readonly damage: RangedCell<string>;
  readonly damageModifier: RangedCell<"Y" | "N">;
  readonly force: RangedCell<"S" | "L" | "M" | "H" | "E" | "+1 Step">;
  readonly range: RangedCell<readonly [string, string, string]>;
  readonly load: RangedCell<number>;
  readonly combatEffects: RangedCell<string>;
  /** The size affected by Impale, retained from the adjacent rules-table column. */
  readonly impaleSize: RangedCell<"S" | "M" | "L">;
  readonly enc: RangedCell<number>;
  readonly ap: RangedCell<number>;
  readonly hp: RangedCell<number>;
}

const ranged = (
  damage: RangedCell<string>, damageModifier: RangedCell<"Y" | "N">,
  force: RangedCell<"S" | "L" | "M" | "H" | "E" | "+1 Step">,
  range: RangedCell<readonly [string, string, string]>, load: RangedCell<number>,
  combatEffects: RangedCell<string>, impaleSize: RangedCell<"S" | "M" | "L">,
  enc: RangedCell<number>, ap: RangedCell<number>, hp: RangedCell<number>,
): RangedWeaponStats => ({ damage, damageModifier, force, range, load, combatEffects, impaleSize, enc, ap, hp });

/** Stats transcribed from the Mythras Core 3rd edition Ranged Weapons table, p. 65. */
export const RANGED_WEAPON_STATS: Readonly<Record<string, RangedWeaponStats>> = Object.freeze({
  "ranged-atlatl": ranged(dash, dash, value("+1 Step"), value(["+0", "+25", "+75"]), value(1), dash, dash, value(1), value(1), value(4)),
  "ranged-blowgun": ranged(dash, value("N"), dash, value(["10", "20", "30"]), value(2), value("Impale"), dash, dash, value(1), value(4)),
  "ranged-bolas": ranged(value("1d4"), value("N"), dash, value(["10", "25", "50"]), dash, value("Entangle"), dash, dash, value(2), value(2)),
  "ranged-dagger": ranged(value("1d4"), value("Y"), value("S"), value(["5", "10", "20"]), dash, value("Impale"), value("S"), dash, value(6), value(8)),
  "ranged-dart": ranged(value("1d4"), value("Y"), value("S"), value(["5", "10", "20"]), dash, value("Impale"), value("S"), dash, value(2), value(1)),
  "ranged-discus": ranged(value("1d4+1"), value("Y"), value("L"), value(["5", "20", "40"]), dash, value("Stun Location"), dash, dash, value(2), value(3)),
  "ranged-hatchet": ranged(value("1d6"), value("Y"), value("S"), value(["10", "20", "30"]), dash, value("Bleed"), dash, value(1), value(4), value(6)),
  "ranged-heavy-crossbow": ranged(value("1d10"), value("N"), value("H"), value(["20", "150", "300"]), value(4), value("Impale/Sunder"), value("S"), value(2), value(4), value(8)),
  "ranged-javelin": ranged(value("1d8+1"), value("Y"), value("H"), value(["10", "20", "50"]), dash, value("Pin Weapon (shield), Impale"), value("M"), value(1), value(3), value(8)),
  "ranged-light-crossbow": ranged(value("1d8"), value("N"), value("L"), value(["20", "100", "200"]), value(3), value("Impale"), value("S"), value(1), value(4), value(5)),
  "ranged-long-bow": ranged(value("1d8"), value("Y"), value("H"), value(["15", "125", "250"]), value(2), value("Impale"), value("S"), value(1), value(4), value(7)),
  "ranged-net": ranged(dash, value("N"), dash, value(["3", "5", "10"]), dash, value("Entangle"), dash, value(3), value(2), value(20)),
  "ranged-recurve-bow": ranged(value("1d8"), value("Y"), value("H"), value(["15", "125", "250"]), value(2), value("Impale"), value("S"), value(1), value(4), value(8)),
  "ranged-short-bow": ranged(value("1d6"), value("Y"), value("L"), value(["15", "100", "200"]), value(2), value("Impale"), value("S"), value(1), value(4), value(4)),
  "ranged-shortspear": ranged(value("1d8"), value("Y"), value("L"), value(["10", "15", "30"]), dash, value("Impale"), value("M"), value(1), value(4), value(5)),
  "ranged-sling": ranged(value("1d8"), value("N"), value("L"), value(["10", "150", "300"]), value(3), value("Stun Location"), dash, dash, value(1), value(2)),
  "ranged-staff-sling": ranged(value("2d6"), value("N"), value("E"), value(["5", "25", "50"]), value(4), value("Stun Location"), dash, value(2), value(3), value(6)),
  "ranged-stone-rock": ranged(value("1d3"), value("Y"), value("S"), value(["5", "10", "20"]), dash, value("Stun Location"), dash, dash, dash, dash),
  "ranged-trident": ranged(value("1d8"), value("Y"), value("L"), value(["10", "15", "30"]), dash, value("Impale"), value("M"), value(2), value(4), value(10)),
});

export function rangedCellText<T>(cell: RangedCell<T>, format: (value: T) => string = String): string {
  if (cell.status === "not_applicable") return "—";
  if (cell.status === "unknown") return "Unknown";
  return format(cell.value);
}

export function formatRangedRange(cell: RangedCell<readonly [string, string, string]>): string {
  return rangedCellText(cell, bands => `${bands.join("/")} m`);
}
