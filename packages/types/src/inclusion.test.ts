import { describe, expect, it } from 'vitest';
import { createPackageInclusionSchema, packageInclusionSchema } from './inclusion.js';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('packageInclusionSchema', () => {
  it('parses a framed picture row (quantity + attire, no print size)', () => {
    const result = packageInclusionSchema.safeParse({
      id: UUID,
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: UUID,
      attireId: UUID,
      description: null,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('parses a privilege row (nulls for quantity and lookups)', () => {
    const result = packageInclusionSchema.safeParse({
      id: UUID,
      kind: 'privilege',
      quantity: null,
      printSizeId: null,
      attireId: null,
      description: 'Usage of Toga and Hood',
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown kind', () => {
    const result = createPackageInclusionSchema.safeParse({
      kind: 'souvenir',
      quantity: 2,
      printSizeId: null,
      attireId: null,
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer quantity', () => {
    const result = createPackageInclusionSchema.safeParse({
      kind: 'print',
      quantity: 2.5,
      printSizeId: UUID,
      attireId: UUID,
      description: null,
    });
    expect(result.success).toBe(false);
  });
});
