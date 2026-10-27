// Earnings by section: each section's yearly profit before tax, with shared costs split by area.
import type { Plan } from '../schema/plan';
import type { Result } from './run';

export interface SectionEarnings {
  id: string;
  name: string;
  areaM2: number;
  /** Profit before tax, per lease year. */
  years: number[];
  perM2: number[];
}

/** Sections with no children: the ones shared costs are split across. */
function leaves(plan: Plan) {
  const parents = new Set(plan.sections.map((s) => s.parentId).filter(Boolean));
  return plan.sections.filter((s) => !parents.has(s.id));
}

export function earningsBySection(plan: Plan, result: Result): SectionEarnings[] {
  const leafs = leaves(plan);
  const leafArea = leafs.reduce((t, s) => t + s.areaM2, 0);
  const areaShare = (id: string) => {
    const s = leafs.find((l) => l.id === id);
    if (!s) return 0;
    return leafArea ? s.areaM2 / leafArea : 1 / leafs.length;
  };
  // Depreciation follows each build line's section; untagged lines are shared.
  const depShare = new Map<string | null, number>();
  for (const item of result.capex.items) {
    if (item.group === 'cash') continue;
    const key = item.sectionId ?? null;
    depShare.set(key, (depShare.get(key) ?? 0) + (result.capex.depreciable ? item.amount / result.capex.depreciable : 0));
  }
  return plan.sections.map((s) => {
    const years = result.years.map((y) => {
      const direct = y.bySection.get(s.id) ?? 0;
      const shared = (y.bySection.get(null) ?? 0) + [...y.bySection.entries()].filter(([k]) => k !== null && !plan.sections.some((x) => x.id === k)).reduce((t, [, v]) => t + v, 0);
      const writeDown = y.depreciation + y.writeOff;
      const dep = writeDown * ((depShare.get(s.id) ?? 0) + (depShare.get(null) ?? 0) * areaShare(s.id));
      return direct + shared * areaShare(s.id) - dep;
    });
    return { id: s.id, name: s.name, areaM2: s.areaM2, years, perM2: years.map((v) => (s.areaM2 ? v / s.areaM2 : 0)) };
  });
}

/** One plain sentence per section that holds more than its area. */
export function sectionWarnings(plan: Plan): string[] {
  const used = new Map<string, number>();
  const add = (id: string, m2: number) => used.set(id, (used.get(id) ?? 0) + m2);
  for (const r of plan.rooms) add(r.sectionId, r.count * r.areaM2);
  for (const s of plan.subleases) add(s.sectionId, s.areaM2);
  const { cafe, cowork, pool } = plan.cards;
  for (const c of [cafe, cowork, pool]) if (c.on) add(c.sectionId, c.areaM2);
  return plan.sections
    .filter((s) => (used.get(s.id) ?? 0) > s.areaM2)
    .map((s) => `${s.name} holds ${Math.round(used.get(s.id)!)} m² of use in ${Math.round(s.areaM2)} m².`);
}
