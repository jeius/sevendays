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
import { groupChildren } from './group-children.js';

/** The five intake rejections; wording is module-owned (route stays thin). */
const REJECTION_MESSAGES = {
  branch: 'Unknown branchId.',
  package: 'Unknown servicePackageId.',
  package_inactive: 'Service Package is inactive.',
  addon: 'Unknown addonServiceId.',
  addon_inactive: 'Add-on Service is inactive.',
} as const;

type CreateReason = keyof typeof REJECTION_MESSAGES;

export type CreateAppointmentResult =
  | { ok: true; record: AppointmentWithAddons }
  | { ok: false; reason: CreateReason; message: string };

function fail(reason: CreateReason): CreateAppointmentResult {
  return { ok: false, reason, message: REJECTION_MESSAGES[reason] };
}

// The one Appointment projection (14 columns) — create's `.returning()` and
// the list read select the same shape, so a column change lands here once.
// Returning an explicit partial projection makes every selected column a
// declared, non-optional field (noUncheckedIndexedAccess only guards the
// array index, not the projection itself) — so the single insert's row is
// fully typed and the record assembly needs no non-null assertions.
const appointmentProjection = {
  id: appointments.id,
  branchId: appointments.branchId,
  servicePackageId: appointments.servicePackageId,
  studioServiceId: appointments.studioServiceId,
  customerName: appointments.customerName,
  customerEmail: appointments.customerEmail,
  customerPhone: appointments.customerPhone,
  scheduledAt: appointments.scheduledAt,
  status: appointments.status,
  kind: appointments.kind,
  bookedPriceCents: appointments.bookedPriceCents,
  notes: appointments.notes,
  createdAt: appointments.createdAt,
  updatedAt: appointments.updatedAt,
} as const;

/**
 * Resolve the referenced rows and persist the Appointment with booking-time
 * price snapshots (M1.4). One transaction wraps reference resolution and both
 * inserts (Appointment + add-on junction rows), so a failure anywhere leaves
 * nothing behind — and M3's Slot capacity check-then-insert can later join
 * this same transaction (ADR-0005). Reference resolution is validation: a
 * rejection returns a typed failure whose `message` is the caller-facing
 * wording (module-owned; the route forwards it verbatim). The client never
 * supplies a price — snapshots come from the resolved rows. ADR-0011
 * untouched: `db` is the per-request handle; the transaction lives inside
 * this one request (verified over the live pooler — ADR-0007 amendment).
 */
export async function createAppointment(
  db: Database,
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  return db.transaction(async (tx) => {
    const [branchRow] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, input.branchId));
    if (!branchRow) return fail('branch');

    // M2 ticket 02 interim: the generalized input admits a service-only
    // payload, but the package path still owns this write seam until
    // ticket 03 generalizes intake. A null package ref resolves to no row
    // → the typed 'package' rejection (400), never a 500.
    if (input.servicePackageId === null) return fail('package');

    const [packageRow] = await tx
      .select({
        id: servicePackages.id,
        isActive: servicePackages.isActive,
        priceCents: servicePackages.priceCents,
      })
      .from(servicePackages)
      .where(eq(servicePackages.id, input.servicePackageId));
    if (!packageRow) return fail('package');
    if (!packageRow.isActive) return fail('package_inactive');

    const addonRows =
      input.addonServiceIds.length > 0
        ? await tx
            .select({
              id: addonServices.id,
              name: addonServices.name,
              priceCents: addonServices.priceCents,
              isActive: addonServices.isActive,
            })
            .from(addonServices)
            .where(inArray(addonServices.id, input.addonServiceIds))
        : [];

    if (addonRows.length !== input.addonServiceIds.length) return fail('addon');
    if (addonRows.some((a) => !a.isActive)) return fail('addon_inactive');

    const [appointment] = await tx
      .insert(appointments)
      .values({ ...input, bookedPriceCents: packageRow.priceCents, notes: input.notes ?? null })
      .returning(appointmentProjection);
    if (!appointment) {
      throw new Error('insert appointments: no row returned');
    }

    if (addonRows.length > 0) {
      await tx.insert(appointmentAddonServices).values(
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
  });
}

/**
 * Add-on entries for the given appointment ids in one inArray query (M2
 * ticket 04) — shared by the list and the single-get so both shapes come
 * from one stitch. Entries arrive pre-ordered: createdAt is the append-only
 * monotonic proxy (the junction has no position column; SQL gives no
 * row-order guarantee without an explicit ORDER BY — a later migration if
 * M2's UI needs persisted order). Raw rows carry appointmentId — group raw,
 * project at the attach pass. Every requested id gets an entry list (empty
 * when it has no add-ons) — never undefined.
 */
async function fetchAddonEntries(
  db: Database,
  appointmentIds: string[]
): Promise<Map<string, AppointmentAddonEntry[]>> {
  if (appointmentIds.length === 0) return new Map();

  const addonRows = await db
    .select({
      appointmentId: appointmentAddonServices.appointmentId,
      addonServiceId: appointmentAddonServices.addonServiceId,
      name: addonServices.name,
      priceCents: appointmentAddonServices.priceCents,
    })
    .from(appointmentAddonServices)
    .innerJoin(addonServices, eq(appointmentAddonServices.addonServiceId, addonServices.id))
    .where(inArray(appointmentAddonServices.appointmentId, appointmentIds))
    .orderBy(appointmentAddonServices.createdAt);

  const addonsByAppointment = groupChildren(addonRows, (row) => row.appointmentId);

  const entries = new Map<string, AppointmentAddonEntry[]>();
  for (const appointmentId of appointmentIds) {
    entries.set(
      appointmentId,
      addonsByAppointment(appointmentId).map((a) => ({
        addonServiceId: a.addonServiceId,
        name: a.name,
        priceCents: a.priceCents,
      }))
    );
  }
  return entries;
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
  const rows = await db
    .select(appointmentProjection)
    .from(appointments)
    .where(branchId ? eq(appointments.branchId, branchId) : undefined)
    .orderBy(desc(appointments.createdAt))
    .limit(200);

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const addonsByAppointment = await fetchAddonEntries(db, ids);

  return rows.map((row) => ({ ...row, addonServices: addonsByAppointment.get(row.id) ?? [] }));
}

/**
 * One Appointment with its add-on entries (M2 ticket 04): the same
 * AppointmentWithAddons shape as the list, via the same stitch. Unknown id
 * → null (the route turns it into the uniform 404). Public until M4 like
 * the list (standing decision — this serves the customer's own
 * confirmation read-back; M4's BetterAuth closes both together).
 */
export async function getAppointmentWithAddons(
  db: Database,
  id: string
): Promise<AppointmentWithAddons | null> {
  const [row] = await db
    .select(appointmentProjection)
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  if (!row) return null;

  const addonsByAppointment = await fetchAddonEntries(db, [row.id]);
  return { ...row, addonServices: addonsByAppointment.get(row.id) ?? [] };
}
