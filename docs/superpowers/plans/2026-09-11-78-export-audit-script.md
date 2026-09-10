# Export audit script — `git log -S`/`-G` sweeps keyed to the absence inventory (#78) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mechanical absence-proof instrument — a main-only Node script (`scripts/audit-v1-absence.mjs`) that sweeps the full history of a given ref (or an export clone via `--repo`) with git pickaxe (`-S` literals + one `-G` word-boundary regex) over a 16-token inventory keyed to the v1 absence boundary, exiting non-zero on any hit — proven to detect (on main) and proven not to false-alarm (on a clean fixture), with usage documented for its two consumers: the seed's lineage proof (#80) and M7's export audit.

**Architecture:** One self-contained ESM script, no dependencies, `node:child_process` `spawnSync` with argv arrays (`shell: false` — tokens contain quotes). Three modes: `audit <ref> [--repo <path>]` (the instrument), `--self-test` (builds throwaway clean + dirty git fixtures in a temp dir and asserts exit 0 / exit 1 — the permanent, re-runnable form of the issue's two proof criteria), and `--list-tokens` (prints the inventory — the seed's content-ruleset authoring input). Exit-code contract: `0` clean · `1` hits found (or self-test failure) · `2` usage/environment error. The token inventory is the design core: every token is an absent-cluster-specific string whose entire lineage must be absent from `v1`; generic stems (`appointment`, `booking`, `resend`) are banned because kept/inert content legitimately contains them.

**Tech Stack:** Node ≥ 24 (v26.7.0 on this machine), git 2.43.0 (`-S`, `-G`, `\b` word-boundary behavior all probed live — see pre-plan facts), Biome 2.5.11 (scoped single-file gate — the blanket root commands are a proven hazard, see Global Constraints), graphify 0.9.34. No new dependencies; no vitest (house ruling: verify/owner tooling is plain `.mjs`, biome-linted, deliberately not vitest-included).

**Spec:** `docs/specs/2026-09-11-delivery-versions-spec.md` — § The v1 Absence Boundary (the inventory the tokens key to), § The Artifact Mechanism (decision 5: "audit regardless"), § Verification (step 3: the export audit). Issue: jeius/sevendays#78 (label `ready-for-agent`; no blockers). Parent: #76. ADR: `docs/adr/0015-two-edition-artifact-mechanism.md` (point 5). Roadmap: `docs/plan.md` "v1 Artifact Seed" block + Milestone 7 "Export audit" checkbox.

**Scope fence (siblings sharing the spec):** #80 (the filter-repo seed) is this script's first consumer — its acceptance criterion 3 runs this script over the rewritten `v1`; this ticket delivers ONLY the instrument, never the seed, its ruleset, or any doc scrub (the kept-file hits enumerated in pre-plan fact 7 are #80's inputs, recorded durably in `docs/progress.md` by Task 3, not fixed here). #79 (pipelines), #81 (first light), #82 (pick runbook) are untouched. `docs/plan.md`'s M7 "Export audit" checkbox stays **unticked** in this ticket — it is the M7 *run's* box; Task 3 appends a pointer annotation only. The seed lineage-proof checkbox lives in issue #80's acceptance criteria, not in `docs/plan.md`.

## Global Constraints

- Node >= 24 (v26.7.0 probed, full ICU); pnpm 11 workspace; run repo commands from the repo root unless noted. git 2.43.0 is the probed reference — the script's `-G` `\b` word-boundary token relies on GNU-regex behavior verified on this toolchain (pre-plan fact 4; the documented fallback lives in the script header).
- Work on a feature branch off `main` — suggested: `feat/78-export-audit-script` (HEAD at plan time: `b70314f`). Never commit to `main`; leave pushing, PR opening, and issue edits to the user. **No `gh` mutating command appears anywhere in this plan** — issue #78's acceptance boxes are the owner's to tick.
- **No new dependencies.** Node stdlib only (`node:child_process` `spawnSync`, `node:fs`, `node:os`, `node:path`, `node:process`). `spawnSync` always takes argv arrays with `shell: false` — token literals contain single quotes, double quotes, and backslashes and must never pass through a shell.
- **Exit-code contract is verbatim:** `0` = clean sweep (or self-test pass) · `1` = hits found (or self-test failure) · `2` = usage/environment error (bad args, unresolvable ref, not a git repo, git failure). No other process may observe an ambiguous exit.
- **Token design rule (the plan's central decision):** no generic stems. Kept content legitimately contains `appointment` (the inert data seam ships: `packages/db` schema + migrations 0000–0004, `packages/types` appointment schemas and their tests, the db verify tests), `booking` (PRD prose ×11, architecture prose ×4), and `resend` (`pnpm-lock.yaml` history is not scrubbable — lines 153/3121/5842 carry the dep's normalized shapes forever). Every token in `TOKENS` is an absent-cluster-specific string; `peso` and `bookableBranch*` stay shared by ruling (spec § The Booking-Off Direction) and are deliberately NOT tokens. Adding a token requires re-proving it against the kept set; the banned-stem rationale lives verbatim in the script header so future editors don't "helpfully" re-add stems.
- **The script is outside every turbo workspace** — `pnpm check` does not exercise it. Its Biome gate is SCOPED to the file: `pnpm exec biome check scripts/audit-v1-absence.mjs` (exit 0). **Never run blanket `pnpm fix:root` / `lint:root` / `format:root` in this ticket** — probed hazard (2026-09-11): the root biome config covers `**`, so a blanket run rewrote 365 tracked files in the probe (graphify-out JSON churn + `packages/db/scripts/db-state.mjs`) while root-wide lint still exits 1 on findings this ticket doesn't own. `pnpm check` must additionally stay green (baseline pinned in pre-plan fact 13) — this ticket must not move any workspace's task status.
- Style (root Biome): single quotes, 2-space indent, line width 100, trailing commas `es5`. The code blocks in this plan are written compliant — the scoped `pnpm exec biome check scripts/audit-v1-absence.mjs` exits 0 on them as written (probed).
- `docs/plan.md` ticks use the ✅ emoji with a dated annotation — but **no `docs/plan.md` checkbox is ticked by this ticket.** The M7 "Export audit" box (line 146) receives a pointer annotation only; it stays unticked until M7's real run over the exported artifact.
- graphify 0.9.34 is installed; `graphify-out/` is git-tracked (one pre-existing untracked cache file, `graphify-out/cache/last_query_stamp`, is expected — leave it untracked, do not commit or delete it). After code changes, `graphify update .` and commit its diff.
- Never print or commit secrets — not in play here (the script touches no env), but the rule stands for any debugging output.

