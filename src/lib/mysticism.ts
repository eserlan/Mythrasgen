/** Structured Mysticism paths, organisations, and talents. */
export type MysticismSource = "core" | "campaign" | "custom";
export type MysticismTalentFamily = "augment-skill" | "invoke-trait" | "enhance-attribute" | "custom";

export interface MysticismOrganisation {
  id: string;
  name: string;
  source: MysticismSource;
  notes?: string;
}

export interface MysticismTalent {
  id: string;
  name: string;
  source: MysticismSource;
  family?: MysticismTalentFamily;
  /** Canonical skill, characteristic, derived attribute, or named trait. */
  target?: string;
  /** Structured trait data for specialised Invoke Talents such as Immunity (Disease). */
  trait?: string;
  specialisation?: string;
  description?: string;
  notes?: string;
}

export interface MysticismTalentDetails {
  family: string;
  cost: string;
  effect: string;
}

export interface MysticismPath {
  id: string;
  name: string;
  source: MysticismSource;
  organisationId?: string;
  talentIds: string[];
  description?: string;
  notes?: string;
  teacher?: string;
  /** Reserved for campaign, organisation, and rank availability rules. */
  availability?: Record<string, unknown>;
}

export interface MysticismKnownTalent {
  talentId: string;
  source?: string;
  notes?: string;
}

export interface MysticismState {
  /** Paths acquired over a character's lifetime; chargen uses startingPathId. */
  pathIds: string[];
  startingPathId?: string;
  /** Optional restriction supplied by campaign or organisation rules. */
  availableTalentIds?: string[];
  /** Starting choices remain separately identifiable from later known Talents. */
  startingTalentIds: string[];
  knownTalents: MysticismKnownTalent[];
  /** Future custom content is stored per character; Core data lives in the catalogue. */
  customPaths: MysticismPath[];
  customTalents: MysticismTalent[];
  organisations: MysticismOrganisation[];
}

