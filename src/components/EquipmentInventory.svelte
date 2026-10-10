<script lang="ts">
  import { EQUIPMENT_CATALOGUE, EQUIPMENT_CATALOGUE_VERSION, displayEquipmentPrice, formatCopperPrice, type EquipmentCategory } from "../lib/equipment-catalogue";
  import { acquireEquipment, char, deleteInventoryItem, equipmentBalanceCp, equipmentSpentCp, purchaseEquipment, recordEquipmentExpense, refundEquipmentPurchase, startingMoney, updateInventoryItem } from "../lib/store.svelte";

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
