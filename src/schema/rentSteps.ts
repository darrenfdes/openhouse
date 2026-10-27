import type { RentStep } from './plan';

/**
 * Rent steps that reproduce the legacy rule: flat for `flatYears`, then `rate` compounding
 * every year after. Flat years collapse into one step.
 */
export function autoEscalate({ base, flatYears, rate, years }: { base: number; flatYears: number; rate: number; years: number }): RentStep[] {
  const steps: RentStep[] = [];
  for (let year = 1; year <= years; year++) {
    const monthly = base * Math.pow(1 + rate, Math.max(0, year - flatYears));
    const last = steps[steps.length - 1];
    if (last && last.monthly === monthly) last.toYear = year;
    else steps.push({ fromYear: year, toYear: year, monthly });
  }
  return steps;
}

/** Monthly rent in a lease year; 0 for a year no step covers. */
export function rentInYear(steps: RentStep[], year: number): number {
  return steps.find((s) => year >= s.fromYear && year <= s.toYear)?.monthly ?? 0;
}
