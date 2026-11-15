import { Toaster } from '@sevendays/ui/components/sonner';
import { ThemeProvider } from '@sevendays/ui/components/theme-provider';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { MotionConfig } from 'motion/react';
import PostHogProvider from '../integrations/posthog/provider';

import appCss from '../styles.css?url';

// The router context: carries the per-request QueryClient to every loader.
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
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
        title: 'Sevendays Admin',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'icon',
        href: '/favicon-64.png',
        type: 'image/png',
        sizes: '64x64',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  }),
  shellComponent: RootDocument,
});

// #306 root cause (diagnosed 2026-11-15): the dev login form's submit never
// ran its handler because the interaction landed BEFORE React hydrated —
// SSR paints the form instantly while hydration completes seconds later
// under vite dev — and a pre-hydration submit falls through React's
// delegated listeners (the form carries no __reactFiber$ own property yet)
// to the browser's native form submission: a full-page GET to /login (the
// inputs have no name attributes, so the URL is a bare "?") that discards
// the typed input and reads as a dead button. The guard below cancels any
// submit dispatched to a form React has not adopted yet (capture phase, so
// it runs before the native default action); hydrated forms carry the fiber
// key and pass through untouched. Probe-verified: with hydration blocked, a
// filled submit navigates GET /login? without the guard and does not with
// it, and the hydrated path still signs in (POST 200 → the shell). The
// full diagnosis lives in the #306 thread (the probe evidence dir is
// gitignored; this comment is the durable record).
const PRE_HYDRATION_SUBMIT_GUARD = `document.addEventListener('submit', function (e) { var f = e.target; if (f instanceof HTMLFormElement && !Object.getOwnPropertyNames(f).some(function (k) { return k.indexOf('__reactFiber$') === 0; })) { e.preventDefault(); } }, true);`;

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* The pre-hydration submit guard — the root cause is recorded above. */}
        <script>{PRE_HYDRATION_SUBMIT_GUARD}</script>
      </head>
      <body>
        <ThemeProvider
          attribute='class'
          defaultTheme='light'
          enableSystem={false}
          disableTransitionOnChange
        >
          <PostHogProvider>
            {/* The #131 popup ruling: every popup/overlay animation runs on the Motion
             * channel with the OS reduced-motion preference honored app-wide. */}
            <MotionConfig reducedMotion='user'>
              {children}
              <Toaster />
            </MotionConfig>
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
