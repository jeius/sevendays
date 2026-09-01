import type { Database } from '@sevendays/db';
import {
  addonServices,
  appointmentAddonServices,
  appointments,
  branches,
  servicePackages,
} from '@sevendays/db';
import type {
  AppointmentAddonEntry,
  AppointmentWithAddons,
  CreateAppointmentInput,
} from '@sevendays/types';
import { desc, eq, inArray } from 'drizzle-orm';

export type CreateAppointmentResult =
  | { ok: true; record: AppointmentWithAddons }
  | { ok: false; reason: 'branch' | 'package' | 'package_inactive' | 'addon' | 'addon_inactive' };

/**
 * Resolve the referenced rows and persist the Appointment with booking-time
 * price snapshots (M1.4). Reference resolution is validation: it belongs here
 * and returns a discriminated reason, which the route maps to per-entity 400s.
 * The client never supplies a price — snapshots come from the resolved rows.
 */
export async function createAppointment(
  db: Database,
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  const [branchRow] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.id, input.branchId));
  if (!branchRow) return { ok: false, reason: 'branch' };

  const [packageRow] = await db
    .select({
      id: servicePackages.id,
      isActive: servicePackages.isActive,
      priceCents: servicePackages.priceCents,
    })
    .from(servicePackages)
    .where(eq(servicePackages.id, input.servicePackageId));
  if (!packageRow) return { ok: false, reason: 'package' };
  if (!packageRow.isActive) return { ok: false, reason: 'package_inactive' };

  const addonRows =
    input.addonServiceIds.length > 0
      ? await db
          .select({
            id: addonServices.id,
            name: addonServices.name,
            priceCents: addonServices.priceCents,
            isActive: addonServices.isActive,
          })
          .from(addonServices)
          .where(inArray(addonServices.id, input.addonServiceIds))
      : [];

  if (addonRows.length !== input.addonServiceIds.length) return { ok: false, reason: 'addon' };
  if (addonRows.some((a) => !a.isActive)) return { ok: false, reason: 'addon_inactive' };

  // Returning an explicit partial projection makes every selected column a
  // declared, non-optional field (noUncheckedIndexedAccess only guards the
  // array index, not the projection itself) — so the single insert's row is
  // fully typed and the record assembly needs no non-null assertions.
  const returning = {
    id: appointments.id,
    branchId: appointments.branchId,
    servicePackageId: appointments.servicePackageId,
    customerName: appointments.customerName,
    customerEmail: appointments.customerEmail,
    customerPhone: appointments.customerPhone,
    scheduledAt: appointments.scheduledAt,
    status: appointments.status,
    kind: appointments.kind,
    packagePriceCents: appointments.packagePriceCents,
    notes: appointments.notes,
    createdAt: appointments.createdAt,
    updatedAt: appointments.updatedAt,
  };

  const insertResult = await db
    .insert(appointments)
    .values({ ...input, packagePriceCents: packageRow.priceCents, notes: input.notes ?? null })
    .returning(returning);
  const appointment = insertResult[0];
  if (!appointment) {
    throw new Error('insert appointments: no row returned');
  }

  if (addonRows.length > 0) {
    await db.insert(appointmentAddonServices).values(
      addonRows.map((a) => ({
        appointmentId: appointment.id,
        addonServiceId: a.id,
        priceCents: a.priceCents,
      }))
    );
  }

  const record: AppointmentWithAddons = {
    ...appointment,
    addonServices: addonRows.map((a) => ({
      addonServiceId: a.id,
      name: a.name,
      priceCents: a.priceCents,
    })),
  };
  return { ok: true, record };
}

/**
 * List Appointments newest-first, optionally filtered to one Branch, capped
 * at 200 rows. Add-on Services are fetched in one inArray query for the
 * fetched appointment ids and stitched back in insertion order per
 * Appointment (the add-ons were written at booking in the order the client
 * supplied, so insertion order == requested order).
 */
export async function listAppointments(
  db: Database,
  { branchId }: { branchId?: string } = {}
): Promise<AppointmentWithAddons[]> {
  const returning = {
    id: appointments.id,
    branchId: appointments.branchId,
    servicePackageId: appointments.servicePackageId,
    customerName: appointments.customerName,
    customerEmail: appointments.customerEmail,
    customerPhone: appointments.customerPhone,
    scheduledAt: appointments.scheduledAt,
    status: appointments.status,
    kind: appointments.kind,
    packagePriceCents: appointments.packagePriceCents,
    notes: appointments.notes,
    createdAt: appointments.createdAt,
    updatedAt: appointments.updatedAt,
  };

  const rows = await db
    .select(returning)
    .from(appointments)
    .where(branchId ? eq(appointments.branchId, branchId) : undefined)
    .orderBy(desc(appointments.createdAt))
    .limit(200);

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const addonRows = await db
    .select({
      appointmentId: appointmentAddonServices.appointmentId,
      addonServiceId: appointmentAddonServices.addonServiceId,
      name: addonServices.name,
      priceCents: appointmentAddonServices.priceCents,
    })
    .from(appointmentAddonServices)
    .innerJoin(addonServices, eq(appointmentAddonServices.addonServiceId, addonServices.id))
    .where(inArray(appointmentAddonServices.appointmentId, ids));

  const addonsByAppointment = new Map<string, AppointmentAddonEntry[]>();
  for (const row of addonRows) {
    const list = addonsByAppointment.get(row.appointmentId) ?? [];
    list.push({
      addonServiceId: row.addonServiceId,
      name: row.name,
      priceCents: row.priceCents,
    });
    addonsByAppointment.set(row.appointmentId, list);
  }

  return rows.map((row) => ({
    ...row,
    addonServices: addonsByAppointment.get(row.id) ?? [],
  }));
}
