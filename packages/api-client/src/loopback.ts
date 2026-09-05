/**
 * The Seam-1 adapter (verified 2026-09-04): a Hono app's `fetch(request, env?,
 * executionCtx?)` is not assignable to the global `typeof fetch`, so tests
 * wrap it — one allocation, no server, no network, no workerd.
 */
export function toLoopbackFetch(app: {
  fetch(request: Request): Response | Promise<Response>;
}): typeof fetch {
  return async (input, init) => app.fetch(new Request(input, init));
}
