<script lang="ts">
  import { tick } from "svelte";
  import { EQUIPMENT_CATALOGUE, EQUIPMENT_CATALOGUE_VERSION, displayEquipmentPrice, formatCopperPrice, type EquipmentCategory } from "../lib/equipment-catalogue";
  import { acquireEquipment, char, deleteInventoryItem, equipmentBalanceCp, equipmentSpentCp, purchaseEquipment, recordEquipmentExpense, refundEquipmentPurchase, startingMoney, updateInventoryItem } from "../lib/store.svelte";
  import { CORE_ENCUMBRANCE_RULES_VERIFICATION, encumbranceSummary } from "../lib/encumbrance";
  import { ARMOUR_CONSTRUCTIONS, ARMOUR_MATERIALS, ARMOUR_RULES_VERIFICATION, HIT_LOCATIONS, summarizeArmour, type HitLocationName } from "../lib/armour-rules";

  const categories: EquipmentCategory[] = [...new Set(EQUIPMENT_CATALOGUE.map(item => item.source.category))];
  const categoryGroups: { name: string; categories: EquipmentCategory[] }[] = [
    { name: "Weapons", categories: ["one_handed", "two_handed", "ranged", "ammunition", "siege", "vehicles"] },
    { name: "Armour & shields", categories: ["armour", "shields", "materials"] },
    { name: "Clothing & gear", categories: ["clothing", "tools"] },
    { name: "Supplies & services", categories: ["food", "livestock", "accommodation"] },
  ];
  let query = $state("");
  let view = $state<"choose" | "owned" | "review">("choose");
  let group = $state<string | null>(null);
  let category = $state<EquipmentCategory | null>(null);
  let selectedId = $state<string | null>(null);
  let sort = $state<"name" | "price">("name");
  let quantity = $state<Record<string, string>>({});
  let gmPrice = $state<Record<string, string>>({});
  let message = $state("");
  let purchaseBusy = $state(false);
  const matching = $derived(EQUIPMENT_CATALOGUE.filter(item => {
    const q = query.trim().toLowerCase();
    const inGroup = group === null || categoryGroups.find(entry => entry.name === group)?.categories.includes(item.source.category) === true;
    return (q || (inGroup && (category === null || item.source.category === category)))
      && (!q || `${item.source.name} ${item.source.category} ${item.source.source_line} ${item.source.id} ${item.source.verification}`.toLowerCase().includes(q));
  }));
  const shown = $derived([...matching].sort((a, b) => sort === "price"
    ? (a.source.price_cp_candidate ?? Number.MAX_SAFE_INTEGER) - (b.source.price_cp_candidate ?? Number.MAX_SAFE_INTEGER) || a.source.name.localeCompare(b.source.name)
    : a.source.name.localeCompare(b.source.name)));
  const selected = $derived(matching.find(item => item.source.id === selectedId) ?? null);
  const categoryCount = (id: EquipmentCategory) => EQUIPMENT_CATALOGUE.filter(item => item.source.category === id).length;
  const categoryLabel = (id: EquipmentCategory) => id.replaceAll("_", " ").replace(/\b\w/g, value => value.toUpperCase());
  const categorySummary = (id: EquipmentCategory) => ({
    one_handed: "One-handed weapon", two_handed: "Two-handed weapon", ranged: "Ranged weapon", ammunition: "Ammunition",
    siege: "Siege equipment", vehicles: "Vehicle", shields: "Shield", armour: "Armour", materials: "Armour material",
    clothing: "Clothing", tools: "Tool or gear", food: "Food and drink", livestock: "Livestock", accommodation: "Place to stay",
  })[id];
  const kindLabel = (kind: typeof EQUIPMENT_CATALOGUE[number]["kind"]) => ({
    physical_item: "Physical item", wielding_profile: "Wielding profile", non_carried_purchase: "Service or expense", armour_material_modifier: "Material modifier",
  }[kind]);
  const amount = (id: string) => {
    const parsed = Number(quantity[id] || 1);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
  };
  const customCp = (id: string) => {
    if (gmPrice[id] === undefined || gmPrice[id] === "") return undefined;
    const parsed = Number(gmPrice[id]);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const priceFor = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => record.price_cp_candidate ?? customCp(record.id);
  const canTransact = (record: typeof EQUIPMENT_CATALOGUE[number]["source"]) => {
    const price = priceFor(record);
    return !purchaseBusy && amount(record.id) > 0 && price !== undefined && Number.isSafeInteger(price)
      && price >= 0 && price * amount(record.id) <= currentBalanceCp;
  };
  const currentBalanceCp = $derived(equipmentBalanceCp());
  const startingCp = $derived(startingMoney() * 10);
  const signedMoney = (value: number) => value < 0 ? `−${formatCopperPrice(-value)}` : formatCopperPrice(value);
  const load = $derived(encumbranceSummary(char.background.inventory, char.chars.STR));
  const armourItems = $derived(char.background.inventory.filter(item => item.armour));
  const armourSummary = $derived(summarizeArmour(armourItems.flatMap(item => Array.from({ length: item.quantity }, (_, index) => ({
    id: `${item.id}-${index + 1}`, ...item.armour!, state: item.state,
  })))));
  const statSummary = (record: typeof EQUIPMENT_CATALOGUE[number]) => [
    record.source.combat_profile_candidate && `Damage ${record.source.combat_profile_candidate.damage}, Size ${record.source.combat_profile_candidate.size}, Reach ${record.source.combat_profile_candidate.reach}`,
    record.source.ap_candidate !== undefined && `AP ${record.source.ap_candidate}`,
    record.source.hp_candidate !== undefined && `HP ${record.source.hp_candidate}`,
    record.source.wielding_hands !== undefined && `${record.source.wielding_hands} hand${record.source.wielding_hands === 1 ? "" : "s"}`,
    record.source.base_enc_per_location !== undefined && `ENC ${record.source.base_enc_per_location}`,
  ].filter(Boolean).join(" · ");
  function purchase(record: typeof EQUIPMENT_CATALOGUE[number]) {
    if (purchaseBusy) return;
    purchaseBusy = true;
    try {
      const quantityValue = amount(record.source.id);
      const price = customCp(record.source.id);
      if (quantityValue < 1) throw new Error("Enter a positive whole quantity.");
      if (record.source.price_cp_candidate === null && price === undefined) throw new Error("Ask the GM for a price before purchasing this item.");
      if (priceFor(record.source)! * quantityValue > currentBalanceCp) throw new Error("This purchase costs more than your remaining money.");
      if (record.kind === "non_carried_purchase") recordEquipmentExpense(record.source.id, quantityValue, price);
      else purchaseEquipment(record.source.id, quantityValue, price);
      message = `${record.source.name}: ${record.kind === "non_carried_purchase" ? "expense recorded" : "added to your equipment"}. Money remaining: ${signedMoney(equipmentBalanceCp())}.`;
    } catch (error) { message = error instanceof Error ? error.message : "Could not record transaction."; }
    finally { purchaseBusy = false; }
  }
  function acquire(record: typeof EQUIPMENT_CATALOGUE[number], acquiredAs: "gifted" | "inherited" | "granted") {
    try {
      if (amount(record.source.id) < 1) throw new Error("Enter a positive whole quantity.");
      acquireEquipment(record.source.id, amount(record.source.id), acquiredAs);
      message = `${record.source.name}: added as ${acquiredAs}.`;
    } catch (error) { message = error instanceof Error ? error.message : "Could not add item."; }
  }
  function refund(transactionId: string, originalAmount: number) {
    const entered = window.prompt("Refund amount in CP (recorded as a separate transaction):", String(originalAmount));
    if (entered === null || entered.trim() === "") return;
    try {
      refundEquipmentPurchase(transactionId, Number(entered));
      message = "Refund recorded as a separate transaction.";
    } catch (error) { message = error instanceof Error ? error.message : "Could not record refund."; }
  }
  function setArmourLocation(item: typeof char.background.inventory[number], location: HitLocationName, checked: boolean) {
    const locations = item.armour?.locations ?? [];
    saveInventoryChange(item.id, item.name, { armour: { locations: checked ? [...new Set([...locations, location])] : locations.filter(value => value !== location), coverageResolved: true } });
  }
  function saveInventoryChange(itemId: string, itemName: string, update: Parameters<typeof updateInventoryItem>[1]) {
    try {
      updateInventoryItem(itemId, update);
      message = `${itemName}: equipment updated.`;
    } catch (error) { message = error instanceof Error ? error.message : `Could not update ${itemName}.`; }
  }
  function removeInventoryItem(itemId: string, itemName: string) {
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

<section class="card inventory-ledger" aria-label="Combat and equipment">
  <h3>Combat &amp; Equipment</h3>
  <nav class="activity-nav" aria-label="Combat and equipment activities">
    <button type="button" aria-current={view === "choose" ? "page" : undefined} onclick={() => view = "choose"}>Choose equipment</button>
    <button type="button" aria-current={view === "owned" ? "page" : undefined} onclick={() => view = "owned"}>Your equipment <span>{char.background.inventory.length}</span></button>
    <button type="button" aria-current={view === "review" ? "page" : undefined} onclick={() => view = "review"}>Review your character</button>
  </nav>
  {#if message}<p class="hint" role="status" aria-live="polite">{message}</p>{/if}
  {#if currentBalanceCp < 0}<p class="balance-warning" role="alert">Your recorded spending is {formatCopperPrice(-currentBalanceCp)} above your starting money. Existing purchases are preserved.</p>{/if}
  <details class="catalogue-info"><summary>Rules &amp; sources</summary>
    <p class="mute">Catalogue {EQUIPMENT_CATALOGUE_VERSION}; all purchases and expenses are recorded in integer CP. Candidate prices and stats are provisional and may need GM confirmation. Source records distinguish physical items, weapon profiles, material modifiers, and non-carried services.</p>
    <p class="mute">Equipment records available: {EQUIPMENT_CATALOGUE.length}. Weapon profiles describe how an item is used and do not create a second possession. Material modifiers are not standalone items. Services and expenses affect money without adding carried inventory.</p>
    <p class="mute">Load rules: {CORE_ENCUMBRANCE_RULES_VERIFICATION}. Armour rules: {ARMOUR_RULES_VERIFICATION}. Material price adjustments are GM-defined.</p>
  </details>

  {#if view === "owned"}
  <h4>Your equipment</h4>
  <h5 class="money-heading">Money remaining</h5>
  <div class="money-summary" aria-live="polite">
    <div><small>Starting</small><b>{formatCopperPrice(startingCp)}</b></div>
    <div><small>Spent</small><b>{signedMoney(equipmentSpentCp())}</b></div>
    <div><small>Remaining</small><b>{signedMoney(currentBalanceCp)}</b></div>
  </div>
  {#if char.background.inventory.length}
    <ul class="owned-list">
      {#each char.background.inventory as item (item.id)}
        <li>
          <div><b>{item.name}</b> × {item.quantity} <span class="tag">{item.state}</span>
            <details class="item-source"><summary>Item details</summary><p class="mute">Acquired as {item.acquiredAs}. Source ID{item.sourceIds.length === 1 ? "" : "s"}: {item.sourceIds.join(", ")}</p></details>
          </div>
          <label>Quantity <input aria-label={`Quantity of ${item.name}`} type="number" min="1" step="1" value={item.quantity} onchange={event => editInventoryQuantity(item.id, item.name, event.currentTarget.value)}></label>
          <label>State <select value={item.state} onchange={event => saveInventoryChange(item.id, item.name, { state: event.currentTarget.value as "carried" | "worn" | "stored" })}>
            <option value="carried">Carried</option><option value="worn">Worn</option><option value="stored">Stored</option>
          </select></label>
          {#if item.armour}
            <label>ENC per covered location <input aria-label={`ENC per covered location for ${item.name}`} type="number" min="0" step="0.25" value={item.armour.encOverride ?? ""} placeholder="Use construction" onchange={event => saveInventoryChange(item.id, item.name, { armour: { encOverride: event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value) } })}></label>
          {:else}
            <label>ENC per item <input aria-label={`ENC per item for ${item.name}`} type="number" min="0" step="0.25" value={item.encPerUnit ?? ""} placeholder="Unknown" onchange={event => saveInventoryChange(item.id, item.name, { encPerUnit: event.currentTarget.value === "" ? null : Number(event.currentTarget.value) })}></label>
            <span class="tag">{item.encPerUnit === null ? "ENC unresolved" : item.encSource === "gm_override" ? "GM ENC" : "Catalogue candidate ENC"}</span>
          {/if}
          <label><input type="checkbox" checked={!!item.encumbranceExempt} onchange={event => saveInventoryChange(item.id, item.name, { encumbranceExempt: event.currentTarget.checked })}> Exempt (e.g. everyday clothing)</label>
          {#if item.armour}
            <details class="armour-editor"><summary>Armour locations and fit</summary>
              <label>Construction <select value={item.armour.construction ?? ""} onchange={event => saveInventoryChange(item.id, item.name, { armour: { construction: event.currentTarget.value as keyof typeof ARMOUR_CONSTRUCTIONS || null } })}>
                <option value="">Unresolved</option>{#each Object.entries(ARMOUR_CONSTRUCTIONS) as [id, construction]}<option value={id}>{construction.name}</option>{/each}
              </select></label>
              <label>Material <select value={item.armour.material ?? ""} onchange={event => saveInventoryChange(item.id, item.name, { armour: { material: event.currentTarget.value as keyof typeof ARMOUR_MATERIALS || null } })}>
                <option value="">Unresolved</option>{#each Object.entries(ARMOUR_MATERIALS) as [id, material]}<option value={id}>{material.name} (ENC ×{material.encMultiplier})</option>{/each}
              </select></label>
              <fieldset><legend>Covered locations</legend>{#each HIT_LOCATIONS as location}<label><input type="checkbox" checked={item.armour.locations.includes(location)} onchange={event => setArmourLocation(item, location, event.currentTarget.checked)}>{location}</label>{/each}</fieldset>
              <label>Fit <select value={item.armour.fit} onchange={event => saveInventoryChange(item.id, item.name, { armour: { fit: event.currentTarget.value as "fitted" | "ill_fitting" | "unresolved" } })}>
                <option value="unresolved">Unresolved</option><option value="fitted">Fitted</option><option value="ill_fitting">Ill fitting</option>
              </select></label>
              <label>Compatibility <select value={item.armour.compatibility} onchange={event => saveInventoryChange(item.id, item.name, { armour: { compatibility: event.currentTarget.value as "compatible" | "incompatible" | "conditional" | "unresolved" } })}>
                <option value="unresolved">Unresolved</option><option value="compatible">Compatible</option><option value="conditional">Conditional</option><option value="incompatible">Incompatible</option>
              </select></label>
              {#if item.armour.compatibility === "incompatible"}<label><input type="checkbox" checked={!!item.armour.gmCompatibilityOverride} onchange={event => saveInventoryChange(item.id, item.name, { armour: { gmCompatibilityOverride: event.currentTarget.checked } })}> GM compatibility override</label>{/if}
              <p class="mute">Flexible armour typically fits SIZ ±1; rigid armour needs wearer-specific SIZ and proportions. Record fit explicitly. No automatic layering: overlapping pieces use highest AP and every worn piece adds ENC. Compatibility remains unresolved until confirmed or GM overridden.</p>
            </details>
          {/if}
          <button type="button" class="ghost" onclick={() => removeInventoryItem(item.id, item.name)}>Remove</button>
        </li>
      {/each}
    </ul>
  {:else}<p class="empty-state">No equipment yet. Choose equipment to add an item.</p>{/if}
  {/if}

  {#if view === "choose"}
  <h4>Choose equipment</h4>
  <p class="mute">Choose a group or search everything. Select an item to see its details and options.</p>
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
          <li><button id={`equipment-result-${record.id}`} type="button" class="catalogue-row" aria-pressed={selectedId === record.id} onclick={() => selectedId = record.id}>
            <span class="row-main"><b>{record.name}</b><small>{statSummary(entry) || categorySummary(record.category)}</small></span>
            <span class="row-price">{displayEquipmentPrice(record)}</span>
          </button></li>
        {/each}
      </ul>
    {:else}<p class="empty-state" role="status">No equipment matches. Try another name or category.</p>{/if}
    {/if}
  {/if}

  {#if selected && (query.trim() || category !== null)}
    {@const record = selected.source}
    {@const unavailable = record.price_cp_candidate === null}
    <section class="item-detail" aria-labelledby="selected-item-title">
      <div class="detail-title"><div><h5 id="selected-item-title">{record.name}</h5><p class="mute">{categoryLabel(record.category)} · {unavailable ? "Price unavailable" : displayEquipmentPrice(record)}</p></div>
        <button type="button" class="ghost" aria-label="Close item details" onclick={() => closeDetails(record.id)}>Close</button>
      </div>
      <p>{statSummary(selected) || "No combat details available."}</p>
      {#if selected.kind === "wielding_profile"}<p class="mute">Choose this option for a weapon you own. It does not add a second item.</p>{/if}
      {#if selected.kind === "armour_material_modifier"}<p class="balance-warning">This modifier is not a separate item to buy.</p>{/if}
      {#if selected.kind === "non_carried_purchase"}<p class="mute">This is a service or expense. It changes your money without adding carried equipment.</p>{/if}
      <details><summary>Rules &amp; sources</summary><p>Record {record.id} · Mythras Core p. {record.source_printed_page} · {record.verification}</p>
        <p>Record type: {kindLabel(selected.kind)}. Source row and field checks:</p>
        {#if record.source_line}<p>{record.source_line}</p>{/if}
        <p>{Object.entries(selected.fieldVerification).map(([field, status]) => `${field}: ${status}`).join(" · ")}</p>
        {#if record.base_enc_per_location === undefined && selected.kind === "physical_item" && record.category === "armour"}<p class="balance-warning">ENC per location is unknown; resolve it on the owned armour record when acquired.</p>{/if}
      </details>
      {#if selected.kind !== "armour_material_modifier"}
        <div class="purchase-controls">
          <label>Quantity <input aria-label={`Quantity of ${record.name}`} type="number" min="1" step="1" value={quantity[record.id] ?? "1"} onchange={event => quantity[record.id] = event.currentTarget.value}></label>
          {#if unavailable}<label>GM price (CP) <input aria-label={`GM price in CP for ${record.name}`} type="number" min="0" step="1" value={gmPrice[record.id] ?? ""} onchange={event => gmPrice[record.id] = event.currentTarget.value} placeholder="Required"><small>Enter 0 only when the GM approves a free item.</small></label>
          {:else if amount(record.id) > 0}<span>Total: <b>{formatCopperPrice(record.price_cp_candidate * amount(record.id))}</b></span>
          {:else}<span>Enter a positive whole quantity.</span>{/if}
          {#if unavailable && customCp(record.id) !== undefined}<span>Total: <b>{formatCopperPrice((customCp(record.id) ?? 0) * amount(record.id))}</b>{customCp(record.id) === 0 ? " · GM-approved zero price" : " · GM-entered"}</span>{/if}
          {#if selected.kind === "non_carried_purchase"}<button type="button" disabled={!canTransact(record)} onclick={() => purchase(selected)}>Record expense</button>
          {:else}<button type="button" class="primary" disabled={!canTransact(record)} onclick={() => purchase(selected)}>{selected.kind === "wielding_profile" ? "Buy weapon" : "Buy"}</button>
            <label>Add without spending <select aria-label={`Add ${record.name} without spending`} disabled={amount(record.id) < 1} onchange={event => { const value = event.currentTarget.value; if (value) acquire(selected, value as "gifted" | "inherited" | "granted"); event.currentTarget.value = "" }}>
              <option value="">Choose…</option><option value="gifted">Gifted</option><option value="inherited">Inherited</option><option value="granted">Granted</option>
            </select></label>
          {/if}
          {#if amount(record.id) < 1}<p class="balance-warning" role="status">Enter a positive whole quantity.</p>{/if}
          {#if unavailable && gmPrice[record.id] !== undefined && gmPrice[record.id] !== "" && customCp(record.id) === undefined}<p class="balance-warning" role="status">Enter a whole number of CP that is zero or more.</p>{/if}
          {#if amount(record.id) > 0 && priceFor(record) !== undefined && priceFor(record)! * amount(record.id) > currentBalanceCp}<p class="balance-warning" role="status">This costs more than your remaining money. Reduce the quantity or ask the GM about the price.</p>{/if}
        </div>
      {/if}
    </section>
  {/if}
  {/if}

  {#if view === "review"}
  <h4>Review your character</h4>
  <div class="review-summary" aria-live="polite">
    <div><small>Money remaining</small><b>{signedMoney(currentBalanceCp)}</b></div>
    <div><small>Carrying load</small><b>{load.load === null ? `At least ${load.knownLoad} ENC · unknown` : `${load.load} ENC · ${load.band}`}</b></div>
    <div><small>Armour protection</small><b>{armourItems.length ? `${Object.values(armourSummary.apByLocation).filter(ap => ap !== null).length} locations covered` : "No armour recorded"}</b></div>
  </div>
  {#if load.unresolvedItems.length}<p class="balance-warning" role="status">Load is incomplete. Add ENC for: {load.unresolvedItems.join(", ")}.</p>{/if}
  {#if armourSummary.unresolved.length}<p class="balance-warning" role="status">Armour needs review: {armourSummary.unresolved.join("; ")}</p>{/if}
  <details class="review-details"><summary>Load details</summary>
  <div class="load-summary" aria-live="polite">
    <div><small>Load</small><b>{load.load === null ? `At least ${load.knownLoad} ENC · unknown` : `${load.load} ENC`}</b></div>
    <div><small>Load band</small><b>{load.band}</b></div>
    <div><small>Thresholds (STR {char.chars.STR})</small><b>{load.thresholds ? `2× ${load.thresholds.burdened} · 3× ${load.thresholds.overloaded} · 4× ${load.thresholds.unsustainable}` : "Unknown"}</b></div>
    <div><small>Movement</small><b>{load.movement}</b></div>
    <div><small>Skills / sprinting / fatigue</small><b>{load.skillDifficultyGrades === null ? "Unknown" : load.skillDifficultyGrades === 0 ? "No skill penalty" : `${load.skillDifficultyGrades} grade${load.skillDifficultyGrades === 1 ? "" : "s"} harder`} · {load.sprinting} · {load.fatigue}</b></div>
  </div>
  <p class="mute">Worn items contribute half ENC; stored items do not count. Twenty zero-ENC items count as 1 ENC.</p>
  </details>
  {#if armourItems.length}
  <details class="review-details"><summary>Armour by body location</summary>
  <div class="armour-summary" aria-live="polite">
    {#each HIT_LOCATIONS as location}<div><small>{location}</small><b>{armourSummary.apByLocation[location] === null ? "Unknown AP" : `${armourSummary.apByLocation[location]} AP`}</b></div>{/each}
    <div><small>Worn full ENC</small><b>{armourSummary.fullWornEnc ?? "Unknown"}</b></div>
    <div><small>Worn load ENC</small><b>{armourSummary.loadEnc ?? "Unknown"}</b></div>
    {#if armourSummary.initiativePenalty}<div><small>Initiative effect</small><b>{armourSummary.initiativePenalty}</b></div>{/if}
  </div>
  </details>
  {/if}
  <details class="review-details"><summary>Money and transaction history</summary>
  <div class="money-summary"><div><small>Starting</small><b>{formatCopperPrice(startingCp)}</b></div><div><small>Spent</small><b>{signedMoney(equipmentSpentCp())}</b></div><div><small>Remaining</small><b>{signedMoney(currentBalanceCp)}</b></div></div>
  {#if char.background.equipmentTransactions.length}
    <ol class="transaction-list">
      {#each [...char.background.equipmentTransactions].reverse() as transaction (transaction.id)}
        <li><b>{transaction.kind.replaceAll("_", " ")}</b>: {transaction.name} × {transaction.quantity} · {transaction.kind === "refund" ? "+" : "−"}{formatCopperPrice(transaction.amountCp)}
          <span class="mute">{transaction.amountSource} · {transaction.catalogueVersion} · {transaction.recordedAt}{#if transaction.catalogueId} · {transaction.catalogueId}{/if}</span>
          {#if transaction.kind === "purchase"}<button type="button" class="ghost" onclick={() => refund(transaction.id, transaction.amountCp)}>Record refund…</button>{/if}
        </li>
      {/each}
    </ol>
  {:else}<p class="mute">No spending transactions recorded.</p>{/if}
  </details>
  {/if}
</section>

<style>
  .inventory-ledger { margin-top: 1rem; }
  .activity-nav { display:flex; flex-wrap:wrap; gap:.5rem; margin:.75rem 0; border-bottom:1px solid var(--line); }
  .activity-nav button { flex:1 1 10rem; min-height:2.75rem; }
  .activity-nav button[aria-current="page"] { border-color:var(--acc); box-shadow:inset 0 -3px var(--acc); }
  .inventory-ledger :is(button,input,select,summary):focus-visible { outline:3px solid var(--acc); outline-offset:2px; }
  .activity-nav span { display:inline-grid; place-items:center; min-width:1.5rem; min-height:1.5rem; margin-left:.25rem; border:1px solid currentColor; border-radius:50%; font-size:.8rem; letter-spacing:0; }
  .money-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.5rem; margin:1rem 0; }
  .review-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr)); gap:.5rem; margin:.75rem 0; }
  .review-summary > div { min-width:0; display:flex; flex-direction:column; gap:.25rem; padding:.75rem; border:1px solid var(--line); border-radius:.5rem; overflow-wrap:anywhere; }
  .review-summary small,.money-summary small { color:var(--mute); }
  .review-details { margin:.65rem 0; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .review-details summary,.item-source summary { min-height:1.5rem; cursor:pointer; font-weight:700; }
  .money-heading { margin-top:.75rem; }
  .item-source { margin-top:.35rem; }
  .load-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(10rem,1fr)); gap:.5rem; margin:.75rem 0; }
  .load-summary > div { display:flex; flex-direction:column; gap:.2rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .armour-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(8rem,1fr)); gap:.5rem; margin:.75rem 0; }
  .armour-summary > div { display:flex; flex-direction:column; gap:.2rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .armour-editor { flex:1 1 100%; display:flex; align-items:start; flex-wrap:wrap; gap:.6rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .armour-editor summary { flex-basis:100%; cursor:pointer; }
  .armour-editor fieldset { display:flex; flex-wrap:wrap; gap:.45rem; }
  .money-summary > div { display:flex; flex-direction:column; gap:.2rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .money-summary small,.mute { color:var(--mute); }
  .balance-warning { color:var(--acc); font-weight:700; }
  .catalogue-info { margin:.5rem 0; color:var(--mute); }
  .catalogue-info summary { cursor:pointer; }
  .catalogue-filters,.purchase-controls { display:flex; align-items:end; flex-wrap:wrap; gap:.65rem; }
  .catalogue-filters label:first-child { flex:1 1 18rem; }
  .catalogue-filters input { width:100%; }
  .group-buttons,.subcategory-buttons { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr)); gap:.6rem; margin-top:.75rem; }
  .group-button,.subcategory-buttons button { min-width:0; min-height:3.25rem; display:flex; justify-content:space-between; align-items:center; gap:.5rem; text-align:left; overflow-wrap:anywhere; }
  .group-button span,.subcategory-buttons button span { color:var(--mute); white-space:nowrap; font-size:.9rem; letter-spacing:0; text-transform:none; }
  .browse-trail { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; margin:.6rem 0; }
  .back-button,.breadcrumb-button { min-height:2.5rem; }
  .breadcrumb-button { padding:.45rem .7rem; text-transform:none; letter-spacing:0; }
  .item-detail { min-width:0; padding:.75rem; border:1px solid var(--line); border-radius:.5rem; }
  .catalogue-list { display:grid; gap:.25rem; list-style:none; margin:.5rem 0 0; padding:0; }
  .catalogue-list li { min-width:0; }
  .catalogue-row { width:100%; min-width:0; display:flex; justify-content:space-between; align-items:center; gap:.75rem; text-align:left; padding:.55rem .65rem; border:1px solid var(--line); border-radius:.35rem; background:transparent; color:inherit; }
  .catalogue-row[aria-pressed="true"] { border:2px solid var(--acc); background:color-mix(in srgb,var(--acc) 10%,transparent); }
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
  .owned-list,.transaction-list { display:grid; gap:.5rem; padding-left:1.4rem; }
  .owned-list li { display:flex; align-items:center; flex-wrap:wrap; gap:.6rem; }
  .owned-list li > div { flex:1 1 15rem; }
  .owned-list p { margin:.15rem 0 0; }
  .transaction-list li { padding:.35rem 0; }
  .transaction-list .mute { display:block; font-size:.8rem; }
  .inventory-ledger :is(p,small,b,span,li,label,summary) { overflow-wrap:anywhere; }
  .inventory-ledger input,.inventory-ledger select { max-width:100%; }
  .inventory-ledger :is(button,input,select,summary) { scroll-margin-block:5rem; }
  @media(max-width:600px) {
    .money-summary { grid-template-columns:1fr; }
    .money-summary > div { padding:.45rem; overflow-wrap:anywhere; }
    .catalogue-row { align-items:flex-start; }
    .row-price { max-width:40%; overflow-wrap:anywhere; }
    .owned-list li > div { flex-basis:100%; }
    .purchase-controls > * { flex:1 1 100%; min-width:0; }
  }
</style>
