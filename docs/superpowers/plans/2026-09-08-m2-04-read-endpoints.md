# M2 Ticket 04 — Three Read Endpoints + Client Wrappers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The API gains `GET /api/v1/studio-services` (active services with embedded `bookableBranchIds`), `GET /api/v1/service-packages/:slug` (one active package with inclusions; uniform 404 when unknown), and `GET /api/v1/appointments/:id` (single appointment with stitched add-on entries, same `AppointmentWithAddons` shape as the list; public deliberately until M4, like the list) — and `packages/api-client` gains `studioServices.list()`, `servicePackages.bySlug(slug)`, `appointments.get(id)`, typed-inferred through the shared Hono RPC client through the one `unwrap()` gate (GitHub issue #42, parent spec #37).

**Architecture:** Three thin route handlers over three service-module functions, reusing the established read pattern (fetch parents → fetch children/lookups → `groupChildren` stitch). The by-slug and single-get reads reuse their list siblings' assembly code by extraction, so the list and single-record shapes cannot drift. `:id` params are Zod-validated (`z.uuid()`) — a non-uuid string against the uuid column would be a PG `22P02` → 500; `:slug` is an opaque text key and takes NO param schema (unknown slug = plain 404). The loopback mock mirrors the new endpoints exactly, including the pinned 404 wording.

