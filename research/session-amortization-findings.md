# Research #281 — Session-verify amortization design (admin cookieCache + api session cache)

**Date:** 2026-11-14 · **Branch:** `research/session-amortization` · **For:** the M8 admin-CMS latency spec
**Ruled contract (map #279, owner rulings 2026-11-14):** BetterAuth `cookieCache` on the admin shell gate + a token-hash→session cache on the api's `requireSession` over the Workers Cache API, **60 s TTL, per-colo**, and a **≤60 s revocation lag after demotion/deactivation/logout is acceptable**.

**Method note:** every BetterAuth claim below was verified against BOTH the v1.7 docs and the installed `better-auth@1.7.5` dist in `node_modules` (the repo's "verified in dist" convention) — the docs describe the shape, the dist is what runs. File paths under `dist/` are relative to `node_modules/.pnpm/better-auth@1.7.5_*/node_modules/better-auth/`.

---

## Verdict

Build BOTH halves; they are independent, compose with everything standing, and neither changes what the other must verify.

1. **Admin half** — enable `session.cookieCache = { enabled: true, maxAge: 60 }` in `apps/admin/src/lib/auth.ts`. Verified semantics: a cache hit serves `getSession` from a signed `session_data` cookie with **zero DB I/O**; the token cookie is still signature-verified first, so the hit path is *as strong as today minus the row read*. The DB-backed read (and therefore the daily refresh check and the cache re-issue) still runs at least once per 60 s of activity.
2. **API half** — add `apps/api/src/services/session-cache.ts` (the `read-cache.ts` pattern, one more seam): `requireSession` looks up `sha256(secretFingerprint + presentedBearerValue)` → cached `{session, user}` JSON in `caches.default` (60 s TTL, synthetic origin), and only on a miss runs today's BetterAuth verify and back-fills the cache. Key contains **only a hash** — never the raw token in the key, a log, or an error.
3. **Revocation is TTL-only, by design** — every revocation path in this system (sign-out, ban, remove, Users-tab session revoke, password reset) deletes the session row from Postgres, and **none of them executes inside the api**, so no api-side eviction hook can exist without new cross-app machinery the ruling already renders unnecessary. The bound is: **a revoked or expired session may continue to pass `requireSession` for at most 60 s after its row disappears, per colo.** The admin shell gate carries the identical 60 s bound via `maxAge: 60`.
4. **This is a latency lever, not a CPU lever, on the api** — the per-request fresh Postgres connect (ADR-0025's measured 7.3–12.4 ms CPU) simply moves from the verify query to the entity query, because admin entity reads stay uncached by ADR-0025's fence. What disappears is the **serial round trip** (PH→SG RTT) of the session read in front of every admin read — and the gallery thumb proxy's N-parallel-verify storm collapses to one miss + N−1 hits.
5. **The M4 deferral ("measure before adding machinery", spec line 173) is discharged by M8's baseline ticket** — this design lands only with the baseline capture proving session verify is a measurable phase (the map's key facts already establish it: 1–2 serial DB queries per admin read on every request).

---

## Part 1 — The admin half: `cookieCache` on the shell gate

### 1.1 What BetterAuth 1.7.5 actually does (verified in dist)

`getSession` (`dist/api/routes/session.mjs`) runs this decision tree when `session.cookieCache.enabled`:

1. **The session token cookie is read and signature-verified FIRST** (`getSignedCookie(sessionToken.name, secret)`). No token cookie → `null` immediately. The `session_data` cookie alone can never authenticate anyone.
2. If a `session_data` cookie exists it is decoded (`decodeCookieCache`): default **compact** strategy = base64url of `{ session: {session, user, updatedAt, version}, expiresAt, signature }` where `signature` is **HMAC-SHA-256 over the payload with the instance secret** (`dist/cookies/index.mjs`). Tamper or bad signature → cookie expired, fall to DB.
3. The cached payload is used **only if all guards pass**: the payload's session token **equals** the verified token cookie; the optional `version` matches; the cache's own `expiresAt` (issue time + maxAge) is in the future; and the underlying session's `expiresAt` is in the future. Any failure → expire the cookie, fall to DB.
4. **Hit → return `{session, user}` parsed from the payload. Zero database I/O.** The 1.7.5 return path adds no marker flag — the hit's shape is identical to a DB read (older docs mentioned `dataCached`; 1.7.5 does not).
5. **Miss → today's path unchanged**: `internalAdapter.findSession(token)` (one joined session+user read), expired-row cleanup, the `updateAge` refresh check, and — the new bit — `setCookieCache(ctx, session)` **re-issues the `session_data` cookie on every DB-backed read** (`session.mjs` line 222), stamped to expire in `cookieCache.maxAge`.

Defaults confirmed in dist: `session_data` cookie `maxAge` defaults to **300 s** if `cookieCache` is enabled without one (`dist/cookies/index.mjs` line 50: `options.session?.cookieCache?.maxAge || 300`) — so the config must set `maxAge: 60` explicitly to honor the ruling. `cookieCache.refreshCache` (the stateless re-issue-at-80% option) **auto-disables with a warning when a database is configured** (`dist/context/create-context.mjs` lines 150–165) — this repo is stateful, so it stays off; irrelevant here.

### 1.2 The config change

`apps/admin/src/lib/auth.ts`, the existing session block (line 71):

```ts
session: {
  expiresIn: 60 * 60 * 24 * 7,
  updateAge: 60 * 60 * 24,
  cookieCache: { enabled: true, maxAge: 60 }, // #281: the shell gate's amortization — 60 s, the ruled revocation bound
},
```

Compact strategy (the default) — no `strategy` key needed. **Do not enable `cookieCache` on the api's verification instance** (`apps/api/src/services/auth.ts`): it is cookie-shaped machinery, the api receives `Authorization: Bearer`, and the api's cache is the Workers Cache half below.

### 1.3 Interplay with the 7-day / daily-refresh config

- **The daily `updateAge` refresh still happens.** It only runs on DB-backed reads; with `maxAge: 60` a DB read happens at least once per minute of active browsing, so refresh checks are *more* frequent than today-per-navigation in the worst case and never starved. A 5-minute default maxAge would also never starve (5 min ≪ 1 day), but 60 s is the ruled bound.
- **Refresh does not rotate the token.** `updateSession` extends `expiresAt` only; the cookie-cache guard (`session.session.token !== sessionCookieToken`, `session.mjs` line 57) exists for flows that do rotate tokens (impersonation, bearer re-issue) and simply passes here.
- **Cross-app staleness of `expiresAt` is benign.** The api's verification instance can refresh the DB row first (it uses default session config — same 7 d/1 d values); the admin's cached `expiresAt` is then older-but-still-future. Validity checks against the cached value are conservative. Corrected at the next cache expiry (≤60 s).
- **The api's verification instance should pin its session config explicitly** (optional one-line hardening in `createVerificationAuth`): `session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }`. Today it relies on BetterAuth defaults that happen to equal the admin's pinned values; pinning removes a defaults-drift churn risk between the two instances.

### 1.4 Failure modes

| Failure | Behavior |
|---|---|
| `session_data` cookie never lands (server-fn `setCookie` swallowed) | Degrades to today: every `getSession` pays the DB. The `tanstackStartCookies()` adapter sets cookies via `@tanstack/react-start/server`'s `setCookie` with a **silent try/catch** (`dist/integrations/tanstack-start.mjs`) — performance-only failure, never a correctness failure. **The spec's verification section must pin a dev check that the `session_data` cookie is actually Set from the `getSession` server fn** (`apps/admin/src/lib/auth.functions.ts`); if it ever does not, the fallback is mounting the gate's read on the `/api/auth/$` route handler instead. |
| Tampered/garbage `session_data` | HMAC verify fails → cookie expired → DB fallback. Fail-open-to-DB. |
| Revoked session (row deleted) mid-window | Gate passes ≤60 s (the ruled lag); at expiry the DB read returns null → cookie cleared → redirect to /login. |
| **Self sign-out is immediate on that device** | Verified: `deleteSessionCookie` expires **both** `session_token` and `session_data` (plus chunk cleanup) — `dist/cookies/index.mjs`. The lag applies to *other* holders of the credential (other devices, the api cache), not the signing-out browser. |
| Role change (`setRole`) | Does not revoke sessions; the cached `user.role` is stale ≤60 s. The shell context's `role` (consumed by the ADR-0018 owner-only nav) is within the ruled lag. |
| Sensitive BetterAuth operations | Not exposed to the cache: 1.7.5 bypasses the cookie cache for the sensitive class via `disableCookieCache` when a server-side store exists (`session.mjs` lines 235+; docs: passkey registration, 2FA, account linking always take the authoritative read). |
| Cookie size | Compact payload ≈ session+user JSON + HMAC ≈ well under 1 KB at staff scale; chunking exists if a future `customSession` bloats it (custom fields are not cached — documented). |
| `customSession` fields | Docs: cookie caching "does not include custom fields" — this repo defines none. |

### 1.5 What the admin half does NOT change

- **The api's verify path is untouched.** The admin forwards the `session_token` cookie verbatim as Bearer (`apps/admin/src/lib/api.server.ts`), and its suffix-match **already excludes** `session_data` ("session_data is a different cookie — excluded by the exact suffix", `api.server.ts` lines 66–69). No admin change beyond the config line.
- The login round-trip, provisioning CLI, and reset flow are untouched (cookieCache only adds a read optimization to `getSession`).

### 1.6 Touch points (admin half)

- `apps/admin/src/lib/auth.ts` — the one config line (§1.2).
- `docs/specs/<m8>` verification section — the dev check that `session_data` is set from the `getSession` server fn, and the live revocation check (sign out → immediate bounce on that device; ban → gate closes ≤60 s).
- Admin tests: the lib seam (`auth.ts` purity law) is unchanged; nothing new to pin in vitest — the behavior is BetterAuth's, proven by the spec's live checks. (Optional cheapest pin: a config-shape assertion that the session block carries `cookieCache.maxAge === 60`, in the existing lib-seam style.)

---

## Part 2 — The api half: token-hash session cache in `requireSession`

### 2.1 Design (the `read-cache.ts` pattern, second instance)

**New file `apps/api/src/services/session-cache.ts`**, mirroring `apps/api/src/services/read-cache.ts`:

```ts
export const SESSION_CACHE_TTL_SECONDS = 60;
export const SESSION_CACHE_KEY_ORIGIN = 'https://session-cache.sevendays.internal'; // own origin — namespaces disjoint from read-cache

export interface SessionCacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  // no evict() — deliberately. See §2.4.
}
```

- **Default store:** `caches.default` under workerd, **null under plain Node/vitest** — the identical `defaultStore()` seam as `read-cache.ts` (the `observability/capture.ts` posture). `get` = `cache.match(new Request(key))` → `text()`; `set` = `cache.put(new Request(key), new Response(value, { headers: { 'cache-control': 'private, max-age=60' } }))`. **All cache I/O best-effort** — match resolves null on error, put swallows; a cache failure degrades to uncached behavior and never fails a request (ADR-0025's law).
- **Override seam:** `setSessionCacheStore` / `resetSessionCacheStore` / `getSessionCacheStore`, same shape as the read-cache trio.

**Key design — hash only, never the raw token:**

- Input: the `Authorization` header value with the `bearer ` prefix stripped (case-insensitive, matching the bearer plugin's own parse), trimmed, **verbatim — no percent-decoding**. The plugin's decode is a pure function of the presented value, so identical presented values verify identically; a differently-encoded presentation of the same token just lands on a different key (worst case a miss, never a wrong hit). The admin always forwards one form.
- `key = ${SESSION_CACHE_KEY_ORIGIN}/${hex(sha256(secretFingerprint + ':' + tokenPart))}` where `secretFingerprint = hex(sha256(BETTER_AUTH_SECRET)).slice(0, 16)`. Including the fingerprint means **secret rotation re-keys the whole cache** — entries signed under the old secret become unreachable and age out by TTL; no stale-allow window.
- The raw token never appears in the key, a log line, an error, or the Application Log. The `x-request-id` correlation is untouched (this middleware sits below the logging root).

**Value shape — the verified `{session, user}` verbatim:**

- `JSON.stringify(session)` of exactly what `auth.api.getSession` returned (BetterAuth's `SessionData`). On hit: `JSON.parse`, then the **expiry guard** — `new Date(value.session.expiresAt) > now`, else treat as miss (do not re-put). Dates serialize to ISO strings; the api's only consumers are `session.user.id` and `session.user.email` (`apps/api/src/services/audit.ts` lines 43–55; `apps/api/src/observability/request-context.ts` line 39; `events.ts` line 64) — strings, no `Date` consumer exists. Pin that in the seam test.
- Store **verbatim, including `session.session.token`** (the bare token). Rationale: `caches.default` is private to this Worker (reachable only by its own code with the exact synthetic key; not publicly enumerable), the DB row already holds the identical secret, and stripping would create hit/miss shape drift — the class of subtle bug ADR-0025's "hit and miss are byte-identical" principle exists to avoid. The alternative (strip `token` on put) is defensible defense-in-depth if the owner prefers; it costs one consumer audit (done: zero consumers) and one deviation pin.

**`requireSession` wiring** (`apps/api/src/services/auth.ts`):

```
1. parseEnv → BETTER_AUTH_SECRET check (UNCHANGED, first, loud-fail — a misconfigured deploy
   throws even on a would-be hit; entries were minted under a secret, a secretless deploy
   must not serve from any cache)
2. authorization header present? → store = getSessionCacheStore(); if store:
   key = sha256-key(header, secret); hit = await store.get(key)
   hit && parse ok && session.expiresAt > now → c.set('session', parsed); await next(); return
3. miss → today's verify, verbatim (createVerificationAuth over c.get('db'), getSession)
4. verified → best-effort store.set(key, JSON.stringify(session)); 401 → never cached
```

The middleware stays inside `requireSession` (the ticket's placement): it composes under the existing mount order (`routes/v1.ts`: `publicReadCache` → `acquireDb` → `routes/admin.ts`: `requireSession` → `adminEvictPublicReads`). A hit still runs `acquireDb` (entity routes need the client) — that is fine, `postgres()` construction is lazy and CPU-cheap; the dial happens at first query.

### 2.2 Cost per hit/miss

- **Hit:** SHA-256 over ~100–200 bytes (`crypto.subtle.digest`, ~0.01–0.05 ms CPU) + one `caches.default.match` (I/O-class, wall-clock not CPU) + `JSON.parse` of a ~1 KB object. Total CPU well under 1 ms — against the free plan's **10 ms CPU cap**, replacing a path that pays the 7.3–12.4 ms fresh-connect class (ADR-0025's measurements) plus `betterAuth()` construction on its session half.
- **Miss:** adds ~0.1 ms (hash + failed match + put) to today's path.
- **Subrequests:** Cache API operations **do** count toward the free plan's 50-subrequests-per-invocation cap (but not the daily request quota) — worst case +2 (match + put) per admin request, the same cost class ADR-0025's read paths already accepted on the hottest public surface. DB queries over postgres sockets are not subrequests.
- **Honest CPU accounting for the spec:** on an admin read, the per-request fresh Postgres connect simply moves from the verify query to the entity query (admin reads stay uncached by ADR-0025's fence). Net per admin read: **−1 serial PH→SG round trip (~70–140 ms wall) before the handler starts**, −`createVerificationAuth` construction, −(occasionally) the daily `updateSession` write round trip firing from the api. The thumb proxy (`apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts`): N parallel images = 1 verify miss + N−1 cache hits instead of N verifies.

### 2.3 Per-colo implications

Staff sit in the Philippines and geo-route to one colo; the cache warms where the traffic lands (exactly ADR-0025's "per-colo" stance). The Cache API's `delete` is colo-local — which is moot here because no eviction is attempted (§2.4): every colo's entry dies by its own 60 s TTL regardless. The bound is per-colo-identical: 60 s.

### 2.4 The revocation story (why there is no eviction, on purpose)

Every revocation path this system has **deletes the session row in Postgres** — verified end to end:

- **Sign-out** → BetterAuth `signOut` deletes the row (and clears both cookies on the signing-out device).
- **Ban via the Users tab** (`apps/admin/src/lib/users.functions.ts` → `auth.api.banUser`) → sets `banned` **and calls `deleteUserSessions(userId)`** (`dist/plugins/admin/routes.mjs`); the `banned` flag additionally blocks *new* session creation (a session-create database hook, `dist/plugins/admin/admin.mjs` — 1.7.5 does not reject existing sessions in `getSession`, but there are none left to reject).
- **Remove user** → the row cascades sessions away (FK `on delete cascade`, `docs/staff-provisioning.md`).
- **Users-tab session revoke** (`revokeUserSession`/`revokeUserSessions`) → row(s) deleted.
- **Password reset** → `revokeSessionsOnPasswordReset: true` (admin config line 48).

**Crucially: none of these executes inside the api.** They all run on the admin's auth server (`/api/auth/*`, the admin plugin) — there is no api admin route whose commit could sweep a session-cache eviction the way `adminEvictPublicReads` sweeps ADR-0025's reads. Adding one (an internal evict endpoint over the ADR-0021 service-binding pattern) is real cross-app machinery that buys exactly the 60 s the owner has already ruled acceptable. **Decision: TTL-only, documented as the bound.** The internal-evict endpoint is the named extension point if the ruling ever tightens — not built.

### 2.5 Failure modes (api half)

| Failure | Behavior |
|---|---|
| Cache API match/put throws | Swallowed (best-effort) → uncached verify. Identical to read-cache law. |
| Corrupt/unparseable entry | `JSON.parse` guard → treat as miss → verify → `set` overwrites. |
| Session expires while cached | The `expiresAt` guard on hit rejects it (belt) even though the 60 s TTL (braces) already bounds the exposure. |
| Secret rotated | Fingerprint in the key → all old entries unreachable; they age out by TTL. No stale-allow: new secret → new keys → misses. |
| Stale `role` in a cached value | The api consumes no role today (ADR-0018's role gates live in the admin); if it ever does, the value is ≤60 s stale — inside the ruling. |
| Wrong-but-signed token / garbage Bearer | 401 → **never cached**; only verified sessions enter the store. |
| `BETTER_AUTH_SECRET` missing | Still throws loudly before any cache consult — the no-silent-allow posture is unchanged. |

### 2.6 Vitest seam implications

- **The null-store default keeps every existing suite uncached** — `caches` is undefined under plain Node, `defaultStore()` returns null, `requireSession` behaves byte-for-byte as today. The 460+ api tests and their floors hold by construction, the same argument ADR-0025 made for the public reads (the #263 pin suite's own words: "the vitetest default is no-op").
- **New suite `apps/api/test/session-cache.test.ts`**, mirroring `read-cache.test.ts`'s `fakeStore` describe, pinning at minimum:
  1. null default under plain Node; set/reset override round-trip;
  2. a pre-populated store serves a gated route **with the session row deleted from the DB** — the accepted ≤60 s revocation lag, pinned *deliberately as the contract*;
  3. the `expiresAt` guard: an entry whose session has expired serves 401 even mid-TTL;
  4. `BETTER_AUTH_SECRET` missing still throws (500) even with a would-be hit in the store;
  5. put-failure never fails the request (best-effort);
  6. a 401 is never written to the store; key never contains the presented token's raw bytes (assert the key equals the sha256 construction).
- `require-session.test.ts` keeps passing unchanged (null default) — the scratch-app pattern extends naturally if the suite wants a cached twin.

### 2.7 Touch points (api half)

- **New** `apps/api/src/services/session-cache.ts` — the store seam, key builder, TTL const (~100 lines, `read-cache.ts` as template).
- `apps/api/src/services/auth.ts` — the requireSession wrap (§2.1 step list); optionally pin `session: { expiresIn, updateAge }` on `createVerificationAuth` (§1.3).
- **New** `apps/api/test/session-cache.test.ts`.
- `docs/adr/` — this design is decision-grade: it gets its own ADR (the "Log decisions" law — it rules revocation semantics for the admin surface). One ADR, both halves.
- No route file, no `routes/v1.ts`, no `routes/admin.ts` change — the cache lives inside the existing gate.

---

## Part 3 — The revocation-lag statement (lift verbatim into the spec)

> **Revocation semantics under session amortization.** Every revocation path — sign-out, ban, user removal, session revocation, and password reset — deletes the session row in Postgres on the admin's auth server; none of them executes inside the api, so no api-side eviction exists or is warranted. The bound on both halves is TTL-only: **a revoked or expired session may continue to pass the api's `requireSession` and the admin shell gate for at most 60 seconds after its row disappears, per colo** (api: Workers Cache 60 s TTL; admin: `session_data` cookie `maxAge: 60`). The signing-out browser itself is revoked immediately (sign-out clears both cookies). Residual risk: a stolen bearer token remains usable for ≤60 s after revocation — accepted by owner ruling, 2026-11-14 (map #279). Sensitive BetterAuth operations are unaffected (1.7.5 bypasses the cookie cache for them). If the ruling ever tightens, the named extension point is an internal evict endpoint over the ADR-0021 service-binding pattern — deliberately not built.

## Part 4 — Fences this design keeps

- ADR-0025's fence stands: `/api/v1/admin/*` responses stay uncached — this design caches **identity verification**, never admin payloads.
- ADR-0004 unchanged: the api still verifies the bearer token through BetterAuth against the shared tables on every miss; the cache is a per-colo read-through in front of that verify, keyed by hash, bounded by TTL.
- ADR-0011 unchanged: per-request db client untouched; the cache composes above it exactly as the public read cache does.
- The M4 "measure before adding machinery" gate (spec line 173) is discharged by M8's baseline-capture ticket; these two levers land only against its numbers.

## Sources

**Better Auth v1.7 docs (canonical):** [Session management — cookie cache, revocation caveats, `disableCookieCache`](https://better-auth.com/docs/concepts/session-management) · [Bearer plugin](https://better-auth.com/docs/plugins/bearer) · [Options reference — session defaults](https://better-auth.com/docs/reference/options)
**better-auth@1.7.5 dist (the running code):** `dist/api/routes/session.mjs` (getSession decision tree, no-store headers, cache re-issue) · `dist/cookies/index.mjs` (setCookieCache/decodeCookieCache HMAC-compact format, 300 s default, deleteSessionCookie clears both) · `dist/context/create-context.mjs` (cookieRefreshCache auto-disable when stateful) · `dist/plugins/bearer/index.mjs` (scheme parse, percent-decode, HMAC verify, cookie injection, set-auth-token) · `dist/db/internal-adapter.mjs` (findSession = one joined read) · `dist/plugins/admin/routes.mjs` (banUser → deleteUserSessions) · `dist/plugins/admin/admin.mjs` (banned = session-create hook) · `dist/integrations/tanstack-start.mjs` (setCookie with silent catch)
**Repo:** `apps/api/src/services/auth.ts` · `apps/api/src/services/read-cache.ts` · `apps/api/src/routes/v1.ts` · `apps/api/src/routes/admin.ts` · `apps/api/src/services/audit.ts` · `apps/api/test/read-cache.test.ts` · `apps/api/test/require-session.test.ts` · `apps/admin/src/lib/auth.ts` · `apps/admin/src/lib/auth.functions.ts` · `apps/admin/src/lib/api.server.ts` · `apps/admin/src/lib/users.functions.ts` · `apps/admin/src/routes/_shell.tsx` · `apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts` · `docs/adr/0004-betterauth-shared-tables-token-verification.md` · `docs/adr/0011-per-request-db-client.md` · `docs/adr/0025-api-public-read-edge-cache.md` · `docs/specs/2026-09-22-m4-admin-auth-spec.md` (line 173) · `docs/staff-provisioning.md` · map #279 Notes (owner rulings 2026-11-14)
**Cloudflare:** [Workers limits — subrequest caps, Cache API counting](https://developers.cloudflare.com/workers/platform/limits) · [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
