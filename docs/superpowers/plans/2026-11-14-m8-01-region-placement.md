# M8 ticket 01 — Region placement of the api worker — implementation plan

**Goal:** Pin the api worker to the database's metro with the SIN region hint — `[placement] region = "aws:ap-southeast-1"` in `apps/api/wrangler.toml`, region mode (targeted), **never** Smart Placement (provably unreachable here, per the #283 verdict) — deployed through CI only, live-verified via the `cf-placement` response header (SIN execution) and a before/after access-log cold-read comparison against the #280 baseline table, with **ADR-0026** recording the decision: the service-binding forward-hop trade (~30–70 ms), the frontends' edge posture, the #263 SIN-warmed public-cache side effect, and the Hyperdrive history (ADR-0024 burned; the #260 recipe stays parked). Ticket #285 (spec § D1).

**Spec:** `docs/specs/2026-11-14-m8-admin-cms-latency-spec.md` (§ D1), ratified 2026-11-14 (grill #284). Inputs: the #280 baseline table (the before column, recorded in that ticket's resolution comment), the #283 topology verdict (durable record: branch `research/topology-verdict` @ `5c4b1a4`, `research/topology-verdict-findings.md`; full text in the #283 resolution comment), the #263/#264 deploy discipline. Executed against existing issue **#285** — no new execution issue.

**Architecture:** config + docs + operational verification, zero code. Touched files: `apps/api/wrangler.toml` (one `[placement]` block + comment), `docs/adr/0026-api-region-placement.md` (new), `docs/progress.md` (one What-Exists bullet), this plan file. Nothing else — no `apps/api/src/**`, no tests, no workflow edits, no frontend config, no schema.

## Global Constraints

- Branch `m8/01-region-placement` off current `main` (at `832da91` or later). Per-task commits with the subjects pinned per task, each ending `(#285)` — the one house exception is Task 7's ledger row, which follows the `docs(v1-picks): #285 ledger row - …` shape (the #276/#278 precedent); the squash-merge appends the PR number (house precedent: `feat(api): Hyperdrive … (#260) (#261)`).
- **Deploy through CI only.** The deploy fires from CI's `Deploy teaser (main)` leg on the push to main. **Never run `pnpm --filter @sevendays/api deploy` or any local bare `wrangler deploy`** — the #263/#264 lesson: a bare deploy wipes the CI-passed `--var`s (the api carries four: `CLOUDFLARE_ACCOUNT_ID`, `MEDIA_PUBLIC_BASE_URL`, `SENTRY_RELEASE`, `ENVIRONMENT`), breaking both editions; the only restore is `gh run rerun <merge-run-id>` (CI re-applies every var verbatim). `wrangler deploy --dry-run` is allowed (no deploy, no auth, no mutation).
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with every floor byte-identical to: api 33 files (32 passed + 1 skipped) / 457 passed + 3 skipped; types 18 files / 188; db 4 files (2 + 2 skipped) / 22 passed + 8 skipped; api-client 5 files / 45; landing 17 files / 134; admin 27 files / 296. This plan changes no code — a moved floor means something else drifted: stop and reconcile. (Floors verified live 2026-11-14 @ `632eae1` in the docs-audit execution; `832da91` is docs-only.) The v1-side locks in Task 7 run on port **5434** (`…/sevendays_test` on 5434) per the local-DB-ports ruling.
- **Live-probed pins (2026-11-14 @ `832da91`)** — do not "improve" any of these from memory; the pinned value is the probed value:
  - wrangler **4.127.1** (the pinned install) accepts the block: `wrangler deploy --dry-run` with the key exits clean (probed in a scratch config), and the dist forwards targeted placement on the deploy path (`parseConfigPlacement` → `{ mode: "targeted", region }` into the version-upload request; the smart-only forwarding line found in the dist is the legacy script-upload path, not what `wrangler deploy` uses). An unrelated "update available 4.162.0" banner appears at probe time — out of scope, no bump.
  - The live api answers directly at `https://sevendays-api.pahamajulius.workers.dev` (`/health` 200; `/api/v1/site-settings` 200) and carries **no `cf-placement` header today** (probed; cf-rays `-CGY`/`-MNL` — this machine is a PH vantage, exactly what the after-curl needs).
  - `cf-placement` semantics per the CF placement docs: the header is added to **all** responses once placement is enabled — `remote-<airport>` when the request was routed by placement, `local-<airport>` when the worker ran at the arrival location. So the after-state is: header **present, value ending `-SIN`**; the before-state is: header **absent entirely** (placement disabled).
  - The api's access event: `evt:'access'` carrying `method`/`route`/`status`/`durationMs`/`actorId` (`apps/api/src/observability/events.ts:31-43`; `/health` excluded from access logging, `request-context.ts:37`; the route field is the route pattern, raw path on unmatched routes). The logger writes pino JSON via `console.log`, so each access line reaches `wrangler tail --format json` as a JSON string inside `logs[].message`.
  - No code parses `wrangler.toml` (swept: the three mentions in `apps/api/src` are comments) — the suites cannot see the placement key; the floors hold by construction.
- **The after-walk is HITL:** the owner drives the browser; the agent drives the tail. Ask and wait (the standing owner rule — never assume while the owner may be AFK). If the owner is unavailable after Task 4, post the interim evidence, leave #285 open naming the pending walk, and stop — do not self-serve the walk.
- Sibling boundary: CI's deploy legs read the same `apps/api/wrangler.toml` for both workers (`--name sevendays-api` on main / `--name sevendays-v1-api` on the v1 branch) — one block serves both; the v1 worker receives the hint when the pick lands (Task 7), not by any manual deploy.

### Not here

- **No session-verify work** — `requireSession`, BetterAuth config, any new cache service beside the read-cache: entirely #286's payload.
- **No thumbnail work** (versioned URLs, proxy headers — #287) and **no client staleness/priming** (#288).
- **No exit-gate judgment** — this ticket records per-route before/after deltas vs the #280 table only. The ratified `cold median ≤ 1 s` target is **#289's** gate; never declare M8 success or failure from this ticket's numbers.
- **No `docs/plan.md` edits** — all five M8 boxes flip at #289 (its body owns the milestone-close ritual); this ticket's plan.md box stays unticked until then, including after every acceptance criterion here is met.
- **No admin/landing wrangler changes** — the frontends stay at the edge by the verdict's explicit "do not place" (placing them adds a cross-metro hop to every page response for every visitor).
- **No wrangler bump, no Hyperdrive** (ADR-0024 burned, #260 recipe parked by standing ruling), **no `docs/architecture.md`/`docs/tech-stack.md`/`AGENTS.md` edits** (ADR-0026 is the canonical record; narrative rotation was #277's), **no `docs/adr/0027-*.md`** (the spec reserves 0027 for #286; 0024 stays burned/gone from disk).
- No schema/type/test/workflow/visual-baseline changes; `graphify update .` **not** needed (config + docs only — no symbols changed; the graphify rule covers code).

---

### Task 1: the `[placement]` block + dry-run proof

**Files:**
- Commit: this plan file (the branch's first commit)
- Edit: `apps/api/wrangler.toml`

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b m8/01-region-placement
  git add docs/superpowers/plans/2026-11-14-m8-01-region-placement.md
  git commit -m "docs(m8): the M8 ticket 01 implementation plan (#285)"
  ```

- [ ] **Step 2: the edit** — the OLD block must match exactly once (`apps/api/wrangler.toml` lines 6–8):

  ```text
  OLD: compatibility_flags = ["nodejs_compat"]

  # Media pipeline (ADR-0019, M5 ticket 02): the sevendays-media bucket and the
  NEW: compatibility_flags = ["nodejs_compat"]

  # M8 #285 (ADR-0026): region placement — the api worker executes in the DB's
  # metro (Supabase ap-southeast-1, Singapore) instead of the visitor's colo.
  # Region mode (targeted), NOT smart mode: smart only considers colos the
  # worker has already run at (MNL/CEB + the CI-runner colos — SIN is not among
  # them, and admin-only volume would starve its analyzer). The frontends stay
  # at the edge; the service-binding hop forwards to this worker (ADR-0016).
  [placement]
  region = "aws:ap-southeast-1"

  # Media pipeline (ADR-0019, M5 ticket 02): the sevendays-media bucket and the
  ```

- [ ] **Step 3: dry-run proof** — from `apps/api`:

  ```bash
  cd apps/api && pnpm exec wrangler deploy --dry-run 2>&1 | tail -12
  ```

  Expected: the normal summary (the bindings table ending `env.ENVIRONMENT ("dev")  Environment Variable`, then `--dry-run: exiting now.`) and **zero config errors**. A placement-related error here means the pinned wrangler claim drifted: stop and reconcile with the owner before any bump.

- [ ] **Step 4: commit**

  ```bash
  git add apps/api/wrangler.toml
  git commit -m "feat(api): the SIN region placement hint — the api worker executes in the DB's metro (#285)"
  ```

---

### Task 2: ADR-0026 + the progress.md bullet

**Files:**
- Write: `docs/adr/0026-api-region-placement.md`
- Edit: `docs/progress.md`

- [ ] **Step 1: write the ADR — this full text, byte-verbatim** (house structure per ADR-0025):

  ````markdown
  # ADR-0026: Region placement of the api worker — the SIN hint

  **Status:** Accepted
  **Date:** 2026-11-14

  ## Context

  The M8 spec (`docs/specs/2026-11-14-m8-admin-cms-latency-spec.md`, ratified 2026-11-14) and its baseline walk (#280) measured every admin catalog read at **2.5–5.0 s wall clock** with cpuTime of only 14–39 ms — about 99% of the wait is database I/O, and warm refetches are exactly as slow as cold ones. The topology verdict (#283, durable record `research/topology-verdict-findings.md` @ `5c4b1a4`) localized the cost: the api worker executes at whichever colo serves the frontend's user (service bindings co-locate by default — ADR-0016), so for staff in the Philippines every request pays a fresh Supavisor connect and its queries over a Manila→Singapore chain — a fresh Postgres TLS + SCRAM handshake is 4–5 round trips at 50–90 ms each plus 2–4 more for the queries, roughly **300–800 ms of DB-attributable cost per cold admin read**, before the episodic Supavisor connect degradation (~2.3 s connects — the 2026-11-09 P0 signature) that made the measured numbers worse than the model. The database stays where it is: Supabase ap-southeast-1 (Singapore) is already the closest region to the audience, the free tier fixes the region at project creation, and no Philippines region exists.

  The first attempt at connection relief, Hyperdrive, was reverted after the 2026-11-11 platform episode (**ADR-0024 is burned**; the re-land recipe stays parked in #260). Placement is the remaining free-tier-native topology lever.

  ## Decision

  **Pin the api worker to the database's metro with a region placement hint — region mode (targeted), never Smart Placement:**

  ```toml
  # apps/api/wrangler.toml
  [placement]
  region = "aws:ap-southeast-1"
  ```

  Region hints are GA (Cloudflare changelog, 2026-01-22): "Workers run in the Cloudflare data center with the lowest latency to the specified cloud region" — deterministic, no traffic analysis needed, free-plan available. Wrangler 4.127.1 (the pinned install) validates and forwards the targeted format (`parseConfigPlacement` → `{ mode: "targeted", region }` on the version-upload request; proven by dry-run + dist inspection, 2026-11-14).

  **Why not Smart Placement:** smart mode "only considers locations where the Worker has previously run" — the api runs at MNL/CEB (PH visitors) plus the CI runners' US/EU colos; **Singapore is not in the candidate set**, so smart mode cannot reach the DB's metro. Its analyzer also "requires consistent traffic from multiple locations" — a few staff's admin volume would sit at `INSUFFICIENT_INVOCATIONS` indefinitely.

  **The frontends stay at the edge.** Placing `landing` or `admin` would add a cross-metro hop to every page response for every visitor; Cloudflare's documented split pattern is an edge Worker close to the user and a backend Worker close to the database. The service binding (ADR-0016) forwards the admin's api calls to the placed worker: one Cloudflare-backbone round trip MNL↔SIN ≈ **30–70 ms** per request — the accepted trade against the ~200–450 ms of connect + query RTTs saved intra-metro (**~150–600 ms net per cold admin read**, modelled; the #280 baseline suggests the episodic connect-degradation share is larger still).

  **The deploy path is CI only.** The hint rides `wrangler.toml` into CI's deploy legs (`Deploy teaser (main)` → `sevendays-api`; the v1 pick → `sevendays-v1-api`). A bare local deploy is forbidden — the #263/#264 lesson (it wipes the CI-passed `--var`s; the only restore is `gh run rerun`).

  **Acknowledged side effect on the public cache (ADR-0025):** the read-through edge cache lives in the api worker, so it now warms in Singapore only. PH *warm* public reads (inside the 60 s TTL) pay the ~30–70 ms forward hop instead of ~0; PH *cold* public reads save the same intra-metro dial the admin saves. Net favorable; public/landing reads are out of M8's scope (owner acknowledgment on record — spec user story 14).

  **Accepted residual:** the admin worker's own direct-DB paths — the shell gate's `getSession`, the Audit Log viewer, the Users tab (ADR-0023) — keep their cross-metro connect penalty: the placement lever cannot reach them while they run at the edge, and the owner ratified them as an accepted residual (2026-11-14, spec § Out of scope) as owner-only, low-frequency screens.

  ## Alternatives Considered

  - **Smart Placement (`mode = "smart"`)** — the free-plan default, but provably unable to relocate this worker: the candidate-set failure (SIN was never run at) and the traffic-volume failure (admin-only volume starves the analyzer) above.
  - **Placing the frontends too** — anti-lever: adds ~50–90 ms to every admin/landing page response for every PH visitor.
  - **Hyperdrive** — the right product shape for the connect cost, but blocked on the 2026-11-11 platform episode (#260; reverted #261/#262, ADR-0024 burned). When it re-lands it composes UNDER the read cache (ADR-0025), at the (now SIN) execution site — not instead of placement.
  - **Supabase read replicas** — Pro plan and up; the deployment stays free-tier until handover (owner ruling).
  - **Moving the Supabase project** — no PH region exists; the free-tier region is fixed at creation; SIN is already optimal.
  - **Supavisor pooler config changes** — nothing to change: transaction mode + `prepare: false` are already live (ADR-0007, amended 2026-09-02).

  ## Consequences

  - **Every api request executes in the SIN metro** regardless of arrival colo. Verification: the `cf-placement` response header — present on all responses once placement is enabled (`remote-<airport>` when routed by placement, `local-<airport>` when the worker ran at the arrival location; the header is absent entirely without placement — the pinned pre-change state on #285). #285 records the live header evidence and the before/after access-log comparison against the #280 table; the M8 exit gate (#289) re-runs the full baseline walk against the ratified target. The Workers API placement-status endpoint exists as a fallback, but an Oct 2026 community report of `wrangler workers versions list/get` HTTP 500s on placement-region workers makes the header the preferred seam.
  - **Dev/test unaffected** — placement is deploy-time routing; `wrangler dev`, vitest, and the loopback suite never see it.
  - The M4-era "measure before adding machinery" posture is discharged by the #280 baseline: the machinery here is one config key, and its proof is the comparison the exit gate runs.
  ````

- [ ] **Step 2: the progress.md bullet** — insert directly before the `## Known Gaps / Not Yet Done` heading (must match exactly once; after the edit the file gains exactly the one bullet):

  ```text
  OLD: ## Known Gaps / Not Yet Done
  NEW: - The api worker is **region-placed to the database's metro** (2026-11-14, #285 — ADR-0026): `[placement] region = "aws:ap-southeast-1"` in `apps/api/wrangler.toml` — region mode (targeted), never Smart Placement (SIN was provably unreachable: not in the candidate set of colos the worker ran at, and admin-only volume would starve its analyzer — the #283 verdict). Deployed through CI's deploy legs only (the #263 discipline); the frontends stay at the edge; the service-binding call path (ADR-0016) pays the ~30–70 ms forward hop in exchange for intra-metro Supavisor dials (~150–600 ms modelled saving per cold admin read). Side effect on the record: the #263 public read-cache warms SIN-only (PH warm public reads pay the hop, cold ones save more). Verified via the `cf-placement` response header (absent before, `*-SIN` after — evidence on #285) and the before/after access-log comparison against the #280 baseline table (also on #285). The admin-worker → DB-direct reads (shell gate, Audit Log viewer, Users tab — ADR-0023) keep their cross-metro penalty as the owner-ratified residual. Hyperdrive stays burned (ADR-0024); the #260 recipe stays parked.

  ## Known Gaps / Not Yet Done
  ```

- [ ] **Step 3: commit** (ADR + progress bullet, nothing else in the commit):

  ```bash
  git add docs/adr/0026-api-region-placement.md docs/progress.md
  git commit -m "docs(m8): ADR-0026 — the api worker's region placement (#285)"
  ```

---

### Task 3: gates, push, PR, merge, watch the CI deploy

**Files:** none new.

- [ ] **Step 1: gates** — from the repo root:

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Green 35/35 with the Global Constraints floors byte-identical. `pnpm build` is covered by the check job's downstream build step in CI; run it locally too if anything build-adjacent feels touched (it should not be).

- [ ] **Step 2: push + PR**:

  ```bash
  git push -u origin HEAD
  gh pr create --title "feat(api): the SIN region placement hint — the api worker executes in the DB's metro (#285)" --body-file - <<'EOF'
  M8 ticket 01 (#285, spec D1): one config block — the api worker pins to the DB's metro.

  - `[placement] region = "aws:ap-southeast-1"` in `apps/api/wrangler.toml` — region mode (targeted) per the #283 topology verdict; NOT smart mode (SIN unreachable: not in the candidate set of colos the worker ran at, and admin-only volume starves the analyzer)
  - ADR-0026 records the decision: the ~30–70 ms service-binding forward-hop trade, the frontends stay at the edge, the #263 public-cache SIN-warming side effect, the Hyperdrive history (ADR-0024 burned, #260 parked)
  - Deployed through CI only (the #263 discipline — never a bare local deploy)
  - Verification (operational, per spec D5 — no traces): the `cf-placement` header on live requests (SIN execution) + a before/after access-log cold-read comparison against the #280 baseline table, recorded on #285

  No code changes; `pnpm check` floors unchanged.
  EOF
  ```

- [ ] **Step 3: CI check green on the PR, then squash-merge.** Record the merge SHA (the exit gate's ledger needs it in Task 7).

- [ ] **Step 4: watch the deploy** — find the new run (`gh run list --branch main --limit 1` fired a few seconds after merge, per the #271 lesson: verify the run's head SHA matches the merge SHA before watching, or the watch grabs the PRIOR run), then `gh run watch <run-id>` until the `Deploy teaser (main)` leg finishes; the `Deploy api (sevendays-api)` step must be green. Record the run id — it is the restore vehicle if anything var-shaped breaks later (`gh run rerun <run-id>` re-applies every var verbatim).

---

### Task 4: live verification — `cf-placement` (agent-only)

**Files:** none on disk (evidence lands on #285).

- [ ] **Step 1: the curl** — from this machine (PH vantage; cf-rays landed `-CGY`/`-MNL` at plan time):

  ```bash
  curl -sI --max-time 15 "https://sevendays-api.pahamajulius.workers.dev/api/v1/site-settings" | grep -iE 'HTTP|cf-placement|cf-ray'
  ```

  Expected: `cf-placement:` **present with a value ending `-SIN`** (e.g. `remote-SIN`), on an HTTP 200. Record the exact observed value + the cf-ray. Decision table:
  - Header present ending `-SIN` → the lever is live; proceed.
  - Header present ending `-<something-else>` → the hint resolved to another metro: stop and take it to the owner (do not "fix" by editing the region unilaterally).
  - Header absent **and** cf-ray ends `-SIN` → the request landed at the pinned metro and executed there; re-run the curl once after ~60 s (the site-settings read is edge-cached — a cached response still executes the worker, so the header should appear regardless). If it stays absent on a non-SIN ray → the hint did not take: check the deploy step's log in the Task 3 run and stop for the owner.
  - The endpoint errors non-200 → suspect the var wipe class instead (the #263 signature): `gh run rerun <Task-3-run-id>` restores, then re-curl.

- [ ] **Step 2: the two-read smoke** (the vars-intact confirmation — CI re-applied them; the worker boots and the cache chain answers):

  ```bash
  curl -s --max-time 15 "https://sevendays-api.pahamajulius.workers.dev/health"
  curl -s --max-time 15 "https://sevendays-api.pahamajulius.workers.dev/api/v1/site-settings" | head -c 300
  ```

  Expected: `/health` 200 JSON; site-settings 200 JSON (the public chain).

- [ ] **Step 3: post the interim evidence to #285** (the acceptance box "`cf-placement` observed" is only ticked in Task 6, after the walk too is recorded):

  ```bash
  gh issue comment 285 --body "Placement live evidence (deploy run <run-id from Task 3>):

  - \`curl -sI …/api/v1/site-settings\` from the PH vantage: HTTP 200, \`cf-placement: <observed value>\`, cf-ray <observed> — SIN execution (before-state pinned at plan time: header absent entirely, cf-rays -CGY/-MNL).
  - /health 200; /api/v1/site-settings 200 — the CI deploy leg re-applied the four plain vars; no var-wipe signature.
  - Before/after access-log comparison: pending the owner's cold walk (asked <date>)." 
  ```

  (Fill the four `<…>` slots with the real values from Steps 1–2 and the scheduling date; keep everything else byte-verbatim.)

---

### Task 5: the before/after access-log comparison (HITL — the owner walks, the agent drives the tail)

> **Execution corrections (2026-11-14, found at run time on #285 — these override the steps below; #289's exit-gate re-run MUST use the corrected form):**
> 1. `wrangler tail` in wrangler 4.127.1 **rejects `--name`** (`Unknown argument`, probed) — run the capture bare from `apps/api`, where the config supplies the name: `cd apps/api && timeout 600 pnpm exec wrangler tail --format json > <capture>` (no `--filter` wrapper needed either; run from the package dir).
> 2. The tail stream arrives **pretty-printed multi-line JSON, not JSONL** — parse it with a brace-split parser (track depth, collect top-level `{…}` objects; #280's method), not line-by-line `json.loads`.
> 3. `logs[].message` is a **LIST of strings** (one console call per element), not a scalar — iterate the list; each element is a pino JSON string (`"evt":"access"` rides inside one of them).

**Files:** none on disk (scratch under `/tmp/m8-after-walk/`; evidence lands on #285).

- [ ] **Step 1: schedule the walk with the owner** — send this ask and wait (never assume while the owner may be AFK):

  > M8 ticket 01 needs its after-deploy walk. The placement hint is live on the api (deploy run <run-id>). Could you do one **cold** pass of the admin, same shape as your #280 baseline: fresh login, then visit each CMS list screen **once**, letting each list finish loading — packages, branches, frames, inclusions, addons, lookups, gallery, testimonials, submissions, settings (Site + Users), audit-log. Tell me when you're about to log in so the tail capture is armed, and when you're done — ~2 minutes. The api tail records per-route wall times; I'll build the before/after table against the #280 baseline and post it to the ticket.

- [ ] **Step 2: arm the capture** before the login (the login itself fires no api access lines — the admin worker's auth is invisible to the api tail — so arming early is safe):

  ```bash
  mkdir -p /tmp/m8-after-walk
  timeout 600 pnpm --filter @sevendays/api exec wrangler tail --name sevendays-api --format json > /tmp/m8-after-walk/capture.jsonl
  ```

  (The `timeout 600` bounds a hang; if the walk outlives it, restart the tail and union the runs — the #280 precedent for silent disconnects. If a walk shows fewer access lines than screens visited, re-ask the owner for the missing routes and union.)

- [ ] **Step 3: extract** — write this extractor verbatim to `/tmp/m8-after-walk/extract.py`, then run it on the capture:

  ```python
  #!/usr/bin/env python3
  """M8 #285 after-walk extractor: wrangler-tail JSONL -> per-route access rows.

  Reads the capture file (argv[1]); the api's pino lines ride tail JSON inside
  logs[].message as JSON strings — the access events are the ones containing
  "evt":"access". Prints one line per route (sorted): hit count, statuses,
  durations, median; then an ALL aggregate. Route = the api access line's
  route field (route pattern; raw path on unmatched routes)."""
  import json
  import statistics
  import sys

  by_route = {}
  statuses = {}
  for line in open(sys.argv[1], encoding="utf-8", errors="replace"):
      try:
          rec = json.loads(line)
      except ValueError:
          continue
      for lg in rec.get("logs") or []:
          msg = lg.get("message")
          if not isinstance(msg, str) or '"evt":"access"' not in msg:
              continue
          try:
              evt = json.loads(msg)
          except ValueError:
              continue
          if evt.get("evt") != "access":
              continue
          route = evt.get("route", "?")
          by_route.setdefault(route, []).append(int(evt.get("durationMs", 0)))
          statuses.setdefault(route, set()).add(evt.get("status"))

  for route in sorted(by_route):
      ds = sorted(by_route[route])
      st = ",".join(str(s) for s in sorted(statuses[route]))
      print(f"{route}\tn={len(ds)} status={st} durations={ds} median={statistics.median(ds):.0f}")

  all_ds = [d for ds in by_route.values() for d in ds]
  if all_ds:
      print(f"ALL\tn={len(all_ds)} median={statistics.median(all_ds):.0f}")
  ```

  ```bash
  python3 /tmp/m8-after-walk/extract.py /tmp/m8-after-walk/capture.jsonl
  ```

- [ ] **Step 4: build + post the comparison** — a markdown table in the #280 resolution's cold-column shape, every route of the #280 table represented (the ten admin list reads + site-settings; the thumb row recorded if the walk fired it, marked as carrying session-verify + transform costs this ticket does not touch — #286/#287 own those):

  ```bash
  gh issue comment 285 --body "Before/after access-log comparison — the #280 cold column vs the post-placement walk (<date>, owner cold pass; confound check: M8 tickets live on the teaser api at walk time: <list or 'none beyond #285'>).

  | GET route | #280 cold | after cold | Δ |
  |---|---|---|---|
  | /api/v1/admin/service-packages | 5024 | <n> | <n> |
  | /api/v1/admin/studio-services | 3735 | <n> | <n> |
  | /api/v1/admin/branches | 2681 | <n> | <n> |
  | /api/v1/admin/addon-services | 2603 | <n> | <n> |
  | /api/v1/admin/gallery-categories | 2673 | <n> | <n> |
  | /api/v1/admin/gallery-photos | 2654 | <n> | <n> |
  | /api/v1/admin/testimonials | 2645 | <n> | <n> |
  | /api/v1/admin/testimonial-submissions | 2505 | <n> | <n> |
  | /api/v1/admin/attires | 2655 | <n> | <n> |
  | /api/v1/admin/print-sizes | 2622 | <n> | <n> |
  | /api/v1/site-settings (public chain) | 1912 | <n> | <n> |
  | /api/v1/admin/gallery-photos/:id/thumb (median; session+transform bound — #286/#287's levers) | 3739 | <n if fired> | <n> |
  | Aggregate median (non-thumb) | ~2650 | <n> | <n> |

  Numbers are wall-clock `durationMs` from the api access log (the #280 method). Recorded as observed — no target judgment here: the ratified cold-median-≤1 s call is the M8 exit gate (#289)."
  ```

  Fill every `<n>` from the extractor output; the aggregate row is the median over the **eleven non-thumb routes'** durations (compute it from the extractor's per-route `durations` lists — the extractor's `ALL` line includes thumbs when the walk fires them, so it is not the aggregate row's source); fill the confound slot honestly by checking `git log --oneline main` for #286/#287/#288 merges that reached the teaser deploy before the walk — if any landed, say so in the confound line (the delta then reflects the sum, and #289 remains the final judgment). A route that shows no improvement is recorded as-is with no editorial smoothing (the Supavisor episodic degradation is distance-independent; the honest table is the deliverable).

---

### Task 6: close #285

**Files:** none on disk (the ticket body + state).

- [ ] **Step 1: tick the four acceptance boxes** — all four now hold (config + CI green = Task 3; `cf-placement` observed = Task 4; comparison recorded = Task 5; ADR written = Task 2). Fetch the body, flip each `- [ ]` to `- [✅]` on the four acceptance-criteria lines (they are the only checkboxes in the body), write it back:

  ```bash
  gh issue view 285 --json body -q .body > /tmp/m8-after-walk/285-body.md
  # flip the four '- [ ]' acceptance lines to '- [✅]' (✅ emoji, never plain [x] — the AGENTS.md rule)
  gh issue edit 285 --body-file /tmp/m8-after-walk/285-body.md
  ```

- [ ] **Step 2: close** — `gh issue close 285 --reason completed`. The resolution evidence is already on the ticket (Tasks 4–5 comments). **Do not tick this ticket's plan.md M8 box** — all five flip at #289.

---

### Task 7: post-merge — the v1 pick + ledger row

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row — main-side, direct commit per the ledger precedent)

- [ ] **Step 1: triage per `docs/agents/v1-picks.md`** — `node scripts/v1-triage.mjs <merge-sha>` (the Task 3 merge SHA). Expected shape: **SPLIT — 2 v1-paths** (`apps/api/wrangler.toml`, `docs/adr/0026-api-region-placement.md`) **+ 2 main-only** (`docs/progress.md`, this plan file — dropped). Record the classifier's actual output. Content pass expected clean: one config block + a shared-context ADR — zero booking tokens, zero edition mechanics.

- [ ] **Step 2: execute the pick + locks** per the runbook — cherry-pick the squash commit onto `v1`, resolve the two main-only paths as drops, then:

  ```bash
  pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  node scripts/audit-v1-absence.mjs HEAD   # exit 0 / PASS 0/18 over full history
  git push origin v1
  ```

  Watch the run **sha-verified** (the #271 lesson: confirm the run's head SHA is this push's SHA before watching): `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Superset check: the merge SHA reachable from origin/main.

- [ ] **Step 3: live v1 evidence** — the v1 api worker now carries the hint too:

  ```bash
  gh variable get API_URL -e v1 -R jeius/sevendays
  curl -sI --max-time 15 "<API_URL from the variable>/health" | grep -iE 'HTTP|cf-placement|cf-ray'
  ```

  Expected: 200 with `cf-placement` ending `-SIN` (record the observed value). Plus the standing live curls: v1 landing 200, `/book` 404.

- [ ] **Step 4: the ledger row** — one row appended to `docs/agents/v1-picks.md`, the #276/#278 rows as the format template (`| date | PR# | main-sha | class | v1-sha | narrative |`; the `<…>` cells are execution-filled — merge SHA, PR number, v1 SHA, run id, the classifier's actual class, the observed cf-placement value):

  ```text
  | 2026-11-<d> | #<PR> | <merge-sha> | <class — expected split> | <v1-sha> | #285 — M8 ticket 01: the api worker's region placement (the `[placement] region = "aws:ap-southeast-1"` block + its rationale comment in apps/api/wrangler.toml — region mode, never Smart Placement per the #283 verdict; ADR-0026 — the ~30–70 ms service-binding forward-hop trade, frontends at the edge, the #263 public-cache SIN-warm side effect, Hyperdrive burned (ADR-0024) / parked (#260); CI-only deploy). Classifier <actual class> — 2 v1-paths (apps/api/wrangler.toml, docs/adr/0026) + 2 main-only (docs/progress.md, the plan file — dropped). Content pass clean — one config block + a shared-context ADR, zero booking tokens, zero edition mechanics. Locks on <v1-sha>: frozen install/build:packages/api-build green; check 35/35 (TEST_DATABASE_URL :5434/sevendays_test); absence audit PASS 0/18 over full history; superset ok (<merge-sha> reachable). Run <run-id>: check success · Deploy v1 (private) success · Deploy teaser (main) skipped. Live: v1 landing 200, /book 404; v1 api /health 200 with cf-placement ending -SIN (the v1 worker placed too — observed <value>). Main side: PR #<PR> squash-merged after CI green; the cf-placement + before/after access-log evidence on #285 (the ratified ≤1 s judgment stays #289's exit gate). |
  ```

  Commit:

  ```bash
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #285 ledger row - the M8 placement pick (the SIN hint reaches both api workers)"
  git push origin main
  ```

---

## Self-review notes for the executor

- **Pin inventory (all probed/verified 2026-11-14 @ `832da91`):** the wrangler 4.127.1 dry-run acceptance + targeted-format forwarding (dist-inspected `parseConfigPlacement`); the before-state (`cf-placement` absent; direct curls 200 at the api workers.dev URL; PH-vantage cf-rays `-CGY`/`-MNL`); the access-event field set and its tail-JSON carrier shape; the CI legs' `--name` overrides; the no-parser sweep over `wrangler.toml`; the ledger row template (#276/#278); the research branch `research/topology-verdict` @ `5c4b1a4` exists and carries the findings file.
- **If line numbers shifted** (an intervening commit): every OLD string here is content-anchored, not line-anchored — they still apply; a ≠1 match means drift, stop and reconcile.
- **The two-stage close is the designed path:** Tasks 1–4 are agent-only; only Task 5 waits on the owner. If the owner is AFK after Task 4, the interim comment is posted, #285 stays **open** with the pending-walk note, and work stops there — the ticket closes only with the comparison recorded (Task 6).
- **Confound honesty:** if any sibling M8 ticket (#286–#288) reached the teaser deploy before the walk, the comparison comment's confound line says so — the delta is then the sum of levers, and only #289 judges the milestone.



