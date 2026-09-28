import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const picker = readFileSync(new URL("../src/components/CombatStyleChooser.svelte", import.meta.url), "utf8");

describe("Combat Style preset resolution view", () => {
  test("replaces browse mode with an accessible, focused resolution step", () => {
    expect(picker).toContain("{#if pendingStyle}");
    expect(picker).toContain('aria-labelledby="combat-style-resolution-title"');
    expect(picker).toContain("bind:this={resolutionHeading} tabindex=\"-1\"");
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
});

describe("Core Combat Style trait details", () => {
  test("keeps rules text collapsed and exposes it through an associated disclosure button", () => {
    expect(picker).toContain("let expandedTraits = $state<string[]>([])");
    expect(picker).toContain('aria-expanded={expandedTraits.includes(trait.id)}');
    expect(picker).toContain('aria-controls={`core-trait-description-${trait.id}`}');
    expect(picker).toContain('hidden={!expandedTraits.includes(trait.id)}');
    expect(picker).toContain('onclick={() => toggleTraitDetails(trait.id)}');
    expect(picker.match(/\{trait\.description\}/g)).toHaveLength(1);
    expect(picker).toContain('<div class="trait-picker-heading">');
    expect(picker).toContain('<div class="trait-picker-description" id={`core-trait-description-${trait.id}`}');
    expect(picker).not.toContain("<details>");
    expect(picker).not.toContain("<small>{trait.description}</small>");
  });

  test("search includes descriptions while collapsed and details do not change selection", () => {
    expect(picker).toContain('`${trait.displayName} ${trait.description ?? ""}`');
    expect(picker).toContain("function toggleTraitDetails(id: string)");
    expect(picker).toContain("expandedTraits = expandedTraits.includes(id)");
    expect(picker).not.toContain("expandedTraits = pickedTraits");
  });
});
