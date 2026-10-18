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

/** Coordinates intentionally share the official print renderer's field map. */
function formFields(data: SheetData): ExportField[] {
  const fields: ExportField[] = [];
  const add = (name: string, page: 0 | 1, value: string, x: number, x2: number, baseline: number, size = 8, multiline = false, height?: number, top?: number) =>
    fields.push({ name, page, value, x, x2, baseline, size, multiline, height, top });
  const identity = data.identity;
  [
    ["character.name", identity.name, 100, 374, 37.6], ["character.player", identity.player, 76, 202, 53.6], ["character.race_culture", identity.race, 264, 374, 53.6],
    ["character.gender", identity.gender, 60, 110, 69.6], ["character.frame", identity.frame, 148, 202, 69.6], ["character.homeland", identity.homeland, 252, 374, 69.6],
    ["character.age", identity.age, 48, 110, 85.6], ["character.height", identity.height, 152, 202, 85.6], ["character.career", identity.career, 240, 374, 85.6],
    ["character.handedness", identity.handedness, 76, 110, 101.6], ["character.weight", identity.weight, 152, 202, 101.6], ["character.social_class", identity.socialClass, 260, 374, 101.6],
  ].forEach(([name, value, x, x2, y]) => add(String(name), 0, String(value), Number(x), Number(x2), Number(y)));
  add("character.description", 0, identity.description, 28, 374, 124, 8, true, 25);
  add("character.notes", 0, data.notes.join("\n"), 30, 380, 176, 8, true, 70);
  add("character.experience_rolls", 0, "", 413, 574, 122, 8, true, 65);
  add("character.money", 0, data.money.join("\n"), 413, 574, 192, 8, true, 34);
  ["day", "week", "season", "year"].forEach((period, index) => add(`money.income.${period}`, 0, "", 445 + index * 33, 466 + index * 33, 291, 7));
  add("money.silver_pieces", 0, "", 452, 572, 311, 8);
  add("character.cult_information", 0, data.cult.flatMap(entry => [entry.heading, ...entry.paragraphs]).join("\n"), 419, 568, 278, 7, true, 113);
  add("magic.devotional_pool_current", 0, data.devotionalPool.current, 507, 532, 423, 8);
  add("magic.devotional_pool_maximum", 0, data.devotionalPool.maximum, 542, 570, 423, 8);

  const stats = Object.entries(data.characteristics);
  stats.forEach(([name, value], index) => add(`characteristic.${name.toLowerCase()}`, 0, value, 142, 162, 272.4 + index * 24.2, 13, false, 20.4, 259.8 + index * 24.2));
  const attributes = Object.entries(data.attributes);
  attributes.forEach(([name, value], index) => add(`attribute.${name}`, 0, value, 330.3, 350.7, 272.4 + index * 24.2, 12, false, 20.4, 259.8 + index * 24.2));
  const standard = Object.entries(data.standard);
  standard.forEach(([name, value], index) => add(`skill.standard.${slug(name)}`, 0, value, 164, 188, skillRows[index]!, 8));
  Object.entries(data.resistances).forEach(([name, value], index) => add(`skill.resistance.${slug(name)}`, 0, value, 164, 188, 710 + index * 12, 8));

  const skillGroup = (group: SheetData["professional"], prefix: string, capacity: number, ys: number[], cols: [number, number, number, number, number, number]) => {
    for (let index = 0; index < capacity; index++) {
      const row = group[index];
      add(`${prefix}.${index + 1}.name`, 0, row?.name ?? "", cols[0], cols[1], ys[index]!);
      add(`${prefix}.${index + 1}.base`, 0, row?.base ?? "", cols[2], cols[3], ys[index]!, 8);
      add(`${prefix}.${index + 1}.total`, 0, row?.total ?? "", cols[4], cols[5], ys[index]!, 8);
    }
  };
  skillGroup(data.professional, "skill.professional", professionalRows.length, professionalRows, [219, 287, 291, 328, 355, 380]);
  skillGroup(data.magical, "skill.magical", magicalRows.length, magicalRows, [411, 480, 487, 529, 548, 572]);
  for (let index = 0; index < languageRows.length; index++) {
    const row = data.languages[index];
    add(`skill.language.${index + 1}.name`, 0, row?.name ?? "", row?.native ? 247 : 219, 326, languageRows[index]!);
    add(`skill.language.${index + 1}.total`, 0, row?.total ?? "", 355, 380, languageRows[index]!, 8);
  }
  for (let index = 0; index < 6; index++) {
    const row = data.passions[index];
    add(`passion.${index + 1}.name`, 0, row?.label ?? "", 411, 535, 685.4 + index * 12);
    add(`passion.${index + 1}.value`, 0, row?.total ?? "", 548, 572, 685.4 + index * 12, 8);
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
  ["str", "con", "siz", "dex", "int", "pow", "cha"].forEach((name, i) => add(`checkboxes.characteristic.${name}`, 0, 167, 266.4 + i * 24.2));
  ["action_points", "damage_modifier", "experience_modifier", "healing_rate", "initiative", "luck_points", "movement"].forEach((name, i) => add(`checkboxes.attribute.${name}`, 0, 355, 266.4 + i * 24.2));
  const skillNames = ["athletics", "boating", "conceal", "customs", "dance", "deceit", "drive", "first_aid", "influence", "insight", "locale", "perception", "ride", "sing", "stealth", "swim", "unarmed"];
  skillNames.forEach((name, i) => add(`checkboxes.skills.standard.${name}`, 0, 145, 464 + i * 12));
  ["brawn", "endurance", "evade", "willpower"].forEach((name, i) => add(`checkboxes.skills.resistance.${name}`, 0, 145, 704 + i * 12));
  for (let i = 0; i < 15; i++) add(`checkboxes.skills.professional.${i + 1}`, 0, 333, 464 + i * 12);
  for (let i = 0; i < 9; i++) add(`checkboxes.skills.magical.${i + 1}`, 0, 526, 535.6 + i * 12);
  for (let i = 0; i < 6; i++) add(`checkboxes.skills.language.${i + 1}`, 0, 333, 680 + i * 12);
  for (let i = 0; i < 4; i++) add(`checkboxes.combat_style.${i + 1}`, 1, 333, 522.6 + i * 12);
  const fatigueTop = 57;
  for (let i = 0; i < 10; i++) add(`checkboxes.fatigue.${i + 1}`, 1, 410, fatigueTop + i * 21.2);
  return checks;
}

/** Adds real AcroForm text controls over the same two-page official print output. */
export async function renderEditableCharacterSheet(data: SheetData, options: { template: Uint8Array | ArrayBuffer }): Promise<Uint8Array> {
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
    if (field.multiline) input.enableMultiline();
    if (centeredField(field.name)) input.setAlignment(TextAlignment.Center);
    const height = field.height ?? 10;
    input.addToPage(doc.getPages()[field.page]!, {
      x: field.x, y: PAGE_HEIGHT - (field.top ?? field.baseline) - height, width: field.x2 - field.x, height,
      borderWidth: 0, borderColor: undefined, backgroundColor: undefined, textColor: rgb(0, 0, 0), font,
    });
    const maxWidth = Math.max(1, field.x2 - field.x - 2);
    const actualSize = field.value ? Math.min(field.size ?? 8, Math.max(5, (field.size ?? 8) * maxWidth / font.widthOfTextAtSize(field.value.replace(/\s+/g, " "), field.size ?? 8))) : field.size ?? 8;
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
      borderWidth: 0, borderColor: undefined, backgroundColor: undefined,
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
