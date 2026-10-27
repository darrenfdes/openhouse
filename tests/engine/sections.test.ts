import { describe, expect, test } from 'vitest';
import { earningsBySection, runPlan, sectionWarnings } from '@/engine';
import { templates } from '@/templates';
import { blank, tenant } from './fixture';

describe('earnings by section', () => {
  test('shared rent is split by area', () => {
    const plan = blank();
    const e = earningsBySection(plan, runPlan(plan));
    expect(e.find((s) => s.id === 'hall')!.years[0]).toBeCloseTo(-30000, 6);
    expect(e.find((s) => s.id === 'yard')!.years[0]).toBeCloseTo(-90000, 6);
  });

  test('a tenant’s rent counts in its own section, per square metre too', () => {
    const plan = blank({ subleases: [tenant({ sectionId: 'yard', monthlyRent: 20000 })] });
    const yard = earningsBySection(plan, runPlan(plan)).find((s) => s.id === 'yard')!;
    expect(yard.years[0]).toBeCloseTo(240000 - 90000, 6);
    expect(yard.perM2[0]).toBeCloseTo(150000 / 300, 6);
  });

  test.each(['A', 'B', 'C'] as const)('Plan %s: sections add up to profit before tax', (key) => {
    const plan = templates[key];
    const r = runPlan(plan);
    const e = earningsBySection(plan, r);
    r.years.forEach((y, i) => {
      const total = e.reduce((t, s) => t + s.years[i], 0);
      expect(total).toBeCloseTo(y.ebitda - y.depreciation - y.writeOff, 4);
    });
  });
});

describe('section warnings', () => {
  test('more placed than a section holds is a warning, never an error', () => {
    const plan = blank({ rooms: [{ id: 's', name: 'Suites', count: 5, rate: 5000, areaM2: 25, sectionId: 'hall' }] });
    expect(sectionWarnings(plan)).toEqual(['Hall holds 125 m² of use in 100 m².']);
  });

  test('the Velsao plans fit their sections', () => {
    expect(sectionWarnings(templates.A)).toEqual([]);
  });
});
