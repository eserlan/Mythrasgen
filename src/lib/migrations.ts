import type { CultureKind } from "./content";
import { AGE_CATEGORIES, type AgeCategory } from "./rules";
import type { BackgroundEvent } from "./background-rules";
import { coreBackgroundEventForRange, coreBackgroundEventForRoll } from "./background-events";

export type { AgeCategory } from "./rules";

export interface BackgroundData {
  events: BackgroundEvent[];
  archivedEvents: BackgroundEvent[];
  socialClassRoll: number;
  socialClass: string;
  socialClassCulture: CultureKind;
  socialClassMethod: "rolled" | "chosen";
  socialClassMoney: number;
  socialClassEquipment: string;
  socialClassResources: string;
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

/** Keep existing saves on the same logical screen when Combat is inserted before Sheet. */
export function migrateCharacterStep(step: number, hasBackground: boolean): number {
  if (!hasBackground && step === 5) return 7;
  return step === 6 ? 7 : step;
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
  const legacy: Record<string, AgeCategory> = { Young: "young", Adult: "adult", "Middle-Aged": "middleAged" };
  if (typeof value === "string" && Object.hasOwn(AGE_CATEGORIES, value)) return value as AgeCategory;
  return typeof value === "string" ? legacy[value] ?? fallback : fallback;
}

/** Legacy character saves may not contain a race value. */
export function normalizeRace(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface IdentityFields {
  gender: string;
  homeland: string;
  handedness: string;
  description: string;
}

/** Legacy character saves may not contain optional descriptive identity fields. */
export function normalizeIdentityFields(value: unknown): IdentityFields {
  const saved = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<IdentityFields>
    : {};
  return {
    gender: typeof saved.gender === "string" ? saved.gender : "",
    homeland: typeof saved.homeland === "string" ? saved.homeland : "",
    handedness: typeof saved.handedness === "string" ? saved.handedness : "",
    description: typeof saved.description === "string" ? saved.description : "",
  };
}

/** Fill newly added background fields and discard malformed imported collection values. */
export function normalizeBackground(value: unknown, fallback: BackgroundData): BackgroundData {
  const saved = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<BackgroundData>
    : {};
  const strings = (candidate: unknown, original: string[]) =>
    Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === "string") : original;
  const events = (candidate: unknown, original: BackgroundEvent[]) => Array.isArray(candidate)
    ? candidate.filter((event): event is BackgroundEvent & { text?: unknown } => !!event && typeof event === "object"
      && Number.isInteger(event.roll) && event.roll >= 0 && event.roll <= 100)
      .map(event => {
        const range = typeof event.range === "string" && coreBackgroundEventForRange(event.range)
          ? event.range
          : coreBackgroundEventForRoll(event.roll)?.range ?? "";
        return { roll: event.roll, range, ...(event.source === "rolled" || event.source === "chosen" ? { source: event.source } : {}) };
      })
    : original;
  return {
    ...fallback,
    ...saved,
    socialClassRoll: Number.isFinite(saved.socialClassRoll) ? saved.socialClassRoll! : fallback.socialClassRoll,
    socialClass: typeof saved.socialClass === "string" ? saved.socialClass : fallback.socialClass,
    socialClassCulture: ["Barbarian", "Civilised", "Nomadic", "Primitive"].includes(saved.socialClassCulture as string)
      ? saved.socialClassCulture as CultureKind : fallback.socialClassCulture,
    socialClassMethod: saved.socialClassMethod === "chosen" ? "chosen" : "rolled",
    socialClassMoney: Number.isFinite(saved.socialClassMoney) ? saved.socialClassMoney! : fallback.socialClassMoney,
    socialClassEquipment: typeof saved.socialClassEquipment === "string" ? saved.socialClassEquipment : fallback.socialClassEquipment,
    socialClassResources: typeof saved.socialClassResources === "string" ? saved.socialClassResources : fallback.socialClassResources,
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
    events: events(saved.events, fallback.events),
    archivedEvents: events(saved.archivedEvents, fallback.archivedEvents),
    familyTies: strings(saved.familyTies, fallback.familyTies),
    connections: strings(saved.connections, fallback.connections),
    purchases: Array.isArray(saved.purchases)
      ? saved.purchases.filter((item): item is { name: string; cost: number } =>
          !!item && typeof item === "object" && typeof item.name === "string" && Number.isFinite(item.cost) && item.cost >= 0)
      : fallback.purchases,
  };
}
