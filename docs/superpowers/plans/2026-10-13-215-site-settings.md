# M7 Ticket 04 — Site Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Task 6 loads the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule, spec #94 amendment, ruled in #111) **and includes an owner-reacted rendered-variants round**: the Site tab is a NEW composition (a 26-field settings form — no ruled predecessor exists to port), so variants are mandatory per the #94 amendment. Tasks 1–5 carry no UI. **No landing file is touched by this ticket** — both apps' chrome consumption rides the redesign tickets (#223/#224, the spec's sequencing: "the spec sequences consumption with #164's compositions"); this ticket ships the store, the endpoints, the defaults-in-code, and the Site tab only.

**Goal:** The site's words and marks become content, not code (ticket #215, spec § *Settings made real* — the 2026-10-02 Site-tab amendment): a singleton `site_settings` table (migration 0011, **born-empty** — every content column nullable, no row until the first save), a public `GET /api/v1/site-settings` joined to the v1 read chain, and an admin full-object `PUT /api/v1/admin/site-settings` behind the existing `requireSession` root — **the singleton precedent the spec says does not exist yet, created here** (one save like every other editor, no per-field patching). The brand logo uploads through the ADR-0019 presign/commit pipeline under a NEW `'site-logo'` media purpose (`brand/` final-key prefix; `logoImageUrl` resolved at read — raw keys never leave the API at any layer). **Unset fields fall back to today's hardcoded defaults — the defaults live in code** (`packages/types`: `SITE_SETTINGS_DEFAULTS` pinned verbatim from the landing's current literals + the shared `resolveSiteSettings` seam), so the chrome never renders broken and a fresh ship DB renders today's site before any content exists. The all-staff **Site tab** at `/settings` (replacing the stub) edits every field. Brand edits never touch auth/email config.

**Architecture:** Seven tasks: (1) `packages/db` — the `site_settings` table, `db:generate` → migration 0011 (verified to contain exactly one `CREATE TABLE`), `db:migrate` applies it to the live shared DB, a read-only probe proves 28 nullable/default-only columns and zero rows; (2) `packages/types` + `apps/api` media land atomically (the `Record<MediaPurpose, string>` typecheck wall) — the site-settings wire (`siteSettingsSchema` read + `saveSiteSettingsSchema` PUT body + `EMPTY_SITE_SETTINGS` + `SITE_SETTINGS_DEFAULTS` + `resolveSiteSettings`), the `'site-logo'` purpose joining the enum + `FINAL_PREFIXES`, and 15 new types tests + 1 api media pin; (3) `apps/api` — `services/site-settings.ts` (the singleton save: logo commit before the tx, insert-or-update in-tx, the audit row `entity: 'site-settings'` with `create` on first save / `update` after, the old logo object deleted only post-commit), the two routes (public GET + admin PUT, `logAdminMutation` with `entityId: null` per the order-PUT law), the `auditEntitySchema` widening (which atomically carries the one-line `'Site settings'` label into the #188 viewer's map — the `Record<AuditEntity, string>` wall), and 10 new api tests (8 in the new suite + the admin-gate 401 pin + the mutation-log line pin); (4) `packages/api-client` — `client.siteSettings.get()` + `client.admin.siteSettings.update()` wrappers, the mock's GET/PUT subtree, 2 loopback pins; (5) `apps/admin` seam — the `getSiteSettings` public-read server fn, the `saveAdminSiteSettings` session-scoped mutation fn, the query factory, and `lib/site-settings-state.ts` (state ← read, payload build with empty-string→null, the two client-side format validations, details→field-errors) with 6 lib-seam pins; (6) `apps/admin` screen — the owner-reacted variants round (2–3 compositions over the seam), then the ruled composition lands as `components/settings/settings-screen.tsx` (PageHeader + sectioned Cards, the logo block ported from the branch/packages Cover card under `'site-logo'`, one Save mutation with the current toast vocabulary — **no pending vocabulary: #218's system covers this tab later**) and the `_shell.settings.tsx` stub swap; (7) gates + docs rotation (the M7 site-settings box TICKED; the consumption box stays unticked — #223/#224's) + PR/merge + the v1 pick (pre-ruled **PICK clean** by the spec's class ledger — additive CMS + read chain; no booking path anywhere near this ticket) + ledger row + issue close + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes, **one migration** — drizzle-orm 0.45.2 + drizzle-kit (the existing `db:generate`/`db:migrate` scripts over `DATABASE_MIGRATE_URL` in `packages/db/.env` — present, probed 2026-10-12 by the #212 session), zod 4.5.1 (`.omit(...).extend(...)` for the save schema — the `updateServicePackageSchema` precedent; `z.url()`/`z.email()` top-level forms already in use), hono 4.13.5 (chained registrations — every edit below stays inside an existing chained expression), the existing `Field`/`FieldLabel`/`Input`/`Textarea`/`Checkbox`/`Card`/`Button` primitives (all present in `packages/ui`), vitest 4 per-package, pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#215 "M7 ticket 04: site settings — the singleton store, the endpoints, the Site tab"](https://github.com/jeius/sevendays/issues/215) (label `ready-for-agent`), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *Settings made real*, the **Site** bullet is this ticket's ruling, User Stories 31–34 + developer story 54 its acceptance; § *v1-pick classes* pre-rules the whole payload **PICK clean**; § *Testing Decisions* pins "`site_settings` GET/PUT round-trip + born-empty defaults" as api-suite law and "the site-settings form seam" as admin lib-seam law). The ticket's four acceptance criteria, verbatim: singleton GET/PUT round-trip + born-empty defaults pinned (api + types tests) · the Site tab edits every field with the full-object save contract · logo upload via the pipeline, unset fields default in code · public GET joined to the read chain (active on both editions). Key recon facts (2026-10-13, main `c2af0e8` — post-#214; every file below read this session):

- **The defaults sweep (the pin's owner-approved source is TODAY'S CODE — every literal below read from the landing this session):** brand name `'Sevendays'` + tagline `'Photography'` from `site-header.tsx:26–29` + `site-footer.tsx:25–28` (the serif wordmark + mono kicker; the logo slot is `/photos/sd.png` — the #111 chip-size monogram, so `logoImageUrl: null` IS today's default); home title `'Three branches. One standard of light.'` (`home-image-led.tsx:51`) + home description = `HERO_BLURB` (`home-copy.ts:11–12`); page titles `'Packages'`/`'Branches'`/`'Services'`/`'About'` (the four routes' `<h1>`s) with descriptions: services `'Looking for add-ons? Makeup, hairstyle, and more are available with any session.'` (`services.tsx:21–23`), packages/branches/about **null** (no sub-copy exists today); about story `'Our studio story is coming soon.'` (`about.tsx:40`); the four home kickers from `home-copy.ts:14–19` `KICKERS` — gallery `'The work — stand-in portfolio'`, packages `'Featured packages'`, services `'What we do'`, testimonials `'Kind words'` (the KICKERS object is also WHY the kicker field set is exactly these four — no enumeration question remains); socials/banner/contact **null/off** (the footer renders none of them today — "empty hides the icon" and "off renders nothing" are the defaults). Route `<title>`s are `'X | Sevendays Photography'` — the "brand name appended" composition is consumption-side (#223/#224), not a stored default.
- **The singleton law (spec § Implementation Decisions, binding):** "`site_settings` as a singleton full-object PUT (no per-field patching), so the settings screen is one save like every other editor" + "no singleton precedent exists yet, this creates it" + "Unset fields fall back to today's hardcoded defaults — the settings row is born-empty; defaults live in code; the chrome never renders broken." Two endpoints only: "Public `GET /api/v1/site-settings` joins the v1.ts read chain; admin `PUT /api/v1/admin/site-settings` behind `requireSession`" — **no admin GET route exists or is built** (the public read IS the admin editor's load: the singleton has no admin-only projection), and no DELETE (the singleton is never deleted — `admin-delete.ts` is untouched).
- **The wire law (ADR-0019 + the #214 precedent, binding):** reads resolve `logoImageUrl: string | null` via `resolveMediaUrl` (media.ts:210–215, the ONLY key→URL site); the raw `logoImageKey` never appears on any read. The PUT body carries the logo tri-state exactly like `updateBranchSchema.coverImageKey` (branch.ts:147): **absent = unchanged, `null` = clear, staging string = bind/replace** — structurally safe because `mediaStagingKeySchema` (media.ts:35–37 of types) only matches `tmp/<hex-uuid>.jpg`, so a present string is always a fresh bind. The commit runs BEFORE the transaction (`admin-packages.ts`'s `resolveCover` controller ruling, 151–178 — bucket I/O never holds a tx open; failures re-path onto `['logoImageKey']` and resolve as the `conflict` failure → 400); the replaced/cleared OLD object deletes only AFTER the commit (`if (oldKey && storedAfter !== oldKey) await env.MEDIA_BUCKET.delete(oldKey)` — the #137 precedent).
- **The media seam:** `mediaPurposeSchema` is today `['package-cover', 'branch-cover', 'gallery-photo']` (types/media.ts:13); `FINAL_PREFIXES: Record<MediaPurpose, string>` (api services/media.ts:25–31) is the typecheck wall forcing the prefix in the same commit. This ticket maps **`'site-logo': 'brand'`** — its own immutable directory (a logo is not a cover; the purpose names the owner, the prefix names the class). The presign route is purpose-generic (`validatedJson(mediaPresignRequestSchema)` — routes/admin-media.ts; zero route change), the admin server fn `presignAdminCoverUpload` (admin.functions.ts:145–172) likewise, and the admin cover loop `uploadCover(file, presign, onStatus, purpose)` takes the purpose as its 4th parameter since #214 (cover-upload.ts:45–67 — call with `'site-logo'`).
- **The read chain + admin mount:** `routes/v1.ts` chains `.route(...)` per resource ending `.route('/admin', admin)`; `routes/admin.ts` holds the ONE `requireSession` at its root (`use('*', requireSession)` — 401 structurally precedes every child's validation). The new routes join both chains (statement-style registration would silently drop the subtree from `AppType` — ADR-0006).
- **The audit vocabulary:** `auditEntitySchema` (types/audit.ts:18–28) lists the nine entities; the #185 write side (`writeAuditRow(tx, audit, { entity, entityId, action, summary })` — services/audit.ts:63–77) writes inside the mutation's transaction; `logAdminMutation(c, { entity, entityId })` (observability/events.ts:52–66) is the ephemeral twin, `AdminMutationEntity = AuditEntity` — widening the enum flows both. Two Record walls force atomic edits: `AUDIT_ENTITY_LABELS: Record<AuditEntity, string>` (admin lib/audit/filters.ts:99–109 — gains `'site-settings': 'Site settings'`) and `FINAL_PREFIXES`. `AuditAction` already carries everything needed: **`'create'` on the first save (the insert), `'update'` after** — deterministic, mirrors the entity routers' semantics; `summary: null` (the singleton has no name-bearing identity — the reorder law); the durable row carries `entityId = <row id>` while the ephemeral `admin_mutation` line carries `entityId: null` (**the order-PUT law**: family-grain on the wire — events.ts:49–51 documents it).
- **The admin consumption pattern:** reads over `getApiClient()` in `lib/api.functions.ts` (the public-read home — `getBranches` is the pattern), mutations over `getSessionScopedApiClient` in `lib/admin.functions.ts` returning `AdminMutationResult<T>` (result-valued so 400 field details survive the RPC boundary — the #155 finding); query factories in `lib/cms-queries.ts`; the pure form seam as `lib/*-state.ts` with plain-node tests (the M5-seated pattern — `light-entity-state.ts` is the shape: state interface, `stateFromRead`, `buildXPayload`, `validateXState`); screens compose `PageHeader` + `Card` + `Field`/`FieldLabel`/`Input` + `toast` with `useMutation` (branches-screen.tsx:217–253 is the save-mutation shape — success `toast.success('Saved.')`, API failure `toast.error(result.message)`, client validation `toast.error('Fix the highlighted fields.')`). The Settings nav entry already exists (`/settings`, Studio group, nav.ts:84) and the route is inside `_shell` — **session-gated for every staff member; Site is all-staff content per ADR-0018, NO role gate** (Users-tab gating is #221's).
- **The blast radius (swept — there are NO expected red windows this time):** every change is additive. `branchSchema`-style breaks: none (no existing schema changes). The enum widenings (media purpose, audit entity) only ADD members; their two Record walls get their new entries in the SAME commits as the widenings (Task 2 and Task 3 respectively). The `AppType` grows two routes — no existing wrapper moves. The seed touches no site_settings row (born-empty everywhere: live DB, compose test DB via global-setup's `migrateDatabase`, fresh ship DBs). `scripts/rehearsal-fixture.mjs` uses explicit column lists on other tables. **The admin-gate sweep** (admin-gate.test.ts:25–48) loops GET over nine routers — this ticket adds a dedicated PUT pin there rather than touching the loop. The api-client mock (test/mock-api.ts) is hand-maintained minimal — it gains the two site-settings routes it needs.
- **Sibling fences (spec § Sequencing; docs/plan.md M7 block):** NOT here, regardless of temptation: **both apps' chrome consumption** — logo chip source, wordmark/kicker, document titles, page h1/SEO meta, About story render, social icons, banner render, kickers, contact block — ALL of it rides the landing redesign tickets #223/#224 (plan.md's "Both apps — site settings consumed" box stays unticked; this ticket ticks only "API + admin + landing — site settings", whose landing half is the defaults-in-code seam itself); **the Account + Users tabs + forgot-password** (#221 — this ticket replaces the Settings STUB with the Site tab screen; the tab strip for three tabs is #221's restructuring, so the screen ships header + the Site panel with a fencing comment, no empty Account/Users placeholders); **the CMS-wide interaction system** (#218 — the Site tab's Save is today's plain mutation+toast vocabulary, NO pending/"Saving…"/`aria-busy` invention here; #218's system covers the new tab per the spec); **dark mode** (#217 — later ticket; the screen builds on tokens only, no hard colors, so it is theme-ready by construction); **the testimonial form** (#216); **upload UI maturation** (#220 — the logo upload is the plain picker+button loop, no drag-and-drop/cancel/leave-confirm); **the Resend/sending-domain work** (#222); **`admin-delete.ts`** (no DELETE for the singleton); **the landing** (zero files).
- **Baselines (live, per AGENTS.md post-#214):** types **15 files / 143 tests**; api **28 passed + 1 skipped files (29) / 397 passed + 3 skipped**; api-client **5 files / 37 tests**; admin **17 files / 189 tests**; landing **9 files / 84 tests**; db **4 files** (catalog-rows, client-transaction, migrate, verify-appointment-row). After this ticket: **types 16 / 158** (+14 site-settings its +1 media purpose it), **api 29 passed + 1 skipped files (30) / 408 passed + 3 skipped** (+1 media prefix it in Task 2; +8 site-settings suite its +1 admin-gate pin +1 mutation-log pin in Task 3), **api-client 5 / 39** (+2 loopback its), **admin 17 / 195** (+6 state-seam its), **landing 9 / 84 unchanged**, **db 4 unchanged**. Migrations **0000–0010** applied; this ticket generates **0011**. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)
- **The dev-db port wrinkle (this machine, verified 2026-10-12 via the #212/#213/#214 sessions):** an unrelated project's container (`lactalink-test-db`) squats host port 5432. The sevendays compose db runs remapped: `printf 'services:\n  db:\n    ports: !override\n      - "5433:5432"\n' > /tmp/sevendays-db-port.yml && docker compose -f compose.yaml -f /tmp/sevendays-db-port.yml up -d db`, and every api test command prefixes `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test'`. If 5432 is free in the executor's session, plain `docker compose up -d db` and no prefix. **Never** point the suite at the lactalink container.

## Global Constraints

- **Branch & baseline:** `feat/215-site-settings` off main `c2af0e8` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#215)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, migration SQL, probe output, variant frames + verdict) lands in gitignored `.superpowers/sdd/2026-10-13-215-site-settings/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (zod/drizzle/hono all installed). Every task commits only with the checks green **for the packages it touched** (AGENTS.md's letter); the per-task commands are pinned below. **No expected red windows** — every edit is additive and the two Record walls (`FINAL_PREFIXES`, `AUDIT_ENTITY_LABELS`) get their entries in the same commit as their enum widening (the #213 Task-1 pairing rule). After any `packages/types/src` edit, run `pnpm build:packages` before downstream typecheck/tests (dist/ is gitignored; turbo `typecheck` builds `^` but `test` does not). The api suite needs the compose db (the port recipe above). Biome canonical form via `pnpm --filter <pkg> fix` before committing — accept its rewrites. **Never stage `apps/admin/package.json`** (the owner's uncommitted dev-port change rides above the branch) and never stage `graphify-out/` churn (dirty graph files are expected, per AGENTS.md). Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (Task 7 — code was modified).
- **The singleton law (spec-ruled, binding):** ONE row ever. `GET` answers the born-empty wire when no row exists (`EMPTY_SITE_SETTINGS` — every content field `null`, `bannerIsActive: false`, `logoImageUrl: null`); `PUT` is the full-object save (every content field a REQUIRED-and-nullable key — the editor always sends the whole object; `null` = unset → default) and upserts (insert on first save, update after). **No per-field patching, no DELETE, no admin GET route.** Defaults NEVER ride the wire — GET returns stored nulls verbatim; resolution is the consumer-side seam (`resolveSiteSettings`).
- **The defaults law (spec-ruled, binding):** `SITE_SETTINGS_DEFAULTS` is pinned VERBATIM to today's landing literals (the recon bullet above; the full object is written out in Task 2 — an executor never invents copy). Fields today renders nothing for stay `null` in the defaults (socials, banner title/body, brand contact, the three page descriptions with no today-sub-copy). `resolveSiteSettings(raw)` fills per-key: `raw.x ?? DEFAULTS.x`. Both apps consume this ONE seam (landing, at #223/#224) — no per-app fallbacks ever.
- **The wire law (ADR-0019 + the #214 precedent, binding):** the raw R2 object key **never leaves the API at any layer** — reads resolve `logoImageUrl` via `resolveMediaUrl`; the PUT body's `logoImageKey` is the tri-state (absent = unchanged, `null` = clear, staging string = bind — `mediaStagingKeySchema` structurally guarantees a present string is a fresh bind). The logo commit (HEAD-verify → caps → promote → delete staging) runs BEFORE the write transaction; the write stores the FINAL key; the replaced/cleared old object deletes ONLY after the transaction committed. Failed validations record no audit row and never touch the bucket.
- **The media purpose (binding):** `'site-logo'` maps to the **`brand/`** final-key prefix — its own immutable directory (not `covers/`: a logo is not a cover). The enum widening (types) and `FINAL_PREFIXES` (api) land in the SAME commit (the `Record<MediaPurpose, string>` typecheck wall). The pipeline's caps stand unchanged (image/jpeg, 50 MiB — a logo is small in practice but rides the same contract).
- **The audit law (binding):** every committed PUT writes ONE `audit_log` row inside the save's transaction — `entity: 'site-settings'`, `entityId = <row id>`, `action: 'create'` on the first save / `'update'` after, `summary: null`. The route's `logAdminMutation` line carries `entityId: null` (the order-PUT law — the singleton is family-grain on the wire). The enum widening (`types/audit.ts`) and the viewer label (`'site-settings': 'Site settings'` in `apps/admin/src/lib/audit/filters.ts`) land in the SAME commit (the `Record<AuditEntity, string>` wall).
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Task 1 edits only `packages/db/src/schema/site-settings.ts` + `packages/db/src/schema/index.ts` + generates `packages/db/migrations/0011_*.sql` (+ journal). Task 2 edits only `packages/types/src/{site-settings.ts (new), site-settings.test.ts (new), index.ts, media.ts, media.test.ts}` + `apps/api/src/services/{media.ts, media.test.ts}`. Task 3 edits only `packages/types/src/{audit.ts, audit.test.ts}` + `apps/admin/src/lib/audit/filters.ts` + `apps/api/src/services/site-settings.ts (new)` + `apps/api/src/routes/{site-settings.ts (new), admin-site-settings.ts (new), v1.ts, admin.ts}` + `apps/api/test/{site-settings.test.ts (new), admin-gate.test.ts, admin-mutation-log.test.ts}`. Task 4 edits only `packages/api-client/src/{routes/site-settings.ts (new), routes/admin.ts, index.ts}` + `packages/api-client/test/{mock-api.ts, loopback.test.ts}`. Task 5 edits only `apps/admin/src/lib/{site-settings-state.ts (new), site-settings-state.test.ts (new), api.functions.ts, admin.functions.ts, cms-queries.ts}`. Task 6 edits only `apps/admin/src/components/settings/settings-screen.tsx (new)` + `apps/admin/src/routes/_shell.settings.tsx` (+ the throwaway variant route, deleted before commit). Task 7 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/`, and works the PR/pick/issue — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/db/src/schema/
  site-settings.ts                                  # create (T1) — the singleton table
  index.ts                                          # modify (T1) — barrel line
packages/db/migrations/0011_*.sql                   # create (T1, db:generate) — one CREATE TABLE
packages/types/src/
  site-settings.ts                                  # create (T2) — read/save schemas, EMPTY, DEFAULTS, resolve
  site-settings.test.ts                             # create (T2) — the 14-it wire + defaults suite
  index.ts                                          # modify (T2) — barrel line
  media.ts                                          # modify (T2) — 'site-logo' joins the purpose enum
  media.test.ts                                     # modify (T2) — +1 the site-logo purpose pin
  audit.ts                                          # modify (T3) — 'site-settings' joins the entity enum
  audit.test.ts                                     # modify (T3) — the entity list gains site-settings
apps/api/src/services/
  media.ts                                          # modify (T2) — FINAL_PREFIXES['site-logo'] = 'brand'
  media.test.ts                                     # modify (T2) — +1 the brand/ prefix pin
  site-settings.ts                                  # create (T3) — the singleton read + save service
apps/api/src/routes/
  site-settings.ts                                  # create (T3) — public GET on the read chain
  admin-site-settings.ts                            # create (T3) — the admin PUT behind requireSession
  v1.ts                                             # modify (T3) — chain the public route
  admin.ts                                          # modify (T3) — chain the admin route
apps/api/test/
  site-settings.test.ts                             # create (T3) — the 7-it endpoint suite
  admin-gate.test.ts                                # modify (T3) — +1 the PUT 401-before-validation pin
  admin-mutation-log.test.ts                        # modify (T3) — +1 the mutation-line pin
packages/api-client/src/
  routes/site-settings.ts                           # create (T4) — the public get wrapper
  routes/admin.ts                                   # modify (T4) — the admin siteSettings group
  index.ts                                          # modify (T4) — client.siteSettings wiring
packages/api-client/test/
  mock-api.ts                                       # modify (T4) — the GET/PUT site-settings subtree
  loopback.test.ts                                  # modify (T4) — +2 wrapper pins
apps/admin/src/lib/
  site-settings-state.ts                            # create (T5) — state/payload/validate/details seam
  site-settings-state.test.ts                       # create (T5) — the 6-it lib-seam suite
  api.functions.ts                                  # modify (T5) — getSiteSettings public-read fn
  admin.functions.ts                                # modify (T5) — saveAdminSiteSettings mutation fn
  cms-queries.ts                                    # modify (T5) — siteSettingsQuery factory
apps/admin/src/components/settings/
  settings-screen.tsx                               # create (T6) — the Site tab (the ruled composition)
apps/admin/src/routes/
  _shell.settings.tsx                               # modify (T6) — the stub swap
docs/plan.md docs/progress.md AGENTS.md graphify-out/ docs/agents/v1-picks.md  # T7
```

---

### Task 1: `packages/db` — the singleton `site_settings` table + migration 0011

**Files:**
- Create: `packages/db/src/schema/site-settings.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create (via `db:generate`, never by hand): `packages/db/migrations/0011_*.sql` (+ `meta/_journal.json` + snapshot)

**Interfaces:**
- Produces (what Tasks 2–3 consume): the `siteSettings` drizzle table on the `@sevendays/db` barrel — `typeof siteSettings.$inferSelect` is `{ id: string; logoImageKey: string | null; brandName: string | null; …; bannerIsActive: boolean; updatedAt: Date }`. The compose test DB picks migration 0011 up automatically (`apps/api/test/global-setup.ts` runs `migrateDatabase`); the live shared DB gets it via `db:migrate`.
- Consumes: nothing new.

**Not here:** any types/api code (Tasks 2–4); any seed row (**born-empty is the ruling** — the singleton is created by the first PUT, on every environment alike: live, compose, and future ship DBs — so there is deliberately NO seed change and NO data migration); `relations.ts` (nothing references the singleton — the audit-log precedent of a relations-free table); `admin-delete.ts` (no DELETE, ever).

- [ ] **Step 1: Write the schema file**

Create `packages/db/src/schema/site-settings.ts` with exactly:

```ts
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Site Settings (M7 #215, spec § Settings made real — the 2026-10-02
// Site-tab amendment): the SINGLETON store for the site's words and marks —
// brand (logo key + name + tagline), the five pages × title/description,
// the About story, and the ruled extras (social links, announcement
// banner, home section kickers, brand contact block). Every content column
// is nullable: the row is BORN-EMPTY (absent until the first save) and
// unset fields fall back to today's hardcoded defaults in code
// (packages/types' SITE_SETTINGS_DEFAULTS — the chrome never renders
// broken). The raw R2 key lives here alone; reads resolve logoImageUrl
// via MEDIA_PUBLIC_BASE_URL (ADR-0019) — keys never leave the API. One
// row ever: the save service inserts on first PUT and updates after; no
// DELETE (the singleton is never deleted) and no per-field patching (the
// full-object PUT, one save like every other editor).
export const siteSettings = pgTable('site_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  logoImageKey: text('logo_image_key'),
  brandName: text('brand_name'),
  brandTagline: text('brand_tagline'),
  homeTitle: text('home_title'),
  homeDescription: text('home_description'),
  packagesTitle: text('packages_title'),
  packagesDescription: text('packages_description'),
  branchesTitle: text('branches_title'),
  branchesDescription: text('branches_description'),
  servicesTitle: text('services_title'),
  servicesDescription: text('services_description'),
  aboutTitle: text('about_title'),
  aboutDescription: text('about_description'),
  aboutStory: text('about_story'),
  kickerGallery: text('kicker_gallery'),
  kickerPackages: text('kicker_packages'),
  kickerServices: text('kicker_services'),
  kickerTestimonials: text('kicker_testimonials'),
  socialInstagram: text('social_instagram'),
  socialFacebook: text('social_facebook'),
  socialTiktok: text('social_tiktok'),
  bannerTitle: text('banner_title'),
  bannerBody: text('banner_body'),
  bannerIsActive: boolean('banner_is_active').notNull().default(false),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Then `packages/db/src/schema/index.ts` — insert the barrel line between `./service-packages.js` and `./studio-service-addon-services.js` (alphabetical):

```ts
export * from './site-settings.js';
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: a new `packages/db/migrations/0011_<drizzle-name>.sql` (the name is drizzle's pick — do not rename it) plus the `meta/` journal + snapshot entries. Read the generated SQL and verify it contains **exactly one statement**: a `CREATE TABLE "site_settings" (...)` listing the 28 columns — `id` uuid PRIMARY KEY DEFAULT `gen_random_uuid()` NOT NULL, the 25 nullable text columns, `banner_is_active` boolean DEFAULT false NOT NULL, `contact_email`/`contact_phone` text nullable, `updated_at` timestamp with time zone DEFAULT now() NOT NULL — and NOTHING else (no index, no second statement, no defaults on the text columns). If the generated file contains anything beyond that one CREATE TABLE — STOP: the schema edit drifted; fix `site-settings.ts` and regenerate. Never hand-edit the migration.

- [ ] **Step 3: Apply to the live shared DB + probe**

Run: `pnpm --filter @sevendays/db db:migrate` (uses `DATABASE_MIGRATE_URL` from `packages/db/.env` — present on this machine; if the executor's session lacks it, stop and surface: applying to the live shared DB is owner-delegated and must not be skipped silently).
Expected: `0011` applies clean. Then the read-only probe (the #212/#214 pattern):

```bash
cd packages/db && node --env-file=.env -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_MIGRATE_URL, { prepare: false, max: 1 });
  const cols = await sql\`select column_name, is_nullable, column_default from information_schema.columns where table_name = 'site_settings' order by ordinal_position\`;
  console.log('columns=' + cols.length);
  for (const c of cols) console.log(c.column_name, 'nullable=' + c.is_nullable, 'default=' + c.column_default);
  const rows = await sql\`select count(*)::int as n from site_settings\`;
  console.log('rows=' + rows[0].n);
  await sql.end({ timeout: 5 });
\});"
```

Expected output — `columns=28`, every content column `nullable=YES default=null` (only `id`, `banner_is_active`, `updated_at` carry defaults/NOT NULL), and **`rows=0`** (born-empty on the live DB). Record the SQL + probe output in the evidence dir.

- [ ] **Step 4: Gates + commit**

`pnpm --filter @sevendays/db test` — **4 files passed** (`migrate.test.ts` replays the folder including 0011). Then `pnpm --filter @sevendays/db fix` (re-run the suite — fix must not change counts), `pnpm --filter @sevendays/db typecheck`. Commit:

```bash
git add packages/db/src/schema/site-settings.ts packages/db/src/schema/index.ts packages/db/migrations/0011_*.sql packages/db/migrations/meta
git commit -m "feat(db): the singleton site_settings table - born-empty, every content column nullable (#215)"
```

### Task 2: `packages/types` + the api media seam — the site-settings wire + the `'site-logo'` purpose (TDD, atomic)

Types and the api's `FINAL_PREFIXES` land in ONE commit: the purpose enum widening (types) and the prefix map (api) force each other's typechecks — the #214 Task-2 precedent (the `Record<MediaPurpose, string>` wall, the #213 Task-1 pairing rule).

**Files:**
- Create (test-first): `packages/types/src/site-settings.test.ts`
- Modify (test-first): `packages/types/src/media.test.ts`, `apps/api/src/services/media.test.ts`
- Create: `packages/types/src/site-settings.ts`
- Modify: `packages/types/src/index.ts`, `packages/types/src/media.ts`, `apps/api/src/services/media.ts`

**Interfaces:**
- Produces (what Tasks 3–6 consume): `siteSettingsSchema` + `SiteSettings` (the read wire — 25 nullable/boolean content fields + `logoImageUrl: z.url().nullable()`, NO `logoImageKey`, no id/timestamps); `saveSiteSettingsSchema` + `SaveSiteSettingsInput` (the PUT body — the same content fields required-and-nullable, `logoImageUrl` omitted, `logoImageKey: z.string().min(1).nullable().optional()` tri-state); `EMPTY_SITE_SETTINGS: SiteSettings` (the born-empty GET answer); `SITE_SETTINGS_DEFAULTS: SiteSettings` (today's copy verbatim); `resolveSiteSettings(raw: SiteSettings): SiteSettings` (the defaults seam); `MediaPurpose` widens to `'package-cover' | 'branch-cover' | 'site-logo' | 'gallery-photo'`.
- Consumes: nothing new (Task 1's table is consumed at Task 3, not here).

**Not here:** the api service/routes (Task 3); the audit entity widening (Task 3 — it forces the admin label wall, a different pairing); the api-client wrappers (Task 4); any consumer of `resolveSiteSettings` (the landing, at #223/#224).

- [ ] **Step 1: Write the failing tests (the 14-it types suite)**

Create `packages/types/src/site-settings.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import {
  EMPTY_SITE_SETTINGS,
  SITE_SETTINGS_DEFAULTS,
  resolveSiteSettings,
  saveSiteSettingsSchema,
  siteSettingsSchema,
} from './site-settings.js';

const LOGO_URL = 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.jpg';
const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000002.jpg';

const read = {
  brandName: 'Sevendays Studio',
  brandTagline: 'Photography',
  logoImageUrl: LOGO_URL,
  homeTitle: 'Three branches. One standard of light.',
  homeDescription: 'Portrait, family, and event photography.',
  packagesTitle: 'Packages',
  packagesDescription: null,
  branchesTitle: 'Branches',
  branchesDescription: null,
  servicesTitle: 'Services',
  servicesDescription: 'Looking for add-ons?',
  aboutTitle: 'About',
  aboutDescription: null,
  aboutStory: 'Line one.\nLine two.',
  kickerGallery: 'The work',
  kickerPackages: 'Featured packages',
  kickerServices: 'What we do',
  kickerTestimonials: 'Kind words',
  socialInstagram: 'https://instagram.com/sevendays',
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: 'Now booking grads',
  bannerBody: 'Class of 2027 slots are open.',
  bannerIsActive: true,
  contactEmail: 'hello@sevendays.ph',
  contactPhone: '+63 917 000 0000',
};

const save = { ...read, logoImageKey: STAGING_KEY } as const;
delete (save as Record<string, unknown>).logoImageUrl;

describe('siteSettingsSchema (the read wire)', () => {
  it('parses a canonical read (every field set)', () => {
    expect(siteSettingsSchema.safeParse(read).success).toBe(true);
  });

  it('parses the born-empty read — every content field null, the banner off, no logo', () => {
    const parsed = siteSettingsSchema.parse(EMPTY_SITE_SETTINGS);
    expect(parsed).toEqual(EMPTY_SITE_SETTINGS);
    expect(parsed.brandName).toBeNull();
    expect(parsed.bannerIsActive).toBe(false);
    expect(parsed.logoImageUrl).toBeNull();
  });

  it('strips a smuggled logoImageKey from the parsed output (ADR-0019: raw keys never leave)', () => {
    const parsed = siteSettingsSchema.parse({ ...read, logoImageKey: 'brand/aaaa.jpg' });
    expect('logoImageKey' in parsed).toBe(false);
  });
});

describe('saveSiteSettingsSchema (the full-object PUT body)', () => {
  it('drops logoImageUrl from the parsed save output (reads never echo keys; saves never echo URLs)', () => {
    const parsed = saveSiteSettingsSchema.parse({ ...save, logoImageUrl: LOGO_URL });
    expect('logoImageUrl' in parsed).toBe(false);
    expect(parsed.logoImageKey).toBe(STAGING_KEY);
  });

  it('an ABSENT logoImageKey stays absent from the parsed output (unchanged)', () => {
    const { logoImageKey: _key, ...withoutLogo } = save;
    const parsed = saveSiteSettingsSchema.parse(withoutLogo);
    expect('logoImageKey' in parsed).toBe(false);
  });

  it('a null logoImageKey survives the parse (explicit clear)', () => {
    const parsed = saveSiteSettingsSchema.parse({ ...save, logoImageKey: null });
    expect(parsed.logoImageKey).toBeNull();
  });

  it('a staging-key string parses (bind via a fresh staging key)', () => {
    const parsed = saveSiteSettingsSchema.parse(save);
    expect(parsed.logoImageKey).toBe(STAGING_KEY);
  });

  it('social links must be URLs when present (all three)', () => {
    for (const field of ['socialInstagram', 'socialFacebook', 'socialTiktok'] as const) {
      const bad = saveSiteSettingsSchema.safeParse({ ...save, [field]: 'not a url' });
      expect(bad.success).toBe(false);
    }
  });

  it('contactEmail must be an email when present', () => {
    expect(saveSiteSettingsSchema.safeParse({ ...save, contactEmail: 'not-an-email' }).success).toBe(
      false
    );
  });
});

describe('the defaults (M7 #215: unset fields fall back to today’s hardcoded copy)', () => {
  it('SITE_SETTINGS_DEFAULTS pins today’s landing literals verbatim (the owner-ratified source is the code)', () => {
    expect(SITE_SETTINGS_DEFAULTS).toEqual({
      brandName: 'Sevendays',
      brandTagline: 'Photography',
      logoImageUrl: null,
      homeTitle: 'Three branches. One standard of light.',
      homeDescription:
        'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.',
      packagesTitle: 'Packages',
      packagesDescription: null,
      branchesTitle: 'Branches',
      branchesDescription: null,
      servicesTitle: 'Services',
      servicesDescription:
        'Looking for add-ons? Makeup, hairstyle, and more are available with any session.',
      aboutTitle: 'About',
      aboutDescription: null,
      aboutStory: 'Our studio story is coming soon.',
      kickerGallery: 'The work — stand-in portfolio',
      kickerPackages: 'Featured packages',
      kickerServices: 'What we do',
      kickerTestimonials: 'Kind words',
      socialInstagram: null,
      socialFacebook: null,
      socialTiktok: null,
      bannerTitle: null,
      bannerBody: null,
      bannerIsActive: false,
      contactEmail: null,
      contactPhone: null,
    });
  });

  it('EMPTY_SITE_SETTINGS is all-null with only the banner switch false (born-empty, defaults never ride the wire)', () => {
    expect(Object.values(EMPTY_SITE_SETTINGS).every((v) => v === null || v === false)).toBe(true);
    expect(EMPTY_SITE_SETTINGS.bannerIsActive).toBe(false);
  });
});

describe('resolveSiteSettings (the defaults seam — both apps consume this one fn)', () => {
  it('resolving the born-empty settings yields exactly the defaults', () => {
    expect(resolveSiteSettings(EMPTY_SITE_SETTINGS)).toEqual(SITE_SETTINGS_DEFAULTS);
  });

  it('set values pass through untouched (including the multi-paragraph story)', () => {
    const resolved = resolveSiteSettings(siteSettingsSchema.parse(read));
    expect(resolved.brandName).toBe('Sevendays Studio');
    expect(resolved.aboutStory).toBe('Line one.\nLine two.');
    expect(resolved.logoImageUrl).toBe(LOGO_URL);
    expect(resolved.bannerIsActive).toBe(true);
  });

  it('nullable-by-design keys stay null on resolve (today renders nothing for them)', () => {
    const resolved = resolveSiteSettings(EMPTY_SITE_SETTINGS);
    expect(resolved.socialInstagram).toBeNull();
    expect(resolved.bannerTitle).toBeNull();
    expect(resolved.bannerBody).toBeNull();
    expect(resolved.contactEmail).toBeNull();
    expect(resolved.contactPhone).toBeNull();
    expect(resolved.packagesDescription).toBeNull();
  });
});
```

Then `packages/types/src/media.test.ts` — inside the `mediaPresignRequestSchema` describe, after the branch-cover purpose it (#214's), add:

```ts
  it('parses the site-logo purpose (M7 #215: the brand logo rides the pipeline under its own purpose)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'site-logo',
      contentType: 'image/jpeg',
    });
    expect(parsed.purpose).toBe('site-logo');
  });
```

(If the describe's `it` wording convention differs, keep the file's own wording for the string — only the body is new.)

- [ ] **Step 2: Run the types tests red**

`pnpm --filter @sevendays/types test -- --run src/site-settings.test.ts` — FAILS (the module does not exist). `pnpm --filter @sevendays/types test -- --run src/media.test.ts` — FAILS (the enum rejects `'site-logo'`). Record red in the evidence dir.

- [ ] **Step 3: Write the types module + widen the purpose**

(a) Create `packages/types/src/site-settings.ts` with exactly:

```ts
import { z } from 'zod';

// Site Settings (M7 #215, spec § Settings made real — the 2026-10-02
// Site-tab amendment): the singleton wire — brand + the five pages ×
// title/description + the About story + the ruled extras (social links,
// announcement banner, home section kickers, brand contact block). Every
// content field is nullable on the wire: the row is BORN-EMPTY and unset
// means "today's hardcoded default" (SITE_SETTINGS_DEFAULTS below — the
// chrome never renders broken; a fresh DB renders today's site). The wire
// never carries the raw R2 logo key: reads resolve logoImageUrl
// (ADR-0019); the save tri-state encodes the key (absent = unchanged,
// null = clear, staging string = bind — the #214 cover law).
export const siteSettingsSchema = z.object({
  brandName: z.string().max(300).nullable(),
  brandTagline: z.string().max(300).nullable(),
  logoImageUrl: z.url().nullable(),
  homeTitle: z.string().max(300).nullable(),
  homeDescription: z.string().max(1000).nullable(),
  packagesTitle: z.string().max(300).nullable(),
  packagesDescription: z.string().max(1000).nullable(),
  branchesTitle: z.string().max(300).nullable(),
  branchesDescription: z.string().max(1000).nullable(),
  servicesTitle: z.string().max(300).nullable(),
  servicesDescription: z.string().max(1000).nullable(),
  aboutTitle: z.string().max(300).nullable(),
  aboutDescription: z.string().max(1000).nullable(),
  aboutStory: z.string().max(10_000).nullable(),
  kickerGallery: z.string().max(300).nullable(),
  kickerPackages: z.string().max(300).nullable(),
  kickerServices: z.string().max(300).nullable(),
  kickerTestimonials: z.string().max(300).nullable(),
  socialInstagram: z.url().nullable(),
  socialFacebook: z.url().nullable(),
  socialTiktok: z.url().nullable(),
  bannerTitle: z.string().max(300).nullable(),
  bannerBody: z.string().max(1000).nullable(),
  bannerIsActive: z.boolean(),
  contactEmail: z.email().nullable(),
  contactPhone: z.string().max(40).nullable(),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

// The full-object PUT body (M7 #215 — the singleton precedent: one save
// like every other editor, NO per-field patching): every content field is
// REQUIRED-and-nullable (the editor always sends the whole object; null =
// unset → default), plus the logo's tri-state media encoding (ADR-0019 —
// reads never echo keys, so the save cannot either): absent = unchanged,
// null = clear, staging string = bind via the commit pipeline.
export const saveSiteSettingsSchema = siteSettingsSchema
  .omit({ logoImageUrl: true })
  .extend({ logoImageKey: z.string().min(1).nullable().optional() });

export type SaveSiteSettingsInput = z.infer<typeof saveSiteSettingsSchema>;

// The born-empty read (M7 #215): what GET answers before the first save —
// every content field null, the banner switch off, no logo. Defaults
// NEVER ride the wire; consumers resolve through the seam below.
export const EMPTY_SITE_SETTINGS: SiteSettings = {
  brandName: null,
  brandTagline: null,
  logoImageUrl: null,
  homeTitle: null,
  homeDescription: null,
  packagesTitle: null,
  packagesDescription: null,
  branchesTitle: null,
  branchesDescription: null,
  servicesTitle: null,
  servicesDescription: null,
  aboutTitle: null,
  aboutDescription: null,
  aboutStory: null,
  kickerGallery: null,
  kickerPackages: null,
  kickerServices: null,
  kickerTestimonials: null,
  socialInstagram: null,
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: null,
  bannerBody: null,
  bannerIsActive: false,
  contactEmail: null,
  contactPhone: null,
};

// Today's hardcoded copy, pinned VERBATIM from the landing's code (the
// owner-ratified source — swept 2026-10-13): brand + tagline from the
// header/footer wordmark (the logo slot's null default IS the incumbent
// sd.png monogram), home title/description from the hero (home-copy's
// HERO_BLURB), page titles + the services sub-copy from the routes'
// h1/sub-lines, the About story from /about's placeholder line, the four
// kickers from home-copy's KICKERS. Fields today renders NOTHING for stay
// null (the extras — socials, banner copy, brand contact — and the three
// page descriptions with no today-sub-copy): their null default renders
// exactly today's page. This object IS the fallback the chrome renders
// while the row is born-empty.
export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  brandName: 'Sevendays',
  brandTagline: 'Photography',
  logoImageUrl: null,
  homeTitle: 'Three branches. One standard of light.',
  homeDescription:
    'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.',
  packagesTitle: 'Packages',
  packagesDescription: null,
  branchesTitle: 'Branches',
  branchesDescription: null,
  servicesTitle: 'Services',
  servicesDescription:
    'Looking for add-ons? Makeup, hairstyle, and more are available with any session.',
  aboutTitle: 'About',
  aboutDescription: null,
  aboutStory: 'Our studio story is coming soon.',
  kickerGallery: 'The work — stand-in portfolio',
  kickerPackages: 'Featured packages',
  kickerServices: 'What we do',
  kickerTestimonials: 'Kind words',
  socialInstagram: null,
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: null,
  bannerBody: null,
  bannerIsActive: false,
  contactEmail: null,
  contactPhone: null,
};

// The defaults seam (spec § Settings made real: "unset fields fall back to
// today's hardcoded defaults"): per key, the row's value when set, the
// default when null. Both apps consume this ONE fn — never per-app
// fallbacks. Nullable-by-design keys resolve to their null default, which
// is exactly today's renders-nothing behavior. The explicit field list is
// the point: the SiteSettings return type makes it exhaustive by
// construction (a missed field fails this package's typecheck).
export function resolveSiteSettings(raw: SiteSettings): SiteSettings {
  return {
    brandName: raw.brandName ?? SITE_SETTINGS_DEFAULTS.brandName,
    brandTagline: raw.brandTagline ?? SITE_SETTINGS_DEFAULTS.brandTagline,
    logoImageUrl: raw.logoImageUrl ?? SITE_SETTINGS_DEFAULTS.logoImageUrl,
    homeTitle: raw.homeTitle ?? SITE_SETTINGS_DEFAULTS.homeTitle,
    homeDescription: raw.homeDescription ?? SITE_SETTINGS_DEFAULTS.homeDescription,
    packagesTitle: raw.packagesTitle ?? SITE_SETTINGS_DEFAULTS.packagesTitle,
    packagesDescription: raw.packagesDescription ?? SITE_SETTINGS_DEFAULTS.packagesDescription,
    branchesTitle: raw.branchesTitle ?? SITE_SETTINGS_DEFAULTS.branchesTitle,
    branchesDescription: raw.branchesDescription ?? SITE_SETTINGS_DEFAULTS.branchesDescription,
    servicesTitle: raw.servicesTitle ?? SITE_SETTINGS_DEFAULTS.servicesTitle,
    servicesDescription: raw.servicesDescription ?? SITE_SETTINGS_DEFAULTS.servicesDescription,
    aboutTitle: raw.aboutTitle ?? SITE_SETTINGS_DEFAULTS.aboutTitle,
    aboutDescription: raw.aboutDescription ?? SITE_SETTINGS_DEFAULTS.aboutDescription,
    aboutStory: raw.aboutStory ?? SITE_SETTINGS_DEFAULTS.aboutStory,
    kickerGallery: raw.kickerGallery ?? SITE_SETTINGS_DEFAULTS.kickerGallery,
    kickerPackages: raw.kickerPackages ?? SITE_SETTINGS_DEFAULTS.kickerPackages,
    kickerServices: raw.kickerServices ?? SITE_SETTINGS_DEFAULTS.kickerServices,
    kickerTestimonials: raw.kickerTestimonials ?? SITE_SETTINGS_DEFAULTS.kickerTestimonials,
    socialInstagram: raw.socialInstagram ?? SITE_SETTINGS_DEFAULTS.socialInstagram,
    socialFacebook: raw.socialFacebook ?? SITE_SETTINGS_DEFAULTS.socialFacebook,
    socialTiktok: raw.socialTiktok ?? SITE_SETTINGS_DEFAULTS.socialTiktok,
    bannerTitle: raw.bannerTitle ?? SITE_SETTINGS_DEFAULTS.bannerTitle,
    bannerBody: raw.bannerBody ?? SITE_SETTINGS_DEFAULTS.bannerBody,
    bannerIsActive: raw.bannerIsActive,
    contactEmail: raw.contactEmail ?? SITE_SETTINGS_DEFAULTS.contactEmail,
    contactPhone: raw.contactPhone ?? SITE_SETTINGS_DEFAULTS.contactPhone,
  };
}
```

(b) `packages/types/src/index.ts` — insert the barrel line between `./print-size.js` and `./studio-service.js` (alphabetical):

```ts
export * from './site-settings.js';
```

(c) `packages/types/src/media.ts` — the enum (line 13) becomes:

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

- [ ] **Step 4: Types green**

`pnpm --filter @sevendays/types test -- --run` — **16 files / 158 tests** (143 + the 14 site-settings its + the media purpose it). Then `pnpm --filter @sevendays/types fix` (re-run — counts unchanged) + `pnpm --filter @sevendays/types typecheck`, and `pnpm build:packages`. Do NOT commit yet — the api media half lands in the same commit.

- [ ] **Step 5: The api media half (test-first)**

(a) `apps/api/src/services/media.test.ts` — inside `describe('commitUpload')`, after the branch-cover prefix it (#214's), add:

```ts
  it('site-logo purpose promotes to brand/ (M7 #215: the logo gets its own immutable directory)', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'site-logo',
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.finalKey).toMatch(/^brand\//);
  });
```

(Match the file's own `stubBucket`/`STAGING_KEY` local names — the #214 branch-cover it in the same describe is the template; only the purpose + prefix assertion are new.)

(b) Run red: `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run src/services/media.test.ts` — the new it FAILS at typecheck level (`'site-logo'` not assignable to `MediaPurpose` before the api edit… it IS assignable after Step 3's types edit + build:packages — so the honest red here is the RUNTIME failure `expected ok, got foreign_key`: `FINAL_PREFIXES[input.purpose]` is `undefined` for the new purpose, producing `undefined/<uuid>.jpg`. If it instead fails at typecheck, `pnpm build:packages` was skipped — run it). Record red.

(c) `apps/api/src/services/media.ts` — `FINAL_PREFIXES` (lines 25–31) becomes:

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

(d) Run green: the same command — the file's suite passes (+1 it). Then `pnpm --filter @sevendays/api fix` (re-run) + `pnpm --filter @sevendays/api typecheck`. Commit the atomic pair:

```bash
git add packages/types/src/site-settings.ts packages/types/src/site-settings.test.ts packages/types/src/index.ts packages/types/src/media.ts packages/types/src/media.test.ts apps/api/src/services/media.ts apps/api/src/services/media.test.ts
git commit -m "feat(types,api): the site-settings wire + the site-logo media purpose - read/save schemas, the verbatim defaults, the resolve seam (#215)"
```

### Task 3: `apps/api` — the public GET, the admin PUT, the singleton save service (TDD)

The singleton precedent this ticket creates: the save service (logo commit before the tx → upsert in-tx with the audit row → old-object delete after commit), the two chained routes, and the audit-entity widening — which carries the #188 viewer's label line in the SAME commit (the `Record<AuditEntity, string>` wall in `apps/admin`; a one-line edit, mechanically verified by that package's typecheck).

**Files:**
- Create (test-first): `apps/api/test/site-settings.test.ts`
- Modify (test-first): `apps/api/test/admin-gate.test.ts`, `apps/api/test/admin-mutation-log.test.ts`, `packages/types/src/audit.test.ts`
- Create: `apps/api/src/services/site-settings.ts`, `apps/api/src/routes/site-settings.ts`, `apps/api/src/routes/admin-site-settings.ts`
- Modify: `packages/types/src/audit.ts`, `apps/admin/src/lib/audit/filters.ts`, `apps/api/src/routes/v1.ts`, `apps/api/src/routes/admin.ts`

**Interfaces:**
- Produces (what Tasks 4–6 consume): `GET /api/v1/site-settings` → `200 SiteSettings` (born-empty when no row; raw keys never on the wire); `PUT /api/v1/admin/site-settings` (session-gated) with body `SaveSiteSettingsInput` → `200 SiteSettings` | the house 400-with-field-details (a failed logo commit re-paths onto `['logoImageKey']`); service-side `getSiteSettings(db, env)` + `saveSiteSettings(db, env, audit, input, log?)` returning `AdminWriteResult<SiteSettings>`; the audit vocabulary gains `'site-settings'`.
- Consumes: Task 1's `siteSettings` table; Task 2's schemas/constants + `'site-logo'` purpose; `admin-shared.ts`'s `AdminWriteResult`/`AdminWriteFailure`; `media.ts`'s `commitUpload`/`resolveMediaUrl`; `audit.ts`'s `writeAuditRow`/`AuditActor`; `observability/events.ts`'s `logAdminMutation`/`logMediaFailure` + `RequestLogger`; the existing `validatedJson`/`badRequest` vocabulary.

**Not here:** an admin GET route (the public read IS the editor's load — two endpoints only, the spec's route shape); a DELETE (the singleton is never deleted); `cms-schema-contracts.test.ts` (the new suite below owns the site-settings contract); the api-client wrappers (Task 4); guardUnique (nothing unique to guard — the singleton has no unique business columns; the insert/update branch is chosen by row existence, not a race-relevant unique clash: two concurrent first-saves race to two rows — accept and note, or… no: pin the simple existence check. The admin is a 3-person studio; a lost update between two concurrent staff saves is the last-writer-wins the full-object PUT already implies. A UNIQUE constraint on a constant would be schema noise for it).

- [ ] **Step 1: Write the failing tests**

(a) Create `apps/api/test/site-settings.test.ts` with exactly:

```ts
import { auditLog, siteSettings } from '@sevendays/db';
import { EMPTY_SITE_SETTINGS } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const STAGING = 'tmp/00000000-0000-4000-8000-0000000000c1.jpg';

const fullSave = (overrides: Record<string, unknown> = {}) => ({
  brandName: 'Sevendays Studio',
  brandTagline: 'Photography',
  homeTitle: 'Three branches. One standard of light.',
  homeDescription: 'Portrait, family, and event photography.',
  packagesTitle: 'Packages',
  packagesDescription: null,
  branchesTitle: 'Branches',
  branchesDescription: null,
  servicesTitle: 'Services',
  servicesDescription: 'Looking for add-ons?',
  aboutTitle: 'About',
  aboutDescription: null,
  aboutStory: 'Line one.\nLine two.',
  kickerGallery: 'The work',
  kickerPackages: 'Featured packages',
  kickerServices: 'What we do',
  kickerTestimonials: 'Kind words',
  socialInstagram: 'https://instagram.com/sevendays',
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: 'Now booking grads',
  bannerBody: 'Class of 2027 slots are open.',
  bannerIsActive: true,
  contactEmail: 'hello@sevendays.ph',
  contactPhone: '+63 917 000 0000',
  logoImageKey: undefined,
  ...overrides,
});

// undefined JSON.stringify's away — the absent-encoding rides cleanly.
const put = async (
  token: string,
  body: Record<string, unknown>,
  env: Record<string, unknown> = {}
) =>
  app.request(
    '/api/v1/admin/site-settings',
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: JSON.stringify(body),
    },
    { ...testEnv(url), ...env }
  );

beforeEach(async () => {
  await truncateAll(db); // the suite needs no catalog fixtures — the singleton starts empty
});

describe('GET /api/v1/site-settings (the public singleton read)', () => {
  it('born-empty: answers the EMPTY wire verbatim — defaults never ride the read (M7 #215)', async () => {
    const res = await app.request('/api/v1/site-settings', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(EMPTY_SITE_SETTINGS);
    expect(body).not.toHaveProperty('logoImageKey');
  });

  it('after a save, the stored values answer verbatim; nulls stay null (no defaulting server-side)', async () => {
    const { token } = await signUpSession(url, 'site-settings-null-stay@sevendays.test');
    const saved = fullSave({ brandName: null, bannerIsActive: false });
    expect((await put(token, saved)).status).toBe(200);
    const res = await app.request('/api/v1/site-settings', undefined, testEnv(url));
    const body = (await res.json()) as { brandName: string | null; homeTitle: string | null };
    expect(body.brandName).toBeNull();
    expect(body.homeTitle).toBe('Three branches. One standard of light.');
  });
});

describe('PUT /api/v1/admin/site-settings (the singleton full-object save)', () => {
  it('round-trips the full object: 200 with the refreshed read; one row exists after (the singleton)', async () => {
    const { token } = await signUpSession(url, 'site-settings-save@sevendays.test');
    const res = await put(token, fullSave());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { brandName: string | null; contactEmail: string | null };
    expect(body.brandName).toBe('Sevendays Studio');
    expect(body.contactEmail).toBe('hello@sevendays.ph');
    expect(body).not.toHaveProperty('logoImageKey');
    const rows = await db.select({ id: siteSettings.id }).from(siteSettings);
    expect(rows).toHaveLength(1);
    // A second save UPDATES the same row — never a second one.
    expect((await put(token, fullSave({ brandName: 'Renamed' }))).status).toBe(200);
    const again = await db.select({ id: siteSettings.id }).from(siteSettings);
    expect(again).toHaveLength(1);
  });

  it('a staging logo commits to brand/, resolves on the read, and the staging key deletes (raw keys never on the wire)', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'site-settings-logo-bind@sevendays.test');
    const res = await put(token, fullSave({ logoImageKey: STAGING }), { MEDIA_BUCKET: stub.bucket });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logoImageUrl: string | null };
    expect(body.logoImageUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/brand\/[0-9a-f-]+\.jpg$/);
    expect(stub.putCalls).toHaveLength(1);
    expect(stub.deleteCalls).toEqual([STAGING]);
    const stored = await db.select({ key: siteSettings.logoImageKey }).from(siteSettings);
    expect(stored[0]?.key).toMatch(/^brand\//);
  });

  it('an explicit null logo clears the stored one and deletes the old object only after the commit', async () => {
    const OLD_KEY = 'brand/aaaaaaaa-0000-4000-8000-0000000000d1.jpg';
    const bind = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'site-settings-logo-clear@sevendays.test');
    await put(token, fullSave({ logoImageKey: STAGING }), { MEDIA_BUCKET: bind.bucket });
    const stored = await db.select({ key: siteSettings.logoImageKey }).from(siteSettings);
    const boundKey = stored[0]?.key;
    expect(boundKey).toMatch(/^brand\//);

    const clear = stubCommitBucket();
    const res = await put(token, fullSave({ logoImageKey: null }), { MEDIA_BUCKET: clear.bucket });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logoImageUrl: string | null };
    expect(body.logoImageUrl).toBeNull();
    expect(clear.deleteCalls).toEqual([boundKey]);
  });

  it('an ABSENT logo field leaves the stored logo unchanged (no bucket touch)', async () => {
    const bind = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'site-settings-logo-keep@sevendays.test');
    await put(token, fullSave({ logoImageKey: STAGING }), { MEDIA_BUCKET: bind.bucket });
    const afterBind = await db.select({ key: siteSettings.logoImageKey }).from(siteSettings);
    const boundKey = afterBind[0]?.key;

    const keep = stubCommitBucket();
    const res = await put(token, fullSave(), { MEDIA_BUCKET: keep.bucket });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logoImageUrl: string | null };
    expect(body.logoImageUrl).toBe(`https://pub-test.r2.dev/${boundKey}`);
    expect(keep.putCalls).toEqual([]);
    expect(keep.deleteCalls).toEqual([]);
  });

  it('a missing staging key → the house 400 with the logoImageKey field detail (the commit re-path)', async () => {
    const stub = stubCommitBucket(); // empty — head misses
    const { token } = await signUpSession(url, 'site-settings-logo-miss@sevendays.test');
    const res = await put(token, fullSave({ logoImageKey: STAGING }), { MEDIA_BUCKET: stub.bucket });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.details[0]?.path).toEqual(['logoImageKey']);
  });

  it('one audit row per committed save — create on the first, update after; summary null; the row id carries', async () => {
    const { token } = await signUpSession(url, 'site-settings-audit@sevendays.test');
    await put(token, fullSave());
    await put(token, fullSave({ brandName: 'Renamed' }));
    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'site-settings'))
      .orderBy(auditLog.occurredAt, auditLog.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.action).toBe('create');
    expect(rows[1]?.action).toBe('update');
    for (const row of rows) {
      expect(row.entityId).toBe(rows[0]?.entityId);
      expect(row.summary).toBeNull();
    }
    // A FAILED validation records nothing: the audit count stays 2 after a 400.
    await put(token, fullSave({ socialInstagram: 'not a url' }));
    const after = await db.select().from(auditLog).where(eq(auditLog.entity, 'site-settings'));
    expect(after).toHaveLength(2);
  });
});
```

(b) `apps/api/test/admin-gate.test.ts` — inside `describe('the anonymous 401 envelope on every admin router')`, after the `for (const router of routers)` loop, add (the loop itself is untouched — the site-settings router is PUT-only, so its pin is method-shaped):

```ts
  it('PUT /api/v1/admin/site-settings → 401 for an anonymous caller, even with an invalid body (the gate precedes validation)', async () => {
    const res = await app.request('/api/v1/admin/site-settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{"brandName": 42}', // garbage — validation never runs
    }, testEnv(url));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
```

(c) `apps/api/test/admin-mutation-log.test.ts` — inside the describe, after the gallery-category order-PUT it, add:

```ts
  it('PUT site-settings → one line: entity site-settings, entityId null (the singleton is family-grain on the wire — the order-PUT law)', async () => {
    const lines = captureLines();
    const res = await authed('PUT', '/api/v1/admin/site-settings', 'mut-site@sevendays.test', {
      brandName: 'Sevendays Studio',
      brandTagline: 'Photography',
      homeTitle: 'Three branches. One standard of light.',
      homeDescription: null,
      packagesTitle: 'Packages',
      packagesDescription: null,
      branchesTitle: 'Branches',
      branchesDescription: null,
      servicesTitle: 'Services',
      servicesDescription: null,
      aboutTitle: 'About',
      aboutDescription: null,
      aboutStory: null,
      kickerGallery: null,
      kickerPackages: null,
      kickerServices: null,
      kickerTestimonials: null,
      socialInstagram: null,
      socialFacebook: null,
      socialTiktok: null,
      bannerTitle: null,
      bannerBody: null,
      bannerIsActive: false,
      contactEmail: null,
      contactPhone: null,
    });
    expect(res.status).toBe(200);
    const siteLines = mutations(lines).filter((line) => line.entity === 'site-settings');
    expect(siteLines).toHaveLength(1);
    expect(siteLines[0]?.entityId).toBeNull();
    expect(siteLines[0]?.route).toBe('/api/v1/admin/site-settings');
  });
```

(d) `packages/types/src/audit.test.ts` — the entity list it (lines 37–49): the title becomes `'accepts the ten route-segment names'` and the array gains `'site-settings',` after `'testimonial',`.

- [ ] **Step 2: Run red**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run test/site-settings.test.ts test/admin-gate.test.ts test/admin-mutation-log.test.ts`
Expected: the 7 suite its FAIL (404s — no routes), the gate pin FAILS (404), the mutation-log pin FAILS (0 lines). `pnpm --filter @sevendays/types test -- --run src/audit.test.ts` still PASSES (widening is additive — the amended list lands with the implementation). Record red.

- [ ] **Step 3: Widen the audit entity + its label wall**

(a) `packages/types/src/audit.ts` — the enum (lines 18–28) gains the member (and the header comment's "nine" becomes "ten"):

```ts
export const auditEntitySchema = z.enum([
  'branch',
  'print-size',
  'gallery-photo',
  'attire',
  'addon-service',
  'studio-service',
  'service-package',
  'gallery-category',
  'testimonial',
  // M7 #215: the singleton site-settings save is a committed admin
  // mutation — one row per PUT (create on the first save, update after).
  'site-settings',
]);
```

(b) `apps/admin/src/lib/audit/filters.ts` — `AUDIT_ENTITY_LABELS` gains its entry (the Record wall — this one-line edit is why the label rides this task's commit):

```ts
  testimonial: 'Testimonials',
  'site-settings': 'Site settings',
```

- [ ] **Step 4: Implement the service + routes**

(a) Create `apps/api/src/services/site-settings.ts` with exactly:

```ts
import type { Database } from '@sevendays/db';
import { siteSettings } from '@sevendays/db';
import type { SaveSiteSettingsInput, SiteSettings } from '@sevendays/types';
import { EMPTY_SITE_SETTINGS } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import type { Env } from '../env.js';
import { logMediaFailure } from '../observability/events.js';
import type { RequestLogger } from '../observability/logger.js';
import {
  type AdminDetail,
  type AdminWriteFailure,
  type AdminWriteResult,
} from './admin-shared.js';
import { writeAuditRow, type AuditActor } from './audit.js';
import { commitUpload, resolveMediaUrl } from './media.js';

// The site-settings seam (M7 #215, spec § Settings made real): the
// SINGLETON precedent — one row ever, born-empty (no row until the first
// save), full-object PUT with no per-field patching. Unset fields stay
// null on the wire; defaults live in packages/types and resolve at the
// consumers (the chrome never renders broken). The raw logo key never
// leaves: reads resolve logoImageUrl, saves ride the tri-state.

type SettingsEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

/** The row → read resolution (the #214 toBranchRead precedent): strip the
 * row's id/timestamps + the raw key, resolve the logo URL. The read type
 * is exhaustive by construction — a missed field fails typecheck. */
function toRead(row: typeof siteSettings.$inferSelect, env: SettingsEnv): SiteSettings {
  const { id: _id, logoImageKey, updatedAt: _updatedAt, ...content } = row;
  return { ...content, logoImageUrl: resolveMediaUrl(env, logoImageKey) };
}

/**
 * The public singleton read: the stored row, or the born-empty wire when
 * no row exists (every environment starts empty — live, compose, ship).
 * Defaults NEVER ride the read; resolution is the consumers' seam
 * (resolveSiteSettings in packages/types).
 */
export async function getSiteSettings(db: Database, env: SettingsEnv): Promise<SiteSettings> {
  const [row] = await db.select().from(siteSettings).limit(1);
  return row ? toRead(row, env) : EMPTY_SITE_SETTINGS;
}

// The logo commit (the resolveCover/resolveBranchCover controller
// ruling): HEAD-verify through commitUpload ONLY when a key is present —
// the tri-state makes "changed" structural (stored keys are immutable
// final keys, inputs are staging keys, and the staging-key regex rejects
// final keys, so a present string is always a new bind). undefined =
// unchanged, null = clear, string = bind/replace. A commit failure
// re-paths its details onto the payload field and resolves as the
// conflict failure (→ 400). Runs BEFORE the transaction — bucket I/O
// never holds a tx open.
async function resolveLogo(
  env: SettingsEnv,
  key: string | null | undefined,
  log?: RequestLogger
): Promise<{ ok: true; finalKey: string | null | undefined } | AdminWriteFailure> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'site-logo',
  });
  if (!commit.ok) {
    // M6 #183: the cover-commit seam's typed failure (see
    // admin-packages's resolveCover — the route-level 'conflict' cannot
    // name it).
    if (log) {
      logMediaFailure(log, { op: 'commit', reason: commit.reason });
    }
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): AdminDetail => ({ path: ['logoImageKey'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}

/**
 * The singleton full-object save: commit the logo (if any) → upsert the
 * one row in a transaction that also writes the audit row (create on the
 * first save, update after — the entity routers' semantics) → delete the
 * replaced/cleared logo's OLD object only after the commit (the #137
 * precedent: a rolled-back save never touches the bucket).
 */
export async function saveSiteSettings(
  db: Database,
  env: SettingsEnv,
  audit: AuditActor,
  input: SaveSiteSettingsInput,
  log?: RequestLogger
): Promise<AdminWriteResult<SiteSettings>> {
  const logo = await resolveLogo(env, input.logoImageKey, log);
  if (!logo.ok) return logo;
  const [existing] = await db.select().from(siteSettings).limit(1);
  // The tri-state composes the stored key: absent = keep, null = clear,
  // string = the committed final key.
  const storedLogo = logo.finalKey === undefined ? existing?.logoImageKey : logo.finalKey;
  const { logoImageKey: _inputKey, ...fields } = input;
  const saved = await db.transaction(async (tx) => {
    let row: typeof siteSettings.$inferSelect;
    if (existing) {
      const [updated] = await tx
        .update(siteSettings)
        .set({ ...fields, logoImageKey: storedLogo, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id))
        .returning();
      if (!updated) throw new Error('update site_settings: no row returned');
      row = updated;
    } else {
      const [inserted] = await tx
        .insert(siteSettings)
        .values({ ...fields, logoImageKey: storedLogo ?? null })
        .returning();
      if (!inserted) throw new Error('insert site_settings: no row returned');
      row = inserted;
    }
    await writeAuditRow(tx, audit, {
      entity: 'site-settings',
      entityId: row.id,
      action: existing ? 'update' : 'create',
      summary: null,
    });
    return row;
  });
  // After-commit bucket hygiene (#137's precedent): the replaced/cleared
  // logo's old object is deleted only AFTER the save committed.
  if (existing?.logoImageKey && storedLogo !== existing.logoImageKey) {
    await env.MEDIA_BUCKET.delete(existing.logoImageKey);
  }
  return { ok: true, row: toRead(saved, env) };
}
```

(If biome's unused-variable config rejects the `_id`/`_updatedAt`/`_inputKey` rest-destructure names, collapse that destructure into explicit per-field assignment — the `SiteSettings` types keep the mapping exhaustive either way.)

(b) Create `apps/api/src/routes/site-settings.ts` with exactly:

```ts
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { getSiteSettings } from '../services/site-settings.js';

// Public site-settings read (no session — M7 #215, the spec's read-chain
// ruling): the singleton wire, born-empty until the first save. Raw logo
// keys never leave. Chained registration (ADR-0006 Hono RPC) — see
// routes/branches.ts.
export const siteSettingsRoutes = new Hono<ApiEnv>().get('/', async (c) => {
  return c.json(await getSiteSettings(c.get('db'), c.env));
});
```

(c) Create `apps/api/src/routes/admin-site-settings.ts` with exactly:

```ts
import { saveSiteSettingsSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { logAdminMutation } from '../observability/events.js';
import { auditActor } from '../services/audit.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest } from '../services/errors.js';
import { saveSiteSettings } from '../services/site-settings.js';
import { validatedJson } from '../services/validator.js';

// The singleton full-object PUT (M7 #215) behind the admin root's one
// requireSession (401 structurally precedes this validator). The
// admin_mutation line carries entityId null — the order-PUT law: the
// singleton is family-grain on the wire (the read carries no id); the
// DURABLE audit row inside the save carries the real row id.
export const adminSiteSettings = new Hono<ApiEnv>().put(
  '/',
  validatedJson(saveSiteSettingsSchema),
  async (c) => {
    const result = await saveSiteSettings(
      c.get('db'),
      c.env,
      auditActor(c),
      c.req.valid('json'),
      c.get('logger')
    );
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'site-settings', entityId: null });
    return c.json(result.row);
  }
);
```

(d) `apps/api/src/routes/v1.ts` — the chain gains the public route (between `.route('/testimonials', testimonials)` and `.route('/admin', admin)`), plus the import `import { siteSettingsRoutes } from './site-settings.js';`:

```ts
  .route('/testimonials', testimonials)
  .route('/site-settings', siteSettingsRoutes)
  .route('/admin', admin);
```

(e) `apps/api/src/routes/admin.ts` — the chain gains the admin route after testimonials, plus the import `import { adminSiteSettings } from './admin-site-settings.js';`:

```ts
  .route('/testimonials', adminTestimonials)
  .route('/site-settings', adminSiteSettings);
```

- [ ] **Step 5: Api green + gates + the atomic commit**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run` — **29 passed + 1 skipped files (30) / 408 passed + 3 skipped** (397 + Task 2's media prefix it + the 8 suite its + the gate pin + the mutation-log pin). If a count differs, reconcile before proceeding — do not loosen assertions. Then `pnpm --filter @sevendays/api fix` (re-run), `pnpm --filter @sevendays/api typecheck`, `pnpm --filter @sevendays/types test -- --run src/audit.test.ts` (green — the amended ten-name list), and — because the audit label line rode this commit — `pnpm --filter @sevendays/admin typecheck` (green — the Record wall satisfied) and `pnpm --filter @sevendays/admin test -- --run src/lib/audit/filters.test.ts` (green — the label-map test derives its expectation from the enum). Commit:

```bash
git add packages/types/src/audit.ts packages/types/src/audit.test.ts apps/admin/src/lib/audit/filters.ts apps/api/src/services/site-settings.ts apps/api/src/routes/site-settings.ts apps/api/src/routes/admin-site-settings.ts apps/api/src/routes/v1.ts apps/api/src/routes/admin.ts apps/api/test/site-settings.test.ts apps/api/test/admin-gate.test.ts apps/api/test/admin-mutation-log.test.ts
git commit -m "feat(api): the site-settings endpoints - public GET on the read chain, the admin full-object PUT with the logo tri-state + audit row (#215)"
```

### Task 4: `packages/api-client` — the siteSettings wrappers + the mock's GET/PUT subtree

**Files:**
- Modify (test-first): `packages/api-client/test/mock-api.ts`, `packages/api-client/test/loopback.test.ts`
- Create: `packages/api-client/src/routes/site-settings.ts`
- Modify: `packages/api-client/src/routes/admin.ts`, `packages/api-client/src/index.ts`

**Interfaces:**
- Produces (what Tasks 5–6 consume): `client.siteSettings.get(): Promise<SiteSettings>` (the public read — also the admin editor's load) and `client.admin.siteSettings.update(json: SaveSiteSettingsInput): Promise<SiteSettings>`; the mock answers both so the loopback pins hold.
- Consumes: Task 2's `siteSettingsSchema`/`saveSiteSettingsSchema`/`SiteSettings`/`SaveSiteSettingsInput` (resolved from the built dist — `pnpm build:packages` ran in Task 2) and Task 3's AppType routes (the client typechecks against `@sevendays/api`'s built `app` — Task 3's typecheck already proved the chain).

**Not here:** `typing.test.ts` edits (the two loopback its exercise the wrappers end-to-end through the parse gate — the #214 typing pin existed because an existing wrapper CHANGED type; here both wrappers are new); any broken-variant mock fixture (the two new routes have no failure-posture worth a fixture — the 400 path is pinned in the api suite).

- [ ] **Step 1: Extend the mock + write the loopback pins**

(a) `packages/api-client/test/mock-api.ts` — three edits. First the fixture (after the TESTIMONIALS fixture, before the `makeApi` assembly):

```ts
// M7 #215: the born-empty singleton (the mock answers the saved state after
// any PUT — the loopback's update round-trip).
let MOCK_SITE_SETTINGS_SAVED = false;
const SITE_SETTINGS_EMPTY = {
  brandName: null,
  brandTagline: null,
  logoImageUrl: null,
  homeTitle: null,
  homeDescription: null,
  packagesTitle: null,
  packagesDescription: null,
  branchesTitle: null,
  branchesDescription: null,
  servicesTitle: null,
  servicesDescription: null,
  aboutTitle: null,
  aboutDescription: null,
  aboutStory: null,
  kickerGallery: null,
  kickerPackages: null,
  kickerServices: null,
  kickerTestimonials: null,
  socialInstagram: null,
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: null,
  bannerBody: null,
  bannerIsActive: false,
  contactEmail: null,
  contactPhone: null,
};
```

Second, inside `makeApi` after the `testimonials` sub-app: the public sub-app —

```ts
  const siteSettingsRoutes = new Hono<MockEnv>().get('/', (c) =>
    c.json(MOCK_SITE_SETTINGS_SAVED ? SITE_SETTINGS_SAVED : SITE_SETTINGS_EMPTY)
  );
```

and the admin PUT route gains a handler on the existing `admin` chain (after the print-sizes delete):

```ts
    .put('/site-settings', validatedJson(saveSiteSettingsSchema), (c) => {
      const input = c.req.valid('json');
      MOCK_SITE_SETTINGS_SAVED = true;
      const { logoImageKey: _key, ...fields } = input;
      return c.json({
        ...fields,
        logoImageUrl:
          typeof input.logoImageKey === 'string'
            ? 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-0000000000e1.jpg'
            : null,
      });
    });
```

with the module-level saved fixture beside the empty one:

```ts
const SITE_SETTINGS_SAVED = {
  ...SITE_SETTINGS_EMPTY,
  brandName: 'Sevendays Studio',
  contactEmail: 'hello@sevendays.ph',
  bannerIsActive: true,
  logoImageUrl: 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-0000000000e1.jpg',
};
```

Third, the v1 chain gains the public mount before `.route('/admin', admin)`:

```ts
    .route('/testimonials', testimonials)
    .route('/site-settings', siteSettingsRoutes)
    .route('/appointments', appointments)
```

(match the file's existing order — insert the site-settings line adjacent to the other public mounts; the exact neighbor is biome's, the mount itself is the pin) and the import block gains `saveSiteSettingsSchema` from `'@sevendays/types'` (the `validatedJson` local helper is the appointments route's).

(b) `packages/api-client/test/loopback.test.ts` — after the testimonials/gallery its, add:

```ts
it('siteSettings.get parses the born-empty singleton wire into typed data', async () => {
  const client = clientFor(mockApi);
  const settings = await client.siteSettings.get();
  expect(settings.brandName).toBeNull();
  expect(settings.bannerIsActive).toBe(false);
  expect(settings.logoImageUrl).toBeNull();
  expect('logoImageKey' in settings).toBe(false);
});

it('admin.siteSettings.update round-trips the full-object save through the parse gate', async () => {
  const client = clientFor(mockApi);
  const saved = await client.admin.siteSettings.update({
    brandName: 'Sevendays Studio',
    brandTagline: null,
    homeTitle: null,
    homeDescription: null,
    packagesTitle: null,
    packagesDescription: null,
    branchesTitle: null,
    branchesDescription: null,
    servicesTitle: null,
    servicesDescription: null,
    aboutTitle: null,
    aboutDescription: null,
    aboutStory: null,
    kickerGallery: null,
    kickerPackages: null,
    kickerServices: null,
    kickerTestimonials: null,
    socialInstagram: null,
    socialFacebook: null,
    socialTiktok: null,
    bannerTitle: null,
    bannerBody: null,
    bannerIsActive: true,
    contactEmail: 'hello@sevendays.ph',
    contactPhone: null,
    logoImageKey: 'tmp/00000000-0000-4000-8000-00000000000f.jpg',
  });
  expect(saved.brandName).toBe('Sevendays Studio');
  expect(saved.logoImageUrl).toBe(
    'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-0000000000e1.jpg'
  );
  // The mock's GET now answers the saved state — the editor's load-after-save.
  const after = await client.siteSettings.get();
  expect(after.brandName).toBe('Sevendays Studio');
});
```

Note: the born-empty it is written BEFORE the update it, and vitest runs its in file order — the module-level `MOCK_SITE_SETTINGS_SAVED` flag makes the update it order-sensitive by construction. If a future edit reorders them, switch the born-empty it to its own fresh mock (`const client = clientFor(makeApi());`).

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/api-client test -- --run` — the two new its FAIL at runtime (`client.siteSettings is not a function`). Record red.

- [ ] **Step 3: Implement the wrappers**

(a) Create `packages/api-client/src/routes/site-settings.ts` with exactly:

```ts
import type { SiteSettings } from '@sevendays/types';
import { siteSettingsSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Site-settings wrappers: GET /api/v1/site-settings (the public singleton read, M7 #215). */
export function siteSettingsRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/site-settings — the singleton wire, born-empty until the first save; logoImageUrl resolved, raw keys never present. */
    async get(): Promise<SiteSettings> {
      const res = await raw.api.v1['site-settings'].$get();
      return unwrap(res, siteSettingsSchema);
    },
  };
}
```

(b) `packages/api-client/src/routes/admin.ts` — after the `adminMedia` group (before `adminRoutes`), add:

```ts
/** Site-settings wrappers over /api/v1/admin/site-settings (the singleton full-object PUT, M7 #215). */
export function adminSiteSettings(raw: RpcClient) {
  return {
    /** PUT /api/v1/admin/site-settings — the one full-object save (no per-field patching); the refreshed read. */
    async update(json: SaveSiteSettingsInput): Promise<SiteSettings> {
      const res = await raw.api.v1.admin['site-settings'].$put({ json });
      return unwrap(res, siteSettingsSchema);
    },
  };
}
```

with the file's `@sevendays/types` import block gaining `siteSettingsSchema`, `type SaveSiteSettingsInput`, `type SiteSettings`; and the `adminRoutes` return object gains `siteSettings: adminSiteSettings(raw),` beside `media: adminMedia(raw),`.

(c) `packages/api-client/src/index.ts` — the import block gains `import { siteSettingsRoutes } from './routes/site-settings.js';`; the `ApiClient` interface gains `siteSettings: ReturnType<typeof siteSettingsRoutes>;` (beside `testimonials`); and the `createApiClient` return gains `siteSettings: siteSettingsRoutes(raw),` in the same position.

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/api-client test -- --run` — **5 files / 39 tests** (37 + the two its). `pnpm --filter @sevendays/api-client typecheck` — green. `pnpm --filter @sevendays/api-client fix` (re-run). Commit:

```bash
git add packages/api-client/src/routes/site-settings.ts packages/api-client/src/routes/admin.ts packages/api-client/src/index.ts packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts
git commit -m "feat(api-client): the siteSettings wrappers - the public get + the admin singleton update over the mock loopback (#215)"
```

### Task 5: `apps/admin` — the site-settings seam (server fns, query, state/payload/validate)

The Site tab's whole data layer, lib-seam style (the M5-seated pattern: pure seams over plain node, no component tests). The screen (Task 6) consumes only what this task produces.

**Files:**
- Create (test-first): `apps/admin/src/lib/site-settings-state.test.ts`
- Create: `apps/admin/src/lib/site-settings-state.ts`
- Modify: `apps/admin/src/lib/api.functions.ts`, `apps/admin/src/lib/admin.functions.ts`, `apps/admin/src/lib/cms-queries.ts`

**Interfaces:**
- Produces (what Task 6 consumes): `getSiteSettings` (server fn → `Promise<SiteSettings>`, the public read); `saveAdminSiteSettings({ data: SaveSiteSettingsInput }) → Promise<AdminMutationResult<SiteSettings>>`; `siteSettingsQuery.all()` (query factory); the seam — `SiteSettingsEditorState`, `siteSettingsStateFromRead(read): SiteSettingsEditorState`, `buildSiteSettingsSavePayload(state): SaveSiteSettingsInput`, `validateSiteSettingsState(state): SiteSettingsFieldErrors`, `fieldErrorsFromDetails(details): SiteSettingsFieldErrors`.
- Consumes: Task 2's `SiteSettings`/`SaveSiteSettingsInput`; Task 4's `client.siteSettings.get()`/`client.admin.siteSettings.update()`.

**Not here:** the screen (Task 6); the Account/Users tabs (#221); any pending vocabulary (#218); the logo upload loop (Task 6 — it needs the component's object URLs; the STATE fields it writes are this task's `logoImageKey` tri-state, already seam-tested here).

- [ ] **Step 1: Write the failing lib-seam tests**

Create `apps/admin/src/lib/site-settings-state.test.ts` with exactly:

```ts
import { siteSettingsSchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
// biome-ignore lint/performance/noNamespaceImport: the plan pins the `seam.*` namespace handle (the light-entity-state suite's pattern)
import * as seam from './site-settings-state';

const read = siteSettingsSchema.parse({
  brandName: 'Sevendays Studio',
  brandTagline: null,
  logoImageUrl: 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.jpg',
  homeTitle: 'Three branches. One standard of light.',
  homeDescription: null,
  packagesTitle: 'Packages',
  packagesDescription: null,
  branchesTitle: 'Branches',
  branchesDescription: null,
  servicesTitle: 'Services',
  servicesDescription: null,
  aboutTitle: 'About',
  aboutDescription: null,
  aboutStory: 'Line one.\n\nLine two.',
  kickerGallery: null,
  kickerPackages: null,
  kickerServices: null,
  kickerTestimonials: null,
  socialInstagram: null,
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: null,
  bannerBody: null,
  bannerIsActive: false,
  contactEmail: null,
  contactPhone: null,
});

describe('siteSettingsStateFromRead (read → editor state)', () => {
  it('nulls become empty strings; set values pass through; the logo key starts undefined (a read never echoes keys)', () => {
    const state = seam.siteSettingsStateFromRead(read);
    expect(state.brandName).toBe('Sevendays Studio');
    expect(state.brandTagline).toBe('');
    expect(state.aboutStory).toBe('Line one.\n\nLine two.');
    expect(state.bannerIsActive).toBe(false);
    expect(state.logoImageUrl).toBe(
      'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.jpg'
    );
    expect(state.logoImageKey).toBeUndefined();
  });
});

describe('buildSiteSettingsSavePayload (state → the full-object PUT body)', () => {
  it('empty strings map to null across every text field (unset = default), bannerIsActive carries', () => {
    const state = seam.siteSettingsStateFromRead(read);
    const payload = seam.buildSiteSettingsSavePayload({ ...state, brandName: '' });
    expect(payload.brandName).toBeNull();
    expect(payload.homeTitle).toBe('Three branches. One standard of light.');
    expect(payload.bannerIsActive).toBe(false);
  });

  it('values pass through with ends trimmed and interior newlines preserved (newlines = paragraphs)', () => {
    const payload = seam.buildSiteSettingsSavePayload({
      ...seam.siteSettingsStateFromRead(read),
      aboutStory: '  Line one.\n\nLine two.  ',
      contactPhone: ' +63 917 000 0000 ',
    });
    expect(payload.aboutStory).toBe('Line one.\n\nLine two.');
    expect(payload.contactPhone).toBe('+63 917 000 0000');
  });

  it('the logo tri-state: undefined = property ABSENT, null = explicit clear, staging string = bind', () => {
    const state = seam.siteSettingsStateFromRead(read);
    expect('logoImageKey' in seam.buildSiteSettingsSavePayload(state)).toBe(false);
    expect(seam.buildSiteSettingsSavePayload({ ...state, logoImageKey: null }).logoImageKey).toBeNull();
    expect(
      seam.buildSiteSettingsSavePayload({
        ...state,
        logoImageKey: 'tmp/00000000-0000-4000-8000-000000000002.jpg',
      }).logoImageKey
    ).toBe('tmp/00000000-0000-4000-8000-000000000002.jpg');
  });
});

describe('validateSiteSettingsState (the client-side pre-flight, mirroring the schema)', () => {
  it('a non-URL social value and a non-email contact get their field errors; valid state is clean', () => {
    const state = seam.siteSettingsStateFromRead(read);
    const bad = seam.validateSiteSettingsState({
      ...state,
      socialInstagram: 'instagram.com/sevendays',
      contactEmail: 'not-an-email',
    });
    expect(bad.socialInstagram).toBe('Enter a full URL (https://…).');
    expect(bad.contactEmail).toBe('Enter a valid email address.');
    expect(seam.validateSiteSettingsState(state)).toEqual({});
    // Empty values are unset, not invalid — no errors for blanks.
    expect(
      seam.validateSiteSettingsState({ ...state, socialInstagram: '', contactEmail: '' })
    ).toEqual({});
  });
});

describe('fieldErrorsFromDetails (the API 400 → inline field errors)', () => {
  it('maps {path, message} details onto their first path segment', () => {
    expect(
      seam.fieldErrorsFromDetails([
        { path: ['logoImageKey'], message: 'no object at the staging key' },
      ])
    ).toEqual({ logoImageKey: 'no object at the staging key' });
    expect(seam.fieldErrorsFromDetails(undefined)).toEqual({});
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/site-settings-state.test.ts` — FAILS (the module does not exist). Record red.

- [ ] **Step 3: Implement the seam**

(a) Create `apps/admin/src/lib/site-settings-state.ts` with exactly:

```ts
import type { SaveSiteSettingsInput, SiteSettings } from '@sevendays/types';
import { z } from 'zod';

// The site-settings editor seam (M7 #215, the light-entity-state pattern):
// the whole Site tab is one full-object editor over the singleton — state
// in (strings; '' = unset), the tri-state logo key, and the two
// client-side format pre-flights mirroring the API schema (the 400's
// field details land inline through fieldErrorsFromDetails).

/** The 24 free-text fields, in wire order — the keyed list both builders walk. */
const TEXT_FIELDS = [
  'brandName',
  'brandTagline',
  'homeTitle',
  'homeDescription',
  'packagesTitle',
  'packagesDescription',
  'branchesTitle',
  'branchesDescription',
  'servicesTitle',
  'servicesDescription',
  'aboutTitle',
  'aboutDescription',
  'aboutStory',
  'kickerGallery',
  'kickerPackages',
  'kickerServices',
  'kickerTestimonials',
  'socialInstagram',
  'socialFacebook',
  'socialTiktok',
  'bannerTitle',
  'bannerBody',
  'contactEmail',
  'contactPhone',
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

export type SiteSettingsFieldErrors = { [field: string]: string };

/**
 * The editor's whole state: every text field as an input string ('' =
 * unset → null on save), the banner switch, and the three-state logo
 * encoding (the #214 cover law): `logoImageUrl` is the read's resolved
 * logo (preview fallback), `undefined` = unchanged (absent from the PUT),
 * `null` = clear, string = a fresh staging key (ADR-0019) to bind on the
 * next save.
 */
export interface SiteSettingsEditorState {
  brandName: string;
  brandTagline: string;
  homeTitle: string;
  homeDescription: string;
  packagesTitle: string;
  packagesDescription: string;
  branchesTitle: string;
  branchesDescription: string;
  servicesTitle: string;
  servicesDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  aboutStory: string;
  kickerGallery: string;
  kickerPackages: string;
  kickerServices: string;
  kickerTestimonials: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTiktok: string;
  bannerTitle: string;
  bannerBody: string;
  contactEmail: string;
  contactPhone: string;
  bannerIsActive: boolean;
  logoImageUrl: string | null;
  logoImageKey: string | null | undefined;
}

/** `#215 seam: read → editor state`. Nulls become ''; `logoImageKey`
 * starts `undefined` — a read never echoes keys, so the logo is unchanged
 * until the editor says otherwise. */
export function siteSettingsStateFromRead(read: SiteSettings): SiteSettingsEditorState {
  const state = {
    bannerIsActive: read.bannerIsActive,
    logoImageUrl: read.logoImageUrl,
    logoImageKey: undefined,
  } as SiteSettingsEditorState;
  for (const field of TEXT_FIELDS) {
    state[field] = read[field] ?? '';
  }
  return state;
}

/** `#215 seam: state → the full-object PUT body`. Text: trimmed, '' →
 * null (unset → default). The logo's tri-state rides the same encoding as
 * the branch/packages covers. */
export function buildSiteSettingsSavePayload(state: SiteSettingsEditorState): SaveSiteSettingsInput {
  const payload = {
    bannerIsActive: state.bannerIsActive,
  } as SaveSiteSettingsInput;
  for (const field of TEXT_FIELDS) {
    const value = state[field].trim();
    payload[field] = value === '' ? null : value;
  }
  if (state.logoImageKey !== undefined) {
    payload.logoImageKey = state.logoImageKey;
  }
  return payload;
}

/** The two format pre-flights the API schema enforces (socials are URLs,
 * contact is an email) — surfaced inline BEFORE the save; everything else
 * (length caps) the API owns, its 400 details landing via
 * fieldErrorsFromDetails. */
export function validateSiteSettingsState(state: SiteSettingsEditorState): SiteSettingsFieldErrors {
  const errors: SiteSettingsFieldErrors = {};
  for (const field of ['socialInstagram', 'socialFacebook', 'socialTiktok'] as const) {
    const value = state[field].trim();
    if (value !== '' && !z.url().safeParse(value).success) {
      errors[field] = 'Enter a full URL (https://…).';
    }
  }
  const email = state.contactEmail.trim();
  if (email !== '' && !z.email().safeParse(email).success) {
    errors.contactEmail = 'Enter a valid email address.';
  }
  return errors;
}

/** The API's 400 field details → inline per-field errors (the
 * result-valued server fn carries `details?: unknown` across the RPC
 * boundary; this is the whole mapping). */
export function fieldErrorsFromDetails(details: unknown): SiteSettingsFieldErrors {
  if (!Array.isArray(details)) return {};
  const errors: SiteSettingsFieldErrors = {};
  for (const detail of details) {
    if (
      detail &&
      typeof detail === 'object' &&
      'path' in detail &&
      'message' in detail &&
      typeof detail.message === 'string'
    ) {
      const first = Array.isArray(detail.path) ? detail.path[0] : undefined;
      if (typeof first === 'string') {
        errors[first] = detail.message;
      }
    }
  }
  return errors;
}
```

(If biome's unsafe-cast rules reject the `as SiteSettingsEditorState` seed, initialize the 24 string fields to `''` explicitly in the seed object instead — the loop overwrites them either way.)

(b) `apps/admin/src/lib/api.functions.ts` — append (the `getBranches` pattern — public read over `getApiClient`, Sentry span per the server-fn house rule):

```ts
// M7 #215: the public singleton read — the Site tab's load (the spec's
// two-endpoint ruling: no admin GET exists; the public read IS the
// editor's load).
export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/site-settings' }, async () => {
    return getApiClient().siteSettings.get();
  });
});
```

(c) `apps/admin/src/lib/admin.functions.ts` — the `@sevendays/types` import block gains `saveSiteSettingsSchema` (schema block) and `type SiteSettings` (type block). After `saveAdminBranchUpdate`, append:

```ts
// M7 #215: the singleton full-object save — one PUT, no per-field patching.
export const saveAdminSiteSettings = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(saveSiteSettingsSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<SiteSettings>> => {
    return startSpan({ name: 'PUT /api/v1/admin/site-settings' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.siteSettings.update(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });
```

(the `saveSiteSettingsSchema` import joins the schema import block — the validator parses the payload at the RPC boundary, the branches fns' posture).

(d) `apps/admin/src/lib/cms-queries.ts` — append the factory (the `getSiteSettings` import joins the admin.functions import block):

```ts
// M7 #215: the singleton's one query — the public read the Site tab loads.
export const siteSettingsQuery = {
  all: () =>
    queryOptions({
      queryKey: ['site-settings'],
      queryFn: getSiteSettings,
    }),
};
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run` — **17 files / 195 tests** (189 + the 6 seam its). `pnpm --filter @sevendays/admin typecheck` — green (the fns + query compile against Task 4's client, whose types resolve from workspace source; `pnpm build:packages` from Task 2 keeps `@sevendays/types` current). `pnpm --filter @sevendays/admin fix` (re-run). Commit:

```bash
git add apps/admin/src/lib/site-settings-state.ts apps/admin/src/lib/site-settings-state.test.ts apps/admin/src/lib/api.functions.ts apps/admin/src/lib/admin.functions.ts apps/admin/src/lib/cms-queries.ts
git commit -m "feat(admin): the site-settings seam - server fns, the query, the state/payload/validate lib seam (#215)"
```

### Task 6: `apps/admin` — the Site tab (owner-reacted variants, then the ruled composition)

**Load the UI/UX skill set before this task's edits** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule). The Site tab is a NEW composition (no ruled predecessor to port), so the #94 amendment applies in full: **rendered variants the owner reacts to, the ruled composition lands.** The variants step settles information architecture and density only — the wiring below (query/mutation/logo loop/field machinery/toast vocabulary) is fixed regardless of which variant wins.

**Files:**
- Create (throwaway, deleted before commit): `apps/admin/src/routes/prototype-215.tsx`
- Create: `apps/admin/src/components/settings/settings-screen.tsx`
- Modify: `apps/admin/src/routes/_shell.settings.tsx`

**Interfaces:**
- Consumes: Task 5's entire seam (`siteSettingsQuery`, `saveAdminSiteSettings`, `siteSettingsStateFromRead`/`buildSiteSettingsSavePayload`/`validateSiteSettingsState`/`fieldErrorsFromDetails`, `SiteSettingsEditorState`), Task 4's client (through the fns), `SITE_SETTINGS_DEFAULTS` (placeholders), `uploadCover` + `presignAdminCoverUpload` (the #214 purpose-parameterized loop), the shared CMS primitives (`PageHeader`, `QueryErrorState`, `QUERY_ERROR_LINE`, `Skeleton`).
- Produces: the `/settings` screen — the all-staff Site tab editing all 26 fields with the full-object save contract.

**Not here:** the Account + Users tabs and the three-tab strip (#221 — this screen ships `PageHeader('Settings')` + the Site panel with a fencing comment, no empty placeholders for siblings); pending vocabulary (`Saving…`/spinner/`aria-busy` — #218's system covers this tab); dark-theme work (#217 — the screen uses tokens only, theme-ready by construction); drag-and-drop/cancel/leave-confirm for the logo upload (#220); any landing consumption (#223/#224).

- [ ] **Step 1: Render the variants (the owner reacts)**

With the skill set loaded, build the throwaway `apps/admin/src/routes/prototype-215.tsx` rendering the Site tab composition **over the seam with a mock read** (no query — inline `siteSettingsSchema.parse({...SITE_SETTINGS_DEFAULTS, brandName: 'Sevendays Studio', bannerIsActive: true, socialInstagram: 'https://instagram.com/sevendays' , contactEmail: 'hello@sevendays.ph'})`-shaped data with a few fields set so placeholders and filled values both show) in THREE variants, one under the other or behind a `?v=1|2|3` param:

- **A — single-scroll stacked sections:** the composition written out in Step 2 below (Brand → Pages → About story → Home kickers → Announcement banner → Social links → Contact, one Save in the header).
- **B — two-column at `lg`:** Brand + Pages left; story/kickers/banner/social/contact right — halves the scroll for wide screens.
- **C — compact rows:** the Pages + kickers + social + contact fields as dense label-right/input-left rows inside one Card per family (no per-field hints) — maximum density.

Screenshot each variant (light only — dark is #217's), present to the owner in-session, record the verdict + any copy/rulings verbatim in `.superpowers/sdd/2026-10-13-215-site-settings/variants.md` (frames + verdict; the #120 precedent — captured at branch `prototype/215-site-tab-variants`, commit the throwaway route there and delete it from the working tree). **The ruled composition (with the owner's adjustments) is what Step 2 lands** — the code below is variant A; re-order/adjust per the verdict, keep the wiring.

- [ ] **Step 2: Build `settings-screen.tsx` (the ruled composition)**

Create `apps/admin/src/components/settings/settings-screen.tsx`. The full wiring (composition per the verdict; variant A shown):

```tsx
// The Settings screen (M7 #215): the all-staff Site tab — the singleton
// editor over the site's words and marks. ONE full-object save (no
// per-field patching, the spec's singleton precedent); unset fields save
// null and fall back to the defaults pinned in packages/types (the
// placeholders below SHOW those defaults). The Account + Users tabs and
// the three-tab strip are #221's — this screen is header + the Site panel
// by design. Save rides today's mutation+toast vocabulary; #218's
// pending-states system covers this tab.
import type {
  MediaPresignRequest,
  MediaPresignResponse,
  SaveSiteSettingsInput,
} from '@sevendays/types';
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PageHeader, QUERY_ERROR_LINE, QueryErrorState } from '#/components/cms/shared';
import { presignAdminCoverUpload, saveAdminSiteSettings } from '#/lib/admin.functions';
import { siteSettingsQuery } from '#/lib/cms-queries';
import {
  buildSiteSettingsSavePayload,
  fieldErrorsFromDetails,
  siteSettingsStateFromRead,
  validateSiteSettingsState,
  type SiteSettingsEditorState,
  type SiteSettingsFieldErrors,
} from '#/lib/site-settings-state';
import { uploadCover, type CoverUploadStatus } from '#/lib/cover-upload';

// The keyed field lists the Cards walk (wire-order; keys are the seam's).
type TextKeys = {
  [K in keyof SiteSettingsEditorState]: SiteSettingsEditorState[K] extends string ? K : never;
}[keyof SiteSettingsEditorState];

const PAGE_SECTIONS: { title: string; fields: { key: TextKeys; label: string }[] }[] = [
  {
    title: 'Home',
    fields: [
      { key: 'homeTitle', label: 'Headline' },
      { key: 'homeDescription', label: 'Blurb' },
    ],
  },
  {
    title: 'Packages',
    fields: [
      { key: 'packagesTitle', label: 'Title' },
      { key: 'packagesDescription', label: 'Description' },
    ],
  },
  {
    title: 'Branches',
    fields: [
      { key: 'branchesTitle', label: 'Title' },
      { key: 'branchesDescription', label: 'Description' },
    ],
  },
  {
    title: 'Services',
    fields: [
      { key: 'servicesTitle', label: 'Title' },
      { key: 'servicesDescription', label: 'Description' },
    ],
  },
  {
    title: 'About',
    fields: [
      { key: 'aboutTitle', label: 'Title' },
      { key: 'aboutDescription', label: 'Description' },
    ],
  },
];

const KICKER_FIELDS: { key: TextKeys; label: string }[] = [
  { key: 'kickerGallery', label: 'Gallery kicker' },
  { key: 'kickerPackages', label: 'Featured packages kicker' },
  { key: 'kickerServices', label: 'Services kicker' },
  { key: 'kickerTestimonials', label: 'Testimonials kicker' },
];

const SOCIAL_FIELDS: { key: TextKeys; label: string }[] = [
  { key: 'socialInstagram', label: 'Instagram URL' },
  { key: 'socialFacebook', label: 'Facebook URL' },
  { key: 'socialTiktok', label: 'TikTok URL' },
];

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className='space-y-4'>
        <div>
          <h2 className='text-sm font-semibold'>{title}</h2>
          {hint ? <p className='text-muted-foreground mt-1 text-xs'>{hint}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const { data: settings, isPending, isError, refetch } = useQuery(siteSettingsQuery.all());
  const [editorState, setEditorState] = useState<SiteSettingsEditorState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SiteSettingsFieldErrors>({});

  // The logo loop (M7 #215 — the #214 Cover card ported to the 'site-logo'
  // purpose): presign → XHR PUT → the staging key rides the NEXT save.
  const [logoStatus, setLogoStatus] = useState<CoverUploadStatus>({ phase: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const logoUploading = logoStatus.phase === 'presigning' || logoStatus.phase === 'uploading';

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Seed the editor once the read lands; a later refetch never clobbers
  // in-progress edits (the editor is the source of truth once loaded).
  if (settings && editorState === null) {
    setEditorState(siteSettingsStateFromRead(settings));
  }

  async function presign(req: MediaPresignRequest): Promise<MediaPresignResponse> {
    const result = await presignAdminCoverUpload({ data: req });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data;
  }

  function handleLogoStatus(next: CoverUploadStatus) {
    setLogoStatus(next);
    if (next.phase === 'bound') {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = next.previewUrl;
      setEditorState((prev) => (prev ? { ...prev, logoImageKey: next.stagingKey } : prev));
    }
  }

  async function startLogoUpload(file: File) {
    try {
      await uploadCover(file, presign, handleLogoStatus, 'site-logo');
    } catch {
      // XHR error/abort already emitted `failed` through onStatus.
    }
  }

  function removeLogo() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setLogoStatus({ phase: 'idle' });
    // Three-state encoding: null = explicit clear on the next save.
    setEditorState((prev) => (prev ? { ...prev, logoImageKey: null } : prev));
  }

  const save = useMutation({
    mutationFn: (payload: SaveSiteSettingsInput) => saveAdminSiteSettings({ data: payload }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Saved.');
        queryClient.setQueryData(siteSettingsQuery.all().queryKey, result.data);
        // Re-seed from the saved read: the tri-state resets to unchanged
        // and a just-bound logo previews from its stored URL.
        setEditorState(siteSettingsStateFromRead(result.data));
        setLogoStatus({ phase: 'idle' });
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      } else {
        setFieldErrors(fieldErrorsFromDetails(result.details));
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isError) {
    return (
      <div className='space-y-6'>
        <PageHeader title='Settings' />
        <QueryErrorState line={QUERY_ERROR_LINE} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending || editorState === null) {
    return (
      <div className='space-y-6'>
        <PageHeader title='Settings' />
        <div className='space-y-4'>
          <Skeleton className='h-40 w-full' />
          <Skeleton className='h-64 w-full' />
          <Skeleton className='h-40 w-full' />
        </div>
      </div>
    );
  }

  function setField(key: TextKeys, value: string) {
    setEditorState((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function textField(key: TextKeys, label: string, placeholder?: string) {
    const id = `${key}-input`;
    return (
      <Field key={key}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          value={editorState[key]}
          placeholder={placeholder}
          onChange={(e) => setField(key, e.target.value)}
        />
        {fieldErrors[key] ? (
          <p className='text-destructive text-xs'>{fieldErrors[key]}</p>
        ) : null}
      </Field>
    );
  }

  function handleSave() {
    const errors = validateSiteSettingsState(editorState);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Fix the highlighted fields.');
      return;
    }
    save.mutate(buildSiteSettingsSavePayload(editorState));
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Settings'
        subline='The site’s words and marks — editable without a deploy.'
        actions={
          <Button type='button' onClick={handleSave}>
            Save changes
          </Button>
        }
      />

      <SectionCard title='Brand' hint='The wordmark, its kicker, and the logo mark both apps render.'>
        {textField('brandName', 'Brand name', SITE_SETTINGS_DEFAULTS.brandName ?? undefined)}
        {textField('brandTagline', 'Tagline', SITE_SETTINGS_DEFAULTS.brandTagline ?? undefined)}
        <div className='space-y-3 rounded-lg border p-4'>
          <p className='text-sm font-medium'>Logo</p>
          {/* Preview precedence (the packages editor's law): a fresh bound
              upload shows the local object URL; a pending removal shows the
              placeholder; else the read's logoImageUrl; else the placeholder. */}
          {logoStatus.phase === 'bound' ? (
            <img
              src={logoStatus.previewUrl}
              alt={`${editorState.brandName || 'Studio'} logo`}
              className='bg-muted grid h-24 w-24 place-items-center rounded-md object-contain p-2'
            />
          ) : editorState.logoImageKey === null ? (
            <div className='bg-muted text-muted-foreground grid h-24 w-24 place-items-center rounded-md'>
              <Image aria-hidden='true' className='size-8' />
            </div>
          ) : editorState.logoImageUrl ? (
            <img
              src={editorState.logoImageUrl}
              alt={`${editorState.brandName || 'Studio'} logo`}
              className='bg-muted h-24 w-24 rounded-md object-contain p-2'
            />
          ) : (
            <div className='bg-muted text-muted-foreground grid h-24 w-24 place-items-center rounded-md'>
              <Image aria-hidden='true' className='size-8' />
            </div>
          )}
          <div className='flex items-center gap-2'>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) {
                  void startLogoUpload(file);
                }
              }}
            />
            <Button
              variant='outline'
              type='button'
              disabled={logoUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload logo
            </Button>
            <Button variant='ghost' type='button' disabled={logoUploading} onClick={removeLogo}>
              Remove logo
            </Button>
          </div>
          {logoStatus.phase === 'presigning' ? (
            <p className='text-muted-foreground text-xs'>Presigning…</p>
          ) : null}
          {logoStatus.phase === 'uploading' ? (
            <p className='text-muted-foreground text-xs'>
              Uploading…{' '}
              {logoStatus.total > 0
                ? Math.round((logoStatus.sent / logoStatus.total) * 100)
                : 0}
              %
            </p>
          ) : null}
          {logoStatus.phase === 'bound' ? (
            <p className='text-muted-foreground text-xs'>Logo ready — save to bind it.</p>
          ) : null}
          {logoStatus.phase === 'failed' ? (
            <p className='text-destructive text-xs'>Upload failed: {logoStatus.message}</p>
          ) : null}
          <p className='text-muted-foreground text-xs'>JPG only, up to 50 MiB.</p>
        </div>
      </SectionCard>

      <SectionCard
        title='Pages'
        hint='Titles drive each page’s heading and browser tab (the brand name appends automatically); descriptions render as sub-copy. Empty fields keep today’s copy.'
      >
        <div className='space-y-6'>
          {PAGE_SECTIONS.map((section) => (
            <div key={section.title} className='space-y-3'>
              <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                {section.title}
              </p>
              {section.fields.map((field) => textField(field.key, field.label))}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title='About story' hint='Plain paragraphs — each line becomes a paragraph on the page.'>
        <Field>
          <FieldLabel htmlFor='aboutStory-input'>Story</FieldLabel>
          <Textarea
            id='aboutStory-input'
            rows={8}
            value={editorState.aboutStory}
            placeholder={SITE_SETTINGS_DEFAULTS.aboutStory ?? undefined}
            onChange={(e) => setField('aboutStory', e.target.value)}
          />
        </Field>
      </SectionCard>

      <SectionCard title='Home section kickers' hint='The small label above each home section.'>
        {KICKER_FIELDS.map((field) =>
          textField(
            field.key,
            field.label,
            SITE_SETTINGS_DEFAULTS[field.key] ?? undefined
          )
        )}
      </SectionCard>

      <SectionCard title='Announcement banner' hint='Off renders nothing anywhere.'>
        <label htmlFor='bannerIsActive-input' className='flex items-center gap-2 text-sm font-medium'>
          <Checkbox
            id='bannerIsActive-input'
            checked={editorState.bannerIsActive}
            onCheckedChange={(checked) =>
              setEditorState({ ...editorState, bannerIsActive: checked === true })
            }
          />
          Show the announcement banner
        </label>
        {textField('bannerTitle', 'Banner title')}
        {textField('bannerBody', 'Banner text')}
      </SectionCard>

      <SectionCard title='Social links' hint='Leave empty to hide the icon.'>
        {SOCIAL_FIELDS.map((field) => textField(field.key, field.label, 'https://…'))}
      </SectionCard>

      <SectionCard
        title='Contact'
        hint='The footer’s brand-level contact block; branch phones stay branch-owned.'
      >
        {textField('contactEmail', 'Studio email')}
        {textField('contactPhone', 'Studio phone')}
      </SectionCard>
    </div>
  );
}
```

(House caveats the executor resolves without a plan round-trip: if the screen's render-time seeding (`if (settings && editorState === null) setEditorState(...)`) trips React's set-state-in-render rule under the installed React version, move the seed into a `useEffect` on `settings` with an `editorState === null` guard — same semantics; if `Textarea`'s export path differs, follow the primitive's own file; biome's `fix` owns final formatting. The variant-verdict adjustments from Step 1 re-order these Cards — the wiring stays byte-for-byte.)

- [ ] **Step 3: The route swap**

`apps/admin/src/routes/_shell.settings.tsx` — the whole file becomes:

```tsx
// The settings route (M7 #215): the gated shell's settings entry point —
// the Site tab today (all-staff content per ADR-0018). The Account/Users
// tabs + the three-tab strip are #221's restructuring of this screen.
import { createFileRoute } from '@tanstack/react-router';
import { SettingsScreen } from '#/components/settings/settings-screen';

export const Route = createFileRoute('/_shell/settings')({
  head: () => ({ meta: [{ title: 'Settings | Sevendays Admin' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return <SettingsScreen />;
}
```

Delete the throwaway `prototype-215.tsx` (it lives only on the `prototype/215-site-tab-variants` branch).

- [ ] **Step 4: Verify in dev + gates + commit**

`pnpm --filter @sevendays/admin dev` (or the running stack): sign in, open `/settings` — the born-empty wire renders every input with its default placeholder; set `Brand name` + toggle the banner + Save → `Saved.` toast; reload → the values persist; upload a logo (JPG) → `Logo ready — save to bind it.` → Save → the stored URL previews after the re-seed; Remove logo → Save → back to the placeholder. Record the frames in the evidence dir. Then the gates: `pnpm --filter @sevendays/admin test -- --run` — **17 files / 195 tests** (unchanged from Task 5 — no new lib tests); `pnpm --filter @sevendays/admin typecheck`; `pnpm --filter @sevendays/admin fix` (re-run). Commit (NEVER `git add apps/admin/package.json` — the owner's uncommitted dev-port change stays unstaged):

```bash
git add apps/admin/src/components/settings/settings-screen.tsx apps/admin/src/routes/_shell.settings.tsx
git commit -m "feat(admin): the Site tab - the all-staff settings screen, the ruled composition, the site-logo upload (#215)"
```

### Task 7: Gates, docs rotation, PR/merge, the v1 pick, the ledger row, issue close

**Files:**
- Modify: `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/` (via `graphify update .`)

**Interfaces:**
- Consumes: everything Tasks 1–6 landed; the spec's v1-pick class ledger row ("Site settings (schema, public GET, admin PUT, both apps' consumption) | **PICK clean** | Additive CMS + read chain; defaults-in-code keeps v1 rendering before any content exists").

**Not here:** the "Both apps — site settings consumed" plan.md box (stays unticked — #223/#224 land the chrome consumption); the M7 close-out's exit verification + reflection scenario (#225); `docs/staff-provisioning.md` (#221/#222's demotion); any landing file.

- [ ] **Step 1: The full-repo gate**

`pnpm build:packages` (fresh), then `pnpm check` — **everything green, floors: types 16/158, api 29 passed + 1 skipped files (30) / 408 passed + 3 skipped, api-client 5/39, admin 17/195, landing 9/84, db 4 files.** (Executor reconciles actuals per the Global Constraints rule — a mismatch is investigated, never loosened.) Then `pnpm build` (the deploy-shape build — CI runs it).

- [ ] **Step 2: Docs rotation (pre-PR)**

(a) `docs/plan.md` — the M7 box `- [ ] API + admin + landing — site settings (#160 amendment): the singleton site_settings table (...)` becomes `- [✅]` with the landed annotation appended:

```text
 _(2026-10-XX, #215: migration 0011 — the born-empty singleton; the public `GET /api/v1/site-settings` on the read chain + the admin full-object PUT behind requireSession (the singleton precedent); the logo through the ADR-0019 pipeline under the `'site-logo'` purpose (brand/ prefix, tri-state binding); `SITE_SETTINGS_DEFAULTS` + `resolveSiteSettings` pinned verbatim in packages/types (defaults never ride the wire); the all-staff Site tab at /settings; the audit entity widens to 'site-settings' — both apps' chrome consumption rides the redesign tickets, the unticked box below)_
```

The "Both apps — site settings consumed" box stays `- [ ]` (its annotation note rides #223/#224).

(b) `docs/progress.md` — insert at the top of the dated entries, in the file's established voice:

```text
2026-10-XX — #215, M7 ticket 04, site settings live: the site's words and marks are content, not code — the singleton `site_settings` store (migration 0011, born-empty: no row until the first save, every content column nullable) carrying brand (logo/name/tagline), the five pages × title/description, the About story (plain paragraphs — newlines = paragraphs), social links, the announcement banner, the four home kickers (the KICKERS set), and the brand contact block. The wire: public `GET /api/v1/site-settings` on the v1 read chain + the admin full-object `PUT /api/v1/admin/site-settings` behind the one requireSession root (the singleton precedent — one save, no per-field patching, no DELETE, no admin GET: the public read IS the editor's load); the logo binds through the new `'site-logo'` presign purpose (the brand/ prefix — a logo is not a cover) with the #214 tri-state encoding (absent/null/staging → unchanged/clear/bind-replace, the old object deleted only post-commit, commit failures re-pathed onto logoImageKey); the born-empty law holds end to end — GET answers `EMPTY_SITE_SETTINGS` verbatim, defaults never ride the wire, and today's copy is pinned verbatim as `SITE_SETTINGS_DEFAULTS` + the shared `resolveSiteSettings` seam in packages/types (the landing consumes at #223/#224). The audit vocabulary widens to ten (`'site-settings'`: create on the first save, update after, summary null; the ephemeral admin_mutation line carries entityId null per the order-PUT law; the #188 viewer gains the 'Site settings' label). The all-staff Site tab at /settings (owner-reacted variants ruled the composition) edits every field — the mapped Cards + the ported logo block + the full-object save over the session-scoped fn; #218's pending system covers its Save later. Floors: types 16/158, api 29+1 skipped files/408+3 skipped, api-client 5/39, admin 17/195, landing 9/84 unchanged; plan.md's site-settings box ticked (the consumption box stays for the redesign). v1: PICK clean per the spec's class ledger (additive CMS + read chain; defaults-in-code keeps v1 rendering before any content exists).
```

(c) `AGENTS.md` — surgical amendments: (1) in the big status paragraph, after the audit-log viewer sentence, add one sentence: "Site settings are live (M7 #215): the born-empty singleton `site_settings` store behind the public `GET /api/v1/site-settings` (read chain) + the admin full-object PUT (the singleton precedent — logo binding via the `'site-logo'` purpose under `brand/`, the tri-state encoding), with today's copy pinned as `SITE_SETTINGS_DEFAULTS` + `resolveSiteSettings` in packages/types (unset fields default in code — defaults never ride the wire; both apps' chrome consumption rides the redesign tickets) and the all-staff Site tab at /settings editing every field." (2) the media-seam sentence's "under three media purposes (package-cover, branch-cover, gallery-photo)" becomes "under four media purposes (package-cover, branch-cover, site-logo, gallery-photo)". (3) the audit sentence's "across the nine entity routers plus the media commit" becomes "across the nine entity routers, the media commit, and the site-settings singleton save". (4) the "Current status of `pnpm test`" floors update to the Step-1 numbers. Keep every edit minimal — AGENTS.md reaches v1 via the pick's client-safe-hunk rule, and these lines are mechanics-free.

- [ ] **Step 3: PR + squash merge**

```bash
git add docs/plan.md docs/progress.md AGENTS.md
git commit -m "docs: the #215 close-out - the M7 site-settings box ticked, floors rotated (#215)"
gh pr create --title "feat: site settings — the singleton store, the endpoints, the Site tab (#215)" --body "Implements #215 (M7 ticket 04; spec § Settings made real, the Site bullet). Migration 0011 (born-empty singleton) + the site-settings wire with verbatim code defaults + resolveSiteSettings; public GET on the read chain + the admin full-object PUT behind requireSession (the singleton precedent, the 'site-logo' purpose, the tri-state logo, the audit row); the api-client wrappers; the admin seam + the all-staff Site tab (owner-reacted variants). Floors: types 16/158, api 30 files/408+3, api-client 5/39, admin 17/195." --base main
```

Squash-merge (the repo's standing style), note the squash SHA, and close #215 with a comment summarizing the four ACs as landed (round-trip + born-empty defaults pinned in api+types / the Site tab edits every field with the full-object save / logo via the pipeline + defaults in code / public GET on the read chain, active on both editions at pick).

- [ ] **Step 4: The v1 pick (post-merge, per docs/agents/v1-picks.md)**

`node scripts/v1-triage.mjs <squash-sha>` — expected verdict: **PICK clean** (the spec's class ledger pre-ruled it; every path is v1-safe — all new files plus additive edits to shared barrels/routes/fns; no booking-cluster path, no transformed surface in the diff). Execute per the runbook (`cd ~/Projects/sevendays-v1-seed && git switch v1 && git pull --ff-only origin v1 && git fetch origin main && git cherry-pick -x <squash-sha>`) — no conflicts expected; if one appears, it is by definition a surprise against this plan's prediction: resolve per the runbook's conflict policy and record the deviation in the ledger row. Then the locks: `pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build`, `pnpm check && pnpm build`, `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` (exit 0 — no booking token rides this ticket), push, `gh run watch` — `check: success`, `Deploy v1 (private): success`, `Deploy teaser (main): skipped`.

- [ ] **Step 5: The ledger row + graphify + close-out**

(a) `docs/agents/v1-picks.md` — append the ledger row (a main PR — itself a skip), in the table's established voice, recording: **#215 — pick clean** — site settings picked whole (migration 0011, types defaults + wire, api endpoints + audit widening, api-client wrappers, admin seam + Site tab, docs hunks client-safe and landed), no conflicts, v1's floors matching main's (types 16/158, api +10, api-client +2, admin +6), the birth of v1's only-ever public settings read (born-empty — v1 renders today's defaults before any content exists).

(b) `graphify update .` (code was modified — AGENTS.md rule). Commit the ledger row + any docs follow-ups:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #215 ledger row - the site-settings pick (clean, additive CMS + read chain; defaults-in-code carries v1's born-empty render)"
```

(c) Post-merge live check (the owner's eyeball, offered not blocked-on): the compose stack answers `GET /api/v1/site-settings` with the born-empty wire, and the admin `/settings` round-trips a save + logo upload end to end.
