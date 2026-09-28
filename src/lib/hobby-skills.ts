import { careers, cultures } from "./content";
import { baseName } from "./calc";
import { PROFESSIONAL_SKILL_NAMES } from "./rules";
import { hasMeaningfulSpecialisation, requiresSpecialisation } from "./specialisations";

// Keep familiar career and culture specialisation templates available while also
// allowing any registered Professional Skill from the core catalogue.
const templates = [...new Set([
  ...PROFESSIONAL_SKILL_NAMES,
  ...cultures.flatMap(culture => culture.professional),
  ...careers.flatMap(career => career.professional),
])].filter(name => !/^Combat Style(?:\s|$)/.test(name));
const specialisedBases = new Set(templates.filter(requiresSpecialisation).map(baseName));

export const HOBBY_PROFESSIONAL_SKILLS = templates.filter(name =>
  requiresSpecialisation(name) || !specialisedBases.has(name));

export type HobbySkill =
  | { type: "professionalSkill"; template: string; specialisation: string; name: string }
  | { type: "combatStyle"; name: string };

export function hobbySkillName(hobby: HobbySkill | null): string {
  return hobby?.name ?? "";
}

/** Reconcile saves written before hobby choices were stored as one typed value. */
export function restoreHobbySkill(value: unknown, knownCombatStyles: readonly string[] = []): HobbySkill | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Partial<HobbySkill>;
    if (candidate.type === "combatStyle" && typeof candidate.name === "string" && candidate.name.trim()) {
      return { type: "combatStyle", name: candidate.name.trim() };
    }
    if (candidate.type === "professionalSkill" && typeof candidate.template === "string"
        && HOBBY_PROFESSIONAL_SKILLS.includes(candidate.template)) {
      const specialisation = typeof candidate.specialisation === "string" ? candidate.specialisation.trim() : "";
      if (requiresSpecialisation(candidate.template) && !hasMeaningfulSpecialisation(specialisation)) return null;
      const name = requiresSpecialisation(candidate.template)
        ? `${baseName(candidate.template)} (${specialisation})`
        : candidate.template;
      return { type: "professionalSkill", template: candidate.template, specialisation, name };
    }
    return null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const name = value.trim();
  if (knownCombatStyles.includes(name)) return { type: "combatStyle", name };
  if (/^Combat Style \(.+\)$/.test(name) || name === "Combat Style") return { type: "combatStyle", name };
  // Legacy saves contain the resolved name only. Preserve concrete specialisations
  // and plain registered skills, while dropping unresolved generic placeholders.
  const template = HOBBY_PROFESSIONAL_SKILLS.find(option => option === name);
  if (template) return requiresSpecialisation(template) ? null : { type: "professionalSkill", template, specialisation: "", name };
  const base = baseName(name);
  const specialisedTemplate = HOBBY_PROFESSIONAL_SKILLS.find(option => requiresSpecialisation(option) && baseName(option) === base);
  if (specialisedTemplate && name.startsWith(`${base} (`) && !/\((?:any|primary|secondary)\)$/i.test(name)) {
    return { type: "professionalSkill", template: specialisedTemplate, specialisation: name.slice(base.length + 2, -1), name };
  }
  return null;
}
