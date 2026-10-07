// The PostHog HogQL half of the metrics seam (#187, ADR-0023): four
// pinned documents (pure builders — never ad-hoc concatenation at call
// sites), landing-scoped by the $host allowlist (the admin's own events
// stay captured but never join Traffic), one request per document over
// the Query API (POST {host}/api/projects/{id}/query/, Bearer personal
// key, HogQLQuery kind, a name for query_log). The blocking response is
// parallel columns/results arrays — zipped here. Failure mapping is the
// #155 class: resolve unavailable, one log-only line, never a throw.
// Dialect fallbacks (quantileTDigest; objects-rows) live in the plan's
// Global Constraints and are live-probe-gated only.

import type { MetricsWindow } from './cf';
import { windowToRange } from './cf';
import type { MetricsResult, PosthogConfig } from './env';

export const POSTHOG_QUERY_NAME = 'sevendays-admin-dashboard';

export type TrafficPoint = {
  bucketStart: string;
  pageviews: number;
  uniques: number;
};

export type TopPage = { path: string; pageviews: number };

export type VitalsRow = {
  route: string;
  lcpP75: number | null;
  clsP75: number | null;
  fcpP75: number | null;
  inpP75: number | null;
};

export type TrafficMetrics = {
  series: TrafficPoint[];
  totals: { pageviews: number; uniques: number };
  topPages: TopPage[];
  vitals: VitalsRow[];
};

export function escapeHogqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export function isoToHogqlDatetime(iso: string): string {
  return iso.slice(0, 19).replace('T', ' ');
}

function hogqlHostList(hosts: string[]): string {
  return hosts.map((host) => `'${escapeHogqlString(host)}'`).join(', ');
}

function eventsFilter(
  event: '$pageview' | '$web_vitals',
  range: { since: string; until: string },
  hosts: string[]
): string {
  return [
    `event = '${event}'`,
    `timestamp >= toDateTime('${isoToHogqlDatetime(range.since)}')`,
    `timestamp <= toDateTime('${isoToHogqlDatetime(range.until)}')`,
    `properties.$host in (${hogqlHostList(hosts)})`,
  ].join('\n  and ');
}

// 24h buckets hourly (a day-bucketed 24h window is one point); 7d/30d
// bucket daily (the spec pins pageviews + uniques by day).
export function pageviewSeriesQuery(
  window: MetricsWindow,
  range: { since: string; until: string },
  hosts: string[]
): string {
  const bucket = window === '24h' ? 'toStartOfHour(timestamp)' : 'toStartOfDay(timestamp)';
  return [
    `select ${bucket} as day, count() as pageviews, count(distinct distinct_id) as uniques`,
    'from events',
    `where ${eventsFilter('$pageview', range, hosts)}`,
    'group by day',
    'order by day',
  ].join('\n');
}

// Window-total uniques are their own document — summing daily uniques
// would double-count visitors seen on multiple days.
export function windowTotalsQuery(
  range: { since: string; until: string },
  hosts: string[]
): string {
  return [
    'select count() as pageviews, count(distinct distinct_id) as uniques',
    'from events',
    `where ${eventsFilter('$pageview', range, hosts)}`,
  ].join('\n');
}

export function topPagesQuery(range: { since: string; until: string }, hosts: string[]): string {
  return [
    'select properties.$pathname as path, count() as pageviews',
    'from events',
    `where ${eventsFilter('$pageview', range, hosts)}`,
    'group by path',
    'order by pageviews desc',
    'limit 5',
  ].join('\n');
}

export function vitalsQuery(range: { since: string; until: string }, hosts: string[]): string {
  return [
    'select properties.$pathname as route,',
    '  quantile(0.75)(properties.$web_vitals_LCP_value) as lcp_p75,',
    '  quantile(0.75)(properties.$web_vitals_CLS_value) as cls_p75,',
    '  quantile(0.75)(properties.$web_vitals_FCP_value) as fcp_p75,',
    '  quantile(0.75)(properties.$web_vitals_INP_value) as inp_p75',
    'from events',
    `where ${eventsFilter('$web_vitals', range, hosts)}`,
    'group by route',
    'order by lcp_p75 desc',
    'limit 10',
  ].join('\n');
}

