import type { BranchRead } from '@sevendays/types';

// DORMANT since #273 — kept for possible future revival:
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

// The device law (#273, OWNER-RULED): Google is the base, Apple augments.
export function isAppleUserAgent(ua: string): boolean {
  return /iPhone|iPad|iPod|Macintosh/i.test(ua);
}

export function mapsHrefFor(branch: BranchRead, isApple: boolean): string | null {
  if (isApple && branch.appleMapsUrl !== null) {
    return branch.appleMapsUrl;
  }
  return branch.googleMapsUrl;
}
