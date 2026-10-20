import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { ThemeProvider } from '@sevendays/ui/components/theme-provider';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { AnnouncementBanner } from '../components/announcement-banner';
import { ErrorComponent } from '../components/error-component';
import { NotFound } from '../components/not-found';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import PostHogProvider from '../integrations/posthog/provider';
import { branchQueries, siteSettingsQueries } from '../lib/queries';

import appCss from '../styles.css?url';

// The router context: carries the per-request QueryClient to every loader.
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // The chrome's reads (M7 #223): site settings + the branch truth the
  // footer carries, ensured once per entry (the root loader does not re-run
  // on client navigations — fresh per page load, the M5 freshness rule).
  // NEVER-THROWING by construction (allSettled): a dead settings/branches
  // read degrades the chrome to code defaults and an empty branch block;
  // pages whose own loaders are healthy never inherit a chrome failure —
  // and a failing page still renders its error surface inside a working
  // chrome.
  loader: async ({ context: { queryClient } }) => {
    await Promise.allSettled([
      queryClient.ensureQueryData(siteSettingsQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Sevendays Photography',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  // The branded global chrome (#164 Round 1; built #223): unknown routes
  // AND every notFound() thrown by a route without its own override land
  // on the one ruled surface.
  notFoundComponent: NotFound,
  errorComponent: ({ error }) => (
    <ErrorComponent error={error instanceof Error ? error : new Error(String(error))} />
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  // The never-broken law (#215): a failed or missing read renders the
  // defaults — a born-empty row and a dead API render the same chrome.
  const { data: settings } = useQuery(siteSettingsQueries.all());
  const { data: branches } = useQuery(branchQueries.all());
  const resolved = settings ?? SITE_SETTINGS_DEFAULTS;

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute='class'
          defaultTheme='light'
          enableSystem={false}
          disableTransitionOnChange
        >
          <PostHogProvider>
            <div className='flex min-h-screen flex-col'>
              <AnnouncementBanner settings={resolved} />
              <SiteHeader settings={resolved} />
              <main className='flex-1'>{children}</main>
              <SiteFooter settings={resolved} branches={branches ?? []} />
            </div>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          </PostHogProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
