import process from 'node:process';
import { defineConfig } from 'drizzle-kit';

// NOTE (stub): DATABASE_URL is not provisioned yet. Set it in packages/db/.env
// once Supabase (or your chosen Postgres provider) is set up.
// See docs/tech-stack.md for provisioning notes.
export default defineConfig({
  schema: './src/schema/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://stub:stub@localhost:5432/sevendays_stub',
  },
});
