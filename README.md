# Open House

Plan a stay business and see when it pays back. Switch rooms, a café, a pool or subleases on and off, set the lease, and read the J-curve of cumulative cash.

Status: specified, not yet built. See [docs/SPEC.md](docs/SPEC.md) and [docs/HANDOFF.md](docs/HANDOFF.md).

## Planned stack
Vite, React, TypeScript, Tailwind, Recharts, Vitest. Deploys free on Vercel.

## Layout
- `src/engine`: pure calculation module (no React)
- `src/schema`: `openhouse/v1` format, validation, defaults
- `src/templates`: starting plans (A, B, C, StayVista)
- `src/components`, `src/pages`, `src/state`, `src/lib`: the app
- `reference`: the legacy model and page the engine must reproduce
- `docs`: spec, handoff, ADRs, agent settings
