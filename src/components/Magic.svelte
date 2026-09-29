<script lang="ts">
  import { onMount } from "svelte";
  import StepHead from "./StepHead.svelte";
  import { careers } from "../lib/content";
  import { char, persist, reconcileMagic } from "../lib/store.svelte";
  import type { MagicSkillOrigin } from "../lib/magic";
  import {
    calculateFolkMagicStartingEntitlement, CORE_FOLK_MAGIC_SPELLS,
    FOLK_MAGIC_TRAIT_HELP,
    FOLK_MAGIC_SPECIALIST_ENTITLEMENT, FOLK_MAGIC_STANDARD_ENTITLEMENT,
    folkMagicConfigurationStatus, resolveFolkMagicCareerSuggestion, type CustomFolkMagicSpell, type FolkMagicSpellReference,
  } from "../lib/folk-magic";
  import {
    availableMysticismTalentIds, calculateMysticismStartingEntitlement, mysticismCatalogue, mysticismTalentDetails as resolveMysticismTalentDetails,
    type MysticismPath, type MysticismTalent,
  } from "../lib/mysticism";
  import {
    availableSorcerySpellIds, calculateSorceryDerivedStatistics, calculateSorceryStartingEntitlement, sorceryCatalogue, sorcerySchoolCatalogue,
    withStartingSorcerySchool, type SorcerySchool, type SorcerySpell,
  } from "../lib/sorcery";

  const originName: Record<MagicSkillOrigin, string> = { culture: "Culture", career: "Career", bonus: "Bonus / Hobby Skill" };
  let picker: HTMLDialogElement;
  let query = $state("");
  let pickerTab = $state<"suggested" | "core" | "custom">("suggested");
  let customName = $state("");
  let customDescription = $state("");
  let customEditor = $state(false);
  let findSubject = $state("");
  let detailsSpellId = $state<string | null>(null);
  let mysticismPicker: HTMLDialogElement;
  let customPathTalentPicker: HTMLDialogElement;
  let mysticismPathQuery = $state("");
  let customPathTalentQuery = $state("");
  let customPathEditor = $state(false);
  let customPathName = $state("");
  let customPathOrganisation = $state("");
  let customPathTeacher = $state("");
  let customPathNotes = $state("");
  let customTalentName = $state("");
  let customTalentDescription = $state("");
  let customPathTalentIds = $state<string[]>([]);
  let mysticismTalentDetails = $state<string | null>(null);
  let customPathTalentDetails = $state<string | null>(null);
  let sorceryPicker: HTMLDialogElement;
  let sorceryPickerMode = $state<"starting" | "school">("starting");
  let sorceryQuery = $state("");
  let sorceryDetailsId = $state<string | null>(null);
  let sorceryCustomSchoolEditor = $state(false);
  let sorceryCustomSpellEditor = $state(false);
  let sorceryCustomSchoolName = $state("");
  let sorceryCustomSchoolSource = $state("");
  let sorceryCustomSpellName = $state("");
  let sorceryCustomSpellDescription = $state("");
  let sorceryCustomSpellSpecialisation = $state("");
  let sorcerySchoolSpellIds = $state<string[]>([]);

  const capability = $derived(char.magic.disciplines.find(item => item.discipline === "Folk Magic"));
  const mysticismCapability = $derived(char.magic.disciplines.find(item => item.discipline === "Mysticism"));
  const sorceryCapability = $derived(char.magic.disciplines.find(item => item.discipline === "Sorcery"));
  const sorceryState = $derived(char.magic.sorcery);
  const sorcerySkills = $derived(sorceryCapability?.skills ?? []);
  const invocationSkill = $derived(sorcerySkills.find(item => item.name === "Invocation") ?? sorcerySkills.find(item => item.name.startsWith("Invocation (")));
  const shapingSkill = $derived(sorcerySkills.find(item => item.name === "Shaping"));
  const sorceryEntitlement = $derived(calculateSorceryStartingEntitlement(invocationSkill?.value));
  const sorceryDerived = $derived(calculateSorceryDerivedStatistics(invocationSkill?.value, shapingSkill?.value, char.chars.INT));
  const sorcerySchools = $derived(sorcerySchoolCatalogue(sorceryState));
  const sorcerySpells = $derived(sorceryCatalogue(sorceryState));
  const sorcerySchoolId = $derived(sorceryState.startingSchoolId ?? "");
  const sorcerySchool = $derived(sorcerySchools.find(item => item.id === sorcerySchoolId));
  const sorceryAvailableIds = $derived(sorcerySchool ? availableSorcerySpellIds({ ...sorceryState, schoolIds: [sorcerySchool.id], startingSchoolId: sorcerySchool.id }) : []);
  const sorcerySelected = $derived(sorceryState.knownSpells.filter(item => item.starting));
  const sorceryInvalidSelected = $derived(sorcerySelected.filter(item => !sorceryAvailableIds.includes(item.spellId)));
  const sorceryComplete = $derived(!!sorcerySchool && sorcerySelected.length === sorceryEntitlement.count && sorceryInvalidSelected.length === 0);
  const sorceryPickerSpells = $derived(sorceryAvailableIds.map(id => sorcerySpells.find(spell => spell.id === id)).filter((spell): spell is SorcerySpell => !!spell)
    .filter(spell => `${spell.name} ${spell.description ?? ""} ${spell.notes ?? ""}`.toLowerCase().includes(sorceryQuery.trim().toLowerCase())));
  const sorcerySchoolPickerSpells = $derived(sorcerySpells.filter(spell => `${spell.name} ${spell.description ?? ""} ${spell.notes ?? ""}`.toLowerCase().includes(sorceryQuery.trim().toLowerCase())));
  const mysticismState = $derived(char.magic.mysticism);
  const mysticismData = $derived(mysticismCatalogue(mysticismState));
  const mysticismSkill = $derived(mysticismCapability?.skills.find(item => item.name === "Mysticism") ?? mysticismCapability?.skills[0]);
  const mysticismPathId = $derived(mysticismState.startingPathId ?? "");
  const mysticismPath = $derived(mysticismData.paths.find(path => path.id === mysticismPathId));
  const mysticismOrganisation = $derived(mysticismPath?.organisationId ? mysticismData.organisations.find(item => item.id === mysticismPath.organisationId) : undefined);
  const mysticismEntitlement = $derived(calculateMysticismStartingEntitlement(mysticismSkill?.value, mysticismPathId));
  const mysticismAvailableIds = $derived(mysticismPath ? availableMysticismTalentIds(mysticismState, [mysticismPath.id]) : []);
  const mysticismAvailable = $derived(mysticismAvailableIds.map(id => mysticismData.talents.find(talent => talent.id === id)).filter((talent): talent is MysticismTalent => !!talent));
  const mysticismSelected = $derived(mysticismState.startingTalentIds);
  const mysticismInvalidSelected = $derived(mysticismSelected.filter(id => !mysticismAvailableIds.includes(id)));
  const mysticismComplete = $derived(!!mysticismPath && mysticismSelected.length === mysticismEntitlement.count && mysticismInvalidSelected.length === 0);
  const mysticismPickerTalents = $derived(mysticismAvailable.filter(talent => talent.name.toLowerCase().includes(mysticismPathQuery.trim().toLowerCase())));
  const customPathCoreTalents = $derived(mysticismData.talents.filter(talent => talent.source === "core"));
  const customPathPickerTalents = $derived(customPathCoreTalents.filter(talent => `${talent.name} ${talent.target ?? ""} ${talent.description ?? ""}`.toLowerCase().includes(customPathTalentQuery.trim().toLowerCase())));
  const customPathSelectedTalents = $derived(customPathTalentIds.map(id => customPathCoreTalents.find(talent => talent.id === id)).filter((talent): talent is MysticismTalent => !!talent));
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
  const hasUnresolvedSpecialisation = $derived(selected.some(item => item.spell.spellId === "folk-magic:find" && !item.spell.specialisation?.trim()));
  const complete = $derived(folkMagicConfigurationStatus(selectedCount, entitlement.count, hasUnresolvedSpecialisation) === "complete");
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

  onMount(() => { reconcileMagic(); inferStartingMysticismPath(); inferStartingSorcerySchool(); updateStatus(); });

  function updateStatus() {
    if (capability) capability.status = complete ? "complete" : "action-required";
    if (mysticismCapability) mysticismCapability.status = mysticismComplete ? "complete" : "action-required";
    if (sorceryCapability) sorceryCapability.status = sorceryComplete ? "complete" : "action-required";
    persist();
  }
  function inferStartingSorcerySchool() {
    if (!sorceryCapability || sorceryState.startingSchoolId) return;
    const validLearned = sorceryState.schoolIds.find(id => sorcerySchools.some(item => item.id === id));
    const specialised = sorcerySkills.find(item => item.name.startsWith("Invocation ("))?.name.slice("Invocation (".length, -1).trim().toLocaleLowerCase();
    const inferred = sorcerySchools.find(item => item.name.toLocaleLowerCase() === specialised);
    const school = sorcerySchools.find(item => item.id === validLearned) ?? inferred;
    if (school) {
      sorceryState.startingSchoolId = school.id;
      sorceryState.schoolIds = [...new Set([...sorceryState.schoolIds, school.id])];
    }
  }
  function selectSorcerySchool(id: string) {
    const next = withStartingSorcerySchool(sorceryState, id);
    sorceryState.startingSchoolId = next.startingSchoolId;
    sorceryState.schoolIds = next.schoolIds;
    updateStatus();
  }
  function sorceryAccess() { return sorceryState.schoolAccess.find(item => item.schoolId === sorcerySchoolId); }
  function updateSorceryAccess(field: "sourceType" | "sourceDescription" | "organisationId", value: string) {
    if (!sorcerySchoolId) return;
    const current = sorceryAccess() ?? { schoolId: sorcerySchoolId };
    const next = { ...current, [field]: value || undefined };
    sorceryState.schoolAccess = [...sorceryState.schoolAccess.filter(item => item.schoolId !== sorcerySchoolId), next];
    if (sorcerySchool?.source === "custom" && field === "sourceDescription") sorcerySchool.sourceDescription = value || undefined;
    updateStatus();
  }
  function sorcerySpell(id: string) { return sorcerySpells.find(item => item.id === id); }
  function sorcerySpellName(id: string) { return sorcerySpell(id)?.name ?? id; }
  function toggleSorcerySpell(id: string) {
    const index = sorceryState.knownSpells.findIndex(item => item.starting && item.spellId === id);
    if (index >= 0) sorceryState.knownSpells.splice(index, 1);
    else if (sorceryState.knownSpells.filter(item => item.starting).length < sorceryEntitlement.count && sorceryAvailableIds.includes(id)) sorceryState.knownSpells.push({ spellId: id, starting: true });
    updateStatus();
  }
  function createSorcerySchool() {
    const name = sorceryCustomSchoolName.trim();
    if (!name) return;
    const id = `custom:sorcery-school:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const school: SorcerySchool = { id, name, source: "custom", spellIds: [...new Set(sorcerySchoolSpellIds)], ...(sorceryCustomSchoolSource.trim() ? { sourceDescription: sorceryCustomSchoolSource.trim() } : {}) };
    sorceryState.customSchools.push(school);
    sorceryState.startingSchoolId = id;
    sorceryState.schoolIds = [...new Set([...sorceryState.schoolIds, id])];
    sorceryState.schoolAccess = [...sorceryState.schoolAccess.filter(item => item.schoolId !== id), { schoolId: id, sourceType: "custom", ...(sorceryCustomSchoolSource.trim() ? { sourceDescription: sorceryCustomSchoolSource.trim() } : {}) }];
    sorceryCustomSchoolName = ""; sorceryCustomSchoolSource = ""; sorcerySchoolSpellIds = []; sorceryCustomSchoolEditor = false;
    updateStatus();
  }
  function toggleSorcerySchoolSpell(id: string) {
    sorcerySchoolSpellIds = sorcerySchoolSpellIds.includes(id) ? sorcerySchoolSpellIds.filter(item => item !== id) : [...sorcerySchoolSpellIds, id];
  }
  function openSorcerySchoolPicker() {
    sorcerySchoolSpellIds = [...(sorcerySchool?.source === "custom" ? sorcerySchool.spellIds : [])];
    sorceryPickerMode = "school";
    sorceryQuery = "";
    sorceryPicker.showModal();
  }
  function saveSorcerySchoolSpells() {
    if (sorceryCustomSchoolEditor) { sorceryPicker.close(); return; }
    if (sorcerySchool?.source !== "custom") return;
    sorcerySchool.spellIds = [...new Set(sorcerySchoolSpellIds)];
    sorceryPicker.close();
    updateStatus();
  }
  function removeSorcerySchoolSpell(id: string) {
    if (sorcerySchool?.source !== "custom") return;
    sorcerySchool.spellIds = sorcerySchool.spellIds.filter(item => item !== id);
    updateStatus();
  }
  function createSorcerySpell() {
    const name = sorceryCustomSpellName.trim();
    if (!name) return;
    const id = `custom:sorcery-spell:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const subject = sorceryCustomSpellSpecialisation.trim();
    const spell: SorcerySpell = { id, name: subject ? `${name} (${subject})` : name, source: "custom", ...(subject ? { baseFamily: name, specialisation: { kind: "subject", value: subject } } : {}), ...(sorceryCustomSpellDescription.trim() ? { description: sorceryCustomSpellDescription.trim() } : {}) };
    sorceryState.customSpells.push(spell);
    if (sorcerySchool?.source === "custom") sorcerySchool.spellIds.push(id);
    sorceryCustomSpellName = ""; sorceryCustomSpellDescription = ""; sorceryCustomSpellSpecialisation = ""; sorceryCustomSpellEditor = false;
    updateStatus();
  }
  function inferStartingMysticismPath() {
    if (!mysticismCapability || mysticismState.startingPathId) return;
    const specialisedName = mysticismCapability.skills.find(item => item.name.startsWith("Mysticism ("))?.name;
    const specialisation = specialisedName?.slice("Mysticism (".length, -1).trim().toLocaleLowerCase();
    const match = mysticismData.paths.find(path => path.name.toLocaleLowerCase() === specialisation);
    if (match) mysticismState.startingPathId = match.id;
  }
  function selectMysticismPath(id: string) {
    const previousId = mysticismState.startingPathId;
    mysticismState.startingPathId = id || undefined;
    mysticismState.pathIds = [...new Set([...mysticismState.pathIds.filter(pathId => pathId !== previousId), ...(id ? [id] : [])])];
    updateStatus();
  }
  function toggleMysticismTalent(id: string) {
    const index = mysticismState.startingTalentIds.indexOf(id);
    if (index >= 0) mysticismState.startingTalentIds.splice(index, 1);
    else if (mysticismState.startingTalentIds.length < mysticismEntitlement.count && mysticismAvailableIds.includes(id)) mysticismState.startingTalentIds.push(id);
    updateStatus();
  }
  function createCustomPath() {
    const name = customPathName.trim();
    if (!name) return;
    const id = `custom:mysticism-path:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const organisationName = customPathOrganisation.trim();
    const organisationId = organisationName ? `${id}:organisation` : undefined;
    const customTalent = customTalentName.trim() ? {
      id: `custom:mysticism-talent:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      name: customTalentName.trim(), source: "custom" as const, family: "custom" as const, description: customTalentDescription.trim(),
    } : undefined;
    const talentIds = [...customPathTalentIds, ...(customTalent ? [customTalent.id] : [])];
    const path: MysticismPath = { id, name, source: "custom", talentIds,
      ...(organisationId ? { organisationId } : {}), ...(customPathTeacher.trim() ? { teacher: customPathTeacher.trim() } : {}),
      ...(customPathNotes.trim() ? { notes: customPathNotes.trim() } : {}) };
    mysticismState.customPaths.push(path);
    if (customTalent) mysticismState.customTalents.push(customTalent);
    if (organisationId) mysticismState.organisations.push({ id: organisationId, name: organisationName, source: "custom" });
    mysticismState.startingPathId = id;
    mysticismState.pathIds = [...new Set([...mysticismState.pathIds, id])];
    customPathName = ""; customPathOrganisation = ""; customPathTeacher = ""; customPathNotes = ""; customPathTalentIds = []; customPathEditor = false;
    updateStatus();
  }
  function toggleCustomPathTalent(id: string) {
    customPathTalentIds = customPathTalentIds.includes(id)
      ? customPathTalentIds.filter(selectedId => selectedId !== id)
      : [...customPathTalentIds, id];
  }
  function createCustomMysticismTalent() {
    const name = customTalentName.trim();
    if (!name || !mysticismPath || mysticismPath.source !== "custom") return;
    const id = `custom:mysticism-talent:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const talent: MysticismTalent = { id, name, source: "custom", family: "custom", description: customTalentDescription.trim() };
    mysticismState.customTalents.push(talent);
    mysticismPath.talentIds.push(id);
    customTalentName = ""; customTalentDescription = "";
    updateStatus();
  }
  function talentFor(id: string) { return mysticismData.talents.find(talent => talent.id === id); }
  function talentName(id: string) { return talentFor(id)?.name ?? id; }
  function setSpecialist(enabled: boolean) {
    if (!capability) return;
    capability.configuration = { ...capability.configuration, entitlementRuleId: enabled
      ? FOLK_MAGIC_SPECIALIST_ENTITLEMENT.id : FOLK_MAGIC_STANDARD_ENTITLEMENT.id };
    updateStatus();
  }
  function isSelected(id: string) { return selected.some(item => item.spell.spellId === id); }
  function findSubjectExists(subject: string) {
    const normalized = subject.trim().toLocaleLowerCase();
    return !!normalized && selected.some(item => item.spell.spellId === "folk-magic:find" && item.spell.specialisation?.trim().toLocaleLowerCase() === normalized);
  }
  function toggleSpell(id: string) {
    if (id === "folk-magic:find") {
      const subject = findSubject.trim();
      if (!subject || findSubjectExists(subject) || selectedCount >= entitlement.count) return;
      selected.push({ spell: { spellId: id, specialisation: subject }, provenance: [] });
      findSubject = "";
      updateStatus();
      return;
    }
    const index = selected.findIndex(item => item.spell.spellId === id);
    if (index >= 0) selected.splice(index, 1);
    else {
      if (selectedCount >= entitlement.count) return;
      const spell = availableSpells.find(item => item.id === id);
      if (!spell) return;
      const reference: FolkMagicSpellReference = { spellId: id };
      selected.push({ spell: reference, provenance: [] });
    }
    updateStatus();
  }
  function removeKnownSpell(known: typeof selected[number]) {
    const index = selected.indexOf(known);
    if (index >= 0) selected.splice(index, 1);
    updateStatus();
  }
  function changeFindSubject(known: typeof selected[number], value: string) {
    if (selected.includes(known)) { known.spell.specialisation = value.trim(); updateStatus(); }
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
  function spellName(id: string, specialisation?: string) {
    const name = availableSpells.find(spell => spell.id === id)?.name ?? id;
    return id === "folk-magic:find" && specialisation?.trim() ? `${name} (${specialisation.trim()})` : name;
  }
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
        {#if item.discipline !== "Folk Magic" && item.discipline !== "Mysticism" && item.discipline !== "Sorcery"}
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
    {#if mysticismCapability}
      <article class="folk-magic-discipline mysticism-discipline">
        <div class="folk-magic-heading">
          <div><h4>Mysticism</h4>
            <p class="folk-magic-skill">Mysticism {mysticismSkill?.value ?? 0}%{#if mysticismCapability.skills.some(item => item.name === "Meditation")} · Meditation {mysticismCapability.skills.find(item => item.name === "Meditation")?.value ?? 0}%{/if}</p>
            {#if mysticismSkill?.origins.length}<p class="mute folk-magic-provenance">Acquired through {mysticismSkill.origins.map(origin => originName[origin]).join(", ")}</p>{/if}
          </div>
          <span class:complete={mysticismComplete} class="magic-status">{mysticismComplete ? "Complete" : "Action required"}</span>
        </div>
        <div class="folk-magic-entitlement"><div><b>Starting Talents — {mysticismEntitlement.count}</b><small>Mysticism {mysticismSkill?.value ?? 0}% gives you {mysticismEntitlement.count} starting {mysticismEntitlement.count === 1 ? "Talent" : "Talents"}.</small></div></div>
        <details class="mysticism-details"><summary>How Mysticism Talents work</summary>
          <p>The mystic must know a Talent and succeed at the relevant Mysticism check to use it. Preparation normally takes one turn per point of Intensity. Invoke Traits have default Intensity 1 and grant their Trait ability for the Talent's duration. Unless a Talent says otherwise, it lasts for its task and lapses when the mystic turns attention elsewhere.</p>
          <p>Mysticism limits the maximum Intensity of an individual Talent; Meditation limits total simultaneous active Intensity; POW limits how many Talents the mystic can keep practiced.</p>
        </details>
        <label class="mysticism-path">Path
          <select value={mysticismPathId} onchange={event => selectMysticismPath(event.currentTarget.value)}>
            <option value="">Choose your Path</option>
            {#each mysticismData.paths as path (path.id)}<option value={path.id}>{path.name}{path.source === "custom" ? " · Custom" : ""}</option>{/each}
          </select>
        </label>
        {#if mysticismPath}
          <p class="mysticism-path-info"><b>{mysticismPath.name}</b>{#if mysticismOrganisation} — {mysticismOrganisation.name}{:else if mysticismPath.teacher} — {mysticismPath.teacher}{/if}</p>
          <div class="folk-magic-count" aria-live="polite">{mysticismSelected.length} / {mysticismEntitlement.count} selected</div>
          {#if mysticismInvalidSelected.length}<p class="folk-magic-error">Some selected Talents are no longer available on this Path. Deselect or resolve: {mysticismInvalidSelected.map(talentName).join(", ")}.</p>{/if}
          {#if mysticismSelected.length < mysticismEntitlement.count}<p class="folk-magic-error">Choose {mysticismEntitlement.count - mysticismSelected.length} more starting {mysticismEntitlement.count - mysticismSelected.length === 1 ? "Talent" : "Talents"}.</p>{/if}
          {#if mysticismSelected.length > mysticismEntitlement.count}<p class="folk-magic-error">You have more starting Talents than your current entitlement. Deselect {mysticismSelected.length - mysticismEntitlement.count} to continue.</p>{/if}
          <div class="folk-magic-known">
            {#each mysticismSelected as id (id)}<div class="folk-magic-known-row"><div><b>{talentName(id)}</b><small>{talentFor(id)?.source === "custom" ? "Custom Talent" : "Core Talent"}</small></div><button type="button" class="ghost" aria-label="Deselect {talentName(id)}" onclick={() => toggleMysticismTalent(id)}>Deselect</button></div>{/each}
            {#if mysticismSelected.length === 0}<p class="mute">No starting Talents selected yet.</p>{/if}
          </div>
          <button type="button" class="primary" disabled={mysticismSelected.length >= mysticismEntitlement.count && mysticismInvalidSelected.length === 0} onclick={() => { mysticismPathQuery = ""; mysticismPicker.showModal(); }}>Choose starting Talents</button>
          {#if mysticismPath.description || mysticismPath.notes}<details class="mysticism-details"><summary>Path details</summary><p>{mysticismPath.description || mysticismPath.notes}</p></details>{/if}
          {#if mysticismPath.source === "custom"}
            <details class="mysticism-details"><summary>Add a custom Talent</summary>
              <form class="folk-magic-custom-form" onsubmit={event => { event.preventDefault(); createCustomMysticismTalent(); }}>
                <label>Name<input bind:value={customTalentName} required maxlength="100" /></label>
                <label>Description<textarea bind:value={customTalentDescription} rows="3"></textarea></label>
                <button type="submit" class="primary" disabled={!customTalentName.trim()}>Save custom Talent</button>
              </form>
            </details>
          {/if}
        {:else}<p class="mute">Choose a Path to see its available starting Talents.</p>{/if}
        <details class="mysticism-details" open={customPathEditor} ontoggle={event => customPathEditor = event.currentTarget.open}>
          <summary>Create custom Path</summary>
          <form class="folk-magic-custom-form" onsubmit={event => { event.preventDefault(); createCustomPath(); }}>
            <label>Path name<input bind:value={customPathName} required maxlength="100" /></label>
            <label>Organisation or teacher (optional)<input bind:value={customPathOrganisation} maxlength="100" /></label>
            <label>Teacher / source (optional)<input bind:value={customPathTeacher} maxlength="100" /></label>
            <label>Notes (optional)<textarea bind:value={customPathNotes} rows="2"></textarea></label>
            <section class="custom-path-talents" aria-labelledby="custom-path-talents-heading">
              <div class="custom-path-talents-heading"><div><h5 id="custom-path-talents-heading">Talents</h5><small>{customPathSelectedTalents.length + (customTalentName.trim() ? 1 : 0)} Talents added</small></div></div>
              {#if customPathSelectedTalents.length || customTalentName.trim()}
                <ul class="custom-path-selected-talents">
                  {#each customPathSelectedTalents as talent (talent.id)}
                    <li><span>{talent.name}<small>Core Talent</small></span><button type="button" class="ghost" aria-label="Remove {talent.name}" onclick={() => toggleCustomPathTalent(talent.id)}>Remove</button></li>
                  {/each}
                  {#if customTalentName.trim()}<li><span>{customTalentName.trim()}<small>Custom Talent · added when Path is created</small></span><button type="button" class="ghost" aria-label="Clear custom Talent {customTalentName.trim()}" onclick={() => { customTalentName = ""; customTalentDescription = ""; }}>Remove</button></li>{/if}
                </ul>
              {:else}<p class="mute custom-path-no-talents">No Talents added yet.</p>{/if}
              <button type="button" class="primary" onclick={() => { customPathTalentQuery = ""; customPathTalentPicker.showModal(); }}>Add Talents</button>
            </section>
            <details class="mysticism-details custom-path-advanced"><summary>Create Custom Talent</summary>
              <label>Name<input bind:value={customTalentName} maxlength="100" /></label>
              <label>Description<textarea bind:value={customTalentDescription} rows="2"></textarea></label>
              <p class="mute">This Talent will be created and added to the Path when you save it.</p>
            </details>
            <button type="submit" class="primary" disabled={!customPathName.trim()}>Create Path</button>
          </form>
        </details>
      </article>
    {/if}
    {#if sorceryCapability}
      <article class="folk-magic-discipline sorcery-discipline">
        <div class="folk-magic-heading">
          <div><h4>Sorcery</h4>
            <p class="folk-magic-skill">Invocation {invocationSkill?.value ?? 0}%{#if shapingSkill} · Shaping {shapingSkill.value}%{/if}</p>
            {#if invocationSkill?.origins.length}<p class="mute folk-magic-provenance">Acquired through {invocationSkill.origins.map(origin => originName[origin]).join(", ")}</p>{/if}
          </div>
          <span class:complete={sorceryComplete} class="magic-status">{sorceryComplete ? "Complete" : "Action required"}</span>
        </div>
        <div class="folk-magic-entitlement"><div><b>Starting spells — {sorceryEntitlement.count}</b><small>Invocation {invocationSkill?.value ?? 0}% gives you {sorceryEntitlement.count} starting {sorceryEntitlement.count === 1 ? "spell" : "spells"}.</small></div>
          <small class="sorcery-derived">Intensity {sorceryDerived.intensity} · {sorceryDerived.shapingPoints} Shaping Points</small>
        </div>
        <details class="mysticism-details sorcery-help"><summary>Sorcery details</summary>
          <p>Intensity is based on Invocation. Shaping Points are based on Shaping and modify casting parameters during play; you do not allocate them during character creation.</p>
          <p>Memorised spell capacity: INT {sorceryDerived.memorisedSpellCapacity}. Starting entitlement and memorisation capacity are separate.</p>
        </details>
        <label class="mysticism-path">Choose your School
          <select value={sorcerySchoolId} onchange={event => { if (event.currentTarget.value === "__custom_school__") { sorceryCustomSchoolName = ""; sorceryCustomSchoolSource = ""; sorcerySchoolSpellIds = []; sorceryCustomSchoolEditor = true; } else selectSorcerySchool(event.currentTarget.value); }}>
            <option value="">Choose your School</option>
            {#each sorcerySchools as school (school.id)}<option value={school.id}>{school.name}{school.source === "custom" ? " · Custom" : ""}</option>{/each}
            <option value="__custom_school__">Custom School…</option>
          </select>
        </label>
        <button type="button" class="ghost sorcery-create-school" onclick={() => { sorceryCustomSchoolName = ""; sorceryCustomSchoolSource = ""; sorcerySchoolSpellIds = []; sorceryCustomSchoolEditor = !sorceryCustomSchoolEditor; }}>Create custom School</button>
        {#if sorceryCustomSchoolEditor}
          <form class="folk-magic-custom-form" onsubmit={event => { event.preventDefault(); createSorcerySchool(); }}>
            <h5>Create custom School</h5>
            <label>School name<input bind:value={sorceryCustomSchoolName} required maxlength="100" /></label>
            <label>Source<input bind:value={sorceryCustomSchoolSource} maxlength="120" placeholder="Mentor, Grimoire, Cult / Order…" /></label>
            <div class="custom-path-talents">
              <div class="custom-path-talents-heading"><div><h5>Spells</h5><small>{sorcerySchoolSpellIds.length} spells</small></div></div>
              {#if sorcerySchoolSpellIds.length}<ul class="custom-path-selected-talents">{#each sorcerySchoolSpellIds as id (id)}<li><span>{sorcerySpellName(id)}<small>{sorcerySpell(id)?.source === "custom" ? "Custom spell" : "Core spell"}</small></span><button type="button" class="ghost" onclick={() => toggleSorcerySchoolSpell(id)}>Remove</button></li>{/each}</ul>{:else}<p class="mute custom-path-no-talents">No spells added yet.</p>{/if}
              <button type="button" class="primary" onclick={openSorcerySchoolPicker}>Add Spells</button>
            </div>
            <button type="submit" class="primary" disabled={!sorceryCustomSchoolName.trim()}>Create custom School</button>
          </form>
        {/if}
        {#if sorcerySchool}
          <p class="mysticism-path-info"><b>{sorcerySchool.name}</b>{#if sorcerySchool.sourceDescription} · {sorcerySchool.sourceDescription}{/if}</p>
          <div class="sorcery-access-fields">
            <label>Source
              <select value={sorceryAccess()?.sourceType ?? ""} onchange={event => updateSorceryAccess("sourceType", event.currentTarget.value)}>
                <option value="">Choose source (optional)</option><option>Mentor</option><option>Grimoire</option><option>Cult/Order</option><option>Artefact</option><option>Demon/Spirit</option><option>Location</option><option>Self-taught</option><option>Custom</option>
              </select>
            </label>
            <label>Source details<input value={sorceryAccess()?.sourceDescription ?? sorcerySchool.sourceDescription ?? ""} maxlength="120" placeholder="Name or short note" onchange={event => updateSorceryAccess("sourceDescription", event.currentTarget.value)} /></label>
            <label>Organisation (optional)
              <select value={sorceryAccess()?.organisationId ?? ""} onchange={event => updateSorceryAccess("organisationId", event.currentTarget.value)}>
                <option value="">None</option>{#each char.memberships as membership (membership.id)}<option value={membership.id}>{membership.name}</option>{/each}
              </select>
            </label>
          </div>
          <div class="folk-magic-count" aria-live="polite">{sorcerySelected.length} / {sorceryEntitlement.count} selected</div>
          {#if sorceryInvalidSelected.length}<p class="folk-magic-error">Some starting spells are no longer available from this School. Resolve or remove: {sorceryInvalidSelected.map(item => sorcerySpellName(item.spellId)).join(", ")}.</p>{/if}
          {#if sorcerySelected.length < sorceryEntitlement.count}<p class="folk-magic-error">Choose {sorceryEntitlement.count - sorcerySelected.length} more starting {sorceryEntitlement.count - sorcerySelected.length === 1 ? "spell" : "spells"}.</p>{/if}
          {#if sorcerySelected.length > sorceryEntitlement.count}<p class="folk-magic-error">You have more starting spells than your current entitlement. Deselect {sorcerySelected.length - sorceryEntitlement.count} to continue.</p>{/if}
          <div class="folk-magic-known">
            {#each sorcerySelected as known (known.spellId)}<div class="folk-magic-known-row"><div><b>{sorcerySpellName(known.spellId)}</b><small>{sorcerySpell(known.spellId)?.source === "custom" ? "Custom spell" : "Core Sorcery"}</small></div><button type="button" class="ghost" aria-label="Deselect {sorcerySpellName(known.spellId)}" onclick={() => toggleSorcerySpell(known.spellId)}>Deselect</button></div>{:else}<p class="mute">No starting spells selected yet.</p>{/each}
          </div>
          <button type="button" class="primary" disabled={sorcerySelected.length >= sorceryEntitlement.count && sorceryInvalidSelected.length === 0} onclick={() => { sorceryQuery = ""; sorceryPickerMode = "starting"; sorceryPicker.showModal(); }}>Choose starting spells</button>
          {#if sorcerySchool.source === "custom"}
            <details class="mysticism-details"><summary>Custom School spells</summary>
              {#if sorcerySchool.spellIds.length}<ul class="custom-path-selected-talents">{#each sorcerySchool.spellIds as id (id)}<li><span>{sorcerySpellName(id)}<small>{sorcerySpell(id)?.source === "custom" ? "Custom spell" : "Core spell"}</small></span><button type="button" class="ghost" aria-label="Remove {sorcerySpellName(id)} from School" onclick={() => removeSorcerySchoolSpell(id)}>Remove</button></li>{/each}</ul>{:else}<p class="mute">This School has no spells yet.</p>{/if}
              <button type="button" class="primary" onclick={openSorcerySchoolPicker}>Add Spells</button>
              <button type="button" class="ghost" onclick={() => sorceryCustomSpellEditor = !sorceryCustomSpellEditor}>+ Create custom spell</button>
              {#if sorceryCustomSpellEditor}<form class="folk-magic-custom-form" onsubmit={event => { event.preventDefault(); createSorcerySpell(); }}>
                <h5>Create custom spell</h5><label>Name<input bind:value={sorceryCustomSpellName} required maxlength="100" /></label>
                <label>Description / notes<textarea bind:value={sorceryCustomSpellDescription} rows="2"></textarea></label>
                <label>Specialisation / subject (optional)<input bind:value={sorceryCustomSpellSpecialisation} maxlength="100" /></label>
                <button type="submit" class="primary" disabled={!sorceryCustomSpellName.trim()}>Save custom spell</button>
              </form>{/if}
            </details>
          {/if}
        {:else}<p class="mute">Choose a School to see available starting spells.</p>{/if}
      </article>
    {/if}
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
            {#each selected as known (`${known.spell.spellId}:${known.spell.specialisation ?? ""}`)}
              <div class="folk-magic-known-row">
                <div><b>{spellName(known.spell.spellId, known.spell.specialisation)}</b>
                  <small>{known.spell.spellId.startsWith("custom:") ? "Custom spell" : "Core Folk Magic"}</small>
                  {#if known.spell.spellId.endsWith(":find")}
                    <label class="folk-magic-find">Find subject <input value={known.spell.specialisation ?? ""} placeholder="e.g. a spring" aria-invalid={!known.spell.specialisation?.trim()} onchange={event => changeFindSubject(known, event.currentTarget.value)} /></label>
                    {#if !known.spell.specialisation?.trim()}<small class="folk-magic-error">Choose a subject for Find to complete Folk Magic.</small>{/if}
                  {/if}
                </div>
                <button type="button" class="ghost" onclick={() => removeKnownSpell(known)} aria-label="Deselect {spellName(known.spell.spellId, known.spell.specialisation)}">Deselect</button>
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

<dialog class="folk-magic-picker" bind:this={sorceryPicker} aria-labelledby="sorcery-picker-title">
  <div class="folk-magic-picker-content">
    <header><div><h2 id="sorcery-picker-title">{sorceryPickerMode === "school" ? "Add spells to School" : "Choose starting spells"}</h2><p>{sorceryPickerMode === "school" ? `${sorcerySchoolSpellIds.length} spells in School` : `${sorcerySelected.length} / ${sorceryEntitlement.count} selected`}</p></div><button type="button" class="ghost" onclick={() => sorceryPicker.close()}>Close ✕</button></header>
    <input class="folk-magic-search" bind:value={sorceryQuery} placeholder="Search Sorcery spells…" aria-label="Search Sorcery spells" />
    <ul class="folk-magic-picker-list">
      {#each sorceryPickerMode === "school" ? sorcerySchoolPickerSpells : sorceryPickerSpells as spell (spell.id)}
        {@const chosen = sorceryPickerMode === "school" ? sorcerySchoolSpellIds.includes(spell.id) : sorcerySelected.some(item => item.spellId === spell.id)}
        <li class:selected={chosen}>
          <button type="button" class="folk-magic-spell-choice" disabled={sorceryPickerMode === "starting" && !chosen && sorcerySelected.length >= sorceryEntitlement.count} onclick={() => sorceryPickerMode === "school" ? toggleSorcerySchoolSpell(spell.id) : toggleSorcerySpell(spell.id)}>
            <span class="folk-magic-check">{chosen ? "✓" : "+"}</span><span><b>{spell.name}</b><small>{spell.source === "custom" ? "Custom spell" : "Core Sorcery"}{#if spell.specialisation} · {spell.specialisation.kind === "subject" ? "Subject" : "Form"}: {spell.specialisation.value}{/if}</small></span>
          </button>
          <button type="button" class="ghost folk-magic-details-button" onclick={() => sorceryDetailsId = sorceryDetailsId === spell.id ? null : spell.id}>{sorceryDetailsId === spell.id ? "Hide details" : "Details"}</button>
          {#if sorceryDetailsId === spell.id}<div class="folk-magic-spell-details"><b>{spell.name}</b>{#if spell.description}<p>{spell.description}</p>{/if}{#if spell.notes}<p>{spell.notes}</p>{/if}{#if spell.specialisation}<small>{spell.specialisation.kind === "subject" ? "Subject" : "Form"} specialisation: {spell.specialisation.value}</small>{/if}{#if !spell.description && !spell.notes}<small>Canonical spell name and specialisation.</small>{/if}</div>{/if}
        </li>
      {:else}<li class="mute folk-magic-no-results">No Sorcery spells match this search or availability.</li>{/each}
    </ul>
    {#if sorceryPickerMode === "school"}<button type="button" class="primary sorcery-save-school-spells" onclick={saveSorcerySchoolSpells}>Save School spells</button>{/if}
  </div>
</dialog>

<dialog class="folk-magic-picker" bind:this={mysticismPicker} aria-labelledby="mysticism-picker-title">
  <div class="folk-magic-picker-content">
    <header><div><h2 id="mysticism-picker-title">Choose starting Talents</h2><p>{mysticismSelected.length} / {mysticismEntitlement.count} selected · {mysticismPath?.name}</p></div><button type="button" class="ghost" onclick={() => mysticismPicker.close()}>Close ✕</button></header>
    <input class="folk-magic-search" bind:value={mysticismPathQuery} placeholder="Search this Path’s Talents…" aria-label="Search available Mysticism Talents" />
    <ul class="folk-magic-picker-list">
      {#each mysticismPickerTalents as talent (talent.id)}
        <li class:selected={mysticismSelected.includes(talent.id)}>
          <button type="button" class="folk-magic-spell-choice" disabled={!mysticismSelected.includes(talent.id) && mysticismSelected.length >= mysticismEntitlement.count} onclick={() => toggleMysticismTalent(talent.id)}>
            <span class="folk-magic-check">{mysticismSelected.includes(talent.id) ? "✓" : "+"}</span><span><b>{talent.name}</b><small>{talent.source === "custom" ? "Custom Talent" : talent.family === "augment-skill" ? `Augments ${talent.target}` : talent.family === "invoke-trait" ? `Invokes ${talent.target}` : talent.family === "enhance-attribute" ? `Enhances ${talent.target}` : "Core Talent"}</small></span>
          </button>
          <button type="button" class="ghost folk-magic-details-button" onclick={() => mysticismTalentDetails = mysticismTalentDetails === talent.id ? null : talent.id}>{mysticismTalentDetails === talent.id ? "Hide details" : "Details"}</button>
          {#if mysticismTalentDetails === talent.id}{@const detail = resolveMysticismTalentDetails(talent)}<div class="folk-magic-spell-details mysticism-talent-details"><b>{talent.name.toLocaleUpperCase()}</b><small>{detail.family}{#if detail.cost} · {detail.cost}{/if}</small><p>{detail.effect}</p></div>{/if}
        </li>
      {:else}<li class="mute folk-magic-no-results">No available Talents match this Path or search.</li>{/each}
    </ul>
  </div>
</dialog>

<dialog class="folk-magic-picker custom-path-talent-picker" bind:this={customPathTalentPicker} aria-labelledby="custom-path-talent-picker-title">
  <div class="folk-magic-picker-content">
    <header><div><h2 id="custom-path-talent-picker-title">Add Talents</h2><p>{customPathTalentIds.length} Talents selected for this Path</p></div><button type="button" class="ghost" onclick={() => customPathTalentPicker.close()}>Close ✕</button></header>
    <input class="folk-magic-search" bind:value={customPathTalentQuery} placeholder="Search Talents…" aria-label="Search Core Talents" />
    <ul class="folk-magic-picker-list custom-path-talent-list">
      {#each customPathPickerTalents as talent (talent.id)}
        <li class:selected={customPathTalentIds.includes(talent.id)}>
          <button type="button" class="folk-magic-spell-choice" onclick={() => toggleCustomPathTalent(talent.id)}>
            <span class="folk-magic-check">{customPathTalentIds.includes(talent.id) ? "✓" : "+"}</span><span><b>{talent.name}</b><small>{talent.family === "augment-skill" ? `Augments ${talent.target}` : talent.family === "invoke-trait" ? `Invokes ${talent.target}` : talent.family === "enhance-attribute" ? `Enhances ${talent.target}` : "Core Talent"}</small></span>
          </button>
          <button type="button" class="ghost folk-magic-details-button" onclick={() => customPathTalentDetails = customPathTalentDetails === talent.id ? null : talent.id}>{customPathTalentDetails === talent.id ? "Hide details" : "Details"}</button>
          {#if customPathTalentDetails === talent.id}{@const detail = resolveMysticismTalentDetails(talent)}<div class="folk-magic-spell-details mysticism-talent-details"><b>{talent.name.toLocaleUpperCase()}</b><small>{detail.family}{#if detail.cost} · {detail.cost}{/if}</small><p>{detail.effect}</p></div>{/if}
        </li>
      {:else}<li class="mute folk-magic-no-results">No Talents match your search.</li>{/each}
    </ul>
  </div>
</dialog>

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
          <button type="button" class="folk-magic-spell-choice" disabled={selectedCount >= entitlement.count || (spell.id === "folk-magic:find" && (!findSubject.trim() || findSubjectExists(findSubject)))} onclick={() => toggleSpell(spell.id)}>
            <span class="folk-magic-check">{spell.id === "folk-magic:find" ? "+" : isSelected(spell.id) ? "✓" : "+"}</span><span><b>{spell.name}</b>
              <small>{spell.source === "custom" ? "Custom" : suggestedIds.has(spell.id) ? "Suggested · Core" : "Core Folk Magic"}</small>
              {#if "specialisation" in spell && spell.specialisation === "subject"}<small>Add each chosen subject as a separately learned spell (Find X).</small>{/if}
            </span>
          </button>
          <button type="button" class="ghost folk-magic-details-button" onclick={() => detailsSpellId = detailsSpellId === spell.id ? null : spell.id}>{detailsSpellId === spell.id ? "Hide details" : "Details"}</button>
          {#if detailsSpellId === spell.id}
            {#if spell.source === "custom"}
              <p class="folk-magic-spell-details">{spell.description || "No notes added."}</p>
            {:else}
              <div class="folk-magic-spell-details">
                <div class="folk-magic-traits" aria-label="Spell traits">{#each spell.details.traits as trait (trait)}<span title={FOLK_MAGIC_TRAIT_HELP[trait] ?? FOLK_MAGIC_TRAIT_HELP["Resist (skill)"]}>{trait}</span>{/each}</div>
                <p>{spell.details.effect}</p>
                {#if spell.details.specialisation}
                  {#if spell.details.specialisation.kind === "subject"}<small>Specialised by subject: {spell.details.specialisation.examples.map(subject => `${spell.name} (${subject})`).join(", ")}. Custom subjects are also supported; add a chosen subject before learning this spell.</small>
                  {:else}<small>Specialised by animal type; specify the chosen type when learning this spell.</small>{/if}
                {/if}
                {#if spell.details.mechanicsGap}<small class="folk-magic-gap">Exact Core limits for this spell need verification.</small>{/if}
                {#if !spell.details.traits.includes("Concentration") && !spell.details.traits.includes("Instant") && !spell.details.traits.includes("Special Duration")}<small title={FOLK_MAGIC_TRAIT_HELP["Normal duration"]}>Normally lasts for the scene or action for which it is used.</small>{/if}
              </div>
            {/if}
          {/if}
        </li>
      {:else}<li class="mute folk-magic-no-results">No available spells match this search.</li>{/each}
    </ul>
    {#if pickerTab === "core" && coreAllowed && CORE_FOLK_MAGIC_SPELLS.some(spell => !coreSpells.some(availableSpell => availableSpell.id === spell.id))}
      <p class="folk-magic-suggestion-note">Some Core spells are unavailable under the active campaign or tradition configuration.</p>
    {/if}
    {#if pickerSpells.some(spell => spell.id === "folk-magic:find")}
      <label class="folk-magic-find">Find subject <input bind:value={findSubject} placeholder="e.g. Livestock or a spring" /><small>Core examples: Arrows, Flaw, Livestock, Loot, Object, Sickness. Campaign and custom subjects are allowed.</small></label>
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
  .mysticism-path{display:grid;gap:5px;margin:12px 0 5px;font-size:.85rem}.mysticism-path select{width:100%}
  .mysticism-path-info{margin:5px 0 10px;color:var(--mute);font-size:.88rem}.mysticism-path-info b{color:var(--fg)}
  .mysticism-details{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}.mysticism-details summary{cursor:pointer;color:var(--bronze);font-size:.82rem}
  .mysticism-details>p{color:var(--mute);font-size:.84rem}
  .sorcery-derived{color:var(--mute);text-align:right}.sorcery-help{margin-bottom:8px}.sorcery-access-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin:8px 0}.sorcery-access-fields label{display:grid;gap:4px;font-size:.8rem}.sorcery-access-fields input,.sorcery-access-fields select{width:100%;min-width:0}.sorcery-create-school{margin:3px 0}.sorcery-save-school-spells{align-self:flex-start;margin-top:10px}
  .custom-path-talents{display:grid;gap:8px;margin-top:6px;padding-top:10px;border-top:1px solid var(--line)}
  .custom-path-talents-heading{display:flex;align-items:center;justify-content:space-between}.custom-path-talents-heading h5{margin:0;color:var(--bronze);font:700 .72rem var(--display);letter-spacing:.1em;text-transform:uppercase}
  .custom-path-talents-heading small,.custom-path-selected-talents small{display:block;color:var(--mute);font-size:.8rem}
  .custom-path-selected-talents{list-style:none;margin:0;padding:0}.custom-path-selected-talents li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)}
  .custom-path-selected-talents li>span{min-width:0}.custom-path-selected-talents button{flex:none;font-size:.65rem}.custom-path-no-talents{margin:0;font-size:.85rem}
  .custom-path-advanced{margin-top:8px}.custom-path-talent-list .folk-magic-spell-choice{min-width:0;overflow-wrap:normal;word-break:normal}.custom-path-talent-list .folk-magic-spell-choice>span:last-child{min-width:0;white-space:normal}
  .folk-magic-custom-form{display:grid;gap:8px;margin-top:12px;padding:12px;background:var(--card);border:1px solid var(--line)}
  .folk-magic-custom-form h5{margin:0;color:var(--bronze);font:700 .72rem var(--display);letter-spacing:.1em;text-transform:uppercase}
  .folk-magic-custom-form label{display:grid;gap:3px;font-size:.85rem}.folk-magic-custom-form input{width:100%}
  .folk-magic-custom-form>div{display:flex;gap:8px}
  .folk-magic-picker{width:min(620px,calc(100% - 24px));max-height:min(86dvh,760px);overflow:hidden;padding:0;color:var(--fg);background:var(--card);border:1px solid var(--line2);border-radius:4px;box-shadow:var(--shadow)}
  .folk-magic-picker::backdrop{background:#110d09a8;backdrop-filter:blur(2px)}
  .folk-magic-picker-content{display:flex;flex-direction:column;max-height:min(86dvh,760px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:16px}
  .folk-magic-picker-content>header{position:static;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;background:none;border:0}
  .folk-magic-picker-content h2{font-size:1.05rem;text-transform:uppercase;color:var(--bronze)}.folk-magic-picker-content header p{margin:2px 0;color:var(--mute);font-size:.85rem}
  .folk-magic-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:12px 0 8px}.folk-magic-tabs button{white-space:nowrap;font-size:.65rem;padding:6px 9px}.folk-magic-tabs button.active{border-color:var(--bronze);color:var(--bronze)}
  .folk-magic-search{width:100%;margin-bottom:8px}.folk-magic-picker-list{flex:none;list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
  .folk-magic-picker-list>li{display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--line);padding:5px 0;flex-wrap:wrap}.folk-magic-picker-list>li.selected{background:color-mix(in srgb,var(--ok) 9%,transparent)}
  .folk-magic-spell-choice{display:flex;align-items:center;gap:10px;flex:1;text-align:left;background:none;border:0;padding:7px 5px;text-transform:none;letter-spacing:0;font:inherit}.folk-magic-spell-choice:hover:not(:disabled){transform:none}.folk-magic-spell-choice:disabled{opacity:.5}.folk-magic-spell-choice>span:last-child{min-width:0;overflow-wrap:anywhere}
  .folk-magic-check{width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--line2);color:var(--bronze);font-weight:bold}.selected .folk-magic-check{color:var(--ok);border-color:var(--ok)}
  .folk-magic-details-button{font-size:.65rem}.folk-magic-spell-details{width:100%;margin:0 6px 6px 39px;color:var(--mute);font-size:.86rem}
  .folk-magic-traits{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 7px}.folk-magic-traits span{padding:2px 6px;border:1px solid var(--line2);color:var(--bronze);font-size:.74rem}.folk-magic-spell-details p{margin:0 0 6px}.folk-magic-spell-details small{display:block;margin-top:4px}.folk-magic-spell-details .folk-magic-gap{color:var(--acc)}
  .folk-magic-no-results{padding:12px}
  @media(max-width:520px){.folk-magic-entitlement{align-items:flex-start;flex-direction:column}.folk-magic-known-row{align-items:flex-start}.folk-magic-actions>*{flex:1}.custom-path-selected-talents li{align-items:flex-start}}
</style>
