// The monthly model, ported from reference/model2.js `run()` and generalised.
// Pure TypeScript: no React, no I/O. All money in rupees.
import type { Plan, Season } from '../schema/plan';
import { rentInYear } from '../schema/rentSteps';

export interface RunOptions {
  /** Multiplies every occupancy (break-even search and the band). */
  occScale?: number;
  /** Multiplies every nightly and monthly room rate (the band). */
  rateScale?: number;
}

export interface CapexItem {
  label: string;
  amount: number;
  group: 'build' | 'fit' | 'soft' | 'cash';
  sectionId?: string;
}

export interface Capex {
  items: CapexItem[];
  depreciable: number;
  deposit: number;
  workingCapital: number;
  total: number;
}

/** Profit before tax attributable to a section (null = shared, split by area later). */
export type SectionLedger = Map<string | null, number>;

export interface Year {
  roomRev: number;
  nomadRev: number;
  cafeRev: number;
  coworkRev: number;
  subleaseRev: number;
  commission: number;
  varCost: number;
  cafeCost: number;
  rent: number;
  staff: number;
  staffKitchen: number;
  staffHousekeeping: number;
  staffCaretaker: number;
  staffWelfare: number;
  partner: number;
  utilities: number;
  other: number;
  cardsRunning: number;
  roomNights: number;
  availNights: number;
  revenue: number;
  opex: number;
  ebitda: number;
  depreciation: number;
  writeOff: number;
  tax: number;
  /** Cash in or out that is not profit: tenant deposits, deposit and working capital back. */
  capitalFlows: number;
  cash: number;
  cumulative: number;
  occupancy: number;
  /** EBITDA by section before shared costs are split. */
  bySection: SectionLedger;
}

export interface MonthPoint {
  /** 0 = the day the cash goes in; 1 = end of the first lease month. */
  month: number;
  cash: number;
  cumulative: number;
}

export interface Result {
  capex: Capex;
  years: Year[];
  months: MonthPoint[];
  /** Years until cumulative cash first turns positive, interpolated within the year. */
  payback: number | null;
  irr: number | null;
  /** Net cash at the end of the lease (or the walk-away year). */
  endCash: number;
  /** Cash the partners put in before opening. */
  totalCash: number;
  /** Lowest point of the J-curve: the most cash at risk at any moment. */
  lowestCash: number;
  perPartner: number[];
}

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function rampFactor(plan: Plan, op: number): number {
  const [a, b, c] = plan.assumptions.ramp;
  return op <= 6 ? a : op <= 12 ? b : op <= 24 ? c : 1;
}

export function roomCount(plan: Plan): number {
  return plan.rooms.reduce((t, r) => t + r.count, 0);
}

export function capex(plan: Plan): Capex {
  const { build, cards } = plan;
  const constr = build.construction * (1 + build.constructionOverrun);
  const lines: CapexItem[] = [{ label: 'Construction to finish the building', amount: constr, group: 'build' }];
  if (build.constructionContingency)
    lines.push({ label: `Construction contingency (${Math.round(build.constructionContingency * 100)}%)`, amount: constr * build.constructionContingency, group: 'build' });
  const fit: CapexItem[] = [];
  // Per-room lines go to each room type's section.
  for (const r of plan.rooms) {
    if (build.bathPerRoom * r.count) fit.push({ label: `Bathrooms, ${r.name}`, amount: build.bathPerRoom * r.count, group: 'fit', sectionId: r.sectionId });
  }
  for (const r of plan.rooms) {
    if (build.furnishPerRoom * r.count) fit.push({ label: `Furnishing, ${r.name}`, amount: build.furnishPerRoom * r.count, group: 'fit', sectionId: r.sectionId });
  }
  if (cards.cafe.on) fit.push({ label: 'Café kitchen, counter, furniture', amount: cards.cafe.build, group: 'fit', sectionId: cards.cafe.sectionId });
  if (cards.cowork.on) fit.push({ label: 'Co-working desks and Wi-Fi', amount: cards.cowork.build, group: 'fit', sectionId: cards.cowork.sectionId });
  if (cards.pool.on) fit.push({ label: 'Pool', amount: cards.pool.build, group: 'fit', sectionId: cards.pool.sectionId });
  if (cards.powerBackup.on) fit.push({ label: 'Power backup (generator and inverter)', amount: cards.powerBackup.build, group: 'fit', sectionId: cards.powerBackup.sectionId });
  if (cards.kitchen.on) fit.push({ label: 'Kitchen and catering', amount: cards.kitchen.build, group: 'fit', sectionId: cards.kitchen.sectionId });
  for (const s of plan.subleases) {
    if (s.partnerFitout) fit.push({ label: `Fit-out for ${s.name}`, amount: s.partnerFitout, group: 'fit', sectionId: s.sectionId });
  }
  for (const l of build.lines.filter((l) => l.group !== 'soft')) {
    (l.group === 'fit' ? fit : lines).push({ ...l });
  }
  lines.push(...fit);
  if (build.fitContingency)
    lines.push({ label: `Fit-out contingency (${Math.round(build.fitContingency * 100)}%)`, amount: fit.reduce((t, i) => t + i.amount, 0) * build.fitContingency, group: 'fit' });
  for (const l of build.lines.filter((l) => l.group === 'soft')) lines.push({ ...l });

  const items = lines.filter((l) => l.amount > 0).map((l) => ({ ...l, amount: l.amount * (1 + build.budgetOverrun) }));
  const depreciable = items.reduce((t, i) => t + i.amount, 0);
  const deposit = rentInYear(plan.lease.rentSteps, 1) * plan.lease.depositMonths;
  items.push({ label: `Security deposit, ${plan.lease.depositMonths} months (refundable)`, amount: deposit, group: 'cash' });
  items.push({ label: 'Working capital buffer', amount: build.workingCapital, group: 'cash' });
  return { items, depreciable, deposit, workingCapital: build.workingCapital, total: depreciable + deposit + build.workingCapital };
}

