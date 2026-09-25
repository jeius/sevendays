import { describe, expect, it } from 'vitest';
import { attireSchema, createAttireSchema, updateAttireSchema } from './attire.js';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('attireSchema', () => {
  it('parses a single-value attire name', () => {
    const result = attireSchema.safeParse({
      id: UUID,
      name: 'Toga',
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = createAttireSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('parses a deactivated row (isActive is carried, not defaulted over)', () => {
    const result = attireSchema.safeParse({
      id: UUID,
      name: 'Toga',
      isActive: false,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBe(false);
  });

  it('create defaults isActive true when omitted', () => {
    const parsed = createAttireSchema.parse({ name: 'Toga' });
    expect(parsed.isActive).toBe(true);
  });

  it('update is the create schema (full-object PUT)', () => {
    expect(updateAttireSchema).toBe(createAttireSchema);
  });
});
