// Core mechanics: characteristics, skill formulas, creation pools.
// Formulas use characteristic keys; "x2" = doubled. Adjust here if your edition differs.
window.RULES = {
  chars: ["STR", "CON", "SIZ", "DEX", "INT", "POW", "CHA"],
  charRoll: { STR: "3d6", CON: "3d6", SIZ: "2d6+6", DEX: "3d6", INT: "2d6+6", POW: "3d6", CHA: "3d6" },
  pointBuy: 80, pointBuyMin: 3, pointBuyMax: 18,
  pools: { culture: 100, career: 100, bonus: 150 },
  perSkillCap: 15, // max points added to one skill in each step
  // [name, formula] where formula is array of terms: "STR", ["INT", 2], or a number
  standard: [
    ["Athletics", ["STR", "DEX"]], ["Boating", ["STR", "CON"]], ["Brawn", ["STR", "SIZ"]],
    ["Conceal", ["DEX", "POW"]], ["Customs", [["INT", 2], 40]], ["Dance", ["DEX", "CHA"]],
    ["Deceit", ["INT", "CHA"]], ["Drive", ["DEX", "POW"]], ["Endurance", [["CON", 2]]],
    ["Evade", [["DEX", 2]]], ["First Aid", ["INT", "DEX"]], ["Influence", [["CHA", 2]]],
    ["Insight", ["INT", "POW"]], ["Locale", [["INT", 2]]], ["Native Tongue", ["INT", "CHA", 40]],
    ["Perception", ["INT", "POW"]], ["Ride", ["DEX", "POW"]], ["Sing", ["CHA", "POW"]],
    ["Stealth", ["DEX", "INT"]], ["Swim", ["STR", "CON"]], ["Unarmed", ["STR", "DEX"]],
    ["Willpower", [["POW", 2]]],
  ],
  professional: [
    ["Acrobatics", ["STR", "DEX"]], ["Acting", ["CHA", "INT"]], ["Bureaucracy", [["INT", 2]]],
    ["Commerce", ["INT", "CHA"]], ["Courtesy", ["INT", "CHA"]], ["Craft", ["INT", "DEX"]],
    ["Disguise", ["INT", "CHA"]], ["Engineering", [["INT", 2]]], ["Gambling", ["INT", "POW"]],
    ["Healing", ["INT", "POW"]], ["Language", ["INT", "CHA"]], ["Lore", [["INT", 2]]],
    ["Mechanisms", ["DEX", "INT"]], ["Musicianship", ["DEX", "CHA"]], ["Navigation", ["INT", "POW"]],
    ["Oratory", ["POW", "CHA"]], ["Seduction", ["INT", "CHA"]], ["Sleight", ["DEX", "CHA"]],
    ["Streetwise", ["POW", "CHA"]], ["Survival", ["CON", "POW"]], ["Teach", ["INT", "CHA"]],
    ["Track", ["INT", "CON"]],
  ],
  combatStyleFormula: ["STR", "DEX"],
  // Skills that need a specialisation, e.g. "Lore (Astronomy)"
  specialised: ["Craft", "Language", "Lore", "Musicianship"],
};
