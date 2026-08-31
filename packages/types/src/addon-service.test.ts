import { describe, expect, it } from 'vitest';
import { addonServiceSchema, createAddonServiceSchema } from './addon-service.js';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('addonServiceSchema', () => {
  it('parses a full row', () => {
    const result = addonServiceSchema.safeParse({
      id: UUID,
      name: 'Makeup',
      description: 'Professional make-up applied on-site before the shoot.',
      priceCents: 12000,
      isActive: true,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative price', () => {
    const result = createAddonServiceSchema.safeParse({
      name: 'Hairstyle',
      description: 'Professional hairstyling on-site.',
      priceCents: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer price', () => {
    const result = createAddonServiceSchema.safeParse({
      name: 'Hairstyle',
      description: 'Professional hairstyling on-site.',
      priceCents: 60.5,
    });
    expect(result.success).toBe(false);
  });
});
