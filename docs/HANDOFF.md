# Handoff: pick up building Open House

State: the interview is finished and the repo is a skeleton. No application code exists. Nothing has been installed.

Read in this order: this file, `docs/SPEC.md`, `GLOSSARY.md`, then `reference/model2.js`.

## Context
Three partners are weighing a lease on a restored Indo-Portuguese house in Velsao, South Goa, about 750 m from the beach. They had already built a one-off analysis (a page and an Excel workbook) comparing Plans A, B and C. A friend then proposed a different approach (hand the whole house to StayVista, sublease part to a café brand). Rather than keep editing the analysis, they want a configurable product their friends can use. That product is Open House.

## Settled
Everything in `docs/SPEC.md`. Highlights: general engine, URL and browser-storage saving (no backend), one `openhouse/v1` JSON format for import/export/share, no AI inside the app, subleases as a list, sections with area and block diagram, earnings by section, J-curve with band, compare up to 4 plans.

## Assumptions to confirm with the user
- The friend's note reads "100000 - 75k = 4500000" and "106000 - 81k = 4860000", which I read as rent Rs 75k (5 years) then Rs 81k (5 years), against owner asking rents of Rs 1L and Rs 1.06L. "7 months off, 90 thousand every month" is read as 7 rent-free months; the user agreed.
- "Monthly 1.3 to 1.8" for the café brand is read as Rs 1.3-1.8 lakh a month of rent paid to the partners. The user agreed.
- StayVista commission 27.5% (range 20-35%) is from the note (25-30%) and one 2022 press report (about 30%). No official owner terms were found.
- Pool, power backup, kitchen and premium furnishing costs are rough placeholders, to be replaced by Dulce's quotes.
- The StayVista template's occupancy and whole-villa rates are untested guesses. Do not present its results as findings.

## Build order
1. **Scaffold**: `npm create vite@latest . -- --template react-ts`, add Tailwind, Recharts, Vitest, a path alias. Keep the folders already here.
2. **Types and schema** in `src/schema`: `Plan` type, `openhouse/v1` validator with plain-English errors, defaults, list of filled defaults.
3. **Engine** in `src/engine` (pure TypeScript). Port `reference/model2.js` first as a single path (operator `self`, café as a card), and write the accuracy tests from the table in `docs/SPEC.md`. Do not move on until Plans A, B and C match.
4. Extend the engine: rent steps, walk-away year, subleases, StayVista operator, sections and area-split profit, band cases, break-even by bisection.
5. **Templates**: A, B, C (converted from `PLANS`) and the StayVista plan.
6. **App**: dashboard (cards left, J-curve and key numbers right), easy and advanced modes, compare view, section block diagram, earnings by section.
7. **Import page** and share links (compressed into the URL).
8. Polish: tooltips, light/dark, mobile checks. Then publish on Vercel (the user must connect their own account).

## Model facts to preserve when porting
- 108 monthly steps for a 9-year lease; make the length configurable.
- Seasons: peak Dec-Feb, shoulder Oct-Nov and Mar-Apr, low May, monsoon Jun-Sep.
- Occupancy ramp: x0.6 in operating months 1-6, x0.8 in 7-12, x0.92 in 13-24, then x1.
- Inflation 6% on costs, pay rises 7%, rent escalates 5% after 3 flat years (replace with rent steps, but keep a way to reproduce this exactly).
- Tax: 31.2% on profit after straight-line depreciation over the lease. Deposit and working capital return at lease end. Utilities are 70% fixed, 30% moving with occupancy. Café ramps with `min(1, ramp + 0.1)`.
- IRR and break-even occupancy come from bisection. See `breakEven` and `maxRent` in the oracle.
- `reference/solve.js` and `reference/solved.json` hold the oracle's scenario outputs, useful as extra test cases.

## Gotchas
- Rupees internally, lakh only at the display layer.
- Share links must stay short: compress the JSON (for example lz-string) and keep default-valued fields out.
- Never build a feature that calls an AI model. The import prompt is text the user copies.
- GitHub-flavoured issues: this repo uses GitHub Issues and the default triage labels (`docs/agents/`).

## Suggested skills
- `mattpocock-skills:tdd` for the engine and schema.
- `mattpocock-skills:to-spec` and `mattpocock-skills:to-tickets` if you want the build order turned into GitHub issues.
- `mattpocock-skills:prototype` for the dashboard layout before committing to it.
- `mattpocock-skills:domain-modeling` when new terms or decisions appear (keeps `GLOSSARY.md` and `docs/adr/` current).
- `mattpocock-skills:code-review` before merging larger chunks.
- The `artifact-design` and `dataviz` skills for the J-curve chart.

## Where things are
- Legacy page (the thing being replaced): `reference/legacy-page/index.html`; published at https://claude.ai/artifact/DDWTpuPWNbXmNZCMJGKNJD.
- The user's Excel workbook for Plans A-C: `/Users/darren/Developer/velsao-house/velsao-plan-a-vs-b.xlsx` (not in this repo).
- Friend's note: `docs/source/stayvista-friend-note.jpg`.
