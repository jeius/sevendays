import { describe, expect, it } from 'vitest';
import { peso, phTimeStamp } from './format';

describe('peso', () => {
  it('renders a package price the way every page shows it', () => {
    expect(peso(110000)).toBe('₱1,100.00');
  });

  it('renders the cheapest seeded package exactly', () => {
    expect(peso(90000)).toBe('₱900.00');
  });

  it('keeps cents exact (no rounding drift)', () => {
    expect(peso(12550)).toBe('₱125.50');
  });
});

describe('phTimeStamp', () => {
  it('formats a PH wall-clock instant (pinned output, full-ICU Node)', () => {
    expect(phTimeStamp('2026-12-25T09:30:00+08:00')).toBe('Dec 25, 2026, 9:30 AM');
  });

  it('converts a UTC midnight instant into the PHT day (rollover pin)', () => {
    expect(phTimeStamp('2026-01-05T18:00:00.000Z')).toBe('Jan 6, 2026, 2:00 AM');
  });
});
