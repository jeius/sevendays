# M7 Ticket 03 — Branch Covers + Gallery Captions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **The UI-bearing tasks (5, 6) load the installed UI/UX skill set at execution time: `prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant (AGENTS.md rule, spec #94 amendment, ruled in #111) — both tasks are verbatim ports of already-ruled compositions (the packages editor's Cover card onto the branch Sheet; the ruled `CoverPanel` onto BranchCard; a muted caption line inside the about wall's existing figcaption family), so NO owner-reacted rendered-variants round is required (the #94 amendment gates *new compositions*; none is created here — the redesign tickets #223/#224 render-react these surfaces on the ruled direction).**

**Goal:** Branches wear the studio's real photographs and the gallery carries its stories (ticket #214, spec § *The landing redesign — spec items inherited from the prototype*): the `branches` table gains a nullable `cover_image_key` (migration 0010) per the packages-covers precedent — presence-encoded upload through the existing ADR-0019 presign/commit pipeline under a NEW `'branch-cover'` media purpose, admin create/update carrying the tri-state cover (`undefined` = unchanged, `null` = clear, staging string = bind/replace with the old object deleted only after the DB commit), the guarded DELETE from #213 extended so a deleted branch's cover object goes with it, and every branches read (public AND admin) resolving `coverImageUrl` — **raw keys never leave the API at any layer**; the landing `/branches` card wears the ruled `CoverPanel` (null falls back to today's initials placeholder verbatim). Gallery captions: the `caption` column ALREADY exists in the DB and on the admin wire (M5) — this ticket puts it on the **public gallery wire** (`publicGalleryPhotoSchema.caption`), passes it through the batch-upload tray's commit seam (null at enqueue — pre-commit metadata editing stays ruled out), and the `/about` walls render it when present (nothing extra renders on null). The M7 roadmap box "Schema + admin + API — branch covers … + gallery captions" at `docs/plan.md` **is ticked by this ticket** (a solo box — no sibling fence on the tick).

**Architecture:** Seven tasks: (1) `packages/db` — `branches.cover_image_key` lands nullable, `db:generate` produces migration `0010` (verified to contain exactly one `ADD COLUMN` and nothing else), `db:migrate` applies it to the live shared DB, and a read-only `information_schema` probe proves the column nullable; (2) the branch-cover wire lands atomically across `packages/types` (branch.ts: row schema + the new `branchReadSchema`/`BranchRead` + presence-encoded create + tri-state update; media.ts: the enum widens) and `apps/api` (`FINAL_PREFIXES` gains `'branch-cover': 'covers'`, the public `listBranches` resolves, `admin-entities.ts` branches CRUD grows the cover commit + post-commit old-key delete, `admin-delete.ts` deletes the cover object, both routes thread `c.env`) with the new 11-it `branch.test.ts` contract suite + ten api suite pins; (3) the caption's public half — `publicGalleryPhotoSchema` + `getPublicGallery` carry `caption`, two pins (types + api); (4) `packages/api-client` — the branches wrappers (public + admin) switch to `branchReadSchema`/`BranchRead`, the mock gains `coverImageUrl`/`caption`, the loopback + typing pins extend; (5) `apps/admin` — `uploadCover` grows its purpose parameter, `light-entity-state.ts`'s branch seam grows the cover state + the create/update builder split, the branches Sheet gains the Cover block (ported from the packages editor), the batch tray's commit passes the item's caption through, five lib-seam pins; (6) `apps/landing` — `BranchCard` wears `CoverPanel`, the about wall renders captions, the `Branch → BranchRead` type ripple + four fixture files update, one caption-passthrough pin; (7) gates + docs rotation (the solo M7 box TICKED, progress + AGENTS floors) + PR/merge + the v1 pick (pre-ruled **PICK clean** by the spec's class ledger, executed as a paths-split: the booking-cluster type ripple drops; `branch-card.tsx` + the api-client mocks are transformed surfaces) + ledger row + issue close + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes, **one migration** — drizzle-orm 0.45.2 + drizzle-kit (the existing `db:generate`/`db:migrate` scripts over `DATABASE_MIGRATE_URL` in `packages/db/.env` — present, probed 2026-10-12 by the #212 session), zod 4.5.1 (`.omit(...).extend(...)` presence-encoding, the `updateServicePackageSchema` precedent), hono 4.13.5 (chained registrations — every edit below stays inside an existing chained expression), the existing `Field`/`FieldLabel`/`Input`/`Button`/`Image` primitives (the packages editor's cover block ports onto them), vitest 4 per-package, pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#214 "M7 ticket 03: branch covers + gallery captions"](https://github.com/jeius/sevendays/issues/214) (label `ready-for-agent`), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *The landing redesign — direction and surfaces*, bullet **"Spec items inherited from the prototype (ruled there, built here)"** is this ticket's ruling: *"branch covers — a `cover_image_key` on branches (schema), admin upload, API wire resolution, all per the packages-covers precedent (the prototype judged via a stand-in seam); gallery captions — the admin `caption` field onto the public gallery wire and the batch-upload tray, walls rendering captions when present"*; User Stories 17–18 are its acceptance). Key recon facts (2026-10-13, main `bf613bc` — post-#213; every file below read this session):

- **The covers precedent this ticket copies (landed code, read in full):** `packages/db/src/schema/service-packages.ts:26` — `coverImageKey: text('cover_image_key')`, nullable, no default. `packages/types/src/package.ts` — the row schema keeps `coverImageKey: z.string().nullable()` (line 18); the canonical read is `servicePackageReadSchema = servicePackageSchema.omit({ coverImageKey: true }).extend({ coverImageUrl: z.url().nullable() })` (193–197); create is presence-encoded (`coverImageKey: z.string().min(1).optional()`, 89 — "Absent = no cover at create"); update is the tri-state (`.extend({ coverImageKey: z.string().min(1).nullable().optional() })`, 147 — string = bind/replace via a fresh staging key, null = clear, absent = unchanged). `apps/api/src/services/admin-packages.ts` — `resolveCover` (151–178: commit ONLY when a key is present, failure details re-pathed onto `['coverImageKey']`, resolves as the `conflict` failure → 400; runs BEFORE the transaction); the save captures `oldCoverKey` (223), composes `storedCover = args.finalKey === undefined ? current.coverImageKey : args.finalKey` (248), and deletes the old object ONLY after the commit (429–432: `if (oldCoverKey && storedAfter !== oldCoverKey) await env.MEDIA_BUCKET.delete(oldCoverKey)`); reads resolve through `toRead` (67–71, `resolveMediaUrl`). Routes thread `c.env` (structurally `SaveEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>`) and `c.get('logger')` on writes — `admin-service-packages.ts:23–72` is the route shape.
- **The media seam:** `packages/types/src/media.ts:11` — `mediaPurposeSchema = z.enum(['package-cover', 'gallery-photo'])`; widening is types-only BUT `apps/api/src/services/media.ts:25–28` has `const FINAL_PREFIXES: Record<MediaPurpose, string>` — a hard typecheck wall that forces the prefix in the same commit as the enum (the #213 Task-1 pairing rule). This ticket maps **`'branch-cover': 'covers'`** — branch covers share the covers/ prefix (one immutable-cover directory; the purpose still names its owner for the presign contract). `resolveMediaUrl` (media.ts:207–212) is the only key→URL site. `commitUpload` head-verifies staging keys (`tmp/<hex-uuid>.jpg` only — final keys are refused), enforces the 50 MiB/image-jpeg caps, promotes, deletes staging. The presign server fn `presignAdminCoverUpload` (admin.functions.ts:145–172) is **purpose-generic** — the #139-historical name; its validator is `mediaPresignRequestSchema`, so `'branch-cover'` needs zero server-fn change. The admin cover loop `uploadCover` (apps/admin/src/lib/cover-upload.ts:45–112) hard-codes `purpose: 'package-cover'` at line 67 — it gains a defaulted purpose parameter (Task 5).
- **The caption ground truth (what already exists vs. what's missing):** `gallery_photos.caption` EXISTS (schema/gallery-photos.ts:25); the admin wire already carries it (`galleryPhotoSchema.caption` :39, create :56, update :69); the admin photo editor already edits + saves it (`gallery-state.ts` — `PhotoEditorState.caption`, `photoStateFromRead` :40, `buildPhotoPayload` :56 empty→null, `buildPhotoFlipPayload` :74; the Sheet's caption input at gallery-screen.tsx:680). MISSING: the public wire (`publicGalleryPhotoSchema` :99–104 has no caption; `getPublicGallery` selects/pushes without it — services/gallery.ts:27–46), the batch tray's commit adapter hard-codes `caption: null` (gallery-screen.tsx:903), and the walls render nothing (about.tsx:104–108 renders title only). The spec's Out of Scope rules pre-commit metadata editing stays out — so the tray's caption is a **pass-through seam** (BatchItem carries it, null at enqueue), never an input.
- **The branch wire today (the leak this ticket closes):** `services/branches.ts listBranches(db)` returns **raw rows** and `routes/branches.ts` `c.json`s them — once the column exists, the raw `coverImageKey` would leak onto the public wire (nothing pins the public field set today; Task 2's pins close that). The admin branches reads return raw `BranchRow` too (admin-entities.ts:58–66). The admin api-client wrappers parse `branchSchema` at four sites (src/routes/admin.ts:234–252) and the public wrapper once (src/routes/branches.ts:12) — all five switch to `branchReadSchema`. **No test sends a cover field today** (every branches POST/PUT body in branches.test.ts:68–74/130–136 + admin-entities.test.ts:87–91/115–119/139–145/162/177–182 is the five-field set) — the optional/absent encoding keeps them green verbatim.
- **The #213 delete seam this extends:** `deleteAdminBranch(db, audit, id)` (admin-delete.ts:201–231) has NO env and NO bucket call — branches had no cover when it landed. It gains `env` + the post-commit cover-object delete (route `admin-branches.ts:61–72` passes `c.env`). ADR-0019 §5 + the #137 precedent: DB commit first, then the object delete.
- **The branch editor seam (what Task 5 ports):** `light-entity-state.ts` — `BranchEditorState` (:33–39), `branchStateFromRead` (:95–103), `newBranchState` (:109–117), `buildBranchPayload` (:125–133, ONE builder serving create+update today), `buildBranchFlipPayload` (:142–150). The packages seam it copies: `package-editor-state.ts` — state carries `coverImageUrl: string | null` + `coverImageKey: string | null | undefined` (:59–60, the tri-state comment :45–47); `editorStateFromRead` sets `coverImageKey: undefined` (:138–139 — "a read never echoes keys"); `buildCreatePayload` includes the key ONLY when a string (:226); `buildUpdatePayload` when `!== undefined` (:243); `buildRowFlipPayload` deliberately ABSENTs it (:254–256). The editor UI: package-editor.tsx's Cover card (:843–921 — preview precedence bound-upload → pending-removal placeholder → read URL → placeholder; Upload/Remove buttons; the four status lines; "JPG only, up to 50 MiB."), the cover loop handlers (:488–529 — presign adapter, `handleUploadStatus` binding `stagingKey` + revoking the replaced preview URL, `removeCover` setting null), and the preview-URL revoke-on-unmount effect (:316–320). The branches editor is the `LightEntityEditor` Sheet (branches-screen.tsx:511–582; the shell at cms/shared.tsx:461 takes plain children).
- **The landing render sites (grep-verified complete):** branches render at FIVE places — `/branches` `BranchCard` (components/branch-card.tsx:15–45, the cover site), `/book` step-1 `ChoiceCard` children (routes/book.tsx:127–146 — **stays text-only**: the wizard's visuals are the redesign's #223 payload, and the wire type flows without a JSX change), the confirmation name join (booking.$id.tsx:68–72 via `branchNameFor` — name-only), `/services` chips (`bookableBranchNames` — name-only), and the orphaned `branch-strip-item.tsx` (imported nowhere — untouched). The fetch chain is `getBranches` (lib/api.functions.ts:7–14) → `branchQueries.all()` (lib/queries.ts:14–20) → the client wrapper — types flow, zero fetch edits. `CoverPanel` (components/cover-panel.tsx:12–42) self-boxes at `h-40 w-full rounded-lg` — the BranchCard insertion is one element with no `className`. The gallery wall tile is about.tsx:92–110 (title-only figcaption today).
- **The blast radius every fixture edit (swept, exact):** `branchSchema` gaining the required-nullable `coverImageKey` + the wire switching to `BranchRead.coverImageUrl` breaks, by file — packages/types: none (branch.ts had NO test file; the new suite is Task 2's); apps/api: none (branches fixtures insert explicit columns, fixtures.ts:58–75; reads assert per-property); packages/api-client: `test/mock-api.ts` BRANCHES rows (:10–29, missing both fields) fail `branchSchema.array()` in loopback.test.ts:22–29 after Task 2 — Task 4 fixes; apps/admin: `light-entity-state.test.ts:16–25` parses `branchSchema.parse({...})` with no cover field (fails after Task 2) and its branch round-trip it (:46–63) `toEqual`s the five-field payload — Task 5 re-seats both; apps/landing: `booking.test.ts:38–49`, `bookable-branches.test.ts:5–16`, `booking-read.test.ts:65–76` build full `Branch` literals (typecheck fails after Task 2) + `gallery-tabs.test.ts` `photo()` fixture (:10–18) misses caption — Task 6 fixes. **The seed is safe by construction**: seed.ts:80–93 upserts branches by name with explicit columns (drizzle omits the new one; the conflict `set:` never nulls it — the packages precedent comment at seed.ts:181–183 is the template); `scripts/seed-v1/` contains no branch inserts (it is the git-history filter ruleset, not a SQL seed); the gallery tables are CMS-born-empty (no photo seeds).
- **Sibling fences (spec § Sequencing; docs/plan.md M7 block):** NOT here, regardless of temptation: the **landing redesign's branch surfaces** (cover strips with walk-in tooltips, variant-split CTAs — #223/#224 re-render BranchCard and the walls on the ruled direction; this ticket binds the ruled `CoverPanel` onto TODAY's card and the redesign re-composes around it); the **booking wizard's branch step** (stays text-only — a booking surface, main-only at pick time, and its visual maturation is the redesign's); **site settings' logo upload** (#215 — the brand logo is its OWN presign purpose later, not a branch cover); the **CMS-wide interaction system** (#218 — the branch Sheet ports the CURRENT save flow verbatim: `onSave` stays sync, the `editorNonce` machinery stays, no pending vocabulary; #218 deletes that machinery later, taking the cover block with it); the **packages expanded row** (#219); **dark mode** (#216); the **upload UI maturation** (#220 — no drag-and-drop/cancel/leave-confirm in the branch editor); **caption editing in the batch tray** (ruled out — Out of Scope "Pre-commit metadata editing in uploads"); the **testimonial form** (#216's neighbor #216/#215 family); `apps/admin/package.json` (the owner's uncommitted dev-port change rides above the branch — never staged).
- **Baselines (live, per AGENTS.md post-#213):** types **14 files / 129 tests**; api **27 passed + 1 skipped files (29) / 388 passed + 3 skipped**; api-client **5 files / 37 tests**; admin **17 files / 184 tests**; landing **9 files / 83 tests**; db **4 files** (catalog-rows, client-transaction, migrate, verify-appointment-row). After this ticket: **types 15 / 143** (+11 branch.test.ts, +1 media.test.ts, +2 gallery.test.ts), **api 28 passed + 1 skipped files (29) / 397 passed + 3 skipped** (+9: branches.test +1, admin-entities +5, admin-delete +1, services/media.test +1, public-reads +1 — no new files), **api-client 5 / 37** (extended its + typing edits, none added), **admin 17 / 189** (+1 cover-upload, +3 light-entity-state, +1 batch-photo-upload), **landing 9 / 84** (+1 gallery-tabs caption pin). Migrations **0000–0009** applied; this ticket generates **0010**. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)
- **The dev-db port wrinkle (this machine, verified 2026-10-12 via the #212/#213 sessions):** an unrelated project's container (`lactalink-test-db`) squats host port 5432. The sevendays compose db runs remapped: `printf 'services:\n  db:\n    ports: !override\n      - "5433:5432"\n' > /tmp/sevendays-db-port.yml && docker compose -f compose.yaml -f /tmp/sevendays-db-port.yml up -d db`, and every api test command prefixes `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test'`. If 5432 is free in the executor's session, plain `docker compose up -d db` and no prefix. **Never** point the suite at the lactalink container.

## Global Constraints

- **Branch & baseline:** `feat/214-branch-covers-gallery-captions` off main `bf613bc` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#214)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, migration SQL, probe output) lands in gitignored `.superpowers/sdd/2026-10-13-214-branch-covers-gallery-captions/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (zod/drizzle/hono all installed). Every task commits only with the checks green **for the packages it touched** (AGENTS.md's letter); the per-task commands are pinned below. **Expected red windows between tasks (the #212 precedent — do not "fix" them out of order):** after Task 2, `apps/api`'s api-client/admin/landing consumers are red (the wire changed underneath them) until Tasks 4–6 land their halves — each of those tasks' own gates include the now-green upstream suites. After any `packages/types/src` edit, run `pnpm build:packages` before downstream typecheck/tests (dist/ is gitignored; turbo `typecheck` builds `^` but `test` does not). The api suite needs the compose db (the port recipe above). Biome canonical form via `pnpm --filter <pkg> fix` before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (Task 7 — code was modified).
- **The wire law (spec-ruled, binding):** the raw R2 object key **never leaves the API at any layer** — every branches read (public `GET /api/v1/branches`, admin list/get/create/update) resolves `coverImageUrl: string | null` via `resolveMediaUrl`; the read shape is `branchReadSchema` (omit `coverImageKey`, extend `coverImageUrl`), exactly the `servicePackageReadSchema` precedent. Input presence-encoding: create `coverImageKey?: string` (absent = no cover); update `coverImageKey?: string | null` (absent = unchanged, `null` = clear, string = a fresh staging key). The staging-key regex (`tmp/<hex-uuid>.jpg`) structurally guarantees a present string is always a new bind — stored keys are final keys and can never ride the commit path.
- **The object-lifecycle law (ADR-0019 §5 + the #137 precedent, binding):** the cover commit (HEAD-verify → caps → promote → delete staging) runs BEFORE the write transaction — bucket I/O never holds a tx open; the write stores the FINAL key; the replaced/cleared cover's OLD object is deleted ONLY after the transaction committed (`if (oldCoverKey && storedAfter !== oldCoverKey) await env.MEDIA_BUCKET.delete(oldCoverKey)`) — a rolled-back save never touches the bucket; a deleted branch's cover object deletes post-commit the same way. Guards/validations that fail record no audit row and never touch the bucket.
- **The media purpose (binding):** `'branch-cover'` maps to the shared **`covers/`** final-key prefix — one immutable-cover directory, the purpose names its owner. `FINAL_PREFIXES` and the enum widen in the SAME commit (the `Record<MediaPurpose, string>` typecheck wall — the #213 Task-1 pairing rule).
- **The caption law (spec-ruled, binding):** the public wire carries `caption: string | null` (required key, nullable — mirrors `title`); walls render the caption when present and **nothing extra when null** (no placeholder); the batch tray's caption is a pass-through seam — `BatchItem` carries `caption: string | null`, captured at enqueue as `null` (the category-at-enqueue / title-from-filename rulings stand; NO editing UI — pre-commit metadata editing is Out of Scope); the admin photo editor's caption editing (M5) is untouched.
- **The cover UI copy (ported verbatim from the ruled packages editor, binding):** the branch Sheet's cover block carries `Cover` / `Upload cover` / `Remove cover` / `Presigning…` / `Uploading… N%` / `Cover ready — save to bind it.` / `Upload failed: {message}` / `JPG only, up to 50 MiB.` and the packages editor's preview precedence (bound object URL → pending-removal placeholder → read `coverImageUrl` → placeholder). The landing insertion is the ruled `CoverPanel` with NO `className` (its own `h-40` box), placeholder verbatim.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Task 1 edits only `packages/db/src/schema/branches.ts` + generates `packages/db/migrations/0010_*.sql` (+ journal). Task 2 edits only `packages/types/src/{branch.ts,branch.test.ts,media.ts,media.test.ts}` + `apps/api/src/services/{media.ts,media.test.ts,branches.ts,admin-entities.ts,admin-delete.ts}` + `apps/api/src/routes/{branches.ts,admin-branches.ts}` + `apps/api/test/{branches,admin-entities,admin-delete}.test.ts`. Task 3 edits only `packages/types/src/{gallery.ts,gallery.test.ts}` + `apps/api/src/services/gallery.ts` + `apps/api/test/public-reads.test.ts`. Task 4 edits only `packages/api-client/src/routes/{branches.ts,admin.ts}` + `packages/api-client/test/{mock-api.ts,loopback.test.ts,typing.test.ts}`. Task 5 edits only `apps/admin/src/lib/{cover-upload.ts,cover-upload.test.ts,light-entity-state.ts,light-entity-state.test.ts,batch-photo-upload.ts,batch-photo-upload.test.ts,admin.functions.ts}` + `apps/admin/src/components/branches/branches-screen.tsx` + `apps/admin/src/components/gallery/gallery-screen.tsx`. Task 6 edits only `apps/landing/src/components/branch-card.tsx` + `apps/landing/src/routes/about.tsx` + `apps/landing/src/lib/{booking.ts,booking-read.ts,bookable-branches.ts}` + `apps/landing/src/lib/{booking,booking-read,bookable-branches,gallery-tabs}.test.ts`. Task 7 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/`, and works the PR/pick/issue — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/db/src/schema/
  branches.ts                                     # modify (T1) — coverImageKey column
packages/db/migrations/0010_*.sql                 # create (T1, db:generate) — one ADD COLUMN
packages/types/src/
  branch.ts                                       # modify (T2) — row+read+create+update schemas
  branch.test.ts                                  # create (T2) — the 11-it presence-encoding suite
  media.ts                                        # modify (T2) — 'branch-cover' joins the enum
  media.test.ts                                   # modify (T2) — +1 the branch-cover purpose pin
  gallery.ts                                      # modify (T3) — public photo schema gains caption
  gallery.test.ts                                 # modify (T3) — fixtures +caption, +1 passthrough pin
apps/api/src/services/
  media.ts                                        # modify (T2) — FINAL_PREFIXES['branch-cover']
  media.test.ts                                   # modify (T2) — +1 the covers/ prefix pin
  branches.ts                                     # modify (T2) — the public read resolves coverImageUrl
  admin-entities.ts                               # modify (T2) — branches CRUD grows the cover
  admin-delete.ts                                 # modify (T2) — the branch delete drops the cover object
  gallery.ts                                      # modify (T3) — caption joins select + assembly
apps/api/src/routes/
  branches.ts                                     # modify (T2) — pass c.env
  admin-branches.ts                               # modify (T2) — pass c.env (+ logger on writes)
apps/api/test/
  branches.test.ts                                # modify (T2) — +1 the public cover-resolution pin
  admin-entities.test.ts                          # modify (T2) — +5 the cover CRUD pins
  admin-delete.test.ts                            # modify (T2) — +1 the cover-object-delete pin
  public-reads.test.ts                            # modify (T3) — +1 the caption pin
packages/api-client/src/routes/
  branches.ts                                     # modify (T4) — parse branchReadSchema, BranchRead
  admin.ts                                        # modify (T4) — the four admin branches wrappers
packages/api-client/test/
  mock-api.ts                                     # modify (T4) — BRANCHES +coverImageUrl, GALLERY +caption
  loopback.test.ts                                # modify (T4) — extend the branches/gallery its
  typing.test.ts                                  # modify (T4) — BranchRead typing pin
apps/admin/src/lib/
  cover-upload.ts                                 # modify (T5) — the purpose parameter
  cover-upload.test.ts                            # modify (T5) — +1 the purpose-passthrough pin
  light-entity-state.ts                           # modify (T5) — branch seam: cover state + builder split
  light-entity-state.test.ts                      # modify (T5) — re-seat the branch it + 3 cover pins
  batch-photo-upload.ts                           # modify (T5) — BatchItem.caption + commit pass-through
  batch-photo-upload.test.ts                      # modify (T5) — item fixture + 1 caption pin
  admin.functions.ts                              # modify (T5) — the two branch fns go BranchRead
apps/admin/src/components/
  branches/branches-screen.tsx                    # modify (T5) — the Cover block + builder-by-mode
  gallery/gallery-screen.tsx                      # modify (T5) — the commit adapter passes caption
apps/landing/src/
  components/branch-card.tsx                      # modify (T6) — CoverPanel above the h3
  routes/about.tsx                                # modify (T6) — the caption line
  lib/booking.ts                                  # modify (T6) — BranchRead type ripple
  lib/booking-read.ts                             # modify (T6) — BranchRead type ripple
  lib/bookable-branches.ts                        # modify (T6) — BranchRead type ripple
  lib/booking.test.ts                             # modify (T6) — fixture +coverImageUrl
  lib/booking-read.test.ts                        # modify (T6) — fixture +coverImageUrl
  lib/bookable-branches.test.ts                   # modify (T6) — fixture +coverImageUrl
  lib/gallery-tabs.test.ts                        # modify (T6) — fixture +caption, +1 passthrough pin
docs/plan.md docs/progress.md AGENTS.md graphify-out/ docs/agents/v1-picks.md  # T7
```

---

### Task 1: `packages/db` — branches gain the nullable `cover_image_key` + migration 0010

**Files:**
- Modify: `packages/db/src/schema/branches.ts`
- Create (via `db:generate`, never by hand): `packages/db/migrations/0010_*.sql` (+ `meta/_journal.json` + snapshot)

**Interfaces:**
- Produces (what Tasks 2–5 consume): `branches.coverImageKey: text('cover_image_key')` — nullable, no default — on the drizzle table, so `typeof branches.$inferSelect` gains `coverImageKey: string | null` and every `.select().from(branches)` row carries it. The compose test DB picks the migration up automatically (apps/api/test/global-setup.ts runs `migrateDatabase`).
- Consumes: nothing new.

**Not here:** any types/api/client code (Tasks 2–4); the seed (upserts by name with explicit columns — drizzle omits the new column, and the conflict `set:` never nulls an uploaded cover; the packages precedent at seed.ts:181–183 is the standing template — a matching comment lands with Task 2's schema-adjacent edits only if biome formatting touches the file, otherwise none is needed); `scripts/rehearsal-fixture.mjs` (explicit column list — unaffected); any live-branch backfill (born-null IS the ruling: existing branches simply have no cover yet).

- [ ] **Step 1: Edit the schema**

`packages/db/src/schema/branches.ts` — inside the table object, after the `isActive` line (line 15) and before `createdAt` (line 16), insert:

```ts
    // R2 object key for the cover image (M7 #214, the packages-covers
    // precedent / ADR-0019): resolved to coverImageUrl at read time — raw
    // keys never leave the API. Born nullable: the live branches carry no
    // covers yet.
    coverImageKey: text('cover_image_key'),
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: a new `packages/db/migrations/0010_<drizzle-name>.sql` (the name is drizzle's pick — do not rename it) plus the `meta/` journal + snapshot entries. Read the generated SQL file and verify it contains **exactly one statement** and nothing else:

```sql
ALTER TABLE "branches" ADD COLUMN "cover_image_key" text;
```

(possibly with a trailing `--> statement-breakpoint` comment). If the generated file contains anything beyond the single `ADD COLUMN` — a default, a NOT NULL, another table's statement — STOP: the schema edit drifted; fix `branches.ts` and regenerate. Never hand-edit the migration.

- [ ] **Step 3: Apply to the live shared DB + probe**

Run: `pnpm --filter @sevendays/db db:migrate` (uses `DATABASE_MIGRATE_URL` from `packages/db/.env` — present on this machine; if the executor's session lacks it, stop and surface: applying to the live shared DB is owner-delegated and must not be skipped silently).
Expected: `0010` applies clean. Then the read-only probe (the #212 pattern):

```bash
cd packages/db && node --env-file=.env -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_MIGRATE_URL, { prepare: false, max: 1 });
  const rows = await sql\`select column_name, is_nullable, column_default from information_schema.columns where table_name = 'branches' and column_name = 'cover_image_key'\`;
  for (const r of rows) console.log(r.column_name, 'nullable=' + r.is_nullable, 'default=' + r.column_default);
  await sql.end({ timeout: 5 });
});"
```

Expected output — exactly one line, nullable with no default:

```text
cover_image_key nullable=YES default=null
```

Record the SQL + probe output in the evidence dir.

- [ ] **Step 4: Gates + commit**

`pnpm --filter @sevendays/db test` — **4 files passed** (catalog-rows, client-transaction, migrate, verify-appointment-row; `migrate.test.ts` replays the folder including 0010). Then `pnpm --filter @sevendays/db fix` (re-run the suite — fix must not change counts), `pnpm --filter @sevendays/db typecheck`. Commit:

```bash
git add packages/db/src/schema/branches.ts packages/db/migrations/0010_*.sql packages/db/migrations/meta
git commit -m "feat(db): branches gain a nullable cover_image_key - the packages-covers precedent lands on branches (#214)"
```

### Task 2: `packages/types` + `apps/api` — the branch-cover wire, the `'branch-cover'` purpose, and the cover-bearing CRUD (TDD, atomic)

Types and api land in ONE commit: the enum widening (types) and `FINAL_PREFIXES` (api) force each other's typechecks, and the branch wire swap (raw rows → resolved reads) must not land with the public route still `c.json`-ing raw rows (the raw-key leak). This follows the #212 Task-2 precedent (the nullable wire landed atomically across types + api).

**Files:**
- Create (test-first): `packages/types/src/branch.test.ts`
- Modify (test-first): `packages/types/src/media.test.ts`, `apps/api/test/branches.test.ts`, `apps/api/test/admin-entities.test.ts`, `apps/api/test/admin-delete.test.ts`
- Modify: `packages/types/src/branch.ts`, `packages/types/src/media.ts`, `apps/api/src/services/media.ts`, `apps/api/src/services/media.test.ts`, `apps/api/src/services/branches.ts`, `apps/api/src/services/admin-entities.ts`, `apps/api/src/services/admin-delete.ts`, `apps/api/src/routes/branches.ts`, `apps/api/src/routes/admin-branches.ts`

**Interfaces:**
- Produces (what Tasks 4–6 consume): `branchReadSchema` + `BranchRead` (the wire shape — `coverImageUrl: string | null`, no `coverImageKey`); `branchSchema` (the row shape) gains `coverImageKey: z.string().nullable()`; `createBranchSchema.coverImageKey?: string` / `updateBranchSchema.coverImageKey?: string | null`; `MediaPurpose` widens to `'package-cover' | 'branch-cover' | 'gallery-photo'`; api-side `listBranches(db, env)`, `listAdminBranches(db, env)`, `getAdminBranch(db, env, id)`, `createAdminBranch(db, env, audit, input, log?)`, `updateAdminBranch(db, env, audit, id, input, log?)` — all returning `BranchRead` / `AdminCreateResult<BranchRead>` / `AdminWriteResult<BranchRead>`; `deleteAdminBranch(db, env, audit, id)`.
- Consumes: Task 1's `branches.coverImageKey`; `admin-shared.ts`'s `AdminCreateResult`/`AdminWriteResult`/`AdminWriteFailure`/`conflict`/`guardUnique`; `media.ts`'s `commitUpload`/`resolveMediaUrl`; `observability/events.ts`'s `logAdminMutation` (routes) and `logMediaFailure` + `observability/logger.ts`'s `RequestLogger` (the cover seam); the existing `validatedJson`/`validatedParam`/`badRequest`/`notFound`/`auditActor` vocabulary.

**Not here:** the gallery caption (Task 3 — independently rejectable); any api-client/admin/landing consumption (Tasks 4–6 — their suites are EXPECTEDLY red after this task until their halves land; do not chase those reds here); the booking wizard (never); `AdminWriteFailure`'s shape (unchanged — the cover failure rides the existing `'conflict'` reason exactly like the packages save).

- [ ] **Step 1: Write the failing tests (types half)**

(a) Create `packages/types/src/branch.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { branchReadSchema, branchSchema, createBranchSchema, updateBranchSchema } from './branch.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const DATE = '2026-10-13T00:00:00.000Z';
const COVER_KEY = 'covers/00000000-0000-4000-8000-000000000001.jpg';
const COVER_URL = `https://pub-0000.r2.dev/${COVER_KEY}`;
const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000002.jpg';

const row = {
  id: UUID,
  name: 'Calamba Main',
  address: '1 Sample St',
  phone: '+63 900 000 0001',
  acceptsWalkIns: true,
  isActive: true,
  coverImageKey: COVER_KEY,
  createdAt: DATE,
  updatedAt: DATE,
};

const read = {
  id: row.id,
  name: row.name,
  address: row.address,
  phone: row.phone,
  acceptsWalkIns: row.acceptsWalkIns,
  isActive: row.isActive,
  createdAt: DATE,
  updatedAt: DATE,
  coverImageUrl: COVER_URL,
};

describe('branchSchema (the row shape)', () => {
  it('parses a canonical row with a cover key', () => {
    expect(branchSchema.safeParse(row).success).toBe(true);
  });

  it('parses a bare row (coverImageKey null) — born-null covers are the default state', () => {
    expect(branchSchema.safeParse({ ...row, coverImageKey: null }).success).toBe(true);
  });
});

describe('branchReadSchema (the canonical wire shape, M7 #214)', () => {
  it('parses a resolved read (coverImageUrl is the absolute URL)', () => {
    expect(branchReadSchema.safeParse(read).success).toBe(true);
  });

  it('null coverImageUrl parses (no cover is a null URL, never a string)', () => {
    expect(branchReadSchema.safeParse({ ...read, coverImageUrl: null }).success).toBe(true);
  });

  it('strips a smuggled coverImageKey from the parsed output (ADR-0019: raw keys never leave)', () => {
    const parsed = branchReadSchema.parse({ ...read, coverImageKey: COVER_KEY });
    expect('coverImageKey' in parsed).toBe(false);
  });
});

describe('createBranchSchema (presence-encoded cover)', () => {
  it('parses the bare create; the defaults exercise themselves (acceptsWalkIns false, isActive true)', () => {
    const parsed = createBranchSchema.parse({
      name: 'Calamba Main',
      address: '1 Sample St',
      phone: '+63 900 000 0001',
    });
    expect(parsed.acceptsWalkIns).toBe(false);
    expect(parsed.isActive).toBe(true);
  });

  it('drops the server-assigned fields AND coverImageUrl from the parsed create output', () => {
    const parsed = createBranchSchema.parse({
      name: 'X',
      address: 'Y',
      phone: 'Z',
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
      coverImageUrl: COVER_URL,
    });
    expect('id' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
    expect('coverImageUrl' in parsed).toBe(false);
  });

  it('accepts a fresh staging key; rejects null (clear-before-create is meaningless)', () => {
    const base = { name: 'X', address: 'Y', phone: 'Z' };
    expect(createBranchSchema.safeParse({ ...base, coverImageKey: STAGING_KEY }).success).toBe(
      true
    );
    expect(createBranchSchema.safeParse({ ...base, coverImageKey: null }).success).toBe(false);
  });
});

describe('updateBranchSchema (the cover tri-state)', () => {
  const base = {
    name: 'Calamba Main',
    address: '1 Sample St',
    phone: '+63 900 000 0001',
    acceptsWalkIns: true,
    isActive: true,
  };

  it('absent coverImageKey stays ABSENT from the parsed output (unchanged)', () => {
    const parsed = updateBranchSchema.parse(base);
    expect('coverImageKey' in parsed).toBe(false);
  });

  it('null parses and survives (explicit clear)', () => {
    const parsed = updateBranchSchema.parse({ ...base, coverImageKey: null });
    expect(parsed.coverImageKey).toBeNull();
  });

  it('a staging-key string parses (bind/replace via a fresh staging key)', () => {
    const parsed = updateBranchSchema.parse({ ...base, coverImageKey: STAGING_KEY });
    expect(parsed.coverImageKey).toBe(STAGING_KEY);
  });
});
```

(b) `packages/types/src/media.test.ts` — inside the `mediaPresignRequestSchema` describe (after the existing invalid-purpose it), add:

```ts
  it('parses the branch-cover purpose (M7 #214: branches join the covers pipeline)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'branch-cover',
      contentType: 'image/jpeg',
    });
    expect(parsed.purpose).toBe('branch-cover');
  });
```

(If the describe's `it` wording convention differs, keep the file's own wording for the string — only the body is new.)

- [ ] **Step 2: Run the types tests red**

`pnpm --filter @sevendays/types test -- --run src/branch.test.ts` — FAILS (the module has no `branchReadSchema` export). `pnpm --filter @sevendays/types test -- --run src/media.test.ts` — FAILS (the enum rejects `'branch-cover'`). Record red in the evidence dir.

- [ ] **Step 3: Write the schemas (types half)**

(a) `packages/types/src/branch.ts` — replace the whole file with:

```ts
import { z } from 'zod';

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

// Media-bind field (ADR-0019, the packages-covers precedent): a fresh
// STAGING key just uploaded via presign. Absent = no cover at create.
// Presence-encoded by design — reads never echo keys, so there is no
// full-object echo to make.
export const createBranchSchema = branchSchema
  .omit({ id: true, createdAt: true, updatedAt: true, coverImageKey: true })
  .extend({ coverImageKey: z.string().min(1).optional() });

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// Full-object PUT (M5 § Mutation shapes) plus the cover's tri-state
// encoding (#137's update shape / ADR-0019): string = bind/replace via a
// fresh staging key, null = clear, absent = unchanged.
export const updateBranchSchema = createBranchSchema.extend({
  coverImageKey: z.string().min(1).nullable().optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
```

(b) `packages/types/src/media.ts` — line 11, replace:

```ts
export const mediaPurposeSchema = z.enum(['package-cover', 'gallery-photo']);
```

with:

```ts
// 'branch-cover' joined with M7 #214: branch covers ride the same
// presign/commit pipeline under their own purpose (covers/ prefix).
export const mediaPurposeSchema = z.enum(['package-cover', 'branch-cover', 'gallery-photo']);
```

- [ ] **Step 4: Types green + build**

`pnpm --filter @sevendays/types test -- --run` — **15 files / 141 tests** (129 + the 11 branch its + the media it; Task 3's two caption its bring the end floor to 143). Then `pnpm build:packages` (downstream typechecks resolve the new exports). Do NOT commit yet — the api half lands in the same commit.

- [ ] **Step 5: Write the failing tests (api half)**

(a) `apps/api/src/services/media.test.ts` — inside `describe('commitUpload')`, after the `'gallery purpose promotes to gallery/'` it (line 154–162), add:

```ts
  it('branch-cover purpose promotes to covers/ (M7 #214: branch covers share the covers prefix)', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'branch-cover',
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.finalKey).toMatch(/^covers\//);
  });
```

(b) `apps/api/test/branches.test.ts` — extend the imports (top of file) with the branches table + eq:

```ts
import { branches } from '@sevendays/db';
import { eq } from 'drizzle-orm';
```

then inside `describe('GET /api/v1/branches')`, after the first it, add:

```ts
  it('resolves coverImageUrl for a covered branch; bare rows carry null; the raw key never appears (M7 #214)', async () => {
    // Direct db-state seeding (the #212 precedent) — the guard reads rows,
    // not API history. A FINAL key shape, as the commit pipeline stores it.
    await db
      .update(branches)
      .set({ coverImageKey: 'covers/aaaaaaaa-0000-4000-8000-0000000000aa.jpg' })
      .where(eq(branches.id, ids.branchA));
    const res = await app.request('/api/v1/branches', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; coverImageUrl: string | null }[];
    const covered = body.find((b) => b.id === ids.branchA);
    const bare = body.find((b) => b.id === ids.branchB);
    expect(covered?.coverImageUrl).toBe(
      'https://pub-test.r2.dev/covers/aaaaaaaa-0000-4000-8000-0000000000aa.jpg'
    );
    expect(bare?.coverImageUrl).toBeNull();
    expect(covered).not.toHaveProperty('coverImageKey');
  });
```

(c) `apps/api/test/admin-entities.test.ts` — this file ALREADY imports `branches` unaliased (the Ghost Branch insert at :37 uses it); the new its below use that same name, and the imports only ADD what is missing (check first): `eq` from `'drizzle-orm'` and `stubCommitBucket` from `'./helpers/r2-stub.js'`. Then, inside `describe('branches admin CRUD')`, after the last it (the 401-before-validation one), append these five its:

```ts
  const STAGING = 'tmp/00000000-0000-4000-8000-00000000000c.jpg';

  it('POST with a staging cover → 201, the cover promoted + resolved (raw key never on the read)', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'admin-branches-cover-create@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Fifth Branch',
          address: '5 New St',
          phone: '+63 900 000 005',
          coverImageKey: STAGING,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toMatch(
      /^https:\/\/pub-test\.r2\.dev\/covers\/[0-9a-f-]+\.jpg$/
    );
    expect(body).not.toHaveProperty('coverImageKey');
    // The promote happened: one put at the final key, the staging deleted.
    expect(stub.putCalls).toHaveLength(1);
    expect(stub.deleteCalls).toEqual([STAGING]);
  });

  it('PUT with a new staging key replaces the cover; the OLD object deletes only after the commit', async () => {
    const OLD_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000bb.jpg';
    await db
      .update(branches)
      .set({ coverImageKey: OLD_KEY })
      .where(eq(branches.id, ids.branchA));
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'admin-branches-cover-replace@sevendays.test');
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

  it('PUT with coverImageKey null clears the cover and deletes the old object', async () => {
    const OLD_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000bc.jpg';
    await db
      .update(branches)
      .set({ coverImageKey: OLD_KEY })
      .where(eq(branches.id, ids.branchA));
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'admin-branches-cover-clear@sevendays.test');
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

  it('PUT without the cover field leaves the cover UNCHANGED (absent = unchanged; no bucket touch)', async () => {
    const OLD_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000bd.jpg';
    await db
      .update(branches)
      .set({ coverImageKey: OLD_KEY })
      .where(eq(branches.id, ids.branchA));
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'admin-branches-cover-keep@sevendays.test');
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
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toBe(`https://pub-test.r2.dev/${OLD_KEY}`);
    expect(stub.deleteCalls).toEqual([]);
  });

  it('PUT with a staging key that has no object → 400 with the coverImageKey field detail (the commit re-path)', async () => {
    const stub = stubCommitBucket(); // empty — head misses
    const { token } = await signUpSession(url, 'admin-branches-cover-miss@sevendays.test');
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
```

(d) `apps/api/test/admin-delete.test.ts` — the suite already imports `eq` from `'drizzle-orm'` and `stubCommitBucket` from `'./helpers/r2-stub.js'` (its #213 header); it does NOT import `branches`, so the `@sevendays/db` import block gains it under the file's alias convention: `branches as branchesTable,`. Inside the branches delete describe, after the existing clean-delete it, add:

```ts
  it('a deleted branch cover object goes with the row (ADR-0019 §5: commit first, then the object delete)', async () => {
    const COVER_KEY = 'covers/aaaaaaaa-0000-4000-8000-0000000000be.jpg';
    // branchB deletes clean (its only reference is the portrait matrix row,
    // which cascades in-transaction) — the #213 fixture ground truth.
    await db
      .update(branchesTable)
      .set({ coverImageKey: COVER_KEY })
      .where(eq(branchesTable.id, ids.branchB));
    const stub = stubCommitBucket();
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'delete-branch-cover@sevendays.test',
      undefined,
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(204);
    expect(stub.deleteCalls).toEqual([COVER_KEY]);
  });
```

**One adaptation to the #213 suite's local shape:** its `authed(method, path, email, body?)` helper builds `testEnv(url)` internally — extend it with an optional fifth `env` parameter that spreads `{ ...testEnv(url), ...env }` into `app.request` (a two-line change; the suite's own media its used the same override posture). The fixture ids for branches live in `ids` (`FixtureIds.branchB`), used above.

- [ ] **Step 6: Run the api tests red**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run test/branches.test.ts test/admin-entities.test.ts test/admin-delete.test.ts src/services/media.test.ts`
Expected: the seven new api its FAIL (no cover resolution / no cover handling yet); the media prefix it fails typecheck-level (`'branch-cover'` not assignable). Record red.

- [ ] **Step 7: Implement the api half**

(a) `apps/api/src/services/media.ts` — `FINAL_PREFIXES` (lines 25–28), replace with:

```ts
const FINAL_PREFIXES: Record<MediaPurpose, string> = {
  'package-cover': 'covers',
  // M7 #214: branch covers share the covers/ prefix — one immutable-cover
  // directory; the purpose still names its owner for the presign contract.
  'branch-cover': 'covers',
  'gallery-photo': 'gallery',
};
```

(b) `apps/api/src/services/branches.ts` — replace the whole file with:

```ts
import type { BranchRead } from '@sevendays/types';
import type { Database } from '@sevendays/db';
import { branches } from '@sevendays/db';
import { asc, eq } from 'drizzle-orm';
import type { Env } from '../env.js';
import { resolveMediaUrl } from './media.js';

type MediaEnv = Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>;

/** The row → read resolution (M7 #214, the packages-covers precedent):
 * the raw key stays server-side; the wire carries the absolute URL, null
 * passthrough for a null key. */
function toBranchRead(row: typeof branches.$inferSelect, env: MediaEnv): BranchRead {
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

/**
 * The public branches read (M5 #138): ACTIVE rows only, name-ordered, the
 * row-level flip never a shape change — plus the M7 #214 cover resolution
 * (coverImageUrl on the wire, raw keys never leaving). Gated appointment
 * reads resolve deactivated branches independently — they never join this
 * read (the appointments projection carries branchId; the landing's
 * confirmation join degrades to its documented '—' fallback).
 */
export async function listBranches(db: Database, env: MediaEnv): Promise<BranchRead[]> {
  const rows = await db
    .select()
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(asc(branches.name));
  return rows.map((row) => toBranchRead(row, env));
}
```

(c) `apps/api/src/routes/branches.ts` — the handler body becomes:

```ts
export const branches = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listBranches(db, c.env));
});
```

(chained registration preserved — see the file's own ADR-0006 comment).

(d) `apps/api/src/services/admin-entities.ts` — the branches section (lines 56–125) is replaced. New imports at the top of the file: `commitUpload` + `resolveMediaUrl` from `'./media.js'`, `logMediaFailure` from `'../observability/events.js'`, `RequestLogger` type from `'../observability/logger.js'`, `BranchRead` + `CreateBranchInput` (already imported) from `'@sevendays/types'`, and `Env` from `'../env.js'`. The section becomes:

```ts
// --- branches ---------------------------------------------------------------

type BranchEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

function toBranchRead(row: typeof branches.$inferSelect, env: BranchEnv): BranchRead {
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

// The branch-cover commit (M7 #214, admin-packages.ts's resolveCover
// controller ruling): HEAD-verify through commitUpload ONLY when a key is
// present — presence-encoding makes "changed" structural (stored keys are
// immutable final keys, inputs are staging keys, and the staging-key regex
// rejects final keys, so a present string is always a new bind).
// undefined = unchanged, null = clear, string = bind/replace. A commit
// failure re-paths its details onto the payload field and resolves as the
// conflict failure (→ 400). Runs BEFORE the transaction — bucket I/O
// never holds a tx open.
async function resolveBranchCover(
  env: BranchEnv,
  key: string | null | undefined,
  log?: RequestLogger
): Promise<{ ok: true; finalKey: string | null | undefined } | AdminWriteFailure> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'branch-cover',
  });
  if (!commit.ok) {
    // M6 #183: the cover-commit seam's typed failure (see admin-packages's
    // resolveCover — the route-level 'conflict' cannot name it).
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

export async function listAdminBranches(db: Database, env: BranchEnv): Promise<BranchRead[]> {
  // Admin read: ALL rows including deactivated (spec § Route topology),
  // covers resolved — raw keys never leave.
  const rows = await db.select().from(branches).orderBy(asc(branches.name));
  return rows.map((row) => toBranchRead(row, env));
}

export async function getAdminBranch(db: Database, env: BranchEnv, id: string): Promise<BranchRead | null> {
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row ? toBranchRead(row, env) : null;
}

export async function createAdminBranch(
  db: Database,
  env: BranchEnv,
  audit: AuditActor,
  input: CreateBranchInput,
  log?: RequestLogger
): Promise<AdminCreateResult<BranchRead>> {
  const cover = await resolveBranchCover(env, input.coverImageKey, log);
  if (!cover.ok) return cover;
  const result = await guardUnique(BRANCH_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .insert(branches)
        .values({ ...input, coverImageKey: cover.finalKey ?? null })
        .returning();
      if (!row) throw new Error('insert branches: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'branch',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
  if (!result.ok) return result;
  return { ok: true, row: toBranchRead(result.row, env) };
}

export async function updateAdminBranch(
  db: Database,
  env: BranchEnv,
  audit: AuditActor,
  id: string,
  input: UpdateBranchInput,
  log?: RequestLogger
): Promise<AdminWriteResult<BranchRead>> {
  const current = await getAdminBranchRow(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.name, input.name), ne(branches.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  const cover = await resolveBranchCover(env, input.coverImageKey, log);
  if (!cover.ok) return cover;
  // M6 #185: deactivation is a RULING on the flip — only true→false is
  // 'deactivate'; reactivation and edits of deactivated rows are 'update'.
  const action: AuditAction =
    current.isActive && input.isActive === false ? 'deactivate' : 'update';
  // The cover tri-state composes the stored key: absent = keep the
  // current one, null = clear, string = the committed final key.
  const storedCover = cover.finalKey === undefined ? current.coverImageKey : cover.finalKey;
  const result = await guardUnique(BRANCH_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(branches)
        .set({
          name: input.name,
          address: input.address,
          phone: input.phone,
          acceptsWalkIns: input.acceptsWalkIns,
          isActive: input.isActive,
          coverImageKey: storedCover,
          updatedAt: new Date(),
        })
        .where(eq(branches.id, id))
        .returning();
      if (!row) throw new Error('update branches: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'branch',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
  if (!result.ok) return result;
  // After-commit bucket hygiene (#137's precedent): the replaced/cleared
  // cover's old object is deleted only AFTER the save committed — a
  // rolled-back save never deletes (the row still points at it).
  if (current.coverImageKey && storedCover !== current.coverImageKey) {
    await env.MEDIA_BUCKET.delete(current.coverImageKey);
  }
  return { ok: true, row: toBranchRead(result.row, env) };
}

/** The raw-row read the update composes against (covers resolve at the end). */
async function getAdminBranchRow(db: Database, id: string) {
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row ?? null;
}
```

(If the file's biome style places helper functions differently, keep the placement — the content is the pin. `Detail` is the local `{ path: string[]; message: string }` alias — add it next to the section if admin-shared does not export one; admin-packages.ts declares its own `type Detail` locally — mirror that.)

(e) `apps/api/src/routes/admin-branches.ts` — thread env + logger through the five handlers (chained registrations preserved):

- `.get('/')`: `return c.json(await listAdminBranches(c.get('db'), c.env));`
- `.get('/:id', ...)`: `const read = await getAdminBranch(c.get('db'), c.env, id);` then `if (!read) return notFound(c, 'Branch not found.'); return c.json(read);` (rename the local from `row` to `read` to keep it honest)
- `.post('/')`: `createAdminBranch(c.get('db'), c.env, auditActor(c), c.req.valid('json'), c.get('logger'))`
- `.put('/:id', ...)`: `updateAdminBranch(c.get('db'), c.env, auditActor(c), id, c.req.valid('json'), c.get('logger'))`
- `.delete('/:id', ...)`: `deleteAdminBranch(c.get('db'), c.env, auditActor(c), id)`

(f) `apps/api/src/services/admin-delete.ts` — `deleteAdminBranch` (lines 201–231). Signature and body become:

```ts
export async function deleteAdminBranch(
  db: Database,
  env: Pick<Env, 'MEDIA_BUCKET'>,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [apptCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(eq(appointments.branchId, id));
  const blocking = apptCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    // branch_id carries no DB-level cascade — the explicit delete IS the cascade.
    await tx.delete(branchStudioServices).where(eq(branchStudioServices.branchId, id));
    await tx.delete(branches).where(eq(branches.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'branch',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  // ADR-0019 §5: the row committed; its cover object goes with it.
  if (current.coverImageKey) {
    await env.MEDIA_BUCKET.delete(current.coverImageKey);
  }
  return { ok: true };
}
```

(The `Env` type import joins the file's imports from `'../env.js'`.)

- [ ] **Step 8: Api green + gates + the atomic commit**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run` — **28 passed + 1 skipped files (29) / 396 passed + 3 skipped** (388 + this task's 8 new its: branches +1, admin-entities +5, admin-delete +1, services/media.test +1; Task 3's caption pin brings the ticket total to 397). If a count differs, reconcile before proceeding — do not loosen assertions. Then `pnpm --filter @sevendays/api fix` (re-run), `pnpm --filter @sevendays/api typecheck`, `pnpm --filter @sevendays/types fix` + typecheck + re-run the types suite (**15 files / 141 tests**). Commit:

```bash
git add packages/types/src/branch.ts packages/types/src/branch.test.ts packages/types/src/media.ts packages/types/src/media.test.ts apps/api/src/services/media.ts apps/api/src/services/media.test.ts apps/api/src/services/branches.ts apps/api/src/services/admin-entities.ts apps/api/src/services/admin-delete.ts apps/api/src/routes/branches.ts apps/api/src/routes/admin-branches.ts apps/api/test/branches.test.ts apps/api/test/admin-entities.test.ts apps/api/test/admin-delete.test.ts
git commit -m "feat(types,api): branch covers on the wire - the read schema resolves coverImageUrl, the tri-state save commits through the new branch-cover purpose, the delete drops the cover object (#214)"
```

### Task 3: `packages/types` + `apps/api` — the caption joins the public gallery wire (TDD, atomic)

Types + api in one commit again (the schema widening and the service's assembly force each other). Small, but independently rejectable: the caption's public half touches nothing in Task 2.

**Files:**
- Modify (test-first): `packages/types/src/gallery.test.ts`, `apps/api/test/public-reads.test.ts`
- Modify: `packages/types/src/gallery.ts`, `apps/api/src/services/gallery.ts`

**Interfaces:**
- Produces (what Tasks 4–6 consume): `PublicGalleryPhoto.caption: string | null` — a required key, nullable, mirroring `title`; `galleryReadSchema` flows it; `getPublicGallery`'s photos carry it.
- Consumes: the existing `galleryPhotos.caption` column (M5 — already in the DB and the admin wire).

**Not here:** the admin caption editor (already live — M5's `gallery-state.ts` round-trips it, the Sheet edits it); the batch tray (Task 5); the walls' rendering (Task 6); any caption VALIDATION on the public wire (the public read is a projection — bounds are admin-write-time concerns; there is no public caption input anywhere).

- [ ] **Step 1: Write the failing tests**

(a) `packages/types/src/gallery.test.ts` — in `describe('galleryReadSchema (the public assembled read)')`, the existing it's two photo literals gain their captions (the pin moves from "parses without caption" to "parses with"):

```ts
      photos: [
        { id: UUID, photoUrl: PHOTO_URL, title: 'Toga portrait', caption: 'Toga toss at the quad', categoryId: UUID2 },
        { id: UUID2, photoUrl: PHOTO_URL, title: null, caption: null, categoryId: UUID2 },
      ],
```

and after that it, add:

```ts
  it('caption passes through untouched (M7 #214: the wire carries it; walls render when present)', () => {
    const parsed = galleryReadSchema.parse({
      categories: [],
      photos: [
        {
          id: UUID,
          photoUrl: PHOTO_URL,
          title: null,
          caption: 'The last frame of the day',
          categoryId: UUID2,
        },
      ],
    });
    expect(parsed.photos[0]?.caption).toBe('The last frame of the day');
  });
```

Add `publicGalleryPhotoSchema` to the file's existing import from `'./gallery.js'`, and append inside that same describe (or a sibling one) a null pin:

```ts
  it('a bare photo parses with caption null (no caption renders nothing extra)', () => {
    const bare = publicGalleryPhotoSchema.parse({
      id: UUID,
      photoUrl: PHOTO_URL,
      title: null,
      caption: null,
      categoryId: UUID2,
    });
    expect(bare.caption).toBeNull();
  });
```

(b) `apps/api/test/public-reads.test.ts` — the file already imports `galleryPhotos` + `eq` (its top). Inside the `GET /api/v1/gallery` describe, after the first it, add:

```ts
  it('photos carry caption when present; bare photos carry null (M7 #214 passthrough)', async () => {
    await db
      .update(galleryPhotos)
      .set({ caption: 'Golden hour at the amphitheater' })
      .where(eq(galleryPhotos.id, gallery.photoA));
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      photos: { id: string; caption: string | null }[];
    };
    const photoA = body.photos.find((p) => p.id === gallery.photoA);
    const photoB = body.photos.find((p) => p.id === gallery.photoB);
    expect(photoA?.caption).toBe('Golden hour at the amphitheater');
    expect(photoB?.caption).toBeNull();
  });
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/types test -- --run src/gallery.test.ts` — FAILS: today's `publicGalleryPhotoSchema` strips the unknown `caption` key, so the passthrough it's `parsed.photos[0]?.caption` reads `undefined` and the `toBe('The last frame of the day')` assertion fails (that IS the red — the wire drops the field today; the fix makes it survive).

`TEST_DATABASE_URL=... pnpm --filter @sevendays/api test -- --run test/public-reads.test.ts` — FAILS (`photoA?.caption` is `undefined` — the service doesn't select it). Record red.

- [ ] **Step 3: Implement**

(a) `packages/types/src/gallery.ts` — `publicGalleryPhotoSchema` (lines 99–104), replace with:

```ts
export const publicGalleryPhotoSchema = z.object({
  id: z.uuid(),
  photoUrl: z.url(),
  title: z.string().nullable(),
  // M7 #214: the caption rides the public wire (null = renders nothing
  // extra); the admin wire + editor have carried it since M5.
  caption: z.string().nullable(),
  categoryId: z.uuid(),
});
```

(b) `apps/api/src/services/gallery.ts` — the photo select (lines 27–32) gains the column:

```ts
  const photoRows = await db
    .select({
      id: galleryPhotos.id,
      r2Key: galleryPhotos.r2Key,
      title: galleryPhotos.title,
      caption: galleryPhotos.caption,
      categoryId: galleryPhotos.categoryId,
    })
```

and the push (line 46):

```ts
    photos.push({ id: row.id, photoUrl, title: row.title, caption: row.caption, categoryId: row.categoryId });
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/types test -- --run` — **15 files / 143 tests** (Task 2's 141 + the two caption its: the passthrough + the bare-null pin). Then `pnpm build:packages`. `TEST_DATABASE_URL=... pnpm --filter @sevendays/api test -- --run` — **28 passed + 1 skipped files (29) / 397 passed + 3 skipped** (Task 2's 396 + the caption pin — the ticket's api end floor). `pnpm --filter @sevendays/types fix` + `pnpm --filter @sevendays/api fix` (re-run both suites). Commit:

```bash
git add packages/types/src/gallery.ts packages/types/src/gallery.test.ts apps/api/src/services/gallery.ts apps/api/test/public-reads.test.ts
git commit -m "feat(types,api): caption joins the public gallery wire - passthrough, null renders nothing extra (#214)"
```

### Task 4: `packages/api-client` — the BranchRead wrappers + the caption/cover-aware mock

**Files:**
- Modify: `packages/api-client/src/routes/branches.ts`, `packages/api-client/src/routes/admin.ts`, `packages/api-client/test/mock-api.ts`, `packages/api-client/test/loopback.test.ts`, `packages/api-client/test/typing.test.ts`

**Interfaces:**
- Produces (what Tasks 5–6 consume): `client.branches.list(): Promise<BranchRead[]>`; `client.admin.branches.{list,byId,create,update}: Promise<BranchRead>` (remove unchanged); the mock's `GET /branches` + `GET /gallery` payloads carry `coverImageUrl` / `caption` so the loopback parse pins hold.
- Consumes: Task 2's `branchReadSchema`/`BranchRead` and Task 3's captioned `galleryReadSchema` (both built by `pnpm build:packages` in Task 3 — the client resolves `@sevendays/types` from dist).

**Not here:** any admin-branches GET/POST/PUT mock subtree (the hand-maintained mock stays minimal — #213 added only the DELETE subtree it needed; this ticket's admin-branch read pins live in the API suite); `mockApiBrokenBranches` (the deliberate-mismatch fixture keeps its shape — the broken-branch it asserts ZodError, which a still-broken payload still raises).

- [ ] **Step 1: Extend the loopback + typing tests (they fail against the un-updated mock once the schemas switch — write expectations first)**

(a) `packages/api-client/test/mock-api.ts` — the BRANCHES fixture rows (lines 10–29): row 1 (`Main Studio`) gains `coverImageUrl: 'https://pub-test.r2.dev/covers/11111111-1111-4111-8111-111111111111.jpg',` after `acceptsWalkIns: true,`; row 2 (`North Branch`) gains `coverImageUrl: null,` in the same position. The GALLERY photo (lines 148–155) gains `caption: 'Golden hour at the amphitheater',` after `title: null,`.

(b) `packages/api-client/test/loopback.test.ts` — inside `it('branches.list parses the payload into typed data', ...)` (lines 22–29), append after the `createdAt` assertion:

```ts
  expect(rows[0]?.coverImageUrl).toBe('https://pub-test.r2.dev/covers/11111111-1111-4111-8111-111111111111.jpg');
  expect(rows[1]?.coverImageUrl).toBeNull();
```

Inside `it('gallery.list parses the assembled read into typed data', ...)` (lines 169–179), append after its final existing assertion:

```ts
  expect(gallery.photos[0]?.caption).toBe('Golden hour at the amphitheater');
```

(match the it's own local variable name for the gallery result — the added line is the pin).

(c) `packages/api-client/test/typing.test.ts` — the import block: `Branch` becomes `BranchRead` (line 4), and line 19 becomes:

```ts
  expectTypeOf(client.branches.list).returns.toEqualTypeOf<Promise<BranchRead[]>>();
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/api-client test -- --run` — the branches.list it FAILS if run before the source switch (today's wrapper still returns `Branch` typed rows but the assertions reference `coverImageUrl`, which `Branch` lacks → typecheck red at `pnpm --filter @sevendays/api-client typecheck`; at runtime the assertions fail against the un-updated... the mock IS updated in Step 1a, so runtime passes and only the TYPES are red). The honest red here is the typecheck: `pnpm --filter @sevendays/api-client typecheck` FAILS on the two new assertions + the typing pin (`Branch` has no `coverImageUrl`; `BranchRead` not exported into the it's scope). Record it. (If the executor prefers runtime red: revert Step 1a's mock rows temporarily — do not; the typecheck red is the pin.)

- [ ] **Step 3: Switch the wrappers**

(a) `packages/api-client/src/routes/branches.ts` — the whole file becomes:

```ts
import type { BranchRead } from '@sevendays/types';
import { branchReadSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Branch wrappers: GET /api/v1/branches (the only method today). */
export function branchesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/branches — active branches, name-ordered, covers resolved (M7 #214). */
    async list(): Promise<BranchRead[]> {
      const res = await raw.api.v1.branches.$get();
      return unwrap(res, branchReadSchema.array());
    },
  };
}
```

(b) `packages/api-client/src/routes/admin.ts` — the branches group (lines 230–261): the import block swaps `Branch` → `BranchRead` and `branchSchema` → `branchReadSchema` (line 10/22 among the file's own imports; `branchSchema` has no other consumer in this file — verify with a grep before deleting the import), and the four parse sites + return types switch: `list(): Promise<BranchRead[]>` / `unwrap(res, branchReadSchema.array())` (line 236), `byId(...): Promise<BranchRead>` / `unwrap(res, branchReadSchema)` (241), `create(...): Promise<BranchRead>` / `unwrap(res, branchReadSchema)` (246), `update(...): Promise<BranchRead>` / `unwrap(res, branchReadSchema)` (251). The `remove()` wrapper and its doc comment are untouched.

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/api-client test -- --run` — **5 files / 37 tests** (extended its; none added). `pnpm --filter @sevendays/api-client typecheck` — green. `pnpm --filter @sevendays/api-client fix` (re-run). Commit:

```bash
git add packages/api-client/src/routes/branches.ts packages/api-client/src/routes/admin.ts packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts packages/api-client/test/typing.test.ts
git commit -m "feat(api-client): branches wrappers return BranchRead - coverImageUrl on the wire, caption on the gallery mock (#214)"
```

### Task 5: `apps/admin` — the branch Sheet's Cover block, the seam's cover state, the tray's caption pass-through

**Load the UI/UX skill set before this task's component edits** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule). Everything here is a verbatim port of ruled compositions (the packages editor's Cover card + loop onto the branch Sheet; the packages editor-state tri-state onto the branch seam) — no owner-reacted rendered-variants round (no new composition; the justification is pinned in this plan's header, and #218/#223 re-render these surfaces).

**Files:**
- Modify (test-first): `apps/admin/src/lib/cover-upload.test.ts`, `apps/admin/src/lib/light-entity-state.test.ts`, `apps/admin/src/lib/batch-photo-upload.test.ts`
- Modify: `apps/admin/src/lib/cover-upload.ts`, `apps/admin/src/lib/light-entity-state.ts`, `apps/admin/src/lib/batch-photo-upload.ts`, `apps/admin/src/lib/admin.functions.ts`, `apps/admin/src/components/branches/branches-screen.tsx`, `apps/admin/src/components/gallery/gallery-screen.tsx`

**Interfaces:**
- Produces: `uploadCover(file, presign, onStatus, purpose: MediaPurpose = 'package-cover')`; `BranchEditorState` gains `coverImageUrl: string | null` + `coverImageKey: string | null | undefined`; `buildBranchCreatePayload(state): CreateBranchInput` and `buildBranchUpdatePayload(state): UpdateBranchInput` (the single `buildBranchPayload` RETIRES — the create/update split mirrors `package-editor-state.ts`); `buildBranchFlipPayload(row: BranchRead, isActive)` (cover deliberately absent); `BatchItem.caption: string | null`.
- Consumes: Task 2's `CreateBranchInput`/`UpdateBranchInput`/`BranchRead` + the `'branch-cover'` purpose; the landed `presignAdminCoverUpload` server fn (purpose-generic — zero server-fn change); the Sheet shell (`LightEntityEditor` children).

**Not here:** the async-Save contract / pending vocabulary (#218 — the Sheet ports the CURRENT save flow verbatim, `editorNonce` machinery stays); drag-and-drop / cancel / leave-confirm (#220); the packages editor (untouched); the studio-service branch matrix (untouched); the admin branches TABLE (no cover thumbnail column — the editor's preview is the affordance; the redesign-era tables are #218/#219's); caption EDITING in the tray (ruled out).

- [ ] **Step 1: Write the failing lib-seam tests**

(a) `apps/admin/src/lib/cover-upload.test.ts` — inside `describe('uploadCover')`, after the happy-path it, add (the harness's `started()` helper inlines its own presign — this it needs a capturing fake, so it does not use `started()`):

```ts
  it('passes the caller purpose through to presign (M7 #214: branch covers presign as branch-cover)', async () => {
    const seen: CoverUploadStatus[] = [];
    const presign = vi.fn(() =>
      Promise.resolve({ key: 'tmp/k.jpg', uploadUrl: 'https://r2/put' })
    );
    const promise = uploadCover(JPEG, presign, (s) => seen.push(s), 'branch-cover');
    await vi.waitFor(() => expect(FakeXhr.last).toBeDefined());
    FakeXhr.last?.onload?.();
    await expect(promise).resolves.toBeUndefined();
    expect(presign).toHaveBeenCalledWith({
      purpose: 'branch-cover',
      contentType: 'image/jpeg',
    });
  });
```

(b) `apps/admin/src/lib/light-entity-state.test.ts` — three edits. First the fixture (lines 16–25): the import block adds `branchReadSchema` (keep `branchSchema` only if another fixture still uses it — it does not: grep before removing), and the fixture becomes:

```ts
const branch = branchReadSchema.parse({
  id: uuid(1),
  name: 'Main Studio',
  address: '12 Sample St.',
  phone: '+63 900 000 0001',
  acceptsWalkIns: true,
  isActive: true,
  coverImageUrl: null,
  createdAt: STAMP,
  updatedAt: STAMP,
});
```

Second, the branch round-trip it (lines 46–63) is replaced by:

```ts
  it('branch state/payload round-trip; the flip carries every editable field with ONLY isActive flipped and NO cover key', () => {
    const state = light.branchStateFromRead(branch);
    expect(state).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      acceptsWalkIns: true,
      isActive: true,
      coverImageUrl: null,
    });
    expect(light.buildBranchCreatePayload(state)).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      acceptsWalkIns: true,
      isActive: true,
    });
    const flip = light.buildBranchFlipPayload(branch, false);
    expect(flip).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      acceptsWalkIns: true,
      isActive: false,
    });
    // The cover is deliberately ABSENT from a flip — the absence is what
    // makes a flip never re-verify or clobber media (the tri-state law).
    expect('coverImageKey' in flip).toBe(false);
  });
```

Third, three new its directly after it:

```ts
  it('create payload includes the cover ONLY when the state carries a fresh staging key', () => {
    const state = light.branchStateFromRead(branch);
    expect('coverImageKey' in light.buildBranchCreatePayload(state)).toBe(false);
    const bound = { ...state, coverImageKey: 'tmp/00000000-0000-4000-8000-00000000000c.jpg' };
    expect(light.buildBranchCreatePayload(bound).coverImageKey).toBe(
      'tmp/00000000-0000-4000-8000-00000000000c.jpg'
    );
  });

  it('update payload encodes the cover tri-state: absent = property ABSENT, null = clear, string = bind', () => {
    const state = light.branchStateFromRead(branch);
    expect('coverImageKey' in light.buildBranchUpdatePayload(state)).toBe(false);
    expect(light.buildBranchUpdatePayload({ ...state, coverImageKey: null }).coverImageKey).toBeNull();
    expect(
      light.buildBranchUpdatePayload({ ...state, coverImageKey: 'tmp/00000000-0000-4000-8000-00000000000c.jpg' }).coverImageKey
    ).toBe('tmp/00000000-0000-4000-8000-00000000000c.jpg');
  });

  it('a read with a cover seeds coverImageUrl; the editor key starts undefined (a read never echoes keys)', () => {
    const covered = { ...branch, coverImageUrl: 'https://pub-test.r2.dev/covers/aaaa.jpg' };
    const state = light.branchStateFromRead(covered);
    expect(state.coverImageUrl).toBe('https://pub-test.r2.dev/covers/aaaa.jpg');
    expect(state.coverImageKey).toBeUndefined();
  });
```

(c) `apps/admin/src/lib/batch-photo-upload.test.ts` — the `item()` fixture (line 17–19) gains `caption: null`:

```ts
function item(n: number): BatchItem {
  return { id: uuid(n), file: okFile(), categoryId: null, title: `Photo ${n}`, caption: null };
}
```

and inside `describe('runBatchUpload')`, after the first it, add:

```ts
  it('commits the item caption unchanged — the pass-through seam (M7 #214; null at enqueue, editing ruled out)', async () => {
    const commit = vi.fn(async (): CommitResult => ({ ok: true, photo: { id: uuid(98) } as never }));
    const d = deps({ commit });
    const captioned = { ...item(1), caption: 'Studio batch 1' };
    await runBatchUpload([captioned], d);
    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({ caption: 'Studio batch 1' })
    );
  });
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/cover-upload.test.ts src/lib/light-entity-state.test.ts src/lib/batch-photo-upload.test.ts`
Expected: at runtime the branch round-trip its throw (`light.buildBranchCreatePayload is not a function`), and at `pnpm --filter @sevendays/admin typecheck` the purpose parameter + `caption` field + `coverImageUrl` fixture keys are rejected — both reds are the point (the seams do not exist yet). Record red.

- [ ] **Step 3: Implement the lib seams**

(a) `apps/admin/src/lib/cover-upload.ts` — the signature (line 45–49) gains the defaulted purpose, and the presign call (line 67) uses it:

```ts
export async function uploadCover(
  file: File,
  presign: (req: MediaPresignRequest) => Promise<MediaPresignResponse>,
  onStatus: (status: CoverUploadStatus) => void,
  purpose: MediaPurpose = 'package-cover'
): Promise<void> {
```

```ts
    const presigned = await presign({ purpose, contentType: 'image/jpeg' });
```

The import gains `MediaPurpose` (`import type { MediaPresignRequest, MediaPresignResponse, MediaPurpose } from '@sevendays/types';`) and the JSDoc's step-2 bullet (lines 26–29) amends its parenthetical to `with \`{ purpose, contentType: 'image/jpeg' }\` (the caller's purpose — 'package-cover' by default, 'branch-cover' from the branch editor since M7 #214)`.

(b) `apps/admin/src/lib/light-entity-state.ts` — the branch section (interfaces :33–39, functions :95–150) becomes (imports: add `BranchRead`, `CreateBranchInput` to the types import block; `branchStateFromRead`/`buildBranchFlipPayload` switch their `Branch` parameter types to `BranchRead`):

```ts
/**
 * The branch editor's whole state. `#143 seam: the branch state shape`.
 * `coverImageUrl`/`coverImageKey` are the three-state media encoding
 * (M7 #214, the package seam's law): the URL is the read's resolved cover
 * (preview fallback), `undefined` = unchanged (absent from the PUT),
 * `null` = clear, string = a fresh staging key (ADR-0019) to bind on the
 * next save.
 */
export interface BranchEditorState {
  name: string;
  address: string;
  phone: string;
  acceptsWalkIns: boolean;
  isActive: boolean;
  coverImageUrl: string | null;
  coverImageKey: string | null | undefined;
}
```

```ts
/**
 * `#143 seam: read → branch state`. The read row minus server-managed
 * fields (id/createdAt/updatedAt); `coverImageKey` starts `undefined` (a
 * read never echoes keys, so there is nothing to echo — the cover is
 * unchanged until the editor says otherwise).
 */
export function branchStateFromRead(row: BranchRead): BranchEditorState {
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    acceptsWalkIns: row.acceptsWalkIns,
    isActive: row.isActive,
    coverImageUrl: row.coverImageUrl,
    coverImageKey: undefined,
  };
}

/**
 * `#143 seam: create-mode branch state`. Empty strings,
 * `acceptsWalkIns: false`, active by default, no cover.
 */
export function newBranchState(): BranchEditorState {
  return {
    name: '',
    address: '',
    phone: '',
    acceptsWalkIns: false,
    isActive: true,
    coverImageUrl: null,
    coverImageKey: undefined,
  };
}

/**
 * `#143 seam: branch state → create payload` (M7 #214 split, the
 * package seam's law). The five fields explicit — the schema's defaults
 * are never trusted client-side (#137's full-object PUT). `coverImageKey`
 * is included ONLY when the state carries a fresh staging key string.
 */
export function buildBranchCreatePayload(state: BranchEditorState): CreateBranchInput {
  return {
    name: state.name,
    address: state.address,
    phone: state.phone,
    acceptsWalkIns: state.acceptsWalkIns,
    isActive: state.isActive,
    ...(typeof state.coverImageKey === 'string' ? { coverImageKey: state.coverImageKey } : {}),
  };
}

/**
 * `#143 seam: branch state → full-object PUT payload`. The create mapping
 * plus the three-state cover encoding: `undefined` = property ABSENT from
 * the object (unchanged), `null` = explicit clear, string = bind the
 * fresh staging key (#137's update shape / ADR-0019).
 */
export function buildBranchUpdatePayload(state: BranchEditorState): UpdateBranchInput {
  return {
    name: state.name,
    address: state.address,
    phone: state.phone,
    acceptsWalkIns: state.acceptsWalkIns,
    isActive: state.isActive,
    ...(state.coverImageKey !== undefined ? { coverImageKey: state.coverImageKey } : {}),
  };
}

/**
 * `#143 seam: read → branch flip payload`. The read reshaped back into the
 * full-object update payload with ONLY `isActive` flipped. `coverImageKey`
 * is deliberately ABSENT: the absence is what makes a flip never re-verify
 * or clobber media — the cover is untouched by the PUT (the tri-state
 * encoding; the read never echoes keys anyway).
 */
export function buildBranchFlipPayload(row: BranchRead, isActive: boolean): UpdateBranchInput {
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    acceptsWalkIns: row.acceptsWalkIns,
    isActive,
  };
}
```

(`buildBranchPayload` is DELETED — its two callers switch in Step 4. If any other file imports it, grep and switch that caller too; the only consumers are the branches screen and this test file.)

(c) `apps/admin/src/lib/batch-photo-upload.ts` — `BatchItem` (lines 77–87) and the commit call (lines 221–225):

```ts
export interface BatchItem {
  id: string;
  file: File;
  categoryId: string | null;
  title: string;
  /** M7 #214: the caption pass-through seam — captured at enqueue (null;
   * pre-commit metadata editing is ruled out) and committed unchanged. */
  caption: string | null;
}
```

```ts
      const result = await deps.commit({
        r2Key: stagingKey,
        title: item.title,
        caption: item.caption,
        categoryId: item.categoryId,
      });
```

(The interface doc above it, lines 77–81, keeps its wording — the caption line joins the "captured AT ENQUEUE" law.)

(d) `apps/admin/src/lib/admin.functions.ts` — the two branch fns (lines 230–285): their `AdminMutationResult<Branch>` return annotations become `AdminMutationResult<BranchRead>` and the types import swaps `Branch` → `BranchRead` (grep the file: `fetchAdminBranches` at :92 needs no edit — it returns the client call untyped-explicitly; if its inferred annotation is exported anywhere, the type flows from Task 4's wrapper).

- [ ] **Step 4: The components**

(a) `apps/admin/src/components/gallery/gallery-screen.tsx` — the commit adapter (lines 898–910): `caption: null,` becomes `caption: input.caption,`; and `onFilesChosen` (around lines 944–952, the items built with `title: titleFromFileName(file.name)`) gains `caption: null,` on the same object. That is the whole gallery change.

(b) `apps/admin/src/components/branches/branches-screen.tsx` — six edits:

1. **Imports:** `Branch` → `BranchRead` in the `@sevendays/types` import; the light-entity-state import block swaps `buildBranchPayload` for `buildBranchCreatePayload, buildBranchUpdatePayload`; add `import { uploadCover, type CoverUploadStatus } from '#/lib/cover-upload';`, `import { presignAdminCoverUpload } from '#/lib/admin.functions';` (merging into the existing admin.functions import), `Image` joins the `lucide-react` import, and `useEffect`, `useRef` join the react import.

2. **Types:** `EditingTarget`'s edit arm (`row: Branch`) → `row: BranchRead`; `FlipInput.row` likewise; `openEdit(row: Branch)` / `editButton(row: Branch)` likewise; every `Branch[]` cache annotation in the mutations (`getQueryData<Branch[]>`, `setQueryData<Branch[]>`) → `BranchRead[]`.

3. **Cover state + loop** (after the `fieldErrors` state, ~line 107): port the packages editor's handlers verbatim, adapted to this screen's flat state:

```tsx
  // The cover loop (M7 #214 — the packages editor's Cover card, ported):
  // presign → XHR PUT → the staging key rides the NEXT save. The preview
  // object URL is revoked on replace/remove/unmount (the loop's contract).
  const [coverStatus, setCoverStatus] = useState<CoverUploadStatus>({ phase: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const coverUploading = coverStatus.phase === 'presigning' || coverStatus.phase === 'uploading';

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function presign(req: MediaPresignRequest): Promise<MediaPresignResponse> {
    const result = await presignAdminCoverUpload({ data: req });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data;
  }

  function handleCoverStatus(next: CoverUploadStatus) {
    setCoverStatus(next);
    if (next.phase === 'bound') {
      // Re-upload replaces the key (and revokes the replaced preview URL);
      // binding happens only through the save — the preview reflects
      // state, never commits.
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = next.previewUrl;
      setEditorState((prev) => ({ ...prev, coverImageKey: next.stagingKey }));
    }
  }

  async function startCoverUpload(file: File) {
    try {
      await uploadCover(file, presign, handleCoverStatus, 'branch-cover');
    } catch {
      // XHR error/abort already emitted `failed` through onStatus — the
      // machine never stalls; nothing further to surface here.
    }
  }

  function removeCover() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCoverStatus({ phase: 'idle' });
    // Three-state encoding: null = explicit clear on the next save.
    setEditorState((prev) => ({ ...prev, coverImageKey: null }));
  }
```

(`MediaPresignRequest`/`MediaPresignResponse` join the types import. The editor state is a flat object here, so the packages editor's `prev ?` null-guard collapses — `setEditorState` always has state.)

4. **The save picks the builder by mode** — `saveBranch.mutationFn` (lines 155–163) becomes:

```ts
    mutationFn: async (input: SaveBranchInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminBranchCreate({ data: buildBranchCreatePayload(input.state) })
          : await saveAdminBranchUpdate({
              data: { id: input.row.id, payload: buildBranchUpdatePayload(input.state) },
            });
      return { input, result };
    },
```

5. **The Sheet's Cover block** — inside the `LightEntityEditor` children (after the two-checkbox `div`, before the closing tag, ~line 580), insert the ported block:

```tsx
          <div className='space-y-3 rounded-lg border p-4'>
            <p className='text-sm font-medium'>Cover</p>
            {/* Preview precedence (the packages editor's law): a fresh
                bound upload shows the local object URL; a pending removal
                (coverImageKey: null) shows the placeholder; else the
                read's coverImageUrl; else the placeholder. The preview
                reflects state, never commits. */}
            {coverStatus.phase === 'bound' ? (
              <img
                src={coverStatus.previewUrl}
                alt={`${editorState.name} cover`}
                className='aspect-[3/2] w-full rounded-md object-cover'
              />
            ) : editorState.coverImageKey === null ? (
              <div className='bg-muted text-muted-foreground grid aspect-[3/2] w-full place-items-center rounded-md'>
                <Image aria-hidden='true' className='size-8' />
              </div>
            ) : editorState.coverImageUrl ? (
              <img
                src={editorState.coverImageUrl}
                alt={`${editorState.name} cover`}
                className='aspect-[3/2] w-full rounded-md object-cover'
              />
            ) : (
              <div className='bg-muted text-muted-foreground grid aspect-[3/2] w-full place-items-center rounded-md'>
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
                    void startCoverUpload(file);
                  }
                }}
              />
              <Button
                variant='outline'
                type='button'
                disabled={coverUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload cover
              </Button>
              <Button variant='ghost' type='button' disabled={coverUploading} onClick={removeCover}>
                Remove cover
              </Button>
            </div>
            {coverStatus.phase === 'presigning' ? (
              <p className='text-muted-foreground text-xs'>Presigning…</p>
            ) : null}
            {coverStatus.phase === 'uploading' ? (
              <p className='text-muted-foreground text-xs'>
                Uploading…{' '}
                {coverStatus.total > 0
                  ? Math.round((coverStatus.sent / coverStatus.total) * 100)
                  : 0}
                %
              </p>
            ) : null}
            {coverStatus.phase === 'bound' ? (
              <p className='text-muted-foreground text-xs'>Cover ready — save to bind it.</p>
            ) : null}
            {coverStatus.phase === 'failed' ? (
              <p className='text-destructive text-xs'>Upload failed: {coverStatus.message}</p>
            ) : null}
            <p className='text-muted-foreground text-xs'>JPG only, up to 50 MiB.</p>
          </div>
```

6. **Editor lifecycle reset** — `openCreate` and `openEdit` additionally reset the upload state so a reopened Sheet never shows a stale preview: `setCoverStatus({ phase: 'idle' });` and, if `previewUrlRef.current` is set, revoke it and null the ref (the same two lines `removeCover` opens with). The packages editor achieves this by unmounting; this Sheet's children stay mounted across `keepEditorOpen`, so the explicit reset is the port.

- [ ] **Step 5: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run` — **17 files / 189 tests** (184 + the 5 new lib its). `pnpm --filter @sevendays/admin typecheck` — green (this is the first task whose typecheck sees the whole admin ripple — `Branch` survives nowhere on this side after the sweep; grep `import type { Branch }` in apps/admin to confirm zero hits). `pnpm --filter @sevendays/admin fix` (re-run the suite). Commit:

```bash
git add apps/admin/src/lib/cover-upload.ts apps/admin/src/lib/cover-upload.test.ts apps/admin/src/lib/light-entity-state.ts apps/admin/src/lib/light-entity-state.test.ts apps/admin/src/lib/batch-photo-upload.ts apps/admin/src/lib/batch-photo-upload.test.ts apps/admin/src/lib/admin.functions.ts apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/gallery/gallery-screen.tsx
git commit -m "feat(admin): the branch Sheet grows the Cover block - the tri-state seam, the branch-cover purpose, the tray caption pass-through (#214)"
```

### Task 6: `apps/landing` — BranchCard wears the CoverPanel, the walls render captions, the BranchRead ripple

**Load the UI/UX skill set before this task's edits** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant). Two one-element insertions into ruled compositions + a mechanical type sweep — no owner-reacted rendered-variants round (header justification).

**Files:**
- Modify (test-first): `apps/landing/src/lib/gallery-tabs.test.ts`
- Modify: `apps/landing/src/lib/booking.test.ts`, `apps/landing/src/lib/booking-read.test.ts`, `apps/landing/src/lib/bookable-branches.test.ts`
- Modify: `apps/landing/src/components/branch-card.tsx`, `apps/landing/src/routes/about.tsx`, `apps/landing/src/lib/booking.ts`, `apps/landing/src/lib/booking-read.ts`, `apps/landing/src/lib/bookable-branches.ts`

**Interfaces:**
- Produces: `BranchCard` renders a cover (`CoverPanel`) above its heading; the about wall renders `photo.caption` when present; every landing `Branch` reference is `BranchRead`.
- Consumes: Task 2's `BranchRead`; the ruled `CoverPanel` (components/cover-panel.tsx — self-boxed `h-40`, placeholder verbatim).

**Not here:** the booking wizard's step-1 `ChoiceCard` (stays text-only — the wizard's visuals are the redesign's #223 payload; the wire type flows without a JSX change); `branch-strip-item.tsx` (orphaned — imported nowhere; the redesign revives or deletes it); the confirmation join and services chips (name-only consumers — the type sweep covers them); any empty-state/CTA change (none of this ticket's business).

- [ ] **Step 1: Write the failing test + re-seat the fixtures**

(a) `apps/landing/src/lib/gallery-tabs.test.ts` — the `photo()` fixture (lines 10–18) gains the field:

```ts
function photo(categoryId: string): PublicGalleryPhoto {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    photoUrl: `https://pub-test.r2.dev/gallery/${String(n).padStart(12, '0')}.jpg`,
    title: `Photo ${n}`,
    caption: null,
    categoryId,
  };
}
```

and inside `describe('photosForTab')`, a new it:

```ts
  it('passes photo captions through untouched (M7 #214: the wall renders them when present)', () => {
    const weddings = category('Weddings');
    const withCaption = { ...photo(weddings.id), caption: 'The last frame of the day' };
    const gallery: GalleryRead = { categories: [weddings], photos: [withCaption] };
    expect(photosForTab(gallery, weddings.id)[0]?.caption).toBe('The last frame of the day');
    expect(photosForTab(gallery, ALL_TAB_ID)[0]?.caption).toBe('The last frame of the day');
  });
```

(b) The three `Branch` fixtures each gain `coverImageUrl` after their `acceptsWalkIns` line (the field is the pin, the position is biome's): `booking.test.ts`'s `branch()` builder (lines 38–49) carries a real URL — `coverImageUrl: 'https://pub-test.r2.dev/covers/branch-a.jpg',` — so the non-null arm is exercised across its callers; `booking-read.test.ts`'s `branch()` (lines 65–76) and `bookable-branches.test.ts`'s `branch()` (lines 5–16) carry `coverImageUrl: null,`.

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/landing test -- --run` then `pnpm --filter @sevendays/landing typecheck` — the typecheck is the red: the three `Branch` fixtures' `coverImageUrl` and the captioned photo object reject against the wire types still referenced... precise red per file: `PublicGalleryPhoto` already carries `caption` (Task 3), so the gallery-tabs fixture + its are GREEN-ON-ARRIVAL (the new it pins the passthrough against future regression — the #143 lib-seam posture); the red is the three `Branch` fixtures (`Branch` has no `coverImageUrl` — typecheck fails until Step 3's sweep). Record it.

- [ ] **Step 3: Implement the landing half**

(a) `apps/landing/src/components/branch-card.tsx` — the import block gains `import type { BranchRead } from '@sevendays/types';` (replacing the `Branch` import) and `import { CoverPanel } from './cover-panel';`; the component signature becomes `export function BranchCard({ branch }: { branch: BranchRead })`; and the cover mounts as the article's FIRST child, above the `<h3>`:

```tsx
    <article className='flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <CoverPanel name={branch.name} coverImageUrl={branch.coverImageUrl} />
      <h3 className='font-semibold text-brand-ink text-xl'>{branch.name}</h3>
```

(The CoverPanel self-boxes at `h-40 w-full rounded-lg` — no `className` needed; null renders the ruled initials placeholder verbatim. The file's header comment gains one line after its existing first paragraph: `// M7 #214: the branch wears its CMS cover via the ruled CoverPanel — null falls back to today's placeholder verbatim.`)

(b) `apps/landing/src/routes/about.tsx` — the tile (lines 104–108): the title figcaption keeps its conditional; the caption line mounts after it, inside the `<figure>`:

```tsx
                  {photo.title && (
                    <figcaption className='text-muted-text mt-2 px-3 pb-2 font-mono text-[11px]'>
                      {photo.title}
                    </figcaption>
                  )}
                  {photo.caption && (
                    <p className='text-muted-text px-3 pb-2 text-xs leading-relaxed'>
                      {photo.caption}
                    </p>
                  )}
```

(No caption renders nothing extra — the conditional IS the law. The caption renders in the wall's existing muted family, one step larger than the mono title line: the title is the label, the caption is the story.)

(c) The type sweep — in each file, the `@sevendays/types` import's `Branch` becomes `BranchRead` and every `Branch` annotation follows: `lib/booking.ts` (`BookingCatalog.branches: Branch[]` at :25 + the helpers taking `branches` around :112–117), `lib/booking-read.ts` (`branchNameFor` at :31–33), `lib/bookable-branches.ts` (:9–15). Grep `apps/landing/src` for `Branch[^R]` after the sweep to confirm only `BranchRead` remains (route files' inferred types flow — `routes/branches.tsx`, `routes/book.tsx`, `routes/booking.$id.tsx`, `routes/services.tsx` need no edits unless the grep says otherwise).

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/landing test -- --run` — **9 files / 84 tests** (83 + the caption-passthrough it). `pnpm --filter @sevendays/landing typecheck` — green. `pnpm --filter @sevendays/landing fix` (re-run). Commit:

```bash
git add apps/landing/src/components/branch-card.tsx apps/landing/src/routes/about.tsx apps/landing/src/lib/booking.ts apps/landing/src/lib/booking-read.ts apps/landing/src/lib/bookable-branches.ts apps/landing/src/lib/booking.test.ts apps/landing/src/lib/booking-read.test.ts apps/landing/src/lib/bookable-branches.test.ts apps/landing/src/lib/gallery-tabs.test.ts
git commit -m "feat(landing): branch cards wear the ruled CoverPanel, gallery walls render captions (#214)"
```

### Task 7: Gates, docs rotation, PR/merge, the v1 pick, the ledger row, issue close

**Files:**
- Modify: `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/` (via `graphify update .`)

**Interfaces:**
- Consumes: everything Tasks 1–6 landed; the spec's v1-pick class ledger row ("Branch covers + gallery captions | **PICK clean** | Catalog + wire + CMS + landing walls").

**Not here:** the M7 close-out's exit verification (#225 owns the reflection scenario); any redesign work (#223/#224); `docs/staff-provisioning.md`.

- [ ] **Step 1: The full-repo gate**

`pnpm build:packages` (fresh), then `pnpm check` — **everything green, floors: types 15/143, api 28 passed + 1 skipped files (29) / 397 passed + 3 skipped, api-client 5/37, admin 17/189, landing 9/84, db 4 files.** (Executor reconciles actuals per the Global Constraints rule — a mismatch is investigated, never loosened.) Then `pnpm build` (the deploy-shape build — CI runs it).

- [ ] **Step 2: Docs rotation (pre-PR)**

(a) `docs/plan.md` — the M7 box `- [ ] Schema + admin + API — branch covers (...) + gallery captions onto the public gallery wire + the batch-upload tray (walls render captions when present)` becomes `- [✅]` with the landed annotation appended:

```text
 _(2026-10-XX, #214: migration 0010 — the nullable `cover_image_key`; the `'branch-cover'` presign purpose over the ADR-0019 pipeline; the tri-state cover on the branch save; `coverImageUrl` resolved on every read, raw keys never leaving; the #213 branch delete now drops the cover object post-commit; caption on the public wire + the tray pass-through; the landing card wears the ruled CoverPanel and the walls render captions)_
```

(b) `docs/progress.md` — insert at the top of the dated entries, in the file's established voice:

```text
2026-10-XX — #214, M7 ticket 03, branch covers + gallery captions live: branches carry a nullable `cover_image_key` (migration 0010, born-null — the live branches have no covers yet) managed per the packages-covers precedent — the new `'branch-cover'` presign purpose (covers/ prefix shared), the presence-encoded create (`absent = no cover`), the tri-state update (absent/null/staging → unchanged/clear/bind-replace with the old object deleted only after the commit), the guarded DELETE extended to drop the cover object post-commit, and `coverImageUrl` resolved on every read (public + admin) — raw keys never leave the API. The CMS branch Sheet ports the packages editor's Cover block verbatim; the landing `/branches` card wears the ruled CoverPanel (null = the initials placeholder verbatim). Gallery captions ride the public wire (`caption: string | null`), the batch tray commits the item's caption unchanged (null at enqueue — pre-commit editing stays ruled out), and the `/about` walls render them when present. The booking wizard's branch step stays text-only (the redesign's). Floors: types 15/143, api 28+1 skipped files/397+3 skipped, api-client 5/37, admin 17/189, landing 9/84; plan.md's M7 branch-covers box ticked. v1: PICK clean per the spec's class ledger, executed as a paths-split (the booking-cluster type ripple drops; branch-card.tsx + the api-client mocks are transformed surfaces).
```

(c) `AGENTS.md` — three surgical amendments: (1) in the big status paragraph's public-read sentence, `the branches read is active-only` becomes `the branches read is active-only (coverImageUrl resolved at read time — raw keys never leave; M7 #214)`; (2) in the media-seam sentence, `the session-gated presign endpoint and commit contract` becomes `the session-gated presign endpoint and commit contract under three media purposes (package-cover, branch-cover, gallery-photo)`; (3) read the guarded-DELETE sentence — `covers/photos delete post-commit per ADR-0019` already covers branch covers structurally, so amend only if the sentence names packages exclusively (it does not — verify by reading, edit only then). Also the "Current status of `pnpm test`" floors update to the Step-1 numbers. Keep every edit minimal — AGENTS.md reaches v1 via the pick's client-safe-hunk rule, and these lines are mechanics-free.

- [ ] **Step 3: PR + squash merge**

```bash
git add docs/plan.md docs/progress.md AGENTS.md
git commit -m "docs: the #214 close-out - the M7 box ticked, floors rotated (#214)"
gh pr create --title "feat: branch covers + gallery captions — the packages-covers precedent on branches, captions on the public wire (#214)" --body "Implements #214 (M7 ticket 03; spec § landing redesign / prototype-inherited items). Branch covers: migration 0010 + the branch-cover purpose + the tri-state save + wire resolution + the delete-side object drop + the CMS Cover block + the ruled CoverPanel on /branches. Captions: public wire + tray pass-through + the walls. Floors: types 15/143, api 29 files/397+3, api-client 5/37, admin 17/189, landing 9/84." --base main
```

Squash-merge (the repo's standing style), note the squash SHA, and close #214 with a comment summarizing the four ACs as landed (upload+resolution / strips+placeholder / caption everywhere / contract tests).

- [ ] **Step 4: The v1 pick (post-merge, per docs/agents/v1-picks.md)**

`node scripts/v1-triage.mjs <squash-sha>` — expected verdict: **SPLIT by paths** (the booking-cluster globs catch the type-ripple edits to `apps/landing/src/lib/booking.ts`, `booking-read.ts`, and their tests — `lib/booking*` is main-only; everything else is v1-path), narrowing on content to a **pick of the v1-path hunks** — the spec's ledger pre-ruled this ticket **PICK clean** meaning content-wise; the path split is mechanical. Execute per the runbook (`cd ~/Projects/sevendays-v1-seed && git switch v1 && git pull --ff-only origin v1 && git fetch origin main && git cherry-pick -x <squash-sha>`), resolving conflicts per the conflict policy:

- `apps/landing/src/components/branch-card.tsx` — a **transformed surface**: keep v1's booking-off CTA set (the single `Call {branch}` `tel:` primary, no Book link), apply the CoverPanel insertion + the BranchRead retype around it.
- `packages/api-client/test/{mock-api,loopback,typing}.test.ts` — transformed: v1's variants lack the appointments mock; re-apply the BRANCHES/GALLERY fixture + assertion hunks around v1's own mock shape (the #213 ledger's "re-inserted from the squash blob" surgery — `git show <squash-sha> -- <path>` is the source of truth).
- `docs/plan.md`, `AGENTS.md`, `docs/progress.md` — **content-dropped** (edition mechanics + floors prose; only client-safe hunks may land, and these aren't) → the pick becomes a split record.
- The `lib/booking*` hunks drop wholesale (main-only paths).

Then the locks: `pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build`, `pnpm check && pnpm build`, `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` (exit 0), push, `gh run watch` — `check: success`, `Deploy v1 (private): success`, `Deploy teaser (main): skipped`.

- [ ] **Step 5: The ledger row + graphify + close-out**

(a) `docs/agents/v1-picks.md` — append the ledger row (a main PR — itself a skip), in the table's established voice, recording: **#214 — split** (paths: booking-cluster type ripple dropped; content: clean) — branch covers + captions picked to v1 whole (schema/migration, types, api, api-client minus the appointments-mock conflicts re-applied, admin, landing branch-card CoverPanel applied around v1's call-forward CTAs, about-wall captions), the docs hunks content-dropped, v1's floors: types 15/143, api +9, admin +5, landing +1 as on main.

(b) `graphify update .` (code was modified — AGENTS.md rule). Commit the ledger row + any docs follow-ups:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #214 ledger row — the branch-covers/captions split (booking-cluster ripple dropped, branch-card + mock conflicts resolved per policy)"
```

(c) Post-merge live check (the owner's eyeball, offered not blocked-on): the compose stack answers `GET /api/v1/branches` with `coverImageUrl: null` rows and `GET /api/v1/gallery` with `caption` on every photo.
