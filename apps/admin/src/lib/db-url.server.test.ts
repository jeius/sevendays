import { afterEach, describe, expect, it } from 'vitest';

import { resolveDbUrl } from './api.server';

// Plain-Node seam: the DEV gate keeps the binding capture off in vitest, so
// resolveDbUrl rides process.env — the trimmed-string contract + the blank
// law (ADR-0024: a blank DATABASE_URL is absent, never empty-string).
describe('resolveDbUrl (the ADR-0024 db-connection seam, plain-node half)', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it('returns the trimmed DATABASE_URL from the environment', () => {
    process.env.DATABASE_URL = '  postgres://u:p@host:5432/db  ';
    expect(resolveDbUrl()).toBe('postgres://u:p@host:5432/db');
  });

  it('returns undefined for a blank or absent DATABASE_URL', () => {
    process.env.DATABASE_URL = '   ';
    expect(resolveDbUrl()).toBeUndefined();
    delete process.env.DATABASE_URL;
    expect(resolveDbUrl()).toBeUndefined();
  });
});
