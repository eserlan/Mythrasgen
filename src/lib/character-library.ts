export interface CharacterData {
  id: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const CHARACTER_LIBRARY_KEY = "mythrasgen.characters.v1";
export const LEGACY_CHARACTER_KEY = "mythresgen.v1";

/** Copy serializable character data out of reactive proxies into plain objects. */
export function snapshotCharacterData<T>(value: T): T {
  const visit = (item: unknown, path: string, seen: Set<object>): unknown => {
    if (item === null || item === undefined || typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      return item;
    }
    if (typeof item !== "object") {
      throw new TypeError(`Character data at ${path} contains unsupported ${typeof item} value.`);
    }
    if (seen.has(item)) throw new TypeError(`Character data at ${path} contains a circular reference.`);

    seen.add(item);
    try {
      if (Array.isArray(item)) {
        const keys = Reflect.ownKeys(item);
        if (keys.some(key => typeof key !== "string" || key !== "length" && !/^(0|[1-9]\d*)$/.test(key))) {
          throw new TypeError(`Character data at ${path} contains a non-serializable array property.`);
        }
        return item.map((entry, index) => visit(entry, `${path}[${index}]`, seen));
      }

      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`Character data at ${path} must contain only plain objects.`);
      }
      const copy: Record<string, unknown> = Object.create(prototype);
      for (const key of Reflect.ownKeys(item)) {
        if (typeof key !== "string") throw new TypeError(`Character data at ${path} contains a symbol property.`);
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!descriptor?.enumerable || !("value" in descriptor)) {
          throw new TypeError(`Character data at ${path}.${key} must be an enumerable data property.`);
        }
        Object.defineProperty(copy, key, {
          value: visit(descriptor.value, `${path}.${key}`, seen),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      return copy;
    } finally {
      seen.delete(item);
    }
  };

  return visit(value, "character", new Set()) as T;
}

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
    listCharacters: () => state.characters.map(character => snapshotCharacterData(character)),
    getCharacter: (id: string) => {
      const character = state.characters.find(item => item.id === id);
      return character ? snapshotCharacterData(character) : null;
    },
    getActiveCharacterId: () => state.activeId,
    saveCharacter: (character: T) => {
      const snapshot = snapshotCharacterData(character);
      const index = state.characters.findIndex(item => item.id === snapshot.id);
      if (index < 0) state.characters.push(snapshot);
      else state.characters[index] = snapshot;
      if (!state.activeId) state.activeId = snapshot.id;
      write();
    },
    createCharacter: () => {
      const character = snapshotCharacterData({ ...createBlank(), id: makeId() } as T);
      state.characters.push(character);
      state.activeId = character.id;
      write();
      return snapshotCharacterData(character);
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
