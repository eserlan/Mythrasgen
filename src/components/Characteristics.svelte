<script lang="ts">
  import { rollStat } from "../lib/calc";
  import { CHAR_ROLL, POINT_BUY, POINT_BUY_MIN, STATS, STAT_NAMES, type Stat } from "../lib/rules";
  import { char } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  const left = $derived(POINT_BUY.budget - STATS.reduce((s, k) => s + char.chars[k], 0));

  let spinning = $state<Stat[]>([]);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** Tumble the dice for a moment, then settle on the real rolls. */
  function tumble(keys: readonly Stat[]) {
    const final = Object.fromEntries(keys.map(k => [k, rollStat(k)])) as Record<Stat, number>;
    if (reduced()) { keys.forEach(k => (char.chars[k] = final[k])); return; }
    spinning = [...keys];
    let n = 0;
    const t = setInterval(() => {
      n++;
      keys.forEach(k => (char.chars[k] = n >= 9 ? final[k] : 3 + Math.floor(Math.random() * 16)));
      if (n >= 9) { clearInterval(t); spinning = []; }
    }, 55);
  }
</script>

<StepHead step={1} title="Characteristics" />
<div class="card bar">
  <button class="primary" onclick={() => tumble(STATS)}>Roll all the dice</button>
  <span class="mute">Or adjust by hand. Point-buy budget ({POINT_BUY.budget}, {POINT_BUY.min}–{POINT_BUY.max} each; INT/SIZ {POINT_BUY_MIN.INT}–{POINT_BUY.max}):</span>
  <span class="pill" class:over={left < 0} class:ok={left === 0}>{left} left</span>
</div>
<div class="chars">
  {#each STATS as k}
    <div class="char" class:spin={spinning.includes(k)}>
      <small>{k}</small><em>{STAT_NAMES[k]}</em>
      <Stepper label={k} value={char.chars[k]} min={POINT_BUY_MIN[k]} max={POINT_BUY.max} onchange={v => (char.chars[k] = v)} />
      <button class="ghost" title="Reroll {STAT_NAMES[k]} ({CHAR_ROLL[k]})" aria-label="Reroll {STAT_NAMES[k]}" onclick={() => tumble([k])}>↻ {CHAR_ROLL[k]}</button>
    </div>
  {/each}
</div>
<h3>Attributes</h3>
<Derived />
