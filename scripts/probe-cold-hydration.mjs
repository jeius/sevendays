// #307, the cold-load hydration-mismatch probe. Walks the admin's CMS
// routes as fresh document loads (each page.goto is a new document: fresh
// JS context, fresh query cache, the cold-load shape) and counts
// browser-console RACE-class hydration messages per route (the DOM-nesting
// class is counted separately, see the census-amendment note in the walk
// loop). Main-side tooling only, never part of pnpm check or test:e2e
// (ADR-0022).
//
// Usage:
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/probe-cold-hydration.mjs
//   (credentials are supplied at invocation, never committed;
//    PROBE_BASE_URL defaults to http://localhost:3000; PROBE_ROUTES is a
//    comma list defaulting to the eight parameterless CMS routes;
//    PROBE_HEADED=1 opens a visible browser, leave ADMIN_* unset and sign
//    in yourself within PROBE_LOGIN_TIMEOUT_MS, default 180000 headed)
// Prereq: `pnpm exec playwright install chromium`; the local dev stack up
// and freshly booted (api dev on :8787 first, then admin dev on :3000):
// the BEFORE/AFTER arms compare boots, so restart the stack between arms.
import { chromium } from '@playwright/test';

const base = process.env.PROBE_BASE_URL ?? 'http://localhost:3000';
const routes = (
  process.env.PROBE_ROUTES ??
  '/branches,/packages,/packages/new,/studio-services,/add-ons,/lookups,/gallery,/testimonials'
).split(',');
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const headed = process.env.PROBE_HEADED === '1';
const loginTimeout = Number(process.env.PROBE_LOGIN_TIMEOUT_MS ?? (headed ? 180_000 : 30_000));
if (!headed && (!email || !password)) {
  console.error(
    'ADMIN_EMAIL and ADMIN_PASSWORD are required headless (supplied at invocation, never committed), or run PROBE_HEADED=1 to sign in yourself.',
  );
  process.exit(2);
}

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage();
const hydrationByRoute = {};
const nestingByRoute = {};
let walked = 0;

try {
  // Sign in through the real form, one card, two modes; the sign-in mode
  // carries #login-email/#login-password. Headless fills the fields; headed
  // waits for the owner. This also exercises the #306 guard: the submit
  // lands post-hydration, where it is inert.
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  if (email && password) {
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await page.press('#login-password', 'Enter');
  }
  await page.waitForSelector('[data-shell-main]', { timeout: loginTimeout });

  for (const route of routes) {
    const bucket = [];
    const nesting = [];
    const onConsole = (message) => {
      const text = message.text();
      // Two classes, counted separately (the #307 census amendment): the
      // RACE class is text/attribute mismatches, "Hydration failed …" /
      // "A tree hydrated but …". The DOM-nesting class ("<div> cannot be
      // a child of <tbody> … This will cause a hydration error.") is a
      // separate pre-existing bug (dnd-kit's Accessibility described-by
      // div inside the testimonials sortable tbody, filed apart) that
      // must neither mask nor fake either probe arm.
      if (/cannot be a child of/.test(text)) nesting.push(text);
      else if (/hydrat/i.test(text)) bucket.push(text);
    };
    page.on('console', onConsole);
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-shell-main]', { timeout: 30_000 });
    await page.waitForTimeout(1500); // hydration + any regeneration settles
    page.off('console', onConsole);
    hydrationByRoute[route] = bucket;
    nestingByRoute[route] = nesting;
    walked += 1;
    console.log(`${route}: ${bucket.length} race-class message(s), ${nesting.length} DOM-nesting message(s)`);
    for (const text of bucket) console.log(`    [race] ${text.slice(0, 300)}`);
    for (const text of nesting) console.log(`    [nesting] ${text.slice(0, 200)}`);
  }
} finally {
  await browser.close();
}

const total = Object.values(hydrationByRoute).flat().length;
const nestingTotal = Object.values(nestingByRoute).flat().length;
console.log(JSON.stringify({ walked, total, nestingTotal, routes: hydrationByRoute, nesting: nestingByRoute }, null, 2));
if (walked !== routes.length) process.exit(1);
