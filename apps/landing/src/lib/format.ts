// Money + schedule display for the landing site — promoted verbatim from the
// prototype (wayfinder #33, spec residual). Cent-denominated ints in, peso
// string out; ISO instants in, Philippine-wall-clock strings out.

export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}

export function phDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
