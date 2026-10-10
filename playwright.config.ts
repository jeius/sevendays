import { defineConfig, devices } from '@playwright/test';

// The Playwright foundation (M6 #189, ADR-0022): one root config,
// chromium-only, walking DEPLOYED environments — no webServer orchestration
// by design (the #190 production smoke's seven assertions walk teaser/v1;
// e2e/smoke/env.ts carries their environment contract). firefox/webkit
// arrive later for smoke breadth only, never for visual baselines. The
// root package is not a pnpm workspace member, so turbo's `test` task
// cannot see `test:e2e` — `pnpm check` stays browserless by construction,
// and that is the ruling, not an accident.
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is not set — point it at the deployment under test (e.g. the teaser landing URL). The suites walk deployed environments, not local dev servers, so there is no default.'
  );
}

export default defineConfig({
  // e2e/smoke/ now; e2e/visual/ arrives with M7's regression (ADR-0022).
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
