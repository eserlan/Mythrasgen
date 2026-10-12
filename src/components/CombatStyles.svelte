<script lang="ts">
  import { char, combatStyleSummary } from "../lib/store.svelte";
  import { CORE_COMBAT_STYLE_WEAPONS, resolveCoreCombatStyleWeapon } from "../lib/weapons";
  import SkillInfo from "./SkillInfo.svelte";

  const styles = $derived(combatStyleSummary());
  let editing = $state<string[]>([]);
  let weaponQueries = $state<Record<string, string>>({});
  let weaponPicks = $state<Record<string, string>>({});
  let customWeapons = $state<Record<string, string>>({});
  const originLabel = (origin: string) => ({ culture: "Culture", career: "Career", bonus: "Bonus Skills", custom: "Custom", legacy: "Legacy save" }[origin] ?? origin);
  const referenceLabel = (reference: string | undefined) => reference
    ?.replace("Mythras Core Rules, 3rd edition: ", "")
    .replace(/Sample Combat Styles \(Characters, p\. (\d+)\)/, "Sample Combat Styles, p. $1") ?? "";

  function toggleEdit(styleId: string) {
    editing = editing.includes(styleId) ? editing.filter(id => id !== styleId) : [...editing, styleId];
  }

  function addWeapon(styleId: string, catalogueId?: string) {
    const style = char.combatStyles.find(item => item.id === styleId);
    const record = catalogueId ? CORE_COMBAT_STYLE_WEAPONS.find(item => item.id === catalogueId) : undefined;
    const name = record?.name ?? customWeapons[styleId]?.trim();
    if (!style || !name || style.weapons.some(weapon =>
      (record && weapon.catalogueId === record.id) || weapon.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    style.weapons.push(record ? { name, catalogueId: record.id } : { name });
    if (record) weaponPicks[styleId] = "";
    else customWeapons[styleId] = "";
  }

  function removeWeapon(styleId: string, index: number) {
    char.combatStyles.find(item => item.id === styleId)?.weapons.splice(index, 1);
  }

  function matchingWeapons(styleId: string) {
    const query = weaponQueries[styleId]?.trim().toLocaleLowerCase() ?? "";
    return CORE_COMBAT_STYLE_WEAPONS.filter(record => !query || `${record.name} ${record.category}`.toLocaleLowerCase().includes(query));
  }
</script>

{#if styles.length}
  <div class="combat-style-list">
    {#each styles as style (style.id)}
      <section class="card combat-style" aria-label={`Combat Style ${style.name}`}>
        <header class="combat-style-heading">
          <div class="combat-style-title"><h3><SkillInfo name={`Combat Style (${style.name})`} /></h3><p class="combat-style-source">{style.source.libraryName}{#if referenceLabel(style.source.reference)} · {referenceLabel(style.source.reference)}{/if}</p></div>
          <b class="combat-percentage">{style.percentage}%</b>
        </header>
        <p class="combat-origin"><b>Origin:</b> {style.origins.map(originLabel).join(", ")}</p>

        <div class="combat-style-section">
          <b>Weapons</b>
          {#if style.weapons.length}
            <ul class="combat-weapons" aria-label={`${style.name} weapons`}>
              {#each style.weapons as weapon, index (`${style.id}:${weapon.catalogueId ?? index}:${index}`)}
                {@const record = resolveCoreCombatStyleWeapon(weapon.catalogueId, weapon.name)}
                <li><span>{record?.name ?? weapon.name}</span>{#if editing.includes(style.id)}<button class="secondary combat-remove-weapon" type="button" aria-label={`Remove ${weapon.name} from ${style.name}`} onclick={() => removeWeapon(style.id, index)}>Remove</button>{/if}</li>
              {/each}
            </ul>
          {:else}<p class="mute">No weapons recorded.</p>{/if}
        </div>

        <div class="combat-style-section">
          <b>Traits</b>
          {#if style.traits.length}
            <ul class="combat-traits">{#each style.traits as trait (trait.id)}
              <li><details><summary>{trait.displayName}</summary><div class="combat-trait-detail">{#if trait.description}<p>{trait.description}</p>{/if}<small>{trait.source.libraryName}{#if referenceLabel(trait.source.reference)} · {referenceLabel(trait.source.reference)}{/if}</small></div></details></li>
            {/each}</ul>
          {:else}<span class="mute">None recorded.</span>{/if}
        </div>
        {#if style.notes}<p class="combat-style-notes"><b>Notes:</b> {style.notes}</p>{/if}

        <div class="combat-style-actions noprint">
          <button class="secondary" type="button" aria-expanded={editing.includes(style.id)} aria-controls={`combat-style-edit-${style.id}`} onclick={() => toggleEdit(style.id)}>{editing.includes(style.id) ? "Done editing" : "Edit style"}</button>
        </div>
        {#if editing.includes(style.id)}
          <section class="combat-style-edit" id={`combat-style-edit-${style.id}`} aria-label={`Edit ${style.name} weapons`}>
            <h4>Edit weapons</h4>
            <label class="field"><span>Search Core catalogue</span><input bind:value={weaponQueries[style.id]} type="search" placeholder="Search weapons and shields"></label>
            <div class="combat-style-add-row">
              <label class="field"><span>Core weapon or shield</span><select bind:value={weaponPicks[style.id]}>
                <option value="">Choose from catalogue</option>
                {#each matchingWeapons(style.id) as weapon (weapon.id)}<option value={weapon.id}>{weapon.name} · {weapon.category.replaceAll("_", " ")}</option>{/each}
              </select></label>
              <button type="button" disabled={!weaponPicks[style.id]} onclick={() => addWeapon(style.id, weaponPicks[style.id])}>Add catalogue weapon</button>
            </div>
            <form class="combat-style-add-row" onsubmit={event => { event.preventDefault(); addWeapon(style.id); }}>
              <label class="field"><span>Custom weapon name</span><input bind:value={customWeapons[style.id]} placeholder="Enter any weapon name"></label>
              <button type="submit" disabled={!customWeapons[style.id]?.trim()}>Add custom weapon</button>
            </form>
          </section>
        {/if}
      </section>
    {/each}
  </div>
{:else}
  <div class="card"><p>No Combat Styles recorded for this character. Choose or create one on the Culture, Career, or Bonus Skills page.</p></div>
{/if}

<style>
  .combat-style-list { display: grid; gap: .55rem; min-width: 0; }
  .combat-style { display: grid; gap: .4rem; min-width: 0; margin: 0; padding: .7rem .85rem; }
  .combat-style-heading { position: static; display: flex; justify-content: space-between; align-items: center; gap: .75rem; min-width: 0; max-width: none; margin: 0; padding: 0; border: 0; background: none; backdrop-filter: none; }
  .combat-style-title { min-width: 0; }
  .combat-style-title h3 { margin: 0; overflow-wrap: anywhere; }
  .combat-style-source { margin: .1rem 0 0; color: var(--mute); font-size: .75rem; overflow-wrap: anywhere; }
  .combat-percentage { flex: none; color: var(--bronze); font: 700 1.5rem/1 var(--display); }
  .combat-origin,.combat-style-notes { margin: 0; font-size: .83rem; }
  .combat-style-section { display: grid; grid-template-columns: 4.3rem minmax(0,1fr); align-items: start; gap: .4rem; min-width: 0; font-size: .83rem; }
  .combat-style-section > b { color: var(--mute); }
  .combat-weapons,.combat-traits { display: flex; flex-wrap: wrap; gap: .3rem; min-width: 0; margin: 0; padding: 0; list-style: none; }
  .combat-weapons li { display: inline-flex; align-items: center; gap: .3rem; max-width: 100%; border: 1px solid var(--line); border-radius: 999px; padding: .1rem .5rem; overflow-wrap: anywhere; }
  .combat-traits li { max-width: 100%; }
  .combat-traits details { border: 1px solid var(--line); border-radius: 999px; padding: .1rem .5rem; }
  .combat-traits summary { cursor: pointer; overflow-wrap: anywhere; }
  .combat-traits summary:focus-visible,.combat-style button:focus-visible { outline: 2px solid var(--bronze); outline-offset: 2px; }
  .combat-trait-detail { max-width: 62ch; padding: .25rem .1rem; }
  .combat-trait-detail p { margin: .25rem 0; line-height: 1.45; }
  .combat-trait-detail small { color: var(--mute); }
  .combat-style-actions { display: flex; justify-content: flex-end; }
  .combat-style-actions button,.combat-remove-weapon { padding: .25rem .55rem; font-size: .78rem; }
  .combat-style-edit { display: grid; gap: .55rem; min-width: 0; border-top: 1px solid var(--line); padding-top: .65rem; }
  .combat-style-edit h4 { margin: 0; }
  .combat-style-add-row { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: end; gap: .5rem; min-width: 0; }
  .combat-style-add-row .field { min-width: 0; margin: 0; }
  .combat-style-add-row input,.combat-style-add-row select { max-width: 100%; }
  .combat-style-edit > .field { margin: 0; }
  .combat-style .mute { margin: 0; }
  @media (max-width: 560px) {
    .combat-style { padding: .6rem; }
    .combat-style-section { grid-template-columns: minmax(0,1fr); gap: .15rem; }
    .combat-style-add-row { grid-template-columns: minmax(0,1fr); }
    .combat-style-add-row button { justify-self: start; }
  }
</style>
