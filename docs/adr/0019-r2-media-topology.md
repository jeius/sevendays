# ADR-0019: R2 media topology — presigned direct upload, public bucket, object-key storage

**Status:** Accepted
**Date:** 2026-09-25

## Context

M5's CMS makes the studio's photographs first-class: package cover photos and a gallery, uploaded by staff in batches (the studio norm), served on the landing site. The browser must upload large straight-from-camera JPEGs (up to ~50 MiB medium-format originals), so relaying every byte through the API Worker is the wrong shape (body limits, CPU cost, serialization). At the same time the API must stay the only writer of database rows and the only place storage keys are known — the frontends speak URLs, never keys. How uploads are authorized, how a bucket is exposed for public reads, and what the database stores are one topology decision (the ADR `AGENTS.md` names as its example: "how R2-stored images are served"). Research pinned the mechanics against current Cloudflare docs (#129 — `docs/research/2026-09-24-r2-media-pipeline.md`, branch `research/r2-media-pipeline`); this ADR records what that research upheld and refined.

## Decision

1. **Presigned direct-to-R2 uploads.** The browser PUTs straight to R2 on a sigv4 presigned URL minted by the API Worker with `aws4fetch` (no Workers-binding-native presign exists; an R2 API token scoped Object-Read-Write to `sevendays-media` only). The presign endpoint is session-gated (`requireSession`) and enforces **content type** (signed into the URL) and the key scheme; **size is only declared** at presign — a presigned PUT cannot carry a size condition.
2. **Trust-but-verify with the commit as the gate.** The entity-persist endpoint (package PUT with a changed cover, gallery-photo POST) runs the real check: binding `head()` (strongly consistent) verifies existence, type, and size; violations **delete the object and 400**. Staging-prefix flow: presign to `tmp/<uuid>` → verify → binding promote to an **immutable final key** (`covers/<uuid>.jpg`, `gallery/<uuid>.jpg`, `cacheControl: immutable`) → delete staging → persist the final key. Replace = new key + DB update + delete the old key (never overwrite in place). Orphans in `tmp/` are GC'd by a prefix-scoped lifecycle rule (expire after 1 day) — no cron, no sweeps.
3. **Object keys in the DB, URLs at read time.** Every read resolves absolute URLs against `MEDIA_PUBLIC_BASE_URL`; raw keys never leave the API. The M6 custom-domain swap is a var flip plus bucket config — no migration, no key rewrite.
4. **Public bucket reads, dev-only now.** The bucket's r2.dev Public Development URL serves M5 (teaser admin previews + teaser landing) — officially development-only and rate-limited. Production reads come at M6 via a custom domain, which requires the zone in the **same Cloudflare account as the bucket** — a recorded constraint on the ADR-0016 dedicated-account rotation (R2 has no bucket-move).
5. **One bucket, one DB, both editions.** `sevendays-media` is shared by the teaser and v1 API Workers — required, not just acceptable: the editions share a database, so catalog rows point at the same keys from both sides. Both Workers carry the binding + S3-token secrets; CORS lists both admin origins; bucket-level config is edition-shared; deletes are entity-lifecycle events driven by the shared DB (no per-edition deletes).
6. **Admin thumbnails via the Images binding** (free tier, transforms bytes straight from the R2 binding through a gated by-id route) — no public read path needed, no client-side resize anywhere. Landing-side transformations are M6 (URL transformations need the custom domain).

## Alternatives Considered

- **Relay uploads through the API Worker** (`MEDIA_BUCKET.put(request.body)`) — rejected: no S3 credentials, but pays Worker request-body limits uncomfortably close to the cap, per-file CPU/invocation cost, and serializes studio batch uploads through one Worker.
- **Presign directly to final keys** — rejected: trades one cheap promote copy for standing orphan reconciliation (listing keys and diffing against the DB); the staging prefix + lifecycle rule makes orphan GC free.
- **Store resolved URLs in the DB** — rejected: couples rows to the serving domain and forces a migration at every domain change; keys are domain-independent by design.
- **Overwrite-in-place on replace** — rejected: breaks immutable cache semantics on the future custom domain; new-key-per-upload keeps `cacheControl: immutable` correct.

## Consequences

- New owner-operated setup (runbook in the research doc, referenced by the M5 spec): bucket, scoped S3-token secrets on both api Workers, CORS for the exact admin origins, the `tmp/` lifecycle rule, the r2.dev toggle, `CLOUDFLARE_ACCOUNT_ID` + `MEDIA_PUBLIC_BASE_URL` vars.
- Caps carry one honest trade: `image/jpeg` only, 50 MiB/file covers medium-format originals, but files over the Images binding's 20 MB input skip thumbnailing (they fall back to the original in the admin grid).
- Expired presigns 403 without CORS headers (an opaque browser error) — mitigated by minting per file on demand, never hoarding URLs.
- M6 inherits three obligations: same-account zone+bucket placement (or a bucket copy), the var flip, and disabling r2.dev once the domain is live.
- Bucket-level config (CORS, lifecycle, domain, cache rules) is edition-shared by construction — one deliberate change serves both editions.
