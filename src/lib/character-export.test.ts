import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

Object.defineProperty(globalThis, "$state", { value: <T>(value: T) => value, configurable: true });
const { characterFilename, characterMarkdown, renderEditableCharacterSheet } = await import("./character-export");
const { buildSheetData } = await import("./sheet-data");
const { currentSheetSource } = await import("./sheet-source");
const { char, reset, replace } = await import("./store.svelte");
const { EQUIPMENT_CATALOGUE } = await import("./equipment-catalogue");
const template = readFileSync(new URL("../assets/mythras-character-sheet.pdf", import.meta.url));

describe("character downloads", () => {
  test("sanitizes filenames and falls back for an empty name", () => {
    expect(characterFilename("Éowyn / #1", ".pdf")).toBe("Eowyn - -1.pdf");
    expect(characterFilename("  ", ".md")).toBe("character.md");
    expect(characterFilename("../", ".md")).toBe("character.md");
  });

  test("Markdown escapes table content and includes distinct initial/current weapon HP", () => {
    reset(false);
    replace({ name: "A | B", description: "line one\nline | two" });
    const data = buildSheetData(currentSheetSource());
    const markdown = characterMarkdown(data, char);
    expect(markdown).toContain("A \\| B");
    expect(markdown).toContain("line one<br>line \\| two");
    expect(markdown).toContain("## Weapons and shields");
    expect(markdown).toContain("Initial HP");
    expect(markdown).toContain("Current HP");
    expect(markdown).toContain("| experienceModifier | 0 |");
  });

  test("PDF includes unique editable controls for populated and unused template rows", async () => {
    reset(false);
    replace({ name: "Mira", race: "Human" });
    const before = JSON.stringify(char);
    const bytes = await renderEditableCharacterSheet(buildSheetData(currentSheetSource()), { template });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    const form = doc.getForm();
    const fields = form.getFields();
    const names = fields.map(field => field.getName());
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("character.name");
    expect(names).toContain("skill.professional.15.name");
    expect(names).toContain("equipment.20.enc");
    expect(names).toContain("weapon.melee.7.current_hp");
    expect(names).toContain("weapon.ranged.3.initial_hp");
    expect(names).toContain("checkboxes.skills.standard.athletics");
    expect(names).toContain("checkboxes.fatigue.10");
    expect(names).toContain("hit_location.head.current_hp");
    expect(names).toContain("character.experience_rolls");
    expect(form.getTextField("character.name").getText()).toBe("Mira");
    expect(JSON.stringify(char)).toBe(before);
    expect(form.getTextField("character.player").getText() ?? "").toBe("");
    expect(form.getTextField("equipment.20.name").getText() ?? "").toBe("");
    const initialHpRect = form.getTextField("weapon.melee.1.initial_hp").acroField.getWidgets()[0]!.getRectangle();
    const currentHpRect = form.getTextField("weapon.melee.1.current_hp").acroField.getWidgets()[0]!.getRectangle();
    expect(initialHpRect.x).toBe(503);
    expect(initialHpRect.width).toBe(15);
    expect(currentHpRect.x).toBe(524);
    expect(currentHpRect.width).toBe(15);

    // A previously blank field can be edited, saved and reopened as a form value.
    form.getTextField("equipment.20.name").setText("Added after export");
    const saved = await doc.save();
    const reopened = await PDFDocument.load(saved);
    expect(reopened.getForm().getTextField("equipment.20.name").getText()).toBe("Added after export");
  });

  test("page-one widgets fit the official writable areas and keep every blank slot editable", async () => {
    reset(false);
    const bytes = await renderEditableCharacterSheet(buildSheetData(currentSheetSource()), { template });
    const doc = await PDFDocument.load(bytes);
    const form = doc.getForm();
    const page = doc.getPages()[0]!;
    const pageHeight = page.getHeight();
    const names = form.getFields().map(field => field.getName());
    expect(new Set(names).size).toBe(names.length);
    const checkAppearance = (name: string) => (form.getField(name) as unknown as {
      acroField: { getWidgets(): Array<{
        getAppearanceCharacteristics(): { getBorderColor(): number[] | undefined } | undefined;
        getBorderStyle(): { getWidth(): number | undefined } | undefined;
      }> };
    }).acroField.getWidgets()[0]!;
    expect(checkAppearance("checkboxes.characteristic.str").getBorderStyle()?.getWidth()).toBeCloseTo(0.01);
    expect(checkAppearance("checkboxes.skills.standard.athletics").getAppearanceCharacteristics()?.getBorderColor()).toEqual([1, 1, 1]);

    // Every editable annotation remains inside the A4 page, including empty rows.
    const page1Field = (name: string) => name.startsWith("character.") || name.startsWith("money.")
      || name.startsWith("magic.devotional_pool_") || name.startsWith("magic_points.") || name.startsWith("characteristic.") || name.startsWith("attribute.")
      || name.startsWith("skill.") || name.startsWith("passion.") || name.startsWith("checkboxes.characteristic.")
      || name.startsWith("checkboxes.attribute.") || name.startsWith("checkboxes.skills.");
    for (const field of form.getFields().filter(candidate => page1Field(candidate.getName()))) {
      const widgets = (field as unknown as { acroField: { getWidgets(): Array<{ getRectangle(): { x: number; y: number; width: number; height: number } }> } }).acroField.getWidgets();
      for (const widget of widgets) {
        const box = widget.getRectangle();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(page.getWidth());
        expect(box.y + box.height).toBeLessThanOrEqual(pageHeight);
      }
    }
    expect(form.getTextField("skill.professional.15.name").getText() ?? "").toBe("");
    expect(form.getTextField("skill.language.6.name").getText() ?? "").toBe("");
    expect(form.getCheckBox("checkboxes.skills.magical.9")).toBeDefined();
    form.getTextField("skill.professional.15.name").setText("Saved blank row");
    const reopened = await PDFDocument.load(await doc.save());
    expect(reopened.getForm().getTextField("skill.professional.15.name").getText()).toBe("Saved blank row");
  });

  test("keeps page-one field appearances on their printed row baselines and distinguishes the income fields", async () => {
    reset(false);
    const data = buildSheetData(currentSheetSource());
    data.standard.Athletics = "65";
    data.resistances.Brawn = "55";
    data.professional = [{ name: "Craft (Blacksmithing)", base: "48", total: "78" }];
    data.magical = [{ name: "Folk Magic", base: "34", total: "54" }];
    data.languages = [{ name: "Common", base: "50", total: "70", native: true }];
    data.passions = [{ label: "Loyalty (Family)", total: "70" }];
    const doc = await PDFDocument.load(await renderEditableCharacterSheet(data, { template }));
    const form = doc.getForm();
    const fontDoc = await PDFDocument.create();
    const helvetica = await fontDoc.embedFont(StandardFonts.Helvetica);
    const baselineTop = (target: number, height: number, size: number) =>
      target - (height + helvetica.heightAtSize(size, { descender: false })) / 2;
    const baseline = (name: string) => {
      const field = form.getTextField(name);
      const box = field.acroField.getWidgets()[0]!.getRectangle();
      const pageTop = doc.getPages()[0]!.getHeight() - box.y - box.height;
      const appearance = field.acroField.getDefaultAppearance() ?? "";
      const size = Number(appearance.match(/\/(?:Helv|Helvetica)\s+([\d.]+)\s+Tf/)?.[1]);
      expect(size).toBeGreaterThan(0);
      return pageTop + (box.height + helvetica.heightAtSize(size, { descender: false })) / 2;
    };
    const expectBaseline = (name: string, expected: number) => expect(baseline(name)).toBeCloseTo(expected, 2);

    expectBaseline("skill.standard.athletics", 469);
    expectBaseline("skill.resistance.brawn", 710);
    expectBaseline("skill.professional.1.name", 469.8);
    expectBaseline("skill.professional.15.name", 637.8); // Unused rows retain their writing baseline.
    expectBaseline("skill.magical.1.name", 541.4);
    expectBaseline("skill.language.1.name", 685.4);
    expectBaseline("skill.language.6.name", 745.4);
    expectBaseline("passion.1.name", 685.4);
    expectBaseline("passion.6.name", 745.4);
    for (const period of ["day", "week", "season", "year"]) {
      expectBaseline(`money.income.${period}`, 229.5);
    }
    expect(form.getTextField("skill.professional.1.name").getText()).toBe("Craft (Blacksmithing)");
    expect(form.getTextField("skill.professional.15.name").getText() ?? "").toBe("");

    const names = form.getFields().map(field => field.getName());
    const incomeNames = names.filter(name => /^money\.income\.(day|week|season|year)$/.test(name)).sort();
    expect(incomeNames).toEqual(["money.income.day", "money.income.season", "money.income.week", "money.income.year"]);
    expect(names.filter(name => name.startsWith("money.income."))).toHaveLength(4);
    expect(names).not.toContain("money.silver_pieces");
    const widget = (name: string) => form.getTextField(name).acroField.getWidgets()[0]!.getRectangle();
    const pageTop = (box: { y: number; height: number }) => doc.getPages()[0]!.getHeight() - box.y - box.height;
    for (const [period, x] of [["day", 457], ["week", 487], ["season", 517], ["year", 547]] as const) {
      const field = form.getTextField(`money.income.${period}`);
      const widgets = field.acroField.getWidgets();
      expect(widgets).toHaveLength(1);
      const box = widgets[0]!.getRectangle();
      expect(box.x).toBe(x);
      expect(box.width).toBe(18);
      expect(box.height).toBe(7);
      // The four template entries share one printed row above the Silver Pieces line.
      // In top-left page coordinates the writable strip is y=223..231 pt.
      expect(pageTop(box)).toBeGreaterThanOrEqual(223);
      expect(pageTop(box) + box.height).toBeLessThanOrEqual(231);
      expect(pageTop(box) + box.height).toBeLessThan(239); // Official Money & Wealth bottom border.
      expect(pageTop(box)).toBeCloseTo(223.487, 2);
    }
    const cult = widget("character.cult_information");
    const cultTop = doc.getPages()[0]!.getHeight() - cult.y - cult.height;
    for (const period of ["day", "week", "season", "year"]) {
      const box = widget(`money.income.${period}`);
      expect(pageTop(box) + box.height).toBeLessThan(cultTop);
    }
    for (const period of ["day", "week", "season", "year"]) {
      const field = form.getTextField(`money.income.${period}`);
      field.setText(period);
    }
    const reopened = await PDFDocument.load(await doc.save());
    for (const period of ["day", "week", "season", "year"]) {
      expect(reopened.getForm().getTextField(`money.income.${period}`).getText()).toBe(period);
    }
  });

  test("debug outlines apply only to page-one text and checkbox widgets", async () => {
    reset(false);
    const bytes = await renderEditableCharacterSheet(buildSheetData(currentSheetSource()), { template, debugPage1Outlines: true });
    const form = (await PDFDocument.load(bytes)).getForm();
    const widget = (name: string) => (form.getField(name) as unknown as {
      acroField: { getWidgets(): Array<{
        getBorderStyle(): { getWidth(): number | undefined } | undefined;
        getAppearanceCharacteristics(): { getBorderColor(): number[] | undefined } | undefined;
      }> };
    }).acroField.getWidgets()[0]!;
    const borderColor = (name: string) => widget(name).getAppearanceCharacteristics()?.getBorderColor();
    const borderWidth = (name: string) => widget(name).getBorderStyle()?.getWidth() ?? 0;

    expect(borderWidth("character.name")).toBeCloseTo(0.6);
    expect(borderColor("character.name")).toEqual([0.9, 0, 0]);
    expect(borderWidth("checkboxes.characteristic.str")).toBeCloseTo(0.6);
    expect(borderColor("checkboxes.characteristic.str")).toEqual([0, 0, 0.9]);

    expect(borderWidth("combat_style.1.name")).toBe(0);
    expect(borderColor("combat_style.1.name")).toBeUndefined();
    expect(borderWidth("checkboxes.combat_style.1")).toBe(0);
    expect(borderColor("checkboxes.combat_style.1")).toBeUndefined();
  });

  test("keeps long editable notes legible and confines long labels to their page-one columns", async () => {
    reset(false);
    const data = buildSheetData(currentSheetSource());
    data.notes = [
      "A long background note describing a complicated family history, several migrations, and the character's obligations to the people who raised them.",
      "A second paragraph records training, local customs, and unresolved promises that should remain available when the PDF is edited later.",
      "A third paragraph makes sure wrapping uses the Notes box height without reducing every line to tiny text.",
    ];
    data.professional = [{ name: "Invocation (Bright)", base: "78", total: "108" }];
    data.languages[0] = { ...data.languages[0]!, name: "Common", native: true };
    data.passions = [
      { label: "Love (My Family and Homeland)", total: "91" },
      { label: "Hate (The Usurper's Entire House)", total: "84" },
    ];
    const bytes = await renderEditableCharacterSheet(data, { template });
    const doc = await PDFDocument.load(bytes);
    const form = doc.getForm();
    const noteValue = data.notes.join("\n");
    expect(form.getTextField("character.notes").getText()).toBe(noteValue);

    const rect = (name: string) => form.getTextField(name).acroField.getWidgets()[0]!.getRectangle();
    const passionName = rect("passion.2.name"), passionPercent = rect("passion.2.value");
    expect(passionName.x + passionName.width).toBeLessThan(passionPercent.x);
    expect(rect("skill.language.1.name").x).toBeGreaterThan(247);
    expect(rect("skill.professional.1.name").x).toBeGreaterThan(219);
    expect(form.getTextField("skill.professional.1.name").getText()).toBe("Invocation (Bright)");
    expect(form.getTextField("skill.language.1.name").getText()).toBe("Common");

    const reopened = await PDFDocument.load(await doc.save());
    expect(reopened.getForm().getTextField("character.notes").getText()).toBe(noteValue);
    expect(reopened.getForm().getTextField("passion.2.name").getText()).toBe("Hate (The Usurper's Entire House)");
  });

  test("places Character Details text above each printed writing rule without clipping descenders", async () => {
    reset(false);
    const data = buildSheetData(currentSheetSource());
    Object.assign(data.identity, { name: "Freddy Unwin", player: "Gwyn", race: "Human / Civilised", gender: "Male", frame: "Lithe",
      homeland: "Meeros", age: "24", height: "178 cm", career: "Sorcerer", handedness: "Right", weight: "70 kg", socialClass: "Gentry" });
    const doc = await PDFDocument.load(await renderEditableCharacterSheet(data, { template }));
    const form = doc.getForm();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pageHeight = doc.getPage(0).getHeight();
    // Rule tops measured from the official template, in top-origin points.
    const rules: Record<string, number> = {
      name: 38.8, player: 54.8, race_culture: 54.8, gender: 70.8, frame: 70.8, homeland: 70.8,
      age: 86.8, height: 86.8, career: 86.8, handedness: 102.8, weight: 102.8, social_class: 102.8,
    };
    for (const [key, ruleTop] of Object.entries(rules)) {
      const field = form.getTextField(`character.${key}`);
      const rect = field.acroField.getWidgets()[0]!.getRectangle();
      const size = Number(/([\d.]+) Tf/.exec(field.acroField.getDefaultAppearance() ?? "")?.[1]);
      // pdf-lib's single-line appearance: 1pt inset, ascender box centred vertically.
      const baseline = rect.y + rect.height / 2 - font.heightAtSize(size, { descender: false }) / 2;
      const descenderBottom = baseline - (font.heightAtSize(size) - font.heightAtSize(size, { descender: false }));
      expect(field.getText()).toBeTruthy();
      expect(rect.y).toBeGreaterThanOrEqual(pageHeight - ruleTop - 0.01);
      expect(descenderBottom).toBeGreaterThanOrEqual(rect.y + 1 - 0.01);
      expect(baseline - (pageHeight - ruleTop)).toBeLessThan(4);
    }
  });

  test("shrinks long Notes to fit their printed box and continues overflow on an editable page", async () => {
    reset(false);
    const data = buildSheetData(currentSheetSource());
    const paragraph = (index: number) => `${index}. Background: grew up in the river quarter, apprenticed to a hedge wizard, fled after an accident with a summoning circle and now wanders looking for answers.`;
    const fontSize = (field: ReturnType<ReturnType<PDFDocument["getForm"]>["getTextField"]>) =>
      Number(/([\d.]+) Tf/.exec(field.acroField.getDefaultAppearance() ?? "")?.[1]);

    data.notes = Array.from({ length: 5 }, (_, index) => paragraph(index + 1));
    let doc = await PDFDocument.load(await renderEditableCharacterSheet(data, { template }));
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getForm().getTextField("character.notes").getText()).toBe(data.notes.join("\n"));
    expect(fontSize(doc.getForm().getTextField("character.notes"))).toBeLessThan(8.5);
    expect(fontSize(doc.getForm().getTextField("character.notes"))).toBeGreaterThanOrEqual(6);

    data.notes = Array.from({ length: 12 }, (_, index) => paragraph(index + 1));
    doc = await PDFDocument.load(await (await PDFDocument.load(await renderEditableCharacterSheet(data, { template }))).save());
    expect(doc.getPageCount()).toBe(3);
    const kept = doc.getForm().getTextField("character.notes").getText()!;
    const rest = doc.getForm().getTextField("character.notes_continued").getText()!;
    expect(kept.endsWith("(Continued on page 3: Notes, continued)")).toBe(true);
    const words = (text: string) => text.split(/\s+/).filter(Boolean);
    const shown = kept.slice(0, kept.lastIndexOf("\n"));
    expect([...words(shown), ...words(rest)]).toEqual(words(data.notes.join("\n")));
    expect(fontSize(doc.getForm().getTextField("character.notes"))).toBe(6);

    data.notes = [];
    doc = await PDFDocument.load(await renderEditableCharacterSheet(data, { template }));
    expect(doc.getPageCount()).toBe(2);
    const empty = doc.getForm().getTextField("character.notes");
    expect(empty.isReadOnly()).toBe(false);
    empty.setText("Player-written note");
    const reopened = await PDFDocument.load(await doc.save());
    expect(reopened.getForm().getTextField("character.notes").getText()).toBe("Player-written note");
  });

  test("exports distinct recorded weapon HP values and leaves the print renderer independent", async () => {
    reset(false);
    char.name = "Rook";
    char.background.inventory = ["one_handed-battleaxe", "shields-viking", "ranged-long-bow"].map((catalogueId, index) => {
      const source = EQUIPMENT_CATALOGUE.find(row => row.source.id === catalogueId)!.source;
      return {
        id: `export-${index}`, catalogueId, sourceIds: [catalogueId], name: source.name, quantity: 1,
        acquiredAs: "gifted" as const, state: "carried" as const, encPerUnit: source.enc_candidate ?? null,
        encSource: "catalogue_candidate" as const, currentHp: index === 0 ? 5 : index === 1 ? 10 : 6,
      };
    });
    const data = buildSheetData(currentSheetSource());
    const bytes = await renderEditableCharacterSheet(data, { template });
    const form = (await PDFDocument.load(bytes)).getForm();
    // The exact same two HP halves used by the existing print mapping remain separate fields.
    expect(form.getTextField("weapon.melee.1.initial_hp").getText()).toBe("8");
    expect(form.getTextField("weapon.melee.1.current_hp").getText()).toBe("5");
    expect(form.getTextField("weapon.melee.2.initial_hp").getText()).toBe("12");
    expect(form.getTextField("weapon.melee.2.current_hp").getText()).toBe("10");
    expect(form.getTextField("weapon.ranged.1.initial_hp").getText()).toBe("7");
    expect(form.getTextField("weapon.ranged.1.current_hp").getText()).toBe("6");
  });
});
