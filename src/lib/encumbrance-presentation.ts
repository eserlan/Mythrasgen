import type { EncumbranceSummary } from "./encumbrance";

export function encumbranceThresholdRows(thresholds: EncumbranceSummary["thresholds"]) {
  if (!thresholds) return [];
  return [
    { label: "Burdened", multiplier: "2×", enc: thresholds.burdened },
    { label: "Overloaded", multiplier: "3×", enc: thresholds.overloaded },
    { label: "4× threshold", multiplier: "4×", enc: thresholds.unsustainable },
  ];
}
