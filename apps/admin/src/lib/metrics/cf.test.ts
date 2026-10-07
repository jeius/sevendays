// The CF GraphQL half of the metrics seam (#186): the pinned query shape
// (the tutorial-verbatim workersInvocationsAdaptive document), the fetch
// contract, the envelope + failure mapping, and the widget munging
// (bucketing, error rate, CPU µs→ms). Plain-node over stubbed fetch —
// no network, no browser (the admin lib-seam pattern).
import { describe, expect, it } from 'vitest';
import {
  CF_GRAPHQL_URL,
  errorRate,
  fetchWorkerMetrics,
  METRICS_WINDOWS,
  mungeWorkerSeries,
  WORKER_INVOCATIONS_QUERY,
  windowToRange,
} from './cf';
import type { MetricsEnv } from './env';

const ENV: MetricsEnv = {
  cf: {
    token: 'cf-token',
    accountId: 'account-id',
    scripts: {
      api: 'sevendays-api',
      landing: 'sevendays-landing',
      admin: 'sevendays-admin',
    },
  },
  r2: null,
  posthog: null,
  dbUrl: null,
};

function row(
  datetime: string,
  sum: { requests: number; errors: number },
  cpu: { p50: number; p99: number }
) {
  return {
    dimensions: { datetime, scriptName: 'sevendays-api' },
    sum: { ...sum, subrequests: 0 },
    quantiles: { cpuTimeP50: cpu.p50, cpuTimeP99: cpu.p99 },
  };
}

