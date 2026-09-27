<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { careers, cultures } from "../lib/content";
  import { AGE_CATEGORIES, type AgeCategory } from "../lib/rules";
  import { char, culture, career, refreshBonusEligibility, setAgeCategory, rollCharacterAge } from "../lib/store.svelte";
  const cu = $derived(culture()), ca = $derived(career());
  // Changing culture/career invalidates the points spent on it.
  const pick = (kind: "culture" | "career", i: number) => {
    char[kind] = i;
    char.alloc[kind] = {};
    refreshBonusEligibility();
  };
</script>

<StepHead step={0} title="Who are you?" />
<div class="card">
  <label class="field"><span>Name</span><input bind:value={char.name} placeholder="Name your character"></label>
</div>
<div class="card bar">
  <label class="field"><span>Age category</span>
    <select value={char.ageCategory} onchange={e => setAgeCategory(e.currentTarget.value as AgeCategory)}>
      {#each Object.entries(AGE_CATEGORIES) as [key, category]}
        <option value={key}>{category.label} · {category.bonus} bonus points</option>
      {/each}
    </select>
  </label>
  <div><b>Age {char.age}</b><div class="mute">{AGE_CATEGORIES[char.ageCategory].roll} years</div></div>
  <button type="button" onclick={rollCharacterAge}>Roll age</button>
  <div><b>{AGE_CATEGORIES[char.ageCategory].backgroundEvents}</b><div class="mute">background-event rolls</div></div>
  {#if AGE_CATEGORIES[char.ageCategory].ageing}<span class="pill">Ageing applies</span>{/if}
</div>
<div class="two">
  <div class="card">
    <h3>Culture</h3>
    <label class="field"><span>Choose</span>
      <select value={char.culture} onchange={e => pick("culture", +e.currentTarget.value)}>
        {#each cultures as c, i}<option value={i}>{c.name}</option>{/each}
      </select></label>
    <p class="label">Combat style</p>
    <p><span class="chip acc">{cu.combatStyle}</span></p>
    <p class="label">Skills</p>
    <p>{#each [...cu.standard, ...cu.professional] as s}<span class="chip">{s}</span>{/each}</p>
  </div>
  <div class="card">
    <h3>Career</h3>
    <label class="field"><span>Choose</span>
      <select value={char.career} onchange={e => pick("career", +e.currentTarget.value)}>
        {#each careers as c, i}<option value={i}>{c.name}</option>{/each}
      </select></label>
    <p class="label">Skills</p>
    <p>{#each [...ca.standard, ...ca.professional] as s}<span class="chip">{s}</span>{/each}</p>
  </div>
</div>
<p class="mute">Add your own cultures and careers in <code>src/lib/content.ts</code>.</p>
