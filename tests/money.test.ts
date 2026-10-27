import { expect, test } from 'vitest';
import { lakh, pct, rupees, years } from '@/lib/money';

test('lakh shows rupees in lakh with Indian grouping', () => {
  expect(lakh(4116831.8)).toBe('Rs 41.2 L');
  expect(lakh(-11866195)).toBe('−Rs 118.7 L');
  expect(lakh(123456789)).toBe('Rs 1,234.6 L');
  expect(lakh(-1000)).toBe('Rs 0.0 L');
});

test('rupees, percentages and years', () => {
  expect(rupees(150000)).toBe('Rs 1,50,000');
  expect(pct(0.16836)).toBe('16.8%');
  expect(pct(null)).toBe('—');
  expect(years(7.4975)).toBe('7.5 years');
  expect(years(null)).toBe('Never');
});
