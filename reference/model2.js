// Velsao heritage stay — Plan A: full fit-out on Dulce's ₹35 L estimate. Plan B: ₹40 L lean budget. Plan C: ₹20 L, 5 rooms, rooms only. All at ₹80k rent.
// Monthly model over the lease. All money in ₹.
const BASE = {
  leaseYears: 9, startMonth: 1, rentEscalation: 0.05, flatYears: 3,
  newRooms: 4, heritageRooms: 2,
  adrNew: 5000, adrHeritage: 7500, peakPremium: 0.25, lowDiscount: 0.2,
  occPeak: 0.6, occShoulder: 0.4, occLow: 0.25, occMonsoonNightly: 0.15,
  nomadRooms: 3, nomadRate: 50000,
  otaShare: 0.6, otaCommission: 0.17, nomadOtaShare: 0.3,
  guestsPerRoom: 1.8, breakfastCost: 300, roomVarCost: 300,
  cafeCovers: { peak: 35, shoulder: 22, low: 10, monsoon: 8 }, cafeTicket: 400, cafeFoodCost: 0.34,
  coworkMonthly: 20000,
  // Staff, ₹/month (Goa 2025–26 job listings; hotel minimum wage ₹561–677/day)
  cookPay: 24000, kitchenHelperPay: 16000, serverPay: 16000, maids: 2, maidPay: 16000, caretakerPay: 18000,
  staffWelfare: 12000, bonusRate: 0.0833,
  partnerSalary: 50000, payRise: 0.07, utilities: 55000, fixedOther: 50000,
  inflation: 0.06, taxRate: 0.312, occScale: 1, rateAdjust: 0,
  padel: false, padelGroundRent: 40000, padelStartYear: 2,
  // fit-out shared by both plans
  furnishPerRoom: 300000, cafeFit: 700000, coworkFit: 250000, landscaping: 400000, services: 400000,
  fitContingency: 0.1, legal: 200000, branding: 200000, depositMonths: 3, workingCapital: 800000,
  constructionOverrun: 0, budgetOverrun: 0,
};
const PLANS = {
  A: { ...BASE, name: 'Plan A', label: 'Full fit-out on Dulce ₹35 L', rent: 80000, fitoutMonths: 6, rentFreeMonths: 6,
       construction: 3500000, constructionContingency: 0.2, falseCeilings: 0, bathPerRoom: 100000 },
  B: { ...BASE, name: 'Plan B', label: '₹40 L lean budget', rent: 80000, fitoutMonths: 6, rentFreeMonths: 6,
       construction: 2200000, constructionContingency: 0, falseCeilings: 0, bathPerRoom: 50000,
       furnishPerRoom: 140000, cafeFit: 250000, coworkFit: 80000, landscaping: 80000, services: 120000,
       fitContingency: 0, legal: 100000, branding: 30000 },
  // Plan C: ₹20 L all-in (incl. deposit and working capital), 5 rooms, no kitchen, café or co-working.
  C: { ...BASE, name: 'Plan C', label: '₹20 L, 5 rooms, rooms only', rent: 80000, fitoutMonths: 6, rentFreeMonths: 6,
       newRooms: 3, heritageRooms: 2, rateAdjust: -500, breakfastCost: 0,
       construction: 550000, constructionContingency: 0, falseCeilings: 0, bathPerRoom: 40000,
       furnishPerRoom: 120000, cafeFit: 0, coworkFit: 0, landscaping: 0, services: 50000,
       fitContingency: 0, legal: 80000, branding: 20000, workingCapital: 260000,
       cafeCovers: { peak: 0, shoulder: 0, low: 0, monsoon: 0 }, coworkMonthly: 0,
       cookPay: 0, kitchenHelperPay: 0, serverPay: 0, maids: 1, staffWelfare: 4000,
       utilities: 40000, fixedOther: 40000 },
};

function season(m) {
  if (m === 12 || m <= 2) return 'peak';
  if (m >= 6 && m <= 9) return 'monsoon';
  if (m === 5) return 'low';
  return 'shoulder';
}
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function ramp(op) { return op <= 6 ? 0.6 : op <= 12 ? 0.8 : op <= 24 ? 0.92 : 1; }

