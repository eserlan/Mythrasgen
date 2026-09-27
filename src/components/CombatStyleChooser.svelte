<script lang="ts">
  import { tick } from "svelte";
  import { CORE_COMBAT_STYLES, customCombatStyle, type CharacterCombatStyle, type CombatStyleSelection, type CombatStyleTrait } from "../lib/combat-styles";

  let { selectedName = "", styles = [], onchoose }: { selectedName?: string; styles?: CharacterCombatStyle[]; onchoose: (style: CombatStyleSelection | null) => void } = $props();
  let dialog: HTMLDialogElement;
  let searchInput = $state<HTMLInputElement>();
  let query = $state("");
  let name = $state("");
  let weapons = $state("");
  let notes = $state("");
  let pickedTraits = $state<string[]>([]);
  let customTraitName = $state("");
  let customTraitDescription = $state("");
  let editingCustom = $state(false);
  const knownTraits = [...new Map(CORE_COMBAT_STYLES.flatMap(style => style.traits).map(trait => [trait.id, trait])).values()];
  const knownStyles = $derived([
    ...CORE_COMBAT_STYLES,
    ...styles.filter(style => !CORE_COMBAT_STYLES.some(preset => preset.id === style.id)),
  ]);
  const results = $derived(knownStyles.filter(style =>
    `${style.name} ${style.weapons.map(weapon => weapon.name).join(" ")} ${style.traits.map(trait => trait.displayName).join(" ")} ${style.source.libraryName} ${style.source.reference ?? ""} ${"searchable" in style ? style.searchable.join(" ") : ""}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const selected = $derived(styles.find(style => style.name === selectedName)
    ?? CORE_COMBAT_STYLES.find(style => style.name === selectedName));
  const selectedTraits = $derived(selected?.traits.map(trait => trait.displayName).join(" / ") ?? "");

  async function openPicker() {
    editingCustom = false;
    query = "";
    dialog.showModal();
    await tick();
    searchInput?.focus();
  }

  function choose(style: CombatStyleSelection) {
    onchoose(style);
    dialog.close();
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
      {#if selectedTraits}<p><b>Suggested Trait:</b> {selectedTraits}</p>{/if}
      <div class="combat-style-actions">
        <button type="button" class="ghost" onclick={openPicker}>Change</button>
        <button type="button" class="ghost" onclick={remove}>Remove</button>
      </div>
    </div>
  {/if}
</section>

<dialog class="combat-style-dialog" bind:this={dialog} aria-labelledby="combat-style-dialog-title" onclose={() => editingCustom = false}>
  {#if editingCustom}
    <form class="combat-style-editor" onsubmit={event => { event.preventDefault(); create(); }}>
      <h2 id="combat-style-dialog-title">Create a Custom Combat Style</h2>
      <label class="field"><span>Style Name</span><input class="wide" bind:value={name} required></label>
      <label class="field"><span>Weapons (comma separated names)</span><input class="wide" bind:value={weapons} placeholder="Spear, shield"></label>
      <fieldset><legend>Suggested traits</legend>
        {#each knownTraits as trait (trait.id)}
          <label><input type="checkbox" checked={pickedTraits.includes(trait.id)} onchange={event => pickedTraits = event.currentTarget.checked ? [...pickedTraits, trait.id] : pickedTraits.filter(id => id !== trait.id)}>{trait.displayName}</label>
        {/each}
      </fieldset>
      <label class="field"><span>Custom trait (optional)</span><input class="wide" bind:value={customTraitName}></label>
      {#if customTraitName.trim()}<label class="field"><span>Trait description (optional)</span><textarea class="wide" bind:value={customTraitDescription}></textarea></label>{/if}
      <label class="field"><span>Notes (optional)</span><textarea class="wide" bind:value={notes}></textarea></label>
      <div class="combat-style-actions"><button type="submit" class="primary">Save Custom Style</button><button type="button" class="secondary" onclick={() => dialog.close()}>Cancel</button></div>
    </form>
  {:else}
    <div class="combat-style-dialog-content">
      <header class="combat-style-dialog-heading">
        <div><h2 id="combat-style-dialog-title">Choose a Combat Style</h2><button type="button" class="ghost combat-style-close" aria-label="Close combat style picker" onclick={() => dialog.close()}>Close</button></div>
        <label class="field"><span>Search combat styles…</span><input bind:this={searchInput} class="wide" bind:value={query} placeholder="Name, weapon, or trait"></label>
      </header>
      <div class="combat-style-results" aria-label="Combat styles">
        {#each results as style (style.id)}
          <article class="combat-style-result">
            <h3>{style.name}</h3>
            <dl>
              <div><dt>Weapons</dt><dd>{style.weapons.map(weapon => weapon.name).join(" · ") || "None recorded"}</dd></div>
              <div><dt>Suggested Traits</dt><dd>{style.traits.map(trait => trait.displayName).join(" / ") || "None recorded"}</dd></div>
            </dl>
            <small class="combat-style-source">{style.source.libraryName}{#if style.source.reference} · {style.source.reference}{/if}</small>
            <button type="button" class="primary" onclick={() => choose(style)}>Select</button>
          </article>
        {:else}<p class="hint">No matching combat styles.</p>{/each}
      </div>
      <div class="combat-style-dialog-footer"><button type="button" class="secondary" onclick={() => { editingCustom = true; }}>Create Custom</button><button type="button" class="secondary" onclick={() => dialog.close()}>Cancel</button></div>
    </div>
  {/if}
</dialog>