const talentId = (family: string, name: string) => `core:mysticism:${family}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
const augment = (target: string): MysticismTalent => ({ id: talentId("augment-skill", target), name: `Augment ${target}`, source: "core", family: "augment-skill", target });
const invoke = (target: string): MysticismTalent => {
  const specialised = /^(.*?) \((.*)\)$/.exec(target);
  const immunity = /^(Disease|Poison) Immunity$/.exec(target);
  return { id: talentId("invoke-trait", target), name: `Invoke ${target}`, source: "core", family: "invoke-trait", target,
    ...(specialised ? { trait: specialised[1], specialisation: specialised[2] } : {}),
    ...(immunity ? { trait: "Immunity", specialisation: immunity[1] } : {}) };
};
const enhance = (target: string): MysticismTalent => ({ id: talentId("enhance-attribute", target), name: `Enhance ${target}`, source: "core", family: "enhance-attribute", target });

export const CORE_MYSTICISM_ORGANISATIONS: MysticismOrganisation[] = [
  { id: "core:monastic-order-of-epistemology", name: "Monastic Order of Epistemology", source: "core" },
  { id: "core:brotherhood-of-the-healing-hands", name: "Brotherhood of the Healing Hands", source: "core" },
  { id: "core:school-of-impenetrable-silence", name: "School of Impenetrable Silence", source: "core" },
  { id: "core:fellowship-of-the-snake", name: "Fellowship of the Snake", source: "core" },
  { id: "core:school-of-the-leaping-tiger", name: "School of the Leaping Tiger", source: "core" },
  { id: "core:order-of-asceticism", name: "Order of Asceticism", source: "core" },
  { id: "core:academy-of-enlightened-being", name: "Academy of Enlightened Being", source: "core" },
];

const path = (id: string, name: string, organisationId: string, talents: MysticismTalent[]): MysticismPath => ({
  id: `core:${id}`, name, source: "core", organisationId, talentIds: talents.map(talent => talent.id),
});

const corePathTalents: [string, string, string, MysticismTalent[]][] = [
  ["way-of-all-knowledge", "Way of All Knowledge", "core:monastic-order-of-epistemology", [augment("Insight"), augment("Language"), augment("Lore"), invoke("Aura (Wisdom)"), invoke("Awareness"), invoke("Denial (Ignorance)"), invoke("Magic Sense")]],
  ["path-of-healing", "Path of Healing", "core:brotherhood-of-the-healing-hands", [augment("Endurance"), augment("First Aid"), augment("Healing"), invoke("Disease Immunity"), invoke("Poison Immunity"), enhance("Healing Rate"), enhance("Fatigue")]],
  ["path-of-shadows", "Path of Shadows", "core:school-of-impenetrable-silence", [augment("Perception"), augment("Stealth"), augment("Unarmed"), augment("Ranged Combat Style"), invoke("Adhesion"), invoke("Dark Sight"), enhance("Movement")]],
  ["path-of-deceit", "Path of Deceit", "core:fellowship-of-the-snake", [augment("Conceal"), augment("Deceit"), augment("Influence"), augment("Sleight"), augment("Willpower"), invoke("Night Sight"), enhance("Movement")]],
  ["way-of-the-tiger", "Way of the Tiger", "core:school-of-the-leaping-tiger", [augment("Athletics"), augment("Brawn"), augment("Endurance"), augment("Unarmed"), invoke("Formidable Natural Weapons"), enhance("Action Points"), enhance("Damage Modifier")]],
  ["way-of-abjuration", "Way of Abjuration", "core:order-of-asceticism", [augment("Endurance"), augment("Survival"), invoke("Denial (Food)"), invoke("Denial (Water)"), invoke("Denial (Sleep)"), enhance("Fatigue"), enhance("Hit Points")]],
  ["way-of-reason", "Way of Reason", "core:academy-of-enlightened-being", [augment("Customs"), augment("Influence"), augment("Insight"), augment("Willpower"), invoke("Aura (Authority)"), invoke("Aura (Wisdom)"), enhance("Initiative")]],
];

export const CORE_MYSTICISM_TALENTS: MysticismTalent[] = [...new Map(
  corePathTalents.flatMap(([, , , talents]) => talents).map(talent => [talent.id, talent] as const),
).values()];
export const CORE_MYSTICISM_PATHS: MysticismPath[] = corePathTalents.map(([id, name, organisationId, talents]) => path(id, name, organisationId, talents));

const enhanceEffects: Record<string, string> = {
  "Action Points": "Each level of Intensity adds 1 Action Point. These additional points can only be used for defensive combat actions such as Parry or Evade; they cannot provide extra attacks or extra magic casting.",
  "Damage Modifier": "Each level of Intensity increases Damage Modifier by one step, following the standard Damage Modifier progression.",
  Fatigue: "Each Intensity negates one level of Fatigue and can be used as a pre-emptive buffer. When the Talent ends, the negated Fatigue returns and may cause the mystic to collapse.",
  "Healing Rate": "Each Intensity improves the speed of natural recovery by one step: Months → Weeks → Days → Hours → Minutes → Combat Rounds. The mystic may remain in a healing trance until recovered but cannot perform other tasks; this does not restore severed or maimed body parts.",
  "Hit Points": "Each Intensity adds 1 temporary Hit Point to every Hit Location; these points absorb damage first. Serious and Major Wound thresholds do not change, and an already disabled location is not restored to function.",
  Movement: "Each level of Intensity increases Movement by 2 metres.",
  Initiative: "Each level of Intensity adds 2 to the Initiative roll.",
};

function invokeEffect(target: string, traitName?: string, traitSpecialisation?: string): string {
  const specialised = /^(.*?) \((.*)\)$/.exec(target);
  const trait = traitName ?? specialised?.[1] ?? target;
  const specialisation = traitSpecialisation ?? specialised?.[2];
  switch (trait) {
    case "Adhesion":
      return "Move freely on vertical surfaces and upside down across ceilings without special equipment. Movement while doing so is half normal Movement Rate.";
    case "Aura":
      return `Project an aura of ${specialisation ?? "the chosen quality"} within a radius equal to POW in metres. Someone attempting to overcome it makes an opposed Willpower vs the Mysticism roll used to invoke it.`;
    case "Awareness":
      return "Detect the presence of a chosen kind of emanation within POW metres (such as threat, love, danger, or magic); it reveals that the emanation is nearby, not precise details about it.";
    case "Denial":
      return specialisation === "Ignorance"
        ? "Denial (Ignorance): deny the effects of the specifically defined condition, Ignorance."
        : `Deny the normal effects or need associated with ${specialisation ?? "one specifically defined condition"} for the Talent's duration.`;
    case "Magic Sense":
      return "Detect magical emanations. By touching another, learn their current Magic Points, carried enchantments, and active spells.";
    case "Immunity":
      return `Gain immunity to ${specialisation ?? "the specified condition"} while the Talent is active.`;
    case "Dark Sight":
      return "See normally at any level of limited light, including complete darkness.";
    case "Night Sight":
      return "Treat partial darkness as illuminated, and darkness as partial darkness.";
    case "Formidable Natural Weapons":
      return "The mystic's hands and feet count as Size Large when attacking and parrying in combat.";
    default:
      return specialisation
        ? `${trait} applies to ${specialisation}; use the Core ${trait} Trait rule for its effect.`
        : `Invoke the ${target} Trait for the Talent's duration.`;
  }
}

