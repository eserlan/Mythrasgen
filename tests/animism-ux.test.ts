import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";
import { getBoundSpiritCapacity, getTranceCapabilities, spiritIntensityBand } from "../src/lib/animism";

const source = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");
const card = source.slice(source.indexOf('<article class="folk-magic-discipline animism-discipline">'), source.indexOf('<dialog class="folk-magic-picker animism-workflow"'));

test("Animism default card is a compact summary with focused workflow actions", () => {
  expect(card).toContain("Spirit Control Limit");
  expect(card).toContain("Binding Capacity");
  expect(card).toContain("{animismBound.length} / {animismCapacity} spirits");
  expect(card).toContain("Spirit Tradition");
  expect(card).toContain("Your Spirits");
  expect(card).toContain("Configure Tradition");
  expect(card).toContain("Manage Spirits");
  expect(card).not.toContain("friendlySpiritTypeIds");
  expect(card).not.toContain("Source / provenance");
  expect(card).not.toContain("Add friendly types");
  expect(card).not.toContain("Record a granted spirit");
});

test("Tradition and spirit management are focused dialogs with relationship based fields", () => {
  const configure = source.slice(source.indexOf('aria-labelledby="animism-configure-title"'), source.indexOf('aria-labelledby="animism-manage-title"'));
  const manage = source.slice(source.indexOf('aria-labelledby="animism-manage-title"'), source.indexOf("{/if}\n    {#if mysticismCapability}"));
  expect(card).toContain("onclick={openAnimismConfigure}");
  expect(card).toContain("onclick={openAnimismManage}");
  expect(configure).toContain("selectAnimismTradition");
  expect(configure).toContain("toggleAnimismAccess");
  expect(manage).toContain("<h5>Add Spirit</h5>");
  expect(manage).toContain('<option value="ally">Ally</option>');
  expect(manage).toContain('<option value="bound">Bound Spirit</option>');
  expect(manage).toContain('{#if animismSpiritRelationship === "bound"}');
  expect(manage).toContain("Where is the spirit bound?");
  expect(manage).toContain('bind:value={animismVessel}');
  expect(manage).toContain('{#if animismVessel === "fetish/object"}');
  expect(manage).toContain("Spirit POW");
  expect(manage).toContain("SPIRIT TOO POWERFUL TO BIND");
  expect(manage).toContain("animismSpiritMode === \"generated\" && (!animismGeneratedSpirit || animismNewSpiritIncomplete)");
  const addSpirit = source.slice(source.indexOf("function addAnimismSpirit()"), source.indexOf("function removeAnimismRelationship"));
  expect(addSpirit).toContain("animismState.allies.push");
  expect(addSpirit).toContain("animismState.bindings.push");
  expect(addSpirit).toContain("animismSpiritMode === \"generated\" && (!animismGeneratedSpirit || animismNewSpiritIncomplete)");
  expect(source).toContain("function saveAnimismSpiritEdit(id: string)");
  expect(source).toContain("spirit.pow = animismEditPow");
});

test("Manage Spirits explains Tradition attitude separately and exposes canonical Core records", () => {
  const manage = source.slice(source.indexOf('aria-labelledby="animism-manage-title"'), source.indexOf("{/if}\n    {#if mysticismCapability}"));
  expect(manage).toContain("Friendly to your Tradition");
  expect(manage).toContain("Known neutral");
  expect(manage).toContain("Other spirit types — not known through this Tradition");
  expect(manage).toContain("Tradition attitude/access");
  expect(manage).toContain("significant under Core Animism.");
  expect(manage).toContain("Your relationship");
  expect(manage).toContain("Choose Friendly, Neutral, or Hostile");
  expect(manage).toContain("Generate using Core rules");
  expect(manage).toContain("Roll 1d3");
  expect(manage).toContain("Reroll ability count");
  expect(manage).toContain("1d3 + Intensity");
  expect(source).toContain("CORE_SPIRIT_RULES");
  expect(manage).toContain("Action Required");
  expect(source).toContain("Spectral Combat");
  expect(source).toContain("Willpower");
  expect(manage).toContain("animismRecordIssues(spirit)");
  expect(manage).toContain("Deceased mortal's species");
  expect(source).toContain("Ancestor INT (from species)");
  expect(source).toContain("Ancestor CHA (from species)");
});

