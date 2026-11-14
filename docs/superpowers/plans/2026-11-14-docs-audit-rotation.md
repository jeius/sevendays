# Docs-audit rotation — the free set — implementation plan

**Goal:** Land the 2026-11-14 repo-docs-audit's free-set findings as doc commits: rotate `docs/architecture.md` and `docs/tech-stack.md` from their M2-era state to the verified post-M7-close reality, correct `AGENTS.md`'s one stale migration literal, annotate `docs/PRD.md` + ADR-0018 + `docs/staff-provisioning.md` (annotation-only where a ruling holds scope), and rotate `docs/progress.md`'s four stale sections (Current Milestone, Known Gaps purge per the 2026-09-04-approved pattern, Immediate Next Steps, the undated What-Exists toolchain cluster). Zero code/schema/test changes.

**Spec:** the 2026-11-14 docs audit (full report in that session; every DRIFTED finding below carries its file:line from the audit, re-verified against HEAD `632eae1`). Executed under issue #277 (filed at execution per Task 1).

**Architecture:** docs-only. Touched files: `docs/architecture.md`, `docs/tech-stack.md`, `AGENTS.md`, `docs/PRD.md`, `docs/adr/0018-two-role-staff-model.md`, `docs/staff-provisioning.md`, `docs/progress.md`. Nothing else — not `docs/plan.md`, not any code/config file. `docs/progress.md` and `docs/plan.md` are main-only paths (ledger precedent, rows #243–#276) — they carry no v1 pick; the other five + the ADR are shared client-safe docs and ride Task 8's triage.

## Global Constraints

- Branch `docs/2026-11-14-audit-rotation` off current `main`; commit style `docs(scope): subject (#<issue>)` (the `docs(v1-picks):` precedent). Never commit secrets. Tick checklist boxes `- [✅]` (✅ emoji), never plain `[x]` — the AGENTS.md engineering rule.
- **Every find/replace below must match exactly once at execution time** — a ≠1 match means the file drifted since this plan was written; stop and reconcile against the drifted reality before proceeding (the audit's evidence is dated 2026-11-14 @ `632eae1`).
- All floors, counts, and status literals pinned in this plan were **verified live 2026-11-14** (`pnpm check` 35/35 with positive test counts on the 5433 test DB; `pnpm build` 7/7; `pnpm --filter @sevendays/landing start` silent-exit probe). Do not "improve" a pinned literal from memory — the pinned value is the audited value.
- Gates: final `pnpm check` green with **every floor unchanged** — api 33 files (32 passed + 1 skipped) / 457 passed + 3 skipped; types 18 files / 188 tests; db 4 files (2+2s) / 22 passed + 8 skipped; api-client 5 files / 45 tests; landing 17 files / 134 tests; admin 27 files / 296 tests. This plan adds no tests and changes no code — a moved floor means something else drifted: stop and reconcile.
- **Booking-token guard:** `docs/architecture.md` and `docs/tech-stack.md` are seed-flagged files (the #78 export-audit list names their booking/Resend prose). Every edit below is outside the booking clusters. After all edits: `git diff main -- docs/architecture.md docs/tech-stack.md` must show **zero hunks inside `architecture.md`'s "Data Flow: Booking a Shoot" section and zero hunks inside `tech-stack.md`'s "## Email" section**, and zero ADDED lines matching `/book|resend|appointment/i` in either file's diff (the Data Flow § keeps its booking prose on main by design — ADR-0015's audit expects those tokens on main).
- `graphify update .` is **not** needed — the rule covers code changes; this plan touches none.
- Per the writing-plans house rule, every produced doc text is fenced verbatim; relocated text (Task 6's move-ins) is moved byte-verbatim from the file, never retyped.

### Not here

- **No `docs/staff-provisioning.md` demotion** — the demotion to bootstrap/break-glass is #222's payload (plan.md reset-email box; AGENTS.md "until #222's demotion"). This plan adds a dated annotation only.
- **No `docs/plan.md` edits.** The M6 production-smoke box (`docs/plan.md:153`) stays unticked — the paused #192 close-out owns the M6 box flips. The M7 reset-email box stays as-is with its held-open annotation.
- **No package.json/start-script fix** — the stale `start` scripts stay a documented Known Gap (item 1 of the new list); fixing them is a code change outside this docs set.
- **No ADR decision changes** — ADR-0018 gets a dated status note only; no other ADR is touched. No ADR-0024 resurrection, no ADR numbering changes.
- **No edits to `docs/progress.md`'s top ledger** (the dated 2026-11-13 entries at the file's top) and none to "Gate status", "Milestone 1 gate", or "Notes for Future Sessions" — those are current or historical-accurate.
- No code, schema, types, test, workflow, or visual-baseline changes; no `graphify-out/` edits.

---

### Task 1: file the execution issue

**Files:** none on disk (a GitHub issue via `gh`).

- [ ] **Step 1: create the issue** — exact command:

  ```bash
  gh issue create --label ready-for-agent --title "Docs audit 2026-11-14 — rotate the drifted narrative docs (free set)" --body "$(cat <<'EOF'
  The 2026-11-14 repo-docs-audit (HEAD 632eae1, clean tree) verified all gates live — pnpm check 35/35 (api 457+3s, types 188, db 22+8s, api-client 45, landing 134, admin 296), pnpm build 7/7 — and found the code, ADRs, AGENTS.md, plan.md, and the v1-picks ledger mutually consistent. The drift is concentrated in docs that were never rotated past the M2 era.

  This ticket lands the FREE set (nothing blocked on an owner ruling):

  1. docs/architecture.md — 11 stale sites (R2 "(planned)", "Auth (planned, not yet wired up)", media resolution "not yet decided", logging/Sentry/PostHog "planned/scaffolded", the M1.4 route enumeration, "frontends never touching the database", the deployment-table R2 note, the M1.3 migrations note).
  2. docs/tech-stack.md — 6 stale sites (Loglayer "not yet wired in", migrations 0000–0004, R2 binding "commented out", Sentry "api needs its own setup", PostHog "scaffolded", owner-CLI-only resets).
  3. AGENTS.md:47 — "migrations 0000–0010 applied" → 0000–0014.
  4. docs/PRD.md — dated annotations for the pre-ADR-0018 role lines.
  5. docs/adr/0018 — dated status note (the M5.5-shaped Users tab shipped #221).
  6. docs/staff-provisioning.md — dated annotation ONLY ("There is no email flow" is false since #221); the demotion itself stays #222's.
  7. docs/progress.md — Current Milestone + Immediate Next Steps rewritten to the post-M7-close state; Known Gaps purged per the 2026-09-04-approved pattern (landed bullets moved verbatim into What Exists; open items re-verified against code); the undated What-Exists toolchain cluster updated.

  Fences: no plan.md edits (the M6 smoke box flip belongs to the paused #192 close-out); no staff-provisioning demotion (#222's); no start-script code fix; no ADR decision changes.

  Plan: docs/superpowers/plans/2026-11-14-docs-audit-rotation.md
  EOF
  )"
  ```

- [ ] **Step 2: record the number** — write the new issue number into this plan file's **Spec:** line ("issue #NNN filed at execution") and commit the plan file with the branch's first commit.

---

### Task 2: `docs/architecture.md` — rotate to current reality

**Files:**
- Edit: `docs/architecture.md`

Eleven edits, each pinned old→new. Every old string must match exactly once.

- [ ] **Step 1 (§ System Overview, line 5 — the "never touching the database" absolute):**

  ```text
  OLD: Every database touch goes through `apps/api` + `packages/db`; the frontends depend only on shared packages (`packages/types`, `packages/api-client`, `packages/ui`) and shared config, so data shapes stay consistent without the frontends ever touching the database or hand-rolling API calls.
  NEW: Every database touch on the product's data path goes through `apps/api` + `packages/db`; the frontends depend on shared packages (`packages/types`, `packages/api-client`, `packages/ui`) and shared config, so data shapes stay consistent without hand-rolled API calls. Two sanctioned seams sit beside that path: the admin runs the BetterAuth auth server over `packages/db` (ADR-0004) and owns the ADR-0023 audit/metrics probes over it — `apps/landing` stays fully DB-free — and the one hand-rolled fetch anywhere is ADR-0021's internal reset-email forward over the `API` service binding.
  ```

- [ ] **Step 2 (§ diagram, the Supabase box):**

  ```text
  OLD: Supabase — provisioned, migrations applied, catalog seeded (M1.3, 2026-08-31)
  NEW: Supabase — provisioned; migrations 0000–0014 applied; catalog seeded (M1.3) and CMS-owned since M5 (the seed is bootstrap/dev-only)
  ```

- [ ] **Step 3 (§ diagram, the R2 note — both lines together):**

  ```text
  OLD:   Cloudflare R2 (planned) — package/portfolio images; uploads flow through
     apps/api (which holds the R2 binding), object keys referenced from Postgres.
  NEW:   Cloudflare R2 — the `sevendays-media` bucket (provisioned, M5): package/branch
     covers, the site logo, and gallery photos upload through apps/api (which holds
     the MEDIA_BUCKET binding), object keys referenced from Postgres, URLs resolved
     at read time (ADR-0019).
  ```

  (The OLD block's exact leading spaces are `   ` on line 1 and `   ` on line 2 — copy them from the file, not from this fence, if the fence mangles them.)

- [ ] **Step 4 (§ Module Boundaries, the apps/api bullet):**

  ```text
  OLD: - **`apps/api`** owns all writes to Postgres and all business logic (appointment status transitions, package activation rules, etc). Routes are thin; logic lives in the per-domain modules under `apps/api/src/services/*` (real routes since M1.4 — branches, service-packages, addon-services, appointments, all against live Postgres via `packages/db`).
  NEW: - **`apps/api`** owns all writes to Postgres and all business logic (appointment intake rules, catalog trim rules, deletion guards, etc). Routes are thin; logic lives in the per-domain modules under `apps/api/src/services/*` — the full public read chain (catalog, appointments, gallery, testimonials, site-settings; edge-cached per ADR-0025), the session-gated `/api/v1/admin` write subtree (nine entity routers with guarded DELETE, the media commit, the site-settings PUT, the submissions moderation), and the service-binding-only `/internal/reset-email` (ADR-0021), all against live Postgres via `packages/db`.
  ```

- [ ] **Step 5 (§ Data Flow, step 5's second sentence):**

  ```text
  OLD: The admin appointments dashboard is future work (v2): it will fetch `GET /api/v1/appointments` through the same `@sevendays/api-client` from its own server functions, cached by TanStack Query (ADR-0006).
  NEW: The admin appointments dashboard screen is future work (v2): it will consume the gated `GET /api/v1/appointments` list through the same `@sevendays/api-client` from its own server functions — that endpoint has been session-gated behind ADR-0004's `requireSession` since M4, and the admin's current `/` screen is the M6 Analytics Dashboard (ADR-0023), not the appointments table.
  ```

- [ ] **Step 6 (§ Auth — heading and body together):**

  ```text
  OLD: ## Auth (planned, not yet wired up)

  `apps/admin` will use BetterAuth for staff login. `apps/api` will verify BetterAuth sessions on any mutating admin route (package/branch edits, appointment status changes). `apps/landing`'s booking flow stays unauthenticated by design (see PRD — guest booking is a v1 requirement). Session sharing is decided: `apps/api` verifies the BetterAuth session token against the shared auth tables (ADR-0004), and all frontend→API calls run server-to-server through `@sevendays/api-client` (ADR-0006), so the session token never reaches browser JS.
  NEW: ## Auth (live since Milestone 4, 2026-09-23)

  `apps/admin` runs the BetterAuth auth server: email+password staff login at `/login` with self-serve sign-up disabled — users are provisioned through the owner-only Users tab (M7 #221), and the `create-staff` CLI remains the bootstrap/break-glass path until #222's demotion. Staff self-serve forgot-password sends its reset email over the `API` service binding to the guarded internal send endpoint (ADR-0021). `apps/api` verifies BetterAuth sessions on the gated routes: `requireSession` checks the `Authorization: Bearer` token against the shared auth tables (ADR-0004) and answers the uniform 401 envelope; the appointments single-get stays public by uuid-opacity and guest `POST /api/v1/appointments` stays unauthenticated by design (see PRD — guest booking is a v1 requirement). Session sharing: the session token never reaches browser JS — all frontend→API calls run server-to-server through `@sevendays/api-client` (ADR-0006), in production over the `API` service binding (ADR-0016).
  ```

- [ ] **Step 7 (§ Media Storage — the whole paragraph):**

  ```text
  OLD: Package cover images and portfolio photos are uploaded through `apps/api` (which will hold the R2 binding), initiated from the admin dashboard, and referenced by object key (not full URL) in Postgres (`service_packages.cover_image_key`). Both frontends resolve keys to a servable URL — the exact resolution strategy (public R2 bucket vs. signed URLs vs. a Worker route) is not yet decided; record the decision as an ADR when it's made, since it affects `apps/api`'s response shape.
  NEW: Package covers, branch covers, the site logo, and gallery photos are uploaded through `apps/api` (which holds the `MEDIA_BUCKET` + `IMAGES` bindings), initiated from the admin dashboard, and referenced by object key (not full URL) in Postgres. The resolution strategy is decided and implemented (ADR-0019, M5): presigned direct-to-R2 uploads with a verify/promote commit gate, object keys in the DB, absolute URLs resolved at read time against `MEDIA_PUBLIC_BASE_URL` (r2.dev for now; the custom-domain swap at ship is a var flip) — raw keys never leave the API. `docs/media-bucket-runbook.md` is the bucket runbook.
  ```

- [ ] **Step 8 (§ Observability, logging bullet):**

  ```text
  OLD: - **Logging:** `apps/api` uses Loglayer + Pino for structured logs (planned for M6 — the API currently uses Hono's built-in `logger()` middleware as a placeholder; see `docs/progress.md`).
  NEW: - **Logging:** `apps/api` logs via Loglayer + Pino into Workers Logs (live since M6, #183): five PII-free event classes, a per-request `requestId` echoed as `X-Request-Id`; the wildcard CORS middleware is dropped — browsers stay default-denied. `wrangler tail` is the live viewer.
  ```

- [ ] **Step 9 (§ Observability, errors bullet):**

  ```text
  OLD: - **Errors:** Sentry is scaffolded into all three apps via the TanStack CLI's `sentry` add-on (`landing`, `admin`) — `apps/api` will need Sentry added separately since it isn't a TanStack Start app.
  NEW: - **Errors:** Sentry is live on all three apps under one "sevendays" project (M6, #184): the api via `@sentry/cloudflare` (`withSentry` at `src/worker.ts`, the wrangler main), the frontends errors-only via one `src/instrument.ts` — errors-only everywhere since #263, `release` = the deployed git SHA via CI.
  ```

- [ ] **Step 10 (§ Observability, analytics bullet):**

  ```text
  OLD: - **Analytics:** PostHog is scaffolded into `landing` and `admin` via the CLI add-on. The booking funnel (view package → start booking → complete booking) is the primary metric to instrument — the flow itself is built (M2, closed 2026-09-10); the funnel events are not yet wired.
  NEW: - **Analytics:** PostHog's landing provider captures pageviews + web vitals (M6, #187 — the audience half of the admin's Analytics Dashboard reads them via HogQL); the admin's provider stays off by ruling. The booking funnel events (view package → start booking → complete booking) remain v2 payload.
  ```

- [ ] **Step 11 (§ Deployment Targets, the api row's note):**

  ```text
  OLD: Secrets set per environment via `wrangler secret put` — checklist in `docs/tech-stack.md` § Secrets Checklist; the R2 binding stays commented out until M5 (`apps/api/wrangler.toml`)
  NEW: Secrets set per environment via `wrangler secret put` — checklist in `docs/tech-stack.md` § Secrets Checklist; the R2 media bindings are live (M5: `MEDIA_BUCKET` + `IMAGES`, ADR-0019)
  ```

- [ ] **Step 12: verify** — `grep -n "planned\|not yet wired\|not yet decided\|will use BetterAuth\|will need Sentry\|scaffolded\|commented out until" docs/architecture.md` returns zero hits (the word "planned" legitimately survives nowhere in this file after the rotation).

---

### Task 3: `docs/tech-stack.md` — rotate to current reality

**Files:**
- Edit: `docs/tech-stack.md`

Six edits, each pinned old→new, each matching exactly once.

- [ ] **Step 1 (§ Backend, the Loglayer bullet):**

  ```text
  OLD: - **Loglayer + Pino** — structured logging. *Not yet wired in* — the API currently uses Hono's built-in `logger()` middleware as a placeholder. Swap this in when logging requirements firm up.
  NEW: - **Loglayer + Pino** — structured logging, **live since M6 (#183)**: five PII-free event classes into Workers Logs (3-day retention), a per-request `requestId` echoed as `X-Request-Id`; `wrangler tail` is the live viewer.
  ```

- [ ] **Step 2 (§ Data Layer, the Drizzle bullet):**

  ```text
  OLD: - **Drizzle ORM** (^0.45) — schema and query builder, lives in `packages/db`. Schema is written; migrations 0000–0004 are applied to the live database and the catalog is seeded (0002–0004 are the M2 studio-services/appointments wave) — see docs/progress.md.
  NEW: - **Drizzle ORM** (^0.45) — schema and query builder, lives in `packages/db`. Migrations 0000–0014 are applied to the live database; the catalog is seeded and CMS-owned since M5 (the seed is bootstrap/dev-only — `packages/db/README.md`) — see docs/progress.md.
  ```

- [ ] **Step 3 (§ Auth, the provisioning sentence):**

  ```text
  OLD: users are provisioned and reset by the owner CLI (`docs/staff-provisioning.md`);
  NEW: users are provisioned through the owner-only Users tab (M7 #221) and password resets are self-serve (forgot-password over the API service binding per ADR-0021); the owner CLI (`docs/staff-provisioning.md`) remains the bootstrap/break-glass path until #222's demotion;
  ```

  (The OLD fragment sits mid-line inside the § Auth bullet — match it exactly as the fragment, with its trailing `;`.)

- [ ] **Step 4 (§ Storage, the R2 bullet):**

  ```text
  OLD: - **Cloudflare R2** — object storage for portfolio and package images, referenced via a Workers binding in `apps/api/wrangler.toml` (commented out until the bucket is created: `wrangler r2 bucket create sevendays-media`).
  NEW: - **Cloudflare R2** — object storage, live: the `sevendays-media` bucket is provisioned and `apps/api/wrangler.toml` carries the `MEDIA_BUCKET` + `IMAGES` bindings (M5; ADR-0019 — presigned direct upload, verify/promote commit, keys in the DB, URLs resolved at read time). Runbook: `docs/media-bucket-runbook.md`.
  ```

- [ ] **Step 5 (§ Observability, the Sentry bullet):**

  ```text
  OLD: - **Sentry** — error monitoring, scaffolded into `apps/landing` and `apps/admin` via the TanStack CLI add-on. `apps/api` needs its own Sentry Workers SDK setup separately.
  NEW: - **Sentry** — live on all three apps under one "sevendays" project (M6 #184): the api via `@sentry/cloudflare` (`withSentry` at `src/worker.ts`), the frontends errors-only via `src/instrument.ts`; errors-only everywhere since #263 (`release` = the deployed git SHA via CI).
  ```

- [ ] **Step 6 (§ Observability, the PostHog bullet):**

  ```text
  OLD: - **PostHog** — product analytics, scaffolded into `apps/landing` and `apps/admin` via the TanStack CLI add-on.
  NEW: - **PostHog** — the landing provider captures pageviews + web vitals (M6 #187, feeding the admin Analytics Dashboard's Traffic half via HogQL); the admin's provider stays off by ruling. Booking-funnel events remain v2 payload.
  ```

- [ ] **Step 7: verify** — `grep -n "Not yet wired\|0000–0004\|commented out until\|needs its own Sentry\|scaffolded" docs/tech-stack.md` returns zero hits. **Do NOT touch the `## Email` section** (the Resend booking-confirmation paragraph is booking-cluster prose; the booking-token guard in Global Constraints checks it).

---

### Task 4: `AGENTS.md` — the migrations literal

**Files:**
- Edit: `AGENTS.md`

- [ ] **Step 1 (line 47, inside the DB-provisioned bullet):**

  ```text
  OLD: (migrations 0000–0010 applied, catalog seeded + verified; the M5 gallery/testimonials tables exist, CMS-born-empty)
  NEW: (migrations 0000–0014 applied, catalog seeded + verified; the M5 gallery/testimonials tables exist, CMS-born-empty — 0011 site_settings #215, 0012 testimonial_submissions #216, 0013 branch coordinates #248, 0014 Maps links #273)
  ```

- [ ] **Step 2: verify** — `grep -c "0000–0010" AGENTS.md` returns 0 and `grep -c "0000–0014" AGENTS.md` returns 1. (`AGENTS.md` on `v1` carries no floor/status section — the #242/#249/#268 precedent — so this hunk is expected to content-drop at the pick; Task 8 records that.)

---

### Task 5: the three annotations (PRD, ADR-0018, staff-provisioning)

**Files:**
- Edit: `docs/PRD.md`
- Edit: `docs/adr/0018-two-role-staff-model.md`
- Edit: `docs/staff-provisioning.md`

Annotations follow the house convention: dated, appended, never rewriting the historical line.

- [ ] **Step 1 (`docs/PRD.md` § Users, the admin/staff bullet):**

  ```text
  OLD: - **Admin/staff** — log in to the admin dashboard to manage appointments and edit site content. No distinction between roles in v1 (see "Future" below).
  NEW: - **Admin/staff** — log in to the admin dashboard to manage appointments and edit site content. No distinction between roles in v1 (see "Future" below). _(Annotated 2026-11-14: ADR-0018, 2026-09-24, later split staff into owner + staff — user management is owner-only (the Users tab, M7 #221), content surfaces stay all-staff; the original line stands as the pre-M4 record.)_
  ```

- [ ] **Step 2 (`docs/PRD.md` § Out of Scope, the per-branch-roles bullet):**

  ```text
  OLD: - Per-branch admin roles (today: any authenticated admin can see/edit everything).
  NEW: - Per-branch admin roles (today: any authenticated admin can see/edit everything). _(Annotated 2026-11-14: superseded in part by ADR-0018's owner/staff split — "any authenticated admin" is the pre-M4 record; per-branch roles remain future.)_
  ```

- [ ] **Step 3 (`docs/adr/0018-two-role-staff-model.md` — append a fifth item to the Decision section, immediately before `## Alternatives Considered`):**

  ```text
  OLD: ## Alternatives Considered
  NEW: 5. **_(Status note, 2026-11-14.)_** The M5.5-shaped surface this ADR awaited shipped 2026-10-19 (#221): the owner-only Users tab enforces the power boundary in the UI (ADR-0018's role gate — `role === 'admin'` server-side and in the nav), and staff-side forgot-password covers routine resets. The `create-staff` CLI remains the bootstrap/break-glass provisioning path — its `--role admin` default and the interim trailing `--role staff` rule stand for that path — until #222 demotes it formally.

  ## Alternatives Considered
  ```

- [ ] **Step 4 (`docs/staff-provisioning.md` — insert the annotation block immediately before `## Creating a staff user`):**

  ```text
  OLD: ## Creating a staff user
  NEW: > **Annotated 2026-11-14:** the self-serve forgot-password flow and the owner-only Users tab went live 2026-10-19 (#221) — routine user creation and password resets no longer require this CLI. This runbook remains the accurate record for the bootstrap/break-glass path it now is (first owner, lockout recovery, owner-side resets); its formal demotion to bootstrap + break-glass rides #222 (owner-ruled hold, 2026-11-05).

  ## Creating a staff user
  ```

- [ ] **Step 5: verify** — `grep -c "Annotated 2026-11-14" docs/PRD.md docs/staff-provisioning.md` returns 2 and 1 respectively; `grep -c "Status note, 2026-11-14" docs/adr/0018-two-role-staff-model.md` returns 1. The demotion text ("bootstrap + break-glass" as an INSTRUCTION, not an annotation) must NOT appear as a rewrite of the runbook's body — `git diff docs/staff-provisioning.md` must show only the added blockquote.

---

### Task 6: `docs/progress.md` — the four-section rotation

**Files:**
- Edit: `docs/progress.md`

The purge follows the 2026-09-04-approved pattern: landed/closed bullets move **verbatim** into What Exists (never delete the landing record), forward-binding watch-rulings consolidate into one numbered Known Gaps item, overlapping open bullets merge, and every remaining bullet is re-verified against code before it stays. The top ledger (the dated 2026-11-13 entries) is untouched.

- [ ] **Step 1: move the landed/closed bullets into What Exists, verbatim.** Cut these seven bullets from "## Known Gaps / Not Yet Done" and paste them unchanged (byte-verbatim — the git diff must show them relocated, not reworded) at the tail of "## What Exists", i.e. directly after the last What Exists bullet (the one ending `…both shared plan.md boxes tick with #224 annotations.`) and before the `## Known Gaps / Not Yet Done` heading:
  - the bullet beginning `- The api's **Application Log** is live (M6 #183, 2026-10-05):`
  - the bullet beginning `- The api's **Audit Log write side** is live (M6 #185, 2026-10-06):`
  - the bullet beginning `- The admin's **Analytics Dashboard** is live whole (M6 #186 + #187, 2026-10-07):`
  - the bullet beginning `- The api's **public-read edge cache** is live (2026-11-11, #263 — ADR-0025):`
  - the bullet beginning `- **M1.4 watch-items — moot today, both bind M2` (its tail carries the `**Resolved 2026-09-25 (#135)**` verdict — the whole bullet moves as the closed record)
  - the bullet beginning `- The previous project's tables (Payload CMS) were removed` (closed record — the M4-era naming note it carries resolved when M4 shipped)
  - the bullet beginning `- turbo.json passes through `DATABASE_URL`` (current-state config truth — its claim re-verified live against `turbo.json:4` at plan time; it belongs in the toolchain record, not under a not-yet-done heading)

- [ ] **Step 2: update the undated What-Exists toolchain cluster.** Four single-line replacements (the lines sit in the undated bullets block between the M2 pre-flight entries and the dependency-refresh line):

  ```text
  OLD: - `packages/types`: Zod **v4** schemas (`^4.5.1`, declared as devDep + peerDep) for `Branch`, `ServicePackage`, `Appointment` — stable, extend rather than replace. Upgraded from v3 workspace-wide on 2026-08-30.
  NEW: - `packages/types`: Zod **v4** schemas (`^4.5.1`, declared as devDep + peerDep) — the shared vocabulary for the whole surface: the nine catalog entities' row/create/update pairs + the atomic package save, the matrix/order payloads, the appointment schemas (exactly-one refine, nullable price snapshots), site settings (`SITE_SETTINGS_DEFAULTS` + `resolveSiteSettings`), testimonial submissions, the audit vocabulary, the media presign pair-checks + `MEDIA_UPLOAD_CAP_BYTES`, the branch Maps links, and `apiErrorSchema`. Upgraded from v3 workspace-wide on 2026-08-30; floor 18 files / 188 tests.
  ```

  ```text
  OLD: - `packages/db`: Drizzle schema for the same 3 entities (`drizzle-orm ^0.45.2`) + `createDbClient()` factory. M1.3 applied migration 0000 to the live Supabase database and seeded the catalog; `drizzle.config.ts` reads `DATABASE_MIGRATE_URL` (session-mode pooler) first. `db:push` script added; `tsconfig.build.json` emits `dist/`.
  NEW: - `packages/db`: Drizzle schema — the shared data model (catalog, appointments, the auth tables, gallery/testimonials, testimonial_submissions, site_settings, audit_log, the branch Maps columns) + `createDbClient()` factory (`prepare: false` per ADR-0007). Migrations 0000–0014 applied to the live Supabase database; the catalog is seeded and CMS-owned since M5 (the seed is bootstrap/dev-only — `packages/db/README.md`). Also exports the `catalog-rows` builders, `migrateDatabase`, the audit-read module (ADR-0023), and the metrics probes; floor 4 files (2+2s) / 22+8s.
  ```

  ```text
  OLD: - `packages/ui`: the shared design-system package (ADR-0017) — `@sevendays/ui/tokens.css` (the semantic token layer both apps import) plus the shadcn/Base-UI primitive library (#95: `shadcn add` routes into it; `button` live; `cn` from the `cn` package; check-pipelined over TSX source). The v3-era JS `tailwind-preset.ts` was deleted on 2026-08-30: the apps are Tailwind v4 (CSS-first) and cannot consume a v3 preset. Apps style via `@theme` in their own `styles.css`.
  NEW: - `packages/ui`: the shared design-system package (ADR-0017) — `@sevendays/ui/tokens.css` (the semantic token layer both apps import; its `.dark` block is the one dark source for both apps, M7 #217) plus the shared shadcn/Base-UI primitive library (22 primitives generated via `shadcn add` from either app; `cn` from the `cn` package; check-pipelined over TSX source), the ThemeProvider/ThemeToggle seam (#217), and `brand-icons` (#275). The v3-era JS `tailwind-preset.ts` was deleted on 2026-08-30: the apps are Tailwind v4 (CSS-first) and cannot consume a v3 preset. Apps style via `@theme` in their own `styles.css`.
  ```

  ```text
  OLD: - `apps/api`: Hono app — `/health` (real) plus the four `/api/v1` route sub-apps over service modules (real Postgres reads/writes since M1.4; see the M1.4 entry above). The Worker env is Zod-validated
  NEW: - `apps/api`: Hono app — `/health` (real) plus the versioned `/api/v1` chain over service modules: the public read chain (catalog, appointments, gallery, testimonials, site-settings; edge-cached per ADR-0025), the session-gated `/api/v1/admin` write subtree (nine entity routers with guarded DELETE, the media commit, the site-settings PUT, the submissions moderation), and the service-binding-only `/internal/reset-email` (ADR-0021). The Worker env is Zod-validated
  ```

  (The last OLD is a mid-line fragment — the bullet's tail, from `— `envSchema` + `parseEnv`…` onward, is still current and must survive untouched.)

- [ ] **Step 3: replace the `_Last updated:` marker** (the line beginning `_Last updated: 2026-09-30` — match the full line; it sits directly above `## Current Milestone`):

  ```text
  OLD: _Last updated: 2026-09-30 (#167/#168 — the owner audit's admin copy fixes: the Settings stub blurb is milestone-free (no more promising the closed M4), `StubScreen.milestone` optional; the v1 edition's admin hides the Dashboard/Appointments teasers via the #169 split pick — sidebar Overview group dropped, `/appointments` removed (404), `/` redirects to `/packages`. What Exists carries the entry.)_
  NEW: _Last updated: 2026-11-14 (docs-audit rotation: Current Milestone / Known Gaps / Immediate Next Steps rewritten to the post-M7-close state; the What-Exists toolchain cluster updated to current inventories; stale-gap bullets corrected — the disposition is the 2026-11-14 audit execution record. Previous marker: 2026-09-30, #167/#168.)_
  ```

- [ ] **Step 4: replace the entire `## Current Milestone:` paragraph** (it is a single ~1,900-char line beginning `## Current Milestone: v1 edition — Milestones 4 (Admin Auth) and 5 (Admin CMS) are complete` — that prefix is unique in the file; select the whole line and replace it with the section below):

  ```text
  ## Current Milestone: M7 post-flight + the paused M6 close-out (rotated 2026-11-14 by the docs audit)

  **Milestone 7 closed 2026-11-08 (#225)** — the owner demo accepted on both editions both themes; the demo's 16 fix-batch findings + the branch-Maps feature request are the **M7 post-flight** (issue #239). Post-flight T1–T9 are landed: #241 (landing polish), #242 (pending vocabularies + the dirty gate), #243 (gallery manager UX), #244 (Users-tab sessions display), #245 (the duplicate-save envelope fix), #246 (site-logo PNG + the 10 MiB cap), #247 (brand SVG icons + favicons), #248 (the branch Maps button — superseded by #273's Maps links, coordinates set aside), #275 (footer socials onto the copyright row); the harness-parity rounds landed alongside (#254 content-pages checks, #256 packages-pages checks, #255/#259 visual determinism + sentinels). Remaining post-flight work is owner-held: the interactive Site-tab/icon checks (#247/#275) and the visual re-captures on intent after deploy.

  **Milestone 6 is executed except its close-out.** Every M6 build box landed (#183–#190); the close-out **#192 is PAUSED at the client-domain wait since 2026-10-21** — Phase A + B1 complete (the dedicated accounts, the fresh DB + bucket, the dry-run deploy green, the media copied), all evidence in the owner-held walk log (`.scratch/192-ship-walk-log.md`); resume at Task 8 of `docs/superpowers/plans/2026-10-11-192-ship-milestone-closeout.md` once the client's domain is Active. #192 owns the remaining M6 plan.md box flips.

  **Held-open work:** #222 — the reset-email sending domain (owner-ruled hold 2026-11-05; it also demotes `docs/staff-provisioning.md` to bootstrap/break-glass and returns the email pair to v1's API env per ADR-0021). **M8 Handover** unstarted (owner pre-handover items only). **v2** uncommissioned.

  Every merge is triaged per `docs/agents/v1-picks.md` (the ledger is current through #276). Delivery is versioned per the 2026-09-11 editions restructure (spec issue #76, ADR-0015).
  ```

- [ ] **Step 5: replace the entire "## Known Gaps / Not Yet Done" section body** (everything between that heading and the `## Immediate Next Steps (in order)` heading) with:

  ```text
  ## Known Gaps / Not Yet Done

  _(Rotated 2026-11-14 per the standing purge pattern: landed-feature and closed-watch bullets moved verbatim into What Exists; each item below re-verified against code today. The M6-era live-feature records that used to sit here now live in What Exists above.)_

  1. **Both frontends' `start` scripts are stale for the CF-plugin apps** — `apps/landing/package.json` and `apps/admin/package.json` run `start: node dist/server/index.js`, but the built server entry is a Worker bundle, so `pnpm --filter @sevendays/<app> start` exits 0 silently (live-probed on the landing build 2026-11-14). Prod-shaped local serving is `wrangler dev --local` over the built output. Fix (or repoint to wrangler) at next touch of either package.json.
  2. **Branch phones are `TODO(seed)` placeholders** in `packages/db/scripts/catalog.ts` (`+63 900 000 00x`) — pending the client's real numbers; replace then re-run `db:seed`. **The 8R/8x10 merge confirmation also remains open at seed review** — the Print size description carries the client-confirmation note and the catalog endpoint serves it verbatim. Both are client-owned confirmations (the phones are handover-blocking per the M8 checklist).
  3. **M6 close-out (#192) is paused at the client-domain wait** — nothing to do until the domain is Active; see Current Milestone.
  4. **#222 holds two riders:** the Resend sending-domain verification + the end-to-end reset-email inbox check, and the formal `docs/staff-provisioning.md` demotion to bootstrap/break-glass (the file's 2026-11-14 annotation marks the interim posture).
  5. **v1 prod-DB migrations ride owner-side** — neither edition's `ci.yml` carries a migrate step, so migrations 0013/0014 reached v1's production database owner-side, outside any recorded run (the ledger's flags, rows #272/#274). If prod-DB migrations for picks are to be recorded going forward, the deployment runbook gains a line.
  6. **Forward-binding v2 watch-rulings** (consolidated; none binds today): (a) the intake transaction's isolation window — v2's availability check-then-insert MUST add `SELECT … FOR UPDATE` row locks when it joins the transaction (ADR-0005; the 2026-09-02 review ruling); (b) `groupChildren`'s aliasing docstring note is still unstated — the lookup returns live internal arrays for existing keys; state it at next touch of `apps/api/src/services/group-children.ts` (the candidate-B review, 2026-09-02); (c) `details: { reason }` may be added to the appointment 400 payloads if v2's dashboard needs machine-readable reasons (backward-compatible).
  7. **Owner-held interactive checks** from the post-flight: the admin Site-tab icon rows in both themes + the 320px no-overflow check (#247/#275), and the ADR-0022 visual re-captures on intent after deploy.
  ```

  (The superseded-bullet dispositions, for the record: the `turbo.json` passthrough bullet moves verbatim per Step 1 — its claim re-verified live against `turbo.json:4`; the "No dashboard user-management yet" bullet and the "per-app examples land with M2" bullet are deleted as factually superseded (the Users tab is live since #221; the per-app `.env.example` files landed in M2 #23/#24 — both truths already recorded in the ledger and plan.md); the "Watch-item rulings carried forward" bullet dissolves into item 6 — ruling (1) is item 6(b), ruling (2) is item 6(a), rulings (3)–(5) are resolved-by-decision (acquisition stayed before validation per ADR-0011's relocation note; `details: { reason }` is item 6(c); Hyperdrive was attempted and reverted, #260, superseded by ADR-0025).)

- [ ] **Step 6: replace the entire "## Immediate Next Steps (in order)" section** (everything from that heading through the italic superseded-records line just before `## Notes for Future Sessions`) with:

  ```text
  ## Immediate Next Steps (in order)

  1. **Resume #192 when the client's domain is Active** — Task 8 of `docs/superpowers/plans/2026-10-11-192-ship-milestone-closeout.md` onward (B2 domains+DNS, B3 the var flips + cutover commit + the v1 pick, B4 the production smoke, Task 11 the close-out). #192 owns every remaining M6 plan.md box flip; the #210 flag answer (the old dev-account v1-landing workers.dev `1042`) is still owed before close-out.
  2. **#222 when the sending domain lands** (owner-gated; seats after the ship domains per ADR-0021): the reset sender's swap to `no-reply@<domain>`, the DKIM verification + the end-to-end inbox check, the email pair's return to v1's API env + the pick-ruleset amendment, and the `staff-provisioning.md` demotion.
  3. **M7 post-flight residue** — whatever #239 triage surfaces next; the owner-held interactive checks ride the owner's demo passes.
  4. **M8 Handover** after the M6 close-out (the owner pre-handover items can start anytime: the handover doc, the export preparation + the audit dry-runs).

  _(Superseded steps, records kept: "Milestone 6 — Production Hardening & Observability" — executed 2026-10-05→10-10 via #183–#190, the close-out #192 paused at the client-domain wait; "Milestone 7 — Experience & CMS Maturation" — closed 2026-11-08 (#225), the post-flight running; earlier records live in What Exists above and in git history.)_
  ```

- [ ] **Step 7: verification greps** — all must hold:
  - `grep -c "M5.5" docs/progress.md` returns 0 (the stale user-management gap is gone);
  - `grep -c "Resolved 2026-09-25" docs/progress.md` returns 1 and its line is inside What Exists (the record moved, not deleted);
  - `grep -n "cut M7's execution tickets" docs/progress.md` returns nothing;
  - `grep -c "## Known Gaps" docs/progress.md` returns 1;
  - `git diff --stat docs/progress.md` shows insertions only in the four rotated regions plus the toolcluster lines — the top ledger (the 2026-11-13 entries) shows zero diff lines.

---

### Task 7: gates, booking-token guard, push + PR

**Files:** none new.

- [ ] **Step 1: the booking-token guard** — `git diff main -- docs/architecture.md docs/tech-stack.md` must show zero hunks inside `architecture.md`'s "Data Flow: Booking a Shoot" section and zero inside `tech-stack.md`'s "## Email" section, and `git diff main -- docs/architecture.md docs/tech-stack.md | grep -c "^+"` minus the expected new lines must show no added line matching `/book|resend|appointment/i` (case-insensitive). A hit = an edit crossed a booking cluster: stop, revert that hunk, re-do it fenced to the pinned site.
- [ ] **Step 2: gates** — `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green, 35/35 tasks, **every floor byte-identical** to Global Constraints (docs-only: any drift means an accidental code touch — `git status` must show only the seven doc files + this plan). `pnpm build` green 7/7 if anything build-adjacent was touched (it should not be — skip if `git status` is clean of code).
- [ ] **Step 3: push + PR** — _(amended at setup, ruled 2026-11-14: per-task commits, not the originally-pinned one-or-two grouping — each implementer commits its own task per the SDD commit-then-report contract; this step owns only push + PR.)_ Verify `git log --oneline main..HEAD` shows one `docs(...)` commit per landed task (each with `#277`), push the branch (`git push -u origin HEAD`), and open the PR with the audit's before/after summary as the body (`--body-file`); CI must be green (the check job).

---

### Task 8: post-merge — the v1 pick + ledger row

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row — main-side, post-merge)

- [ ] **Step 1: triage per `docs/agents/v1-picks.md`** — expected classification: **PICK/SPLIT** — `docs/progress.md` is main-only (dropped); `AGENTS.md`'s one-line hunk is expected to content-drop (v1's client-safe rewrite carries no migrations-status section — the #242/#249/#268 precedent); `docs/architecture.md`, `docs/tech-stack.md`, `docs/PRD.md`, `docs/adr/0018`, `docs/staff-provisioning.md` are client-safe doc content and pick. Run the path classifier (`node scripts/v1-triage.mjs <merge-sha>`) and follow the runbook's content pass — the edits introduce no booking tokens and no edition mechanics, so the content pass should be clean.
- [ ] **Step 2: execute the pick + locks** — frozen install + `pnpm build:packages` + api build; check green on the v1 test DB (`TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check`); `node scripts/audit-v1-absence.mjs HEAD` **exit 0 / PASS 0/18** over full history; superset check. Push; the run's `check` + `Deploy v1 (private)` green with `Deploy teaser (main)` skipped; live curls (v1 landing 200, `/book` 404).
- [ ] **Step 3: the ledger row** — one row in `docs/agents/v1-picks.md` naming the merge sha, the classification, the resolutions (the AGENTS.md content-drop if it lands that way), and the locks' evidence — the #276 row is the format template. Commit the row as `docs(v1-picks): #NNN ledger row - the docs-audit rotation (narrative docs rotated to the post-M7-close state)`.

---

## Self-review notes for the executor

- The plan's pinned literals were verified 2026-11-14 @ `632eae1`: floors from the live `pnpm check`; the `start` scripts from both `package.json` files; the `group-children` docstring's missing aliasing note from the file itself; `turbo.json:4` for the passthrough bullet; migration count from `packages/db/migrations/` (15 files, 0000–0014).
- If `docs/architecture.md` line numbers have shifted from the audit's (an intervening commit), the pinned OLD strings still hold — they are content-anchored, not line-anchored.
- The Known Gaps purge deliberately keeps seven items — nothing else in the old section survived verification as open.



