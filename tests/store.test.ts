import { describe, expect, test } from 'vitest';
import { blankPlan } from '@/lib/builder';
import { fromSaved, initialState, MAX_COMPARE, reducer } from '@/state/store';

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

describe('projects', () => {
  test('Velsao House holds the four templates', () => {
    const s = initialState();
    expect(s.projects).toEqual([{ id: 'velsao', name: 'Velsao House', place: 'Velsao, South Goa' }]);
    expect(s.plans.every((p) => p.projectId === 'velsao')).toBe(true);
  });

  test('a new project starts with its first plan, selected', () => {
    const s = reducer(initialState(), { type: 'addProject', name: 'Beach shack', place: 'Agonda', plan: blankPlan('First go') });
    const project = s.projects.at(-1)!;
    expect(project).toMatchObject({ name: 'Beach shack', place: 'Agonda' });
    const selected = s.plans.find((p) => p.id === s.selectedId)!;
    expect(selected).toMatchObject({ projectId: project.id, plan: { name: 'First go' } });
  });

  test('a plan added without a project joins the selected plan’s project', () => {
    let s = reducer(initialState(), { type: 'addProject', name: 'Beach shack', place: '', plan: blankPlan('First go') });
    const project = s.projects.at(-1)!.id;
    s = reducer(s, { type: 'add', plan: blankPlan('Second go') });
    expect(s.plans.at(-1)!.projectId).toBe(project);
  });

  test('plan names only need to be unique within a project', () => {
    let s = reducer(initialState(), { type: 'addProject', name: 'Beach shack', place: '', plan: blankPlan('Plan A') });
    expect(s.plans.at(-1)!.plan.name).toBe('Plan A');
    s = reducer(s, { type: 'add', plan: blankPlan('Plan A') });
    expect(s.plans.at(-1)!.plan.name).toBe('Plan A (2)');
  });

  test('choosing a project selects its first plan', () => {
    let s = reducer(initialState(), { type: 'addProject', name: 'Beach shack', place: '', plan: blankPlan('First go') });
    s = reducer(s, { type: 'selectProject', id: 'velsao' });
    expect(s.selectedId).toBe('a');
  });

  test('a project can be renamed and moved', () => {
    const s = reducer(initialState(), { type: 'updateProject', id: 'velsao', name: 'Casa Velsao', place: 'Cansaulim' });
    expect(s.projects[0]).toEqual({ id: 'velsao', name: 'Casa Velsao', place: 'Cansaulim' });
  });

  test('deleting a project deletes its plans; the last project stays', () => {
    let s = reducer(initialState(), { type: 'addProject', name: 'Beach shack', place: '', plan: blankPlan('First go') });
    const shack = s.projects.at(-1)!.id;
    s = reducer(s, { type: 'removeProject', id: 'velsao' });
    expect(s.projects.map((p) => p.id)).toEqual([shack]);
    expect(s.plans.map((p) => p.plan.name)).toEqual(['First go']);
    expect(s.compareIds).toEqual([]);
    expect(reducer(s, { type: 'removeProject', id: shack })).toBe(s);
  });

  test('the last plan of a project cannot be deleted', () => {
    const s = reducer(initialState(), { type: 'addProject', name: 'Beach shack', place: '', plan: blankPlan('First go') });
    expect(reducer(s, { type: 'remove', id: s.selectedId })).toBe(s);
  });

  test('a save from before projects puts every plan in Velsao House', () => {
    const old = { plans: initialState().plans.map(({ id, plan }) => ({ id, plan })), selectedId: 'b', compareIds: ['a'] };
    const s = fromSaved(JSON.parse(JSON.stringify(old)));
    expect(s.projects.map((p) => p.id)).toEqual(['velsao']);
    expect(s.plans.every((p) => p.projectId === 'velsao')).toBe(true);
    expect(s.selectedId).toBe('b');
  });
});
