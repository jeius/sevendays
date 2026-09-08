import type { ServicePackageWithInclusions } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { FALLBACK_HEADING, FEATURED_HEADING, selectFeaturedPackages } from './featured';

let n = 0;
function pkg(overrides: Partial<ServicePackageWithInclusions> = {}): ServicePackageWithInclusions {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    name: `Package ${n}`,
    description: 'test package',
    priceCents: 100000,
    durationMinutes: null,
    isActive: true,
    coverImageKey: null,
    slug: `package-${n}`,
    isFeatured: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    inclusions: [],
    frames: [],
    ...overrides,
  };
}

// The owner-approved seeded catalog's first four, pinned for the narrative
// tests (docs/catalog.md — never invent data in place of these).
const BASIC = { name: 'Basic Package', priceCents: 90000, slug: 'basic-package', isFeatured: true };
const A = { name: 'Package A', priceCents: 110000, slug: 'package-a', isFeatured: true };
const B = { name: 'Package B', priceCents: 150000, slug: 'package-b', isFeatured: true };
const C = { name: 'Package C', priceCents: 160000, slug: 'package-c', isFeatured: true };

describe('selectFeaturedPackages', () => {
  it('featured path: only flagged packages, price ascending, featured heading', () => {
    const result = selectFeaturedPackages([
      pkg(C),
      pkg(BASIC),
      pkg({ name: 'Package D', priceCents: 200000 }),
      pkg(A),
      pkg(B),
    ]);
    expect(result.heading).toBe(FEATURED_HEADING);
    expect(result.packages.map((p) => p.slug)).toEqual([
      'basic-package',
      'package-a',
      'package-b',
      'package-c',
    ]);
  });

  it('featured path is not capped at four (the cap belongs to the fallback)', () => {
    const five = [
      pkg(BASIC),
      pkg(A),
      pkg(B),
      pkg(C),
      pkg({ name: 'Package D', priceCents: 200000, isFeatured: true }),
    ];
    const result = selectFeaturedPackages(five);
    expect(result.packages).toHaveLength(5);
  });

  it('fallback path: no flags → first four by price, fallback heading', () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      pkg({ name: `P${i + 1}`, priceCents: 100000 + i * 10000 })
    );
    const result = selectFeaturedPackages(eleven);
    expect(result.heading).toBe(FALLBACK_HEADING);
    expect(result.packages).toHaveLength(4);
    expect(result.packages.map((p) => p.name)).toEqual(['P1', 'P2', 'P3', 'P4']);
  });

  it('fallback ties break by name ascending', () => {
    const result = selectFeaturedPackages([
      pkg({ name: 'Zeta', priceCents: 90000 }),
      pkg({ name: 'Alpha', priceCents: 90000 }),
    ]);
    expect(result.packages.map((p) => p.name)).toEqual(['Alpha', 'Zeta']);
  });
});
