// One-off M5 backfill (ticket #135, Task 3): rewrites inclusion + junction
// positions from today's render order — inclusions by id (the list read's
// key), junctions by (created_at, id) per inclusion — then verifies the
// ticket's acceptance shape: all lookups active, positions contiguous 1..N
// per package and per inclusion, zero NULLs. Idempotent: row_number()
// re-derives the same values on rerun. Prints counts only — never a
// connection string.
// Run: node --env-file=.env scripts/backfill-positions.mjs  (exit 0 = verified)

import postgres from 'postgres';

const url = process.env.DATABASE_MIGRATE_URL;
if (!url) {
  console.error('DATABASE_MIGRATE_URL is not set (run scripts/check-env.mjs)');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
const failures = [];

function pass(line) {
  console.log(`[ok] ${line}`);
}

function fail(line) {
  failures.push(line);
  console.log(`[FAIL] ${line}`);
}

async function violations(label, query) {
  const rows = await query;
  const n = rows[0]?.n ?? 0;
  if (n === 0) pass(label);
  else fail(`${label} (${n} violations)`);
  return n;
}

const inclusionUpdates = await sql`
  UPDATE package_inclusions SET position = ranked.rn
  FROM (
    SELECT id, row_number() OVER (PARTITION BY service_package_id ORDER BY id) AS rn
    FROM package_inclusions
  ) AS ranked
  WHERE package_inclusions.id = ranked.id
`;
pass(`inclusion positions rewritten from id order (${inclusionUpdates.count} rows)`);

const junctionUpdates = await sql`
  UPDATE package_inclusion_attires SET position = ranked.rn
  FROM (
    SELECT id, row_number() OVER (PARTITION BY inclusion_id ORDER BY created_at, id) AS rn
    FROM package_inclusion_attires
  ) AS ranked
  WHERE package_inclusion_attires.id = ranked.id
`;
pass(`junction positions rewritten from (created_at, id) order (${junctionUpdates.count} rows)`);

await violations(
  'no NULL inclusion positions',
  sql`SELECT count(*)::int AS n FROM package_inclusions WHERE position IS NULL`
);
await violations(
  'no NULL junction positions',
  sql`SELECT count(*)::int AS n FROM package_inclusion_attires WHERE position IS NULL`
);
await violations(
  'inclusion positions contiguous 1..N per package',
  sql`
    SELECT count(*)::int AS n FROM (
      SELECT service_package_id
      FROM package_inclusions
      GROUP BY service_package_id
      HAVING min(position) <> 1
         OR max(position) <> count(*)
         OR count(DISTINCT position) <> count(*)
    ) AS bad
  `
);
await violations(
  'junction positions contiguous 1..N per inclusion',
  sql`
    SELECT count(*)::int AS n FROM (
      SELECT inclusion_id
      FROM package_inclusion_attires
      GROUP BY inclusion_id
      HAVING min(position) <> 1
         OR max(position) <> count(*)
         OR count(DISTINCT position) <> count(*)
    ) AS bad
  `
);
await violations(
  'all branches active (the ruled backfill)',
  sql`SELECT count(*)::int AS n FROM branches WHERE is_active = false`
);
await violations(
  'all print sizes active (the ruled backfill)',
  sql`SELECT count(*)::int AS n FROM print_sizes WHERE is_active = false`
);
await violations(
  'all attires active (the ruled backfill)',
  sql`SELECT count(*)::int AS n FROM attires WHERE is_active = false`
);

const [summary] = await sql`
  SELECT
    (SELECT count(*)::int FROM service_packages) AS packages,
    (SELECT count(*)::int FROM package_inclusions) AS inclusions,
    (SELECT count(*)::int FROM package_inclusion_attires) AS junctions,
    (SELECT count(*)::int FROM gallery_categories) AS categories,
    (SELECT count(*)::int FROM gallery_photos) AS photos,
    (SELECT count(*)::int FROM testimonials) AS testimonials
`;
if (summary) {
  pass(
    `row counts: ${summary.packages} packages / ${summary.inclusions} inclusions / ${summary.junctions} junctions / ${summary.categories} categories / ${summary.photos} photos / ${summary.testimonials} testimonials`
  );
}

await sql.end({ timeout: 5 });

if (failures.length > 0) {
  console.log(`GATE: FAIL — ${failures.length} violation(s) above`);
  process.exit(1);
}
console.log('GATE: PASS — backfill verified (lookups active; positions monotonic 1..N)');
