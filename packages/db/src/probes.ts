// The metrics probe module (#186, ADR-0023): the DB half of the admin's
// metrics seam. DB access goes through packages/db — the system-view SQL
// (pg_stat_activity, pg_database_size) has no schema table, so it ships as
// pinned static strings executed over the caller's client. Everything is
// deliberately drizzle-free at the seam: callers pass a structural `exec`
// (drizzle's db.execute satisfies it; tests pass fakes), so no drizzle
// type ever reaches apps/admin. Spike-proven 2026-10-06 against the compose
// db: execute returns the rows array; ::int parses as number, int8 as
// string; timestamptz as a PG string needing normalization.
export type SqlExec = (statement: string) => Promise<Record<string, unknown>[]>;

// Supavisor's session-pooler client ceiling at Micro compute (the dev/studio
// plan) — a REFERENCE marker for the census widget, not a quota (research
// #174: ceilings are compute-tied and hard-coded).
export const POOLER_CLIENT_CEILING = 200;

export const PROBE_LATENCY_SQL = 'select 1';
export const PROBE_CENSUS_SQL =
  'select state, count(*)::int as count from pg_stat_activity where datname = current_database() group by state order by state';
export const PROBE_SIZE_SQL = 'select pg_database_size(current_database()) as bytes';

export type ContentFamilyKey = 'packages' | 'addons' | 'photos' | 'testimonials';

export const CONTENT_CENSUS_SQL: Record<ContentFamilyKey, string> = {
  packages:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from service_packages',
  addons:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from addon_services',
  photos:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from gallery_photos',
  testimonials:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from testimonials',
};

export type PoolerCensus = {
  byState: Record<string, number>;
  total: number;
  ceiling: number;
};

export type SystemProbes = {
  latencyMs: number;
  census: PoolerCensus;
  sizeBytes: number;
};

export type ContentCensusRow = {
  key: ContentFamilyKey;
  activeCount: number;
  lastUpdated: string | null;
};

export type ContentCensus = ContentCensusRow[];

export function mungeCensus(rows: Record<string, unknown>[]): PoolerCensus {
  const byState: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const state = typeof row.state === 'string' && row.state !== '' ? row.state : 'unknown';
    const count = Number(row.count);
    byState[state] = (byState[state] ?? 0) + count;
    total += count;
  }
  return { byState, total, ceiling: POOLER_CLIENT_CEILING };
}

export function parseSizeBytes(rows: Record<string, unknown>[]): number {
  return Number(rows[0]?.bytes);
}

export function parsePgTimestamp(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  // PG's timestamptz text form ("2026-10-06 09:05:17.721406+00") → ISO.
  const normalized = String(raw).replace(' ', 'T').replace(/\+00$/, '+00:00');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function mungeContentRow(
  key: ContentFamilyKey,
  rows: Record<string, unknown>[]
): ContentCensusRow {
  return {
    key,
    activeCount: Number(rows[0]?.active),
    lastUpdated: parsePgTimestamp(rows[0]?.last_updated),
  };
}

export async function runSystemProbes(exec: SqlExec): Promise<SystemProbes> {
  const start = performance.now();
  await exec(PROBE_LATENCY_SQL);
  const latencyMs = Math.round((performance.now() - start) * 10) / 10;
  const censusRows = await exec(PROBE_CENSUS_SQL);
  const sizeRows = await exec(PROBE_SIZE_SQL);
  return {
    latencyMs,
    census: mungeCensus(censusRows),
    sizeBytes: parseSizeBytes(sizeRows),
  };
}

export async function runContentCensus(exec: SqlExec): Promise<ContentCensus> {
  const keys = Object.keys(CONTENT_CENSUS_SQL) as ContentFamilyKey[];
  const rows = await Promise.all(keys.map((key) => exec(CONTENT_CENSUS_SQL[key])));
  return keys.map((key, index) => mungeContentRow(key, rows[index] ?? []));
}
