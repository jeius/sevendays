# v1 picks — the per-PR discipline (main-only runbook)

The standing maintenance of the two-edition delivery (ADR-0015 decision 2; spec `docs/specs/2026-09-11-delivery-versions-spec.md` § The Artifact Mechanism). `v1` is the booking-free artifact line seeded once by `git filter-repo` (#80); from that seed on, every PR squash-merged to `main` is triaged here — **pick**, **skip**, or **split** — executed, locked by CI + the private deploy + the export audit, and recorded in the ledger at the bottom. This file lives under `docs/agents/`, a path the seed removed from `v1`: it is main-only by construction and never enters the artifact (its own PRs are skips).

## The standing rule

**Main is a strict superset of `v1` by patch content.** Every commit on `v1` after the seed is either a cherry-pick of a main squash commit (carrying its `(cherry picked from commit …)` line), a split of one (that line plus a `Split:` line), or a revert of a pick. Nothing is authored on `v1` directly; main is never merged into `v1`; `v1` only ever moves by fast-forward pushes. Booking enters `v1` exactly once, as the paid v2 change-set — never through a pick.

Seed point: main `0bdfe82` ≡ `v1`'s rewritten `e314af3` (the seed content commit `0f4f340` sits on top). Everything merged to main after `0bdfe82` is triage backlog; the ledger starts there.

## The loop — on every squash merge to main

1. **Triage** (path pass + content pass, below) → PICK / SKIP / SPLIT.
2. **Execute** in the `v1` checkout — `~/Projects/sevendays-v1-seed`, branch `v1` (the seed clone kept as the working copy; any clone with `v1` checked out works). The main workspace never checks `v1` out.
3. **Lock**: local `pnpm check` + `pnpm build` green in the checkout, the export audit exit 0, then push; the push's run must show `check` + `Deploy v1 (private)` success and `Deploy teaser (main)` skipped.
4. **Record** the ledger row (this file, in a main PR — itself a skip).

Who runs it: whoever triages — agent or owner. The locks, not a reviewer, keep `v1` honest; anything the conflict policy calls ambiguous stops at the owner. Cadence: triage at merge time; a backlog is caught up in main order.

## Triage

### Path pass — `scripts/v1-triage.mjs`

```bash
node scripts/v1-triage.mjs <main-sha>
```

Classifies every path the squash commit touched as **MAIN-ONLY** (the seed's invert-paths list `scripts/seed-v1/paths.txt`, read live, plus the booking-cluster globs and the `docs/client/` fence) or **v1-path**, and prints the path-level verdict: all main-only → `SKIP`; none → `PICK`; both → `SPLIT`.

### Content pass — what never enters `v1` even on a v1-path

Read every v1-path hunk (`git show <sha> -- <path>`) against these rules; a hunk that trips one is dropped — and if every v1-path hunk trips, the PR is a SKIP:

- **Booking content** — anything carrying an absence-inventory token (`node scripts/audit-v1-absence.mjs --list-tokens`): the `RESEND_API_KEY`/`LANDING_ORIGIN` pair, the `resend` dependency, `appointmentQueries`, `createAppointment`/`getAppointment`, `phDateTime`, booking routes and links, the `/appointments` mount, `confirmation-email`. Also booking-coupled plumbing whose only purpose is the pair or the absent routes (test helpers that inject the pair, fixtures for absent endpoints). The audit is the mechanical backstop, not the first line.
- **Edition mechanics** — prose or config naming the editions, the teaser, the seed, picks, handover, `v1`/`v2`: `AGENTS.md`'s pick-discipline pointer, plan/progress prose, `docs/client/`. `v1`'s `AGENTS.md`, `docs/{PRD,architecture,tech-stack}.md`, ADR-0013/0016 and the CONTEXT glossaries are client-safe rewrites; only client-safe hunks may land on them.
- **Deployment identity** — `wrangler.toml`/`wrangler.jsonc` `name` fields and the `API` service binding stay `sevendays-v1-*` on `v1` (ADR-0016); a main hunk touching them is re-applied with the `v1` names.

Final verdict = the path verdict narrowed by the content pass. A real booking PR usually reads SPLIT on paths and SKIP on content (worked example #65 below).

### Transformed surfaces — pickable, expect conflicts

Files that exist on both branches with different content (the seed's booking-off rewrite): landing `components/{site-header,package-card,service-card,service-teaser-item,branch-card}.tsx`, `routes/{index,services}.tsx`, `lib/{queries,api.functions,format,format.test,api-404}.ts`; api `src/{routes/v1.ts,env.ts,env.test.ts}`, `package.json`, `wrangler.toml`, `.dev.vars.example`, `test/helpers/env.ts`; api-client `src/{index.ts,app-type.test.ts}`, `test/{mock-api,typing.test,loopback.test}.ts`; both frontends' `wrangler.jsonc`; `AGENTS.md`, `docs/{PRD,architecture,tech-stack}.md`, `docs/adr/{0013,0016}-*.md`, `CONTEXT-MAP.md`, `apps/*/CONTEXT.md`. Regenerables: `apps/landing/src/routeTree.gen.ts`, `pnpm-lock.yaml`.

## Executing a PICK

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1
git fetch origin main
git cherry-pick -x <main-sha>          # conflicts → § Conflict policy
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'     # then: gh run watch <id> --exit-status
gh run view <id> --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'      # check: success · Deploy v1 (private): success · Deploy teaser (main): skipped
```

`-x` appends `(cherry picked from commit <main-sha>)` — the provenance line the superset check reads. The main SHA is absent from the export's history; accepted (ADR-0015 Consequences).

If the PR changed dependencies, `pnpm install --frozen-lockfile` fails or the lockfile conflicts (`v1` dropped `resend`): take `v1`'s lockfile (`git checkout v1 -- pnpm-lock.yaml`), run `pnpm install` to apply the PR's `package.json` changes, and commit the regenerated lockfile inside the pick — never hand-edit it. If the PR added or removed a landing route, regenerate the route tree on `v1` (`pnpm --filter @sevendays/landing generate-routes`) instead of resolving `routeTree.gen.ts` by hand.

## Executing a SPLIT

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git cherry-pick -n <main-sha>          # exits 1 when a main-only path is "deleted by us" (DU) — expected
git status --short                     # A = new main-only file, DU = absent on v1, M = v1-path hunk
git rm -qrf --ignore-unmatch -- <main-only path> [<main-only path> …]
git commit -F - <<EOF
$(git log -1 --format=%B <main-sha>)
(cherry picked from commit $(git rev-parse <main-sha>))
Split: main-only paths dropped — <path>, <path>
EOF
```

Then the same locks as a PICK (gates, audit, push, run). A v1-path hunk the content pass rejected (a booking-coupled edit to a shared file) is reverted before the commit with `git restore --staged --worktree --source=HEAD -- <path>` and named in the `Split:` line as `content-dropped: <path>`.

## Conflict policy on transformed surfaces

The pick reproduces the PR's **intent** on `v1`'s variant; it never restores booking or edition content. Per class:

- **Landing booking-off surfaces** (header, hero, cards, `/services` copy): keep `v1`'s call-forward content (spec § The Booking-Off Direction — "Call us" → `/branches`, `tel:` CTAs on branch cards, no CTA rows on catalog cards); re-apply the PR's styling, structure, and copy changes around it. A hunk whose substance *is* the booking CTA is dropped (the pick becomes a split).
- **api env-shed, api-client group, `routes/v1.ts` mounts**: the appointments/email entries never return; re-apply everything else.
- **`wrangler.*` configs**: `sevendays-v1-*` names and the `sevendays-v1-api` binding stay; re-apply other config intent.
- **Client-safe docs and `AGENTS.md`**: re-apply only client-safe, mechanics-free hunks — usually nothing.
- **Regenerables**: never resolved by hand — regenerate (route tree, lockfile) after the other hunks land.

Time-box: if a single pick's conflict work passes one hour, or the resolution amounts to re-authoring a surface rather than re-applying a change, stop — the owner decides, and the event counts toward the fallback trigger. Never resolve a conflict by weakening the audit or the checks.

## The locks — after every push

- `check` green on the `v1` run (`pnpm check` + `pnpm build` — the typed cascade fails any incomplete cut).
- `Deploy v1 (private)` success and `Deploy teaser (main)` **skipped** on that run — the pick touched only `v1`'s pipeline; the teaser lives on main's own runs.
- Export audit exit 0 over `v1`'s full history (run before the push; re-runnable any time).
- Live curl once the deploy leg lands: the picked content is served on `https://sevendays-v1-landing.pahamajulius.workers.dev`, `/book` is still 404 there, and the teaser still serves `/book` 200 — the deployed artifact is booking-free and the teaser is untouched by the pick.
- Superset check (any time): every `(cherry picked from commit <sha>)` on `v1` after the seed names a commit reachable from `origin/main` —

  ```bash
  cd ~/Projects/sevendays-v1-seed && git fetch origin main
  git log --format=%B 0f4f340..v1 | grep -o 'cherry picked from commit [0-9a-f]*' | awk '{print $5}' | sort -u \
    | while read s; do git merge-base --is-ancestor "$s" origin/main && echo "ok $s" || echo "NOT ON MAIN $s"; done
  ```

A red `check` on a pick: if the cause is content (the cut was incomplete), `git revert` the pick on `v1`, push, and re-triage — never force-push, never hot-fix on `v1`. If the cause is infrastructure (token, environment, worker), it is an owner-run ops fix; the pick stands.

## Fallback — the squashed snapshot

ADR-0015 holds one escape hatch if the discipline proves too costly: replace the lineage with a squashed snapshot of `v1`'s tree (absence trivially satisfied, provenance discarded). It is a one-way door — after clients hold `v1`-SHA repos, only another full handover can change the mechanism — so the trigger is explicit and the decision is the owner's.

**Trigger (owner-ratified 2026-09-11) — any one of:**

1. A single pick needs more than one hour of conflict work, or its resolution re-authors a transformed surface instead of re-applying the change.
2. `v1` lags main by more than 10 pickable PRs, or the oldest untriaged merge is more than 4 weeks old.
3. Two consecutive picks land red on `v1`'s `check` for content reasons.

A hit means: stop picking, record the hit in the ledger's notes, and bring it to the owner. The owner either rules a fix (usually: catch up in main order, or re-scope a surface) or invokes the fallback — which is its own ticket, never an in-loop action.

## Worked examples

- **#86 `fb92ef9` — SKIP.** The seed's own PR: `scripts/seed-v1/*`, `scripts/audit-v1-absence.mjs`, `docs/plan.md`, `docs/progress.md`, a plan file, `graphify-out/*` — 18 paths, all main-only. Nothing to read.
- **#65 `abfa9d2` (confirmation email + Resend; pre-seed, worked retrospectively) — SPLIT on paths, SKIP on content.** Path pass: 12 v1-paths (`pnpm-lock.yaml`, `apps/api/src/env.ts`, `env.test.ts`, `package.json`, `.dev.vars.example`, `wrangler.toml`, `test/helpers/env.ts`, five api test files) beside 29 booking-cluster and docs/graph main-only paths. Content pass: every v1-path hunk adds the `RESEND_API_KEY`/`LANDING_ORIGIN` pair, the `resend` dependency (the `pnpm-lock.yaml` hunk is its lockfile resolution entries), or routes the pair into test envs via `helpers/env` — nothing stands alone as booking-free value. Final: SKIP. (Its rewritten form already lives in `v1`'s history as `0c01531`; this is the example, not an executed skip.)
- **The route-titles PR (#TITLES_PR) — PICK.** Five landing route files, all v1-paths, no tokens; the first real pick (ledger).
- **The split drill — SPLIT.** A synthetic mixed commit (a v1-path comment + a booking-cluster edit + a new booking-cluster file), split on a local branch of the checkout, never pushed: `git diff --stat v1..HEAD` showed the v1-path only; the audit passed; both branches deleted.

## Ledger

One row per squash merge to main since the seed point, in main order. `v1 SHA` is the pick/split commit (— for skips). Drills are marked.

| Merged | PR | Main SHA | Verdict | v1 SHA | Notes |
|---|---|---|---|---|---|
| 2026-09-11 | #86 | `fb92ef9` | skip | — | seed PR: ruleset + audit token fix + docs/graph — 18 paths, all main-only |
