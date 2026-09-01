// Re-runnable catalog seeder: one transaction, natural-key upserts, per-package
// inclusion rebuild. Reruns never duplicate rows and never change ids.
// Run: pnpm --filter @sevendays/db db:seed
import process from 'node:process';
import { eq } from 'drizzle-orm';
import {
  addonServices,
  attires,
  branches,
  createDbClient,
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

    for (const attire of attireSeeds) {
      await tx.insert(attires).values({ name: attire.name }).onConflictDoNothing();
    }

    const printSizeRows = await tx.select().from(printSizes);
    const attireRows = await tx.select().from(attires);
    const printSizeId = new Map(printSizeRows.map((r) => [r.code, r.id]));
    const attireId = new Map(attireRows.map((r) => [r.name, r.id]));

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

      // Rebuild this package's inclusions (delete-then-insert keeps the
      // catalog exactly in sync with docs/catalog.md on every run).
      await tx.delete(packageInclusions).where(eqPackageInclusions(row.id));

      const framedValues = pkg.framedPictures.map((f) => ({
        servicePackageId: row.id,
        kind: 'framed_picture' as const,
        quantity: 1,
        printSizeId: printSizeId.get(f.printSizeCode) ?? null,
        attireId: attireId.get(f.attireName) ?? null,
        description: null,
      }));
      const printValues = pkg.prints.map((p) => ({
        servicePackageId: row.id,
        kind: 'print' as const,
        quantity: p.quantity,
        printSizeId: printSizeId.get(p.printSizeCode) ?? null,
        attireId: attireId.get(p.attireName) ?? null,
        description: null,
      }));
      const privilegeValues = privilegeSeeds.map((p) => ({
        servicePackageId: row.id,
        kind: 'privilege' as const,
        quantity: null,
        printSizeId: null,
        attireId: p.attireName ? (attireId.get(p.attireName) ?? null) : null,
        description: p.description,
      }));

      await tx
        .insert(packageInclusions)
        .values([...framedValues, ...printValues, ...privilegeValues]);
    }
  });

  console.log(
    `[ok] seeded: ${branchSeeds.length} branches, ${printSizeSeeds.length} print sizes, ${attireSeeds.length} attires, ${addonServiceSeeds.length} add-on services, ${packageSeeds.length} packages with inclusions`
  );
} finally {
  await db.$client.end();
}

// Delete-then-insert scoped to one package's inclusions.
function eqPackageInclusions(packageId: string) {
  return eq(packageInclusions.servicePackageId, packageId);
}
