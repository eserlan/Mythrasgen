<script lang="ts">
  import { deriveStats, passionStartingValue } from "../lib/calc";
  import { AGE_CATEGORIES, MAGIC, RESISTANCES, STATS, STAT_NAMES } from "../lib/rules";
  import { allSkills, career, char, culture, skillDefinition, socialClassReady, startingMoney, total } from "../lib/store.svelte";
  import SkillInfo from "./SkillInfo.svelte";
  import { CONNECTIONS, FAMILY_STANDING, resolvedBackgroundEvents, resolveBackgroundEvent, tableResult } from "../lib/background-rules";
  import { formatFamilyRelationships } from "../lib/family-relationships";
  import { formatCopperPrice, EQUIPMENT_CATALOGUE } from "../lib/equipment-catalogue";
  import { sheetEquipmentSummary } from "../lib/sheet-equipment";
  import { HIT_LOCATIONS } from "../lib/armour-rules";
  import { formatRangedRange, rangedCellText, RANGED_WEAPON_STATS } from "../lib/ranged-weapons";
  import CombatStyles from "./CombatStyles.svelte";

  const derivedStatsResult = $derived(deriveStats(char.chars));
  const loc = $derived(derivedStatsResult.loc);
  const skills: string[] = $derived(allSkills().sort());
  const pro = $derived(skills.filter(n => skillDefinition(n).pro
    && !MAGIC.some(([name]) => n === name || n.startsWith(`${name} (`))
    && !/^(Native Tongue|Language)( \(|$)/.test(n)));
  const magic = $derived(skills.filter(n => MAGIC.some(([name]) => n === name || n.startsWith(`${name} (`))));
  const languages = $derived(skills.filter(n => /^(Native Tongue|Language)( \(|$)/.test(n)));
  const standard = $derived(skills.filter(n => !skillDefinition(n).pro
    && !RESISTANCES.includes(n as typeof RESISTANCES[number])
    && !/^(Native Tongue|Language)( \(|$)/.test(n)));
  const standing = $derived(tableResult(FAMILY_STANDING, char.background.standingRoll));
  const connectionTier = $derived(tableResult(CONNECTIONS, char.background.connectionsRoll));
  const equipment = $derived(sheetEquipmentSummary(char.background.inventory, char.chars.STR,
    startingMoney(), char.background.equipmentTransactions));
  const ownedWeapons = $derived(char.background.inventory.flatMap(item => {
    if (item.armour) return [];
    const record = EQUIPMENT_CATALOGUE.find(row => row.source.id === item.catalogueId);
    const custom = item.customItem;
    const ranged = record?.source.category === "ranged";
    const melee = record ? ["one_handed", "two_handed", "shields"].includes(record.source.category)
      : custom?.type === "weapon" || custom?.type === "shield";
    if (!ranged && !melee) return [];
    return [{ item, source: record?.source, custom, ranged }];
  }));
  const meleeWeapons = $derived(ownedWeapons.filter(row => !row.ranged));
  const rangedWeapons = $derived(ownedWeapons.filter(row => row.ranged));
  const money = formatCopperPrice;
</script>

<div class="noprint"><div class="head"><div class="numeral">IX</div><div><h2>Character sheet</h2><p class="intro">A table-ready reference for {char.name || "your character"}.</p></div></div></div>
<article class="sheet">
  <section class="sheet-page sheet-page-one" aria-label="Page 1: Character and skills">
    <div class="banner">
      <div class="meander" aria-hidden="true"></div>
      <h1>{char.name || "Unnamed hero"}</h1>
      <p>{#if char.race.trim()}{char.race.trim()} <span>◆</span> {/if}{culture().name} <span>◆</span> {career().name}</p>
    </div>

    <div class="sheet-top-grid">
      <section class="sheet-panel sheet-identity" aria-labelledby="sheet-identity-title">
        <h3 id="sheet-identity-title">Identity</h3>
        <dl class="sheet-facts">
          <div><dt>Age</dt><dd>{char.age} · {AGE_CATEGORIES[char.ageCategory].label}</dd></div>
          <div><dt>Social class</dt><dd>{socialClassReady() ? char.background.socialClass : "Reconciliation required"}</dd></div>
          <div><dt>Frame</dt><dd>{char.frame}</dd></div>
          <div><dt>Height</dt><dd>{char.height === null ? "—" : `${char.height} cm`}</dd></div>
          <div><dt>Weight</dt><dd>{char.weight === null ? "—" : `${char.weight} kg`}</dd></div>
          {#if char.gender.trim()}<div><dt>Gender</dt><dd>{char.gender.trim()}</dd></div>{/if}
          {#if char.homeland.trim()}<div><dt>Homeland</dt><dd>{char.homeland.trim()}</dd></div>{/if}
          {#if char.handedness.trim()}<div><dt>Handedness</dt><dd>{char.handedness.trim()}</dd></div>{/if}
        </dl>
        {#if char.description.trim()}<p class="sheet-description"><b>Description:</b> {char.description.trim()}</p>{/if}
        <p class="sheet-small mute">Background Events: {AGE_CATEGORIES[char.ageCategory].backgroundEvents}{#if AGE_CATEGORIES[char.ageCategory].ageing} · Ageing rules apply{/if}</p>
      </section>

      <section class="sheet-panel sheet-background" aria-labelledby="sheet-background-title">
        <h3 id="sheet-background-title">Background &amp; family</h3>
        {#if socialClassReady()}<p><b>Money modifier:</b> ×{char.background.socialClassMoney} · <b>Resources:</b> {char.background.socialClassResources}</p>{/if}
        <p><b>Parents:</b> {char.background.parents || "Unrecorded"} · <b>Siblings:</b> {char.background.siblings || "Unrecorded"}</p>
        {#if char.background.extendedFamily}<p><b>Extended family:</b> {char.background.extendedFamily}</p>{/if}
        <p><b>Family standing:</b> {standing[2]} · ties: {formatFamilyRelationships(char.background.relationships, "reputation")} · <b>Connections:</b> {connectionTier[2]} — {formatFamilyRelationships(char.background.relationships, "connections")}</p>
        {#each resolvedBackgroundEvents(char.background.events) as { event, index }}{@const resolvedEvent = resolveBackgroundEvent(event)}<p><b>Background event {index + 1} ({event.source === "rolled" ? `rolled ${event.roll}; ` : ""}{resolvedEvent?.range}):</b> {resolvedEvent?.text}</p>{/each}
        <p><b>Social-class equipment guidance (not an inventory record):</b> {socialClassReady() ? char.background.equipment || "Unrecorded" : "Pending Social Class reconciliation"}</p>
      </section>
    </div>

    <div class="sheet-primary-grid">
      <section class="sheet-panel" aria-labelledby="sheet-characteristics-title">
        <h3 id="sheet-characteristics-title">Characteristics &amp; derived attributes</h3>
        <div class="sheet-stats">{#each STATS as key}<div><small>{key}</small><b>{char.chars[key]}</b><span>{STAT_NAMES[key]}</span></div>{/each}</div>
        <dl class="sheet-derived">{#each derivedStatsResult.stats as [label, value]}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}</dl>
      </section>
      <section class="sheet-panel sheet-money" aria-labelledby="sheet-money-title">
        <h3 id="sheet-money-title">Money &amp; wealth</h3>
        {#if socialClassReady()}
          <div class="sheet-funds">
            <div><small>Starting funds</small><b>{money(equipment.funds.startingCp)}</b></div>
            <div><small>Spent</small><b>{money(equipment.funds.spentCp)}</b></div>
            <div><small>Remaining</small><b>{money(equipment.funds.remainingCp)}</b></div>
          </div>
          {#if equipment.funds.remainingCp < 0}<p class="sheet-warning">Ledger balance is below current starting funds; historical transactions are retained.</p>{/if}
          <p><b>Starting money:</b> {formatCopperPrice(startingMoney() * 10)}</p>
        {:else}<p class="sheet-warning">Funds unresolved until Social Class is reconciled.</p>{/if}
      </section>
    </div>

    <div class="sheet-skill-grid">
      <section class="sheet-panel"><h3>Standard skills</h3><ul class="sheet-skill-list">{#each standard as name}<li><SkillInfo name={name} /><b>{total(name)}%</b></li>{/each}</ul></section>
      <section class="sheet-panel"><h3>Professional skills</h3><ul class="sheet-skill-list">{#each pro as name}<li><SkillInfo name={name} /><b>{total(name)}%</b></li>{/each}</ul></section>
      <section class="sheet-panel"><h3>Resistances</h3><ul class="sheet-skill-list">{#each RESISTANCES as name}<li><SkillInfo name={name} /><b>{total(name)}%</b></li>{/each}</ul></section>
      {#if magic.length}<section class="sheet-panel"><h3>Magical skills</h3><ul class="sheet-skill-list">{#each magic as name}<li><SkillInfo name={name} /><b>{total(name)}%</b></li>{/each}</ul></section>{/if}
      {#if languages.length}<section class="sheet-panel"><h3>Languages</h3><ul class="sheet-skill-list">{#each languages as name}<li><SkillInfo name={name} /><b>{total(name)}%</b></li>{/each}</ul></section>{/if}
      {#if char.passionsEnabled && char.passions.length}<section class="sheet-panel"><h3>Passions</h3><ul class="sheet-skill-list">{#each char.passions as passion}
        {@const value = passionStartingValue(passion.category, char.chars, { pow: passion.subjectPow, cha: passion.subjectCha })}
        <li><span>{passion.type} ({passion.subject || "unnamed"})</span><b>{value ?? "—"}{#if value !== null}%{/if}</b></li>
      {/each}</ul></section>{/if}
    </div>
  </section>

  <section class="sheet-page sheet-page-two" aria-label="Page 2: Combat and equipment">
    <h2 class="sheet-page-title">Combat &amp; Equipment</h2>
    <div class="sheet-combat-grid">
      <section class="sheet-panel sheet-locations"><h3>Hit locations</h3><div class="sheet-table-wrap"><table><thead><tr><th>d20</th><th>Location</th><th>Max HP</th></tr></thead><tbody>{#each loc as location}<tr><td>{location.roll}</td><th scope="row">{location.name}</th><td>{location.hp}</td></tr>{/each}</tbody></table></div></section>
      <section class="sheet-panel sheet-armour"><h3>Armour by location</h3><div class="sheet-table-wrap"><table><thead><tr><th>Location</th><th>AP</th></tr></thead><tbody>{#each HIT_LOCATIONS as location}<tr><th scope="row">{location}</th><td>{equipment.armour.apByLocation[location] === null ? "Unresolved" : equipment.armour.apByLocation[location]}</td></tr>{/each}</tbody></table></div>
        <p><b>Worn armour ENC:</b> {equipment.armour.fullWornEnc ?? "Unresolved"} full · {equipment.armour.loadEnc ?? "Unresolved"} load · <b>Initiative penalty:</b> {equipment.armour.initiativePenalty === null ? "Unresolved" : `−${equipment.armour.initiativePenalty}`}</p>
        {#if equipment.armour.unresolved.length}<p class="sheet-warning">Armour unresolved: {equipment.armour.unresolved.join("; ")}.</p>{/if}
      </section>
      <section class="sheet-panel sheet-load"><h3>Load &amp; encumbrance</h3>
        <p><b>Load:</b> {equipment.load.load === null ? `At least ${equipment.load.knownLoad} ENC · unresolved` : `${equipment.load.load} ENC`} · <b>Band:</b> {equipment.load.band} · <b>Movement:</b> {equipment.load.movement}</p>
        <p><b>Skill penalty:</b> {equipment.load.skillDifficultyGrades === null ? "Unresolved" : `${equipment.load.skillDifficultyGrades} difficulty grades`} · <b>Sprinting:</b> {equipment.load.sprinting} · <b>Fatigue:</b> {equipment.load.fatigue}</p>
        {#if equipment.load.unresolvedItems.length}<p class="sheet-warning">Load unresolved for: {equipment.load.unresolvedItems.join(", ")}.</p>{/if}
      </section>
      <section class="sheet-panel sheet-styles"><h3>Combat styles</h3><CombatStyles /></section>
    </div>

    <div class="sheet-weapon-grid">
      <section class="sheet-panel"><h3>Melee weapons &amp; shields</h3>
        {#if meleeWeapons.length}<div class="sheet-table-wrap"><table><thead><tr><th>Owned item</th><th>Qty</th><th>Damage</th><th>Size</th><th>Reach</th><th>AP / HP</th><th>ENC</th></tr></thead><tbody>{#each meleeWeapons as row (row.item.id)}
          <tr><th scope="row">{row.item.name}</th><td>{row.item.quantity}</td><td>{row.source?.combat_profile_candidate?.damage ?? row.custom?.damage ?? "—"}</td><td>{row.source?.combat_profile_candidate?.size ?? row.custom?.size ?? "—"}</td><td>{row.source?.combat_profile_candidate?.reach ?? row.custom?.reach ?? "—"}</td><td>{row.source?.ap_candidate ?? row.source?.ap ?? row.custom?.ap ?? "—"} / {row.source?.hp_candidate ?? row.custom?.hp ?? "—"}</td><td>{row.item.encPerUnit === null ? "Unresolved" : row.item.encPerUnit}</td></tr>
        {/each}</tbody></table></div>{:else}<p class="mute">No owned melee weapons or shields recorded.</p>{/if}
      </section>
      <section class="sheet-panel"><h3>Ranged weapons</h3>
        {#if rangedWeapons.length}<div class="sheet-table-wrap"><table><thead><tr><th>Owned item</th><th>Qty</th><th>Damage</th><th>Range</th><th>Load</th><th>AP / HP</th><th>ENC</th></tr></thead><tbody>{#each rangedWeapons as row (row.item.id)}
          {@const stats = row.source ? RANGED_WEAPON_STATS[row.source.id] : undefined}
          <tr><th scope="row">{row.item.name}</th><td>{row.item.quantity}</td><td>{stats ? rangedCellText(stats.damage) : row.custom?.damage ?? "—"}</td><td>{stats ? formatRangedRange(stats.range) : row.source?.combat_profile_candidate?.reach ?? row.custom?.reach ?? "—"}</td><td>{stats ? rangedCellText(stats.load) : "—"}</td><td>{stats ? `${rangedCellText(stats.ap)} / ${rangedCellText(stats.hp)}` : `${row.custom?.ap ?? "—"} / ${row.custom?.hp ?? "—"}`}</td><td>{row.item.encPerUnit === null ? "Unresolved" : row.item.encPerUnit}</td></tr>
        {/each}</tbody></table></div>{:else}<p class="mute">No owned ranged weapons recorded.</p>{/if}
      </section>
    </div>

    <section class="sheet-panel sheet-owned"><h3>Owned equipment</h3>
      {#if char.background.inventory.length}<div class="sheet-table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>State</th><th>Acquisition</th><th>ENC</th><th>Source</th></tr></thead><tbody>{#each char.background.inventory as item (item.id)}
        <tr><th scope="row">{item.name}</th><td>{item.quantity}</td><td>{item.state}</td><td>{item.acquiredAs}</td>
          <td>{#if item.armour}{item.armour.encOverride !== undefined ? `${item.armour.encOverride} per covered location (GM value)` : item.armour.construction && item.armour.material ? "Derived" : "Unresolved"}{:else if item.encPerUnit === null}Unresolved{:else}{item.encPerUnit} per item{item.encSource === "gm_override" ? " (GM value)" : ""}{/if}</td>
          <td>{item.customItem ? `Custom · ${item.customItem.type}` : item.sourceIds.length ? item.sourceIds.join(", ") : "Unresolved"}</td></tr>
      {/each}</tbody></table></div>{:else}<p class="mute">No owned equipment recorded.</p>{/if}
        <p class="sheet-small mute">Armour protection and ENC use recorded construction, material, coverage and fit. Source rules values have not been visually verified against the Core.</p>
    </section>
    <p class="foot">Forged at eserlan.github.io/Mythrasgen</p>
  </section>
</article>

<style>
  .sheet{margin-top:8px;display:grid;gap:18px}.sheet-page{min-width:0;background:var(--card);border:1px solid var(--line2);padding:12px;box-shadow:var(--shadow)}
  .sheet-page-one,.sheet-page-two{display:grid;align-content:start;gap:10px}.banner{text-align:center;padding:2px 0}.banner h1{font-size:clamp(1.7rem,4vw,2.4rem);text-transform:uppercase;letter-spacing:.12em;margin:5px 0;color:var(--fg)}.banner p{margin:0;color:var(--bronze);font:700 .78rem var(--display);letter-spacing:.1em;text-transform:uppercase}.banner p span{font-size:.58rem;margin:0 5px}
  .sheet-top-grid{display:grid;grid-template-columns:minmax(230px,.9fr) minmax(0,1.7fr);gap:8px}.sheet-primary-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(210px,.8fr);gap:8px}.sheet-skill-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:start}
  .sheet-panel{min-width:0;border:1px solid var(--line);padding:8px;background:color-mix(in srgb,var(--card) 88%,var(--bg2))}.sheet-panel h3{font-size:.75rem;margin:0 0 6px}.sheet-panel p{margin:4px 0;overflow-wrap:anywhere}.sheet-background{font-size:.82rem;line-height:1.35}.sheet-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 8px;margin:0}.sheet-facts div,.sheet-derived div{display:flex;justify-content:space-between;gap:6px;border-bottom:1px dotted var(--line);padding:2px 0}.sheet-facts dt,.sheet-derived dt{color:var(--mute)}.sheet-facts dd,.sheet-derived dd{margin:0;text-align:right;font-weight:700;overflow-wrap:anywhere}.sheet-description{border-top:1px solid var(--line);padding-top:4px;margin-top:5px!important;overflow-wrap:anywhere}.sheet-small{font-size:.72rem}.sheet-stats{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.sheet-stats>div{display:grid;text-align:center;line-height:1.15;border:1px solid var(--line);padding:4px 2px}.sheet-stats small{color:var(--mute);font:700 .58rem var(--display)}.sheet-stats b{font:700 1.2rem var(--display)}.sheet-stats span{font-size:.6rem;overflow-wrap:anywhere}.sheet-derived{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 8px;margin:5px 0 0;font-size:.75rem}.sheet-derived div{display:block}.sheet-derived dd{text-align:left}.sheet-funds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.sheet-funds>div{display:grid;gap:1px;border:1px solid var(--line);padding:5px;min-width:0}.sheet-funds small{font-size:.68rem;color:var(--mute)}.sheet-funds b{overflow-wrap:anywhere}.sheet-warning{border-left:2px solid var(--bronze);padding-left:6px;color:var(--mute);font-size:.78rem}
  .sheet-skill-list{columns:2 160px;column-gap:14px;list-style:none;padding:0;margin:0}.sheet-skill-list li{display:flex;align-items:baseline;gap:4px;break-inside:avoid;padding:1px 0;font-size:.76rem;min-width:0}.sheet-skill-list li :global(.skill-info){min-width:0;overflow-wrap:anywhere}.sheet-skill-list li b{margin-left:auto;white-space:nowrap;font:700 .76rem var(--display)}
  .sheet-page-title{font-size:1.2rem;text-transform:uppercase;color:var(--bronze);border-bottom:1px solid var(--line2);padding-bottom:5px}.sheet-combat-grid{display:grid;grid-template-columns:minmax(160px,.75fr) minmax(190px,.9fr) minmax(230px,1.2fr);gap:8px;align-items:start}.sheet-locations{grid-row:span 2}.sheet-load{grid-column:3}.sheet-styles{grid-column:1/-1}.sheet-weapon-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sheet-table-wrap{max-width:100%;overflow-x:auto}.sheet-panel table{width:100%;border-collapse:collapse;font-size:.72rem;line-height:1.25}.sheet-panel th,.sheet-panel td{border:1px solid var(--line);padding:3px 5px;text-align:left;vertical-align:top}.sheet-panel th[scope=row]{font-weight:700}.sheet-owned{overflow:hidden}.sheet-owned table{font-size:.68rem}.sheet-panel table th{white-space:nowrap}.sheet-owned table th:first-child{white-space:normal}.sheet-owned .sheet-small{margin-top:5px}.foot{text-align:center;color:var(--mute);font-size:.75rem;font-style:italic;margin:0}
  @media(max-width:800px){.sheet-top-grid,.sheet-primary-grid{grid-template-columns:1fr}.sheet-skill-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sheet-combat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sheet-load{grid-column:auto}.sheet-styles{grid-column:1/-1}}
  @media(max-width:560px){.sheet{gap:10px}.sheet-page{padding:7px}.sheet-skill-grid,.sheet-combat-grid,.sheet-weapon-grid{grid-template-columns:1fr}.sheet-stats{grid-template-columns:repeat(4,minmax(0,1fr))}.sheet-derived{grid-template-columns:repeat(2,minmax(0,1fr))}.sheet-locations,.sheet-load,.sheet-styles{grid-column:auto;grid-row:auto}.sheet-panel table{font-size:.68rem}}
  @media print{.sheet{display:block;margin:0}.sheet-page{box-shadow:none;background:#fff;padding:0;border:0;break-after:page;page-break-after:always}.sheet-page:last-child{break-after:auto;page-break-after:auto}.sheet-page-one,.sheet-page-two{gap:5px}.sheet-panel{background:#fff;padding:5px;break-inside:avoid}.sheet-top-grid,.sheet-primary-grid{gap:5px}.sheet-skill-grid{gap:5px}.sheet-skill-list{columns:2}.sheet-combat-grid{gap:5px}.sheet-weapon-grid{gap:5px}.sheet-panel table{font-size:8px}.sheet-owned table{font-size:7px}.sheet-styles{break-inside:avoid}}
</style>
