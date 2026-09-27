<script lang="ts">
  import { deriveStats } from "../lib/calc";
  import { STATS, STAT_NAMES } from "../lib/rules";
  import { allSkills, availableMoney, career, char, culture, skillDefinition, startingMoney, total } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import HitLocations from "./HitLocations.svelte";
  import StepHead from "./StepHead.svelte";
  import { CONNECTIONS, FAMILY_STANDING, tableResult } from "../lib/background-rules";
  const loc = $derived(deriveStats(char.chars).loc);
  const skills = $derived(allSkills().sort());
  const std = $derived(skills.filter(n => !skillDefinition(n).pro));
  const pro = $derived(skills.filter(n => skillDefinition(n).pro));
  const standing = $derived(tableResult(FAMILY_STANDING, char.background.standingRoll));
  const connectionTier = $derived(tableResult(CONNECTIONS, char.background.connectionsRoll));
</script>

<div class="noprint"><StepHead step={6} title="Character sheet" /></div>
<article class="sheet">
  <div class="banner">
    <div class="meander" aria-hidden="true"></div>
    <h1>{char.name || "Unnamed hero"}</h1>
    <p>{culture().name} <span>◆</span> {career().name}</p>
  </div>
  <div class="chars sheet-stats">
    {#each STATS as k}<div class="char"><small>{k}</small><b>{char.chars[k]}</b><em>{STAT_NAMES[k]}</em></div>{/each}
  </div>
  <Derived />
  <div class="card">
    <h3>Background &amp; possessions</h3>
    <p><b>Age:</b> {char.age} ({char.ageCategory}) · <b>Social class:</b> {char.background.socialClass}</p>
    <p><b>Parents:</b> {char.background.parents || "Unrecorded"} · <b>Siblings:</b> {char.background.siblings || "Unrecorded"}</p>
    {#if char.background.extendedFamily}<p><b>Extended family:</b> {char.background.extendedFamily}</p>{/if}
    <p><b>Family standing:</b> {standing[2]} · ties: {char.background.familyTies.join(", ") || "None generated"} · <b>Connections:</b> {connectionTier[2]} — {char.background.connections.join(", ") || "None generated"}</p>
    {#each char.background.events as event, i}<p><b>Background event {i + 1} (d100 {event.roll}):</b> {event.text || "Unrecorded"}</p>{/each}
    <p><b>Starting equipment:</b> {char.background.equipment || "Unrecorded"}</p>
    <p><b>Starting money:</b> {startingMoney()} sp · <b>Remaining:</b> {availableMoney()} sp</p>
    {#if char.background.purchases.length}<ul>{#each char.background.purchases as item}<li>{item.name} · {item.cost} sp</li>{/each}</ul>{/if}
  </div>
  <div class="two sheet-body">
    <div class="card"><h3>Hit locations</h3><HitLocations {loc} /></div>
    <div class="card">
      <h3>Combat &amp; professional</h3>
      <ul class="leaders">{#each pro as n}<li><span>{n}</span><i></i><b>{total(n)}%</b></li>{/each}</ul>
    </div>
  </div>
  <div class="card">
    <h3>Standard skills</h3>
    <ul class="leaders cols">{#each std as n}<li><span>{n}</span><i></i><b>{total(n)}%</b></li>{/each}</ul>
  </div>
  <p class="foot">Forged at eserlan.github.io/Mythrasgen</p>
</article>
