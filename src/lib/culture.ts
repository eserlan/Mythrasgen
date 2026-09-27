import type { Culture } from "./content";

export function cultureSkills(culture: Culture, standard: string[][], professional: string[], combatStyle: string): string[] {
  return [...new Set([...culture.standard, ...standard.flat(), ...professional, ...(combatStyle ? [combatStyle] : [])])];
}

export function validateCultureAllocation(culture: Culture, selection: { standard: string[][]; professional: string[]; combatStyle: string }, allocation: Record<string, number>, pool = 100): string[] {
  const errors: string[] = [];
  if (culture.standardChoices.some((g, i) => selection.standard[i]?.length !== g.count ||
      new Set(selection.standard[i] ?? []).size !== g.count || (selection.standard[i] ?? []).some(x => !g.options.includes(x)))) {
    errors.push("Complete the culture's standard skill choices.");
  }
  if (selection.professional.length !== 3 || new Set(selection.professional).size !== 3 || selection.professional.some(x => !culture.professional.includes(x))) {
    errors.push("Select exactly three Professional Skills.");
  }
  const eligible = new Set(cultureSkills(culture, selection.standard, selection.professional, selection.combatStyle));
  if (Object.entries(allocation).some(([name, value]) => !eligible.has(name) || !Number.isInteger(value) || value < 5 || value > 15)) {
    errors.push("Each cultural skill allocation must be +5 to +15 and use an available skill.");
  }
  const spent = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  if (spent !== pool) errors.push(`Spend all ${pool} cultural points.`);
  return errors;
}
