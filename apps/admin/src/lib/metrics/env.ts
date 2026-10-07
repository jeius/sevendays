// The metrics seam's env reader + result vocabulary (#186, ADR-0023;
// extended at #187 for the audience half). Tolerant by design: an unset
// source is null and its widgets render the curated "Analytics source
// not configured." state — never a thrown env error (the inverted #155).
// #187 adds the r2 group (the storage queries' bucket — the deployment-
// identity class, owner-reviewable at PR like #186's script trio) and
// grows posthog with the region host + the landing-host allowlist ($host
// = location.host, port included — the filter is load-bearing: without
// it the admin's own events would mix into Traffic).
export type MetricsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not-configured' | 'unavailable' };

export type CfAnalyticsConfig = {
  token: string;
  accountId: string;
  scripts: { api: string; landing: string; admin: string };
};

// Consumed by #187's Storage & Media section; shares the CF token +
// account reads with the workers group but nulls independently — a
// missing bucket degrades Storage & Media alone.
export type R2AnalyticsConfig = {
  token: string;
  accountId: string;
  bucket: string;
};

export const POSTHOG_DEFAULT_API_HOST = 'https://us.i.posthog.com';

export type PosthogConfig = {
  personalApiKey: string;
  projectId: string;
  apiHost: string;
  landingHosts: string[];
};

export type MetricsEnv = {
  cf: CfAnalyticsConfig | null;
  r2: R2AnalyticsConfig | null;
  posthog: PosthogConfig | null;
  dbUrl: string | null;
};

function readTrimmed(env: Record<string, string | undefined>, key: string): string | null {
  const value = env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function readHostList(env: Record<string, string | undefined>, key: string): string[] {
  const raw = readTrimmed(env, key);
  if (raw === null) return [];
  return raw
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host !== '');
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
  const bucket = readTrimmed(env, 'CF_ANALYTICS_BUCKET');
  const r2 =
    token !== null && accountId !== null && bucket !== null ? { token, accountId, bucket } : null;
  const personalApiKey = readTrimmed(env, 'POSTHOG_PERSONAL_API_KEY');
  const projectId = readTrimmed(env, 'POSTHOG_PROJECT_ID');
  const apiHostRaw = readTrimmed(env, 'POSTHOG_API_HOST');
  const landingHosts = readHostList(env, 'POSTHOG_LANDING_HOSTS');
  const posthog =
    personalApiKey !== null && projectId !== null && landingHosts.length > 0
      ? {
          personalApiKey,
          projectId,
          apiHost: (apiHostRaw ?? POSTHOG_DEFAULT_API_HOST).replace(/\/+$/, ''),
          landingHosts,
        }
      : null;
  return { cf, r2, posthog, dbUrl: readTrimmed(env, 'DATABASE_URL') };
}
