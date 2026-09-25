# M5 Ticket 02 — Media Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The ADR-0019 media pipeline becomes executable code and provisioned infrastructure: the `sevendays-media` bucket exists with CORS for the exact admin origins, the `tmp/` expire-1-day lifecycle rule, and the r2.dev Public Development URL (controller-run one-time setup, recorded in a durable in-repo runbook with the owner handoff for the still-unminted S3 token); `apps/api` gains the `MEDIA_BUCKET` + `IMAGES` bindings, the aws4fetch dependency, the grown env schema, the **session-gated presign endpoint** (`POST /api/v1/admin/media/presign` — purpose + contentType → a server-assigned `tmp/<uuid>.jpg` staging key + a short-lived upload URL with Content-Type signed in), the **media service commit contract** (binding `head()` verify → caps → promote to the immutable final key `covers/`/`gallery/<uuid>.jpg` with `cacheControl: immutable` → delete staging → hand back the final key; miss or violation → delete the object and a typed 400 with field details), and the **gated by-id admin thumbnail route** (`GET /api/v1/admin/gallery-photos/:id/thumb` — width-capped webp over the Images binding, >20 MB input falls back to the original).

**Architecture:** Seven tasks: (1) controller-run bucket provisioning + the runbook doc `docs/media-bucket-runbook.md` (with the owner handoff section for the pending S3-token mint) verified read-only, (2) the deploy-side wiring — aws4fetch, `wrangler.toml` bindings, the env schema growth, `testEnv` stubs, `.dev.vars.example`, and the CI deploy-leg var/secret sync, (3) `packages/types` media vocabulary (presign request/response + the staging-key shape), (4) the media service — `presignUpload` + `commitUpload` with the full commit contract — TDD'd over binding-shaped stubs, (5) the admin sub-app mount (one `use('*', requireSession)` at its root — the seam #137 extends) + presign + thumb routes + HTTP integration tests, (6) the LIVE round-trip harness (runIf-gated vitest file that drives the real bucket the moment creds exist — explicitly not a CI gate), (7) full gates + docs rotation + PR/merge + the v1 pick + ledger row + issue close. Every route registration stays chained (ADR-0006 — a statement-style registration silently drops the route from AppType).

