import { apiErrorSchema } from '@sevendays/types';
import type { ZodType } from 'zod';
import { ApiClientError } from './error.js';

/**
 * The single parsing gate (ADR-0006): every response passes through here.
 * Non-2xx → unwrapError() (apiErrorSchema → ApiClientError(status, parsed
 * envelope)). A non-2xx body that is not the envelope throws ZodError
 * instead — also loud (unwrap.test.ts pins the distinction). 2xx →
 * schema.parse → typed payload; a server drifting from the shared schema
 * fails here.
 */
export async function unwrap<T>(res: Response, schema: ZodType<T>): Promise<T> {
  if (!res.ok) {
    await unwrapError(res);
  }

  const body: unknown = await res.json();
  return schema.parse(body);
}

/**
 * The non-2xx arm of unwrap(), extracted so the binary thumb seam can share
 * the exact envelope contract without parsing a 2xx body: a JSON body is
 * parsed against apiErrorSchema and thrown as
 * ApiClientError(status, parsed); a non-JSON body throws
 * ApiClientError(status, { error: 'Non-JSON error response' }). Always
 * throws — the `never` return is what lets callers fall through to their
 * 2xx path.
 */
export async function unwrapError(res: Response): Promise<never> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiClientError(res.status, { error: 'Non-JSON error response' });
  }
  const parsed = apiErrorSchema.parse(body);
  throw new ApiClientError(res.status, parsed);
}
