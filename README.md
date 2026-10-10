# Mythras Chargen

Guided character builder for the Mythras RPG. Svelte 5 + Vite + TypeScript, deployed to GitHub Pages.

    bun install
    bun run dev      # local dev server
    bun run check    # type check
    bun run build    # production build in dist/

- Rules formulas and point pools: `src/lib/rules.ts`
- Cultures and careers (add your own): `src/lib/content.ts`

## Provisional Mythras Core equipment catalogue

The source-indexed 3rd edition equipment data lives in `catalogue_source_index.json`; the CSV and `validation_report.json` are cross-check inputs. Validate them with `bun run catalogue:validate`. The import in `src/lib/equipment-catalogue.ts` preserves source rows and printed-page provenance, assigns stable catalogue IDs, and tags candidate fields with their verification state. This dataset is provisional and its extracted candidate values are not all verified Core facts.

An unavailable candidate price remains `null` and displays as “Price unavailable”. Purchase creation rejects that state unless a GM enters an explicit price in integer CP. Items can still be acquired as gifted, inherited, or granted. Catalogue rows are frozen; owned items and purchase transactions are separate records, and each transaction stores the exact CP amount at acquisition time. One physical weapon can reference multiple wielding-profile rows; armour constructions and material modifiers are separate catalogue record kinds.

## Rules validation

Run `bun test` for the core formula, boundary, and bundled culture/career regression fixtures. The fixtures use the detailed Mythras 3rd-printing rules as the authority; the Character Creation Workbook is a cross-check. INT and SIZ point-buy minima are 8 per the detailed rule and Workbook, despite the later core summary's printed 6. Where Workbook skill-base entries disagree with the core Standard Skills table, core table values control. Companion alternatives are not part of these core fixtures.

The checkout does not include the official PDFs. This first suite therefore locks the mechanics and packages currently implemented in the app; it does not yet validate ages, Passions, background-event counts, magic skill formulas, a published end-to-end example, or age-dependent bonus pools. Those source-backed fixtures need the relevant official pages/data before those rules are added to the app.
