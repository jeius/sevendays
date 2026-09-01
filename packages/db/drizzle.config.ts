import process from 'node:process';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit (db:generate / db:migrate / db:studio) connects over the
// session-mode pooler URL (port 5432) — session-level advisory locks break
// under the transaction pooler, and the plain direct host is IPv6-only
// (unreachable from IPv4-only dev machines). See
// docs/adr/0007-database-connection-topology.md.
export default defineConfig({
  schema: './src/schema/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_MIGRATE_URL ??
      process.env.DATABASE_URL ??
      'postgres://stub:stub@localhost:5432/sevendays_stub',
  },
});
