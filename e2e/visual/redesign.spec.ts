import { expect, type Page, test } from '@playwright/test';

import { requiredEnv } from '../smoke/env';

// ADR-0022's flagship consumer (#225): the redesigned public surfaces
// (the #223/#224 redesign), teaser edition, light + dark — 8 surfaces x
// 2 themes = 16 committed baselines. The 2026-11-22 contract (the
// owner's pick after the 11-14 nightly-drift diagnosis, #346): the
// baselines assert LAYOUT/CHROME only — every CMS-content region is
// either pinned to a fixed height + masked (variable-height regions:
// the mosaic walls, testimonials, the story, the tab row) or masked
// outright (fixed-height boxes: brand lockups, cover panels, the
// announcement strip, the footer contact grid). CMS pixel content can
// no longer redden the nightly; a red run now means a layout/chrome
// drift, a broken capture gate, or a CMS-fed region not yet in the
// mask list — re-baseline on intent (--update-snapshots). Never
// PR-gating.
//
// Documented residuals (rare, geometry-class edits that stay advisory):
// the home hero copy and the page-head h1s/descriptions (settings-fed),
// the featured strip's heading, and every grid's ITEM COUNT (featured,
// catalog, services, branches) plus the text panels beside the masked
// covers (names, descriptions, inclusions, prices). Those change page
// geometry rather than pixels-in-place; the sentinels + the smoke suite
// own their presence.
//
// Theme is pinned BEFORE load: next-themes' class strategy reads the
// DEFAULT storageKey 'theme' from localStorage in its pre-paint script
// (packages/ui re-exports the provider seam; the landing mount passes
// attribute="class" and no storageKey — the 0.4.6 default key is
// 'theme', and enableSystem is false), so seeding localStorage is the
// deterministic class-setter. Verified against the live mount in
// apps/landing/src/routes/__root.tsx.
const THEME_INIT = (theme: 'light' | 'dark') => `window.localStorage.setItem('theme', '${theme}');`;

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

type Surface = (typeof SURFACES)[number][0];

// The capture-stabilization layer (#346). Playwright compares IMAGE
// DIMENSIONS before masks apply, so a region whose height follows CMS
// content must be pinned to a fixed height (pure CSS) AND masked —
// masking alone only hides pixels, not the height drift (the 11-19
// failure class: about 2177→3165px, home 4845→5777px after the gallery
// repopulation). Fixed-height CMS regions need no clamp. Every rule is
// `!important` + `overflow: hidden` — the utilities they pin are
// single-class Tailwind, and overflow:hidden creates a BFC so interior
// margins can't collapse through the pinned box. The clamp VALUES are
// arbitrary-but-fixed: whatever is inside is masked, so the number only
// chooses how much composition the baseline keeps.
//
// The CSS lands BEFORE any measurement (injected right after goto), so
// the tall-viewport law's pageHeight read below sees the pinned page.
const SHARED_STABILIZE_CSS = `
aside[aria-label='Announcement'] > div { height: 3.75rem !important; overflow: hidden !important; }
footer div.mt-8 { height: 6.5rem !important; overflow: hidden !important; }
`;

const STABILIZE_CSS: Record<Surface, string> = {
  home: `
section[data-strip='gallery'] > div { height: 56rem !important; overflow: hidden !important; }
section[data-strip='testimonials'] > div { height: 36rem !important; overflow: hidden !important; }
`,
  'packages-index': '',
  'package-detail': '',
  services: '',
  branches: '',
  about: `
main div.max-w-prose.space-y-3 { height: 8rem !important; overflow: hidden !important; }
[data-gallery-tabs] { height: 2.5rem !important; overflow: hidden !important; }
[data-portfolio-grid] { height: 48rem !important; overflow: hidden !important; }
main div.columns-1 { height: 22rem !important; overflow: hidden !important; }
`,
  'share-your-story': '',
  'not-found': '',
};

