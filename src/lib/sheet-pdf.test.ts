import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

Object.defineProperty(globalThis, "$state", { value: <T>(value: T) => value, configurable: true });
const { char, replace, reset } = await import("./store.svelte");
const { buildSheetData, SHEET_HIT_LOCATIONS } = await import("./sheet-data");
const { currentSheetSource } = await import("./sheet-source");
const { circleTextPlacement, renderCharacterSheet } = await import("./sheet-pdf");

const template = readFileSync(new URL("../assets/mythras-character-sheet.pdf", import.meta.url));
const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

describe("printable character sheet data", () => {
  test("maps only recorded character data and leaves the rest blank", () => {
    reset(false);
    replace({ name: "", race: "", height: null, weight: null, passionsEnabled: false, passions: [] });
    const data = buildSheetData(currentSheetSource());
    expect(data.identity.player).toBe("");
    expect(data.identity.height).toBe("");
    expect(data.identity.weight).toBe("");
    expect(data.passions).toEqual([]);
    expect(data.professional).toEqual([]);
    expect(data.magical).toEqual([]);
  });

  test("lists Hit Locations in the official sheet order with maximum HP", () => {
    reset(false);
    replace({ chars: { STR: 12, CON: 14, SIZ: 12, DEX: 12, INT: 12, POW: 12, CHA: 12 } });
    const data = buildSheetData(currentSheetSource());
    expect(SHEET_HIT_LOCATIONS).toEqual(["Head", "Left Arm", "Right Arm", "Chest", "Abdomen", "Left Leg", "Right Leg"]);
    expect(SHEET_HIT_LOCATIONS.map(name => data.hitLocations[name])).toEqual(["6", "5", "5", "8", "7", "6", "6"]);
  });

  test("sorts learned skills onto the matching sheet sections", () => {
    reset(false);
    const source = currentSheetSource();
    const data = buildSheetData({
      ...source, skills: ["Lore (History)", "Folk Magic", "Language (Elvish)", "Craft (any)", "Combat Style (Tribal Warrior)", "Athletics"],
      styles: [{ name: "Combat Style (Tribal Warrior)", percentage: 40, weapons: [], traits: [] }],
    });
    expect(data.professional.map(row => row.name)).toEqual(["Lore (History)"]);
    expect(data.magical.map(row => row.name)).toEqual(["Folk Magic"]);
    expect(data.languages.filter(row => !row.native).map(row => row.name)).toEqual(["Language (Elvish)"]);
  });

  test("keeps style-associated weapons separate from owned equipment", () => {
    reset(false);
    const source = currentSheetSource();
    const data = buildSheetData({ ...source, styles: [{ name: "Combat Style (Duelling)", percentage: 55, weapons: [{ name: "Rapier" }], traits: [{ displayName: "Skirmishing" }] }] });
    expect(data.combatStyles).toEqual([{ name: "Combat Style (Duelling)", weapons: "Rapier", traits: "Skirmishing", percentage: "55" }]);
    expect(data.equipment).not.toContain("Rapier");
  });

  test("prints recorded memberships for theistic cults", () => {
    reset(false);
    replace({
      organisations: [
        { id: "river-cult", name: "River Cult", kind: { type: "magical-cult", discipline: "Theism" } },
        { id: "glass-guild", name: "Glass Guild", kind: { type: "brotherhood", subtype: "Guild" } },
      ],
      memberships: [
        { id: "cult-member", organisationId: "river-cult", rank: "Dedicated" },
        { id: "guild-member", organisationId: "glass-guild", rank: "Common" },
      ],
    });
    expect(buildSheetData(currentSheetSource()).cult).toEqual(["River Cult (Theism)"]);
  });

  test("never mutates the character and reflects the newly selected character", () => {
    reset(false);
    replace({ name: "First" });
    let before = JSON.stringify(char);
    expect(buildSheetData(currentSheetSource()).identity.name).toBe("First");
    expect(JSON.stringify(char)).toBe(before);
    replace({ name: "Second" });
    before = JSON.stringify(char);
    expect(buildSheetData(currentSheetSource()).identity.name).toBe("Second");
    expect(JSON.stringify(char)).toBe(before);
  });
});

describe("populated Mythras Character Sheet PDF", () => {
  test("template is the two-page official sheet", async () => {
    expect(await pageCount(template)).toBe(2);
  });

  test("a sparse or ordinary character stays on exactly two pages", async () => {
    reset(false);
    expect(await pageCount(await renderCharacterSheet(buildSheetData(currentSheetSource()), { template }))).toBe(2);
  });

  test("overflowing text adds a clearly labelled supplement instead of corrupting the sheet", async () => {
    reset(false);
    replace({ name: "Overflow", description: "word ".repeat(200) });
    char.background.parents = "long ".repeat(400);
    const bytes = await renderCharacterSheet(buildSheetData(currentSheetSource()), { template });
    expect(await pageCount(bytes)).toBeGreaterThan(2);
  });

  test("characters with characters outside the PDF font still print", async () => {
    reset(false);
    replace({ name: "Ælfwynn 王", homeland: "Ísland ✓" });
    expect(await pageCount(await renderCharacterSheet(buildSheetData(currentSheetSource()), { template }))).toBe(2);
  });

  test("centres all seven attribute values by measured text and font bounds", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont("Helvetica-Bold");
    const values = ["2", "+1d2", "+0", "3", "12", "-1", "6", "+1d10+1d8"];
    for (const value of values) {
      const placement = circleTextPlacement(value, font, 340.5, 270, 20.4, 12);
      const width = font.widthOfTextAtSize(value, placement.size);
      const ascent = font.heightAtSize(placement.size, { descender: false });
      const descent = font.heightAtSize(placement.size, { descender: true }) - ascent;
      expect(placement.x + width / 2).toBeCloseTo(340.5, 5);
      expect(placement.baseline - (ascent - descent) / 2).toBeCloseTo(270, 5);
      expect(width).toBeLessThanOrEqual(20.4 - 2.5);
    }
    expect(circleTextPlacement("+1d2", font, 340.5, 270, 20.4, 12).size).toBeLessThan(12);
  });

  test("renders single, double, signed and dice values in the seven existing circles", async () => {
    reset(false);
    const data = buildSheetData(currentSheetSource());
    const populated = {
      ...data,
      characteristics: { STR: "9", CON: "12", SIZ: "10", DEX: "11", INT: "13", POW: "14", CHA: "8" },
      attributes: { actionPoints: "2", damageModifier: "+1d2", experienceModifier: "+0", healingRate: "3", initiative: "12", luckPoints: "-1", movement: "6" },
    };
    expect(await pageCount(await renderCharacterSheet(populated, { template }))).toBe(2);
  });
});
