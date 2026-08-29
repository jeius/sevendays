// Regenerate with `pnpm --filter @sevendays/api cf-typegen` once real
// bindings (R2, secrets) are added to wrangler.toml.
interface Env {
  ENVIRONMENT: string;
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  SENTRY_DSN?: string;
  POSTHOG_API_KEY?: string;
}
