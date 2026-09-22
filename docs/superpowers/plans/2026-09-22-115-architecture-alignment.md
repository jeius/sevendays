# architecture.md Alignment Pass (ticket #115) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** `docs/architecture.md`'s System Overview diagram, Data Flow section, and Deployment Targets table are aligned with deployed reality — the frontend→API edge names the `API` service binding as the production transport (ADR-0016), the table carries the branch-keyed CI deploy mechanism + secrets pointer in client-safe wording, Data Flow describes today (v1-mounted paths, `/booking/:id` read-back, the v2 dashboard forward-sentence) instead of an aspirational admin step, every claim re-verified against code/config with file:line evidence in the PR, and the merge flows through the v1-picks loop with its ledger row (after draining the pending `6aff692` split, in main order).

**Architecture:** A docs-only change set over one file, gated by an evidence bar: three edit tasks (diagram edge, table + pointer line, Data Flow rewrite) whose prose is pinned verbatim below, then a verification task that re-derives every diagram label, every table row, and the four "re-verify, don't rewrite" sections into an evidence block carried in the PR body. The file is a v1-picks transformed surface, so the tail of the plan is the runbook verbatim: drain `6aff692`'s pending split first (main order), merge this PR, then pick our own squash with the pre-mapped conflict expectations (Data Flow + Observability hunks drop as booking content; diagram + table + pointer apply client-safe), locks, and the ledger row.

**Tech Stack:** Markdown docs only; `gh` CLI (issue + PR); the v1 seed checkout (`~/Projects/sevendays-v1-seed`) + `scripts/v1-triage.mjs` + `scripts/audit-v1-absence.mjs` for the picks tail; pnpm + Turborepo for the `pnpm check` gate.

