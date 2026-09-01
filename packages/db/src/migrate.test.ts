import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultMigrationsFolder } from './migrate.js';

describe('migrateDatabase', () => {
  it('resolves the migrations folder inside the package', () => {
    const expected = fileURLToPath(new URL('../migrations', import.meta.url));
    expect(defaultMigrationsFolder).toBe(expected);
    expect(defaultMigrationsFolder.endsWith('packages/db/migrations')).toBe(true);
  });

  it.runIf(process.env.TEST_DATABASE_URL)('applies 0000+0001 to a reachable postgres', async () => {
    const { migrateDatabase } = await import('./migrate.js');
    await expect(migrateDatabase(process.env.TEST_DATABASE_URL as string)).resolves.toBeUndefined();
  });
});
