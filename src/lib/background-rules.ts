import type { CultureKind } from "./content";
import { AGE_CATEGORIES, type AgeCategory } from "./rules";

export interface SocialClass {
  name: string;
  min: number;
  max: number;
  money: number;
  equipment: string;
  possessions: string;
}

export const BACKGROUND_EVENT_COUNTS: Record<AgeCategory, number> = Object.fromEntries(
  Object.entries(AGE_CATEGORIES).map(([category, details]) => [category, details.backgroundEvents]),
) as Record<AgeCategory, number>;

export interface BackgroundEvent {
  /** The percentile result on the official Mythras Background Events table; 0 means unresolved. */
  roll: number;
  /** Event text recorded by the player from their copy of the Core Rules. */
  text: string;
  source?: "rolled" | "chosen";
}

/** Keep exactly the age-derived number of active slots while retaining any displaced results. */
export function reconcileBackgroundEvents(
  events: BackgroundEvent[],
  archived: BackgroundEvent[],
  count: number,
): { events: BackgroundEvent[]; archived: BackgroundEvent[] } {
  const active = [...events];
  const retained = archived.filter(event => isMeaningfulBackgroundEvent(event));
  if (active.length > count) retained.unshift(...active.splice(count).filter(isMeaningfulBackgroundEvent));
  while (active.length < count) active.push(retained.shift() ?? { roll: 0, text: "" });
  return { events: active, archived: retained };
}

export function isResolvedBackgroundEvent(event: BackgroundEvent): boolean {
  return Number.isInteger(event.roll) && event.roll >= 1 && event.roll <= 100;
}

export function resolvedBackgroundEvents(events: BackgroundEvent[]): { event: BackgroundEvent; index: number }[] {
  return events.flatMap((event, index) => isResolvedBackgroundEvent(event) ? [{ event, index }] : []);
}

export function setBackgroundEventResult(
  current: BackgroundEvent,
  roll: number,
  source: NonNullable<BackgroundEvent["source"]>,
): BackgroundEvent {
  return {
    roll,
    text: !isResolvedBackgroundEvent(current) || current.roll === roll ? current.text : "",
    source,
  };
}

function isMeaningfulBackgroundEvent(event: BackgroundEvent): boolean {
  return isResolvedBackgroundEvent(event) || !!event.text.trim() || !!event.source;
}
export const CULTURE_MONEY_MULTIPLIERS: Record<CultureKind, number> = { Barbarian: 50, Civilised: 75, Nomadic: 25, Primitive: 10 };

const civilised: SocialClass[] = [
  { name: "Outcast", min: 1, max: 2, money: .25, equipment: "Clothes worn", possessions: "None; personal armament" },
  { name: "Slave", min: 3, max: 20, money: .5, equipment: "Clothes worn", possessions: "Keepsakes" },
  { name: "Freeman", min: 21, max: 70, money: 1, equipment: "Tools; simple weapons", possessions: "Rented accommodation; may own a few livestock" },
  { name: "Gentry", min: 71, max: 95, money: 3, equipment: "Tools; weapons; armour; mount", possessions: "Farmstead, business or ship; servants; support from locals" },
  { name: "Aristocracy", min: 96, max: 99, money: 5, equipment: "As Gentry, with several mounts", possessions: "Several properties or businesses; many servants; regional fealty" },
  { name: "Ruling", min: 100, max: 100, money: 10, equipment: "Highest quality equipment", possessions: "As Aristocracy, with the fealty of a nation" },
];

function table(rows: [number, number, string][], equipment: Record<string, string> = {}): SocialClass[] {
  return rows.map(([min, max, name]) => {
    const base = civilised.find(row => row.name === name) ?? civilised[4];
    return { ...base, name: name === "Ruling (Aristocracy)" ? "Ruling" : name,
      min, max, money: name === "Ruling (Aristocracy)" ? 5 : base.money,
      equipment: equipment[name] ?? base.equipment };
  });
}

export const SOCIAL_CLASSES: Record<CultureKind, SocialClass[]> = {
  Civilised: civilised,
  Barbarian: table([[1, 5, "Outcast"], [6, 15, "Slave"], [16, 80, "Freeman"], [81, 95, "Gentry"], [96, 100, "Ruling (Aristocracy)"]]),
  Nomadic: table([[1, 5, "Outcast"], [6, 10, "Slave"], [11, 90, "Freeman"], [91, 100, "Ruling (Aristocracy)"],], {
    "Ruling (Aristocracy)": "As Aristocracy; boats or carts instead of properties or businesses",
  }),
  Primitive: table([[1, 5, "Outcast"], [6, 80, "Freeman"], [81, 100, "Ruling"]], {
    Ruling: "Large hall; valuable trophies, skins or totems",
  }).map(row => row.name === "Ruling" ? { ...row, money: 2 } : row),
};

export function socialClassForRoll(kind: CultureKind, roll: number): SocialClass {
  return SOCIAL_CLASSES[kind].find(row => roll >= row.min && roll <= row.max) ?? SOCIAL_CLASSES[kind][0];
}

export function classMoneyMultiplier(kind: CultureKind, rank: string): number {
  return SOCIAL_CLASSES[kind].find(row => row.name === rank)?.money ?? 1;
}

export function calculateStartingMoney(roll: number, moneyTable: CultureKind, socialTable: CultureKind, rank: string): number {
  return roll * CULTURE_MONEY_MULTIPLIERS[moneyTable] * classMoneyMultiplier(socialTable, rank);
}

export const PARENTS = [
  [1, 20, "Both parents living"], [21, 40, "Only father living"],
  [41, 60, "One birth parent living plus step-parent"], [61, 80, "Only mother living"],
  [81, 100, "Both parents dead"],
] as const;

export const SIBLINGS = [
  [1, 10, "No siblings"], [11, 30, "1d4 siblings"], [31, 70, "1d6 siblings"],
  [71, 90, "1d8 siblings"], [91, 100, "1d10 siblings"],
] as const;

export const EXTENDED_FAMILY = [
  [1, 10, "None"], [11, 30, "1d2-1 grandparents, 1d2 aunts/uncles, 1d3 cousins"],
  [31, 70, "1d3-1 grandparents, 1d3 aunts/uncles, 1d4 cousins"],
  [71, 90, "1d3 grandparents, 1d4 aunts/uncles, 1d6 cousins"],
  [91, 100, "1d3+1 grandparents, 1d6 aunts/uncles, 1d8 cousins"],
] as const;

export const FAMILY_STANDING = [
  [1, 15, "Poor", "1d3 Enemies or Rivals"],
  [16, 35, "Sound, but perhaps with secrets", "1 Enemy or Rival"],
  [36, 65, "Sound", "None"],
  [66, 85, "Good, but possibly with those resentful", "1 Contact or Ally"],
  [86, 100, "Untarnished; excellent standing", "1d3 Contacts or Allies"],
] as const;

export const CONNECTIONS = [
  [1, 20, "None of note", 0], [21, 80, "Reasonable connections within the community", 1],
  [81, 90, "Well-connected; known to local powers", 2], [91, 95, "Well-connected; known to regional powers", 3],
  [96, 100, "Well-connected; known to national powers", 4],
] as const;

export const CONNECTION_TYPES = ["Ally", "Contact", "Enemy", "Rival"] as const;

export function tableResult<T extends readonly (readonly [number, number, ...unknown[]])[]>(rows: T, roll: number): T[number] {
  return rows.find(row => roll >= row[0] && roll <= row[1]) ?? rows[0];
}
