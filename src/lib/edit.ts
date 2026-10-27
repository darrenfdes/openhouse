/** Immutable set by path: setIn(plan, ['lease', 'years'], 10). */
export function setIn<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T;
  const [head, ...rest] = path;
  const src = obj as Record<string | number, unknown>;
  const next = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  (next as Record<string | number, unknown>)[head] = setIn(src?.[head], rest, value);
  return next as T;
}
