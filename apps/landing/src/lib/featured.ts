import type { ServicePackageRead } from '@sevendays/types';

// Home featured strip (spec: is_featured, price ascending; fallback
// first-4-by-price when none flagged; heading switch owner-ratified).
export const FEATURED_HEADING = 'Featured packages';
export const FALLBACK_HEADING = 'Our packages';
export const FEATURED_COUNT = 4;

export function selectFeaturedPackages(packages: ServicePackageRead[]): {
  heading: string;
  packages: ServicePackageRead[];
} {
  const byPrice = (a: ServicePackageRead, b: ServicePackageRead) =>
    a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  const featured = packages.filter((p) => p.isFeatured).sort(byPrice);
  if (featured.length > 0) {
    return { heading: FEATURED_HEADING, packages: featured };
  }
  return {
    heading: FALLBACK_HEADING,
    packages: [...packages].sort(byPrice).slice(0, FEATURED_COUNT),
  };
}
