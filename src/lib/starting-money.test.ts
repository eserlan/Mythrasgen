import { afterEach, describe, expect, test } from "bun:test";
import { socialClassForRoll } from "./background-rules";
import { cultures } from "./content";

Object.defineProperty(globalThis, "$state", { value: <T>(value: T) => value, configurable: true });
const { char, equipmentAvailableCp, equipmentBalanceCp, equipmentMoneyValueCp, equipmentSpentCp, purchaseEquipment, recalculateStartingMoney, refundEquipmentPurchase, replace, resetEquipmentMoney, resolveSocialClass, setEquipmentMoney, setStartingMoneyRoll } = await import("./store.svelte");

const original = {
  moneyTable: char.moneyTable,
  socialTable: char.socialTable,
  culture: char.culture,
  roll: char.background.startingMoneyRoll,
  socialClass: char.background.socialClass,
  socialClassRoll: char.background.socialClassRoll,
  socialClassMethod: char.background.socialClassMethod,
  socialClassCulture: char.background.socialClassCulture,
  socialClassMoney: char.background.socialClassMoney,
  socialClassEquipment: char.background.socialClassEquipment,
  socialClassResources: char.background.socialClassResources,
  startingMoneyKey: char.background.startingMoneyKey,
  startingMoneyTotal: char.background.startingMoneyTotal,
  currentMoney: char.background.currentMoney,
  moneyOverrides: structuredClone(char.background.moneyOverrides),
  purchases: structuredClone(char.background.purchases),
  inventory: structuredClone(char.background.inventory),
  equipmentTransactions: structuredClone(char.background.equipmentTransactions),
};

afterEach(() => {
  char.moneyTable = original.moneyTable;
  char.socialTable = original.socialTable;
  char.culture = original.culture;
  char.background.startingMoneyRoll = original.roll;
  char.background.socialClass = original.socialClass;
  char.background.socialClassRoll = original.socialClassRoll;
  char.background.socialClassMethod = original.socialClassMethod;
  char.background.socialClassCulture = original.socialClassCulture;
  char.background.socialClassMoney = original.socialClassMoney;
  char.background.socialClassEquipment = original.socialClassEquipment;
  char.background.socialClassResources = original.socialClassResources;
  char.background.startingMoneyKey = original.startingMoneyKey;
  char.background.startingMoneyTotal = original.startingMoneyTotal;
  char.background.currentMoney = original.currentMoney;
  char.background.moneyOverrides = structuredClone(original.moneyOverrides);
  char.background.purchases = structuredClone(original.purchases);
  char.background.inventory = structuredClone(original.inventory);
  char.background.equipmentTransactions = structuredClone(original.equipmentTransactions);
});

