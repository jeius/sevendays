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
import { and, asc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';

// The junction-row projection both reads select (attire id + name keyed by
// inclusionId) — a projected shape, not a table row type.
type JunctionRow = { inclusionId: string; id: string; name: string };

/**
 * Shared assembly for both package reads (M2 ticket 04): the list and the
 * by-slug getter must emit the identical ServicePackageWithInclusions shape,
 * so the stitch lives in ONE function both call. The print-size lookup map
 * is assembly (it joins fetched values, not rows), so it moved here with
 * the stitch — fetching (which queries, which ordering) stays in the
 * callers. Callers deliver rows in their pinned orders (inclusions by id,
 * junctions by created_at + id, frames by frameNumber); assembly never
 * re-sorts (groupChildren contract).
 */
function assemblePackageRead(
  packageRows: (typeof servicePackages.$inferSelect)[],
  inclusionRows: (typeof packageInclusions.$inferSelect)[],
  junctionRows: JunctionRow[],
  printSizeRows: (typeof printSizes.$inferSelect)[],
  frameRows: (typeof frames.$inferSelect)[]
): ServicePackageWithInclusions[] {
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

  return assemblePackageRead(packageRows, inclusionRows, junctionRows, printSizeRows, frameRows);
}

/**
 * One ACTIVE package by slug with resolved lookups (M2 ticket 04): the same
 * ServicePackageWithInclusions shape as the list, assembled by the same
 * function. Unknown slug OR inactive package → null (the route turns it
 * into the uniform 404 — "one active package", inactive is invisible on
 * the booking surface). The single-slug fetch re-uses the list's exact
 * query bodies scoped to one package id, so ordering and projection stay
 * identical by construction.
 */
export async function getActivePackageWithInclusionsBySlug(
  db: Database,
  slug: string
): Promise<ServicePackageWithInclusions | null> {
  const [packageRow] = await db
    .select()
    .from(servicePackages)
    .where(and(eq(servicePackages.slug, slug), eq(servicePackages.isActive, true)))
    .limit(1);
  if (!packageRow) return null;

  const inclusionRows = await db
    .select()
    .from(packageInclusions)
    .where(eq(packageInclusions.servicePackageId, packageRow.id))
    .orderBy(asc(packageInclusions.id));

  const inclusionIds = inclusionRows.map((i) => i.id);
  const printSizeIds = [
    ...new Set(inclusionRows.map((i) => i.printSizeId).filter((id): id is string => id !== null)),
  ];

  // Same junction query + ordering comment as the list (created_at, then id
  // as tiebreak — the junction has no position column).
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
    .where(inArray(frames.servicePackageId, [packageRow.id]))
    .orderBy(asc(frames.frameNumber));

  const [assembled] = assemblePackageRead(
    [packageRow],
    inclusionRows,
    junctionRows,
    printSizeRows,
    frameRows
  );
  return assembled ?? null;
}
