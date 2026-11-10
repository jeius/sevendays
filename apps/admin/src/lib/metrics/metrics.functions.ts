// The metrics seam's server functions (#186, ADR-0023): the CF GraphQL
// client and the DB probes live ADMIN-SIDE — the api stays domain-pure,
// no metrics route joins /api/v1. Behind the seam's OWN session gate (the
// CMS write-fns discipline: server fns are directly callable, so they
// gate themselves — the ensureSession semantics hoisted into the seam).
// Results are plain-object unions so the RPC boundary serializes them
// without the #155 class-erasure problem. Sentry span per the house rule
// (no-op when Sentry is uninitialized — dev without VITE_SENTRY_DSN).
import { startSpan } from '@sentry/tanstackstart-react';
import { createDbClient } from '@sevendays/db';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';

import { createAuth } from '../auth';
import { fetchWorkerMetrics, metricsWindowSchema } from './cf';
import { collectContentCensus, collectDbProbes } from './db';
import { readMetricsEnv } from './env';
import { fetchTrafficMetrics } from './posthog';
import { fetchStorageMetrics } from './r2';

async function requireMetricsSession(): Promise<void> {
  const session = await createAuth().api.getSession({
    headers: getRequestHeaders(),
  });
  if (!session) {
    throw new Error('Unauthorized');
  }
}

export const fetchMetricsWorkers = createServerFn({ method: 'GET' })
  .validator(z.object({ window: metricsWindowSchema }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'metrics workers' }, async () => {
      await requireMetricsSession();
      return fetchWorkerMetrics(readMetricsEnv(), data.window);
    });
  });

export const fetchMetricsDbProbes = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'metrics db-probes' }, async () => {
    await requireMetricsSession();
    const env = readMetricsEnv();
    if (env.dbUrl === null) {
      return { ok: false as const, reason: 'not-configured' as const };
    }
    const db = createDbClient(env.dbUrl);
    return collectDbProbes(db.execute.bind(db));
  });
});

export const fetchMetricsContent = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'metrics content' }, async () => {
    await requireMetricsSession();
    const env = readMetricsEnv();
    if (env.dbUrl === null) {
      return { ok: false as const, reason: 'not-configured' as const };
    }
    const db = createDbClient(env.dbUrl);
    return collectContentCensus(db.execute.bind(db));
  });
});

export const fetchMetricsTraffic = createServerFn({ method: 'GET' })
  .validator(z.object({ window: metricsWindowSchema }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'metrics traffic' }, async () => {
      await requireMetricsSession();
      return fetchTrafficMetrics(readMetricsEnv(), data.window);
    });
  });

export const fetchMetricsStorage = createServerFn({ method: 'GET' })
  .validator(z.object({ window: metricsWindowSchema }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'metrics storage' }, async () => {
      await requireMetricsSession();
      return fetchStorageMetrics(readMetricsEnv(), data.window);
    });
  });
