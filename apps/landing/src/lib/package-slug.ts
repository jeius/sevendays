import { ApiClientError } from '@sevendays/api-client';
import { notFound } from '@tanstack/react-router';

/**
 * Loader seam for /packages/$slug: unknown/inactive slugs reject with
 * ApiClientError(404) (ticket 04's pinned wording). Map exactly that to the
 * router's not-found error so the route's notFoundComponent renders;
 * anything else (500, network, Zod drift) propagates to the error boundary
 * untouched.
 */
export function toNotFoundError(err: unknown): unknown {
  if (err instanceof ApiClientError && err.status === 404) {
    return notFound();
  }
  return err;
}
