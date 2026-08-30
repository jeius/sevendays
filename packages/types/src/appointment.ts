import { z } from 'zod';

export const appointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  servicePackageId: z.string().uuid(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  scheduledAt: z.coerce.date(),
  status: appointmentStatusSchema.default('pending'),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Appointment = z.infer<typeof appointmentSchema>;

export const createAppointmentSchema = appointmentSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  id: z.string().uuid(),
  status: appointmentStatusSchema,
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
