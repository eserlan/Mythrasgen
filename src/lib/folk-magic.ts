/** Shared Core Folk Magic trait explanations for chooser details and help. */
export const FOLK_MAGIC_TRAIT_HELP: Readonly<Record<string, string>> = {
  Concentration: "Persists while the caster concentrates; physical or mental distraction ends it.",
  Instant: "The effect occurs immediately and has no duration.",
  Ranged: "Range is the caster's Folk Magic skill in metres. Casting at a known but unseen or unsensed target is one difficulty grade harder.",
  "Resist (skill)": "An unwilling target opposes the casting result with the named resistance skill. Evade resistance costs an Action Point.",
  "Resist (Special)": "The spell's description specifies how the target resists; the method can vary by spell or target.",
  Touch: "The caster must physically contact the target or its carried accoutrements.",
  Trigger: "The caster can hold a successfully cast spell for later activation during the scene; it dissipates if not triggered.",
  "Special Duration": "The spell uses the special duration stated in its effect.",
  "Normal duration": "Unless Concentration, Instant, Special Duration, or a spell-specific duration applies, Folk Magic normally lasts for the scene or action for which it is used.",
};

export interface FolkMagicSpellDetails {
  traits: readonly string[];
  effect: string;
  /** Marks concise safe text whose exact Core limits need checking before being expanded. */
  mechanicsGap?: boolean;
  specialisation?: { kind: "subject" | "animal-type"; examples: readonly string[]; customSubjects: true };
}

