// The plan screen. Its one question: when does this plan pay us back, and how sure is that?
import { useMemo, useState } from 'react';
import { Blocks } from '../components/Blocks';
import { SelectField, Slider, SwitchRow } from '../components/fields';
import { JCurve } from '../components/JCurve';
import { Term } from '../components/Term';
import { YearBars } from '../components/YearBars';
import { breakEven, earningsBySection, readYear, runBand, sectionWarnings, type Band } from '../engine';
import {
  finding, firstRent, headlineRate, peakOccupancy, setHeadlineRate, setLeaseYears, setPartners, setPeakOccupancy, setRent,
} from '../lib/easy';
import { setIn } from '../lib/edit';
import { lakh, monthLabel, pct, rupees, years } from '../lib/money';
import { navigate } from '../lib/route';
import { DEFAULT_SUBLEASE, SIZES } from '../schema/defaults';
import type { OperatorKind, Plan } from '../schema/plan';
import { useSelected, useStore } from '../state/store';
import { PlanActions } from './PlanActions';

const OPERATOR_LABEL: Record<OperatorKind, string> = { self: 'Ourselves', stayvista: 'StayVista', mixed: 'StayVista in peak, us the rest' };

export function Dashboard() {
  const { dispatch } = useStore();
  const { id, plan } = useSelected();
  const set = (next: Plan) => dispatch({ type: 'update', id, plan: next });
  const band = useMemo(() => runBand(plan), [plan]);
  const be = useMemo(() => breakEven(plan), [plan]);
  const { base } = band;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>{plan.name}</h1>
          <p className="finding">{finding(band)}</p>
        </div>
        <PlanActions plan={plan} id={id} />
      </div>
      {plan.guess && (
        <p className="notice" style={{ margin: '0 0 16px' }}>
          <Term k="guess">Untested guesses.</Term> This plan’s occupancy and StayVista rates have not been checked against real bookings. Read its results as a sketch, not a finding.
        </p>
      )}
      <div className="board">
        <aside className="controls stack" aria-label="Change the plan">
          <CardsPanel plan={plan} set={set} />
          <KeyNumbers plan={plan} set={set} />
        </aside>
        <div className="results stack">
          <Kpis band={band} breakEvenOcc={be.lease} partners={plan.partners.count} />
          <CashCard band={band} />
          <SectionsCard plan={plan} band={band} />
          <YearsCard band={band} />
          <BuildCard band={band} />
        </div>
      </div>
      <div className="resultbar" aria-live="polite">
        <div>
          <strong className="num">{years(base.payback)}</strong>
          <span>payback</span>
        </div>
        <div>
          <strong className="num">{lakh(base.endCash)}</strong>
          <span>at lease end</span>
        </div>
        <div>
          <strong className="num">{lakh(base.totalCash)}</strong>
          <span>cash in</span>
        </div>
      </div>
    </>
  );
}

