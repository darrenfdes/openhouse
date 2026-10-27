// The openhouse/v1 plan. All money is plain rupees; rates are fractions (0.275 = 27.5%).

export const FORMAT = 'openhouse/v1';

export const SEASONS = ['peak', 'shoulder', 'low', 'monsoon'] as const;
export type Season = (typeof SEASONS)[number];
export type BySeason<T> = Record<Season, T>;

export const SECTION_TYPES = ['indoor', 'outdoor', 'terrace', 'roof'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export interface Section {
  id: string;
  name: string;
  type: SectionType;
  areaM2: number;
  parentId?: string;
  note?: string;
}

/** Monthly rent from `fromYear` to `toYear` inclusive (lease years start at 1). */
export interface RentStep {
  fromYear: number;
  toYear: number;
  monthly: number;
}

export interface Lease {
  years: number;
  /** Calendar month the lease starts, 1 = January. */
  startMonth: number;
  /** Months of building work before guests arrive. No income or running costs. */
  fitoutMonths: number;
  rentSteps: RentStep[];
  rentFreeMonths: number;
  depositMonths: number;
  /** Optional year the partners leave at its end. */
  walkAwayYear?: number;
}

export const OPERATORS = ['self', 'stayvista', 'mixed'] as const;
export type OperatorKind = (typeof OPERATORS)[number];

export interface Operator {
  kind: OperatorKind;
  /** Self-run: share of nightly bookings that come through booking sites. */
  bookingShare: number;
  /** Self-run: booking-site fee on those bookings. */
  bookingFee: number;
  stayvista: {
    /** StayVista's cut of room income after GST. */
    commission: number;
    gst: number;
    /** Whole-villa nightly rate the guest pays, including GST. */
    rates: BySeason<number>;
    /** Share of nights the whole villa is booked. */
    occupancy: BySeason<number>;
    /** Mixed only: seasons StayVista lists the villa; the rest are self-run. */
    seasons: Season[];
  };
}

export interface RoomType {
  id: string;
  name: string;
  count: number;
  /** Nightly rate in a shoulder month, before season and inflation. */
  rate: number;
  areaM2: number;
  sectionId: string;
}

export interface Stays {
  peakPremium: number;
  /** Discount in low and monsoon months. */
  lowDiscount: number;
  occupancy: BySeason<number>;
  /** Monsoon: rooms let by the month to long stays. */
  nomadRooms: number;
  nomadMonthly: number;
  nomadBookingShare: number;
  guestsPerRoom: number;
  breakfastCost: number;
  roomVarCost: number;
}

export interface CafeCard {
  on: boolean;
  sectionId: string;
  areaM2: number;
  build: number;
  covers: BySeason<number>;
  ticket: number;
  foodCost: number;
  cookPay: number;
  helperPay: number;
  serverPay: number;
}

export interface CoworkCard {
  on: boolean;
  sectionId: string;
  areaM2: number;
  build: number;
  monthly: number;
}

export interface PoolCard {
  on: boolean;
  sectionId: string;
  areaM2: number;
  build: number;
  monthly: number;
  /** Lift on nightly rates when there is a pool. */
  rateLift: number;
}

export interface SimpleCard {
  on: boolean;
  sectionId: string;
  build: number;
  monthly: number;
}

export interface Cards {
  cafe: CafeCard;
  cowork: CoworkCard;
  pool: PoolCard;
  powerBackup: SimpleCard;
  kitchen: SimpleCard;
}

export const PAYERS = ['partners', 'operator'] as const;
export type Payer = (typeof PAYERS)[number];

export const COST_LINES = ['housekeeping', 'caretaker', 'guestCosts', 'partnerSalary', 'utilities', 'other'] as const;
export type CostLine = (typeof COST_LINES)[number];

export interface Costs {
  housekeepers: number;
  housekeeperPay: number;
  caretakerPay: number;
  staffWelfare: number;
  bonusRate: number;
  partnerSalary: number;
  utilities: number;
  /** Share of utilities that does not move with occupancy. */
  utilitiesFixedShare: number;
  other: number;
  paidBy: Record<CostLine, Payer>;
}

export const BUILD_GROUPS = ['build', 'fit', 'soft'] as const;
export type BuildGroup = (typeof BUILD_GROUPS)[number];

export interface BuildLine {
  label: string;
  amount: number;
  group: BuildGroup;
  sectionId?: string;
}

export interface Build {
  construction: number;
  constructionContingency: number;
  constructionOverrun: number;
  bathPerRoom: number;
  furnishPerRoom: number;
  lines: BuildLine[];
  fitContingency: number;
  /** Stress on every build and fit-out line at once. */
  budgetOverrun: number;
  workingCapital: number;
}

export const SUBLEASE_KINDS = ['cafe', 'padel', 'shop', 'yoga', 'other'] as const;
export type SubleaseKind = (typeof SUBLEASE_KINDS)[number];
export const RENT_MODES = ['fixed', 'share', 'max'] as const;
export type RentMode = (typeof RENT_MODES)[number];

export interface Sublease {
  id: string;
  name: string;
  kind: SubleaseKind;
  sectionId: string;
  areaM2: number;
  rentMode: RentMode;
  /** Fixed rent, or the minimum in `max` mode. */
  monthlyRent: number;
  salesShare: number;
  /** Tenant's expected monthly sales in today's money (share and max modes). */
  monthlySales: number;
  /** Lease month the tenant starts, 1 = first month of the lease. */
  startMonth: number;
  rentFreeMonths: number;
  yearlyIncrease: number;
  depositMonths: number;
  partnerFitout: number;
  /** Tenant leaves after this many years; the space then stands empty for `voidMonths`. */
  leavesAfterYear?: number;
  voidMonths: number;
}

export interface Partners {
  count: number;
  /** One share per partner, summing to 1. */
  shares: number[];
}

export interface Assumptions {
  inflation: number;
  payRise: number;
  taxRate: number;
  /** Occupancy factor in operating months 1-6, 7-12 and 13-24; 1 after that. */
  ramp: [number, number, number];
}

export interface Plan {
  format: typeof FORMAT;
  name: string;
  label?: string;
  /** The plan's numbers are untested guesses; results are not findings. */
  guess?: boolean;
  /** Calendar month (index 0 = January) to season. */
  seasons: Season[];
  sections: Section[];
  lease: Lease;
  operator: Operator;
  rooms: RoomType[];
  stays: Stays;
  cards: Cards;
  costs: Costs;
  build: Build;
  subleases: Sublease[];
  partners: Partners;
  assumptions: Assumptions;
}
