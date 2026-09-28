<script lang="ts">
  import { canFinishPointBuy, pointBuyTotal, rollStat } from "../lib/calc";
  import { canSwapCharacteristics, swapCancellationAnnouncement } from "../lib/characteristics";
  import { CHAR_ROLL, POINT_BUY, RESISTANCES, STATS, STAT_NAMES, pointBuyMin, type Stat } from "../lib/rules";
  import { availableFrames, bodyRanges, isInRange, type Frame } from "../lib/body";
  import { characteristicsActionLabel, characteristicsRerollConfirmationMessage, confirmCharacteristicsRoll } from "../lib/creation";
  import { base, char, setCharacteristic, setFrame, setHeight, setRollResults, setWeight, swapCharacteristics } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  const left = $derived(POINT_BUY.budget - pointBuyTotal(char.chars));

  let spinning = $state<Stat[]>([]);
  let bodyNotice = $state("");
  let heightError = $state("");
  let weightError = $state("");
  let selectedStat = $state<Stat | null>(null);
  let swapMessage = $state("");
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
    if (!confirmCharacteristicsRoll(!!char.rollResults, () => confirm(characteristicsRerollConfirmationMessage()))) return;
    const hadSelection = selectedStat !== null;
    selectedStat = null;
    swapMessage = swapCancellationAnnouncement(hadSelection);
    spinning = [...STATS];
    bodyNotice = setRollResults(STATS.map(k => rollStat(k)));
    setTimeout(() => { spinning = []; }, 420);
  }
  function reroll(k: Stat) {
    if (!char.rollResults) return;
    const hadSelection = selectedStat !== null;
    selectedStat = null;
    swapMessage = swapCancellationAnnouncement(hadSelection);
    const index = char.rollAssignments[STATS.indexOf(k)];
    const result = rollStat(STATS[index]);
    char.rollResults[index] = result;
    bodyNotice = setCharacteristic(k, result);
  }
  function selectForSwap(k: Stat) {
    if (!selectedStat) {
      selectedStat = k;
      swapMessage = `${STAT_NAMES[k]} selected. Select another characteristic to swap values, or cancel.`;
      return;
    }
    if (selectedStat === k) {
      selectedStat = null;
      swapMessage = "Swap selection cancelled.";
      return;
    }
    const first = selectedStat;
    bodyNotice = swapCharacteristics(first, k);
    selectedStat = null;
    heightError = "";
    weightError = "";
    swapMessage = `Swapped ${STAT_NAMES[first]} and ${STAT_NAMES[k]}.${bodyNotice ? ` ${bodyNotice}` : " Select two Characteristics to swap their values."}`;
  }
</script>

<StepHead step={1} title="Characteristics" />
<div class="card bar">
  <button class:primary={char.generation === "roll"} onclick={rollAll}>{characteristicsActionLabel(!!char.rollResults)}</button>
  <button class:primary={char.generation === "pointBuy"} onclick={() => { char.generation = "pointBuy"; selectedStat = null; swapMessage = ""; }}>Point-buy</button>
  {#if char.generation === "pointBuy"}
    <div class="point-buy-guidance">
      <strong>Distribute {POINT_BUY.budget} points between your Characteristics. All {POINT_BUY.budget} points must be spent.</strong>
      <span class="mute point-buy-rules">STR, CON, DEX, POW and CHA: {POINT_BUY.min}–{POINT_BUY.max} · INT and SIZ: 8–{POINT_BUY.max}</span>
    </div>
    <span class="pill point-buy-status" class:over={left < 0} class:ok={left === 0} aria-live="polite" aria-atomic="true">
      {left === 0 ? "All points spent" : `${left} points left`}
    </span>
  {:else}
    <span class="mute" id="roll-instructions">Select two Characteristics that currently hold rolls made with the same dice to swap their values.</span>
    {#if selectedStat}
      <span class="swap-prompt">{STAT_NAMES[selectedStat]} selected</span>
      <button class="ghost" onclick={() => { selectedStat = null; swapMessage = "Swap selection cancelled."; }}>Cancel selection</button>
    {/if}
    <span class="sr-only" role="status" aria-live="polite">{swapMessage}</span>
  {/if}
</div>
<div class="chars">
  {#each STATS as k}
    {#if char.generation === "pointBuy"}
      <div class="char" class:spin={spinning.includes(k)}>
        <small>{k}</small><em>{STAT_NAMES[k]}</em>
        <Stepper label={k} value={char.chars[k]} min={pointBuyMin(k)} max={POINT_BUY.max}
          canInc={left > 0} onchange={v => { bodyNotice = setCharacteristic(k, v); heightError = ""; weightError = ""; }} />
      </div>
    {:else if char.rollResults}
      <div class="char-roll">
        <button type="button" class="char swap-card" class:selected={selectedStat === k}
          class:swap-target={selectedStat !== null && selectedStat !== k && canSwapCharacteristics(selectedStat, k, char.rollAssignments)}
          class:swap-unavailable={selectedStat !== null && selectedStat !== k && !canSwapCharacteristics(selectedStat, k, char.rollAssignments)}
          disabled={selectedStat !== null && selectedStat !== k && !canSwapCharacteristics(selectedStat, k, char.rollAssignments)}
          aria-pressed={selectedStat === k}
          aria-describedby="roll-instructions" aria-label="{STAT_NAMES[k]}, {char.chars[k]}. {selectedStat === k ? 'Selected for swapping.' : selectedStat && !canSwapCharacteristics(selectedStat, k, char.rollAssignments) ? 'Unavailable: rolled with different dice.' : 'Select to swap values.'}"
          onclick={() => selectForSwap(k)}>
          <small>{k}</small><em>{STAT_NAMES[k]}</em>
          <strong class="rolled">{char.chars[k]}</strong>
          {#if selectedStat === k}<span class="swap-state">Selected</span>
          {:else if selectedStat && canSwapCharacteristics(selectedStat, k, char.rollAssignments)}<span class="swap-state">Swap target</span>
          {:else if selectedStat}<span class="swap-state">Unavailable</span>{/if}
        </button>
        <button class="ghost" title="Reroll this {CHAR_ROLL[STATS[char.rollAssignments[STATS.indexOf(k)]]]} result" aria-label="Reroll {STAT_NAMES[k]} roll" onclick={() => reroll(k)}>↻ Reroll</button>
      </div>
    {:else}
      <div class="char"><small>{k}</small><em>{STAT_NAMES[k]}</em></div>
    {/if}
  {/each}
</div>
<section class="card resistance-summary" aria-label="Resistances">
  <h3>Resistances</h3>
  <div class="resistance-values">
    {#each RESISTANCES as name}
      <div><span>{name}</span><b>{base(name)}%</b></div>
    {/each}
  </div>
</section>
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
