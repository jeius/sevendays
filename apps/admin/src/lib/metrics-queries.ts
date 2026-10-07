// The dashboard's query factories (#186): staleTime per the spec — system
// 60s, content 5m, traffic 5m, storage 10m — revalidate on focus stated explicitly (the router's
// QueryClient leaves it on; the spec rules it, the factories say it), no
// polling. Manual refresh invalidates the ['metrics'] prefix. No
// server-side cache exists anywhere (single-viewer admin).
import { queryOptions } from '@tanstack/react-query';

import type { MetricsWindow } from './metrics/cf';
import {
  fetchMetricsContent,
  fetchMetricsDbProbes,
  fetchMetricsStorage,
  fetchMetricsTraffic,
  fetchMetricsWorkers,
} from './metrics/metrics.functions';

export const metricsQueries = {
  workers: (window: MetricsWindow) =>
    queryOptions({
      queryKey: ['metrics', 'workers', window],
      queryFn: () => fetchMetricsWorkers({ data: { window } }),
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    }),
  dbProbes: () =>
    queryOptions({
      queryKey: ['metrics', 'db-probes'],
      queryFn: fetchMetricsDbProbes,
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    }),
  content: () =>
    queryOptions({
      queryKey: ['metrics', 'content'],
      queryFn: fetchMetricsContent,
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    }),
  traffic: (window: MetricsWindow) =>
    queryOptions({
      queryKey: ['metrics', 'traffic', window],
      queryFn: () => fetchMetricsTraffic({ data: { window } }),
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    }),
  storage: (window: MetricsWindow) =>
    queryOptions({
      queryKey: ['metrics', 'storage', window],
      queryFn: () => fetchMetricsStorage({ data: { window } }),
      staleTime: 600_000,
      refetchOnWindowFocus: true,
    }),
};
