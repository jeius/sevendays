// Re-runnable catalog seeder: one transaction, natural-key upserts, per-package
// inclusion rebuild. Reruns never duplicate rows; branch/lookup/package ids stay
// stable — inclusion rows are deleted and rebuilt per package (with their
// junction rows, which cascade).
// Run: pnpm --filter @sevendays/db db:seed
import process from 'node:process';
import { eq, sql } from 'drizzle-orm';
import {
  assertAllKnownAttires,
  buildFrameRowValues,
  buildInclusionRowValues,
  buildJunctionPairs,
  type FrameRowValues,
  type InclusionEntry,
  type PictureEntry,
  type PrivilegeEntry,
  slugifyName,
} from '../src/catalog-rows.js';
import {
  addonServices,
  attires,
  branches,
  branchStudioServices,
  createDbClient,
  frames,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
  studioServiceAddonServices,
  studioServices,
} from '../src/index.js';
import {
  addonServiceSeeds,
  attireSeeds,
  branchSeeds,
  featuredPackageNames,
  packageSeeds,
  printSizeSeeds,
  privilegeSeeds,
  studioServiceApplicableAddons,
  studioServiceSeeds,
} from './catalog.js';

const url = process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    'No database URL: packages/db/.env must define DATABASE_MIGRATE_URL (session-mode pooler, port 5432). Run scripts/check-env.mjs.'
  );
  process.exit(1);
}

const db = createDbClient(url);

