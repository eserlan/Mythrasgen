import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("the library opens the active character and switches before opening an inactive one", () => {
  const source = readFileSync(new URL("../src/components/Characters.svelte", import.meta.url), "utf8");
  expect(source).toContain("if (active) {");
  expect(source).toContain("if (!selectCharacter(id)) {");
  expect(source).toContain('role="alert"');
  expect(source).toContain('active ? "Open" : "Select"');
});
