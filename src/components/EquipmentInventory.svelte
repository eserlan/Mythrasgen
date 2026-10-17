<script lang="ts">
  import { tick } from "svelte";
  import { EQUIPMENT_CATALOGUE, displayCatalogueEquipmentName, displayEquipmentPrice, formatCopperPrice, type EquipmentCategory } from "../lib/equipment-catalogue";
  import { RANGED_WEAPON_STATS, formatRangedRange, rangedCellText } from "../lib/ranged-weapons";
  import { acquireEquipment, char, deleteInventoryItem, equipmentAvailableCp, equipmentBalanceCp, equipmentMoneyIsOverridden, equipmentMoneyValueCp, moveOwnedInventoryItem, purchaseEquipment, recordEquipmentExpense, resetEquipmentMoney, setEquipmentMoney, updateInventoryItem } from "../lib/store.svelte";
  import { carriedLoad, encumbranceSummary } from "../lib/encumbrance";
  import { encumbranceThresholdRows } from "../lib/encumbrance-presentation";
  import { inventoryItemMaximumHp, normalizeInventoryOrder } from "../lib/equipment-inventory";
  import { ARMOUR_CONSTRUCTIONS, ARMOUR_MATERIALS, HIT_LOCATIONS, armourEncumbrance, armourMaterialCompatibility, fullArmourEncumbrance, standardArmourMaterial, summarizeArmour, type ArmourConstructionId, type ArmourMaterialId, type HitLocationName } from "../lib/armour-rules";
  import { validateCustomEquipment, type CustomEquipmentDefinition, type CustomEquipmentType } from "../lib/custom-equipment";
  import { acquireCustomEquipment, deleteCustomEquipment, purchaseCustomEquipment, saveCustomEquipment } from "../lib/store.svelte";
  import ProtectedHitLocations from "./ProtectedHitLocations.svelte";

  const categories: EquipmentCategory[] = [...new Set(EQUIPMENT_CATALOGUE.map(item => item.source.category))];
  const categoryGroups: { name: string; categories: EquipmentCategory[] }[] = [
    { name: "Weapons", categories: ["one_handed", "two_handed", "ranged", "ammunition", "siege", "vehicles"] },
    { name: "Armour & shields", categories: ["armour", "shields", "materials"] },
    { name: "Clothing & gear", categories: ["clothing", "tools"] },
    { name: "Supplies & services", categories: ["food", "livestock", "accommodation"] },
  ];
  const moneyFields: { field: "startingCp" | "spentCp" | "remainingCp"; label: string }[] = [
    { field: "startingCp", label: "Starting" }, { field: "spentCp", label: "Spent" }, { field: "remainingCp", label: "Remaining" },
  ];
  let query = $state("");
  let view = $state<"choose" | "owned">("choose");
  let group = $state<string | null>(null);
  let category = $state<EquipmentCategory | null>(null);
  let selectedId = $state<string | null>(null);
  let sort = $state<"name" | "price">("name");
  let quantity = $state<Record<string, string>>({});
  let gmPrice = $state<Record<string, string>>({});
  let armourMaterial = $state<Record<string, ArmourMaterialId>>({});
  let armourLocations = $state<Record<string, HitLocationName[]>>({});
  let armourGmOverride = $state<Record<string, boolean>>({});
  let openArmourEditorId = $state<string | null>(null);
  let freeAcquisition = $state<Record<string, "gifted" | "inherited" | "granted" | "">>({});
  let message = $state("");
  let purchaseBusy = $state(false);
  let customFormOpen = $state(false);
  let editingCustomId = $state<string | null>(null);
  let customName = $state("");
  let customType = $state<CustomEquipmentType>("weapon");
  let customDescription = $state("");
  let customPriceSp = $state("");
  let customEnc = $state("");
  let customDamage = $state("");
  let customSize = $state("");
  let customReach = $state("");
  let customAp = $state("");
  let customHp = $state("");
  let customHands = $state("");
  let customTraits = $state("");
  let customLocations = $state<HitLocationName[]>([]);
  let customLocationsError = $state(false);
  let customConstruction = $state("");
  let customMaterial = $state("");
  let customArmourGmOverride = $state(false);
  let customQuantity = $state<Record<string, string>>({});
  const entered = (value: string | number) => String(value).trim();
  const customPriceCp = () => entered(customPriceSp) === "" ? null : Number(customPriceSp) * 10;
  const customDefinitions = $derived(char.background.customEquipment);
  function resetCustomForm(definition?: CustomEquipmentDefinition) {
    editingCustomId = definition?.id ?? null;
    customName = definition?.name ?? ""; customType = definition?.type ?? "weapon"; customDescription = definition?.description ?? "";
    customPriceSp = definition?.priceCp === null || definition?.priceCp === undefined ? "" : String(definition.priceCp / 10);
    customEnc = definition?.enc === null || definition?.enc === undefined ? "" : String(definition.enc);
    customDamage = definition?.damage ?? ""; customSize = definition?.size ?? ""; customReach = definition?.reach ?? "";
    customAp = definition?.ap === undefined ? "" : String(definition.ap); customHp = definition?.hp === undefined ? "" : String(definition.hp);
    customHands = definition?.hands === undefined ? "" : String(definition.hands); customTraits = definition?.traits ?? "";
    customLocations = [...(definition?.protectedLocations ?? [])]; customConstruction = definition?.construction ?? "";
    customMaterial = definition?.material ?? ""; customArmourGmOverride = !!definition?.gmCompatibilityOverride; customLocationsError = false; customFormOpen = true;
  }
  function submitCustomDefinition() {
    const value = { name: customName.trim(), type: customType, description: customDescription,
      priceCp: customPriceCp(), enc: entered(customEnc) === "" ? null : Number(customEnc),
      ...(customType === "weapon" || customType === "shield" ? { damage: customDamage, size: customSize, reach: customReach,
        ...(entered(customAp) !== "" ? { ap: Number(customAp) } : {}), ...(entered(customHp) !== "" ? { hp: Number(customHp) } : {}),
        ...(customType === "weapon" ? { hands: Number(customHands) } : {}), traits: customTraits } : {}),
      ...(customType === "armour" ? { ...(entered(customAp) !== "" ? { ap: Number(customAp) } : {}), protectedLocations: customLocations,
        construction: customConstruction, material: customMaterial, gmCompatibilityOverride: customArmourGmOverride } : {}) };
    const errors = validateCustomEquipment(value);
    if (entered(customPriceSp) !== "" && (!Number.isFinite(value.priceCp) || !Number.isSafeInteger(value.priceCp) || value.priceCp! < 0)) errors.push("Price must be zero or more SP, with at most one decimal place.");
    if (entered(customEnc) !== "" && (!Number.isFinite(value.enc) || value.enc! < 0)) errors.push("ENC must be zero or more.");
    if (entered(customAp) !== "" && (!Number.isSafeInteger(value.ap) || value.ap! < 0)) errors.push("AP must be a whole number of zero or more.");
    if (entered(customHp) !== "" && (!Number.isSafeInteger(value.hp) || value.hp! < 0)) errors.push("HP must be a whole number of zero or more.");
    if (errors.length) {
      customLocationsError = customType === "armour" && customLocations.length === 0;
      message = errors[0]; return;
    }
    const saved = saveCustomEquipment(value, editingCustomId ?? undefined);
    message = `${saved.name}: custom definition saved. Saving it did not change money or inventory.`;
    customFormOpen = false; editingCustomId = null;
  }
  function removeCustomDefinition(definition: CustomEquipmentDefinition) {
    const owned = char.background.inventory.some(item => item.customItem?.id === definition.id);
    if (owned && !window.confirm(`${definition.name} is still owned. Remove its definition? Existing inventory and purchase snapshots will be preserved.`)) return;
    deleteCustomEquipment(definition.id);
    message = owned ? `${definition.name}: definition removed; owned item snapshots are preserved.` : `${definition.name}: custom definition removed.`;
  }
  function buyCustom(definition: CustomEquipmentDefinition) {
    const qty = Number(customQuantity[definition.id] ?? "1");
    try { purchaseCustomEquipment(definition.id, qty); message = `${definition.name}: ${definition.type === "service" ? "expense recorded" : "purchased"}.`; }
    catch (error) { message = error instanceof Error ? error.message : "Could not purchase custom item."; }
  }
  function giftCustom(definition: CustomEquipmentDefinition) {
    const qty = Number(customQuantity[definition.id] ?? "1");
    try { acquireCustomEquipment(definition.id, qty, "granted"); message = `${definition.name}: added without paying.`; }
    catch (error) { message = error instanceof Error ? error.message : "Could not add custom item."; }
  }
  const matching = $derived(EQUIPMENT_CATALOGUE.filter(item => {
    const q = query.trim().toLowerCase();
    const inGroup = group === null || categoryGroups.find(entry => entry.name === group)?.categories.includes(item.source.category) === true;
    return (q || (inGroup && (category === null || item.source.category === category)))
      && (!q || `${displayCatalogueEquipmentName(item.source)} ${item.source.name} ${item.source.category} ${item.source.source_line} ${item.source.id}`.toLowerCase().includes(q));
  }));
  const shown = $derived([...matching].sort((a, b) => sort === "price"
    ? (a.source.price_cp_candidate ?? Number.MAX_SAFE_INTEGER) - (b.source.price_cp_candidate ?? Number.MAX_SAFE_INTEGER) || displayCatalogueEquipmentName(a.source).localeCompare(displayCatalogueEquipmentName(b.source))
    : displayCatalogueEquipmentName(a.source).localeCompare(displayCatalogueEquipmentName(b.source))));
  const selected = $derived(matching.find(item => item.source.id === selectedId) ?? null);
  $effect(() => {
    if (selectedId !== null && !matching.some(item => item.source.id === selectedId)) selectedId = null;
  });
  const categoryCount = (id: EquipmentCategory) => EQUIPMENT_CATALOGUE.filter(item => item.source.category === id).length;
  const categoryLabel = (id: EquipmentCategory) => id.replaceAll("_", " ").replace(/\b\w/g, value => value.toUpperCase());
  const categorySummary = (id: EquipmentCategory) => ({
    one_handed: "One-handed weapon", two_handed: "Two-handed weapon", ranged: "Ranged weapon", ammunition: "Ammunition",
    siege: "Siege equipment", vehicles: "Vehicle", shields: "Shield", armour: "Armour", materials: "Armour material",
    clothing: "Clothing", tools: "Tool or gear", food: "Food and drink", livestock: "Livestock", accommodation: "Place to stay",
  })[id];
  const isWeapon = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) =>
    ["one_handed", "two_handed", "ranged"].includes(record.category);
  const hasCombatProfile = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) =>
    isWeapon(record) || record.category === "shields";
  const rangedImpaleSize = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => {
    const size = RANGED_WEAPON_STATS[record.id]?.impaleSize;
    return size?.status === "value" ? size.value : undefined;
  };
  const combatStats = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => {
    if (!hasCombatProfile(record)) return [] as [string, string][];
    if (record.category === "ranged") {
      const stats = RANGED_WEAPON_STATS[record.id];
      if (!stats) return [] as [string, string][];
      return [
        ["Damage", rangedCellText(stats.damage)],
        ["Force", rangedCellText(stats.force)],
        ["DM", rangedCellText(stats.damageModifier)],
        ["Range", formatRangedRange(stats.range)],
        ["Load", rangedCellText(stats.load)],
        ["Combat Effects", rangedCellText(stats.combatEffects)],
        ["AP", rangedCellText(stats.ap)],
        ["HP", rangedCellText(stats.hp)],
        ["ENC", rangedCellText(stats.enc)],
      ];
    }
    const itemType = record.category === "shields" ? "Shield" : "Weapon";
    const profile = record.combat_profile_candidate;
    return [
      ...(profile ? [["Base damage", profile.damage], ["Size", profile.size === "M" ? "Medium" : profile.size], ["Reach", profile.reach === "M" ? "Medium" : profile.reach]] as [string, string][] : [["Combat profile", "Unresolved"] as [string, string]]),
      [`${itemType} AP`, record.ap_candidate === undefined ? "Unresolved" : String(record.ap_candidate)],
      [`${itemType} HP`, record.hp_candidate === undefined ? "Unresolved" : String(record.hp_candidate)],
      ["Encumbrance (ENC)", record.enc_candidate === undefined ? "Unknown" : String(record.enc_candidate)],
      ...(record.wielding_hands !== undefined ? [["Hands required", `${record.wielding_hands} ${record.wielding_hands === 1 ? "hand" : "hands"}`] as [string, string]] : []),
    ];
  };
  const amount = (id: string) => {
    const parsed = Number(quantity[id] || 1);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
  };
  const customCp = (id: string) => {
    if (gmPrice[id] === undefined || gmPrice[id] === "") return undefined;
    const parsed = Number(gmPrice[id]);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const armourConstructionFor = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) =>
    Object.entries(ARMOUR_CONSTRUCTIONS).find(([, construction]) => construction.name === record.name)?.[0] as ArmourConstructionId | undefined;
  const materialFor = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => armourMaterial[record.id] ?? (armourConstructionFor(record) ? standardArmourMaterial(armourConstructionFor(record)!) : "iron");
  const locationsFor = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => armourLocations[record.id] ?? [];
  const armourSelectionFor = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => ({
    material: materialFor(record), locations: locationsFor(record), gmCompatibilityOverride: !!armourGmOverride[record.id],
  });
  const perLocationPrice = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => record.price_cp_candidate ?? customCp(record.id);
  const priceFor = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => {
    const price = perLocationPrice(record);
    if (record.category === "armour" && !locationsFor(record).length) return undefined;
    return record.category === "armour" ? price === undefined ? undefined : price * locationsFor(record).length : price;
  };
  const canAcquireArmour = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => {
    const construction = armourConstructionFor(record);
    if (!construction || !locationsFor(record).length) return false;
    return armourMaterialCompatibility(construction, materialFor(record)) === "compatible" || !!armourGmOverride[record.id];
  };
  const canTransact = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => {
    const price = priceFor(record);
    return !purchaseBusy && amount(record.id) > 0 && (record.category !== "armour" || canAcquireArmour(record)) && price !== undefined && Number.isSafeInteger(price)
      && price >= 0 && price * amount(record.id) <= equipmentAvailableCp();
  };
  const availableBalanceCp = $derived(equipmentAvailableCp());
  const signedMoney = formatCopperPrice;
  const load = $derived(encumbranceSummary(char.background.inventory, char.chars.STR));
  const thresholdRows = $derived(encumbranceThresholdRows(load.thresholds));
  const loadBreakdown = $derived.by(() => {
    const zeroEncItems = char.background.inventory
      .filter(item => item.state !== "stored" && !item.encumbranceExempt && !item.armour && item.encPerUnit === 0)
      .reduce((total, item) => total + item.quantity, 0);
    const otherItems = char.background.inventory
      .filter(item => !item.armour)
      .map(item => {
        const excluded = item.state === "stored" || item.encumbranceExempt;
        const contribution = carriedLoad([item]).load;
        return { item, excluded, contribution };
      });
    return { zeroEncItems, otherItems };
  });
  const orderedInventory = $derived.by(() => {
    const itemsById = new Map(char.background.inventory.map(item => [item.id, item]));
    return normalizeInventoryOrder(char.background.inventoryOrder, char.background.inventory)
      .flatMap(id => itemsById.has(id) ? [itemsById.get(id)!] : []);
  });
  const armourItems = $derived(char.background.inventory.filter(item => item.armour));
  const wornArmourItems = $derived(armourItems.filter(item => item.state === "worn"));
  const armourLoad = $derived(carriedLoad(armourItems));
  const armourBreakdownRows = $derived(armourItems.map(item => {
    const armour = item.armour!;
    const unitEnc = armour.encOverride ?? (armour.construction && armour.material ? armourEncumbrance(armour.construction, armour.material) : null);
    return { item, unitEnc, fullEnc: fullArmourEncumbrance(armour, item.quantity),
      contribution: carriedLoad([item]).load };
  }));
  const armourSummary = $derived(summarizeArmour(armourItems.flatMap(item => Array.from({ length: item.quantity }, (_, index) => ({
    id: `${item.id}-${index + 1}`, name: item.name, ...item.armour!, state: item.state,
  })))));
  const inventoryEncLabel = (item: typeof char.background.inventory[number]) => item.armour ? "ENC per covered location" : "ENC per item";
  const catalogueRecordFor = (item: typeof char.background.inventory[number]) => EQUIPMENT_CATALOGUE.find(record => record.source.id === item.catalogueId)?.source;
  const itemHasStructuralHp = (item: typeof char.background.inventory[number]) => {
    const category = catalogueRecordFor(item)?.category;
    return ["one_handed", "two_handed", "shields", "ranged"].includes(category ?? "")
      || item.customItem?.type === "weapon" || item.customItem?.type === "shield";
  };
  const ownedWeaponRows = $derived(char.background.inventory.flatMap(item => {
    const record = catalogueRecordFor(item);
    const custom = item.customItem;
    const ranged = record?.category === "ranged";
    const melee = record ? ["one_handed", "two_handed", "shields"].includes(record.category)
      : custom?.type === "weapon" || custom?.type === "shield";
    if (!ranged && !melee) return [];
    return [{ item, record, custom, ranged }];
  }));
  const meleeWeaponRows = $derived(ownedWeaponRows.filter(row => !row.ranged));
  const rangedWeaponRows = $derived(ownedWeaponRows.filter(row => row.ranged));
  const ownedArmourRows = $derived(HIT_LOCATIONS.map(location => {
    const pieces = wornArmourItems.filter(item => item.armour?.locations.includes(location));
    const unresolvedCoverage = wornArmourItems.filter(item => !item.armour?.locations.length && !item.armour?.coverageResolved);
    const ap = armourSummary.nominalApByLocation[location];
    const enc = unresolvedCoverage.length ? null : pieces.reduce<number | null>((total, item) => {
      if (total === null) return null;
      const piece = item.armour!;
      const unitEnc = piece.encOverride ?? (piece.construction && piece.material ? armourEncumbrance(piece.construction, piece.material) : null);
      return unitEnc === null ? null : total + unitEnc * item.quantity;
    }, 0);
    return { location, pieces, unresolvedCoverage, ap, enc };
  }));
  const statSummary = (record: typeof EQUIPMENT_CATALOGUE[number]) => [
    ...combatStats(record.source).map(([name, value]) => `${name} ${value}`),
    record.source.enc_candidate !== undefined ? `ENC ${record.source.enc_candidate}` : record.source.base_enc_per_location !== undefined ? `ENC ${record.source.base_enc_per_location}` : record.kind === "physical_item" ? "ENC Unknown" : undefined,
  ].filter(Boolean).join(" · ");
  function purchase(record: typeof EQUIPMENT_CATALOGUE[number]) {
    if (purchaseBusy) return;
    purchaseBusy = true;
    try {
      const quantityValue = amount(record.source.id);
      const price = customCp(record.source.id);
      if (quantityValue < 1) throw new Error("Enter a positive whole quantity.");
      if (record.source.price_cp_candidate === null && price === undefined) throw new Error("Ask the GM for a price before purchasing this item.");
      if (priceFor(record.source)! * quantityValue > equipmentAvailableCp()) throw new Error("This purchase costs more than your remaining money.");
      if (record.kind === "non_carried_purchase") recordEquipmentExpense(record.source.id, quantityValue, price);
      else purchaseEquipment(record.source.id, quantityValue, record.source.category === "armour" ? perLocationPrice(record.source) : price, record.source.category === "armour" ? armourSelectionFor(record.source) : undefined);
      message = `${displayCatalogueEquipmentName(record.source)}: ${record.kind === "non_carried_purchase" ? "expense recorded" : "added to your equipment"}. Money remaining: ${signedMoney(equipmentBalanceCp())}.`;
    } catch (error) { message = error instanceof Error ? error.message : "Could not record transaction."; }
    finally { purchaseBusy = false; }
  }
  function acquire(record: typeof EQUIPMENT_CATALOGUE[number], acquiredAs: "gifted" | "inherited" | "granted") {
    try {
      if (amount(record.source.id) < 1) throw new Error("Enter a positive whole quantity.");
      acquireEquipment(record.source.id, amount(record.source.id), acquiredAs, record.source.category === "armour" ? armourSelectionFor(record.source) : undefined);
      message = `${displayCatalogueEquipmentName(record.source)}: added as ${acquiredAs}.`;
      freeAcquisition[record.source.id] = "";
    } catch (error) { message = error instanceof Error ? error.message : "Could not add item."; }
  }
  function changeMoney(field: "startingCp" | "spentCp" | "remainingCp", value: string) {
    try {
      setEquipmentMoney(field, Number(value));
      message = "Money value updated. Purchases and refunds keep manually entered values until reset.";
    } catch (error) { message = error instanceof Error ? error.message : "Could not update money value."; }
  }
  function resetMoney(field: "startingCp" | "spentCp" | "remainingCp") {
    resetEquipmentMoney(field);
    message = "Money value reset to its calculated amount.";
  }
  function setArmourLocation(item: typeof char.background.inventory[number], location: HitLocationName, checked: boolean) {
    const locations = item.armour?.locations ?? [];
    saveInventoryChange(item.id, item.name, { armour: { locations: checked ? [...new Set([...locations, location])] : locations.filter(value => value !== location), coverageResolved: true } });
  }
  function setOwnedArmourMaterial(item: typeof char.background.inventory[number], material: ArmourMaterialId) {
    const construction = item.armour?.construction;
    const status = construction ? armourMaterialCompatibility(construction, material) : "conditional";
    saveInventoryChange(item.id, item.name, { armour: { material, compatibility: status === "compatible" ? "compatible" : "incompatible" } });
  }
  function setOwnedArmourOverride(item: typeof char.background.inventory[number], checked: boolean) {
    saveInventoryChange(item.id, item.name, { armour: { gmCompatibilityOverride: checked } });
  }
  function saveInventoryChange(itemId: string, itemName: string, update: Parameters<typeof updateInventoryItem>[1]) {
    try {
      updateInventoryItem(itemId, update);
      message = `${itemName}: equipment updated.`;
    } catch (error) { message = error instanceof Error ? error.message : `Could not update ${itemName}.`; }
  }
  function removeInventoryItem(itemId: string, itemName: string) {
    if (!window.confirm(`Remove ${itemName} from your equipment? This does not refund a purchase.`)) return;
    deleteInventoryItem(itemId);
    message = `${itemName}: removed from your equipment. This does not refund a purchase.`;
  }
  async function closeDetails(recordId: string) {
    selectedId = null;
    await tick();
    document.getElementById(`equipment-result-${recordId}`)?.focus();
  }
  function editInventoryQuantity(itemId: string, itemName: string, value: string) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      message = `${itemName}: enter a positive whole quantity.`;
      return;
    }
    saveInventoryChange(itemId, itemName, { quantity: parsed });
  }
