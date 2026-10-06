// The Sentry init (M6 #184) — imported as the FIRST import of src/router.tsx
// so it runs before any route module, in every runtime the router loads:
// the browser bundle (client errors — the AC's forced client error), the
// deployed Worker's SSR graph, and vite dev. @sentry/tanstackstart-react's
// conditional exports resolve per environment (browser build on the client,
// server build under workerd), so ONE init site covers both sides. This
// REPLACES the scaffold's instrument.server.mjs (node --import), which
// provably never executed in the deployed Worker — nothing imported it
// (wrangler deploy --dry-run, 2026-10-06: the file rode the bundle as a
// dead module).
import { init } from '@sentry/tanstackstart-react';
import { buildSentryOptions } from './lib/sentry';

const options = buildSentryOptions({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_SENTRY_RELEASE,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
});

if (!options) {
  console.warn('VITE_SENTRY_DSN is not defined. Sentry is not running.');
} else {
  init(options);
}