/** Resolve concise canonical rules for picker Details without copying them into character saves. */
export function mysticismTalentDetails(talent: MysticismTalent): MysticismTalentDetails {
  if (talent.source === "core") {
    if (talent.family === "augment-skill" && talent.target) {
      const target = talent.target === "Ranged Combat Style" ? "the applicable ranged Combat Style" : talent.target;
      return { family: "Augment Skill", cost: "1 MP per Intensity", effect: `Each level of Intensity improves ${target} by one difficulty grade, to a maximum of Very Easy.` };
    }
    if (talent.family === "invoke-trait" && talent.target) {
      return { family: "Invoke Trait", cost: "2 MP · Intensity 1", effect: invokeEffect(talent.target, talent.trait, talent.specialisation) };
    }
    if (talent.family === "enhance-attribute" && talent.target) {
      return { family: "Enhance Attribute", cost: "3 MP per Intensity", effect: enhanceEffects[talent.target] ?? `Each level of Intensity enhances ${talent.target} according to its Core rule.` };
    }
  }

  // Custom descriptions are player-authored and always take precedence over shared family help.
  if (talent.description?.trim()) {
    const family = talent.family === "augment-skill" ? "Augment Skill" : talent.family === "invoke-trait" ? "Invoke Trait" : talent.family === "enhance-attribute" ? "Enhance Attribute" : "Custom Talent";
    const cost = talent.family === "augment-skill" ? "1 MP per Intensity" : talent.family === "invoke-trait" ? "2 MP · Intensity 1" : talent.family === "enhance-attribute" ? "3 MP per Intensity" : "";
    return { family, cost, effect: talent.description };
  }
  if (talent.notes?.trim()) return { family: "Custom Talent", cost: "", effect: talent.notes };
  if (talent.family === "augment-skill" && talent.target) return { family: "Augment Skill", cost: "1 MP per Intensity", effect: `Each level of Intensity improves ${talent.target} by one difficulty grade, to a maximum of Very Easy.` };
  if (talent.family === "invoke-trait" && talent.target) return { family: "Invoke Trait", cost: "2 MP · Intensity 1", effect: invokeEffect(talent.target, talent.trait, talent.specialisation) };
  if (talent.family === "enhance-attribute" && talent.target) return { family: "Enhance Attribute", cost: "3 MP per Intensity", effect: `Each level of Intensity enhances ${talent.target} according to its Core rule.` };
  return { family: "Custom Talent", cost: "", effect: "Campaign-defined Mysticism Talent." };
}

export const emptyMysticismState = (): MysticismState => ({
  pathIds: [], startingTalentIds: [], knownTalents: [], customPaths: [], customTalents: [], organisations: [],
});

const asRecord = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const sources = new Set<MysticismSource>(["core", "campaign", "custom"]);
const normalizeTalent = (value: unknown): MysticismTalent | null => {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sources.has(item.source as MysticismSource)) return null;
  const families = new Set<MysticismTalentFamily>(["augment-skill", "invoke-trait", "enhance-attribute", "custom"]);
  const family = families.has(item.family as MysticismTalentFamily) ? item.family as MysticismTalentFamily : undefined;
  return { id: item.id, name: item.name, source: item.source as MysticismSource, ...(family ? { family } : {}),
    ...(typeof item.target === "string" ? { target: item.target } : {}), ...(typeof item.trait === "string" ? { trait: item.trait } : {}),
    ...(typeof item.specialisation === "string" ? { specialisation: item.specialisation } : {}),
    ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}) };
};
const normalizePath = (value: unknown): MysticismPath | null => {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !sources.has(item.source as MysticismSource)) return null;
  const availability = asRecord(item.availability);
  return { id: item.id, name: item.name, source: item.source as MysticismSource,
    ...(typeof item.organisationId === "string" ? { organisationId: item.organisationId } : {}),
    talentIds: Array.isArray(item.talentIds) ? item.talentIds.filter((id): id is string => typeof id === "string") : [],
    ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
    ...(typeof item.teacher === "string" ? { teacher: item.teacher } : {}), ...(availability ? { availability } : {}) };
};

