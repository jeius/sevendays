// One-shot live probe (intake spec, Seam 3): proves explicit transactions —
// BEGIN / ROLLBACK / COMMIT via postgres.js — work through Supabase's
// TRANSACTION-MODE pooler (port 6543), the exact pool the deployed Worker
// books appointments over (ADR-0007). Every query the API has ever sent was
// autocommit; a module-internal transaction is the first multi-statement
// window, so pooler behavior must be proven before the intake module relies
// on it. Runs once per the spec's confirmation gate; not a test suite.
//
// Prints derived facts only (port, PASS/FAIL lines) — never the connection
// string (scripts/check-env.mjs precedent). Run from packages/db/:
//   node --env-file=../../apps/api/.dev.vars scripts/probe-pooler-transaction.mjs
//
// If this FAILS: the spec's fallback applies — the transaction decision
// reopens; record the outcome in ADR-0007 + progress.md either way.
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set — run with --env-file pointing at apps/api/.dev.vars');
  process.exit(1);
}
const parsed = new URL(url);
const port = parsed.port || '5432';
if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
  console.error(
    'refusing: DATABASE_URL is localhost — this probe targets the LIVE transaction-mode pooler'
  );
  process.exit(1);
}
if (port !== '6543') {
  console.error(
    `refusing: port ${port} is not the transaction-mode pooler (6543) — ` +
      'check-env.mjs maps the URLs: .dev.vars DATABASE_URL = transaction pooler, packages/db/.env DATABASE_MIGRATE_URL = session pooler'
  );
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${label}`);
  if (!ok) failures += 1;
};

try {
  // Leg 1 — manual BEGIN/ROLLBACK on a pinned connection (reserve() checks
  // out one connection for all three statements, so the temp table is
  // visible throughout): insert, fail mid-transaction, roll back, assert
  // the row never landed.
  const a = await sql.reserve();
  try {
    await a`create temp table probe_txn_a (i int)`;
    await a`begin`;
    await a`insert into probe_txn_a values (1)`;
    try {
      await a`select 1 / 0`; // deliberate runtime error inside the txn
      check('leg1: statement inside txn threw', false);
    } catch {
      await a`rollback`;
    }
    const rows = await a`select count(*)::int as n from probe_txn_a`;
    check('leg1: rollback erased the insert', (rows[0]?.n ?? -1) === 0);
  } finally {
    await a`drop table if exists probe_txn_a`;
    a.release();
  }

  // Leg 2 — sql.begin (the exact primitive drizzle's db.transaction calls):
  // a throwing callback must reject begin AND roll the insert back.
  const b = await sql.reserve();
  try {
    await b`create temp table probe_txn_b (i int)`;
    let threw = false;
    try {
      await b.begin(async (tx) => {
        await tx`insert into probe_txn_b values (1)`;
        await tx`select 1 / 0`;
      });
    } catch {
      threw = true;
    }
    check('leg2: sql.begin rejected the throwing callback', threw);
    const rows = await b`select count(*)::int as n from probe_txn_b`;
    check('leg2: callback failure rolled the insert back', (rows[0]?.n ?? -1) === 0);
  } finally {
    await b`drop table if exists probe_txn_b`;
    b.release();
  }

  // Leg 3 — commit sanity: the same primitive must also COMMIT a clean
  // callback over the pooler (compose proves commit on a direct connection;
  // this proves it under transaction pooling).
  const c = await sql.reserve();
  try {
    await c`create temp table probe_txn_c (i int)`;
    await c.begin(async (tx) => {
      await tx`insert into probe_txn_c values (1)`;
      await tx`insert into probe_txn_c values (2)`;
    });
    const rows = await c`select count(*)::int as n from probe_txn_c`;
    check('leg3: sql.begin commits a clean callback', (rows[0]?.n ?? -1) === 2);
  } finally {
    await c`drop table if exists probe_txn_c`;
    c.release();
  }
} finally {
  await sql.end({ timeout: 5 });
}

console.log(
  failures === 0
    ? 'PROBE: PASS — explicit transactions work over the transaction-mode pooler'
    : 'PROBE: FAIL — the transaction decision reopens (spec fallback); record the outcome in ADR-0007 + progress.md'
);
process.exit(failures === 0 ? 0 : 1);
