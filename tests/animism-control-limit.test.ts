import { expect, test } from "bun:test";
import {
  emptyAnimismState, getMaximumControllableSpiritPow, getBoundSpiritCapacity, normalizeAnimismState,
  reconcileAnimism, spiritIntensityForPow, spiritIntensityBand, spiritPowMatchesIntensity,
  type SpiritBinding, type SpiritRecord,
} from "../src/lib/animism";

function setup(pow?: number, intensity = 4) {
  const state = emptyAnimismState();
  const spirit: SpiritRecord = {
    id: "tiny-tim", name: "Tiny Tim", spiritTypeId: "core:animism:ancestor", source: "custom",
    intensity, ...(pow === undefined ? {} : { pow }), abilities: [],
  };
  state.spirits.push(spirit);
  const binding: SpiritBinding = {
    id: "binding-1", spiritId: spirit.id, vessel: "fetish/object", objectName: "Tiny Tim's Skull",
    countsAgainstCapacity: true, source: "QA",
  };
  state.bindings.push(binding);
  return { state, spirit };
}

test("allies may exceed the control limit and do not use Binding Capacity", () => {
  const state = emptyAnimismState();
  state.spirits.push({ id: "ally", name: "Terry Greenleaf", spiritTypeId: "core:animism:ancestor", source: "custom", intensity: 4, pow: 27, abilities: [] });
  state.allies.push({ spiritId: "ally", attitude: "friendly", source: "Tradition" });

  expect(reconcileAnimism(state, "Shaman", 18, undefined, 57)).toEqual([]);
  expect(state.bindings.filter(binding => binding.countsAgainstCapacity)).toHaveLength(0);
  expect(getBoundSpiritCapacity({ CHA: 18 }, "Shaman")).toBe(14);
});

test("bound spirit at and below control limit is valid, including equality", () => {
  const below = setup(17, 2).state;
  const equal = setup(18, 2).state;
  expect(getMaximumControllableSpiritPow(57)).toBe(18);
  expect(reconcileAnimism(below, "Shaman", 18, undefined, 57)).toEqual([]);
  expect(reconcileAnimism(equal, "Shaman", 18, undefined, 57)).toEqual([]);
});

test("existing over-limit spirit is preserved, flagged, and revalidated as Binding changes", () => {
  const { state, spirit } = setup(27, 4);
  expect(reconcileAnimism(state, "Shaman", 18, undefined, 57)).toMatchObject([
    { code: "exceeds-binding-limit", spiritId: spirit.id },
  ]);
  expect(state.spirits).toContain(spirit);
  expect(reconcileAnimism(state, "Shaman", 18, undefined, 90)).toEqual([]);
  expect(reconcileAnimism(state, "Shaman", 18, undefined, 57)).toMatchObject([
    { code: "exceeds-binding-limit", spiritId: spirit.id },
  ]);
});

test("legacy bound spirits without exact POW require reconciliation without fabricating data", () => {
  const { state, spirit } = setup(undefined, 4);
  const serialized = JSON.parse(JSON.stringify(state));
  const loaded = normalizeAnimismState(serialized);
  expect(loaded.spirits[0].pow).toBeUndefined();
  expect(reconcileAnimism(loaded, "Shaman", 18, undefined, 57)).toMatchObject([
    { code: "unresolved-spirit-pow", spiritId: spirit.id },
  ]);
  expect(loaded.spirits).toHaveLength(1);
});

test("save/load preserves exact POW and recomputes control validation", () => {
  const { state } = setup(27, 4);
  const loaded = normalizeAnimismState(JSON.parse(JSON.stringify(state)));
  expect(loaded.spirits[0].pow).toBe(27);
  expect(reconcileAnimism(loaded, "Shaman", 18, undefined, 57)).toMatchObject([
    { code: "exceeds-binding-limit", spiritId: "tiny-tim" },
  ]);
});

test("Intensity and exact POW map to canonical bands and mismatched imported data is reported", () => {
  expect(spiritIntensityBand(4)).toMatchObject({ minPow: 25, maxPow: 30 });
  expect(spiritIntensityForPow(27)).toBe(4);
  expect(spiritIntensityForPow(27.5)).toBeUndefined();
  expect(spiritPowMatchesIntensity(27, 4)).toBe(true);
  expect(spiritPowMatchesIntensity(27.5, 4)).toBe(false);
  expect(spiritPowMatchesIntensity(27, 2)).toBe(false);
  const { state } = setup(27, 2);
  expect(reconcileAnimism(state, "Shaman", 18, undefined, 57)).toMatchObject([
    { code: "exceeds-binding-limit" },
    { code: "intensity-pow-mismatch" },
  ]);
  const fractional = setup(27.5, 4).state;
  expect(reconcileAnimism(fractional, "Shaman", 18, undefined, 57)).toMatchObject([
    { code: "exceeds-binding-limit", spiritId: "tiny-tim" },
    { code: "intensity-pow-mismatch", spiritId: "tiny-tim" },
  ]);
});

test("capacity continues to count bindings separately from POW control validation", () => {
  const { state } = setup(18, 2);
  state.bindings.push({ id: "second", spiritId: "tiny-tim", vessel: "place", countsAgainstCapacity: true, source: "QA" });
  expect(reconcileAnimism(state, "Follower", 4, undefined, 57)).toMatchObject([
    { code: "over-capacity" },
  ]);
  expect(state.bindings.filter(binding => binding.countsAgainstCapacity)).toHaveLength(2);
});
