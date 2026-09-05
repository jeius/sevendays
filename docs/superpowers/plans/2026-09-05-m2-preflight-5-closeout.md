# M2 Pre-flight 5/5 — Close-out: end-to-end verification + roadmap ticks (#25) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the M2 pre-flight block — re-verify both apps' sample branches call end to end in one pass, tick the five Milestone 2 pre-flight checkboxes in `docs/plan.md` as `- [✅]` with the 2026-09-05 verification date, fold the carried-forward deferred-minor fixes into the two wiring files, refresh `docs/progress.md`, and run the repo gates (the issue's acceptance criteria) — all without touching parent #1.

**Architecture:** #25 is bookkeeping + a single consolidated re-verification pass, not new feature code. Each pre-flight sub-task (#21 restructure, #22 client package, #23 landing wiring, #24 admin wiring) already landed, was individually verified, and is annotated in `plan.md`; this plan consolidates that evidence and closes the loop. Two carried-forward minors are folded in (the `router.tsx:12` comment reword already has a type-confirmed fix; the two `.env.example` trailing-newline additions are trivial). The end-to-end pass re-runs both apps' sample call (browser → own server functions → `@sevendays/api-client` → `apps/api`) against the live API on the compose db in a single sweep, then the repo-wide `pnpm check` + `pnpm build` gates prove green at the close-out state. `graphify-out/` is git-tracked, so its update is committed with the docs.

