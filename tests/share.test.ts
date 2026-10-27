import { describe, expect, test } from 'vitest';
import { planFromHash, shareHash } from '@/lib/share';
import { templates } from '@/templates';

describe('share links', () => {
  test.each(Object.keys(templates) as (keyof typeof templates)[])('template %s survives the round trip', (key) => {
    const hash = shareHash(templates[key]);
    expect(planFromHash(hash).plan).toEqual(templates[key]);
  });

  test('links stay short: defaults are left out', () => {
    expect(shareHash(templates.SV).length).toBeLessThan(2000);
    expect(shareHash(templates.A).length).toBeLessThan(2000);
  });

  test('a broken link says so instead of loading', () => {
    const r = planFromHash('#p=garbage');
    expect(r.plan).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
  });

  test('no plan in the link is not an error', () => {
    expect(planFromHash('')).toEqual({ plan: null, errors: [] });
  });
});