**Tech Stack:** Hono 4.13.5 (chained sub-apps, Hono RPC via `hc<AppType>`), `@hono/zod-validator` 0.4.x (`param` target), Zod 4.5.1, Drizzle ORM ^0.45.2 (select/stitch only — no migration in this ticket), Vitest (unit + real-Postgres integration per ADR-0008), `packages/api-client` loopback harness.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ API surface, § Confirmation read-back) + ticket `.scratch/m2-booking-flow-tickets/04.md` (= GitHub issue #42, parent #37). The plan argues from the spec; executors read both.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-04-read-endpoints`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges.
- **No migration in this ticket.** Every schema piece these reads need already exists: `studio_services` + `branch_studio_services` + `studio_service_addon_services` (migrations 0002/0003, ticket 01) and the generalized `appointments` (migration 0004, ticket 02). `packages/db` src is untouched by this ticket — do NOT run `db:generate`; any generated-migration diff is a defect.
- **Routes stay thin; wording is module-owned or pinned here.** Route handlers parse/validate, call one service function, return `c.json(...)` — the convention `AGENTS.md` states and M1.4 established. The two 404 wordings are pinned exactly: `'Package not found.'` and `'Appointment not found.'` (per-entity, matching the intake rejections' per-entity style, e.g. `'Unknown branchId.'`). The 404 helper defaults to `'Not found.'` (the root app's unmounted-path wording); both mounted 404 call sites pass the explicit message.
- **Uniform error envelope everywhere:** always `c.json({ error }, status)`, never bare `c.notFound()` — the mounted 404s go through the new `notFound` helper in `apps/api/src/services/errors.ts`; error shape stays `apiErrorSchema` (`{ error, details? }`), unchanged.
- **Param validation asymmetry is deliberate (spike-verified pre-plan against hono 4.13.5 + @hono/zod-validator 0.4.x):** `appointments/:id` uses `validatedParam(z.object({ id: z.uuid() }))` because an unvalidated non-uuid string reaches the uuid column and PG rejects it as `22P02` — an unhandled 500. `service-packages/:slug` uses NO param schema: slug is an opaque text key, an unknown slug is a plain service-level 404, and validating would add a second error path for no benefit. Do not "symmetrize" them.
- **`validatedParam` joins the validator family, not a third pattern:** it is a third function in `apps/api/src/services/validator.ts` alongside `validatedJson`/`validatedQuery`, with the same uniform-error hook body duplicated (zValidator's Target must be an exact literal for Hono RPC input inference; the hook generic cannot be a standalone typed const without losing inference — the file's existing rationale, now covering three functions). A generic-`validatedParam` handler keeping `c.req.valid('param')` typed was proven in the pre-plan spike (plain-JS and type-level both).
- **Inactive = invisible on every read surface (spec ruling):** studio-services list serves only `isActive` services even when junction rows exist; by-slug serves only ACTIVE packages (an inactive slug 404s — "one active package … 404 when unknown"); the appointments single-get mirrors the list's no-active-filter posture (appointments have no active concept).
- **Public-until-M4 is deliberate, do not fix:** `GET /api/v1/appointments/:id` serves customer names/emails/phones unauthenticated, exactly like the list (standing decision, spec § API surface; Known Gap already records the list half). M4's BetterAuth closes both together. No auth code in this ticket.
- **`pnpm build:packages` after every change to `packages/types`** — consumers resolve workspace packages from `dist/`; a stale `dist/` looks like a missing export. (`packages/db` is not edited by this plan; `apps/api` resolves `packages/types` from `dist/`.)
- **Biome-clean commits:** `pnpm exec biome check --write <files>` on every created/modified code file before committing (project `fix` scripts call the `biome` bin).
- **`noUncheckedIndexedAccess` is on:** guard `.returning()`/indexed destructures (`const [row] = ...; if (!row) throw/return ...`), never `!`. In `apps/api/test/helpers/fixtures.ts` follow the file's existing bare-`.id` destructure style (it compiles today); in `apps/api/src/services/**` keep the existing guard style.
- **Zod v4 chain rule:** `.extend()` is only safe on an UNrefined object schema. `studioServiceSchema` is a plain object (no refine) — extending it with `bookableBranchIds` is safe. Never extend or `.omit()` a schema carrying a refine (e.g. the appointment schemas).
- **Compose for integration tests:** `docker compose up -d db` (postgres:17, `sevendays_test`); `apps/api`'s vitest global setup migrates via `@sevendays/db/migrate`; pass env explicitly to `app.request(path, opts, { DATABASE_URL: url })` — a bare `app.request(path)` leaves `c.env` empty.
- **Fixture values are synthetic, not catalog:** names like `Retired Studio Service` / prices like `60000` follow the existing fixtures file's synthetic convention (`Test Branch A`, `Retired Add-on`). The TODO(seed) convention applies to the catalog seed (`packages/db/scripts/catalog.ts`), which this ticket does not touch — an executor must not invent catalog data anywhere in this plan.
- **Mock mirrors the API envelope exactly:** the loopback mock's 404 bodies must equal the pinned real-API wordings, so the loopback tests prove the exact `ApiClientError` shapes the landing pages will hit.
- **Scope fence (siblings share roadmap checkboxes):** ticket 04 delivers READS + client wrappers only. Not here: generalized service-path intake + typed rejections + `past_datetime` floor (#41), landing pages / booking form / confirmation page / Resend email (tickets 05–10), any schema or migration change, any seed change, any `docs/plan.md` checkbox tick (see below). `packages/types` gains exactly one read shape (`studioServiceWithBranchesSchema`) — no create schemas (Studio Services CRUD is M5 CMS).
- **`docs/plan.md`'s M2 API checkbox stays unticked** — it spans tickets 03 (#41, POST generalization) + 04 (this ticket's three reads) and is satisfied only when BOTH have landed; whoever closes the later of the two ticks it with the ✅ emoji. GitHub issue #42's acceptance-criteria boxes are the owner's to tick — note the mapping in the PR description, don't edit the issue.
- **Commit style:** unscoped conventional subjects, bullet bodies when wordy; one commit per task.

---

## File Structure

```
packages/types/src/studio-service.ts               (mod) + studioServiceWithBranchesSchema (bookableBranchIds)
packages/types/src/studio-service.test.ts          (mod) + read-shape describe (3 tests)
apps/api/src/services/validator.ts                 (mod) + validatedParam (third function, same hook body)
apps/api/src/services/errors.ts                    (mod) + notFound helper (uniform 404 envelope)
apps/api/src/services/service-packages.ts          (mod) assemble-extraction refactor + getActivePackageWithInclusionsBySlug
apps/api/src/services/appointments.ts              (mod) fetchAddonEntries extraction + getAppointmentWithAddons
apps/api/src/services/studio-services.ts           (new) listActiveStudioServicesWithBranches
apps/api/src/routes/service-packages.ts            (mod) + GET /:slug (no param schema — see Global Constraints)
apps/api/src/routes/appointments.ts                (mod) + GET /:id (validatedParam z.uuid())
apps/api/src/routes/studio-services.ts             (new) GET /
apps/api/src/routes/v1.ts                          (mod) + /studio-services mount
apps/api/test/service-packages.test.ts             (mod) + by-slug describe (3 tests)
apps/api/test/appointments.test.ts                 (mod) + single-get describe (4 tests)
apps/api/test/studio-services.test.ts              (new) list-shape suite (1 test)
apps/api/test/helpers/fixtures.ts                  (mod) + serviceRetired + 3 branch-link rows
packages/api-client/src/routes/service-packages.ts (mod) + bySlug (+ exported GetPackageBySlugArgs)
packages/api-client/src/routes/appointments.ts     (mod) + get (+ exported GetAppointmentArgs)
packages/api-client/src/routes/studio-services.ts  (new) list
packages/api-client/src/index.ts                   (mod) + studioServices group
packages/api-client/test/mock-api.ts               (mod) + 3 endpoints + STUDIO_SERVICES/BRANCH_LINKS fixtures
packages/api-client/test/loopback.test.ts          (mod) + 5 loopback tests
docs/progress.md                                   (mod) ticket-04 landed bullet
```

Task map: 1 — `packages/types` read shape (TDD) + build:packages; 2 — `apps/api` by-slug + single-get (+ validator/errors), compose green; 3 — `apps/api` studio-services read + fixtures + suite, compose green; 4 — api-client wrappers + mock + loopback tests; 5 — full gate, progress.md, handoff.

---

### Task 1: packages/types — the Studio Service read shape (TDD)

**Files:**
- Modify: `packages/types/src/studio-service.ts`
- Modify: `packages/types/src/studio-service.test.ts`

**Interfaces:**
- Consumes: `studioServiceSchema` (plain object, no refine — `.extend()` is safe per Global Constraints).
- Produces (Tasks 3 and 4 consume these exact names):
  - `studioServiceWithBranchesSchema` / `StudioServiceWithBranches` — the `StudioService` row mirror plus `bookableBranchIds: z.array(z.uuid())`. The api studio-services service and the api-client wrapper both parse against this exact schema; the barrel (`packages/types/src/index.ts`) already re-exports `./studio-service.js`, so no barrel edit.

**Not here:** no api service/route code (Task 3), no client wrapper (Task 4), no create schema (Studio Services CRUD is M5), no mock changes.

- [ ] **Step 1: Cut the branch**

```bash
git checkout -b feat/m2-04-read-endpoints
```

- [ ] **Step 2: Write the failing tests** — append to `packages/types/src/studio-service.test.ts` (after the existing `createStudioServiceSchema` describe), and extend the file's import line:

```ts
import {
  createStudioServiceSchema,
  studioServiceSchema,
  studioServiceWithBranchesSchema,
} from './studio-service.js';
```

```ts
describe('studioServiceWithBranchesSchema', () => {
  it('parses a read row with embedded bookable branch ids', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: [UUID, '00000000-0000-4000-8000-000000000001'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid branch id', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('inherits the row default (isActive defaults true when omitted)', () => {
    const parsed = studioServiceWithBranchesSchema.parse({
      ...fullRow,
      isActive: undefined,
      bookableBranchIds: [],
    });
    expect(parsed.isActive).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @sevendays/types test -- studio-service.test.ts`
Expected: FAIL — `studioServiceWithBranchesSchema` is not exported.

- [ ] **Step 4: Write the schema** — append to `packages/types/src/studio-service.ts` (below the `CreateStudioServiceInput` block):

```ts
// Read shape for GET /api/v1/studio-services (M2 ticket 04): active Studio
// Services with the branches they are bookable at, embedded as bare branch
// ids — the booking form's branch step filters by membership and the
// services page joins names from the branches read. Extends the row mirror
// (a plain object schema, no refine — the zod v4 chain rule is not at play).
export const studioServiceWithBranchesSchema = studioServiceSchema.extend({
  bookableBranchIds: z.array(z.uuid()),
});

export type StudioServiceWithBranches = z.infer<typeof studioServiceWithBranchesSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @sevendays/types test`
Expected: PASS — the whole types suite, including the 3 new tests.

- [ ] **Step 6: Rebuild packages dist + typecheck**

```bash
pnpm build:packages && pnpm --filter @sevendays/types typecheck
```

Expected: build green (the new export lands in `dist/`), typecheck green.

- [ ] **Step 7: Commit**

```bash
pnpm exec biome check --write packages/types/src/studio-service.ts packages/types/src/studio-service.test.ts
git add packages/types/src/studio-service.ts packages/types/src/studio-service.test.ts
git commit -m "feat(types): studio service read shape with embedded bookableBranchIds" -m "- studioServiceWithBranchesSchema extends the plain row mirror with z.array(z.uuid())
- the api studio-services read and the api-client wrapper both parse against this shape (ticket 04)"
```

---

### Task 2: apps/api — by-slug + single-get reads, validatedParam, uniform 404 (TDD)

**Files:**
- Modify: `apps/api/src/services/validator.ts`
- Modify: `apps/api/src/services/errors.ts`
- Modify: `apps/api/src/services/service-packages.ts`
- Modify: `apps/api/src/services/appointments.ts`
- Modify: `apps/api/src/routes/service-packages.ts`
- Modify: `apps/api/src/routes/appointments.ts`
- Modify: `apps/api/test/service-packages.test.ts`
- Modify: `apps/api/test/appointments.test.ts`

**Interfaces:**
- Consumes: `servicePackageWithInclusionsSchema` / `ServicePackageWithInclusions` and `appointmentWithAddonsSchema` / `AppointmentWithAddons` from `@sevendays/types` (already exist).
- Produces (Task 4's wrappers and mock mirror these):
  - `validatedParam<S extends ZodSchema>(schema: S)` — third member of the validator family, same uniform-error hook body; `c.req.valid('param')` stays typed (spike-proven).
  - `notFound(c: Context, message = 'Not found.')` — the uniform 404 envelope; the root app's unmounted-path wording `'Not found.'` is the default, both new call sites pass explicit entity wordings.
  - `getActivePackageWithInclusionsBySlug(db: Database, slug: string): Promise<ServicePackageWithInclusions | null>` — `null` when unknown OR inactive (route → 404).
  - `getAppointmentWithAddons(db: Database, id: string): Promise<AppointmentWithAddons | null>` — `null` when unknown (route → 404).
- Internal invariants (same-file, not exported): `assemblePackageRead` (shared by list + by-slug), `fetchAddonEntries` (shared by list + single-get) — the single-get shape is provably the list's shape because it IS the same code.

**Not here:** no studio-services route/service (Task 3), no client methods (Task 4), no intake/service-path work (#41), no mount-list edit (the two routes mount already).

- [ ] **Step 1: Write the failing tests** — in `apps/api/test/service-packages.test.ts`, append after the existing describe (the file already imports `ServicePackageWithInclusions`, `app`, `ids`, helpers):

```ts
describe('GET /api/v1/service-packages/:slug', () => {
  it('returns one active package with resolved inclusions and frames (200)', async () => {
    const res = await app.request('/api/v1/service-packages/simple-package', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageWithInclusions;

    expect(body.slug).toBe('simple-package');
    expect(body.id).toBe(ids.packageSimple);
    expect(body.isFeatured).toBe(false);
    expect(body.inclusions).toHaveLength(1);
    expect(body.inclusions[0]?.kind).toBe('print');
    expect(body.inclusions[0]?.printSize?.code).toBe('2R');
    expect(body.inclusions[0]?.attires.map((a) => a.name)).toEqual(['Toga']);
    expect(body.frames.map((f) => f.frameNumber)).toEqual([1]);
  });

  it('returns the uniform 404 envelope for an unknown slug', async () => {
    const res = await app.request('/api/v1/service-packages/no-such-package', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Package not found.');
  });

  it('returns 404 for an inactive package slug', async () => {
    const res = await app.request('/api/v1/service-packages/retired-package', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Package not found.');
  });
});
```

In `apps/api/test/appointments.test.ts`, append after the existing `GET /api/v1/appointments` describe (the file already imports `MISSING_UUID`, `payload`, `createViaApi`, `app`, `ids`):

```ts
describe('GET /api/v1/appointments/:id', () => {
  it('returns a single appointment with stitched add-on entries (200)', async () => {
    const created = (await createViaApi(payload({
      addonServiceIds: [ids.addonMakeup, ids.addonHairstyle],
    }))) as { id: string };
    const res = await app.request(`/api/v1/appointments/${created.id}`, undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
    expect(body.bookedPriceCents).toBe(150000);
    // Set-assert the entries: intake writes both junction rows in ONE insert,
    // so their createdAt ties and the stitch's orderBy gives no order
    // guarantee between them — the SHAPE is what's pinned, not entry order.
    expect(body.addonServices).toHaveLength(2);
    const byId = new Map(
      (body.addonServices as { addonServiceId: string; name: string; priceCents: number }[]).map(
        (e) => [e.addonServiceId, e]
      )
    );
    expect(byId.get(ids.addonMakeup)).toEqual({
      addonServiceId: ids.addonMakeup,
      name: 'Makeup',
      priceCents: 12000,
    });
    expect(byId.get(ids.addonHairstyle)).toEqual({
      addonServiceId: ids.addonHairstyle,
      name: 'Hairstyle',
      priceCents: 6000,
    });
  });

  it('returns 404 with the uniform envelope for an unknown id', async () => {
    const res = await app.request(`/api/v1/appointments/${MISSING_UUID}`, undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Appointment not found.');
  });

  it('rejects a non-uuid id with the uniform 400 envelope', async () => {
    const res = await app.request('/api/v1/appointments/not-a-uuid', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
    expect(body.error.length).toBeGreaterThan(0);
  });

  it('returns the same shape as the list endpoint (single-get parity)', async () => {
    const created = (await createViaApi(payload())) as { id: string };
    const single = await (
      await app.request(`/api/v1/appointments/${created.id}`, undefined, { DATABASE_URL: url })
    ).json();
    const listed = await (
      await app.request('/api/v1/appointments', undefined, { DATABASE_URL: url })
    ).json();
    const fromList = (listed as { id: string }[]).find((a) => a.id === created.id);
    expect(fromList).toBeDefined();
    expect(Object.keys(single).sort()).toEqual(Object.keys(fromList).sort());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
docker compose up -d db   # wait for healthy: docker compose ps
pnpm --filter @sevendays/api test -- service-packages.test.ts appointments.test.ts
```

Expected: FAIL — the by-slug route doesn't exist (unknown slug hits the root `notFound` → body `{'Not found.'}` ≠ `Package not found.`, and the 200 test fails likewise); every single-get test fails (404/`'Not found.'` or shape mismatch).

- [ ] **Step 3: Implement the validator + errors helpers**

In `apps/api/src/services/validator.ts`, add a comment note and the third function below `validatedQuery` (the hook body is byte-identical to the other two — the file's existing two-functions rationale now covers three):

```ts
// Third member (M2 ticket 04): path params. Same literal-target rationale as
// above — zValidator's Target must be an exact literal for Hono RPC input
// inference. Pre-plan spike (hono 4.13.5 + @hono/zod-validator 0.4.x): a
// generic validatedParam keeps c.req.valid('param') typed and the chained
// ':id' route infers { param: { id: string } } through hc<AppType>.
export const validatedParam = <S extends ZodSchema>(schema: S) =>
  zValidator('param', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid request payload.',
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        400
      );
    }
  });
```

In `apps/api/src/services/errors.ts`, append below `badRequest`:

```ts
/**
 * The uniform 404 envelope: always c.json({ error }, 404), never a bare
 * c.notFound() (which would emit Hono's plain-text default). Default is the
 * root app's unmounted-path wording; mounted-path 404s pass the entity
 * wording ('Package not found.' / 'Appointment not found.' — per-entity,
 * matching the intake rejections' style).
 */
export function notFound(c: Context, message = 'Not found.') {
  return c.json({ error: message }, 404);
}
```

- [ ] **Step 4: Refactor `apps/api/src/services/service-packages.ts` — shared assembly + by-slug getter**

Two edits:

(a) Change the drizzle import line from `import { asc, eq, inArray } from 'drizzle-orm';` to:

```ts
import { and, asc, eq, inArray } from 'drizzle-orm';
```

(b) Add the shared assembly (above `listActivePackagesWithInclusions`) and rewrite the list to delegate, then add the getter at the bottom of the file:

```ts
// The junction-row projection both reads select (attire id + name keyed by
// inclusionId) — a projected shape, not a table row type.
type JunctionRow = { inclusionId: string; id: string; name: string };

/**
 * Shared assembly for both package reads (M2 ticket 04): the list and the
 * by-slug getter must emit the identical ServicePackageWithInclusions shape,
 * so the stitch lives in ONE function both call. The print-size lookup map
 * is assembly (it joins fetched values, not rows), so it moved here with
 * the stitch — fetching (which queries, which ordering) stays in the
 * callers. Callers deliver rows in their pinned orders (inclusions by id,
 * junctions by created_at + id, frames by frameNumber); assembly never
 * re-sorts (groupChildren contract).
 */
function assemblePackageRead(
  packageRows: (typeof servicePackages.$inferSelect)[],
  inclusionRows: (typeof packageInclusions.$inferSelect)[],
  junctionRows: JunctionRow[],
  printSizeRows: (typeof printSizes.$inferSelect)[],
  frameRows: (typeof frames.$inferSelect)[]
): ServicePackageWithInclusions[] {
  const printSizeById = new Map<string, ResolvedPrintSize>();
  for (const s of printSizeRows) {
    printSizeById.set(s.id, { id: s.id, code: s.code, description: s.description });
  }

  // Assembly = groupChildren (order-preserving, empty-group-defaulting);
  // the projections below are shape-building, which stays in this service.
  const attiresByInclusion = groupChildren(junctionRows, (row) => row.inclusionId);

  const framesByPackage = groupChildren(frameRows, (f) => f.servicePackageId);

  const inclusionsByPackage = groupChildren(inclusionRows, (i) => i.servicePackageId);

  return packageRows.map((p) => ({
    ...p,
    inclusions: inclusionsByPackage(p.id).map(
      (i): ServicePackageWithInclusions['inclusions'][number] => ({
        id: i.id,
        kind: i.kind,
        quantity: i.quantity,
        printSize: i.printSizeId ? (printSizeById.get(i.printSizeId) ?? null) : null,
        attires: attiresByInclusion(i.id).map((row) => ({ id: row.id, name: row.name })),
        frameId: i.frameId,
        description: i.description,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })
    ),
    frames: framesByPackage(p.id).map((f) => ({ id: f.id, frameNumber: f.frameNumber })),
  }));
}
```

`listActivePackagesWithInclusions` keeps its five fetch queries verbatim but its tail becomes:

```ts
  const frameRows = await db
    .select()
    .from(frames)
    .where(inArray(frames.servicePackageId, packageIds))
    .orderBy(asc(frames.frameNumber));

  return assemblePackageRead(packageRows, inclusionRows, junctionRows, printSizeRows, frameRows);
}
```

(delete the old in-file `printSizeById` loop, `groupChildren` block, and `packageRows.map(...)` — they now live in `assemblePackageRead`)

Append the getter at the bottom of the file:

```ts
/**
 * One ACTIVE package by slug with resolved lookups (M2 ticket 04): the same
 * ServicePackageWithInclusions shape as the list, assembled by the same
 * function. Unknown slug OR inactive package → null (the route turns it
 * into the uniform 404 — "one active package", inactive is invisible on
 * the booking surface). The single-slug fetch re-uses the list's exact
 * query bodies scoped to one package id, so ordering and projection stay
 * identical by construction.
 */
export async function getActivePackageWithInclusionsBySlug(
  db: Database,
  slug: string
): Promise<ServicePackageWithInclusions | null> {
  const [packageRow] = await db
    .select()
    .from(servicePackages)
    .where(and(eq(servicePackages.slug, slug), eq(servicePackages.isActive, true)))
    .limit(1);
  if (!packageRow) return null;

  const inclusionRows = await db
    .select()
    .from(packageInclusions)
    .where(eq(packageInclusions.servicePackageId, packageRow.id))
    .orderBy(asc(packageInclusions.id));

  const inclusionIds = inclusionRows.map((i) => i.id);
  const printSizeIds = [
    ...new Set(inclusionRows.map((i) => i.printSizeId).filter((id): id is string => id !== null)),
  ];

  // Same junction query + ordering comment as the list (created_at, then id
  // as tiebreak — the junction has no position column).
  const junctionRows =
    inclusionIds.length > 0
      ? await db
          .select({
            inclusionId: packageInclusionAttires.inclusionId,
            id: attires.id,
            name: attires.name,
          })
          .from(packageInclusionAttires)
          .innerJoin(attires, eq(packageInclusionAttires.attireId, attires.id))
          .where(inArray(packageInclusionAttires.inclusionId, inclusionIds))
          .orderBy(asc(packageInclusionAttires.createdAt), asc(packageInclusionAttires.id))
      : [];

  const printSizeRows =
    printSizeIds.length > 0
      ? await db.select().from(printSizes).where(inArray(printSizes.id, printSizeIds))
      : [];

  const frameRows = await db
    .select()
    .from(frames)
    .where(inArray(frames.servicePackageId, [packageRow.id]))
    .orderBy(asc(frames.frameNumber));

  const [assembled] = assemblePackageRead(
    [packageRow],
    inclusionRows,
    junctionRows,
    printSizeRows,
    frameRows
  );
  return assembled ?? null;
}
```

- [ ] **Step 5: Refactor `apps/api/src/services/appointments.ts` — shared add-on stitch + single-get**

Three edits:

(a) The type import becomes:

```ts
import type {
  AppointmentAddonEntry,
  AppointmentWithAddons,
  CreateAppointmentInput,
} from '@sevendays/types';
```

(b) Add the shared stitch (below `createAppointment`, above `listAppointments`):

```ts
/**
 * Add-on entries for the given appointment ids in one inArray query (M2
 * ticket 04) — shared by the list and the single-get so both shapes come
 * from one stitch. Entries arrive pre-ordered: createdAt is the append-only
 * monotonic proxy (the junction has no position column; SQL gives no
 * row-order guarantee without an explicit ORDER BY — a later migration if
 * M2's UI needs persisted order). Raw rows carry appointmentId — group raw,
 * project at the attach pass. Every requested id gets an entry list (empty
 * when it has no add-ons) — never undefined.
 */
async function fetchAddonEntries(
  db: Database,
  appointmentIds: string[]
): Promise<Map<string, AppointmentAddonEntry[]>> {
  if (appointmentIds.length === 0) return new Map();

  const addonRows = await db
    .select({
      appointmentId: appointmentAddonServices.appointmentId,
      addonServiceId: appointmentAddonServices.addonServiceId,
      name: addonServices.name,
      priceCents: appointmentAddonServices.priceCents,
    })
    .from(appointmentAddonServices)
    .innerJoin(addonServices, eq(appointmentAddonServices.addonServiceId, addonServices.id))
    .where(inArray(appointmentAddonServices.appointmentId, appointmentIds))
    .orderBy(appointmentAddonServices.createdAt);

  const addonsByAppointment = groupChildren(addonRows, (row) => row.appointmentId);

  const entries = new Map<string, AppointmentAddonEntry[]>();
  for (const appointmentId of appointmentIds) {
    entries.set(
      appointmentId,
      addonsByAppointment(appointmentId).map((a) => ({
        addonServiceId: a.addonServiceId,
        name: a.name,
        priceCents: a.priceCents,
      }))
    );
  }
  return entries;
}
```

(c) In `listAppointments` (NOT `createAppointment` — its own `addonRows` select inside the intake transaction stays), the tail from the `addonRows` select through the final `return rows.map(...)` is replaced by:

```ts
  const addonsByAppointment = await fetchAddonEntries(db, rows.map((r) => r.id));

  return rows.map((row) => ({ ...row, addonServices: addonsByAppointment.get(row.id) ?? [] }));
}
```

(d) Append the getter at the bottom of the file:

```ts
/**
 * One Appointment with its add-on entries (M2 ticket 04): the same
 * AppointmentWithAddons shape as the list, via the same stitch. Unknown id
 * → null (the route turns it into the uniform 404). Public until M4 like
 * the list (standing decision — this serves the customer's own
 * confirmation read-back; M4's BetterAuth closes both together).
 */
export async function getAppointmentWithAddons(
  db: Database,
  id: string
): Promise<AppointmentWithAddons | null> {
  const [row] = await db
    .select(appointmentProjection)
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  if (!row) return null;

  const addonsByAppointment = await fetchAddonEntries(db, [row.id]);
  return { ...row, addonServices: addonsByAppointment.get(row.id) ?? [] };
}
```

- [ ] **Step 6: Wire the routes** — both files become (full contents):

`apps/api/src/routes/service-packages.ts`:

```ts
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { notFound } from '../services/errors.js';
import {
  getActivePackageWithInclusionsBySlug,
  listActivePackagesWithInclusions,
} from '../services/service-packages.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const servicePackages = new Hono<ApiEnv>()
  .get('/', async (c) => {
    const db = c.get('db');
    return c.json(await listActivePackagesWithInclusions(db));
  })
  // No param schema (Global Constraints): slug is an opaque text key — an
  // unknown slug is a plain service-level 404, and validating would add a
  // second error path for no benefit. The :id/:slug asymmetry is deliberate.
  .get('/:slug', async (c) => {
    const db = c.get('db');
    const pkg = await getActivePackageWithInclusionsBySlug(db, c.req.param('slug'));
    if (!pkg) {
      return notFound(c, 'Package not found.');
    }
    return c.json(pkg);
  });
```

`apps/api/src/routes/appointments.ts`:

```ts
import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAppointment,
  getAppointmentWithAddons,
  listAppointments,
} from '../services/appointments.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam, validatedQuery } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const appointments = new Hono<ApiEnv>()
  .get('/', validatedQuery(z.object({ branchId: z.uuid().optional() })), async (c) => {
    const { branchId } = c.req.valid('query');
    const db = c.get('db');
    const rows = await listAppointments(db, { branchId });
    return c.json(rows);
  })
  .get(
    '/:id',
    // z.uuid() is load-bearing (Global Constraints): an unvalidated non-uuid
    // would reach the uuid column and PG would reject it as 22P02 → an
    // unhandled 500. The validator turns that class into the uniform 400.
    validatedParam(z.object({ id: z.uuid() })),
    async (c) => {
      const { id } = c.req.valid('param');
      const db = c.get('db');
      const record = await getAppointmentWithAddons(db, id);
      if (!record) {
        return notFound(c, 'Appointment not found.');
      }
      return c.json(record);
    }
  )
  .post('/', validatedJson(createAppointmentSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const result = await createAppointment(db, input);
    if (!result.ok) {
      return badRequest(c, result.message);
    }
    return c.json(result.record, 201);
  });
```

- [ ] **Step 7: Run the tests to verify they pass** — the two touched suites first, then the full api suite (regression: `error-seam.test.ts` and the M1.4 suites must stay green after the extraction refactors):

```bash
pnpm --filter @sevendays/api test -- service-packages.test.ts appointments.test.ts
pnpm --filter @sevendays/api test
```

Expected: all green — 3 new by-slug tests, 4 new single-get tests, every pre-existing test unchanged.

- [ ] **Step 8: Commit**

```bash
pnpm exec biome check --write apps/api/src/services/validator.ts apps/api/src/services/errors.ts apps/api/src/services/service-packages.ts apps/api/src/services/appointments.ts apps/api/src/routes/service-packages.ts apps/api/src/routes/appointments.ts apps/api/test/service-packages.test.ts apps/api/test/appointments.test.ts
git add apps/api/src/services/validator.ts apps/api/src/services/errors.ts apps/api/src/services/service-packages.ts apps/api/src/services/appointments.ts apps/api/src/routes/service-packages.ts apps/api/src/routes/appointments.ts apps/api/test/service-packages.test.ts apps/api/test/appointments.test.ts
git commit -m "feat(api): package-by-slug + appointment single-get reads on shared assembly" -m "- getActivePackageWithInclusionsBySlug + getAppointmentWithAddons (null → uniform 404 with per-entity wording)
- assemblePackageRead / fetchAddonEntries extracted so the single-record shapes cannot drift from their list siblings
- validatedParam joins the validator family (z.uuid() on :id — non-uuid would be a PG 22P02 500); :slug takes no param schema (opaque text key)
- notFound helper: mounted 404s carry the entity wording through the uniform envelope"
```

---

### Task 3: apps/api — studio-services read (service, route, fixtures, suite) (TDD)

**Files:**
- Create: `apps/api/src/services/studio-services.ts`
- Create: `apps/api/src/routes/studio-services.ts`
- Modify: `apps/api/src/routes/v1.ts`
- Modify: `apps/api/test/helpers/fixtures.ts`
- Create: `apps/api/test/studio-services.test.ts`

**Interfaces:**
- Consumes: Task 1's `studioServiceWithBranchesSchema` / `StudioServiceWithBranches` (from `@sevendays/types`, built in `dist/` by Task 1 Step 6).
- Produces (Task 4's wrapper + mock mirror this): `listActiveStudioServicesWithBranches(db: Database): Promise<StudioServiceWithBranches[]>` — ordered by name (the addon-services/branches convention), active-only, ids embedded per `branch_studio_services` presence rows.

**Not here:** no client method (Task 4), no intake logic (#41), no applicability-matrix read (that matrix gates the POST path — #41 consumes `studio_service_addon_services` directly in the intake transaction; the booking form's add-on step needs it at landing-build time, a later ticket), no seed change.

- [ ] **Step 1: Extend the fixtures** — in `apps/api/test/helpers/fixtures.ts`:

(a) The `FixtureIds` type gains two members (after `servicePortrait: string;`):

```ts
  serviceRetired: string;
  serviceBranchLinks: string[];
```

(b) Replace the single `servicePortrait` insert block (the comment above it stays) with three service inserts and the link rows. The link rows go directly below the services (the junction's `createdAt` default gives link order determinism per service — each service's links come from one statement, so intra-service id order is fine):

```ts
  const [servicePortrait] = await db
    .insert(studioServices)
    .values({
      name: 'Portraits & ID Photo',
      description: 'Studio portraits and ID photos.',
      priceCents: 50000,
      isActive: true,
    })
    .returning({ id: studioServices.id });
  const [serviceRetired] = await db
    .insert(studioServices)
    .values({
      name: 'Retired Studio Service',
      description: 'No longer offered.',
      priceCents: 60000,
      isActive: false,
    })
    .returning({ id: studioServices.id });

  // Bookability rows (ticket 01's presence-row junction): portrait bookable
  // at BOTH branches; the retired service linked to branchA only — the
  // inactive filter must hide it from the read even though its link exists.
  await db.insert(branchStudioServices).values([
    { studioServiceId: servicePortrait.id, branchId: branchA.id },
    { studioServiceId: servicePortrait.id, branchId: branchB.id },
    { studioServiceId: serviceRetired.id, branchId: branchA.id },
  ]);

  const serviceBranchLinks = [
    { studioServiceId: servicePortrait.id, branchId: branchA.id },
    { studioServiceId: servicePortrait.id, branchId: branchB.id },
    { studioServiceId: serviceRetired.id, branchId: branchA.id },
  ];
```

(c) The return object gains two members (after `servicePortrait: servicePortrait.id,`):

```ts
    serviceRetired: serviceRetired.id,
    serviceBranchLinks: serviceBranchLinks.map((l) => l.branchId),
```

Note: `serviceBranchLinks` as a bare branch-id list cannot distinguish which service a link belongs to — that mapping is pinned in the test below via the exact `bookableBranchIds` assertion. (If a later task needs a per-service map, extend the fixture return then.)

(d) The dynamic-import destructure at the top of `loadFixtures` gains `branchStudioServices` — the list becomes:

```ts
  const {
    branches,
    printSizes,
    attires,
    addonServices,
    branchStudioServices,
    servicePackages,
    studioServices,
    frames,
    packageInclusions,
    packageInclusionAttires,
  } = await import('@sevendays/db');
```

- [ ] **Step 2: Write the failing suite** — `apps/api/test/studio-services.test.ts`, exactly:

```ts
import type { StudioServiceWithBranches } from '@sevendays/types';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('GET /api/v1/studio-services', () => {
  it('returns active services with embedded bookable branch ids, ordered by name', async () => {
    const res = await app.request('/api/v1/studio-services', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as StudioServiceWithBranches[];

    // Only the ACTIVE service is visible — even though the retired service
    // has a branch link, inactive is invisible on the read surface.
    expect(body).toHaveLength(1);
    const portrait = body[0];
    expect(portrait?.id).toBe(ids.servicePortrait);
    expect(portrait?.name).toBe('Portraits & ID Photo');
    expect(portrait?.priceCents).toBe(50000);
    expect(portrait?.isActive).toBe(true);
    expect(portrait?.bookableBranchIds).toHaveLength(2);
    expect(portrait?.bookableBranchIds).toContain(ids.branchA);
    expect(portrait?.bookableBranchIds).toContain(ids.branchB);
    // Row-mirror fields ride along (the client renders name + price + description).
    expect(portrait?.description).toBe('Studio portraits and ID photos.');
    expect(portrait?.createdAt).toBeDefined();
    expect(portrait?.updatedAt).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the suite to verify it fails**

```bash
docker compose up -d db   # if not still up from Task 2
pnpm --filter @sevendays/api test -- studio-services.test.ts
```

Expected: FAIL — `/api/v1/studio-services` is unmounted → 404 `Not found.`

- [ ] **Step 4: Write the service** — `apps/api/src/services/studio-services.ts`, exactly:

```ts
import type { Database } from '@sevendays/db';
import { branchStudioServices, studioServices } from '@sevendays/db';
import type { StudioServiceWithBranches } from '@sevendays/types';
import { asc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';

/**
 * Active Studio Services with the branches each is bookable at (M2 ticket
 * 04) — the services page and the booking form's offering step read this.
 * Active-only (inactive is invisible on the read surface even when branch
 * links exist); branch ids embedded as bare ids — the branch step filters
 * by membership and joins names from the branches read. Ordered by name
 * (the catalog-read convention); per-service branch ids follow the
 * junction's createdAt proxy, id tiebreak — seeded links share a statement,
 * so intra-service order is id-stable, and membership is the only
 * consumer-facing fact.
 */
export async function listActiveStudioServicesWithBranches(
  db: Database
): Promise<StudioServiceWithBranches[]> {
  const serviceRows = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.isActive, true))
    .orderBy(asc(studioServices.name));

  if (serviceRows.length === 0) return [];

  const serviceIds = serviceRows.map((s) => s.id);

  const linkRows = await db
    .select({
      studioServiceId: branchStudioServices.studioServiceId,
      branchId: branchStudioServices.branchId,
    })
    .from(branchStudioServices)
    .where(inArray(branchStudioServices.studioServiceId, serviceIds));

  const branchesByService = groupChildren(linkRows, (row) => row.studioServiceId);

  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
  }));
}
```

- [ ] **Step 5: Write the route + mount** — `apps/api/src/routes/studio-services.ts`:

```ts
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { listActiveStudioServicesWithBranches } from '../services/studio-services.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const studioServices = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveStudioServicesWithBranches(db));
});
```

`apps/api/src/routes/v1.ts` — the import block gains `import { studioServices } from './studio-services.js';` (alphabetical, after `servicePackages`), and the chain gains one line after `.route('/service-packages', servicePackages)`:

```ts
  .route('/studio-services', studioServices)
