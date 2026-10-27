# Open House

A planning tool for deciding whether to lease and run a hospitality property in India. Rooms, cafes, pool, subleases and partners are switchable cards; the app draws a J-curve of cumulative cash. Velsao House (South Goa) is the first plan loaded.

Status: planning done, nothing built yet. Start with `docs/HANDOFF.md`, then `docs/SPEC.md`.

## Rules
- All money is in rupees, shown in lakh (1 L = 100,000). Store plain rupees in code.
- The app never calls an AI model. Plans arrive as `openhouse/v1` JSON.
- `src/engine` is pure TypeScript with no React imports, and is tested first.
- The legacy model in `reference/model2.js` is the accuracy oracle. Do not edit it.

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical names, unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
