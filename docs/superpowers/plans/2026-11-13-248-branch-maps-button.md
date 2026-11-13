# Plan: #248 — Post-flight T8: branch Maps button (nullable coordinates, manual admin input, new-tab pin)

Parent: #239 (the M7 post-flight), item 17. The owner's feature request (2026-11-06, demo
step 5).

## Scope fences

**In scope:** nullable `latitude`/`longitude` on `branches` (one metadata-style migration —
nullable columns, no backfill, guarded-delete and bookability untouched); the wire shapes in
`packages/types` (row, read, create, update — bounds + ≤6 dp + the both-or-neither pair
rule); the API's create/update writes and both reads (public + admin); two manual decimal
fields in the admin branch Sheet editor (no geocoding — manual input per the owner's spec);
the `/branches` branch card's **Google Maps button** (outline, MapPin, new tab, the
canonical `google.com/maps?api=1&query=<lat>,<lng>` form — no API key, rendered only when
coordinates exist); the seam tests pinning all of it.

**NOT here (siblings / out of scope):**
- No geocoding, no Maps embed, no API key, no static-map images — a plain new-tab link.
- No booking-surface or home-strip work: the Maps button renders ONLY on the `/branches`
  `BranchCard` (the home featured strip's branch chips and the booking wizard are
  untouched).
- No hours/capacity (v2, per the branches-screen subline).
- No v1-branch edits in this branch — the v1 pick (Maps button LAST in the single-CTA row,
  after "Call {branch}") is a pick-time transform recorded in the plan's pick note below;
  the ledger row happens post-merge on main (`docs/agents/v1-picks.md`).
- #239's other items — untouched; the #239 roadmap checkbox stays unticked until the whole
  post-flight closes.

## Owner rulings (ratified 2026-11-13, plan round)

- **Bounds/precision:** latitude ∈ [-90, 90], longitude ∈ [-180, 180], at most 6 decimal
  places, validated in `packages/types` (schema-level). **Pair rule:** both set or both
  `null` — exactly one is a 400 (`Branch coordinates must be set together.`).
- **Button:** outline variant, `MapPin` icon, label **`Google Maps`**, in the existing CTA
  row (Call icon | Book at this branch | Google Maps), `target="_blank"` +
  `rel="noopener noreferrer"`, rendered only when coordinates exist.
- **v1 pick note:** on v1, the button moves to LAST in the single-CTA row, after the solid
  `Call {branch}` — a pick-time transform on the v1 branch, never a runtime branch here.

## Global Constraints

- After editing anything under `packages/types` or `packages/db`, run `pnpm build:packages`
  (api/admin consume built `dist/`), then `pnpm --filter @sevendays/api build` before
  `pnpm check`.
- Migration discipline: `pnpm --filter @sevendays/db db:generate` (never hand-edit
  `packages/db/migrations`), then `pnpm --filter @sevendays/db db:migrate` (needs
  `DATABASE_MIGRATE_URL` in `packages/db/.env` — present, 2 lines). The local test DB
  needs NO manual migration: `apps/api/test/global-setup.ts` runs
  `migrateDatabase(TEST_DATABASE_URL)` at every api-suite start (Task 1 Step 4).
- **Test-DB env (machine-specific, controller-resolved):** port 5432 here is another
  project's Postgres (`lactalink-test-db` — never touch it). The sevendays test DB is
  `postgres://postgres:postgres@localhost:5433/sevendays_test`, container
  `sevendays-test-db-5433` (`docker start sevendays-test-db-5433` before any suite run;
  local compose creds, not a secret). **Every api-suite command carries the variable
  INLINE** — `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test …`
  — background workers' shells do NOT inherit exports (hit live 2026-11-13 during
  #246). `turbo.json` passes `TEST_DATABASE_URL` through (`globalPassThroughEnv`).
- `pnpm check` (lint + format + typecheck + test) green before commit, for the
  packages/apps touched. `pnpm build` green before handoff.
- Test floors this plan must not regress (AGENTS.md): api 452 passed + 3 skipped (plus this
  plan's additions), api-client 5 files / 45 tests (unchanged — the branch wrappers ride
  `branchReadSchema` wholesale), admin 27 files / 279 tests (plus additions), landing 16
  files / 123 tests (plus 1 new file). `packages/types` runs under the same umbrella.
- Zod semantics rule: assert on parsed OUTPUT for strip behavior; the admin write failure
  contract is a RESOLVED `{ ok: false, reason, message, details? }` — never `.rejects`.
- Zod version note: `createBranchSchema`/`updateBranchSchema` must remain structurally
  extensible the way this plan arranges them (a plain shared base object, refinements
  applied last) — `updateBranchSchema` is NOT `.extend()`ed anywhere today, but the plan
  preserves plain-object exports where the codebase's inference (ZodEffects vs ZodObject)
  could bite a future `.extend()` caller.
