<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { char, availableMoney, eventCount, moneyMultiplier, resolveSocialClass, roll4d6, rollDie, rollPercentile, socialClassReady, startingMoney } from "../lib/store.svelte";
  import { CONNECTIONS, CONNECTION_TYPES, EXTENDED_FAMILY, FAMILY_STANDING, PARENTS, SIBLINGS, SOCIAL_CLASSES, rollUniqueBackgroundResult, setBackgroundEventResult, socialClassForRoll, tableResult } from "../lib/background-rules";
  import { coreBackgroundEventForRoll } from "../lib/background-events";
  import { cultures } from "../lib/content";
  import { AGE_CATEGORIES } from "../lib/rules";

  let purchaseName = $state("");
  let purchaseCost = $state(0);
  let chosenResults = $state<number[]>([]);
  let classChoice = $state("");
  let background = $derived(char.background);
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
    const taken = background.events.filter((_, i) => i !== index).map(event => event.roll);
    const result = rollUniqueBackgroundResult(taken);
    chosenResults[index] = result;
    background.events[index] = setBackgroundEventResult(background.events[index], result, "rolled");
  }
  function chooseEvent(index: number) {
    const result = Math.max(1, Math.min(100, Math.round(chosenResults[index] || 1)));
    background.events[index] = setBackgroundEventResult(background.events[index], result, "chosen");
    chosenResults[index] = result;
  }
  function clearEvent(index: number) {
    background.events[index] = { roll: 0, text: "" };
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
  <h3>Background events</h3>
  <p class="mute">Age {char.age} ({AGE_CATEGORIES[char.ageCategory].label}) calls for {eventCount()} background event{eventCount() === 1 ? "" : "s"}. Roll a d100 result or choose one from the official Core Rules table (pp. 18–20); its event text appears below. Random rolls automatically avoid duplicate events; chosen results are unrestricted. Events are optional — clear a slot that does not fit your hero.</p>
  {#if eventCount() === 0}
    <p class="hint" role="status">No Background Events from age.</p>
  {/if}
  {#each background.events as event, i}
    <div class="event-entry">
      <div class="field-row">
        <label class="field"><span>Event {i + 1} · official d100 result</span><input type="number" min="1" max="100" value={chosenResults[i] ?? (event.roll || 1)} oninput={e => chosenResults[i] = Number(e.currentTarget.value)} /></label>
        <button type="button" onclick={() => rollEvent(i)}>{event.roll ? "Reroll event" : "Roll event"}</button>
        <button type="button" class="ghost" onclick={() => chooseEvent(i)}>Choose event</button>
        {#if event.roll || event.text.trim() || event.source}<button type="button" class="ghost" title="Clear this event (events are optional)" onclick={() => clearEvent(i)}>Clear</button>{/if}
      </div>
      {#if event.roll >= 1 && event.roll <= 100}
        <p class="mute" role="status">{event.source === "chosen" ? "Chosen" : event.source === "rolled" ? "Rolled" : "Recorded"}: Core Rules table result {event.roll} ({coreBackgroundEventForRoll(event.roll)?.range}).</p>
        <label class="field event-text"><span>Official event text</span><textarea rows="2" bind:value={event.text} placeholder="Official event text is filled in automatically"></textarea></label>
      {:else}<p class="mute">Choose or roll a result to resolve this slot.</p>{/if}
    </div>
  {/each}
  {#if background.archivedEvents.length}
    <div class="hint" role="status">
      <p>{background.archivedEvents.length} event{background.archivedEvents.length === 1 ? " was" : "s were"} preserved here after the age category reduced the active slot count.</p>
      {#each background.archivedEvents as event, i}<p>Previously active event {i + 1}: {event.roll ? `Core Rules result ${event.roll}` : "unresolved"}{event.text ? ` — ${event.text}` : ""}</p>{/each}
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
