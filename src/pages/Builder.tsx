// The plan builder: make a plan in the UI, in this project or in a new one. It asks for what matters up front;
// everything else starts from the defaults and stays editable in All settings.
import { useMemo, useState, type ReactNode } from 'react';
import { JCurve } from '../components/JCurve';
import { CardEditors, ExtrasEditor } from '../components/Extras';
import { NumberField, SelectField, TextField } from '../components/fields';
import { Term } from '../components/Term';
import { runBand } from '../engine';
import { addSection, removeSection, startFrom, type Start } from '../lib/builder';
import { finding, firstRent, setLeaseYears, setPartners, setRent } from '../lib/easy';
import { setIn } from '../lib/edit';
import { lakh, years } from '../lib/money';
import { navigate } from '../lib/route';
import { SIZES } from '../schema/defaults';
import { OPERATORS, SECTION_TYPES, type OperatorKind, type Plan } from '../schema/plan';
import { autoEscalate } from '../schema/rentSteps';
import { validate } from '../schema/validate';
import { useProject, useSelected, useStore } from '../state/store';

type Path = (string | number)[];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const getIn = (obj: unknown, path: Path): unknown => path.reduce<unknown>((o, k) => (o as Record<string | number, unknown>)?.[k], obj);
const OPERATOR_LABEL: Record<OperatorKind, string> = { self: 'Ourselves', stayvista: 'StayVista', mixed: 'StayVista in peak, us the rest' };

/** Rent rises 5% a year after three flat years, or stays flat for the whole lease. */
const escalates = (p: Plan) => p.lease.rentSteps.length > 1;
function setRentPattern(p: Plan, rising: boolean): Plan {
  const base = firstRent(p);
  const rentSteps = rising ? autoEscalate({ base, flatYears: 3, rate: 0.05, years: p.lease.years }) : [{ fromYear: 1, toYear: p.lease.years, monthly: base }];
  return { ...p, lease: { ...p.lease, rentSteps } };
}

function Step({ n, title, desc, children }: { n: number; title: ReactNode; desc: string; children: ReactNode }) {
  return (
    <section className="step" aria-labelledby={`step-${n}`}>
      <div>
        <h2 id={`step-${n}`}><span className="step-n num">{n}</span>{title}</h2>
        <p className="set-desc">{desc}</p>
      </div>
      <div className="set-panel">{children}</div>
    </section>
  );
}

