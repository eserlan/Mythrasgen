import { CONNECTIONS, FAMILY_STANDING, resolvedBackgroundEvents, resolveBackgroundEvent, tableResult } from "./background-rules";
import { baseName, passionStartingValue } from "./calc";
import type { HitLocation } from "./calc";
import { formatFamilyRelationships } from "./family-relationships";
import { CORE_FOLK_MAGIC_SPELLS } from "./folk-magic";
import { mysticismCatalogue } from "./mysticism";
import { sorceryCatalogue } from "./sorcery";
import { MAGIC, RESISTANCES, STANDARD, STATS, type Stat } from "./rules";
import type { Character } from "./store.svelte";

/** The official sheet's printed Standard Skills; Resistances and Native Tongue are printed elsewhere. */
export const SHEET_STANDARD_SKILLS = STANDARD.map(([name]) => name).filter(name =>
  !RESISTANCES.includes(name as typeof RESISTANCES[number]) && name !== "Native Tongue");
/** Hit Locations in the official sheet's printed order. */
export const SHEET_HIT_LOCATIONS = ["Head", "Left Arm", "Right Arm", "Chest", "Abdomen", "Left Leg", "Right Leg"] as const;

export interface SheetStyle {
  name: string;
  percentage: number;
  weapons: { name: string }[];
  traits: { displayName: string }[];
}

/** Everything the sheet needs, supplied by the caller so this module stays free of store state. */
export interface SheetSource {
  char: Character;
  cultureName: string;
  careerName: string;
  loc: HitLocation[];
  stats: [string, string | number][];
  total(skill: string): number;
  base(skill: string): number;
  /** Learned and allocated skill names, including specialisations. */
  skills: string[];
  nativeTongue: string;
  styles: SheetStyle[];
  socialClassReady: boolean;
  startingMoney: number;
}

export interface SheetSkillRow { name: string; base: string; total: string }

export interface SheetData {
  identity: Record<"name" | "player" | "race" | "gender" | "frame" | "homeland" | "age" | "height" | "career" | "handedness" | "weight" | "socialClass" | "description", string>;
  notes: string[];
  money: string[];
  cult: string[];
  characteristics: Record<Stat, string>;
  attributes: Record<"actionPoints" | "damageModifier" | "experienceModifier" | "healingRate" | "initiative" | "luckPoints" | "movement", string>;
  standard: Record<string, string>;
  resistances: Record<string, string>;
  professional: SheetSkillRow[];
  magical: SheetSkillRow[];
  languages: (SheetSkillRow & { native: boolean })[];
  passions: { label: string; total: string }[];
  magic: string[];
  hitLocations: Record<string, string>;
  equipment: string[];
  combatStyles: { name: string; weapons: string; traits: string; percentage: string }[];
}

const clean = (text: string) => text.trim().replace(/\s+/g, " ");
const signed = (value: string | number) => typeof value === "number" && value > 0 ? `+${value}` : String(value);
const attribute = (stats: SheetSource["stats"], name: string) => String(stats.find(([label]) => label === name)?.[1] ?? "");

function notes({ char, socialClassReady }: SheetSource): string[] {
  const background = char.background;
  const standing = tableResult(FAMILY_STANDING, background.standingRoll), connections = tableResult(CONNECTIONS, background.connectionsRoll);
  const lines: string[] = [];
  if (background.parents.trim()) lines.push(`Parents: ${clean(background.parents)}`);
  if (background.siblings.trim()) lines.push(`Siblings: ${clean(background.siblings)}`);
  if (background.extendedFamily.trim()) lines.push(`Extended family: ${clean(background.extendedFamily)}`);
  if (background.standingResolved) lines.push(`Family standing: ${standing[2]}. Ties: ${formatFamilyRelationships(background.relationships, "reputation")}`);
  if (background.connectionsResolved) lines.push(`Connections: ${connections[2]} — ${formatFamilyRelationships(background.relationships, "connections")}`);
  for (const { event, index } of resolvedBackgroundEvents(background.events)) {
    const resolved = resolveBackgroundEvent(event);
    if (resolved) lines.push(`Background event ${index + 1} (${resolved.range}): ${resolved.text}`);
  }
  if (socialClassReady && background.socialClassResources.trim()) lines.push(`Resources: ${clean(background.socialClassResources)}`);
  return lines;
}

function skillRows(source: SheetSource, names: string[]): SheetSkillRow[] {
  return names.map(name => ({ name, base: String(source.base(name)), total: String(source.total(name)) }));
}

