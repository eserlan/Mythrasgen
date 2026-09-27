export function canVisitStep(step: number, canContinue: boolean, cultureComplete: boolean): boolean {
  return step <= 1 || (canContinue && (step <= 2 || cultureComplete));
}

export function isLandingView(home: boolean, showLibrary: boolean): boolean {
  return home && !showLibrary;
}
