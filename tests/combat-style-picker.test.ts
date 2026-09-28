import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const picker = readFileSync(new URL("../src/components/CombatStyleChooser.svelte", import.meta.url), "utf8");

describe("Combat Style preset resolution view", () => {
  test("replaces browse mode with an accessible, focused resolution step", () => {
    expect(picker).toContain("{#if pendingStyle}");
    expect(picker).toContain('aria-labelledby="combat-style-resolution-title"');
    expect(picker).toContain('bind:this={resolutionHeading} tabindex="-1"');
    expect(picker).toContain("resolutionHeading?.focus()");
    expect(picker).toContain("Use Selected Style");
    expect(picker).toContain("disabled={[...weaponPicks, ...traitPicks].some(index => index < 0)}");
  });

  test("Back preserves search text and restores the results scroll position", () => {
    expect(picker).toContain("bind:value={query}");
    expect(picker).toContain("browseScrollTop = resultsRegion?.scrollTop ?? 0");
    expect(picker).toContain("resultsRegion.scrollTop = browseScrollTop");
    expect(picker).toContain("onclick={backToBrowse}");
  });

  test("uses a shared card grid and compact display citations while retaining full provenance", () => {
    const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/lib/combat-styles.ts", import.meta.url), "utf8");
    expect(picker).toContain('<article class="combat-style-result">');
    expect(picker).toContain('<div class="combat-style-result-content">');
    expect(picker).toContain('styleCitation(style)');
    expect(picker).toContain('"3rd ed., Characters p.$1"');
    expect(css).toContain(".combat-style-result{display:grid;grid-template-columns:minmax(0,1fr) max-content");
    expect(css).toContain("grid-template-columns:132px minmax(0,1fr)");
    expect(css).toContain("overflow-wrap:anywhere");
    expect(css).toContain("@media(max-width:560px)");
    expect(css).toContain(".combat-style-result dl div{grid-template-columns:1fr;gap:0}");
    expect(styles).toContain('Mythras Core Rules, 3rd edition: Sample Combat Styles (Characters, p. 12)');
  });
});

describe("Core Combat Style trait choices and details", () => {
  test("keeps rules text collapsed and exposes it through an associated disclosure button", () => {
    expect(picker).toContain("let expandedTraits = $state<string[]>([])");
    expect(picker).toContain('aria-expanded={expandedTraits.includes(trait.id)}');
    expect(picker).toContain('aria-controls={`${idPrefix}-core-trait-description-${trait.id}`}');
    expect(picker).toContain('hidden={!expandedTraits.includes(trait.id)}');
    expect(picker).toContain('onclick={() => toggleTraitDetails(trait.id)}');
    expect(picker.match(/\{trait\.description\}/g)).toHaveLength(1);
    expect(picker).toContain('<div class="trait-picker-heading">');
    expect(picker).toContain('<div class="trait-picker-description" id={`${idPrefix}-core-trait-description-${trait.id}`}');
    expect(picker).toContain('<label class="trait-picker-choice"><input type="checkbox"');
    expect(picker).toContain('<span><b>{trait.displayName}</b></span></label>');
    expect(picker).toContain("onchange={event => pickedTraits = event.currentTarget.checked");
    expect(picker).not.toContain("<details>");
    expect(picker).not.toContain("<small>{trait.description}</small>");
    expect(picker).not.toContain("<small>{trait.displayName}</small>");
  });

  test("search includes descriptions while collapsed and details do not change selection", () => {
    expect(picker).toContain('`${trait.displayName} ${trait.description ?? ""}`');
    expect(picker).toContain("function toggleTraitDetails(id: string)");
    expect(picker).toContain("expandedTraits = expandedTraits.includes(id)");
    expect(picker).not.toContain("expandedTraits = pickedTraits");
  });

  test("uses caller-specific prefixes so disclosure ids stay unique", () => {
    expect(picker).toContain("idPrefix: string");
    const skills = readFileSync(new URL("../src/components/Skills.svelte", import.meta.url), "utf8");
    expect(skills).toContain('idPrefix={`career-combat-style-${i}`}');
    expect(skills).toContain('idPrefix="culture-combat-style"');
    expect(skills).toContain('idPrefix="bonus-combat-style"');
  });

  test("aligns checkbox and wrapping trait label in a compact horizontal control", () => {
    const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
    expect(css).toContain(".combat-style-editor .trait-picker-choice{display:flex;align-items:center;gap:8px;min-width:0;cursor:pointer}");
    expect(css).toContain(".trait-picker-result input{flex:none;margin:0}");
    expect(css).toContain(".trait-picker-result label span{display:block;min-width:0;overflow-wrap:anywhere}");
    expect(css).toContain("input:focus-visible");
  });

  test("renders selected traits as wrapping, accessible removable chips", () => {
    const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
    expect(picker).toContain('<ul class="picked-trait-chips">');
    expect(picker).toContain('class="picked-trait-chip"');
    expect(picker).toContain('aria-label={`Remove ${trait.displayName}`}');
    expect(picker).toContain('<span aria-hidden="true">×</span>');
    expect(picker).toContain('pickedTraits = pickedTraits.filter(id => id !== trait.id)');
    expect(picker).toContain('Selected traits ({pickedCoreTraits.length + (customTraitName.trim() ? 1 : 0)})');
    expect(picker).toContain('No traits selected.');
    expect(css).toContain('.picked-trait-chips{display:flex;flex-wrap:wrap;gap:8px;');
    expect(css).toContain('.picked-trait-chip{display:inline-flex;');
    expect(css).toContain('.picked-trait-name{min-width:0;overflow-wrap:anywhere}');
    expect(css).toContain('button:focus-visible');
  });
});
