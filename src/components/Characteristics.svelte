<script lang="ts">
  import { canFinishPointBuy, pointBuyTotal, rollStat } from "../lib/calc";
  import { CHAR_ROLL, POINT_BUY, STATS, STAT_NAMES, pointBuyMin, type Stat } from "../lib/rules";
  import { assignRoll, char, setRollResults } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  const left = $derived(POINT_BUY.budget - pointBuyTotal(char.chars));

  let spinning = $state<Stat[]>([]);
  function rollAll() {
    spinning = [...STATS];
    setRollResults(STATS.map(k => rollStat(k)));
    setTimeout(() => { spinning = []; }, 420);
  }
  function reroll(k: Stat) {
    if (!char.rollResults) return;
    const index = char.rollAssignments[STATS.indexOf(k)];
    const result = rollStat(STATS[index]);
    char.rollResults[index] = result;
    char.chars[k] = result;
  }
</script>

<StepHead step={1} title="Characteristics" />
<div class="card bar">
  <button class:primary={char.generation === "roll"} onclick={rollAll}>Roll characteristics</button>
  <button class:primary={char.generation === "pointBuy"} onclick={() => (char.generation = "pointBuy")}>Point-buy</button>
  {#if char.generation === "pointBuy"}
    <span class="mute">Spend exactly {POINT_BUY.budget} points. STR/CON/DEX/POW/CHA: {POINT_BUY.min}–{POINT_BUY.max}; INT/SIZ: 8–{POINT_BUY.max}.</span>
    <span class="pill" class:over={left < 0} class:ok={left === 0}>{left} points left</span>
  {:else}
    <span class="mute">Assign the rolled results to fit your character concept. Select a result to swap it with another characteristic.</span>
  {/if}
</div>
<div class="chars">
  {#each STATS as k}
    <div class="char" class:spin={spinning.includes(k)}>
      <small>{k}</small><em>{STAT_NAMES[k]}</em>
      {#if char.generation === "pointBuy"}
        <Stepper label={k} value={char.chars[k]} min={pointBuyMin(k)} max={POINT_BUY.max}
          canInc={left > 0} onchange={v => (char.chars[k] = v)} />
      {:else if char.rollResults}
        <strong class="rolled">{char.chars[k]}</strong>
        <select aria-label="Assign a rolled result to {STAT_NAMES[k]}" value={char.rollAssignments[STATS.indexOf(k)]}
          onchange={e => assignRoll(k, +e.currentTarget.value)}>
          {#each char.rollResults as _, i}
            <option value={i}>{STATS[i]} roll · {char.rollResults[i]}</option>
          {/each}
        </select>
        <button class="ghost" title="Reroll this {CHAR_ROLL[STATS[char.rollAssignments[STATS.indexOf(k)]]]} result" aria-label="Reroll {STAT_NAMES[k]} roll" onclick={() => reroll(k)}>↻ Reroll</button>
      {/if}
    </div>
  {/each}
</div>
<h3>Attributes</h3>
<Derived />
