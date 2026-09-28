<script lang="ts">
  import { professionalSkillMetadata } from "../lib/specialisations";
  import SkillInfo from "./SkillInfo.svelte";

  let {
    skill,
    selected,
    disabled = false,
    specialisation = "",
    onselect,
    onspecialisation,
  }: {
    skill: string;
    selected: boolean;
    disabled?: boolean;
    specialisation?: string;
    onselect: (selected: boolean) => void;
    onspecialisation: (value: string) => void;
  } = $props();

  const metadata = $derived(professionalSkillMetadata(skill));
  const baseName = $derived(metadata.name);
  const needsSpecialisation = $derived(metadata.requiresSpecialisation);
  const displayName = $derived(selected && needsSpecialisation ? baseName : skill);
  const placeholder = $derived(metadata.specialisationPrompt ?? "Specialisation");
</script>

<div class="professional-choice">
  <label class="professional-skill-label"><input type="checkbox" checked={selected} {disabled}
    aria-label={displayName} onchange={e => onselect(e.currentTarget.checked)}><span class="sr-only">{displayName}</span></label>
  <SkillInfo name={displayName} />
  {#if selected && needsSpecialisation}
    <label class="specialisation-field">
      <span class="sr-only">{baseName} specialisation</span>
      <input value={specialisation} {placeholder}
        aria-label="{baseName} specialisation" aria-required="true" oninput={e => onspecialisation(e.currentTarget.value)}>
    </label>
  {/if}
</div>
