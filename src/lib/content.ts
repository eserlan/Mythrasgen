// Editable game content. Add your own cultures and careers here.
// Specialised skills are written "Lore (Anything)"; the base name must exist in rules.ts.
export interface Culture { name: string; combatStyle: string; standard: string[]; professional: string[] }
export interface Career { name: string; standard: string[]; professional: string[]; combatStyle?: string[] }

export const cultures: Culture[] = [
  { name: "Civilised", combatStyle: "Citizen Militia",
    standard: ["Customs", "Influence", "Locale", "Native Tongue", "Perception", "Willpower"],
    professional: ["Bureaucracy", "Commerce", "Courtesy", "Streetwise"] },
  { name: "Barbarian", combatStyle: "Tribal Warrior",
    standard: ["Athletics", "Brawn", "Endurance", "Evade", "Native Tongue", "Stealth", "Swim"],
    professional: ["Survival", "Track", "Lore (Tribal Lore)"] },
  { name: "Nomad", combatStyle: "Horse Archer",
    standard: ["Athletics", "Endurance", "Native Tongue", "Perception", "Ride"],
    professional: ["Navigation", "Survival", "Track", "Craft (Leatherwork)"] },
  { name: "Seafarer", combatStyle: "Boarding Party",
    standard: ["Athletics", "Boating", "Brawn", "Endurance", "Native Tongue", "Swim"],
    professional: ["Navigation", "Craft (Seamanship)", "Survival"] },
];

// Core Mythras careers, transcribed from the official Character Creation Workbook.
// Parenthetical text retains the career's specialisation or combat style choice.
export const careers: Career[] = [
  { name: "Agent", standard: ["Conceal", "Deceit", "Evade", "Insight", "Perception", "Stealth"],
    professional: ["Culture (any)", "Disguise", "Language (any)", "Sleight", "Streetwise", "Survival", "Track"], combatStyle: ["Combat Style (Concealable Weapons Style)"] },
  { name: "Alchemist", standard: ["Customs", "Endurance", "First Aid", "Insight", "Locale", "Perception", "Willpower"],
    professional: ["Commerce", "Craft (Alchemy)", "Healing", "Language (any)", "Literacy", "Lore (Specific Alchemical Speciality)", "Streetwise"] },
  { name: "Beast Handler", standard: ["Drive", "Endurance", "First Aid", "Influence", "Locale", "Ride", "Willpower"],
    professional: ["Commerce", "Craft (Animal Husbandry)", "Healing (Specific Species)", "Lore (Specific Species)", "Survival", "Teach (Specific Species)", "Track"] },
  { name: "Courtesan", standard: ["Customs", "Dance", "Deceit", "Influence", "Insight", "Perception", "Sing"],
    professional: ["Art (any)", "Courtesy", "Culture (any)", "Gambling", "Language (any)", "Musicianship", "Seduction"] },
  { name: "Courtier", standard: ["Customs", "Dance", "Deceit", "Influence", "Insight", "Locale", "Perception"],
    professional: ["Art (any)", "Bureaucracy", "Courtesy", "Culture (any)", "Language (any)", "Lore (any)", "Oratory"] },
  { name: "Crafter", standard: ["Brawn", "Drive", "Influence", "Insight", "Locale", "Perception", "Willpower"],
    professional: ["Art (any)", "Commerce", "Craft (Primary)", "Craft (Secondary)", "Engineering", "Mechanisms", "Streetwise"] },
  { name: "Entertainer", standard: ["Athletics", "Brawn", "Dance", "Deceit", "Influence", "Insight", "Sing"],
    professional: ["Acrobatics", "Acting", "Oratory", "Musicianship", "Seduction", "Sleight", "Streetwise"] },
  { name: "Farmer", standard: ["Athletics", "Brawn", "Drive", "Endurance", "Locale", "Perception", "Ride"],
    professional: ["Commerce", "Craft (any)", "Lore (Agriculture)", "Lore (Animal Husbandry)", "Navigation", "Survival", "Track"] },
  { name: "Fisher", standard: ["Athletics", "Boating", "Endurance", "Locale", "Perception", "Stealth", "Swim"],
    professional: ["Commerce", "Craft (Any)", "Lore (Primary Catch)", "Lore (Secondary Catch)", "Navigation", "Seamanship", "Survival"] },
  { name: "Herder", standard: ["Endurance", "First Aid", "Insight", "Locale", "Perception", "Ride"],
    professional: ["Commerce", "Craft (Animal Husbandry)", "Healing (Specific Species)", "Navigation", "Musicianship", "Survival", "Track"], combatStyle: ["Combat Style (Specific Herding or Cultural Style)"] },
  { name: "Hunter", standard: ["Athletics", "Endurance", "Locale", "Perception", "Ride", "Stealth"],
    professional: ["Commerce", "Craft (Hunting Related)", "Lore (Regional or Specific Species)", "Mechanisms", "Navigation", "Survival", "Track"], combatStyle: ["Combat Style (Specific Hunting or Cultural Style)"] },
  { name: "Merchant", standard: ["Boating", "Drive", "Deceit", "Insight", "Influence", "Locale", "Ride"],
    professional: ["Commerce", "Courtesy", "Culture (any)", "Language (any)", "Navigation", "Seamanship", "Streetwise"] },
  { name: "Miner", standard: ["Athletics", "Brawn", "Endurance", "Locale", "Perception", "Sing", "Willpower"],
    professional: ["Commerce", "Craft (Mining)", "Engineering", "Lore (Minerals)", "Mechanisms", "Navigation (Underground)", "Survival"] },
  { name: "Mystic", standard: ["Athletics", "Endurance", "Evade", "Insight", "Perception", "Willpower"],
    professional: ["Art (any)", "Folk Magic", "Literacy", "Lore (any)", "Meditation", "Musicianship", "Mysticism"], combatStyle: ["Combat Style (Cultural Style)"] },
  { name: "Official", standard: ["Customs", "Deceit", "Influence", "Insight", "Locale", "Perception", "Willpower"],
    professional: ["Bureaucracy", "Commerce", "Courtesy", "Language (any)", "Literacy", "Lore (any)", "Oratory"] },
  { name: "Physician", standard: ["Dance", "First Aid", "Influence", "Insight", "Locale", "Sing", "Willpower"],
    professional: ["Commerce", "Craft (Specific Physiological Speciality)", "Healing", "Language (any)", "Literacy", "Lore (Specific Alchemical Speciality)", "Streetwise"] },
  { name: "Priest", standard: ["Customs", "Dance", "Deceit", "Influence", "Insight", "Locale", "Willpower"],
    professional: ["Bureaucracy", "Devotion (Pantheon, Cult or God)", "Exhort", "Folk Magic", "Literacy", "Lore (any)", "Oratory"] },
  { name: "Sailor", standard: ["Athletics", "Boating", "Brawn", "Endurance", "Locale", "Swim"],
    professional: ["Craft (Specific Shipboard Speciality)", "Culture (any)", "Language (any)", "Lore (any)", "Navigation", "Seamanship", "Survival"], combatStyle: ["Combat Style (Specific Shipboard or Cultural Style)"] },
  { name: "Scholar", standard: ["Customs", "Influence", "Insight", "Locale", "Native Tongue", "Perception", "Willpower"],
    professional: ["Culture (any)", "Language (any)", "Literacy", "Lore (Primary)", "Lore (Secondary)", "Oratory", "Teach"] },
  { name: "Scout", standard: ["Athletics", "Endurance", "First Aid", "Perception", "Stealth", "Swim"],
    professional: ["Culture (any)", "Healing", "Language (any)", "Lore (any)", "Navigation", "Survival", "Track"], combatStyle: ["Combat Style (Specific Hunting or Cultural Style)"] },
  { name: "Shaman", standard: ["Customs", "Dance", "Deceit", "Influence", "Insight", "Locale", "Willpower"],
    professional: ["Binding (Cult, Totem or Tradition)", "Folk Magic", "Healing", "Lore (any)", "Oratory", "Sleight", "Trance"] },
  { name: "Sorcerer", standard: ["Customs", "Deceit", "Influence", "Insight", "Locale", "Perception", "Willpower"],
    professional: ["Folk Magic", "Invocation (Cult, School or Grimoire)", "Language (any)", "Literacy", "Lore (any)", "Shaping", "Sleight"] },
  { name: "Thief", standard: ["Athletics", "Deceit", "Evade", "Insight", "Perception", "Stealth"],
    professional: ["Acting", "Commerce", "Disguise", "Lockpicking", "Mechanisms", "Sleight", "Streetwise"], combatStyle: ["Combat Style (Concealable Weapons Style)"] },
  { name: "Warrior", standard: ["Athletics", "Brawn", "Endurance", "Evade", "Unarmed"],
    professional: ["Craft (any)", "Engineering", "Gambling", "Lore (Military History)", "Lore (Strategy and Tactics)", "Oratory", "Survival"], combatStyle: ["Combat Style (Cultural Style)", "Combat Style (Speciality Style)"] },
];