describe("persistent starting money", () => {
  test("recalculates from the roll, culture rate, and social class modifier", () => {
    char.moneyTable = "Civilised";
    char.socialTable = "Civilised";
    char.background.socialClass = "Freeman";
    char.background.socialClassRoll = 50;
    char.background.socialClassMethod = "rolled";
    char.background.socialClassCulture = "Civilised";
    char.background.socialClassMoney = 1;
    char.background.socialClassEquipment = "Tools; simple weapons";
    char.background.socialClassResources = "Rented accommodation; may own a few livestock";

    expect(setStartingMoneyRoll(13)).toBe(975);
    expect(char.background.startingMoneyTotal).toBe(975);
    expect(char.background.currentMoney).toBe(975);

    char.moneyTable = "Barbarian";
    expect(recalculateStartingMoney()).toBe(650);
    resolveSocialClass(socialClassForRoll("Civilised", 80), "chosen");
    expect(recalculateStartingMoney()).toBe(1950);
    expect(setStartingMoneyRoll(14)).toBe(2100);
  });

  test("migrates a saved adjusted balance to a persistent Remaining override", () => {
    char.culture = cultures.findIndex(culture => culture.kind === "Civilised");
    char.moneyTable = "Civilised";
    char.socialTable = "Civilised";
    char.background.socialClass = "Freeman";
    char.background.socialClassRoll = 50;
    char.background.socialClassMethod = "rolled";
    char.background.socialClassCulture = "Civilised";
    char.background.socialClassMoney = 1;
    char.background.socialClassEquipment = "Tools; simple weapons";
    char.background.socialClassResources = "Rented accommodation; may own a few livestock";
    setStartingMoneyRoll(13);
    char.background.currentMoney = 500;

    replace(structuredClone(char));
    expect(char.background.currentMoney).toBe(500);
    expect(char.background.startingMoneyTotal).toBe(975);
    setStartingMoneyRoll(14);
    expect(char.background.currentMoney).toBe(500);
  });

  test("migrates the previous purchase ledger into current funds", () => {
    char.culture = cultures.findIndex(culture => culture.kind === "Civilised");
    char.moneyTable = "Civilised";
    char.socialTable = "Civilised";
    char.background.socialClass = "Freeman";
    char.background.socialClassRoll = 50;
    char.background.socialClassMethod = "rolled";
    char.background.socialClassCulture = "Civilised";
    char.background.socialClassMoney = 1;
    char.background.socialClassEquipment = "Tools; simple weapons";
    char.background.socialClassResources = "Rented accommodation; may own a few livestock";
    setStartingMoneyRoll(13);
    char.background.purchases = [{ name: "Torch", cost: 2 }, { name: "Rope", cost: 15 }];

    const legacySave = structuredClone(char);
    delete (legacySave.background as Partial<typeof legacySave.background>).currentMoney;
    delete (legacySave.background as Partial<typeof legacySave.background>).inventory;
    delete (legacySave.background as Partial<typeof legacySave.background>).equipmentTransactions;
    replace(legacySave);

    expect(char.background.currentMoney).toBe(958);
    expect(char.background.startingMoneyTotal).toBe(975);
  });

  test("ledger purchases reject overspending and reconcile when starting funds change", () => {
    char.moneyTable = "Civilised";
    char.socialTable = "Civilised";
    char.background.socialClass = "Freeman";
    char.background.socialClassRoll = 50;
    char.background.socialClassMethod = "rolled";
    char.background.socialClassCulture = "Civilised";
    char.background.socialClassMoney = 1;
    char.background.socialClassEquipment = "Tools; simple weapons";
    char.background.socialClassResources = "Rented accommodation; may own a few livestock";
    char.background.equipmentTransactions = [];
    char.background.inventory = [];
    char.background.purchases = [];
    char.background.moneyOverrides = {};
    setStartingMoneyRoll(13);
    const previousBalance = char.background.currentMoney;

    expect(() => purchaseEquipment("one_handed-dagger", 40)).toThrow("exceeds available funds");
    expect(char.background.inventory).toHaveLength(0);
    expect(char.background.equipmentTransactions).toHaveLength(0);
    expect(char.background.currentMoney).toBe(previousBalance);

    purchaseEquipment("one_handed-dagger", 2);
    expect(char.background.equipmentTransactions[0].amountCp).toBe(600);
    expect(char.background.currentMoney).toBe(915);
    char.background.socialClassMoney = 0.01;
    recalculateStartingMoney();
    expect(char.background.equipmentTransactions).toHaveLength(1);
    expect(char.background.currentMoney).toBeLessThan(0);
    const deficit = char.background.currentMoney;
    replace(structuredClone(char));
    expect(char.background.equipmentTransactions).toHaveLength(1);
    expect(char.background.inventory[0].quantity).toBe(2);
    expect(char.background.currentMoney).toBe(deficit);
  });

  test("money overrides are independent, persist through normalization, and reset independently", () => {
    char.culture = cultures.findIndex(culture => culture.kind === "Civilised");
    char.moneyTable = "Civilised";
    char.socialTable = "Civilised";
    char.background.socialClass = "Freeman";
    char.background.socialClassRoll = 50;
    char.background.socialClassMethod = "rolled";
    char.background.socialClassCulture = "Civilised";
    char.background.socialClassMoney = 1;
    char.background.socialClassEquipment = "Tools; simple weapons";
    char.background.socialClassResources = "Rented accommodation; may own a few livestock";
    char.background.equipmentTransactions = [];
    char.background.moneyOverrides = {};
    setStartingMoneyRoll(13);

    setEquipmentMoney("startingCp", 22.5);
    setEquipmentMoney("spentCp", 3.4);
    setEquipmentMoney("remainingCp", 8.1);
    expect([equipmentMoneyValueCp("startingCp"), equipmentSpentCp(), equipmentBalanceCp()]).toEqual([225, 34, 81]);

    replace(structuredClone(char));
    expect([equipmentMoneyValueCp("startingCp"), equipmentSpentCp(), equipmentBalanceCp()]).toEqual([225, 34, 81]);
    resetEquipmentMoney("spentCp");
    expect([equipmentMoneyValueCp("startingCp"), equipmentSpentCp(), equipmentBalanceCp()]).toEqual([225, 0, 81]);
    resetEquipmentMoney("startingCp");
    expect([equipmentMoneyValueCp("startingCp"), equipmentSpentCp(), equipmentBalanceCp()]).toEqual([9750, 0, 81]);
  });

  test("purchases and refunds preserve manual values and update calculated defaults", () => {
    char.moneyTable = "Civilised";
    char.socialTable = "Civilised";
    char.background.socialClass = "Freeman";
    char.background.socialClassRoll = 50;
    char.background.socialClassMethod = "rolled";
    char.background.socialClassCulture = "Civilised";
    char.background.socialClassMoney = 1;
    char.background.socialClassEquipment = "Tools; simple weapons";
    char.background.socialClassResources = "Rented accommodation; may own a few livestock";
    char.background.equipmentTransactions = [];
    char.background.inventory = [];
    char.background.moneyOverrides = {};
    setStartingMoneyRoll(13);

    setEquipmentMoney("startingCp", 50);
    setEquipmentMoney("spentCp", 2.5);
    setEquipmentMoney("remainingCp", 1300);
    purchaseEquipment("one_handed-dagger", 40);
    expect(char.background.equipmentTransactions[0].amountCp).toBe(12000);
    expect([equipmentMoneyValueCp("startingCp"), equipmentSpentCp(), equipmentBalanceCp()]).toEqual([500, 25, 13000]);
    expect(equipmentAvailableCp()).toBe(1000);
    expect(() => purchaseEquipment("one_handed-dagger", 4)).toThrow("Purchase exceeds available funds");
    expect(char.background.equipmentTransactions).toHaveLength(1);

    refundEquipmentPurchase(char.background.equipmentTransactions[0].id, 12000);
    expect([equipmentMoneyValueCp("startingCp"), equipmentSpentCp(), equipmentBalanceCp()]).toEqual([500, 25, 13000]);
    expect(equipmentAvailableCp()).toBe(13000);
    resetEquipmentMoney("remainingCp");
    expect(equipmentBalanceCp()).toBe(9750);
    expect(equipmentMoneyValueCp("startingCp")).toBe(500);
  });
});
