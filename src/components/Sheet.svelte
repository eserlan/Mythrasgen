<script lang="ts">
  import { deriveStats, passionStartingValue } from "../lib/calc";
  import { AGE_CATEGORIES, RESISTANCES, STATS, STAT_NAMES } from "../lib/rules";
  import { allSkills, career, char, culture, skillDefinition, socialClassReady, startingMoney, total } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  import HitLocations from "./HitLocations.svelte";
  import StepHead from "./StepHead.svelte";
  import CombatStyles from "./CombatStyles.svelte";
  import { CONNECTIONS, FAMILY_STANDING, resolvedBackgroundEvents, resolveBackgroundEvent, tableResult } from "../lib/background-rules";
  import { formatFamilyRelationships } from "../lib/family-relationships";
  import SkillInfo from "./SkillInfo.svelte";
  import { formatCopperPrice } from "../lib/equipment-catalogue";
  import { sheetEquipmentSummary } from "../lib/sheet-equipment";
  import { ARMOUR_MATERIALS, ARMOUR_CONSTRUCTIONS, HIT_LOCATIONS } from "../lib/armour-rules";
  const loc = $derived(deriveStats(char.chars).loc);
  const skills = $derived(allSkills().sort());
  const std = $derived(skills.filter(n => !skillDefinition(n).pro && !RESISTANCES.includes(n as typeof RESISTANCES[number])));
  const pro = $derived(skills.filter(n => skillDefinition(n).pro));
  const standing = $derived(tableResult(FAMILY_STANDING, char.background.standingRoll));
  const connectionTier = $derived(tableResult(CONNECTIONS, char.background.connectionsRoll));
  const equipment = $derived(sheetEquipmentSummary(char.background.inventory, char.chars.STR,
    startingMoney(), char.background.equipmentTransactions));
  const money = formatCopperPrice;
</script>

