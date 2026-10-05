# Milestone 6 — Production Hardening & Observability (spec)

Consolidates every ruling of the M6 Production Hardening & Observability wayfinder map (#173, chartered 2026-10-03, closed 2026-10-05): the observability-menu research (#174), the logging + Sentry posture (#175), CORS + domains + ship-time topology + the at-ship secrets accounting (#176), the analytics dashboard incl. the #93 data-viz reversal (#177), the wider observability feature-set cut (#178), the Playwright pre-flight foundation (#179), and the verify gate's shape (#181). The milestone is the plan's v1 production slice — hardening (logging, Sentry, CORS, ship-time provisioning, secrets, domains) — **plus the owner's 2026-10-03 scope addition**: the admin analytics dashboard and the system-observability feature set. Two ADRs were written with this spec: **ADR-0022** (standalone Playwright as the browser-E2E + visual-regression foundation) and **ADR-0023** (the observability data path — admin server functions own the analytics queries). Published as GitHub issue #182; `docs/plan.md`'s Milestone 6 block red-penciled 2026-10-05 to match. Sequencing: M6 executes **before** M7 (Experience & CMS Maturation, spec #172 — its redesign visual regression is the Playwright foundation's flagship consumer); M8 (Handover) last. Cost posture throughout: **v1 is the free handover** — the client pays Supabase Pro from handover day; every other surface fits free tiers.

## Problem Statement

M1–M5 left the studio a working product on shared dev infrastructure — and nothing around it that makes v1 safe to point real customers and the client's team at:

- **No real logging.** The api runs Hono's `logger()` middleware to stdout; Workers Logs isn't even enabled. Nothing is observable in production, and nothing is quotable when something goes wrong.
- **Sentry is dormant everywhere.** No DSN is set on any app; the frontends carry dead scaffold (deps + `startSpan` calls, no-op without a DSN). A client-side error storm on the landing would be invisible.
- **CORS is theater.** A wildcard `origin: "*"` middleware guards an api no browser ever calls — every frontend→api call is server-side over the `API` service binding (ADR-0016). The wildcard protects zero real traffic while implying a posture that doesn't exist.
- **Ship has no shape.** v1 runs co-located on the owner's dev Cloudflare account and the shared Supabase project, on `*.workers.dev` URLs, with dev-era secrets. The delivery spec (issue #76) ruled dedicated accounts and inherit-in-place handover, but no ordered path exists from here to there.
- **Nobody can see anything.** The owner has no traffic numbers, no health signal, no storage/cost signal, no content-freshness view — and once the client's team operates the CMS, no answer to "who changed this, and when?"
- **"Verify" is half an eyeball.** The exit bar's second leg — "the v1 deployment works on the production domain" — is a manual click-around with no record and no assertions.

Every one of those is now ruled (map #173, tickets #174–#181). What's missing is the build: one milestone that stands up the observability baseline, seats the dashboard and the audit record, lands the browser-test foundation, and walks the ordered runbook to a verified production domain.

## Solution

Six payloads, plus the runbook that orders their ship-day consummation:

1. **The api observability baseline** — structured logging (Loglayer + Pino → Workers Logs, 3-day retention) with five PII-free event classes and a quotable `requestId`, and Sentry live on **all three apps** (one project, curated capture) — with the Application Log ≠ Audit Log split as a standing distinction.
2. **The closed CORS surface** — the wildcard middleware dropped entirely; browsers stay default-denied against a server-called api.
3. **The Audit Log** — the durable who/what/when of every CMS write, a database table written inside the mutation's own transaction, read on a new owner-only admin screen.
4. **The Analytics Dashboard** — the admin's new landing view at `/`: Traffic (PostHog), System Health (CF GraphQL + DB probes), Storage & Media (R2 + free-tier budget markers), Content (counts + freshness), and a Sentry link-out — queries owned by admin server functions (ADR-0023), all-staff by the aggregates-shared rule.
5. **The Playwright pre-flight** (the M2-pre-flight pattern: built once, ahead of the consumers) — standalone `@playwright/test` at a top-level `e2e/`, chromium-only, CI on-demand + nightly, never PR-gating, main-only (ADR-0022).
6. **The verify gate, made executable** — the production smoke: seven presence-level assertions over the deployed stack, read-only plus one sign-in act; nightly on teaser, owner-run on the v1 domain at ship. Commit-green (`pnpm check` + `pnpm build`) and smoke-green stay separate verdicts.

Ship-time provisioning — the dedicated Cloudflare account + Supabase org/project, the four custom domains, the at-ship secrets rotation, the media copy-across and `MEDIA_PUBLIC_BASE_URL` flip, the CI re-point — is ordered by **`docs/ship-provisioning-runbook.md`**, the owner-operated checklist whose last step is the production smoke itself.

## User Stories

**The observability baseline — developers, staff, customers**

1. As a developer, I want an access line for every api request except `/health` carrying `requestId`, method, route, status, and duration, so production behavior is observable without guessing.
2. As a developer, I want one admin-mutation event per CMS write carrying `entity`/`entityId`/`actorId`, so the write model's activity has its own evidence class.
3. As a developer, I want media failures (commit, thumbnail, presign) and email attempts + outcomes as structured events — with successful presigns quiet — so the two flakiest seams are visible without noise from the highest-frequency call.
4. As a developer, I want errors logged structurally (name, message, stack) replacing `console.error`, so `wrangler tail` answers in structured lines.
5. As a developer, I want a `requestId` minted per request and echoed as `X-Request-Id`, so a guest or staff member can quote the exact failing request.
6. As a developer, I want logging PII-minimal by construction — enumerated field schemas, never a raw request body, no email addresses, no IP/User-Agent/referrer in either sink — so logs are safe to read and to share.
7. As a developer, I want Workers Logs' 3-day retention accepted as v1's real-logging bar, so no paid pipeline rides the free handover.
8. As a developer, I want Sentry live on all three apps under one project, tagged per app, `release` = the deployed git SHA and `environment` = dev/teaser/v1, so "something is broken" has exactly one console.
9. As a developer, I want the api capturing errors + traces at 100% and the frontends errors-only, so signal is complete where traffic is small and web-side metrics stay PostHog's (no double instrumentation).
10. As a developer, I want capture curated — every 5xx, the curated media 503, and email-send failures; 4xx stays log-only — so Sentry's console reads "broken," not "a client typo'd a field."
11. As a customer, I want a quotable `X-Request-Id` when something fails, so reporting a problem points support at the exact request.

**The closed CORS surface — developers**

12. As a developer, I want the wildcard CORS middleware dropped entirely, so browsers remain default-denied against a server-called api — the true posture, with the R2 presign allowlist the one real browser-CORS surface.

**The Audit Log — the studio owner**

13. As the studio owner, I want every CMS write recorded durably — who, what, when — so "who changed this?" always has an answer once the client's team operates the CMS.
14. As the studio owner, I want the record written inside the mutation's own transaction, so a row exists exactly when the write committed and never otherwise.
15. As the studio owner, I want matrix replaces and package saves recorded as one entry each, so the record reads as actions, not row churn.
16. As the studio owner, I want an owner-only Audit Log screen — a filterable, newest-first table by entity, actor, action, and date — so investigating a change is a stop in the admin, not a database query.
17. As the studio owner, I want person-level history never mixed into the all-staff dashboard, so the standing rule ("aggregates are shared; anything person-level is owner-scoped") holds by construction.
18. As a developer, I want the audit row lean — actor email snapshotted at write, a name/slug summary, `requestId` correlation to the Application Log, no before/after blobs — so the durable record stays cheap and readable forever.

**The Analytics Dashboard — owner, staff**

19. As the studio owner, I want the admin's landing view to be the studio's operating pulse — traffic, system health, storage and media, content freshness — so one screen answers "how is the site doing?"
20. As the studio owner, I want landing pageviews and unique visitors by day, top landing pages, and Core Web Vitals p75 per route, so audience and experience are visible without a separate analytics product.
21. As the studio owner, I want api request volume and error-rate trend, CPU p50/p99, DB latency, pooler connection census, and DB size, so system health is one glance.
22. As the studio owner, I want landing and admin worker error rates beside the api's, so a broken deploy on either frontend surfaces without opening Sentry.
23. As the studio owner, I want R2 stored bytes, object count, and Class A/B op counts with free-tier budget markers, so the cost signal shows up before an invoice does.
24. As the studio owner, I want entity counts and last-updated per entity family, so stale content is visible without clicking through screens.
25. As the studio owner, I want a Sentry error count with a console link-out, so triage starts in the tool that owns the detail.
26. As a staff member, I want the dashboard shared with all staff (aggregates only), so the team reads one pulse while person-level data stays owner-scoped.
27. As a staff member, I want per-widget curated failure states, so an unconfigured or unavailable source reads as "not configured," never a broken page.
28. As a developer, I want the dashboard's queries in admin server functions behind their own session gate, so the api stays domain-pure and one gate discipline covers the app (ADR-0023).
29. As a developer, I want both editions served — dev-account tokens on main now, the dedicated v1 PostHog project and ship-day tokens at cutover — so the teaser shows a live dashboard and the client's numbers stay clean.

**The Playwright pre-flight + the verify gate — developers, customers**

30. As a developer, I want a standalone Playwright foundation at the repo root — chromium-only, cached browsers in CI, on-demand + nightly, never PR-gating — so browser E2E and M7's visual regression have one home without slowing any PR.
31. As a developer, I want the smoke to assert the deployed stack — api health, the landing home, a CMS-fed page, a live media asset, the booking page serving, the admin sign-in page, and a real staff sign-in — so "the deployment works" is executable, not an eyeball.
32. As a developer, I want the nightly walking the teaser deployment, so main's continuous deploys are guarded while nobody watches.
33. As a developer, I want the ship-day smoke as the runbook's final step on the production domain, so ship cannot complete with a red gate.
34. As a customer, I want the smoke read-only, so verification never plants test bookings or junk edits in the studio's real data.
35. As a developer, I want commit-green (`pnpm check` + `pnpm build`) and smoke-green kept as separate verdicts, so the release-commit gate stays fast, browserless, and unchanged.

**Ship-time provisioning — owner, developer, customers**

36. As the studio owner, I want v1 on ship-time-dedicated accounts (Cloudflare + Supabase) under real domains, so the client's production is cleanly separable from dev infrastructure at handover.
37. As a developer, I want an ordered owner-operated runbook — accounts → database → bucket → secrets → deploy → CI re-point → media copy → domains → media-URL flip → smoke — so ship day is a checklist, not a memory test.
38. As a developer, I want every secret rotated fresh at ship per the reconciled list, so nothing dev-held survives into the client's account.
39. As a customer, I want gallery images served from the studio's own domain, so media loads first-party on the production site.
40. As a customer, I want the curated gallery present on the day the site ships, so the studio opens with its work on the walls, not an empty room.

## Implementation Decisions

### The api observability baseline — logging (#175)

- **Five event classes**, nothing else: (a) an **access line for every request except `/health`** (uptime-probe noise stays out); (b) one **admin-mutation event** per CMS write; (c) **media events** — commit, thumbnail, and presign *failures* only (successful presigns stay quiet: the highest-frequency admin call, and its success is uninteresting); (d) **email events** — attempt + Resend outcome; (e) structured **error events** replacing today's `console.error` in `onError`.
- **Shape:** a request-scoped child logger off Hono middleware. A `requestId` (`crypto.randomUUID()`) minted per request, echoed as `X-Request-Id`. Fields: `evt`, `requestId`, `method`, `route`, `status`, `durationMs`, `actorId` (BetterAuth user id, present only when the session verified), `entity`/`entityId` on mutation events; errors add name/message/stack.
- **PII stance — by construction:** every event class carries an enumerated field schema (typed Loglayer layers); nothing anywhere logs a raw request body. No email addresses (`actorId` only); a booking is visible in logs only as `POST /api/v1/appointments → 201, requestId, durationMs`. No IP, no User-Agent, no referrer in either sink; Sentry `sendDefaultPii: false`.
- **Sink + retention:** Workers Logs via the `[observability]` block in the api's `wrangler.toml` (not yet enabled — this milestone enables it); `wrangler tail` for live. **3-day retention accepted** as v1's bar; Logpush stays off (paid-only); the Dec 1 2026 Cloudflare Observability pricing change is re-verified at ship.
- **The split is standing law:** the **Application Log** is ephemeral, humans-only, and never feeds any dashboard (Workers Logs has no read API regardless); the durable record of CMS writes is the **Audit Log** (below) — a schema-born table, never mined from logs. Both are glossary terms in `apps/api/CONTEXT.md` ## Observability.

### The api observability baseline — Sentry (#175)

- **Scope: all three apps.** The api via the Workers SDK; the frontends' dormant scaffold initialized (deps + `startSpan` calls already exist — no-op without a DSN, so someone intended this). Plan-box amendment: "Sentry wired into `apps/api`" gains "and the frontends' dormant scaffold initialized."
- **Tagging:** one Sentry project ("sevendays"); `release` = the deployed git SHA via `SENTRY_RELEASE` riding CI's existing per-environment var passing; `environment` = `dev` / `teaser` / `v1`; a per-app tag.
- **Sampling:** api errors + traces at 100% (traffic far under the 5M-span cap); frontends errors-only at 100%, no traces, no session replay (PostHog owns web vitals/audience — no double instrumentation). Revisit only near caps.
- **Capture posture:** every 5xx, the curated 503 (missing-R2 misconfig deserves paging-adjacent visibility), and email-send failures (captured at the send seam — no HTTP status signals them). 4xx stays log-only.

### The closed CORS surface (#176)

- **The middleware is dropped entirely** — not narrowed. No browser ever calls the api: every frontend→api call is server-side over the `API` service binding (ADR-0016; `API_URL` in dev), and the browser never holds the bearer token. Removing the wildcard leaves browsers default-denied — the correct posture. If a browser-facing api surface ever appears (v2 embedding), CORS arrives *with* that surface.
- The one real browser-CORS surface stays the R2 bucket's presigned-PUT allowlist (media runbook), recreated with the production admin origin on the fresh bucket at ship.

### The Audit Log (#178 — schema-based per #175's closed fork)

- **A database table written inside the mutation's transaction.** Scope: every write under the admin root — the nine entity routers (branches, print-sizes, gallery-photos, attires, addon-services, studio-services, service-packages, gallery-categories, testimonials), including deactivation flips, the three order PUTs, the two matrix full-replaces, and the atomic package save — **plus the media commit**. Excluded: presigns (write nothing), reads, auth events (not this table's frame). Only committed mutations record — the transaction is the gate.
- **Grain:** one row per committed mutation *request* — a matrix full-replace or the atomic package save is one row, not one per affected DB row.
- **Fields:** `occurredAt`, `actorId`, `actorEmail` (snapshot at write — the durable "who" even if the email later changes; staff emails already live in this DB), `entity`, `entityId`, `action` (**create | update | deactivate | reorder** — the enum, pinned here), `summary` (the entity's name/slug, so rows read without joins), `requestId` (correlates with the Application Log's mutation event). **No before/after blobs** (diffing is v2-if-ever).
- **Viewer:** a dedicated **owner-scoped screen in the admin CMS, named "Audit Log"** — a filterable table (entity, actor, action, date), newest first, paginated. Nav entry "Audit Log" in the Overview group beside Analytics, owner-role-only visibility; composition variants at execution (#94/#111). It never joins the all-staff Analytics Dashboard — person-level by the standing rule. Glossary term landed in `apps/admin/CONTEXT.md`.
- **Retention:** unbounded — a 3-branch studio's CMS writes rows per week, not per minute. No prune job, no export in M6 (CSV is v2-if-ever).

### The Analytics Dashboard (#177 + #178's additions)

- **One screen at `/`** (nav "Analytics", Overview group): the #93 stub dies; `/appointments` (the v2 teaser) untouched.
- **Four sections + a link-out:**
  - **Traffic** (PostHog HogQL, landing-scoped): pageviews + unique visitors by day, top landing pages, Core Web Vitals p75 per route. `$web_vitals` autocapture on the landing's provider only; the admin's own PostHog events stay captured but host-filtered out.
  - **System Health** (CF GraphQL + `packages/db` probes): api requests + error-rate trend, CPU p50/p99, DB latency probe (`SELECT 1`), pooler connection census, DB size — **plus one error-rate widget per frontend** (landing, admin; #178): same token, same `workersInvocationsAdaptive` shape, the frontends' only countable server-error home.
  - **Storage & Media** (CF GraphQL R2 datasets): stored-bytes trend, object count, Class A/B op counts, free-tier budget markers (10 GB storage / 1M Class A / 10M Class B monthly — a cost signal, not a quota).
  - **Content** (`packages/db`): entity counts (active packages, add-ons, gallery photos, testimonials) + last-updated per entity family.
  - **Sentry:** error count from `sum.errors` + a console link-out — never a rebuild.
- **Time windows (pinned):** default 7d; 24h/30d toggles offered where source granularity supports it (CF adaptive datasets and PostHog support all three; the DB-probe widgets are point-in-time and windowless).
- **Data path (ADR-0023):** a dedicated **metrics seam in `apps/admin` as server functions** — CF GraphQL client, DB probes over the existing `packages/db` client, PostHog HogQL fetch — behind its **own session gate** (server fns are directly callable; the CMS write-fns discipline). The api stays domain-pure: no metrics routes join `/api/v1`. Env (admin Worker, pinned here): `CF_ANALYTICS_READ_TOKEN`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`.
- **Caching:** none server-side (single-viewer admin); TanStack Query `staleTime` — system health **60s**, traffic **5 min**, storage **10 min**, content **5 min**. No polling/auto-refresh; revalidate on window focus + manual refresh.
- **Failure rendering:** per-widget curated states ("Analytics source not configured" / "source unavailable" — the #155 leak-safe pattern); the page never 500s; the loud detail stays log-only.
- **Role gating:** all staff, session-gated (ADR-0018 default), with the standing rule into the spec: **"aggregates are shared; anything person-level is owner-scoped."**
- **Editions:** **both.** Main gets dev-account tokens now (dev-side CF token + dev PostHog key in main's env — the teaser shows a live dashboard and M6 tests end-to-end). Ship-day: the production CF Analytics:Read token + a **dedicated v1 PostHog project** (client numbers stay clean), their keys entering the `v1` CI environment at cutover. v1's `/` redirect is replaced by the dashboard route — the index + sidebar hunks ride as a recorded **SPLIT** (v1 side: dashboard at `/`, an *Analytics* nav entry under Overview re-added), the `routeTree.gen.ts` codegen hazard carried from #168.
- **The #93 reversal:** chart components are **app-local in `apps/admin`**; `--chart-*` tokens live in the **admin's `@theme`**. `packages/ui/src/tokens.css`'s "No `--chart-*` tokens ship" clause is amended at build to record the reversal and name the new home; promotion to `packages/ui` stays open if a second consumer appears. Token vocabulary/count by rendered-variant prototypes at execution.
- **Booking-anything stays off this screen** (map ruling; v2's payload).

### The Playwright pre-flight (#179 — ADR-0022; the M2-pre-flight pattern)

- **Standalone `@playwright/test`** at a top-level `e2e/`: one root `playwright.config.ts`, `@playwright/test` as a root devDependency, a root `test:e2e` script deliberately **outside turbo's `test`** so `pnpm check` stays browserless. Vitest stays the in-process unit/integration umbrella exactly as ADR-0003 rules it. Suite taxonomy (pinned here): `e2e/smoke/` now; `e2e/visual/` arrives with M7's regression.
- **CI posture:** on-demand (`workflow_dispatch`) + **nightly** with cached browsers (`PLAYWRIGHT_BROWSERS_PATH`), **never PR-gating** — the PR gate stays exactly `pnpm check` + `pnpm build`; local runs remain the primary loop. A minimal PR smoke is a documented future option, deliberately not taken.
- **Engine scope:** chromium-only at landing; firefox/webkit are a documented later addition for smoke breadth — deliberately never for visual baselines.
- **Harness topology:** the CDP harnesses coexist through M6 (exit-gate class of record for already-shipped surfaces; M6 rewrites none); port-by-consumption from M7; booking-cluster harnesses port last (v2's payload); `confirmation-emails.mjs` (Resend polling, not browser-driven) rides with `booking-e2e` or survives as plain-node tooling; retirement ~M7 end. No big-bang port.
- **Classification:** owner tooling, **main-only, never picked** (the CDP-harness class) via one `paths.txt` edit adding `e2e`, `playwright.config.ts`, and the workflow path — the last load-bearing: `.github/workflows/` is not seeded out, and a scheduled workflow picked to v1 would fire nightly against files that don't exist there.

### The verify gate — the production smoke (#181)

- **Formalize, don't add:** the smoke *is* the exit bar's second leg ("the v1 deployment working on the production domain"), made executable. Commit-green stays `pnpm check` + `pnpm build` on the release commit; smoke-green is a separate post-deploy verdict. The spec's verify section names both legs; "green" is never both-at-once.
- **Seven assertions, presence/status-level, never content-text** (copy is CMS editorial state; empty states are legitimate renders): (1) api `/health` answers 200; (2) the landing home renders; (3) a CMS-fed landing surface renders (the landing→api→db read path on real domains); (4) a media asset loads — URL pulled from the fetched payload and GET'd, guarding the `MEDIA_PUBLIC_BASE_URL` flip and the copied-across gallery with zero hardcoded assets; (5) the booking form page serves (loads, never submits); (6) the admin sign-in page serves; (7) a real staff sign-in works — the seeded `smoke-staff` account signs in, the authenticated surface renders (the Analytics Dashboard at `/`), one session-gated fetch answers. Exact fetch/screens are execution detail.
- **Mutation posture:** read-only plus exactly one act — the sign-in (session creation, harmless by construction). No booking POSTs (real production rows); no CMS writes (the Audit Log would record junk).
- **Triggers:** the foundation's **nightly** walks the teaser deployment (public core + the authenticated leg with the dev `smoke-staff`); an owner-run **`workflow_dispatch`** walks the named target — v1 at ship (the runbook's final step) and re-runnable after any post-cutover owner re-deploy. No post-deploy webhooks (no auto-deploy pipeline exists to hook). One suite, env-parameterized (baseURL + credentials from the workflow's environment).
- **`smoke-staff` provisioning:** ship-side, folded into the runbook's secrets + vars step (below); dev-side, one account rides the foundation's execution against the dev database. Post-handover cadence is M8's question, deliberately not ruled here.

### Ship-time provisioning, topology, domains, secrets (#176 + the #129 carry)

- **Domains:** apex (+ `www` redirect, mechanism at execution) = landing; `admin.` = admin; `api.` = api; `media.` = the R2 public base. All four as Workers custom domains (auto certs, no routes), verified in DNS. Teaser stays on its unadvertised `*.workers.dev` URLs forever; v1-dev workers likewise until cutover.
- **Ship topology:** a dedicated Cloudflare account (scoped owner roles) + dedicated Supabase org/project; the three apps, bindings, and R2 bucket provisioned there; worker names keep the `sevendays-v1-*` form. **CI at cutover re-points the existing `v1` GitHub environment** (rotate `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`; the teaser leg never changes; environment history stays in one place). Post-handover deploys stay owner-run `wrangler`.
- **The at-ship secrets/env accounting (reconciled):**
  - **Rotated fresh:** `DATABASE_URL` (new project), `DATABASE_MIGRATE_URL` (owner-held), `BETTER_AUTH_SECRET`, the R2 S3 token pair, `SENTRY_DSN` (api Worker secret; one Sentry project) — plus, folded per #181, the `smoke-staff` credentials entering the `v1` environment.
  - **Carried/pointed anew:** `VITE_SENTRY_DSN` (public-by-design) + `SENTRY_RELEASE` (plain var, git SHA); `CLOUDFLARE_ACCOUNT_ID`, `MEDIA_PUBLIC_BASE_URL` (→ `media.<domain>` — the #129 ruling executed: read-time resolution only, zone + bucket same account), `API_URL`, `BETTER_AUTH_URL` (production domains); the fresh bucket's CORS rule with the production admin origin; the dashboard's `CF_ANALYTICS_READ_TOKEN` + `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` (production values, #177-dependent).
  - **Provisioned, not secret:** migrations 0000→latest + the catalog seed on the fresh DB.
  - **M7 arrivals, accounted not shipped (ADR-0021):** `RESEND_API_KEY` + `LANDING_ORIGIN` at M7's sending-domain task — no contradiction; this accounting includes their slot.
- **Media copies across** (scripted list+copy, one runbook step): a ship-day site with an empty gallery would defeat M6's purpose; the CMS remains the only ongoing content path after ship.
- **The runbook — `docs/ship-provisioning-runbook.md`**, owner-operated, ordered: dedicated CF account + scoped owner roles → Supabase org/project → migrations + seed → R2 bucket (CORS rule, lifecycle rule, S3 tokens) → secrets + vars (incl. `smoke-staff`) → `wrangler deploy` under the scoped roles (the dry-run gate) → re-point the `v1` environment → media copy → domains + DNS once the client registers → `MEDIA_PUBLIC_BASE_URL` flip → **the production smoke**.

### v1-pick classes (per-PR triage still applies per `docs/agents/v1-picks.md`)

| Payload | Class | Notes |
|---|---|---|
| Logging (Loglayer + Pino, event classes, `[observability]` block) | **PICK clean** | api code shared by both editions; `wrangler.toml` is a transformed surface, the block rides. |
| Sentry (api Workers SDK + frontends' init, tagging, capture) | **PICK clean** | `ci.yml` is byte-identical main↔v1, the var-passing hunk picks; `SENTRY_RELEASE` values differ per environment, not per branch. |
| CORS middleware drop | **PICK clean** | Dead-code removal on a shared app. |
| Audit Log (table + transactional writes + owner screen) | **PICK clean** | The client's operating record from day 1; both editions by construction. |
| Analytics Dashboard | **PICK with recorded SPLIT** | v1's index + sidebar hunks (dashboard at `/`, Analytics nav re-added); ship-day token swap into the `v1` CI env (incl. the dedicated v1 PostHog project). |
| PostHog web vitals (landing provider) | **PICK clean** | Landing provider wiring shared; v1 reports into the dedicated v1 project post-cutover. |
| Playwright foundation (`e2e/`, config, workflow, `paths.txt`) | **MAIN-ONLY, never picked** | Owner tooling — the CDP-harness class. |
| Smoke suite (`e2e/smoke/`) | **MAIN-ONLY, never picked** | Lives under `e2e/`; the v1 walk runs from main's workflow against v1's domain. |
| Ship provisioning + runbook | **Owner-operated docs, main-only** | Not code; the CI re-point is environment configuration, not a pick. |

### Sequencing (workstream order; the ticket-cut pass slices precisely)

1. **The api baseline:** the logging seam (Loglayer layers, requestId middleware, the five classes) + `[observability]` enabled + Sentry on the api, then the frontends' scaffold init + CORS middleware drop.
2. **The Audit Log's write side:** the table (migration) + transactional writes across the write model's seams.
3. **The metrics seam + the dashboard:** admin server fns (own session gate, tokens main-side), the four sections + link-out, the #93 reversal, the Audit Log viewer screen.
4. **The Playwright foundation + smoke:** `e2e/` + config + workflow (nightly + dispatch), the dev `smoke-staff`, the seven-assertion suite walking teaser.
5. **Ship:** runbook dry-run, provisioning on the dedicated accounts, cutover + CI re-point, media copy + domains + flip, the production smoke, docs rotation.

## Testing Decisions

- **Good tests assert external behavior** (wire shapes, emitted events, guard answers, rendered outcomes), never implementation internals. Prior art: the M5 api write-model suite, the admin lib-seam suites, the landing lib-seam suites, the api-client loopback suite.
- **The api vitest suites** (the behavioral backbone): the logging seam — each event class's enumerated field schema, the requestId contract (minted + echoed as `X-Request-Id`), the no-body/PII-minimal stance asserted at the logger seam; Sentry capture at the onError / curated-503 / email-send seams via a stubbed client (5xx captured, 4xx not); **the audit rows extending the existing admin-entity suites** — a committed write produces exactly one ruled-shape row (nine routers + media commit; matrix/package saves at request-grain), a failed validation produces none; CORS assertions drop with the middleware.
- **The admin lib-seam suite** (plain-node, the M5-seated pattern): the metrics seam — CF GraphQL query shapes + widget munging, the DB probes, the HogQL fetch, the curated per-widget failure states (the #155 class), staleTime config; the audit viewer's filter/pagination data fns.
- **Landing/admin lib seams:** Sentry init's no-op-without-DSN behavior; `MEDIA_PUBLIC_BASE_URL` read-time resolution stays covered where it already is.
- **packages/types contract tests** for the audit-event shape and any metrics response schemas that land in types.
- **The Playwright smoke is the deployed-stack gate**, not a `pnpm check` citizen: nightly on teaser, dispatch on v1; its own green, separate from commit-green.
- **Owner-reacted rendered variants** per UI-bearing ticket (#94 amendment): the dashboard's compositions, the Audit Log screen, the `--chart-*` vocabulary — variants the owner reacts to at execution.

## Out of Scope

- **Booking-funnel analytics + PostHog funnel events** — v2's hardening payload.
- **The appointments dashboard** (list/filter/status) — v2.
- **M7 maturation content** (landing redesign, CMS UX) — map #158 / spec #172; inline staleness in CMS screens is **M7's** (spec #172 gains the amendment at its ticket-cutting; this spec records the deferral).
- **Handover mechanics + post-handover cadence** (incl. whether the client inherits any smoke cadence) — M8.
- **External alerting/paging** (PagerDuty-class) — cost posture.
- **Auth-event / sign-in auditing** (a security log) — not the Audit Log's frame; a separate future effort if wanted.
- **Logpush, Sentry UI rebuilds, log-derived dashboard metrics** — paid or ruled out (Application Log is humans-only; Sentry is capture-only with a link-out).
- **Audit before/after diffs + CSV export** — v2-if-ever.
- **PR-gating browser tests** — documented future option, deliberately not taken.
- **firefox/webkit engines** — later, smoke breadth only, never visual baselines.
- **A second Sentry project, session replay, frontends' traces** — one project, errors-only posture stands.
- **Booking-endpoint rate limiting** — stays v2.

## Further Notes

- **Cost posture:** v1 is the free handover — the client pays Supabase Pro from handover day; every other surface (Workers Logs free tier, Sentry free, PostHog free, CF Analytics:Read, Actions minutes) fits free tiers. The **Dec 1 2026** Cloudflare Observability pricing change is re-verified at ship.
- **Glossary terms** landed with their resolving tickets (domain-modeling discipline): `apps/api/CONTEXT.md` ## Observability → **Application Log**, **Audit Log** (#175); `apps/admin/CONTEXT.md` → **Analytics Dashboard** (#177), **Audit Log** the screen (#178). No new term settles in this spec.
- **Docs riding this spec:** `docs/plan.md`'s M6 block red-penciled (with this spec); `docs/ship-provisioning-runbook.md` written at execution (its ordered shape ruled here); `docs/media-bucket-runbook.md` gains the fresh-bucket steps at execution; `packages/ui/src/tokens.css`'s no-chart-tokens clause amends at the dashboard ticket.
- **Execution tickets** are cut next via the spec → tickets → build loop (the M5 pattern: spec issue + native blocking), starting from § Sequencing. Nothing is built by this spec.
- **Sequencing guard:** M6 executes before M7; M7's redesign visual regression is the Playwright foundation's flagship consumer, and its verification posture is tool-neutral (the M7 gates hold either way — its spec already says so).
