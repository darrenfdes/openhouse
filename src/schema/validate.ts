// The openhouse/v1 format as a schema, and `validate`, the one way a plan gets into the app.
import { DEFAULT_PLAN, DEFAULT_ROOM, DEFAULT_SUBLEASE } from './defaults';
import { arr, bool, check, lit, num, obj, oneOf, str, strip, type Ctx, type Issue, type Node } from './kit';
import {
  BUILD_GROUPS, COST_LINES, FORMAT, OPERATORS, PAYERS, RENT_MODES, SEASONS, SECTION_TYPES, SUBLEASE_KINDS, type Plan,
} from './plan';

const money = (label: string, o = {}) => num(label, { min: 0, ...o });
const share = (label: string) => num(label, { min: 0, max: 1 });
const months = (label: string) => num(label, { min: 0, max: 120, int: true });
const bySeason = (label: string, n: (l: string) => Node) =>
  obj(label, Object.fromEntries(SEASONS.map((s) => [s, n(`${label}, ${s}`)])));

const card = (label: string, extra: Record<string, Node> = {}) =>
  obj(label, {
    on: bool(`${label}: on`),
    sectionId: str(`${label}: section`),
    build: money(`${label}: build cost`),
    monthly: money(`${label}: monthly running cost`),
    ...extra,
  });