function capex(p) {
  const rooms = p.newRooms + p.heritageRooms;
  const constr = p.construction * (1 + p.constructionOverrun);
  const lines = [['Construction to finish the building', constr, 'build']];
  if (p.constructionContingency) lines.push([`Construction contingency (${Math.round(p.constructionContingency * 100)}%)`, constr * p.constructionContingency, 'build']);
  const fit = [
    p.falseCeilings && ['False ceilings', p.falseCeilings],
    ['Bathroom fixtures and sanitaryware', p.bathPerRoom * rooms],
    ['Room furnishing incl. AC and linen', p.furnishPerRoom * rooms],
    ['Café kitchen, counter, furniture', p.cafeFit],
    ['Co-working desks, Wi-Fi, power backup', p.coworkFit],
    ['Landscaping and garden seating', p.landscaping],
    ['Water tank, solar heaters, inverter', p.services],
  ].filter(Boolean);
  fit.forEach(([l, a]) => lines.push([l, a, 'fit']));
  if (p.fitContingency) lines.push([`Fit-out contingency (${Math.round(p.fitContingency * 100)}%)`, fit.reduce((t, [, a]) => t + a, 0) * p.fitContingency, 'fit']);
  lines.push(['LLP, lease registration, licences, legal', p.legal, 'soft']);
  lines.push(['Branding, website, photography', p.branding, 'soft']);
  // budgetOverrun stresses every build and fit-out line at once
  const items = lines.filter(([, amount]) => amount > 0).map(([label, amount, group]) => ({ label, amount: amount * (1 + p.budgetOverrun), group }));
  const depreciable = items.reduce((t, i) => t + i.amount, 0);
  const deposit = p.rent * p.depositMonths;
  items.push({ label: `Security deposit, ${p.depositMonths} months (refundable)`, amount: deposit, group: 'cash' });
  items.push({ label: 'Working capital buffer', amount: p.workingCapital, group: 'cash' });
  return { items, depreciable, deposit, total: depreciable + deposit + p.workingCapital };
}

