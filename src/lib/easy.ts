// Easy-mode edits: one slider moves a group of plan fields together, keeping their proportions.
import type { Band } from '../engine';
import type { Plan, Season } from '../schema/plan';
import { rentInYear } from '../schema/rentSteps';
import { years } from './money';

export const firstRent = (p: Plan) => rentInYear(p.lease.rentSteps, 1);

/** Sets the first year's rent; later steps keep their ratio to it. */
export function setRent(p: Plan, rent: number): Plan {
  const first = firstRent(p);
  const rentSteps = first ? p.lease.rentSteps.map((s) => ({ ...s, monthly: Math.round((s.monthly * rent) / first) })) : [{ fromYear: 1, toYear: p.lease.years, monthly: rent }];
  return { ...p, lease: { ...p.lease, rentSteps } };
}

/** Changes the lease length; the last rent step stretches or steps beyond the end are dropped. */
export function setLeaseYears(p: Plan, n: number): Plan {
  const steps = p.lease.rentSteps.filter((s) => s.fromYear <= n).map((s) => ({ ...s, toYear: Math.min(s.toYear, n) }));
  const last = steps.reduce((a, s) => (s.toYear > a.toYear ? s : a), steps[0]);
  if (last && last.toYear < n) last.toYear = n;
  const walkAwayYear = p.lease.walkAwayYear !== undefined && p.lease.walkAwayYear >= n ? undefined : p.lease.walkAwayYear;
  const lease = { ...p.lease, years: n, rentSteps: steps.length ? steps : [{ fromYear: 1, toYear: n, monthly: 0 }], walkAwayYear };
  if (lease.walkAwayYear === undefined) delete lease.walkAwayYear;
  return { ...p, lease };
}

const usesStayVista = (p: Plan) => p.operator.kind !== 'self';

/** Peak-season occupancy; the other seasons keep their ratio to it. */
export const peakOccupancy = (p: Plan) => (stayVistaInPeak(p) ? p.operator.stayvista.occupancy.peak : p.stays.occupancy.peak);

/** Whether StayVista runs the peak months, so its occupancy is the one the model uses there. */
const stayVistaInPeak = (p: Plan) => p.operator.kind === 'stayvista' || (p.operator.kind === 'mixed' && p.operator.stayvista.seasons.includes('peak'));

export function setPeakOccupancy(p: Plan, v: number): Plan {
  const scale = (o: Record<Season, number>) => {
    const k = o.peak ? v / o.peak : 0;
    return { peak: v, shoulder: Math.min(1, o.shoulder * k), low: Math.min(1, o.low * k), monsoon: Math.min(1, o.monsoon * k) };
  };
  const next = { ...p, stays: { ...p.stays, occupancy: scale(p.stays.occupancy) } };
  if (usesStayVista(p)) next.operator = { ...p.operator, stayvista: { ...p.operator.stayvista, occupancy: scale(p.operator.stayvista.occupancy) } };
  return next;
}

/** The headline rate: the StayVista peak villa rate, or the average room rate. */
export function headlineRate(p: Plan): number {
  if (p.operator.kind === 'stayvista') return p.operator.stayvista.rates.peak;
  const n = p.rooms.reduce((t, r) => t + r.count, 0);
  return n ? p.rooms.reduce((t, r) => t + r.rate * r.count, 0) / n : p.rooms[0]?.rate ?? 0;
}

export function setHeadlineRate(p: Plan, v: number): Plan {
  const k = headlineRate(p) ? v / headlineRate(p) : 1;
  if (p.operator.kind === 'stayvista') {
    const r = p.operator.stayvista.rates;
    const rates = { peak: v, shoulder: Math.round(r.shoulder * k), low: Math.round(r.low * k), monsoon: Math.round(r.monsoon * k) };
    return { ...p, operator: { ...p.operator, stayvista: { ...p.operator.stayvista, rates } } };
  }
  return { ...p, rooms: p.rooms.map((r) => ({ ...r, rate: Math.round(r.rate * k) })) };
}

export function setPartners(p: Plan, count: number): Plan {
  return { ...p, partners: { count, shares: Array.from({ length: count }, () => 1 / count) } };
}

/** The line under the title: when the plan pays back, and what the cautious case does. */
export function finding(band: Band): string {
  const { base, cautious } = band;
  if (base.payback === null) return `Does not pay back within the lease; you end ${base.endCash < 0 ? 'down' : 'up'} at the end.`;
  const head = `Pays back in ${years(base.payback)}.`;
  if (cautious.payback === null) return `${head} In the cautious case it never does within the lease.`;
  return `${head} Even in the cautious case it does, in ${years(cautious.payback)}.`;
}
