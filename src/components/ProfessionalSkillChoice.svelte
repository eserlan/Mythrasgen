<script lang="ts">
  import { requiresSpecialisation } from "../lib/specialisations";

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

  const baseName = $derived(skill.replace(/\s*\([^)]*\)$/, ""));
  const needsSpecialisation = $derived(requiresSpecialisation(skill));
  const placeholder = $derived(({ Art: "Painting", Craft: "Blacksmithing", Language: "Dwarven", Lore: "Wilderness" } as Record<string, string>)[baseName] ?? "Specialisation");
</script>

<div class="professional-choice">
  <label class="professional-skill-label"><input type="checkbox" checked={selected} {disabled}
    onchange={e => onselect(e.currentTarget.checked)}>{selected && needsSpecialisation ? baseName : skill}</label>
  {#if selected && needsSpecialisation}
    <label class="specialisation-field">
      <span class="sr-only">{baseName} specialisation</span>
      <input value={specialisation} {placeholder}
        aria-label="{baseName} specialisation" oninput={e => onspecialisation(e.currentTarget.value)}>
    </label>
  {/if}
</div>
