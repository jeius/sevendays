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

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  servicePackageId: z.string().uuid(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  scheduledAt: z.coerce.date(),
  status: appointmentStatusSchema.default('pending'),
  kind: appointmentKindSchema.default('scheduled'),
  // Booking-time snapshot of the package price — written by the server,
  // never supplied by the client.
  packagePriceCents: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Appointment = z.infer<typeof appointmentSchema>;

export const createAppointmentSchema = appointmentSchema
  .omit({
    id: true,
    status: true,
    packagePriceCents: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Resolved against addon_services and price-snapshotted by the server
    // at booking time (M1.4). Any add-on may attach to any package.
    addonServiceIds: z
      .array(z.string().uuid())
      .refine((ids) => new Set(ids).size === ids.length, {
        error: 'Duplicate add-on service ids are not allowed.',
      })
      .default([]),
    notes: z.string().nullable().optional(),
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  id: z.string().uuid(),
  status: appointmentStatusSchema,
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
