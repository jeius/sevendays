// One error-rate widget per frontend (#178's addition, landed at #186):
// the frontends' only countable server-error home — the same CF GraphQL
// source, the same workersInvocationsAdaptive shape, scoped to the
// frontend's own Worker name. It receives the already-fetched series from
// SystemHealth (one workers query = one cache entry, never three) plus
// the shared widget state, so an unavailable source still renders both
// widgets' frames with their curated lines.

import type { MetricsWindow, WorkerSeries } from '#/lib/metrics/cf';
import { errorRate } from '#/lib/metrics/cf';
import { TrendChart } from '../charts/trend-chart';
import { formatCount, formatPercent } from './format';
import { WidgetFrame, type WidgetState } from './widget-frame';

export function FrontendErrorWidget({
  window,
  app,
  series,
  state = 'ready',
}: {
  window: MetricsWindow;
  app: 'landing' | 'admin';
  series: WorkerSeries;
  state?: WidgetState;
}) {
  return (
    <WidgetFrame
      title={app === 'landing' ? 'Landing errors' : 'Admin errors'}
      badge={window}
      state={state}
    >
      <p className='text-2xl font-semibold tabular-nums'>{formatCount(series.totals.errors)}</p>
      <p className='text-muted-foreground text-xs'>
        {formatPercent(errorRate(series))} of {formatCount(series.totals.requests)} requests
      </p>
      <TrendChart
        ariaLabel={`Error count trend, ${app}`}
        color='var(--chart-2)'
        data={series.points.map((point) => ({
          bucketStart: point.bucketStart,
          value: point.errors,
        }))}
      />
    </WidgetFrame>
  );
}
