/** Core Sorcery rules data and per-character Sorcery configuration. */
export type SorcerySource = "core" | "campaign" | "custom";
export type ShapingComponent = "Combine" | "Duration" | "Magnitude" | "Range" | "Targets" | "Ablation" | "Focus" | "Fortune" | "Precision" | "Swiftness";

export interface SorcerySpell {
  id: string;
  name: string;
  source: SorcerySource;
  /** Canonical family and subject are kept separately for specialised spells. */
  baseFamily?: string;
  specialisation?: { kind: "subject" | "form"; value: string };
  /** Present on an unconfigured Core family record that needs a subject before use. */
  specialisationPrompt?: string;
  /** Campaign-facing availability note; it never grants or removes School access itself. */
  availability?: "normal" | "restricted" | "rare-arcane" | "not-normally-starting";
  /** Configured Core instance records the base family it was created from. */
  configuredFrom?: string;
  description?: string;
  notes?: string;
}

export interface SorcerySpellDetails {
  traits: string[];
  effect: string;
}

export interface SorceryShapingRules {
  addComponents?: ShapingComponent[];
  removeComponents?: ShapingComponent[];
  metadata?: Record<string, unknown>;
}

export interface SorcerySchool {
  id: string;
  name: string;
  source: SorcerySource;
  spellIds: string[];
  organisationId?: string;
  sourceDescription?: string;
  notes?: string;
  shapingRules?: SorceryShapingRules;
}

export interface SorceryOrder {
  id: string;
  name: string;
  source: SorcerySource;
  spellIds: string[];
  notes?: string;
}

export interface SorceryKnownSpell {
  spellId: string;
  sourceDescription?: string;
  acquiredFrom?: string;
  starting?: boolean;
  notes?: string;
}

/** A character's way of accessing a School, independent of the School and any Order. */
export interface SorcerySchoolAccess {
  schoolId: string;
  sourceType?: string;
  sourceDescription?: string;
  organisationId?: string;
}

export interface SorceryState {
  /** Acquired Schools can grow over the character's lifetime. */
  schoolIds: string[];
  startingSchoolId?: string;
  schoolAccess: SorcerySchoolAccess[];
  /** Undefined means use the union of learned School pools; an array is an explicit restriction. */
  availableSpellIds?: string[];
  knownSpells: SorceryKnownSpell[];
  customSchools: SorcerySchool[];
  customSpells: SorcerySpell[];
  /** Per-School configured Core spell instances; kept separate from canonical Core records. */
  configuredSpells: SorcerySpell[];
  /** Campaign/order/rank rules may narrow availability independently of School contents. */
  organisationAvailability?: Record<string, string[]>;
  /** Per-character effective Shaping overrides; catalogue rules are never mutated. */
  shapingRules?: SorceryShapingRules;
}

export interface SorceryStartingEntitlement {
  active: boolean;
  invocationValue: number;
  count: number;
  rule: "one spell per 20% or part thereof";
}

export interface SorceryDerivedStatistics {
  intensity: number;
  shapingPoints: number;
  memorisedSpellCapacity: number;
}

export const CORE_SHAPING_COMPONENTS: readonly ShapingComponent[] = ["Combine", "Duration", "Magnitude", "Range", "Targets"];
export const OPTIONAL_SHAPING_COMPONENTS: readonly ShapingComponent[] = ["Ablation", "Focus", "Fortune", "Precision", "Swiftness"];

const spellKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const spell = (family: string, specialisation?: string, kind: "subject" | "form" = "subject", options: { requires?: string; availability?: SorcerySpell["availability"] } = {}): SorcerySpell => ({
  id: `core:sorcery:${spellKey(family)}${specialisation ? `:${spellKey(specialisation)}` : ""}`,
  name: specialisation ? `${family} (${specialisation})` : family,
  source: "core",
  baseFamily: family,
  ...(specialisation ? { specialisation: { kind, value: specialisation } } : {}),
  ...(options.requires ? { specialisationPrompt: options.requires } : {}),
  ...(options.availability ? { availability: options.availability } : {}),
});

