import { describe, expect, it } from 'vitest';
import { appointmentSchema, createAppointmentSchema } from './appointment.js';

const UUID = '00000000-0000-4000-8000-000000000000';

const fullRow = {
  id: UUID,
  branchId: UUID,
  servicePackageId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
  status: 'pending',
  kind: 'scheduled',
  packagePriceCents: 90000,
  notes: null,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

const baseCreate = {
  branchId: UUID,
  servicePackageId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
};

describe('appointmentSchema', () => {
  it('parses a row and defaults kind to scheduled when omitted', () => {
    const { kind: _kind, ...withoutKind } = fullRow;
    const result = appointmentSchema.safeParse(withoutKind);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kind).toBe('scheduled');
  });

  it('accepts walk_in and visitation kinds', () => {
    for (const kind of ['walk_in', 'visitation'] as const) {
      const result = appointmentSchema.safeParse({ ...fullRow, kind });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown kind', () => {
    const result = appointmentSchema.safeParse({ ...fullRow, kind: 'pickup' });
    expect(result.success).toBe(false);
  });
});

describe('createAppointmentSchema', () => {
  it('defaults kind and addonServiceIds', () => {
    const result = createAppointmentSchema.safeParse(baseCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe('scheduled');
      expect(result.data.addonServiceIds).toEqual([]);
    }
  });

  it('accepts walk_in with an add-on reference', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      kind: 'walk_in',
      addonServiceIds: [UUID],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed add-on id', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      addonServiceIds: ['nope'],
    });
    expect(result.success).toBe(false);
  });

  it('strips a client-supplied price snapshot (server-written field)', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      packagePriceCents: 90000,
    });
    expect(result.success).toBe(true);
    if (result.success) expect('packagePriceCents' in result.data).toBe(false);
  });
});
