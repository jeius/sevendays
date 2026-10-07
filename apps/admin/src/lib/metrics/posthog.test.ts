// The PostHog HogQL half of the metrics seam (#187): the four pinned
// query documents (built by pure functions), the host escaping, the
// columns/results zip, the munging, and the fetch contract with its
// failure mapping. Plain-node over stubbed fetch — no network, no
// browser (the admin lib-seam pattern). Dialect facts pinned in the plan
// header; the quantile + parallel-arrays fallbacks live in Global
// Constraints and are live-probe-gated (Task 7), never speculative.
import { describe, expect, it } from 'vitest';
import type { MetricsEnv } from './env';
import {
  escapeHogqlString,
  fetchTrafficMetrics,
  isoToHogqlDatetime,
  mungeTopPages,
  mungeTrafficSeries,
  mungeVitals,
  mungeWindowTotals,
  normalizeHogqlTimestamp,
  pageviewSeriesQuery,
  topPagesQuery,
  vitalsQuery,
  windowTotalsQuery,
  zipHogqlRows,
} from './posthog';

const ENV: MetricsEnv = {
  cf: null,
  r2: null,
  posthog: {
    personalApiKey: 'ph-key',
    projectId: 'ph-project',
    apiHost: 'https://us.i.posthog.com',
    landingHosts: ['sevendays-landing.workers.dev'],
  },
  dbUrl: null,
};

const RANGE = { since: '2026-10-01T12:00:00.000Z', until: '2026-10-08T12:00:00.000Z' };

// The shared filter fragment every pageview document pins — asserted once
// here and reused by the document expectations below.
const FILTER = [
  "event = '$pageview'",
  "  and timestamp >= toDateTime('2026-10-01 12:00:00')",
  "  and timestamp <= toDateTime('2026-10-08 12:00:00')",
  "  and properties.$host in ('sevendays-landing.workers.dev')",
].join('\n');