function emptyYear(): Year {
  return {
    roomRev: 0, nomadRev: 0, cafeRev: 0, coworkRev: 0, subleaseRev: 0,
    commission: 0, varCost: 0, cafeCost: 0, rent: 0, staff: 0,
    staffKitchen: 0, staffHousekeeping: 0, staffCaretaker: 0, staffWelfare: 0, partner: 0,
    utilities: 0, other: 0, cardsRunning: 0, roomNights: 0, availNights: 0,
    revenue: 0, opex: 0, ebitda: 0, depreciation: 0, writeOff: 0, tax: 0, capitalFlows: 0,
    cash: 0, cumulative: 0, occupancy: 0, bySection: new Map(),
  };
}

function book(ledger: SectionLedger, sectionId: string | null, amount: number) {
  ledger.set(sectionId, (ledger.get(sectionId) ?? 0) + amount);
}

/** Monthly rent and deposit flows from one sublease in lease month index `i` (0-based). */
function subleaseMonth(s: Plan['subleases'][number], i: number, inflation: number, last: boolean): { rent: number; deposit: number } {
  const start = s.startMonth - 1;
  if (i < start) return { rent: 0, deposit: 0 };
  const t = i - start; // tenant month, 0-based
  const leaveAt = s.leavesAfterYear ? s.leavesAfterYear * 12 : Infinity;
  const relet = leaveAt + s.voidMonths;
  // Rent level follows the years since the sublease first started, whoever the tenant is.
  const level = Math.pow(1 + s.yearlyIncrease, Math.floor(t / 12));
  const baseRent = s.monthlyRent * level;
  const sales = s.monthlySales * Math.pow(1 + inflation, Math.floor(i / 12));
  const rentDue = s.rentMode === 'fixed' ? baseRent : s.rentMode === 'share' ? sales * s.salesShare : Math.max(baseRent, sales * s.salesShare);
  const depositAmount = s.monthlyRent * s.depositMonths;
  let deposit = 0;
  if (t === 0) deposit += depositAmount;
  if (t === leaveAt) deposit -= depositAmount;
  if (t === relet) deposit += s.monthlyRent * level * s.depositMonths;
  // The tenant in place at the end of the lease gets its deposit back.
  if (last && (t < leaveAt || t >= relet)) deposit -= t < leaveAt ? depositAmount : s.monthlyRent * Math.pow(1 + s.yearlyIncrease, Math.floor(relet / 12)) * s.depositMonths;
  const tenantMonth = t < leaveAt ? t : t >= relet ? t - relet : -1;
  const rent = tenantMonth < 0 || tenantMonth < s.rentFreeMonths ? 0 : rentDue;
  return { rent, deposit };
}

