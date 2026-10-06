// The CF GraphQL Analytics client (#186, ADR-0023): ONE pinned
// workersInvocationsAdaptive document, three parallel scriptName-filtered
// fetches (api, landing, admin), envelope unwrap, and the widget munging.
// Document shape pinned from Cloudflare's "Query Workers invocation
// metrics via GraphQL" tutorial (account-level viewer/accounts; sum
// requests/errors/subrequests; quantiles cpuTimeP50/P99 in MICROSECONDS).
// If the live probe (Task 6) rejects the `Time!` scalar on the datetime
// variables, switch both to `string!` HERE and in the shape test — that
// is the one documented fallback, nothing else about the doc moves.
import { z } from 'zod';

import type { CfAnalyticsConfig, MetricsEnv, MetricsResult } from './env';

export const CF_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

export const WORKER_INVOCATIONS_QUERY = `query WorkerInvocations($accountTag: string!, $scriptName: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      workersInvocationsAdaptive(
        limit: 10000
        filter: {scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until}
      ) {
        dimensions { datetime scriptName }
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 }
      }
    }
  }
}`;

export const METRICS_WINDOWS = ['24h', '7d', '30d'] as const;
export type MetricsWindow = (typeof METRICS_WINDOWS)[number];

export const metricsWindowSchema = z.enum(METRICS_WINDOWS);

const WINDOW_MS: Record<MetricsWindow, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// Adaptive datasets coarsen their `datetime` granularity as data ages, so
// the range boundaries are ms-truncated ISO strings and the munging
// re-buckets client-side — the incoming granularity never matters.
export function windowToRange(
  window: MetricsWindow,
  now: Date = new Date()
): { since: string; until: string } {
  const untilMs = Math.floor(now.getTime() / 1000) * 1000;
  const sinceMs = untilMs - WINDOW_MS[window];
  return {
    since: new Date(sinceMs).toISOString(),
    until: new Date(untilMs).toISOString(),
  };
}

export type InvocationsRow = {
  dimensions: { datetime: string; scriptName: string };
  sum: { requests: number; errors: number; subrequests: number };
  quantiles: { cpuTimeP50: number; cpuTimeP99: number };
};

export type WorkerSeriesPoint = {
  bucketStart: string;
  requests: number;
  errors: number;
  cpuTimeP50Us: number;
  cpuTimeP99Us: number;
};

export type WorkerSeries = {
  scriptName: string;
  points: WorkerSeriesPoint[];
  totals: { requests: number; errors: number };
  cpu: { p50MsMax: number; p99MsMax: number };
};

export type WorkerMetrics = {
  api: WorkerSeries;
  landing: WorkerSeries;
  admin: WorkerSeries;
};

function bucketStart(iso: string, window: MetricsWindow): string {
  const date = new Date(iso);
  if (window === '30d') {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    ).toISOString();
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours())
  ).toISOString();
}

export function mungeWorkerSeries(
  scriptName: string,
  rows: InvocationsRow[],
  window: MetricsWindow
): WorkerSeries {
  const buckets = new Map<string, WorkerSeriesPoint>();
  const totals = { requests: 0, errors: 0 };
  let p50UsMax = 0;
  let p99UsMax = 0;
  for (const row of rows) {
    const key = bucketStart(row.dimensions.datetime, window);
    const bucket =
      buckets.get(key) ??
      ({
        bucketStart: key,
        requests: 0,
        errors: 0,
        cpuTimeP50Us: 0,
        cpuTimeP99Us: 0,
      } satisfies WorkerSeriesPoint);
    bucket.requests += row.sum.requests;
    bucket.errors += row.sum.errors;
    bucket.cpuTimeP50Us = Math.max(bucket.cpuTimeP50Us, row.quantiles.cpuTimeP50);
    bucket.cpuTimeP99Us = Math.max(bucket.cpuTimeP99Us, row.quantiles.cpuTimeP99);
    buckets.set(key, bucket);
    totals.requests += row.sum.requests;
    totals.errors += row.sum.errors;
    p50UsMax = Math.max(p50UsMax, row.quantiles.cpuTimeP50);
    p99UsMax = Math.max(p99UsMax, row.quantiles.cpuTimeP99);
  }
  return {
    scriptName,
    points: [...buckets.values()].sort((a, b) => a.bucketStart.localeCompare(b.bucketStart)),
    totals,
    cpu: {
      p50MsMax: Math.round((p50UsMax / 1000) * 10) / 10,
      p99MsMax: Math.round((p99UsMax / 1000) * 10) / 10,
    },
  };
}

export function errorRate(series: { totals: { requests: number; errors: number } }): number | null {
  if (series.totals.requests <= 0) return null;
  return series.totals.errors / series.totals.requests;
}

async function fetchOneSeries(
  cf: CfAnalyticsConfig,
  scriptName: string,
  window: MetricsWindow,
  fetchImpl: typeof fetch
): Promise<WorkerSeries> {
  const { since, until } = windowToRange(window);
  const res = await fetchImpl(CF_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cf.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: WORKER_INVOCATIONS_QUERY,
      variables: {
        accountTag: cf.accountId,
        scriptName,
        since,
        until,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: {
      viewer?: {
        accounts?: Array<{
          workersInvocationsAdaptive?: InvocationsRow[];
        }>;
      };
    };
    errors?: Array<{ message?: string }>;
  };
  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors[0]?.message ?? 'GraphQL error');
  }
  const rows = body.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  return mungeWorkerSeries(scriptName, rows, window);
}

export async function fetchWorkerMetrics(
  env: MetricsEnv,
  window: MetricsWindow,
  fetchImpl: typeof fetch = fetch
): Promise<MetricsResult<WorkerMetrics>> {
  const cf = env.cf;
  if (cf === null) {
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const [api, landing, admin] = await Promise.all([
      fetchOneSeries(cf, cf.scripts.api, window, fetchImpl),
      fetchOneSeries(cf, cf.scripts.landing, window, fetchImpl),
      fetchOneSeries(cf, cf.scripts.admin, window, fetchImpl),
    ]);
    return { ok: true, data: { api, landing, admin } };
  } catch (error) {
    // The loud detail stays log-only (#155): one line naming the source.
    console.error(
      '[metrics] CF GraphQL source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
