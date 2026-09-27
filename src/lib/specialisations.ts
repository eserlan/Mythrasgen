import { baseName } from "./calc";

/** Parenthetical values in official Culture/Career data that ask the player to name a specialisation. */
export const SPECIALISATION_TEMPLATES = new Set([
  "any", "primary", "secondary", "primary catch", "secondary catch",
  "specific alchemical speciality", "specific species", "specific physiological speciality",
  "specific shipboard speciality", "regional or specific species", "hunting related",
]);

export function requiresSpecialisation(template: string): boolean {
  const match = /\(([^()]*)\)\s*$/.exec(template.trim());
  return !!match && SPECIALISATION_TEMPLATES.has(match[1].trim().toLocaleLowerCase());
}

export function concreteSkillName(template: string, specialisation: string): string {
  const value = specialisation.trim();
  return `${baseName(template)} (${value})`;
}

export function hasMeaningfulSpecialisation(value: string | undefined): boolean {
  const text = value?.trim();
  return !!text && /[\p{L}\p{N}]/u.test(text) && text.toLocaleLowerCase() !== "any";
}

export function resolveSkillTemplate(template: string, specialisation: string | undefined): string | null {
  if (!requiresSpecialisation(template)) return template;
  return hasMeaningfulSpecialisation(specialisation) ? concreteSkillName(template, specialisation!.trim()) : null;
}

export function specialisationStageErrors(
  templates: readonly string[], values: Readonly<Record<string, string>>,
): string[] {
  const missing = templates.filter(template => requiresSpecialisation(template) && !hasMeaningfulSpecialisation(values[template]));
  return missing.length ? [`Enter a specialisation for each selected skill: ${missing.map(baseName).join(", ")}.`] : [];
}