/** Folk Magic, Sorcery and Mysticism knowledge recorded on the character; nothing is inferred. */
function magicEntries({ char }: SheetSource): string[] {
  const magic = char.magic, lines: string[] = [];
  const folk = magic.folkMagic.knownSpells.map(({ spell }) => {
    const name = CORE_FOLK_MAGIC_SPELLS.find(item => item.id === spell.spellId)?.name ?? magic.folkMagic.customSpells.find(item => item.id === spell.spellId)?.name;
    return name ? `${name}${spell.specialisation ? ` (${spell.specialisation})` : ""}` : "";
  }).filter(Boolean);
  if (folk.length) lines.push(`Folk Magic: ${folk.join(", ")}`);
  const spells = sorceryCatalogue(magic.sorcery);
  const sorcery = magic.sorcery.knownSpells.map(({ spellId }) => spells.find(item => item.id === spellId)?.name).filter((name): name is string => !!name);
  if (sorcery.length) lines.push(`Sorcery: ${sorcery.join(", ")}`);
  const catalogue = mysticismCatalogue(magic.mysticism);
  const talents = magic.mysticism.knownTalents.map(({ talentId }) => catalogue.talents.find(item => item.id === talentId)?.name).filter((name): name is string => !!name);
  const path = catalogue.paths.find(item => item.id === magic.mysticism.startingPathId)?.name;
  if (talents.length || path) lines.push(`Mysticism${path ? ` (${path})` : ""}${talents.length ? `: ${talents.join(", ")}` : ""}`);
  const spirits = magic.animism.spirits.map(spirit => spirit.name.trim()).filter(Boolean);
  if (spirits.length) lines.push(`Spirits: ${spirits.join(", ")}`);
  return lines;
}

export function buildSheetData(source: SheetSource): SheetData {
  const { char } = source;
  const professionalNames: string[] = [], magicalNames: string[] = [], languageNames: string[] = [];
  const magicBases = new Set(MAGIC.map(([name]) => name));
  for (const name of source.skills) {
    const base = baseName(name);
    if (name.includes("(any)") || /^Combat Style\b/.test(name) || source.styles.some(style => style.name === name) || base === "Native Tongue") continue;
    if (base === "Language") languageNames.push(name);
    else if (magicBases.has(base)) magicalNames.push(name);
    else if (!SHEET_STANDARD_SKILLS.includes(name) && !RESISTANCES.includes(name as typeof RESISTANCES[number]) && !STANDARD.some(([standard]) => standard === base)) professionalNames.push(name);
  }
  const hit = Object.fromEntries(source.loc.map(location => [location.name, String(location.hp)]));
  const equipment = source.socialClassReady
    ? [...char.background.equipment.split(/[\n;]+/).map(clean), ...char.background.purchases.map(purchase => clean(purchase.name))].filter(Boolean)
    : [];
  return {
    identity: {
      name: clean(char.name), player: "", race: [char.race, source.cultureName].map(clean).filter(Boolean).join(" / "), gender: clean(char.gender), frame: char.frame,
      homeland: clean(char.homeland), age: String(char.age), height: char.height === null ? "" : `${char.height} cm`, career: source.careerName,
      handedness: clean(char.handedness), weight: char.weight === null ? "" : `${char.weight} kg`,
      socialClass: source.socialClassReady ? char.background.socialClass : "", description: clean(char.description),
    },
    notes: notes(source),
    money: [
      ...(source.socialClassReady ? [`Starting money: ${source.startingMoney} sp`] : []),
      `Current funds: ${char.background.currentMoney} sp`,
    ],
    cult: char.memberships.flatMap(member => {
      const organisation = char.organisations.find(item => item.id === member.organisationId);
      return organisation?.kind.type === "magical-cult" && organisation.kind.discipline === "Theism"
        ? [clean(`${organisation.name} (${organisation.kind.discipline})`)] : [];
    }),
    characteristics: Object.fromEntries(STATS.map(stat => [stat, String(char.chars[stat])])) as Record<Stat, string>,
    attributes: {
      actionPoints: attribute(source.stats, "Action Points"), damageModifier: attribute(source.stats, "Damage Modifier"),
      experienceModifier: signed(Number(attribute(source.stats, "Experience Mod"))), healingRate: attribute(source.stats, "Healing Rate"),
      initiative: attribute(source.stats, "Initiative"), luckPoints: attribute(source.stats, "Luck Points"),
      movement: attribute(source.stats, "Movement").replace(/m$/, ""),
    },
    standard: Object.fromEntries(SHEET_STANDARD_SKILLS.map(name => [name, String(source.total(name))])),
    resistances: Object.fromEntries(RESISTANCES.map(name => [name, String(source.total(name))])),
    professional: skillRows(source, professionalNames),
    magical: skillRows(source, magicalNames),
    languages: [
      { name: clean(char.nativeLanguage), base: String(source.base(source.nativeTongue)), total: String(source.total(source.nativeTongue)), native: true },
      ...skillRows(source, languageNames).map(row => ({ ...row, native: false })),
    ],
    passions: char.passionsEnabled ? char.passions.map(passion => {
      const value = passionStartingValue(passion.category, char.chars, { pow: passion.subjectPow, cha: passion.subjectCha });
      return { label: `${passion.type} (${clean(passion.subject) || "unnamed"})`, total: value === null ? "" : String(value) };
    }) : [],
    magic: magicEntries(source),
    hitLocations: Object.fromEntries(SHEET_HIT_LOCATIONS.map(name => [name, hit[name] ?? ""])),
    equipment,
    combatStyles: source.styles.map(style => ({
      name: style.name, weapons: style.weapons.map(weapon => weapon.name).join(", "),
      traits: style.traits.map(trait => trait.displayName).join(", "), percentage: String(style.percentage),
    })),
  };
}
