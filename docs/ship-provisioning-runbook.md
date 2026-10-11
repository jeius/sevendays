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
