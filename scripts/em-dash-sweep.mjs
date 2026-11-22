#!/usr/bin/env node
// em-dash-sweep.mjs \u2014 the em-dash gate and sweep tool (Handover polish #349,
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
      `EM DASH: ${leftovers.length} leftover line(s) need hands (unspaced, line-end, decorative):`
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
    [
      'logo.bin',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xe2, 0x80, 0x94]),
    ],
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
  'usage: node scripts/em-dash-sweep.mjs check [paths...] | fix <paths...> | --self-test'
);
process.exit(2);