/** Standard skills, career styles and up to three selected Professional Skills are eligible for career points. */
export function careerSkillOptions(career: Career, selectedProfessional: string[]): string[] {
  return [...new Set([...career.standard, ...(career.combatStyle ?? []), ...selectedProfessional])];
}

export function selectCareerProfessional(career: Career, selected: string[], name: string): string[] {
  if (!career.professional.includes(name)) return selected;
  if (selected.includes(name)) return selected.filter(skill => skill !== name);
  return selected.length < 3 ? [...selected, name] : selected;
}

/** Career indices used by saves before the core career list was introduced. */
export function restoreLegacyCareerIndex(index: number): number {
  const legacyNames = ["Warrior", "Merchant", "Scholar", "Thief", "Healer", "Hunter"];
  const legacyName = legacyNames[index];
  const currentName = legacyName === "Healer" ? "Physician" : legacyName;
  const restoredIndex = careers.findIndex(career => career.name === currentName);
  return restoredIndex < 0 ? 0 : restoredIndex;
}

/** Restore saved career picks and discard allocations that the current career cannot use. */
export function restoreCareerAllocation(
  career: Career,
  selected: string[] | undefined,
  allocation: Record<string, number>,
): { professional: string[]; allocation: Record<string, number> } {
  const picks = Array.isArray(selected)
    ? selected.filter(name => career.professional.includes(name))
    : Object.keys(allocation).filter(name => career.professional.includes(name));
  const professional = [...new Set(picks)].slice(0, 3);
  const eligible = new Set(careerSkillOptions(career, professional));
  return {
    professional,
    allocation: Object.fromEntries(Object.entries(allocation).filter(([name]) => eligible.has(name))),
  };
}
