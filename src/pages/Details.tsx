// Advanced mode: every field of the plan, one settings section per part.
import { useEffect, type ReactNode } from 'react';
import { NumberField, SelectField, TextField } from '../components/fields';
import { Term } from '../components/Term';
import { setLeaseYears, setPartners } from '../lib/easy';
import { setIn } from '../lib/edit';
import type { TermKey } from '../lib/glossary';
import { DEFAULT_ROOM, DEFAULT_SUBLEASE } from '../schema/defaults';
import {
  COST_LINES, OPERATORS, PAYERS, RENT_MODES, SEASONS, SECTION_TYPES, SUBLEASE_KINDS, type BuildGroup, type Plan, type Season,
} from '../schema/plan';
import { autoEscalate, rentInYear } from '../schema/rentSteps';
import { useProject, useSelected, useStore } from '../state/store';

type Path = (string | number)[];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const opts = <T extends string>(values: readonly T[], label: (v: T) => string = cap) => values.map((v) => ({ value: v, label: label(v) }));

function getIn(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o as Record<string | number, unknown>)?.[k], obj);
}

function Set({ id, title, desc, term, children }: { id: string; title: string; desc: string; term?: TermKey; children: ReactNode }) {
  return (
    <section className="set" id={id} aria-labelledby={`${id}-h`}>
      <div>
        <h2 id={`${id}-h`}>{term ? <Term k={term}>{title}</Term> : title}</h2>
        <p className="set-desc">{desc}</p>
      </div>
      <div className="set-panel">{children}</div>
    </section>
  );
}

