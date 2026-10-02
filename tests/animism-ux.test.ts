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
  expect(manage).toContain("disabled={!animismSpiritTypeId || animismNewBoundInvalid}");
  const addSpirit = source.slice(source.indexOf("function addAnimismSpirit()"), source.indexOf("function removeAnimismRelationship"));
  expect(addSpirit).toContain("animismState.allies.push");
  expect(addSpirit).toContain("animismState.bindings.push");
  expect(addSpirit).toContain("if (!animismSpiritTypeId || animismNewBoundInvalid) return");
  expect(source).toContain("function saveAnimismSpiritEdit(id: string)");
  expect(source).toContain("spirit.pow = animismEditPow");
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
