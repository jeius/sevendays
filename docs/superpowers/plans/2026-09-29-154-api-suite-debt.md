# API suite debt — M5-pinned test gaps + api hygiene nits (#154) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pay the M5-pinned api-suite debt: every branch-coverage gap the SDD reviews ledgered (media, admin entities, package cover, the order guard, the public-read AR3/AR7 halves, the api-client gallery/testimonials wrappers) gains a test pinning the code's CURRENT behavior, plus the three pinned hygiene nits (determinism comment, hoisted resend mock, live-harness try/finally + HEAD observability).

**Architecture:** Test-only across `apps/api`, `packages/types`, and `packages/api-client` — **zero production-semantics changes** (the only edits outside `it()` blocks are: two test-stub widenings, one comment reword, one mock-hoisting fix, and the two named nits inside `test/media-live.test.ts`, which is itself a test file and CI-skipped). Every new test writes to what the code does TODAY; a test that reveals genuinely broken behavior STOPS and reports on the issue instead of changing production code. The api integration suites run against the local compose test database (`apps/api/test/global-setup.ts` defaults `TEST_DATABASE_URL` to `postgres://postgres:postgres@localhost:5432/sevendays_test` — compose default locally, CI sets the var at job level; verified live 2026-09-29 with the var unset in the dev shell), wiping via `truncateAll` + fixture reload per test; the api-client loopback suite extends the existing mock app (`test/mock-api.ts`) with the two route groups it never grew.

**Tech Stack:** Vitest 4 (per-workspace configs per ADR-0003), the api's `app.request` integration harness (`signUpSession` + `testEnv` + `stubCommitBucket`), the api-client's loopback harness (`toLoopbackFetch` over a typed mock app), zod 4 schemas from `@sevendays/types`.

**Spec:** GitHub issue #154 (split from #152, full disposition table in `docs/superpowers/plans/2026-09-27-143-m5-09-closeout.md` Task 5). Item provenance: the M5 SDD ledgers — #136 T3 (`media.test.ts` lowercase-extension reject), #136 T4 (`media.ts:129` no-contentType fallback branches), #136 T5 (thumb anonymous-401 structural-only; >20MiB stub contentType indistinguishability), #136 T6 (leg-1 try/finally; HEAD adapter non-ok → null), #137 T2/T3 (PUT pre-check clash branches), #137 T4 (deactivated-ids-via-matrix-PUT), #137 T6 (absent-unchanged at non-null pre-state; missing-staging not_found distinction), #137 T7 (duplicate-id arm of `checkCompleteOrder`), #137 T9 (admin-GET-still-shows round-trip asserts), #138 T1/T2 (determinism overclaim), #138 T3 (mock hygiene), #138 T4 (AR3 fixture case, AR7 testimonial half), #138 final (wrapper loopback tests).

## Recon state this plan starts from (verified live 2026-09-29, pre-plan)

