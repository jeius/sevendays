# Plan: #331 — Service covers: API spine — fifth purpose, cover column, tri-state save, resolved reads

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio services gain staff-settable cover photos at the API — a fifth media purpose (`service-cover`, JPG-only) on the existing presign/commit contract, a nullable `studio_services.cover_image_key` column via a generated migration, the whole tri-state cover law in the admin save (absent = keep, null = clear, staging string = bind/replace, displaced keys deleted post-commit), resolved `coverImageUrl` on every read (raw keys never leave the API), and the guarded entity DELETE deleting the stored cover post-commit.

**Architecture:** No new mechanics — every piece ports a live precedent. The media seam widens by exactly two lines (`mediaPurposeSchema` + `FINAL_PREFIXES`, which is a `Record<MediaPurpose, string>` so the compiler forces the entry). The wire swap is the #214 branch-cover shape: the row mirror keeps `coverImageKey`, the one canonical read (`studioServiceWithBranchesSchema`) omits it and extends `coverImageUrl`, and the save schemas split create (bind-only) from update (tri-state). The save ports `resolveBranchCover` verbatim as `resolveServiceCover` (commit before the transaction; commit failure re-paths onto `coverImageKey` as the 400 conflict; old object deleted only post-commit). Every read — admin list/get over all rows, the public active-only GET — strips the key and resolves the absolute URL at read time (ADR-0019). The studio-services public read is NOT edge-cached; the cache seam is verify-only.

**Tech Stack:** zero new dependencies, **one generated migration** (drizzle-kit over `DATABASE_MIGRATE_URL` in `packages/db/.env`), zod v4 (`.omit(...).extend(...)` presence-encoding — the `branchWriteBase`/`updateBranchSchema` precedent), hono chained registrations (existing routes, threaded `c.env`), vitest per-package, pnpm + Turborepo, `gh` CLI.

