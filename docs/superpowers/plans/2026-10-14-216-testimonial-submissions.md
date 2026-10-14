# M7 Ticket 05 — The Public Testimonial Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Task 6 loads the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule) **but runs NO new owner-variants round**: the form page and the /about CTA are ALREADY owner-reacted compositions — the #164 redesign prototype's Round 4 closed on them verbatim (2026-10-01, "you may proceed"; `.scratch/2026-09-30-164-rulings.md` lines 34–38, branch `prototype/164-landing-redesign` tip files `routes/share-your-story.tsx` + `routes/about.tsx`). This ticket ports that ruled composition onto TODAY's landing primitives (the redesign ticket #224 upgrades the visual treatment later — the ticket's own AC says so). Tasks 1–5 carry no UI.

**Goal:** v1's only public write surface, both editions (ticket #216, spec § *Public testimonial form* — #161's ruling): a dedicated **`/share-your-story`** page on the landing (reached via a ruled CTA card on `/about`) asking only a quote + a name, with submissions **holding at the API** in a new `testimonial_submissions` table (`pending | accepted | rejected`) — nothing the public writes ever renders; a Testimonial exists only after staff accept, so the published catalog stays 100% staff-authored. Abuse posture, three legs: the **Workers Rate Limiting binding's first user** (`[[ratelimits]] RATE_LIMITER`, **5 per 60s per IP** — the owner-ratified reconciliation of the spec's "~5 per 10 min" against the binding's 10s/60s-only windows, 2026-10-14), a **honeypot** (`website` field — filled → silent discard with the success-shaped response), and the **length bounds** (quote 20–600 chars, person 2–80). The public `POST /api/v1/testimonial-submissions` answers **generically** (a fixed message, no row echo). Admin moderation behind the existing `requireSession` root: list (newest-first), **accept-with-edit** (optionally edited `{quote, person}`; the Testimonial appends at the end of render order via the existing `nextTestimonialPosition` max+1 rule, all in one transaction with the status flip + the audit row), **reject** (row retained as an audit trail), **delete regardless of status** (a submission references nothing). No CAPTCHA — Turnstile stays the written-down escalation. No notifications — the queue is the notification.

