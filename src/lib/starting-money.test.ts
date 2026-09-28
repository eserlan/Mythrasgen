import { afterEach, describe, expect, test } from "bun:test";
import { socialClassForRoll } from "./background-rules";
import { cultures } from "./content";

(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const { char, recalculateStartingMoney, replace, resolveSocialClass, setStartingMoneyRoll } = await import("./store.svelte");

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

  test("save normalization key preserves a downstream balance until an input changes", () => {
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
    expect(char.background.currentMoney).toBe(1050);
  });
});
