import { describe, expect, test } from "bun:test";
import { CORE_COMBAT_STYLE_WEAPONS, isCoreCombatStyleWeaponName, resolveCoreCombatStyleWeapon, resolveWeapon, WEAPON_CATALOGUE } from "./weapons";

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

  test("recognizes standard Core style weapons by normalized names and stable catalogue IDs", () => {
    expect(resolveCoreCombatStyleWeapon(undefined, " great sword ")).toMatchObject({ id: "two_handed-greatsword", name: "Greatsword" });
    expect(resolveCoreCombatStyleWeapon("one_handed-broadsword", "Campaign sword")).toMatchObject({ name: "Broadsword" });
    expect(resolveCoreCombatStyleWeapon("shields-viking", "Viking")).toMatchObject({ name: "Viking Shield" });
    expect(resolveCoreCombatStyleWeapon(undefined, "Viking Shield")).toMatchObject({ id: "shields-viking", name: "Viking Shield" });
    expect(isCoreCombatStyleWeaponName(" battleaxe ")).toBe(true);
    expect(resolveCoreCombatStyleWeapon(undefined, "Battleaxe")).toBeUndefined();
    expect(isCoreCombatStyleWeaponName("Moonsteel glaive")).toBe(false);
    expect(CORE_COMBAT_STYLE_WEAPONS.some(item => item.name === "Battleaxe")).toBe(true);
  });
});
