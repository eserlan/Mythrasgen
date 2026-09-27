export interface CharacterData {
  id: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const CHARACTER_LIBRARY_KEY = "mythrasgen.characters.v1";
export const LEGACY_CHARACTER_KEY = "mythresgen.v1";

interface LibraryState<T extends CharacterData> {
  activeId: string | null;
  characters: T[];
}

export function createCharacterRepository<T extends CharacterData>(
  storage: StorageLike,
  createBlank: () => Omit<T, "id">,
  legacyKey = LEGACY_CHARACTER_KEY,
  makeId = () => globalThis.crypto?.randomUUID?.() ?? `character-${Date.now()}-${Math.random().toString(36).slice(2)}`,
) {
  let state: LibraryState<T>;

  const write = () => {
    try { storage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(state)); } catch { /* storage unavailable or full */ }
  };
  try {
    const saved = JSON.parse(storage.getItem(CHARACTER_LIBRARY_KEY) ?? "null") as Partial<LibraryState<T>> | null;
    if (saved && Array.isArray(saved.characters)) {
      const unique = new Map<string, T>();
      for (const character of saved.characters) {
        if (character && typeof character.id === "string" && character.id) unique.set(character.id, character);
      }
      state = { characters: [...unique.values()], activeId: typeof saved.activeId === "string" ? saved.activeId : null };
      if (!state.characters.some(character => character.id === state.activeId)) state.activeId = state.characters[0]?.id ?? null;
    } else {
      const legacy = JSON.parse(storage.getItem(legacyKey) ?? "null") as Omit<T, "id"> | null;
      const id = makeId();
      state = { characters: [{ ...(legacy ?? createBlank()), id } as T], activeId: id };
      write();
    }
  } catch {
    const id = makeId();
    state = { characters: [{ ...createBlank(), id } as T], activeId: id };
  }

  return {
    listCharacters: () => state.characters.map(character => ({ ...character } as T)),
    getCharacter: (id: string) => {
      const character = state.characters.find(item => item.id === id);
      return character ? ({ ...character } as T) : null;
    },
    getActiveCharacterId: () => state.activeId,
    saveCharacter: (character: T) => {
      const index = state.characters.findIndex(item => item.id === character.id);
      if (index < 0) state.characters.push({ ...character } as T);
      else state.characters[index] = { ...character } as T;
      if (!state.activeId) state.activeId = character.id;
      write();
    },
    createCharacter: () => {
      const character = { ...createBlank(), id: makeId() } as T;
      state.characters.push(character);
      state.activeId = character.id;
      write();
      return { ...character } as T;
    },
    deleteCharacter: (id: string) => {
      const index = state.characters.findIndex(character => character.id === id);
      if (index < 0) return false;
      state.characters.splice(index, 1);
      if (state.activeId === id) state.activeId = state.characters[0]?.id ?? null;
      write();
      return true;
    },
    setActiveCharacter: (id: string) => {
      if (!state.characters.some(character => character.id === id)) return false;
      state.activeId = id;
      write();
      return true;
    },
  };
}
