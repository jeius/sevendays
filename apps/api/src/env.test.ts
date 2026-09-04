import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('parses a valid binding', () => {
    const env = parseEnv({ DATABASE_URL: 'postgres://u:p@host:5432/db' });
    expect(env.DATABASE_URL).toBe('postgres://u:p@host:5432/db');
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
