import { CONNECTIONS, FAMILY_STANDING, resolvedBackgroundEvents, resolveBackgroundEvent, tableResult } from "./background-rules";
import { baseName, passionStartingValue } from "./calc";
import type { HitLocation } from "./calc";
import { formatFamilyRelationships } from "./family-relationships";
import { CORE_FOLK_MAGIC_SPELLS, FOLK_MAGIC_TRAIT_HELP } from "./folk-magic";
import { mysticismCatalogue, mysticismTalentDetails } from "./mysticism";
import { sorceryCatalogue, sorcerySpellDetails } from "./sorcery";
import { CORE_THEIST_CULTS, CORE_THEIST_MIRACLES } from "./theism";
import { CORE_SPIRIT_TYPES } from "./animism";
import { MAGIC, RESISTANCES, STANDARD, STATS, type Stat } from "./rules";
import type { Character } from "./store.svelte";
import { displayEquipmentName, EQUIPMENT_CATALOGUE } from "./equipment-catalogue";
import { formatRangedRange, rangedCellText, RANGED_WEAPON_STATS, type RangedCell } from "./ranged-weapons";
import { encumbranceSummary } from "./encumbrance";
import { HIT_LOCATIONS, fullArmourEncumbrance, summarizeArmour } from "./armour-rules";
import { rankTitle } from "./organisations";
import { devotionalPoolMaximum } from "./theism";

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
export interface SheetCultEntry { heading: string; paragraphs: string[] }

export interface SheetData {
  identity: Record<"name" | "player" | "race" | "gender" | "frame" | "homeland" | "age" | "height" | "career" | "handedness" | "weight" | "socialClass" | "description", string>;
  notes: string[];
  money: string[];
  cult: SheetCultEntry[];
  devotionalPool: { current: string; maximum: string };
  characteristics: Record<Stat, string>;
  attributes: Record<"actionPoints" | "damageModifier" | "experienceModifier" | "healingRate" | "initiative" | "luckPoints" | "movement", string>;
  standard: Record<string, string>;
  resistances: Record<string, string>;
  professional: SheetSkillRow[];
  magical: SheetSkillRow[];
  languages: (SheetSkillRow & { native: boolean })[];
  passions: { label: string; total: string }[];
  magic: { tradition: string; summary: string; detail: string }[];
  hitLocations: Record<string, string>;
  equipment: { name: string; enc: string }[];
  armour: { name: string; ap: string; enc: string }[];
  weapons: { name: string; damage: string; size: string; reach: string; traits: string; force: string; damageModifier: string; range: string; load: string; combatEffects: string; ap: string; hp: string; enc: string; ranged: boolean }[];
  encumbrance: { armour: string; armourPenalty: string; total: string; burdened: string; overloaded: string };
  combatStyles: { name: string; weapons: string; traits: string; percentage: string }[];
}

const clean = (text: string) => text.trim().replace(/\s+/g, " ");
const signed = (value: string | number) => typeof value === "number" && value > 0 ? `+${value}` : String(value);
const attribute = (stats: SheetSource["stats"], name: string) => String(stats.find(([label]) => label === name)?.[1] ?? "");
const rangedText = <T,>(cell: RangedCell<T>, format?: (value: T) => string) =>
  cell.status === "unknown" ? "" : rangedCellText(cell, format);

function buildCultInformation(char: Character): SheetCultEntry[] {
  const memberships = char.memberships.flatMap((membership, order) => {
    const organisation = char.organisations.find(item => item.id === membership.organisationId);
    if (!organisation) return [];
    const kind = organisation.kind.type === "magical-cult" ? organisation.kind.discipline
      : organisation.kind.type === "brotherhood" ? organisation.kind.subtype
        : organisation.kind.category || "Organisation";
    const details = organisation.details;
    const list = (value: unknown) => Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && !!item.trim()).map(clean) : [];
    const paragraphs = [
      organisation.focus && `Focus: ${clean(organisation.focus)}`,
      organisation.description && `Description: ${clean(organisation.description)}`,
      list(details?.benefits).length && `Benefits: ${list(details?.benefits).join(", ")}`,
      list(details?.privileges).length && `Privileges: ${list(details?.privileges).join(", ")}`,
      list(details?.gifts).length && `Gifts: ${list(details?.gifts).join(", ")}`,
      list(details?.restrictions).length && `Restrictions: ${list(details?.restrictions).join(", ")}`,
      list(details?.duties).length && `Obligations: ${list(details?.duties).join(", ")}`,
      list(details?.skillsTaught).length && `Skills taught: ${list(details?.skillsTaught).join(", ")}`,
      list(details?.contacts).length && `Contacts: ${list(details?.contacts).join(", ")}`,
      list(details?.affiliations).length && `Affiliations: ${list(details?.affiliations).join(", ")}`,
      typeof details?.notes === "string" && details.notes.trim() && `Organisation notes: ${clean(details.notes)}`,
      membership.notes?.trim() && `Membership notes: ${clean(membership.notes)}`,
    ].filter((value): value is string => typeof value === "string");
    return [{ order, name: clean(organisation.name), kind: clean(kind), rank: clean(membership.titleOverride?.trim() || rankTitle(membership.rank, organisation)), paragraphs }];
  });
  return memberships.sort((left, right) => left.name.localeCompare(right.name) || left.order - right.order)
    .map(({ name, kind, rank, paragraphs }) => ({ heading: `${name} (${kind}) — ${rank}`, paragraphs }));
}

