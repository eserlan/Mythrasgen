import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("bonus skill controls", () => {
  test("the hobby skill input has an accessible name", () => {
    const skills = readFileSync(new URL("../src/components/Skills.svelte", import.meta.url), "utf8");
    expect(skills).toContain('aria-label="New professional hobby skill or combat style"');
  });
});

describe("specialised professional skill choices", () => {
  test("share the full unselected label and inline accessible specialisation input across Culture and Career", () => {
    const skills = readFileSync(new URL("../src/components/Skills.svelte", import.meta.url), "utf8");
    const choice = readFileSync(new URL("../src/components/ProfessionalSkillChoice.svelte", import.meta.url), "utf8");

    expect((skills.match(/<ProfessionalSkillChoice\b/g) ?? []).length).toBe(2);
    expect(choice).toContain("{selected && needsSpecialisation ? baseName : skill}");
    expect(choice).toContain("{#if selected && needsSpecialisation}");
    expect(choice).toContain('aria-label="{baseName} specialisation"');
    expect(choice).toContain('Art: "Painting"');
    expect(choice).toContain('Craft: "Blacksmithing"');
    expect(choice).toContain('Language: "Dwarven"');
    expect(choice).toContain('Lore: "Wilderness"');
  });
});
