// Editable game content. Add your own cultures and careers here.
// Specialised skills are written "Lore (Anything)"; the base name must exist in rules.ts.
export type CultureKind = "Civilised" | "Barbarian" | "Nomadic" | "Primitive";
export interface Culture { name: string; kind: CultureKind | null; combatStyle: string; standard: string[]; professional: string[] }
export interface Career { name: string; standard: string[]; professional: string[] }

export const cultures: Culture[] = [
  { name: "Civilised", kind: "Civilised", combatStyle: "Citizen Militia",
    standard: ["Customs", "Influence", "Locale", "Native Tongue", "Perception", "Willpower"],
    professional: ["Bureaucracy", "Commerce", "Courtesy", "Streetwise"] },
  { name: "Barbarian", kind: "Barbarian", combatStyle: "Tribal Warrior",
    standard: ["Athletics", "Brawn", "Endurance", "Evade", "Native Tongue", "Stealth", "Swim"],
    professional: ["Survival", "Track", "Lore (Tribal Lore)"] },
  { name: "Nomad", kind: "Nomadic", combatStyle: "Horse Archer",
    standard: ["Athletics", "Endurance", "Native Tongue", "Perception", "Ride"],
    professional: ["Navigation", "Survival", "Track", "Craft (Leatherwork)"] },
  // This custom culture needs its campaign's money and social-class tables selected.
  { name: "Seafarer", kind: null, combatStyle: "Boarding Party",
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
