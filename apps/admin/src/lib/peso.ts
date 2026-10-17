// The peso seam (moved from components/cms/shared.tsx, M7 #219): the
// format stays pinned to the landing precedent (₱1,100.00), and the move
// makes the no-price law runnable — null (unpriced, ADR-0020) answers
// null, and the table's price cell renders nothing. The lib home keeps
// the plain-node suite free of component imports.
export function peso(cents: number | null): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
