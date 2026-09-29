import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";

test("custom Path Talents use a searchable picker and compact removable summary", () => {
  const source = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");
  const css = compile(source, { filename: "src/components/Magic.svelte", generate: "client" }).css?.code;

  expect(source).toContain("const customPathCoreTalents = $derived(mysticismData.talents.filter(talent => talent.source === \"core\"))");
  expect(source).toContain("customPathTalentPicker.showModal()");
  expect(source).toContain("bind:value={customPathTalentQuery}");
  expect(source).toContain("customPathTalentIds.includes(talent.id)");
  expect(source).toContain("Remove {talent.name}");
  expect(source).not.toContain("Add existing Core Talents");
  expect(source).not.toContain("mysticism-core-talents-options");
  expect(source).toContain("<summary>Create Custom Talent</summary>");
  expect(css).toMatch(/\.folk-magic-picker[^\{]*\{[^}]*overflow:\s*hidden/);
  expect(css).toMatch(/\.folk-magic-picker-content[^\{]*\{[^}]*overflow-y:\s*auto/);
  expect(css).toMatch(/\.folk-magic-picker-list[^\{]*>li[^\{]*\{[^}]*flex-wrap:\s*wrap/);
});