```

- [ ] **Step 6: Run the tests to verify they pass** — the new suite, then the full api suite (the mount change touches the shared chain; everything must stay green):

```bash
pnpm --filter @sevendays/api test -- studio-services.test.ts
pnpm --filter @sevendays/api test
```

Expected: all green — 1 new list-shape test; every pre-existing test unchanged (the fixture edit adds rows other suites ignore: appointments/service-packages/addon-services tests assert on their own entity ids only).

- [ ] **Step 7: Commit**

```bash
pnpm exec biome check --write apps/api/src/services/studio-services.ts apps/api/src/routes/studio-services.ts apps/api/src/routes/v1.ts apps/api/test/helpers/fixtures.ts apps/api/test/studio-services.test.ts
git add apps/api/src/services/studio-services.ts apps/api/src/routes/studio-services.ts apps/api/src/routes/v1.ts apps/api/test/helpers/fixtures.ts apps/api/test/studio-services.test.ts
git commit -m "feat(api): GET /studio-services — active services with bookableBranchIds" -m "- listActiveStudioServicesWithBranches: active-only, name-ordered, branch ids stitched via groupChildren
- /studio-services mounted in the v1 chain (thin route over the service)
- fixtures gain the retired studio service + three branch-link rows (retired service linked yet invisible — the active filter is proven)"
```

---

### Task 4: packages/api-client — the three wrappers + mock endpoints + loopback tests (TDD)

**Files:**
- Modify: `packages/api-client/src/routes/service-packages.ts`
- Modify: `packages/api-client/src/routes/appointments.ts`
- Create: `packages/api-client/src/routes/studio-services.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/test/mock-api.ts`
- Modify: `packages/api-client/test/loopback.test.ts`

**Interfaces:**
- Consumes: Task 1's `studioServiceWithBranchesSchema` / `StudioServiceWithBranches`; Task 2's routes (the RPC surface `raw.api.v1['service-packages'][':slug'].$get`, `raw.api.v1.appointments[':id'].$get`, `raw.api.v1['studio-services'].$get` — exact key paths); the mock's existing `validatedJson`/`createAppointmentSchema` imports.
- Produces (landing-build tasks consume these): `client.studioServices.list(): Promise<StudioServiceWithBranches[]>`, `client.servicePackages.bySlug(args: GetPackageBySlugArgs): Promise<ServicePackageWithInclusions>`, `client.appointments.get(args: GetAppointmentArgs): Promise<AppointmentWithAddons>` — all through the one `unwrap()` gate; exported arg types via `InferRequestType` (the established wrapper pattern). `GetPackageBySlugArgs` infers as `{ slug: string }` and `GetAppointmentArgs` as `{ param: { id: string } }` (route-level input shape — spike-pinned).

**Not here:** no intake methods (#41 — no new POST surface; the mock's POST record keeps its existing `studioServiceId` passthrough), no landing server functions / query options (later tickets), no `mockApiBrokenBranches` extension (the ZodError-on-2xx test targets branches and stays the shape-mismatch exemplar).

- [ ] **Step 1: Write the failing loopback tests** — append to `packages/api-client/test/loopback.test.ts`:

```ts
it('servicePackages.bySlug returns the package with resolved lookups', async () => {
  const client = clientFor(mockApi);
  const pkg = await client.servicePackages.bySlug({ slug: 'basic-package' });
  expect(pkg.name).toBe('Basic Package');
  expect(pkg.slug).toBe('basic-package');
  expect(pkg.inclusions[0]?.printSize?.code).toBe('8R');
  expect(pkg.frames).toHaveLength(1);
});