- No new secrets, no new deps, no new ADR (a nullable metadata column + a link; no
  architectural choice). `docs/progress.md` updated at the end.
- Biome import ordering is enforced (`pnpm lint`): new imports land alphabetically within
  their group; the code blocks below show the final order.
- Verbatim strings this plan introduces (labels, error copy, comments) are quoted in full —
  use them exactly; do not paraphrase.

## Design (one paragraph, pinned before Task 1)

The DB gains two nullable `double precision` columns (`latitude`, `longitude`) —
`doublePrecision`, not `numeric`: drizzle's `numeric` maps to a TS `string`, and the wire
carries numbers. The row/read wire shapes gain `latitude`/`longitude` as required-nullable
number fields (post-migration every row has them). The create/update shapes move to a
shared plain base object (`branchWriteBase`) so each can carry the pair refinement
(`superRefine`) — the current `updateBranchSchema = createBranchSchema.extend(...)` chain
cannot survive a refinement on `createBranchSchema` itself, so the tri-state
`coverImageKey` extension moves onto the base before refinement. Coordinates on create
default to `null` when omitted (the `acceptsWalkIns` posture — the existing
"omitted defaulted fields" api test keeps passing); a full-object PUT omitting them also
defaults to `null` (the same clobber posture `acceptsWalkIns` already has — the admin
always sends both). The admin editor holds them as raw input strings (`''` = clear to
null), validated client-side with the same bounds/dp/pair rules, parsed to `number | null`
in the payload builders; the flip payload re-sends the row's stored values (a flip never
touches coordinates). The public card renders the Maps button through one pure seam —
`mapsUrlFor(branch)` in `apps/landing/src/lib/branch-maps.ts` — returning `null` when
either coordinate is `null`, else the canonical
`https://www.google.com/maps?api=1&query=<lat>,<lng>` URL (numbers interpolated verbatim —
the schema's bounds/dp rules already guarantee URL-safe output). The edge read-cache
(#263) needs no change: admin mutations already evict, and the new columns ride the same
reads.

## Task 1: DB — nullable coordinate columns + migration

**Files:**
- Modify: `packages/db/src/schema/branches.ts`
- Create (generated): `packages/db/migrations/0013_*.sql` + `meta/` journal entries
- Test: the migration itself (applied + the api suite green in Task 3's gate)

**Interfaces:**
- Produces: `branches.latitude: doublePrecision('latitude')` (nullable) and
  `branches.longitude: doublePrecision('longitude')` (nullable) on the drizzle table —
  every later task's `.set({...})`/read spread relies on exactly these names.

- [ ] **Step 1: Add the two columns to the schema**

In `packages/db/src/schema/branches.ts`, add after the `coverImageKey` column (line 20)
and before `createdAt`:

```ts
    // Branch coordinates (M7 #248, the owner's Maps request): manually
    // entered in the admin (no geocoding), consumed by the landing's
    // Google Maps new-tab pin. Born nullable — the live branches carry no
    // coordinates yet; both-or-neither is enforced at the wire schema
    // (packages/types), not here. doublePrecision, not numeric: the wire
    // carries numbers and drizzle's numeric maps to string.
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
```

And extend the import on line 1:

```ts
import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: a new `packages/db/migrations/0013_*.sql` whose entire content is two
`ALTER TABLE "branches" ADD COLUMN` statements (`"latitude" double precision`,
`"longitude" double precision`, both nullable — no backfill, no other tables). Read the
file; if it contains anything else, STOP and re-check the schema edit.

- [ ] **Step 3: Apply to the live dev DB**

Run: `pnpm --filter @sevendays/db db:migrate`
Expected: exit 0; re-running is a no-op.

- [ ] **Step 4: No manual test-DB migration (controller-resolved at pre-flight)**

Nothing to run here. `apps/api/test/global-setup.ts:15` runs
`migrateDatabase(TEST_DATABASE_URL)` at every api-suite start — the pending 0013
migration applies itself to the local test DB the first time Task 3's gate runs. Do NOT
hand-run drizzle-kit against the test DB and do NOT touch port 5432 (another project's
Postgres).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/branches.ts packages/db/migrations/
git commit -m "feat(db): nullable latitude/longitude on branches (#248)"
```

## Task 2: Wire schemas — packages/types

**Files:**
- Modify: `packages/types/src/branch.ts`
- Modify (fixture sweep — the read schema's new required keys break these literals):
  `packages/api-client/test/mock-api.ts:16-37` (the two `BRANCHES` entries),
  `apps/landing/src/lib/bookable-branches.test.ts:5` (`branch(name)` builder),
  `apps/landing/src/lib/booking-read.test.ts:65` (`branch(id, name)` builder),
  `apps/landing/src/lib/booking.test.ts:38` (`branch(id)` builder)
- Test: `packages/types/src/branch.test.ts`

**Interfaces:**
- Consumes: Task 1's columns (row shape now carries both, always present, nullable).
- Produces: `branchSchema.latitude/longitude: number | null` (required keys);
  `branchReadSchema` inherits them through the existing omit/extend chain;
  `createBranchSchema`/`updateBranchSchema` with `latitude`/`longitude` as
  `.nullable().default(null)` number fields plus the pair refinement; exported helper
  `atMostSixDp(v: number): boolean` (used by both field schemas and re-used verbatim by
  the admin's client-side validation in Task 4 — import it from `@sevendays/types`).

- [ ] **Step 1: Write the failing tests**

In `packages/types/src/branch.test.ts`, add to the existing describes (match the file's
fixture style — read the current `row` fixture first and add `latitude: null, longitude:
null` to it so existing parses keep passing):

```ts
describe('branch coordinates (#248)', () => {
  const coords = { latitude: 14.16598, longitude: 121.2485 };

  it('branchSchema accepts null coordinates on the row', () => {
    const { success } = branchSchema.safeParse({ ...row, latitude: null, longitude: null });
    expect(success).toBe(true);
  });

  it('branchReadSchema carries the coordinates through', () => {
    const parsed = branchReadSchema.parse({ ...readRow, ...coords });
    expect(parsed.latitude).toBe(14.16598);
    expect(parsed.longitude).toBe(121.2485);
  });

  it('createBranchSchema defaults omitted coordinates to null', () => {
    const parsed = createBranchSchema.parse(bareCreate);
    expect(parsed.latitude).toBeNull();
    expect(parsed.longitude).toBeNull();
  });

  it('createBranchSchema rejects a latitude beyond ±90', () => {
    const { success } = createBranchSchema.safeParse({ ...bareCreate, latitude: 91, longitude: 0 });
    expect(success).toBe(false);
  });

  it('createBranchSchema rejects a longitude beyond ±180', () => {
    const { success } = createBranchSchema.safeParse({ ...bareCreate, latitude: 0, longitude: 180.1 });
    expect(success).toBe(false);
  });

  it('createBranchSchema rejects more than 6 decimal places', () => {
    const { success } = createBranchSchema.safeParse({
      ...bareCreate,
      latitude: 14.1659812,
      longitude: 0,
    });
    expect(success).toBe(false);
  });

  it('updateBranchSchema rejects exactly one coordinate of the pair', () => {
    const { success } = updateBranchSchema.safeParse({ ...fullUpdate, latitude: 14.1 });
    expect(success).toBe(false);
  });

  it('updateBranchSchema accepts the full pair and the null pair', () => {
    expect(updateBranchSchema.safeParse({ ...fullUpdate, ...coords }).success).toBe(true);
    expect(
      updateBranchSchema.safeParse({ ...fullUpdate, latitude: null, longitude: null }).success
    ).toBe(true);
  });
});
```

If the file lacks create/update fixtures, define them beside the new describe (same
style as the row fixture):

```ts
const bareCreate = { name: 'New Branch', address: '1 St', phone: '+63 900 000 000' };
const fullUpdate = {
  name: 'Test Branch A',
  address: '1 Test St',
  phone: '+63 900 000 001',
  acceptsWalkIns: false,
  isActive: true,
};
```

(`bareCreate` deliberately omits the defaulted fields so the default test exercises them;
assert on parsed OUTPUT per the Zod strip rule — the default test above already does.)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/types test`
Expected: FAIL — `latitude` unknown to every schema (safeParse false / undefined fields).

- [ ] **Step 3: Implement the schema changes**

Rewrite `packages/types/src/branch.ts` as:

```ts
import { z } from 'zod';

// #248: coordinate bounds + precision, owner-ruled 2026-11-13 — decimal
// degrees, at most 6 dp (~0.1 m — what a Google Maps query URL carries).
// String-based so a float like 14.1659812 can't slip through on a rounding
// artifact.
export function atMostSixDp(v: number): boolean {
  return /^-?\d+(\.\d{1,6})?$/.test(String(v));
}

const latitudeSchema = z
  .number()
  .refine(atMostSixDp, 'At most 6 decimal places.')
  .min(-90, 'Latitude must be between -90 and 90.')
  .max(90, 'Latitude must be between -90 and 90.');

const longitudeSchema = z
  .number()
  .refine(atMostSixDp, 'At most 6 decimal places.')
  .min(-180, 'Longitude must be between -180 and 180.')
  .max(180, 'Longitude must be between -180 and 180.');

export const branchSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  acceptsWalkIns: z.boolean().default(false),
  // Deactivation (M5): hidden from public reads once #138 makes them
  // active-only; reversible, never a delete. Defaulted so pre-column
  // fixtures keep parsing.
  isActive: z.boolean().default(true),
  // R2 object key for the cover image (M7 #214): the ROW shape keeps the
  // key for read-time resolution; the wire never carries it — reads parse
  // branchReadSchema below (the servicePackageReadSchema precedent).
  coverImageKey: z.string().nullable(),
  // Coordinates (M7 #248): nullable, both-or-neither enforced on the write
  // schemas; rows always carry both keys post-migration.
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Branch = z.infer<typeof branchSchema>;

// The canonical read shape (M7 #214, the servicePackageReadSchema
// precedent): the wire never carries the raw R2 object key — every read
// resolves coverImageUrl against MEDIA_PUBLIC_BASE_URL at read time.
// Admin reads (deactivated rows included) and the public read share this
// shape; trim rules are content-level, not shape-level.
export const branchReadSchema = branchSchema.omit({ coverImageKey: true }).extend({
  coverImageUrl: z.url().nullable(),
});

export type BranchRead = z.infer<typeof branchReadSchema>;

// The shared plain write base (#248): a PLAIN object (no refinement) so the
// exported write schemas can each carry the coordinate-pair refinement — a
// refined ZodEffects cannot be .extend()ed, and update still extends the
// base for its cover tri-state.
const branchWriteBase = branchSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    coverImageKey: true,
    latitude: true,
    longitude: true,
  })
  .extend({
    // Media-bind field (ADR-0019, the packages-covers precedent): a fresh
    // STAGING key just uploaded via presign. Absent = no cover at create.
    // Presence-encoded by design — reads never echo keys, so there is no
    // full-object echo to make.
    coverImageKey: z.string().min(1).optional(),
    // #248: omitted = null (the acceptsWalkIns posture — a full-object PUT
    // that omits coordinates clears them; the admin always sends both).
    latitude: latitudeSchema.nullable().default(null),
    longitude: longitudeSchema.nullable().default(null),
  });

// Both-or-neither (#248, owner-ruled): a branch pin needs the full pair.
function withCoordinatePair<T extends z.ZodObject>(schema: T) {
  return schema.superRefine((value, ctx) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Branch coordinates must be set together.',
        path: ['latitude'],
      });
    }
  });
}

