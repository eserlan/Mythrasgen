<script lang="ts">
  import { type Kind } from "../lib/rules";
  import { addExtra, base, capFor, career, char, culture, cultureAllocationErrors, poolFor, refreshBonusEligibility, setAlloc, setHobbySkill, skillDefinition, stepSkills, toggleCareerProfessional, total, used } from "../lib/store.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  let { kind }: { kind: Kind } = $props();
  const pool = $derived(poolFor(kind));
  const cap = $derived(capFor(kind));
  const names = $derived(stepSkills(kind));
  const left = $derived(pool - used(kind));
  const title = $derived({ culture: `Culture · ${culture().name}`, career: `Career · ${career().name}`, bonus: "Bonus skills" }[kind]);
  const cultureErrors = $derived(cultureAllocationErrors());
  let extra = $state("");
  let extraError = $state("");
  function toggleCultureStandard(group: number, option: string, checked: boolean) {
    const selected = [...(char.cultureSelections.standard[group] ?? [])];
    char.cultureSelections.standard[group] = checked ? [...selected, option] : selected.filter(x => x !== option);
    char.alloc.culture = {};
    char.cultureMigration = false;
    refreshBonusEligibility();
  }
  function toggleCultureProfessional(option: string, checked: boolean) {
    const selected = char.cultureSelections.professional;
    char.cultureSelections.professional = checked ? [...selected, option] : selected.filter(x => x !== option);
    char.alloc.culture = {};
    char.cultureMigration = false;
    refreshBonusEligibility();
  }
  function setCulturalCombatStyle(value: string) {
    char.cultureSelections.combatStyle = value.trim();
    char.alloc.culture = {};
    char.cultureMigration = false;
    refreshBonusEligibility();
  }
</script>

<StepHead step={{ culture: 2, career: 3, bonus: 4 }[kind]} {title} />
<div class="poolbar">
  <div class="left"><b>{left}</b><span>points remain <em>of {pool} · max +{cap} per skill</em></span></div>
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
{#if kind === "culture" && cultureErrors.length}
  <div class="validation" role="status"><b>Culture allocation incomplete</b><ul>{#each cultureErrors as error}<li>{error}</li>{/each}</ul></div>
{/if}
{#if kind === "culture"}
  <section class="card culture-picks" aria-label="Culture skill choices">
    <h3>Choose culture skills</h3>
    {#each culture().standardChoices as group, gi}
      <p class="label">{group.label} ({group.count})</p>
      <div class="choice-list">
        {#each group.options as option}
          <label><input type="checkbox" checked={char.cultureSelections.standard[gi]?.includes(option) ?? false}
            disabled={!char.cultureSelections.standard[gi]?.includes(option) && (char.cultureSelections.standard[gi]?.length ?? 0) >= group.count}
            onchange={e => toggleCultureStandard(gi, option, e.currentTarget.checked)}>{option}</label>
        {/each}
      </div>
    {/each}
    <p class="label">Select up to three Professional Skills ({char.cultureSelections.professional.length}/3)</p>
    <div class="choice-list">
      {#each culture().professional as option}
        <label><input type="checkbox" checked={char.cultureSelections.professional.includes(option)}
          disabled={!char.cultureSelections.professional.includes(option) && char.cultureSelections.professional.length >= 3}
          onchange={e => toggleCultureProfessional(option, e.currentTarget.checked)}>{option}</label>
      {/each}
    </div>
    <label class="field"><span>Cultural Combat Style (optional)</span>
      <input class="wide" value={char.cultureSelections.combatStyle} placeholder="Enter one cultural Combat Style, if desired"
        onchange={e => setCulturalCombatStyle(e.currentTarget.value)}>
    </label>
    <p class="hint">Allocate culture points to the selected Combat Style below when you choose it.</p>
  </section>
{/if}
<div class="card skills">
  {#each names as n (n)}
    {@const v = char.alloc[kind][n] ?? 0}
    <div class="skill" class:has={v > 0}>
      <div class="nm"><span>{n}{#if skillDefinition(n).pro}<em>pro</em>{/if}</span><small>base {base(n)}%</small></div>
      <Stepper label={n} value={v} max={cap} canInc={left >= (kind === "culture" && v === 0 ? 5 : 1)} jumpFromZero={kind === "culture"} onchange={x => setAlloc(kind, n, x)} />
      <div class="tot">{total(n)}%</div>
    </div>
  {/each}
</div>
{#if kind === "bonus"}
  {#if char.hobbySkill}
    <div class="card bar"><span>Hobby skill: <b>{char.hobbySkill}</b></span><button type="button" onclick={() => { setHobbySkill(""); extra = ""; }}>Remove</button></div>
  {:else}
    <form class="card bar" onsubmit={e => { e.preventDefault(); setHobbySkill(extra); extra = ""; }}>
      <input bind:value={extra} aria-label="New professional hobby skill or combat style" placeholder="One new professional skill or combat style"><button disabled={!extra.trim()}>Add hobby skill</button>
    </form>
  {/if}
  <form class="card bar" onsubmit={e => {
    e.preventDefault();
    if (addExtra(extra)) { extra = ""; extraError = ""; }
    else extraError = "Use a registered skill name or a specialisation, e.g. Lore (Astronomy).";
  }}>
    <input bind:value={extra} oninput={() => extraError = ""} placeholder="Add a custom skill, e.g. Lore (Astronomy)"><button disabled={!extra.trim()}>Add custom skill</button>
    {#if extraError}<small role="alert">{extraError}</small>{/if}
  </form>
  <p class="mute">Bonus points improve learned skills, custom skills, and this one optional hobby skill.</p>
{/if}
