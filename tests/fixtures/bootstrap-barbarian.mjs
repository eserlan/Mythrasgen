import assert from "node:assert/strict";
import { CHARACTER_LIBRARY_KEY } from "../../src/lib/character-library.ts";

// This subprocess starts with a clean module cache so the persisted payload is
// consumed by the same repository and store initialization path as browser boot.
globalThis.$state = value => value;
const character = {
  id: "legacy-barbarian-style",
  name: "Saved Barbarian",
  culture: "Barbarian",
  career: "Hunter",
  step: 5,
  cultureSelections: { standard: [], professional: [], combatStyle: "" },
  careerProfessional: [],
  careerCombatStyles: [],
  combatStyles: [{
    id: "campaign:barbarian",
    name: "Barbarian",
    baseFormula: ["STR", "DEX"],
    weapons: [],
    traits: [],
    source: { libraryId: "campaign", libraryName: "Campaign" },
    status: "custom",
    origin: "bonus",
    origins: ["bonus"],
    allocations: {},
  }],
  hobbySkill: { type: "combatStyle", name: "Barbarian" },
  alloc: { culture: {}, career: {}, bonus: { Barbarian: 10 } },
  magic: {},
};
const savedLibrary = JSON.stringify({ activeId: character.id, characters: [character] });
globalThis.localStorage = {
  getItem: key => key === CHARACTER_LIBRARY_KEY ? savedLibrary : null,
  setItem: () => {},
};

const store = await import("../../src/lib/store.svelte.ts");
assert.equal(store.char.id, character.id);
assert.equal(store.char.name, character.name);
assert.equal(store.char.culture, 0);
assert.equal(store.char.career, 10);
assert.deepEqual(store.char.hobbySkill, { type: "combatStyle", name: "Barbarian" });
assert.ok(store.allSkills().includes("Barbarian"));
assert.equal(store.skillDefinition("Barbarian").pro, true);
assert.deepEqual(store.char.magic.disciplines, []);
console.log("bootstrap passed");
