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
  const byPrice = (a, b) => a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  const featured = packages.filter((p) => p.isFeatured).sort(byPrice);
  if (featured.length > 0) return featured;
  return [...packages].sort(byPrice).slice(0, 4);
}

const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

async function main() {
  const res = await fetch(`${API}/api/v1/service-packages`);
  const packages = await res.json();
  const strip = selectFeatured(packages);
  const basic = packages.find((p) => p.slug === 'basic-package');
  if (!basic) throw new Error('seed drift: basic-package missing from the live API');

  const page = await connect();
  const { go, text, evaluate, close } = page;

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
  const homeCards = await evaluate(
    `document.querySelector("section[data-strip='featured']")?.querySelectorAll('article').length ?? 0`
  );
  check(
    'home: strip shows the expected featured cards',
    homeCards === strip.length,
    `expected ${strip.length}, got ${homeCards}`
  );
  const positions = strip.map((p) => home.indexOf(p.name));
  check(
    'home: strip ordered price-ascending',
    positions.every((pos, i) => pos >= 0 && (i === 0 || positions[i - 1] < pos))
  );
  const stripLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?package="]')].map(a => a.getAttribute('href'))`
  );
  check(
    'home: strip cards deep-link /book?package=<id>',
    strip.every((p) => stripLinks.includes(`/book?package=${p.id}`))
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
  const stripObserved = await evaluate(`(() => {
    const articles = [...document.querySelectorAll("section[data-strip='featured'] article")];
    const names = ${JSON.stringify(strip.map((p) => p.name))};
    return names.map((n) => {
      const a = articles.find((el) => el.querySelector('h3')?.textContent === n);
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
  const listCards = await evaluate(`document.querySelectorAll('article').length`);
  check(
    '/packages: every active package renders',
    listCards === packages.length,
    `expected ${packages.length}, got ${listCards}`
  );
  const cheapest = Math.min(...packages.map((p) => p.priceCents));
  check(
    '/packages: full details (cheapest price + inclusions visible)',
    listText.includes(peso(cheapest)) && listText.includes('Inclusions')
  );

  // Ruled edit (M5 ticket #142): list-card cover rule (lazy img ⇔ cover,
  // placeholder ⇔ none) + the empty-state ⇔ rule.
  const listObserved = await evaluate(`(() => {
    const articles = [...document.querySelectorAll('article')];
    const names = ${JSON.stringify(packages.map((p) => p.name))};
    return names.map((n) => {
      const a = articles.find((el) => el.querySelector('h3')?.textContent === n);
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
