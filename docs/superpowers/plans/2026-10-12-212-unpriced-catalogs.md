# M7 Ticket 01 — Unpriced Catalogs: Nullable Prices End to End (ADR-0020) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **The UI-bearing tasks (4, 5) load the installed UI/UX skill set at execution time: `prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant (AGENTS.md rule, spec #94 amendment, ruled in #111) — both tasks are pure removals/joins inside ratified compositions, so NO owner-reacted rendered-variants round is required (the #94 amendment gates *new compositions*; none is created here — the ruling and its justification are pinned in each task).**

**Goal:** An inquiry-priced offering can live in the catalog (ADR-0020, amending ADR-0013): the five price columns — the three catalog columns (`service_packages.price_cents`, `studio_services.price_cents`, `addon_services.price_cents`) and the two snapshot columns (`appointments.booked_price_cents`, `appointment_addon_services.price_cents`) — become nullable via one metadata-only `DROP NOT NULL` migration on the live shared DB; the wire becomes `priceCents: number | null` end to end with no sentinel; the CMS gains the "Priced" checkbox on all three priced editors (unchecked saves null, re-checking requires re-entry, existing priced rows and — per the owner's 2026-10-12 ruling — NO new row defaults checked); unpriced items stay fully bookable with null snapshots; wherever a price would render on the landing **nothing renders** (no placeholder, no inquire line, no CTA change; `peso()` null-safe across the render sites); the booking **Total is omitted** whenever any component is unpriced while priced add-ons keep their per-item lines; and ADR-0020's amended invariant — *every appointment carries its quoted price when the booked item had one* — is pinned in the api suite (a snapshot taken while priced keeps that price forever). Two M7 roadmap boxes at `docs/plan.md` — "Schema + wire — unpriced catalogs" and "Landing + booking renders — the no-price law" — **are ticked by this ticket**.

**Architecture:** Six tasks: (1) `packages/db` — the five columns drop `.notNull()`, `db:generate` produces migration `0009` (metadata-only, verified to contain exactly five `DROP NOT NULL` statements and nothing else), `db:migrate` applies it to the live shared DB, and a read-only `information_schema` probe proves all five columns nullable; (2) the nullable wire lands atomically across `packages/types` (six schema fields in five files, TDD with eight contract tests) and `apps/api` (the one-line `offeringPriceCents: number | null` widening plus ten suite pins: null snapshots at intake on both offering paths, null add-on entries with priced lines retained, priced-snapshot retention when a row later goes unpriced, and null priceCents create/update on all three admin entity routers); (3) the landing money seam (TDD): `format.ts` grows the null-safe `peso` plus `labeledPrice`/`priceSuffix`/`bookAriaLabel`, `booking.ts`'s three total functions and `booking-read.ts`'s `confirmationTotalCents` become `number | null`-honest, and `featured.ts` sorts unpriced-first per the owner ruling; (4) the landing render sites — the eleven `peso(...)` JSX slots render nothing on null by construction, the home featured aria-label arithmetic leak dies via `bookAriaLabel`, the two wizard footer CTAs drop their `· ₱X` suffix via `priceSuffix`, the add-on lines join via `labeledPrice`, and the two Total rows render conditionally; (5) the admin side — `light-entity-state.ts` + `package-editor-state.ts` gain `hasPrice` (NaN = no entry; payload `null` when unchecked; validation skips price rules when unchecked, demands entry when checked) with eleven lib-seam tests, then the three editors get the Priced checkbox (either flip discards the entry — the ruled re-entry contract) and `cms/shared.tsx`'s `peso` goes null-safe so table cells render nothing on null; (6) gates + docs rotation (both M7 boxes TICKED, progress + AGENTS floors, the landing CONTEXT "Unpriced" glossary term) + PR/merge + the v1 pick (the spec's class ledger pre-rules catalog-side PICK clean / booking-path MAIN-ONLY) + ledger row + issue close + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes — zod 4.5.1 (`.nullable()` on the existing `.number().int().nonnegative()` chains), drizzle-orm 0.45.2 + drizzle-kit (the existing `db:generate`/`db:migrate` scripts over `DATABASE_MIGRATE_URL` in `packages/db/.env` — present, probed 2026-10-12), the existing `Checkbox` primitive from `@sevendays/ui/components/checkbox` (already imported by all three editors), vitest 4 per-package, pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#212 "M7 ticket 01: unpriced catalogs — nullable prices end to end (ADR-0020)"](https://github.com/jeius/sevendays/issues/212) (label `ready-for-agent`), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *Unpriced catalogs (#163 — ADR-0020)* is this ticket's ruling) and whose law is `docs/adr/0020-unpriced-catalog-items-nullable-snapshots.md` (Accepted, amends ADR-0013). Key recon facts (2026-10-12, main `d511197`; every suite re-run live this session):

