// Pre-flight gate for M1.3: verifies the gitignored env files exist, parse,
// and are actually gitignored. Prints status lines and ports only — never a
// connection string. Exit 0 = proceed; exit 1 = user action required.
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dbDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(dbDir, '..', '..', '..');
const dbEnvPath = path.join(repoDir, 'packages', 'db', '.env');
const devVarsPath = path.join(repoDir, 'apps', 'api', '.dev.vars');

let failed = false;

function parseEnvFile(filePath) {
  const out = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function checkPgUrl(label, value, expectedPort) {
  if (!value) {
    console.log(`[FAIL] ${label}: missing`);
    return false;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    console.log(`[FAIL] ${label}: not a parseable URL`);
    return false;
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    console.log(`[FAIL] ${label}: protocol must be postgres:// or postgresql://`);
    return false;
  }
  const port = parsed.port || '5432';
  const portOk = expectedPort === null || port === String(expectedPort);
  console.log(`[ok] ${label}: present, postgres URL, port ${port}${portOk ? '' : ` (expected ${expectedPort})`}`);
  return portOk;
}

// 1. packages/db/.env → DATABASE_MIGRATE_URL (session-mode pooler, 5432)
if (!existsSync(dbEnvPath)) {
  console.log(`[FAIL] ${dbEnvPath} does not exist — USER: paste the Session-mode pooler URL (port 5432) into this file as DATABASE_MIGRATE_URL=<url>. Never paste it into chat.`);
  failed = true;
} else {
  const dbEnv = parseEnvFile(dbEnvPath);
  const ok = checkPgUrl('packages/db/.env DATABASE_MIGRATE_URL', dbEnv.DATABASE_MIGRATE_URL, 5432);
  if (dbEnv.DATABASE_MIGRATE_URL && !ok) {
    console.log('       NOTE: the direct host (db.<ref>.supabase.co) is IPv6-only and unreachable from this machine — use the SESSION-MODE POOLER URL (port 5432) from Project Settings → Database → Connection pooling.');
  }
  if (!ok) failed = true;
}

// 2. apps/api/.dev.vars → DATABASE_URL (transaction pooler, 6543)
if (!existsSync(devVarsPath)) {
  console.log(`[FAIL] ${devVarsPath} does not exist — USER: paste the transaction-pooled URL (port 6543) into this file as DATABASE_URL=<url>.`);
  failed = true;
} else {
  const devVars = parseEnvFile(devVarsPath);
  if (!checkPgUrl('apps/api/.dev.vars DATABASE_URL', devVars.DATABASE_URL, null)) failed = true;
}

// 3. Both files must be gitignored
for (const p of [dbEnvPath, devVarsPath]) {
  try {
    execSync(`git check-ignore -q "${p}"`, { cwd: repoDir, stdio: 'ignore' });
    console.log(`[ok] gitignored: ${path.relative(repoDir, p)}`);
  } catch {
    console.log(`[FAIL] NOT gitignored: ${path.relative(repoDir, p)} — add it to .gitignore before proceeding`);
    failed = true;
  }
}

console.log(failed ? 'GATE: BLOCKED — fix the [FAIL] lines above (user actions), then rerun.' : 'GATE: PASS — live-DB tasks may proceed.');
process.exit(failed ? 1 : 0);