type CoreSpellRow = [family: string, specialisation?: string, kind?: "subject" | "form"];
const coreSpellRows: CoreSpellRow[] = [
  ["Abjure"], ["Abjure", "Decay"], ["Abjure", "Process"], ["Abjure", "Substance"],
  ["Animate", "Darkness"], ["Attract Missile"], ["Banish"], ["Bypass Armour"], ["Castback"],
  ["Damage Enhancement"], ["Damage Resistance"], ["Diminish"], ["Diminish", "Characteristic"],
  ["Dominate"], ["Dominate", "Creatures"], ["Dominate", "Reptiles"], ["Dominate", "Undead"],
  ["Draw", "Creatures"], ["Enlarge"], ["Enslave", "Creatures"], ["Enhance"], ["Enhance", "Characteristic"],
  ["Evoke", "Entity"], ["Fly"], ["Haste"], ["Holdfast"], ["Imprison"], ["Intuition"],
  ["Mystic", "Sense"], ["Neutralise Magic"], ["Palsy"], ["Perceive", "Sense"], ["Phantom", "Sense"],
  ["Project", "Sense"], ["Protective Ward"], ["Regenerate"], ["Repulse", "Vermin"], ["Revivify"],
  ["Sculpt", "Darkness"], ["Sculpt", "Substance"], ["Sense", "Knowledge"], ["Shapechange"],
  ["Shapechange", "Creature", "form"], ["Shrink"], ["Smother"], ["Spirit Resistance"], ["Spell Resistance"],
  ["Switch Body"], ["Tap", "Characteristic"], ["Teleport"], ["Teleport", "via Shadows"], ["Telepathy"],
  ["Transmogrify"], ["Transmogrify", "to Substance", "form"], ["Transfer Wound"], ["Trap Soul"],
  ["Undeath"], ["Wrack"], ["Wrack", "Darkness"],
];

const configuredCoreSpells: readonly SorcerySpell[] = coreSpellRows.map(([family, subject, kind]) => spell(family, subject, kind));
const parameterized = (family: string, prompt: string): SorcerySpell => spell(family, undefined, "subject", { requires: prompt });
/** One stable canonical record for each base spell named in the Core catalogue index. */
export const CORE_SORCERY_BASE_SPELLS: readonly SorcerySpell[] = [
  parameterized("Abjure", "Substance or process"), spell("Animate"), parameterized("Attract", "Object or creature"),
  spell("Banish"), spell("Bypass Armour"), spell("Castback"), spell("Damage Enhancement"), spell("Damage Resistance"),
  parameterized("Diminish", "Characteristic"), parameterized("Dominate", "Creature family"), parameterized("Draw", "Creature family"),
  spell("Enchant"), parameterized("Enhance", "Characteristic"), spell("Enlarge"), parameterized("Enslave", "Creature type"),
  parameterized("Evoke", "Entity"), spell("Fly"), spell("Hide Life"), parameterized("Hinder", "Subject"), spell("Holdfast"),
  spell("Imprison"), spell("Intuition"), spell("Mark"), parameterized("Mystic", "Sense"), spell("Neutralise Magic"),
  spell("Palsy"), parameterized("Perceive", "Sense"), parameterized("Phantom", "Sense"), spell("Portal"),
  parameterized("Project", "Sense"), spell("Protective Ward"), spell("Regenerate"), parameterized("Repulse", "Creature family"),
  spell("Revivify"), parameterized("Sculpt", "Substance"), parameterized("Sense", "Subject"), parameterized("Shapechange", "Creature or form"),
  spell("Shrink"), spell("Smother"), spell("Spell Resistance"), spell("Spirit Resistance"), spell("Store Manna"),
  parameterized("Summon", "Entity"), spell("Switch Body"), parameterized("Tap", "Characteristic"), spell("Telepathy"), spell("Teleport"),
  spell("Transfer Wound"), parameterized("Transmogrify", "Substance or form"), spell("Trap Soul"), spell("Undeath"),
  parameterized("Wrack", "Manifestation or type"),
];
const bySpellId = (spells: readonly SorcerySpell[]) => [...spells.reduce((map, item) => map.set(item.id, item), new Map<string, SorcerySpell>()).values()];
const canonicalBaseIds = new Set(CORE_SORCERY_BASE_SPELLS.map(item => item.id));
export const CORE_SORCERY_SPELLS: readonly SorcerySpell[] = [
  ...CORE_SORCERY_BASE_SPELLS,
  ...bySpellId(configuredCoreSpells.filter(item => !canonicalBaseIds.has(item.id))),
];
const coreSpellId = (family: string, subject?: string) => `core:sorcery:${spellKey(family)}${subject ? `:${spellKey(subject)}` : ""}`;

