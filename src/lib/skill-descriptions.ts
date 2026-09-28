import { MAGIC, PROFESSIONAL, STANDARD } from "./rules";

/** Short player-facing summaries for the core skill catalogue. Specialisations inherit their base skill's text. */
export const SKILL_DESCRIPTIONS: Readonly<Record<string, string>> = {
  Athletics: "Run, jump, climb, throw, and perform other feats of physical agility.",
  Boating: "Handle and manoeuvre small watercraft, including rowing and sailing boats.",
  Brawn: "Use raw strength to lift, break, force, or resist physical pressure.",
  Conceal: "Hide objects or place them where they are unlikely to be noticed.",
  Customs: "Know the manners, taboos, and everyday practices of a community.",
  Dance: "Perform or recognise dances, from formal routines to improvised movement.",
  Deceit: "Lie convincingly, mislead others, or detect a deliberate falsehood.",
  Drive: "Control and manage a land vehicle or animal-drawn conveyance.",
  Endurance: "Withstand hardship, fatigue, pain, hunger, thirst, and illness.",
  Evade: "Dodge danger, avoid attacks, and escape immediate physical threats.",
  "First Aid": "Treat an injury quickly to stabilise the patient and aid recovery.",
  Influence: "Persuade, bargain with, or sway others through conversation.",
  Insight: "Read motives and emotions from a person's words and behaviour.",
  Locale: "Know the geography, people, and notable features of a familiar area.",
  "Native Tongue": "Speak and understand the language learned from childhood.",
  Perception: "Notice details, sounds, movement, and other clues in your surroundings.",
  Ride: "Control a mount and stay in the saddle in routine or difficult situations.",
  Sing: "Perform songs or recall and recognise melodies and lyrics.",
  Stealth: "Move quietly and remain unseen while travelling or hiding.",
  Swim: "Stay afloat and move through water, even in challenging conditions.",
  Unarmed: "Fight effectively with punches, kicks, grapples, and other bare-handed attacks.",
  Willpower: "Resist fear, coercion, temptation, and other attacks on your resolve.",
  Acrobatics: "Perform balance, tumbling, and gymnastic feats with control.",
  Acting: "Adopt a role and convincingly portray a person or emotion.",
  Art: "Create or assess works in a chosen artistic medium.",
  Bureaucracy: "Navigate official procedures, records, and administrative organisations.",
  Commerce: "Buy, sell, value goods, and judge the terms of a trade.",
  Courtesy: "Observe formal etiquette and make a good impression in polite society.",
  Craft: "Make, repair, or evaluate objects in a chosen trade or craft.",
  Culture: "Understand the customs, beliefs, and social expectations of another culture.",
  Disguise: "Change your appearance and manner to pass as someone else.",
  Engineering: "Design, build, or assess structures, machines, and large works.",
  Exhort: "Inspire, command, or strengthen others through forceful speech.",
  Gambling: "Play games of chance or skill and recognise likely cheating or odds.",
  Healing: "Diagnose illness and provide sustained medical care beyond first aid.",
  Language: "Speak, read, or understand a language other than your native tongue.",
  Literacy: "Read and write a language you know.",
  Lockpicking: "Open locks and defeat mechanical security without the key.",
  Lore: "Recall specialised knowledge about a chosen subject.",
  Mechanisms: "Understand, operate, repair, or disable mechanical devices and traps.",
  Musicianship: "Play, compose, or recognise music using a chosen instrument or style.",
  Navigation: "Plot and follow a route using maps, landmarks, or instruments.",
  Navigate: "Find a route across land or wilderness using landmarks and direction.",
  Oratory: "Address a group with a prepared or persuasive public speech.",
  Seamanship: "Work aboard a vessel and manage the practical demands of a ship at sea.",
  Seduction: "Create romantic or sexual interest through charm and personal appeal.",
  Sleight: "Use dexterous hand movements to palm, switch, or manipulate small objects.",
  Streetwise: "Find contacts, services, and information in urban underworlds.",
  Survival: "Find food, shelter, and safety in a hostile natural environment.",
  Teach: "Explain a subject and help another person learn it.",
  Track: "Follow a person or creature by interpreting signs they leave behind.",
  Binding: "Bind spirits or other entities into service according to a tradition.",
  Devotion: "Express religious commitment and call on a deity's favour.",
  "Folk Magic": "Practise minor practical magic through traditional charms and spells.",
  Invocation: "Call upon a grimoire or magical tradition to shape sorcerous effects.",
  Meditation: "Quiet and focus the mind through disciplined contemplation.",
  Mysticism: "Develop inner discipline and supernatural abilities through a mystical path.",
  Shaping: "Control the parameters and form of a sorcerous spell.",
  Trance: "Enter and maintain an altered state of consciousness for a purpose.",
  "Combat Style": "Fight with a learned combination of weapons, tactics, and techniques.",
};

export function skillDescription(name: string): string | undefined {
  const baseName = name.split(" (")[0].trim();
  return SKILL_DESCRIPTIONS[baseName];
}

/** Names in the core rule catalogue must always have an explicit description. */
export function describedCoreSkillNames(): string[] {
  return [...new Set([...STANDARD, ...PROFESSIONAL, ...MAGIC].map(([name]) => name))];
}
