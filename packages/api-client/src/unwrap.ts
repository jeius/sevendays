import { apiErrorSchema } from '@sevendays/types';
import type { ZodType } from 'zod';
import { ApiClientError } from './error.js';

/**
 * The single parsing gate (ADR-0006): every response passes through here.
 * Non-2xx → apiErrorSchema → ApiClientError(status, parsed envelope). A
 * non-2xx body that is not the envelope throws ZodError instead — also
 * loud (unwrap.test.ts pins the distinction). 2xx → schema.parse → typed
 * payload; a server drifting from the shared schema fails here.
 */
export async function unwrap<T>(res: Response, schema: ZodType<T>): Promise<T> {
  const body: unknown = await res.json();

  if (!res.ok) {
    const parsed = apiErrorSchema.parse(body);
    throw new ApiClientError(res.status, parsed);
  }

  return schema.parse(body);
}
