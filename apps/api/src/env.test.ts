import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('parses a valid binding (all three vars)', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      NOTICE_API_KEY: 're_test_placeholder',
      SITE_ORIGIN: 'http://localhost:3000',
    });
    expect(env.DATABASE_URL).toBe('postgres://u:p@host:5432/db');
    expect(env.NOTICE_API_KEY).toBe('re_test_placeholder');
    expect(env.SITE_ORIGIN).toBe('http://localhost:3000');
  });

  it('rejects a missing NOTICE_API_KEY', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        SITE_ORIGIN: 'http://localhost:3000',
      })
    ).toThrow(/NOTICE_API_KEY/);
  });

  it('rejects an empty NOTICE_API_KEY', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        NOTICE_API_KEY: '',
        SITE_ORIGIN: 'http://localhost:3000',
      })
    ).toThrow(/NOTICE_API_KEY/);
  });

  it('rejects a missing SITE_ORIGIN', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        NOTICE_API_KEY: 're_test_placeholder',
      })
    ).toThrow(/SITE_ORIGIN/);
  });

  it('rejects a malformed SITE_ORIGIN', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        NOTICE_API_KEY: 're_test_placeholder',
        SITE_ORIGIN: 'not a url',
      })
    ).toThrow(/SITE_ORIGIN/i);
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
});
