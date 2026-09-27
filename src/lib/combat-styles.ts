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
export type CombatStyleSelection = Omit<CombatStyleDefinition, "searchable">;
type StyleInput = CombatStyleSelection;

const core = { libraryId: "mythras-core", libraryName: "Mythras Core" };
const coreTrait = (name: string): CombatStyleTrait => ({
  id: `mythras-core:trait:${name.toLowerCase().replaceAll(" ", "-")}`,
  name,
  displayName: name,
  source: core,
});

/** A small set copied from the core book's Meerish character example. */
export const CORE_COMBAT_STYLES: CombatStyleDefinition[] = [
  {
    id: "mythras-core:meerish-infantry",
    name: "Meerish Infantry",
    baseFormula: ["STR", "DEX"],
    weapons: ["Spear", "Hoplite Shield", "Javelin"].map(name => ({ name })),
    traits: [coreTrait("Formation Fighting")],
    source: { ...core, reference: "Mythras Core Rules: Meerish character example" },
    status: "preset",
    searchable: ["Meeros", "Infantry", "spear", "shield", "javelin", "Formation Fighting"],
  },
  {
    id: "mythras-core:meerish-slinger",
    name: "Meerish Slinger",
    baseFormula: ["STR", "DEX"],
    weapons: ["Shortsword", "Peltast Shield", "Sling"].map(name => ({ name })),
    traits: [coreTrait("Skirmishing")],
    source: { ...core, reference: "Mythras Core Rules: Meerish character example" },
    status: "preset",
    searchable: ["Meeros", "slinger", "shortsword", "shield", "sling", "Skirmishing"],
  },
];

export function normalizedStyleName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function characterStyleFromDefinition(
  definition: StyleInput,
  origin: CombatStyleOrigin,
): CharacterCombatStyle {
  return {
    ...structuredClone(definition),
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
