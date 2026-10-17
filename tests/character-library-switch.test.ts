import { expect, test } from "bun:test";

test("store switches, reopens, and persists independent characters", () => {
  const result = Bun.spawnSync(["bun", "tests/fixtures/character-library-switch.mjs"], {
    cwd: process.cwd(), stdout: "pipe", stderr: "pipe",
  });
  expect(result.exitCode).toBe(0, new TextDecoder().decode(result.stderr));
  expect(new TextDecoder().decode(result.stdout)).toContain("character switching passed");
});
