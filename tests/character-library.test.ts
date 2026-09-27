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
