# M2 Close-out — end-to-end verification + docs (#48) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the M2 exit criterion live — a real booking through the actual `/book` wizard for both offering kinds against the live stack (landing → API → DB), with both confirmation emails received at the Resend account owner's address (julius.porferio.pahama@gmail.com — the sandbox delivers only there) and their content proven on the real artifacts — then record the two owed ADRs (generalized-appointment model; email send topology), refresh `docs/progress.md`, and tick `docs/plan.md`'s last M2 checkbox with the ✅ emoji (the issue's acceptance criteria).

**Architecture:** #48 is a verification + documentation ticket, not feature work. Product code is already landed (tickets 01–09, issues #39–#47 all closed; PR #65's scope fence assigns the email-topology ADR, the live email verification, and the plan.md "Verify" tick to #48). The committed CDP harness (`apps/landing/scripts/verify/`, owner ruling 2026-09-08: tickets 06–10 extend the same harness) already drives both offering kinds through the real wizard — Task 1 extends it minimally (recipient email parameterization + notes on the service booking + a machine-parseable id tail) and adds one new evidence script that retrieves the sent emails from the Resend API and asserts delivery + content on the real artifacts. Task 2 executes the live gate (local stack: API dev on 8787 writing the live Supabase db, landing dev on 3000, Chrome headless CDP on 9222) and deletes its two verification rows after the evidence is recorded (the M1.5 Q3=A ruling). Tasks 3–4 write ADR-0013/0014; Task 5 is the docs close-out; Task 6 is cleanup + graphify + final gates.

**Tech Stack:** Hono 4.13.5 on Cloudflare Workers (`apps/api`, wrangler 4.127.1 dev, Resend SDK 6.26.0 — already landed), TanStack Start 1.170.x landing dev server (port 3000), the committed raw-CDP Node harness (no browser-automation dependency; Chrome headless shell from the Playwright cache), Resend REST (`GET /emails?limit=`, `GET /emails/:id` — surface verified in resend 6.26.0's `.d.ts`), `packages/db/scripts/verify-appointment-row.mjs` (psql-equivalent probe, already generalized for studio-service bookings in ticket 02), Node ≥ 24 (v26.7.0 probed, full ICU), graphify 0.9.34.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (GitHub issue #37 — "Documentation duties at build time" + user story 38). Ticket: jeius/sevendays#48 (scratch copy `.scratch/m2-booking-flow-tickets/10.md`), parent #37 (stays OPEN + untouched). Roadmap: Milestone 2 booking-flow block in `docs/plan.md` — its single unticked checkbox (line 69, the "Verify:" box) is this ticket's; every other M2 box is already ticked with annotations. Predecessor plans (all landed): `2026-09-07-m2-01` … `2026-09-10-m2-09`.

**Amendment (owner ruling, mid-execution 2026-09-10):** the Resend account owner's address is **pahamajulius@gmail.com** — the julius.porferio.pahama@gmail.com pin (spec/issue text) has no Resend account behind it. Every operational `E2E_CUSTOMER_EMAIL` value in this plan uses pahamajulius@gmail.com; occurrences that QUOTE the roadmap/issue text (pre-plan fact 2, the Task 5 tick's original checkbox text) keep the old literal as a quotation, and the Task 5 tick annotation records the correction.

## Global Constraints

