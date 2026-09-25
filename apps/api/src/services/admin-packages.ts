import type { Database } from '@sevendays/db';
import {
  attires,
  frames,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
} from '@sevendays/db';
import { slugifyName } from '@sevendays/db/catalog-rows';
import type {
  CreateServicePackageInput,
  PackageSaveInclusionInput,
  ServicePackageRead,
  ServicePackageWithInclusions,
  UpdateServicePackageInput,
} from '@sevendays/types';
import { and, asc, eq, inArray, ne, or } from 'drizzle-orm';
import type { Env } from '../env.js';
import {
  type AdminCreateResult,
  AdminSaveError,
  type AdminWriteFailure,
  type AdminWriteResult,
  conflict,
  guardUnique,
} from './admin-shared.js';
import { commitUpload, resolveMediaUrl } from './media.js';
import { assemblePackageRead } from './service-packages.js';

// The package write model (M5 #137, spec § Mutation shapes): one atomic
// save — entity fields + coverImageKey + frames[] + inclusions[] in ONE
// transaction. Array order is the order: frameNumber = frames array order,
// inclusion position = array order, junction position = attire order per
// inclusion (all 1-based). Children are REWRITTEN (delete + insert) inside
// the transaction — nothing references frame/inclusion ids durably
// (appointments snapshot at the package level; reads re-assemble per
// request), so row-id churn is invisible. A bad reference throws
// AdminSaveError INSIDE the transaction — a returned failure value would
// COMMIT the rows already written; the throw is what makes drizzle roll
// back (the "no partial junction writes" guarantee). The whole transaction
// rides guardUnique so a raced 23505 lands in the same 400 vocabulary.

type PackageRow = typeof servicePackages.$inferSelect;
type Detail = { path: string[]; message: string };
type PackageTxOutcome = { ok: true } | { ok: false; reason: 'not_found' };

export type SaveEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

const PACKAGE_UNIQUE: Record<string, string> = {
  service_packages_name_unique: 'name',
  service_packages_slug_unique: 'slug',
};

