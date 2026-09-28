import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const picker = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");

describe("Folk Magic spell picker scrolling", () => {
  test("keeps long spell lists and controls in the single modal-body scroll flow", () => {
    expect(picker).toContain("max-height:min(86dvh,760px);overflow:hidden");
    expect(picker).toContain("overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain");
    expect(picker).toContain(".folk-magic-picker-list{flex:none;list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}");
    expect(picker).not.toContain(".folk-magic-picker-list{list-style:none;margin:0;padding:0;overflow:auto");

    const list = picker.indexOf('<ul class="folk-magic-picker-list">');
    const findSubject = picker.indexOf('<label class="folk-magic-find">Find subject <input bind:value={findSubject}', list);
    expect(list).toBeGreaterThan(-1);
    expect(findSubject).toBeGreaterThan(list);
  });

  test("wraps filter tabs on narrow layouts and preserves picker controls", () => {
    expect(picker).toContain(".folk-magic-tabs{display:flex;flex-wrap:wrap;gap:4px");
    expect(picker).not.toContain(".folk-magic-tabs{display:flex;gap:4px;margin:12px 0 8px;overflow-x:auto}");
    expect(picker).toContain("Search available spells");
    expect(picker).toContain("Details");
    expect(picker).toContain("Create custom spell");
    expect(picker).toContain("Find subject");
  });
});
