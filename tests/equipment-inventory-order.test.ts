import { expect, test } from "bun:test";

(globalThis as typeof globalThis & { $state: <T>(value: T) => T }).$state = value => value;
const { normalizeCharacter } = await import("../src/lib/store.svelte");

const owned = (id: string, name: string) => ({ id, name, quantity: 1, state: "carried" });

test("character normalization preserves saved equipment order and legacy inventory sequence", () => {
  const saved = normalizeCharacter(JSON.parse(JSON.stringify({
    id: "ordered-character",
    background: {
      inventory: [owned("first", "First item"), owned("middle", "Middle item"), owned("last", "Last item")],
      inventoryOrder: ["last", "first", "middle", "removed-item"],
    },
  })));
  expect(saved.background.inventoryOrder).toEqual(["last", "first", "middle"]);

  const legacy = normalizeCharacter({
    id: "legacy-character",
    background: { inventory: [owned("legacy-first", "First item"), owned("legacy-second", "Second item")] } as never,
  });
  expect(legacy.background.inventoryOrder).toEqual(["legacy-first", "legacy-second"]);
});
