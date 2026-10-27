// Building a plan in the UI: a draft that starts blank or from another plan, and stays valid as sections come and go.
import { DEFAULT_PLAN, SIZES } from '../schema/defaults';
import type { Plan, Section } from '../schema/plan';

export const FIRST_SECTION: Section = { id: 'main', name: 'Main building', type: 'indoor', areaM2: 200 };

/** Where a new plan starts: nothing, the property of another plan, or a copy of it. */
export type Start = { kind: 'blank' } | { kind: 'property'; from: Plan } | { kind: 'copy'; from: Plan };

/** Every room, card, tenant and build line pointing at a missing section moves to the first section. */
function rehome(plan: Plan): Plan {
  const ids = new Set(plan.sections.map((s) => s.id));
  const home = plan.sections[0].id;
  const at = (id: string) => (ids.has(id) ? id : home);
  const cards = Object.fromEntries(Object.entries(plan.cards).map(([k, c]) => [k, { ...c, sectionId: at(c.sectionId) }])) as Plan['cards'];
  return {
    ...plan,
    sections: plan.sections.map(({ parentId, ...s }) => (parentId && ids.has(parentId) ? { ...s, parentId } : s)),
    rooms: plan.rooms.map((r) => ({ ...r, sectionId: at(r.sectionId) })),
    cards,
    extras: plan.extras.map((x) => ({ ...x, sectionId: at(x.sectionId) })),
    subleases: plan.subleases.map((t) => ({ ...t, sectionId: at(t.sectionId) })),
    build: { ...plan.build, lines: plan.build.lines.map((l) => (l.sectionId === undefined ? l : { ...l, sectionId: at(l.sectionId) })) },
  };
}

/** A plan with one room type and every card off, on the given sections. */
export function blankPlan(name: string, sections: Section[] = [FIRST_SECTION], seasons = DEFAULT_PLAN.seasons): Plan {
  const base = structuredClone(DEFAULT_PLAN);
  const cards = Object.fromEntries(Object.entries(base.cards).map(([k, c]) => [k, { ...c, on: false }])) as Plan['cards'];
  return rehome({
    ...base,
    name,
    seasons: [...seasons],
    sections: structuredClone(sections),
    rooms: [{ id: 'rooms', name: 'Rooms', count: 4, rate: 5000, areaM2: SIZES.suite, sectionId: sections[0].id }],
    cards,
    build: { ...base.build, lines: base.build.lines.filter((l) => l.group === 'soft') },
  });
}

export function startFrom(start: Start, name: string): Plan {
  if (start.kind === 'copy') return { ...structuredClone(start.from), name };
  if (start.kind === 'property') return blankPlan(name, start.from.sections, start.from.seasons);
  return blankPlan(name);
}

export function addSection(plan: Plan): Plan {
  const ids = new Set(plan.sections.map((s) => s.id));
  let n = plan.sections.length + 1;
  while (ids.has(`section-${n}`)) n++;
  return { ...plan, sections: [...plan.sections, { id: `section-${n}`, name: `Section ${n}`, type: 'indoor', areaM2: 50 }] };
}

export function removeSection(plan: Plan, id: string): Plan {
  if (plan.sections.length <= 1) return plan;
  return rehome({ ...plan, sections: plan.sections.filter((s) => s.id !== id) });
}
