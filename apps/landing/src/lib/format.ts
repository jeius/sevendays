// Money display for the landing site: cent-denominated ints in, peso string
// out.
// ADR-0020: null is the unpriced state. peso() returns null for it and JSX
// renders nothing — the no-price law ("nothing renders where a price would
// be") enforced at the formatter. The three join helpers below keep
// string-embedded sites honest too: no dangling separators, no ₱0 stand-ins.

export function peso(cents: number | null): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}

/** `Makeup · ₱120.00` priced; `Makeup` alone unpriced — the line stays, only the price slot renders nothing (owner ruling 2026-10-12). */
export function labeledPrice(name: string, cents: number | null): string {
  return cents === null ? name : `${name} · ${peso(cents)}`;
}

/** `` ` · ₱1,080.00` `` priced; empty unpriced — footer CTAs drop the suffix whole (owner ruling 2026-10-12). */
export function priceSuffix(cents: number | null): string {
  return cents === null ? '' : ` · ${peso(cents)}`;
}

/** `Book Portraits (₱500)` priced; `Book Portraits` unpriced — null/100 is 0 in JS, so the old inline arithmetic would have announced ₱0. */
export function bookAriaLabel(name: string, cents: number | null): string {
  return cents === null ? `Book ${name}` : `Book ${name} (₱${(cents / 100).toFixed(0)})`;
}
