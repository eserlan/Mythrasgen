export function passionRemovalLabel(type: string, subject: string, index: number): string {
  return `Remove passion ${index + 1}: ${type} (${subject.trim() || "unnamed"})`;
}
