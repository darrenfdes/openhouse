import { describe, expect, test } from 'vitest';
import { initialState, MAX_COMPARE, reducer } from '@/state/store';

describe('plan store', () => {
  test('starts with the four templates', () => {
    expect(initialState().plans.map((p) => p.plan.name)).toEqual(['Plan A', 'Plan B', 'Plan C', 'StayVista plan']);
  });

  test('compare holds at most four plans', () => {
    let s = initialState();
    s = reducer(s, { type: 'duplicate', id: 'a' });
    for (const p of s.plans) s = reducer(s, { type: 'toggleCompare', id: p.id });
    expect(s.compareIds.length).toBeLessThanOrEqual(MAX_COMPARE);
  });

  test('a copy gets its own name and is selected', () => {
    const s = reducer(initialState(), { type: 'duplicate', id: 'a' });
    expect(s.plans.at(-1)!.plan.name).toBe('Plan A copy');
    expect(s.selectedId).toBe(s.plans.at(-1)!.id);
  });

  test('removing the selected plan selects another and drops it from compare', () => {
    const s = reducer(initialState(), { type: 'remove', id: 'a' });
    expect(s.selectedId).toBe('b');
    expect(s.compareIds).not.toContain('a');
  });
});