export function Builder({ newProject }: { newProject: boolean }) {
  const { state, dispatch } = useStore();
  const project = useProject();
  const selected = useSelected();
  const siblings = state.plans.filter((p) => p.projectId === project.id);

  const [projectName, setProjectName] = useState('');
  const [place, setPlace] = useState('');
  const [startKey, setStartKey] = useState(newProject ? 'blank' : 'property');
  const [plan, setPlan] = useState<Plan>(() => startFrom(newProject ? { kind: 'blank' } : { kind: 'property', from: selected.plan }, newProject ? 'First plan' : 'New plan'));
  const put = (path: Path, v: unknown) => setPlan(setIn(plan, path, v));
  const num = (path: Path, label: ReactNode, unit?: Parameters<typeof NumberField>[0]['unit'], min = 0, max?: number) => (
    <NumberField label={label} value={getIn(plan, path) as number} unit={unit} min={min} max={max} onChange={(v) => put(path, v)} />
  );

  const choose = (key: string) => {
    setStartKey(key);
    const from = siblings.find((p) => `copy:${p.id}` === key)?.plan;
    const start: Start = from ? { kind: 'copy', from } : key === 'property' ? { kind: 'property', from: selected.plan } : { kind: 'blank' };
    setPlan(startFrom(start, from ? `${from.name} copy` : plan.name));
  };

  const band = useMemo(() => runBand(plan), [plan]);
  const check = useMemo(() => validate(JSON.parse(JSON.stringify(plan))), [plan]);
  const problems = [
    ...(newProject && !projectName.trim() ? ['Give the project a name.'] : []),
    ...(!plan.name.trim() ? ['Give the plan a name.'] : []),
    ...check.errors.map((e) => e.message),
  ];

  const create = () => {
    if (problems.length) return;
    const p = { ...plan, name: plan.name.trim() };
    dispatch(newProject ? { type: 'addProject', name: projectName, place, plan: p } : { type: 'add', projectId: project.id, plan: p });
    navigate('plan');
  };

  const sectionOpts = plan.sections.map((s) => ({ value: s.id, label: s.name || 'Section' }));
  const { base } = band;
  let n = 0;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>{newProject ? 'New project' : `New plan in ${project.name}`}</h1>
          <p className="finding">
            {newProject
              ? 'A project is one property. Describe it and its first plan; you can add more plans to it later.'
              : 'Fill in what you know. Everything else starts from sensible numbers and can be changed later in All settings.'}
          </p>
        </div>
      </div>

      <div className="builder">
        <div className="steps">
          {newProject && (
            <Step n={++n} title="Project" desc="The property this is about, and where it is.">
              <div className="fields">
                <TextField label="Project name" value={projectName} onChange={setProjectName} />
                <TextField label="Place" value={place} onChange={setPlace} />
              </div>
            </Step>
          )}

          <Step n={++n} title={<Term k="plan">Plan</Term>} desc="Its name, and where to start from.">
            <div className="fields">
              <TextField label="Plan name" value={plan.name} onChange={(v) => put(['name'], v)} />
              {!newProject && (
                <SelectField label="Start from" value={startKey} onChange={choose} options={[
                  { value: 'property', label: `A blank plan on ${project.name}` },
                  ...siblings.map((p) => ({ value: `copy:${p.id}`, label: `A copy of ${p.plan.name}` })),
                ]} />
              )}
            </div>
          </Step>

          <Step n={++n} title={<Term k="section">The property</Term>} desc="Its parts and their areas. Rooms and extras each sit in one; shared costs are split by area.">
            {plan.sections.map((s, i) => (
              <div className="item" key={s.id}>
                <div className="item-head">
                  <strong>{s.name || 'Section'}</strong>
                  <button type="button" className="btn ghost" disabled={plan.sections.length <= 1} onClick={() => setPlan(removeSection(plan, s.id))}>Remove</button>
                </div>
                <div className="fields">
                  <TextField label="Name" value={s.name} onChange={(v) => put(['sections', i, 'name'], v)} />
                  <SelectField label="Type" value={s.type} options={SECTION_TYPES.map((t) => ({ value: t, label: cap(t) }))} onChange={(v) => put(['sections', i, 'type'], v)} />
                  {num(['sections', i, 'areaM2'], 'Area', 'm2')}
                </div>
              </div>
            ))}
            <div><button type="button" className="btn" onClick={() => setPlan(addSection(plan))}>Add section</button></div>
          </Step>

          <Step n={++n} title={<Term k="rentSteps">Lease</Term>} desc="How long, the rent, and the months before the first guest.">
            <div className="fields">
              <NumberField label="Lease length" unit="years" value={plan.lease.years} min={1} max={30} onChange={(v) => setPlan(setRentPattern(setLeaseYears(plan, Math.round(v)), escalates(plan)))} />
              <NumberField label="Rent, first year" unit="rs" value={firstRent(plan)} min={0} onChange={(v) => setPlan(setRent(plan, v))} hint="A month" />
              <SelectField label="Rent after that" value={escalates(plan) ? 'rising' : 'flat'} options={[{ value: 'flat', label: 'Stays the same' }, { value: 'rising', label: 'Rises 5% a year after year 3' }]} onChange={(v) => setPlan(setRentPattern(plan, v === 'rising'))} />
              {num(['lease', 'rentFreeMonths'], <Term k="rentFree">Rent-free months</Term>, 'months', 0, 60)}
              {num(['lease', 'depositMonths'], <Term k="deposit">Deposit</Term>, 'months', 0, 24)}
              {num(['lease', 'fitoutMonths'], <Term k="fitoutMonths">Fit-out months</Term>, 'months', 0, 60)}
            </div>
          </Step>

          <Step n={++n} title={<Term k="operator">Who runs the stays</Term>} desc="Run the rooms yourselves through booking sites, or hand the whole villa to StayVista.">
            <div className="fields">
              <SelectField label="Guest stays run by" value={plan.operator.kind} options={OPERATORS.map((k) => ({ value: k, label: OPERATOR_LABEL[k] }))} onChange={(v) => put(['operator', 'kind'], v)} />
              {plan.operator.kind !== 'stayvista' && num(['operator', 'bookingFee'], <Term k="bookingFee">Booking-site fee</Term>, 'pct', 0, 1)}
              {plan.operator.kind !== 'self' && num(['operator', 'stayvista', 'rates', 'peak'], 'Whole-villa rate, peak night', 'rs')}
              {plan.operator.kind !== 'self' && num(['operator', 'stayvista', 'commission'], <Term k="commission">StayVista commission</Term>, 'pct', 0, 1)}
            </div>
          </Step>

          <Step n={++n} title="Rooms" desc="Each kind of room: how many, the nightly rate in a shoulder month, and where it is.">
            {plan.rooms.map((r, i) => (
              <div className="item" key={r.id}>
                <div className="item-head">
                  <strong>{r.name || 'Rooms'}</strong>
                  <button type="button" className="btn ghost" onClick={() => setPlan({ ...plan, rooms: plan.rooms.filter((_, j) => j !== i) })}>Remove</button>
                </div>
                <div className="fields">
                  <TextField label="Name" value={r.name} onChange={(v) => put(['rooms', i, 'name'], v)} />
                  {num(['rooms', i, 'count'], 'How many', 'count', 0, 100)}
                  {num(['rooms', i, 'rate'], 'Nightly rate', 'rs')}
                  <SelectField label="In" value={r.sectionId} options={sectionOpts} onChange={(v) => put(['rooms', i, 'sectionId'], v)} />
                </div>
              </div>
            ))}
            <div>
              <button type="button" className="btn" onClick={() => setPlan({ ...plan, rooms: [...plan.rooms, { id: `rooms-${plan.rooms.length + 1}-${Date.now().toString(36)}`, name: 'More rooms', count: 2, rate: 5000, areaM2: SIZES.suite, sectionId: plan.sections[0].id }] })}>Add room type</button>
            </div>
          </Step>

          <Step n={++n} title={<Term k="card">Extras</Term>} desc="Switch on what this plan includes and set its costs, or add your own: kayaks, a spa room, bike hire.">
            <CardEditors plan={plan} set={setPlan} onlyWhenOn />
            <ExtrasEditor plan={plan} set={setPlan} />
          </Step>

          <Step n={++n} title={<Term k="totalCash">Money in</Term>} desc="What it costs to open, and who puts it in.">
            <div className="fields">
              {num(['build', 'construction'], <Term k="fitout">Construction budget</Term>, 'rs')}
              {num(['build', 'furnishPerRoom'], 'Furnishing per room', 'rs')}
              {num(['build', 'workingCapital'], <Term k="workingCapital">Working capital</Term>, 'rs')}
              <NumberField label="Partners" value={plan.partners.count} min={1} max={12} onChange={(v) => setPlan(setPartners(plan, Math.round(v)))} />
            </div>
          </Step>

          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn primary" disabled={problems.length > 0} onClick={create}>{newProject ? 'Create project' : 'Create plan'}</button>
            <button type="button" className="btn" onClick={() => window.history.back()}>Cancel</button>
          </div>
        </div>

        <aside className="card preview stack" aria-labelledby="preview-h" aria-live="polite">
          <div>
            <div className="card-head" style={{ marginBottom: 4 }}>
              <h2 id="preview-h">As it stands</h2>
              <span className="card-note">Updates as you type</span>
            </div>
            <p style={{ margin: 0 }}>{finding(band)}</p>
          </div>
          <dl className="preview-kpis">
            <div><dt><Term k="totalCash">Cash to put in</Term></dt><dd className="num">{lakh(base.totalCash)}</dd></div>
            <div><dt><Term k="payback">Payback</Term></dt><dd className="num">{years(base.payback)}</dd></div>
            <div><dt><Term k="endCash">At lease end</Term></dt><dd className={`num ${base.endCash < 0 ? 'neg' : 'pos'}`}>{lakh(base.endCash)}</dd></div>
          </dl>
          <JCurve band={band} height={200} />
          {problems.length > 0 && (
            <ul className="errors">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          <button type="button" className="btn primary" disabled={problems.length > 0} onClick={create}>{newProject ? 'Create project' : 'Create plan'}</button>
        </aside>
      </div>
    </>
  );
}
