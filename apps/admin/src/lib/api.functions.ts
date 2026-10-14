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

// M7 #215: the public singleton read — the Site tab's load (the spec's
// two-endpoint ruling: no admin GET exists; the public read IS the
// editor's load).
export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/site-settings' }, async () => {
    return getApiClient().siteSettings.get();
  });
});
