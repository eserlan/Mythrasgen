import type { Kind, Term } from "./rules";

export interface CombatWeaponReference {
  /** Optional key for a future weapon catalogue; custom names remain valid without one. */
  catalogueId?: string;
  name: string;
}

export interface CombatStyleTrait {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  source: CombatStyleSource;
}

export interface CombatStyleSource {
  libraryId: string;
  libraryName: string;
  reference?: string;
}

export interface CombatStyleDefinition {
  id: string;
  name: string;
  baseFormula: Term[];
  weapons: CombatWeaponReference[];
  traits: CombatStyleTrait[];
  /** Alternative weapon groups in the source preset; each group must be resolved when selected. */
  weaponChoices?: readonly (readonly CombatWeaponReference[])[];
  /** Alternative trait groups in the source preset; each group must be resolved when selected. */
  traitChoices?: readonly (readonly CombatStyleTrait[])[];
  /** Alternate names printed for the same style in the source. */
  aliases?: readonly string[];
  source: CombatStyleSource;
  notes?: string;
  status: "preset" | "custom";
  searchable: string[];
}

export type CombatStyleOrigin = Kind | "custom" | "legacy";
/** Character-owned style data. Presets are copied into this snapshot on selection. */
export interface CharacterCombatStyle extends Omit<CombatStyleDefinition, "searchable"> {
  origin: CombatStyleOrigin;
  origins: CombatStyleOrigin[];
  allocations: Partial<Record<Kind, number>>;
}
export type CombatStyleSelection = Omit<CombatStyleDefinition, "searchable" | "weaponChoices" | "traitChoices">;
type StyleInput = CombatStyleSelection;

const core = { libraryId: "mythras-core", libraryName: "Mythras Core" };
const coreTraitReference = "Mythras Core Rules, 3rd edition: Combat Style Traits, p. 89";
const traitId = (name: string) => `mythras-core:trait:${name.toLowerCase().replaceAll(" ", "-")}`;
const coreTrait = (name: string, description: string): CombatStyleTrait => ({
  id: traitId(name), name, displayName: name, description,
  source: { ...core, reference: coreTraitReference },
});
function freezePreset<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freezePreset);
  }
  return value;
}

