// The DB half of the metrics seam (#186): result-union wrappers over
// packages/db's probe module. The exec passed in is the per-request
// drizzle client's bound execute (metrics.functions constructs the client
// per call — ADR-0011, the auth.ts pattern; never module scope). A probe
// failure resolves unavailable with one log-only loud line (#155).
import type { ContentCensus, SystemProbes } from '@sevendays/db';
import { runContentCensus, runSystemProbes } from '@sevendays/db';

import type { MetricsResult } from './env';

export type { ContentCensus, SystemProbes };

export async function collectDbProbes(
  exec: Parameters<typeof runSystemProbes>[0]
): Promise<MetricsResult<SystemProbes>> {
  try {
    return { ok: true, data: await runSystemProbes(exec) };
  } catch (error) {
    console.error(
      '[metrics] DB probe source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}

export async function collectContentCensus(
  exec: Parameters<typeof runContentCensus>[0]
): Promise<MetricsResult<ContentCensus>> {
  try {
    return { ok: true, data: await runContentCensus(exec) };
  } catch (error) {
    console.error(
      '[metrics] content census source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
