# Mythras Chargen

Guided character builder for the Mythras RPG. Svelte 5 + Vite + TypeScript, deployed to GitHub Pages.

    bun install
    bun run dev      # local dev server
    bun run check    # type check
    bun run build    # production build in dist/

- Rules formulas and point pools: `src/lib/rules.ts`
- Cultures and careers (add your own): `src/lib/content.ts`

## Printing

**Print** fills the official two-page *Mythras Character Sheet* PDF (`src/assets/mythras-character-sheet.pdf`) with the selected character and opens it for printing. The template has no form fields, so text is stamped at coordinates measured from the sheet (`src/lib/sheet-pdf.ts`); what goes where is decided in `src/lib/sheet-data.ts`. Only recorded data is printed, and text that does not fit its field is shortened with the full text added to a labelled supplement page.

Provenance: the template is the publicly distributed Mythras Character Sheet (design and layout by Evelyn H.), included on the project owner's confirmation that it is not copyrighted.

## Rules validation

Run `bun test` for the core formula, boundary, and bundled culture/career regression fixtures. The fixtures use the detailed Mythras 3rd-printing rules as the authority; the Character Creation Workbook is a cross-check. INT and SIZ point-buy minima are 8 per the detailed rule and Workbook, despite the later core summary's printed 6. Where Workbook skill-base entries disagree with the core Standard Skills table, core table values control. Companion alternatives are not part of these core fixtures.

The checkout does not include the official PDFs. This first suite therefore locks the mechanics and packages currently implemented in the app; it does not yet validate ages, Passions, background-event counts, magic skill formulas, a published end-to-end example, or age-dependent bonus pools. Those source-backed fixtures need the relevant official pages/data before those rules are added to the app.