<div class="noprint"><StepHead step={8} title="Character sheet" /></div>
<article class="sheet">
  <div class="banner">
    <div class="meander" aria-hidden="true"></div>
    <h1>{char.name || "Unnamed hero"}</h1>
    <p>{#if char.race.trim()}{char.race.trim()} <span>◆</span> {/if}{culture().name} <span>◆</span> {career().name} <span>◆</span> {AGE_CATEGORIES[char.ageCategory].label}, age {char.age}</p>
  </div>
  {#if char.gender.trim() || char.homeland.trim() || char.handedness.trim() || char.description.trim()}
    <div class="card sheet-identity">
      <h3>Identity</h3>
      {#if char.gender.trim() || char.homeland.trim() || char.handedness.trim()}
        <dl class="identity-values">
          {#if char.gender.trim()}<div><dt>Gender</dt><dd>{char.gender.trim()}</dd></div>{/if}
          {#if char.homeland.trim()}<div><dt>Homeland</dt><dd>{char.homeland.trim()}</dd></div>{/if}
          {#if char.handedness.trim()}<div><dt>Handedness</dt><dd>{char.handedness.trim()}</dd></div>{/if}
        </dl>
      {/if}
      {#if char.description.trim()}<p class="identity-description"><b>Description:</b> {char.description.trim()}</p>{/if}
    </div>
  {/if}
  <p class="mute">Background Events: {AGE_CATEGORIES[char.ageCategory].backgroundEvents}{#if AGE_CATEGORIES[char.ageCategory].ageing} · Ageing rules apply{/if}</p>
  <div class="chars sheet-stats">
    {#each STATS as k}<div class="char"><small>{k}</small><b>{char.chars[k]}</b><em>{STAT_NAMES[k]}</em></div>{/each}
  </div>
  <div class="card sheet-body-measurements">
    <h3>Body</h3>
    <p><b>Frame:</b> {char.frame} · <b>Height:</b> {char.height === null ? "—" : `${char.height} cm`} · <b>Weight:</b> {char.weight === null ? "—" : `${char.weight} kg`}</p>
  </div>
  <Derived />
  <div class="card">
    <h3>Background</h3>
    <p><b>Age:</b> {char.age} ({AGE_CATEGORIES[char.ageCategory].label}) · <b>Social class:</b> {socialClassReady() ? char.background.socialClass : "Reconciliation required"}</p>
    {#if socialClassReady()}<p><b>Money modifier:</b> ×{char.background.socialClassMoney} · <b>Background resources:</b> {char.background.socialClassResources}</p>{/if}
    <p><b>Parents:</b> {char.background.parents || "Unrecorded"} · <b>Siblings:</b> {char.background.siblings || "Unrecorded"}</p>
    {#if char.background.extendedFamily}<p><b>Extended family:</b> {char.background.extendedFamily}</p>{/if}
    <p><b>Family standing:</b> {standing[2]} · ties: {formatFamilyRelationships(char.background.relationships, "reputation")} · <b>Connections:</b> {connectionTier[2]} — {formatFamilyRelationships(char.background.relationships, "connections")}</p>
    {#each resolvedBackgroundEvents(char.background.events) as { event, index }}{@const resolvedEvent = resolveBackgroundEvent(event)}<p><b>Background event {index + 1} ({event.source === "rolled" ? `rolled ${event.roll}; ` : ""}{resolvedEvent?.range}):</b> {resolvedEvent?.text}</p>{/each}
    <p><b>Social-class equipment guidance (not an inventory record):</b> {socialClassReady() ? char.background.equipment || "Unrecorded" : "Pending Social Class reconciliation"}</p>
    <p><b>Starting money:</b> {socialClassReady() ? formatCopperPrice(startingMoney() * 10) : "Pending Social Class"}</p>
  </div>
  <section class="card sheet-equipment" aria-labelledby="sheet-equipment-title">
    <h3 id="sheet-equipment-title">Equipment &amp; funds</h3>
    {#if socialClassReady()}
      <div class="sheet-funds">
        <div><small>Starting funds</small><b>{money(equipment.funds.startingCp)}</b></div>
        <div><small>Spent (CP ledger)</small><b>{money(equipment.funds.spentCp)}</b></div>
        <div><small>Remaining (CP ledger)</small><b>{money(equipment.funds.remainingCp)}</b></div>
      </div>
      {#if equipment.funds.remainingCp < 0}<p class="sheet-warning">Ledger balance is below current starting funds; historical transactions are retained.</p>{/if}
    {:else}<p class="sheet-warning">Funds unresolved until Social Class is reconciled.</p>{/if}
    {#if char.background.inventory.length}
      <div class="sheet-table-wrap"><table class="sheet-equipment-table">
        <caption>Owned equipment</caption>
        <thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">State</th><th scope="col">Acquisition</th><th scope="col">ENC</th><th scope="col">Source</th></tr></thead>
        <tbody>{#each char.background.inventory as item (item.id)}
          <tr>
            <th scope="row">{item.name}</th><td>{item.quantity}</td><td>{item.state}</td><td>{item.acquiredAs}</td>
            <td>{#if item.armour}{item.armour.encOverride !== undefined ? `${item.armour.encOverride} per covered location (GM value)` : item.armour.construction && item.armour.material && ARMOUR_CONSTRUCTIONS[item.armour.construction] && ARMOUR_MATERIALS[item.armour.material] ? "Derived" : "Unresolved"}{:else if item.encPerUnit === null}Unresolved{:else}{item.encPerUnit} per item{item.encSource === "gm_override" ? " (GM value)" : ""}{/if}</td>
            <td>{item.sourceIds.length ? item.sourceIds.join(", ") : "Unresolved"}</td>
          </tr>
        {/each}</tbody>
      </table></div>
    {:else}<p class="mute">No owned equipment recorded.</p>{/if}
    <h4>Load &amp; encumbrance</h4>
    <p><b>Load:</b> {equipment.load.load === null ? `At least ${equipment.load.knownLoad} ENC · unresolved` : `${equipment.load.load} ENC`} · <b>Band:</b> {equipment.load.band} · <b>Movement:</b> {equipment.load.movement}</p>
    <p><b>Skill penalty:</b> {equipment.load.skillDifficultyGrades === null ? "Unresolved" : `${equipment.load.skillDifficultyGrades} difficulty grades`} · <b>Sprinting:</b> {equipment.load.sprinting} · <b>Fatigue:</b> {equipment.load.fatigue}</p>
    {#if equipment.load.unresolvedItems.length}<p class="sheet-warning">Load unresolved for: {equipment.load.unresolvedItems.join(", ")}.</p>{/if}
    <h4>Worn armour</h4>
    <div class="sheet-table-wrap"><table class="sheet-armour-table">
      <caption>Armour protection by hit location</caption>
      <thead><tr>{#each HIT_LOCATIONS as location}<th scope="col">{location}</th>{/each}</tr></thead>
      <tbody><tr>{#each HIT_LOCATIONS as location}<td>{equipment.armour.apByLocation[location] === null ? "Unresolved" : `${equipment.armour.apByLocation[location]} AP`}</td>{/each}</tr></tbody>
    </table></div>
    <p><b>Worn armour ENC:</b> {equipment.armour.fullWornEnc ?? "Unresolved"} full · {equipment.armour.loadEnc ?? "Unresolved"} load · <b>Initiative penalty:</b> {equipment.armour.initiativePenalty === null ? "Unresolved" : `−${equipment.armour.initiativePenalty}`}</p>
    <p class="mute">Armour protection and ENC are derived from each piece's construction, material, coverage and fit. The source rules values have not been visually verified against the Core.</p>
    {#if equipment.armour.unresolved.length}<p class="sheet-warning">Armour unresolved: {equipment.armour.unresolved.join("; ")}.</p>{/if}
  </section>
  <div class="two sheet-body">
    <div class="card"><h3>Hit locations</h3><HitLocations {loc} /></div>
    <div class="card">
      <h3>Combat &amp; professional</h3>
      <ul class="leaders">{#each pro as n}<li><span><SkillInfo name={n} /></span><i></i><b>{total(n)}%</b></li>{/each}</ul>
    </div>
  </div>
  <div class="sheet-combat"><h2>Combat</h2><CombatStyles /></div>
  <div class="card">
    <h3>Resistances</h3>
    <ul class="leaders cols">{#each RESISTANCES as n}<li><span><SkillInfo name={n} /></span><i></i><b>{total(n)}%</b></li>{/each}</ul>
  </div>
  <div class="card">
    <h3>Standard skills</h3>
    <ul class="leaders cols">{#each std as n}<li><span><SkillInfo name={n} /></span><i></i><b>{total(n)}%</b></li>{/each}</ul>
  </div>
  {#if char.passionsEnabled && char.passions.length}
    <div class="card sheet-passions">
      <h3>Passions</h3>
      <ul class="leaders cols">{#each char.passions as p}
        {@const startingValue = passionStartingValue(p.category, char.chars, { pow: p.subjectPow, cha: p.subjectCha })}
        <li><span>{p.type} ({p.subject || "unnamed"})</span><i></i><b>{startingValue ?? "—"}{#if startingValue !== null}%{/if}</b></li>
      {/each}</ul>
    </div>
  {/if}
  <p class="foot">Forged at eserlan.github.io/Mythrasgen</p>
</article>