export const createBranchSchema = withCoordinatePair(branchWriteBase);

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// Full-object PUT (M5 § Mutation shapes) plus the cover's tri-state
// encoding (#137's update shape / ADR-0019): string = bind/replace via a
// fresh staging key, null = clear, absent = unchanged.
export const updateBranchSchema = withCoordinatePair(
  branchWriteBase.extend({
    coverImageKey: z.string().min(1).nullable().optional(),
  })
);

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
```

`branchWriteBase`, `withCoordinatePair`, `latitudeSchema`, and `longitudeSchema` stay
module-private; `atMostSixDp` is exported (Task 4 re-uses it). Keep the message string
exactly `'Branch coordinates must be set together.'`. One typing note: `z.infer` of a
refined schema is unchanged (superRefine adds no fields), so `CreateBranchInput`/
`UpdateBranchInput` keep their names and gain the two nullable fields.

If biome's formatter reflows the `.omit({...})` argument (line length), let it — run
`pnpm fix` at the task's gate rather than fighting the printer.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @sevendays/types test`
Expected: PASS (the new describe + all existing parses).

- [ ] **Step 5: Fix the schema's consumers (pre-flight sweep — required keys)**

`branchSchema`/`branchReadSchema` gain REQUIRED `latitude`/`longitude` keys (no default —
rows always carry them post-migration), so every literal constructed as a `BranchRead`
must grow the fields:

