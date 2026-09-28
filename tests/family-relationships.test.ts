import { describe, expect, test } from "bun:test";
import { familyRelationshipSpec, formatFamilyRelationships, reconcileFamilyRelationships, resolveFamilyRelationshipCount, type FamilyRelationship } from "../src/lib/family-relationships";

const repEnemy: FamilyRelationship = {
  source: "reputation", allowedTypes: ["Enemy", "Rival"], type: "Rival", name: "The old rival",
};
const connection: FamilyRelationship = {
  source: "connections", allowedTypes: ["Ally", "Contact", "Enemy", "Rival"], type: "Contact", name: "Cult of Yethis",
};

describe("Core family relationship generation", () => {
  test("creates no slots for a no-tie result", () => {
    expect(familyRelationshipSpec("None")).toEqual({ count: 0, die: 0, allowedTypes: [] });
    expect(reconcileFamilyRelationships([connection], "reputation", 0, [])).toEqual([connection]);
  });

  test("constrains a single Enemy or Rival slot", () => {
    const resolved = resolveFamilyRelationshipCount("1 Enemy or Rival", () => 1);
    expect(resolved).toEqual({ count: 1, countRoll: 0, allowedTypes: ["Enemy", "Rival"] });
    expect(reconcileFamilyRelationships([], "reputation", resolved.count, resolved.allowedTypes)).toEqual([{
      source: "reputation", allowedTypes: ["Enemy", "Rival"], type: "Enemy", name: "",
    }]);
  });

  test("resolves and retains the subsidiary d3 count roll", () => {
    expect(resolveFamilyRelationshipCount("1d3 Enemies or Rivals", sides => sides)).toEqual({
      count: 3, countRoll: 3, allowedTypes: ["Enemy", "Rival"],
    });
  });

  test("accumulates sources and reconciles only the rerolled source", () => {
    const initial = [repEnemy, connection];
    const rerolled = reconcileFamilyRelationships(initial, "reputation", 2, ["Contact", "Ally"]);
    expect(rerolled).toEqual([
      { source: "reputation", allowedTypes: ["Contact", "Ally"], type: "Contact", name: "The old rival" },
      connection,
      { source: "reputation", allowedTypes: ["Contact", "Ally"], type: "Contact", name: "" },
    ]);
    expect(reconcileFamilyRelationships(rerolled, "connections", 0, [])).toEqual([
      rerolled[0], rerolled[2],
    ]);
  });

  test("preserves compatible names and types while trimming obsolete same-source slots", () => {
    const trimmed = reconcileFamilyRelationships([repEnemy, { ...repEnemy, name: "second" }, connection], "reputation", 1, ["Enemy", "Rival"]);
    expect(trimmed).toEqual([repEnemy, connection]);
  });

  test("formats each source's relationships for the character sheet", () => {
    expect(formatFamilyRelationships([repEnemy, connection], "reputation")).toBe("Rival (The old rival)");
    expect(formatFamilyRelationships([repEnemy, connection], "connections")).toBe("Contact (Cult of Yethis)");
    expect(formatFamilyRelationships([], "connections")).toBe("None generated");
  });
});
