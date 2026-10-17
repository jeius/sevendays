import { describe, expect, it } from 'vitest';
import { peso } from './peso.js';

describe('peso (the no-price law’s runnable half, M7 #219)', () => {
  it('formats the landing-pinned precedent — ₱1,100.00 / ₱125.50 (full-ICU Node; never edit the expectation — fix the runtime instead)', () => {
    expect(peso(110000)).toBe('₱1,100.00');
    expect(peso(12550)).toBe('₱125.50');
  });

  it('null (unpriced, ADR-0020) answers null — the price cell renders blank, never a sentinel', () => {
    expect(peso(null)).toBeNull();
  });

  it('zero is a price, not an absence — ₱0.00', () => {
    expect(peso(0)).toBe('₱0.00');
  });
});
