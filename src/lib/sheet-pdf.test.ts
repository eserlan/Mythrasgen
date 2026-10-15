import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";

Object.defineProperty(globalThis, "$state", { value: <T>(value: T) => value, configurable: true });
const { char, replace, reset } = await import("./store.svelte");
const { buildSheetData, SHEET_HIT_LOCATIONS } = await import("./sheet-data");
const { currentSheetSource } = await import("./sheet-source");
const { circleTextPlacement, renderCharacterSheet } = await import("./sheet-pdf");
const { sorceryCatalogue } = await import("./sorcery");
const { CORE_MYSTICISM_PATHS } = await import("./mysticism");

const template = readFileSync(new URL("../assets/mythras-character-sheet.pdf", import.meta.url));
const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();
const renderedText = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().flatMap(page => {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    return streams.flatMap(reference => {
      const stream = doc.context.lookup(reference);
      if (!(stream instanceof PDFRawStream)) return [];
      try {
        const content = inflateSync(stream.getContents()).toString("latin1");
        return [...content.matchAll(/<([\da-f]+)>\s*Tj/gi)].map(([, hex]) => Buffer.from(hex, "hex").toString("latin1"));
      } catch {
        return [];
      }
    });
  }).join(" ");
};

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
    expect(data.equipment.map(item => item.name)).not.toContain("Rapier");
  });

  test("lists only owned inventory on the PDF and keeps its available ENC and weapon stats", () => {
    reset(false);
    const empty = buildSheetData(currentSheetSource());
    expect(empty.equipment).toEqual([]);
    char.background.inventory = [{
      id: "owned-rapier", catalogueId: null, sourceIds: [], name: "Rapier", quantity: 2, acquiredAs: "gifted", state: "carried",
      encPerUnit: 1, encSource: "gm_override",
      customItem: { id: "custom-rapier", name: "Rapier", type: "weapon", description: "", priceCp: null, enc: 1,
        damage: "1d8", size: "M", reach: "M", ap: 0, hp: 8, hands: 1, updatedAt: "" },
    }];
    const data = buildSheetData(currentSheetSource());
    expect(data.equipment).toEqual([{ name: "Rapier ×2", enc: "2" }]);
    expect(data.weapons).toEqual([expect.objectContaining({ name: "Rapier ×2", damage: "1d8", size: "M", reach: "M", ap: "0", hp: "8", enc: "2", ranged: false })]);
    expect(data.combatStyles).toEqual([]);
  });

  test("maps resolved owned armour AP and ENC while leaving empty current weapon HP blank", () => {
    reset(false);
    char.background.inventory = [{
      id: "owned-armour", catalogueId: null, sourceIds: [], name: "Padded coat", quantity: 1, acquiredAs: "gifted", state: "worn",
      encPerUnit: 1, encSource: "gm_override",
      armour: { construction: "padded_quilted", material: "linen", locations: ["Chest"], coverageResolved: true, state: "worn", fit: "fitted", compatibility: "compatible", apOverride: 3, encOverride: 1 },
    }];
    const data = buildSheetData(currentSheetSource());
    expect(data.armour).toEqual([{ name: "Padded coat", ap: "3", enc: "1" }]);
    expect(data.equipment).toEqual([{ name: "Padded coat", enc: "1" }]);
    expect(data.encumbrance.armour).toBe("1");
    expect(data.encumbrance.armourPenalty).toBe("1");
    expect(data.encumbrance.total).toBe("0.5");
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

  test("resolves detailed references only for the selected sorcery spells and recorded spirits", () => {
    reset(false);
    const source = currentSheetSource();
    const spells = sorceryCatalogue(char.magic.sorcery);
    char.magic.sorcery.knownSpells = ["Diminish", "Enhance", "Regenerate"].map(name => ({
      spellId: spells.find(spell => spell.name === name)?.id ?? "missing",
    }));
    char.magic.animism.spirits = [{
      id: "known-spirit", name: "Moss Guardian", spiritTypeId: "core:animism:guardian", source: "core",
      pow: 13, int: 8, ins: 11, cha: 9, abilities: ["Warding"], notes: "Player note",
    }];
    const data = buildSheetData(source);
    const text = data.magic.map(entry => `${entry.summary}\n${entry.detail}`).join("\n");
    expect(text).toContain("Reduces");
    expect(text).toContain("Accelerates natural healing");
    expect(text).toContain("POW 13");
    expect(text).toContain("Abilities: Warding");
    expect(text).toContain("Player/GM notes: Player note");
    expect(data.magic).toHaveLength(4);
  });

  test("includes a selected Mysticism path even when no Talents are recorded", () => {
    reset(false);
    char.magic.mysticism.startingPathId = CORE_MYSTICISM_PATHS[0].id;
    char.magic.mysticism.knownTalents = [];
    const data = buildSheetData(currentSheetSource());
    expect(data.magic.some(entry => entry.summary.includes(CORE_MYSTICISM_PATHS[0].name))).toBe(true);
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

  test("many magical abilities append readable reference pages with the selected character's name", async () => {
    reset(false);
    replace({ name: "Many Spells" });
    const data = buildSheetData(currentSheetSource());
    const many = { ...data, magic: Array.from({ length: 20 }, (_, index) => ({
      summary: `Sorcery: Spell ${index + 1} — meaningful effect`, detail: `Sorcery — Spell ${index + 1}\nRules: meaningful effect ${"with recorded details ".repeat(8)}`,
    })) };
    const bytes = await renderCharacterSheet(many, { template });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(2);
    expect(many.identity.name).toBe("Many Spells");
  });

  test("prints reference details for short summaries and a starting path without Talents", async () => {
    reset(false);
    replace({ name: "Sparse Magic" });
    char.magic.mysticism.startingPathId = CORE_MYSTICISM_PATHS[0].id;
    char.magic.mysticism.knownTalents = [];
    char.magic.animism.spirits = [{
      id: "small-reference-spirit", name: "Moss", spiritTypeId: "core:animism:guardian", source: "core",
      pow: 13, abilities: ["Warding"], notes: "Spirit detail note",
    }];
    const data = buildSheetData(currentSheetSource());
    const bytes = await renderCharacterSheet(data, { template });
    const text = await renderedText(bytes);
    expect(await pageCount(bytes)).toBeGreaterThan(2);
    expect(text).toContain(CORE_MYSTICISM_PATHS[0].name);
    expect(text).toContain("POW 13");
    expect(text).toContain("Abilities: Warding");
    expect(text).toContain("Spirit detail note");
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

  test("centres single- and double-digit hit-location values using the circle's measured centre", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont("Helvetica-Bold");
    for (const value of ["6", "12"]) {
      const placement = circleTextPlacement(value, font, 136, 298.8, 21.5, 13);
      const width = font.widthOfTextAtSize(value, placement.size);
      const ascent = font.heightAtSize(placement.size, { descender: false });
      const descent = font.heightAtSize(placement.size, { descender: true }) - ascent;
      expect(placement.x + width / 2).toBeCloseTo(136, 5);
      expect(placement.baseline - (ascent - descent) / 2).toBeCloseTo(298.8, 5);
      expect(width).toBeLessThanOrEqual(21.5 - 2.5);
    }
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
