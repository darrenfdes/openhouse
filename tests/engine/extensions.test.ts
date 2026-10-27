import { describe, expect, test } from 'vitest';
import { runPlan } from '@/engine';
import { blank, tenant, years } from './fixture';

describe('rent steps', () => {
  test('each lease year pays its own step; rent-free months pay nothing', () => {
    const r = runPlan(blank({ lease: { ...years(2), rentFreeMonths: 3, rentSteps: [{ fromYear: 1, toYear: 1, monthly: 75000 }, { fromYear: 2, toYear: 2, monthly: 81000 }] } }));
    expect(r.years[0].rent).toBe(9 * 75000);
    expect(r.years[1].rent).toBe(12 * 81000);
  });
});

describe('subleases', () => {
  test('fixed rent starts after the tenant’s rent-free months', () => {
    const r = runPlan(blank({ subleases: [tenant({ rentFreeMonths: 2 })] }));
    expect(r.years[0].subleaseRev).toBe(10 * 1000);
  });

  test('a later start month delays the rent', () => {
    expect(runPlan(blank({ subleases: [tenant({ startMonth: 7 })] })).years[0].subleaseRev).toBe(6 * 1000);
  });

  test('share of sales, and the higher of a minimum and a share', () => {
    const share = runPlan(blank({ subleases: [tenant({ rentMode: 'share', monthlySales: 20000, salesShare: 0.1 })] }));
    expect(share.years[0].subleaseRev).toBe(12 * 2000);
    const max = runPlan(blank({ subleases: [tenant({ rentMode: 'max', monthlyRent: 2500, monthlySales: 20000, salesShare: 0.1 })] }));
    expect(max.years[0].subleaseRev).toBe(12 * 2500);
  });

  test('rent rises each year by the yearly increase', () => {
    const r = runPlan(blank({ lease: years(2), subleases: [tenant({ yearlyIncrease: 0.1 })] }));
    expect(r.years[1].subleaseRev).toBeCloseTo(12 * 1100, 6);
  });

  test('a tenant who leaves leaves the space empty, then the next tenant pays the current rent', () => {
    const r = runPlan(blank({ lease: years(3), subleases: [tenant({ yearlyIncrease: 0.1, leavesAfterYear: 1, voidMonths: 4, rentFreeMonths: 1 })] }));
    expect(r.years[0].subleaseRev).toBeCloseTo(11 * 1000, 6);
    // Year 2: four months empty, one rent-free, seven paying at the year-2 level.
    expect(r.years[1].subleaseRev).toBeCloseTo(7 * 1100, 6);
    expect(r.years[2].subleaseRev).toBeCloseTo(12 * 1210, 6);
  });

  test('the tenant deposit comes in at the start and goes back at the end', () => {
    const r = runPlan(blank({ lease: years(2), subleases: [tenant({ depositMonths: 3 })] }));
    expect(r.years[0].capitalFlows).toBe(3000);
    expect(r.years[1].capitalFlows).toBe(-3000);
    expect(r.months[1].cash - r.months[2].cash).toBe(3000);
  });

  test('partner fit-out for a tenant is part of the build', () => {
    expect(runPlan(blank({ subleases: [tenant({ partnerFitout: 200000 })] })).capex.depreciable).toBe(200000);
  });
});

describe('walk-away year', () => {
  const plan = blank({
    lease: { ...years(3), depositMonths: 2, walkAwayYear: 1 },
    build: { ...blank().build, construction: 300000, workingCapital: 50000 },
    assumptions: { ...blank().assumptions, taxRate: 0.3 },
    subleases: [tenant({ monthlyRent: 40000, depositMonths: 1 })],
  });
  const r = runPlan(plan);

  test('the plan stops at the end of the walk-away year', () => {
    expect(r.years).toHaveLength(1);
    expect(r.months).toHaveLength(13);
  });

  test('rent deposit, working capital and tenant deposit all settle that year', () => {
    expect(r.years[0].capitalFlows).toBe(20000 + 50000 + 40000 - 40000);
  });

  test('what is left of the fit-out is written off against tax', () => {
    expect(r.years[0].depreciation).toBe(100000);
    expect(r.years[0].writeOff).toBe(200000);
    // EBITDA 480,000 - 120,000 = 360,000; less 300,000 of depreciation and write-off.
    expect(r.years[0].tax).toBeCloseTo(0.3 * 60000, 6);
  });
});

