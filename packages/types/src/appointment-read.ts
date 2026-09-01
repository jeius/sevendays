import { z } from 'zod';
import { appointmentSchema } from './appointment.js';

// Read shape for the created/listed Appointment: the row plus its attached
// Add-on Services with booking-time price snapshots (M1.4 — POST returns
// this; snapshot correctness is provable over the HTTP seam).
export const appointmentAddonEntrySchema = z.object({
  addonServiceId: z.uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});

export type AppointmentAddonEntry = z.infer<typeof appointmentAddonEntrySchema>;

export const appointmentWithAddonsSchema = appointmentSchema.extend({
  addonServices: z.array(appointmentAddonEntrySchema),
});

export type AppointmentWithAddons = z.infer<typeof appointmentWithAddonsSchema>;
