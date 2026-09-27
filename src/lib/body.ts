export const FRAMES = ["Lithe", "Medium", "Heavy"] as const;
export type Frame = typeof FRAMES[number];

export interface BodyRange {
  min: number;
  max: number;
}

export interface BodyTableRow {
  height: BodyRange;
  weight: Record<Frame, BodyRange>;
}

export interface BodyRanges {
  height: BodyRange;
  weight: BodyRange;
}

/** Human SIZ 8–18 height and frame-weight ranges from Mythras Core Rules p. 9. */
export const HUMAN_BODY_TABLE: Readonly<Record<number, BodyTableRow>> = {
  8:  { height: { min: 151, max: 155 }, weight: { Lithe: { min: 36, max: 40 }, Medium: { min: 50, max: 56 }, Heavy: { min: 64, max: 72 } } },
  9:  { height: { min: 156, max: 160 }, weight: { Lithe: { min: 41, max: 45 }, Medium: { min: 57, max: 63 }, Heavy: { min: 73, max: 81 } } },
  10: { height: { min: 161, max: 165 }, weight: { Lithe: { min: 46, max: 50 }, Medium: { min: 64, max: 70 }, Heavy: { min: 82, max: 90 } } },
  11: { height: { min: 166, max: 170 }, weight: { Lithe: { min: 51, max: 55 }, Medium: { min: 71, max: 77 }, Heavy: { min: 91, max: 99 } } },
  12: { height: { min: 171, max: 175 }, weight: { Lithe: { min: 56, max: 60 }, Medium: { min: 78, max: 84 }, Heavy: { min: 100, max: 108 } } },
  13: { height: { min: 176, max: 180 }, weight: { Lithe: { min: 61, max: 65 }, Medium: { min: 85, max: 91 }, Heavy: { min: 109, max: 117 } } },
  14: { height: { min: 181, max: 185 }, weight: { Lithe: { min: 66, max: 70 }, Medium: { min: 92, max: 98 }, Heavy: { min: 118, max: 126 } } },
  15: { height: { min: 186, max: 190 }, weight: { Lithe: { min: 71, max: 75 }, Medium: { min: 99, max: 105 }, Heavy: { min: 127, max: 135 } } },
  16: { height: { min: 191, max: 195 }, weight: { Lithe: { min: 76, max: 80 }, Medium: { min: 106, max: 112 }, Heavy: { min: 136, max: 144 } } },
  17: { height: { min: 196, max: 200 }, weight: { Lithe: { min: 81, max: 85 }, Medium: { min: 113, max: 119 }, Heavy: { min: 145, max: 153 } } },
  18: { height: { min: 201, max: 205 }, weight: { Lithe: { min: 86, max: 90 }, Medium: { min: 120, max: 126 }, Heavy: { min: 154, max: 162 } } },
};

/** A future race/template can supply a restricted list; humans use all frames. */
export function availableFrames(restrictions?: readonly Frame[]): Frame[] {
  return restrictions?.length ? FRAMES.filter(frame => restrictions.includes(frame)) : [...FRAMES];
}

export function bodyRanges(siz: number, frame: Frame): BodyRanges | undefined {
  const row = HUMAN_BODY_TABLE[siz];
  return row ? { height: row.height, weight: row.weight[frame] } : undefined;
}

export function isInRange(value: number | null | undefined, range: BodyRange | undefined): value is number {
  return Number.isInteger(value) && !!range && value! >= range.min && value! <= range.max;
}

export function reconcileMeasurements(height: number | null, weight: number | null, ranges: BodyRanges | undefined) {
  return {
    height: isInRange(height, ranges?.height) ? height : null,
    weight: isInRange(weight, ranges?.weight) ? weight : null,
    cleared: [
      ...(height !== null && !isInRange(height, ranges?.height) ? ["height" as const] : []),
      ...(weight !== null && !isInRange(weight, ranges?.weight) ? ["weight" as const] : []),
    ],
  };
}
