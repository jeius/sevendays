// Scripted CDP checks for the landing content pages (issue #44). Read-only
// over the live stack: seeded API (8787) + landing dev (3000) + Chrome CDP
// (9222). All expectations are RE-DERIVED from the live API responses (not
// imported, not hard-coded). Seeded state this scenario leans on (like
// ticket-05's "live catalog has flags" check): walk-in flags include BOTH
// true and false (Calamba/Iligan false, Dipolog true).
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

async function main() {
  const [servicesRes, branchesRes, galleryRes, testimonialsRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/branches`),
    fetch(`${API}/api/v1/gallery`),
    fetch(`${API}/api/v1/testimonials`),
  ]);
  const services = await servicesRes.json();
  const branches = await branchesRes.json();
  const gallery = await galleryRes.json();
  const testimonials = await testimonialsRes.json();
  if (!gallery || !Array.isArray(gallery.categories) || !Array.isArray(gallery.photos)) {
    throw new Error('seed drift: gallery read is not the assembled {categories, photos} payload');
  }
  if (!Array.isArray(testimonials)) {
    throw new Error('seed drift: testimonials read is not an array');
  }
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('seed drift: no studio services from the live API');
  }
  if (!Array.isArray(branches) || branches.length === 0) {
    throw new Error('seed drift: no branches from the live API');
  }
  const chipNamesFor = (s) =>
    branches.filter((b) => s.bookableBranchIds.includes(b.id)).map((b) => b.name);

  const page = await connect();
  const { go, text, evaluate, wait, close } = page;

  // Home: strips + blurb
  await go(`${LANDING}/`);
  const home = await text();
  check(
    'home: services teaser strip renders the live services',
    services.every((s) => home.includes(s.name))
  );
  // Ruled edit (#101, this ticket's one script exception): the #111
  // variant D composition drops the branches body strip — footer +
  // emphasis carry branches (both asserted here); walk-in badges stay
  // fully covered by the /branches check below.
  const homeBranchLinks = await evaluate(
    `[...document.querySelectorAll("a[href='/branches']")].length`
  );
  check(
    'home: branches carried by footer + emphasis strip (variant D)',
    homeBranchLinks >= 2 && home.includes('Call or visit a branch')
  );
  const galleryFigures = await evaluate(
    `document.querySelectorAll("[data-strip='gallery'] figure").length`
  );
  check('home: gallery wall renders (variant D stand-in strip)', galleryFigures >= 6);
  const teaserLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?service="]')].map(a => a.getAttribute('href'))`
  );
  check(
    'home: teaser items deep-link /book?service=<id>',
    services.every((s) => teaserLinks.includes(`/book?service=${s.id}`))
  );
  const viewAll = await evaluate(
    `[...document.querySelectorAll('a')].some(a => a.textContent.trim() === 'View all services' && a.getAttribute('href') === '/services')`
  );
  check('home: strip-end View all services links /services', viewAll === true);
  check(
    'home: ratified hero blurb visible (#111 resolution; ruled edit #101)',
    home.includes(
      'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.'
    )
  );

  // /services: the offerings with bookability
  await go(`${LANDING}/services`);
  const servicesText = await text();
  const svcArticles = await evaluate(`
    (() => {
      const articles = [...document.querySelectorAll('article')];
      const services = ${JSON.stringify(services)};
      return services.map((s) => {
        const a = articles.find((el) => el.querySelector('h3')?.textContent === s.name);
        return a ? a.textContent : null;
      });
    })()
  `);
  check(
    '/services: every active service renders a card',
    svcArticles.length === services.length && svcArticles.every((t) => t !== null),
    `expected ${services.length}, got ${svcArticles.filter((t) => t !== null).length}`
  );
  check(
    '/services: prices visible (peso re-derived from the live API)',
    services.every((s, i) => svcArticles[i] !== null && svcArticles[i].includes(peso(s.priceCents)))
  );
  check(
    '/services: bookability chips carry the re-derived branch names',
    services.every((s, i) => {
      if (svcArticles[i] === null) return false;
      return chipNamesFor(s).every((n) => svcArticles[i].includes(n));
    })
  );
  check(
    '/services: one-line add-on cross-reference visible',
    servicesText.includes(
      'Looking for add-ons? Makeup, hairstyle, and more are available with any session.'
    )
  );
  const svcLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?service="]')].map(a => a.getAttribute('href'))`
  );
  check(
    '/services: cards deep-link /book?service=<id>',
    services.every((s) => svcLinks.includes(`/book?service=${s.id}`))
  );

  // /branches: address, phone, badge, deep link
  await go(`${LANDING}/branches`);
  const branchArticles = await evaluate(`
    (() => {
      const articles = [...document.querySelectorAll('article')];
      const branches = ${JSON.stringify(branches)};
      return branches.map((b) => {
        const a = articles.find((el) => el.querySelector('h3')?.textContent === b.name);
        return a ? a.textContent : null;
      });
    })()
  `);
  check(
    '/branches: all branches render name + address + phone',
    branchArticles.every((t, i) => {
      if (t === null) return false;
      return t.includes(branches[i].address) && t.includes(branches[i].phone);
    })
  );
  check(
    '/branches: walk-in badges show both states (live seed has both)',
    branchArticles.some(
      (t, i) => t !== null && branches[i].acceptsWalkIns && t.includes('Walk-ins welcome')
    ) &&
      branchArticles.some(
        (t, i) => t !== null && !branches[i].acceptsWalkIns && t.includes('No walk-ins')
      )
  );
  const branchLinks = await evaluate(
    `[...document.querySelectorAll('a')].filter(a => a.textContent.trim() === 'Book at this branch').map(a => a.getAttribute('href'))`
  );
  check(
    '/branches: Book at this branch deep-links /book?branch=<id>',
    branches.every((b) => branchLinks.includes(`/book?branch=${b.id}`))
  );

  // /about — Ruled edit (M5 ticket #142): the two placeholder checks rewrite
  // into payload-derived ⇔ rules (the story line is byte-kept — not this
  // ticket's copy). The live gallery/testimonials tables are CMS-born-empty,
  // so the empty branches are LIVE-exercised today; the populated branches
  // arm for the owner's first uploads. Tab filtering asserts client-side
  // state over the single fetch.
  await go(`${LANDING}/about`);
  const about = await text();
  check(
    '/about: story placeholder renders (byte-kept)',
    about.includes('Our studio story is coming soon.')
  );
  check(
    '/about: portfolio empty-state ⇔ zero photos',
    about.includes('Portfolio coming soon.') === (gallery.photos.length === 0)
  );
  const expectedTabs = [
    'All',
    ...gallery.categories
      .filter((c) => gallery.photos.some((p) => p.categoryId === c.id))
      .map((c) => c.name),
  ];
  const tabState = await evaluate(`(() => {
    const row = document.querySelector('[data-gallery-tabs]');
    if (!row) return null;
    return [...row.querySelectorAll('button')].map((b) => ({
      label: b.textContent.trim(),
      pressed: b.getAttribute('aria-pressed'),
    }));
  })()`);
  check(
    '/about: tab row ⇔ photos exist; All first + default',
    gallery.photos.length === 0
      ? tabState === null
      : tabState !== null &&
          tabState.length === expectedTabs.length &&
          tabState.every((t, i) => t.label === expectedTabs[i]) &&
          tabState[0].label === 'All' &&
          tabState[0].pressed === 'true',
    `tabs: ${JSON.stringify(tabState)}`
  );
  const gridSrcs = await evaluate(
    `[...document.querySelectorAll('[data-portfolio-grid] img')].map(i => i.getAttribute('src'))`
  );
  check(
    '/about: grid renders exactly the payload photos, payload order',
    gallery.photos.length === 0
      ? gridSrcs === null || gridSrcs.length === 0
      : gridSrcs !== null &&
          gridSrcs.length === gallery.photos.length &&
          gridSrcs.every((src, i) => src === gallery.photos[i].photoUrl)
  );
  if (gallery.photos.length > 0 && expectedTabs.length > 1) {
    const firstCategoryPhotos = gallery.photos.filter(
      (p) => p.categoryId === gallery.categories.find((c) => expectedTabs[1] === c.name).id
    );
    await evaluate(`document.querySelectorAll('[data-gallery-tabs] button')[1].click()`);
    await wait(400);
    const filtered = await evaluate(
      `[...document.querySelectorAll('[data-portfolio-grid] img')].map(i => i.getAttribute('src'))`
    );
    const restored = await (async () => {
      await evaluate(`document.querySelectorAll('[data-gallery-tabs] button')[0].click()`);
      await wait(400);
      return evaluate(
        `[...document.querySelectorAll('[data-portfolio-grid] img')].map(i => i.getAttribute('src'))`
      );
    })();
    check(
      '/about: tab filtering is client-side over the single fetch',
      Array.isArray(filtered) &&
        filtered.length === firstCategoryPhotos.length &&
        filtered.every((src, i) => src === firstCategoryPhotos[i].photoUrl) &&
        Array.isArray(restored) &&
        restored.length === gallery.photos.length &&
        restored.every((src, i) => src === gallery.photos[i].photoUrl)
    );
  } else {
    check(
      '/about: tab filtering is client-side over the single fetch',
      true,
      'armed — single-category or empty payload cannot demo filtering'
    );
  }
  check(
    '/about: testimonials render the payload (coming-soon ⇔ zero)',
    testimonials.length === 0
      ? about.includes('What clients say is coming soon.')
      : testimonials.every((t) => about.includes(t.person)) &&
          !about.includes('What clients say is coming soon.')
  );

  close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('SCENARIO ERROR:', e.message);
  process.exit(1);
});