**Spec:** [GitHub issue #331](https://github.com/jeius/sevendays/issues/331), authoritatively settled by its parent spec — [issue #330](https://github.com/jeius/sevendays/issues/330), repo copy `docs/specs/2026-11-19-services-cover-photos-spec.md` (D1 database, D2 types, D3 media pipeline, D4 admin save, D5 reads, D6 deletion, D9 edge cache; Testing Decisions §1–§3). The rendered-variants gate is the sibling ticket #334 (teaser pass + owner reaction), NOT this plan.

## Worktree law (owner-ruled 2026-11-21): ONE worktree for the whole spec

All four spec tickets — **#331 (this plan) → #332 (admin editor) → #333 (landing) → #334 (teaser pass)** — execute in this worktree: `.worktrees/service-covers`, branch **`service-covers`** (created off `main` at `cbd9d2f`, 2026-11-21). Setup already done and verified there: `pnpm install` + `pnpm build:packages` + `pnpm --filter @sevendays/api build` + baseline floors (below).

- **This plan (#331) commits its five tasks onto `service-covers`.** Later tickets continue on the same branch — their plans add tasks here, never a second worktree.
- **Before each later ticket starts, the controller syncs the worktree:** `git fetch origin && git rebase origin/main` inside `.worktrees/service-covers` (after #331's PR lands), so the branch rides the merged spine, not a stale fork.
- Every task below runs from the worktree root: `/home/jeius/Projects/sevendays/.worktrees/service-covers`.

**Controller pre-flight (2026-11-21, HEAD cbd9d2f, worktree baseline live-run):** every code block's before-state was read byte-exact today at the cited anchors; the api suite was live-run in this worktree against `sevendays-test-db-5433` — **33 passed + 1 skipped (34 files) / 471 passed + 3 skipped**, exactly the AGENTS.md floor; types **18 files / 188 passed**; db **4 files (2 passed + 2 skipped) / 22 passed + 8 skipped**. All three floors green before Task 1.

## Scope fences

**In scope (the API spine only):** `packages/db` (column + migration 0015); `packages/types` (studio-service schemas, media purpose enum, pins); `apps/api` (FINAL_PREFIXES, admin save tri-state, reads resolution, delete cleanup, routes threading, pins); mechanical fixture repairs in `apps/admin`, `apps/landing`, `packages/api-client` test files (the schema change's blast radius — adding the now-required `coverImageUrl: null` / `coverImageKey` to literal fixtures; zero behavior); `docs/progress.md` + `AGENTS.md` floors + graphify.

**NOT here (siblings / out of scope):**

- **#332 — the admin editor Cover field** (`studio-services-screen.tsx`, `light-entity-state.ts` seam, `cover-upload.ts` purpose wiring, `admin.functions.ts`). The ONLY admin-file edits in this plan are: test-fixture repairs in `light-entity-state.test.ts` (one parse literal + `coverImageUrl: null`) AND one mechanical schema-ripple line in `light-entity-state.ts` — `buildStudioServicePayload`'s return annotation retypes `UpdateStudioServiceInput` → `CreateStudioServiceInput` (Task 3; the alias death splits Create≠Update, the builder's body is create-shaped — no cover key — and Create assigns to Update at the update site; zero behavior; **#332 supersedes** with the builder split + the tri-state encoding per spec D7). The tri-state editor state, builders' bodies, and flip payload are #332's deliverable and stay out.
- **#333 — landing consumption** (`home-cards.tsx` `serviceBackground()` demotion, the precedence helper, ServiceImageCard/ServiceCard swaps). The ONLY landing edits here are three test-factory literals gaining `coverImageUrl: null` — typecheck repairs, not consumption.
- **#334 — teaser variant pass + owner reaction** — the #94 rendered-variants gate. Nothing here is "done done" until it records.
- **The live package / branch / site-logo cover flows** — untouched (map ruling; only studio services gain covers).
- **Edge-cache changes** — studio-services stays OUT of `CACHED_READ_PREFIXES` and `ADMIN_MUTATION_READS` (D9). Task 4 carries a runnable verify, never an edit.
- **Thumbnail-serving changes** — the Images-binding seam is untouched (D3: no new thumbnail work; the editor preview (#332) uses the resolved `coverImageUrl`).
- **The admin UI's payload construction** — #332 wires the editor to send the field; until then no consumer sends `coverImageKey` on studio-service saves (verified: no admin/landing code constructs it — grep-clean 2026-11-21).
- **Booking-flow imagery** — none exists (spec D8 fact); nothing to consume.
- **A separate audit line** — the cover rides the existing studio-service save/delete rows (D4; the M6 #185 law).
- **No v1 pick/ledger work in this branch** — post-merge, main-only per `docs/agents/v1-picks.md`.
- **No ADR** — no architectural choice: every decision is a named precedent's port (ADR-0019 + ADR-0020 already rule the mechanics).

## Global Constraints

- **Verbatim values this plan introduces (use exactly; do not paraphrase):**
  - The purpose name: `'service-cover'` — and the `FINAL_PREFIXES` entry `'service-cover': 'covers'` (final keys `covers/<uuid>.jpg`, `cacheControl: immutable` — the branch-cover ruling).
  - The column: `coverImageKey: text('cover_image_key')` on `studio_services` — nullable, no default, born-null on every existing row.
  - The wire field names: `coverImageKey` (row + write payloads), `coverImageUrl` (`z.url().nullable()` on the read).
  - The save split: create `coverImageKey: z.string().min(1).optional()`; update `z.string().min(1).nullable().optional()`.
  - The commit-failure contract: `{ ok: false, reason: 'conflict', … }` with every detail re-pathed to `['coverImageKey']` → the route's 400.
  - The pair-check message (asserted verbatim in Task 2's pin): `contentType 'image/png' is not allowed for purpose 'service-cover' (allowed: image/jpeg)`.
- **Migrations are generated, never hand-edited:** `pnpm --filter @sevendays/db db:generate`, then `db:migrate`. `db:migrate` uses `DATABASE_MIGRATE_URL` from `packages/db/.env` (present on this machine; keys probed 2026-11-21). If the executor's session lacks it, STOP and surface: applying to the live shared DB is owner-delegated and must not be skipped silently.
- **Dist consumers:** `packages/types` and `packages/db` are consumed from `dist/` — after editing either's source, rebuild before dependent gates: `pnpm --filter @sevendays/types build` (before api/api-client/landing/admin typecheck+test) and `pnpm --filter @sevendays/db build` (before api tests — the suite's global-setup migrates the test DB from dist). `pnpm --filter @sevendays/api build` refreshes the AppType dist the api-client typechecks against.
- **Test DB:** every api-suite run prefixes `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test` (start the standalone container first if down: `docker start sevendays-test-db-5433`). Port 5432 belongs to another project — the vitest default must never fall back. Suites self-migrate + truncate at global-setup.
- **Floors (baseline live-run in this worktree 2026-11-21 @ cbd9d2f):** api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped; types 18 files / 188; db 4 files (2 passed + 2 skipped) / 22 passed + 8 skipped; api-client 5 files / 45; landing 17 files / 134; admin 34 files / 360. **This plan moves only api and types:** api → **482 passed + 3 skipped** (Task 2 +3, Task 3 +2, Task 4 +6); types → **197 passed** (Task 2 +1, Task 3 +9 added − 1 removed alias = +8). db/api-client/landing/admin counts may NOT move (their edits are fixture literals only). A count that differs at any gate means something else drifted: stop and reconcile.
- **Per-task gates:** the touched packages' `test -- --run` AND `typecheck` both green before each task's commit. Final gate: `pnpm fix` then `pnpm check` green at the repo root (with `TEST_DATABASE_URL` set). Do not commit code that fails it for the packages/apps touched.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #331. Prefixes: `feat(db):` / `feat(types,api):` / `feat(api):` for the code tasks, `docs:` / `chore(graphify):` for Task 5.
- **UI skill set (AGENTS.md rule):** #331 is API-spine work — no UI-bearing surface is touched, so the `prototype`/`ui-ux-pro-max` load belongs to #332/#334, not this plan. The spec's own UI rulings (picker-only upload, JPG-only, the fallback posture) are recorded in the spec as owner overrides; #334 runs the audit against the rendered result.

---

## Task 1 — `packages/db`: the nullable cover key + generated migration 0015

The #214 Task-1 precedent verbatim, one entity over. The column is additive-nullable on a populated table (5 seeded services) — born-null, no backfill, no two-step migration.

**Files:**
- Modify: `packages/db/src/schema/studio-services.ts` (insert one column between `isActive` (line 19) and `createdAt` (line 20))
- Create (via `db:generate`, never by hand): `packages/db/migrations/0015_<drizzle-name>.sql` (+ `meta/_journal.json` + snapshot)

**Interfaces:**
- Consumes: nothing (the frontier task).
- Produces (what Tasks 2–4 + #332/#333 consume): `studioServices.$inferSelect` gains `coverImageKey: string | null` (every `db.select().from(studioServices)` row carries it); `studio_services.cover_image_key` exists on the live DB + test DB (the api suite's global-setup replays 0015 from dist).

- [ ] **Step 1: Add the column to the schema.** In `packages/db/src/schema/studio-services.ts`, current block for exact match (lines 14–20):

```ts
    // Null = unpriced (ADR-0020): inquiry-priced offerings live in the
    // catalog fully bookable; nullable since migration 0009. No sentinel.
    priceCents: integer('price_cents'),
    // is_active gates the booking surface without deleting catalog history
    // (same posture as addon_services).
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

Replace with:

```ts
    // Null = unpriced (ADR-0020): inquiry-priced offerings live in the
    // catalog fully bookable; nullable since migration 0009. No sentinel.
    priceCents: integer('price_cents'),
    // is_active gates the booking surface without deleting catalog history
    // (same posture as addon_services).
    isActive: boolean('is_active').notNull().default(true),
    // R2 object key for the cover image (#331, the branches.coverImageKey
    // shape): nullable — born-null on every existing row (no cover = the
    // documented landing fallback); raw keys never leave the API (ADR-0019).
    coverImageKey: text('cover_image_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

- [ ] **Step 2: Generate the migration.**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: a new `packages/db/migrations/0015_<drizzle-name>.sql` (the name is drizzle's pick — do not rename it) plus the `meta/` journal + snapshot entries. Read the generated SQL and verify it contains **exactly one statement** and nothing else:

```sql
ALTER TABLE "studio_services" ADD COLUMN "cover_image_key" text;
```

(possibly with a trailing `--> statement-breakpoint` comment). If the generated file contains anything beyond the single `ADD COLUMN` — a default, a NOT NULL, another table's statement — STOP: the schema edit drifted; fix `studio-services.ts` and regenerate. Never hand-edit the migration.

- [ ] **Step 3: Apply to the live shared DB + probe.**

Run: `pnpm --filter @sevendays/db db:migrate` (uses `DATABASE_MIGRATE_URL` from `packages/db/.env`; if the executor's session lacks it, stop and surface — owner-delegated, never skipped silently).
Expected: `0015` applies clean. Then the read-only probe (the #212/#214 pattern):

```bash
cd packages/db && node --env-file=.env -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_MIGRATE_URL, { prepare: false, max: 1 });
  const rows = await sql\`select column_name, is_nullable, column_default from information_schema.columns where table_name = 'studio_services' and column_name = 'cover_image_key'\`;
  for (const r of rows) console.log(r.column_name, 'nullable=' + r.is_nullable, 'default=' + r.column_default);
  await sql.end({ timeout: 5 });
});"
```

Expected output — exactly one line, nullable with no default:

```text
cover_image_key nullable=YES default=null
```

Then `cd` back to the worktree root.

- [ ] **Step 4: Rebuild dist + gates.**

Run: `pnpm --filter @sevendays/db build && pnpm --filter @sevendays/db test && pnpm --filter @sevendays/db typecheck`
Expected: db suite green at its unchanged floor — **4 files (2 passed + 2 skipped) / 22 passed + 8 skipped** (`migrate.test.ts` replays the folder including 0015; if the count moves, reconcile before continuing — do not eyeball it away). Then `pnpm --filter @sevendays/db fix` and re-run the suite (fix must not change counts).

- [ ] **Step 5: Commit.**

```bash
git add packages/db/src/schema/studio-services.ts packages/db/migrations/0015_*.sql packages/db/migrations/meta
git commit -m "feat(db): studio_services gains a nullable cover_image_key - the service-covers column, generated as 0015 (#331)"
```

**Not here:** no seed edit — `scripts/seed.ts` upserts by explicit column lists and never touches the new column (born-null is the seeded state); no api/types edit rides this commit (the column is invisible to the wire until Task 3).

## Task 2 — the fifth media purpose: `'service-cover'` joins presign/commit (types + api, atomic)

The purpose lands atomically across `packages/types` (the enum) and `apps/api` (`FINAL_PREFIXES` is a `Record<MediaPurpose, string>` — the compiler forces the entry the moment the enum widens; the two typechecks force each other). **No presign pair-check edit** — `mediaPresignRequestSchema`'s `superRefine` else-branch already enforces JPG-only for every non-`site-logo` purpose, so `'service-cover'` lands there automatically (the #170 ruling). Same for `commitUpload`'s `allowedTypes`. One commit.

**Files:**
- Modify (test-first): `packages/types/src/media.test.ts` (one new `it` after the site-logo purpose pin at lines 33–39)
- Modify (test-first): `apps/api/src/services/media.test.ts` (one new `it` after the branch-cover promote pin at lines 170–178)
- Modify (test-first): `apps/api/test/media-routes.test.ts` (two new `it`s at the end of the `POST /api/v1/admin/media/presign` describe — after the `#246: mints a PNG presign for the site-logo purpose` it, lines 166–179)
- Modify: `packages/types/src/media.ts` (the enum, lines 25–33)
- Modify: `apps/api/src/services/media.ts` (`FINAL_PREFIXES`, lines 29–38)

**Interfaces:**
- Consumes: Task 1 (nothing — independent of the column; but runs after it on the same branch).
- Produces: `MediaPurpose` widens to include `'service-cover'`; presign accepts `{ purpose: 'service-cover', contentType: 'image/jpeg' }` and 400s `image/png` at `['contentType']`; commit promotes a service-cover staging object to `covers/<uuid>.jpg`. Task 4's `resolveServiceCover` passes `purpose: 'service-cover'`; #332's editor presigns under it.

- [ ] **Step 1: Write the failing types pin.** In `packages/types/src/media.test.ts`, directly after the site-logo purpose `it` (which ends `expect(parsed.purpose).toBe('site-logo');` + `});`), add:

```ts
  it('parses the service-cover purpose (M9 #331: studio services join the covers pipeline)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'service-cover',
      contentType: 'image/jpeg',
    });
    expect(parsed.purpose).toBe('service-cover');
  });
```

- [ ] **Step 2: Write the failing api pins.** In `apps/api/src/services/media.test.ts`, directly after the branch-cover promote `it` (which ends `expect(result.finalKey).toMatch(/^covers\//);` + `});`), add:

```ts
  it('service-cover purpose promotes to covers/ (M9 #331: the branch-cover ruling carried to the fifth purpose)', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'service-cover',
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.finalKey).toMatch(/^covers\//);
  });
```

In `apps/api/test/media-routes.test.ts`, at the end of the presign describe (after the `#246: mints a PNG presign for the site-logo purpose` it), add:

```ts
  it('#331: service-cover presigns a JPG (200, staging key minted)', async () => {
    const { token } = await signUpSession(url, 'presign-service-cover@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'service-cover', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      withCreds()
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { key: string; uploadUrl: string };
    expect(body.key).toMatch(/^tmp\/[0-9a-f-]+\.jpg$/);
  });

  it('#331: service-cover with image/png → the pair-check 400 naming the purpose at contentType', async () => {
    const { token } = await signUpSession(url, 'presign-service-cover-png@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'service-cover', contentType: 'image/png' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      withCreds()
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('Invalid request payload.');
    const detail = body.details[0];
    if (!detail) throw new Error('expected one validation detail');
    expect(detail.path).toEqual(['contentType']);
    expect(detail.message).toBe(
      "contentType 'image/png' is not allowed for purpose 'service-cover' (allowed: image/jpeg)"
    );
  });
```

- [ ] **Step 3: Run the pins to verify they fail.**

Run: `pnpm --filter @sevendays/types test 2>&1 | grep -E "Tests  "` → expected FAIL (the new purpose pin; zod rejects the unlisted enum value).
Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- --run src/services/media.test.ts test/media-routes.test.ts` → expected FAIL (three new pins red).

- [ ] **Step 4: Widen the enum + the prefixes record.**

`packages/types/src/media.ts` — current comment + enum (lines 25–33) for exact match:

```ts
// 'branch-cover' joined with M7 #214; 'site-logo' with M7 #215: the brand
// logo rides the same presign/commit pipeline under its own purpose (the
// brand/ prefix — a logo is not a cover).
export const mediaPurposeSchema = z.enum([
  'package-cover',
  'branch-cover',
  'site-logo',
  'gallery-photo',
]);
```

Replace with:

```ts
// 'branch-cover' joined with M7 #214; 'site-logo' with M7 #215: the brand
// logo rides the same presign/commit pipeline under its own purpose (the
// brand/ prefix — a logo is not a cover); 'service-cover' with M9 #331:
// studio services join the covers pipeline (JPG-only like every non-logo
// purpose — the #170 ruling rides the pair check untouched).
export const mediaPurposeSchema = z.enum([
  'package-cover',
  'branch-cover',
  'site-logo',
  'gallery-photo',
  'service-cover',
]);
```

`apps/api/src/services/media.ts` — current `FINAL_PREFIXES` (lines 29–38) for exact match:

```ts
const FINAL_PREFIXES: Record<MediaPurpose, string> = {
  'package-cover': 'covers',
  // M7 #214: branch covers share the covers/ prefix — one immutable-cover
  // directory; the purpose still names its owner for the presign contract.
  'branch-cover': 'covers',
  // M7 #215: the brand logo gets its own immutable directory — a logo is
  // not a cover (the purpose names the owner, the prefix names the class).
  'site-logo': 'brand',
  'gallery-photo': 'gallery',
};
```

Replace with:

```ts
const FINAL_PREFIXES: Record<MediaPurpose, string> = {
  'package-cover': 'covers',
  // M7 #214: branch covers share the covers/ prefix — one immutable-cover
  // directory; the purpose still names its owner for the presign contract.
  'branch-cover': 'covers',
  // M7 #215: the brand logo gets its own immutable directory — a logo is
  // not a cover (the purpose names the owner, the prefix names the class).
  'site-logo': 'brand',
  'gallery-photo': 'gallery',
  // M9 #331: studio-service covers share the covers/ prefix — the
  // branch-cover ruling carried to the fifth purpose.
  'service-cover': 'covers',
};
```

- [ ] **Step 5: Rebuild + run the pins to verify they pass.**

Run: `pnpm --filter @sevendays/types build && pnpm --filter @sevendays/types test` → green — media.test.ts +1 purpose pin; suite total **189 passed** (18 files).
Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- --run src/services/media.test.ts test/media-routes.test.ts` → green (+3 in those two files).
Run: `pnpm --filter @sevendays/types typecheck && pnpm --filter @sevendays/api typecheck` → green.

- [ ] **Step 6: Commit.**

```bash
git add packages/types/src/media.ts packages/types/src/media.test.ts apps/api/src/services/media.ts apps/api/src/services/media.test.ts apps/api/test/media-routes.test.ts
git commit -m "feat(types,api): 'service-cover' joins the media purposes - JPG-only presign, immutable covers/ promotion (#331)"
```

**Not here:** no `mediaPresignRequestSchema`/`superRefine` edit (the else-branch already rules the new purpose — that the PNG pin passes WITHOUT touching the pair check is the acceptance proof); no `commitUpload` caps edit (same law); no `MEDIA_CONTENT_TYPES` change; no admin `cover-upload.ts` purpose wiring (#332).

## Task 3 — the studio-service wire: read schemas + resolved reads + every consumer ripple (types + api + fixtures, atomic)

The #214 Task-2 shape, halved on purpose: this task lands the READ half (schemas whole per D2 — row + canonical read + the create/update split — plus every read resolution), and Task 4 lands the WRITE behavior. The split is safe because the new payload field is optional: until #332 wires the editor, no consumer sends it, so the save paths in this task ignore it (no test sends it until Task 4). One commit — types and api force each other's typecheck (`StudioServiceWithBranches` gains required `coverImageUrl`; the api's assemblies must produce it), and the fixture repairs in admin/landing/api-client keep every package's gate green in the same commit.

**Files:**
- Modify (test-first): `packages/types/src/studio-service.test.ts` (fixtures re-seated; alias pin removed; +9 its)
- Modify (test-first): `apps/api/test/studio-services.test.ts` (+1 it; imports)
- Modify (test-first): `apps/api/test/admin-studio-services.test.ts` (+1 it; imports)
- Modify (test-first, fixture repairs): `apps/api/test/cms-schema-contracts.test.ts` (one literal), `apps/admin/src/lib/light-entity-state.test.ts` (one literal), `apps/landing/src/lib/booking.test.ts` (one literal), `apps/landing/src/lib/booking-read.test.ts` (one literal), `apps/landing/src/lib/bookable-branches.test.ts` (one literal), `packages/api-client/test/mock-api.ts` (two literals)
- Modify: `packages/types/src/studio-service.ts`, `apps/api/src/services/studio-services.ts`, `apps/api/src/services/admin-entities.ts` (assembly + signatures), `apps/api/src/routes/studio-services.ts`, `apps/api/src/routes/admin-studio-services.ts` (env threading)

**Interfaces:**
- Consumes: Task 1 (the column on rows); Task 2 (nothing — independent).
- Produces: `studioServiceSchema` rows carry `coverImageKey: string | null`; `studioServiceWithBranchesSchema` (the ONE canonical read) carries `coverImageUrl: string | null` and never the key — it types the public GET, the admin list/get, and the landing's `ReadCatalog.services`; `CreateStudioServiceInput.coverImageKey?: string`; `UpdateStudioServiceInput.coverImageKey?: string | null`; api fns `listActiveStudioServicesWithBranches(db, env)`, `listAdminStudioServices(db, env)`, `getAdminStudioService(db, env, id)`, `createAdminStudioService(db, env, audit, input)`, `updateAdminStudioService(db, env, audit, id, input)`, `setStudioServiceBranchMatrix(db, env, audit, id, branchIds)`, `setStudioServiceAddonMatrix(db, env, audit, id, addonServiceIds)` — Task 4 adds `log?` to create/update and cover behavior inside them.

- [ ] **Step 1: Re-seat + extend the types pins.** In `packages/types/src/studio-service.test.ts`:

(a) Extend the constants after line 11 (`const UUID = …`):

```ts
const COVER_KEY = 'covers/00000000-0000-4000-8000-000000000001.jpg';
const COVER_URL = `https://pub-0000.r2.dev/${COVER_KEY}`;
const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000002.jpg';
```

(b) Extend `fullRow` — current block (lines 13–21) for exact match:

```ts
const fullRow = {
  id: UUID,
  name: 'Portraits & ID Photo',
  description: 'Studio portraits and ID photos.',
  priceCents: 50000,
  isActive: true,
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};
```

Replace with:

```ts
const fullRow = {
  id: UUID,
  name: 'Portraits & ID Photo',
  description: 'Studio portraits and ID photos.',
  priceCents: 50000,
  isActive: true,
  coverImageKey: COVER_KEY,
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};
```

(c) Add to the `describe('studioServiceSchema', …)` block (after the rejects-a-negative-price it):

```ts
  it('parses a bare row (coverImageKey null) — born-null covers are the default state (#331)', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, coverImageKey: null });
    expect(result.success).toBe(true);
  });
```

(d) Add a new describe after the `studioServiceWithBranchesSchema` describe:

```ts
describe('the canonical read resolves covers (#331, the branchReadSchema precedent)', () => {
  const read = {
    ...fullRow,
    bookableBranchIds: [],
    applicableAddonServiceIds: [],
    coverImageUrl: COVER_URL,
  };

  it('parses a resolved read (coverImageUrl is the absolute URL)', () => {
    expect(studioServiceWithBranchesSchema.safeParse(read).success).toBe(true);
  });

  it('null coverImageUrl parses (no cover is a null URL, never a string)', () => {
    expect(studioServiceWithBranchesSchema.safeParse({ ...read, coverImageUrl: null }).success).toBe(
      true
    );
  });

  it('strips a smuggled coverImageKey from the parsed read output (ADR-0019: raw keys never leave)', () => {
    const parsed = studioServiceWithBranchesSchema.parse({ ...read, coverImageKey: COVER_KEY });
    expect('coverImageKey' in parsed).toBe(false);
  });
});
```

(e) Add to the `describe('createStudioServiceSchema', …)` block:

```ts
  it('accepts a fresh staging key; rejects null (clear-before-create is meaningless, #331)', () => {
    const base = { name: 'X', description: 'Y', priceCents: 1 };
    expect(createStudioServiceSchema.safeParse({ ...base, coverImageKey: STAGING_KEY }).success).toBe(
      true
    );
    expect(createStudioServiceSchema.safeParse({ ...base, coverImageKey: null }).success).toBe(
      false
    );
  });

  it('drops coverImageUrl from the parsed create output (reads never echo through writes, #331)', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      coverImageUrl: COVER_URL,
    });
    expect('coverImageUrl' in parsed).toBe(false);
  });
```

(f) REPLACE the alias pin — current block (lines 140–142) for exact match:

```ts
  it('update is the create schema (full-object PUT)', () => {
    expect(updateStudioServiceSchema).toBe(createStudioServiceSchema);
  });
```

Replace with:

```ts
  it('absent coverImageKey stays ABSENT from the parsed output (unchanged, #331)', () => {
    const parsed = updateStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      isActive: true,
    });
    expect('coverImageKey' in parsed).toBe(false);
  });

  it('null parses and survives (explicit clear, #331)', () => {
    const parsed = updateStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      isActive: true,
      coverImageKey: null,
    });
    expect(parsed.coverImageKey).toBeNull();
  });

  it('a staging-key string parses (bind/replace via a fresh staging key, #331)', () => {
    const parsed = updateStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      isActive: true,
      coverImageKey: STAGING_KEY,
    });
    expect(parsed.coverImageKey).toBe(STAGING_KEY);
  });
```

Net: +9 its, −1 alias it.

- [ ] **Step 2: Write the failing api read pins.**

In `apps/api/test/studio-services.test.ts` — extend the imports (current lines 1–2 for exact match):

```ts
import type { StudioServiceWithBranches } from '@sevendays/types';
import { beforeEach, describe, expect, it } from 'vitest';
```

Replace with:

```ts
import { studioServices } from '@sevendays/db';
import type { StudioServiceWithBranches } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
```

Then add at the end of the `GET /api/v1/studio-services` describe:

```ts
  it('#331: resolves coverImageUrl for covered rows; null passthrough; the raw key never rides the read', async () => {
    const COVER_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000e1.jpg';
    await db
      .update(studioServices)
      .set({ coverImageKey: COVER_KEY })
      .where(eq(studioServices.id, ids.servicePortrait));
    const res = await app.request('/api/v1/studio-services', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as (StudioServiceWithBranches & { coverImageKey?: string })[];
    const portrait = body.find((s) => s.id === ids.servicePortrait);
    const studio = body.find((s) => s.id === ids.serviceStudio);
    expect(portrait?.coverImageUrl).toBe(`https://pub-test.r2.dev/${COVER_KEY}`);
    expect(portrait).not.toHaveProperty('coverImageKey');
    expect(studio?.coverImageUrl).toBeNull();
  });
```

In `apps/api/test/admin-studio-services.test.ts` — extend the `@sevendays/db` import (current lines 1–6 for exact match):

```ts
import {
  auditLog,
  branches,
  branchStudioServices,
  studioServiceAddonServices,
} from '@sevendays/db';
```

Replace with:

```ts
import {
  auditLog,
  branches,
  branchStudioServices,
  studioServiceAddonServices,
  studioServices,
} from '@sevendays/db';
```

Then add inside `describe('studio services admin CRUD', …)` (after the GET /:id unknown → 404 it):

```ts
  it('#331: GET /:id resolves coverImageUrl for a covered row; the raw key never rides the read', async () => {
    const COVER_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000e2.jpg';
    await db
      .update(studioServices)
      .set({ coverImageKey: COVER_KEY })
      .where(eq(studioServices.id, ids.serviceStudio));
    const res = await authed(
      'GET',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'admin-services-cover-read@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toBe(`https://pub-test.r2.dev/${COVER_KEY}`);
    expect(body).not.toHaveProperty('coverImageKey');
  });
```

- [ ] **Step 3: The six fixture repairs (schema ripples — behavior unchanged).** Each is one literal gaining the now-required field:

(a) `apps/api/test/cms-schema-contracts.test.ts` — the studio-service row parse (line ~147). Current block for exact match:

```ts
    const read = studioServiceSchema.safeParse({
      id: UUID,
      name: 'Photo Restoration',
      description: 'Restore old photographs',
      priceCents: 50000,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
```

Replace with:

```ts
    const read = studioServiceSchema.safeParse({
      id: UUID,
      name: 'Photo Restoration',
      description: 'Restore old photographs',
      priceCents: 50000,
      isActive: true,
      coverImageKey: null,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
```

(b) `apps/admin/src/lib/light-entity-state.test.ts` (line 36) — the `service` fixture. Current block for exact match:

```ts
const service = studioServiceWithBranchesSchema.parse({
  id: uuid(2),
  name: 'Hair & Makeup',
  description: 'On-location styling.',
  priceCents: 150000,
  isActive: true,
  createdAt: STAMP,
  updatedAt: STAMP,
  bookableBranchIds: [uuid(1), uuid(3)],
  applicableAddonServiceIds: [uuid(4)],
});
```

Replace with:

```ts
const service = studioServiceWithBranchesSchema.parse({
  id: uuid(2),
  name: 'Hair & Makeup',
  description: 'On-location styling.',
  priceCents: 150000,
  isActive: true,
  coverImageUrl: null,
  createdAt: STAMP,
  updatedAt: STAMP,
  bookableBranchIds: [uuid(1), uuid(3)],
  applicableAddonServiceIds: [uuid(4)],
});
```

(The line-341 `other` fixture spreads `...service` — it inherits the field; no second edit.)

(c) `apps/landing/src/lib/booking.test.ts` — the `service` factory. All three landing factories below share one byte-identical, per-file UNIQUE anchor (verified 2026-11-21: `description: 'test service',` occurs exactly once per file; the sibling addon/package/branch factories carry different literals). Current block for exact match:

```ts
    description: 'test service',
    priceCents: 150000,
    isActive: true,
```

Replace with:

```ts
    description: 'test service',
    priceCents: 150000,
    isActive: true,
    coverImageUrl: null,
```

(d) `apps/landing/src/lib/booking-read.test.ts` — same edit, same unique anchor (the service factory at ~line 105; the package factory's `'test package'` literal is untouched).

(e) `apps/landing/src/lib/bookable-branches.test.ts` — same edit, same unique anchor (the service factory at ~line 27).

(f) `packages/api-client/test/mock-api.ts` — the two `STUDIO_SERVICES` rows (the `isActive`/`createdAt: NOW` pairs alone are NOT unique in this file — other fixtures share them; the full rows are). Row one — current block for exact match:

```ts
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Portraits & ID Photo',
    description: 'Studio portraits and ID photos.',
    priceCents: 50000,
    isActive: true,
    createdAt: NOW,
```

Replace with:

```ts
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Portraits & ID Photo',
    description: 'Studio portraits and ID photos.',
    priceCents: 50000,
    isActive: true,
    coverImageUrl: null,
    createdAt: NOW,
```

Row two — current block for exact match:

```ts
    id: 'e0000000-0000-4000-8000-000000000000',
    name: 'Retired Studio Service',
    description: 'No longer offered.',
    priceCents: 60000,
    isActive: false,
    createdAt: NOW,
```

Replace with:

```ts
    id: 'e0000000-0000-4000-8000-000000000000',
    name: 'Retired Studio Service',
    description: 'No longer offered.',
    priceCents: 60000,
    isActive: false,
    coverImageUrl: null,
    createdAt: NOW,
```

The mock's route handler spreads these rows into the parsed response — without the field the loopback's `unwrap` fails the now-required nullable.

- [ ] **Step 4: Run the new/edited tests to verify they fail.**

Run: `pnpm --filter @sevendays/types test 2>&1 | grep -E "Tests  "` → FAIL (row/read/create/update pins red).
Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- --run test/studio-services.test.ts test/admin-studio-services.test.ts` → FAIL (the two read pins + the contract fixture).

- [ ] **Step 5: Land the types schemas.** In `packages/types/src/studio-service.ts`:

(a) The row mirror — current `studioServiceSchema` (lines 7–17) for exact match:

```ts
export const studioServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  // Null = unpriced (ADR-0020): inquiry-priced offerings are fully bookable;
  // no sentinel value. Nullable on reads AND writes alike.
  priceCents: z.number().int().nonnegative().nullable(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
```

Replace with:

```ts
export const studioServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  // Null = unpriced (ADR-0020): inquiry-priced offerings are fully bookable;
  // no sentinel value. Nullable on reads AND writes alike.
  priceCents: z.number().int().nonnegative().nullable(),
  isActive: z.boolean().default(true),
  // R2 object key for the cover image (#331): the ROW shape keeps the key
  // for read-time resolution; the wire never carries it — reads parse the
  // canonical shape below (the branchReadSchema precedent, M7 #214).
  coverImageKey: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
```

(b) The create schema + alias — current block (lines 21–27 + 43–46) for exact match:

```ts
export const createStudioServiceSchema = studioServiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateStudioServiceInput = z.infer<typeof createStudioServiceSchema>;
```

and

```ts
// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateStudioServiceSchema = createStudioServiceSchema;

export type UpdateStudioServiceInput = CreateStudioServiceInput;
```

Replace the first block with:

```ts
export const createStudioServiceSchema = studioServiceSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    coverImageKey: true,
  })
  .extend({
    // Media-bind field (#331, ADR-0019 — the branchWriteBase precedent): a
    // fresh STAGING key just uploaded via presign. Absent = no cover at
    // create; null is meaningless before a row exists (create rejects it).
    coverImageKey: z.string().min(1).optional(),
  });

export type CreateStudioServiceInput = z.infer<typeof createStudioServiceSchema>;
```

Replace the second block with:

```ts
// Full-object PUT (M5 § Mutation shapes) plus the cover's tri-state
// encoding (#331, the updateBranchSchema law): string = bind/replace via a
// fresh staging key, null = clear, absent = unchanged.
export const updateStudioServiceSchema = createStudioServiceSchema.extend({
  coverImageKey: z.string().min(1).nullable().optional(),
});

export type UpdateStudioServiceInput = z.infer<typeof updateStudioServiceSchema>;
```

(c) The canonical read — current block (lines 36–39) for exact match:

```ts
export const studioServiceWithBranchesSchema = studioServiceSchema.extend({
  bookableBranchIds: z.array(z.uuid()),
  applicableAddonServiceIds: z.array(z.uuid()),
});
```

Replace with:

```ts
export const studioServiceWithBranchesSchema = studioServiceSchema
  .omit({ coverImageKey: true })
  .extend({
    bookableBranchIds: z.array(z.uuid()),
    applicableAddonServiceIds: z.array(z.uuid()),
    // #331: resolved against MEDIA_PUBLIC_BASE_URL at read time (the
    // branchReadSchema law) — the wire carries the absolute URL, null
    // passthrough for a null key; the raw key never leaves the API.
    coverImageUrl: z.url().nullable(),
  });
```

- [ ] **Step 6: Land the api reads.**

(a) `apps/api/src/services/studio-services.ts` — the public read. Add to the imports (current lines 8–10 for exact match):

```ts
import type { StudioServiceWithBranches } from '@sevendays/types';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';
```

Replace with:

```ts
import type { StudioServiceWithBranches } from '@sevendays/types';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Env } from '../env.js';
import { groupChildren } from './group-children.js';
import { resolveMediaUrl } from './media.js';

type MediaEnv = Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>;
```

Change the signature (line 23) from `export async function listActiveStudioServicesWithBranches(\n  db: Database\n): Promise<StudioServiceWithBranches[]> {` to:

```ts
export async function listActiveStudioServicesWithBranches(
  db: Database,
  env: MediaEnv
): Promise<StudioServiceWithBranches[]> {
```

and the final map (lines 71–75) from:

```ts
  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
    applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
  }));
```

to:

```ts
  // #331: strip the raw key, resolve the absolute URL (the branches read's
  // shape) — raw keys never leave the API.
  return serviceRows.map((s) => {
    const { coverImageKey, ...rest } = s;
    return {
      ...rest,
      coverImageUrl: resolveMediaUrl(env, coverImageKey),
      bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
      applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
    };
  });
```

(b) `apps/api/src/services/admin-entities.ts` — the assembly. Change `assembleAdminStudioServices`'s signature (lines 459–462) from:

```ts
async function assembleAdminStudioServices(
  db: Database,
  serviceRows: StudioServiceRow[]
): Promise<StudioServiceWithBranches[]> {
```

to:

```ts
async function assembleAdminStudioServices(
  db: Database,
  env: BranchEnv,
  serviceRows: StudioServiceRow[]
): Promise<StudioServiceWithBranches[]> {
```

(`BranchEnv` — the file's existing `Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>` at line 63, threaded now so Task 4's cover commit needs no second signature pass — the spec's D4 "the branches' BranchEnv shape".) And the final map (lines 482–486) from:

```ts
  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
    applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
  }));
```

to:

```ts
  // #331: strip the raw key, resolve the absolute URL — ALL rows including
  // deactivated (the admin truth), raw keys never leaving.
  return serviceRows.map((s) => {
    const { coverImageKey, ...rest } = s;
    return {
      ...rest,
      coverImageUrl: resolveMediaUrl(env, coverImageKey),
      bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
      applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
    };
  });
```

Thread `env` through the six callers (mechanical, no behavior): `listAdminStudioServices(db, env)` (line 489 — `assembleAdminStudioServices(db, env, serviceRows)`), `getAdminStudioService(db, env, id)` (lines 495–503 — the internal call gains `env`), `createAdminStudioService(db, env, audit, input)` (line 505 — env param + the line-524 assemble call), `updateAdminStudioService(db, env, audit, id, input)` (line 529 — env param + the line-569 assemble call), `setStudioServiceBranchMatrix(db, env, audit, id, branchIds)` (line 582 — env param + the line-632 `getAdminStudioService(db, env, id)` call), `setStudioServiceAddonMatrix(db, env, audit, id, addonServiceIds)` (line 638 — same).

(c) `apps/api/src/routes/studio-services.ts` — the whole file's handler becomes:

```ts
export const studioServices = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveStudioServicesWithBranches(db, c.env));
});
```

(d) `apps/api/src/routes/admin-studio-services.ts` — thread `c.env` into every service-fn call: the GET `/` (`listAdminStudioServices(c.get('db'), c.env)`), GET `/:id` (`getAdminStudioService(c.get('db'), c.env, id)`), POST (`createAdminStudioService(c.get('db'), c.env, auditActor(c), c.req.valid('json'))`), PUT `/:id` (`updateAdminStudioService(c.get('db'), c.env, auditActor(c), id, c.req.valid('json'))`), and both matrix PUTs (`setStudioServiceBranchMatrix(c.get('db'), c.env, auditActor(c), id, branchIds)` / `setStudioServiceAddonMatrix(c.get('db'), c.env, auditActor(c), id, addonServiceIds)`). The DELETE route's call is unchanged in this task (Task 4 gives `deleteAdminStudioService` its env).

- [ ] **Step 7: Rebuild + full ripple gate.**

Run, in order (dist consumers first):

```bash
pnpm --filter @sevendays/types build
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test
pnpm --filter @sevendays/api typecheck
pnpm --filter @sevendays/api build
pnpm --filter @sevendays/api-client test && pnpm --filter @sevendays/api-client typecheck
pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing typecheck
pnpm --filter @sevendays/admin test && pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/types test && pnpm --filter @sevendays/types typecheck
```

Expected: api **476 passed + 3 skipped** (471 + Task 2's 3 + this task's 2); api-client **45** / landing **134** / admin **360** unchanged (fixture repairs only); types **197 passed** (188 + 1 + 8).

- [ ] **Step 8: Commit.**

```bash
git add packages/types/src/studio-service.ts packages/types/src/studio-service.test.ts apps/api/src/services/studio-services.ts apps/api/src/services/admin-entities.ts apps/api/src/routes/studio-services.ts apps/api/src/routes/admin-studio-services.ts apps/api/test/studio-services.test.ts apps/api/test/admin-studio-services.test.ts apps/api/test/cms-schema-contracts.test.ts apps/admin/src/lib/light-entity-state.test.ts apps/landing/src/lib/booking.test.ts apps/landing/src/lib/booking-read.test.ts apps/landing/src/lib/bookable-branches.test.ts packages/api-client/test/mock-api.ts
git commit -m "feat(types,api): the studio-service read resolves coverImageUrl - raw keys stay server-side; the save schemas split create/update (#331)"
```

**Not here:** no cover WRITE behavior (Task 4: `resolveServiceCover`, the displaced-key deletes, the logger threading); no `deleteAdminStudioService` env (Task 4); no admin editor/state-seam work beyond the two authorized ripples (#332 — the `light-entity-state.test.ts` parse literal + the one-line `buildStudioServicePayload` return-annotation retype in `light-entity-state.ts`, both zero-behavior mechanical schema repairs; the builder's BODY, the flip payload, and the tri-state encoding stay #332's); no landing consumption (#333 — the factories are typecheck repairs); the `service-teaser-item.tsx`/`home-cards.tsx`/`service-card.tsx` type consumers need no edit (they read fields; they never construct literals — verified by the typecheck gate).

## Task 4 — the tri-state save + the delete cleanup (admin-entities, admin-delete, routes, pins, cache verify)

`resolveBranchCover` ported verbatim as `resolveServiceCover` (purpose `'service-cover'`), the save composing the stored key, displaced objects deleted post-commit, the guarded DELETE dropping the stored cover, the write routes threading the logger, and the read-cache seam verified untouched. One commit.

**Files:**
- Modify (test-first): `apps/api/test/admin-studio-services.test.ts` (+5 its, one new describe + imports)
- Modify (test-first): `apps/api/test/admin-delete.test.ts` (+1 it + one import alias)
- Modify: `apps/api/src/services/admin-entities.ts` (resolveServiceCover + the two save fns), `apps/api/src/services/admin-delete.ts` (deleteAdminStudioService), `apps/api/src/routes/admin-studio-services.ts` (logger on POST/PUT, env on DELETE)
- Verify-only (zero edits): `apps/api/src/services/read-cache.ts`

**Interfaces:**
- Consumes: Task 1 (column), Task 2 (`'service-cover'` purpose), Task 3 (env-threaded signatures, resolved reads).
- Produces: the complete tri-state law on the admin save — `createAdminStudioService(db, env, audit, input, log?)` / `updateAdminStudioService(db, env, audit, id, input, log?)` committing the cover BEFORE the transaction, re-pathing commit failures to 400 `['coverImageKey']`, deleting displaced keys post-commit; `deleteAdminStudioService(db, env, audit, id)` deleting the stored cover post-commit. #332's editor consumes exactly this contract.

- [ ] **Step 1: Write the failing save pins.** In `apps/api/test/admin-studio-services.test.ts`:

(a) Extend the imports — the file's current import head, through the `signUpSession` line (post-Task-3 state, lines 1–11), for exact match:

```ts
import {
  auditLog,
  branches,
  branchStudioServices,
  studioServiceAddonServices,
  studioServices,
} from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
```

Replace with (adds the r2 stub; the `testEnv` import already on line 12 stays):

```ts
import {
  auditLog,
  branches,
  branchStudioServices,
  studioServiceAddonServices,
  studioServices,
} from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
```

(b) Add a new describe after `describe('unpriced saves (ADR-0020)', …)` (the file's last describe):

```ts
describe('the cover tri-state (#331)', () => {
  const STAGING = 'tmp/00000000-0000-4000-8000-0000000000d1.jpg';

  it('POST with a staging cover → 201, the cover promoted + resolved (raw key never on the read)', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'admin-services-cover-create@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/studio-services',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Photo Restoration',
          description: 'Restore old photographs.',
          priceCents: 45000,
          coverImageKey: STAGING,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/covers\/[0-9a-f-]+\.jpg$/);
    expect(body).not.toHaveProperty('coverImageKey');
    // The promote happened: one put at the final key, the staging deleted.
    expect(stub.putCalls).toHaveLength(1);
    expect(stub.deleteCalls).toEqual([STAGING]);
  });

  it('PUT without the cover field leaves the cover UNCHANGED (absent = keep; no bucket touch)', async () => {
    const OLD_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000d2.jpg';
    await db
      .update(studioServices)
      .set({ coverImageKey: OLD_KEY })
      .where(eq(studioServices.id, ids.serviceStudio));
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'admin-services-cover-keep@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Studio Portraits',
          description: 'Module-level service fixture.',
          priceCents: 70000,
          isActive: true,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toBe(`https://pub-test.r2.dev/${OLD_KEY}`);
    expect(stub.deleteCalls).toEqual([]);
  });

  it('PUT with coverImageKey null clears the cover and deletes the old object post-commit', async () => {
    const OLD_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000d3.jpg';
    await db
      .update(studioServices)
      .set({ coverImageKey: OLD_KEY })
      .where(eq(studioServices.id, ids.serviceStudio));
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'admin-services-cover-clear@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Studio Portraits',
          description: 'Module-level service fixture.',
          priceCents: 70000,
          isActive: true,
          coverImageKey: null,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toBeNull();
    expect(stub.deleteCalls).toEqual([OLD_KEY]);
  });

  it('PUT with a new staging key replaces the cover; the OLD object deletes only after the commit', async () => {
    const OLD_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000d4.jpg';
    await db
      .update(studioServices)
      .set({ coverImageKey: OLD_KEY })
      .where(eq(studioServices.id, ids.serviceStudio));
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'admin-services-cover-replace@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Studio Portraits',
          description: 'Module-level service fixture.',
          priceCents: 70000,
          isActive: true,
          coverImageKey: STAGING,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).not.toBe(`https://pub-test.r2.dev/${OLD_KEY}`);
    expect(stub.deleteCalls).toContain(OLD_KEY);
  });

  it('PUT with a staging key that has no object → 400 with the coverImageKey field detail (the commit re-path)', async () => {
    const stub = stubCommitBucket(); // empty — head misses
    const { token } = await signUpSession(url, 'admin-services-cover-miss@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Studio Portraits',
          description: 'Module-level service fixture.',
          priceCents: 70000,
          isActive: true,
          coverImageKey: STAGING,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.details[0]?.path).toEqual(['coverImageKey']);
  });
});
```

- [ ] **Step 2: Write the failing delete pin.** In `apps/api/test/admin-delete.test.ts`:

(a) Extend the `@sevendays/db` import — add `studioServices as studioServicesTable,` after the `servicePackages as servicePackagesTable,` line (current lines 13–14 for exact match):

```ts
  servicePackages as servicePackagesTable,
  studioServiceAddonServices,
```

Replace with:

```ts
  servicePackages as servicePackagesTable,
  studioServiceAddonServices,
  studioServices as studioServicesTable,
```

(b) Add a new `it` inside the studio-services delete describe, directly after the `"studio service with no history deletes clean — BOTH matrices' rows cascade"` it:

```ts
  it("studio service with a cover deletes clean — the cover object goes only after the row's commit (#331)", async () => {
    const COVER_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000e3.jpg';
    await db
      .update(studioServicesTable)
      .set({ coverImageKey: COVER_KEY })
      .where(eq(studioServicesTable.id, ids.serviceStudio));
    const stub = stubCommitBucket();
    const res = await authed(
      'DELETE',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'delete-service-cover@sevendays.test',
      undefined,
      { MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(204);
    expect(stub.deleteCalls).toEqual([COVER_KEY]);
  });
```

(`serviceStudio` — the same delete-guard-clean row the sibling clean-delete it uses; no fixture appointment references any studio service, verified in `helpers/fixtures.ts` — the guard never blocks. The helper's fifth param spreads the bucket over `testEnv`.)

- [ ] **Step 3: Run the pins to verify they fail.**

Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- --run test/admin-studio-services.test.ts test/admin-delete.test.ts` → FAIL (six new pins red — the save ignores the field today; the delete never touches the bucket).

- [ ] **Step 4: Land `resolveServiceCover` + the save law.** In `apps/api/src/services/admin-entities.ts`:

(a) Add `resolveServiceCover` directly after `resolveBranchCover`'s closing brace (after line 108) — the port with only the purpose + entity name changed:

```ts
// The studio-service cover commit (#331, resolveBranchCover's ruling
// verbatim, one purpose over): HEAD-verify through commitUpload ONLY when
// a key is present — presence-encoding makes "changed" structural (stored
// keys are immutable final keys, inputs are staging keys, and the
// staging-key regex rejects final keys, so a present string is always a
// new bind). undefined = unchanged, null = clear, string = bind/replace.
// A commit failure re-paths its details onto the payload field and
// resolves as the conflict failure (→ 400). Runs BEFORE the transaction —
// bucket I/O never holds a tx open.
async function resolveServiceCover(
  env: BranchEnv,
  key: string | null | undefined,
  log?: RequestLogger
): Promise<{ ok: true; finalKey: string | null | undefined } | AdminWriteFailure> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'service-cover',
  });
  if (!commit.ok) {
    if (log) {
      logMediaFailure(log, { op: 'commit', reason: commit.reason });
    }
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): Detail => ({ path: ['coverImageKey'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}
```

(b) `createAdminStudioService` — current fn (Task 3 state: signature `(db, env, audit, input)`) gains the commit + explicit persistence. Current body for exact match:

```ts
export async function createAdminStudioService(
  db: Database,
  env: BranchEnv,
  audit: AuditActor,
  input: CreateStudioServiceInput
): Promise<AdminCreateResult<StudioServiceWithBranches>> {
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(studioServices).values(input).returning();
```

Replace with:

```ts
export async function createAdminStudioService(
  db: Database,
  env: BranchEnv,
  audit: AuditActor,
  input: CreateStudioServiceInput,
  log?: RequestLogger
): Promise<AdminCreateResult<StudioServiceWithBranches>> {
  const cover = await resolveServiceCover(env, input.coverImageKey, log);
  if (!cover.ok) return cover;
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .insert(studioServices)
        .values({ ...input, coverImageKey: cover.finalKey ?? null })
        .returning();
```

(the spread-then-override is load-bearing: the validated input's staging key never reaches the column — `coverImageKey` LAST always wins).

(c) `updateAdminStudioService` — three edits. Signature gains `log?`:

```ts
export async function updateAdminStudioService(
  db: Database,
  env: BranchEnv,
  audit: AuditActor,
  id: string,
  input: UpdateStudioServiceInput,
  log?: RequestLogger
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
```

After the name-clash pre-check's closing `}` (cheaper DB check first — bucket I/O only if the row is otherwise savable, the branches' order) and before the `action` line, insert:

```ts
  const cover = await resolveServiceCover(env, input.coverImageKey, log);
  if (!cover.ok) return cover;
```

And the update's `.set(...)` — current block for exact match:

```ts
      const [row] = await tx
        .update(studioServices)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(studioServices.id, id))
        .returning();
```

Replace with:

```ts
      const [row] = await tx
        .update(studioServices)
        .set({ ...input, coverImageKey: storedCover, updatedAt: new Date() })
        .where(eq(studioServices.id, id))
        .returning();
```

with `storedCover` composed right after the `action` declaration (the branches' law):

```ts
  // The cover tri-state composes the stored key: absent = keep the
  // current one, null = clear, string = the committed final key (#331).
  const storedCover = cover.finalKey === undefined ? current.coverImageKey : cover.finalKey;
```

(`current` is the fn's existing raw-row read — it carries `coverImageKey` since Task 1.) Finally, after the `if (!result.ok) return result;` line and before the assemble call, the post-commit hygiene (the #137 precedent — a rolled-back save never deletes):

```ts
  // After-commit bucket hygiene (#331, the #137 precedent): the
  // replaced/cleared cover's old object is deleted only AFTER the save
  // committed — a rolled-back save never deletes (the row still points
  // at it).
  if (current.coverImageKey && storedCover !== current.coverImageKey) {
    await env.MEDIA_BUCKET.delete(current.coverImageKey);
  }
```

- [ ] **Step 5: Land the delete + route threading.**

(a) `apps/api/src/services/admin-delete.ts` — `deleteAdminStudioService` gains the env + the post-commit delete. Signature (current lines 274–278) for exact match:

```ts
export async function deleteAdminStudioService(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
```

Replace with:

```ts
export async function deleteAdminStudioService(
  db: Database,
  env: Pick<Env, 'MEDIA_BUCKET'>,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
```

and the fn's tail — current block for exact match:

```ts
    await writeAuditRow(tx, audit, {
      entity: 'studio-service',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}
```

Replace with:

```ts
    await writeAuditRow(tx, audit, {
      entity: 'studio-service',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  // ADR-0019 §5 + the #137 precedent: the cover object goes only after the
  // row's commit — a blocked or rolled-back delete never touches the bucket.
  if (current.coverImageKey) {
    await env.MEDIA_BUCKET.delete(current.coverImageKey);
  }
  return { ok: true };
}
```

(b) `apps/api/src/routes/admin-studio-services.ts` — three threading edits: the POST call gains the logger (`createAdminStudioService(c.get('db'), c.env, auditActor(c), c.req.valid('json'), c.get('logger'))`), the PUT `/:id` call gains it (`updateAdminStudioService(c.get('db'), c.env, auditActor(c), id, c.req.valid('json'), c.get('logger'))`), and the DELETE call gains the env (`deleteAdminStudioService(c.get('db'), c.env, auditActor(c), id)`).

- [ ] **Step 6: Run the pins to verify they pass + the full api gate.**

Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test`
Expected: **482 passed + 3 skipped** (476 + this task's 6), 34 files. Then `pnpm --filter @sevendays/api typecheck` → green.

- [ ] **Step 7: The cache-seam verify (D9 — runnable, zero edits).**

Run: `grep -n "studio-services" apps/api/src/services/read-cache.ts`
Expected: **exactly one line** — `// addon-services + studio-services (no cached read embeds them): absent.` (the ADMIN_MUTATION_READS comment). Any other match (an entry in `CACHED_READ_PREFIXES`, a key in `ADMIN_MUTATION_READS`) means the seam drifted — STOP and reconcile; this plan adds no cache work (the studio-services read stays uncached by the brief's fence).
Then run the read-cache suite to prove it untouched: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- --run test/read-cache.test.ts` → green, unchanged count.

- [ ] **Step 8: Commit.**

```bash
git add apps/api/src/services/admin-entities.ts apps/api/src/services/admin-delete.ts apps/api/src/routes/admin-studio-services.ts apps/api/test/admin-studio-services.test.ts apps/api/test/admin-delete.test.ts
git commit -m "feat(api): the studio-service tri-state cover save + the guarded delete drops the stored cover post-commit (#331)"
```

**Not here:** no separate audit pin (the cover rides the existing per-save rows — the M6 #185 law; the suite's existing studio-service audit its already cover the create/update/deactivate paths); no mutation-log pin for the studio-service commit failure (the seam is the packages' #240 pin's exact machinery — `logMediaFailure({op:'commit'})` — already proven there); no eviction work (Step 7's fence); no admin editor wiring (#332).

## Task 5 — docs rotation + floors + graphify + the final gate

**Files:**
- Modify: `docs/progress.md` (append one dated section at file end — the house pattern)
- Modify: `AGENTS.md` (the api floor sentence: two exact-string edits)
- Local/commit: graphify output

**Interfaces:**
- Consumes: Tasks 1–4 landed; the green runs' ACTUAL counts.
- Produces: the durable record; nothing code-side.

- [ ] **Step 1: `docs/progress.md` — append this section verbatim at the end of the file:**

```markdown
## 2026-11-21 — #331: service covers, the API spine — the fifth purpose, the cover column, the tri-state save, resolved reads

Studio services gained staff-settable cover photos at the API, riding the exact media machinery packages/branches/site-logo already run (spec #330, map #324). `service-cover` joined the media purposes (JPG-only per #170 — the presign pair check needed no edit) with final keys in the shared immutable `covers/` directory; `studio_services.cover_image_key` landed nullable via generated migration 0015 (born-null on every existing row — no cover = the documented fallback). The admin save runs the whole tri-state cover law ported from the branches (absent = keep, null = clear, staging string = bind/replace): the commit runs before the transaction, a commit failure re-paths onto `coverImageKey` as the 400 conflict, and displaced keys delete post-commit per ADR-0019. Every read — admin list/get over all rows, the public active-only GET — resolves the absolute `coverImageUrl` and never a raw key (the one canonical read shape, the branchReadSchema precedent); the save schemas split create (bind-only) from update (tri-state). The guarded DELETE deletes the stored cover post-commit; audit rides the existing save rows. The studio-services public read stays uncached (D9 verified — the cache seam untouched). Pins: types 197 (+9 net — the read/tri-state contract), api 482 (+11 — the purpose pair/promote, the two read resolutions, the five tri-state saves, the cover-bearing delete); db/api-client/landing/admin counts unchanged (fixture literals only). The editor Cover field is #332, the landing consumption #333, and the teaser owner-reaction pass #334 — the spine is not "done done" until #334 records.
```

- [ ] **Step 2: `AGENTS.md` — the two floor edits.**

(a) In the "Current status of `pnpm test`" api sentence, replace the exact string `471 passed + 3 skipped` with `482 passed + 3 skipped` (one occurrence — the api floors line).
(b) In the same sentence's parenthetical, replace the exact string `#214's nine branch-cover/caption pins` with `#214's nine branch-cover/caption pins + #331's eleven service-cover pins` (one occurrence).
(c) Verify both edits with: `grep -c "482 passed + 3 skipped" AGENTS.md` → `1`, and `grep -c "471 passed" AGENTS.md` → `0`. (No other floor sentence changes: types floors are not stated in AGENTS.md; db/api-client/landing/admin counts did not move.)

- [ ] **Step 3: Format + the final repo gate.**

Run: `pnpm fix` then `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check`
Expected: green at the repo root — lint + format + typecheck + test across every workspace, with floors: api **482 passed + 3 skipped** (34 files, 33 passed + 1 skipped); types **197** (18 files); db **22 passed + 8 skipped** (4 files); api-client **45** (5 files); landing **134** (17 files); admin **360** (34 files). Any other count means drift: stop and reconcile.

- [ ] **Step 4: Docs + graphify commits.**

```bash
git add docs/progress.md AGENTS.md
git commit -m "docs: #331 — progress section + the api/types floors for the service-covers spine"
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#331 graph update"
```

(Dirty `graphify-out/` files are expected, not a reason to skip.)

**Not here:** no issue-close in this plan's tasks — the controller closes #331 on the evidence (the merged PR + the acceptance criteria re-checked + the probe outputs); #332/#333/#334 stay open and continue on this same worktree/branch (rebase onto main after #331's PR lands, then execute #332's plan here); no v1 pick in-branch — post-merge, main-only per `docs/agents/v1-picks.md`; no `docs/plan.md` edit — no milestone box rides this ticket.

---

## Self-review checklist (controller pass — run before handoff)

- [✅] Placeholder scan: no TBD/TODO/"as appropriate"/paraphrased strings — every value the executor must land is quoted verbatim; no leftover APPEND anchors. (grep 2026-11-21: the only TBD/TODO/APPEND hit is this line itself.)
- [✅] Step-checkbox count: `grep -c '^- \[ \] \*\*Step'` on this file = 31 (Task 1: 5, Task 2: 6, Task 3: 8, Task 4: 8, Task 5: 4). (First draft claimed 26 — corrected at the source; 5+6+8+8+4 = 31. Verified by grep at handoff.)
- [✅] Cross-task consistency: the seven threaded signatures named in Task 3's Interfaces are the same seven the routes thread in Task 3 Step 6(d) — Task 4 changes only the two save fns' bodies (+`log?`) and the delete's signature, and its Step 5(b) routes match; `resolveServiceCover`'s `BranchEnv`/`RequestLogger`/`Detail`/`AdminWriteFailure` types all exist in admin-entities.ts at Task 4 time (BranchEnv line 63, Detail line 65, RequestLogger imported line 29, AdminWriteFailure imported line 32); the STAGING/COVER_KEY literals in Task 4's pins match the `mediaStagingKeySchema` shape (`tmp/<uuid>.jpg`, `covers/<uuid>.jpg`). Anchor uniqueness re-verified against the live files at handoff: the landing factories' `description: 'test service',` triple (exactly 1 per file — the addon/package/branch factories carry different literals) and the mock-api full-row quotes (the bare `isActive`/`createdAt: NOW` pairs are NOT unique in mock-api.ts — other fixtures share them; the rows are).
- [✅] Floor math recounted from the actual task blocks: api 471 + 3 (Task 2: 1 promote + 2 presign) + 2 (Task 3: public read + admin get) + 6 (Task 4: 5 tri-state + 1 delete) = **482**; types 188 + 1 (Task 2) + 9 added − 1 removed (Task 3) = **197** — matching Global Constraints, Task 3 Step 7, Task 4 Step 6, Task 5 Steps 2–3.
- [✅] Boundary re-check: #332's files (studio-services-screen.tsx, light-entity-state.ts, cover-upload.ts, admin.functions.ts), #333's files (home-cards.tsx, service-card.tsx, service-teaser-item.tsx, the precedence helper), read-cache.ts, the seed scripts, the package/branch/site-logo flows — each named "not here" in its task or the scope fences.
- [✅] Spec coverage: D1 = Task 1; D2 = Task 3 Step 5 (+ Task 2's enum); D3 = Task 2 (+ Global Constraints' prefix/cap law); D4 = Task 4 Steps 4–5 (+ audit-not-here note); D5 = Task 3 Step 6 (+ the two read pins); D6 = Task 4 Step 5(a) + Step 2's delete pin; D9 = Task 4 Step 7. Testing Decisions: types pins = Task 3 Step 1; media-suite pins = Task 2 Steps 1–2; admin-entity-suite pins = Task 4 Steps 1–2; the landing/admin fixture repairs = Task 3 Step 3 (the lib-seam pins themselves belong to #332/#333's seams — their factories merely stay parse-green). No gap.

