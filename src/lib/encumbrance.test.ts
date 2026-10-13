import { describe, expect, test } from "bun:test";
import { encumbranceSummary, carriedLoad } from "./encumbrance";
import type { InventoryItem } from "./equipment-inventory";

const item = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: "item", catalogueId: null, sourceIds: [], name: "item", quantity: 1,
  acquiredAs: "legacy", state: "carried", encPerUnit: 1, encSource: "gm_override", ...overrides,
});

describe("Core ENC load calculations", () => {
  test("classifies exact 2x, 3x and 4x STR boundaries and the next value", () => {
    const at = (enc: number) => encumbranceSummary([item({ encPerUnit: enc })], 10);
    expect(at(20).band).toBe("unburdened");
    expect(at(20.25).band).toBe("burdened");
    expect(at(30).band).toBe("burdened");
    expect(at(30.25).band).toBe("overloaded");
    expect(at(40).band).toBe("overloaded");
    expect(at(40.25).band).toBe("unsustainable");
    expect(at(20.25)).toMatchObject({ skillDifficultyGrades: 1, movement: "4m", sprinting: "Cannot sprint", fatigue: "Medium" });
    expect(at(30.25)).toMatchObject({ skillDifficultyGrades: 2, movement: "3m", sprinting: "Walking only", fatigue: "Strenuous" });
  });

  test("retains fractional ENC and counts twenty zero-ENC objects as one ENC", () => {
    expect(carriedLoad([item({ encPerUnit: 0.75, quantity: 2 })]).load).toBe(1.5);
    expect(carriedLoad([item({ encPerUnit: 0, quantity: 39 })]).load).toBe(1);
  });

  test("uses half ENC for worn items and excludes stored and exempt items", () => {
    expect(carriedLoad([
      item({ encPerUnit: 5, state: "worn" }),
      item({ id: "stored", encPerUnit: 100, state: "stored" }),
      item({ id: "clothing", encPerUnit: 100, encumbranceExempt: true }),
    ])).toMatchObject({ load: 2.5, knownLoad: 2.5 });
  });

  test("does not turn unknown ENC into zero or present a complete total", () => {
    expect(carriedLoad([item({ encPerUnit: 2 }), item({ id: "unknown", encPerUnit: null, encSource: "unresolved" })]))
      .toMatchObject({ load: null, knownLoad: 2, unresolvedItems: ["item"] });
    expect(encumbranceSummary([item({ encPerUnit: null, encSource: "unresolved" })], 10).band).toBe("unknown");
  });
});
