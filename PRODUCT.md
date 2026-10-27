# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Vite, React, TypeScript, Tailwind, Recharts, Vitest. Own repo, deployed on Vercel (per `docs/SPEC.md`). No backend.

## Users
Small groups of partners (default three, mostly non-finance people) deciding together whether to lease and run a hospitality property. They work mostly on phones, debate plans, and pass links to each other and to friends. The first group is weighing a restored Indo-Portuguese house in Velsao, South Goa.

## Product Purpose
Help partners decide "should we lease and run this property?" by switching rooms, cafes, pool, subleases and partners on and off and watching a J-curve of cumulative cash move. Success is a shared, confident go/no-go grounded in their own assumptions.

## Positioning
A configurable lease-and-operate model, not a one-off spreadsheet: plans are portable `openhouse/v1` JSON, comparable side by side (up to 4), and shared by link with no account or backend. The engine is validated against a legacy model with accuracy tests.

## Operating Context
Plans live in browser storage and in compressed share links. Imports come from the user pasting JSON that they generated elsewhere using a copyable prompt; the app never calls an AI model. Seasons (Goa defaults), costs and rates are editable defaults, many of them rough placeholders pending real quotes.

## Capabilities and Constraints
- All money is in rupees, displayed in lakh (1 L = 100,000); plain rupees in code.
- Plan contents: sections (with area), lease (rent steps, rent-free months, deposit), optional walk-away year, operator (self, StayVista, mixed), switchable cards, any number of subleases, partners.
- Outputs: J-curve with cautious/hopeful band, payback, IRR, break-even occupancy, cash per partner, earnings by section, section block diagram, compare view.
- Easy mode (about 10 sliders) and an advanced drawer. Light and dark. Mobile first.
- Out of v1: loans, Excel/CSV download, shared online database, floor-plan images.
- The app is a planning aid, not financial advice. Results follow from the user's assumptions; the StayVista template's occupancy and rates are untested guesses and must not be presented as findings.

## Brand Commitments
Name: Open House. Warm Goan palette is binding: laterite red, lime-wash white, monsoon green. Plain-English tooltips on every term.

## Evidence on Hand
Legacy page `reference/legacy-page/index.html` and oracle model `reference/model2.js` (Plans A-C). The friend's StayVista note at `docs/source/stayvista-friend-note.jpg`. No official StayVista owner terms were found; commission is estimated. No testimonials, customers or external benchmarks exist; do not invent any.

## Product Principles
- Plain language first: every term explained, no finance jargon unexplained.
- Honest numbers: show assumptions and ranges (the band), label guesses as guesses.
- Cards on, cards off: changing a plan is one switch and the result moves immediately.
- Portable and private: plans travel as JSON and links; nothing leaves the device.
- Works on a phone in a group conversation.

## Accessibility & Inclusion
WCAG AA. Charts (J-curve band, compare lines) must be readable without color alone. Sliders and controls keyboard operable. Respect reduced motion.