describe('the pinned HogQL documents', () => {
  it('the pageview series is daily for 7d/30d and hourly for 24h (the spec pins by-day; 24h needs hour grain)', () => {
    const daily = `select toStartOfDay(timestamp) as day, count() as pageviews, count(distinct distinct_id) as uniques
from events
where ${FILTER}
group by day
order by day`;
    expect(pageviewSeriesQuery('7d', RANGE, ENV.posthog?.landingHosts ?? [])).toBe(daily);
    expect(pageviewSeriesQuery('30d', RANGE, ENV.posthog?.landingHosts ?? [])).toBe(daily);
    expect(pageviewSeriesQuery('24h', RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      daily.replace('toStartOfDay(timestamp)', 'toStartOfHour(timestamp)')
    );
  });

  it('the window totals re-pin the filter (window uniques are their own query — summed dailies double-count)', () => {
    expect(windowTotalsQuery(RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      `select count() as pageviews, count(distinct distinct_id) as uniques
from events
where ${FILTER}`
    );
  });

  it('the top-pages document groups by pathname, orders, and limits 5', () => {
    expect(topPagesQuery(RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      `select properties.$pathname as path, count() as pageviews
from events
where ${FILTER}
group by path
order by pageviews desc
limit 5`
    );
  });

  it('the vitals document swaps the event and pins the four p75 quantiles', () => {
    expect(vitalsQuery(RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      `select properties.$pathname as route,
  quantile(0.75)(properties.$web_vitals_LCP_value) as lcp_p75,
  quantile(0.75)(properties.$web_vitals_CLS_value) as cls_p75,
  quantile(0.75)(properties.$web_vitals_FCP_value) as fcp_p75,
  quantile(0.75)(properties.$web_vitals_INP_value) as inp_p75
from events
where ${FILTER.replace("event = '$pageview'", "event = '$web_vitals'")}
group by route
order by lcp_p75 desc
limit 10`
    );
  });

  it('host names are single-quote-escaped (HogQL doubled quotes)', () => {
    expect(escapeHogqlString("o'brien")).toBe("o''brien");
    expect(
      pageviewSeriesQuery('7d', RANGE, ["lo'alhost"]).includes("properties.$host in ('lo''alhost')")
    ).toBe(true);
  });
});

describe('the response helpers', () => {
  it('isoToHogqlDatetime slices ISO to the ClickHouse datetime literal', () => {
    expect(isoToHogqlDatetime('2026-10-01T12:34:56.789Z')).toBe('2026-10-01 12:34:56');
  });

  it('normalizeHogqlTimestamp treats HogQL DateTime strings as UTC and passes ISO through', () => {
    expect(normalizeHogqlTimestamp('2026-10-06 00:00:00')).toBe('2026-10-06T00:00:00.000Z');
    expect(normalizeHogqlTimestamp('2026-10-06T00:00:00.000Z')).toBe('2026-10-06T00:00:00.000Z');
    expect(normalizeHogqlTimestamp(null)).toBeNull();
  });

  it('zipHogqlRows zips the parallel columns/results arrays into keyed rows', () => {
    expect(
      zipHogqlRows(
        ['day', 'pageviews'],
        [
          ['2026-10-06 00:00:00', 3],
          ['2026-10-07 00:00:00', 5],
        ]
      )
    ).toEqual([
      { day: '2026-10-06 00:00:00', pageviews: 3 },
      { day: '2026-10-07 00:00:00', pageviews: 5 },
    ]);
  });
});

describe('the munging', () => {
  it('mungeTrafficSeries normalizes, sorts, and numbers the daily rows', () => {
    expect(
      mungeTrafficSeries([
        { day: '2026-10-07 00:00:00', pageviews: '5', uniques: '2' },
        { day: '2026-10-06 00:00:00', pageviews: 3, uniques: 1 },
      ])
    ).toEqual([
      { bucketStart: '2026-10-06T00:00:00.000Z', pageviews: 3, uniques: 1 },
      { bucketStart: '2026-10-07T00:00:00.000Z', pageviews: 5, uniques: 2 },
    ]);
  });

  it('mungeTrafficSeries drops rows whose day does not parse', () => {
    expect(mungeTrafficSeries([{ day: 'not-a-date', pageviews: 1, uniques: 1 }])).toEqual([]);
  });

  it('mungeWindowTotals zeroes on an empty result', () => {
    expect(mungeWindowTotals([])).toEqual({ pageviews: 0, uniques: 0 });
    expect(mungeWindowTotals([{ pageviews: 41, uniques: 9 }])).toEqual({
      pageviews: 41,
      uniques: 9,
    });
  });

  it('mungeTopPages keeps order and folds null paths to (no path)', () => {
    expect(
      mungeTopPages([
        { path: '/packages', pageviews: 12 },
        { path: null, pageviews: 2 },
      ])
    ).toEqual([
      { path: '/packages', pageviews: 12 },
      { path: '(no path)', pageviews: 2 },
    ]);
  });

  it('mungeVitals numbers present metrics, nulls absent ones, and folds null routes', () => {
    expect(
      mungeVitals([
        {
          route: '/book',
          lcp_p75: 2410.5,
          cls_p75: null,
          fcp_p75: 900,
          inp_p75: 180,
        },
        { route: null, lcp_p75: null, cls_p75: 0.05, fcp_p75: null, inp_p75: null },
      ])
    ).toEqual([
      { route: '/book', lcpP75: 2410.5, clsP75: null, fcpP75: 900, inpP75: 180 },
      { route: '(no path)', lcpP75: null, clsP75: 0.05, fcpP75: null, inpP75: null },
    ]);
  });
});

describe('fetchTrafficMetrics', () => {
  it('posts the four documents with bearer auth, one fetch each, and munges the union', async () => {
    const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
    const fetchImpl = async (url: unknown, init: RequestInit) => {
      calls.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
      const which = calls.length;
      const columns = ['day', 'pageviews', 'uniques'];
      const results: unknown[][] =
        which === 1
          ? [['2026-10-06 00:00:00', 30, 8]]
          : which === 2
            ? [[30, 8]]
            : which === 3
              ? [['/packages', 12]]
              : [['/book', 2410.5, null, 900, 180]];
      return {
        ok: true,
        json: async () => ({
          columns:
            which === 2
              ? ['pageviews', 'uniques']
              : which === 3
                ? ['path', 'pageviews']
                : which === 4
                  ? ['route', 'lcp_p75', 'cls_p75', 'fcp_p75', 'inp_p75']
                  : columns,
          results,
        }),
      };
    };
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.totals).toEqual({ pageviews: 30, uniques: 8 });
    expect(result.data.series).toEqual([
      { bucketStart: '2026-10-06T00:00:00.000Z', pageviews: 30, uniques: 8 },
    ]);
    expect(result.data.topPages).toEqual([{ path: '/packages', pageviews: 12 }]);
    expect(result.data.vitals).toEqual([
      { route: '/book', lcpP75: 2410.5, clsP75: null, fcpP75: 900, inpP75: 180 },
    ]);
    expect(calls).toHaveLength(4);
    expect(calls[0]?.url).toBe('https://us.i.posthog.com/api/projects/ph-project/query/');
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer ph-key');
    expect(calls[0]?.body).toMatchObject({
      query: { kind: 'HogQLQuery' },
      name: 'sevendays-admin-dashboard',
    });
  });

  it('an unconfigured posthog source resolves not-configured (no fetch at all)', async () => {
    let fetched = 0;
    const fetchImpl = async () => {
      fetched += 1;
      throw new Error('must not be called');
    };
    // A MetricsEnv-typed non-fresh value: the structural { posthog }
    // parameter accepts the full env without the fresh-literal excess check.
    const unconfigured: MetricsEnv = { cf: null, r2: null, posthog: null, dbUrl: null };
    const result = await fetchTrafficMetrics(
      unconfigured,
      '7d',
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetched).toBe(0);
  });

  it('a non-200 response maps to unavailable', async () => {
    const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a body-level error maps to unavailable — the loud detail is log-only', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ error: 'invalid query' }),
    });
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a non-array columns/results pair maps to unavailable (unexpected envelope)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ results: {} }) });
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a thrown fetch (network) maps to unavailable', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
