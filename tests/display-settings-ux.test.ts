import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { compile } from "svelte/compiler";

const app = readFileSync(new URL("../src/App.svelte", import.meta.url), "utf8");
const landing = readFileSync(new URL("../src/components/Landing.svelte", import.meta.url), "utf8");
const settings = readFileSync(new URL("../src/components/Settings.svelte", import.meta.url), "utf8");
const background = readFileSync(new URL("../src/components/Background.svelte", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

describe("display settings interface", () => {
  test("Settings is available from the global application menu and landing page", () => {
    expect(app).toContain("<button aria-current={showSettings ? \"page\" : undefined}");
    expect(app).toContain("<Settings settings={displaySettings}");
    expect(landing).toContain("<button class=\"big\" onclick={onSettings}>Settings</button>");
  });

  test("settings controls use labeled native radio groups for keyboard operation", () => {
    expect(settings).toContain("<legend>Text size</legend>");
    expect(settings).toContain("<legend>Font style</legend>");
    expect(settings).toContain('type="radio" name="display-text-size"');
    expect(settings).toContain('type="radio" name="display-font-style"');
    expect(settings).toContain("Reset to defaults");
    expect(compile(settings, { filename: "src/components/Settings.svelte", generate: "client" }).js.code).toContain("display-text-size");
  });

  test("font presets and all text sizes map to centralized root tokens", () => {
    expect(css).toContain('html[data-text-size="small"]{font-size:90%}');
    expect(css).toContain('html[data-text-size="standard"]{font-size:100%}');
    expect(css).toContain('html[data-text-size="large"]{font-size:115%}');
    expect(css).toContain('html[data-text-size="extra-large"]{font-size:135%}');
    expect(css).toContain('html[data-font-style="readable-serif"]');
    expect(css).toContain('html[data-font-style="readable-sans"]');
    expect(css).toContain("--text-base:1.1rem");
    expect(css).toContain("min-height:var(--control-min-height)");
  });

  test("Extra Large reflows stat, summary and passion grids at laptop and narrow widths", () => {
    expect(css).toContain('@media(max-width:1100px)');
    expect(css).toContain('html[data-text-size="extra-large"] .derived,html[data-text-size="extra-large"] .resistance-values{grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(css).toContain('@media(max-width:760px)');
    expect(css).toContain('html[data-text-size="extra-large"] .concept-details-grid,html[data-text-size="extra-large"] .age-card,');
    expect(css).toContain(".background-event-option span{min-width:0;overflow-wrap:break-word}");
    expect(background).toContain("<span class=\"mtext\">{entry.text}</span>");
    expect(background).not.toContain("entry.text.length > 110");
  });
});
