// The J-curve: cumulative cash by month, with the cautious-to-hopeful band shaded around it.
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Band } from '../engine';
import { LAKH, lakh, lakhTick, monthLabel } from '../lib/money';

interface Row {
  month: number;
  base: number;
  cautious?: number;
  hopeful?: number;
  band?: [number, number];
}

const yearTicks = (months: number) => Array.from({ length: Math.floor(months / 12) + 1 }, (_, i) => i * 12);

/** Round lakh ticks that cover the data, about five of them. */
function lakhTicks(min: number, max: number): number[] {
  const span = Math.max(1, (max - min) / LAKH);
  const step = [5, 10, 20, 25, 50, 100, 200, 500].find((s) => span / s <= 6) ?? 1000;
  const lo = Math.floor(min / LAKH / step) * step;
  const hi = Math.ceil(max / LAKH / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi; v += step) out.push(v * LAKH);
  return out;
}

export function JCurve({ band, showBand = true, height = 260 }: { band: Band; showBand?: boolean; height?: number }) {
  const { base, cautious, hopeful } = band;
  const rows: Row[] = base.months.map((m, i) => {
    const c = cautious.months[i]?.cumulative ?? m.cumulative;
    const h = hopeful.months[i]?.cumulative ?? m.cumulative;
    return showBand ? { month: m.month, base: m.cumulative, cautious: c, hopeful: h, band: [Math.min(c, h), Math.max(c, h)] } : { month: m.month, base: m.cumulative };
  });
  const values = rows.flatMap((r) => [r.base, r.cautious ?? r.base, r.hopeful ?? r.base]);
  const ticks = lakhTicks(Math.min(0, ...values), Math.max(0, ...values));
  const paybackMonth = base.payback === null ? null : base.payback * 12;
  const months = base.months.length - 1;

  return (
    <figure style={{ margin: 0 }}>
      <div className="legend" style={{ marginBottom: 8 }} aria-hidden="true">
        <span>
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="var(--accent)" strokeWidth="2.5" /></svg>Expected
        </span>
        {showBand && (
          <span>
            <svg width="18" height="10"><rect width="18" height="10" fill="var(--accent-band)" /><line x1="0" y1="1" x2="18" y2="1" stroke="var(--faint)" strokeDasharray="3 3" /></svg>
            Cautious to hopeful
          </span>
        )}
      </div>
      <div style={{ height }} role="img" aria-label={`J-curve of cumulative cash. Lowest point ${lakh(base.lowestCash)}, ${paybackMonth === null ? 'no payback within the lease' : `pays back in ${base.payback!.toFixed(1)} years`}, ending at ${lakh(base.endCash)}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="month" type="number" domain={[0, months]} ticks={yearTicks(months)} tickFormatter={(m: number) => `${m / 12}`} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: 'Years', position: 'insideBottomRight', offset: 0, fill: 'var(--muted)', fontSize: 12 }} height={28} />
            <YAxis ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} tickFormatter={lakhTick} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
            {showBand && <Area dataKey="band" stroke="none" fill="var(--accent-band)" isAnimationActive={false} />}
            {showBand && <Line dataKey="cautious" stroke="var(--faint)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />}
            {showBand && <Line dataKey="hopeful" stroke="var(--faint)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />}
            <ReferenceLine y={0} stroke="var(--text)" strokeWidth={1} />
            {paybackMonth !== null && (
              <ReferenceLine x={paybackMonth} stroke="var(--text)" strokeDasharray="2 3" label={{ value: `Payback ${base.payback!.toFixed(1)} y`, position: 'insideTopLeft', fill: 'var(--text)', fontSize: 12 }} />
            )}
            <Line dataKey="base" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)' }} />
            <Tooltip
              cursor={{ stroke: 'var(--faint)', strokeDasharray: '3 3' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const r = payload[0].payload as Row;
                const m = Number(label);
                return (
                  <div className="term-pop" style={{ position: 'static', width: 'auto' }}>
                    <div className="muted">{monthLabel(m)}</div>
                    <div className="num"><strong>{lakh(r.base)}</strong> expected</div>
                    {r.cautious !== undefined && <div className="num muted">{lakh(r.cautious)} cautious · {lakh(r.hopeful!)} hopeful</div>}
                  </div>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
