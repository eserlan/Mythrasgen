<script lang="ts">
  import { PER_SKILL_CAP, POOLS, type Kind } from "../lib/rules";
  import { addExtra, base, career, char, culture, setAlloc, skillDefinition, stepSkills, total, used } from "../lib/store.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  import Passions from "./Passions.svelte";
  let { kind }: { kind: Kind } = $props();
  const pool = $derived(POOLS[kind]);
  const names = $derived(stepSkills(kind));
  const left = $derived(pool - used(kind));
  const title = $derived({ culture: `Culture · ${culture().name}`, career: `Career · ${career().name}`, bonus: "Bonus skills" }[kind]);
  let extra = $state("");
  let extraError = $state("");
</script>

<StepHead step={{ culture: 2, career: 3, bonus: 4 }[kind]} {title} />
<div class="poolbar">
  <div class="left"><b>{left}</b><span>points remain <em>of {pool} · max +{PER_SKILL_CAP} per skill</em></span></div>
  <div class="meter"><i style:width="{(pool - left) / pool * 100}%"></i></div>
</div>
<div class="card skills">
  {#each names as n (n)}
    {@const v = char.alloc[kind][n] ?? 0}
    <div class="skill" class:has={v > 0}>
      <div class="nm"><span>{n}{#if skillDefinition(n).pro}<em>pro</em>{/if}</span><small>base {base(n)}%</small></div>
      <Stepper label={n} value={v} max={PER_SKILL_CAP} canInc={left > 0} onchange={x => setAlloc(kind, n, x)} />
      <div class="tot">{total(n)}%</div>
    </div>
  {/each}
</div>
{#if kind === "bonus"}
  <Passions />
  <form class="card bar" onsubmit={e => {
    e.preventDefault();
    if (addExtra(extra)) { extra = ""; extraError = ""; }
    else extraError = "Use a registered skill name or a specialisation, e.g. Lore (Astronomy).";
  }}>
    <input bind:value={extra} oninput={() => extraError = ""} placeholder="Add a skill, e.g. Lore (Astronomy)"><button>Add</button>
    {#if extraError}<small role="alert">{extraError}</small>{/if}
  </form>
{/if}