- Node >= 24 (v26.7.0 on this machine, full ICU); pnpm 11 workspace; run repo commands from the repo root unless noted. Fresh clone prep: `pnpm install` → `pnpm build:packages` → `pnpm --filter @sevendays/api build` before `pnpm check`.
- Work on a feature branch off `main` (suggested: `feat/m2-exit-verification`; HEAD at plan time `abfa9d2`); never commit to `main`; leave pushing, merging, PR opening, and issue edits to the user. **No `gh` mutating command appears anywhere in this plan** — parent #37 stays OPEN and untouched, and issue acceptance boxes are the owner's to tick (PR #65 precedent).
- Do not commit code that fails `pnpm check` (lint + format + typecheck + test) for what you touched; `pnpm build` must also stay green. Baseline at HEAD: 33/33 turbo tasks green (PR #65) — landing vitest 56, api suite 93/12 files. The Task 1 harness edits touch only `scripts/verify/` (verification-only tooling: biome-linted, deliberately NOT vitest-included), so those suite counts must not move.
- **Secrets:** never print, echo, log, or commit `RESEND_API_KEY` (or any secret). `apps/api/.dev.vars` is gitignored — verify with `git check-ignore apps/api/.dev.vars` before relying on it. The executor may append `LANDING_ORIGIN=http://localhost:3000` to `.dev.vars` if missing (not a secret); `RESEND_API_KEY` is **owner-supplied** — if it is missing or empty, Task 2 STOPS with the owner instructions in its Step 0. Never substitute a placeholder: a fake key boots the API but silently converts the gate into the failure path (send logged, no email), which would false-pass nothing and prove less.
- **The live DB is production data.** `apps/api/.dev.vars`'s `DATABASE_URL` points at the Supabase pooler — the local API dev server writes the LIVE database, and so does the deployed one. The E2E writes exactly two appointment rows (plus their add-on junction rows); evidence is recorded BEFORE deletion (M1.5 Q3=A ruling: "the verification row is deleted only after all evidence … is recorded"; deletion is single-row, flag-gated — the probe's `delete` mode). No other writes: no `db:seed`, no migrations, no catalog edits in this ticket.
- `docs/plan.md` ticks use the ✅ emoji (`- [✅]`) with a dated annotation, never plain `[x]`. The M2 block's other checkboxes stay byte-identical.
- Harness scenario rules (owner ruling 2026-09-08): expectations are re-derived from the live API at run time — never hard-code catalog ids/names/prices into a scenario; failures name the failing check and exit 1; scenarios take URLs from `LANDING_VERIFY_URL` / `API_VERIFY_URL`.
- Env posture (landed #47, unchanged here): `RESEND_API_KEY` + `LANDING_ORIGIN` are required with no fallback — every `/api/v1` request parses the full env schema, so the Task 2 Step 2 branches sanity request doubles as the env proof (missing var ⇒ 500, not a silent skip). `LANDING_ORIGIN` for the live run is `http://localhost:3000` (the landing dev script pins port 3000).
- Do not boot `apps/admin` during this ticket — its dev script also pins port 3000 and would collide with landing. Port-collision pitfall (hit in #24): verify which process holds 3000/8787/9222 (`ss -tlnp`) before trusting any dev-server result.
- Full-ICU Node is the only sanctioned runtime for the Intl-formatted expectations (`en-PH` / `Asia/Manila`) — if an Intl output ever differs, fix the runtime (full-ICU Node ≥ 24), never the expectation (the m2-09 pinned-literal ruling).
- graphify 0.9.34 is installed (`/home/jeius/.local/bin/graphify`); `graphify-out/` is git-tracked — after code/docs changes, `graphify update .` and commit its diff alongside the docs (AST-only, no API cost).

## Verified pre-plan facts (probed against the real workspace 2026-09-10)

Trust these; don't re-derive:

1. **Tickets 01–09 are closed** (`gh issue list`: #39–#47 CLOSED); #48 is OPEN, labeled `ready-for-agent`. PR #65 (ticket 09) merged with its scope fence naming #48 as owner of: the email-send-topology ADR, the milestone end-to-end email verification, and the plan.md "Verify" checkbox.
2. **`docs/plan.md` M2 booking-flow block:** every checkbox is `- [✅]` except line 69 — `- [ ] Verify: complete a real booking end-to-end and receive the confirmation email at the Resend account owner's address (julius.porferio.pahama@gmail.com — the sandbox 403s every other recipient)`. The M2 exit-criteria line (71) is prose, not a checkbox.
3. **`apps/api/.dev.vars` exists (gitignored) and currently defines ONLY `DATABASE_URL`** — classified supabase-hosted (value never printed). `RESEND_API_KEY` and `LANDING_ORIGIN` are absent ⇒ until the owner adds the key (and the executor adds the origin), every `/api/v1` request on the local API 500s by design (`apps/api/src/env.ts` `envSchema`: `DATABASE_URL: z.url()`, `RESEND_API_KEY: z.string().min(1)`, `LANDING_ORIGIN: z.url()`; parsed per request).
4. **The deployed stack cannot host this gate:** the deployed Worker `sevendays-api` still runs the 2026-09-02 M1.5-era code and holds exactly one secret (`DATABASE_URL` — `wrangler secret list`, names only), `LANDING_ORIGIN` was deliberately not committed as a `[vars]` entry, and `sevendays-landing` has never been deployed. The issue's AC says "deployed/local" — this plan uses the **local stack** (the operator's working posture: `apps/landing/.env.local` already reads `API_URL=http://127.0.0.1:8787`). Wrangler IS authenticated here (OAuth, pahamajulius@gmail.com), but deploys and secret operations are user-run (M1.5 standing posture) — this plan runs none.
5. **The committed CDP harness** (`apps/landing/scripts/verify/`): `lib.mjs` (raw CDP over Node WebSocket, dead-socket hardening, `PUT /json/new`), `packages-pages.mjs` (12 named checks — counted in the committed file, 2026-09-10), `content-pages.mjs` (16), `booking-wizard.mjs` (READ-ONLY, 15 — ticket 08 added the unknown-id not-found check to ticket 07's 14), and `booking-e2e.mjs` (MUTATING, verify-time only) — 7 named checks driving one package booking (first add-on) and one studio-service booking (zero applicable add-ons ⇒ step skipped), asserting single-get snapshots and rendered read-backs. Selector contract: `section[data-step='1'..'5']`, `button[data-offering='<id>']`, `section[data-step='N'] > button` for Continue (CSS last-of-type pitfall, live-proven in ticket 07), dev server-fn round-trip ≈ 2.6s (path polling, not fixed waits). Its contact block is hard-coded `'e2e@example.com'` — which the sandbox would 403 — hence the Task 1 parameterization.
6. **`booking-e2e.mjs` re-derives its picks from the live API**: `packages[0]` (first active package), `services.find(s => s.applicableAddonServiceIds.length === 0)` (catalog order: Photo Recovery, Tarpaulin & Bulletin Printing, Picture Framing all have none; Portraits & ID Photo has Makeup + Hairstyle), `branches[0]`, `addons[0]`. The plan never pins their names into commands.
7. **`packages/db/scripts/verify-appointment-row.mjs` is already generalized** (ticket 02): conditional `servicePackageId`/`studioServiceId` expectations, `booked_price_cents`, add-on join rows. Modes: `confirm <id>` (expectations JSON on stdin — the single-get body's keys match verbatim), `delete <id>` (delete + absence re-assert), `absent <id>`. It reads `DATABASE_MIGRATE_URL` (classified supabase-hosted in `packages/db/.env` — the SAME db the local API writes), run as `node --env-file=.env scripts/verify-appointment-row.mjs …` from `packages/db`.
8. **Resend evidence is possible programmatically:** resend 6.26.0's `.d.ts` pins `GET /emails` (list; `limit` 1–100, default 20; items = email minus html/text — `to`, `subject`, `created_at`, `last_event` included) and `GET /emails/:id` (adds `html`, `last_event` enum incl. `'delivered'`, exact `from`). Whether THIS account can call the list endpoint is not probeable pre-run (the key lives owner-side) — Task 2 carries the documented fallback (exit 2 ⇒ the owner's inbox check is the recorded proof). The builder's pinned Intl output ("Dec 25, 2026, 9:30 AM" shape) is reproducible on Node v26.7.0 full-ICU.
9. **The email module is silent on success** (`apps/api/src/services/confirmation-email.ts`): only failures log (`[api] confirmation email for appointment <id> failed:`). Success evidence therefore comes from Resend's API, not the dev-server console — Task 2 checks the console for the ABSENCE of the failure line and treats Resend `last_event: 'delivered'` as the receipt proof.
10. **Chrome for CDP is the Playwright headless shell** (no chrome/chromium on PATH): `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` (verified present). Prior tickets' scenarios ran against this exact binary class.
11. **Repo state at plan time:** HEAD `abfa9d2` (ticket 09 merge), clean tree; `graphify` 0.9.34 installed; `docker compose` db up (healthy — used only by `pnpm test` integration suites, irrelevant to the live gate); compose is NOT catalog-seeded, which is another reason the gate runs against the seeded live db, not compose.
12. **Seed data narrative pins** (from `packages/db/scripts/catalog.ts`): four studio services — Photo Recovery ₱1500.00, Tarpaulin & Bulletin Printing ₱800.00, Portraits & ID Photo ₱500.00 (Makeup + Hairstyle apply), Picture Framing ₱1200.00 — all bookable at all 3 branches; branch phones are `TODO(seed)` placeholders (`+63 900 000 00x`), so the email's "call the branch" line carries a placeholder number (expected; don't "fix" it).

---

### Task 1: Extend the verification harness (recipient email + notes + id tail; new Resend evidence script)

**Files:**
- Modify: `apps/landing/scripts/verify/booking-e2e.mjs`
- Create: `apps/landing/scripts/verify/confirmation-emails.mjs`

**Interfaces:**
- Consumes: `lib.mjs`'s `connect()` (unchanged); the live API reads (`/api/v1/service-packages`, `/api/v1/studio-services`, `/api/v1/addon-services`, `/api/v1/branches`, `/api/v1/appointments/:id`); Resend REST (`GET /emails?limit=100`, `GET /emails/:id`, Bearer auth).
- Produces: `booking-e2e.mjs` honoring `E2E_CUSTOMER_EMAIL` (default `e2e@example.com` keeps prior behavior) and printing a final `BOOKINGS {…}` line; `confirmation-emails.mjs <pkgId> <svcId>` reading `RESEND_API_KEY` + `LANDING_ORIGIN` + `E2E_CUSTOMER_EMAIL` from env, exiting 0 (delivered + content proven) / 1 (a check failed) / 2 (Resend list unavailable — machine evidence impossible).

**Not here:** no product code changes (nothing under `apps/landing/src`, `apps/api`, or `packages/*`); no new dependencies (raw `fetch` + CDP only); no vitest (harness scripts are verify-time tooling by owner ruling); no email copy changes (the builder's pinned copy is ticket 09's, already landed).

- [ ] **Step 1: Parameterize the recipient + notes in `booking-e2e.mjs`**

Six exact edits to `apps/landing/scripts/verify/booking-e2e.mjs`:

(a) Replace the header block (lines 1–8) with:
```js
// MUTATING end-to-end (issue #45 AC 1; #48 extends it): drives two REAL
// bookings through /book — one package (with an add-on) and one studio
// service — against the live seeded stack, then reads each back through the
// public single-get AND its /booking/:id page, asserting the server snapshot
// (bookedPriceCents, add-on entries, status, notes) and the rendered
// read-back (ticket 08). Rows persist in the target db by design (tiny
// volume; the studio reconciles manually until M3 availability) — #48's live
// run books with E2E_CUSTOMER_EMAIL (the Resend sandbox delivers only to the
// account owner's address) and deletes its rows after the evidence is
// recorded (the M1.5 Q3=A ruling). Run at verification time:
//   E2E_CUSTOMER_EMAIL=<owner address> node apps/landing/scripts/verify/booking-e2e.mjs
//
// The final BOOKINGS line is machine-parseable — confirmation-emails.mjs and
// the packages/db row probe take the two ids from it.
```

(b) After the `const API = …` line, add:
```js
// Recipient for both confirmation emails (#48). The sandbox 403s every other
// address, so the live email run books with the account owner's address; the
// default keeps prior (compose) run behavior unchanged.
const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? 'e2e@example.com';
// The service booking carries notes so the real email proves the
// Notes-row-only-when-non-null rule on a live artifact (the package booking
// stays notes-less and proves the opposite side).
const SERVICE_NOTES = 'E2E verification booking — safe to discard.';
```

(c) In `fillContactAndConfirm`, change the signature and the email/notes lines — from:
```js
  async function fillContactAndConfirm() {
    await setInput(`section[data-step='5'] input[placeholder='Full name']`, 'E2E Booking');
    await setInput(`section[data-step='5'] input[placeholder='Email']`, 'e2e@example.com');
    await setInput(`section[data-step='5'] input[placeholder='Phone (+63…)']`, '+63 917 000 0000');
```
to:
```js
  async function fillContactAndConfirm(notes = '') {
    await setInput(`section[data-step='5'] input[placeholder='Full name']`, 'E2E Booking');
    await setInput(`section[data-step='5'] input[placeholder='Email']`, CUSTOMER_EMAIL);
    await setInput(`section[data-step='5'] input[placeholder='Phone (+63…)']`, '+63 917 000 0000');
    if (notes) await setInput(`section[data-step='5'] textarea`, notes);
```

(d) In the package read-back check, change:
```js
      confHtml.includes('A confirmation email was sent to e2e@example.com.') &&
```
to:
```js
      confHtml.includes(`A confirmation email was sent to ${CUSTOMER_EMAIL}.`) &&
```

(e) Change the service booking's confirm call from `await fillContactAndConfirm();` to:
```js
  const svcPath = await fillContactAndConfirm(SERVICE_NOTES);
```
and extend the service snapshot check — name and condition — from:
```js
  check(
    'service booking snapshot: service ref, exactly-one, snapshot price',
    svcRecord?.studioServiceId === svc.id &&
      svcRecord?.servicePackageId === null &&
      svcRecord?.bookedPriceCents === svc.priceCents &&
      svcRecord?.addonServices?.length === 0
  );
```
to:
```js
  check(
    'service booking snapshot: service ref, exactly-one, snapshot price, notes',
    svcRecord?.studioServiceId === svc.id &&
      svcRecord?.servicePackageId === null &&
      svcRecord?.bookedPriceCents === svc.priceCents &&
      svcRecord?.addonServices?.length === 0 &&
      svcRecord?.notes === SERVICE_NOTES
  );
```

(f) Immediately after `close();`, insert the machine-parseable tail (before `const failed = …`):
```js
  console.log(
    `BOOKINGS ${JSON.stringify({
      customerEmail: CUSTOMER_EMAIL,
      bookings: [
        { kind: 'package', id: pkgId },
        { kind: 'service', id: svcId },
      ],
    })}`
  );
```

The check count stays 7 (same checks, two of them extended) — the final line still prints `7/7 checks passed`.

> **Live-gate fix (`ba1f2a9`, 2026-09-10):** edit (c)'s notes call targets a `<textarea>`, but the PRE-EXISTING `setInput` helper (ticket 07) pulled the value setter from `HTMLInputElement.prototype` only — the first live run died there with `TypeError: Illegal invocation` before booking 2's confirm click. `setInput` now picks the prototype by tag name (`el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype`). The snippet below shows only the (c) edit; the helper fix lives in `setInput` itself.

- [ ] **Step 2: Create `apps/landing/scripts/verify/confirmation-emails.mjs`**

New file, verbatim:
```js
// Email-delivery evidence (issue #48): given the two booking ids from
// booking-e2e.mjs's BOOKINGS line, retrieve each confirmation email from the
// Resend API and assert delivery + the pinned content rules on the REAL
// artifact — exact from/subject, the money-free rule (no peso mark anywhere
// in the HTML), add-on name-only rows present (package) / the section
// omitted (service), the Notes row only when notes exist, and the CTA href
// built from LANDING_ORIGIN. Expectations are re-derived from the live API
// and the sent records — nothing about the emails is hard-coded here. Needs
// the REAL RESEND_API_KEY (the sandbox account is the delivery target) and
// the LANDING_ORIGIN value as sent — source both from apps/api/.dev.vars
// without printing them:
//   set -a; source <(grep -E '^(RESEND_API_KEY|LANDING_ORIGIN)=' apps/api/.dev.vars); set +a
//   E2E_CUSTOMER_EMAIL=<owner address> \
//     node apps/landing/scripts/verify/confirmation-emails.mjs <pkgId> <svcId>
// Exit 0 = both emails found, content proven, delivered. 1 = a check failed.
// 2 = the Resend list endpoint is unavailable on this account (machine
// evidence impossible — the owner's inbox check becomes the recorded proof).

const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const LANDING_ORIGIN = (process.env.LANDING_ORIGIN ?? '').replace(/\/+$/, '');
const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? '';
const DELIVERY_TIMEOUT_MS = 90_000;
const POLL_MS = 3000;

if (!RESEND_API_KEY || !LANDING_ORIGIN || !CUSTOMER_EMAIL) {
  console.error(
    'usage: RESEND_API_KEY + LANDING_ORIGIN (source from apps/api/.dev.vars) and E2E_CUSTOMER_EMAIL are required; pass the two booking ids as argv'
  );
  process.exit(1);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// The builder's pinned semantics (apps/api services/confirmation-email.ts):
// en-PH / Asia/Manila, medium date + short time, then " (PHT)". Full-ICU
// Node only — never edit an expectation to match broken output.
const PH_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const phDateTime = (iso) => `${PH_DATE_TIME.format(new Date(iso))} (PHT)`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const [pkgId, svcId] = process.argv.slice(2);
if (!UUID_RE.test(pkgId ?? '') || !UUID_RE.test(svcId ?? '')) {
  console.error('usage: confirmation-emails.mjs <packageBookingId> <serviceBookingId> (uuids)');
  process.exit(1);
}

async function resend(path) {
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(`Resend HTTP ${res.status}: ${body.slice(0, 200)}`), {
      status: res.status,
    });
  }
  return res.json();
}

async function listEmails() {
  try {
    const data = (await resend('/emails?limit=100')).data ?? [];
    // Newest first — on a re-run, the newest send with a given subject is
    // this run's (bookings are sequential; see the plan's retry note).
    return data.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      console.error(
        `RESEND LIST UNAVAILABLE (HTTP ${err.status}) — this account can't enumerate sends. ` +
          'Fall back: confirm both emails in the Resend dashboard / the owner inbox and record that as the proof (plan Task 2, Step 6 note).'
      );
      process.exit(2);
    }
    throw err;
  }
}

