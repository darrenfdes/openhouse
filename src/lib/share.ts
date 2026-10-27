// Share links: the plan as openhouse/v1 JSON, defaults left out, compressed into the URL hash.
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Plan } from '../schema/plan';
import { stripDefaults, validate } from '../schema/validate';

const KEY = '#p=';

export function shareHash(plan: Plan): string {
  return KEY + compressToEncodedURIComponent(JSON.stringify(stripDefaults(plan)));
}

export function planFromHash(hash: string): { plan: Plan | null; errors: string[] } {
  if (!hash.startsWith(KEY)) return { plan: null, errors: [] };
  const json = decompressFromEncodedURIComponent(hash.slice(KEY.length));
  let parsed: unknown;
  try {
    parsed = json ? JSON.parse(json) : undefined;
  } catch {
    parsed = undefined;
  }
  if (parsed === undefined) return { plan: null, errors: ['This share link is damaged: it may have been cut short when it was copied.'] };
  const r = validate(parsed);
  return { plan: r.plan, errors: r.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)) };
}
