import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SheetData } from "./sheet-data";
import { SHEET_HIT_LOCATIONS, SHEET_STANDARD_SKILLS } from "./sheet-data";
import { RESISTANCES, STATS } from "./rules";

/** Layout is in PDF points with a top-left origin, measured from the template's drawn lines and text layer. */
const PAGE_H = 841.89;
const step = (start: number, gap: number, count: number) => Array.from({ length: count }, (_, i) => start + gap * i);
/** Text baselines sit just above each printed rule. */
const onRule = (rules: number[]) => rules.map(y => y - 1.4);

const STANDARD_ROWS = step(470, 12, 17);
const RESISTANCE_ROWS = step(710, 12, 4);
const PROFESSIONAL_ROWS = onRule(step(471.2, 12, 15));
const MAGICAL_ROWS = onRule(step(542.8, 12, 9));
const LANGUAGE_ROWS = onRule(step(686.8, 12, 6));
const PASSION_ROWS = onRule(step(686.8, 12, 6));
const CHARACTERISTIC_ROWS = step(272.4, 24.2, 7);
const HIT_ROWS = step(298.8, 24.2, 7);
const MAGIC_LINES = onRule(step(49, 16, 13));
const EQUIPMENT_LINES = onRule(step(291.8, 12, 20));
const STYLE_LINES = onRule(step(529.8, 12, 4));
const ARMOUR_LINES = onRule(step(298.8, 24.2, 7));
const MELEE_LINES = onRule(step(628, 12, 7));
const RANGED_LINES = onRule(step(724, 12, 3));

const NOTES_BOX = { x: 30, y: 166, w: 350, h: 70 };
const CULT_BOX = { x: 413, y: 270, w: 161, h: 145 };
const MONEY_BOX = { x: 413, y: 172, w: 161, h: 34 };
const CHARACTERISTIC_CIRCLE = { x: 152.2, diameter: 20.4 };
const ATTRIBUTE_CIRCLE = { x: 340.5, diameter: 20.4 };

type Align = "left" | "center";
export interface SheetSupplementEntry { heading: string; paragraphs: string[] }
export type PrintMode = "titles-and-appendix" | "titles-only" | "notes-and-appendix" | "notes-only" | "appendix-only";
export interface RenderOptions { template: Uint8Array | ArrayBuffer; mode?: PrintMode }

/** Place text by its measured width and font bounds around a circle's measured centre. */
export function circleTextPlacement(text: string, font: PDFFont, x: number, centerY: number, diameter: number, maxSize: number, minSize = 6.5) {
  const available = diameter - 2.5;
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > available) size = Math.max(minSize, size - 0.25);
  let width = font.widthOfTextAtSize(text, size);
  if (width > available) {
    size *= available / width;
    width = font.widthOfTextAtSize(text, size);
  }
  const ascent = font.heightAtSize(size, { descender: false });
  const totalHeight = font.heightAtSize(size, { descender: true });
  const descent = totalHeight - ascent;
  return { x: x - width / 2, baseline: centerY + (ascent - descent) / 2, size };
}

class Sheet {
  readonly supplement: SheetSupplementEntry[] = [];
  constructor(readonly doc: PDFDocument, readonly pages: PDFPage[], readonly font: PDFFont, readonly bold: PDFFont) {}

  /** Drop characters the standard PDF font cannot encode instead of failing the whole print. */
  safe(text: string, font = this.font): string {
    return [...text.replace(/\s+/g, " ")].map(char => {
      try { font.encodeText(char); return char; } catch { return "?"; }
    }).join("");
  }

  draw(page: PDFPage, text: string, x: number, baseline: number, size: number, font = this.font) {
    if (text) page.drawText(text, { x: x, y: PAGE_H - baseline, size, font, color: rgb(0, 0, 0) });
  }

  circle(page: PDFPage, raw: string, x: number, centerY: number, diameter: number, maxSize: number, font = this.bold) {
    const text = this.safe(raw.trim(), font);
    if (!text) return;
    const placement = circleTextPlacement(text, font, x, centerY, diameter, maxSize);
    this.draw(page, text, placement.x, placement.baseline, placement.size, font);
  }

