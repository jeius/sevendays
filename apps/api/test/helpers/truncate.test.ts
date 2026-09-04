// biome-ignore lint/performance/noNamespaceImport: the pin must walk whatever the schema barrel exports, not a hand-listed set; tree-shaking is irrelevant in a test helper
import * as schema from '@sevendays/db';
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { publicTableNames } from './truncate.js';

describe('publicTableNames', () => {
  it('equals a fresh schema-barrel walk: every exported pg Table, default schema only', () => {
    const fromBarrel = Object.entries(schema)
      .filter(([, v]) => is(v, PgTable) && getTableConfig(v).schema === undefined)
      .map(([, v]) => getTableConfig(v).name)
      .sort();
    expect(publicTableNames()).toEqual(fromBarrel);
  });

  it('still truncates exactly the ten known public tables (migrations 0000+0001)', () => {
    expect(publicTableNames()).toEqual([
      'addon_services',
      'appointment_addon_services',
      'appointments',
      'attires',
      'branches',
      'frames',
      'package_inclusion_attires',
      'package_inclusions',
      'print_sizes',
      'service_packages',
    ]);
  });
});
