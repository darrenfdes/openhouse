import { describe, expect, test } from 'vitest';
import { runBand } from '@/engine';
import { finding, firstRent, peakOccupancy, setLeaseYears, setPeakOccupancy, setRent } from '@/lib/easy';
import { templates } from '@/templates';

describe('easy-mode edits', () => {
  test('rent keeps the later steps in proportion', () => {
    const p = setRent(templates.SV, 100000);
    expect(p.lease.rentSteps.map((s) => s.monthly)).toEqual([100000, 108000]);
    expect(firstRent(p)).toBe(100000);
  });

  test('a longer lease stretches the last rent step; a shorter one drops steps', () => {
    expect(setLeaseYears(templates.SV, 12).lease.rentSteps.at(-1)).toEqual({ fromYear: 6, toYear: 12, monthly: 81000 });
    expect(setLeaseYears(templates.SV, 4).lease.rentSteps).toEqual([{ fromYear: 1, toYear: 4, monthly: 75000 }]);
  });

  test('peak occupancy moves the other seasons with it', () => {
    const p = setPeakOccupancy(templates.A, 0.3);
    expect(peakOccupancy(p)).toBe(0.3);
    expect(p.stays.occupancy.shoulder).toBeCloseTo(0.2, 10);
  });

  test('the finding names payback and the cautious case', () => {
    expect(finding(runBand(templates.A))).toBe('Pays back in 7.5 years. In the cautious case it never does within the lease.');
  });
});
