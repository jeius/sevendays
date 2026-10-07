// The metrics env reader's contract (#186): tolerance. An unset source
// yields null for that source — the curated not-configured widget state —
// never a thrown env error. The spec-pinned three tokens plus the account
// id and the three script-name vars (the deployment-identity ruling).
import { describe, expect, it } from 'vitest';
import { readMetricsEnv } from './env';

const FULL = {
  CF_ANALYTICS_READ_TOKEN: 'cf-token',
  CLOUDFLARE_ACCOUNT_ID: 'account-id',
  CF_ANALYTICS_SCRIPT_API: 'sevendays-api',
  CF_ANALYTICS_SCRIPT_LANDING: 'sevendays-landing',
  CF_ANALYTICS_SCRIPT_ADMIN: 'sevendays-admin',
  POSTHOG_PERSONAL_API_KEY: 'ph-key',
  POSTHOG_PROJECT_ID: 'ph-project',
  DATABASE_URL: 'postgres://example',
};

describe('readMetricsEnv', () => {
  it('a fully configured deployment resolves every source', () => {
    expect(readMetricsEnv(FULL)).toEqual({
      cf: {
        token: 'cf-token',
        accountId: 'account-id',
        scripts: {
          api: 'sevendays-api',
          landing: 'sevendays-landing',
          admin: 'sevendays-admin',
        },
      },
      posthog: { personalApiKey: 'ph-key', projectId: 'ph-project' },
      dbUrl: 'postgres://example',
    });
  });

  it('a missing CF token nulls the whole CF source (partial never half-works)', () => {
    const env = readMetricsEnv({ ...FULL, CF_ANALYTICS_READ_TOKEN: '' });
    expect(env.cf).toBeNull();
    expect(env.posthog).not.toBeNull();
  });

  it('a missing account id nulls the CF source', () => {
    expect(readMetricsEnv({ ...FULL, CLOUDFLARE_ACCOUNT_ID: undefined }).cf).toBeNull();
  });

  it('one missing script name nulls the CF source (the widgets are a set)', () => {
    expect(readMetricsEnv({ ...FULL, CF_ANALYTICS_SCRIPT_LANDING: '  ' }).cf).toBeNull();
  });

  it('a missing PostHog pair member nulls the posthog source', () => {
    expect(readMetricsEnv({ ...FULL, POSTHOG_PROJECT_ID: undefined }).posthog).toBeNull();
  });

  it('an empty env is all-null (every widget renders its curated state)', () => {
    expect(readMetricsEnv({})).toEqual({ cf: null, posthog: null, dbUrl: null });
  });
});
