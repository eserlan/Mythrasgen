import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";

test("Sorcery chargen uses the shared School and spell data in a searchable picker", () => {
  const source = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");
  const css = compile(source, { filename: "src/components/Magic.svelte", generate: "client" }).css?.code;

  expect(source).toContain("sorcerySchoolCatalogue(sorceryState)");
  expect(source).toContain("calculateSorceryStartingEntitlement(invocationSkill?.value)");
  expect(source).toContain("calculateSorceryDerivedStatistics(invocationSkill?.value, shapingSkill?.value, char.chars.INT)");
  expect(source).toContain("availableSorcerySpellIds({ ...sorceryState, schoolIds: [sorcerySchool.id], startingSchoolId: sorcerySchool.id })");
  expect(source).toContain("<option value=\"__custom_school__\">Custom School…</option>");
  expect(source).toContain("Add spells to School");
  expect(source).toContain("Save School spells");
  expect(source).toContain("sorcerySchoolPickerSpells");
  expect(source).toContain("configureCoreSorcerySpell(base, subject)");
  expect(source).toContain("Choose a {spell.specialisationPrompt.toLowerCase()} before adding this spell to a School.");
  expect(source).toContain("Specialisation / subject (optional)");
  expect(source).toContain("Some starting spells are no longer available from this School");
  expect(source).not.toContain("Sorcery specialist");
  expect(source).not.toContain("magicType");
  expect(css).toMatch(/\.folk-magic-picker[^{]*\{[^}]*overflow:\s*hidden/);
  expect(css).toMatch(/\.folk-magic-picker-content[^{]*\{[^}]*overflow-y:\s*auto/);
});
