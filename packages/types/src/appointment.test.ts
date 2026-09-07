import { describe, expect, it } from 'vitest';
import {
  appointmentSchema,
  createAppointmentSchema,
  EXACTLY_ONE_APPOINTMENT_MESSAGE,
} from './appointment.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const OTHER_UUID = '00000000-0000-4000-8000-000000000001';

const packageRow = {
  id: UUID,
  branchId: UUID,
  servicePackageId: UUID,
  studioServiceId: null,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
  status: 'pending',
  kind: 'scheduled',
  bookedPriceCents: 90000,
  notes: null,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

const serviceRow = { ...packageRow, servicePackageId: null, studioServiceId: UUID };

const baseCreate = {
  branchId: UUID,
  servicePackageId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
};

// No servicePackageId key at all — exercises the default(null) fill.
const serviceOnlyCreate = {
  branchId: UUID,
  studioServiceId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
};

// Neither key — both refs default null, so the refine must reject.
const neitherCreate = {
  branchId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
};

describe('appointmentSchema (generalized — M2 ticket 02)', () => {
  it('parses a package-only row (service ref null)', () => {
    const result = appointmentSchema.safeParse(packageRow);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.studioServiceId).toBeNull();
  });

  it('parses a service-only row (package ref null)', () => {
    const result = appointmentSchema.safeParse(serviceRow);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.servicePackageId).toBeNull();
  });

  it('rejects both offering refs set', () => {
    const result = appointmentSchema.safeParse({ ...packageRow, studioServiceId: OTHER_UUID });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(EXACTLY_ONE_APPOINTMENT_MESSAGE);
    }
  });

  it('rejects a row with neither offering set', () => {
    const result = appointmentSchema.safeParse({ ...packageRow, servicePackageId: null });
    expect(result.success).toBe(false);
  });

  it('defaults kind to scheduled when omitted', () => {
    const { kind: _kind, ...withoutKind } = packageRow;
    const result = appointmentSchema.safeParse(withoutKind);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kind).toBe('scheduled');
  });

  it('accepts walk_in and visitation kinds', () => {
    for (const kind of ['walk_in', 'visitation'] as const) {
      const result = appointmentSchema.safeParse({ ...packageRow, kind });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown kind', () => {
    const result = appointmentSchema.safeParse({ ...packageRow, kind: 'pickup' });
    expect(result.success).toBe(false);
  });
});

describe('createAppointmentSchema (generalized — M2 ticket 02)', () => {
  it('accepts package-only and defaults the service ref to null', () => {
    const result = createAppointmentSchema.safeParse(baseCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.studioServiceId).toBeNull();
      expect(result.data.addonServiceIds).toEqual([]);
    }
  });

  it('accepts service-only without naming the package ref (defaults null)', () => {
    const result = createAppointmentSchema.safeParse(serviceOnlyCreate);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.servicePackageId).toBeNull();
  });

  it('rejects both offering refs set', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      studioServiceId: OTHER_UUID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(EXACTLY_ONE_APPOINTMENT_MESSAGE);
    }
  });

  it('rejects a payload naming neither offering (both default null)', () => {
    const result = createAppointmentSchema.safeParse(neitherCreate);
    expect(result.success).toBe(false);
  });

  it('defaults kind to scheduled', () => {
    const result = createAppointmentSchema.safeParse(baseCreate);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kind).toBe('scheduled');
  });

  it('accepts walk_in with an add-on reference (prior art)', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      kind: 'walk_in',
      addonServiceIds: [UUID],
    });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate add-on service ids (prior art)', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      addonServiceIds: [UUID, UUID],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed add-on id (prior art)', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      addonServiceIds: ['nope'],
    });
    expect(result.success).toBe(false);
  });

  it('strips a client-supplied price snapshot (server-written, renamed)', () => {
    // z.object strips unknown keys — the contract is that the server-written
    // snapshot never appears in the parsed create output (assert on output,
    // not on a supposed rejection).
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      bookedPriceCents: 90000,
    });
    expect(result.success).toBe(true);
    if (result.success) expect('bookedPriceCents' in result.data).toBe(false);
  });
});
