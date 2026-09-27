<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import Passions from "./Passions.svelte";
  import { careers, cultures } from "../lib/content";
  import { socialClassForRoll } from "../lib/background-rules";
  import { updateCulturePassions } from "../lib/passions";
  import { AGE_CATEGORIES, type AgeCategory } from "../lib/rules";
  import { char, culture, career, nativeTongue, refreshBonusEligibility, setAgeCategory, setNativeLanguage, rollCharacterAge } from "../lib/store.svelte";
  const cu = $derived(culture()), ca = $derived(career());
  const pick = (kind: "culture" | "career", i: number) => {
    const replacementPassions = kind === "culture" && char.passionsEnabled
      ? updateCulturePassions(char.passions, culture().passions, cultures[i].passions)
      : null;
    char[kind] = i;
    char.alloc[kind] = {};
    if (kind === "career") char.careerProfessional = [];
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
    if (replacementPassions) char.passions = replacementPassions;
    refreshBonusEligibility();
  };
</script>

<StepHead step={0} title="Who are you?" />
<div class="card concept-identity">
  <label class="field"><span>Name</span><input bind:value={char.name} placeholder="Name your character"></label>
  <label class="field"><span>Native Language</span>
    <input value={char.nativeLanguage} oninput={e => setNativeLanguage(e.currentTarget.value)} placeholder="Elvish" autocomplete="off">
  </label>
  {#if char.nativeLanguage.trim()}
    <p class="hint">The language your character learned growing up. It is recorded as Native Tongue ({char.nativeLanguage.trim()}) and receives the cultural +40.</p>
  {:else}
    <p class="hint">The language your character learned growing up. Its skill is Native Tongue, with the automatic cultural +40.</p>
  {/if}
</div>

<section class="card age-card" aria-label="Age">
  <label class="field age-category"><span>Age Category</span>
    <select value={char.ageCategory} onchange={e => setAgeCategory(e.currentTarget.value as AgeCategory)}>
      {#each Object.entries(AGE_CATEGORIES) as [key, category]}
        <option value={key}>{category.label}</option>
      {/each}
    </select>
  </label>
  <div class="age-current"><span class="label">Age</span><b>{char.age}</b><small>{AGE_CATEGORIES[char.ageCategory].roll} years</small></div>
  <button type="button" onclick={rollCharacterAge}>Roll Age</button>
  <div class="age-derived" aria-label="Derived age information">
    <div><span>Bonus Skill Points</span><b>{AGE_CATEGORIES[char.ageCategory].bonus}</b></div>
    <div><span>Per-skill Bonus Cap</span><b>+{AGE_CATEGORIES[char.ageCategory].maxPerSkill}</b></div>
    <div><span>Background Events</span><b>{AGE_CATEGORIES[char.ageCategory].backgroundEvents}</b></div>
    {#if AGE_CATEGORIES[char.ageCategory].ageing}<div class="ageing">Ageing applies</div>{/if}
  </div>
</section>
<div class="two">
  <div class="card">
    <h3>Culture</h3>
    <label class="field"><span>Choose</span>
      <select value={char.culture} onchange={e => pick("culture", +e.currentTarget.value)}>
        {#each cultures as c, i}<option value={i}>{c.name}</option>{/each}
      </select>
    </label>
    <p class="hint">Customs and Native Tongue receive their cultural +40 automatically, outside the cultural point pool.</p>
    {#if char.cultureMigration}<p class="validation" role="status">This character uses the previous culture rules. Review the selected culture and make fresh cultural skill choices; its old cultural point allocations were cleared.</p>{/if}
    <p class="label">Standard skills</p>
    <p>{#each cu.standard as s}<span class="chip">{s}</span>{/each}</p>
    {#each cu.standardChoices as group}
      <p class="label">{group.label} ({group.count})</p>
      <p class="hint">Options: {group.options.join(", ")}</p>
    {/each}
    <p class="label">Professional skill options</p>
    <p>{#each cu.professional as s}<span class="chip">{s}</span>{/each}</p>
    <p class="hint">Choose culture skills and allocate cultural points on Page III. An optional Cultural Combat Style can be chosen there.</p>
  </div>
  <div class="card">
    <h3>Career</h3>
    <label class="field"><span>Choose</span>
      <select value={char.career} onchange={e => pick("career", +e.currentTarget.value)}>
        {#each careers as c, i}<option value={i}>{c.name}</option>{/each}
      </select>
    </label>
    <p class="label">Skills</p>
    <p>{#each [...ca.standard.map(s => s === "Native Tongue" ? nativeTongue() : s), ...(ca.combatStyle ?? []), ...ca.professional] as s}<span class="chip">{s}</span>{/each}</p>
    <p class="hint">Select career Professional Skills and allocate career points on Page IV.</p>
  </div>
</div>

<Passions />
<p class="mute">Add your own cultures and careers in <code>src/lib/content.ts</code>.</p>