// The mask list. Mask locators run with `strict: false` inside Playwright's
// screenshot pipeline and a zero-match entry is skipped there
// (coreBundle _maskElements → callOnSelector strict:false), so a region
// that is legitimately absent (the collapsed strips, the off banner, the
// branch-grid's zero read) needs no conditional — and a selector matching
// many elements (every plate's cover box) masks all of them.
//
// Shared chrome: the announcement strip (bannerFor: off/untitled renders
// nothing), the brand lockups (mark + name + tagline are all
// settings-fed; the img-vs-sd.png fallback sits inside), the footer's
// live branch contact grid, and the copyright row's CMS-fed CHILDREN
// (© name+tagline, socials, brand contact) — children only, so the row's
// border-t stays asserted.
const SHARED_MASK_SELECTORS = [
  "aside[aria-label='Announcement']",
  "header a[href='/']",
  "footer a[href='/']",
  'footer div.mt-8',
  'footer div.mt-6 > p',
  'footer div.mt-6 > div',
] as const;

// Per-surface CMS regions. Cover boxes are masked at their wrapper div
// (`:first-child` of the plate/card link) because the CoverPanel flip
// swaps element TYPE (img vs the initials-placeholder div) while the box
// — fixed by aspect ratio or min-height — is the stable element in both
// branches.
const MASK_SELECTORS: Record<Surface, readonly string[]> = {
  home: [
    // The home services strip is masked at its STATIC outer section
    // (`data-strip='services'`, apps/landing/src/components/
    // home-image-led.tsx) — NEVER at the moving track: `animations:
    // 'disabled'` only freezes CSS motion, so a translating track's bbox —
    // and with it the mask box itself — would land differently per capture
    // (the #225 home-dark finding: ratio 0.03 around the mask edges). The
    // section's bbox is layout-stable, so the mask paints the whole marquee
    // area regardless of where the track sits inside it. (A
    // `reducedMotion: 'reduce'` emulation was tried and reverted in fix
    // round 2: the redesign's IntersectionObserver reveals honor
    // motion-reduce too, so every reveal-bearing surface rendered
    // differently than its baseline.)
    "section[data-strip='services']",
    "section[data-strip='gallery'] > div",
    "section[data-strip='testimonials'] > div",
    "section[data-strip='featured'] a[href^='/packages/'] > div:first-child",
  ],
  'packages-index': ["main a[href^='/packages/'] > div:first-child"],
  'package-detail': ['main div.min-h-64'],
  services: ['main article > img'],
  branches: ['main article > div:first-child'],
  about: [
    'main div.max-w-prose.space-y-3',
    '[data-gallery-tabs]',
    '[data-portfolio-grid]',
    'main div.columns-1',
  ],
  'share-your-story': [],
  'not-found': [],
};

// The data-present sentinels (#259): per-surface predicates over the
// data-bearing DOM, evaluated in the page AFTER the images gate and
// BEFORE the decode gate. The images gate is vacuous on a page whose
// data never arrived — no images to wait for — so the Class B flake
// (an about captured at 734px against its 2238px baseline, a not-found
// at the bare 720px shell) sailed through to a capture. Each predicate
// returns null when its surface's data is present or names the missing
// seam when it is not; a missing seam fails loudly with the page-state
// dump below — never a skip, never a retry (the beforeAll empty-catalog
// law's sibling: a data-less capture is a red run, and under
// --update-snapshots a silently-written empty baseline is a false green
// forever). The functions are deliberately self-contained: Playwright
// serializes the function SOURCE into the page, so closures over module
// bindings would throw at run time. Selectors are the repo's own
// conventions (the #256 packages-pages harness counts plates as
// a[href^='/packages/']; nav links are exactly '/packages', so the
// trailing-slash prefix never matches chrome).
const SENTINELS: Record<(typeof SURFACES)[number][0], () => string | null> = {
  home: () => {
    if (!document.querySelector("[data-strip='featured']")) {
      return "the featured plates strip is absent ([data-strip='featured']) — the packages read never rendered";
    }
    return document.querySelector("[data-strip='gallery'] figure")
      ? null
      : "the gallery mosaic rendered no photo figures ([data-strip='gallery'] figure) — the gallery read never rendered";
  },
  'packages-index': () =>
    document.querySelector("a[href^='/packages/']")
      ? null
      : "the plates grid rendered no detail-linked plate (a[href^='/packages/']) — the packages read never rendered",
  'package-detail': () => {
    if (!document.querySelector("a[href^='/book?package=']")) {
      return "the book CTA is absent (a[href^='/book?package=']) — the package read never rendered";
    }
    return Array.from(document.querySelectorAll('h2')).some((h) =>
      h.textContent?.includes("What's included")
    )
      ? null
      : "the inclusions section is absent (the What's included h2) — the detail rendered without its spec sheet";
  },
  services: () =>
    document.querySelector("a[href^='/book?service=']")
      ? null
      : "the services grid rendered no service row (a[href^='/book?service=']) — the services read never rendered",
  branches: () =>
    document.querySelector("a[href^='/book?branch=']")
      ? null
      : "the branch strip rendered no branch card (a[href^='/book?branch=']) — the branches read never rendered",
  about: () => {
    if (!document.querySelector('[data-portfolio-grid]')) {
      return 'the portfolio grid is absent ([data-portfolio-grid]) — the gallery read never rendered';
    }
    if (!document.querySelector('[data-gallery-tabs]')) {
      return 'the gallery tab row is absent ([data-gallery-tabs]) — the gallery read never rendered';
    }
    return document.querySelector('figure blockquote')
      ? null
      : 'the kind-words wall rendered no quote (figure blockquote) — the testimonials read never rendered';
  },
  'share-your-story': () =>
    document.querySelector('#story-quote') && document.querySelector('#story-person')
      ? null
      : 'the form chrome is absent (#story-quote / #story-person) — the route rendered without its form',
  'not-found': () => {
    const h1 = document.querySelector('h1');
    if (!h1?.textContent?.includes('This page never developed.')) {
      return 'the ruled field copy is absent (the "This page never developed." h1)';
    }
    return document.querySelector('header')
      ? null
      : 'the site chrome is absent (header) — the shell rendered without the header';
  },
};

