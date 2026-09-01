// psql-equivalent acceptance read-back (psql is not installed on this machine):
// counts, catalog price checks, and a line-for-line inclusion comparison
// against scripts/catalog.ts (the docs/catalog.md transcription).
// Run: pnpm --filter @sevendays/db db:verify-seed   — exit 0 = verified.
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
attireRows.length === 7
  ? pass(`attires: ${attireRows.length}/7`)
  : fail(`attires: ${attireRows.length} != 7`);

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
      kind: packageInclusions.kind,
      quantity: packageInclusions.quantity,
      description: packageInclusions.description,
      printSizeCode: printSizes.code,
      attireName: attires.name,
    })
    .from(packageInclusions)
    .leftJoin(printSizes, eq(packageInclusions.printSizeId, printSizes.id))
    .leftJoin(attires, eq(packageInclusions.attireId, attires.id))
    .where(eq(packageInclusions.servicePackageId, row.id));

  const actual = rows
    .map((r) =>
      r.kind === 'privilege'
        ? `privilege|0|${r.attireName ?? '-'}|${r.description ?? ''}`
        : `${r.kind}|${r.quantity}|${r.printSizeCode ?? '?'}|${r.attireName ?? '?'}`
    )
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
