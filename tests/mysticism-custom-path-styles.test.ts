import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";

test("custom Path Talent options keep their horizontal checkbox layout inside the form", () => {
  const source = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");
  const css = compile(source, { filename: "src/components/Magic.svelte", generate: "client" }).css?.code;

  expect(css).toMatch(/\.folk-magic-custom-form[^{}]*\.mysticism-core-talent-option[^{}]*\{[^}]*display:flex/);
});