  /** Print one line inside a printed field; shrink first, then truncate and send the full text to the supplement. */
  field(page: PDFPage, raw: string, x1: number, x2: number, baseline: number, opts: { align?: Align; max?: number; min?: number; label?: string; font?: PDFFont } = {}): boolean {
    const { align = "left", max = 9, min = 5.5, label, font = this.font } = opts;
    const text = this.safe(raw.trim(), font);
    if (!text) return false;
    const width = (x2 - x1);
    let size = max;
    while (size > min && font.widthOfTextAtSize(text, size) > width) size = Math.max(min, size - 0.25);
    let shown = text, truncated = false;
    if (font.widthOfTextAtSize(shown, size) > width) {
      while (shown.length > 1 && font.widthOfTextAtSize(`${shown}…`, size) > width) shown = shown.slice(0, -1);
      shown = `${shown.trimEnd()}…`;
      truncated = true;
      if (label) this.supplement.push({ heading: `${label} (shortened on the sheet)`, paragraphs: [text] });
    }
    const offset = align === "center" ? (width - font.widthOfTextAtSize(shown, size)) / 2 : 0;
    this.draw(page, shown, x1 + offset, baseline, size, font);
    return truncated;
  }

  wrap(text: string, size: number, width: number): string[] {
    return this.wrapWithFont(text, size, width, this.font);
  }

  wrapWithFont(text: string, size: number, width: number, font: PDFFont): string[] {
    const lines: string[] = [];
    let line = "";
    const push = (word: string) => {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) { line = next; return; }
      if (line) lines.push(line);
      line = "";
      if (font.widthOfTextAtSize(word, size) <= width) { line = word; return; }
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > width && chunk) { lines.push(chunk); chunk = ""; }
        chunk += char;
      }
      line = chunk;
    };
    for (const word of text.split(" ").filter(Boolean)) push(word);
    if (line) lines.push(line);
    return lines;
  }

  /** Free text in a blank box: largest size that fits, else the minimum size cut at the box edge with a pointer to the supplement. */
  paragraphs(page: PDFPage, items: string[], box: { x: number; y: number; w: number; h: number }, heading: string, max = 8, min = 5.5) {
    const texts = items.map(item => this.safe(item)).filter(Boolean);
    if (!texts.length) return;
    const width = box.w, height = box.h;
    let size = max, lines: string[] = [];
    for (; ; size -= 0.25) {
      lines = texts.flatMap(text => this.wrap(text, size, width));
      if (lines.length * size * 1.18 <= height || size - 0.25 < min) break;
    }
    const capacity = Math.max(1, Math.floor(height / (size * 1.18)));
    const fits = lines.length <= capacity;
    if (!fits) {
      lines = lines.slice(0, capacity);
      lines[capacity - 1] = `${this.safe(lines[capacity - 1]).slice(0, 60).trimEnd()} … (continued on the supplement page)`;
      lines[capacity - 1] = this.wrap(lines[capacity - 1], size, width)[0];
      this.supplement.push({ heading, paragraphs: texts });
    }
    lines.forEach((line, index) => this.draw(page, line, box.x, box.y + size + index * size * 1.18 , size));
  }

  /** Ruled lines (Magic & Abilities, Equipment): items wrap onto following lines; leftover lines go to the supplement. */
  ruled(page: PDFPage, items: string[], x1: number, x2: number, lineBaselines: number[], heading: string, size = 8.5, wrapItems = true) {
    const width = x2 - x1;
    const lines = items.map(item => this.safe(item)).filter(Boolean).flatMap(item => wrapItems ? this.wrap(item, size, width) : [item]);
    const shortened = lines.slice(0, lineBaselines.length).filter((line, index) => this.field(page, line, x1, x2, lineBaselines[index], { max: size, min: 5.5 }));
    if (shortened.length && !wrapItems) this.supplement.push({ heading: `${heading} (shortened on the sheet)`, paragraphs: shortened });
    if (lines.length > lineBaselines.length) this.supplement.push({ heading: `${heading} (continued)`, paragraphs: lines.slice(lineBaselines.length) });
  }

  overflow(heading: string, items: string[]) {
    if (items.length) this.supplement.push({ heading, paragraphs: items });
  }
}