/** Concise Core spell effects shared by every Sorcery picker and reference view. */
const CORE_SORCERY_EFFECTS: Record<string, SorcerySpellDetails> = {
  Abjure: { traits: [], effect: "Suppresses or removes the target's need for, or susceptibility to, {subject} while the spell lasts." },
  Animate: { traits: ["Concentration"], effect: "Animates non-living {subject} so it can move under your control. Complex movement or manipulation needs concentration. A living bearer can resist with Endurance; the spell cannot directly harm them." },
  Attract: { traits: ["Resist: Willpower"], effect: "Draws the specified object or creature toward the spell's target or affected location, subject to the Core spell's target and resistance limits." },
  "Attract Missile": { traits: ["Resist: Willpower"], effect: "Draws qualifying missiles that pass close to the recipient. Attacks with maximum damage no greater than Intensity can be redirected to them." },
  Banish: { traits: ["Resist: Willpower"], effect: "Dismisses a spiritual or demonic entity to its originating plane if its POW is no more than 3 × Intensity. It does not simply free a spirit safely bound in a fetish or possessing a host." },
  "Bypass Armour": { traits: [], effect: "Affected weapons, natural weapons and traps ignore Armour Points equal to Intensity, including magical protection such as Damage Resistance or Shield." },
  Castback: { traits: [], effect: "Reflects a resisted spell with the Resist trait back at its caster if its Magnitude is no greater than Castback's. The protected target must first successfully resist it. Maximum recipient SIZ is 3 × Intensity." },
  "Damage Enhancement": { traits: [], effect: "On a successful attack, raises rolled physical damage below Intensity to Intensity, without exceeding the weapon's normal maximum damage." },
  "Damage Resistance": { traits: [], effect: "Gives the whole target Armour Points equal to Intensity against physical damage. It does not stack with other physical protection; use the highest value. Maximum target SIZ is 3 × Intensity." },
  Enchant: { traits: ["Ritual"], effect: "Creates a lasting magical enchantment in a suitable object using the Core Enchanting procedure; this is a ritual working rather than a routine combat spell." },
  Diminish: { traits: ["Resist: Willpower / Endurance"], effect: "Reduces {subject} by 2 points per Intensity, to a minimum of 1. Physical Characteristics resist with Endurance; mental Characteristics resist with Willpower." },
  Dominate: { traits: ["Concentration", "Resist: Willpower"], effect: "Gives psychic control over a creature of the specified type: {subject}." },
  Draw: { traits: ["Resist: Willpower"], effect: "Attracts creatures of the specified type ({subject}) toward the target or affected area; it is the counterpart to Repulse." },
  Enlarge: { traits: [], effect: "Expands a non-living object with initial SIZ no greater than 3 × Intensity, multiplying its dimensions and weight by Intensity. A living bearer can resist with Endurance; it cannot simply crush them." },
  Enslave: { traits: ["Resist: Willpower"], effect: "Instils a powerful artificial Passion, rated at the caster's Invocation, in creatures of type {subject}; it does not make automatons. Intensity/Targets and INT/INS limit the victims." },
  Enhance: { traits: ["Resist: Willpower / Endurance when used malevolently"], effect: "Increases {subject} by 2 points per Intensity, up to twice its original value. When resistance applies, physical Characteristics use Endurance and mental ones Willpower." },
  Evoke: { traits: [], effect: "Calls or summons the specified supernatural entity type: {subject}. The Core summoning rules govern the entity and its interaction with the caster." },
  Fly: { traits: [], effect: "Lets the target fly for the spell's duration. Sorcery's movement rules determine how far and how quickly they can travel." },
  Haste: { traits: [], effect: "Accelerates the recipient, improving movement and action speed according to the spell's Intensity." },
  Holdfast: { traits: [], effect: "Magically fastens affected objects together, such as sealing a door, fixing a weapon in its scabbard, or attaching a person or object to something." },
  "Hide Life": { traits: ["Ritual"], effect: "Conceals and safeguards the sorcerer's life force through a prepared external focus, making the focus and its protections central to defeating the sorcerer permanently." },
  Hinder: { traits: ["Resist: Endurance"], effect: "Impedes the target's movement and physical actions according to the spell's Intensity and resistance rules." },
  Imprison: { traits: ["Resist: Willpower"], effect: "Creates an invisible barrier that prevents a corporeal creature leaving an area. Target POW and SIZ must each be no more than 3 × Intensity; the target may resist. Some campaigns require a prepared glyph, powder or geometric design." },
  Intuition: { traits: ["Concentration", "Resist: Willpower"], effect: "Reveals the target's emotions and motives as a successful Insight, but not memories or guarded thoughts. Target INT is limited to 2 × Intensity; an aware target may resist again to conceal feelings." },
  Mark: { traits: [], effect: "Places a magical mark on a target, allowing the caster to recognise or locate that target and to use the mark as a focus for other magic where permitted." },
  Mystic: { traits: ["Concentration"], effect: "Perceives magic through the specified sense ({subject}), including into other planes where appropriate. It can roughly judge Magic Points and identify sufficiently weak or equal effects by type, function and signature." },
  "Neutralise Magic": { traits: [], effect: "Suppresses one spell or miracle whose Magnitude is no greater than this spell's for the Neutralise duration. Long-running magic resumes afterwards. It can also counter a spell defensively. Maximum target SIZ is 3 × Intensity." },
  Palsy: { traits: ["Resist: Endurance"], effect: "Disables one random Hit Location whose normal Hit Points do not exceed Intensity. A head can incapacitate, chest paralyses below the neck, abdomen below the waist, and a limb stops functioning." },
  Perceive: { traits: ["Resist: Endurance if unwilling"], effect: "Grants the recipient the unusual sensory perception {subject} (for example, Echolocation or X-Ray Vision). Maximum recipient SIZ is 3 × Intensity." },
  Phantom: { traits: [], effect: "Creates a sensory phantom for the specified sense ({subject}), following the Core Sorcery targeting and resistance rules." },
  Portal: { traits: ["Ritual"], effect: "Creates a passage between two locations under the Core spell's preparation, destination and duration limits." },
  Project: { traits: [], effect: "Projects the specified sense ({subject}) away from the caster or recipient so perception can occur from another point under the Core spell's limits." },
  "Protective Ward": { traits: ["Combined"], effect: "Creates an extended ward for combined Sorcery protections, allowing effects such as Damage, Spell or Spirit Resistance to protect an area. Inscribe it on a solid surface before casting; it can cover up to 1 metre per Intensity in each dimension." },
  Regenerate: { traits: ["Concentration"], effect: "Accelerates natural healing, stops bleeding and stabilises a dying target, but cannot repair Major Wounds. Restores Intensity Hit Points per hour among locations chosen by the caster while concentration continues." },
  Repulse: { traits: ["Resist: Willpower"], effect: "Drives away creatures of type {subject} through an emotional response such as disgust, nervousness or fear; it is the opposite of Draw." },
  Revivify: { traits: ["Concentration"], effect: "Animates a sufficiently intact corpse as a mindless undead automaton. Maximum corpse SIZ is 3 × Intensity; it gains STR and CON equal to Intensity and depends on its creator for direction." },
  Sculpt: { traits: [], effect: "Shapes and manipulates the specified substance ({subject}) according to the Core Sculpt spell." },
  Sense: { traits: [], effect: "Detects the thing, state or knowledge defined by this spell's specialisation: {subject}, following the Core Sorcery Sense rules." },
  Shapechange: { traits: [], effect: "Transforms the target into the specified creature or form ({subject}), within the Core spell's limits." },
  Shrink: { traits: [], effect: "Reduces the size of an affected non-living object under the Core spell's SIZ and resistance limits. It does not reduce a Characteristic; Diminish (SIZ) is separate." },
  Smother: { traits: ["Resist: Endurance"], effect: "Suppresses the target's ability to breathe or obtain air under the Core Sorcery resistance and Intensity limits." },
  "Spell Resistance": { traits: [], effect: "Protects against spells according to its Magnitude and Intensity rules; this is magical protection against spells, not spirits or physical damage." },
  "Spirit Resistance": { traits: [], effect: "Protects against spirits and spiritual effects under the Core Sorcery rules; it is distinct from Spell Resistance and physical protection." },
  "Store Manna": { traits: ["Ritual"], effect: "Stores Magic Points in a prepared receptacle for later use, subject to the Core storage and capacity limits." },
  Summon: { traits: ["Ritual"], effect: "Calls a specified entity to the caster using the Core summoning procedure; it is distinct from Evoke's direct manifestation effect." },
  "Switch Body": { traits: ["Resist: Willpower"], effect: "Switches body occupancy by transferring consciousness between valid targets, subject to the Core spell's target and resistance limits." },
  Tap: { traits: ["Resist: Endurance"], effect: "Drains {subject} from a target and converts or uses the stolen energy as the Core spell allows." },
  Telepathy: { traits: [], effect: "Enables mental communication under the Core Sorcery target and range rules." },
  Teleport: { traits: [], effect: "Moves the target instantaneously using the configured form ({subject}) under the Core Sorcery Teleport rules." },
  Transmogrify: { traits: [], effect: "Transforms the target's substance into {subject} according to the Core spell's limits." },
  "Transfer Wound": { traits: [], effect: "Transfers a wound from one valid target to another under the Core spell's direction, target and injury limits; it is not simply a healing effect." },
  "Trap Soul": { traits: ["Resist: Willpower"], effect: "Traps a soul or spirit in a suitable container under the Core spell's target, container and resistance restrictions; this is distinct from general spirit binding." },
  Undeath: { traits: [], effect: "Creates or maintains an undead state under the Core Sorcery rules; it is distinct from Revivify, which animates a mindless corpse." },
  Wrack: { traits: ["Resist: Endurance"], effect: "Inflicts direct magical harm using {subject} as its source, under the Core Wrack damage, resistance and target limits." },
};

