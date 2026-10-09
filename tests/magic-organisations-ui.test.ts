import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";

const page = readFileSync(new URL("../src/components/Magic.svelte", import.meta.url), "utf8");

describe("Magic & Cults affiliation UI", () => {
  test("renders the independent empty state and add prompt outside capability detection", () => {
    compile(page, { filename: "src/components/Magic.svelte", generate: "client" });
    const capabilities = page.indexOf('<section class="card magic-foundation"');
    const organisations = page.indexOf('<section class="card organisations-section"');
    expect(capabilities).toBeGreaterThanOrEqual(0);
    expect(organisations).toBeGreaterThan(capabilities);
    expect(readFileSync(new URL("../src/lib/store.svelte.ts", import.meta.url), "utf8")).toContain('"Magic & Cults"');
    expect(page).toContain("{#if !char.memberships.length}");
    expect(page).toContain("No memberships yet. Add a guild, company, college, gang, regiment, brotherhood, or cult");
    expect(page).toContain("+ Add organisation");
  });

  test("membership dialog supports joining existing organisations and creating reusable definitions", () => {
    expect(page).toContain('let organisationMode = $state<"join" | "create">("join")');
    expect(page).toContain("Join existing");
    expect(page).toContain("Create new");
    expect(page).toContain("Search organisations");
    expect(page).toContain("availableOrganisations()");
    expect(page).toContain("Theist cult");
    expect(page).toContain("reuses this organisation definition");
    expect(page).toContain('organisationMode === "join" ? !organisationSelectedId');
    expect(page).toContain("joinOrganisation(char.organisations, char.memberships, organisation, memberId, organisationRank)");
    expect(page).toContain("Organisation details (optional)");
    expect(page).toContain("Personal membership notes");
    expect(page).toContain("ensureTheistMembership(organisation, membership)");
  });

  test("ordinary memberships expose contextual organisation types and predictable removal", () => {
    expect(page).toContain('<option value="company">Company</option>');
    expect(page).toContain('<option value="college">College</option>');
    expect(page).toContain('<option value="gang">Gang</option>');
    expect(page).toContain('<option value="guild">Guild</option>');
    expect(page).toContain('<option value="regiment">Regiment</option>');
    expect(page).toContain('<option value="military order">Military order</option>');
    expect(page).toContain('<option value="religious cult">Religious / magical cult</option>');
    expect(page).toContain("Skills taught");
    expect(page).toContain("Duties / obligations");
    expect(page).toContain("Restrictions");
    expect(page).toContain("Benefits");
    expect(page).toContain("Privileges");
    expect(page).toContain("These details belong to the reusable organisation definition.");
    expect(page).toContain("function removeOrganisationMembership");
    expect(page).toContain('organisation?.kind.type === "magical-cult"');
  });

  test("Theist-linked membership exposes shared edit/remove actions and opens existing cult configuration", () => {
    expect(page).toContain("rankTitle(membership.rank, organisation)");
    expect(page).toContain("updateMagicalMembershipRank(membership.id, event.currentTarget.value)");
    expect(page).toContain("updateMembershipTitle(membership.id, event.currentTarget.value)");
    expect(page).toContain("Open Theist cult configuration");
    expect(page).toContain("onclick={openTheismConfigure}");
    expect(page).toContain("{#if theistCult && theismCapability}");
    const magicalCard = page.slice(page.indexOf("{@const theistCult ="), page.indexOf("</article>", page.indexOf("{@const theistCult =")));
    expect(magicalCard).toContain("Edit</button>");
    expect(magicalCard).toContain("Remove membership</button>");
    expect(page).toContain("Personal membership notes");
  });

  test("membership removal confirms ordinary removals and guards only active magical unlinking", () => {
    expect(page).toContain("window.confirm(`Remove your membership in ${organisationName}? This removes only the membership; the organisation remains available.`)");
    expect(page).toContain("hasActiveTheistAffiliation(char.magic, membership, organisation, !!theismCapability)");
    expect(page).toContain("window.alert(`Cannot remove ${organisationName} membership.");
    expect(page).toContain("if (activeTheist || membership.id.startsWith(\"magic:\"))");
    expect(page).toContain("char.magic.theism.memberships = char.magic.theism.memberships.filter(item => item.id !== membershipId && item.cultId !== organisation.id)");
    expect(page).toContain("The app has no safe unlink action yet; keep the membership in place to preserve that configuration.");
  });

  test("Theist membership helper text and configuration action follow Theism capability", () => {
    const theistCardStart = page.indexOf("{@const theistCult =");
    const theistCard = page.slice(theistCardStart, page.indexOf("</article>", theistCardStart));
    expect(theistCard).toContain("{#if theistCult}");
    expect(theistCard).toContain("{#if theismCapability}");
    expect(theistCard).toContain("This cult's magic configuration is managed in Theism above.");
    expect(theistCard).toContain("This is a Theist cult membership. Access to divine magic requires the appropriate magical skills.");
    expect(theistCard).toContain("{#if theistCult && theismCapability}");
    expect(theistCard).toContain("Open Theist cult configuration");
    expect(theistCard).toContain("{:else if !theistCult}");
  });
});
