/** Core Theism rules, catalogue, cult presets, and character membership data. */
export type TheistRank = "Lay Member" | "Initiate" | "Acolyte" | "Priest" | "High Priest";
export type TheismSource = "core" | "campaign" | "custom";

export interface TheistMiracle {
  id: string;
  name: string;
  source: TheismSource;
  minimumRank: Exclude<TheistRank, "Lay Member">;
  mpCost: number;
  exhortationTime: string;
  traits: string[];
  description: string;
}

export interface TheistCultMiracle {
  miracleId: string;
  /** Cult-facing name, e.g. True Scimitar for the generic True (Weapon) miracle. */
  name?: string;
  /** Overrides availability in this cult without changing canonical miracle metadata. */
  minimumRank?: TheistRank;
}

export interface TheistCult {
  id: string;
  name: string;
  deity: string;
  source: TheismSource;
  description?: string;
  miracles: TheistCultMiracle[];
}

export interface TheistCultMembership {
  id: string;
  cultId: string;
  rank: TheistRank;
  devotionSpecialisation: string;
  devotionValue: number;
  exhortValue: number;
  devotionalPool: number;
  knownMiracleIds: string[];
}

export interface TheismState {
  /** Campaign/custom definitions are stored here; Core definitions remain in the shared catalogue. */
  customCults: TheistCult[];
  memberships: TheistCultMembership[];
}

