import { describe, expect, test } from 'vitest';
import { validate } from '@/schema/validate';
import { templates } from '@/templates';

const minimal = {
  format: 'openhouse/v1',
  name: 'Beach shack',
  lease: { years: 5, rentSteps: [{ fromYear: 1, toYear: 5, monthly: 60000 }] },
  sections: [{ id: 'main', name: 'Main hall', type: 'indoor', areaM2: 120 }],
};

describe('validate', () => {
  test('a minimal plan loads, with every missing field filled and listed', () => {
    const r = validate(minimal);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.plan?.lease.years).toBe(5);
    expect(r.plan?.lease.depositMonths).toBe(3);
    expect(r.filled).toContain('lease.depositMonths');
    expect(r.filled).toContain('operator');
  });

  test('missing required fields give plain-English errors and no plan', () => {
    const r = validate({ format: 'openhouse/v1', lease: {}, sections: [] });
    expect(r.ok).toBe(false);
    expect(r.plan).toBeNull();
    const byPath = Object.fromEntries(r.errors.map((e) => [e.path, e.message]));
    expect(byPath['name']).toMatch(/plan name/i);
    expect(byPath['lease.years']).toMatch(/lease length/i);
    expect(byPath['lease.rentSteps']).toMatch(/rent/i);
    expect(byPath['sections']).toMatch(/at least one section/i);
  });

  test('wrong types and out-of-range values name the field', () => {
    const r = validate({ ...minimal, lease: { ...minimal.lease, years: 'nine', rentFreeMonths: -2 } });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        { path: 'lease.years', message: expect.stringMatching(/Lease length.*number/) },
        { path: 'lease.rentFreeMonths', message: expect.stringMatching(/Rent-free months.*0/) },
      ]),
    );
  });

  test('errors inside lists say which item', () => {
    const r = validate({ ...minimal, sections: [{ id: 'a', name: 'Hall', type: 'cellar', areaM2: 10 }] });
    expect(r.errors[0]).toEqual({ path: 'sections[0].type', message: expect.stringMatching(/indoor, outdoor, terrace or roof/) });
  });

  test('unknown fields are ignored with a warning', () => {
    const r = validate({ ...minimal, colour: 'blue', lease: { ...minimal.lease, landlord: 'Mr D' } });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/colour/), expect.stringMatching(/lease\.landlord/)]));
    expect(r.plan).not.toHaveProperty('colour');
  });

  test('a wrong format is refused', () => {
    expect(validate({ ...minimal, format: 'openhouse/v9' }).errors[0].path).toBe('format');
    expect(validate('not json at all').ok).toBe(false);
  });

  test('rooms and subleases must sit in a section that exists', () => {
    const r = validate({ ...minimal, rooms: [{ name: 'Suites', count: 2, rate: 6000, sectionId: 'attic' }] });
    expect(r.errors[0]).toEqual({ path: 'rooms[0].sectionId', message: expect.stringMatching(/attic/) });
  });

  test.each(['A', 'B', 'C'] as const)('template %s round-trips through JSON unchanged', (key) => {
    const r = validate(JSON.parse(JSON.stringify(templates[key])));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.plan).toEqual(templates[key]);
  });
});
