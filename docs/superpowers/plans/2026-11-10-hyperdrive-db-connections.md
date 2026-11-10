# Hyperdrive for the API and admin workers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. Secrets law: the DATABASE_URL value never appears in command text, output, evidence files, or commits.

**Goal:** Stop the free-plan CPU-limit kills that 500 every landing route: the API and admin workers stop paying a full per-request TLS handshake to Supavisor by dialing through a Hyperdrive binding instead, on both editions.

**Architecture:** `[[hyperdrive]]` binding `HYPERDRIVE` in both workers' configs, pointing at the same origin URL as today's `DATABASE_URL` (transaction pooler, port 6543 — reasoning, ADR-documented as such; query caching disabled so a CMS save reaches the next page load). Code prefers the binding, falls back to `DATABASE_URL`, so local dev, vitest, and rollback keep working untouched. The per-request postgres client stays (ADR-0011's workerd law still holds); only the dial moves.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs). zod ^4.5.1 (v4 — `z.url()` native), @cloudflare/workers-types ^5 (`Hyperdrive.connectionString` is a `readonly string` — grep-verified in the installed package), postgres ^3.4.9 `prepare: false` (unchanged), wrangler 4.127.1 (its `hyperdrive create --help` carries `--caching-disabled` — verified this session). Hyperdrive free tier (~100k commands/day, daily reset) — no Workers plan change.

**Spec:** issue [#260](https://github.com/jeius/sevendays/issues/260) (the P0 record: measurements, causal chain, owner rulings). Owner rulings: Hyperdrive on the free plan; admin worker included; v1 gets its own config now (owner-assisted). The 2026-11-09 P0 thread is the spec; this plan argues from it.

**Measured basis:** fresh connect+query = 7.3–12.4 ms CPU (Node, this machine); reused connection = 0.3–0.8 ms; free cap 10 ms. Kills observed live in `wrangler tail`. That the dial is the whole cause is inference — the deploy tests it, with a stop condition below.

## Global Constraints

- Branch `feat/hyperdrive-db` off current main; commit style `type(scope): … (#260)`. Zero dependency changes. Never print or commit the DB URL; never commit secrets. Tick boxes `- [✅]` (this file included).
- Every find/replace below must match exactly once at execution time; a ≠1 match means the file drifted — stop and reconcile.
- Gates per touched workspace: `pnpm --filter <ws> fix` (must rewrite nothing) → `test -- --run` → `typecheck` → `build`; final `pnpm check && pnpm build`. The e2e suite never joins `pnpm check`. `graphify update .` at close (Task 8).
- Evidence dir `.superpowers/sdd/2026-11-10-hyperdrive/` (gitignored): command outputs, timings, tail captures. The wrangler-flags check and the same-database guard are already saved there (both green: `--caching-disabled` present; direct active-count 11 == API 11, Basic Package row identical — the first guard run's "mismatch" was the isActive trim rule, not a different DB).

### Still unverified (checks; each stops the plan if it fails)

1. ~~`wrangler hyperdrive create --help` shows `--caching-disabled`~~ — **verified green** (evidence: check-wrangler-flags.txt).
2. ~~Same-database guard~~ — **verified green** (evidence: check-same-db.json).
3. Origin = port 6543: reasoning, not doc-confirmed. Recorded in the ADR as reasoning.
4. CI's `CLOUDFLARE_API_TOKEN` may deploy a worker carrying a Hyperdrive binding. The teaser deploy is the probe; failure = owner fixes token scopes.
5. `wrangler dev` boots with the binding present (may demand a local connection string — handled in Task 5).

### Proven at execution (Task 1)

- Hyperdrive config `sevendays-db` created on the teaser account: **id `ce6e772397454dbd9806219b83585f4a`**, `--caching-disabled`, evidence: create-output.txt (credential-free). The id is committed into wrangler configs (ids are not secrets).

## File Structure

```text
apps/api/
  wrangler.toml                    # T2 — [[hyperdrive]] block + secrets comment
  src/env.ts                       # T2 — DATABASE_URL optional + HYPERDRIVE binding, lead comment
  src/routes/v1.ts                 # T2 — acquireDb prefers the binding
  src/services/db.ts               # T2 — widened signature, new throw message, docstring
  src/env.test.ts                  # T3 — the missing-URL test replaced (+2), stub-parse test (+1)
  test/error-seam.test.ts          # T3 — +2: binding-wins, both-absent TypeError
  test/helpers/env.ts              # UNCHANGED (the fallback-path law)
apps/admin/
  wrangler.jsonc                   # T4 — "hyperdrive" binding
  src/lib/api.server.ts            # T4 — capture HYPERDRIVE in the existing cf block + resolveDbUrl()
  src/lib/auth.functions.ts        # T4 — 2 call sites
  src/lib/users.functions.ts       # T4 — 9 call sites
  src/routes/api/auth/$.ts         # T4 — 2 call sites
  src/lib/audit/audit.functions.ts # T4 — gate site + readDbUrl delegates
  src/lib/metrics/metrics.functions.ts # T4 — gate site + 2 handlers feed readMetricsEnv
  src/lib/db-url.server.test.ts    # T4 — new lib-seam test
docs/adr/0024-*.md  docs/adr/0007  docs/adr/0011  # T8
docs/tech-stack.md  docs/progress.md  AGENTS.md   # T8
docs/agents/v1-picks.md  graphify-out/            # T8
```

---

### Task 1: Checks, config creation, branch, plan file

- [✅] **Step 1: the five checks** — 1 + 2 green (evidence saved); 3 recorded as reasoning (ADR); 4 + 5 ride Tasks 5–6.
- [✅] **Step 2: config created** — `sevendays-db`, id `ce6e772397454dbd9806219b83585f4a`, caching disabled; URL never echoed (output redacted end-to-end).
- [✅] **Step 3: [#260](https://github.com/jeius/sevendays/issues/260) filed** — all commits reference it.
- [✅] **Step 4: branch + this plan file.**

### Task 2: API code

**Files:** `apps/api/wrangler.toml`, `src/env.ts`, `src/routes/v1.ts`, `src/services/db.ts`

**Not here:** any test file (Task 3); `packages/db` (client untouched); CI (the DATABASE_URL sync steps stay as the fallback).

^- [✅] **Step 1: wrangler.toml** — after the `[images]` block:

```toml
# The DB connection path (ADR-0024): Hyperdrive fronts the Supavisor
# transaction pooler (the DATABASE_URL origin) so the per-request postgres
# dial is a local handoff instead of a full TLS handshake — the free-plan
# 10ms CPU cliff (2026-11-09 incident). Query caching is DISABLED on this
# config (read-your-writes: a CMS save must reach the next page load).
# DATABASE_URL stays synced by CI as the code-level fallback (dev, vitest,
# break-glass rollback).
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "ce6e772397454dbd9806219b83585f4a"
```

^- [✅] **Step 2: env.ts** — replace `  DATABASE_URL: z.url(),` with:

```ts
  DATABASE_URL: z.url().optional(),
  HYPERDRIVE: z.custom<Hyperdrive>(
    (v) =>
      v !== null &&
      typeof v === 'object' &&
      typeof (v as { connectionString?: unknown }).connectionString === 'string' &&
      ((v as { connectionString: string }).connectionString.trim() !== '')
  ).optional(),
```

If `Hyperdrive` is not ambient (R2Bucket et al. are), the pinned fallback is `import type { Hyperdrive } from '@cloudflare/workers-types';`. Replace the lead comment (lines 3–9) with:

```ts
// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed var fails loudly here
// instead of surfacing as a mid-request failure. The db connection rides the
// HYPERDRIVE binding when present (ADR-0024: Hyperdrive fronts Supavisor so
// the per-request dial stops costing a full TLS handshake — the free-plan CPU
// cliff, 2026-11-09 incident); DATABASE_URL stays as the pooled-connection
// fallback (ADR-0007) for local dev, vitest, and break-glass rollback. The
// email pair (issue #47) has no fallback by design — the API_URL posture: a
// deploy without either var fails every /api/v1 request (acquireDb parses the
// full schema) rather than silently dropping confirmation emails.
```

^- [✅] **Step 3: v1.ts** — replace the `acquireDb` body (comment's first sentence updated to name the two sources; the uniform-500 law unchanged):

```ts
export const acquireDb = async (c: import('hono').Context<ApiEnv>, next: () => Promise<void>) => {
  const env = parseEnv(c.env);
  c.set('db', createApiDb(env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL));
  await next();
};
```

^- [✅] **Step 4: services/db.ts** — widen the signature to `connectionString: string | undefined`; replace the throw message with:

```ts
    'No database source — set the HYPERDRIVE binding (production, ADR-0024) or DATABASE_URL (fallback, ADR-0007). Neither is present.'
```

Docstring rewritten: per-request client unchanged (workerd I/O scoping); the dial moved to Hyperdrive; the previously-unreachable TypeError path is now live (pinned by Task 3's test).

- [✅] **Step 5:** gates may fail only in the ways Task 3 fixes — commit after Task 3's suite is green (single commit for Tasks 2+3).

### Task 3: API tests

**Files:** `apps/api/src/env.test.ts`, `apps/api/test/error-seam.test.ts`

**Not here:** `test/helpers/env.ts` stays UNCHANGED — every existing suite keeps the fallback path, so the dead-port overrides in error-seam (:55), application-log (:99), sentry-capture (:24, :38) keep meaning what they say.

^- [✅] **Step 1: env.test.ts** — replace the `'rejects a missing DATABASE_URL'` test (lines 59–61) with:

```ts
  it('parses without DATABASE_URL when HYPERDRIVE carries the connection (ADR-0024)', () => {
    const env = parseEnv({
      HYPERDRIVE: { connectionString: 'postgres://u:p@host:5432/db' },
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
      CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
      MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
      MEDIA_BUCKET: {},
      IMAGES: {},
      RATE_LIMITER: {},
    });
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it('parses with neither db source present (the acquisition throw owns the loud failure)', () => {
    const env = parseEnv({
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
      CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
      MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
      MEDIA_BUCKET: {},
      IMAGES: {},
      RATE_LIMITER: {},
    });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.HYPERDRIVE).toBeUndefined();
  });
```

The empty / non-string / malformed DATABASE_URL tests stay (still throw /DATABASE_URL/ — optional() only admits undefined). Add one stub-parse test in the media describe's style:

```ts
  it('parses a HYPERDRIVE binding stub (the connectionString shape, ADR-0024)', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
      ...mediaVars(),
      MEDIA_BUCKET: {},
      IMAGES: {},
      RATE_LIMITER: {},
      HYPERDRIVE: { connectionString: 'postgres://u:p@host:5432/db' },
    });
    expect(env.HYPERDRIVE).toEqual({ connectionString: 'postgres://u:p@host:5432/db' });
  });
```

^- [✅] **Step 2: error-seam.test.ts** — append to the uniform-500 describe:

```ts
  it('prefers the HYPERDRIVE binding over DATABASE_URL (ADR-0024)', async () => {
    // The binding points at the LIVE test db while DATABASE_URL names a dead
    // port: the read succeeds only if the binding won.
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
      HYPERDRIVE: { connectionString: url },
    });
    expect(res.status).toBe(200);
  });

  it('returns uniform 500 JSON when neither db source is present (acquisition throws)', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const env = { ...testEnv(url) } as Record<string, unknown>;
    delete env.DATABASE_URL;
    const res = await app.request('/api/v1/branches', undefined, env);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    const errorLines = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'error');
    expect(errorLines).toHaveLength(1);
    expect(errorLines[0]?.name).toBe('TypeError'); // createApiDb's own throw — parseEnv passed
    expect(errorLines[0]?.route).toBe('/api/v1/branches');
  });
```

- [✅] **Step 3:** full api suite green; floor = the previous run's counts + 4 net (three replaces/additions in env.test.ts net +2, error-seam +2 — exact totals recorded from the run output, never from this plan's arithmetic). Commit Tasks 2+3:

```bash
git add apps/api
git commit -m "feat(api): the db connection rides the HYPERDRIVE binding with the DATABASE_URL fallback (#260)"
```

### Task 4: admin code

**Files:** `apps/admin/wrangler.jsonc`, `src/lib/api.server.ts`, 15 call sites across four files, `src/lib/audit/audit.functions.ts`, `src/lib/metrics/metrics.functions.ts`, new `src/lib/db-url.server.test.ts`

**Not here:** `auth.ts` + `auth.config.ts` untouched (config purity — the BetterAuth CLI loads them via jiti outside any bundler); `readMetricsEnv`'s signature and its four test files untouched.

^- [✅] **Step 1: wrangler.jsonc** — add beside `services`:

```jsonc
  // ADR-0024: Hyperdrive fronts Supavisor (same origin as DATABASE_URL;
  // caching disabled — read-your-writes). DATABASE_URL stays the fallback.
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "ce6e772397454dbd9806219b83585f4a" }],
```

- [✅] **Step 2: api.server.ts** — declare the capture beside `serviceBindingFetch`:

```ts
// ADR-0024: the HYPERDRIVE binding's connection string, captured with the
// same gate + plain-Node fallback as the service binding above. Plain data,
// so module-scope capture is safe (ADR-0011 still binds the postgres CLIENT
// per request — only the dial moved).
let hyperdriveConnectionString: string | undefined;
```

inside the existing try block, after the service-binding capture:

```ts
    const hyperdrive = cf.env.HYPERDRIVE as { connectionString?: unknown } | undefined;
    if (
      typeof hyperdrive?.connectionString === 'string' &&
      hyperdrive.connectionString.trim() !== ''
    ) {
      hyperdriveConnectionString = hyperdrive.connectionString;
    }
```

and the exported resolver (server-only importers only):

```ts
// The db connection (ADR-0024): Hyperdrive fronts Supavisor — the same
// free-plan CPU cliff the API hit (2026-11-09). Dev and vitest keep the
// process.env path (the same DEV gate as the service binding above).
export function resolveDbUrl(): string | undefined {
  const fromEnv = process.env.DATABASE_URL;
  const trimmed = typeof fromEnv === 'string' ? fromEnv.trim() : '';
  return hyperdriveConnectionString ?? (trimmed !== '' ? trimmed : undefined);
}
```

Update the stale importer note in the header comment (the auth route already imports this file; so do auth.functions, users.functions, audit.functions, metrics.functions for `resolveDbUrl`).

- [✅] **Step 3: the 15 call sites** (grep gate: `grep -rn 'createAuth(' apps/admin/src` = 17 matches — 1 definition + 1 CLI entry stay): bare `createAuth()` → `createAuth(resolveDbUrl() ?? undefined)` in auth.functions.ts ×2 (16, 23), users.functions.ts ×9 (75, 95, 125, 144, 180, 195, 214, 233, 252), audit.functions.ts:31, metrics.functions.ts:23; the auth route's two (24, 26) become `createAuth(resolveDbUrl() ?? undefined, makeSendResetPassword(getInternalFetchDeps()))`. Each site adds the `resolveDbUrl` import alongside the existing `createAuth` import (`from '../lib/api.server'`-pathed per file's aliasing — follow each file's existing `#/lib/...` or relative convention).
- [✅] **Step 4:** audit's `readDbUrl()` body becomes `return resolveDbUrl() ?? null;`; the two metrics handlers read `readMetricsEnv({ ...process.env, DATABASE_URL: resolveDbUrl() })`.
- [✅] **Step 5: new `src/lib/db-url.server.test.ts`** (lib-seam style, plain Node):

```ts
import { afterEach, describe, expect, it } from 'vitest';

import { resolveDbUrl } from './api.server';

// Plain-Node seam: the DEV gate keeps the binding capture off in vitest, so
// resolveDbUrl rides process.env — the trimmed-string contract + the blank
// law (ADR-0024: a blank DATABASE_URL is absent, never empty-string).
describe('resolveDbUrl (the ADR-0024 db-connection seam, plain-node half)', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it('returns the trimmed DATABASE_URL from the environment', () => {
    process.env.DATABASE_URL = '  postgres://u:p@host:5432/db  ';
    expect(resolveDbUrl()).toBe('postgres://u:p@host:5432/db');
  });

  it('returns undefined for a blank or absent DATABASE_URL', () => {
    process.env.DATABASE_URL = '   ';
    expect(resolveDbUrl()).toBeUndefined();
    delete process.env.DATABASE_URL;
    expect(resolveDbUrl()).toBeUndefined();
  });
});
```

Admin gates + commit:

```bash
git add apps/admin
git commit -m "feat(admin): the db connection rides the HYPERDRIVE binding with the DATABASE_URL fallback (#260)"
```

### Task 5: local gates

- [ ] `pnpm check && pnpm build` green — exact test counts from the run output recorded in the evidence dir (never from this plan's arithmetic).
- [ ] `pnpm --filter @sevendays/api dev` boots (check 5). If it demands a local connection string: set the wrangler-documented mechanism locally (never committed), and pin the recipe in `.dev.vars.example`'s DATABASE_URL comment block:

```text
# With the HYPERDRIVE binding in wrangler.toml, wrangler dev may want a local
# connection string — <the documented mechanism, filled from the boot error>.
```

### Task 6: PR, merge, teaser verification

- [ ] **Step 1:** push + PR against main; owner merges. The deploy validates the binding id and the token's Hyperdrive permissions (check 4 — failure: owner fixes scopes, redeploy).
- [ ] **Step 2: verify** (evidence dir): `wrangler tail sevendays-api` during ~30 reads across the six public routes — **zero `Exceeded CPU Limit` lines; ANY kill = stop and re-diagnose** (the inference failed). Timed reads before/after, reported as measured. Landing `/`, `/about`, `/packages` = 200 with data. A CMS edit (site-settings save) reaches the landing's next load. Admin: owner signs in once, or approves dispatching the e2e workflow (its smoke leg signs in with the sealed staff account).

### Task 7: v1 (owner-assisted)

- [ ] **Step 1:** owner runs, on the v1 deploy account, against v1's DATABASE_URL: `wrangler hyperdrive create sevendays-v1-db --connection-string=<v1 URL> --caching-disabled`; hands back the id.
- [ ] **Step 2:** the pick per `docs/agents/v1-picks.md`: same code, the v1 id in both configs (`apps/api/wrangler.toml`, `apps/admin/wrangler.jsonc`). The config must exist before the pick pushes — the deploy validates ids. Verify v1: landing 200, tail clean.

### Task 8: records

- [ ] **Step 1: ADR-0024** (`docs/adr/0024-hyperdrive-db-connection-path.md`) — Status Accepted 2026-11-10; Context = the incident + the measured CPU figures; Decision sentences pinned: Hyperdrive fronts Supavisor; caching disabled for read-your-writes; the per-request client stays (ADR-0011's workerd law); origin = the 6543 transaction pooler (reasoning: keeps `prepare: false`, shares the 60-connection budget — reasoning, not vendor-doc-confirmed); DATABASE_URL stays the CI-synced fallback. Consequences: the free-tier command budget; Hyperdrive is the dial path on both editions (v1 at pick); Supavisor's degraded connect path is bypassed, not explained.
- [ ] **Step 2:** amendment lines on ADR-0007 and ADR-0011 ("Hyperdrive adopted in front of the pooler — see ADR-0024"; ADR-0011's "revisit Hyperdrive" consequence is discharged by ADR-0024).
- [ ] **Step 3:** `docs/tech-stack.md` Data Layer + Secrets Checklist rows (DATABASE_URL = fallback/dev; HYPERDRIVE = the deployed dial path); `docs/progress.md` entry (newest first); AGENTS.md status clause (the db bullet names the Hyperdrive path); the v1-picks ledger row (one row per PR law); `graphify update .` + commit.

## Rollback

Revert the PR; the still-synced DATABASE_URL secret restores today's behaviour on redeploy. The Hyperdrive configs can stay or be deleted (account dashboard / `wrangler hyperdrive delete`).

## Not here

The held #255/#259 visual-suite plan (resumes once the teaser serves data); why Supavisor's connect path slowed; any Workers plan change; `packages/db` client changes; the CI workflow file.