export function runPlan(plan: Plan, opts: RunOptions = {}): Result {
  const occScale = opts.occScale ?? 1;
  const rateScale = opts.rateScale ?? 1;
  const { lease, stays, cards, costs, operator, assumptions } = plan;
  const cx = capex(plan);
  const rooms = roomCount(plan);
  const leaseYears = lease.walkAwayYear && lease.walkAwayYear < lease.years ? lease.walkAwayYear : lease.years;
  const months = leaseYears * 12;
  const years = Array.from({ length: leaseYears }, emptyYear);
  const monthEbitda: number[] = [];
  const monthCapital: number[] = [];
  const paid = (line: keyof typeof costs.paidBy) => costs.paidBy[line] === 'partners';
  const svMonths = (s: Season) => operator.kind === 'stayvista' || (operator.kind === 'mixed' && operator.stayvista.seasons.includes(s));
  const avgRate = rooms ? plan.rooms.reduce((t, r) => t + r.rate * r.count, 0) / rooms : 0;
  const poolLift = cards.pool.on ? 1 + cards.pool.rateLift : 1;

  for (let i = 0; i < months; i++) {
    const m = ((lease.startMonth - 1 + i) % 12) + 1;
    const ly = Math.floor(i / 12);
    const y = years[ly];
    const infl = Math.pow(1 + assumptions.inflation, ly);
    let rev = 0;
    let cost = 0;
    let capital = 0;
    const rent = i < lease.rentFreeMonths ? 0 : rentInYear(lease.rentSteps, ly + 1);
    y.rent += rent;
    cost += rent;
    book(y.bySection, null, -rent);

    for (const s of plan.subleases) {
      const f = subleaseMonth(s, i, assumptions.inflation, i === months - 1);
      y.subleaseRev += f.rent;
      rev += f.rent;
      book(y.bySection, s.sectionId, f.rent);
      capital += f.deposit;
    }

    if (i >= lease.fitoutMonths) {
      const op = i - lease.fitoutMonths + 1;
      const ramp = rampFactor(plan, op);
      const r = ramp * occScale;
      const s = plan.seasons[m - 1];
      const d = DAYS[m - 1];
      let nights = 0;
      let roomRev = 0;
      let commission = 0;
      // Room revenue by room type, for earnings by section.
      const byType = new Map<string, number>();

      if (rooms && svMonths(s)) {
        // StayVista: whole villa, one nightly rate; StayVista's cut replaces booking fees.
        const sv = operator.stayvista;
        const villaNights = d * Math.min(1, sv.occupancy[s] * r);
        // The whole-villa rate is quoted for the house as listed, pool included: no pool lift here.
        const net = (villaNights * sv.rates[s] * infl * rateScale) / (1 + sv.gst);
        roomRev = net;
        commission = net * sv.commission;
        nights = villaNights * rooms;
        for (const rt of plan.rooms) byType.set(rt.sectionId, (byType.get(rt.sectionId) ?? 0) + (net * rt.count) / rooms);
      } else if (rooms) {
        const priceMult = (s === 'peak' ? 1 + stays.peakPremium : s === 'shoulder' ? 1 : 1 - stays.lowDiscount) * infl * rateScale * poolLift;
        if (s === 'monsoon') {
          const nomadCap = Math.min(stays.nomadRooms, rooms);
          const nomads = Math.min(nomadCap, nomadCap * r);
          const nn = (rooms - nomadCap) * d * Math.min(1, stays.occupancy.monsoon * r);
          const nightlyRev = nn * avgRate * priceMult;
          const nomadRev = nomads * stays.nomadMonthly * infl * rateScale;
          roomRev = nightlyRev;
          y.nomadRev += nomadRev;
          rev += nomadRev;
          commission = nightlyRev * operator.bookingShare * operator.bookingFee + nomadRev * stays.nomadBookingShare * operator.bookingFee;
          nights = nn + nomads * d;
          for (const rt of plan.rooms) byType.set(rt.sectionId, (byType.get(rt.sectionId) ?? 0) + ((nightlyRev + nomadRev) * rt.count) / rooms);
        } else {
          const occ = Math.min(1, stays.occupancy[s] * r);
          for (const rt of plan.rooms) {
            const n = rt.count * d * occ;
            const v = n * rt.rate * priceMult;
            roomRev += v;
            nights += n;
            byType.set(rt.sectionId, (byType.get(rt.sectionId) ?? 0) + v);
          }
          commission = roomRev * operator.bookingShare * operator.bookingFee;
        }
      }
      y.roomRev += roomRev;
      rev += roomRev;
      y.commission += commission;
      y.roomNights += nights;
      y.availNights += rooms * d;
      const varCost = svMonths(s) || !paid('guestCosts') ? 0 : nights * (stays.guestsPerRoom * stays.breakfastCost + stays.roomVarCost) * infl;
      y.varCost += varCost;
      // Room costs follow room revenue to each room's section.
      const roomsTotal = [...byType.values()].reduce((t, v) => t + v, 0);
      const roomCostShare = (sectionId: string) => (roomsTotal ? (byType.get(sectionId) ?? 0) / roomsTotal : 0);

      let cafeRev = 0;
      let kitchen = 0;
      if (cards.cafe.on) {
        cafeRev = cards.cafe.covers[s] * Math.min(1, ramp + 0.1) * d * cards.cafe.ticket * infl;
        y.cafeRev += cafeRev;
        y.cafeCost += cafeRev * cards.cafe.foodCost;
      }
      rev += cafeRev;
      const cowork = cards.cowork.on ? cards.cowork.monthly * ramp * infl : 0;
      y.coworkRev += cowork;
      rev += cowork;

      const pay = Math.pow(1 + assumptions.payRise, ly);
      if (cards.cafe.on) kitchen = (cards.cafe.cookPay + cards.cafe.helperPay + cards.cafe.serverPay) * pay;
      const house = paid('housekeeping') ? costs.housekeepers * costs.housekeeperPay * pay : 0;
      const care = paid('caretaker') ? costs.caretakerPay * pay : 0;
      const welfare = costs.staffWelfare * pay + (kitchen + house + care) * costs.bonusRate;
      const partner = paid('partnerSalary') ? costs.partnerSalary * pay : 0;
      y.staffKitchen += kitchen;
      y.staffHousekeeping += house;
      y.staffCaretaker += care;
      y.staffWelfare += welfare;
      y.partner += partner;
      const staff = kitchen + house + care + welfare + partner;
      y.staff += staff;
      const utilities = paid('utilities') ? costs.utilities * infl * (costs.utilitiesFixedShare + (1 - costs.utilitiesFixedShare) * (rooms ? nights / (rooms * d) : 0)) : 0;
      y.utilities += utilities;
      const other = paid('other') ? costs.other * infl : 0;
      y.other += other;
      const running = [cards.pool, cards.powerBackup, cards.kitchen].reduce((t, c) => t + (c.on ? c.monthly * infl : 0), 0);
      y.cardsRunning += running;

      cost += commission + varCost + cafeRev * (cards.cafe.on ? cards.cafe.foodCost : 0) + staff + utilities + other + running;

      for (const sectionId of byType.keys()) book(y.bySection, sectionId, (byType.get(sectionId) ?? 0) - (commission + varCost + house) * roomCostShare(sectionId));
      if (!roomsTotal) book(y.bySection, null, -(commission + varCost + house));
      if (cards.cafe.on) book(y.bySection, cards.cafe.sectionId, cafeRev * (1 - cards.cafe.foodCost) - kitchen);
      if (cards.cowork.on) book(y.bySection, cards.cowork.sectionId, cowork);
      for (const c of [cards.pool, cards.powerBackup, cards.kitchen]) if (c.on) book(y.bySection, c.sectionId || null, -c.monthly * infl);
      book(y.bySection, null, -(care + welfare + partner + utilities + other));
    }
    monthEbitda.push(rev - cost);
    monthCapital.push(capital);
    y.capitalFlows += capital;
  }

  // Close the books year by year, as the legacy model does.
  const dep = cx.depreciable / lease.years;
  const walkedAway = leaseYears < lease.years;
  let cum = -cx.total;
  let payback: number | null = null;
  const flows = [-cx.total];
  years.forEach((y, idx) => {
    const last = idx === leaseYears - 1;
    y.revenue = y.roomRev + y.nomadRev + y.cafeRev + y.coworkRev + y.subleaseRev;
    y.opex = y.commission + y.varCost + y.cafeCost + y.rent + y.staff + y.utilities + y.other + y.cardsRunning;
    y.ebitda = y.revenue - y.opex;
    y.depreciation = dep;
    // Walking away writes off what is left of the fit-out.
    y.writeOff = last && walkedAway ? cx.depreciable - dep * leaseYears : 0;
    y.tax = Math.max(0, (y.ebitda - dep - y.writeOff) * assumptions.taxRate);
    if (last) y.capitalFlows += cx.deposit + cx.workingCapital;
    y.cash = y.ebitda - y.tax + y.capitalFlows;
    y.occupancy = y.availNights ? y.roomNights / y.availNights : 0;
    const prev = cum;
    cum += y.cash;
    y.cumulative = cum;
    if (payback === null && cum >= 0) payback = idx + (y.cash > 0 ? -prev / y.cash : 1);
    flows.push(y.cash);
  });

  // The J-curve: tax is spread evenly over each year's months.
  const monthPoints: MonthPoint[] = [{ month: 0, cash: -cx.total, cumulative: -cx.total }];
  let running = -cx.total;
  for (let i = 0; i < months; i++) {
    const y = years[Math.floor(i / 12)];
    let cash = monthEbitda[i] - y.tax / 12 + monthCapital[i];
    if (i === months - 1) cash += cx.deposit + cx.workingCapital;
    running += cash;
    monthPoints.push({ month: i + 1, cash, cumulative: running });
  }

  const shares = plan.partners.shares.length === plan.partners.count ? plan.partners.shares : Array.from({ length: plan.partners.count }, () => 1 / plan.partners.count);
  return {
    capex: cx,
    years,
    months: monthPoints,
    payback,
    irr: irr(flows),
    endCash: cum,
    totalCash: cx.total,
    lowestCash: Math.min(...monthPoints.map((p) => p.cumulative)),
    perPartner: shares.map((s) => cx.total * s),
  };
}

/** Internal rate of return by bisection, as in the legacy model. */
export function irr(flows: number[]): number | null {
  const npv = (r: number) => flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
  let lo = -0.99;
  let hi = 2;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
