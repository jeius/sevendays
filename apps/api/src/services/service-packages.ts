import type { Database } from '@sevendays/db';
import {
  attires,
  frames,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
} from '@sevendays/db';
import type { ResolvedPrintSize, ServicePackageWithInclusions } from '@sevendays/types';
import { asc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';

/**
 * Active packages with server-resolved lookups (M1.4 Q1=B): the read carries
 * print-size, attire, and frame values instead of bare uuids. Five reads then
 * a stitch — no N+1, no joins-with-aggregates.
 */
export async function listActivePackagesWithInclusions(
  db: Database
): Promise<ServicePackageWithInclusions[]> {
  const packageRows = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.isActive, true))
    .orderBy(asc(servicePackages.name));

  if (packageRows.length === 0) return [];

  const packageIds = packageRows.map((p) => p.id);

  const inclusionRows = await db
    .select()
    .from(packageInclusions)
    .where(inArray(packageInclusions.servicePackageId, packageIds))
    .orderBy(asc(packageInclusions.id));

  const inclusionIds = inclusionRows.map((i) => i.id);
  const printSizeIds = [
    ...new Set(inclusionRows.map((i) => i.printSizeId).filter((id): id is string => id !== null)),
  ];

  // The junction has no position column; insertion order (created_at, then id
  // as tiebreak) is the render order. Distinct statements per junction row
  // (fixtures) give distinct created_at, so this ordering is deterministic.
  const junctionRows =
    inclusionIds.length > 0
      ? await db
          .select({
            inclusionId: packageInclusionAttires.inclusionId,
            id: attires.id,
            name: attires.name,
          })
          .from(packageInclusionAttires)
          .innerJoin(attires, eq(packageInclusionAttires.attireId, attires.id))
          .where(inArray(packageInclusionAttires.inclusionId, inclusionIds))
          .orderBy(asc(packageInclusionAttires.createdAt), asc(packageInclusionAttires.id))
      : [];

  const printSizeRows =
    printSizeIds.length > 0
      ? await db.select().from(printSizes).where(inArray(printSizes.id, printSizeIds))
      : [];

  const frameRows = await db
    .select()
    .from(frames)
    .where(inArray(frames.servicePackageId, packageIds))
    .orderBy(asc(frames.frameNumber));

  const printSizeById = new Map<string, ResolvedPrintSize>();
  for (const s of printSizeRows) {
    printSizeById.set(s.id, { id: s.id, code: s.code, description: s.description });
  }

  // Assembly = groupChildren (order-preserving, empty-group-defaulting);
  // the projections below are shape-building, which stays in this service.
  const attiresByInclusion = groupChildren(junctionRows, (row) => row.inclusionId);

  const framesByPackage = groupChildren(frameRows, (f) => f.servicePackageId);

  const inclusionsByPackage = groupChildren(inclusionRows, (i) => i.servicePackageId);

  return packageRows.map((p) => ({
    ...p,
    inclusions: inclusionsByPackage(p.id).map(
      (i): ServicePackageWithInclusions['inclusions'][number] => ({
        id: i.id,
        kind: i.kind,
        quantity: i.quantity,
        printSize: i.printSizeId ? (printSizeById.get(i.printSizeId) ?? null) : null,
        attires: attiresByInclusion(i.id).map((row) => ({ id: row.id, name: row.name })),
        frameId: i.frameId,
        description: i.description,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })
    ),
    frames: framesByPackage(p.id).map((f) => ({ id: f.id, frameNumber: f.frameNumber })),
  }));
}