function run(p) {
  const cx = capex(p);
  const rooms = p.newRooms + p.heritageRooms;
  const months = p.leaseYears * 12;
  const years = Array.from({ length: p.leaseYears }, () => ({
    roomRev: 0, nomadRev: 0, cafeRev: 0, coworkRev: 0, padelRev: 0,
    commission: 0, varCost: 0, cafeCost: 0, rent: 0, staff: 0, utilities: 0, other: 0,
    staffKitchen: 0, staffHousekeeping: 0, staffCaretaker: 0, staffWelfare: 0, partner: 0,
    roomNights: 0, availNights: 0,
  }));
  // rateAdjust: e.g. −₹500 a night when breakfast isn't included
  const adrNew = p.adrNew + p.rateAdjust, adrHer = p.adrHeritage + p.rateAdjust;
  const avgAdr = (adrNew * p.newRooms + adrHer * p.heritageRooms) / rooms;
  for (let i = 0; i < months; i++) {
    const m = ((p.startMonth - 1 + i) % 12) + 1;
    const ly = Math.floor(i / 12);
    const y = years[ly];
    const infl = Math.pow(1 + p.inflation, ly);
    y.rent += i < p.rentFreeMonths ? 0 : p.rent * Math.pow(1 + p.rentEscalation, Math.max(0, ly - p.flatYears + 1));
    if (i < p.fitoutMonths) continue;
    const op = i - p.fitoutMonths + 1;
    const r = ramp(op) * p.occScale;
    const s = season(m), d = DAYS[m - 1];
    const priceMult = (s === 'peak' ? 1 + p.peakPremium : s === 'shoulder' ? 1 : 1 - p.lowDiscount) * infl;
    let nights;
    if (s === 'monsoon') {
      const nomadCap = Math.min(p.nomadRooms, rooms);
      const nomads = Math.min(nomadCap, nomadCap * r);
      const nn = (rooms - nomadCap) * d * Math.min(1, p.occMonsoonNightly * r);
      const nightlyRev = nn * avgAdr * priceMult;
      const nomadRev = nomads * p.nomadRate * infl;
      y.roomRev += nightlyRev; y.nomadRev += nomadRev;
      y.commission += nightlyRev * p.otaShare * p.otaCommission + nomadRev * p.nomadOtaShare * p.otaCommission;
      nights = nn + nomads * d;
    } else {
      const occ = Math.min(1, (s === 'peak' ? p.occPeak : s === 'low' ? p.occLow : p.occShoulder) * r);
      const nNew = p.newRooms * d * occ, nHer = p.heritageRooms * d * occ;
      const rev = (nNew * adrNew + nHer * adrHer) * priceMult;
      y.roomRev += rev; y.commission += rev * p.otaShare * p.otaCommission;
      nights = nNew + nHer;
    }
    y.roomNights += nights; y.availNights += rooms * d;
    y.varCost += nights * (p.guestsPerRoom * p.breakfastCost + p.roomVarCost) * infl;
    const cafe = p.cafeCovers[s] * Math.min(1, ramp(op) + 0.1) * d * p.cafeTicket * infl;
    y.cafeRev += cafe; y.cafeCost += cafe * p.cafeFoodCost;
    y.coworkRev += p.coworkMonthly * ramp(op) * infl;
    if (p.padel && ly + 1 >= p.padelStartYear) y.padelRev += p.padelGroundRent * infl;
    const pay = Math.pow(1 + p.payRise, ly);
    const kitchen = (p.cookPay + p.kitchenHelperPay + p.serverPay) * pay;
    const house = p.maids * p.maidPay * pay, care = p.caretakerPay * pay;
    const welfare = p.staffWelfare * pay + (kitchen + house + care) * p.bonusRate;
    y.staffKitchen += kitchen; y.staffHousekeeping += house; y.staffCaretaker += care;
    y.staffWelfare += welfare; y.partner += p.partnerSalary * pay;
    y.staff += kitchen + house + care + welfare + p.partnerSalary * pay;
    y.utilities += p.utilities * infl * (0.7 + 0.3 * (nights / (rooms * d)));
    y.other += p.fixedOther * infl;
  }
  const dep = cx.depreciable / p.leaseYears;
  let cum = -cx.total, payback = null;
  const flows = [-cx.total];
  years.forEach((y, idx) => {
    y.revenue = y.roomRev + y.nomadRev + y.cafeRev + y.coworkRev + y.padelRev;
    y.opex = y.commission + y.varCost + y.cafeCost + y.rent + y.staff + y.utilities + y.other;
    y.ebitda = y.revenue - y.opex;
    y.tax = Math.max(0, (y.ebitda - dep) * p.taxRate);
    y.cash = y.ebitda - y.tax + (idx === p.leaseYears - 1 ? cx.deposit + p.workingCapital : 0);
    y.occupancy = y.availNights ? y.roomNights / y.availNights : 0;
    const prev = cum; cum += y.cash; y.cumulative = cum;
    if (payback === null && cum >= 0) payback = idx + (y.cash > 0 ? -prev / y.cash : 1);
    flows.push(y.cash);
  });
  return { capex: cx, years, payback, irr: irr(flows), endCash: cum };
}

function irr(flows) {
  const npv = r => flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
  let lo = -0.99, hi = 2;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

// Smallest value of `key` (searched in [lo, hi]) at which `test` passes; result is reported via `read`.
function solve(p, key, lo, hi, test) {
  if (!test(run({ ...p, [key]: hi }))) return null;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (test(run({ ...p, [key]: mid }))) hi = mid; else lo = mid; }
  return hi;
}
const TESTS = {
  cash: r => r.years[3].ebitda >= 0,
  lease: r => r.endCash >= 0,
  five: r => r.payback !== null && r.payback <= 5,
};
function breakEven(p) {
  const out = {};
  for (const [k, t] of Object.entries(TESTS)) {
    const s = solve(p, 'occScale', 0.2, 2.5, t);
    out[k] = s === null ? null : run({ ...p, occScale: s }).years[3].occupancy;
  }
  return out;
}
// Highest monthly rent at which the plan still meets `test`.
function maxRent(p, test) {
  let lo = 0, hi = 300000;
  if (!test(run({ ...p, rent: lo }))) return null;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (test(run({ ...p, rent: mid }))) lo = mid; else hi = mid; }
  return lo;
}

if (typeof module !== 'undefined') module.exports = { BASE, PLANS, run, capex, breakEven, maxRent, solve, TESTS };
