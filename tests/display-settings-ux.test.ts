import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { compile } from "svelte/compiler";

const app = readFileSync(new URL("../src/App.svelte", import.meta.url), "utf8");
const landing = readFileSync(new URL("../src/components/Landing.svelte", import.meta.url), "utf8");
const settings = readFileSync(new URL("../src/components/Settings.svelte", import.meta.url), "utf8");
const save = readFileSync(new URL("../src/components/Save.svelte", import.meta.url), "utf8");
const background = readFileSync(new URL("../src/components/Background.svelte", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

describe("display settings interface", () => {
  test("Settings is available from the global application menu and landing page", () => {
    expect(app).toContain("<button aria-current={showSettings ? \"page\" : undefined}");
    expect(app).toContain("<Settings settings={displaySettings}");
    expect(landing).toContain("<button class=\"big\" onclick={onSettings}>Settings</button>");
  });

  test("print modes are offered in an accessible dialog in the required order", () => {
    expect(app).not.toContain("Print output");
    expect(app).toContain('<dialog class="print-dialog" bind:this={printDialog} aria-labelledby="print-dialog-title"');
    expect(app).toContain("<h2 id=\"print-dialog-title\">Print character</h2>");
    const options = ["titles-and-appendix", "titles-only", "notes-and-appendix", "notes-only", "appendix-only"];
    const positions = options.map(mode => app.indexOf(`value="${mode}"`));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(app).toContain('("titles-and-appendix");');
    expect(app).toContain("onclick={openPrintDialog}");
    expect(app).toContain("onclick={print}");
    expect(app).not.toContain("Download Character");
    expect(app).not.toContain('downloadCharacter("pdf")');
    expect(app).not.toContain('downloadCharacter("markdown")');
    expect(app).toContain("Cancel</button>");
  });

  test("Save screen contains one copy of each active-character export", () => {
    expect(app).toContain('<button aria-current={showSave ? "page" : undefined} onclick={() => { showSave = true;');
    expect(app).toContain("<Save onSave={save} onDownload={downloadCharacter}");
    expect(save.match(/>Download Character</g)).toHaveLength(1);
    expect(save).toContain("Save the active character to this device.");
    expect(save.match(/>Editable PDF</g)).toHaveLength(1);
    expect(save.match(/>Markdown \(.md\)<\/button>/g)).toHaveLength(1);
    expect(save).toContain('onDownload("pdf")');
    expect(save).toContain('onDownload("markdown")');
    expect(compile(save, { filename: "src/components/Save.svelte", generate: "client" }).js.code).toContain("onDownload");
  });

  test("print dialog has responsive styling and visible keyboard focus", () => {
    expect(css).toContain(".print-dialog{width:min(620px,calc(100vw - 28px))");
    expect(css).toContain(".print-dialog::backdrop");
    expect(css).toContain("input:focus-visible");
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