/** Canonical Core chooser summaries. These deliberately omit unverified exact limits. */
export const CORE_FOLK_MAGIC_DETAILS: Readonly<Record<string, FolkMagicSpellDetails>> = {
  Alarm: { traits: ["Special Duration"], effect: "Creates a psychic alarm on a small location or object. The caster knows when a living creature of SIZ >1 enters the area, or when the protected object is touched or moved, regardless of distance. It identifies neither the intruder nor what happened and does not prevent entry. Lasts until triggered or dismissed; its Magic Point remains committed until then." },
  Appraise: { traits: ["Instant", "Touch"], effect: "Assesses the relative quality of inanimate physical goods with combined ENC/SIZ up to POW. Reveals whether apparently identical items differ in quality or contain flaws or enhancements, but not what those differences are. Does not work on organic things." },
  Avert: { traits: ["Instant", "Ranged"], effect: "Dismisses another Folk Magic spell within range. May be used reactively to neutralise an offensive Folk Magic spell through the Counter Magic Reactive Action." },
  Babble: { traits: ["Resist (Willpower)", "Touch"], effect: "Mangles the target's spoken words while leaving thoughts unaffected. Can disrupt verbal communication and orders, and may interfere with magic that depends on verbal components." },
  Beastcall: { traits: ["Instant", "Ranged", "Resist (Willpower)"], effect: "Attracts one specific non-sapient animal of the chosen type within range. If it fails to resist, it is passively drawn toward the caster; significant physical barriers or restraint can cause the spell to fail. Once it reaches the caster, it behaves normally.", specialisation: { kind: "animal-type", examples: [], customSubjects: true } },
  Befuddle: { traits: ["Ranged", "Resist (Willpower)"], effect: "Confuses a corporeal target so it cannot initiate constructive activity, though it can defend itself. An attack or threatening action immediately breaks the effect." },
  Bladesharp: { traits: ["Touch"], effect: "Increases an edged or piercing melee weapon or tool's damage by one die step for the spell's duration. The edge remains honed afterward." },
  Bludgeon: { traits: ["Touch"], effect: "Increases a blunt melee weapon or tool's damage by one die step for the spell's duration." },
  Breath: { traits: ["Touch"], effect: "Lets the recipient hold their breath for up to half the caster's POW in minutes to enter harmful environments such as underwater or smoke. The recipient cannot speak during this time; when the breath is lost, they immediately begin to asphyxiate or be poisoned.", mechanicsGap: true },
  Bypass: { traits: ["Touch", "Trigger"], effect: "Can be held until the caster crosses an Alarm ward's threshold, allowing that crossing without triggering the Alarm. It does not negate the Alarm and must be cast for each crossing." },
  Calculate: { traits: ["Instant", "Ranged"], effect: "Instantly calculates an observable number, weight, or size within range. The answer is precise but reveals no value or quality; the target must be directly observable." },
  Calm: { traits: ["Ranged", "Resist (Willpower)"], effect: "Suppresses strong agitation or emotional excitement in the target, helping calm irrational or heightened emotional behaviour for the spell's duration.", mechanicsGap: true },
  Chill: { traits: ["Instant", "Touch"], effect: "Cools a small object (ENC no greater than one third of the caster's POW) to ice-water temperature. It does not freeze the object or damage its structure." },
  Cleanse: { traits: ["Instant", "Touch"], effect: "Removes dirt, grease, grime and bad smells from an object, person or area; it does not tidy or organise. Can cleanse an area up to POW square metres." },
  Cool: { traits: ["Concentration", "Touch"], effect: "Protects against natural heat and heat-related environmental Fatigue. It does not stop heat magic, but makes resistance against heat-related magic one difficulty grade easier. Affects a target up to POW ×2 SIZ." },
  Coordination: { traits: ["Touch", "Trigger"], effect: "Prepared for one task requiring coordination. The recipient may reroll one applicable skill check and keep the better result; the spell is then expended." },
  Curse: { traits: ["Special Duration"], effect: "Cast with a second harmful spell to make that spell continuous. The Magic Point spent on Curse remains committed until the caster drops it, it is dispelled, or the linked effect ends naturally." },
  Darkness: { traits: ["Concentration", "Ranged"], effect: "Creates shadow over an area of POW square metres, suppressing non-magical light, including sunlight, within it to a dim glow." },
  Deflect: { traits: ["Touch"], effect: "Protects the recipient from tiny impacts such as rain, insects or windblown grit. It does not stop normal missile weapons." },
  Demoralise: { traits: ["Ranged", "Resist (Willpower)"], effect: "Creates despondency toward a specified person, species, situation or object. Proactive skill attempts related to that source become one difficulty grade harder. A direct assault from the subject breaks the spell." },
  Dishevel: { traits: ["Instant", "Touch"], effect: "Covers the target or an area of POW square metres in grime, dust, cobwebs and similar material, making objects look old or weathered or helping disguise a well-presented appearance." },
  Disruption: { traits: ["Instant", "Ranged", "Resist (Endurance)"], effect: "Inflicts 1d3 damage to one random Hit Location of a living target or to an object's overall Hit Points. Damage ignores armour and natural protection." },
  Dry: { traits: ["Instant", "Touch"], effect: "Removes extraneous moisture from a person or object. Can affect an object up to POW ×2 SIZ." },
  Dullblade: { traits: ["Ranged"], effect: "Reduces a weapon or tool's damage by one die step and prevents it retaining a sharp edge for the duration." },
  Extinguish: { traits: ["Instant", "Ranged"], effect: "Immediately quenches modest mundane flames such as candles, lanterns, torches and small cooking fires. Does not extinguish magical fire or large, intense conflagrations." },
  Fanaticism: { traits: ["Ranged", "Resist (Willpower)"], effect: "Creates excessive devotion or enthusiasm toward a specified person, species, situation or object, granting a temporary Passion equal to the caster's Folk Magic skill. Counters Demoralise and vice versa." },
  Find: { traits: ["Concentration", "Ranged", "Resist (Special)"], effect: "Detects the presence of the chosen subject within range. Dense material can block detection; it does not read thoughts or emotions. Find Livestock can be resisted with Willpower.", specialisation: { kind: "subject", examples: ["Arrows", "Flaw", "Livestock", "Loot", "Object", "Sickness"], customSubjects: true } },
  Firearrow: { traits: ["Touch"], effect: "Thrown or fired missiles released by the recipient ignite and inflict +1d3 damage. A missile striking flammable material has a chance equal to Folk Magic to ignite it; flames are extinguished if it impales flesh. Wooden ammunition is consumed by the effect." },
  Fireblade: { traits: ["Touch"], effect: "Ignites affected hand tools or melee weapons. Used as a weapon, it inflicts +1d3 damage and can ignite flammable material after sustained contact. Wooden-hafted weapons are consumed by the effect." },
  Frostbite: { traits: ["Ranged", "Resist (Endurance)"], effect: "Affects an extremity with numbness and pain. If not resisted, skill tests using that location become one difficulty grade harder for the duration. It causes no direct damage." },
  Glamour: { traits: ["Concentration", "Ranged", "Resist (Willpower)"], effect: "Makes the target alluring. The caster chooses the nature of the glamour when casting, such as enhanced beauty, voice or scent." },
  Glue: { traits: ["Touch"], effect: "Joins two solid, inanimate objects for the duration. If someone tries to wrench them apart, the spell opposes with Brawn equal to five times the caster's POW; a superior result parts them unharmed." },
  Heal: { traits: ["Instant", "Touch"], effect: "Lifts symptoms of a minor complaint. On a location with a Minor Wound, restores all lost Hit Points; on Serious or Major Wounds, it restores none but stabilises the location, stops bleeding, and prevents imminent death from inattention." },
  Heat: { traits: ["Instant", "Touch"], effect: "Heats a small non-living object (ENC no greater than one third of the caster's POW) up to boiling-water temperature. It can heat clothing or armour, but not living tissue." },
  Ignite: { traits: ["Instant", "Ranged"], effect: "Ignites suitable combustible mundane material within the spell's scale; it is not an unrestricted high-damage fire attack.", mechanicsGap: true },
  Incognito: { traits: ["Resist (Endurance)", "Touch", "Trigger"], effect: "Held until triggered, it makes the recipient's face bland and unmemorable so people actively searching for them overlook them. It does not alter voice, mannerisms, or physical size and presence." },
  Ironhand: { traits: ["Touch"], effect: "Protects the recipient's hands against damaging contact during appropriate manual work. It does not grant general immunity and does not protect worn items such as gloves or rings." },
  Knock: { traits: ["Instant", "Touch"], effect: "Magically unfastens one mundane mechanical lock or bar. Does not defeat magical locks. Multiple fastenings require separate castings." },
  Light: { traits: ["Concentration", "Ranged"], effect: "Makes an inanimate object illuminate an area roughly like a lantern. Can directly counter a Darkness spell; both spells are consumed in that interaction." },
  Lock: { traits: ["Special Duration", "Touch"], effect: "Magically secures one existing mundane mechanical lock or bar. Only the caster can normally open the mechanism while enchanted; it can still be bypassed by physically breaking the containing object. The Magic Point remains committed until opened, dismissed or the effect ends." },
  Magnify: { traits: ["Concentration"], effect: "Makes what the caster views appear twice as close, useful for detailed work or observation." },
  Might: { traits: ["Touch"], effect: "Adds the caster's POW to the recipient's STR for lifting, breaking and Brawn contests only. It does not increase combat Damage Modifier." },
  Mimic: { traits: ["Touch", "Trigger"], effect: "Allows the recipient to perfectly imitate the voice and mannerisms of someone the caster has personally seen and heard. Does not alter physical appearance." },
  Mindspeech: { traits: ["Concentration", "Ranged", "Resist (Willpower)"], effect: "Creates telepathic verbal communication between caster and target. They must share a language; otherwise communication is unintelligible." },
  Mobility: { traits: ["Touch"], effect: "Increases the recipient's Movement Rate by 1d3 metres for the duration." },
  Pathway: { traits: ["Touch"], effect: "Allows easier movement through heavy or overgrown vegetation; Movement is not reduced by woods, jungle, swamp and similar terrain for the duration." },
  Perfume: { traits: ["Concentration", "Ranged", "Resist (Willpower)"], effect: "Suppresses a noxious odour or gives an odourless substance a pleasant fragrance. It changes the smell, not the underlying substance or condition." },
  Pet: { traits: ["Concentration", "Resist (Willpower)", "Touch"], effect: "Lets the caster mentally control a small creature for complex tasks. Neither its SIZ nor INT may exceed half the caster's CHA. A loyal pet of the caster need not resist." },
  Phantasm: { traits: ["Concentration", "Ranged"], effect: "Shapes insubstantial or near-weightless material such as mist or leaves into a ghostly form or image. Primarily creates an evocative visual effect rather than a substantial object." },
  Pierce: { traits: ["Touch"], effect: "Enhances a pointed tool or weapon so it ignores the first 2 Armour Points of the person, creature or object struck." },
  Polish: { traits: ["Instant", "Touch"], effect: "Buffs an object up to the caster's POW in ENC or SIZ to a high glossy sheen; it does not improve underlying quality." },
  Preserve: { traits: ["Instant", "Touch"], effect: "Sterilises up to the caster's POW in SIZ or ENC of organic matter, preventing decay for 1d3 months. It can halt existing decay but cannot reverse it; smoking, pickling, or salting afterward preserves it indefinitely." },
  Protection: { traits: ["Touch"], effect: "The first time physical damage penetrates the recipient's clothing or armour, reduces that damage by 1d3, then the spell ends. Does not protect against non-physical hazards such as fire or choking." },
  Repair: { traits: ["Instant", "Touch"], effect: "Repairs 1d3 Hit Points of physical damage to an inanimate object per successful casting." },
  Repugnance: { traits: ["Concentration", "Ranged", "Resist (Willpower)"], effect: "Makes the target distasteful through a chosen appearance, voice or smell effect, encouraging others to avoid their presence." },
  Shock: { traits: ["Instant", "Ranged", "Resist (Evade)"], effect: "Electrical discharge affecting an extremity. If not resisted, that location is stunned for 1d3 Turns; armour does not protect." },
  Shove: { traits: ["Instant", "Ranged", "Resist (Special)"], effect: "Gives an object a crude telekinetic push. Cannot inflict damage and remains subject to gravity. Affects ENC/SIZ up to POW. Living targets may resist with Endurance or Evade." },
  Sleep: { traits: ["Resist (Endurance)", "Touch"], effect: "If not resisted, sends a target of SIZ no greater than caster POW to sleep after 1d3 Rounds, for half the caster's POW hours. Automatically fails if attempted in combat." },
  Slow: { traits: ["Ranged", "Resist (Endurance)"], effect: "Reduces Movement Rate by 1d3+3 metres if not resisted." },
  Speedart: { traits: ["Instant", "Touch", "Trigger"], effect: "Increases a thrown or fired missile weapon's effective range to 1.5× normal for the triggered shot or use." },
  Spiritshield: { traits: ["Concentration", "Resist (Willpower)", "Touch"], effect: "Protects the recipient against spirits attempting to attack or possess them. The spirit must win an opposed Willpower vs caster Folk Magic test to overcome the shield." },
  Tidy: { traits: ["Instant", "Ranged"], effect: "Restores up to POW items within range to a neat, orderly arrangement. Items larger than 3 ENC are repositioned more orderly but still need manual tidying." },
  Tire: { traits: ["Ranged", "Resist (Endurance)"], effect: "Inflicts one level of Fatigue unless resisted." },
  Translate: { traits: ["Concentration", "Resist (Willpower)", "Touch"], effect: "Creates a psychic translation link for simple communication across constructed languages. Complex concepts may translate imperfectly. With animal-level awareness, communication is limited to emotional state." },
  Tune: { traits: ["Instant", "Touch"], effect: "Puts a touched musical instrument into perfect pitch regardless of environmental condition, preventing tuning problems from affecting the following performance." },
  Ventriloquism: { traits: ["Concentration", "Ranged", "Resist (Willpower)"], effect: "Projects the caster's voice anywhere within range without requiring physical speech. If cast on a living creature, the caster can speak through its vocal cords." },
  Vigour: { traits: ["Touch"], effect: "For the duration, ignores Fatigue effects gained from strenuous physical labour; those effects return when the spell ends. Negates Tire." },
  Voice: { traits: ["Concentration", "Ranged", "Resist (Willpower)"], effect: "Makes the recipient's verbal commands compelling enough that listeners are forced to pay attention, and carries their voice through extreme background noise up to 10 × recipient CHA metres." },
  Warmth: { traits: ["Concentration", "Touch"], effect: "Protects against natural freezing, exposure and associated environmental Fatigue. Against cold-related magic, resistance is one difficulty grade easier. Can affect an object up to caster POW ×2 SIZ." },
  Witchsight: { traits: ["Ranged", "Resist (Willpower)"], effect: "Reveals active magic, enchanted objects and invisible entities within range and line of sight as shadowy representations. Can penetrate illusions or identify true forms of shapeshifters; a being trying to remain hidden or disguised opposes with Willpower vs the casting roll." },
};

