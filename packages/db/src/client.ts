import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * STUB: no live database is provisioned yet.
 *
 * Once you have a Postgres connection string (e.g. from Supabase), set
 * `DATABASE_URL` in the consuming app's environment (for apps/api, this is a
 * Cloudflare Workers binding/secret, not a local .env at runtime) and this
 * client will work as-is.
 *
 * Usage: `createDbClient(env.DATABASE_URL)`
 */
export function createDbClient(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDbClient>;
export * from "./schema";
