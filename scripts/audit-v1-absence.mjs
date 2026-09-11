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
//
// Re-derivation (2026-09-11, #80's re-verification): the original
// `/appointments` and `/book` literals false-hit the ruled-kept set — the db
// schema barrel imports './appointments.js' (inert tables ship verbatim) and
// the landing bookable module imports './bookable-branches' (chips stay, no
// internal rename). Tokens must be absent-cluster-specific against the KEPT
// set, so each split into a quoted-code form and a URL/prose form:
// '/appointments' + '/api/v1/appointments', '/book' + '/booking'. Both
// halves were re-proven on main's history (hits) and against the kept set
// (zero) before landing; the self-test fixtures pin the near-misses.

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
  { mode: 'S', token: "'/book" }, // quoted route literals (to='/book'); ./bookable-… can't match
  { mode: 'S', token: '/booking' }, // prose/route forms (/booking/:id, {ORIGIN}/booking/{id})
  // — api cluster, env shed included —
  { mode: 'S', token: 'routes/appointments' }, // v1.ts mount + api-client registration
  { mode: 'S', token: "'/appointments" }, // quoted mount literals (.route('/appointments', …))
  { mode: 'S', token: '/api/v1/appointments' }, // URL/prose forms (architecture.md, span names)
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
    // The ruled-kept near-misses (found by #80's re-verification): the db
    // schema barrel's inert-table import and the bookable module's import
    // path must NOT trip the split tokens.
    ['db-schema.ts', "export * from './appointments.js';\n"],
    ['bookable.ts', "import { bookableBranchNames } from './bookable-branches';\n"],
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
    console.log('createAppointmentSchema + schema-import + bookable-import');
    console.log('near-misses); dirty fixture exit 1 with');
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