function fillPage1(sheet: Sheet, data: SheetData) {
  const page = sheet.pages[0], { identity } = data;
  const text = (value: string, x1: number, x2: number, baseline: number, label: string) => sheet.field(page, value, x1, x2, baseline, { label, max: 9 });
  const fields = [
    ["Character name", identity.name, 100, 374, 37.6], ["Player name", identity.player, 76, 202, 53.6], ["Race/Culture", identity.race, 264, 374, 53.6],
    ["Gender", identity.gender, 60, 110, 69.6], ["Frame", identity.frame, 148, 202, 69.6], ["Homeland", identity.homeland, 252, 374, 69.6],
    ["Age", identity.age, 48, 110, 85.6], ["Height", identity.height, 152, 202, 85.6], ["Career", identity.career, 240, 374, 85.6],
    ["Handedness", identity.handedness, 76, 110, 101.6], ["Weight", identity.weight, 152, 202, 101.6], ["Social class", identity.socialClass, 260, 374, 101.6],
  ] as const;
  for (const [label, value, x1, x2, baseline] of fields) text(value, x1, x2, baseline, label);
  descriptionLines(sheet, page, identity.description);

  sheet.paragraphs(page, data.notes, NOTES_BOX, "Notes (Background, Culture, Family, …)");
  sheet.paragraphs(page, data.money, MONEY_BOX, "Money & Wealth", 8.5);
  sheet.paragraphs(page, data.cult, CULT_BOX, "Cult Information", 8.5);

  STATS.forEach((stat, index) => sheet.circle(page, data.characteristics[stat], CHARACTERISTIC_CIRCLE.x, CHARACTERISTIC_ROWS[index] - 2.4, CHARACTERISTIC_CIRCLE.diameter, 13));
  const attributes = [data.attributes.actionPoints, data.attributes.damageModifier, data.attributes.experienceModifier, data.attributes.healingRate,
    data.attributes.initiative, data.attributes.luckPoints, data.attributes.movement];
  attributes.forEach((value, index) => sheet.circle(page, value, ATTRIBUTE_CIRCLE.x, CHARACTERISTIC_ROWS[index] - 2.4, ATTRIBUTE_CIRCLE.diameter, 12));

  SHEET_STANDARD_SKILLS.forEach((name, index) => sheet.field(page, data.standard[name], 164, 188, STANDARD_ROWS[index], { align: "center", max: 9 }));
  RESISTANCES.forEach((name, index) => sheet.field(page, data.resistances[name], 164, 188, RESISTANCE_ROWS[index], { align: "center", max: 9 }));

  const rows = (items: { name: string; base: string; total: string }[], capacity: number, baselines: number[], columns: [number, number, number, number, number, number], heading: string) => {
    items.slice(0, capacity).forEach((row, index) => {
      sheet.field(page, row.name, columns[0], columns[1], baselines[index], { max: 8.5, min: 5.5, label: `${heading}: ${row.name}` });
      sheet.field(page, row.base, columns[2], columns[3], baselines[index], { align: "center", max: 8.5 });
      sheet.field(page, row.total, columns[4], columns[5], baselines[index], { align: "center", max: 9 });
    });
    sheet.overflow(`${heading} (not enough room on the sheet)`, items.slice(capacity).map(row => `${row.name} — base ${row.base}%, total ${row.total}%`));
  };
  rows(data.professional, PROFESSIONAL_ROWS.length, PROFESSIONAL_ROWS, [219, 287, 291, 328, 355, 380], "Professional Skills");
  rows(data.magical, MAGICAL_ROWS.length, MAGICAL_ROWS, [411, 480, 487, 529, 548, 572], "Magical Skills");

  const languages = data.languages.filter(row => row.native || row.name);
  languages.slice(0, LANGUAGE_ROWS.length).forEach((row, index) => {
    if (row.native) sheet.field(page, row.name, 247, 325, LANGUAGE_ROWS[index], { max: 8.5, label: "Native language" });
    else sheet.field(page, row.name, 219, 326, LANGUAGE_ROWS[index], { max: 8.5, label: "Language" });
    sheet.field(page, row.total, 355, 380, LANGUAGE_ROWS[index], { align: "center", max: 9 });
  });
  sheet.overflow("Languages (not enough room on the sheet)", languages.slice(LANGUAGE_ROWS.length).map(row => `${row.name} — ${row.total}%`));

  data.passions.slice(0, PASSION_ROWS.length).forEach((passion, index) => {
    sheet.field(page, passion.label, 411, 535, PASSION_ROWS[index], { max: 8.5, label: "Passion" });
    sheet.field(page, passion.total, 548, 572, PASSION_ROWS[index], { align: "center", max: 9 });
  });
  sheet.overflow("Passions (not enough room on the sheet)", data.passions.slice(PASSION_ROWS.length).map(passion => `${passion.label} — ${passion.total}%`));
}

