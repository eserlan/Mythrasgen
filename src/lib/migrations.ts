import type { CultureKind } from "./content";

export type AgeCategory = "Young" | "Adult" | "Middle-Aged";

export interface BackgroundData {
  events: { roll: number; text: string }[];
  socialClassRoll: number;
  socialClass: string;
  parentsRoll: number;
  parents: string;
  siblingsRoll: number;
  siblings: string;
  extendedFamilyRoll: number;
  extendedFamily: string;
  standingRoll: number;
  familyTies: string[];
  connectionsRoll: number;
  connections: string[];
  startingMoneyRoll: number;
  equipment: string;
  purchases: { name: string; cost: number }[];
}

/** Keep legacy saves on the same logical screen after Background was inserted before Sheet. */
export function migrateCharacterStep(step: number, hasBackground: boolean): number {
  return !hasBackground && step === 5 ? 6 : step;
}

/** Infer the new table selections from a saved culture while preserving explicit custom choices. */
export function migrateCultureTables(
  cultureKind: CultureKind | null | undefined,
  socialTable?: CultureKind,
  moneyTable?: CultureKind,
): { socialTable: CultureKind; moneyTable: CultureKind } {
  const kinds: CultureKind[] = ["Barbarian", "Civilised", "Nomadic", "Primitive"];
  const fallback = cultureKind && kinds.includes(cultureKind) ? cultureKind : "Civilised";
  return {
    socialTable: socialTable && kinds.includes(socialTable) ? socialTable : fallback,
    moneyTable: moneyTable && kinds.includes(moneyTable) ? moneyTable : fallback,
  };
}

export function normalizeAgeCategory(value: unknown, fallback: AgeCategory): AgeCategory {
  return value === "Young" || value === "Adult" || value === "Middle-Aged" ? value : fallback;
}

/** Fill newly added background fields and discard malformed imported collection values. */
export function normalizeBackground(value: unknown, fallback: BackgroundData): BackgroundData {
  const saved = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<BackgroundData>
    : {};
  const strings = (candidate: unknown, original: string[]) =>
    Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === "string") : original;
  return {
    ...fallback,
    ...saved,
    socialClassRoll: Number.isFinite(saved.socialClassRoll) ? saved.socialClassRoll! : fallback.socialClassRoll,
    socialClass: typeof saved.socialClass === "string" ? saved.socialClass : fallback.socialClass,
    parentsRoll: Number.isFinite(saved.parentsRoll) ? saved.parentsRoll! : fallback.parentsRoll,
    parents: typeof saved.parents === "string" ? saved.parents : fallback.parents,
    siblingsRoll: Number.isFinite(saved.siblingsRoll) ? saved.siblingsRoll! : fallback.siblingsRoll,
    siblings: typeof saved.siblings === "string" ? saved.siblings : fallback.siblings,
    extendedFamilyRoll: Number.isFinite(saved.extendedFamilyRoll) ? saved.extendedFamilyRoll! : fallback.extendedFamilyRoll,
    extendedFamily: typeof saved.extendedFamily === "string" ? saved.extendedFamily : fallback.extendedFamily,
    standingRoll: Number.isFinite(saved.standingRoll) ? saved.standingRoll! : fallback.standingRoll,
    connectionsRoll: Number.isFinite(saved.connectionsRoll) ? saved.connectionsRoll! : fallback.connectionsRoll,
    startingMoneyRoll: Number.isFinite(saved.startingMoneyRoll) ? saved.startingMoneyRoll! : fallback.startingMoneyRoll,
    equipment: typeof saved.equipment === "string" ? saved.equipment : fallback.equipment,
    events: Array.isArray(saved.events)
      ? saved.events.filter((event): event is { roll: number; text: string } =>
          !!event && typeof event === "object" && Number.isFinite(event.roll) && typeof event.text === "string")
      : fallback.events,
    familyTies: strings(saved.familyTies, fallback.familyTies),
    connections: strings(saved.connections, fallback.connections),
    purchases: Array.isArray(saved.purchases)
      ? saved.purchases.filter((item): item is { name: string; cost: number } =>
          !!item && typeof item === "object" && typeof item.name === "string" && Number.isFinite(item.cost) && item.cost >= 0)
      : fallback.purchases,
  };
}
