// The M5 exit gate (issue #143, spec #134 § Verification): a scratch
// package walked create → cover upload → price change → print-size trim →
// deactivate, each step fresh-load-asserted by CDP on /packages, the
// by-slug detail, and home-featured. The mutation leg drives the ADMIN API
// SEAM — sign-in over HTTP (the admin app's BetterAuth endpoint) → Bearer
// → /api/v1/admin/* — never the admin UI. MAIN-ONLY owner harness (the
// seed's ruleset, like the other verify scenarios).
//
// Env (operator machine, never committed):
//   VERIFY_STAFF_EMAIL / VERIFY_STAFF_PASSWORD  — a provisioned staff row
//     (docs/staff-provisioning.md; one-time harness user via create-staff)
//   ADMIN_VERIFY_URL  (default http://localhost:3001) — the auth server
//   API_VERIFY_URL    (default http://127.0.0.1:8787)
//   LANDING_VERIFY_URL(default http://localhost:3000)
//   CDP_HTTP          (default http://127.0.0.1:9222)
//
// The dev DB is the live Supabase pooler: this script only ever CREATES a
// scratch package + a scratch print size and deactivates rows it created.
// Per-run litter: the two deactivated rows + one promoted cover object
// (key printed at the upload step; `wrangler r2 object delete` cleans it).
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';
const ADMIN = process.env.ADMIN_VERIFY_URL ?? 'http://localhost:3001';

// 1×1 JPEG (the #141 evidence fixture).
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
  'base64'
);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// Re-derived here, not imported — this script verifies deployed pages, not
// build artifacts (the packages-pages.mjs rule).
const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

const runId = Date.now();
const pkgName = `CDP Gate ${runId}`;
const sizeCode = `CDP${runId % 100000}`;

