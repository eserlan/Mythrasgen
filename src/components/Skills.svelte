<script lang="ts">
  import { skillDef } from "../lib/calc";
  import { PER_SKILL_CAP, POOLS, type Kind } from "../lib/rules";
  import { addExtra, base, career, char, culture, setAlloc, stepSkills, toggleCareerProfessional, total, used } from "../lib/store.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  let { kind }: { kind: Kind } = $props();
  const pool = $derived(POOLS[kind]);
  const names = $derived(stepSkills(kind));
  const left = $derived(pool - used(kind));
  const title = $derived({ culture: `Culture · ${culture().name}`, career: `Career · ${career().name}`, bonus: "Bonus skills" }[kind]);
  let extra = $state("");
</script>

<StepHead step={{ culture: 2, career: 3, bonus: 4 }[kind]} {title} />
<div class="poolbar">
  <div class="left"><b>{left}</b><span>points remain <em>of {pool} · max +{PER_SKILL_CAP} per skill</em></span></div>
  <div class="meter"><i style:width="{(pool - left) / pool * 100}%"></i></div>
</div>
{#if kind === "career"}
  <section class="card career-picks" aria-label="Career Professional Skill selection">
    <h3>Choose up to three Professional Skills</h3>
    <p class="mute">Only selected Professional Skills, listed Standard Skills, and career Combat Styles can receive career points.</p>
    <div class="career-options">
      {#each career().professional as s (s)}
        <label><input type="checkbox" checked={char.careerProfessional.includes(s)} disabled={!char.careerProfessional.includes(s) && char.careerProfessional.length >= 3}
          onchange={() => toggleCareerProfessional(s)}>{s}</label>
      {/each}
    </div>
  </section>
{/if}
<div class="card skills">
  {#each names as n (n)}
    {@const v = char.alloc[kind][n] ?? 0}
    <div class="skill" class:has={v > 0}>
      <div class="nm"><span>{n}{#if skillDef(n).pro}<em>pro</em>{/if}</span><small>base {base(n)}%</small></div>
      <Stepper label={n} value={v} max={PER_SKILL_CAP} canInc={left > 0} onchange={x => setAlloc(kind, n, x)} />
      <div class="tot">{total(n)}%</div>
    </div>
  {/each}
</div>
{#if kind === "bonus"}
  <form class="card bar" onsubmit={e => { e.preventDefault(); addExtra(extra); extra = ""; }}>
    <input bind:value={extra} placeholder="Add a skill, e.g. Lore (Astronomy)"><button>Add</button>
  </form>
{/if}
