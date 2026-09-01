import { describe, expect, it } from 'vitest';
import { attireSchema, createAttireSchema } from './attire.js';

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
});
