<script lang="ts">
  import { passionStartingValue } from "../lib/calc";
  import { passionRemovalLabel } from "../lib/passions";
  import { PASSION_CATEGORIES } from "../lib/rules";
  import { addPassion, char, culture, seedCulturePassions } from "../lib/store.svelte";

  const needsSubjectCha = (category: string) => category === "romantic/familial" || category === "platonic" || category === "adverse";
  const needsSubjectPow = (category: string) => category === "romantic/familial";
  const value = (p: typeof char.passions[number]) => passionStartingValue(p.category, char.chars, { pow: p.subjectPow, cha: p.subjectCha });
  function toggle(enabled: boolean) {
    char.passionsEnabled = enabled;
    if (enabled && char.passions.length === 0) seedCulturePassions();
  }
</script>

<section class="card passions">
  <div class="passion-top">
    <div><h3>Passions <span class="optional">Optional rule</span></h3>
      <p class="mute">Suggested prompts for {culture().name}; use any, edit them, or leave Passions disabled. Starting values use the Workbook formulas.</p>
    </div>
    <label class="toggle"><input type="checkbox" checked={char.passionsEnabled} onchange={e => toggle(e.currentTarget.checked)} /> Use Passions</label>
  </div>
  {#if char.passionsEnabled}
    <div class="passion-prompts"><span>Culture suggestions</span> {culture().passions.join(" · ")}</div>
    <div class="passion-list">
      {#each char.passions as p, i (i)}
        {@const startingValue = value(p)}
        <div class="passion-row">
          <label class="field"><span>Passion</span>
            <select bind:value={p.type}>
              <option>Loyalty</option><option>Love</option><option>Hate</option>
            </select>
          </label>
          <label class="field"><span>Subject</span><input bind:value={p.subject} aria-label="Passion subject" /></label>
          <label class="field"><span>Subject category</span>
            <select bind:value={p.category}>
              {#each PASSION_CATEGORIES as category}<option value={category}>{category}</option>{/each}
            </select>
          </label>
          <label class="field subject-stat"><span>Subject CHA</span>
            {#if needsSubjectCha(p.category)}<input type="number" min="1" max="30" bind:value={p.subjectCha} />{:else}<span class="not-applicable">—</span>{/if}
          </label>
          <label class="field subject-stat"><span>Subject POW</span>
            {#if needsSubjectPow(p.category)}<input type="number" min="1" max="30" bind:value={p.subjectPow} />{:else}<span class="not-applicable">—</span>{/if}
          </label>
          <div class="passion-value" aria-label="Calculated starting value"><small>Starting value</small><b>{startingValue ?? "—"}{#if startingValue !== null}%{/if}</b></div>
          <button class="ghost remove-passion" aria-label={passionRemovalLabel(p.type, p.subject, i)} onclick={() => char.passions.splice(i, 1)}>Remove</button>
        </div>
      {/each}
    </div>
    <button class="add-passion" onclick={addPassion}>Add Passion</button>
    <p class="passion-note">For a person in a romantic or familial context, enter their POW and CHA. For a platonic or adverse person, enter their CHA. Other categories use your characteristics.</p>
  {:else}
    <div class="passion-prompts"><span>Culture suggestions</span> {culture().passions.join(" · ")}</div>
    <p class="passion-note">Passions are optional. Turn them on to create and calculate starting values.</p>
  {/if}
</section>
