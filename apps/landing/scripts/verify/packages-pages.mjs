// Scripted CDP checks for the landing packages surfaces (issue #43). Read-
// only over the live stack: seeded API (8787) + landing dev (3000) + Chrome
// CDP (9222). The featured rule and peso are RE-DERIVED here (not imported)
// so the script verifies deployed pages, not build artifacts — keep the two
// in sync via this comment.
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function selectFeatured(packages) {
  // #256: synced to src/lib/featured.ts's law (ADR-0020 + owner ruling
  // 2026-10-12 — the mirror contract this header carries): unpriced
  // packages LEAD the strip (name-ordered within the group), priced
  // follow ascending (name tiebreak) — inquiry-priced reads as the
  // headliner, not the tail.
  const byPrice = (a, b) => {
    if (a.priceCents === null && b.priceCents === null) return a.name.localeCompare(b.name);
    if (a.priceCents === null) return -1;
    if (b.priceCents === null) return 1;
    return a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  };
  const featured = packages.filter((p) => p.isFeatured).sort(byPrice);
  if (featured.length > 0) return featured;
  return [...packages].sort(byPrice).slice(0, 4);
}

// #256: mirrors src/lib/format.ts — null is the unpriced state and
// returns null (the old form would format null/100 as ₱0.00).
const peso = (cents) =>
  cents === null
    ? null
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