a) `packages/api-client/test/mock-api.ts` — add to BOTH `BRANCHES` entries (after
`acceptsWalkIns`):

```ts
    latitude: null,
    longitude: null,
```

Without this, the loopback suite's `client.branches.list()` ZodErrors on the
`branchReadSchema.array()` parse (runtime, not typecheck).

b) `apps/landing/src/lib/bookable-branches.test.ts`, `booking-read.test.ts`,
`booking.test.ts` — each file has a local `function branch(...): BranchRead` fixture
builder; add to its returned object:

```ts
    latitude: null,
    longitude: null,
```

These are TYPE-level (typed returns) — the root typecheck fails without them.

- [ ] **Step 6: Build + typecheck the dependents**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm typecheck`
Expected: all exit 0 — root typecheck covers landing/admin/api-client, catching any
fixture literal the sweep missed.

- [ ] **Step 7: Commit**

```bash
git add packages/types/src/branch.ts packages/types/src/branch.test.ts packages/api-client/test/mock-api.ts apps/landing/src/lib/bookable-branches.test.ts apps/landing/src/lib/booking-read.test.ts apps/landing/src/lib/booking.test.ts
git commit -m "feat(types): branch coordinate wire schemas — bounds, 6dp, pair rule (#248)"
```

## Task 3: API — persist coordinates on create/update; reads carry them

**Files:**
- Modify: `apps/api/src/services/admin-entities.ts` (the branches block only —
  `createAdminBranch`'s `.insert(branches).values({...})` around line 138 and
  `updateAdminBranch`'s `.set({...})` around line 186)
- Test: `apps/api/test/admin-entities.test.ts` (the `branches admin CRUD` describe)

**Interfaces:**
- Consumes: Task 2's `createBranchSchema`/`updateBranchSchema` (the validated `json`
  now carries `latitude`/`longitude: number | null`) and Task 1's columns.
- Produces: no new exports. `toBranchRead` (both services) already spreads the row via
  `...rest` — the new columns ride every read with ZERO service changes; only the two
  write sites change.

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/admin-entities.test.ts`, inside the `branches admin CRUD` describe:

