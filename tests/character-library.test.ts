import { describe, expect, test } from "bun:test";
import { CHARACTER_LIBRARY_KEY, createCharacterRepository, LEGACY_CHARACTER_KEY } from "../src/lib/character-library";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function setup(storage = new MemoryStorage()) {
  let nextId = 0;
  const repository = createCharacterRepository(storage, () => ({ name: "", culture: 0 }), LEGACY_CHARACTER_KEY, () => `id-${++nextId}`);
  return { repository, storage };
}

describe("browser character repository", () => {
  test("creates, reads, updates, selects, and deletes independent characters", () => {
    const { repository } = setup();
    const first = repository.getCharacter(repository.getActiveCharacterId()!)!;
    const second = repository.createCharacter();
    expect(first.id).not.toBe(second.id);
    repository.saveCharacter({ ...first, name: "Ariadne" });
    repository.saveCharacter({ ...second, name: "Bors", culture: 2 });
    expect(repository.getCharacter(first.id)?.name).toBe("Ariadne");
    expect(repository.listCharacters().map(character => character.name)).toEqual(["Ariadne", "Bors"]);

    expect(repository.setActiveCharacter(first.id)).toBe(true);
    expect(repository.getActiveCharacterId()).toBe(first.id);
    expect(repository.deleteCharacter(first.id)).toBe(true);
    expect(repository.getActiveCharacterId()).toBe(second.id);
    expect(repository.getCharacter(first.id)).toBeNull();
    expect(repository.getCharacter(second.id)?.name).toBe("Bors");
  });

  test("retains records and active selection across repository reloads", () => {
    const { repository, storage } = setup();
    const first = repository.getCharacter(repository.getActiveCharacterId()!)!;
    repository.saveCharacter({ ...first, name: "Ariadne" });
    const second = repository.createCharacter();
    repository.saveCharacter({ ...second, name: "Bors" });
    repository.setActiveCharacter(first.id);

    const restored = createCharacterRepository(storage, () => ({ name: "", culture: 0 }));
    expect(restored.getActiveCharacterId()).toBe(first.id);
    expect(restored.listCharacters().map(character => character.name)).toEqual(["Ariadne", "Bors"]);
  });

  test("repeatedly switches active characters without mixing their saved data", () => {
    const { repository, storage } = setup();
    const first = repository.getCharacter(repository.getActiveCharacterId()!)!;
    repository.saveCharacter({ ...first, name: "Freddy Unwin", culture: 1 });
    const second = repository.createCharacter();
    repository.saveCharacter({ ...second, name: "Timvey Struden", culture: 2 });

    for (const id of [first.id, second.id, first.id, second.id]) {
      expect(repository.setActiveCharacter(id)).toBe(true);
      expect(repository.getActiveCharacterId()).toBe(id);
      expect(repository.getCharacter(id)?.id).toBe(id);
    }

    const restored = createCharacterRepository(storage, () => ({ name: "", culture: 0 }));
    expect(restored.getActiveCharacterId()).toBe(second.id);
    expect(restored.getCharacter(first.id)).toMatchObject({ name: "Freddy Unwin", culture: 1 });
    expect(restored.getCharacter(second.id)).toMatchObject({ name: "Timvey Struden", culture: 2 });
  });

  test("snapshots reactive proxies while preserving nested character data", () => {
    const { repository, storage } = setup();
    const first = repository.getCharacter(repository.getActiveCharacterId()!)!;
    const nested = {
      combatStyles: [{ id: "style-1", baseFormula: ["STR", "DEX"], traits: [{ source: { libraryId: "core" } }] }],
      magic: { theism: { memberships: [{ cultId: "cult-1", rank: "Initiate" }] } },
      background: { events: [{ roll: 12, details: { text: "A detailed event" } }] },
      equipment: { inventory: [{ name: "Spear", armour: { material: "bronze", AP: 3 } }] },
    };
    const proxied = new Proxy(nested, {});
    const proxiedFormula = new Proxy(nested.combatStyles[0].baseFormula, {});
    const character = new Proxy({ ...first, ...proxied, combatStyles: [{ ...nested.combatStyles[0], baseFormula: proxiedFormula }] }, {});

    expect(() => structuredClone(proxiedFormula)).toThrow();
    repository.saveCharacter(character);

    const loaded = repository.getCharacter(first.id)! as typeof character;
    expect(loaded).toMatchObject({
      combatStyles: [{ baseFormula: ["STR", "DEX"], traits: [{ source: { libraryId: "core" } }] }],
      magic: { theism: { memberships: [{ cultId: "cult-1", rank: "Initiate" }] } },
      background: { events: [{ roll: 12, details: { text: "A detailed event" } }] },
      equipment: { inventory: [{ name: "Spear", armour: { material: "bronze", AP: 3 } }] },
    });
    expect(loaded.combatStyles[0].baseFormula).not.toBe(proxiedFormula);
    const reloaded = createCharacterRepository(storage, () => ({ name: "", culture: 0 }));
    expect(reloaded.getCharacter(first.id)).toMatchObject(loaded);
  });

  test("rejects unsupported values before changing a saved record", () => {
    const { repository, storage } = setup();
    const activeId = repository.getActiveCharacterId()!;
    const before = storage.getItem(CHARACTER_LIBRARY_KEY);
    const character = repository.getCharacter(activeId)!;
    expect(() => repository.saveCharacter({ ...character, name: "Corrupt", callback: () => {} } as typeof character))
      .toThrow(/unsupported function/);
    expect(repository.getActiveCharacterId()).toBe(activeId);
    expect(storage.getItem(CHARACTER_LIBRARY_KEY)).toBe(before);
    expect(repository.getCharacter(activeId)?.name).toBe("");
  });

  test("migrates the existing single-character save without dropping its data", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_CHARACTER_KEY, JSON.stringify({ name: "Legacy", culture: 3, career: 4 }));
    const { repository } = setup(storage);
    const migrated = repository.getCharacter(repository.getActiveCharacterId()!)!;
    expect(migrated).toMatchObject({ name: "Legacy", culture: 3, career: 4 });
    expect(migrated.id).toBeTruthy();
    expect(storage.getItem(CHARACTER_LIBRARY_KEY)).toContain("Legacy");
  });
});
