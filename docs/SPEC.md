# Open House spec

Agreed through a design-tree interview. Decisions are final unless reopened.

## Product
- General tool for "should we lease and run this property?" Velsao is the first plan.
- Money in rupees, displayed in lakh. Goa seasons (peak Dec-Feb, shoulder Oct-Nov and Mar-Apr, low May, monsoon Jun-Sep) are editable defaults.
- Stack: Vite, React, TypeScript, Tailwind, Recharts, Vitest. Own repo, deployed on Vercel.

## Plan contents
- **Sections**: name, type (indoor floor, outdoor land, terrace, roof), area m2, optional parent, note. Every room, card and sublease is placed in a section. Over-capacity shows a warning, never blocks. Rough sizes: suite 25 m2, café 60 m2, padel court 200 m2.
- **Lease**: length in years (configurable), rent as steps with an auto-escalate button, rent-free months, deposit months.
- **Walk-away year** (optional): rent stops, deposit returns, fit-out written off, subleases end.
- **Operator**:
  - `self`: per-room pricing, 15.5% booking-site fee (editable), own staff.
  - `stayvista`: one whole-villa nightly rate (default Rs 25,000 in peak, lower in other seasons), 27.5% of room income after GST (range 20-35%). StayVista pays marketing, booking fees, guest service and housekeeping. Partners pay rent, utilities, caretaker, pool and garden upkeep, repairs, identical furnishing.
  - `mixed`.
  - Each cost line has a "paid by" setting.
- **Cards** (on/off, each with build cost, running cost, income): rooms, self-run café, co-working, pool (about 10x4 m, Rs 15L build, Rs 15k/month upkeep, +30% on rate), power backup (generator plus inverter, Rs 4L, Rs 8k/month), kitchen and catering.
- **Subleases** (any number): kind (café, padel, shop, yoga, other); rent mode (fixed, share of sales, or max of minimum and share); start month, tenant rent-free months, yearly increase; tenant deposit (cash in, repaid at end); optional partner fit-out contribution; optional "tenant leaves after year N" with default 4 empty months before the next tenant. Ends with the main lease. Café brand default: Rs 1.5L/month (range 1.3-1.8L), 3 rent-free months, +5% a year, brand pays its own fit-out. Padel is a template here, not its own card.
- **Partners**: adjustable count (default 3), per-partner shares, own cash only. No loans in v1.

## Outputs
- J-curve with shaded band (cautious: occupancy -20%, rate -10%; hopeful: occupancy +15%). Band shown on the selected plan only.
- Total cash, cash per partner, payback, IRR, net cash at lease end, break-even occupancy, monthly table.
- Earnings by section: yearly profit before tax per section and per m2; shared costs (rent, caretaker, utilities) split by area.
- Block diagram of sections (box sized by area, coloured by use, labelled, click to edit).
- Compare up to 4 plans: one coloured line each, table with best value per row highlighted.

## UX
- Starting templates: Plan A, B, C and the StayVista plan.
- Easy mode: about 10 key sliders. Advanced drawer for the rest.
- Mobile first. Light and dark. Warm Goan palette (laterite red, lime-wash white, monsoon green). Plain-English tooltips on every term.
- Plans saved in browser storage; shared as compressed links.

## Import / export
- One JSON format `openhouse/v1` for import, export and share links. Required: plan name, lease length, rent, at least one section. Missing fields filled from defaults and listed.
- Import page: copyable prompt (with the format and an example) for ChatGPT or Claude, a drop zone / paste box, and downloadable format file and Velsao example.
- Strict validation: plain-English field-level errors, unknown fields ignored with a warning, nothing loads until errors are fixed.
- The app never calls an AI model.

## Accuracy gate (build this first)
The engine must reproduce the legacy model, with tests:

| | Plan A | Plan B | Plan C |
|---|---|---|---|
| Payback (years) | 7.50 | 5.17 | 6.58 |
| IRR | 5.7% | 16.8% | 10.4% |
| Total cash | Rs 102.05L | Rs 50.4L | Rs 20.0L |
| Net cash at lease end | Rs 41.2L | Rs 78.5L | Rs 21.0L |
| Year-4 EBITDA | Rs 19.9L | Rs 19.9L | Rs 7.07L |

Oracle: `reference/model2.js` (`run(p)`, `PLANS`, `BASE`). Full table in `reference/solved.json`.

## Templates
- **Plans A, B, C**: from `reference/model2.js` (`PLANS`).
- **StayVista plan** (from the friend's note, `docs/source/stayvista-friend-note.jpg`):

| Setting | Value |
|---|---|
| Rooms | 4 matching master suites |
| Run by | StayVista, 27.5% |
| Lease | 10 years: Rs 75k years 1-5, Rs 81k years 6-10 |
| Rent-free | 7 months |
| Build | Dulce's Rs 35L, pool Rs 15L, power backup Rs 4L, kitchen Rs 4L, premium furnishing Rs 4L per suite |
| Café | one brand sublease, Rs 1.5L/month |
| Deposit | 3 months of rent |
| Working capital | Rs 5L |

Velsao sections: Old house (about 148 m2), New wing ground floor (about 80), New wing first floor (about 80), Land (about 1,160; pool and padel here).

## Out of scope for v1
Loans, Excel/CSV download, shared online database, floor-plan images.
