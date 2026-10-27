import { useEffect, useId, useState, type ReactNode } from 'react';

type Unit = 'rs' | 'pct' | 'm2' | 'months' | 'years' | 'count' | 'nights';
const SUFFIX: Record<Unit, string> = { rs: 'Rs', pct: '%', m2: 'm²', months: 'months', years: 'years', count: '', nights: '' };

/** A number input. Percentages are stored as fractions and shown ×100. */
export function NumberField({ label, value, onChange, unit = 'count', min, max, step, hint }: {
  label: ReactNode; value: number; onChange: (v: number) => void; unit?: Unit; min?: number; max?: number; step?: number; hint?: string;
}) {
  const id = useId();
  const scale = unit === 'pct' ? 100 : 1;
  const show = (v: number) => String(Math.round(v * scale * 1000) / 1000);
  const [text, setText] = useState(show(value));
  useEffect(() => setText(show(value)), [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (t: string) => {
    const n = Number(t.replace(/,/g, ''));
    if (t.trim() === '' || !Number.isFinite(n)) return setText(show(value));
    const v = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n / scale));
    onChange(v);
    setText(show(v));
  };
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="field-unit">
        {unit === 'rs' && <span>{SUFFIX.rs}</span>}
        <input id={id} className="input num" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)} aria-describedby={hint ? `${id}-hint` : undefined} step={step} />
        {unit !== 'rs' && SUFFIX[unit] && <span>{SUFFIX[unit]}</span>}
      </div>
      {hint && <span id={`${id}-hint`} className="row-sub">{hint}</span>}
    </div>
  );
}

export function TextField({ label, value, onChange }: { label: ReactNode; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange }: { label: ReactNode; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/** A switch row: title, one line of detail, the switch on the right. */
export function SwitchRow({ title, sub, checked, onChange }: { title: ReactNode; sub?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="row">
      <div className="row-main">
        <label className="row-title" htmlFor={id}>{title}</label>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      <input id={id} type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

/** A slider with its value shown in words beside the label. */
export function Slider({ label, value, display, min, max, step, onChange }: {
  label: ReactNode; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="slider">
      <div className="slider-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{display}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={display} />
    </div>
  );
}