describe('the pinned GraphQL document', () => {
  it('is the tutorial-verbatim account-level workersInvocationsAdaptive shape', () => {
    expect(WORKER_INVOCATIONS_QUERY).toBe(
      [
        'query WorkerInvocations($accountTag: string!, $scriptName: string!, $since: Time!, $until: Time!) {',
        '  viewer {',
        '    accounts(filter: {accountTag: $accountTag}) {',
        '      workersInvocationsAdaptive(',
        '        limit: 10000',
        '        filter: {scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until}',
        '      ) {',
        '        dimensions { datetime scriptName }',
        '        sum { requests errors subrequests }',
        '        quantiles { cpuTimeP50 cpuTimeP99 }',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });
});

describe('windowToRange', () => {
  const now = new Date('2026-10-06T12:34:56.789Z');

  it('24h: since is exactly 24 hours before the ms-truncated until', () => {
    expect(windowToRange('24h', now)).toEqual({
      since: '2026-10-05T12:34:56.000Z',
      until: '2026-10-06T12:34:56.000Z',
    });
  });

  it('7d: seven days', () => {
    expect(windowToRange('7d', now).since).toBe('2026-09-29T12:34:56.000Z');
  });

  it('30d: thirty days, and the windows are exactly the pinned enum', () => {
    expect(windowToRange('30d', now).since).toBe('2026-09-06T12:34:56.000Z');
    expect(METRICS_WINDOWS).toEqual(['24h', '7d', '30d']);
  });
});

describe('mungeWorkerSeries', () => {
  it('buckets 7d rows by hour, summing requests/errors and max-ing the CPU quantiles', () => {
    const series = mungeWorkerSeries(
      'sevendays-api',
      [
        row('2026-10-06T11:04:00Z', { requests: 10, errors: 1 }, { p50: 1000, p99: 9000 }),
        row('2026-10-06T11:41:00Z', { requests: 5, errors: 0 }, { p50: 2000, p99: 7000 }),
        row('2026-10-06T10:20:00Z', { requests: 2, errors: 2 }, { p50: 500, p99: 3000 }),
      ],
      '7d'
    );
    expect(series.points).toHaveLength(2);
    const eleven = series.points.find((p) => p.bucketStart === '2026-10-06T11:00:00.000Z');
    expect(eleven).toMatchObject({
      requests: 15,
      errors: 1,
      cpuTimeP50Us: 2000,
      cpuTimeP99Us: 9000,
    });
    expect(series.totals).toEqual({ requests: 17, errors: 3 });
  });

  it('buckets 30d rows by day', () => {
    const series = mungeWorkerSeries(
      'sevendays-api',
      [
        row('2026-10-05T09:00:00Z', { requests: 4, errors: 0 }, { p50: 0, p99: 0 }),
        row('2026-10-05T21:00:00Z', { requests: 6, errors: 0 }, { p50: 0, p99: 0 }),
      ],
      '30d'
    );
    expect(series.points).toHaveLength(1);
    expect(series.points[0]).toMatchObject({
      bucketStart: '2026-10-05T00:00:00.000Z',
      requests: 10,
    });
  });

  it('the CPU headline is the max across buckets, converted µs→ms at one decimal', () => {
    const series = mungeWorkerSeries(
      'sevendays-api',
      [
        row('2026-10-06T11:00:00Z', { requests: 1, errors: 0 }, { p50: 1500, p99: 9000 }),
        row('2026-10-06T12:00:00Z', { requests: 1, errors: 0 }, { p50: 2500, p99: 4000 }),
      ],
      '24h'
    );
    expect(series.cpu).toEqual({ p50MsMax: 2.5, p99MsMax: 9 });
  });

  it('an empty dataset munges to a zeroed series, not an error', () => {
    const series = mungeWorkerSeries('sevendays-api', [], '7d');
    expect(series.points).toEqual([]);
    expect(series.totals).toEqual({ requests: 0, errors: 0 });
    expect(series.cpu).toEqual({ p50MsMax: 0, p99MsMax: 0 });
  });
});

describe('errorRate', () => {
  it('is errors over requests with a zero-guard', () => {
    expect(errorRate({ totals: { requests: 200, errors: 1 } })).toBe(0.005);
    expect(errorRate({ totals: { requests: 0, errors: 0 } })).toBeNull();
  });
});

describe('fetchWorkerMetrics', () => {
  it('posts the pinned document with bearer auth, one fetch per script, and munges each', async () => {
    const calls: Array<{ url: unknown; init: RequestInit }> = [];
    const fetchImpl = async (url: unknown, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () => ({
          data: {
            viewer: {
              accounts: [
                {
                  workersInvocationsAdaptive: [
                    row('2026-10-06T11:00:00Z', { requests: 3, errors: 0 }, { p50: 0, p99: 0 }),
                  ],
                },
              ],
            },
          },
        }),
      };
    };
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.api.scriptName).toBe('sevendays-api');
    expect(result.data.landing.scriptName).toBe('sevendays-landing');
    expect(result.data.admin.scriptName).toBe('sevendays-admin');
    expect(calls).toHaveLength(3);
    const first = calls[0];
    if (!first) throw new Error('unreachable');
    expect(first.url).toBe(CF_GRAPHQL_URL);
    expect(new Headers(first.init.headers).get('authorization')).toBe('Bearer cf-token');
    const body = JSON.parse(String(first.init.body));
    expect(body.query).toBe(WORKER_INVOCATIONS_QUERY);
    expect(body.variables).toEqual({
      accountTag: 'account-id',
      scriptName: 'sevendays-api',
      since: windowToRange('7d').since,
      until: windowToRange('7d').until,
    });
  });

  it('an unconfigured CF source resolves not-configured (no fetch at all)', async () => {
    let fetched = 0;
    const fetchImpl = async () => {
      fetched += 1;
      throw new Error('must not be called');
    };
    const result = await fetchWorkerMetrics(
      { cf: null, r2: null, posthog: null, dbUrl: null },
      '7d',
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetched).toBe(0);
  });

  it('a non-200 response maps to unavailable', async () => {
    const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a GraphQL errors array (HTTP 200) maps to unavailable — the loud detail is log-only', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ data: null, errors: [{ message: 'Unknown field' }] }),
    });
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a thrown fetch (network) maps to unavailable', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