**Tech Stack:** TanStack Start 1.168.49 (Worker-based via `@cloudflare/vite-plugin` 1.54.2), `@tanstack/react-query` ^5.102.8, `@tanstack/react-router-ssr-query` ^1.167.2, `@sevendays/api-client` (landed #22), Hono 4.13.5 (`apps/api`), Zod v4, TypeScript 6 (`verbatimModuleSyntax` on), Biome 2.x (`vite`/`node` tiers), Vite 8, pnpm 11 + Turborepo, Docker compose (postgres:17). graphify 0.9.34 (for the post-change knowledge-graph update).

**Spec:** `docs/specs/2026-08-30-m2-preflight-api-client-spec.md` (amended 2026-09-04). Ticket: jeius/sevendays#25, parent #1 (stays OPEN). Roadmap: M2 pre-flight block in `docs/plan.md`. Predecessor plans (all landed): `2026-09-04-m2-preflight-1-api-restructure.md` (#21), `2026-09-04-m2-preflight-2-api-client.md` (#22), `2026-09-05-m2-preflight-3-landing-query-ssr.md` (#23), `2026-09-05-m2-preflight-4-admin-query-ssr.md` (#24).

## Global Constraints

- Node >= 24; pnpm workspace; run repo commands from the repo root unless noted.
- Work on a feature branch (suggested: `feat/m2-preflight-closeout`); never commit to `main`; leave pushing/merging to the user.
- Do not commit code that fails `pnpm check` (lint + format + typecheck + test) for what you touched; `pnpm build` must also stay green (issue AC).
- **Parent #1 stays OPEN and untouched** — do not modify, close, label, or re-title it. This ticket (#25) does not close it.
- `API_URL` is a plain server-side var — no `VITE_` prefix, no fallback (verified in #23/#24; this plan re-verifies the loud-fail behavior, it does not change it).
- `apps/{landing,admin}/.env.local` are gitignored (`!.env.example` is the only committed env template) — never commit `.env.local`; copy from `.env.example` for local verification only.
- `verbatimModuleSyntax` is on — `import type` for type-only imports. No namespace imports (Biome `noNamespaceImport`). Biome orders `@tanstack/react-query` before `@tanstack/react-router`.
- Do not regenerate `routeTree.gen.ts` (no route paths change). Do not tick checkboxes with plain `[x]` — repo convention is the ✅ emoji (`- [✅]`), and the tick must carry a dated annotation.
- `graphify-out/` is git-tracked (confirmed: `git ls-files graphify-out` returns files) — a `graphify update .` produces a real diff that must be committed alongside the docs change.
- Both `.env.example` files currently END WITHOUT a trailing newline (verified via `od -c`); adding one changes the file's final byte — confirm with `tail -c 1 | od -c`.
- The built server output is a Cloudflare Worker (`export default { fetch }`); `pnpm --filter @sevendays/{landing,admin} start` (the `node dist/server/index.js` script) exits silently by design. Prod-shaped local serving is `wrangler dev --local` over the built output. Do NOT use `node dist/server/index.js` for verification.
- Port-collision pitfall (hit in #24): if the vite dev server holds 3000/3001, `wrangler dev --local --port 3000` either errors `Address already in use` or silently probes the DEV server (a 200 proves nothing about workerd). Verify which process holds the port (`ss -tlnp`) before trusting a prod-shape result.

## Verified pre-plan facts (probed against the real toolchain 2026-09-05)

These were executed against this exact workspace just before writing the plan — trust them, don't re-derive:

1. **Repo gates are GREEN at HEAD** (`33779ce`, main): `pnpm check` → 29/29 turbo tasks exit 0 (lint + format + typecheck + test across 8 packages); `pnpm build` → 6/6 exit 0. This is the AC baseline the close-out pass must match.
2. **Both apps' sample wiring already verified live** (recorded in #23 PR #28 and #24 PR #29): dev `GET /` → 200 with all three seeded branches (Calamba Main Branch, Dipolog Branch, Iligan Branch) server-rendered through loader → server fn → `createApiClient().branches.list()` → API → Zod parse; loud failure (blank `API_URL`) → 500 carrying `API_URL is not set` in BOTH vite dev and built-worker workerd; zero `API_URL`/`8787` leakage in served HTML and `dist/client`.
3. **`AppType` is exported** at `apps/api/src/index.ts:42` (`export type AppType = typeof app;`) and resolves cross-workspace via `@sevendays/api/app` — the #21 restructure piece is done (grep-verifiable, 1 occurrence). The `apps/api/src/app-type.test.ts` `expectTypeOf` assertions are enforced by `pnpm typecheck`, not the vitest run — needs a one-line comment naming that.
4. **`apps/api/src/env.ts:9`** has `DATABASE_URL: z.url().min(1)` — `.min(1)` is unreachable (`z.url()` already rejects `''`); drop the chain link (minor from #21 final review).
5. **`apps/{landing,admin}/src/router.tsx:12`** comment cites `'static'` but only `refetchOnReconnect: false` + `staleTime: 60_000` are configured. **Type-confirmed fix:** `refetchOnMount` in query-core 5.102.8 accepts only `boolean | 'always'` — **NOT** `'static'` — so "add `refetchOnMount: 'static'`" (the #29 alternative) would NOT typecheck. `staleTime: 'static'` exists as a type but would change behavior (never treat data as stale). Therefore the only valid action is a comment reword crediting `staleTime`.
6. **Both `.env.example` files lack a trailing newline** (verified `od -c`: file ends `API_URL=` with no `\n`). Add one each.
7. **`apps/api/.dev.vars` exists** (307 bytes, gitignored) — the API dev server needs it; a fresh worktree would have to copy it from main. Fresh-clone prerequisite: `pnpm install` → `pnpm build:packages` → everything else.
8. **Compose db is already up** (`sevendays-db-1` on 5432) and ports 3000/3001/8787 are free at plan time — the E2E pass can boot `apps/api dev` on 8787 directly.
9. **`graphify` 0.9.34 is installed** (`/home/jeius/.local/bin/graphify`) and `graphify-out/` is git-tracked — after code/docs changes, `graphify update .` keeps the knowledge graph current (AST-only, no API cost) and its diff is committed.
10. **Parent #1 is OPEN** (`gh issue view 1` → state OPEN, title "M2 pre-flight: shared API client…") — confirm it remains untouched at the end.

---

### Task 1: Fold in the carried-forward deferred minors

**Files:**
- Modify: `apps/api/src/env.ts:9` (drop unreachable `.min(1)`)
- Modify: `apps/api/src/app-type.test.ts:4-5` (enforcement-site comment)
- Modify: `apps/landing/src/router.tsx:12` (reword comment)
- Modify: `apps/admin/src/router.tsx:12` (reword comment)
- Modify: `apps/landing/.env.example` (add trailing newline)
- Modify: `apps/admin/.env.example` (add trailing newline)

**Interfaces:**
- Consumes: the landed files above (exact lines confirmed in pre-plan facts 4, 5, 6).
- Produces: a repo state where the #21/#23/#24 deferred minors recorded in their ledgers are resolved (so a future reader/agent doesn't rediscover them).

- [ ] **Step 1: Drop the unreachable `.min(1)` in `env.ts`**

`apps/api/src/env.ts:9` is currently:
```ts
  DATABASE_URL: z.url().min(1),
```
Change to:
```ts
  DATABASE_URL: z.url(),
```

- [ ] **Step 2: Note the typecheck-enforced assertion in `app-type.test.ts`**

`apps/api/src/app-type.test.ts:4-5` currently reads:
```ts
// Type-level only: proves AppType exists and is the Hono app type the RPC
// client will consume. A route change in index.ts changes this type.
```
Change to:
```ts
// Type-level only: proves AppType exists and is the Hono app type the RPC
// client will consume. A route change in index.ts changes this type.
// NOTE: these expectTypeOf assertions are enforced by `pnpm typecheck`, not by
// the vitest run itself (vitest does not fail on a passing-only type assertion).
```

- [ ] **Step 3: Reword the `router.tsx` 'static' comment (landing)**

`apps/landing/src/router.tsx:12` currently reads:
```tsx
        // Under SSR, 'static' stops every query refetching during hydration —
        // the dehydrated server data is authoritative on first render.
        refetchOnReconnect: false,
```
Change the comment (keep the two option lines) to:
```tsx
        // Under SSR, staleTime + refetchOnReconnect:false stop the dehydrated
        // server data from refetching during hydration — it stays authoritative
        // on first render (no 'static' preset is configured here).
        refetchOnReconnect: false,
```

- [ ] **Step 4: Reword the `router.tsx` 'static' comment (admin)**

Apply the identical edit to `apps/admin/src/router.tsx:12` (same two-line option block at lines 12-15, confirmed byte-identical to landing's in pre-plan fact 5).

- [ ] **Step 5: Add the trailing newline to `apps/landing/.env.example`**

The file currently ends `API_URL=` with no newline. Append a single newline so the file ends `API_URL=\n`. Verify:
```bash
tail -c 1 apps/landing/.env.example | od -c
```
Expected: `0000000  \n` (one line: `0a`).

- [ ] **Step 6: Add the trailing newline to `apps/admin/.env.example`**

Same edit as Step 5 for `apps/admin/.env.example`. Verify with the same `tail -c 1 | od -c` (expected `0a`).

- [ ] **Step 7: Typecheck the touched packages**

Run: `pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/admin typecheck`
Expected: all three exit 0. (Confirms the `env.ts` drop and the `router.tsx` reword compile, and that no `'static'` literal was introduced.)

- [ ] **Step 8: Lint the touched files**

Run: `pnpm --filter @sevendays/api lint && pnpm --filter @sevendays/landing lint && pnpm --filter @sevendays/admin lint`
Expected: exit 0, no findings.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/env.ts apps/api/src/app-type.test.ts apps/landing/src/router.tsx apps/admin/src/router.tsx apps/landing/.env.example apps/admin/.env.example
git commit -m "fix(pre-flight): resolve carried-forward minors from #21/#23/#24 reviews

- api/src/env.ts: drop unreachable z.url().min(1) (z.url() already
  rejects ''); api/src/app-type.test.ts: note the expectTypeOf assertions
  are enforced by pnpm typecheck, not the vitest run.
- apps/{landing,admin}/src/router.tsx: reword the 'static' comment to
  credit staleTime + refetchOnReconnect:false (refetchOnMount has no
  'static' value in query-core 5.102.8 — would not typecheck).
- apps/{landing,admin}/.env.example: add trailing EOF newline.

No behavior change; gates green. Parent #1 untouched."
```

---

### Task 2: Consolidated end-to-end re-verification pass (landing + admin)

**Files:**
- Create (local only, gitignored): `apps/landing/.env.local`, `apps/admin/.env.local`
- Read-only probe artifacts: `/tmp/landing-e2e.html`, `/tmp/admin-e2e.html`, `/tmp/landing-fail.html`, `/tmp/admin-fail.html`, `/tmp/landing-prod.html`, `/tmp/admin-prod.html`

No repo files change — this task produces the issue's "both sample calls verified end to end in one pass" evidence. Do it after Task 1 is committed.

**Interfaces:**
- Consumes: `apps/api` dev server (Task 2 Step 1), the compose db (pre-plan fact 8), and the wired landing/admin apps from #23/#24.

- [ ] **Step 1: Boot the stack**

```bash
docker compose up -d db          # already healthy per pre-plan fact 8; harmless if up
pnpm --filter @sevendays/api dev # API on http://127.0.0.1:8787 (background)
```

Create the local env files (gitignored) pointing at the local API:
```bash
printf 'API_URL=http://127.0.0.1:8787\n' > apps/landing/.env.local
printf 'API_URL=http://127.0.0.1:8787\n' > apps/admin/.env.local
```

```bash
pnpm --filter @sevendays/landing dev  # background — port 3000 (or 3001 if busy)
pnpm --filter @sevendays/admin dev    # background — port 3001 (or 3000/3002 if busy)
```

Sanity that the API itself serves the seeded rows:
```bash
curl -sS http://127.0.0.1:8787/api/v1/branches | grep -o '"name":"[^"]*"'
```
Expected: `Calamba Main Branch`, `Dipolog Branch`, `Iligan Branch` (3 names).

- [ ] **Step 2: E2E — landing sample call through the whole chain**

Run: `curl -sS --max-time 60 -o /tmp/landing-e2e.html http://127.0.0.1:3000/` (use whichever port the landing dev server printed)
Expected: exit 0, HTTP 200, and `grep -c Calamba /tmp/landing-e2e.html` ≥ 1 (all three names present: Calamba, Dipolog, Iligan). This proves browser-request → landing SSR → `getBranches` server fn → `createApiClient` → API → Zod-parsed rows → server-rendered HTML, with the query cache dehydrated into the payload.

- [ ] **Step 3: E2E — admin sample call through the whole chain**

Run: `curl -sS --max-time 60 -o /tmp/admin-e2e.html http://127.0.0.1:3001/` (use the admin dev server's printed port)
Expected: exit 0, HTTP 200, and `grep -c Calamba /tmp/admin-e2e.html` ≥ 1 (all three branch names present). Same chain as landing but for admin.

- [ ] **Step 4: Loud failure — landing, no fallback**

Set `apps/landing/.env.local` to a blank value: `printf 'API_URL=\n' > apps/landing/.env.local`. Vite watches the file and restarts. Then:
Run: `curl -sS --max-time 60 -o /tmp/landing-fail.html http://127.0.0.1:3000/`
Expected: `grep -c Calamba /tmp/landing-fail.html` = 0 AND `grep -c "API_URL is not set" /tmp/landing-fail.html` = 1 (dev SSR returns 500 with the message). Restore: `printf 'API_URL=http://127.0.0.1:8787\n' > apps/landing/.env.local`, wait for restart, re-curl → 200 + branch names (no rebuild).

- [ ] **Step 5: Loud failure — admin, no fallback**

Same as Step 4 but for `apps/admin/.env.local` and port 3001. Expected: 500 + `API_URL is not set`, recovery to 200 after restore.

- [ ] **Step 6: No-secrets check — env never reaches the client**

Run for both apps:
```bash
grep -c "8787" /tmp/landing-e2e.html /tmp/admin-e2e.html
grep -c "API_URL" /tmp/landing-e2e.html /tmp/admin-e2e.html
```
Expected: `0` for both patterns in both files. (Confirms ADR-0006: the base URL stays server-side.)

- [ ] **Step 7: Prod-shaped verification — built workers under workerd**

Kill the landing and admin DEV servers first (pre-plan fact 9 pitfall: a still-running dev server on 3000/3001 makes `wrangler dev` either error or silently probe the dev server). Then:
```bash
pnpm --filter @sevendays/landing build
pnpm --filter @sevendays/admin build
pnpm --filter @sevendays/landing exec wrangler dev --local --port 3000   # background; api dev still up
pnpm --filter @sevendays/admin exec wrangler dev --local --port 3001     # background
```
Run: `curl -sS --max-time 30 -o /tmp/landing-prod.html http://127.0.0.1:3000/` and `curl -sS --max-time 30 -o /tmp/admin-prod.html http://127.0.0.1:3001/`
Expected: both HTTP 200 + the three branch names (`grep -c Calamba /tmp/landing-prod.html` ≥ 1, same for admin-prod). Then blank each app's `.env.local`, restart its `wrangler dev`, re-curl: expected **HTTP 500** carrying `API_URL is not set` — the loud failure in the production runtime shape (both apps, both directions).

Probing notes (verified in #23/#24): use bare `wrangler dev` — the build registers `.wrangler/deploy/config.json` pointing at `dist/server/wrangler.json`, and passing the dist path explicitly errors with a double-config conflict. Do NOT use `node dist/server/index.js` (exits silently — stale script).

- [ ] **Step 8: Record the evidence**

No commit. Record in the eventual PR description (and carry into Task 4's progress.md wording): the Step 2/3 curl branch-name counts, the Step 4/5 error outputs, the Step 6 zero-leak greps, and the Step 7 workerd 200 + 500. This is the issue AC "both sample calls verified end to end in one pass."

---

### Task 3: Full gates + progress.md refresh

**Files:**
- Modify: `docs/progress.md` (M2 pre-flight block: #25 What-Exists bullet; update the per-app wiring bullets to mark the carried-forward minors closed; the "Immediate Next Steps" now points past pre-flight)
- Read-only: `docs/plan.md` (its checkboxes are ticked in Task 5, not here)

**Interfaces:**
- Consumes: everything from Tasks 1–2.

- [ ] **Step 1: Run the full gates**

Run: `pnpm check && pnpm build`
Expected: both green across the workspace (29/29 check, 6/6 build — matching the pre-plan baseline).

- [ ] **Step 2: Refresh `docs/progress.md` — M2 pre-flight is closed**

In **What Exists**, update the two wiring bullets (#23/#24) so the carried-forward minors are marked resolved. Specifically:
- In the **#23** bullet (currently ends "…served HTML and `dist/client` (grep-verified)."), append: " The router.tsx 'static' comment was reworded to credit staleTime + refetchOnReconnect:false at #25 close-out (refetchOnMount has no 'static' value in query-core 5.102.8); landing `.env.example` gained a trailing newline."
- In the **#24** bullet (same trailing wording), append identically: " The router.tsx 'static' comment was reworded at #25 close-out (see #23 note); admin `.env.example` gained a trailing newline."

Add a new **#25** bullet at the end of What Exists:
```markdown
- **M2 pre-flight close-out (#25):** the Milestone 2 pre-flight block is complete and verified. One consolidated end-to-end pass re-verified both apps' sample branches call (browser → own server functions → `@sevendays/api-client` → `apps/api`) against the live API on the compose db: dev `GET /` 200 with all three seeded branches in both landing and admin; loud failure (blank `API_URL`) → 500 `API_URL is not set` in both vite dev and built-worker workerd for both apps; zero `API_URL`/`8787` leakage into served HTML or `dist/client`. Carried-forward minors from #21/#23/#24 reviews folded in: `apps/api/src/env.ts` dropped an unreachable `z.url().min(1)`; `apps/api/src/app-type.test.ts` notes its `expectTypeOf` assertions are typecheck-enforced; both `router.tsx` 'static' comments reworded to credit `staleTime` (no `'static'` preset configured — `refetchOnMount` has no `'static'` value in query-core 5.102.8); both `.env.example` files gained a trailing newline. `pnpm check` 29/29 + `pnpm build` 6/6 green. `docs/plan.md` M2 pre-flight checkboxes ticked `- [✅]` 2026-09-05; parent #1 stays OPEN.
```

- [ ] **Step 3: Update the "Immediate Next Steps" block**

The current `## Immediate Next Steps (in order)` block (lines 152-154) still says "Milestone 2 pre-flight (#1) — … then #25 close-out." Replace it with:
```markdown
## Immediate Next Steps (in order)

1. **Milestone 2 proper (booking flow)** — the M2 pre-flight block is closed (verified 2026-09-05, #25). Next: landing pages reading from `apps/api` (Service Packages, Services, Branches), the guest booking form (branch → package → date/time → contact), past-date/time rejection, and `POST /api/appointments` persistence + Resend confirmation (see the Milestone 2 booking-flow checkboxes in `docs/plan.md`).
```

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md
git commit -m "docs: refresh progress.md for M2 pre-flight close-out (#25)

- What Exists: #25 bullet (consolidated E2E pass, folded-in minors, green
  gates); #23/#24 bullets note the router.tsx reword + .env.example newline.
- Immediate Next Steps: pre-flight closed; points at M2 proper (booking flow).
- Parent #1 left OPEN (not modified)."
```

---

### Task 4: Tick the `docs/plan.md` M2 pre-flight checkboxes (`- [✅]` + dated)

**Files:**
- Modify: `docs/plan.md` (Milestone 2 pre-flight block, lines 54-58)

**Interfaces:**
- Consumes: the verification evidence from Task 2, the progress.md wording from Task 3.

- [ ] **Step 1: Tick the five pre-flight checkboxes with ✅ + the 2026-09-05 date**

In `docs/plan.md`, the Milestone 2 pre-flight block currently has these five `- [ ]` lines (lines 54-58). Replace each leading `- [ ]` with `- [✅]` and append a dated annotation. Use the exact replacements below (match the unique line text):

Line 54 (`apps/api` restructure) — replace:
```
- [ ] `apps/api` restructure: chain route sub-apps, `export type AppType`, move `Env` to an explicit exported type (cross-package type imports can't see the ambient `worker-configuration.d.ts` global); adopt the "always `c.json({ error }, status)`, never bare `c.notFound()`" convention _(2026-09-04 audit note: …)_
```
with (the `_ (…) _` audit note stays; change only the leading box and append the tick note):
```
- [✅] `apps/api` restructure: chain route sub-apps, `export type AppType`, move `Env` to an explicit exported type (cross-package type imports can't see the ambient `worker-configuration.d.ts` global); adopt the "always `c.json({ error }, status)`, never bare `c.notFound()`" convention _(2026-09-04 audit note: …; ticked 2026-09-05 at #25 close-out after end-to-end verification — the named open pieces (AppType export + ./app subpath, Zod-validated Env, ambient-global retirement) landed via #21 and re-verified.)_
```

Line 55 (`packages/api-client`) — replace leading `- [ ]` with `- [✅]` and append:
```
 _(… tick at #25 close-out after end-to-end verification.)_  →  _(… ticked 2026-09-05 at #25 close-out — client package + wrapper surface landed #22, re-verified end to end in both apps.)_
```

Line 56 (`API_URL` wired in both apps) — replace leading `- [ ]` with `- [✅]` and append:
```
 _(… Tick at #25 close-out.)_  →  _(… ticked 2026-09-05 at #25 close-out — landing via #23 + admin via #24, both loud-fail-verified and re-verified in the #25 consolidated pass.)_
```

Line 57 (TanStack Query SSR in both apps) — replace leading `- [ ]` with `- [✅]` and append:
```
 _(… Tick at #25 close-out.)_  →  _(… ticked 2026-09-05 at #25 close-out — landing #23 + admin #24, both verified live and re-verified in the #25 pass.)_
```

Line 58 (Verify: one sample call per app) — replace:
```
- [ ] Verify: one sample call per app (branches list) flows browser → own server functions → `apps/api` through the client — type-inferred, Zod-parsed, end to end
```
with:
```
- [✅] Verify: one sample call per app (branches list) flows browser → own server functions → `apps/api` through the client — type-inferred, Zod-parsed, end to end _(2026-09-05: re-verified in one consolidated pass for both landing and admin — dev 200 with all three seeded branches, loud 500 on blank API_URL in both vite dev and built-worker workerd, zero API_URL/origin leakage; see #25.)_
```

- [ ] **Step 2: Confirm no other M2 pre-flight `- [ ]` remain**

Run: `grep -n "\- \[ \]" docs/plan.md | grep -i "preflight\|api-client\|API_URL\|TanStack\|sample call"`
Expected: no matches (the five pre-flight boxes are the only ones in that block; the booking-flow checkboxes below them correctly stay `- [ ]` — they are Milestone 2 proper, not pre-flight).

- [ ] **Step 3: Commit**

```bash
git add docs/plan.md
git commit -m "docs: tick M2 pre-flight checkboxes ✅ with 2026-09-05 verification date (#25)

All five pre-flight boxes (api restructure, api-client package, API_URL
wiring, TanStack Query SSR, one sample call per app) ticked with dated
annotations per the repo ✅ convention. Booking-flow checkboxes stay
unticked (Milestone 2 proper). Parent #1 untouched."
```

---

### Task 5: graphify update + final commit (GitGraph current)

**Files:**
- Modify (generated): `graphify-out/` (knowledge graph, git-tracked)

**Interfaces:**
- Consumes: all landed code/docs changes from Tasks 1–4.

- [ ] **Step 1: Update the knowledge graph**

Run: `graphify update .`
Expected: exits 0; `graphify-out/` files updated (AST-only, no API cost). Confirms the graph reflects the close-out (the router.tsx comments, env.ts drop, .env.example newlines, and the plan.md ticks).

- [ ] **Step 2: Confirm graphify-out is git-tracked and show the diff**

Run: `git status --short graphify-out`
Expected: modified files listed under `graphify-out/` (it is tracked — confirmed in pre-plan facts). If empty (no change), skip Step 3 for graphify and note it.

- [ ] **Step 3: Commit the graph update**

```bash
git add graphify-out
git commit -m "chore: update graphify knowledge graph after M2 pre-flight close-out (#25)

Reflects the router.tsx comment rewords, apps/api env.ts + app-type.test.ts
edits, .env.example newlines, and docs/plan.md pre-flight ticks."
```

- [ ] **Step 4: Final gate re-run**

Run: `pnpm check && pnpm build`
Expected: both green (29/29 check, 6/6 build). This is the issue's primary acceptance criterion at the final committed state.

- [ ] **Step 5: Confirm parent #1 is still OPEN and untouched**

Run: `gh issue view 1 --json number,state,title --jq '{number, state, title}'`
Expected: `{ "number": 1, "state": "OPEN", "title": "M2 pre-flight: shared API client (@sevendays/api-client) + TanStack Query wiring" }` — unchanged from pre-plan fact 10. (No command in this plan modifies #1.)

- [ ] **Step 6: Show the final commit log**

Run: `git log --oneline -6`
Expected: the five commits from Tasks 1, 3, 4, 5 (and graphify if it changed) on top of `33779ce`. Leave pushing/PR to the user.

---

## Self-Review (against issue #25 + spec)

- **Spec coverage:** ADR-0006 topology (browser → own app → API) is the thing re-verified in Task 2 — the spec's user story 14 ("one sample call per app verified end to end") maps to Task 2 Steps 2-3; story 8 (server-env base URL, no fallback) maps to Task 2 Steps 4-5 + 7. The "no secrets to client" rule (story 7/ADR-0006) maps to Task 2 Step 6. The spec's out-of-scope note (no real features) is respected — #25 is explicitly bookkeeping.
- **Issue AC coverage:**
  - `pnpm check` + `pnpm build` green → Task 1 Step 7-8 (per-package), Task 3 Step 1, Task 5 Step 4.
  - Both sample calls verified end to end in one pass → Task 2 Steps 2-3 (dev), 7 (workerd), recorded Step 8.
  - plan.md M2 pre-flight checkboxes ticked ✅ with dated annotations → Task 4.
  - progress.md updated → Task 3.
  - Parent #1 untouched → Task 5 Step 5 (verified still OPEN).
- **Placeholder scan:** none — every step carries exact file/line, exact command, and expected output. The only prose-only steps (Task 3 Step 2, Task 4 Step 1) carry the exact markdown to insert.
- **Type consistency:** the `router.tsx` reword (Task 1 Steps 3-4) names `staleTime` + `refetchOnReconnect:false` — matching the actual configured options at `router.tsx:14-15` (verified pre-plan fact 5). The `env.ts` drop (Task 1 Step 1) removes `.min(1)` with no other reference (grep-confirmed: only occurrence at `env.ts:9`). The `.env.example` newline (Task 1 Steps 5-6) is byte-level and verified via `od -c`.
- **Carried-forward minors reconciled:** all four #23 minors and the #21/#24 minors named in their ledgers are addressed — router comment (Task 1 Steps 3-4, type-confirmed), `getApiClient()` memoization (deferred by ledger as fine at 1 call/request — NOT changed, consistent with the ruling), `.env.example` newline (Task 1 Steps 5-6), plan.md:58 asymmetry (already resolved by #24's annotation — verified in progress.md lines 56-57). The #21 `.min(1)` and app-type.test.ts comment are Task 1 Steps 1-2. Parent #1 untouched throughout.