/** Resolve a Core spell's canonical effect with its configured specialisation. */
export function sorcerySpellDetails(spellRecord: SorcerySpell): SorcerySpellDetails | undefined {
  if (spellRecord.source !== "core") {
    return spellRecord.description ? { traits: [], effect: spellRecord.description } : undefined;
  }
  const family = spellRecord.baseFamily ?? spellRecord.name;
  const detail = CORE_SORCERY_EFFECTS[family];
  if (!detail) return undefined;
  const subject = spellRecord.specialisation?.value ?? (family === "Attract Missile" ? "Missile" : family === "Teleport" ? "standard form" : "the specified subject");
  return { traits: [...detail.traits], effect: detail.effect.replaceAll("{subject}", subject) };
}

const school = (id: string, name: string, spellIds: string[]): SorcerySchool => ({ id: `core:${id}`, name, source: "core", spellIds });

export const CORE_SORCERY_SCHOOLS: readonly SorcerySchool[] = [
  school("school:stygian-path", "Stygian Path", [
    coreSpellId("Animate", "Darkness"), coreSpellId("Dominate", "Reptiles"), coreSpellId("Palsy"),
    coreSpellId("Sculpt", "Darkness"), coreSpellId("Smother"), coreSpellId("Teleport", "via Shadows"), coreSpellId("Wrack", "Darkness"),
  ]),
  school("school:masters-of-metamorphosis", "Masters of Metamorphosis", [
    coreSpellId("Abjure"), coreSpellId("Diminish"), coreSpellId("Enhance"), coreSpellId("Haste"),
    coreSpellId("Regenerate"), coreSpellId("Shapechange"), coreSpellId("Transmogrify"),
  ]),
];