async function signIn() {
  const email = process.env.VERIFY_STAFF_EMAIL;
  const password = process.env.VERIFY_STAFF_PASSWORD;
  if (!email || !password) {
    throw new Error('VERIFY_STAFF_EMAIL / VERIFY_STAFF_PASSWORD are required (never committed)');
  }
  const res = await fetch(`${ADMIN}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ADMIN },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`staff sign-in failed over HTTP: ${res.status}`);
  const body = await res.json();
  if (!body.token) throw new Error('staff sign-in returned no token');
  return body.token;
}

function api(token) {
  return async function call(method, path, payload) {
    const res = await fetch(`${API}/api/v1/admin${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(payload ? { 'content-type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
    return body;
  };
}

async function main() {
  const token = await signIn();
  const call = api(token);

  // Scratch lookups: a first active attire for the inclusion's grant.
  const attires = await call('GET', '/attires');
  const attireId = attires.find((a) => a.isActive)?.id;
  if (!attireId)
    throw new Error('no active attire in the live catalog — cannot build the scratch inclusion');

  // The scratch print size this package (alone) references — deactivating
  // it in step 4 never touches a seeded row.
  const size = await call('POST', '/print-sizes', {
    code: sizeCode,
    description: `CDP gate size ${runId}`,
  });

  // Step 1 — create the scratch package (featured, so home-featured shows it).
  const price1 = 91000 + (runId % 1000);
  const created = await call('POST', '/service-packages', {
    name: pkgName,
    description: 'Scratch package for the cms-reflection gate.',
    priceCents: price1,
    durationMinutes: null,
    isActive: true,
    isFeatured: true,
    frames: [],
    inclusions: [
      {
        kind: 'print',
        quantity: 1,
        printSizeId: size.id,
        attireIds: [attireId],
        description: null,
      },
    ],
  });
  const { id: pkgId, slug } = created;

  const page = await connect();
  const { go, text, evaluate, close } = page;
  try {
    const listUrl = `${LANDING}/packages`;
    const detailUrl = `${LANDING}/packages/${slug}`;
    const homeUrl = `${LANDING}/`;

    // Step 1 assertions — visible everywhere, placeholder cover (⇔ rule).
    await go(listUrl);
    check('step1: /packages lists the scratch package', (await text()).includes(pkgName));
    await go(detailUrl);
    check('step1: the by-slug detail shows it', (await text()).includes(pkgName));
    check(
      'step1: detail shows the print inclusion with the scratch size code',
      (await text()).includes(sizeCode)
    );
    await go(homeUrl);
    const homeHasIt = await evaluate(
      `document.querySelector("section[data-strip='featured']")?.innerText.includes(${JSON.stringify(pkgName)}) ?? false`
    );
    check('step1: home-featured shows it', homeHasIt === true);
    const coverImg = await evaluate(
      `document.querySelectorAll('img[alt=${JSON.stringify(pkgName)}]').length`
    );
    check('step1: no cover img yet (placeholder ⇔ no cover)', coverImg === 0);

    // Step 2 — presign → PUT the JPEG → bind as cover via the atomic save.
    const presigned = await call('POST', '/media/presign', {
      purpose: 'package-cover',
      contentType: 'image/jpeg',
    });
    console.log(
      `# cover staging key: ${presigned.key} (per-run litter; wrangler r2 object delete cleans)`
    );
    const putRes = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: JPEG,
    });
    if (!putRes.ok) throw new Error(`presigned PUT failed: ${putRes.status}`);
    await call('PUT', `/service-packages/${pkgId}`, {
      name: pkgName,
      description: 'Scratch package for the cms-reflection gate.',
      priceCents: price1,
      durationMinutes: null,
      isActive: true,
      isFeatured: true,
      slug,
      coverImageKey: presigned.key,
      frames: [],
      inclusions: [
        {
          kind: 'print',
          quantity: 1,
          printSizeId: size.id,
          attireIds: [attireId],
          description: null,
        },
      ],
    });
    await go(detailUrl);
    const detailImg = await evaluate(
      `document.querySelectorAll('img[alt=${JSON.stringify(pkgName)}]').length`
    );
    check('step2: detail renders the cover <img>', detailImg > 0);
    await go(listUrl);
    const listImg = await evaluate(
      `document.querySelectorAll('img[alt=${JSON.stringify(pkgName)}]').length`
    );
    check('step2: the list card renders the cover <img>', listImg > 0);
    await go(homeUrl);
    const homeImg = await evaluate(
      `document.querySelectorAll('img[alt=${JSON.stringify(pkgName)}]').length`
    );
    check('step2: home-featured renders the cover <img>', homeImg > 0);

    // Step 3 — price change, fresh load.
    const price2 = price1 + 111;
    await call('PUT', `/service-packages/${pkgId}`, {
      name: pkgName,
      description: 'Scratch package for the cms-reflection gate.',
      priceCents: price2,
      durationMinutes: null,
      isActive: true,
      isFeatured: true,
      slug,
      frames: [],
      inclusions: [
        {
          kind: 'print',
          quantity: 1,
          printSizeId: size.id,
          attireIds: [attireId],
          description: null,
        },
      ],
    });
    await go(detailUrl);
    check('step3: fresh load shows the new price', (await text()).includes(peso(price2)));

    // Step 4 — deactivate the scratch print size: the trim rule, live.
    await call('PUT', `/print-sizes/${size.id}`, {
      code: sizeCode,
      description: `CDP gate size ${runId}`,
      isActive: false,
    });
    await go(detailUrl);
    const afterTrim = await text();
    check(
      'step4: the trim rule hides the inclusion (size code gone)',
      !afterTrim.includes(sizeCode)
    );
    check('step4: the package itself still lists and renders', afterTrim.includes(pkgName));
    await go(listUrl);
    check('step4: the package still lists after the trim', (await text()).includes(pkgName));

    // Step 5 — deactivate the scratch package: gone everywhere, fresh load.
    await call('PUT', `/service-packages/${pkgId}`, {
      name: pkgName,
      description: 'Scratch package for the cms-reflection gate.',
      priceCents: price2,
      durationMinutes: null,
      isActive: false,
      isFeatured: true,
      slug,
      frames: [],
      inclusions: [
        {
          kind: 'print',
          quantity: 1,
          printSizeId: size.id,
          attireIds: [attireId],
          description: null,
        },
      ],
    });
    await go(listUrl);
    check('step5: /packages no longer lists it', !(await text()).includes(pkgName));
    await go(detailUrl);
    check(
      'step5: the slug serves the uniform not-found',
      (await text()).includes('Package not found.')
    );
    await go(homeUrl);
    const homeGone = await evaluate(
      `document.querySelector("section[data-strip='featured']")?.innerText.includes(${JSON.stringify(pkgName)}) ?? false`
    );
    check('step5: home-featured no longer shows it', homeGone === false);
  } finally {
    close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error('GATE ERROR:', error.message);
  process.exit(1);
});
