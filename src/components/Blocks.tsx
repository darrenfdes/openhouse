// The section block diagram: indoor sections in one row and open ground in another, each box as
// wide as its area within its row, with what is placed in it drawn as a bar coloured by use.
import type { Plan, Section } from '../schema/plan';

export const USE_KINDS = {
  rooms: { label: 'Rooms', color: 'var(--text)' },
  ours: { label: 'Run by us', color: 'var(--accent)' },
  tenant: { label: 'Tenants', color: 'var(--positive)' },
  pool: { label: 'Pool', color: 'var(--chart-4)' },
} as const;
type UseKind = keyof typeof USE_KINDS;

interface Piece {
  kind: UseKind;
  m2: number;
  what: string;
}

export function sectionUse(plan: Plan): Map<string, Piece[]> {
  const m = new Map<string, Piece[]>(plan.sections.map((s) => [s.id, []]));
  const add = (id: string, kind: UseKind, m2: number, what: string) => m.get(id)?.push({ kind, m2, what });
  for (const r of plan.rooms) if (r.count) add(r.sectionId, 'rooms', r.count * r.areaM2, `${r.count} ${r.count === 1 ? 'room' : 'rooms'}`);
  const { cafe, cowork, pool } = plan.cards;
  if (cafe.on) add(cafe.sectionId, 'ours', cafe.areaM2, 'café');
  if (cowork.on) add(cowork.sectionId, 'ours', cowork.areaM2, 'co-working');
  if (pool.on) add(pool.sectionId, 'pool', pool.areaM2, 'pool');
  for (const s of plan.subleases) add(s.sectionId, 'tenant', s.areaM2, s.name.toLowerCase());
  return m;
}

function Box({ s, pieces, onPick }: { s: Section; pieces: Piece[]; onPick?: (id: string) => void }) {
  const used = pieces.reduce((t, p) => t + p.m2, 0);
  const over = used > s.areaM2;
  const scale = Math.max(used, s.areaM2) || 1;
  return (
    <button
      type="button"
      role="listitem"
      className={`block${over ? ' over' : ''}`}
      style={{ flex: `${Math.max(s.areaM2, 1)} 1 0` }}
      onClick={() => onPick?.(s.id)}
      aria-label={`${s.name}, ${s.areaM2} m², ${pieces.length ? pieces.map((p) => p.what).join(', ') : 'nothing placed'}${over ? ', over capacity' : ''}. Edit`}
    >
      <span>
        <span className="block-name">{s.name}</span>
        <span className="block-meta" style={{ display: 'block' }}>{pieces.length ? pieces.map((p) => p.what).join(', ') : 'Nothing placed'}</span>
      </span>
      <span className="block-meta num">
        {Math.round(used)} of {Math.round(s.areaM2)} m²{over ? ', over' : ''}
      </span>
      <span className="block-bar" aria-hidden="true">
        {pieces.map((p, i) => (
          <span key={i} style={{ width: `${(p.m2 / scale) * 100}%`, background: USE_KINDS[p.kind].color }} />
        ))}
      </span>
    </button>
  );
}

export function Blocks({ plan, onPick }: { plan: Plan; onPick?: (id: string) => void }) {
  const use = sectionUse(plan);
  const rows = [plan.sections.filter((s) => s.type === 'indoor'), plan.sections.filter((s) => s.type !== 'indoor')].filter((r) => r.length);
  const shown = new Set([...use.values()].flat().map((p) => p.kind));
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div role="list" aria-label="Sections" className="stack" style={{ gap: 4 }}>
        {rows.map((row, i) => (
          <div key={i} className="blocks">
            {row.map((s) => <Box key={s.id} s={s} pieces={use.get(s.id) ?? []} onPick={onPick} />)}
          </div>
        ))}
      </div>
      {shown.size > 0 && (
        <div className="legend" aria-hidden="true">
          {(Object.keys(USE_KINDS) as UseKind[]).filter((k) => shown.has(k)).map((k) => (
            <span key={k}><svg width="12" height="4"><rect width="12" height="4" fill={USE_KINDS[k].color} /></svg>{USE_KINDS[k].label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
