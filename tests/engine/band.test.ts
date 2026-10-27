import { expect, test } from 'vitest';
import { runBand, CAUTIOUS, HOPEFUL } from '@/engine';
import { templates } from '@/templates';
import { oracle } from '../oracle';

test('the cautious case is occupancy -20% and rates -10%, as the legacy model computes it', () => {
  const band = runBand(templates.A);
  const legacy = oracle.run({ ...oracle.PLANS.A, occScale: 0.8, adrNew: 4500, adrHeritage: 6750, nomadRate: 45000 });
  expect(CAUTIOUS).toEqual({ occScale: 0.8, rateScale: 0.9 });
  expect(band.cautious.endCash).toBeCloseTo(legacy.endCash, 4);
});

test('the hopeful case is occupancy +15%', () => {
  const band = runBand(templates.B);
  const legacy = oracle.run({ ...oracle.PLANS.B, occScale: 1.15 });
  expect(HOPEFUL).toEqual({ occScale: 1.15, rateScale: 1 });
  expect(band.hopeful.endCash).toBeCloseTo(legacy.endCash, 4);
  expect(band.hopeful.endCash).toBeGreaterThan(band.base.endCash);
  expect(band.base.endCash).toBeGreaterThan(band.cautious.endCash);
});
