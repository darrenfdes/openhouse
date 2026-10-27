import { describe, expect, test } from 'vitest';
import { runPlan } from '@/engine';
import { templates } from '@/templates';
import { oracle } from '../oracle';

// The accuracy gate from docs/SPEC.md: values in lakh, payback in years.
const SPEC = {
  A: { payback: 7.5, irr: 0.057, total: 102.05, end: 41.2, y4: 19.9 },
  B: { payback: 5.17, irr: 0.168, total: 50.4, end: 78.5, y4: 19.9 },
  C: { payback: 6.58, irr: 0.104, total: 20.0, end: 21.0, y4: 7.07 },
} as const;

const L = 1e5;

describe.each(['A', 'B', 'C'] as const)('Plan %s matches the legacy model', (key) => {
  const result = runPlan(templates[key]);
  const want = oracle.run(oracle.PLANS[key]);

  test('matches the spec table', () => {
    expect(result.payback).toBeCloseTo(SPEC[key].payback, 2);
    expect(result.irr).toBeCloseTo(SPEC[key].irr, 3);
    expect(result.totalCash / L).toBeCloseTo(SPEC[key].total, 2);
    expect(result.endCash / L).toBeCloseTo(SPEC[key].end, 1);
    expect(result.years[3].ebitda / L).toBeCloseTo(SPEC[key].y4, key === 'C' ? 2 : 1);
  });

  test('matches the oracle year by year', () => {
    expect(result.capex.depreciable).toBeCloseTo(want.capex.depreciable, 4);
    expect(result.years).toHaveLength(want.years.length);
    want.years.forEach((y, i) => {
      expect(result.years[i].revenue).toBeCloseTo(y.revenue, 4);
      expect(result.years[i].ebitda).toBeCloseTo(y.ebitda, 4);
      expect(result.years[i].tax).toBeCloseTo(y.tax, 4);
      expect(result.years[i].cash).toBeCloseTo(y.cash, 4);
      expect(result.years[i].occupancy).toBeCloseTo(y.occupancy, 10);
    });
    expect(result.payback).toBeCloseTo(want.payback!, 10);
    expect(result.irr).toBeCloseTo(want.irr!, 8);
  });
});
