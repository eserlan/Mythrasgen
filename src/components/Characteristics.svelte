<script lang="ts">
  import { rollStat } from "../lib/calc";
  import { CHAR_ROLL, POINT_BUY, STATS } from "../lib/rules";
  import { char } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import Stepper from "./Stepper.svelte";
  const left = $derived(POINT_BUY.budget - STATS.reduce((s, k) => s + char.chars[k], 0));
</script>

<h2>Characteristics</h2>
<div class="card bar">
  <button class="primary" onclick={() => STATS.forEach(k => (char.chars[k] = rollStat(k)))}>🎲 Roll all</button>
  <span class="mute">Or adjust by hand. Point-buy budget ({POINT_BUY.budget}, {POINT_BUY.min}–{POINT_BUY.max} each):</span>
  <span class="pill" class:over={left < 0} class:ok={left === 0}>{left} left</span>
</div>
<div class="chars">
  {#each STATS as k}
    <div class="char">
      <small>{k}</small>
      <Stepper label={k} value={char.chars[k]} min={1} max={30} onchange={v => (char.chars[k] = v)} />
      <button class="ghost" title="Reroll {k}" onclick={() => (char.chars[k] = rollStat(k))}>🎲 {CHAR_ROLL[k]}</button>
    </div>
  {/each}
</div>
<h3>Attributes</h3>
<Derived />
