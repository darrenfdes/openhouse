# Glossary

- **Project**: one property (name and place) and the plans made for it. Velsao House is the first project; plans are compared across projects, named with their project.
- **Plan builder**: the New plan page. Builds a plan step by step (property, lease, operator, rooms, extras, money in) with a live preview, starting blank, on the project's property, or from a copy.
- **Plan**: one complete scenario for a property: sections, lease, operator, cards, subleases, partners. Saved and shared as `openhouse/v1` JSON.
- **Section**: a named part of the property (name, type, area in m2, optional parent, note). Everything placed in the property sits in a section.
- **Card**: a switchable part of a plan (rooms, café, co-working, pool, power backup, kitchen) with build cost, running cost and income.
- **Sublease**: a tenant using part of the property (café, padel, shop, yoga, other). Pays fixed rent, a share of sales, or the higher of a minimum and a share.
- **Operator**: who runs guest stays: `self` (per-room pricing, booking-site fee), `stayvista` (whole-villa rate, revenue cut) or `mixed`.
- **Rent steps**: a list of (from year, to year, monthly rent) covering the lease.
- **Fit-out**: money spent to make the property usable. Written off if the partners walk away.
- **Walk-away year**: optional year the partners leave early: rent stops, deposit returns, fit-out is written off, subleases end.
- **J-curve**: cumulative cash by month. Dips with spend and early losses, then climbs.
- **Payback**: years until cumulative cash first turns positive, interpolated within the year (as the legacy model computes it).
- **Band**: shaded area between the cautious and hopeful case around the base J-curve.
- **Cautious / hopeful case**: occupancy -20% and rate -10%, versus occupancy +15%.
- **Fit-out months**: months of building work at the start of the lease, before the first guest: no income and no running costs.
- **Paid by**: who pays a running-cost line, the partners or the operator (StayVista pays housekeeping and guest costs in its cut).
- **Break-even occupancy**: the year-4 room occupancy at which net cash at the end of the lease is zero.
- **Cash to put in**: build, fit-out, legal and branding, the rent deposit and working capital: everything paid before opening.
