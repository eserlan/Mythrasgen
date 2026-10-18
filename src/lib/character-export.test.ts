import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

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
    const rect = (name: string) => {
      const field = form.getField(name) as { acroField: { getWidgets(): { getRectangle(): { x: number; y: number; width: number; height: number } }[] } };
      const box = field.acroField.getWidgets()[0]!.getRectangle();
      return { x: box.x, top: pageHeight - box.y - box.height, width: box.width, height: box.height };
    };
    const expectRect = (name: string, expected: { x: number; top: number; width: number; height: number }) => {
      const actual = rect(name);
      expect(actual.x).toBeCloseTo(expected.x, 2);
      expect(actual.top).toBeCloseTo(expected.top, 2);
      expect(actual.width).toBeCloseTo(expected.width, 2);
      expect(actual.height).toBeCloseTo(expected.height, 2);
    };

    const names = form.getFields().map(field => field.getName());
    expect(new Set(names).size).toBe(names.length);
    expectRect("character.name", { x: 100, top: 32.5, width: 274, height: 8 });
    expectRect("character.description", { x: 76, top: 111, width: 298, height: 27 });
    expectRect("character.notes", { x: 33, top: 161, width: 347, height: 76 });
    expectRect("character.experience_rolls", { x: 409, top: 111, width: 163, height: 31 });
    expectRect("money.income.day", { x: 457, top: 224.5, width: 18, height: 7 });
    expectRect("money.silver_pieces", { x: 459, top: 224.5, width: 18, height: 7 });
    expectRect("magic_points.used_active_effects", { x: 553, top: 490, width: 18, height: 7 });
    expectRect("character.cult_information", { x: 416, top: 263, width: 155, height: 145 });
    expectRect("magic.devotional_pool_current", { x: 509, top: 415, width: 22, height: 7 });
    expectRect("magic.devotional_pool_maximum", { x: 551, top: 415, width: 18, height: 7 });
    expectRect("characteristic.str", { x: 143.4, top: 261.2, width: 17.2, height: 17.6 });
    expectRect("attribute.actionPoints", { x: 331.7, top: 261.2, width: 17.6, height: 17.6 });
    expectRect("skill.professional.15.name", { x: 220.25, top: 632.8 - 3, width: 65.5, height: 7 });
    expectRect("skill.magical.9.total", { x: 549.25, top: 536.4 + 8 * 12 - 3, width: 21.5, height: 7 });
    expectRect("skill.standard.athletics", { x: 165.25, top: 461, width: 21.5, height: 7 });
    expectRect("skill.resistance.brawn", { x: 165.25, top: 702, width: 21.5, height: 7 });
    expectRect("skill.language.6.name", { x: 220.25, top: 680.4 + 5 * 12 - 3, width: 104.5, height: 7 });
    expectRect("passion.6.name", { x: 413.25, top: 680.4 + 5 * 12 - 3, width: 112.5, height: 7 });
    expectRect("checkboxes.characteristic.str", { x: 168.395, top: 261.195, width: 17.61, height: 17.61 });
    expectRect("checkboxes.attribute.action_points", { x: 356.395, top: 261.195, width: 17.61, height: 17.61 });
    expectRect("checkboxes.skills.professional.1", { x: 335.495, top: 464.495, width: 6.21, height: 6.21 });
    expectRect("checkboxes.skills.magical.9", { x: 526.495, top: 632.095, width: 6.21, height: 6.21 });
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
    expect(form.getTextField("character.notes").isScrollable()).toBe(true);
    expect((form.getTextField("character.notes") as unknown as { acroField: { getDefaultAppearance(): string | undefined } }).acroField.getDefaultAppearance()).toContain("8.5 Tf");

    const rect = (name: string) => form.getTextField(name).acroField.getWidgets()[0]!.getRectangle();
    const passionName = rect("passion.2.name"), passionPercent = rect("passion.2.value");
    expect(passionName.x + passionName.width).toBeLessThan(passionPercent.x);
    expect(passionName.x + passionName.width).toBeLessThan(548);
    expect(rect("skill.language.1.name").x).toBeGreaterThan(247);
    expect(rect("skill.language.1.name").x + rect("skill.language.1.name").width).toBeLessThan(321);
    expect(rect("skill.professional.1.name").x).toBeGreaterThan(219);
    expect(form.getTextField("skill.professional.1.name").getText()).toBe("Invocation (Bright)");
    expect(form.getTextField("skill.language.1.name").getText()).toBe("Common");
    expect((form.getTextField("passion.1.name") as unknown as { acroField: { getDefaultAppearance(): string | undefined } }).acroField.getDefaultAppearance()).toContain("7.2 Tf");

    const reopened = await PDFDocument.load(await doc.save());
    expect(reopened.getForm().getTextField("character.notes").getText()).toBe(noteValue);
    expect(reopened.getForm().getTextField("character.notes").isScrollable()).toBe(true);
    expect(reopened.getForm().getTextField("passion.2.name").getText()).toBe("Hate (The Usurper's Entire House)");
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
