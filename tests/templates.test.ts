import { describe, expect, test } from 'vitest';
import { runPlan, sectionWarnings } from '@/engine';
import { validate } from '@/schema/validate';
import { templates } from '@/templates';

describe.each(Object.keys(templates) as (keyof typeof templates)[])('template %s', (key) => {
  const plan = templates[key];
  test('validates without errors or warnings', () => {
    const r = validate(JSON.parse(JSON.stringify(plan)));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  test('fits its sections and runs to a full lease', () => {
    expect(sectionWarnings(plan)).toEqual([]);
    expect(runPlan(plan).years).toHaveLength(plan.lease.years);
  });
});

describe('StayVista plan', () => {
  const plan = templates.SV;
  const r = runPlan(plan);

  test('is marked as untested guesses', () => expect(plan.guess).toBe(true));

  test('build matches the friend’s note: Rs 35 L + pool 15 L + backup 4 L + kitchen 4 L + 4 L per suite', () => {
    expect(r.capex.depreciable).toBe(3500000 + 1500000 + 400000 + 400000 + 4 * 400000);
    expect(r.capex.deposit).toBe(3 * 75000);
    expect(r.totalCash).toBe(7400000 + 225000 + 500000);
  });

  test('rent: 7 months free, then Rs 75k to year 5 and Rs 81k after', () => {
    expect(r.years[0].rent).toBe(5 * 75000);
    expect(r.years[5].rent).toBe(12 * 81000);
  });

  test('the café brand pays Rs 1.5 L a month after 3 rent-free months, from month 7', () => {
    expect(r.years[0].subleaseRev).toBe(3 * 150000);
    expect(r.years[1].subleaseRev).toBeCloseTo(6 * 150000 + 6 * 157500, 6);
  });
});
