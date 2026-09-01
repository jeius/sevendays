import postgres from 'postgres';

const DEFAULT_TEST_DB = 'postgres://postgres:postgres@localhost:5432/sevendays_test';

export async function setup(): Promise<() => Promise<void>> {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DB;
  process.env.TEST_DATABASE_URL = url;

  const ping = postgres(url, { prepare: false, connect_timeout: 5, max: 1 });
  try {
    await ping`select 1`;
  } catch (err) {
    console.error(
      `\n[integration-tests] Test database unreachable at ${url}.\n` +
        'Start the compose db:  docker compose up -d db\n' +
        `Underlying error: ${(err as Error).message}\n`
    );
    process.exit(1);
  } finally {
    await ping.end({ timeout: 5 });
  }

  const { migrateDatabase } = await import('@sevendays/db/migrate');
  await migrateDatabase(url);

  const { createTestDb } = await import('./helpers/db.js');
  const { truncateAll } = await import('./helpers/truncate.js');
  await truncateAll(createTestDb(url));

  return async () => {
    // no teardown: leave the compose volume clean (crashed-run leftovers are
    // wiped by the next run's clean-slate truncate above).
  };
}

export default setup;
