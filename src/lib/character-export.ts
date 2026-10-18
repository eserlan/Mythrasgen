import { PDFDocument, StandardFonts, TextAlignment, rgb } from "pdf-lib";
import type { SheetData } from "./sheet-data";
import type { Character } from "./store.svelte";
import { resolveBackgroundEvent } from "./background-rules";

const PAGE_HEIGHT = 841.89;
const rows = (start: number, gap: number, count: number) => Array.from({ length: count }, (_, index) => start + gap * index);
const skillRows = rows(469, 12, 17);
const professionalRows = rows(469.8, 12, 15);
const magicalRows = rows(541.4, 12, 9);
const languageRows = rows(685.4, 12, 6);
const armourRows = rows(297.4, 24.2, 7);
const equipmentRows = rows(290.4, 12, 20);
const meleeRows = rows(626.6, 12, 7);
const rangedRows = rows(722.6, 12, 3);
const stylesRows = rows(528.4, 12, 4);

interface ExportField { name: string; page: 0 | 1; value: string; x: number; x2: number; baseline: number; size?: number; multiline?: boolean; height?: number; top?: number }
interface ExportCheck { name: string; page: 0 | 1; x: number; y: number; size: number }

type Page1Rect = { x: number; x2: number; top: number; height: number };
const lineRect = (x: number, x2: number, baseline: number): Page1Rect => ({ x, x2, top: baseline - 6, height: 11 });
const fixedRect = (x: number, x2: number, top: number, height: number): Page1Rect => ({ x, x2, top, height });
const insetRect = (rect: Page1Rect, insetX: number, insetY: number): Page1Rect => ({
  x: rect.x + insetX, x2: rect.x2 - insetX, top: rect.top + insetY, height: rect.height - insetY * 2,
});
// PDF text appearances are vertically centred inside their widgets. Keep the
// click target above each printed rule so the rule remains below the glyphs.
const ruledRect = (x: number, x2: number, baseline: number): Page1Rect => fixedRect(x + 1.25, x2 - 1.25, baseline - 8, 7);

/** Page 1 widget extents, measured against the official A4 template (top-left origin). */
const PAGE_1_LAYOUT = {
  characterName: fixedRect(100, 374, 32.5, 8),
  playerName: fixedRect(76, 202, 48.5, 8),
  raceCulture: fixedRect(264, 374, 48.5, 8),
  gender: fixedRect(60, 110, 64.5, 8),
  frame: fixedRect(148, 202, 64.5, 8),
  homeland: fixedRect(252, 374, 64.5, 8),
  age: fixedRect(48, 110, 80.5, 8),
  height: fixedRect(152, 202, 80.5, 8),
  career: fixedRect(240, 374, 80.5, 8),
  handedness: fixedRect(76, 110, 96.5, 8),
  weight: fixedRect(152, 202, 96.5, 8),
  socialClass: fixedRect(260, 374, 96.5, 8),
  description: fixedRect(76, 374, 111, 27),
  notes: insetRect(fixedRect(31, 382, 158, 82), 2, 3),
  experienceRolls: insetRect(fixedRect(407, 574, 109, 35), 2, 2),
  money: insetRect(fixedRect(407, 574, 156, 57), 2, 2),
  moneyIncomeDay: insetRect(fixedRect(456, 476, 224, 8), 1, 0.5),
  moneyIncomeWeek: insetRect(fixedRect(486, 506, 224, 8), 1, 0.5),
  moneyIncomeSeason: insetRect(fixedRect(516, 536, 224, 8), 1, 0.5),
  moneyIncomeYear: insetRect(fixedRect(546, 566, 224, 8), 1, 0.5),
  usedMagicPoints: insetRect(fixedRect(552, 572, 490, 7), 1, 0),
  cultInformation: insetRect(fixedRect(413, 574, 260, 151), 3, 3),
  devotionalPoolCurrent: insetRect(fixedRect(508, 532, 415, 7), 1, 0),
  devotionalPoolMaximum: insetRect(fixedRect(550, 570, 415, 7), 1, 0),
  characteristicCircle: insetRect(fixedRect(142, 162, 259.8, 20.4), 1.4, 1.4),
  attributeCircle: insetRect(fixedRect(330.3, 350.7, 259.8, 20.4), 1.4, 1.4),
  standardSkillValues: [164, 188] as const,
  resistanceValues: [164, 188] as const,
  professionalName: [219, 287] as const,
  professionalBase: [291, 328] as const,
  professionalTotal: [355, 380] as const,
  magicalName: [411, 480] as const,
  magicalBase: [487, 529] as const,
  magicalTotal: [548, 572] as const,
  languageName: [219, 326] as const,
  languageNativeName: [251, 315] as const,
  languageTotal: [355, 380] as const,
  passionName: [412, 527] as const,
  passionTotal: [548, 572] as const,
  characteristicCheckboxSize: 17.6,
  tableCheckboxSize: 6.2,
} as const;

