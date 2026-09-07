import type { Database } from '@sevendays/db';
import { branchStudioServices, studioServices } from '@sevendays/db';
import type { StudioServiceWithBranches } from '@sevendays/types';
import { asc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';

/**
 * Active Studio Services with the branches each is bookable at (M2 ticket
 * 04) — the services page and the booking form's offering step read this.
 * Active-only (inactive is invisible on the read surface even when branch
 * links exist); branch ids embedded as bare ids — the branch step filters
 * by membership and joins names from the branches read. Ordered by name
 * (the catalog-read convention); per-service branch ids follow the
 * junction's createdAt proxy, id tiebreak — seeded links share a statement,
 * so intra-service order is id-stable, and membership is the only
 * consumer-facing fact.
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

  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
  }));
}
