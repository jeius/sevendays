import { expect, type Locator, test } from '@playwright/test';

import { requiredEnv } from '../smoke/env';

// ADR-0022's flagship consumer (#225): the redesigned public surfaces
// (the #223/#224 redesign), teaser edition, light + dark — 8 surfaces x
// 2 themes = 16 committed baselines. Baselines are advisory on the
// nightly — CMS content edits surface as drift in the nightly log; the
// owner re-baselines on intent (--update-snapshots). Never PR-gating.
//
// Theme is pinned BEFORE load: next-themes' class strategy reads the
// DEFAULT storageKey 'theme' from localStorage in its pre-paint script
// (packages/ui re-exports the provider seam; the landing mount passes
// attribute="class" and no storageKey — the 0.4.6 default key is
// 'theme', and enableSystem is false), so seeding localStorage is the
// deterministic class-setter. Verified against the live mount in
// apps/landing/src/routes/__root.tsx.
const THEME_INIT = (theme: 'light' | 'dark') => `window.localStorage.setItem('theme', '${theme}');`;

// The home marquee's looping track is the ONLY element whose class
// embeds the marquee animation (apps/landing/src/components/
// home-image-led.tsx: `md:animate-[marquee_45s_linear_infinite]` — the
// track carries no data attribute to hook). Masking it keeps the CSS
// loop's position out of the baseline; the config's animations:
// 'disabled' already cancels infinite animations to initial state, so
// the mask is belt-and-braces. The services strip collapses entirely on
// a zero-service read, so the mask is applied only when it resolves.
const MARQUEE_MASK = "[class*='marquee']";

// The 8 redesigned public surfaces. The detail path derives its slug
// from the LIVE packages payload at run time — never a hardcoded slug
// (the read is a bare JSON array over /api/v1/service-packages; probed
// 2026-11-05). The not-found path is an unregistered route so the
// global NotFound surface renders (the ruled white/ink or ink field).
const SURFACES = [
  ['home', '/'],
  ['packages-index', '/packages'],
  ['package-detail', undefined],
  ['services', '/services'],
  ['branches', '/branches'],
  ['about', '/about'],
  ['share-your-story', '/share-your-story'],
  ['not-found', '/__m7_visual_not_found__'],
] as const;

test.describe('the redesigned landing — visual baselines', () => {
  let detailPath: string;

  test.beforeAll(async () => {
    const apiBase = requiredEnv('E2E_API_URL');
    const response = await fetch(`${apiBase}/api/v1/service-packages`);
    if (!response.ok) {
      throw new Error(
        `E2E_API_URL's /api/v1/service-packages answered ${response.status} — the detail surface derives its slug from the live packages payload`
      );
    }
    const body: unknown = await response.json();
    const list = Array.isArray(body)
      ? body
      : ((body as { packages?: unknown[]; data?: unknown[] }).packages ??
        (body as { data?: unknown[] }).data);
    const slug = (list as { slug?: string }[] | undefined)?.[0]?.slug;
    if (!slug) {
      throw new Error(
        'the live packages payload carries no slug — an empty catalog is a red visual run, not a skip'
      );
    }
    detailPath = `/packages/${slug}`;
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const [name, path] of SURFACES) {
      test(`${name} — ${theme}`, async ({ page }) => {
        await page.addInitScript(THEME_INIT(theme));
        await page.goto(path ?? detailPath, { waitUntil: 'networkidle' });
        // The reveals are IntersectionObserver-driven and one-shot
        // (opacity-0 until seen); a fullPage capture reads beyond the
        // viewport WITHOUT scrolling, so walk the page first to fire
        // every reveal, then return to the top.
        await page.evaluate(async () => {
          const step = 600;
          const scroller = document.scrollingElement ?? document.body;
          for (let y = 0; y < scroller.scrollHeight; y += step) {
            scroller.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          scroller.scrollTo(0, 0);
        });
        // Motion reveals settle; CSS animations are frozen by the
        // config's toHaveScreenshot block.
        await page.waitForTimeout(500);
        let mask: Locator[] = [];
        if (name === 'home') {
          const marquee = page.locator(MARQUEE_MASK);
          if ((await marquee.count()) > 0) {
            mask = [marquee];
          }
        }
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
          fullPage: true,
          mask,
        });
      });
    }
  }
});
