import { describe, expect, it } from 'vitest';
import {
  createServicePackageSchema,
  servicePackageSchema,
  servicePackageWithInclusionsSchema,
} from './package.js';

const UUID = '00000000-0000-4000-8000-000000000000';

const fullRow = {
  id: UUID,
  name: 'Basic Package',
  description: 'Entry graduation portrait package.',
  priceCents: 90000,
  durationMinutes: null,
  isActive: true,
  coverImageKey: null,
  slug: 'basic-package',
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

describe('servicePackageSchema', () => {
  it('parses a row with a null duration (catalog specifies none)', () => {
    const result = servicePackageSchema.safeParse(fullRow);
    expect(result.success).toBe(true);
  });

  it('still accepts a numeric duration', () => {
    const result = servicePackageSchema.safeParse({ ...fullRow, durationMinutes: 60 });
    expect(result.success).toBe(true);
  });

  it('rejects a negative duration', () => {
    const result = servicePackageSchema.safeParse({ ...fullRow, durationMinutes: -5 });
    expect(result.success).toBe(false);
  });
});

describe('servicePackageWithInclusionsSchema', () => {
  it('parses a package with a framed inclusion and resolved lookups', () => {
    const result = servicePackageWithInclusionsSchema.safeParse({
      ...fullRow,
      inclusions: [
        {
          id: UUID,
          kind: 'framed_picture',
          quantity: 1,
          frameId: UUID,
          description: null,
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
          printSize: { id: UUID, code: '8R', description: '8R print' },
          attires: [{ id: UUID, name: 'Toga' }],
        },
      ],
      frames: [{ id: UUID, frameNumber: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('parses an inactive package (the read shape does not filter — the server does)', () => {
    const result = servicePackageWithInclusionsSchema.safeParse({
      ...fullRow,
      isActive: false,
      inclusions: [],
      frames: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing inclusions array (no default)', () => {
    const result = servicePackageWithInclusionsSchema.safeParse(fullRow);
    expect(result.success).toBe(false);
  });
});

describe('servicePackageSchema slug/isFeatured (M2 ticket 01)', () => {
  it('parses a row carrying slug and isFeatured', () => {
    const result = servicePackageSchema.safeParse({
      ...fullRow,
      isFeatured: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty slug', () => {
    const result = servicePackageSchema.safeParse({ ...fullRow, slug: '' });
    expect(result.success).toBe(false);
  });

  it('still parses a row without isFeatured (defaults false — pre-flag fixtures)', () => {
    const parsed = servicePackageSchema.parse({ ...fullRow });
    expect(parsed.isFeatured).toBe(false);
  });

  it('createServicePackageSchema strips slug (omitted — seed/server-assigned)', () => {
    // z.object strips unknown keys, so a payload carrying slug still parses —
    // the contract is that slug never appears in the parsed create output.
    const parsed = createServicePackageSchema.parse({
      name: 'New Package',
      description: 'A fresh package.',
      priceCents: 100000,
      durationMinutes: null,
      coverImageKey: null,
      slug: 'should-be-ignored',
    });
    expect('slug' in parsed).toBe(false);
  });
});
