// psql-equivalent acceptance read-back (psql is not installed on this machine):
// counts, catalog price checks, line-for-line inclusion comparison (with
// junction-resolved attire names), frame count + partition checks — all
// against scripts/catalog.ts (the docs/catalog.md transcription).
// Run: pnpm --filter @sevendays/db db:verify-seed   — exit 0 = verified.
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
import { addonServiceSeeds, branchSeeds, inclusionSignatures, packageSeeds } from './catalog.js';

const url = process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('No database URL: run scripts/check-env.mjs — DATABASE_MIGRATE_URL must be set.');
  process.exit(1);
}

const db = createDbClient(url);
const failures: string[] = [];

function pass(line: string) {
  console.log(`[ok] ${line}`);
}
function fail(line: string) {
  console.log(`[FAIL] ${line}`);
  failures.push(line);
}

const branchRows = await db.select().from(branches);
branchRows.length === branchSeeds.length
  ? pass(`branches: ${branchRows.length}/${branchSeeds.length}`)
  : fail(`branches: ${branchRows.length} != ${branchSeeds.length}`);

const printSizeRows = await db.select().from(printSizes);
printSizeRows.length === 6
  ? pass(`print_sizes: ${printSizeRows.length}/6`)
  : fail(`print_sizes: ${printSizeRows.length} != 6`);

const attireRows = await db.select().from(attires);
attireRows.length === 4
  ? pass(`attires: ${attireRows.length}/4 (atomic — combined contexts are junction-composed)`)
  : fail(`attires: ${attireRows.length} != 4`);

// Junction attires — fetched once; insertion order per inclusion preserves
// the catalog's attire order for the canonical join.
const junctionRows = await db
  .select({ inclusionId: packageInclusionAttires.inclusionId, attireName: attires.name })
  .from(packageInclusionAttires)
  .innerJoin(attires, eq(packageInclusionAttires.attireId, attires.id));
const attireNamesByInclusion = new Map<string, string[]>();
for (const j of junctionRows) {
  const list = attireNamesByInclusion.get(j.inclusionId);
  if (list) {
    list.push(j.attireName);
  } else {
    attireNamesByInclusion.set(j.inclusionId, [j.attireName]);
  }
}

const frameRows = await db.select().from(frames);
const expectedFrameCount = packageSeeds.reduce((n, p) => n + p.framedPictures.length, 0);
frameRows.length === expectedFrameCount
  ? pass(`frames: ${frameRows.length}/${expectedFrameCount}`)
  : fail(`frames: ${frameRows.length} != ${expectedFrameCount}`);

const addonRows = await db.select().from(addonServices);
addonRows.length === addonServiceSeeds.length
  ? pass(`addon_services: ${addonRows.length}/${addonServiceSeeds.length}`)
  : fail(`addon_services: ${addonRows.length} != ${addonServiceSeeds.length}`);
for (const seed of addonServiceSeeds) {
  const row = addonRows.find((r) => r.name === seed.name);
  if (!row) fail(`add-on ${seed.name}: missing`);
  else if (row.priceCents !== seed.priceCents)
    fail(`add-on ${seed.name}: price ${row.priceCents} != catalog ${seed.priceCents}`);
  else pass(`add-on ${seed.name} ₱${(seed.priceCents / 100).toFixed(2)}`);
}

const packageRows = await db.select().from(servicePackages);
packageRows.length === packageSeeds.length
  ? pass(`service_packages: ${packageRows.length}/${packageSeeds.length}`)
  : fail(`service_packages: ${packageRows.length} != ${packageSeeds.length}`);
for (const seed of packageSeeds) {
  const row = packageRows.find((r) => r.name === seed.name);
  if (!row) fail(`service package ${seed.name}: missing`);
  else if (row.priceCents !== seed.priceCents)
    fail(`service package ${seed.name}: price ${row.priceCents} != catalog ${seed.priceCents}`);
  else pass(`service package ${seed.name} ₱${(seed.priceCents / 100).toFixed(2)}`);
}

// Line-for-line inclusion comparison per package.
for (const seed of packageSeeds) {
  const row = packageRows.find((r) => r.name === seed.name);
  if (!row) continue;
  const rows = await db
    .select({
      id: packageInclusions.id,
      kind: packageInclusions.kind,
      quantity: packageInclusions.quantity,
      description: packageInclusions.description,
      printSizeCode: printSizes.code,
      frameId: packageInclusions.frameId,
    })
    .from(packageInclusions)
    .leftJoin(printSizes, eq(packageInclusions.printSizeId, printSizes.id))
    .where(eq(packageInclusions.servicePackageId, row.id));

  const actual = rows
    .map((r) => {
      const names = attireNamesByInclusion.get(r.id) ?? [];
      return r.kind === 'privilege'
        ? `privilege|0|${names.length > 0 ? names.join('/') : '-'}|${r.description ?? ''}`
        : `${r.kind}|${r.quantity}|${r.printSizeCode ?? '?'}|${names.length > 0 ? names.join('/') : '-'}`;
    })
    .sort();
  const expected = inclusionSignatures(seed).sort();

  if (expected.length !== actual.length) {
    fail(`${seed.name}: ${actual.length} inclusion rows != ${expected.length} catalog lines`);
    continue;
  }
  const diffs = expected.filter((e, i) => e !== actual[i]);
  const firstDiff = diffs[0];
  if (firstDiff !== undefined) {
    fail(
      `${seed.name}: inclusion mismatch — first diff: expected "${firstDiff}" got "${actual[expected.indexOf(firstDiff)]}"`
    );
  } else {
    pass(`${seed.name}: ${actual.length} inclusion rows match docs/catalog.md line-for-line`);
  }

  // Frame partition (ADR-0009 revision): every framed_picture row references
  // one of this package's frames; each frame is referenced at least once.
  const pkgFrameRows = frameRows.filter((f) => f.servicePackageId === row.id);
  pkgFrameRows.length === seed.framedPictures.length
    ? pass(`${seed.name}: ${pkgFrameRows.length} frames`)
    : fail(`${seed.name}: ${pkgFrameRows.length} frames != ${seed.framedPictures.length}`);
  const includedFrameIds = new Set(
    rows
      .filter((r) => r.kind === 'framed_picture')
      .map((r) => r.frameId)
      .filter((id) => id !== null)
  );
  includedFrameIds.size === pkgFrameRows.length
    ? pass(`${seed.name}: every frame carries ≥1 framed picture`)
    : fail(
        `${seed.name}: framed pictures reference ${includedFrameIds.size}/${pkgFrameRows.length} frames`
      );

  // Attire completeness: every picture inclusion carries ≥1 junction row.
  const pictureRows = rows.filter((r) => r.kind !== 'privilege');
  const barePictures = pictureRows.filter(
    (r) => (attireNamesByInclusion.get(r.id) ?? []).length === 0
  );
  barePictures.length === 0
    ? pass(`${seed.name}: all ${pictureRows.length} picture inclusions carry attire context`)
    : fail(`${seed.name}: ${barePictures.length} picture inclusions have no attire`);
}

// Spot rows (public seed data — safe to print).
console.log('--- branches ---');
for (const b of branchRows) {
  console.log(`${b.name} | ${b.address} | ${b.phone} | accepts_walk_ins: ${b.acceptsWalkIns}`);
}

await db.$client.end();
if (failures.length > 0) {
  console.log(`VERIFY: FAILED (${failures.length} problem(s))`);
  process.exit(1);
}
console.log('VERIFY: PASSED — the seeded catalog matches docs/catalog.md.');
