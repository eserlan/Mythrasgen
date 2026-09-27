import { careers, cultures, type Career, type Culture } from "./content";
import { PER_SKILL_CAP, POOLS, STANDARD, type Kind } from "./rules";

export function characteristicsActionLabel(hasRolledSet: boolean): string {
  return hasRolledSet ? "REROLL CHARACTERISTICS" : "ROLL CHARACTERISTICS";
}

export function confirmCharacteristicsRoll(hasRolledSet: boolean, confirmReroll: () => boolean): boolean {
  return !hasRolledSet || confirmReroll();
}

/** Points allocated to one skill at one creation stage, bounded by both limits. */
export function allocationValue(value: number, pool: number, used: number, previous: number, cap = PER_SKILL_CAP): number {
  const room = pool - used + previous;
  return Math.max(0, Math.min(cap, room, Math.round(value) || 0));
}

export function skillsForStage(
  kind: Kind,
  culture: Culture,
  career: Career,
  extras: string[] = [],
  allocated: string[] = [],
  careerProfessional: string[] = career.professional,
): string[] {
  const core = STANDARD.map(([name]) => name);
  const cultureChoices = [...culture.standard, ...culture.standardChoices.flatMap(group => group.options), ...culture.professional];
  if (kind === "culture") return [...new Set(cultureChoices)];
  if (kind === "career") return [...new Set([...career.standard, ...(career.combatStyle ?? []), ...careerProfessional])];
  return [...new Set([...core, ...cultureChoices, ...(career.combatStyle ?? []), ...careerProfessional, ...extras, ...allocated])];
}

export function selectedCulture(index: number) { return cultures[index] ?? cultures[0]; }
export function selectedCareer(index: number) { return careers[index] ?? careers[0]; }
export const poolForStage = (kind: Kind) => POOLS[kind];
