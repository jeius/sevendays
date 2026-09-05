import type { AppType } from '@sevendays/api/app';
import type { hc } from 'hono/client';

/** The raw Hono RPC client over the API's exported route type (ADR-0006). */
export type RpcClient = ReturnType<typeof hc<AppType>>;

/** Factory options: baseUrl is required — no fallback (spec ruling). */
export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export type { AppType };
