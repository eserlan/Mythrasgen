export function canVisitStep(step: number, canContinue: boolean, cultureComplete: boolean): boolean {
  return step <= 1 || (canContinue && (step <= 2 || cultureComplete));
}