/** Canonical catalogue from the Mythras Core Rules 3rd edition Combat Style Traits table. */
export const CORE_COMBAT_TRAITS: readonly CombatStyleTrait[] = Object.freeze([
  coreTrait("Assassination", "Lets the user choose the normally restricted Kill Silently special effect."),
  coreTrait("Batter Aside", "When your Damage Modifier is at least two steps above your opponent’s, your weapon counts as one size larger when bypassing parries."),
  coreTrait("Beast-back Lancer", "A mounted charge with this style does not take the usual one-grade difficulty penalty to hit."),
  coreTrait("Blind Fighting", "Ignore penalties caused by poor lighting or temporary blindness."),
  coreTrait("Cautious Fighter", "Use Change Range to withdraw from engagement automatically, without a roll."),
  coreTrait("Chariot Fighting", "When riding in a chariot, ignore the driver’s Drive skill cap on your combat rolls."),
  coreTrait("Daredevil", "Use Evade to dodge blows in hand-to-hand combat without falling prone."),
  coreTrait("Defensive Minded", "Your weapon counts as one size larger when parrying if you take no offensive action that round."),
  coreTrait("Do or Die", "Dual-wielding weapons can use Flurry if each follow-up attack alternates between the weapons."),
  coreTrait("Excellent Footwork", "On slippery or unsteady surfaces, ignore the Acrobatics skill cap on combat rolls."),
  coreTrait("Formation Fighting", "Three or more trained warriors can form up to hinder open or disordered opponents, reducing an engaged foe’s Action Points by one when the formation cannot be outflanked."),
  coreTrait("Hidden Weapons", "Use innocuous objects named in the style as effective weapons, without them breaking despite their delicate appearance."),
  coreTrait("Intimidating Scream", "Your battle cries make psychological resistance rolls you cause one difficulty grade harder."),
  coreTrait("Knockout Blow", "When attacking by surprise, a Stun Location lasts minutes instead of turns."),
  coreTrait("Mancatcher", "Opponents have one difficulty grade more trouble evading or breaking free when you entangle or immobilise them."),
  coreTrait("Mounted Combat", "Ignore the Ride skill cap on combat rolls while mounted."),
  coreTrait("Ranged Marksman", "When using a ranged weapon, shift a random Hit Location result to an adjoining body location."),
  coreTrait("Shield Splitter", "When using Damage Weapon against a shield, clubs and axes roll damage twice and keep the higher result."),
  coreTrait("Shield Wall", "Three or more trained shield users can overlap passive protection to cover one extra location; they also resist Knockback, Leaping Attacks, and Bash as if braced."),
  coreTrait("Siege Warfare", "Ignore the Athletics skill cap on combat rolls when assaulting while scaling walls or crawling through tunnels."),
  coreTrait("Skirmishing", "Make ranged attacks while running, but not while sprinting."),
  coreTrait("Swashbuckling", "Ignore the Athletics skill cap for attacks and evades while jumping or swinging into or out of combat."),
  coreTrait("Throw Weapons", "Throw a melee weapon in this style without a skill penalty; its damage roll is halved when thrown."),
  coreTrait("Trained Beast", "Use your Action Points to defend an animal companion from attacks when the style trains you to fight alongside it."),
  coreTrait("Unarmed Prowess", "Your unarmed blocks and parries count as Medium-sized, improving your defence against armed opponents."),
  coreTrait("Water Combat", "Ignore the Swim skill cap on combat rolls."),
].map(freezePreset));
const coreTraitsByName = new Map(CORE_COMBAT_TRAITS.map(trait => [trait.name, trait]));
const coreTraitByName = (name: string): CombatStyleTrait => {
  const trait = coreTraitsByName.get(name);
  if (!trait) throw new Error(`Unknown Mythras Core Combat Style Trait: ${name}`);
  return trait;
};
const cloneValue = <T>(value: T): T => Array.isArray(value)
  ? value.map(cloneValue) as T
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)])) as T
    : value;
const cloneDefinition = <T extends object>(definition: T): T => cloneValue(definition);

const weapons = (...names: string[]): CombatWeaponReference[] => names.map(name => ({ name }));
const searchable = (...terms: string[]) => terms;
const sampleStyle = (id: string, name: string, fixedWeapons: string[], traits: string[], search: string[], options: {
  aliases?: string[]; weaponChoices?: string[][]; traitChoices?: string[][];
} = {}): CombatStyleDefinition => ({
  id: `mythras-core:${id}`,
  name,
  ...(options.aliases ? { aliases: options.aliases } : {}),
  baseFormula: ["STR", "DEX"],
  weapons: weapons(...fixedWeapons),
  traits: traits.map(coreTraitByName),
  ...(options.weaponChoices ? { weaponChoices: options.weaponChoices.map(group => weapons(...group)) } : {}),
  ...(options.traitChoices ? { traitChoices: options.traitChoices.map(group => group.map(coreTraitByName)) } : {}),
  source: { ...core, reference: "Mythras Core Rules, 3rd edition: Sample Combat Styles (Characters, p. 12)" },
  status: "preset",
  searchable: searchable(...search),
});

