import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export const defaultMigrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Programmatic migration apply for test global setup (ADR-0008): opens its
 * own postgres-js client (prepare:false — session-pooler compatible), runs
 * the drizzle migrator over packages/db/migrations, and closes the client.
 * Never hand-edit packages/db/migrations — generated via db:generate only.
 */
export async function migrateDatabase(
  connectionString: string,
  opts?: { migrationsFolder?: string }
): Promise<void> {
  const client = postgres(connectionString, { prepare: false });
  try {
    await migrate(drizzle(client), {
      migrationsFolder: opts?.migrationsFolder ?? defaultMigrationsFolder,
    });
  } finally {
    await client.end({ timeout: 5 });
  }
}
