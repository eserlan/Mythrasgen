import { baseName } from "./calc";

/** Placeholder text in official skill lists that asks the player to name a specialisation. */
const SPECIALISATION_PROMPTS: Readonly<Record<string, string>> = {
  "any": "Specialisation",
  "primary": "Primary",
  "secondary": "Secondary",
  "primary catch": "Primary catch",
  "secondary catch": "Secondary catch",
  "specific alchemical speciality": "Specific alchemical speciality",
  "specific species": "Specific species",
  "specific physiological speciality": "Specific physiological speciality",
  "specific shipboard speciality": "Specific shipboard speciality",
  "regional or specific species": "Regional or specific species",
  "hunting related": "Hunting related",
  "pantheon, cult or god": "Pantheon, Cult or God",
  "cult, school or grimoire": "Cult, School or Grimoire",
  "cult, totem or tradition": "Cult, Totem or Tradition",
};

/** Familiar examples make the shared inline field more useful without UI skill-name checks. */
const SKILL_SPECIALISATION_PROMPTS: Readonly<Record<string, string>> = {
  Art: "Painting",
  Craft: "Blacksmithing",
  Language: "Dwarven",
  Lore: "Wilderness",
  Binding: "Cult, Totem or Tradition",
};

export type ProfessionalSkillMetadata = {
  name: string;
  requiresSpecialisation: boolean;
  specialisationPrompt?: string;
};

/** Resolve a source-list skill into the metadata used by every creation surface. */
export function professionalSkillMetadata(template: string): ProfessionalSkillMetadata {
  const name = baseName(template);
  const match = /\(([^()]*)\)\s*$/.exec(template.trim());
  const prompt = match && SPECIALISATION_PROMPTS[match[1].trim().toLocaleLowerCase()];
  if (!prompt) return { name, requiresSpecialisation: false };
  return {
    name,
    requiresSpecialisation: true,
    specialisationPrompt: SKILL_SPECIALISATION_PROMPTS[name] ?? prompt,
  };
}

export function requiresSpecialisation(template: string): boolean {
  return professionalSkillMetadata(template).requiresSpecialisation;
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
