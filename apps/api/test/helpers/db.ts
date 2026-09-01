import type { Database } from '@sevendays/db';
import { createDbClient } from '@sevendays/db';

export function createTestDb(connectionString: string) {
  return createDbClient(connectionString);
}

export type TestDb = Database;
