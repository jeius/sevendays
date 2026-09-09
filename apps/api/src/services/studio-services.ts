import type { Database } from '@sevendays/db';
import {
  addonServices,
  branchStudioServices,
  studioServiceAddonServices,
  studioServices,
} from '@sevendays/db';
import type { StudioServiceWithBranches } from '@sevendays/types';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';

/**
 * Active Studio Services with the branches each is bookable at and the
 * active add-ons that apply to it (M2 ticket 04 / ticket 07) — the services
 * page and the booking form's offering step read this. Active-only
 * (inactive is invisible on the read surface even when branch links exist);
 * branch ids embedded as bare ids — the branch step filters by membership
 * and joins names from the branches read. Ordered by name (the catalog-read
 * convention); per-service branch ids follow the junction's createdAt
 * proxy, id tiebreak — seeded links share a statement, so intra-service
 * order is id-stable, and membership is the only consumer-facing fact.
 */
export async function listActiveStudioServicesWithBranches(
  db: Database
): Promise<StudioServiceWithBranches[]> {
  const serviceRows = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.isActive, true))
    .orderBy(asc(studioServices.name));

  if (serviceRows.length === 0) return [];

  const serviceIds = serviceRows.map((s) => s.id);

  const linkRows = await db
    .select({
      studioServiceId: branchStudioServices.studioServiceId,
      branchId: branchStudioServices.branchId,
    })
    .from(branchStudioServices)
    .where(inArray(branchStudioServices.studioServiceId, serviceIds));

  const branchesByService = groupChildren(linkRows, (row) => row.studioServiceId);

  // Applicability matrix (ticket 07): the ACTIVE add-ons that apply to each
  // service, same embed pattern as the branch links one junction over. The
  // innerJoin + isActive filter drops links to inactive add-ons — a live
  // link on a dead add-on must not surface in the booking form's matrix
  // (mirrors the intake's activity-before-matrix ruling, ticket 03). Order
  // follows the junction's createdAt proxy, id tiebreak, like the branch
  // ids — membership is the only consumer-facing fact.
  const applicabilityRows = await db
    .select({
      studioServiceId: studioServiceAddonServices.studioServiceId,
      addonServiceId: studioServiceAddonServices.addonServiceId,
    })
    .from(studioServiceAddonServices)
    .innerJoin(addonServices, eq(studioServiceAddonServices.addonServiceId, addonServices.id))
    .where(
      and(
        inArray(studioServiceAddonServices.studioServiceId, serviceIds),
        eq(addonServices.isActive, true)
      )
    );

  const addonsByService = groupChildren(applicabilityRows, (row) => row.studioServiceId);

  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
    applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
  }));
}
