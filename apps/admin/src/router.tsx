import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  // Per-request on the server (SSR safety: caches/observers must never be
  // shared across requests); one instance per app run in the browser.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Under SSR, 'static' stops every query refetching during hydration —
        // the dehydrated server data is authoritative on first render.
        refetchOnReconnect: false,
        staleTime: 60_000,
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Let TanStack Query own cache freshness (router preload just fills cache).
    defaultPreloadStaleTime: 0,
  });

  // Auto-dehydrate/hydrate the query cache across the SSR boundary and wrap
  // the tree with QueryClientProvider.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