/** Canonical Core Folk Magic spell identities. */
const CORE_SPELL_NAMES = [
  "Alarm", "Appraise", "Avert", "Babble", "Beastcall", "Befuddle", "Bladesharp", "Bludgeon", "Breath", "Bypass",
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
  details: FolkMagicSpellDetails;
  /** A spell family requires a chosen subject; each subject is learned separately. */
  specialisation?: "subject";
}

const spellId = (name: string) => `folk-magic:${(name === "Babble" ? "babel" : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))}`;
export const CORE_FOLK_MAGIC_SPELLS: readonly FolkMagicSpellDefinition[] = CORE_SPELL_NAMES.map(name => ({
  id: spellId(name), name, source: "core", details: CORE_FOLK_MAGIC_DETAILS[name], ...(name === "Find" ? { specialisation: "subject" as const } : {}),
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
  courtier: selected("Babble", "Calculate", "Calm", "Fanaticism", "Find", "Glamour", "Mindspeech", "Translate", "Voice"),
  crafter: selected("Appraise", "Bladesharp", "Calculate", "Coordination", "Find", "Ironhand", "Pierce", "Polish", "Repair"),
  entertainer: selected("Babble", "Calm", "Find", "Glamour", "Light", "Mimic", "Tune", "Ventriloquism", "Voice"),
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
