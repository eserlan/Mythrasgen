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

## Provisional Mythras Core equipment catalogue

The source-indexed 3rd edition equipment data lives in `catalogue_source_index.json`; the CSV and `validation_report.json` are cross-check inputs. Validate them with `bun run catalogue:validate`. The import in `src/lib/equipment-catalogue.ts` preserves source rows and printed-page provenance, assigns stable catalogue IDs, and tags candidate fields with their verification state. This dataset is provisional and its extracted candidate values are not all verified Core facts.

Shield price candidates use the values attributed to the Mythras 3rd edition Core Rulebook, Economics & Equipment, p. 63, Shields table: Buckler 50 SP, Heater 150 SP, Hoplite 300 SP, Kite 300 SP, Peltast 150 SP, Scutum 450 SP, Target 150 SP, and Viking 300 SP. The rulebook PDF is not included in this checkout, so those prices have not been independently visually checked here.

An unavailable candidate price remains `null` and displays as “Price unavailable”. Purchase creation rejects that state unless a GM enters an explicit price in integer CP. Items can still be acquired as gifted, inherited, or granted. Catalogue rows are frozen; owned items and purchase transactions are separate records, and each transaction stores the exact CP amount at acquisition time. One physical weapon can reference multiple wielding-profile rows; armour constructions and material modifiers are separate catalogue record kinds.

## Rules validation

Run `bun test` for the core formula, boundary, and bundled culture/career regression fixtures. The fixtures use the detailed Mythras 3rd-printing rules as the authority; the Character Creation Workbook is a cross-check. INT and SIZ point-buy minima are 8 per the detailed rule and Workbook, despite the later core summary's printed 6. Where Workbook skill-base entries disagree with the core Standard Skills table, core table values control. Companion alternatives are not part of these core fixtures.

The checkout does not include the official PDFs. This first suite therefore locks the mechanics and packages currently implemented in the app; it does not yet validate ages, Passions, background-event counts, magic skill formulas, a published end-to-end example, or age-dependent bonus pools. Those source-backed fixtures need the relevant official pages/data before those rules are added to the app.