const miracleId = (name: string) => `core:theism:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
type MiracleReference = readonly [name: string, traits: readonly string[], description: string];
const miracle = ([name, traits, description]: MiracleReference, minimumRank: TheistMiracle["minimumRank"]): TheistMiracle => {
  const rankData = minimumRank === "Initiate" ? [1, "1 Turn"] as const : minimumRank === "Acolyte" ? [2, "2 Turns"] as const : [3, "3 Turns"] as const;
  return { id: miracleId(name), name, source: "core", minimumRank, mpCost: rankData[0], exhortationTime: rankData[1], traits: [...traits], description };
};

const initiate: readonly MiracleReference[] = [
  ["Absorption", ["Duration (Minutes)", "Rank Initiate"], "Absorbs incoming magic aimed at the recipient or their equipment, converting successfully absorbed magic into personal MPs up to capacity. Existing magic is unaffected. Incoming Magnitude at or below Absorption is cancelled and Absorption remains; stronger magic removes it before taking effect."],
  ["Aegis", ["Duration (Minutes)", "Rank Initiate"], "Creates or augments a damage-immune Hoplite-style shield. Parrying Size by Intensity: 1–2 Small, 3–4 Medium, 5–6 Large, 7–8 Huge, 9–10 Enormous, 11+ Colossal. An existing shield is protected for the duration."],
  ["Backlash", ["Duration (Minutes)", "Ranged (Metres)", "Rank Initiate"], "Physical wounds inflicting HP no greater than Intensity are redirected to the attacker in the same location, ignoring attacker armour. Works against melee and ranged attackers within range; does not prevent Special Effects on the recipient."],
  ["Behold", ["Area (Metres)", "Duration (Minutes)", "Rank Initiate", "Resist (Willpower)"], "Shows what a lower-ranked fellow cult member is experiencing through a cult medium, normally one primary sense. Fails against stronger anti-scrying, another cult’s consecrated ground, or death; the target may resist."],
  ["Berserk", ["Duration (Minutes)", "Rank Initiate", "Resist (Willpower)"], "+2 Damage Modifier steps; weapon Size +1 for penetrating parries; ignores Serious-Wound and Fatigue penalties; automatically resists Special Effects. Major Wounds still incapacitate. Cannot Parry, Evade, or cast magic. Unwilling targets may resist; when it ends, apply twice the deferred Fatigue."],
  ["Breathe Water", ["Duration (Hours)", "Rank Initiate"], "Breathe water and air, withstand deep-water pressure, and speak and cast magic normally underwater."],
  ["Cure Malady", ["Duration (Instant)", "Rank Initiate"], "Cures mundane disease or poison and magical disease or poison whose potency is below caster Devotion. Exorcises Disease Spirits with Intensity no greater than half miracle Intensity, rounded up."],
  ["Dismiss Elemental", ["Duration (Instant)", "Ranged (Tens of Metres)", "Rank Initiate", "Resist (Willpower)"], "Affects Gnomes, Salamanders, Shades, Sylphs, or Undines up to 1 cubic metre per Intensity; failed resistance dismisses the elemental, leaving its material substance."],
  ["Dismiss Magic", ["Duration (Instant)", "Ranged (Tens of Metres)", "Rank Initiate"], "Removes combined Magnitude up to its own; spells cannot be partly removed. Select a specific target or remove strongest first. Stops if the next effect is too strong. Takes precedence over equal or lower counter-magic and can Counter Spell incoming magic."],
  ["Elemental Summoning", ["Duration (Hours)", "Ranged (Metres)", "Rank Initiate"], "Summons a cult-associated elemental in 1d3 Combat Rounds, 1 cubic metre per Intensity. It obeys the theist but cannot leave range. Requires appropriate elemental material; less material permits a smaller elemental."],
  ["Enthrall", ["Duration (Hours)", "Rank Initiate"], "Heightens sexual attraction: naturally attracted characters resist the recipient’s Influence or Streetwise one grade harder and Seduction two grades harder."],
  ["Fear", ["Duration (Minutes)", "Ranged (Metres)", "Rank Initiate", "Resist (Willpower)"], "Failed resistance makes the target flee the theist and avoid combat unless cornered. No effect on unconscious beings, beings without INT or INS, or targets under stronger emotion-control magic."],
  ["Fortify", ["Area (Tens of Metres)", "Duration (Instant)", "Rank Initiate", "Resist (Evade)"], "Adds Intensity to the natural AP of buildings and walls. Offensive magic that damages or modifies protected construction has its Intensity reduced by Fortify Intensity."],
  ["Harmonise", ["Duration (Minutes)", "Ranged (Tens of Metres)", "Rank Initiate", "Resist (Willpower)"], "Failed resistance forces a similar-bodied target to mimic physical movement; it does not control speech. Forced combat rolls are one grade harder."],
  ["Heal Wound", ["Duration (Instant)", "Rank Initiate"], "Restores one location to full HP for Minor or Serious Wounds. Major Wounds are only stabilised."],
  ["Illusion", ["Area (Metres)", "Duration (Hours)", "Rank Initiate", "Resist (Special)"], "Alters one sensory projection per 2 Intensity; choices are fixed once cast. The target must fit the area. An unwilling living target may resist with Endurance; interacting observers may oppose with Willpower against debilitating psychosomatic effects. The illusion itself causes no harm and real hazards remain."],
  ["Lay to Rest", ["Duration (Instant)", "Rank Initiate"], "Sends a recently killed being’s soul to its deserved afterlife, chiefly preventing its return as a vengeful spirit or corporeal undead."],
  ["Lightning", ["Duration (Instant)", "Ranged (Tens of Metres)", "Rank Initiate", "Resist (Evade)"], "If not evaded, inflicts 1d6 damage per 2 Intensity to one random hit location. Natural or worn armour does not protect; magical protection does."],
  ["Madness", ["Duration (Days)", "Ranged (Metres)", "Rank Initiate", "Resist (Willpower)"], "Failed resistance causes uncontrolled insanity appropriate to personality and circumstances; the GM normally controls affected PCs until cured or ended unless the player can portray it."],
  ["Mindblast", ["Duration (Days)", "Ranged (Metres)", "Rank Initiate", "Resist (Willpower)"], "Failed resistance temporarily converts INT to animalistic INS, removing speech, writing, complex communication, and equipment or device use. Instinct and basic cunning remain; default to Unarmed if forced to fight."],
  ["Mindlink", ["Duration (Minutes)", "Ranged (Tens of Metres)", "Rank Initiate"], "Willing participants share thoughts, theistic knowledge, and Devotional Pool MPs. Each casting links a pair; a person can hub several links. It can fund priests or temporarily give lower ranks higher miracle access. Mental or emotion magic targeting one participant must also be resisted by everyone directly linked. A participant may sever the link on their turn or by leaving range."],
  ["Mirage", ["Area (Metres)", "Duration (Minutes)", "Rank Initiate"], "Creates cult-themed optical obscuration; ranged attacks against targets within suffer one difficulty grade per 4 Intensity."],
  ["Perseverance", ["Duration (Hours)", "Rank Initiate"], "Prevents further Fatigue from labour or hardship while active; does not improve capability or prevent Fatigue from asphyxiation or blood loss."],
  ["Reflection", ["Duration (Minutes)", "Rank Initiate"], "Incoming magic aimed at the recipient or equipment with Magnitude no greater than Reflection is reflected to the original caster and Reflection remains; stronger magic removes Reflection before taking effect. Existing magic and self-cast magic are unaffected."],
  ["Ripen", ["Area (Metres)", "Duration (Instant)", "Rank Initiate"], "Produces one ripe crop from vegetation in the area; does not make inedible plants edible and cannot produce more than one crop per plant or tree annually."],
  ["Sacred Band", ["Duration (Minutes)", "Ranged (Tens of Metres)", "Rank Initiate"], "Links up to Intensity worshippers with the same basic physiology. Damage to one is divided as evenly as possible among linked members in the same hit location; Special Effects remain with the original victim."],
  ["Shield", ["Duration (Minutes)", "Rank Initiate"], "Grants AP equal to Intensity on all hit locations. Does not stack with worn armour; use the better protection per location. It may still ward some magical damage even where worn AP is higher."],
  ["Soul Sight", ["Duration (Minutes)", "Rank Initiate"], "Reveals a viewed being’s current MPs, active magic and its source, and carried enchanted items; also sees the spirit world and through visual illusions hiding true form."],
  ["Spirit Block", ["Duration (Minutes)", "Rank Initiate"], "Complete protection from spiritual assault by spirits of Intensity no greater than half miracle Intensity, rounded up. Covers discorporation, spirit combat, possession, and similar assaults; not spirit spells or physical attacks."],
  ["Steadfast", ["Area (Metres)", "Duration (Minutes)", "Rank Initiate", "Resist (Willpower)"], "Grants immunity to natural mental or emotional manipulation. Similar magical effects must exceed Steadfast Magnitude to have a chance to affect targets."],
  ["Sureshot", ["Duration (Minutes)", "Ranged (Tens of Metres)", "Rank Initiate"], "If a target is visible and weapon or miracle ranges allow, failed ranged weapon attacks become successes. Fumbles, normal successes, and criticals are unchanged; the target may Parry or Evade normally."],
  ["True (Weapon)", ["Duration (Minutes)", "Rank Initiate"], "For a cult-specified close-combat weapon, roll weapon damage twice but cap it at the normal maximum; weapon Size +1 for overcoming parries. Damage Modifier and other bonuses are unaffected."],
];
const acolyte: readonly MiracleReference[] = [
  ["Beast Form", ["Duration (Hours)", "Ranged (Metres)", "Rank Acolyte", "Resist (Endurance)"], "Transforms the target and belongings into a mundane cult-sacred animal. INT, CHA, and POW remain; STR, DEX, CON, and SIZ become animal averages plus 1 each per Intensity; gains natural abilities."],
  ["Bind Ghost", ["Duration (Days)", "Rank Acolyte", "Resist (Willpower)"], "Turns a just-slain soul into a Haunt bound to the place of death. An unwilling victim may resist. It obeys for the duration then is released; maximum soul POW is twice Intensity."],
  ["Bless Crops", ["Area (Tens of Metres)", "Duration (Months)", "Rank Acolyte"], "Protects cultivated crops from natural bad weather, blight, and insects; maintained from sowing to harvest, it guarantees a nominal harvest. Also protects against magical disasters whose Magnitude does not exceed the blessing."],
  ["Call Winds", ["Area (Kilometres)", "Duration (Hours)", "Rank Acolyte"], "Controls wind: Acolyte up to Strong Breezes, Priest Moderate Gales, High Priest Storms. May calm or redirect wind; competing weather magic is resolved by greater Magnitude."],
  ["Chameleon", ["Duration (Minutes)", "Rank Acolyte"], "Near-invisibility in a cult-specific environment. A motionless recipient cannot be found by normal visual Perception; while moving, visual interaction suffers one difficulty grade per 4 Intensity. Other primary senses and magical perception bypass it."],
  ["Clear Skies", ["Area (Kilometres)", "Duration (Hours)", "Rank Acolyte"], "Disperses weather: Acolyte up to Heavy Cloud or Moderate rain; Priest Moderately Overcast or Very Heavy rain; High Priest Storm Clouds or Deluges. Cannot overcome magical weather of greater Magnitude."],
  ["Cloud Call", ["Area (Kilometres)", "Duration (Hours)", "Rank Acolyte"], "Creates weather: Acolyte Heavy Cloud, Moderate rain, or mist; Priest Moderately Overcast, Very Heavy rain, or thick fog; High Priest Storm Clouds, Deluges, or Pea-soup fog. Cannot overcome stronger magical weather."],
  ["Consecrate", ["Area (Tens of Metres)", "Duration (Months)", "Rank Acolyte"], "Sanctifies a prepared shrine or altar area, allowing cultists to recharge Devotional Pools. Up to Intensity additional cult miracles may be embedded and share its duration and readiness; embedded miracle rank cannot exceed consecrator rank and its caster’s pool remains reduced while maintained. Exhorting neutral gods inside is one grade harder; hostile gods two grades harder."],
  ["Corruption", ["Duration (Hours)", "Ranged", "Rank Acolyte", "Resist (Endurance)"], "Failed resistance causes deity-themed degeneration. Each hour Endurance: critical, no damage; success, 1d3 to every location; failure, 1d6 to every location; fumble is fatal."],
  ["Cure Sense", ["Duration (Instant)", "Rank Acolyte"], "Permanently cures one sensory injury such as blindness or deafness."],
  ["Entangle", ["Duration (Minutes)", "Ranged (Tens of Metres)", "Rank Acolyte", "Resist (Evade)"], "Animates natural vegetation; failed resistance leaves the target immobile for the duration."],
  ["Exorcism", ["Duration (Instant)", "Rank Acolyte", "Resist (Willpower)"], "Drives a possessing spirit from a corporeal being, dominant or covert, if spirit Intensity is no greater than half miracle Intensity. The expelled spirit remains free to act."],
  ["Fecundity", ["Duration (Months)", "Rank Acolyte"], "Ensures the recipient will sire or bear offspring on the next reproductive act. If maintained through gestation, offspring are healthy; unborn young are protected from magical curses whose Magnitude does not exceed Fecundity."],
  ["Heal Body", ["Duration (Instant)", "Rank Acolyte"], "Instantly heals all Minor and Serious Wounds. Major Wounds are stabilised only; maimed or dismembered locations require Rejuvenate."],
  ["Heal Mind", ["Duration (Instant)", "Rank Acolyte"], "Removes madness or mental derangements from one target. Magical disorders require miracle Magnitude at least equal to the disorder."],
  ["Leeching", ["Area (Tens of Metres)", "Duration (Minutes)", "Rank Acolyte"], "Suppresses magic in the area by miracle Magnitude. Encroaching magic reduced to zero becomes inactive while its target remains inside; magic cast within with Magnitude no greater than Leeching automatically fails."],
  ["Pacify", ["Area (Tens of Metres)", "Duration (Minutes)", "Rank Acolyte", "Resist (Willpower)"], "Failed resistance prevents harmful or aggressive action. Affected beings may defend non-harmfully but otherwise cease violence, threats, and arguments; opinions are unchanged."],
  ["Propitiate", ["Area (Kilometres)", "Duration (Weeks)", "Rank Acolyte"], "Appeases a hostile deity through worship so its domain causes no serious harm in the region around a shrine or temple; manifestations may still occur but damaging consequences are suppressed."],
  ["Raise Undead", ["Duration (Hours)", "Ranged (Tens of Metres)", "Rank Acolyte"], "Animates up to Intensity corpses as skeletons or zombies; skills are limited to the theist’s capabilities. Each gains STR and CON equal to Intensity. Only corpses with SIZ no greater than caster POW."],
  ["Sunspear", ["Duration (Instant)", "Ranged (Tens of Metres)", "Rank Acolyte", "Resist (Evade)"], "In direct sunlight, strikes one target for 1d6 damage per 2 Intensity to every hit location if not evaded. Natural or worn armour protects."],
  ["Thunderclap", ["Area (Tens of Metres)", "Duration (Minutes)", "Rank Acolyte", "Resist (Endurance)"], "Non-cult members resist; failure knocks them prone and deafens them for the duration, while a fumble causes permanent deafness. Glass and pottery in the area shatter automatically."],
];
const priest: readonly MiracleReference[] = [
  ["Awaken", ["Duration (Minutes)", "Ranged (Tens of Metres)", "Rank Priest"], "Within consecrated ground the deity animates an idol or sacred animal(s), which cannot leave the area. Total STR + SIZ up to 10 × Intensity. Idols act at caster Devotion, Initiative Bonus equals Intensity, and have 1 Action Point per 4 Intensity rounded up; awakened animals use normal or trained skills or caster Devotion, whichever is higher."],
  ["Earthquake", ["Area (Tens of Metres)", "Duration (Instant)", "Rank Priest", "Resist (Evade)"], "A tremor knocks down targets who fail Evade and can collapse structures or terrain and trap victims. Severity scales with Intensity: low values move or crack objects; 6+ begins structural damage, rising to widespread destruction; 11+ can partially collapse colossal stone monuments or cliffs. Exact environmental damage may use the Core severity table."],
  ["Excommunicate", ["Duration (Instant)", "Ranged (Metres)", "Rank Priest", "Resist (Willpower)"], "Only affects a worshipper of the caster’s cult. Failure severs the divine link, empties that cult’s Devotional Pool, and removes miracle access; cult Devotion and Exhort become powerless academic knowledge until amends restore the relationship."],
  ["Extension", ["Duration (Special)", "Rank Priest"], "Extends a still-active non-instant miracle as long as maintained. Extension and the extended miracle continue reducing available Devotional Pool by their MP costs."],
  ["Growth", ["Area (Tens of Metres)", "Duration (Hours)", "Rank Priest"], "Vegetation grows and ages one year per hour, producing rapid tangled proliferation; repeated use can turn open ground into dense vegetation or forest."],
  ["Heart Seizure", ["Duration (Instant)", "Ranged (Metres)", "Rank Priest", "Resist (Endurance)"], "Failed resistance is fatal to a creature with a heart. Successful resistance still inflicts HP damage equal to Intensity directly to a heart-bearing location. Heartless creatures are immune; deity-specific organ variants may exist."],
  ["Obliterate", ["Area (Kilometres)", "Duration (Instant)", "Rank Priest", "Resist (Willpower)"], "Removes records of a person’s existence and erases their name from minds within range, except for the casting priest unless they resist."],
  ["Rain of (Substance)", ["Area (Kilometres)", "Duration (Minutes)", "Rank Priest"], "Creates dramatic cult-themed rain intended for awe or terror rather than direct harm; during it cult members are treated as having the Intimidate creature ability."],
  ["Rejuvenate", ["Duration (Special)", "Rank Priest"], "Repairs one Major-Wounded location, including mutilation or dismemberment. If a living recipient was wounded within Intensity hours, all damage heals instantly; older injuries take days equal to HP lost. If the miracle lapses before regrowth completes, the location remains maimed and unusable."],
  ["Resurrect", ["Duration (Instant)", "Rank Priest", "Resist (Special)"], "Attempts to return a deceased spirit to a sufficiently intact body after removing any still-fatal disease, poison, or curse. An unwilling spirit may resist using its strongest relevant Passion or Devotion. Must be cast within Magnitude days of death. Success returns the character with 1 HP in every extant location."],
  ["Sever Spirit", ["Duration (Instant)", "Ranged (Tens of Metres)", "Rank Priest", "Resist (Endurance)"], "Failure to resist is fatal. Successful resistance still inflicts 1 HP damage per 2 Intensity to every hit location simultaneously."],
];

export const THEIST_RANKS: readonly TheistRank[] = ["Lay Member", "Initiate", "Acolyte", "Priest", "High Priest"];
export const CORE_THEIST_MIRACLES: TheistMiracle[] = [
  ...initiate.map(entry => miracle(entry, "Initiate")),
  ...acolyte.map(entry => miracle(entry, "Acolyte")),
  ...priest.map(entry => miracle(entry, "Priest")),
];

const byName = (name: string) => CORE_THEIST_MIRACLES.find(item => item.name === name)!.id;
const offerings = (names: readonly string[]): TheistCultMiracle[] => names.map(name => ({ miracleId: byName(name) }));
export const CORE_THEIST_CULTS: TheistCult[] = [
  { id: "core:cult-of-myceras", name: "Cult of Myceras", deity: "Myceras", source: "core", miracles: offerings(["Beast Form", "Berserk", "Clear Skies", "Consecrate", "Fortify", "Sacred Band", "Shield", "Sunspear"]) },
  { id: "core:seven-badoshi-devils", name: "Seven Badoshi Devils", deity: "Seven Badoshi Devils", source: "core", miracles: [
    ...offerings(["Bind Ghost", "Chameleon", "Consecrate", "Earthquake", "Madness", "Perseverance"]),
    { miracleId: byName("True (Weapon)"), name: "True Scimitar" },
  ] },
];

const rankIndex = (rank: TheistRank) => THEIST_RANKS.indexOf(rank);
const finiteNonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const asRecord = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

/** Pool maximum from POW and explicit cult rank; personal Magic Points are not involved. */
export function devotionalPoolMaximum(pow: number, rank: TheistRank): number {
  if (!finiteNonnegative(pow)) return 0;
  const fraction = rank === "Lay Member" ? 0 : rank === "Initiate" ? 0.25 : rank === "Acolyte" ? 0.5 : rank === "Priest" ? 0.75 : 1;
  return Math.ceil(pow * fraction);
}

export function startingMiracleLimit(devotion: number): number {
  return finiteNonnegative(devotion) ? Math.ceil(devotion / 20) : 0;
}

export function miracleMagnitude(devotion: number): number {
  return finiteNonnegative(devotion) ? Math.ceil(devotion / 10) : 0;
}

export const miracleIntensity = miracleMagnitude;

export function effectiveMiracleMinimumRank(miracle: TheistMiracle, offering?: TheistCultMiracle): TheistRank {
  return offering?.minimumRank ?? miracle.minimumRank;
}

export function miracleAvailableAtRank(miracle: TheistMiracle, rank: TheistRank, offering?: TheistCultMiracle): boolean {
  return rankIndex(rank) >= rankIndex(effectiveMiracleMinimumRank(miracle, offering));
}

/** Resolve a cult's offerings to canonical miracle records, keeping only cult-specific presentation and rank overrides. */
export function availableTheistCultMiracles(
  cult: TheistCult, rank: TheistRank, catalogue: readonly TheistMiracle[] = CORE_THEIST_MIRACLES,
): { offering: TheistCultMiracle; miracle: TheistMiracle }[] {
  return cult.miracles.map(offering => ({
    offering,
    miracle: catalogue.find(item => item.id === offering.miracleId),
  })).filter((item): item is { offering: TheistCultMiracle; miracle: TheistMiracle } =>
    !!item.miracle && miracleAvailableAtRank(item.miracle, rank, item.offering));
}

export interface KnownMiracleValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the starting selection against cult offerings, effective rank, and Devotion limit. */
export function validateKnownMiracles(
  knownIds: readonly string[], cult: TheistCult, rank: TheistRank, devotion: number,
  catalogue: readonly TheistMiracle[] = CORE_THEIST_MIRACLES,
): KnownMiracleValidation {
  const errors: string[] = [];
  const known = new Set(knownIds);
  if (known.size !== knownIds.length) errors.push("Known miracles must be unique.");
  if (knownIds.length > startingMiracleLimit(devotion)) errors.push("Known miracles exceed the starting limit for Devotion.");
  for (const id of known) {
    const offering = cult.miracles.find(item => item.miracleId === id);
    if (!offering) { errors.push(`Miracle ${id} is not offered by this cult.`); continue; }
    const entry = catalogue.find(item => item.id === id);
    if (!entry) { errors.push(`Miracle ${id} is not in the available catalogue.`); continue; }
    if (!miracleAvailableAtRank(entry, rank, offering)) errors.push(`${offering.name ?? entry.name} is not available at ${rank} rank.`);
  }
  return { valid: errors.length === 0, errors };
}

/** Ensure multiple cult pools, if acquired later, never store more than total POW. */
export function devotionalPoolsWithinPow(memberships: readonly Pick<TheistCultMembership, "devotionalPool">[], pow: number): boolean {
  return finiteNonnegative(pow) && memberships.every(item => finiteNonnegative(item.devotionalPool))
    && memberships.reduce((total, item) => total + item.devotionalPool, 0) <= pow;
}

export const emptyTheismState = (): TheismState => ({ customCults: [], memberships: [] });

function normalizeMiracleOffer(value: unknown): TheistCultMiracle | null {
  const source = asRecord(value);
  if (!source || typeof source.miracleId !== "string") return null;
  const minimumRank = THEIST_RANKS.includes(source.minimumRank as TheistRank) ? source.minimumRank as TheistRank : undefined;
  return { miracleId: source.miracleId, ...(typeof source.name === "string" ? { name: source.name } : {}), ...(minimumRank ? { minimumRank } : {}) };
}

function normalizeCult(value: unknown): TheistCult | null {
  const source = asRecord(value);
  if (!source || typeof source.id !== "string" || typeof source.name !== "string" || typeof source.deity !== "string") return null;
  const sourceType: TheismSource = source.source === "campaign" || source.source === "custom" ? source.source : "custom";
  const miracles = Array.isArray(source.miracles) ? source.miracles.map(normalizeMiracleOffer).filter((item): item is TheistCultMiracle => item !== null) : [];
  return { id: source.id, name: source.name, deity: source.deity, source: sourceType, ...(typeof source.description === "string" ? { description: source.description } : {}), miracles };
}

function normalizeMembership(value: unknown): TheistCultMembership | null {
  const source = asRecord(value);
  if (!source || typeof source.id !== "string" || typeof source.cultId !== "string" || !THEIST_RANKS.includes(source.rank as TheistRank)
      || typeof source.devotionSpecialisation !== "string" || !finiteNonnegative(source.devotionValue) || !finiteNonnegative(source.exhortValue) || !finiteNonnegative(source.devotionalPool)) return null;
  const knownMiracleIds = Array.isArray(source.knownMiracleIds) ? source.knownMiracleIds.filter((id): id is string => typeof id === "string") : [];
  return { id: source.id, cultId: source.cultId, rank: source.rank as TheistRank, devotionSpecialisation: source.devotionSpecialisation,
    devotionValue: source.devotionValue, exhortValue: source.exhortValue, devotionalPool: source.devotionalPool, knownMiracleIds };
}

/** Missing legacy Theism data stays empty; normalization never infers a membership from skills. */
export function normalizeTheismState(value: unknown): TheismState {
  const source = asRecord(value);
  if (!source) return emptyTheismState();
  return { customCults: Array.isArray(source.customCults) ? source.customCults.map(normalizeCult).filter((item): item is TheistCult => item !== null) : [],
    memberships: Array.isArray(source.memberships) ? source.memberships.map(normalizeMembership).filter((item): item is TheistCultMembership => item !== null) : [] };
}