- **Two ticket-text reconciliations, resolved against the schema (the ground truth):** (a) the ticket/ADR/spec say "the four snapshot columns" — the schema has **two** snapshot columns (`appointments.booked_price_cents`, `appointment_addon_services.price_cents`); the total is **five** nullable columns (3 catalog + 2 snapshot), and the migration below drops NOT NULL on exactly those five. (b) the ticket says "any package, print size, or add-on" — print sizes carry **no price column** (`packages/db/src/schema/print-sizes.ts`: code/description/isActive only); the third priced entity is the **Studio Service**, exactly as ADR-0020 rules ("All three priced entities are affected (Service Packages, Studio Services, Add-on Services)"). The editors touched are packages, studio services, add-ons — never print sizes.
- **The intake seam (landed code, read this session):** `apps/api/src/services/appointments.ts` — the client never supplies a price; `offeringPriceCents` is resolved from the offering row (line 113 `let offeringPriceCents: number` — the ONLY code change the api needs: the annotation widens to `number | null`, and everything downstream — the insert `.values({...input, bookedPriceCents: offeringPriceCents ...})`, the junction rows `priceCents: a.priceCents`, the record assembly — flows once the columns and types are nullable). The admin write services pass `input.priceCents` through (`admin-packages.ts` `entityFields`) — zero further api edits. Public reads `select()` whole rows and spread through `toRead` — nullable flows with no edit. The confirmation email is money-free by ADR-0014 — no ripple.
- **The admin entity routers validate through the types schemas directly** — the nullable wire flows from `packages/types` with zero route edits; the api's only test-suite changes are additive pins.
- **Every landing price render site (grep-verified complete):** `package-card.tsx:22`, `service-card.tsx:23`, `service-teaser-item.tsx:13`, `home-cards.tsx:88` (**an aria-label arithmetic leak** — `₱${(service.priceCents / 100).toFixed(0)}` would render `₱0` for null; null/100 === 0 in JS), `home-cards.tsx:112,162`, `book.tsx:161,191,216` (wizard choice cards), `book.tsx:233,365` (the `Continue · ₱X` / `Confirm booking · ₱X` footer CTAs), `summary-rail.tsx:24,36` (add-on lines + the Total row), `confirmation-card.tsx:39,49` (same pair). The admin table cells (`packages-table.tsx:254,296`, `addons-screen.tsx:587,638`, `studio-services-screen.tsx:560,611`) all render `{peso(row.priceCents)}` directly — a null-safe `peso` covers them with zero JSX edits.
- **The sort comparator nobody remembered:** `apps/landing/src/lib/featured.ts:13-14` orders the home featured strip by `a.priceCents - b.priceCents` — nulls need a rule (owner-ruled 2026-10-12, below).
- **Sibling fences (spec § Sequencing; docs/plan.md M7 block):** NOT here, regardless of temptation: the **packages expanded row's blank price cell** — that is ticket #219's AC ("Unpriced = blank price cell" is named in #219's body; this ticket's table cells go blank incidentally via null-safe `peso`, but the expanded row composition itself is #219); **guarded DELETE** (#213); **site settings** (#215); the **landing redesign** (#222/#223 — they re-verify the no-price law on the NEW surfaces per the spec's States bullet; this ticket pins the law on the current surfaces); **dark mode** (#216); the **CMS-wide interaction system's** async-Save/pending vocabulary (#218 — the Priced checkbox rides the editors' existing save flow unchanged); **branch covers + gallery captions** (#214); `appointment.test.ts`'s create-schema shape (the client still never supplies `bookedPriceCents` — `createAppointmentSchema`'s omit stands); the seed and `verify-seed.ts` (the seeded catalog is priced; strict-equality checks pass unchanged); `packages/api-client` (types flow through the Hono RPC `AppType`; the loopback mock's `?? 0` guards not-found addons, not null prices — zero changes, zero new tests there); `apps/admin/package.json` (the owner's uncommitted dev-port change rides above the branch — never staged).
- **Owner rulings (ratified 2026-10-12, this plan's clarify call — binding):** (1) an unpriced add-on's line in the booking summary rail and confirmation card renders **name-only** (the line stays so the customer still sees what they selected; only the price slot renders nothing); (2) the home featured strip sorts **unpriced first** (name-ordered within the group), priced ascending after (name tiebreak) — inquiry-priced leads the strip; (3) the wizard footer CTAs **drop the `· ₱X` suffix** when the Total is omitted (`Continue`, `Confirm booking` — never a dangling separator); (4) the create-mode checkbox defaults **unchecked** (a new row saves `null` unless staff tick Priced and enter a value — pricing becomes an explicit act; every create flow changes by design).
- **Baselines (live, 2026-10-12, re-run this session):** types **14 files / 121 tests**; admin **17 files / 173 tests**; landing (main) **9 files / 74 tests**; api **27 passed + 1 skipped (28 files) / 340 passed + 3 skipped**; api-client **5 files / 33 tests**; db suite **4 files** (catalog-rows, client-transaction, migrate, verify-appointment-row — counts unchanged by this ticket). After this ticket: **types 14 / 129 (+8), api 28 files / 350 + 3 skipped (+10), landing 9 / 83 (+9), admin 17 / 184 (+11)** (executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions). Migrations **0000–0008** are applied on the live shared DB (0008 is #185's `audit_log`); this ticket generates **0009**.
- **The dev-db port wrinkle (this machine, verified 2026-10-12):** an unrelated project's container (`lactalink-test-db`) squats host port 5432. The sevendays compose db runs remapped: `printf 'services:\n  db:\n    ports: !override\n      - "5433:5432"\n' > /tmp/sevendays-db-port.yml && docker compose -f compose.yaml -f /tmp/sevendays-db-port.yml up -d db`, and every api test command prefixes `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test'`. If 5432 is free in the executor's session, plain `docker compose up -d db` and no prefix. **Never** point the suite at the lactalink container.

## Global Constraints

- **Branch & baseline:** `feat/212-unpriced-catalogs` off main `d511197` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#212)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, migration SQL, probe output) lands in gitignored `.superpowers/sdd/2026-10-12-212-unpriced-catalogs/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (zod/drizzle/Checkbox are all installed). Every task commits only with the checks green **for the packages it touched** (AGENTS.md's letter): the per-task commands are pinned below. **The intermediate-commits note (binding):** the wire widens in Task 2 before the landing/admin consumers adapt, so `apps/landing` + `apps/admin` typecheck is EXPECTED red between Task 2's commit and Tasks 3–5's commits — per-package gates only until Task 5, whose gate restores the full **`pnpm check` 35/35** (and no commit after Task 2 may touch landing/admin files without carrying their fix, so the red window never widens). After any `packages/db/src` or `packages/types/src` edit, run `pnpm build:packages` before downstream typecheck/tests (dist/ is gitignored; turbo `typecheck` builds `^` but `test` does not). Biome canonical form via `pnpm --filter <pkg> fix` before committing — accept its rewrites. The api suite needs the compose db (the port recipe above). Never commit secrets; `DATABASE_MIGRATE_URL` already lives in gitignored `packages/db/.env` (probed present — never printed, never committed). Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (Task 6 — code was modified).
- **The wire law (ADR-0020, binding):** every price field is `z.number().int().nonnegative().nullable()` on the wire and `number | null` in TypeScript — **no sentinel value, no second column, no `0`-means-unpriced anywhere new**. Null is the unpriced state, nothing else. ADR-0013's invariant reads amended from here on: *every appointment carries its quoted price when the booked item had one* — a catalog row going unpriced never rewrites existing snapshots (retention is pinned by test). ADR-0013's "NOT NULL restoration" note is permanently dead.
- **The no-price rendering law (spec § Unpriced catalogs, binding):** wherever a price would render — landing cards, teasers, detail sheets, home featured, wizard choices, booking summary, confirmation — **nothing renders**: no placeholder, no inquire line, no CTA change. `peso()` returns `null` for `null` (JSX renders nothing); every string-embedded or arithmetic price site goes through the three pinned helpers or an explicit conditional. The Book CTAs never change.
- **The Total law (binding):** the booking Total (summary rail row, confirmation card row, the footer CTA suffixes) is omitted **entirely** whenever ANY component of the booking is unpriced — the offering or any selected add-on. Priced add-ons keep their per-item lines; unpriced add-ons keep name-only lines (owner ruling 1). "Not-found" is not "unpriced": a vanished mid-flow row keeps today's `0`-contribution/total semantics — only a FOUND row's `null` nulls the total (the distinction is pinned in code comments and tests).
- **The checkbox contract (spec + owner ruling 4, binding):** the "Priced" checkbox is UI sugar over the nullable column. Editor state carries `hasPrice: boolean` + the numeric entry (`NaN` = nothing entered, the package editor's established encoding, now adopted by all three editors); payload emits `priceCents: state.hasPrice ? state.priceCents : null`. **Unchecking discards the entered value; re-checking starts empty** — either checkbox flip sets the entry to `NaN`, and save is blocked while `hasPrice && Number.isNaN(entry)` (the ruled re-entry requirement). Existing priced rows open `hasPrice: true`; existing unpriced rows open `hasPrice: false` with an empty entry; **new rows open `hasPrice: false`** (owner ruling 4). The table deactivate/reactivate flip payloads carry `row.priceCents` verbatim (nullable wire — unchanged code).
- **Copy pins (staff-facing, owner-ratifiable in issue comments at close — pinned here as the working defaults):** the checkbox label is `Priced`; the helper under a checked price input stays `Stored as centavos.` (the existing `PESO_HELPER`); the helper when unchecked is `No price — bookable on inquiry.`; the validation error when checked but empty is `Enter a price of zero or more.` (package editor, existing wording) / `Enter a valid price.` (light entities, existing wording — unchanged strings, newly gated on `hasPrice`). No customer-facing copy changes anywhere: the omission law renders NOTHING, and the wizard CTAs keep their existing labels minus the price suffix.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Task 1 edits only `packages/db/src/schema/{service-packages,studio-services,addon-services,appointments,appointment-addon-services}.ts` + the generated `packages/db/migrations/0009_*.sql` + `migrations/meta/*`. Task 2 edits only `packages/types/src/{package,studio-service,addon-service,appointment,appointment-read}.ts` + their `.test.ts` files + `apps/api/src/services/appointments.ts` (one annotation + comments) + `apps/api/test/{appointments,admin-packages,admin-studio-services,admin-entities}.test.ts`. Task 3 edits only `apps/landing/src/lib/{format,booking,booking-read,featured}.ts` + their `.test.ts` files. Task 4 edits only `apps/landing/src/components/{package-card,service-card,service-teaser-item,home-cards}.tsx` + `apps/landing/src/components/booking/{summary-rail,confirmation-card}.tsx` + `apps/landing/src/routes/book.tsx`. Task 5 edits only `apps/admin/src/lib/{light-entity-state,package-editor-state}.ts` + their `.test.ts` files + `apps/admin/src/components/cms/shared.tsx` + `apps/admin/src/components/packages/package-editor.tsx` + `apps/admin/src/components/{addons/addons-screen,studio-services/studio-services-screen}.tsx`. Task 6 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `apps/landing/CONTEXT.md`, `graphify-out/` (update output), `docs/agents/v1-picks.md` (post-merge), and works the PR/pick/issue — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/db/
  src/schema/service-packages.ts               # modify (T1) — priceCents nullable + ADR-0020 comment
  src/schema/studio-services.ts                # modify (T1) — same
  src/schema/addon-services.ts                 # modify (T1) — same
  src/schema/appointments.ts                   # modify (T1) — bookedPriceCents nullable + amended-invariant comment
  src/schema/appointment-addon-services.ts     # modify (T1) — priceCents nullable + comment
  migrations/0009_<generated>.sql              # generated (T1) — five DROP NOT NULL, metadata-only
  migrations/meta/_journal.json + snapshot     # generated (T1)
packages/types/src/
  package.ts                                   # modify (T2) — servicePackageSchema + packageSaveObjectSchema priceCents nullable
  studio-service.ts                            # modify (T2) — studioServiceSchema priceCents nullable
  addon-service.ts                             # modify (T2) — addonServiceSchema priceCents nullable
  appointment.ts                               # modify (T2) — bookedPriceCents nullable + comment
  appointment-read.ts                          # modify (T2) — appointmentAddonEntrySchema.priceCents nullable
  {package,studio-service,addon-service,appointment-read}.test.ts  # modify (T2) — +8 unpriced contract tests
apps/api/
  src/services/appointments.ts                 # modify (T2) — offeringPriceCents: number | null + doc
  test/appointments.test.ts                    # modify (T2) — +4 unpriced-intake/retention pins
  test/admin-packages.test.ts                  # modify (T2) — +2 null priceCents write pins
  test/admin-studio-services.test.ts           # modify (T2) — +2 null priceCents write pins
  test/admin-entities.test.ts                  # modify (T2) — +2 null priceCents write pins (add-ons)
apps/landing/src/
  lib/format.ts                                # modify (T3) — peso null-safe + labeledPrice + priceSuffix + bookAriaLabel
  lib/format.test.ts                           # modify (T3) — +4 tests
  lib/booking.ts                               # modify (T3) — offeringPriceCents/addonTotalCents/totalCents → number | null
  lib/booking.test.ts                          # modify (T3) — +2 tests
  lib/booking-read.ts                          # modify (T3) — confirmationTotalCents → number | null
  lib/booking-read.test.ts                     # modify (T3) — +2 tests
  lib/featured.ts                              # modify (T3) — unpriced-first comparator
  lib/featured.test.ts                         # modify (T3) — +1 test
  components/package-card.tsx                  # modify (T4) — peso import only (null renders nothing)
  components/service-card.tsx                  # modify (T4) — same
  components/service-teaser-item.tsx           # modify (T4) — same
  components/home-cards.tsx                    # modify (T4) — bookAriaLabel kills the ₱0 leak
  components/booking/summary-rail.tsx          # modify (T4) — labeledPrice + conditional Total row
  components/booking/confirmation-card.tsx     # modify (T4) — labeledPrice + conditional Total row
  routes/book.tsx                              # modify (T4) — priceSuffix on the two footer CTAs
apps/admin/src/
  lib/light-entity-state.ts                    # modify (T5) — hasPrice on both priced light entities + NaN entry
  lib/light-entity-state.test.ts               # modify (T5) — +6 tests + hasPrice on existing literals
  lib/package-editor-state.ts                  # modify (T5) — hasPrice + NaN-default + gated validation
  lib/package-editor-state.test.ts             # modify (T5) — +5 tests + hasPrice on existing literals
  components/cms/shared.tsx                    # modify (T5) — peso null-safe
  components/packages/package-editor.tsx       # modify (T5) — the Priced checkbox
  components/addons/addons-screen.tsx          # modify (T5) — the Priced checkbox
  components/studio-services/studio-services-screen.tsx  # modify (T5) — the Priced checkbox
docs/plan.md docs/progress.md AGENTS.md apps/landing/CONTEXT.md graphify-out/ docs/agents/v1-picks.md  # T6
```

---

### Task 1: `packages/db` — the five columns nullable, the metadata-only migration, live apply + probe

**Files:**
- Modify: `packages/db/src/schema/service-packages.ts`, `studio-services.ts`, `addon-services.ts`, `appointments.ts`, `appointment-addon-services.ts`
- Generated: `packages/db/migrations/0009_<name>.sql` + `migrations/meta/` (journal + snapshot)

**Interfaces:**
- Produces (what Tasks 2–5 consume): the drizzle table types widen automatically — `servicePackages.priceCents`, `studioServices.priceCents`, `addonServices.priceCents`, `appointments.bookedPriceCents`, `appointmentAddonServices.priceCents` all become `number | null` in every downstream `Insert`/`Select` type. Nothing else in `packages/db` changes (index/client/migrations machinery untouched; the api test global-setup auto-applies the new migration to the compose db via `migrateDatabase`).

**Not here:** any data change (the migration is metadata-only — no rewrite, no backfill; the live DB keeps every price); any types/api/app change (Tasks 2–5); `db:migrate` against the compose test db by hand (global-setup does it).

- [ ] **Step 1: The five schema edits**

(a) `packages/db/src/schema/service-packages.ts` — replace line 18:

```ts
    priceCents: integer('price_cents').notNull(),
```

with:

```ts
    // Null = unpriced (ADR-0020): inquiry-priced offerings live in the
    // catalog fully bookable; nullable since migration 0009. No sentinel.
    priceCents: integer('price_cents'),
```

(b) `packages/db/src/schema/studio-services.ts` — replace line 14 (`    priceCents: integer('price_cents').notNull(),`) with the same comment + `    priceCents: integer('price_cents'),` block as (a).

(c) `packages/db/src/schema/addon-services.ts` — replace line 12 (`    priceCents: integer('price_cents').notNull(),`) with the same block as (a).

(d) `packages/db/src/schema/appointments.ts` — replace the comment block + column (lines 43–47):

```ts
    // Booking-time snapshot of the booked offering's price — the quoted
    // price survives later catalog price changes. Server-written at booking
    // (M1.4). Renamed from package_price_cents (M2 ticket 02): it now
    // snapshots either offering kind.
    bookedPriceCents: integer('booked_price_cents').notNull(),
```

with:

```ts
    // Booking-time snapshot of the booked offering's price — the quoted
    // price survives later catalog price changes. Server-written at booking
    // (M1.4). Renamed from package_price_cents (M2 ticket 02): it now
    // snapshots either offering kind. Nullable since migration 0009
    // (ADR-0020): null = the booked item was unpriced. The invariant reads
    // amended — every appointment carries its quoted price WHEN the booked
    // item had one; a snapshot taken while priced keeps that price forever
    // (a row later going unpriced never rewrites history).
    bookedPriceCents: integer('booked_price_cents'),
```

(e) `packages/db/src/schema/appointment-addon-services.ts` — replace the file's opening comment (lines 5–8):

```ts
// Booking-time attachment of paid add-on services. price_cents snapshots the
// add-on's flat price at booking — later price edits don't rewrite history.
// The unique pair means an add-on attaches at most once per appointment;
// quantity lives in the inclusions model, not here.
```

with:

```ts
// Booking-time attachment of add-on services. price_cents snapshots the
// add-on's flat price at booking — later price edits don't rewrite history.
// Nullable since migration 0009 (ADR-0020): null = the add-on was unpriced
// at booking; priced entries keep their snapshot. The unique pair means an
// add-on attaches at most once per appointment; quantity lives in the
// inclusions model, not here.
```

and replace line 19 (`    priceCents: integer('price_cents').notNull(),`) with `    priceCents: integer('price_cents'),`.

- [ ] **Step 2: Generate migration 0009 + verify its shape**

```bash
pnpm --filter @sevendays/db db:generate
```

Open the generated `packages/db/migrations/0009_*.sql` — it must contain **exactly five `ALTER TABLE … DROP NOT NULL` statements and nothing else** (set-equality; order may differ):

```sql
ALTER TABLE "addon_services" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment_addon_services" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "booked_price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_packages" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_services" ALTER COLUMN "price_cents" DROP NOT NULL;
```

If the generator emits anything else (an index, a rewrite, a sixth column), STOP — that is a defect in the schema edits, fix at the source and regenerate. Record the SQL in the evidence dir. Note the generated migration's actual filename for the commit.

- [ ] **Step 3: Apply to the live shared DB (metadata-only, safe online)**

```bash
pnpm --filter @sevendays/db db:migrate
```

This reads `DATABASE_MIGRATE_URL` from `packages/db/.env` (present — probed; never print it). `DROP NOT NULL` is a catalog-only change taking momentary locks on five small tables — no rewrite, no downtime. Then the read-only proof (run from `packages/db`; `--env-file` needs Node ≥ 20.1 — if unsupported, `set -a; . ./.env; set +a` first and drop the flag):

```bash
cd packages/db && node --env-file=.env -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_MIGRATE_URL, { prepare: false, max: 1 });
  const rows = await sql\`select table_name || '.' || column_name as col, is_nullable from information_schema.columns where (table_name, column_name) in (('service_packages','price_cents'),('studio_services','price_cents'),('addon_services','price_cents'),('appointments','booked_price_cents'),('appointment_addon_services','price_cents')) order by col\`;
  for (const r of rows) console.log(r.col, 'nullable=' + r.is_nullable);
  await sql.end({ timeout: 5 });
});"
```

Expected output — five lines, every one `nullable=YES`:

```text
addon_services.price_cents nullable=YES
appointment_addon_services.price_cents nullable=YES
appointments.booked_price_cents nullable=YES
service_packages.price_cents nullable=YES
studio_services.price_cents nullable=YES
```

Record it in the evidence dir. `cd` back to the repo root afterward.

- [ ] **Step 4: Gates + commit**

`pnpm --filter @sevendays/db fix`, then `pnpm --filter @sevendays/db test` (the four db files, counts unchanged — the fixtures all carry explicit prices, still valid under nullable), then `pnpm --filter @sevendays/db typecheck`, then `pnpm build:packages`. NOTE: `pnpm check` full-repo is NOT this task's gate — `apps/api` typecheck is now expected-red (its `let offeringPriceCents: number` annotation vs the widened drizzle type); Task 2 carries the fix. Commit (substitute the generated name):

```bash
git add packages/db/src/schema packages/db/migrations
git commit -m "feat(db): the five price columns go nullable - ADR-0020's metadata-only DROP NOT NULL (#212)"
```

### Task 2: The nullable wire — `packages/types` (TDD) + `apps/api` (the one-line widening + ten suite pins)

**Files:**
- Modify (test-first): `packages/types/src/package.test.ts`, `studio-service.test.ts`, `addon-service.test.ts`, `appointment-read.test.ts`
- Modify: `packages/types/src/package.ts`, `studio-service.ts`, `addon-service.ts`, `appointment.ts`, `appointment-read.ts`
- Modify: `apps/api/src/services/appointments.ts` (one annotation + doc sentence)
- Modify: `apps/api/test/appointments.test.ts`, `admin-packages.test.ts`, `admin-studio-services.test.ts`, `admin-entities.test.ts`

**Interfaces:**
- Produces (what Tasks 3–5 consume): `ServicePackage['priceCents']`, `StudioService['priceCents']`, `AddonService['priceCents']`, `CreateServicePackageInput['priceCents']`, `CreateStudioServiceInput['priceCents']`, `CreateAddonServiceInput['priceCents']` (and every update/read derivation of them), `Appointment['bookedPriceCents']`, `AppointmentAddonEntry['priceCents']` — all `number | null`. The update schemas are the create schemas (light entities) / the same save object (packages) — one edit per source schema widens create+update+read together.
- Consumes: Task 1's nullable drizzle columns (the api's insert values accept null once this task's types allow it).

**Not here:** any landing/admin code (Tasks 3–5 — their typecheck is expected-red until then, per Global Constraints); any new route or service behavior (the intake already snapshots whatever the resolved row carries; only the annotation widens); `createAppointmentSchema` (the client never supplies `bookedPriceCents` — the omit stands); api-client (types flow; no changes).

- [ ] **Step 1: Write the failing types tests — one `unpriced` describe per file**

(a) `packages/types/src/package.test.ts` — append at file end (fixture `fullRow` and the inline-create style are the file's own):

```ts
describe('unpriced catalogs (ADR-0020)', () => {
  it('the row shape parses a null price (unpriced package)', () => {
    const parsed = servicePackageSchema.parse({ ...fullRow, priceCents: null });
    expect(parsed.priceCents).toBeNull();
  });

  it('create accepts a null price — the unchecked Priced save', () => {
    const parsed = createServicePackageSchema.parse({
      name: 'Inquiry Package',
      description: 'Priced on inquiry.',
      priceCents: null,
      durationMinutes: null,
      frames: [],
      inclusions: [],
    });
    // Assert on the parsed OUTPUT: null survives, the defaults applied.
    expect(parsed.priceCents).toBeNull();
    expect(parsed.isActive).toBe(true);
    expect(parsed.isFeatured).toBe(false);
  });
});
```

(b) `packages/types/src/studio-service.test.ts` — append at file end:

```ts
describe('unpriced catalogs (ADR-0020)', () => {
  it('the row shape parses a null price (unpriced studio service)', () => {
    const parsed = studioServiceSchema.parse({ ...fullRow, priceCents: null });
    expect(parsed.priceCents).toBeNull();
  });

  it('create accepts a null price — the unchecked Priced save', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'On-inquiry service',
      description: 'Quoted per job.',
      priceCents: null,
    });
    expect(parsed.priceCents).toBeNull();
    expect(parsed.isActive).toBe(true);
  });
});
```

(c) `packages/types/src/addon-service.test.ts` — append at file end:

```ts
describe('unpriced catalogs (ADR-0020)', () => {
  it('the row shape parses a null price (unpriced add-on)', () => {
    const parsed = addonServiceSchema.parse({
      id: UUID,
      name: 'Oncall stylist',
      description: 'Quoted on the day.',
      priceCents: null,
      isActive: true,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(parsed.priceCents).toBeNull();
  });

  it('create accepts a null price — the unchecked Priced save', () => {
    const parsed = createAddonServiceSchema.parse({
      name: 'Oncall stylist',
      description: 'Quoted on the day.',
      priceCents: null,
    });
    expect(parsed.priceCents).toBeNull();
  });
});
```

(d) `packages/types/src/appointment-read.test.ts` — append at file end (fixtures `base` + `OTHER_UUID` are the file's own):

```ts
describe('unpriced bookings (ADR-0020)', () => {
  it('parses a null bookedPriceCents — the unpriced-offering snapshot', () => {
    const parsed = appointmentWithAddonsSchema.parse({
      ...base,
      bookedPriceCents: null,
      addonServices: [],
    });
    expect(parsed.bookedPriceCents).toBeNull();
  });

  it('parses a null add-on entry price — the unpriced add-on snapshot', () => {
    const parsed = appointmentWithAddonsSchema.parse({
      ...base,
      addonServices: [{ addonServiceId: OTHER_UUID, name: 'Oncall stylist', priceCents: null }],
    });
    expect(parsed.addonServices[0]?.priceCents).toBeNull();
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/types test -- --run` — the eight new its fail (null rejected by the non-nullable chains). Record the red in the evidence dir.

- [ ] **Step 3: Widen the six schema fields**

(a) `packages/types/src/package.ts` — in `servicePackageSchema` (line 11), replace:

```ts
  priceCents: z.number().int().nonnegative(),
```

with:

```ts
  // Null = unpriced (ADR-0020): inquiry-priced offerings are fully bookable;
  // no sentinel value. Nullable on reads AND writes alike.
  priceCents: z.number().int().nonnegative().nullable(),
```

and in `packageSaveObjectSchema` (line 77), replace the bare `  priceCents: z.number().int().nonnegative(),` with `  priceCents: z.number().int().nonnegative().nullable(),` (both create and update derive from this object; no comment needed at the second site — the schema comment above the object stays).

(b) `packages/types/src/studio-service.ts` — line 11, same replacement as (a)'s first site (comment included).

(c) `packages/types/src/addon-service.ts` — line 9, same replacement as (a)'s first site (comment included).

(d) `packages/types/src/appointment.ts` — lines 45–48, replace:

```ts
  // Booking-time snapshot of the booked offering's price — written by the
  // server, never supplied by the client. Renamed from packagePriceCents
  // (M2 ticket 02): it now snapshots either offering kind.
  bookedPriceCents: z.number().int().nonnegative(),
```

with:

```ts
  // Booking-time snapshot of the booked offering's price — written by the
  // server, never supplied by the client. Renamed from packagePriceCents
  // (M2 ticket 02): it now snapshots either offering kind. Null = the booked
  // item was unpriced (ADR-0020): every appointment carries its quoted price
  // WHEN the booked item had one.
  bookedPriceCents: z.number().int().nonnegative().nullable(),
```

(e) `packages/types/src/appointment-read.ts` — lines 11–15, replace:

```ts
export const appointmentAddonEntrySchema = z.object({
  addonServiceId: z.uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});
```

with:

```ts
export const appointmentAddonEntrySchema = z.object({
  addonServiceId: z.uuid(),
  name: z.string().min(1),
  // Booking-time snapshot (ADR-0013); null = the add-on was unpriced at
  // booking (ADR-0020).
  priceCents: z.number().int().nonnegative().nullable(),
});
```

- [ ] **Step 4: Green the types suite, then widen the api's one annotation**

`pnpm --filter @sevendays/types test -- --run` — 14 files / **129 tests** green. Then `pnpm build:packages` (downstream resolves types from `dist/`), then the api edit — `apps/api/src/services/appointments.ts`, line 113, replace:

```ts
    let offeringPriceCents: number;
```

with:

```ts
    // number | null (ADR-0020): an unpriced offering snapshots null —
    // everything downstream (the insert, the record, the wire) flows.
    let offeringPriceCents: number | null;
```

and in the `createAppointment` JSDoc block (lines 71–87), extend the sentence `The client never supplies a price — snapshots come from the resolved rows.` to read `The client never supplies a price — snapshots come from the resolved rows (ADR-0020: an unpriced offering snapshots null; the invariant is "when the booked item had one").` Nothing else in the api changes: the insert `.values({ ...input, bookedPriceCents: offeringPriceCents, notes: input.notes ?? null })`, the junction inserts, and the record assembly all carry the widened type through.

- [ ] **Step 5: The api suite pins (regression pins — write, then green)**

These ten its pin behavior that Tasks 1+2's code changes already produce (green-on-arrival pins per the #207 house precedent — the red happened at Step 2 in the types suite; run these, confirm green, and treat any failure as a defect in Tasks 1–2, never a reason to loosen the pin).

(a) `apps/api/test/appointments.test.ts` — first widen the table import (line 1), replacing:

```ts
import { appointmentAddonServices, appointments as appointmentsTable } from '@sevendays/db';
```

with:

```ts
import {
  addonServices as addonServicesTable,
  appointmentAddonServices,
  appointments as appointmentsTable,
  servicePackages as servicePackagesTable,
  studioServices as studioServicesTable,
} from '@sevendays/db';
```

then append at file end:

```ts
describe('unpriced bookings (ADR-0020)', () => {
  // The CMS checkbox is the UI path; these pin the wire contract: null is
  // the unpriced state end to end, and priced snapshots never rewrite.
  // Catalog prices are nulled with direct db updates — the row-level truth,
  // not another API call.

  it('books an unpriced package — 201, null offering snapshot, priced add-on lines retained', async () => {
    await db
      .update(servicePackagesTable)
      .set({ priceCents: null })
      .where(eq(servicePackagesTable.id, ids.packageCombined));
    const created = (await createViaApi(payload())) as {
      bookedPriceCents: number | null;
      addonServices: { addonServiceId: string; name: string; priceCents: number | null }[];
    };
    expect(created.bookedPriceCents).toBeNull();
    expect(created.addonServices).toEqual([
      { addonServiceId: ids.addonMakeup, name: 'Makeup', priceCents: 12000 },
    ]);
  });

  it('books an unpriced studio service — 201, null snapshot (both offering paths unpriced-able)', async () => {
    await db
      .update(studioServicesTable)
      .set({ priceCents: null })
      .where(eq(studioServicesTable.id, ids.servicePortrait));
    const created = (await createViaApi(
      payload({ servicePackageId: null, studioServiceId: ids.servicePortrait })
    )) as { bookedPriceCents: number | null };
    expect(created.bookedPriceCents).toBeNull();
  });

  it('snapshots a null entry for an unpriced add-on while priced add-ons keep theirs', async () => {
    await db
      .update(addonServicesTable)
      .set({ priceCents: null })
      .where(eq(addonServicesTable.id, ids.addonMakeup));
    const created = (await createViaApi(
      payload({ addonServiceIds: [ids.addonMakeup, ids.addonHairstyle] })
    )) as { addonServices: { addonServiceId: string; priceCents: number | null }[] };
    const byId = new Map(created.addonServices.map((entry) => [entry.addonServiceId, entry]));
    expect(byId.get(ids.addonMakeup)?.priceCents).toBeNull();
    expect(byId.get(ids.addonHairstyle)?.priceCents).toBe(6000);
  });

  it("ADR-0020's invariant: a snapshot taken while priced keeps the price after the row goes unpriced", async () => {
    const created = (await createViaApi(payload())) as { id: string };
    await db
      .update(servicePackagesTable)
      .set({ priceCents: null })
      .where(eq(servicePackagesTable.id, ids.packageCombined));
    const res = await app.request(
      `/api/v1/appointments/${created.id}`,
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { bookedPriceCents: number | null }).bookedPriceCents).toBe(
      150000
    );
  });
});
```

(b) `apps/api/test/admin-packages.test.ts` — append at file end (helpers `authed`/`save`/`put` are the file's own; `save()`'s overrides parameter is `Record<string, unknown>`, so `priceCents: null` rides it directly):

```ts
describe('unpriced saves (ADR-0020)', () => {
  it('POST with priceCents null creates an unpriced package — 201, wire echoes null', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-unpriced@sevendays.test',
      save({ name: 'Inquiry Only Package', priceCents: null })
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { priceCents: number | null }).priceCents).toBeNull();
  });

  it('PUT with priceCents null flips the priced fixture unpriced — 200, wire echoes null', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'admin-pkg-unpriced2@sevendays.test',
      put({ priceCents: null })
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { priceCents: number | null }).priceCents).toBeNull();
  });
});
```

(c) `apps/api/test/admin-studio-services.test.ts` — append at file end:

```ts
describe('unpriced saves (ADR-0020)', () => {
  it('POST with priceCents null creates an unpriced service — 201, wire echoes null', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'admin-services-unpriced@sevendays.test',
      { name: 'Quote On Sight', description: 'Priced per piece.', priceCents: null }
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { priceCents: number | null }).priceCents).toBeNull();
  });

  it('PUT with priceCents null flips the priced fixture unpriced — 200, wire echoes null', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}`,
      'admin-services-unpriced2@sevendays.test',
      { name: 'Portraits & ID Photo', description: 'Studio portraits and ID photos.', priceCents: null }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { priceCents: number | null }).priceCents).toBeNull();
  });
});
```

(d) `apps/api/test/admin-entities.test.ts` — append at file end (the add-on router lives in this suite; bodies follow its inline-literal style):

```ts
describe('unpriced saves (ADR-0020 — add-on services)', () => {
  it('POST with priceCents null creates an unpriced add-on — 201, wire echoes null', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/addon-services',
      'admin-addons-unpriced@sevendays.test',
      { name: 'Oncall Stylist', description: 'Quoted on the day.', priceCents: null }
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { priceCents: number | null }).priceCents).toBeNull();
  });

  it('PUT with priceCents null flips the priced fixture unpriced — 200, wire echoes null', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      'admin-addons-unpriced2@sevendays.test',
      { name: 'Makeup', description: 'On-site makeup service', priceCents: null, isActive: true }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { priceCents: number | null }).priceCents).toBeNull();
  });
});
```

(If `admin-entities.test.ts`'s local helper is named differently than `authed`, mirror its exact helper call from the neighboring add-on CRUD tests — the bodies and assertions above stand verbatim.)

- [ ] **Step 6: Green + gates + commit**

With the compose db up (the Global Constraints port recipe): `pnpm --filter @sevendays/api test -- --run` — 27 passed + 1 skipped files / **350 passed + 3 skipped** (the ten new pins green on arrival). Then `pnpm --filter @sevendays/types fix` + `pnpm --filter @sevendays/api fix`, re-run both suites (fix must not change counts), `pnpm --filter @sevendays/types typecheck` + `pnpm --filter @sevendays/api typecheck`, and `pnpm build:packages` once more if `fix` touched `packages/types/src`. Full-repo `pnpm check` is NOT yet the gate (landing/admin expected-red until Tasks 3–5). Commit:

```bash
git add packages/types/src apps/api/src/services/appointments.ts apps/api/test
git commit -m "feat(types,api): the nullable price wire + null snapshots at intake, priced-snapshot retention, null catalog writes (#212)"
```

### Task 3: `apps/landing` — the null-safe money seam (TDD: `format.ts`, `booking.ts`, `booking-read.ts`, `featured.ts`)

**Files:**
- Modify (test-first): `apps/landing/src/lib/format.test.ts`, `booking.test.ts`, `booking-read.test.ts`, `featured.test.ts`
- Modify: `apps/landing/src/lib/format.ts`, `booking.ts`, `booking-read.ts`, `featured.ts`

**Interfaces:**
- Consumes: Task 2's nullable types (`ServicePackageRead['priceCents']` etc.).
- Produces (what Task 4 consumes): `peso(cents: number | null): string | null`; `labeledPrice(name: string, cents: number | null): string`; `priceSuffix(cents: number | null): string`; `bookAriaLabel(name: string, cents: number | null): string` — all from `../lib/format`; `offeringPriceCents(...): number | null`, `addonTotalCents(...): number | null`, `totalCents(...): number | null` and the wizard's derived `offeringPriceCents`/`totalCents` fields (the `BookingWizard` type widens automatically); `confirmationTotalCents(record): number | null`; the unpriced-first `byPrice` inside `selectFeaturedPackages` (no signature change).

**Not here:** any component/route JSX (Task 4); the wizard's state machine (steps/CTA behavior unchanged — only the money fns' null-honesty); `buildCreatePayload` (the client never sent prices); `phDateTime` (untouched).

- [ ] **Step 1: Write the failing tests**

(a) `apps/landing/src/lib/format.test.ts` — extend the import (line 3 area) to bring in the new helpers, then append at file end:

```ts
import { bookAriaLabel, labeledPrice, peso, phDateTime, priceSuffix } from './format';

