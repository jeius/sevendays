// The M5 + M7 exit gates (issues #143/#225, specs #134/#172 § Verification):
// M5 — a scratch package walked create → cover upload → price change →
// print-size trim → deactivate, each step fresh-load-asserted by CDP.
// M7 — five legs appended after the M5 walk: the unpriced flip (nothing
// renders where a price would), guarded delete (blocked → 400 naming the
// blocker; cascade; delete frees the name + slug), the public testimonial
// submission accepted-with-edit rendering at the end of order then cleaned
// up, the site-settings snapshot/mutate/restore through both the store and
// the landing chrome, and the dark toggle proving the ruled ramp live.
// The mutation leg drives the ADMIN API SEAM — sign-in over HTTP (the
// admin app's BetterAuth endpoint) → Bearer → /api/v1/admin/* — never the
// admin UI. MAIN-ONLY owner harness (the seed's ruleset).
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
// Per-run litter: the deactivated rows + one promoted cover object + (born-
// empty store only) an all-null site_settings row — render-inert,
// psql-cleanable by id (the #231 class).
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

// Leg E's probe (read from source, not guessed): packages/ui's ThemeToggle
// mounts ONCE per landing page (the site-header ink bar; the mobile nav
// carries no toggle) with a STATIC aria-label — the primitive's own
// both-themes law — so the labeled-button probe is the stable selector.
const TOGGLE_SELECTOR = 'button[aria-label="Toggle theme"]';

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
  // One seam, two postures: `call` is the M5 walk's helper (parsed body,
  // throws on non-2xx — the loud convention); `statusCall` its
  // non-throwing twin returning { status, body } for the M7 legs that
  // assert codes (the house 400, the 204s). One request implementation —
  // never a second seam.
  async function request(method, path, payload) {
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
    return { ok: res.ok, status: res.status, text, body };
  }
  async function call(method, path, payload) {
    const { ok, status, text, body } = await request(method, path, payload);
    if (!ok) throw new Error(`${method} ${path} → ${status} ${text.slice(0, 300)}`);
    return body;
  }
  async function statusCall(method, path, payload) {
    const { status, body } = await request(method, path, payload);
    return { status, body };
  }
  return { call, statusCall };
}

