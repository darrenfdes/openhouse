// Plans A, B and C, converted from `PLANS` in reference/model2.js. Values are copied, not imported.
import { DEFAULT_PLAN, SIZES } from '../schema/defaults';
import type { BuildLine, Plan, RoomType } from '../schema/plan';
import { autoEscalate } from '../schema/rentSteps';

/** The fields of a legacy plan that differ between A, B and C. */
interface LegacyPlan {
  name: string;
  label: string;
  newRooms: number;
  heritageRooms: number;
  rateAdjust: number;
  breakfastCost: number;
  construction: number;
  constructionContingency: number;
  bathPerRoom: number;
  furnishPerRoom: number;
  cafeFit: number;
  coworkFit: number;
  landscaping: number;
  services: number;
  fitContingency: number;
  legal: number;
  branding: number;
  workingCapital: number;
  cafe: boolean;
  cowork: boolean;
  maids: number;
  staffWelfare: number;
  utilities: number;
  fixedOther: number;
}

const BASE: LegacyPlan = {
  name: '', label: '', newRooms: 4, heritageRooms: 2, rateAdjust: 0, breakfastCost: 300,
  construction: 0, constructionContingency: 0, bathPerRoom: 0,
  furnishPerRoom: 300000, cafeFit: 700000, coworkFit: 250000, landscaping: 400000, services: 400000,
  fitContingency: 0.1, legal: 200000, branding: 200000, workingCapital: 800000,
  cafe: true, cowork: true, maids: 2, staffWelfare: 12000, utilities: 55000, fixedOther: 50000,
};

export function fromLegacy(p: LegacyPlan): Plan {
  const d = DEFAULT_PLAN;
  // The new wing's rooms split across its two floors; heritage rooms sit in the old house.
  const ground = Math.ceil(p.newRooms / 2);
  const rooms: RoomType[] = [
    { id: 'heritage', name: 'Heritage rooms', count: p.heritageRooms, rate: 7500 + p.rateAdjust, areaM2: SIZES.suite, sectionId: 'old-house' },
    { id: 'wing-ground', name: 'New wing rooms, ground', count: ground, rate: 5000 + p.rateAdjust, areaM2: SIZES.suite, sectionId: 'wing-ground' },
    { id: 'wing-first', name: 'New wing rooms, first floor', count: p.newRooms - ground, rate: 5000 + p.rateAdjust, areaM2: SIZES.suite, sectionId: 'wing-first' },
  ];
  const lines: BuildLine[] = [
    { label: 'Landscaping and garden seating', amount: p.landscaping, group: 'fit', sectionId: 'land' },
    { label: 'Water tank, solar heaters, inverter', amount: p.services, group: 'fit' },
    { label: 'LLP, lease registration, licences, legal', amount: p.legal, group: 'soft' },
    { label: 'Branding, website, photography', amount: p.branding, group: 'soft' },
  ];
  return {
    ...d,
    name: p.name,
    label: p.label,
    lease: { ...d.lease, rentSteps: autoEscalate({ base: 80000, flatYears: 3, rate: 0.05, years: 9 }) },
    operator: { ...d.operator, bookingShare: 0.6, bookingFee: 0.17 },
    rooms,
    stays: { ...d.stays, breakfastCost: p.breakfastCost },
    cards: {
      ...d.cards,
      cafe: { ...d.cards.cafe, on: p.cafe, build: p.cafeFit },
      cowork: { ...d.cards.cowork, on: p.cowork, build: p.coworkFit },
    },
    costs: { ...d.costs, housekeepers: p.maids, staffWelfare: p.staffWelfare, utilities: p.utilities, other: p.fixedOther },
    build: {
      ...d.build,
      construction: p.construction,
      constructionContingency: p.constructionContingency,
      bathPerRoom: p.bathPerRoom,
      furnishPerRoom: p.furnishPerRoom,
      lines,
      fitContingency: p.fitContingency,
      workingCapital: p.workingCapital,
    },
  };
}

export const PLAN_A = fromLegacy({
  ...BASE, name: 'Plan A', label: 'Full fit-out on Dulce’s Rs 35 L estimate',
  construction: 3500000, constructionContingency: 0.2, bathPerRoom: 100000,
});

export const PLAN_B = fromLegacy({
  ...BASE, name: 'Plan B', label: 'Rs 40 L lean budget',
  construction: 2200000, bathPerRoom: 50000, furnishPerRoom: 140000, cafeFit: 250000, coworkFit: 80000,
  landscaping: 80000, services: 120000, fitContingency: 0, legal: 100000, branding: 30000,
});

export const PLAN_C = fromLegacy({
  ...BASE, name: 'Plan C', label: 'Rs 20 L, 5 rooms, rooms only',
  newRooms: 3, heritageRooms: 2, rateAdjust: -500, breakfastCost: 0,
  construction: 550000, bathPerRoom: 40000, furnishPerRoom: 120000, cafeFit: 0, coworkFit: 0,
  landscaping: 0, services: 50000, fitContingency: 0, legal: 80000, branding: 20000, workingCapital: 260000,
  cafe: false, cowork: false, maids: 1, staffWelfare: 4000, utilities: 40000, fixedOther: 40000,
});
