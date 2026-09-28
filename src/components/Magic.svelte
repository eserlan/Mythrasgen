<script lang="ts">
  import { onMount } from "svelte";
  import StepHead from "./StepHead.svelte";
  import { careers } from "../lib/content";
  import { char, persist, reconcileMagic } from "../lib/store.svelte";
  import type { MagicSkillOrigin } from "../lib/magic";
  import {
    calculateFolkMagicStartingEntitlement, CORE_FOLK_MAGIC_SPELLS,
    FOLK_MAGIC_SPECIALIST_ENTITLEMENT, FOLK_MAGIC_STANDARD_ENTITLEMENT,
    folkMagicConfigurationStatus, resolveFolkMagicCareerSuggestion, type CustomFolkMagicSpell, type FolkMagicSpellReference,
  } from "../lib/folk-magic";

  const originName: Record<MagicSkillOrigin, string> = { culture: "Culture", career: "Career", bonus: "Bonus / Hobby Skill" };
  let picker: HTMLDialogElement;
  let query = $state("");
  let pickerTab = $state<"suggested" | "core" | "custom">("suggested");
  let customName = $state("");
  let customDescription = $state("");
  let customEditor = $state(false);
  let findSubject = $state("");
  let detailsSpellId = $state<string | null>(null);

  const capability = $derived(char.magic.disciplines.find(item => item.discipline === "Folk Magic"));
  const folkState = $derived(char.magic.folkMagic);
  const specialist = $derived(capability?.configuration?.entitlementRuleId === FOLK_MAGIC_SPECIALIST_ENTITLEMENT.id);
  const entitlementRule = $derived(specialist ? FOLK_MAGIC_SPECIALIST_ENTITLEMENT : FOLK_MAGIC_STANDARD_ENTITLEMENT);
  const skill = $derived(capability?.skills.find(item => item.name === "Folk Magic"));
  const entitlement = $derived(calculateFolkMagicStartingEntitlement(skill?.value, entitlementRule));
  const career = $derived(careers[char.career] ?? careers[0]);
  const careerId = $derived(career.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  const suggestion = $derived(skill?.origins.includes("career") ? resolveFolkMagicCareerSuggestion(careerId) : { mode: "unrestricted" as const });
  const availability = $derived(folkState.availability ?? {});
  const allowedCoreIds = $derived(Array.isArray(availability.allowedCoreSpellIds)
    ? availability.allowedCoreSpellIds.filter((id): id is string => typeof id === "string") : null);
  const coreAllowed = $derived(availability.allowCore !== false);
  const customAllowed = $derived(availability.allowCustom !== false);
  const coreSpells = $derived(CORE_FOLK_MAGIC_SPELLS.filter(spell => coreAllowed && (!allowedCoreIds || allowedCoreIds.includes(spell.id))));
  const customSpells = $derived(folkState.customSpells.filter(spell => customAllowed));
  const selected = $derived(folkState.knownSpells);
  const selectedCount = $derived(selected.length);
  const complete = $derived(folkMagicConfigurationStatus(selectedCount, entitlement.count) === "complete");
  const overEntitled = $derived(selectedCount > entitlement.count);
  const suggestedIds = $derived(suggestion.mode === "selected"
    ? new Set(suggestion.spellIds.filter(id => coreSpells.some(spell => spell.id === id))) : new Set<string>());
  const availableSpells = $derived([
    ...coreSpells.map(spell => ({ ...spell, source: "core" as const })),
    ...customSpells,
  ]);
  const pickerSpells = $derived(availableSpells.filter(spell => {
    if (pickerTab === "suggested" && (suggestion.mode !== "selected" || spell.source !== "core" || !suggestedIds.has(spell.id))) return false;
    if (pickerTab === "core" && spell.source !== "core") return false;
    if (pickerTab === "custom" && spell.source !== "custom") return false;
    return spell.name.toLowerCase().includes(query.trim().toLowerCase());
  }));

  onMount(() => { reconcileMagic(); updateStatus(); });

  function updateStatus() {
    if (!capability) return;
    capability.status = complete ? "complete" : "action-required";
    persist();
  }
  function setSpecialist(enabled: boolean) {
    if (!capability) return;
    capability.configuration = { ...capability.configuration, entitlementRuleId: enabled
      ? FOLK_MAGIC_SPECIALIST_ENTITLEMENT.id : FOLK_MAGIC_STANDARD_ENTITLEMENT.id };
    updateStatus();
  }
  function isSelected(id: string) { return selected.some(item => item.spell.spellId === id); }
  function toggleSpell(id: string) {
    const index = selected.findIndex(item => item.spell.spellId === id);
    if (index >= 0) selected.splice(index, 1);
    else {
      if (selectedCount >= entitlement.count) return;
      const spell = availableSpells.find(item => item.id === id);
      if (!spell) return;
      const reference: FolkMagicSpellReference = { spellId: id };
      if (spell.source === "core" && spell.specialisation === "subject") {
        if (!findSubject.trim()) return;
        reference.specialisation = findSubject.trim();
      }
      selected.push({ spell: reference, provenance: [] });
      findSubject = "";
    }
    updateStatus();
  }
  function changeFindSubject(id: string, value: string) {
    const known = selected.find(item => item.spell.spellId === id);
    if (known) { known.spell.specialisation = value.trim(); updateStatus(); }
  }
  function createCustomSpell() {
    const name = customName.trim();
    if (!name || !customAllowed) return;
    const id = `custom:folk-magic:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const spell: CustomFolkMagicSpell = { id, name, description: customDescription.trim(), source: "custom" };
    folkState.customSpells.push(spell);
    customName = "";
    customDescription = "";
    customEditor = false;
    pickerTab = "custom";
    query = "";
    persist();
  }
  function openPicker(tab: "suggested" | "core" | "custom" = "suggested") {
    pickerTab = suggestion.mode === "unrestricted" && tab === "suggested" ? "core" : tab;
    query = "";
    picker.showModal();
  }
  function spellName(id: string) { return availableSpells.find(spell => spell.id === id)?.name ?? id; }
</script>

<StepHead step={5} title="Magic" />

<section class="card magic-foundation">
  {#if char.magic.disciplines.length === 0}
    <h3>Magical Capabilities</h3>
    <p class="magic-empty-title">No magical capabilities detected.</p>
    <p class="mute">Your current Culture, Career and Bonus Skills have not granted access to a magical discipline.</p>
    <div class="magic-organisations">
      <h4>Cults &amp; Brotherhoods</h4>
      <p>Cult or brotherhood membership may still be available if permitted by the campaign.</p>
    </div>
  {:else}
    <h3>Magical Capabilities</h3>
    <div class="magic-capabilities">
      {#each char.magic.disciplines as item (item.discipline)}
        {#if item.discipline !== "Folk Magic"}
          <article class="magic-capability">
            <div class="magic-capability-heading">
              <h4>{item.discipline}</h4>
              <span class="magic-status">{item.status === "needs-configuration" ? "Needs configuration" : item.status}</span>
            </div>
            <ul class="magic-skills">
              {#each item.skills as magicSkill (magicSkill.name)}
                <li><span>{magicSkill.name}</span><b>{magicSkill.value}%</b>
                  {#if magicSkill.origins.length}<small>Acquired through {magicSkill.origins.map(origin => originName[origin]).join(", ")}</small>{/if}
                </li>
              {/each}
            </ul>
          </article>
        {/if}
      {/each}
    </div>
    {#if capability}
      <article class="folk-magic-discipline">
        <div class="folk-magic-heading">
          <div><h4>Folk Magic</h4>
            <p class="folk-magic-skill">Folk Magic {skill?.value ?? 0}%</p>
            {#if skill?.origins.length}<p class="mute folk-magic-provenance">Acquired through {skill.origins.map(origin => originName[origin]).join(", ")}</p>{/if}
          </div>
          <span class:complete class="magic-status">{overEntitled ? "Action required" : complete ? "Complete" : "Action required"}</span>
        </div>
        <div class="folk-magic-entitlement">
          <div><b>Starting spells — {entitlement.count}</b>
            <small>{specialist ? "Folk Magic specialist · 1 spell per 10%" : "Standard starting magic · 1 spell per 20%"}</small>
          </div>
            <label class="folk-magic-specialist"><input type="checkbox" checked={specialist} onchange={event => setSpecialist(event.currentTarget.checked)} /> Folk Magic specialist</label>
        </div>
        <div class="folk-magic-count" aria-live="polite">{selectedCount} / {entitlement.count} selected</div>
        {#if overEntitled}<p class="folk-magic-error">You know more starting spells than your current entitlement. Deselect {selectedCount - entitlement.count} to continue.</p>{/if}
        {#if selectedCount < entitlement.count}<p class="folk-magic-error">Choose {entitlement.count - selectedCount} more starting {entitlement.count - selectedCount === 1 ? "spell" : "spells"}.</p>{/if}
        <div class="folk-magic-known">
          {#if selected.length}
            {#each selected as known (known.spell.spellId)}
              <div class="folk-magic-known-row">
                <div><b>{spellName(known.spell.spellId)}</b>
                  <small>{known.spell.spellId.startsWith("custom:") ? "Custom spell" : "Core Folk Magic"}</small>
                  {#if known.spell.spellId.endsWith(":find")}
                    <label class="folk-magic-find">Find subject <input value={known.spell.specialisation ?? ""} placeholder="e.g. a spring" onchange={event => changeFindSubject(known.spell.spellId, event.currentTarget.value)} /></label>
                  {/if}
                </div>
                <button type="button" class="ghost" onclick={() => toggleSpell(known.spell.spellId)} aria-label="Deselect {spellName(known.spell.spellId)}">Deselect</button>
              </div>
            {/each}
          {:else}<p class="mute">No starting spells selected yet.</p>{/if}
        </div>
        <div class="folk-magic-actions">
          <button type="button" class="primary" disabled={selectedCount >= entitlement.count} onclick={() => openPicker()}>Choose starting spells</button>
          {#if customAllowed}<button type="button" class="ghost" onclick={() => { customEditor = !customEditor; }}>+ Create custom spell</button>{/if}
        </div>
        {#if suggestion.mode === "selected"}
          <p class="folk-magic-suggestion-note">Suggested for {career.name}; other available Core spells remain selectable.</p>
        {:else}
          <p class="folk-magic-suggestion-note">{career.name} has no career-specific suggestion list; browse the full Core catalogue.</p>
        {/if}
        {#if availability.allowCore === false || availability.allowCustom === false || allowedCoreIds}
          <p class="folk-magic-suggestion-note">Availability follows the campaign or tradition’s configured Folk Magic sources.</p>
        {/if}
        {#if customEditor}
          <form class="folk-magic-custom-form" onsubmit={event => { event.preventDefault(); createCustomSpell(); }}>
            <h5>Create custom spell</h5>
            <label>Name<input bind:value={customName} required maxlength="100" /></label>
            <label>Description / notes<textarea bind:value={customDescription} rows="3"></textarea></label>
            <div><button type="submit" class="primary" disabled={!customName.trim()}>Save custom spell</button><button type="button" class="ghost" onclick={() => customEditor = false}>Cancel</button></div>
          </form>
        {/if}
      </article>
    {/if}
  {/if}
</section>

<dialog class="folk-magic-picker" bind:this={picker} aria-labelledby="folk-magic-picker-title">
  <div class="folk-magic-picker-content">
    <header><div><h2 id="folk-magic-picker-title">Choose a starting spell</h2><p>{selectedCount} / {entitlement.count} selected</p></div><button type="button" class="ghost" onclick={() => picker.close()}>Close ✕</button></header>
    <div class="folk-magic-tabs">
      {#if suggestion.mode === "selected"}<button type="button" class:active={pickerTab === "suggested"} onclick={() => pickerTab = "suggested"}>Suggested · {suggestedIds.size}</button>{/if}
      {#if coreAllowed}<button type="button" class:active={pickerTab === "core"} onclick={() => pickerTab = "core"}>All Core · {coreSpells.length}</button>{/if}
      {#if customAllowed}<button type="button" class:active={pickerTab === "custom"} onclick={() => pickerTab = "custom"}>Custom · {customSpells.length}</button>{/if}
    </div>
    <input class="folk-magic-search" bind:value={query} placeholder="Search spells…" aria-label="Search available spells" />
    <ul class="folk-magic-picker-list">
      {#each pickerSpells as spell (spell.id)}
        <li class:selected={isSelected(spell.id)}>
          <button type="button" class="folk-magic-spell-choice" disabled={!isSelected(spell.id) && (selectedCount >= entitlement.count || (spell.id === "folk-magic:find" && !findSubject.trim()))} onclick={() => toggleSpell(spell.id)}>
            <span class="folk-magic-check">{isSelected(spell.id) ? "✓" : "+"}</span><span><b>{spell.name}</b>
              <small>{spell.source === "custom" ? "Custom" : suggestedIds.has(spell.id) ? "Suggested · Core" : "Core Folk Magic"}</small>
              {#if "specialisation" in spell && spell.specialisation === "subject"}<small>Choose a subject when known (Find X).</small>{/if}
            </span>
          </button>
          <button type="button" class="ghost folk-magic-details-button" onclick={() => detailsSpellId = detailsSpellId === spell.id ? null : spell.id}>{detailsSpellId === spell.id ? "Hide details" : "Details"}</button>
          {#if detailsSpellId === spell.id}<p class="folk-magic-spell-details">{spell.source === "custom" ? spell.description || "No notes added." : spell.specialisation === "subject" ? "Core spell identity. Record the chosen subject above; consult the Core rules for the full effect." : "Core Folk Magic spell. Consult the Core rules for the full effect."}</p>{/if}
        </li>
      {:else}<li class="mute folk-magic-no-results">No available spells match this search.</li>{/each}
    </ul>
    {#if pickerTab === "core" && coreAllowed && CORE_FOLK_MAGIC_SPELLS.some(spell => !coreSpells.some(availableSpell => availableSpell.id === spell.id))}
      <p class="folk-magic-suggestion-note">Some Core spells are unavailable under the active campaign or tradition configuration.</p>
    {/if}
    {#if pickerSpells.some(spell => spell.id.endsWith(":find")) && !isSelected("folk-magic:find")}
      <label class="folk-magic-find">Find subject <input bind:value={findSubject} placeholder="e.g. a spring" /></label>
    {/if}
  </div>
</dialog>

<style>
  .magic-capabilities{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
  .magic-capability,.folk-magic-discipline{border:1px solid var(--line);background:var(--card2);padding:14px;min-width:0}
  .magic-capability-heading,.folk-magic-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .magic-capability h4,.folk-magic-heading h4{margin:0;color:var(--bronze);font:700 .82rem var(--display);letter-spacing:.1em;text-transform:uppercase}
  .magic-status{font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--acc);white-space:nowrap}
  .magic-status.complete{color:var(--ok)}
  .magic-skills{list-style:none;margin:10px 0 0;padding:0}
  .magic-skills li{display:grid;grid-template-columns:1fr auto;gap:0 8px;border-top:1px solid var(--line);padding:7px 0}
  .magic-skills small{grid-column:1/-1;color:var(--mute);font-size:.78rem}
  .magic-organisations{margin-top:20px;border-top:1px solid var(--line);padding-top:12px}
  .magic-organisations h4{margin:0;color:var(--bronze);font:700 .78rem var(--display);text-transform:uppercase;letter-spacing:.1em}
  .magic-organisations p,.magic-empty-title{margin:.3rem 0;color:var(--mute)}
  .folk-magic-discipline{margin-top:12px;padding:16px}
  .folk-magic-skill{margin:2px 0 0;font-weight:700}
  .folk-magic-provenance{margin:0;font-size:.82rem}
  .folk-magic-entitlement{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 8px;padding:10px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .folk-magic-entitlement>div{display:grid}.folk-magic-entitlement small,.folk-magic-known-row small,.folk-magic-spell-choice small{display:block;color:var(--mute);font-size:.8rem}
  .folk-magic-specialist{display:flex;align-items:center;gap:6px;font-size:.82rem;white-space:nowrap}.folk-magic-specialist input{accent-color:var(--bronze)}
  .folk-magic-count{font:700 .72rem var(--display);letter-spacing:.1em;text-transform:uppercase}
  .folk-magic-error{margin:5px 0;color:var(--acc);font-size:.85rem}
  .folk-magic-known{margin:8px 0}.folk-magic-known>p{margin:6px 0}
  .folk-magic-known-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}
  .folk-magic-known-row>div{min-width:0}.folk-magic-find{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:.8rem}.folk-magic-find input{padding:5px 8px;font-size:.9rem}
  .folk-magic-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .folk-magic-suggestion-note{margin:7px 0 0;color:var(--mute);font-size:.8rem;font-style:italic}
  .folk-magic-custom-form{display:grid;gap:8px;margin-top:12px;padding:12px;background:var(--card);border:1px solid var(--line)}
  .folk-magic-custom-form h5{margin:0;color:var(--bronze);font:700 .72rem var(--display);letter-spacing:.1em;text-transform:uppercase}
  .folk-magic-custom-form label{display:grid;gap:3px;font-size:.85rem}.folk-magic-custom-form input{width:100%}
  .folk-magic-custom-form>div{display:flex;gap:8px}
  .folk-magic-picker{width:min(620px,calc(100% - 24px));max-height:min(80vh,760px);padding:0;color:var(--fg);background:var(--card);border:1px solid var(--line2);border-radius:4px;box-shadow:var(--shadow)}
  .folk-magic-picker::backdrop{background:#110d09a8;backdrop-filter:blur(2px)}
  .folk-magic-picker-content{display:flex;flex-direction:column;max-height:min(80vh,760px);padding:16px}
  .folk-magic-picker-content>header{position:static;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;background:none;border:0}
  .folk-magic-picker-content h2{font-size:1.05rem;text-transform:uppercase;color:var(--bronze)}.folk-magic-picker-content header p{margin:2px 0;color:var(--mute);font-size:.85rem}
  .folk-magic-tabs{display:flex;gap:4px;margin:12px 0 8px;overflow-x:auto}.folk-magic-tabs button{white-space:nowrap;font-size:.65rem;padding:6px 9px}.folk-magic-tabs button.active{border-color:var(--bronze);color:var(--bronze)}
  .folk-magic-search{width:100%;margin-bottom:8px}.folk-magic-picker-list{list-style:none;margin:0;padding:0;overflow:auto;border-top:1px solid var(--line)}
  .folk-magic-picker-list>li{display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--line);padding:5px 0;flex-wrap:wrap}.folk-magic-picker-list>li.selected{background:color-mix(in srgb,var(--ok) 9%,transparent)}
  .folk-magic-spell-choice{display:flex;align-items:center;gap:10px;flex:1;text-align:left;background:none;border:0;padding:7px 5px;text-transform:none;letter-spacing:0;font:inherit}.folk-magic-spell-choice:hover:not(:disabled){transform:none}.folk-magic-spell-choice:disabled{opacity:.5}
  .folk-magic-check{width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--line2);color:var(--bronze);font-weight:bold}.selected .folk-magic-check{color:var(--ok);border-color:var(--ok)}
  .folk-magic-details-button{font-size:.65rem}.folk-magic-spell-details{width:100%;margin:0 6px 6px 39px;color:var(--mute);font-size:.86rem}
  .folk-magic-no-results{padding:12px}
  @media(max-width:520px){.folk-magic-entitlement{align-items:flex-start;flex-direction:column}.folk-magic-known-row{align-items:flex-start}.folk-magic-actions>*{flex:1}}
</style>