async function main() {
  const token = await signIn();
  const { call, statusCall } = api(token);

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
      (await text()).includes('This page never developed.')
    );
    await go(homeUrl);
    const homeGone = await evaluate(
      `document.querySelector("section[data-strip='featured']")?.innerText.includes(${JSON.stringify(pkgName)}) ?? false`
    );
    check('step5: home-featured no longer shows it', homeGone === false);

    // Step 6 (M7 leg B) — unpriced: nothing renders where a price would.
    await call('PUT', `/service-packages/${pkgId}`, {
      name: pkgName,
      description: 'Scratch package for the cms-reflection gate.',
      priceCents: null,
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
    const unpricedText = await text();
    check('step6: the unpriced detail renders the package', unpricedText.includes(pkgName));
    check(
      'step6: NO peso renders anywhere on the detail (no placeholder, no inquire line)',
      !unpricedText.includes('₱')
    );
    check(
      'step6: the CTA is unchanged (no price-suffix)',
      unpricedText.includes('Book this package')
    );
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

    // Step 7 (M7 leg A) — guarded delete. The status-asserted calls ride
    // `statusCall` (the seam's non-throwing twin) — the house 400 and the
    // 204s are VALUES here, never throws.
    const blocked = await statusCall('DELETE', `/print-sizes/${size.id}`); // the scratch package's inclusion references it
    check(
      'step7: deleting the referenced size is BLOCKED with the house 400',
      blocked.status === 400 &&
        JSON.stringify(blocked.body).includes('Blocked by existing references.')
    );
    const gone = await statusCall('DELETE', `/service-packages/${pkgId}`); // no appointment ever references scratch
    check('step7: the scratch package deletes 204 (cascade in-transaction)', gone.status === 204);
    const reMade = await statusCall('POST', '/service-packages', {
      name: pkgName,
      description: 'Scratch package for the cms-reflection gate.',
      priceCents: price2,
      durationMinutes: null,
      isActive: false,
      isFeatured: false,
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
    check(
      'step7: the freed NAME recreates with the SAME slug',
      reMade.status === 201 && reMade.body.slug === slug
    );
    check(
      'step7: the re-made package deletes (cleanup)',
      (await statusCall('DELETE', `/service-packages/${reMade.body.id}`)).status === 204
    );
    check(
      'step7: the size deletes once unblocked (its reference cascaded away)',
      (await statusCall('DELETE', `/print-sizes/${size.id}`)).status === 204
    );
    await go(detailUrl);
    // The uniform not-found's copy is the #223 global NotFound's
    // owner-ratified h2 ('This page never developed.') — the route-level
    // overrides are gone (M7 #223), so no page renders 'Package not found.'
    // anymore.
    check(
      'step7: the slug now serves the uniform not-found',
      (await text()).includes('This page never developed.')
    );

    // Step 8 (M7 leg C) — the public testimonial form, hold-at-API.
    const subQuote = `The M7 gate walked end to end — run ${runId} made the whole studio feel effortless.`;
    const subPerson = `Gate Runner ${runId % 1000}`;
    const posted = await fetch(`${API}/api/v1/testimonial-submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quote: subQuote, person: subPerson }),
    });
    const postedBody = await posted.json().catch(() => ({}));
    // The generic 201 is a FIXED message — packages/types'
    // TESTIMONIAL_SUBMISSION_ACCEPTED ('Thank you — your story is on its
    // way.'), re-derived here per the harness's no-import rule.
    check(
      'step8: the public POST answers the generic 201 with NO row echo',
      posted.status === 201 &&
        postedBody.message === 'Thank you — your story is on its way.' &&
        !JSON.stringify(postedBody).includes(subPerson)
    );
    const queue = await statusCall('GET', '/testimonial-submissions');
    const mine = queue.body.find((s) => s.person === subPerson);
    check('step8: the submission queues pending', mine?.status === 'pending');
    const editedFragment = `M7 gate ${runId}`;
    const accepted = await statusCall('POST', `/testimonial-submissions/${mine.id}/accept`, {
      quote: `${subQuote} (${editedFragment})`,
      person: subPerson,
    });
    check(
      'step8: accept-with-edit answers 200/201',
      accepted.status === 200 || accepted.status === 201
    );
    await go(`${LANDING}/about`);
    check(
      'step8: /about renders the EDITED text (nothing the public wrote renders until accepted)',
      (await text()).includes(editedFragment)
    );
    const testimonials = await statusCall('GET', '/testimonials');
    const created = testimonials.body.find((t) => t.person === subPerson);
    const maxPosition = Math.max(...testimonials.body.map((t) => t.position));
    check(
      'step8: the accepted testimonial sits at the END of render order',
      created?.position === maxPosition
    );
    check(
      'step8: the submission deletes regardless of status',
      (await statusCall('DELETE', `/testimonial-submissions/${mine.id}`)).status === 204
    );
    check(
      'step8: the created testimonial deletes (blocked by nothing)',
      (await statusCall('DELETE', `/testimonials/${created.id}`)).status === 204
    );
    await go(`${LANDING}/about`);
    check('step8: /about no longer renders it', !(await text()).includes(editedFragment));

    // Step 9 (M7 leg D) — site settings through the landing chrome. The
    // wire keys are packages/types' siteSettingsSchema verbatim
    // (brandTagline — the schema read at authoring time, never guessed).
    const snapshot = await (await fetch(`${API}/api/v1/site-settings`)).json();
    // born-empty ⇔ every content field null — bannerIsActive is the one
    // non-nullable boolean on the wire (EMPTY_SITE_SETTINGS carries false).
    const bornEmpty = Object.entries(snapshot).every(
      ([k, v]) => k === 'bannerIsActive' || v === null
    );
    const mutated = { ...snapshot, brandTagline: `M7 gate ${runId}` };
    await call('PUT', '/site-settings', mutated);
    await go(homeUrl);
    check(
      'step9: the landing chrome renders the mutated tagline',
      (await text()).includes(`M7 gate ${runId}`)
    );
    await call('PUT', '/site-settings', snapshot); // restore verbatim (the all-null case = documented litter)
    const after = await (await fetch(`${API}/api/v1/site-settings`)).json();
    // Order-insensitive deep compare: the born-empty snapshot is the
    // EMPTY_SITE_SETTINGS literal (logoImageUrl sits third) while the
    // post-restore row re-reads through toRead (logoImageUrl appended
    // last) — same content, different key order, so a strict stringify
    // could never compare equal.
    const canon = (o) =>
      JSON.stringify(
        Object.keys(o)
          .sort()
          .map((k) => [k, o[k]])
      );
    check('step9: the settings restore to the pre-run snapshot', canon(after) === canon(snapshot));
    if (bornEmpty)
      console.log(
        '# NOTE: born-empty store — the restored all-null row is render-inert litter (the #231 class); psql-delete by id to clean'
      );

    // Step 10 (M7 leg E) — dark mode, live.
    await go(homeUrl);
    const lightBg = await evaluate('getComputedStyle(document.body).backgroundColor');
    await evaluate(`document.querySelector(${JSON.stringify(TOGGLE_SELECTOR)}).click()`);
    await new Promise((r) => setTimeout(r, 300)); // next-themes applies the class on click
    check(
      'step10: the html element gains the .dark class',
      (await evaluate('document.documentElement.classList.contains("dark")')) === true
    );
    const darkBg = await evaluate('getComputedStyle(document.body).backgroundColor');
    check(
      'step10: the computed background flips (the ruled ramp is live, not inverted)',
      darkBg !== lightBg
    );
    await evaluate(`document.querySelector(${JSON.stringify(TOGGLE_SELECTOR)}).click()`);
    await new Promise((r) => setTimeout(r, 300));
    check(
      'step10: toggling back restores light',
      (await evaluate('document.documentElement.classList.contains("dark")')) === false
    );
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