/** Description spans two printed lines of different lengths (measured in points on the template). */
function descriptionLines(sheet: Sheet, page: PDFPage, description: string) {
  const text = sheet.safe(description.trim());
  if (!text) return;
  const size = 8.5, firstWidth = (374 - 76) * 0.98, secondWidth = (374 - 28) * 0.98;
  const words = text.split(" ");
  let first = "";
  while (words.length && sheet.font.widthOfTextAtSize(first ? `${first} ${words[0]}` : words[0], size) <= firstWidth) first = first ? `${first} ${words.shift()}` : words.shift()!;
  const rest = sheet.wrap(words.join(" "), size, secondWidth);
  sheet.draw(page, first, 76, 117.6, size);
  if (rest[0]) sheet.draw(page, rest.length > 1 ? `${rest[0].slice(0, -1).trimEnd()}…` : rest[0], 28, 133.6, size);
  if (rest.length > 1) sheet.supplement.push({ heading: "Description (shortened on the sheet)", paragraphs: [text] });
}

function fillPage2(sheet: Sheet, data: SheetData, mode: PrintMode) {
  const page = sheet.pages[1];
  drawMagicEntries(sheet, page, data.magic, mode);
  SHEET_HIT_LOCATIONS.forEach((name, index) => sheet.circle(page, data.hitLocations[name], 136, HIT_ROWS[index], 21.5, 13));
  data.armour.slice(0, ARMOUR_LINES.length).forEach((row, index) => {
    const baseline = ARMOUR_LINES[index];
    sheet.field(page, row.name, 216, 313, baseline, { max: 8, min: 5.5, label: `Armour: ${row.name}` });
    sheet.field(page, row.ap, 321, 346, baseline, { align: "center", max: 9 });
    sheet.field(page, row.enc, 351, 375, baseline, { align: "center", max: 9 });
  });
  sheet.overflow("Armour (not enough room on the sheet)", data.armour.slice(ARMOUR_LINES.length).map(row => `${row.name} — AP ${row.ap || "unknown"}, ENC ${row.enc || "unknown"}`));
  data.equipment.slice(0, EQUIPMENT_LINES.length).forEach((row, index) => {
    const baseline = EQUIPMENT_LINES[index];
    sheet.field(page, row.name, 411, 535, baseline, { max: 8.5, min: 5.5, label: `Equipment: ${row.name}` });
    sheet.field(page, row.enc, 541, 572, baseline, { align: "center", max: 8.5 });
  });
  sheet.overflow("Equipment (not enough room on the sheet)", data.equipment.slice(EQUIPMENT_LINES.length).map(row => `${row.name}${row.enc ? ` — ENC ${row.enc}` : ""}`));
  sheet.field(page, data.encumbrance.armour, 351, 375, 483, { align: "center", max: 9 });
  sheet.field(page, data.encumbrance.armourPenalty, 351, 375, 493, { align: "center", max: 9 });
  data.combatStyles.slice(0, STYLE_LINES.length).forEach((style, index) => {
    const baseline = STYLE_LINES[index];
    sheet.field(page, style.name, 28, 122, baseline, { max: 8.5, label: `Combat Style ${style.name}` });
    sheet.field(page, style.weapons, 129, 267, baseline, { max: 8, min: 5, label: `${style.name}: weapons` });
    sheet.field(page, style.traits, 277, 326, baseline, { max: 7, min: 4.75, label: `${style.name}: traits` });
    sheet.field(page, style.percentage, 356, 381, baseline, { align: "center", max: 9 });
  });
  sheet.overflow("Combat Styles (not enough room on the sheet)", data.combatStyles.slice(STYLE_LINES.length)
    .map(style => `${style.name} ${style.percentage}% — weapons: ${style.weapons || "none recorded"}; traits: ${style.traits || "none recorded"}`));
  sheet.field(page, data.encumbrance.total, 540, 572, 693, { align: "center", max: 9 });
  sheet.field(page, data.encumbrance.burdened, 540, 572, 717, { align: "center", max: 9 });
  sheet.field(page, data.encumbrance.overloaded, 540, 572, 729, { align: "center", max: 9 });

  const drawWeapon = (row: typeof data.weapons[number], baseline: number) => {
    sheet.field(page, row.name, 28, 123, baseline, { max: 8, min: 5.5, label: `Weapon: ${row.name}` });
    sheet.field(page, row.damage, 128, 178, baseline, { align: "center", max: 8.5 });
    if (row.ranged) {
      sheet.field(page, row.force, 181, 207, baseline, { align: "center", max: 8.5 });
      sheet.field(page, row.damageModifier, 209, 235, baseline, { align: "center", max: 8.5 });
      sheet.field(page, row.range, 238, 294, baseline, { align: "center", max: 8.5, min: 5.5 });
      sheet.field(page, row.load, 299, 323, baseline, { align: "center", max: 8.5 });
      sheet.field(page, row.combatEffects, 329, 469, baseline, { max: 8, min: 5.5 });
    } else {
      sheet.field(page, row.size, 181, 207, baseline, { align: "center", max: 8.5 });
      sheet.field(page, row.reach, 209, 235, baseline, { align: "center", max: 8.5 });
      sheet.field(page, row.traits, 237, 325, baseline, { max: 8, min: 5.5 });
      sheet.field(page, row.combatEffects, 329, 469, baseline, { max: 8, min: 5.5 });
    }
    sheet.field(page, row.ap, 475, 499, baseline, { align: "center", max: 8.5 });
    sheet.field(page, row.hp, 503, 539, baseline, { align: "center", max: 8.5 });
    sheet.field(page, row.enc, 544, 568, baseline, { align: "center", max: 8.5 });
  };
  const melee = data.weapons.filter(row => !row.ranged), ranged = data.weapons.filter(row => row.ranged);
  melee.slice(0, MELEE_LINES.length).forEach((row, index) => drawWeapon(row, MELEE_LINES[index]));
  ranged.slice(0, RANGED_LINES.length).forEach((row, index) => drawWeapon(row, RANGED_LINES[index]));
  sheet.overflow("Weapons (not enough room on the sheet)", [...melee.slice(MELEE_LINES.length), ...ranged.slice(RANGED_LINES.length)]
    .map(row => `${row.name}${row.damage ? ` — ${row.damage}` : ""}${row.enc ? `, ENC ${row.enc}` : ""}`));
}

