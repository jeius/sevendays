# The ship-provisioning runbook (#191) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land `docs/ship-provisioning-runbook.md` — the ordered, owner-operated ship ceremony ending at the production smoke as its last step (spec #182 § Ship-time provisioning: dedicated CF account → Supabase org/project → migrations + seed → the fresh bucket → secrets + vars → the dry-run-gated deploy → the `v1` CI re-point → media copy → domains + DNS → the `MEDIA_PUBLIC_BASE_URL` flip → the smoke) — plus the two owner-tooling scripts the runbook drives (the scripted media list+copy, and the owner-ratified content carry), plus `docs/media-bucket-runbook.md`'s fresh-bucket recreation steps.

**Architecture:** The runbook is one doc in two phases with a client-dependent wait between them: **Phase A** stands the dedicated stack up on the new account's `*.workers.dev` (no client dependency); **Phase B** needs the client-registered domain (zone, four custom domains, the var flips, the cutover commit, the smoke). Every step names its actor (the owner) and its evidence. Two `.mjs` owner-tooling scripts land with it so the runbook's steps are runnable files, not heredocs: `packages/db/scripts/ship-content-carry.mjs` (copies the CMS-curated catalog + content state dev→fresh in one transaction — heals the seed-staleness the 2026-10-11 drift probe proved) and `apps/api/scripts/ship-media-copy.mjs` (cross-account R2 list+copy over aws4fetch, mirroring the api's own pinned client construction). Both scripts are written edition-neutral so their v1 pick is clean by construction. The runbook also documents — does not execute — the ship-day cutover commit on main (the two ci.yml v1-leg value fixes + the Sentry-org comment note), whose execution is #192's walk.

**Tech Stack:** plain Node `.mjs` scripts (the `packages/db/scripts/backfill-positions.mjs` class — biome-formatted, no typecheck, zero tests, zero new dependencies), `postgres` via `packages/db`'s pinned `^3.4.9`, `aws4fetch` via `apps/api`'s pinned `1.0.20` (mirroring `media.ts`'s `region: 'auto'` construction), the `gh` CLI for every GitHub-environment write, `pnpm fix`/`pnpm check` gates, `node scripts/v1-triage.mjs` for the v1 pick.

**Spec:** GitHub issue #191 (`ready-for-agent`), parent spec #182 → `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` § *Ship-time provisioning, topology, domains, secrets* + § *The verify gate — the production smoke*. **Sibling fence:** #192 (M6 ticket 10 — the walk + the close-out) stays open after this lands: this PR writes the runbook and its scripts, executes NONE of the ceremony, and ticks NOTHING in `docs/plan.md` (M6's boxes flip at #192's close-out, not per-ticket — the standing rule). The `v1` GitHub environment's ship values, the cutover commit, and the dispatch run are #192's, per the runbook this PR leaves behind. Blockers: none (#191 is unblocked — docs).

## Recon state this plan starts from (verified live 2026-10-11, pre-plan)

- **Main is at `2069d32`** (the #190 ledger row). Open M6 siblings: #191 (this) and #192 only.
- **The ceremony's every input exists on main:** the smoke suite (`e2e/smoke/production.spec.ts`, seven assertions) + its workflow (`.github/workflows/e2e.yml`: nightly + `workflow_dispatch` with `environment: teaser|v1`, drawing `E2E_BASE_URL`/`E2E_API_URL: vars.API_URL`/`E2E_ADMIN_URL: vars.BETTER_AUTH_URL` + the two `E2E_SMOKE_STAFF_*` secrets from the chosen environment); the staff runbook (`docs/staff-provisioning.md` — `create-staff` wraps `dotenv -e .env.local -- pnpm dlx auth@1.7.5 create-admin`, prompted password, `--role staff` trailing override spike-verified, `minPasswordLength: 12`); the media runbook (`docs/media-bucket-runbook.md` — bucket/CORS/lifecycle/dev-url/S3-token steps + the vars table); migrations `0000`–`0008` on disk (`0008_powerful_tyger_tiger.sql` = the audit_log table); the seed (`pnpm --filter @sevendays/db db:seed`, bootstrap/dev-only per its README) + `db:verify-seed`.
- **The `v1` branch exists (`origin/v1`) and is self-consistent:** `apps/api/wrangler.toml` names `sevendays-v1-api` and binds `bucket_name = "sevendays-media"`; both frontends' `wrangler.jsonc` bind `service: "sevendays-v1-api"`; `.github/workflows/ci.yml` is byte-identical to main's. The deploy legs (`ci.yml:190-304`) draw everything from the `v1` GitHub environment: token + `DATABASE_URL` (secrets), `API_URL`/`BETTER_AUTH_URL`/`CLOUDFLARE_ACCOUNT_ID`/`MEDIA_PUBLIC_BASE_URL`/`VITE_SENTRY_DSN`/`VITE_POSTHOG_KEY` (vars), the `R2` pair / `SENTRY_DSN` / `CF_ANALYTICS_READ_TOKEN` / `POSTHOG_*` (secrets) — and `SENTRY_RELEASE: ${{ github.sha }}` per push. Worker secrets NOT CI-synced (`BETTER_AUTH_SECRET` among them) were set by hand at M4 — the runbook's deploy step re-puts them by hand on the fresh workers.
- **The live `v1` GitHub environment (probed 2026-10-11):** secrets `CLOUDFLARE_API_TOKEN` + `DATABASE_URL` only; vars `API_URL`/`BETTER_AUTH_URL` (dev-account workers.dev), `CLOUDFLARE_ACCOUNT_ID` (`436cc3a02b117ee2a2970681c9ac531e` — the dev account), `MEDIA_PUBLIC_BASE_URL` (the dev bucket's `pub-0e2d375a0ded418f84366c03cf37e4a8.r2.dev`). Everything else the deploy legs read — the R2 pair, `SENTRY_DSN`, the analytics trio, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `E2E_BASE_URL`, the smoke-staff pair — is missing and is the runbook's A5 write-up. The `teaser` environment is complete (incl. `E2E_BASE_URL` + the smoke-staff secrets) and NEVER changes at ship.
- **Two latent ci.yml v1-leg defects (landed at #187, PR #199, no recorded rationale):** `--var "CF_ANALYTICS_BUCKET:sevendays-v1-media"` (ci.yml:280) names a bucket that exists on no account — the v1 branch binds `sevendays-media`, so the fresh bucket must keep that name and the Storage widget's var is wrong until fixed; `--var "POSTHOG_LANDING_HOSTS:sevendays-v1-landing.pahamajulius.workers.dev"` (ci.yml:280) is inline, not environment-sourced, so it goes stale the moment the account rotates. **Owner-ratified 2026-10-11 (this plan session):** the ship-day cutover commit fixes both values on the v1 leg (`sevendays-media` + the production apex host) — the runbook documents that commit (B3); this PR does not make it. ci.yml's header comment ("the v1 leg rotates by swapping the v1 environment's secret values … — no workflow edit") narrows honestly to the account swap; the cutover commit carries the one-line comment fix.
- **The Sentry org split is pre-ruled and rides this cutover:** #198's ledger row — main/teaser report to the `jeius-dev` org (`SENTRY_CONSOLE_URL = 'https://jeius-dev.sentry.io/issues/'` at `apps/admin/src/components/dashboard/sentry-link.tsx:10`); `sevendays-studio` is reserved for the ship-day deployment, and "flipping the constant for v1 rides #191's cutover". The runbook's A5 births the `sevendays-studio` org + its one `sevendays` project (fresh DSN — "rotated fresh" per the spec's at-ship list); the v1-side constant flip is the cutover pick's ruled divergence (the ADR-0016 deployment-identity class).
- **The catalog drift is proven, and the carry is owner-ratified (2026-10-11):** a read-only probe of the dev DB shows every catalog family edited via the CMS since the 2026-09-01 seed (`service_packages` 14 rows, `branches` 7, `print_sizes` 7, `attires` 4, `addon_services` 4, `studio_services` 6 — all with `updated_at` up to 2026-09-30), plus CMS-born content the seed covers zero of (`gallery_categories` 4, `gallery_photos` 13, `testimonials` 3, and 3 packages carry `cover_image_key`). A seed-only fresh DB would ship stale prices/branches and an empty gallery — leaving smoke assertion 4 red by design and contradicting the spec's own story ("a ship-day site with an empty gallery would defeat M6's purpose"). **Ratified: migrations + seed run (the ruled bootstrap), then the scripted carry overwrites the catalog with dev's current CMS state.** All carried tables are uuid-PK (no serial sequences anywhere in the schema — no `setval` needed); auth tables, appointments + `appointment_addon_services`, `audit_log`, `rate_limit`, and `verification` never cross (the fresh database's own history starts at ship).
- **The committed-object contract the copy script must mirror** (`apps/api/src/services/media.ts`): every final object is `content-type: image/jpeg` (the commit gate enforces exactly that, `media.ts:132`) with `cacheControl: 'public, max-age=31536000, immutable'` (`media.ts:30`); final keys are `gallery/<uuid>.jpg` + `covers/<uuid>.jpg`; `tmp/` staging never copies. `wrangler r2 object` has only `get`/`put`/`delete` (probed against the installed wrangler — no `list`, no `copy`), so the copy is a script over the S3 API: `aws4fetch` `AwsClient({ service: 's3', region: 'auto' })` — the exact construction `media.ts:75-80` proves against R2, riding `apps/api`'s pinned `aws4fetch@1.0.20`.
- **Deployment mechanics the runbook must make explicit:** every `--var` CI passes is baked per deploy (changing a GitHub env var does nothing until the next deploy — the flip step ends in a redeploy); the owner-run first deploy happens BEFORE the CI re-point (the spec's order) from the **v1 checkout** (`~/Projects/sevendays-v1-seed`, per `docs/agents/v1-picks.md`) with `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` exported, mirroring `ci.yml`'s v1-leg commands exactly (incl. `SENTRY_RELEASE` = the v1 head SHA, `ENVIRONMENT:v1`, the `VITE_*` build env, and the by-hand `wrangler secret put` for the non-CI-synced secrets); the cutover commit's push is then the first CI deploy onto the dedicated account.
- **The `www` redirect mechanism is unpinned ("mechanism at execution" — spec) and gets pinned by this runbook:** a proxied `www` CNAME to the apex + one zone-level Single Redirect rule (`host eq www.<domain>` → 301 `https://<domain>` preserving path + query) — the free-tier standard; no redirect Worker.
- **v1-pick posture for THIS PR (pre-derived):** paths touched = the runbook (new), `docs/media-bucket-runbook.md`, `docs/progress.md` (main-only per `paths.txt`), the plan file (main-only), and the two scripts. Classifier expectation: **SPLIT — 4 v1-paths + 2 main-only**; content pass drops the runbook + the media-runbook hunks (edition mechanics — they name the editions/teaser/seed/handover everywhere) and picks the two scripts (written edition-neutral, zero absence tokens). The spec's pick table row ("Ship provisioning + runbook — owner-operated docs, main-only") governs the docs; the scripts are the backfill-script class (harmless tooling parity on v1).
- **No app/package `src/` is touched** — every suite floor is unmoved by construction: api 27 files + 1 skipped / 338 passed + 3 skipped; api-client 5/33; admin 17/164; landing + types unchanged; `pnpm check` 35/35, `pnpm build` 7/7. The new `.mjs` files sit beside `packages/db/scripts/backfill-positions.mjs` (the precedent: biome-formatted, outside tsconfig, zero tests — owner tooling).

## Global Constraints

- **The runbook's order is spec-verbatim** (the eleven-step ordered list, § Ship-time provisioning) with the two owner-ratified amendments woven in at their spec homes: the content carry rides the database step (A3 — "migrations + seed" gains the carry, ratified 2026-10-11), and the cutover-commit reconciliations ride the re-deploy moment (B3 — the two ci.yml value fixes + the Sentry-org ruled divergence, ratified 2026-10-11 + pre-ruled by #198). Nothing else reorders.
- **Pinned identity literals:** workers `sevendays-v1-api` / `sevendays-v1-landing` / `sevendays-v1-admin`; bucket `sevendays-media` (fresh, on the dedicated account — the v1 branch's binding decides, `origin/v1:apps/api/wrangler.toml`); pooler ports 6543 (transaction, `DATABASE_URL`) / 5432 (session, `DATABASE_MIGRATE_URL`) per ADR-0007; migrations described as `0000 → latest` (0008 today — the phrasing survives future migrations); the smoke dispatch `gh workflow run e2e.yml --ref main -f environment=v1` expecting **7 passed**.
- **The 14-table carry list, insert order pinned** (delete in exact reverse): `branches`, `print_sizes`, `attires`, `addon_services`, `studio_services`, `service_packages`, `branch_studio_services`, `studio_service_addon_services`, `frames`, `package_inclusions`, `package_inclusion_attires`, `gallery_categories`, `gallery_photos`, `testimonials`.
- **The scripts' env contracts (names shared verbatim across Tasks 1, 2, 3 — the runbook exports exactly these):** `ship-content-carry.mjs` reads `SOURCE_DATABASE_URL` + `DATABASE_MIGRATE_URL`; `ship-media-copy.mjs` reads `SOURCE_R2_ACCOUNT_ID`, `SOURCE_R2_ACCESS_KEY_ID`, `SOURCE_R2_SECRET_ACCESS_KEY`, `DEST_R2_ACCOUNT_ID`, `DEST_R2_ACCESS_KEY_ID`, `DEST_R2_SECRET_ACCESS_KEY`, and optional `R2_BUCKET` (default `sevendays-media`). Neither script reads any `.env` file — every input is an exported value on the command line the runbook writes, so the command IS the audit record. Both fail loudly with a curated message naming the missing variable (the `requiredEnv` posture).
- **The copy mirrors the committed-object contract:** content-type from the source GET response (fallback `image/jpeg`), cache-control from the source (fallback `public, max-age=31536000, immutable`), `tmp/` keys skipped, keys path-encoded per segment, a per-object failure report, exit 1 on any failure, and a final `n/n objects, X MB` line (B1's evidence).
- **The carry is one transaction, count-verified:** reverse-FK delete then forward-FK insert on the destination inside `sql.begin`; after commit, per-table counts are re-read from BOTH databases and any mismatch exits 1 (B-step evidence is the script's own report, not prose). `prepare: false` on both connections (the ADR-0007 hard requirement).
- **The runbook's voice and conventions:** owner-operated (every step's actor is the owner; every step ends with an **Evidence:** line #192 records); `<angle-bracket>` placeholders for ship-born values the owner holds (`<domain>`, `<subdomain>`, `<account-id>`, the URLs, the credentials) — they never enter the repo; commands run from the main checkout at `~/Projects/sevendays` unless a step names the v1 checkout (`~/Projects/sevendays-v1-seed`); `gh` targets `-R jeius/sevendays`; Phase A needs no client dependency, Phase B needs the client-registered zone, and the runbook names the wait explicitly between the phases.
- **The at-ship accounting table (AC 2) is the runbook's § 2, complete against the spec's list:** rotated fresh — `DATABASE_URL`, `DATABASE_MIGRATE_URL` (owner-held, `packages/db/.env` only), `BETTER_AUTH_SECRET`, the R2 S3 pair, `SENTRY_DSN` (+ the carried-new `VITE_SENTRY_DSN` value, same fresh key), the `smoke-staff` credentials; carried/pointed anew — `SENTRY_RELEASE` (per-deploy SHA), `CLOUDFLARE_ACCOUNT_ID`, `MEDIA_PUBLIC_BASE_URL` (fresh r2.dev at A4 → `https://media.<domain>` at B3), `API_URL` + `BETTER_AUTH_URL` (new-account workers.dev at A5 → production domains at B3), `E2E_BASE_URL` (B3), the dashboard's `CF_ANALYTICS_READ_TOKEN` + the dedicated v1 PostHog project's `VITE_POSTHOG_KEY`/`POSTHOG_PROJECT_ID`/`POSTHOG_PERSONAL_API_KEY`; provisioned, not secret — migrations + seed + the carry; M7-accounted, not shipped — `RESEND_API_KEY` + `LANDING_ORIGIN` (ADR-0021). Plus the fresh bucket's CORS rule with the production admin origin.
- **The fresh bucket's CORS origins (three, exact-match, no trailing slash — the existing runbook's list shape):** `http://localhost:3000`, `https://sevendays-v1-admin.<subdomain>.workers.dev` (the Phase-A window), `https://admin.<domain>`.
- **No credential value ever enters the repo** — the runbook names every secret by NAME and shows every `gh secret set`/`wrangler secret put` command with `<placeholder>` bodies only (the #190 Task-3 posture).
- **Gates, per task:** `pnpm --filter @sevendays/db fix` + `pnpm --filter @sevendays/api fix` clean on the new scripts (then `node --check` both); full `pnpm check` (**35/35**) + `pnpm build` (**7/7**) before the PR — nothing can have moved (no `src/` touched; run anyway, the house gate); markdown files ride the repo's docs conventions (no biome pass over `docs/`).
- **Docs house rules:** `docs/progress.md` entry at the HEAD of the log (above the #190 entry, line 3); GitHub issue checkboxes flip with `- [x]` (#191's three AC boxes flip at close-out); repo-docs checklist ticks are `- [✅]` (none here); **`docs/plan.md` is untouched** (M6's boxes flip at #192); `AGENTS.md` gains one sentence at its media/log paragraph pointing at the runbook (Task 5's read-then-extend — extend ONLY if factually wrong without it; the ship-time pointer is load-bearing for the next session); every squash-merged PR gets its v1 triage (`docs/agents/v1-picks.md`) — this one's expected verdict is **SPLIT (docs dropped, scripts picked)**; `graphify update .` runs after the files land but its churn is never committed by this plan (the pre-existing dirty `graphify-out/` state belongs to the owner's next graph commit; every `git add` names its files).
- **Scope fence ("not here"):** NO ceremony execution — no account/DB/bucket provisioning, no secrets set, no deploy, no domain work, no dispatch run (ALL of it is #192's walk of this runbook); NO ci.yml or `sentry-link.tsx` edit in this PR (the runbook documents the cutover commit, it does not make it); NO `docs/plan.md` tick; NO ADR (nothing architectural: the carry is a data operation, the ci fixes are value corrections, the Sentry-org split was ruled at #198); NO new dependencies; NO test additions (the owner-tooling class — `backfill-positions.mjs` precedent); NO `e2e/` change; NO `teaser`-side anything; NO changes to `scripts/seed-v1/paths.txt` (frozen history; post-seed files are governed by per-PR triage, and the runbook is dropped by content pass, not excluded by seed).
- **Plan file target:** `docs/superpowers/plans/2026-10-11-191-ship-provisioning-runbook.md` (this file).

---

### Task 1: The two owner-tooling scripts the runbook drives

**Files:**
- Create: `packages/db/scripts/ship-content-carry.mjs`
- Create: `apps/api/scripts/ship-media-copy.mjs`

**Interfaces:**
- Consumes: `postgres` (`packages/db`'s pinned `^3.4.9`), `aws4fetch` (`apps/api`'s pinned `1.0.20`) — both resolve from the host package's `node_modules` because the scripts live inside those packages (a root `scripts/` file could not resolve either bare specifier — pnpm's non-hoisted layout).
- Produces: the two env contracts above — Tasks 2–3's runbook steps invoke exactly these names, and Task 6's pick carries exactly these files.

- [ ] **Step 0: Cut the branch and re-pin the baseline**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only
git log --oneline -1   # expect 2069d32 or later
git checkout -b feat/191-ship-provisioning-runbook
pnpm install && pnpm build:packages
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: api `27 passed | 1 skipped (28)` files / `338 passed | 3 skipped (341)` tests — the AGENTS.md floor. If it moved, record the new floor in the PR body (Task 6 Step 2) and continue; this plan touches no workspace `src/`, so nothing else derives from it.

- [ ] **Step 1: Write `packages/db/scripts/ship-content-carry.mjs`**

Create the file with exactly this content (edition-neutral by construction — no edition/teaser/seed vocabulary, so the Task 6 pick applies clean):

```js
// Ship-day content carry (M6 #191, owner-ratified 2026-10-11): copies the
// CMS-curated catalog + content state from the source database to the
// destination database in ONE transaction (reverse-FK deletes, then
// forward-FK inserts), superseding the seed's docs/catalog.md baseline
// with what the studio actually curated — the 2026-10-11 read-only probe
// showed every family had drifted past the seed. Auth, appointments,
// audit_log, rate_limit, and verification rows never cross: the
// destination's own history starts at ship. Owner tooling, run from the
// runbook — never CI. Every input is an exported env value (no .env file
// is read): the runbook's command line is the audit record.
import postgres from 'postgres';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The ship runbook exports it before running this script — see docs/ship-provisioning-runbook.md.`,
    );
  }
  return value;
}

// Insert order = FK-safe forward order; deletes run the exact reverse.
const TABLES = [
  'branches',
  'print_sizes',
  'attires',
  'addon_services',
  'studio_services',
  'service_packages',
  'branch_studio_services',
  'studio_service_addon_services',
  'frames',
  'package_inclusions',
  'package_inclusion_attires',
  'gallery_categories',
  'gallery_photos',
  'testimonials',
];

// Identifier gate for sql.unsafe (postgres 3.4.9 ships no sql.identifier):
// the only two identifier sources are this script's own TABLES constant and
// the driver's own column names — both must pass the strict snake_case
// check, then ride double quotes. VALUES are always parameterized ($1…),
// never interpolated.
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`unsafe identifier refused: ${name}`);
  }
  return `"${name}"`;
};

const source = postgres(required('SOURCE_DATABASE_URL'), { prepare: false });
const dest = postgres(required('DATABASE_MIGRATE_URL'), { prepare: false });

const carried = {};
await dest.begin(async (tx) => {
  for (const table of [...TABLES].reverse()) {
    await tx.unsafe(`delete from ${ident(table)}`);
  }
  for (const table of TABLES) {
    const rows = await source.unsafe(`select * from ${ident(table)}`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const params = cols.map((col) => row[col]);
      const marks = params.map((_, i) => `$${i + 1}`).join(', ');
      await tx.unsafe(
        `insert into ${ident(table)} (${cols.map((col) => ident(col)).join(', ')}) values (${marks})`,
        params,
      );
    }
    carried[table] = rows.length;
  }
});

let mismatched = 0;
for (const table of TABLES) {
  const srcCount = await source.unsafe(`select count(*)::int as n from ${ident(table)}`);
  const dstCount = await dest.unsafe(`select count(*)::int as n from ${ident(table)}`);
  const ok = srcCount[0].n === dstCount[0].n && dstCount[0].n === carried[table];
  if (!ok) mismatched++;
  console.log(
    `${table.padEnd(32)} ${String(dstCount[0].n).padStart(4)} row(s)  ${ok ? 'ok' : `MISMATCH (source ${srcCount[0].n}, inserted ${carried[table]})`}`,
  );
}
await source.end();
await dest.end();
if (mismatched > 0) {
  console.error(`${mismatched} table(s) mismatched — the carry is NOT verified`);
  process.exit(1);
}
console.log(`carry verified: ${TABLES.length} table(s), all counts match`);
```

- [ ] **Step 2: Write `apps/api/scripts/ship-media-copy.mjs`**

Create the file with exactly this content (edition-neutral; the constants mirror `src/services/media.ts` — the committed-object contract):

```js
// Ship-day media copy (M6 #191): lists every committed object in the
// source account's sevendays-media bucket and re-PUTs it into the
// destination account's same-named bucket (R2 has no bucket-move —
// ADR-0019 #4). The committed-object contract (src/services/media.ts):
// final objects are Content-Type image/jpeg with Cache-Control public,
// max-age=31536000, immutable; tmp/ staging never copies (its lifecycle
// rule expires it). aws4fetch here mirrors media.ts's own client
// construction (service s3, region auto — required by the signer, ignored
// by R2), riding the api's pinned dependency. Owner tooling, run from the
// runbook — never CI; every input is an exported env value (no .env file
// is read).
import { AwsClient } from 'aws4fetch';

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The ship runbook exports it before running this script — see docs/ship-provisioning-runbook.md.`,
    );
  }
  return value;
}

const encodeKey = (key) => key.split('/').map(encodeURIComponent).join('/');

const source = new AwsClient({
  accessKeyId: required('SOURCE_R2_ACCESS_KEY_ID'),
  secretAccessKey: required('SOURCE_R2_SECRET_ACCESS_KEY'),
  service: 's3',
  region: 'auto',
});
const dest = new AwsClient({
  accessKeyId: required('DEST_R2_ACCESS_KEY_ID'),
  secretAccessKey: required('DEST_R2_SECRET_ACCESS_KEY'),
  service: 's3',
  region: 'auto',
});
const bucket = process.env.R2_BUCKET ?? 'sevendays-media';
const sourceBase = `https://${required('SOURCE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${bucket}`;
const destBase = `https://${required('DEST_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${bucket}`;

// Minimal XML scrape (owner tooling — no XML dependency): S3 v2 list
// responses are flat <Contents><Key>..</Key><Size>..</Size></Contents>
// documents, paginated by continuation token.
async function listAll() {
  const objects = [];
  let token = '';
  for (;;) {
    const url = new URL(`${sourceBase}?list-type=2`);
    if (token) url.searchParams.set('continuation-token', token);
    const response = await source.fetch(url);
    if (!response.ok) {
      throw new Error(`list objects failed: ${response.status} ${await response.text()}`);
    }
    const xml = await response.text();
    for (const contents of xml.matchAll(/<Contents>(.*?)<\/Contents>/gs)) {
      const key = contents[1].match(/<Key>(.*?)<\/Key>/)?.[1];
      const size = Number(contents[1].match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0);
      if (key) objects.push({ key, size });
    }
    token = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1] ?? '';
    if (!token || !/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
  }
  return objects;
}

const objects = (await listAll()).filter((object) => !object.key.startsWith('tmp/'));
console.log(`copying ${objects.length} committed object(s) (tmp/ skipped)`);
let copied = 0;
let bytes = 0;
for (const { key, size } of objects) {
  const get = await source.fetch(`${sourceBase}/${encodeKey(key)}`);
  if (!get.ok) {
    console.error(`GET ${key} → ${get.status}`);
    continue;
  }
  const contentType = get.headers.get('content-type') ?? 'image/jpeg';
  const cacheControl = get.headers.get('cache-control') ?? IMMUTABLE_CACHE_CONTROL;
  const body = await get.arrayBuffer();
  const put = await dest.fetch(`${destBase}/${encodeKey(key)}`, {
    method: 'PUT',
    headers: { 'content-type': contentType, 'cache-control': cacheControl },
    body,
  });
  if (!put.ok) {
    console.error(`PUT ${key} → ${put.status}`);
    continue;
  }
  copied += 1;
  bytes += size;
}
console.log(`${copied}/${objects.length} object(s), ${(bytes / 1e6).toFixed(1)} MB`);
process.exit(copied === objects.length ? 0 : 1);
```

- [ ] **Step 3: Format + syntax gates**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/db fix && pnpm --filter @sevendays/api fix
node --check packages/db/scripts/ship-content-carry.mjs
node --check apps/api/scripts/ship-media-copy.mjs
node -e "import('./packages/db/scripts/ship-content-carry.mjs').catch((e) => { console.log('expected fail-fast:', e.message.slice(0, 60)); process.exit(0); })"
```

Expected: biome clean on both packages (it may reflow the new files' line breaks — fine); both `node --check` passes print nothing; the import probe fails fast with `SOURCE_DATABASE_URL is not set.` (top-level await throws only after the `required` call — the curated message, proving the fail-fast contract without touching any database). If biome reports errors it cannot fix, fix them at the source and re-run — never commit a red fix.

- [ ] **Step 4: Commit**

```bash
cd /home/jeius/Projects/sevendays
git add packages/db/scripts/ship-content-carry.mjs apps/api/scripts/ship-media-copy.mjs
git commit -m "feat(scripts): the ship-runbook's two owner tools — content carry + media copy (#191)"
```

`git status --porcelain` shows nothing else swept in (the pre-existing dirty `graphify-out/`/CONTEXT files stay untouched).

**Not here:** no runbook content yet (Tasks 2–3 — the doc references these files, so the files land first); no media-runbook edit (Task 4); no progress entry (Task 5); no execution of either script against any database (that is #192's walk).

### Task 2: The runbook — overview, the at-ship accounting, Phase A

**Files:**
- Create: `docs/ship-provisioning-runbook.md` (Part 1 of 2 — Task 3 appends the rest)

**Interfaces:**
- Consumes: Task 1's two scripts (A3 + B1 invoke them with exactly their env contracts); the staff runbook (`docs/staff-provisioning.md`), the media runbook (§ Fresh bucket at ship, Task 4's sibling edit), the smoke workflow (`.github/workflows/e2e.yml`), `ci.yml`'s v1-leg deploy commands (A6 mirrors them verbatim).
- Produces: the ceremony document #192 walks; the at-ship accounting table (AC 2).

- [ ] **Step 1: Create `docs/ship-provisioning-runbook.md` with Part 1**

Create the file with exactly this content:

```markdown
# Ship provisioning runbook — the v1 production ceremony (M6 #191)

The ordered, owner-operated ship ceremony that stands v1 on ship-time-dedicated
accounts under real domains and ends at the production smoke (spec #182 §
Ship-time provisioning, topology, domains, secrets). Written at M6 #191;
executed with #192, whose walk log records every step's evidence. Nothing here
touches the teaser — its environment, workers, bucket, and r2.dev URL stay on
the dev account forever.

**Conventions.** Every step is owner-operated and ends with an **Evidence:**
line to record. `<angle-bracket>` values are ship-born — the owner holds them
at execution time; they never enter this repo. Commands run from the main
checkout at `~/Projects/sevendays` unless a step names the v1 checkout at
`~/Projects/sevendays-v1-seed` (docs/agents/v1-picks.md). `gh` operations
target `-R jeius/sevendays`. Secret values ride `--body "<…>"` placeholders
and `printf | wrangler secret put` — never a committed file.

**The shape.** Two phases with one client-dependent wait between them:

- **Phase A** — the dedicated stack (no client dependency): account →
  database → bucket → secrets + vars → deploy → the CI re-point. Ends with v1
  live on the dedicated account's `*.workers.dev`.
- **The wait** — the client registers the domain; the owner brings the zone
  into the dedicated account.
- **Phase B** — the public stack: media copy → domains + DNS → the var flips
  + the cutover commit → **the production smoke** (the last step, by spec).

## § The at-ship secrets/env accounting (reconciled against spec #182)

| Value | Class | Born at ship | Homes |
| --- | --- | --- | --- |
| `DATABASE_URL` | rotated fresh | the fresh Supabase project, transaction pooler (port 6543, ADR-0007) | `v1` GitHub env secret → CI syncs to both v1 Workers |
| `DATABASE_MIGRATE_URL` | rotated fresh (owner-held) | the fresh project, session pooler (port 5432) | `packages/db/.env` only — never GitHub, never Workers |
| `BETTER_AUTH_SECRET` | rotated fresh | `openssl rand -base64 32` (generated at A3, used first there) | both v1 Workers (`wrangler secret put`, A6) + A3's temporary `.env.local` swap |
| `R2_S3_ACCESS_KEY_ID` / `R2_S3_SECRET_ACCESS_KEY` | rotated fresh | the dedicated account's R2 § Owner handoff, scoped to the fresh bucket | `v1` env secrets + `sevendays-v1-api` (A6) |
| `SENTRY_DSN` + `VITE_SENTRY_DSN` | rotated fresh / pointed anew | the `sevendays-studio` Sentry org's one `sevendays` project — a fresh key; teaser keeps `jeius-dev` | `v1` env secret (api) + `v1` env var (frontends' build) |
| `smoke-staff` credentials | provisioned | the fresh DB via `create-staff --role staff` (A3) | `v1` env secrets only, never the repo |
| `CLOUDFLARE_ACCOUNT_ID` | pointed anew | the dedicated account | `v1` env var (A7) |
| `API_URL` / `BETTER_AUTH_URL` | pointed anew | the new account's workers.dev URLs (A5) → `https://api.<domain>` / `https://admin.<domain>` (B3) | `v1` env vars |
| `MEDIA_PUBLIC_BASE_URL` | pointed anew | the fresh bucket's r2.dev URL (A4) → `https://media.<domain>` (B3) | `v1` env var |
| `E2E_BASE_URL` | provisioned | `https://<domain>` | `v1` env var (B3) |
| `VITE_POSTHOG_KEY` / `POSTHOG_PROJECT_ID` / `POSTHOG_PERSONAL_API_KEY` | provisioned | the dedicated v1 PostHog project born at ship (client numbers stay clean) | `v1` env var + secrets |
| `CF_ANALYTICS_READ_TOKEN` | provisioned | the dedicated account, Analytics:Read — mirror the dev token's scope (the #186 mint) | `v1` env secret |
| `SENTRY_RELEASE` | carried | the deployed git SHA, per deploy | CI passes `github.sha`; A6 exports the v1 head SHA |
| migrations `0000 → latest` + the catalog seed + the content carry | provisioned, not secret | the fresh DB (A3) | — |
| `RESEND_API_KEY` + `LANDING_ORIGIN` | M7 arrivals — accounted, not shipped (ADR-0021) | — | no slot at ship |

The `teaser` GitHub environment and everything it reads are untouched by this
runbook.

## Phase A — the dedicated stack (no client dependency)

### A1 The Cloudflare account, the subdomain, the ship token

Owner, dashboard:

1. Create the account (the owner's email; the client inherits it at
   handover). Note `<account-id>` (Overview, right rail).
2. Workers & Pages → set the account's workers.dev subdomain to
   `<subdomain>` — v1 serves at `sevendays-v1-*.<subdomain>.workers.dev`
   until the domains land (B2).
3. Membership stays minimal: the owner's seat plus, at most, an operator
   holding the least role that covers their ship-day tasks. The deploy
   credential is a scoped API token, never a Global API Key.
4. My Profile → API Tokens → Create Token (Custom) — the **ship token**:
   Account scopes `Workers Scripts:Edit`, `Workers R2 Storage:Edit`,
   `Cloudflare Images:Edit`, `Account Settings:Read`, `User Details:Read`.
   (The `Images` scope rides the `[images]` binding; custom domains attach
   via the dashboard at B2, so no zone scopes.)
5. If the account has not subscribed Images (free) under R2/Images, do so —
   the api's `IMAGES` binding needs it.

**Evidence:** `curl -sS -H "Authorization: Bearer <ship-token>"
https://api.cloudflare.com/client/v4/user/tokens/verify` answers
`"status":"active"`.

### A2 The Supabase org + project

Owner, dashboard: create the org (e.g. `Sevendays Studio`) and the project
(free tier; the region nearest the studio — the dev project's region). Choose
a strong DB password `<db-password>` — the connection strings embed it;
owner-held, never committed. Project Settings → Database → note:

- the **transaction pooler** URL (port 6543, IPv4) → the fresh
  `<DATABASE_URL>`;
- the **session pooler** URL (port 5432) → the fresh
  `<DATABASE_MIGRATE_URL>` (ADR-0007: the direct host is IPv6-only; the
  migrate URL is also the carry script's destination input).

Free-tier note: the project pauses after ~1 week idle (ADR-0007
Consequences). The client takes Supabase Pro from handover day; between ship
and handover the smoke and real traffic keep it warm.

**Evidence:** `psql "<DATABASE_MIGRATE_URL>" -c 'select 1'` answers.

### A3 The fresh database — migrations, seed, the carry, the smoke-staff

From the main checkout. The seed is a bootstrap tool (packages/db/README.md)
— on the fresh DB it is the ruled baseline; the carry (owner-ratified
2026-10-11) then overwrites the catalog with the studio's curated state,
because every family had drifted from `docs/catalog.md` (the 2026-10-11
read-only probe; the CMS owns the catalog of record).

```bash
cd ~/Projects/sevendays/packages/db
cp .env .env.pre-ship.bak          # restore after this step
# .env: DATABASE_MIGRATE_URL → the fresh session-pooler URL (A2)
pnpm db:migrate                    # 0000 → latest
pnpm db:seed                       # the catalog baseline
pnpm db:verify-seed
# the carry — the curated state from the dev DB:
SOURCE_DATABASE_URL="<dev session-pooler URL>" \
DATABASE_MIGRATE_URL="<fresh session-pooler URL>" \
  pnpm exec tsx scripts/ship-content-carry.mjs
mv .env.pre-ship.bak .env          # dev tooling restored
```

Generate the rotated session secret (used first here, sealed everywhere at
A5/A6): `openssl rand -base64 32` → `<auth-secret>`.

The ship-side `smoke-staff` account (spec #181: folded into this step;
#190's dev twin is the precedent):

```bash
cd ~/Projects/sevendays/apps/admin
cp .env.local .env.local.pre-ship.bak
# .env.local, temporarily:
#   DATABASE_URL=<fresh transaction-pooler URL>
#   BETTER_AUTH_SECRET=<auth-secret>
#   BETTER_AUTH_URL=https://sevendays-v1-admin.<subdomain>.workers.dev
openssl rand -base64 24           # the prompted password, ≥12 chars; owner keeps it
pnpm create-staff --email <smoke-email> --name "Smoke Staff" --role staff
mv .env.local.pre-ship.bak .env.local
```

**Evidence:** `db:verify-seed` green; the carry's report ends `carry
verified: 14 table(s), all counts match` (and per-table counts equal dev's —
14 packages, 7 branches, 7 print sizes, 4 attires, 4 add-ons, 6 studio
services, 4 gallery categories, 13 gallery photos, 3 testimonials at the time
of writing — the live counts are the truth); the smoke-staff row created (the
CLI's own output).

### A4 The fresh bucket (docs/media-bucket-runbook.md § Fresh bucket at ship)

The bucket keeps the name `sevendays-media` — the v1 branch's
`apps/api/wrangler.toml` binds it, and bucket names are per-account (the dev
account's same-named bucket is untouched). With `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID` exported (the ship token + `<account-id>`):

```bash
cd ~/Projects/sevendays
export CLOUDFLARE_API_TOKEN="<ship-token>" CLOUDFLARE_ACCOUNT_ID="<account-id>"
pnpm --filter @sevendays/api exec wrangler r2 bucket create sevendays-media
# CORS — the three admin origins, exact match, no trailing slash:
#   http://localhost:3000
#   https://sevendays-v1-admin.<subdomain>.workers.dev
#   https://admin.<domain>
# (write them to a scratch cors.json, then:)
pnpm --filter @sevendays/api exec wrangler r2 bucket cors set sevendays-media --file cors.json
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle add sevendays-media tmp-gc tmp/ --expire-days 1 -y
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url enable sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media   # → <fresh-r2dev-base>
```

Mint the fresh S3 token pair (the media runbook's § Owner handoff, re-run
against this account: Object Read & Write, scoped to `sevendays-media` only,
no TTL) → `<fresh-r2-access-key-id>` / `<fresh-r2-secret-access-key>` (the
copy script's `DEST_*` inputs at B1). The r2.dev URL serves the Phase-A
window only; B3 flips reads to the custom domain and B4 disables it.

**Evidence:** `cors list` / `lifecycle list` / `dev-url get` outputs recorded.

### A5 Secrets + vars — the complete `v1` GitHub environment write-up

First the two observability orgs/projects (owner, dashboard):

- **Sentry:** create the `sevendays-studio` org (reserved for ship — the
  #198 ruling) and one `sevendays` project in it; mint a client key → the
  fresh DSN `<fresh-dsn>` (the teaser's `jeius-dev` org and keys never
  change; `environment: v1` distinguishes the ship traffic in the new org).
- **PostHog:** create the dedicated v1 project → its public API key
  `<v1-posthog-key>`, its project id `<v1-posthog-project-id>`, and a
  personal API key `<v1-posthog-personal-key>`.
- **Cloudflare:** mint the Analytics:Read token on the dedicated account
  (mirroring the dev token's scope, #186) → `<cf-analytics-token>`.

Then the environment (values from A1–A4; note `CLOUDFLARE_API_TOKEN` and
`E2E_BASE_URL` are NOT set here — A7 and B3 own them):

```bash
gh secret set DATABASE_URL               -e v1 --body "<fresh transaction-pooler URL>" -R jeius/sevendays
gh secret set R2_S3_ACCESS_KEY_ID        -e v1 --body "<fresh-r2-access-key-id>"       -R jeius/sevendays
gh secret set R2_S3_SECRET_ACCESS_KEY    -e v1 --body "<fresh-r2-secret-access-key>"   -R jeius/sevendays
gh secret set SENTRY_DSN                 -e v1 --body "<fresh-dsn>"                    -R jeius/sevendays
gh secret set CF_ANALYTICS_READ_TOKEN    -e v1 --body "<cf-analytics-token>"           -R jeius/sevendays
gh secret set POSTHOG_PERSONAL_API_KEY   -e v1 --body "<v1-posthog-personal-key>"      -R jeius/sevendays
gh secret set POSTHOG_PROJECT_ID         -e v1 --body "<v1-posthog-project-id>"        -R jeius/sevendays
gh secret set E2E_SMOKE_STAFF_EMAIL      -e v1 --body "<smoke-email>"                  -R jeius/sevendays
gh secret set E2E_SMOKE_STAFF_PASSWORD   -e v1 --body "<smoke-staff password>"         -R jeius/sevendays
gh variable set CLOUDFLARE_ACCOUNT_ID    -e v1 --body "<account-id>"                   -R jeius/sevendays
gh variable set API_URL                  -e v1 --body "https://sevendays-v1-api.<subdomain>.workers.dev"      -R jeius/sevendays
gh variable set BETTER_AUTH_URL          -e v1 --body "https://sevendays-v1-admin.<subdomain>.workers.dev"    -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL    -e v1 --body "<fresh-r2dev-base>"             -R jeius/sevendays
gh variable set VITE_SENTRY_DSN          -e v1 --body "<fresh-dsn>"                    -R jeius/sevendays
gh variable set VITE_POSTHOG_KEY         -e v1 --body "<v1-posthog-key>"               -R jeius/sevendays
```

**Evidence:** `gh secret list -e v1` + `gh variable list -e v1` show exactly
the names above (plus the pre-existing `CLOUDFLARE_API_TOKEN` secret, rotated
at A7) — presence by name only; values are unreadable by design.

### A6 The deploy under the scoped roles (the dry-run gate)

From the **v1 checkout**, at `origin/v1` head — the v1 workers carry the
booking-free artifact. `SENTRY_RELEASE` is the head SHA (the release tag the
cutover push later re-issues):

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1
git rev-parse HEAD   # → <v1-sha>
export CLOUDFLARE_API_TOKEN="<ship-token>" CLOUDFLARE_ACCOUNT_ID="<account-id>"
export SENTRY_RELEASE="<v1-sha>"
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
export VITE_SENTRY_DSN="<fresh-dsn>" VITE_SENTRY_RELEASE="$SENTRY_RELEASE" VITE_SENTRY_ENVIRONMENT=v1 VITE_POSTHOG_KEY="<v1-posthog-key>"
pnpm --filter @sevendays/landing run build && pnpm --filter @sevendays/admin run build
```

The dry-run gate, then the live deploy — the commands mirror ci.yml's v1 leg
exactly, with the two values already corrected (the Storage widget's bucket
is `sevendays-media`; Traffic's host allowlist is the new account's host
until B3 narrows it to the apex):

```bash
cd apps/api     && pnpm exec wrangler deploy --dry-run --outdir .wrangler/ship-dry-run --name sevendays-v1-api --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "MEDIA_PUBLIC_BASE_URL:<fresh-r2dev-base>" --var "SENTRY_RELEASE:$SENTRY_RELEASE" --var "ENVIRONMENT:v1"
cd ../landing   && pnpm exec wrangler deploy --dry-run --outdir .wrangler/ship-dry-run --name sevendays-v1-landing --var "API_URL:https://sevendays-v1-api.<subdomain>.workers.dev"
cd ../admin     && pnpm exec wrangler deploy --dry-run --outdir .wrangler/ship-dry-run --name sevendays-v1-admin --var "API_URL:https://sevendays-v1-api.<subdomain>.workers.dev" --var "BETTER_AUTH_URL:https://sevendays-v1-admin.<subdomain>.workers.dev" --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "CF_ANALYTICS_SCRIPT_API:sevendays-v1-api" --var "CF_ANALYTICS_SCRIPT_LANDING:sevendays-v1-landing" --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-v1-admin" --var "CF_ANALYTICS_BUCKET:sevendays-media" --var "POSTHOG_LANDING_HOSTS:sevendays-v1-landing.<subdomain>.workers.dev"
```

All three dry-runs green (the gate), then re-run each without `--dry-run
--outdir …`. Then the by-hand worker secrets CI does not sync (BETTER_AUTH_SECRET)
plus the ones the first CI sync will carry anyway (set now so the stack is
whole before any push):

```bash
cd ~/Projects/sevendays-v1-seed/apps/api
printf '%s' "<fresh transaction-pooler URL>" | pnpm exec wrangler secret put DATABASE_URL        --name sevendays-v1-api
printf '%s' "<auth-secret>"                  | pnpm exec wrangler secret put BETTER_AUTH_SECRET  --name sevendays-v1-api
printf '%s' "<fresh-dsn>"                    | pnpm exec wrangler secret put SENTRY_DSN           --name sevendays-v1-api
printf '%s' "<fresh-r2-access-key-id>"       | pnpm exec wrangler secret put R2_S3_ACCESS_KEY_ID  --name sevendays-v1-api
printf '%s' "<fresh-r2-secret-access-key>"   | pnpm exec wrangler secret put R2_S3_SECRET_ACCESS_KEY --name sevendays-v1-api
cd ../admin
printf '%s' "<fresh transaction-pooler URL>" | pnpm exec wrangler secret put DATABASE_URL        --name sevendays-v1-admin
printf '%s' "<auth-secret>"                  | pnpm exec wrangler secret put BETTER_AUTH_SECRET  --name sevendays-v1-admin
printf '%s' "<cf-analytics-token>"           | pnpm exec wrangler secret put CF_ANALYTICS_READ_TOKEN --name sevendays-v1-admin
printf '%s' "<v1-posthog-personal-key>"      | pnpm exec wrangler secret put POSTHOG_PERSONAL_API_KEY --name sevendays-v1-admin
printf '%s' "<v1-posthog-project-id>"        | pnpm exec wrangler secret put POSTHOG_PROJECT_ID   --name sevendays-v1-admin
```

**Evidence:** `curl -sS -o /dev/null -w '%{http_code}\n'
https://sevendays-v1-api.<subdomain>.workers.dev/health` → 200 (same for the
landing `/` and the admin `/login`); the dashboard renders at the admin's `/`
behind sign-in with the owner-created account.

### A7 The CI re-point — the `v1` environment's deploy identity

```bash
gh secret   set CLOUDFLARE_API_TOKEN -e v1 --body "<ship-token>" -R jeius/sevendays
gh variable set CLOUDFLARE_ACCOUNT_ID -e v1 --body "<account-id>" -R jeius/sevendays
```

The teaser environment never changes; environment history stays in one place
(spec § Ship topology). From here, pushes to `v1` deploy via CI onto the
dedicated account — the cutover push (B3) is the first.

**Evidence:** `gh secret list -e v1` / `gh variable list -e v1` show the
rotated names; nothing under the `teaser` environment changed.
```

- [ ] **Step 2: Commit**

```bash
cd /home/jeius/Projects/sevendays
git add docs/ship-provisioning-runbook.md
git commit -m "docs: the ship-provisioning runbook — accounting + Phase A, the dedicated stack (#191)"
```

**Not here:** Phase B (Task 3 appends it — the file is deliberately incomplete until then); no media-runbook edit (Task 4); no execution of anything (A1–A7 are #192's).

### Task 3: The runbook — the domain wait, Phase B

**Files:**
- Modify: `docs/ship-provisioning-runbook.md` (append Part 2 of 2)

**Interfaces:**
- Consumes: Task 1's `ship-media-copy.mjs` (B1); Task 2's Phase A (the workers, env, tokens all exist); the smoke workflow's dispatch contract (B4); the #198 Sentry-org ruling (B3's ruled divergence).
- Produces: the complete ceremony ending at the production smoke (AC 1); the cutover-commit documentation whose execution is #192's.

- [ ] **Step 1: Append Part 2 to `docs/ship-provisioning-runbook.md`**

Append exactly this content to the end of the file:

```markdown
## The wait — the client registers the domain

Phase B needs the client-registered domain `<domain>`. The client registers
it at their registrar; the owner adds the zone to the **dedicated account**
(DNS → Add a domain; the free plan), and the client points the registrar's
nameservers at the assigned Cloudflare pair; the zone goes Active. The zone
must live in the same account as the bucket and the workers — R2 has no
bucket-move, and the media custom domain requires the same-account placement
(ADR-0019 #4; the #129 ruling).

**Evidence:** the zone's Status reads Active in the dashboard.

## Phase B — the public stack

### B1 The media copy (scripted list+copy)

From the main checkout, with both accounts' S3 token pairs (the dev pair per
the media runbook's § Owner handoff; the fresh pair from A4):

```bash
cd ~/Projects/sevendays/apps/api
export SOURCE_R2_ACCOUNT_ID="<dev account id>" \
  SOURCE_R2_ACCESS_KEY_ID="<dev r2 access key id>" \
  SOURCE_R2_SECRET_ACCESS_KEY="<dev r2 secret access key>" \
  DEST_R2_ACCOUNT_ID="<account-id>" \
  DEST_R2_ACCESS_KEY_ID="<fresh-r2-access-key-id>" \
  DEST_R2_SECRET_ACCESS_KEY="<fresh-r2-secret-access-key>"
node scripts/ship-media-copy.mjs
```

The script skips `tmp/` staging, preserves each object's content-type and
immutable cache-control, and re-puts nothing half-way — a failed object
leaves the report line red and the exit code 1.

**Evidence:** the script's final line reads `n/n object(s), X MB` with exit
0; a `curl -sS -o /dev/null -w '%{http_code}\n' <one-copied-object-URL>`
on one copied key answers 200 with an `image/` content-type (serve it off
the fresh r2.dev base at this point).

### B2 Domains + DNS (once the zone is Active)

Owner, dashboard — all four hosts in the dedicated account:

1. **Apex** = landing: Workers & Pages → `sevendays-v1-landing` → Settings →
   Domains & Routes → Custom Domain → `<domain>` (auto cert, DNS created).
2. **`www` redirect** (the mechanism this runbook pins): DNS → add a
   **proxied** CNAME `www` → `<domain>`; then Rules → Redirect Rules →
   Create → Single Redirect: *When* `Hostname` equals `www.<domain>`, *Then*
   Dynamic redirect, 301, expression
   `concat("https://<domain>", http.request.uri.path)`, **Preserve query
   string** enabled. No redirect Worker, no Page Rule.
3. **`admin.`** = admin: Custom Domain `admin.<domain>` on
   `sevendays-v1-admin`.
4. **`api.`** = api: Custom Domain `api.<domain>` on `sevendays-v1-api`.
5. **`media.`** = the bucket's public base: R2 → `sevendays-media` →
   Settings → Public Development / Custom Domains → Connect Domain →
   `media.<domain>` (the zone is in-account, so the cert and DNS ride
   automatically). The r2.dev URL stays enabled until B4 verifies the flip.

**Evidence:** after cert issue — `https://<domain>` serves the landing,
`https://www.<domain>` answers 301 to the apex, `https://api.<domain>/health`
answers 200 with the fixed body, `https://admin.<domain>/login` renders the
sign-in form, and `https://media.<domain>/<a copied key>` serves the object.

### B3 The var flips + the cutover commit + the redeploy

Deploy vars bake per deploy — the flips below take effect with the cutover
push at the end of this step.

1. The `v1` environment flips to the production domains:

```bash
gh variable set API_URL               -e v1 --body "https://api.<domain>"      -R jeius/sevendays
gh variable set BETTER_AUTH_URL       -e v1 --body "https://admin.<domain>"    -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL -e v1 --body "https://media.<domain>"    -R jeius/sevendays
gh variable set E2E_BASE_URL          -e v1 --body "https://<domain>"          -R jeius/sevendays
```

2. The **cutover commit** on main (the ship-day release commit — documented
   here, executed with #192):

   - `.github/workflows/ci.yml`'s v1 leg, two values:
     `--var "CF_ANALYTICS_BUCKET:sevendays-v1-media"` →
     `--var "CF_ANALYTICS_BUCKET:sevendays-media"` (the binding's name; the
     `sevendays-v1-media` value landed at #187 pointing at a bucket that
     exists on no account), and
     `--var "POSTHOG_LANDING_HOSTS:sevendays-v1-landing.pahamajulius.workers.dev"`
     → `--var "POSTHOG_LANDING_HOSTS:<domain>"` (inline values cannot ride
     the account swap). The header comment's "no workflow edit" claim
     narrows to the account swap — amend that sentence in the same commit.
   - `apps/admin/src/components/dashboard/sentry-link.tsx`: the comment gains
     the edition split (main/teaser report to `jeius-dev`; the ship
     deployment reports to the `sevendays-studio` org — #198's ruling).

   Squash-merge, then pick to `v1` per docs/agents/v1-picks.md (ci.yml is
   byte-identical across the branches; the pick carries ONE ruled
   divergence: `SENTRY_CONSOLE_URL` re-pointed to
   `https://sevendays-studio.sentry.io/issues/` on the v1 side, recorded in
   the pick's Split line). Push `v1` — the first CI deploy onto the
   dedicated account, and #192's commit-green evidence: the run's `check`
   and `Deploy v1 (private)` jobs both green on the release commit.

3. The redeploy's post-conditions: `https://<domain>/api/v1/gallery` serves
   photoUrls on `https://media.<domain>/…` (the flip, live); the dashboard's
   Traffic section attributes the apex host.

**Evidence:** the CI run URL (check + deploy green); the gallery payload's
URLs under the media domain; `gh variable list -e v1` shows the four flipped
values.

### B4 The production smoke — the runbook's last step

```bash
gh workflow run e2e.yml --ref main -f environment=v1 -R jeius/sevendays
sleep 15
gh run list --workflow e2e.yml --limit 1 --json databaseId,status --jq '.[0]'
gh run watch <databaseId> --exit-status
```

Expected: **7 passed** — the seven assertions of
`e2e/smoke/production.spec.ts` against `https://<domain>`, including the
live media asset off the flipped base (assertion 4, the guard this whole
phase exists for) and the ship-side `smoke-staff` sign-in (assertion 7). A
red leg names its fix in the report artifact; ship does not complete on a
red gate. Two greens, separately recorded: this smoke, and commit-green on
the release commit (B3's CI run).

After green: disable the fresh bucket's r2.dev URL (the media runbook's
flip tail):

```bash
CLOUDFLARE_API_TOKEN="<ship-token>" CLOUDFLARE_ACCOUNT_ID="<account-id>" \
  pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url disable sevendays-media
```

Re-runnable: after any post-ship owner re-deploy (push to `v1` or owner-run
`wrangler deploy`), the same dispatch command re-verifies the domain.

**Evidence (the milestone's exit record):** the green run URL; the r2.dev
disable confirmation; #192's close-out (plan.md's M6 boxes, progress.md).

## What this runbook does not do

- **The teaser never moves** — its environment, workers, bucket, and r2.dev
  URL stay on the dev account.
- **M7's arrivals** — `RESEND_API_KEY` + `LANDING_ORIGIN` seat at M7's
  sending-domain task (ADR-0021); accounted in § the at-ship accounting,
  not shipped.
- **The Dec 1 2026 Cloudflare Observability pricing change** — re-verify at
  ship against Workers Logs' free tier (spec § Further Notes).
- **Staff provisioning beyond `smoke-staff`** — docs/staff-provisioning.md
  owns the owner account and every staff create/reset.
- **Handover mechanics + post-handover cadence** — M8.
```

- [ ] **Step 2: The self-consistency grep across the assembled runbook**

```bash
cd /home/jeius/Projects/sevendays
grep -c '### A\|### B\|## ' docs/ship-provisioning-runbook.md
grep -n 'ship-content-carry\|ship-media-copy' docs/ship-provisioning-runbook.md
```

Expected: the heading count matches the intended structure — **16** heading lines (the § accounting + Phase A's A1–A7 + the wait + Phase B's B1–B4 + "What this runbook does not do": five `## ` and eleven `### `); both script references resolve to the Task-1 filenames. Fix any drift at the source sentence before committing.

- [ ] **Step 3: Commit**

```bash
cd /home/jeius/Projects/sevendays
git add docs/ship-provisioning-runbook.md
git commit -m "docs: the ship-provisioning runbook — the domain wait, Phase B, the production smoke (#191)"
```

**Not here:** no media-runbook edit (Task 4); no ci.yml or sentry-link edit (the cutover commit is documented in B3, made at #192); no execution (B1–B4 are #192's).

### Task 4: The media runbook — fresh-bucket steps + the corrected M6 pointer

**Files:**
- Modify: `docs/media-bucket-runbook.md` (one section replaced, one intro sentence added)

**Interfaces:**
- Consumes: Task 2's A4/B1–B4 (the section mirrors them at the bucket-runbook level).
- Produces: AC 3 — the fresh-bucket recreation steps (CORS rule, lifecycle, tokens) in the runbook that owns bucket mechanics.

- [ ] **Step 1: Add the intro pointer sentence**

In `docs/media-bucket-runbook.md`, replace (old → new):

```markdown
changed ONCE, deliberately,
for both editions.
```

```markdown
changed ONCE, deliberately,
for both editions. At ship, the dedicated account's fresh same-named bucket
supersedes this sharing for the v1 workers — § Fresh bucket at ship below.
```

- [ ] **Step 2: Replace the M6 pointer section with the fresh-bucket section**

Replace the whole existing section (old → new) — the replacement also corrects the old pointer's "both GitHub environments" claim, which cannot apply to the teaser (its bucket is a different bucket on a different account; disabling the dev r2.dev URL would break the teaser's gallery):

```markdown
## M6 pointer (not this milestone)

Attach the custom domain (requires the zone in the SAME Cloudflare account as
the bucket — a recorded constraint on the ADR-0016 dedicated-account
rotation; R2 has no bucket-move), flip `MEDIA_PUBLIC_BASE_URL` in both GitHub
environments, disable the r2.dev URL, and start relying on the objects'
`cacheControl: immutable` for edge caching. Read-time URL resolution only —
no migration, no key rewrite.
```

```markdown
## § Fresh bucket at ship (docs/ship-provisioning-runbook.md A4 + B1–B4)

The dedicated ship account gets its own `sevendays-media` — bucket names are
per-account (the dev account's bucket above is untouched), and the v1 api's
`wrangler.toml` binding names `sevendays-media`, so the name carries.
Recreate, in order (placeholders per the ship runbook):

```bash
export CLOUDFLARE_API_TOKEN="<ship-token>" CLOUDFLARE_ACCOUNT_ID="<account-id>"
pnpm --filter @sevendays/api exec wrangler r2 bucket create sevendays-media
# CORS — same rule shape as above, the ship account's three admin origins:
#   http://localhost:3000
#   https://sevendays-v1-admin.<subdomain>.workers.dev   (pre-domain window)
#   https://admin.<domain>                                (production)
pnpm --filter @sevendays/api exec wrangler r2 bucket cors set sevendays-media --file cors.json
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle add sevendays-media tmp-gc tmp/ --expire-days 1 -y
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url enable sevendays-media
```

Then re-run § Owner handoff against the ship account: the fresh S3 token
pair (Object Read & Write, scoped to `sevendays-media` only, no TTL) — the
rotated pair of the at-ship accounting. Seal it in the `v1` GitHub
environment (A5) and on `sevendays-v1-api` (A6).

Media copies across once, scripted — `apps/api/scripts/ship-media-copy.mjs`,
the ship runbook's B1: every committed object listed from the dev bucket and
re-PUT into the fresh one with its content-type and immutable cache-control
preserved; `tmp/` never copies. The objects' `cacheControl` then carries the
custom domain's edge caching.

The custom domain + the flip (the ship runbook's B2–B4, correcting this
section's earlier both-environments claim): attach `media.<domain>` to the
fresh bucket (same-account zone — ADR-0019 #4; R2 has no bucket-move), flip
`MEDIA_PUBLIC_BASE_URL` in the **`v1` GitHub environment only** to
`https://media.<domain>`, redeploy, verify with the production smoke, and
only then disable the fresh bucket's r2.dev URL. The dev bucket's r2.dev URL
STAYS ENABLED — the teaser reads it. Read-time URL resolution only: no
migration, no key rewrite.
```

- [ ] **Step 3: Commit**

```bash
cd /home/jeius/Projects/sevendays
git add docs/media-bucket-runbook.md
git commit -m "docs(media): the fresh-bucket-at-ship steps + the corrected M6 pointer (#191)"
```

**Not here:** no changes to the media runbook's existing verified table, re-run commands, or § Owner handoff (they stay the dev-account record); no AGENTS.md rotation (#192's docs rotation owns it — nothing in AGENTS.md is now factually wrong).

---

### Task 5: The docs rotation

**Files:**
- Modify: `docs/progress.md` (ONE entry at the head of the log — above the #190 entry at line 3)
- Add: `docs/superpowers/plans/2026-10-11-191-ship-provisioning-runbook.md` (this file — already on disk; it rides the branch and lands in this commit)
- Modify (refresh only, NEVER committed here): `graphify-out/` via `graphify update .`

**Interfaces:**
- Consumes: Tasks 1–4 (the entry describes them).
- Produces: the progress record Task 6's PR carries.

- [ ] **Step 1: The progress entry**

In `docs/progress.md`, insert this entry as the NEW head of the log — directly under `# Progress` and ABOVE the `2026-10-10 — #190` entry — verbatim (date the landing day; `2026-10-11` if executing today):

```markdown
2026-10-11 — #191, M6 ticket 09, the ship-provisioning runbook, landed: `docs/ship-provisioning-runbook.md` — the ordered, owner-operated ship ceremony ending at the production smoke as its last step (spec #182 § Ship-time provisioning). Phase A, the dedicated stack with no client dependency: the Cloudflare account + the scoped ship token + the workers.dev subdomain → the Supabase org/project with the ADR-0007 pooler pair (transaction 6543 / session 5432) → migrations 0000→latest + the catalog seed + the content carry + the ship-side `smoke-staff` → the fresh `sevendays-media` bucket (CORS with the production admin origin, the tmp-gc lifecycle, the rotated S3 pair, r2.dev for the pre-domain window) → the complete `v1` GitHub-environment write-up (incl. the `sevendays-studio` Sentry org born at ship and the dedicated v1 PostHog project) → the dry-run-gated, owner-run `wrangler deploy` from the v1 checkout mirroring ci.yml's v1 leg exactly (with the two inline values already corrected) → the CI re-point (token + account id; the teaser environment never changes). Then the client-domain wait, then Phase B: the scripted media copy → the four custom domains (apex landing, the pinned `www` single-redirect mechanism — proxied CNAME + one 301 rule preserving path and query, `admin.`, `api.`, `media.`) → the var flips + the cutover commit + the redeploy → the dispatch smoke expecting **7 passed**, then the r2.dev disable. Two owner-ratified amendments woven in at their spec homes (2026-10-11 plan session): the CONTENT CARRY — a read-only probe proved every catalog family drifted past the 2026-09-01 seed (latest edits 2026-09-30; 14 packages, 7 branches, 7 print sizes, 4 attires, 4 add-ons, 6 studio services, 4 gallery categories, 13 gallery photos, 3 testimonials, 3 covers) and the seed covers zero gallery/testimonial rows, so a seed-only fresh DB would ship stale prices and an empty gallery, leaving smoke assertion 4 red by design — migrations + seed run as ruled, then the carry overwrites the catalog with the curated live state; and the CUTOVER-COMMIT reconciliations — ci.yml's v1-leg `CF_ANALYTICS_BUCKET:sevendays-v1-media` → `sevendays-media` (a bucket existing nowhere; the #187 inline value vs the v1 branch's actual binding), `POSTHOG_LANDING_HOSTS`' dev-account host → the production apex (both inline values, unfixable by environment swap), and the #198-ruled `SENTRY_CONSOLE_URL` flip to the `sevendays-studio` org on the v1 side of the pick. The two scripts the runbook drives landed with it, edition-neutral so the pick is clean: `packages/db/scripts/ship-content-carry.mjs` (one-transaction reverse-FK delete + forward-FK insert over the 14 catalog/content tables, count-verified both sides, auth/appointments/audit_log/rate_limit never crossing) and `apps/api/scripts/ship-media-copy.mjs` (aws4fetch list+GET+PUT cross-account — the media.ts client construction mirrored on 1.0.20 — content-type + immutable cache-control preserved, `tmp/` skipped, fail-loud with a curated env message). `docs/media-bucket-runbook.md` gained § Fresh bucket at ship and its M6 pointer was corrected (the flip is the `v1` environment's var only; the dev bucket's r2.dev stays enabled for the teaser). NOTHING IS EXECUTED — #192 walks the runbook with the owner; M6's plan.md boxes flip there. Gates: `pnpm check` 35/35 + `pnpm build` 7/7 (no `src/` touched; the scripts are the `backfill-positions.mjs` owner-tooling class — biome + `node --check`, no test additions by ruling).
```

- [ ] **Step 2: The graph refresh (churn stays uncommitted)**

```bash
cd /home/jeius/Projects/sevendays
graphify update .
```

Expected: the incremental AST update runs clean (no API cost). The resulting `graphify-out/` churn — mixing with the tree's PRE-EXISTING dirty graph state — is NOT committed by this plan: Step 3's `git add` names its files, and the churn belongs to the owner's next graph commit.

- [ ] **Step 3: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check   # expect 35/35 — no suite can have moved
pnpm build   # expect green (7/7)
git add docs/progress.md docs/superpowers/plans/2026-10-11-191-ship-provisioning-runbook.md
git commit -m "docs: #191 — the ship-runbook progress entry + the plan file (#191)"
```

Expected: both gates green (any failure means the branch drifted — stop and re-derive, never commit a red gate); the commit carries exactly the two named files (`git status --porcelain` still shows the pre-existing dirty graphify-out/CONTEXT files — correct, leave them).

**Not here:** no AGENTS.md rotation (#192's close-out owns the status prose — verify with a read; nothing is now factually wrong); no `docs/plan.md` tick (M6's boxes flip at #192); no ADR (the carry is a data operation, the ci fixes are value corrections, the Sentry split was ruled at #198 — nothing architectural).

### Task 6: The PR, the close-out, the v1 pick (expected SPLIT — scripts picked, docs dropped), the ledger row

**Files:**
- Modify (bookkeeping): the PR, issue #191's body (checkbox flips), `docs/agents/v1-picks.md` (the ledger row), the v1 checkout (`~/Projects/sevendays-v1-seed`) via the pick.

**Interfaces:**
- Consumes: Tasks 1–5 (branch `feat/191-ship-provisioning-runbook` complete).
- Produces: the squash-merged PR, the ticked issue, the executed pick (the two scripts on `v1`), and the ledger row.

- [ ] **Step 1: The PR**

```bash
cd /home/jeius/Projects/sevendays
git push -u origin feat/191-ship-provisioning-runbook
gh pr create --title "docs: the ship-provisioning runbook — the owner-operated ceremony ending at the production smoke (#191)" --body-file - <<'EOF'
Closes #191 (spec #182 § Ship-time provisioning, topology, domains, secrets).

- `docs/ship-provisioning-runbook.md`: the ordered, owner-operated ceremony — Phase A (account → Supabase → DB → bucket → secrets/vars → dry-run-gated deploy → CI re-point), the client-domain wait, Phase B (media copy → domains + the pinned www single-redirect → var flips + the cutover commit + redeploy → the production smoke, then the r2.dev disable). Every step ends with an Evidence line; the at-ship accounting table reconciles rotated / carried / provisioned / M7-accounted.
- Two owner-ratified amendments at their spec homes: the content carry (the 2026-10-11 probe — every catalog family drifted past the seed, gallery/testimonials seed-born-empty) and the cutover-commit reconciliations (the two ci.yml v1-leg inline values + the #198 Sentry-org flip).
- `packages/db/scripts/ship-content-carry.mjs` + `apps/api/scripts/ship-media-copy.mjs`: the runbook's two steps as runnable files (edition-neutral, fail-loud env contracts, one-transaction / one-shot semantics, count-verified).
- `docs/media-bucket-runbook.md`: § Fresh bucket at ship + the M6 pointer corrected (the flip is v1-only; the teaser's r2.dev stays).

Nothing executed — #192 walks it. Gates: check 35/35, build 7/7 (no src touched).
EOF
```

- [ ] **Step 2: Squash-merge + capture the SHA**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git log --oneline -1   # record this SHA — the triage input
```

- [ ] **Step 3: The issue close-out — flip the three AC boxes**

The PR's "Closes #191" closed the issue; its acceptance checkboxes still read unticked. Fetch the body, flip the three `- [ ]` lines under `## Acceptance criteria` to `- [x]` (GitHub issue checkboxes use `[x]`, not the repo-docs `✅`), and write it back:

```bash
gh api repos/jeius/sevendays/issues/191 --jq .body > /tmp/191-body.md
# edit /tmp/191-body.md: the three Acceptance criteria lines `- [ ]` → `- [x]`
gh issue edit 191 --body-file /tmp/191-body.md
gh issue comment 191 --body "The runbook is ordered owner-operated ending at the smoke (its § B4), the accounting table reconciles the spec's list in full, and the media runbook carries the fresh-bucket steps. Execution is #192's walk."
```

- [ ] **Step 4: The v1 pick — expected SPLIT**

```bash
cd /home/jeius/Projects/sevendays
node scripts/v1-triage.mjs <sha>
```

Expected path verdict: **SPLIT — 4 v1-paths + 2 main-only.** v1-paths: `docs/ship-provisioning-runbook.md`, `docs/media-bucket-runbook.md`, `packages/db/scripts/ship-content-carry.mjs`, `apps/api/scripts/ship-media-copy.mjs`; main-only: `docs/progress.md`, the plan file (`docs/progress.md` rides `paths.txt`; `docs/superpowers` likewise). Content pass on the two doc v1-paths: every hunk names the editions, the teaser, the seed, the handover, `v1`/ship — **edition mechanics → both dropped**. The two scripts: edition-neutral by construction, zero absence tokens (`scripts/audit-v1-absence.mjs --list-tokens` confirms) → **both picked**. Execute:

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git cherry-pick -x <sha>          # two new files — clean apply expected; conflicts → § Conflict policy of docs/agents/v1-picks.md
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'   # then: gh run watch <id> --exit-status
```

Verify the provenance line `(cherry picked from commit <full-sha>)` against `git rev-parse` before pushing (the #171/#188 typo class). Expected: check green, `Deploy v1 (private)` success (a no-op re-deploy of the same code onto the dev-account v1 workers — harmless; the ship re-point is #192's), `Deploy teaser (main)` skipped. Record the v1 SHA.

- [ ] **Step 5: The ledger row**

Append one row to the `docs/agents/v1-picks.md` ledger table (a commit on main, itself a skip), per the table's shape — Merged date, the PR number from Step 1, the main SHA from Step 2, verdict `split`, the v1 SHA from Step 4. The notes must name: the payload (the ship-provisioning runbook + its two owner-tooling scripts + the media runbook's fresh-bucket section), the classifier's SPLIT (4 v1-paths + 2 main-only), the content-pass drops (both docs — edition mechanics: editions/teaser/seed/handover naming throughout), the two picks (new files, `-x` clean apply, edition-neutral by construction — the plan's Global Constraint), the locks (frozen install zero lockfile diff, build:packages + api build green, check 35/35, build 7/7, audit PASS), and the run proof. Commit:

```bash
cd /home/jeius/Projects/sevendays
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #191 ledger row — the ship runbook split (docs dropped, scripts picked) (#191)"
```

**Not here:** no ceremony execution of any kind (#192 walks the runbook with the owner — accounts, DB, bucket, secrets, deploys, domains, the smoke); no `v1` GitHub-environment change (the runbook's A5/A7/B3 are its steps); no ci.yml or `sentry-link.tsx` edit (the cutover commit is B3-documented, #192-executed); no `docs/plan.md` tick and no AGENTS.md status rotation (#192's close-out).
