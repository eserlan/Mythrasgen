import type { CultureKind } from "./content";
import { AGE_CATEGORIES, type AgeCategory } from "./rules";
import type { BackgroundEvent } from "./background-rules";
import { CORE_BACKGROUND_EVENTS, coreBackgroundEventForRoll } from "./background-events";
import { ALL_RELATIONSHIP_TYPES, type FamilyRelationship, type RelationshipType } from "./family-relationships";

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
  standingResolved: boolean;
  familyReputationCountRoll: number;
  familyTies: string[];
  connectionsRoll: number;
  connectionsResolved: boolean;
  connections: string[];
  relationships: FamilyRelationship[];
  startingMoneyRoll: number;
  startingMoneyKey: string;
  startingMoneyTotal: number;
  currentMoney: number;
  equipment: string;
  purchases: { name: string; cost: number }[];
}

/** Keep old saves on the same logical screen when Magic is inserted before Background. */
export function migrateCharacterStep(step: number, hasBackground: boolean, hasMagic = false): number {
  if (hasMagic) return Math.max(0, Math.min(8, step));
  if (!hasBackground && step === 5) return 8;
  if (hasBackground && step === 5) return 6;
  if (step === 6) return 7;
  if (step === 7) return 8;
  return step;
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
  const legacyRelationships = [
    ...strings(saved.familyTies, fallback.familyTies).filter((type): type is RelationshipType => ALL_RELATIONSHIP_TYPES.includes(type as RelationshipType)).map(type => ({
      source: "reputation" as const,
      allowedTypes: (type === "Enemy" || type === "Rival" ? ["Enemy", "Rival"] : ["Contact", "Ally"]) as RelationshipType[],
      type: type as RelationshipType,
      name: "",
    })),
    ...strings(saved.connections, fallback.connections).filter((type): type is RelationshipType => ALL_RELATIONSHIP_TYPES.includes(type as RelationshipType)).map(type => ({
      source: "connections" as const, allowedTypes: [...ALL_RELATIONSHIP_TYPES], type: type as RelationshipType, name: "",
    })),
  ];
  const legacyFamilyTies = strings(saved.familyTies, fallback.familyTies);
  const legacyConnections = strings(saved.connections, fallback.connections);
  const relationships = (candidate: unknown): FamilyRelationship[] => Array.isArray(candidate)
    ? candidate.flatMap(item => {
      if (!item || typeof item !== "object") return [];
      const relation = item as Partial<FamilyRelationship>;
      const allowedTypes = Array.isArray(relation.allowedTypes)
        ? relation.allowedTypes.filter((type): type is RelationshipType => ALL_RELATIONSHIP_TYPES.includes(type as RelationshipType))
        : [];
      if ((relation.source !== "reputation" && relation.source !== "connections") || !allowedTypes.length
          || !ALL_RELATIONSHIP_TYPES.includes(relation.type as RelationshipType)) return [];
      return [{ source: relation.source, allowedTypes, type: allowedTypes.includes(relation.type as RelationshipType) ? relation.type as RelationshipType : allowedTypes[0],
        name: typeof relation.name === "string" ? relation.name : "" }];
    })
    : legacyRelationships;
  const events = (candidate: unknown, original: BackgroundEvent[]) => Array.isArray(candidate)
    ? candidate.filter((event): event is BackgroundEvent => !!event && typeof event === "object"
      && Number.isInteger(event.roll) && event.roll >= 0 && event.roll <= 100)
      .map(event => {
        const legacyRange = (event as BackgroundEvent & { range?: unknown }).range;
        const savedIdentity = typeof event.eventId === "string" ? event.eventId : legacyRange;
        const resolved = (typeof savedIdentity === "string" ? CORE_BACKGROUND_EVENTS.find(item => item.range === savedIdentity) : undefined)
          ?? coreBackgroundEventForRoll(event.roll);
        const eventId = resolved?.range;
        const roll = event.source === "chosen" ? 0 : event.roll;
        return eventId
          ? { roll, eventId, ...(event.source === "rolled" || event.source === "chosen" ? { source: event.source } : {}) }
          : { roll, ...(typeof event.text === "string" ? { text: event.text } : {}) };
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
    standingResolved: typeof saved.standingResolved === "boolean" ? saved.standingResolved
      : (Number.isFinite(saved.standingRoll) && saved.standingRoll !== 50) || legacyFamilyTies.length > 0,
    familyReputationCountRoll: Number.isInteger(saved.familyReputationCountRoll) && saved.familyReputationCountRoll! >= 0
      ? saved.familyReputationCountRoll! : fallback.familyReputationCountRoll,
    connectionsRoll: Number.isFinite(saved.connectionsRoll) ? saved.connectionsRoll! : fallback.connectionsRoll,
    connectionsResolved: typeof saved.connectionsResolved === "boolean" ? saved.connectionsResolved
      : (Number.isFinite(saved.connectionsRoll) && saved.connectionsRoll !== 50) || legacyConnections.length > 0,
    startingMoneyRoll: Number.isFinite(saved.startingMoneyRoll) ? saved.startingMoneyRoll! : fallback.startingMoneyRoll,
    startingMoneyKey: typeof saved.startingMoneyKey === "string" ? saved.startingMoneyKey : fallback.startingMoneyKey,
    startingMoneyTotal: Number.isFinite(saved.startingMoneyTotal) ? saved.startingMoneyTotal! : fallback.startingMoneyTotal,
    currentMoney: Number.isFinite(saved.currentMoney) && saved.currentMoney! >= 0 ? saved.currentMoney! : fallback.currentMoney,
    equipment: typeof saved.equipment === "string" ? saved.equipment : fallback.equipment,
    events: events(saved.events, fallback.events),
    archivedEvents: events(saved.archivedEvents, fallback.archivedEvents),
    familyTies: legacyFamilyTies,
    connections: legacyConnections,
    relationships: relationships(saved.relationships),
    purchases: Array.isArray(saved.purchases)
      ? saved.purchases.filter((item): item is { name: string; cost: number } =>
          !!item && typeof item === "object" && typeof item.name === "string" && Number.isFinite(item.cost) && item.cost >= 0)
      : fallback.purchases,
  };
}
