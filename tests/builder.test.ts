import { describe, expect, test } from 'vitest';
import { runPlan } from '@/engine';
import { addSection, blankPlan, removeSection, startFrom } from '@/lib/builder';
import { validate } from '@/schema/validate';
import { templates } from '@/templates';

describe('plan builder', () => {
  test('a blank plan is a valid plan on one building, with nothing switched on', () => {
    const plan = blankPlan('Beach shack');
    const r = validate(JSON.parse(JSON.stringify(plan)));
    expect(r.errors).toEqual([]);
    expect(plan.sections).toHaveLength(1);
    expect(Object.values(plan.cards).some((c) => c.on)).toBe(false);
    expect(plan.subleases).toEqual([]);
    expect(Number.isFinite(runPlan(plan).totalCash)).toBe(true);
  });

  test('every room and card sits in the blank plan’s building', () => {
    const plan = blankPlan('Beach shack');
    const home = plan.sections[0].id;
    expect(plan.rooms.every((r) => r.sectionId === home)).toBe(true);
    expect(Object.values(plan.cards).every((c) => c.sectionId === home)).toBe(true);
  });

  test('a new section gets its own id', () => {
    const plan = addSection(addSection(blankPlan('x')));
    expect(new Set(plan.sections.map((s) => s.id)).size).toBe(3);
  });

  test('removing a section moves what was in it to the first section', () => {
    const plan = removeSection(templates.A, 'wing-first');
    expect(plan.sections.map((s) => s.id)).not.toContain('wing-first');
    expect(plan.rooms.find((r) => r.id === 'wing-first')!.sectionId).toBe('old-house');
    expect(validate(JSON.parse(JSON.stringify(plan))).errors).toEqual([]);
  });

  test('the only section cannot be removed', () => {
    const plan = blankPlan('x');
    expect(removeSection(plan, plan.sections[0].id)).toBe(plan);
  });

  test('starting from a blank on an existing property keeps its sections and seasons only', () => {
    const plan = startFrom({ kind: 'property', from: templates.A }, 'Fresh look');
    expect(plan.name).toBe('Fresh look');
    expect(plan.sections).toEqual(templates.A.sections);
    expect(plan.cards.cafe.on).toBe(false);
    expect(validate(JSON.parse(JSON.stringify(plan))).errors).toEqual([]);
  });

  test('starting from a copy keeps everything but the name', () => {
    const plan = startFrom({ kind: 'copy', from: templates.A }, 'Plan A, smaller');
    expect({ ...plan, name: templates.A.name }).toEqual(templates.A);
  });
});
