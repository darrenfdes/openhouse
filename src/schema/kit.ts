// A small schema kit: one description of the format gives validation with plain-English
// messages, default filling, unknown-field warnings and default stripping for share links.

export type Node =
  | { k: 'num'; label: string; min?: number; max?: number; int?: boolean; req?: string; opt?: boolean }
  | { k: 'str'; label: string; req?: string; opt?: boolean; nonEmpty?: boolean }
  | { k: 'bool'; label: string; opt?: boolean; req?: string }
  | { k: 'lit'; label: string; value: string; req?: string; opt?: boolean }
  | { k: 'enum'; label: string; values: readonly string[]; req?: string; opt?: boolean }
  | { k: 'obj'; label: string; fields: Record<string, Node>; req?: string; opt?: boolean }
  | { k: 'arr'; label: string; of: Node; item?: unknown; min?: number; len?: number; minMessage?: string; req?: string; opt?: boolean };

type Opts = { req?: string; opt?: boolean };
export const num = (label: string, o: { min?: number; max?: number; int?: boolean } & Opts = {}): Node => ({ k: 'num', label, ...o });
export const str = (label: string, o: { nonEmpty?: boolean } & Opts = {}): Node => ({ k: 'str', label, ...o });
export const bool = (label: string, o: Opts = {}): Node => ({ k: 'bool', label, ...o });
export const lit = (label: string, value: string, o: Opts = {}): Node => ({ k: 'lit', label, value, ...o });
export const oneOf = (label: string, values: readonly string[], o: Opts = {}): Node => ({ k: 'enum', label, values, ...o });
export const obj = (label: string, fields: Record<string, Node>, o: Opts = {}): Node => ({ k: 'obj', label, fields, ...o });
export const arr = (label: string, of: Node, o: { item?: unknown; min?: number; len?: number; minMessage?: string } & Opts = {}): Node => ({ k: 'arr', label, of, ...o });

export interface Issue {
  path: string;
  message: string;
}

export interface Ctx {
  errors: Issue[];
  warnings: string[];
  filled: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v));

/** "a, b or c" */
export function orList(values: readonly string[]): string {
  return values.length < 2 ? values.join('') : `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}`;
}

function describeRange(n: Extract<Node, { k: 'num' }>): string {
  const what = n.int ? 'a whole number' : 'a number';
  if (n.min !== undefined && n.max !== undefined) return `${what} from ${n.min} to ${n.max}`;
  if (n.min !== undefined) return `${what}, ${n.min} or more`;
  if (n.max !== undefined) return `${what}, ${n.max} or less`;
  return what;
}

const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

/** Checks `value` against `node`, filling what is missing from `def`. Returns the cleaned value. */
export function check(node: Node, value: unknown, def: unknown, path: string, ctx: Ctx): unknown {
  if (value === undefined || value === null) {
    if (node.req) {
      ctx.errors.push({ path, message: node.req });
      return clone(def);
    }
    if (node.opt) return undefined;
    ctx.filled.push(path);
    return clone(def);
  }
  const fail = (message: string) => {
    ctx.errors.push({ path, message });
    return clone(def);
  };
  switch (node.k) {
    case 'num': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return fail(`${node.label} must be ${describeRange(node)}.`);
      if ((node.int && !Number.isInteger(value)) || (node.min !== undefined && value < node.min) || (node.max !== undefined && value > node.max))
        return fail(`${node.label} must be ${describeRange(node)}; it is ${value}.`);
      return value;
    }
    case 'str':
      if (typeof value !== 'string') return fail(`${node.label} must be text.`);
      if (node.nonEmpty && !value.trim()) return fail(node.req ?? `${node.label} cannot be empty.`);
      return value;
    case 'bool':
      if (typeof value !== 'boolean') return fail(`${node.label} must be true or false.`);
      return value;
    case 'lit':
      if (value !== node.value) return fail(`${node.label} must be "${node.value}".`);
      return value;
    case 'enum':
      if (typeof value !== 'string' || !node.values.includes(value)) return fail(`${node.label} must be ${orList(node.values)}.`);
      return value;
    case 'obj': {
      if (!isObj(value)) return fail(`${node.label} must be a group of fields.`);
      const d = isObj(def) ? def : {};
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node.fields)) {
        const v = check(child, value[key], d[key], join(path, key), ctx);
        if (v !== undefined) out[key] = v;
      }
      for (const key of Object.keys(value)) if (!(key in node.fields)) ctx.warnings.push(`Ignored unknown field "${join(path, key)}".`);
      return out;
    }
    case 'arr': {
      if (!Array.isArray(value)) return fail(`${node.label} must be a list.`);
      if (node.min !== undefined && value.length < node.min) return fail(node.minMessage ?? `${node.label} needs at least ${node.min}.`);
      if (node.len !== undefined && value.length !== node.len) return fail(`${node.label} must list exactly ${node.len} values.`);
      const defs = Array.isArray(def) ? def : [];
      return value.map((v, i) => check(node.of, v, node.item ?? defs[i], `${path}[${i}]`, ctx));
    }
  }
}

/** Removes every field equal to its default, so share links stay short. */
export function strip(node: Node, value: unknown, def: unknown): unknown {
  if (node.k === 'obj' && isObj(value)) {
    const d = isObj(def) ? def : {};
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node.fields)) {
      if (value[key] === undefined) continue;
      if (!child.req && deepEqual(value[key], d[key])) continue;
      out[key] = strip(child, value[key], d[key]);
    }
    return out;
  }
  if (node.k === 'arr' && Array.isArray(value) && node.item !== undefined) return value.map((v) => strip(node.of, v, node.item));
  return value;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}
