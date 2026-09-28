/** Canonical Core Folk Magic spell identities. Rules text is intentionally not duplicated here. */
const CORE_SPELL_NAMES = [
  "Alarm", "Appraise", "Avert", "Babel", "Beastcall", "Befuddle", "Bladesharp", "Bludgeon", "Breath", "Bypass",
  "Calculate", "Calm", "Chill", "Cleanse", "Cool", "Coordination", "Curse", "Darkness", "Deflect", "Demoralise",
  "Dishevel", "Disruption", "Dry", "Dullblade", "Extinguish", "Fanaticism", "Find", "Firearrow", "Fireblade", "Frostbite",
  "Glamour", "Glue", "Heal", "Heat", "Ignite", "Incognito", "Ironhand", "Knock", "Light", "Lock", "Magnify", "Might",
  "Mimic", "Mindspeech", "Mobility", "Pathway", "Perfume", "Pet", "Phantasm", "Pierce", "Polish", "Preserve",
  "Protection", "Repair", "Repugnance", "Shock", "Shove", "Sleep", "Slow", "Speedart", "Spiritshield", "Tidy", "Tire",
  "Translate", "Tune", "Ventriloquism", "Vigour", "Voice", "Warmth", "Witchsight",
] as const;

export interface FolkMagicSpellDefinition {
  id: string;
  name: string;
  source: "core";
  /** Find is a Core spell concept with a chosen subject, not a separate spell per subject. */
  specialisation?: "subject";
}

