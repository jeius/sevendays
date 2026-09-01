import { describe, expect, it } from 'vitest';
import { createPackageInclusionSchema, packageInclusionSchema } from './inclusion.js';
import { resolvedInclusionSchema } from './package.js';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('packageInclusionSchema', () => {
  it('parses a framed picture row (quantity, print size, attires, frame)', () => {
    const result = packageInclusionSchema.safeParse({
      id: UUID,
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: UUID,
      attireIds: [UUID],
      frameId: UUID,
      description: null,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('parses a privilege row (nulls for quantity and lookups, empty attires)', () => {
    const result = packageInclusionSchema.safeParse({
      id: UUID,
      kind: 'privilege',
      quantity: null,
      printSizeId: null,
      attireIds: [],
      frameId: null,
      description: 'Usage of Toga and Hood',
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('parses a picture row with empty attires (read shape is 0..N; the ≥1 rule is create-only)', () => {
    const result = packageInclusionSchema.safeParse({
      id: UUID,
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: UUID,
      attireIds: [],
      frameId: UUID,
      description: null,
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
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer quantity', () => {
    const result = createPackageInclusionSchema.safeParse({
      kind: 'print',
      quantity: 2.5,
      printSizeId: UUID,
      attireIds: [UUID],
      description: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('resolvedInclusionSchema', () => {
  const baseResolved = {
    id: UUID,
    kind: 'framed_picture',
    quantity: 1,
    frameId: UUID,
    description: null,
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
  };

  it('parses a framed picture with resolved print size and attires', () => {
    const result = resolvedInclusionSchema.safeParse({
      ...baseResolved,
      printSize: { id: UUID, code: '8R', description: '8R print' },
      attires: [{ id: UUID, name: 'Toga' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a bare uuid print size instead of the resolved object', () => {
    const result = resolvedInclusionSchema.safeParse({
      ...baseResolved,
      printSize: UUID,
      attires: [{ id: UUID, name: 'Toga' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('createPackageInclusionSchema attire rule', () => {
  it('rejects a framed picture create payload without attireIds', () => {
    const result = createPackageInclusionSchema.safeParse({
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: UUID,
      description: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['attireIds']);
    }
  });

  it('accepts a framed picture create payload with attireIds and no frameId', () => {
    const result = createPackageInclusionSchema.safeParse({
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: UUID,
      attireIds: [UUID],
      description: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a privilege create payload without attireIds', () => {
    const result = createPackageInclusionSchema.safeParse({
      kind: 'privilege',
      quantity: null,
      printSizeId: null,
      description: 'High Resolution soft copies',
    });
    expect(result.success).toBe(true);
  });
});
