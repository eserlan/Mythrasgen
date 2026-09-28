import { describe, expect, test } from "bun:test";
import { careerSkillOptions, careers, restoreCareerAllocation, restoreLegacyCareerIndex, selectCareerProfessional } from "./content";
import { MAGIC, PROFESSIONAL, STANDARD } from "./rules";
import { baseName } from "./calc";
import { describedCoreSkillNames, SKILL_DESCRIPTIONS, skillDescription } from "./skill-descriptions";

const coreCareerNames = [
  "Agent", "Alchemist", "Beast Handler", "Courtesan", "Courtier", "Crafter", "Entertainer", "Farmer",
  "Fisher", "Herder", "Hunter", "Merchant", "Miner", "Mystic", "Official", "Physician", "Priest", "Sailor",
  "Scholar", "Scout", "Shaman", "Sorcerer", "Thief", "Warrior",
];
const getCareer = name => {
  const found = careers.find(career => career.name === name);
  if (!found) throw new Error(`Missing career template: ${name}`);
  return found;
};

describe("core careers", () => {
  test("contains each official workbook career exactly once", () => {
    expect(careers.map(career => career.name)).toEqual(coreCareerNames);
  });

  test("all career templates have unique, defined skill entries", () => {
    const standard = new Set(STANDARD.map(([name]) => name));
    const professional = new Set([...PROFESSIONAL, ...MAGIC].map(([name]) => name));
    for (const career of careers) {
      expect(career.standard.length).toBeGreaterThan(0);
      expect(career.professional.length).toBeGreaterThanOrEqual(3);
      expect(new Set(career.standard).size).toBe(career.standard.length);
      expect(new Set(career.professional).size).toBe(career.professional.length);
      for (const name of career.standard) expect(standard.has(baseName(name))).toBe(true);
      for (const name of career.professional) expect(professional.has(baseName(name))).toBe(true);
      for (const name of career.combatStyle ?? []) expect(name).toStartWith("Combat Style (");
    }
  });

  test("career allocation includes standards and styles plus selected Professional Skills only", () => {
    const warrior = getCareer("Warrior");
    const selected = [warrior.professional[0], warrior.professional[1]];
    expect(careerSkillOptions(warrior, selected)).toEqual([...warrior.standard, ...(warrior.combatStyle ?? []), ...selected]);
    expect(careerSkillOptions(warrior, selected)).not.toContain(warrior.professional[2]);
  });

  test("allows up to three Professional Skills and preserves exact specialisations", () => {
    const agent = getCareer("Agent");
    const firstThree = agent.professional.slice(0, 3);
    expect(selectCareerProfessional(agent, [], firstThree[0])).toEqual([firstThree[0]]);
    expect(selectCareerProfessional(agent, firstThree.slice(0, 2), firstThree[2])).toEqual(firstThree);
    expect(selectCareerProfessional(agent, firstThree, agent.professional[3])).toEqual(firstThree);
    const scholar = getCareer("Scholar");
    const lore = scholar.professional.find(skill => skill === "Lore (Primary)");
    expect(selectCareerProfessional(scholar, [], lore)).toEqual(["Lore (Primary)"]);
  });

  test("restores legacy allocations as picks and releases allocations outside the three-skill limit", () => {
    const merchant = getCareer("Merchant");
    const [first, second, third, fourth] = merchant.professional;
    const restored = restoreCareerAllocation(merchant, undefined, {
      [first]: 10, [second]: 5, [third]: 3, [fourth]: 2,
      [merchant.standard[0]]: 7,
    });
    expect(restored.professional).toEqual([first, second, third]);
    expect(restored.allocation).toEqual({
      [first]: 10, [second]: 5, [third]: 3, [merchant.standard[0]]: 7,
    });
  });

  test("restores legacy career indices after the career list was reordered", () => {
    expect(careers[restoreLegacyCareerIndex(0)].name).toBe("Warrior");
    expect(careers[restoreLegacyCareerIndex(1)].name).toBe("Merchant");
    expect(careers[restoreLegacyCareerIndex(2)].name).toBe("Scholar");
    expect(careers[restoreLegacyCareerIndex(3)].name).toBe("Thief");
    expect(careers[restoreLegacyCareerIndex(4)].name).toBe("Physician");
    expect(careers[restoreLegacyCareerIndex(5)].name).toBe("Hunter");
  });
});

describe("skill descriptions", () => {
  test("every Standard, Professional, and Magic skill has a concise description", () => {
    expect(describedCoreSkillNames().every(name => typeof SKILL_DESCRIPTIONS[name] === "string" && SKILL_DESCRIPTIONS[name].length > 0)).toBe(true);
    expect(Object.values(SKILL_DESCRIPTIONS).every(description => description.split(/[.!?]+/).filter(Boolean).length <= 2)).toBe(true);
  });

  test("specialised variants inherit their base skill description", () => {
    expect(skillDescription("Lore (Astronomy)")).toBe(skillDescription("Lore"));
    expect(skillDescription("Craft (Alchemy)")).toBe(skillDescription("Craft"));
    expect(skillDescription("Language (any)")).toBe(skillDescription("Language"));
    expect(skillDescription("Combat Style (Cultural Style)")).toBe(skillDescription("Combat Style"));
  });
});
