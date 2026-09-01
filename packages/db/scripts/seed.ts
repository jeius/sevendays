// Re-runnable catalog seeder: one transaction, natural-key upserts, per-package
// inclusion rebuild. Reruns never duplicate rows; branch/lookup/package ids stay
// stable — inclusion rows are deleted and rebuilt per package (with their
// junction rows, which cascade).
// Run: pnpm --filter @sevendays/db db:seed
import process from 'node:process';
import { eq } from 'drizzle-orm';
import {
  addonServices,
  attires,
  branches,
  createDbClient,
  frames,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
} from '../src/index.js';
import {
  addonServiceSeeds,
  attireSeeds,
  branchSeeds,
  packageSeeds,
  printSizeSeeds,
  privilegeSeeds,
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

    // Packages — upsert by unique name. Deliberately does NOT touch
    // coverImageKey (Milestone 5 uploads it; reseeding must not null it).
    for (const pkg of packageSeeds) {
      const [row] = await tx
        .insert(servicePackages)
        .values({ name: pkg.name, description: pkg.description, priceCents: pkg.priceCents })
        .onConflictDoUpdate({
          target: servicePackages.name,
          set: { description: pkg.description, priceCents: pkg.priceCents },
        })
        .returning({ id: servicePackages.id });
      if (!row) throw new Error(`seed: upsert returned no row for package ${pkg.name}`);

      // Frames — upsert per (package, frameNumber); reseed keeps ids stable
      // for unchanged frames so CMS references survive (ADR-0009 revision).
      const frameId = new Map<number, string>();
      for (const fp of pkg.framedPictures) {
        const [frameRow] = await tx
          .insert(frames)
          .values({ servicePackageId: row.id, frameNumber: fp.frameNumber })
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

      const framedValues = pkg.framedPictures.map((f) => ({
        servicePackageId: row.id,
        kind: 'framed_picture' as const,
        quantity: 1,
        printSizeId: printSizeId.get(f.printSizeCode) ?? null,
        frameId: frameId.get(f.frameNumber) ?? null,
        description: null,
      }));
      const printValues = pkg.prints.map((p) => ({
        servicePackageId: row.id,
        kind: 'print' as const,
        quantity: p.quantity,
        printSizeId: printSizeId.get(p.printSizeCode) ?? null,
        frameId: null,
        description: null,
      }));
      const privilegeValues = privilegeSeeds.map((p) => ({
        servicePackageId: row.id,
        kind: 'privilege' as const,
        quantity: null,
        printSizeId: null,
        frameId: null,
        description: p.description,
      }));

      const inclusionRows = await tx
        .insert(packageInclusions)
        .values([...framedValues, ...printValues, ...privilegeValues])
        .returning({ id: packageInclusions.id, kind: packageInclusions.kind });

      // Junction rows — one per (inclusion, attire) in catalog order. The
      // values array order matches the returning order, so a cursor walk
      // pairs each inclusion with its catalog source.
      const junctionValues: { inclusionId: string; attireId: string }[] = [];
      const pictureSources = [...pkg.framedPictures, ...pkg.prints];
      let pictureCursor = 0;
      let privilegeCursor = 0;
      for (const inclusion of inclusionRows) {
        if (inclusion.kind === 'privilege') {
          const source = privilegeSeeds[privilegeCursor];
          privilegeCursor += 1;
          if (!source)
            throw new Error(`seed: more privilege inclusions than sources for ${pkg.name}`);
          for (const name of source.attireNames) {
            const attireId = attireIdMap.get(name);
            if (!attireId) throw new Error(`seed: unknown attire ${name} for ${pkg.name}`);
            junctionValues.push({ inclusionId: inclusion.id, attireId });
          }
        } else {
          const source = pictureSources[pictureCursor];
          pictureCursor += 1;
          if (!source)
            throw new Error(`seed: more picture inclusions than sources for ${pkg.name}`);
          for (const name of source.attireNames) {
            const attireId = attireIdMap.get(name);
            if (!attireId) throw new Error(`seed: unknown attire ${name} for ${pkg.name}`);
            junctionValues.push({ inclusionId: inclusion.id, attireId });
          }
        }
      }
      if (junctionValues.length > 0) {
        await tx.insert(packageInclusionAttires).values(junctionValues);
      }
    }
  });

  console.log(
    `[ok] seeded: ${branchSeeds.length} branches, ${printSizeSeeds.length} print sizes, ${attireSeeds.length} attires, ${addonServiceSeeds.length} add-on services, ${packageSeeds.length} packages with frames and inclusions`
  );
} finally {
  await db.$client.end();
}

// Delete-then-insert scoped to one package's inclusions.
function eqPackageInclusions(packageId: string) {
  return eq(packageInclusions.servicePackageId, packageId);
}