const order = (id: string, name: string, entries: [string, string?][]): SorceryOrder => ({
  id: `core:order:${id}`, name, source: "core", spellIds: entries.map(([family, subject]) => coreSpellId(family, subject)),
});
export const CORE_SORCERY_ORDERS: readonly SorceryOrder[] = [
  order("military", "Military Order", [["Attract Missile"], ["Bypass Armour"], ["Damage Enhancement"], ["Damage Resistance"], ["Haste"], ["Protective Ward"], ["Transfer Wound"]]),
  order("necromantic", "Necromantic Order", [["Abjure", "Decay"], ["Dominate", "Undead"], ["Revivify"], ["Spirit Resistance"], ["Transfer Wound"], ["Trap Soul"], ["Undeath"]]),
  order("alchemical", "Alchemical Order", [["Diminish", "Characteristic"], ["Enlarge"], ["Holdfast"], ["Neutralise Magic"], ["Sculpt", "Substance"], ["Shrink"], ["Transmogrify", "to Substance"]]),
  order("scholastic", "Scholastic Order", [["Abjure", "Process"], ["Intuition"], ["Mystic", "Sense"], ["Neutralise Magic"], ["Perceive", "Sense"], ["Project", "Sense"], ["Sense", "Knowledge"]]),
  order("hermetic", "Hermetic Order", [["Abjure", "Substance"], ["Banish"], ["Damage Resistance"], ["Mystic", "Sense"], ["Protective Ward"], ["Spirit Resistance"], ["Spell Resistance"]]),
  order("dark-forces", "Dark Forces Order", [["Castback"], ["Enslave", "Creatures"], ["Evoke", "Entity"], ["Imprison"], ["Smother"], ["Tap", "Characteristic"], ["Wrack"]]),
  order("communication", "Communication Order", [["Fly"], ["Haste"], ["Intuition"], ["Phantom", "Sense"], ["Project", "Sense"], ["Telepathy"], ["Teleport"]]),
  order("medical", "Medical Order", [["Abjure"], ["Damage Resistance"], ["Neutralise Magic"], ["Palsy"], ["Regenerate"], ["Repulse", "Vermin"], ["Transfer Wound"]]),
  order("transmutation", "Transmutation Order", [["Dominate", "Creatures"], ["Draw", "Creatures"], ["Enhance", "Characteristic"], ["Haste"], ["Perceive", "Sense"], ["Shapechange", "Creature"], ["Switch Body"]]),
];

