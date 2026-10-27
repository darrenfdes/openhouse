// Cash each year: one bar per lease year, the build outlay as year 0.
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Result } from '../engine';
import { LAKH, lakh } from '../lib/money';

export function YearBars({ result, height = 260 }: { result: Result; height?: number }) {
  const rows = [{ year: 0, cash: -result.totalCash }, ...result.years.map((y, i) => ({ year: i + 1, cash: y.cash }))];
  return (
    <div style={{ height }} role="img" aria-label={`Cash each year: ${rows.map((r) => `year ${r.year} ${lakh(r.cash)}`).join(', ')}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} height={28} />
          <YAxis tickFormatter={(v: number) => `${Math.round(v / LAKH)} L`} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
          <ReferenceLine y={0} stroke="var(--text)" />
          <Tooltip cursor={{ fill: 'var(--raised)' }} formatter={(v: number) => [lakh(v), 'Cash']} labelFormatter={(y: number) => (y === 0 ? 'Before opening' : `Year ${y}`)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
          <Bar dataKey="cash" isAnimationActive={false} maxBarSize={36}>
            {rows.map((r) => (
              <Cell key={r.year} fill={r.year === 0 ? 'var(--text)' : 'var(--accent)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