function buildDevotionalPool(char: Character): SheetData["devotionalPool"] {
  const membership = char.magic.theism.memberships[0];
  if (!membership) return { current: "", maximum: "" };
  return { current: String(membership.devotionalPool), maximum: String(devotionalPoolMaximum(char.chars.POW, membership.rank)) };
}

/** Weapon Traits come from the Core equipment row, separate from character Combat Style traits. */
function coreWeaponTraits(sourceLine: string): string {
  return [...sourceLine.matchAll(/\b(Stun\s+Location|Entangle|Bleed|Impale|Sunder|Bash)\b/gi)]
    .map(match => match[1]!.replace(/\s+/g, " "))
    .join(", ");
}

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

/** Details are resolved only for recorded choices. Unknown catalogue entries are omitted. */
export function buildMagicEntries(char: Character): SheetData["magic"] {
  const magic = char.magic, entries: SheetData["magic"] = [];
  const add = (tradition: string, name: string, rules: string[], notes: string[] = [], detailLabel = "Rules") => {
    const detail = [`${tradition} — ${name}`, ...rules.map(value => `${detailLabel}: ${value}`), ...notes.map(value => `Player/GM notes: ${value}`)].join("\n");
    const summary = `${tradition}: ${name}${rules.length ? ` — ${rules[0]}` : ""}`;
    const group = tradition.startsWith("Folk Magic") ? "Folk Magic"
      : tradition.startsWith("Sorcery") ? "Sorcery"
        : tradition.startsWith("Theism") ? "Theism"
          : tradition.startsWith("Mysticism") ? "Mysticism"
            : tradition.startsWith("Animism") ? "Animism" : "Other supernatural powers";
    entries.push({ tradition: group, summary, detail });
  };

  for (const known of magic.folkMagic.knownSpells) {
    const { spell } = known;
    const core = CORE_FOLK_MAGIC_SPELLS.find(item => item.id === spell.spellId);
    const custom = magic.folkMagic.customSpells.find(item => item.id === spell.spellId);
    const name = core?.name ?? custom?.name;
    if (!name) continue;
    const label = `${name}${spell.specialisation ? ` (${spell.specialisation})` : ""}`;
    const rules = core ? [core.details.effect, ...core.details.traits.map(trait => FOLK_MAGIC_TRAIT_HELP[trait]).filter(Boolean),
      ...(!core.details.traits.some(trait => ["Concentration", "Instant", "Special Duration"].includes(trait)) ? [FOLK_MAGIC_TRAIT_HELP["Normal duration"]] : [])]
      : custom?.description.trim() ? [custom.description.trim()] : [];
    const provenanceNotes = known.provenance.map(item => item.notes).filter((value): value is string => !!value?.trim());
    add("Folk Magic", label, rules, provenanceNotes, core ? "Rules" : "Recorded effect");
  }

  const spells = sorceryCatalogue(magic.sorcery);
  for (const known of magic.sorcery.knownSpells) {
    const spell = spells.find(item => item.id === known.spellId);
    if (!spell) continue;
    const details = sorcerySpellDetails(spell);
    const rules = [details?.effect, ...(details?.traits ?? []).map(trait => `Trait: ${trait}`),
      ...(magic.sorcery.shapingRules?.addComponents ?? []).map(component => `Shaping: ${component}`),
      ...(magic.sorcery.shapingRules?.removeComponents ?? []).map(component => `Shaping excludes ${component}`)].filter((value): value is string => !!value);
    const notes = [spell.notes, known.notes, known.sourceDescription, known.acquiredFrom].filter((value): value is string => !!value?.trim());
    add("Sorcery (known)", spell.name, rules, notes, spell.source === "core" ? "Rules" : "Recorded effect");
  }

  const mysticism = mysticismCatalogue(magic.mysticism);
  const startingPath = mysticism.paths.find(path => path.id === magic.mysticism.startingPathId);
  if (startingPath) {
    const organisation = mysticism.organisations.find(item => item.id === startingPath.organisationId);
    add("Mysticism Path", startingPath.name,
      [startingPath.description, organisation && `Organisation: ${organisation.name}`].filter((value): value is string => !!value),
      [startingPath.notes, startingPath.teacher && `Teacher: ${startingPath.teacher}`].filter((value): value is string => !!value),
      startingPath.source === "core" ? "Rules" : "Recorded details");
  }
  for (const known of magic.mysticism.knownTalents) {
    const talent = mysticism.talents.find(item => item.id === known.talentId);
    if (!talent) continue;
    const details = mysticismTalentDetails(talent);
    add("Mysticism", talent.name, [details.effect, details.cost && `Cost: ${details.cost}`].filter(Boolean), [talent.notes, talent.description, known.notes].filter((value): value is string => !!value?.trim()), talent.source === "core" ? "Rules" : "Recorded effect");
  }

  for (const membership of magic.theism.memberships) {
    const cult = [...CORE_THEIST_CULTS, ...magic.theism.customCults].find(item => item.id === membership.cultId);
    for (const id of membership.knownMiracleIds) {
      const miracle = CORE_THEIST_MIRACLES.find(item => item.id === id);
      if (!miracle) continue;
      const offering = cult?.miracles.find(item => item.miracleId === id);
      const name = offering?.name ?? miracle.name;
      add(`Theism (${cult?.name ?? "cult unspecified"}, ${membership.rank})`, name,
        [miracle.description, `Cost ${miracle.mpCost} MP; exhortation ${miracle.exhortationTime}; ${miracle.traits.join(", ")}`,
          `Devotion (${membership.devotionSpecialisation}) ${membership.devotionValue}%; Exhort ${membership.exhortValue}%; Devotional Pool ${membership.devotionalPool} MP`].filter(Boolean));
    }
  }

  const spiritTypes = [...CORE_SPIRIT_TYPES, ...magic.animism.customSpiritTypes, ...magic.animism.traditions.flatMap(item => item.customSpiritTypes)];
  const bindings = new Map(magic.animism.bindings.map(binding => [binding.spiritId, binding]));
  const allies = new Map(magic.animism.allies.map(ally => [ally.spiritId, ally]));
  for (const spirit of magic.animism.spirits) {
    const spiritType = spiritTypes.find(item => item.id === spirit.spiritTypeId)?.name;
    const stat = (label: string, value: unknown) => value === undefined ? "" : `${label} ${String(value)}`;
    const stats = [stat("POW", spirit.pow), spirit.pow === undefined && spirit.powRange && `POW ${spirit.powRange[0]}–${spirit.powRange[1]} (range)`, stat("INT", spirit.int), stat("INS", spirit.ins), stat("CHA", spirit.cha),
      stat("Intensity", spirit.intensity), stat("MP", spirit.magicPoints), stat("Spectral Combat", spirit.spectralCombat),
      stat("Willpower", spirit.willpower), stat("Stealth", spirit.stealth), stat("Action Points", spirit.actionPoints), stat("Initiative", spirit.initiative)].filter(Boolean);
    const skills = (spirit.skills ?? []).map(skill => `${skill.name} ${skill.value}`);
    const binding = bindings.get(spirit.id), ally = allies.get(spirit.id);
    const status = [spirit.attitude && `attitude ${spirit.attitude}`, binding && `bound to ${binding.objectName || binding.vessel}${binding.description ? ` (${binding.description})` : ""}`, ally && `ally (${ally.attitude})`].filter(Boolean);
    const notes = [spirit.notes, binding?.notes, ally?.notes].filter((value): value is string => !!value?.trim());
    const typeDetails = spirit.typeData && Object.keys(spirit.typeData).length ? `Recorded type details: ${JSON.stringify(spirit.typeData)}` : "";
    add("Animism", spirit.name.trim() || "Unnamed spirit", [spiritType && `Type: ${spiritType}`, ...stats, spirit.abilities.length && `Abilities: ${spirit.abilities.join(", ")}`, skills.length && `Skills: ${skills.join(", ")}`, typeDetails, ...status].filter((value): value is string => !!value), notes, "Recorded details");
  }
  return entries;
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
  const inventory = char.background.inventory;
  const equipment = inventory.map(item => {
    const catalogue = item.catalogueId ? EQUIPMENT_CATALOGUE.find(entry => entry.source.id === item.catalogueId)?.source : undefined;
    const armourEnc = item.armour ? fullArmourEncumbrance(item.armour, item.quantity) : null;
    return {
      name: `${clean(displayEquipmentName(item.name, catalogue?.category))}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
      enc: item.armour ? (armourEnc === null ? "" : formatNumber(armourEnc))
        : item.encPerUnit === null ? "" : formatNumber(item.encPerUnit * item.quantity),
    };
  });
  const wornArmour = inventory.filter(item => item.armour && item.state === "worn");
  const armourPieces = wornArmour.map(item => ({
    id: item.id, name: item.name, ...item.armour!, state: item.state, quantity: item.quantity,
  }));
  // Keep printed protection in lockstep with Page IX's authoritative location summary.
  const armourSummary = summarizeArmour(armourPieces);
  const armour = HIT_LOCATIONS.map(location => {
    const covering = wornArmour.filter(item => item.armour!.locations.includes(location));
    const names = [...new Set(covering.map(item =>
      `${clean(displayEquipmentName(item.name))}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
    ))];
    // The ruled ENC cell is the sum of worn ENC contributed at this location.
    // fullArmourEncumbrance is the piece's total across covered locations, so divide
    // by its location count before assigning that contribution to each row.
    const locationEnc = covering.reduce((total, item) => {
      const enc = fullArmourEncumbrance(item.armour!, item.quantity);
      return enc === null ? null : total === null ? null : total + (item.armour!.locations.length ? enc / item.armour!.locations.length : 0);
    }, 0 as number | null);
    const ap = armourSummary.apByLocation[location];
    return {
      name: names.join(" + "),
      ap: ap === null ? "?" : String(ap),
      enc: !covering.length || locationEnc === null ? "" : formatNumber(locationEnc),
    };
  });
  const weapons = inventory.flatMap(item => {
    const catalogue = item.catalogueId ? EQUIPMENT_CATALOGUE.find(entry => entry.source.id === item.catalogueId)?.source : undefined;
    const custom = item.customItem;
    const category = custom?.type === "weapon" || custom?.type === "shield"
      ? custom.type
      : catalogue?.category === "ranged" ? "ranged"
        : catalogue && ["one_handed", "two_handed", "shields"].includes(catalogue.category) ? "melee" : "";
    if (!category) return [];
    const profile = catalogue?.combat_profile_candidate;
    const rangedStats = category === "ranged" && catalogue ? RANGED_WEAPON_STATS[catalogue.id] : undefined;
    const traits = category === "melee" && catalogue ? coreWeaponTraits(catalogue.source_line) : "";
    return [{
      name: `${clean(displayEquipmentName(item.name, catalogue?.category))}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
      damage: rangedStats ? rangedText(rangedStats.damage) : custom?.damage ?? profile?.damage ?? "",
      size: custom?.size ?? profile?.size ?? "", reach: custom?.reach ?? profile?.reach ?? "", traits,
      force: rangedStats ? rangedText(rangedStats.force) : "",
      damageModifier: rangedStats ? rangedText(rangedStats.damageModifier) : "",
      range: rangedStats ? formatRangedRange(rangedStats.range).replace(/ m$/, "") : "",
      load: rangedStats ? rangedText(rangedStats.load) : "",
      // The ranged table supplies its listed effects; do not duplicate weapon Traits or invent melee effects.
      combatEffects: rangedStats ? rangedText(rangedStats.combatEffects) : "",
      ap: custom?.ap !== undefined ? String(custom.ap) : rangedStats ? rangedText(rangedStats.ap) : catalogue?.ap_candidate === undefined ? "" : String(catalogue.ap_candidate),
      hp: custom?.hp !== undefined ? String(custom.hp) : rangedStats ? rangedText(rangedStats.hp) : catalogue?.hp_candidate === undefined ? "" : String(catalogue.hp_candidate),
      enc: item.encPerUnit !== null ? formatNumber(item.encPerUnit * item.quantity)
        : rangedStats ? rangedText(rangedStats.enc) : catalogue?.enc_candidate === undefined ? "" : String(catalogue.enc_candidate),
      ranged: category === "ranged",
    }];
  });
  const load = encumbranceSummary(inventory, char.chars.STR);
  const armourEnc = armourSummary.fullWornEnc;
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
    cult: buildCultInformation(char),
    devotionalPool: buildDevotionalPool(char),
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
    magic: buildMagicEntries(char),
    hitLocations: Object.fromEntries(SHEET_HIT_LOCATIONS.map(name => [name, hit[name] ?? ""])),
    equipment,
    armour,
    weapons,
    encumbrance: {
      armour: armourEnc === null || !wornArmour.length ? "" : formatNumber(armourEnc),
      armourPenalty: armourSummary.initiativePenalty === null || !wornArmour.length ? "" : String(armourSummary.initiativePenalty),
      total: load.load === null ? "" : formatNumber(load.load),
      burdened: load.thresholds ? formatNumber(load.thresholds.burdened) : "",
      overloaded: load.thresholds ? formatNumber(load.thresholds.overloaded) : "",
    },
    combatStyles: source.styles.map(style => ({
      name: style.name, weapons: style.weapons.map(weapon => weapon.name).join(", "),
      traits: style.traits.map(trait => trait.displayName).join(", "), percentage: String(style.percentage),
    })),
  };
}

const formatNumber = (value: number) => Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
