// Money display for the landing site — promoted verbatim from the prototype
// (wayfinder #33, spec residual). Cent-denominated ints in, peso string out.

export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
