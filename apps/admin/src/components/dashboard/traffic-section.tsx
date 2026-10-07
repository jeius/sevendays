// Traffic (#187): the dashboard's audience half, landing-scoped by the
// host allowlist (the admin's own events never join these numbers).
// Hierarchy-led per the owner's #186 ruling — one primary metric big per
// card, trends as LINE; the lists are lists, not charts. One query for
// the whole section; every card folds to its curated state; the page
// never 500s.
import { useQuery } from '@tanstack/react-query';

import type { MetricsWindow } from '#/lib/metrics/cf';
import { metricsQueries } from '#/lib/metrics-queries';
import { TrendChart } from '../charts/trend-chart';
import { formatCls, formatCount, formatDurationMs } from './format';
import { resolveWidgetState, WidgetFrame } from './widget-frame';

export function TrafficSection({ window }: { window: MetricsWindow }) {
  const traffic = useQuery(metricsQueries.traffic(window));
  const state = resolveWidgetState(
    traffic.isPending,
    traffic.isError,
    traffic.data?.ok,
    traffic.data?.ok === false ? traffic.data.reason : undefined
  );

  return (
    <section className='space-y-4' aria-label='Traffic'>
      <h2 className='text-lg font-semibold tracking-tight'>Traffic</h2>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='Pageviews' badge={window} state={state}>
          {traffic.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(traffic.data.data.totals.pageviews)}
              </p>
              <TrendChart
                ariaLabel='Pageview trend'
                variant='line'
                data={traffic.data.data.series.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.pageviews,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Unique visitors' badge={window} state={state}>
          {traffic.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(traffic.data.data.totals.uniques)}
              </p>
              <TrendChart
                ariaLabel='Unique visitor trend'
                variant='line'
                color='var(--chart-4)'
                data={traffic.data.data.series.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.uniques,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Top landing pages' badge={window} state={state}>
          {traffic.data?.ok ? (
            traffic.data.data.topPages.length === 0 ? (
              <p className='text-muted-foreground h-16 text-xs'>No data in this window.</p>
            ) : (
              <ul className='divide-y'>
                {traffic.data.data.topPages.map((page) => (
                  <li
                    key={page.path}
                    className='flex items-center justify-between gap-4 py-2 text-sm'
                  >
                    <span className='truncate'>{page.path}</span>
                    <span className='tabular-nums'>{formatCount(page.pageviews)}</span>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Core Web Vitals (p75)' badge={window} state={state}>
          {traffic.data?.ok ? (
            traffic.data.data.vitals.length === 0 ? (
              <p className='text-muted-foreground h-16 text-xs'>No data in this window.</p>
            ) : (
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-muted-foreground text-left text-xs'>
                    <th className='py-1 font-medium'>Route</th>
                    <th className='py-1 text-right font-medium'>LCP</th>
                    <th className='py-1 text-right font-medium'>CLS</th>
                    <th className='py-1 text-right font-medium'>FCP</th>
                    <th className='py-1 text-right font-medium'>INP</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {traffic.data.data.vitals.map((row) => (
                    <tr key={row.route}>
                      <td className='max-w-32 truncate py-1.5'>{row.route}</td>
                      <td className='py-1.5 text-right tabular-nums'>
                        {formatDurationMs(row.lcpP75)}
                      </td>
                      <td className='py-1.5 text-right tabular-nums'>{formatCls(row.clsP75)}</td>
                      <td className='py-1.5 text-right tabular-nums'>
                        {formatDurationMs(row.fcpP75)}
                      </td>
                      <td className='py-1.5 text-right tabular-nums'>
                        {formatDurationMs(row.inpP75)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : null}
        </WidgetFrame>
      </div>
    </section>
  );
}
