<script lang="ts">
  import { deriveStats, passionStartingValue } from "../lib/calc";
  import { AGE_CATEGORIES, STATS, STAT_NAMES } from "../lib/rules";
  import { allSkills, availableMoney, career, char, culture, skillDefinition, socialClassReady, startingMoney, total } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import HitLocations from "./HitLocations.svelte";
  import StepHead from "./StepHead.svelte";
  import { CONNECTIONS, FAMILY_STANDING, resolvedBackgroundEvents, tableResult } from "../lib/background-rules";
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
    <p>{#if char.race.trim()}{char.race.trim()} <span>◆</span> {/if}{culture().name} <span>◆</span> {career().name} <span>◆</span> {AGE_CATEGORIES[char.ageCategory].label}, age {char.age}</p>
  </div>
  <p class="mute">Background Events: {AGE_CATEGORIES[char.ageCategory].backgroundEvents}{#if AGE_CATEGORIES[char.ageCategory].ageing} · Ageing rules apply{/if}</p>
  <div class="chars sheet-stats">
    {#each STATS as k}<div class="char"><small>{k}</small><b>{char.chars[k]}</b><em>{STAT_NAMES[k]}</em></div>{/each}
  </div>
  <Derived />
  <div class="card">
    <h3>Background &amp; possessions</h3>
    <p><b>Age:</b> {char.age} ({AGE_CATEGORIES[char.ageCategory].label}) · <b>Social class:</b> {socialClassReady() ? char.background.socialClass : "Reconciliation required"}</p>
    {#if socialClassReady()}<p><b>Money modifier:</b> ×{char.background.socialClassMoney} · <b>Background resources:</b> {char.background.socialClassResources}</p>{/if}
    <p><b>Parents:</b> {char.background.parents || "Unrecorded"} · <b>Siblings:</b> {char.background.siblings || "Unrecorded"}</p>
    {#if char.background.extendedFamily}<p><b>Extended family:</b> {char.background.extendedFamily}</p>{/if}
    <p><b>Family standing:</b> {standing[2]} · ties: {char.background.familyTies.join(", ") || "None generated"} · <b>Connections:</b> {connectionTier[2]} — {char.background.connections.join(", ") || "None generated"}</p>
    {#each resolvedBackgroundEvents(char.background.events) as { event, index }}<p><b>Background event {index + 1} (official table result {event.roll}):</b> {event.text || "See Mythras Core Rules pp. 18–20"}</p>{/each}
    <p><b>Starting equipment:</b> {socialClassReady() ? char.background.equipment || "Unrecorded" : "Pending Social Class reconciliation"}</p>
    <p><b>Starting money:</b> {socialClassReady() ? `${startingMoney()} sp` : "Pending Social Class"} · <b>Remaining:</b> {availableMoney()} sp</p>
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
  {#if char.passionsEnabled && char.passions.length}
    <div class="card sheet-passions">
      <h3>Passions</h3>
      <ul class="leaders cols">{#each char.passions as p}
        {@const startingValue = passionStartingValue(p.category, char.chars, { pow: p.subjectPow, cha: p.subjectCha })}
        <li><span>{p.type} ({p.subject || "unnamed"})</span><i></i><b>{startingValue ?? "—"}{#if startingValue !== null}%{/if}</b></li>
      {/each}</ul>
    </div>
  {/if}
  <p class="foot">Forged at eserlan.github.io/Mythrasgen</p>
</article>
