// Editable game content. Culture skill options follow the Mythras core culture summary.
// Specialised skills are written "Lore (Anything)"; the base name must exist in rules.ts.
export interface ChoiceGroup { label: string; count: number; options: string[] }
export type CultureKind = "Civilised" | "Barbarian" | "Nomadic" | "Primitive";
export interface Culture {
  name: string;
  kind: CultureKind;
  standard: string[];
  standardChoices: ChoiceGroup[];
  professional: string[];
  passions: string[];
}
export interface Career { name: string; standard: string[]; professional: string[] }

export const cultures: Culture[] = [
  { name: "Barbarian", kind: "Barbarian",
    standard: ["Athletics", "Brawn", "Endurance", "First Aid", "Locale", "Perception"],
    standardChoices: [{ label: "Choose one", count: 1, options: ["Boating", "Ride"] }],
    professional: ["Craft (any)", "Healing", "Lore (any)", "Musicianship", "Navigate", "Seamanship", "Survival", "Track"],
    passions: ["Loyalty to Clan Chieftain", "Love (friend, sibling or romantic lover)", "Hate (creature, rival or clan)"] },
  { name: "Civilised", kind: "Civilised",
    standard: ["Conceal", "Deceit", "Drive", "Influence", "Insight", "Locale", "Willpower"],
    standardChoices: [],
    professional: ["Art (any)", "Commerce", "Craft (any)", "Courtesy", "Language (any)", "Lore (any)", "Musicianship", "Streetwise"],
    passions: ["Loyalty to Town/City", "Love (friend, sibling or romantic lover)", "Hate (rival, gang, district or city)"] },
  { name: "Nomadic", kind: "Nomadic",
    standard: ["Endurance", "First Aid", "Locale", "Perception", "Stealth"],
    standardChoices: [{ label: "Choose two based on your primary mode of travel", count: 2, options: ["Athletics", "Boating", "Swim", "Drive", "Ride"] }],
    professional: ["Craft (any)", "Culture (any)", "Language (any)", "Lore (any)", "Musicianship", "Navigate", "Survival", "Track"],
    passions: ["Loyalty to Tribal Chieftain/Khan", "Love (friend, sibling or romantic lover)", "Hate (creature, rival or tribe)"] },
  { name: "Primitive", kind: "Primitive",
    standard: ["Brawn", "Endurance", "Evade", "Locale", "Perception", "Stealth"],
    standardChoices: [{ label: "Choose one", count: 1, options: ["Athletics", "Boating", "Swim"] }],
    professional: ["Craft (any)", "Healing", "Lore (any)", "Musicianship", "Navigate", "Survival", "Track"],
    passions: ["Loyalty to Chief/Headman", "Love (friend, sibling or romantic lover)", "Hate (something that scares or intimidates you)"] },
];

export const careers: Career[] = [
  { name: "Warrior", professional: ["Lore (Tactics)", "Survival", "Streetwise"],
    standard: ["Athletics", "Brawn", "Endurance", "Evade", "Unarmed"] },
  { name: "Merchant", professional: ["Commerce", "Courtesy", "Language (Trade)", "Navigation"],
    standard: ["Influence", "Insight", "Deceit", "Perception"] },
  { name: "Scholar", professional: ["Lore (Any)", "Teach", "Language (Ancient)", "Engineering"],
    standard: ["Insight", "Perception", "Willpower"] },
  { name: "Thief", professional: ["Mechanisms", "Sleight", "Streetwise", "Acrobatics"],
    standard: ["Conceal", "Stealth", "Evade", "Deceit", "Perception"] },
  { name: "Healer", professional: ["Healing", "Lore (Herbs)", "Teach"],
    standard: ["First Aid", "Insight", "Perception", "Willpower"] },
  { name: "Hunter", professional: ["Survival", "Track", "Craft (Bowyer)"],
    standard: ["Athletics", "Endurance", "Perception", "Stealth"] },
];
