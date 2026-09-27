<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { careers, cultures } from "../lib/content";
  import { char, culture, career } from "../lib/store.svelte";
  const cu = $derived(culture()), ca = $derived(career());
  // Changing culture/career invalidates the points spent on it.
  const pick = (kind: "culture" | "career", i: number) => {
    char[kind] = i; char.alloc[kind] = {};
    if (kind === "career") char.careerProfessional = [];
  };
</script>

<StepHead step={0} title="Who are you?" />
<div class="card">
  <label class="field"><span>Name</span><input bind:value={char.name} placeholder="Name your character"></label>
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
    <p>{#each [...ca.standard, ...(ca.combatStyle ?? []), ...ca.professional] as s}<span class="chip">{s}</span>{/each}</p>
  </div>
</div>
<p class="mute">Add your own cultures and careers in <code>src/lib/content.ts</code>.</p>
