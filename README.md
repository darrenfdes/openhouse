# Open House

Plan a stay business and see when it pays back. Switch rooms, a café, a pool or subleases on and off, set the lease, and read the J-curve of cumulative cash.

Status: v1 built. The engine reproduces the legacy model (`reference/model2.js`) for Plans A, B and C; see the accuracy tests in `tests/engine`. Spec: [docs/SPEC.md](docs/SPEC.md).

## Run it
```bash
npm install
npm run dev
```
`npm test` runs the tests, `npm run typecheck` checks types, `npm run build` builds into `dist/`.

## Deploy
Vercel, from this repo: import it at vercel.com/new (framework Vite; `vercel.json` sets the build and the single-page rewrite). No environment variables, no backend.

## Stack
Vite, React, TypeScript, Tailwind, Recharts, Vitest. Geist is self-hosted, so the app makes no third-party requests.

## Layout
- `src/engine`: pure calculation module (no React): `runPlan`, `runBand`, `breakEven`, `maxRent`, `earningsBySection`
- `src/schema`: the `openhouse/v1` format, `validate` (plain-English errors, defaults filled and listed), rent steps
- `src/templates`: starting plans (A, B, C, StayVista)
- `src/lib`: display helpers (lakh), easy-mode edits, share links, the import prompt
- `src/components`, `src/pages`, `src/state`: the app
- `reference`: the legacy model and page the engine must reproduce
- `docs`: spec, handoff, ADRs, agent settings

## Placeholders to replace
- StayVista commission (27.5%), whole-villa rates and occupancy: untested guesses; the StayVista plan is marked as such in the app.
- Pool, power backup, kitchen and premium furnishing costs: rough figures until Dulce's quotes arrive.
- StayVista plan running costs (utilities Rs 40,000, repairs Rs 25,000, welfare Rs 4,000 a month) and fit-out months (6): assumed.
