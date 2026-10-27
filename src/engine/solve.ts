// Bisection searches, ported from `solve`, `breakEven` and `maxRent` in reference/model2.js.
import type { Plan } from '../schema/plan';
import { autoEscalate, rentInYear } from '../schema/rentSteps';
import { runPlan, type Result } from './run';

export type Test = (r: Result) => boolean;

/** The year whose occupancy break-even is read from: year 4, or the last year of a shorter lease. */
export const readYear = (r: Result) => r.years[Math.min(3, r.years.length - 1)];

export const TESTS = {
  /** Year-4 EBITDA is not negative: the business covers its running costs. */
  cash: ((r) => readYear(r).ebitda >= 0) as Test,
  /** Net cash at lease end is not negative: the partners get their money back. */
  lease: ((r) => r.endCash >= 0) as Test,
  /** Pays back within five years. */
  five: ((r) => r.payback !== null && r.payback <= 5) as Test,
};

export interface BreakEven {
  cash: number | null;
  lease: number | null;
  five: number | null;
}

/** Smallest occupancy scale in [lo, hi] at which `test` passes, or null if it never does. */
function solveOccScale(plan: Plan, test: Test, lo = 0.2, hi = 2.5): number | null {
  if (!test(runPlan(plan, { occScale: hi }))) return null;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (test(runPlan(plan, { occScale: mid }))) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Year-4 room occupancy at which each test first passes. */
export function breakEven(plan: Plan): BreakEven {
  const at = (test: Test) => {
    const s = solveOccScale(plan, test);
    return s === null ? null : readYear(runPlan(plan, { occScale: s })).occupancy;
  };
  return { cash: at(TESTS.cash), lease: at(TESTS.lease), five: at(TESTS.five) };
}

/**
 * Highest starting monthly rent at which the plan still passes `test`. Later rent steps keep
 * their ratio to the first.
 */
export function maxRent(plan: Plan, test: Test): number | null {
  const first = rentInYear(plan.lease.rentSteps, 1);
  const withRent = (rent: number): Plan => ({
    ...plan,
    lease: {
      ...plan.lease,
      rentSteps: first
        ? plan.lease.rentSteps.map((s) => ({ ...s, monthly: (s.monthly * rent) / first }))
        : autoEscalate({ base: rent, flatYears: plan.lease.years, rate: 0, years: plan.lease.years }),
    },
  });
  let lo = 0;
  let hi = 300000;
  if (!test(runPlan(withRent(lo)))) return null;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (test(runPlan(withRent(mid)))) lo = mid;
    else hi = mid;
  }
  return lo;
}
