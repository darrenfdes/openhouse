// Compare up to four plans: one line each on the J-curve, and a table with the best value per row.
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Term } from '../components/Term';
import { breakEven, runPlan, type Result } from '../engine';
import type { TermKey } from '../lib/glossary';
import { LAKH, lakh, pct, years } from '../lib/money';
import { MAX_COMPARE, useStore } from '../state/store';

// Each plan gets a hue and a dash, so the lines read apart without colour too.
const STYLES = [
  { stroke: 'var(--accent)', dash: undefined, name: 'solid' },
  { stroke: 'var(--chart-2)', dash: '7 4', name: 'long dashes' },
  { stroke: 'var(--chart-3)', dash: '2 3', name: 'dots' },
  { stroke: 'var(--chart-4)', dash: '9 3 2 3', name: 'dash-dot' },
];

interface Row {
  label: string;
  term?: TermKey;
  value: (r: Result, be: number | null) => number | null;
  show: (v: number | null) => string;
  better: 'low' | 'high' | null;
}

const ROWS: Row[] = [
  { label: 'Payback', term: 'payback', value: (r) => r.payback, show: years, better: 'low' },
  { label: 'Cash to put in', term: 'totalCash', value: (r) => r.totalCash, show: (v) => lakh(v!), better: 'low' },
  { label: 'Net cash at lease end', term: 'endCash', value: (r) => r.endCash, show: (v) => lakh(v!), better: 'high' },
  { label: 'Yearly return (IRR)', term: 'irr', value: (r) => r.irr, show: (v) => pct(v), better: 'high' },
  { label: 'Lowest point', term: 'lowestCash', value: (r) => r.lowestCash, show: (v) => lakh(v!), better: 'high' },
  { label: 'Break-even occupancy', term: 'breakEven', value: (_, be) => be, show: (v) => (v === null ? '—' : pct(v, 0)), better: 'low' },
  { label: 'Profit in year 4', term: 'ebitda', value: (r) => r.years[Math.min(3, r.years.length - 1)].ebitda, show: (v) => lakh(v!), better: 'high' },
  { label: 'Lease length', value: (r) => r.years.length, show: (v) => `${v} years`, better: null },
];

export function Compare() {
  const { state, dispatch } = useStore();
  const chosen = state.compareIds.map((id) => state.plans.find((p) => p.id === id)).filter((p) => p !== undefined);
  const runs = useMemo(() => chosen.map((p) => ({ ...p, result: runPlan(p.plan), be: breakEven(p.plan).lease })), [chosen.map((p) => p.plan).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxMonth = Math.max(0, ...runs.map((r) => r.result.months.length - 1));
  const data = Array.from({ length: maxMonth + 1 }, (_, m) => Object.fromEntries([['month', m], ...runs.map((r) => [r.id, r.result.months[m]?.cumulative])]));

  const best = (row: Row) => {
    if (!row.better || runs.length < 2) return null;
    const vals = runs.map((r) => row.value(r.result, r.be));
    // "Never" pays back is the worst payback; a missing value never wins.
    const score = (v: number | null) => (v === null ? (row.better === 'low' ? Infinity : -Infinity) : v);
    const pick = row.better === 'low' ? Math.min(...vals.map(score)) : Math.max(...vals.map(score));
    return Number.isFinite(pick) ? pick : null;
  };

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Compare plans</h1>
          <p className="finding">{runs.length < 2 ? 'Choose two to four plans to see them side by side.' : `${runs.length} plans. The best value in each row is in bold.`}</p>
        </div>
      </div>
      <div className="stack">
        <section className="card" aria-labelledby="pick-h">
          <div className="card-head">
            <h2 id="pick-h">Plans to compare</h2>
            <span className="card-note">Up to {MAX_COMPARE}</span>
          </div>
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            {state.plans.map((p) => {
              const on = state.compareIds.includes(p.id);
              return (
                <label key={p.id} className="btn" style={{ background: on ? 'var(--active)' : undefined }}>
                  <input type="checkbox" checked={on} disabled={!on && state.compareIds.length >= MAX_COMPARE} onChange={() => dispatch({ type: 'toggleCompare', id: p.id })} />
                  {p.plan.name}
                </label>
              );
            })}
          </div>
        </section>

        {runs.length > 0 && (
          <section className="card" aria-labelledby="cmp-h">
            <div className="card-head">
              <h2 id="cmp-h"><Term k="jcurve">Cumulative cash</Term></h2>
              <span className="card-note">Expected case</span>
            </div>
            <div className="legend" style={{ marginBottom: 8 }}>
              {runs.map((r, i) => (
                <span key={r.id}>
                  <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke={STYLES[i].stroke} strokeWidth="2.5" strokeDasharray={STYLES[i].dash} /></svg>
                  {r.plan.name} <span className="visually-hidden">({STYLES[i].name})</span>
                </span>
              ))}
            </div>
            <div style={{ height: 300 }} role="img" aria-label={`Cumulative cash for ${runs.map((r) => `${r.plan.name}, ending at ${lakh(r.result.endCash)}`).join('; ')}.`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--grid)" />
                  <XAxis dataKey="month" type="number" domain={[0, maxMonth]} ticks={Array.from({ length: Math.floor(maxMonth / 12) + 1 }, (_, i) => i * 12)} tickFormatter={(m: number) => `${m / 12}`} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} height={28} label={{ value: 'Years', position: 'insideBottomRight', offset: 0, fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `${Math.round(v / LAKH)} L`} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
                  <ReferenceLine y={0} stroke="var(--text)" />
                  <Tooltip formatter={(v: number, id: string) => [lakh(v), runs.find((r) => r.id === id)?.plan.name ?? id]} labelFormatter={(m: number) => `Year ${Math.floor(m / 12)}, month ${m % 12}`} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                  {runs.map((r, i) => (
                    <Line key={r.id} dataKey={r.id} stroke={STYLES[i].stroke} strokeDasharray={STYLES[i].dash} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {runs.length > 0 && (
          <section className="card" aria-labelledby="tbl-h">
            <div className="card-head">
              <h2 id="tbl-h">Side by side</h2>
            </div>
            <div className="scroll-x">
              <table className="data">
                <thead>
                  <tr>
                    <th />
                    {runs.map((r) => <th key={r.id} className="num">{r.plan.name}{r.plan.guess ? ' (guesses)' : ''}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => {
                    const b = best(row);
                    return (
                      <tr key={row.label}>
                        <td>{row.term ? <Term k={row.term}>{row.label}</Term> : row.label}</td>
                        {runs.map((r) => {
                          const v = row.value(r.result, r.be);
                          const isBest = b !== null && v !== null && v === b;
                          return (
                            <td key={r.id} className="num" style={{ fontWeight: isBest ? 700 : 400 }}>
                              {row.show(v)}
                              {isBest && <span className="visually-hidden"> (best)</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
