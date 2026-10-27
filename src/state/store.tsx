// App state: saved plans, the selected plan and the compare set. Kept in browser storage.
import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Plan } from '../schema/plan';
import { validate } from '../schema/validate';
import { templates, type TemplateKey } from '../templates';

export interface SavedPlan {
  id: string;
  plan: Plan;
}

export interface State {
  plans: SavedPlan[];
  selectedId: string;
  compareIds: string[];
}

export type Action =
  | { type: 'select'; id: string }
  | { type: 'update'; id: string; plan: Plan }
  | { type: 'add'; plan: Plan }
  | { type: 'duplicate'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'toggleCompare'; id: string }
  | { type: 'reset' };

const STORAGE_KEY = 'openhouse:v1';
export const MAX_COMPARE = 4;

const TEMPLATE_ORDER: TemplateKey[] = ['A', 'B', 'C', 'SV'];

export function initialState(): State {
  const plans = TEMPLATE_ORDER.map((k) => ({ id: k.toLowerCase(), plan: structuredClone(templates[k]) }));
  return { plans, selectedId: 'a', compareIds: ['a', 'b', 'c'] };
}

const newId = () => Math.random().toString(36).slice(2, 9);

function uniqueName(plans: SavedPlan[], name: string): string {
  const names = new Set(plans.map((p) => p.plan.name));
  if (!names.has(name)) return name;
  for (let n = 2; ; n++) if (!names.has(`${name} (${n})`)) return `${name} (${n})`;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };
    case 'update':
      return { ...state, plans: state.plans.map((p) => (p.id === action.id ? { ...p, plan: action.plan } : p)) };
    case 'add': {
      const id = newId();
      const plan = { ...action.plan, name: uniqueName(state.plans, action.plan.name) };
      return { ...state, plans: [...state.plans, { id, plan }], selectedId: id };
    }
    case 'duplicate': {
      const src = state.plans.find((p) => p.id === action.id);
      if (!src) return state;
      return reducer(state, { type: 'add', plan: { ...structuredClone(src.plan), name: `${src.plan.name} copy` } });
    }
    case 'remove': {
      if (state.plans.length <= 1) return state;
      const plans = state.plans.filter((p) => p.id !== action.id);
      return {
        plans,
        selectedId: state.selectedId === action.id ? plans[0].id : state.selectedId,
        compareIds: state.compareIds.filter((id) => id !== action.id),
      };
    }
    case 'toggleCompare': {
      const on = state.compareIds.includes(action.id);
      if (!on && state.compareIds.length >= MAX_COMPARE) return state;
      return { ...state, compareIds: on ? state.compareIds.filter((id) => id !== action.id) : [...state.compareIds, action.id] };
    }
    case 'reset':
      return initialState();
  }
}

/** Reads saved state; every plan goes back through `validate`, so a stale save cannot break the app. */
function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const saved = JSON.parse(raw) as State;
    const plans = saved.plans.flatMap((p) => {
      const r = validate(p.plan);
      return r.plan ? [{ id: p.id, plan: r.plan }] : [];
    });
    if (!plans.length) return initialState();
    const ids = new Set(plans.map((p) => p.id));
    return {
      plans,
      selectedId: ids.has(saved.selectedId) ? saved.selectedId : plans[0].id,
      compareIds: (saved.compareIds ?? []).filter((id) => ids.has(id)).slice(0, MAX_COMPARE),
    };
  } catch {
    return initialState();
  }
}

function save(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private window): the app keeps working for this visit.
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children, init }: { children: ReactNode; init?: (s: State) => State }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => (init ? init(load()) : load()));
  useEffect(() => save(state), [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

export function useSelected(): SavedPlan {
  const { state } = useStore();
  return state.plans.find((p) => p.id === state.selectedId) ?? state.plans[0];
}
