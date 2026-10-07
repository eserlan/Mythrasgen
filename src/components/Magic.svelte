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
    availableSorcerySpellIds, calculateSorceryDerivedStatistics, calculateSorceryStartingEntitlement, configureCoreSorcerySpell, sorceryCatalogue, sorcerySchoolCatalogue, sorcerySpellDetails as resolveSorcerySpellDetails,
    withStartingSorcerySchool, type SorcerySchool, type SorcerySpell,
  } from "../lib/sorcery";
  import { CORE_ANIMISM_RANKS, CORE_SPIRIT_RULES, generateCoreSpirit, listAnimismSpiritTypes, getBoundSpiritCapacity, getMaximumControllableSpiritPow, getSpiritDamage, getTranceCapabilities, reconcileAnimism, spiritIntensityBand, spiritIntensityForPow, spiritPowMatchesIntensity, validateSpirit, type AnimismRank, type AnimismStartingGrant, type SpiritAttitude, type SpiritBindingVessel, type SpiritRecord, type SpiritTradition, type SpiritType } from "../lib/animism";
  import { CORE_THEIST_CULTS, CORE_THEIST_MIRACLES, THEIST_RANKS, devotionalPoolMaximum, effectiveMiracleMinimumRank, miracleAvailableAtRank, miracleIntensity, miracleMagnitude, startingMiracleLimit, validateKnownMiracles, type TheistCult, type TheistCultMiracle, type TheistRank } from "../lib/theism";

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
  let sorceryConfigureId = $state<string | null>(null);
  let sorceryConfigureSubject = $state("");
  let animismConfigureDialog = $state<HTMLDialogElement>();
  let animismManageDialog = $state<HTMLDialogElement>();
  let animismQuery = $state("");
  let animismPickerAttitude = $state<"friendly" | "neutral" | "hostile">("friendly");
  let animismTraditionName = $state("");
  let animismHostileTradition = $state("");
  let animismCustomTypeName = $state("");
  let animismCustomTypeDescription = $state("");
  let animismCustomTypeNotes = $state("");
  let animismCustomTypeProvenance = $state("");
  let animismSpiritName = $state("");
  let animismSpiritTypeId = $state("");
  let animismSpiritIntensity = $state(1);
  let animismSpiritPow = $state(7);
  let animismSpiritRelationship = $state<"ally" | "bound">("ally");
  let animismOtherAttitude = $state<SpiritAttitude | "">("");
  let animismSpiritMode = $state<"manual" | "generated">("manual");
  let animismGeneratedSpirit = $state<SpiritRecord | null>(null);
  let animismAbilityCountDie = $state<number | null>(null);
  let animismSpiritInt = $state<number | "">("");
  let animismSpiritIns = $state<number | "">("");
  let animismSpiritCha = $state<number | "">("");
  let animismTypeChoice = $state("");
  let animismNatureVariant = $state<"animal" | "regional">("animal");
  let animismTypeDetail = $state("");
  let animismSpiritAbilities = $state<string[]>([]);
  let animismVessel = $state<SpiritBindingVessel>("fetish/object");
  let animismVesselName = $state("");
  let animismVesselDescription = $state("");
  let animismSpiritNotes = $state("");
  let animismSpiritSource = $state("");
  let animismDetailsId = $state<string | null>(null);
  let animismEditingId = $state<string | null>(null);
  let animismEditIntensity = $state(1);
  let animismEditPow = $state<number | "">("");
  let animismEditInt = $state<number | "">("");
  let animismEditIns = $state<number | "">("");
  let animismEditCha = $state<number | "">("");
  let animismEditAbilities = $state<string[]>([]);
  let animismEditAbilityCountDie = $state<number | null>(null);
  let animismEditTypeChoice = $state("");
  let animismEditTypeDetail = $state("");
  let theismConfigureDialog = $state<HTMLDialogElement>();
  let theismCultChoice = $state("");
  let theismCultName = $state("");
  let theismDeity = $state("");
  let theismRankDraft = $state<TheistRank>("Initiate");
  let theismOfferDraft = $state<TheistCultMiracle[]>([]);
  let theismMiracleDetails = $state<string[]>([]);

  const capability = $derived(char.magic.disciplines.find(item => item.discipline === "Folk Magic"));
  const mysticismCapability = $derived(char.magic.disciplines.find(item => item.discipline === "Mysticism"));
  const sorceryCapability = $derived(char.magic.disciplines.find(item => item.discipline === "Sorcery"));
  const animismCapability = $derived(char.magic.disciplines.find(item => item.discipline === "Animism"));
  const theismCapability = $derived(char.magic.disciplines.find(item => item.discipline === "Theism"));
  const theismState = $derived(char.magic.theism);
  const theismMembership = $derived(theismState.memberships[0]);
  const theismDevotionSkill = $derived(theismCapability?.skills.find(item => item.name.startsWith("Devotion (")) ?? theismCapability?.skills.find(item => item.name === "Devotion"));
  const theismExhortSkill = $derived(theismCapability?.skills.find(item => item.name === "Exhort"));
  const theismSpecialisation = $derived(theismDevotionSkill?.name.startsWith("Devotion (") ? theismDevotionSkill.name.slice("Devotion (".length, -1).trim() : theismMembership?.devotionSpecialisation ?? "");
  const theismDevotion = $derived(theismDevotionSkill?.value ?? theismMembership?.devotionValue ?? 0);
  const theismExhort = $derived(theismExhortSkill?.value ?? theismMembership?.exhortValue ?? 0);
  const theismCult = $derived([...CORE_THEIST_CULTS, ...theismState.customCults].find(item => item.id === theismMembership?.cultId));
  const theismPoolMaximum = $derived(theismMembership ? devotionalPoolMaximum(char.chars.POW, theismMembership.rank) : 0);
  const theismKnownIds = $derived(theismMembership?.knownMiracleIds ?? []);
  const theismValidation = $derived(theismCult && theismMembership ? validateKnownMiracles(theismKnownIds, theismCult, theismMembership.rank, theismDevotion) : { valid: true, errors: [] });
  const theismLimit = $derived(startingMiracleLimit(theismDevotion));
  const theismAvailableMiracles = $derived(theismCult && theismMembership ? theismCult.miracles.map(offering => ({ offering, miracle: CORE_THEIST_MIRACLES.find(item => item.id === offering.miracleId) })).filter((item): item is { offering: TheistCultMiracle; miracle: typeof CORE_THEIST_MIRACLES[number] } => !!item.miracle && miracleAvailableAtRank(item.miracle, theismMembership!.rank, item.offering)) : []);
  const theismInvalidIds = $derived(theismCult && theismMembership ? theismKnownIds.filter((id, index) => !theismAvailableMiracles.some(item => item.miracle.id === id) || index >= theismLimit) : theismKnownIds);
  const theismNeedsSetup = $derived(!theismMembership || !theismCult || !theismSpecialisation || !theismValidation.valid || !!theismMembership && theismMembership.devotionalPool > theismPoolMaximum);
  const animismState = $derived(char.magic.animism);
  const animismBinding = $derived(animismCapability?.skills.find(item => item.name === "Binding" || item.name.startsWith("Binding (")));
  const animismTrance = $derived(animismCapability?.skills.find(item => item.name === "Trance"));
  const animismTraditions = $derived(animismState.traditions);
  const animismTradition = $derived(animismTraditions.find(item => item.id === animismState.traditionId));
  const animismRank = $derived(animismState.rank ?? animismTradition?.rank);
  const animismSpiritTypes = $derived(listAnimismSpiritTypes(animismState));
  const animismCapacity = $derived(getBoundSpiritCapacity(char, animismRank));
  const animismControlLimit = $derived(animismBinding ? getMaximumControllableSpiritPow(animismBinding.value) : 0);
  const animismSpiritPowBand = $derived(spiritIntensityBand(Number(animismSpiritIntensity) || 0));
  const animismCandidatePow = $derived(animismSpiritMode === "generated" ? animismGeneratedSpirit?.pow : Number(animismSpiritPow));
  const animismNewBoundInvalid = $derived(animismSpiritRelationship === "bound" && (!Number.isFinite(Number(animismCandidatePow))
    || !spiritPowMatchesIntensity(Number(animismCandidatePow), Number(animismSpiritIntensity) || 0)
    || Number(animismCandidatePow) > animismControlLimit));
  const animismBound = $derived(animismState.bindings.filter(item => item.countsAgainstCapacity));
  const animismAllies = $derived(animismState.allies.filter(ally => !animismBindingFor(ally.spiritId)));
  const animismFriendlyTypes = $derived(animismTradition?.friendlySpiritTypeIds ?? animismState.accessibleSpiritTypeIds);
  const animismNeutralTypes = $derived(animismTradition?.neutralSpiritTypeIds ?? []);
  const animismHostileTypes = $derived(animismTradition?.hostileSpiritTypeIds ?? []);
  const animismVisibleTypes = $derived([...new Set([...animismFriendlyTypes, ...animismNeutralTypes, ...animismHostileTypes])]);
  const animismSelectedAttitude = $derived(animismSpiritTypeId ? animismTypeAttitude(animismSpiritTypeId) : undefined);
  const animismSelectedRule = $derived(CORE_SPIRIT_RULES[animismSpiritTypeId]);
  const animismNewSpiritIssues = $derived(animismGeneratedSpirit ? validateSpirit(animismGeneratedSpirit) : []);
  const animismNewSpiritIncomplete = $derived(animismNewSpiritIssues.length > 0 || !!animismGeneratedSpirit?.generation?.pendingChoices.length);
  const animismPickerTypes = $derived(animismSpiritTypes.filter(item => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(animismQuery.trim().toLowerCase())));
  const animismRelationshipRows = $derived([...animismAllies.map(ally => ({ key: `ally:${ally.spiritId}`, spirit: animismSpirit(ally.spiritId), kind: "ALLY" as const, vessel: undefined as string | undefined })),
    ...animismState.bindings.map(binding => ({ key: `binding:${binding.id}`, spirit: animismSpirit(binding.spiritId), kind: "BOUND" as const, vessel: binding.objectName || (binding.vessel === "fetish/object" ? undefined : binding.vessel) }))].filter(row => !!row.spirit));
  const animismUnresolvedGrant = $derived(hasUnresolvedAnimismGrant());
  const animismIncompleteSpirits = $derived(animismState.spirits.some(spirit => animismRecordIssues(spirit).length > 0));
  const animismNeedsSetup = $derived(!animismTradition || !animismRank || animismBound.length > animismCapacity || animismState.reconciliationIssues.length > 0 || animismIncompleteSpirits || animismUnresolvedGrant);
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
  const sorcerySchoolPickerSpells = $derived(sorcerySpells.filter(spell => `${spell.name} ${spell.specialisationPrompt ?? ""} ${spell.description ?? ""} ${spell.notes ?? ""}`.toLowerCase().includes(sorceryQuery.trim().toLowerCase())));
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

  onMount(() => { reconcileMagic(); inferStartingMysticismPath(); inferStartingSorcerySchool(); inferAnimismTradition(); updateStatus(); });

  $effect(() => {
    if (!animismCapability) return;
    const issues = reconcileAnimism(animismState, animismRank, char.chars.CHA, animismState.traditionId, animismBinding?.value);
    animismCapability.status = !animismTradition || !animismRank || animismBound.length > animismCapacity || issues.length > 0 || animismIncompleteSpirits || animismUnresolvedGrant
      ? "action-required" : "complete";
  });

  function updateStatus() {
    if (capability) capability.status = complete ? "complete" : "action-required";
    if (mysticismCapability) mysticismCapability.status = mysticismComplete ? "complete" : "action-required";
    if (sorceryCapability) sorceryCapability.status = sorceryComplete ? "complete" : "action-required";
    if (animismCapability) {
      reconcileAnimism(animismState, animismRank, char.chars.CHA, animismState.traditionId, animismBinding?.value);
      animismCapability.status = animismNeedsSetup ? "action-required" : "complete";
    }
    if (theismCapability) {
      if (theismMembership) {
        theismMembership.devotionSpecialisation = theismSpecialisation;
        theismMembership.devotionValue = theismDevotion;
        theismMembership.exhortValue = theismExhort;
      }
      theismCapability.status = theismNeedsSetup ? "action-required" : "complete";
    }
    persist();
  }
  function openTheismConfigure() {
    const membership = theismMembership;
    const currentCult = theismCult;
    theismCultChoice = currentCult?.source === "custom" ? currentCult.id : currentCult?.id ?? "";
    theismCultName = currentCult?.name ?? "";
    theismDeity = currentCult?.deity ?? "";
    theismRankDraft = membership?.rank ?? "Initiate";
    theismOfferDraft = currentCult ? currentCult.miracles.map(item => ({ ...item })) : [];
    theismConfigureDialog?.showModal();
  }
  function chooseTheismCult(value: string) {
    theismCultChoice = value;
    const preset = CORE_THEIST_CULTS.find(item => item.id === value);
    const custom = theismState.customCults.find(item => item.id === value);
    const cult = preset ?? custom;
    theismCultName = cult?.name ?? "";
    theismDeity = cult?.deity ?? "";
    theismOfferDraft = cult ? cult.miracles.map(item => ({ ...item })) : [];
  }
  function toggleTheismOffering(miracleId: string) {
    const existing = theismOfferDraft.find(item => item.miracleId === miracleId);
    theismOfferDraft = existing ? theismOfferDraft.filter(item => item.miracleId !== miracleId) : [...theismOfferDraft, { miracleId }];
  }
  function setTheismOfferingRank(miracleId: string, value: string) {
    theismOfferDraft = theismOfferDraft.map(item => item.miracleId === miracleId ? { ...item, minimumRank: value === "default" ? undefined : value as TheistRank } : item);
  }
  function saveTheismCult() {
    if (!theismCultName.trim() || !theismDeity.trim()) return;
    const id = theismCultChoice && !CORE_THEIST_CULTS.some(item => item.id === theismCultChoice)
      ? theismCultChoice : `custom:theism-cult:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const cult: TheistCult = { id, name: theismCultName.trim(), deity: theismDeity.trim(), source: "custom", miracles: theismOfferDraft.map(item => ({ ...item })) };
    const oldIndex = theismState.customCults.findIndex(item => item.id === id);
    if (oldIndex >= 0) theismState.customCults[oldIndex] = cult; else theismState.customCults.push(cult);
    const prior = theismMembership;
    const membership = prior ?? { id: `theist:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`, cultId: id, rank: theismRankDraft, devotionSpecialisation: theismSpecialisation, devotionValue: theismDevotion, exhortValue: theismExhort, devotionalPool: 0, knownMiracleIds: [] };
    membership.cultId = id;
    membership.rank = theismRankDraft;
    membership.devotionSpecialisation = theismSpecialisation;
    membership.devotionValue = theismDevotion;
    membership.exhortValue = theismExhort;
    if (!prior) theismState.memberships = [membership];
    theismConfigureDialog?.close();
    updateStatus();
  }
  function toggleTheismMiracle(id: string) {
    if (!theismMembership) return;
    const known = theismMembership.knownMiracleIds;
    if (known.includes(id)) theismMembership.knownMiracleIds = known.filter(item => item !== id);
    else if (known.length < theismLimit) theismMembership.knownMiracleIds = [...known, id];
    if (theismMembership) {
      theismMembership.devotionSpecialisation = theismSpecialisation;
      theismMembership.devotionValue = theismDevotion;
      theismMembership.exhortValue = theismExhort;
    }
    updateStatus();
  }
  function toggleTheismMiracleDetails(id: string) {
    theismMiracleDetails = theismMiracleDetails.includes(id)
      ? theismMiracleDetails.filter(item => item !== id)
      : [...theismMiracleDetails, id];
  }
  function removeInvalidTheismMiracle(id: string) {
    if (!theismMembership) return;
    theismMembership.knownMiracleIds = theismMembership.knownMiracleIds.filter(item => item !== id);
    updateStatus();
  }
  function inferAnimismTradition() {
    if (!animismCapability || animismState.traditionId) return;
    const specialisation = animismBinding?.name.startsWith("Binding (") ? animismBinding.name.slice("Binding (".length, -1).trim().toLocaleLowerCase() : "";
    let found = animismTraditions.find(item => item.name.toLocaleLowerCase() === specialisation);
    if (!found) {
      const existing = char.magic.traditions.find(item => item.name.toLocaleLowerCase() === specialisation
        && (item.disciplines.includes("Animism") || item.sourceType.toLocaleLowerCase().includes("animist")));
      if (existing) {
        found = { id: existing.id, name: existing.name, source: existing.sourceType.toLocaleLowerCase().includes("custom") ? "custom" : "campaign",
          friendlySpiritTypeIds: [], neutralSpiritTypeIds: [], hostileSpiritTypeIds: [], hostileTraditionIds: [], startingGrants: [], customSpiritTypes: [], customSpiritTemplates: [] };
        animismState.traditions.push(found);
      }
    }
    if (found) { animismState.traditionId = found.id; animismState.bindingSpecialisation = { skillName: animismBinding!.name, traditionId: found.id }; }
  }
  function animismTypeName(id: string) { return animismSpiritTypes.find(item => item.id === id)?.name ?? id; }
  function animismTypeAttitude(id: string): SpiritAttitude | undefined {
    if (animismFriendlyTypes.includes(id)) return "friendly";
    if (animismNeutralTypes.includes(id)) return "neutral";
    if (animismHostileTypes.includes(id)) return "hostile";
    return undefined;
  }
  function animismAttitudeLabel(attitude?: SpiritAttitude) { return attitude === "friendly" ? "Friendly" : attitude === "neutral" ? "Known neutral" : attitude === "hostile" ? "Hostile" : "Not known through this Tradition"; }
  function animismRecordIssues(spirit: SpiritRecord) {
    const issues = validateSpirit(spirit).map(issue => issue.message);
    for (const choice of spirit.generation?.pendingChoices ?? []) issues.push(choice.description);
    if (!spirit.generation) issues.push("Legacy spirit record: review and complete its Core characteristics and abilities.");
    return [...new Set(issues)];
  }
  function animismChoiceResolved(spirit: SpiritRecord, choiceId: string): boolean {
    const data = spirit.typeData ?? {};
    if (choiceId === "legacy-spirit-details") {
      return validateSpirit(spirit).length === 0 && (spirit.generation?.pendingChoices ?? []).filter(item => item.id !== choiceId).every(item => animismChoiceResolved(spirit, item.id));
    }
    if (choiceId === "ancestor-species" || choiceId === "haunt-characteristics") return !!data.species && spirit.int !== undefined && spirit.cha !== undefined;
    if (choiceId === "nature-kind") return !!data[choiceId];
    if (choiceId === "nature-characteristics") return data.variant === "regional" || !!data.species && spirit.ins !== undefined && spirit.cha !== undefined;
    if (choiceId === "predator-host") return !!data.host;
    if (choiceId === "haunt-anchor") return !!data[choiceId];
    if (choiceId === "fetch-kind") return data.variant === "awakened" || data.variant === "allied";
    if (choiceId.endsWith("abilities") || choiceId.endsWith("blessings")) {
      const profile = CORE_SPIRIT_RULES[spirit.spiritTypeId];
      const choices = spirit.abilities.filter(ability => profile?.selectableAbilities?.includes(ability)).length;
      const required = choiceId.endsWith("blessings") ? spirit.intensity ?? 0 : spirit.generation?.rolls?.abilityCount?.[0] ?? ((profile?.abilityCount === "1d3+intensity") ? (spirit.intensity ?? 0) + 1 : spirit.intensity ?? 0);
      return profile?.abilityCount === "up-to-intensity" ? choices > 0 : choices >= required;
    }
    if (choiceId.endsWith("ability-details") || choiceId.endsWith("bless-targets") || choiceId === "haunt-spells") return Array.isArray(data.abilityDetails) && data.abilityDetails.length > 0;
    return data[choiceId] !== undefined || (Array.isArray(data.completedChoices) && data.completedChoices.includes(choiceId));
  }
  function animismAttitudeForSpirit(spirit: SpiritRecord) { return animismAttitudeLabel(animismTypeAttitude(spirit.spiritTypeId)); }
  function animismIndividualAttitudeSummary(spirit: SpiritRecord) { return !animismTypeAttitude(spirit.spiritTypeId) && spirit.attitude ? ` · Individual spirit attitude: ${animismAttitudeLabel(spirit.attitude)}` : ""; }
  function animismStatisticSummary(spirit: SpiritRecord) {
    return [spirit.pow !== undefined && `POW ${spirit.pow}`, spirit.int !== undefined && `INT ${spirit.int}`, spirit.ins !== undefined && `INS ${spirit.ins}`, spirit.cha !== undefined && `CHA ${spirit.cha}`, spirit.magicPoints !== undefined && `MP ${spirit.magicPoints}`, spirit.spectralCombat !== undefined && `Spectral Combat ${spirit.spectralCombat}%`, spirit.willpower !== undefined && `Willpower ${spirit.willpower}%`, spirit.stealth !== undefined && `Stealth ${spirit.stealth}%`].filter(Boolean).join(" · ");
  }
  function toggleAnimismAbility(ability: string) {
    animismSpiritAbilities = animismSpiritAbilities.includes(ability) ? animismSpiritAbilities.filter(item => item !== ability) : [...animismSpiritAbilities, ability];
    animismGeneratedSpirit = null;
  }
  function selectAnimismSpiritType(id: string) {
    animismSpiritTypeId = id;
    animismGeneratedSpirit = null;
    animismAbilityCountDie = null;
    animismTypeChoice = "";
    animismNatureVariant = "animal";
    animismSpiritAbilities = [];
    animismOtherAttitude = "";
    animismSpiritMode = id === "core:animism:ancestor" ? "generated" : "manual";
  }
  function rollAnimismAbilityCount() {
    if (animismSelectedRule?.abilityCount !== "1d3+intensity") return;
    animismAbilityCountDie = 1 + Math.floor(Math.random() * 3);
    animismGeneratedSpirit = null;
  }
  function rerollAnimismEditAbilityCount(id: string) {
    const spirit = animismSpirit(id);
    if (!spirit || CORE_SPIRIT_RULES[spirit.spiritTypeId]?.abilityCount !== "1d3+intensity") return;
    animismEditAbilityCountDie = 1 + Math.floor(Math.random() * 3);
  }
  function animismSelectedAbilityRecords() {
    if (animismSelectedRule?.id === "predator" && animismSpiritAbilities.includes("Bless")) {
      return Array.from({ length: Math.max(1, Number(animismSpiritIntensity) || 0) }, () => "Bless");
    }
    return [...animismSpiritAbilities];
  }
  function animismNewTypeData() {
    const data: Record<string, unknown> = {};
    if (animismSelectedRule) data.ruleId = animismSelectedRule.id;
    if (animismSelectedRule?.id === "nature") {
      data.variant = animismNatureVariant; data["nature-kind"] = animismNatureVariant;
      if (animismTypeChoice && animismNatureVariant !== "regional") data.species = animismTypeChoice;
      if (animismNatureVariant !== "regional") {
        if (animismSpiritIns !== "") data.ins = Number(animismSpiritIns);
        if (animismSpiritCha !== "") data.cha = Number(animismSpiritCha);
      }
    } else if (["ancestor", "haunt"].includes(animismSelectedRule?.id ?? "") && animismTypeChoice) data.species = animismTypeChoice;
    else if (animismSelectedRule?.id === "elemental" && animismTypeChoice) data.element = animismTypeChoice;
    else if (animismSelectedRule?.id === "curse" && animismTypeChoice) data["curse-effects"] = animismTypeChoice;
    else if (animismSelectedRule?.id === "sickness" && animismTypeChoice) data.disease = animismTypeChoice;
    else if (animismSelectedRule?.id === "predator" && animismTypeChoice) data.host = animismTypeChoice;
    else if (animismSelectedRule?.id === "fetch" && animismTypeChoice) data.variant = animismTypeChoice === "Awakened Fetch" ? "awakened" : "allied";
    if (animismSelectedRule?.id === "haunt" && animismTypeDetail) data["haunt-anchor"] = animismTypeDetail;
    if (animismTypeDetail && ["ancestor", "nature", "predator", "haunt"].includes(animismSelectedRule?.id ?? "")) data.abilityDetails = [animismTypeDetail];
    if (animismSpiritInt !== "") data.int = Number(animismSpiritInt);
    if (animismSpiritIns !== "") data.ins = Number(animismSpiritIns);
    if (animismSpiritCha !== "") data.cha = Number(animismSpiritCha);
    return data;
  }
  function generateAnimismSpirit() {
    if (!animismSpiritTypeId || !CORE_SPIRIT_RULES[animismSpiritTypeId]) return;
    if (animismSelectedRule?.id === "ancestor" && animismAbilityCountDie === null) return;
    const typeData = animismNewTypeData();
    animismGeneratedSpirit = generateCoreSpirit({ id: animismId("spirit"), name: animismSpiritName.trim() || animismTypeName(animismSpiritTypeId), spiritTypeId: animismSpiritTypeId, intensity: Number(animismSpiritIntensity) || 0, source: "core", ...(animismSelectedRule?.id === "ancestor" && animismAbilityCountDie !== null ? { abilityCountDie: animismAbilityCountDie } : {}), characteristics: { ...(animismSelectedRule?.id === "fetch" && animismTypeChoice === "Awakened Fetch" ? { pow: Number(animismSpiritPow) } : {}), ...(animismSpiritInt !== "" ? { int: Number(animismSpiritInt) } : {}), ...(animismSpiritIns !== "" ? { ins: Number(animismSpiritIns) } : {}), ...(animismSpiritCha !== "" ? { cha: Number(animismSpiritCha) } : {}) }, typeData, abilities: animismSelectedAbilityRecords(), notes: animismSpiritNotes.trim() || undefined });
    if (animismSelectedAttitude) animismGeneratedSpirit.attitude = animismSelectedAttitude;
    else if (animismOtherAttitude) animismGeneratedSpirit.attitude = animismOtherAttitude;
    animismSpiritPow = animismGeneratedSpirit.pow ?? animismSpiritPow;
    animismSpiritInt = animismGeneratedSpirit.int ?? ""; animismSpiritIns = animismGeneratedSpirit.ins ?? ""; animismSpiritCha = animismGeneratedSpirit.cha ?? "";
  }
  function animismSpirit(id: string) { return animismState.spirits.find(item => item.id === id); }
  function animismBindingFor(id: string) { return animismState.bindings.find(item => item.spiritId === id); }
  function setAnimismIntensity(value: number) {
    animismSpiritIntensity = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    const band = spiritIntensityBand(animismSpiritIntensity);
    animismSpiritPow = Math.min(band.maxPow, Math.max(band.minPow, Number(animismSpiritPow) || band.minPow));
  }
  function setAnimismPow(value: number) {
    const pow = Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
    const intensity = spiritIntensityForPow(pow);
    if (intensity === undefined) return;
    animismSpiritPow = pow;
    animismSpiritIntensity = intensity;
  }
  function editAnimismSpirit(id: string) {
    const spirit = animismSpirit(id);
    if (!spirit) return;
    animismEditingId = id;
    animismEditIntensity = spirit.intensity ?? 1;
    animismEditPow = spirit.pow ?? "";
    animismEditInt = spirit.int ?? ""; animismEditIns = spirit.ins ?? ""; animismEditCha = spirit.cha ?? ""; animismEditAbilities = [...spirit.abilities];
    animismEditAbilityCountDie = spirit.generation?.rolls?.abilityCountDie?.[0] ?? null;
    animismEditTypeChoice = String(spirit.typeData?.species ?? spirit.typeData?.element ?? spirit.typeData?.disease ?? spirit.typeData?.host ?? spirit.typeData?.variant ?? "");
    const savedAbilityDetails = spirit.typeData?.abilityDetails;
    animismEditTypeDetail = String(spirit.typeData?.["haunt-anchor"] ?? (Array.isArray(savedAbilityDetails) ? savedAbilityDetails[0] : "") ?? "");
  }
  function setAnimismEditIntensity(value: number) {
    animismEditIntensity = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    if (animismEditPow !== "") {
      const band = spiritIntensityBand(animismEditIntensity);
      animismEditPow = Math.min(band.maxPow, Math.max(band.minPow, animismEditPow));
    }
  }
  function setAnimismEditPow(value: number) {
    const pow = Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
    const intensity = spiritIntensityForPow(pow);
    if (intensity === undefined) return;
    animismEditPow = pow;
    animismEditIntensity = intensity;
  }
  function animismEditIssues(spirit: SpiritRecord): string[] {
    const profile = CORE_SPIRIT_RULES[spirit.spiritTypeId];
    const typeData = { ...(spirit.typeData ?? {}) };
    if (profile) typeData.ruleId = profile.id;
    if (animismEditTypeChoice.trim() && ["ancestor", "haunt", "nature"].includes(profile?.id ?? "")) typeData.species = animismEditTypeChoice.trim();
    if (animismEditTypeDetail.trim()) typeData.abilityDetails = [animismEditTypeDetail.trim()];
    const rolls = { ...(spirit.generation?.rolls ?? {}) };
    if (animismEditAbilityCountDie !== null && profile?.abilityCount === "1d3+intensity") {
      rolls.abilityCountDie = [animismEditAbilityCountDie];
      rolls.abilityCount = [animismEditAbilityCountDie + animismEditIntensity];
    }
    const candidate: SpiritRecord = {
      ...spirit, intensity: animismEditIntensity, ...(animismEditPow === "" ? { pow: undefined } : { pow: Number(animismEditPow) }),
      ...(animismEditInt === "" ? { int: undefined } : { int: Number(animismEditInt) }),
      ...(animismEditIns === "" ? { ins: undefined } : { ins: Number(animismEditIns) }),
      ...(animismEditCha === "" ? { cha: undefined } : { cha: Number(animismEditCha) }),
      abilities: [...new Set([...animismEditAbilities, ...(profile?.inherentAbilities ?? [])])], typeData,
      generation: { method: spirit.generation?.method ?? "manual", pendingChoices: [...(spirit.generation?.pendingChoices ?? [])], rolls },
    };
    const issues = validateSpirit(candidate).map(issue => issue.message);
    issues.push(...(candidate.generation?.pendingChoices ?? []).filter(choice => !animismChoiceResolved(candidate, choice.id)).map(choice => choice.description));
    return [...new Set(issues)];
  }
  function animismEditAncestorSummary(spirit: SpiritRecord): string {
    const missing = [!animismEditTypeChoice.trim() && "species", animismEditInt === "" && "INT", animismEditCha === "" && "CHA"].filter((item): item is string => !!item);
    const detailsMissing = animismEditAbilities.some(ability => ["Sagacity", "Spellcasting", "Subjugate"].includes(ability)) && !animismEditTypeDetail.trim();
    const data = missing.length ? `Complete the deceased mortal's ${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`}` : "";
    const actions: string[] = [];
    if (animismEditPow === "") actions.push("enter Spirit POW");
    else if (!spiritPowMatchesIntensity(Number(animismEditPow), animismEditIntensity)) actions.push("set Spirit POW within the Intensity range");
    if (animismEditAbilityCountDie === null) {
      actions.push("resolve the ability count and select the required abilities");
    } else {
      const required = animismEditAbilityCountDie + animismEditIntensity;
      const selected = animismEditAbilities.filter(ability => CORE_SPIRIT_RULES[spirit.spiritTypeId]?.selectableAbilities?.includes(ability)).length;
      if (selected !== required) actions.push(`select ${required} ${required === 1 ? "ability" : "abilities"}`);
    }
    if (detailsMissing) actions.push("record details for the selected abilities");
    if (!data && !actions.length) return "All required values are complete.";
    if (data && actions.length) return `${data}, then ${actions.join(" and ")}.`;
    if (data) return `${data}.`;
    const actionText = actions.join(" and ");
    return `${actionText.charAt(0).toUpperCase()}${actionText.slice(1)}.`;
  }
  function saveAnimismSpiritEdit(id: string) {
    const spirit = animismSpirit(id);
    if (!spirit || animismEditPow === "" || !spiritPowMatchesIntensity(animismEditPow, animismEditIntensity)) return;
    if (animismBindingFor(id) && animismEditPow > animismControlLimit) return;
    spirit.intensity = animismEditIntensity;
    spirit.pow = animismEditPow;
    if (animismEditInt !== "") spirit.int = Number(animismEditInt);
    if (animismEditIns !== "") spirit.ins = Number(animismEditIns);
    if (animismEditCha !== "") spirit.cha = Number(animismEditCha);
    if (animismEditAbilityCountDie !== null && CORE_SPIRIT_RULES[spirit.spiritTypeId]?.abilityCount === "1d3+intensity") {
      spirit.generation ??= { method: "manual", pendingChoices: [] };
      spirit.generation.rolls = { ...(spirit.generation.rolls ?? {}), abilityCountDie: [animismEditAbilityCountDie], abilityCount: [animismEditAbilityCountDie + animismEditIntensity] };
    }
    spirit.abilities = [...new Set([...animismEditAbilities, ...(CORE_SPIRIT_RULES[spirit.spiritTypeId]?.inherentAbilities ?? [])])];
    spirit.typeData ??= {};
    const ruleId = CORE_SPIRIT_RULES[spirit.spiritTypeId]?.id;
    if (ruleId) spirit.typeData.ruleId = ruleId;
    if (animismEditTypeChoice) {
      if (["ancestor", "haunt", "nature"].includes(ruleId ?? "")) spirit.typeData.species = animismEditTypeChoice;
      if (ruleId === "nature") { spirit.typeData.variant = animismEditTypeChoice === "regional" ? "regional" : "animal"; spirit.typeData["nature-kind"] = animismEditTypeChoice === "regional" ? "regional" : "animal"; }
      if (ruleId === "elemental") spirit.typeData.element = animismEditTypeChoice;
      if (ruleId === "sickness") spirit.typeData.disease = animismEditTypeChoice;
      if (ruleId === "curse") spirit.typeData["curse-effects"] = animismEditTypeChoice;
      if (ruleId === "predator") spirit.typeData.host = animismEditTypeChoice;
      if (ruleId === "fetch") spirit.typeData.variant = animismEditTypeChoice === "Awakened Fetch" ? "awakened" : "allied";
    }
    if (animismEditTypeDetail) {
      if (ruleId === "haunt") spirit.typeData["haunt-anchor"] = animismEditTypeDetail;
      spirit.typeData.abilityDetails = [animismEditTypeDetail];
    }
    if (spirit.generation) spirit.generation.pendingChoices = spirit.generation.pendingChoices.filter(choice => !animismChoiceResolved(spirit, choice.id));
    spirit.generation ??= { method: "manual", pendingChoices: [] };
    if (spirit.generation.method === "core-generated" && spirit.generation.rolls?.abilityCountDie?.[0] !== undefined) {
      spirit.generation.rolls.abilityCount = [spirit.generation.rolls.abilityCountDie[0] + animismEditIntensity];
    }
    animismEditingId = null;
    updateStatus();
  }
  function openAnimismConfigure() { animismQuery = ""; animismConfigureDialog?.showModal(); }
  function openAnimismManage() { animismSpiritTypeId = ""; animismOtherAttitude = ""; animismSpiritMode = "manual"; animismGeneratedSpirit = null; animismManageDialog?.showModal(); }
  function animismRankSummary(rank?: AnimismRank) {
    if (!rank) return "Choose a rank to see what your Animist can do.";
    const abilities = getTranceCapabilities(rank);
    const actions = [
      abilities.canObserve && "observe and identify spirits",
      abilities.canConverse && "communicate with spirits",
      abilities.canProjectIntoSpiritWorld && "enter the Spirit World",
      abilities.canDrawOrExpelSpirit && "draw or expel spirits",
      abilities.canDragOtherSouls && "affect other souls",
    ].filter((value): value is string => !!value);
    return `${rank} — can ${actions.join(", and ")}.`;
  }
  function hasUnresolvedAnimismGrant() {
    return !!animismTradition?.startingGrants.some(grant => {
      if (grant.kind !== "spirit-ally" && grant.kind !== "bound-spirit") return false;
      return !animismGrantHasSpirit(grant);
    });
  }
  function animismGrantHasSpirit(grant: AnimismStartingGrant) {
    return animismState.spirits.some(spirit => {
      const relationship = grant.kind === "bound-spirit" ? animismBindingFor(spirit.id)?.source
        : animismState.allies.find(ally => ally.spiritId === spirit.id)?.source;
      const matches = grant.spiritId ? spirit.id === grant.spiritId
        : grant.spiritTypeId ? spirit.spiritTypeId === grant.spiritTypeId : relationship === grant.source;
      return matches && (grant.kind !== "bound-spirit" || !!animismBindingFor(spirit.id))
        && (grant.kind !== "spirit-ally" || animismState.allies.some(ally => ally.spiritId === spirit.id));
    });
  }
  function animismId(kind: string) { return `custom:animism-${kind}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }
  function selectAnimismTradition(id: string) {
    animismState.traditionId = id || undefined;
    const selected = animismTraditions.find(item => item.id === id);
    const specialised = animismBinding?.name.startsWith("Binding (") ? animismBinding.name.slice("Binding (".length, -1).trim().toLocaleLowerCase() : "";
    if (selected && specialised === selected.name.toLocaleLowerCase()) animismState.bindingSpecialisation = { skillName: animismBinding!.name, traditionId: id };
    updateStatus();
  }
  function createAnimismTradition() {
    const name = animismTraditionName.trim(); if (!name) return;
    const id = animismId("tradition");
    const tradition: SpiritTradition = { id, name, source: "custom", friendlySpiritTypeIds: [], neutralSpiritTypeIds: [], hostileSpiritTypeIds: [], hostileTraditionIds: [], startingGrants: [], customSpiritTypes: [], customSpiritTemplates: [] };
    animismState.traditions.push(tradition);
    animismState.traditionId = id;
    if (animismBinding?.name.toLocaleLowerCase() === `binding (${name.toLocaleLowerCase()})`) animismState.bindingSpecialisation = { skillName: animismBinding.name, traditionId: id };
    animismTraditionName = "";
    updateStatus();
  }
  function updateAnimismRank(value: string) { animismState.rank = (CORE_ANIMISM_RANKS as readonly string[]).includes(value) ? value as AnimismRank : undefined; updateStatus(); }
  function animismTypeIds(attitude: "friendly" | "neutral" | "hostile") {
    if (!animismTradition) return animismState.accessibleSpiritTypeIds;
    return attitude === "friendly" ? animismTradition.friendlySpiritTypeIds : attitude === "neutral" ? animismTradition.neutralSpiritTypeIds : animismTradition.hostileSpiritTypeIds;
  }
  function setAnimismAccessCategory(attitude: "friendly" | "neutral" | "hostile") { animismPickerAttitude = attitude; animismQuery = ""; }
  function toggleAnimismAccess(id: string) {
    const list = animismTypeIds(animismPickerAttitude);
    const next = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
    if (!animismTradition) animismState.accessibleSpiritTypeIds = next;
    else {
      if (animismPickerAttitude !== "friendly") animismTradition.friendlySpiritTypeIds = animismTradition.friendlySpiritTypeIds.filter(typeId => typeId !== id);
      if (animismPickerAttitude !== "neutral") animismTradition.neutralSpiritTypeIds = animismTradition.neutralSpiritTypeIds.filter(typeId => typeId !== id);
      if (animismPickerAttitude !== "hostile") animismTradition.hostileSpiritTypeIds = animismTradition.hostileSpiritTypeIds.filter(typeId => typeId !== id);
      if (animismPickerAttitude === "friendly") animismTradition.friendlySpiritTypeIds = next;
      else if (animismPickerAttitude === "neutral") animismTradition.neutralSpiritTypeIds = next;
      else animismTradition.hostileSpiritTypeIds = next;
    }
    updateStatus();
  }
  function addAnimismHostileTradition() {
    const name = animismHostileTradition.trim();
    if (!name || !animismTradition || animismTradition.hostileTraditionIds.includes(name)) return;
    animismTradition.hostileTraditionIds = [...animismTradition.hostileTraditionIds, name];
    animismHostileTradition = "";
    updateStatus();
  }
  function createAnimismSpiritType() {
    const name = animismCustomTypeName.trim(); if (!name) return;
    const type: SpiritType = { id: animismId("spirit-type"), name, source: "custom", ...(animismCustomTypeProvenance.trim() ? { provenance: animismCustomTypeProvenance.trim() } : {}), ...(animismCustomTypeDescription.trim() ? { description: animismCustomTypeDescription.trim() } : {}) };
    animismState.customSpiritTypes.push(type);
    if (animismTradition) animismTradition.customSpiritTypes.push(type);
    if (animismCustomTypeNotes.trim()) animismState.spiritTemplates.push({ id: `${type.id}:notes`, name, spiritTypeId: type.id, source: "custom", notes: animismCustomTypeNotes.trim() });
    const list = animismTypeIds(animismPickerAttitude); const next = [...new Set([...list, type.id])];
    if (!animismTradition) animismState.accessibleSpiritTypeIds = next;
    else if (animismPickerAttitude === "friendly") animismTradition.friendlySpiritTypeIds = next;
    else if (animismPickerAttitude === "neutral") animismTradition.neutralSpiritTypeIds = next;
    else animismTradition.hostileSpiritTypeIds = next;
    animismCustomTypeName = ""; animismCustomTypeDescription = ""; animismCustomTypeNotes = ""; animismCustomTypeProvenance = "";
    updateStatus();
  }
  function addAnimismSpirit() {
    if (!animismSpiritTypeId || animismNewBoundInvalid || (!animismSelectedAttitude && !animismOtherAttitude) || animismSpiritMode === "generated" && (!animismGeneratedSpirit || animismNewSpiritIncomplete)) return;
    const grant = animismTradition?.startingGrants.find(item => (item.kind === "spirit-ally" || item.kind === "bound-spirit")
      && !animismGrantHasSpirit(item)
      && (!item.spiritTypeId || item.spiritTypeId === animismSpiritTypeId)
      && (item.kind !== "bound-spirit" || animismSpiritRelationship === "bound")
      && (item.kind !== "spirit-ally" || animismSpiritRelationship === "ally"));
    const id = grant?.spiritId ?? animismId("spirit");
    const attitude = animismSelectedAttitude ?? animismOtherAttitude as SpiritAttitude;
    const spirit: SpiritRecord = animismSpiritMode === "generated" && animismGeneratedSpirit
      ? { ...animismGeneratedSpirit, id, name: animismSpiritName.trim() || animismTypeName(animismSpiritTypeId), source: grant ? "campaign" : animismGeneratedSpirit.source, attitude, notes: animismSpiritNotes.trim() || undefined }
      : { id, name: animismSpiritName.trim() || animismTypeName(animismSpiritTypeId), spiritTypeId: animismSpiritTypeId, source: grant ? "campaign" : "custom", attitude, intensity: Number(animismSpiritIntensity) || 0, pow: Number(animismSpiritPow), ...(animismSpiritInt !== "" ? { int: Number(animismSpiritInt) } : {}), ...(animismSpiritIns !== "" ? { ins: Number(animismSpiritIns) } : {}), ...(animismSpiritCha !== "" ? { cha: Number(animismSpiritCha) } : {}), abilities: animismSelectedAbilityRecords(), typeData: animismNewTypeData(), ...(animismSpiritNotes.trim() ? { notes: animismSpiritNotes.trim() } : {}), generation: { method: "manual", pendingChoices: [] } };
    if (animismSpiritMode === "manual" && animismSelectedRule?.choices) {
      spirit.generation = { method: "manual", pendingChoices: animismSelectedRule.choices.filter(choice => !animismChoiceResolved(spirit, choice.id)).map(choice => ({ ...choice })) };
    }
    animismState.spirits.push(spirit);
    const provenance = (grant?.source ?? animismSpiritSource.trim()) || "character creation";
    if (animismSpiritRelationship === "bound") animismState.bindings.push({ id: animismId("binding"), spiritId: id, vessel: animismVessel, countsAgainstCapacity: true, source: provenance, ...(animismVesselName.trim() ? { objectName: animismVesselName.trim() } : {}), ...(animismVesselDescription.trim() ? { description: animismVesselDescription.trim() } : {}) });
    else animismState.allies.push({ spiritId: id, attitude: "friendly", source: provenance });
    animismSpiritName = ""; animismSpiritNotes = ""; animismVesselName = ""; animismVesselDescription = "";
    animismSpiritSource = ""; animismGeneratedSpirit = null; animismAbilityCountDie = null; animismSpiritAbilities = []; animismSpiritInt = ""; animismSpiritIns = ""; animismSpiritCha = ""; animismTypeChoice = ""; animismTypeDetail = ""; animismOtherAttitude = "";
    updateStatus();
  }
  function removeAnimismRelationship(id: string) {
    animismState.bindings = animismState.bindings.filter(item => item.spiritId !== id);
    animismState.allies = animismState.allies.filter(item => item.spiritId !== id);
    animismState.spirits = animismState.spirits.filter(item => item.id !== id);
    updateStatus();
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
    const next = withStartingSorcerySchool(sorceryState, id);
    sorceryState.startingSchoolId = next.startingSchoolId;
    sorceryState.schoolIds = next.schoolIds;
    sorceryState.schoolAccess = [...sorceryState.schoolAccess.filter(item => item.schoolId !== id), { schoolId: id, sourceType: "custom", ...(sorceryCustomSchoolSource.trim() ? { sourceDescription: sorceryCustomSchoolSource.trim() } : {}) }];
    sorceryCustomSchoolName = ""; sorceryCustomSchoolSource = ""; sorcerySchoolSpellIds = []; sorceryCustomSchoolEditor = false;
    updateStatus();
  }
  function toggleSorcerySchoolSpell(id: string) {
    sorcerySchoolSpellIds = sorcerySchoolSpellIds.includes(id) ? sorcerySchoolSpellIds.filter(item => item !== id) : [...sorcerySchoolSpellIds, id];
  }
  function addConfiguredSorcerySpell(base: SorcerySpell) {
    const subject = sorceryConfigureSubject.trim();
    if (!subject || !base.specialisationPrompt) return;
    const configured = configureCoreSorcerySpell(base, subject);
    if (!sorceryState.configuredSpells.some(item => item.id === configured.id)) sorceryState.configuredSpells.push(configured);
    if (!sorcerySchoolSpellIds.includes(configured.id)) sorcerySchoolSpellIds = [...sorcerySchoolSpellIds, configured.id];
    sorceryConfigureId = null;
    sorceryConfigureSubject = "";
  }
  function openSorcerySchoolPicker() {
    if (!sorceryCustomSchoolEditor) sorcerySchoolSpellIds = [...(sorcerySchool?.source === "custom" ? sorcerySchool.spellIds : [])];
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
        {#if item.discipline !== "Folk Magic" && item.discipline !== "Animism" && item.discipline !== "Mysticism" && item.discipline !== "Sorcery" && item.discipline !== "Theism"}
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
    {#if theismCapability}
      <article class="folk-magic-discipline theism-discipline">
        <div class="folk-magic-heading"><div><h4>Theism</h4>
          <p class="folk-magic-skill">Devotion{#if theismSpecialisation} ({theismSpecialisation}){/if} {theismDevotion}% · Exhort {theismExhort}%</p>
          {#if theismDevotionSkill?.origins.length}<p class="mute folk-magic-provenance">Devotion acquired through {theismDevotionSkill.origins.map(origin => originName[origin]).join(", ")}</p>{/if}
        </div><span class:complete={!theismNeedsSetup} class="magic-status">{theismNeedsSetup ? "Action required" : "Complete"}</span></div>
        <div class="theism-derived">
          <div><b>Miracle Magnitude</b><span>{miracleMagnitude(theismDevotion)}</span></div>
          <div><b>Miracle Intensity</b><span>{miracleIntensity(theismDevotion)}</span></div>
        </div>
        <section class="theism-cult-card" aria-label="Theist cult membership">
          <div><b>{theismCult?.name ?? "No Theist Cult configured"}</b><small>{theismCult?.deity ?? "Choose a cult and deity"}{#if theismCult?.source === "custom"} · Custom{/if}</small></div>
          <div class="theism-pool"><b>Devotional Pool</b><span>{theismMembership?.devotionalPool ?? 0} / {theismMembership ? theismPoolMaximum : 0} MP</span>
            {#if theismMembership}<label class="theism-pool-current">Current<input type="number" min="0" max={theismPoolMaximum} value={theismMembership.devotionalPool} oninput={event => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 0) { theismMembership!.devotionalPool = value; updateStatus(); } }} /></label>{/if}
          </div>
          <div class="theism-cult-rank">{theismMembership?.rank ?? "Rank not set"}</div>
          <button type="button" class="ghost" onclick={openTheismConfigure}>Configure Cult</button>
        </section>
        {#if !theismMembership || !theismCult}<p class="folk-magic-error" role="alert">Configure a Theist Cult.</p>{/if}
        {#if !theismSpecialisation}<p class="folk-magic-error" role="alert">Devotion requires a divine specialisation.</p>{/if}
        {#if theismMembership && theismMembership.devotionalPool > theismPoolMaximum}<p class="folk-magic-error" role="alert">Devotional Pool exceeds the current maximum. Reduce the current pool to {theismPoolMaximum} MP.</p>{/if}
        <section class="theism-miracles" aria-label="Starting miracles">
          <div class="theism-miracles-heading"><div><h5>Miracles — choose up to {theismLimit}</h5><small>{theismKnownIds.length} / {theismLimit} known</small></div></div>
          {#if theismInvalidIds.length}
            <div class="theism-invalid" role="alert"><b>Action required</b><span>{theismKnownIds.length > theismLimit ? `Choose no more than ${theismLimit} starting miracles.` : `${theismInvalidIds.length} known ${theismInvalidIds.length === 1 ? "miracle is" : "miracles are"} no longer available at your current cult rank or offering.`}</span>
              {#each theismInvalidIds as id (id)}{@const miracle = CORE_THEIST_MIRACLES.find(item => item.id === id)}<div><span>{theismCult?.miracles.find(item => item.miracleId === id)?.name ?? miracle?.name ?? id}</span><button type="button" class="ghost" onclick={() => removeInvalidTheismMiracle(id)}>Remove</button></div>{/each}
            </div>
          {/if}
          {#if !theismCult || !theismMembership}<p class="mute">Configure a cult to see its offered miracles.</p>
          {:else if !theismAvailableMiracles.length}<p class="mute">No offered miracles meet this cult rank.</p>
          {:else}<ul class="theism-miracle-list">{#each theismAvailableMiracles as item (item.miracle.id)}{@const selected = theismKnownIds.includes(item.miracle.id)}<li class:selected>
            <label><input type="checkbox" checked={selected} disabled={!selected && theismKnownIds.length >= theismLimit} onchange={() => toggleTheismMiracle(item.miracle.id)} /><span><b>{item.offering.name ?? item.miracle.name}</b><small>{effectiveMiracleMinimumRank(item.miracle, item.offering)} · {item.miracle.mpCost} MP · {item.miracle.exhortationTime}</small></span></label>
            <button type="button" class="ghost theism-detail-button" aria-label="Details for {item.offering.name ?? item.miracle.name}" aria-expanded={theismMiracleDetails.includes(item.miracle.id)} aria-controls="theism-miracle-detail-{item.miracle.id}" onclick={() => toggleTheismMiracleDetails(item.miracle.id)}>Details</button>
            {#if theismMiracleDetails.includes(item.miracle.id)}<div class="theism-miracle-detail" id="theism-miracle-detail-{item.miracle.id}"><small class="theism-miracle-traits">{item.miracle.traits.join(" · ")}</small><p>{item.miracle.description}</p></div>{/if}
          </li>{/each}</ul>{/if}
        </section>
      </article>
    {/if}
    {#if animismCapability}
      <article class="folk-magic-discipline animism-discipline">
        <div class="folk-magic-heading"><div><h4>Animism</h4>
          <p class="folk-magic-skill">Binding {animismBinding?.value ?? 0}%{#if animismTrance} · Trance {animismTrance.value}%{/if}</p>
          {#if animismBinding?.origins.length}<p class="mute folk-magic-provenance">Binding acquired through {animismBinding.origins.map(origin => originName[origin]).join(", ")}</p>{/if}
        </div><span class:complete={!animismNeedsSetup} class="magic-status">{animismNeedsSetup ? "Action required" : "Complete"}</span></div>
        <div class="animism-derived">
          <div><b>Spirit Damage</b><span>{getSpiritDamage(animismBinding?.value ?? 0) ?? "—"}</span></div>
          <div><b>Spirit Control Limit</b><span>POW {animismBinding ? getMaximumControllableSpiritPow(animismBinding.value) : "—"}</span><small>You can control or bind spirits up to this POW.</small></div>
          <div class:over-capacity={animismBound.length > animismCapacity}><b>Binding Capacity</b><span>{animismBound.length} / {animismCapacity} spirits</span></div>
        </div>
        <details class="mysticism-details"><summary>Animism details</summary>
          <p>{animismRankSummary(animismRank)}</p>
          <p>Your rank and CHA determine how many spirits you can have bound at once. Capacity does not grant free starting spirits.</p>
          <p>Spirit Damage follows Binding. Spirit Control Limit is three times your Binding critical range. Accessible types are kinds of spirits your Tradition knows; allies are specific friendly relationships, while bound spirits also occupy Binding Capacity.</p>
        </details>
        <p class="animism-rank-summary"><b>{animismRank ?? "Rank unresolved"}</b>{animismRank ? ` · ${animismRankSummary(animismRank).replace(`${animismRank} — `, "")}` : ""}</p>
        {#if animismTradition?.startingGrants.some(grant => grant.kind === "spirit-ally" || grant.kind === "bound-spirit")}
          <p class="folk-magic-suggestion-note">This Tradition grants a starting spirit relationship. Add it under Manage Spirits to finish setup.</p>
        {/if}
        {#if animismState.reconciliationIssues.length}
          <div class="animism-issues" role="alert"><b>Action required</b>{#each animismState.reconciliationIssues as issue}<p>{issue.message}</p>{/each}</div>
        {/if}
        {#if animismUnresolvedGrant}<p class="folk-magic-error" role="alert">A required starting spirit choice is unresolved.</p>{/if}
        <section class="animism-access">
          <h5>Spirit Tradition</h5>
          {#if animismTradition}<b class="animism-tradition-name">{animismTradition.name}</b>{/if}
          {#if animismFriendlyTypes.length || animismNeutralTypes.length || animismHostileTypes.length}
            <p>{animismFriendlyTypes.length} friendly · {animismNeutralTypes.length} known neutral{#if animismHostileTypes.length} · {animismHostileTypes.length} hostile{/if}{#if animismTradition?.hostileTraditionIds.length} · {animismTradition.hostileTraditionIds.length} hostile {animismTradition.hostileTraditionIds.length === 1 ? "tradition" : "traditions"}{/if}</p>
          {:else}<p>No spirit types have been defined yet.</p>{/if}
          <button type="button" class="ghost" onclick={openAnimismConfigure}>Configure Tradition</button>
        </section>
        <section class="animism-relations">
          <h5>Your Spirits</h5>
          {#if animismBound.length > animismCapacity}<p class="folk-magic-error" role="alert">Binding Capacity — {animismBound.length} / {animismCapacity} · Action required. Resolve the excess; no spirits have been removed.</p>{/if}
          {#each animismRelationshipRows as row (row.key)}
            {@const spirit = row.spirit!}
            <div class="animism-row"><div><b>{spirit.name}</b><small>{animismTypeName(spirit.spiritTypeId)} · {row.kind === "BOUND" ? "Bound Spirit" : "Ally"} · Tradition attitude: {animismAttitudeForSpirit(spirit)}{animismIndividualAttitudeSummary(spirit)} · Intensity {spirit.intensity ?? "Action required"}</small><small>{animismStatisticSummary(spirit)}</small>{#if spirit.abilities.length}<small>Abilities: {spirit.abilities.join(", ")}</small>{/if}{#if row.vessel}<small>Binding: {row.vessel}</small>{/if}{#if animismEditingId !== spirit.id && animismRecordIssues(spirit).length}<small class="folk-magic-error" role="alert">Action Required — {animismRecordIssues(spirit).join(" ")}</small>{/if}{#each animismState.reconciliationIssues.filter(issue => issue.spiritId === spirit.id) as issue}<small class="folk-magic-error" role="alert">⚠ {issue.message}</small>{/each}</div><div><button type="button" class="ghost" onclick={() => animismEditingId === spirit.id ? animismEditingId = null : editAnimismSpirit(spirit.id)}>{animismEditingId === spirit.id ? "Cancel edit" : "Edit"}</button> <button type="button" class="ghost" onclick={() => animismDetailsId = animismDetailsId === spirit.id ? null : spirit.id}>Details</button></div>
              {#if animismEditingId === spirit.id}
                {@const ancestor = CORE_SPIRIT_RULES[spirit.spiritTypeId]?.id === "ancestor"}
                {@const abilityCount = animismEditAbilityCountDie === null ? null : animismEditAbilityCountDie + animismEditIntensity}
                {@const selectedAbilityCount = animismEditAbilities.filter(ability => CORE_SPIRIT_RULES[spirit.spiritTypeId]?.selectableAbilities?.includes(ability)).length}
                {@const ancestorSummary = ancestor ? animismEditAncestorSummary(spirit) : ""}
                <div class="animism-spirit-editor" class:ancestor-editor={ancestor}>
                  {#if ancestor}
                    <div class="animism-edit-status"><b>Ancestor spirit · {ancestorSummary === "All required values are complete." ? "Complete" : "Action required"}</b><span>{ancestorSummary}</span></div>
                    <div class="animism-edit-roll"><b>Ability count:</b><span>{#if abilityCount !== null}1d3 ({animismEditAbilityCountDie}) + Intensity {animismEditIntensity} = {abilityCount}{:else}1d3 + Intensity {animismEditIntensity} · unresolved{/if}</span><button type="button" class="ghost" onclick={() => rerollAnimismEditAbilityCount(spirit.id)}>{animismEditAbilityCountDie === null ? "Roll" : "Reroll"}</button></div>
                    {#if spirit.generation?.method === "legacy" || !spirit.generation}<small class="animism-migration-note">Migrated record: missing values have not been generated automatically.</small>{/if}
                  {/if}
                  {#if !ancestor}{#each animismEditIssues(spirit) as issue}<small class="folk-magic-error">{issue}</small>{/each}{/if}
                  <div class="animism-edit-core">
                    <label>Intensity<input type="number" min="0" max="99" value={animismEditIntensity} oninput={event => setAnimismEditIntensity(Number(event.currentTarget.value))} /><small>POW {spiritIntensityBand(animismEditIntensity).minPow}–{spiritIntensityBand(animismEditIntensity).maxPow}</small></label>
                    <label>Spirit POW<input type="number" min={spiritIntensityBand(animismEditIntensity).minPow} max={spiritIntensityBand(animismEditIntensity).maxPow} value={animismEditPow} oninput={event => { const value = event.currentTarget.value; if (value === "") animismEditPow = ""; else setAnimismEditPow(Number(value)); }} /></label>
                  </div>
                  {#if ancestor}
                    <fieldset class="animism-edit-deceased"><legend>Deceased mortal</legend><label>Species<input bind:value={animismEditTypeChoice} placeholder="Species of the deceased" /></label><div class="animism-characteristics"><label>INT<input type="number" min="1" max="30" bind:value={animismEditInt} /></label><label>CHA<input type="number" min="1" max="30" bind:value={animismEditCha} /></label></div></fieldset>
                    {#if animismEditAbilities.some(ability => ["Sagacity", "Spellcasting", "Subjugate"].includes(ability))}<label class="animism-edit-details">Selected ability details<input bind:value={animismEditTypeDetail} placeholder="Sagacity skill, Folk Magic spells, or lesser-Intensity ally" /></label>{/if}
                  {:else if CORE_SPIRIT_RULES[spirit.spiritTypeId]?.characteristics.int || CORE_SPIRIT_RULES[spirit.spiritTypeId]?.characteristics.ins || CORE_SPIRIT_RULES[spirit.spiritTypeId]?.characteristics.cha}
                    <div class="animism-characteristics">{#if CORE_SPIRIT_RULES[spirit.spiritTypeId]?.characteristics.int}<label>INT<input type="number" min="1" max="30" bind:value={animismEditInt} /></label>{/if}{#if CORE_SPIRIT_RULES[spirit.spiritTypeId]?.characteristics.ins}<label>INS<input type="number" min="1" max="30" bind:value={animismEditIns} /></label>{/if}{#if CORE_SPIRIT_RULES[spirit.spiritTypeId]?.characteristics.cha}<label>CHA<input type="number" min="1" max="30" bind:value={animismEditCha} /></label>{/if}</div>
                  {/if}
                  {#if !ancestor && CORE_SPIRIT_RULES[spirit.spiritTypeId]?.choices?.length}<label>Type-specific choice<input bind:value={animismEditTypeChoice} placeholder="Species, regional, element, disease, or host" /></label><label>Choice details / anchor<input bind:value={animismEditTypeDetail} /></label>{/if}
                  {#if CORE_SPIRIT_RULES[spirit.spiritTypeId]?.selectableAbilities?.length}
                    <fieldset class="animism-ability-picker"><legend>Abilities{#if ancestor && abilityCount !== null} — choose {abilityCount}{/if}</legend>{#if ancestor}<small aria-live="polite">{selectedAbilityCount} / {abilityCount ?? "?"} selected</small>{/if}{#each CORE_SPIRIT_RULES[spirit.spiritTypeId].selectableAbilities as ability}<label><input type="checkbox" checked={animismEditAbilities.includes(ability)} onchange={() => animismEditAbilities = animismEditAbilities.includes(ability) ? animismEditAbilities.filter(item => item !== ability) : [...animismEditAbilities, ability]} />{ability}</label>{/each}</fieldset>
                  {/if}
                  {#if animismBindingFor(spirit.id) && animismEditPow !== "" && animismEditPow > animismControlLimit}<small class="folk-magic-error" role="alert">Bound spirits must be at or below the Spirit Control Limit (POW {animismControlLimit}).</small>{/if}
                  <button type="button" class="primary" disabled={animismEditPow === "" || !spiritPowMatchesIntensity(Number(animismEditPow), animismEditIntensity) || !!animismBindingFor(spirit.id) && Number(animismEditPow) > animismControlLimit || spirit.spiritTypeId === "core:animism:ancestor" && spirit.generation?.method === "core-generated" && animismEditIssues(spirit).length > 0} onclick={() => saveAnimismSpiritEdit(spirit.id)}>Save Spirit</button>
                </div>
              {/if}
              {#if animismDetailsId === spirit.id}<p>{spirit.notes || "No additional notes."}{#if spirit.pow !== undefined} · POW {spirit.pow}{/if}{#if spirit.abilities.length} · {spirit.abilities.join(", ")}{/if}{#if animismBindingFor(spirit.id)?.description} · {animismBindingFor(spirit.id)?.description}{/if}</p>{/if}</div>
          {:else}<p class="mute">No spirit allies or bound spirits.</p>{/each}
          <button type="button" class="ghost" onclick={openAnimismManage}>Manage Spirits</button>
        </section>
      </article>
    {/if}
    {#if animismCapability}
      <dialog class="folk-magic-picker animism-workflow" bind:this={animismConfigureDialog} aria-labelledby="animism-configure-title">
        <div class="folk-magic-picker-content">
          <header><div><h2 id="animism-configure-title">Configure Tradition</h2><p>Set your Tradition and the spirits it knows.</p></div><button type="button" class="ghost" onclick={() => animismConfigureDialog?.close()}>Close</button></header>
          <label class="mysticism-path">Tradition
            <select value={animismState.traditionId ?? ""} onchange={event => selectAnimismTradition(event.currentTarget.value)}>
              <option value="">Choose a campaign or custom Tradition</option>
              {#each animismTraditions as tradition (tradition.id)}<option value={tradition.id}>{tradition.name}{tradition.source === "custom" ? " · Custom" : ""}</option>{/each}
            </select>
          </label>
          {#if !animismTradition}<form class="folk-magic-custom-form animism-form" onsubmit={event => { event.preventDefault(); createAnimismTradition(); }}><h5>Create custom Tradition</h5><label>Tradition name<input bind:value={animismTraditionName} maxlength="100" required /></label><button type="submit" class="primary" disabled={!animismTraditionName.trim()}>Create custom Tradition</button></form>{/if}
          {#if animismBinding?.name.startsWith("Binding (") && animismTradition}<p class="mysticism-path-info">Binding specialisation: {animismBinding.name}</p>{/if}
          <label class="mysticism-path">Rank
            <select value={animismRank ?? ""} onchange={event => updateAnimismRank(event.currentTarget.value)}><option value="">Choose rank</option>{#each CORE_ANIMISM_RANKS as rank}<option value={rank}>{rank}</option>{/each}</select>
          </label>
          <p class="animism-rank-summary">{animismRankSummary(animismRank)}</p>
          {#if animismTradition?.description || animismTradition?.notes}<p class="mysticism-path-info">{animismTradition.description ?? animismTradition.notes}</p>{/if}
          <section class="animism-config-section"><h3>Spirit types</h3>
            <div class="animism-category-tabs" aria-label="Spirit type category">{#each ["friendly", "neutral", "hostile"] as category}<button type="button" class:active={animismPickerAttitude === category} class="ghost" onclick={() => setAnimismAccessCategory(category as "friendly" | "neutral" | "hostile")}>{category === "friendly" ? "Friendly" : category === "neutral" ? "Known neutral" : "Hostile"}</button>{/each}</div>
            <input class="folk-magic-search" bind:value={animismQuery} placeholder="Search spirit types…" aria-label="Search spirit types" />
            <ul class="folk-magic-picker-list">{#each animismPickerTypes as type (type.id)}{@const chosen = animismTypeIds(animismPickerAttitude).includes(type.id)}<li class:selected={chosen}><button type="button" class="folk-magic-spell-choice" onclick={() => toggleAnimismAccess(type.id)}><span class="folk-magic-check">{chosen ? "✓" : "+"}</span><span><b>{type.name}</b><small>{type.source === "custom" ? "Custom type" : "Core spirit type"}{#if type.provenance} · {type.provenance}{/if}{#if type.description} · {type.description}{/if}</small></span></button></li>{:else}<li class="mute folk-magic-no-results">No spirit types match this search.</li>{/each}</ul>
          </section>
          {#if animismTradition}<section class="animism-config-section"><h3>Hostile traditions</h3><p>{animismTradition.hostileTraditionIds.length ? animismTradition.hostileTraditionIds.join(", ") : "None recorded."}</p><form class="animism-hostile-form" onsubmit={event => { event.preventDefault(); addAnimismHostileTradition(); }}><label>Add hostile Tradition<input bind:value={animismHostileTradition} maxlength="100" placeholder="Tradition or clan name" /></label><button type="submit" class="ghost" disabled={!animismHostileTradition.trim()}>Add</button></form></section>{/if}
          <form class="folk-magic-custom-form animism-form" onsubmit={event => { event.preventDefault(); createAnimismSpiritType(); }}><h5>Create custom spirit type</h5><label>Name<input bind:value={animismCustomTypeName} maxlength="100" required /></label><label>Category / description<textarea bind:value={animismCustomTypeDescription} rows="2" maxlength="300" placeholder="Optional"></textarea></label><label>Typical abilities / notes<textarea bind:value={animismCustomTypeNotes} rows="2" maxlength="300" placeholder="Optional"></textarea></label><label>Source / provenance<input bind:value={animismCustomTypeProvenance} maxlength="120" placeholder="Campaign book, clan lore…" /></label><button type="submit" class="primary" disabled={!animismCustomTypeName.trim()}>Create and add type</button></form>
        </div>
      </dialog>
      <dialog class="folk-magic-picker animism-workflow" bind:this={animismManageDialog} aria-labelledby="animism-manage-title">
        <div class="folk-magic-picker-content">
          <header><div><h2 id="animism-manage-title">Manage Spirits</h2><p>{animismBound.length} / {animismCapacity} spirits bound</p></div><button type="button" class="ghost" onclick={() => animismManageDialog?.close()}>Close</button></header>
          {#if animismRelationshipRows.length}<section class="animism-config-section"><h3>Your Spirits</h3>{#each animismRelationshipRows as row (row.key)}{@const spirit = row.spirit!}{@const issues = animismRecordIssues(spirit)}<div class="animism-row"><div><b>{spirit.name}</b><small>{animismTypeName(spirit.spiritTypeId)} · {row.kind === "BOUND" ? "Bound Spirit" : "Ally"} · Tradition attitude: {animismAttitudeForSpirit(spirit)}{animismIndividualAttitudeSummary(spirit)} · Intensity {spirit.intensity ?? "Action required"}</small><small>{animismStatisticSummary(spirit) || "Core characteristics not recorded."}</small>{#if spirit.abilities.length}<small>Abilities: {spirit.abilities.join(", ")}</small>{/if}{#if row.vessel}<small>Binding: {row.vessel}{#if animismBindingFor(spirit.id)?.description} — {animismBindingFor(spirit.id)?.description}{/if}</small>{/if}{#if issues.length}<small class="folk-magic-error" role="alert">Action Required · {issues.join(" ")}</small>{/if}<details class="animism-spirit-details"><summary>Advanced details</summary><p>{spirit.notes || "No additional notes."}</p>{#if spirit.generation?.rolls}<p>Generation rolls: {Object.entries(spirit.generation.rolls).map(([key, values]) => `${key.toUpperCase()} ${values.join(", ")}`).join(" · ")}</p>{/if}</details></div><button type="button" class="ghost" aria-label="Remove {spirit.name}" onclick={() => removeAnimismRelationship(spirit.id)}>{row.kind === "BOUND" ? "Release" : "Remove"}</button></div>{/each}</section>{/if}
          <form class="folk-magic-custom-form animism-form" onsubmit={event => { event.preventDefault(); addAnimismSpirit(); }}>
            <h5>Add Spirit</h5>
            <label>Spirit type<select bind:value={animismSpiritTypeId} required onchange={event => selectAnimismSpiritType(event.currentTarget.value)}><option value="">Choose a spirit type</option><optgroup label="Friendly to your Tradition">{#each animismFriendlyTypes as id}<option value={id}>{animismTypeName(id)}</option>{/each}</optgroup><optgroup label="Known neutral">{#each animismNeutralTypes as id}<option value={id}>{animismTypeName(id)}</option>{/each}</optgroup><optgroup label="Hostile">{#each animismHostileTypes as id}<option value={id}>{animismTypeName(id)}</option>{/each}</optgroup><optgroup label="Other spirit types — not known through this Tradition">{#each animismSpiritTypes.filter(type => !animismVisibleTypes.includes(type.id)) as type}<option value={type.id}>{type.name}</option>{/each}</optgroup></select></label>
            {#if animismSpiritTypeId}<p class:folk-magic-error={animismSelectedAttitude === "hostile"} class="animism-attitude-note"><b>Tradition attitude/access:</b> {animismAttitudeLabel(animismSelectedAttitude)}.{#if animismSelectedAttitude === "hostile"} This spirit type is hostile to your Tradition; that is significant under Core Animism.{:else if !animismSelectedAttitude} This type is outside your Tradition's known types. Core Animism permits it; choose its actual attitude explicitly.{:else} This describes how your Tradition regards the type, not your individual relationship with this spirit.{/if}</p>{/if}
            {#if animismSpiritTypeId && !animismSelectedAttitude}<label>Actual attitude for this spirit<select bind:value={animismOtherAttitude} required><option value="">Choose Friendly, Neutral, or Hostile</option><option value="friendly">Friendly</option><option value="neutral">Neutral</option><option value="hostile">Hostile</option></select></label>{/if}
            <label>Your relationship<select bind:value={animismSpiritRelationship}><option value="ally">Ally</option><option value="bound">Bound Spirit</option></select><small>Ally or Bound Spirit is your relationship with this individual; it is separate from Tradition attitude.</small></label>
            <label>Name (optional)<input bind:value={animismSpiritName} maxlength="100" /></label>
            <label>Intensity<input type="number" min="0" max="99" value={animismSpiritIntensity} oninput={event => { setAnimismIntensity(Number(event.currentTarget.value)); animismGeneratedSpirit = null; }} /><small>Intensity {animismSpiritIntensity} · typically POW {animismSpiritPowBand.minPow}–{animismSpiritPowBand.maxPow}</small></label>
            <label>Spirit POW<input type="number" min={animismSpiritPowBand.minPow} max={animismSpiritPowBand.maxPow} value={animismSpiritPow} oninput={event => { setAnimismPow(Number(event.currentTarget.value)); animismGeneratedSpirit = null; }} /></label>
            {#if animismSelectedRule}<section class="animism-type-fields"><h6>{animismTypeName(animismSpiritTypeId)} choices</h6>
              {#if animismSelectedRule.id === "nature"}<label>Nature spirit kind<select bind:value={animismNatureVariant} onchange={() => animismGeneratedSpirit = null}><option value="animal">Animal or plant species</option><option value="regional">Region (Core characteristic rolls apply)</option></select></label>{#if animismNatureVariant === "animal"}<label>Species<input bind:value={animismTypeChoice} oninput={() => animismGeneratedSpirit = null} placeholder="e.g. wolf or oak" /></label><div class="animism-characteristics"><label>Species INS<input type="number" min="1" max="30" bind:value={animismSpiritIns} oninput={() => animismGeneratedSpirit = null} /></label><label>Species CHA<input type="number" min="1" max="30" bind:value={animismSpiritCha} oninput={() => animismGeneratedSpirit = null} /></label></div>{/if}
              {:else if ["ancestor", "haunt"].includes(animismSelectedRule.id)}<label>Deceased mortal's species<input bind:value={animismTypeChoice} oninput={() => animismGeneratedSpirit = null} placeholder="e.g. human" />{#if animismSelectedRule.id === "ancestor"}<small>Record the deceased's species; enter that species' INT and CHA below. Existing records remain incomplete until these values are supplied.</small>{/if}</label>
              {:else if animismSelectedRule.id === "elemental"}<label>Element or natural force<select bind:value={animismTypeChoice} onchange={() => animismGeneratedSpirit = null}><option value="">Choose element</option>{#each ["Earth", "Air", "Fire", "Water", "Darkness", "Other natural force"] as option}<option>{option}</option>{/each}</select></label>
              {:else if ["curse", "sickness"].includes(animismSelectedRule.id)}<label>Disease or curse effects<input bind:value={animismTypeChoice} oninput={() => animismGeneratedSpirit = null} /></label>
              {:else if animismSelectedRule.id === "predator"}<label>Host creature<input bind:value={animismTypeChoice} oninput={() => animismGeneratedSpirit = null} placeholder="Creature and relevant host characteristics" /></label>
              {:else if animismSelectedRule.id === "fetch"}<label>Fetch kind<select bind:value={animismTypeChoice} onchange={() => animismGeneratedSpirit = null}><option value="">Choose kind</option><option>Awakened Fetch</option><option>Allied Fetch</option></select></label>{/if}
              {#if animismSelectedRule.id === "haunt"}<label>Haunt anchor<input bind:value={animismTypeDetail} oninput={() => animismGeneratedSpirit = null} placeholder="Place, object, or event" /></label>{/if}
              {#if animismSelectedRule.id === "ancestor" && animismSpiritAbilities.some(ability => ["Sagacity", "Spellcasting", "Subjugate"].includes(ability))}<label>Selected ability details<input bind:value={animismTypeDetail} oninput={() => animismGeneratedSpirit = null} placeholder="Sagacity skill, Folk Magic spells, or lesser-Intensity ally" /><small>Required when one of these abilities is selected.</small></label>{/if}
              {#if animismSelectedRule.id === "nature" && animismSpiritAbilities.some(ability => ["Bless", "Endowment"].includes(ability))}<label>Selected ability details<input bind:value={animismTypeDetail} oninput={() => animismGeneratedSpirit = null} placeholder="Attribute or Skill blessed, or creature trait granted" /></label>{/if}
              {#if animismSelectedRule.id === "predator" && animismSpiritAbilities.includes("Bless")}<label>Bless targets<input bind:value={animismTypeDetail} oninput={() => animismGeneratedSpirit = null} placeholder="Attribute or creature value targeted" /></label>{/if}
              {#if animismSelectedRule.selectableAbilities?.length}<fieldset class="animism-ability-picker"><legend>Selected abilities</legend>{#if animismSelectedRule.id === "ancestor"}<small>Core rule: roll 1d3 + Intensity. Select exactly the resulting number of abilities.</small>{#if animismAbilityCountDie !== null}<small aria-live="polite">{animismSpiritAbilities.length} / {animismAbilityCountDie + Number(animismSpiritIntensity)} required abilities selected.</small>{/if}{/if}{#if animismSelectedRule.id !== "ancestor" && animismSelectedRule.abilityCount}<small>Core requirement: {animismSelectedRule.abilityCount === "intensity" ? `choose ${animismSpiritIntensity}` : animismSelectedRule.abilityCount === "up-to-intensity" ? `choose up to ${animismSpiritIntensity}` : animismSelectedRule.abilityCount === "1d3+intensity" ? "roll 1d3 + Intensity" : "choose as required"}.</small>{/if}{#each animismSelectedRule.selectableAbilities as ability}<label><input type="checkbox" checked={animismSpiritAbilities.includes(ability)} onchange={() => toggleAnimismAbility(ability)} />{ability}</label>{/each}</fieldset>{/if}
              {#if animismSelectedRule.characteristics.int || animismSelectedRule.characteristics.ins || animismSelectedRule.characteristics.cha}<div class="animism-characteristics">{#if animismSelectedRule.characteristics.int}<label>{animismSelectedRule.id === "ancestor" ? "Ancestor INT (from species)" : "INT"}<input type="number" min="1" max="30" bind:value={animismSpiritInt} oninput={() => animismGeneratedSpirit = null} /></label>{/if}{#if animismSelectedRule.characteristics.ins}<label>INS<input type="number" min="1" max="30" bind:value={animismSpiritIns} oninput={() => animismGeneratedSpirit = null} /></label>{/if}{#if animismSelectedRule.characteristics.cha}<label>{animismSelectedRule.id === "ancestor" ? "Ancestor CHA (from species)" : "CHA"}<input type="number" min="1" max="30" bind:value={animismSpiritCha} oninput={() => animismGeneratedSpirit = null} /></label>{/if}</div>{/if}
            </section>{/if}
            <div class="animism-generation">{#if animismSelectedRule}<label>Generation mode<select bind:value={animismSpiritMode}><option value="generated">Generate using Core rules</option><option value="manual">Enter manually</option></select><small>Core generation is the default for Ancestor spirits. Manual entry is available for campaign-defined records.</small></label>{:else}<p>Custom spirit records use manual entry.</p>{/if}{#if animismSpiritMode === "generated" && animismSelectedRule?.abilityCount === "1d3+intensity"}<div class="animism-roll-result"><b>Ancestor ability count</b>{#if animismAbilityCountDie !== null}<span>1d3 rolled {animismAbilityCountDie} + Intensity {animismSpiritIntensity} = {animismAbilityCountDie + Number(animismSpiritIntensity)} abilities</span>{:else}<span>Roll 1d3 to resolve the required ability count.</span>{/if}<button type="button" class="ghost" onclick={rollAnimismAbilityCount}>{animismAbilityCountDie === null ? "Roll 1d3" : "Reroll ability count"}</button></div>{/if}{#if animismSpiritMode === "generated"}<button type="button" class="ghost" disabled={!animismSelectedRule || animismSelectedRule.id === "ancestor" && animismAbilityCountDie === null} onclick={generateAnimismSpirit}>Generate using Core rules</button>{/if}</div>
            {#if animismGeneratedSpirit}<div class="animism-generated-preview"><b>Generated Core record</b><p>{animismStatisticSummary(animismGeneratedSpirit) || "Characteristics pending."}</p><p>Abilities: {animismGeneratedSpirit.abilities.join(", ") || "None selected"}</p>{#if animismNewSpiritIncomplete}<div class="folk-magic-error" role="alert"><b>Action Required</b>{#each animismNewSpiritIssues as issue}<p>{issue.message}</p>{/each}{#each animismGeneratedSpirit.generation?.pendingChoices ?? [] as choice}<p>{choice.description}</p>{/each}</div>{/if}</div>{/if}
            {#if animismNewBoundInvalid}<div class="folk-magic-error" role="alert"><b>SPIRIT TOO POWERFUL TO BIND</b><p>Your Binding {animismBinding?.value ?? 0}% allows you to control spirits up to POW {animismControlLimit}. This spirit is POW {animismCandidatePow ?? "unresolved"}.</p></div>{/if}
            {#if animismSpiritRelationship === "bound"}<fieldset class="animism-vessel"><legend>Where is the spirit bound?</legend><label>Vessel<select bind:value={animismVessel}><option value="fetish/object">Fetish / object</option><option value="place">Place</option><option value="creature">Creature</option><option value="campaign-defined">Custom / campaign-defined</option></select></label>{#if animismVessel === "fetish/object"}<label>Object<input bind:value={animismVesselName} maxlength="100" placeholder="e.g. Bear-claw necklace" /></label>{:else}<label>Vessel description<input bind:value={animismVesselDescription} maxlength="160" placeholder={animismVessel === "place" ? "Place where the spirit is bound" : animismVessel === "creature" ? "Creature carrying the spirit" : "Campaign-defined vessel"} /></label>{/if}</fieldset>{/if}
            <details><summary>Optional provenance and notes</summary><label>Source / provenance<input bind:value={animismSpiritSource} maxlength="120" placeholder="Campaign, career grant, tradition…" /></label><label>Notes<textarea bind:value={animismSpiritNotes} rows="2"></textarea></label></details>
            {#if animismSpiritMode === "generated" && animismGeneratedSpirit && animismNewSpiritIncomplete}<div class="folk-magic-error" role="alert"><b>Complete this Core spirit record</b>{#each animismNewSpiritIssues as issue}<p>{issue.message}</p>{/each}{#each animismGeneratedSpirit.generation?.pendingChoices ?? [] as choice}<p>{choice.description}</p>{/each}</div>{/if}
            <button type="submit" class="primary" disabled={!animismSpiritTypeId || animismNewBoundInvalid || (!animismSelectedAttitude && !animismOtherAttitude) || animismSpiritMode === "generated" && (!animismGeneratedSpirit || animismNewSpiritIncomplete)}>Add Spirit</button>
          </form>
          <p class="folk-magic-suggestion-note">Zero bound spirits is valid. Allies do not use Binding Capacity.</p>
        </div>
      </dialog>
    {/if}
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
          <small class="sorcery-derived">Intensity {sorceryDerived.intensity} · {sorceryDerived.shapingPoints} Shaping Points · Memorisation limit {sorceryDerived.memorisedSpellCapacity} spells</small>
        </div>
        <details class="mysticism-details sorcery-help"><summary>Sorcery details</summary>
          <p>Intensity is based on Invocation. Shaping Points are based on Shaping and modify casting parameters during play; you do not allocate them during character creation.</p>
          <p>A sorcerer can keep up to their INT ({sorceryDerived.memorisedSpellCapacity}) spells memorised at one time. This is separate from the {sorceryEntitlement.count} starting {sorceryEntitlement.count === 1 ? "spell" : "spells"} granted by Invocation. Changing memorised spells later is a study and learning concern, not another character-creation allocation.</p>
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

<dialog class="folk-magic-picker theism-configure-dialog" bind:this={theismConfigureDialog} aria-labelledby="theism-configure-title">
  <div class="folk-magic-picker-content">
    <header><h2 id="theism-configure-title">Configure Theist Cult</h2><p>Set one cult membership and the miracles it offers.</p></header>
    <label class="mysticism-path">Start from a cult
      <select value={theismCultChoice} onchange={event => chooseTheismCult(event.currentTarget.value)}>
        <option value="">Custom cult…</option>
        {#each CORE_THEIST_CULTS as cult (cult.id)}<option value={cult.id}>{cult.name} · Core preset</option>{/each}
        {#each theismState.customCults as cult (cult.id)}<option value={cult.id}>{cult.name} · Custom</option>{/each}
      </select>
    </label>
    <div class="theism-config-fields"><label>Cult name<input bind:value={theismCultName} maxlength="100" placeholder="Cult of Myceras" required /></label><label>Deity / divine group / pantheon<input bind:value={theismDeity} maxlength="100" placeholder="Myceras" required /></label>
      <label>Theist rank<select bind:value={theismRankDraft}>{#each THEIST_RANKS as rank}<option value={rank}>{rank}</option>{/each}</select><small>Rank is an explicit campaign choice; it does not rise automatically with Devotion.</small></label>
    </div>
    <section class="theism-offer-editor"><h3>Cult miracle availability</h3><p class="mute">Choose offerings from the Core catalogue. Set a minimum-rank override only when this cult differs from the Core rank.</p>
      <ul class="folk-magic-picker-list">{#each CORE_THEIST_MIRACLES as miracle (miracle.id)}{@const offer = theismOfferDraft.find(item => item.miracleId === miracle.id)}<li class:selected={!!offer}>
        <label class="theism-offer-choice"><input type="checkbox" checked={!!offer} onchange={() => toggleTheismOffering(miracle.id)} /><span><b>{miracle.name}</b><small>Core minimum: {miracle.minimumRank}</small></span></label>
        {#if offer}<label class="theism-rank-override">Minimum rank<select value={offer.minimumRank ?? "default"} onchange={event => setTheismOfferingRank(miracle.id, event.currentTarget.value)}><option value="default">Core · {miracle.minimumRank}</option>{#each THEIST_RANKS as rank}<option value={rank}>{rank}</option>{/each}</select></label>{/if}
      </li>{/each}</ul>
    </section>
    <footer class="theism-config-footer"><button type="button" class="ghost" onclick={() => theismConfigureDialog?.close()}>Cancel</button><button type="button" class="primary" disabled={!theismCultName.trim() || !theismDeity.trim()} onclick={saveTheismCult}>Save Cult</button></footer>
  </div>
</dialog>

<dialog class="folk-magic-picker" bind:this={sorceryPicker} aria-labelledby="sorcery-picker-title">
  <div class="folk-magic-picker-content">
    <header><div><h2 id="sorcery-picker-title">{sorceryPickerMode === "school" ? "Add spells to School" : "Choose starting spells"}</h2><p>{sorceryPickerMode === "school" ? `${sorcerySchoolSpellIds.length} spells in School` : `${sorcerySelected.length} / ${sorceryEntitlement.count} selected`}</p></div><button type="button" class="ghost" onclick={() => sorceryPicker.close()}>Close ✕</button></header>
    <input class="folk-magic-search" bind:value={sorceryQuery} placeholder="Search Sorcery spells…" aria-label="Search Sorcery spells" />
    <ul class="folk-magic-picker-list">
      {#each sorceryPickerMode === "school" ? sorcerySchoolPickerSpells : sorceryPickerSpells as spell (spell.id)}
        {@const chosen = sorceryPickerMode === "school" ? sorcerySchoolSpellIds.includes(spell.id) : sorcerySelected.some(item => item.spellId === spell.id)}
        <li class:selected={chosen}>
          <button type="button" class="folk-magic-spell-choice" disabled={sorceryPickerMode === "starting" && !chosen && sorcerySelected.length >= sorceryEntitlement.count} onclick={() => sorceryPickerMode === "school" ? (spell.specialisationPrompt ? (sorceryConfigureId = sorceryConfigureId === spell.id ? null : spell.id, sorceryConfigureSubject = "") : toggleSorcerySchoolSpell(spell.id)) : toggleSorcerySpell(spell.id)}>
            <span class="folk-magic-check">{chosen ? "✓" : "+"}</span><span><b>{spell.name}</b><small>{spell.source === "custom" ? "Custom spell" : "Core Sorcery"}{#if spell.specialisation} · {spell.specialisation.kind === "subject" ? "Subject" : "Form"}: {spell.specialisation.value}{/if}</small></span>
          </button>
          {#if sorceryPickerMode === "school" && spell.specialisationPrompt && sorceryConfigureId === spell.id}
            <div class="folk-magic-spell-details"><label>{spell.specialisationPrompt}<input bind:value={sorceryConfigureSubject} maxlength="100" placeholder="Enter a subject" /></label><button type="button" class="primary" disabled={!sorceryConfigureSubject.trim()} onclick={() => addConfiguredSorcerySpell(spell)}>Add configured spell</button></div>
          {/if}
          <button type="button" class="ghost folk-magic-details-button" onclick={() => sorceryDetailsId = sorceryDetailsId === spell.id ? null : spell.id}>{sorceryDetailsId === spell.id ? "Hide details" : "Details"}</button>
          {#if sorceryDetailsId === spell.id}{@const details = resolveSorcerySpellDetails(spell)}<div class="folk-magic-spell-details"><b>{spell.name}</b><small>Sorcery{#if details?.traits.length} · {details.traits.join(" · ")}{/if}</small>{#if details?.effect}<p>{details.effect}</p>{/if}{#if spell.notes}<p>{spell.notes}</p>{/if}{#if spell.specialisation}<small>{spell.specialisation.kind === "subject" ? "Subject" : "Form"} specialisation: {spell.specialisation.value}</small>{:else if spell.specialisationPrompt}<small>Choose a {spell.specialisationPrompt.toLowerCase()} before adding this spell to a School.</small>{/if}{#if spell.availability && spell.availability !== "normal"}<small>Availability: {spell.availability}</small>{/if}{#if !details?.effect && !spell.notes}<p>{spell.source === "custom" ? "Custom spell; no Core rules description is available." : "No Core rules details have been entered."}</p>{/if}</div>{/if}
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
  .theism-derived{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin:12px 0;padding:9px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .theism-derived div{display:grid;gap:3px}.theism-derived b,.theism-pool>b,.theism-miracles h5{font:700 .7rem var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--bronze)}.theism-derived span{font-weight:700}
  .theism-cult-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(145px,auto) auto auto;align-items:center;gap:10px;padding:10px;background:var(--card2);border:1px solid var(--line2)}
  .theism-cult-card>div:first-child{display:grid;gap:3px;min-width:0}.theism-cult-card small,.theism-pool span{display:block;color:var(--mute);font-size:.82rem;overflow-wrap:anywhere}.theism-pool{display:grid;gap:3px;padding:5px 10px;border-left:3px solid var(--bronze);background:color-mix(in srgb,var(--bronze) 8%,transparent)}.theism-pool span{font-weight:700;color:var(--fg)}.theism-pool-current{display:grid;grid-template-columns:auto 76px;align-items:center;gap:5px;font-size:.72rem;color:var(--mute)}.theism-pool-current input{width:100%;min-width:0;padding:3px 5px}.theism-cult-rank{font-size:.85rem;white-space:nowrap}
  .theism-miracles{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}.theism-miracles-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.theism-miracles-heading h5{margin:0}.theism-miracles-heading small{color:var(--mute);font-size:.8rem}.theism-miracle-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}.theism-miracle-list>li{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 10px;padding:7px 4px;border-bottom:1px solid var(--line)}.theism-miracle-list>li.selected{background:color-mix(in srgb,var(--ok) 8%,transparent)}.theism-miracle-list label{display:flex;align-items:center;gap:9px;min-width:0}.theism-miracle-list input,.theism-offer-choice input{flex:none;accent-color:var(--bronze);width:18px;height:18px}.theism-miracle-list label span{min-width:0}.theism-miracle-list small,.theism-offer-choice small{display:block;color:var(--mute);font-size:.78rem;overflow-wrap:anywhere}.theism-detail-button{font-size:.65rem}.theism-miracle-detail{grid-column:1/-1;margin-left:27px;color:var(--mute);font-size:.82rem}.theism-miracle-detail p{margin:3px 0}.theism-invalid{display:grid;gap:5px;margin:8px 0;padding:8px 10px;border-left:3px solid var(--acc);background:color-mix(in srgb,var(--acc) 8%,transparent);font-size:.84rem}.theism-invalid>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.theism-invalid>div span{overflow-wrap:anywhere}.theism-configure-dialog{width:min(760px,calc(100vw - 24px));max-width:760px}.theism-config-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0}.theism-config-fields label{display:grid;align-content:start;gap:4px;font-size:.82rem}.theism-config-fields input,.theism-config-fields select{width:100%;min-width:0}.theism-config-fields label:last-child{grid-column:1/-1;max-width:320px}.theism-config-fields small{color:var(--mute);font-size:.75rem}.theism-offer-editor h3{margin:12px 0 4px;font:700 .76rem var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--bronze)}.theism-offer-editor>p{margin:3px 0 8px;font-size:.82rem}.theism-offer-editor .folk-magic-picker-list{max-height:38dvh;overflow:auto}.theism-offer-editor .folk-magic-picker-list>li{align-items:center}.theism-offer-choice{display:flex;align-items:center;gap:8px;min-width:0;flex:1}.theism-offer-choice>span{min-width:0;overflow-wrap:anywhere}.theism-rank-override{display:grid;grid-template-columns:auto minmax(110px,150px);align-items:center;gap:5px;font-size:.72rem;color:var(--mute)}.theism-rank-override select{width:100%;min-width:0;padding:4px}.theism-config-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
  .magic-capabilities{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
  .theism-miracle-detail{min-width:0;overflow-wrap:anywhere}.theism-miracle-traits{display:inline-block;width:fit-content;max-width:100%;padding:3px 6px;border-left:2px solid var(--bronze);background:color-mix(in srgb,var(--bronze) 10%,transparent);color:var(--fg)!important;overflow-wrap:anywhere}.theism-miracle-detail p{overflow-wrap:anywhere}
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
  .animism-derived{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px;margin:14px 0 8px;padding:10px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .animism-derived div{display:grid;gap:3px}.animism-derived b,.animism-access h5,.animism-relations h5{font:700 .7rem var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--bronze)}.animism-derived span{font-weight:700}.animism-derived small{color:var(--mute);font-size:.75rem}.animism-derived .over-capacity span{color:var(--acc)}
  .animism-access,.animism-relations{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}.animism-access h5,.animism-relations h5{margin:0 0 5px}.animism-access>p,.animism-relations>p{margin:4px 0;color:var(--mute);font-size:.86rem}.animism-tradition-name{display:block;margin-top:5px}.animism-rank-summary{margin:8px 0;color:var(--mute);font-size:.86rem}.animism-rank-summary b{color:var(--fg)}
  .animism-spirit-editor{grid-column:1/-1;display:grid;gap:8px;padding:9px;border:1px solid var(--line);border-radius:8px}.animism-spirit-editor label{display:grid;gap:4px;font-size:.82rem}.animism-spirit-editor input{width:100%;min-width:0}
  .animism-edit-status{display:grid;gap:2px}.animism-edit-status b{font-size:.86rem}.animism-edit-status span{font-size:.82rem;color:var(--mute)}.animism-edit-roll{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:.82rem}.animism-edit-roll span{color:var(--mute)}.animism-edit-roll button{padding:4px 8px}.animism-migration-note{color:var(--mute);font-size:.75rem}.animism-edit-core{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 9px;box-sizing:border-box}.animism-edit-core label small{color:var(--mute);font-size:.75rem}.animism-edit-details{display:grid;gap:4px;padding:0 9px;box-sizing:border-box}.animism-edit-deceased{display:grid;gap:8px;margin:0;padding:8px;border:1px solid var(--line)}.animism-edit-deceased legend{padding:0 4px;font-size:.8rem;color:var(--bronze)}.animism-edit-deceased>label{min-width:0}.animism-edit-deceased .animism-characteristics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.animism-ability-picker small[aria-live]{font-size:.78rem}
  .animism-workflow{overscroll-behavior:contain}.animism-config-section{margin-top:14px;padding-top:10px;border-top:1px solid var(--line)}.animism-config-section h3{margin:0 0 7px;color:var(--bronze);font:700 .75rem var(--display);letter-spacing:.08em;text-transform:uppercase}.animism-config-section>p{margin:4px 0;color:var(--mute);font-size:.85rem}.animism-category-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.animism-category-tabs .active{border-color:var(--bronze);color:var(--bronze)}.animism-vessel{display:grid;gap:8px;margin:5px 0;padding:10px;border:1px solid var(--line)}.animism-vessel legend{padding:0 4px;color:var(--bronze);font-weight:700;font-size:.82rem}.animism-vessel label{display:grid;gap:4px;font-size:.84rem}.animism-form details summary{cursor:pointer;color:var(--bronze);font-size:.82rem}.animism-form details[open]{display:grid;gap:8px}.animism-attitude-note,.animism-generated-preview{margin:4px 0;padding:9px;border-left:3px solid var(--line2);background:color-mix(in srgb,var(--line) 18%,transparent);font-size:.86rem}.animism-attitude-note.folk-magic-error{border-color:var(--acc)}.animism-type-fields{display:grid;gap:8px;padding:9px;border:1px solid var(--line);border-radius:6px}.animism-type-fields h6{margin:0;color:var(--bronze);font-size:.8rem}.animism-type-fields>label,.animism-characteristics label,.animism-generation label{display:grid;gap:4px;font-size:.82rem}.animism-type-fields input,.animism-type-fields select{width:100%;min-width:0}.animism-characteristics{display:flex;flex-wrap:wrap;gap:8px}.animism-characteristics label{flex:1 1 100px}.animism-characteristics input{width:100%;min-width:0}.animism-ability-picker{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:6px;margin:0;padding:8px;border:1px solid var(--line)}.animism-ability-picker legend{padding:0 4px;font-size:.8rem}.animism-ability-picker small{grid-column:1/-1;color:var(--mute)}.animism-ability-picker label{display:flex;align-items:center;gap:6px;font-size:.82rem}.animism-ability-picker input{width:auto}.animism-generation{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px}.animism-generation label{flex:1 1 180px}.animism-roll-result{display:grid;gap:4px;min-width:200px;padding:9px;border:1px solid var(--line);border-radius:6px;font-size:.82rem}.animism-roll-result b{color:var(--bronze)}.animism-roll-result span{color:var(--mute)}.animism-generated-preview p{margin:4px 0}.animism-spirit-details{grid-column:1/-1;font-size:.85rem}.animism-spirit-details summary{cursor:pointer;color:var(--bronze)}.animism-spirit-details p{margin:4px 0;color:var(--mute)}
  .animism-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}.animism-row>div{min-width:0}.animism-row small{display:block;color:var(--mute);font-size:.8rem}.animism-row>p{grid-column:1/-1;margin:0;color:var(--mute);font-size:.85rem}.animism-row button{font-size:.64rem}
  .animism-issues{margin:10px 0;padding:8px 10px;border-left:3px solid var(--acc);background:color-mix(in srgb,var(--acc) 8%,transparent);font-size:.85rem}.animism-issues p{margin:4px 0}.animism-form{margin:9px 0}
  .animism-hostile-form{display:flex;align-items:flex-end;gap:8px;margin-top:8px}.animism-hostile-form label{display:grid;flex:1;gap:4px;font-size:.8rem}.animism-hostile-form input{width:100%;min-width:0}
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
  .folk-magic-picker.theism-configure-dialog{width:min(760px,calc(100vw - 24px));max-width:760px}
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
  @media(max-width:520px){.folk-magic-entitlement{align-items:flex-start;flex-direction:column}.folk-magic-known-row{align-items:flex-start}.folk-magic-actions>*{flex:1}.custom-path-selected-talents li{align-items:flex-start}.animism-row{grid-template-columns:minmax(0,1fr) auto}.animism-row>button:last-of-type{grid-column:2}}
  @media(max-width:420px){.animism-edit-core{grid-template-columns:1fr}.animism-edit-roll{align-items:flex-start}}
  @media(max-width:600px){.theism-cult-card{grid-template-columns:minmax(0,1fr) auto}.theism-pool{grid-column:1}.theism-cult-rank{grid-column:2;grid-row:1}.theism-cult-card>button{grid-column:2;grid-row:2;justify-self:end}.theism-config-fields{grid-template-columns:minmax(0,1fr)}.theism-config-fields label:last-child{grid-column:auto}.theism-rank-override{grid-template-columns:1fr;max-width:130px}.theism-miracle-list>li{grid-template-columns:minmax(0,1fr) auto}}
</style>
