import { describe, expect, test } from "bun:test";
import {
  CORE_MYSTICISM_PATHS, CORE_MYSTICISM_TALENTS, mysticismCatalogue,
  mysticismTalentDetails, normalizeMysticismState,
} from "../src/lib/mysticism";

const detailFor = (name: string) => mysticismTalentDetails(CORE_MYSTICISM_TALENTS.find(talent => talent.name === name)!);

describe("Core Mysticism Talent details", () => {
  test("gives every Core Path Talent a family, cost, and useful effect", () => {
    const referencedIds = new Set(CORE_MYSTICISM_PATHS.flatMap(path => path.talentIds));
    const referencedTalents = CORE_MYSTICISM_TALENTS.filter(talent => referencedIds.has(talent.id));
    expect(referencedTalents.length).toBeGreaterThan(0);
    for (const talent of referencedTalents) {
      const details = mysticismTalentDetails(talent)!;
      expect(details.family.length).toBeGreaterThan(0);
      expect(details.cost.length).toBeGreaterThan(0);
      expect(details.effect.length).toBeGreaterThan(20);
      expect(details.effect).not.toContain("Use this Talent");
    }
  });

  test("derives Augment rules and costs from the canonical target", () => {
    expect(detailFor("Augment Influence")).toEqual({
      family: "Augment Skill", cost: "1 MP per Intensity",
      effect: "Each level of Intensity improves Influence by one difficulty grade, to a maximum of Very Easy. Further Intensity can offset later penalties.",
    });
    expect(detailFor("Augment Ranged Combat Style").effect).toContain("applicable ranged Combat Style");
  });

  test("describes Invoke costs, specialisations, and distinct sight abilities", () => {
    expect(detailFor("Invoke Adhesion").cost).toBe("2 MP · Intensity 1");
    expect(detailFor("Invoke Aura (Wisdom)").effect).toContain("POW in metres");
    expect(detailFor("Invoke Denial (Ignorance)").effect).toContain("specifically defined condition, Ignorance");
    expect(detailFor("Invoke Disease Immunity").effect).toContain("immunity to one narrowly defined source of disease");
    expect(detailFor("Invoke Poison Immunity").effect).toContain("one narrowly defined source of poison");
    expect(CORE_MYSTICISM_TALENTS.find(talent => talent.name === "Invoke Disease Immunity")).toMatchObject({ trait: "Immunity", specialisation: "Disease" });
    expect(detailFor("Invoke Dark Sight").effect).toContain("complete darkness");
    expect(detailFor("Invoke Night Sight").effect).toContain("darkness as partial darkness");
    expect(detailFor("Invoke Dark Sight").effect).not.toBe(detailFor("Invoke Night Sight").effect);
    expect(detailFor("Invoke Formidable Natural Weapons").effect).toContain("Size Large");
  });

  test("includes the Core Enhance mechanics and limitations", () => {
    expect(detailFor("Enhance Action Points").effect).toContain("only be used for defensive combat actions");
    expect(detailFor("Enhance Damage Modifier").effect).toContain("one step");
    expect(detailFor("Enhance Fatigue").effect).toContain("Fatigue returns");
    expect(detailFor("Enhance Healing Rate").effect).toContain("Months → Weeks → Days → Hours → Minutes → Combat Rounds");
    expect(detailFor("Enhance Hit Points").effect).toContain("Serious and Major Wound thresholds do not change");
    expect(detailFor("Enhance Movement").effect).toContain("2 metres");
    expect(detailFor("Enhance Initiative").effect).toContain("adds 2");
  });

  test("keeps custom descriptions authoritative and Core rules outside character saves", () => {
    const state = normalizeMysticismState({ customTalents: [{ id: "custom:talent", name: "Invoke Dark Sight", source: "custom", family: "invoke-trait", target: "Dark Sight", description: "Campaign version." }] });
    const custom = state.customTalents[0];
    expect(mysticismTalentDetails(custom)).toMatchObject({ family: "Invoke Trait", cost: "2 MP · Intensity 1", effect: "Campaign version." });
    expect(mysticismCatalogue(state).talents.find(talent => talent.id === "custom:talent")?.description).toBe("Campaign version.");
    expect(state).not.toHaveProperty("coreTalentDetails");
  });
});
