import { deriveStats } from "./calc";
import type { Kind } from "./rules";
import type { SheetSource } from "./sheet-data";
import { base, career, char, combatStyleSummary, culture, learnedSkills, nativeTongue, socialClassReady, startingMoney, total } from "./store.svelte";

/** Read-only snapshot of the selected character for the printable sheet; it never writes to the store. */
export function currentSheetSource(): SheetSource {
  const allocated = (Object.keys(char.alloc) as Kind[]).flatMap(kind => Object.keys(char.alloc[kind]).filter(name => char.alloc[kind][name] > 0));
  // Saves can hold skill names the rules no longer resolve; leave those off the sheet rather than fail the print.
  const skills = [...new Set([...learnedSkills(), ...allocated])].filter(name => { try { total(name); return true; } catch { return false; } });
  const { stats, loc } = deriveStats(char.chars);
  return {
    char, cultureName: culture().name, careerName: career().name, loc, stats, total, base, skills, nativeTongue: nativeTongue(),
    styles: combatStyleSummary(), socialClassReady: socialClassReady(), startingMoney: startingMoney(),
  };
}
