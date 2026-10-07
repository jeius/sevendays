// Storage & Media (#187): R2 stored-bytes trend + object count + the
// Class A/B operation counts with the free-tier budget markers — a COST
// SIGNAL, not a quota (the spec's words). Values are window-scoped; the
// markers are static monthly references labeled as such. One query for
// the whole section; every card folds to its curated state.
import { useQuery } from '@tanstack/react-query';

import type { MetricsWindow } from '#/lib/metrics/cf';
import { R2_FREE_TIER } from '#/lib/metrics/r2';
import { metricsQueries } from '#/lib/metrics-queries';
import { TrendChart } from '../charts/trend-chart';
import { formatBytes, formatCount, formatPercent } from './format';
import { resolveWidgetState, WidgetFrame } from './widget-frame';

export function StorageMediaSection({ window }: { window: MetricsWindow }) {
  const storage = useQuery(metricsQueries.storage(window));
  const state = resolveWidgetState(
    storage.isPending,
    storage.isError,
    storage.data?.ok,
    storage.data?.ok === false ? storage.data.reason : undefined
  );

  return (
    <section className='space-y-4' aria-label='Storage and Media'>
      <h2 className='text-lg font-semibold tracking-tight'>Storage &amp; Media</h2>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='Stored bytes' badge={window} state={state}>
          {storage.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {storage.data.data.latestPayloadSizeBytes === null
                  ? '—'
                  : formatBytes(storage.data.data.latestPayloadSizeBytes)}
              </p>
              <TrendChart
                ariaLabel='Stored bytes trend'
                variant='line'
                data={storage.data.data.trend.map((sample) => ({
                  bucketStart: sample.bucketStart,
                  value: sample.payloadSizeBytes,
                }))}
              />
              <p className='text-muted-foreground text-xs'>
                Free tier: 10 GB-month storage — a cost signal, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Objects' badge={window} state={state}>
          {storage.data?.ok ? (
            <p className='text-2xl font-semibold tabular-nums'>
              {storage.data.data.latestObjectCount === null
                ? '—'
                : formatCount(storage.data.data.latestObjectCount)}
            </p>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Class A operations' badge={window} state={state}>
          {storage.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(storage.data.data.ops.classA)}
              </p>
              <p className='text-muted-foreground text-xs'>
                {formatPercent(storage.data.data.ops.classA / R2_FREE_TIER.classAOps)} of the
                monthly marker
              </p>
              <p className='text-muted-foreground text-xs'>
                Free tier: 1M Class A ops / month — a cost signal, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Class B operations' badge={window} state={state}>
          {storage.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(storage.data.data.ops.classB)}
              </p>
              <p className='text-muted-foreground text-xs'>
                {formatPercent(storage.data.data.ops.classB / R2_FREE_TIER.classBOps)} of the
                monthly marker
              </p>
              <p className='text-muted-foreground text-xs'>
                Free tier: 10M Class B ops / month — a cost signal, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
      </div>
    </section>
  );
}