- **Main is at `fbc85ed`** (M5 closed). All target files verified read on this commit.
- **Baseline floors, re-run live 2026-09-29**: types **13 files / 112 tests**; api-client **5 files / 29 tests**; api **23 passed + 1 skipped (24) files / 278 passed + 3 skipped (281) tests** (the skipped file is `test/media-live.test.ts` — `describe.runIf(LIVE)`; its 3 skipped tests are the count's "+3"). Landing (8/69) and admin (5/51) are untouched by this ticket. `pnpm check` = 35/35 tasks and stays 35/35 (no workspace scripts change).
- **The api suite's runtime noise confirms the mock-hygiene target live**: the baseline run prints `[api] confirmation email … failed: TypeError: Cannot read properties of undefined (reading 'error')` — exactly the "harmless swallowed-TypeError noise" #138 T3 named. The cause: `test/branches.test.ts:16` declares `const sendMock = vi.fn();` at module level with NO `mockReset()`/`mockResolvedValue`, so `send()` resolves `undefined` and the email service's error-handling reads `.error` off it. `test/appointments.test.ts:65-69` carries the correct precedent (`vi.hoisted` + `sendMock.mockReset(); sendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });` in `beforeEach`).
- **Every ledgered gap verified against the current tests** (file + line verified, not assumed):
  - `packages/types/src/media.test.ts:62-74` rejects `covers/…`, `gallery/…`, traversal, `.JPG` (uppercase ext), `tmp/short.jpg` — **no lowercase non-jpeg extension case** (`.txt`).
  - `apps/api/src/services/media.ts:129-135` — `commitUpload`'s no-contentType branch (`obj.httpMetadata?.contentType ?? ''` → violation `stored content type (none) is not allowed`): every existing commit test seeds a `contentType`. The file-local `stubBucket` types its seed `contentType: string` (widening to optional hits the branch honestly — `httpMetadata: { contentType: undefined }`).
  - `apps/api/test/media-routes.test.ts` — `stubMediaBucket` hardcodes `contentType: 'image/jpeg'`, so the >20MiB fallback test's `image/jpeg` assert is indistinguishable from a hardcoded constant (#136 T5's exact wording); the `?? 'application/octet-stream'` fallback (`media.ts:189`) is never exercised. The thumb anonymous-401 test sends a VALID uuid — gate-before-param ordering is proven only structurally (#136 T5; the presign mirror at `media-routes.test.ts:104` is the pattern to copy).
  - `apps/api/test/admin-entities.test.ts` — branches has the PUT-clash test (`:157`); **attires and add-ons have none** (their `updateAdminAttire`/`updateAdminAddonService` pre-check branches at `admin-entities.ts:177-184`/`228-235` are unexercised). No matrix tests live here (they're in `admin-studio-services.test.ts`). The PUT-flip tests assert only the PUT response — no follow-up admin GET.
  - `apps/api/test/admin-studio-services.test.ts` — matrix tests cover full-replace/unknown-id/empty, **never a deactivated id** (the deactivation-blind ruling at `admin-entities.ts:356-363` is unpinned). `PUT flips isActive → 200` (`:122`) has no GET round-trip.
  - `apps/api/test/admin-packages.test.ts` — absent-unchanged is pinned only at the NULL pre-state (`:494`, packageSimple has no cover); **absent at a NON-NULL pre-state is untested**. The missing-staging test (`:515`) asserts only `status === 400` — not the typed not-found message/details, and not `deleteCalls: []`.
  - `apps/api/src/services/admin-gallery.ts:44-66` — `checkCompleteOrder` has three arms; the order-PUT tests cover missing-row (categories) and unknown-id (testimonials/photos); **the `duplicate id` arm (`:50`) has no test**.
  - `apps/api/test/public-reads.test.ts` — AR3 (active photo under a deactivated category stays public) is documented in `services/gallery.ts`'s JSDoc and the #138 plan but **has no fixture case**; AR7's gallery half is pinned (`:84`) — **the testimonials half (empty → `[]` 200) is not**.
  - `packages/api-client/test/mock-api.ts` — the mock app mounts branches/service-packages/studio-services/addon-services/appointments only: **no `/gallery`, no `/testimonials`**, so the two wrappers added in #138 (`src/routes/gallery.ts`, `src/routes/testimonials.ts`) have no loopback tests. `test/loopback.test.ts` (16 tests) covers every other wrapper group.
  - `apps/api/test/service-packages.test.ts` (the `'inclusions order by (position, id), not by id'` test) — the comment `// Insertion id order reads framed → 2R → 2x2; the swapped positions / must win.` overclaims id-axis determinism (minted uuids are unordered).
  - `apps/api/test/media-live.test.ts` — leg-1's cleanup (`await bucket.delete(result.finalKey)` at the test's tail, `:124`) is not throw-safe: an expect failure between promote and delete litters `gallery/` (no lifecycle rule cleans it). The `liveBucket()` HEAD adapter (`:49-51`) maps EVERY non-ok to `null` with no reason surfaced.
- **Contract facts the new tests pin (all read from source, this commit)**:
  - `commitUpload` no-contentType → `reason: 'cap_violation'`, details `[{ path: ['contentType'], message: 'stored content type (none) is not allowed' }]`, staging deleted, no put.
  - `servePhotoThumbnail` >20MiB → `new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream' } })` — the stored type flows; absent → octet-stream.
  - The admin root `requireSession` answers 401 before route-level `validatedParam` (the M4 ordering; presign's invalid-body 401 test is the standing proof).
  - `setStudioServiceBranchMatrix`/`setStudioServiceAddonMatrix` existence checks are deactivation-blind (`inArray` on ids only) → a deactivated id links with 200.
  - `resolveCover` (admin-packages.ts:151-170) re-paths commit failures onto `coverImageKey` and passes `commitUpload`'s message through: missing staging → 400 with `error: 'Upload not found — the PUT may have failed, expired, or been already committed.'`, details `[{ path: ['coverImageKey'], message: 'no object at the staging key' }]`; absent at non-null pre-state → the stored cover survives (`putCalls` stays at the bind's 1, `deleteCalls` stays at `[STAGING]`).
  - `checkCompleteOrder` on `[A, A, B, C]` → exactly one detail `{ path: [<field>], message: 'duplicate id <A>' }`, reason `invalid` → 400, nothing written.
  - The public gallery read filters photos on `isActive + categoryId IS NOT NULL` only — a deactivated CATEGORY never removes a photo (AR3); `GET /api/v1/testimonials` on an empty table answers `[]` 200 (AR7).
  - The api-client `unwrap` gate: a 404 envelope throws `ApiClientError` with `status: 404` and `details` = the whole body object (`{ error: 'Not found.' }` from the mock's uniform notFound).

## Global Constraints

- **The pinning rule (the ticket's core law):** every test added by this plan asserts the code's **current actual behavior**. If writing a test reveals genuinely broken behavior, **STOP** — report it on issue #154 and do not change production semantics in this ticket. There is no TDD-red phase for production code anywhere in this plan; "failing test" steps exist only where a test intentionally documents a failure-path response.
- **Zero production-semantics changes.** Files under `apps/api/src` and `packages/*/src` are touched ONLY at: `packages/types/src/media.test.ts`, `apps/api/src/services/media.test.ts` (test files that happen to live beside sources — the house layout), plus `apps/api/test/**` and `packages/api-client/test/**`. The two ticket-named nits (try/finally, HEAD observability) land inside `apps/api/test/media-live.test.ts` — a test file. `apps/api/src/services/media.ts`, `admin-*.ts`, `gallery.ts`, and every route file are NOT EDITED.
- **Scope fence (the ticket's out-of-scope, verbatim):** NOT here — any production behavior change beyond the two named nits; the final-prefix bucket litter check (owner-run at next bucket touch — needs bucket access); query-error postures, bulk-bar wording, leak-safe error detail, checkbox glyph ruling (owner-decision issue, split from #152); position race, upload cancellation, the Zod `.default(true)` fence (stay deferred on #152); any admin/landing UI work.
- **Fresh-clone order (house):** `pnpm install && pnpm build:packages` before any typecheck — `@sevendays/config/vitest` is a built entry and the api-client resolves the API's `AppType` from the built `dist/`.
- **House gates, per task:** the touched workspaces' `pnpm --filter <ws> typecheck` is a HARD gate (zero errors) before any commit; `pnpm --filter <ws> lint` clean on touched files; the touched workspace's `pnpm --filter <ws> test` green. Full `pnpm check` (expected **35/35**, unchanged — this ticket adds no workspace scripts) before the PR. `pnpm build` 7/7 before the PR (Task 7).
- **Baselines (pinned this session):** types 13/112; api-client 5/**29**; api 24 files (23+1 skipped) / **278 passed + 3 skipped**; landing 8/69; admin 5/51. Expected end state: api **290 passed + 3 skipped** (+12: Task 1 +4, Task 2 +4, Task 3 +1, Task 4 +3), api-client **33** (+4, Task 5), types **112** (Task 1 adds an assert inside an existing test, not a new `it`). **Count-reconciliation rule:** the per-task expectations below come from this plan's own test blocks; if execution merges or splits an `it`, the RUN OUTPUT is the truth — update the count quoted here and Task 7's docs text to the actual before committing.
- **The api integration suites run against the local compose test DB** (`apps/api/test/global-setup.ts` defaults `TEST_DATABASE_URL` to `postgres://postgres:postgres@localhost:5432/sevendays_test` when the var is unset — compose default locally, CI sets it at job level; verified live 2026-09-29, var unset in the dev shell, compose db up on :5432). This is NOT the live Supabase. `truncateAll` wipes and the fixtures reload per test: deactivate nothing outside a test's own scope — every test in this plan creates its own rows or flips fixture rows the next `beforeEach` reload erases.
- **`media-live.test.ts` edits are verified by SKIP-state + gates only** (the #136 T6 precedent): with no `LIVE_MEDIA_VERIFY=1` in env, the file's 3 tests stay skipped; the gates are `pnpm --filter @sevendays/api typecheck` + `lint` + the suite summary still showing `1 skipped` file / `+3` skipped tests. Never arm the live gate from this ticket (bucket creds are controller/owner-only per the runbook).
- **No new dependencies.** No new files outside `test/` (and `packages/types/src/media.test.ts`, which already exists — every file in this plan is Modify).
- **Docs house rules:** checklist ticks in docs are `- [✅]`, never `[x]`; `docs/progress.md` is main-only (never picked); every PR squash-merged to main gets its v1 triage (runbook `docs/agents/v1-picks.md`, main-only).
- **Never commit secrets.** No `.dev.vars` reads, no bucket creds, no tokens in committed files.
- **Plan file target:** `docs/superpowers/plans/2026-09-29-154-api-suite-debt.md` (this file).

---

### Task 1: Media suite gaps — staging-key reject, no-contentType commit branch, thumb fallback + gate order

**Files:**
- Modify: `packages/types/src/media.test.ts` (one reject assert + title amend)
- Modify: `apps/api/src/services/media.test.ts` (stub widening + one commit test)
- Modify: `apps/api/test/media-routes.test.ts` (stub parameterization + three thumb tests)

**Interfaces:**
- Consumes: `mediaStagingKeySchema` (`packages/types/src/media.ts:33-35` — the anchored `tmp/<lowercase-hex-uuid>.jpg` regex); `commitUpload`'s caps branch (`apps/api/src/services/media.ts:129-144`); `servePhotoThumbnail`'s >20MiB passthrough (`media.ts:187-191`); the admin root's 401-before-validation ordering (proven pattern: `media-routes.test.ts:104-116`).
- Produces: no new exports. The two widened stubs (`stubBucket` seed `contentType?: string`; `stubMediaBucket` option `contentType?: string | null`) are Task-1-local — no other task consumes them.

- [ ] **Step 0: Cut the branch and re-pin the baseline**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only
git log --oneline -1   # expect fbc85ed or later
git checkout -b feat/154-api-suite-debt
pnpm install && pnpm build:packages
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
```

Expected: `23 passed | 1 skipped (24)` files / `278 passed | 3 skipped (281)` tests. If the floor moved, record the new floor in the PR body (Task 7) and re-derive every later expected count from it.

- [ ] **Step 1: The lowercase non-jpeg extension reject (packages/types)**

In `packages/types/src/media.test.ts`, inside `describe('mediaStagingKeySchema')`, amend the existing reject test's title and add one assert. The test becomes (title line changed; the new assert slots after the `.JPG` case):

```ts
  it('rejects final keys, traversal, uppercase uuids, and non-jpeg extensions (foreign-key commit gate)', () => {
    expect(
      mediaStagingKeySchema.safeParse('covers/00000000-0000-4000-8000-000000000000.jpg').success
    ).toBe(false);
    expect(
      mediaStagingKeySchema.safeParse('gallery/00000000-0000-4000-8000-000000000000.jpg').success
    ).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/../../covers/victim.jpg').success).toBe(false);
    expect(
      mediaStagingKeySchema.safeParse('tmp/00000000-0000-4000-8000-000000000000.JPG').success
    ).toBe(false);
    // #154 (the #136 T3 one-liner): a lowercase NON-JPEG extension is its own
    // reject case — the regex pins the extension, not just letter case.
    expect(
      mediaStagingKeySchema.safeParse('tmp/00000000-0000-4000-8000-000000000000.txt').success
    ).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/short.jpg').success).toBe(false);
  });
```

Run: `pnpm --filter @sevendays/types test 2>&1 | grep -E "Test Files|Tests "` — expect **13 files / 112 tests** unchanged (an assert was added inside an existing test, not a new `it`).

- [ ] **Step 2: Widen the commit-stub seed type, then pin the no-contentType branch (service unit suite)**

In `apps/api/src/services/media.test.ts`, change the `stubBucket` signature line — `contentType` becomes optional; the body stays byte-identical (an absent seed then yields `httpMetadata: { contentType: undefined }`, which is exactly an object stored without content-type metadata):

```ts
function stubBucket(initial: Record<string, { size: number; contentType?: string }> = {}) {
```

Then append inside `describe('commitUpload')`, after the `'deletes a wrong-content-type object…'` test:

```ts
  it('an object stored with NO contentType fails the caps check as (none) and is deleted', async () => {
    // The ?? "" fallback branch (#136 T4 minor): R2 hands head() an
    // httpMetadata object whose contentType is undefined when the PUT
    // carried none — the violation message must name (none), not crash.
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024 } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'gallery-photo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cap_violation');
    expect(result.details).toEqual([
      { path: ['contentType'], message: 'stored content type (none) is not allowed' },
    ]);
    expect(stub.deleteCalls).toEqual([STAGING_KEY]);
    expect(stub.putCalls).toEqual([]);
  });
```

- [ ] **Step 3: Parameterize the thumb stub; pin flow-through, octet-stream, and the gate-order 401 (route suite)**

In `apps/api/test/media-routes.test.ts`, replace `stubMediaBucket` wholesale (the default keeps both existing call sites byte-compatible — `undefined` still means `image/jpeg`):

```ts
// Stub R2 bucket for the thumb legs: get returns metadata + a one-chunk body
// (the service reads .size and streams .body — exactly what R2ObjectBody gives).
// contentType: undefined keeps the historical 'image/jpeg' default for the
// existing tests; a distinct string proves flow-through; null models an
// object stored with NO contentType (the service's ?? octet-stream branch).
function stubMediaBucket(options: { size: number; body?: string; contentType?: string | null }) {
  const contentType = options.contentType === undefined ? 'image/jpeg' : options.contentType;
  return {
    async get(key: string) {
      return {
        key,
        size: options.size,
        httpMetadata: { contentType: contentType ?? undefined },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(options.body ?? 'ORIGINAL-JPEG-BYTES'));
            controller.close();
          },
        }),
      };
    },
  } as unknown as R2Bucket;
}
```

Then append three tests inside `describe('GET /api/v1/admin/gallery-photos/:id/thumb')`, after the existing over-20MB fallback test:

```ts
  it('the over-20 MB fallback serves the STORED content type — a marker value proves flow-through, not a constant', async () => {
    // #136 T5 minor: the stub's hardcoded image/jpeg made the existing
    // fallback assert indistinguishable from a hardcoded constant; a stored
    // marker type must arrive in the response headers verbatim.
    const { token } = await signUpSession(url, 'thumb-stored-type@sevendays.test');
    const row = await insertPhoto('gallery/00000000-0000-4000-8000-000000000001.jpg');
    const bucket = stubMediaBucket({
      size: 20 * 1024 * 1024 + 1,
      body: 'MARKER-ORIGINAL',
      contentType: 'image/x-stored-marker',
    });
    const images = stubImages();
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: bucket, IMAGES: images.binding })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/x-stored-marker');
    expect(await res.text()).toBe('MARKER-ORIGINAL');
    expect(images.calls).toEqual([]);
  });

  it('the over-20 MB fallback answers application/octet-stream when the object carries NO content type', async () => {
    const { token } = await signUpSession(url, 'thumb-octet@sevendays.test');
    const row = await insertPhoto('gallery/00000000-0000-4000-8000-000000000002.jpg');
    const bucket = stubMediaBucket({
      size: 20 * 1024 * 1024 + 1,
      body: 'NO-TYPE-ORIGINAL',
      contentType: null,
    });
    const images = stubImages();
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: bucket, IMAGES: images.binding })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(await res.text()).toBe('NO-TYPE-ORIGINAL');
    expect(images.calls).toEqual([]);
  });

  it('answers 401 — never the param 400 — for an anonymous caller with a NON-UUID id (gate-before-param proof)', async () => {
    // #136 T5 minor: the existing anonymous-401 test sends a valid uuid, so
    // the param validator's position was proven only structurally. A
    // non-uuid id would fail validatedParam IF it ran — a 401 here proves
    // the session gate short-circuits first (the presign mirror's ordering).
    const res = await app.request(
      '/api/v1/admin/gallery-photos/not-a-uuid/thumb',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
```

- [ ] **Step 4: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/types test 2>&1 | grep -E "Test Files|Tests "      # 13 / 112
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "        # 24 files / 282+3
pnpm --filter @sevendays/types typecheck && pnpm --filter @sevendays/api typecheck
pnpm --filter @sevendays/types lint && pnpm --filter @sevendays/api lint
git add packages/types/src/media.test.ts apps/api/src/services/media.test.ts apps/api/test/media-routes.test.ts
git commit -m "test(api,types): media suite gaps — staging-key reject, no-contentType commit branch, thumb fallback + gate order (#154)"
```

**Not here:** no `apps/api/test/helpers/r2-stub.ts` change (its `contentType: string` stays — no route-level test needs an absent type); no edits to `media.ts`; no media-live changes (Task 6).

---

### Task 2: Admin entity suites — PUT clash branches, deactivation-blind matrices, GET round-trips

**Files:**
- Modify: `apps/api/test/admin-entities.test.ts` (two clash tests + one round-trip assert)
- Modify: `apps/api/test/admin-studio-services.test.ts` (two deactivation-blind matrix tests + one round-trip assert)

**Interfaces:**
- Consumes: the fixture ids (`ids.attireToga`/`attireFilipiniana`, `ids.addonMakeup`, `ids.addonRetired` — 'Retired Add-on' is the deactivated add-on fixture, `ids.serviceStudio`, `ids.servicePortrait`); the `conflict` 400 vocabulary (`{ error: 'That value is already in use.', details: [{ path: ['name'], message: 'already in use' }] }`); the deactivation-blind matrix ruling (`admin-entities.ts:356-363`).
- Produces: nothing consumed later — this task only extends two suites.

- [ ] **Step 1: The two PUT pre-check clash tests (admin-entities.test.ts)**

In `describe('attires admin CRUD')`, append after the `'PUT flips isActive → 200'` test — the branch-family mirror of the branches PUT-clash test at `:157`:

```ts
  it('PUT name taken by another row → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-attires-putdup@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/attires/${ids.attireToga}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Filipiniana', isActive: true }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });
```

In `describe('add-on services admin CRUD')`, append the same shape for add-ons (target `ids.addonMakeup`, name taken by `addonHairstyle`'s fixture name):

```ts
  it('PUT name taken by another row → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-addons-putdup@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Hairstyle',
          description: 'On-site makeup service',
          priceCents: 12000,
          isActive: true,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });
```

- [ ] **Step 2: The add-on PUT round-trip assert (admin-GET-still-shows)**

Still in `describe('add-on services admin CRUD')`, extend the existing `'PUT flips isActive → 200'` test — append these lines at its end (after the `isActive` assert; the token from the test's own `signUpSession` is still valid — no truncate has run):

```ts
    // The round-trip (#137 T9): the admin GET still shows the deactivated
    // row — the public read trims, the admin read never does.
    const after = await app.request(
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(after.status).toBe(200);
    expect(((await after.json()) as { isActive: boolean }).isActive).toBe(false);
```

- [ ] **Step 3: The two deactivation-blind matrix tests (admin-studio-services.test.ts)**

The file's first line is `import { branchStudioServices, studioServiceAddonServices } from '@sevendays/db';` — change it to:

```ts
import { branchStudioServices, branches, studioServiceAddonServices } from '@sevendays/db';
```

In `describe('the branch matrix (PUT /:id/branches — full-replace, one transaction)'), append after the empty-payload test:

```ts
  it('a DEACTIVATED branch id still links — the existence check is deactivation-blind by ruling', async () => {
    // #137 T4 minor: the admin composes from admin reads (deactivated rows
    // included); activity filtering is read-side, never write-side.
    const [ghost] = await db
      .insert(branches)
      .values({
        name: 'Ghost Branch',
        address: 'Nowhere St',
        phone: '+63 900 000 009',
        isActive: false,
      })
      .returning({ id: branches.id });
    if (!ghost) throw new Error('ghost branch insert returned no row');
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-ghost@sevendays.test',
      { branchIds: [ghost.id] }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { bookableBranchIds: string[] }).bookableBranchIds).toEqual([
      ghost.id,
    ]);
  });
```

In `describe('the add-on matrix (PUT /:id/addons — full-replace, one transaction)')`, append after its unknown-id test (the fixture set already carries the deactivated add-on — no insert needed):

```ts
  it('a DEACTIVATED add-on id still links (deactivation-blind, same ruling)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/addons`,
      'admin-matrix-addon-retired@sevendays.test',
      { addonServiceIds: [ids.addonRetired] }
    );
    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as { applicableAddonServiceIds: string[] }).applicableAddonServiceIds
    ).toEqual([ids.addonRetired]);
  });
```

- [ ] **Step 4: The studio-service PUT round-trip assert**

In `describe('studio services admin CRUD')`, extend the existing `'PUT flips isActive → 200'` test (the one targeting `ids.serviceStudio`) — append at its end:

```ts
    // The round-trip (#137 T9): the assembled admin GET still shows the
    // deactivated service — links embedded, isActive false. authed() mints
    // a FRESH signUpSession per call — the email MUST be unique within the
    // file (re-signing-up the test's own email 422s USER_ALREADY_EXISTS;
    // execution defect, landed as admin-services-put-after@…).
    const after = await authed(
      'GET',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'admin-services-put-after@sevendays.test'
    );
    expect(after.status).toBe(200);
    expect(((await after.json()) as { isActive: boolean }).isActive).toBe(false);
```

- [ ] **Step 5: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "        # 24 files / 286+3
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api lint
git add apps/api/test/admin-entities.test.ts apps/api/test/admin-studio-services.test.ts
git commit -m "test(api): admin entity suites — PUT clash branches, deactivation-blind matrices, GET round-trips (#154)"
```

**Not here:** no branches/print-sizes clash tests (branches already has one; print-sizes was #137 T2's minor, covered by the family pattern and outside #154's list — the ticket names attires/add-ons only); no gallery-photo or package matrix work (Task 3); no changes to `admin-entities.ts`.

---

### Task 3: Package cover legs — absent-unchanged at a non-null pre-state, missing-staging full pin

**Files:**
- Modify: `apps/api/test/admin-packages.test.ts` (one new test + one test reworked in place)

**Interfaces:**
- Consumes: the file's existing `withBucket()` / `putCover(email, cover, env)` helpers (`:426-468`); `resolveCover`'s contract (`admin-packages.ts:146-170`): absent → `finalKey: undefined` → the stored cover survives; missing staging → the typed conflict 400 with the not-found message re-pathed onto `coverImageKey`.
- Produces: nothing consumed later.

- [ ] **Step 1: Absent-unchanged at a NON-NULL pre-state**

Append inside `describe('the package cover lifecycle (commit-verified through ticket 02)')`, directly after the existing `'PUT without the field leaves the cover unchanged (absent = unchanged)'` test (that test pins the NULL pre-state; this one binds first):

```ts
  it('PUT without the field leaves a BOUND cover unchanged (absent = unchanged at a non-null pre-state)', async () => {
    // #137 T6 minor: absent-unchanged was pinned only at the null pre-state.
    // Bind a real cover first, then PUT the package with the field absent:
    // the stored final key survives — no re-promote, no delete of the bound
    // object (presence-encoding makes "changed" structural).
    const { stub, env } = withBucket();
    const bound = await putCover('admin-cover-absent2-a@sevendays.test', STAGING, env);
    expect(bound.status).toBe(200);
    const boundUrl = ((await bound.json()) as { coverImageUrl: string }).coverImageUrl;
    expect(boundUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/covers\//);
    const res = await putCover('admin-cover-absent2-b@sevendays.test', 'ABSENT', env);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { coverImageUrl: string | null }).coverImageUrl).toBe(boundUrl);
    expect(stub.putCalls).toHaveLength(1); // only the initial bind — no second promote
    expect(stub.deleteCalls).toEqual([STAGING]); // staging cleanup only — the bound object survives
  });
```

- [ ] **Step 2: The missing-staging 400, fully pinned**

Replace the existing `'PUT with a staging key that has no object → the commit not-found 400'` test (`:515-523`) wholesale:

```ts
  it('PUT with a staging key that has no object → the 400 not-found shape (typed conflict, nothing deleted)', async () => {
    // #137 T6 minor: the old test asserted only status===400 — the typed
    // not_found vocabulary (commitUpload's message, the coverImageKey
    // re-path) and the no-delete proof were unpinned. This is the ACTUAL
    // documented status: not_found maps through the conflict arm → 400,
    // never a 404.
    const empty = stubCommitBucket();
    const res = await putCover(
      'admin-cover-missing@sevendays.test',
      'tmp/11111111-0000-4000-8000-000000000001.jpg',
      { ...testEnv(url), MEDIA_BUCKET: empty.bucket }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe(
      'Upload not found — the PUT may have failed, expired, or been already committed.'
    );
    expect(body.details).toEqual([
      { path: ['coverImageKey'], message: 'no object at the staging key' },
    ]);
    expect(empty.deleteCalls).toEqual([]);
  });
```

- [ ] **Step 3: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "        # 24 files / 287+3
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api lint
git add apps/api/test/admin-packages.test.ts
git commit -m "test(api): package cover legs — absent-unchanged at non-null pre-state, missing-staging pin (#154)"
```

**Not here:** no changes to `admin-packages.ts` (if either test fails against the pinned contract, STOP and report on #154 — that is the ticket's broken-behavior rule firing); no gallery-photo commit legs (the symmetric photo-create path is covered by #137's suites; the ticket pins only the ledgered cover gaps).

---

### Task 4: The order-guard duplicate arm + the AR3/AR7 public-read fixture cases

**Files:**
- Modify: `apps/api/test/admin-gallery.test.ts` (one order test + one import)
- Modify: `apps/api/test/public-reads.test.ts` (two public-read tests)

**Interfaces:**
- Consumes: `checkCompleteOrder`'s duplicate arm (`admin-gallery.ts:50` — `details.push({ path: [field], message: `duplicate id ${id}` })`); the gallery fixtures (`ids.testimonialA/B/Retired`, `gallery.categoryA/B`, `gallery.photoA/photoB`); the public read's AR3 ruling (`services/gallery.ts` JSDoc + the #138 plan's Global Constraints) and AR7 (`gallery.ts`/`testimonials.ts` answer empty with 200).
- Produces: nothing consumed later.

- [ ] **Step 1: The duplicate-id arm (admin-gallery.test.ts)**

The file's first line is `import { galleryCategories, galleryPhotos } from '@sevendays/db';` — change it to import `testimonials` too (the new test reads positions back):

```ts
import { galleryCategories, galleryPhotos, testimonials } from '@sevendays/db';
```

In `describe('testimonials admin CRUD')`, append after the `'PUT /order with an unknown id → 400 and positions untouched'` test:

```ts
  it('PUT /order with a DUPLICATE id → 400 naming the duplicate, positions untouched', async () => {
    // #137 T7 minor: the third arm of checkCompleteOrder. A payload listing
    // every row exactly once EXCEPT one row twice answers exactly one
    // duplicate detail — and the write never runs.
    const res = await authed(
      'PUT',
      '/api/v1/admin/testimonials/order',
      'admin-testi-orderdup@sevendays.test',
      {
        testimonialIds: [
          ids.testimonialA,
          ids.testimonialA,
          ids.testimonialB,
          ids.testimonialRetired,
        ],
      }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('The order payload must list every row exactly once.');
    expect(body.details).toEqual([
      { path: ['testimonialIds'], message: `duplicate id ${ids.testimonialA}` },
    ]);
    const rows = await db
      .select({ position: testimonials.position })
      .from(testimonials)
      .where(eq(testimonials.id, ids.testimonialB));
    expect(rows[0]?.position).toBe(2); // the fixture position — untouched
  });
```

- [ ] **Step 2: The AR3 fixture case (public-reads.test.ts)**

In `describe('GET /api/v1/gallery (the assembled public read, #138)')`, append after the positions-order test (before the empty-table test):

```ts
  it('an ACTIVE photo under a DEACTIVATED category stays public (AR3 — category deactivation is not a photo filter)', async () => {
    // #138 T4 minor: AR3 was asserted only structurally (the query filters
    // on photo activity + categorized-ness, nothing else). This is the real
    // fixture case: retire the TAB, the photo under it stays in the payload.
    await db
      .update(galleryCategories)
      .set({ isActive: false })
      .where(eq(galleryCategories.id, gallery.categoryA));
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: { id: string }[];
      photos: { id: string }[];
    };
    expect(body.categories.map((c) => c.id)).toEqual([gallery.categoryB]);
    expect(body.photos.map((p) => p.id)).toEqual([gallery.photoA, gallery.photoB]);
  });
```

- [ ] **Step 3: The AR7 testimonial half (public-reads.test.ts)**

In `describe('GET /api/v1/testimonials (the public read, #138)')`, append at the end:

```ts
  it('the CMS-born-empty table answers [] with 200 (AR7 testimonial half)', async () => {
    // #138 T4 minor: the gallery half is pinned above; the assembled
    // testimonials read answers the same empty-200 contract.
    await truncateAll(db);
    const res = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
```

- [ ] **Step 4: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "        # 24 files / 290+3
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api lint
git add apps/api/test/admin-gallery.test.ts apps/api/test/public-reads.test.ts
git commit -m "test(api): order-guard duplicate arm + the AR3/AR7 public-read fixture cases (#154)"
```

**Not here:** no category/photo order-PUT duplicate tests (the guard is shared — one arm pinned once is the ledgered ask); no public-reads service changes.

---

### Task 5: api-client loopback tests for the gallery + testimonials wrappers

**Files:**
- Modify: `packages/api-client/test/mock-api.ts` (two fixture blocks + two routers + two broken variants)
- Modify: `packages/api-client/test/loopback.test.ts` (four tests)

**Interfaces:**
- Consumes: `galleryRoutes`/`testimonialsRoutes` wrappers (`src/routes/gallery.ts` / `src/routes/testimonials.ts` — `client.gallery.list(): Promise<GalleryRead>`, `client.testimonials.list(): Promise<PublicTestimonial[]>`); the mock's `makeApi({ brokenBranches })` parameter precedent; the `unwrap` gate's 404 contract (`ApiClientError` with `status: 404`, `details` = the whole body object).
- Produces: `mockApiBrokenGallery` / `mockApiBrokenTestimonials` — new named exports on `test/mock-api.ts` used only by this task's tests.

- [ ] **Step 1: The mock grows the two route groups (mock-api.ts)**

Add two fixture blocks after `TESTIMONIALS`-position (i.e., after the `APPOINTMENTS` block, before the `validatedJson` helper — fixture uuids carry valid v4 version/variant bits, the file's stated rule):

```ts
// #138's public reads (#154 loopback coverage): the assembled gallery and
// the testimonials projection, shaped to the public schemas.
const GALLERY = {
  categories: [
    { id: 'a0000000-0000-4000-8000-000000000000', name: 'Weddings' },
    { id: 'a0000000-0000-4000-8000-000000000001', name: 'Graduation' },
  ],
  photos: [
    {
      id: 'a0000000-0000-4000-8000-000000000002',
      photoUrl: 'https://pub-test.r2.dev/gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg',
      title: null,
      categoryId: 'a0000000-0000-4000-8000-000000000000',
    },
  ],
};

const TESTIMONIALS = [
  {
    id: 'a0000000-0000-4000-8000-000000000003',
    quote: 'The photos came out better than we hoped.',
    person: 'Maria, batch 2026',
  },
];
```

Change `makeApi`'s signature and add the two routers (the broken variants answer the mock's uniform not-found envelope — the same `{ error: 'Not found.' }` its top-level `notFound` handler emits, mirroring the `brokenBranches` parameter precedent):

```ts
const makeApi = ({
  brokenBranches = false,
  brokenGallery = false,
  brokenTestimonials = false,
}: {
  brokenBranches?: boolean;
  brokenGallery?: boolean;
  brokenTestimonials?: boolean;
} = {}) => {
```

Inside `makeApi`, after the `addonServices` router:

```ts
  const gallery = new Hono<MockEnv>().get('/', (c) =>
    brokenGallery ? c.json({ error: 'Not found.' }, 404) : c.json(GALLERY)
  );

  const testimonials = new Hono<MockEnv>().get('/', (c) =>
    brokenTestimonials ? c.json({ error: 'Not found.' }, 404) : c.json(TESTIMONIALS)
  );
```

And mount both in the `v1` chain (append after `.route('/addon-services', addonServices)`):

```ts
    .route('/gallery', gallery)
    .route('/testimonials', testimonials)
```

At the file's tail, add the two variants beside the existing exports:

```ts
export const mockApiBrokenBranches = makeApi({ brokenBranches: true });
export const mockApiBrokenGallery = makeApi({ brokenGallery: true });
export const mockApiBrokenTestimonials = makeApi({ brokenTestimonials: true });
```

- [ ] **Step 2: The four loopback tests (loopback.test.ts)**

Extend the import from `./mock-api.js` to `import { mockApi, mockApiBrokenBranches, mockApiBrokenGallery, mockApiBrokenTestimonials } from './mock-api.js';` (type-only `MockApi` import unchanged), then append at the file's end:

```ts
it('gallery.list parses the assembled read into typed data', async () => {
  const client = clientFor(mockApi);
  const read = await client.gallery.list();
  expect(read.categories).toHaveLength(2);
  expect(read.categories[0]?.name).toBe('Weddings');
  expect(read.photos).toHaveLength(1);
  expect(read.photos[0]?.photoUrl).toBe(
    'https://pub-test.r2.dev/gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg'
  );
  expect(read.photos[0]?.categoryId).toBe(read.categories[0]?.id);
});

it('gallery.list surfaces the uniform 404 envelope as ApiClientError', async () => {
  const client = clientFor(mockApiBrokenGallery);
  const err = await client.gallery.list().catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Not found.' });
});

it('testimonials.list parses the public projection into typed data', async () => {
  const client = clientFor(mockApi);
  const rows = await client.testimonials.list();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.quote).toBe('The photos came out better than we hoped.');
  expect(rows[0]?.person).toBe('Maria, batch 2026');
});

it('testimonials.list surfaces the uniform 404 envelope as ApiClientError', async () => {
  const client = clientFor(mockApiBrokenTestimonials);
  const err = await client.testimonials.list().catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Not found.' });
});
```

- [ ] **Step 3: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/api-client test 2>&1 | grep -E "Test Files|Tests "   # 5 files / 33 tests
pnpm --filter @sevendays/api-client typecheck && pnpm --filter @sevendays/api-client lint
git add packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts
git commit -m "test(api-client): gallery + testimonials wrapper loopback tests (#154)"
```

**Not here:** no wrapper changes (`src/routes/gallery.ts`/`testimonials.ts` are already correct — the loopback suite pins them); no landing/admin consumption tests (their suites own that); the mock's gallery 404 arm is a harness variant, not a claim that the real route 404s (AR7: it answers 200 empty — the uniform-envelope gate is what the wrapper test exercises).

---

### Task 6: Suite hygiene — determinism comment, hoisted resend mock, live-harness try/finally + HEAD observability

**Files:**
- Modify: `apps/api/test/service-packages.test.ts` (one comment block replaced)
- Modify: `apps/api/test/branches.test.ts` (mock hoisting + beforeEach reset)
- Modify: `apps/api/test/media-live.test.ts` (the two #136 T6 nits — leg-1 try/finally, HEAD-adapter reason log)

**Interfaces:**
- Consumes: the appointments.test.ts mock precedent (`vi.hoisted` + `sendMock.mockReset(); sendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });`); `liveBucket()`'s HEAD adapter and leg-1's cleanup tail (`media-live.test.ts:49-51`, `:116-126`).
- Produces: nothing consumed later. The HEAD adapter keeps its `null` contract (the log is additive); leg-1's object cleanup becomes throw-safe.

- [ ] **Step 1: The determinism overclaim (service-packages.test.ts)**

In the `'inclusions order by (position, id), not by id'` test, replace the comment block verbatim (the current two lines claim "Insertion id order reads framed → 2R → 2x2" — minted uuids are unordered, so id order is not a claim this test can make; insert-time POSITIONS are):

```ts
    // Insert-time positions read framed → 2R → 2x2 (positions are distinct,
    // so the id tiebreak never runs — minted uuids carry no order); the
    // swapped positions must win.
```

- [ ] **Step 2: The resend mock hygiene (branches.test.ts)**

Replace the module-level mock declaration (lines 16-25) with the appointments precedent — hoisted, same constructor-shaped impl:

```ts
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('resend', () => ({
  // `new Resend(...)` at the call site — vitest 4 rejects `new` on a vi.fn
  // whose implementation is an arrow; the named `function` impl returning
  // the mock instance is the constructor-shaped equivalent. (Named, so the
  // style fixer doesn't rewrite it back to an arrow.)
  Resend: vi.fn(function Resend() {
    return { emails: { send: sendMock } };
  }),
}));
```

Then make the existing `beforeEach` the appointments form (truncate + fixtures stay; the two mock lines are the addition):

```ts
beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });
});
```

This kills the baseline run's swallowed-TypeError noise (`[api] confirmation email … Cannot read properties of undefined (reading 'error')`) — after this task, the api suite's output carries no such lines. The `vi` import is already present in the file's vitest import (`beforeEach, describe, expect, it, vi` — if `vi` is missing from the import list, add it).

- [ ] **Step 3: The HEAD adapter's reason log (media-live.test.ts)**

In `liveBucket()`, replace the `head` closure's guard verbatim (the null contract is unchanged — the operator just gains the status):

```ts
  const head = async (key: string) => {
    const res = await client.fetch(`${base}/${key}`, { method: 'HEAD' });
    if (!res.ok) {
      // Reason-observable null (#154, the #136 T6 nit): callers still see
      // null, the operator sees WHICH status ate it — a 404 (missing
      // object) and a 403 (credentials) demand different runbook pages.
      console.warn(`[media-live] HEAD ${key} → non-ok ${res.status} ${res.statusText}`);
      return null;
    }
```

- [ ] **Step 4: The leg-1 throw-safe cleanup (media-live.test.ts)**

In the first live test (`'presign → PUT (minted Content-Type) → commitUpload HEAD-verifies, promotes, deletes staging'`), replace the tail after the `finalKey` match — from `const finalObj = await bucket.head(result.finalKey);` through the last line — verbatim:

```ts
    // cleanup: the harness owns its object — never leave test rows in the
    // shared bucket. finally-wrapped (#154, the #136 T6 nit): an expect
    // failure between promote and delete used to skip the delete and litter
    // gallery/ — no lifecycle rule cleans it.
    try {
      const finalObj = await bucket.head(result.finalKey);
      expect(finalObj).not.toBeNull();
      expect(finalObj?.httpMetadata?.cacheControl).toContain('immutable');
      expect(await bucket.head(key)).toBeNull();
    } finally {
      await bucket.delete(result.finalKey);
    }
    expect(await bucket.head(result.finalKey)).toBeNull();
```

- [ ] **Step 5: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "        # 24 files / 290+3 — and NO 'Cannot read properties of undefined' lines
pnpm --filter @sevendays/api test -- media-live 2>&1 | grep -E "skipped|Test Files"   # the live file stays skipped (3 tests)
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api lint
git add apps/api/test/service-packages.test.ts apps/api/test/branches.test.ts apps/api/test/media-live.test.ts
git commit -m "test(api): suite hygiene — determinism comment, hoisted resend mock, live-harness try/finally + HEAD observability (#154)"
```

**Not here:** never arm the live gate from this ticket (`LIVE_MEDIA_VERIFY=1` + real creds are controller/owner-only — `docs/media-bucket-runbook.md`); no `apps/api/test/helpers/r2-stub.ts` or `helpers/env.ts` changes; the final-prefix litter check stays owner-run at next bucket touch (the ticket's explicit out-of-scope).

---

### Task 7: Close-out — full gates, docs rotation, PR, v1 pick

**Files:**
- Modify: `AGENTS.md` (§ "Current status of `pnpm test`" — the api/api-client counts)
- Modify: `docs/progress.md` (one dated line in the M5 record)
- Create: the PR (body carries the AC mapping + `Closes #154`)

**Interfaces:**
- Consumes: everything Tasks 1-6 landed.
- Produces: the merged PR, the v1-picks ledger row, the updated floors.

- [ ] **Step 1: Full gates**

```bash
cd /home/jeius/Projects/sevendays
pnpm check          # expect 35/35 tasks; api 290+3, api-client 33, types 112, landing 8/69, admin 5/51
pnpm build          # expect 7/7
```

If any count differs from the plan's expectation, the run output is the truth — carry the actual numbers into Steps 2-3 and the PR body (the Global Constraints' reconciliation rule).

- [ ] **Step 2: Docs rotation**

In `AGENTS.md` § "Current status of `pnpm test`", replace the section's first bullet (`- \`apps/api\` has real vitest tests.`) with (pin the ACTUAL run numbers from Step 1):

```markdown
- `apps/api` has real vitest tests. The M5-pinned suite debt is paid (#154): the media, admin-entity, cover, order-guard, and public-read branch gaps are pinned, the api-client loopback suite covers the gallery/testimonials wrappers (N tests), and the live media harness is try/finally-safe with reason-observable HEAD failures. Floors: api 23 files passed + 1 skipped (24) / 290 passed + 3 skipped; api-client 5 files / 33 tests.
```

In `docs/progress.md`, inside the M5 record (after the milestone-closed entry), add one dated line:

```markdown
- 2026-09-29: The M5 api-suite debt is paid (#154) — every branch gap the SDD reviews pinned (media staging-key/contentType/thumb, admin-entity clash + deactivation-blind matrices, cover absent-unchanged/missing-staging, the order-guard duplicate arm, AR3/AR7 fixture cases, gallery/testimonials wrapper loopbacks) now has a pinning test; floors api 290+3, api-client 33.
```

Commit: `git add AGENTS.md docs/progress.md && git commit -m "docs: #154 api-suite debt paid — floors rotated (#154)"`.

- [ ] **Step 3: PR with the AC mapping**

```bash
cd /home/jeius/Projects/sevendays
git push -u origin feat/154-api-suite-debt
gh pr create --title "test: API suite debt — M5-pinned test gaps + api hygiene nits (#154)" --body-file - <<'EOF'
Closes #154. Test-only: zero production-semantics changes (the two named nits land inside `apps/api/test/media-live.test.ts`, itself a CI-skipped test file).

## AC mapping
- [✅] lowercase-extension staging-key reject — Task 1 Step 1 (`packages/types/src/media.test.ts`)
- [✅] no-contentType fallback branches + >20MiB stub distinguishability — Task 1 Steps 2-3 (`services/media.test.ts`, `media-routes.test.ts`)
- [✅] thumb anonymous-401 beyond structure — Task 1 Step 3 (the non-uuid 401: gate-before-param proof)
- [✅] PUT pre-check clash branches (attires/add-ons) — Task 2 Step 1
- [✅] deactivated-ids-via-matrix-PUT — Task 2 Step 3 (both matrices)
- [✅] absent-unchanged at non-null pre-state — Task 3 Step 1
- [✅] missing-staging not_found vs 400 pinned — Task 3 Step 2 (400, typed conflict vocabulary, no deletes)
- [✅] duplicate-id arm of checkCompleteOrder — Task 4 Step 1
- [✅] admin-GET-still-shows round-trips — Task 2 Steps 2+4 (add-on + studio-service)
- [✅] gallery/testimonials wrapper loopbacks — Task 5 (typed parse + 404 envelope → ApiClientError, both)
- [✅] try/finally + HEAD observability — Task 6 Steps 3-4
- [✅] comment hygiene (determinism, mockReset/vi.hoisted, AR3 fixture + AR7 pin) — Tasks 4 + 6
- [✅] pnpm check green — Task 7 Step 1 (35/35)

Floors: api 290 passed + 3 skipped (24 files); api-client 33 (5 files); types 112 unchanged.

Out of scope per the ticket: bucket litter check (owner-run), query-error postures / bulk-bar wording / checkbox glyph (owner-decision issue), position race / upload cancellation / `.default(true)` fence (stay on #152), no UI work.
EOF
```

Watch CI; on green, owner squash-merges with the title's message.

- [ ] **Step 4: The v1 pick**

Per `docs/agents/v1-picks.md` (main-only runbook): after squash-merge, `node scripts/v1-triage.mjs <merge-sha>`, content-pass every v1-path hunk, and record the ledger row. Expectation to verify, not assume: most hunks test M5-only surfaces (CMS admin, gallery/testimonials reads, media seam) — whether the v1 seed carries those routes decides pick vs skip per hunk; the edition-free hygiene hunks (`branches.test.ts` mock hoisting, the `media.test.ts` reject line) are the likely v1-paths. Lock per the runbook (local check + build green, export audit exit 0) only for what survives the content pass.

**Not here:** no milestone/roadbox ticks in `docs/plan.md` (#154 is follow-up debt, not a roadmap checkbox); no ADR (no architectural decision — test-only); no issue-body edits beyond the close (the PR body is the AC record).
