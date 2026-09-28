# M5 Ticket 08 — Landing Integration: /about Tabbed Gallery, Testimonials Slot, CoverPanel, Empty States — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The landing consumes the landed public reads (#138) client-side. `/about` gains the **tabbed gallery**: tabs derived from the fetched `GET /api/v1/gallery` payload (no hardcoded list) — an **"All" tab first and default** plus one tab per category holding ≥1 active photo, in category position order — with **client-side filtering** over the single fetch and photos rendered payload-ordered; the testimonials slot renders `GET /api/v1/testimonials`. The **CoverPanel rule** applies wherever a package cover renders — packages list, detail, home featured — via one shared component: `coverImageUrl` present → `img` (object-cover, alt = package name, `loading="lazy"` on list cards); null → **today's initials placeholder verbatim**, keeping the CDP assertion "cover placeholder present ⇔ no cover" meaningful. Empty/degraded states never render blank: zero active packages → an explicit empty-state line in the house `TODO(owner-copy)` pattern (text CDP-assertable); the home featured strip **collapses entirely** on zero active packages; `/about` shows the **"Portfolio coming soon."** placeholder with the tab row hidden when there are no photos; testimonials keep the existing coming-soon line on zero; a deactivated/unknown slug keeps the existing uniform not-found (untouched). Deactivated-lookup hiding stays silent; the by-slug detail query keeps `staleTime: Infinity` — freshness is a fresh-page-load property, no cache layer added.

**Architecture:** Four tasks, zero `apps/api`, `packages/api-client`, `packages/types`, and `packages/db` changes — the reads and their wrappers landed in #138 and are consumed as-is. (1) The Step-0 ordering gate, baselines, and branch. (2) The CoverPanel rule plus the three package surfaces: `cover-panel.tsx` reworked around `{ name, coverImageUrl, className? }` (null branch byte-verbatim), the `PackageCard`/`PackageCoverCard` call-site swaps (the home stand-in cover mapper `packageCover`/`COVERS` dies — this is the "M5 swaps it wholesale" it was written for), the packages empty-state line, and the home featured-strip collapse; the packages surface's one ruled CDP edit pins the cover ⇔ rules. (3) The `/about` data layer (two server fns + two query factories riding the landed `galleryRoutes`/`testimonialsRoutes` wrappers, loader-prefetched like every route) behind a TDD'd pure lib seam (`gallery-tabs.ts`: tab derivation, per-tab filtering, the portfolio-empty predicate), the about page rewrite, and the /about surface's one ruled CDP edit. (4) Full gates, the stays-silent/stays-pinned audit, docs rotation, PR/merge, v1 pick, close.

