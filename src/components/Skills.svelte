<script lang="ts">
  import { skillDef } from "../lib/calc";
  import { type Kind } from "../lib/rules";
  import { addExtra, base, capFor, career, char, culture, poolFor, setAlloc, setHobbySkill, stepSkills, total, used } from "../lib/store.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  let { kind }: { kind: Kind } = $props();
  const pool = $derived(poolFor(kind));
  const cap = $derived(capFor(kind));
  const names = $derived(stepSkills(kind));
  const left = $derived(pool - used(kind));
  const title = $derived({ culture: `Culture · ${culture().name}`, career: `Career · ${career().name}`, bonus: "Bonus skills" }[kind]);
  let extra = $state("");
</script>

<StepHead step={{ culture: 2, career: 3, bonus: 4 }[kind]} {title} />
<div class="poolbar">
  <div class="left"><b>{left}</b><span>points remain <em>of {pool} · max +{cap} per skill</em></span></div>
  <div class="meter"><i style:width="{(pool - left) / pool * 100}%"></i></div>
</div>
<div class="card skills">
  {#each names as n (n)}
    {@const v = char.alloc[kind][n] ?? 0}
    <div class="skill" class:has={v > 0}>
      <div class="nm"><span>{n}{#if skillDef(n).pro}<em>pro</em>{/if}</span><small>base {base(n)}%</small></div>
      <Stepper label={n} value={v} max={cap} canInc={left > 0} onchange={x => setAlloc(kind, n, x)} />
      <div class="tot">{total(n)}%</div>
    </div>
  {/each}
</div>
{#if kind === "bonus"}
  {#if char.hobbySkill}
    <div class="card bar"><span>Hobby skill: <b>{char.hobbySkill}</b></span><button type="button" onclick={() => { setHobbySkill(""); extra = ""; }}>Remove</button></div>
  {:else}
    <form class="card bar" onsubmit={e => { e.preventDefault(); setHobbySkill(extra); extra = ""; }}>
      <input bind:value={extra} placeholder="One new professional skill or combat style"><button disabled={!extra.trim()}>Add hobby skill</button>
    </form>
  {/if}
  <form class="card bar" onsubmit={e => { e.preventDefault(); addExtra(extra); extra = ""; }}>
    <input bind:value={extra} placeholder="Add a custom skill, e.g. Lore (Astronomy)"><button disabled={!extra.trim()}>Add custom skill</button>
  </form>
  <p class="mute">Bonus points improve learned skills, custom skills, and this one optional hobby skill.</p>
{/if}
