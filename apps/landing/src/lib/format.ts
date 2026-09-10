// Money display for the landing site: cent-denominated ints in, peso string
// out.

export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