export const PLAN_SCHEMA = obj('Plan', {
  format: lit('Format', FORMAT),
  name: str('Plan name', { req: 'Give the plan a name (plan name is required).', nonEmpty: true }),
  label: str('Plan description', { opt: true }),
  guess: bool('Untested guesses', { opt: true }),
  seasons: arr('Seasons by month', oneOf('Season', SEASONS), { len: 12 }),
  sections: arr(
    'Sections',
    obj('Section', {
      id: str('Section id', { req: 'Each section needs an id.', nonEmpty: true }),
      name: str('Section name', { req: 'Each section needs a name.', nonEmpty: true }),
      type: oneOf('Section type', SECTION_TYPES, { req: `Each section needs a type: indoor, outdoor, terrace or roof.` }),
      areaM2: num('Section area (m²)', { min: 0, req: 'Each section needs an area in square metres.' }),
      parentId: str('Parent section', { opt: true }),
      note: str('Section note', { opt: true }),
    }),
    { min: 1, minMessage: 'Add at least one section (a part of the property, with its area).', req: 'Add at least one section (a part of the property, with its area).' },
  ),
  lease: obj(
    'Lease',
    {
      years: num('Lease length', { min: 1, max: 30, int: true, req: 'Lease length (in whole years) is required.' }),
      startMonth: num('Start month', { min: 1, max: 12, int: true }),
      fitoutMonths: months('Fit-out months'),
      rentSteps: arr(
        'Rent steps',
        obj('Rent step', {
          fromYear: num('Rent step: from year', { min: 1, int: true, req: 'Each rent step needs a "fromYear".' }),
          toYear: num('Rent step: to year', { min: 1, int: true, req: 'Each rent step needs a "toYear".' }),
          monthly: money('Rent step: monthly rent', { req: 'Each rent step needs a monthly rent in rupees.' }),
        }),
        { min: 1, minMessage: 'Monthly rent is required: add at least one rent step.', req: 'Monthly rent is required: add at least one rent step.' },
      ),
      rentFreeMonths: months('Rent-free months'),
      depositMonths: months('Deposit months'),
      walkAwayYear: num('Walk-away year', { min: 1, max: 30, int: true, opt: true }),
    },
    { req: 'Lease details are required: length and rent.' },
  ),
  operator: obj('Operator', {
    kind: oneOf('Operator', OPERATORS),
    bookingShare: share('Share of bookings through booking sites'),
    bookingFee: share('Booking-site fee'),
    stayvista: obj('StayVista terms', {
      commission: share('StayVista commission'),
      gst: share('GST on stays'),
      rates: bySeason('StayVista nightly rate', (l) => money(l)),
      occupancy: bySeason('StayVista occupancy', share),
      seasons: arr('Seasons StayVista lists the villa', oneOf('Season', SEASONS)),
    }),
  }),
  rooms: arr(
    'Rooms',
    obj('Room type', {
      id: str('Room id'),
      name: str('Room name'),
      count: num('Number of rooms', { min: 0, max: 200, int: true }),
      rate: money('Nightly rate'),
      areaM2: num('Room area (m²)', { min: 0 }),
      sectionId: str('Room section'),
    }),
    { item: DEFAULT_ROOM },
  ),
  stays: obj('Stays', {
    peakPremium: num('Peak price premium', { min: 0, max: 5 }),
    lowDiscount: share('Low and monsoon discount'),
    occupancy: bySeason('Occupancy', share),
    nomadRooms: num('Monsoon long-stay rooms', { min: 0, int: true }),
    nomadMonthly: money('Monsoon long-stay monthly rate'),
    nomadBookingShare: share('Share of long stays through booking sites'),
    guestsPerRoom: num('Guests per room', { min: 0, max: 10 }),
    breakfastCost: money('Breakfast cost per guest'),
    roomVarCost: money('Cleaning and supplies per room night'),
  }),
  cards: obj('Cards', {
    cafe: obj('Café', {
      on: bool('Café: on'),
      sectionId: str('Café: section'),
      areaM2: num('Café: area (m²)', { min: 0 }),
      build: money('Café: build cost'),
      covers: bySeason('Café covers a day', (l) => num(l, { min: 0 })),
      ticket: money('Café: average bill'),
      foodCost: share('Café: food cost'),
      cookPay: money('Café: cook pay'),
      helperPay: money('Café: kitchen helper pay'),
      serverPay: money('Café: server pay'),
    }),
    cowork: obj('Co-working', {
      on: bool('Co-working: on'),
      sectionId: str('Co-working: section'),
      areaM2: num('Co-working: area (m²)', { min: 0 }),
      build: money('Co-working: build cost'),
      monthly: money('Co-working: monthly income'),
    }),
    pool: card('Pool', { areaM2: num('Pool: area (m²)', { min: 0 }), rateLift: num('Pool: lift on nightly rates', { min: 0, max: 2 }) }),
    powerBackup: card('Power backup'),
    kitchen: card('Kitchen and catering'),
  }),
  costs: obj('Running costs', {
    housekeepers: num('Housekeepers', { min: 0, int: true }),
    housekeeperPay: money('Housekeeper pay'),
    caretakerPay: money('Caretaker pay'),
    staffWelfare: money('Staff welfare'),
    bonusRate: share('Bonus rate'),
    partnerSalary: money('Partner salary'),
    utilities: money('Utilities'),
    utilitiesFixedShare: share('Fixed share of utilities'),
    other: money('Other fixed costs'),
    paidBy: obj('Paid by', Object.fromEntries(COST_LINES.map((l) => [l, oneOf(`Paid by (${l})`, PAYERS)]))),
  }),
  build: obj('Build', {
    construction: money('Construction'),
    constructionContingency: share('Construction contingency'),
    constructionOverrun: num('Construction overrun', { min: 0, max: 5 }),
    bathPerRoom: money('Bathroom fixtures per room'),
    furnishPerRoom: money('Furnishing per room'),
    lines: arr(
      'Other build lines',
      obj('Build line', {
        label: str('Build line: label', { req: 'Each build line needs a label.' }),
        amount: money('Build line: amount', { req: 'Each build line needs an amount in rupees.' }),
        group: oneOf('Build line: group', BUILD_GROUPS),
        sectionId: str('Build line: section', { opt: true }),
      }),
      { item: { label: '', amount: 0, group: 'fit' } },
    ),
    fitContingency: share('Fit-out contingency'),
    budgetOverrun: num('Budget overrun', { min: 0, max: 5 }),
    workingCapital: money('Working capital'),
  }),
  subleases: arr(
    'Subleases',
    obj('Sublease', {
      id: str('Sublease id'),
      name: str('Sublease name'),
      kind: oneOf('Sublease kind', SUBLEASE_KINDS),
      sectionId: str('Sublease section'),
      areaM2: num('Sublease area (m²)', { min: 0 }),
      rentMode: oneOf('Sublease rent mode', RENT_MODES),
      monthlyRent: money('Sublease monthly rent'),
      salesShare: share('Sublease share of sales'),
      monthlySales: money('Tenant monthly sales'),
      startMonth: num('Sublease start month', { min: 1, int: true }),
      rentFreeMonths: months('Tenant rent-free months'),
      yearlyIncrease: num('Sublease yearly increase', { min: 0, max: 1 }),
      depositMonths: months('Tenant deposit months'),
      partnerFitout: money('Partner fit-out contribution'),
      leavesAfterYear: num('Tenant leaves after year', { min: 1, int: true, opt: true }),
      voidMonths: months('Empty months before the next tenant'),
    }),
    { item: DEFAULT_SUBLEASE },
  ),
  partners: obj('Partners', {
    count: num('Number of partners', { min: 1, max: 20, int: true }),
    shares: arr('Partner shares', share('Partner share')),
  }),
  assumptions: obj('Assumptions', {
    inflation: num('Inflation on costs', { min: -0.5, max: 1 }),
    payRise: num('Yearly pay rise', { min: -0.5, max: 1 }),
    taxRate: share('Tax rate'),
    ramp: arr('Occupancy ramp', share('Ramp factor'), { len: 3 }),
  }),
});

export interface Validation {
  ok: boolean;
  plan: Plan | null;
  errors: Issue[];
  warnings: string[];
  /** Fields that were missing and filled from defaults. */
  filled: string[];
}

