import { describe, expect, test } from 'vitest';
import { breakEven, maxRent, runPlan } from '@/engine';
import type { Plan } from '@/schema/plan';
import { autoEscalate } from '@/schema/rentSteps';
import { templates } from '@/templates';
import { solved } from '../oracle';

const L = 1e5;

describe('break-even occupancy matches reference/solved.json', () => {
  test.each(['A', 'B', 'C'] as const)('Plan %s', (key) => {
    const got = breakEven(templates[key]);
    const want = solved[key];
    expect(got.cash).toBeCloseTo(want.cash, 6);
    expect(got.lease).toBeCloseTo(want.lease, 6);
    if (want.five === null) expect(got.five).toBeNull();
    else expect(got.five).toBeCloseTo(want.five, 6);
  });

  test('highest rent that still pays back over the lease, Plan B', () => {
    expect(maxRent(templates.B, (r) => r.endCash >= 0)).toBeCloseTo(174252.67567132323, 0);
  });
});

const withRent = (p: Plan, base: number): Plan => ({ ...p, lease: { ...p.lease, rentSteps: autoEscalate({ base, flatYears: 3, rate: 0.05, years: 9 }) } });

// The stress cases from reference/solve.js, expressed as plan edits.
const CASES: Record<string, (p: Plan) => Plan> = {
  'Base + construction 50% over': (p) => ({ ...p, build: { ...p.build, constructionOverrun: 0.5 } }),
  'Base + ₹40 L budget 25% over': (p) => ({ ...p, build: { ...p.build, budgetOverrun: 0.25 } }),
  'Base + ₹40 L budget 50% over': (p) => ({ ...p, build: { ...p.build, budgetOverrun: 0.5 } }),
  'Base + ₹20 L budget 25% over': (p) => ({ ...p, build: { ...p.build, budgetOverrun: 0.25 } }),
  "Base, rent ₹1,00,000 (owner's ask)": (p) => withRent(p, 100000),
  'Base, rent ₹60,000': (p) => withRent(p, 60000),
};

describe('stress cases match reference/solved.json', () => {
  const rows = solved.scenarios.filter((s) => s.case in CASES);
  test.each(rows.map((r) => [`${r.case}, Plan ${r.plan}`, r] as const))('%s', (_, row) => {
    const r = runPlan(CASES[row.case](templates[row.plan]));
    expect(r.totalCash / L).toBeCloseTo(row.capex, 6);
    expect(r.years[3].ebitda / L).toBeCloseTo(row.ebitda, 6);
    expect(r.endCash / L).toBeCloseTo(row.end, 6);
    expect(r.payback).toBeCloseTo(row.payback!, 6);
    expect(r.irr).toBeCloseTo(row.irr!, 6);
  });
  test('covers all six stress cases', () => expect(rows).toHaveLength(7));
});