describe('the unpriced money laws (ADR-0020)', () => {
  it('peso(null) is null — JSX renders nothing, the no-price law enforced at the formatter', () => {
    expect(peso(null)).toBeNull();
  });

  it('labeledPrice keeps the name alone when unpriced; joins when priced (owner ruling: name-only line)', () => {
    expect(labeledPrice('Makeup', null)).toBe('Makeup');
    expect(labeledPrice('Makeup', 12000)).toBe('Makeup · ₱120.00');
  });

  it('priceSuffix is empty when unpriced — the footer CTAs drop the suffix with no dangling separator', () => {
    expect(priceSuffix(null)).toBe('');
    expect(priceSuffix(108000)).toBe(' · ₱1,080.00');
  });

  it('bookAriaLabel drops the price parenthetical when unpriced — the ₱0 aria leak-fix', () => {
    expect(bookAriaLabel('Portraits & ID Photo', null)).toBe('Book Portraits & ID Photo');
    expect(bookAriaLabel('Portraits & ID Photo', 50000)).toBe('Book Portraits & ID Photo (₱500)');
  });
});
```

(The import line above REPLACES the file's existing `import { peso, phDateTime } from './format';` — one import line, not two.)

(b) `apps/landing/src/lib/booking.test.ts` — append at file end (fixtures `pkg`/`addon`/`service`/`branch` are the file's own; unpriced rows are spreads with a null override):

```ts
describe('unpriced totals (ADR-0020)', () => {
  const UNPRICED_PKG_ID = '00000000-0000-4000-8000-0000000000a1';
  const PRICED_PKG_ID = '00000000-0000-4000-8000-0000000000a2';
  const UNPRICED_ADDON_ID = '00000000-0000-4000-8000-0000000000a3';
  const PRICED_ADDON_ID = '00000000-0000-4000-8000-0000000000a4';
  const unpricedCatalog: BookingCatalog = {
    branches: [branch('00000000-0000-4000-8000-0000000000a5')],
    packages: [
      { ...pkg(UNPRICED_PKG_ID, 0), priceCents: null },
      pkg(PRICED_PKG_ID, 90000),
    ],
    services: [],
    addons: [
      { ...addon(UNPRICED_ADDON_ID, 0), priceCents: null },
      addon(PRICED_ADDON_ID, 12000),
    ],
  };

  it('an unpriced offering nulls offeringPriceCents and totalCents — never a ₱0 stand-in', () => {
    const offering = { kind: 'package' as const, id: UNPRICED_PKG_ID };
    expect(offeringPriceCents(offering, unpricedCatalog)).toBeNull();
    expect(totalCents(offering, [PRICED_ADDON_ID], unpricedCatalog)).toBeNull();
  });

  it('a SELECTED unpriced add-on nulls the total; an unselected one does not; a found-priced booking still totals', () => {
    const offering = { kind: 'package' as const, id: PRICED_PKG_ID };
    expect(totalCents(offering, [UNPRICED_ADDON_ID], unpricedCatalog)).toBeNull();
    expect(totalCents(offering, [PRICED_ADDON_ID], unpricedCatalog)).toBe(102000);
    expect(totalCents(offering, [], unpricedCatalog)).toBe(90000);
  });
});
```

(`BookingCatalog` joins the type import at the top of the file — it is already exported from `./booking`; add it to the existing `import type { ... }` block or import it in a second `import type { BookingCatalog } from './booking';` line, whichever biome's fix settles on.)

(c) `apps/landing/src/lib/booking-read.test.ts` — append at file end (the `record()` helper is the file's own):

```ts
describe('unpriced confirmations (ADR-0020)', () => {
  it('a null bookedPriceCents nulls the total — omitted, never ₱0', () => {
    expect(confirmationTotalCents(record({ bookedPriceCents: null }))).toBeNull();
  });

  it('an unpriced add-on entry nulls the total while the record is otherwise priced', () => {
    expect(
      confirmationTotalCents(
        record({
          addonServices: [
            { addonServiceId: '55555555-5555-4555-8555-555555555555', name: 'Makeup', priceCents: null },
          ],
        })
      )
    ).toBeNull();
  });
});
```

(d) `apps/landing/src/lib/featured.test.ts` — append at file end:

```ts
it('unpriced packages lead the strip, priced ascend after (owner ruling 2026-10-12)', () => {
  const unpricedZ = pkg({ name: 'Zephyr Wedding', priceCents: null, isFeatured: true });
  const unpricedA = pkg({ name: 'Atelier Prenup', priceCents: null, isFeatured: true });
  const priced = pkg({ ...B, isFeatured: true });
  const cheaper = pkg({ ...BASIC, isFeatured: true });
  const { packages } = selectFeaturedPackages([priced, unpricedZ, cheaper, unpricedA]);
  expect(packages.map((p) => p.name)).toEqual([
    'Atelier Prenup',
    'Zephyr Wedding',
    'Basic Package',
    'Package B',
  ]);
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/landing test -- --run src/lib` — the new its fail (peso rejects null at the type level — `format.test.ts` fails typecheck under vitest's esbuild only as a runtime mismatch, and the totals/featured tests fail on the `?? 0`/comparator behavior). Record the red.

- [ ] **Step 3: Write `apps/landing/src/lib/format.ts` (full file)**

```ts
// Money + schedule display for the landing site — promoted verbatim from the
// prototype (wayfinder #33, spec residual). Cent-denominated ints in, peso
// string out; ISO instants in, Philippine-wall-clock strings out.
// ADR-0020: null is the unpriced state. peso() returns null for it and JSX
// renders nothing — the no-price law ("nothing renders where a price would
// be") enforced at the formatter. The three join helpers below keep
// string-embedded sites honest too: no dangling separators, no ₱0 stand-ins.

export function peso(cents: number | null): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}

/** `Makeup · ₱120.00` priced; `Makeup` alone unpriced — the line stays, only the price slot renders nothing (owner ruling 2026-10-12). */
export function labeledPrice(name: string, cents: number | null): string {
  return cents === null ? name : `${name} · ${peso(cents)}`;
}

/** `` ` · ₱1,080.00` `` priced; empty unpriced — footer CTAs drop the suffix whole (owner ruling 2026-10-12). */
export function priceSuffix(cents: number | null): string {
  return cents === null ? '' : ` · ${peso(cents)}`;
}

/** `Book Portraits (₱500)` priced; `Book Portraits` unpriced — null/100 is 0 in JS, so the old inline arithmetic would have announced ₱0. */
export function bookAriaLabel(name: string, cents: number | null): string {
  return cents === null ? `Book ${name}` : `Book ${name} (₱${(cents / 100).toFixed(0)})`;
}

export function phDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
```

- [ ] **Step 4: The three money fns + the comparator**

(a) `apps/landing/src/lib/booking.ts` — replace `offeringPriceCents` (lines 127–133), `addonTotalCents` (135–140), and `totalCents` (142–148) with:

```ts
export function offeringPriceCents(offering: Offering, catalog: BookingCatalog): number | null {
  if (!offering) return 0;
  const row =
    offering.kind === 'package'
      ? catalog.packages.find((p) => p.id === offering.id)
      : catalog.services.find((s) => s.id === offering.id);
  // Not-found keeps today's 0 (a vanished row mid-flow is not "unpriced");
  // a FOUND row's null IS the unpriced state (ADR-0020) and flows through.
  return row ? row.priceCents : 0;
}

export function addonTotalCents(addonIds: string[], catalog: BookingCatalog): number | null {
  let sum = 0;
  for (const id of addonIds) {
    const row = catalog.addons.find((a) => a.id === id);
    if (row && row.priceCents === null) return null; // an unpriced component omits the Total
    sum += row?.priceCents ?? 0; // not-found contributes 0 (today's semantics)
  }
  return sum;
}

export function totalCents(
  offering: Offering,
  addonIds: string[],
  catalog: BookingCatalog
): number | null {
  const offeringPrice = offeringPriceCents(offering, catalog);
  const addons = addonTotalCents(addonIds, catalog);
  if (offeringPrice === null || addons === null) return null;
  return offeringPrice + addons;
}
```

and update the file's header comment (lines 1–9): the sentence `and packagePriceCents (renamed bookedPriceCents in ticket 02; nothing here reads a snapshot — the pre-submit rail keeps LIVE prices, spec ruling)` gains `; the totals are null-honest since ADR-0020 — an unpriced offering or selected add-on nulls the Total (never a ₱0 stand-in)`.

(b) `apps/landing/src/lib/booking-read.ts` — replace `confirmationTotalCents` (lines 16–19) with:

```ts
/**
 * Total due, from the record only: offering snapshot + add-on entry
 * snapshots. Null (ADR-0020) when ANY snapshot is unpriced — the Total is
 * omitted entirely; priced add-on entries keep their per-item lines
 * elsewhere. Never a ₱0 stand-in.
 */
export function confirmationTotalCents(record: AppointmentWithAddons): number | null {
  if (record.bookedPriceCents === null) return null;
  if (record.addonServices.some((a) => a.priceCents === null)) return null;
  return record.bookedPriceCents + record.addonServices.reduce((sum, a) => sum + a.priceCents, 0);
}
```

(TS does not narrow array elements through `.some`, but the guard has already returned — write the reduce exactly as above and it typechecks: `a.priceCents` is `number | null` only where the arithmetic can't see null… if the compiler still objects, `sum + (a.priceCents ?? 0)` with a comment `// guarded above` is the sanctioned form — the `?? 0` there is a type-level no-op, not a sentinel.)

(c) `apps/landing/src/lib/featured.ts` — replace the comparator (lines 13–14) with:

```ts
  // ADR-0020 + owner ruling 2026-10-12: unpriced packages LEAD the strip
  // (name-ordered within the group), priced follow ascending (name
  // tiebreak) — inquiry-priced reads as the headliner, not the tail.
  const byPrice = (a: ServicePackageRead, b: ServicePackageRead) => {
    if (a.priceCents === null && b.priceCents === null) return a.name.localeCompare(b.name);
    if (a.priceCents === null) return -1;
    if (b.priceCents === null) return 1;
    return a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  };
```

- [ ] **Step 5: Green + gates + commit**

`pnpm --filter @sevendays/landing test -- --run src/lib` — **83 tests green** (74 + 9). Then `pnpm --filter @sevendays/landing fix`, re-run the suite. The lib seam is this task's gate and it is green. `pnpm --filter @sevendays/landing typecheck` still FAILS on the components (the `peso(...)` JSX slots + the aria-label arithmetic now see `string | null` / `number | null`) — that red is the sanctioned intermediate state (Global Constraints: the wire widened in Task 2 before the consumers adapt) and Task 4's input. This task's commit stages the eight lib files ONLY, so the branch tip differs from main by exactly the seam; proceed straight into Task 4, whose commit closes the red window.

```bash
git add apps/landing/src/lib/format.ts apps/landing/src/lib/format.test.ts apps/landing/src/lib/booking.ts apps/landing/src/lib/booking.test.ts apps/landing/src/lib/booking-read.ts apps/landing/src/lib/booking-read.test.ts apps/landing/src/lib/featured.ts apps/landing/src/lib/featured.test.ts
git commit -m "feat(landing): the null-safe money seam - peso/labeledPrice/priceSuffix, nullable totals, unpriced-first featured sort (#212)"
```

### Task 4: `apps/landing` — the no-price law at the render sites

**Skill set:** `prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — loaded at execution time (AGENTS.md rule). **No owner-reacted rendered-variants round** (#94 amendment ruling): every edit below is a removal or a join inside compositions the owner already ratified — no new composition is created, and "nothing renders" has no variant to react to. The owner's ratification surface for this ticket is the four 2026-10-12 rulings this plan already carries.

**Files:**
- Modify: `apps/landing/src/components/home-cards.tsx`, `apps/landing/src/routes/book.tsx`, `apps/landing/src/components/booking/summary-rail.tsx`, `apps/landing/src/components/booking/confirmation-card.tsx`
- Verified no-edit (the formatter already enforces the law — do NOT add conditionals here): `package-card.tsx`, `service-card.tsx`, `service-teaser-item.tsx`, and `book.tsx`'s choice cards + `home-cards.tsx`'s two `<p>{peso(...)}</p>` slots — `{peso(x)}` with `x === null` renders nothing (an empty `<p>` has no line box; React renders null as nothing)

**Interfaces:**
- Consumes: Task 3's `labeledPrice`, `priceSuffix`, `bookAriaLabel` from `../lib/format` / `../../lib/format`, and the wizard's now-`number | null` `totalCents`.

**Not here:** any CTA behavior change (the Book/Continue/Confirm buttons keep their behavior — only the price suffix drops when the Total is omitted); the `Continue without add-ons` secondary link (carries no price today); e2e/CDP harness updates (none exist for prices; the lib seam carries the coverage); the packages expanded row (#219).

- [ ] **Step 1: `home-cards.tsx` — kill the aria-label leak**

Line 15's import gains `bookAriaLabel` (keep `peso` — the two `<p>` price slots stay): `import { bookAriaLabel, peso } from '../lib/format';`. Line 88, replace:

```tsx
      aria-label={`Book ${service.name} (₱${(service.priceCents / 100).toFixed(0)})`}
```

with:

```tsx
      aria-label={bookAriaLabel(service.name, service.priceCents)}
```

(Without this, `null / 100 === 0` in JS — screen readers would announce a `₱0` that is neither the row's price nor the omission law.)

- [ ] **Step 2: `book.tsx` — the two footer CTAs drop the suffix when the Total is omitted**

Line 24's import: `import { peso } from '../lib/format';` → `import { peso, priceSuffix } from '../lib/format';` (`peso` stays — the choice cards keep it). Line 233, replace `Continue · {peso(wizard.totalCents)}` with:

```tsx
                  Continue{priceSuffix(wizard.totalCents)}
```

Line 365, replace `{wizard.submitting ? 'Booking…' : `Confirm booking · ${peso(wizard.totalCents)}`}` with:

```tsx
                {wizard.submitting ? 'Booking…' : `Confirm booking${priceSuffix(wizard.totalCents)}`}
```

- [ ] **Step 3: `summary-rail.tsx` — name-only add-on lines, the Total row conditional**

Line 2's import: `import { peso, phDateTime } from '../../lib/format';` → `import { labeledPrice, peso, phDateTime } from '../../lib/format';`. Lines 20–27, the add-on map's `<dd>` becomes:

```tsx
            <dd className='text-right'>{labeledPrice(a.name, a.priceCents)}</dd>
```

Lines 34–37, the Total row renders only when a Total exists:

```tsx
        {wizard.totalCents !== null && (
          <div className='flex justify-between gap-3 border-t pt-2 font-semibold'>
            <dt>Total</dt>
            <dd>{peso(wizard.totalCents)}</dd>
          </div>
        )}
```

- [ ] **Step 4: `confirmation-card.tsx` — the same pair over record snapshots**

Line 3's import: `import { peso, phDateTime } from '../../lib/format';` → `import { labeledPrice, peso, phDateTime } from '../../lib/format';`. Compute the total once at the component top (after the props destructure):

```tsx
  const total = confirmationTotalCents(record);
```

The add-on map's `<dd>` (line 39) becomes:

```tsx
            <dd>{labeledPrice(a.name, a.priceCents)}</dd>
```

Lines 47–50, the Total row:

```tsx
        {total !== null && (
          <div className='flex justify-between gap-4 border-t pt-2 font-semibold'>
            <dt>Total</dt>
            <dd>{peso(total)}</dd>
          </div>
        )}
```

- [ ] **Step 5: Gates + commit**

`pnpm --filter @sevendays/landing typecheck` — **green for the first time since Task 2** (this task closes the landing red window). Then `pnpm --filter @sevendays/landing fix`, `pnpm --filter @sevendays/landing test` (**9 files / 83 tests** — no change; components carry no unit tests by house pattern), and `pnpm --filter @sevendays/landing lint`. Commit:

```bash
git add apps/landing/src/components/home-cards.tsx apps/landing/src/components/booking/summary-rail.tsx apps/landing/src/components/booking/confirmation-card.tsx apps/landing/src/routes/book.tsx
git commit -m "feat(landing): the no-price law at every render site - nothing where a price would be (#212)"
```

### Task 5: `apps/admin` — the `hasPrice` seam (TDD) + the Priced checkbox on all three editors + null-safe `peso`

**Skill set:** `prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — loaded at execution time (AGENTS.md rule). **No owner-reacted rendered-variants round** (ruling as Task 4): the checkbox joins three already-ratified editor compositions using the editors' own established Checkbox pattern (the Featured/Active pair); no new composition exists to vary. The copy pins are in Global Constraints, owner-ratifiable in the issue at close.

**Files:**
- Modify (test-first): `apps/admin/src/lib/light-entity-state.test.ts`, `package-editor-state.test.ts`
- Modify: `apps/admin/src/lib/light-entity-state.ts`, `package-editor-state.ts`
- Modify: `apps/admin/src/components/cms/shared.tsx`, `packages/package-editor.tsx`, `addons/addons-screen.tsx`, `studio-services/studio-services-screen.tsx` (the last three relative to `apps/admin/src/components/`)

**Interfaces:**
- Consumes: Task 2's nullable `StudioService['priceCents']` / `AddonService['priceCents']` / `ServicePackageRead['priceCents']` and nullable update-input types.
- Produces (what the editors consume): `StudioServiceEditorState` + `AddonEditorState` + `PackageEditorState` each gain `hasPrice: boolean`; their `priceCents: number` entry field adopts the package editor's `NaN`-encodes-empty convention (all three `fromRead` map `priceCents ?? Number.NaN`; all three `new*State()` open `hasPrice: false`); the payload builders emit `priceCents: state.hasPrice ? state.priceCents : null`; the validators gate every price rule on `hasPrice`; the flip payload builders are UNCHANGED code (`row.priceCents` — the nullable wire flows); `cms/shared.tsx`'s `peso(cents: number | null): string | null` (table cells render nothing on null).

**Not here:** the async-Save/pending vocabulary (#218 — the checkbox rides the existing save flow); the packages expanded row (#219); the All/Active/Deactivated segment (#218); any matrix/cover logic (untouched); the table cells' JSX (null-safe `peso` covers `packages-table.tsx:254,296`, `addons-screen.tsx:587,638`, `studio-services-screen.tsx:560,611` with zero edits).

- [ ] **Step 1: Write the failing seam tests**

(a) `apps/admin/src/lib/light-entity-state.test.ts` — append at file end (fixtures `service` + `addon` are the file's module-level schema-parsed rows):

```ts
describe('unpriced editors (ADR-0020)', () => {
  it('studio-service: an unpriced read opens unchecked with an empty entry; the payload saves null', () => {
    const state = light.studioServiceStateFromRead({ ...service, priceCents: null });
    expect(state.hasPrice).toBe(false);
    expect(Number.isNaN(state.priceCents)).toBe(true);
    expect(light.buildStudioServicePayload(state).priceCents).toBeNull();
  });

  it('studio-service: create defaults unchecked (owner ruling 2026-10-12) — the fresh payload saves null', () => {
    expect(light.newStudioServiceState().hasPrice).toBe(false);
    expect(light.buildStudioServicePayload(light.newStudioServiceState()).priceCents).toBeNull();
  });

  it('studio-service: validation demands entry when checked, skips the price entirely when unchecked', () => {
    const checkedEmpty = light.validateStudioServiceState({
      ...light.newStudioServiceState(),
      name: 'n',
      description: 'd',
      hasPrice: true,
    });
    expect(checkedEmpty.price).toBe('Enter a valid price.');
    expect(light.validateStudioServiceState(light.newStudioServiceState()).price).toBeUndefined();
  });

  it('addon: an unpriced read opens unchecked; create defaults unchecked; both payloads save null', () => {
    const state = light.addonStateFromRead({ ...addon, priceCents: null });
    expect(state.hasPrice).toBe(false);
    expect(light.buildAddonPayload(state).priceCents).toBeNull();
    expect(light.newAddonState().hasPrice).toBe(false);
    expect(light.buildAddonPayload(light.newAddonState()).priceCents).toBeNull();
  });

  it('addon: validation demands entry when checked, skips the price when unchecked', () => {
    const checkedEmpty = light.validateAddonState({
      ...light.newAddonState(),
      name: 'n',
      description: 'd',
      hasPrice: true,
    });
    expect(checkedEmpty.price).toBe('Enter a valid price.');
    expect(light.validateAddonState(light.newAddonState()).price).toBeUndefined();
  });

  it('the table flip payloads carry row.priceCents verbatim — null stays null, never a 0', () => {
    expect(
      light.buildStudioServiceFlipPayload({ ...service, priceCents: null }, false).priceCents
    ).toBeNull();
    expect(light.buildAddonFlipPayload({ ...addon, priceCents: null }, false).priceCents).toBeNull();
  });
});
```

(b) `apps/admin/src/lib/package-editor-state.test.ts` — append at file end (the `read()` fixture helper is the file's own):

```ts
describe('unpriced packages (ADR-2020)', () => {
  it('an unpriced read opens unchecked with an empty entry; the update payload saves null', () => {
    const state = editorStateFromRead({ ...read(), priceCents: null });
    expect(state.hasPrice).toBe(false);
    expect(Number.isNaN(state.priceCents)).toBe(true);
    expect(buildUpdatePayload(state, []).priceCents).toBeNull();
  });

  it('create defaults unchecked (owner ruling 2026-10-12) — the fresh payload saves null', () => {
    expect(newEditorState().hasPrice).toBe(false);
    expect(buildCreatePayload(newEditorState(), []).priceCents).toBeNull();
  });

  it('re-checking requires re-entry: checked + no entry flags the price slot', () => {
    const errors = validateEditorState({
      ...newEditorState(),
      name: 'n',
      description: 'd',
      hasPrice: true,
    });
    expect(errors.price).toBe('Enter a price of zero or more.');
  });

  it('unchecked skips the price rules entirely — an empty entry is a valid unpriced save', () => {
    const errors = validateEditorState({ ...newEditorState(), name: 'n', description: 'd' });
    expect(errors.price).toBeUndefined();
  });

  it('the table flip payload carries row.priceCents verbatim — null stays null', () => {
    expect(buildRowFlipPayload({ ...read(), priceCents: null }, false).priceCents).toBeNull();
  });
});
```

(If any of `editorStateFromRead`/`buildUpdatePayload`/`buildCreatePayload`/`buildRowFlipPayload` are not already imported at the file top, add them to the existing import block — the existing tests use them all.)

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/light-entity-state.test.ts src/lib/package-editor-state.test.ts` — the eleven new its fail on the missing `hasPrice` / null-payload behavior. Record the red.

- [ ] **Step 3: `apps/admin/src/lib/light-entity-state.ts` — the two light entities**

(a) `StudioServiceEditorState` (lines 46–52) — insert `hasPrice` above `priceCents` and re-doc the entry:

```ts
export interface StudioServiceEditorState {
  name: string;
  description: string;
  /** ADR-0020: false = unpriced — the payload saves null and the entry is discarded. */
  hasPrice: boolean;
  /** NaN = nothing entered (the re-entry encoding — meaningful only when hasPrice). */
  priceCents: number;
  isActive: boolean;
  branchIds: string[];
}
```

(b) `AddonEditorState` (lines 61–67) — the same two-field change (`hasPrice` above `priceCents`, same docs).

(c) `studioServiceStateFromRead` — the return's price lines become:

```ts
    hasPrice: row.priceCents !== null,
    priceCents: row.priceCents ?? Number.NaN,
```

(d) `newStudioServiceState` — the price line becomes:

```ts
    // Owner ruling 2026-10-12: create defaults unchecked — pricing is an
    // explicit act; the fresh payload saves null.
    hasPrice: false,
    priceCents: Number.NaN,
```

(e) `buildStudioServicePayload` — `priceCents: state.priceCents,` becomes:

```ts
    priceCents: state.hasPrice ? state.priceCents : null,
```

(f) `validateStudioServiceState` — the price guard (lines 355–357) becomes:

```ts
  if (state.hasPrice && (!Number.isInteger(state.priceCents) || state.priceCents < 0)) {
    errors.price = 'Enter a valid price.';
  }
```

(g) `addonStateFromRead`, `newAddonState`, `buildAddonPayload`, `validateAddonState` — the identical four edits (c)–(f) for the add-on.

(h) The flip payload builders (`buildStudioServiceFlipPayload`, `buildAddonFlipPayload`) are UNCHANGED code — `priceCents: row.priceCents` now carries `number | null` through the widened input type. Verify by reading, edit nothing.

- [ ] **Step 4: `apps/admin/src/lib/package-editor-state.ts` — the package editor's seam**

(a) `PackageEditorState` (lines 47–59) — the `priceCents` doc bullet (line 41–42) and the interface gain the field:

```ts
 * - `priceCents` is the mapped centavos number (input × 100 at the
 *   component); `NaN` encodes an unparseable OR absent entry — absent when
 *   `hasPrice` is false (ADR-0020: unchecked saves null) and after either
 *   checkbox flip (the re-entry contract).
```

and inside the interface, above `priceCents: number;`:

```ts
  /** ADR-0020: false = unpriced — the payload saves null and the entry is discarded. */
  hasPrice: boolean;
```

(b) `editorStateFromRead` (line 124–146) — the price lines become:

```ts
    hasPrice: read.priceCents !== null,
    priceCents: read.priceCents ?? Number.NaN,
```

(c) `newEditorState` (lines 152–166) — the doc gains `Create defaults unchecked (owner ruling 2026-10-12): pricing is an explicit act.` and the price line becomes `hasPrice: false,` + `priceCents: Number.NaN,`.

(d) `basePayloadFields` (line 195) — `priceCents: state.priceCents,` becomes:

```ts
    priceCents: state.hasPrice ? state.priceCents : null,
```

(e) `buildRowFlipPayload` — UNCHANGED code (`priceCents: row.priceCents` — nullable flows; verify by reading).

(f) `validateEditorState` (lines 292–296) — the price block gains the gate:

```ts
  if (state.hasPrice) {
    if (!Number.isFinite(state.priceCents) || state.priceCents < 0) {
      errors.price = 'Enter a price of zero or more.';
    } else if (!Number.isInteger(state.priceCents)) {
      errors.price = 'Enter whole centavos.';
    }
  }
```

- [ ] **Step 5: Reconcile the two suites' existing priced literals**

`light-entity-state.test.ts` breaks nowhere (its assertions are per-field or payload-shaped — verified by grep 2026-10-12). `package-editor-state.test.ts` breaks at every `{ ...newEditorState(), … priceCents: <number> }` spread (the fresh default is now unchecked, so those payloads would emit null): add `hasPrice: true,` beside the numeric priceCents at the four known sites — the create-payload state (~line 128), the update-payload state (~line 251), and the two validation states (~line 273 `priceCents: -1`, ~line 328 `priceCents: 19950.5`) — and at any further site the typecheck or a failing payload assertion enumerates (fix at the source site, never by loosening the assertion).

- [ ] **Step 6: Green the seams, then the UI**

`pnpm --filter @sevendays/admin test -- --run src/lib/light-entity-state.test.ts src/lib/package-editor-state.test.ts` — **184 tests** green across the admin suite's lib files (173 + 11). Then the UI:

(a) `apps/admin/src/components/cms/shared.tsx` (line 44) — replace:

```ts
/** Peso format pinned to the landing precedent (test-pinned there as ₱1,100.00). */
export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
```

with:

```ts
/** Peso format pinned to the landing precedent (test-pinned there as ₱1,100.00). Null (unpriced, ADR-0020) renders nothing. */
export function peso(cents: number | null): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
```

(b) `apps/admin/src/components/packages/package-editor.tsx` — three edits. First, mint the id beside the others (line 301 area): `const hasPriceId = useId();`. Second, inside the Price `Field`, directly under `<FieldLabel htmlFor={priceId}>Price</FieldLabel>`, insert:

```tsx
                <label htmlFor={hasPriceId} className='flex items-center gap-2 text-sm font-medium'>
                  <Checkbox
                    id={hasPriceId}
                    checked={state.hasPrice}
                    onCheckedChange={(checked) => {
                      updateField('hasPrice', checked === true);
                      // Either flip discards the entry — ADR-0020's
                      // re-entry contract (re-check starts empty).
                      updateField('priceCents', Number.NaN);
                    }}
                  />
                  Priced
                </label>
```

Third, wrap the `₱` input's `<div className='relative'>…</div>` in `{state.hasPrice && ( … )}`, map the empty entry to NaN (the existing onChange maps `''` to 0 — replace `onChange={(e) => updateField('priceCents', Math.round(Number(e.target.value) * 100))}` with):

```tsx
                    onChange={(e) =>
                      updateField(
                        'priceCents',
                        e.target.value === ''
                          ? Number.NaN
                          : Math.round(Number(e.target.value) * 100)
                      )
                    }
```

and swap the helper line to `{state.hasPrice ? PESO_HELPER : 'No price — bookable on inquiry.'}`. The existing `value={Number.isNaN(state.priceCents) ? '' : state.priceCents / 100}` already renders the NaN entry as empty — unchanged.

(c) `apps/admin/src/components/addons/addons-screen.tsx` — inside the price `Field`, above the `₱` input's `<div className='relative'>`: the same wrapping-`<label>` checkbox (no id needed — the label wraps), bound to `editorState.hasPrice` with:

```tsx
                <label className='flex items-center gap-2 text-sm font-medium'>
                  <Checkbox
                    checked={editorState.hasPrice}
                    onCheckedChange={(checked) =>
                      setEditorState({
                        ...editorState,
                        // Either flip discards the entry — ADR-0020's
                        // re-entry contract.
                        hasPrice: checked === true,
                        priceCents: Number.NaN,
                      })
                    }
                  />
                  Priced
                </label>
```

then wrap the input's `<div className='relative'>…</div>` in `{editorState.hasPrice && ( … )}`, replace the value/onChange pair (lines 719–727) with:

```tsx
                value={Number.isNaN(editorState.priceCents) ? '' : editorState.priceCents / 100}
                onChange={(e) =>
                  setEditorState({
                    ...editorState,
                    // '' maps to NaN (nothing entered) — never a silent 0.
                    priceCents:
                      e.target.value === ''
                        ? Number.NaN
                        : Math.round(Number(e.target.value) * 100),
                  })
                }
```

(the old `|| 0` coercion dies), and swap the helper `<FieldDescription>Stored as centavos.</FieldDescription>` to `{editorState.hasPrice ? 'Stored as centavos.' : 'No price — bookable on inquiry.'}`.

(d) `apps/admin/src/components/studio-services/studio-services-screen.tsx` — the identical three edits as (c) at its price Field (lines ~686–701).

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/admin fix`, then `pnpm --filter @sevendays/admin test` (**17 files / 184 tests**), then `pnpm --filter @sevendays/admin typecheck`, then the FIRST full-repo gate since Task 1: `pnpm check` — **35/35 turbo tasks green** (the landing red window closed at Task 4; the admin window closes here; api needs the compose db up per the port recipe). Commit:

```bash
git add apps/admin/src/lib/light-entity-state.ts apps/admin/src/lib/light-entity-state.test.ts apps/admin/src/lib/package-editor-state.ts apps/admin/src/lib/package-editor-state.test.ts apps/admin/src/components/cms/shared.tsx apps/admin/src/components/packages/package-editor.tsx apps/admin/src/components/addons/addons-screen.tsx apps/admin/src/components/studio-services/studio-services-screen.tsx
git commit -m "feat(admin): the Priced checkbox on all three editors - unchecked saves null, re-check requires re-entry (#212)"
```

### Task 6: Gates + docs rotation + PR/merge + the v1 pick + ledger + issue close

**Files:**
- Modify: `docs/plan.md` (two M7 boxes TICKED), `docs/progress.md`, `AGENTS.md`, `apps/landing/CONTEXT.md`
- Generate: `graphify-out/` refresh (`graphify update .`)
- Post-merge: `docs/agents/v1-picks.md` (the ledger row), GitHub PR + issue #212

**Not here:** the M7 "Verify:" roadmap box (milestone-level exit verification — #225); any other M7 ticket's surface; the M5 spec's prose (nothing price-related there); `docs/adr/0020` (landed with the spec — never edited by execution).

- [ ] **Step 1: The full-repo gate + graph refresh**

With the compose db up: `pnpm check` — **35/35 turbo tasks** green, floors exactly **types 14 files / 129 tests · api 27+1 skipped files (28) / 350 passed + 3 skipped · api-client 5 / 33 · landing 9 / 83 · admin 17 / 184 · db 4 files (counts unchanged)**. Then `pnpm build` (the full build, 7/7 per the ledger's lock vocabulary). Then `graphify update .` and stage the refreshed `graphify-out/` with the docs commit (dirty graphify files from hooks are expected — include them).

- [ ] **Step 2: `docs/plan.md` — tick the two M7 unpriced boxes**

(a) The `- [ ] Schema + wire — unpriced catalogs (ADR-0020, #163): …` box becomes `- [✅]` and its line gains, after the closing paren of the box text: `_(2026-10-XX, #212: migration 0009 — the five nullable columns (3 catalog + 2 snapshot; the ticket's "four snapshot columns" reconciled against the schema); `priceCents: number | null` end to end; the Priced checkbox per the ruled contract — create defaults unchecked per the owner's 2026-10-12 ruling)_`.

(b) The `- [ ] Landing + booking renders — the no-price law (#163): …` box becomes `- [✅]` and gains: `_(2026-10-XX, #212: `peso()` null-safe across the sites, the aria-label ₱0 leak fixed, the booking Total omitted whenever any component is unpriced — name-only unpriced add-on lines, suffix-less footer CTAs, and the unpriced-first featured sort, all per the owner's 2026-10-12 rulings; the redesign tickets #222/#223 re-verify the law on the new surfaces)_`.

(Fill XX with the merge date; `- [✅]` never `[x]`.)

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md` + the landing glossary term**

(a) `docs/progress.md` — insert at the top of the dated entries (above the #192 entry), in the file's established voice:

```text
2026-10-XX — #212, M7 ticket 01, unpriced catalogs live end to end (ADR-0020): the five price columns — three catalog (`service_packages`/`studio_services`/`addon_services`) + two snapshot (`appointments.booked_price_cents`, `appointment_addon_services.price_cents`; the ticket's "four snapshot columns" reconciled to the schema's two, and its "print size" to the studio service per ADR-0020's three priced entities) — nullable via metadata-only migration 0009, applied live with an information_schema probe proving all five nullable. The wire is `priceCents: number | null` through types + api with null snapshots at intake on both offering paths and priced-snapshot retention pinned (ADR-0013's invariant reads amended: every appointment carries its quoted price WHEN the booked item had one). The landing money seam is null-honest — `peso()` null-safe, `labeledPrice`/`priceSuffix`/`bookAriaLabel` helpers, nullable wizard totals, the unpriced-first featured sort — and the no-price law holds at every render site incl. the home aria-label ₱0 leak-fix; the booking Total omits whenever any component is unpriced (name-only unpriced add-on lines, suffix-less CTAs). The admin carries the Priced checkbox on all three priced editors: unchecked saves null, either flip discards the entry so re-checking requires re-entry, create defaults unchecked (the owner's four 2026-10-12 rulings). Floors: types 14/129, api 28 files/350+3 skipped, landing 9/83, admin 17/184; plan.md's two M7 unpriced boxes ticked. The booking-path renders (summary/confirmation Totals) are MAIN-ONLY per the spec's v1-pick class; the catalog side picks clean.
```

(b) `AGENTS.md` — three edits. In **Current status of `pnpm test`**: the api floor `340 passed + 3 skipped` → `350 passed + 3 skipped (the #207/#208 pins + #212's ten unpriced pins)`; the admin floor `admin floor 17 files / 173 tests` → `admin floor 17 files / 184 tests (the #212 unpriced-editor seam pins)`. In **Engineering Rules** (the DB bullet): `migrations 0000–0007 applied` → `migrations 0000–0009 applied`, and the write-model sentence pair gains after "…every uniqueness collision a 400 with field details.": ` The catalog's price columns are nullable since #212 (ADR-0020): unpriced items (`priceCents: null`) are fully bookable with null booking snapshots, the landing renders nothing where a price would be (the booking Total omits when any component is unpriced), and the CMS editors carry the Priced checkbox (unchecked saves null; re-check requires re-entry).`

(c) `apps/landing/CONTEXT.md` — the glossary term this ticket resolves (per the M7 spec's glossary ruling; admin/api landed theirs with the spec) — append at the Language list's end:

```text
**Unpriced**:
A catalog item whose price is deliberately unset (null) — it stays fully bookable, and nothing renders where its price would be: no placeholder, no inquire line, no CTA change. A booking with any Unpriced part shows no total. Set from the CMS by unchecking Priced.
_Avoid_: free (that is a ₱0 price), inquire-only
```

- [ ] **Step 4: Commit, PR, squash-merge**

```bash
git add docs/plan.md docs/progress.md AGENTS.md apps/landing/CONTEXT.md graphify-out
git commit -m "docs: #212 close-out - the two M7 unpriced boxes ticked, floors + progress rotated, the Unpriced glossary term lands (#212)"
git push -u origin feat/212-unpriced-catalogs
```

Then `gh pr create` (title `feat: unpriced catalogs — nullable prices end to end, ADR-0020 (#212)`, body: the Goal paragraph + the four owner rulings + the evidence-dir pointer + the floors), and squash-merge into `main` with the same title. Pull main. **Never stage `apps/admin/package.json`** (the owner's uncommitted port change rides above the branch).

- [ ] **Step 5: The v1 pick (the runbook governs; the class is pre-ruled)**

Follow `docs/agents/v1-picks.md` end to end (classifier → cherry-pick → locks → push → CI/deploy → ledger). The spec's class ledger pre-rules this payload: **catalog-side PICK clean — booking-path MAIN-ONLY**. Pre-rulled file classes for the classifier: PICK — everything in `packages/db`, `packages/types` (all five schema files + tests — the appointment schemas included: the columns exist on the shared schema and v1's api reads them not at all, which is the class's point), `apps/api/test/{admin-packages,admin-studio-services,admin-entities}.test.ts`, all admin files (editors + seams + shared peso + both lib tests — the CMS is both-editions), and the landing catalog side (`format.ts` + test, `featured.ts` + test, `package-card/service-card/service-teaser-item/home-cards`). MAIN-ONLY (v1 carries no booking cluster — the API appointments mount is absent by the seed, the #210 DU precedent): `apps/api/src/services/appointments.ts`, `apps/api/test/appointments.test.ts`, `apps/landing/src/lib/booking.ts` + test, `booking-read.ts` + test, `apps/landing/src/routes/book.tsx`, `apps/landing/src/components/booking/{summary-rail,confirmation-card}.tsx`. `format.ts` picks WHOLE (its helpers are catalog-law; v1's booking absence simply never exercises `priceSuffix`). Reconcile v1's actual floors at the locks (expect landing's v1 suite to grow by the format/featured pins only); the audit's absence-token grep must stay clean. Ledger row + provenance per the runbook's format (rev-parse the sha — never hand-type it, the #208 lesson).

- [ ] **Step 6: Close the issue**

Comment on #212 with: the merge sha, the migration + probe evidence, the four owner rulings as ratified, the floors, the v1 pick sha — then close as completed. The M7 roadmap's two #163 boxes are ticked; the milestone's exit-verification box stays for #225.

---

## Post-plan self-review (already applied)

The plan was self-reviewed at write time per the writing-implementation-plans skill: no stray authoring anchors or unfilled placeholders remain (the only matches for those words are the omission law's own prose); the step-checkbox count is 33 real steps (`grep -c '^- \[ \] \*\*Step'` over this file); every cross-task signature was re-derived from the consuming file's actual imports (`labeledPrice`/`priceSuffix`/`bookAriaLabel` consumed exactly as Task 3 fences them; `hasPrice` consumed exactly as Task 5's editors fence it); the floor arithmetic (129/350+3s/83/184) recounts the new its per task (+8 types, +10 api, +9 landing, +11 admin) against the live 2026-10-12 baselines (121/340+3s/74/173) — if any executor gate count differs, reconcile before proceeding, never by loosening an assertion.