```ts
  it('PUT with a coordinate pair persists both; the read carries them (#248)', async () => {
    const { token } = await signUpSession(url, 'admin-branches-coords@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
          acceptsWalkIns: false,
          isActive: true,
          latitude: 14.16598,
          longitude: 121.2485,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { latitude: number | null; longitude: number | null };
    expect(body.latitude).toBe(14.16598);
    expect(body.longitude).toBe(121.2485);
  });

  it('PUT with only one coordinate answers the pair-rule 400 (#248)', async () => {
    const { token } = await signUpSession(url, 'admin-branches-pair@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
          acceptsWalkIns: false,
          isActive: true,
          latitude: 14.16598,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Branch coordinates must be set together.',
    });
  });

  it('the public branches read carries stored coordinates (#248)', async () => {
    const { token } = await signUpSession(url, 'admin-branches-public@sevendays.test');
    const put = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
          acceptsWalkIns: false,
          isActive: true,
          latitude: 7.0864,
          longitude: 125.591,
        }),
      },
      testEnv(url)
    );
    expect(put.status).toBe(200);
    const res = await app.request('/api/v1/branches', {}, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; latitude: number | null }[];
    const a = body.find((b) => b.name === 'Test Branch A');
    expect(a?.latitude).toBe(7.0864);
  });
```

**Verify the 400 envelope shape before pinning the second test:** read
`apps/api/src/services/validator.ts` — `validatedJson` maps a Zod failure onto the
house 400. If its envelope is `{ error: <first message> }` the test above is right; if it
is `{ error: …, details: […] }`, change the `toEqual` to `toMatchObject({ error:
'Branch coordinates must be set together.' })` instead. The message string itself is
pinned by the schema (Task 2).

- [ ] **Step 2: Run to verify they fail**

Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- admin-entities`
Expected: the pair-400 test may already PASS if `validatedJson` rejects pre-service (then
it pins the envelope, keep it); the round-trip and public-read tests FAIL — the service
drops the fields (creates/updates never set them, so reads return `null`s).

- [ ] **Step 3: Persist the fields**

In `createAdminBranch`'s insert values object (after `acceptsWalkIns`), add:

```ts
          latitude: input.latitude,
          longitude: input.longitude,