**Tech Stack:** hono `4.6.x` (existing), zod `4.5.1`, aws4fetch `1.0.20` (new — the only dependency this ticket adds), `@cloudflare/workers-types` `5.20260828.1` (installed; ambient `R2Bucket`/`ImagesBinding` globals), wrangler `4.127.1`, drizzle-orm `0.45.2` (thumb route's row lookup), vitest 4, pnpm + Turborepo, `gh` CLI, wrangler OAuth (controller) for the one-time bucket work.

**Spec:** Implements ticket [#136 "M5 ticket 02 — Media foundation"](https://github.com/jeius/sevendays/issues/136) (label `ready-for-agent`), whose parent is the M5 spec `docs/specs/2026-09-24-m5-admin-cms-spec.md` (issue #134 — § The media pipeline (ADR-0019), § Environments and setup, § Testing posture, § Route topology and authorization, § Open items riding the build). Topology authority: `docs/adr/0019-r2-media-topology.md` + the research runbook (`git show research/r2-media-pipeline:docs/research/2026-09-24-r2-media-pipeline.md`). Key recon facts (2026-09-26, main `322d5e3`, tree clean):

- **The binding is staged but COMMENTED OUT in `apps/api/wrangler.toml`** (`# TODO once provisioned: [[r2_buckets]] binding = "MEDIA_BUCKET" / bucket_name = "sevendays-media"`). No `[images]` block, no media vars, no media secrets exist anywhere yet (`wrangler secret list --name sevendays-api` = BETTER_AUTH_SECRET/DATABASE_URL/LANDING_ORIGIN/RESEND_API_KEY only; `apps/api/.dev.vars` same four). `worker-configuration.d.ts` is a one-line regeneration stub — **do NOT run `cf-typegen` in this ticket**; bindings type through the ambient `@cloudflare/workers-types` globals the tsconfig `types` array already loads (`R2Bucket.head(key): Promise<R2Object | null>`, `.get(key): Promise<R2ObjectBody | null>`, `.put(key, value, options?): Promise<R2Object>`, `.delete(keys): Promise<void>`, `R2Object.size/.httpMetadata?.contentType`; `ImagesBinding.input(stream): ImageTransformer` → `.transform(ImageTransform)` → `.output(ImageOutputOptions): Promise<ImageTransformationResult>` → `.response(): Response` — all verified in the installed `index.d.ts`).
- **wrangler 4.127.1's config schema rejects the research sketch's `[images.cache]` block** (probed `node_modules/wrangler/config-schema.json`: `images` = `{ binding, remote? }`, `additionalProperties: false`). The TOML lands as `[images]` + `binding = "IMAGES"` ONLY. The schema also warns images bindings are "not automatically inherited from the top level environment" — irrelevant here (no `[env.*]` blocks exist).
- **aws4fetch presigning needs `allHeaders: true` — the research sketch's `{ aws: { signQuery: true } }` does NOT sign Content-Type** (spiked live 2026-09-26 against aws4fetch 1.0.20, node 26: `content-type` sits in the lib's `UNSIGNABLE_HEADERS` set, so the default presign emits `X-Amz-SignedHeaders: host` and a swapped Content-Type PUT would SUCCEED — the ticket's core enforcement would silently not exist). With `{ aws: { signQuery: true, allHeaders: true } }` the same call emits `X-Amz-SignedHeaders: content-type;host`. Task 4's unit test pins this.
- **Where presign/thumb mount:** the spec pins `POST /admin/media/presign` and `GET /admin/gallery-photos/:id/thumb` under the new gated sub-app (`/api/v1/admin/*`, ONE `use('*', requireSession)` at its root, the M4 ordering precedent — `requireSession` composes per-route after `acquireDb` on v1 and returns the uniform 401 envelope `{ error: 'Authentication required.' }` before any validator runs, proven in `apps/api/test/require-session.test.ts`). #137 owns the admin entity routers; this ticket creates the gated root (`routes/admin.ts`) + the media routes and #137 extends the same sub-app — no moves, no re-mounts. `routes/gallery-photos.ts` is seeded with ONLY the thumb route this ticket (comment says #137 adds the entity CRUD).
- **The house failure contract for service-level client errors is the resolved union, not a throw:** `services/appointments.ts` (`CreateAppointmentResult = { ok: true; record } | { ok: false; reason; message }`, mapped by the route to `badRequest(c, result.message)`). `commitUpload` follows it (`{ ok: true; finalKey } | { ok: false; reason; message; details? }`, details as the validator's `{ path, message }[]`). Deploy-time misconfiguration (missing S3 token) throws the typed `MissingR2CredentialsError` → root onError → the uniform 500 + log — exactly the BETTER_AUTH_SECRET posture in `services/auth.ts` (whose env key is the one OPTIONAL schema key for the same reason).
- **Deploy mechanics make Task 1 a hard ordering gate:** `.github/workflows/ci.yml` auto-deploys `sevendays-api` on every push to main (`deploy-teaser`, `needs: check`) and `sevendays-v1-api` on pushes to v1. `wrangler deploy` validates R2 bindings against the live account (a missing bucket fails the deploy), and this ticket's env schema makes `CLOUDFLARE_ACCOUNT_ID`/`MEDIA_PUBLIC_BASE_URL` REQUIRED — so the bucket AND the GitHub environment (`teaser`, `v1`) vars must exist BEFORE the Task 7 merge lands. The S3-token pair stays OPTIONAL in the schema (teaser keeps serving while the owner's mint is pending) and its CI sync step is fail-soft (skip + notice when empty, unlike the hard-required DATABASE_URL guard).
- **Plain-var home (ruling 3, decided off repo evidence):** the repo never commits per-environment values — `LANDING_ORIGIN` is documented in `wrangler.toml` comments + `.dev.vars.example` + stored on Workers via `wrangler secret put` (it shows in `wrangler secret list`), and CI passes landing/admin plain vars as deploy-time `--var` flags from GitHub environment **variables** (`vars.API_URL`, `vars.BETTER_AUTH_URL`). Same home here: `CLOUDFLARE_ACCOUNT_ID` + `MEDIA_PUBLIC_BASE_URL` ride the api `wrangler deploy --var` legs from `vars.*`; dev values live in `.dev.vars` (documented keys only in the committed `.dev.vars.example`); the actual r2.dev URL is captured by `wrangler r2 bucket dev-url get sevendays-media` and NEVER committed.
- **CORS origins are pinned to the real subdomain:** `v1-picks.md` line 100 proves the deployed workers.dev subdomain is `pahamajulius.workers.dev` (`https://sevendays-v1-landing.pahamajulius.workers.dev`), and `apps/admin/package.json` runs dev on port 3000 (`vite dev --port 3000`) — so the admin-origin list is `http://localhost:3000`, `https://sevendays-admin.pahamajulius.workers.dev`, `https://sevendays-v1-admin.pahamajulius.workers.dev`.
- **Ticket 01 (#135, merged) already provides everything downstream:** `gallery_photos` (`r2Key` unique, nullable `categoryId`, `position` NOT NULL with NO default since 0007 — direct test inserts must supply `position`), `service_packages.coverImageKey`, and the `packages/types` write-model vocabulary (`createGalleryPhotoSchema.r2Key` etc. — the commit service is what makes those staging keys real). There is NO media/presign schema in `packages/types` yet — Task 3 adds it (`media.ts`), per the repo rule that shared shapes live there.
- **Sibling fences (spec § Tickets; `docs/plan.md` M5 block):** this ticket owns `docs/plan.md` M5 checkbox 1 exclusively and ticks it at close; checkboxes 3–9 (write model #137, public reads #138, screens #139–#141, landing #142, close-out #143) stay unticked. NOT here, regardless of temptation: any admin entity route or the `/api/v1/admin` entity routers (#137 — this ticket only seeds the gated root + the two media routes), the gallery/testimonials public reads (#138), any admin/landing UI (#139–#142), the `cms-reflection.mjs` harness and seed-contract work (#143), the four unplanned owner-copy strings and the two design-token decisions (#134's open items — not this ticket's), and any M6 domain work (var flip, r2.dev disable, same-account rotation).
- **Baselines (live, 2026-09-26, main `322d5e3`, compose db up):** `apps/api` = **14 test files / 122 tests passed** (the "close timed out after 10000ms / Tests closed successfully" vitest-4 exit noise is pre-existing — judge the Test Files/Tests lines only); `packages/types` = **12 files / 105 tests**; `pnpm check` = 35/35 turbo tasks (no scripts added this ticket — count unchanged). After this ticket: types = **13 files / 112 tests**; api = **17 files / 153 passed + 3 skipped** (the 3 skips are Task 6's runIf-gated LIVE harness, the `packages/db` gated-block precedent); check still 35/35. If any gate count differs, reconcile before proceeding — do not loosen assertions.
- **No clarify call (owner asleep):** owner-ratified literals come only from spec #134 + ADR-0019. Where the ticket leaves a genuinely open choice, this plan pins a spec-consistent default labeled **agent ruling (overnight, owner-review pending)** — the full list is in the plan-author's report, and the runbook/PR surfaces them for the owner's morning review.

## Global Constraints

- **Branch & baseline:** `feat/136-m5-02-media-foundation` off main `322d5e3` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#136)` squash style; every commit below is pinned verbatim. Evidence (spike output, wrangler verify output, the captured r2.dev command output) lands in gitignored `.superpowers/sdd/2026-09-26-136-m5-02/`.
- **Gates (repo AGENTS.md + controller rulings, verbatim duties):** after any manifest change run `pnpm install`. Before any work that typechecks `packages/api-client` or the apps, run `pnpm build:packages && pnpm --filter @sevendays/api build` (the client resolves `AppType` from the built `dist/`). Every task commits only with `pnpm check` green for the packages it touched (api tests need the compose db up: `docker compose up -d db` first). Biome canonical form via `pnpm --filter @sevendays/api fix` / `pnpm --filter @sevendays/types fix` (biome check --write) before committing — accept its rewrites. Never commit secrets; `.dev.vars` values are never read by workers under test or committed. Tick checklist boxes with `- [✅]`, never `[x]` (applies to this plan file and `docs/plan.md` alike). Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Live-infra ordering (binding):** Task 1's controller-run steps MUST be completed (bucket created, CORS/lifecycle/r2.dev set, GitHub environment `teaser` + `v1` vars in place) BEFORE Task 7's merge lands on main — `wrangler deploy` rejects the new `[[r2_buckets]]` binding if the bucket doesn't exist, and the REQUIRED env vars must be present at the same deploy or every `/api/v1` request 500s on the live teaser. The S3-token pair is the one deliberate exception (OPTIONAL env + fail-soft CI sync — the teaser serves fine without it).
- **Envelope + gating (controller ruling 4, binding):** the presign and thumb routes mount under `routes/admin.ts`'s single `use('*', requireSession)` — anonymous requests get the uniform 401 envelope `{ error: 'Authentication required.' }` BEFORE any body/param validation (the M4 ordering precedent; proven by test in Task 5 with an invalid body). Disallowed content type → 400 with field details (the `validatedJson` envelope). The status vocabulary stays {400, 401, 404, 500} — no 409, no 415 anywhere in this ticket.
- **Caps + commit contract (controller ruling 5, binding):** `image/jpeg` only; 50 MiB/file verified at commit via `head()` (`size` + `httpMetadata.contentType`) — size is NOT declarable at presign (spec-verbatim request shape `{ purpose, contentType }`; a presigned PUT cannot carry a size condition). Promote = binding `get` → `put` to the immutable final key (`covers/<uuid>.jpg` for `package-cover`, `gallery/<uuid>.jpg` for `gallery-photo`, `httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' }`) → delete the staging key. Miss or violation → delete the object + typed 400 with field details. **Security gate (agent ruling):** the commit accepts ONLY staging keys matching `^tmp\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$` — a foreign key returns the typed 400 WITHOUT calling `delete` (a client-supplied `covers/…` key must never be able to delete a promoted object through the commit path).
- **Presign mechanics (spike-pinned, binding):** expiry `X-Amz-Expires=900` (15 min, the research pin); signing is `client.sign(new Request(url, { method: 'PUT', headers: { 'content-type': input.contentType } }), { aws: { signQuery: true, allHeaders: true } })` — **`allHeaders: true` is load-bearing** (aws4fetch 1.0.20's `UNSIGNABLE_HEADERS` contains `content-type`; without it the URL emits `X-Amz-SignedHeaders: host` and type enforcement silently doesn't exist — spiked 2026-09-26). Endpoint host `https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com/sevendays-media/<key>`; bucket name is the `MEDIA_BUCKET_NAME` constant `'sevendays-media'` in `services/media.ts` (the binding carries no runtime bucket_name).
- **Thumbnail route (controller ruling 5, binding):** session-gated (the admin root), by-id; DB row lookup first (`Photo not found.` on miss), then `MEDIA_BUCKET.get(r2Key)` (`Photo not found.` if the object is gone), then `size > 20 MiB` → stream the original bytes with the stored content type, else `IMAGES.input(obj.body).transform({ width: 400 }).output({ format: 'image/webp' })` → `result.response()`. `THUMBNAIL_WIDTH_PX = 400` and `MAX_THUMBNAIL_INPUT_BYTES = 20 * 1024 * 1024` are the pinned constants (the research sketch's width; the binding's documented input limit). Deactivated photos serve (staff-only surface — admin reads include deactivated rows). No cache headers on thumb responses (agent ruling — the spec pins none; wrangler 4.127.1 has no `[images.cache]` to inherit; the owner can ratify a header policy at review).
- **Secrets posture (controller ruling 2, binding):** NO task may require live S3 credentials. The presign service reads `R2_S3_ACCESS_KEY_ID`/`R2_S3_SECRET_ACCESS_KEY` from env with the typed `MissingR2CredentialsError` when missing (never a silent fallback; caught by the root onError → uniform 500 + loud log). Integration tests use binding-shaped stubs and offline presign proofs (signing is local arithmetic — no network). The LIVE round-trip harness (Task 6) is runIf-gated on an explicit opt-in flag AND all three credential vars, so CI never touches the bucket. The owner handoff (dashboard steps + exact `wrangler secret put` / `gh secret set` commands) lives in the runbook doc's § Owner handoff — the owner closes the gap in minutes; the ticket closes with that section in place, not with the secrets set.
- **Version pins (probed 2026-09-26):** `aws4fetch` `1.0.20` (dist-tags.latest — add with `pnpm --filter @sevendays/api add aws4fetch@1.0.20`; the ONLY new dependency); `wrangler` resolves `4.127.1`; `@cloudflare/workers-types` resolves `5.20260828.1` (ambient `R2Bucket`/`ImagesBinding`/`ImageTransformer`/`ImageTransformationResult` confirmed in its `index.d.ts`); `zod` `4.5.1` (`z.custom` probed live: accepts an object, rejects null); node `v26.7.0`. Anything else resolves → STOP and report.
- **No cf-typegen (binding):** `worker-configuration.d.ts` stays the one-line stub. Bindings type through the ambient `@cloudflare/workers-types` globals already in the tsconfig `types` array; running `wrangler types` now would emit a second set of runtime globals next to the package's and invite duplicate-declaration drift.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; `pnpm --filter @sevendays/<pkg> fix` (biome check --write) then normalizes quoting/ordering/import order to house style — accept its rewrite, commit the result. The same applies to the runbook doc's fenced blocks (docs files are biome-format-exempt; keep the fenced content byte-exact regardless).
- **Scope fence (verbatim):** Tasks 1–6 edit only: `docs/media-bucket-runbook.md` (create), `.github/workflows/ci.yml`, `apps/api/wrangler.toml`, `apps/api/.dev.vars.example`, `apps/api/package.json` + `pnpm-lock.yaml` (aws4fetch via `pnpm add` only), `apps/api/src/env.ts`, `apps/api/src/env.test.ts`, `apps/api/test/helpers/env.ts`, `packages/types/src/media.ts` (create), `packages/types/src/media.test.ts` (create), `packages/types/src/index.ts`, `apps/api/src/services/media.ts` (create), `apps/api/src/services/media.test.ts` (create), `apps/api/src/routes/admin.ts` (create), `apps/api/src/routes/admin-media.ts` (create), `apps/api/src/routes/gallery-photos.ts` (create), `apps/api/src/routes/v1.ts`, `apps/api/test/media-routes.test.ts` (create), `apps/api/test/media-live.test.ts` (create). Task 7 rotates `docs/plan.md` (M5 checkbox 1), `docs/progress.md`, `AGENTS.md` (the "DB is provisioned" bullet — one appended sentence, pinned in Task 7), and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: any admin entity route or entity router file (#137 — `routes/gallery-photos.ts` carries ONLY the thumb route with a #137 pointer comment); the public gallery/testimonials reads or any read-shape change (#138 — `servicePackageSchema.coverImageKey` stays until #138's swap); any admin/landing UI (#139–#142); `cms-reflection.mjs`/seed-contract/docs-rotation beyond the pinned files (#143); owner-copy strings or token decisions; M6 domain work; the appointments/booking surface (audit-token discipline — new files stay free of booking-path strings so the v1 pick carries them).

## File Structure

```text
docs/
  media-bucket-runbook.md                  # create (Task 1) — bucket runbook + owner handoff + live-verify invocation
apps/api/
  wrangler.toml                            # modify (Task 2) — [[r2_buckets]] uncommented + [images] + comment blocks
  .dev.vars.example                        # modify (Task 2) — documented media keys (values stay empty)
  package.json / pnpm-lock.yaml            # modify (Task 2) — aws4fetch@1.0.20 via pnpm add
  src/
    env.ts                                 # modify (Task 2) — bindings + vars + optional S3 pair
    env.test.ts                            # modify (Task 2)
    services/
      media.ts                             # create (Task 4/5) — presignUpload + commitUpload + servePhotoThumbnail
      media.test.ts                        # create (Task 4) — presign proofs + commit contract over stub buckets
    routes/
      admin.ts                             # create (Task 5) — the gated sub-app root (use('*', requireSession))
      admin-media.ts                       # create (Task 5) — POST /presign
      gallery-photos.ts                    # create (Task 5) — GET /:id/thumb ONLY (#137 adds entity CRUD)
      v1.ts                                # modify (Task 5) — chained .route('/admin', admin)
  test/
    helpers/env.ts                         # modify (Task 2) — testEnv gains binding stubs + media vars
    media-routes.test.ts                   # create (Task 5) — HTTP behavior incl. 401-before-validation
    media-live.test.ts                     # create (Task 6) — runIf-gated live round-trip harness
packages/types/src/
  media.ts / media.test.ts                 # create (Task 3) — presign + staging-key vocabulary
  index.ts                                 # modify (Task 3)
```

---

### Task 1: Controller-run bucket provisioning + the in-repo runbook doc

**Files:**
- Create: `docs/media-bucket-runbook.md`
- External (controller-run, no repo files): the Cloudflare bucket + its CORS/lifecycle/r2.dev config; the GitHub environment variables on `teaser` and `v1`

**Interfaces:**
- Consumes: the controller's wrangler OAuth session (account `436cc3a02b117ee2a2970681c9ac531e`, proven able to list buckets 2026-09-26) and the pinned wrangler 4.127.1 subcommands (`r2 bucket create`, `r2 bucket cors set/list`, `r2 bucket lifecycle add/list`, `r2 bucket dev-url enable/get` — all probed live).
- Produces (what every later task + the ACs rely on): the `sevendays-media` bucket live with (a) the CORS rule for exactly the three admin origins (PUT + `content-type`, `ETag` exposed), (b) the `tmp/` expire-1-day lifecycle rule, (c) the r2.dev Public Development URL enabled; `CLOUDFLARE_ACCOUNT_ID` + `MEDIA_PUBLIC_BASE_URL` set as GitHub environment VARIABLES on both `teaser` and `v1` (consumed by Task 2's `--var` deploy legs); the runbook doc on disk carrying the full command record + the § Owner handoff section for the S3-token mint + the § Live round-trip verify section (the harness it names is authored in Task 6 — doc and code land in the same merge, so the doc is never wrong on main).

**Not here:** any repo code (Task 2 wires the bindings/env); the S3-token secrets themselves (owner-pending — the runbook's handoff section is the deliverable); the v1 wrangler.toml rename (the v1 branch re-applies this ticket's binding blocks at pick time, Task 7).

**CONTROLLER-RUN steps (one-time, before Task 7's merge; execute exactly, in order):**

- [ ] **Step C1: Create the bucket**

```bash
pnpm --filter @sevendays/api exec wrangler r2 bucket create sevendays-media
```

- [ ] **Step C2: Set the bucket CORS (exact admin origins — teaser, v1, localhost)**

Write the JSON below to `.superpowers/sdd/2026-09-26-136-m5-02-media-foundation/evidence/cors.json` (gitignored scratch), then set + verify. **Format correction (controller, 2026-09-26 — the research sketch's AWS-style `AllowedOrigins` keys are rejected by wrangler 4.127.1, which demands lowercase keys nested in `allowed`):** the working file is the `{"rules": [{ "allowed": …, "exposeHeaders": …, "maxAgeSeconds": … }]}` shape set and verified live. Rule fields map 1:1 to browser CORS: `headers` must include `content-type` (it is signed), `exposeHeaders` lets the browser read `ETag`. Origins are exact `scheme://host[:port]` — no paths, no trailing slash; the subdomain `pahamajulius.workers.dev` is pinned from `docs/agents/v1-picks.md` line 100's deployed-URL evidence, admin dev runs on port 3000 (`apps/admin/package.json`).

```json
{
  "rules": [
    {
      "allowed": {
        "origins": [
          "http://localhost:3000",
          "https://sevendays-admin.pahamajulius.workers.dev",
          "https://sevendays-v1-admin.pahamajulius.workers.dev"
        ],
        "methods": ["PUT"],
        "headers": ["content-type"]
      },
      "exposeHeaders": ["ETag"],
      "maxAgeSeconds": 3600
    }
  ]
}
```

```bash
pnpm --filter @sevendays/api exec wrangler r2 bucket cors set sevendays-media --file .superpowers/sdd/2026-09-26-136-m5-02/cors.json
pnpm --filter @sevendays/api exec wrangler r2 bucket cors list sevendays-media
```

Expected: the list prints exactly the rule above (propagation can take ~30s — re-run the list if the first readback lags).

- [ ] **Step C3: Set the `tmp/` lifecycle GC rule (expire after 1 day)**

```bash
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle add sevendays-media tmp-gc tmp/ --expire-days 1 -y
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle list sevendays-media
```

Expected: one rule named `tmp-gc`, prefix `tmp/`, expire after 1 day. Final-prefix objects (`covers/`, `gallery/`) never age out — the rule is prefix-scoped by construction.

- [ ] **Step C4: Enable the r2.dev Public Development URL and capture the base**

```bash
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url enable sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media
```

Record the printed `https://pub-<hash>.r2.dev` base — it is `MEDIA_PUBLIC_BASE_URL`'s value everywhere below (dev-url is the capture command; the value is NEVER written to a committed file). Save it into gitignored `apps/api/.dev.vars` locally (append `MEDIA_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev` and `CLOUDFLARE_ACCOUNT_ID=436cc3a02b117ee2a2970681c9ac531e` beside the existing four keys) and into the evidence dir's scratch notes.

- [ ] **Step C5: Set the GitHub environment variables on BOTH deploy environments**

`CLOUDFLARE_ACCOUNT_ID` and `MEDIA_PUBLIC_BASE_URL` are non-secrets, but the repo's convention (Global Constraints) keeps per-environment values out of committed files — they land as GitHub environment **variables**, consumed by Task 2's `wrangler deploy --var` legs. The v1 leg is live (v1 deploys fire on pushes to v1), so both environments get the same values (one shared bucket, ADR-0019 #5).

```bash
gh variable set CLOUDFLARE_ACCOUNT_ID --env teaser --body "436cc3a02b117ee2a2970681c9ac531e" -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL --env teaser --body "https://pub-<hash>.r2.dev" -R jeius/sevendays
gh variable set CLOUDFLARE_ACCOUNT_ID --env v1 --body "436cc3a02b117ee2a2970681c9ac531e" -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL --env v1 --body "https://pub-<hash>.r2.dev" -R jeius/sevendays
```

(If the `v1` GitHub environment does not exist yet, create it first via `gh api repos/jeius/sevendays/environments/v1 -X PUT` — the deploy-v1 job already references it.)

- [ ] **Step C6: Read-only verification of everything above** (also the SDD worker's re-verification path — these four commands need no writes):

```bash
pnpm --filter @sevendays/api exec wrangler r2 bucket info sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket cors list sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle list sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media
```

Expected: bucket exists (creation_date today); the CORS rule; the `tmp-gc` rule; the r2.dev URL enabled. Paste the four outputs into `.superpowers/sdd/2026-09-26-136-m5-02/` as the task's evidence.

**IMPLEMENTER steps (repo work — SDD task):**

- [ ] **Step 1: Write the runbook doc**

Create `docs/media-bucket-runbook.md` with exactly this content (the owner handoff + live-verify sections are the load-bearing part; the r2.dev placeholder below is filled by whoever re-runs the runbook via the `dev-url get` capture command — the doc deliberately records the command, never a value):

````markdown
# Media bucket runbook — `sevendays-media` (ADR-0019)

One-time provisioning for the M5 media pipeline (ticket #136), executed by the
controller on 2026-09-26 and re-runnable from this document. The bucket is
edition-shared by construction (ADR-0019 #5): both API Workers
(`sevendays-api`, `sevendays-v1-api`) bind it, and bucket-level config (CORS,
lifecycle, r2.dev, the future custom domain) is changed ONCE, deliberately,
for both editions.

## What exists (verified 2026-09-26)

| Piece | Value | Verify (read-only) |
| --- | --- | --- |
| Bucket | `sevendays-media` | `pnpm --filter @sevendays/api exec wrangler r2 bucket info sevendays-media` |
| CORS | PUT + `content-type` + exposed `ETag` for the three admin origins | `… r2 bucket cors list sevendays-media` |
| Lifecycle | rule `tmp-gc`, prefix `tmp/`, expire after 1 day | `… r2 bucket lifecycle list sevendays-media` |
| Public dev URL | enabled — base recorded as `MEDIA_PUBLIC_BASE_URL` | `… r2 bucket dev-url get sevendays-media` |

The three admin origins (exact match, no trailing slash): `http://localhost:3000`
(admin dev — `apps/admin` runs `vite dev --port 3000`),
`https://sevendays-admin.pahamajulius.workers.dev` (teaser),
`https://sevendays-v1-admin.pahamajulius.workers.dev` (v1). Keep this list in
sync when Worker names or origins change — CORS rule fields map 1:1 to browser
behavior: `content-type` must be allowed (it is signed into the presigned URL),
`ETag` is exposed so the browser can verify its upload.

## Re-run / repair commands

```bash
# bucket (skip if info above succeeds)
pnpm --filter @sevendays/api exec wrangler r2 bucket create sevendays-media

# CORS — write the rule JSON to a scratch file, then:
pnpm --filter @sevendays/api exec wrangler r2 bucket cors set sevendays-media --file cors.json
pnpm --filter @sevendays/api exec wrangler r2 bucket cors list sevendays-media

# lifecycle GC for staging orphans (uploaded-but-never-committed objects;
# also cleans crashed-between-promote-and-delete leftovers; delete is unbilled)
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle add sevendays-media tmp-gc tmp/ --expire-days 1 -y
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle list sevendays-media

# public reads for admin previews (dev-only, rate-limited — never the
# production answer; the M6 custom domain replaces it)
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url enable sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media
```

## Vars and secrets — where each value lives

Neither the Workers nor this repo commit per-environment values (the
`LANDING_ORIGIN` posture). Four values, four homes:

| Name | Kind | Remote home | Local dev home |
| --- | --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | plain value | GitHub environment **variable** (`teaser`, `v1`) → passed to `wrangler deploy --var` by CI | `apps/api/.dev.vars` |
| `MEDIA_PUBLIC_BASE_URL` | plain value | GitHub environment **variable** (`teaser`, `v1`) → `wrangler deploy --var` | `apps/api/.dev.vars` |
| `R2_S3_ACCESS_KEY_ID` | credential | Worker secret (`wrangler secret put`) + GitHub environment **secret** (CI sync) | `apps/api/.dev.vars` |
| `R2_S3_SECRET_ACCESS_KEY` | credential | Worker secret + GitHub environment secret | `apps/api/.dev.vars` |

Capture commands:

```bash
gh variable set CLOUDFLARE_ACCOUNT_ID --env teaser --body "<account id>" -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL --env teaser --body "$(pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media | grep -o 'https://pub-[a-z0-9]*\.r2\.dev')" -R jeius/sevendays
# repeat with --env v1
```

Local dev (`apps/api/.dev.vars` — gitignored; `apps/api/.dev.vars.example`
documents every key): append the four keys above. Without the S3 pair the
Worker boots and every route serves; only the presign route fails loudly
(`MissingR2CredentialsError` → the uniform 500 + log — the
`BETTER_AUTH_SECRET` posture, never a silent fallback).

## § Owner handoff — minting the scoped R2 S3 token (owner-operated, ~5 minutes)

The presign endpoint signs upload URLs with an R2 API token scoped to this
bucket only. No such token exists yet (verified 2026-09-26). To mint it:

1. dash.cloudflare.com → R2 → **Account Details** → **Manage R2 API Tokens** →
   **Create API Token**.
2. Permissions: **Object Read & Write**. Scope: **Apply to specific buckets
   only** → `sevendays-media`. TTL: no expiry (rotate at the M6 account
   handover). Create.
3. Copy the **Access Key ID** and **Secret Access Key** — the secret is shown
   ONCE, at creation. Treat both as credentials (they grant object writes).
4. Set them everywhere they are consumed:

```bash
# both API Workers (the deployed teaser + v1 editions)
printf '%s' "<access-key-id>"     | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_ACCESS_KEY_ID     --name sevendays-api
printf '%s' "<secret-access-key>" | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_SECRET_ACCESS_KEY --name sevendays-api
printf '%s' "<access-key-id>"     | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_ACCESS_KEY_ID     --name sevendays-v1-api
printf '%s' "<secret-access-key>" | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_SECRET_ACCESS_KEY --name sevendays-v1-api

# both GitHub environments (the CI deploy legs sync them on every push)
gh secret set R2_S3_ACCESS_KEY_ID     --env teaser --body "<access-key-id>"     -R jeius/sevendays
gh secret set R2_S3_SECRET_ACCESS_KEY --env teaser --body "<secret-access-key>" -R jeius/sevendays
gh secret set R2_S3_ACCESS_KEY_ID     --env v1 --body "<access-key-id>"     -R jeius/sevendays
gh secret set R2_S3_SECRET_ACCESS_KEY --env v1 --body "<secret-access-key>" -R jeius/sevendays

# local dev
# append R2_S3_ACCESS_KEY_ID=… and R2_S3_SECRET_ACCESS_KEY=… to apps/api/.dev.vars
```

5. Prove it live (no deploy needed — the secrets are read per request):

```bash
cd apps/api
LIVE_MEDIA_VERIFY=1 \
R2_S3_ACCESS_KEY_ID="<access-key-id>" \
R2_S3_SECRET_ACCESS_KEY="<secret-access-key>" \
CLOUDFLARE_ACCOUNT_ID="<account id>" \
pnpm test -- media-live
```

Expected: `3 passed` (the round-trip promote, the swapped-Content-Type 403,
the over-cap delete-and-400 — see § Live round-trip verify).

## § Live round-trip verify

`apps/api/test/media-live.test.ts` runs the REAL presign + commit service code
against the REAL bucket. It is **not a CI gate**: the file skips (3 skipped)
unless `LIVE_MEDIA_VERIFY=1` AND all three credential vars are set, so `pnpm
check` never needs — never touches — the bucket. It proves, live:

- presign → PUT with the minted Content-Type → `commitUpload` HEAD-verifies,
  promotes to the immutable final key, deletes the staging key;
- a PUT with a swapped Content-Type fails the signature (403
  `SignatureDoesNotMatch` — Content-Type is signed in);
- an object over the 50 MiB cap is deleted from the bucket and answered
  400-shaped with field details.

## M6 pointer (not this milestone)

Attach the custom domain (requires the zone in the SAME Cloudflare account as
the bucket — a recorded constraint on the ADR-0016 dedicated-account
rotation; R2 has no bucket-move), flip `MEDIA_PUBLIC_BASE_URL` in both GitHub
environments, disable the r2.dev URL, and start relying on the objects'
`cacheControl: immutable` for edge caching. Read-time URL resolution only —
no migration, no key rewrite.
````

- [ ] **Step 2: Verify the doc's commands read-only and commit**

Run the four Step C6 read-only commands again from a clean shell — all four succeed (the doc's table is truthful). Then:

```bash
git add docs/media-bucket-runbook.md
git commit -m "docs: media bucket runbook — controller-executed provisioning + owner handoff (#136)"
```

---

### Task 2: Deploy-side wiring — aws4fetch, bindings, env schema, testEnv stubs, CI sync

**Files:**
- Modify: `apps/api/package.json` + `pnpm-lock.yaml` (aws4fetch via `pnpm add` only), `apps/api/wrangler.toml`, `apps/api/.dev.vars.example`, `apps/api/src/env.ts`, `apps/api/src/env.test.ts` (test-first), `apps/api/test/helpers/env.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Task 1's bucket (a missing bucket fails `wrangler deploy` — never deployed here, but the binding's validity rides it at merge) + the GitHub environment variables.
- Produces (what Tasks 4–6 + #137 consume): `Env` (the Zod-parsed Worker env) gains `MEDIA_BUCKET: R2Bucket` + `IMAGES: ImagesBinding` (required, binding-shaped object check) + `CLOUDFLARE_ACCOUNT_ID: string` + `MEDIA_PUBLIC_BASE_URL: string` (required) + `R2_S3_ACCESS_KEY_ID`/`R2_S3_SECRET_ACCESS_KEY` (optional, `.min(1)` — the BETTER_AUTH_SECRET posture; the presign service owns the loud failure, Task 4). `testEnv(databaseUrl)` carries binding-shaped stubs so every existing suite keeps passing. CI passes the two plain values to the api deploys via `--var` and syncs the S3 pair fail-soft.

**Not here:** the service/route code (Tasks 4–5 — nothing consumes the new env fields yet; the schema merely makes them parseable); `.dev.vars` itself (gitignored — Task 1 Step C4 documented the local append); `worker-configuration.d.ts` (Global Constraints: no cf-typegen).

- [ ] **Step 1: Write the failing env-schema tests**

In `apps/api/src/env.test.ts`, append at the end of the file:

```ts
describe('parseEnv — media keys (M5 #136)', () => {
  const mediaVars = () => ({
    CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
  });

  it('parses the media keys — binding-shaped objects pass; the optional S3 pair may be absent', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
      ...mediaVars(),
      MEDIA_BUCKET: {},
      IMAGES: {},
    });
    expect(env.CLOUDFLARE_ACCOUNT_ID).toBe('0123456789abcdef0123456789abcdef');
    expect(env.MEDIA_PUBLIC_BASE_URL).toBe('https://pub-test.r2.dev');
    expect(env.R2_S3_ACCESS_KEY_ID).toBeUndefined();
    expect(env.R2_S3_SECRET_ACCESS_KEY).toBeUndefined();
  });

  it('rejects a missing MEDIA_BUCKET binding (required — deploys with wrangler.toml once the bucket exists)', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        IMAGES: {},
      })
    ).toThrow(/MEDIA_BUCKET/);
  });

  it('rejects a missing IMAGES binding', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        MEDIA_BUCKET: {},
      })
    ).toThrow(/IMAGES/);
  });

  it('rejects a missing CLOUDFLARE_ACCOUNT_ID', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
        MEDIA_BUCKET: {},
        IMAGES: {},
      })
    ).toThrow(/CLOUDFLARE_ACCOUNT_ID/);
  });

  it('rejects a missing MEDIA_PUBLIC_BASE_URL', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
        MEDIA_BUCKET: {},
        IMAGES: {},
      })
    ).toThrow(/MEDIA_PUBLIC_BASE_URL/);
  });

  it('rejects a malformed MEDIA_PUBLIC_BASE_URL', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
        MEDIA_PUBLIC_BASE_URL: 'not a url',
        MEDIA_BUCKET: {},
        IMAGES: {},
      })
    ).toThrow(/MEDIA_PUBLIC_BASE_URL/);
  });

  it('rejects an empty R2_S3_ACCESS_KEY_ID when present (optional key — no silent blank)', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        MEDIA_BUCKET: {},
        IMAGES: {},
        R2_S3_ACCESS_KEY_ID: '',
      })
    ).toThrow(/R2_S3_ACCESS_KEY_ID/);
  });

  it('rejects an empty R2_S3_SECRET_ACCESS_KEY when present', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        ...mediaVars(),
        MEDIA_BUCKET: {},
        IMAGES: {},
        R2_S3_SECRET_ACCESS_KEY: '',
      })
    ).toThrow(/R2_S3_SECRET_ACCESS_KEY/);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- src/env`
Expected: FAIL — the eight new cases fail (the schema has no media keys: `env.CLOUDFLARE_ACCOUNT_ID` is `undefined`, the `toThrow` cases get no throw). The pre-existing cases stay green.

- [ ] **Step 3: Add the dependency**

Run: `pnpm --filter @sevendays/api add aws4fetch@1.0.20`
Expected: `package.json` gains `"aws4fetch": "^1.0.20"` in dependencies; the lockfile resolves `1.0.20` (verify with `pnpm --filter @sevendays/api list aws4fetch --depth 0` — anything else → STOP and report). `pnpm install` runs as part of add (the manifest-change gate).

- [ ] **Step 4: Wire the bindings in wrangler.toml (whole file, verbatim)**

Replace the entire contents of `apps/api/wrangler.toml` with:

```toml
name = "sevendays-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# Media pipeline (ADR-0019, M5 ticket 02): the sevendays-media bucket and the
# Images binding. The bucket itself is provisioned once (controller/owner —
# docs/media-bucket-runbook.md); a missing bucket fails `wrangler deploy`.
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "sevendays-media"

