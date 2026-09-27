<script lang="ts">
  import { canFinishPointBuy, pointBuyTotal, rollStat } from "../lib/calc";
  import { CHAR_ROLL, POINT_BUY, STATS, STAT_NAMES, pointBuyMin, type Stat } from "../lib/rules";
  import { availableFrames, bodyRanges, isInRange, type Frame } from "../lib/body";
  import { characteristicsActionLabel, confirmCharacteristicsRoll } from "../lib/creation";
  import { assignRoll, char, setCharacteristic, setFrame, setHeight, setRollResults, setWeight } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  const left = $derived(POINT_BUY.budget - pointBuyTotal(char.chars));

  let spinning = $state<Stat[]>([]);
  let bodyNotice = $state("");
  let heightError = $state("");
  let weightError = $state("");
  const ranges = $derived(bodyRanges(char.chars.SIZ, char.frame));
  const frames = $derived(availableFrames(char.frameOptions));
  function enterMeasurement(kind: "height" | "weight", event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const value = input.value === "" ? null : Number(input.value);
    const range = kind === "height" ? ranges?.height : ranges?.weight;
    const valid = value === null || (isInRange(value, range) && (kind === "height" ? setHeight(value) : setWeight(value)));
    if (!valid) {
      const label = kind === "height" ? "Height" : "Weight";
      const error = `${label} must be a whole number from ${range?.min} to ${range?.max} ${kind === "height" ? "cm" : "kg"}.`;
      if (kind === "height") heightError = error; else weightError = error;
      input.value = String(kind === "height" ? char.height ?? "" : char.weight ?? "");
      return;
    }
    if (kind === "height") { setHeight(value); heightError = ""; }
    else { setWeight(value); weightError = ""; }
  }
  function rollAll() {
    if (!confirmCharacteristicsRoll(!!char.rollResults, () => confirm("Reroll all Characteristics? This will replace the current rolled values and their assignment."))) return;
    spinning = [...STATS];
    bodyNotice = setRollResults(STATS.map(k => rollStat(k)));
    setTimeout(() => { spinning = []; }, 420);
  }
  function reroll(k: Stat) {
    if (!char.rollResults) return;
    const index = char.rollAssignments[STATS.indexOf(k)];
    const result = rollStat(STATS[index]);
    char.rollResults[index] = result;
    bodyNotice = setCharacteristic(k, result);
  }
</script>

<StepHead step={1} title="Characteristics" />
<div class="card bar">
  <button class:primary={char.generation === "roll"} onclick={rollAll}>{characteristicsActionLabel(!!char.rollResults)}</button>
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
          canInc={left > 0} onchange={v => { bodyNotice = setCharacteristic(k, v); heightError = ""; weightError = ""; }} />
      {:else if char.rollResults}
        <strong class="rolled">{char.chars[k]}</strong>
        <select aria-label="Assign a rolled result to {STAT_NAMES[k]}" value={char.rollAssignments[STATS.indexOf(k)]}
          onchange={e => { bodyNotice = assignRoll(k, +e.currentTarget.value); heightError = ""; weightError = ""; }}>
          {#each char.rollResults as _, i}
            <option value={i}>{STATS[i]} roll · {char.rollResults[i]}</option>
          {/each}
        </select>
        <button class="ghost" title="Reroll this {CHAR_ROLL[STATS[char.rollAssignments[STATS.indexOf(k)]]]} result" aria-label="Reroll {STAT_NAMES[k]} roll" onclick={() => reroll(k)}>↻ Reroll</button>
      {/if}
    </div>
  {/each}
</div>
<div class="card body-card">
  <h3>Frame, height &amp; weight</h3>
  <div class="body-fields">
    <label class="field"><span>Frame</span>
      <select value={char.frame} onchange={e => { bodyNotice = setFrame(e.currentTarget.value as Frame); weightError = ""; }}>
        {#each frames as frame}<option value={frame}>{frame}</option>{/each}
      </select>
    </label>
    <label class="field"><span>Height · {ranges ? `${ranges.height.min}–${ranges.height.max} cm` : "SIZ outside human table"}</span>
      <input type="number" min={ranges?.height.min} max={ranges?.height.max} step="1" value={char.height ?? ""}
        aria-label="Height in centimetres" aria-invalid={!!heightError} oninput={() => (heightError = "")} onchange={e => enterMeasurement("height", e)}>
    </label>
    <label class="field"><span>Weight · {ranges ? `${ranges.weight.min}–${ranges.weight.max} kg` : "SIZ outside human table"}</span>
      <input type="number" min={ranges?.weight.min} max={ranges?.weight.max} step="1" value={char.weight ?? ""}
        aria-label="Weight in kilograms" aria-invalid={!!weightError} oninput={() => (weightError = "")} onchange={e => enterMeasurement("weight", e)}>
    </label>
  </div>
  <p class="hint">Select whole-number values within the published human SIZ ranges. Frame changes affect weight; SIZ changes affect both ranges.</p>
  {#if bodyNotice}<p class="validation" role="status">{bodyNotice}</p>{/if}
  {#if heightError}<p class="validation" role="alert">{heightError}</p>{/if}
  {#if weightError}<p class="validation" role="alert">{weightError}</p>{/if}
</div>
<h3>Attributes</h3>
<Derived />
