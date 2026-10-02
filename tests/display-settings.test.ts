import { describe, expect, test } from "bun:test";
import {
  applyDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_KEY,
  loadDisplaySettings,
  normalizeDisplaySettings,
  saveDisplaySettings,
} from "../src/lib/display-settings";
import { CHARACTER_LIBRARY_KEY, createCharacterRepository } from "../src/lib/character-library";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe("display settings", () => {
  test("defaults to Classic and Standard and repairs invalid saved values", () => {
    expect(loadDisplaySettings(memoryStorage())).toEqual(DEFAULT_DISPLAY_SETTINGS);
    expect(normalizeDisplaySettings({ textSize: "huge", fontStyle: "unknown" })).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  test("persists independently under the application display settings key", () => {
    const storage = memoryStorage();
    const settings = { textSize: "extra-large" as const, fontStyle: "readable-sans" as const };
    saveDisplaySettings(settings, storage);
    expect(storage.values.has(DISPLAY_SETTINGS_KEY)).toBe(true);
    expect(loadDisplaySettings(storage)).toEqual(settings);
    expect(DISPLAY_SETTINGS_KEY).not.toBe(CHARACTER_LIBRARY_KEY);
  });

  test("character saves and new characters do not contain display preferences", () => {
    const storage = memoryStorage();
    saveDisplaySettings({ textSize: "large", fontStyle: "readable-serif" }, storage);
    let nextId = 0;
    const repository = createCharacterRepository<{ id: string; name: string }>(storage, () => ({ name: "" }), "legacy", () => `hero-${++nextId}`);
    repository.saveCharacter({ id: "hero-1", name: "Hero" });
    const savedLibrary = JSON.parse(storage.values.get(CHARACTER_LIBRARY_KEY)!);
    expect(savedLibrary.characters[0]).toEqual({ id: "hero-1", name: "Hero" });
    expect(repository.createCharacter()).toEqual({ id: "hero-2", name: "" });
    expect(loadDisplaySettings(storage)).toEqual({ textSize: "large", fontStyle: "readable-serif" });
  });

  test("applies text size and font style as root theme attributes immediately", () => {
    const root = { dataset: {} as Record<string, string> } as HTMLElement;
    applyDisplaySettings({ textSize: "large", fontStyle: "readable-serif" }, root);
    expect(root.dataset).toEqual({ textSize: "large", fontStyle: "readable-serif" });
  });

  test("reset values restore the Standard Classic baseline", () => {
    expect(DEFAULT_DISPLAY_SETTINGS).toEqual({ textSize: "standard", fontStyle: "classic" });
  });
});
