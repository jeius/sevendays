import { describe, expect, it } from 'vitest';
import { appointmentWithAddonsSchema } from './appointment-read.js';

const UUID = '00000000-0000-4000-8000-000000000000';

const base = {
  id: UUID,
  branchId: UUID,
  servicePackageId: UUID,
  customerName: 'Ana Reyes',
  customerEmail: 'ana@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-10T10:00:00.000Z',
  status: 'pending',
  kind: 'scheduled',
  packagePriceCents: 90000,
  notes: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('appointmentWithAddonsSchema', () => {
  it('parses a record with embedded add-ons', () => {
    const result = appointmentWithAddonsSchema.safeParse({
      ...base,
      addonServices: [{ addonServiceId: UUID, name: 'Makeup', priceCents: 12000 }],
    });
    expect(result.success).toBe(true);
  });

  it('parses a record with no add-ons', () => {
    expect(appointmentWithAddonsSchema.safeParse({ ...base, addonServices: [] }).success).toBe(
      true
    );
  });

  it('rejects a negative add-on price', () => {
    const result = appointmentWithAddonsSchema.safeParse({
      ...base,
      addonServices: [{ addonServiceId: UUID, name: 'Makeup', priceCents: -1 }],
    });
    expect(result.success).toBe(false);
  });
});
