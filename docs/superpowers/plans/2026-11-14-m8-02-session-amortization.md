# M8 ticket 02 — Session-verify amortization, both halves — implementation plan

**Goal:** Navigating the admin within the ruled 60-second window stops paying a session database read on both gates. **Admin half:** the auth instance enables BetterAuth's session cookie cache at the ruled bound — `session.cookieCache: { enabled: true, maxAge: 60 }` in `apps/admin/src/lib/auth.ts` (the library's 300 s default deliberately overridden) — so the shell gate's `getSession` and every gated server fn serve from the HMAC-signed `session_data` cookie with zero DB I/O inside the window. **API half:** a new session-cache service beside the read-cache service (`apps/api/src/services/session-cache.ts`, cloning its injectable-store seam) consulted by `requireSession` before any verification work — token-hash → (session, user) read-through over the Workers Cache API, key = SHA-256 over a secret fingerprint plus the presented bearer value (never the raw token in a key or a log), 401 outcomes never cached, a hit re-checks the cached expiry, the null store under vitest keeps every suite uncached. Revocation is TTL-only by the owner-ruled bound (≤60 s per colo; the signing-out browser itself is immediate) — the revoked-row-passes-within-TTL contract is pinned deliberately in the suite as ruled behavior. **ADR-0027** records the mechanism and bound for both halves; the M4 "measure before adding machinery" deferral discharges against the #280 baseline. Operational verification: the signed cache cookie actually lands from the sign-in flow on the deployed teaser admin (the framework's silent-unset failure mode degrades to today's behavior — performance-only, never correctness). Ticket #286 (spec § D2).

