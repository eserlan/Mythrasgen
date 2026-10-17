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
store.persist();

assert.equal(store.selectCharacter(firstId), true);
assert.equal(store.char.name, "Freddy Unwin");
assert.equal(store.char.culture, 1);
store.char.name = "Freddy Unwin edited";
store.persist();
assert.equal(store.selectCharacter(secondId), true);
assert.equal(store.char.name, "Timvey Struden");
assert.equal(store.char.culture, 2);
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
