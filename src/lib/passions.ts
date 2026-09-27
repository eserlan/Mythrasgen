import type { PassionCategory } from "./rules";

type PassionPromptEntry = {
  type: "Loyalty" | "Love" | "Hate";
  subject: string;
  category: PassionCategory;
  subjectPow?: number;
  subjectCha?: number;
};

export function culturePassions(prompts: string[]): PassionPromptEntry[] {
  return prompts.map(prompt => {
    const type = prompt.startsWith("Loyalty") ? "Loyalty" : prompt.startsWith("Hate") ? "Hate" : "Love";
    const subject = prompt.replace(/^Loyalty to\s*/i, "").replace(/^(?:Love|Hate)\s*\(/, "").replace(/\)$/, "");
    return {
      type, subject,
      category: type === "Loyalty" ? "organisation/group" : type === "Hate" ? "adverse" : "platonic",
      subjectPow: undefined, subjectCha: undefined,
    };
  });
}

/** Replace generated passion rows after a culture change, preserving any user edits. */
export function updateCulturePassions(
  current: PassionPromptEntry[], previousPrompts: string[], nextPrompts: string[],
): PassionPromptEntry[] | null {
  const generated = culturePassions(previousPrompts);
  const untouched = current.length === generated.length && current.every((passion, index) => {
    const seed = generated[index];
    return passion.type === seed.type && passion.subject === seed.subject && passion.category === seed.category
      && passion.subjectPow === undefined && passion.subjectCha === undefined;
  });
  return untouched ? culturePassions(nextPrompts) : null;
}

export function passionRemovalLabel(type: string, subject: string, index: number): string {
  return `Remove passion ${index + 1}: ${type} (${subject.trim() || "unnamed"})`;
}
