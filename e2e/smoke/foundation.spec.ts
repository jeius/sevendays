import { expect, test } from '@playwright/test';

// The foundation probe (M6 #189): one presence-level assertion proving the
// harness reaches the configured deployment — chromium launches, the baseURL
// resolves, the page answers 200. NOT the production smoke: #190 lands the
// seven ruled assertions (health, home, CMS-fed surface, live media asset,
// booking page, admin sign-in, staff sign-in) — this file is their doorway,
// superseded as they land. Presence/status-level only, never content-text
// (copy is CMS editorial state; empty states are legitimate renders).
test('the configured deployment answers over chromium', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
});