/** Mythras Core 3rd edition, Characters p. 12. Additional combat-chapter examples are separate. */
export const CORE_COMBAT_STYLES: readonly CombatStyleDefinition[] = Object.freeze([
  sampleStyle("street-brawler", "Street Brawler", ["Fists", "Feet", "Knife", "Club"], [], ["street", "brawler", "batter aside", "unarmed prowess"], { traitChoices: [["Batter Aside", "Unarmed Prowess"]] }),
  sampleStyle("assassin", "Assassin", ["Dagger", "Shortsword"], [], ["assassin", "bow", "crossbow", "assassination", "ranged marksman"], { weaponChoices: [["Bow", "Crossbow"]], traitChoices: [["Assassination", "Ranged Marksman"]] }),
  sampleStyle("barbarian-warrior", "Barbarian Warrior", ["Greatsword", "Broadsword", "Battleaxe", "Shield"], [], ["barbarian", "warrior", "do or die", "intimidating scream"], { traitChoices: [["Do or Die", "Intimidating Scream"]] }),
  sampleStyle("cavalry-mounted-knight", "Cavalry", ["Sword", "Long Spear/Lance", "Shield"], [], ["cavalry", "mounted knight", "beast-back lancer", "mounted combat"], { aliases: ["Mounted Knight"], traitChoices: [["Beast-back Lancer", "Mounted Combat"]] }),
  sampleStyle("city-watch-hoplite", "City Watch", ["Spear", "Shield", "Shortsword"], [], ["city watch", "hoplite", "cautious fighter", "formation fighting"], { aliases: ["Hoplite"], traitChoices: [["Cautious Fighter", "Formation Fighting"]] }),
  sampleStyle("gladiator", "Gladiator", ["Shortsword", "Buckler", "Net", "Trident"], [], ["gladiator", "daredevil", "mancatcher"], { traitChoices: [["Daredevil", "Mancatcher"]] }),
  sampleStyle("marine-pirate", "Marine", ["Club", "Main Gauche"], [], ["marine", "pirate", "falchion", "rapier", "excellent footwork", "swashbuckling"], { aliases: ["Pirate"], weaponChoices: [["Falchion", "Rapier"]], traitChoices: [["Excellent Footwork", "Swashbuckling"]] }),
  sampleStyle("master-archer", "Master Archer", ["Dagger", "Shortsword", "Long Bow"], [], ["master archer", "ranged marksman", "skirmishing"], { traitChoices: [["Ranged Marksman", "Skirmishing"]] }),
  sampleStyle("meerish-slinger", "Meerish Slinger", ["Shortsword", "Shield", "Sling"], [], ["meeros", "slinger", "shortsword", "shield", "sling", "knockout blow", "shield wall"], { traitChoices: [["Knockout Blow", "Shield Wall"]] }),
  sampleStyle("noble-warrior", "Noble Warrior", ["Longsword", "Shield", "Main Gauche", "Bow"], ["Defensive Minded"], ["noble warrior", "defensive minded"]),
].map(freezePreset));

/** Resolve every source alternative explicitly before a preset becomes character-owned data. */
export function resolveCoreCombatStyle(
  definition: CombatStyleDefinition,
  weaponChoiceIndexes: readonly number[] = [],
  traitChoiceIndexes: readonly number[] = [],
): CombatStyleSelection | null {
  if ((definition.weaponChoices?.length ?? 0) !== weaponChoiceIndexes.length || (definition.traitChoices?.length ?? 0) !== traitChoiceIndexes.length) return null;
  const resolve = <T>(groups: readonly (readonly T[])[] | undefined, indexes: readonly number[]): T[] | null => {
    const selected: T[] = [];
    for (const [index, group] of (groups ?? []).entries()) {
      const choice = group[indexes[index]];
      if (choice === undefined) return null;
      selected.push(cloneValue(choice));
    }
    return selected;
  };
  const selectedWeapons = resolve(definition.weaponChoices, weaponChoiceIndexes);
  const selectedTraits = resolve(definition.traitChoices, traitChoiceIndexes);
  if (!selectedWeapons || !selectedTraits) return null;
  const { weaponChoices: _weaponChoices, traitChoices: _traitChoices, ...selection } = cloneDefinition(definition);
  return { ...selection, weapons: [...selection.weapons, ...selectedWeapons], traits: [...selection.traits, ...selectedTraits] };
}

export function normalizedStyleName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function characterStyleFromDefinition(
  definition: StyleInput,
  origin: CombatStyleOrigin,
): CharacterCombatStyle {
  return {
    ...cloneDefinition(definition),
    origin,
    origins: [origin],
    allocations: {},
  };
}

