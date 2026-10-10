import type { InventoryItem } from "./equipment-inventory";
import { summarizeArmour, type ArmourPiece } from "./armour-rules";

/** Terms and thresholds transcribed from issue #191; awaiting comparison with the project Core PDF. */
export const CORE_ENCUMBRANCE_RULES_VERIFICATION = "issue-provided; Core PDF verification pending";
export type LoadBand = "unburdened" | "burdened" | "overloaded" | "unsustainable" | "unknown";
export interface EncumbranceSummary {
  band: LoadBand;
  load: number | null;
  knownLoad: number;
  unresolvedItems: string[];
  thresholds: { burdened: number; overloaded: number; unsustainable: number } | null;
  skillDifficultyGrades: number | null;
  movement: string;
  sprinting: string;
  fatigue: string;
}

/** Standard Core ENC load. Worn items count half ENC; stored items count none. */
export function carriedLoad(items: readonly InventoryItem[]): { load: number | null; knownLoad: number; unresolvedItems: string[] } {
  let knownLoad = 0;
  const unresolvedItems: string[] = [];
  let zeroEncItemCount = 0;
  const armourPieces: ArmourPiece[] = [];
  for (const item of items) {
    if (item.state === "stored" || item.encumbranceExempt) continue;
    if (item.armour) {
      for (let index = 0; index < item.quantity; index++) armourPieces.push({ id: `${item.id}-${index + 1}`, ...item.armour, state: item.state });
      continue;
    }
    if (item.encPerUnit === null) {
      unresolvedItems.push(item.name);
      continue;
    }
    const divisor = item.state === "worn" ? 2 : 1;
    const enc = item.encPerUnit * item.quantity / divisor;
    knownLoad += enc;
    if (item.encPerUnit === 0) zeroEncItemCount += item.quantity;
  }
  const armour = summarizeArmour(armourPieces);
  if (armour.loadEnc === null) unresolvedItems.push("armour");
  else knownLoad += armour.loadEnc;
  knownLoad += Math.floor(zeroEncItemCount / 20);
  return { load: unresolvedItems.length ? null : knownLoad, knownLoad, unresolvedItems };
}

export function encumbranceSummary(items: readonly InventoryItem[], strength: number | null | undefined): EncumbranceSummary {
  const load = carriedLoad(items);
  const thresholds = Number.isFinite(strength) && strength! >= 0
    ? { burdened: strength! * 2, overloaded: strength! * 3, unsustainable: strength! * 4 }
    : null;
  if (load.load === null || !thresholds) return {
    ...load, band: "unknown", thresholds, skillDifficultyGrades: null, movement: "Unknown",
    sprinting: "Unknown", fatigue: "Unknown",
  };
  const band: LoadBand = load.load <= thresholds.burdened ? "unburdened"
    : load.load <= thresholds.overloaded ? "burdened"
      : load.load <= thresholds.unsustainable ? "overloaded" : "unsustainable";
  const details = {
    unburdened: { grades: 0, movement: "6m", sprinting: "Allowed", fatigue: "None" },
    burdened: { grades: 1, movement: "4m", sprinting: "Cannot sprint", fatigue: "Medium" },
    overloaded: { grades: 2, movement: "3m", sprinting: "Walking only", fatigue: "Strenuous" },
    unsustainable: { grades: null, movement: "Unsustainable", sprinting: "Unsustainable", fatigue: "Unsustainable" },
  }[band];
  return { ...load, band, thresholds, skillDifficultyGrades: details.grades,
    movement: details.movement, sprinting: details.sprinting, fatigue: details.fatigue };
}
