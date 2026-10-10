import { expect, test } from '@playwright/test';

import { requiredEnv } from './env';

// The production smoke (M6 #190) — the verify gate's executable leg (spec
// #182 § The verify gate — the production smoke; ADR-0022's second
// verdict: commit-green and smoke-green stay separate). Seven
// presence/status-level assertions over the deployed stack, NEVER
// content-text — copy is CMS editorial state and empty states are
// legitimate renders; every selector pins app chrome (form ids, section
// landmarks) or a fixed route contract. Mutation posture: read-only plus
// exactly ONE act — the sign-in (a session row, harmless by construction);
// no booking POSTs (real production rows), no CMS writes (the Audit Log
// would record junk). The nightly walks teaser; a dispatch run walks any
// named target — v1 at ship, the ship runbook's final step.
//
// Legs needing more than E2E_BASE_URL fail their own test with the curated
// requiredEnv message when their variable is unset — a missing credential
// is a red leg with a named fix, never a silent skip.

// (1) The api's root-level liveness route — the JSON body is the route's
// fixed contract (apps/api/src/index.ts), not editorial content.
test('api /health answers 200 with its fixed body', async ({ request }) => {
  const apiBaseUrl = requiredEnv('E2E_API_URL');
  const response = await request.get(`${apiBaseUrl}/health`);
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: 'ok' });
});

// (2) The landing home renders — the deployed frontend answers over
// chromium. Supersedes #189's one-probe foundation spec (deleted with this
// suite's landing): the hero h1 is app chrome, present in every state.
test('the landing home renders', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
});

// (3) A CMS-fed landing surface renders — /about's loader awaits the
// gallery + testimonial reads (the landing→api→db path on real domains);
// a failing read fails the page, so 200 + the Portfolio section proves a
// ruled render served (data or the pinned empty state — both legitimate).
test('the CMS-fed /about surface renders', async ({ page }) => {
  const response = await page.goto('/about');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Portfolio', exact: true })).toBeVisible();
});

// (4) A media asset loads — its URL pulled from the LIVE gallery payload
// and GET'd: nothing hardcoded, guarding the MEDIA_PUBLIC_BASE_URL flip
// and the copied-across gallery. An empty payload is a red leg by design —
// a shipped site with no work on the walls defeats the media copy (the
// ship runbook orders media before the smoke).
test('a media asset loads from the live gallery payload', async ({ request }) => {
  const apiBaseUrl = requiredEnv('E2E_API_URL');
  const payload = await request.get(`${apiBaseUrl}/api/v1/gallery`);
  expect(payload.status()).toBe(200);
  const body = (await payload.json()) as { photos?: { photoUrl?: string }[] };
  const assetUrl = body.photos?.[0]?.photoUrl;
  if (!assetUrl) {
    throw new Error(
      'the live gallery payload carries no photoUrl — an empty gallery is a red smoke, not a skip'
    );
  }
  const asset = await request.get(assetUrl);
  expect(asset.status()).toBe(200);
  expect(asset.headers()['content-type']?.startsWith('image/')).toBe(true);
});

// (5) The booking form page serves — loads, NEVER submits (one booking
// POST would plant a real row in the studio's calendar). The wizard's
// initial step section is app chrome.
test('the booking form page serves', async ({ page }) => {
  const response = await page.goto('/book');
  expect(response?.status()).toBe(200);
  await expect(page.locator("section[data-step='1']")).toBeVisible();
});

// (6) The admin sign-in page serves — public, outside the _shell gate.
test('the admin sign-in page serves', async ({ page }) => {
  const adminBaseUrl = requiredEnv('E2E_ADMIN_URL');
  const response = await page.goto(`${adminBaseUrl}/login`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('#login-email')).toBeVisible();
});

// (7) A real smoke-staff sign-in works — the suite's ONE act. The
// BetterAuth email sign-in POST is version-pinned (1.7.5) at the admin
// origin's /api/auth catch-all; its 200 + the __Secure- session cookie +
// the dashboard rendering at / (the _shell gate's own session-gated
// getSession answered — a failed gate bounces to /login) together prove
// the authenticated surface lives. TanStack server-fn RPC URLs are
// deliberately NOT asserted: @tanstack/react-start floats latest, and the
// gate is the stable session-gated fetch by construction.
test('a smoke-staff sign-in reaches the authenticated surface', async ({ page }) => {
  const adminBaseUrl = requiredEnv('E2E_ADMIN_URL');
  const email = requiredEnv('E2E_SMOKE_STAFF_EMAIL');
  const password = requiredEnv('E2E_SMOKE_STAFF_PASSWORD');

  await page.goto(`${adminBaseUrl}/login`);
  const signIn = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/auth/sign-in/email' &&
      response.request().method() === 'POST'
  );
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  expect((await signIn).status()).toBe(200);
  await page.waitForURL(`${adminBaseUrl}/`);
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

  // The production session cookie is __Secure--prefixed (the staff
  // runbook): its presence is the session row's client-side receipt.
  const sessionCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === '__Secure-better-auth.session_token'
  );
  expect(sessionCookie).toBeTruthy();
});
