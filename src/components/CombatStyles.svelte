<script lang="ts">
  import { combatStyleSummary } from "../lib/store.svelte";
  import { resolveCoreCombatStyleWeapon } from "../lib/weapons";
  import SkillInfo from "./SkillInfo.svelte";

  const styles = $derived(combatStyleSummary());
  const originLabel = (origin: string) => ({ culture: "Culture", career: "Career", bonus: "Bonus Skills", custom: "Custom", legacy: "Legacy save" }[origin] ?? origin);
  const referenceLabel = (reference: string | undefined) => reference
    ?.replace("Mythras Core Rules, 3rd edition: ", "")
    .replace(/Sample Combat Styles \(Characters, p\. (\d+)\)/, "Sample Combat Styles, p. $1") ?? "";
</script>

{#if styles.length}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="style-list" role="region" aria-label="Combat styles" tabindex="0">
    {#each styles as style (style.id)}
      <article class="style-card">
        <header class="style-heading">
          <h4><SkillInfo name={`Combat Style (${style.name})`} /></h4>
          <span class="percentage">{style.percentage}%</span>
        </header>
        <p class="style-source">{style.source.libraryName}{#if referenceLabel(style.source.reference)} · {referenceLabel(style.source.reference)}{/if}</p>
        <dl class="style-facts">
          <div><dt>Associated weapons</dt><dd>{#if style.weapons.length}{style.weapons.map(weapon => resolveCoreCombatStyleWeapon(weapon.catalogueId, weapon.name)?.name ?? weapon.name).join(", ")}{:else}<span class="mute">None recorded</span>{/if}</dd></div>
          <div><dt>Origin</dt><dd>{style.origins.map(originLabel).join(", ")}</dd></div>
        </dl>
        <div class="style-traits"><h5>Traits</h5>
          {#if style.traits.length}<ul>{#each style.traits as trait (trait.id)}<li><details><summary>{trait.displayName}</summary>{#if trait.description}<p>{trait.description}</p>{/if}<small>{trait.source.libraryName}{#if referenceLabel(trait.source.reference)} · {referenceLabel(trait.source.reference)}{/if}</small></details></li>{/each}</ul>{:else}<span class="mute">None recorded</span>{/if}
        </div>
        {#if style.notes}<p class="style-notes"><b>Notes:</b> {style.notes}</p>{/if}
      </article>
    {/each}
  </div>
{:else}<p class="mute">No Combat Styles recorded.</p>{/if}

<style>
  .style-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:6px;max-width:100%;min-width:0;overflow-wrap:break-word}
  .style-card{min-width:0;padding:7px 8px;border:1px solid var(--line);background:color-mix(in srgb,var(--card2) 65%,transparent)}
  .style-heading{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}
  .style-heading h4{min-width:0;margin:0;font:700 .82rem/1.25 var(--display);overflow-wrap:break-word;word-break:normal}
  .style-heading h4 :global(.skill-info){min-width:0;overflow-wrap:break-word;word-break:normal}
  .style-heading h4 :global(.skill-info-name){overflow-wrap:break-word;word-break:normal}
  .percentage{flex:none;color:var(--bronze);font:700 .85rem var(--display);font-variant-numeric:tabular-nums;white-space:nowrap}
  .style-source{margin:2px 0 5px;color:var(--mute);font-size:.66rem;line-height:1.3;overflow-wrap:break-word}
  .style-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:4px 10px;margin:0}
  .style-facts>div{min-width:0;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px;align-items:baseline;font-size:.72rem;line-height:1.3}
  .style-facts dt,.style-traits h5{color:var(--mute);font:700 .61rem var(--display);letter-spacing:.06em;text-transform:uppercase}
  .style-facts dd{min-width:0;margin:0;overflow-wrap:break-word;word-break:normal}
  .style-traits{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:baseline;gap:5px;margin-top:4px}
  .style-traits h5{margin:0}
  .style-traits ul{display:flex;flex-wrap:wrap;gap:3px;min-width:0;list-style:none;padding:0;margin:0}
  .style-traits details{min-width:0;border:1px solid var(--line);padding:1px 4px;font-size:.68rem;line-height:1.3}
  .style-traits summary{cursor:pointer;overflow-wrap:break-word;word-break:normal}
  .style-traits details[open]{flex:1 1 100%;padding:4px 6px}
  .style-traits details p,.style-notes{margin:3px 0 0;font-size:.72rem;line-height:1.35;overflow-wrap:break-word}
  .style-traits details small{display:block;margin-top:2px;color:var(--mute);font-size:.64rem}
  .style-notes{padding-top:4px;border-top:1px dotted var(--line)}
  @media(max-width:560px){.style-list{grid-template-columns:minmax(0,1fr)}.style-facts>div{grid-template-columns:minmax(0,1fr)}.style-traits{grid-template-columns:minmax(0,1fr)}}
  @media print{.style-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.style-card{break-inside:avoid}.style-traits details:not([open])>p,.style-traits details:not([open])>small{display:none}}
</style>
