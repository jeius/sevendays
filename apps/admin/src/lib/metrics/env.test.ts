// The metrics env reader's contract (#186, extended at #187): tolerance.
// An unset source yields null for that source — the curated
// not-configured widget state — never a thrown env error. The spec-pinned
// tokens plus the deployment-identity vars (#186's script trio; #187's
// bucket + landing-hosts + region host — owner-reviewable at PR, the
// CF_ANALYTICS_SCRIPT_* precedent).
import { describe, expect, it } from 'vitest';
import { readMetricsEnv } from './env';

const FULL = {
  CF_ANALYTICS_READ_TOKEN: 'cf-token',
  CLOUDFLARE_ACCOUNT_ID: 'account-id',
  CF_ANALYTICS_SCRIPT_API: 'sevendays-api',
  CF_ANALYTICS_SCRIPT_LANDING: 'sevendays-landing',
  CF_ANALYTICS_SCRIPT_ADMIN: 'sevendays-admin',
  CF_ANALYTICS_BUCKET: 'sevendays-media',
  POSTHOG_PERSONAL_API_KEY: 'ph-key',
  POSTHOG_PROJECT_ID: 'ph-project',
  POSTHOG_LANDING_HOSTS: 'sevendays-landing.workers.dev, localhost:3000',
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
      r2: { token: 'cf-token', accountId: 'account-id', bucket: 'sevendays-media' },
      posthog: {
        personalApiKey: 'ph-key',
        projectId: 'ph-project',
        apiHost: 'https://us.i.posthog.com',
        landingHosts: ['sevendays-landing.workers.dev', 'localhost:3000'],
      },
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

  it('a missing bucket nulls the R2 group alone — the workers widgets stay live', () => {
    const env = readMetricsEnv({ ...FULL, CF_ANALYTICS_BUCKET: undefined });
    expect(env.r2).toBeNull();
    expect(env.cf).not.toBeNull();
  });

  it('a missing PostHog pair member nulls the posthog source', () => {
    expect(readMetricsEnv({ ...FULL, POSTHOG_PROJECT_ID: undefined }).posthog).toBeNull();
  });

  it('missing landing hosts null the posthog source (an unscoped filter would mix the admin in)', () => {
    expect(readMetricsEnv({ ...FULL, POSTHOG_LANDING_HOSTS: ' , ' }).posthog).toBeNull();
  });

  it('POSTHOG_API_HOST overrides the region and loses trailing slashes', () => {
    const env = readMetricsEnv({ ...FULL, POSTHOG_API_HOST: 'https://eu.i.posthog.com/' });
    expect(env.posthog?.apiHost).toBe('https://eu.i.posthog.com');
  });

  it('an empty env is all-null (every widget renders its curated state)', () => {
    expect(readMetricsEnv({})).toEqual({
      cf: null,
      r2: null,
      posthog: null,
      dbUrl: null,
    });
  });
});