it('servicePackages.bySlug surfaces the uniform 404 as ApiClientError', async () => {
  const client = clientFor(mockApi);
  const err = await client.servicePackages
    .bySlug({ slug: 'no-such-package' })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Package not found.' });
});

it('appointments.get returns the record with add-on entries', async () => {
  const client = clientFor(mockApi);
  const record = await client.appointments.get({
    param: { id: '99999999-9999-4999-8999-999999999999' },
  });
  expect(record.bookedPriceCents).toBe(250000);
  expect(record.servicePackageId).toBe('44444444-4444-4444-8444-444444444444');
  expect(record.studioServiceId).toBeNull();
  expect(record.addonServices[0]?.name).toBe('Makeup');
  expect(record.createdAt).toBeInstanceOf(Date);
});

it('appointments.get surfaces the uniform 404 as ApiClientError', async () => {
  const client = clientFor(mockApi);
  const err = await client.appointments
    .get({ param: { id: 'f0000000-0000-4000-8000-000000000000' } })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Appointment not found.' });
});

it('appointments.get rejects a non-uuid id with the uniform 400 as ApiClientError', async () => {
  const client = clientFor(mockApi);
  const err = await client.appointments.get({ param: { id: 'not-a-uuid' } }).catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(400);
  // The mock mirrors the real validator envelope (error + details); assert
  // the error wording via toMatchObject so the exact details payload can
  // evolve without weakening the seam.
  expect((err as ApiClientError).details).toMatchObject({ error: 'Invalid request payload.' });
});