**Acceptance criteria → tasks (issue #142's four):**
- AC-1 "`/about` renders tabs from the payload with 'All' first/default; filtering is client-side over the single fetch" → **Task 3** (lib seam TDD + the rewrite + the derived CDP checks incl. the armed click-through).
- AC-2 "The cover rule holds on all three package surfaces; the placeholder assertion stays intact on null" → **Task 2** (CoverPanel + the three call sites; the packages-pages ⇔ assertion; the byte-verbatim null branch).
- AC-3 "Each ruled empty state renders (packages line, home strip collapse, portfolio placeholder + hidden tab row, testimonial line)" → **Task 2** (packages line, home collapse) + **Task 3** (portfolio placeholder + hidden tab row, testimonial line); verification posture per AR6.
- AC-4 "CDP read-only assertions extended beside the existing scenarios; `pnpm check` green" → **Tasks 2–4** (the two ruled script edits + the read-only trio at every gate; the 35/35 close gate).

**Tech Stack:** `@tanstack/react-query` `5.102.8`, `@tanstack/react-router` `1.170.39`, `@tanstack/react-start` `1.168.58`, react `19.2.8`, vite `8.2.2`, vitest `4.1.11`, zod `4.5.1`, `cn` `0.3.0` (a tailwind-merge-compatible merge engine — `cn('h-40', 'h-full')` resolves conflicts last-wins, which the CoverPanel `className` override relies on), Tailwind v4 CSS-first, pnpm + Turborepo, raw-CDP verify harness. **No new dependency anywhere in this ticket.**

**Spec:** Implements ticket [#142 "M5 ticket 08 — Landing integration: /about tabbed gallery, testimonials slot, CoverPanel, empty states"](https://github.com/jeius/sevendays/issues/142) (label `ready-for-agent`), whose parent is the M5 spec `docs/specs/2026-09-24-m5-admin-cms-spec.md` (issue #134 — this ticket's section: § Landing integration (client-side consumption), plus § Testing posture and § v1-pick posture). Key recon facts (2026-09-28, `main` at the post-#149 tree, compose db available):

- **The dependency of record is #138's LANDED read surface (PR #147).** `GET /api/v1/gallery` answers one assembled `{categories, photos}` (`PublicGalleryCategory = {id, name}`, `PublicGalleryPhoto = {id, photoUrl, title: string | null, categoryId: z.uuid()}` — **categoryId is non-nullable, so uncategorized photos are structurally absent from the payload**), `GET /api/v1/testimonials` answers `PublicTestimonial[] = {id, quote, person}`, both position-ordered, active-only, and parsed by the api-client wrappers `galleryRoutes.list()` / `testimonialsRoutes()` (`packages/api-client/src/routes/gallery.ts`, `routes/testimonials.ts`, wired in `index.ts`). The package reads emit `ServicePackageRead` with `coverImageUrl: string | null` (raw keys never leave the API); the landing's components already carry that type (the #138 Task-2 sweep). **The landing currently imports NO gallery/testimonial wrapper** — `apps/landing/src/lib/api.functions.ts` is the server-fn seam (Sentry spans, `getApiClient()` from the server-only `api.server.ts` — ADR-0006 forbids the API base URL in any client bundle, so "client-side" means TanStack Query state over server-fn transport, the established pattern; filtering/tab state is React `useState`). **The branch cuts off main ONLY after #141's closing PR merges** (the ticket body's Blocked-by is the M5 ordering discipline: 04 landed; 07's screens exercise the reads this ticket consumes — the landing needs only #138's artifacts, but the ordering holds). Task 1 Step 0 verifies #138's artifacts AND #141's merged state, else STOP.
- **Today's cover rendering:** `apps/landing/src/components/cover-panel.tsx` is the unconditional initials placeholder — a `flex h-40 … rounded-lg` deep-petrol gradient block with the package's initials and the visible line `Cover photo coming soon` — consumed ONLY by `package-card.tsx` (which serves BOTH the `/packages` list cards and the `/packages/$slug` detail page via `cta='detail'`). The home featured strip never shows it: `PackageCoverCard` in `home-cards.tsx` renders a deterministic stand-in photo (`packageCover(pkg.id)` cycling three local `/photos/*.jpg`, alt `Cover for <name> — stand-in until R2 assets arrive`) under two ink scrims with name/price overlaid. The only CDP cover assertion today is inside `packages-pages.mjs`'s detail check: `detail.includes('Cover photo coming soon')` — an assertion that assumes null covers and **breaks the day a real cover binds**; the ruled Task 2 script edit rewrites that clause into the ⇔ rule (this is the "the ⇔ assertion must survive" the controller pins). Live catalog reality: every cover is null today (covers bind through the admin CMS; the owner has uploaded none), so the null branch is the live-exercised one and the img branch is rule-armed.
- **The /about surface today:** `apps/landing/src/routes/about.tsx` is three static sections — story placeholder (`Our studio story is coming soon.` + its `TODO(owner-copy)` comment), testimonials placeholder (`What clients say is coming soon.` + comment), and an empty portfolio drop-in slot (`<div … data-portfolio-grid />`, no data fetching, no loader). `content-pages.mjs` asserts exactly two /about checks: the two placeholder lines, and the empty grid (`[data-portfolio-grid]` article/img count `=== 0`) — both are content-sensitive assumptions this ticket's ruled /about script edit rewrites into payload-derived ⇔ rules (the story line itself stays byte-asserted — it is not this ticket's). **The live gallery and testimonials tables are CMS-born-empty** (AGENTS.md: "the M5 gallery/testimonials tables exist, CMS-born-empty"; the seed never inserts gallery/testimonial rows — `packages/db/scripts/seed.ts` is catalog-only), so BOTH /about empty states are genuinely live-exercised by the extended script, not merely armed.
- **The empty packages/home states cannot be produced read-only** on a seeded catalog (producing them means deactivating all 11 packages — a CMS mutation). Their verification posture is pinned as AR6: the exact JSX is quoted in-plan, the collapse's input contract is pinned by a new `featured.test.ts` case (`selectFeaturedPackages([])`), and `packages-pages.mjs` gains data-driven ⇔ rules (empty-state line ⇔ `packages.length === 0`; featured strip present ⇔ `packages.length > 0`; per-card cover rule) that are green on today's populated catalog and **stay armed** — they exercise for real the first time the state occurs, which is exactly what #143's mutating `cms-reflection.mjs` gate drives (a scratch package created → deactivated; NOT this ticket's — scope fence).
- **The staleTime pin already exists and stays byte-untouched:** `apps/landing/src/lib/queries.ts` `servicePackageQueries.bySlug` carries `retry: false` + `staleTime: Infinity` with the 404-contract docstring; the ticket's "keeps `staleTime: Infinity`" is a MUST-STAY (Task 4 audits it mechanically). The new gallery/testimonial query factories take the DEFAULT staleTime — every fresh page load refetches through the loader's `ensureQueryData` (the spec's "immediately = a fresh page load shows current data"; no cache layer added).
- **The CDP byte-contract, enumerated (what each script asserts today — all must stay green unless this plan's two ruled edits touch them):** `packages-pages.mjs` = **12 checks** (home hero headline; home Book-now CTA deep-link; home featured heading; home strip card count = re-derived `selectFeatured`; home strip price-ascending order; strip cards deep-link `/book?package=<id>`; /packages renders every active package; /packages full details (cheapest peso + 'Inclusions'); `/packages/:slug` renders by slug **incl. the `Cover photo coming soon` clause**; detail deep-link targets the uuid; unknown slug uniform not-found; unknown slug not an error boundary). `content-pages.mjs` = **16 checks** (home services teaser strip; home branches via footer+emphasis (the #101 ruled edit); home gallery wall ≥6 figures; home teaser deep-links; home View-all-services; home ratified hero blurb; /services cards/prices/chips/cross-ref/deep-links (5); /branches name+address+phone/walk-in both states/deep-links (3); **/about story+testimonial placeholders; /about empty portfolio grid**). `booking-wizard.mjs` = **15 checks**, untouched and out of scope — it is the third leg of the read-only regression trio (43 checks today → **52 after this ticket**: 17 + 20 + 15). `booking-e2e.mjs` (mutating) and `confirmation-emails.mjs` are NOT in this ticket's gates. Harness mechanics: raw CDP over Node's WebSocket (`scripts/verify/lib.mjs` — `connect()` gives `go/text/evaluate/wait/close`; dead socket rejects loudly), stack = API dev `:8787` + landing dev `:3000` + Chrome `--remote-debugging-port=9222` (binary per the #99 precedent: `google-chrome` else the Playwright headless shell), URLs from `LANDING_VERIFY_URL`/`API_VERIFY_URL`, and the house discipline: **every expectation re-derived from the live API responses — never imported, never hard-coded catalog values.**
- **No `tabs` primitive exists in `packages/ui`** (the 22 Tier-1 primitives have no tabs entry) and the scope fence adds none — the tab row is a hand-rolled `role='group'` of `aria-pressed` toggle buttons, the ARIA adjudication the repo already ruled for toggle-card semantics (#99's ChoiceCard). No router generation is needed (no route added/renamed; `routeTree.gen.ts` untouched).
- **Test harness:** landing vitest = plain-node **lib-seam tests only** (no component/DOM tests, no new deps — spec posture), currently **7 files / 62 tests**; fixtures are hand-built object literals (the `featured.test.ts` `pkg()` builder pattern). This ticket adds ONE lib file + its test file and ONE case to `featured.test.ts` → **8 files / 69 tests** (per-task: Task 2 → 63, Task 3 → 69). `noUncheckedIndexedAccess` is ON; biome bans non-null assertions; `pnpm --filter @sevendays/<pkg> fix` is canonical before every commit.
- **Sibling fences (spec § Tickets; `docs/plan.md` M5 block):** this ticket owns M5 checkbox **"Landing integration: /about tabbed gallery …"** exclusively and ticks it at close. NOT here, regardless of temptation: the admin gallery/testimonials/lookups screens (#141 — its checkbox stays unticked until that ticket's own close); the mutating verification (`cms-reflection.mjs` + the seed demotion + admin lib-seam seating — #143's); any API/wrapper/type change (zero — consumed as landed); booking surfaces (the wizard, e2e, email scripts; `/book` links render untouched); the home gallery masonry and home testimonials placeholder strips (spec: they "stay untouched stand-ins" — only the FEATURED strip learns the collapse); the services cards' stand-in backgrounds (`serviceBackground` — Studio Services are not packages; no cover rule there); owner-copy strings beyond the two this plan rules on (AR1's packages line lands behind `TODO(owner-copy)`; the story line and home strips are not this ticket's copy).
- **Baselines (live, 2026-09-28, re-measured by this plan's author):** `apps/landing` = **7 files / 62 tests passed**; `apps/api` = **24 files / 278 passed + 3 skipped** (the #138 floor; the vitest-4 "close timed out" exit noise is pre-existing — judge the Test Files/Tests lines only); `packages/types` = 13 files / 112; `packages/db` = 22 passed + 8 skipped; CDP read-only trio = 12 + 16 + 15 = **43 checks**; `pnpm check` = **35/35 turbo tasks**. **This plan's post-state: landing 8 files / 69 tests; CDP trio 17 + 20 + 15 = 52; api/types/db counts unchanged; check 35/35 (no scripts added).** Per-task cumulative pins: Task 2 → landing 63, CDP trio 17/16/15; Task 3 → landing 69, trio 17/20/15; Task 4 re-measures everything at the final tree.
- **No clarify call (controller ruling 1):** owner-ratified literals come only from spec #134 and ticket #142's body (`Portfolio coming soon.` is spec-verbatim; the testimonial and story lines exist). Where this ticket leaves a genuinely open choice, the plan pins a spec-consistent default labeled **agent ruling (owner-review pending)** — AR1–AR6 below, surfaced in the PR + closing comment. The empty-state copy discipline is `TODO(owner-copy)`: the packages line lands behind the house comment pattern with CDP-assertable text; the CoverPanel placeholder is today's VERBATIM.

## Global Constraints

- **Branch & ordering gate (binding):** `feat/142-m5-08-landing-integration`, cut off **main** — but ONLY after the PR closing #141 (M5 ticket 07, admin gallery/testimonials/lookups screens) is merged: `gh issue view 141 --json state --jq .state` must read `CLOSED`. The landing consumes #138's landed public reads, not #141's screens — but the ordering is the milestone's discipline and Task 1 Step 0 verifies BOTH (#141 closed; #138's artifacts present) and re-measures the baselines. Any miss → **STOP and report** (do not re-create landed work). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#142)` squash style; every commit below is pinned verbatim. Evidence (gate runs, CDP output) lands in gitignored `.superpowers/sdd/2026-09-27-142-m5-08/`.
- **The CDP seams are a byte-contract (controller ruling 3, binding):** the existing verify scripts' assertions stay green unless this plan pins the edit. This plan pins EXACTLY TWO script edits, one per surface — the #98 precedent spent once per surface: (a) `packages-pages.mjs` (Task 2): the detail check's `Cover photo coming soon` clause rewrites into the ⇔ cover rule plus four appended rule checks; (b) `content-pages.mjs` (Task 3): the two /about checks rewrite into the derived set (story line byte-kept) plus the armed filtering check. Each script edit lands as **its own pinned commit** whose body quotes the ruling: "CDP byte-contract ruling (controller, #142): the cover-rule assertion 'placeholder present ⇔ no cover' MUST survive; script edits are ruled per-surface and land pinned." `booking-wizard.mjs` is byte-untouched and stays green at every CDP gate. The scripts stay read-only: no CMS writes, no db writes, no POST-driving (the wizard's rejection-drive precedent is not invoked here).
- **Cover rule (controller ruling 4 + spec, binding):** `coverImageUrl` present → `<img src={coverImageUrl} alt={package name} loading='lazy'>` with `object-cover`; null → **today's placeholder verbatim** (the initials block: same gradient, same two spans, same visible text `Cover photo coming soon` — surface sizing may adapt via `className`, the placeholder's CONTENT may not change). One shared `CoverPanel` serves all three surfaces (packages list via `PackageCard`, detail via `PackageCard cta='detail'`, home featured via `PackageCoverCard`). The list cards' imgs are `loading='lazy'` (spec-pinned); detail and home-featured covers are ALSO lazy (agent ruling AR2 — consistent, and home's stand-ins were lazy already).
- **Data fetching (controller ruling 4, binding):** `/about`'s gallery + testimonials ride the landed api-client wrappers through TWO new landing server functions (`getGallery`/`getTestimonials`, Sentry spans, the `api.functions.ts` house pattern) + two query factories with the DEFAULT staleTime, loader-prefetched via `ensureQueryData` exactly like `/packages` and home — SSR reads per request, no cache layer, tab filtering is client state over the single fetched payload. The by-slug detail query keeps `staleTime: Infinity` byte-unchanged; deactivated-lookup hiding stays silent (no notices, no badges — the landing renders the resolved read shape as-is).
- **Empty states (spec-verbatim, binding):** zero active packages → the packages empty-state line (AR1's pinned text behind `TODO(owner-copy)`, CDP-assertable); home featured strip with zero → **collapses entirely** (no heading, no box — the whole `<section data-strip='featured'>` unmounts; the home gallery + testimonials stand-in strips stay); `/about` portfolio with zero photos → tab row hidden + `Portfolio coming soon.`; zero testimonials → the existing `What clients say is coming soon.` line stays; a deactivated/unknown slug keeps the existing uniform not-found (that route file is untouched).
- **Gates (repo AGENTS.md + controller rulings, verbatim duties):** after any manifest change run `pnpm install`. Before anything that typechecks the landing, run `pnpm build:packages && pnpm --filter @sevendays/api build` (api-client exports SOURCE; its types resolve the API's `AppType` from the built `dist/`); the per-task type gate is `pnpm --filter @sevendays/landing typecheck` after those builds, plus `pnpm --filter @sevendays/landing test` at the per-task test-count pin. Every task commits only with `pnpm check` green for the packages it touched (this ticket touches landing + docs only; the api suite needs the compose db up ONLY at the Task 1 baseline re-measure and Task 4's full gate: `docker compose up -d db` first). CDP verification is each surface task's own gate: bring the stack up per Task 2 Step 5, run the read-only trio, record output under `.superpowers/sdd/2026-09-27-142-m5-08/`. Biome canonical form via `pnpm --filter @sevendays/landing fix` before committing — accept its rewrites (copy pins are semantic, formatting is biome's). Tick checklist boxes with `- [✅]`, never `[x]`. Never commit secrets. Run `graphify update .` at close (code was modified).
- **Baselines (binding):** landing **7 files / 62 tests**; api **24 files / 278 passed + 3 skipped**; types 13 files / 112; db 22 passed + 8 skipped; CDP trio **43** (12 + 16 + 15); check **35/35**. **Post-state: landing 8 files / 69; trio 52 (17 + 20 + 15); everything else unchanged.** Per-task pins: Task 2 → landing 63, trio 17/16/15; Task 3 → landing 69, trio 17/20/15. If any count differs at a gate, reconcile against the task's test/check blocks — do not loosen assertions.
- **Live-DB reality (binding):** the CDP stack may target EITHER the compose db (seeded via `pnpm --filter @sevendays/db db:seed` with `DATABASE_MIGRATE_URL` pointing at `postgresql://postgres:postgres@localhost:5432/sevendays_test`, verified by `db:verify-seed`) or the live Supabase via the existing `.dev.vars` — both carry the seeded 11-package catalog and CMS-born-empty gallery/testimonials tables. The scripts' own seed-drift guards (e.g. `basic-package missing from the live API`) are the arbiter. The live Supabase catalog is never written by this ticket; the compose db is routinely truncated by the api suite and re-seedable — no state is precious.
- **Version pins (probed 2026-09-28 via `pnpm --filter @sevendays/landing list … --depth 0`):** `@tanstack/react-query` `5.102.8`, `@tanstack/react-router` `1.170.39`, `@tanstack/react-start` `1.168.58`, `react` `19.2.8`, `vite` `8.2.2`, `vitest` `4.1.11`, `zod` `4.5.1`, `cn` `0.3.0`. Re-probe at Task 1 Step 0; anything else resolves → **STOP and report**. No new dependency anywhere in this ticket.
- **Agent rulings (owner-review pending — spec-consistent defaults, each reversible; surfaced in the PR + closing comment):**
  - **AR1 (packages empty-state line):** the line reads exactly `No packages to show right now — check back soon.` behind the comment `{/* TODO(owner-copy): packages empty-state line — replaced when the client supplies copy. */}`. It describes the real state (a CMS-owned catalog temporarily empty of active packages); the wording is provisional owner copy and CDP-assertable (the ⇔ rule in Task 2's script edit).
  - **AR2 (CoverPanel shape):** props `{ name: string; coverImageUrl: string | null; className?: string }`; `className` re-boxes BOTH branches (the home surface passes `absolute inset-0 size-full rounded-none`; `cn` is tailwind-merge-compatible so `h-40`/`w-full`/`rounded-lg` lose to it). `loading='lazy'` on every cover img (spec pins list cards; detail + home stay lazy). Alt = the package name everywhere (spec-verbatim).
  - **AR3 (home featured null-cover composition):** the placeholder block keeps its place under the card's existing two-layer ink scrims with name/price overlaid — white-on-deep-petrol stays AA under the `/35` wash, and the card's hover mechanics are untouched. Rendered-variant reaction is the owner's; the composition is deliberately the minimal swap (stand-in img → CoverPanel), not a redesign.
  - **AR4 (tab row + grid):** hand-rolled `role='group' aria-label='Portfolio categories' data-gallery-tabs` of `aria-pressed` buttons (no new primitive, no new dep); active pill = `border-brand-700 bg-brand-700 text-white`; grid keeps `data-portfolio-grid` + the existing `grid-cols-2 sm:grid-cols-3 gap-4` rhythm with `aspect-[4/3] object-cover` figures; photo `alt={photo.title ?? 'Studio photograph'}`; figcaption renders only when `title` is non-null. A selected category emptied by a refetch clamps back to All (one guarded line, pinned in the rewrite).
  - **AR5 (testimonials non-zero composition):** the home placeholder band's visual language at slot scale — one `figure` per testimonial, `border-l-2` accent, quote in the serif-adjacent body voice, `figcaption` = `person`. The zero branch keeps the existing line + its `TODO(owner-copy)` comment byte-verbatim.
  - **AR6 (verification posture for the two unreachable states):** the packages empty-state line and the home featured collapse cannot be produced by read-only CDP on a seeded catalog. Their gates: the exact JSX pinned in-plan (Tasks 2), the `selectFeaturedPackages([])` seam case, and the data-driven ⇔ CDP rules (armed — green today, exercise when the state first occurs, full live exercise is #143's mutating gate). The /about portfolio and testimonial empty states ARE live-exercised (CMS-born-empty tables) — no posture caveat there.
- **Scope fence (verbatim):** Tasks 2–3 edit only: `apps/landing/src/components/cover-panel.tsx`, `apps/landing/src/components/package-card.tsx`, `apps/landing/src/components/home-cards.tsx` (PackageCoverCard media swap + the `packageCover`/`COVERS` removal), `apps/landing/src/components/home-image-led.tsx` (the featured-strip collapse only), `apps/landing/src/routes/packages/index.tsx` (the empty branch only), `apps/landing/src/lib/featured.test.ts` (one appended case), `apps/landing/src/lib/api.functions.ts` (two appended server fns), `apps/landing/src/lib/queries.ts` (two appended factories), `apps/landing/src/lib/gallery-tabs.ts` (create), `apps/landing/src/lib/gallery-tabs.test.ts` (create), `apps/landing/src/routes/about.tsx` (rewrite), `apps/landing/scripts/verify/packages-pages.mjs` (Task 2's ruled edit), `apps/landing/scripts/verify/content-pages.mjs` (Task 3's ruled edit). Task 4 rotates `docs/plan.md` (M5 landing-integration checkbox), `docs/progress.md`, `AGENTS.md` (one appended sentence), `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: any `apps/api`, `packages/api-client`, `packages/types`, `packages/db` file (zero changes — the reads, wrappers, and `ServicePackageRead` wire are #138's, landed); `apps/landing/src/routes/packages/$slug.tsx` (the not-found + staleTime stay untouched — audited at Task 4); `apps/landing/src/components/home-copy.ts` and the home gallery/testimonials stand-in strips; `serviceBackground`/services cards; `booking-wizard.mjs`, `booking-e2e.mjs`, `confirmation-emails.mjs`; `routeTree.gen.ts` (no route added); any admin surface (#141); `cms-reflection.mjs` + the seed contract (#143); booking-time behavior.

## File Structure

```text
apps/landing/src/
  lib/
    gallery-tabs.ts             # create (Task 3) — ALL_TAB_ID, deriveGalleryTabs, photosForTab, hasPortfolioPhotos
    gallery-tabs.test.ts        # create (Task 3) — 6 lib-seam tests
    api.functions.ts            # modify (Task 3) — +getGallery, +getTestimonials (Sentry spans)
    queries.ts                  # modify (Task 3) — +galleryQueries, +testimonialQueries (default staleTime)
    featured.test.ts            # modify (Task 2) — +1 empty-catalog case (existing 4 byte-untouched)
    featured.ts                 # UNTOUCHED — the collapse reads packages.length in JSX, not here
    queries.ts (bySlug)         # UNTOUCHED — retry:false + staleTime:Infinity stay (Task 4 audit)
  components/
    cover-panel.tsx             # modify (Task 2) — the cover rule; null branch byte-verbatim
    package-card.tsx            # modify (Task 2) — one-line call-site swap
    home-cards.tsx              # modify (Task 2) — PackageCoverCard media swap; packageCover/COVERS removed
    home-image-led.tsx          # modify (Task 2) — featured strip collapses on zero active packages
    home-copy.ts                # UNTOUCHED — stand-in strips stay
  routes/
    about.tsx                   # modify (Task 3) — loader prefetch + tabbed gallery + testimonials slot
    packages/index.tsx          # modify (Task 2) — the empty-state branch
    packages/$slug.tsx          # UNTOUCHED — uniform not-found + staleTime:Infinity stay
  routeTree.gen.ts              # UNTOUCHED — no route added/renamed
apps/landing/scripts/verify/
  packages-pages.mjs            # modify (Task 2) — the ruled edit: 12 → 17 checks
  content-pages.mjs             # modify (Task 3) — the ruled edit: 16 → 20 checks
  booking-wizard.mjs            # UNTOUCHED — regression leg, stays 15
docs/
  plan.md                       # Task 4 — the M5 landing-integration checkbox ticks
  progress.md                   # Task 4 — the What Exists entry
  AGENTS.md                     # Task 4 — one appended sentence
  agents/v1-picks.md            # Task 4 — ledger row (post-merge)
```

---

### Task 1: The ordering gate, baselines, and branch

**Files:**
- Create: none in the repo tree beyond this plan file's commit.

**Interfaces:**
- Consumes: `main` post-#141; #138's landed artifacts; the compose db.
- Produces: `feat/142-m5-08-landing-integration` at the verified baseline.

**Not here:** any code edit (Task 2 starts the surface work); the CDP stack bring-up (Task 2 Step 5 runs it when first needed).

- [ ] **Step 0: The ordering gate + baseline re-measure (run before ANY edit)**

Run, from the repo root, only AFTER the PR closing #141 has merged:

```bash
git checkout main && git pull && git checkout -b feat/142-m5-08-landing-integration
gh issue view 141 --json state --jq .state
grep -n "galleryRoutes\|testimonialsRoutes" packages/api-client/src/index.ts
grep -n "coverImageUrl" packages/types/src/package.ts
grep -n "staleTime: Infinity" apps/landing/src/lib/queries.ts
ls apps/landing/src/components/cover-panel.tsx apps/landing/scripts/verify/packages-pages.mjs apps/landing/scripts/verify/content-pages.mjs apps/landing/scripts/verify/booking-wizard.mjs
pnpm --filter @sevendays/landing list @tanstack/react-query react vitest --depth 0
docker compose up -d db && pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/landing test
pnpm --filter @sevendays/api test
```

Expected: #141's state reads `CLOSED`; `galleryRoutes`/`testimonialsRoutes` wired in the api-client index; `coverImageUrl` on `servicePackageReadSchema`; the `staleTime: Infinity` line present in `queries.ts`; all four harness files exist; resolved versions read `@tanstack/react-query 5.102.8` / `react 19.2.8` / `vitest 4.1.11`; the landing suite reads **7 files / 62 passed**; the api suite reads **24 files / 278 passed + 3 skipped** (the "close timed out after 10000ms" exit noise is pre-existing — judge the Test Files/Tests lines only). Any miss → **STOP and report** (do not re-create #138/#141's work).

Commit the plan file as the branch's first commit:

```bash
git add docs/superpowers/plans/2026-09-27-142-m5-08-landing-integration.md
git commit -m "docs(plan): M5 ticket 08 — landing integration implementation plan (#142)"
```

---

### Task 2: The CoverPanel rule + the three package surfaces + their empty states

**Files:**
- Modify: `apps/landing/src/components/cover-panel.tsx` (the rule; null branch byte-verbatim)
- Modify: `apps/landing/src/components/package-card.tsx` (one-line call-site swap)
- Modify: `apps/landing/src/components/home-cards.tsx` (PackageCoverCard media swap; `packageCover`/`COVERS` removed)
- Modify: `apps/landing/src/components/home-image-led.tsx` (the featured-strip collapse only)
- Modify: `apps/landing/src/routes/packages/index.tsx` (the empty-state branch)
- Modify: `apps/landing/src/lib/featured.test.ts` (one appended case)
- Modify (ruled edit): `apps/landing/scripts/verify/packages-pages.mjs`

**Interfaces:**
- Consumes: `ServicePackageRead.coverImageUrl: string | null` (#138's wire); `cn` from `cn` (tailwind-merge-compatible — overrides resolve last-wins).
- Produces: `CoverPanel({ name, coverImageUrl, className? })` — the one shared cover renderer for list, detail, and home featured; the featured strip's collapse contract (`packages.length === 0` → no `<section data-strip='featured'>` at all); the packages empty-state line.

**Not here:** the /about surface (Task 3); the home gallery masonry + testimonials placeholder strips and `home-copy.ts` (byte-untouched); `serviceBackground` and the services cards (Studio Services carry no cover rule); `$slug.tsx` (untouched); `featured.ts` (the seam's shape stays — the collapse predicate reads the route's `packages` array in JSX, and AR6's seam case pins the empty input, not a new function).

- [ ] **Step 1: The collapse seam case (append to `featured.test.ts` — inside the existing `describe('selectFeaturedPackages')` block, after the 'fallback ties break by name ascending' test)**

This case pins TODAY's behavior for the empty input (it passes immediately — it is the seam pin the JSX collapse and the CDP rule both lean on, not a red-green driver):

```ts
  it('empty catalog: an empty strip under the fallback heading (the strip collapses in JSX)', () => {
    const result = selectFeaturedPackages([]);
    expect(result.heading).toBe(FALLBACK_HEADING);
    expect(result.packages).toEqual([]);
  });
```

- [ ] **Step 2: CoverPanel — the rule (replace the ENTIRE file content of `cover-panel.tsx` with exactly)**

```tsx
import { cn } from 'cn';

// The cover rule (M5 ticket #142): coverImageUrl present → the CMS-bound
// photo (object-cover, alt = the package name, lazy); null → today's
// initials placeholder VERBATIM, so the CDP assertion "placeholder ⇔ no
// cover" stays meaningful. `className` re-boxes both branches (cn is a
// tailwind-merge engine: the surface's classes override the defaults) —
// list/detail keep the h-40 card box, home-featured goes edge-to-edge.
// #97: the deep-petrol media gradient is the atmosphere's accent lane
// (deep petrol = media gradients only) — dark stops (600→800→deep) keep
// the white text AA on every stop.
export function CoverPanel({
  name,
  coverImageUrl,
  className,
}: {
  name: string;
  coverImageUrl: string | null;
  className?: string;
}) {
  if (coverImageUrl) {
    return (
      <img
        src={coverImageUrl}
        alt={name}
        loading='lazy'
        className={cn('h-40 w-full rounded-lg object-cover', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex h-40 flex-col items-center justify-center gap-1 rounded-lg bg-[linear-gradient(135deg,var(--brand-600),var(--brand-800),var(--brand-deep))]',
        className
      )}
    >
      <span className='font-bold text-3xl text-white'>{initialsOf(name)}</span>
      <span className='text-white/85 text-xs'>Cover photo coming soon</span>
    </div>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
```

The null branch's visible content is today's byte-verbatim (same gradient, same initials span, same `Cover photo coming soon` line); only the class list gained the `cn(…, className)` tail and the helper got a name.

- [ ] **Step 3: The list + detail call sites (`package-card.tsx`)**

Replace:

```tsx
      <CoverPanel name={pkg.name} />
```

with:

```tsx
      <CoverPanel name={pkg.name} coverImageUrl={pkg.coverImageUrl} />
```

`PackageCard` serves both surfaces (the `/packages` list cards and the detail page via `cta='detail'`) — no other change in the file.

- [ ] **Step 4: The home featured surface (`home-cards.tsx`)**

(a) Delete the stand-in cover mapper — this is the "M5: R2 cover photos replace this wholesale" it was written for — the entire block from the comment `// Stand-in cover mapping (M5: R2 cover photos replace this wholesale).` through the closing brace of `export function packageCover(…) { … }`:

```tsx
// Stand-in cover mapping (M5: R2 cover photos replace this wholesale).
// Seeded names are generic ("Basic Package", "Package A"…), so covers cycle
// deterministically per package instead of matching on keywords.
const COVERS = [
  '/photos/cover-portrait.jpg',
  '/photos/cover-event.jpg',
  '/photos/cover-commercial.jpg',
] as const;

export function packageCover(id: string): string {
  const hash = [...id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return COVERS[hash % COVERS.length] ?? COVERS[0];
}
```

(b) Add the import to the file's import wall (biome orders it): `import { CoverPanel } from './cover-panel';`

(c) In `PackageCoverCard`, replace the media block:

```tsx
      <div className='border-line-soft relative h-56 shrink-0 overflow-hidden border-b'>
        <img
          src={packageCover(pkg.id)}
          alt={`Cover for ${pkg.name} — stand-in until R2 assets arrive`}
          className='absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          loading='lazy'
        />
```

with:

```tsx
      <div className='border-line-soft relative h-56 shrink-0 overflow-hidden border-b'>
        <CoverPanel
          name={pkg.name}
          coverImageUrl={pkg.coverImageUrl}
          className='absolute inset-0 size-full rounded-none transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
        />
```

The two ink scrims, the gradient, and the overlaid name/price below it stay byte-identical (AR3). The hover zoom now rides the CoverPanel output (img or placeholder alike) via the passed transition classes.

- [ ] **Step 5: The featured-strip collapse (`home-image-led.tsx`)**

Wrap section 3 entirely — replace:

```tsx
      {/* 3 — Featured packages: cover-driven cards (owner ruling). */}
      <section className='mx-auto max-w-5xl px-6 py-16' data-strip='featured'>
```

with:

```tsx
      {/* 3 — Featured packages: cover-driven cards (owner ruling). The M5
          empty-state rule: zero ACTIVE packages collapse the strip ENTIRELY
          (no heading, no box) — the predicate is the full list length, not
          the selection (a flagless catalog still falls back to first-4). */}
      {packages.length > 0 && (
        <section className='mx-auto max-w-5xl px-6 py-16' data-strip='featured'>
```

and replace the section's closing `</section>` (the one immediately before `{/* 4 — Services` … */)}` with:

```tsx
        </section>
      )}
```

Re-indent the section body one level deeper so biome format accepts it (run `pnpm --filter @sevendays/landing fix` and accept). NOTHING else in the file changes — the hero, gallery, services, testimonials, and emphasis strips stay byte-identical.

- [ ] **Step 6: The packages empty state (`routes/packages/index.tsx`)**

Replace:

```tsx
        <h1 className='font-bold font-serif text-4xl text-brand-ink'>Packages</h1>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
```

with:

```tsx
        <h1 className='font-bold font-serif text-4xl text-brand-ink'>Packages</h1>
        {packages.length === 0 ? (
          // TODO(owner-copy): packages empty-state line — replaced when the
          // client supplies copy. Text is CDP-assertable (the ⇔ rule in
          // packages-pages.mjs).
          <p className='mt-6 text-muted-foreground'>
            No packages to show right now — check back soon.
          </p>
        ) : (
          <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
            {packages.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        )}
```

- [ ] **Step 7: The static gates**

```bash
pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck
pnpm --filter @sevendays/landing test
```

Expected: typecheck clean; the suite reads **7 files / 63 passed** (the one new `featured.test.ts` case). Any drift → reconcile against this task's edits.

- [ ] **Step 8: The CDP stack + the ruled `packages-pages.mjs` edit + the trio run**

Bring the stack up (first time this ticket; reuse if already up — check `ss -tlnp` for 8787/3000/9222 first):

```bash
docker compose up -d db
# API dev on :8787 (terminal 1) — .dev.vars DATABASE_URL → compose or live Supabase
pnpm --filter @sevendays/api dev
# Landing dev on :3000 (terminal 2) — needs API_URL in apps/landing/.env.local (fail-loud without it)
pnpm --filter @sevendays/landing dev
# Headless Chrome on :9222 (terminal 3) — binary per the #99 precedent:
#   google-chrome if present, else the Playwright headless shell
#   (find ~/.cache/ms-playwright -name chrome-headless-shell -type f | head -1)
<chrome-binary> --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify-142 about:blank
curl -s http://127.0.0.1:8787/api/v1/service-packages | head -c 200   # seeded catalog, basic-package present
curl -s http://127.0.0.1:8787/api/v1/gallery                           # {"categories":[...],"photos":[...]}
curl -s http://127.0.0.1:8787/api/v1/testimonials                      # [...]
```

If the catalog is empty on the compose target, seed it once: `pnpm --filter @sevendays/db db:seed` (needs `DATABASE_MIGRATE_URL` in `packages/db/.env`), then re-curl. Record the three curl outputs under `.superpowers/sdd/2026-09-27-142-m5-08/stack-state.txt` — they are the live payload state the script re-derives from.

Then apply the surface's ONE ruled edit to `apps/landing/scripts/verify/packages-pages.mjs`:

(a) Replace the detail check:

```js
  check(
    '/packages/:slug renders by slug (name, price, cover placeholder, inclusions)',
    detail.includes(basic.name) &&
      detail.includes(peso(basic.priceCents)) &&
      detail.includes('Cover photo coming soon') &&
      detail.includes('Inclusions')
  );
```

with:

```js
  // Ruled edit (M5 ticket #142): the cover rule is the ⇔ assertion —
  // placeholder present ⇔ no coverImageUrl; an img (alt = name, lazy,
  // object-cover) ⇔ coverImageUrl present. The old clause assumed null
  // covers forever; this form survives real content.
  const detailCover = await evaluate(
    `[...document.querySelectorAll('article img')].some(i => i.getAttribute('alt') === ${JSON.stringify(basic.name)})`
  );
  check(
    '/packages/:slug renders by slug (name, price, inclusions)',
    detail.includes(basic.name) &&
      detail.includes(peso(basic.priceCents)) &&
      detail.includes('Inclusions')
  );
  check(
    'detail: cover rule (placeholder ⇔ no cover)',
    basic.coverImageUrl
      ? detailCover === true && !detail.includes('Cover photo coming soon')
      : detailCover === false && detail.includes('Cover photo coming soon')
  );
```

(b) After the existing `home: strip cards deep-link` check, append the three home/list rule blocks:

```js
  // Ruled edit (M5 ticket #142): the empty-state + cover rules, re-derived
  // from the live API. Green on today's populated null-cover catalog;
  // armed for the zero-packages state (live-exercised by #143's gate).
  const featuredStrip = await evaluate(
    `document.querySelector("section[data-strip='featured']") !== null`
  );
  check(
    'home: featured strip collapses ⇔ zero active packages',
    featuredStrip === (packages.length > 0)
  );
  const stripObserved = await evaluate(`(() => {
    const articles = [...document.querySelectorAll("section[data-strip='featured'] article")];
    const names = ${JSON.stringify(strip.map((p) => p.name))};
    return names.map((n) => {
      const a = articles.find((el) => el.querySelector('h3')?.textContent === n);
      if (!a) return null;
      return {
        hasImg: [...a.querySelectorAll('img')].some((i) => i.getAttribute('alt') === n),
        hasPlaceholder: a.textContent.includes('Cover photo coming soon'),
      };
    });
  })()`);
  check(
    'home: strip cards carry the cover rule (img ⇔ cover)',
    strip.every((p, i) => {
      const o = stripObserved[i];
      return (
        o !== null &&
        o.hasImg === (p.coverImageUrl != null) &&
        o.hasPlaceholder === (p.coverImageUrl == null)
      );
    })
  );
```

(c) In the `/packages` block, after the existing `/packages: full details` check, append:

```js
  // Ruled edit (M5 ticket #142): list-card cover rule (lazy img ⇔ cover,
  // placeholder ⇔ none) + the empty-state ⇔ rule.
  const listObserved = await evaluate(`(() => {
    const articles = [...document.querySelectorAll('article')];
    const names = ${JSON.stringify(packages.map((p) => p.name))};
    return names.map((n) => {
      const a = articles.find((el) => el.querySelector('h3')?.textContent === n);
      if (!a) return null;
      const img = [...a.querySelectorAll('img')].find((i) => i.getAttribute('alt') === n);
      if (!img) return 'placeholder';
      return {
        loading: img.getAttribute('loading'),
        objectCover: img.className.includes('object-cover'),
      };
    });
  })()`);
  check(
    '/packages: list cards carry the cover rule (lazy img ⇔ cover)',
    packages.every((p, i) => {
      const o = listObserved[i];
      if (p.coverImageUrl != null) {
        return o !== null && o !== 'placeholder' && o.loading === 'lazy' && o.objectCover === true;
      }
      return o === 'placeholder';
    })
  );
  check(
    '/packages: empty-state line ⇔ zero active packages',
    listText.includes('No packages to show right now — check back soon.') ===
      (packages.length === 0)
  );
```

Run the read-only trio and record:

```bash
node apps/landing/scripts/verify/packages-pages.mjs  2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/packages-pages-task2.txt
node apps/landing/scripts/verify/content-pages.mjs   2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/content-pages-task2.txt
node apps/landing/scripts/verify/booking-wizard.mjs  2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/booking-wizard-task2.txt
```

Expected: **packages-pages 17/17** (12 prior + detail split into 2 + 4 new = 17), **content-pages 16/16** (untouched this task — the /about checks still pass: the grid is still empty and the placeholder lines unchanged), **booking-wizard 15/15** (byte-untouched). On today's null-cover catalog every new rule resolves through its null branch; a catalog WITH covers resolves the img branches — both are passes.

- [ ] **Step 9: The two pinned commits**

```bash
git add apps/landing/src/components/cover-panel.tsx apps/landing/src/components/package-card.tsx apps/landing/src/components/home-cards.tsx apps/landing/src/components/home-image-led.tsx apps/landing/src/routes/packages/index.tsx apps/landing/src/lib/featured.test.ts
git commit -m "feat(landing): CoverPanel cover rule + packages/home empty states (#142)"
git add apps/landing/scripts/verify/packages-pages.mjs
git commit -m "test(landing): packages-pages CDP — cover rule ⇔ + empty-state rules (#142)

CDP byte-contract ruling (controller, #142): the cover-rule assertion
'placeholder present ⇔ no cover' MUST survive; script edits are ruled
per-surface (one max) and land as their own pinned commit. This is the
packages/home surface's one ruled edit: the detail placeholder clause
rewrites into the ⇔ rule; the home collapse, per-card cover rule, list
cover rule, and empty-state line join as re-derived ⇔ checks."
```

---

### Task 3: /about — the data layer, the tabbed gallery, the testimonials slot, the empty states

**Files:**
- Create (test-first): `apps/landing/src/lib/gallery-tabs.test.ts` (6 tests)
- Create: `apps/landing/src/lib/gallery-tabs.ts`
- Modify: `apps/landing/src/lib/api.functions.ts` (two appended server fns)
- Modify: `apps/landing/src/lib/queries.ts` (two appended factories)
- Modify: `apps/landing/src/routes/about.tsx` (rewrite)
- Modify (ruled edit): `apps/landing/scripts/verify/content-pages.mjs`

**Interfaces:**
- Consumes: the landed wrappers `getApiClient().gallery.list(): Promise<GalleryRead>` and `.testimonials.list(): Promise<PublicTestimonial[]>` (#138); `PublicGalleryCategory = {id, name}`, `PublicGalleryPhoto = {id, photoUrl, title: string | null, categoryId: z.uuid()}` — payload order IS position order (the API's contract), and `categoryId` is non-nullable (uncategorized photos are structurally absent).
- Produces: `ALL_TAB_ID = 'all'`, `deriveGalleryTabs(gallery: GalleryRead): { id: string; label: string }[]`, `photosForTab(gallery: GalleryRead, tabId: string): PublicGalleryPhoto[]`, `hasPortfolioPhotos(gallery: GalleryRead): boolean` — the pure seam the route renders from and the CDP script re-derives against; `galleryQueries`/`testimonialQueries` (default staleTime); `getGallery`/`getTestimonials` server fns.

**Not here:** the packages/home surfaces (Task 2, landed); `home-copy.ts` or the home strips; `$slug.tsx`; any wrapper/type edit (consumed as landed); the story section's copy (byte-stays — not this ticket's).

- [ ] **Step 1: The seam tests first (create `gallery-tabs.test.ts` with exactly)**

```ts
import type { GalleryRead, PublicGalleryCategory, PublicGalleryPhoto } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { ALL_TAB_ID, deriveGalleryTabs, hasPortfolioPhotos, photosForTab } from './gallery-tabs';

let n = 0;
function category(name: string): PublicGalleryCategory {
  n += 1;
  return { id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, name };
}
function photo(categoryId: string): PublicGalleryPhoto {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    photoUrl: `https://pub-test.r2.dev/gallery/${String(n).padStart(12, '0')}.jpg`,
    title: `Photo ${n}`,
    categoryId,
  };
}

describe('deriveGalleryTabs', () => {
  it('All first and default; only categories holding ≥1 photo hold a tab, payload order', () => {
    const weddings = category('Weddings');
    const graduation = category('Graduation');
    const emptyTab = category('Empty');
    const gallery: GalleryRead = {
      categories: [weddings, graduation, emptyTab],
      photos: [photo(weddings.id), photo(graduation.id), photo(weddings.id)],
    };
    expect(deriveGalleryTabs(gallery)).toEqual([
      { id: ALL_TAB_ID, label: 'All' },
      { id: weddings.id, label: 'Weddings' },
      { id: graduation.id, label: 'Graduation' },
    ]);
  });

  it('empty payload: the All tab alone and no portfolio photos', () => {
    const gallery: GalleryRead = { categories: [], photos: [] };
    expect(deriveGalleryTabs(gallery)).toEqual([{ id: ALL_TAB_ID, label: 'All' }]);
    expect(hasPortfolioPhotos(gallery)).toBe(false);
  });

  it('photos but zero category rows: All alone, the grid still renders under it', () => {
    // AR3 (#138): an active photo whose category is deactivated stays in the
    // payload — the tab derivation must not strand it.
    const gallery: GalleryRead = { categories: [], photos: [photo('00000000-0000-4000-8000-000000000099')] };
    expect(deriveGalleryTabs(gallery)).toEqual([{ id: ALL_TAB_ID, label: 'All' }]);
    expect(hasPortfolioPhotos(gallery)).toBe(true);
    expect(photosForTab(gallery, ALL_TAB_ID)).toHaveLength(1);
  });
});

describe('photosForTab', () => {
  it('All preserves the payload (position) order exactly', () => {
    const weddings = category('Weddings');
    const graduation = category('Graduation');
    const photos = [photo(weddings.id), photo(graduation.id), photo(weddings.id)];
    const gallery: GalleryRead = { categories: [weddings, graduation], photos };
    expect(photosForTab(gallery, ALL_TAB_ID)).toEqual(photos);
  });

  it('a category tab filters to exactly its photos, payload order', () => {
    const weddings = category('Weddings');
    const graduation = category('Graduation');
    const first = photo(weddings.id);
    const second = photo(graduation.id);
    const third = photo(weddings.id);
    const gallery: GalleryRead = {
      categories: [weddings, graduation],
      photos: [first, second, third],
    };
    expect(photosForTab(gallery, weddings.id)).toEqual([first, third]);
    expect(photosForTab(gallery, graduation.id)).toEqual([second]);
  });

  it('a photo whose categoryId is absent from categories renders under All, under no named tab', () => {
    const weddings = category('Weddings');
    const stray = photo('00000000-0000-4000-8000-000000000099');
    const gallery: GalleryRead = { categories: [weddings], photos: [stray] };
    expect(photosForTab(gallery, ALL_TAB_ID)).toEqual([stray]);
    expect(photosForTab(gallery, weddings.id)).toEqual([]);
  });
});
```

Run `pnpm --filter @sevendays/landing test` — the new file FAILS to resolve `./gallery-tabs`. That is the red.

- [ ] **Step 2: The seam (create `gallery-tabs.ts` with exactly)**

```ts
import type { GalleryRead, PublicGalleryPhoto } from '@sevendays/types';

// The /about portfolio seam (M5 ticket #142): tabs derive from the FETCHED
// payload — an "All" tab first and default plus one tab per category holding
// ≥1 photo, in the payload's category order (position order is the API's
// job; the payload carries no position fields). Filtering is client-side
// over the single fetch. Uncategorized photos are structurally absent from
// the payload (categoryId is non-nullable); a photo whose category row is
// missing (deactivated category, #138 AR3) still renders under All.
export const ALL_TAB_ID = 'all';

export interface GalleryTab {
  id: string;
  label: string;
}

export function deriveGalleryTabs(gallery: GalleryRead): GalleryTab[] {
  const tabs: GalleryTab[] = [{ id: ALL_TAB_ID, label: 'All' }];
  for (const category of gallery.categories) {
    if (gallery.photos.some((p) => p.categoryId === category.id)) {
      tabs.push({ id: category.id, label: category.name });
    }
  }
  return tabs;
}

// The portfolio-empty rule (spec): zero photos → the tab row hides and the
// "Portfolio coming soon." placeholder renders.
export function hasPortfolioPhotos(gallery: GalleryRead): boolean {
  return gallery.photos.length > 0;
}

export function photosForTab(gallery: GalleryRead, tabId: string): PublicGalleryPhoto[] {
  if (tabId === ALL_TAB_ID) return gallery.photos;
  return gallery.photos.filter((p) => p.categoryId === tabId);
}
```

Run `pnpm --filter @sevendays/landing test` — **8 files / 69 passed** (62 + the Task-2 case + these 6). Green.

- [ ] **Step 3: The data layer (`api.functions.ts` then `queries.ts`)**

Append to `api.functions.ts` (after `getAddonServices`, before `createAppointment`, so the read fns stay grouped):

```ts
export const getGallery = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/gallery' }, async () => {
    return getApiClient().gallery.list();
  });
});

export const getTestimonials = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/testimonials' }, async () => {
    return getApiClient().testimonials.list();
  });
});
```

Append to `queries.ts` (after `addonServiceQueries`; extend the existing `./api.functions` import with `getGallery, getTestimonials`):

```ts
export const galleryQueries = {
  /**
   * The assembled public gallery read (#138). Default staleTime — every
   * fresh page load re-reads through the loader's ensureQueryData (the M5
   * "immediately" rule: freshness is a fresh-page-load property; no cache
   * layer). Tab filtering is client state over this single payload.
   */
  all: () =>
    queryOptions({
      queryKey: ['gallery'],
      queryFn: () => getGallery(),
    }),
};