/** Reuse the existing character instance when the same style is selected in a later stage. */
export function attachCharacterStyle(
  styles: CharacterCombatStyle[],
  definition: StyleInput,
  origin: CombatStyleOrigin,
): CharacterCombatStyle[] {
  const existing = styles.find(style => style.id === definition.id);
  if (existing) {
    if (!existing.origins.includes(origin)) existing.origins.push(origin);
    return styles;
  }
  return [...styles, characterStyleFromDefinition(definition, origin)];
}

export function detachCharacterStyle(styles: CharacterCombatStyle[], name: string, origin: CombatStyleOrigin): CharacterCombatStyle[] {
  return styles.flatMap(style => {
    if (style.name !== name) return [style];
    style.origins = style.origins.filter(existing => existing !== origin);
    if (style.origins.length) return [style];
    return [];
  });
}

export function legacyCombatStyle(name: string, origin: CombatStyleOrigin = "legacy"): CharacterCombatStyle {
  const preset = CORE_COMBAT_STYLES.find(style => normalizedStyleName(style.name) === normalizedStyleName(name));
  if (preset) return characterStyleFromDefinition(preset, origin);
  // Preserve the original built-in data for saves that stored only this name.
  if (normalizedStyleName(name) === "meerish infantry") {
    return characterStyleFromDefinition({
      id: "mythras-core:meerish-infantry",
      name: "Meerish Infantry",
      baseFormula: ["STR", "DEX"],
      weapons: weapons("Spear", "Hoplite Shield", "Javelin"),
      traits: [coreTraitByName("Formation Fighting")],
      source: { ...core, reference: "Mythras Core Rules: Meerish character example" },
      status: "preset",
    }, origin);
  }
  const safeName = name.trim();
  return {
    id: `legacy:${encodeURIComponent(normalizedStyleName(safeName))}`,
    name: safeName,
    baseFormula: ["STR", "DEX"],
    weapons: [],
    traits: [],
    source: { libraryId: "custom-campaign", libraryName: "Custom / Campaign" },
    status: "custom",
    origin,
    origins: [origin],
    allocations: {},
  };
}

export function normalizeCombatStyles(value: unknown): CharacterCombatStyle[] {
  if (!Array.isArray(value)) return [];
  return value.filter((style): style is CharacterCombatStyle => !!style && typeof style === "object"
    && typeof style.id === "string" && typeof style.name === "string"
    && Array.isArray(style.weapons) && Array.isArray(style.traits)
    && Array.isArray(style.baseFormula) && typeof style.source?.libraryId === "string")
    .map(style => ({
      ...style,
      baseFormula: structuredClone(style.baseFormula),
      weapons: style.weapons.filter(weapon => !!weapon && typeof weapon.name === "string").map(weapon => ({ ...weapon })),
      traits: style.traits.filter(trait => !!trait && typeof trait.id === "string" && typeof trait.name === "string")
        .map(trait => ({ ...trait, source: { ...trait.source } })),
      source: { ...style.source },
      origin: ["culture", "career", "bonus", "custom", "legacy"].includes(style.origin) ? style.origin : "legacy",
      origins: Array.isArray(style.origins)
        ? [...new Set(style.origins.filter(origin => ["culture", "career", "bonus", "custom", "legacy"].includes(origin)))]
        : [["culture", "career", "bonus", "custom", "legacy"].includes(style.origin) ? style.origin : "legacy"],
      allocations: style.allocations && typeof style.allocations === "object" ? { ...style.allocations } : {},
    }));
}

export function customCombatStyle(name: string, weapons: string[], traits: CombatStyleTrait[], notes = ""): CombatStyleDefinition {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const id = `custom:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  return {
    id,
    name: cleanName,
    baseFormula: ["STR", "DEX"],
    weapons: [...new Set(weapons.map(weapon => weapon.trim()).filter(Boolean))].map(name => ({ name })),
    traits: structuredClone(traits),
    source: { libraryId: "custom-campaign", libraryName: "Custom / Campaign" },
    ...(notes.trim() ? { notes: notes.trim() } : {}),
    status: "custom",
    searchable: [],
  };
}