**Spec:** Implements ticket [#115 "docs(architecture): align System Overview, Data Flow, and Deployment Targets with deployed reality"](https://github.com/jeius/sevendays/issues/115) (label `ready-for-agent`). The ticket's five owner rulings (2026-09-22 grill, recorded in the issue) are the composition authority — this plan restates each where it bites. Key recon facts (2026-09-22, main `8e4f397`):

- **Scope fence (ruling 2):** `docs/architecture.md` ONLY (plus the standing close-out duties: `docs/progress.md` rotation + the v1-picks ledger row). `docs/PRD.md`, `docs/tech-stack.md`, `docs/plan.md`, `AGENTS.md` are NOT touched — they already carry their own alignment or own the editions story. Discrepancies found between code and the new prose get REPORTED (in the PR body), never silently smoothed. No code changes — `pnpm check` is a docs-only gate run (expect the recorded 35/35 turbo-task baseline, turbo-cached).
- **Sibling context (the deferred-pass split):** the cheap alignment fixes already landed in `6aff692` (packages/ui bullet, frontend-dependency sentence in the System Overview intro). This ticket is the deferred substantive pass — do not re-touch those two hunks' content.
- **Verified current state (live reads, 2026-09-22):** the ADR-0016 seam is real in both apps — `apps/landing/src/lib/api.server.ts:16-37` and `apps/admin/src/lib/api.server.ts:16-37` (`import.meta.env.DEV`-gated runtime-built `cloudflare:workers` import, `cf.env.API` binding's `fetch` bound into `createApiClient`'s custom-fetch seam; dev/vitest keep the `API_URL` path); both `wrangler.jsonc` files carry `services: [{ "binding": "API", "service": "sevendays-api" }]` + `nodejs_compat_populate_process_env`; `apps/api/src/index.ts:34-35` mounts `/health` top-level and `.route('/api/v1', v1)` (ADR-0010); the booking read-back is real — `apps/landing/src/lib/api.functions.ts:57-72` (`appointments.create` + `appointments.get`, span names `POST/GET /api/v1/appointments…`) and `apps/landing/src/routes/booking.$id.tsx:27` (`appointmentQueries.byId`); the send-after-commit is real — `apps/api/src/services/confirmation-email.ts:113-124` (ONE `executionCtx.waitUntil` after commit, ADR-0014); admin has NO appointments usage today (`apps/admin/src/lib/` = `api.functions.ts`/`api.server.ts`/`queries.ts`, zero `appointments` references — the dashboard is stub routes, so step 5's "future work" is accurate); CI is branch-keyed — `.github/workflows/ci.yml:9,11` (`branches: [main, v1]`), `needs: check` (line 75), `pnpm build` (line 61) then six `wrangler deploy --name` targets (lines 113–188); `apps/api/wrangler.toml:6-9` holds the R2 binding commented out ("TODO once provisioned") and lines 11–16 the secrets comment; `packages/db/src/schema/index.ts:16-17` holds the BetterAuth TODO; `packages/db/src/schema/service-packages.ts:24` holds `cover_image_key`; neither frontend's package.json depends on `@sevendays/db`; `@sentry/tanstackstart-react` + `posthog-js` are deps of both frontends; Hono `logger()` placeholder at `apps/api/src/index.ts:9`.
- **The v1 state (live-read 2026-09-22):** `~/Projects/sevendays-v1-seed` at `a59798d` (#101's pick, clean except a modified regenerable `apps/landing/src/routeTree.gen.ts` — restore it in Task 6 pre-flight). Backlog in main order: `6aff692` (split, **pick pending** — row 153 in `docs/agents/v1-picks.md`; its AGENTS/architecture/tech-stack hunks are client-safe design-system prose, the PRD hunk content-drops, progress is DU) → then this ticket's own merge. v1's `docs/architecture.md` variant (live-read): the diagram + Deployment Targets table are byte-identical to main's (the stale api row included), the intro sentence + packages/ui bullet are the pre-`6aff692` variant (Task 5's pick updates them), **Data Flow is a different section entirely** ("Data Flow: Catalog Reads" — booking scrubbed), and the Observability analytics line differs. v1's `docs/tech-stack.md` HAS a `### Continuous deploy (2026-09-11)` section (line 34) — the pointer line won't dangle there.
- **Audit-token map (18 tokens, `scripts/audit-v1-absence.mjs:72-89`):** the new Data Flow prose contains `/booking` (step 5), `/api/v1/appointments` (steps 3 + 5) — both tokens; those hunks drop at pick time as booking content anyway (v1 has no booking Data Flow). The diagram label, table rows, and pointer line contain ZERO tokens — verified against the full list (`appointmentQueries`, `\bcreateAppointment\b`, `getAppointment`, `CreateAppointmentArgs`, `phDateTime`, `lib/booking`, `components/booking`, `'/book`, `/booking`, `routes/appointments`, `.route('/appointments'`, `/api/v1/appointments`, `confirmation-email`, `RESEND_API_KEY`, `LANDING_ORIGIN`, `from 'resend'`, `"resend":`, `onboarding@resend.dev`).
- **Two drifts found during recon (both fixed as sanctioned wording drift, both reported in the PR):** (1) Observability's analytics line still says "…to instrument once the booking flow is built" — the flow HAS been built (M2, closed 2026-09-10); the funnel events are what's missing (Task 4's one-line fix). (2) Data Flow step 2 claims client-side validation "against `createAppointmentSchema`" — live grep shows `apps/landing/src/` never imports it: validation is per-step schemas (`contactSchema` at `apps/landing/src/lib/booking.ts:239-250`), the server fn's `.validator` is a typed pass-through (`apps/landing/src/lib/api.functions.ts:54-60`), and the full-schema parse is the API's (Task 3 rewords step 2 + step 4 names the schema). Everything else in Auth / Observability / Media Storage / Why-3-apps verified clean against the sources above.
- **Parked / out of scope (ticket's Out-of-scope list):** PRD, tech-stack, plan, AGENTS.md edits; any code change; M4 auth work (this lands BEFORE the M4 spec — sequencing ruling 5); the six-target/enumeration detail stays in `docs/tech-stack.md` § Continuous deploy (ruling 1).

## Global Constraints

- **Branch & baseline:** `feat/115-architecture-alignment` off main `8e4f397` (plain checkout — a docs-only ticket needs no worktree). This plan file is the branch's first commit. Gate: `pnpm check` green (expect 35/35 turbo tasks, docs-only + turbo-cached). Do not commit secrets; commit messages follow the repo's `type(scope): … (#115)` squash style.
- **Scope (ruling 2, verbatim fence):** `docs/architecture.md` is the ONLY source file edited by Tasks 1–3. Task 4 additionally rotates `docs/progress.md` (the standing AGENTS.md duty) and writes gitignored evidence. No edits to `docs/PRD.md`, `docs/tech-stack.md`, `docs/plan.md`, `AGENTS.md`, any `apps/**`/`packages/**` code, or any `wrangler.*`. A code-vs-prose discrepancy is a PR-body finding, never a silent smoothing.
- **Client-safe vocabulary (AC 2, ruling 1):** the System Overview, Module Boundaries intro, and Deployment Targets sections carry NO edition/teaser/v1/v2 vocabulary — wording must be true on both branches ("branch-keyed CI", "production transport: `API` service binding, ADR-0016"). Data Flow may name v2 exactly once, in the dashboard forward-sentence. Naming ADR-0016 is fine (it exists on v1, client-safe scrubbed); naming ADR-0015 is NOT (prefer the pointer without it).
- **Copy pins — the fenced blocks are verbatim:** Tasks 1–3's replacement prose is written out in full below; the executor lands it byte-identical (no paraphrase, no extra words). The Postgres "(M1.3, 2026-08-31)" and R2 "(planned)" diagram annotations stay as-is (ticket work item 1). Steps 1–2 of Data Flow stay byte-untouched.
- **Evidence bar (AC 1 + 3, ruling 4):** every diagram edge/label and every Deployment Targets row re-checked against code/config, and the "re-verify" sections (Auth, Observability, Media Storage, Why-3-apps) evidenced even where untouched — file:line listed in the PR body. Task 4's evidence block is the pinned template; the executor re-derives each row with the given command before pasting it.
- **v1-picks discipline (runbook `docs/agents/v1-picks.md`, verbatim procedures):** picks execute ONLY in `~/Projects/sevendays-v1-seed` (never check `v1` out in the main workspace); main order (`6aff692` before this ticket's merge); locks = local `pnpm check` + `pnpm build` green, export audit exit 0 (`node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` from the main repo), push, then the run's jobs show `check` + `Deploy v1 (private)` success and `Deploy teaser (main)` skipped; live curls after (landing 200, `/book` 404). Time-box: one hour of conflict work per pick → STOP, owner decides. Never weaken the audit or the checks. The SPLIT heredoc's blank line after `%B` is load-bearing.
- **Gates (repo AGENTS.md):** `pnpm check` green on the final tree before the PR; tick checkboxes with `- [✅]`; update `docs/progress.md` at close (Task 4 pins the entry); `graphify update .` is NOT needed (docs-only — no code modified); evidence lands in `.superpowers/sdd/2026-09-22-115-architecture-alignment/` (gitignored — evidence never bloats the PR).

---

### Task 1: The System Overview diagram — the production transport on the frontend→API edge

**Files:**
- Modify: `docs/architecture.md:16` (the single edge-label line inside the ASCII diagram, lines 7–30)

**Interfaces:**
- Consumes: the verified ADR-0016 facts (seam at `apps/{landing,admin}/src/lib/api.server.ts:16-37`; `services` binding in both `wrangler.jsonc` files).
- Produces: the diagram edge that names both transports client-safely — later tasks and the v1 pick rely on this exact wording containing zero audit tokens.

**Not here:** the intro paragraph above the diagram (line 5, already aligned by `6aff692`); the Postgres "(M1.3, 2026-08-31)" and R2 "(planned)" annotations (stay as-is per the ticket); the Module Boundaries section (untouched — the AC only forbids edition vocabulary there, and none exists); Data Flow + Deployment Targets (Tasks 2–3).

- [ ] **Step 1: Replace the edge label**

In `docs/architecture.md`, replace this line (line 16, inside the fenced diagram):

```text
                                   │ REST via @sevendays/api-client (server-to-server)
```

with exactly these three lines:

```text
                                   │ @sevendays/api-client, server-to-server (ADR-0006) —
                                   │ production transport: the `API` service binding (ADR-0016);
                                   │ dev + vitest: the API_URL network path
```

(The label rides the existing 35-column connector position; the box layout is untouched. "Production transport: `API` service binding, ADR-0016" is the ticket ruling 1's blessed client-safe phrase — true on both branches, since v1's binding targets its own `sevendays-v1-api` under the same `API` binding name, and the diagram deliberately does not name the service target.)

- [ ] **Step 2: Verify the diagram's unchanged claims still hold + token-sweep the new label**

```bash
grep -n 'M1.3, 2026-08-31\|(planned)' docs/architecture.md          # both annotations still present
grep -c 'service binding' docs/architecture.md                     # 1 (the new label)
grep -nE 'edition|teaser|v1|v2' docs/architecture.md | sed -n '1,12p'   # edition-vocab scan for the AC — see expected hits
```

Expected: both annotations present; exactly one "service binding" occurrence above the api box. The vocab scan legitimately hits existing lines OUTSIDE the three guarded sections (`docs/architecture.md:56` Auth's "guest booking is a v1 requirement" = PRD product vocabulary, Auth section is unguarded; the Data Flow section is Task 3's). The System Overview (lines 3–30), Module Boundaries intro, and Deployment Targets must show ZERO hits — the new label introduces none.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): the frontend-API edge names the production transport (#115)

The diagram edge gains the ADR-0016 reality: deployed environments call
the API through the \`API\` service binding (seam in each app's
src/lib/api.server.ts); dev + vitest keep the API_URL network path.
Client-safe wording per ticket ruling 1 — true on both branches."
```

---

### Task 2: Deployment Targets — the table rewrite + the client-safe editions pointer line

**Files:**
- Modify: `docs/architecture.md:68-75` (the whole `## Deployment Targets` section: table + new pointer line)

**Interfaces:**
- Consumes: the verified CI facts (`.github/workflows/ci.yml:9,11,75` branch-keyed + `needs: check`; `pnpm build` at line 61; six `wrangler deploy --name` targets at lines 113–188), the secrets pointer target (`docs/tech-stack.md:64` `## Secrets Checklist (none committed to the repo)`), the R2 comment (`apps/api/wrangler.toml:6-9`), the M4 naming (`docs/plan.md` M4 block; `docs/progress.md` Current Milestone).
- Produces: the client-safe mechanism rows + the ONE pointer line — the pointer targets `docs/tech-stack.md` § Continuous deploy, which exists on BOTH branches (main line 34; v1 line 34, client-safe heading).

**Not here:** no enumeration of the six worker targets or edition names (ruling 1 — that detail is tech-stack's); no ADR-0015 naming; the Auth/Observability/Media sections (Task 4); the diagram (Task 1).

- [ ] **Step 1: Replace the section body**

In `docs/architecture.md`, replace the ENTIRE `## Deployment Targets` section (from the `## Deployment Targets` heading's following line through the end of the table — keep the heading itself) with exactly:

```markdown
| App | Platform | Notes |
|---|---|---|
| `apps/landing` | Cloudflare Workers (via `@cloudflare/vite-plugin`), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Public, cacheable |
| `apps/admin` | Cloudflare Workers (via `@cloudflare/vite-plugin`), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Auth-gated (staff auth arrives with M4), separate deployment from landing |
| `apps/api` | Cloudflare Workers (via Wrangler), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Secrets set per environment via `wrangler secret put` — checklist in `docs/tech-stack.md` § Secrets Checklist; the R2 binding stays commented out until M5 (`apps/api/wrangler.toml`) |

Deploys are branch-keyed CI: a push builds (`pnpm build`) and deploys (`wrangler deploy`) the Workers its branch owns, gated on the same push's CI green. The pipeline and its per-branch targets are detailed in `docs/tech-stack.md` § Continuous deploy.
```

(Wording notes: "branch-keyed CI" + "production transport" are ruling 1's blessed client-safe phrases; "M4"/"M5" are milestone names — pickable product content per the #100 ledger precedent; the stale "Bindings/secrets TODO" note dies with this edit, replaced by the secrets pointer the wrangler.toml itself already documents; the pointer line deliberately omits ADR-0015.)

- [ ] **Step 2: Verify — AC vocab scan + pointer targets exist**

```bash
sed -n '/## Deployment Targets/,$p' docs/architecture.md | grep -inE 'edition|teaser|\bv1\b|\bv2\b|adr-0015|sevendays-api' && echo "VOCAB HIT — FIX" || echo "CLIENT-SAFE — OK"
grep -n '## Secrets Checklist' docs/tech-stack.md                  # exists (line 64)
grep -n '### Continuous deploy' docs/tech-stack.md                 # exists (line 34)
```

Expected: `CLIENT-SAFE — OK` (no edition/teaser/v1/v2/ADR-0015/service-target naming in the section — note `\bv1\b` does not match "ADR-0016" or "vite-plugin"); both pointer targets exist.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): deployment table carries the CI mechanism + secrets pointer (#115)

Branch-keyed CI deploys (pnpm build then wrangler deploy) in client-safe
wording, the api row's stale TODO replaced by the wrangler secret put
checklist pointer + the R2-until-M5 note, admin's auth row annotated
with M4, and one pointer line to tech-stack § Continuous deploy for the
pipeline detail."
```

---

### Task 3: Data Flow: Booking a Shoot — rewrite to today's reality

**Files:**
- Modify: `docs/architecture.md:46-52` (the five steps under `## Data Flow: Booking a Shoot`)

**Interfaces:**
- Consumes: the verified mount (`apps/api/src/index.ts:34-35`), the read-back path (`apps/landing/src/lib/api.functions.ts:57-72` + `apps/landing/src/routes/booking.$id.tsx:27`), the intake transaction + send-after-commit (`apps/api/src/services/` intake + `confirmation-email.ts:113-124`, ADR-0014), the admin-has-no-appointments fact.
- Produces: the reality-described flow with exactly ONE "v2" occurrence (AC 2's exception) — this section's hunks are the ones that DROP at v1 pick time (booking content; v1's variant is "Data Flow: Catalog Reads").

**Not here:** steps 1–2 (byte-untouched); the Auth section's guest-booking sentence (PRD product vocabulary, unguarded section); the Observability booking-funnel line (Task 4's drift fix, different section).

- [ ] **Step 1: Replace steps 3–5, sharpen step 4**

In `docs/architecture.md`, replace the block of numbered items 2, 3, 4, and 5 under `## Data Flow: Booking a Shoot` (step 1 stays byte-identical) with exactly:

```markdown
2. The wizard validates each step client-side with Zod schemas in `apps/landing/src/lib/booking.ts` (contact info, slot gating); the submit payload is typed as `CreateAppointmentArgs`, and the full shared-schema parse happens server-side (step 4).
3. `apps/landing`'s server function calls `POST /api/v1/appointments` on `apps/api` (ADR-0010 path-versioned mount; `/health` stays top-level) through `@sevendays/api-client` — the browser talks only to its own app; frontend→API calls are always server-to-server (ADR-0006).
4. `apps/api` re-validates the payload with `createAppointmentSchema` from `packages/types` (never trust the client), writes the appointment and its chosen offering in a single intake transaction via `packages/db`, and schedules the Resend confirmation email after the commit via `ctx.waitUntil` (ADR-0014) — the response never waits on the send.
5. The customer lands on `/booking/:id`, which reads the appointment snapshot back through the public single-get endpoint (`appointments.get` via `apps/landing`'s server functions). The admin appointments dashboard is future work (v2): it will fetch `GET /api/v1/appointments` through the same `@sevendays/api-client` from its own server functions, cached by TanStack Query (ADR-0006).
```

(Delta map: step 2 = drift fix, found live during recon — `createAppointmentSchema` is NOT imported anywhere in `apps/landing/src/` (grep clean); client-side validation is per-step schemas (`contactSchema` at `booking.ts:239-250`), the server fn's `.validator` is a typed pass-through (`api.functions.ts:54-60`), and the full-schema parse is the API's. The ticket's "keep steps 1, 2, 4 … adjusting only path/wording drift found while in there" sanctions exactly this. Step 3 = the path fix + ADR-0010 parenthetical, nothing else; step 4 = names the schema (so "re-validates" no longer leans on step 2's old claim) + the two verified mechanics made explicit (single intake transaction at `apps/api/src/services/appointments.ts:92`, `ctx.waitUntil` send-after-commit at `confirmation-email.ts:113-124`); step 5 = the rewrite per ruling 3, ending in the one allowed v2 forward-sentence.)

- [ ] **Step 2: Verify — path literals + the one-v2 budget**

```bash
grep -n 'POST /api/appointments' docs/architecture.md    # no hits (old unmounted path gone)
grep -c 'v2' docs/architecture.md                        # 1 — the Data Flow forward-sentence only
grep -n '/booking/:id\|appointments.get' docs/architecture.md   # both present in step 5
grep -c 'createAppointmentSchema' docs/architecture.md   # 1 — step 4's server-side parse only
```

Expected: zero hits for the unmounted `POST /api/appointments`; exactly one `v2` in the whole file (step 5); both step-5 markers present.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): data flow describes today — mounted paths, read-back, v2 forward-sentence (#115)

Step 2 reworded to the real client-side story (per-step Zod in
lib/booking.ts; the shared-schema parse is the API's — landing never
imports createAppointmentSchema); step 3's POST moves to
/api/v1/appointments (ADR-0010); step 4 names the schema + the single
intake transaction + the ctx.waitUntil send-after-commit (ADR-0014);
step 5 replaces the aspirational admin-dashboard step with the
/booking/:id snapshot read-back and one v2 forward-sentence per
ruling 3."
```

---

### Task 4: The mini re-audit — evidence for every claim, the Observability drift fix, progress rotation, and the PR

**Files:**
- Modify: `docs/architecture.md:66` (the ONE drift fix: Observability analytics line)
- Modify: `docs/progress.md` (rotate the Immediate Next Steps / Last-updated header — the standing AGENTS.md duty)
- Create (gitignored): `.superpowers/sdd/2026-09-22-115-architecture-alignment/evidence.md`
- The PR body carries the evidence block (AC 1 + 3)

**Interfaces:**
- Consumes: Tasks 1–3 (the edited file); the verified sources listed in the plan header's recon facts.
- Produces: the evidence block quoted into the PR body; the merge-ready branch; the facts Task 6's ledger row needs.

**Not here:** no rewording of any other sentence in the four "re-verify" sections (they verified clean — the drift fix is the single sanctioned exception); no edits to Auth/Media/Why-3-apps content; no M4 work.

- [ ] **Step 1: The one drift fix — Observability's analytics line**

In `docs/architecture.md`, replace:

```markdown
- **Analytics:** PostHog is scaffolded into `landing` and `admin` via the CLI add-on. The booking funnel (view package → start booking → complete booking) is the primary metric to instrument once the booking flow is built.
```

with exactly:

```markdown
- **Analytics:** PostHog is scaffolded into `landing` and `admin` via the CLI add-on. The booking funnel (view package → start booking → complete booking) is the primary metric to instrument — the flow itself is built (M2, closed 2026-09-10); the funnel events are not yet wired.
```

(The only drift found in the re-verify set: "once the booking flow is built" describes a state that ended 2026-09-10. This hunk is booking content and drops at v1 pick time — v1's variant has its own client-safe analytics line.)

- [ ] **Step 2: Re-derive the evidence — every row, live**

Run each row's check command NOW (the recon table below was verified live 2026-09-22; the executor re-derives before pasting — diagrams are claims). Any row that fails to reproduce is a FINDING: report it in the PR body under "Discrepancies", do not adjust prose to match a stale claim without a ticket ruling.

```bash
# Diagram + table claims
sed -n '16,20p' apps/landing/src/lib/api.server.ts            # the ADR-0016 seam comment block
grep -n '"services"' apps/landing/wrangler.jsonc apps/admin/wrangler.jsonc
grep -n 'nodejs_compat_populate_process_env' apps/landing/wrangler.jsonc apps/admin/wrangler.jsonc
grep -n "get('/health')\|route('/api/v1'" apps/api/src/index.ts
sed -n '1,4p;6,16p' apps/api/wrangler.toml                     # Workers platform, commented R2, secrets comment
grep -n 'cloudflare' apps/landing/vite.config.ts apps/admin/vite.config.ts
grep -n 'branches:\|needs: check\|run: pnpm build$\|wrangler deploy --name' .github/workflows/ci.yml
grep -n '@sevendays/db' apps/landing/package.json apps/admin/package.json || echo "FRONTENDS: NO @sevendays/db DEP — OK"
# Data Flow claims
sed -n '57,72p' apps/landing/src/lib/api.functions.ts          # create + get wrappers, span names
sed -n '54,60p' apps/landing/src/lib/api.functions.ts          # the .validator typed pass-through
sed -n '239,250p' apps/landing/src/lib/booking.ts              # contactSchema — the per-step reality
grep -rn 'createAppointmentSchema' apps/landing/src/ || echo "LANDING: NO createAppointmentSchema IMPORT — OK (the drift finding)"
grep -n 'appointmentQueries.byId' apps/landing/src/routes/booking.\$id.tsx
grep -n 'db.transaction' apps/api/src/services/appointments.ts  # the single intake transaction (:92)
grep -n 'waitUntil' apps/api/src/services/confirmation-email.ts
grep -rn 'appointments' apps/admin/src/lib/ || echo "ADMIN: NO APPOINTMENTS USAGE — OK"
# Re-verify sections
grep -n 'logger()' apps/api/src/index.ts
grep -o '"@sentry/tanstackstart-react"\|"posthog-js"' apps/landing/package.json apps/admin/package.json
sed -n '16,17p' packages/db/src/schema/index.ts                 # BetterAuth TODO
grep -n "cover_image_key" packages/db/src/schema/service-packages.ts
```

Every command must reproduce the recon facts (plan header). Record actual outputs in the evidence file.

- [ ] **Step 3: Write the evidence file + the PR body block**

Write `.superpowers/sdd/2026-09-22-115-architecture-alignment/evidence.md` with the command outputs from Step 2, then compose the PR body carrying this evidence block (re-deriving each row first — the block below is the template with the 2026-09-22 recon values):

```markdown
## Claim-by-claim evidence (the #115 mini re-audit — AC 1 + 3)

### System Overview (diagram + intro)
| Claim | Evidence |
|---|---|
| Three independently deployed Workers; landing/admin are Worker-based TanStack Start via `@cloudflare/vite-plugin`, not Pages | `apps/landing/vite.config.ts:1,12` + `apps/admin/vite.config.ts:1,12` (`cloudflare` plugin, ssr environment); `apps/landing/wrangler.jsonc` + `apps/admin/wrangler.jsonc` (`main: @tanstack/react-start/server-entry`); `apps/api/wrangler.toml:1-4` |
| Frontends depend only on shared packages (no DB client) | `apps/landing/package.json` + `apps/admin/package.json` — no `@sevendays/db` entry (grep clean); `apps/api/package.json` carries it |
| Frontend→API: `@sevendays/api-client`, server-to-server (ADR-0006) | `apps/landing/src/lib/api.server.ts:1,39-41` + `apps/admin/src/lib/api.server.ts:1,39-41`; consumers are only the apps' `api.functions.ts` |
| Production transport: the `API` service binding (ADR-0016) | `apps/{landing,admin}/wrangler.jsonc` `services: [{ "binding": "API", "service": "sevendays-api" }]` + `nodejs_compat_populate_process_env`; the seam: `apps/{landing,admin}/src/lib/api.server.ts:16-37` (`import.meta.env.DEV`-gated runtime-built `cloudflare:workers` import; `cf.env.API`'s `fetch` bound into the client's custom-fetch seam); dev/vitest keep the `API_URL` network path |
| API→Postgres via Drizzle, `packages/db` the only client | `apps/api` services import `@sevendays/db`; `packages/db` exports `createDbClient` |
| Postgres "(M1.3, 2026-08-31)" / R2 "(planned)" annotations | kept as-is per ticket; R2 reality: `apps/api/wrangler.toml:6-9` commented out |

### Deployment Targets
| Claim | Evidence |
|---|---|
| Branch-keyed CI deploys (`pnpm build`, then `wrangler deploy`), gated on CI green | `.github/workflows/ci.yml:9,11` (`branches: [main, v1]`), `:75` (`needs: check`), `:61` (`pnpm build`), `:113-188` (six `wrangler deploy --name` targets — enumeration stays in `docs/tech-stack.md` § Continuous deploy per ruling 1) |
| admin: staff auth arrives with M4 | `docs/plan.md` Milestone 4 block; `docs/progress.md` Current Milestone ("next up Milestone 4 (Admin Auth)") |
| api: secrets per environment via `wrangler secret put`; R2 commented until M5 | `apps/api/wrangler.toml:11-16` (secrets comment), `:6-9` (commented `[[r2_buckets]]` "TODO once provisioned"); checklist: `docs/tech-stack.md:64` § Secrets Checklist |

### Data Flow: Booking a Shoot
| Claim | Evidence |
|---|---|
| `POST /api/v1/appointments`; `/health` top-level (ADR-0010) | `apps/api/src/index.ts:34-35`; the client wrapper + span name: `apps/landing/src/lib/api.functions.ts:57-58` |
| Client-side validation is per-step, not the shared create schema (drift fixed) | `apps/landing/src/lib/booking.ts:239-250` (`contactSchema` + step gating); `apps/landing/src/lib/api.functions.ts:54-60` (`.validator` typed pass-through); zero `createAppointmentSchema` imports in `apps/landing/src/` (grep clean) |
| API re-validates the payload with `createAppointmentSchema` | schema owned by `packages/types`; parsed server-side in `apps/api`'s create route (never trusts the client) |
| Single intake transaction (ADR-0012/0013) | `apps/api/src/services/appointments.ts:92` (`db.transaction(…)`) |
| Resend send-after-commit via `ctx.waitUntil` (ADR-0014) | `apps/api/src/services/confirmation-email.ts:113-124` |
| `/booking/:id` reads the snapshot via the public single-get | `apps/landing/src/routes/booking.$id.tsx:27` (`appointmentQueries.byId`); `apps/landing/src/lib/api.functions.ts:71-72` (`appointments.get`) |
| Admin appointments dashboard = future work (v2) | `apps/admin/src/lib/` has zero `appointments` references (grep clean); admin routes are the #100 stub shell |

### Re-verify, don't rewrite (AC 3 — evidenced even where untouched)
| Section | Verdict | Evidence |
|---|---|---|
| Auth (planned, M4 — ADR-0004 shape) | clean | `docs/adr/0004-betterauth-shared-tables-token-verification.md`; `packages/db/src/schema/index.ts:16-17` (BetterAuth TODO); no betterauth integration in any `package.json` |
| Observability | one drift fixed | `logger()` placeholder `apps/api/src/index.ts:9`; `@sentry/tanstackstart-react` + `posthog-js` in both frontend `package.json`s; Loglayer/Pino remains M6-planned; the analytics line's "once the booking flow is built" corrected (flow built M2, events unwired) |
| Media Storage | clean | R2 binding commented (`apps/api/wrangler.toml:6-9`); `packages/db/src/schema/service-packages.ts:24` (`cover_image_key`); resolution strategy still undecided — record-ADR-when-decided stays |
| Why 3 separate apps | clean | prose-level; consistent with the deployment/CI facts above |

### Discrepancies found (code vs prose)
_Two wording-drift lines found in recon and fixed in this PR, both within the ticket's "adjusting only path/wording drift found while in there" grant: Data Flow step 2's client-side `createAppointmentSchema` claim (landing never imports it — per-step schemas are the reality) and Observability's "once the booking flow is built" (flow built M2, closed 2026-09-10; the funnel events are what's missing)._ (If Step 2 surfaced any further mismatch, list it here as a finding — reported, not smoothed.)
```

- [ ] **Step 4: Write `pr-body.md` + rotate `docs/progress.md`**

Write `.superpowers/sdd/2026-09-22-115-architecture-alignment/pr-body.md` = the three intro lines quoted in Step 6's `printf` followed by the evidence block above (Step 6 cats this file — keeping the PR body reproducible). Then rotate `docs/progress.md` line 3, the `_Last updated: …_` header: the new text is the fenced block below, welded so the old header's content (from `session close-out:` onward) follows the `Prior (same day) — ` marker inside the same italic run (house style stacks priors in one `_…_` block):

```markdown
_Last updated: 2026-09-22 (#115 architecture.md alignment pass: the System Overview diagram names the `API` service-binding production transport (ADR-0016), the Deployment Targets table carries the branch-keyed CI mechanism + secrets pointer in client-safe wording with one pointer line to tech-stack § Continuous deploy, Data Flow rewritten to today (mounted paths, per-step client validation, `/booking/:id` read-back, one v2 forward-sentence), every claim re-evidenced file:line in the PR; the pending `6aff692` v1 split pick and #115's own pick + ledger row run immediately after this lands, same session — rows in `docs/agents/v1-picks.md`). Prior (same day) — session close-out: v1-picks ledger row added for the docs-alignment commit `6aff692` (split, pick pending…
```

(welded onto the existing header line, replacing its leading `_Last updated: 2026-09-22 (session close-out…` underscore-open so the block stays one italic run — then update the Immediate Next Steps list: item 1 (#115) is done, M4 becomes item 1; delete the `6aff692`-drain clause from the old item 1 since this session executed it.)

- [ ] **Step 5: Final gate + branch hygiene**

```bash
pnpm check          # expect 35/35 turbo tasks green (docs-only)
git status --short  # only docs/architecture.md, docs/progress.md, the plan file — evidence dir is gitignored
```

- [ ] **Step 6: The PR**

```bash
git push -u origin feat/115-architecture-alignment
gh pr create --title "docs(architecture): align System Overview, Data Flow, and Deployment Targets with deployed reality (#115)" --body-file <(printf '%s\n' "Closes #115." '' 'Implements docs/superpowers/plans/2026-09-22-115-architecture-alignment.md (Tasks 1–4; the v1-picks tail executes post-merge per the runbook).' && cat .superpowers/sdd/2026-09-22-115-architecture-alignment/pr-body.md)
gh pr view --json url -q .url
```

(The PR body = the intro lines above + the Step 3 evidence block, staged through a `pr-body.md` file under the evidence dir so the process substitution is reproducible. AC 4's `pnpm check` green is the PR's gate; screenshots/roundtrips don't apply — docs-only.)

- [ ] **Step 7: Squash-merge (after CI green on the PR)**

```bash
gh pr checks && gh pr merge --squash --delete-branch
git switch main && git pull --ff-only origin main
git rev-parse --short HEAD > /tmp/115-squash-sha.txt   # Task 6 triages this SHA
```

---

### Task 5: Drain the pending `6aff692` split pick (main-order backlog — row 153)

**Files:**
- No files in the main worktree during execution. Git operations happen in `~/Projects/sevendays-v1-seed` (branch `v1`).
- Modify (after, on main): `docs/agents/v1-picks.md` — fill row 153's v1 SHA.
- Evidence: `.superpowers/sdd/2026-09-22-115-architecture-alignment/task-5-evidence.md` (gitignored)

**Interfaces:**
- Consumes: main `6aff692` (the docs-alignment squash), the runbook's SPLIT procedure + conflict policy, row 153's pre-recorded execution map.
- Produces: a `v1` HEAD carrying `6aff692`'s client-safe hunks (AGENTS/architecture/tech-stack design-system prose) with the PRD annotation + progress dropped; locks green; row 153's v1 SHA filled — the prerequisite for Task 6's pick (main order).

**Not here:** this is NOT #115's own pick (Task 6, after our merge); no booking content returns; if conflict work passes one hour → STOP per the runbook time-box, record the hit, bring it to the owner. May run before or after Task 4's PR — the only hard constraint is before Task 6.

- [ ] **Step 1: Pre-flight the checkout**

```bash
cd ~/Projects/sevendays-v1-seed
git status --short                                  # expect: M apps/landing/src/routeTree.gen.ts only
git restore apps/landing/src/routeTree.gen.ts       # regenerable, never hand-resolved
git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git log --oneline -1 v1                             # expect a59798d (#101's pick)
node /home/jeius/Projects/sevendays/scripts/v1-triage.mjs 6aff692   # expect: SPLIT — 4 v1-path(s) + 1 main-only
```

- [ ] **Step 2: The SPLIT (runbook § Executing a SPLIT, adapted to row 153's map)**

```bash
git cherry-pick -n 6aff692         # exits 1 on "deleted by us" (docs/progress.md) — expected
git status --short                 # DU = docs/progress.md · M = AGENTS.md, docs/architecture.md, docs/tech-stack.md · M = docs/PRD.md (content-drop)
git rm -qrf --ignore-unmatch -- docs/progress.md
git restore --staged --worktree --source=HEAD -- docs/PRD.md   # content rule: the annotation names v1/v2, spec #76, ADR-0015
```

Conflict expectations (row 153 + live-read of v1's variants): the `docs/architecture.md` hunks (intro sentence + packages/ui bullet) replace the exact pre-`6aff692` lines v1 still carries — expect a clean apply; `docs/tech-stack.md`'s shadcn line likewise; `AGENTS.md`'s primitive-count bullet may conflict against v1's client-safe rewrite — apply the client-safe intent (design-system prose, no edition tokens), never restore booking/edition vocabulary. A hunk you cannot make client-safe drops via `git restore --staged --worktree --source=HEAD -- <path>` and gets named in the `Split:` line as `content-dropped:`.

- [ ] **Step 3: Commit with provenance (blank line after `%B` is load-bearing)**

```bash
git commit -F - <<EOF
$(git log -1 --format=%B 6aff692)

(cherry picked from commit $(git rev-parse 6aff692))
Split: main-only paths dropped — docs/progress.md; content-dropped: docs/PRD.md (edition-vocabulary annotation)
EOF
```

(Adjust the `Split:` line to the truth of Step 2 — every dropped path named, main-only vs content-dropped distinguished.)

- [ ] **Step 4: The locks (runbook § The locks, verbatim)**

```bash
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd /home/jeius/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # expect: AUDIT PASS — exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'     # then: gh run watch <id> --exit-status
gh run view <id> --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'      # check: success · Deploy v1 (private): success · Deploy teaser (main): skipped
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/       # 200
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/book    # 404
```

- [ ] **Step 5: Fill row 153's v1 SHA (direct docs commit on main, the `8e4f397` precedent — itself unpicked)**

```bash
cd /home/jeius/Projects/sevendays && git switch main && git pull --ff-only origin main
# in docs/agents/v1-picks.md, the 6aff692 row: replace "| — (pick pending) |" (the v1-SHA cell) with the pick's short SHA,
# and append to its Notes: "Executed 2026-09-22 (#115 session): AGENTS/architecture/tech-stack hunks applied
# (client-safe design-system prose), PRD annotation content-dropped, progress DU. Locks: check N/N + build N/N,
# audit PASS 0/18; run <id> check + Deploy v1 (private) success, Deploy teaser (main) skipped; live landing 200, /book 404."
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — 6aff692 split executed, row filled (#115 session)"
git push origin main
```

(Record the pick SHA, run id + conclusions, audit exit, curl results in the evidence file first — the Notes quote them.)

---

### Task 6: Triage + pick this ticket's merge, locks, ledger row (the close-out loop's tail)

**Files:**
- No files in the main worktree during execution. Git operations in `~/Projects/sevendays-v1-seed` (branch `v1`).
- Modify (after, on main): `docs/agents/v1-picks.md` — the #115 ledger row.
- Evidence: `.superpowers/sdd/2026-09-22-115-architecture-alignment/task-6-evidence.md` (gitignored)

**Interfaces:**
- Consumes: Task 4 Step 7's squash SHA (`/tmp/115-squash-sha.txt`), Task 5's drained `v1` HEAD (main order), the ticket's pinned expected-triage shape, the audit-token map from the plan header.
- Produces: a `v1` carrying the client-safe diagram label + mechanism table + pointer line (true on both branches); locks green; the #115 ledger row; the ticket closed.

**Not here:** no booking or edition content enters `v1` — the Data Flow + Observability hunks drop by the content rule (booking content; v1's variants are "Data Flow: Catalog Reads" + its own analytics line); the deployment-identity rule is untouched (our hunks name no service targets); same one-hour time-box + STOP rule as Task 5.

- [ ] **Step 1: Pre-flight + triage**

```bash
cd ~/Projects/sevendays-v1-seed
git status --short && git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git log --oneline -1 v1                       # expect Task 5's pick (6aff692's split), NOT a59798d
SHA=$(cat /tmp/115-squash-sha.txt)
node /home/jeius/Projects/sevendays/scripts/v1-triage.mjs "$SHA"
# expect: SPLIT — 1 v1-path (docs/architecture.md) + main-only (docs/progress.md, docs/superpowers/plans/2026-09-22-115-architecture-alignment.md)
```

- [ ] **Step 2: The SPLIT, with the pre-mapped conflict resolution**

```bash
git cherry-pick -n "$SHA"        # exits 1 on "deleted by us" (docs/progress.md) — expected
git status --short
git rm -qrf --ignore-unmatch -- docs/progress.md docs/superpowers/plans/2026-09-22-115-architecture-alignment.md
```

Then resolve `docs/architecture.md` (the only v1-path) per this map — the ticket's pinned expected-triage shape:

- **Diagram hunk (Task 1's label):** v1's diagram is byte-identical and the intro sentence above it was aligned by Task 5's pick — expect a clean apply. Keep it.
- **Deployment Targets + pointer line (Task 2):** v1's table is byte-identical pre-pick — expect a clean apply. Keep it (the pointer's target, `docs/tech-stack.md` § Continuous deploy, exists on v1 at line 34).
- **Data Flow hunks (Task 3):** guaranteed conflict — v1's section is `## Data Flow: Catalog Reads`. Resolution: keep v1's Catalog Reads section ENTIRELY; discard every booking-Data-Flow hunk (booking content — the `/booking` + `/api/v1/appointments` strings are audit tokens).
- **Observability hunk (Task 4 Step 1):** conflict — keep v1's own client-safe analytics line; discard the booking-funnel drift fix.

Mechanically: edit the conflict markers in `docs/architecture.md` taking HEAD's side for the Data Flow + Observability regions and the incoming side for the diagram + table regions, then `git add docs/architecture.md`.

- [ ] **Step 3: Prove the applied residue is token-free, then commit**

```bash
grep -nE '/booking|/api/v1/appointments|Book now|RESEND|LANDING_ORIGIN' docs/architecture.md && echo "TOKEN LEAK — FIX BEFORE COMMIT" || echo "TOKEN-FREE — OK"
git commit -F - <<EOF
$(git log -1 --format=%B "$SHA")

(cherry picked from commit $(git rev-parse "$SHA"))
Split: main-only paths dropped — docs/progress.md, docs/superpowers/plans/2026-09-22-115-architecture-alignment.md; content-dropped: docs/architecture.md (Data Flow + Observability hunks — booking content; v1's Catalog Reads variant kept)
EOF
```

(Adjust the `Split:` line to Step 2's truth. The grep must print `TOKEN-FREE — OK` — the recon token-map says the diagram/table/pointer prose carries zero of the 18 audit tokens.)

- [ ] **Step 4: The locks + live curls (identical battery to Task 5 Step 4)**

Run the full Task 5 Step 4 block verbatim (install/build gates → `pnpm check` + `pnpm build` → audit exit 0 → push → run watch with `check` + `Deploy v1 (private)` success + `Deploy teaser (main)` skipped → the two curls: landing 200, `/book` 404). Docs-only pick: expect turbo-cached gates, audit PASS 0/18.

- [ ] **Step 5: The #115 ledger row (direct docs commit on main)**

```bash
cd /home/jeius/Projects/sevendays && git switch main && git pull --ff-only origin main
# append ONE row at the bottom of docs/agents/v1-picks.md's ledger table:
# | 2026-09-22 | #115 | `<squash SHA>` | split | `<v1 pick SHA>` | architecture.md alignment — diagram service-binding label + branch-keyed-CI table + client-safe pointer applied clean (byte-identical v1 surfaces, Task 5's pick pre-aligned the intro context); Data Flow + Observability hunks content-dropped (booking content — v1 keeps Catalog Reads + its own analytics line); plan/progress main-only. Locks: check N/N + build N/N, audit PASS 0/18; run <id> check + Deploy v1 (private) success, Deploy teaser (main) skipped; live landing 200, /book 404 |
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger row for #115 (split, picked as <v1 pick SHA>)"
git push origin main
```

(Fill the four runtime values — both SHAs, run id, task counts — from the evidence file. This mirrors the `45469f4`/`8e4f397` close-out commits; ledger-row commits themselves are unpicked, main-only by path.)

- [ ] **Step 6: Close the ticket**

```bash
gh issue view 115 --json state -q .state           # closed by the PR's "Closes #115."
```

If still open (PR linking failed), `gh issue close 115 --comment "Landed in #<pr number>; v1 pick + ledger row executed per docs/agents/v1-picks.md."` — and tick this plan's remaining checkboxes `- [✅]`, commit the ticked plan file to main in the same close-out commit if any boxes were left unticked on the branch.