export function Details() {
  const { dispatch, state } = useStore();
  const { id, plan } = useSelected();
  const project = useProject();
  const planCount = state.plans.filter((p) => p.projectId === project.id).length;
  const set = (next: Plan) => dispatch({ type: 'update', id, plan: next });
  const put = (path: Path, v: unknown) => set(setIn(plan, path, v));
  const num = (path: Path, label: ReactNode, unit?: Parameters<typeof NumberField>[0]['unit'], min = 0, max?: number) => (
    <NumberField key={path.join('.')} label={label} value={getIn(plan, path) as number} unit={unit} min={min} max={max} onChange={(v) => put(path, v)} />
  );
  const sectionOpts = plan.sections.map((s) => ({ value: s.id, label: s.name }));
  const seasonFields = (path: Path, unit: 'pct' | 'rs' | 'count', label: (s: Season) => string) => (
    <div className="fields">{SEASONS.map((s) => num([...path, s], label(s), unit, 0, unit === 'pct' ? 1 : undefined))}</div>
  );

  // Jump to a section picked on the block diagram.
  useEffect(() => {
    const el = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    el?.scrollIntoView({ block: 'center' });
  }, []);

  const steps = plan.lease.rentSteps;
  const firstRent = rentInYear(steps, 1);

  return (
    <div className="settings">
      <div className="title-row">
        <div>
          <h1>All settings</h1>
          <p className="finding muted">{plan.name}. Changes apply as you make them.</p>
        </div>
      </div>

      <Set id="project" title="Project" desc="The property this plan belongs to. Every plan in a project shares its name and place.">
        <div className="fields">
          <TextField label="Project name" value={project.name} onChange={(v) => dispatch({ type: 'updateProject', id: project.id, name: v, place: project.place })} />
          <TextField label="Place" value={project.place} onChange={(v) => dispatch({ type: 'updateProject', id: project.id, name: project.name, place: v })} />
        </div>
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn" disabled={state.projects.length <= 1} onClick={() => window.confirm(`Delete ${project.name} and its ${planCount} ${planCount === 1 ? 'plan' : 'plans'}? This cannot be undone.`) && dispatch({ type: 'removeProject', id: project.id })}>Delete project</button>
        </div>
      </Set>

      <Set id="plan" title="Plan" desc="Its name and a line on what it is." term="plan">
        <div className="fields">
          <TextField label="Name" value={plan.name} onChange={(v) => put(['name'], v)} />
          <TextField label="Description" value={plan.label ?? ''} onChange={(v) => put(['label'], v)} />
        </div>
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn" onClick={() => put(['guess'], !plan.guess)}>{plan.guess ? 'Numbers are checked' : 'Mark as untested guesses'}</button>
          <button type="button" className="btn" disabled={planCount <= 1} onClick={() => window.confirm(`Delete ${plan.name}? This cannot be undone.`) && dispatch({ type: 'remove', id })}>Delete plan</button>
        </div>
      </Set>

      <Set id="sections" title="Sections" desc="The parts of the property and their areas. Rooms, cards and tenants each sit in one. Shared costs are split by area." term="section">
        {plan.sections.map((s, i) => (
          <div className="item" key={s.id} id={`section-${s.id}`}>
            <div className="item-head">
              <strong>{s.name || 'Section'}</strong>
              <button type="button" className="btn ghost" disabled={plan.sections.length <= 1} onClick={() => set({ ...plan, sections: plan.sections.filter((_, j) => j !== i) })}>Remove</button>
            </div>
            <div className="fields">
              <TextField label="Name" value={s.name} onChange={(v) => put(['sections', i, 'name'], v)} />
              <SelectField label="Type" value={s.type} options={opts(SECTION_TYPES)} onChange={(v) => put(['sections', i, 'type'], v)} />
              {num(['sections', i, 'areaM2'], 'Area', 'm2')}
              <SelectField label="Inside" value={s.parentId ?? ''} options={[{ value: '', label: 'Nothing (top level)' }, ...sectionOpts.filter((o) => o.value !== s.id)]} onChange={(v) => {
                const next = { ...plan.sections[i] };
                if (v) next.parentId = v;
                else delete next.parentId;
                set({ ...plan, sections: plan.sections.map((x, j) => (j === i ? next : x)) });
              }} />
              <TextField label="Note" value={s.note ?? ''} onChange={(v) => put(['sections', i, 'note'], v)} />
            </div>
          </div>
        ))}
        <div><button type="button" className="btn" onClick={() => set({ ...plan, sections: [...plan.sections, { id: `section-${Date.now().toString(36)}`, name: 'New section', type: 'indoor', areaM2: 50 }] })}>Add section</button></div>
      </Set>

      <Set id="lease" title="Lease" desc="How long, what rent each year, and the months before guests arrive." term="rentSteps">
        <div className="fields">
          <NumberField label="Lease length" unit="years" value={plan.lease.years} min={1} max={30} onChange={(v) => set(setLeaseYears(plan, Math.round(v)))} />
          <SelectField label="Starts in" value={String(plan.lease.startMonth)} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={(v) => put(['lease', 'startMonth'], Number(v))} />
          {num(['lease', 'fitoutMonths'], <Term k="fitoutMonths">Fit-out months</Term>, 'months', 0, 60)}
          {num(['lease', 'rentFreeMonths'], <Term k="rentFree">Rent-free months</Term>, 'months', 0, 60)}
          {num(['lease', 'depositMonths'], <Term k="deposit">Deposit</Term>, 'months', 0, 24)}
          <SelectField label={<Term k="walkAway">Walk away after</Term>} value={String(plan.lease.walkAwayYear ?? '')} options={[{ value: '', label: 'Stay the full lease' }, ...Array.from({ length: plan.lease.years - 1 }, (_, i) => ({ value: String(i + 1), label: `Year ${i + 1}` }))]} onChange={(v) => {
            const lease = { ...plan.lease };
            if (v) lease.walkAwayYear = Number(v);
            else delete lease.walkAwayYear;
            set({ ...plan, lease });
          }} />
        </div>
        {steps.map((_, i) => (
          <div className="item" key={i}>
            <div className="item-head">
              <strong>Rent step {i + 1}</strong>
              <button type="button" className="btn ghost" disabled={steps.length <= 1} onClick={() => put(['lease', 'rentSteps'], steps.filter((_, j) => j !== i))}>Remove</button>
            </div>
            <div className="fields">
              {num(['lease', 'rentSteps', i, 'fromYear'], 'From year', 'count', 1, plan.lease.years)}
              {num(['lease', 'rentSteps', i, 'toYear'], 'To year', 'count', 1, plan.lease.years)}
              {num(['lease', 'rentSteps', i, 'monthly'], 'Monthly rent', 'rs')}
            </div>
          </div>
        ))}
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn" onClick={() => {
            const last = steps[steps.length - 1];
            if (last.toYear >= plan.lease.years) return;
            put(['lease', 'rentSteps'], [...steps, { fromYear: last.toYear + 1, toYear: plan.lease.years, monthly: last.monthly }]);
          }}>Add rent step</button>
          <button type="button" className="btn" onClick={() => put(['lease', 'rentSteps'], autoEscalate({ base: firstRent, flatYears: 3, rate: 0.05, years: plan.lease.years }))}>Auto-escalate: 5% a year after 3 flat years</button>
        </div>
      </Set>

      <Set id="operator" title="Who runs stays" desc="Run it yourselves with booking sites, hand the whole villa to StayVista, or mix the two by season." term="operator">
        <div className="fields">
          <SelectField label="Operator" value={plan.operator.kind} options={opts(OPERATORS, (v) => ({ self: 'Ourselves', stayvista: 'StayVista', mixed: 'Mixed by season' })[v])} onChange={(v) => put(['operator', 'kind'], v)} />
          {num(['operator', 'bookingShare'], 'Bookings through booking sites', 'pct', 0, 1)}
          {num(['operator', 'bookingFee'], <Term k="bookingFee">Booking-site fee</Term>, 'pct', 0, 1)}
          {num(['operator', 'stayvista', 'commission'], <Term k="commission">StayVista commission</Term>, 'pct', 0, 1)}
          {num(['operator', 'stayvista', 'gst'], 'GST on stays', 'pct', 0, 1)}
        </div>
        <strong>StayVista whole-villa rate a night, including GST</strong>
        {seasonFields(['operator', 'stayvista', 'rates'], 'rs', cap)}
        <strong>StayVista occupancy</strong>
        {seasonFields(['operator', 'stayvista', 'occupancy'], 'pct', cap)}
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label">Mixed: seasons StayVista lists the villa</legend>
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            {SEASONS.map((s) => (
              <label key={s} className="field-unit" style={{ gap: 6 }}>
                <input type="checkbox" checked={plan.operator.stayvista.seasons.includes(s)} onChange={(e) => put(['operator', 'stayvista', 'seasons'], e.target.checked ? [...plan.operator.stayvista.seasons, s] : plan.operator.stayvista.seasons.filter((x) => x !== s))} />
                {cap(s)}
              </label>
            ))}
          </div>
        </fieldset>
      </Set>

      <Set id="rooms" title="Rooms" desc="Each kind of room, how many, the shoulder-season rate and where it sits.">
        {plan.rooms.map((r, i) => (
          <div className="item" key={r.id}>
            <div className="item-head">
              <strong>{r.name}</strong>
              <button type="button" className="btn ghost" onClick={() => set({ ...plan, rooms: plan.rooms.filter((_, j) => j !== i) })}>Remove</button>
            </div>
            <div className="fields">
              <TextField label="Name" value={r.name} onChange={(v) => put(['rooms', i, 'name'], v)} />
              {num(['rooms', i, 'count'], 'Rooms', 'count', 0, 200)}
              {num(['rooms', i, 'rate'], 'Nightly rate', 'rs')}
              {num(['rooms', i, 'areaM2'], 'Area each', 'm2')}
              <SelectField label="Section" value={r.sectionId} options={sectionOpts} onChange={(v) => put(['rooms', i, 'sectionId'], v)} />
            </div>
          </div>
        ))}
        <div><button type="button" className="btn" onClick={() => set({ ...plan, rooms: [...plan.rooms, { ...DEFAULT_ROOM, id: `room-${Date.now().toString(36)}`, name: 'New rooms', sectionId: plan.sections[0].id }] })}>Add room type</button></div>
      </Set>

      <Set id="stays" title="Stays" desc="Self-run occupancy by season, price swings, monsoon long stays and what each guest costs." term="occupancy">
        {seasonFields(['stays', 'occupancy'], 'pct', (s) => `Occupancy, ${s}`)}
        <div className="fields">
          {num(['stays', 'peakPremium'], 'Peak price premium', 'pct', 0, 5)}
          {num(['stays', 'lowDiscount'], 'Low and monsoon discount', 'pct', 0, 1)}
          {num(['stays', 'nomadRooms'], 'Monsoon long-stay rooms', 'count')}
          {num(['stays', 'nomadMonthly'], 'Long-stay rate a month', 'rs')}
          {num(['stays', 'nomadBookingShare'], 'Long stays through booking sites', 'pct', 0, 1)}
          {num(['stays', 'guestsPerRoom'], 'Guests per room', 'count', 0, 10)}
          {num(['stays', 'breakfastCost'], 'Breakfast per guest', 'rs')}
          {num(['stays', 'roomVarCost'], 'Cleaning and supplies a night', 'rs')}
        </div>
      </Set>

      <Set id="cards" title="Cards" desc="What each card costs to build and run, what it earns, and where it sits." term="card">
        {(['cafe', 'cowork', 'pool', 'powerBackup', 'kitchen'] as const).map((k) => {
          const c = plan.cards[k];
          const title = { cafe: 'Café, run by us', cowork: 'Co-working', pool: 'Pool', powerBackup: 'Power backup', kitchen: 'Kitchen and catering' }[k];
          return (
            <div className="item" key={k}>
              <div className="item-head">
                <strong>{title}</strong>
                <label className="field-unit"><input type="checkbox" role="switch" className="switch" checked={c.on} onChange={(e) => put(['cards', k, 'on'], e.target.checked)} /> <span>{c.on ? 'On' : 'Off'}</span></label>
              </div>
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
              {k === 'cafe' && seasonFields(['cards', 'cafe', 'covers'], 'count', (s) => `Covers a day, ${s}`)}
            </div>
          );
        })}
      </Set>

      <Set id="costs" title="Running costs" desc="Monthly costs in today’s money. Pay rises yearly; other costs follow inflation. Choose who pays each line." term="paidBy">
        <div className="fields">
          {num(['costs', 'housekeepers'], 'Housekeepers', 'count')}
          {num(['costs', 'housekeeperPay'], 'Housekeeper pay', 'rs')}
          {num(['costs', 'caretakerPay'], 'Caretaker pay', 'rs')}
          {num(['costs', 'staffWelfare'], 'Staff welfare', 'rs')}
          {num(['costs', 'bonusRate'], 'Bonus', 'pct', 0, 1)}
          {num(['costs', 'partnerSalary'], 'Partner salary', 'rs')}
          {num(['costs', 'utilities'], 'Utilities', 'rs')}
          {num(['costs', 'utilitiesFixedShare'], 'Utilities that do not move with guests', 'pct', 0, 1)}
          {num(['costs', 'other'], 'Repairs and other fixed costs', 'rs')}
        </div>
        <div className="fields">
          {COST_LINES.map((l) => (
            <SelectField key={l} label={`Paid by: ${({ housekeeping: 'housekeeping', caretaker: 'caretaker', guestCosts: 'breakfast and supplies', partnerSalary: 'partner salary', utilities: 'utilities', other: 'repairs and other' })[l]}`} value={plan.costs.paidBy[l]} options={opts(PAYERS, (v) => (v === 'partners' ? 'Partners' : 'Operator'))} onChange={(v) => put(['costs', 'paidBy', l], v)} />
          ))}
        </div>
      </Set>

      <Set id="build" title="Build" desc="What it costs to get the house ready. Everything but the deposit and buffer is written off over the lease." term="fitout">
        <div className="fields">
          {num(['build', 'construction'], 'Construction', 'rs')}
          {num(['build', 'constructionContingency'], 'Construction contingency', 'pct', 0, 1)}
          {num(['build', 'constructionOverrun'], 'Construction overrun', 'pct', 0, 5)}
          {num(['build', 'bathPerRoom'], 'Bathroom fixtures per room', 'rs')}
          {num(['build', 'furnishPerRoom'], 'Furnishing per room', 'rs')}
          {num(['build', 'fitContingency'], 'Fit-out contingency', 'pct', 0, 1)}
          {num(['build', 'budgetOverrun'], 'Whole-budget overrun', 'pct', 0, 5)}
          {num(['build', 'workingCapital'], <Term k="workingCapital">Working capital</Term>, 'rs')}
        </div>
        {plan.build.lines.map((l, i) => (
          <div className="item" key={i}>
            <div className="item-head">
              <strong>{l.label || 'Build line'}</strong>
              <button type="button" className="btn ghost" onClick={() => put(['build', 'lines'], plan.build.lines.filter((_, j) => j !== i))}>Remove</button>
            </div>
            <div className="fields">
              <TextField label="What" value={l.label} onChange={(v) => put(['build', 'lines', i, 'label'], v)} />
              {num(['build', 'lines', i, 'amount'], 'Amount', 'rs')}
              <SelectField label="Kind" value={l.group} options={[{ value: 'build' as BuildGroup, label: 'Building work' }, { value: 'fit' as BuildGroup, label: 'Fit-out' }, { value: 'soft' as BuildGroup, label: 'Legal and branding' }]} onChange={(v) => put(['build', 'lines', i, 'group'], v)} />
              <SelectField label="Section" value={l.sectionId ?? ''} options={[{ value: '', label: 'Shared' }, ...sectionOpts]} onChange={(v) => {
                const line = { ...l };
                if (v) line.sectionId = v;
                else delete line.sectionId;
                put(['build', 'lines', i], line);
              }} />
            </div>
          </div>
        ))}
        <div><button type="button" className="btn" onClick={() => put(['build', 'lines'], [...plan.build.lines, { label: 'New line', amount: 100000, group: 'fit' }])}>Add build line</button></div>
      </Set>

      <Set id="subleases" title="Subleases" desc="Tenants who rent part of the property from you. Their rent ends with your lease." term="sublease">
        {plan.subleases.map((s, i) => (
          <div className="item" key={s.id}>
            <div className="item-head">
              <strong>{s.name}</strong>
              <button type="button" className="btn ghost" onClick={() => set({ ...plan, subleases: plan.subleases.filter((_, j) => j !== i) })}>Remove</button>
            </div>
            <div className="fields">
              <TextField label="Name" value={s.name} onChange={(v) => put(['subleases', i, 'name'], v)} />
              <SelectField label="Kind" value={s.kind} options={opts(SUBLEASE_KINDS, (v) => (v === 'cafe' ? 'Café' : cap(v)))} onChange={(v) => put(['subleases', i, 'kind'], v)} />
              <SelectField label="Section" value={s.sectionId} options={sectionOpts} onChange={(v) => put(['subleases', i, 'sectionId'], v)} />
              {num(['subleases', i, 'areaM2'], 'Area', 'm2')}
              <SelectField label="Rent" value={s.rentMode} options={opts(RENT_MODES, (v) => ({ fixed: 'Fixed', share: 'Share of sales', max: 'Higher of minimum and share' })[v])} onChange={(v) => put(['subleases', i, 'rentMode'], v)} />
              {num(['subleases', i, 'monthlyRent'], s.rentMode === 'max' ? 'Minimum a month' : 'Rent a month', 'rs')}
              {num(['subleases', i, 'salesShare'], 'Share of sales', 'pct', 0, 1)}
              {num(['subleases', i, 'monthlySales'], 'Tenant sales a month', 'rs')}
              {num(['subleases', i, 'startMonth'], 'Starts in lease month', 'count', 1, plan.lease.years * 12)}
              {num(['subleases', i, 'rentFreeMonths'], 'Rent-free months', 'months', 0, 60)}
              {num(['subleases', i, 'yearlyIncrease'], 'Yearly increase', 'pct', 0, 1)}
              {num(['subleases', i, 'depositMonths'], 'Tenant deposit', 'months', 0, 24)}
              {num(['subleases', i, 'partnerFitout'], 'Our fit-out contribution', 'rs')}
              <SelectField label="Tenant leaves after" value={String(s.leavesAfterYear ?? '')} options={[{ value: '', label: 'Stays to the end' }, ...Array.from({ length: Math.max(0, plan.lease.years - 1) }, (_, y) => ({ value: String(y + 1), label: `Year ${y + 1}` }))]} onChange={(v) => {
                const next = { ...s };
                if (v) next.leavesAfterYear = Number(v);
                else delete next.leavesAfterYear;
                put(['subleases', i], next);
              }} />
              {num(['subleases', i, 'voidMonths'], 'Empty before the next tenant', 'months', 0, 24)}
            </div>
          </div>
        ))}
        <div><button type="button" className="btn" onClick={() => set({ ...plan, subleases: [...plan.subleases, { ...DEFAULT_SUBLEASE, id: `sublease-${Date.now().toString(36)}`, sectionId: plan.sections[0].id, startMonth: plan.lease.fitoutMonths + 1 }] })}>Add sublease</button></div>
      </Set>

      <Set id="partners" title="Partners" desc="Who puts cash in, and their shares. Own cash only: no loans in this version." term="perPartner">
        <div className="fields">
          <NumberField label="Partners" value={plan.partners.count} min={1} max={20} onChange={(v) => set(setPartners(plan, Math.round(v)))} />
          {plan.partners.shares.map((_, i) => num(['partners', 'shares', i], `Partner ${i + 1} share`, 'pct', 0, 1))}
        </div>
        {Math.abs(plan.partners.shares.reduce((t, s) => t + s, 0) - 1) > 1e-6 && <p className="notice" style={{ margin: 0 }}>Shares add up to {Math.round(plan.partners.shares.reduce((t, s) => t + s, 0) * 1000) / 10}%, not 100%.</p>}
      </Set>

      <Set id="assumptions" title="Assumptions" desc="Inflation, pay rises, tax and how fast guests come in the first two years.">
        <div className="fields">
          {num(['assumptions', 'inflation'], 'Inflation on costs and prices', 'pct', -0.5, 1)}
          {num(['assumptions', 'payRise'], 'Yearly pay rise', 'pct', -0.5, 1)}
          {num(['assumptions', 'taxRate'], 'Tax on profit', 'pct', 0, 1)}
          {num(['assumptions', 'ramp', 0], 'Occupancy factor, months 1-6', 'pct', 0, 1)}
          {num(['assumptions', 'ramp', 1], 'Months 7-12', 'pct', 0, 1)}
          {num(['assumptions', 'ramp', 2], 'Months 13-24', 'pct', 0, 1)}
        </div>
      </Set>

      <Set id="seasons" title="Seasons" desc="Which season each month falls in. Goa by default: peak December to February, monsoon June to September.">
        <div className="fields">
          {MONTHS.map((m, i) => (
            <SelectField key={m} label={m} value={plan.seasons[i]} options={opts(SEASONS)} onChange={(v) => put(['seasons', i], v)} />
          ))}
        </div>
      </Set>
    </div>
  );
}
