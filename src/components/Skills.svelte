<script lang="ts">
  import { type Kind } from "../lib/rules";
  import { base, capFor, career, careerAllocationErrors, char, chooseBonusCombatStyle, chooseCareerCombatStyle, chooseCultureCombatStyle, clearHobbySkill, culture, cultureAllocationErrors, learnedSkills, poolFor, reconcileCultureSelection, refreshBonusEligibility, setAlloc, setHobbyProfessionalSkill, setSkillSpecialisation, skillDefinition, stepSkills, toggleCareerProfessional, total, used } from "../lib/store.svelte";
  import { HOBBY_PROFESSIONAL_SKILLS, hobbySkillName } from "../lib/hobby-skills";
  import { requiresSpecialisation, resolveSkillTemplate } from "../lib/specialisations";
  import CombatStyleChooser from "./CombatStyleChooser.svelte";
  import ProfessionalSkillChoice from "./ProfessionalSkillChoice.svelte";
  import StepHead from "./StepHead.svelte";
  import Stepper from "./Stepper.svelte";
  let { kind }: { kind: Kind } = $props();
  const pool = $derived(poolFor(kind));
  const cap = $derived(capFor(kind));
  const names = $derived(stepSkills(kind));
  const left = $derived(pool - used(kind));
  const title = $derived({ culture: `Culture · ${culture().name}`, career: `Career · ${career().name}`, bonus: "Bonus skills" }[kind]);
  const cultureErrors = $derived(cultureAllocationErrors());
  const careerErrors = $derived(careerAllocationErrors());
  let hobbyBranch = $state(char.hobbySkill?.type ?? "");
  let hobbyTemplate = $state(char.hobbySkill?.type === "professionalSkill" ? char.hobbySkill.template : "");
  let hobbySpecialisation = $state(char.hobbySkill?.type === "professionalSkill" ? char.hobbySkill.specialisation : "");
  let hobbyError = $state("");
  function learnedHobbySkill(template: string, specialisation = "") {
    const name = resolveSkillTemplate(template, specialisation);
    return !!name && learnedSkills().includes(name);
  }
  function switchHobbyBranch(branch: "professionalSkill" | "combatStyle") {
    if (hobbyBranch !== branch) clearHobbySkill();
    hobbyBranch = branch;
    hobbyTemplate = "";
    hobbySpecialisation = "";
    hobbyError = "";
  }
  function selectHobbyProfessional(template: string, selected: boolean) {
    if (!selected) {
      if (hobbyTemplate === template) { clearHobbySkill(); hobbyTemplate = ""; hobbySpecialisation = ""; }
      return;
    }
    if (learnedHobbySkill(template)) { hobbyError = "Choose a new Professional Skill not already learned through Culture or Career."; return; }
    hobbyTemplate = template;
    hobbySpecialisation = "";
    hobbyError = "";
    if (!requiresSpecialisation(template)) setHobbyProfessionalSkill(template);
    else clearHobbySkill();
  }
  function setHobbySpecialisation(value: string) {
    hobbySpecialisation = value;
    hobbyError = learnedHobbySkill(hobbyTemplate, value)
      ? "Choose a new Professional Skill not already learned through Culture or Career."
      : "";
    setHobbyProfessionalSkill(hobbyTemplate, value);
  }
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
    if (!checked) delete char.skillSpecialisations.culture[option];
    reconcileCultureSelection();
    char.cultureMigration = false;
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
    <div class="professional-options">
      {#each career().professional as s (s)}
        <ProfessionalSkillChoice skill={s} selected={char.careerProfessional.includes(s)}
          disabled={!char.careerProfessional.includes(s) && char.careerProfessional.length >= 3}
          specialisation={char.skillSpecialisations.career[s] ?? ""}
          onselect={() => toggleCareerProfessional(s)}
          onspecialisation={value => setSkillSpecialisation("career", s, value)} />
      {/each}
    </div>
    {#each career().combatStyle ?? [] as _slot, i (i)}
      <CombatStyleChooser idPrefix={`career-combat-style-${i}`} selectedName={char.careerCombatStyles[i] ?? ""} styles={char.combatStyles} onchoose={style => chooseCareerCombatStyle(i, style)} />
    {/each}
  </section>
  {#if careerErrors.length}<div class="validation" role="status"><b>Career selection incomplete</b><ul>{#each careerErrors as error}<li>{error}</li>{/each}</ul></div>{/if}
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
    <div class="professional-options">
      {#each culture().professional as option}
        <ProfessionalSkillChoice skill={option} selected={char.cultureSelections.professional.includes(option)}
          disabled={!char.cultureSelections.professional.includes(option) && char.cultureSelections.professional.length >= 3}
          specialisation={char.skillSpecialisations.culture[option] ?? ""}
          onselect={checked => toggleCultureProfessional(option, checked)}
          onspecialisation={value => setSkillSpecialisation("culture", option, value)} />
      {/each}
    </div>
    <div class="culture-combat-style">
      <CombatStyleChooser idPrefix="culture-combat-style" selectedName={char.cultureSelections.combatStyle} styles={char.combatStyles} onchoose={chooseCultureCombatStyle} />
    </div>
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
  <section class="card hobby-skill" aria-label="Optional Hobby Skill">
    <h3>Optional Hobby Skill</h3>
    <p class="mute">Choose one new Professional Skill or Combat Style reflecting a personal hobby or interest.</p>
    <p class="hint">Your hobby is one additional skill learned outside your Culture and Career. A hobby Combat Style is separate from your Cultural Combat Style on Page III.</p>
    <div class="choice-list" role="group" aria-label="Hobby Skill type">
      <label><input type="radio" name="hobby-skill-type" checked={hobbyBranch === "professionalSkill"} onchange={() => switchHobbyBranch("professionalSkill")}>Professional Skill</label>
      <label><input type="radio" name="hobby-skill-type" checked={hobbyBranch === "combatStyle"} onchange={() => switchHobbyBranch("combatStyle")}>Combat Style</label>
    </div>
    {#if hobbyBranch === "professionalSkill"}
      <div class="professional-options" aria-label="Professional Skill choices">
        {#each HOBBY_PROFESSIONAL_SKILLS as skill (skill)}
          <ProfessionalSkillChoice skill={skill} selected={hobbyTemplate === skill}
            disabled={hobbyTemplate !== skill && !requiresSpecialisation(skill) && learnedHobbySkill(skill)}
            specialisation={hobbySpecialisation}
            onselect={selected => selectHobbyProfessional(skill, selected)}
            onspecialisation={setHobbySpecialisation} />
        {/each}
      </div>
      {#if hobbyError}<p class="validation" role="alert">{hobbyError}</p>{/if}
      {#if char.hobbySkill?.type === "professionalSkill"}<p class="hint" aria-live="polite">Selected hobby skill: <b>{hobbySkillName(char.hobbySkill)}</b></p>{/if}
    {:else if hobbyBranch === "combatStyle"}
      <CombatStyleChooser idPrefix="bonus-hobby-combat-style" selectedName={char.hobbySkill?.type === "combatStyle" ? char.hobbySkill.name : ""} styles={char.combatStyles} onchoose={chooseBonusCombatStyle} />
    {/if}
  </section>
  <p class="mute">Bonus points improve skills learned through Culture or Career and the optional Hobby Skill.</p>
{/if}
