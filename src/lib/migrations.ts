import type { CultureKind } from "./content";

/** Keep legacy saves on the same logical screen after Background was inserted before Sheet. */
export function migrateCharacterStep(step: number, hasBackground: boolean): number {
  return !hasBackground && step === 5 ? 6 : step;
}

/** Infer the new table selections from a saved culture while preserving explicit custom choices. */
export function migrateCultureTables(
  cultureKind: CultureKind | null | undefined,
  socialTable?: CultureKind,
  moneyTable?: CultureKind,
): { socialTable: CultureKind; moneyTable: CultureKind } {
  const fallback = cultureKind ?? "Civilised";
  return { socialTable: socialTable ?? fallback, moneyTable: moneyTable ?? fallback };
}
