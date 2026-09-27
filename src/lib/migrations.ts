/** Keep legacy saves on the same logical screen after Background was inserted before Sheet. */
export function migrateCharacterStep(step: number, hasBackground: boolean): number {
  return !hasBackground && step === 5 ? 6 : step;
}
