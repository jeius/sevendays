import { describe, expect, it } from 'vitest';
import { peso } from './format';

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
