# M2 Ticket 01 — Studio Services Catalog + Package Slug/Featured — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The catalog gains Studio Services as their own bookable entity — `studio_services` plus the `branch_studio_services` (per-branch bookability) and `studio_service_addon_services` (add-on applicability) presence-row junctions — and `service_packages` gains `slug` (unique, not null, backfilled) + `is_featured`, with re-runnable seed extensions and `db:verify-seed` asserting all of it.

**Architecture:** Three new Drizzle tables join the existing schema-file pattern (one file per table, barrel + relations + FK indexes per the M1.2 review ruling). The slug backfill on the populated live `service_packages` table (11 rows) forces two generated migrations: `0002` adds everything with `slug` nullable+unique, the seed backfills slugs via `coalesce(existing, new)` (so reseeds never rewrite a slug and `/packages/:slug` URLs survive renames), then `0003` enforces NOT NULL. Zod mirrors land in `packages/types`: `slug`/`isFeatured` on the package read schema, and a `StudioService` row mirror that ticket 04's `bookableBranchIds` read shape will extend.

**Tech Stack:** Drizzle ORM ^0.45.2 (pg-core, drizzle-kit generate/migrate), Zod ^4.5.1 (v4 top-level `z.uuid()`), tsx ^4.23.13 seed/verify scripts over postgres-js (`prepare: false`), Vitest, Supabase session-mode pooler for live ops, compose `postgres:17` for integration suites.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ Schema changes, § Solution) + ticket `.scratch/m2-booking-flow-tickets/01.md` (parent: GitHub issue #37). The plan argues from the spec; executors read both.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-01-studio-services-catalog`, branched from `main`. Never commit directly to `main`; the owner pushes/merges.
- **Migrations are generated, never hand-edited:** `pnpm --filter @sevendays/db db:generate` produces every file in `packages/db/migrations/**`; `db:migrate` applies them. This ticket generates exactly two: `0002_*.sql` and `0003_*.sql`.
- **Why two migrations for the slug:** the live Supabase `service_packages` has 11 rows. A single `ADD COLUMN slug text NOT NULL UNIQUE` fails on a populated table (existing rows would be NULL). Sequence: `0002` adds `slug` nullable + UNIQUE (and everything else), the seed backfills slugs, `0003` is the generated `ALTER COLUMN slug SET NOT NULL`. The ticket's "a migration" describes the end state, not the file count.
- **Live-DB gates:** run `node --env-file=.env scripts/check-env.mjs` (from `packages/db/`) and confirm `GATE: PASS` before every live operation (`db:migrate`, `db:seed`, `db:verify-seed`). Never print a connection string or any `.env` value; seed/verify/migrate ride `DATABASE_MIGRATE_URL` (session-mode pooler) from `packages/db/.env`.
- **Seed is re-runnable:** natural-key upserts (`studio_services` by name like branches/add-ons/packages). Slug uses `coalesce(service_packages.slug, excluded.slug)` in the upsert — backfills NULLs once, never rewrites an existing slug (rename stability). Junctions rebuild delete-then-insert per service — the exact-sync posture the package-inclusions seed already uses.
- **Seed data is fixed by the spec:** the four Studio Services are verbatim `Photo Recovery`, `Tarpaulin & Bulletin Printing`, `Portraits & ID Photo`, `Picture Framing`; placeholder prices `TODO(seed)` (₱1500 / ₱800 / ₱500 / ₱1200 — the prototype's owner-seen stubs, like the branch phones); all four **bookable at all 3 branches** (the prototype's not-Calamba Portraits stub was demo-only); applicability rows are exactly Makeup + Hairstyle → Portraits & ID Photo (the other three services get none). Featured packages: Basic, A, B, C.
- **`appointments` is untouched.** Generalizing it (nullable offering refs, exactly-one CHECK, `bookedPriceCents` rename) is ticket 02 — no schema-file edit, no migration content for it here.
- **Do NOT tick `docs/plan.md`'s M2 schema checkbox** — it spans tickets 01 + 02 (appointments generalization included); tick only when that whole deliverable exists (✅ emoji). This ticket updates only `docs/progress.md`.
- **`pnpm build:packages` after every change to `packages/types` or `packages/db` `src/`** — consumers resolve workspace packages from `dist/`; a stale `dist/` looks like a missing export or stale type.
- **Biome-clean commits:** `pnpm exec biome check --write <files>` on every created/modified code file before committing (project `fix` scripts call the `biome` bin).
- **Zod v4 style:** top-level `z.uuid()`/`z.string()`; `safeParse` in tests. **`noUncheckedIndexedAccess` is on:** guard destructures (`const [row] = ...; if (!row) throw ...`), never `!`.
- **Commit style:** unscoped conventional subjects, bullet bodies when wordy; one commit per task.
- **Never touch `.env`/`.dev.vars` contents.**

---

## File Structure

```
packages/db/src/schema/studio-services.ts               (new)   studio_services table + name natural key
packages/db/src/schema/branch-studio-services.ts        (new)   bookability presence-row junction
packages/db/src/schema/studio-service-addon-services.ts (new)   applicability matrix presence-row junction
packages/db/src/schema/service-packages.ts              (mod)   +slug (nullable in 0002 → notNull in 0003) +is_featured
packages/db/src/schema/relations.ts                     (mod)   3 new relation groups
packages/db/src/schema/index.ts                         (mod)   barrel exports (alphabetical)
packages/db/src/catalog-rows.ts                         (mod)   +slugifyName (pure)
packages/db/src/catalog-rows.test.ts                    (mod)   slugify unit tests; probe insert gains slug
packages/db/scripts/catalog.ts                          (mod)   +studioServiceSeeds, +featuredPackageNames
packages/db/scripts/seed.ts                             (mod)   studio services + junction rebuilds + slug/isFeatured upsert
packages/db/scripts/verify-seed.ts                      (mod)   asserts studio services, junctions, slugs, featured flags
packages/db/scripts/rehearsal-fixture.mjs               (mod)   probe insert gains slug
packages/db/src/verify-appointment-row.test.ts          (mod)   probe insert gains slug
packages/types/src/package.ts                           (mod)   slug + isFeatured on read schema; create omits slug, defaults isFeatured
packages/types/src/package.test.ts                      (mod)   parse/reject tests for the new fields
packages/types/src/studio-service.ts                    (new)   StudioService row mirror (base for ticket 04's read shape)
packages/types/src/studio-service.test.ts               (new)   schema tests
packages/types/src/index.ts                             (mod)   barrel export
apps/api/test/helpers/fixtures.ts                       (mod)   3 package inserts gain slugs
docs/progress.md                                        (mod)   ticket-01 landed bullet
packages/db/migrations/0002_*.sql, 0003_*.sql           (generated — never hand-edited)
```

Task map: 1 — Drizzle: three new tables + slug/is_featured (nullable pass) + relations/barrel, migration `0002`, live apply; 2 — seed: `slugifyName` (TDD), catalog seeds, seed extensions, live seed ×2; 3 — verify-seed extensions, live VERIFY PASSED; 4 — slug NOT NULL flip (`0003`), live apply, fixture blast-radius, suites green; 5 — `packages/types` mirrors (TDD); 6 — full gate + progress.md.

---

### Task 1: Drizzle — studio_services + junctions + package slug/is_featured (migration 0002)

**Files:**
- Create: `packages/db/src/schema/studio-services.ts`, `packages/db/src/schema/branch-studio-services.ts`, `packages/db/src/schema/studio-service-addon-services.ts`
- Modify: `packages/db/src/schema/service-packages.ts`, `packages/db/src/schema/relations.ts`, `packages/db/src/schema/index.ts`
- Generated: `packages/db/migrations/0002_*.sql` (+ `meta/_journal.json`, `meta/0002_snapshot.json`)

**Interfaces:**
- Consumes: existing `branches`, `addonServices`, `servicePackages` table objects (imported relatively, schema-file convention).
- Produces: `studioServices`, `branchStudioServices`, `studioServiceAddonServices` exported from `@sevendays/db` (later tasks + tickets 03/04 consume); `servicePackages.slug: string | null` (interim), `servicePackages.isFeatured: boolean`. Migration `0002` applied to the live DB.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/m2-01-studio-services-catalog
```

- [ ] **Step 2: Create `packages/db/src/schema/studio-services.ts`** with exactly:

```ts
import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Standalone studio offerings bookable in their own right (M2 ticket 01) —
// photo recovery, tarpaulin & bulletin printing, portraits & ID photo,
// picture framing. Distinct from service_packages (bundles Inclusions) and
// addon_services (attach to a booking). Per-branch bookability lives in
// branch_studio_services; add-on applicability in studio_service_addon_services.
export const studioServices = pgTable(
  'studio_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    priceCents: integer('price_cents').notNull(),
    // is_active gates the booking surface without deleting catalog history
    // (same posture as addon_services).
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: the seed upserts studio services by name (re-runnable, ids stable).
  },
  (table) => [unique('studio_services_name_unique').on(table.name)]
);
```

- [ ] **Step 3: Create `packages/db/src/schema/branch-studio-services.ts`** with exactly:

```ts
import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { branches } from './branches.js';
import { studioServices } from './studio-services.js';