export const emptySorceryState = (): SorceryState => ({ schoolIds: [], schoolAccess: [], knownSpells: [], customSchools: [], customSpells: [], configuredSpells: [] });

const record = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const sourceTypes = new Set<SorcerySource>(["core", "campaign", "custom"]);
const validComponents = new Set<ShapingComponent>([...CORE_SHAPING_COMPONENTS, ...OPTIONAL_SHAPING_COMPONENTS]);
function normalizeShapingRules(value: unknown): SorceryShapingRules | undefined {
  const item = record(value);
  if (!item) return undefined;
  const metadata = record(item.metadata);
  const addComponents = Array.isArray(item.addComponents) ? item.addComponents.filter((component): component is ShapingComponent => validComponents.has(component as ShapingComponent)) : [];
  const removeComponents = Array.isArray(item.removeComponents) ? item.removeComponents.filter((component): component is ShapingComponent => validComponents.has(component as ShapingComponent)) : [];
  return { ...(addComponents.length ? { addComponents: [...new Set(addComponents)] } : {}), ...(removeComponents.length ? { removeComponents: [...new Set(removeComponents)] } : {}), ...(metadata ? { metadata } : {}) };
}
function normalizeSpell(value: unknown): SorcerySpell | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sourceTypes.has(item.source as SorcerySource)) return null;
  const specialisation = record(item.specialisation);
  const kind = specialisation?.kind === "subject" || specialisation?.kind === "form" ? specialisation.kind : undefined;
  return { id: item.id, name: item.name, source: item.source as SorcerySource,
    ...(typeof item.baseFamily === "string" ? { baseFamily: item.baseFamily } : {}),
    ...(kind && typeof specialisation?.value === "string" ? { specialisation: { kind, value: specialisation.value } } : {}),
    ...(typeof item.specialisationPrompt === "string" ? { specialisationPrompt: item.specialisationPrompt } : {}),
    ...(item.availability === "normal" || item.availability === "restricted" || item.availability === "rare-arcane" || item.availability === "not-normally-starting" ? { availability: item.availability } : {}),
    ...(typeof item.configuredFrom === "string" ? { configuredFrom: item.configuredFrom } : {}),
    ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}) };
}
function normalizeSchool(value: unknown): SorcerySchool | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sourceTypes.has(item.source as SorcerySource)) return null;
  return { id: item.id, name: item.name, source: item.source as SorcerySource,
    spellIds: Array.isArray(item.spellIds) ? item.spellIds.filter((id): id is string => typeof id === "string") : [],
    ...(typeof item.organisationId === "string" ? { organisationId: item.organisationId } : {}),
    ...(typeof item.sourceDescription === "string" ? { sourceDescription: item.sourceDescription } : {}),
    ...(typeof item.notes === "string" ? { notes: item.notes } : {}), ...(normalizeShapingRules(item.shapingRules) ? { shapingRules: normalizeShapingRules(item.shapingRules) } : {}) };
}
export function normalizeSorceryState(value: unknown): SorceryState {
  const item = record(value);
  if (!item) return emptySorceryState();
  const customSpells = Array.isArray(item.customSpells) ? item.customSpells.map(normalizeSpell).filter((spell): spell is SorcerySpell => !!spell && spell.source !== "core") : [];
  const configuredSpells = Array.isArray(item.configuredSpells) ? item.configuredSpells.map(normalizeSpell).filter((spell): spell is SorcerySpell => !!spell && spell.source === "core" && typeof spell.configuredFrom === "string") : [];
  const customSchools = Array.isArray(item.customSchools) ? item.customSchools.map(normalizeSchool).filter((school): school is SorcerySchool => !!school && school.source !== "core") : [];
  const knownSpells = Array.isArray(item.knownSpells) ? item.knownSpells.flatMap(entry => {
    const known = record(entry);
    if (!known || typeof known.spellId !== "string") return [];
    return [{ spellId: known.spellId, ...(typeof known.sourceDescription === "string" ? { sourceDescription: known.sourceDescription } : {}),
      ...(typeof known.acquiredFrom === "string" ? { acquiredFrom: known.acquiredFrom } : {}), ...(typeof known.starting === "boolean" ? { starting: known.starting } : {}),
      ...(typeof known.notes === "string" ? { notes: known.notes } : {}) }];
  }) : [];
  const schoolAccess = Array.isArray(item.schoolAccess) ? item.schoolAccess.flatMap(entry => {
    const access = record(entry);
    if (!access || typeof access.schoolId !== "string") return [];
    return [{ schoolId: access.schoolId, ...(typeof access.sourceType === "string" ? { sourceType: access.sourceType } : {}),
      ...(typeof access.sourceDescription === "string" ? { sourceDescription: access.sourceDescription } : {}), ...(typeof access.organisationId === "string" ? { organisationId: access.organisationId } : {}) }];
  }) : [];
  const organisationAvailability = record(item.organisationAvailability);
  const availability = organisationAvailability ? Object.fromEntries(Object.entries(organisationAvailability).flatMap(([id, ids]) => Array.isArray(ids) ? [[id, ids.filter((value): value is string => typeof value === "string")]] : [])) : undefined;
  const shapingRules = normalizeShapingRules(item.shapingRules);
  return { schoolIds: Array.isArray(item.schoolIds) ? [...new Set(item.schoolIds.filter((id): id is string => typeof id === "string") )] : [],
    ...(typeof item.startingSchoolId === "string" ? { startingSchoolId: item.startingSchoolId } : {}),
    ...(Array.isArray(item.availableSpellIds) ? { availableSpellIds: [...new Set(item.availableSpellIds.filter((id): id is string => typeof id === "string") )] } : {}),
    schoolAccess, knownSpells, customSchools, customSpells, configuredSpells, ...(availability ? { organisationAvailability: availability } : {}), ...(shapingRules ? { shapingRules } : {}) };
}