async function main() {
  const [pkgRecord, svcRecord, packages, services, branches] = await Promise.all([
    fetch(`${API}/api/v1/appointments/${pkgId}`).then((r) => r.json()),
    fetch(`${API}/api/v1/appointments/${svcId}`).then((r) => r.json()),
    fetch(`${API}/api/v1/service-packages`).then((r) => r.json()),
    fetch(`${API}/api/v1/studio-services`).then((r) => r.json()),
    fetch(`${API}/api/v1/branches`).then((r) => r.json()),
  ]);

  // Every displayed value derives from the stored snapshot + the same reads
  // the page uses — mirroring the builder's resolve-at-send-time rules.
  function expectation(record) {
    const offeringName =
      record.servicePackageId !== null
        ? packages.find((p) => p.id === record.servicePackageId)?.name
        : services.find((s) => s.id === record.studioServiceId)?.name;
    const branch = branches.find((b) => b.id === record.branchId);
    const when = phDateTime(record.scheduledAt);
    return {
      record,
      offeringName,
      branch,
      when,
      subject: `Booking scheduled: ${offeringName} — ${when}`,
      bookingUrl: `${LANDING_ORIGIN}/booking/${record.id}`,
    };
  }
  const expected = [
    { label: 'package', ...expectation(pkgRecord) },
    { label: 'service', ...expectation(svcRecord) },
  ];

  // Both sends may lag the 201 by the waitUntil scheduling — poll the list.
  let found;
  const deadline = Date.now() + DELIVERY_TIMEOUT_MS;
  do {
    const listed = await listEmails();
    found = expected.map((e) => ({
      ...e,
      listId:
        listed.find((m) => m.to.includes(CUSTOMER_EMAIL) && m.subject === e.subject)?.id ?? null,
    }));
    if (found.every((e) => e.listId)) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
  } while (Date.now() < deadline);

  for (const e of found) {
    check(
      `${e.label} email found in the Resend list`,
      Boolean(e.listId),
      e.listId ?? `no send to ${CUSTOMER_EMAIL} with subject "${e.subject}" within ${DELIVERY_TIMEOUT_MS / 1000}s`
    );
    if (!e.listId) continue;
    const email = await resend(`/emails/${e.listId}`);
    const html = email.html ?? '';
    check(
      `${e.label} email envelope: from, to, exact subject`,
      email.from === 'Sevendays Photography <onboarding@resend.dev>' &&
        email.to.includes(CUSTOMER_EMAIL) &&
        email.subject === e.subject,
      `${email.from} → ${email.to.join(', ')}`
    );
    check(
      `${e.label} email body: greeting, offering, branch + phone, schedule, footer`,
      html.includes(`Hi ${e.record.customerName}`) &&
        html.includes(e.offeringName) &&
        html.includes(e.branch.name) &&
        html.includes(`scheduled for ${e.when}`) &&
        html.includes(e.branch.phone) &&
        html.includes(
          `${e.record.customerName} · ${e.record.customerEmail} · ${e.record.customerPhone}`
        ),
      `subject "${email.subject}"`
    );
    check(
      `${e.label} email CTA href is ${e.bookingUrl}`,
      html.includes(`href="${e.bookingUrl}"`) && html.includes(e.bookingUrl)
    );
    const isPackage = e.record.servicePackageId !== null;
    const addonNames = e.record.addonServices.map((a) => a.name);
    check(
      isPackage
        ? `${e.label} email: add-on name-only rows present, money-free`
        : `${e.label} email: no add-on section, notes row present, money-free`,
      isPackage
        ? addonNames.length > 0 &&
          addonNames.every((n) => html.includes(n)) &&
          html.includes('Add-on') &&
          !html.includes('₱')
        : !html.includes('Add-on') &&
          html.includes('Notes') &&
          Boolean(e.record.notes) &&
          html.includes(e.record.notes) &&
          !html.includes('₱')
    );
    // Receipt: poll until Resend reports the delivered event.
    let last = email.last_event;
    const deliveryDeadline = Date.now() + DELIVERY_TIMEOUT_MS;
    while (
      last !== 'delivered' &&
      last !== 'bounced' &&
      last !== 'failed' &&
      Date.now() < deliveryDeadline
    ) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      last = (await resend(`/emails/${e.listId}`)).last_event;
    }
    check(`${e.label} email delivered`, last === 'delivered', `last_event ${last}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('EMAIL EVIDENCE ERROR:', e.message);
  process.exit(1);
});
```

- [ ] **Step 3: Lint the harness**

Run: `pnpm --filter @sevendays/landing exec biome check --write scripts/verify/`
Expected: exit 0 (fixes applied if any). Then `pnpm --filter @sevendays/landing lint` → exit 0.

- [ ] **Step 4: Confirm the tested suites didn't move**

Run: `pnpm --filter @sevendays/landing test`
Expected: 56 passed (the harness is not vitest-included; this proves it).

- [ ] **Step 5: Commit**

```bash
git add apps/landing/scripts/verify/booking-e2e.mjs apps/landing/scripts/verify/confirmation-emails.mjs
git commit -m "test(landing): #48 e2e harness — recipient email param, service notes, Resend evidence script

- booking-e2e.mjs: E2E_CUSTOMER_EMAIL feeds both bookings (sandbox delivers
  only to the account owner's address); the service booking carries pinned
  notes so the live email proves the Notes-row rule; final BOOKINGS line is
  machine-parseable for the row probe + evidence script. Checks stay 7.
- confirmation-emails.mjs (new): retrieves both sends from the Resend API
  and asserts exact from/subject, money-free HTML, add-on name-only rows /
  section omitted, Notes row, CTA href from LANDING_ORIGIN, and last_event
  delivered — expectations re-derived from the live API, nothing hard-coded.
  Exit 2 = the account can't list sends (inbox check becomes the proof)."
```

---

### Task 2: The live end-to-end gate (bookings + DB confirm + email evidence)

**Files:**
- Create (local only, gitignored): nothing in the repo — evidence captures live in `/tmp/m2-e2e-*.txt|json`
- Read-only: `apps/api/.dev.vars`, `apps/landing/.env.local`

**Interfaces:**
- Consumes: Task 1's harness; the live Supabase db (via the API's `.dev.vars`); the landing dev server; Chrome headless CDP.
- Produces: the issue's first two acceptance criteria, evidenced. **No commits in this task** — the evidence wording lands in `docs/progress.md` (Task 5); the two rows stay in the db until Task 6 (Q3=A).

**Not here:** no product code changes, no seed/migrations, no `.dev.vars` edits beyond Step 0's `LANDING_ORIGIN` append-if-missing, no admin app, no deploys, no issue/PR edits.

- [ ] **Step 0: Owner-secret gate (STOP here if not satisfied)**

```bash
git check-ignore apps/api/.dev.vars                      # must print the path (gitignored)
grep -c '^RESEND_API_KEY=..*' apps/api/.dev.vars         # 1 = a non-empty value is present
grep -c '^LANDING_ORIGIN=' apps/api/.dev.vars            # 1 = present (value checked next)
```

- `RESEND_API_KEY` present → continue. **Missing/empty → STOP and hand the owner exactly this:** "Add the real Resend API key (resend.com/api-keys → the sevendays sending account) to `apps/api/.dev.vars` as `RESEND_API_KEY=re_…`. Never commit the file; never paste the value into a command, log, or issue." Then re-run this step's greps (names only, never values).
- `LANDING_ORIGIN` missing → the executor adds it (not a secret): append one line to `apps/api/.dev.vars`:
```
LANDING_ORIGIN=http://localhost:3000
```
(If `LANDING_ORIGIN` exists with a different local value, leave it — the evidence script derives the CTA from the actual env, so any value proves the wiring; the pinned plan expectation below assumes the localhost:3000 default.)

- [ ] **Step 1: Verify the landing env posture (read-only)**

Run: `cat apps/landing/.env.local`
Expected: exactly `API_URL=http://127.0.0.1:8787` (already the operator's posture — pre-plan fact 4). Do not edit.

- [ ] **Step 2: Boot the stack (three terminals, or background processes)**

First confirm the ports are free: `ss -tlnp | grep -E ':(3000|8787|9222)'` → no output (kill strays; the preflight-5 pitfall: a held port makes `wrangler dev` error or silently probe the wrong server).

```bash
# Terminal A: API dev on 8787 — picks up .dev.vars at boot (restart it if it
# was already running before Step 0's edits; wrangler reads .dev.vars once).
pnpm --filter @sevendays/api dev
# Terminal B: landing dev on 3000
pnpm --filter @sevendays/landing dev
# Terminal C: Chrome headless with CDP
~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
  --remote-debugging-port=9222 --no-first-run --no-default-browser-check about:blank
```

Sanity (each is load-bearing):
```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8787/health          # 200
curl -sS http://127.0.0.1:8787/api/v1/branches | grep -c '"id"'                 # 3
```
The second request also **proves the required env parses** (a missing/blank `RESEND_API_KEY`/`LANDING_ORIGIN` turns every `/api/v1` request into a 500 — no silent skip). If it 500s, return to Step 0; never proceed past a red sanity.

- [ ] **Step 3: Read-only regressions**

```bash
node apps/landing/scripts/verify/packages-pages.mjs
node apps/landing/scripts/verify/content-pages.mjs
node apps/landing/scripts/verify/booking-wizard.mjs
```
Expected: all three exit 0 with their `N/N checks passed` lines — packages-pages 12/12, content-pages 16/16, booking-wizard 15/15 (counts counted in the committed files 2026-09-10; a drift means the file changed since — recount, don't assume). A selector miss means fix the SCENARIO, never the route's pinned copy (ticket-07 ruling).

- [ ] **Step 4: The mutating end-to-end — both offering kinds, recipient = the owner's address**

```bash
E2E_CUSTOMER_EMAIL=pahamajulius@gmail.com \
  node apps/landing/scripts/verify/booking-e2e.mjs 2>&1 | tee /tmp/m2-e2e-run.txt
```
Expected: exit 0, `7/7 checks passed`, and a final line `BOOKINGS {"customerEmail":"pahamajulius@gmail.com","bookings":[{"kind":"package","id":"<pkgId>"},{"kind":"service","id":"<svcId>"}]}`. Record `<pkgId>`/`<svcId>` — every later step uses them. The wizard drove the real stack: browser → `/book` steps → landing server fn → `@sevendays/api-client` → API → live db; both emails were scheduled past the responses via `waitUntil`.

Watch Terminal A: expected is the ABSENCE of `[api] confirmation email for appointment … failed:` lines (success is silent — pre-plan fact 9). If the failure line appears, the send path failed: read the logged error, fix the cause (almost always the key), and re-run from Step 4 after the retry-hygiene note below.

**Retry hygiene (only if Step 4 must re-run):** a re-run books two NEW rows — first `delete` the previous run's rows (their ids are in the previous run's BOOKINGS line, via Task 6 Step 1's commands), then re-run. The evidence script matches the NEWEST send per subject, so a re-run's emails win; never leave two live verification rows for one run.

- [ ] **Step 5: DB row confirmation (evidence before deletion — Q3=A)**

```bash
curl -sS http://127.0.0.1:8787/api/v1/appointments/<pkgId> | tee /tmp/m2-e2e-pkg.json
curl -sS http://127.0.0.1:8787/api/v1/appointments/<svcId> | tee /tmp/m2-e2e-svc.json
cd packages/db
node --env-file=.env scripts/verify-appointment-row.mjs confirm <pkgId> < /tmp/m2-e2e-pkg.json | tee /tmp/m2-e2e-pkg-confirm.txt
node --env-file=.env scripts/verify-appointment-row.mjs confirm <svcId> < /tmp/m2-e2e-svc.json | tee /tmp/m2-e2e-svc-confirm.txt
cd ../..
```
Expected: both print `CONFIRM: PASS — appointment <id> matches every expected value (N checks)` and exit 0 — the API wrote exactly what it returned (snapshots, exactly-one refs, kind `scheduled`, status `pending`, the service booking's notes). A MISMATCH is a stop-and-investigate, never a footnote.

- [ ] **Step 6: Email delivery + content evidence**

```bash
set -a
source <(grep -E '^(RESEND_API_KEY|LANDING_ORIGIN)=' apps/api/.dev.vars)
set +a
E2E_CUSTOMER_EMAIL=pahamajulius@gmail.com \
  node apps/landing/scripts/verify/confirmation-emails.mjs <pkgId> <svcId> 2>&1 | tee /tmp/m2-email-evidence.txt
```
(The source-and-set pattern loads the values into env without printing them; nothing in the output may echo the key.)

Expected: exit 0 — per email: found in the Resend list; envelope exact (`Sevendays Photography <onboarding@resend.dev>` → the owner's address; subject `Booking scheduled: <offeringName> — <phDateTime> (PHT)` derived live); body carries the greeting/offering/branch+phone/schedule/footer; CTA href `http://localhost:3000/booking/<id>`; package email shows its add-on name-only row and the service email shows NO Add-on section + the Notes row; **neither HTML contains `₱`** (the money-free rule proven on the real artifacts); both end `last_event delivered`.

Contingencies, handled explicitly:
- **Exit 2** (the account can't list sends): machine enumeration is unavailable — record that fact, then the owner's inbox check becomes the recorded receipt proof (the PR description states exactly which two emails to look for, by subject). Do not weaken the script.
- **A `last_event` stall at `sent`** past the 90s window (sandbox → Gmail lag): record the final state in the evidence and let the owner's inbox confirmation carry the receipt — same posture as exit 2, noted in the PR. Do not re-send to force events.
- **`bounced`/`failed`**: a hard failure — investigate (sandbox limits, key scopes) before claiming anything.

- [ ] **Step 7: Park the evidence; leave the rows**

Keep the four `/tmp/m2-e2e-*.txt|json` captures until Task 6 (deletion) is done — they are the recorded evidence Q3=A requires (their facts land in `docs/progress.md` in Task 5 and the owner's PR description). The two rows stay in the live db until Task 6 Step 1. **No commit.**

---

### Task 3: ADR-0013 — the generalized-appointment model

**Files:**
- Create: `docs/adr/0013-generalized-appointment-model.md`

**Interfaces:**
- Consumes: migration 0004 (`apps/api` history, ticket 02 / issue #40), ADR-0012 (exactly-one enforcement — referenced, NOT edited: accepted ADRs are immutable except their Status line), the intake module + snapshot semantics as landed.

**Not here:** no code edits; no re-numbering (0013/0014 are the next free numbers — the adr/ directory ends at 0012); no edits to ADR-0012 or any prior ADR; this ADR records the MODEL-SHAPE decision (one table, nullable refs, snapshot pricing) — it deliberately does not re-litigate the exactly-one invariant that ADR-0012 already owns; the two cross-reference each other.

- [ ] **Step 1: Write `docs/adr/0013-generalized-appointment-model.md` verbatim**

```markdown
# ADR-0013: One appointments table, nullable offering refs, booked-price snapshots

**Status:** Accepted
**Date:** 2026-09-10

## Context

The PRD's "services offered" turned out to be a distinct entity — Studio Services (photo recovery, tarpaulin & bulletin printing, portraits & ID photo, picture framing) — not the catalog's Add-on Services, and until M2 the `appointments` table could represent only Service Package bookings (`service_package_id` NOT NULL; snapshot column `package_price_cents`). The M2 booking flow records either offering kind through one guest flow, the intake must stay one transaction (M1.4), and catalog prices change over time while each booking must keep the price the customer was quoted (M2 spec user story 23). The table was young — zero production rows when the model moved (migration 0004, 2026-09-09).

## Decision

One `appointments` table books both kinds: `service_package_id` became nullable, a nullable `studio_service_id` FK joined it, and the snapshot column renamed to `booked_price_cents` — server-written at intake from the live catalog price. Exactly-one offering is enforced on both the Zod and SQL sides (ADR-0012's subject, not repeated here). Add-on selections remain junction rows carrying per-row `price_cents` snapshots; which add-ons may attach is uniform for packages (any active add-on) and matrix-gated for services (`studio_service_addon_services`). Every later read — the `/booking/:id` page, the confirmation email, the future admin — renders names by joining the referenced rows and prices only from the snapshots: a catalog edit never rewrites a booked row's facts.

## Alternatives Considered

- **Split tables (`package_bookings` / `service_bookings`) or a storage-level discriminated union** — rejected: it would split the intake transaction, the list read, and add-on junction stitching across two shapes for one business object; one row per appointment keeps all of M1.4's machinery intact. (Full ruling in ADR-0012's alternatives.)
- **Live-price joins at read time (no snapshots)** — rejected: the quoted price must not drift when the catalog changes, and the M5 CMS makes prices editable, which would otherwise silently rewrite history.
- **A JSONB "offering" column** — rejected: no FK integrity to the catalog, no CHECK-enforceable exactly-one, no typed shape for consumers.

## Consequences

- Names always join at read time (the confirmation page pulls them from the sibling reads; the email resolves them at send time keyed by the stored ids) — every consumer needs the record AND the catalog reads to render.
- Deactivating a package or service (M5 CMS) leaves booked rows untouched and fulfillable — the snapshot design buys that for free.
- The expand half of expand–contract shipped while the table was empty; the contract half (NOT NULL restoration) never became necessary and would now cost the populated-table two-step.
- A third offering kind would mean a new nullable ref plus extending the exactly-one formula in both its mirrors (ADR-0012) — deliberate friction.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0013-generalized-appointment-model.md
git commit -m "docs(adr): ADR-0013 — generalized appointment model (one table, nullable refs, snapshots)

The model-shape decision behind migration 0004: one appointments table for
package-or-service bookings, nullable offering refs under the ADR-0012
exactly-one rule, booked-price snapshots so catalog edits never rewrite a
booked row's facts. Records the duty the M2 spec assigned to #48; ADR-0012
(exactly-one enforcement) is referenced, not edited."
```

---

### Task 4: ADR-0014 — the email send topology

**Files:**
- Create: `docs/adr/0014-confirmation-email-send-topology.md`

**Interfaces:**
- Consumes: `apps/api/src/services/confirmation-email.ts` + `routes/appointments.ts` as landed (ticket 09 / PR #65); ADR-0011 (per-request db client — referenced); the M2 spec's mechanics rulings (waitUntil, idempotency, sandbox reality).

**Not here:** no code edits; no edits to ADR-0011; no M6 decisions pre-made (retry/queue/domain work stays M6's to design — this ADR records what M2 chose and what it defers).

- [ ] **Step 1: Write `docs/adr/0014-confirmation-email-send-topology.md` verbatim**

```markdown
# ADR-0014: Confirmation email — sent after the DB commit via waitUntil, deduped by idempotency key

**Status:** Accepted
**Date:** 2026-09-10

## Context

A booking must never fail because its email did (spec user story 28), and a retried request must never double-send to a customer (story 29). The API runs on Cloudflare Workers: there is no queue/cron infrastructure in M2, the response should not block on a third-party API, and `ctx.waitUntil` buys ~30s of post-response execution (~1 subrequest). The official Resend SDK runs on Workers (its `react` param does not — Node-only), and Resend stores idempotency keys for 24h: replaying one returns the original result instead of re-sending.

## Decision

After the intake transaction commits, the route schedules exactly one send: `c.executionCtx.waitUntil(...)` wrapping `sendConfirmationEmail`, which resolves the copy's names from the stored ids (the request's per-request db client stays valid past the response — ADR-0011), builds a pure template-literal HTML string (the builder input carries no price field — money-free by construction), and hands it to the Resend SDK with `idempotencyKey: booking-confirm/<appointmentId>`. The catch-and-log lives INSIDE the scheduled callback, so a failed send is logged (appointment id in the line) and the booking stands; the SDK's typed `{ data, error }` failure is checked, not try/catch'd. `RESEND_API_KEY` + `LANDING_ORIGIN` are required env with no fallback — a deploy missing either fails every `/api/v1` request loudly (the `API_URL` posture) instead of silently dropping emails. No retry, no outbox table in M2; the sender is the sandbox `onboarding@resend.dev` until the M6 domain swap (the `bookings@` local part is reserved).

## Alternatives Considered

- **Await the send before responding** — rejected: response latency becomes Resend's latency, and the email failure would have to fail (or lie about) a booking that already committed.
- **Send before the commit** — rejected: the email could describe a booking the transaction then rolls back.
- **Cloudflare Queues / Durable Objects for delivery + retry** — deferred: M2 volume is a rounding error against Resend's free tier; delivery infrastructure belongs to M6's production slice (real sending domain + the end-to-end inbox check), if retry semantics are ever wanted.
- **Raw `fetch` to `api.resend.com/emails`** — equivalent on Workers (the SDK is a thin fetch wrapper); the SDK won for the typed failure shape and the native `idempotencyKey` option.
- **An outbox table + poller** — deferred with Queues: the idempotency key is the only dedup M2 needs, and an outbox would add a write path to the intake transaction for no M2 benefit.

## Consequences

- A failed send is reconciled manually (the log line names the appointment id) until M6 adds real retry semantics — acceptable at volumes a human can read.
- Resend holds the dedup for 24h; a re-send of the same appointment after that window could double-send — the exposure is bounded by the no-retry ruling (M2 never re-sends deliberately).
- The email's facts are safe under catalog edits (names resolved from stored ids at send time); a branch-row edit between commit and send would surface, but the window is the same request's tail.
- Local/dev sends need the real key in `.dev.vars`; the sandbox delivers only to the account owner's address (403 for everyone else) — the M2 end-to-end proof books with that address (#48).
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0014-confirmation-email-send-topology.md
git commit -m "docs(adr): ADR-0014 — confirmation email send topology (after-commit waitUntil + idempotency)

One waitUntil after the intake commit, catch-and-log inside the scheduled
callback (email failure = booking stands), Resend idempotency key
booking-confirm/<appointmentId>, required no-fallback env, sandbox sender
until M6. Records the mechanics ticket 09 landed and the duty #48 owes;
retry/queue/domain work explicitly deferred to M6."
```

---

### Task 5: Docs close-out — progress.md refresh + the last plan.md tick

**Files:**
- Modify: `docs/progress.md` (three edits: the `_Last updated:_` lead, the `## Current Milestone` header, the What Exists tail bullet, the Immediate Next Steps item)
- Modify: `docs/plan.md` (one edit: line 69's checkbox)

**Interfaces:**
- Consumes: the Task 2 evidence (its facts are the bullet's content), Tasks 3–4 (the ADRs the bullet and tick cite).

**Not here:** no product code; no edits to other plan.md checkboxes or to Known Gaps (nothing new is owed — the sandbox sender, branch-phone placeholders, and public-appointment reads are already tracked); no issue edits.

- [ ] **Step 1: Refresh the `_Last updated:` lead in `docs/progress.md`**

The file opens `_Last updated: 2026-09-10 (M2 ticket 09 — confirmation email builder + Resend send-after-commit. Prior 2026-09-10: M2 ticket 08 — …`. Replace the opening so it reads (keep everything from `Prior 2026-09-10: M2 ticket 08` onward unchanged):

```markdown
_Last updated: 2026-09-10 (M2 close-out #48 — live end-to-end verification + docs: real bookings for both offering kinds through the wizard, confirmation emails received at the account owner's address, ADR-0013 + ADR-0014 recorded, plan.md's last M2 checkbox ticked. Prior 2026-09-10: M2 ticket 09 — confirmation email builder + Resend send-after-commit. Prior 2026-09-10: M2 ticket 08 —_
```

- [ ] **Step 2: Update the Current Milestone header**

Replace line 5:
```markdown
## Current Milestone: 1 — Real Data Layer (complete — exit criteria verified live 2026-09-02; next up: Milestone 2 pre-flight, issue #1)
```
with:
```markdown
## Current Milestone: 2 — Public Booking Flow (complete — exit criteria verified live 2026-09-10, issue #48; next up: the UI/UX design-system milestone — spec task #61, wayfinder map #55)
```

- [ ] **Step 3: Append the #48 bullet at the END of What Exists**

Insert immediately before the `## Known Gaps / Not Yet Done` heading (the list's structural tail):

```markdown
- **M2 close-out — end-to-end verification + docs (#48 → .scratch/m2-booking-flow-tickets/10.md):** the milestone's exit criterion executed live on 2026-09-10 against the local stack (API dev 8787 → the LIVE Supabase db via `.dev.vars`; landing dev 3000; Chrome headless CDP 9222) — the deployed API still runs pre-M2 code with only `DATABASE_URL`, and deploys/secrets stay user-run. Harness extensions (under the owner's tickets-06–10-extend-it ruling): `booking-e2e.mjs` takes `E2E_CUSTOMER_EMAIL` (the sandbox delivers only to the account owner's address), the service booking carries pinned notes (proving the email's Notes-row rule on a live artifact), and it prints a machine-parseable BOOKINGS tail; new `confirmation-emails.mjs` retrieves the real sends from the Resend API and asserts delivery + content. The gate: read-only regressions green (packages-pages 12/12, content-pages 16/16, booking-wizard 15/15); the mutating e2e drove one package booking (with an add-on) + one studio-service booking (with notes) through the real /book wizard — 7/7 checks (redirects, server snapshots incl. `bookedPriceCents`/exactly-one/notes, rendered read-backs incl. the confirmation-email line); both rows CONFIRM: PASS in Postgres via `verify-appointment-row.mjs` (every snapshot value matches what the API returned); both confirmation emails retrieved from Resend — exact from/subject (subject re-derived live via the shared en-PH/Asia/Manila formatting), money-free HTML (no `₱` anywhere), add-on name-only rows (package) / section omitted + Notes row (service), CTA href from LANDING_ORIGIN, `last_event` delivered at the account owner's address. Rows deleted after the evidence was recorded (the M1.5 Q3=A ruling). ADR-0013 (generalized-appointment model) + ADR-0014 (email send topology) recorded; `docs/plan.md`'s last M2 checkbox ticked ✅ — Milestone 2 exit criteria met. M6 re-verifies the email on the real sending domain (the sandbox sender and this run's localhost CTA are expected artifacts).
```

- [ ] **Step 4: Replace the Immediate Next Steps item**

Replace the entire numbered item (the block currently begins `1. **Milestone 2 proper (booking flow)** — the M2 pre-flight block is closed…`) with:

```markdown
1. **UI/UX design-system milestone** — M2 is closed (exit criteria verified live 2026-09-10, #48). The M3 slot is taken by the design-system milestone per the owner's 2026-09-09 deferral: next is the milestone spec (#61, from wayfinder map #55) with the landing-refactor grilling (#60), then the red-pencil of `docs/plan.md`. The v1/v2 delivery ruling (#62) stands: v1 = landing + admin auth + CMS as a booking-free artifact; booking + appointments admin + availability stay v2-track. (M6's production slice re-verifies the confirmation email on the real sending domain.)
```

- [ ] **Step 5: Tick `docs/plan.md` line 69 (the last M2 checkbox)**

Replace:
```markdown
- [ ] Verify: complete a real booking end-to-end and receive the confirmation email at the Resend account owner's address (julius.porferio.pahama@gmail.com — the sandbox 403s every other recipient)
```
with:
```markdown
- [✅] Verify: complete a real booking end-to-end and receive the confirmation email at the Resend account owner's address (julius.porferio.pahama@gmail.com — the sandbox 403s every other recipient) _(2026-09-10: verified live on the local stack — API dev (8787, live Supabase db) + landing dev (3000) + the committed CDP harness: one package booking (with an add-on) and one studio-service booking (with notes) through the real /book wizard, 7/7 harness checks after the read-only regressions stayed green; both rows confirmed in Postgres via `verify-appointment-row.mjs`; both confirmation emails retrieved from Resend — exact envelope/subject, money-free HTML, add-on name-only rows / section omitted + Notes row, CTA href from LANDING_ORIGIN, `last_event` delivered to pahamajulius@gmail.com (owner-corrected 2026-09-10 — the roadmap line's julius.porferio.pahama@gmail.com pin has no Resend account; correction recorded in this annotation and in progress.md); rows deleted after the evidence was recorded (M1.5 Q3=A); ADR-0013 + ADR-0014 recorded; see #48.)_
```

Then confirm nothing else moved: `git diff --stat docs/plan.md` → exactly 1 file, 1 insertion, 1 deletion.

- [ ] **Step 6: Commit**

```bash
git add docs/progress.md docs/plan.md
git commit -m "docs: M2 close-out — progress.md refreshed, last M2 plan.md checkbox ticked ✅ (#48)

- Current Milestone: 2 complete (exit criteria verified live 2026-09-10);
  next up: the UI/UX design-system milestone (#61/#55).
- What Exists: the #48 bullet (live gate evidence, harness extensions,
  ADR-0013/0014, Q3=A row deletion).
- plan.md: the Verify checkbox ticked with the dated evidence annotation —
  the M2 booking-flow block has no unticked boxes left.
- Parent #37 stays OPEN and untouched; issue AC boxes are the owner's."
```

---

### Task 6: Row cleanup + graphify + final gates + handoff checks

**Files:**
- Modify (generated): `graphify-out/` (git-tracked knowledge graph)
- Delete (db rows): the two Task 2 verification rows — the live-db write this task exists for

**Interfaces:**
- Consumes: Tasks 1–5 all committed; the two ids from Task 2 Step 4's BOOKINGS line.

**Not here:** no doc rewrites beyond what Task 5 committed; no issue/PR mutations; no deploys.

- [ ] **Step 1: Delete the two verification rows (Q3=A: the evidence is now recorded in committed docs)**

```bash
cd packages/db
node --env-file=.env scripts/verify-appointment-row.mjs delete <pkgId> | tee /tmp/m2-e2e-pkg-delete.txt
node --env-file=.env scripts/verify-appointment-row.mjs delete <svcId> | tee /tmp/m2-e2e-svc-delete.txt
cd ../..
```
Expected per row: `DELETE: removed appointment <id>` then `ABSENT: verified — no appointment row, no join rows`, exit 0 (the delete mode re-asserts absence itself). **This is exactly what Task 5's bullet asserts — a failure here is a STOP-and-fix:** leave the rows (they are evidence-backed), investigate, and amend `docs/progress.md` truthfully before any further commit. Never mark a row deleted that isn't.

- [ ] **Step 2: Update the knowledge graph**

Run: `graphify update .`
Expected: exit 0. `git status --short graphify-out` → modified files (it is git-tracked); if empty, note it and skip Step 3's graphify hunk.

- [ ] **Step 3: Commit the graph update**

```bash
git add graphify-out
git commit -m "chore: update graphify knowledge graph after the M2 close-out (#48)

Reflects the verification-harness extensions, ADR-0013/0014, and the
progress/plan docs close-out."
```

- [ ] **Step 4: Final gates**

Run: `pnpm check && pnpm build`
Expected: both green across the workspace (33/33 check tasks; all builds) — matching the PR #65 baseline. The harness edits and docs must not move the suite counts (landing 56, api 93/12 files).

- [ ] **Step 5: Handoff audits (all read-only)**

```bash
awk '/## Milestone 2 — Public Booking Flow/,/## Milestone 3/' docs/plan.md | grep -c '^- \[ \]'   # 0 — no unticked M2 boxes left
awk '/## Milestone 2 — Public Booking Flow/,/## Milestone 3/' docs/plan.md | grep -c '^- \[✅\]'  # every M2 booking-flow box
gh issue view 37 --json state --jq .state                                                        # OPEN — parent untouched
git log --oneline -8
```
Expected: zero unticked boxes in the M2 block; #37 still OPEN; the log shows the Task 1/3/4/5/6 commits on the feature branch. **Leave pushing, the PR, and the issue's acceptance boxes to the owner.** The PR description should carry the evidence: the Task 2 Step 4 `7/7` output + BOOKINGS line, both CONFIRM: PASS tails, the Task 2 Step 6 email-evidence output (or the exit-2 fallback note + which two emails to look for, by subject), and the Task 6 Step 1 DELETE/ABSENT tails — the `/tmp/m2-e2e-*` captures are ephemeral, the PR description is the durable record.

---

## Self-Review (against issue #48 + the M2 spec)

- **Issue AC coverage:**
  - *Live booking completes end to end against the deployed/local stack for both offering kinds* → Task 2 Steps 2–4 (local stack posture justified in pre-plan fact 4; package + studio-service bookings driven through the real wizard; read-backs + DB confirms in Step 5).
  - *Confirmation email received at the account owner's address with correct content* → Task 2 Step 6 (Resend list/get: `to` = the owner's address, `last_event` delivered, exact envelope/subject, money-free HTML, per-kind table rules, CTA href) with the exit-2 / `sent`-stall fallbacks documented; the owner's inbox check rides PR review as the human gate.
  - *ADR recorded for the generalized-appointment model* → Task 3 (ADR-0013; scoped to the model shape, cross-referencing — not editing — ADR-0012).
  - *ADR recorded for the email send topology (send-after-commit + idempotency)* → Task 4 (ADR-0014).
  - *`docs/progress.md` updated; M2 plan.md checkboxes ticked (✅ emoji)* → Task 5 (four progress.md edits + the line-69 tick) audited in Task 6 Step 5.
- **Spec coverage:** user story 38 (real end-to-end verification) is Tasks 1–2; the spec's "Documentation duties at build time" paragraph is Tasks 3–5; the spec's § Testing Decisions 5 (the CDP scenario owns wizard behavior — no permanent UI suite) is respected: Task 1 extends the committed harness only, zero vitest surface. The v1/v2 ruling (#62) is untouched — no M4/M6 work is pulled forward.
- **Sibling fence:** tickets 01–09 are closed and their deliverables are NOT re-landed here: no product code changes (the only code is the verify harness, sanctioned by the owner's tickets-06–10 ruling), no API/env/seed/migration changes, ADR-0011/0012 byte-untouched, parent #37 and all issue boxes untouched. Shared-checkbox hygiene: `docs/plan.md`'s M2 block has exactly ONE unticked box (line 69) and only this plan's Task 5 ticks it — no sibling's checkbox is touched early or late.
- **Count consistency (recounted from the committed files, 2026-09-10):** `booking-e2e.mjs` 7 named checks before Task 1 and 7 after (two extended, none added/removed — stated identically in Task 1 Step 1(f)'s note, Task 2 Step 4, fact 5, and the Task 5 bullet); regressions 12/16/15 (fact 5 + Task 2 Step 3); the new `confirmation-emails.mjs` deliberately carries NO pinned check count anywhere — Task 2 Step 6 gates on exit 0 + the named PASS lines; `verify-appointment-row.mjs`'s N varies with expectations (never pinned). The stale "14/14" that ticket 08 had already raised to 15 was caught and fixed during this plan's self-review.
- **Name/signature consistency:** `E2E_CUSTOMER_EMAIL` (env, Tasks 1–2), `CUSTOMER_EMAIL`/`SERVICE_NOTES` (script-internal, Task 1), `confirmation-emails.mjs` exit contract 0/1/2 (Task 1 interface ↔ Task 2 Step 6 contingencies), the probe's `confirm|delete|absent` modes (fact 7 ↔ Task 2 Step 5 ↔ Task 6 Step 1), ADR filenames `0013-generalized-appointment-model.md` / `0014-confirmation-email-send-topology.md` (Tasks 3–4 ↔ Task 5 bullet + plan.md tick annotation).
- **Evidence-before-deletion (Q3=A) honored in sequence:** Task 2 captures → Task 5 records in committed docs → Task 6 deletes (with the stop-and-fix if deletion fails). Matches the M1.5 ruling's letter.
- **Placeholder scan:** none — every step carries exact files, commands, or verbatim text; the only owner-supplied input (the real `RESEND_API_KEY`) is an explicit STOP-gate with instructions, never a placeholder value.
- **Mocked-boundary check:** nothing in this plan mocks a boundary — the whole gate runs against the real stack. The one subtlety (the email module logs failures only, so success leaves no console trace) is designed around: Resend's API is the evidence source, and the dev console's expected state (no failure line) is pinned in Task 2 Steps 4/6.