// Presence-row junction (M2 ticket 01): a row MEANS the Studio Service is
// bookable at that Branch — no boolean column to drift. Seeded all-branches
// today; the M5 CMS edits rows directly. Children of the studio service —
// cascade delete keeps the seed's per-service rebuild trivial.
export const branchStudioServices = pgTable(
  'branch_studio_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    studioServiceId: uuid('studio_service_id')
      .notNull()
      .references(() => studioServices.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('branch_studio_services_pair_unique').on(table.studioServiceId, table.branchId),
    // FK lookup index (M1.2 review ruling): the booking form's branch step
    // reads bookable services by branch.
    index('branch_studio_services_branch_id_idx').on(table.branchId),
  ]
);
```

- [ ] **Step 4: Create `packages/db/src/schema/studio-service-addon-services.ts`** with exactly:

```ts
import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { addonServices } from './addon-services.js';
import { studioServices } from './studio-services.js';

// Add-on applicability matrix (M2 ticket 01): a row MEANS the Add-on Service
// applies to that Studio Service's bookings. Package bookings ignore this
// matrix (uniform all-active-add-ons rule); service bookings accept only
// junction-linked add-ons (enforced API-side, ticket 03).
export const studioServiceAddonServices = pgTable(
  'studio_service_addon_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studioServiceId: uuid('studio_service_id')
      .notNull()
      .references(() => studioServices.id, { onDelete: 'cascade' }),
    addonServiceId: uuid('addon_service_id')
      .notNull()
      .references(() => addonServices.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('studio_service_addon_services_pair_unique').on(
      table.studioServiceId,
      table.addonServiceId
    ),
    index('studio_service_addon_services_addon_service_id_idx').on(table.addonServiceId),
  ]
);
```

- [ ] **Step 5: Modify `packages/db/src/schema/service-packages.ts`** — inside the columns object, directly above `priceCents`, insert (note: `slug` is deliberately **nullable** in this pass; Task 4 flips it after the seed backfill):

```ts
    // Stable shareable identifier (M2 ticket 01): generated from the name at
    // insert; the seed's coalesce upsert never rewrites an existing slug, so
    // /packages/:slug URLs survive catalog renames. Nullable+UNIQUE in
    // migration 0002 (the live table is populated — the seed backfills),
    // NOT NULL in 0003.
    slug: text('slug').unique('service_packages_slug_unique'),
    // Home-page featured strip flag; owner-controlled via seed until the M5 CMS.
    isFeatured: boolean('is_featured').notNull().default(false),
```

(`text` and `boolean` are already imported in this file.)

- [ ] **Step 6: Append to `packages/db/src/schema/relations.ts`** — add the three imports alongside the existing ones and the three relation groups at the end of the file:

```ts
import { addonServices } from './addon-services.js';
import { branchStudioServices } from './branch-studio-services.js';
import { studioServiceAddonServices } from './studio-service-addon-services.js';
import { studioServices } from './studio-services.js';
```

```ts
export const studioServicesRelations = relations(studioServices, ({ many }) => ({
  branchLinks: many(branchStudioServices),
  addonLinks: many(studioServiceAddonServices),
}));

