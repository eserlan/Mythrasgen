import { describe, expect, test } from "bun:test";
import { careerSkillOptions, careers, selectCareerProfessional } from "./content";
import { PROFESSIONAL, STANDARD } from "./rules";
import { baseName } from "./calc";

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
    const professional = new Set(PROFESSIONAL.map(([name]) => name));
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
});