it('studioServices.list returns active services with bookable branch ids', async () => {
  const client = clientFor(mockApi);
  const rows = await client.studioServices.list();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.name).toBe('Portraits & ID Photo');
  expect(rows[0]?.priceCents).toBe(50000);
  expect(rows[0]?.bookableBranchIds).toEqual([
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ]);
  expect(rows[0]?.createdAt).toBeInstanceOf(Date);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @sevendays/api-client test -- loopback.test.ts
```

Expected: FAIL — the wrappers and mock endpoints don't exist (compile/type errors first, then assertion failures).

- [ ] **Step 3: Write the wrappers** — `packages/api-client/src/routes/studio-services.ts` (new file), exactly:

```ts
import type { StudioServiceWithBranches } from '@sevendays/types';
import { studioServiceWithBranchesSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Studio Service wrappers: GET /api/v1/studio-services (the only method today). */
export function studioServicesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/studio-services — active services with bookableBranchIds. */
    async list(): Promise<StudioServiceWithBranches[]> {
      const res = await raw.api.v1['studio-services'].$get();
      return unwrap(res, studioServiceWithBranchesSchema.array());
    },
  };
}
```

`packages/api-client/src/routes/service-packages.ts` becomes (full contents):

```ts
import type { ServicePackageWithInclusions } from '@sevendays/types';
import { servicePackageWithInclusionsSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type BySlugEndpoint = RpcClient['api']['v1']['service-packages'][':slug']['$get'];

/**
 * The by-slug endpoint's declared input: `{ slug: string }` (the route
 * takes no param schema — slug is an opaque text key). Inferred, not
 * hand-typed, so the RPC surface remains the drift-kill.
 */
export type GetPackageBySlugArgs = InferRequestType<BySlugEndpoint>;

/** Service Package wrappers: list + by-slug under /api/v1/service-packages. */
export function servicePackagesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/service-packages — active packages with resolved lookups. */
    async list(): Promise<ServicePackageWithInclusions[]> {
      const res = await raw.api.v1['service-packages'].$get();
      return unwrap(res, servicePackageWithInclusionsSchema.array());
    },
    /** GET /api/v1/service-packages/:slug — one active package; 404 when unknown/inactive. */
    async bySlug(args: GetPackageBySlugArgs): Promise<ServicePackageWithInclusions> {
      const res = await raw.api.v1['service-packages'][':slug'].$get(args);
      return unwrap(res, servicePackageWithInclusionsSchema);
    },
  };
}
```

`packages/api-client/src/routes/appointments.ts` becomes (full contents — the two new pieces are the endpoint/args types above the factory and the `get` method between `list` and `create`):

```ts
import type { AppointmentWithAddons } from '@sevendays/types';
import { appointmentWithAddonsSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type CreateEndpoint = RpcClient['api']['v1']['appointments']['$post'];
type GetEndpoint = RpcClient['api']['v1']['appointments'][':id']['$get'];

/**
 * Create input as the RPC surface declares it — the zod INPUT side of
 * createAppointmentSchema: timestamps as ISO strings, addonServiceIds and
 * notes optional, and NO price field (the server snapshots the price).
 */
export type CreateAppointmentArgs = InferRequestType<CreateEndpoint>['json'];

/**
 * The single-get endpoint's declared input: `{ param: { id: string } }`
 * (the route's z.uuid() param schema shapes the type; the wrapper passes
 * the caller's string through — validation is the API's job, and a
 * non-uuid surfaces as ApiClientError(400) through unwrap).
 */
export type GetAppointmentArgs = InferRequestType<GetEndpoint>;

/** Appointment wrappers: list + single-get + create under /api/v1/appointments. */
export function appointmentsRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/appointments — newest-first, optional branch filter, 200 cap. */
    async list(
      args: { query: { branchId?: string } } = { query: {} }
    ): Promise<AppointmentWithAddons[]> {
      const res = await raw.api.v1.appointments.$get(args);
      return unwrap(res, appointmentWithAddonsSchema.array());
    },
    /** GET /api/v1/appointments/:id — single record; 404 when unknown. */
    async get(args: GetAppointmentArgs): Promise<AppointmentWithAddons> {
      const res = await raw.api.v1.appointments[':id'].$get(args);
      return unwrap(res, appointmentWithAddonsSchema);
    },
    /** POST /api/v1/appointments — 201 with the created record + add-ons. */
    async create(json: CreateAppointmentArgs): Promise<AppointmentWithAddons> {
      const res = await raw.api.v1.appointments.$post({ json });
      return unwrap(res, appointmentWithAddonsSchema);
    },
  };
}
```

`packages/api-client/src/index.ts` — three edits: (1) the import block gains `import { studioServicesRoutes } from './routes/studio-services.js';`; (2) the `ApiClient` interface gains `studioServices: ReturnType<typeof studioServicesRoutes>;` after the `addonServices` line; (3) the factory's return object gains `studioServices: studioServicesRoutes(raw),` after the `addonServices: addonServicesRoutes(raw),` line.

- [ ] **Step 4: Extend the mock** — in `packages/api-client/test/mock-api.ts`, four edits:

(a) The zod import gains the value import (the uuid-shape 400 uses it): `import type { ZodSchema } from 'zod';` becomes `import { z, type ZodSchema } from 'zod';`

(b) Two new fixture blocks directly after the `PACKAGES` const (readable-uuid pattern per this file's convention; the second service's link proves the inactive filter):

```ts
const BRANCH_LINKS = [
  {
    studioServiceId: '55555555-5555-4555-8555-555555555555',
    branchId: '11111111-1111-4111-8111-111111111111',
  },
  {
    studioServiceId: '55555555-5555-4555-8555-555555555555',
    branchId: '22222222-2222-4222-8222-222222222222',
  },
  {
    studioServiceId: 'e0000000-0000-4000-8000-000000000000',
    branchId: '11111111-1111-4111-8111-111111111111',
  },
];

