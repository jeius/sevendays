// System Health (#186): the api's request/error-rate trends + CPU
// quantiles, the DB probes (latency, pooler census, size), the two
// per-frontend error widgets (#178), and the Sentry link-out — one
// workers query (shared cache with the Sentry + frontend widgets) + one
// probes query. Every widget folds to its curated state; the page never
// 500s.
import { useQuery } from '@tanstack/react-query';
import type { MetricsWindow, WorkerSeries } from '#/lib/metrics/cf';
import { errorRate } from '#/lib/metrics/cf';
import { metricsQueries } from '#/lib/metrics-queries';
import { TrendChart } from '../charts/trend-chart';
import { formatBytes, formatCount, formatPercent } from './format';
import { FrontendErrorWidget } from './frontend-error-widget';
import { SentryLinkWidget } from './sentry-link';
import { resolveWidgetState, WidgetFrame } from './widget-frame';

// The frontend widgets render their own curated states off the shared
// workersState; the empty series only satisfies the prop when not ready,
// so its numbers never paint.
const EMPTY_SERIES: WorkerSeries = {
  scriptName: '',
  points: [],
  totals: { requests: 0, errors: 0 },
  cpu: { p50MsMax: 0, p99MsMax: 0 },
};

export function SystemHealth({ window }: { window: MetricsWindow }) {
  const workers = useQuery(metricsQueries.workers(window));
  const workersState = resolveWidgetState(
    workers.isPending,
    workers.isError,
    workers.data?.ok,
    workers.data?.ok === false ? workers.data.reason : undefined
  );
  const probes = useQuery(metricsQueries.dbProbes());
  const probesState = resolveWidgetState(
    probes.isPending,
    probes.isError,
    probes.data?.ok,
    probes.data?.ok === false ? probes.data.reason : undefined
  );

  return (
    <section className='space-y-4' aria-label='System Health'>
      <h2 className='text-lg font-semibold tracking-tight'>System Health</h2>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='API requests' badge={window} state={workersState}>
          {workers.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(workers.data.data.api.totals.requests)}
              </p>
              <TrendChart
                ariaLabel='API request trend'
                color='var(--chart-1)'
                data={workers.data.data.api.points.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.requests,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='API error rate' badge={window} state={workersState}>
          {workers.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatPercent(errorRate(workers.data.data.api))}
              </p>
              <p className='text-muted-foreground text-xs'>
                {formatCount(workers.data.data.api.totals.errors)} errors
              </p>
              <TrendChart
                ariaLabel='API error-rate trend'
                color='var(--chart-2)'
                variant='line'
                data={workers.data.data.api.points.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.requests > 0 ? point.errors / point.requests : 0,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='CPU time (max)' badge={window} state={workersState}>
          {workers.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {workers.data.data.api.cpu.p99MsMax} ms
              </p>
              <p className='text-muted-foreground text-xs'>
                p99 · p50 {workers.data.data.api.cpu.p50MsMax} ms
              </p>
            </>
          ) : null}
        </WidgetFrame>
        <SentryLinkWidget
          window={window}
          state={workersState}
          errors={workers.data?.ok ? workers.data.data.api.totals.errors : null}
        />
        <FrontendErrorWidget
          window={window}
          app='landing'
          series={workers.data?.ok ? workers.data.data.landing : EMPTY_SERIES}
          state={workersState === 'ready' ? 'ready' : workersState}
        />
        <FrontendErrorWidget
          window={window}
          app='admin'
          series={workers.data?.ok ? workers.data.data.admin : EMPTY_SERIES}
          state={workersState === 'ready' ? 'ready' : workersState}
        />
        <WidgetFrame title='DB latency' state={probesState}>
          {probes.data?.ok ? (
            <p className='text-2xl font-semibold tabular-nums'>{probes.data.data.latencyMs} ms</p>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='DB size' state={probesState}>
          {probes.data?.ok ? (
            <p className='text-2xl font-semibold tabular-nums'>
              {formatBytes(probes.data.data.sizeBytes)}
            </p>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Pooler connections' state={probesState}>
          {probes.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {probes.data.data.census.total} / {probes.data.data.census.ceiling}
              </p>
              <p className='text-muted-foreground text-xs'>
                {Object.entries(probes.data.data.census.byState)
                  .map(([state, count]) => `${state} ${count}`)
                  .join(' · ')}
              </p>
              <p className='text-muted-foreground text-xs'>
                Ceiling is the Micro-compute reference, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
      </div>
    </section>
  );
}