**Spec:** `docs/specs/2026-11-14-m8-admin-cms-latency-spec.md` (§ D2), ratified 2026-11-14 (grill #284). Inputs: the #280 baseline table (the discharged M4 deferral's measurement), the #281 research verdict (distilled into spec § D2 — no separate durable record to chase), the read-cache seam (ADR-0025, `apps/api/src/services/read-cache.ts` — the clone source), ADR-0004 (shared-secret token verification), ADR-0026 (the SIN placement the api cache composes with). Executed against existing issue **#286** — no new execution issue.

**Architecture:** one new api service + one gate edit + one admin config block + their tests + one ADR. Touched files: `apps/api/src/services/session-cache.ts` (new), `apps/api/src/services/auth.ts` (requireSession consults the cache), `apps/api/test/session-cache.test.ts` (new), `apps/admin/src/lib/auth.ts` (the cookieCache block), `apps/admin/src/lib/auth-cookie-cache.test.ts` (new), `docs/adr/0027-session-verify-amortization.md` (new), `docs/progress.md` (one What-Exists bullet), this plan file. No routes, no schema, no api-client, no admin server fns (the cookie cache serves every existing `getSession` call site automatically — `lib/auth.functions.ts` is untouched), no landing.

**Not UI-bearing:** this ticket names no UI/UX skill set (spec #94 amendment) — the work is config, a cache service, and tests; no rendered surface changes (the spec's user story 20: "the milestone touches only time, not pixels").

## Global Constraints

- Branch `m8/02-session-amortization` off current `main` (at `812b2e0` or later). Per-task commits with the subjects pinned per task, each ending `(#286)` — the one house exception is Task 8's ledger row, which follows the `docs(v1-picks): #286 ledger row - …` shape (the #285/#278 precedent); the squash-merge appends the PR number.
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with the floors byte-identical to the **new** values this plan pins: **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped** (the before-floor 33 files / 457+3 moves by exactly the 14 tests in `test/session-cache.test.ts` — 8 seam-unit + 6 gate-integration, enumerated in Tasks 2–3); **admin 28 files / 299** (the before-floor 27 files / 296 moves by exactly the 3 tests in `lib/auth-cookie-cache.test.ts`, enumerated in Task 4); types 18 files / 188; db 4 files (2 + 2 skipped) / 22 passed + 8 skipped; api-client 5 files / 45; landing 17 files / 134. A different moved count means the enumeration drifted: stop and reconcile against the test blocks, never by padding. (`pnpm build:packages` on a fresh clone before check — the shared client resolves the API's `AppType` from built `dist/`; this plan changes no route, so `AppType` is untouched.)
- **Deploy through CI only.** Both deploy legs matter now: the push to main fires `Deploy api (sevendays-api)` **and** `Deploy admin (sevendays-admin)` in the `Deploy teaser (main)` run. **Never run any local bare `wrangler deploy`** — the #263/#264 lesson (it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`).
- **Live-probed pins (2026-11-14 @ `812b2e0`, Node 26.7.0, better-auth 1.7.5 — the pinned install).** Do not "improve" any of these from memory; the pinned value is the probed value:
  - **`session.cookieCache` is real in the installed dist:** `options.session?.cookieCache?.maxAge || 300` (the 300 s library default), `enabled === true` gates the flow (`dist/api/routes/session.mjs`). The cookie is `better-auth.session_data` (chunked if large), **compact strategy by default**: HMAC-SHA256-signed payload with an embedded `expiresAt` at write (`dist/cookies/index.mjs`, `setCookieCache` — called from `setSessionCookie` at line 178, i.e. the sign-in flow writes it); `decodeCookieCache` **verifies the signature before any serve** — a forged/absent cookie degrades to the DB path. `getSession` serves from a fresh cookie payload with zero DB I/O (`dist/api/routes/session.mjs` — `sessionDataPayload.expiresAt >= now` and the embedded session expiry check). MaxAge unit is **seconds**.
  - **The `$context` readback is typed and I/O-free:** `Auth` declares `$context: Promise<AuthContext & InferPluginContext>` (`dist/types/auth.d.mts:18`); probed live with the **real** `createAuth` factory (admin plugin + `tanstackStartCookies()`): resolves in ~10 ms over a stub URL — the drizzle adapter reads local metadata, never the database — and `ctx.options.session` reflects the config (`expiresIn`/`updateAge`/plugin ids `admin,tanstack-start-cookies` read back; `cookieCache` reads back `{"enabled":true,"maxAge":60}` when configured). The Task 4 pin test stands on this probe.
  - **The vitest posture:** plain Node has no `caches` global (the read-cache null-store unit test passes today on the same guard — `read-cache.test.ts` "has no store under plain Node"), and Node 26 carries `crypto.subtle` + `Response` — both the key digest and the JSON container work in vitest and workerd with one code path.
  - **The gate's session consumers** are ids/emails only — `apps/api/src/services/audit.ts:44` (the actor snapshot), `apps/api/src/observability/request-context.ts:39` + `events.ts:64` (`session?.user.id` for actorId) — so a cached hit whose Date columns are revived satisfies every consumer; no Date-instance reliance exists downstream.
  - **`requireSession` mounts twice:** the admin root (`apps/api/src/routes/admin.ts:26`) and the appointments route (`apps/api/src/routes/appointments.ts:24`) — the cache lives inside the gate, so both surfaces amortize; public routes never consult it.
  - `acquireDb` constructs the per-request client lazily (no connection until a query — ADR-0011): a cache hit that runs after `acquireDb` still costs zero DB I/O.
- **No new secret.** The key fingerprint derives from `BETTER_AUTH_SECRET` (already a Worker secret, never committed). If it ever rotates, keys change and old entries age out via the 60 s TTL — no migration.
- **The after-verification is HITL (Task 7):** the owner performs the sign-in and the devtools check (never ask for credentials, never assume while the owner may be AFK). If the owner is unavailable after Task 6, post the interim evidence, leave #286 open naming the pending check, and stop — do not self-serve the verification.
- The api half has **no separate live probe**: a valid bearer token is owner-held, and the session-verify share of the walk is the M8 exit gate's (#289) measurement. This ticket's operational evidence is the admin cookie check only.

### Not here

- **No thumbnail work** (versioned URLs, proxy headers — #287) and **no client staleness/priming** (#288) — the spec's § D3/§ D4 levers.
- **No exit-gate judgment** — the ratified `cold median ≤ 1 s` target is **#289's** gate; never declare M8 success or failure from this ticket.
- **No `docs/plan.md` edits** — all five M8 boxes flip at #289 (its body owns the milestone-close ritual); this ticket's plan.md box stays unticked even after every acceptance criterion here is met.
- **No eviction machinery** — revocation is TTL-only by the owner ruling; the store deliberately has no `evict` (the one clone difference from the read-cache seam). No `cookieCache.version` hook (rejected in ADR-0027 — needs cross-app coordination the ruling doesn't cover).
- **No session schema/migration changes, no auth-flows changes** — sign-in/sign-out/reset behave exactly as today; only `getSession`'s read path gains a cache. No `lib/auth.functions.ts` changes (every server fn benefits through the existing `createAuth().api.getSession` calls). No bearer-plugin or ADR-0004 verification changes on a miss.
- **No Hyperdrive** (ADR-0024 burned, #260 parked), **no wrangler/config changes**, **no `docs/architecture.md`/`docs/tech-stack.md`/`AGENTS.md` edits** (ADR-0027 is the canonical record), **no landing changes**.
- No visual baselines, no e2e edits; `graphify update .` **is** needed at close (code symbols changed — Task 7).

---

### Task 1: branch + plan commit

**Files:**
- Commit: this plan file (the branch's first commit)

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b m8/02-session-amortization
  git add docs/superpowers/plans/2026-11-14-m8-02-session-amortization.md
  git commit -m "docs(m8): the M8 ticket 02 implementation plan (#286)"
  ```

---

### Task 2: the session-cache seam — store, key, container, hit projection (TDD)

**Files:**
- Test: `apps/api/test/session-cache.test.ts` (the unit block only — the integration describe lands in Task 3)
- Create: `apps/api/src/services/session-cache.ts`

**Interfaces (exact signatures Task 3 and both test blocks consume):**
- `export interface SessionCacheStore { match(key: string): Promise<Response | undefined>; put(key: string, response: Response): Promise<void>; }` — **no `evict`**: revocation is TTL-only, no caller exists (the deliberate clone difference).
- `export const SESSION_CACHE_TTL_SECONDS = 60` — the owner-ruled bound.
- `export const SESSION_CACHE_KEY_ORIGIN = 'https://session-cache.sevendays.internal'` — the synthetic origin the default store builds its Request URLs on (the read-cache posture).
- `export async function sessionCacheKey(secret: string, presentedToken: string): Promise<string>` — `sha256(sha256(secret) + ':' + presented)` hex; async via `crypto.subtle`.
- `export function toSessionCacheEntry(session: SessionData): Response` — the JSON container with `cache-control: public, max-age=60` (PUBLIC, not private: the Cache API is a shared cache and a `private` directive makes the entry unstashable — put throws, the best-effort catch swallows, nothing ever caches; per-user isolation comes from the token-hash key, and the container is Worker-internal colo storage never served to a client).
- `export async function sessionFromCacheEntry(entry: Response): Promise<SessionData | null>` — the hit projection: parse, expiry guard, Date revival; null on anything off; never throws.
- `export function presentedBearerToken(header: string | undefined): string | null` — the cache-key input, extracted exactly once per request.
- `export function getSessionCacheStore(): SessionCacheStore | null` / `setSessionCacheStore(store)` / `resetSessionCacheStore()` — the registry posture (override wins; default is `caches.default` under workerd, null under plain Node/vitest).

- [ ] **Step 1: write the failing unit tests**

Create `apps/api/test/session-cache.test.ts` with this exact content (the integration describe is appended by Task 3 — do not write it yet):

```ts
import { describe, expect, it } from 'vitest';
import type { SessionData } from '../src/services/auth.js';
import {
  SESSION_CACHE_TTL_SECONDS,
  type SessionCacheStore,
  getSessionCacheStore,
  presentedBearerToken,
  resetSessionCacheStore,
  sessionCacheKey,
  sessionFromCacheEntry,
  setSessionCacheStore,
  toSessionCacheEntry,
} from '../src/services/session-cache.js';
import { TEST_AUTH_SECRET } from './helpers/env.js';

// NOTE (import staging): the header carries ONLY what the unit block uses —
// (kept honest by Biome's noUnusedVariables, not a tsconfig gate). Task 3's integration describe adds its imports as
// it lands (db, helpers, the scratch app). Deliberately free of booking-path
// strings so the v1 pick carries this file (the audit-token discipline,
// require-session.test.ts's note).

// The in-memory fake (the r2-stub posture): put snapshots status/headers/body,
// match returns a FRESH Response per call (bodies are single-use).
function fakeStore() {
  const entries = new Map<string, { status: number; headers: string[][]; body: string }>();
  const store: SessionCacheStore & { keys: () => string[] } = {
    async match(key) {
      const entry = entries.get(key);
      return entry
        ? new Response(entry.body, { status: entry.status, headers: entry.headers })
        : undefined;
    },
    async put(key, response) {
      entries.set(key, {
        status: response.status,
        headers: [...response.headers],
        body: await response.clone().text(),
      });
    },
    keys: () => [...entries.keys()],
  };
  return store;
}

// The verified-session fixture: the shape auth.api.getSession returns, with
// the Date columns real (toSessionCacheEntry stringifies them; the hit
// reviver must restore them). Cast: the tests only touch the core columns.
function sessionFixture(overrides?: { expiresAt?: Date }) {
  const expiresAt = overrides?.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000);
  return {
    session: {
      id: 'sess-1',
      userId: 'user-1',
      token: 'raw-token-value',
      expiresAt,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 60_000),
    },
    user: {
      id: 'user-1',
      name: 'Test Staff',
      email: 'fixture@sevendays.test',
      emailVerified: false,
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 60_000),
    },
  } as SessionData;
}

const presented = 'presented.token.value';

describe('the session-cache seam (unit)', () => {
  it('has no store under plain Node — the vitest default is no-op', () => {
    expect(getSessionCacheStore()).toBeNull();
  });

  it('set/reset round-trips the override', () => {
    const store = fakeStore();
    setSessionCacheStore(store);
    expect(getSessionCacheStore()).toBe(store);
    resetSessionCacheStore();
    expect(getSessionCacheStore()).toBeNull();
  });

  it('keys are 64-hex digests that never carry the presented token or the secret', async () => {
    const key = await sessionCacheKey(TEST_AUTH_SECRET, presented);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain(presented);
    expect(key).not.toContain(TEST_AUTH_SECRET);
  });

  it('keys are stable per (secret, token) and secret-sensitive', async () => {
    const key = await sessionCacheKey(TEST_AUTH_SECRET, presented);
    expect(await sessionCacheKey(TEST_AUTH_SECRET, presented)).toBe(key);
    expect(await sessionCacheKey('a-different-secret-0123456789', presented)).not.toBe(key);
    expect(await sessionCacheKey(TEST_AUTH_SECRET, 'another.token')).not.toBe(key);
  });

  it('the TTL constant is the ruled 60 seconds', () => {
    expect(SESSION_CACHE_TTL_SECONDS).toBe(60);
  });

  it('toSessionCacheEntry stores a JSON container with the public 60 s directive', async () => {
    const entry = toSessionCacheEntry(sessionFixture());
    expect(entry.headers.get('cache-control')).toBe(`public, max-age=${SESSION_CACHE_TTL_SECONDS}`);
    const parsed = (await entry.json()) as { session: { id: string }; user: { id: string } };
    expect(parsed.session.id).toBe('sess-1');
    expect(parsed.user.id).toBe('user-1');
  });

  it('sessionFromCacheEntry revives the Date columns on a fresh entry and rejects stale/malformed ones', async () => {
    const revived = await sessionFromCacheEntry(toSessionCacheEntry(sessionFixture()));
    expect(revived).not.toBeNull();
    expect(revived?.session.expiresAt).toBeInstanceOf(Date);
    expect(revived?.user.createdAt).toBeInstanceOf(Date);
    expect(revived?.session.id).toBe('sess-1');
    const stale = sessionFixture({ expiresAt: new Date(Date.now() - 60_000) });
    expect(await sessionFromCacheEntry(toSessionCacheEntry(stale))).toBeNull();
    expect(await sessionFromCacheEntry(new Response('not-json'))).toBeNull();
  });

  it('presentedBearerToken extracts the presented value and refuses everything else', () => {
    expect(presentedBearerToken('Bearer abc.def')).toBe('abc.def');
    expect(presentedBearerToken('bearer abc.def')).toBe('abc.def');
    expect(presentedBearerToken('Bearer  spaced  ')).toBe('spaced');
    expect(presentedBearerToken(undefined)).toBeNull();
    expect(presentedBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(presentedBearerToken('Bearer')).toBeNull();
  });
});
```

- [ ] **Step 2: run the tests to verify they fail**

  ```bash
  pnpm --filter @sevendays/api test test/session-cache.test.ts
  ```

  Expected: FAIL — `Cannot find module '../src/services/session-cache.js'` (or the equivalent resolution error).

- [ ] **Step 3: write the seam module**

Create `apps/api/src/services/session-cache.ts`:

```ts
import type { SessionData } from './auth.js';

// The session-verify cache (ADR-0027, #286): a token-hash → (session, user)
// read-through cache consulted by the session gate (services/auth.ts) BEFORE
// any verification work — a hit serves the verified identity with zero DB
// I/O and never constructs the per-request auth instance. Storage is the
// Workers Cache API beside the public read cache (ADR-0025): free, per-colo,
// TTL-evicted. The key is a SHA-256 digest over a secret fingerprint (itself
// a SHA-256 of the shared BETTER_AUTH_SECRET) plus the PRESENTED bearer
// value — neither the secret nor the token ever appears in a key or a log;
// the inner digest is fixed-length hex, so the outer hash has no
// length-extension surface. 401 outcomes are never cached; a hit re-checks
// the cached session's expiry before serving (a hit is never more permissive
// than a fresh verification). Revocation is TTL-only by the owner-ruled
// bound (≤60 s per colo — the signing-out browser itself is immediate): no
// eviction path exists, so this store carries no evict — the deliberate
// clone difference from services/read-cache.ts. The seam mirrors
// read-cache.ts: an injectable registry whose default is caches.default
// under workerd and null under plain Node/vitest — every existing suite runs
// uncached with the null store (the floors hold by construction). Cache I/O
// is best-effort throughout: match resolves undefined on error, put swallows
// — a cache failure degrades to uncached verification and never fails a
// request.

export interface SessionCacheStore {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}

export const SESSION_CACHE_TTL_SECONDS = 60;

export const SESSION_CACHE_KEY_ORIGIN = 'https://session-cache.sevendays.internal';

// The stored container: the verified session as JSON under a storage
// freshness directive the Cache API honors at put() — PUBLIC, because the
// Cache API is a shared cache and a `private` directive makes the entry
// unstashable (put throws 413, the best-effort catch swallows, nothing
// ever caches). Per-user isolation comes from the token-hash key, not the
// directive: the container is Worker-internal colo storage and is never
// served to a client — the hit path parses the body server-side. The TTL
// is the revocation bound.
export function toSessionCacheEntry(session: SessionData): Response {
  return new Response(JSON.stringify(session), {
    headers: { 'cache-control': `public, max-age=${SESSION_CACHE_TTL_SECONDS}` },
  });
}

// The Date columns the adapter returns as Date instances and the JSON
// container stringified — revived so a cached hit satisfies the same
// SessionData shape a fresh verification produces.
const DATE_COLUMNS = new Set(['expiresAt', 'createdAt', 'updatedAt']);

function reviveDates(row: Record<string, unknown>): Record<string, unknown> {
  const revived = { ...row };
  for (const key of DATE_COLUMNS) {
    const value = revived[key];
    if (typeof value === 'string' || typeof value === 'number') {
      revived[key] = new Date(value);
    }
  }
  return revived;
}

// The hit projection: the parsed cached session, or null when anything is
// off (malformed JSON, missing halves, an expired session — the expiry
// guard). Best-effort: never throws.
export async function sessionFromCacheEntry(entry: Response): Promise<SessionData | null> {
  try {
    const raw = (await entry.json()) as {
      session?: Record<string, unknown>;
      user?: Record<string, unknown>;
    };
    if (!raw.session || !raw.user) return null;
    const expiresAt = new Date(raw.session.expiresAt as string).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return {
      session: reviveDates(raw.session),
      user: reviveDates(raw.user),
    } as SessionData;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// The key: SHA-256 over a secret fingerprint (itself a SHA-256 of the shared
// auth secret) plus the presented bearer value. A secret rotation changes
// every key; old entries age out via the TTL — no migration.
export async function sessionCacheKey(secret: string, presentedToken: string): Promise<string> {
  const fingerprint = await sha256Hex(secret);
  return sha256Hex(`${fingerprint}:${presentedToken}`);
}

// The presented value exactly as the bearer plugin sees it (scheme stripped
// case-insensitively, value trimmed) — the cache-key input. Null for
// anything the gate would 401 anyway (no header, non-bearer scheme): those
// requests never consult the store.
export function presentedBearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  const value = match?.[1]?.trim();
  return value ? value : null;
}

// The Cache-API-backed default (workerd only). Never throws — see header.
function defaultStore(): SessionCacheStore | null {
  const cache = typeof caches !== 'undefined' ? caches.default : undefined;
  if (!cache) return null;
  const requestFor = (key: string) =>
    new Request(`${SESSION_CACHE_KEY_ORIGIN}/${key}`, { method: 'GET' });
  return {
    async match(key) {
      try {
        return await cache.match(requestFor(key));
      } catch {
        return undefined;
      }
    },
    async put(key, response) {
      try {
        await cache.put(requestFor(key), response);
      } catch {
        // Best-effort: an uncachable container degrades to uncached
        // verification.
      }
    },
  };
}

let override: SessionCacheStore | null = null;

export function getSessionCacheStore(): SessionCacheStore | null {
  return override ?? defaultStore();
}

export function setSessionCacheStore(store: SessionCacheStore | null): void {
  override = store;
}

export function resetSessionCacheStore(): void {
  override = null;
}
```

- [ ] **Step 4: run the tests green**

  ```bash
  pnpm --filter @sevendays/api test test/session-cache.test.ts
  ```

  Expected: 8 passed (the unit describe). The typecheck gate (`SessionData` from `services/auth.js` — a type-only import, no runtime cycle even though Task 3 adds the reverse value import) is enforced at Task 6's `pnpm check`.

- [ ] **Step 5: commit**

  ```bash
  git add apps/api/src/services/session-cache.ts apps/api/test/session-cache.test.ts
  git commit -m "feat(api): the session-cache seam — token-hash store, key, container, hit projection (#286)"
  ```

---

### Task 3: the gate wiring — requireSession consults the cache (TDD)

**Files:**
- Test: `apps/api/test/session-cache.test.ts` (append the integration describe + its imports and module-level additions)
- Edit: `apps/api/src/services/auth.ts`

**Interfaces:** consumes Task 2's exports verbatim. Produces: no new exports — `requireSession`'s signature and `SessionData` are unchanged (the gate's consumers — audit.ts, request-context.ts, events.ts — need zero edits; Global Constraints pins their id/email-only reliance).

- [ ] **Step 1: append the failing integration tests**

Edit `apps/api/test/session-cache.test.ts` — four edits, each OLD must match exactly once. **(a) the import head** — the vitest line becomes the real-stack block (alphabetical per Biome's organize-imports; `pnpm fix` settles any ordering nit):

```text
OLD: import { describe, expect, it } from 'vitest';
NEW: import { session as sessionTable } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
```

**(b) the SessionData type line** gains its runtime siblings:

```text
OLD: import type { SessionData } from '../src/services/auth.js';
NEW: import { acquireDb } from '../src/routes/v1.js';
import { requireSession } from '../src/services/auth.js';
import type { SessionData } from '../src/services/auth.js';
import type { ApiEnv } from '../src/services/db.js';
```

**(c) the helpers block** — the `TEST_AUTH_SECRET` line gains the rest (Biome's specifier order: auth < db < env < truncate):

```text
OLD: import { TEST_AUTH_SECRET } from './helpers/env.js';
NEW: import { signOutSession, signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { TEST_AUTH_SECRET, testEnv } from './helpers/env.js';
import { truncateAll } from './helpers/truncate.js';
```

**(d) the module-level additions** — insert between the `sessionFixture` closing brace and the `presented` const:

```text
OLD: const presented = 'presented.token.value';
NEW:
// The scratch app (the require-session.test.ts posture): acquireDb +
// requireSession + a probe route — the gate is route-independent; the
// file stays free of booking-path strings (the v1-pick note above).
const scratch = new Hono<ApiEnv>()
  .use('*', acquireDb)
  .get('/protected', requireSession, (c) => c.json({ userId: c.get('session')?.user.id ?? null }));

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const presented = 'presented.token.value';
```

- [ ] **Step 2: append the integration describe** — at the file tail, after the unit describe's closing brace:

```ts
describe('requireSession with the session cache (scratch app, real Postgres)', () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(async () => {
    await truncateAll(db);
    store = fakeStore();
    setSessionCacheStore(store);
  });

  afterEach(() => {
    resetSessionCacheStore();
  });

  it('a miss verifies through BetterAuth and back-fills the store', async () => {
    const { token, userId } = await signUpSession(url, 'cache-miss@sevendays.test');
    expect(store.keys()).toEqual([]);
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId });
    expect(store.keys()).toEqual([await sessionCacheKey(TEST_AUTH_SECRET, token)]);
  });

  it('a hit serves without the database — even a revoked row passes within the TTL (the ruled pin)', async () => {
    const { token, userId } = await signUpSession(url, 'cache-hit@sevendays.test');
    expect(
      (await scratch.request('/protected', { headers: bearer(token) }, testEnv(url))).status
    ).toBe(200);
    expect(store.keys()).toHaveLength(1);
    await signOutSession(url, token); // the row is deleted — a fresh verification would 401
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200); // the cached hit answers — the ruled ≤60 s trade, deliberate
    expect((await res.json()) as { userId?: string }).toEqual({ userId });
    expect(store.keys()).toHaveLength(1); // no second verification — the hit never re-verified
  });

  it('401 outcomes never cache — garbage tokens leave the store empty', async () => {
    const res = await scratch.request(
      '/protected',
      { headers: bearer('not-a-real-token') },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(store.keys()).toEqual([]);
  });

  it('the 401 envelope is byte-identical with the cache in the path', async () => {
    const { token } = await signUpSession(url, 'cache-envelope@sevendays.test');
    await signOutSession(url, token); // revoked BEFORE any request — verification runs, caches nothing
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
    expect(store.keys()).toEqual([]);
  });

  it('the expiry guard rejects a stale entry — a hit is never more permissive than verification', async () => {
    const { token } = await signUpSession(url, 'cache-stale@sevendays.test');
    const key = await sessionCacheKey(TEST_AUTH_SECRET, token);
    // Seed an entry whose embedded expiresAt is already past (hand-built:
    // the gate's own back-fill only ever writes verified, unexpired sessions).
    await store.put(
      key,
      new Response(JSON.stringify(sessionFixture({ expiresAt: new Date(Date.now() - 1000) })), {
        headers: { 'cache-control': `public, max-age=${SESSION_CACHE_TTL_SECONDS}` },
      })
    );
    // The row is expired too (the require-session.test.ts method: expires_at
    // moved to the past; the stored row carries the BARE token) — a fresh
    // verification would also 401.
    await db
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(sessionTable.token, token.split('.')[0] ?? ''));
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
    expect(store.keys()).toEqual([key]); // the stale entry was never served, and no fresh entry overwrote it (401s never cache)
  });

  it('with no store (the Node/vitest default), the gate stays uncached — revocation is immediate', async () => {
    resetSessionCacheStore();
    const { token } = await signUpSession(url, 'cache-null@sevendays.test');
    expect(
      (await scratch.request('/protected', { headers: bearer(token) }, testEnv(url))).status
    ).toBe(200);
    await signOutSession(url, token);
    expect(
      (await scratch.request('/protected', { headers: bearer(token) }, testEnv(url))).status
    ).toBe(401);
  });
});
```

- [ ] **Step 3: run to verify the new behavior pins fail** — the six integration tests split honestly: the two **new-behavior** tests fail (the gate doesn't consult the store yet), the four **invariant** tests already hold because the unwired gate ignores the store entirely (they pin obligations that must survive the wiring):

  ```bash
  pnpm --filter @sevendays/api test test/session-cache.test.ts
  ```

  Expected: 8 passed (unit) + 4 passed / **2 failed** (integration) — `a miss verifies through BetterAuth and back-fills the store` (its `store.keys()` stays empty) and `a hit serves without the database…` (the revoked token 401s where the cache must answer 200).

- [ ] **Step 4: wire the gate** — edit `apps/api/src/services/auth.ts`. The imports at the top gain one block (after the `./db.js` line — Biome's relative order: `'../env.js'` < `'./db.js'` < `'./session-cache.js'`):

  ```text
  OLD: import type { ApiEnv } from './db.js';
  NEW: import type { ApiEnv } from './db.js';
  import {
    getSessionCacheStore,
    presentedBearerToken,
    sessionCacheKey,
    sessionFromCacheEntry,
    toSessionCacheEntry,
  } from './session-cache.js';
  ```

  and `requireSession` becomes exactly (the OLD body matches the current file — lines 47–64):

  ```text
  OLD: export const requireSession = async (
         c: import('hono').Context<ApiEnv>,
         next: () => Promise<void>
       ) => {
         const { BETTER_AUTH_SECRET } = parseEnv(c.env);
         if (!BETTER_AUTH_SECRET) {
           throw new Error(
             'BETTER_AUTH_SECRET is not set — the API cannot verify sessions. Set the Worker secret (ADR-0004, shared with the admin). No fallback by design.'
           );
         }
         const auth = createVerificationAuth({ database: c.get('db'), secret: BETTER_AUTH_SECRET });
         const session = await auth.api.getSession({ headers: c.req.raw.headers });
         if (!session) {
           return authenticationRequired(c);
         }
         c.set('session', session);
         await next();
       };
  NEW: export const requireSession = async (
         c: import('hono').Context<ApiEnv>,
         next: () => Promise<void>
       ) => {
         const { BETTER_AUTH_SECRET } = parseEnv(c.env);
         if (!BETTER_AUTH_SECRET) {
           throw new Error(
             'BETTER_AUTH_SECRET is not set — the API cannot verify sessions. Set the Worker secret (ADR-0004, shared with the admin). No fallback by design.'
           );
         }
         // ADR-0027: consult the token-hash session cache BEFORE any
         // verification work — a hit serves the verified identity with zero
         // DB I/O and never constructs the per-request auth instance. A miss
         // verifies exactly as before and back-fills on success; 401
         // outcomes are never cached (the put sits below the null check).
         const store = getSessionCacheStore();
         const presented = presentedBearerToken(c.req.header('authorization'));
         if (store && presented) {
           const key = await sessionCacheKey(BETTER_AUTH_SECRET, presented);
           const hit = await store.match(key);
           const cached = hit ? await sessionFromCacheEntry(hit) : null;
           if (cached) {
             c.set('session', cached);
             await next();
             return;
           }
         }
         const auth = createVerificationAuth({ database: c.get('db'), secret: BETTER_AUTH_SECRET });
         const session = await auth.api.getSession({ headers: c.req.raw.headers });
         if (!session) {
           return authenticationRequired(c);
         }
         if (store && presented) {
           await store.put(
             await sessionCacheKey(BETTER_AUTH_SECRET, presented),
             toSessionCacheEntry(session)
           );
         }
         c.set('session', session);
         await next();
       };
  ```

  Also update the gate's JSDoc (directly above `requireSession`) — replace the final sentence ("The instance is constructed per request over the per-request db handle acquireDb already placed in context (ADR-0011 — the drizzle adapter captures the db it is given).") with exactly:

  ```text
  The instance is constructed per request over the per-request db handle
  acquireDb already placed in context (ADR-0011 — the drizzle adapter
  captures the db it is given). ADR-0027: a cache hit (the token-hash
  session cache, services/session-cache.ts) serves the verified identity
  and skips the instance entirely; only a miss constructs it — 401
  outcomes are never cached, and every cache failure degrades to this
  verification path.
  ```

- [ ] **Step 5: run the file green + the untouched neighbors**

  ```bash
  pnpm --filter @sevendays/api test test/session-cache.test.ts test/require-session.test.ts
  ```

  Expected: session-cache 14 passed (8 unit + 6 integration); require-session **byte-unchanged results** — its sign-out pin (`401 after sign-out`) holds because the null store keeps that suite uncached (the "all existing suites stay uncached" acceptance, by construction).

- [ ] **Step 6: commit**

  ```bash
  git add apps/api/src/services/auth.ts apps/api/test/session-cache.test.ts
  git commit -m "feat(api): requireSession consults the session cache before verification (#286)"
  ```

---

### Task 4: the admin half — the ruled 60-second cookie cache + the config pin

**Files:**
- Edit: `apps/admin/src/lib/auth.ts` (the session block)
- Test: `apps/admin/src/lib/auth-cookie-cache.test.ts` (new)

- [ ] **Step 1: write the failing pin test** — create `apps/admin/src/lib/auth-cookie-cache.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createAuth } from './auth';

// The M8 #286 config pin (ADR-0027): the ruled 60-second session cookie
// cache, asserted through the instance's RESOLVED options ($context resolves
// CPU-only — the drizzle adapter reads local metadata, never the database;
// probed live 2026-11-14 against better-auth 1.7.5). The library default
// (300 s) is deliberately overridden to the owner-ruled bound; the lifetime
// pins and the tanstack-start-cookies-last rule are re-pinned beside it so
// this session-block edit cannot regress them. No HTTP is exercised here —
// the cookie-lands-from-sign-in check is operational (#286, Task 7), per the
// spec's testing decision.
const stubUrl = 'postgres://stub:stub@localhost:5432/sevendays_stub';

describe('the admin auth session config (the #286 cookie-cache pin)', () => {
  it('pins the ruled 60-second cookie cache — overriding the library 300 s default', async () => {
    const ctx = await createAuth(stubUrl).$context;
    expect(ctx.options.session?.cookieCache).toEqual({ enabled: true, maxAge: 60 });
  });

  it('keeps the session lifetime pins (7-day expiry, daily refresh)', async () => {
    const ctx = await createAuth(stubUrl).$context;
    expect(ctx.options.session?.expiresIn).toBe(60 * 60 * 24 * 7);
    expect(ctx.options.session?.updateAge).toBe(60 * 60 * 24);
  });

  it('keeps the plugin order — tanstack-start-cookies stays last', async () => {
    const ctx = await createAuth(stubUrl).$context;
    const ids = (ctx.options.plugins ?? []).map((plugin) => plugin.id);
    expect(ids[ids.length - 1]).toBe('tanstack-start-cookies');
    expect(ids).toContain('admin');
  });
});
```

- [ ] **Step 2: run it to verify it fails**

  ```bash
  pnpm --filter @sevendays/admin test src/lib/auth-cookie-cache.test.ts
  ```

  Expected: FAIL — the cookieCache readback is `undefined` (the config doesn't carry it yet); the other two pins pass.

- [ ] **Step 3: the edit** — in `apps/admin/src/lib/auth.ts`, the session line (must match exactly once):

  ```text
  OLD:     session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }, // 7 days, refresh daily — spec-pinned
  NEW:     session: {
             expiresIn: 60 * 60 * 24 * 7,
             updateAge: 60 * 60 * 24, // 7 days, refresh daily — spec-pinned
             // M8 #286 (ADR-0027): the owner-ruled 60-second session cookie
             // cache — getSession (the shell gate + every gated server fn)
             // serves from the HMAC-signed session_data cookie with zero DB
             // I/O inside the window; the signature is verified before any
             // serve, so a forged/absent cookie degrades to the DB path. The
             // library's 300 s default is deliberately overridden to the
             // ruled bound; revocation is TTL-only (a revoked session may
             // pass for ≤60 s — the signing-out browser itself is immediate,
             // cookies cleared). The known failure mode — the cookie adapter
             // silently not setting the cookie — degrades to today's
             // per-navigation DB read (performance-only); verified
             // operationally on #286 (the cookie lands from sign-in). The
             // pin test beside this file locks the shape.
             cookieCache: { enabled: true, maxAge: 60 },
           },
  ```

  The plugin array is untouched (`tanstackStartCookies()` stays last — the MUST-be-last rule the pin test re-asserts). No other line of the factory changes.

- [ ] **Step 4: run green + the admin floor**

  ```bash
  pnpm --filter @sevendays/admin test
  ```

  Expected: 299 passed across 28 files (the 296 floor + the 3 new pins).

- [ ] **Step 5: commit**

  ```bash
  git add apps/admin/src/lib/auth.ts apps/admin/src/lib/auth-cookie-cache.test.ts
  git commit -m "feat(admin): the ruled 60-second session cookie cache + the config pin (#286)"
  ```

---

### Task 5: ADR-0027 + the progress.md bullet

**Files:**
- Write: `docs/adr/0027-session-verify-amortization.md`
- Edit: `docs/progress.md`

- [ ] **Step 1: write the ADR — this full text, byte-verbatim** (house structure per ADR-0025/0026):

````markdown
# ADR-0027: Session-verify amortization — both halves, the ruled 60 s bound

**Status:** Accepted
**Date:** 2026-11-14

## Context

The M8 spec (`docs/specs/2026-11-14-m8-admin-cms-latency-spec.md`, ratified 2026-11-14) and its baseline walk (#280) measured every admin catalog read at **2.5–5.0 s wall clock** with cpuTime of only 14–39 ms — about 99% database I/O — and warm refetches exactly as slow as cold, because every request pays the same per-request taxes before its entity query: a fresh Supavisor connect, and **a session verification that queries Postgres first**. On the api, the session gate (`requireSession`, ADR-0004) verifies the presented bearer through BetterAuth's own session API over the per-request db client (ADR-0011) — one fresh connect + the session read on every gated request (the admin root and the appointments gate both mount it). On the admin worker, the shell gate's `getSession` and every gated server fn (`lib/auth.functions.ts`) re-read the session row per navigation — the admin runs at the edge, so those reads cross metros (the ADR-0026 accepted residual). The M4 spec deferred session caching behind a "measure before adding machinery" gate: **the #280 baseline is that measurement** — session verification is one of the three named taxes, and the ratified exit target (cold median ≤ 1 s per admin read, #289) cannot be met while every request pays it. SIN placement (#285, ADR-0026) already removed the cross-metro share of the api's verify; the read itself remains.

## Decision

**Amortize session verification on both halves at the owner-ruled 60-second bound. Revocation is TTL-only — the owner's trade, on the record.**

1. **Admin half — BetterAuth's session cookie cache** on the admin's auth instance (`apps/admin/src/lib/auth.ts`):

   ```ts
   session: { …, cookieCache: { enabled: true, maxAge: 60 } }
   ```

   The library's 300 s default is deliberately overridden to the ruled bound (better-auth 1.7.5: `options.session?.cookieCache?.maxAge || 300`; docs: [Session caching](https://www.better-auth.com/docs/concepts/session-management#session-caching)). The cache rides the compact strategy (the 1.7.5 default): the `better-auth.session_data` cookie is an HMAC-SHA256-signed payload over the shared secret, written by the sign-in flow (`setSessionCookie` → `setCookieCache`), and `decodeCookieCache` verifies the signature before any serve — a forged or absent cookie is indistinguishable and degrades to the DB path. Inside the window, `getSession` — the shell gate's check and every gated server fn — answers from the cookie with zero database I/O. The known failure mode (the cookie adapter silently not setting `session_data`) degrades to today's per-navigation DB read — performance-only, never correctness — and is verified operationally: **the cookie must be observed landing from the sign-in flow on a deployed environment** (evidence on #286; the config pin test locks the shape in the suite).

2. **API half — the token-hash session cache beside the read cache (ADR-0025)** (`apps/api/src/services/session-cache.ts`, consulted by `requireSession` before any verification work): a read-through cache over the Workers Cache API — free, per-colo, TTL-evicted — keyed **SHA-256 over a secret fingerprint (itself a SHA-256 of the shared `BETTER_AUTH_SECRET`) plus the presented bearer value**. Neither the secret nor the token ever appears in a key or a log; the inner digest is fixed-length hex, so the outer hash has no length-extension surface. A **hit re-checks the cached session's `expiresAt` before serving** — a hit is never more permissive than a fresh verification; a **miss verifies exactly as today** (the bearer plugin strips/verifies the signature, then the session read — ADR-0004 unchanged) and **back-fills on success**; **401 outcomes are never cached**. The stored container is the verified `{ session, user }` as JSON under `cache-control: public, max-age=60` — public, not private, because the Cache API is a shared cache and a `private` directive makes the entry unstashable (put throws, the best-effort catch swallows, nothing ever caches); per-user isolation comes from the token-hash key, and the container is Worker-internal colo storage never served to a client (the hit path parses the body server-side). The TTL is both the Cache API's storage bound and the revocation bound; the container carries the verified identity's own row fields — the presented signed value itself never enters storage. The Date columns the adapter returns are revived on hit, so the cached identity satisfies the same `SessionData` shape a fresh verification produces — the gate's consumers (audit actor snapshots, access-log actorId) read ids/emails only. The store **clones the read-cache seam** (ADR-0025): an injectable registry whose default is `caches.default` under workerd and **null under plain Node/vitest** — every existing suite runs uncached with the null store, the floors hold by construction — with one deliberate difference: **no `evict`**. Cache I/O is best-effort throughout; a cache failure degrades to uncached verification and never fails a request. A hit also skips constructing the per-request verification instance entirely (the per-request db client `acquireDb` placed earlier composes — its client connects lazily, so the hit still costs zero DB I/O).

3. **Revocation is TTL-only by design (owner-ruled):** every revocation path — sign-out, ban, user removal, session revoke, password reset (`revokeSessionsOnPasswordReset` is already on) — deletes the session row on the admin's auth server; none executes inside the api, so **no cross-app eviction hook exists**. Bound: a revoked or expired session may pass either gate for **≤60 s per colo**; with the api SIN-placed (#285, ADR-0026) the api's cache warms in a single colo, so the api bound is simply ≤60 s. The signing-out browser itself is immediate (cookies cleared — sign-out is a browser-local act on the admin). The **revoked-row-passes-within-TTL contract is pinned deliberately** in `apps/api/test/session-cache.test.ts` so the trade is visible in the suite, not folklore. A `BETTER_AUTH_SECRET` rotation changes every key; old entries age out via the TTL — no migration. This **discharges the M4 spec's "measure before adding machinery" deferral** against the #280 baseline.

## Alternatives Considered

- **Do nothing (the M4 posture)** — discharged: the #280 baseline measured the tax; the ratified ≤1 s exit target cannot be met with a per-request session read.
- **Hyperdrive** — orthogonal (connection caching, not result caching), and burned (ADR-0024; the #260 recipe stays parked).
- **BetterAuth `secondaryStorage` for the api half** — couples the api's verification to the admin instance's storage tier; the bearer path has no cookie, and the Workers Cache API needs no new binding, no new secret, and no cross-app contract.
- **`cookieCache.version` (the data-change invalidation hook)** — would let the admin bust its own cache cookie on profile/role writes; rejected: it needs cross-app coordination the ruling doesn't cover, and profile/role changes riding ≤60 s is the same accepted trade as revocation.
- **Longer TTLs** — the 60 s bound is the owner's revocation ruling (ratified 2026-11-14, spec § D2); not an engineering dial.
- **Caching the verification's negative outcomes** — rejected outright: 401s are never cached; an unverified token must always re-verify (and the presented value of a garbage token would poison keys).

## Consequences

- **Warm navigations and repeated gated calls within 60 s pay zero session DB I/O** on both halves. The remaining per-request costs (the fresh Supavisor connect + the entity query) stay as-is (ADR-0011 posture) — the client-side levers (#288) and the exit gate (#289) judge the rest.
- **The admin worker's DB-direct reads keep their residual**: the shell gate's check when the cookie is absent/stale (past 60 s), the Audit Log viewer, the Users tab (ADR-0023) — the owner-ratified accepted residual (spec § Out of scope) still holds; the cookie cache removes only their session-verify share inside the window.
- **A cached hit serves the session as of its back-fill**: user/role changes ride ≤60 s (both halves); audit rows and access-log actorIds carry the cached identity's fields — same fields, Dates revived.
- **Dev/test unaffected**: the null store under vitest keeps every suite uncached (the floors hold by construction); `wrangler dev` exercises the real cache path locally; the admin's pin test reads resolved options, no HTTP.
- **Operational proof split**: the admin half's cookie-lands check is this ticket's evidence (#286); the api half's session-verify share of the wall-time improvement is the M8 exit gate's (#289) walk measurement.
````

- [ ] **Step 2: the progress.md bullet** — insert directly after the #285 bullet (the `The api worker is **region-placed…` line ends `…the #260 recipe stays parked.`) and before the blank line preceding `## Known Gaps / Not Yet Done` (must match exactly once; after the edit the file gains exactly the one bullet):

  ```text
  OLD: The admin-worker → DB-direct reads (shell gate, Audit Log viewer, Users tab — ADR-0023) keep their cross-metro penalty as the owner-ratified residual. Hyperdrive stays burned (ADR-0024); the #260 recipe stays parked.

  ## Known Gaps / Not Yet Done
  NEW: The admin-worker → DB-direct reads (shell gate, Audit Log viewer, Users tab — ADR-0023) keep their cross-metro penalty as the owner-ratified residual. Hyperdrive stays burned (ADR-0024); the #260 recipe stays parked.
  - Session verification is **amortized on both halves** (2026-11-14, #286 — ADR-0027): the admin's auth instance enables BetterAuth's session cookie cache at the owner-ruled bound (`session.cookieCache: { enabled: true, maxAge: 60 }` in `apps/admin/src/lib/auth.ts` — the library's 300 s default overridden; the shell gate's getSession and every gated server fn serve from the HMAC-signed `session_data` cookie with zero DB I/O inside the window; the silent-unset failure mode degrades to today's per-navigation DB read — performance-only), and the api's `requireSession` consults a token-hash → (session, user) read-through cache over the Workers Cache API before any verification work (`apps/api/src/services/session-cache.ts`, cloning the read-cache seam — injectable store, null under vitest so every suite runs uncached; key = SHA-256 over a secret fingerprint plus the presented bearer value, never the raw token; 401s never cached; a hit re-checks the cached expiry). Revocation is TTL-only by the owner-ruled bound (≤60 s per colo; the signing-out browser is immediate) — the revoked-row-passes-within-TTL contract is pinned in the suite as ruled behavior. The M4 "measure before adding machinery" deferral discharges against the #280 baseline. The admin half's cookie-lands-from-sign-in check is verified on #286; the api half's session-verify share rides the M8 exit gate (#289).

  ## Known Gaps / Not Yet Done
  ```

- [ ] **Step 3: commit** (ADR + progress bullet, nothing else in the commit):

  ```bash
  git add docs/adr/0027-session-verify-amortization.md docs/progress.md
  git commit -m "docs(m8): ADR-0027 — session-verify amortization, both halves (#286)"
  ```

---

### Task 6: gates, push, PR, merge, watch both deploy legs

**Files:** none new.

- [ ] **Step 1: gates** — from the repo root (on a fresh clone, `pnpm build:packages` + `pnpm --filter @sevendays/api build` first):

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Green 35/35 with the Global Constraints floors byte-identical — **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped; admin 28 files / 299**; every other floor unchanged.

- [ ] **Step 2: push + PR**:

  ```bash
  git push -u origin HEAD
  gh pr create --title "feat(api,admin): session-verify amortization — the ruled 60-second bound, both halves (#286)" --body-file - <<'EOF'
  M8 ticket 02 (#286, spec D2): navigating the admin within the ruled 60-second window stops paying a session database read on both gates.

  - **Admin half:** BetterAuth's session cookie cache at the ruled bound — `session.cookieCache: { enabled: true, maxAge: 60 }` (the library's 300 s default overridden) — the shell gate's getSession and every gated server fn serve from the HMAC-signed `session_data` cookie with zero DB I/O inside the window; config pinned through the resolved options in a new lib-seam test
  - **API half:** the token-hash → (session, user) read-through cache beside the read-cache service (ADR-0025 seam clone), consulted by `requireSession` before any verification — key = SHA-256 over a secret fingerprint plus the presented bearer (never the raw token), 401s never cached, expiry guard on hit, null store under vitest (all suites uncached by construction)
  - **Revocation is TTL-only by the owner-ruled bound** (≤60 s per colo; the signing-out browser is immediate) — the revoked-row-passes-within-TTL contract pinned deliberately as ruled behavior
  - ADR-0027 records mechanism + bound for both halves; the M4 measure-first deferral discharges against the #280 baseline
  - Operational verification: the cache cookie observed landing from the sign-in flow on the deployed teaser admin (post-merge, on #286); the api half's session-verify share rides the M8 exit gate (#289)

  Floors: api 34 files / 471 passed + 3 skipped (+14 session-cache tests); admin 28 files / 299 (+3 config pins). No routes, no schema — `AppType` untouched.
  EOF
  ```

- [ ] **Step 3: CI check green on the PR, then squash-merge.** Record the merge SHA.

- [ ] **Step 4: watch the deploy** — `gh run list --branch main --limit 1`, verify the run's head SHA matches the merge SHA (the #271 lesson), then `gh run watch <run-id>` until the `Deploy teaser (main)` leg finishes. **Both steps must go green: `Deploy api (sevendays-api)` AND `Deploy admin (sevendays-admin)`** (this ticket changes both workers). Record the run id — the restore vehicle if anything var-shaped breaks later (`gh run rerun <run-id>`).

---

### Task 7: the deployed cookie verification (HITL) + close + graphify

**Files:** none on disk (evidence lands on #286).

- [ ] **Step 1: the owner ask** — send this ask and wait (never assume while the owner may be AFK):

  > M8 ticket 02 needs one 30-second check on the deployed admin. The admin now caches your session in a signed cookie for 60 seconds, and I need to verify the cookie actually lands from the sign-in flow — a framework quirk can silently skip setting it, and if so everything still works, just at the old speed. Could you sign in once at the teaser admin as usual, then open devtools → Application → Cookies → (the admin host), and tell me whether a cookie named `better-auth.session_data` is present? It may be chunked with numbered suffixes (`.0`, `.1`) if it's large — any name starting `better-auth.session_data` counts as a yes. A yes and you're done; the ticket closes on it.

  Decision table:
  - Cookie present → the lever is live; post the evidence (Step 2) and close (Step 3).
  - Cookie **absent** → the silent-unset failure mode fired: do NOT close. Check the deploy run's admin leg log for errors; reproduce the config pin locally (Task 4's test green?); take the finding to the owner with the evidence — the degradation is performance-only, so the site works, but the acceptance box stays unticked until the cookie lands or the owner re-rules.
  - The admin errors at sign-in → suspect the var-wipe class first (the #263 signature): `gh run rerun <Task-6-run-id>`, then re-ask.

- [ ] **Step 2: post the evidence to #286** (only after a yes; fill the `<…>` slots):

  ```bash
  gh issue comment 286 --body "Admin-half operational evidence (deploy run <run-id>):

  - The owner signed in at the teaser admin (<date>): the \`better-auth.session_data\` cookie landed from the sign-in flow (devtools, Application → Cookies) — the ruled 60-second cookie cache is live; the shell gate's session checks inside the window ride the signed cookie with zero DB reads.
  - Degradation posture on record: a missing cookie would have degraded to today's per-navigation DB read — performance-only, never correctness.
  - API half: live behind the session gate as of this deploy (seam tests green; null-store default keeps every suite uncached); its session-verify share of the wall time is the M8 exit gate's (#289) walk measurement."
  ```

- [ ] **Step 3: graphify + close #286**:

  ```bash
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#286 graph update"
  git push origin main
  gh issue view 286 --json body -q .body > /tmp/m8-02-286-body.md
  # flip the five '- [ ]' acceptance lines to '- [✅]' (✅ emoji, never plain [x] — the AGENTS.md rule)
  gh issue edit 286 --body-file /tmp/m8-02-286-body.md
  gh issue close 286 --reason completed
  ```

  All five boxes now hold: config pin green (Task 4); cookie verified (Step 2); api cache live behind the gate (Task 3 + Task 6's deploy); seam tests mirror the read-cache suite incl. the revoked pin + null-store default (Tasks 2–3); ADR-0027 written (Task 5). **Do not tick this ticket's plan.md M8 box** — all five flip at #289.

---

### Task 8: post-merge — the v1 pick + ledger row

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row — main-side, direct commit per the ledger precedent)

- [ ] **Step 1: triage per `docs/agents/v1-picks.md`** — `node scripts/v1-triage.mjs <merge-sha>` (the Task 6 merge SHA). Expected shape: **SPLIT** — v1-paths: `apps/api/src/services/session-cache.ts`, `apps/api/src/services/auth.ts`, `apps/api/test/session-cache.test.ts`, `apps/admin/src/lib/auth.ts`, `apps/admin/src/lib/auth-cookie-cache.test.ts`, `docs/adr/0027-session-verify-amortization.md`; main-only: `docs/progress.md`, this plan file (dropped). Record the classifier's actual output. Content pass expected clean: a cache service + a config block + their tests — the test file deliberately carries zero booking-path strings (the Task 2 note), zero edition mechanics.

- [ ] **Step 2: execute the pick + locks** per the runbook — cherry-pick the squash commit onto `v1`, resolve the main-only paths as drops, then:

  ```bash
  pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  node scripts/audit-v1-absence.mjs HEAD   # exit 0 / PASS 0/18 over full history
  git push origin v1
  ```

  Watch the run **sha-verified** (the #271 lesson): `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Superset check: the merge SHA reachable from origin/main.

- [ ] **Step 3: the ledger row** — one row appended to `docs/agents/v1-picks.md`, the #285/#278 rows as the format template (the `<…>` cells are execution-filled):

  ```text
  | 2026-11-<d> | #<PR> | <merge-sha> | <class — expected split> | <v1-sha> | #286 — M8 ticket 02: session-verify amortization, both halves (admin cookie cache at the ruled 60 s — `session.cookieCache {enabled: true, maxAge: 60}` overriding the library 300 s default, config pinned through the resolved options; api token-hash session cache in requireSession beside the read-cache seam — SHA-256 secret-fingerprint keys never carrying the raw token, 401s never cached, expiry guard on hit, null store under vitest; revocation TTL-only ≤60 s per colo, the revoked-row-within-TTL contract pinned as ruled behavior; ADR-0027 — the M4 measure-first deferral discharged against the #280 baseline). Classifier <actual class> — 6 v1-paths (the api service + gate + test file, the admin auth config + pin test, docs/adr/0027) + 2 main-only (docs/progress.md, the plan file — dropped). Content pass clean — a cache seam + a config block + their tests, zero booking tokens, zero edition mechanics. Locks on <v1-sha>: frozen install/build:packages/api-build green; check 35/35 (TEST_DATABASE_URL :5434/sevendays_test); absence audit PASS 0/18 over full history; superset ok (<merge-sha> reachable). Run <run-id>: check success · Deploy v1 (private) success · Deploy teaser (main) skipped. Main side: PR #<PR> squash-merged after CI green; the cookie-lands-from-sign-in evidence on #286 (the api half's session-verify share rides #289's exit-gate walk). |
  ```

  Commit:

  ```bash
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #286 ledger row - the M8 session-amortization pick (both halves carry)"
  git push origin main
  ```

---

## Self-review notes for the executor

- **Pin inventory (all probed/verified 2026-11-14 @ `812b2e0`):** better-auth 1.7.5's `cookieCache` mechanics read from the installed dist (maxAge default `|| 300`; compact strategy HMAC; `decodeCookieCache` verifies before serve; `setSessionCookie` → `setCookieCache` on the sign-in path; `session.mjs` serves fresh payloads with zero DB); the `$context` readback typed (`types/auth.d.mts:18`) and CPU-only over a stub URL, probed with the **real** `createAuth` factory (plugin ids + resolved session options read back); the vitest posture (no `caches` global, `crypto.subtle` present); the gate consumers' id/email-only reliance; the two `requireSession` mount sites (admin root + appointments); the CI legs (`Deploy api` + `Deploy admin` in the teaser run).
- **Test-count arithmetic:** the api floor moves 457 → 471 by exactly the 14 tests enumerated in Tasks 2 (8 unit) and 3 (6 integration) — `store.keys()`-style exact-match assertions make any extra test visible; the admin floor moves 296 → 299 by exactly Task 4's 3 pins. If `pnpm check` reports anything else, stop and reconcile against the test blocks — never pad.
- **If line numbers shifted** (an intervening commit): every OLD string here is content-anchored, not line-anchored — they still apply; a ≠1 match means drift, stop and reconcile.
- **The two-stage close is the designed path:** Tasks 1–6 are agent-only; only Task 7 waits on the owner. If the owner is AFK after Task 6, the evidence comment is *not* posted yet, #286 stays **open** with the pending-check note, and work stops there — the ticket closes only with the cookie observed landing (or an owner re-ruling on the failure mode).
- **Clone-difference honesty:** the session store has **no `evict`** — that is the ruled TTL-only revocation, not an omission; the ADR and the seam's header comment both state it, and the test suite's revoked-row pin is the contract's enforcement.
- **Type-cycle note:** `session-cache.ts` imports `SessionData` (type-only) from `services/auth.ts`, and `auth.ts` imports values from `session-cache.ts` — the type import erases at runtime, so there is no runtime cycle; if the executor's Biome flags the direction, `pnpm fix` settles it (the import-staging note in the test file says the same for its own header).
- **Confound honesty:** #287/#288 may merge before #289's walk; the exit gate judges the milestone sum, never this ticket.
