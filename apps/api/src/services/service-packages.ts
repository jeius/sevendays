import type { Database } from '@sevendays/db';
import {
  attires,
  frames,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
} from '@sevendays/db';
import type {
  ResolvedPrintSize,
  ServicePackageRead,
  ServicePackageWithInclusions,
} from '@sevendays/types';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Env } from '../env.js';
import { groupChildren } from './group-children.js';
import { resolveMediaUrl } from './media.js';

// The junction-row projection both reads select (attire id + name keyed by
// inclusionId) — a projected shape, not a table row type.
type JunctionRow = { inclusionId: string; id: string; name: string };

type MediaEnv = Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>;

/**
 * Shared assembly for both package reads (M2 ticket 04): the list and the
 * by-slug getter must emit the identical ServicePackageWithInclusions shape,
 * so the stitch lives in ONE function both call. The print-size lookup map
 * is assembly (it joins fetched values, not rows), so it moved here with
 * the stitch — fetching (which queries, which ordering) stays in the
 * callers. Callers deliver rows in their pinned orders (inclusions by
 * (position, id), junctions by (position, id), frames by frameNumber — the
 * position keys are live since #137/#138; assembly never re-sorts, the
 * groupChildren contract). Exported for #137's admin reads: the admin
 * assembles the FULL composition (no activity filter) through this same
 * stitch — callers own the ordering, so the admin passes (position, id)-
 * ordered rows.
 */
export function assemblePackageRead(
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
 * The wire rename (ADR-0019, #138's swap): the public read strips the raw
 * object key and resolves the absolute URL — a null key stays null (the
 * placeholder posture on the landing). Same projection as #137's admin
 * `toRead`, kept module-local here so the public service never imports from
 * the admin module (self-contained for the v1 split's transformed surface).
 */
function toPublicRead(row: ServicePackageWithInclusions, env: MediaEnv): ServicePackageRead {
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

/**
 * The five reads + stitch scoped to the given package rows — the public
 * composition with the M5 trim rules (#138) and the (position, id) ordering
 * keys the atomic save maintains:
 * - inclusions order (position, id); the junction query joins attires with
 *   `isActive = true` and orders (position, id) — a deactivated attire
 *   trims from its inclusion's list while the inclusion still renders
 *   (groupChildren defaults the emptied group to []).
 * - print sizes fetch ACTIVE-only for the referenced set; any inclusion
 *   whose non-null printSizeId misses the active set is dropped BEFORE the
 *   stitch — a deactivated print size hides its referencing inclusion
 *   entirely (privileges carry printSizeId null and never hide).
 * - a package whose inclusions all trim away still lists (its inclusion
 *   array is simply empty).
 * The admin's fetchComposition (#137) is the full-composition counterpart —
 * no activity filter, no trim — never merge the two.
 */
async function fetchPublicComposition(
  db: Database,
  packageRows: (typeof servicePackages.$inferSelect)[]
): Promise<ServicePackageWithInclusions[]> {
  const packageIds = packageRows.map((p) => p.id);

  const inclusionRows = await db
    .select()
    .from(packageInclusions)
    .where(inArray(packageInclusions.servicePackageId, packageIds))
    .orderBy(asc(packageInclusions.position), asc(packageInclusions.id));

  const printSizeIds = [
    ...new Set(inclusionRows.map((i) => i.printSizeId).filter((id): id is string => id !== null)),
  ];
  const printSizeRows =
    printSizeIds.length > 0
      ? await db
          .select()
          .from(printSizes)
          .where(and(inArray(printSizes.id, printSizeIds), eq(printSizes.isActive, true)))
      : [];

  // The trim rule (print sizes): only active sizes resolve, so an inclusion
  // referencing a deactivated size drops here — before the stitch, so the
  // junction query never even sees its id.
  const activePrintSizeIds = new Set(printSizeRows.map((s) => s.id));
  const inclusionRowsTrimmed = inclusionRows.filter(
    (i) => i.printSizeId === null || activePrintSizeIds.has(i.printSizeId)
  );

  const inclusionIds = inclusionRowsTrimmed.map((i) => i.id);
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
          .where(
            and(
              inArray(packageInclusionAttires.inclusionId, inclusionIds),
              eq(attires.isActive, true)
            )
          )
          .orderBy(asc(packageInclusionAttires.position), asc(packageInclusionAttires.id))
      : [];

  const frameRows = await db
    .select()
    .from(frames)
    .where(inArray(frames.servicePackageId, packageIds))
    .orderBy(asc(frames.frameNumber));

  return assemblePackageRead(
    packageRows,
    inclusionRowsTrimmed,
    junctionRows,
    printSizeRows,
    frameRows
  );
}

/**
 * Active packages with server-resolved lookups (M1.4 Q1=B) under the M5
 * read contract (#138): trim rules, (position, id) ordering, and the
 * coverImageKey → coverImageUrl wire rename. Packages stay name-ordered
 * (no position column exists on the table).
 */
export async function listActivePackagesWithInclusions(
  db: Database,
  env: MediaEnv
): Promise<ServicePackageRead[]> {
  const packageRows = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.isActive, true))
    .orderBy(asc(servicePackages.name));

  if (packageRows.length === 0) return [];

  const assembled = await fetchPublicComposition(db, packageRows);
  return assembled.map((row) => toPublicRead(row, env));
}

/**
 * One ACTIVE package by slug under the M5 read contract (#138): the same
 * trim rules, ordering, and resolved coverImageUrl as the list, assembled
 * by the same composition. Unknown slug OR inactive package → null (the
 * route turns it into the uniform 404 — deactivated is invisible on the
 * public surface). The single-slug fetch re-uses the list's exact
 * composition scoped to one package id, so ordering and projection stay
 * identical by construction.
 */
export async function getActivePackageWithInclusionsBySlug(
  db: Database,
  env: MediaEnv,
  slug: string
): Promise<ServicePackageRead | null> {
  const [packageRow] = await db
    .select()
    .from(servicePackages)
    .where(and(eq(servicePackages.slug, slug), eq(servicePackages.isActive, true)))
    .limit(1);
  if (!packageRow) return null;

  const [assembled] = await fetchPublicComposition(db, [packageRow]);
  return assembled ? toPublicRead(assembled, env) : null;
}
