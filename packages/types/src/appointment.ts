import { z } from 'zod';

export const appointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

// How the session happens — recorded, not validated against a booking flow
// (walk-in booking and visitation flows are deferred features).
export const appointmentKindSchema = z.enum(['scheduled', 'walk_in', 'visitation']);

export type AppointmentKind = z.infer<typeof appointmentKindSchema>;

// M2 ticket 02 — the appointment carries EITHER offering. One check function:
// the Zod refinements below and the SQL CHECK in migration 0004
// (appointments_offering_exactly_one) encode this exact formula, so the
// schemas and the table cannot drift apart. NULL means "not booked" — the
// pairs (set, set) and (null, null) both fail.
export const EXACTLY_ONE_APPOINTMENT_MESSAGE =
  'Exactly one of servicePackageId and studioServiceId must be set.';

export function hasExactlyOneAppointmentOffering(v: {
  servicePackageId: string | null;
  studioServiceId: string | null;
}): boolean {
  return (v.servicePackageId === null) !== (v.studioServiceId === null);
}

export const appointmentFieldsSchema = z.object({
  id: z.uuid(),
  branchId: z.uuid(),
  servicePackageId: z.uuid().nullable(),
  studioServiceId: z.uuid().nullable(),
  customerName: z.string().min(1),
  customerEmail: z.email(),
  customerPhone: z.string().min(1),
  scheduledAt: z.coerce.date(),
  status: appointmentStatusSchema.default('pending'),
  kind: appointmentKindSchema.default('scheduled'),
  // Booking-time snapshot of the booked offering's price — written by the
  // server, never supplied by the client. Renamed from packagePriceCents
  // (M2 ticket 02): it now snapshots either offering kind.
  bookedPriceCents: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// zod v4 chain rule (verified against 4.5.1): .omit() throws on a refined
// object, so every derived schema chains from the UNrefined field basis and
// attaches the exactly-one refine LAST — refinements ride the terminal link.
export const appointmentSchema = appointmentFieldsSchema.refine(hasExactlyOneAppointmentOffering, {
  error: EXACTLY_ONE_APPOINTMENT_MESSAGE,
});

export type Appointment = z.infer<typeof appointmentSchema>;

const createAppointmentFieldsSchema = appointmentFieldsSchema
  .omit({
    id: true,
    status: true,
    bookedPriceCents: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Exactly one of the two refs must be non-null (refine below); the
    // unspecified one defaults to null, so a package-only payload never
    // names the service ref and vice versa.
    servicePackageId: z.uuid().nullable().default(null),
    studioServiceId: z.uuid().nullable().default(null),
    // Resolved against addon_services and price-snapshotted by the server
    // at booking time (M1.4). Package bookings accept any active add-on
    // (uniform rule); service bookings get the junction rule in ticket 03.
    addonServiceIds: z
      .array(z.uuid())
      .refine((ids) => new Set(ids).size === ids.length, {
        error: 'Duplicate add-on service ids are not allowed.',
      })
      .default([]),
    notes: z.string().nullable().optional(),
  });

export const createAppointmentSchema = createAppointmentFieldsSchema.refine(
  hasExactlyOneAppointmentOffering,
  { error: EXACTLY_ONE_APPOINTMENT_MESSAGE }
);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  id: z.uuid(),
  status: appointmentStatusSchema,
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
