/** Construction and material values follow the Core table data supplied with issue #219. */
export const ARMOUR_RULES_VERIFICATION = "Mythras Core 3rd ed. pp. 57–58; issue #219 source notes";
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
export type ArmourMaterialCompatibility = "compatible" | "incompatible" | "conditional";

/** Compatibility notes transcribed from the issue's Core material table. */
export function armourMaterialCompatibility(constructionId: ArmourConstructionId, materialId: ArmourMaterialId): ArmourMaterialCompatibility {
  const flexible = ARMOUR_CONSTRUCTIONS[constructionId].flexibility === "flexible";
  switch (materialId) {
    case "bone": case "chitin": case "shell":
      return ["laminated", "scaled", "half_plate", "articulated_plate"].includes(constructionId) ? "compatible" : "incompatible";
    case "leather": return ["mail", "plated_mail"].includes(constructionId) ? "incompatible" : "compatible";
    case "silk": return flexible ? "compatible" : "incompatible";
    case "steel": return flexible ? "incompatible" : "compatible";
    case "stone": return ["laminated", "scaled", "half_plate"].includes(constructionId) ? "compatible" : "incompatible";
    case "linen": return flexible ? "compatible" : "incompatible";
    case "bronze": case "iron": return flexible ? "incompatible" : "compatible";
    case "ivory": return "conditional";
  }
}

export function standardArmourMaterial(constructionId: ArmourConstructionId): ArmourMaterialId {
  return ARMOUR_CONSTRUCTIONS[constructionId].flexibility === "flexible" ? "linen" : "iron";
}

export function armourEncumbrance(constructionId: ArmourConstructionId, materialId: ArmourMaterialId): number {
  return ARMOUR_CONSTRUCTIONS[constructionId].enc * ARMOUR_MATERIALS[materialId].encMultiplier;
}
export type FitState = "fitted" | "ill_fitting" | "unresolved";
export type CompatibilityState = "compatible" | "incompatible" | "conditional" | "unresolved";
export interface ArmourPiece {
  id: string;
  /** Human-readable label used in player-facing review warnings. */
  name?: string;
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
  /** Known construction AP for covered locations, regardless of fit validity. */
  nominalApByLocation: Record<HitLocationName, number | null>;
  /** AP currently effective after fit and material compatibility are resolved. */
  apByLocation: Record<HitLocationName, number | null>;
  fullWornEnc: number | null;
  loadEnc: number | null;
  initiativePenalty: number | null;
  unresolved: string[];
}

export function summarizeArmour(pieces: readonly ArmourPiece[]): ArmourSummary {
  const nominalApByLocation = Object.fromEntries(HIT_LOCATIONS.map(location => [location, 0])) as Record<HitLocationName, number | null>;
  const apByLocation = Object.fromEntries(HIT_LOCATIONS.map(location => [location, 0])) as Record<HitLocationName, number | null>;
  const unresolved: string[] = [];
  let fullWornEnc = 0;
  let loadEnc = 0;
  let fullWornEncKnown = true;
  let loadEncKnown = true;
  for (const piece of pieces) {
    if (piece.state === "stored") continue;
    if (!piece.locations.length && !piece.coverageResolved) {
      unresolved.push(`${piece.name ?? piece.id}: armour coverage needs attention. Select the locations this armour covers.`);
      if (piece.state === "worn") {
        for (const location of HIT_LOCATIONS) {
          nominalApByLocation[location] = null;
          apByLocation[location] = null;
        }
        fullWornEncKnown = false;
      }
      loadEncKnown = false;
      continue;
    }
    if (piece.state === "worn") {
      if (piece.fit === "unresolved") unresolved.push(`${piece.name ?? piece.id}: armour fit needs attention. Open Armour locations and fit, then check the armour's size and fit settings.`);
      else if (piece.fit === "ill_fitting") unresolved.push(`${piece.name ?? piece.id}: armour is marked ill fitting. Correct its size and fit settings before relying on its protection.`);
      if (piece.compatibility === "unresolved" || piece.compatibility === "conditional"
        || (piece.compatibility === "incompatible" && !piece.gmCompatibilityOverride)) {
        unresolved.push(`${piece.name ?? piece.id}: armour material compatibility needs attention. Choose a compatible material or record GM approval.`);
      }
      const construction = piece.construction ? ARMOUR_CONSTRUCTIONS[piece.construction] : undefined;
      const material = piece.material ? ARMOUR_MATERIALS[piece.material] : undefined;
      const ap = piece.apOverride ?? construction?.ap;
      const enc = piece.encOverride ?? (construction && material ? construction.enc * material.encMultiplier : undefined);
      if (ap === undefined) unresolved.push(`${piece.name ?? piece.id}: armour protection AP is unresolved. Check its construction.`);
      const protectionResolved = piece.fit === "fitted"
        && (piece.compatibility === "compatible" || (piece.compatibility === "incompatible" && piece.gmCompatibilityOverride));
      for (const location of piece.locations) {
        if (ap === undefined) nominalApByLocation[location] = null;
        else if (nominalApByLocation[location] !== null) nominalApByLocation[location] = Math.max(nominalApByLocation[location] ?? 0, ap);
        if (!protectionResolved || ap === undefined) apByLocation[location] = null;
        else if (apByLocation[location] !== null) apByLocation[location] = Math.max(apByLocation[location] ?? 0, ap);
      }
    }
    const construction = piece.construction ? ARMOUR_CONSTRUCTIONS[piece.construction] : undefined;
    const material = piece.material ? ARMOUR_MATERIALS[piece.material] : undefined;
    const enc = piece.encOverride ?? (construction && material ? construction.enc * material.encMultiplier : undefined);
    if (enc === undefined) unresolved.push(`${piece.name ?? piece.id}: armour ENC is unresolved. Check its construction and material.`);
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
    nominalApByLocation,
    apByLocation,
    fullWornEnc: fullWornEncKnown ? fullWornEnc : null,
    loadEnc: loadEncKnown ? loadEnc : null,
    initiativePenalty: fullWornEncKnown ? Math.ceil(fullWornEnc / 5) : null,
    unresolved,
  };
}