# Cloudflare Images binding (ADR-0019 #6): admin thumbnails transform bytes
# straight from the R2 binding — no public read path needed. wrangler
# 4.127.1's config schema accepts ONLY `binding` (+ `remote`) on [images] —
# no cache block (the research sketch's `[images.cache]` predates this schema).
[images]
binding = "IMAGES"

# Secrets (set via `wrangler secret put <NAME>`, never committed):
#   DATABASE_URL
#   BETTER_AUTH_SECRET
#   RESEND_API_KEY
#   SENTRY_DSN
#   POSTHOG_API_KEY
#   R2_S3_ACCESS_KEY_ID      (M5 media — OPTIONAL env; owner-minted per the
#                             runbook's § Owner handoff; the presign route
#                             owns the loud missing-credential failure)
#   R2_S3_SECRET_ACCESS_KEY  (M5 media — same)
# Per-environment plain values (never committed; passed to `wrangler deploy
# --var` by CI from the GitHub environment, `.dev.vars` locally):
#   CLOUDFLARE_ACCOUNT_ID    (M5 media — presign endpoint host)
#   MEDIA_PUBLIC_BASE_URL    (M5 media — r2.dev base now, custom domain at M6)

[vars]
ENVIRONMENT = "development"
# LANDING_ORIGIN is a plain per-environment Worker var (the confirmation
# email's CTA origin — issue #47), not a committed [vars] entry: a localhost
# value here would deploy a wrong link. Dev value lives in .dev.vars;
# RESEND_API_KEY stays a secret (`wrangler secret put`).