function CardsPanel({ plan, set }: { plan: Plan; set: (p: Plan) => void }) {
  const c = plan.cards;
  const toggle = (key: keyof Plan['cards']) => (on: boolean) => set(setIn(plan, ['cards', key, 'on'], on));
  const addSublease = (kind: 'cafe' | 'padel') => {
    const home = kind === 'padel' ? plan.sections.find((s) => s.type === 'outdoor') ?? plan.sections[0] : plan.sections[0];
    const s = kind === 'padel'
      ? { ...DEFAULT_SUBLEASE, id: `padel-${Date.now()}`, name: 'Padel court', kind, areaM2: SIZES.padel, monthlyRent: 40000, rentFreeMonths: 0, sectionId: home.id, startMonth: plan.lease.fitoutMonths + 1 }
      : { ...DEFAULT_SUBLEASE, id: `cafe-${Date.now()}`, sectionId: home.id, startMonth: plan.lease.fitoutMonths + 1 };
    set({ ...plan, subleases: [...plan.subleases, s] });
  };
  return (
    <section className="card o-3" aria-labelledby="cards-h">
      <div className="card-head">
        <h2 id="cards-h"><Term k="card">Cards</Term></h2>
        <span className="card-note">On or off</span>
      </div>
      <SelectField label={<Term k="operator">Guest stays run by</Term>} value={plan.operator.kind} options={(Object.keys(OPERATOR_LABEL) as OperatorKind[]).map((k) => ({ value: k, label: OPERATOR_LABEL[k] }))} onChange={(v) => set(setIn(plan, ['operator', 'kind'], v))} />
      <div className="rows" style={{ marginTop: 8 }}>
        <SwitchRow title="Café, run by us" sub={c.cafe.on ? `${rupees(c.cafe.ticket)} a bill, ${c.cafe.covers.peak} covers a day in peak` : 'Off'} checked={c.cafe.on} onChange={toggle('cafe')} />
        <SwitchRow title="Co-working" sub={c.cowork.on ? `${rupees(c.cowork.monthly)} a month` : 'Off'} checked={c.cowork.on} onChange={toggle('cowork')} />
        <SwitchRow title="Pool" sub={`${lakh(c.pool.build)} to build, +${pct(c.pool.rateLift, 0)} on rates`} checked={c.pool.on} onChange={toggle('pool')} />
        <SwitchRow title="Power backup" sub={`${lakh(c.powerBackup.build)}, ${rupees(c.powerBackup.monthly)} a month`} checked={c.powerBackup.on} onChange={toggle('powerBackup')} />
        <SwitchRow title="Kitchen and catering" sub={`${lakh(c.kitchen.build)} to build`} checked={c.kitchen.on} onChange={toggle('kitchen')} />
        {plan.extras.map((x, i) => (
          <SwitchRow key={x.id} title={x.name} sub={`${lakh(x.build)} to build, ${rupees(x.income.peak)} a month in peak`} checked={x.on} onChange={(on) => set(setIn(plan, ['extras', i, 'on'], on))} />
        ))}
        {plan.subleases.map((s, i) => (
          <div className="row" key={s.id}>
            <div className="row-main">
              <div className="row-title"><Term k="sublease">{s.name}</Term></div>
              <div className="row-sub">{s.rentMode === 'fixed' ? `${rupees(s.monthlyRent)} a month` : `${pct(s.salesShare, 0)} of sales`}, {s.rentFreeMonths} months free</div>
            </div>
            <button type="button" className="btn ghost" onClick={() => set({ ...plan, subleases: plan.subleases.filter((_, j) => j !== i) })} aria-label={`Remove ${s.name}`}>Remove</button>
          </div>
        ))}
      </div>
      <div className="actions" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
        <button type="button" className="btn" onClick={() => addSublease('cafe')}>Add café brand</button>
        <button type="button" className="btn" onClick={() => addSublease('padel')}>Add padel court</button>
        <button type="button" className="btn" onClick={() => navigate('details', '#extras')}>Add your own extra</button>
      </div>
    </section>
  );
}

function KeyNumbers({ plan, set }: { plan: Plan; set: (p: Plan) => void }) {
  const sv = plan.operator.kind === 'stayvista';
  const firstSub = plan.subleases[0];
  return (
    <section className="card o-4" aria-labelledby="keys-h">
      <div className="card-head">
        <h2 id="keys-h">Key numbers</h2>
        <button type="button" className="btn ghost" onClick={() => navigate('details')}>All settings</button>
      </div>
      <Slider label={<Term k="rentSteps">Rent, first year</Term>} value={firstRent(plan)} display={`${rupees(firstRent(plan))} a month`} min={20000} max={250000} step={1000} onChange={(v) => set(setRent(plan, v))} />
      <Slider label={<Term k="rentFree">Rent-free months</Term>} value={plan.lease.rentFreeMonths} display={`${plan.lease.rentFreeMonths}`} min={0} max={24} step={1} onChange={(v) => set(setIn(plan, ['lease', 'rentFreeMonths'], v))} />
      <Slider label="Lease length" value={plan.lease.years} display={`${plan.lease.years} years`} min={3} max={20} step={1} onChange={(v) => set(setLeaseYears(plan, v))} />
      <Slider label={<Term k="occupancy">Occupancy in peak season</Term>} value={peakOccupancy(plan)} display={pct(peakOccupancy(plan), 0)} min={0.1} max={1} step={0.01} onChange={(v) => set(setPeakOccupancy(plan, v))} />
      <Slider label={sv ? 'Whole-villa rate, peak night' : 'Average room rate a night'} value={headlineRate(plan)} display={rupees(headlineRate(plan))} min={sv ? 5000 : 1000} max={sv ? 80000 : 20000} step={sv ? 500 : 100} onChange={(v) => set(setHeadlineRate(plan, v))} />
      {plan.rooms.map((r, i) => (
        <Slider key={r.id} label={r.name} value={r.count} display={`${r.count}`} min={0} max={8} step={1} onChange={(v) => set(setIn(plan, ['rooms', i, 'count'], v))} />
      ))}
      <Slider label={<Term k="fitout">Construction budget</Term>} value={plan.build.construction} display={lakh(plan.build.construction)} min={0} max={10000000} step={100000} onChange={(v) => set(setIn(plan, ['build', 'construction'], v))} />
      {plan.operator.kind !== 'stayvista' && (
        <Slider label={<Term k="bookingFee">Booking-site fee</Term>} value={plan.operator.bookingFee} display={pct(plan.operator.bookingFee)} min={0} max={0.3} step={0.005} onChange={(v) => set(setIn(plan, ['operator', 'bookingFee'], v))} />
      )}
      {plan.operator.kind !== 'self' && (
        <Slider label={<Term k="commission">StayVista commission</Term>} value={plan.operator.stayvista.commission} display={pct(plan.operator.stayvista.commission)} min={0.2} max={0.35} step={0.005} onChange={(v) => set(setIn(plan, ['operator', 'stayvista', 'commission'], v))} />
      )}
      {firstSub && (
        <Slider label={`${firstSub.name} rent`} value={firstSub.monthlyRent} display={`${rupees(firstSub.monthlyRent)} a month`} min={0} max={300000} step={5000} onChange={(v) => set(setIn(plan, ['subleases', 0, 'monthlyRent'], v))} />
      )}
      <Slider label="Partners" value={plan.partners.count} display={`${plan.partners.count}`} min={1} max={8} step={1} onChange={(v) => set(setPartners(plan, v))} />
    </section>
  );
}

