<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { char, eventCount, moneyMultiplier, resolveSocialClass, roll4d6, rollDie, rollPercentile, setStartingMoneyRoll, socialClassReady, startingMoney } from "../lib/store.svelte";
  import { chooseBackgroundEvent, CONNECTIONS, CONNECTION_TYPES, EXTENDED_FAMILY, FAMILY_STANDING, PARENTS, SIBLINGS, resolveBackgroundEvent, rollUniqueBackgroundResult, setBackgroundEventResult, SOCIAL_CLASSES, socialClassForRoll, tableResult } from "../lib/background-rules";
  import { CORE_BACKGROUND_EVENTS } from "../lib/background-events";
  import { ALL_RELATIONSHIP_TYPES, reconcileFamilyRelationships, resolveFamilyRelationshipCount } from "../lib/family-relationships";
  import { activateModalDialog } from "../lib/modal-dialog";
  import { cultures } from "../lib/content";
  import { AGE_CATEGORIES } from "../lib/rules";
  import { formatCopperPrice } from "../lib/equipment-catalogue";

  let socialClassDialog: HTMLDialogElement;
  let chooserFor: number | null = $state(null);
  let filter = $state("");
  let background = $derived(char.background);
  const filteredEvents = $derived(CORE_BACKGROUND_EVENTS.filter(entry => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return `${entry.range} ${entry.text}`.toLowerCase().includes(q);
  }));
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
    const taken = background.events.filter((_, i) => i !== index).map(event => event.eventId ?? "");
    const roll = rollUniqueBackgroundResult(taken);
    background.events[index] = setBackgroundEventResult(roll, "rolled");
  }
  function chooseEvent(index: number, eventId: string) {
    background.events[index] = chooseBackgroundEvent(eventId);
    chooserFor = null;
    filter = "";
  }
  function clearEvent(index: number) {
    background.events[index] = { roll: 0 };
  }
  function clearArchivedEvents() {
    background.archivedEvents = [];
  }
  function showEventChooser(node: HTMLDialogElement) {
    return activateModalDialog(node, ".mfilter");
  }
  function closeEventChooser() {
    chooserFor = null;
    filter = "";
  }
</script>