```

In `updateAdminBranch`'s `.set({...})` (after `acceptsWalkIns: input.acceptsWalkIns,`),
add the same two lines. Nothing else in either service changes — `toBranchRead`'s
`...rest` spread carries the columns on every read, and the edge read-cache's
mutation-evict (#263) already covers the PUT.

- [ ] **Step 4: Run to verify they pass**

Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- admin-entities`
Expected: PASS — the whole file, including the pre-existing
"omitted defaulted fields exercise their defaults" POST (coords default to null).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/admin-entities.ts apps/api/test/admin-entities.test.ts
git commit -m "feat(api): branch create/update persist coordinates (#248)"
```

## Task 4: Admin — manual coordinate fields in the branch Sheet editor

**Files:**
- Modify: `apps/admin/src/lib/light-entity-state.ts`
- Modify: `apps/admin/src/components/branches/branches-screen.tsx`
- Test: `apps/admin/src/lib/light-entity-state.test.ts`

**Interfaces:**
- Consumes: `BranchRead.latitude/longitude: number | null` (Task 2),
  `atMostSixDp` from `@sevendays/types` (Task 2's export).
- Produces: `BranchEditorState.latitude: string` / `longitude: string` (raw input —
  `''` means clear-to-null); `LightFieldErrors` gains `latitude?: string` /
  `longitude?: string`; `buildBranchCreatePayload`/`buildBranchUpdatePayload` emit
  `latitude: number | null` / `longitude: number | null`; `buildBranchFlipPayload`
  re-sends the row's stored values untouched.

- [ ] **Step 1: Write the failing tests**

In `apps/admin/src/lib/light-entity-state.test.ts` (branch describe, matching its
existing fixture style):

```ts
  it('#248: state round-trips stored coordinates as strings', () => {
    const state = branchStateFromRead({ ...branchRead, latitude: 14.16598, longitude: 121.2485 });
    expect(state.latitude).toBe('14.16598');
    expect(state.longitude).toBe('121.2485');
  });

  it('#248: null coordinates round-trip as empty strings', () => {
    const state = branchStateFromRead({ ...branchRead, latitude: null, longitude: null });
    expect(state.latitude).toBe('');
    expect(state.longitude).toBe('');
  });

  it('#248: the update payload parses a valid pair to numbers', () => {
    const payload = buildBranchUpdatePayload({
      ...branchState,
      latitude: '14.16598',
      longitude: '121.2485',
    });
    expect(payload.latitude).toBe(14.16598);
    expect(payload.longitude).toBe(121.2485);
  });

  it('#248: empty inputs save the null pair (clear)', () => {
    const payload = buildBranchUpdatePayload({ ...branchState, latitude: '', longitude: '' });
    expect(payload.latitude).toBeNull();
    expect(payload.longitude).toBeNull();
  });

  it('#248: validation rejects an out-of-bounds latitude', () => {
    const errors = validateBranchState({ ...branchState, latitude: '91', longitude: '0' });
    expect(errors.latitude).toBeDefined();
  });

  it('#248: validation rejects more than 6 decimal places', () => {
    const errors = validateBranchState({
      ...branchState,
      latitude: '14.1659812',
      longitude: '0',
    });
    expect(errors.latitude).toBeDefined();
  });

  it('#248: validation rejects exactly one of the pair', () => {
    const bothEmpty = validateBranchState({ ...branchState, latitude: '', longitude: '' });
    expect(bothEmpty.latitude).toBeUndefined();
    const oneOnly = validateBranchState({ ...branchState, latitude: '14.1', longitude: '' });
    expect(oneOnly.latitude).toBeDefined();
    expect(oneOnly.longitude).toBeUndefined();
  });

  it('#248: validation rejects a non-numeric entry', () => {
    const errors = validateBranchState({ ...branchState, latitude: 'not a number', longitude: '0' });
    expect(errors.latitude).toBeDefined();
  });

  it('#248: the flip payload re-sends the stored coordinates untouched', () => {
    const payload = buildBranchFlipPayload({ ...branchRead, latitude: 7.0864, longitude: 125.591 }, false);
    expect(payload.latitude).toBe(7.0864);
    expect(payload.longitude).toBe(125.591);
  });
```

`branchRead`/`branchState` are the file's existing branch fixtures (add
`latitude: null, longitude: null` to `branchRead` and `latitude: '', longitude: ''` to
`branchState` so the pre-existing tests keep passing).

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/admin test -- light-entity-state`
Expected: FAIL — the fields don't exist on the state/payloads.

- [ ] **Step 3: Implement the seam changes in `light-entity-state.ts`**

a) The state interface (after `phone: string;`):

```ts
  // #248: raw coordinate inputs — '' = clear to null. Parsed to numbers in
  // the payload builders; validated with the same bounds/dp/pair rules the
  // wire schema enforces (packages/types).
  latitude: string;
  longitude: string;
```

b) `branchStateFromRead` (after `phone: row.phone,`):

```ts
    latitude: row.latitude === null ? '' : String(row.latitude),
    longitude: row.longitude === null ? '' : String(row.longitude),
```

c) `newBranchState` gains `latitude: '',` and `longitude: '',`.

d) A module-private parser + validator, placed above `buildBranchCreatePayload`:

```ts
// #248: input-string → number|null. Returns null for '' (the clear
// encoding); NaN never reaches a payload — validateBranchState gates the
// save first.
function parseCoordinate(input: string): number | null {
  return input.trim() === '' ? null : Number(input);
}

function validateCoordinate(
  input: string,
  bound: number,
  label: string
): string | undefined {
  const trimmed = input.trim();
  if (trimmed === '') {
    return undefined;
  }
  const value = Number(trimmed);
  if (Number.isNaN(value)) {
    return `${label} must be a number.`;
  }
  if (!atMostSixDp(value)) {
    return `${label} allows at most 6 decimal places.`;
  }
  if (value < -bound || value > bound) {
    return `${label} is out of range.`;
  }
  return undefined;
}
```

Import `atMostSixDp` from `@sevendays/types` (add to the existing type import block as a
value import — it goes in its own `import { atMostSixDp } from '@sevendays/types';` line,
sorted ahead of the `import type {...}` line by biome's rule; let `pnpm fix` place it).

e) `LightFieldErrors` gains `latitude?: string;` and `longitude?: string;`.

f) `validateBranchState` — after the phone check, before `return errors;`:

```ts
  // #248: the pair rule is client-side too — both empty or both valid.
  const latitudeError = validateCoordinate(state.latitude, 90, 'Latitude');
  const longitudeError = validateCoordinate(state.longitude, 180, 'Longitude');
  if (latitudeError) {
    errors.latitude = latitudeError;
  }
  if (longitudeError) {
    errors.longitude = longitudeError;
  }
  if (!errors.latitude && !errors.longitude) {
    const lat = state.latitude.trim() !== '';
    const lng = state.longitude.trim() !== '';
    if (lat !== lng) {
      errors.latitude = 'Set both latitude and longitude, or neither.';
    }
  }
```

