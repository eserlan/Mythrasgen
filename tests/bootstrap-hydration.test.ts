import { expect, test } from "bun:test";

test("persisted Barbarian style completes store bootstrap", () => {
  const result = Bun.spawnSync(["bun", "tests/fixtures/bootstrap-barbarian.mjs"], {
    cwd: process.cwd(), stdout: "pipe", stderr: "pipe",
  });
  expect(result.exitCode).toBe(0, new TextDecoder().decode(result.stderr));
  expect(new TextDecoder().decode(result.stdout)).toContain("bootstrap passed");
});