## Verified pre-plan facts (probed against the real workspace 2026-09-11)

Trust these; don't re-derive:

1. **Issue #78** (OPEN, `ready-for-agent`, no blockers) — "Export audit script — git log -S/-G sweeps keyed to the absence inventory". Its ACs: takes a ref (and/or clone path) and sweeps full history with `-S`/`-G` over the inventory token set, failing non-zero on any hit; proven to detect on main; proven zero-hits on a booking-free fixture (e.g. a trial filter-repo output — this plan uses deterministic synthetic fixtures instead: a trial filter-repo output doesn't exist until #80 and would still carry the kept-doc leaks of fact 7, correctly); usage documented for both consumers; `pnpm check` green.
2. **Sibling cluster (all `ready-for-agent`):** #79 edition-aware pipelines, #80 seed the v1 branch, #81 v1 first light, #82 pick discipline. **#80 is blocked by #78** (its AC 3: "Export audit script (#78) sweeps `v1`'s full rewritten history: zero hits"; AC 1: "absence inventory re-verified against HEAD before the rewrite — drift fixes the ruleset, never the audit" — `--list-tokens` is that re-verification's input).
3. **Roadmap slots:** `docs/plan.md` "v1 Artifact Seed" block (~lines 80–93, six unticked boxes — none is this ticket's) and Milestone 7 pre-handover block: line 146 is `- [ ] Export audit: \`git log -S/-G\` token sweeps keyed to the absence inventory (spec § The v1 Absence Boundary) over the exported artifact — zero hits` — this ticket annotates it with the instrument pointer (Task 3) and leaves it unticked.
4. **git probes (2.43.0, this machine):** `git log -S'appointmentQueries' HEAD` returns the booking-era commits (`b70314f`, `2f241dc`, `abfa9d2`, `9c3116d`, …). `git log -G'\bcreateAppointment\b' HEAD` parses and returns hits; `git log -G'\bcreateAppointment\b' -- packages/types/` returns **empty** — the word boundary correctly excludes `createAppointmentSchema` (kept inert types). The POSIX charclass fallback `createAppointment([^A-Za-z0-9_]|$)` also parses (pinned in the script header as the portability fallback).
5. **The `createAppointment` token cannot be an `-S` literal:** `packages/types/src/appointment.ts` (INERT-KEPT per the spec) defines `createAppointmentFieldsSchema` / `createAppointmentSchema` / `CreateAppointmentInput` (lines 63/89/94), so a bare `-S'createAppointment'` would hit v1's own kept history forever. Hence the single `-G` regex token. `getAppointment` and `CreateAppointmentArgs` have **no** kept-set hits (grep-verified across `packages/*`) and stay `-S` literals.
6. **Lockfile shapes ban the bare stem:** `pnpm-lock.yaml` contains `resend:` (line 153, importers specifier), `resend@6.26.0:` (3121, 5842) — none of which match the pinned tokens `"resend":` (double-quote-anchored package.json dep line) or `from 'resend'` (the SDK import — `apps/api/src/services/confirmation-email.ts:11` is `import { Resend } from 'resend';`, single-quote style). The `EMAIL_FROM` sandbox address `onboarding@resend.dev` is its own token.
7. **Known kept-file hits = #80's seed-input flags.** Each is a file that survives the seed (or is kept-but-content-rewritten) and contains inventory tokens today. The audit SHOULD flag them if #80's content rules miss them; #80 must scrub every one. This ticket does not touch them on main (main keeps booking; these files describe what main runs):
   - `docs/architecture.md` — `createAppointment` (prose), `POST /api/appointments` + `GET /api/appointments` (lines 50/52), "Resend confirmation email" (line 51) — the booking-flow steps need client-safe rewrites.
   - `docs/tech-stack.md` — line 44: the Resend paragraph (contains `RESEND_API_KEY` twice); line 25: "the M2 studio-services/appointments wave" (substring-matches `services/appointments`… harmless to the final token set — that token is dropped, see fact 8 — but the Resend paragraph must go).
   - `docs/PRD.md` — lines 21, 57 mention Resend ("Booking confirmation email sent via Resend…", "only email via Resend in v1").
   - `docs/adr/0013-generalized-appointment-model.md` (kept-and-annotated) — line 12 mentions `/booking/:id` and "the confirmation email" (the hyphenated token doesn't match the prose; the `/booking/:id` path does match `/book`).
   - `apps/landing/src/routeTree.gen.ts` (git-tracked) — historical revisions carry `/booking/` route entries; HEAD regenerates only if codegen runs, which filter-repo cannot do ⇒ **#80 needs a content rule for this file across history**, or the audit rightly fails the seed.
   - `apps/api/wrangler.toml` (tracked) — lines 14/20–23 carry `RESEND_API_KEY` + `LANDING_ORIGIN` comments; `apps/api/.dev.vars.example` (tracked) carries `RESEND_API_KEY`, `LANDING_ORIGIN`, `onboarding@resend.dev`, `/book`, `/booking/`, `confirmation-email` — both shrink to the env-shed shape.
   - `apps/api/test/helpers/env.ts` (kept, shared test helper) — builds the `RESEND_API_KEY`/`LANDING_ORIGIN` pair; transform with `env.test.ts`.
   - `apps/landing/src/lib/api-404.ts` (kept) — line 7 JSDoc mentions `phDateTime`; one-line reword.
   - `packages/db/src/client-transaction.test.ts` (kept, stays per spec) — line 6 comment mentions `createAppointment`; one-line reword (it matches the `\b` regex as a standalone identifier in prose).
   - `apps/landing/scripts/verify/` (tracked) — `booking-e2e.mjs`, `booking-wizard.mjs`, `confirmation-emails.mjs` are booking-token-laden owner harnesses; `content-pages.mjs`/`packages-pages.mjs` assert booking CTAs that v1 removes — #80's path list must decide remove-vs-rewrite for all five (the spec's landing cluster doesn't enumerate them).
   - `AGENTS.md` (mentions `RESEND_API_KEY`) — rewritten client-safe at the seed per the spec's docs ruling.
   - `packages/api-client/src/index.ts` (kept) — `routes/appointments` registration + `CreateAppointmentArgs` re-export; the spec-ruled api-client cut.
8. **Token `services/appointments` is dropped, deliberately:** its only referencers (`routes/appointments.ts`, `test/appointments.test.ts`) are themselves invert-paths-removed, so the token can never catch a surviving-file leak — while `docs/tech-stack.md:25`'s "studio-services/appointments wave" would false-hit kept prose. File absence is #80's `--invert-paths` job; surviving-file leaks are this audit's job. (`routes/appointments` STAYS a token — `apps/api/src/routes/v1.ts`'s mount and `packages/api-client/src/index.ts`'s registration are surviving files.)
9. **Self-hit design note:** running the audit against this repo's own `main` always exits 1 BY DESIGN — main keeps booking until v2 is commissioned, and this script's own introduction commits add every token (its path is picked to no branch and must be in #80's invert-paths set). Exit 1 on main is the detection proof, not a defect; the script header says so verbatim.
10. **Detection-proof expectation (probed live against `b70314f`):** `node scripts/audit-v1-absence.mjs HEAD` on this repo exits 1 with `AUDIT FAIL — 16/16 tokens with hits · 29 matching commits · exit 1` (every token has hits in main's history); spot-asserts pinned in Task 1 Step 5 (`FAIL S:appointmentQueries — 4 commit(s)` listing `b70314f`; `FAIL G:\bcreateAppointment\b — 15 commit(s)`; `FAIL S:RESEND_API_KEY — 10 commit(s)`).
11. **House tooling conventions:** standalone verify/owner scripts are plain `.mjs` run via `node` (precedent: `packages/db/scripts/*.mjs`, `apps/landing/scripts/verify/*.mjs` — the latter "biome-linted, deliberately NOT vitest-included" per the m2-10 plan's owner ruling). The root `vitest.config.ts` projects cover only `./packages` and `./apps` — a root-level script gets no vitest run, which is why the self-test mode exists.
12. **Root `package.json`:** `lint:root` = `biome lint`, `format:root` = `biome format`, `fix:root` = `biome check --write`; biome root config extends `@sevendays/config/biome/base` with `files.includes: "**"` (minus dist/.wrangler/.turbo/node_modules/.agents) — so `scripts/**` at the root IS biome-covered, but the root-wide biome state is currently dirty (blanket runs flag pre-existing files) — hence the scoped single-file gate in the Global Constraints. `engines.node >= 24`, `"type": "module"`.
13. **Baseline at plan time:** HEAD `b70314f` (clean tree except the pre-existing untracked `graphify-out/cache/last_query_stamp`). `pnpm check` green — pinned task count: **33/33 turbo tasks green** (lint + format + typecheck + test across the workspaces; verified live 2026-09-11 while writing this plan). The count must not move in this ticket.
14. **Progress/plan-file conventions:** landed work is recorded in `docs/progress.md` (structure: `_Last updated_` line → "Current Milestone" → "Gate status" → "What Exists" bullets → "Known Gaps" → "Immediate Next Steps" → "Notes for Future Sessions"); plans live in `docs/superpowers/plans/` named `YYYY-MM-DD-<ticket>-<slug>.md`; `.scratch/` is gitignored so durable records must land in progress.md/plan/ADR — the fact-7 flags list lands in progress.md via Task 3.

## File Structure

```text
scripts/                          # NEW directory at the repo root (owner tooling;
  audit-v1-absence.mjs            #   precedent: packages/db/scripts/, apps/landing/scripts/)
docs/plan.md                      # MODIFY — one pointer annotation on the M7 Export-audit box (line 146); stays unticked
docs/progress.md                  # MODIFY — Last-updated splice, one "What Exists" bullet (incl. the #80 flags), Next-Steps amendment
```

`scripts/audit-v1-absence.mjs` is one file with one responsibility (the sweep instrument) and three modes; splitting the self-test or the token inventory into neighbors would scatter the thing consumers must trust as a unit. **Deliberately not created:** no vitest wiring (fact 11), no root `package.json` alias (the two consumer commands are pinned in the script header — an alias would add a root-manifest surface #80 must then handle, for zero gain), no AGENTS.md edit (it is rewritten client-safe at the seed), no `docs/` usage page (the script header is the usage doc, and `docs/` scrub rules would otherwise need a ruling).

---

### Task 1: The instrument — token inventory, sweeper, CLI, detection proof

**Files:**
- Create: `scripts/audit-v1-absence.mjs`

**Interfaces:**
- Consumes: `git` on PATH (2.43.0 probed); nothing from any workspace.
- Produces (later tasks + consumers rely on these exact names/shapes):
  - `TOKENS`: array of `{ mode: 'S' | 'G', token: string }` — 16 entries (15 `-S` + 1 `-G`), in the pinned order (fact 10's spot-asserts depend on `appointmentQueries` and the `-G` entry being present).
  - `audit(repoPath: string, ref: string, { quiet?: boolean }): { code: 0 | 1, lines: string[] }` — runs the full sweep, prints the report unless `quiet`, returns the exit code and the report lines.
  - CLI: `node scripts/audit-v1-absence.mjs <ref> [--repo <path>]` · `--self-test` (Task 2 wires its body) · `--list-tokens`. Exit codes 0/1/2 per the Global Constraints.

**Not here:** no self-test yet (Task 2 builds and proves it), no `docs/` edits (Task 3), no token additions beyond the pinned 16, no `--repo` default other than `'.'`, no pathspec exclusions (the sweep is intentionally whole-history whole-tree — exclusions would weaken the M7 gate).

- [ ] **Step 1: Baseline — branch and green gate**

```bash
git checkout -b feat/78-export-audit-script main
pnpm check
```

Expected: `pnpm check` green (33/33 turbo tasks per pre-plan fact 13). Record the count in your working notes; the same count must hold at Task 4's close-out.

- [ ] **Step 2: Write `scripts/audit-v1-absence.mjs`**

Create `scripts/audit-v1-absence.mjs` with exactly this content (the header is the usage documentation required by the issue's fourth AC — Task 3 cross-links it from `docs/plan.md` and `docs/progress.md`):

```js
// Owner tooling — main only. Never cherry-picked to `v1`, never present in an
// export: the file is booking-token-laden by construction (its own inventory
// would fail the audit it runs). The v1 seed (#80) must remove this path from
// the rewritten history; the per-PR pick discipline skips it.
//
// The export-audit instrument (issue #78; ADR-0015 decision 5; delivery spec
// docs/specs/2026-09-11-delivery-versions-spec.md § The Artifact Mechanism,
// verification step 3): sweeps the FULL history of a ref with git pickaxe
// (-S literal occurrence counts + one -G regex), keyed to the v1 absence
// inventory (spec § The v1 Absence Boundary, issue #71), exiting non-zero on
// any hit.
//
// Consumers:
//   1. Seed lineage proof (#80): after the filter-repo rewrite, before the
//      one-way origin push:
//        node scripts/audit-v1-absence.mjs v1          → must exit 0
//   2. M7 export audit (docs/plan.md Milestone 7): over the exported
//      single-branch clone:
//        node scripts/audit-v1-absence.mjs HEAD --repo <export-clone>
//                                                      → must exit 0
//
// Running it against this repo's own `main` always exits 1 BY DESIGN — main
// keeps booking until v2 is commissioned, and this script's own commits are
// themselves hits (they add every token below). Exit 1 on main is the
// detection proof, not a defect.
//
// Usage:
//   node scripts/audit-v1-absence.mjs <ref> [--repo <path>]
//       Sweep <ref>'s full history in the repo at --repo (default '.').
//   node scripts/audit-v1-absence.mjs --self-test
//       Build throwaway clean + dirty fixture repos in a temp dir; assert
//       exit 0 on the clean one, exit 1 on the dirty one.
//   node scripts/audit-v1-absence.mjs --list-tokens
//       Print the inventory (mode<TAB>token per line) — the seed's
//       content-ruleset authoring input (#80).
//
// Exit codes: 0 clean (or self-test pass) · 1 hits found (or self-test fail)
// · 2 usage/environment error.
//
// Token design rule — no generic stems. Kept content legitimately contains
// `appointment` (inert tables ship: packages/db schema + migrations,
// packages/types appointment schemas, db tests), `booking` (PRD/architecture
// prose), and `resend` (pnpm-lock.yaml history is not scrubbable). Every
// token below is an absent-cluster-specific string whose entire lineage must
// be absent from v1. Adding a token requires re-proving it against the kept
// set; `peso` and `bookableBranch*` stay shared by ruling and are
// deliberately NOT tokens.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// -S: literal occurrence-count pickaxe. -G: regex diff-line pickaxe, used
// where a word boundary is what makes the token precise — kept
// packages/types owns `createAppointmentSchema`, so only the standalone
// identifier is absence-significant. `\b` is GNU-regex: proven on this
// toolchain (git 2.43.0 / glibc) to match standalone uses and NOT match
// `createAppointmentSchema`. Portability fallback if `\b` ever fails:
// createAppointment([^A-Za-z0-9_]|$)
const TOKENS = [
  // — landing pure-booking cluster (spec § The v1 Absence Boundary) —
  { mode: 'S', token: 'appointmentQueries' },
  { mode: 'G', token: '\\bcreateAppointment\\b' },
  { mode: 'S', token: 'getAppointment' },
  { mode: 'S', token: 'CreateAppointmentArgs' },
  { mode: 'S', token: 'phDateTime' },
  { mode: 'S', token: 'lib/booking' },
  { mode: 'S', token: 'components/booking' },
  { mode: 'S', token: '/book' }, // /book, /booking/:id, routes/booking.$id imports
  // — api cluster, env shed included —
  { mode: 'S', token: 'routes/appointments' }, // v1.ts mount + api-client registration
  { mode: 'S', token: '/appointments' }, // URL path class (architecture.md describes it today)
  { mode: 'S', token: 'confirmation-email' },
  { mode: 'S', token: 'RESEND_API_KEY' },
  { mode: 'S', token: 'LANDING_ORIGIN' },
  { mode: 'S', token: "from 'resend'" }, // SDK import (repo quote style is single)
  { mode: 'S', token: '"resend":' }, // package.json dep line (lockfile shapes don't match)
  { mode: 'S', token: 'onboarding@resend.dev' }, // EMAIL_FROM sandbox address
];

function failUsage(message) {
  console.error(`error: ${message}`);
  console.error('usage: node scripts/audit-v1-absence.mjs <ref> [--repo <path>]');
  console.error('       node scripts/audit-v1-absence.mjs --self-test');
  console.error('       node scripts/audit-v1-absence.mjs --list-tokens');
  process.exit(2);
}

function git(repoPath, args) {
  const r = spawnSync('git', args, { cwd: repoPath, encoding: 'utf8' });
  if (r.error) failUsage(`git not runnable: ${r.error.message}`);
  if (r.status !== 0) {
    console.error(`git ${args.join(' ')} failed in ${repoPath} (exit ${r.status}):`);
    console.error(r.stderr);
    process.exit(2);
  }
  return r.stdout;
}

function sweepToken(repoPath, ref, t) {
  const flag = t.mode === 'S' ? `-S${t.token}` : `-G${t.token}`;
  const out = git(repoPath, ['log', '--format=%H%x09%s', flag, ref]);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf('\t');
      return { sha: line.slice(0, tab), subject: line.slice(tab + 1) };
    });
}

function audit(repoPath, ref, { quiet = false } = {}) {
  const lines = [];
  const say = (line) => {
    lines.push(line);
    if (!quiet) console.log(line);
  };
  const sha = git(repoPath, ['rev-parse', '--verify', `${ref}^{commit}`]).trim();
  say(`absence audit — repo: ${repoPath}`);
  say(
    `  ref: ${ref} → ${sha.slice(0, 7)} · tokens: ${TOKENS.length} · full history (git log -S/-G)`
  );
  const results = TOKENS.map((t) => ({ ...t, commits: sweepToken(repoPath, ref, t) }));
  const shas = new Set();
  for (const r of results) {
    if (r.commits.length === 0) continue;
    say(`FAIL ${r.mode}:${r.token} — ${r.commits.length} commit(s):`);
    for (const c of r.commits.slice(0, 5)) say(`  ${c.sha.slice(0, 7)} ${c.subject}`);
    if (r.commits.length > 5) say(`  … and ${r.commits.length - 5} more`);
    for (const c of r.commits) shas.add(c.sha);
  }
  const hitCount = results.filter((r) => r.commits.length > 0).length;
  if (hitCount > 0) {
    say(
      `AUDIT FAIL — ${hitCount}/${TOKENS.length} tokens with hits · ${shas.size} matching commits · exit 1`
    );
    return { code: 1, lines };
  }
  say(
    `AUDIT PASS — 0 hits across ${TOKENS.length} tokens · ${ref} (${sha.slice(0, 7)}) is booking-free · exit 0`
  );
  return { code: 0, lines };
}

function runGit(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.error?.message}`);
  }
  return r.stdout;
}

function makeFixture(parent, name, files) {
  const dir = join(parent, name);
  mkdirSync(dir, { recursive: true });
  runGit(dir, ['init', '--initial-branch=main']);
  runGit(dir, ['config', 'user.email', 'audit-selftest@example.com']);
  runGit(dir, ['config', 'user.name', 'audit-selftest']);
  for (const [path, content] of files) {
    writeFileSync(join(dir, path), content);
    runGit(dir, ['add', '.']);
    runGit(dir, ['commit', '-m', `add ${path}`]);
  }
  return dir;
}

function selfTest() {
  const CLEAN_FILES = [
    ['README.md', '# fixture studio\n\nPeso prices; the inert appointments tables ship.\n'],
    ['catalog.ts', "export const bookableBranchNames = ['north', 'south', 'east'];\n"],
    // The kept-types near-miss: must NOT trip the \bcreateAppointment\b token.
    ['appointment-types.ts', "export const createAppointmentSchema = 'inert-kept';\n"],
  ];
  const DIRTY_FILES = [
    // Two planted inventory tokens in one absent-cluster-shaped file.
    ['booking.ts', "export const appointmentQueries = {};\nexport const bookingRoute = '/book';\n"],
  ];

  const parent = mkdtempSync(join(tmpdir(), 'audit-v1-absence-'));
  try {
    const cleanDir = makeFixture(parent, 'clean', CLEAN_FILES);
    const dirtyDir = makeFixture(parent, 'dirty', [...CLEAN_FILES, ...DIRTY_FILES]);

    const clean = audit(cleanDir, 'main', { quiet: true });
    if (clean.code !== 0) {
      console.error('SELF-TEST FAIL — clean fixture flagged (false alarm):');
      console.error(clean.lines.join('\n'));
      process.exit(1);
    }
    const dirty = audit(dirtyDir, 'main', { quiet: true });
    if (dirty.code !== 1) {
      console.error(
        `SELF-TEST FAIL — dirty fixture exited ${dirty.code}, expected 1 (not detected):`
      );
      console.error(dirty.lines.join('\n'));
      process.exit(1);
    }
    if (!dirty.lines.join('\n').includes('appointmentQueries')) {
      console.error('SELF-TEST FAIL — dirty fixture report does not name the planted token:');
      console.error(dirty.lines.join('\n'));
      process.exit(1);
    }
    console.log('SELF-TEST PASS — clean fixture exit 0 (no false alarms, incl. the');
    console.log('createAppointmentSchema near-miss); dirty fixture exit 1 with');
    console.log('appointmentQueries named; fixtures discarded.');
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
}

const argv = process.argv.slice(2);
if (argv[0] === '--self-test') {
  selfTest();
  process.exit(0);
}
if (argv[0] === '--list-tokens') {
  for (const t of TOKENS) console.log(`${t.mode}\t${t.token}`);
  process.exit(0);
}
if (argv[0] === undefined || argv[0].startsWith('-')) failUsage('a ref argument is required');
const ref = argv[0];
let repo = '.';
for (let i = 1; i < argv.length; i += 2) {
  if (argv[i] !== '--repo' || argv[i + 1] === undefined)
    failUsage(`unexpected argument: ${argv[i]}`);
  repo = argv[i + 1];
}
process.exit(audit(repo, ref).code);
```

- [ ] **Step 3: Biome gate (scoped)**

```bash
pnpm exec biome check scripts/audit-v1-absence.mjs
```

Expected: exit 0, `Checked 1 file` with no findings — the block above is written biome-compliant (the five wrapped `say`/`console.error`/`if` lines are where the 100-column formatter demanded it). **Do NOT run blanket `pnpm fix:root`** — proven to rewrite tracked graphify-out/db files unrelated to this ticket (Global Constraints).

- [ ] **Step 4: `--list-tokens` smoke**

```bash
node scripts/audit-v1-absence.mjs --list-tokens
```

Expected: exactly 16 lines — `S<TAB>token` for the 15 literals and `G<TAB>\bcreateAppointment\b` for the regex entry — in the pinned order (first line `S	appointmentQueries`, last line `S	onboarding@resend.dev`).

- [ ] **Step 5: Detection proof on main (issue AC 2)**

```bash
node scripts/audit-v1-absence.mjs HEAD; echo "exit=$?"
```

Expected: `exit=1` — `AUDIT FAIL — 16/16 tokens with hits · 29 matching commits · exit 1` (probed at `b70314f`) — with these spot-asserts in the output:
- `FAIL S:appointmentQueries —` present, listing `b70314f` (the 2026-09-11 docs close-out carries the spec's inventory prose) among its commits;
- `FAIL G:\bcreateAppointment\b —` present (the `-G` entry is actually swept, not silently skipped);
- `FAIL S:RESEND_API_KEY —` present (the env-shed pair is covered).

- [ ] **Step 6: Usage-error contract**

```bash
node scripts/audit-v1-absence.mjs; echo "exit=$?"
node scripts/audit-v1-absence.mjs nosuchref; echo "exit=$?"
```

Expected: both `exit=2`; the first prints the usage block; the second prints git's `unknown revision` stderr through the exit-2 path.

- [ ] **Step 7: Commit**

```bash
git add scripts/audit-v1-absence.mjs docs/superpowers/plans/2026-09-11-78-export-audit-script.md
git commit -m "feat(scripts): #78 export audit script — -S/-G sweeps keyed to the v1 absence inventory"
```

Stage these two paths explicitly and nothing else — an unrelated untracked plan file from a parallel session may sit in `docs/superpowers/plans/` (`2026-09-11-edition-aware-pipelines.md`, issue #79's plan); it is not this ticket's.

### Task 2: The proofs — self-test, sabotage torture, `--repo` clone sweep

**Files:**
- None created or modified (the script landed complete in Task 1; this task exercises it and leaves `git status` untouched).

**Interfaces:**
- Consumes: Task 1's `--self-test` mode (fixtures + assertions) and `--repo` flag; Task 1's commit as the revert baseline.
- Produces: recorded proof outputs for the issue's AC 2 (detects on main — Task 1 Step 5) and AC 3 (zero hits on a booking-free fixture) plus the harness-sensitivity evidence; the executor quotes them in the completion report.

**Not here:** no code changes land in this task (the sabotage in Step 2 is temporary and reverted with proof in Step 3); no token edits; no new fixture varieties (the synthetic clean/dirty pair is the pinned fixture proof — a trial filter-repo output doesn't exist until #80 and would rightly carry the kept-doc leaks of pre-plan fact 7).

- [ ] **Step 1: Self-test — the no-false-alarm proof (issue AC 3)**

```bash
node scripts/audit-v1-absence.mjs --self-test; echo "exit=$?"
```

Expected: `exit=0` and the three-line `SELF-TEST PASS — clean fixture exit 0 (no false alarms, incl. the createAppointmentSchema near-miss); dirty fixture exit 1 with appointmentQueries named; fixtures discarded.` The clean fixture deliberately carries the staying near-miss tokens (`appointments`, `peso`, `bookableBranchNames`, `createAppointmentSchema`) — this is the proof that the inventory doesn't false-alarm on content v1 legitimately ships (probed live at plan time).

- [ ] **Step 2: Sabotage the harness — prove the self-test can fail**

Temporarily neutralize BOTH planted tokens in the dirty fixture (one Edit, exact strings) — from:

```js
    ['booking.ts', "export const appointmentQueries = {};\nexport const bookingRoute = '/book';\n"],
```

to:

```js
    ['booking.ts', "export const inoffensive = 1;\n"],
```

(The `TOKENS` array entry stays untouched — this sabotages the fixture, not the inventory.) Re-run:

```bash
node scripts/audit-v1-absence.mjs --self-test; echo "exit=$?"
```

Expected: `exit=1` with `SELF-TEST FAIL — dirty fixture exited 0, expected 1 (not detected):` — the harness genuinely exercises the sweeper end to end; a future regression to always-exit-0 cannot pass silently (probed live at plan time).

- [ ] **Step 3: Revert the sabotage exactly**

Apply the inverse Edit (the `inoffensive` line back to the `appointmentQueries`/`bookingRoute` line). Then:

```bash
node scripts/audit-v1-absence.mjs --self-test; echo "exit=$?"
git status --porcelain scripts/
```

Expected: `exit=0` (`SELF-TEST PASS` again) and `git status --porcelain scripts/` prints nothing — the file is byte-identical to Task 1's commit.

- [ ] **Step 4: `--repo` clone sweep — the M7 consumer path**

```bash
TMP=$(mktemp -d)
git clone -q . "$TMP/clone"
node scripts/audit-v1-absence.mjs HEAD --repo "$TMP/clone" | tail -1; echo "exit=${PIPESTATUS[0]}"
rm -rf "$TMP"
```

Expected: `AUDIT FAIL — 16/16 tokens with hits · 29 matching commits · exit 1` and `exit=1` — the clone is booking-laden main lineage, and the flag that M7's export command depends on works against a separate repo path (probed live at plan time; capture the exit through `PIPESTATUS` — a bare `$?` after the pipe reports the pipe's last command, a proven footgun).

No commit — Task 1's commit already carries everything this task exercised.

---

### Task 3: Consumer documentation — plan.md pointer + progress.md record (incl. the #80 flags)

**Files:**
- Modify: `docs/plan.md` (one line — the M7 Export-audit checkbox annotation)
- Modify: `docs/progress.md` (three edits: `_Last updated_` splice, one new "What Exists" bullet, one "Immediate Next Steps" amendment)

**Interfaces:**
- Consumes: the script's pinned usage block (Task 1) — the docs quote its commands verbatim.
- Produces: the durable record of the seed-input flags (pre-plan fact 7) — #80's executor reads them from `docs/progress.md`, since `.scratch/` doesn't survive a fresh clone.

**Not here:** no `docs/plan.md` checkbox is ticked (the M7 box stays unticked until M7's real run; the seed block is untouched); no AGENTS.md edit (rewritten client-safe at the seed); none of the fact-7 kept files is scrubbed on main (main keeps booking); no ADR (ADR-0015 already records the audit decision — this ticket adds an instrument, not a decision).

- [ ] **Step 1: Annotate the M7 Export-audit box in `docs/plan.md`**

Locate the line (`grep -n "Export audit:" docs/plan.md` — line 146 at plan time) and confirm it is an unticked checkbox. Replace:

```markdown
- [ ] Export audit: `git log -S/-G` token sweeps keyed to the absence inventory (spec § The v1 Absence Boundary) over the exported artifact — zero hits
```

with:

```markdown
- [ ] Export audit: `git log -S/-G` token sweeps keyed to the absence inventory (spec § The v1 Absence Boundary) over the exported artifact — zero hits (instrument: `scripts/audit-v1-absence.mjs`, #78 — `node scripts/audit-v1-absence.mjs HEAD --repo <export-clone>`; exit 0 is the gate)
```

The `- [ ]` stays `- [ ]` — pointer annotation only.

- [ ] **Step 2: Splice the `_Last updated_` line in `docs/progress.md`**

The first content line currently begins `_Last updated: 2026-09-11 (delivery-versions map close-out #74 — …`. Replace the leading `_Last updated: 2026-09-11 (delivery-versions map close-out #74 —` with:

```markdown
_Last updated: 2026-09-11 (export audit script #78 — `scripts/audit-v1-absence.mjs`, the main-only `git log -S`/`-G` sweep instrument keyed to the v1 absence inventory, self-tested + detection-proven; consumers: the seed lineage proof #80 and the M7 export audit. Prior 2026-09-11: delivery-versions map close-out #74 —
```

(the rest of the original line continues unchanged after the spliced-in text).

- [ ] **Step 3: Add the "What Exists" bullet with the #80 seed-input flags**

Insert as the FIRST bullet under `## What Exists` (immediately before `- **Delivery-versions editions restructure (2026-09-11, wayfinder map #67 close-out #74):**`), followed by a blank line:

```markdown
- **Export audit script (2026-09-11, #78):** `scripts/audit-v1-absence.mjs` — main-only owner tooling, never picked to `v1` (#80 must add the path to its invert-paths set). Sweeps a ref's full history (`git log -S` literals + one `-G` word-boundary regex) over 16 tokens keyed to spec § The v1 Absence Boundary; exit 0 clean / 1 hits / 2 usage-env error; `--self-test` re-runs the clean+dirty fixture proof (clean fixture carries the staying near-miss tokens — `appointments`, `peso`, `bookableBranchNames`, `createAppointmentSchema`); `--list-tokens` prints the inventory for #80's ruleset authoring. Token design rule: no generic stems — kept content legitimately contains `appointment` (inert tables/types/tests), `booking` (PRD/architecture prose), `resend` (pnpm-lock.yaml history). Running it against main's HEAD exits 1 BY DESIGN (the detection proof). **Seed-input flags for #80 — kept files carrying inventory tokens today; every one must be scrubbed by the seed's content rules or the audit rightly fails the lineage proof:** `docs/architecture.md` (`createAppointment` prose, `POST/GET /api/appointments`, the Resend step), `docs/tech-stack.md` (the Resend paragraph), `docs/PRD.md` (Resend lines), `docs/adr/0013` (`/booking/:id`), `apps/landing/src/routeTree.gen.ts` (historical `/booking/` entries — needs a content rule across history; codegen can't run inside filter-repo), `apps/api/wrangler.toml` + `apps/api/.dev.vars.example` (`RESEND_API_KEY`/`LANDING_ORIGIN`/`onboarding@resend.dev`), `apps/api/test/helpers/env.ts` (email pair), `apps/landing/src/lib/api-404.ts` (`phDateTime` JSDoc), `packages/db/src/client-transaction.test.ts` (`createAppointment` comment), `apps/landing/scripts/verify/*` (booking-laden harnesses; content-pages/packages-pages assert booking CTAs — remove-or-rewrite decision), `packages/api-client/src/index.ts` (appointments registration — the spec-ruled cut), `AGENTS.md` (client-safe rewrite — spec-ruled).
```

- [ ] **Step 4: Amend "Immediate Next Steps" item 1 in `docs/progress.md`**

In the `## Immediate Next Steps` section, item 1 ends `…and the design milestone's spec (#61, from map #55, with #60's landing-refactor grilling).` — append after it (same paragraph):

```markdown
 The seed's lineage-proof instrument already exists (`scripts/audit-v1-absence.mjs`, #78): run it over the rewritten `v1` — must exit 0 — before the one-way origin push, and its `--list-tokens` output is the absence-inventory re-verification input (issue #80 AC 1).
```

- [ ] **Step 5: Commit the docs**

```bash
git add docs/plan.md docs/progress.md
git commit -m "docs: #78 audit usage for the seed lineage proof + M7 export audit; record the #80 seed-input flags"
```

---

### Task 4: graphify, final gates, handoff

**Files:**
- Modify: `graphify-out/*` (the tracked graph's incremental diff from the new script)

**Interfaces:**
- Consumes: everything landed in Tasks 1–3.
- Produces: the closed-out working tree, ready for the owner to push/PR.

**Not here:** no `gh` commands at all (pushing, PR opening, and issue #78's acceptance boxes are the owner's); no commit to `main`; no blanket `pnpm fix:root`.

- [ ] **Step 1: Update the graph and commit its diff**

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): update after #78 export audit script"
```

Expected: graphify 0.9.34 runs AST-only; the diff touches graphify-out only. (`graphify-out/cache/last_query_stamp` may appear untracked — leave it untracked, do not stage it.)

- [ ] **Step 2: Final gates**

```bash
pnpm exec biome check scripts/audit-v1-absence.mjs; echo "biome=$?"
node scripts/audit-v1-absence.mjs --self-test; echo "selftest=$?"
node scripts/audit-v1-absence.mjs HEAD >/dev/null 2>&1; echo "detect=$?"
pnpm check 2>&1 | tail -2
```

Expected: `biome=0` · `selftest=0` · `detect=1` (main still correctly fails the audit) · `pnpm check` green with the baseline task count (33/33 per pre-plan fact 13).

- [ ] **Step 3: Working-tree audit**

```bash
git status --porcelain
git log --oneline main..HEAD
```

Expected: `git status` clean except the known untracked `graphify-out/cache/last_query_stamp` (and any parallel-session files — leave those alone); the log shows the three ticket commits (Task 1 script, Task 3 docs, Task 4 graphify).

- [ ] **Step 4: Stop — hand off to the owner**

Do not push, do not open a PR, do not comment on or close issue #78. Report to the owner: the three commits, the AC mapping (AC 1 instrument+CLI → Task 1; AC 2 detection on main → Task 1 Step 5; AC 3 booking-free fixture → Task 2 Steps 1–3; AC 4 consumer usage → script header + Task 3 docs; AC 5 `pnpm check` → Task 4 Step 2), and the reminder that the issue's acceptance boxes are theirs to tick.