test("editing generated spirit choices invalidates the stale preview", () => {
  const manage = source.slice(source.indexOf('aria-labelledby="animism-manage-title"'), source.indexOf("{/if}\n    {#if mysticismCapability}"));
  expect(manage).toContain('bind:value={animismTypeChoice} oninput={() => animismGeneratedSpirit = null} placeholder="e.g. wolf or oak"');
  expect(manage).toContain('bind:value={animismSpiritIns} oninput={() => animismGeneratedSpirit = null}');
  expect(manage).toContain('bind:value={animismSpiritCha} oninput={() => animismGeneratedSpirit = null}');
  expect(manage).toContain('bind:value={animismTypeChoice} onchange={() => animismGeneratedSpirit = null}><option value="">Choose element</option>');
  expect(manage).toContain('bind:value={animismTypeChoice} onchange={() => animismGeneratedSpirit = null}><option value="">Choose kind</option>');
});

test("Ancestor edits retain historical rolls and gate Core saves on the current validation", () => {
  const edit = source.slice(source.indexOf("function editAnimismSpirit(id: string)"), source.indexOf("function setAnimismEditIntensity"));
  const save = source.slice(source.indexOf("function saveAnimismSpiritEdit(id: string)"), source.indexOf("function openAnimismConfigure"));
  expect(edit).toContain("spirit.generation?.rolls?.abilityCountDie?.[0] ?? null");
  expect(save).toContain("animismEditAbilityCountDie + animismEditIntensity");
  expect(save).not.toContain('spirit.generation.method = "manual"');
  expect(source).toContain('spirit.generation?.method === "core-generated" && animismEditIssues(spirit).length > 0');
  expect(source).toContain('choiceId === "legacy-spirit-details"');
});

test("Awakened Fetch generation uses the entered inherited POW", () => {
  const generate = source.slice(source.indexOf("function generateAnimismSpirit()"), source.indexOf("function animismSpirit(id:"));
  expect(generate).toContain('animismSelectedRule?.id === "fetch" && animismTypeChoice === "Awakened Fetch" ? { pow: Number(animismSpiritPow) } : {}');
});

test("Animism explanations derive from canonical rank and Intensity metadata", () => {
  expect(source).toContain("getTranceCapabilities(rank)");
  expect(source).toContain("spiritIntensityBand(Number(animismSpiritIntensity)");
  expect(spiritIntensityBand(1)).toMatchObject({ minPow: 7, maxPow: 12 });
  expect(getTranceCapabilities("Shaman")).toMatchObject({ canProjectIntoSpiritWorld: true, canDrawOrExpelSpirit: true });
  expect(getTranceCapabilities("High Shaman")).toMatchObject({ canDragOtherSouls: true });
});

test("binding capacity remains independent of allies and zero bindings remain valid", () => {
  const state = { chars: { CHA: 18 } };
  expect(source).toContain('animismState.bindings.filter(item => item.countsAgainstCapacity)');
  expect(source).toContain('...animismState.bindings.map(binding =>');
  expect(source).toContain('key: `binding:${binding.id}`');
  expect(source).toContain('{#each animismRelationshipRows as row (row.key)}');
  expect(source).toContain('animismState.allies.filter(ally => !animismBindingFor(ally.spiritId))');
  expect(getBoundSpiritCapacity(state, "Shaman")).toBe(14);
  expect(source).toContain('animismBound.length > animismCapacity');
  expect(source).toContain('!animismTradition || !animismRank || animismBound.length > animismCapacity');
  expect(source).toContain("no spirits have been removed");
});

test("Animism component compiles with one scroll container per workflow dialog", () => {
  const compiled = compile(source, { filename: "src/components/Magic.svelte", generate: "client" });
  const css = compiled.css?.code ?? "";
  expect(css).toMatch(/\.folk-magic-picker-content[^\{]*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto/s);
  expect(css).not.toMatch(/\.animism-workflow[^}]*overflow-y:\s*auto/s);
});