function Kpis({ band, breakEvenOcc, partners }: { band: Band; breakEvenOcc: number | null; partners: number }) {
  const r = band.base;
  const even = r.perPartner.every((v) => Math.abs(v - r.perPartner[0]) < 1);
  return (
    <section className="kpis o-1" aria-label="Key results">
      <div className="kpi">
        <div className="kpi-label"><Term k="payback">Payback</Term></div>
        <div className="kpi-value lead">{years(r.payback)}</div>
        <div className="kpi-sub">{r.payback === null ? 'not within the lease' : `of a ${r.years.length}-year lease`}</div>
      </div>
      <div className="kpi">
        <div className="kpi-label"><Term k="totalCash">Cash to put in</Term></div>
        <div className="kpi-value">{lakh(r.totalCash)}</div>
        <div className="kpi-sub"><Term k="perPartner">{even ? `${lakh(r.perPartner[0])} each of ${partners}` : r.perPartner.map((v) => lakh(v)).join(' · ')}</Term></div>
      </div>
      <div className="kpi">
        <div className="kpi-label"><Term k="endCash">At lease end</Term></div>
        <div className={`kpi-value ${r.endCash < 0 ? 'neg' : ''}`}>{lakh(r.endCash)}</div>
        <div className="kpi-sub"><Term k="lowestCash">{lakh(r.lowestCash)} lowest</Term></div>
      </div>
      <div className="kpi">
        <div className="kpi-label"><Term k="irr">Return (IRR)</Term></div>
        <div className="kpi-value">{pct(r.irr)}</div>
        <div className="kpi-sub">a year, whole lease</div>
      </div>
      <div className="kpi">
        <div className="kpi-label"><Term k="breakEven">Break-even</Term></div>
        <div className="kpi-value">{breakEvenOcc === null ? '—' : pct(breakEvenOcc, 0)}</div>
        <div className="kpi-sub">occupancy; {pct(readYear(r).occupancy, 0)} expected</div>
      </div>
    </section>
  );
}

