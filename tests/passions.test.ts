import { describe, expect, test } from "bun:test";
import { culturePassions, passionRemovalLabel, updateCulturePassions } from "../src/lib/passions";

describe("Passion removal accessible names", () => {
  test("identifies each row and its subject, including blank subjects", () => {
    expect(passionRemovalLabel("Loyalty", "Town", 0)).toBe("Remove passion 1: Loyalty (Town)");
    expect(passionRemovalLabel("Love", "", 1)).toBe("Remove passion 2: Love (unnamed)");
  });
});

describe("culture passion prompts", () => {
  const barbarian = ["Loyalty to Clan Chieftain", "Love (friend, sibling or romantic lover)", "Hate (creature, rival or clan)"];
  const civilised = ["Loyalty to Town/City", "Love (friend, sibling or romantic lover)", "Hate (rival, gang, district or city)"];

  test("replace untouched generated rows when the culture changes", () => {
    const seeded = culturePassions(barbarian);
    expect(updateCulturePassions(seeded, barbarian, civilised)).toEqual(culturePassions(civilised));
  });

  test("preserve passion rows after a user edits a generated prompt", () => {
    const edited = culturePassions(barbarian);
    edited[0].subject = "A different clan";
    expect(updateCulturePassions(edited, barbarian, civilised)).toBeNull();
  });
});
