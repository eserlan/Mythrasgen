import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { professionalSkillMetadata } from "../src/lib/specialisations";

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
    expect(choice).toContain("const displayName = $derived(selected && needsSpecialisation ? baseName : skill)");
    expect(choice).toContain("<span>{displayName}</span></label>");
    expect(choice).toContain("{#if selected && needsSpecialisation}");
    expect(choice).toContain('aria-label="{baseName} specialisation"');
    expect(choice).toContain("professionalSkillMetadata(skill)");
    expect(professionalSkillMetadata("Art (any)").specialisationPrompt).toBe("Painting");
    expect(professionalSkillMetadata("Craft (any)").specialisationPrompt).toBe("Blacksmithing");
    expect(professionalSkillMetadata("Language (any)").specialisationPrompt).toBe("Dwarven");
    expect(professionalSkillMetadata("Lore (any)").specialisationPrompt).toBe("Wilderness");
    expect(professionalSkillMetadata("Devotion (Pantheon, Cult or God)").specialisationPrompt).toBe("Pantheon, Cult or God");
    expect(professionalSkillMetadata("Invocation (Cult, School or Grimoire)").specialisationPrompt).toBe("Cult, School or Grimoire");
    expect(professionalSkillMetadata("Binding (Cult, Totem or Tradition)").specialisationPrompt).toBe("Cult, Totem or Tradition");
    expect(choice).toContain('<SkillInfo name={displayName} showName={false} />');
    expect(choice).toContain("{#if selected && needsSpecialisation}");
    expect(choice).toContain("oninput={e => onspecialisation(e.currentTarget.value)}");
  });
});
