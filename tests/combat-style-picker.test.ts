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