export const branchStudioServicesRelations = relations(branchStudioServices, ({ one }) => ({
  branch: one(branches, {
    fields: [branchStudioServices.branchId],
    references: [branches.id],
  }),
  studioService: one(studioServices, {
    fields: [branchStudioServices.studioServiceId],
    references: [studioServices.id],
  }),
}));

export const studioServiceAddonServicesRelations = relations(
  studioServiceAddonServices,
  ({ one }) => ({
    studioService: one(studioServices, {
      fields: [studioServiceAddonServices.studioServiceId],
      references: [studioServices.id],
    }),
    addonService: one(addonServices, {
      fields: [studioServiceAddonServices.addonServiceId],
      references: [addonServices.id],
    }),
  })
);
```

(`branches` is already imported in this file.)

- [ ] **Step 7: Update the `packages/db/src/schema/index.ts` barrel** — the export list is alphabetical; insert the two new lines so it reads:

```ts
export * from './addon-services.js';
export * from './appointment-addon-services.js';
export * from './appointments.js';
export * from './attires.js';
export * from './branch-studio-services.js';
export * from './branches.js';
export * from './frames.js';
export * from './package-inclusion-attires.js';
export * from './package-inclusions.js';
export * from './print-sizes.js';
export * from './relations.js';
export * from './service-packages.js';
export * from './studio-service-addon-services.js';
export * from './studio-services.js';
```

(Keep the existing BetterAuth TODO comment block at the bottom.)

- [ ] **Step 8: Generate migration 0002** (offline — no DB connection needed):

```bash
pnpm --filter @sevendays/db db:generate
```

Expected: drizzle-kit reports a new snapshot and writes `0002_*.sql`. **Read the generated file** (reading is required; editing is forbidden) and confirm it contains: `CREATE TABLE "studio_services"` (+ name unique), `CREATE TABLE "branch_studio_services"` (+ pair unique, branch_id index, FKs incl. `ON DELETE cascade` on studio_service_id), `CREATE TABLE "studio_service_addon_services"` (+ pair unique, addon_service_id index, FKs), and for `service_packages`: `ADD COLUMN "slug" text` + a UNIQUE constraint, `ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL`. No `appointments` changes may appear.

- [ ] **Step 9: Apply to the live DB**

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs   # expect GATE: PASS
cd ../.. && pnpm --filter @sevendays/db db:migrate
```

Expected: migration `0002_…` applied. Then a read-only structural check:

```bash
cd packages/db && node --env-file=.env scripts/db-state.mjs
```

Expected: the `public tables:` line now includes `studio_services`, `branch_studio_services`, `studio_service_addon_services`.

- [ ] **Step 10: Rebuild package dists and verify nothing broke**

```bash
pnpm build:packages && pnpm --filter @sevendays/db typecheck && pnpm --filter @sevendays/types typecheck
```

Expected: all green. (`apps/api` compiles unchanged — the new columns are additive and the `...p` spread picks up nullable `slug` without a type conflict while the types schema is untouched.)

- [ ] **Step 11: Commit**

```bash
pnpm exec biome check --write packages/db/src/schema/
git add packages/db/src/schema/ packages/db/migrations/
git commit -m "feat(db): studio_services + bookability/applicability junctions, package slug + is_featured (migration 0002)" -m "- studio_services: standalone bookable entity, name natural key, is_active posture like addon_services
- branch_studio_services / studio_service_addon_services: presence-row junctions, cascade on the service side, FK indexes per the M1.2 review ruling
- service_packages.slug nullable+unique in 0002 (live table is populated; seed backfills), is_featured NOT NULL default false
- 0003 (NOT NULL flip) follows the backfill — two generated migrations, never hand-edited"
```

---

### Task 2: Seed — slugifyName (TDD), studio-service seeds, seed extensions (live ×2)

**Files:**
- Modify: `packages/db/src/catalog-rows.ts`, `packages/db/src/catalog-rows.test.ts`, `packages/db/scripts/catalog.ts`, `packages/db/scripts/seed.ts`

