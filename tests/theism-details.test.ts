import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { availableTheistCultMiracles, CORE_THEIST_CULTS, CORE_THEIST_MIRACLES, normalizeTheismState } from "../src/lib/theism";

test("Page VI resolves saved Core miracle offerings to canonical Details", () => {
  const fortify = CORE_THEIST_MIRACLES.find(miracle => miracle.name === "Fortify")!;
  const shield = CORE_THEIST_MIRACLES.find(miracle => miracle.name === "Shield")!;
  const myceras = CORE_THEIST_CULTS.find(cult => cult.name === "Cult of Myceras")!;
  const saved = normalizeTheismState({
    customCults: [{
      ...myceras,
      source: "custom",
      miracles: myceras.miracles.map(offering => ({ ...offering, description: "Core Theism miracle" })),
    }],
    memberships: [],
  });
  const cult = saved.customCults[0]!;
  const resolved = availableTheistCultMiracles(cult, "Initiate");
  const fortifyDetails = resolved.find(item => item.miracle.id === fortify.id)!.miracle;
  const shieldDetails = resolved.find(item => item.miracle.id === shield.id)!.miracle;

  expect(fortifyDetails.traits).toEqual(["Area (Tens of Metres)", "Duration (Instant)", "Rank Initiate", "Resist (Evade)"]);
  expect(fortifyDetails.description).toBe("Adds Intensity to the natural AP of buildings and walls. Offensive magic that damages or modifies protected construction has its Intensity reduced by Fortify Intensity.");
  expect(shieldDetails.traits).toContain("Rank Initiate");
  expect(shieldDetails.description).toContain("Grants AP equal to Intensity on all hit locations.");
  expect(JSON.stringify([fortifyDetails, shieldDetails])).not.toContain("Core Theism miracle");

  const page = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");
  expect(page).toContain("availableTheistCultMiracles(theismCult, theismMembership.rank)");
  expect(page).toContain("{item.miracle.traits.join(\" · \")}");
  expect(page).toContain("<p>{item.miracle.description}</p>");
});

test("cult presets and saved rank overrides retain their offerings", () => {
  const preset = CORE_THEIST_CULTS.find(cult => cult.name === "Cult of Myceras")!;
  const beast = CORE_THEIST_MIRACLES.find(miracle => miracle.name === "Beast Form")!;
  expect(preset.miracles.map(item => item.miracleId).sort()).toEqual(
    ["Beast Form", "Berserk", "Clear Skies", "Consecrate", "Fortify", "Sacred Band", "Shield", "Sunspear"]
      .map(name => CORE_THEIST_MIRACLES.find(miracle => miracle.name === name)!.id).sort(),
  );

  const cult = normalizeTheismState({
    customCults: [{ ...preset, id: "custom:myceras", source: "custom", miracles: preset.miracles.map(item =>
      item.miracleId === beast.id ? { ...item, minimumRank: "Initiate" as const } : { ...item }) }],
    memberships: [],
  }).customCults[0]!;
  const restored = normalizeTheismState(JSON.parse(JSON.stringify({ customCults: [cult], memberships: [] })));
  expect(restored.customCults[0]?.miracles.find(item => item.miracleId === beast.id)).toEqual({ miracleId: beast.id, minimumRank: "Initiate" });
  expect(restored.customCults[0]?.miracles.map(item => item.miracleId)).toContain(beast.id);
});