// The sentinel failure message: the surface, the missing seam, and a
// compact page-state dump — enough to identify the render path on the
// next occurrence (the ruled empty-state copy vs the "Something went
// wrong." error boundary vs a partial HTML stream vs the Cloudflare
// throttle page, whose evidence-pinned body marker 'error code: 1102'
// (#255's incident) gets its own attribution line so nightly logs name
// platform throttling instead of masking it as a data race).
async function sentinelFailureMessage(
  name: string,
  missingSeam: string,
  page: Page
): Promise<string> {
  const state = await page.evaluate(() => {
    const images = Array.from(document.images);
    const bodyText = document.body?.innerText ?? '';
    return {
      title: document.title,
      readyState: document.readyState,
      scrollHeight: (document.scrollingElement ?? document.documentElement).scrollHeight,
      completeImages: images.filter((img) => img.complete && img.naturalWidth > 0).length,
      totalImages: images.length,
      bodyHead: bodyText.replace(/\s+/g, ' ').trim().slice(0, 200),
      cf1102: /error code: 1102/i.test(bodyText),
    };
  });
  return (
    `#259 data-present sentinel: ${name} — ${missingSeam}. ` +
    `Page state: title=${JSON.stringify(state.title)} readyState=${state.readyState} ` +
    `scrollHeight=${state.scrollHeight}px ` +
    `images=${state.completeImages}/${state.totalImages} complete ` +
    `body-head=${JSON.stringify(state.bodyHead)}` +
    (state.cf1102
      ? ' — Cloudflare Error 1102 marker present: worker resource-limit throttling, not a data race'
      : '')
  );
}

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
        await page.goto(path ?? detailPath, { waitUntil: 'load' });
        // The stabilization layer lands before ANY measurement: the
        // clamps pin the CMS-height regions so the tall-viewport law
        // measures a stable page, and the masks below then hide whatever
        // the CMS renders inside them (#346).
        await page.addStyleTag({
          content: `${SHARED_STABILIZE_CSS}\n${STABILIZE_CSS[name]}`,
        });
        // The clamps clip their interiors — and IntersectionObserver
        // honors ancestor overflow clipping, so reveal wrappers BELOW a
        // pinned height can never intersect and would hang the reveal
        // gate forever (the 12/16 re-record finding). Stamp those shown:
        // attribute-driven CSS takes the shown state immediately, React's
        // diff never un-sets it (absent → absent re-renders emit no DOM
        // op), and the gate still owns every unclamped reveal on the page.
        await page.evaluate(() => {
          document
            .querySelectorAll(
              "[data-portfolio-grid] [data-reveal]:not([data-shown]), section[data-strip='gallery'] [data-reveal]:not([data-shown])"
            )
            .forEach((el) => el.setAttribute('data-shown', 'true'));
        });
        // Break the lazy-load loop: below-fold images are loading="lazy"
        // and only fetch when they intersect the viewport. Forcing every
        // image eager starts all loads regardless of viewport — the
        // page-height resize below would trigger them anyway, but eager
        // starts the loads BEFORE the page height is measured; a
        // genuinely broken image still fails the images gate below.
        await page.evaluate(() => {
          document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
            img.loading = 'eager';
          });
        });
        // Every <img> must be loaded before anything measures the page:
        // the image-led sections (mosaic, plates, service rows) collapse
        // while images are unresolved, so the PAGE HEIGHT itself swings
        // between captures ("expected …4318px, received …734px"). `load`
        // + this explicit gate is the robust pair — networkidle can hang
        // forever on beacon-heavy pages and never promised image decode.
        await page.waitForFunction(
          () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
          undefined,
          { timeout: 30_000 }
        );
        // The data-present sentinel (#259) sits between the images gate
        // and the decode gate: the images gate passes vacuously when the
        // data never arrived (no images to wait for), so each surface
        // asserts its data-bearing DOM here and fails loudly with the
        // page-state dump instead of capturing — before any measurement
        // (the dump's scrollHeight then reads the standard-viewport
        // height, which is exactly the Class B signature: a shell-height
        // page where the baseline expects content height).
        const missingSeam = await page.evaluate(SENTINELS[name]);
        if (missingSeam !== null) {
          throw new Error(await sentinelFailureMessage(name, missingSeam, page));
        }
        // The decode gate (#255): `complete && naturalWidth > 0` proves
        // the bytes arrived, not that Chromium rasterized the frame —
        // #241's about-light flake captured blank photos whose images
        // were complete. decode() resolves only when the frame is ready
        // to paint; the images gate above already failed broken images,
        // so a rejection here is a capture-stopping anomaly.
        await page.evaluate(() =>
          Promise.all(
            Array.from(document.images, (img) =>
              img.decode().catch((reason: unknown) => {
                throw new Error(`#255 decode gate: ${img.currentSrc} — ${String(reason)}`);
              })
            )
          )
        );
        // The tall-viewport law (#255): capture at a page-height viewport
        // so no reveal or raster race survives — the beyond-viewport
        // fullPage rasterization path (the #255 Class A flake: blank
        // mid-page bands, blank portfolio tiles) is gone by construction.
        // The height is measured AFTER the images gate (unresolved images
        // swing it); the width is unchanged. The root app shell is the
        // only min-h-screen consumer (probed at plan time), so the shell
        // stretch is a no-op at content height — layout, footer position,
        // and every fixed-height section are preserved.
        const pageHeight = await page.evaluate(
          () => (document.scrollingElement ?? document.documentElement).scrollHeight
        );
        const viewport = page.viewportSize();
        if (!viewport) {
          throw new Error(
            '#255: no viewport size before the tall-viewport resize — harness anomaly'
          );
        }
        await page.setViewportSize({ width: viewport.width, height: pageHeight });
        // Let the resize's reflow settle before re-measuring.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
        );
        const settledHeight = await page.evaluate(
          () => (document.scrollingElement ?? document.documentElement).scrollHeight
        );
        if (settledHeight > pageHeight) {
          throw new Error(
            `#255 tall-viewport law: the page grew with the taller viewport (${settledHeight}px > ${pageHeight}px) — viewport-height-dependent content; investigate before capturing`
          );
        }
        // Everything is in-viewport at page height: reveals fire on
        // intersection and lazy loading is moot. The reveal-complete wait
        // targets the shared Reveal wrapper's data-reveal/data-shown hooks
        // (apps/landing/src/components/reveal.tsx) and covers every
        // reveal wrapper on the page; the config's animations:'disabled'
        // fast-forwards any transition still running at capture —
        // belt and braces under the tall viewport.
        await page.waitForFunction(
          () => document.querySelectorAll('[data-reveal]:not([data-shown])').length === 0,
          undefined,
          { timeout: 10_000 }
        );
        // The settle covers the worst-case reveal tail end to end
        // (≈270ms column delay + 700ms transition).
        await page.waitForTimeout(1000);
        // Zero-match selectors no-op inside the screenshot pipeline (see
        // MASK_SELECTORS above), so collapsed strips and absent regions
        // need no conditional.
        const mask = [...SHARED_MASK_SELECTORS, ...MASK_SELECTORS[name]].map((selector) =>
          page.locator(selector)
        );
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
          fullPage: true,
          mask,
        });
      });
    }
  }
});
