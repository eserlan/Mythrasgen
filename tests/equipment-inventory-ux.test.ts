import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";
import { EQUIPMENT_CATALOGUE } from "../src/lib/equipment-catalogue";

const page = readFileSync(new URL("../src/components/Combat.svelte", import.meta.url), "utf8");
const inventory = readFileSync(new URL("../src/components/EquipmentInventory.svelte", import.meta.url), "utf8");
const protectedLocations = readFileSync(new URL("../src/components/ProtectedHitLocations.svelte", import.meta.url), "utf8");
const sheet = readFileSync(new URL("../src/components/Sheet.svelte", import.meta.url), "utf8");

test("Page VIII separates combat training from possessions", () => {
  expect(page).toContain("EquipmentInventory");
  expect(page).toContain("<details class=\"combat-styles-compact\">");
  expect(page).toContain("Combat Styles are training, not possessions");
  expect(compile(page, { filename: "src/components/Combat.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("equipment starts with two activities and puts the character summary in owned equipment", () => {
  for (const text of ["Choose equipment", "Your equipment", "Weapons", "Armour & shields", "Clothing & gear", "Supplies & services", "group-buttons"])
    expect(inventory).toContain(text);
  expect(inventory).not.toContain("Review your character");
  expect(inventory).toContain("Money remaining (SP)");
  expect(inventory).toContain("Carrying load (ENC)");
  expect(inventory).toContain("Armour protection");
  expect(inventory).toContain("<summary>Load details</summary>");
  expect(inventory).toContain("<summary>Money and transaction history</summary>");
  expect(inventory).toContain("Owned equipment");
  expect(inventory).toContain("encumbranceSummary(char.background.inventory, char.chars.STR)");
  expect(inventory).toContain('class="compact-number"');
  expect(inventory).toContain('<table class="sheet-table inventory-table">');
  expect(inventory).toContain("<th scope=\"col\">ENC/Item</th>");
  expect(inventory).toContain("<th scope=\"col\">ENC Exempt</th>");
  expect(inventory).toContain("ENC Exempt");
  expect(inventory).toContain('aria-label={`Remove ${item.name}`}');
  expect(inventory).toContain('aria-label={`${inventoryEncLabel(item)} for ${item.name}`}');
  expect(inventory).not.toContain("enc-contribution");
  expect(inventory).not.toContain("Load: {inventoryEncContribution(item)}");
  expect(inventory).toContain('aria-label={`Exempt ${item.name} from load`}');
  expect(inventory).not.toContain('<span>Exempt from load</span>');
  expect(inventory).toContain(".inventory-table { min-width:0; table-layout:fixed; }");
  expect(inventory).toContain(".inventory-table th:nth-child(2) { width:4.5rem; }");
  expect(inventory).toContain(".inventory-table th:nth-child(3) { width:7rem; }");
  expect(inventory).toContain(".inventory-table th:nth-child(4) { width:6.5rem; }");
  expect(inventory).toContain(".inventory-table th:nth-child(5) { width:6rem; }");
  expect(inventory).toContain(".inventory-table th:nth-child(6) { width:5.5rem; }");
  expect(inventory).not.toContain(".inventory-table td { white-space:nowrap; }");
  expect(inventory).toContain('<div class="table-scroll inventory-scroll" role="region" aria-label="Owned equipment inventory" tabindex="0">');
  expect(inventory).toContain(".inventory-table th,.inventory-table td { vertical-align:middle; }");
  expect(inventory).toContain(".inventory-table { display:block; width:100%; min-width:0; }");
  expect(inventory).not.toContain('<summary>Edit / actions</summary>');
  expect(inventory).not.toContain('<summary>Item details</summary>');
  expect(inventory).toContain("@media(max-width:600px)");
  expect(inventory).toContain(".inventory-table tbody { display:grid; gap:.45rem; }");
  expect(inventory).toContain('window.confirm(`Remove ${itemName} from your equipment? This does not refund a purchase.`)');
  expect(inventory).toContain("Armour by hit location");
  expect(inventory).toContain('wornArmourItems = $derived(armourItems.filter(item => item.state === "worn"))');
  expect(inventory).toContain("Melee weapons &amp; shields");
  expect(inventory).toContain("Ranged weapons");
  expect(inventory).toContain('aria-label="Melee weapons and shields"');
  expect(inventory).toContain('aria-label="Ranged weapons"');
  expect(inventory).toContain("meleeWeaponRows = $derived(ownedWeaponRows.filter(row => !row.ranged))");
  expect(inventory).toContain("rangedWeaponRows = $derived(ownedWeaponRows.filter(row => row.ranged))");
  expect(inventory).toContain("aria-current={view === \"choose\" ? \"page\" : undefined}");
  expect(inventory).toContain("Searches all {EQUIPMENT_CATALOGUE.length} equipment records.");
  const groups = ["one_handed", "two_handed", "ranged", "ammunition", "siege", "vehicles", "armour", "shields", "materials", "clothing", "tools", "food", "livestock", "accommodation"];
  expect(new Set(groups)).toEqual(new Set(EQUIPMENT_CATALOGUE.map(item => item.source.category)));
  expect(inventory).toContain("aria-expanded={selectedId === record.id}");
  expect(inventory).toContain("selectedId === record.id ? null : record.id");
  expect(inventory).toContain('aria-controls={selectedId === record.id ? "selected-item-detail" : undefined}');
  expect(inventory).toContain("aria-labelledby=\"selected-item-title\"");
  expect(inventory).toContain("Search all equipment");
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("purchase safeguards and outcomes are accessible and preserve GM pricing", () => {
  for (const text of ["GM price (CP)", "GM-approved zero price", "remaining money", "disabled={!canTransact(record)}", "positive whole quantity", "Ask the GM for a price", "aria-live=\"polite\"", "closeDetails(record.id)"])
    expect(inventory).toContain(text);
  expect(inventory).toContain("quantity[record.id] ?? \"1\"");
  expect(inventory).toContain("gmPrice[record.id] ?? \"\"");
  expect(inventory).toContain("editInventoryQuantity(item.id, item.name, event.currentTarget.value)");
  expect(inventory).toContain("It does not add a second item.");
  expect(inventory).toContain("without adding carried equipment");
  expect(inventory).toContain('class="quantity-input" aria-label={`Quantity of ${record.name}`} aria-invalid={amount(record.id) < 1}');
  expect(inventory).toContain('aria-describedby={amount(record.id) < 1 ? `quantity-error-${record.id}` : undefined}');
  expect(inventory).toContain('class="free-acquisition"');
  expect(inventory).toContain("Add without paying");
  expect(inventory).toContain('class="acquisition-toolbar"');
  expect(inventory).toContain('class="primary buy-button"');
  expect(inventory).toContain('onclick={() => { const acquiredAs = freeAcquisition[record.id]; if (acquiredAs) acquire(selected, acquiredAs); }}');
  expect(inventory).not.toContain('if (value) acquire(selected, value as');
  for (const acquisition of ['<option value="gifted">Gifted</option>', '<option value="inherited">Inherited</option>', '<option value="granted">Granted</option>'])
    expect(inventory).toContain(acquisition);
  expect(inventory).toContain("width:6.5rem");
  expect(inventory).toContain(".buy-button { min-width:6rem; min-height:2.75rem; }");
  expect(inventory).toContain(".free-acquisition { flex:1 1 100%; }");
  expect(inventory).toContain(".free-acquisition label,.free-acquisition select,.free-acquisition button { width:100%; min-width:0; }");
});

test("custom item multiline fields use full-width rows outside the compact field grid", () => {
  expect(inventory).toContain('<div class="custom-identity">');
  expect(inventory).toContain('<label class="custom-field-wide">Description / notes <textarea bind:value={customDescription} rows="4"');
  expect(inventory).toContain('<label class="custom-field-wide">Special effects / traits <textarea bind:value={customTraits} rows="4"');
  expect(inventory).toContain('.custom-field-wide textarea { box-sizing:border-box; width:100%; min-width:0; min-height:6rem; resize:vertical; }');
  const compactGridStart = inventory.indexOf('<div class="custom-fields">');
  const compactGridEnd = inventory.indexOf('\n      </div>\n      {#if customType === "armour"}', compactGridStart);
  expect(compactGridStart).toBeGreaterThan(-1);
  expect(compactGridEnd).toBeGreaterThan(compactGridStart);
  expect(inventory.slice(compactGridStart, compactGridEnd)).not.toContain('<textarea');
  expect(inventory).toContain('class="custom-field-wide">Description / notes');
  expect(inventory).toContain('class="custom-field-wide">Special effects / traits');
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("custom and catalogue armour share a responsive accessible hit-location grid", () => {
  expect(inventory.match(/<ProtectedHitLocations /g)).toHaveLength(3);
  expect(inventory).toContain('guidance="Select every body location this armour protects. Choose at least one."');
  expect(inventory).toContain('error={customLocationsError ? "Select at least one protected hit location before saving." : ""}');
  expect(protectedLocations).toContain('<legend>Protected hit locations</legend>');
  expect(protectedLocations).toContain('aria-describedby={`${instructionId}${validation ? ` ${validationId}` : ""}${error ? ` ${errorId}` : ""}`}');
  expect(protectedLocations).toContain('{selected.length} of {HIT_LOCATIONS.length} locations selected.');
  expect(protectedLocations).toContain('role="status">{validation}</p>');
  expect(inventory).toContain('validation={!locationsFor(record).length ? "Select at least one protected hit location before buying or adding armour." : ""}');
  expect(protectedLocations).toContain('role="alert">{error}</p>');
  expect(protectedLocations).toContain('grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))');
  expect(protectedLocations).toContain('min-height:2.75rem');
  expect(protectedLocations).toContain('white-space:nowrap');
  expect(protectedLocations).toContain(':focus-visible');
  expect(inventory).toContain('class="mute custom-armour-help"');
  expect(inventory).toContain('customLocations = [...(definition?.protectedLocations ?? [])]');
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
  expect(compile(protectedLocations, { filename: "src/components/ProtectedHitLocations.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("owned armour opens in an accessible full-width detail row with focused disclosures", () => {
  expect(inventory).toContain('class="armour-editor-toggle" aria-expanded={openArmourEditorId === item.id}');
  expect(inventory).toContain('aria-controls={`owned-armour-editor-${item.id}`}');
  expect(inventory).toContain('<tr class="armour-detail-row"><td colspan="6">');
  expect(inventory).toContain('<section class="armour-editor" id={`owned-armour-editor-${item.id}`}');
  expect(inventory).toContain('<h6>Armour properties</h6>');
  expect(inventory).toContain('<div class="armour-properties">');
  expect(inventory).toContain('guidance="Choose the locations this piece protects. This selection is saved for this armour item." onSelectAll=');
  expect(inventory).toContain('onClearAll={() => saveInventoryChange(item.id, item.name, { armour: { locations: [], coverageResolved: true } })}');
  expect(inventory).toContain('<details class="armour-secondary-disclosure"><summary>Advanced / GM options</summary>');
  expect(inventory).toContain('<details class="armour-secondary-disclosure"><summary>Rules help</summary>');
  expect(inventory).toContain('Fit or compatibility needs review. Resolve both settings to confirm effective protection; nominal AP remains listed by hit location.');
  expect(protectedLocations).toContain('{#if onSelectAll && onClearAll}');
  expect(protectedLocations).toContain('>Select all</button>');
  expect(protectedLocations).toContain('>Clear all</button>');
  expect(inventory).toContain('.armour-editor { box-sizing:border-box; display:grid;');
  expect(inventory).toContain('.inventory-table tr.armour-detail-row { grid-column:1/-1; display:block; }');
  expect(compile(inventory, { filename: "src/components/EquipmentInventory.svelte", generate: "client" }).warnings).toHaveLength(0);
});

test("GM material override is a compact label with explanatory secondary text", () => {
  expect(inventory.match(/class="material-override"/g)?.length).toBeGreaterThanOrEqual(3);
  expect(inventory).toContain("Allow nonstandard material (GM approval)");
  expect(inventory).toContain("Enables material combinations outside the standard rules when the GM approves.");
  expect(inventory).toContain(".material-override { display:flex; align-items:flex-start;");
});

test("technical provenance and armour location data are secondary disclosures", () => {
  expect(inventory).toContain("<summary>Rules &amp; sources</summary>");
  expect(inventory).toContain("<summary>Money and transaction history</summary>");
  expect(inventory).toContain("{#if wornArmourItems.length}");
  expect(inventory).toContain("coverage unknown");
  expect(inventory).toContain("No armour recorded");
  expect(inventory).toContain("filter(ap => ap !== null && ap > 0).length} locations effectively protected");
  expect(inventory).toContain("armourSummary.nominalApByLocation[location]");
  expect(inventory).toContain("<th scope=\"col\">Nominal AP</th>");
  expect(inventory).toContain("Fit and material compatibility determine whether that protection is effective.");
  expect(inventory).toContain("No equipment yet. Choose equipment to add an item.");
});

test("character sheet identifies unverified armour source values", () => {
  expect(sheet).toContain("source rules values have not been visually verified against the Core");
});

test("weapon and shield details use player-facing labels and keep provisional source fields out of the UI", () => {
  const broadsword = EQUIPMENT_CATALOGUE.find(item => item.source.id === "one_handed-broadsword");
  const buckler = EQUIPMENT_CATALOGUE.find(item => item.source.id === "shields-buckler");
  expect(broadsword).toBeDefined();
  expect(broadsword?.source.combat_profile_candidate).toEqual({ damage: "1d8", size: "M", reach: "M" });
  expect(broadsword?.source.ap_candidate).toBe(6);
  expect(broadsword?.source.hp_candidate).toBe(10);
  expect(broadsword?.source.wielding_hands).toBe(1);
  expect(broadsword?.source.enc_candidate).toBe(2);
  expect(broadsword?.source.source_printed_page).toBe(63);
  expect(broadsword?.source.verification).toContain("require visual row validation");
  expect(broadsword?.fieldVerification.ap_candidate).toBe("provisional");
  expect(broadsword?.fieldVerification.enc_candidate).toBe("provisional");
  expect(buckler?.source.combat_profile_candidate).toEqual({ damage: "1d3", size: "M", reach: "S" });
  expect(buckler?.source.ap_candidate).toBe(6);
  expect(buckler?.source.hp_candidate).toBe(9);

  for (const text of ["Base damage", "${itemType} AP", "${itemType} HP", "Encumbrance (ENC)", "Shield", "Hands required", "Medium", "Rules help", "Source: Mythras Core, p. {record.source_printed_page}", "Combat profile", "Unresolved"])
    expect(inventory).toContain(text);
  for (const text of ["Stats pending verification", "Details pending verification", "provisional", "requires GM confirmation", "candidate stats are not verified"])
    expect(inventory.toLowerCase()).not.toContain(text.toLowerCase());
  expect(inventory.match(/Mythras Core, p\. \{record\.source_printed_page\}/g)).toHaveLength(1);
  expect(inventory).toContain('unavailable ? "Price unavailable" : displayEquipmentPrice(record)');
  expect(inventory).toContain("ENC Unknown");
  expect(inventory).not.toContain("Catalogue prices and figures are transcribed candidates");
  expect(inventory).not.toContain("verify them against Mythras Core");
  for (const text of ["Record {record.id}", "{record.source_line}", "Object.entries(selected.fieldVerification)", "{record.verification}", "Source IDs:"])
    expect(inventory).not.toContain(text);
  expect(inventory).not.toContain("<details><summary>Rules &amp; sources</summary><p>Mythras Core");
  expect(inventory).not.toContain("Special Effects need verification against the Core PDF");
  expect(inventory).toContain("<small>{categorySummary(record.category)}</small>");
  expect(inventory).not.toContain("{statSummary(entry) || categorySummary(record.category)}");
  expect(inventory).toContain("They are not character armour points or character hit points.");
  expect(inventory).toContain("aria-label={`Rules help for ${record.name}`}");
  expect(inventory).toContain('isWeapon(record) || record.category === "shields"');
  expect(inventory).toContain("It does not add a second item.");
});