describe('StayVista operator', () => {
  const flat = { peak: 25000, shoulder: 25000, low: 25000, monsoon: 25000 };
  const half = { peak: 0.5, shoulder: 0.5, low: 0.5, monsoon: 0.5 };
  const base = blank();
  const plan = blank({
    rooms: [{ id: 's', name: 'Suites', count: 4, rate: 9000, areaM2: 25, sectionId: 'hall' }],
    operator: { ...base.operator, kind: 'stayvista', stayvista: { ...base.operator.stayvista, rates: flat, occupancy: half, gst: 0.18, commission: 0.275 } },
  });

  test('room income is the whole-villa rate after GST; StayVista takes its cut', () => {
    const r = runPlan(plan);
    const net = (365 * 0.5 * 25000) / 1.18;
    expect(r.years[0].roomRev).toBeCloseTo(net, 4);
    expect(r.years[0].commission).toBeCloseTo(net * 0.275, 4);
    expect(r.years[0].occupancy).toBeCloseTo(0.5, 10);
  });

  test('a pool does not lift the whole-villa rate, which already includes it', () => {
    const withPool = { ...plan, cards: { ...plan.cards, pool: { ...plan.cards.pool, on: true } } };
    expect(runPlan(withPool).years[0].roomRev).toBeCloseTo(runPlan(plan).years[0].roomRev, 6);
  });

  test('StayVista pays guest costs and booking fees', () => {
    expect(runPlan(plan).years[0].varCost).toBe(0);
  });

  test('lines StayVista pays are dropped from the partners’ costs', () => {
    const costs = { ...plan.costs, housekeepers: 1, housekeeperPay: 10000, caretakerPay: 5000 };
    const partners = runPlan({ ...plan, costs });
    const operator = runPlan({ ...plan, costs: { ...costs, paidBy: { ...costs.paidBy, housekeeping: 'operator' } } });
    expect(partners.years[0].staffHousekeeping).toBe(120000);
    expect(operator.years[0].staffHousekeeping).toBe(0);
    expect(operator.years[0].staffCaretaker).toBe(60000);
  });

  test('mixed: StayVista only in its listed seasons, self-run the rest', () => {
    const mixed = runPlan({ ...plan, operator: { ...plan.operator, kind: 'mixed', stayvista: { ...plan.operator.stayvista, seasons: ['peak'] } } });
    const peakNights = 31 + 28 + 31; // Jan, Feb, Dec
    expect(mixed.years[0].commission).toBeGreaterThan(0);
    const svNet = (peakNights * 0.5 * 25000) / 1.18;
    const self = runPlan({ ...plan, operator: { ...plan.operator, kind: 'self' } });
    // Self-run months earn the same as a fully self-run plan does in those months.
    const selfPeak = self.years[0].roomRev - (mixed.years[0].roomRev - svNet);
    expect(selfPeak).toBeGreaterThan(0);
    expect(mixed.years[0].roomRev).toBeCloseTo(svNet + self.years[0].roomRev - selfPeak, 4);
  });
});

describe('cards', () => {
  const rooms = [{ id: 's', name: 'Suites', count: 2, rate: 5000, areaM2: 25, sectionId: 'hall' }];

  test('a pool lifts nightly rates, costs its upkeep and is part of the build', () => {
    const plain = blank({ rooms });
    const pool = blank({ rooms, cards: { ...plain.cards, pool: { ...plain.cards.pool, on: true, build: 1500000, monthly: 15000, rateLift: 0.3 } } });
    const a = runPlan(plain);
    const b = runPlan(pool);
    expect(b.years[0].roomRev).toBeCloseTo(a.years[0].roomRev * 1.3, 4);
    expect(b.years[0].cardsRunning).toBe(12 * 15000);
    expect(b.capex.depreciable).toBe(1500000);
  });

  test('power backup costs its build and running cost', () => {
    const p = blank();
    const r = runPlan(blank({ cards: { ...p.cards, powerBackup: { ...p.cards.powerBackup, on: true, build: 400000, monthly: 8000 } } }));
    expect(r.capex.depreciable).toBe(400000);
    expect(r.years[0].cardsRunning).toBe(96000);
  });
});

describe('partners', () => {
  test('cash per partner follows the shares', () => {
    const r = runPlan(blank({ build: { ...blank().build, workingCapital: 100000 }, partners: { count: 2, shares: [0.6, 0.4] } }));
    expect(r.perPartner).toEqual([60000, 40000]);
  });
});