/** Use the printed rules as line slots so wrapped descriptions stay inside the Magic panel. */
function drawMagicEntries(sheet: Sheet, page: PDFPage, entries: SheetData["magic"], mode: PrintMode) {
  const x1 = 28, width = 344, size = 7.5;
  const lines: { text: string; font: PDFFont }[] = [];
  const includeNotes = mode === "notes-and-appendix" || mode === "notes-only";
  const hasAppendix = mode === "titles-and-appendix" || mode === "notes-and-appendix";
  const groups = new Map<string, SheetData["magic"]>();
  for (const entry of entries) {
    const group = groups.get(entry.tradition);
    if (group) group.push(entry);
    else groups.set(entry.tradition, [entry]);
  }
  for (const [tradition, group] of groups) {
    lines.push({ text: tradition.toUpperCase(), font: sheet.bold });
    for (const entry of group) {
      const [title = entry.summary, ...details] = entry.detail.split("\n");
      const name = title.replace(/^.*? — /, "").trim();
      const notes = details.map(item => item.replace(/^(?:Rules|Recorded effect|Player\/GM notes):\s*/, "").trim()).filter(Boolean);
      const content = includeNotes && notes.length ? `${name} — ${notes.join("; ")}` : name;
      const wrapped = sheet.wrap(sheet.safe(content), size, width);
      lines.push(...wrapped.map(text => ({ text, font: sheet.font })));
    }
  }
  const needsPointer = entries.length > 0 && hasAppendix;
  const pointer = "Full descriptions: Magic Appendix";
  const capacity = MAGIC_LINES.length;
  const reserved = needsPointer ? 1 : 0;
  const overflows = lines.length + reserved > capacity;
  const omitted = Math.max(0, lines.length - (capacity - reserved - (overflows ? 1 : 0)));
  const marker = overflows
    ? { text: needsPointer ? `Additional magic details omitted; see Magic Appendix (${omitted} lines)` : `Additional magic details omitted due to space (${omitted} lines)`, font: sheet.bold }
    : undefined;
  const display = [...lines.slice(0, capacity - reserved - (marker ? 1 : 0)), ...(marker ? [marker] : []), ...(needsPointer ? [{ text: pointer, font: sheet.bold }] : [])];
  display.slice(0, capacity).forEach((line, index) => sheet.draw(page, line.text, x1, MAGIC_LINES[index], size, line.font));
}

