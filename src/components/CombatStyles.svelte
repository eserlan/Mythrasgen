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
  <div class="sheet-table-wrap"><table class="style-table">
    <thead><tr><th scope="col">Style</th><th scope="col">%</th><th scope="col">Associated weapons</th><th scope="col">Traits</th><th scope="col">Origin &amp; notes</th></tr></thead>
    <tbody>{#each styles as style (style.id)}
      <tr>
        <th scope="row"><SkillInfo name={`Combat Style (${style.name})`} /><small>{style.source.libraryName}{#if referenceLabel(style.source.reference)} · {referenceLabel(style.source.reference)}{/if}</small></th>
        <td class="percentage">{style.percentage}%</td>
        <td>{#if style.weapons.length}{style.weapons.map(weapon => resolveCoreCombatStyleWeapon(weapon.catalogueId, weapon.name)?.name ?? weapon.name).join(", ")}{:else}<span class="mute">None recorded</span>{/if}</td>
        <td>{#if style.traits.length}<ul>{#each style.traits as trait (trait.id)}<li><details><summary>{trait.displayName}</summary>{#if trait.description}<p>{trait.description}</p>{/if}<small>{trait.source.libraryName}{#if referenceLabel(trait.source.reference)} · {referenceLabel(trait.source.reference)}{/if}</small></details></li>{/each}</ul>{:else}<span class="mute">None recorded</span>{/if}</td>
        <td><span>{style.origins.map(originLabel).join(", ")}</span>{#if style.notes}<p>{style.notes}</p>{/if}</td>
      </tr>
    {/each}</tbody>
  </table></div>
{:else}<p class="mute">No Combat Styles recorded.</p>{/if}

<style>
  .style-table{min-width:620px}.style-table th:first-child{white-space:normal}.style-table th small{display:block;color:var(--mute);font-weight:400;white-space:normal;margin-top:2px}.style-table .percentage{font:700 .82rem var(--display);color:var(--bronze);white-space:nowrap}.style-table ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:3px}.style-table details{border:1px solid var(--line);padding:2px 4px}.style-table summary{cursor:pointer}.style-table details p,.style-table td p{margin:3px 0}.style-table td{overflow-wrap:anywhere}
  @media print{.style-table{min-width:0}.style-table details:not([open])>p,.style-table details:not([open])>small{display:none}}
</style>
