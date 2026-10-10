/** Values transcribed from issue #191; project Core PDF verification is still pending. */
export const ARMOUR_RULES_VERIFICATION = "issue-provided; Core PDF verification pending";
export const HIT_LOCATIONS = ["Head", "Chest", "Abdomen", "Right Arm", "Left Arm", "Right Leg", "Left Leg"] as const;
export type HitLocationName = typeof HIT_LOCATIONS[number];
export const ARMOUR_CONSTRUCTIONS = {
  natural_cured: { name: "Natural/Cured", ap: 1, enc: 2, costSp: 20, flexibility: "flexible" },
  padded_quilted: { name: "Padded/Quilted", ap: 2, enc: 1, costSp: 80, flexibility: "flexible" },
  laminated: { name: "Laminated", ap: 3, enc: 2, costSp: 180, flexibility: "rigid" },
  scaled: { name: "Scaled", ap: 4, enc: 3, costSp: 320, flexibility: "rigid" },
  half_plate: { name: "Half Plate", ap: 5, enc: 4, costSp: 500, flexibility: "rigid" },
  mail: { name: "Mail", ap: 6, enc: 5, costSp: 900, flexibility: "flexible" },
  plated_mail: { name: "Plated Mail", ap: 7, enc: 6, costSp: 1400, flexibility: "rigid" },
  articulated_plate: { name: "Articulated Plate", ap: 8, enc: 7, costSp: 2400, flexibility: "rigid" },
} as const;
export type ArmourConstructionId = keyof typeof ARMOUR_CONSTRUCTIONS;
export const ARMOUR_MATERIALS = {
  bone: { name: "Bone", encMultiplier: 1.5 }, bronze: { name: "Bronze", encMultiplier: 1 },
  chitin: { name: "Chitin", encMultiplier: 0.75 }, iron: { name: "Iron", encMultiplier: 1 },
  ivory: { name: "Ivory", encMultiplier: 1.25 }, leather: { name: "Leather", encMultiplier: 2 },
  linen: { name: "Linen", encMultiplier: 1 }, shell: { name: "Shell", encMultiplier: 2 },
  silk: { name: "Silk", encMultiplier: 0.75 }, steel: { name: "Steel", encMultiplier: 0.75 },
  stone: { name: "Stone", encMultiplier: 3 },
} as const;
export type ArmourMaterialId = keyof typeof ARMOUR_MATERIALS;
export type FitState = "fitted" | "ill_fitting" | "unresolved";
export type CompatibilityState = "compatible" | "incompatible" | "conditional" | "unresolved";
export interface ArmourPiece {
  id: string;
  construction: ArmourConstructionId | null;
  material: ArmourMaterialId | null;
  locations: HitLocationName[];
  coverageResolved?: boolean;
  state: "worn" | "carried" | "stored";
  fit: FitState;
  compatibility: CompatibilityState;
  gmCompatibilityOverride?: boolean;
  encOverride?: number;
  apOverride?: number;
}
export interface ArmourSummary {
  apByLocation: Record<HitLocationName, number | null>;
  fullWornEnc: number | null;
  loadEnc: number | null;
  initiativePenalty: number | null;
  unresolved: string[];
}

export function summarizeArmour(pieces: readonly ArmourPiece[]): ArmourSummary {
  const apByLocation = Object.fromEntries(HIT_LOCATIONS.map(location => [location, 0])) as Record<HitLocationName, number | null>;
  const unresolved: string[] = [];
  let fullWornEnc = 0;
  let loadEnc = 0;
  let fullWornEncKnown = true;
  let loadEncKnown = true;
  for (const piece of pieces) {
    if (piece.state === "stored") continue;
    if (piece.state === "worn") {
      if (!piece.locations.length && !piece.coverageResolved) {
        unresolved.push(`${piece.id}: coverage unresolved`);
        for (const location of HIT_LOCATIONS) apByLocation[location] = null;
        fullWornEncKnown = false;
        loadEncKnown = false;
        continue;
      }
      if (piece.fit !== "fitted") unresolved.push(`${piece.id}: fit ${piece.fit}`);
      if (piece.compatibility === "unresolved" || piece.compatibility === "conditional"
        || (piece.compatibility === "incompatible" && !piece.gmCompatibilityOverride)) {
        unresolved.push(`${piece.id}: material compatibility ${piece.compatibility}`);
      }
      const construction = piece.construction ? ARMOUR_CONSTRUCTIONS[piece.construction] : undefined;
      const material = piece.material ? ARMOUR_MATERIALS[piece.material] : undefined;
      const ap = piece.apOverride ?? construction?.ap;
      const enc = piece.encOverride ?? (construction && material ? construction.enc * material.encMultiplier : undefined);
      if (ap === undefined) unresolved.push(`${piece.id}: AP unresolved`);
      const protectionResolved = piece.fit === "fitted"
        && (piece.compatibility === "compatible" || (piece.compatibility === "incompatible" && piece.gmCompatibilityOverride));
      for (const location of piece.locations) {
        if (!protectionResolved || ap === undefined) apByLocation[location] = null;
        else if (apByLocation[location] !== null) apByLocation[location] = Math.max(apByLocation[location] ?? 0, ap);
      }
    }
    const construction = piece.construction ? ARMOUR_CONSTRUCTIONS[piece.construction] : undefined;
    const material = piece.material ? ARMOUR_MATERIALS[piece.material] : undefined;
    const enc = piece.encOverride ?? (construction && material ? construction.enc * material.encMultiplier : undefined);
    if (enc === undefined) unresolved.push(`${piece.id}: ENC unresolved`);
    if (piece.state === "worn") {
      if (enc === undefined) fullWornEncKnown = false;
      else fullWornEnc += enc * piece.locations.length;
    }
    if (piece.state === "worn" || piece.state === "carried") {
      if (enc === undefined) loadEncKnown = false;
      else loadEnc += enc * piece.locations.length * (piece.state === "worn" ? 0.5 : 1);
    }
  }
  return {
    apByLocation,
    fullWornEnc: fullWornEncKnown ? fullWornEnc : null,
    loadEnc: loadEncKnown ? loadEnc : null,
    initiativePenalty: fullWornEncKnown ? Math.ceil(fullWornEnc / 5) : null,
    unresolved,
  };
}