[dev]
port = 8787
```

- [ ] **Step 5: Grow the env schema (whole file, verbatim)**

Replace the entire contents of `apps/api/src/env.ts` with:

```ts
import { z } from 'zod';

// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed var fails loudly here
// instead of surfacing as a mid-request failure. DATABASE_URL is the pooled
// Supabase connection (ADR-0007). The email pair (issue #47) has no fallback
// by design — the API_URL posture: a deploy without either var fails every
// /api/v1 request (acquireDb parses the full schema) rather than silently
// dropping confirmation emails.
//
// Two OPTIONAL keys, each with a loud owner (fail-everything would be wrong):
// - BETTER_AUTH_SECRET (M4 ticket 04): the auth middleware owns the missing-
//   secret failure, so only gated routes care.
// - The R2 S3-token pair (M5 #136): the presign service owns the missing-
//   credential failure (MissingR2CredentialsError), so a deploy made before
//   the owner's token mint serves everything except presign — never a silent
//   fallback there either.
//
// MEDIA_BUCKET/IMAGES are REQUIRED bindings (they deploy with wrangler.toml
// once the sevendays-media bucket exists — docs/media-bucket-runbook.md), and
// CLOUDFLARE_ACCOUNT_ID/MEDIA_PUBLIC_BASE_URL are REQUIRED per-environment
// values (CI passes them at deploy; the DATABASE_URL posture applies). The
// z.custom object check makes a binding's absence a parse failure instead of
// a mid-route TypeError. The ambient generated global in
// worker-configuration.d.ts stays no longer load-bearing anywhere (the
// R2Bucket/ImagesBinding types come from @cloudflare/workers-types).
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  LANDING_ORIGIN: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  MEDIA_BUCKET: z.custom<R2Bucket>((v) => v !== null && typeof v === 'object'),
  IMAGES: z.custom<ImagesBinding>((v) => v !== null && typeof v === 'object'),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  MEDIA_PUBLIC_BASE_URL: z.url(),
  R2_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}
```

- [ ] **Step 6: Run the env tests to verify they pass, then grow testEnv**

Run: `pnpm --filter @sevendays/api test -- src/env`
Expected: PASS — all env cases green (pre-existing + the eight new).

Replace the entire contents of `apps/api/test/helpers/env.ts` with:

```ts
// The full Worker binding for integration tests (issue #47 made
// RESEND_API_KEY + LANDING_ORIGIN required env — parseEnv fails without
// them, so every /api/v1 request must carry the complete set). The key is a
// placeholder: the Resend SDK is vi.mock'ed in the suites, so no real key
// (and no network) is ever needed here. BETTER_AUTH_SECRET (M4 ticket 04)
// is a fixed placeholder shared by the API's verification instance and the
// test-shaped auth issuer (helpers/auth.ts) — same value on both sides is
// what makes issued sessions verifiable (ADR-0004's shared-secret rule,
// mirrored at test scale). MEDIA_BUCKET/IMAGES (M5 #136) are binding-shaped
// stubs: `{}` passes the env schema's object check, and suites that exercise
// media behavior spread their own purpose-built stubs over these.
export const TEST_AUTH_SECRET = 'integration-test-secret-0123456789-0123456789-0123456789';

export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
    RESEND_API_KEY: 're_test_placeholder',
    LANDING_ORIGIN: 'http://localhost:3000',
    BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
    MEDIA_BUCKET: {},
    IMAGES: {},
    CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
  };
}
```

Run: `pnpm --filter @sevendays/api test`
Expected: **14 files / 130 tests passed** (122 + the eight new env cases; every suite rides `testEnv`, so nothing else moves). The "close timed out" exit noise is pre-existing — judge the Test Files/Tests lines.

- [ ] **Step 7: Extend `.dev.vars.example` (documentation only — values stay empty)**

Append at the end of `apps/api/.dev.vars.example`:

```text
# Cloudflare account id — builds the S3-compatible presign endpoint host
# (<account_id>.r2.cloudflarestorage.com). Plain per-environment value (never
# secret): CI passes it at deploy via `wrangler deploy --var` from the GitHub
# environment; here it is required for boot (the DATABASE_URL posture).
CLOUDFLARE_ACCOUNT_ID=

# Public base URL for media reads — the bucket's r2.dev Public Development
# URL today (`wrangler r2 bucket dev-url get sevendays-media`), the custom
# domain at M6. Same storage posture as CLOUDFLARE_ACCOUNT_ID.
MEDIA_PUBLIC_BASE_URL=

# R2 S3 API token (Object Read & Write, scoped to sevendays-media ONLY) —
# signs presigned upload URLs. OPTIONAL env (the BETTER_AUTH_SECRET posture):
# the Worker boots without it and every route serves; the presign route fails
# loudly (500 + log) until these are set. Owner-minted via the dashboard —
# docs/media-bucket-runbook.md § Owner handoff (the secret is shown ONCE at
# creation).
R2_S3_ACCESS_KEY_ID=
R2_S3_SECRET_ACCESS_KEY=
```

- [ ] **Step 8: CI — pass the vars at deploy, sync the S3 pair fail-soft (both legs)**

In `.github/workflows/ci.yml`, four edits per deploy leg (the `deploy-teaser` leg shown; mirror exactly with `sevendays-v1-api` / "the v1 GitHub environment" for `deploy-v1`):

(a) Extend the job `env:` block (after `BETTER_AUTH_URL: ${{ vars.BETTER_AUTH_URL }}`):

```yaml
      CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
      MEDIA_PUBLIC_BASE_URL: ${{ vars.MEDIA_PUBLIC_BASE_URL }}
      R2_S3_ACCESS_KEY_ID: ${{ secrets.R2_S3_ACCESS_KEY_ID }}
      R2_S3_SECRET_ACCESS_KEY: ${{ secrets.R2_S3_SECRET_ACCESS_KEY }}
```

(b) The api deploy step gains the two `--var` flags (the landing/admin plain-var precedent — no deploy-then-sync gap on REQUIRED values):

```yaml
      - name: Deploy api (sevendays-api)
        working-directory: apps/api
        run: pnpm exec wrangler deploy --name sevendays-api --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "MEDIA_PUBLIC_BASE_URL:$MEDIA_PUBLIC_BASE_URL"
```

(c) New step directly after the api `Sync api DATABASE_URL…` step (fail-soft by design — the S3 pair is owner-pending, so an empty value skips with a notice instead of failing the deploy, unlike the hard-required DATABASE_URL guard):

```yaml
      - name: Sync api R2 S3-token secrets (skip until the owner mints them)
        working-directory: apps/api
        run: |
          if [ -z "$R2_S3_ACCESS_KEY_ID" ] || [ -z "$R2_S3_SECRET_ACCESS_KEY" ]; then
            echo '::notice::R2 S3-token secrets missing from the teaser GitHub environment — presign stays loudly unavailable (docs/media-bucket-runbook.md § Owner handoff)'
            exit 0
          fi
          printf '%s' "$R2_S3_ACCESS_KEY_ID" | pnpm exec wrangler secret put R2_S3_ACCESS_KEY_ID --name sevendays-api
          printf '%s' "$R2_S3_SECRET_ACCESS_KEY" | pnpm exec wrangler secret put R2_S3_SECRET_ACCESS_KEY --name sevendays-api