g) `buildBranchCreatePayload` and `buildBranchUpdatePayload` (both, after `phone:`):

```ts
    latitude: parseCoordinate(state.latitude),
    longitude: parseCoordinate(state.longitude),
```

h) `buildBranchFlipPayload` (after `phone: row.phone,`):

```ts
    latitude: row.latitude,
    longitude: row.longitude,
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @sevendays/admin test -- light-entity-state`
Expected: PASS (the new `#248:` tests + the file's existing ones).

- [ ] **Step 5: Wire the two Sheet fields in `branches-screen.tsx`**

a) `handleEditorSave`'s veto check grows the new fields — replace
`if (errors.name || errors.address || errors.phone) {` with:

```ts
    if (errors.name || errors.address || errors.phone || errors.latitude || errors.longitude) {
```

b) Add ids beside the existing ones (after `const phoneId = useId();`):

```ts
  const latitudeId = useId();
  const longitudeId = useId();
```

c) In the `LightEntityEditor` body, after the Phone `Field` and before the checkboxes
`div`, insert:

```tsx
          <div className='grid grid-cols-2 gap-4'>
            <Field>
              <FieldLabel htmlFor={latitudeId}>Latitude</FieldLabel>
              <Input
                id={latitudeId}
                type='text'
                inputMode='decimal'
                placeholder='14.16598'
                value={editorState.latitude}
                onChange={(e) => setEditorState({ ...editorState, latitude: e.target.value })}
              />
              {fieldErrors.latitude ? (
                <p className='text-destructive text-xs'>{fieldErrors.latitude}</p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor={longitudeId}>Longitude</FieldLabel>
              <Input
                id={longitudeId}
                type='text'
                inputMode='decimal'
                placeholder='121.2485'
                value={editorState.longitude}
                onChange={(e) => setEditorState({ ...editorState, longitude: e.target.value })}
              />
              {fieldErrors.longitude ? (
                <p className='text-destructive text-xs'>{fieldErrors.longitude}</p>
              ) : null}
            </Field>
          </div>
```

d) The editor description line — replace
`description='Name, address, phone, and the walk-in flag.'` with:

```tsx
          description='Name, address, phone, the walk-in flag, and optional map coordinates.'
```

- [ ] **Step 6: Run the admin suite**

