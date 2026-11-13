import type { BranchRead } from '@sevendays/types';

// The branch Maps pin (#248): the canonical universal Maps URL — a plain
// query (lat,lng), no API key. null = no coordinates on the row → the card
// renders no button. Bounds/precision are already enforced at the wire
// schema (packages/types), so the interpolation is URL-safe by contract.
export function mapsUrlFor(branch: BranchRead): string | null {
  if (branch.latitude === null || branch.longitude === null) {
    return null;
  }
  return `https://www.google.com/maps?api=1&query=${branch.latitude},${branch.longitude}`;
}