```

- [ ] **Step 9: Gates + commit**

Run: `pnpm install` (manifest changed in Step 3 — idempotent no-op after the add, but the gate is the gate).
Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck`
Expected: all green (the env module typechecks against the ambient `R2Bucket`/`ImagesBinding` globals; no `cf-typegen`).
Run: `pnpm --filter @sevendays/api fix` then commit:

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/wrangler.toml apps/api/.dev.vars.example apps/api/src/env.ts apps/api/src/env.test.ts apps/api/test/helpers/env.ts .github/workflows/ci.yml
git commit -m "feat(api): media bindings + env — MEDIA_BUCKET/IMAGES, presign vars, optional R2 S3 pair (#136)"
```

---

### Task 3: packages/types — the media presign vocabulary

**Files:**
- Create: `packages/types/src/media.ts`, `packages/types/src/media.test.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Consumes: nothing new (pure Zod vocabulary — the repo rule puts every shared request/response shape here, not in the app).
- Produces (exact exports — Tasks 4–5 and #137/#139–#141 consume): `MEDIA_CONTENT_TYPES` (the `['image/jpeg']` tuple — the M5 cap, extensible by adding a member), `mediaPurposeSchema`/`MediaPurpose` (`'package-cover' | 'gallery-photo'`), `mediaPresignRequestSchema`/`MediaPresignRequest`, `mediaPresignResponseSchema`/`MediaPresignResponse`, `mediaStagingKeySchema`/`MediaStagingKey`.

**Not here:** any api-side schema or route (Tasks 4–5); the gallery/package entity vocabularies (landed in #135 — `createGalleryPhotoSchema.r2Key` already types the staging key the commit contract will verify).

- [ ] **Step 1: Write the failing tests**

`packages/types/src/media.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  mediaPresignRequestSchema,
  mediaPresignResponseSchema,
  mediaStagingKeySchema,
} from './media.js';

const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000000.jpg';

describe('mediaPresignRequestSchema', () => {
  it('parses the spec-verbatim request { purpose, contentType }', () => {
    const result = mediaPresignRequestSchema.safeParse({
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unlisted purpose (400-with-details vocabulary at the route)', () => {
    expect(mediaPresignRequestSchema.safeParse({ purpose: 'avatar', contentType: 'image/jpeg' }).success).toBe(false);
  });

  it('rejects a non-jpeg contentType (the M5 cap: image/jpeg only)', () => {
    expect(mediaPresignRequestSchema.safeParse({ purpose: 'gallery-photo', contentType: 'image/png' }).success).toBe(false);
  });

  it('parse output carries exactly purpose + contentType — a smuggled sizeBytes is stripped (size is not declarable)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'package-cover',
      contentType: 'image/jpeg',
      sizeBytes: 42,
    });
    expect(Object.keys(parsed).sort()).toEqual(['contentType', 'purpose']);
  });
});

describe('mediaPresignResponseSchema', () => {
  it('parses { key, uploadUrl } and rejects a relative uploadUrl', () => {
    expect(mediaPresignResponseSchema.safeParse({ key: STAGING_KEY, uploadUrl: 'https://acct.r2.cloudflarestorage.com/sevendays-media/x?X-Amz-Signature=sig' }).success).toBe(true);
    expect(mediaPresignResponseSchema.safeParse({ key: STAGING_KEY, uploadUrl: '/sevendays-media/x' }).success).toBe(false);
  });
});

describe('mediaStagingKeySchema', () => {
  it('accepts a presign-minted staging key', () => {
    expect(mediaStagingKeySchema.safeParse(STAGING_KEY).success).toBe(true);
  });

  it('rejects final keys, traversal, and uppercase uuids (foreign-key commit gate)', () => {
    expect(mediaStagingKeySchema.safeParse('covers/00000000-0000-4000-8000-000000000000.jpg').success).toBe(false);
    expect(mediaStagingKeySchema.safeParse('gallery/00000000-0000-4000-8000-000000000000.jpg').success).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/../../covers/victim.jpg').success).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/00000000-0000-4000-8000-000000000000.JPG').success).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/short.jpg').success).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/types test -- media`
Expected: FAIL — the import cannot resolve (`./media.js` does not exist).

- [ ] **Step 3: Write the schema file**

`packages/types/src/media.ts`:

```ts
import { z } from 'zod';

// Media presign vocabulary (M5 #136, ADR-0019). The client names a purpose
// and a content type; the server assigns the staging key — the client never
// supplies key text. Content-Type is signed into the upload URL (allHeaders:
// true at the signing site — see apps/api/src/services/media.ts), so type is
// enforced at presign. Size is NOT declarable here: a presigned PUT cannot
// carry a size condition, so the commit-time HEAD is the real gate.
export const MEDIA_CONTENT_TYPES = ['image/jpeg'] as const;

export const mediaPurposeSchema = z.enum(['package-cover', 'gallery-photo']);

export type MediaPurpose = z.infer<typeof mediaPurposeSchema>;

export const mediaPresignRequestSchema = z.object({
  purpose: mediaPurposeSchema,
  contentType: z.enum(MEDIA_CONTENT_TYPES),
});

export type MediaPresignRequest = z.infer<typeof mediaPresignRequestSchema>;

export const mediaPresignResponseSchema = z.object({
  key: z.string().min(1),
  uploadUrl: z.url(),
});

export type MediaPresignResponse = z.infer<typeof mediaPresignResponseSchema>;

// The only staging-key shape the commit endpoint accepts: what presign mints,
// and nothing else. Anchored (a `covers/…`-style final key can never ride the
// commit path — promoting and then DELETING an arbitrary object is the attack
// this closes): lowercase-hex uuid + the jpeg extension, `tmp/` prefix.
export const mediaStagingKeySchema = z
  .string()
  .regex(/^tmp\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/);

export type MediaStagingKey = z.infer<typeof mediaStagingKeySchema>;
```

- [ ] **Step 4: Wire the barrel**

In `packages/types/src/index.ts`, insert into the alphabetical export list (between `./inclusion.js` and `./package.js`):

```ts
export * from './media.js';
```

- [ ] **Step 5: Run the suite, rebuild, commit**

Run: `pnpm --filter @sevendays/types test`
Expected: **13 files / 112 tests passed** (105 + 7).
Run: `pnpm --filter @sevendays/types fix && pnpm build:packages` (Task 4's api code imports these from built `dist/`), then commit:

```bash
git add packages/types/src/media.ts packages/types/src/media.test.ts packages/types/src/index.ts
git commit -m "feat(types): media presign vocabulary — request/response + staging-key shape (#136)"
```

---

### Task 4: The media service — presignUpload + the commit contract (TDD over binding-shaped stubs)

**Files:**
- Create (test-first): `apps/api/src/services/media.test.ts`
- Create: `apps/api/src/services/media.ts`

**Interfaces:**
- Consumes: Task 3's `mediaStagingKeySchema`/`MediaPurpose` (from built `dist/` — Task 3 Step 5 rebuilt); Task 2's `Env` fields; the ambient `R2Bucket` global (typed per the installed `@cloudflare/workers-types` `5.20260828.1`: `head(key): Promise<R2Object | null>`, `get(key, options?): Promise<R2ObjectBody | null>`, `put(key, value, options?): Promise<R2Object>`, `delete(keys): Promise<void>`).
- Produces (exact exports — Task 5's routes + Task 6's live harness + #137's entity routes consume): `MEDIA_BUCKET_NAME` (`'sevendays-media'`), `PRESIGN_EXPIRY_SECONDS` (`900`), `MAX_UPLOAD_BYTES` (`50 * 1024 * 1024`), `THUMBNAIL_WIDTH_PX` (`400`), `MAX_THUMBNAIL_INPUT_BYTES` (`20 * 1024 * 1024`), `MissingR2CredentialsError` (Error subclass, `name = 'MissingR2CredentialsError'`), `presignUpload(env, input): Promise<{ key: string; uploadUrl: string }>` (env is `Pick<Env, 'R2_S3_ACCESS_KEY_ID' | 'R2_S3_SECRET_ACCESS_KEY' | 'CLOUDFLARE_ACCOUNT_ID'>`), `commitUpload(bucket, input): Promise<CommitUploadResult>` with `CommitUploadResult = { ok: true; finalKey: string } | { ok: false; reason: 'foreign_key' | 'not_found' | 'cap_violation'; message: string; details?: { path: string[]; message: string }[] }` (the appointments `{ ok, reason, message }` union precedent), and `servePhotoThumbnail(db, env, id): Promise<Response | null>` (written in Task 5 with its route — its tests need the compose DB).

**Not here:** any route or mount (Task 5); the DB persist of the final key (#137's entity routes call `commitUpload` then write the row — this ticket's contract hands the key back); any DB access in `commitUpload`/`presignUpload` (pure bucket/env logic — the thumb service is the only DB-touching member).

- [ ] **Step 1: Write the failing service tests**

`apps/api/src/services/media.test.ts` (imports nothing from aws4fetch — the signer lives in the service; the tests assert its OUTPUT):

```ts
import { describe, expect, it } from 'vitest';
import {
  commitUpload,
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET_NAME,
  MissingR2CredentialsError,
  presignUpload,
} from './media.js';

const CREDS = {
  R2_S3_ACCESS_KEY_ID: 'test-access-key-id',
  R2_S3_SECRET_ACCESS_KEY: 'test-secret-access-key',
  CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
};

// Binding-shaped stub over a Map — re-derived from the R2Bucket surface the
// service uses (head/get/put/delete only): head returns an R2Object-shaped
// metadata record, get returns it with a body, put records the FINAL key +
// options the service chose, delete records deletions. Assertions run
// against the recorded calls, so promote/delete semantics are pinned
// exactly (toHaveBeenCalledWith-equivalent, without a mock's looseness).
function stubBucket(initial: Record<string, { size: number; contentType: string }> = {}) {
  const objects = new Map(
    Object.entries(initial).map(([key, meta]) => [key, { ...meta, deleted: false }])
  );
  const putCalls: { key: string; value: unknown; options: unknown }[] = [];
  const deleteCalls: string[] = [];
  const bucket = {
    async head(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return { key, size: obj.size, httpMetadata: { contentType: obj.contentType } };
    },
    async get(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return { key, size: obj.size, httpMetadata: { contentType: obj.contentType }, body: 'staging-bytes' };
    },
    async put(key: string, value: unknown, options: unknown) {
      putCalls.push({ key, value, options });
      objects.set(key, { size: 1, contentType: 'image/jpeg', deleted: false });
      return { key };
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) {
        deleteCalls.push(key);
        const existing = objects.get(key);
        if (existing) objects.set(key, { ...existing, deleted: true });
      }
    },
  };
  return { bucket: bucket as unknown as R2Bucket, putCalls, deleteCalls };
}

describe('presignUpload', () => {
  it('mints a tmp/<uuid>.jpg key that passes the shared staging-key schema', async () => {
    const result = await presignUpload(CREDS, { purpose: 'gallery-photo', contentType: 'image/jpeg' });
    expect(result.key).toMatch(/^tmp\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/);
  });

  it('signs the Content-Type into the URL — allHeaders is load-bearing (X-Amz-SignedHeaders: content-type;host)', async () => {
    // Spike-pinned (2026-09-26, aws4fetch 1.0.20): `content-type` sits in the
    // lib's UNSIGNABLE_HEADERS set, so signQuery alone emits SignedHeaders:
    // host and a swapped Content-Type PUT would SUCCEED. The service must
    // pass allHeaders: true — this assertion is the regression lock on it.
    const { uploadUrl } = await presignUpload(CREDS, { purpose: 'package-cover', contentType: 'image/jpeg' });
    const url = new URL(uploadUrl);
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
  });

  it('targets the account S3 host, the sevendays-media bucket, and expires in 900s', async () => {
    const { uploadUrl } = await presignUpload(CREDS, { purpose: 'gallery-photo', contentType: 'image/jpeg' });
    const url = new URL(uploadUrl);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe(`${CREDS.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`);
    expect(url.pathname.startsWith(`/${MEDIA_BUCKET_NAME}/tmp/`)).toBe(true);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
  });

  it('mints a fresh key per call (never hoard, never collide)', async () => {
    const first = await presignUpload(CREDS, { purpose: 'gallery-photo', contentType: 'image/jpeg' });
    const second = await presignUpload(CREDS, { purpose: 'gallery-photo', contentType: 'image/jpeg' });
    expect(first.key).not.toBe(second.key);
  });

  it('throws MissingR2CredentialsError when both S3 keys are missing (loud, typed — never a silent fallback)', async () => {
    const env = { CLOUDFLARE_ACCOUNT_ID: CREDS.CLOUDFLARE_ACCOUNT_ID };
    await expect(presignUpload(env, { purpose: 'gallery-photo', contentType: 'image/jpeg' })).rejects.toBeInstanceOf(
      MissingR2CredentialsError
    );
  });

  it('throws when only one of the two S3 keys is present', async () => {
    const env = { CLOUDFLARE_ACCOUNT_ID: CREDS.CLOUDFLARE_ACCOUNT_ID, R2_S3_ACCESS_KEY_ID: CREDS.R2_S3_ACCESS_KEY_ID };
    await expect(presignUpload(env, { purpose: 'gallery-photo', contentType: 'image/jpeg' })).rejects.toBeInstanceOf(
      MissingR2CredentialsError
    );
  });
});

describe('commitUpload', () => {
  const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000000.jpg';

  it('promotes: get → put at the immutable final key (covers/) → delete staging → hands back the final key', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, { stagingKey: STAGING_KEY, purpose: 'package-cover' });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.finalKey).toMatch(/^covers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/);
    expect(stub.putCalls).toHaveLength(1);
    const putCall = stub.putCalls[0];
    if (!putCall) throw new Error('expected exactly one put call');
    expect(putCall.key).toBe(result.finalKey);
    expect(putCall.value).toBe('staging-bytes');
    expect(putCall.options).toEqual({
      httpMetadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    expect(stub.deleteCalls).toEqual([STAGING_KEY]);
  });

  it('gallery purpose promotes to gallery/ (purpose decides the final prefix)', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, { stagingKey: STAGING_KEY, purpose: 'gallery-photo' });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.finalKey).toMatch(/^gallery\//);
  });

  it('answers the typed 400 WITHOUT deleting on a foreign key (a client-supplied covers/… key must never delete a promoted object)', async () => {
    const FOREIGN = 'covers/00000000-0000-4000-8000-000000000000.jpg';
    const stub = stubBucket({ [FOREIGN]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, { stagingKey: FOREIGN, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('foreign_key');
    expect(result.message).toBe('Invalid staging key.');
    expect(result.details).toEqual([
      { path: ['key'], message: 'must be a tmp/<uuid>.jpg staging key minted by presign' },
    ]);
    expect(stub.deleteCalls).toEqual([]);
  });

  it('answers not_found (no delete — nothing to clean) when the staging key is missing', async () => {
    const stub = stubBucket();
    const result = await commitUpload(stub.bucket, { stagingKey: STAGING_KEY, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
    expect(stub.deleteCalls).toEqual([]);
  });

  it('deletes an over-cap object and answers cap_violation with the key field detail (the 50 MiB cap)', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: MAX_UPLOAD_BYTES + 1, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, { stagingKey: STAGING_KEY, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cap_violation');
    expect(result.details).toEqual([{ path: ['key'], message: expect.stringContaining('50 MiB') }]);
    expect(stub.deleteCalls).toEqual([STAGING_KEY]);
    expect(stub.putCalls).toEqual([]);
  });

  it('deletes a wrong-content-type object and answers cap_violation with the contentType field detail', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/png' } });
    const result = await commitUpload(stub.bucket, { stagingKey: STAGING_KEY, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cap_violation');
    expect(result.details).toEqual([{ path: ['contentType'], message: expect.stringContaining('image/png') }]);
    expect(stub.deleteCalls).toEqual([STAGING_KEY]);
    expect(stub.putCalls).toEqual([]);
  });

  it('answers not_found when the object vanishes between head and get (no put, no delete)', async () => {
    // Pins the head→get race: head passes, get returns null (a concurrent
    // commit won, or a manual delete). A plain object keeps the ordering
    // honest without a mock's call-count contract.
    const flaky = {
      async head(key: string) {
        return { key, size: 1024, httpMetadata: { contentType: 'image/jpeg' } };
      },
      async get() {
        return null;
      },
      async put(): Promise<{ key: string }> {
        throw new Error('put must not run');
      },
      async delete(): Promise<void> {},
    };
    const result = await commitUpload(flaky as unknown as R2Bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'gallery-photo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- src/services/media`
Expected: FAIL — the import cannot resolve (`./media.js` does not exist).

- [ ] **Step 3: Implement the service (whole file, verbatim)**

`apps/api/src/services/media.ts`:

```ts
import { AwsClient } from 'aws4fetch';
import type { MediaPurpose } from '@sevendays/types';
import { mediaStagingKeySchema } from '@sevendays/types';
import type { Env } from '../env.js';

// The media seam (M5 #136, ADR-0019): presign mints a short-lived, type-
// enforced upload URL; commit is the trust-but-verify gate (binding HEAD →
// caps → promote to an immutable final key → delete staging → hand back the
// final key; miss or violation → delete the object and the typed 400 the
// route maps). Storage vs URLs: only object keys move here — resolving
// MEDIA_PUBLIC_BASE_URL into absolute URLs is the read assembly's job
// (#138), never this service's.

export const MEDIA_BUCKET_NAME = 'sevendays-media';
export const PRESIGN_EXPIRY_SECONDS = 900; // 15 min — one file PUT, minted per file on demand
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // the ADR-0019 cap (verified at commit; presign cannot carry a size condition)
export const THUMBNAIL_WIDTH_PX = 400; // the research-pinned admin-grid width
export const MAX_THUMBNAIL_INPUT_BYTES = 20 * 1024 * 1024; // the Images binding's documented input limit

const EXTENSIONS = { 'image/jpeg': 'jpg' } as const;

const FINAL_PREFIXES: Record<MediaPurpose, string> = {
  'package-cover': 'covers',
  'gallery-photo': 'gallery',
};

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Deploy-time misconfiguration (the BETTER_AUTH_SECRET posture): the route
 * does not catch this — the root onError logs it and answers the uniform
 * 500, so a Worker without the owner-minted token fails presign loudly
 * instead of silently handing out unsigned URLs. */
export class MissingR2CredentialsError extends Error {
  constructor() {
    super(
      'R2_S3_ACCESS_KEY_ID / R2_S3_SECRET_ACCESS_KEY are not set — the API cannot presign uploads. Set the Worker secrets per docs/media-bucket-runbook.md § Owner handoff (scoped R2 S3 token). No fallback by design.'
    );
    this.name = 'MissingR2CredentialsError';
  }
}

export type CommitUploadResult =
  | { ok: true; finalKey: string }
  | {
      ok: false;
      reason: 'foreign_key' | 'not_found' | 'cap_violation';
      message: string;
      details?: { path: string[]; message: string }[];
    };

/**
 * Mint a presigned PUT for one file (POST /api/v1/admin/media/presign,
 * session-gated). The key is server-assigned (`tmp/<uuid>.jpg` — the client
 * never supplies key text); the Content-Type is signed into the URL so a PUT
 * with a different type fails the signature. allHeaders is LOAD-BEARING:
 * aws4fetch's UNSIGNABLE_HEADERS set contains content-type, so signQuery
 * alone would emit `X-Amz-SignedHeaders: host` and type enforcement would
 * silently not exist (spiked 2026-09-26 against aws4fetch 1.0.20).
 */
export async function presignUpload(
  env: Pick<Env, 'R2_S3_ACCESS_KEY_ID' | 'R2_S3_SECRET_ACCESS_KEY' | 'CLOUDFLARE_ACCOUNT_ID'>,
  input: { purpose: MediaPurpose; contentType: 'image/jpeg' }
): Promise<{ key: string; uploadUrl: string }> {
  const accessKeyId = env.R2_S3_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new MissingR2CredentialsError();
  }
  const key = `tmp/${crypto.randomUUID()}.${EXTENSIONS[input.contentType]}`;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto', // required by the signer, ignored by R2
  });
  const url = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${MEDIA_BUCKET_NAME}/${key}?X-Amz-Expires=${PRESIGN_EXPIRY_SECONDS}`;
  const signed = await client.sign(
    new Request(url, { method: 'PUT', headers: { 'content-type': input.contentType } }),
    { aws: { signQuery: true, allHeaders: true } }
  );
  return { key, uploadUrl: signed.url };
}

/**
 * The commit contract (trust-but-verify, closed): HEAD-verify the staging
 * object → enforce the caps (50 MiB, image/jpeg — the presigned PUT carried
 * no size condition, so this is the real gate) → promote to the immutable
 * final key via the binding (no S3 credentials involved) → delete the
 * staging key → hand the final key back for the caller to persist (#137).
 * Miss or violation deletes the object and answers the typed 400 shape. A
 * staging key that was never minted by presign (anything not tmp/<uuid>.jpg)
 * is refused WITHOUT deleting — the commit path must never be able to delete
 * an arbitrary (promoted) object.
 */
export async function commitUpload(
  bucket: R2Bucket,
  input: { stagingKey: string; purpose: MediaPurpose }
): Promise<CommitUploadResult> {
  const stagingKey = mediaStagingKeySchema.safeParse(input.stagingKey);
  if (!stagingKey.success) {
    return {
      ok: false,
      reason: 'foreign_key',
      message: 'Invalid staging key.',
      details: [{ path: ['key'], message: 'must be a tmp/<uuid>.jpg staging key minted by presign' }],
    };
  }
  const obj = await bucket.head(stagingKey.data);
  if (!obj) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Upload not found — the PUT may have failed, expired, or been already committed.',
      details: [{ path: ['key'], message: 'no object at the staging key' }],
    };
  }
  const violations: { path: string[]; message: string }[] = [];
  if (obj.size > MAX_UPLOAD_BYTES) {
    violations.push({ path: ['key'], message: `upload exceeds the 50 MiB cap (${obj.size} bytes)` });
  }
  const contentType = obj.httpMetadata?.contentType ?? '';
  if (contentType !== 'image/jpeg') {
    violations.push({ path: ['contentType'], message: `stored content type ${contentType || '(none)'} is not allowed` });
  }
  if (violations.length > 0) {
    await bucket.delete(stagingKey.data);
    return { ok: false, reason: 'cap_violation', message: 'Upload failed the media caps and was deleted.', details: violations };
  }
  const src = await bucket.get(stagingKey.data);
  if (!src) {
    // Vanished between head and get (strongly consistent binding — this is a
    // concurrent commit winning the race, or a manual delete). Nothing to
    // promote, nothing left to clean.
    return {
      ok: false,
      reason: 'not_found',
      message: 'Upload not found — the PUT may have failed, expired, or been already committed.',
      details: [{ path: ['key'], message: 'no object at the staging key' }],
    };
  }
  const finalKey = `${FINAL_PREFIXES[input.purpose]}/${crypto.randomUUID()}.jpg`;
  await bucket.put(finalKey, src.body, {
    httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE_CONTROL },
  });
  await bucket.delete(stagingKey.data);
  return { ok: true, finalKey };
}
```

(The `EXTENSIONS` map is the extensible seam: a future content-type ruling adds a member there, to `MEDIA_CONTENT_TYPES` in `packages/types`, and to the route-level enum — nothing else changes.)

`servePhotoThumbnail` lands in this file in Task 5 (Step 3 there) — listed in this task's Interfaces for the record, written with its route so its DB-dependent tests run against the compose suite in Task 5.

- [ ] **Step 4: Run the service tests to verify they pass**

Run: `pnpm build:packages && pnpm --filter @sevendays/api test -- src/services/media`
Expected: PASS — 13 tests (`presignUpload` 6 + `commitUpload` 7). If the signed-headers assertion fails, `allHeaders: true` did not land — fix the service, never the test.

- [ ] **Step 5: Run the touched suites + commit**

Run: `pnpm --filter @sevendays/api test`
Expected: **15 files / 143 tests passed** (130 + 13).
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/media.ts apps/api/src/services/media.test.ts
git commit -m "feat(api): media service — presignUpload + commit verify/promote/violation-delete contract (#136)"
```

---

### Task 5: The admin sub-app — gated root, presign route, thumb route + HTTP integration tests

**Files:**
- Create (test-first): `apps/api/test/media-routes.test.ts`
- Modify: `apps/api/src/services/media.ts` (append `servePhotoThumbnail`)
- Create: `apps/api/src/routes/admin.ts`, `apps/api/src/routes/admin-media.ts`, `apps/api/src/routes/gallery-photos.ts`
- Modify: `apps/api/src/routes/v1.ts` (the chained `/admin` mount)

**Interfaces:**
- Consumes: Task 4's `presignUpload`/`servePhotoThumbnail` contract; the M4 `requireSession` (`services/auth.ts` — sets `c.set('session', session)` or answers `authenticationRequired`); `validatedJson`/`validatedParam` (the uniform `{ error, details }` validator hooks); the `galleryPhotos` table (Task 01 of M5 — `r2Key`, `position` NOT NULL with no default).
- Produces: the live routes `POST /api/v1/admin/media/presign` + `GET /api/v1/admin/gallery-photos/:id/thumb` behind the ONE `use('*', requireSession)` at `routes/admin.ts` — the sub-app root #137 extends with entity routers. `AppType` grows (the client package consumes it from built `dist/` — the Step 6 gate proves the client still typechecks).

**Not here:** any entity route under `/api/v1/admin` (#137 extends `routes/admin.ts` — never a second `requireSession` mount); the public gallery read (#138); any UI; presign rate limiting (nothing in the spec/ADR pins it — the session gate is the policy for M5).

- [ ] **Step 1: Write the failing HTTP tests**

`apps/api/test/media-routes.test.ts`:

```ts
import { galleryPhotos } from '@sevendays/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const MEDIA_VARS = {
  CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
};

// The full presign-capable env: testEnv + the two plain values + the S3 pair.
// Tests that need the OPPOSITE (missing creds) spread testEnv + MEDIA_VARS only.
const withCreds = (extra: Record<string, unknown> = {}) => ({
  ...testEnv(url),
  ...MEDIA_VARS,
  R2_S3_ACCESS_KEY_ID: 'test-access-key-id',
  R2_S3_SECRET_ACCESS_KEY: 'test-secret-access-key',
  ...extra,
});

// Stub Images binding: records the transform chain in order, answers a
// marker webp. Assertions re-derive the chain from the service call site:
// input(stream) → transform({ width: 400 }) → output({ format: 'image/webp' }).
function stubImages(marker = 'WEBP-MARKER-BYTES') {
  const calls: Record<string, unknown>[] = [];
  const binding = {
    input(stream: ReadableStream<Uint8Array>) {
      calls.push({ input: stream });
      const transformer = {
        transform(t: unknown) {
          calls.push({ transform: t });
          return transformer;
        },
        async output(o: unknown) {
          calls.push({ output: o });
          return { response: () => new Response(marker, { headers: { 'content-type': 'image/webp' } }) };
        },
      };
      return transformer;
    },
  };
  return { binding: binding as unknown as ImagesBinding, calls };
}

// Stub R2 bucket for the thumb legs: get returns metadata + a one-chunk body
// (the service reads .size and streams .body — exactly what R2ObjectBody gives).
function stubMediaBucket(options: { size: number; body?: string }) {
  return {
    async get(key: string) {
      return {
        key,
        size: options.size,
        httpMetadata: { contentType: 'image/jpeg' },
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

async function insertPhoto(r2Key: string) {
  const [row] = await db.insert(galleryPhotos).values({ r2Key, position: 1 }).returning();
  if (!row) throw new Error('photo insert returned no row');
  return row;
}

beforeEach(async () => {
  await truncateAll(db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/v1/admin/media/presign', () => {
  it('answers the uniform 401 envelope BEFORE validation for an anonymous caller with a VALID body', async () => {
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('answers 401 — never the validator 400 — for an anonymous caller with an INVALID body (the M4 ordering)', async () => {
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'avatar', contentType: 'image/png' }),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('answers 400 with field details for an authed caller over an unsupported type', async () => {
    const { token } = await signUpSession(url, 'presign-type@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/png' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      withCreds()
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details: { path: string[]; message: string }[] };
    expect(body.error).toBe('Invalid request payload.');
    const detail = body.details[0];
    if (!detail) throw new Error('expected one validation detail');
    expect(detail.path).toEqual(['contentType']);
  });

  it('mints { key, uploadUrl } for an authed caller — key staging-shaped, URL type-signed on the account S3 host', async () => {
    const { token } = await signUpSession(url, 'presign-happy@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'package-cover', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      withCreds()
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { key: string; uploadUrl: string };
    expect(body.key).toMatch(/^tmp\//);
    const upload = new URL(body.uploadUrl);
    expect(upload.host).toBe(`${MEDIA_VARS.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`);
    expect(upload.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
  });

  it('fails presign with the uniform 500 + log when the S3-token pair is absent (loud, never silent)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { token } = await signUpSession(url, 'presign-nocreds@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      { ...testEnv(url), ...MEDIA_VARS }
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    expect(spy.mock.calls.some((call) => String(call[0]).startsWith('[api]'))).toBe(true);
  });
});

describe('GET /api/v1/admin/gallery-photos/:id/thumb', () => {
  it('answers the uniform 401 envelope for an anonymous caller', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000/thumb',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('answers the per-entity 404 for an unknown photo id (authed)', async () => {
    const { token } = await signUpSession(url, 'thumb-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000/thumb',
      { headers: bearer(token) },
      withCreds()
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });

  it('answers the per-entity 404 when the row exists but the object is gone', async () => {
    const { token } = await signUpSession(url, 'thumb-gone@sevendays.test');
    const row = await insertPhoto('tmp/vanished.jpg');
    const emptyBucket = {
      async get() {
        return null;
      },
    } as unknown as R2Bucket;
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: emptyBucket, IMAGES: stubImages().binding })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });

  it('serves the transformed variant — width-capped webp from the Images binding (≤20 MB input)', async () => {
    const { token } = await signUpSession(url, 'thumb-webp@sevendays.test');
    const row = await insertPhoto('gallery/00000000-0000-4000-8000-000000000000.jpg');
    const bucket = stubMediaBucket({ size: 5 * 1024 * 1024 });
    const images = stubImages();
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: bucket, IMAGES: images.binding })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(await res.text()).toBe('WEBP-MARKER-BYTES');
    // The stub must have seen the exact chain the service builds.
    expect(images.calls.map((call) => Object.keys(call)[0])).toEqual(['input', 'transform', 'output']);
    const transformCall = images.calls[1];
    const outputCall = images.calls[2];
    if (!transformCall || !outputCall) throw new Error('expected the transform + output calls');
    expect(transformCall.transform).toEqual({ width: 400 });
    expect(outputCall.output).toEqual({ format: 'image/webp' });
  });

  it('falls back to the original bytes over 20 MB — the Images binding is never invoked', async () => {
    const { token } = await signUpSession(url, 'thumb-fallback@sevendays.test');
    const row = await insertPhoto('covers/00000000-0000-4000-8000-000000000000.jpg');
    const bucket = stubMediaBucket({ size: 20 * 1024 * 1024 + 1, body: 'HUGE-ORIGINAL' });
    const images = stubImages();
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: bucket, IMAGES: images.binding })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(await res.text()).toBe('HUGE-ORIGINAL');
    expect(images.calls).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/media-routes`
Expected: FAIL — every route case gets the uniform 404 (nothing is mounted under `/api/v1/admin` yet), so the 401/400/200 assertions miss. (`signUpSession` itself passes — the issuer is independent of the routes.)

- [ ] **Step 3: Append `servePhotoThumbnail` to the service**

In `apps/api/src/services/media.ts`, extend the import block (biome orders them) and append the function at the end of the file:

```ts
import { galleryPhotos } from '@sevendays/db';
import type { Database } from '@sevendays/db';
import { eq } from 'drizzle-orm';
```

```ts
/**
 * The gated by-id thumbnail (GET /api/v1/admin/gallery-photos/:id/thumb):
 * resolve the row → stream the object → transform via the Images binding
 * (no public read path involved). Over the binding's documented 20 MB input
 * limit, fall back to the ORIGINAL bytes with the stored content type (the
 * ADR-0019 cap trade, made explicit — full-size display in the admin grid).
 * Returns null for a missing row OR a missing object — the route answers
 * the per-entity 404 either way.
 */
export async function servePhotoThumbnail(
  db: Database,
  env: Pick<Env, 'MEDIA_BUCKET' | 'IMAGES'>,
  id: string
): Promise<Response | null> {
  const [row] = await db
    .select({ r2Key: galleryPhotos.r2Key })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, id))
    .limit(1);
  if (!row) return null;
  const obj = await env.MEDIA_BUCKET.get(row.r2Key);
  if (!obj) return null;
  if (obj.size > MAX_THUMBNAIL_INPUT_BYTES) {
    return new Response(obj.body, {
      headers: { 'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream' },
    });
  }
  const result = await env.IMAGES.input(obj.body).transform({ width: THUMBNAIL_WIDTH_PX }).output({ format: 'image/webp' });
  return result.response();
}
```

- [ ] **Step 4: The three route files + the chained mount**

`apps/api/src/routes/admin.ts`:

```ts
import { Hono } from 'hono';
import { requireSession } from '../services/auth.js';
import type { ApiEnv } from '../services/db.js';
import { adminMedia } from './admin-media.js';
import { galleryPhotos } from './gallery-photos.js';

// The gated admin sub-app (M5 § Route topology): ONE requireSession at this
// root, so the uniform 401 envelope precedes every child route's validation
// (the M4 ordering precedent). Ticket #136 seeds the root with the media
// routes; #137 extends this same sub-app with the entity routers — no
// re-mount, no second gate. Chained registration (ADR-0006 Hono RPC): see
// routes/branches.ts — a statement-style registration would silently drop
// the subtree from AppType.
export const admin = new Hono<ApiEnv>()
  .use('*', requireSession)
  .route('/media', adminMedia)
  .route('/gallery-photos', galleryPhotos);
```

`apps/api/src/routes/admin-media.ts`:

```ts
import { mediaPresignRequestSchema } from '@sevendays/types';
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { presignUpload } from '../services/media.js';
import { validatedJson } from '../services/validator.js';

// POST /presign (M5 #136, ADR-0019): purpose + contentType in → a server-
// assigned staging key + a type-enforced upload URL out. Size is not
// declarable (the schema has no such field); the commit is the size gate.
// Failure map: validator 400 (unsupported type, with field details) |
// MissingR2CredentialsError → the uniform 500 via the root onError. Mounted
// behind the admin root's requireSession — see routes/admin.ts.
export const adminMedia = new Hono<ApiEnv>().post(
  '/presign',
  validatedJson(mediaPresignRequestSchema),
  async (c) => c.json(await presignUpload(c.env, c.req.valid('json')))
);
```

`apps/api/src/routes/gallery-photos.ts`:

```ts
import { z } from 'zod';
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { notFound } from '../services/errors.js';
import { servePhotoThumbnail } from '../services/media.js';
import { validatedParam } from '../services/validator.js';

// Ticket #136 seeds this router with the by-id thumbnail route only
// (keys stay server-side — the research's by-key sketch refined to by-id).
// #137's write model adds the entity CRUD here. z.uuid() is load-bearing
// (the appointments precedent): an unvalidated non-uuid would reach the uuid
// column and PG would reject it as 22P02 → an unhandled 500.
export const galleryPhotos = new Hono<ApiEnv>().get(
  '/:id/thumb',
  validatedParam(z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    const db = c.get('db');
    const response = await servePhotoThumbnail(db, c.env, id);
    if (!response) {
      return notFound(c, 'Photo not found.');
    }
    return response;
  }
);
```

In `apps/api/src/routes/v1.ts`, add to the import block (alphabetical — `admin` sorts before `addon-services`):

```ts
import { admin } from './admin.js';
```

and extend the registration chain (the sub-tree lands in v1's schema only through the chain):

```ts
  .route('/addon-services', addonServices)
  .route('/admin', admin);
```

- [ ] **Step 5: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **16 files / 153 tests passed** (143 + 10).

- [ ] **Step 6: Type-flow gate (AppType grew) + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck`
Expected: all green — `AppType` carries the new subtree (the `app-type.test.ts` expectTypeOf assertions enforce under typecheck), and the client package — which resolves `AppType` from the built `dist/` — still typechecks against it.
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/media.ts apps/api/src/routes/admin.ts apps/api/src/routes/admin-media.ts apps/api/src/routes/gallery-photos.ts apps/api/src/routes/v1.ts apps/api/test/media-routes.test.ts
git commit -m "feat(api): gated admin sub-app — presign + by-id thumb routes over requireSession (#136)"
```

---

### Task 6: The LIVE round-trip harness (runIf-gated — never a CI gate)

**Files:**
- Create: `apps/api/test/media-live.test.ts`

**Interfaces:**
- Consumes: Task 4's `presignUpload` + `commitUpload` (the REAL service code, no reimplementation); the R2 S3-API surface (sigv4 header-auth — aws4fetch sets `X-Amz-Content-Sha256: UNSIGNED-PAYLOAD` for s3 automatically, verified in the installed lib source); `LIVE_MEDIA_VERIFY=1` + `R2_S3_ACCESS_KEY_ID`/`R2_S3_SECRET_ACCESS_KEY`/`CLOUDFLARE_ACCOUNT_ID` from the environment.
- Produces: the executable proof of ticket ACs 3 + 4 against the real bucket — runnable by the controller/owner the moment the S3 token exists (the runbook's § Owner handoff names the exact command). Skipped in CI by construction: `describe.runIf` needs an explicit opt-in flag AND all three credential vars, so `pnpm check` never requires — never touches — live credentials (controller ruling 2b).

**Not here:** any mock-flavored duplication of the service (the harness drives the real `presignUpload`/`commitUpload` against the real bucket through a thin sigv4 adapter shaped as `R2Bucket`); any CI wiring (nothing anywhere invokes this file with creds); the teaser deployment itself (the harness runs from the operator's machine).

- [ ] **Step 1: Write the harness (whole file, verbatim)**

`apps/api/test/media-live.test.ts`:

```ts
import { AwsClient } from 'aws4fetch';
import { describe, expect, it } from 'vitest';
import { commitUpload, MAX_UPLOAD_BYTES, MEDIA_BUCKET_NAME, presignUpload } from '../src/services/media.js';

// LIVE media round-trip (ticket #136 ACs 3 + 4) — NOT a CI gate: the file
// skips unless LIVE_MEDIA_VERIFY=1 AND the real R2 S3-token trio is in env
// (the packages/db TEST_DATABASE_URL-gated blocks are the house precedent).
// It runs the REAL presign + commit service code against the REAL bucket:
// presign → PUT (minted Content-Type) → commitUpload promotes + deletes
// staging; a swapped Content-Type PUT must fail the signature; an over-cap
// object must be deleted and answered 400-shaped. Invocation (controller /
// owner only — docs/media-bucket-runbook.md § Live round-trip verify):
//
//   cd apps/api && LIVE_MEDIA_VERIFY=1 \
//     R2_S3_ACCESS_KEY_ID=… R2_S3_SECRET_ACCESS_KEY=… CLOUDFLARE_ACCOUNT_ID=… \
//     pnpm test -- media-live

const LIVE =
  process.env.LIVE_MEDIA_VERIFY === '1' &&
  !!process.env.R2_S3_ACCESS_KEY_ID &&
  !!process.env.R2_S3_SECRET_ACCESS_KEY &&
  !!process.env.CLOUDFLARE_ACCOUNT_ID;

const liveDescribe = describe.runIf(LIVE);

// Read ONCE (the guard above guarantees presence — the `as string` narrowing
// is the house pattern; no non-null assertions, biome flags those).
const ACCESS_KEY_ID = process.env.R2_S3_ACCESS_KEY_ID as string;
const SECRET_ACCESS_KEY = process.env.R2_S3_SECRET_ACCESS_KEY as string;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID as string;

// A sigv4 adapter shaped as the R2Bucket the service expects — header-signed
// requests to the S3-compatible endpoint, so the REAL commitUpload code runs
// unchanged against the REAL bucket. aws4fetch signs s3 requests with
// UNSIGNED-PAYLOAD automatically (verified against the installed 1.0.20).
function liveBucket(): R2Bucket {
  const client = new AwsClient({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const base = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${MEDIA_BUCKET_NAME}`;
  const head = async (key: string) => {
    const res = await client.fetch(`${base}/${key}`, { method: 'HEAD' });
    if (!res.ok) return null;
    return {
      key,
      size: Number(res.headers.get('content-length') ?? '0'),
      httpMetadata: {
        contentType: res.headers.get('content-type') ?? undefined,
        cacheControl: res.headers.get('cache-control') ?? undefined,
      },
    };
  };
  return {
    head,
    async get(key: string) {
      const res = await client.fetch(`${base}/${key}`, { method: 'GET' });
      if (!res.ok || !res.body) return null;
      const meta = await head(key);
      if (!meta) return null;
      return { ...meta, body: res.body };
    },
    async put(key: string, value: unknown, options: unknown) {
      const httpMetadata = (options as { httpMetadata?: Record<string, string> })?.httpMetadata ?? {};
      const headers = new Headers();
      if (httpMetadata.contentType) headers.set('content-type', httpMetadata.contentType);
      if (httpMetadata.cacheControl) headers.set('cache-control', httpMetadata.cacheControl);
      const res = await client.fetch(`${base}/${key}`, {
        method: 'PUT',
        headers,
        body: value as ReadableStream,
      });
      if (!res.ok) throw new Error(`S3 PUT ${key} failed: ${res.status}`);
      return { key } as R2Object;
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) {
        const res = await client.fetch(`${base}/${key}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`S3 DELETE ${key} failed: ${res.status}`);
      }
    },
  } as unknown as R2Bucket;
}

const env = () => ({
  R2_S3_ACCESS_KEY_ID: ACCESS_KEY_ID,
  R2_S3_SECRET_ACCESS_KEY: SECRET_ACCESS_KEY,
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
});

liveDescribe('live media round-trip (REAL bucket — controller/owner only)', () => {
  it('presign → PUT (minted Content-Type) → commitUpload HEAD-verifies, promotes, deletes staging', { timeout: 120_000 }, async () => {
    const bucket = liveBucket();
    const { key, uploadUrl } = await presignUpload(env(), { purpose: 'gallery-photo', contentType: 'image/jpeg' });
    const bytes = crypto.getRandomValues(new Uint8Array(1024));
    const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: bytes });
    expect(put.status).toBe(200);
    expect(put.headers.get('etag')).toBeTruthy();
    const result = await commitUpload(bucket, { stagingKey: key, purpose: 'gallery-photo' });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}: ${result.message}`);
    expect(result.finalKey).toMatch(/^gallery\/[0-9a-f-]{36}\.jpg$/);
    const finalObj = await bucket.head(result.finalKey);
    expect(finalObj).not.toBeNull();
    expect(finalObj?.httpMetadata?.cacheControl).toContain('immutable');
    expect(await bucket.head(key)).toBeNull();
    // cleanup: the harness owns its object — never leave test rows in the shared bucket
    await bucket.delete(result.finalKey);
    expect(await bucket.head(result.finalKey)).toBeNull();
  });

  it('a PUT with a swapped Content-Type fails the signature (403) — type is enforced at presign', { timeout: 120_000 }, async () => {
    const bucket = liveBucket();
    const { key, uploadUrl } = await presignUpload(env(), { purpose: 'gallery-photo', contentType: 'image/jpeg' });
    const swapped = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: crypto.getRandomValues(new Uint8Array(64)),
    });
    expect(swapped.status).toBe(403);
    expect(await swapped.text()).toContain('SignatureDoesNotMatch');
    const result = await commitUpload(bucket, { stagingKey: key, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
  });

  it('an object over the 50 MiB cap is deleted from the bucket and answered 400-shaped', { timeout: 180_000 }, async () => {
    const bucket = liveBucket();
    const { key, uploadUrl } = await presignUpload(env(), { purpose: 'gallery-photo', contentType: 'image/jpeg' });
    // The presigned PUT cannot carry a size condition — the over-cap object LANDS.
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: new Uint8Array(MAX_UPLOAD_BYTES + 1),
    });
    expect(put.status).toBe(200);
    const result = await commitUpload(bucket, { stagingKey: key, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cap_violation');
    expect(result.details?.[0]?.path).toEqual(['key']);
    expect(await bucket.head(key)).toBeNull();
  });
});
```

- [ ] **Step 2: Verify the skip state (the SDD gate — the worker has no creds and MUST NOT acquire them)**

Run: `pnpm --filter @sevendays/api test`
Expected: **17 files / 153 tests passed + 3 skipped** (the media-live block skipped — `describe.runIf(false)`). If the file RUNS, `LIVE_MEDIA_VERIFY` or a credential var leaked into the environment — STOP, find the leak, never exercise the live path from CI or the SDD worker.

- [ ] **Step 3: Biome + commit**

Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/test/media-live.test.ts
git commit -m "test(api): LIVE media round-trip harness — presign/commit against the real bucket, runIf-gated (#136)"
```

(The live RUN itself is the owner's Step 5 in the runbook's § Owner handoff — executed after the token mint, never in CI.)

---

### Task 7: Full gates + docs rotation + PR/merge + v1 pick + issue close

**Files:**
- Modify: `docs/plan.md` (M5 checkbox 1 — this ticket owns it exclusively), `docs/progress.md` (What Exists entry), `AGENTS.md` (one appended sentence), `docs/agents/v1-picks.md` (ledger row, post-merge)

**Interfaces:**
- Consumes: every prior task green; Task 1's controller steps COMPLETE (the hard ordering gate — the merge's auto-deploy needs the bucket + GitHub environment vars in place).

**Not here:** any further code edits (bug fixes after Task 6 land as their own pinned commits — no silent scope growth); the seed-contract note and `cms-reflection.mjs` (#143); the four owner strings and two token decisions.

- [ ] **Step 1: The full gate**

Run: `pnpm check`
Expected: **35/35 turbo tasks**; `packages/types` = 13 files / 112 tests; `packages/api` = 17 files / 153 passed + 3 skipped; landing/db suites unchanged. If any count drifted, reconcile against the per-task pins above — do not loosen assertions.

- [ ] **Step 2: Tick the roadmap checkbox (this ticket's exclusively)**

In `docs/plan.md`, replace the M5 block's line:

```text
- [ ] Media foundation: the `sevendays-media` bucket + the owner runbook per ADR-0019 (CORS for the admin origins, `tmp/` lifecycle GC, r2.dev dev URL, scoped S3-token secrets, `MEDIA_PUBLIC_BASE_URL`); `MEDIA_BUCKET` + `IMAGES` bindings and aws4fetch presigning in `apps/api`; commit = binding HEAD-verify → promote to an immutable final key → delete-on-violation
```

with:

```text
- [✅] Media foundation: the `sevendays-media` bucket + the owner runbook per ADR-0019 (CORS for the admin origins, `tmp/` lifecycle GC, r2.dev dev URL, scoped S3-token secrets, `MEDIA_PUBLIC_BASE_URL`); `MEDIA_BUCKET` + `IMAGES` bindings and aws4fetch presigning in `apps/api`; commit = binding HEAD-verify → promote to an immutable final key → delete-on-violation _(2026-09-26: ticket #136 landed — bucket + CORS/lifecycle/r2.dev provisioned per `docs/media-bucket-runbook.md` (controller-run; the scoped S3-token secrets stay OWNER-PENDING via the runbook's § Owner handoff — the Worker boots and serves without them, presign fails loudly); `MEDIA_BUCKET` + `[images]` bindings live (wrangler 4.127.1 schema: `[images]` takes `binding` only, no cache block); aws4fetch 1.0.20 presign signs the Content-Type (`allHeaders: true` is load-bearing — the lib's UNSIGNABLE_HEADERS would silently skip it); commit verify/promote/violation-delete contract + gated presign/thumb routes behind ONE `requireSession` at `/api/v1/admin`; LIVE round-trip harness runIf-gated, not a CI gate; api suite 122→153 (+3 gated skips), types 105→112)_
```

Checkboxes 3–9 stay unticked (#137+ own them).

- [ ] **Step 3: AGENTS.md — one appended sentence**

In `AGENTS.md`, extend the bullet starting `- **The DB is provisioned, the catalog is seeded, and auth is wired in.**` by appending after `docs/staff-provisioning.md` is the runbook.`:

```text
 The `sevendays-media` bucket is provisioned and the API's media seam is wired (M5 ticket 02): `MEDIA_BUCKET` + `IMAGES` bindings, the session-gated presign endpoint and commit contract, thumbnails over the Images binding — `docs/media-bucket-runbook.md` is the bucket runbook, including the owner handoff for the scoped R2 S3-token secrets.
```

- [ ] **Step 4: progress.md — the What Exists entry**

Insert a new bullet in `docs/progress.md`'s What Exists section (the M4 ticket-05 entry is the format precedent; newest entry at the top of the section, matching its ordering):

```text
- **M5 ticket 02 — media foundation (#136):** the ADR-0019 pipeline is executable and provisioned. `sevendays-media` is live (controller-run one-time setup recorded in `docs/media-bucket-runbook.md`: CORS for the three admin origins — localhost:3000, `sevendays-admin.pahamajulius.workers.dev`, `sevendays-v1-admin.pahamajulius.workers.dev` — PUT + content-type + exposed ETag; the `tmp-gc` lifecycle rule expiring `tmp/` after 1 day; the r2.dev Public Development URL enabled and captured as `MEDIA_PUBLIC_BASE_URL`). `apps/api` carries the `MEDIA_BUCKET` + `IMAGES` bindings (wrangler 4.127.1 schema: `[images]` takes `binding` only), `aws4fetch@1.0.20`, the grown env schema (bindings + `CLOUDFLARE_ACCOUNT_ID`/`MEDIA_PUBLIC_BASE_URL` REQUIRED, the R2 S3-token pair OPTIONAL with the loud `MissingR2CredentialsError`), the media service (`presignUpload` — Content-Type signed via `allHeaders: true`, the spike-pinned aws4fetch requirement; `commitUpload` — HEAD-verify → 50 MiB/image/jpeg caps → immutable promote `covers/`/`gallery/<uuid>.jpg` → delete staging → typed 400s with field details, the foreign-key gate refusing non-`tmp/` keys WITHOUT deleting), and the gated `/api/v1/admin` sub-app root (ONE `requireSession`) with `POST /admin/media/presign` + `GET /admin/gallery-photos/:id/thumb` (width-400 webp, >20 MB falls back to the original). CI passes the two plain vars to both api deploys via `--var` from the GitHub environments and syncs the S3 pair fail-soft. Tests: commit contract over binding-shaped stubs + the HTTP 401-before-validation/400/500/thumb behavior (api 122→153) and the LIVE round-trip harness (`runIf`-gated on `LIVE_MEDIA_VERIFY=1` + the credential trio — never a CI gate). NOT landed (owner-pending, minutes via the runbook § Owner handoff): the scoped R2 S3 token mint + secret puts; agent rulings for morning review: runbook-doc home, `runIf` harness over a standalone script, thumb cache-header abstention, foreign-key no-delete gate.
```

- [ ] **Step 5: graphify + branch hygiene**

Run: `graphify update .` (code was modified — the AGENTS.md rule). Confirm `git status` shows only the intended docs edits; commit them:

```bash
git add docs/plan.md AGENTS.md docs/progress.md
git commit -m "docs: M5 ticket 02 — media foundation landed, runbook + status rotation (#136)"
```

- [ ] **Step 6: PR + merge (after confirming Task 1's controller steps are complete)**

```bash
gh pr create --title "feat: M5 ticket 02 — media foundation (bucket, bindings, presign + commit seam)" --body "Implements #136 (ADR-0019 media pipeline). Controller-run bucket provisioning recorded in docs/media-bucket-runbook.md incl. the owner handoff for the pending R2 S3-token mint. Bindings + env wiring, aws4fetch presign (Content-Type signed — allHeaders: true), commit verify/promote/violation-delete contract, gated presign + by-id thumb routes, runIf-gated LIVE round-trip harness. Agent rulings (owner-review pending) listed in the plan + PR. pnpm check 35/35; api 153 tests + 3 gated skips; types 112."
gh pr merge --squash --delete-branch
```

The push to main fires `deploy-teaser`: it deploys `sevendays-api` with the `--var` legs (Task 1's GitHub environment variables must exist — the Global Constraint) and skips the S3-pair sync with a notice (owner-pending). The authoritative verification is the deploy job going green (the env schema now REQUIRES the two vars — a deploy missing them fails every `/api/v1` request, which the job's own success plus the schema gate makes visible):

```bash
gh run watch $(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId' -R jeius/sevendays) -R jeius/sevendays
```

Expected: the `deploy-teaser` job succeeds (check → deploy api with the `--var` legs → the R2 secret sync prints its skip notice). If the `sevendays-api` Worker's workers.dev URL happens to be enabled, two read-only spot checks add belt to the suspenders — `curl -s https://sevendays-api.pahamajulius.workers.dev/health` → `{"status":"ok"}`, and an anonymous presign probe `curl -s -o /dev/null -w '%{http_code}' -X POST https://sevendays-api.pahamajulius.workers.dev/api/v1/admin/media/presign -H 'content-type: application/json' -d '{"purpose":"gallery-photo","contentType":"image/jpeg"}'` → `401` (the gated family live; NOT 404 — mounted — and NOT 500). If the workers.dev URL is disabled for the api Worker, the CI run alone stands as the verification.

- [ ] **Step 7: The v1 pick + ledger row (per `docs/agents/v1-picks.md`, main-only docs stay behind)**

In the v1 seed clone (`~/Projects/sevendays-v1-seed`, branch `v1`), cherry-pick the squash commit and triage per the runbook. Expected classes (the audit is the authority):

- **PICK:** `apps/api/src/services/media.ts` + test, the three route files + `v1.ts` edit, `apps/api/src/env.ts`/`env.test.ts`/`test/helpers/env.ts`, `apps/api/test/media-routes.test.ts` + `media-live.test.ts`, `packages/types/src/media.*` + `index.ts` edit, `apps/api/package.json` + `pnpm-lock.yaml` (aws4fetch), `apps/api/.dev.vars.example`.
- **SPLIT:** `apps/api/wrangler.toml` — the v1 file's `name` is `sevendays-v1-api`; re-apply the `[[r2_buckets]]` + `[images]` blocks and comment blocks verbatim under the v1 name (ADR-0019 #5: both editions bind the shared bucket). `.github/workflows/ci.yml` — re-apply the deploy-leg edits on the `deploy-v1` job (the file may be byte-identical between editions; if identical, it rides as PICK).
- **SKIP (main-only):** `docs/media-bucket-runbook.md` (owner runbook docs are main-only per the seed ruleset), `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, this plan file.

Gate the pick: `cd ~/Projects/sevendays-v1-seed && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` → exit 0 (all new files are booking-free by construction). Then the ledger row in `docs/agents/v1-picks.md` on main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — M5 ticket 02 media split picked (#136)"
```

- [ ] **Step 8: Close the ticket with the owner-handoff note**

The PR's `Closes #136` auto-closes on merge; post the closing comment (the owner's morning read):

```text
Landed. Owner-pending (minutes, not blockers): the scoped R2 S3 token is unminted — docs/media-bucket-runbook.md § Owner handoff has the exact dashboard steps + the wrangler/gh secret commands for both Workers and both GitHub environments; until then every route serves and only presign fails loudly (the uniform 500). When minted, prove AC-3/AC-4 live with the runbook's § Live round-trip verify command (3 tests against the real bucket — not a CI gate). Agent rulings for your review: runbook-doc home (docs/media-bucket-runbook.md), the live harness as a runIf-gated vitest file, thumb responses carry no cache headers, the foreign-key commit gate (non-tmp/ keys 400 WITHOUT delete). AC-1's secrets/vars legs: vars are set (GitHub environments teaser+v1); the S3-token legs complete via the handoff.
```

---

