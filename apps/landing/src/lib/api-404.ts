import { ApiClientError } from '@sevendays/api-client';
import { notFound } from '@tanstack/react-router';

/**
 * Shared loader seam for detail routes reading a single resource through
 * the API (promoted from package-slug.ts, M2 ticket 08 — the same
 * promotion move as peso): unknown ids/slugs reject with
 * ApiClientError(404) — map exactly that to the router's not-found error
 * so the route's notFoundComponent renders; anything else (500, network,
 * Zod drift) propagates to the error boundary untouched.
 */
export function toNotFoundError(err: unknown): unknown {
  if (err instanceof ApiClientError && err.status === 404) {
    return notFound();
  }
  return err;
}
