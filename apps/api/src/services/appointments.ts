import type { Database } from '@sevendays/db';
import {
  addonServices,
  appointmentAddonServices,
  appointments,
  branches,
  branchStudioServices,
  servicePackages,
  studioServiceAddonServices,
  studioServices,
} from '@sevendays/db';
import type {
  AppointmentAddonEntry,
  AppointmentWithAddons,
  CreateAppointmentInput,
} from '@sevendays/types';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';

/**
 * The ten intake rejections; wording is module-owned (route stays thin).
 * Ticket 03 adds the service-path cases + the past-datetime floor — the
 * five package-path wordings are UNCHANGED (suites assert them verbatim).
 */
const REJECTION_MESSAGES = {
  branch: 'Unknown branchId.',
  package: 'Unknown servicePackageId.',
  package_inactive: 'Service Package is inactive.',
  addon: 'Unknown addonServiceId.',
  addon_inactive: 'Add-on Service is inactive.',
  service: 'Unknown studioServiceId.',
  service_inactive: 'Studio Service is inactive.',
  service_not_bookable_at_branch: "That service isn't offered at the branch you picked.",
  addon_not_applicable: "That add-on doesn't apply to the service you picked.",
  past_datetime: 'Your chosen schedule is already in the past. Please pick a future date and time.',
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
 * price snapshots (M1.4; ticket 03 generalizes the offering). One
 * transaction wraps reference resolution and both inserts (Appointment +
 * add-on junction rows), so a failure anywhere leaves nothing behind — and
 * M3's Slot capacity check-then-insert can later join this same transaction
 * (ADR-0005). The offering is exactly one of a Service Package or a Studio
 * Service (the create schema's refine dispatches the path): the service
 * path adds activity, bookability-at-branch, and add-on-matrix checks; the
 * past-datetime floor applies to both paths before offering resolution.
 * Reference resolution is validation: a rejection returns a typed failure
 * whose `message` is the caller-facing wording (module-owned; the route
 * forwards it verbatim). The client never supplies a price — snapshots
 * come from the resolved rows. ADR-0011 untouched: `db` is the per-request
 * handle; the transaction lives inside this one request (verified over the
 * live pooler — ADR-0007 amendment).
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

    // The floor (ticket 03): at-or-before the current instant → the typed
    // 'past_datetime' rejection. PH is fixed UTC+8 with no DST, so "before
    // now in Asia/Manila" IS "before now on the UTC instant" — a plain
    // instant comparison, no tz arithmetic, and createAppointmentSchema
    // stays shape-only (spec ruling). Evaluated after the branch resolve
    // and before offering resolution — a rejected clock never reaches the
    // junction queries.
    if (input.scheduledAt.getTime() <= Date.now()) return fail('past_datetime');

    // Offering resolution (ticket 03): the generalized input carries
    // exactly one ref (the create schema's refine); which one dispatches
    // the path. Package path: unknown/inactive (unchanged). Service path:
    // unknown → inactive → bookable at THIS branch, all inside this same
    // transaction (the one write seam, ADR-0005).
    let offeringPriceCents: number;
    let serviceId: string | null = null;
    if (input.servicePackageId !== null) {
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
      offeringPriceCents = packageRow.priceCents;
    } else {
      if (input.studioServiceId === null) return fail('service'); // refine-guaranteed; narrows for TS
      serviceId = input.studioServiceId;
      const [serviceRow] = await tx
        .select({
          id: studioServices.id,
          isActive: studioServices.isActive,
          priceCents: studioServices.priceCents,
        })
        .from(studioServices)
        .where(eq(studioServices.id, serviceId));
      if (!serviceRow) return fail('service');
      if (!serviceRow.isActive) return fail('service_inactive');
      const [bookable] = await tx
        .select({ id: branchStudioServices.id })
        .from(branchStudioServices)
        .where(
          and(
            eq(branchStudioServices.studioServiceId, serviceId),
            eq(branchStudioServices.branchId, input.branchId)
          )
        )
        .limit(1);
      if (!bookable) return fail('service_not_bookable_at_branch');
      offeringPriceCents = serviceRow.priceCents;
    }

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

    // Service bookings accept only matrix-linked add-ons (ticket 03); the
    // package path never consults the matrix (uniform all-active rule,
    // unchanged). Requested ids are deduped by the create schema, so the
    // linked subset's length against the requested length is a sound
    // membership check.
    if (serviceId !== null && addonRows.length > 0) {
      const linkedRows = await tx
        .select({ addonServiceId: studioServiceAddonServices.addonServiceId })
        .from(studioServiceAddonServices)
        .where(
          and(
            eq(studioServiceAddonServices.studioServiceId, serviceId),
            inArray(studioServiceAddonServices.addonServiceId, input.addonServiceIds)
          )
        );
      if (linkedRows.length !== addonRows.length) return fail('addon_not_applicable');
    }

    const [appointment] = await tx
      .insert(appointments)
      .values({ ...input, bookedPriceCents: offeringPriceCents, notes: input.notes ?? null })
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
