import { z } from 'zod';
import {
  appointmentFieldsSchema,
  EXACTLY_ONE_APPOINTMENT_MESSAGE,
  hasExactlyOneAppointmentOffering,
} from './appointment.js';

// Read shape for the created/listed Appointment: the row plus its attached
// Add-on Services with booking-time price snapshots (M1.4 — POST returns
// this; snapshot correctness is provable over the HTTP seam).
export const appointmentAddonEntrySchema = z.object({
  addonServiceId: z.uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});

export type AppointmentAddonEntry = z.infer<typeof appointmentAddonEntrySchema>;

// Chains from the UNrefined field basis (appointmentFieldsSchema) then attaches
// the exactly-one refine LAST (zod v4 chain rule — .extend() on a refined object
// would also be fine, but extending from the plain basis keeps the refine terminal).
export const appointmentWithAddonsSchema = appointmentFieldsSchema
  .extend({
    addonServices: z.array(appointmentAddonEntrySchema),
  })
  .refine(hasExactlyOneAppointmentOffering, { error: EXACTLY_ONE_APPOINTMENT_MESSAGE });

export type AppointmentWithAddons = z.infer<typeof appointmentWithAddonsSchema>;
