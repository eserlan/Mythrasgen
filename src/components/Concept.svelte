<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { careers, cultures } from "../lib/content";
  import { AGE_CATEGORIES, type AgeCategory } from "../lib/rules";
  import { char, culture, career, refreshBonusEligibility, setAgeCategory, rollCharacterAge } from "../lib/store.svelte";
  const cu = $derived(culture()), ca = $derived(career());
  // Changing a culture or career invalidates allocations based on its skills.
  const pick = (kind: "culture" | "career", i: number) => {
    char[kind] = i;
    char.alloc[kind] = {};
    if (kind === "career") char.careerProfessional = [];
    if (kind === "culture") {
      char.cultureSelections = { standard: [], professional: [], combatStyle: "" };
      char.cultureMigration = false;
    }
    refreshBonusEligibility();
  };
  function toggleStandard(group: number, option: string, checked: boolean) {
    const selected = [...(char.cultureSelections.standard[group] ?? [])];
    char.cultureSelections.standard[group] = checked ? [...selected, option] : selected.filter(x => x !== option);
    char.alloc.culture = {};
    char.cultureMigration = false;
    refreshBonusEligibility();
  }
  function toggleProfessional(option: string, checked: boolean) {
    const selected = char.cultureSelections.professional;
    char.cultureSelections.professional = checked ? [...selected, option] : selected.filter(x => x !== option);
    char.alloc.culture = {};
    char.cultureMigration = false;
    refreshBonusEligibility();
  }
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
    <p class="hint">Customs and Native Tongue each receive +40% automatically, outside the cultural point pool.</p>
    {#if char.cultureMigration}<p class="validation" role="status">This character uses the previous culture rules. Review the selected culture and make fresh cultural skill choices; its old cultural point allocations were cleared.</p>{/if}
    <p class="label">Standard skills</p>
    <p>{#each cu.standard as s}<span class="chip">{s}</span>{/each}</p>
    {#each cu.standardChoices as group, gi}
      <p class="label">{group.label} ({group.count})</p>
      <div class="choice-list">
        {#each group.options as option}
          <label><input type="checkbox" checked={char.cultureSelections.standard[gi]?.includes(option) ?? false}
            disabled={!char.cultureSelections.standard[gi]?.includes(option) && (char.cultureSelections.standard[gi]?.length ?? 0) >= group.count}
            onchange={e => toggleStandard(gi, option, e.currentTarget.checked)}>{option}</label>
        {/each}
      </div>
    {/each}
    <p class="label">Select up to three Professional Skills ({char.cultureSelections.professional.length}/3)</p>
    <div class="choice-list">
      {#each cu.professional as option}
        <label><input type="checkbox" checked={char.cultureSelections.professional.includes(option)}
          disabled={!char.cultureSelections.professional.includes(option) && char.cultureSelections.professional.length >= 3}
          onchange={e => toggleProfessional(option, e.currentTarget.checked)}>{option}</label>
      {/each}
    </div>
    <label class="field"><span>Cultural Combat Style (optional)</span>
      <input class="wide" value={char.cultureSelections.combatStyle} placeholder="Enter one cultural Combat Style, if desired"
        onchange={e => { char.cultureSelections.combatStyle = e.currentTarget.value.trim(); char.alloc.culture = {}; char.cultureMigration = false; refreshBonusEligibility(); }}>
    </label>
    <p class="hint">Choose specialisations that suit this culture.</p>
    <p class="label">Cultural Passions</p>
    <ul>{#each cu.passions as passion}<li>{passion}</li>{/each}</ul>
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