function addSupplement(sheet: Sheet, name: string) {
  const margin = 42, width = 595.276 - margin * 2, size = 9.5, leading = size * 1.35;
  const hasMagicReference = sheet.supplement.some(entry => entry.heading.startsWith("Magic & Abilities"));
  const title = hasMagicReference ? "Magic & Abilities Reference — Character Sheet Supplement" : "Character Sheet Supplement";
  let page = sheet.doc.addPage([595.276, PAGE_H]);
  let y = PAGE_H - margin;
  const pageHeader = (continued: boolean) => {
    const pageTitle = continued ? `${title} (continued)` : title;
    page.drawText(pageTitle, { x: margin, y: y - 13, size: 13, font: sheet.bold, color: rgb(0, 0, 0) });
    y -= 21;
    page.drawText(sheet.safe(name || "Unnamed character"), { x: margin, y: y - 10, size: 10, font: sheet.font, color: rgb(0, 0, 0) });
    y -= 18;
  };
  pageHeader(false);
  const ensure = (needed: number) => {
    if (y - needed >= margin) return;
    page = sheet.doc.addPage([595.276, PAGE_H]);
    y = PAGE_H - margin;
    pageHeader(true);
  };
  const line = (text: string, font: PDFFont, fontSize: number) => {
    ensure(fontSize * 1.5);
    page.drawText(text, { x: margin, y: y - fontSize, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= fontSize * 1.4;
  };
  for (const entry of sheet.supplement) {
    ensure(40);
    for (const headingLine of sheet.wrapWithFont(sheet.safe(entry.heading, sheet.bold), 10.5, width, sheet.bold)) {
      line(headingLine, sheet.bold, 10.5);
    }
    for (const paragraph of entry.paragraphs) {
      for (const wrapped of sheet.wrap(sheet.safe(paragraph), size, width)) {
        ensure(leading);
        page.drawText(wrapped, { x: margin, y: y - size, size, font: sheet.font, color: rgb(0, 0, 0) });
        y -= leading;
      }
      y -= 3;
    }
    y -= 8;
  }
}

/** Create a paginated appendix directly from the same recorded-entry details used by Page IX. */
function addMagicAppendix(sheet: Sheet, name: string, entries: SheetData["magic"]) {
  if (!entries.length) return;
  const margin = 42, pageWidth = 595.276, contentTop = PAGE_H - 78, contentBottom = margin + 18;
  const width = pageWidth - margin * 2, bodySize = 9.5, leading = 13;
  const pages: PDFPage[] = [];
  let page = sheet.doc.addPage([pageWidth, PAGE_H]);
  pages.push(page);
  let y = contentTop;
  const newPage = () => {
    page = sheet.doc.addPage([pageWidth, PAGE_H]);
    pages.push(page);
    y = contentTop;
  };
  const ensure = (height: number) => { if (y - height < contentBottom) newPage(); };
  const textLine = (text: string, font: PDFFont, size: number, indent = 0) => {
    ensure(leading);
    page.drawText(text, { x: margin + indent, y: y - size, size, font, color: rgb(0, 0, 0) });
    y -= leading;
  };
  let previousTradition = "";
  for (const entry of entries) {
    const [title = entry.summary, ...paragraphs] = entry.detail.split("\n");
    const rendered = [
      ...sheet.wrap(sheet.safe(title, sheet.bold), 11, width).map(text => ({ text, font: sheet.bold, size: 11, indent: 0 })),
      ...paragraphs.flatMap(paragraph => sheet.wrap(sheet.safe(paragraph), bodySize, width - 12)
        .map(text => ({ text, font: sheet.font, size: bodySize, indent: 12 }))),
    ];
    const traditionHeight = entry.tradition !== previousTradition ? 24 : 0;
    const blockHeight = traditionHeight + rendered.length * leading + 10;
    if (blockHeight <= contentTop - contentBottom && y - blockHeight < contentBottom) newPage();
    if (entry.tradition !== previousTradition) {
      ensure(24);
      y -= 5;
      textLine(entry.tradition, sheet.bold, 10);
      page.drawLine({ start: { x: margin, y: y + 2 }, end: { x: pageWidth - margin, y: y + 2 }, thickness: 0.5, color: rgb(0, 0, 0) });
      y -= 2;
      previousTradition = entry.tradition;
    }
    for (const line of rendered) textLine(line.text, line.font, line.size, line.indent);
    y -= 8;
  }
  pages.forEach((appendixPage, index) => {
    appendixPage.drawText("Magic & Abilities", { x: margin, y: PAGE_H - 38, size: 16, font: sheet.bold, color: rgb(0, 0, 0) });
    appendixPage.drawText(sheet.safe(name || "Unnamed character"), { x: margin, y: PAGE_H - 56, size: 10, font: sheet.font, color: rgb(0, 0, 0) });
    appendixPage.drawText(`Page ${index + 1} of ${pages.length}`, { x: pageWidth - margin - 75, y: PAGE_H - 56, size: 9, font: sheet.font, color: rgb(0, 0, 0) });
  });
}

/** Populate the official two-page template. A clearly labelled supplement is appended only when text overflowed. */
export async function renderCharacterSheet(data: SheetData, { template, mode = "titles-and-appendix" }: RenderOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(template);
  const pages = doc.getPages();
  if (pages.length !== 2) throw new Error("The Mythras Character Sheet template must have exactly two pages.");
  const sheet = new Sheet(doc, pages, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));
  if (mode !== "appendix-only" || !data.magic.length) {
    fillPage1(sheet, data);
    fillPage2(sheet, data, mode);
  }
  if (mode === "appendix-only" && data.magic.length) {
    doc.removePage(1);
    doc.removePage(0);
    addMagicAppendix(sheet, data.identity.name, data.magic);
  } else if ((mode === "titles-and-appendix" || mode === "notes-and-appendix") && data.magic.length) {
    addMagicAppendix(sheet, data.identity.name, data.magic);
    if (sheet.supplement.length) addSupplement(sheet, data.identity.name);
  } else if ((mode === "titles-and-appendix" || mode === "notes-and-appendix") && sheet.supplement.length) {
    addSupplement(sheet, data.identity.name);
  }
  return doc.save();
}
