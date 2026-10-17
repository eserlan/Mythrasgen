import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { tryOpenCharacter } from "../src/lib/character-library-ui";

test("the library exposes failed selection feedback without opening", () => {
  const source = readFileSync(new URL("../src/components/Characters.svelte", import.meta.url), "utf8");
  expect(source).toContain("if (active) {");
  expect(source).toContain('role="alert">{switchError}');
  expect(source).toContain('active ? "Open" : "Select"');

  let opened = false;
  const error = tryOpenCharacter("removed-character", () => false, () => { opened = true; });

  expect(error).toContain("could not be selected");
  expect(opened).toBe(false);
});

test("the library exposes thrown selection errors without opening", () => {
  let opened = false;
  const error = tryOpenCharacter("character", () => {
    throw new Error("selection failed");
  }, () => { opened = true; });

  expect(error).toBe("Could not open this character: selection failed");
  expect(opened).toBe(false);
});
