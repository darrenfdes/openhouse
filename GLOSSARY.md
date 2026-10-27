# Glossary

- **Plan**: one complete scenario for a property: sections, lease, operator, cards, subleases, partners. Saved and shared as `openhouse/v1` JSON.
- **Section**: a named part of the property (name, type, area in m2, optional parent, note). Everything placed in the property sits in a section.
- **Card**: a switchable part of a plan (rooms, café, co-working, pool, power backup, kitchen) with build cost, running cost and income.
- **Sublease**: a tenant using part of the property (café, padel, shop, yoga, other). Pays fixed rent, a share of sales, or the higher of a minimum and a share.
- **Operator**: who runs guest stays: `self` (per-room pricing, booking-site fee), `stayvista` (whole-villa rate, revenue cut) or `mixed`.
- **Rent steps**: a list of (from year, to year, monthly rent) covering the lease.
- **Fit-out**: money spent to make the property usable. Written off if the partners walk away.
- **Walk-away year**: optional year the partners leave early: rent stops, deposit returns, fit-out is written off, subleases end.
- **J-curve**: cumulative cash by month. Dips with spend and early losses, then climbs.
- **Payback**: the month cumulative cash turns positive for good.
- **Band**: shaded area between the cautious and hopeful case around the base J-curve.
- **Cautious / hopeful case**: occupancy -20% and rate -10%, versus occupancy +15%.
