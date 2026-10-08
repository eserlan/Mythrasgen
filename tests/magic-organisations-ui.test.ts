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

  test("ordinary memberships expose editable details and predictable removal", () => {
    expect(page).toContain('<option value="company">Company</option>');
    expect(page).toContain('<option value="college">College</option>');
    expect(page).toContain('<option value="gang">Gang</option>');
    expect(page).toContain('<option value="guild">Guild</option>');
    expect(page).toContain('<option value="regiment">Regiment</option>');
    expect(page).toContain('<option value="custom">Custom brotherhood</option>');
    expect(page).toContain("Skills taught");
    expect(page).toContain("Obligations / duties");
    expect(page).toContain("Restrictions");
    expect(page).toContain("Benefits");
    expect(page).toContain("function removeOrganisationMembership");
    expect(page).toContain('organisation?.kind.type === "magical-cult"');
  });

  test("Theist-linked membership summarizes its saved rank and opens existing cult configuration", () => {
    expect(page).toContain("rankTitle(membership.rank, organisation)");
    expect(page).toContain("Open Theist cult configuration");
    expect(page).toContain("onclick={openTheismConfigure}");
    const magicalCardActions = page.slice(page.indexOf("{:if magical}"), page.indexOf("{:else}", page.indexOf("{:if magical}")));
    expect(magicalCardActions).not.toContain("Remove membership");
    expect(magicalCardActions).not.toContain("Edit</button>");
  });
});
