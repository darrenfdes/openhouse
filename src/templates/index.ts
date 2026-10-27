import type { Plan } from '../schema/plan';
import { PLAN_A, PLAN_B, PLAN_C } from './legacy';
import { PLAN_STAYVISTA } from './stayvista';

export const templates = { A: PLAN_A, B: PLAN_B, C: PLAN_C, SV: PLAN_STAYVISTA } satisfies Record<string, Plan>;
export type TemplateKey = keyof typeof templates;
