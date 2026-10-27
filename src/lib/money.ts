// Display only: the engine works in rupees; lakh appears here and nowhere else.
export const LAKH = 100000;

const MINUS = '−';

/** "Rs 41.2 L"; negatives as "−Rs 12.0 L". */
export function lakh(rupees: number, digits = 1): string {
  const v = Math.abs(rupees) / LAKH;
  const s = v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${rupees < 0 && s !== (0).toFixed(digits) ? MINUS : ''}Rs ${s} L`;
}

/** "Rs 75,000" in Indian grouping. */
export function rupees(r: number): string {
  return `${r < 0 ? MINUS : ''}Rs ${Math.round(Math.abs(r)).toLocaleString('en-IN')}`;
}

export function pct(f: number | null, digits = 1): string {
  if (f === null || !Number.isFinite(f)) return '—';
  return `${f < 0 ? MINUS : ''}${Math.abs(f * 100).toFixed(digits)}%`;
}

export function years(y: number | null): string {
  return y === null ? 'Never' : `${y.toFixed(1)} years`;
}

/** Lease month 1-based to words: month 12 is "Year 1, month 12"; 0 is the day the cash goes in. */
export function monthLabel(m: number): string {
  return m === 0 ? 'Before opening' : `Year ${Math.ceil(m / 12)}, month ${((m - 1) % 12) + 1}`;
}

/** A chart axis tick: "50 L". */
export function lakhTick(rupees: number): string {
  return `${Math.round(rupees / LAKH)} L`;
}

export function signedLakh(rupees: number): string {
  return rupees > 0 ? `+${lakh(rupees)}` : lakh(rupees);
}
