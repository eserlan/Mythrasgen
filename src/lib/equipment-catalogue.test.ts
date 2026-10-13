import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  EQUIPMENT_CATALOGUE,
  acquireWithoutPurchase,
  createEquipmentPurchase,
  displayEquipmentPrice,
  formatCopperPrice,
} from "./equipment-catalogue";
import { RANGED_WEAPON_STATS, formatRangedRange, rangedCellText, type RangedCell } from "./ranged-weapons";

function item(id: string) {
  const record = EQUIPMENT_CATALOGUE.find(entry => entry.source.id === id);
  if (!record) throw new Error(`Missing fixture ${id}`);
  return record;
}

describe("provisional equipment catalogue", () => {
  test("has explicit ranged-table data for every p. 65 ranged catalogue row", () => {
    const catalogueIds = EQUIPMENT_CATALOGUE.filter(entry => entry.source.category === "ranged").map(entry => entry.source.id).sort();
    expect(catalogueIds).toHaveLength(19);
    expect(Object.keys(RANGED_WEAPON_STATS).sort()).toEqual(catalogueIds);
    for (const [id, stats] of Object.entries(RANGED_WEAPON_STATS)) {
      expect(stats, id).toHaveProperty("damage");
      expect(stats, id).toHaveProperty("damageModifier");
      expect(stats, id).toHaveProperty("force");
      expect(stats, id).toHaveProperty("range");
      expect(stats, id).toHaveProperty("load");
      expect(stats, id).toHaveProperty("combatEffects");
      expect(stats, id).toHaveProperty("impaleSize");
      expect(stats, id).toHaveProperty("enc");
      expect(stats, id).toHaveProperty("ap");
      expect(stats, id).toHaveProperty("hp");
      for (const cell of Object.values(stats) as RangedCell<unknown>[]) {
        expect(["value", "not_applicable", "unknown"]).toContain(cell.status);
        if (cell.status === "value") expect(cell.value).not.toBeUndefined();
      }
    }
  });

  test("matches representative ranged weapons and preserves printed dash semantics", () => {
    const blowgun = RANGED_WEAPON_STATS["ranged-blowgun"];
    expect(blowgun.damage.status).toBe("not_applicable");
    expect(blowgun.damageModifier).toEqual({ status: "value", value: "N" });
    expect(blowgun.force.status).toBe("not_applicable");
    expect(formatRangedRange(blowgun.range)).toBe("10/20/30 m");
    expect(blowgun.load).toEqual({ status: "value", value: 2 });
    expect(blowgun.combatEffects).toEqual({ status: "value", value: "Impale" });
    expect(blowgun.enc.status).toBe("not_applicable");
    expect(rangedCellText(blowgun.ap)).toBe("1");
    expect(rangedCellText(blowgun.hp)).toBe("4");
    expect(item("ranged-blowgun").source.price_cp_candidate).toBe(300);

    const atlatl = RANGED_WEAPON_STATS["ranged-atlatl"];
    expect(atlatl.damage.status).toBe("not_applicable");
    expect(atlatl.force).toEqual({ status: "value", value: "+1 Step" });
    expect(formatRangedRange(atlatl.range)).toBe("+0/+25/+75 m");
    expect(atlatl.load).toEqual({ status: "value", value: 1 });
    expect(atlatl.enc).toEqual({ status: "value", value: 1 });
    expect(atlatl.ap).toEqual({ status: "value", value: 1 });
    expect(atlatl.hp).toEqual({ status: "value", value: 4 });

    expect(RANGED_WEAPON_STATS["ranged-short-bow"]).toMatchObject({ damage: { value: "1d6" }, damageModifier: { value: "Y" }, force: { value: "L" }, range: { value: ["15", "100", "200"] }, load: { value: 2 }, combatEffects: { value: "Impale" }, enc: { value: 1 }, ap: { value: 4 }, hp: { value: 4 } });
    expect(RANGED_WEAPON_STATS["ranged-long-bow"]).toMatchObject({ damage: { value: "1d8" }, force: { value: "H" }, range: { value: ["15", "125", "250"] }, load: { value: 2 }, combatEffects: { value: "Impale" }, enc: { value: 1 }, ap: { value: 4 }, hp: { value: 7 } });
    expect(RANGED_WEAPON_STATS["ranged-light-crossbow"]).toMatchObject({ damage: { value: "1d8" }, damageModifier: { value: "N" }, force: { value: "L" }, range: { value: ["20", "100", "200"] }, load: { value: 3 }, combatEffects: { value: "Impale" }, enc: { value: 1 }, ap: { value: 4 }, hp: { value: 5 } });
    expect(RANGED_WEAPON_STATS["ranged-heavy-crossbow"]).toMatchObject({ damage: { value: "1d10" }, damageModifier: { value: "N" }, force: { value: "H" }, range: { value: ["20", "150", "300"] }, load: { value: 4 }, combatEffects: { value: "Impale/Sunder" }, enc: { value: 2 }, ap: { value: 4 }, hp: { value: 8 } });

    const thrownDagger = RANGED_WEAPON_STATS["ranged-dagger"];
    expect(thrownDagger.damage).toEqual({ status: "value", value: "1d4" });
    expect(thrownDagger.impaleSize).toEqual({ status: "value", value: "S" });
    expect(item("ranged-dagger").source.physical_item_key).toBe("weapon-dagger");
    expect(item("one_handed-dagger").source.combat_profile_candidate).toBeDefined();
  });

  test("formats integer CP as silver-first Mythras currency, including signed and large values", () => {
    expect(formatCopperPrice(0)).toBe("0 SP");
    expect(formatCopperPrice(1750)).toBe("175 SP");
    expect(formatCopperPrice(2500)).toBe("250 SP");
    expect(formatCopperPrice(7000)).toBe("700 SP");
    expect(formatCopperPrice(12)).toBe("1 SP 2 CP");
    expect(formatCopperPrice(2)).toBe("2 CP");
    expect(formatCopperPrice(-1750)).toBe("−175 SP");
    expect(formatCopperPrice(Number.MAX_SAFE_INTEGER)).toBe("900719925474099 SP 1 CP");
    expect(() => formatCopperPrice(1.5)).toThrow(/whole number of CP/);
  });

  test("catalogue validator rejects CSV values that diverge from JSON", () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "mythras-catalogue-validation-"));
    try {
      mkdirSync(join(temporaryDirectory, "scripts"));
      cpSync(resolve("scripts/validate-equipment-catalogue.mjs"), join(temporaryDirectory, "scripts/validate-equipment-catalogue.mjs"));
      for (const file of ["catalogue_source_index.json", "catalogue_source_index.csv", "validation_report.json"]) {
        cpSync(resolve(file), join(temporaryDirectory, file));
      }
      const csvPath = join(temporaryDirectory, "catalogue_source_index.csv");
      const csv = readFileSync(csvPath, "utf8").replace(
        "one_handed-ball-chain,one_handed,Ball & chain,63,2500,",
        "one_handed-ball-chain,one_handed,Ball & chain,63,2501,",
      );
      writeFileSync(csvPath, csv);

      const result = spawnSync("node", [join(temporaryDirectory, "scripts/validate-equipment-catalogue.mjs")], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("CSV price_cp_candidate does not match JSON for one_handed-ball-chain");
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("imports all 206 source rows and leaves unavailable prices null and visible", () => {
    expect(EQUIPMENT_CATALOGUE).toHaveLength(206);
    const buckler = item("shields-buckler");
    expect(buckler.source.price_cp_candidate).toBeNull();
    expect(buckler.fieldVerification.price_cp_candidate).toBe("unresolved");
    expect(displayEquipmentPrice(buckler.source)).toBe("Price unavailable");
    expect(buckler.shieldRules?.passiveBlocking).toEqual({ value: null, verification: "unresolved" });
    expect(buckler.shieldRules?.rangedParry).toEqual({ value: null, verification: "unresolved" });
    expect(() => createEquipmentPurchase("shields-buckler")).toThrow(/price unavailable/i);
    expect(acquireWithoutPurchase("shields-buckler", "gifted")).toEqual({
      catalogueId: "shields-buckler", acquiredAs: "gifted", quantity: 1,
    });
    expect(createEquipmentPurchase("shields-buckler", { gmEnteredPriceCp: 37 }).transaction.amountCp).toBe(37);
  });

  test("keeps alternate wielding profiles tied to one physical owned item", () => {
    const oneHanded = item("one_handed-battleaxe");
    const twoHanded = item("two_handed-battleaxe");
    expect(oneHanded.kind).toBe("wielding_profile");
    expect(twoHanded.kind).toBe("wielding_profile");
    expect(oneHanded.source.physical_item_key).toBe("weapon-battleaxe");
    expect(twoHanded.source.physical_item_key).toBe("weapon-battleaxe");
    expect(oneHanded.source.wielding_hands).toBe(1);
    expect(twoHanded.source.wielding_hands).toBe(2);
  });

  test("keeps armour construction and material modifiers as separate canonical records", () => {
    const armour = item("armour-laminated");
    const material = item("materials-chitin");
    expect(armour.kind).toBe("physical_item");
    expect(armour.source.ap).toBe(3);
    expect(armour.source.base_enc_per_location).toBe(2);
    expect(material.kind).toBe("armour_material_modifier");
    expect(material.source.enc_multiplier).toBe(0.75);
    expect(material.source.price_cp_candidate).toBeNull();
    expect(item("accommodation-common-room-floor-stables").kind).toBe("non_carried_purchase");
  });

  test("transaction price is a frozen snapshot independent of later catalogue corrections", () => {
    const { transaction } = createEquipmentPurchase("one_handed-battleaxe", { recordedAt: "2026-10-10T00:00:00.000Z" });
    expect(transaction.amountCp).toBe(1000);
    expect(transaction.catalogueVersion).toBe("mythras-core-3e-provisional-2026-10-10");
    expect(Object.isFrozen(transaction)).toBe(true);
    expect(Object.isFrozen(EQUIPMENT_CATALOGUE)).toBe(true);
    expect(() => { (transaction as { amountCp: number }).amountCp = 1; }).toThrow();
    expect(item("one_handed-battleaxe").source.price_cp_candidate).toBe(1000);
    expect(transaction.amountCp).toBe(1000);
  });
});