**Interfaces:**
- Consumes: Task 1's `studioServices` / `branchStudioServices` / `studioServiceAddonServices` / `servicePackages.slug` / `servicePackages.isFeatured` (schema barrel).
- Produces: `slugifyName(name: string): string` (pure, exported from `../src/catalog-rows.js`); `studioServiceSeeds`, `studioServiceApplicableAddons`, `featuredPackageNames` in `scripts/catalog.ts` (Task 3's verify consumes all three). Live DB: 11 packages backfilled with slugs, 4 studio services, 12 bookability rows, 2 applicability rows, 4 featured flags.

- [ ] **Step 1: Write the failing slugify tests** — in `packages/db/src/catalog-rows.test.ts`, extend the existing `import { ... } from './catalog-rows.js';` statement with `slugifyName` (keep Biome's sort order), then append this describe block at the end of the file's pure unit section (outside the `runIf(TEST_DATABASE_URL)` live-probe describe):

```ts
describe('slugifyName', () => {
  it('slugifies a simple name', () => {
    expect(slugifyName('Basic Package')).toBe('basic-package');
  });

  it('strips punctuation and collapses whitespace', () => {
    expect(slugifyName('Customize Package (CP-1)')).toBe('customize-package-cp-1');
    expect(slugifyName('Tarpaulin & Bulletin Printing')).toBe('tarpaulin-bulletin-printing');
  });

  it('keeps intra-word hyphens and digits', () => {
    expect(slugifyName('Package A')).toBe('package-a');
    expect(slugifyName('CP-2')).toBe('cp-2');
  });

  it('falls back to a prefixed suffix when nothing alphanumeric survives', () => {
    const slug = slugifyName('???');
    expect(slug.startsWith('package-')).toBe(true);
    expect(slug.length).toBeGreaterThan('package-'.length);
  });
});
```

- [ ] **Step 2: RED** — `pnpm --filter @sevendays/db test -- catalog-rows` → FAIL: `slugifyName` is not exported.

- [ ] **Step 3: Implement `slugifyName`** — append to `packages/db/src/catalog-rows.ts`:

```ts
// Stable URL identifier from a display name (M2 ticket 01): lowercase, strip
// everything but letters/digits/hyphens, collapse whitespace to single
// hyphens. The seed generates once and backfills with coalesce — a later
// catalog rename must never rewrite an existing slug (/packages/:slug URLs
// survive renames). The random fallback covers a name with no alphanumeric
// characters; the unique constraint (checked in the seed before insert)
// makes a collision impossible to commit silently.
export function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base === '' ? `package-${Math.random().toString(36).slice(2, 10)}` : base;
}
```

- [ ] **Step 4: GREEN** — `pnpm --filter @sevendays/db test -- catalog-rows` → PASS (the live probe describe still skips without `TEST_DATABASE_URL`; it is exercised in Task 4 Step 7 against compose).

- [ ] **Step 5: Add the seed data to `packages/db/scripts/catalog.ts`** — append after `packageSeeds` (above `inclusionSignatures`):

```ts
// M2 ticket 01 — Studio Services. Names verbatim from the spec / CONTEXT.md
// glossary; descriptions + prices from the prototype's owner-seen stubs
// (prototype-booking-data.ts). Prices are TODO(seed) placeholders — same
// user-sanctioned posture as the branch phones.
export const studioServiceSeeds = [
  {
    name: 'Photo Recovery',
    description: 'Restore scanned or damaged photographs.',
    priceCents: 150000,
  },
  {
    name: 'Tarpaulin & Bulletin Printing',
    description: 'Large-format tarpaulin and bulletin printing.',
    priceCents: 80000,
  },
  {
    name: 'Portraits & ID Photo',
    description: 'Studio portraits and ID photos.',
    priceCents: 50000,
  },
  {
    name: 'Picture Framing',
    description: 'Custom framing for prints and artwork.',
    priceCents: 120000,
  },
] as const;

// Applicability matrix seeds (M2 ticket 01): add-on NAMES that apply to each
// Studio Service. Makeup + Hairstyle apply to Portraits & ID photo only; the
// other three services list none. Names must match addonServiceSeeds — the
// seed fails loudly on an unknown name.
export const studioServiceApplicableAddons: Record<string, string[]> = {
  'Photo Recovery': [],
  'Tarpaulin & Bulletin Printing': [],
  'Portraits & ID Photo': ['Makeup', 'Hairstyle'],
  'Picture Framing': [],
};

// Home-page featured strip (M2 ticket 01): the owner-pinned set. Seed-only
// until the M5 CMS featured toggle.
export const featuredPackageNames: readonly string[] = [
  'Basic Package',
  'Package A',
  'Package B',
  'Package C',
];
```

- [ ] **Step 6: Extend `packages/db/scripts/seed.ts`** — four edits:

(a) Imports — `import { eq } from 'drizzle-orm';` becomes `import { eq, sql } from 'drizzle-orm';`; the `from '../src/catalog-rows.js'` import gains `slugifyName`; the `from '../src/index.js'` schema import gains `branchStudioServices`, `studioServiceAddonServices`, `studioServices`; the `from './catalog.js'` import gains `featuredPackageNames`, `studioServiceApplicableAddons`, `studioServiceSeeds` (all keeping Biome's sort order).

(b) Inside the transaction, directly below the add-on services loop (after it — FK integrity) and above the `// Packages — upsert by unique name.` comment, insert the studio-services block:

```ts
    // M2 ticket 01 — Studio Services + junctions. Natural-key upsert by name;
    // junctions rebuild delete-then-insert per service so the DB stays
    // exactly in sync with scripts/catalog.ts on every run.
    const studioServiceIdByName = new Map<string, string>();
    for (const svc of studioServiceSeeds) {
      const [row] = await tx
        .insert(studioServices)
        .values(svc)
        .onConflictDoUpdate({
          target: studioServices.name,
          set: { description: svc.description, priceCents: svc.priceCents, isActive: true },
        })
        .returning({ id: studioServices.id });
      if (!row) throw new Error(`seed: upsert returned no row for studio service ${svc.name}`);
      studioServiceIdByName.set(svc.name, row.id);
    }

    const branchRows = await tx.select({ id: branches.id, name: branches.name }).from(branches);

    // Bookability: every seeded service bookable at every branch (spec
    // ruling — the prototype's not-Calamba Portraits stub was demo-only).
    for (const svc of studioServiceSeeds) {
      const serviceId = studioServiceIdByName.get(svc.name);
      if (!serviceId) throw new Error(`seed: no id for studio service ${svc.name}`);
      await tx
        .delete(branchStudioServices)
        .where(eq(branchStudioServices.studioServiceId, serviceId));
      await tx
        .insert(branchStudioServices)
        .values(branchRows.map((b) => ({ studioServiceId: serviceId, branchId: b.id })));
    }

    // Applicability: only the add-ons listed per service get junction rows;
    // an unknown add-on name fails loudly (a typo can't silently shrink the
    // matrix the booking form and API will trust).
    const addonRows = await tx
      .select({ id: addonServices.id, name: addonServices.name })
      .from(addonServices);
    const addonIdByName = new Map(addonRows.map((r) => [r.name, r.id]));
    for (const svc of studioServiceSeeds) {
      const serviceId = studioServiceIdByName.get(svc.name);
      if (!serviceId) throw new Error(`seed: no id for studio service ${svc.name}`);
      await tx
        .delete(studioServiceAddonServices)
        .where(eq(studioServiceAddonServices.studioServiceId, serviceId));
      const applicable = studioServiceApplicableAddons[svc.name] ?? [];
      if (applicable.length === 0) continue;
      const values = applicable.map((addonName) => {
        const addonId = addonIdByName.get(addonName);
        if (!addonId) throw new Error(`seed: applicability references unknown add-on "${addonName}"`);
        return { studioServiceId: serviceId, addonServiceId: addonId };
      });
      await tx.insert(studioServiceAddonServices).values(values);
    }
```

(c) Packages upsert — replace the existing package-loop insert/onConflict block with:

```ts
    // M2 ticket 01: resolve every slug up front and fail loudly on a
    // duplicate (two names slugifying identically would otherwise trip the
    // unique constraint mid-transaction).
    const slugByPackageName = new Map<string, string>();
    for (const pkg of packageSeeds) {
      const slug = slugifyName(pkg.name);
      for (const [owner, existing] of slugByPackageName) {
        if (existing === slug)
          throw new Error(`seed: slug collision — "${pkg.name}" and "${owner}" both slugify to "${slug}"`);
      }
      slugByPackageName.set(pkg.name, slug);
    }
    const featuredNames = new Set<string>(featuredPackageNames);

    // Packages — upsert by unique name. Deliberately does NOT touch
    // coverImageKey (Milestone 5 uploads it; reseeding must not null it).
    // slug backfills a NULL (first post-0002 seed) but never rewrites an
    // existing slug — /packages/:slug URLs survive catalog renames.
    for (const pkg of packageSeeds) {
      const [row] = await tx
        .insert(servicePackages)
        .values({
          name: pkg.name,
          description: pkg.description,
          priceCents: pkg.priceCents,
          slug: slugByPackageName.get(pkg.name),
          isFeatured: featuredNames.has(pkg.name),
        })
        .onConflictDoUpdate({
          target: servicePackages.name,
          set: {
            description: pkg.description,
            priceCents: pkg.priceCents,
            isFeatured: featuredNames.has(pkg.name),
            slug: sql`coalesce(${servicePackages.slug}, excluded.slug)`,
          },
        })
        .returning({ id: servicePackages.id });
      if (!row) throw new Error(`seed: upsert returned no row for package ${pkg.name}`);
```

(everything from the `// Frames — upsert per (package, frameNumber)` comment down stays untouched).

(d) Extend the success log:

```ts
  console.log(
    `[ok] seeded: ${branchSeeds.length} branches, ${printSizeSeeds.length} print sizes, ${attireSeeds.length} attires, ${addonServiceSeeds.length} add-on services, ${studioServiceSeeds.length} studio services, ${packageSeeds.length} packages with frames and inclusions`
  );
```

- [ ] **Step 7: Typecheck the package** — `pnpm --filter @sevendays/db typecheck` → PASS.

- [ ] **Step 8: Live seed ×2 (re-runnability proof, M1.3 convention)**

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs   # expect GATE: PASS
cd ../.. && pnpm --filter @sevendays/db db:seed
pnpm --filter @sevendays/db db:seed
```

Expected: `[ok] seeded: ... 4 studio services ...` both runs, no unique violations, no error. After run 1 all 11 packages carry slugs; run 2 must keep them identical (coalesce) — Task 3's verify asserts it.

- [ ] **Step 9: Commit**

```bash
pnpm exec biome check --write packages/db/src/catalog-rows.ts packages/db/src/catalog-rows.test.ts packages/db/scripts/catalog.ts packages/db/scripts/seed.ts
git add packages/db/src/catalog-rows.ts packages/db/src/catalog-rows.test.ts packages/db/scripts/catalog.ts packages/db/scripts/seed.ts
git commit -m "feat(db): seed studio services, applicability matrix, featured flags, slug backfill" -m "- slugifyName (pure, unit-tested): lowercase/strip/collapse; random fallback for alphanumeric-free names
- seed resolves all slugs up front (loud slug-collision error), upserts with coalesce(existing, excluded.slug) so reseeds never rewrite a slug — URL stability under renames
- four studio services (TODO(seed) placeholder prices like branch phones), bookable at all 3 branches, Makeup + Hairstyle applicable to Portraits & ID photo only
- featuredPackageNames: Basic, A, B, C; junctions rebuild delete-then-insert per service
- live seed run twice: second run proves re-runnability and slug stability"
```

---

### Task 3: verify-seed extensions (live VERIFY PASSED)

**Files:**
- Modify: `packages/db/scripts/verify-seed.ts`

**Interfaces:**
- Consumes: `slugifyName` (`../src/catalog-rows.js`); `studioServiceSeeds`, `studioServiceApplicableAddons`, `featuredPackageNames` (`./catalog.js`); `studioServices`, `branchStudioServices`, `studioServiceAddonServices` (`../src/index.js`) — all from Tasks 1–2.
- Produces: `db:verify-seed` exit 0 asserting the new rows. (This is ticket 01's own acceptance criterion; nothing downstream imports this script.)

- [ ] **Step 1: Extend the imports** — `from '../src/index.js'` gains `branchStudioServices`, `studioServiceAddonServices`, `studioServices`; add `import { slugifyName } from '../src/catalog-rows.js';`; `from './catalog.js'` gains `featuredPackageNames`, `studioServiceApplicableAddons`, `studioServiceSeeds` (Biome sort order).

- [ ] **Step 2: Extend the per-package loop** — directly below the existing `else pass(\`service package ${seed.name} ₱…\`)` line, append:

```ts
  // M2 ticket 01: slug backfilled, format-canonical, and featured flag on-set.
  if (row) {
    const expectedSlug = slugifyName(seed.name);
    row.slug === expectedSlug
      ? pass(`service package ${seed.name} slug "${row.slug}"`)
      : fail(`service package ${seed.name}: slug "${row.slug ?? 'null'}" != expected "${expectedSlug}"`);

    const expectedFeatured = featuredPackageNames.includes(seed.name);
    row.isFeatured === expectedFeatured
      ? pass(`service package ${seed.name}: is_featured ${row.isFeatured}`)
      : fail(`service package ${seed.name}: is_featured ${row.isFeatured} != ${expectedFeatured}`);
  }
```

(`row` is `| undefined` from the `find` above — the `if (row)` guard satisfies `noUncheckedIndexedAccess`-style strictness.)

- [ ] **Step 3: Add the studio-services section** — insert between the per-package loop and the `// Spot rows (public seed data — safe to print).` comment:

```ts
// M2 ticket 01 — Studio Services: rows, prices, bookability (all 3 branches),
// applicability (Makeup + Hairstyle → Portraits & ID Photo only).
const studioServiceRows = await db.select().from(studioServices);
studioServiceRows.length === studioServiceSeeds.length
  ? pass(`studio_services: ${studioServiceRows.length}/${studioServiceSeeds.length}`)
  : fail(`studio_services: ${studioServiceRows.length} != ${studioServiceSeeds.length}`);

for (const seed of studioServiceSeeds) {
  const row = studioServiceRows.find((r) => r.name === seed.name);
  if (!row) {
    fail(`studio service ${seed.name}: missing`);
    continue;
  }
  row.priceCents === seed.priceCents
    ? pass(`studio service ${seed.name} ₱${(seed.priceCents / 100).toFixed(2)} (TODO(seed) placeholder)`)
    : fail(`studio service ${seed.name}: price ${row.priceCents} != catalog ${seed.priceCents}`);

  const bookableRows = await db
    .select({ branchId: branchStudioServices.branchId })
    .from(branchStudioServices)
    .where(eq(branchStudioServices.studioServiceId, row.id));
  bookableRows.length === branchRows.length
    ? pass(`studio service ${seed.name}: bookable at ${bookableRows.length}/${branchRows.length} branches`)
    : fail(`studio service ${seed.name}: bookable at ${bookableRows.length} branches != ${branchRows.length}`);

  const applicableRows = await db
    .select({ addonName: addonServices.name })
    .from(studioServiceAddonServices)
    .innerJoin(addonServices, eq(studioServiceAddonServices.addonServiceId, addonServices.id))
    .where(eq(studioServiceAddonServices.studioServiceId, row.id));
  const actualApplicable = applicableRows.map((r) => r.addonName).sort();
  const expectedApplicable = [...(studioServiceApplicableAddons[seed.name] ?? [])].sort();
  actualApplicable.length === expectedApplicable.length &&
  actualApplicable.every((name, i) => name === expectedApplicable[i])
    ? pass(`studio service ${seed.name}: applicable add-ons [${actualApplicable.join(', ')}]`)
    : fail(
        `studio service ${seed.name}: applicable add-ons [${actualApplicable.join(', ')}] != [${expectedApplicable.join(', ')}]`
      );
}
```

- [ ] **Step 4: Run live**

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs   # expect GATE: PASS
cd ../.. && pnpm --filter @sevendays/db db:verify-seed
```

Expected: `VERIFY: PASSED — the seeded catalog matches docs/catalog.md.` with the new lines: `studio_services: 4/4`, per-service bookability `3/3 branches`, applicability lines (`Portraits & ID Photo: applicable add-ons [Hairstyle, Makeup]`, others `[]`), and per-package slug + `is_featured` lines (Basic/A/B/C `true`, the rest `false`).

- [ ] **Step 5: Commit**

```bash
pnpm exec biome check --write packages/db/scripts/verify-seed.ts
git add packages/db/scripts/verify-seed.ts
git commit -m "feat(db): verify-seed asserts studio services, junctions, slugs, featured flags" -m "- studio_services count + per-service price (TODO(seed) noted in output)
- bookability junction: every service bookable at all 3 branch rows
- applicability matrix: sorted set-compare against studioServiceApplicableAddons
- package slug: equals slugifyName(name) post-backfill; is_featured matches featuredPackageNames
- live VERIFY: PASSED"
```

---

### Task 4: Slug NOT NULL flip (migration 0003) + fixture blast radius + suites green

**Files:**
- Generated: `packages/db/migrations/0003_*.sql` (+ journal/snapshot)
- Modify: `apps/api/test/helpers/fixtures.ts:120-146` (3 package inserts), `packages/db/src/catalog-rows.test.ts` (BuilderProbe insert), `packages/db/src/verify-appointment-row.test.ts` (probe insert), `packages/db/scripts/rehearsal-fixture.mjs` (Rehearsal Package insert)

**Interfaces:**
- Consumes: Task 2's completed backfill (every live row has a slug) — **prerequisite, verified in Step 1**.
- Produces: `servicePackages.slug: string` (non-null, TS-side), migration `0003` applied live, all suites green on compose. Tickets 03/05 rely on NOT NULL being real in both schema and DB.

- [ ] **Step 1: Confirm the backfill completed** — re-run verify:

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs   # expect GATE: PASS
cd ../.. && pnpm --filter @sevendays/db db:verify-seed
```

Expected: `VERIFY: PASSED` including every package's slug line (11/11 present, `basic-package` … `customize-package-cp-2`). If any slug line failed, stop — fix the seed and re-run before flipping.

- [ ] **Step 2: Flip `slug` to NOT NULL in `packages/db/src/schema/service-packages.ts`** — replace

```ts
    slug: text('slug').unique('service_packages_slug_unique'),
```

with

```ts
    slug: text('slug').notNull().unique('service_packages_slug_unique'),
```

Keep `.unique(...)` — dropping it would make `db:generate` emit a `DROP CONSTRAINT` into 0003. Update the adjacent comment block to read:

```ts
    // Stable shareable identifier (M2 ticket 01): generated from the name at
    // insert; the seed's coalesce upsert never rewrites an existing slug, so
    // /packages/:slug URLs survive catalog renames. NOT NULL since migration
    // 0003 (0002 added it nullable+unique; the seed backfilled the 11 live
    // rows between the two migrations — the populated-table two-step).
    slug: text('slug').notNull().unique('service_packages_slug_unique'),
```

- [ ] **Step 3: Generate migration 0003**

```bash
pnpm --filter @sevendays/db db:generate
```

Expected: `0003_*.sql` containing `ALTER TABLE "service_packages" ALTER COLUMN "slug" SET NOT NULL;` and no `DROP` of the slug unique constraint. (Drizzle may emit a table redefine instead of a bare ALTER depending on its diff engine — judge the result, not the form: nothing may DROP the `service_packages_slug_unique` constraint or touch other tables.) Read it; never edit it.

- [ ] **Step 4: Apply 0003 live**

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs   # expect GATE: PASS
cd ../.. && pnpm --filter @sevendays/db db:migrate
```

Expected: applied cleanly — possible only because Step 1 proved zero NULL slugs.

- [ ] **Step 5: Fix the four raw/typed insert sites that predate the column** (required now that the column is NOT NULL with no default):

(a) `apps/api/test/helpers/fixtures.ts` — give each of the three package fixtures a slug, matching its name (`'combined-package'`, `'simple-package'`, `'retired-package'`):

```ts
      name: 'Combined Package',
      description: 'Framed picture with prints and privileges',
      priceCents: 150000,
      slug: 'combined-package',
      isActive: true,
```

(same pattern for `Simple Package` → `slug: 'simple-package'` and `Retired Package` → `slug: 'retired-package'`).

(b) `packages/db/src/catalog-rows.test.ts` BuilderProbe insert — add `slug: 'builderprobe-package',` to the `.values({...})`.

(c) `packages/db/src/verify-appointment-row.test.ts` probe insert — extend the raw SQL row to `insert into service_packages (id, name, description, price_cents, slug) values ('22222222-2222-4222-8222-222222222222', 'Probe Package', 'Probe description', 150000, 'probe-package') returning id`.

(d) `packages/db/scripts/rehearsal-fixture.mjs` — extend to `insert into service_packages (name, description, price_cents, slug) values ('Rehearsal Package', 'Rehearsal description', 99000, 'rehearsal-package') returning *`.

- [ ] **Step 6: Rebuild dists + typecheck the touched packages**

```bash
pnpm build:packages && pnpm --filter @sevendays/db typecheck && pnpm --filter @sevendays/types typecheck && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck
```

Expected: green — `slug` is now `string` (non-null) in the Drizzle row type; `packages/types` still has no `slug` on its schema (Task 5 adds it), and nothing in the API service layer constructs a package row, so the two types are independent until Task 5.

- [ ] **Step 7: Compose-up and run the integration suites**

```bash
docker compose up -d db        # wait for healthy: docker compose ps
pnpm --filter @sevendays/api test
pnpm --filter @sevendays/db test
```

Expected: api suites green (38 passed / 8 files pre-existing + none broken — the fixtures now satisfy NOT NULL); db package tests green including the catalog-rows live probe (`slug: 'builderprobe-package'` inserts cleanly).

- [ ] **Step 8: Commit**

```bash
pnpm exec biome check --write apps/api/test/helpers/fixtures.ts packages/db/src/catalog-rows.test.ts packages/db/src/verify-appointment-row.test.ts packages/db/scripts/rehearsal-fixture.mjs packages/db/src/schema/service-packages.ts
git add packages/db/src/schema/service-packages.ts packages/db/migrations/ apps/api/test/helpers/fixtures.ts packages/db/src/catalog-rows.test.ts packages/db/src/verify-appointment-row.test.ts packages/db/scripts/rehearsal-fixture.mjs
git commit -m "feat(db): enforce service_packages.slug NOT NULL (migration 0003)" -m "- backfill proven complete via db:verify-seed before the flip (11/11 slugs live)
- fixture/probe inserts (api fixtures, BuilderProbe, M1.5 probe, rehearsal fixture) gain explicit slugs
- integration + db suites green on compose"
```

---

### Task 5: packages/types — slug/isFeatured + StudioService mirror (TDD)

**Files:**
- Create: `packages/types/src/studio-service.ts`, `packages/types/src/studio-service.test.ts`
- Modify: `packages/types/src/package.ts`, `packages/types/src/package.test.ts`, `packages/types/src/index.ts`, `apps/api/test/service-packages.test.ts` (one seam assertion)

**Interfaces:**
- Consumes: the Drizzle row shapes from Tasks 1/4 (this is the Zod mirror of them — extend, don't redefine, per AGENTS.md).
- Produces: `servicePackageSchema` gains `slug: z.string().min(1)` + `isFeatured: z.boolean().default(false)`; `createServicePackageSchema` omits `slug` (server/seed-assigned, like `id`) and defaults `isFeatured`; `studioServiceSchema` / `StudioService` / `createStudioServiceSchema` / `CreateStudioServiceInput` exported from `@sevendays/types`. **Ticket 04** extends `studioServiceSchema` with `bookableBranchIds`; **ticket 02** renames `packagePriceCents` → `bookedPriceCents` in `appointment.ts` (not here).

- [ ] **Step 1: Write the failing tests** — create `packages/types/src/studio-service.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createStudioServiceSchema, studioServiceSchema } from './studio-service.js';

const UUID = '00000000-0000-4000-8000-000000000000';

const fullRow = {
  id: UUID,
  name: 'Portraits & ID Photo',
  description: 'Studio portraits and ID photos.',
  priceCents: 50000,
  isActive: true,
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

describe('studioServiceSchema', () => {
  it('parses an active row', () => {
    const result = studioServiceSchema.safeParse(fullRow);
    expect(result.success).toBe(true);
  });

  it('parses an inactive row (the read shape does not filter — the server does)', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, isActive: false });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative price', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, priceCents: -1 });
    expect(result.success).toBe(false);
  });
});

describe('createStudioServiceSchema', () => {
  it('parses a create payload without row-only fields', () => {
    const result = createStudioServiceSchema.safeParse({
      name: 'Photo Recovery',
      description: 'Restore scanned or damaged photographs.',
      priceCents: 150000,
    });
    expect(result.success).toBe(true);
  });

  it('defaults isActive to true', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'Picture Framing',
      description: 'Custom framing for prints and artwork.',
      priceCents: 120000,
    });
    expect(parsed.isActive).toBe(true);
  });
});
```

Then extend `packages/types/src/package.test.ts` — add `slug: 'basic-package',` to the shared `fullRow` fixture object (leave `isFeatured` out of `fullRow`; one test below exercises the schema default), and append:

```ts
describe('servicePackageSchema slug/isFeatured (M2 ticket 01)', () => {
  it('parses a row carrying slug and isFeatured', () => {
    const result = servicePackageSchema.safeParse({
      ...fullRow,
      isFeatured: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty slug', () => {
    const result = servicePackageSchema.safeParse({ ...fullRow, slug: '' });
    expect(result.success).toBe(false);
  });

  it('still parses a row without isFeatured (defaults false — pre-flag fixtures)', () => {
    const parsed = servicePackageSchema.parse({ ...fullRow });
    expect(parsed.isFeatured).toBe(false);
  });

  it('createServicePackageSchema strips slug (omitted — seed/server-assigned)', () => {
    // z.object strips unknown keys, so a payload carrying slug still parses —
    // the contract is that slug never appears in the parsed create output.
    const parsed = createServicePackageSchema.parse({
      name: 'New Package',
      description: 'A fresh package.',
      priceCents: 100000,
      slug: 'should-be-ignored',
    });
    expect(parsed.slug).toBeUndefined();
  });
});
```

- [ ] **Step 2: RED** — `pnpm --filter @sevendays/types test` → FAIL: cannot resolve `./studio-service.js`, plus `servicePackageSchema slug/isFeatured` failures on `rejects an empty slug` (empty string not yet rejected) and the `isFeatured` default test. Note: `parses a row carrying slug and isFeatured` may pass pre-implementation (z.object strips unknown keys) — the two failures above are the RED signal.

- [ ] **Step 3: Create `packages/types/src/studio-service.ts`** with exactly (mirrors `addon-service.ts` — same posture, same defaults):

```ts
import { z } from 'zod';

// Mirror of the studio_services row (M2 ticket 01). The M2 API read shape —
// StudioService plus embedded bookableBranchIds — extends THIS schema in
// ticket 04; define nothing per-route elsewhere.
export const studioServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type StudioService = z.infer<typeof studioServiceSchema>;

export const createStudioServiceSchema = studioServiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateStudioServiceInput = z.infer<typeof createStudioServiceSchema>;
```

- [ ] **Step 4: Extend `packages/types/src/package.ts`** — inside `servicePackageSchema`, below `coverImageKey`, insert:

```ts
  // Stable shareable identifier (M2 ticket 01): URL key for /packages/:slug.
  // Seed/server-assigned from the name — never rewritten on rename.
  slug: z.string().min(1),
  // Home-page featured strip flag; seed-controlled until the M5 CMS.
  isFeatured: z.boolean().default(false),
```

and change the create shape's omit list:

```ts
export const createServicePackageSchema = servicePackageSchema.omit({
  id: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
});
```

- [ ] **Step 5: Export from the barrel** — `packages/types/src/index.ts` gains `export * from './studio-service.js';` in alphabetical position (after `./print-size.js`).

- [ ] **Step 6: GREEN + rebuild** — `pnpm --filter @sevendays/types test` → PASS. Then:

```bash
pnpm build:packages && pnpm --filter @sevendays/api-client typecheck && pnpm --filter @sevendays/api typecheck
```

Expected: green. The api-client's `unwrap(res, servicePackageWithInclusionsSchema.array())` now requires a `slug` on every wire row — the API serves Drizzle rows spread with `...p`, which carry `slug` after Task 4, and the API's integration tests confirm the shape end-to-end in Step 7.

- [ ] **Step 7: Compose suites green (the seam check)** — first add one explicit seam assertion to `apps/api/test/service-packages.test.ts`, inside the main GET describe, right after the `expect(body.some((p) => p.id === ids.packageRetired)).toBe(false);` line:

```ts
    // M2 ticket 01: the wire shape carries the new catalog fields (the client
    // unwrap() requires slug — prove the API serves it before types ship).
    expect(simple?.slug).toBe('simple-package');
    expect(simple?.isFeatured).toBe(false);
```

Then:

```bash
docker compose up -d db
pnpm --filter @sevendays/api test && pnpm --filter @sevendays/types test
```

Expected: api integration suites pass including the new assertion — real-Postgres proof that the served rows carry `slug`/`isFeatured` (spec §"Slug/`isFeatured` present on the package schema", verified across the HTTP seam, not just in unit fixtures). `simple?.slug` is `string | undefined` under `noUncheckedIndexedAccess` — the `toBeDefined()` on `simple` above doesn't narrow it, so use `expect(simple?.slug).toBe('simple-package')` (no `!`).

- [ ] **Step 8: Commit**

```bash
pnpm exec biome check --write packages/types/src/ apps/api/test/service-packages.test.ts
git add packages/types/src/ apps/api/test/service-packages.test.ts
git commit -m "feat(types): slug + isFeatured on package schemas; StudioService row mirror" -m "- servicePackageSchema gains slug (min 1) + isFeatured (default false); create shape omits slug (seed/server-assigned)
- studioServiceSchema mirrors the studio_services row (addon-service posture); ticket 04 extends it with bookableBranchIds
- seam-verified on compose: the API's served package rows carry slug/isFeatured (new integration assertion)"
```

---

### Task 6: Full gate + progress.md

**Files:**
- Modify: `docs/progress.md`

**Interfaces:**
- Consumes: Tasks 1–5 complete and committed.

- [ ] **Step 1: Run the repo-wide gate**

```bash
pnpm check && pnpm build
```

Expected: lint + format + typecheck + test green across all packages/apps; build green (`pnpm test` includes apps/landing and apps/admin no-ops — fine; their real coverage is ticket 05+).

- [ ] **Step 2: Live re-verify (post-everything sanity)**

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs
cd ../.. && pnpm --filter @sevendays/db db:verify-seed
```

Expected: `VERIFY: PASSED` — the ticket-01 acceptance criterion "passes against the live DB" proven once more after all code landed.

- [ ] **Step 3: Update `docs/progress.md`** — add one bullet to the landed-work list (match the section's bullet style):

```markdown
- **M2 ticket 01 — Studio Services catalog + package slug/featured (#37 → .scratch/m2-booking-flow-tickets/01.md):** `studio_services` + `branch_studio_services` (per-branch bookability) + `studio_service_addon_services` (add-on applicability matrix) via generated migrations `0002`/`0003`; `service_packages.slug` (unique, NOT NULL — added nullable in 0002, seed backfilled all 11 packages with `slugifyName` output via a coalesce upsert that never rewrites existing slugs, NOT NULL in 0003) + `is_featured`. Seed extensions: the four Studio Services (Photo Recovery ₱1500, Tarpaulin & Bulletin Printing ₱800, Portraits & ID Photo ₱500, Picture Framing ₱1200 — TODO(seed) placeholder prices like the branch phones), all bookable at all 3 branches, Makeup + Hairstyle applicable to Portraits & ID photo only, featured on Basic/A/B/C; `db:verify-seed` asserts all of it (live VERIFY PASSED, seed re-run ×2). `packages/types`: slug/isFeatured on the package schemas, `studioServiceSchema` row mirror (ticket 04 extends it with `bookableBranchIds`). Integration + db suites green on compose; full `pnpm check` green. NOT landed: appointments generalization (ticket 02 — the plan.md M2 schema checkbox stays unticked until then), Studio Service API routes (ticket 04).
```

(Adjust the section heading context as needed — it belongs with the M2 pre-flight bullets, newest-adjacent.)

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md
git commit -m "docs(progress): M2 ticket 01 landed — studio services catalog + slug/featured"
```

- [ ] **Step 5: Stop here — handoff** (owner pushes/merges; tickets 02/04 branch from this state). Do **not** tick `docs/plan.md`'s M2 schema checkbox (spans tickets 01+02); do not open a PR unless asked.

---
