// The DB-probe seams of the metrics module (#186): the SQL shapes live in
// packages/db (the "DB access goes through packages/db" rule — the raw SQL
// for system views has no schema table, so it ships as pinned constants),
// the munging is pure, and everything runs plain-node over fakes (the
// admin lib-seam pattern — no db, no browser).

import {
  CONTENT_CENSUS_SQL,
  mungeCensus,
  mungeContentRow,
  POOLER_CLIENT_CEILING,
  PROBE_CENSUS_SQL,
  PROBE_LATENCY_SQL,
  PROBE_SIZE_SQL,
  parsePgTimestamp,
  parseSizeBytes,
} from '@sevendays/db';
import { describe, expect, it } from 'vitest';

describe('the probe SQL shapes (spike-proven against the compose db)', () => {
  it('latency is the timed round-trip statement', () => {
    expect(PROBE_LATENCY_SQL).toBe('select 1');
  });

  it('census counts by state for the current database only', () => {
    expect(PROBE_CENSUS_SQL).toBe(
      'select state, count(*)::int as count from pg_stat_activity where datname = current_database() group by state order by state'
    );
  });

  it('size reads the current database size in bytes', () => {
    expect(PROBE_SIZE_SQL).toBe('select pg_database_size(current_database()) as bytes');
  });

  it('content census counts active rows and last-updated per family (the ::int cast is load-bearing — bare count(*) is int8 → string through postgres-js)', () => {
    expect(CONTENT_CENSUS_SQL.packages).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from service_packages'
    );
    expect(CONTENT_CENSUS_SQL.addons).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from addon_services'
    );
    expect(CONTENT_CENSUS_SQL.photos).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from gallery_photos'
    );
    expect(CONTENT_CENSUS_SQL.testimonials).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from testimonials'
    );
  });
});

describe('mungeCensus', () => {
  it('maps rows to by-state counts with a total and a null state folding to unknown', () => {
    const census = mungeCensus([
      { state: 'active', count: 2 },
      { state: 'idle', count: 5 },
      { state: null, count: 1 },
    ]);
    expect(census).toEqual({
      byState: { active: 2, idle: 5, unknown: 1 },
      total: 8,
      ceiling: POOLER_CLIENT_CEILING,
    });
  });
});

describe('parseSizeBytes', () => {
  it('parses the int8 string postgres-js hands back', () => {
    expect(parseSizeBytes([{ bytes: '10573491' }])).toBe(10573491);
  });

  it('tolerates an already-numeric driver', () => {
    expect(parseSizeBytes([{ bytes: 10573491 }])).toBe(10573491);
  });
});

describe('parsePgTimestamp', () => {
  it('normalizes the PG timestamptz string to an ISO string (spike-verified round-trip)', () => {
    expect(parsePgTimestamp('2026-10-06 09:05:17.721406+00')).toBe('2026-10-06T09:05:17.721Z');
  });
});

describe('mungeContentRow', () => {
  it('keeps the active count and normalizes last-updated', () => {
    expect(
      mungeContentRow('packages', [{ active: 2, last_updated: '2026-10-06 09:05:17.721406+00' }])
    ).toEqual({
      key: 'packages',
      activeCount: 2,
      lastUpdated: '2026-10-06T09:05:17.721Z',
    });
  });

  it('an empty table munges to zero-and-null (max() over no rows is null)', () => {
    expect(mungeContentRow('photos', [{ active: 0, last_updated: null }])).toEqual({
      key: 'photos',
      activeCount: 0,
      lastUpdated: null,
    });
  });
});
