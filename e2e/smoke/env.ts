// The smoke's environment contract (M6 #190): the suite walks a DEPLOYED
// environment, so the api/admin targets and the sign-in credentials arrive
// as environment variables — the workflow passes them from the chosen
// GitHub environment's vars and secrets (.github/workflows/e2e.yml).
// Called inside the tests that consume each value, never at module scope:
// a missing value fails ONLY its own leg with this curated message — the
// same posture as E2E_BASE_URL in playwright.config.ts (a smoke run with a
// guessed target or a silently skipped leg is worse than a red test that
// names its fix).
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Locally: export it before pnpm test:e2e. In CI: it comes from the workflow's GitHub environment (teaser/v1) — see .github/workflows/e2e.yml.`
    );
  }
  return value;
}
