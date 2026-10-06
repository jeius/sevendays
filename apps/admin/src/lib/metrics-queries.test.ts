// The dashboard's query-contract tests (#186): the spec's staleTimes
// (system 60s, content 5m), revalidate-on-focus stated explicitly, and
// window-keyed cache identity. Asserts the OPTIONS objects only — the
// server fns are never invoked from a plain-node test (the RPC wrapper
// needs request context; module import is safe, spike-proven).
import { describe, expect, it } from 'vitest';
import { metricsQueries } from './metrics-queries';

describe('metricsQueries (spec-verbatim caching posture)', () => {
  it('the system widgets stale at 60s and revalidate on focus', () => {
    expect(metricsQueries.workers('7d')).toMatchObject({
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    });
    expect(metricsQueries.dbProbes()).toMatchObject({
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    });
  });

  it('the content census stales at 5 minutes', () => {
    expect(metricsQueries.content()).toMatchObject({
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    });
  });

  it('the workers key carries the window (a toggle is a new cache entry)', () => {
    expect(metricsQueries.workers('24h').queryKey).toEqual(['metrics', 'workers', '24h']);
    expect(metricsQueries.workers('7d').queryKey).not.toEqual(
      metricsQueries.workers('30d').queryKey
    );
  });
});