/** Checks a parsed openhouse/v1 value. Nothing loads unless `ok`. */
export function validate(input: unknown): Validation {
  const ctx: Ctx = { errors: [], warnings: [], filled: [] };
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, plan: null, errors: [{ path: '', message: 'This is not an openhouse/v1 plan: expected a JSON object.' }], warnings: [], filled: [] };
  }
  const plan = check(PLAN_SCHEMA, input, DEFAULT_PLAN, '', ctx) as Plan;
  if (!ctx.errors.length) crossCheck(plan, ctx);
  const ok = ctx.errors.length === 0;
  return { ok, plan: ok ? plan : null, errors: ctx.errors, warnings: ctx.warnings, filled: ctx.filled };
}

/** Rules that span fields: references between sections, rooms and subleases; partner shares. */
function crossCheck(plan: Plan, ctx: Ctx) {
  const ids = new Set<string>();
  plan.sections.forEach((s, i) => {
    if (ids.has(s.id)) ctx.errors.push({ path: `sections[${i}].id`, message: `Two sections share the id "${s.id}".` });
    ids.add(s.id);
  });
  plan.sections.forEach((s, i) => {
    if (s.parentId !== undefined && !ids.has(s.parentId))
      ctx.errors.push({ path: `sections[${i}].parentId`, message: `Section "${s.name}" sits inside "${s.parentId}", which is not a section in this plan.` });
  });
  // Placements filled from defaults point at the default property's sections; move them to the
  // plan's first section instead.
  const wasFilled = (path: string) => ctx.filled.some((f) => path === f || path.startsWith(`${f}.`) || path.startsWith(`${f}[`));
  const home = plan.sections[0].id;
  const rehome = <T extends { sectionId?: string }>(path: string, x: T) => {
    if (wasFilled(path) && x.sectionId !== undefined && !ids.has(x.sectionId)) x.sectionId = home;
  };
  plan.rooms.forEach((r, i) => rehome(`rooms[${i}].sectionId`, r));
  for (const [key, c] of Object.entries(plan.cards)) rehome(`cards.${key}.sectionId`, c);
  plan.build.lines.forEach((l, i) => rehome(`build.lines[${i}].sectionId`, l));

  const place = (path: string, what: string, sectionId: string) => {
    if (!sectionId) ctx.errors.push({ path, message: `${what} must say which section it sits in.` });
    else if (!ids.has(sectionId)) ctx.errors.push({ path, message: `${what} sits in "${sectionId}", which is not a section in this plan.` });
  };
  plan.rooms.forEach((r, i) => {
    if (!r.id || r.id === DEFAULT_ROOM.id) r.id = `room-${i + 1}`;
    place(`rooms[${i}].sectionId`, `Room type "${r.name}"`, r.sectionId);
  });
  plan.subleases.forEach((s, i) => {
    if (!s.id || s.id === DEFAULT_SUBLEASE.id) s.id = `sublease-${i + 1}`;
    place(`subleases[${i}].sectionId`, `Sublease "${s.name}"`, s.sectionId);
  });
  for (const [key, c] of Object.entries(plan.cards)) if (c.on) place(`cards.${key}.sectionId`, `The ${key} card`, c.sectionId);
  plan.build.lines.forEach((l, i) => {
    if (l.sectionId !== undefined && !ids.has(l.sectionId)) place(`build.lines[${i}].sectionId`, `Build line "${l.label}"`, l.sectionId);
  });

  const { years, walkAwayYear, rentSteps } = plan.lease;
  if (walkAwayYear !== undefined && walkAwayYear > years)
    ctx.errors.push({ path: 'lease.walkAwayYear', message: `Walk-away year (${walkAwayYear}) is after the lease ends (year ${years}).` });
  rentSteps.forEach((s, i) => {
    if (s.toYear < s.fromYear) ctx.errors.push({ path: `lease.rentSteps[${i}]`, message: `Rent step ${i + 1} ends (year ${s.toYear}) before it starts (year ${s.fromYear}).` });
    const clash = rentSteps.findIndex((o, j) => j < i && s.fromYear <= o.toYear && o.fromYear <= s.toYear);
    if (clash >= 0) ctx.errors.push({ path: `lease.rentSteps[${i}]`, message: `Rent steps ${clash + 1} and ${i + 1} both cover some of the same years.` });
  });
  for (let y = 1; y <= years; y++) {
    if (!rentSteps.some((s) => y >= s.fromYear && y <= s.toYear)) ctx.warnings.push(`No rent step covers year ${y}; rent is 0 that year.`);
  }

  const p = plan.partners;
  if (ctx.filled.includes('partners.shares') || ctx.filled.includes('partners')) p.shares = Array.from({ length: p.count }, () => 1 / p.count);
  else if (p.shares.length !== p.count) ctx.errors.push({ path: 'partners.shares', message: `There are ${p.count} partners but ${p.shares.length} shares.` });
  else if (Math.abs(p.shares.reduce((t, s) => t + s, 0) - 1) > 1e-6) ctx.errors.push({ path: 'partners.shares', message: 'Partner shares must add up to 100%.' });
}

/** The plan with every default-valued field removed (share links). `validate` fills them back. */
export function stripDefaults(plan: Plan): Partial<Plan> {
  return strip(PLAN_SCHEMA, plan, DEFAULT_PLAN) as Partial<Plan>;
}
