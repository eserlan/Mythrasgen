import { describe, expect, test } from "bun:test";
import { resolveWeapon, WEAPON_CATALOGUE } from "./weapons";

describe("Combat Style weapon resolution", () => {
  test("resolves catalogue keys and normalized catalogue names to weapon statistics", () => {
    expect(resolveWeapon("sling", "Campaign sling")).toMatchObject({
      id: "sling", name: "Sling", damage: "1d8", size: "L", ap: 1, hp: 2,
      range: "10/150/300 m", force: "No", load: 2,
    });
    expect(resolveWeapon(undefined, " short sword ")).toMatchObject({ id: "shortsword", damage: "1d6" });
  });

  test("keeps custom and specialized names unresolved instead of substituting similar weapons", () => {
    expect(resolveWeapon(undefined, "Peltast Shield")).toBeUndefined();
    expect(resolveWeapon(undefined, "Moonsteel glaive")).toBeUndefined();
    expect(WEAPON_CATALOGUE.length).toBeGreaterThan(0);
  });
});
