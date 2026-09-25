# Media bucket runbook — `sevendays-media` (ADR-0019)

One-time provisioning for the M5 media pipeline (ticket #136), executed by the
controller on 2026-09-26 and re-runnable from this document. The bucket is
edition-shared by construction (ADR-0019 #5): both API Workers
(`sevendays-api`, `sevendays-v1-api`) bind it, and bucket-level config (CORS,
lifecycle, r2.dev, the future custom domain) is changed ONCE, deliberately,
for both editions.

## What exists (verified 2026-09-26)

| Piece | Value | Verify (read-only) |
| --- | --- | --- |
| Bucket | `sevendays-media` | `pnpm --filter @sevendays/api exec wrangler r2 bucket info sevendays-media` |
| CORS | PUT + `content-type` + exposed `ETag` for the three admin origins | `… r2 bucket cors list sevendays-media` |
| Lifecycle | rule `tmp-gc`, prefix `tmp/`, expire after 1 day | `… r2 bucket lifecycle list sevendays-media` |
| Public dev URL | enabled — base recorded as `MEDIA_PUBLIC_BASE_URL` | `… r2 bucket dev-url get sevendays-media` |

The three admin origins (exact match, no trailing slash): `http://localhost:3000`
(admin dev — `apps/admin` runs `vite dev --port 3000`),
`https://sevendays-admin.pahamajulius.workers.dev` (teaser),
`https://sevendays-v1-admin.pahamajulius.workers.dev` (v1). Keep this list in
sync when Worker names or origins change — CORS rule fields map 1:1 to browser
behavior: `content-type` must be allowed (it is signed into the presigned URL),
`ETag` is exposed so the browser can verify its upload.

## Re-run / repair commands

```bash
# bucket (skip if info above succeeds)
pnpm --filter @sevendays/api exec wrangler r2 bucket create sevendays-media

# CORS — write the rule JSON to a scratch file, then:
pnpm --filter @sevendays/api exec wrangler r2 bucket cors set sevendays-media --file cors.json
pnpm --filter @sevendays/api exec wrangler r2 bucket cors list sevendays-media

# lifecycle GC for staging orphans (uploaded-but-never-committed objects;
# also cleans crashed-between-promote-and-delete leftovers; delete is unbilled)
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle add sevendays-media tmp-gc tmp/ --expire-days 1 -y
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle list sevendays-media

# public reads for admin previews (dev-only, rate-limited — never the
# production answer; the M6 custom domain replaces it)
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url enable sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media
```

## Vars and secrets — where each value lives

Neither the Workers nor this repo commit per-environment values (the
`LANDING_ORIGIN` posture). Four values, four homes:

| Name | Kind | Remote home | Local dev home |
| --- | --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | plain value | GitHub environment **variable** (`teaser`, `v1`) → passed to `wrangler deploy --var` by CI | `apps/api/.dev.vars` |
| `MEDIA_PUBLIC_BASE_URL` | plain value | GitHub environment **variable** (`teaser`, `v1`) → `wrangler deploy --var` | `apps/api/.dev.vars` |
| `R2_S3_ACCESS_KEY_ID` | credential | Worker secret (`wrangler secret put`) + GitHub environment **secret** (CI sync) | `apps/api/.dev.vars` |
| `R2_S3_SECRET_ACCESS_KEY` | credential | Worker secret + GitHub environment secret | `apps/api/.dev.vars` |

Capture commands:

```bash
gh variable set CLOUDFLARE_ACCOUNT_ID --env teaser --body "<account id>" -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL --env teaser --body "$(pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media | grep -o 'https://pub-[a-z0-9]*\.r2\.dev')" -R jeius/sevendays
# repeat with --env v1
```

Local dev (`apps/api/.dev.vars` — gitignored; `apps/api/.dev.vars.example`
documents every key): append the four keys above. Without the S3 pair the
Worker boots and every route serves; only the presign route fails loudly
(`MissingR2CredentialsError` → the uniform 500 + log — the
`BETTER_AUTH_SECRET` posture, never a silent fallback).

## § Owner handoff — minting the scoped R2 S3 token (owner-operated, ~5 minutes)

The presign endpoint signs upload URLs with an R2 API token scoped to this
bucket only. No such token exists yet (verified 2026-09-26). To mint it:

1. dash.cloudflare.com → R2 → **Account Details** → **Manage R2 API Tokens** →
   **Create API Token**.
2. Permissions: **Object Read & Write**. Scope: **Apply to specific buckets
   only** → `sevendays-media`. TTL: no expiry (rotate at the M6 account
   handover). Create.
3. Copy the **Access Key ID** and **Secret Access Key** — the secret is shown
   ONCE, at creation. Treat both as credentials (they grant object writes).
4. Set them everywhere they are consumed:

```bash
# both API Workers (the deployed teaser + v1 editions)
printf '%s' "<access-key-id>"     | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_ACCESS_KEY_ID     --name sevendays-api
printf '%s' "<secret-access-key>" | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_SECRET_ACCESS_KEY --name sevendays-api
printf '%s' "<access-key-id>"     | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_ACCESS_KEY_ID     --name sevendays-v1-api
printf '%s' "<secret-access-key>" | pnpm --filter @sevendays/api exec wrangler secret put R2_S3_SECRET_ACCESS_KEY --name sevendays-v1-api

# both GitHub environments (the CI deploy legs sync them on every push)
gh secret set R2_S3_ACCESS_KEY_ID     --env teaser --body "<access-key-id>"     -R jeius/sevendays
gh secret set R2_S3_SECRET_ACCESS_KEY --env teaser --body "<secret-access-key>" -R jeius/sevendays
gh secret set R2_S3_ACCESS_KEY_ID     --env v1 --body "<access-key-id>"     -R jeius/sevendays
gh secret set R2_S3_SECRET_ACCESS_KEY --env v1 --body "<secret-access-key>" -R jeius/sevendays

# local dev
# append R2_S3_ACCESS_KEY_ID=… and R2_S3_SECRET_ACCESS_KEY=… to apps/api/.dev.vars
```

5. Prove it live (no deploy needed — the secrets are read per request):

```bash
cd apps/api
LIVE_MEDIA_VERIFY=1 \
R2_S3_ACCESS_KEY_ID="<access-key-id>" \
R2_S3_SECRET_ACCESS_KEY="<secret-access-key>" \
CLOUDFLARE_ACCOUNT_ID="<account id>" \
pnpm test -- media-live
```

Expected: `3 passed` (the round-trip promote, the swapped-Content-Type 403,
the over-cap delete-and-400 — see § Live round-trip verify).

## § Live round-trip verify

`apps/api/test/media-live.test.ts` runs the REAL presign + commit service code
against the REAL bucket. It is **not a CI gate**: the file skips (3 skipped)
unless `LIVE_MEDIA_VERIFY=1` AND all three credential vars are set, so `pnpm
check` never needs — never touches — the bucket. It proves, live:

- presign → PUT with the minted Content-Type → `commitUpload` HEAD-verifies,
  promotes to the immutable final key, deletes the staging key;
- a PUT with a swapped Content-Type fails the signature (403
  `SignatureDoesNotMatch` — Content-Type is signed in);
- an object over the 50 MiB cap is deleted from the bucket and answered
  400-shaped with field details.

## M6 pointer (not this milestone)

Attach the custom domain (requires the zone in the SAME Cloudflare account as
the bucket — a recorded constraint on the ADR-0016 dedicated-account
rotation; R2 has no bucket-move), flip `MEDIA_PUBLIC_BASE_URL` in both GitHub
environments, disable the r2.dev URL, and start relying on the objects'
`cacheControl: immutable` for edge caching. Read-time URL resolution only —
no migration, no key rewrite.