Run: `pnpm --filter @sevendays/admin test`
Expected: PASS — 27 files + the light-entity-state additions (28 files' worth of tests
stays 27 files; floor: 279 passed + this plan's 9 new).

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/lib/light-entity-state.ts apps/admin/src/lib/light-entity-state.test.ts apps/admin/src/components/branches/branches-screen.tsx
git commit -m "feat(admin): manual latitude/longitude fields in the branch editor (#248)"
```

## Task 5: Landing — the Maps button on the branch card

**Files:**
- Create: `apps/landing/src/lib/branch-maps.ts`
- Test: `apps/landing/src/lib/branch-maps.test.ts`
- Modify: `apps/landing/src/components/branch-card.tsx`

**Interfaces:**
- Consumes: `BranchRead.latitude/longitude` (Task 2).
- Produces: `mapsUrlFor(branch: BranchRead): string | null` — `null` when either
  coordinate is `null`, else the canonical URL. The card consumes exactly this.

- [ ] **Step 1: Write the failing test**

Create `apps/landing/src/lib/branch-maps.test.ts`:

```ts
import type { BranchRead } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { mapsUrlFor } from './branch-maps';

function branch(coords: { latitude: number | null; longitude: number | null }): BranchRead {
  return {
    id: '0b3552a6-b7c1-4d44-a7e2-1a9a4b2ff001',
    name: 'Test Branch A',
    address: '1 Test St',
    phone: '+63 900 000 001',
    acceptsWalkIns: false,
    isActive: true,
    coverImageUrl: null,
    latitude: coords.latitude,
    longitude: coords.longitude,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('mapsUrlFor (#248)', () => {
  it('builds the canonical Google Maps URL from the pair', () => {
    expect(mapsUrlFor(branch({ latitude: 14.16598, longitude: 121.2485 }))).toBe(
      'https://www.google.com/maps?api=1&query=14.16598,121.2485'
    );
  });

  it('returns null when latitude is null (render gate)', () => {
    expect(mapsUrlFor(branch({ latitude: null, longitude: 121.2485 }))).toBeNull();
  });

  it('returns null when longitude is null (render gate)', () => {
    expect(mapsUrlFor(branch({ latitude: 14.16598, longitude: null }))).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(mapsUrlFor(branch({ latitude: null, longitude: null }))).toBeNull();
  });

  it('interpolates integers without trailing zeros', () => {
    expect(mapsUrlFor(branch({ latitude: 7, longitude: 125 }))).toBe(
      'https://www.google.com/maps?api=1&query=7,125'
    );
  });
});
```

(If the file's sibling tests import `describe/it/expect` from a project alias, match that
style — read one sibling first; the behavior is what's pinned.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sevendays/landing test -- branch-maps`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the seam**

Create `apps/landing/src/lib/branch-maps.ts`:

```ts
import type { BranchRead } from '@sevendays/types';

// The branch Maps pin (#248): the canonical universal Maps URL — a plain
// query (lat,lng), no API key. null = no coordinates on the row → the card
// renders no button. Bounds/precision are already enforced at the wire
// schema (packages/types), so the interpolation is URL-safe by contract.
export function mapsUrlFor(branch: BranchRead): string | null {
  if (branch.latitude === null || branch.longitude === null) {
    return null;
  }
  return `https://www.google.com/maps?api=1&query=${branch.latitude},${branch.longitude}`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/landing test -- branch-maps`
Expected: PASS — 5 tests.

- [ ] **Step 5: Render the button in `branch-card.tsx`**

a) Imports — add `MapPin` to the lucide import (alphabetical: after `Footprints`, before
`Phone`) and add at the top of the file with the other relative imports:

```ts
import { mapsUrlFor } from '../lib/branch-maps';
```

b) Inside the component, before the `return`:

```ts
  const mapsUrl = mapsUrlFor(branch);
```

c) In the CTA row (`<div className='mt-3 flex flex-wrap gap-2 ...'>`), after the Book
`Link` (LAST — the owner ruling; v1's pick note moves it after `Call {branch}` instead):

```tsx
          {/* #248 (OWNER-RULED): the Maps pin opens a new tab at the stored
              coordinates — rendered only when the row carries the full pair
              (the mapsUrlFor gate); cards without coordinates render
              nothing extra. */}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target='_blank'
              rel='noopener noreferrer'
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
              )}
            >
              <MapPin className='size-4' aria-hidden='true' />
              Google Maps
            </a>
          ) : null}
```

- [ ] **Step 6: Run the landing suite + typecheck**

Run: `pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing typecheck`
Expected: PASS — 17 files (16 + branch-maps) / 128 tests (123 + 5).

- [ ] **Step 7: Commit**

```bash
git add apps/landing/src/lib/branch-maps.ts apps/landing/src/lib/branch-maps.test.ts apps/landing/src/components/branch-card.tsx
git commit -m "feat(landing): Google Maps new-tab pin on branch cards with coordinates (#248)"
```

## Task 6: Full gates + docs

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: The full check gate**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check`
Expected: exit 0 across all — lint, format, typecheck, and every suite at or above floor:
api 455 passed + 3 skipped (452 + 3 new), api-client 45 tests (unchanged), admin 288
passed (279 + 9), landing 128 passed (123 + 5), types suite green.

- [ ] **Step 2: The build gate**

Run: `pnpm build`
Expected: exit 0 for all three apps.

- [ ] **Step 3: Update `docs/progress.md`**

Add a `#248` bullet in the post-flight section (match the file's voice — dense, one
bullet), quoting these facts exactly: nullable `latitude`/`longitude` on `branches`
(migration 0013, manual admin entry — no geocoding, the pair rule + ≤6 dp + bounds at the
wire schema); the canonical `google.com/maps?api=1&query=<lat>,<lng>` new-tab button
(outline + MapPin, `Google Maps`) on `/branches` cards only when the pair exists; the v1
pick note (button last in the single-CTA row, after `Call {branch}`).

- [ ] **Step 4: Commit + graphify**

```bash
git add docs/progress.md
git commit -m "docs(progress): #248 branch Maps button landed"
pnpm exec graphify update . || true
```

(graphify update per AGENTS.md; the `|| true` keeps a dirty-graph non-failure from
blocking the handoff — report its output honestly either way.)

## Acceptance-criteria mapping (issue #248)

- "migration applies; columns nullable; nothing breaks" → Task 1 (+ Task 3 Step 4's
  whole-file run over the pre-existing tests).
- "Staff enter coordinates in the branch Sheet; saves persist" → Tasks 2–4 (wire →
  service → editor; the round-trip pinned at both the api test and the admin seam test).
- "Cards with coordinates render the Maps button (new tab, correct pin)" → Task 5
  (canonical URL pinned verbatim in `branch-maps.test.ts`; the anchor carries
  `target="_blank"` + `rel="noopener noreferrer"`).
- "Cards without coordinates render nothing extra" → Task 5's `mapsUrlFor` null gate
  (three null-case tests) + the conditional render.
- "Both editions verified (pick is clean — book-free)" → the button touches no booking
  surface; the v1 transform is the pick note in the plan header + `docs/progress.md`.
- "`pnpm check` + `pnpm build` green" → Task 6.
