// The StayVista plan, from the friend's note (docs/source/stayvista-friend-note.jpg) and docs/SPEC.md.
// Its occupancy and whole-villa rates are untested guesses: `guess` makes the app say so.
import { DEFAULT_PLAN, DEFAULT_SUBLEASE, SIZES } from '../schema/defaults';
import type { Plan } from '../schema/plan';

const d = DEFAULT_PLAN;

export const PLAN_STAYVISTA: Plan = {
  ...d,
  name: 'StayVista plan',
  label: 'Whole house run by StayVista, café brand on a sublease',
  guess: true,
  lease: {
    years: 10,
    startMonth: 1,
    fitoutMonths: 6,
    rentSteps: [
      { fromYear: 1, toYear: 5, monthly: 75000 },
      { fromYear: 6, toYear: 10, monthly: 81000 },
    ],
    rentFreeMonths: 7,
    depositMonths: 3,
  },
  operator: { ...d.operator, kind: 'stayvista', stayvista: { ...d.operator.stayvista, commission: 0.275 } },
  rooms: [
    { id: 'suites-ground', name: 'Master suites, ground', count: 2, rate: 7500, areaM2: SIZES.suite, sectionId: 'wing-ground' },
    { id: 'suites-first', name: 'Master suites, first floor', count: 2, rate: 7500, areaM2: SIZES.suite, sectionId: 'wing-first' },
  ],
  cards: {
    cafe: { ...d.cards.cafe, on: false },
    cowork: { ...d.cards.cowork, on: false },
    pool: { ...d.cards.pool, on: true, build: 1500000, monthly: 15000 },
    powerBackup: { ...d.cards.powerBackup, on: true, build: 400000, monthly: 8000 },
    kitchen: { ...d.cards.kitchen, on: true, build: 400000, monthly: 0 },
  },
  // StayVista pays housekeeping, guest service, marketing and booking fees. The partners pay rent,
  // utilities, the caretaker, pool and garden upkeep and repairs.
  costs: {
    ...d.costs,
    housekeepers: 0,
    staffWelfare: 4000,
    partnerSalary: 0,
    utilities: 40000,
    other: 25000,
    paidBy: { ...d.costs.paidBy, housekeeping: 'operator', guestCosts: 'operator' },
  },
  build: {
    ...d.build,
    construction: 3500000,
    constructionContingency: 0,
    bathPerRoom: 0,
    furnishPerRoom: 400000,
    lines: [],
    fitContingency: 0,
    workingCapital: 500000,
  },
  subleases: [
    { ...DEFAULT_SUBLEASE, id: 'cafe-brand', name: 'Café brand', sectionId: 'old-house', monthlyRent: 150000, startMonth: 7, rentFreeMonths: 3, yearlyIncrease: 0.05, partnerFitout: 0 },
  ],
};
