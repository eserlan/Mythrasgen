<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { char, availableMoney, eventCount, moneyMultiplier, resolveSocialClass, roll4d6, rollDie, rollPercentile, socialClassReady, startingMoney } from "../lib/store.svelte";
  import { CONNECTIONS, EXTENDED_FAMILY, FAMILY_STANDING, PARENTS, SIBLINGS, SOCIAL_CLASSES, chooseBackgroundEvent, rollUniqueBackgroundResult, setBackgroundEventResult, socialClassForRoll, tableResult, resolveBackgroundEvent } from "../lib/background-rules";
  import { ALL_RELATIONSHIP_TYPES, reconcileFamilyRelationships, resolveFamilyRelationshipCount } from "../lib/family-relationships";
  import { CORE_BACKGROUND_EVENTS } from "../lib/background-events";
  import { cultures } from "../lib/content";
  import { AGE_CATEGORIES } from "../lib/rules";

  let purchaseName = $state("");
  let purchaseCost = $state(0);
  let socialClassDialog: HTMLDialogElement;
  let eventDialog: HTMLDialogElement;
  let eventSlot = $state(0);
  let background = $derived(char.background);
  let classes = $derived(SOCIAL_CLASSES[char.socialTable]);
  let standing = $derived(tableResult(FAMILY_STANDING, background.standingRoll));
  let connectionBand = $derived(tableResult(CONNECTIONS, background.connectionsRoll));

  function setClass(roll: number) {
    const normalized = Math.max(1, Math.min(100, Math.round(Number(roll) || 1)));
    background.socialClassRoll = normalized;
    resolveSocialClass(socialClassForRoll(char.socialTable, normalized), "rolled");
  }
  function chooseClass(name: string) {
    const row = classes.find(item => item.name === name);
    if (row) {
      background.socialClassRoll = 0;
      resolveSocialClass(row, "chosen");
      socialClassDialog.close();
    }
  }
  function rollParents() {
    background.parentsRoll = rollPercentile();
    background.parents = tableResult(PARENTS, background.parentsRoll)[2];
  }
  function rollSiblings() {
    background.siblingsRoll = rollPercentile();
    const result = tableResult(SIBLINGS, background.siblingsRoll);
    const count = result[2] === "No siblings" ? 0 : rollDie(Number(result[2].match(/d(\d+)/)?.[1] ?? 4));
    background.siblings = count ? `${count} sibling${count === 1 ? "" : "s"}` : "No siblings";
  }
  function rollExtendedFamily() {
    background.extendedFamilyRoll = rollPercentile();
    const row = tableResult(EXTENDED_FAMILY, background.extendedFamilyRoll);
    const dice = (formula: string) => {
      const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
      return match ? Math.max(0, Array.from({ length: +match[1] }, () => rollDie(+match[2])).reduce((a, b) => a + b, 0) + +(match[3] ?? 0)) : 0;
    };
    background.extendedFamily = row[2].replace(/\d+d\d+(?:[+-]\d+)?/g, formula => String(dice(formula))).replace(/grandparents/, "grandparent(s)");
  }
  function rollStanding(roll = rollPercentile()) {
    background.standingRoll = roll;
    background.standingResolved = true;
    const resolved = resolveFamilyRelationshipCount(String(tableResult(FAMILY_STANDING, roll)[3]), rollDie);
    background.familyReputationCountRoll = resolved.countRoll;
    background.relationships = reconcileFamilyRelationships(background.relationships, "reputation", resolved.count, resolved.allowedTypes);
  }
  function rollConnections(roll = rollPercentile()) {
    background.connectionsRoll = roll;
    background.connectionsResolved = true;
    const resolved = resolveFamilyRelationshipCount(String(tableResult(CONNECTIONS, roll)[3]), rollDie);
    background.relationships = reconcileFamilyRelationships(background.relationships, "connections", resolved.count, ALL_RELATIONSHIP_TYPES);
  }
  function rollEvent(index: number) {
    const taken = background.events.filter((_, i) => i !== index).map(event => resolveBackgroundEvent(event)?.range ?? "");
    const result = rollUniqueBackgroundResult(taken);
    background.events[index] = setBackgroundEventResult(result, "rolled");
  }
  function chooseEvent(index: number) {
    eventSlot = index;
    eventDialog.showModal();
  }
  function selectEvent(eventId: string) {
    background.events[eventSlot] = chooseBackgroundEvent(eventId);
    eventDialog.close();
  }
  function clearEvent(index: number) {
    background.events[index] = { roll: 0 };
  }
  function clearArchivedEvents() {
    background.archivedEvents = [];
  }
  function addPurchase() {
    const name = purchaseName.trim();
    const cost = Math.max(0, Number(purchaseCost) || 0);
    if (!name || cost > availableMoney()) return;
    background.purchases.push({ name, cost });
    purchaseName = ""; purchaseCost = 0;
  }
</script>

