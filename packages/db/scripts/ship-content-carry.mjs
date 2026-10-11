// Ship-day content carry (M6 #191, owner-ratified 2026-10-11): copies the
// CMS-curated catalog + content state from the source database to the
// destination database in ONE transaction (reverse-FK deletes, then
// forward-FK inserts), superseding the seed's docs/catalog.md baseline
// with what the studio actually curated — the 2026-10-11 read-only probe
// showed every family had drifted past the seed. Auth, appointments,
// audit_log, rate_limit, and verification rows never cross: the
// destination's own history starts at ship. Owner tooling, run from the
// runbook — never CI. Every input is an exported env value (no .env file
// is read): the runbook's command line is the audit record.
import postgres from 'postgres';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The ship runbook exports it before running this script — see docs/ship-provisioning-runbook.md.`
    );
  }
  return value;
}

// Insert order = FK-safe forward order; deletes run the exact reverse.
const TABLES = [
  'branches',
  'print_sizes',
  'attires',
  'addon_services',
  'studio_services',
  'service_packages',
  'branch_studio_services',
  'studio_service_addon_services',
  'frames',
  'package_inclusions',
  'package_inclusion_attires',
  'gallery_categories',
  'gallery_photos',
  'testimonials',
];

// Identifier gate for sql.unsafe (postgres 3.4.9 ships no sql.identifier):
// the only two identifier sources are this script's own TABLES constant and
// the driver's own column names — both must pass the strict snake_case
// check, then ride double quotes. VALUES are always parameterized ($1…),
// never interpolated.
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`unsafe identifier refused: ${name}`);
  }
  return `"${name}"`;
};

const source = postgres(required('SOURCE_DATABASE_URL'), { prepare: false });
const dest = postgres(required('DATABASE_MIGRATE_URL'), { prepare: false });

const carried = {};
await dest.begin(async (tx) => {
  for (const table of [...TABLES].reverse()) {
    await tx.unsafe(`delete from ${ident(table)}`);
  }
  for (const table of TABLES) {
    const rows = await source.unsafe(`select * from ${ident(table)}`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const params = cols.map((col) => row[col]);
      const marks = params.map((_, i) => `$${i + 1}`).join(', ');
      await tx.unsafe(
        `insert into ${ident(table)} (${cols.map((col) => ident(col)).join(', ')}) values (${marks})`,
        params
      );
    }
    carried[table] = rows.length;
  }
});

let mismatched = 0;
for (const table of TABLES) {
  const srcCount = await source.unsafe(`select count(*)::int as n from ${ident(table)}`);
  const dstCount = await dest.unsafe(`select count(*)::int as n from ${ident(table)}`);
  const ok = srcCount[0].n === dstCount[0].n && dstCount[0].n === carried[table];
  if (!ok) mismatched++;
  console.log(
    `${table.padEnd(32)} ${String(dstCount[0].n).padStart(4)} row(s)  ${ok ? 'ok' : `MISMATCH (source ${srcCount[0].n}, inserted ${carried[table]})`}`
  );
}
await source.end();
await dest.end();
if (mismatched > 0) {
  console.error(`${mismatched} table(s) mismatched — the carry is NOT verified`);
  process.exit(1);
}
console.log(`carry verified: ${TABLES.length} table(s), all counts match`);
