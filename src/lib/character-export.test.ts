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
