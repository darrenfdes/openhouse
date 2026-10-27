// App state: projects (one property each), their saved plans, the selected plan and the compare set. Kept in browser storage.
import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Plan } from '../schema/plan';
import { validate } from '../schema/validate';
import { templates, type TemplateKey } from '../templates';

export interface Project {
  id: string;
  name: string;
  place: string;
}

export interface SavedPlan {
  id: string;
  projectId: string;
  plan: Plan;
}

export interface State {
  projects: Project[];
  plans: SavedPlan[];
  selectedId: string;
  compareIds: string[];
}

export type Action =
  | { type: 'select'; id: string }
  | { type: 'update'; id: string; plan: Plan }
  | { type: 'add'; plan: Plan; projectId?: string }
  | { type: 'duplicate'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'toggleCompare'; id: string }
  | { type: 'selectProject'; id: string }
  | { type: 'addProject'; name: string; place: string; plan: Plan }
  | { type: 'updateProject'; id: string; name: string; place: string }
  | { type: 'removeProject'; id: string }
  | { type: 'reset' };

const STORAGE_KEY = 'openhouse:v1';
export const MAX_COMPARE = 4;

const TEMPLATE_ORDER: TemplateKey[] = ['A', 'B', 'C', 'SV'];
const VELSAO: Project = { id: 'velsao', name: 'Velsao House', place: 'Velsao, South Goa' };

export function initialState(): State {
  const plans = TEMPLATE_ORDER.map((k) => ({ id: k.toLowerCase(), projectId: VELSAO.id, plan: structuredClone(templates[k]) }));
  return { projects: [VELSAO], plans, selectedId: 'a', compareIds: ['a', 'b', 'c'] };
}

const newId = () => Math.random().toString(36).slice(2, 9);

export function projectOf(state: State, planId = state.selectedId): Project {
  const projectId = state.plans.find((p) => p.id === planId)?.projectId;
  return state.projects.find((p) => p.id === projectId) ?? state.projects[0];
}

/** A plan's name, with its project's in front once there is more than one project. */
export function planTitle(state: State, saved: SavedPlan): string {
  return state.projects.length > 1 ? `${projectOf(state, saved.id).name} · ${saved.plan.name}` : saved.plan.name;
}

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
      const projectId = action.projectId ?? projectOf(state).id;
      const plan = { ...action.plan, name: uniqueName(state.plans.filter((p) => p.projectId === projectId), action.plan.name) };
      return { ...state, plans: [...state.plans, { id, projectId, plan }], selectedId: id };
    }
    case 'duplicate': {
      const src = state.plans.find((p) => p.id === action.id);
      if (!src) return state;
      return reducer(state, { type: 'add', projectId: src.projectId, plan: { ...structuredClone(src.plan), name: `${src.plan.name} copy` } });
    }
    case 'remove': {
      const projectId = state.plans.find((p) => p.id === action.id)?.projectId;
      const siblings = state.plans.filter((p) => p.projectId === projectId && p.id !== action.id);
      if (!siblings.length) return state;
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== action.id),
        selectedId: state.selectedId === action.id ? siblings[0].id : state.selectedId,
        compareIds: state.compareIds.filter((id) => id !== action.id),
      };
    }
    case 'selectProject': {
      const first = state.plans.find((p) => p.projectId === action.id);
      return first ? { ...state, selectedId: first.id } : state;
    }
    case 'addProject': {
      const project = { id: newId(), name: action.name.trim() || 'New project', place: action.place.trim() };
      return reducer({ ...state, projects: [...state.projects, project] }, { type: 'add', projectId: project.id, plan: action.plan });
    }
    case 'updateProject':
      return { ...state, projects: state.projects.map((p) => (p.id === action.id ? { id: p.id, name: action.name, place: action.place } : p)) };
    case 'removeProject': {
      if (state.projects.length <= 1) return state;
      const plans = state.plans.filter((p) => p.projectId !== action.id);
      const ids = new Set(plans.map((p) => p.id));
      return {
        projects: state.projects.filter((p) => p.id !== action.id),
        plans,
        selectedId: ids.has(state.selectedId) ? state.selectedId : plans[0].id,
        compareIds: state.compareIds.filter((id) => ids.has(id)),
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

/**
 * Rebuilds state from a save. Every plan goes back through `validate`, so a stale save cannot break the app;
 * a save from before projects puts every plan in Velsao House.
 */
export function fromSaved(saved: Partial<State>): State {
  const projects = saved.projects?.length ? saved.projects : [VELSAO];
  const projectIds = new Set(projects.map((p) => p.id));
  const plans = (saved.plans ?? []).flatMap((p) => {
    const r = validate(p.plan);
    return r.plan ? [{ id: p.id, projectId: projectIds.has(p.projectId) ? p.projectId : projects[0].id, plan: r.plan }] : [];
  });
  // A project left with no plans (all failed to load) is dropped.
  const kept = projects.filter((p) => plans.some((s) => s.projectId === p.id));
  if (!plans.length) return initialState();
  const ids = new Set(plans.map((p) => p.id));
  return {
    projects: kept,
    plans,
    selectedId: saved.selectedId && ids.has(saved.selectedId) ? saved.selectedId : plans[0].id,
    compareIds: (saved.compareIds ?? []).filter((id) => ids.has(id)).slice(0, MAX_COMPARE),
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? fromSaved(JSON.parse(raw) as Partial<State>) : initialState();
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

export function useProject(): Project {
  return projectOf(useStore().state);
}

export function useSelected(): SavedPlan {
  const { state } = useStore();
  return state.plans.find((p) => p.id === state.selectedId) ?? state.plans[0];
}