export function zipHogqlRows(columns: string[], results: unknown[][]): Record<string, unknown>[] {
  return results.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      record[column] = row[index];
    });
    return record;
  });
}

export function normalizeHogqlTimestamp(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let text = String(raw).trim().replace(' ', 'T');
  if (!text.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(text)) {
    text = `${text}+00:00`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function numOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function pathOrNull(raw: unknown): string {
  return typeof raw === 'string' && raw !== '' ? raw : '(no path)';
}

export function mungeTrafficSeries(rows: Record<string, unknown>[]): TrafficPoint[] {
  return rows
    .map((row) => ({
      bucketStart: normalizeHogqlTimestamp(row.day),
      pageviews: Number(row.pageviews ?? 0),
      uniques: Number(row.uniques ?? 0),
    }))
    .filter((point): point is TrafficPoint => point.bucketStart !== null)
    .sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}

export function mungeWindowTotals(rows: Record<string, unknown>[]): {
  pageviews: number;
  uniques: number;
} {
  const row = rows[0] ?? {};
  return { pageviews: Number(row.pageviews ?? 0), uniques: Number(row.uniques ?? 0) };
}

export function mungeTopPages(rows: Record<string, unknown>[]): TopPage[] {
  return rows.map((row) => ({
    path: pathOrNull(row.path),
    pageviews: Number(row.pageviews ?? 0),
  }));
}

export function mungeVitals(rows: Record<string, unknown>[]): VitalsRow[] {
  return rows.map((row) => ({
    route: pathOrNull(row.route),
    lcpP75: numOrNull(row.lcp_p75),
    clsP75: numOrNull(row.cls_p75),
    fcpP75: numOrNull(row.fcp_p75),
    inpP75: numOrNull(row.inp_p75),
  }));
}

async function runHogql(
  posthog: PosthogConfig,
  query: string,
  fetchImpl: typeof fetch
): Promise<Record<string, unknown>[]> {
  const res = await fetchImpl(`${posthog.apiHost}/api/projects/${posthog.projectId}/query/`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${posthog.personalApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: { kind: 'HogQLQuery', query },
      name: POSTHOG_QUERY_NAME,
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    results?: unknown;
    columns?: unknown;
    error?: unknown;
  };
  if (body.error !== null && body.error !== undefined) {
    throw new Error(String(body.error));
  }
  if (!Array.isArray(body.columns) || !Array.isArray(body.results)) {
    throw new Error('unexpected response shape');
  }
  return zipHogqlRows(body.columns, body.results);
}

// The env parameter is structural ({ posthog }) so tests pass a minimal
// object and Task 3 passes the full MetricsEnv unchanged.
export async function fetchTrafficMetrics(
  env: { posthog: PosthogConfig | null },
  window: MetricsWindow,
  fetchImpl: typeof fetch = fetch
): Promise<MetricsResult<TrafficMetrics>> {
  const posthog = env.posthog;
  if (posthog === null) {
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const range = windowToRange(window);
    const [seriesRows, totalsRows, topRows, vitalsRows] = await Promise.all([
      runHogql(posthog, pageviewSeriesQuery(window, range, posthog.landingHosts), fetchImpl),
      runHogql(posthog, windowTotalsQuery(range, posthog.landingHosts), fetchImpl),
      runHogql(posthog, topPagesQuery(range, posthog.landingHosts), fetchImpl),
      runHogql(posthog, vitalsQuery(range, posthog.landingHosts), fetchImpl),
    ]);
    return {
      ok: true,
      data: {
        series: mungeTrafficSeries(seriesRows),
        totals: mungeWindowTotals(totalsRows),
        topPages: mungeTopPages(topRows),
        vitals: mungeVitals(vitalsRows),
      },
    };
  } catch (error) {
    // The loud detail stays log-only (#155): one line naming the source.
    console.error(
      '[metrics] PostHog source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
