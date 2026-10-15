import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
const concept = readFileSync(new URL("../src/components/Concept.svelte", import.meta.url), "utf8");

describe("textarea readability", () => {
  test("Page I description keeps the shared foreground and readable placeholder", () => {
    expect(concept).toContain('<textarea bind:value={char.description} rows="3" placeholder="Appearance, manner, or other identifying details"></textarea>');
    expect(css).toContain("textarea{width:100%;box-sizing:border-box;background:var(--bg);color:var(--fg);");
    expect(css).toContain("textarea::placeholder{color:var(--mute);opacity:1}");
  });

  test("textareas retain a visible focus indicator in every form", () => {
    expect(css).toContain("input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible");
    expect(css).toContain("outline:2px solid var(--bronze2);outline-offset:2px");
  });
});
