// The legacy model is the accuracy oracle (CLAUDE.md). Loaded as CommonJS, never edited.
// The repo is "type": "module", so require() would load it as ESM and skip its
// `module.exports`; evaluate it as a CommonJS script instead.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function load<T>(path: string): T {
  const module = { exports: {} as T };
  runInNewContext(readFileSync(new URL(path, import.meta.url), 'utf8'), { module, Math, Object, Array });
  return module.exports;
}

export interface OracleYear {
  revenue: number;
  ebitda: number;
  tax: number;
  cash: number;
  cumulative: number;
  occupancy: number;
}
export interface OracleResult {
  capex: { total: number; depreciable: number; deposit: number };
  years: OracleYear[];
  payback: number | null;
  irr: number | null;
  endCash: number;
}
type LegacyPlan = Record<string, unknown>;

export const oracle = load<{
  PLANS: Record<'A' | 'B' | 'C', LegacyPlan>;
  run: (p: LegacyPlan) => OracleResult;
  breakEven: (p: LegacyPlan) => { cash: number | null; lease: number | null; five: number | null };
}>('../reference/model2.js');

export const solved = JSON.parse(readFileSync(new URL('../reference/solved.json', import.meta.url), 'utf8')) as {
  A: { cash: number; lease: number; five: number | null };
  B: { cash: number; lease: number; five: number | null };
  C: { cash: number; lease: number; five: number | null };
  scenarios: { case: string; plan: 'A' | 'B' | 'C'; capex: number; ebitda: number; payback: number | null; irr: number | null; end: number }[];
};
