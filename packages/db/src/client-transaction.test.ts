import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Database } from './client.js';

// Seam 2 of the intake spec: pin the rollback/commit semantics the
// createAppointment transaction relies on, at the db-client layer, over real
// Postgres (ADR-0008). The live-pooler twin is the one-shot
// scripts/probe-pooler-transaction.mjs — workerd/pooler behavior does not
// surface in Node-env compose tests (the M1.5 lesson).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)('db client transactions (compose, ADR-0008)', () => {
  let db: Database;

  const countScratch = async (): Promise<number> => {
    const rows = await db.$client`select count(*)::int as n from client_txn_scratch_test`;
    return Number(rows[0]?.n ?? -1);
  };

  beforeAll(async () => {
    db = createDbClient(TEST_DATABASE_URL as string);
    // A real scratch table, not TEMP: statements go through a pool, and a
    // temp table is only visible on the connection that created it.
    await db.execute(sql.raw('drop table if exists client_txn_scratch_test'));
    await db.execute(sql.raw('create table if not exists client_txn_scratch_test (i int)'));
  });

  afterAll(async () => {
    await db.execute(sql.raw('drop table if exists client_txn_scratch_test'));
    await db.$client.end({ timeout: 5 });
  });

  it('rolls the whole transaction back when the callback throws', async () => {
    await db.execute(sql.raw('delete from client_txn_scratch_test'));
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql.raw('insert into client_txn_scratch_test values (1)'));
        await tx.execute(sql.raw('select 1 / 0')); // fail mid-transaction
      })
    ).rejects.toThrow();
    await expect(countScratch()).resolves.toBe(0);
  });

  it('commits when the callback completes', async () => {
    await db.execute(sql.raw('delete from client_txn_scratch_test'));
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw('insert into client_txn_scratch_test values (1)'));
      await tx.execute(sql.raw('insert into client_txn_scratch_test values (2)'));
    });
    await expect(countScratch()).resolves.toBe(2);
  });
});