const STUDIO_SERVICES = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Portraits & ID Photo',
    description: 'Studio portraits and ID photos.',
    priceCents: 50000,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'e0000000-0000-4000-8000-000000000000',
    name: 'Retired Studio Service',
    description: 'No longer offered.',
    priceCents: 60000,
    isActive: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];
```

(c) Inside `makeApi`, the `servicePackages` sub-app gains the by-slug route, and a `studioServices` sub-app joins it (the appointments sub-app edit is (d)):

```ts
  const servicePackages = new Hono<MockEnv>()
    .get('/', (c) => c.json(PACKAGES))
    .get('/:slug', (c) => {
      const slug = c.req.param('slug');
      const pkg = PACKAGES.find((p) => p.slug === slug);
      if (!pkg) {
        return c.json({ error: 'Package not found.' }, 404);
      }
      return c.json(pkg);
    });

  const studioServices = new Hono<MockEnv>().get('/', (c) =>
    c.json(
      STUDIO_SERVICES.filter((s) => s.isActive).map((s) => ({
        ...s,
        bookableBranchIds: BRANCH_LINKS.filter((l) => l.studioServiceId === s.id).map(
          (l) => l.branchId
        ),
      }))
    )
  );
```

(d) The `appointments` sub-app gains the `/:id` route between its existing `GET /` and `POST /` (the POST body below is the EXISTING body, repeated verbatim so this block can be pasted as one replacement):

```ts
  const appointments = new Hono<MockEnv>()
    .get('/', (c) => {
      const branchId = c.req.query('branchId');
      return c.json(branchId ? APPOINTMENTS.filter((a) => a.branchId === branchId) : APPOINTMENTS);
    })
    .get('/:id', (c) => {
      const id = c.req.param('id');
      // The real API z.uuid()-validates this param; the mock mirrors the
      // validator's exact 400 envelope (same wording + details shape).
      if (!z.uuid().safeParse(id).success) {
        return c.json(
          {
            error: 'Invalid request payload.',
            details: [{ path: ['id'], message: 'Invalid UUID' }],
          },
          400
        );
      }
      const record = APPOINTMENTS.find((a) => a.id === id);
      if (!record) {
        return c.json({ error: 'Appointment not found.' }, 404);
      }
      return c.json(record);
    })
    .post('/', validatedJson(createAppointmentSchema), async (c) => {
      const input = c.req.valid('json');
      if (!BRANCHES.some((b) => b.id === input.branchId)) {
        return c.json({ error: 'Unknown branchId.' }, 400);
      }
      const record = {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        branchId: input.branchId,
        servicePackageId: input.servicePackageId,
        studioServiceId: input.studioServiceId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        scheduledAt: input.scheduledAt,
        status: 'pending',
        kind: 'scheduled',
        bookedPriceCents: 250000,
        notes: input.notes ?? null,
        createdAt: NOW,
        updatedAt: NOW,
        addonServices: input.addonServiceIds.map((id) => {
          const addon = ADDONS.find((a) => a.id === id);
          return {
            addonServiceId: id,
            name: addon?.name ?? 'Unknown Add-on',
            priceCents: addon?.priceCents ?? 0,
          };
        }),
      };
      return c.json(record, 201);
    });