export const testimonialQueries = {
  /** Active testimonials, position-ordered (#138). Same default-staleTime
   * posture as galleryQueries. */
  all: () =>
    queryOptions({
      queryKey: ['testimonials'],
      queryFn: () => getTestimonials(),
    }),
};
```

The by-slug block ABOVE stays byte-untouched (`retry: false` + `staleTime: Infinity`).

- [ ] **Step 4: The /about rewrite (replace the ENTIRE file content of `about.tsx` with exactly)**

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { cn } from 'cn';
import {
  ALL_TAB_ID,
  deriveGalleryTabs,
  hasPortfolioPhotos,
  photosForTab,
} from '../lib/gallery-tabs';
import { galleryQueries, testimonialQueries } from '../lib/queries';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Sevendays Photography' }] }),
  // SSR-prefetched like every route: a fresh page load renders current data
  // (the M5 "immediately" rule); default staleTime refetches per visit.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
  },
  component: AboutPage,
});

function AboutPage() {
  const { data: gallery } = useSuspenseQuery(galleryQueries.all());
  const { data: testimonials } = useSuspenseQuery(testimonialQueries.all());
  const tabs = deriveGalleryTabs(gallery);
  const [selected, setSelected] = useState<string>(ALL_TAB_ID);
  // A refetch can empty the selected category mid-session; clamp to All.
  const activeId = tabs.some((tab) => tab.id === selected) ? selected : ALL_TAB_ID;
  const photos = photosForTab(gallery, activeId);

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink'>About</h1>
        {/* TODO(owner-copy): static studio story — replaced when the client supplies copy. */}
        <p className='mt-4 max-w-prose text-muted-foreground'>Our studio story is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink'>Testimonials</h2>
        {testimonials.length === 0 ? (
          <div>
            {/* TODO(owner-copy): testimonial placeholders — client copy pending. M5 drop-in slot. */}
            <p className='mt-2 text-muted-foreground'>What clients say is coming soon.</p>
          </div>
        ) : (
          <div className='mt-6 flex flex-col gap-6'>
            {testimonials.map((t) => (
              <figure key={t.id} className='border-line-soft border-l-2 pl-4'>
                <blockquote className='text-brand-ink'>{t.quote}</blockquote>
                <figcaption className='text-muted-text mt-2 text-sm'>{t.person}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12 pb-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink'>Portfolio</h2>
        {!hasPortfolioPhotos(gallery) ? (
          // Zero photos (or no photo-holding categories): the tab row hides
          // and the spec-verbatim placeholder renders. No grid, no tabs.
          <p className='mt-4 text-muted-foreground'>Portfolio coming soon.</p>
        ) : (
          <>
            <div
              role='group'
              aria-label='Portfolio categories'
              data-gallery-tabs
              className='mt-4 flex flex-wrap gap-2'
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  aria-pressed={tab.id === activeId}
                  onClick={() => setSelected(tab.id)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium',
                    tab.id === activeId
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-border bg-card text-foreground hover:bg-wash-base'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3' data-portfolio-grid>
              {photos.map((photo) => (
                <figure
                  key={photo.id}
                  className='border-line-soft bg-card overflow-hidden rounded-xl border shadow-sm'
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.title ?? 'Studio photograph'}
                    loading='lazy'
                    className='aspect-[4/3] w-full object-cover'
                  />
                  {photo.title && (
                    <figcaption className='text-muted-text mt-2 px-3 pb-2 font-mono text-[11px]'>
                      {photo.title}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
```