export function calculateSorceryStartingEntitlement(invocation: number | undefined): SorceryStartingEntitlement {
  const value = Number.isFinite(invocation) ? Math.max(0, invocation!) : 0;
  return { active: invocation !== undefined && Number.isFinite(invocation), invocationValue: value, count: Math.ceil(value / 20), rule: "one spell per 20% or part thereof" };
}
export const calculateSorceryIntensity = (invocation: number | undefined): number => Math.ceil((Number.isFinite(invocation) ? Math.max(0, invocation!) : 0) / 10);
export const calculateShapingPoints = (shaping: number | undefined): number => Math.ceil((Number.isFinite(shaping) ? Math.max(0, shaping!) : 0) / 10);
export const calculateSorceryDerivedStatistics = (invocation: number | undefined, shaping: number | undefined, intelligence: number): SorceryDerivedStatistics => ({
  intensity: calculateSorceryIntensity(invocation), shapingPoints: calculateShapingPoints(shaping), memorisedSpellCapacity: Math.max(0, Number.isFinite(intelligence) ? intelligence : 0),
});

export function sorceryCatalogue(state: SorceryState = emptySorceryState()): SorcerySpell[] {
  return [...CORE_SORCERY_SPELLS, ...state.configuredSpells, ...state.customSpells];
}
/** Make a configured Core instance without mutating its canonical base record. */
export function configureCoreSorcerySpell(base: SorcerySpell, subject: string): SorcerySpell {
  const value = subject.trim();
  const instanceId = `core:sorcery:configured:${spellKey(base.baseFamily ?? base.name)}:${encodeURIComponent(value.toLocaleLowerCase())}`;
  const kind = base.specialisation?.kind ?? (base.specialisationPrompt?.toLowerCase().includes("form") ? "form" : "subject");
  return { id: instanceId, name: `${base.baseFamily ?? base.name} (${value})`, source: "core", baseFamily: base.baseFamily ?? base.name,
    specialisation: { kind, value }, configuredFrom: base.id };
}
export function sorcerySchoolCatalogue(state: SorceryState = emptySorceryState()): SorcerySchool[] {
  return [...CORE_SORCERY_SCHOOLS, ...state.customSchools];
}
export function availableSorcerySpellIds(state: SorceryState): string[] {
  const schools = new Map(sorcerySchoolCatalogue(state).map(item => [item.id, item]));
  const learnedSchoolIds = [...new Set([...state.schoolIds, ...(state.startingSchoolId ? [state.startingSchoolId] : [])])];
  const schoolPool = [...new Set(learnedSchoolIds.flatMap(id => schools.get(id)?.spellIds ?? []))];
  const explicit = state.availableSpellIds === undefined ? schoolPool : schoolPool.filter(id => state.availableSpellIds!.includes(id));
  const rankPools = Object.values(state.organisationAvailability ?? {});
  return rankPools.length ? explicit.filter(id => rankPools.some(pool => pool.includes(id))) : explicit;
}
/** Replace the character-creation School while preserving any other acquired Schools. */
export function withStartingSorcerySchool(state: SorceryState, schoolId: string | undefined): SorceryState {
  const previousId = state.startingSchoolId;
  return {
    ...state,
    startingSchoolId: schoolId || undefined,
    schoolIds: [...new Set([...state.schoolIds.filter(id => id !== previousId), ...(schoolId ? [schoolId] : [])])],
  };
}
export function effectiveShapingComponents(rules?: SorceryShapingRules): ShapingComponent[] {
  const added = rules?.addComponents ?? [];
  const removed = new Set(rules?.removeComponents ?? []);
  return [...new Set([...CORE_SHAPING_COMPONENTS, ...added])].filter(component => !removed.has(component));
}
/** Preserve known entries when rules change; expose stale IDs for reconciliation/UI without deleting player data. */
export function reconcileSorceryKnownSpells(state: SorceryState): { state: SorceryState; unavailableSpellIds: string[] } {
  const available = new Set(availableSorcerySpellIds(state));
  const knownIds = [...new Set(state.knownSpells.map(spell => spell.spellId))];
  return { state: { ...state, knownSpells: state.knownSpells }, unavailableSpellIds: knownIds.filter(id => !available.has(id)) };
}
