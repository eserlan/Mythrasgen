export const DISPLAY_SETTINGS_KEY = "mythrasgen.display-settings";

export const TEXT_SIZES = ["small", "standard", "large", "extra-large"] as const;
export const FONT_STYLES = ["classic", "readable-serif", "readable-sans"] as const;

export type TextSize = typeof TEXT_SIZES[number];
export type FontStyle = typeof FONT_STYLES[number];
export interface DisplaySettings { textSize: TextSize; fontStyle: FontStyle }

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = { textSize: "standard", fontStyle: "classic" };

function localStorageOrNull(): Storage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

export function normalizeDisplaySettings(value: unknown): DisplaySettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_DISPLAY_SETTINGS };
  const settings = value as Partial<DisplaySettings>;
  return {
    textSize: TEXT_SIZES.includes(settings.textSize as TextSize) ? settings.textSize as TextSize : "standard",
    fontStyle: FONT_STYLES.includes(settings.fontStyle as FontStyle) ? settings.fontStyle as FontStyle : "classic",
  };
}

export function loadDisplaySettings(storage: Pick<Storage, "getItem"> | null = localStorageOrNull()): DisplaySettings {
  try {
    const stored = storage?.getItem(DISPLAY_SETTINGS_KEY);
    return stored ? normalizeDisplaySettings(JSON.parse(stored)) : { ...DEFAULT_DISPLAY_SETTINGS };
  } catch {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }
}

export function saveDisplaySettings(settings: DisplaySettings, storage: Pick<Storage, "setItem"> | null = localStorageOrNull()) {
  try { storage?.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(normalizeDisplaySettings(settings))); } catch { /* Storage can be disabled. */ }
}

export function applyDisplaySettings(settings: DisplaySettings, root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement) {
  if (!root) return;
  const normalized = normalizeDisplaySettings(settings);
  root.dataset.textSize = normalized.textSize;
  root.dataset.fontStyle = normalized.fontStyle;
}