export function normalizeMysticismState(value: unknown): MysticismState {
  const item = asRecord(value);
  if (!item) return emptyMysticismState();
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  const customPaths = Array.isArray(item.customPaths) ? item.customPaths.map(normalizePath).filter((path): path is MysticismPath => !!path) : [];
  const customTalents = Array.isArray(item.customTalents) ? item.customTalents.map(normalizeTalent).filter((talent): talent is MysticismTalent => !!talent) : [];
  const knownTalents = Array.isArray(item.knownTalents) ? item.knownTalents.flatMap(value => {
    const known = asRecord(value);
    return known && typeof known.talentId === "string" ? [{ talentId: known.talentId,
      ...(typeof known.source === "string" ? { source: known.source } : {}), ...(typeof known.notes === "string" ? { notes: known.notes } : {}) }] : [];
  }) : [];
  const organisations = Array.isArray(item.organisations) ? item.organisations.flatMap(value => {
    const org = asRecord(value);
    return org && typeof org.id === "string" && typeof org.name === "string" && sources.has(org.source as MysticismSource)
      ? [{ id: org.id, name: org.name, source: org.source as MysticismSource, ...(typeof org.notes === "string" ? { notes: org.notes } : {}) }] : [];
  }) : [];
  return { pathIds: strings(item.pathIds), ...(typeof item.startingPathId === "string" ? { startingPathId: item.startingPathId } : {}),
    ...(Array.isArray(item.availableTalentIds) ? { availableTalentIds: strings(item.availableTalentIds) } : {}),
    startingTalentIds: strings(item.startingTalentIds), knownTalents, customPaths, customTalents, organisations };
}

export interface MysticismStartingEntitlement {
  active: boolean;
  skillValue: number;
  count: number;
  ruleId: "mysticism:one-per-20";
  rule: "1 Talent per 20% or part thereof";
  pathConfigured: boolean;
}

export function calculateMysticismStartingEntitlement(skillValue: number | undefined, startingPathId?: string): MysticismStartingEntitlement {
  const active = skillValue !== undefined && Number.isFinite(skillValue);
  const value = active ? Math.max(0, skillValue!) : 0;
  return { active, skillValue: value, count: active ? Math.ceil(value / 20) : 0,
    ruleId: "mysticism:one-per-20", rule: "1 Talent per 20% or part thereof", pathConfigured: !!startingPathId };
}

export function mysticismCatalogue(state: MysticismState) {
  return { talents: [...CORE_MYSTICISM_TALENTS, ...state.customTalents], paths: [...CORE_MYSTICISM_PATHS, ...state.customPaths],
    organisations: [...CORE_MYSTICISM_ORGANISATIONS, ...state.organisations] };
}

/** Resolve Talents taught by selected Paths, then apply any campaign availability restriction. */
export function availableMysticismTalentIds(state: MysticismState, pathIds = [...new Set([...state.pathIds, ...(state.startingPathId ? [state.startingPathId] : [])])]) {
  const { paths } = mysticismCatalogue(state);
  const inPaths = new Set(paths.filter(path => pathIds.includes(path.id)).flatMap(path => path.talentIds));
  return [...inPaths].filter(id => state.availableTalentIds === undefined || state.availableTalentIds.includes(id));
}

/** Preserve known selections and explicitly report any no longer available through the current Paths/rules. */
export function reconcileMysticismTalents(state: MysticismState, pathIds?: string[]) {
  const availableTalentIds = availableMysticismTalentIds(state, pathIds);
  const available = new Set(availableTalentIds);
  const retainedSelections = [...new Set([...state.startingTalentIds, ...state.knownTalents.map(talent => talent.talentId)])];
  return { availableTalentIds, knownTalents: state.knownTalents,
    unavailableTalentIds: retainedSelections.filter(id => !available.has(id)) };
}
