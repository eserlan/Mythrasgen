import assert from "node:assert/strict";
import { CHARACTER_LIBRARY_KEY } from "../../src/lib/character-library.ts";
import { tryOpenCharacter } from "../../src/lib/character-library-ui.ts";

globalThis.$state = value => value;
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

const store = await import("../../src/lib/store.svelte.ts");
const firstId = store.char.id;
store.char.name = "Freddy Unwin";
store.char.culture = 1;
store.persist();

const secondId = store.createCharacter();
store.char.name = "Timvey Struden";
store.char.culture = 2;
store.char.combatStyles = [{
  id: "custom:timvey-style", name: "Timvey's Style", baseFormula: new Proxy(["STR", "DEX"], {}),
  weapons: [{ name: "Spear" }], traits: [{ id: "trait-1", name: "Guarded", source: { libraryId: "custom", libraryName: "Timvey" } }],
  source: { libraryId: "custom", libraryName: "Timvey" }, status: "custom", origin: "custom", origins: ["custom"], allocations: { bonus: 4 },
}];
store.char.magic.theism.customCults = [{ id: "cult-1", name: "Cult One", deity: "Deity", source: "custom", miracles: [] }];
store.char.magic.theism.memberships = [{ id: "membership-1", cultId: "cult-1", rank: "Initiate", devotionSpecialisation: "Deity",
  devotionValue: 45, exhortValue: 40, devotionalPool: 3, knownMiracleIds: [] }];
store.char.background.events = [{ roll: 0, text: "A detailed event" }];
store.char.background.inventory = [{ id: "item-1", catalogueId: null, sourceIds: [], name: "Spear", quantity: 1,
  acquiredAs: "legacy", state: "carried", encPerUnit: null, encSource: "unresolved",
  armour: { material: "bronze", AP: 3 } }];
store.persist();

assert.equal(store.selectCharacter(firstId), true);
assert.equal(store.char.name, "Freddy Unwin");
assert.equal(store.char.culture, 1);
store.char.name = "Freddy Unwin edited";
store.persist();
assert.equal(store.selectCharacter(secondId), true);
assert.equal(store.char.name, "Timvey Struden");
assert.equal(store.char.culture, 2);
assert.deepEqual(store.char.combatStyles[0].baseFormula, ["STR", "DEX"]);
assert.equal(store.char.magic.theism.memberships[0].cultId, "cult-1");
assert.equal(store.char.background.events[0].text, "A detailed event");
assert.equal(store.char.background.inventory[0].armour.material, "bronze");
assert.equal(store.selectCharacter(firstId), true);
assert.equal(store.char.name, "Freddy Unwin edited");
assert.equal(store.selectCharacter(secondId), true);
assert.equal(store.char.name, "Timvey Struden");

const activeBeforeFailure = store.char.id;
let openedAfterFailure = false;
const selectionError = tryOpenCharacter("removed-character", store.selectCharacter, () => { openedAfterFailure = true; });
assert.match(selectionError, /could not be selected/);
assert.equal(openedAfterFailure, false);
assert.equal(store.char.id, activeBeforeFailure);

let openedAfterThrownSelection = false;
const thrownSelectionError = tryOpenCharacter("character", () => {
  throw new Error("selection failed");
}, () => { openedAfterThrownSelection = true; });
assert.equal(thrownSelectionError, "Could not open this character: selection failed");
assert.equal(openedAfterThrownSelection, false);
assert.equal(store.char.id, activeBeforeFailure);

const saved = JSON.parse(values.get(CHARACTER_LIBRARY_KEY));
assert.equal(saved.activeId, secondId);
assert.equal(saved.characters.find(character => character.id === firstId).name, "Freddy Unwin edited");
assert.equal(saved.characters.find(character => character.id === secondId).name, "Timvey Struden");
console.log("character switching passed");
