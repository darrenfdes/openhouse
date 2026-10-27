import type { Plan } from '../schema/plan';
import { runPlan, type Result, type RunOptions } from './run';

/** Occupancy -20% and rates -10%. */
export const CAUTIOUS: Required<RunOptions> = { occScale: 0.8, rateScale: 0.9 };
/** Occupancy +15%. */
export const HOPEFUL: Required<RunOptions> = { occScale: 1.15, rateScale: 1 };

export interface Band {
  base: Result;
  cautious: Result;
  hopeful: Result;
}

export function runBand(plan: Plan): Band {
  return { base: runPlan(plan), cautious: runPlan(plan, CAUTIOUS), hopeful: runPlan(plan, HOPEFUL) };
}
