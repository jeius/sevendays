// The metrics seam's env reader + result vocabulary (#186, ADR-0023).
// Tolerant by design: an unset source is null and its widgets render the
// curated "Analytics source not configured." state — never a thrown env
// error (the inverted #155: the sentinel became a curated state; the
// loud-fail getApiUrl pattern does not apply here). The spec pins the
// three token names; CLOUDFLARE_ACCOUNT_ID reuses the var the api
// already consumes on both CI legs; the CF_ANALYTICS_SCRIPT_* trio is the
// deployment-identity ruling (Worker names differ per edition, so they
// cannot be code constants).
export type MetricsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not-configured' | 'unavailable' };

export type CfAnalyticsConfig = {
  token: string;
  accountId: string;
  scripts: { api: string; landing: string; admin: string };
};

// Consumed by #187 (Traffic); read here so the seam's env surface lands
// whole with the tokens the ticket pins.
export type PosthogConfig = {
  personalApiKey: string;
  projectId: string;
};

export type MetricsEnv = {
  cf: CfAnalyticsConfig | null;
  posthog: PosthogConfig | null;
  dbUrl: string | null;
};

function readTrimmed(env: Record<string, string | undefined>, key: string): string | null {
  const value = env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function readMetricsEnv(env: Record<string, string | undefined> = process.env): MetricsEnv {
  const token = readTrimmed(env, 'CF_ANALYTICS_READ_TOKEN');
  const accountId = readTrimmed(env, 'CLOUDFLARE_ACCOUNT_ID');
  const scriptApi = readTrimmed(env, 'CF_ANALYTICS_SCRIPT_API');
  const scriptLanding = readTrimmed(env, 'CF_ANALYTICS_SCRIPT_LANDING');
  const scriptAdmin = readTrimmed(env, 'CF_ANALYTICS_SCRIPT_ADMIN');
  const cf =
    token !== null &&
    accountId !== null &&
    scriptApi !== null &&
    scriptLanding !== null &&
    scriptAdmin !== null
      ? {
          token,
          accountId,
          scripts: { api: scriptApi, landing: scriptLanding, admin: scriptAdmin },
        }
      : null;
  const personalApiKey = readTrimmed(env, 'POSTHOG_PERSONAL_API_KEY');
  const projectId = readTrimmed(env, 'POSTHOG_PROJECT_ID');
  const posthog =
    personalApiKey !== null && projectId !== null ? { personalApiKey, projectId } : null;
  return { cf, posthog, dbUrl: readTrimmed(env, 'DATABASE_URL') };
}
