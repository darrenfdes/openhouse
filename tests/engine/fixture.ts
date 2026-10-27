import { DEFAULT_PLAN, DEFAULT_SUBLEASE } from '@/schema/defaults';
import type { Plan, Sublease } from '@/schema/plan';

/** A plan with nothing in it: one year, Rs 10,000 rent, no rooms, no costs, no tax, no inflation. */
export function blank(over: Partial<Plan> = {}): Plan {
  const d = DEFAULT_PLAN;
  const off = { on: false };
  return {
    ...d,
    name: 'Blank',
    sections: [
      { id: 'hall', name: 'Hall', type: 'indoor', areaM2: 100 },
      { id: 'yard', name: 'Yard', type: 'outdoor', areaM2: 300 },
    ],
    lease: { years: 1, startMonth: 1, fitoutMonths: 0, rentSteps: [{ fromYear: 1, toYear: 30, monthly: 10000 }], rentFreeMonths: 0, depositMonths: 0 },
    rooms: [],
    cards: {
      cafe: { ...d.cards.cafe, ...off, sectionId: 'hall' },
      cowork: { ...d.cards.cowork, ...off, sectionId: 'hall' },
      pool: { ...d.cards.pool, ...off, sectionId: 'yard' },
      powerBackup: { ...d.cards.powerBackup, ...off, sectionId: 'yard' },
      kitchen: { ...d.cards.kitchen, ...off, sectionId: 'hall' },
    },
    costs: { ...d.costs, housekeepers: 0, caretakerPay: 0, staffWelfare: 0, partnerSalary: 0, utilities: 0, other: 0 },
    build: { ...d.build, construction: 0, constructionContingency: 0, bathPerRoom: 0, furnishPerRoom: 0, lines: [], fitContingency: 0, workingCapital: 0 },
    stays: { ...d.stays, nomadRooms: 0 },
    assumptions: { inflation: 0, payRise: 0, taxRate: 0, ramp: [1, 1, 1] },
    ...over,
  };
}

export const tenant = (over: Partial<Sublease> = {}): Sublease => ({
  ...DEFAULT_SUBLEASE,
  id: 't',
  name: 'Tenant',
  sectionId: 'hall',
  monthlyRent: 1000,
  rentFreeMonths: 0,
  yearlyIncrease: 0,
  depositMonths: 0,
  ...over,
});

export const years = (n: number): Plan['lease'] => ({ ...blank().lease, years: n });
