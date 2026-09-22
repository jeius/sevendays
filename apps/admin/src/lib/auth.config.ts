// CLI entry for BetterAuth's tooling (`auth generate` today; `auth
// create-admin` in M4 ticket 02): the 1.7.5 CLI's config loader reads an
// exported INSTANCE's options — it picks `auth` / `default` / `default.auth`
// and never invokes a factory — so this file constructs a one-shot instance
// through the same factory the runtime uses. Node-only tooling surface:
// nothing in routes or server fns may import this file (the runtime builds
// per-request instances instead, ADR-0011). The stub URL mirrors
// drizzle.config.ts's fallback — generation needs no database; create-admin
// (#119) runs with a real DATABASE_URL in the environment.
import { createAuth } from './auth';

export const auth = createAuth(
  process.env.DATABASE_URL ?? 'postgres://stub:stub@localhost:5432/sevendays_stub'
);
