import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/react-start';
import { getApiClient } from './api.server';

export const getBranches = createServerFn().handler(async () => {
  // .cursorrules: server functions get a Sentry span (no-op when Sentry is
  // uninitialized — dev without VITE_SENTRY_DSN). Named import per the repo
  // Biome rule (no namespace imports).
  return startSpan({ name: 'GET /api/v1/branches' }, async () => {
    return getApiClient().branches.list();
  });
});

export const getServicePackages = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/service-packages' }, async () => {
    return getApiClient().servicePackages.list();
  });
});

/**
 * Package detail by slug. Callers pass the start-fn payload ({ data: slug });
 * the api-client RPC shape ({ param: { slug } }) is wrapped here.
 * Unknown/inactive slugs reject with ApiClientError(404) — the loader maps
 * that to the router's notFound().
 */
export const getServicePackageBySlug = createServerFn()
  .validator((input: string) => input)
  .handler(async ({ data }) => {
    return startSpan({ name: 'GET /api/v1/service-packages/:slug' }, async () => {
      return getApiClient().servicePackages.bySlug({ param: { slug: data } });
    });
  });
