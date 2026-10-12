import { describe, expect, it } from 'vitest';
import { bookAriaLabel, labeledPrice, peso, priceSuffix } from './format';

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

describe('the unpriced money laws (ADR-0020)', () => {
  it('peso(null) is null — JSX renders nothing, the no-price law enforced at the formatter', () => {
    expect(peso(null)).toBeNull();
  });

  it('labeledPrice keeps the name alone when unpriced; joins when priced (owner ruling: name-only line)', () => {
    expect(labeledPrice('Makeup', null)).toBe('Makeup');
    expect(labeledPrice('Makeup', 12000)).toBe('Makeup · ₱120.00');
  });

  it('priceSuffix is empty when unpriced — the footer CTAs drop the suffix with no dangling separator', () => {
    expect(priceSuffix(null)).toBe('');
    expect(priceSuffix(108000)).toBe(' · ₱1,080.00');
  });

  it('bookAriaLabel drops the price parenthetical when unpriced — the ₱0 aria leak-fix', () => {
    expect(bookAriaLabel('Portraits & ID Photo', null)).toBe('Book Portraits & ID Photo');
    expect(bookAriaLabel('Portraits & ID Photo', 50000)).toBe('Book Portraits & ID Photo (₱500)');
  });
});
