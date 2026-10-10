<script lang="ts">
  import { EQUIPMENT_CATALOGUE, EQUIPMENT_CATALOGUE_VERSION, displayEquipmentPrice, formatCopperPrice, type EquipmentCategory } from "../lib/equipment-catalogue";
  import { acquireEquipment, char, deleteInventoryItem, equipmentBalanceCp, equipmentSpentCp, purchaseEquipment, recordEquipmentExpense, refundEquipmentPurchase, startingMoney, updateInventoryItem } from "../lib/store.svelte";
  import { CORE_ENCUMBRANCE_RULES_VERIFICATION, encumbranceSummary } from "../lib/encumbrance";
  import { ARMOUR_CONSTRUCTIONS, ARMOUR_MATERIALS, ARMOUR_RULES_VERIFICATION, HIT_LOCATIONS, summarizeArmour, type HitLocationName } from "../lib/armour-rules";

  const categories: (EquipmentCategory | "all")[] = ["all", ...new Set(EQUIPMENT_CATALOGUE.map(item => item.source.category))];
  let query = $state("");
  let category = $state<EquipmentCategory | "all">("all");
  let quantity = $state<Record<string, string>>({});
  let gmPrice = $state<Record<string, string>>({});
  let message = $state("");
  const shown = $derived(EQUIPMENT_CATALOGUE.filter(item => {
    const q = query.trim().toLowerCase();
    return (category === "all" || item.source.category === category)
      && (!q || `${item.source.name} ${item.source.category} ${item.source.source_line} ${item.source.id} ${item.source.verification}`.toLowerCase().includes(q));
  }).slice(0, 40));
  const amount = (id: string) => {
    const parsed = Number(quantity[id] || 1);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
  };
  const customCp = (id: string) => {
    if (gmPrice[id] === undefined || gmPrice[id] === "") return undefined;
    const parsed = Number(gmPrice[id]);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
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
    try {
      const quantityValue = amount(record.source.id);
      const price = customCp(record.source.id);
      if (record.kind === "non_carried_purchase") recordEquipmentExpense(record.source.id, quantityValue, price);
      else purchaseEquipment(record.source.id, quantityValue, price);
      message = `${record.source.name}: recorded ${record.kind === "non_carried_purchase" ? "expense" : record.kind === "wielding_profile" ? "physical item purchase" : "purchase"}.`;
    } catch (error) { message = error instanceof Error ? error.message : "Could not record transaction."; }
  }
  function acquire(record: typeof EQUIPMENT_CATALOGUE[number], acquiredAs: "gifted" | "inherited" | "granted") {
    try {
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
    updateInventoryItem(item.id, { armour: { locations: checked ? [...new Set([...locations, location])] : locations.filter(value => value !== location), coverageResolved: true } });
  }
</script>

<section class="card inventory-ledger" aria-label="Inventory and equipment purchasing">
  <h3>Inventory &amp; purchasing</h3>
  <div class="money-summary" aria-live="polite">
    <div><small>Starting Money</small><b>{formatCopperPrice(startingCp)}</b></div>
    <div><small>Spent</small><b>{signedMoney(equipmentSpentCp())}</b></div>
    <div><small>Remaining</small><b>{signedMoney(currentBalanceCp)}</b></div>
  </div>
  {#if currentBalanceCp < 0}<p class="balance-warning" role="alert">Historical spending is {formatCopperPrice(-currentBalanceCp)} above current starting funds. Existing transactions are preserved.</p>{/if}
  <p class="mute">Catalogue {EQUIPMENT_CATALOGUE_VERSION}. Prices and candidate stats are provisional; all spending is recorded in integer CP.</p>
  <h4>Load and encumbrance</h4>
  <div class="load-summary" aria-live="polite">
    <div><small>Load</small><b>{load.load === null ? `At least ${load.knownLoad} ENC · unknown` : `${load.load} ENC`}</b></div>
    <div><small>Load band</small><b>{load.band}</b></div>
    <div><small>Thresholds (STR {char.chars.STR})</small><b>{load.thresholds ? `2× ${load.thresholds.burdened} · 3× ${load.thresholds.overloaded} · 4× ${load.thresholds.unsustainable}` : "Unknown"}</b></div>
    <div><small>Movement</small><b>{load.movement}</b></div>
    <div><small>Skills / sprinting / fatigue</small><b>{load.skillDifficultyGrades === null ? "Unknown" : `${load.skillDifficultyGrades} grade${load.skillDifficultyGrades === 1 ? "" : "s"} harder`} · {load.sprinting} · {load.fatigue}</b></div>
  </div>
  {#if load.unresolvedItems.length}<p class="balance-warning" role="status">ENC unresolved for: {load.unresolvedItems.join(", ")}. Set a GM value to calculate a complete load.</p>{/if}
  <p class="mute">Load rules: {CORE_ENCUMBRANCE_RULES_VERIFICATION}. Worn items contribute half ENC; stored items do not count. Twenty zero-ENC items count as 1 ENC.</p>
  <h4>Armour by hit location</h4>
  <div class="armour-summary" aria-live="polite">
    {#each HIT_LOCATIONS as location}<div><small>{location}</small><b>{armourSummary.apByLocation[location] === null ? "Unknown AP" : `${armourSummary.apByLocation[location]} AP`}</b></div>{/each}
    <div><small>Worn full ENC</small><b>{armourSummary.fullWornEnc ?? "Unknown"}</b></div>
    <div><small>Worn load ENC</small><b>{armourSummary.loadEnc ?? "Unknown"}</b></div>
    <div><small>Initiative penalty</small><b>{armourSummary.initiativePenalty === null ? "Unknown" : `−${armourSummary.initiativePenalty}`}</b></div>
  </div>
  {#if armourSummary.unresolved.length}<p class="balance-warning" role="status">Armour needs resolution: {armourSummary.unresolved.join("; ")}</p>{/if}
  <p class="mute">Armour rules: {ARMOUR_RULES_VERIFICATION}. Material price adjustments are GM-defined. Compatibility is recorded per piece; fit must be explicitly set.</p>
  {#if message}<p class="hint" role="status">{message}</p>{/if}

  <h4>Owned equipment</h4>
  {#if char.background.inventory.length}
    <ul class="owned-list">
      {#each char.background.inventory as item (item.id)}
        <li>
          <div><b>{item.name}</b> × {item.quantity} <span class="tag">{item.acquiredAs}</span> <span class="tag">{item.state}</span>
            <p class="mute">Source ID{item.sourceIds.length === 1 ? "" : "s"}: {item.sourceIds.join(", ")}</p>
          </div>
          <label>Quantity <input type="number" min="1" step="1" value={item.quantity} onchange={event => updateInventoryItem(item.id, { quantity: Number(event.currentTarget.value) })}></label>
          <label>State <select value={item.state} onchange={event => updateInventoryItem(item.id, { state: event.currentTarget.value as "carried" | "worn" | "stored" })}>
            <option value="carried">Carried</option><option value="worn">Worn</option><option value="stored">Stored</option>
          </select></label>
          <label>ENC per item <input aria-label={`ENC per item for ${item.name}`} type="number" min="0" step="0.25" value={item.encPerUnit ?? ""} placeholder="Unknown" onchange={event => updateInventoryItem(item.id, { encPerUnit: event.currentTarget.value === "" ? null : Number(event.currentTarget.value) })}></label>
          <span class="tag">{item.encPerUnit === null ? "ENC unresolved" : item.encSource === "gm_override" ? "GM ENC" : "Catalogue candidate ENC"}</span>
          <label><input type="checkbox" checked={!!item.encumbranceExempt} onchange={event => updateInventoryItem(item.id, { encumbranceExempt: event.currentTarget.checked })}> Exempt (e.g. everyday clothing)</label>
          {#if item.armour}
            <details class="armour-editor"><summary>Armour locations and fit</summary>
              <label>Construction <select value={item.armour.construction ?? ""} onchange={event => updateInventoryItem(item.id, { armour: { construction: event.currentTarget.value as keyof typeof ARMOUR_CONSTRUCTIONS || null } })}>
                <option value="">Unresolved</option>{#each Object.entries(ARMOUR_CONSTRUCTIONS) as [id, construction]}<option value={id}>{construction.name}</option>{/each}
              </select></label>
              <label>Material <select value={item.armour.material ?? ""} onchange={event => updateInventoryItem(item.id, { armour: { material: event.currentTarget.value as keyof typeof ARMOUR_MATERIALS || null } })}>
                <option value="">Unresolved</option>{#each Object.entries(ARMOUR_MATERIALS) as [id, material]}<option value={id}>{material.name} (ENC ×{material.encMultiplier})</option>{/each}
              </select></label>
              <fieldset><legend>Covered locations</legend>{#each HIT_LOCATIONS as location}<label><input type="checkbox" checked={item.armour.locations.includes(location)} onchange={event => setArmourLocation(item, location, event.currentTarget.checked)}>{location}</label>{/each}</fieldset>
              <label>Fit <select value={item.armour.fit} onchange={event => updateInventoryItem(item.id, { armour: { fit: event.currentTarget.value as "fitted" | "ill_fitting" | "unresolved" } })}>
                <option value="unresolved">Unresolved</option><option value="fitted">Fitted</option><option value="ill_fitting">Ill fitting</option>
              </select></label>
              <label>Compatibility <select value={item.armour.compatibility} onchange={event => updateInventoryItem(item.id, { armour: { compatibility: event.currentTarget.value as "compatible" | "incompatible" | "conditional" | "unresolved" } })}>
                <option value="unresolved">Unresolved</option><option value="compatible">Compatible</option><option value="conditional">Conditional</option><option value="incompatible">Incompatible</option>
              </select></label>
              {#if item.armour.compatibility === "incompatible"}<label><input type="checkbox" checked={!!item.armour.gmCompatibilityOverride} onchange={event => updateInventoryItem(item.id, { armour: { gmCompatibilityOverride: event.currentTarget.checked } })}> GM compatibility override</label>{/if}
              <p class="mute">Flexible armour typically fits SIZ ±1; rigid armour needs wearer-specific SIZ and proportions. Record fit explicitly. No automatic layering: overlapping pieces use highest AP and every worn piece adds ENC. Compatibility remains unresolved until confirmed or GM overridden.</p>
            </details>
          {/if}
          <button type="button" class="ghost" onclick={() => deleteInventoryItem(item.id)}>Remove</button>
        </li>
      {/each}
    </ul>
  {:else}<p class="mute">No catalogue equipment recorded. Background descriptions and Combat Styles do not create inventory.</p>{/if}

  <h4>Equipment catalogue</h4>
  <div class="catalogue-filters">
    <label>Search <input type="search" bind:value={query} placeholder="Name, source ID, or source text"></label>
    <label>Category <select bind:value={category}>{#each categories as option}<option value={option}>{option === "all" ? "All categories" : option.replaceAll("_", " ")}</option>{/each}</select></label>
  </div>
  <p class="mute">Showing {shown.length} of {EQUIPMENT_CATALOGUE.filter(item => category === "all" || item.source.category === category).length} matching records (up to 40).</p>
  <div class="catalogue-list">
    {#each shown as entry (entry.source.id)}
      {@const record = entry.source}
      {@const unavailable = record.price_cp_candidate === null}
      {@const isMaterial = entry.kind === "armour_material_modifier"}
      <article class="catalogue-item">
        <div class="catalogue-heading"><h5>{record.name}</h5><span class="tag">{record.category.replaceAll("_", " ")}</span><span class="tag">{entry.kind.replaceAll("_", " ")}</span></div>
        <p class="candidate">{statSummary(entry) || "No candidate combat stats"} · {unavailable ? "Price unavailable" : displayEquipmentPrice(record)}</p>
        <p class="mute">Source {record.id} · Mythras Core p. {record.source_printed_page} · {record.verification}{#if entry.kind === "wielding_profile"} · wielding profile for a physical item{/if}</p>
        {#if record.source_line}<details><summary>Source row and uncertainty</summary><p>{record.source_line}</p><p>{Object.entries(entry.fieldVerification).map(([field, status]) => `${field}: ${status}`).join(" · ")}</p></details>{/if}
        {#if isMaterial}<p class="mute">Material modifier only; it cannot be purchased as a standalone inventory item.</p>
        {:else}
          <div class="purchase-controls">
            <label>Quantity <input type="number" min="1" step="1" value={quantity[record.id] ?? "1"} onchange={event => quantity[record.id] = event.currentTarget.value}></label>
            {#if unavailable}<label>GM price (CP) <input type="number" min="0" step="1" value={gmPrice[record.id] ?? ""} onchange={event => gmPrice[record.id] = event.currentTarget.value} placeholder="Required"></label>
            {:else if amount(record.id) > 0}<span>Total: <b>{formatCopperPrice(record.price_cp_candidate * amount(record.id))}</b></span>
            {:else}<span>Enter a positive whole quantity.</span>{/if}
            {#if unavailable && customCp(record.id) !== undefined}<span>Total: <b>{formatCopperPrice((customCp(record.id) ?? 0) * amount(record.id))}</b>{customCp(record.id) === 0 ? " · GM-approved zero price" : " · GM-entered"}</span>{/if}
            {#if entry.kind === "non_carried_purchase"}<button type="button" onclick={() => purchase(entry)}>Record expense</button>
            {:else}<button type="button" onclick={() => purchase(entry)}>{entry.kind === "wielding_profile" ? "Purchase physical item" : "Purchase"}</button>
              <label>Acquire as <select aria-label={`Acquisition source for ${record.name}`} onchange={event => { const value = event.currentTarget.value; if (value) acquire(entry, value as "gifted" | "inherited" | "granted"); event.currentTarget.value = "" }}>
                <option value="">Choose…</option><option value="gifted">Gifted</option><option value="inherited">Inherited</option><option value="granted">Granted</option>
              </select></label>
            {/if}
          </div>
        {/if}
      </article>
    {/each}
  </div>

  <h4>Transaction history</h4>
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
</section>

<style>
  .inventory-ledger { margin-top: 1rem; }
  .money-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.5rem; margin:1rem 0; }
  .load-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(10rem,1fr)); gap:.5rem; margin:.75rem 0; }
  .load-summary > div { display:flex; flex-direction:column; gap:.2rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .armour-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(8rem,1fr)); gap:.5rem; margin:.75rem 0; }
  .armour-summary > div { display:flex; flex-direction:column; gap:.2rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .armour-editor { flex:1 1 100%; display:flex; align-items:start; flex-wrap:wrap; gap:.6rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .armour-editor summary { flex-basis:100%; cursor:pointer; }
  .armour-editor fieldset { display:flex; flex-wrap:wrap; gap:.45rem; }
  .money-summary > div { display:flex; flex-direction:column; gap:.2rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; }
  .money-summary small,.mute { color:var(--muted); }
  .balance-warning { color:#9c2727; font-weight:700; }
  .catalogue-filters,.purchase-controls { display:flex; align-items:end; flex-wrap:wrap; gap:.65rem; }
  .catalogue-list { display:grid; gap:.65rem; margin-top:.75rem; }
  .catalogue-item { padding:.75rem; border:1px solid var(--line); border-radius:.5rem; }
  .catalogue-heading { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
  h4 { margin:1.2rem 0 .5rem; }
  h5 { margin:0; font-size:1rem; }
  .candidate { margin:.4rem 0; }
  .tag { display:inline-block; padding:.1rem .4rem; border:1px solid var(--line); border-radius:99px; font-size:.75rem; }
  .owned-list,.transaction-list { display:grid; gap:.5rem; padding-left:1.4rem; }
  .owned-list li { display:flex; align-items:center; flex-wrap:wrap; gap:.6rem; }
  .owned-list li > div { flex:1 1 15rem; }
  .owned-list p { margin:.15rem 0 0; }
  .transaction-list li { padding:.35rem 0; }
  .transaction-list .mute { display:block; font-size:.8rem; }
  @media(max-width:600px) { .money-summary { grid-template-columns:1fr; } }
</style>