function CashCard({ band }: { band: Band }) {
  const [tab, setTab] = useState<'cum' | 'year'>('cum');
  const cases = [
    { name: 'Cautious', k: 'cautious' as const, r: band.cautious },
    { name: 'Expected', k: null, r: band.base },
    { name: 'Hopeful', k: 'hopeful' as const, r: band.hopeful },
  ];
  return (
    <section className="card o-2" aria-labelledby="cash-h">
      <div className="card-head">
        <h2 id="cash-h"><Term k="jcurve">Cash over the lease</Term></h2>
        <span className="card-note">After tax, in rupees of the day</span>
      </div>
      <div className="tabs" role="tablist" aria-label="Chart">
        <button type="button" role="tab" className="tab" aria-selected={tab === 'cum'} onClick={() => setTab('cum')}>Cumulative cash</button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'year'} onClick={() => setTab('year')}>Cash each year</button>
      </div>
      {tab === 'cum' ? <JCurve band={band} /> : <YearBars result={band.base} />}
      <div className="scroll-x" style={{ marginTop: 12 }}>
        <table className="data">
          <thead>
            <tr>
              <th><Term k="band">Case</Term></th>
              <th className="num">Payback</th>
              <th className="num">IRR</th>
              <th className="num">Net at lease end</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.name}>
                <td>{c.k ? <Term k={c.k}>{c.name}</Term> : <strong>{c.name}</strong>}</td>
                <td className="num">{years(c.r.payback)}</td>
                <td className="num">{pct(c.r.irr)}</td>
                <td className={`num ${c.r.endCash < 0 ? 'neg' : ''}`}>{lakh(c.r.endCash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The block diagram with each section's earnings beside it: one card, so the two never end apart. */
function SectionsCard({ plan, band }: { plan: Plan; band: Band }) {
  const warnings = sectionWarnings(plan);
  const e = earningsBySection(plan, band.base);
  const yi = band.base.years.indexOf(readYear(band.base));
  return (
    <section className="card o-5" aria-labelledby="sections-h">
      <div className="card-head">
        <h2 id="sections-h"><Term k="section">Sections</Term> and <Term k="earningsBySection">what each earns</Term></h2>
        <span className="card-note num">{Math.round(plan.sections.reduce((t, s) => t + s.areaM2, 0)).toLocaleString('en-IN')} m², year {yi + 1} before tax</span>
      </div>
      <div className="pair">
        <div>
          <Blocks plan={plan} onPick={(sid) => navigate('details', `#section-${sid}`)} />
          {warnings.map((w) => (
            <p key={w} className="notice" style={{ margin: '10px 0 0' }}>{w} This is a warning only: check the sizes.</p>
          ))}
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Section</th>
              <th className="num">Profit</th>
              <th className="num">Per m²</th>
            </tr>
          </thead>
          <tbody>
            {e.map((s) => (
              <tr key={s.id}>
                <td style={{ whiteSpace: 'normal' }}>{s.name}</td>
                <td className={`num ${s.years[yi] < 0 ? 'neg' : ''}`}>{lakh(s.years[yi])}</td>
                <td className="num">{rupees(s.perM2[yi])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="card-note" style={{ margin: '12px 0 0' }}>Rent, the caretaker, utilities and other shared costs are split by area, so open land carries a large share of them.</p>
    </section>
  );
}

function YearsCard({ band }: { band: Band }) {
  const [monthly, setMonthly] = useState(false);
  const r = band.base;
  return (
    <section className="card o-6" aria-labelledby="years-h">
      <div className="card-head">
        <h2 id="years-h">{monthly ? 'Month by month' : 'Year by year'}</h2>
        <button type="button" className="btn ghost" onClick={() => setMonthly((m) => !m)}>{monthly ? 'Show years' : 'Show months'}</button>
      </div>
      <div className={`scroll-x${monthly ? ' scroll-y' : ''}`}>
        {monthly ? (
          <table className="data">
            <thead>
              <tr><th>Month</th><th className="num">Cash</th><th className="num">Cumulative</th></tr>
            </thead>
            <tbody>
              {r.months.slice(1).map((m) => (
                <tr key={m.month}>
                  <td>{monthLabel(m.month)}</td>
                  <td className={`num ${m.cash < 0 ? 'neg' : ''}`}>{lakh(m.cash, 2)}</td>
                  <td className="num">{lakh(m.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Year</th>
                <th className="num">Income</th>
                <th className="num">Running costs</th>
                <th className="num"><Term k="ebitda">Profit</Term></th>
                <th className="num">Tax</th>
                <th className="num">Cash</th>
                <th className="num">Cumulative</th>
                <th className="num"><Term k="occupancy">Occupancy</Term></th>
              </tr>
            </thead>
            <tbody>
              {r.years.map((y, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="num">{lakh(y.revenue)}</td>
                  <td className="num">{lakh(y.opex)}</td>
                  <td className={`num ${y.ebitda < 0 ? 'neg' : ''}`}>{lakh(y.ebitda)}</td>
                  <td className="num">{lakh(y.tax)}</td>
                  <td className={`num ${y.cash < 0 ? 'neg' : ''}`}>{lakh(y.cash)}</td>
                  <td className="num">{lakh(y.cumulative)}</td>
                  <td className="num">{pct(y.occupancy, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function BuildCard({ band }: { band: Band }) {
  const { capex } = band.base;
  return (
    <section className="card o-7" aria-labelledby="build-h">
      <div className="card-head">
        <h2 id="build-h"><Term k="totalCash">Cash to put in</Term></h2>
        <span className="card-note num">{lakh(capex.total)} in all</span>
      </div>
      <table className="data">
        <tbody>
          {capex.items.map((i) => (
            <tr key={i.label}>
              <td style={{ whiteSpace: 'normal' }}>{i.label}</td>
              <td className="num">{lakh(i.amount, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