// The advanced-slug format (agent ruling): exactly the alphabet
// slugifyName emits — lowercase letters/digits joined by single dashes.
// Keeps the /packages/:slug URL space stable; the editor's break-links
// warning precedes this in the UI.
const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function toRead(row: ServicePackageWithInclusions, env: SaveEnv): ServicePackageRead {
  // The wire rename (ADR-0019): strip the raw key, resolve the absolute URL.
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

/**
 * The five reads + stitch scoped to the given rows — the public readers'
 * query bodies with NO activity filter anywhere (admin reads include
 * deactivated rows and always assemble the FULL composition). Order pin:
 * inclusions AND junctions by (position, id) — the save rewrites children
 * with fresh uuids, so an id-ordering would scramble after the first PUT;
 * positions are the maintained order. (The public reads keep created_at/id
 * until #138.)
 */
async function fetchComposition(
  db: Database,
  packageRows: PackageRow[]
): Promise<ServicePackageWithInclusions[]> {
  const packageIds = packageRows.map((p) => p.id);
  const inclusionRows = await db
    .select()
    .from(packageInclusions)
    .where(inArray(packageInclusions.servicePackageId, packageIds))
    .orderBy(asc(packageInclusions.position), asc(packageInclusions.id));
  const inclusionIds = inclusionRows.map((i) => i.id);
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
          .orderBy(asc(packageInclusionAttires.position), asc(packageInclusionAttires.id))
      : [];
  const printSizeIds = [
    ...new Set(inclusionRows.map((i) => i.printSizeId).filter((id): id is string => id !== null)),
  ];
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

export async function listAdminPackages(db: Database, env: SaveEnv): Promise<ServicePackageRead[]> {
  const packageRows = await db.select().from(servicePackages).orderBy(asc(servicePackages.name));
  if (packageRows.length === 0) return [];
  const assembled = await fetchComposition(db, packageRows);
  return assembled.map((row) => toRead(row, env));
}

export async function getAdminPackage(
  db: Database,
  env: SaveEnv,
  id: string
): Promise<ServicePackageRead | null> {
  const [row] = await db.select().from(servicePackages).where(eq(servicePackages.id, id)).limit(1);
  if (!row) return null;
  const [assembled] = await fetchComposition(db, [row]);
  return assembled ? toRead(assembled, env) : null;
}

type CoverResolution = { ok: true; finalKey: string | null | undefined } | AdminWriteFailure;

/**
 * The cover commit (controller ruling): HEAD-verify through ticket 02's
 * commitUpload ONLY when a key is present — presence-encoding makes
 * "changed" structural (stored keys are immutable final keys, inputs are
 * staging keys, and the staging-key regex rejects final keys, so a present
 * string is always a new bind). undefined = unchanged, null = clear,
 * string = bind/replace. A commit failure re-paths its details onto the
 * payload field and resolves as the conflict failure (→ 400). Runs BEFORE
 * the transaction — bucket I/O never holds a tx open.
 */
async function resolveCover(
  env: SaveEnv,
  key: string | null | undefined
): Promise<CoverResolution> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'package-cover',
  });
  if (!commit.ok) {
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): Detail => ({ path: ['coverImageKey'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}

function entityFields(input: CreateServicePackageInput | UpdateServicePackageInput) {
  return {
    name: input.name,
    description: input.description,
    priceCents: input.priceCents,
    durationMinutes: input.durationMinutes,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
  };
}

/**
 * The transaction body's order is deliberate: current-row resolve → name/
 * slug pre-checks → ROW WRITE → reference checks → children rewrite. The
 * reference checks run AFTER the row write so the rollback is observable —
 * an invalid reference throwing once the entity row is written is exactly
 * what the PUT-rollback test asserts (the rename did not stick).
 */
async function runPackageSave(
  db: Database,
  env: SaveEnv,
  args: {
    input: CreateServicePackageInput | UpdateServicePackageInput;
    slug: string;
    finalKey: string | null | undefined;
    updateId: string | null;
  }
): Promise<AdminWriteResult<ServicePackageRead>> {
  let packageId = args.updateId ?? '';
  let oldCoverKey: string | null = null;
  let outcome: { ok: true; row: PackageTxOutcome } | AdminWriteFailure;
  try {
    outcome = await guardUnique(PACKAGE_UNIQUE, () =>
      db.transaction(async (tx): Promise<PackageTxOutcome> => {
        if (args.updateId !== null) {
          const [current] = await tx
            .select()
            .from(servicePackages)
            .where(eq(servicePackages.id, args.updateId))
            .limit(1);
          if (!current) return { ok: false, reason: 'not_found' };
          oldCoverKey = current.coverImageKey;
          if (args.input.name !== current.name) {
            const [nameClash] = await tx
              .select({ id: servicePackages.id })
              .from(servicePackages)
              .where(
                and(
                  eq(servicePackages.name, args.input.name),
                  ne(servicePackages.id, args.updateId)
                )
              )
              .limit(1);
            if (nameClash) throw new AdminSaveError(conflict('name'));
          }
          if (args.slug !== current.slug) {
            const [slugClash] = await tx
              .select({ id: servicePackages.id })
              .from(servicePackages)
              .where(
                and(eq(servicePackages.slug, args.slug), ne(servicePackages.id, args.updateId))
              )
              .limit(1);
            if (slugClash) throw new AdminSaveError(conflict('slug'));
          }
          const storedCover = args.finalKey === undefined ? current.coverImageKey : args.finalKey;
          await tx
            .update(servicePackages)
            .set({
              ...entityFields(args.input),
              slug: args.slug,
              coverImageKey: storedCover,
              updatedAt: new Date(),
            })
            .where(eq(servicePackages.id, args.updateId));
        } else {
          const [clash] = await tx
            .select({ name: servicePackages.name })
            .from(servicePackages)
            .where(
              or(eq(servicePackages.name, args.input.name), eq(servicePackages.slug, args.slug))
            )
            .limit(1);
          if (clash) {
            // The spec's ruling: a create-time slug collision IS a name
            // collision. They part ways only when a different name collapses
            // to the same slug — name whichever field actually clashed.
            throw new AdminSaveError(conflict(clash.name === args.input.name ? 'name' : 'slug'));
          }
          const [created] = await tx
            .insert(servicePackages)
            .values({
              ...entityFields(args.input),
              slug: args.slug,
              coverImageKey: args.finalKey ?? null,
            })
            .returning({ id: servicePackages.id });
          if (!created) throw new Error('insert service_packages: no row returned');
          packageId = created.id;
        }

        // Reference resolution (inside the tx — a throw rolls back everything).
        const printSizeIds = [
          ...new Set(
            args.input.inclusions
              .map((i) => i.printSizeId)
              .filter((id): id is string => id !== null)
          ),
        ];
        if (printSizeIds.length > 0) {
          const known = await tx
            .select({ id: printSizes.id })
            .from(printSizes)
            .where(inArray(printSizes.id, printSizeIds));
          const knownIds = new Set(known.map((r) => r.id));
          const missing = printSizeIds.filter((lookupId) => !knownIds.has(lookupId));
          if (missing.length > 0) {
            throw new AdminSaveError({
              ok: false,
              reason: 'invalid',
              message: 'Unknown print size in inclusions.',
              details: missing.map(
                (lookupId): Detail => ({
                  path: ['inclusions'],
                  message: `unknown printSizeId ${lookupId}`,
                })
              ),
            });
          }
        }
        const attireIds = [...new Set(args.input.inclusions.flatMap((i) => i.attireIds))];
        if (attireIds.length > 0) {
          const known = await tx
            .select({ id: attires.id })
            .from(attires)
            .where(inArray(attires.id, attireIds));
          const knownIds = new Set(known.map((r) => r.id));
          const missing = attireIds.filter((attireId) => !knownIds.has(attireId));
          if (missing.length > 0) {
            throw new AdminSaveError({
              ok: false,
              reason: 'invalid',
              message: 'Unknown attire in inclusions.',
              details: missing.map(
                (attireId): Detail => ({
                  path: ['inclusions'],
                  message: `unknown attireId ${attireId}`,
                })
              ),
            });
          }
        }

        // Rewrite the children. Deleting inclusions cascades their junction
        // rows (package_inclusion_attires.inclusion_id ON DELETE CASCADE);
        // the explicit order is inclusions BEFORE frames (inclusions hold the
        // frame FK).
        await tx.delete(packageInclusions).where(eq(packageInclusions.servicePackageId, packageId));
        await tx.delete(frames).where(eq(frames.servicePackageId, packageId));
        const frameRows =
          args.input.frames.length > 0
            ? await tx
                .insert(frames)
                .values(
                  args.input.frames.map((frame, index) => ({
                    servicePackageId: packageId,
                    frameNumber: index + 1,
                  }))
                )
                .returning({ id: frames.id })
            : [];
        const frameIdByToken = new Map<string, string>();
        args.input.frames.forEach((frame, index) => {
          const row = frameRows[index];
          if (row) frameIdByToken.set(frame.id, row.id);
        });
        const inclusionRows =
          args.input.inclusions.length > 0
            ? await tx
                .insert(packageInclusions)
                .values(
                  args.input.inclusions.map((inclusion: PackageSaveInclusionInput, index) => ({
                    servicePackageId: packageId,
                    kind: inclusion.kind,
                    quantity: inclusion.quantity,
                    printSizeId: inclusion.printSizeId,
                    frameId: inclusion.frameId
                      ? (frameIdByToken.get(inclusion.frameId) ?? null)
                      : null,
                    description: inclusion.description,
                    position: index + 1,
                  }))
                )
                .returning({ id: packageInclusions.id })
            : [];
        const junctionPairs = args.input.inclusions.flatMap(
          (inclusion: PackageSaveInclusionInput, index) => {
            const inclusionRow = inclusionRows[index];
            if (!inclusionRow)
              throw new Error('insert package_inclusions: fewer rows than entries');
            // Duplicate attire ids collapse (the booking schema's dedupe precedent).
            return [...new Set(inclusion.attireIds)].map((attireId, attireIndex) => ({
              inclusionId: inclusionRow.id,
              attireId,
              position: attireIndex + 1,
            }));
          }
        );
        if (junctionPairs.length > 0) {
          await tx.insert(packageInclusionAttires).values(junctionPairs);
        }
        return { ok: true };
      })
    );
  } catch (error) {
    // The rollback channel's other half (admin-shared.ts's AdminSaveError
    // contract — "caught by the save's caller and mapped back into the same
    // union"): the throw already aborted the transaction, so the carried
    // failure resolves here. Anything that is not a save error keeps
    // propagating (guardUnique already passed it through; the root onError
    // owns the uniform 500).
    if (error instanceof AdminSaveError) return error.failure;
    throw error;
  }
  if (!outcome.ok) return outcome;
  const saved = outcome.row;
  if (!saved.ok) return saved;
  // After-commit bucket hygiene: the replaced/cleared cover's old object is
  // deleted only AFTER the save committed — a rolled-back save never deletes
  // (the row still points at it), and in-place overwrite never happens.
  const storedAfter = args.finalKey === undefined ? oldCoverKey : args.finalKey;
  if (oldCoverKey && storedAfter !== oldCoverKey) {
    await env.MEDIA_BUCKET.delete(oldCoverKey);
  }
  const read = await getAdminPackage(db, env, packageId);
  if (!read) throw new Error('package save: read-back after commit found no row');
  return { ok: true, row: read };
}

export async function createAdminPackage(
  db: Database,
  env: SaveEnv,
  input: CreateServicePackageInput
): Promise<AdminCreateResult<ServicePackageRead>> {
  const cover = await resolveCover(env, input.coverImageKey);
  if (!cover.ok) return cover;
  const slug = slugifyName(input.name);
  const result = await runPackageSave(db, env, {
    input,
    slug,
    finalKey: cover.finalKey,
    updateId: null,
  });
  // The save's not_found branch is PUT-only (it fires when updateId misses);
  // with updateId statically null it cannot fire — the guard keeps the wider
  // AdminWriteResult honest at the type level instead of a cast.
  if (!result.ok && result.reason === 'not_found') {
    throw new Error('package create: not_found is unreachable (updateId is null)');
  }
  return result;
}

export async function updateAdminPackage(
  db: Database,
  env: SaveEnv,
  id: string,
  input: UpdateServicePackageInput
): Promise<AdminWriteResult<ServicePackageRead>> {
  if (!SLUG_FORMAT.test(input.slug)) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Invalid slug.',
      details: [
        { path: ['slug'], message: 'must be lowercase letters, digits, and single dashes' },
      ],
    };
  }
  const cover = await resolveCover(env, input.coverImageKey);
  if (!cover.ok) return cover;
  return runPackageSave(db, env, {
    input,
    slug: input.slug,
    finalKey: cover.finalKey,
    updateId: id,
  });
}