<StepHead step={5} title="Background" />
<section class="card">
  <h3>Background events — {eventCount()} event{eventCount() === 1 ? "" : "s"}</h3>
  {#if eventCount() === 0}
    <p class="hint" role="status">No Background Events from age.</p>
  {/if}
  {#each background.events as event, i}
    {@const resolvedEvent = resolveBackgroundEvent(event)}
    <div class="event-entry">
      <div class="event-controls">
        <b>Event {i + 1}</b>
        <button type="button" onclick={() => rollEvent(i)}>{event.source === "rolled" ? "Reroll" : "Roll d100"}</button>
        <button type="button" class="ghost" onclick={() => chooseEvent(i)}>Choose Event</button>
        <button type="button" class="ghost" title="Clear this optional event" onclick={() => clearEvent(i)}>Clear</button>
      </div>
      {#if resolvedEvent}
        <div class="event-result" role="status">
          <b>{event.source === "rolled" ? `${String(event.roll).padStart(2, "0")} (${resolvedEvent.range})` : resolvedEvent.range}</b>
          <p>{resolvedEvent.text}</p>
        </div>
      {:else}<p class="mute event-empty">Empty — optional</p>{/if}
    </div>
  {/each}
  {#if background.archivedEvents.length}
    <div class="hint" role="status">
      <p>{background.archivedEvents.length} event{background.archivedEvents.length === 1 ? " was" : "s were"} preserved here after the age category reduced the active slot count.</p>
      {#each background.archivedEvents as event, i}{@const archived = resolveBackgroundEvent(event)}<p>Previously active event {i + 1}: {archived?.range ?? "unresolved"}</p>{/each}
      <button type="button" class="ghost" onclick={clearArchivedEvents}>Discard preserved events</button>
    </div>
  {/if}
</section>

<dialog class="background-event-dialog combat-style-dialog" bind:this={eventDialog} aria-labelledby="background-event-title">
  <div class="background-event-picker">
    <header class="combat-style-dialog-heading"><div><h2 id="background-event-title">Choose a Background Event</h2><button type="button" class="ghost" onclick={() => eventDialog.close()}>Close</button></div></header>
    <div class="background-event-options" aria-label="Background Events catalogue">
      {#each CORE_BACKGROUND_EVENTS as option (option.range)}
        <button type="button" class="background-event-option" onclick={() => selectEvent(option.range)}>
          <b>{option.range}</b><span>{option.text.slice(0, 150)}{option.text.length > 150 ? "…" : ""}</span>
        </button>
      {/each}
    </div>
  </div>
</dialog>

<section class="card">
  <h3>Social class</h3>
  <p class="mute social-class-context">{cultures[char.culture]?.name ?? char.socialTable} · Roll d100 or choose a class if the GM permits.</p>
  {#if !socialClassReady()}
    <div class="validation" role="status"><b>Social class needs reconciliation</b><p>The culture changed from {background.socialClassCulture}. The previous result ({background.socialClass || "unresolved"}) and its saved resources are preserved. Roll on the {char.socialTable} table or choose a class with GM approval.</p></div>
  {/if}
  <div class="social-class-main">
    {#if socialClassReady()}
      <p class="social-class-result" role="status"><span>Social Class</span><strong>{background.socialClass}</strong><small>{background.socialClassMethod === "rolled" ? `(rolled ${background.socialClassRoll})` : "(chosen)"}</small></p>
    {:else}
      <p class="social-class-result" role="status"><span>Social Class</span><strong>Reconciliation required</strong></p>
    {/if}
    <div class="social-class-actions">
      <button type="button" onclick={() => setClass(rollPercentile())}>{socialClassReady() ? "Reroll" : "Roll Social Class"}</button>
      <button type="button" class="ghost" onclick={() => socialClassDialog.showModal()}>Choose…</button>
    </div>
  </div>
  {#if socialClassReady()}
    <div class="social-class-summary">
      <p><b>Money:</b> ×{background.socialClassMoney}</p>
      <p><b>Typical Equipment:</b> {background.socialClassEquipment}</p>
      <p class="social-class-resources"><b>Background Resources:</b> {background.socialClassResources}</p>
    </div>
  {/if}
</section>

<dialog class="social-class-dialog combat-style-dialog" bind:this={socialClassDialog} aria-labelledby="social-class-dialog-title">
  <div class="social-class-dialog-content">
    <header class="combat-style-dialog-heading">
      <div><h2 id="social-class-dialog-title">Choose a Social Class</h2><button type="button" class="ghost" onclick={() => socialClassDialog.close()}>Close</button></div>
      <p class="mute">{cultures[char.culture]?.name ?? char.socialTable} table · GM option</p>
    </header>
    <div class="social-class-options" aria-label="Social Classes for {char.socialTable}">
      {#each classes as row (row.name)}
        <button type="button" class="social-class-option" onclick={() => chooseClass(row.name)}>
          <b>{row.name}</b><span>Money ×{row.money}</span>
        </button>
      {/each}
    </div>
  </div>
</dialog>

<section class="card family-background">
  <h3>Parents, Family &amp; Connections</h3>
  <div class="family-grid">
    <article class="family-result">
      <h4>Parents</h4>
      {#if background.parents}<p role="status">{background.parents} <small>(rolled {background.parentsRoll})</small></p>{:else}<p class="mute">Not rolled</p>{/if}
      <button type="button" class="ghost" onclick={rollParents}>{background.parents ? "Reroll" : "Roll"}</button>
    </article>
    <article class="family-result">
      <h4>Siblings</h4>
      {#if background.siblings}<p role="status">{background.siblings} <small>(rolled {background.siblingsRoll})</small></p>{:else}<p class="mute">Not rolled</p>{/if}
      <button type="button" class="ghost" onclick={rollSiblings}>{background.siblings ? "Reroll" : "Roll"}</button>
    </article>
    <article class="family-result">
      <h4>Extended Family</h4>
      {#if background.extendedFamily}<p role="status">{background.extendedFamily} <small>(rolled {background.extendedFamilyRoll})</small></p>{:else}<p class="mute">Not rolled</p>{/if}
      <button type="button" class="ghost" onclick={rollExtendedFamily}>{background.extendedFamily ? "Reroll" : "Roll"}</button>
    </article>
  </div>
  <div class="family-generation-grid">
    <article class="family-result">
      <h4>Family Reputation</h4>
      {#if background.standingResolved}
        <p role="status">{standing[2]} <small>(rolled {background.standingRoll})</small></p>
        {#if String(standing[3]).startsWith("None")}<p class="family-generates">Generates: none</p>{:else}<p class="family-generates">Generates: {standing[3]}{#if background.familyReputationCountRoll}<small> (count roll {background.familyReputationCountRoll})</small>{/if}</p>{/if}
      {:else}<p class="mute">Not rolled</p>{/if}
      <button type="button" class="ghost" onclick={() => rollStanding()}>{background.standingResolved ? "Reroll" : "Roll"}</button>
    </article>
    <article class="family-result">
      <h4>Connections</h4>
      {#if background.connectionsResolved}
        <p role="status">{connectionBand[2]} <small>(rolled {background.connectionsRoll})</small></p>
        <p class="family-generates">Generates: {connectionBand[3]} relationship{connectionBand[3] === 1 ? "" : "s"}</p>
      {:else}<p class="mute">Not rolled</p>{/if}
      <button type="button" class="ghost" onclick={() => rollConnections()}>{background.connectionsResolved ? "Reroll" : "Roll"}</button>
    </article>
  </div>
  <div class="family-relationships">
    <h4>Allies, Contacts, Rivals &amp; Enemies</h4>
    {#if background.relationships.length}
      <div class="relationship-list">
        {#each background.relationships as relationship, i (relationship)}
          <div class="relationship-row">
            <b>{i + 1}.</b>
            <select aria-label="Relationship {i + 1} type" bind:value={relationship.type}>
              {#each relationship.allowedTypes as type}<option value={type}>{type}</option>{/each}
            </select>
            <input aria-label="Relationship {i + 1} name or identity" bind:value={relationship.name} placeholder="Name or identity" />
            <small>{relationship.source === "reputation" ? "Family Reputation" : "Connections"}</small>
          </div>
        {/each}
      </div>
    {:else}<p class="mute">Roll Family Reputation or Connections to generate relationships.</p>{/if}
  </div>
</section>

<section class="card">
  <h3>Starting money &amp; equipment</h3>
  <p class="mute">Starting money base follows {cultures[char.culture]?.name}: {moneyMultiplier()} sp per 4d6 result.</p>
  <div class="field-row">
    <label class="field"><span>4d6 roll · reroll any time</span><input type="number" min="4" max="24" bind:value={background.startingMoneyRoll} /></label>
    <button type="button" onclick={() => background.startingMoneyRoll = roll4d6()}>Roll 4d6</button>
  </div>
  <p><b>{background.startingMoneyRoll} × {moneyMultiplier()} sp × {socialClassReady() ? background.socialClassMoney : "pending"} social-class modifier = {startingMoney()} sp</b></p>
  <p class="label">Starting equipment and possessions</p>
  <label class="field"><span>Edit or add campaign-specific details</span><textarea rows="3" bind:value={background.equipment}></textarea></label>
  <p class="mute">The class table gives broad starting resources. Add setting-specific choices here; this tool does not replace them with fixed weapons or gear.</p>
  <h4>Additional purchases · {availableMoney()} sp remaining</h4>
  <div class="field-row">
    <label class="field"><span>Item or service</span><input bind:value={purchaseName} placeholder="Name the item" /></label>
    <label class="field"><span>Cost (sp)</span><input type="number" min="0" bind:value={purchaseCost} /></label>
    <button type="button" disabled={!socialClassReady() || !purchaseName.trim() || purchaseCost > availableMoney()} onclick={addPurchase}>Add purchase</button>
  </div>
  {#if background.purchases.length}
    <ul class="leaders">{#each background.purchases as item, i}<li><span>{item.name}</span><i></i><b>{item.cost} sp</b><button type="button" class="ghost" aria-label="Remove {item.name}" onclick={() => background.purchases.splice(i, 1)}>Remove</button></li>{/each}</ul>
  {:else}<p class="mute">No additional purchases.</p>{/if}
</section>
