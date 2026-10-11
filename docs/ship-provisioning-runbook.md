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
