import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("bonus skill controls", () => {
  test("the hobby skill input has an accessible name", () => {
    const skills = readFileSync(new URL("../src/components/Skills.svelte", import.meta.url), "utf8");
    expect(skills).toContain('aria-label="New professional hobby skill or combat style"');
  });
});
