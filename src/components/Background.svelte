<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { char, availableMoney, eventCount, moneyMultiplier, resolveSocialClass, roll4d6, rollDie, rollPercentile, socialClassReady, startingMoney } from "../lib/store.svelte";
  import { chooseBackgroundEvent, CONNECTIONS, CONNECTION_TYPES, EXTENDED_FAMILY, FAMILY_STANDING, PARENTS, SIBLINGS, resolveBackgroundEvent, rollUniqueBackgroundResult, setBackgroundEventResult, SOCIAL_CLASSES, socialClassForRoll, tableResult } from "../lib/background-rules";
  import { CORE_BACKGROUND_EVENTS } from "../lib/background-events";
  import { cultures } from "../lib/content";
  import { AGE_CATEGORIES } from "../lib/rules";

  let purchaseName = $state("");
  let purchaseCost = $state(0);
  let classChoice = $state("");
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
  function chooseClass() {
    const row = classes.find(item => item.name === classChoice);
    if (row) {
      background.socialClassRoll = 0;
      resolveSocialClass(row, "chosen");
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
    const result = tableResult(FAMILY_STANDING, roll)[3];
    const count = result.startsWith("None") ? 0 : result.includes("1d3") ? rollDie(3) : 1;
    const options = result.includes("Enemy") ? ["Enemy", "Rival"] : ["Contact", "Ally"];
    background.familyTies = Array.from({ length: count }, () => options[rollDie(options.length) - 1]);
  }
  function rollConnections(roll = rollPercentile()) {
    background.connectionsRoll = roll;
    const count = tableResult(CONNECTIONS, background.connectionsRoll)[3];
    background.connections = Array.from({ length: count }, () => CONNECTION_TYPES[rollDie(4) - 1]);
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
  function addPurchase() {
    const name = purchaseName.trim();
    const cost = Math.max(0, Number(purchaseCost) || 0);
    if (!name || cost > availableMoney()) return;
    background.purchases.push({ name, cost });
    purchaseName = ""; purchaseCost = 0;
  }
</script>

<StepHead step={5} title="Background" />
<svelte:window onkeydown={e => { if (e.key === "Escape") { chooserFor = null; filter = ""; } }} />
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
  <p class="mute">Culture table: <b>{cultures[char.culture]?.name ?? char.socialTable}</b>. Roll 1d100 on that culture’s Social Class table. The GM may allow choosing instead.</p>
  {#if !socialClassReady()}
    <div class="validation" role="status"><b>Social class needs reconciliation</b><p>The culture changed from {background.socialClassCulture}. The previous result ({background.socialClass || "unresolved"}) and its saved resources are preserved. Roll on the {char.socialTable} table or choose a class with GM approval.</p></div>
  {/if}
  <div class="field-row">
    <label class="field"><span>1d100 result</span><input type="number" min="1" max="100" bind:value={background.socialClassRoll} /></label>
    <button type="button" onclick={() => setClass(rollPercentile())}>Roll Social Class</button>
    <button type="button" onclick={() => setClass(background.socialClassRoll)}>Apply roll</button>
  </div>
  <div class="field-row">
    <label class="field"><span>Choose class (GM option)</span><select bind:value={classChoice}>
      <option value="">Select a class</option>
      {#each classes as row}<option value={row.name}>{row.name} (×{row.money})</option>{/each}
    </select></label>
    <button type="button" class="ghost" disabled={!classChoice} onclick={chooseClass}>Choose class</button>
  </div>
  <p><b>Resolved Social Class:</b> {socialClassReady() ? `${background.socialClass} (${background.socialClassMethod})` : "Reconciliation required"}</p>
  <p><b>Money Modifier:</b> ×{socialClassReady() ? background.socialClassMoney : "—"}</p>
  <p class="label">Typical equipment</p><p>{background.socialClassEquipment}</p>
  <p class="label">Background Resources</p><p>{background.socialClassResources}</p>
</section>

<section class="card">
  <h3>Parents, family &amp; connections</h3>
  <div class="family-grid">
    <div><p class="label">Parents · d100</p><button type="button" onclick={rollParents}>Roll parents</button> <b>{background.parentsRoll}</b><input aria-label="Parents" bind:value={background.parents} placeholder="Choose or record parents" /></div>
    <div><p class="label">Siblings · d100</p><button type="button" onclick={rollSiblings}>Roll siblings</button> <b>{background.siblingsRoll}</b><input aria-label="Siblings" bind:value={background.siblings} placeholder="Choose or record siblings" /></div>
    <div><p class="label">Extended family · d100</p><button type="button" onclick={rollExtendedFamily}>Roll extended family</button> <b>{background.extendedFamilyRoll}</b><input aria-label="Extended family" bind:value={background.extendedFamily} placeholder="Choose or record extended family" /></div>
    <div><p class="label">Family standing · d100</p><div class="field-row"><input aria-label="Family standing roll" type="number" min="1" max="100" bind:value={background.standingRoll} /><button type="button" onclick={() => rollStanding()}>Roll</button><button type="button" onclick={() => rollStanding(background.standingRoll)}>Apply</button></div><p>{standing[2]}</p>
      {#each background.familyTies as tie, i}<label class="field"><span>Family tie {i + 1}</span><select bind:value={background.familyTies[i]}>{#each tie === "Enemy" || tie === "Rival" ? ["Enemy", "Rival"] : ["Contact", "Ally"] as type}<option>{type}</option>{/each}</select></label>{/each}
    </div>
    <div><p class="label">Connections · d100</p><div class="field-row"><input aria-label="Connections roll" type="number" min="1" max="100" bind:value={background.connectionsRoll} /><button type="button" onclick={() => rollConnections()}>Roll</button><button type="button" onclick={() => rollConnections(background.connectionsRoll)}>Apply</button></div><p>{connectionBand[2]}</p>
      {#each background.connections as relation, i}<label class="field"><span>Connection {i + 1}</span><select bind:value={background.connections[i]}>{#each CONNECTION_TYPES as type}<option>{type}</option>{/each}</select></label>{/each}
    </div>
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

{#if chooserFor != null}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="overlay" role="presentation" onclick={() => (chooserFor = null)}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div class="sheet-modal" role="dialog" aria-modal="true" aria-label="Choose a background event" onclick={e => e.stopPropagation()}>
      <div class="mhead">
        <b>Choose event {(chooserFor ?? 0) + 1}</b>
        <button type="button" class="ghost" onclick={() => (chooserFor = null)}>Close ✕</button>
      </div>
      <input class="mfilter" bind:value={filter} placeholder="Filter events…" aria-label="Filter events" />
      <ul class="mlist">
        {#each filteredEvents as entry (entry.range)}
          <li><button type="button" class="mitem" onclick={() => chooseEvent(chooserFor as number, entry.range)}>
            <span class="range">{entry.range}</span>
            <span class="mtext">{entry.text.length > 110 ? `${entry.text.slice(0, 110)}…` : entry.text}</span>
          </button></li>
        {:else}<li class="mute small pad">No events match “{filter}”.</li>{/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .event-entry { display: block; border: 1px solid var(--line); border-radius: 2px; padding: 8px 10px; margin: 8px 0; }
  .event-entry.resolved { border-color: var(--line2); background: var(--card2); }
  .event-row { align-items: center; }
  .event-num { font-family: var(--display); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--bronze); font-weight: 700; margin-right: auto; }
  .event-res b { font-family: var(--display); color: var(--bronze); }
  .event-text { margin: 6px 0 2px; font-size: 0.98rem; }
  .overlay { position: fixed; inset: 0; z-index: 50; background: #0009; display: grid; place-items: center; padding: 16px; }
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
</style>