const spellId = (name: string) => `folk-magic:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
export const CORE_FOLK_MAGIC_SPELLS: readonly FolkMagicSpellDefinition[] = CORE_SPELL_NAMES.map(name => ({
  id: spellId(name), name, source: "core", ...(name === "Find" ? { specialisation: "subject" as const } : {}),
}));
const ids = Object.fromEntries(CORE_FOLK_MAGIC_SPELLS.map(spell => [spell.name, spell.id])) as Record<typeof CORE_SPELL_NAMES[number], string>;

export type FolkMagicSuggestion =
  | { mode: "selected"; spellIds: readonly string[] }
  | { mode: "unrestricted" };

/** Core lists are advisory career suggestions; they never impose availability restrictions. */
const selected = (...names: (typeof CORE_SPELL_NAMES[number])[]): FolkMagicSuggestion => ({ mode: "selected", spellIds: names.map(name => ids[name]) });
const unrestricted: FolkMagicSuggestion = { mode: "unrestricted" };
export const CORE_FOLK_MAGIC_CAREER_SUGGESTIONS: Readonly<Record<string, FolkMagicSuggestion>> = {
  agent: selected("Alarm", "Befuddle", "Bladesharp", "Bypass", "Find", "Incognito", "Knock", "Mimic", "Ventriloquism"),
  alchemist: unrestricted,
  "beast-handler": selected("Beastcall", "Find", "Might", "Mobility", "Pathway", "Pet", "Slow", "Speedart", "Vigour"),
  courtesan: selected("Alarm", "Appraise", "Befuddle", "Calm", "Cleanse", "Find", "Glamour", "Sleep", "Tune"),
  courtier: selected("Babel", "Calculate", "Calm", "Fanaticism", "Find", "Glamour", "Mindspeech", "Translate", "Voice"),
  crafter: selected("Appraise", "Bladesharp", "Calculate", "Coordination", "Find", "Ironhand", "Pierce", "Polish", "Repair"),
  entertainer: selected("Babel", "Calm", "Find", "Glamour", "Light", "Mimic", "Tune", "Ventriloquism", "Voice"),
  farmer: selected("Beastcall", "Bladesharp", "Calculate", "Find", "Might", "Preserve", "Repair", "Vigour", "Warmth"),
  fisher: selected("Beastcall", "Deflect", "Dry", "Find", "Pierce", "Preserve", "Repair", "Vigour", "Warmth"),
  herder: selected("Alarm", "Beastcall", "Find", "Heat", "Pathway", "Pet", "Slow", "Speedart", "Warmth"),
  hunter: selected("Bladesharp", "Find", "Mobility", "Pathway", "Preserve", "Slow", "Speedart", "Vigour", "Warmth"),
  merchant: selected("Alarm", "Appraise", "Calculate", "Cleanse", "Find", "Glamour", "Lock", "Translate", "Voice"),
  miner: selected("Bludgeon", "Breath", "Find", "Ignite", "Light", "Might", "Pierce", "Repair", "Vigour"),
  mystic: selected("Avert", "Befuddle", "Demoralise", "Find", "Heal", "Mindspeech", "Spiritshield", "Vigour", "Witchsight"),
  official: selected("Alarm", "Calculate", "Find", "Glamour", "Lock", "Mindspeech", "Translate", "Ventriloquism", "Voice"),
  physician: selected("Breath", "Calm", "Cleanse", "Cool", "Find", "Heal", "Preserve", "Sleep", "Warmth"),
  priest: unrestricted,
  sailor: selected("Bladesharp", "Deflect", "Dry", "Extinguish", "Find", "Pierce", "Repair", "Vigour", "Warmth"),
  scholar: selected("Appraise", "Calculate", "Calm", "Extinguish", "Find", "Mindspeech", "Tidy", "Translate", "Voice"),
  scout: selected("Bladesharp", "Bypass", "Find", "Incognito", "Mobility", "Pathway", "Speedart", "Vigour", "Warmth"),
  shaman: unrestricted,
  sorcerer: unrestricted,
  thief: selected("Bypass", "Coordination", "Darkness", "Demoralise", "Find", "Glue", "Knock", "Mobility", "Ventriloquism"),
  warrior: selected("Bladesharp", "Bludgeon", "Coordination", "Fanaticism", "Firearrow", "Fireblade", "Find", "Protection", "Vigour"),
};

export const FOLK_MAGIC_CAREER_NOTES = {
  thermalSubstitution: "In regions predisposed to great heat rather than winter cold, a career offering Warmth may substitute Cool instead, and vice versa.",
} as const;

export interface FolkMagicSuggestionOverride {
  mode?: "selected" | "unrestricted";
  /** Replaces the Core selected set when provided. */
  replaceSpellIds?: string[];
  addSpellIds?: string[];
  removeSpellIds?: string[];
}

export function resolveFolkMagicCareerSuggestion(careerId: string, override?: FolkMagicSuggestionOverride): FolkMagicSuggestion {
  const base = CORE_FOLK_MAGIC_CAREER_SUGGESTIONS[careerId] ?? unrestricted;
  if (override?.mode === "unrestricted") return unrestricted;
  if (override?.mode === "selected" && !override.replaceSpellIds && base.mode === "unrestricted") return { mode: "selected", spellIds: [...new Set(override.addSpellIds ?? [])] };
  if (base.mode === "unrestricted" && !override?.replaceSpellIds && !override?.addSpellIds && !override?.removeSpellIds) return unrestricted;
  let spellIds = override?.replaceSpellIds ? [...override.replaceSpellIds] : base.mode === "selected" ? [...base.spellIds] : [];
  spellIds = spellIds.filter(id => !override?.removeSpellIds?.includes(id));
  spellIds.push(...(override?.addSpellIds ?? []));
  return { mode: "selected", spellIds: [...new Set(spellIds)] };
}

export interface CustomFolkMagicSpell {
  id: string;
  name: string;
  description: string;
  source: "custom";
  metadata?: Record<string, unknown>;
}
export type FolkMagicSpellReference = { spellId: string; specialisation?: string };
export interface FolkMagicProvenance { type: "culture" | "career" | "cult" | "teacher" | "study" | "campaign" | "custom"; id?: string; name?: string; notes?: string }
export interface KnownFolkMagicSpell { spell: FolkMagicSpellReference; provenance: FolkMagicProvenance[] }
export interface FolkMagicState {
  knownSpells: KnownFolkMagicSpell[];
  customSpells: CustomFolkMagicSpell[];
  /** Campaign availability data is preserved without altering the Core catalogue. */
  availability?: Record<string, unknown>;
}
export const emptyFolkMagicState = (): FolkMagicState => ({ knownSpells: [], customSpells: [] });

export interface FolkMagicEntitlementRule {
  id: string;
  rate: number;
  reason?: string;
}
export const FOLK_MAGIC_STANDARD_ENTITLEMENT: FolkMagicEntitlementRule = { id: "folk-magic-standard", rate: 20, reason: "Standard starting Folk Magic entitlement" };
export const FOLK_MAGIC_SPECIALIST_ENTITLEMENT: FolkMagicEntitlementRule = { id: "folk-magic-specialist", rate: 10, reason: "Career explicitly specialises in Folk Magic" };
export interface FolkMagicEntitlement { skillValue: number; ruleId: string; rate: number; count: number; reason?: string }
/** Exact starting entitlement is required for completion; reconciliation never removes known spells. */
export function folkMagicConfigurationStatus(
  selectedCount: number,
  entitlementCount: number,
  hasUnresolvedSpecialisation = false,
): "complete" | "action-required" {
  return selectedCount === entitlementCount && !hasUnresolvedSpecialisation ? "complete" : "action-required";
}
/** Calculates starting entitlement only; there is no lifetime maximum on known Folk Magic spells. */
export function calculateFolkMagicStartingEntitlement(
  skillValue: number | null | undefined,
  rule: FolkMagicEntitlementRule = FOLK_MAGIC_STANDARD_ENTITLEMENT,
): FolkMagicEntitlement {
  const skill = typeof skillValue === "number" && Number.isFinite(skillValue) ? Math.max(0, skillValue) : 0;
  const rate = Number.isFinite(rule.rate) && rule.rate > 0 ? rule.rate : FOLK_MAGIC_STANDARD_ENTITLEMENT.rate;
  return { skillValue: skill, ruleId: rule.id, rate, count: Math.ceil(skill / rate), ...(rule.reason ? { reason: rule.reason } : {}) };
}

export function normalizeFolkMagicState(value: unknown): FolkMagicState {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const customSpells = Array.isArray(source.customSpells) ? source.customSpells.flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const spell = item as Record<string, unknown>;
    if (typeof spell.id !== "string" || !spell.id || typeof spell.name !== "string" || typeof spell.description !== "string") return [];
    return [{ id: spell.id, name: spell.name, description: spell.description, source: "custom" as const,
      ...(spell.metadata && typeof spell.metadata === "object" && !Array.isArray(spell.metadata) ? { metadata: spell.metadata as Record<string, unknown> } : {}) }];
  }) : [];
  const validIds = new Set([...CORE_FOLK_MAGIC_SPELLS.map(spell => spell.id), ...customSpells.map(spell => spell.id)]);
  const knownSpells = Array.isArray(source.knownSpells) ? source.knownSpells.flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const known = item as Record<string, unknown>;
    const spell = known.spell && typeof known.spell === "object" && !Array.isArray(known.spell) ? known.spell as Record<string, unknown> : null;
    if (!spell || typeof spell.spellId !== "string" || !validIds.has(spell.spellId)) return [];
    const provenance = Array.isArray(known.provenance) ? known.provenance.flatMap(entry => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const origin = entry as Record<string, unknown>;
      if (!["culture", "career", "cult", "teacher", "study", "campaign", "custom"].includes(String(origin.type))) return [];
      return [{ type: origin.type as FolkMagicProvenance["type"], ...(typeof origin.id === "string" ? { id: origin.id } : {}), ...(typeof origin.name === "string" ? { name: origin.name } : {}), ...(typeof origin.notes === "string" ? { notes: origin.notes } : {}) }];
    }) : [];
    return [{ spell: { spellId: spell.spellId, ...(typeof spell.specialisation === "string" ? { specialisation: spell.specialisation } : {}) }, provenance }];
  }) : [];
  const availability = source.availability && typeof source.availability === "object" && !Array.isArray(source.availability) ? source.availability as Record<string, unknown> : undefined;
  return { knownSpells, customSpells, ...(availability ? { availability } : {}) };
}
