# Plan: #349 — Handover polish: sweep tool + the packages/scripts/e2e tree

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The em-dash sweep (spec #348 item 1) starts with its tool and the smallest area. A repo-root script with two modes — **check** (exit non-zero listing every author-written file still carrying an em dash, outside the excluded vendored-skills and generated-graph-output trees) and **fix** (the scripted default replacement of the spaced em dash with `, `, leaving en dashes and numeric ranges untouched) — then runs fix over the packages, scripts, and e2e trees. The eight product/visitor-visible strings in those trees are hand-rewritten for natural prose (never spaced-hyphen replacements), their pin suites and the three downstream echo sites update in lockstep, and `pnpm check` stays green with every floor unmoved.

**Architecture:** One new plain-Node script (`scripts/em-dash-sweep.mjs`, the `measure-theme-pairs.mjs`/`audit-v1-absence.mjs` house pattern: zero imports beyond `node:*`, exit-code contract 0/1/2, a `--self-test` mode that builds throwaway fixture git repos). Enumeration is `git ls-files` (so `.git` and every gitignored path — including the untracked `.superpowers/` — are excluded by construction) plus two explicit prefix exclusions: `graphify-out/` (generated) and `.agents/skills/` (vendored). Binary files are skipped by a NUL-byte sniff. Check mode scans decoded text for the character U+2014 in any position; fix mode rewrites exactly one shape, the spaced dash (space, U+2014, space) to `, `. Everything else an em dash can be in this repo's prose (unspaced, line-end continuations, decorative comment separators) is enumerated as hand-fix classes, not scripted. The script's own source is em-dash-free (escapes only) so the gate never flags its own tool.

**Tech Stack:** zero new dependencies; plain Node ESM script; root `package.json` gains one entry; vitest floors unchanged everywhere (no tests added — the sweep edits pin literals in place); Playwright `--list` for e2e compile sanity; pnpm + Turborepo; `gh` CLI.

**Spec:** [GitHub issue #349](https://github.com/jeius/sevendays/issues/349), authoritatively settled by its parent spec — [issue #348](https://github.com/jeius/sevendays/issues/348), repo copy `docs/specs/2026-11-22-pre-handover-polish-spec.md` (item 1: scope, method, exclusions, en-dash law, no-DB-pass ruling Q5; Testing Decisions: the em-dash gate script + copy-pinning suites updated in place).

## Branch law

- Branch **`em-dash-sweep`** off current `main` (`c266b6a` at plan time, 2026-11-22). All four tasks commit there; one PR to `main` titled `Handover polish: sweep tool + the packages/scripts/e2e tree (#349)` (Closes #349).
- The sibling sweep tickets run on their own branches after this one: #350 (apps), #351/#352 (docs), #353 (root files). #354 (the CI gate) lands **last**, after every sweep — until then, the script's unscoped check is *expected* to fail on the unswept trees; each sweep ticket's verdict is the **scoped** check (`check <its trees>`).

## Controller pre-flight (live-run, record before Task 1)

- **Floors (must not move anywhere in this ticket):** api 34 files / 482 passed + 3 skipped; types 18 files / 197 passed; api-client 5 files / 45; landing 19 files / 152; admin 34 files / 364; db 4 files / 22 passed + 8 skipped. Live-run each and record; any drift means something merged — reconcile before starting.
- **Dash census:** `git grep '—' -- packages scripts e2e | wc -l` → **568 dash lines across 104 files** (measured 2026-11-22). Re-run and record. Drift means something merged — reconcile.
- **Hand-class census:** 10 line-end dashes (the `—$` class: `e2e/smoke/production.spec.ts:51`, `e2e/visual/redesign.spec.ts:56,124,349,402`, `packages/db/scripts/db-state.mjs:1,31`, `packages/db/scripts/probe-pooler-transaction.mjs:1`, `packages/db/scripts/rehearsal-fixture.mjs:2`, `packages/db/src/schema/addon-services.ts:3`); 24 decorative separator lines across 7 files (`e2e/README.md`, `e2e/visual/redesign.spec.ts`, `packages/api-client/test/loopback.test.ts`, `packages/types/src/reset-email.ts`, `packages/ui/src/tokens.css`, `scripts/audit-v1-absence.mjs`, `scripts/measure-theme-pairs.mjs`); 5 double-space dash lines (`packages/db/scripts/verify-appointment-row.mjs` ×3, `packages/db/scripts/verify-seed.ts` ×1, `scripts/measure-theme-pairs.mjs` ×1).
- **En-dash inventory:** exactly **2** en dashes repo-wide-in-scope, both in `packages/types/src/testimonial-submission.ts` lines 8–9 (`quote 20–600 chars`, `person 2–80`). They must survive every task byte-identical.
- **Test DB:** `docker start sevendays-test-db-5433` if down (the db suite's live leg + the final `pnpm check`).

## Scope fences

**In scope:** `scripts/em-dash-sweep.mjs` (new) + one root `package.json` entry; the sweep of `packages/**` (including `packages/db/scripts/`, `packages/config/AGENTS.md`, `packages/db/README.md`, `packages/db/.env.example`), root `scripts/**` (including the `scripts/seed-v1/*.txt` comment lines), and `e2e/**` (the 3 text files; the 16 PNG baselines are binary-skipped); Task 2's nine named echo/pin edits (the #331 blast-radius precedent: mechanical, zero-behavior app-file edits where a changed constant is quoted); `docs/progress.md` + graphify at the end.

**NOT here (siblings / out of scope):**

- **#350 — the apps tree.** All remaining apps prose, UI copy, placeholder glyphs, and `apps/api/scripts/` stay there. The ONLY app-file edits in this plan are Task 2's three echo repairs (`apps/landing/scripts/verify/content-pages.mjs`, `apps/landing/scripts/verify/cms-reflection.mjs`, `apps/landing/src/routes/share-your-story.tsx`), each a byte-consistent mirror of a string Task 2 changes.
- **#351/#352 — docs**, **#353 — root files** (AGENTS.md floors are NOT touched: no test count moves), **#354 — CI wiring** (the `check` script entry in CI, the both-ways demonstration).
- **Live DB rows (Q5):** catalog.ts's two changed strings change fresh seeds only; the `site_settings` row is untouched; no migration, no data pass.
- **En dashes** — preserved everywhere, by script construction and by the fix-up rules.
- **Git history** — tree-state only, no rewrite.
- **`pnpm-lock.yaml`** (zero em dashes, verified 2026-11-22 — untouched), **`.superpowers/`** (untracked — excluded by construction), **`skills-lock.json`** (root file, #353's tree).
- **`scripts/seed-v1/*.txt` RULE lines** — every `x==>y` line is untouchable sweep input (ADR-0015 seed mechanics). Verified 2026-11-22: no rule line carries the spaced dash; only `#` comment lines change. Task 3 re-verifies after the batch.
- **Visual baselines** — `toHaveScreenshot` takes explicit `${name}-${theme}.png` names (`e2e/visual/redesign.spec.ts:418`); test titles do not feed snapshot basenames, so sweeping titles cannot rename a baseline. No re-baselining anywhere in this ticket.
- **No ADR** — spec item 1 invents no architecture (the gate script is the `measure-theme-pairs` precedent's port).

## Global Constraints

- **The eight hand-rewritten strings (use exactly; do not paraphrase).** PROPOSED at plan time: the owner copy question went unanswered 2026-11-22 (AskUserQuestion returned no answers), so these pins await the owner's ratification at the execution review — the PR body carries the flag. If the owner edits any string at review, re-run Task 2's gates and the echo repairs with the owner's wording before merge.
  - `SITE_SETTINGS_DEFAULTS.homeDescription` → `'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios. Booked in minutes, delivered in seven days.'`
  - `SITE_SETTINGS_DEFAULTS.packagesDescription` → `'From graduation portraits to family sessions: every package with its price, duration, and inclusions at a glance. Tap a package for the full details.'`
  - `SITE_SETTINGS_DEFAULTS.branchesDescription` → `'Three studios, one standard of light. Walk-ins are welcome where flagged; everywhere else, call ahead or book online.'`
  - `SITE_SETTINGS_DEFAULTS.servicesDescription` → `'Photo recovery, printing, portraits, and framing: studio services you can book at the branches listed on each card.'`
  - `SITE_SETTINGS_DEFAULTS.aboutDescription` → `'The studio behind the work: our story, our portfolio, and the people who sat for us.'`
  - `TESTIMONIAL_SUBMISSION_ACCEPTED.message` → `'Thank you! Your story is on its way.'`
  - print-size seed `8R` description → `'8R print: nominally the same physical size as 8x10; both appear in the price list. Client to confirm at seed review whether they merge.'`
  - seed `Basic Package` description → `'Entry graduation portrait package: 1 framed 8x10 Toga plus wallet-size prints.'`
- **Method law:** product/visitor-visible strings are hand-rewritten (never the scripted comma); developer-facing strings, comments, docs prose, and test titles take fix mode + the fix-up pass. The three echo sites stay byte-consistent with the constants they mirror.
- **The tool's own source is em-dash-free by construction:** the character appears only as `\u2014` escapes; the gate must not flag its own file (Task 1 proves it).
- **fix mode rewrites exactly one shape:** `\u0020\u2014\u0020` → `', '`. Unspaced dashes, line-end dashes, decorative separators, and ` , `-class artifacts are hand classes (Task 3). En dashes are never touched.
- **Dist consumers:** `packages/types` is consumed from `dist/` — after editing its source, `pnpm --filter @sevendays/types build` before the api-client/db suites and any dependent typecheck (`packages/api-client/test/mock-api.ts` imports `TESTIMONIAL_SUBMISSION_ACCEPTED` from the types dist, line 7).
- **Test DB:** db-suite runs and the final `pnpm check` prefix `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test` (start the standalone container first if down: `docker start sevendays-test-db-5433`). Port 5432 belongs to another project — never fall back.
- **Per-task gates:** the touched packages' `test -- --run` AND `typecheck` both green before each task's commit. Final gate: `pnpm fix` then `pnpm check` green at the repo root (with `TEST_DATABASE_URL` set). Do not commit code that fails it for the packages/apps touched.
- **Floors do not move.** Every suite's file/test count is identical before and after (string edits edit pins in place; the script is outside every vitest project). A count that differs at any gate means something else drifted: stop and reconcile.
- **Biome covers `scripts/` and `e2e/` from the root** (`biome.json` `files:{}` = everything not gitignored): the new script passes `pnpm lint:root`; any format drift heals in Task 4's `pnpm fix`.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #349. Prefixes: `feat(scripts):` (Task 1), `chore(copy):` (Task 2), `chore(sweep):` (Task 3), `docs(progress):` + `chore(graphify):` (Task 4).
- Run from the repo root (the branch checkout's root). The script reads `git ls-files` from cwd.

---

## Task 1 — the tool: `scripts/em-dash-sweep.mjs` + the package.json entry

**Files:**
- Create: `scripts/em-dash-sweep.mjs` (full source below — write it byte-exact)
- Modify: `package.json` (one scripts entry)

**Interfaces:**
- Produces (what Tasks 2–4, siblings #350–#353, and #354 consume): `node scripts/em-dash-sweep.mjs check [paths...]` (exit 0 clean / 1 hits), `node scripts/em-dash-sweep.mjs fix <paths...>` (exit 0 clean / 1 leftovers / 2 no-paths), `node scripts/em-dash-sweep.mjs --self-test` (exit 0 pass / 1 fail), and the `pnpm em-dash <args>` alias. Unscoped check stays the CI gate's invocation (#354); scoped checks are the per-ticket verdicts.

- [ ] **Step 1: Create the branch.** From `main` at `c266b6a`: `git checkout -b em-dash-sweep`. Confirm the pre-flight census numbers on this branch before writing anything.

- [ ] **Step 2: Write the script.** Create `scripts/em-dash-sweep.mjs` with exactly this source (every comment and string is em-dash-free — the character exists only as escapes; keep it that way):

```js
#!/usr/bin/env node
// em-dash-sweep.mjs — the em-dash gate and sweep tool (Handover polish #349,
// spec #348 item 1). Two modes plus a self-test, over the tracked working
// tree (git ls-files):
//
//   node scripts/em-dash-sweep.mjs check [paths...]
//       List every tracked text file (outside the exclusions) still
//       carrying an em dash (U+2014), as path:line plus the offending
//       line. Exit 1 when any remain, 0 when clean. With paths, the scan
//       scopes to those subtrees (each sweep ticket's verdict); with none
//       it covers the whole repo (the CI gate's invocation, ticket #354).
//
//   node scripts/em-dash-sweep.mjs fix <paths...>
//       Replace every SPACED em dash (space, U+2014, space) with ", " in
//       the given trees, print per-file replacement counts, then report
//       every remaining em dash: unspaced dashes, line-end dashes, and
//       decorative comment separators are hand work, never scripted.
//       Exit 0 when the scanned trees are clean, 1 when leftovers remain.
//       Write mode: explicit paths required, no whole-repo default.
//
//   node scripts/em-dash-sweep.mjs --self-test
//       Build throwaway clean and dirty fixture repos in a temp dir and
//       assert the contracts above (exclusions held, en dashes preserved,
//       binaries skipped, fix replaces exactly the spaced form, leftovers
//       reported). Exit 0 on pass, 1 on fail.
//
// Excluded by construction: .git (git ls-files never lists it),
// graphify-out/ (generated; the next graph update re-derives it from the
// cleaned sources), and .agents/skills/ (vendored third-party skill
// content). En dashes (U+2013) are correct typography (numeric ranges) and
// are never touched. Binary files (NUL-byte sniff) are skipped, never
// flagged.
//
// This file's own source is em-dash-free by construction: the character is
// spelled \u2014 in escapes only, so the gate never flags its own tool.
//
// Exit codes: 0 clean (or self-test pass) | 1 em dashes found or leftovers
// (or self-test fail) | 2 usage or environment error.
// Run from the repo root. Plain Node, zero imports beyond node:*.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const EM = '\u2014';
// The only pattern fix mode rewrites is the spaced dash (space, U+2014,
// space) to ", ". Every other shape an em dash takes (unspaced, line-end,
// decorative separator) is left to the fix-up pass.
const SPACED_EM = /\u0020\u2014\u0020/g;
const EXCLUDED_PREFIXES = ['graphify-out/', '.agents/skills/'];

const SCRIPT = fileURLToPath(import.meta.url);

function runGit(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.error?.message}`);
  }
  return r.stdout;
}

function listFiles(paths) {
  const args = ['ls-files', '-z', ...(paths.length ? ['--', ...paths] : [])];
  return runGit('.', args)
    .split('\0')
    .filter(Boolean)
    .filter((file) => !EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)));
}

// path:line + the trimmed offending line, for every em dash in a text file.
function scan(files) {
  const hits = [];
  for (const file of files) {
    const buf = readFileSync(file);
    if (buf.includes(0)) continue; // binary sniff: skip, never flag
    const lines = buf.toString('utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(EM)) {
        hits.push({ file, line: i + 1, text: lines[i].trim() });
      }
    }
  }
  return hits;
}

function printHits(hits) {
  for (const hit of hits) console.log(`${hit.file}:${hit.line}: ${hit.text}`);
}

function check(paths) {
  const hits = scan(listFiles(paths));
  if (hits.length > 0) {
    const files = new Set(hits.map((hit) => hit.file));
    console.log(`EM DASH: ${hits.length} line(s) in ${files.size} file(s) still carry U+2014:`);
    printHits(hits);
    process.exit(1);
  }
  console.log(`EM DASH: clean, 0 hits (${paths.length ? paths.join(', ') : 'repo-wide'})`);
  process.exit(0);
}

function fix(paths) {
  if (paths.length === 0) {
    console.error('fix requires explicit paths (a write mode has no whole-repo default).');
    console.error('  node scripts/em-dash-sweep.mjs fix <paths...>');
    process.exit(2);
  }
  const files = listFiles(paths);
  let replaced = 0;
  let touched = 0;
  for (const file of files) {
    const buf = readFileSync(file);
    if (buf.includes(0)) continue;
    const text = buf.toString('utf8');
    const count = text.match(SPACED_EM)?.length ?? 0;
    if (count === 0) continue;
    writeFileSync(file, text.replace(SPACED_EM, ', '));
    replaced += count;
    touched += 1;
    console.log(`fixed ${count}: ${file}`);
  }
  console.log(`FIX: ${replaced} replacement(s) across ${touched} file(s)`);
  const leftovers = scan(files);
  if (leftovers.length > 0) {
    console.log(
      `EM DASH: ${leftovers.length} leftover line(s) need hands (unspaced, line-end, decorative):`,
    );
    printHits(leftovers);
    process.exit(1);
  }
  console.log('FIX: trees clean, exit 0');
  process.exit(0);
}

function runMode(cwd, args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function makeFixture(parent, name, files) {
  const dir = join(parent, name);
  mkdirSync(dir, { recursive: true });
  runGit(dir, ['init', '--initial-branch=main']);
  runGit(dir, ['config', 'user.email', 'em-dash-selftest@example.com']);
  runGit(dir, ['config', 'user.name', 'em-dash-selftest']);
  for (const [path, content] of files) {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    runGit(dir, ['add', '.']);
    runGit(dir, ['commit', '-m', `add ${path}`]);
  }
  return dir;
}

function selfTest() {
  // Clean fixture: an en dash survives, a binary is skipped, and both
  // exclusion prefixes hold even though their fixtures carry em dashes.
  const cleanFiles = [
    ['prose.ts', '// numeric ranges keep the en dash: 20\u2013600 chars.\nexport const ok = 1;\n'],
    ['logo.bin', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xe2, 0x80, 0x94])],
    ['graphify-out/wiki.md', '# generated output\nstill \u2014 dashed\n'],
    ['.agents/skills/x/SKILL.md', 'vendored \u2014 dashed\n'],
  ];
  const parent = mkdtempSync(join(tmpdir(), 'em-dash-selftest-'));
  try {
    const cleanDir = makeFixture(parent, 'clean', cleanFiles);
    const clean = runMode(cleanDir, ['check']);
    if (clean.code !== 0) {
      console.error('SELF-TEST FAIL: clean fixture flagged (false alarm):');
      console.error(clean.out);
      process.exit(1);
    }

    const dirtyDir = makeFixture(parent, 'dirty', [
      ...cleanFiles,
      ['dirty.ts', 'const a = 1; // spaced \u2014 dash\n'],
    ]);
    const dirtyCheck = runMode(dirtyDir, ['check']);
    if (dirtyCheck.code !== 1 || !dirtyCheck.out.includes('dirty.ts')) {
      console.error('SELF-TEST FAIL: dirty fixture not flagged with the file named:');
      console.error(dirtyCheck.out);
      process.exit(1);
    }
    const dirtyFix = runMode(dirtyDir, ['fix', '.']);
    if (dirtyFix.code !== 0) {
      console.error('SELF-TEST FAIL: fix on the spaced-only fixture did not come clean:');
      console.error(dirtyFix.out);
      process.exit(1);
    }
    const fixed = readFileSync(join(dirtyDir, 'dirty.ts'), 'utf8');
    if (fixed !== 'const a = 1; // spaced, dash\n') {
      console.error(`SELF-TEST FAIL: fix wrote the wrong bytes: ${JSON.stringify(fixed)}`);
      process.exit(1);
    }
    if (readFileSync(join(dirtyDir, 'prose.ts'), 'utf8').includes(EM)) {
      console.error('SELF-TEST FAIL: an en dash was rewritten (must never happen).');
      process.exit(1);
    }

    // Line-end dashes are the hand class: fix must NOT claim clean.
    const edgeDir = makeFixture(parent, 'edge', [
      ...cleanFiles,
      ['edge.ts', '// a trailing thought \u2014\nconst b = 2;\n'],
    ]);
    const edgeFix = runMode(edgeDir, ['fix', '.']);
    if (edgeFix.code !== 1 || !edgeFix.out.includes('edge.ts')) {
      console.error('SELF-TEST FAIL: the line-end leftover was not reported:');
      console.error(edgeFix.out);
      process.exit(1);
    }

    const noPaths = runMode(process.cwd(), ['fix']);
    if (noPaths.code !== 2) {
      console.error(`SELF-TEST FAIL: fix without paths exited ${noPaths.code}, expected 2.`);
      process.exit(1);
    }

    console.log('SELF-TEST PASS: exclusions held, en dash preserved, binary skipped,');
    console.log('spaced dash replaced byte-exact, line-end leftover reported,');
    console.log('pathless fix exits 2; fixtures discarded.');
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
}

const argv = process.argv.slice(2);
if (argv[0] === '--self-test') {
  selfTest();
  process.exit(0);
}
if (argv[0] === 'check') {
  check(argv.slice(1));
}
if (argv[0] === 'fix') {
  fix(argv.slice(1));
}
console.error(
  'usage: node scripts/em-dash-sweep.mjs check [paths...] | fix <paths...> | --self-test',
);
process.exit(2);
```

- [ ] **Step 3: Add the package.json entry.** In the root `package.json` scripts block, insert one line between `check` and `clean` (line 19–20):

Before:
```json
    "check": "turbo run lint format typecheck test",
    "clean": "turbo run clean && rm -rf node_modules"
```

After:
```json
    "check": "turbo run lint format typecheck test",
    "em-dash": "node scripts/em-dash-sweep.mjs",
    "clean": "turbo run clean && rm -rf node_modules"
```

- [ ] **Step 4: Prove the tool.** Run, from the repo root:

```bash
node scripts/em-dash-sweep.mjs --self-test
```
Expected: the `SELF-TEST PASS` block (exclusions held, en dash preserved, binary skipped, spaced dash replaced byte-exact, line-end leftover reported, pathless fix exits 2), exit 0.

```bash
node scripts/em-dash-sweep.mjs check scripts
```
Expected: `EM DASH: clean, 0 hits (scripts)` — **the tool must not flag its own file**. If it lists `scripts/em-dash-sweep.mjs`, a literal dash leaked into the source; fix the escape and re-run.

```bash
pnpm em-dash check packages
```
Expected: exit 1 listing the packages dash lines (the census files) — the alias resolves and the scoped check works.

- [ ] **Step 5: Biome gate.** `pnpm lint:root` green. Then `pnpm exec biome format scripts/em-dash-sweep.mjs` — if it reports formatting drift, apply `pnpm exec biome format --write scripts/em-dash-sweep.mjs` and re-run Step 4's three commands (formatting must not change behavior).

- [ ] **Step 6: Commit.** `git add scripts/em-dash-sweep.mjs package.json && git commit -m "feat(scripts): the em-dash sweep tool with check, fix, and self-test (#349)"`

---

## Task 2 — the hand-rewritten strings, their pins, and the echo repairs

Product/visitor-visible copy is hand-rewritten FIRST so fix mode (Task 3) never touches it. Every changed constant updates its quoting sites in the same commit: the pin suites (types, api-client) and the three downstream echo sites (the #331 mechanical-blast-radius precedent — app files, zero behavior, lockstep strings only). The packages/db strings are not compared by `verify-seed.ts` (it checks names, prices, frames, attires, branches, and privilege descriptions — none of which change; verified 2026-11-22), so no verify-seed coupling exists.

**Files:**
- Modify: `packages/types/src/site-settings.ts` (5 strings + one rider comment)
- Modify: `packages/types/src/testimonial-submission.ts` (1 string)
- Modify: `packages/db/scripts/catalog.ts` (2 strings)
- Modify: `packages/types/src/site-settings.test.ts` (5 pin literals)
- Modify: `packages/types/src/testimonial-submission.test.ts` (1 pin literal)
- Modify: `packages/api-client/test/loopback.test.ts` (2 pin literals)
- Modify: `apps/landing/scripts/verify/content-pages.mjs` (1 echo literal)
- Modify: `apps/landing/scripts/verify/cms-reflection.mjs` (1 echo block: comment quote + assertion)
- Modify: `apps/landing/src/routes/share-your-story.tsx` (1 echo line)

**Interfaces:**
- Consumes: Task 1's gates.
- Produces: the de-dashed runtime strings (types dist), pins that quote them, and echo sites byte-consistent with the constants. The strings ride the read chain to the landing wherever the `site_settings` fields are unsaved, so the next deploy serves the new copy wherever those fields are null on the wire (the live row itself is untouched, per Q5).

- [ ] **Step 1: The five defaults strings + rider.** In `packages/types/src/site-settings.ts`:

Before (lines 103–119):
```ts
export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  brandName: 'Sevendays',
  brandTagline: 'Photography',
  logoImageUrl: null,
  homeTitle: 'Three branches. One standard of light.',
  homeDescription:
    'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.',
  packagesTitle: 'Packages',
  packagesDescription:
    'From graduation portraits to family sessions — every package with its price, duration, and inclusions at a glance. Tap a package for the full details.',
  branchesTitle: 'Branches',
  branchesDescription:
    'Three studios, one standard of light. Walk-ins are welcome where flagged — everywhere else, call ahead or book online.',
  servicesTitle: 'Services',
  servicesDescription:
    'Photo recovery, printing, portraits, and framing — studio services you can book at the branches listed on each card.',
  aboutTitle: 'About',
  // Ratified verbatim at the #224 variants round (2026-10-21, "all goods" —
  // no retune); the round's evidence carries the captured drives.
  aboutDescription:
    'The studio behind the work — our story, our portfolio, and the people who sat for us.',
```

After (string literals only — the em dashes in the comment lines above stay for Task 3's mechanical sweep):
```ts
export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  brandName: 'Sevendays',
  brandTagline: 'Photography',
  logoImageUrl: null,
  homeTitle: 'Three branches. One standard of light.',
  homeDescription:
    'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios. Booked in minutes, delivered in seven days.',
  packagesTitle: 'Packages',
  packagesDescription:
    'From graduation portraits to family sessions: every package with its price, duration, and inclusions at a glance. Tap a package for the full details.',
  branchesTitle: 'Branches',
  branchesDescription:
    'Three studios, one standard of light. Walk-ins are welcome where flagged; everywhere else, call ahead or book online.',
  servicesTitle: 'Services',
  servicesDescription:
    'Photo recovery, printing, portraits, and framing: studio services you can book at the branches listed on each card.',
  aboutTitle: 'About',
  // Ratified verbatim at the #224 variants round (2026-10-21, "all goods" —
  // no retune); the round's evidence carries the captured drives.
  aboutDescription:
    'The studio behind the work: our story, our portfolio, and the people who sat for us.',
```

Rider (append to the defaults' doc comment):

Before (lines 96–97):
```ts
// exactly today's page. This object IS the fallback the chrome renders
// while the row is born-empty.
```

After:
```ts
// exactly today's page. This object IS the fallback the chrome renders
// while the row is born-empty. Strings de-dashed 2026-11-22 (#349, spec
// #348 item 1, hand-rewritten); the live settings row keeps its pre-sweep
// copy per the round's no-DB-pass ruling.
```

- [ ] **Step 2: The testimonial success message.** In `packages/types/src/testimonial-submission.ts` (line 63):

Before:
```ts
export const TESTIMONIAL_SUBMISSION_ACCEPTED = {
  message: 'Thank you — your story is on its way.',
} as const;
```

After:
```ts
export const TESTIMONIAL_SUBMISSION_ACCEPTED = {
  message: 'Thank you! Your story is on its way.',
} as const;
```

- [ ] **Step 3: The two seed strings.** In `packages/db/scripts/catalog.ts`:

Before (lines 14–18):
```ts
  {
    code: '8R',
    description:
      '8R print — nominally the same physical size as 8x10; both appear in the price list. Client to confirm at seed review whether they merge.',
  },
```

After:
```ts
  {
    code: '8R',
    description:
      '8R print: nominally the same physical size as 8x10; both appear in the price list. Client to confirm at seed review whether they merge.',
  },
```

Before (line 103):
```ts
    description: 'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
```

After:
```ts
    description: 'Entry graduation portrait package: 1 framed 8x10 Toga plus wallet-size prints.',
```

- [ ] **Step 4: The pins.** In `packages/types/src/site-settings.test.ts` (the defaults pin, lines 109–121), the five literals become the new strings:

Before:
```ts
      homeDescription:
        'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.',
      packagesTitle: 'Packages',
      packagesDescription:
        'From graduation portraits to family sessions — every package with its price, duration, and inclusions at a glance. Tap a package for the full details.',
      branchesTitle: 'Branches',
      branchesDescription:
        'Three studios, one standard of light. Walk-ins are welcome where flagged — everywhere else, call ahead or book online.',
      servicesTitle: 'Services',
      servicesDescription:
        'Photo recovery, printing, portraits, and framing — studio services you can book at the branches listed on each card.',
      aboutTitle: 'About',
      aboutDescription:
        'The studio behind the work — our story, our portfolio, and the people who sat for us.',
```

After:
```ts
      homeDescription:
        'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios. Booked in minutes, delivered in seven days.',
      packagesTitle: 'Packages',
      packagesDescription:
        'From graduation portraits to family sessions: every package with its price, duration, and inclusions at a glance. Tap a package for the full details.',
      branchesTitle: 'Branches',
      branchesDescription:
        'Three studios, one standard of light. Walk-ins are welcome where flagged; everywhere else, call ahead or book online.',
      servicesTitle: 'Services',
      servicesDescription:
        'Photo recovery, printing, portraits, and framing: studio services you can book at the branches listed on each card.',
      aboutTitle: 'About',
      aboutDescription:
        'The studio behind the work: our story, our portfolio, and the people who sat for us.',
```

In `packages/types/src/testimonial-submission.test.ts` (line 104):

Before:
```ts
    expect(TESTIMONIAL_SUBMISSION_ACCEPTED).toEqual({
      message: 'Thank you — your story is on its way.',
    });
```

After:
```ts
    expect(TESTIMONIAL_SUBMISSION_ACCEPTED).toEqual({
      message: 'Thank you! Your story is on its way.',
    });
```

In `packages/api-client/test/loopback.test.ts` (lines 264 and 274 — both pin the constant's value through the loopback; `mock-api.ts` serves the imported constant itself and needs no edit):

Before:
```ts
  expect(accepted).toEqual({ message: 'Thank you — your story is on its way.' });
```
```ts
  expect(discarded).toEqual({ message: 'Thank you — your story is on its way.' });
```

After:
```ts
  expect(accepted).toEqual({ message: 'Thank you! Your story is on its way.' });
```
```ts
  expect(discarded).toEqual({ message: 'Thank you! Your story is on its way.' });
```

- [ ] **Step 5: The three echo repairs (app files, mechanical lockstep, zero behavior).**

In `apps/landing/scripts/verify/content-pages.mjs` (the expected-hero-blurb fallback must equal the served default when the field is null on the wire):

Before (lines 101–103):
```ts
  const expectedBlurb =
    settings.homeDescription ??
    'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.';
```

After:
```ts
  const expectedBlurb =
    settings.homeDescription ??
    'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios. Booked in minutes, delivered in seven days.';
```

In `apps/landing/scripts/verify/cms-reflection.mjs` (the harness re-derives the fixed message per its no-import rule, so the quote and the assertion move together):

Before (lines 411–414):
```ts
    // The generic 201 is a FIXED message — packages/types'
    // TESTIMONIAL_SUBMISSION_ACCEPTED ('Thank you — your story is on its
    // way.'), re-derived here per the harness's no-import rule.
    check(
      'step8: the public POST answers the generic 201 with NO row echo',
      posted.status === 201 &&
        postedBody.message === 'Thank you — your story is on its way.' &&
```

After (the assertion literal and the comment's quote change; the first comment line's dash stays for #350's mechanical sweep):
```ts
    // The generic 201 is a FIXED message — packages/types'
    // TESTIMONIAL_SUBMISSION_ACCEPTED ('Thank you! Your story is on its
    // way.'), re-derived here per the harness's no-import rule.
    check(
      'step8: the public POST answers the generic 201 with NO row echo',
      posted.status === 201 &&
        postedBody.message === 'Thank you! Your story is on its way.' &&
```

In `apps/landing/src/routes/share-your-story.tsx` (the success panel's rendered sentence — line 93, the same sentence as the constant, kept byte-consistent):

Before:
```tsx
            Thank you — your story is on its way.
```

After:
```tsx
            Thank you! Your story is on its way.
```

- [ ] **Step 6: No other quoting site exists.** Verify the blast radius closed:

```bash
git grep -n 'Thank you —\|studios — booked\|where flagged —\|framing — studio\|work — our story' -- packages apps
```
Expected: zero hits. Any hit is a missed pin/echo: fix it in this task (same rules) before committing.

- [ ] **Step 7: Gates.** In order (types first, dist before its consumers):

```bash
pnpm --filter @sevendays/types build
pnpm --filter @sevendays/types test -- --run && pnpm --filter @sevendays/types typecheck
pnpm --filter @sevendays/api-client test -- --run && pnpm --filter @sevendays/api-client typecheck
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/db test -- --run && pnpm --filter @sevendays/db typecheck
```
Expected: types 18 files / 197 passed; api-client 5 files / 45; db 4 files / 22 passed + 8 skipped. No count moved.

- [ ] **Step 8: Commit.** `git add -A && git commit -m "chore(copy): the hand-rewritten strings, their pins, and the echo repairs (#349)"` (stage the named files; `git status` must show nothing else).

---

## Task 3 — the mechanical sweep + the fix-up pass

Fix mode runs over the three trees; the hand classes it deliberately leaves (line-end dashes, decorative separators, double-space dashes, comma-splice artifacts) get the fix-up pass until the scoped check is green. The eight Task 2 strings are already clean, so fix mode never touches product copy.

**Files:** every dash-carrying file under `packages/**`, `scripts/**`, `e2e/**` per the census (104 files / 568 dash lines at plan time, minus Task 2's already-clean ones). No app file, no doc, no root file.

**Interfaces:**
- Consumes: Task 1's tool, Task 2's hand rewrites.
- Produces: `node scripts/em-dash-sweep.mjs check packages scripts e2e` exit 0 — this ticket's acceptance verdict, and the same command #354 wires repo-wide once every sweep lands.

- [ ] **Step 1: Run the batch.** From the repo root:

```bash
node scripts/em-dash-sweep.mjs fix packages scripts e2e
```
Expected: per-file `fixed N:` lines (≈550 replacements across ≈100 files; Task 2's nine files appear only where comments still carry dashes), then the leftover list — the line-end dashes and decorative trailing dashes — and **exit 1** (leftovers need hands; that is the contract, not a failure). Record the replacement total against the census: replacements + hand-class lines should account for all 568 census lines (Task 2 removed 8 string dashes from it). A big gap means the census drifted: reconcile before continuing.

- [ ] **Step 2: The fix-up pass — artifact greps first.** The mechanical comma lands in three ugly shapes; find and rewrite each:

```bash
git grep -nE '^//, |^\s*\*, |/\*, ' -- packages scripts e2e
```
Comment-opener artifacts (from `// — foo` / `* — foo` / `/* — foo` decorative separators): **drop the dash decoration entirely** — the line becomes plain comment prose (`// foo`). For the paired closing form (`... rendered color) — */`), drop that dash too (`... rendered color) */`). Worked example, `packages/ui/src/tokens.css`:

Before:
```css
  /* — Fixed brand points (#90; hexes are canonical, oklch conversions
       round-trip verified to the identical rendered color) — */
```
After:
```css
  /* Fixed brand points (#90; hexes are canonical, oklch conversions
       round-trip verified to the identical rendered color) */
```
And `scripts/measure-theme-pairs.mjs`:

Before:
```js
// — oklch <-> sRGB (Björn Ottosson's OKLab matrices; sRGB gamut clamped) —
```
After:
```js
// oklch <-> sRGB (Björn Ottosson's OKLab matrices; sRGB gamut clamped)
```

```bash
git grep -n ' , ' -- packages scripts e2e
```
Space-comma artifacts (from the double-space dashes, e.g. the usage headers in `packages/db/scripts/verify-appointment-row.mjs` and `scripts/measure-theme-pairs.mjs`): rewrite as a **colon** where the dash introduced a usage/definition (`confirm <appointmentId>: assert the row + add-on join rows against`), else a clean `, `.

```bash
git grep -nE '—$' -- packages scripts e2e
```
Line-end continuation dashes (the pre-flight census names all 10): merge the two comment lines, or split with a period/colon — whichever reads naturally. Example shape, `packages/db/scripts/db-state.mjs:1`:

Before:
```js
// Read-only database-state probe. Prints record counts and table names only —
```
After (merged with its continuation line):
```js
// Read-only database-state probe. Prints record counts and table names only;
```
(the executor picks merge vs. split per site; the only law is: no dash, no comma splice, natural prose)

- [ ] **Step 3: The e2e failure-string upgrades.** Fix mode comma-izes the diagnostic strings; where a comma splice reads wrong, upgrade to a colon. The ~15 sentinel/failure strings in `e2e/visual/redesign.spec.ts` and `e2e/smoke/production.spec.ts` follow one rule — a dash that introduced an explanation becomes `: `:

Worked example, `e2e/visual/redesign.spec.ts:172`:

Before:
```ts
      return "the featured plates strip is absent ([data-strip='featured']) — the packages read never rendered";
```
After fix mode:
```ts
      return "the featured plates strip is absent ([data-strip='featured']), the packages read never rendered";
```
After the fix-up pass:
```ts
      return "the featured plates strip is absent ([data-strip='featured']): the packages read never rendered";
```
(`e2e/README.md` prose and the vitest/playwright test titles take the mechanical comma as-is unless it reads wrong.)

- [ ] **Step 4: The seed-v1 rule lines survived.** Verify the sweep never touched a rule:

```bash
git diff -- scripts/seed-v1/ | grep '^[+-]' | grep -v '^[+-][+-]' | grep -vE '^[+-]#'
```
Expected: empty output (only `#` comment lines changed in `scripts/seed-v1/*.txt`).

- [ ] **Step 5: The scoped check is green.**

```bash
node scripts/em-dash-sweep.mjs check packages scripts e2e
```
Expected: `EM DASH: clean, 0 hits (packages, scripts, e2e)`, exit 0. This is the ticket's acceptance verdict.

- [ ] **Step 6: En dashes preserved.**

```bash
git grep -c '–' -- packages/types/src/testimonial-submission.ts
git grep -l '–' -- packages scripts e2e | wc -l
```
Expected: `packages/types/src/testimonial-submission.ts:2` (the `20–600` / `2–80` bounds) and exactly 1 file. The tool's own self-test already proves it never rewrites an en dash; this confirms the tree.

- [ ] **Step 7: e2e compiles.** The sweep touched spec text; prove the suites still collect:

```bash
E2E_BASE_URL=http://127.0.0.1:9 E2E_API_URL=http://127.0.0.1:9 E2E_SMOKE_STAFF_EMAIL=probe@example.com E2E_SMOKE_STAFF_PASSWORD=probe pnpm exec playwright test --list
```
Expected: both suites list (smoke + visual) with no compile/collection error. `--list` needs no browser. (The baselines are untouched: explicit snapshot names per the scope fence.)

- [ ] **Step 8: Lint.** `pnpm lint:root` green (biome covers `scripts/` and `e2e/` from the root). Format drift, if any, heals in Task 4's `pnpm fix`.

- [ ] **Step 9: Commit.** `git add -A && git commit -m "chore(sweep): packages, scripts, and e2e em-dash-free (#349)"` (`git status` first — only swept files, no app/doc/root strays).

---

## Task 4 — the full gate + the records

**Files:**
- Modify: `docs/progress.md` (one entry, de-dashed prose)
- Generated: `graphify-out/**` (via `graphify update .`)

- [ ] **Step 1: Heal formatting.** `pnpm fix` (turbo fix + `fix:root` biome write) — the sweep shortened lines by one character per replacement; any biome format drift lands here.

- [ ] **Step 2: The full gate.** With the test container up:

```bash
docker start sevendays-test-db-5433 2>/dev/null || true
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
```
Expected: green across lint + format + typecheck + test for every workspace member, with every floor **identical** to the pre-flight record: api 34 files / 482 passed + 3 skipped; types 18 files / 197; api-client 5 files / 45; landing 19 files / 152; admin 34 files / 364; db 4 files / 22 passed + 8 skipped. Any count drift: stop and reconcile (nothing in this plan adds or removes a test).

- [ ] **Step 3: The progress.md entry.** Append at the end of `docs/progress.md` (matching the house entry format; the heading deliberately carries no em dash — this text must survive the gate):

```md
## 2026-11-22 #349: the em-dash sweep tool + the packages/scripts/e2e tree de-dashed

Handover polish item 1 (spec #348) first leg: `scripts/em-dash-sweep.mjs` landed as the repo's em-dash gate and sweep tool (`pnpm em-dash check|fix|self-test`; git-tracked text files only, `graphify-out/` and `.agents/skills/` excluded by construction, binaries and en dashes never touched; the spaced em dash is the only scripted replacement, the unspaced, line-end, and decorative shapes stay hand work, proven by the tool's `--self-test` fixtures). The packages, scripts, and e2e trees are em-dash-free (104 files / 568 dash lines swept at the 2026-11-22 census). The eight product- and visitor-visible strings in those trees were hand-rewritten instead of mechanically replaced (the five SITE_SETTINGS_DEFAULTS strings, the testimonial success message, and the two seed-copy strings), with their pin suites and the three echo sites updated in lockstep (the api-client loopback pins, the landing verify scripts' expected strings, the share-your-story success panel); the pins await the owner's wording ratification at the PR review. Floors unchanged across all six suites; en dashes preserved (the 20–600 / 2–80 bounds). The apps, docs, and root sweeps are #350 to #353; the CI gate wiring is #354, which lands last.
```

- [ ] **Step 4: Graphify.** `graphify update .` (AST-only, no API cost) for the new script + package.json entry.

- [ ] **Step 5: Commit + PR.**

```bash
git add docs/progress.md && git commit -m "docs(progress): the #349 sweep-tool line"
git add graphify-out && git commit -m "chore(graphify): graph update for #349"
git push -u origin em-dash-sweep
gh pr create --title "Handover polish: sweep tool + the packages/scripts/e2e tree (#349)" \
  --body-file <(cat <<'EOF'
Closes #349. Spec #348 item 1, first leg.

- `scripts/em-dash-sweep.mjs`: the em-dash gate + sweep tool (check / fix / --self-test; `graphify-out/` + `.agents/skills/` excluded by construction; binaries and en dashes never touched; the spaced em dash is the only scripted replacement). The unscoped check is #354's CI invocation and is expected to fail repo-wide until the sibling sweeps land; this ticket's verdict is the scoped `check packages scripts e2e`, green.
- packages, scripts, and e2e swept (104 files / 568 dash lines at the census); hand classes fixed up (line-end continuations, decorative separators, double-space usage dashes, failure-string colons).
- The 8 product/visitor-visible strings hand-rewritten with pins + 3 echo sites in lockstep.

**Owner flag:** the 8 strings are the PROPOSED hand-rewrites pinned in the plan (docs/superpowers/plans/2026-11-22-349-em-dash-sweep-tool-and-trees.md); the copy question went unanswered at plan time, so the wording awaits ratification here. Edit any string and the pins + echoes re-run before merge.

Floors unchanged: api 34 files / 482+3sk, types 18 / 197, api-client 5 / 45, landing 19 / 152, admin 34 / 364, db 4 / 22+8sk. En dashes preserved. Live DB rows untouched (Q5).
EOF
)
```
The PR body carries the owner flag verbatim; #349 closes on merge per the house pattern, with the acceptance criteria ticked in the issue at close.

---

## Self-review record (written after the final append, 2026-11-22)

- Placeholder sweep: no `<!-- APPEND:` anchors remain; no TODO/placeholder markers; every code block is a byte-exact before/after read from the tree at plan time (recon probes 2026-11-22).
- Step-checkbox count: Task 1 has 6, Task 2 has 8, Task 3 has 9, Task 4 has 5 (28 total, all `- [ ] **Step`).
- Cross-task names: `em-dash-sweep.mjs`, `check`/`fix`/`--self-test`, `pnpm em-dash`, the 8 strings, and the 9 Task 2 files are spelled identically everywhere they appear; Task 3's artifact greps match the shapes Task 1's fix mode can produce (`//, `, `*, `, `/*, `, ` , `, `—$`).
- Counts re-derived from the probes, not from memory: 568 lines / 104 files (git grep), 10 line-end, 24 decorative, 5 double-space, 2 en dashes, 8 strings, 3 echo files, 6 suites' floors.
- Mocked-boundary check: no test mocks added; the pin edits quote the constants' real values (mock-api.ts serves the imported constant — verified line 7/329).
- The unanswered AskUserQuestion is disclosed in three places (Global Constraints, the progress entry, the PR body) rather than silently assumed.
