import { FORMAT, type CafeCard, type Plan, type RoomType, type Season, type Section, type Sublease } from './plan';
import { autoEscalate } from './rentSteps';

// Goa: peak Dec-Feb, shoulder Oct-Nov and Mar-Apr, low May, monsoon Jun-Sep.
export const GOA_SEASONS: Season[] = ['peak', 'peak', 'shoulder', 'shoulder', 'low', 'monsoon', 'monsoon', 'monsoon', 'monsoon', 'shoulder', 'shoulder', 'peak'];

export const VELSAO_SECTIONS: Section[] = [
  { id: 'old-house', name: 'Old house', type: 'indoor', areaM2: 148 },
  { id: 'wing-ground', name: 'New wing, ground floor', type: 'indoor', areaM2: 80 },
  { id: 'wing-first', name: 'New wing, first floor', type: 'indoor', areaM2: 80 },
  { id: 'land', name: 'Land', type: 'outdoor', areaM2: 1160 },
];

/** Rough footprints for over-capacity warnings. */
export const SIZES = { suite: 25, cafe: 60, cowork: 30, pool: 40, padel: 200 } as const;

export const DEFAULT_ROOM: RoomType = { id: 'room', name: 'Rooms', count: 1, rate: 5000, areaM2: SIZES.suite, sectionId: '' };

export const DEFAULT_SUBLEASE: Sublease = {
  id: 'sublease',
  name: 'Café brand',
  kind: 'cafe',
  sectionId: '',
  areaM2: SIZES.cafe,
  rentMode: 'fixed',
  monthlyRent: 150000,
  salesShare: 0.1,
  monthlySales: 0,
  startMonth: 1,
  rentFreeMonths: 3,
  yearlyIncrease: 0.05,
  depositMonths: 3,
  partnerFitout: 0,
  voidMonths: 4,
};

const DEFAULT_CAFE: CafeCard = {
  on: true,
  sectionId: 'old-house',
  areaM2: SIZES.cafe,
  build: 700000,
  covers: { peak: 35, shoulder: 22, low: 10, monsoon: 8 },
  ticket: 400,
  foodCost: 0.34,
  cookPay: 24000,
  helperPay: 16000,
  serverPay: 16000,
};

/** The plan every missing field is filled from: the legacy BASE values, self-run, Velsao sections. */
export const DEFAULT_PLAN: Plan = {
  format: FORMAT,
  name: 'New plan',
  seasons: GOA_SEASONS,
  sections: VELSAO_SECTIONS,
  lease: {
    years: 9,
    startMonth: 1,
    fitoutMonths: 6,
    rentSteps: autoEscalate({ base: 80000, flatYears: 3, rate: 0.05, years: 9 }),
    rentFreeMonths: 6,
    depositMonths: 3,
  },
  operator: {
    kind: 'self',
    bookingShare: 0.6,
    bookingFee: 0.155,
    stayvista: {
      commission: 0.275,
      gst: 0.18,
      rates: { peak: 25000, shoulder: 18000, low: 12000, monsoon: 10000 },
      occupancy: { peak: 0.6, shoulder: 0.4, low: 0.25, monsoon: 0.15 },
      seasons: ['peak'],
    },
  },
  rooms: [
    { id: 'heritage', name: 'Heritage rooms', count: 2, rate: 7500, areaM2: SIZES.suite, sectionId: 'old-house' },
    { id: 'wing-ground', name: 'New wing rooms, ground', count: 2, rate: 5000, areaM2: SIZES.suite, sectionId: 'wing-ground' },
    { id: 'wing-first', name: 'New wing rooms, first floor', count: 2, rate: 5000, areaM2: SIZES.suite, sectionId: 'wing-first' },
  ],
  stays: {
    peakPremium: 0.25,
    lowDiscount: 0.2,
    occupancy: { peak: 0.6, shoulder: 0.4, low: 0.25, monsoon: 0.15 },
    nomadRooms: 3,
    nomadMonthly: 50000,
    nomadBookingShare: 0.3,
    guestsPerRoom: 1.8,
    breakfastCost: 300,
    roomVarCost: 300,
  },
  cards: {
    cafe: DEFAULT_CAFE,
    cowork: { on: true, sectionId: 'old-house', areaM2: SIZES.cowork, build: 250000, monthly: 20000 },
    pool: { on: false, sectionId: 'land', areaM2: SIZES.pool, build: 1500000, monthly: 15000, rateLift: 0.3 },
    powerBackup: { on: false, sectionId: 'land', build: 400000, monthly: 8000 },
    kitchen: { on: false, sectionId: 'old-house', build: 400000, monthly: 0 },
  },
  costs: {
    housekeepers: 2,
    housekeeperPay: 16000,
    caretakerPay: 18000,
    staffWelfare: 12000,
    bonusRate: 0.0833,
    partnerSalary: 50000,
    utilities: 55000,
    utilitiesFixedShare: 0.7,
    other: 50000,
    paidBy: { housekeeping: 'partners', caretaker: 'partners', guestCosts: 'partners', partnerSalary: 'partners', utilities: 'partners', other: 'partners' },
  },
  build: {
    construction: 3500000,
    constructionContingency: 0.2,
    constructionOverrun: 0,
    bathPerRoom: 100000,
    furnishPerRoom: 300000,
    lines: [
      { label: 'Landscaping and garden seating', amount: 400000, group: 'fit', sectionId: 'land' },
      { label: 'Water tank, solar heaters, inverter', amount: 400000, group: 'fit' },
      { label: 'LLP, lease registration, licences, legal', amount: 200000, group: 'soft' },
      { label: 'Branding, website, photography', amount: 200000, group: 'soft' },
    ],
    fitContingency: 0.1,
    budgetOverrun: 0,
    workingCapital: 800000,
  },
  subleases: [],
  partners: { count: 3, shares: [1 / 3, 1 / 3, 1 / 3] },
  assumptions: { inflation: 0.06, payRise: 0.07, taxRate: 0.312, ramp: [0.6, 0.8, 0.92] },
};
