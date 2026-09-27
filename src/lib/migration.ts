type CultureSelections = { standard: string[][]; professional: string[]; combatStyle: string };
type SavedCharacter = { culture?: number; cultureSelections?: CultureSelections; alloc?: Record<string, unknown>; step?: number };

/** Upgrade character files saved before culture choices became explicit. */
export function migrateCharacter<T extends SavedCharacter>(saved: T): Omit<T, "cultureSelections"> & { cultureSelections: CultureSelections; cultureMigration?: boolean } {
  if (saved.cultureSelections) return saved as Omit<T, "cultureSelections"> & { cultureSelections: CultureSelections; cultureMigration?: boolean };

  // The previous picker order was Civilised, Barbarian, Nomad, Seafarer.
  // Seafarer has no current template, so keep those characters on the closest
  // travel-focused template and ask the player to review it.
  const culture = [1, 0, 2, 2][saved.culture ?? 0] ?? 0;
  const combatStyle = ["Citizen Militia", "Tribal Warrior", "Horse Archer", "Boarding Party"][saved.culture ?? 0] ?? "";
  return {
    ...saved,
    culture,
    cultureSelections: { standard: [], professional: [], combatStyle },
    alloc: { ...saved.alloc, culture: {} },
    step: 0,
    cultureMigration: true,
  };
}