</script>

<section class="card inventory-ledger" aria-label="Equipment">
  <h3>Equipment</h3>
  <nav class="activity-nav" aria-label="Equipment activities">
    <button type="button" aria-current={view === "choose" ? "page" : undefined} onclick={() => view = "choose"}>Choose equipment</button>
    <button type="button" aria-current={view === "owned" ? "page" : undefined} onclick={() => view = "owned"}>Your equipment <span>{char.background.inventory.length}</span></button>
  </nav>
  {#if message}<p class="hint" role="status" aria-live="polite">{message}</p>{/if}
  <details class="catalogue-info"><summary>Rules &amp; sources</summary>
    <p class="mute">All purchases and expenses are recorded in integer CP. Source records distinguish physical items, weapon profiles, material modifiers, and non-carried services.</p>
    <p class="mute">Weapon profiles describe how an item is used and do not create a second possession. Material modifiers are not standalone items. Services and expenses affect money without adding carried inventory.</p>
    <p class="mute">Material price adjustments are GM-defined.</p>
  </details>

  {#if view === "owned"}
  <h4>Your equipment</h4>
  <div class="review-summary" aria-live="polite" aria-label="Equipment summary">
    <div><small>Carried load (ENC)</small><b>{load.load === null ? `At least ${load.knownLoad} ENC · unknown` : `${load.load} ENC · ${load.band}`}</b></div>
    <div><small>Protected locations</small><b>{armourItems.length ? `${Object.values(armourSummary.apByLocation).filter(ap => ap !== null && ap > 0).length} effectively protected` : "No armour recorded"}</b></div>
    {#if wornArmourItems.length}<div><small>Armour initiative penalty</small><b>{armourSummary.initiativePenalty === null ? "Unknown" : armourSummary.initiativePenalty}</b></div>{/if}
  </div>
  {#if load.unresolvedItems.length}<p class="balance-warning" role="status">Load is incomplete. Add ENC for: {load.unresolvedItems.join(", ")}.</p>{/if}
  {#if armourSummary.unresolved.length}<p class="balance-warning" role="status">Armour needs review: {armourSummary.unresolved.join("; ")}</p>{/if}
  <h5 class="owned-heading">Owned equipment</h5>
  {#if char.background.inventory.length}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll inventory-scroll" role="region" aria-label="Owned equipment inventory" tabindex="0">
    <table class="sheet-table inventory-table">
      <thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">State</th><th scope="col">ENC/Item</th><th scope="col">Current HP</th><th scope="col">ENC Exempt</th><th scope="col">Actions</th></tr></thead>
      <tbody>
      {#each orderedInventory as item, index (item.id)}
        <tr>
          <th scope="row" data-label="Item"><div class="owned-item-line"><span class="owned-name">{item.name}{#if item.customItem} <span class="tag">Custom</span>{/if}</span>
            {#if item.armour}<button type="button" class="armour-editor-toggle" aria-expanded={openArmourEditorId === item.id} aria-controls={`owned-armour-editor-${item.id}`} onclick={() => openArmourEditorId = openArmourEditorId === item.id ? null : item.id}>Armour locations and fit</button>{/if}
          </div></th>
          <td data-label="Quantity"><label class="sr-only" for={`owned-quantity-${item.id}`}>Quantity of {item.name}</label><input id={`owned-quantity-${item.id}`} class="compact-number" aria-label={`Quantity of ${item.name}`} type="number" min="1" step="1" value={item.quantity} onchange={event => editInventoryQuantity(item.id, item.name, event.currentTarget.value)}></td>
          <td data-label="State"><label class="sr-only" for={`owned-state-${item.id}`}>State of {item.name}</label><select class="state-select" id={`owned-state-${item.id}`} aria-label={`State of ${item.name}`} value={item.state} onchange={event => saveInventoryChange(item.id, item.name, { state: event.currentTarget.value as "carried" | "worn" | "stored" })}>
                  <option value="carried">Carried</option><option value="worn">Worn</option><option value="stored">Stored</option>
          </select></td>
          <td data-label="ENC/Item"><label class="sr-only" for={`owned-enc-${item.id}`}>{inventoryEncLabel(item)} for {item.name}</label>
            <input id={`owned-enc-${item.id}`} class="compact-number" aria-label={`${inventoryEncLabel(item)} for ${item.name}`} type="number" min="0" step="0.25" value={item.armour ? item.armour.encOverride ?? "" : item.encPerUnit ?? ""} placeholder={item.armour ? "Derived" : "Unknown"} onchange={event => saveInventoryChange(item.id, item.name, item.armour ? { armour: { encOverride: event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value) } } : { encPerUnit: event.currentTarget.value === "" ? null : Number(event.currentTarget.value) })}>
          </td>
          <td data-label="Current HP">{#if itemHasStructuralHp(item)}{@const maxHp = inventoryItemMaximumHp(item)}
            <label class="sr-only" for={`owned-current-hp-${item.id}`}>Current HP for {item.name}</label>
            <input id={`owned-current-hp-${item.id}`} class="compact-number" aria-label={`Current HP for ${item.name}`} type="number" min="0" max={maxHp} step="1" value={item.currentHp ?? maxHp ?? ""} placeholder={maxHp === undefined ? "Unknown" : String(maxHp)} onchange={event => saveInventoryChange(item.id, item.name, { currentHp: event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value) })}>
          {/if}</td>
          <td data-label="ENC Exempt"><label class="exemption-control"><input type="checkbox" aria-label={`Exempt ${item.name} from load`} checked={!!item.encumbranceExempt} onchange={event => saveInventoryChange(item.id, item.name, { encumbranceExempt: event.currentTarget.checked })}></label></td>
          <td class="row-actions" data-label="Actions"><div class="inventory-reorder-actions">
            <button type="button" class="ghost reorder-button" aria-label={`Move ${item.name} up`} title="Move up" disabled={index === 0} onclick={() => moveOwnedInventoryItem(item.id, -1)}>▲</button>
            <button type="button" class="ghost reorder-button" aria-label={`Move ${item.name} down`} title="Move down" disabled={index === orderedInventory.length - 1} onclick={() => moveOwnedInventoryItem(item.id, 1)}>▼</button>
            <button type="button" class="ghost" aria-label={`Remove ${item.name}`} onclick={() => removeInventoryItem(item.id, item.name)}>Remove</button>
          </div></td>
        </tr>
        {#if item.armour && openArmourEditorId === item.id}
          {@const ownedMaterialNeedsApproval = !!(item.armour.construction && item.armour.material && armourMaterialCompatibility(item.armour.construction, item.armour.material) !== "compatible")}
          <tr class="armour-detail-row"><td colspan="7">
            <section class="armour-editor" id={`owned-armour-editor-${item.id}`} aria-label={`Armour locations and fit for ${item.name}`}>
              <div class="armour-editor-heading"><h6>Armour properties</h6>
                <label class="material-override owned-material-override"><input type="checkbox" checked={!!item.armour.gmCompatibilityOverride} disabled={!!item.armour.gmCompatibilityOverride && ownedMaterialNeedsApproval} onchange={event => setOwnedArmourOverride(item, event.currentTarget.checked)}> <span>Allow Nonstandard Material — GM Approval</span></label>
                {#if item.armour.gmCompatibilityOverride && ownedMaterialNeedsApproval}<small class="owned-material-warning" role="status">Choose a standard compatible material before turning approval off.</small>{/if}
              </div>
              <div class="armour-properties">
                <label>Construction <select aria-label={`Construction for ${item.name}`} value={item.armour.construction ?? ""} onchange={event => saveInventoryChange(item.id, item.name, { armour: { construction: event.currentTarget.value as keyof typeof ARMOUR_CONSTRUCTIONS || null } })}>
                <option value="">Unresolved</option>{#each Object.entries(ARMOUR_CONSTRUCTIONS) as [id, construction]}<option value={id}>{construction.name}</option>{/each}
              </select></label>
              <label>Material <select aria-label={`Material for ${item.name}`} value={item.armour.material ?? ""} onchange={event => setOwnedArmourMaterial(item, event.currentTarget.value as ArmourMaterialId)}>
                <option value="">Unresolved</option>{#each Object.entries(ARMOUR_MATERIALS) as [id, material]}{@const status = item.armour.construction ? armourMaterialCompatibility(item.armour.construction, id as ArmourMaterialId) : "conditional"}<option value={id} disabled={status !== "compatible" && !item.armour.gmCompatibilityOverride}>{material.name} (ENC ×{material.encMultiplier}){status === "incompatible" ? " · incompatible" : status === "conditional" ? " · GM approval" : ""}</option>{/each}
              </select></label>
              <label>Fit <select aria-label={`Fit for ${item.name}`} value={item.armour.fit} onchange={event => saveInventoryChange(item.id, item.name, { armour: { fit: event.currentTarget.value as "fitted" | "ill_fitting" | "unresolved" } })}>
                <option value="unresolved">Unresolved</option><option value="fitted">Fitted</option><option value="ill_fitting">Ill fitting</option>
              </select></label>
              <label>Compatibility <select aria-label={`Compatibility for ${item.name}`} value={item.armour.compatibility} onchange={event => saveInventoryChange(item.id, item.name, { armour: { compatibility: event.currentTarget.value as "compatible" | "incompatible" | "conditional" | "unresolved" } })}>
                <option value="unresolved">Unresolved</option><option value="compatible">Compatible</option><option value="conditional">Conditional</option><option value="incompatible">Incompatible</option>
              </select></label>
              </div>
              {#if item.armour.fit === "unresolved" || item.armour.compatibility === "unresolved"}<p class="armour-editor-warning" role="status">Fit or compatibility needs review. Resolve both settings to confirm effective protection; nominal AP remains listed by hit location.</p>{/if}
              <ProtectedHitLocations idPrefix={`owned-armour-locations-${item.id}`} selected={item.armour.locations} guidance="Choose the locations this piece protects. This selection is saved for this armour item." onSelectAll={() => saveInventoryChange(item.id, item.name, { armour: { locations: [...HIT_LOCATIONS], coverageResolved: true } })} onClearAll={() => saveInventoryChange(item.id, item.name, { armour: { locations: [], coverageResolved: true } })} onchange={(location, checked) => setArmourLocation(item, location, checked)} />
              <details class="armour-secondary-disclosure"><summary>Rules help</summary>
                <p class="mute">Flexible armour typically fits SIZ ±1; rigid armour needs wearer-specific SIZ and proportions. Record fit explicitly. No automatic layering: overlapping pieces use highest AP and every worn piece adds ENC. Compatibility remains unresolved until confirmed or GM overridden.</p>
              </details>
            </section>
          </td></tr>
        {/if}
      {/each}
      </tbody>
    </table>
    </div>
  {:else}<p class="empty-state">No equipment yet. Choose equipment to add an item.</p>{/if}
  <section class="sheet-section" aria-labelledby="armour-table-heading">
    <h5 id="armour-table-heading">Armour by hit location</h5>
    {#if wornArmourItems.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-scroll" role="region" aria-label="Armour by hit location" tabindex="0">
        <table class="sheet-table"><thead><tr><th scope="col">Hit location</th><th scope="col">Armour worn</th><th scope="col">Nominal AP</th><th scope="col">ENC</th></tr></thead>
          <tbody>{#each ownedArmourRows as row}<tr><th scope="row">{row.location}</th><td>{[...row.pieces.map(item => item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name), ...row.unresolvedCoverage.map(item => `${item.name} (coverage unknown)`)].join(", ") || "—"}</td><td>{row.ap === null ? "Unknown" : row.ap || "—"}</td><td>{row.enc === null ? "Unknown" : row.enc || "—"}</td></tr>{/each}</tbody>
        </table>
      </div>
      <p class="mute">Nominal AP comes from armour construction. Fit and material compatibility determine whether that protection is effective.</p>
      <dl class="armour-totals">
        <div><dt title="The ENC for all worn armour pieces before the worn-load adjustment.">Total worn armour ENC</dt><dd>{armourSummary.fullWornEnc ?? "Unknown"}</dd></div>
        <div><dt title="Worn armour counts half ENC; carried armour counts full ENC.">Armour ENC counted toward load</dt><dd>{armourLoad.load ?? "Unknown"}</dd></div>
        <div><dt>Armour initiative penalty</dt><dd>Shown in Equipment summary above</dd></div>
      </dl>
      <p class="mute armour-layering-note">Overlapping armour uses the highest AP; protection does not stack. Each worn piece still adds its ENC.</p>
    {:else}<p class="empty-state">No worn armour.</p>{/if}
  </section>
  <section class="sheet-section" aria-labelledby="melee-table-heading">
    <h5 id="melee-table-heading">Melee weapons &amp; shields</h5>
    {#if meleeWeaponRows.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-scroll" role="region" aria-label="Melee weapons and shields" tabindex="0"><table class="sheet-table weapon-table melee-weapon-table"><thead><tr><th scope="col">Weapon</th><th scope="col">Damage</th><th scope="col">Size</th><th scope="col">Reach</th><th scope="col">Traits</th><th scope="col">Combat effects</th><th scope="col">AP</th><th scope="col">HP</th><th scope="col">ENC</th></tr></thead>
        <tbody>{#each meleeWeaponRows as row (row.item.id)}{@const profile = row.record?.combat_profile_candidate}<tr><th scope="row">{row.item.name}{#if row.item.quantity > 1} × {row.item.quantity}{/if}</th><td>{row.custom?.damage ?? profile?.damage ?? "—"}</td><td>{row.custom?.size ?? (profile?.size === "M" ? "Medium" : profile?.size) ?? "—"}</td><td>{row.custom?.reach ?? (profile?.reach === "M" ? "Medium" : profile?.reach) ?? "—"}</td><td>{row.custom?.traits || "—"}</td><td>—</td><td>{row.custom?.ap ?? row.record?.ap_candidate ?? "—"}</td><td>{row.custom?.hp ?? row.record?.hp_candidate ?? "—"}</td><td>{row.item.encPerUnit === null ? "Unknown" : row.item.encPerUnit}</td></tr>{/each}</tbody>
      </table></div>
    {:else}<p class="empty-state">No owned melee weapons or shields.</p>{/if}
  </section>
  <section class="sheet-section" aria-labelledby="ranged-table-heading">
    <h5 id="ranged-table-heading">Ranged weapons</h5>
    {#if rangedWeaponRows.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-scroll ranged-table-scroll" role="region" aria-label="Ranged weapons" tabindex="0"><table class="sheet-table weapon-table ranged-weapon-table"><thead><tr><th scope="col">Weapon</th><th scope="col">Damage</th><th scope="col">Force</th><th scope="col">DM</th><th scope="col">Range</th><th scope="col">Load</th><th scope="col">Combat effects</th><th scope="col">AP</th><th scope="col">HP</th><th scope="col">ENC</th></tr></thead>
        <tbody>{#each rangedWeaponRows as row (row.item.id)}{@const stats = row.record ? RANGED_WEAPON_STATS[row.record.id] : undefined}<tr><th scope="row">{row.item.name}{#if row.item.quantity > 1} × {row.item.quantity}{/if}</th><td>{stats ? rangedCellText(stats.damage) : "Unknown"}</td><td>{stats ? rangedCellText(stats.force) : "Unknown"}</td><td>{stats ? rangedCellText(stats.damageModifier) : "Unknown"}</td><td>{stats ? formatRangedRange(stats.range) : "Unknown"}</td><td>{stats ? rangedCellText(stats.load) : "Unknown"}</td><td>{stats ? rangedCellText(stats.combatEffects) : "Unknown"}</td><td>{stats ? rangedCellText(stats.ap) : "Unknown"}</td><td>{stats ? rangedCellText(stats.hp) : "Unknown"}</td><td>{stats ? rangedCellText(stats.enc) : "Unknown"}</td></tr>{/each}</tbody>
      </table></div>
    {:else}<p class="empty-state">No owned ranged weapons.</p>{/if}
  </section>
  <details class="review-details load-breakdown"><summary>How load is calculated / Load breakdown</summary>
  <p class="mute">Item ENC is the item's listed ENC before state adjustments. Worn armour's contribution is half its full ENC; this load contribution is separate from its initiative penalty.</p>
  <div class="load-breakdown-table-wrap">
    <table class="sheet-table load-breakdown-table"><thead><tr><th scope="col">Component</th><th scope="col">Item ENC</th><th scope="col">Quantity / state</th><th scope="col">Load contribution</th></tr></thead>
      <tbody>
        {#each loadBreakdown.otherItems as row (row.item.id)}
          <tr><th scope="row">{row.item.name}{#if row.item.encumbranceExempt} <span class="mute">(load exempt)</span>{/if}</th><td>{row.item.encPerUnit === null ? "Unknown" : `${row.item.encPerUnit} each`}</td><td>{row.item.quantity} · {row.item.state}</td><td>{row.excluded ? "Not counted" : row.item.encPerUnit === null ? "Unknown" : row.item.encPerUnit === 0 ? "Counted by zero-ENC rule" : `${row.contribution} ENC`}</td></tr>
        {/each}
        {#each armourBreakdownRows as row (row.item.id)}
          <tr><th scope="row">{row.item.name}{#if row.item.encumbranceExempt} <span class="mute">(load exempt)</span>{/if}</th><td>{row.unitEnc === null ? "Unknown" : `${row.unitEnc} per covered location · ${row.fullEnc === null ? "full ENC unknown" : `${row.fullEnc} full ENC`}`}</td><td>{row.item.quantity} · {row.item.state}</td><td>{row.item.state === "stored" || row.item.encumbranceExempt ? "Not counted" : row.contribution === null ? "Unknown" : `${row.contribution} ENC`}</td></tr>
        {/each}
        {#if loadBreakdown.zeroEncItems}<tr><th scope="row">Zero-ENC items</th><td>0 ENC each</td><td>{loadBreakdown.zeroEncItems} carried or worn</td><td>{Math.floor(loadBreakdown.zeroEncItems / 20)} ENC ({loadBreakdown.zeroEncItems} items count as 1 ENC per 20)</td></tr>{/if}
      </tbody>
    </table>
  </div>
  <p class="load-result"><b>Current load:</b> {load.load === null ? `At least ${load.knownLoad} ENC · incomplete` : `${load.load} ENC · ${load.band}`}</p>
  <div class="load-summary" aria-live="polite">
    <div class="load-threshold-card"><div class="load-thresholds" role="group" aria-label={`Encumbrance thresholds for STR ${char.chars.STR}`}>
      <b>Encumbrance thresholds (STR {char.chars.STR})</b>
      {#if thresholdRows.length}<dl>{#each thresholdRows as row}<div><dt>{row.label}</dt><dd>{row.multiplier} ({row.enc} ENC)</dd></div>{/each}</dl>{:else}<span>Unknown</span>{/if}
    </div></div>
    <div class="load-metrics">
      <div><small>Movement</small><b>{load.movement}</b></div>
      <div><small>Skills</small><b>{load.skillDifficultyGrades === null ? "Unknown" : load.skillDifficultyGrades === 0 ? "No penalty" : `${load.skillDifficultyGrades} grade${load.skillDifficultyGrades === 1 ? "" : "s"} harder`}</b></div>
      <div><small>Sprinting</small><b>{load.sprinting}</b></div>
      <div><small>Fatigue</small><b>{load.fatigue}</b></div>
    </div>
  </div>
  <p class="mute">Stored and load-exempt items do not count. Twenty zero-ENC items count as 1 ENC. Armour ENC is based on construction, material, coverage, and any item override.</p>
  </details>
  <section class="money-summary" aria-label="Money summary in SP">
    {#each moneyFields as amount (amount.field)}
      <div class="money-summary-card">
        <label for={`money-${amount.field}`}>{amount.label} (SP)</label>
        <div class="money-edit-row">
          <input id={`money-${amount.field}`} type="number" min="0" step="0.1" value={equipmentMoneyValueCp(amount.field) / 10}
            aria-label={`${amount.label} money in SP`} onchange={event => changeMoney(amount.field, event.currentTarget.value)} />
          <button type="button" class="ghost" aria-label={`Reset to calculated ${amount.label} money`} disabled={!equipmentMoneyIsOverridden(amount.field)} onclick={() => resetMoney(amount.field)}>Reset to calculated</button>
        </div>
      </div>
    {/each}
  </section>
  <p class="money-guidance">Purchases and refunds update calculated amounts. Manually entered values stay as entered until reset.</p>
  {/if}

  {#if view === "choose"}
  <h4>Choose equipment</h4>
  <p class="mute">Choose a group or search everything. Select an item to see its details and options.</p>
  <div class="choose-actions"><button type="button" class="primary" onclick={() => resetCustomForm()}>Create custom item</button></div>
  {#if customFormOpen}
    <section class="item-detail custom-form" aria-labelledby="custom-form-title">
      <h5 id="custom-form-title">{editingCustomId ? "Edit custom item" : "Create custom item"}</h5>
      <p class="mute">Custom definitions belong to this character. Saving a definition does not buy it or add it to inventory.</p>
      <div class="custom-identity">
        <label>Item type <select bind:value={customType}><option value="weapon">Weapon</option><option value="shield">Shield</option><option value="armour">Armour</option><option value="clothing">Clothing</option><option value="gear">Tools / gear</option><option value="ammunition">Ammunition</option><option value="vehicle">Vehicle</option><option value="supply">Supply</option><option value="service">Service</option><option value="other">Other</option></select></label>
        <label>Item name <input bind:value={customName} required maxlength="100" autocomplete="off"></label>
      </div>
      <label class="custom-field-wide">Description / notes <textarea bind:value={customDescription} rows="4" maxlength="1000"></textarea></label>
      <div class="custom-fields">
        <label>Price (SP) <input type="number" min="0" step="0.1" bind:value={customPriceSp} placeholder="Unknown / ask GM"><small>Blank means unknown. Decimal tenths of an SP record CP remainder.</small></label>
        <label>ENC <input type="number" min="0" step="0.25" bind:value={customEnc} placeholder="Unknown"><small>Blank stays unresolved in load calculations.</small></label>
        {#if customType === "weapon" || customType === "shield"}
          <label>Base damage <input bind:value={customDamage} placeholder="e.g. 1d8" aria-describedby="custom-damage-help"><small id="custom-damage-help">Dice expression only; apply Damage Modifier separately where appropriate.</small></label>
          <label>Size <select bind:value={customSize}><option value="">Choose…</option><option>Tiny</option><option>Small</option><option>Medium</option><option>Large</option><option>Huge</option></select></label>
          <label>Reach <select bind:value={customReach}><option value="">Choose…</option><option>Touch</option><option>Short</option><option>Medium</option><option>Long</option><option>Very Long</option></select></label>
          <label>{customType === "shield" ? "Shield AP" : "Weapon AP"} <input type="number" min="0" step="1" bind:value={customAp} placeholder="Unknown"></label>
          <label>{customType === "shield" ? "Shield HP" : "Weapon HP"} <input type="number" min="0" step="1" bind:value={customHp} placeholder="Unknown"></label>
          {#if customType === "weapon"}<label>Hands required <select bind:value={customHands}><option value="">Choose…</option><option value="1">One hand</option><option value="2">Two hands</option></select></label>{/if}
        {:else if customType === "armour"}
          <label>Protection AP <input type="number" min="0" step="1" bind:value={customAp} placeholder="Unknown"></label>
          <label>Construction <select bind:value={customConstruction}><option value="">Unresolved / GM-defined</option>{#each Object.entries(ARMOUR_CONSTRUCTIONS) as [id, construction]}<option value={id}>{construction.name}</option>{/each}</select></label>
          <label>Material <select bind:value={customMaterial}><option value="">Unresolved / GM-defined</option>{#each Object.entries(ARMOUR_MATERIALS) as [id, material]}<option value={id}>{material.name} · ENC ×{material.encMultiplier}</option>{/each}</select></label>
          {#if Object.hasOwn(ARMOUR_CONSTRUCTIONS, customConstruction) && Object.hasOwn(ARMOUR_MATERIALS, customMaterial)}
            {@const customMaterialStatus = armourMaterialCompatibility(customConstruction as ArmourConstructionId, customMaterial as ArmourMaterialId)}
            {#if customMaterialStatus !== "compatible"}<p class="balance-warning">{customMaterialStatus === "incompatible" ? "Core notes do not list this combination." : "Core notes do not establish this combination as standard."} Use an explicit GM override if approved.</p>{/if}
            <label class="material-override"><input type="checkbox" bind:checked={customArmourGmOverride}> <span>Allow nonstandard material (GM approval)<small>Enables material combinations outside the standard rules when the GM approves.</small></span></label>
          {/if}
          <ProtectedHitLocations idPrefix="custom-locations" selected={customLocations} guidance="Select every body location this armour protects. Choose at least one." error={customLocationsError ? "Select at least one protected hit location before saving." : ""} onchange={(location, checked) => { customLocations = checked ? [...new Set([...customLocations, location])] : customLocations.filter(item => item !== location); if (customLocations.length) customLocationsError = false; }} />
        {/if}
      </div>
      {#if customType === "armour"}<p class="mute custom-armour-help">Custom AP applies only to selected locations. Enter effective ENC for this custom piece; the selected material multiplier does not change its price. The existing fit and compatibility checks still govern worn armour.</p>{/if}
      {#if customType === "weapon" || customType === "shield"}
        <label class="custom-field-wide">Special effects / traits <textarea bind:value={customTraits} rows="4" placeholder="GM-defined notes"></textarea><small>Notes only; these do not change combat calculations.</small></label>
      {/if}
      <div class="choose-actions"><button type="button" class="primary" onclick={submitCustomDefinition}>{editingCustomId ? "Save changes" : "Save custom item"}</button><button type="button" onclick={() => { customFormOpen = false; editingCustomId = null; }}>Cancel</button></div>
    </section>
  {/if}
  {#if customDefinitions.length}
    <section class="my-custom-items" aria-labelledby="my-custom-items-title">
      <h5 id="my-custom-items-title">My Custom Items</h5>
      <ul class="catalogue-list">
        {#each customDefinitions as definition (definition.id)}
          <li class="custom-entry"><div class="custom-entry-title"><b>{definition.name}</b><span class="tag">Custom · {definition.type}</span><span>{definition.priceCp === null ? "Price unknown" : formatCopperPrice(definition.priceCp)} · {definition.enc === null ? "ENC unknown" : `${definition.enc} ENC`}</span>
            {#if definition.description}<p class="mute">{definition.description}</p>{/if}
            {#if definition.damage}<small>{definition.damage} · {definition.size} size · {definition.reach} reach · AP {definition.ap} · HP {definition.hp}{#if definition.type === "weapon"} · {definition.hands} hand(s){/if}</small>{/if}
            {#if definition.traits}<small>GM-defined traits: {definition.traits}</small>{/if}
            {#if definition.type === "armour"}<small>AP {definition.ap} · Locations: {definition.protectedLocations?.join(", ")}</small>{/if}
          </div>
          <div class="custom-entry-actions"><label>Quantity <input type="number" min="1" step="1" value={customQuantity[definition.id] ?? "1"} onchange={event => customQuantity[definition.id] = event.currentTarget.value}></label>
            <button type="button" disabled={definition.priceCp === null || Number(customQuantity[definition.id] ?? "1") < 1 || definition.priceCp * Number(customQuantity[definition.id] ?? "1") > availableBalanceCp} onclick={() => buyCustom(definition)}>{definition.type === "service" ? "Buy / record expense" : "Buy"}</button>
            {#if definition.type !== "service"}<button type="button" onclick={() => giftCustom(definition)}>Add without paying</button>{/if}
            <button type="button" onclick={() => resetCustomForm(definition)}>Edit</button><button type="button" class="ghost" onclick={() => removeCustomDefinition(definition)}>Remove definition</button>
          </div></li>
        {/each}
      </ul>
    </section>
  {/if}
  <div class="catalogue-filters">
    <label>Search all equipment <input type="search" bind:value={query} placeholder="Search all 206 records by name or source"></label>
    <label>Sort by <select bind:value={sort}><option value="name">Name</option><option value="price">Price (lowest first)</option></select></label>
  </div>
  {#if !query.trim() && group === null}
    <div class="group-buttons" aria-label="Equipment groups">
      {#each categoryGroups as entry}
        <button type="button" class="group-button" onclick={() => { group = entry.name; category = null; selectedId = null; }}><b>{entry.name}</b><span>{entry.categories.reduce((total, id) => total + categoryCount(id), 0)} items</span></button>
      {/each}
    </div>
  {:else}
    <div class="browse-trail">
      <button type="button" class="back-button" onclick={() => { group = null; category = null; selectedId = null; }}>← All groups</button>
      {#if group && !query.trim()}<button type="button" class="breadcrumb-button" aria-current={category === null ? "location" : undefined} onclick={() => { category = null; selectedId = null; }}>{group}</button>{/if}
      {#if category && !query.trim()}<span aria-current="location">{categoryLabel(category)}</span>{/if}
      {#if query.trim()}<span aria-live="polite">Search results: {shown.length}</span>{/if}
    </div>
    {#if group && !query.trim() && category === null}
      <div class="subcategory-buttons" aria-label="{group} categories">
        {#each categoryGroups.find(entry => entry.name === group)?.categories.filter(id => categories.includes(id)) ?? [] as id}
          <button type="button" onclick={() => { category = id; selectedId = null; }}>{categoryLabel(id)} <span>{categoryCount(id)}</span></button>
        {/each}
      </div>
    {/if}
    {#if query.trim()}<p class="mute" aria-live="polite">Searches all {EQUIPMENT_CATALOGUE.length} equipment records.</p>{/if}
    {#if category !== null || query.trim()}
    <p class="mute">{shown.length} items. Choose an item for details and actions.</p>
    {#if shown.length}
      <ul class="catalogue-list" aria-label="Equipment results">
        {#each shown as entry (entry.source.id)}
          {@const record = entry.source}
          <li><button id={`equipment-result-${record.id}`} type="button" class="catalogue-row" aria-expanded={selectedId === record.id} aria-controls={selectedId === record.id ? "selected-item-detail" : undefined} onclick={() => selectedId = selectedId === record.id ? null : record.id}>
            <span class="row-main"><b>{displayCatalogueEquipmentName(record)}</b><small>{categorySummary(record.category)}</small></span>
            <span class="row-price">{displayEquipmentPrice(record)}</span>
          </button>
          {#if selected && selected.source.id === record.id}
            {@const unavailable = record.price_cp_candidate === null}
            <section id="selected-item-detail" class="item-detail" aria-labelledby="selected-item-title">
              <div class="detail-title"><div><h5 id="selected-item-title">{displayCatalogueEquipmentName(record)}</h5><p class="mute">{categorySummary(record.category)} · {displayEquipmentPrice(record)}</p></div>
                <button type="button" class="ghost" aria-label="Close item details" onclick={() => closeDetails(record.id)}>Close</button>
              </div>
              {#if hasCombatProfile(record)}
                <dl class="weapon-detail-stats">
                  {#each combatStats(record) as [name, value]}
                    <div><dt>{name}</dt><dd>{value}</dd></div>
                  {/each}
                </dl>
                <details class="rules-help"><summary aria-label={`Rules help for ${displayCatalogueEquipmentName(record)}`}>Rules help</summary>
                  {#if record.category === "ranged"}
                    <p>Damage, Force, Damage Modifier, range bands, Load, Combat Effects, AP, HP and ENC follow the Ranged Weapons table. A dash preserves a rulebook dash; projectile-dependent damage is not assigned to the weapon.</p>
                    {#if rangedImpaleSize(record)}<p>Impale size: {rangedImpaleSize(record)}.</p>{/if}
                    <p>Weapon AP and HP measure durability, not character armour or hit points.</p>
                  {:else}
                    <p>Listed dice are base damage. Add your character’s Damage Modifier when the rules call for it.</p>
                    <p>Size compares a weapon with an incoming attack when parrying. Reach describes how far the weapon can engage and can affect who controls the distance.</p>
                    <p>Encumbrance (ENC) measures the item's contribution to carried load. Worn armour uses its separate half-ENC rule; stored items add no carried load.</p>
                    <p>{record.category === "shields" ? "Shield" : "Weapon"} AP and {record.category === "shields" ? "shield" : "weapon"} HP measure the item's durability. They are not character armour points or character hit points. Hands required tells you how to wield it.</p>
                  {/if}
                </details>
              {:else}
                <p>{statSummary(selected) || "No combat details available."}</p>
              {/if}
              <p class="mute">Source: Mythras Core, p. {record.source_printed_page}.</p>
              {#if selected.kind === "wielding_profile"}<p class="mute">Choose this option for a weapon you own. It does not add a second item.</p>{/if}
              {#if selected.kind === "armour_material_modifier"}<p class="balance-warning">This modifier is not a separate item to buy.</p>{/if}
              {#if selected.kind === "non_carried_purchase"}<p class="mute">This is a service or expense. It changes your money without adding carried equipment.</p>{/if}
              {#if record.base_enc_per_location === undefined && selected.kind === "physical_item" && record.category === "armour"}<p class="balance-warning">ENC per location is unknown; resolve it on the owned armour record when acquired.</p>{/if}
              {#if record.category === "armour" && selected.kind === "physical_item" && armourConstructionFor(record)}
                {@const constructionId = armourConstructionFor(record)!}
                {@const chosenMaterial = materialFor(record)}
                {@const materialStatus = armourMaterialCompatibility(constructionId, chosenMaterial)}
                <div class="catalogue-armour-options">
                  <label>Material <select aria-label={`Material for ${displayCatalogueEquipmentName(record)}`} value={chosenMaterial} onchange={event => armourMaterial[record.id] = event.currentTarget.value as ArmourMaterialId}>
                    {#each Object.entries(ARMOUR_MATERIALS) as [id, material]}
                      {@const status = armourMaterialCompatibility(constructionId, id as ArmourMaterialId)}
                      <option value={id} disabled={status !== "compatible" && !armourGmOverride[record.id]}>{material.name}{id === standardArmourMaterial(constructionId) ? " · Standard material" : ""} · ENC ×{material.encMultiplier}{status === "incompatible" ? " · incompatible" : status === "conditional" ? " · GM approval" : ""}</option>
                    {/each}
                  </select></label>
                  <p class="mute">{ARMOUR_MATERIALS[chosenMaterial].name} gives {armourEncumbrance(constructionId, chosenMaterial)} ENC per protected location (raw multiplier; fractions are retained). Standard construction price is per location and does not change with material.</p>
                  {#if materialStatus !== "compatible"}<p class="balance-warning">{materialStatus === "incompatible" ? "Core notes do not list this material for this construction." : "Core notes do not establish this combination as standard."} Ask the GM before using it.</p>{/if}
                  <label class="material-override"><input type="checkbox" checked={!!armourGmOverride[record.id]} onchange={event => armourGmOverride[record.id] = event.currentTarget.checked}> <span>Allow nonstandard material (GM approval)<small>Enables material combinations outside the standard rules when the GM approves.</small></span></label>
                  <ProtectedHitLocations idPrefix={`armour-locations-${record.id}`} selected={locationsFor(record)} guidance="Choose the locations this piece covers. Price and total ENC use this selection; choose at least one." validation={!locationsFor(record).length ? "Select at least one protected hit location before buying or adding armour." : ""} onchange={(location, checked) => armourLocations[record.id] = checked ? [...new Set([...locationsFor(record), location])] : locationsFor(record).filter(value => value !== location)} />
                  <p class="mute" aria-live="polite">{locationsFor(record).length} locations · {armourEncumbrance(constructionId, chosenMaterial) * locationsFor(record).length} ENC full worn ENC · {armourEncumbrance(constructionId, chosenMaterial) * locationsFor(record).length / 2} ENC worn load{perLocationPrice(record) === undefined ? "" : ` · ${formatCopperPrice(perLocationPrice(record)! * locationsFor(record).length)} total for selected locations`}</p>
                </div>
              {/if}
              {#if selected.kind !== "armour_material_modifier"}
                <div class="purchase-controls">
                  <div class="acquisition-toolbar">
                    <div class="purchase-values">
                      <label class="quantity-control">Quantity <input class="quantity-input" aria-label={`Quantity of ${displayCatalogueEquipmentName(record)}`} aria-invalid={amount(record.id) < 1} aria-describedby={amount(record.id) < 1 ? `quantity-error-${record.id}` : undefined} type="number" min="1" step="1" value={quantity[record.id] ?? "1"} onchange={event => quantity[record.id] = event.currentTarget.value}></label>
                      {#if unavailable}<label class="gm-price-control">GM price (CP) {#if record.category === "armour"}<small>per protected location</small>{/if}<input aria-label={`GM price in CP${record.category === "armour" ? " per location " : " "}for ${displayCatalogueEquipmentName(record)}`} type="number" min="0" step="1" value={gmPrice[record.id] ?? ""} onchange={event => gmPrice[record.id] = event.currentTarget.value} placeholder="Required"><small>Enter 0 only when the GM approves a free item.</small></label>{/if}
                      {#if amount(record.id) > 0 && (!unavailable || customCp(record.id) !== undefined)}
                        {@const totalCp = (priceFor(record) ?? 0) * amount(record.id)}
                        <div class="purchase-total" aria-live="polite"><span>Total price</span><b>{formatCopperPrice(totalCp)}</b>{#if unavailable}<span>{customCp(record.id) === 0 ? "GM-approved zero price" : "GM-entered"}</span>{/if}</div>
                      {:else}<p class="purchase-total pending-total">{unavailable ? "Enter a GM price to see the total." : "Enter a positive whole quantity."}</p>{/if}
                    </div>
                    {#if selected.kind === "non_carried_purchase"}<button type="button" disabled={!canTransact(record)} onclick={() => purchase(selected)}>Record expense</button>
                    {:else}<button type="button" class="primary buy-button" disabled={!canTransact(record)} onclick={() => purchase(selected)}>{selected.kind === "wielding_profile" ? "Buy weapon" : "Buy"}</button>{/if}
                  {#if selected.kind !== "non_carried_purchase"}
                    <div class="free-acquisition">
                      <label>Add without paying <select aria-label={`Add ${displayCatalogueEquipmentName(record)} without paying`} value={freeAcquisition[record.id] ?? ""} disabled={amount(record.id) < 1} onchange={event => freeAcquisition[record.id] = event.currentTarget.value as "gifted" | "inherited" | "granted" | ""}>
                        <option value="">Choose an option…</option><option value="gifted">Gifted</option><option value="inherited">Inherited</option><option value="granted">Granted</option>
                      </select></label>
                      <button type="button" disabled={amount(record.id) < 1 || !freeAcquisition[record.id] || (record.category === "armour" && !canAcquireArmour(record))} onclick={() => { const acquiredAs = freeAcquisition[record.id]; if (acquiredAs) acquire(selected, acquiredAs); }}>Add item</button>
                    </div>
                  {/if}
                  </div>
                  {#if amount(record.id) < 1}<p class="balance-warning" id={`quantity-error-${record.id}`} role="status">Enter a positive whole quantity.</p>{/if}
                  {#if unavailable && gmPrice[record.id] !== undefined && gmPrice[record.id] !== "" && customCp(record.id) === undefined}<p class="balance-warning" role="status">Enter a whole number of CP that is zero or more.</p>{/if}
                  {#if amount(record.id) > 0 && priceFor(record) !== undefined && priceFor(record)! * amount(record.id) > availableBalanceCp}<p class="balance-warning" role="status">This costs more than your available funds. Reduce the quantity or ask the GM about the price.</p>{/if}
                </div>
              {/if}
            </section>
          {/if}
          </li>
        {/each}
      </ul>
    {:else}<p class="empty-state" role="status">No equipment matches. Try another name or category.</p>{/if}
    {/if}
  {/if}

  {/if}

</section>

<style>
  .inventory-ledger { margin-top: 1rem; }
  .activity-nav { display:flex; flex-wrap:wrap; gap:.5rem; margin:.75rem 0; border-bottom:1px solid var(--line); }
  .activity-nav button { flex:1 1 10rem; min-height:2.75rem; color:var(--fg); }
  .activity-nav button[aria-current="page"] { border-color:var(--acc); box-shadow:inset 0 -3px var(--acc); }
  .inventory-ledger :is(button,input,select,summary):focus-visible { outline:3px solid var(--acc); outline-offset:2px; }
  .activity-nav span { display:inline-grid; place-items:center; min-width:1.5rem; min-height:1.5rem; margin-left:.25rem; border:1px solid currentColor; border-radius:50%; font-size:.8rem; letter-spacing:0; }
  .money-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr)); gap:.5rem; margin:.75rem 0 .35rem; }
  .money-summary-card { min-width:0; display:grid; gap:.35rem; padding:.55rem; border:1px solid var(--line); border-radius:.5rem; }
  .money-summary-card > label { color:var(--mute); font-size:.85rem; }
  .money-edit-row { display:flex; align-items:center; gap:.4rem; min-width:0; }
  .money-edit-row input { box-sizing:border-box; width:7rem; min-width:0; min-height:2.5rem; }
  .money-edit-row button { min-height:2.5rem; padding:.35rem .5rem; font-size:.8rem; }
  .money-guidance { margin:.25rem 0 .8rem; color:var(--mute); font-size:.85rem; }
  .review-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr)); gap:.5rem; margin:.75rem 0; }
  .review-summary > div { min-width:0; display:flex; flex-direction:column; gap:.25rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; overflow-wrap:anywhere; }
  .review-summary small { color:var(--mute); }
  .review-details { margin:.65rem 0; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .review-details summary { min-height:1.5rem; cursor:pointer; font-weight:700; }
  .owned-heading { margin:.9rem 0 .35rem; }
  .sheet-section { margin-top:1.1rem; }
  .sheet-section h5 { margin:.4rem 0; }
  .table-scroll { max-width:100%; overflow:auto; border:1px solid var(--line); border-radius:.4rem; }
  .table-scroll:focus-visible { outline:3px solid var(--acc); outline-offset:2px; }
  .sheet-table { width:100%; border-collapse:collapse; font-size:.9rem; }
  .sheet-table th,.sheet-table td { padding:.45rem .55rem; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  .sheet-table thead th { background:color-mix(in srgb,var(--line) 30%,transparent); white-space:nowrap; }
  .sheet-table tbody tr:last-child > * { border-bottom:0; }
  .inventory-table { min-width:0; table-layout:fixed; }
  .inventory-table th,.inventory-table td { padding:.35rem .3rem; }
  .inventory-table th:nth-child(2) { width:4.5rem; }
  .inventory-table th:nth-child(3) { width:7rem; }
  .inventory-table th:nth-child(4) { width:6.5rem; }
  .inventory-table th:nth-child(5) { width:5rem; }
  .inventory-table th:nth-child(6) { width:6rem; }
  .inventory-table th:nth-child(7) { width:8rem; }
  .weapon-table { min-width:0; table-layout:fixed; font-size:.78rem; line-height:1.25; }
  .weapon-table th,.weapon-table td { padding:.35rem .3rem; overflow-wrap:anywhere; }
  .weapon-table thead th { white-space:normal; }
  .ranged-weapon-table th:first-child { width:15%; }
  .ranged-weapon-table th:nth-child(2),.ranged-weapon-table th:nth-child(3),.ranged-weapon-table th:nth-child(4),.ranged-weapon-table th:nth-child(6),.ranged-weapon-table th:nth-child(8),.ranged-weapon-table th:nth-child(9),.ranged-weapon-table th:nth-child(10) { width:7%; }
  .ranged-weapon-table th:nth-child(5) { width:12%; }
  .ranged-weapon-table th:nth-child(7) { width:17%; }
  .melee-weapon-table th:first-child { width:17%; }
  .melee-weapon-table th:nth-child(2),.melee-weapon-table th:nth-child(3),.melee-weapon-table th:nth-child(4) { width:8%; }
  .melee-weapon-table th:nth-child(5) { width:15%; }
  .melee-weapon-table th:nth-child(6) { width:18%; }
  .melee-weapon-table th:nth-child(7),.melee-weapon-table th:nth-child(8),.melee-weapon-table th:nth-child(9) { width:7%; }
  .owned-item-line { display:flex; align-items:center; flex-wrap:wrap; gap:.3rem .65rem; min-width:0; }
  .owned-name { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .armour-editor-toggle { flex:none; min-height:2rem; padding:.2rem .45rem; text-align:left; }
  .armour-detail-row > td { padding:.45rem !important; }
  .armour-editor { box-sizing:border-box; display:grid; grid-template-columns:minmax(0,1fr); gap:.85rem; width:100%; min-width:0; padding:.85rem; border:1px solid var(--line); border-radius:.5rem; white-space:normal; }
  .armour-editor-heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.5rem 1rem; min-width:0; }
  .armour-editor h6 { margin:0; font-size:1rem; }
  .owned-material-override { align-items:center; }
  .owned-material-override input[type="checkbox"] { margin:.1rem 0 0; }
  .owned-material-warning { color:var(--acc); }
  .armour-properties { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
  .armour-properties label { display:grid; align-content:start; gap:.3rem; min-width:0; font-weight:600; }
  .armour-properties select { box-sizing:border-box; width:100%; min-width:0; min-height:2.75rem; font-weight:400; }
  .armour-editor-warning { margin:0; padding:.65rem .75rem; border-inline-start:4px solid var(--acc); background:color-mix(in srgb,var(--acc) 10%,transparent); }
  .armour-secondary-disclosure { min-width:0; padding:.65rem; border:1px solid var(--line); border-radius:.4rem; }
  .armour-secondary-disclosure summary { min-height:2rem; cursor:pointer; font-weight:700; }
  .armour-secondary-disclosure p { margin:.55rem 0 0; }
  .inventory-table th,.inventory-table td { vertical-align:middle; }
  .inventory-table td > .compact-number { box-sizing:border-box; width:4rem; min-height:2.5rem; }
  .inventory-table td > .state-select { box-sizing:border-box; width:100%; min-width:0; min-height:2.5rem; }
  .inventory-table td[data-label="Quantity"] > .compact-number { width:3.5rem; }
  .row-actions button { min-height:2.5rem; }
  .inventory-reorder-actions { display:flex; align-items:center; gap:.2rem; white-space:nowrap; }
  .inventory-reorder-actions .reorder-button { box-sizing:border-box; width:1.5rem; min-width:1.5rem; padding:.2rem; }
  .inventory-reorder-actions button:disabled { opacity:.45; cursor:not-allowed; }
  .exemption-control { display:inline-flex; min-width:2.75rem; min-height:2.5rem; align-items:center; justify-content:center; cursor:pointer; }
  .exemption-control input { flex:none; width:1.2rem; height:1.2rem; accent-color:var(--bronze); }
  .load-summary { display:grid; gap:.5rem; margin:.75rem 0; }
  .load-threshold-card,.load-metrics > div { min-width:0; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .load-thresholds { display:grid; gap:.45rem; }
  .load-thresholds dl { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.5rem; margin:0; }
  .load-thresholds dl > div { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem; min-width:0; padding:.5rem; border:1px solid var(--line); border-radius:.35rem; }
  .load-thresholds dt { min-width:0; color:var(--mute); }
  .load-thresholds dd { flex:none; margin:0; font-weight:700; text-align:right; white-space:nowrap; }
  .load-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.5rem; }
  .load-metrics > div { display:flex; flex-direction:column; gap:.2rem; }
  .load-metrics small { color:var(--mute); }
  .armour-totals { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr)); gap:.4rem; margin:.6rem 0; }
  .armour-totals > div { min-width:0; padding:.5rem .6rem; border:1px solid var(--line); border-radius:.4rem; }
  .armour-totals dt { color:var(--mute); font-size:.82rem; }
  .armour-totals dd { margin:.15rem 0 0; font-weight:700; overflow-wrap:anywhere; }
  .armour-layering-note { margin:.4rem 0; }
  .load-breakdown > p { margin:.6rem 0; }
  .load-breakdown-table-wrap { max-width:100%; overflow-wrap:anywhere; }
  .load-breakdown-table { table-layout:fixed; font-size:.85rem; }
  .load-breakdown-table th,.load-breakdown-table td { overflow-wrap:anywhere; }
  .load-breakdown-table th:first-child { width:32%; }
  .load-breakdown-table th:nth-child(2) { width:18%; }
  .load-breakdown-table th:nth-child(3) { width:22%; }
  .load-result { padding:.5rem .65rem; background:color-mix(in srgb,var(--line) 25%,transparent); border-radius:.35rem; }
  .catalogue-armour-options { display:grid; gap:.55rem; margin:1rem 0; padding:.75rem; border:1px solid var(--line); border-radius:.5rem; }
  .catalogue-armour-options > label { display:grid; gap:.25rem; max-width:28rem; }
  .material-override { display:flex; align-items:flex-start; gap:.55rem; min-width:0; cursor:pointer; }
  .custom-fields .material-override,.catalogue-armour-options > label.material-override { display:flex; }
  .material-override input[type="checkbox"] { flex:none; width:1.2rem; height:1.2rem; margin:.2rem 0 0; accent-color:var(--bronze); }
  .material-override span { display:grid; gap:.2rem; }
  .material-override small { color:var(--mute); }
  .catalogue-armour-options select { width:100%; min-height:2.75rem; }
  .mute { color:var(--mute); }
  .balance-warning { color:var(--acc); font-weight:700; }
  .catalogue-info { margin:.5rem 0; color:var(--mute); }
  .catalogue-info summary { cursor:pointer; }
  .catalogue-filters { display:flex; align-items:end; flex-wrap:wrap; gap:.65rem; }
  .choose-actions,.custom-entry-actions { display:flex; align-items:end; flex-wrap:wrap; gap:1rem; margin:1rem 0; }
  .choose-actions > button.primary { min-height:3rem; }
  .custom-identity { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr)); gap:.65rem; margin-top:.75rem; }
  .custom-identity label,.custom-fields label,.custom-field-wide { min-width:0; display:grid; align-content:start; gap:.25rem; }
  .custom-field-wide { margin-top:.65rem; }
  .custom-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr)); gap:.65rem; margin-top:.65rem; }
  .custom-fields :is(input,select) { box-sizing:border-box; width:100%; min-width:0; }
  .custom-field-wide textarea { box-sizing:border-box; width:100%; min-width:0; min-height:6rem; resize:vertical; }
  .custom-fields small { color:var(--mute); }
  .custom-armour-help { margin:.55rem 0 0; }
  .custom-entry { padding:.7rem; border:1px solid var(--line); border-radius:.4rem; }
  .custom-entry-title { display:grid; gap:.25rem; }
  .custom-entry-actions label { display:grid; gap:.25rem; }
  .custom-entry-actions input { width:5rem; min-height:2.5rem; }
  .my-custom-items { margin:.8rem 0; }
  .purchase-controls { margin-top:1rem; }
  .acquisition-toolbar { display:flex; align-items:end; flex-wrap:wrap; gap:.75rem; min-width:0; }
  .purchase-values { display:flex; align-items:end; flex:0 1 auto; flex-wrap:wrap; gap:.6rem .85rem; min-width:0; }
  .purchase-values label { display:grid; gap:.25rem; }
  .purchase-values .quantity-control { flex:0 0 auto; }
  .purchase-values .quantity-input { box-sizing:border-box; width:6.5rem; min-height:2.75rem; }
  .purchase-values .gm-price-control { flex:0 1 12rem; min-width:min(100%,10rem); }
  .purchase-values .gm-price-control input { width:100%; }
  .purchase-total { display:grid; gap:.2rem; min-width:6rem; }
  .purchase-total span { color:var(--mute); font-size:.9rem; }
  .pending-total { align-self:center; margin:0; }
  .buy-button { min-width:6rem; min-height:2.75rem; }
  .free-acquisition { display:flex; align-items:end; flex-wrap:wrap; gap:.5rem .65rem; min-width:0; }
  .free-acquisition label { display:grid; gap:.25rem; }
  .free-acquisition select { width:10rem; min-width:0; min-height:2.75rem; }
  .free-acquisition button { min-height:2.75rem; }
  .catalogue-filters label:first-child { flex:1 1 18rem; }
  .catalogue-filters input { width:100%; }
  .group-buttons,.subcategory-buttons { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr)); gap:.6rem; margin-top:.75rem; }
  .group-button,.subcategory-buttons button { min-width:0; min-height:3.25rem; display:flex; justify-content:space-between; align-items:center; gap:.5rem; text-align:left; overflow-wrap:anywhere; }
  .group-button span,.subcategory-buttons button span { color:var(--fg); white-space:nowrap; font-size:.9rem; letter-spacing:0; text-transform:none; }
  .browse-trail { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; margin:.6rem 0; }
  .back-button,.breadcrumb-button { min-height:2.5rem; }
  .breadcrumb-button { padding:.45rem .7rem; text-transform:none; letter-spacing:0; }
  .item-detail { min-width:0; padding:.75rem; border:1px solid var(--line); border-radius:.5rem; }
  .catalogue-list { display:grid; gap:.25rem; list-style:none; margin:.5rem 0 0; padding:0; }
  .catalogue-list li { min-width:0; }
  .catalogue-row { width:100%; min-width:0; display:flex; justify-content:space-between; align-items:center; gap:.75rem; text-align:left; padding:.55rem .65rem; border:1px solid var(--line); border-radius:.35rem; background:transparent; color:inherit; }
  .catalogue-row[aria-expanded="true"] { border:2px solid var(--acc); background:color-mix(in srgb,var(--acc) 10%,transparent); }
  .row-main { min-width:0; display:grid; gap:.12rem; }
  .row-main b { overflow-wrap:anywhere; }
  .row-main small,.row-price { color:var(--mute); }
  .row-price { flex:0 0 auto; text-align:right; font-size:.9rem; }
  .item-detail { margin-top:.75rem; }
  .detail-title { display:flex; align-items:start; justify-content:space-between; gap:.75rem; }
  .detail-title h5 { font-size:1.15rem; }
  .detail-title p { margin:.25rem 0; }
  .empty-state { padding:.75rem; border:1px dashed var(--line); border-radius:.4rem; }
  h4 { margin:1.2rem 0 .5rem; }
  h5 { margin:0; font-size:1rem; }
  .tag { display:inline-block; padding:.1rem .4rem; border:1px solid var(--line); border-radius:99px; font-size:.75rem; }
  .inventory-ledger :is(p,small,b,span,li,label,summary) { overflow-wrap:anywhere; }
  .inventory-ledger input,.inventory-ledger select { max-width:100%; }
  .inventory-ledger :is(button,input,select,summary) { scroll-margin-block:5rem; }
  @media(max-width:760px) {
    .weapon-table { min-width:42rem; }
    .load-thresholds dl { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .load-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
  @media(max-width:600px) {
    .money-summary { grid-template-columns:1fr; }
    .money-edit-row { flex-wrap:wrap; }
    .catalogue-row { align-items:flex-start; }
    .row-price { max-width:40%; overflow-wrap:anywhere; }
    .review-summary { grid-template-columns:repeat(2,minmax(0,1fr)); gap:.35rem; }
    .review-summary > div { padding:.5rem; }
    .armour-totals { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .load-thresholds dl { grid-template-columns:1fr; }
    .load-thresholds dl > div { align-items:flex-start; }
    .inventory-scroll { overflow:visible; border:0; }
    .inventory-table { display:block; width:100%; min-width:0; }
    .inventory-table thead { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .inventory-table tbody { display:grid; gap:.45rem; }
    .inventory-table tr { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border:1px solid var(--line); border-radius:.4rem; }
    .inventory-table tr.armour-detail-row { grid-column:1/-1; display:block; }
    .inventory-table tr.armour-detail-row > td { display:block; grid-column:1/-1; }
    .inventory-table tr.armour-detail-row > td::before { content:none; }
    .inventory-table tr > * { min-width:0; padding:.35rem .45rem; border:0; }
    .inventory-table tr > th[data-label="Item"] { grid-column:1/-1; }
    .inventory-table td { display:grid; align-content:start; gap:.15rem; }
    .inventory-table td::before { content:attr(data-label); color:var(--mute); font-size:.8rem; font-weight:700; }
    .inventory-table td > .compact-number { width:4rem; }
    .inventory-table td > .state-select { width:100%; max-width:10rem; }
    .inventory-table td[data-label="ENC Exempt"] .exemption-control { min-height:2.75rem; }
    .inventory-table td[data-label="Actions"] { justify-items:start; }
    .armour-properties { grid-template-columns:minmax(0,1fr); }
    .acquisition-toolbar { align-items:stretch; gap:.65rem; }
    .purchase-values { flex:1 1 100%; align-items:end; }
    .purchase-values .quantity-control { flex:0 0 auto; }
    .purchase-values .quantity-input { width:6.5rem; max-width:100%; }
    .purchase-values .gm-price-control { flex:1 1 100%; min-width:0; }
    .purchase-total { min-width:0; }
    .buy-button { width:100%; }
    .free-acquisition { flex:1 1 100%; }
    .free-acquisition label,.free-acquisition select,.free-acquisition button { width:100%; min-width:0; }
  }
</style>
