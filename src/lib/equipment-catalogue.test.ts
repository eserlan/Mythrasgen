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
} from "./equipment-catalogue";

function item(id: string) {
  const record = EQUIPMENT_CATALOGUE.find(entry => entry.source.id === id);
  if (!record) throw new Error(`Missing fixture ${id}`);
  return record;
}

describe("provisional equipment catalogue", () => {
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