```

- [ ] **Step 5: Mount in the mock's v1 chain** — inside `makeApi`, the `v1` chain gains `.route('/studio-services', studioServices)` directly after `/service-packages` (matching the real API's relative order). The chain becomes:

```ts
  const v1 = new Hono<MockEnv>()
    .use('*', async (_c, next) => {
      await next();
    })
    .route('/branches', branches)
    .route('/service-packages', servicePackages)
    .route('/studio-services', studioServices)
    .route('/addon-services', addonServices)
    .route('/appointments', appointments);
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
pnpm --filter @sevendays/api-client test
pnpm --filter @sevendays/api-client typecheck
```

Expected: all green — 6 new loopback tests (by-slug 200 + 404, appointments.get 200 + 404 + 400, studio-services list) plus every pre-existing test unchanged; typecheck green (the `:id`/`:slug` key paths typecheck against the real RPC surface — the drift-kill working).

- [ ] **Step 7: Commit**

```bash
pnpm exec biome check --write packages/api-client/src/routes/service-packages.ts packages/api-client/src/routes/appointments.ts packages/api-client/src/routes/studio-services.ts packages/api-client/src/index.ts packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts
git add packages/api-client/src/routes/service-packages.ts packages/api-client/src/routes/appointments.ts packages/api-client/src/routes/studio-services.ts packages/api-client/src/index.ts packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts
git commit -m "feat(api-client): studioServices.list, servicePackages.bySlug, appointments.get" -m "- three wrappers over the raw RPC client through the one unwrap() gate, arg types inferred from AppType
- mock mirrors the three endpoints exactly, incl. the pinned 404 wordings and the :id validator 400 envelope
- loopback: typed parses + ApiClientError on 404 (per-entity wordings) and 400 (uniform validator envelope)"
```

---

### Task 5: Full gate, progress.md, handoff

**Files:**
- Modify: `docs/progress.md`

**Interfaces:**
- Consumes: Tasks 1–4 complete and committed.

**Not here:** no `docs/plan.md` checkbox ticks (the M2 API box spans tickets 03 + 04 and stays unticked until #41), no GitHub issue edits, no PR (owner opens it), no ADR — this ticket introduces no new architectural decision (thin reads on the established pattern; the only candidates — the `validatedParam` third member and the `notFound` helper — are applications of the already-recorded ADR-0006/Q4 conventions, not choices).

- [ ] **Step 1: Repo-wide gate**

```bash
pnpm check && pnpm build
```

Expected: lint + format + typecheck + test green across all packages/apps; build green. (`pnpm test` includes the landing/admin no-op test scripts — fine, unchanged from ticket 02.)

- [ ] **Step 2: Keep the graph current** (per AGENTS.md)

```bash
graphify update .
```

Expected: AST-only incremental update, no errors (dirty graphify-out files are expected; commit or leave them per what the sibling tickets did — `git status` shows them; leave if the repo convention is to not track them, add only if `git status` shows graphify-out tracked).

- [ ] **Step 3: Update `docs/progress.md`** — add one bullet to the landed-work list (match the sibling ticket-02 bullet's style; place it newest-adjacent, i.e. directly after the ticket-02 bullet):

```markdown
- **M2 ticket 04 — three read endpoints + client wrappers (#42 → .scratch/m2-booking-flow-tickets/04.md):** `GET /api/v1/studio-services` (active-only with embedded `bookableBranchIds` — a linked-but-inactive service stays invisible), `GET /api/v1/service-packages/:slug` (one active package, assembled by the same `assemblePackageRead` as the list; unknown OR inactive slug → uniform 404 `Package not found.`), `GET /api/v1/appointments/:id` (same `AppointmentWithAddons` shape as the list via the shared `fetchAddonEntries` stitch; unknown id → 404 `Appointment not found.`; public until M4 like the list). `validatedParam` joined the validator family (z.uuid() on `:id` — a non-uuid would be a PG 22P02 500; `:slug` deliberately takes no param schema, opaque text key); `notFound` helper carries the per-entity 404 wordings through the uniform envelope. `packages/api-client`: `studioServices.list()`, `servicePackages.bySlug(slug)`, `appointments.get({ param: { id } })` — typed through the RPC surface, arg types inferred, all through the one `unwrap()` gate; mock mirrors all three endpoints incl. the pinned 404 wordings and the validator 400 envelope; loopback covers 200/404/400 per endpoint. No migration — everything rides migrations 0002–0004. Compose green (7 new integration tests + 6 new loopback tests); full `pnpm check` + `pnpm build` green. NOT landed: generalized service-path intake + typed rejections + `past_datetime` floor (#41) — `docs/plan.md`'s M2 API checkbox stays unticked until then.
```

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md
git commit -m "docs: M2 ticket 04 landed — three read endpoints + client wrappers"
```

- [ ] **Step 5: Stop here — handoff** (owner pushes/merges; #41 branches from this state). Do **not** tick `docs/plan.md`'s M2 API checkbox (spans tickets 03 + 04; it gets the ✅ emoji only when BOTH have landed — if this ticket merges first, the tick happens at #41's close-out; if #41 merges first, this ticket's close-out ticks it). Do not open a PR unless asked. Issue #42's acceptance-criteria boxes map to Tasks 3+2 (integration), Task 4 (loopback), Tasks 2+3+4 (thin routes) — note that mapping in the PR description when the owner opens it.

---

## Self-Review (executed at plan-writing time — re-run after any edit)

1. **Spec coverage:** the three reads (Tasks 2–3: by-slug + single-get, studio-services list) with `bookableBranchIds` embedded (Task 1 schema → Task 3 service → Task 4 wrapper); uniform JSON 404s (Tasks 2, 4); `AppointmentWithAddons` parity by shared-code extraction (Task 2); client wrappers typed through the RPC gate (Task 4); routes thin over service modules (Tasks 2–3). Acceptance criterion 1 ↔ Tasks 2–3, criterion 2 ↔ Task 4, criterion 3 ↔ Tasks 2–3.
2. **Placeholder scan:** no TBD/TODO-as-gap/deferred-language in steps; every code step carries full code or exact line-level edits; the mock's POST body is repeated verbatim (not referenced).
3. **Type consistency:** `studioServiceWithBranchesSchema` / `StudioServiceWithBranches` / `listActiveStudioServicesWithBranches` / `getActivePackageWithInclusionsBySlug` / `getAppointmentWithAddons` / `assemblePackageRead` / `fetchAddonEntries` / `validatedParam` / `notFound` / `GetPackageBySlugArgs` / `GetAppointmentArgs` / `serviceRetired` — each defined once and used identically downstream (grep-verified against this file at write time; re-run `grep -n` per name after any edit).

