import { CHAR_ROLL, STATS, type Chars, type Stat } from "./rules";

/** Characteristics may exchange values only when their assigned rolls use the same dice. */
export function canSwapCharacteristics(first: Stat, second: Stat, assignments: readonly number[] = STATS.map((_, i) => i)): boolean {
  const firstIndex = STATS.indexOf(first);
  const secondIndex = STATS.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex
      || assignments.length !== STATS.length
      || new Set(assignments).size !== STATS.length
      || assignments.some(index => !Number.isInteger(index) || index < 0 || index >= STATS.length)) return false;
  return CHAR_ROLL[STATS[assignments[firstIndex]]] === CHAR_ROLL[STATS[assignments[secondIndex]]];
}

/** Return an announcement only when rerolling cancels an active swap selection. */
export function swapCancellationAnnouncement(selectionActive: boolean): string {
  return selectionActive ? "Swap selection cancelled." : "";
}

/** Swap the rolled values currently assigned to two characteristics. */
export function swapAssignedValues(chars: Chars, assignments: number[], first: Stat, second: Stat): boolean {
  const firstIndex = STATS.indexOf(first);
  const secondIndex = STATS.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || !canSwapCharacteristics(first, second, assignments)
      || assignments.length !== STATS.length
      || new Set(assignments).size !== STATS.length
      || assignments.some(index => !Number.isInteger(index) || index < 0 || index >= STATS.length)) return false;

  const firstRoll = assignments[firstIndex];
  const secondRoll = assignments[secondIndex];
  const firstValue = chars[first];
  const secondValue = chars[second];
  [assignments[firstIndex], assignments[secondIndex]] = [secondRoll, firstRoll];
  chars[first] = secondValue;
  chars[second] = firstValue;
  return true;
}
