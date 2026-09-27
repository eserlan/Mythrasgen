<script lang="ts">
  import { char, combatStyleSummary } from "../lib/store.svelte";
  import { resolveWeapon } from "../lib/weapons";

  const styles = $derived(combatStyleSummary());
  let additions = $state<Record<string, string>>({});
  const originLabel = (origin: string) => ({ culture: "Culture", career: "Career", bonus: "Bonus Skills", custom: "Custom", legacy: "Legacy save" }[origin] ?? origin);

  function addWeapon(styleId: string) {
    const name = additions[styleId]?.trim();
    const style = char.combatStyles.find(item => item.id === styleId);
    if (!name || !style || style.weapons.some(weapon => weapon.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    style.weapons.push({ name });
    additions[styleId] = "";
  }

  function removeWeapon(styleId: string, index: number) {
    const style = char.combatStyles.find(item => item.id === styleId);
    style?.weapons.splice(index, 1);
  }
</script>

{#if styles.length}
  {#each styles as style (style.id)}
    <section class="card combat-style" aria-label={`Combat Style ${style.name}`}>
      <header class="combat-style-heading">
        <div><h3>{style.name}</h3><p class="mute">{style.source.libraryName}{#if style.source.reference} · {style.source.reference}{/if}</p></div>
        <b class="combat-percentage">{style.percentage}%</b>
      </header>
      <p class="combat-origin"><b>Origin:</b> {style.origins.map(originLabel).join(", ")}</p>

      <h4>Weapons</h4>
      {#if style.weapons.length}
        <div class="combat-weapons">
          {#each style.weapons as weapon, index (`${style.id}:${index}`)}
            {@const record = resolveWeapon(weapon.catalogueId, weapon.name)}
            <div class="combat-weapon">
              <div class="combat-weapon-name"><b>{record?.name ?? weapon.name}</b>
                {#if !record}<span class="mute">Custom / unlisted weapon</span>{/if}
                <button class="noprint combat-remove-weapon" type="button" aria-label={`Remove ${weapon.name} from ${style.name}`} onclick={() => removeWeapon(style.id, index)}>Remove</button>
              </div>
              {#if record}
                <dl class="weapon-stats">
                  <div><dt>Damage</dt><dd>{record.damage}</dd></div>
                  <div><dt>Size</dt><dd>{record.size}</dd></div>
                  <div><dt>AP / HP</dt><dd>{record.ap} / {record.hp}</dd></div>
                  {#if record.range}<div><dt>Range</dt><dd>{record.range}</dd></div>{/if}
                  {#if record.force}<div><dt>Force</dt><dd>{record.force}</dd></div>{/if}
                  {#if record.load !== undefined}<div><dt>Load</dt><dd>{record.load}</dd></div>{/if}
                  {#if record.impale}<div><dt>Impale size</dt><dd>{record.impale}</dd></div>{/if}
                  {#if record.notes}<div><dt>Notes</dt><dd>{record.notes}</dd></div>{/if}
                </dl>
                <small class="weapon-source">{record.source}</small>
              {/if}
            </div>
          {/each}
        </div>
      {:else}<p class="mute">No weapons recorded.</p>{/if}
      <form class="combat-add-weapon noprint" onsubmit={event => { event.preventDefault(); addWeapon(style.id); }}>
        <label class="field"><span>Add weapon name</span><input bind:value={additions[style.id]} placeholder="Weapon name"></label>
        <button type="submit" disabled={!additions[style.id]?.trim()}>Add weapon</button>
      </form>

      <h4>Combat Style Traits</h4>
      {#if style.traits.length}
        <ul class="combat-traits">{#each style.traits as trait (trait.id)}
          <li><b>{trait.displayName}</b>{#if trait.description}<span> — {trait.description}</span>{/if}
            <small>{trait.source.libraryName}{#if trait.source.reference} · {trait.source.reference}{/if}</small></li>
        {/each}</ul>
      {:else}<p class="mute">No traits recorded.</p>{/if}
      {#if style.notes}<p><b>Notes:</b> {style.notes}</p>{/if}
    </section>
  {/each}
{:else}
  <div class="card"><p>No Combat Styles recorded for this character. Choose or create one on the Culture, Career, or Bonus Skills page.</p></div>
{/if}
