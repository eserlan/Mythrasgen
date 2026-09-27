// Editable game content. Add your own cultures and careers here.
// Specialised skills are written "Lore (Anything)"; the base name must exist in rules.ts.
export type PassionPrompt = { type: "Loyalty" | "Love" | "Hate"; subject: string };
export interface Culture { name: string; combatStyle: string; standard: string[]; professional: string[]; passions: PassionPrompt[] }
export interface Career { name: string; standard: string[]; professional: string[] }

export const cultures: Culture[] = [
  { name: "Civilised", combatStyle: "Citizen Militia", passions: [
    { type: "Loyalty", subject: "Town/City" }, { type: "Love", subject: "friend, sibling or romantic lover" },
    { type: "Hate", subject: "rival, gang, district or city" },
  ],
    standard: ["Customs", "Influence", "Locale", "Native Tongue", "Perception", "Willpower"],
    professional: ["Bureaucracy", "Commerce", "Courtesy", "Streetwise"] },
  { name: "Barbarian", combatStyle: "Tribal Warrior", passions: [
    { type: "Loyalty", subject: "Clan Chieftain" }, { type: "Love", subject: "friend, sibling or romantic lover" },
    { type: "Hate", subject: "creature, rival or clan" },
  ],
    standard: ["Athletics", "Brawn", "Endurance", "Evade", "Native Tongue", "Stealth", "Swim"],
    professional: ["Survival", "Track", "Lore (Tribal Lore)"] },
  { name: "Nomad", combatStyle: "Horse Archer", passions: [
    { type: "Loyalty", subject: "Tribal Chieftain/Khan" }, { type: "Love", subject: "friend, sibling or romantic lover" },
    { type: "Hate", subject: "creature, rival or tribe" },
  ],
    standard: ["Athletics", "Endurance", "Native Tongue", "Perception", "Ride"],
    professional: ["Navigation", "Survival", "Track", "Craft (Leatherwork)"] },
  { name: "Seafarer", combatStyle: "Boarding Party", passions: [
    { type: "Loyalty", subject: "ship or crew" }, { type: "Love", subject: "friend, sibling or romantic lover" },
    { type: "Hate", subject: "rival crew or pirate" },
  ],
    standard: ["Athletics", "Boating", "Brawn", "Endurance", "Native Tongue", "Swim"],
    professional: ["Navigation", "Craft (Seamanship)", "Survival"] },
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
