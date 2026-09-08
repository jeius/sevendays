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
  const [servicesRes, branchesRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/branches`),
  ]);
  const services = await servicesRes.json();
  const branches = await branchesRes.json();
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('seed drift: no studio services from the live API');
  }
  if (!Array.isArray(branches) || branches.length === 0) {
    throw new Error('seed drift: no branches from the live API');
  }
  const chipNamesFor = (s) =>
    branches.filter((b) => s.bookableBranchIds.includes(b.id)).map((b) => b.name);

  const page = await connect();
  const { go, text, evaluate, close } = page;

  // Home: strips + blurb
  await go(`${LANDING}/`);
  const home = await text();
  check(
    'home: services teaser strip renders the live services',
    services.every((s) => home.includes(s.name))
  );
  check(
    'home: branches strip renders all branches',
    branches.every((b) => home.includes(b.address))
  );
  check(
    'home: walk-in badges show both states (live seed has both)',
    home.includes('Walk-ins welcome') && home.includes('No walk-ins')
  );
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
    'home: credibility blurb placeholder visible',
    home.includes('Our studio blurb is coming soon.')
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
      'Looking for add-ons? Makeup, hairstyle, and more can attach to your booking.'
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

  // /about: placeholders + empty portfolio grid
  await go(`${LANDING}/about`);
  const about = await text();
  const portfolioCount = await evaluate(
    `document.querySelector('[data-portfolio-grid]')?.querySelectorAll('article, img').length ?? null`
  );
  check(
    '/about: story + testimonial placeholders render',
    about.includes('Our studio story is coming soon.') &&
      about.includes('What clients say is coming soon.')
  );
  check(
    '/about: empty portfolio grid is the M5 drop-in slot',
    portfolioCount === 0,
    `grid articles/imgs: ${portfolioCount}`
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
