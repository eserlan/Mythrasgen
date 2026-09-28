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

describe("custom Combat Style trait choices", () => {
  test("keeps the checkbox and trait name in one accessible, aligned label", () => {
    expect(picker).toContain('<label class="trait-picker-choice"><input type="checkbox"');
    expect(picker).toContain('<span><b>{trait.displayName}</b><small>{trait.description}</small></span></label>');
    expect(picker).toContain("onchange={event => pickedTraits = event.currentTarget.checked");
  });

  test("uses a wrapping text column and preserves a visible checkbox focus state", () => {
    expect(picker).toContain("class=\"trait-picker-choice\"");
    expect(readFileSync(new URL("../src/app.css", import.meta.url), "utf8")).toContain(
      ".combat-style-editor fieldset .trait-picker-choice{display:grid;grid-template-columns:18px minmax(0,1fr);align-items:start;gap:0 8px;min-width:0;cursor:pointer}",
    );
    expect(readFileSync(new URL("../src/app.css", import.meta.url), "utf8")).toContain("input:focus-visible");
  });
});
