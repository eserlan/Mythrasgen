<script lang="ts">
  import { tick } from "svelte";
  import { CORE_COMBAT_STYLES, CORE_COMBAT_TRAITS, customCombatStyle, resolveCoreCombatStyle, type CharacterCombatStyle, type CombatStyleDefinition, type CombatStyleSelection, type CombatStyleTrait } from "../lib/combat-styles";

  let { selectedName = "", styles = [], onchoose }: { selectedName?: string; styles?: CharacterCombatStyle[]; onchoose: (style: CombatStyleSelection | null) => void } = $props();
  let dialog: HTMLDialogElement;
  let searchInput = $state<HTMLInputElement>();
  let resultsRegion = $state<HTMLDivElement>();
  let resolutionHeading = $state<HTMLHeadingElement>();
  let browseScrollTop = 0;
  let query = $state("");
  let name = $state("");
  let weapons = $state("");
  let notes = $state("");
  let pickedTraits = $state<string[]>([]);
  let expandedTraits = $state<string[]>([]);
  let traitQuery = $state("");
  let customTraitName = $state("");
  let customTraitDescription = $state("");
  let editingCustom = $state(false);
  let pendingStyle = $state<CombatStyleDefinition | null>(null);
  let weaponPicks = $state<number[]>([]);
  let traitPicks = $state<number[]>([]);
  const knownTraits = CORE_COMBAT_TRAITS;
  const filteredTraits = $derived(knownTraits.filter(trait =>
    `${trait.displayName} ${trait.description ?? ""}`.toLocaleLowerCase().includes(traitQuery.trim().toLocaleLowerCase())));
  const pickedCoreTraits = $derived(knownTraits.filter(trait => pickedTraits.includes(trait.id)));
  function toggleTraitDetails(id: string) {
    expandedTraits = expandedTraits.includes(id)
      ? expandedTraits.filter(traitId => traitId !== id)
      : [...expandedTraits, id];
  }
  const styleWeapons = (style: CombatStyleDefinition | CharacterCombatStyle) => [
    ...style.weapons.map(weapon => weapon.name),
    ...("weaponChoices" in style ? (style.weaponChoices ?? []).map(group => group.map(weapon => weapon.name).join(" or ")) : []),
  ];
  const knownStyles = $derived([
    ...CORE_COMBAT_STYLES,
    ...styles.filter(style => !CORE_COMBAT_STYLES.some(preset => preset.id === style.id)),
  ]);
  const results = $derived(knownStyles.filter(style =>
    `${style.name} ${styleWeapons(style).join(" ")} ${styleTraits(style).join(" ")} ${style.source.libraryName} ${style.source.reference ?? ""} ${"searchable" in style ? style.searchable.join(" ") : ""}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const selected = $derived(styles.find(style => style.name === selectedName)
    ?? CORE_COMBAT_STYLES.find(style => style.name === selectedName));
  const selectedTraits = $derived(selected?.traits.map(trait => trait.displayName) ?? []);
  const styleTraits = (style: CombatStyleDefinition | CharacterCombatStyle) => [
    ...style.traits.map(trait => trait.displayName),
    ...("traitChoices" in style ? (style.traitChoices ?? []).map(group => group.map(trait => trait.displayName).join(" or ")) : []),
  ];

  async function openPicker() {
    editingCustom = false;
    pendingStyle = null;
    query = "";
    dialog.showModal();
    await tick();
    searchInput?.focus();
  }

  function choose(style: CombatStyleSelection) {
    onchoose(style);
    dialog.close();
  }

  function chooseExisting(style: CharacterCombatStyle) {
    choose(style);
  }

  function remove() {
    onchoose(null);
  }

  function create() {
    const traits: CombatStyleTrait[] = [
      ...knownTraits.filter(trait => pickedTraits.includes(trait.id)),
      ...(customTraitName.trim() ? [{ id: `custom:trait:${encodeURIComponent(customTraitName.trim().toLocaleLowerCase())}`,
        name: customTraitName.trim(), displayName: customTraitName.trim(), ...(customTraitDescription.trim() ? { description: customTraitDescription.trim() } : {}),
        source: { libraryId: "custom-campaign", libraryName: "Custom / Campaign" } }] : []),
    ];
    if (!name.trim()) return;
    onchoose(customCombatStyle(name, weapons.split(","), traits, notes));
    dialog.close();
  }

  async function choosePreset(style: CombatStyleDefinition) {
    const weaponChoices = style.weaponChoices ?? [];
    const traitChoices = style.traitChoices ?? [];
    if (weaponChoices.length || traitChoices.length) {
      browseScrollTop = resultsRegion?.scrollTop ?? 0;
      pendingStyle = style;
      weaponPicks = weaponChoices.map(() => -1);
      traitPicks = traitChoices.map(() => -1);
      await tick();
      resolutionHeading?.focus();
      return;
    }
    const selection = resolveCoreCombatStyle(style);
    if (selection) choose(selection);
  }

  async function backToBrowse() {
    pendingStyle = null;
    await tick();
    if (resultsRegion) resultsRegion.scrollTop = browseScrollTop;
    searchInput?.focus();
  }

  function confirmPreset() {
    if (!pendingStyle) return;
    const selection = resolveCoreCombatStyle(pendingStyle, weaponPicks, traitPicks);
    if (selection) choose(selection);
  }
</script>

<section class="combat-style-picker" aria-label="Combat Style (optional)">
  {#if !selectedName}
    <p class="label">Combat Style (optional)</p>
    <div class="combat-style-actions">
      <button type="button" class="secondary" onclick={openPicker}>Choose Combat Style…</button>
      <button type="button" class="secondary" onclick={() => { editingCustom = true; dialog.showModal(); }}>Create Custom</button>
    </div>
  {:else}
    <div class="combat-style-summary">
      <div class="combat-style-summary-heading">
        <h3>{selectedName} — {selected?.baseFormula.join(" + ") ?? "STR + DEX"}</h3>
        <small>{selected?.source.libraryName ?? "Custom / Campaign"}{#if selected?.source.reference} · {selected.source.reference}{/if}</small>
      </div>
      {#if selected?.weapons.length}<p>{selected.weapons.map(weapon => weapon.name).join(" · ")}</p>{/if}
      {#if selectedTraits.length}<p><b>{selectedTraits.length === 1 ? "Trait" : "Traits"}:</b> {selectedTraits.join(" / ")}</p>{/if}
      <div class="combat-style-actions">
        <button type="button" class="ghost" onclick={openPicker}>Change</button>
        <button type="button" class="ghost" onclick={remove}>Remove</button>
      </div>
    </div>
  {/if}
</section>

<dialog class="combat-style-dialog" bind:this={dialog} aria-labelledby={pendingStyle ? "combat-style-resolution-title" : "combat-style-dialog-title"} onclose={() => editingCustom = false}>
  {#if editingCustom}
    <form class="combat-style-editor" onsubmit={event => { event.preventDefault(); create(); }}>
      <h2 id="combat-style-dialog-title">Create a Custom Combat Style</h2>
      <label class="field"><span>Style Name</span><input class="wide" bind:value={name} required></label>
      <label class="field"><span>Weapons (comma separated names)</span><input class="wide" bind:value={weapons} placeholder="Spear, shield"></label>
      <section class="trait-picker" aria-labelledby="core-traits-title">
        <h3 id="core-traits-title">Mythras Core traits</h3>
        <label class="field"><span>Search traits…</span><input class="wide" bind:value={traitQuery} placeholder="Trait name or what it does"></label>
        <p class="mute trait-picker-hint">Select any traits allowed by your campaign. Core traits are reference data; they do not automate combat effects.</p>
        <div class="trait-picker-results" aria-label="Mythras Core Combat Style Traits">
          {#each filteredTraits as trait (trait.id)}
            <article class="trait-picker-result">
              <div class="trait-picker-heading">
                <label><input type="checkbox" checked={pickedTraits.includes(trait.id)} onchange={event => pickedTraits = event.currentTarget.checked ? [...pickedTraits, trait.id] : pickedTraits.filter(id => id !== trait.id)}><span><b>{trait.displayName}</b></span></label>
                <button type="button" class="ghost trait-picker-details" aria-expanded={expandedTraits.includes(trait.id)} aria-controls={`core-trait-description-${trait.id}`} onclick={() => toggleTraitDetails(trait.id)}>Details</button>
              </div>
              <div class="trait-picker-description" id={`core-trait-description-${trait.id}`} hidden={!expandedTraits.includes(trait.id)}>{trait.description}</div>
            </article>
          {:else}<p class="hint">No matching Mythras Core traits.</p>{/each}
        </div>
        <div class="picked-traits" aria-live="polite">
          <b>Selected traits ({pickedCoreTraits.length + (customTraitName.trim() ? 1 : 0)})</b>
          {#if pickedCoreTraits.length || customTraitName.trim()}
            <ul>{#each pickedCoreTraits as trait (trait.id)}<li>{trait.displayName} <button type="button" class="ghost" aria-label={`Remove ${trait.displayName}`} onclick={() => pickedTraits = pickedTraits.filter(id => id !== trait.id)}>Remove</button></li>{/each}
              {#if customTraitName.trim()}<li>{customTraitName.trim()} <span class="custom-trait-badge">Custom / Campaign</span></li>{/if}</ul>
          {:else}<p class="mute">No traits selected.</p>{/if}
        </div>
      </section>
      <fieldset class="custom-trait-entry"><legend>Custom Trait (optional) · Custom / Campaign</legend>
        <label class="field"><span>Trait name</span><input class="wide" bind:value={customTraitName}></label>
      {#if customTraitName.trim()}<label class="field"><span>Trait description (optional)</span><textarea class="wide" bind:value={customTraitDescription}></textarea></label>{/if}
      </fieldset>
      <label class="field"><span>Notes (optional)</span><textarea class="wide" bind:value={notes}></textarea></label>
      <div class="combat-style-actions"><button type="submit" class="primary">Save Custom Style</button><button type="button" class="secondary" onclick={() => dialog.close()}>Cancel</button></div>
    </form>
  {:else}
    <div class="combat-style-dialog-content">
      {#if pendingStyle}
        <section class="combat-style-resolution-view" aria-labelledby="combat-style-resolution-title">
          <header class="combat-style-dialog-heading">
            <div><h2 id="combat-style-resolution-title" bind:this={resolutionHeading} tabindex="-1">Resolve {pendingStyle.name}{#if pendingStyle.aliases?.length} / {pendingStyle.aliases.join(" / ")}{/if}</h2><button type="button" class="ghost combat-style-close" aria-label="Close combat style picker" onclick={() => dialog.close()}>Close</button></div>
            <p class="combat-style-resolution-context">
              {[...pendingStyle.weapons.map(weapon => weapon.name), ...(pendingStyle.weaponChoices ?? []).map(group => group.map(weapon => weapon.name).join(" or "))].join(" · ") || "No weapons recorded"}
              {#if pendingStyle.traits.length || pendingStyle.traitChoices?.length}<br><b>Traits:</b> {[...pendingStyle.traits.map(trait => trait.displayName), ...(pendingStyle.traitChoices ?? []).map(group => group.map(trait => trait.displayName).join(" or "))].join(" / ")}{/if}
            </p>
          </header>
          <div class="combat-style-resolution-choices">
            {#each pendingStyle.weaponChoices ?? [] as group, index (index)}
              <label class="field"><span>Choose weapon</span><select class="wide" value={weaponPicks[index]} onchange={event => weaponPicks[index] = Number(event.currentTarget.value)}>
                <option value="-1">Choose one</option>
                {#each group as weapon, optionIndex (weapon.name)}<option value={optionIndex}>{weapon.name}</option>{/each}
              </select></label>
            {/each}
            {#each pendingStyle.traitChoices ?? [] as group, index (index)}
              <label class="field"><span>Choose Trait</span><select class="wide" value={traitPicks[index]} onchange={event => traitPicks[index] = Number(event.currentTarget.value)}>
                <option value="-1">Choose one</option>
                {#each group as trait, optionIndex (trait.id)}<option value={optionIndex}>{trait.displayName}</option>{/each}
              </select></label>
            {/each}
          </div>
          <div class="combat-style-actions"><button type="button" class="primary" disabled={[...weaponPicks, ...traitPicks].some(index => index < 0)} onclick={confirmPreset}>Use Selected Style</button><button type="button" class="secondary" onclick={backToBrowse}>Back</button></div>
        </section>
      {:else}
        <header class="combat-style-dialog-heading">
          <div><h2 id="combat-style-dialog-title">Choose a Combat Style</h2><button type="button" class="ghost combat-style-close" aria-label="Close combat style picker" onclick={() => dialog.close()}>Close</button></div>
          <label class="field"><span>Search combat styles…</span><input bind:this={searchInput} class="wide" bind:value={query} placeholder="Name, weapon, or trait"></label>
        </header>
        <div class="combat-style-main" bind:this={resultsRegion} role="region" aria-label="Combat style results">
        <div class="combat-style-results">
          {#each results as style (style.id)}
            <article class="combat-style-result">
              <h3>{style.name}{#if style.aliases?.length} / {style.aliases.join(" / ")}{/if}</h3>
              <dl>
                <div><dt>Weapons</dt><dd>{styleWeapons(style).join(" · ") || "None recorded"}</dd></div>
                <div><dt>{"searchable" in style ? (styleTraits(style).length === 1 ? "Suggested Trait" : "Suggested Traits") : (style.traits.length === 1 ? "Trait" : "Traits")}</dt><dd>{styleTraits(style).join(" / ") || "None recorded"}</dd></div>
              </dl>
              <small class="combat-style-source">{style.source.libraryName}{#if style.source.reference} · {style.source.reference}{/if}</small>
              <button type="button" class="primary" onclick={() => "searchable" in style ? choosePreset(style) : chooseExisting(style)}>Select</button>
            </article>
          {:else}<p class="hint">No matching combat styles.</p>{/each}
        </div>
        </div>
        <div class="combat-style-dialog-footer"><button type="button" class="secondary" onclick={() => { editingCustom = true; }}>Create Custom</button><button type="button" class="secondary" onclick={() => dialog.close()}>Cancel</button></div>
      {/if}
    </div>
  {/if}
</dialog>