try {
  await db.transaction(async (tx) => {
    // Lookups — upsert by unique code / name.
    for (const size of printSizeSeeds) {
      await tx
        .insert(printSizes)
        .values({ code: size.code, description: size.description })
        .onConflictDoUpdate({ target: printSizes.code, set: { description: size.description } });
    }

    // Atomic attires (ADR-0009 revision): 4 rows; combined contexts are
    // composed per inclusion via the junction, not stored as names.
    for (const attire of attireSeeds) {
      await tx.insert(attires).values({ name: attire.name }).onConflictDoNothing();
    }

    const printSizeRows = await tx.select().from(printSizes);
    const attireRows = await tx.select().from(attires);
    const printSizeId = new Map(printSizeRows.map((r) => [r.code, r.id]));
    const attireIdMap = new Map(attireRows.map((r) => [r.name, r.id]));

    // Branches + add-on services — upsert by unique name.
    for (const branch of branchSeeds) {
      await tx
        .insert(branches)
        .values(branch)
        .onConflictDoUpdate({
          target: branches.name,
          set: {
            address: branch.address,
            phone: branch.phone,
            acceptsWalkIns: branch.acceptsWalkIns,
          },
        });
    }

    for (const addon of addonServiceSeeds) {
      await tx
        .insert(addonServices)
        .values(addon)
        .onConflictDoUpdate({
          target: addonServices.name,
          set: {
            description: addon.description,
            priceCents: addon.priceCents,
            isActive: addon.isActive,
          },
        });
    }

    // M2 ticket 01 — Studio Services + junctions. Natural-key upsert by name;
    // junctions rebuild delete-then-insert per service so the DB stays
    // exactly in sync with scripts/catalog.ts on every run.
    const studioServiceIdByName = new Map<string, string>();
    for (const svc of studioServiceSeeds) {
      const [row] = await tx
        .insert(studioServices)
        .values(svc)
        .onConflictDoUpdate({
          target: studioServices.name,
          set: { description: svc.description, priceCents: svc.priceCents, isActive: true },
        })
        .returning({ id: studioServices.id });
      if (!row) throw new Error(`seed: upsert returned no row for studio service ${svc.name}`);
      studioServiceIdByName.set(svc.name, row.id);
    }

    const branchRows = await tx.select({ id: branches.id, name: branches.name }).from(branches);

    // Bookability: every seeded service bookable at every branch (spec
    // ruling — the prototype's not-Calamba Portraits stub was demo-only).
    for (const svc of studioServiceSeeds) {
      const serviceId = studioServiceIdByName.get(svc.name);
      if (!serviceId) throw new Error(`seed: no id for studio service ${svc.name}`);
      await tx
        .delete(branchStudioServices)
        .where(eq(branchStudioServices.studioServiceId, serviceId));
      await tx
        .insert(branchStudioServices)
        .values(branchRows.map((b) => ({ studioServiceId: serviceId, branchId: b.id })));
    }

    // Applicability: only the add-ons listed per service get junction rows;
    // an unknown add-on name fails loudly (a typo can't silently shrink the
    // matrix the booking form and API will trust).
    const addonRows = await tx
      .select({ id: addonServices.id, name: addonServices.name })
      .from(addonServices);
    const addonIdByName = new Map(addonRows.map((r) => [r.name, r.id]));
    for (const svc of studioServiceSeeds) {
      const serviceId = studioServiceIdByName.get(svc.name);
      if (!serviceId) throw new Error(`seed: no id for studio service ${svc.name}`);
      await tx
        .delete(studioServiceAddonServices)
        .where(eq(studioServiceAddonServices.studioServiceId, serviceId));
      const applicable = studioServiceApplicableAddons[svc.name] ?? [];
      if (applicable.length === 0) continue;
      const values = applicable.map((addonName) => {
        const addonId = addonIdByName.get(addonName);
        if (!addonId)
          throw new Error(`seed: applicability references unknown add-on "${addonName}"`);
        return { studioServiceId: serviceId, addonServiceId: addonId };
      });
      await tx.insert(studioServiceAddonServices).values(values);
    }

    // M2 ticket 01: resolve every slug up front and fail loudly on a
    // duplicate (two names slugifying identically would otherwise trip the
    // unique constraint mid-transaction).
    const slugByPackageName = new Map<string, string>();
    for (const pkg of packageSeeds) {
      const slug = slugifyName(pkg.name);
      for (const [owner, existing] of slugByPackageName) {
        if (existing === slug)
          throw new Error(
            `seed: slug collision — "${pkg.name}" and "${owner}" both slugify to "${slug}"`
          );
      }
      slugByPackageName.set(pkg.name, slug);
    }
    const featuredNames = new Set<string>(featuredPackageNames);

    // Packages — upsert by unique name. Deliberately does NOT touch
    // coverImageKey (Milestone 5 uploads it; reseeding must not null it).
    // slug backfills a NULL (first post-0002 seed) but never rewrites an
    // existing slug — /packages/:slug URLs survive catalog renames.
    for (const pkg of packageSeeds) {
      const [row] = await tx
        .insert(servicePackages)
        .values({
          name: pkg.name,
          description: pkg.description,
          priceCents: pkg.priceCents,
          // Every packageSeeds entry has a resolved slug (the up-front loop
          // above guarantees it) — the guard only satisfies noUncheckedIndexedAccess.
          slug:
            slugByPackageName.get(pkg.name) ??
            (() => {
              throw new Error(`seed: no slug resolved for package ${pkg.name}`);
            })(),
          isFeatured: featuredNames.has(pkg.name),
        })
        .onConflictDoUpdate({
          target: servicePackages.name,
          set: {
            description: pkg.description,
            priceCents: pkg.priceCents,
            isFeatured: featuredNames.has(pkg.name),
            slug: sql`coalesce(${servicePackages.slug}, excluded.slug)`,
          },
        })
        .returning({ id: servicePackages.id });
      if (!row) throw new Error(`seed: upsert returned no row for package ${pkg.name}`);

      // Frames — upsert per (package, frameNumber); reseed keeps ids stable
      // for unchanged frames so CMS references survive (ADR-0009 revision).
      const frameId = new Map<number, string>();
      for (const fp of pkg.framedPictures) {
        const [frameRow] = await tx
          .insert(frames)
          .values(
            ...(buildFrameRowValues({
              servicePackageId: row.id,
              frameNumbers: [fp.frameNumber],
            }) as [FrameRowValues])
          )
          .onConflictDoUpdate({
            target: [frames.servicePackageId, frames.frameNumber],
            set: { frameNumber: fp.frameNumber },
          })
          .returning({ id: frames.id });
        if (!frameRow)
          throw new Error(`seed: upsert returned no frame for ${pkg.name} #${fp.frameNumber}`);
        frameId.set(fp.frameNumber, frameRow.id);
      }

      // Rebuild this package's inclusions (delete-then-insert keeps the
      // catalog exactly in sync with docs/catalog.md on every run; junction
      // rows cascade-delete with their inclusions).
      await tx.delete(packageInclusions).where(eqPackageInclusions(row.id));

      // Entries in the catalog's own order: framed pictures, then prints,
      // then the universal privileges. The builders shape rows and junction
      // pairs; the returning-order cursor pairing below stays valid because
      // the values array order matches the returning order.
      const entries: InclusionEntry[] = [
        ...pkg.framedPictures.map(
          (f, _i): PictureEntry => ({
            kind: 'framed_picture',
            quantity: 1,
            printSizeCode: f.printSizeCode,
            attireNames: [...f.attireNames],
            frameId: frameId.get(f.frameNumber) ?? null,
          })
        ),
        ...pkg.prints.map(
          (p): PictureEntry => ({
            kind: 'print',
            quantity: p.quantity,
            printSizeCode: p.printSizeCode,
            attireNames: [...p.attireNames],
          })
        ),
        ...privilegeSeeds.map(
          (p): PrivilegeEntry => ({
            kind: 'privilege',
            description: p.description,
            attireNames: [...p.attireNames],
          })
        ),
      ];
      assertAllKnownAttires({ entries, attireId: attireIdMap });

      const inclusionValues = buildInclusionRowValues({
        servicePackageId: row.id,
        entries,
        printSizeId: printSizeId,
      });

      const inclusionRows = await tx
        .insert(packageInclusions)
        .values(inclusionValues)
        .returning({ id: packageInclusions.id, kind: packageInclusions.kind });

      const junctionValues = buildJunctionPairs({
        inclusionIds: inclusionRows.map((r) => r.id),
        entries,
        attireId: attireIdMap,
      });
      if (junctionValues.length > 0) {
        await tx.insert(packageInclusionAttires).values(junctionValues);
      }
    }
  });

  console.log(
    `[ok] seeded: ${branchSeeds.length} branches, ${printSizeSeeds.length} print sizes, ${attireSeeds.length} attires, ${addonServiceSeeds.length} add-on services, ${studioServiceSeeds.length} studio services, ${packageSeeds.length} packages with frames and inclusions`
  );
} finally {
  await db.$client.end();
}

// Delete-then-insert scoped to one package's inclusions.
function eqPackageInclusions(packageId: string) {
  return eq(packageInclusions.servicePackageId, packageId);
}