No route was added or renamed — `routeTree.gen.ts` stays; do not run the generator.

- [ ] **Step 5: The static gates**

```bash
pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck
pnpm --filter @sevendays/landing test
```

Expected: typecheck clean; the suite reads **8 files / 69 passed**.

- [ ] **Step 6: The ruled `content-pages.mjs` edit + the trio run**

(a) Extend the page destructure — replace:

```js
  const { go, text, evaluate, close } = page;
```

with:

```js
  const { go, text, evaluate, wait, close } = page;
```

(the tab-filtering checks below click and settle via `wait`; `lib.mjs` already provides it).

(b) Extend the header fetch — replace:

```js
  const [servicesRes, branchesRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/branches`),
  ]);
  const services = await servicesRes.json();
  const branches = await branchesRes.json();
```

with:

```js
  const [servicesRes, branchesRes, galleryRes, testimonialsRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/branches`),
    fetch(`${API}/api/v1/gallery`),
    fetch(`${API}/api/v1/testimonials`),
  ]);
  const services = await servicesRes.json();
  const branches = await branchesRes.json();
  const gallery = await galleryRes.json();
  const testimonials = await testimonialsRes.json();
  if (!gallery || !Array.isArray(gallery.categories) || !Array.isArray(gallery.photos)) {
    throw new Error('seed drift: gallery read is not the assembled {categories, photos} payload');
  }
  if (!Array.isArray(testimonials)) {
    throw new Error('seed drift: testimonials read is not an array');
  }
```

(c) Replace the two /about checks:

```js
  // /about: placeholders + empty portfolio grid
  await go(`${LANDING}/about`);
  const about = await text();
  const portfolioCount = await evaluate(
    `document.querySelector('[data-portfolio-grid]')?.querySelectorAll('article, img').length ?? null`
  );
  check(
    '/about: story + testimonial placeholders render',
    about.includes('Our studio story is coming soon.') &&
      about.includes('What clients say is coming soon.')
  );
  check(
    '/about: empty portfolio grid is the M5 drop-in slot',
    portfolioCount === 0,
    `grid articles/imgs: ${portfolioCount}`
  );
```

with (the story assertion byte-kept; everything else derived from the fetched payloads):

```js
  // /about — Ruled edit (M5 ticket #142): the two placeholder checks rewrite
  // into payload-derived ⇔ rules (the story line is byte-kept — not this
  // ticket's copy). The live gallery/testimonials tables are CMS-born-empty,
  // so the empty branches are LIVE-exercised today; the populated branches
  // arm for the owner's first uploads. Tab filtering asserts client-side
  // state over the single fetch.
  await go(`${LANDING}/about`);
  const about = await text();
  check(
    '/about: story placeholder renders (byte-kept)',
    about.includes('Our studio story is coming soon.')
  );
  check(
    '/about: portfolio empty-state ⇔ zero photos',
    about.includes('Portfolio coming soon.') === (gallery.photos.length === 0)
  );
  const expectedTabs = [
    'All',
    ...gallery.categories
      .filter((c) => gallery.photos.some((p) => p.categoryId === c.id))
      .map((c) => c.name),
  ];
  const tabState = await evaluate(`(() => {
    const row = document.querySelector('[data-gallery-tabs]');
    if (!row) return null;
    return [...row.querySelectorAll('button')].map((b) => ({
      label: b.textContent.trim(),
      pressed: b.getAttribute('aria-pressed'),
    }));
  })()`);
  check(
    '/about: tab row ⇔ photos exist; All first + default',
    gallery.photos.length === 0
      ? tabState === null
      : tabState !== null &&
          tabState.length === expectedTabs.length &&
          tabState.every((t, i) => t.label === expectedTabs[i]) &&
          tabState[0].label === 'All' &&
          tabState[0].pressed === 'true',
    `tabs: ${JSON.stringify(tabState)}`
  );
  const gridSrcs = await evaluate(
    `[...document.querySelectorAll('[data-portfolio-grid] img')].map(i => i.getAttribute('src'))`
  );
  check(
    '/about: grid renders exactly the payload photos, payload order',
    gallery.photos.length === 0
      ? (gridSrcs === null || gridSrcs.length === 0)
      : gridSrcs !== null &&
          gridSrcs.length === gallery.photos.length &&
          gridSrcs.every((src, i) => src === gallery.photos[i].photoUrl)
  );
  if (gallery.photos.length > 0 && expectedTabs.length > 1) {
    const firstCategoryPhotos = gallery.photos.filter(
      (p) => p.categoryId === gallery.categories.find((c) => expectedTabs[1] === c.name).id
    );
    await evaluate(`document.querySelectorAll('[data-gallery-tabs] button')[1].click()`);
    await wait(400);
    const filtered = await evaluate(
      `[...document.querySelectorAll('[data-portfolio-grid] img')].map(i => i.getAttribute('src'))`
    );
    const restored = await (async () => {
      await evaluate(`document.querySelectorAll('[data-gallery-tabs] button')[0].click()`);
      await wait(400);
      return evaluate(
        `[...document.querySelectorAll('[data-portfolio-grid] img')].map(i => i.getAttribute('src'))`
      );
    })();
    check(
      '/about: tab filtering is client-side over the single fetch',
      Array.isArray(filtered) &&
        filtered.length === firstCategoryPhotos.length &&
        filtered.every((src, i) => src === firstCategoryPhotos[i].photoUrl) &&
        Array.isArray(restored) &&
        restored.length === gallery.photos.length &&
        restored.every((src, i) => src === gallery.photos[i].photoUrl)
    );
  } else {
    check(
      '/about: tab filtering is client-side over the single fetch',
      true,
      'armed — single-category or empty payload cannot demo filtering'
    );
  }
  check(
    '/about: testimonials render the payload (coming-soon ⇔ zero)',
    testimonials.length === 0
      ? about.includes('What clients say is coming soon.')
      : testimonials.every((t) => about.includes(t.person)) &&
            !about.includes('What clients say is coming soon.')
  );
```

Run the trio and record:

```bash
node apps/landing/scripts/verify/content-pages.mjs  2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/content-pages-task3.txt
node apps/landing/scripts/verify/packages-pages.mjs 2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/packages-pages-task3.txt
node apps/landing/scripts/verify/booking-wizard.mjs 2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/booking-wizard-task3.txt
```

Expected: **content-pages 20/20** (16 − 2 + 6), **packages-pages 17/17**, **booking-wizard 15/15**. On today's born-empty tables the /about checks resolve through: placeholder present ⇔ true, tab row null, grid empty, filtering armed, coming-soon present.

- [ ] **Step 7: The two pinned commits**

```bash
git add apps/landing/src/lib/gallery-tabs.ts apps/landing/src/lib/gallery-tabs.test.ts apps/landing/src/lib/api.functions.ts apps/landing/src/lib/queries.ts apps/landing/src/routes/about.tsx
git commit -m "feat(landing): /about tabbed gallery + testimonials slot + empty states (#142)"
git add apps/landing/scripts/verify/content-pages.mjs
git commit -m "test(landing): content-pages CDP — the /about derived assertions (#142)

CDP byte-contract ruling (controller, #142): the /about surface's one
ruled edit — the two placeholder assumptions rewrite into payload-derived
⇔ rules (story line byte-kept); the live CMS-born-empty tables exercise
the empty branches; the tab/filter rules arm for real content."
```

---

### Task 4: Full gates + the stays-pinned audit + docs rotation + PR/merge + v1 pick + close

**Files:**
- Modify: `docs/plan.md` (the M5 landing-integration checkbox — this ticket owns it exclusively), `docs/progress.md` (the What Exists entry), `AGENTS.md` (one appended sentence), `docs/agents/v1-picks.md` (the ledger row, post-merge)

**Interfaces:**
- Consumes: Tasks 2–3 green; the compose db up; the CDP stack from Task 2.

**Not here:** any further code edits (post-Task-3 fixes land as their own pinned commits — no silent scope growth); #141's checkbox (its own ticket's close); #143's deliverables (`cms-reflection.mjs`, the seed demotion, admin lib-seam seating).

- [ ] **Step 1: The stays-pinned audit (machine checks for the silent/stays requirements)**

```bash
grep -c "staleTime: Infinity" apps/landing/src/lib/queries.ts
git diff main --stat -- apps/landing/src/routes/packages/'$slug'.tsx apps/landing/src/components/home-copy.ts apps/landing/scripts/verify/booking-wizard.mjs apps/landing/src/routeTree.gen.ts packages/types packages/api-client packages/db apps/api
grep -n "Cover photo coming soon" apps/landing/src/components/cover-panel.tsx
```

Expected: `staleTime: Infinity` still present (count ≥ 1 — the by-slug pin survived); the diff-stat is **EMPTY** for all five landing paths and all four packages (nothing outside this ticket's fence moved); the placeholder line lives exactly once in `cover-panel.tsx` (the verbatim null branch). Record the outputs under `.superpowers/sdd/2026-09-27-142-m5-08/audit.txt`.

- [ ] **Step 2: The full gate**

```bash
docker compose up -d db && pnpm check
```

Expected: **35/35 turbo tasks**; `apps/landing` = **8 files / 69 passed**; `apps/api` = **24 files / 278 passed + 3 skipped**; `packages/types` = 13 files / 112 (unchanged); `packages/db` = 22 passed + 8 skipped (unchanged); landing + api-client + admin green. If any count drifted, reconcile against the per-task pins — do not loosen assertions.

- [ ] **Step 3: The final CDP trio at the final tree**

Re-run all three read-only scripts against the live stack (the #101 close precedent) and record:

```bash
node apps/landing/scripts/verify/packages-pages.mjs  2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/packages-pages-final.txt
node apps/landing/scripts/verify/content-pages.mjs   2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/content-pages-final.txt
node apps/landing/scripts/verify/booking-wizard.mjs  2>&1 | tee .superpowers/sdd/2026-09-27-142-m5-08/booking-wizard-final.txt
```

Expected: **17/17 + 20/20 + 15/15 = 52/52**. The landing dev server must be RESTARTED first if it is still running the pre-Task-3 process (vite dev picks up file changes, but a stale process from before the branch existed serves stale module graphs — restart and re-wait for :3000).

- [ ] **Step 4: Tick the roadmap checkbox (this ticket's exclusively)**

In `docs/plan.md`, replace the M5 block's line:

```text
- [ ] Landing integration: `/about` tabbed gallery ("All" first, derived from the fetched payload) + testimonials slot; `CoverPanel` (img on `coverImageUrl`, today's placeholder verbatim on null); explicit empty states (packages line, home featured-strip collapse, portfolio placeholder); silent trim hiding; fresh-page-load currency (no cache layer added; by-slug keeps `staleTime: Infinity`)
```

with:

```text
- [✅] Landing integration: `/about` tabbed gallery ("All" first, derived from the fetched payload) + testimonials slot; `CoverPanel` (img on `coverImageUrl`, today's placeholder verbatim on null); explicit empty states (packages line, home featured-strip collapse, portfolio placeholder); silent trim hiding; fresh-page-load currency (no cache layer added; by-slug keeps `staleTime: Infinity`) _(2026-09-28: ticket #142 landed — `/about` loader-prefetches the #138 public reads through two new server fns + default-staleTime query factories and renders the tabbed portfolio (tabs derived payload-side via the `gallery-tabs` seam: All first + one tab per photo-holding category, client-side filtering, payload order; zero photos → the tab row hides behind the spec-verbatim "Portfolio coming soon.") and the testimonials slot (zero → the existing coming-soon line stays); `CoverPanel` reworked around `{ name, coverImageUrl, className }` — img (object-cover, alt = name, lazy) ⇔ today's byte-verbatim initials placeholder — now shared by the packages list, detail, and home featured (the stand-in `packageCover` mapper died); the packages empty-state line and the home featured-strip collapse landed (the strip's section unmounts on zero active packages); the by-slug `staleTime: Infinity` and `$slug.tsx` untouched; deactivated-lookup hiding silent. CDP: the two ruled per-surface edits — packages-pages 12→17 (the ⇔ cover rule replaces the null-cover assumption; collapse/cover/empty-state rules armed), content-pages 16→20 (the /about checks derived from the fetched payloads; empty branches live-exercised on the CMS-born-empty tables) — trio 43→52, booking-wizard 15 byte-untouched. Tests: landing 62→69 (8 files; the `gallery-tabs` seam suite + the `selectFeaturedPackages([])` case). `pnpm check` 35/35. Agent rulings for owner review: the packages empty-state wording (TODO(owner-copy)), CoverPanel prop shape + lazy-everywhere, the home null-cover composition under the existing scrims, the hand-rolled aria-pressed tab row + grid treatment, the testimonials figure composition, and the armed-state verification posture (#143's mutating gate exercises the zero-packages states).)_
```

Checkboxes for the admin screens (#141) and the close-out row (#143) stay unticked — they own their lines.

- [ ] **Step 5: AGENTS.md — one appended sentence**

In `AGENTS.md`, extend the bullet starting `- **The DB is provisioned, the catalog is seeded, and auth is wired in.**` — append after the ticket-04 sentence (which ends `…GET /api/v1/gallery and GET /api/v1/testimonials are live.`):

```text
 The landing consumes them (M5 ticket 08): /about renders the tabbed gallery (All first, tabs derived from the fetched payload) and the testimonials slot; the CoverPanel rule (img on coverImageUrl, today's placeholder verbatim on null) governs the packages list, detail, and home featured surfaces; the ruled empty states render (packages line, home featured-strip collapse, portfolio placeholder with the hidden tab row, testimonial coming-soon line).
```

- [ ] **Step 6: progress.md — the What Exists entry**

Insert at the TOP of `docs/progress.md`'s What Exists section (newest-first, the #138 precedent):

```text
2026-09-28 — #142 M5 ticket 08, landing integration, landed: the landing consumes the CMS reads. `/about` gained the data layer (two server fns over #138's landed gallery/testimonials wrappers, Sentry spans; `galleryQueries`/`testimonialQueries` at default staleTime, loader-prefetched — fresh page loads are current, no cache layer) behind a TDD'd pure seam (`src/lib/gallery-tabs.ts`: `deriveGalleryTabs` — All first plus one tab per photo-holding category in payload order; `photosForTab` — client-side filtering over the single fetch, payload order preserved; `hasPortfolioPhotos` — the empty rule) and a page rewrite: the tabbed portfolio (hand-rolled aria-pressed tab row, `data-portfolio-grid`, aspect-[4/3] lazy figures, a mid-session clamp back to All when a refetch empties the selected category; zero photos → tab row hidden + "Portfolio coming soon.") and the testimonials slot (zero → the existing coming-soon line byte-stays; non-zero → border-l-2 quote figures). `CoverPanel` is now the rule (`{ name, coverImageUrl, className }`: img object-cover/alt=name/lazy ⇔ today's byte-verbatim initials placeholder — the CDP "placeholder ⇔ no cover" stays meaningful) shared by the packages list (`PackageCard`), detail (`cta='detail'`), and home featured (`PackageCoverCard` — the stand-in `packageCover`/`COVERS` mapper removed; the ink scrims + hover zoom ride the passed className). Empty states: the packages line `No packages to show right now — check back soon.` behind TODO(owner-copy); the home featured strip unmounts entirely on zero active packages (predicate = the full list length, not the selection); the home gallery/testimonial stand-in strips and `home-copy.ts` untouched. Silent hiding + `staleTime: Infinity` + `$slug.tsx` audited byte-unchanged. CDP: the two ruled per-surface edits (packages-pages 12→17, content-pages 16→20 — every new check re-derives from the live API; the /about empty branches are live-exercised on the CMS-born-empty tables; the zero-packages states are rule-armed for #143's mutating gate), trio 43→52, booking-wizard 15 untouched. Tests: landing 62→69 across 8 files (lib-seam only, no new deps). `pnpm check` 35/35. v1 pick + ledger row per the runbook.
```

- [ ] **Step 7: graphify + branch hygiene**

Run: `graphify update .` (code was modified — the AGENTS.md rule). Confirm `git status` shows only the intended docs edits; commit them:

```bash
git add docs/plan.md AGENTS.md docs/progress.md
git commit -m "docs: M5 ticket 08 — landing integration landed, status rotation (#142)"
```

- [ ] **Step 8: PR + merge**

```bash
gh pr create --title "feat: M5 ticket 08 — landing integration (/about tabbed gallery, testimonials slot, CoverPanel, empty states)" --body "Implements #142 (M5 spec § Landing integration). /about loader-prefetches the #138 public reads and renders the tabbed portfolio — tabs derived from the fetched payload (All first + one per photo-holding category), client-side filtering over the single fetch via the new gallery-tabs seam (TDD, 6 lib-seam tests) — plus the testimonials slot (zero → the existing coming-soon line). CoverPanel is the shared cover rule (img on coverImageUrl — object-cover, alt = name, lazy — today's placeholder byte-verbatim on null) across the packages list, detail, and home featured; the stand-in cover mapper is gone. Empty states: the packages TODO(owner-copy) line, the home featured-strip collapse on zero active packages, the portfolio placeholder + hidden tab row; deactivated-lookup hiding stays silent; by-slug keeps staleTime: Infinity (audit-pinned). CDP: the two ruled per-surface edits (packages-pages 12→17, content-pages 16→20; trio 43→52, booking-wizard untouched). Landing tests 62→69; pnpm check 35/35. Agent rulings (owner-review pending) listed in the plan + progress note."
gh pr merge --squash --delete-branch
```

The push to main fires the deploy. Watch it and spot-check (read-only):

```bash
gh run watch $(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId' -R jeius/sevendays) -R jeius/sevendays
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/gallery
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/testimonials
```

Expected: the deploy job succeeds; both curls answer `200` (CMS-born-empty payloads). If the workers.dev URLs are disabled, the CI run alone stands as the verification.

- [ ] **Step 9: The v1 pick + ledger row (per `docs/agents/v1-picks.md`)**

In the v1 seed clone (`~/Projects/sevendays-v1-seed`, branch `v1`), cherry-pick the squash commit and triage. Expected classes (the audit is the authority):

- **PICK (predicted, clean):** `apps/landing/src/lib/gallery-tabs.ts` + `gallery-tabs.test.ts` and `apps/landing/src/components/cover-panel.tsx` — new, booking-free files (the spec names this ticket's compositions "variant-neutral … both editions share").
- **SPLIT (predicted):** `package-card.tsx`, `home-cards.tsx`, `home-image-led.tsx`, `packages/index.tsx` (booking-CTA-bearing files that differ main↔v1 — v1's scrub swapped CTAs), `api.functions.ts` + `queries.ts` (v1's api-client group was cut — the gallery/testimonial imports may not resolve there), `about.tsx` (if v1's about differs) — resolve per the runbook's transformed-surface classes.
- **SKIP (main-only):** both `scripts/verify/` edits (the verify harness is main-only per the seed ruleset), `docs/*`, this plan file.

Gate the pick: `cd ~/Projects/sevendays-v1-seed && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` → exit 0 (if a token trips, STOP and bring the hit to the owner — never resolve in-loop). Lock: `pnpm check` + `pnpm build` green in the checkout, then push. Then the ledger row in `docs/agents/v1-picks.md` on main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — M5 ticket 08 landing integration (#142)"
```

- [ ] **Step 10: Close the ticket with the owner-handoff note**

The PR's `Implements #142` links the ticket; post the closing comment (the owner's morning read):

```text
Landed. /about now renders the tabbed gallery off the fetched payload — an "All" tab first and default, one tab per category holding photos, client-side filtering over the single fetch — plus the testimonials slot (empty until you add testimonials, where the existing coming-soon line holds). The CoverPanel rule is live on all three package surfaces: a CMS-bound cover renders as a lazy object-cover img (alt = the package name); no cover keeps today's initials placeholder byte-for-byte, so the CDP assertion stays meaningful. The home stand-in cover mapper is gone. Empty states never render blank: /packages shows "No packages to show right now — check back soon." (TODO(owner-copy) — wording is mine, flagged for your review); the home featured strip collapses entirely when zero packages are active; /about hides the tab row behind "Portfolio coming soon." when no photos exist. Deactivated-lookup hiding stays silent; the by-slug detail keeps staleTime: Infinity (fresh loads are always current). Verification: the two ruled CDP edits extend the read-only trio 43 → 52 (the /about empty branches are exercised for real against the born-empty tables; the zero-packages states are armed and wait for #143's mutating gate). Landing tests 62 → 69 (lib-seam only, no new deps). pnpm check 35/35. Agent rulings for your review: the packages empty-state wording; CoverPanel prop shape + lazy everywhere; the home null-cover composition (placeholder under the existing scrims); the hand-rolled aria-pressed tab row + grid treatment; the testimonials figure style. NOT in this ticket: the admin gallery/testimonials screens (#141), cms-reflection.mjs + the seed demotion + admin lib-seam seating (#143), any API/wrapper change (none needed — #138's surface was consumed as-is).
```
