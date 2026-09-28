import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("bonus skill controls", () => {
  test("offers one optional Hobby Skill branch and removes free-text custom skills", () => {
    const skills = readFileSync(new URL("../src/components/Skills.svelte", import.meta.url), "utf8");
    expect(skills).toContain("Optional Hobby Skill");
    expect(skills).toContain("Professional Skill</label>");
    expect(skills).toContain("Combat Style</label>");
    expect(skills).toContain("HOBBY_PROFESSIONAL_SKILLS");
    expect(skills).not.toContain("Add custom skill");
    expect(skills).not.toContain("Add a custom skill");
    expect(skills).toContain('idPrefix="bonus-hobby-combat-style"');
  });
});

describe("specialised professional skill choices", () => {
  test("share the full unselected label and inline accessible specialisation input across Culture and Career", () => {
    const skills = readFileSync(new URL("../src/components/Skills.svelte", import.meta.url), "utf8");
    const choice = readFileSync(new URL("../src/components/ProfessionalSkillChoice.svelte", import.meta.url), "utf8");

    expect((skills.match(/<ProfessionalSkillChoice\b/g) ?? []).length).toBe(3);
    expect(choice).toContain("{selected && needsSpecialisation ? baseName : skill}");
    expect(choice).toContain("{#if selected && needsSpecialisation}");
    expect(choice).toContain('aria-label="{baseName} specialisation"');
    expect(choice).toContain('Art: "Painting"');
    expect(choice).toContain('Craft: "Blacksmithing"');
    expect(choice).toContain('Language: "Dwarven"');
    expect(choice).toContain('Lore: "Wilderness"');
  });
});
