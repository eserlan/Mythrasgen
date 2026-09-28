import { afterEach, describe, expect, test } from "bun:test";
import { RESISTANCES } from "../src/lib/rules";

(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const { replace, char, base, bonusEligible, learnedSkills, setAlloc, setCharacteristic, stepSkills, total } = await import("../src/lib/store.svelte");

const initial = {
  chars: { STR: 12, CON: 11, SIZ: 14, DEX: 13, INT: 10, POW: 15, CHA: 10 },
  culture: 3,
  career: 23,
  cultureSelections: { standard: [[]], professional: [], combatStyle: "" },
  careerProfessional: [],
  careerCombatStyles: [],
  alloc: { culture: {}, career: {}, bonus: {} },
};

describe("Resistance Standard Skills", () => {
  afterEach(() => replace(initial));

  test("are automatically learned with bases derived from current characteristics", () => {
    replace(initial);
    expect(RESISTANCES.map(name => [name, base(name)])).toEqual([
      ["Brawn", 26], ["Endurance", 22], ["Evade", 26], ["Willpower", 30],
    ]);
    expect(learnedSkills()).toEqual(expect.arrayContaining(RESISTANCES));
    expect(bonusEligible()).toEqual(expect.arrayContaining(RESISTANCES));
  });

  test("use the culture and career skill identities when those lists include them", () => {
    replace(initial);
    expect(stepSkills("culture")).toEqual(expect.arrayContaining(["Brawn", "Endurance", "Evade"]));
    expect(stepSkills("career")).toEqual(expect.arrayContaining(["Brawn", "Endurance", "Evade"]));
  });

  test("accumulate allocations across stages and retain them when characteristics change or a save is restored", () => {
    replace(initial);
    setAlloc("culture", "Brawn", 10);
    setAlloc("career", "Brawn", 12);
    setAlloc("bonus", "Brawn", 14);
    expect(total("Brawn")).toBe(62);

    setCharacteristic("STR", 15);
    expect(base("Brawn")).toBe(29);
    expect(total("Brawn")).toBe(65);

    const saved = structuredClone(char);
    replace(saved);
    expect(char.alloc).toMatchObject({
      culture: { Brawn: 10 }, career: { Brawn: 12 }, bonus: { Brawn: 14 },
    });
    expect(total("Brawn")).toBe(65);
  });
});
