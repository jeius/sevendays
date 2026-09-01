import { describe, expect, it } from 'vitest';
import { servicePackageSchema, servicePackageWithInclusionsSchema } from './package.js';

const UUID = '00000000-0000-4000-8000-000000000000';

const fullRow = {
  id: UUID,
  name: 'Basic Package',
  description: 'Entry graduation portrait package.',
  priceCents: 90000,
  durationMinutes: null,
  isActive: true,
  coverImageKey: null,
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
  it('parses a package with its inclusions', () => {
    const result = servicePackageWithInclusionsSchema.safeParse({
      ...fullRow,
      inclusions: [
        {
          id: UUID,
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID,
          attireIds: [UUID],
          frameId: UUID,
          description: null,
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
        },
        {
          id: UUID,
          kind: 'privilege',
          quantity: null,
          printSizeId: null,
          attireIds: [],
          frameId: null,
          description: 'Usage of Toga and Hood',
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing inclusions array (no default)', () => {
    const result = servicePackageWithInclusionsSchema.safeParse(fullRow);
    expect(result.success).toBe(false);
  });
});
