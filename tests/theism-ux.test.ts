import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";

test("Theism chargen uses Core rules for its compact cult and miracle workflow", () => {
  const source = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");
  const css = compile(source, { filename: "src/components/Magic.svelte", generate: "client" }).css?.code;

  expect(source).toContain("CORE_THEIST_CULTS, CORE_THEIST_MIRACLES");
  expect(source).toContain("devotionalPoolMaximum(char.chars.POW, theismMembership.rank)");
  expect(source).toContain("startingMiracleLimit(theismDevotion)");
  expect(source).toContain("miracleMagnitude(theismDevotion)");
  expect(source).toContain("miracleIntensity(theismDevotion)");
  expect(source).toContain("validateKnownMiracles(theismKnownIds, theismCult, theismMembership.rank, theismDevotion)");
  expect(source).toContain("effectiveMiracleMinimumRank(item.miracle, item.offering)");
  expect(source).toContain("Configure a Theist Cult.");
  expect(source).toContain("Devotion requires a divine specialisation.");
  expect(source).toContain("Configure Cult");
  expect(source).toContain("Cult miracle availability");
  expect(source).toContain("theismMembership.knownMiracleIds = known.filter");
  expect(source).toContain("theismMembership.knownMiracleIds = [...known, id]");
  expect(source).toContain("theismState.customCults.push(cult)");
  expect(source).not.toContain("Core Theism miracle");
  expect(source).toContain("let theismMiracleDetails = $state<string[]>([])");
  expect(source).toContain("aria-expanded={theismMiracleDetails.includes(item.miracle.id)}");
  expect(source).toContain("function toggleTheismMiracleDetails(id: string)");
  expect(source).toContain("<small class=\"theism-miracle-traits\">{item.miracle.traits.join(\" · \")}</small>");
  expect(css).toMatch(/\.theism-miracle-traits[^\{]*\{[^}]*background/);
  expect(css).toMatch(/\.theism-miracle-detail[^\{]*\{[^}]*overflow-wrap:\s*anywhere/);
  expect(css).toMatch(/\.theism-cult-card[^\{]*\{[^}]*grid-template-columns/);
  expect(css).toMatch(/@media\s*\(max-width:\s*600px\)/);
});
