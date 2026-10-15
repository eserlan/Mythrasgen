import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
const concept = readFileSync(new URL("../src/components/Concept.svelte", import.meta.url), "utf8");

function themeTokens(block: string) {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):(#\w{6})/g)].map(([, token, value]) => [token, value]));
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.slice(1).match(/.{2}/g)!.map((channel) => parseInt(channel, 16) / 255);
    const [r, g, b] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const lightTheme = themeTokens(css.match(/:root\{([^}]*)\}/)![1]);
const darkTheme = themeTokens(css.match(/@media\(prefers-color-scheme:dark\)\{:root\{([^}]*)\}\}/)![1]);

describe("textarea readability", () => {
  test("Page I description keeps the shared foreground and readable placeholder", () => {
    expect(concept).toContain('<textarea bind:value={char.description} rows="3" placeholder="Appearance, manner, or other identifying details"></textarea>');
    expect(css).toContain("textarea{width:100%;box-sizing:border-box;background:var(--bg);color:var(--fg);");
    expect(css).toContain("textarea::placeholder{color:var(--mute);opacity:1}");
  });

  test("textareas retain a visible focus indicator in every form", () => {
    expect(css).toContain("input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible");
    expect(css).toContain("outline:2px solid var(--bronze);outline-offset:2px");

    for (const theme of [lightTheme, darkTheme]) {
      for (const surface of ["--bg", "--card", "--card2"]) {
        expect(contrastRatio(theme["--bronze"], theme[surface])).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
