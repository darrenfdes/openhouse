import type { Plan } from '../schema/plan';
import { PLAN_A, PLAN_B, PLAN_C } from './legacy';

export const templates = { A: PLAN_A, B: PLAN_B, C: PLAN_C } satisfies Record<string, Plan>;
