// Editors for the built-in cards and the partners' own extras, shared by the builder and All settings.
import type { ReactNode } from 'react';
import { setIn } from '../lib/edit';
import { DEFAULT_EXTRA } from '../schema/defaults';
import { SEASONS, type Plan } from '../schema/plan';
import { NumberField, SelectField, TextField } from './fields';

type Path = (string | number)[];
type Unit = Parameters<typeof NumberField>[0]['unit'];
const getIn = (obj: unknown, path: Path): unknown => path.reduce<unknown>((o, k) => (o as Record<string | number, unknown>)?.[k], obj);

export const CARD_TITLES: Record<keyof Plan['cards'], string> = {
  cafe: 'Café, run by us', cowork: 'Co-working', pool: 'Pool', powerBackup: 'Power backup', kitchen: 'Kitchen and catering',
};

function useFields(plan: Plan, set: (p: Plan) => void) {
  const put = (path: Path, v: unknown) => set(setIn(plan, path, v));
  const num = (path: Path, label: ReactNode, unit?: Unit, min = 0, max?: number) => (
    <NumberField key={path.join('.')} label={label} value={getIn(plan, path) as number} unit={unit} min={min} max={max} onChange={(v) => put(path, v)} />
  );
  const sectionOpts = plan.sections.map((s) => ({ value: s.id, label: s.name || 'Section' }));
  return { put, num, sectionOpts };
}

function OnSwitch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="field-unit">
      <input type="checkbox" role="switch" className="switch" aria-label={label} checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span>{on ? 'On' : 'Off'}</span>
    </label>
  );
}

/** The five built-in cards. With `onlyWhenOn`, a card that is off shows just its switch. */
export function CardEditors({ plan, set, onlyWhenOn = false }: { plan: Plan; set: (p: Plan) => void; onlyWhenOn?: boolean }) {
  const { put, num, sectionOpts } = useFields(plan, set);
  return (
    <>
      {(Object.keys(CARD_TITLES) as (keyof Plan['cards'])[]).map((k) => {
        const c = plan.cards[k];
        return (
          <div className="item" key={k}>
            <div className="item-head">
              <strong>{CARD_TITLES[k]}</strong>
              <OnSwitch label={CARD_TITLES[k]} on={c.on} onChange={(v) => put(['cards', k, 'on'], v)} />
            </div>
            {(c.on || !onlyWhenOn) && (
              <>
                <div className="fields">
                  <SelectField label="Section" value={c.sectionId} options={sectionOpts} onChange={(v) => put(['cards', k, 'sectionId'], v)} />
                  {num(['cards', k, 'build'], 'Build cost', 'rs')}
                  {'monthly' in c && num(['cards', k, 'monthly'], k === 'cowork' ? 'Income a month' : 'Running cost a month', 'rs')}
                  {'areaM2' in c && num(['cards', k, 'areaM2'], 'Area', 'm2')}
                  {k === 'pool' && num(['cards', 'pool', 'rateLift'], 'Lift on nightly rates', 'pct', 0, 2)}
                  {k === 'cafe' && (
                    <>
                      {num(['cards', 'cafe', 'ticket'], 'Average bill', 'rs')}
                      {num(['cards', 'cafe', 'foodCost'], 'Food cost', 'pct', 0, 1)}
                      {num(['cards', 'cafe', 'cookPay'], 'Cook pay', 'rs')}
                      {num(['cards', 'cafe', 'helperPay'], 'Kitchen helper pay', 'rs')}
                      {num(['cards', 'cafe', 'serverPay'], 'Server pay', 'rs')}
                    </>
                  )}
                </div>
                {k === 'cafe' && <div className="fields">{SEASONS.map((s) => num(['cards', 'cafe', 'covers', s], `Covers a day, ${s}`, 'count'))}</div>}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

function newExtraId(plan: Plan): string {
  const ids = new Set(plan.extras.map((x) => x.id));
  let n = plan.extras.length + 1;
  while (ids.has(`extra-${n}`)) n++;
  return `extra-${n}`;
}

/** The partners' own extras: anything with a build cost, a running cost and income by season. */
export function ExtrasEditor({ plan, set }: { plan: Plan; set: (p: Plan) => void }) {
  const { put, num, sectionOpts } = useFields(plan, set);
  const add = () => set({ ...plan, extras: [...plan.extras, { ...structuredClone(DEFAULT_EXTRA), id: newExtraId(plan), sectionId: plan.sections[0].id }] });
  return (
    <>
      {plan.extras.map((x, i) => (
        <div className="item" key={x.id}>
          <div className="item-head">
            <strong>{x.name || 'Extra'}</strong>
            <div className="actions">
              <OnSwitch label={x.name || 'Extra'} on={x.on} onChange={(v) => put(['extras', i, 'on'], v)} />
              <button type="button" className="btn ghost" onClick={() => set({ ...plan, extras: plan.extras.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          </div>
          <div className="fields">
            <TextField label="Name" value={x.name} onChange={(v) => put(['extras', i, 'name'], v)} />
            <SelectField label="Section" value={x.sectionId} options={sectionOpts} onChange={(v) => put(['extras', i, 'sectionId'], v)} />
            {num(['extras', i, 'areaM2'], 'Area', 'm2')}
            {num(['extras', i, 'build'], 'Build cost', 'rs')}
            {num(['extras', i, 'monthly'], 'Running cost a month', 'rs')}
            <SelectField label="Income in the first two years" value={x.rampsUp ? 'ramp' : 'full'} options={[{ value: 'ramp', label: 'Grows with guests' }, { value: 'full', label: 'Full from opening' }]} onChange={(v) => put(['extras', i, 'rampsUp'], v === 'ramp')} />
          </div>
          <div className="fields">{SEASONS.map((s) => num(['extras', i, 'income', s], `Income a month, ${s}`, 'rs'))}</div>
        </div>
      ))}
      <div><button type="button" className="btn" onClick={add}>Add your own extra</button></div>
    </>
  );
}
