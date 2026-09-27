export function passionRemovalLabel(type: string, subject: string, index: number): string {
  return `Remove passion ${index + 1}: ${type} (${subject.trim() || "unnamed"})`;
}

/** Drop subject stats copied from the character by older Passion seeding code. */
export function clearCopiedSubjectStats<T extends { subjectPow?: number; subjectCha?: number }>(
  passions: T[], chars: { POW: number; CHA: number },
): T[] {
  return passions.map(passion => ({
    ...passion,
    subjectPow: passion.subjectPow === chars.POW ? undefined : passion.subjectPow,
    subjectCha: passion.subjectCha === chars.CHA ? undefined : passion.subjectCha,
  }));
}