**Architecture:** Seven tasks: (1) `packages/db` — the `testimonial_submissions` table + its `testimonial_submission_status` pgEnum, `db:generate` → migration **0012**, `db:migrate` to the live shared DB, read-only probe proves 6 columns / zero rows; (2) `packages/types` — the wire module `testimonial-submission.ts` (bounds constants, create/status/read/accept schemas, the pinned generic-response constant), 9 new tests; (3) `apps/api` — the rate-limit binding end to end (`wrangler.toml` `[[ratelimits]]` + `env.ts` `RATE_LIMITER` + the always-allow `testEnv` stub + a recording `stubRateLimiter` helper + `tooManyRequests` in errors.ts), the `services/testimonial-submissions.ts` service (public insert; admin list/accept/reject/delete with audit rows under the widened vocabulary — entity `'testimonial-submission'`, actions `'accept'`/`'reject'` joining `AuditAction`, both enum widenings + the admin's two Record label walls in the SAME commit), the public POST route (gate order: limit → validation → honeypot-discard → insert → the generic 201) + the admin action router (the media presign/commit precedent), 11 new suite its + the admin-gate loop entry + a 401-before-validation pin + a mutation-log pin; (4) `packages/api-client` — the public create wrapper + the admin moderation group (list/accept/reject/remove), the mock's subtree, 6 loopback pins; (5) `apps/landing` seam — the IP-forwarding client (`getApiClientForwardingIp`, the admin's `fetchWithBearer` precedent — the API's limiter keys on `CF-Connecting-IP` else the landing-forwarded `X-Client-IP`), the `submitTestimonial` server fn, and `lib/testimonial-form.ts` (the pure bounds/gate/payload seam) with 8 lib-seam pins; (6) `apps/landing` UI — `routes/share-your-story.tsx` (the Round-4-ruled composition on today's `Label`/`Input`/`Textarea`/`buttonVariants` primitives, counter `n/600` per the SPEC's bound — not the prototype's 500 stub — plus the ruled success panel, the 429/generic failure lines) + the ruled CTA card on `/about` + the regenerated `routeTree.gen.ts`; (7) gates + docs rotation (plan.md's box stays unticked — the Submissions tab is #218's half) + PR/merge + the v1 pick (**pre-ruled PICK clean** by the spec's class ledger; the ledger's `[[ratelimit]]` spelling corrects to `[[ratelimits]]` in the row) + issue close + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes, **one migration** — drizzle-orm 0.45.2 + drizzle-kit 0.31.10 (the existing `db:generate`/`db:migrate` over `DATABASE_MIGRATE_URL` in `packages/db/.env`), zod 4.5.1, hono 4.13.5 (chained registrations — every edit below stays inside an existing chained expression), `@cloudflare/workers-types` **5.20260828.1** (probed live: the ambient `RateLimit` interface at `index.d.ts:15294` — `limit(options: { key: string }): Promise<{ success: boolean }>`, and `RateLimitOutcome` carries ONLY `success` — no `rate` field in the installed types), wrangler **4.127.1** (probed live against its `config-schema.json`: the binding key is **`ratelimits` (PLURAL)**, items require `name` + `namespace_id` + `simple = { limit, period }`, and `simple.period` is enum-locked to **10 or 60** seconds — the 600s window the spec nominalized does not exist in this schema), vitest 4 per-package, pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#216 "M7 ticket 05: the public testimonial form — hold-at-API + moderation endpoints"](https://github.com/jeius/sevendays/issues/216) (label `ready-for-agent`), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *Public testimonial form (#161)* is this ticket's ruling, User Stories 39–44 its acceptance, developer story 56 the binding-shaped-stub law; § *v1-pick classes* pre-rules the payload **PICK clean**; § *Testing Decisions* pins "submissions lifecycle (public POST bounds + generic response + honeypot discard; accept-with-edit appending at `nextTestimonialPosition` max+1; reject retention; delete-any-status), the rate-limited endpoint behind binding-shaped stubs (limit → the shaped rejection), `requireSession` ordering for every new route (401 before validation)" as api-suite law). The ticket's four acceptance criteria, verbatim: public POST bounds + generic response + honeypot discard pinned; the rate-limited gate tested behind binding-shaped stubs (limit → the shaped rejection) · accept-with-edit appends at the end of order; reject retains; delete-any-status — all pinned · 401-before-validation ordering for the admin routes · the form page serves on both editions (visual treatment upgraded by the redesign ticket). Key recon facts (2026-10-14, main `31025ec` — post-#215; every file below read this session):

- **The ruled form copy (the owner-approved source is the #164 prototype's Round-4 closure, verbatim from `.worktrees/164-landing-redesign/apps/landing/src/routes/share-your-story.tsx`):** route `/share-your-story`; `<title>` 'Share your story | Sevendays Photography'; h1 'Share your story'; intro 'Shot with us recently? A few words about your session help the next customer choose with confidence. Selected stories appear on our About page.'; labels 'Your experience' (placeholder 'What was your session like?', 5 rows) + 'Your name' (placeholder 'How should we credit you?'); honeypot label 'Website' (`id='story-website'`); submit 'Send my story' (disabled-until-valid); success panel: CheckCircle2 + h2 'Thank you — your story is on its way.' + body 'We read every submission. If we share yours, it appears with your name on the About page.' + outline 'Back to home'; 'Back to About' link. **The /about CTA card (same closure):** h3 'Shot with us recently?', line 'Share a few words about your session — we'd love to hear it.', primary button 'Share your story' with a `PenLine` icon → `/share-your-story`. Two deviations from the prototype are SPEC-driven and ruled here: the counter/`maxLength` follow the **spec's** 600 bound (the prototype's 500 was a pre-spec stub — a 500 counter would lie about the real bound), and `disabled-until-valid` now means the spec's min bounds (quote ≥ 20 trimmed, person ≥ 2 trimmed), not merely non-empty.
- **The owner-ratified copy (clarify call, 2026-10-14 — pin verbatim, labeled owner-ratified):** the 429 line **"You're sending too fast — please wait a minute and try again."** (the API's 429 error string; the form displays this exact string — one source) and the generic send-failure line **"Your story didn't send — please try again."**; the binding numbers **5 per 60s**. Two plan-pinned inline min lines carry `TODO(owner-copy)` markers per the house convention (ratify at the next owner touch): 'Tell us a little more — at least 20 characters.' / 'Your name needs at least 2 characters.'
- **The rate-limit key law (binding topology, decided here):** in production the landing calls the API over the `API` **service binding** (ADR-0016) — the browser NEVER calls the API (CORS stays default-denied, M6 #183's closed surface), so the edge's `CF-Connecting-IP` is ABSENT on binding-mediated requests. The limiter key resolves `c.req.header('CF-Connecting-IP') ?? c.req.header('X-Client-IP') ?? 'unknown'`: direct callers (curl to the workers.dev URL) get the unspoofable edge header and it WINS even if they also send `X-Client-IP`; landing-mediated calls carry `X-Client-IP` set by the landing's server fn from ITS OWN edge header (`getRequestHeaders().get('CF-Connecting-IP')`, `@tanstack/react-start/server` — the admin's cookie-forwarding precedent at `apps/admin/src/lib/api.server.ts:78-87`), a header the browser cannot set on this path. Dev/vitest: no edge headers exist → 'unknown' (all dev submissions share one bucket — acceptable; the suite stubs the binding anyway).
- **The hold-at-API law (spec-ruled, binding):** the public POST inserts `status: 'pending'` and answers the fixed generic body — **no row echo, byte-identical for real inserts and honeypot discards** (indistinguishable by construction). The public read surface NEVER serves submissions (no public GET exists or is built). Accept/reject both require `status = 'pending'` (a repeat accept would double-create a Testimonial; a repeat reject is a no-op write) — anything else answers the house 400 with a `['status']` detail. Delete works regardless of status. Nothing the public writes renders until a Testimonial exists via accept.
- **The audit law (#185 carried to the new vocabulary):** accept/reject/delete are committed admin mutations — ONE `audit_log` row per request, written inside the mutation's transaction, under the WIDENED vocabulary: entity `'testimonial-submission'`, actions `'accept'`/`'reject'` joining `AuditAction` (the `'delete'` precedent: #213 widened the enum for the guarded deletes; the enum is `packages/types/src/audit.ts:14`, today `create | update | deactivate | reorder | delete`). The accept's row rides the submission entity even though it also inserts the Testimonial (one row per REQUEST — the gallery-photo commit precedent: one row on the request's primary entity, `admin-gallery.ts:408-417`); `summary` = the person; reorder-style family-nulls do NOT apply (these are row-grain). The ephemeral `logAdminMutation` line carries `entity: 'testimonial-submission'`, `entityId = <submission id>` (`AdminMutationEntity = AuditEntity` widens for free). **Two Record walls force atomic edits**: `AUDIT_ENTITY_LABELS` AND `AUDIT_ACTION_LABELS` in `apps/admin/src/lib/audit/filters.ts` (both `Record<…, string>`) gain their entries in the SAME commit as the enum widenings. The public POST writes NO audit row (no session → no `AuditActor`; the Audit Log records staff mutations).
- **The route topology:** the public POST mounts on the v1 read chain (`routes/v1.ts` chains `.route(...)` per resource ending `.route('/admin', admin)`); the moderation router mounts behind the ONE `requireSession` at `routes/admin.ts`'s root (401 structurally precedes every child's validation). Action endpoints (`POST /:id/accept`, `POST /:id/reject`, `DELETE /:id`) per the media presign/commit precedent (`routes/admin-media.ts`); `GET /` lists the whole queue **newest-first** (`desc(createdAt), desc(id)`) — no query filter (a 3-person studio's volume; the #218 Submissions tab segments client-side). `nextTestimonialPosition` (admin-gallery.ts:207, max+1 over ALL rows) is **exported** and shared by the accept; the position computes BEFORE the transaction (the `createAdminTestimonial` precedent — single-writer admin, race accepted). The accept's insert + status flip + audit row share ONE transaction.
- **The blast radius (swept):** every change is additive. The env widening (`RATE_LIMITER` required) touches EVERY api test via `testEnv` — the helper gains the always-allow stub ONCE and all suites stay green (no other Env construction sites exist in the test tree). `truncateAll` derives its table list from the schema barrel (helpers/truncate.ts) — the new table truncates automatically once exported. The compose test DB migrates 0012 via `test/global-setup.ts`'s `migrateDatabase`. `cms-schema-contracts.test.ts` enumerates per-entity imports — nothing there joins automatically; the new types suite owns the submission contract (the #215 posture). `scripts/rehearsal-fixture.mjs` uses explicit column lists on other tables. The admin mock + loopback gain only what the new wrappers need. The seed touches no submissions row (born-empty everywhere). **The admin-gate sweep** (admin-gate.test.ts:25-35) loops GET over nine routers — the new router HAS a GET list, so it JOINS THE LOOP (the site-settings PUT-only exception does not apply). The audit viewer's filter options derive from the enums through the label walls — the #188 viewer picks the new entity + actions up without route work.
- **Sibling fences (spec § Sequencing; docs/plan.md M7 block; the ticket's own words):** NOT here, regardless of temptation: **the Submissions tab UI** — ticket #218 builds it over this ticket's endpoints ("The Submissions tab UI rides the interaction-system ticket (M7 ticket 07); this ticket delivers the table, the form page, and the endpoints" — so plan.md's "API + admin — the public testimonial form (#161)" box STAYS UNTICKED until #218 seats the tab; this ticket annotates, never ticks); **the form page's redesigned visual treatment** — #224 upgrades it (the ticket's fourth AC); **dark mode** — #217 (the page builds on tokens only, theme-ready by construction; the prototype's `dark:` classes are dropped in the port); **pending vocabulary** (spinner/'Saving…'/`aria-busy`) — #218's system (the submit button's disabled state is today's plain vocabulary); **upload UI maturation** — #220 (nothing here); **the Account/Users tabs + forgot-password** — #221; **the Resend/sending-domain work** — #222; **Turnstile/CAPTCHA** — written-down escalation only, never built here; **staff email notifications** — out (the queue is the notification); **booking-endpoint rate limiting** — v2's box (plan.md line 238 rides the SAME binding later; this ticket changes nothing there).
- **Baselines (live, per AGENTS.md post-#215):** types **16 files / 158 tests**; api **29 passed + 1 skipped files (30) / 397→408 passed + 3 skipped**; api-client **5 files / 39 tests**; admin **18 files / 195 tests**; landing **9 files / 84 tests**; db **4 files**. After this ticket: **types 17 / 167** (+1 file, +9 its), **api 30 passed + 1 skipped files (31) / 422 passed + 3 skipped** (+11 suite its +1 gate pin +1 mutation-log pin +1 routers-loop entry; corrected from 421 by the 2026-10-14 rulings), **api-client 5 / 45** (+6 loopback its), **admin 18 / 195 unchanged** (the two label entries are typecheck-forced; the filters suite derives its expectations from the enums), **landing 10 / 92** (+1 file, +8 seam its), **db 4 unchanged** (migrate.test replays 0012). Migrations **0000–0011** applied; this ticket generates **0012**. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)
- **The dev-db port wrinkle (this machine, verified 2026-10-12 via the #212/#213/#214/#215 sessions):** an unrelated project's container (`lactalink-test-db`) squats host port 5432. The sevendays compose db runs remapped: `printf 'services:\n  db:\n    ports: !override\n      - "5433:5432"\n' > /tmp/sevendays-db-port.yml && docker compose -f compose.yaml -f /tmp/sevendays-db-port.yml up -d db`, and every api test command prefixes `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test'`. If 5432 is free in the executor's session, plain `docker compose up -d db` and no prefix. **Never** point the suite at the lactalink container.

## Global Constraints

- **Branch & baseline:** `feat/216-testimonial-submissions` off main `31025ec` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#216)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, migration SQL, probe output) lands in gitignored `.superpowers/sdd/2026-10-14-216-testimonial-submissions/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (zod/drizzle/hono/workers-types all installed). Every task commits only with the checks green **for the packages it touched** (AGENTS.md's letter); the per-task commands are pinned below. Every COMMIT is green (the TDD reds live inside tasks, never at commit boundaries). After any `packages/types/src` edit, run `pnpm build:packages` before downstream typecheck/tests (dist/ is gitignored; turbo `typecheck` builds `^` but `test` does not). The api suite needs the compose db (the port recipe above). Biome canonical form via `pnpm --filter <pkg> fix` before committing — accept its rewrites. **Never stage `apps/admin/package.json`** (the owner's uncommitted dev-port change rides above the branch) and never stage `graphify-out/` churn (dirty graph files are expected, per AGENTS.md). Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (Task 7 — code was modified).
- **The binding law (owner-ratified 2026-10-14, binding):** wrangler **4.127.1**'s key is `[[ratelimits]]` (plural — probed against its own `config-schema.json`; the spec's `[[ratelimit]]` spelling is corrected everywhere this ticket writes it, including the pick-ledger row). The block: `name = "RATE_LIMITER"`, `namespace_id = "1001"` (the production-traffic namespace; 1000 is preview), `simple = { limit = 5, period = 60 }` — **5 per 60s**, the ratified reconciliation of "~5 per 10 min" against `simple.period`'s enum `[10, 60]`. The runtime call is `RATE_LIMITER.limit({ key }) → Promise<{ success: boolean }>` (installed types pin exactly this — assert on `.success` only, never a `rate` field). The gate is a middleware registered BEFORE `validatedJson` so a rate-limited request answers 429 even with a garbage body — and every attempt consumes (junk pays too). No CI changes, no secrets, no dashboard provisioning (namespace 1001 deploys with the config); local `wrangler dev` simulates the binding automatically.
- **The key law (binding):** `key = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Client-IP') ?? 'unknown'` — edge header first (unspoofable, wins for direct callers), the landing's forwarded `X-Client-IP` second (set server-side from the landing's own edge header; the browser cannot reach the API), `'unknown'` last (dev). The landing forwards it via `getApiClientForwardingIp(ip)` — the admin's `fetchWithBearer` shape.
- **The wire law (binding):** the public POST's 201 body is the FIXED constant `TESTIMONIAL_SUBMISSION_ACCEPTED` (`{ message: 'Thank you — your story is on its way.' }`) — byte-identical for inserts and honeypot discards; **no id, no quote echo, no row shape ever**. The bounds live in `packages/types` as exported constants (`TESTIMONIAL_QUOTE_MIN = 20` etc.) and every consumer (route schema, landing seam, textarea `maxLength`, counter) imports THE numbers — no re-declared literals anywhere. The honeypot `website` field parses as an optional string and NEVER 400s (a trap that announces itself catches nothing); the discard is the route's: filled → skip the insert, answer the same 201.
- **The audit law (binding):** the accept/reject/delete vocabulary widens `auditEntitySchema` (+`'testimonial-submission'`) and `auditActionSchema` (+`'accept'`, +`'reject'`), and BOTH admin Record walls (`AUDIT_ENTITY_LABELS`, `AUDIT_ACTION_LABELS`) gain their entries in the SAME commit as the widenings (the typecheck walls; the #215 pairing rule). One durable row per committed moderation request, inside its transaction: accept → `action: 'accept'`, reject → `'reject'`, delete → `'delete'`, always `entity: 'testimonial-submission'`, `entityId = <submission id>`, `summary = <person>`. The ephemeral `logAdminMutation` line mirrors entity + row id at the route. The public POST writes no audit row and no admin_mutation line.
- **The status law (binding):** `pending` is the only transitionable state — accept and reject answer the house 400 (message `'Only pending submissions can be accepted.'` / `'…rejected.'`, detail `{ path: ['status'], message: 'submission is <status>' }`) on anything else; delete ignores status entirely (204). A submission references nothing, so delete needs no guard service — it is NOT one of the nine `admin-delete.ts` entities; its DELETE lives on the moderation router.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result. The two owner-ratified lines and the prototype-ruled page copy are pinned verbatim ABOVE and quoted again where they land; the two `TODO(owner-copy)` min-lines are plan-pinned and marked in code.
- **Scope fence (verbatim):** Task 1 edits only `packages/db/src/schema/testimonial-submissions.ts` + `packages/db/src/schema/index.ts` + generates `packages/db/migrations/0012_*.sql` (+ journal + snapshot). Task 2 edits only `packages/types/src/{testimonial-submission.ts (new), testimonial-submission.test.ts (new), index.ts}`. Task 3 edits only `apps/api/wrangler.toml` + `apps/api/src/{env.ts, services/errors.ts, services/admin-gallery.ts, services/testimonial-submissions.ts (new), routes/testimonial-submissions.ts (new), routes/admin-testimonial-submissions.ts (new), routes/v1.ts, routes/admin.ts}` + `packages/types/src/{audit.ts, audit.test.ts}` + `apps/admin/src/lib/audit/filters.ts` + `apps/api/test/{testimonial-submissions.test.ts (new), helpers/rate-limit-stub.ts (new), helpers/env.ts, admin-gate.test.ts, admin-mutation-log.test.ts, helpers/truncate.test.ts}`. _(2026-10-14 controller ruling: truncate.test.ts is the 18th path — Task 1's barrel export staled its hand-listed 23-table mirror; the mechanical amendment rides this task's commit. Second ruling, same day: `apps/api/src/env.test.ts` is the 19th path (the required RATE_LIMITER binding needs the parseEnv test's three success-path literals to carry an additive `RATE_LIMITER: {}` stub — the "no other Env construction sites" claim missed the parseEnv unit test) and `apps/admin/src/components/audit/audit-log-screen.tsx` is the 20th (the THIRD `Record<AuditAction, string>` wall — `AUDIT_ACTION_BADGE_CLASSES` gains `accept` → teal-200/50/700 and `reject` → slate-200/50/700, controller-ruled for distinctness from the five taken hues, retunable at the variants step per the map's own comment).)_ Task 4 edits only `packages/api-client/src/{routes/testimonial-submissions.ts (new), routes/admin.ts, index.ts}` + `packages/api-client/test/{mock-api.ts, loopback.test.ts}`. Task 5 edits only `apps/landing/src/lib/{api.server.ts, api.functions.ts, testimonial-form.ts (new), testimonial-form.test.ts (new)}`. Task 6 edits only `apps/landing/src/routes/{share-your-story.tsx (new), about.tsx}` + `apps/landing/src/routeTree.gen.ts` (regenerated). Task 7 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/`, and works the PR/pick/issue — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/db/src/schema/
  testimonial-submissions.ts                        # create (T1) — the hold-at-API table + status enum
  index.ts                                          # modify (T1) — barrel line
packages/db/migrations/0012_*.sql                   # create (T1, db:generate) — one CREATE TYPE + one CREATE TABLE
packages/types/src/
  testimonial-submission.ts                         # create (T2) — bounds consts, create/status/read/accept schemas, the generic-response const
  testimonial-submission.test.ts                    # create (T2) — the 9-it wire suite
  index.ts                                          # modify (T2) — barrel line
  audit.ts                                          # modify (T3) — entity + action widenings
  audit.test.ts                                     # modify (T3) — the two list tests gain their names
apps/api/
  wrangler.toml                                     # modify (T3) — the [[ratelimits]] block (the binding's first user)
  src/env.ts                                        # modify (T3) — RATE_LIMITER required binding
  src/services/errors.ts                            # modify (T3) — tooManyRequests (429 envelope)
  src/services/admin-gallery.ts                     # modify (T3) — export nextTestimonialPosition
  src/services/testimonial-submissions.ts           # create (T3) — public insert + the moderation service
  src/routes/testimonial-submissions.ts             # create (T3) — the public POST (limit → validation → honeypot → insert)
  src/routes/admin-testimonial-submissions.ts       # create (T3) — list/accept/reject/delete behind the root gate
  src/routes/v1.ts                                  # modify (T3) — chain the public route
  src/routes/admin.ts                               # modify (T3) — chain the moderation router
  test/helpers/rate-limit-stub.ts                   # create (T3) — the recording binding stub
  test/helpers/env.ts                               # modify (T3) — the always-allow RATE_LIMITER stub
  test/testimonial-submissions.test.ts              # create (T3) — the 11-it lifecycle suite
  test/admin-gate.test.ts                           # modify (T3) — loop entry + the accept 401-before-validation pin
  test/admin-mutation-log.test.ts                   # modify (T3) — the accept-line pin
apps/admin/src/lib/audit/filters.ts                 # modify (T3) — both label walls' new entries
packages/api-client/src/
  routes/testimonial-submissions.ts                 # create (T4) — the public create wrapper
  routes/admin.ts                                   # modify (T4) — the adminTestimonialSubmissions group
  index.ts                                          # modify (T4) — client wiring + the args type re-export
packages/api-client/test/
  mock-api.ts                                       # modify (T4) — the submissions subtree (public + admin)
  loopback.test.ts                                  # modify (T4) — +6 wrapper pins
apps/landing/src/lib/
  api.server.ts                                     # modify (T5) — getApiClientForwardingIp
  api.functions.ts                                  # modify (T5) — the submitTestimonial server fn
  testimonial-form.ts                               # create (T5) — the bounds/gate/payload seam
  testimonial-form.test.ts                          # create (T5) — the 8-it lib-seam suite
apps/landing/src/routes/
  share-your-story.tsx                              # create (T6) — the ruled form page on today's primitives
  about.tsx                                         # modify (T6) — the ruled CTA card
  ../routeTree.gen.ts                               # regenerate (T6) — the new route joins the tree
docs/plan.md docs/progress.md AGENTS.md graphify-out/ docs/agents/v1-picks.md  # T7
```

---

### Task 1: `packages/db` — the `testimonial_submissions` table + migration 0012

**Files:**
- Create: `packages/db/src/schema/testimonial-submissions.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create (via `db:generate`, never by hand): `packages/db/migrations/0012_*.sql` (+ `meta/_journal.json` + snapshot)

**Interfaces:**
- Produces (what Tasks 3 consumes): the `testimonialSubmissions` drizzle table + `testimonialSubmissionStatusEnum` on the `@sevendays/db` barrel — `typeof testimonialSubmissions.$inferSelect` is `{ id: string; quote: string; person: string; status: 'pending' | 'accepted' | 'rejected'; createdAt: Date; updatedAt: Date }`. The compose test DB picks migration 0012 up automatically (`apps/api/test/global-setup.ts` runs `migrateDatabase`); the live shared DB gets it via `db:migrate`. `truncateAll` derives its list from the barrel — the new table truncates automatically.
- Consumes: nothing new.

**Not here:** any types/api/landing code (Tasks 2–6); any seed row (**born-empty is the ruling** — submissions arrive only via the public POST, on every environment alike: live, compose, and future ship DBs — so there is deliberately NO seed change); `relations.ts` (nothing references the table — the audit-log/site-settings precedent of relations-free tables); `admin-delete.ts` (the submission DELETE is a moderation endpoint on its own router, not one of the nine guarded entities — a submission references nothing).

- [ ] **Step 1: Write the schema file**

Create `packages/db/src/schema/testimonial-submissions.ts` with exactly:

```ts
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Testimonial Submission (M7 #216, spec § the public testimonial form —
// #161's ruling; glossary in apps/api/CONTEXT.md): an inbound customer
// quote from the public form — quote text + person attributed — HELD AT
// THE API for staff review. Nothing the public writes ever renders: a
// Testimonial exists only after staff accept (the published catalog stays
// 100% staff-authored); reject retains the row as an audit trail and
// deletion is available regardless of status (a submission references
// nothing). v1's only public write surface, both editions — born-empty,
// rows arrive only through the public POST.
export const testimonialSubmissionStatusEnum = pgEnum('testimonial_submission_status', [
  'pending',
  'accepted',
  'rejected',
]);

export const testimonialSubmissions = pgTable('testimonial_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quote: text('quote').notNull(),
  person: text('person').notNull(),
  status: testimonialSubmissionStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Then `packages/db/src/schema/index.ts` — insert the barrel line immediately BEFORE `export * from './testimonials.js';` (alphabetical: the hyphen sorts before the 's'): _(2026-10-14 note: the db package's biome leaves this hyphen-first order untouched — `biome check` is clean on it and Task 1's fix pass made no move; the db and types packages' biome behavior differs on this pair, and biome is the arbiter in each. Verified empirically at the Task 3 close.)_

```ts
export * from './testimonial-submissions.js';
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: a new `packages/db/migrations/0012_<drizzle-name>.sql` (the name is drizzle's pick — do not rename it) plus the `meta/` journal + snapshot entries. Read the generated SQL and verify it contains **exactly two statements and nothing else**: a `CREATE TYPE "testimonial_submission_status" AS ENUM ('pending', 'accepted', 'rejected')` and a `CREATE TABLE "testimonial_submissions"` listing the 6 columns — `id` uuid PRIMARY KEY DEFAULT `gen_random_uuid()` NOT NULL, `quote`/`person` text NOT NULL, `status` testimonial_submission_status DEFAULT 'pending' NOT NULL, `created_at`/`updated_at` timestamptz DEFAULT now() NOT NULL — no index, no second table, no defaults on the text columns. If the generated file contains anything beyond those two statements — STOP: the schema edit drifted; fix `testimonial-submissions.ts` and regenerate. Never hand-edit the migration.

- [ ] **Step 3: Apply to the live shared DB + probe**

Run: `pnpm --filter @sevendays/db db:migrate` (uses `DATABASE_MIGRATE_URL` from `packages/db/.env` — present on this machine; if the executor's session lacks it, stop and surface: applying to the live shared DB is owner-delegated and must not be skipped silently).
Expected: `0012` applies clean. Then the read-only probe (the #212/#214/#215 pattern):

```bash
cd packages/db && node --env-file=.env -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_MIGRATE_URL, { prepare: false, max: 1 });
  const cols = await sql\`select column_name, is_nullable, column_default, udt_name from information_schema.columns where table_name = 'testimonial_submissions' order by ordinal_position\`;
  console.log('columns=' + cols.length);
  for (const c of cols) console.log(c.column_name, c.udt_name, 'nullable=' + c.is_nullable, 'default=' + c.column_default);
  const rows = await sql\`select count(*)::int as n from testimonial_submissions\`;
  console.log('rows=' + rows[0].n);
  await sql.end({ timeout: 5 });
\});"
```

Expected output — `columns=6`; `status` carries `udt_name=testimonial_submission_status` with `default='pending'::testimonial_submission_status`; only `id`/`status`/`created_at`/`updated_at` carry defaults; and **`rows=0`** (born-empty on the live DB). Record the SQL + probe output in the evidence dir.

- [ ] **Step 4: Gates + commit**

`pnpm --filter @sevendays/db test` — **4 files passed** (`migrate.test.ts` replays the folder including 0012). Then `pnpm --filter @sevendays/db fix` (re-run the suite — fix must not change counts), `pnpm --filter @sevendays/db typecheck`. Commit:

```bash
git add packages/db/src/schema/testimonial-submissions.ts packages/db/src/schema/index.ts packages/db/migrations/0012_*.sql packages/db/migrations/meta
git commit -m "feat(db): the testimonial_submissions table - hold-at-API, pending|accepted|rejected, born-empty (#216)"
```

### Task 2: `packages/types` — the testimonial-submission wire (TDD)

**Files:**
- Create (test-first): `packages/types/src/testimonial-submission.test.ts`
- Create: `packages/types/src/testimonial-submission.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Produces (what Tasks 3–6 consume): the four bounds constants (`TESTIMONIAL_QUOTE_MIN = 20`, `TESTIMONIAL_QUOTE_MAX = 600`, `TESTIMONIAL_PERSON_MIN = 2`, `TESTIMONIAL_PERSON_MAX = 80` — every consumer imports THESE, never re-declares); `createTestimonialSubmissionSchema` + `CreateTestimonialSubmissionInput` (quote/person bounded + the optional `website` honeypot); `testimonialSubmissionStatusSchema` + `TestimonialSubmissionStatus`; `testimonialSubmissionSchema` + `TestimonialSubmission` (the admin read row); `acceptTestimonialSubmissionSchema` + `AcceptTestimonialSubmissionInput` (the optional edit); `TESTIMONIAL_SUBMISSION_ACCEPTED` (the pinned generic-response constant) + `testimonialSubmissionAcceptedSchema` + `TestimonialSubmissionAccepted`.
- Consumes: nothing new (Task 1's table is consumed at Task 3, not here).

**Not here:** the api service/routes/binding (Task 3); the audit widenings (Task 3 — they pair with the admin label walls, a different atomic); the api-client wrappers (Task 4); any landing code (Tasks 5–6).

- [ ] **Step 1: Write the failing tests (the 9-it types suite)**

Create `packages/types/src/testimonial-submission.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import {
  TESTIMONIAL_PERSON_MAX,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_SUBMISSION_ACCEPTED,
  acceptTestimonialSubmissionSchema,
  createTestimonialSubmissionSchema,
  testimonialSubmissionAcceptedSchema,
  testimonialSubmissionSchema,
  testimonialSubmissionStatusSchema,
} from './testimonial-submission.js';

const canonical = {
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
};

describe('createTestimonialSubmissionSchema (the public POST body)', () => {
  it('parses a canonical payload; website stays optional (absent parses)', () => {
    const parsed = createTestimonialSubmissionSchema.parse(canonical);
    expect(parsed.quote).toBe(canonical.quote);
    expect('website' in parsed).toBe(false);
  });

  it('the quote bounds: 19 chars fails; 20 and 600 pass; 601 fails', () => {
    const edge = (n: number) => ({ ...canonical, quote: 'x'.repeat(n) });
    expect(createTestimonialSubmissionSchema.safeParse(edge(19)).success).toBe(false);
    expect(createTestimonialSubmissionSchema.safeParse(edge(20)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(600)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(601)).success).toBe(false);
  });

  it('the person bounds: 1 char fails; 2 and 80 pass; 81 fails', () => {
    const edge = (n: number) => ({ ...canonical, person: 'x'.repeat(n) });
    expect(createTestimonialSubmissionSchema.safeParse(edge(1)).success).toBe(false);
    expect(createTestimonialSubmissionSchema.safeParse(edge(2)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(80)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(81)).success).toBe(false);
  });

  it('a filled website parses (the discard is route-side, never a validation error)', () => {
    const parsed = createTestimonialSubmissionSchema.parse({ ...canonical, website: 'https://spam.example' });
    expect(parsed.website).toBe('https://spam.example');
  });

  it('strips smuggled server fields from the parsed output (id, status, createdAt)', () => {
    const parsed = createTestimonialSubmissionSchema.parse({
      ...canonical,
      id: '11111111-1111-4111-8111-111111111111',
      status: 'accepted',
      createdAt: '2026-10-14T00:00:00.000Z',
    });
    expect('id' in parsed).toBe(false);
    expect('status' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
  });
});

describe('testimonialSubmissionStatusSchema', () => {
  it('accepts exactly pending | accepted | rejected', () => {
    for (const status of ['pending', 'accepted', 'rejected']) {
      expect(testimonialSubmissionStatusSchema.parse(status)).toBe(status);
    }
    expect(testimonialSubmissionStatusSchema.safeParse('held').success).toBe(false);
  });
});

describe('acceptTestimonialSubmissionSchema (the optional edit)', () => {
  it('an empty edit parses (accept as-is); partial edits parse; out-of-bounds edits fail', () => {
    expect(acceptTestimonialSubmissionSchema.parse({})).toEqual({});
    expect(acceptTestimonialSubmissionSchema.parse({ person: 'Maria D.' })).toEqual({
      person: 'Maria D.',
    });
    expect(
      acceptTestimonialSubmissionSchema.safeParse({ quote: 'x'.repeat(19) }).success
    ).toBe(false);
    expect(
      acceptTestimonialSubmissionSchema.safeParse({ person: 'x'.repeat(81) }).success
    ).toBe(false);
  });
});

describe('the read row + the generic public answer', () => {
  it('testimonialSubmissionSchema round-trips a canonical row (dates coerce, unknown keys strip)', () => {
    const parsed = testimonialSubmissionSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      quote: canonical.quote,
      person: canonical.person,
      status: 'pending',
      createdAt: '2026-10-14T00:00:00.000Z',
      updatedAt: '2026-10-14T00:00:00.000Z',
      sneaky: 'blob',
    });
    expect(parsed.createdAt).toBeInstanceOf(Date);
    expect('sneaky' in parsed).toBe(false);
    expect(parsed.status).toBe('pending');
  });

  it('TESTIMONIAL_SUBMISSION_ACCEPTED is the fixed message — the no-echo pin (M7 #216)', () => {
    expect(TESTIMONIAL_SUBMISSION_ACCEPTED).toEqual({
      message: 'Thank you — your story is on its way.',
    });
    expect(testimonialSubmissionAcceptedSchema.parse(TESTIMONIAL_SUBMISSION_ACCEPTED)).toEqual(
      TESTIMONIAL_SUBMISSION_ACCEPTED
    );
    expect(TESTIMONIAL_PERSON_MAX).toBe(80); // the constants re-export pin: the numbers live HERE alone
    expect(TESTIMONIAL_QUOTE_MAX).toBe(600);
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/types test -- --run src/testimonial-submission.test.ts` — FAILS (the module does not exist). Record red in the evidence dir.

- [ ] **Step 3: Write the module + barrel**

(a) Create `packages/types/src/testimonial-submission.ts` with exactly:

```ts
import { z } from 'zod';

// Testimonial Submission (M7 #216, spec § the public testimonial form —
// #161's ruling): the public form's wire — v1's only public write surface,
// both editions. Submissions HOLD AT THE API (pending | accepted |
// rejected); nothing the public writes ever renders, and the public POST
// answers GENERICALLY (no row echo — the accepted body is a fixed
// message). The length bounds double as anti-spam: quote 20–600 chars,
// person 2–80. The honeypot field ('website') parses like any other
// optional string — a filled one is the ROUTE's silent-discard signal,
// never a validation error (a trap that 400s is a trap that announces
// itself). The bounds live HERE as exported constants: the route schema,
// the landing seam, the textarea maxLength, and the counter all import
// the numbers — no consumer ever re-declares them.
export const TESTIMONIAL_QUOTE_MIN = 20;
export const TESTIMONIAL_QUOTE_MAX = 600;
export const TESTIMONIAL_PERSON_MIN = 2;
export const TESTIMONIAL_PERSON_MAX = 80;

export const testimonialSubmissionStatusSchema = z.enum(['pending', 'accepted', 'rejected']);

export type TestimonialSubmissionStatus = z.infer<typeof testimonialSubmissionStatusSchema>;

export const createTestimonialSubmissionSchema = z.object({
  quote: z.string().min(TESTIMONIAL_QUOTE_MIN).max(TESTIMONIAL_QUOTE_MAX),
  person: z.string().min(TESTIMONIAL_PERSON_MIN).max(TESTIMONIAL_PERSON_MAX),
  // The honeypot: absent (or empty) for humans, filled by bots. Never
  // required, never bounded — the discard is silent and success-shaped.
  website: z.string().optional(),
});

export type CreateTestimonialSubmissionInput = z.infer<typeof createTestimonialSubmissionSchema>;

// The admin read row (the moderation queue's wire): the stored text, the
// status, the timestamps. Raw status values — the queue renders them.
export const testimonialSubmissionSchema = z.object({
  id: z.uuid(),
  quote: z.string().min(1),
  person: z.string().min(1),
  status: testimonialSubmissionStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type TestimonialSubmission = z.infer<typeof testimonialSubmissionSchema>;

// Accept-with-edit (spec § moderation): the optional edit rides the
// accept request itself — absent keys keep the submission's stored text;
// present keys must satisfy the same bounds (a staff edit that breaks the
// bound is a 400, never a silent trim).
export const acceptTestimonialSubmissionSchema = z.object({
  quote: z.string().min(TESTIMONIAL_QUOTE_MIN).max(TESTIMONIAL_QUOTE_MAX).optional(),
  person: z.string().min(TESTIMONIAL_PERSON_MIN).max(TESTIMONIAL_PERSON_MAX).optional(),
});

export type AcceptTestimonialSubmissionInput = z.infer<typeof acceptTestimonialSubmissionSchema>;

// The generic public answer (no row echo): a fixed message, byte-identical
// for real inserts and honeypot discards alike — indistinguishable by
// construction. The line is the #164 prototype Round-4 success-panel h2
// (owner-reacted 2026-10-01, .scratch/2026-09-30-164-rulings.md).
export const TESTIMONIAL_SUBMISSION_ACCEPTED = {
  message: 'Thank you — your story is on its way.',
} as const;

export const testimonialSubmissionAcceptedSchema = z.object({
  message: z.string(),
});

export type TestimonialSubmissionAccepted = z.infer<typeof testimonialSubmissionAcceptedSchema>;
```

(b) `packages/types/src/index.ts` — insert the barrel line immediately BEFORE `export * from './testimonial.js';` (alphabetical, the hyphen rule): _(2026-10-14 supersession, controller-ruled after Task 3's fix pass empirically reordered it: the types package's biome collation orders `./testimonial.js` FIRST — the hyphen is ignored at primary strength — so the biome-canonical barrel reads `./testimonial.js` then `./testimonial-submission.js`, and Task 3's commit `12a29d2` carries exactly that. Reproduced deterministically via stdin: feeding the hyphen-first variant through `biome check --stdin-file-path --write` flips it. The Task 2 fix round enforced the prose over the tooling; do not re-move the line — biome's fix is the arbiter per Global Constraints.)_

```ts
export * from './testimonial-submission.js';
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/types test -- --run` — **17 files / 167 tests** (158 + the 9 its; audit.test.ts still green — untouched this task). Then `pnpm --filter @sevendays/types fix` (re-run — counts unchanged), `pnpm --filter @sevendays/types typecheck`, and `pnpm build:packages` (Tasks 3–5 typecheck against the built dist). Commit:

```bash
git add packages/types/src/testimonial-submission.ts packages/types/src/testimonial-submission.test.ts packages/types/src/index.ts
git commit -m "feat(types): the testimonial-submission wire - bounds constants, create/status/read/accept schemas, the pinned generic response (#216)"
```

### Task 3: `apps/api` — the rate-limit binding, the public POST, the moderation service + routes, the audit vocabulary (TDD)

The binding's first user end to end: wrangler config, env schema, test stubs, the 429 envelope, the service (public insert + list/accept/reject/delete with audit rows), the two routers, and BOTH audit enum widenings — which atomically carry the #188 viewer's two label-wall entries (the `Record<AuditEntity, string>` and `Record<AuditAction, string>` typecheck walls in `apps/admin`; mechanically verified by that package's typecheck).

**Files:**
- Create (test-first): `apps/api/test/testimonial-submissions.test.ts`, `apps/api/test/helpers/rate-limit-stub.ts`
- Modify (test-first): `apps/api/test/admin-gate.test.ts`, `apps/api/test/admin-mutation-log.test.ts`, `apps/api/test/helpers/env.ts`
- Modify (mechanical reconciliation, controller-ruled 2026-10-14): `apps/api/test/helpers/truncate.test.ts` — the hand-listed mirror gains `'testimonial_submissions'` (twenty-three → twenty-four; migrations 0000-0011 → 0000-0012; Task 1's barrel export staled the pin)
- Modify: `apps/api/wrangler.toml`, `apps/api/src/env.ts`, `apps/api/src/services/errors.ts`, `apps/api/src/services/admin-gallery.ts`, `packages/types/src/audit.ts`, `packages/types/src/audit.test.ts`, `apps/admin/src/lib/audit/filters.ts`, `apps/api/src/routes/v1.ts`, `apps/api/src/routes/admin.ts`
- Modify (controller-ruled 2026-10-14, the 19th/20th paths): `apps/api/src/env.test.ts` (additive `RATE_LIMITER: {}` in the parseEnv success literals), `apps/admin/src/components/audit/audit-log-screen.tsx` (`AUDIT_ACTION_BADGE_CLASSES` gains accept → teal / reject → slate — the third Record wall)
- Create: `apps/api/src/services/testimonial-submissions.ts`, `apps/api/src/routes/testimonial-submissions.ts`, `apps/api/src/routes/admin-testimonial-submissions.ts`

**Interfaces:**
- Produces (what Tasks 4–6 consume): `POST /api/v1/testimonial-submissions` → `201 TestimonialSubmissionAccepted` (the fixed body, inserts AND honeypot discards alike) | `400` bounds (house details) | `429 { error }` (the ruled line; the gate precedes validation); `GET /api/v1/admin/testimonial-submissions` → `200 TestimonialSubmission[]` newest-first; `POST /:id/accept` (body `AcceptTestimonialSubmissionInput`, `{}` = as-is) → `200 TestimonialSubmission` | 404 | the house 400 (non-pending / bad edit); `POST /:id/reject` → `200 TestimonialSubmission` | 404 | 400 (non-pending); `DELETE /:id` → `204` regardless of status; service-side `createTestimonialSubmission(db, { quote, person })`, `listAdminTestimonialSubmissions(db)`, `acceptTestimonialSubmission(db, audit, id, edit)`, `rejectTestimonialSubmission(db, audit, id)`, `deleteTestimonialSubmission(db, audit, id)`; `stubRateLimiter(failAfter)`; `tooManyRequests(c, message)`; the audit vocabulary gains `'testimonial-submission'` + `'accept'`/`'reject'`.
- Consumes: Task 1's table + enum; Task 2's schemas/constants; `admin-gallery.ts`'s `nextTestimonialPosition` (exported in Step 4); `admin-shared.ts`'s `AdminWriteResult`/`AdminWriteFailure`; `audit.ts`'s `writeAuditRow`/`AuditActor`; `observability/events.ts`'s `logAdminMutation`; the existing `validatedJson`/`validatedParam`/`badRequest`/`notFound` vocabulary.

**Not here:** a public GET for submissions (nothing the public writes renders — the read surface never serves them); an admin single-get (the queue list is the tab's whole data); a status query filter (the #218 tab segments client-side over the newest-first list); the Submissions tab UI (#218); Turnstile (the written-down escalation); any booking-endpoint rate limiting (v2's box, plan.md line 238); `admin-delete.ts` (the submission DELETE is a moderation endpoint — a submission references nothing, no guard service).

- [ ] **Step 1: Write the failing tests**

(a) Create `apps/api/test/helpers/rate-limit-stub.ts` with exactly:

```ts
// Recording RateLimit stub for the submissions gate tests (M7 #216, the
// r2-stub pattern): every limit() call records its key; the first
// `failAfter` calls answer success, everything after answers failure
// (failAfter 0 = always fail, Infinity = always allow).
export function stubRateLimiter(failAfter = Number.POSITIVE_INFINITY) {
  const calls: string[] = [];
  let used = 0;
  const limiter = {
    async limit({ key }: { key: string }) {
      calls.push(key);
      used += 1;
      return { success: used <= failAfter };
    },
  };
  return { limiter: limiter as unknown as RateLimit, calls };
}
```

(b) `apps/api/test/helpers/env.ts` — add the binding stub to `testEnv`'s returned object (after `IMAGES: {}`) and one line to the header comment block:

```ts
// RATE_LIMITER (M7 #216) is the same binding-shaped class: the always-allow
// stub answers every suite that never exercises the submissions gate; the
// submissions suite spreads its own recording stub over this (the r2-stub
// posture).
```

```ts
    RATE_LIMITER: { limit: async () => ({ success: true }) },
```

(c) Create `apps/api/test/testimonial-submissions.test.ts` with exactly:

```ts
import { auditLog, testimonialSubmissions } from '@sevendays/db';
import { TESTIMONIAL_SUBMISSION_ACCEPTED } from '@sevendays/types';
import { desc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { loadGalleryFixtures } from './helpers/fixtures.js';
import { stubRateLimiter } from './helpers/rate-limit-stub.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const jsonHeaders = { 'content-type': 'application/json' };

const VALID = {
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
};

const post = async (body: unknown, env: Record<string, unknown> = {}, headers = {}) =>
  app.request(
    '/api/v1/testimonial-submissions',
    { method: 'POST', headers: { ...jsonHeaders, ...headers }, body: JSON.stringify(body) },
    { ...testEnv(url), ...env }
  );

// The authed moderation call (the mutation-log suite's authed shape).
const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { ...jsonHeaders, ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

beforeEach(async () => {
  await truncateAll(db); // submissions arrive through the public POST — no fixtures
});

describe('POST /api/v1/testimonial-submissions (the public write)', () => {
  it('a valid payload → 201 with the pinned generic body verbatim; the row lands pending; no echo fields on the wire', async () => {
    const res = await post(VALID);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ...TESTIMONIAL_SUBMISSION_ACCEPTED });
    expect(Object.keys(body)).toEqual(['message']);
    const rows = await db.select().from(testimonialSubmissions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('pending');
    expect(rows[0]?.quote).toBe(VALID.quote);
  });

  it('the bounds reject: quote 19 → 400 details on quote; person 1 → 400 details on person', async () => {
    const shortQuote = await post({ ...VALID, quote: 'x'.repeat(19) });
    expect(shortQuote.status).toBe(400);
    expect(
      ((await shortQuote.json()) as { details: { path: string[] }[] }).details[0]?.path
    ).toEqual(['quote']);
    const shortPerson = await post({ ...VALID, person: 'x' });
    expect(shortPerson.status).toBe(400);
    expect(
      ((await shortPerson.json()) as { details: { path: string[] }[] }).details[0]?.path
    ).toEqual(['person']);
    const rows = await db.select().from(testimonialSubmissions);
    expect(rows).toHaveLength(0); // nothing inserted on a 400
  });

  it('a filled honeypot → the identical 201 body and NO row (the silent discard)', async () => {
    const res = await post({ ...VALID, website: 'https://spam.example' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ...TESTIMONIAL_SUBMISSION_ACCEPTED });
    expect(await db.select().from(testimonialSubmissions)).toHaveLength(0);
  });

  it('the rate-limited gate: a failing stub → 429 with the ruled line; the key derives from CF-Connecting-IP, then X-Client-IP', async () => {
    const stub = stubRateLimiter(0); // every attempt over-limit
    const first = await post(VALID, { RATE_LIMITER: stub.limiter }, { 'CF-Connecting-IP': '203.0.113.9' });
    expect(first.status).toBe(429);
    expect(await first.json()).toEqual({
      error: "You're sending too fast — please wait a minute and try again.",
    });
    // No edge header → the landing-forwarded X-Client-IP is the key; and
    // when BOTH exist the edge header wins (unspoofable, direct callers).
    await post(VALID, { RATE_LIMITER: stub.limiter }, { 'X-Client-IP': '198.51.100.7' });
    await post(
      VALID,
      { RATE_LIMITER: stub.limiter },
      { 'CF-Connecting-IP': '203.0.113.9', 'X-Client-IP': '198.51.100.7' }
    );
    expect(stub.calls).toEqual(['203.0.113.9', '198.51.100.7', '203.0.113.9']);
    expect(await db.select().from(testimonialSubmissions)).toHaveLength(0);
  });

  it('the limit precedes validation: a failing stub + a garbage body → 429, not 400', async () => {
    const stub = stubRateLimiter(0);
    const res = await post({ quote: 42 }, { RATE_LIMITER: stub.limiter });
    expect(res.status).toBe(429);
  });
});

describe('the admin moderation endpoints', () => {
  it('the list is newest-first with statuses', async () => {
    expect((await post({ ...VALID, person: 'First Sender' })).status).toBe(201);
    expect((await post({ ...VALID, person: 'Second Sender' })).status).toBe(201);
    const res = await authed('GET', '/api/v1/admin/testimonial-submissions', 'mod-list@sevendays.test');
    expect(res.status).toBe(200);
    const rows = (await res.json()) as { person: string; status: string }[];
    expect(rows.map((r) => r.person)).toEqual(['Second Sender', 'First Sender']);
    expect(rows.every((r) => r.status === 'pending')).toBe(true);
  });

  it('accept as-is appends the Testimonial at nextTestimonialPosition (max+1), flips the row, writes the accept audit row, renders at the end of the public order', async () => {
    await loadGalleryFixtures(db); // 3 testimonials, positions 1..3 — the append lands at 4
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db
      .select()
      .from(testimonialSubmissions)
      .orderBy(desc(testimonialSubmissions.createdAt));
    if (!submission) throw new Error('expected a submission row');

    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/accept`,
      'mod-accept@sevendays.test',
      {}
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('accepted');

    // Appended at the END of render order — the public read is the proof.
    // 3 rendered, not 4 (controller-ruled 2026-10-14): the fixtures' third
    // testimonial is isActive:false and the public read is active-only.
    const publicRes = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    const testimonials = (await publicRes.json()) as { quote: string; person: string }[];
    expect(testimonials).toHaveLength(3);
    expect(testimonials[2]?.person).toBe(VALID.person);

    const auditRows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'testimonial-submission'));
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.action).toBe('accept');
    expect(auditRows[0]?.entityId).toBe(submission.id);
    expect(auditRows[0]?.summary).toBe(VALID.person);
  });

  it('accept-with-edit carries the edited quote + person into the Testimonial', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/accept`,
      'mod-edit@sevendays.test',
      { quote: 'The photographer made our shoot feel effortless (edited).', person: 'Maria D.' }
    );
    expect(res.status).toBe(200);
    const publicRes = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    const testimonials = (await publicRes.json()) as { quote: string; person: string }[];
    expect(testimonials[testimonials.length - 1]?.quote).toBe(
      'The photographer made our shoot feel effortless (edited).'
    );
    expect(testimonials[testimonials.length - 1]?.person).toBe('Maria D.');
    // A bad edit is a 400, never a silent trim.
    expect((await post({ ...VALID, person: 'Third Sender' })).status).toBe(201);
    const [next] = await db
      .select()
      .from(testimonialSubmissions)
      .orderBy(desc(testimonialSubmissions.createdAt));
    const badEdit = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${next?.id}/accept`,
      'mod-edit-bad@sevendays.test',
      { quote: 'x'.repeat(19) }
    );
    expect(badEdit.status).toBe(400);
  });

  it('accept on a non-pending row → 400 with the status detail', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/reject`,
      'mod-reject-a@sevendays.test'
    );
    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/accept`,
      'mod-reject-b@sevendays.test',
      {}
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('Only pending submissions can be accepted.');
    expect(body.details[0]?.path).toEqual(['status']);
    expect(body.details[0]?.message).toBe('submission is rejected');
  });

  it('reject retains the row as rejected + writes the reject audit row', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/reject`,
      'mod-reject@sevendays.test'
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('rejected');
    const rows = await db.select().from(testimonialSubmissions);
    expect(rows).toHaveLength(1); // retained — the audit trail
    const auditRows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'testimonial-submission'));
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.action).toBe('reject');
    // And nothing renders: the public read stays empty.
    const publicRes = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    expect(await publicRes.json()).toEqual([]);
  });

  it('delete removes regardless of status (a rejected row) → 204 + the delete audit row', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/reject`,
      'mod-del-a@sevendays.test'
    );
    const res = await authed(
      'DELETE',
      `/api/v1/admin/testimonial-submissions/${submission.id}`,
      'mod-del-b@sevendays.test'
    );
    expect(res.status).toBe(204);
    expect(await db.select().from(testimonialSubmissions)).toHaveLength(0);
    const auditRows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'testimonial-submission'));
    expect(auditRows.map((r) => r.action)).toEqual(['reject', 'delete']);
  });
});
```

(d) `apps/api/test/admin-gate.test.ts` — two edits. First, the `routers` array gains the new router (it has a GET list, so the existing loop pins it — no new it needed for the list):

```ts
    '/api/v1/admin/testimonials',
    '/api/v1/admin/testimonial-submissions',
```

Second, after the site-settings PUT pin inside `describe('the anonymous 401 envelope on every admin router')`, add:

```ts
  it('POST /api/v1/admin/testimonial-submissions/:id/accept → 401 for an anonymous caller, even with an invalid body (the gate precedes validation)', async () => {
    const res = await app.request(
      '/api/v1/admin/testimonial-submissions/11111111-1111-4111-8111-111111111111/accept',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"quote": 42}', // garbage — validation never runs
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
```

(e) `apps/api/test/admin-mutation-log.test.ts` — inside the `admin_mutation events` describe, after the site-settings PUT it, add:

```ts
  it('accept testimonial-submission → one line: entity testimonial-submission, entityId = the submission id (M7 #216)', async () => {
    const lines = captureLines();
    expect(
      (
        await app.request('/api/v1/testimonial-submissions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            quote: 'The photographer made our graduation shoot feel effortless.',
            person: 'Maria, batch 2026',
          }),
        }, testEnv(url))
      ).status
    ).toBe(201);
    const rows = await db.select().from(testimonialSubmissions).limit(1);
    const id = rows[0]?.id;
    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${id}/accept`,
      'mut-submission@sevendays.test',
      {}
    );
    expect(res.status).toBe(200);
    const submissionLines = mutations(lines).filter(
      (line) => line.entity === 'testimonial-submission'
    );
    expect(submissionLines).toHaveLength(1);
    expect(submissionLines[0]?.entityId).toBe(id);
    expect(submissionLines[0]?.route).toBe('/api/v1/admin/testimonial-submissions/:id/accept');
    // The public POST emits NO mutation line — only the staff accept does.
    expect(mutations(lines)).toHaveLength(1);
  });
```

This it needs `testimonialSubmissions` from `@sevendays/db` joined to the file's import block.

- [ ] **Step 2: Run red**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run test/testimonial-submissions.test.ts test/admin-gate.test.ts test/admin-mutation-log.test.ts`
Expected: the 11 suite its FAIL (404s — no routes), the loop's new entry FAILS (404), the accept 401 pin FAILS (404), the mutation-log pin FAILS (0 lines). Every OTHER suite stays green — the `testEnv` stub edit is additive — EXCEPT `test/helpers/truncate.test.ts`, which is red from Task 1's barrel export (the hand-mirror pin amends in this task; controller-ruled 2026-10-14). The accept 401 pin and the loop's new entry may pass early (the admin root's `requireSession` `.use('*')` answers 401 on not-yet-mounted paths — benign structural green). Record red.

- [ ] **Step 3: Widen the audit vocabulary + its two label walls (atomic)**

(a) `packages/types/src/audit.ts` — the action enum (line 14) and its header comment:

```ts
// …the action enum is the spec's pin (create | update | deactivate |
// reorder | delete; 'accept'/'reject' joined with M7 #216 — the
// testimonial-submission moderation verbs)…
export const auditActionSchema = z.enum([
  'create',
  'update',
  'deactivate',
  'reorder',
  'delete',
  // M7 #216: the testimonial-submission moderation verbs — accept creates
  // the Testimonial inside the same committed request; reject retains.
  'accept',
  'reject',
]);
```

(the header comment's prose amends in place — keep its existing sentences, add the dated clause). The entity enum gains its member after `'testimonial'`:

```ts
  'testimonial',
  // M7 #216: the moderation queue is a committed-admin-mutation family —
  // one row per accept/reject/delete, row-grain (entityId = submission id).
  'testimonial-submission',
```

and the file header's "ten" count becomes "eleven".

(b) `packages/types/src/audit.test.ts` — the two list tests amend: the action it's title becomes `'accepts exactly the seven pinned values'` and its array gains `'accept', 'reject'` after `'delete'`; the entity it’s title becomes `'accepts the eleven route-segment names'` and its array gains `'testimonial-submission',` after `'testimonial',`.

(c) `apps/admin/src/lib/audit/filters.ts` — `AUDIT_ENTITY_LABELS` gains (after `testimonial`):

```ts
  'testimonial-submission': 'Testimonial submissions',
```

and `AUDIT_ACTION_LABELS` gains (at the map's end):

```ts
  accept: 'Accept',
  reject: 'Reject',
```

- [ ] **Step 4: The binding + env + error envelope + the shared position fn**

(a) `apps/api/wrangler.toml` — add the block after the `[images]` section:

```toml
# Testimonial submissions (M7 #216, spec § the public testimonial form):
# the Workers Rate Limiting binding's FIRST USER — the public POST's per-IP
# gate. 5 per 60s: the binding's simple mode supports only 10s/60s windows
# (probed against wrangler 4.127.1's config schema), so the spec's "~5 per
# 10 min" reconciles to a 5-per-minute burst cap (owner-ratified
# 2026-10-14); the honeypot + length bounds are the other legs, Turnstile
# the written-down escalation. namespace_id 1001 = production traffic.
[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"
simple = { limit = 5, period = 60 }
```

(b) `apps/api/src/env.ts` — the schema gains the required binding (after `IMAGES`), and the comment block's binding paragraph gains one sentence ("RATE_LIMITER (M7 #216) is the rate-limit binding — same required-binding posture, `wrangler dev` simulates it locally"):

```ts
  RATE_LIMITER: z.custom<RateLimit>((v) => v !== null && typeof v === 'object'),
```

(c) `apps/api/src/services/errors.ts` — append:

```ts
/**
 * The rate-limit rejection (M7 #216): the one-error shape at 429 — the
 * message is the owner-ratified customer line; the landing form renders
 * this exact string (one source).
 */
export function tooManyRequests(c: Context, message: string) {
  return c.json({ error: message }, 429);
}
```

(d) `apps/api/src/services/admin-gallery.ts` — `nextTestimonialPosition` (line 207) becomes exported (one word; its body is untouched):

```ts
// Shared with the submissions accept since M7 #216 — the append rule is
// ONE rule: max+1 over every row, the spec's own citation.
export async function nextTestimonialPosition(db: Database): Promise<number> {
```

- [ ] **Step 5: Implement the service + the two routers + the chains**

(a) Create `apps/api/src/services/testimonial-submissions.ts` with exactly:

```ts
import type { Database } from '@sevendays/db';
import { testimonialSubmissions, testimonials } from '@sevendays/db';
import type {
  AcceptTestimonialSubmissionInput,
  TestimonialSubmissionStatus,
} from '@sevendays/types';
import { desc, eq } from 'drizzle-orm';
import { nextTestimonialPosition } from './admin-gallery.js';
import {
  type AdminWriteFailure,
  type AdminWriteResult,
} from './admin-shared.js';
import { type AuditActor, writeAuditRow } from './audit.js';

// The testimonial-submissions seam (M7 #216, spec § the public testimonial
// form): v1's only public write surface, HOLDING AT THE API — the public
// POST inserts pending and nothing the public writes ever renders; a
// Testimonial exists only after staff accept (appended at the END of
// render order via the shared nextTestimonialPosition max+1), reject
// retains the row as an audit trail, and delete works regardless of
// status (a submission references nothing). One audit row per committed
// moderation request, inside its transaction, under the widened
// vocabulary (entity 'testimonial-submission'; accept/reject/delete).

type SubmissionRow = typeof testimonialSubmissions.$inferSelect;

/** The public write: insert as pending. No audit row — the Audit Log
 * records committed STAFF mutations (an AuditActor requires a session);
 * the rate-limit gate and the honeypot discard live at the route. */
export async function createTestimonialSubmission(
  db: Database,
  input: { quote: string; person: string }
): Promise<SubmissionRow> {
  const [row] = await db.insert(testimonialSubmissions).values(input).returning();
  if (!row) throw new Error('insert testimonial_submissions: no row returned');
  return row;
}

/** The moderation queue: every row, newest-first — the Submissions tab's
 * whole data (M7 #218 renders it); no status filter at the wire. */
export async function listAdminTestimonialSubmissions(db: Database): Promise<SubmissionRow[]> {
  return db
    .select()
    .from(testimonialSubmissions)
    .orderBy(desc(testimonialSubmissions.createdAt), desc(testimonialSubmissions.id));
}

// pending is the only transitionable state — a repeat accept would
// double-create a Testimonial; the 400 names the current status.
function nonPending(
  action: 'accepted' | 'rejected',
  status: TestimonialSubmissionStatus
): AdminWriteFailure {
  return {
    ok: false,
    reason: 'invalid',
    message: `Only pending submissions can be ${action}.`,
    details: [{ path: ['status'], message: `submission is ${status}` }],
  };
}

/**
 * Accept-with-edit: absent edit keys keep the stored text; present keys
 * were bounds-validated at the route. The Testimonial insert, the status
 * flip, and the audit row share ONE transaction — the position computes
 * BEFORE it (the createAdminTestimonial precedent: single-writer admin,
 * race accepted). ONE audit row per REQUEST (the gallery-photo commit
 * precedent: the request's primary entity is the submission; the created
 * Testimonial rides inside the same committed transaction).
 */
export async function acceptTestimonialSubmission(
  db: Database,
  audit: AuditActor,
  id: string,
  edit: AcceptTestimonialSubmissionInput
): Promise<AdminWriteResult<SubmissionRow>> {
  const [current] = await db
    .select()
    .from(testimonialSubmissions)
    .where(eq(testimonialSubmissions.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (current.status !== 'pending') return nonPending('accepted', current.status);
  const quote = edit.quote ?? current.quote;
  const person = edit.person ?? current.person;
  const position = await nextTestimonialPosition(db);
  const row = await db.transaction(async (tx) => {
    const [created] = await tx.insert(testimonials).values({ quote, person, position }).returning();
    if (!created) throw new Error('accept submission: testimonial insert returned no row');
    const [updated] = await tx
      .update(testimonialSubmissions)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(testimonialSubmissions.id, id))
      .returning();
    if (!updated) throw new Error('accept submission: status update returned no row');
    await writeAuditRow(tx, audit, {
      entity: 'testimonial-submission',
      entityId: id,
      action: 'accept',
      summary: person,
    });
    return updated;
  });
  return { ok: true, row };
}

/** Reject: retains the row (the audit trail, re-submission spotting) — the
 * write is the status flip + its audit row, nothing else. */
export async function rejectTestimonialSubmission(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminWriteResult<SubmissionRow>> {
  const [current] = await db
    .select()
    .from(testimonialSubmissions)
    .where(eq(testimonialSubmissions.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (current.status !== 'pending') return nonPending('rejected', current.status);
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(testimonialSubmissions)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(testimonialSubmissions.id, id))
      .returning();
    if (!updated) throw new Error('reject submission: status update returned no row');
    await writeAuditRow(tx, audit, {
      entity: 'testimonial-submission',
      entityId: id,
      action: 'reject',
      summary: current.person,
    });
    return updated;
  });
  return { ok: true, row };
}

/** Delete regardless of status (a submission references nothing — no guard
 * service; this is a moderation endpoint, not one of the nine). */
export async function deleteTestimonialSubmission(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<{ ok: true } | { ok: false; reason: 'not_found' }> {
  const [current] = await db
    .select()
    .from(testimonialSubmissions)
    .where(eq(testimonialSubmissions.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  await db.transaction(async (tx) => {
    await tx.delete(testimonialSubmissions).where(eq(testimonialSubmissions.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'testimonial-submission',
      entityId: id,
      action: 'delete',
      summary: current.person,
    });
  });
  return { ok: true };
}
```

(b) Create `apps/api/src/routes/testimonial-submissions.ts` with exactly:

```ts
import {
  createTestimonialSubmissionSchema,
  TESTIMONIAL_SUBMISSION_ACCEPTED,
} from '@sevendays/types';
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { tooManyRequests } from '../services/errors.js';
import { createTestimonialSubmission } from '../services/testimonial-submissions.js';
import { validatedJson } from '../services/validator.js';

// The public testimonial submission POST (M7 #216 — v1's only public write
// surface, both editions). Abuse posture, in gate order:
// 1. the Workers Rate Limiting binding (its FIRST user — wrangler.toml
//    [[ratelimits]] RATE_LIMITER, 5 per 60s): every attempt consumes,
//    BEFORE validation, so junk pays too. The key is per-IP: the edge's
//    CF-Connecting-IP for direct callers (unspoofable — it wins even when
//    X-Client-IP is also set); X-Client-IP when the request rides the
//    landing's service binding (ADR-0016 — the edge header is absent
//    there; the landing's server fn sets it from ITS own edge header, a
//    header the browser cannot set on this path); 'unknown' in dev.
// 2. the honeypot: a filled 'website' field silently discards with the
//    SAME 201 body — success-shaped, indistinguishable by construction.
// 3. the length bounds (quote 20–600, person 2–80) — the schema's 400s.
// The answer is ALWAYS generic: the fixed message, no row echo.
// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
const rateLimitSubmissions = async (
  c: import('hono').Context<ApiEnv>,
  next: () => Promise<void>
) => {
  const key = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Client-IP') ?? 'unknown';
  const outcome = await c.env.RATE_LIMITER.limit({ key });
  if (!outcome.success) {
    return tooManyRequests(c, "You're sending too fast — please wait a minute and try again.");
  }
  await next();
};

export const testimonialSubmissionsRoutes = new Hono<ApiEnv>().post(
  '/',
  rateLimitSubmissions,
  validatedJson(createTestimonialSubmissionSchema),
  async (c) => {
    const input = c.req.valid('json');
    // The silent discard: a filled honeypot answers the success shape and
    // never reaches the database.
    if (input.website) {
      return c.json(TESTIMONIAL_SUBMISSION_ACCEPTED, 201);
    }
    await createTestimonialSubmission(c.get('db'), {
      quote: input.quote,
      person: input.person,
    });
    return c.json(TESTIMONIAL_SUBMISSION_ACCEPTED, 201);
  }
);
```

(c) Create `apps/api/src/routes/admin-testimonial-submissions.ts` with exactly:

```ts
import { acceptTestimonialSubmissionSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAdminMutation } from '../observability/events.js';
import { auditActor } from '../services/audit.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import {
  acceptTestimonialSubmission,
  deleteTestimonialSubmission,
  listAdminTestimonialSubmissions,
  rejectTestimonialSubmission,
} from '../services/testimonial-submissions.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// The moderation endpoints (M7 #216) behind the admin root's ONE
// requireSession (401 structurally precedes every validator here) —
// action endpoints per the media presign/commit precedent: list;
// accept-with-edit (optionally edited {quote, person}; the Testimonial
// appends at the end of render order); reject (retains the row); delete
// regardless of status. No notifications — the queue IS the notification
// (the Submissions tab renders it at M7 #218). The reject route carries
// no body validator: there is nothing to validate.
const idParam = validatedParam(z.object({ id: z.uuid() }));

export const adminTestimonialSubmissions = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminTestimonialSubmissions(c.get('db')));
  })
  .post('/:id/accept', idParam, validatedJson(acceptTestimonialSubmissionSchema), async (c) => {
    const { id } = c.req.valid('param');
    const result = await acceptTestimonialSubmission(
      c.get('db'),
      auditActor(c),
      id,
      c.req.valid('json')
    );
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return notFound(c, 'Testimonial submission not found.');
      }
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'testimonial-submission', entityId: id });
    return c.json(result.row);
  })
  .post('/:id/reject', idParam, async (c) => {
    const { id } = c.req.valid('param');
    const result = await rejectTestimonialSubmission(c.get('db'), auditActor(c), id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return notFound(c, 'Testimonial submission not found.');
      }
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'testimonial-submission', entityId: id });
    return c.json(result.row);
  })
  .delete('/:id', idParam, async (c) => {
    const { id } = c.req.valid('param');
    const result = await deleteTestimonialSubmission(c.get('db'), auditActor(c), id);
    if (!result.ok) {
      return notFound(c, 'Testimonial submission not found.');
    }
    logAdminMutation(c, { entity: 'testimonial-submission', entityId: id });
    return c.body(null, 204);
  });
```

(d) `apps/api/src/routes/v1.ts` — the chain gains the public route between site-settings and admin, plus the import `import { testimonialSubmissionsRoutes } from './testimonial-submissions.js';`:

```ts
  .route('/site-settings', siteSettingsRoutes)
  .route('/testimonial-submissions', testimonialSubmissionsRoutes)
  .route('/admin', admin);
```

(e) `apps/api/src/routes/admin.ts` — the chain gains the moderation router after site-settings, plus the import `import { adminTestimonialSubmissions } from './admin-testimonial-submissions.js';`:

```ts
  .route('/site-settings', adminSiteSettings)
  .route('/testimonial-submissions', adminTestimonialSubmissions);
```

- [ ] **Step 6: Api green + gates + the atomic commit**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run` — **30 passed + 1 skipped files (31) / 422 passed + 3 skipped** (408 + the 11 suite its + the gate pin + the mutation-log pin + the routers-loop entry the red list itself counts; floor corrected from 421 by controller ruling 2026-10-14, with the truncate.test.ts hand-mirror amended to twenty-four tables / migrations 0000-0012). If a count differs, reconcile before proceeding — do not loosen assertions. Then `pnpm --filter @sevendays/api fix` (re-run), `pnpm --filter @sevendays/api typecheck`, `pnpm --filter @sevendays/types test -- --run` (green — the amended seven-action/eleven-entity lists), and — because both label walls rode this commit — `pnpm --filter @sevendays/admin typecheck` (green) and `pnpm --filter @sevendays/admin test -- --run` (green — **18 files / 195 tests unchanged**; the filters suite derives its expectations from the enums). Commit:

```bash
git add apps/api/wrangler.toml apps/api/src/env.ts apps/api/src/services/errors.ts apps/api/src/services/admin-gallery.ts apps/api/src/services/testimonial-submissions.ts apps/api/src/routes/testimonial-submissions.ts apps/api/src/routes/admin-testimonial-submissions.ts apps/api/src/routes/v1.ts apps/api/src/routes/admin.ts packages/types/src/audit.ts packages/types/src/audit.test.ts apps/admin/src/lib/audit/filters.ts apps/api/test/testimonial-submissions.test.ts apps/api/test/helpers/rate-limit-stub.ts apps/api/test/helpers/env.ts apps/api/test/admin-gate.test.ts apps/api/test/admin-mutation-log.test.ts
git commit -m "feat(api): testimonial submissions - the rate-limit binding's first user, the public POST, the moderation endpoints + audit vocabulary (#216)"
```

### Task 4: `packages/api-client` — the submission wrappers + the mock's subtree

**Files:**
- Modify (test-first): `packages/api-client/test/mock-api.ts`, `packages/api-client/test/loopback.test.ts`
- Create: `packages/api-client/src/routes/testimonial-submissions.ts`
- Modify: `packages/api-client/src/routes/admin.ts`, `packages/api-client/src/index.ts`

**Interfaces:**
- Produces (what Tasks 5–6 consume): `client.testimonialSubmissions.create(json)` → `Promise<TestimonialSubmissionAccepted>` (throws `ApiClientError(429)` — the ruled line rides `details.error`, since the client's `.message` is prefixed `API <status>:`; the form renders `details.error` verbatim); `client.admin.testimonialSubmissions.{list, accept(id, json?), reject(id), remove(id)}` (`accept` defaults `json` to `{}` — the RPC body is required by the route's validator even when the edit is empty; `reject` sends no body — the route has no body validator; `remove` resolves void on 204).
- Consumes: Task 2's schemas/constants (from the built dist — `pnpm build:packages` ran in Task 2) and Task 3's AppType routes.

**Not here:** `typing.test.ts` edits (every wrapper here is NEW — nothing existing changed type; the loopback legs exercise the wrappers end-to-end through the parse gate); a broken-variant mock fixture (the failure postures — 400 bounds, 429, 404 — are pinned in the api suite).

- [ ] **Step 1: Extend the mock + write the loopback pins**

(a) `packages/api-client/test/mock-api.ts` — four edits. First, the fixture (after the `SITE_SETTINGS_SAVED` object, before the `validatedJson` helper) — mutable module state, newest-first seed order:

```ts
// M7 #216: the submissions subtree's state — mutable module state like
// MOCK_SITE_SETTINGS_SAVED, seeded newest-first; the loopback's mutation
// its run in file order over these two rows.
const SUBMISSION_NOW = new Date('2026-10-14T00:00:00.000Z');
const SUBMISSION_OLDER = new Date('2026-10-13T00:00:00.000Z');
let MOCK_SUBMISSIONS = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    quote: 'The photos came out better than we hoped.',
    person: 'Maria, batch 2026',
    status: 'pending',
    createdAt: SUBMISSION_NOW,
    updatedAt: SUBMISSION_NOW,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000002',
    quote: 'Quick turnaround and lovely prints.',
    person: 'John B.',
    status: 'rejected',
    createdAt: SUBMISSION_OLDER,
    updatedAt: SUBMISSION_OLDER,
  },
];
```

Second, the import block gains `acceptTestimonialSubmissionSchema`, `createTestimonialSubmissionSchema`, `TESTIMONIAL_SUBMISSION_ACCEPTED` from `'@sevendays/types'`. Third, inside `makeApi` after the `testimonials` sub-app, the public sub-app (the discard mirrors the real route — same body, no state touch):

```ts
  // M7 #216: the public POST — the generic body for inserts AND honeypot
  // discards alike (byte-identical, the no-echo law).
  const testimonialSubmissions = new Hono<MockEnv>().post(
    '/',
    validatedJson(createTestimonialSubmissionSchema),
    (c) => {
      const input = c.req.valid('json');
      if (!input.website) {
        MOCK_SUBMISSIONS = [
          {
            id: 'b0000000-0000-4000-8000-000000000003',
            quote: input.quote,
            person: input.person,
            status: 'pending',
            createdAt: SUBMISSION_NOW,
            updatedAt: SUBMISSION_NOW,
          },
          ...MOCK_SUBMISSIONS,
        ];
      }
      return c.json(TESTIMONIAL_SUBMISSION_ACCEPTED, 201);
    }
  );
```

Fourth, the `admin` chain gains its moderation routes (after the site-settings PUT) — and note the reject route takes NO body, mirroring the real router:

```ts
    .get('/testimonial-submissions', (c) => c.json(MOCK_SUBMISSIONS))
    .post(
      '/testimonial-submissions/:id/accept',
      validatedJson(acceptTestimonialSubmissionSchema),
      (c) => {
        const row = MOCK_SUBMISSIONS.find((s) => s.id === c.req.param('id'));
        if (!row) return c.json({ error: 'Testimonial submission not found.' }, 404);
        const input = c.req.valid('json');
        row.quote = input.quote ?? row.quote;
        row.person = input.person ?? row.person;
        row.status = 'accepted';
        return c.json(row);
      }
    )
    .post('/testimonial-submissions/:id/reject', (c) => {
      const row = MOCK_SUBMISSIONS.find((s) => s.id === c.req.param('id'));
      if (!row) return c.json({ error: 'Testimonial submission not found.' }, 404);
      row.status = 'rejected';
      return c.json(row);
    })
    .delete('/testimonial-submissions/:id', (c) => {
      MOCK_SUBMISSIONS = MOCK_SUBMISSIONS.filter((s) => s.id !== c.req.param('id'));
      return c.body(null, 204);
    })
```

and the `v1` chain gains the public mount before `.route('/appointments', appointments)`:

```ts
    .route('/testimonials', testimonials)
    .route('/testimonial-submissions', testimonialSubmissions)
    .route('/site-settings', siteSettingsRoutes)
```

(match the file's existing order — the mount lands adjacent to testimonials; the exact neighbor is biome's, the mount itself is the pin).

(b) `packages/api-client/test/loopback.test.ts` — after the site-settings its, add (ORDER MATTERS: the mutation its run over the shared module state — list first, then accept row 1, then reject row 2, then delete row 2):

```ts
it('testimonialSubmissions.create parses the generic accepted body (message, nothing else)', async () => {
  const client = clientFor(mockApi);
  const accepted = await client.testimonialSubmissions.create({
    quote: 'The photographer made our graduation shoot feel effortless.',
    person: 'Loopback Sender',
  });
  expect(accepted).toEqual({ message: 'Thank you — your story is on its way.' });
});

it('a honeypot-filled create answers the byte-identical body (the discard is indistinguishable)', async () => {
  const client = clientFor(mockApi);
  const discarded = await client.testimonialSubmissions.create({
    quote: 'The photographer made our graduation shoot feel effortless.',
    person: 'Bot Sender',
    website: 'https://spam.example',
  });
  expect(discarded).toEqual({ message: 'Thank you — your story is on its way.' });
  // And the queue never saw it: no row anywhere is 'Bot Sender'.
  const rows = await client.admin.testimonialSubmissions.list();
  expect(rows.some((r) => r.person === 'Bot Sender')).toBe(false);
});

it('admin.testimonialSubmissions.list parses rows newest-first with the status enum + Date fields', async () => {
  const client = clientFor(mockApi);
  const rows = await client.admin.testimonialSubmissions.list();
  // The first create it unshifted 'Loopback Sender' ahead of the two seeds
  // — newest-first, and the honeypot row from the it above is absent.
  expect(rows.map((r) => r.person)).toEqual(['Loopback Sender', 'Maria, batch 2026', 'John B.']);
  expect(rows[0]?.status).toBe('pending');
  expect(rows[0]?.createdAt).toBeInstanceOf(Date);
  expect(rows[2]?.status).toBe('rejected');
});

it('admin.testimonialSubmissions.accept applies the edit and returns the updated row', async () => {
  const client = clientFor(mockApi);
  const accepted = await client.admin.testimonialSubmissions.accept(
    'b0000000-0000-4000-8000-000000000001',
    { person: 'Maria D.' }
  );
  expect(accepted.status).toBe('accepted');
  expect(accepted.person).toBe('Maria D.');
  expect(accepted.quote).toBe('The photos came out better than we hoped.'); // absent key = kept
});

it('admin.testimonialSubmissions.reject flips the row to rejected', async () => {
  const client = clientFor(mockApi);
  // The mock mirrors the WIRE, not the pending-only transition law (the
  // api suite owns that law) — row 2 answers the rejected wire shape.
  const rejected = await client.admin.testimonialSubmissions.reject(
    'b0000000-0000-4000-8000-000000000002'
  );
  expect(rejected.status).toBe('rejected');
});

it('admin.testimonialSubmissions.remove resolves void on 204', async () => {
  const client = clientFor(mockApi);
  await expect(
    client.admin.testimonialSubmissions.remove('b0000000-0000-4000-8000-000000000002')
  ).resolves.toBeUndefined();
  const rows = await client.admin.testimonialSubmissions.list();
  expect(rows.some((r) => r.id === 'b0000000-0000-4000-8000-000000000002')).toBe(false);
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/api-client test -- --run` — the six new its FAIL at runtime (`client.testimonialSubmissions is not a function`). Record red.

- [ ] **Step 3: Implement the wrappers**

(a) Create `packages/api-client/src/routes/testimonial-submissions.ts` with exactly:

```ts
import type { TestimonialSubmissionAccepted } from '@sevendays/types';
import { testimonialSubmissionAcceptedSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type CreateEndpoint = RpcClient['api']['v1']['testimonial-submissions']['$post'];

/** The RPC input as the route declares it (the honeypot rides optionally). */
export type CreateTestimonialSubmissionArgs = InferRequestType<CreateEndpoint>['json'];

/** Testimonial-submission wrappers: POST /api/v1/testimonial-submissions (the public write, M7 #216). */
export function testimonialSubmissionsRoutes(raw: RpcClient) {
  return {
    /** POST /api/v1/testimonial-submissions — 201 with the generic body (no row echo); 429 rejects with ApiClientError — the ruled line rides `details.error` (the `message` is prefixed `API <status>:`). */
    async create(json: CreateTestimonialSubmissionArgs): Promise<TestimonialSubmissionAccepted> {
      const res = await raw.api.v1['testimonial-submissions'].$post({ json });
      return unwrap(res, testimonialSubmissionAcceptedSchema);
    },
  };
}
```

(b) `packages/api-client/src/routes/admin.ts` — after the `adminTestimonials` group (before `adminRoutes`), add:

```ts
/** Testimonial-submission moderation wrappers over /api/v1/admin/testimonial-submissions (M7 #216 — the media action-endpoint precedent). */
export function adminTestimonialSubmissions(raw: RpcClient) {
  return {
    /** GET — the whole queue, newest-first (pending + rejected retained — the audit trail). */
    async list(): Promise<TestimonialSubmission[]> {
      const res = await raw.api.v1.admin['testimonial-submissions'].$get();
      return unwrap(res, testimonialSubmissionSchema.array());
    },
    /** POST /:id/accept — optionally edited {quote, person}; the Testimonial appends at the end of render order. */
    async accept(
      id: string,
      json: AcceptTestimonialSubmissionInput = {}
    ): Promise<TestimonialSubmission> {
      const res = await raw.api.v1.admin['testimonial-submissions'][':id'].accept.$post({
        param: { id },
        json,
      });
      return unwrap(res, testimonialSubmissionSchema);
    },
    /** POST /:id/reject — retains the row as rejected (no body: the route carries no validator). */
    async reject(id: string): Promise<TestimonialSubmission> {
      const res = await raw.api.v1.admin['testimonial-submissions'][':id'].reject.$post({
        param: { id },
      });
      return unwrap(res, testimonialSubmissionSchema);
    },
    /** DELETE /:id — regardless of status; 204 (the delete seam: no body to unwrap). */
    async remove(id: string): Promise<void> {
      const res = await raw.api.v1.admin['testimonial-submissions'][':id'].$delete({
        param: { id },
      });
      if (!res.ok) await unwrapError(res);
    },
  };
}
```

with the file's `@sevendays/types` import block gaining `type AcceptTestimonialSubmissionInput`, `type TestimonialSubmission`, `testimonialSubmissionSchema`; `unwrapError` is ALREADY in the file's `./unwrap.js` import (line 36, `import { unwrap, unwrapError } from '../unwrap.js';` — the #213 delete wrappers' seam; `remove` below uses it verbatim). The `adminRoutes` return object gains `testimonialSubmissions: adminTestimonialSubmissions(raw),` beside `testimonials`.

(c) `packages/api-client/src/index.ts` — the import block gains `import { testimonialSubmissionsRoutes } from './routes/testimonial-submissions.js';`; the `ApiClient` interface gains `testimonialSubmissions: ReturnType<typeof testimonialSubmissionsRoutes>;` (beside `testimonials`); the `createApiClient` return gains `testimonialSubmissions: testimonialSubmissionsRoutes(raw),` in the same position; and the type re-export block gains:

```ts
export type { CreateTestimonialSubmissionArgs } from './routes/testimonial-submissions.js';
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/api-client test -- --run` — **5 files / 45 tests** (39 + the six its). `pnpm --filter @sevendays/api-client typecheck` — green. `pnpm --filter @sevendays/api-client fix` (re-run). Commit:

```bash
git add packages/api-client/src/routes/testimonial-submissions.ts packages/api-client/src/routes/admin.ts packages/api-client/src/index.ts packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts
git commit -m "feat(api-client): the testimonialSubmissions wrappers - the public create + the admin moderation group over the mock loopback (#216)"
```

### Task 5: `apps/landing` — the seam (IP-forwarding client, the server fn, the form lib)

**Files:**
- Create (test-first): `apps/landing/src/lib/testimonial-form.test.ts`
- Create: `apps/landing/src/lib/testimonial-form.ts`
- Modify: `apps/landing/src/lib/api.server.ts`, `apps/landing/src/lib/api.functions.ts`

**Interfaces:**
- Produces (what Task 6 consumes): `getApiClientForwardingIp(clientIp: string | null)` (the IP-scoped client — sets `X-Client-IP` per request); `submitTestimonial({ data: CreateTestimonialSubmissionInput })` (server fn; resolves the accepted body; rejects with `ApiClientError(429)` — the ruled line rides `details.error`, since the client's `.message` is prefixed `API <status>:` per the booking seam's documented split; Task 6 renders `details.error`); the seam — `TestimonialFormValues`, `testimonialFormErrors(values)`, `canSubmitTestimonialForm(values)`, `buildTestimonialSubmissionPayload(values)`, `GENERIC_SEND_FAILURE_LINE`, `QUOTE_TOO_SHORT_LINE`, `PERSON_TOO_SHORT_LINE`.
- Consumes: Task 2's bounds constants (from the built dist); Task 4's `client.testimonialSubmissions.create`.

**Not here:** the page + CTA (Task 6); the admin side of anything (#218); any query factory (a one-shot mutation needs no queryOptions — the page holds local state, the prototype's shape); toast/Toaster (the landing has none and gains none — the spec's own line).

- [ ] **Step 1: Write the failing lib-seam tests**

Create `apps/landing/src/lib/testimonial-form.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
// biome-ignore lint/performance/noNamespaceImport: the plan pins the `seam.*` namespace handle (the booking seam suites' pattern)
import * as seam from './testimonial-form';

const valid = { quote: 'The photographer made our shoot feel effortless.', person: 'Maria', website: '' };

describe('testimonialFormErrors + canSubmitTestimonialForm (the gate)', () => {
  it('a valid form is clean and submittable', () => {
    expect(seam.testimonialFormErrors(valid)).toEqual({});
    expect(seam.canSubmitTestimonialForm(valid)).toBe(true);
  });

  it('a 19-char quote errors (the spec min is the gate — not the prototype’s mere non-empty); 20 is clean', () => {
    expect(seam.testimonialFormErrors({ ...valid, quote: 'x'.repeat(19) })).toEqual({
      quote: 'Tell us a little more — at least 20 characters.',
    });
    expect(seam.canSubmitTestimonialForm({ ...valid, quote: 'x'.repeat(19) })).toBe(false);
    expect(seam.testimonialFormErrors({ ...valid, quote: 'x'.repeat(20) })).toEqual({});
  });

  it('a whitespace-padded short quote errors (validation trims first)', () => {
    expect(seam.canSubmitTestimonialForm({ ...valid, quote: '   '.repeat(10) })).toBe(false);
  });

  it('a 1-char name errors; 2 is clean', () => {
    expect(seam.testimonialFormErrors({ ...valid, person: 'M' })).toEqual({
      person: 'Your name needs at least 2 characters.',
    });
    expect(seam.testimonialFormErrors({ ...valid, person: 'Mo' })).toEqual({});
  });

  it('the honeypot never blocks submit (canSubmit ignores website)', () => {
    expect(seam.canSubmitTestimonialForm({ ...valid, website: 'https://spam.example' })).toBe(
      true
    );
  });
});

describe('buildTestimonialSubmissionPayload (state → the POST body)', () => {
  it('trims quote and person before the wire', () => {
    const payload = seam.buildTestimonialSubmissionPayload({
      quote: '  Padded quote that is long enough.  ',
      person: '  Maria  ',
      website: '',
    });
    expect(payload.quote).toBe('Padded quote that is long enough.');
    expect(payload.person).toBe('Maria');
  });

  it('omits an empty website; carries a filled one verbatim', () => {
    expect('website' in seam.buildTestimonialSubmissionPayload(valid)).toBe(false);
    expect(
      seam.buildTestimonialSubmissionPayload({ ...valid, website: 'https://spam.example' })
    ).toMatchObject({ website: 'https://spam.example' });
  });

  it('the client bounds ARE the API schema numbers (the maxLength + counter can never drift)', () => {
    expect(seam.FORM_BOUNDS).toEqual({ quoteMin: 20, quoteMax: 600, personMin: 2, personMax: 80 });
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/landing test -- --run src/lib/testimonial-form.test.ts` — FAILS (the module does not exist). Record red.

- [ ] **Step 3: Implement the seam + the server fn**

(a) Create `apps/landing/src/lib/testimonial-form.ts` with exactly:

```ts
import {
  TESTIMONIAL_PERSON_MAX,
  TESTIMONIAL_PERSON_MIN,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_QUOTE_MIN,
} from '@sevendays/types';

// The share-your-story form seam (M7 #216, the landing lib-seam pattern):
// the public form's whole brain as pure functions — the bounds mirror the
// API schema by IMPORT (packages/types owns the numbers; the textarea
// maxLength, the counter, and this gate can never drift from the server),
// validation trims first (the payload sends trimmed values), and the
// honeypot rides along verbatim without ever gating submit. The max
// bounds are NOT seam errors by design: the inputs' maxLength hard-caps
// at the constant, and a programmatic overrun surfaces as the API's 400
// through the page's generic failure line.

/** The form's whole state (strings in; '' = empty). */
export interface TestimonialFormValues {
  quote: string;
  person: string;
  website: string;
}

/** The no-drift pin: one object the page's maxLength/counter attributes read. */
export const FORM_BOUNDS = {
  quoteMin: TESTIMONIAL_QUOTE_MIN,
  quoteMax: TESTIMONIAL_QUOTE_MAX,
  personMin: TESTIMONIAL_PERSON_MIN,
  personMax: TESTIMONIAL_PERSON_MAX,
} as const;

// TODO(owner-copy): the two min lines — pinned in the #216 plan, ratify
// in-round at the next owner touch (the house's draft-copy convention).
export const QUOTE_TOO_SHORT_LINE = 'Tell us a little more — at least 20 characters.';
export const PERSON_TOO_SHORT_LINE = 'Your name needs at least 2 characters.';

// The owner-ratified catch-all (2026-10-14): bounds validate inline, so
// this line is the rare network/API-failure state.
export const GENERIC_SEND_FAILURE_LINE = "Your story didn't send — please try again.";

export type TestimonialFormErrors = { quote?: string; person?: string };

export function testimonialFormErrors(values: TestimonialFormValues): TestimonialFormErrors {
  const errors: TestimonialFormErrors = {};
  if (values.quote.trim().length < TESTIMONIAL_QUOTE_MIN) {
    errors.quote = QUOTE_TOO_SHORT_LINE;
  }
  if (values.person.trim().length < TESTIMONIAL_PERSON_MIN) {
    errors.person = PERSON_TOO_SHORT_LINE;
  }
  return errors;
}

export function canSubmitTestimonialForm(values: TestimonialFormValues): boolean {
  return Object.keys(testimonialFormErrors(values)).length === 0;
}

export function buildTestimonialSubmissionPayload(values: TestimonialFormValues) {
  return {
    quote: values.quote.trim(),
    person: values.person.trim(),
    ...(values.website.trim() !== '' ? { website: values.website.trim() } : {}),
  };
}
```

(b) `apps/landing/src/lib/api.server.ts` — append (the admin's `fetchWithBearer` precedent, `apps/admin/src/lib/api.server.ts:78-87`):

```ts
// M7 #216: the submissions client forwards the visitor's IP. The API's
// rate limiter keys on CF-Connecting-IP (direct callers — unspoofable, it
// wins) else X-Client-IP. In production the landing calls over the API
// service binding (ADR-0016), where the edge header is absent: this fn
// re-sets it from the LANDING's own incoming request (set by our Worker,
// never by the browser — the browser never calls the API). The admin's
// fetchWithBearer precedent.
export function getApiClientForwardingIp(clientIp: string | null) {
  const underlying = serviceBindingFetch ?? fetch;
  const fetchWithClientIp: typeof fetch = async (input, init) => {
    if (!clientIp) return underlying(input, init);
    const headers = new Headers(init?.headers);
    headers.set('X-Client-IP', clientIp);
    return underlying(input, { ...init, headers });
  };
  return createApiClient({ baseUrl: getApiUrl(), fetch: fetchWithClientIp });
}
```

(c) `apps/landing/src/lib/api.functions.ts` — the import block gains `type CreateTestimonialSubmissionInput` from `'@sevendays/types'`, `getRequestHeaders` from `'@tanstack/react-start/server'`, and `getApiClientForwardingIp` from `'./api.server'`; after `createAppointment`, append:

```ts
/**
 * Public testimonial submission (M7 #216) — v1's only public write surface.
 * The visitor's IP rides X-Client-IP for the API's rate limiter (see
 * api.server.ts). Rejections reject with ApiClientError — the ruled 429
 * line rides `details.error` (the client's `.message` is prefixed
 * `API <status>:`) and the form renders it verbatim.
 */
export const submitTestimonial = createServerFn()
  .validator((input: CreateTestimonialSubmissionInput) => input)
  .handler(async ({ data }) => {
    return startSpan({ name: 'POST /api/v1/testimonial-submissions' }, async () => {
      const clientIp = getRequestHeaders().get('CF-Connecting-IP');
      return getApiClientForwardingIp(clientIp).testimonialSubmissions.create(data);
    });
  });
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/landing test -- --run` — **10 files / 92 tests** (84 + the 8 its). `pnpm --filter @sevendays/landing typecheck` — green (Task 2's `pnpm build:packages` keeps `@sevendays/types` current in dist). `pnpm --filter @sevendays/landing fix` (re-run). Commit:

```bash
git add apps/landing/src/lib/testimonial-form.ts apps/landing/src/lib/testimonial-form.test.ts apps/landing/src/lib/api.server.ts apps/landing/src/lib/api.functions.ts
git commit -m "feat(landing): the share-your-story seam - the IP-forwarding client, the submit server fn, the bounds/gate/payload lib (#216)"
```

### Task 6: `apps/landing` — the form page + the /about CTA (the ruled Round-4 composition, ported)

**Load the UI/UX skill set before this task's edits** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule). **No new owner-variants round**: the composition below IS the owner-reacted Round-4 closure (cited in the header), ported from the prototype's hand-rolled inputs onto today's shared primitives (`Label`/`Input`/`Textarea` from `@sevendays/ui` — the `book.tsx` imports; `buttonVariants` + `Link` for actions) and onto the booking form's own interaction grammar (blur-touched inline `text-destructive` errors — `book.tsx:300` is the pattern). The two spec-driven deviations from the prototype are ruled in the header: the counter/`maxLength` follow the spec's 600 bound, and the gate is the spec's min bounds. The prototype's `dark:` classes are dropped — the page builds on tokens only, theme-ready by construction for #217.

**Files:**
- Create: `apps/landing/src/routes/share-your-story.tsx`
- Modify: `apps/landing/src/routes/about.tsx`
- Regenerate (committed): `apps/landing/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: Task 5's entire seam (`testimonialFormErrors`, `canSubmitTestimonialForm`, `buildTestimonialSubmissionPayload`, `FORM_BOUNDS`, `GENERIC_SEND_FAILURE_LINE`, `TestimonialFormValues`), `submitTestimonial`, `ApiClientError` from `'@sevendays/api-client'` (the 429 message render), the shared primitives.
- Produces: the `/share-your-story` route (title 'Share your story | Sevendays Photography') and the `/about` CTA card linking to it.

**Not here:** the redesigned visual treatment (#224 — the ticket's fourth AC); dark-mode classes (#217); pending vocabulary beyond plain `disabled` (#218 owns the system — NO spinner/label-swap/`aria-busy` invention here; the fence-true minimum is a disabled submit while sending); a Toaster/toasts (the landing has none and gains none); nav entries (the page is reached via the /about CTA alone, the ruled shape); site-settings consumption (#223/#224).

- [ ] **Step 1: Create the route**

Create `apps/landing/src/routes/share-your-story.tsx` with exactly:

```tsx
import { ApiClientError } from '@sevendays/api-client';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { Textarea } from '@sevendays/ui/components/textarea';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { submitTestimonial } from '../lib/api.functions';
import {
  buildTestimonialSubmissionPayload,
  canSubmitTestimonialForm,
  FORM_BOUNDS,
  GENERIC_SEND_FAILURE_LINE,
  testimonialFormErrors,
  type TestimonialFormValues,
} from '../lib/testimonial-form';

export const Route = createFileRoute('/share-your-story')({
  head: () => ({ meta: [{ title: 'Share your story | Sevendays Photography' }] }),
  component: ShareYourStoryPage,
});

// The public testimonial submission page (M7 #216): the #164 prototype
// Round-4-ruled composition (owner-reacted 2026-10-01), ported onto
// today's primitives — #224 upgrades the visual treatment, #217 the
// theme. Quote + person ONLY; the counter and maxLength read the API
// schema's own numbers through FORM_BOUNDS (the spec's 600 bound — the
// prototype's 500 was a pre-spec stub); disabled-until-valid follows the
// spec's min bounds; the hidden honeypot rides the payload verbatim; the
// ruled success panel replaces the form on 201. The 429 line is the
// API's own error string (one source); anything else fails generic. The
// submit stays today's plain disabled vocabulary — #218's pending system
// covers this surface with the rest. Edition-independent: v1's only
// public write surface.
function ShareYourStoryPage() {
  const [values, setValues] = useState<TestimonialFormValues>({
    quote: '',
    person: '',
    website: '',
  });
  // Inline errors after blur-still-invalid (the booking form's #58 ruling).
  const [touched, setTouched] = useState({ quote: false, person: false });
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const errors = testimonialFormErrors(values);
  const canSubmit = canSubmitTestimonialForm(values) && !sending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmitTestimonialForm(values)) return;
    setSending(true);
    setFailure(null);
    try {
      await submitTestimonial({ data: buildTestimonialSubmissionPayload(values) });
      setSubmitted(true);
    } catch (error) {
      // 429 carries the ruled customer line in the parsed envelope
      // (details.error — the client's .message is prefixed "API <status>:",
      // the booking seam's documented split at booking.ts:215). Everything
      // else (bounds race, network) is the generic catch-all.
      const details = (error as { details?: { error?: unknown } } | undefined)?.details;
      const ruled =
        error instanceof ApiClientError && error.status === 429 && typeof details?.error === 'string'
          ? details.error
          : null;
      setFailure(ruled ?? GENERIC_SEND_FAILURE_LINE);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className='mx-auto max-w-2xl px-6 pt-12 pb-16'>
      <h1 className='font-bold font-serif text-4xl text-brand-ink'>Share your story</h1>
      <p className='mt-3 max-w-prose text-muted-foreground'>
        Shot with us recently? A few words about your session help the next customer choose with
        confidence. Selected stories appear on our About page.
      </p>

      {submitted ? (
        // The ruled success panel (Round 4): the generic answer — the
        // customer cannot tell a stored submission from a honeypot
        // discard, which is exactly the posture.
        <div className='mt-10 flex flex-col items-start gap-4 rounded-xl border border-line-soft bg-card p-6 shadow-sm'>
          <CheckCircle2 className='text-brand-700 size-8' aria-hidden='true' />
          <h2 className='font-semibold font-serif text-2xl text-brand-ink'>
            Thank you — your story is on its way.
          </h2>
          <p className='text-muted-foreground'>
            We read every submission. If we share yours, it appears with your name on the About
            page.
          </p>
          <Link to='/' className={cn(buttonVariants({ variant: 'outline' }))}>
            Back to home
          </Link>
        </div>
      ) : (
        <form className='mt-8 flex flex-col gap-5' onSubmit={handleSubmit}>
          <div>
            <Label htmlFor='story-quote'>Your experience</Label>
            <Textarea
              id='story-quote'
              value={values.quote}
              onChange={(e) => setValues({ ...values, quote: e.target.value })}
              onBlur={() => setTouched({ ...touched, quote: true })}
              required
              maxLength={FORM_BOUNDS.quoteMax}
              rows={5}
              placeholder='What was your session like?'
              className='mt-1.5'
            />
            <p className='text-muted-foreground mt-1 text-xs'>
              {values.quote.length}/{FORM_BOUNDS.quoteMax}
            </p>
            {touched.quote && errors.quote ? (
              <p className='text-destructive mt-1 text-sm' role='alert'>
                {errors.quote}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor='story-person'>Your name</Label>
            <Input
              id='story-person'
              type='text'
              value={values.person}
              onChange={(e) => setValues({ ...values, person: e.target.value })}
              onBlur={() => setTouched({ ...touched, person: true })}
              required
              maxLength={FORM_BOUNDS.personMax}
              placeholder='How should we credit you?'
              className='mt-1.5'
            />
            {touched.person && errors.person ? (
              <p className='text-destructive mt-1 text-sm' role='alert'>
                {errors.person}
              </p>
            ) : null}
          </div>
          {/* Honeypot: invisible to humans, irresistible to bots — the
              API's silent discard is the real gate (a filled 'website'
              answers the success shape and never reaches the database). */}
          <div aria-hidden='true' className='absolute h-0 w-0 overflow-hidden opacity-0'>
            <Label htmlFor='story-website'>Website</Label>
            <Input
              id='story-website'
              type='text'
              tabIndex={-1}
              autoComplete='off'
              value={values.website}
              onChange={(e) => setValues({ ...values, website: e.target.value })}
            />
          </div>
          {failure ? (
            <p className='text-destructive text-sm' role='alert'>
              {failure}
            </p>
          ) : null}
          <div className='mt-2 flex items-center gap-3'>
            <button
              type='submit'
              disabled={!canSubmit}
              className={cn(buttonVariants(), 'self-start disabled:opacity-50')}
            >
              Send my story
            </button>
            <Link
              to='/about'
              className='text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground'
            >
              Back to About
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: The /about CTA card**

`apps/landing/src/routes/about.tsx` — the import block gains `buttonVariants` from `'@sevendays/ui/components/button'`, `Link` from `'@tanstack/react-router'`, `cn` from `'cn'`, `PenLine` from `'lucide-react'`. Inside the Testimonials section, after the `{testimonials.length === 0 ? … : …}` block and before the section's closing `</section>`, add (the Round-4-ruled card, today's tokens):

```tsx
        {/* The submissions CTA (M7 #216, the #164 Round-4-ruled card): the
            only door to /share-your-story — v1's only public write surface. */}
        <div className='mt-10 flex flex-col items-start justify-between gap-4 rounded-xl border border-line-soft bg-card p-6 shadow-sm sm:flex-row sm:items-center'>
          <div>
            <h3 className='font-semibold font-serif text-brand-ink text-xl'>
              Shot with us recently?
            </h3>
            <p className='mt-1 text-muted-foreground text-sm'>
              Share a few words about your session — we'd love to hear it.
            </p>
          </div>
          <Link to='/share-your-story' className={cn(buttonVariants(), 'shrink-0')}>
            <PenLine className='size-4' aria-hidden='true' />
            Share your story
          </Link>
        </div>
```

- [ ] **Step 3: Regenerate the route tree + gates + commit**

Run `pnpm --filter @sevendays/landing build` — the TanStack router vite plugin regenerates `src/routeTree.gen.ts` to include `/share-your-story` (if the build is unavailable in the executor's session, start `pnpm --filter @sevendays/landing dev`, wait for the first compile, and stop it — the file regenerates either way; commit the regenerated file). Then `pnpm --filter @sevendays/landing typecheck` (green — the new route + the Link target resolve), `pnpm --filter @sevendays/landing test -- --run` (**10 files / 92 tests**, unchanged from Task 5), `pnpm --filter @sevendays/landing fix` (re-run). Commit:

```bash
git add apps/landing/src/routes/share-your-story.tsx apps/landing/src/routes/about.tsx apps/landing/src/routeTree.gen.ts
git commit -m "feat(landing): the share-your-story page + the /about CTA - the Round-4-ruled form on today's primitives (#216)"
```

### Task 7: Gates, docs rotation, PR + merge, the v1 pick, issue close, graphify

**Files:**
- Modify: `docs/plan.md`, `docs/progress.md`, `AGENTS.md`
- Post-merge (on main): `docs/agents/v1-picks.md`, `graphify-out/` (via `graphify update .`)

**Not here:** the Submissions tab (#218); anything in the sibling-fences list.

- [ ] **Step 1: The whole-branch gate**

With the compose db up: `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run` (31 files / 422+3 skipped), then `pnpm typecheck` and `pnpm lint` at the root (the repo-wide sweep — every package this ticket touched is green from Tasks 1–6; this catches cross-package drift, e.g. the regenerated route tree). Fix anything at its source task's file; re-run. Record the final counts in the evidence dir against the baselines line: types 17/167, api 30+1 skipped files/422+3 skipped, api-client 5/45, admin 18/195, landing 10/92, db 4.

- [ ] **Step 2: docs/plan.md — annotate, do NOT tick**

The M7 box "API + admin — the public testimonial form (#161)" (line 171) **stays unticked** — its text bundles the Submissions tab, which is #218's ("The Submissions tab UI rides the interaction-system ticket"). Append the dated annotation to the line's tail:

```text
 _(2026-10-14: the API + landing half landed in #216 — table 0012, the public POST behind the RATE_LIMITER binding's first user (5 per 60s, the ratified reconciliation of "~5 per 10 min" against the binding's 10s/60s windows), the moderation endpoints + audit vocabulary, /share-your-story + the /about CTA; the box waits for #218's Submissions tab.)_
```

- [ ] **Step 3: docs/progress.md + AGENTS.md**

(a) `docs/progress.md` — add the #216 entry to the M7 section (match the file's own entry format; content): the `testimonial_submissions` table (migration 0012, born-empty) + status enum; the wire in `packages/types` (bounds constants, create/status/read/accept schemas, the pinned generic response); the rate-limit binding end to end (`[[ratelimits]] RATE_LIMITER` 5/60s, env schema, `tooManyRequests`, the landing's IP-forwarding client — key = CF-Connecting-IP ?? X-Client-IP); the public POST (limit → validation → honeypot-discard → insert → the generic 201); the moderation endpoints (list newest-first, accept-with-edit appending at max+1, reject retains, delete-any-status; audit vocabulary `'testimonial-submission'` + `accept`/`reject`); the api-client wrappers; `/share-your-story` + the /about CTA (Round-4-ruled, today's primitives); floors: types 17/167, api 31 files (30 passed + 1 skipped) / 422+3, api-client 5/45, landing 10/92; the Submissions tab stays #218's.

(b) `AGENTS.md` — two edits. The "Current status of `pnpm test`" floors: api line appends "+ #216's eleven lifecycle pins + the accept 401 pin + the accept mutation-line pin" with counts "30 passed + 1 skipped (31) / 422 passed + 3 skipped"; api-client "5 files / 45 tests"; landing gains "(+ #216's eight share-your-story seam pins — 10 files / 92 tests)"; types "17 files / 167 tests" where the file counts are named. The Engineering Rules status paragraph (the long bullet) gains its #216 sentence after the site-settings sentence: "The public testimonial form is live (M7 #216): `testimonial_submissions` holds every public submission at the API (pending | accepted | rejected — nothing the public writes renders until staff accept appends a Testimonial at the render-order end), the public POST rides the Workers Rate Limiting binding's first user (5 per 60s per IP — the owner-ratified window; key = the edge IP, else the landing-forwarded X-Client-IP) with the honeypot silent-discard and the length bounds (quote 20–600, person 2–80), moderation answers at `/api/v1/admin/testimonial-submissions` (accept-with-edit / reject-retains / delete-any-status, audited), and `/share-your-story` + the /about CTA serve on both editions — the Submissions tab rides #218."

- [ ] **Step 4: PR + squash merge + the v1 pick + issue close + graphify**

(a) Push and open the PR (title: `feat: the public testimonial form — hold-at-API + moderation endpoints (#216)`; body: the four acceptance criteria each with how/where they were met + the evidence-dir pointer + the floors table). Squash-merge to main with the same title.

(b) The v1 pick (main-only, per `docs/agents/v1-picks.md`): the spec's class ledger pre-ruled this payload **PICK clean** — "Ruled both editions — v1's only public write surface; the binding addition is edition-neutral (wrangler.toml already a transformed surface)". Run the pick per the runbook (every commit's files apply clean; `graphify-out/` churn drops as always); the ledger row records one correction: the spec table's `[[ratelimit]]` is `[[ratelimits]]` in wrangler 4.127.1 (probed; the row quotes the real key).

(c) Close issue #216 with a comment mapping each acceptance criterion to its evidence (the suite names + the floors), and note the ruled follow-ups: #218 (the Submissions tab), #224 (the visual upgrade), Turnstile (the written-down escalation, adopted only if real spam beats the package).

(d) `graphify update .` on main (code was modified; AGENTS.md's rule) — the dirty `graphify-out/` files commit as the routine post-update churn.

- [ ] **Step 5: Final verification**

`gh pr view <n> --json mergedAt` (merged), `gh issue view 216 --json state` (closed), `git log --oneline -3` on main (the squash + the pick + the ledger row). The ticket is done when the four ACs are green, the floors match the baselines line, and the annotations landed (plan.md annotated-not-ticked; AGENTS.md + progress.md rotated).



