import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('parses a valid binding (all required vars)', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
      CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
      MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
      MEDIA_BUCKET: {},
      IMAGES: {},
    });
    expect(env.DATABASE_URL).toBe('postgres://u:p@host:5432/db');
    expect(env.RESEND_API_KEY).toBe('re_test_placeholder');
    expect(env.LANDING_ORIGIN).toBe('http://localhost:3000');
  });

  it('rejects a missing RESEND_API_KEY', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        LANDING_ORIGIN: 'http://localhost:3000',
      })
    ).toThrow(/RESEND_API_KEY/);
  });

  it('rejects an empty RESEND_API_KEY', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: '',
        LANDING_ORIGIN: 'http://localhost:3000',
      })
    ).toThrow(/RESEND_API_KEY/);
  });

  it('rejects a missing LANDING_ORIGIN', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
      })
    ).toThrow(/LANDING_ORIGIN/);
  });

  it('rejects a malformed LANDING_ORIGIN', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'not a url',
      })
    ).toThrow(/LANDING_ORIGIN/i);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects an empty DATABASE_URL', () => {
    expect(() => parseEnv({ DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-string DATABASE_URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 42 })).toThrow(/DATABASE_URL/);
  });

  it('rejects a malformed URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 'not a url' })).toThrow(/postgres|URL/i);
  });

  it('parses without BETTER_AUTH_SECRET (optional — the auth middleware owns the loud failure)', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
      CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
      MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
      MEDIA_BUCKET: {},
      IMAGES: {},
    });
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
  });

  it('rejects an empty BETTER_AUTH_SECRET when present', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        BETTER_AUTH_SECRET: '',
      })
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});

describe('parseEnv — media keys (M5 #136)', () => {
  const mediaVars = () => ({
    CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
  });

  it('parses the media keys — binding-shaped objects pass; the optional S3 pair may be absent', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
      ...mediaVars(),
      MEDIA_BUCKET: {},
      IMAGES: {},
    });
    expect(env.CLOUDFLARE_ACCOUNT_ID).toBe('0123456789abcdef0123456789abcdef');
    expect(env.MEDIA_PUBLIC_BASE_URL).toBe('https://pub-test.r2.dev');
    expect(env.R2_S3_ACCESS_KEY_ID).toBeUndefined();
    expect(env.R2_S3_SECRET_ACCESS_KEY).toBeUndefined();
  });

  it('rejects a missing MEDIA_BUCKET binding (required — deploys with wrangler.toml once the bucket exists)', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        IMAGES: {},
      })
    ).toThrow(/MEDIA_BUCKET/);
  });

  it('rejects a missing IMAGES binding', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        MEDIA_BUCKET: {},
      })
    ).toThrow(/IMAGES/);
  });

  it('rejects a missing CLOUDFLARE_ACCOUNT_ID', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
        MEDIA_BUCKET: {},
        IMAGES: {},
      })
    ).toThrow(/CLOUDFLARE_ACCOUNT_ID/);
  });

  it('rejects a missing MEDIA_PUBLIC_BASE_URL', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
        MEDIA_BUCKET: {},
        IMAGES: {},
      })
    ).toThrow(/MEDIA_PUBLIC_BASE_URL/);
  });

  it('rejects a malformed MEDIA_PUBLIC_BASE_URL', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
        MEDIA_PUBLIC_BASE_URL: 'not a url',
        MEDIA_BUCKET: {},
        IMAGES: {},
      })
    ).toThrow(/MEDIA_PUBLIC_BASE_URL/);
  });

  it('rejects an empty R2_S3_ACCESS_KEY_ID when present (optional key — no silent blank)', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        MEDIA_BUCKET: {},
        IMAGES: {},
        R2_S3_ACCESS_KEY_ID: '',
      })
    ).toThrow(/R2_S3_ACCESS_KEY_ID/);
  });

  it('rejects an empty R2_S3_SECRET_ACCESS_KEY when present', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        MEDIA_BUCKET: {},
        IMAGES: {},
        R2_S3_SECRET_ACCESS_KEY: '',
      })
    ).toThrow(/R2_S3_SECRET_ACCESS_KEY/);
  });
});
