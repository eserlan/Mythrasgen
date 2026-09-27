<script lang="ts">
  import { deriveStats, passionStartingValue, skillDef } from "../lib/calc";
  import { STATS, STAT_NAMES } from "../lib/rules";
  import { allSkills, career, char, culture, total } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import HitLocations from "./HitLocations.svelte";
  import StepHead from "./StepHead.svelte";
  const loc = $derived(deriveStats(char.chars).loc);
  const skills = $derived(allSkills().sort());
  const std = $derived(skills.filter(n => !skillDef(n).pro));
  const pro = $derived(skills.filter(n => skillDef(n).pro));
</script>

<div class="noprint"><StepHead step={5} title="Character sheet" /></div>
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
      <ul class="leaders cols">{#each char.passions as p}<li><span>{p.type} ({p.subject || "unnamed"})</span><i></i><b>{passionStartingValue(p.category, char.chars, { pow: p.subjectPow, cha: p.subjectCha })}%</b></li>{/each}</ul>
    </div>
  {/if}
  <p class="foot">Forged at eserlan.github.io/Mythrasgen</p>
</article>
