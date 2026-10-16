import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { PDFArray, PDFDocument, PDFRawStream, StandardFonts } from "pdf-lib";

Object.defineProperty(globalThis, "$state", { value: <T>(value: T) => value, configurable: true });
const { char, replace, reset } = await import("./store.svelte");
const { buildMagicEntries, buildSheetData, SHEET_HIT_LOCATIONS } = await import("./sheet-data");
const { currentSheetSource } = await import("./sheet-source");
const { circleTextPlacement, renderCharacterSheet } = await import("./sheet-pdf");
const { sorceryCatalogue } = await import("./sorcery");
const { CORE_MYSTICISM_PATHS } = await import("./mysticism");
const { EQUIPMENT_CATALOGUE } = await import("./equipment-catalogue");

const template = readFileSync(new URL("../assets/mythras-character-sheet.pdf", import.meta.url));
const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();
const renderedTextRunsByPage = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map(page => {
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
  });
};
const renderedTextRuns = async (bytes: Uint8Array) => (await renderedTextRunsByPage(bytes)).flat();
const renderedTextByPage = async (bytes: Uint8Array) => (await renderedTextRunsByPage(bytes)).map(runs => runs.join(" "));
const renderedText = async (bytes: Uint8Array) => (await renderedTextRuns(bytes)).join(" ");
const renderedTextPlacementsByPage = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map(page => {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    return streams.flatMap(reference => {
      const stream = doc.context.lookup(reference);
      if (!(stream instanceof PDFRawStream)) return [];
      try {
        const content = inflateSync(stream.getContents()).toString("latin1");
        return [...content.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm\s*<([\da-f]+)>\s*Tj/gi)].map(([, x, y, hex]) => ({
          text: Buffer.from(hex!, "hex").toString("latin1"), x: Number(x), y: Number(y),
        }));
      } catch {
        return [];
      }
    });
  });
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

  test("prints legacy shield names with the shield type without changing equipment count", () => {
    reset(false);
    char.background.inventory = [{ id: "legacy-viking", catalogueId: "shields-viking", sourceIds: ["shields-viking"],
      name: "Viking", quantity: 1, acquiredAs: "inherited", state: "carried", encPerUnit: 3, encSource: "catalogue_candidate" }];
    const data = buildSheetData(currentSheetSource());
    expect(data.equipment.map(item => item.name)).toEqual(["Viking Shield"]);
    expect(data.weapons.map(item => item.name)).toEqual(["Viking Shield"]);
  });

  test("maps owned melee traits separately from ranged table fields and keeps each row's ENC", async () => {
    reset(false);
    const ids = ["one_handed-broadsword", "shields-viking", "one_handed-rapier", "ranged-long-bow", "ranged-short-bow"];
    char.background.inventory = ids.map(catalogueId => {
      const catalogue = EQUIPMENT_CATALOGUE.find(entry => entry.source.id === catalogueId)!.source;
      return {
        id: `owned-${catalogueId}`, catalogueId, sourceIds: [catalogueId], name: catalogue.name, quantity: 1,
        acquiredAs: "gifted" as const, state: "carried" as const,
        encPerUnit: catalogue.enc_candidate ?? null,
        encSource: catalogue.enc_candidate === undefined ? "unresolved" as const : "catalogue_candidate" as const,
      };
    });
    const data = buildSheetData(currentSheetSource());
    expect(data.weapons).toEqual([
      expect.objectContaining({ name: "Broadsword", damage: "1d8", size: "M", reach: "M", traits: "Bleed, Impale", combatEffects: "", ap: "6", hp: "10", enc: "2", ranged: false }),
      expect.objectContaining({ name: "Viking Shield", damage: "1d4", size: "L", reach: "S", traits: "Bash, Stun Location", combatEffects: "", ap: "4", hp: "12", enc: "3", ranged: false }),
      expect.objectContaining({ name: "Rapier", traits: "Impale", ranged: false }),
      expect.objectContaining({ name: "Long bow", damage: "1d8", force: "H", damageModifier: "Y", range: "15/125/250", load: "2", combatEffects: "Impale", ap: "4", hp: "7", enc: "1", ranged: true }),
      expect.objectContaining({ name: "Short bow", damage: "1d6", force: "L", damageModifier: "Y", range: "15/100/200", load: "2", combatEffects: "Impale", ap: "4", hp: "4", enc: "1", ranged: true }),
    ]);
    for (const mode of ["titles-and-appendix", "titles-only", "notes-and-appendix", "notes-only", "appendix-only"] as const) {
      const pdf = await renderCharacterSheet(data, { template, mode });
      const page2 = (await renderedTextByPage(pdf))[1]!;
      expect(page2).toContain("Bleed, Impale");
      expect(page2).toContain("Bash, Stun Location");
      expect(page2).toContain("Long bow");
      expect(page2).toContain("1d8");
      expect(page2).not.toContain("15/125/250");
      expect(page2).not.toContain("15/100/200");

      const placements = (await renderedTextPlacementsByPage(pdf))[1]!;
      const expectedBands = ["15", "125", "250", "15", "100", "200"];
      const rangeRuns = placements.filter(run => expectedBands.includes(run.text) && run.y >= 90 && run.y <= 120);
      expect(rangeRuns.map(run => run.text)).toEqual(expectedBands);
      const helvetica = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
      const centres = rangeRuns.map(run => run.x + helvetica.widthOfTextAtSize(run.text, 8.5) / 2);
      expect(centres).toEqual([247, 267, 286, 247, 267, 286]);
      const rangedEnc = placements.find(run => run.text === "1" && Math.abs(run.y - (841.89 - 722.6)) < 0.01);
      expect(rangedEnc).toBeDefined();
      expect(rangedEnc!.x + helvetica.widthOfTextAtSize("1", 8.5) / 2).toBeCloseTo(556, 5);
      expect(placements.filter(run => ["18", "28", "42"].includes(run.text) && run.y >= 90 && run.y <= 180)).toEqual([]);
    }
  });

  test("preserves custom equipment names that match a shield name", () => {
    reset(false);
    char.background.inventory = [{ id: "custom-viking", catalogueId: null, sourceIds: [], name: "Viking", quantity: 1,
      acquiredAs: "gifted", state: "carried", encPerUnit: null, encSource: "unresolved",
      customItem: { id: "custom-viking", type: "gear", name: "Viking", description: "", priceCp: null, enc: null, updatedAt: "" } }];
    expect(buildSheetData(currentSheetSource()).equipment.map(item => item.name)).toEqual(["Viking"]);
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
    expect(data.magic.map(entry => entry.tradition)).toEqual(["Sorcery", "Sorcery", "Sorcery", "Animism"]);
    expect(data.magic[0].detail).toContain("Physical Characteristics resist with Endurance");
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

  test("prints the three selectable magic output modes from known spells", async () => {
    reset(false);
    replace({ name: "Three Spells" });
    const spells = sorceryCatalogue(char.magic.sorcery);
    char.magic.sorcery.knownSpells = ["Diminish", "Enhance", "Regenerate"].map(name => ({
      spellId: spells.find(spell => spell.name === name)?.id ?? "missing",
    }));
    const data = buildSheetData(currentSheetSource());
    expect(data.magic).toHaveLength(3);
    const sheetOnly = await renderCharacterSheet(data, { template, mode: "titles-only" });
    expect(await pageCount(sheetOnly)).toBe(2);
    const sheetOnlyText = await renderedText(sheetOnly);
    expect(sheetOnlyText).not.toContain("Full descriptions: Magic Appendix");
    expect(sheetOnlyText).not.toContain("see Magic Appendix");
    const combined = await renderCharacterSheet(data, { template, mode: "titles-and-appendix" });
    expect(await pageCount(combined)).toBeGreaterThan(2);
    expect(await renderedText(combined)).toContain("Full descriptions: Magic Appendix");
    expect(await pageCount(await renderCharacterSheet(data, { template, mode: "appendix-only" }))).toBeGreaterThan(0);
    const appendix = await renderedText(await renderCharacterSheet(data, { template, mode: "appendix-only" }));
    expect(appendix).toContain("Magic & Abilities");
    expect(appendix).toContain("Three Spells");
    expect(appendix).toContain("Regenerate");
  });

  test("appendix-only falls back to the official sheet when there are no recorded abilities", async () => {
    reset(false);
    const data = buildSheetData(currentSheetSource());
    expect(await pageCount(await renderCharacterSheet(data, { template, mode: "appendix-only" }))).toBe(2);
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
      tradition: "Sorcery", summary: `Sorcery: Spell ${index + 1} — meaningful effect`, detail: `Sorcery — Spell ${index + 1}\nRules: meaningful effect ${"with recorded details ".repeat(8)}${index === 19 ? " FINAL SPELL DETAIL" : ""}`,
    })) };
    const sheetOnly = await renderCharacterSheet(many, { template, mode: "titles-only" });
    const sheetOnlyText = await renderedText(sheetOnly);
    expect(await pageCount(sheetOnly)).toBe(2);
    expect(sheetOnlyText).not.toContain("see Magic Appendix");
    expect(sheetOnlyText).not.toContain("Full descriptions: Magic Appendix");
    expect(sheetOnlyText).toContain("Additional magic details omitted due to space");
    const longSpellName = `Long-${"Z".repeat(95)}`;
    many.magic.push({ tradition: "Sorcery", summary: "Sorcery: long custom spell", detail: `${longSpellName}\nRules: long custom spell detail` });
    const bytes = await renderCharacterSheet(many, { template });
    const doc = await PDFDocument.load(bytes);
    const text = await renderedText(bytes);
    const runs = await renderedTextRuns(bytes);
    const supplementBold = await doc.embedFont(StandardFonts.HelveticaBold);
    expect(doc.getPageCount()).toBeGreaterThan(2);
    expect(text).toContain("Full descriptions: Magic Appendix");
    expect(text).toContain("see Magic Appendix");
    expect(text).toContain("FINAL SPELL DETAIL");
    expect(text.indexOf("Spell 1")).toBeLessThan(text.indexOf("Spell 20"));
    expect(runs.filter(run => run.includes("Z")).map(run => run.match(/Z+/)?.[0].length ?? 0).reduce((sum, length) => sum + length, 0)).toBe(95);
    expect(runs.filter(run => run.includes("Z")).every(run => supplementBold.widthOfTextAtSize(run, 10.5) <= 595.276 - 42 * 2)).toBe(true);
    expect(many.identity.name).toBe("Many Spells");
  });

  test("prints reference details for short summaries and a starting path without Talents", async () => {
    reset(false);
    replace({ name: "Sparse Magic" });
    char.magic.mysticism.startingPathId = CORE_MYSTICISM_PATHS[0].id;
    char.magic.mysticism.knownTalents = [];
    char.magic.animism.spirits = [{
      id: "small-reference-spirit", name: "Moss", spiritTypeId: "core:animism:guardian", source: "core",
      pow: 13, abilities: ["Warding"], notes: `Spirit detail note ${"recorded detail ".repeat(120)}`,
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

  test("includes complete multi-sentence sorcery effects in the appendix", async () => {
    reset(false);
    const spells = sorceryCatalogue(char.magic.sorcery);
    char.magic.sorcery.knownSpells = ["Diminish", "Enhance", "Regenerate"].map(name => ({
      spellId: spells.find(spell => spell.name === name)?.id ?? "missing",
    }));
    const data = buildSheetData(currentSheetSource());
    const bytes = await renderCharacterSheet(data, { template });
    const text = await renderedText(bytes);
    expect(text).toContain("Reduces");
    expect(text).toContain("Physical Characteristics resist with Endurance; mental Characteristics resist with Willpower.");
    expect(text).toContain("When resistance applies, physical Characteristics use Endurance and mental ones Willpower.");
    expect(text).toContain("but cannot repair Major Wounds.");
    expect(text).toContain("while concentration continues.");
    expect(text).not.toContain("…");
  });

  test("renders all five modes with names-only or available rules notes", async () => {
    reset(false);
    const spells = sorceryCatalogue(char.magic.sorcery);
    char.magic.sorcery.knownSpells = ["Diminish", "Enhance", "Regenerate"].map(name => ({
      spellId: spells.find(spell => spell.name === name)?.id ?? "missing",
    }));
    const data = buildSheetData(currentSheetSource());
    const titleBytes = await renderCharacterSheet(data, { template, mode: "titles-only" });
    const noteBytes = await renderCharacterSheet(data, { template, mode: "notes-only" });
    const notesAndAppendixBytes = await renderCharacterSheet(data, { template, mode: "notes-and-appendix" });
    const titleText = await renderedText(titleBytes);
    const noteText = await renderedText(noteBytes);
    const notesAndAppendixPages = await renderedTextByPage(notesAndAppendixBytes);
    expect(await pageCount(titleBytes)).toBe(2);
    expect(await pageCount(noteBytes)).toBe(2);
    expect(titleText).toContain("Diminish");
    expect(titleText).not.toContain("Reduces");
    expect(noteText).toContain("Diminish");
    expect(noteText).toContain("Reduces");
    expect(await pageCount(notesAndAppendixBytes)).toBeGreaterThan(2);
    expect(notesAndAppendixPages[1]).toContain("Diminish");
    expect(notesAndAppendixPages[1]).toContain("Reduces the specified subject by 2 points per Intensity");
    expect(notesAndAppendixPages.some(page => page.includes("Magic & Abilities")
      && page.includes("Physical Characteristics resist with Endurance; mental Characteristics resist with Willpower."))).toBe(true);
    const appendixOnly = await renderCharacterSheet(data, { template, mode: "appendix-only" });
    expect(await pageCount(appendixOnly)).toBeGreaterThan(0);
    expect(await renderedText(appendixOnly)).not.toContain("Player name");
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

  test("shares the PDF ability selector and returns no entries for a character with no recorded magic", () => {
    reset(false);
    expect(buildMagicEntries(char)).toEqual([]);
    const spells = sorceryCatalogue(char.magic.sorcery);
    char.magic.sorcery.knownSpells = ["Diminish"].map(name => ({ spellId: spells.find(spell => spell.name === name)?.id ?? "missing" }));
    expect(buildMagicEntries(char).map(entry => entry.tradition)).toEqual(["Sorcery"]);
  });
});