<StepHead step={6} title="Background" />
<section class="card">
  <h3>Background events — {eventCount() === 0 ? "none" : `${eventCount()} event${eventCount() === 1 ? "" : "s"}`}</h3>
  <p class="mute">Age {char.age} ({AGE_CATEGORIES[char.ageCategory].label}) calls for {eventCount()} background event{eventCount() === 1 ? "" : "s"}. Random rolls never repeat an event already held; chosen events are unrestricted. Events are optional — leave a slot empty if it does not fit your hero.</p>
  {#if eventCount() === 0}
    <p class="hint" role="status">No Background Events from age.</p>
  {/if}
  {#each background.events as event, i}
    {@const entry = resolveBackgroundEvent(event)}
    <div class="event-entry" class:resolved={!!entry}>
      <div class="field-row event-row">
        <span class="event-num">Event {i + 1}</span>
        {#if !entry}
          <button type="button" onclick={() => rollEvent(i)}>Roll d100</button>
          <button type="button" class="ghost" onclick={() => (chooserFor = i)}>Choose event…</button>
        {:else}
          <span class="event-res" role="status">
            {#if event.source === "rolled" && event.roll >= 1 && event.roll <= 100}
              <b>{String(event.roll).padStart(2, "0")}</b> · {entry.range}
            {:else}{entry.range} · chosen{/if}
          </span>
          <button type="button" class="ghost" onclick={() => rollEvent(i)}>Reroll</button>
          <button type="button" class="ghost" onclick={() => (chooserFor = i)}>Change</button>
          <button type="button" class="ghost" title="Clear this event (events are optional)" onclick={() => clearEvent(i)}>Clear</button>
        {/if}
      </div>
      {#if entry}<p class="event-text">{entry.text}</p>{/if}
    </div>
  {/each}
  {#if background.archivedEvents.length}
    <div class="hint" role="status">
      <p>{background.archivedEvents.length} event{background.archivedEvents.length === 1 ? " was" : "s were"} preserved here after the age category reduced the active slot count.</p>
      {#each background.archivedEvents as event, i}{@const archived = resolveBackgroundEvent(event)}<p>Previously active event {i + 1}: {archived?.range ?? "unresolved"}{archived ? ` — ${archived.text}` : ""}</p>{/each}
      <button type="button" class="ghost" onclick={clearArchivedEvents}>Discard preserved events</button>
    </div>
  {/if}
</section>

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
  <h3>Starting Money</h3>
  <p class="mute">Starting money uses the {char.moneyTable} culture rate of {moneyMultiplier()} sp per 4d6 result, modified by Social Class.</p>
  <div class="starting-money-roll">
    <label class="field"><span>4d6</span><input aria-label="4d6 starting money roll" type="number" min="4" max="24" value={background.startingMoneyRoll} onchange={e => setStartingMoneyRoll(+e.currentTarget.value)} /></label>
    <button type="button" onclick={() => setStartingMoneyRoll(roll4d6())}>Reroll</button>
  </div>
  <div class="starting-money-total" role="status">
    <span>Starting Money</span>
    <strong>{formatCopperPrice(startingMoney() * 10)}</strong>
    <small>{background.startingMoneyRoll} × {moneyMultiplier()} sp × {socialClassReady() ? `Social Class modifier (×${background.socialClassMoney})` : "pending Social Class modifier"}</small>
  </div>
</section>

{#if chooserFor != null}
  <dialog class="overlay" use:showEventChooser aria-label="Choose a background event" onclose={closeEventChooser} onclick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <div class="sheet-modal">
      <div class="mhead">
        <b>Choose event {(chooserFor ?? 0) + 1}</b>
        <button type="button" class="ghost" onclick={e => e.currentTarget.closest("dialog")?.close()}>Close ✕</button>
      </div>
      <input class="mfilter" bind:value={filter} placeholder="Filter events…" aria-label="Filter events" />
      <ul class="mlist">
        {#each filteredEvents as entry (entry.range)}
          <li><button type="button" class="mitem" onclick={() => chooseEvent(chooserFor as number, entry.range)}>
            <span class="range">{entry.range}</span>
            <span class="mtext">{entry.text}</span>
          </button></li>
        {:else}<li class="mute small pad">No events match “{filter}”.</li>{/each}
      </ul>
    </div>
  </dialog>
{/if}

<style>
  .event-entry { display: block; border: 1px solid var(--line); border-radius: 2px; padding: 8px 10px; margin: 8px 0; }
  .event-entry.resolved { border-color: var(--line2); background: var(--card2); }
  .event-row { align-items: center; }
  .event-num { font-family: var(--display); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--bronze); font-weight: 700; margin-right: auto; }
  .event-res b { font-family: var(--display); color: var(--bronze); }
  .event-text { margin: 6px 0 2px; font-size: 0.98rem; }
  .overlay { position: fixed; inset: 0; z-index: 50; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 16px; border: 0; background: transparent; display: grid; place-items: center; }
  .overlay::backdrop { background: #0009; }
  .sheet-modal { width: min(560px, 100%); max-height: min(70vh, 560px); display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--line2); border-radius: 4px; box-shadow: var(--shadow); }
  .mhead { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--line); font-family: var(--display); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem; }
  .mfilter { margin: 10px 14px 4px; }
  .mlist { list-style: none; margin: 6px 0 10px; padding: 0 8px; overflow: auto; }
  .mitem { display: flex; gap: 10px; align-items: baseline; width: 100%; text-align: left; background: none; border: 0; border-bottom: 1px dotted var(--line2); border-radius: 0; padding: 8px 6px; text-transform: none; letter-spacing: 0; font-family: var(--body); font-size: 1rem; font-weight: 400; }
  .mitem:hover { border-color: var(--bronze2); transform: none; }
  .range { font-family: var(--display); font-weight: 700; color: var(--bronze); white-space: nowrap; font-size: 0.8rem; }
  .mtext { color: var(--fg); }
  .small { font-size: 0.9rem; }
  .pad { padding: 12px; }
  .starting-money-roll { display: flex; align-items: end; gap: 10px; max-width: 320px; }
  .starting-money-roll .field { flex: 1; }
  .starting-money-total { display: grid; gap: 2px; margin-top: 14px; padding: 12px 14px; border: 1px solid var(--line2); background: var(--card2); }
  .starting-money-total > span { font-family: var(--display); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--bronze); font-weight: 700; }
  .starting-money-total strong { font-family: var(--display); font-size: 1.65rem; line-height: 1.2; }
  .starting-money-total small { color: var(--muted); }
</style>
