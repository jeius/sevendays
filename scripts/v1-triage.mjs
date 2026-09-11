// Owner tooling — main only. Never cherry-picked to `v1` (it lives under
// `scripts/`, a path the seed removed; the pick discipline skips it).
//
// The per-PR triage classifier for the v1 pick discipline (issue #82;
// ADR-0015 decision 2; runbook docs/agents/v1-picks.md). Given a commit on
// main, it classifies every path the commit touched as MAIN-ONLY or v1-path
// and prints the path-level verdict:
//   SKIP  — every touched path is main-only (nothing can enter v1)
//   PICK  — no touched path is main-only (candidate; content rules still apply)
//   SPLIT — both kinds (pick the v1-paths, drop the main-only ones)
//
// MAIN-ONLY = the seed's invert-paths list (scripts/seed-v1/paths.txt, read
// live so the ruleset of record drives the verdict) + the booking-cluster
// globs below (new files inside an absent cluster never existed on v1, so a
// path-existence check cannot catch them) + the docs/client main-only fence.
//
// Usage:
//   node scripts/v1-triage.mjs <commit> [--repo <path>]
// Exit codes: 0 verdict printed · 2 usage/environment error.
// The verdict is path-level only — apply the runbook's content rules before
// executing a PICK or SPLIT.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CLUSTER = [
  /^apps\/landing\/src\/routes\/book/, // book.tsx, booking.$id.tsx, any future book*
  /^apps\/landing\/src\/lib\/booking/, // booking.ts, booking-read.ts (+tests); bookable-* never matches
  /^apps\/landing\/src\/components\/booking(\/|$)/,
  /^apps\/api\/src\/routes\/appointments/,
  /^apps\/api\/src\/services\/(appointments|confirmation-email)/,
  /^apps\/api\/test\/appointments/,
  /^packages\/api-client\/src\/routes\/appointments/,
  /^docs\/client(\/|$)/, // main-only fence (spec § Docs) — post-dates the seed, so not on paths.txt
];

function failUsage(message) {
  console.error(`error: ${message}`);
  console.error('usage: node scripts/v1-triage.mjs <commit> [--repo <path>]');
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

function loadMainOnlyPrefixes() {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, 'seed-v1', 'paths.txt'), 'utf8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function isMainOnly(path, prefixes) {
  if (prefixes.some((p) => path === p || path.startsWith(`${p}/`))) return true;
  return CLUSTER.some((re) => re.test(path));
}

function main(argv) {
  let repoPath = '.';
  let commit;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo') {
      repoPath = argv[++i];
      if (!repoPath) failUsage('--repo needs a path');
    } else if (commit === undefined) commit = argv[i];
    else failUsage(`unexpected argument: ${argv[i]}`);
  }
  if (!commit) failUsage('a commit is required');

  const prefixes = loadMainOnlyPrefixes();
  const sha = git(repoPath, ['rev-parse', '--verify', `${commit}^{commit}`]).trim();
  const subject = git(repoPath, ['log', '-1', '--format=%s', sha]).trim();
  const paths = git(repoPath, ['show', '--name-only', '--format=', sha])
    .split('\n')
    .filter(Boolean);

  console.log(`v1 triage — ${sha.slice(0, 7)} ${subject}`);
  let mainOnly = 0;
  let v1 = 0;
  for (const p of paths) {
    if (isMainOnly(p, prefixes)) {
      mainOnly++;
      console.log(`  MAIN-ONLY  ${p}`);
    } else {
      v1++;
      console.log(`  v1-path    ${p}`);
    }
  }
  if (paths.length === 0) console.log('  (no paths — empty commit)');

  let verdict;
  if (v1 === 0) verdict = `SKIP — all ${mainOnly} path(s) main-only`;
  else if (mainOnly === 0)
    verdict = `PICK — ${v1} v1-path(s); apply the content rules before picking`;
  else verdict = `SPLIT — ${v1} v1-path(s) + ${mainOnly} main-only; drop the main-only paths`;
  console.log(`VERDICT ${verdict}`);
}

main(process.argv.slice(2));
