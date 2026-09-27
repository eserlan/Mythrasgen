<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import { careers, cultures } from "../lib/content";
  import { socialClassForRoll } from "../lib/background-rules";
  import { char, culture, career } from "../lib/store.svelte";
  const cu = $derived(culture()), ca = $derived(career());
  // Changing culture/career invalidates the points spent on it.
  const pick = (kind: "culture" | "career", i: number) => {
    char[kind] = i; char.alloc[kind] = {};
    if (kind === "culture") {
      char.cultureSelections = { standard: [], professional: [], combatStyle: "" };
      char.cultureMigration = false;
    }
    if (kind === "culture" && cultures[i]?.kind) {
      char.socialTable = cultures[i].kind;
      char.moneyTable = cultures[i].kind;
      const rank = socialClassForRoll(char.socialTable, char.background.socialClassRoll);
      char.background.socialClass = rank.name;
      char.background.equipment = `${rank.equipment}. ${rank.possessions}.`;
    }
  };
  function toggleStandard(group: number, option: string, checked: boolean) {
    const selected = [...(char.cultureSelections.standard[group] ?? [])];
    char.cultureSelections.standard[group] = checked ? [...selected, option] : selected.filter(x => x !== option);
    char.alloc.culture = {};
    char.cultureMigration = false;
  }
  function toggleProfessional(option: string, checked: boolean) {
    const selected = char.cultureSelections.professional;
    char.cultureSelections.professional = checked ? [...selected, option] : selected.filter(x => x !== option);
    char.alloc.culture = {};
    char.cultureMigration = false;
  }
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
        onchange={e => { char.cultureSelections.combatStyle = e.currentTarget.value.trim(); char.alloc.culture = {}; char.cultureMigration = false; }}>
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
    <p>{#each [...ca.standard, ...ca.professional] as s}<span class="chip">{s}</span>{/each}</p>
  </div>
</div>
<p class="mute">Add your own cultures and careers in <code>src/lib/content.ts</code>.</p>
