<script lang="ts">
  import { CORE_COMBAT_STYLES, customCombatStyle, type CharacterCombatStyle, type CombatStyleSelection, type CombatStyleTrait } from "../lib/combat-styles";
  let { selectedName = "", styles = [], onchoose }: { selectedName?: string; styles?: CharacterCombatStyle[]; onchoose: (style: CombatStyleSelection | null) => void } = $props();
  let query = $state("");
  let name = $state("");
  let weapons = $state("");
  let notes = $state("");
  let pickedTraits = $state<string[]>([]);
  let customTraitName = $state("");
  let customTraitDescription = $state("");
  let showCustom = $state(false);
  const knownTraits = [...new Map(CORE_COMBAT_STYLES.flatMap(style => style.traits).map(trait => [trait.id, trait])).values()];
  const results = $derived(CORE_COMBAT_STYLES.filter(style =>
    `${style.name} ${style.weapons.map(weapon => weapon.name).join(" ")} ${style.traits.map(trait => trait.displayName).join(" ")} ${style.source.libraryName} ${style.searchable.join(" ")}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  function create() {
    const traits: CombatStyleTrait[] = [
      ...knownTraits.filter(trait => pickedTraits.includes(trait.id)),
      ...(customTraitName.trim() ? [{ id: `custom:trait:${encodeURIComponent(customTraitName.trim().toLocaleLowerCase())}`,
        name: customTraitName.trim(), displayName: customTraitName.trim(), ...(customTraitDescription.trim() ? { description: customTraitDescription.trim() } : {}),
        source: { libraryId: "custom-campaign", libraryName: "Custom / Campaign" } }] : []),
    ];
    if (!name.trim()) return;
    onchoose(customCombatStyle(name, weapons.split(","), traits, notes));
    showCustom = false;
  }
</script>

<div class="combat-style-chooser">
  <p class="label">Combat Style · STR + DEX</p>
  <div class="choice-list">
    <button type="button" class="secondary" onclick={() => { showCustom = false; query = ""; }}>Choose Preset</button>
    <button type="button" class="secondary" onclick={() => showCustom = !showCustom}>Create Custom Style</button>
    {#if selectedName}<button type="button" class="secondary" onclick={() => onchoose(null)}>Clear selection</button>{/if}
  </div>
  {#if !showCustom}
    <label class="field"><span>Search Core Mythras presets</span><input class="wide" bind:value={query} placeholder="Search styles, weapons, or traits"></label>
    {#if results.length}
      <div class="choice-list" aria-label="Core Mythras Combat Style presets">
        {#each results as style (style.id)}
          <button type="button" class="secondary" aria-pressed={selectedName === style.name} onclick={() => onchoose(style)}>
            <b>{style.name}</b><br>
            Weapons: {style.weapons.map(weapon => weapon.name).join(", ")}<br>
            Traits: {style.traits.map(trait => trait.displayName).join(", ")} · {style.source.libraryName}
          </button>
        {/each}
      </div>
    {:else}<p class="hint">No matching core presets. Create a campaign style if needed.</p>{/if}
    {#if styles.length}
      <p class="label">Existing character styles</p>
      <div class="choice-list" aria-label="Existing character Combat Styles">
        {#each styles as style (style.id)}
          <button type="button" class="secondary" aria-pressed={selectedName === style.name} onclick={() => onchoose(style)}>
            <b>{style.name}</b><br>
            Weapons: {style.weapons.map(weapon => weapon.name).join(", ") || "not recorded"}<br>
            Traits: {style.traits.map(trait => trait.displayName).join(", ") || "none recorded"} · {style.source.libraryName}
          </button>
        {/each}
      </div>
    {/if}
    <p class="hint">Core presets are examples, not an exhaustive catalogue. You can create campaign styles at any time.</p>
  {:else}
    <div class="choice-list">
      <label class="field"><span>Style Name</span><input class="wide" bind:value={name}></label>
      <label class="field"><span>Weapons (comma separated names)</span><input class="wide" bind:value={weapons} placeholder="Spear, shield"></label>
      <fieldset><legend>Known traits</legend>
        {#each knownTraits as trait (trait.id)}
          <label><input type="checkbox" checked={pickedTraits.includes(trait.id)} onchange={event => pickedTraits = event.currentTarget.checked ? [...pickedTraits, trait.id] : pickedTraits.filter(id => id !== trait.id)}>{trait.displayName}</label>
        {/each}
      </fieldset>
      <label class="field"><span>Custom campaign trait (optional)</span><input class="wide" bind:value={customTraitName}></label>
      {#if customTraitName.trim()}<label class="field"><span>Trait description (optional)</span><textarea class="wide" bind:value={customTraitDescription}></textarea></label>{/if}
      <label class="field"><span>Notes (optional)</span><textarea class="wide" bind:value={notes}></textarea></label>
      <button type="button" disabled={!name.trim()} onclick={create}>Use Custom Style</button>
    </div>
  {/if}
</div>
