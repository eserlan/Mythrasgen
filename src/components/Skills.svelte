<script lang="ts">
  import { skillDef } from "../lib/calc";
  import { PER_SKILL_CAP, POOLS, type Kind } from "../lib/rules";
  import { addExtra, base, career, char, culture, setAlloc, stepSkills, total, used } from "../lib/store.svelte";
  import Stepper from "./Stepper.svelte";
  let { kind }: { kind: Kind } = $props();
  const pool = $derived(POOLS[kind]);
  const names = $derived(stepSkills(kind));
  const left = $derived(pool - used(kind));
  const title = $derived({ culture: `Culture · ${culture().name}`, career: `Career · ${career().name}`, bonus: "Bonus skills" }[kind]);
  let extra = $state("");
</script>

<h2>{title}</h2>
<div class="poolbar">
  <div><b>{left}</b> points left <span class="mute">of {pool} · max +{PER_SKILL_CAP} per skill</span></div>
  <div class="meter"><i style:width="{(pool - left) / pool * 100}%"></i></div>
</div>
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