/** Build named form controls while keeping the editable-page geometry independent of print text placement. */
function formFields(data: SheetData): ExportField[] {
  const fields: ExportField[] = [];
  const add = (name: string, page: 0 | 1, value: string, x: number, x2: number, baseline: number, size = 8, multiline = false, height?: number, top?: number) =>
    fields.push({ name, page, value, x, x2, baseline, size, multiline, height, top });
  const identity = data.identity;
  const identityFields = [
    ["character.name", identity.name, PAGE_1_LAYOUT.characterName], ["character.player", identity.player, PAGE_1_LAYOUT.playerName],
    ["character.race_culture", identity.race, PAGE_1_LAYOUT.raceCulture], ["character.gender", identity.gender, PAGE_1_LAYOUT.gender],
    ["character.frame", identity.frame, PAGE_1_LAYOUT.frame], ["character.homeland", identity.homeland, PAGE_1_LAYOUT.homeland],
    ["character.age", identity.age, PAGE_1_LAYOUT.age], ["character.height", identity.height, PAGE_1_LAYOUT.height],
    ["character.career", identity.career, PAGE_1_LAYOUT.career], ["character.handedness", identity.handedness, PAGE_1_LAYOUT.handedness],
    ["character.weight", identity.weight, PAGE_1_LAYOUT.weight], ["character.social_class", identity.socialClass, PAGE_1_LAYOUT.socialClass],
  ] as const;
  identityFields.forEach(([name, value, rect]) => add(name, 0, value, rect.x, rect.x2, rect.top + 8, 8, false, rect.height, rect.top));
  add("character.description", 0, identity.description, PAGE_1_LAYOUT.description.x, PAGE_1_LAYOUT.description.x2, 124, 8, true, PAGE_1_LAYOUT.description.height, PAGE_1_LAYOUT.description.top);
  add("character.notes", 0, data.notes.join("\n"), PAGE_1_LAYOUT.notes.x, PAGE_1_LAYOUT.notes.x2, 176, 8.5, true, PAGE_1_LAYOUT.notes.height, PAGE_1_LAYOUT.notes.top);
  add("character.experience_rolls", 0, "", PAGE_1_LAYOUT.experienceRolls.x, PAGE_1_LAYOUT.experienceRolls.x2, 122, 8, true, PAGE_1_LAYOUT.experienceRolls.height, PAGE_1_LAYOUT.experienceRolls.top);
  add("character.money", 0, data.money.join("\n"), PAGE_1_LAYOUT.money.x, PAGE_1_LAYOUT.money.x2, 192, 8, true, PAGE_1_LAYOUT.money.height, PAGE_1_LAYOUT.money.top);
  const incomeRects = [PAGE_1_LAYOUT.moneyIncomeDay, PAGE_1_LAYOUT.moneyIncomeWeek, PAGE_1_LAYOUT.moneyIncomeSeason, PAGE_1_LAYOUT.moneyIncomeYear];
  ["day", "week", "season", "year"].forEach((period, index) => {
    const rect = incomeRects[index]!;
    add(`money.income.${period}`, 0, "", rect.x, rect.x2, rect.top + rect.height - 2, 7, false, rect.height, rect.top);
  });
  // Keep only the four printed income cells. A former one-off
  // money.silver_pieces widget had no source value and sat below the day cell.
  add("character.cult_information", 0, data.cult.flatMap(entry => [entry.heading, ...entry.paragraphs]).join("\n"), PAGE_1_LAYOUT.cultInformation.x, PAGE_1_LAYOUT.cultInformation.x2, 278, 7, true, PAGE_1_LAYOUT.cultInformation.height, PAGE_1_LAYOUT.cultInformation.top);
  add("magic_points.used_active_effects", 0, "", PAGE_1_LAYOUT.usedMagicPoints.x, PAGE_1_LAYOUT.usedMagicPoints.x2, 498, 8, false, PAGE_1_LAYOUT.usedMagicPoints.height, PAGE_1_LAYOUT.usedMagicPoints.top);
  add("magic.devotional_pool_current", 0, data.devotionalPool.current, PAGE_1_LAYOUT.devotionalPoolCurrent.x, PAGE_1_LAYOUT.devotionalPoolCurrent.x2, 423, 8, false, PAGE_1_LAYOUT.devotionalPoolCurrent.height, PAGE_1_LAYOUT.devotionalPoolCurrent.top);
  add("magic.devotional_pool_maximum", 0, data.devotionalPool.maximum, PAGE_1_LAYOUT.devotionalPoolMaximum.x, PAGE_1_LAYOUT.devotionalPoolMaximum.x2, 423, 8, false, PAGE_1_LAYOUT.devotionalPoolMaximum.height, PAGE_1_LAYOUT.devotionalPoolMaximum.top);

  const stats = Object.entries(data.characteristics);
  stats.forEach(([name, value], index) => add(`characteristic.${name.toLowerCase()}`, 0, value, PAGE_1_LAYOUT.characteristicCircle.x, PAGE_1_LAYOUT.characteristicCircle.x2, 272.4 + index * 24.2, 11, false, PAGE_1_LAYOUT.characteristicCircle.height, PAGE_1_LAYOUT.characteristicCircle.top + index * 24.2));
  const attributes = Object.entries(data.attributes);
  attributes.forEach(([name, value], index) => add(`attribute.${name}`, 0, value, PAGE_1_LAYOUT.attributeCircle.x, PAGE_1_LAYOUT.attributeCircle.x2, 272.4 + index * 24.2, 10.5, false, PAGE_1_LAYOUT.attributeCircle.height, PAGE_1_LAYOUT.attributeCircle.top + index * 24.2));
  const standard = Object.entries(data.standard);
  standard.forEach(([name, value], index) => {
    const rect = ruledRect(...PAGE_1_LAYOUT.standardSkillValues, skillRows[index]!);
    add(`skill.standard.${slug(name)}`, 0, value, rect.x, rect.x2, skillRows[index]!, 8, false, rect.height, rect.top);
  });
  Object.entries(data.resistances).forEach(([name, value], index) => {
    const baseline = 710 + index * 12, rect = ruledRect(...PAGE_1_LAYOUT.resistanceValues, baseline);
    add(`skill.resistance.${slug(name)}`, 0, value, rect.x, rect.x2, baseline, 8, false, rect.height, rect.top);
  });

  const skillGroup = (group: SheetData["professional"], prefix: string, capacity: number, ys: number[], cols: [number, number, number, number, number, number]) => {
    for (let index = 0; index < capacity; index++) {
      const row = group[index];
      for (const [suffix, left, right, size] of [["name", cols[0], cols[1], 8], ["base", cols[2], cols[3], 8], ["total", cols[4], cols[5], 8]] as const) {
        const rect = ruledRect(left, right, ys[index]!);
        add(`${prefix}.${index + 1}.${suffix}`, 0, row?.[suffix] ?? "", rect.x, rect.x2, ys[index]!, size, false, rect.height, rect.top);
      }
    }
  };
  skillGroup(data.professional, "skill.professional", professionalRows.length, professionalRows,
    [...PAGE_1_LAYOUT.professionalName, ...PAGE_1_LAYOUT.professionalBase, ...PAGE_1_LAYOUT.professionalTotal]);
  skillGroup(data.magical, "skill.magical", magicalRows.length, magicalRows,
    [...PAGE_1_LAYOUT.magicalName, ...PAGE_1_LAYOUT.magicalBase, ...PAGE_1_LAYOUT.magicalTotal]);
  for (let index = 0; index < languageRows.length; index++) {
    const row = data.languages[index];
    const [nameLeft, nameRight] = row?.native ? PAGE_1_LAYOUT.languageNativeName : PAGE_1_LAYOUT.languageName;
    const nameRect = ruledRect(nameLeft, nameRight, languageRows[index]!);
    const totalRect = ruledRect(...PAGE_1_LAYOUT.languageTotal, languageRows[index]!);
    add(`skill.language.${index + 1}.name`, 0, row?.name ?? "", nameRect.x, nameRect.x2, languageRows[index]!, 8, false, nameRect.height, nameRect.top);
    add(`skill.language.${index + 1}.total`, 0, row?.total ?? "", totalRect.x, totalRect.x2, languageRows[index]!, 8, false, totalRect.height, totalRect.top);
  }
  for (let index = 0; index < 6; index++) {
    const row = data.passions[index];
    const nameRect = ruledRect(...PAGE_1_LAYOUT.passionName, 685.4 + index * 12);
    const totalRect = ruledRect(...PAGE_1_LAYOUT.passionTotal, 685.4 + index * 12);
    add(`passion.${index + 1}.name`, 0, row?.label ?? "", nameRect.x, nameRect.x2, 685.4 + index * 12, 7.2, false, nameRect.height, nameRect.top);
    add(`passion.${index + 1}.value`, 0, row?.total ?? "", totalRect.x, totalRect.x2, 685.4 + index * 12, 8, false, totalRect.height, totalRect.top);
  }

  // The print renderer has thirteen ruled lines in this panel; preserve each as an independent editable slot.
  const magicGroups = new Map<string, string[]>();
  for (const entry of data.magic) {
    const [title = entry.summary] = entry.detail.split("\n");
    const group = magicGroups.get(entry.tradition) ?? [];
    group.push(title.replace(/^.*? — /, "").trim());
    magicGroups.set(entry.tradition, group);
  }
  const magicLines = [...magicGroups].flatMap(([tradition, entries]) => [tradition.toUpperCase(), ...entries]);
  if (magicLines.length > 13) {
    const omitted = magicLines.length - 12;
    magicLines.splice(12, magicLines.length, `Additional magic details omitted due to space (${omitted} lines)`);
  }
  for (let index = 0; index < 13; index++) add(`magic.sheet_line.${index + 1}`, 1, magicLines[index] ?? "", 28, 372, 49 + index * 16, 7.5);
  add("magic.used_magic_points", 1, "", 57, 187, 331, 8);
  ["Head", "Left Arm", "Right Arm", "Chest", "Abdomen", "Left Leg", "Right Leg"].forEach((name, index) => {
    add(`hit_location.${slug(name)}.maximum_hp`, 1, data.hitLocations[name] ?? "", 125.25, 146.75, 298.8 + index * 24.2, 13, false, 21.5, 288.05 + index * 24.2);
    add(`hit_location.${slug(name)}.current_hp`, 1, "", 160, 182, 300 + index * 24.2, 8);
  });
  add("hit_locations.wounds", 1, "", 67, 189, 658, 8);
  for (let index = 0; index < 7; index++) {
    const row = data.armour[index];
    add(`armour.${index + 1}.name`, 1, row?.name ?? "", 216, 313, armourRows[index]!);
    add(`armour.${index + 1}.ap`, 1, row?.ap ?? "", 321, 346, armourRows[index]!, 8);
    add(`armour.${index + 1}.enc`, 1, row?.enc ?? "", 351, 375, armourRows[index]!, 8);
  }
  for (let index = 0; index < 20; index++) {
    const row = data.equipment[index];
    add(`equipment.${index + 1}.name`, 1, row?.name ?? "", 411, 535, equipmentRows[index]!);
    add(`equipment.${index + 1}.enc`, 1, row?.enc ?? "", 541, 572, equipmentRows[index]!, 8);
  }
  add("armour.total_encumbrance", 1, data.encumbrance.armour, 351, 375, 471, 8);
  add("armour.initiative_penalty", 1, data.encumbrance.armourPenalty, 351, 375, 483, 8);
  [
    ["load.total", data.encumbrance.total, 543], ["load.burdened", data.encumbrance.burdened, 567],
    ["load.overloaded", data.encumbrance.overloaded, 579],
  ].forEach(([name, value, y]) => add(String(name), 1, String(value), 540, 572, Number(y), 8));
  for (let index = 0; index < 4; index++) {
    const row = data.combatStyles[index];
    add(`combat_style.${index + 1}.name`, 1, row?.name ?? "", 28, 122, stylesRows[index]!);
    add(`combat_style.${index + 1}.weapons`, 1, row?.weapons ?? "", 129, 267, stylesRows[index]!);
    add(`combat_style.${index + 1}.traits`, 1, row?.traits ?? "", 277, 326, stylesRows[index]!);
    add(`combat_style.${index + 1}.value`, 1, row?.percentage ?? "", 356, 381, stylesRows[index]!, 8);
  }

  const weaponFields = (ranged: boolean, count: number, ys: number[]) => {
    const weapons = data.weapons.filter(row => row.ranged === ranged);
    for (let index = 0; index < count; index++) {
      const row = weapons[index], y = ys[index]!;
      const prefix = `weapon.${ranged ? "ranged" : "melee"}.${index + 1}`;
      const cols: [string, number, number][] = [["name", 28, 123], ["damage", 128, 178]];
      if (ranged) cols.push(["force", 181, 207], ["damage_modifier", 209, 235], ["range_close", 238, 256], ["range_medium", 258, 276], ["range_long", 278, 294], ["load", 299, 323], ["combat_effects", 329, 469]);
      else cols.push(["size", 181, 207], ["reach", 209, 235], ["traits", 237, 325], ["combat_effects", 329, 469]);
      cols.push(["ap", 475, 499], ["initial_hp", 503, 518], ["current_hp", 524, 539], ["enc", 544, 568]);
      for (const [key, x, x2] of cols) {
        let value = "";
        if (row) value = ({ name: row.name, damage: row.damage, force: row.force, damage_modifier: row.damageModifier,
          range_close: row.range.split("/")[0] ?? "", range_medium: row.range.split("/")[1] ?? "", range_long: row.range.split("/")[2] ?? "",
          load: row.load, combat_effects: row.combatEffects, size: row.size, reach: row.reach, traits: row.traits,
          ap: row.ap, initial_hp: row.hp, current_hp: row.currentHp, enc: row.enc } as Record<string, string>)[key] ?? "";
        add(`${prefix}.${key}`, 1, value, x, x2, y, 8);
      }
    }
  };
  weaponFields(false, 7, meleeRows);
  weaponFields(true, 3, rangedRows);
  return fields;
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unnamed";
const centeredField = (name: string) => name.startsWith("characteristic.") || name.startsWith("attribute.")
  || name.startsWith("hit_location.") || name.startsWith("skill.standard.") || name.startsWith("skill.resistance.")
  || /\.(?:base|total|value|ap|enc|damage|size|reach|force|damage_modifier|range_close|range_medium|range_long|load|initial_hp|current_hp)$/.test(name)
  || name.startsWith("magic.devotional_pool_");

function checkboxes(): ExportCheck[] {
  const checks: ExportCheck[] = [];
  const add = (name: string, page: 0 | 1, x: number, top: number, size = 8) => checks.push({ name, page, x, y: PAGE_HEIGHT - top - size, size });
  const tableCheckboxSize = PAGE_1_LAYOUT.tableCheckboxSize;
  const squareInset = (20.4 - PAGE_1_LAYOUT.characteristicCheckboxSize) / 2;
  ["str", "con", "siz", "dex", "int", "pow", "cha"].forEach((name, i) => add(`checkboxes.characteristic.${name}`, 0, 167 + squareInset, 259.8 + i * 24.2 + squareInset, PAGE_1_LAYOUT.characteristicCheckboxSize));
  ["action_points", "damage_modifier", "experience_modifier", "healing_rate", "initiative", "luck_points", "movement"].forEach((name, i) => add(`checkboxes.attribute.${name}`, 0, 355 + squareInset, 259.8 + i * 24.2 + squareInset, PAGE_1_LAYOUT.characteristicCheckboxSize));
  const tableInset = 0.5;
  const skillNames = ["athletics", "boating", "conceal", "customs", "dance", "deceit", "drive", "first_aid", "influence", "insight", "locale", "perception", "ride", "sing", "stealth", "swim", "unarmed"];
  skillNames.forEach((name, i) => add(`checkboxes.skills.standard.${name}`, 0, 145 + tableInset, 464 + i * 12 + tableInset, tableCheckboxSize));
  ["brawn", "endurance", "evade", "willpower"].forEach((name, i) => add(`checkboxes.skills.resistance.${name}`, 0, 145 + tableInset, 704 + i * 12 + tableInset, tableCheckboxSize));
  for (let i = 0; i < 15; i++) add(`checkboxes.skills.professional.${i + 1}`, 0, 335 + tableInset, 464 + i * 12 + tableInset, tableCheckboxSize);
  for (let i = 0; i < 9; i++) add(`checkboxes.skills.magical.${i + 1}`, 0, 526 + tableInset, 535.6 + i * 12 + tableInset, tableCheckboxSize);
  for (let i = 0; i < 6; i++) add(`checkboxes.skills.language.${i + 1}`, 0, 335 + tableInset, 680 + i * 12 + tableInset, tableCheckboxSize);
  for (let i = 0; i < 4; i++) add(`checkboxes.combat_style.${i + 1}`, 1, 333, 522.6 + i * 12);
  const fatigueTop = 57;
  for (let i = 0; i < 10; i++) add(`checkboxes.fatigue.${i + 1}`, 1, 410, fatigueTop + i * 21.2);
  return checks;
}

/** Adds real AcroForm text controls over the same two-page official print output. */
export async function renderEditableCharacterSheet(data: SheetData, options: { template: Uint8Array | ArrayBuffer; debugPage1Outlines?: boolean }): Promise<Uint8Array> {
  // Starting from the original artwork keeps fields genuinely editable: clearing
  // a value cannot reveal a flattened copy underneath it.
  const doc = await PDFDocument.load(options.template);
  if (doc.getPageCount() !== 2) throw new Error("The Mythras Character Sheet template must have exactly two pages.");
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const seen = new Set<string>();
  for (const field of formFields(data)) {
    if (seen.has(field.name)) throw new Error(`Duplicate PDF form field: ${field.name}`);
    seen.add(field.name);
    const input = form.createTextField(field.name);
    if (field.multiline) {
      input.enableMultiline();
      input.enableScrolling();
    }
    if (centeredField(field.name)) input.setAlignment(TextAlignment.Center);
    const layout = field.page === 0 && field.top === undefined
      ? lineRect(field.x, field.x2, field.baseline)
      : { x: field.x, x2: field.x2, top: field.top ?? field.baseline, height: field.height ?? 10 };
    const height = layout.height;
    const maxWidth = Math.max(1, field.x2 - field.x - (field.page === 0 ? 4 : 2));
    const requestedSize = field.size ?? 8;
    // Multiline values wrap in the widget. Measuring all paragraphs as one
    // flattened line made long background notes collapse to tiny type.
    const measuredValue = field.multiline ? field.value.split(/\r?\n/).reduce((longest, line) =>
      font.widthOfTextAtSize(line, requestedSize) > font.widthOfTextAtSize(longest, requestedSize) ? line : longest, "") : field.value;
    const minimumSize = 5;
    // Multiline widgets wrap at their own width. Shrinking them against the
    // unwrapped paragraph width made long notes unreadably small; keep their
    // chosen readable size and retain the complete value for scrolling/editing.
    const actualSize = field.multiline ? requestedSize : measuredValue ? Math.min(requestedSize,
      Math.max(minimumSize, requestedSize * maxWidth / Math.max(1, font.widthOfTextAtSize(measuredValue, requestedSize)))) : requestedSize;
    // pdf-lib lays out single-line appearance text inside a one-point inset,
    // centering the font's ascender box vertically. Place page-one widgets
    // from the printed text baseline so that appearance metrics, not the
    // widget rectangle's center, determine where the value sits on the rule.
    // The official template's horizontal rules are writing lines, not text
    // strike-throughs. pdf-lib vertically centres glyphs in the widget; its
    // font-height approximation otherwise leaves the rendered text on the rule.
    // Lift only page-one single-line appearances (not multiline notes or page 2).
    const PAGE_1_RULE_CLEARANCE = 2.5;
    const top = field.page === 0 && !field.multiline
      ? field.baseline - (height + font.heightAtSize(actualSize, { descender: false })) / 2 - PAGE_1_RULE_CLEARANCE
      : layout.top;
    input.addToPage(doc.getPages()[field.page]!, {
      x: layout.x, y: PAGE_HEIGHT - top - height, width: layout.x2 - layout.x, height,
      borderWidth: field.page === 0 && options.debugPage1Outlines ? 0.6 : 0,
      borderColor: field.page === 0 && options.debugPage1Outlines ? rgb(0.9, 0, 0) : undefined,
      backgroundColor: undefined, textColor: rgb(0, 0, 0), font,
    });
    input.setFontSize(actualSize);
    const value = [...field.value].map(char => {
      if (char === "\n" && field.multiline) return char;
      try { font.encodeText(char); return char; } catch { return "?"; }
    }).join("");
    if (value) input.setText(value);
  }
  for (const spec of checkboxes()) {
    const checkbox = form.createCheckBox(spec.name);
    checkbox.addToPage(doc.getPages()[spec.page]!, {
      x: spec.x, y: spec.y, width: spec.size, height: spec.size,
      // A zero-width checkbox stroke becomes a device-width hairline in PDF
      // viewers. Use a subpixel white stroke so only the template's printed
      // square remains visible around the inset click target.
      borderWidth: spec.page === 0 ? (options.debugPage1Outlines ? 0.6 : 0.01) : 0,
      borderColor: spec.page === 0 ? (options.debugPage1Outlines ? rgb(0, 0, 0.9) : rgb(1, 1, 1)) : undefined,
      backgroundColor: undefined,
    });
  }
  form.updateFieldAppearances(font);
  return doc.save();
}

const md = (value: string) => value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
const table = (headers: string[], rows: string[][]) =>
  [`| ${headers.map(md).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...(rows.length ? rows : [headers.map(() => "_None recorded._")]).map(row => `| ${row.map(md).join(" | ")} |`)].join("\n");

/** Portable Markdown representation built from the same selector as print and PDF export. */
export function characterMarkdown(data: SheetData, character?: Character): string {
  const description = character?.description ?? data.identity.description;
  const equipmentRows = character?.background.inventory.map(item => {
    const units = Array.from({ length: item.quantity }, (_, index) => {
      const current = item.currentHpByUnit?.[index] ?? (index === 0 ? item.currentHp : undefined);
      return current === undefined ? "" : String(current);
    });
    const armour = item.armour ? `${item.armour.apOverride ?? ""} AP; ${item.armour.construction ?? ""}; ${item.armour.material ?? ""}; ${item.armour.locations.join(", ")}` : "";
    const custom = item.customItem ? [item.customItem.description, item.customItem.damage, item.customItem.traits,
      item.customItem.ap === undefined ? "" : `AP ${item.customItem.ap}`, item.customItem.hp === undefined ? "" : `HP ${item.customItem.hp}`].filter(Boolean).join("; ") : "";
    return [item.name, String(item.quantity), item.state, item.acquiredAs, item.encPerUnit === null ? "" : String(item.encPerUnit), units.join(", "), [armour, custom].filter(Boolean).join("; ")];
  }) ?? data.equipment.map(row => [row.name, "", "", "", row.enc, "", ""]);
  const backgroundNotes = character ? [
    ["Parents", character.background.parents], ["Siblings", character.background.siblings], ["Extended family", character.background.extendedFamily],
    ["Social class equipment", character.background.socialClassEquipment], ["Social class resources", character.background.socialClassResources],
    ["Equipment notes", character.background.equipment],
  ].filter(([, value]) => !!value.trim()).map(([label, value]) => `- **${label}:** ${md(value)}`) : [];
  const backgroundEvents = character ? [...character.background.events, ...character.background.archivedEvents]
    .map((event, index) => {
      const resolved = resolveBackgroundEvent(event);
      return `- **Background event ${index + 1}:** ${md(resolved?.text ?? event.text ?? event.eventId ?? "Unresolved event")} (roll ${event.roll})`;
    }) : [];
  const rawCultNotes = character ? character.memberships.flatMap(membership => {
    const organisation = character.organisations.find(item => item.id === membership.organisationId);
    const name = organisation?.name || "Cult or organisation";
    return [
      ...(organisation?.details?.notes?.trim() ? [`- **${name} notes:** ${md(organisation.details.notes)}`] : []),
      ...(membership.notes?.trim() ? [`- **${name} membership notes:** ${md(membership.notes)}`] : []),
    ];
  }) : [];
  const lines = [
    `# ${md(data.identity.name || "Unnamed character")}`,
    "", "## Identity", "",
    table(["Field", "Value"], Object.entries(data.identity)
      .filter(([key]) => key !== "description")
      .map(([key, value]) => [key.replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase()), value])),
    "", "## Description and notes", "",
    description ? md(description) : "_No description recorded._",
    "", ...data.notes.map(note => `- ${md(note)}`), "",
    ...backgroundNotes, ...backgroundEvents, "",
    "## Culture and career", "",
    table(["Field", "Value"], [["Race / culture", data.identity.race], ["Career", data.identity.career], ["Homeland", data.identity.homeland], ["Social class", data.identity.socialClass]]),
    "", "## Characteristics and attributes", "",
    table(["Characteristic", "Value"], Object.entries(data.characteristics)), "",
    table(["Attribute", "Value"], Object.entries(data.attributes)),
    "", "## Hit locations", "",
    table(["Location", "HP"], Object.entries(data.hitLocations)),
    "", "## Skills", "",
    table(["Standard skill", "Value"], Object.entries(data.standard)), "",
    table(["Resistance", "Value"], Object.entries(data.resistances)), "",
    table(["Professional / magical / language skill", "Base", "Total"],
      [...data.professional, ...data.magical, ...data.languages].map(row => [row.name, row.base, row.total])),
    "", "## Combat styles", "",
    table(["Style", "Weapons", "Traits", "Value"], data.combatStyles.map(row => [row.name, row.weapons, row.traits, row.percentage])),
    "", "## Weapons and shields", "",
    table(["Name", "Damage", "Size / force", "Reach / damage modifier", "Traits / effects", "Range", "AP", "Initial HP", "Current HP", "ENC"],
      data.weapons.map(row => [row.name, row.damage, row.ranged ? row.force : row.size, row.ranged ? row.damageModifier : row.reach,
        [row.traits, row.combatEffects].filter(Boolean).join("; "), row.range, row.ap, row.hp, row.currentHp, row.enc])),
    "", "## Armour by location", "",
    table(["Location", "Armour", "AP", "ENC"], data.armour.map((row, index) =>
      [["Head", "Left Arm", "Right Arm", "Chest", "Abdomen", "Left Leg", "Right Leg"][index]!, row.name, row.ap, row.enc])),
    "", "## Inventory and equipment", "",
    table(["Item", "Quantity", "State", "Acquired as", "ENC per unit", "Current HP by unit", "Armour / custom details"], equipmentRows),
    "", "## Magic and cults", "",
    ...data.cult.flatMap(entry => [`### ${md(entry.heading)}`, "", ...entry.paragraphs.map(paragraph => `- ${md(paragraph)}`), ""]),
    ...rawCultNotes, "",
    table(["Tradition", "Ability", "Details"], data.magic.map(row => [row.tradition, row.summary, row.detail])),
    "", "## Money", "", ...data.money.map(item => `- ${md(item)}`), "",
  ];
  if (data.passions.length) lines.splice(lines.indexOf("## Combat styles"), 0, "## Passions", "", table(["Passion", "Value"], data.passions.map(row => [row.label, row.total])), "");
  return lines.join("\n");
}

export function characterFilename(name: string, extension: ".pdf" | ".md"): string {
  const candidate = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}._ -]+/gu, "-").replace(/^\.+/g, "").replace(/[\s._-]+$/g, "").trim();
  const safe = /[\p{L}\p{N}]/u.test(candidate) ? candidate : "";
  return `${safe || "character"}${extension}`;
}