async function main() {
  const res = await fetch(`${API}/api/v1/service-packages`);
  const packages = await res.json();
  const strip = selectFeatured(packages);
  const basic = packages.find((p) => p.slug === 'basic-package');
  if (!basic) throw new Error('seed drift: basic-package missing from the live API');

  const page = await connect();
  const { go, text, evaluate, bookParamValues, close } = page;

  // Home: hero, CTA, featured strip
  await go(`${LANDING}/`);
  const home = await text();
  check('home: hero headline', home.includes('Sevendays Photography'));
  const heroCta = await evaluate(
    `[...document.querySelectorAll('a')].some(a => a.textContent.trim() === 'Book now' && a.getAttribute('href') === '/book')`
  );
  check('home: Book-now CTA deep-links /book', heroCta === true);
  check('home: featured heading (live catalog has flags)', home.includes('Featured packages'));
  // Ticket 06 added services/branches strips to home; count cards inside the
  // featured strip's section only (data-strip='featured').
  // #256: the #164/#223 strip plates are whole-card Links into the
  // detail page — no <article> since. Count the plates by their
  // /packages/ link prefix inside the featured section (the trailing
  // slash keeps the nav's exact-/packages link out).
  const homeCards = await evaluate(
    `document.querySelector("section[data-strip='featured']")?.querySelectorAll("a[href^='/packages/']").length ?? 0`
  );
  check(
    'home: strip shows the expected featured cards',
    homeCards === strip.length,
    `expected ${strip.length}, got ${homeCards}`
  );
  const positions = strip.map((p) => home.indexOf(p.name));
  check(
    'home: strip ordered unpriced-first, then price-ascending (ADR-0020)',
    positions.every((pos, i) => pos >= 0 && (i === 0 || positions[i - 1] < pos))
  );
  // #256 (owner-ruled 2026-11-09): packages are DETAIL-FIRST — strip
  // plates link the package detail page, never /book directly (contrast
  // the services cards' direct-book deep-links). Asserted both ways:
  // zero /book package params on home, and every plate's parsed href is
  // the package's /packages/<slug> path.
  const stripBookPackageIds = await bookParamValues('package');
  const stripPlateSlugs = await evaluate(`(() => {
    const section = document.querySelector("section[data-strip='featured']");
    const slugs = [];
    for (const a of section?.querySelectorAll("a[href^='/packages/']") ?? []) {
      const url = new URL(a.getAttribute('href'), location.origin);
      slugs.push(url.pathname.split('/packages/')[1] ?? null);
    }
    return slugs;
  })()`);
  check(
    'home: strip plates are detail-first (no /book?package=; /packages/<slug> links)',
    stripBookPackageIds.length === 0 && strip.every((p) => stripPlateSlugs.includes(p.slug)),
    `slugs: ${JSON.stringify(stripPlateSlugs)}`
  );

  // Ruled edit (M5 ticket #142): the empty-state + cover rules, re-derived
  // from the live API. Green on today's populated null-cover catalog;
  // armed for the zero-packages state (live-exercised by #143's gate).
  const featuredStrip = await evaluate(
    `document.querySelector("section[data-strip='featured']") !== null`
  );
  check(
    'home: featured strip collapses ⇔ zero active packages',
    featuredStrip === packages.length > 0
  );
  // #256: same cover ⇔ rule, observed over the Link plates (the h3 and
  // the CoverPanel ride inside the plate Link).
  const stripObserved = await evaluate(`(() => {
    const plates = [...document.querySelectorAll("section[data-strip='featured'] a[href^='/packages/']")];
    const names = ${JSON.stringify(strip.map((p) => p.name))};
    return names.map((n) => {
      const a = plates.find((el) => el.querySelector('h3')?.textContent === n);
      if (!a) return null;
      return {
        hasImg: [...a.querySelectorAll('img')].some((i) => i.getAttribute('alt') === n),
        hasPlaceholder: a.textContent.includes('Cover photo coming soon'),
      };
    });
  })()`);
  check(
    'home: strip cards carry the cover rule (img ⇔ cover)',
    strip.every((p, i) => {
      const o = stripObserved[i];
      return (
        o !== null &&
        o.hasImg === (p.coverImageUrl != null) &&
        o.hasPlaceholder === (p.coverImageUrl == null)
      );
    })
  );

  // /packages: every active package, full details
  await go(`${LANDING}/packages`);
  const listText = await text();
  // #256: the index plates are whole-card Links (no <article> since
  // #164) — counted by the /packages/ link prefix; the nav's
  // exact-/packages link never matches the trailing-slash prefix.
  const listCards = await evaluate(`document.querySelectorAll("a[href^='/packages/']").length`);
  check(
    '/packages: every active package renders',
    listCards === packages.length,
    `expected ${packages.length}, got ${listCards}`
  );
  // #256: the plates carry name + peso (priced) + description — the
  // index carries no inclusions wording since #164 Round 3. Cheapest
  // derives over PRICED rows only (ADR-0020: unpriced rows render no
  // price — Math.min over nulls coerces to a phantom ₱0.00).
  const priced = packages.filter((p) => p.priceCents != null);
  const cheapest = Math.min(...priced.map((p) => p.priceCents));
  check(
    '/packages: full details (cheapest price + every name visible)',
    (priced.length === 0 || listText.includes(peso(cheapest))) &&
      packages.every((p) => listText.includes(p.name))
  );

  // Ruled edit (M5 ticket #142): list-card cover rule (lazy img ⇔ cover,
  // placeholder ⇔ none) + the empty-state ⇔ rule.
  // #256: same lazy-img ⇔ cover rule, observed over the Link plates.
  const listObserved = await evaluate(`(() => {
    const plates = [...document.querySelectorAll("a[href^='/packages/']")];
    const names = ${JSON.stringify(packages.map((p) => p.name))};
    return names.map((n) => {
      const a = plates.find((el) => el.querySelector('h3')?.textContent === n);
      if (!a) return null;
      const img = [...a.querySelectorAll('img')].find((i) => i.getAttribute('alt') === n);
      if (!img) return 'placeholder';
      return {
        loading: img.getAttribute('loading'),
        objectCover: img.className.includes('object-cover'),
      };
    });
  })()`);
  check(
    '/packages: list cards carry the cover rule (lazy img ⇔ cover)',
    packages.every((p, i) => {
      const o = listObserved[i];
      if (p.coverImageUrl != null) {
        return o !== null && o !== 'placeholder' && o.loading === 'lazy' && o.objectCover === true;
      }
      return o === 'placeholder';
    })
  );
  check(
    '/packages: empty-state line ⇔ zero active packages',
    listText.includes('No packages to show right now — check back soon.') ===
      (packages.length === 0)
  );

  // /packages/:slug: by-slug detail + deep link
  await go(`${LANDING}/packages/basic-package`);
  const detail = await text();
  // Ruled edit (M5 ticket #142): the cover rule is the ⇔ assertion —
  // placeholder present ⇔ no coverImageUrl; an img (alt = name, lazy,
  // object-cover) ⇔ coverImageUrl present. The old clause assumed null
  // covers forever; this form survives real content.
  const detailCover = await evaluate(
    `[...document.querySelectorAll('article img')].some(i => i.getAttribute('alt') === ${JSON.stringify(basic.name)})`
  );
  check(
    '/packages/:slug renders by slug (name, price, inclusions)',
    detail.includes(basic.name) &&
      detail.includes(peso(basic.priceCents)) &&
      detail.includes('Inclusions')
  );
  check(
    'detail: cover rule (placeholder ⇔ no cover)',
    basic.coverImageUrl
      ? detailCover === true && !detail.includes('Cover photo coming soon')
      : detailCover === false && detail.includes('Cover photo coming soon')
  );
  const detailLink = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?package="]')].map(a => a.getAttribute('href'))[0] ?? null`
  );
  check('detail: deep link targets the uuid', detailLink === `/book?package=${basic.id}`);

  // Unknown slug: uniform not-found
  await go(`${LANDING}/packages/not-a-real-slug`);
  const missing = await text();
  check(
    'unknown slug: uniform not-found (owner copy + browse link)',
    missing.includes('Package not found.') && missing.includes('Browse all packages')
  );
  check('unknown slug: not an error boundary', !missing.includes('Error'));

  close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('SCENARIO ERROR:', e.message);
  process.exit(1);
});
