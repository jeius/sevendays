# Landing redesign prototype on the live catalog (#164) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Exception this plan carves (wayfinder HITL):** Tasks 1–8 are a human-in-the-loop prototype pass — the owner reacts to rendered variants in-session and every ruling is theirs, recorded verbatim. Subagent dispatch is wrong for the reaction rounds themselves; a subagent may only be used for mechanical sub-steps (captures, probes) if the driving session stays the sole ruler-recorder. The deliverable is **recorded rulings + the owner-endorsed direction**, never production code on `main`.

**Goal:** Resolve wayfinder ticket #164 on map #158 — raise the landing redesign to judgeable fidelity over the LIVE CMS catalog (real covers, real gallery, real testimonials), every non-booking surface, both variants (main booking-present + v1 booking-free), light first then exactly one dark round, folding in the audit's landing items (home real testimonials, branded global NotFound + Error, the #163 no-price slot, skeleton/empty-state language), and record the owner's per-surface rulings as the input the spec ticket (#166) consumes.

**Architecture:** A throwaway branch `prototype/164-landing-redesign` in its own worktree at `.worktrees/164-landing-redesign` (house precedent: `prototype/131-admin-cms-compositions` in `.worktrees/131-admin-cms`; M3's #57/#59/#92 throwaway branches — nothing merges wholesale, the build adopts values and rulings). The real route components are reworked in place on the branch; the v1-flavored pieces render behind a prototype-only `?v=v1` search-param toggle so both variants are judgeable on one dev server; the dark round renders behind `?t=dark` with prototype-local dark token sketches. All content reaches the compositions through the real API (`API_URL=http://127.0.0.1:8787`) — the database is live and shared, read-only from the prototype; every content change happens through the admin UI (Task 1's owner intake). Rulings land in a growing `.scratch` ledger; the resolution comment + map update close the ticket.

**Tech Stack:** TanStack Start landing (Vite dev on :3000) + Hono API on Cloudflare Workers (`wrangler dev` on :8787), shared `packages/ui` token layer + shadcn/Base-UI primitives, Tailwind v4 CSS-first, GitHub CLI for the wayfinder tracker ops, `browser-use:control-browser` for viewport captures.

**Spec:** GitHub issue #164 (open, unassigned, unblocked, blocking #166) on map #158 "Wayfinder map: Experience & CMS Maturation spec" — plus the feeding rulings recorded on the map's Decisions so far: #162 (dark mode), #163 (no-price catalogs), #161 (public testimonial form), #165 (CMS UX maturation), and the M3 precedent ticket #111 (rendered-variants amendment to spec #94). Product truth: `PRODUCT.md` (root), `apps/landing/PRODUCT.md` — written this session, 2026-09-30.

## Recon state this plan starts from (verified live 2026-09-30, pre-plan)

- **Main is at `0c99692`** (the graphify chore commit after #171). `#164` is OPEN, unassigned, `blocked_by: 0` — frontier; it blocks `#166` (the spec ticket, itself blocked by the six closed siblings + this ticket). The working tree carries pre-existing dirty `apps/admin/CONTEXT.md`, `apps/api/CONTEXT.md`, and `graphify-out/` churn, plus this session's uncommitted `PRODUCT.md` × 3 and `.impeccable/` × 2 — **none of it is this plan's to commit; the owner commits main's tree**.
- **The live catalog (probed read-only via `packages/db`):** `service_packages` 14 rows / **12 active** (Package A–H, Basic Package, Customize Package CP-1 + CP-2) — **zero active rows have a cover** (`cover_image_key` null on all 12; the only covered row is the deactivated `CDP Gate 1790638361204` test package). `branches` 7 rows — **3 real and active (Calamba Main, Iligan, Dipolog)**, 3 deactivated `smoke-*` test rows, and **one ACTIVE stray: `smoke-a-1790449066843`** (test residue that renders on the live branches read). `studio_services` 6, `addon_services` 4, `package_inclusions` 151, `frames` 25. **`gallery_categories` 0 / `gallery_photos` 0 — the gallery is empty.** `testimonials` 2: the real Calamba school quote (`"Booked in the morning, shot by lunch, prints within the week"` / Calamba National Comprehensive High School) and the obvious stand-in (`"The photos felt like us — easy, warm, and true to the day."` / John Doe). **Consequence: the ticket's "judgeable for the first time" premise requires an owner content-intake round (Task 1) before the gallery/testimonial/cover surfaces can be judged against real material.**
- **The branch names confirm the market:** Calamba (Misamis Occidental), Iligan (Lanao del Norte), Dipolog (Zamboanga del Norte) — Mindanao-side, per the live branch addresses; the Philippines inference in `PRODUCT.md` is now repo-evidenced; the record's "region unconfirmed" hedge can tighten at wrap-up (Task 9 Step 4).
- **Dev topology:** API `wrangler dev` on **:8787** (`apps/api/wrangler.toml:43`); landing `vite dev --port 3000` (`apps/landing/package.json:9`); **admin ALSO pins :3000** (`apps/admin/package.json:9`) — the two frontends never run simultaneously; Task 1 runs admin from the MAIN checkout, Tasks 3–8 run landing from the WORKTREE, sequentially. Landing reads `API_URL` from `apps/landing/.env.local` (exists in the main checkout, `.env.example` pins the shape; the worktree needs its own copy).
- **Worktree convention:** `git worktree list` shows `/home/jeius/Projects/sevendays` + `.worktrees/131-admin-cms` — ours joins as `.worktrees/164-landing-redesign`.
- **The incumbent landing:** 15 `font-serif` uses in `apps/landing/src` (the #111 serif-restoration ruling landed); routes are `index.tsx` (home), `packages/` (index + `$slug`), `services.tsx`, `branches.tsx`, `about.tsx`, `book.tsx`, `booking.$id.tsx`, `__root.tsx` — **`/book` + `/booking/$id` are map-out-of-scope (v2's payload) and are never touched by this plan**; `__root.tsx` carries neither a global NotFound nor Error component (the audit's finding — Task 3 composes them). The M3 component inventory (SiteHeader/SiteFooter/MobileNav/PackageCard/ServiceCard/BranchCard/CoverPanel/…) is the incumbent's shape.
- **Test baselines:** landing **8 files / 69 tests**; full-repo `pnpm check` **35/35** (pinned at #170, 2026-09-30 — this plan moves no main-tree code, so the repo-wide floors are reference-only; the per-task gate is the landing suite inside the worktree).
- **Wayfinder tracker ops** (per `docs/agents/issue-tracker.md` § Wayfinding operations): claim = `gh issue edit 164 --add-assignee @me`; resolve = comment via `--body-file` + `gh issue close` + append the Decisions-so-far pointer to map #158's body. Comments read back via REST (`gh api repos/jeius/sevendays/issues/164/comments --jq '.[] | .body'`) — `gh issue view --comments` is broken on Projects-classic deprecation.

## Global Constraints

- **Wayfinder fences (map #158, non-negotiable):** this ticket produces **rulings, not deliverables** — no production fixes ride along; nothing merges to `main`; no PR, no v1 triage, no `docs/plan.md` tick; the branch is a throwaway source the future build mines (M3 precedent verbatim: "nothing merges wholesale; the build adopts values and rulings"). Branch-local commits ARE expected (house prototype-branch practice). Only this ticket resolves in this arc — **one ticket per session**; if the arc spans sessions, the ticket stays open and the next session resumes this plan against the same branch/worktree.
- **Feeding rulings — do not re-litigate (map Decisions so far):**
  - **#162 dark mode:** compositions judged **light first at unchanged volume**; then **exactly ONE dark re-render + reaction round inside this ticket** — dark per-surface rulings land here. The production `.dark` token block (designed from zero in `packages/ui/src/tokens.css`) is the milestone build's work; this plan only sketches direction-level dark values.
  - **#163 no-price:** wherever a price would render, **nothing renders** — no placeholder, no inquire line; the card reflows and the Book CTA stays. Unpriced items remain fully bookable (booking surfaces themselves are out of scope here).
  - **#161 testimonial form:** a **dedicated public page** reached via a `/about` CTA, both variants; fields mirror the entity — `quote` + `person` only; abuse posture (rate-limit binding, honeypot, Turnstile escalation) is spec payload, NOT composed here; the Submissions queue UX belongs to #165's system — never built on this branch.
  - **#165 states language:** skeletons are **first-load-only**, media placeholders are **muted** (no per-card image skeletons) — the landing's skeleton/empty language rhymes with that ruling.
  - **Map ruling 5:** the redesign **rides the existing design system** (`packages/ui` tokens + primitives) — recomposition of layout, hierarchy, density, proportion, imagery treatment, and atmosphere ratios is the mandate; token-level or primitive-level changes surface as **recorded rulings for the spec**, never as silent edits on this branch.
  - **Map scope:** `/book`, `/booking/$id`, and the appointments dashboard are v2's payload — untouched. The CMS UX system is #165's — untouched.
- **HITL law (#111 precedent):** the agent **never answers for the owner** — every ruling below Task 2 comes from the owner reacting in-session to rendered variants; rulings are recorded **verbatim** (their words when quoted, `#164 round N` attribution otherwise). No surface ships unjudged: a composition task is done when its variants were rendered desktop + mobile, reacted to, and ruled.
- **Evidence law (`PRODUCT.md`, this session):** the photo set at `apps/landing/public/photos/` is **mixed real/stand-in with unconfirmed per-photo provenance** — nothing in it is presented as the studio's own work; no fabricated testimonials, ever. Task 1's uploaded CMS content (covers, gallery, testimonials) IS the studio's own and may lead the compositions.
- **The variant mechanism (pinned, prototype-branch-only):** a search-param toggle — `?v=v1` renders the booking-off CTA set on the reworked surfaces; absence (or `?v=main`) renders booking-present. One tiny helper file (Task 0 Step 4) + prop-drilling into the affordance-bearing components; the real v1 swap remains the established scrub — this toggle exists only so both variants are judgeable on one dev server and **never merges**. The dark toggle is `?t=dark` (Task 8 only, applied at the document root).
- **Gates, per composition task (run in the worktree root):** `pnpm --filter @sevendays/landing typecheck` zero errors; `pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing lint` clean on touched files; `pnpm --filter @sevendays/landing test` green at **8 files / 69 tests, unchanged** (lib seams are never moved by this plan — if a test breaks, the composition leaked into a seam: stop and fix the leak, never the test).
- **The database is live and shared:** the prototype only ever READS it (through the running API); every content change goes through the admin UI in Task 1; **no raw SQL writes, no schema changes, no seed edits** (AGENTS.md: db access via `packages/db`; the seed is bootstrap/dev-only per its README).
- **Fresh-clone order (house):** `pnpm install && pnpm build:packages` before any typecheck — `@sevendays/config/vitest` is a built entry and the api-client resolves the API's `AppType` from built `dist/`.
- **Skills loaded at execution time (map Notes + this session):** `prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling` (the ticket's named set), **`impeccable` (loaded this session — Task 2 reads its `reference/new-work.md` for the redesign posture: the incumbent look is evidence and anti-reference, product truth stands; `reference/craft-floor.md` before the first UI edit)**, and `browser-use:control-browser` for captures. Surfaces carry their impeccable mode: home/catalog/branches/submissions-CTA = **Persuade**; the about gallery + portfolio surfaces = **Experience**; the testimonial submission form itself = **Operate**; NotFound/Error = chrome **Persuade**.
- **File-tool paths are absolute from the first write** (wayfinder lesson: after any subagent dispatch, relative paths can resolve into `.worktrees/<subagent>/`). All main-tree writes (`.scratch` ledgers, the rulings file, this plan) use `/home/jeius/Projects/sevendays/...`; all branch writes use `/home/jeius/Projects/sevendays/.worktrees/164-landing-redesign/...`.
- **Tracker writes are staged + verified (wayfinder lesson):** `gh issue comment/edit --body-file` from a temp file under `.scratch/`, then a read-back fetch confirms the body landed before moving on.
- **House docs rules:** repo-docs checklist ticks are `- [✅]`, never `[x]`; GitHub issue checkboxes flip with `- [x]`; `graphify update .` does NOT run in this arc (no main-tree code changes — the graph tracks main; the throwaway branch is out of its scope).
- **No new dependencies.** No changes to `packages/ui`, `packages/types`, or `apps/api` on this branch (compositions consume what exists; gaps become rulings).
- **Plan file target:** `docs/superpowers/plans/2026-09-30-164-landing-redesign-prototype.md` (this file — main-tree, owner-committed).

---

### Task 0: Claim the ticket, cut the branch, bring up the stack

**Files:**
- Create: `.worktrees/164-landing-redesign/` (the worktree; branch `prototype/164-landing-redesign`)
- Create (branch-only): `apps/landing/src/lib/prototype-variant.ts` (the `?v` toggle helper — content pinned in Step 4)
- Copy: `apps/landing/.env.local` → the worktree's `apps/landing/.env.local` (never printed, never committed)

**Interfaces:**
- Consumes: nothing prior — this is the arc's setup.
- Produces: the claimed ticket; the running dev stack (API :8787, landing :3000) against the live DB; `readPrototypeVariant(search): 'main' | 'v1'` (Tasks 3–7 consume it as a prop threaded from each route's search params).

- [ ] **Step 1: Claim #164 (the session's first tracker write)**

```bash
gh issue edit 164 --add-assignee @me
gh issue view 164 --json assignees --jq '.assignees[].login'
```

Expected: the second command prints the driving dev's login. If the assignee list is empty, retry once; if a DIFFERENT session's login is already there, stop — a sibling session holds the claim (wayfinder: an open, unassigned ticket is unclaimed; an assigned one is not).

- [ ] **Step 2: Branch + worktree + environment**

```bash
cd /home/jeius/Projects/sevendays
git worktree add .worktrees/164-landing-redesign -b prototype/164-landing-redesign main
cp apps/landing/.env.local .worktrees/164-landing-redesign/apps/landing/.env.local
cp apps/api/.dev.vars .worktrees/164-landing-redesign/apps/api/.dev.vars
cd .worktrees/164-landing-redesign
pnpm install && pnpm build:packages
```

(Both copied files are env/secrets — never printed, never committed; the API's local dev secrets live in `apps/api/.dev.vars`, the landing's URL in `apps/landing/.env.local`.)

Expected: install + the 7-package build succeed (worktrees share nothing — their own `node_modules`). The main checkout stays on `main`, untouched.

- [ ] **Step 3: Baseline the suite inside the worktree**

```bash
cd /home/jeius/Projects/sevendays/.worktrees/164-landing-redesign
pnpm --filter @sevendays/landing test 2>&1 | grep -E "Test Files|Tests "
```

Expected: `8 passed (8)` files / `69 passed (69)` tests. If the floor differs, record the observed floor in the rulings ledger's header — nothing in this plan adds or moves landing tests.

- [ ] **Step 4: The variant toggle helper (branch-only, never merges)**

Create `apps/landing/src/lib/prototype-variant.ts` in the worktree, exactly:

```ts
// PROTOTYPE-ONLY (#164): this file exists on the throwaway
// prototype/164-landing-redesign branch and never merges. The v1
// booking-free pieces swap via the established scrub in the real
// delivery; this toggle only lets the owner judge both variants
// side-by-side on one dev server (map #158, M3 precedent).
export type PrototypeVariant = 'main' | 'v1';

export function readPrototypeVariant(
  search: Record<string, string | string[] | undefined>,
): PrototypeVariant {
  const v = Array.isArray(search.v) ? search.v[0] : search.v;
  return v === 'v1' ? 'v1' : 'main';
}
```

- [ ] **Step 5: Bring up API + landing (background, from the worktree)**

```bash
cd /home/jeius/Projects/sevendays/.worktrees/164-landing-redesign
pnpm --filter @sevendays/api exec wrangler dev --remote   # :8787 — keep running (background task)
pnpm --filter @sevendays/landing dev                      # :3000 — keep running (background task)
```

Expected: wrangler's **remote preview** ready on `http://localhost:8787` (the M5-proven media requirement — the exit gate's cover upload ran "real bucket via `wrangler dev --remote`", progress.md #143 entry; plain local mode simulates `MEDIA_BUCKET`, so the browser's presigned PUT lands in the real bucket while the commit's binding HEAD looks at the empty local sim — every upload 400s); vite ready on `http://localhost:3000`. The two run together; the ADMIN never runs concurrently with the landing (both pin :3000 — Task 1 swaps them, sequentially). Background tasks always carry an explicit `cd` — a persisted worktree cwd silently starts the admin without its `.env.local` (the 500 "cannot reach Postgres" failure).

- [ ] **Step 6: Smoke the live reads the compositions will consume**

```bash
curl -s http://127.0.0.1:8787/api/v1/service-packages | head -c 400; echo
curl -s http://127.0.0.1:8787/api/v1/gallery | head -c 200; echo
curl -s http://127.0.0.1:8787/api/v1/testimonials | head -c 300; echo
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
```

Expected: packages JSON with the 12 active packages (coverImageUrl resolving to placeholder paths — Task 1 changes that); gallery JSON empty (`{"categories":[…],"photos":[…]}`-shaped, zero items); testimonials JSON with the 2 rows; landing answers `200`. Any 5xx here stops the arc — fix the stack before any composition work.

- [ ] **Step 7: Branch-local commit**

```bash
cd /home/jeius/Projects/sevendays/.worktrees/164-landing-redesign
git add apps/landing/src/lib/prototype-variant.ts
git commit -m "chore(prototype): #164 worktree baseline — the ?v variant toggle (branch-only)"
```

**Not here:** no admin bring-up (Task 1 does that from the main checkout); no content changes; no token or primitive edits; nothing on `main`.

---

### Task 1: Owner content intake — make the catalog judgeable (HITL)

**Files:**
- No repo files. The owner drives the admin UI; the plan verifies through read-only probes.

**Interfaces:**
- Consumes: Task 0's stack (stop the worktree's landing first — Step 1).
- Produces: the live catalog state every composition task judges against: active packages WITH covers, a non-empty gallery, ≥3 real testimonials, exactly 3 active branches.

- [ ] **Step 1: Swap the stack — admin up, landing down (port discipline)**

```bash
# stop ONLY the worktree's landing (the :3000 holder) — TaskStop or Ctrl-C its background task.
# The worktree's API on :8787 KEEPS RUNNING: it serves the admin identically (same live DB,
# same bindings) — no second API is started.
cd /home/jeius/Projects/sevendays          # the MAIN checkout
pnpm --filter @sevendays/admin dev         # :3000, its own .env.local pointing at 127.0.0.1:8787
```

Expected: the admin login screen at `http://localhost:3000`. If presign/upload fails during intake, the fix path is `docs/media-bucket-runbook.md` (the R2 bindings + scoped S3-token secrets) — never a schema or seed change.

- [ ] **Step 2: Hand the owner the intake checklist (verbatim)**

Present this list to the owner in-session, and wait for their done-signal on each:

1. **Covers:** upload a real cover for every ACTIVE package (12: Package A–H, Basic Package, CP-1, CP-2) — JPG, ≤ 50 MiB (the picker says so). Covers are what make the catalog surfaces judgeable for the first time.
2. **Gallery:** create the categories you want the public tabs to show (the graduation-first story is the record's bullseye — the category set is the owner's call, not invented here), and upload a starter set of real photos — a judging floor of **≥ 3 categories, ≥ 10 photos total**, spread realistically across tabs.
3. **Testimonials:** replace the `John Doe` stand-in and grow the set — target **≥ 3 real testimonials** (the Calamba school quote stays). Real names/attributions only; nothing fabricated.
4. **Branch hygiene:** deactivate the stray test branch `smoke-a-1790449066843` (CMS → Branches) — it currently renders on the live branches read alongside the 3 real ones.

- [ ] **Step 3: Verify the intake (read-only probe)**

```bash
cd /home/jeius/Projects/sevendays/packages/db
node --env-file=.env -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  const q = async (label, query) => console.log(label, JSON.stringify(await sql.unsafe(query)));
  await q('state', \"select (select count(*) from service_packages where is_active and cover_image_key is not null) covered_active, (select count(*) from gallery_categories) gcats, (select count(*) from gallery_photos) gphotos, (select count(*) from testimonials) tmonials, (select count(*) from branches where is_active) active_branches\");
  await sql.end();
}).catch(e => { console.error('PROBE_FAIL', e.message); process.exit(1); });
"
```

Expected: `covered_active` 12, `gcats` ≥ 3, `gphotos` ≥ 10, `tmonials` ≥ 3, `active_branches` 3.

- [ ] **Step 4: The fallback ruling (only if the owner cannot upload now)**

If real media genuinely cannot land today, the arc continues under the recorded fallback: compositions judge with the incumbent placeholder covers + the repo's mixed-provenance photo set as **marked stand-ins** (evidence law — never presented as studio work), gallery/testimonial surfaces judge their structure and empty-state language rather than real content, and the resolution comment names the deferral. Record the fallback + its scope in the rulings ledger (Task 2 Step 1 creates it) before proceeding — never silently.

- [ ] **Step 5: Swap the stack back**

Stop the admin; re-bring the worktree's landing + API (Task 0 Step 5 commands, from `.worktrees/164-landing-redesign`). Re-run the Task 0 Step 6 curls — packages now resolve real `coverImageUrl`s, gallery is non-empty.

**Not here:** no SQL writes by the agent (the owner's admin session is the only writer); no testimonial-form building (#161's page is composed in Task 6, its queue is #165's); no `smoke-*` row deletion (deactivation suffices — Delete is the milestone's ruled-upcoming, and residue cleanup is not this ticket's payload either way).

---

### Task 2: The direction contract — one ratified POV before any composition

**Files:**
- Create (main-tree, `.scratch`, never committed by the arc): `/home/jeius/Projects/sevendays/.scratch/2026-09-30-164-direction-contract.md`
- Create (main-tree, `.scratch`): `/home/jeius/Projects/sevendays/.scratch/2026-09-30-164-rulings.md` (the ledger every later round appends to)

**Interfaces:**
- Consumes: the ticket skills (`prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling`), impeccable's `reference/new-work.md` (redesign posture), `apps/landing/PRODUCT.md` + root `PRODUCT.md`, the #162/#163/#161/#165 feeding rulings, the live catalog (Task 1's state).
- Produces: the owner-ratified direction contract every composition task composes against; the rulings ledger (append-only, one section per round).

- [ ] **Step 1: Load the skills + open the ledger**

Call the Skill tool for `prototype`, `ui-ux-pro-max`, `design-system`, `ui-styling`; read impeccable's `reference/new-work.md` (the session already carries the impeccable skill body). Then create the rulings ledger:

```markdown
# #164 rulings ledger — landing redesign direction (append-only)

Arc: prototype/164-landing-redesign · Judges: light first (#162), one dark round at the end
Catalog state at start: <from Task 1 Step 3 probe, verbatim> · Fallback in effect: <yes/no + scope>

## Round 0 — direction contract
<ratified-contract summary + link, owner-ratified YYYY-MM-DD>
```

- [ ] **Step 2: Draft the direction contract**

Write `.scratch/2026-09-30-164-direction-contract.md` arguing from the product truth — a draft the owner then ratifies or red-pencils (never invented facts; every claim ties to `PRODUCT.md`, a map ruling, or the live catalog):

- **The POV:** how the twin claim (neighborhood trust + craft quality) and the graduation-first bullseye express as composition — what the first viewport argues on each surface class, and what "the photography leads" means in layout terms.
- **The incumbent as anti-reference:** name what the redesign rejects (the M3-accepted atmosphere's specific tics — e.g. strip rhythm, card densities, placeholder-led surfaces) while the substrate stays (tokens, primitives, AA — map ruling 5).
- **Per-surface hypotheses:** one paragraph per surface group (chrome+NotFound/Error, home, catalog, branches+about+submissions, states) with its impeccable mode (Persuade / Experience / Operate).
- **The variant law:** both variants compose from the same direction; only affordances differ (hero CTA set, card CTA slot, detail primary, `tel:` CTAs).
- **The judging protocol:** rendered variants, desktop 1440×900 + mobile 390×844, light first; the owner reacts per round; rulings verbatim into the ledger.

- [ ] **Step 3: The ratification round (HITL gate)**

Present the contract to the owner in-session. They ratify verbatim, red-pencil, or redirect — their edits go into the contract as the ratified text, and the ledger's Round 0 section records ratification + date. **No composition starts before this gate clears** (the #111 lesson: building ahead of the owner's direction is how "very worse" happens).

**Not here:** no visual-world replacement of the token layer (map ruling 5 — substrate rides); no copywriting of customer-facing strings beyond the contract's intents (surface copy drafts with the owner in the composition rounds); no code edits yet.

---

### Task 3: Composition round 1 — global chrome + branded NotFound + Error

**Files (worktree, `prototype/164-landing-redesign`):**
- Modify: `apps/landing/src/routes/__root.tsx` (mounts the new global NotFound/Error; gains the prototype-only `?t=dark` hook in Task 8 — NOT now)
- Modify: `apps/landing/src/components/site-header.tsx`, `site-footer.tsx`, `mobile-nav.tsx` (recomposed chrome)
- Create: the app-local `NotFound.tsx` + `ErrorComponent.tsx` compositions (exact paths settle at execution beside the existing components — PascalCase, app-local per ADR-0017's Tier-2 law)

**Interfaces:**
- Consumes: `readPrototypeVariant` (header/mobile-nav variant CTA: "Book now" vs "Call us"); the ratified direction contract.
- Produces: chrome + error-surface rulings (ledger Round 1); the chrome every later round screenshots against.

- [ ] **Step 1: Recompose the chrome on the direction**

Rework header/footer/mobile-nav per the contract — ink-led bands, cool palette, the type/scale/density the contract rules. The variant-differing piece is the header/mobile-nav CTA: `readPrototypeVariant` decides "Book now" (main) vs "Call us" → `/branches` (v1). Footer stays CTA-less on both variants (M3 ruling carried).

- [ ] **Step 2: Compose the branded global NotFound + Error**

`__root.tsx` gains `notFoundComponent` + `errorComponent` renderers wearing the direction — the audit's gap. The route-level `notFound()` calls keep their behavior; the global surfaces compose fresh. Copy drafts land with the owner in Step 3 (placeholder-marked until ruled — structure must not depend on unruled copy, M3's law).

- [ ] **Step 3: Capture + the reaction round (HITL)**

```bash
# browser-use:control-browser, from the worktree-stack session:
#   desktop 1440x900 + mobile 390x844, each of:
#   http://localhost:3000/?v=main   http://localhost:3000/?v=v1
#   http://localhost:3000/no/such-route   (NotFound)
#   a forced-error pass             (Error — e.g. API stopped, one capture)
# saves: /home/jeius/Projects/sevendays/.scratch/164-captures/chrome-{main,v1}-{desk,mob}.png etc.
```

Present the captures (or the live URLs — the owner can browse both `?v=` values themselves). Record every ruling verbatim into the ledger's `## Round 1 — chrome + NotFound/Error (light)`.

- [ ] **Step 4: Gates + branch-local commit**

```bash
cd /home/jeius/Projects/sevendays/.worktrees/164-landing-redesign
pnpm --filter @sevendays/landing typecheck
pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing lint
pnpm --filter @sevendays/landing test 2>&1 | grep -E "Test Files|Tests "
git add -A apps/landing/src
git commit -m "feat(prototype): #164 round 1 — chrome + branded NotFound/Error compositions (branch-only)"
```

Expected: tsc zero errors; biome clean; tests `8 passed (8)` / `69 passed (69)` unchanged.

**Not here:** no booking-surface chrome (wizard header stays incumbent — v2's); no token edits (a token-level itch records as a ruling for the spec); no dark rendering yet (Task 8).

---

### Task 4: Composition round 2 — home

**Files (worktree):**
- Modify: `apps/landing/src/routes/index.tsx` and the home composition components it mounts (hero block, strips, testimonial slot — exact component split follows the contract's hypothesis)
- Consumes as-is: the featured-packages read, the services teaser read, the branches read

**Interfaces:**
- Consumes: the live `/api/v1/testimonials` (REAL testimonials now — the audit's stand-in gap closes in composition); real covers from Task 1; chrome from Task 3.
- Produces: home rulings (ledger Round 2) — hero composition, strip order/rhythm, the testimonials treatment, the variant hero CTA set.

- [ ] **Step 1: Recompose home on the direction**

The contract's POV leads: the first viewport argues craft + trust with real imagery (graduation-first weighting in the hero/proof story), booking one action away. Home's section lineup is the contract's to set (the #111 lineup — image-led hero → gallery strip → featured → services teaser → testimonials → emphasis strip — is the incumbent's evidence, not a constraint). The testimonial slot renders the fetched set — stand-ins are gone; the ruled empty line renders only if the set is empty at judge time.

- [ ] **Step 2: Wire the variant hero CTA set**

`?v=main` → "Book now" (primary) + "View services"; `?v=v1` → "Call Us" + "Services" (the M3-ruled v1 pairing). Same composition otherwise — the variant law.

- [ ] **Step 3: Capture + reaction round (HITL)**

`/?v=main` + `/?v=v1`, desktop + mobile, same protocol as Task 3 Step 3; captures to `.scratch/164-captures/home-*`. Rulings verbatim → `## Round 2 — home (light)`.

- [ ] **Step 4: Gates + branch-local commit** — identical shape to Task 3 Step 4, message `feat(prototype): #164 round 2 — home composition (branch-only)`.

**Not here:** no branches body strip re-add (that's a composition ruling, not a preset); no PostHog event work (M6); no hero-copy finalization without the owner's verbatim ratification (draft-and-ratify, #111's law).

---

### Task 5: Composition round 3 — the catalog: packages index, package detail, services

**Files (worktree):**
- Modify: `apps/landing/src/routes/packages/index.tsx`, `packages/$slug.tsx`, `services.tsx` + the card/detail components they mount (`PackageCard`, `InclusionsList`, `CoverPanel`'s successor treatment, the services surfaces)

**Interfaces:**
- Consumes: real covers (Task 1); the #163 no-price law; `readPrototypeVariant` (card CTA slot + detail primary).
- Produces: catalog rulings (ledger Round 3) — card system, density, detail hierarchy, the no-price slot's composed reflow, services-page posture.

- [ ] **Step 1: Recompose the index + card system**

One card system per the contract (real covers lead — the CoverPanel placeholder rule survives only for a package still missing its cover). Variant law: main's card may carry its ruled affordance, v1's is CTA-less (the M3 catalog rule) — `readPrototypeVariant` decides.

- [ ] **Step 2: Compose the no-price slot (#163, verbatim law)**

Where a price would render, **nothing renders** — no placeholder, no inquire line; the card/detail reflows and the Book CTA stays. Judging vehicle: the CMS's has-price checkbox does not exist yet (it is the milestone build's ruled-upcoming, not shipped), so the prototype judges the slot by nulling one or two active packages' prices in the worktree's fetched data — a branch-only mock at the route seam, never an API or DB change, named in the capture set. The judged ruling records the reflow behavior for the spec.

- [ ] **Step 3: Recompose package detail + services**

Detail: exactly one primary affordance per variant — main "Book this package", v1 "Call us" → `/branches`. Inclusions/frames render per the contract's density rulings. Services: the Studio Services showcase with its quiet closing strip; copy never presupposes online booking.

- [ ] **Step 4: Capture + reaction round (HITL)**

`/packages`, one `/packages/<a-covered-slug>`, `/packages/<an-unpriced-slug>`, `/services` — both variants, desktop + mobile. Rulings verbatim → `## Round 3 — catalog (light)`.

- [ ] **Step 5: Gates + branch-local commit** — Task 3 Step 4 shape, message `feat(prototype): #164 round 3 — catalog compositions + the #163 no-price slot (branch-only)`.

**Not here:** no API/type/schema movement for Unpriced (metadata-only migration is the milestone build's); no booking wizard prefill changes (`/book?package=` stays untouched); no add-on surfaces (in-flow only).

---

### Task 6: Composition round 4 — branches, about (gallery + testimonials), the testimonial submission page

**Files (worktree):**
- Modify: `apps/landing/src/routes/branches.tsx`, `about.tsx` + their components
- Create: the public testimonial-submission route + its form composition (#161's dedicated page — route name settles at execution; `/share-your-story`-class naming is the owner's round-4 ruling, not preset here)

**Interfaces:**
- Consumes: the live gallery (real photos, real tabs — Experience mode: the artifact leads, the interface recedes); the testimonials read; `readPrototypeVariant` (BranchCard `tel:` CTA on v1; the /about submissions CTA framing on both).
- Produces: branches/about/submissions rulings (ledger Round 4) — the gallery treatment, the testimonial presentation, the submissions CTA + page treatment, the form's posture.

- [ ] **Step 1: Recompose branches + about**

Branches: the 3 real branches (Task 1 hygiene), walk-in badges, v1's per-branch `tel:` CTA. About: the tabbed gallery over the real categories/photos (All first, tabs derived from the payload — the #142 behavior stands; the TREATMENT recomposes), the testimonials presentation, and the CTA to the submissions page (#161: reached from /about, both variants).

- [ ] **Step 2: Compose the testimonial submission page (#161's ruled shape)**

Dedicated page, `quote` + `person` fields only, bounds as anti-spam, a honeypot affordance direction (the rate-limit binding + Turnstile escalation are spec payload — never composed here). Mode: Operate — a task surface wearing the brand. Both variants frame it identically (the form is edition-independent; only its invitation framing may vary).

- [ ] **Step 3: Capture + reaction round (HITL)**

`/branches`, `/about` (+ each gallery tab), the submission page (+ its validation/empty states) — both variants, desktop + mobile. Rulings verbatim → `## Round 4 — branches + about + submissions (light)`.

- [ ] **Step 4: Gates + branch-local commit** — Task 3 Step 4 shape, message `feat(prototype): #164 round 4 — branches/about/submissions compositions (branch-only)`.

**Not here:** no submission POST endpoint (the API surface is the milestone build's — the page composes against a local stub at most); no moderation queue anything (#165's); no Turnstile/rate-limit wiring.

---

### Task 7: Composition round 5 — the states language: skeletons, empties, and the no-price end-to-end pass

**Files (worktree):**
- Modify: the loading/empty presentations across the recomposed routes (first-load skeleton shapes, the ruled empty lines, muted media placeholders)
- Consumes: the #165 rhyme law — first-load-only skeletons, muted placeholders, no per-card image skeletons

**Interfaces:**
- Consumes: every prior round's compositions (states compose over them).
- Produces: the states rulings (ledger Round 5) — the landing's skeleton/empty vocabulary in light, ruled once for the spec.

- [ ] **Step 1: Compose the skeleton + empty vocabulary**

One first-load skeleton grammar across surfaces (structure-only blocks, no per-card image skeletons), one muted media placeholder treatment (a package still missing its cover, a failed image), and the ruled empty lines carried from M5 (packages line, featured-strip collapse, portfolio placeholder with hidden tab row, testimonial coming-soon) recomposed on the direction. Judged with the API stalled (throttle/stop vite's upstream or use devtools offline on the document) for skeletons, and against an empty-category tab for the portfolio empty state.

- [ ] **Step 2: The no-price end-to-end pass**

Walk every recomposed surface with the unpriced package mocked (Task 5's vehicle): index, detail, home featured — nothing renders where the price would, reflow holds, Book CTA stays. The pass is confirmatory; new findings append to Round 3's section.

- [ ] **Step 3: Capture + reaction round (HITL)** — same protocol; captures to `.scratch/164-captures/states-*`. Rulings verbatim → `## Round 5 — states language (light)`.

- [ ] **Step 4: Gates + branch-local commit** — Task 3 Step 4 shape, message `feat(prototype): #164 round 5 — skeleton/empty/no-price states language (branch-only)`.

**Not here:** no admin-side skeletons (#165's system); no booking-flow states (v2); no loading-state library additions (the vocabulary composes from what exists — gaps are rulings).

---

### Task 8: The one dark round (#162, verbatim law)

**Files (worktree):**
- Modify: `apps/landing/src/routes/__root.tsx` (prototype-only `?t=dark` hook — adds `class="dark"` to `<html>` via an effect; branch-only, never merges)
- Modify: the worktree's `apps/landing/src/styles.css` (a prototype-local `.dark` token sketch appended AFTER the `@sevendays/ui/tokens.css` import — direction-level values only)

**Interfaces:**
- Consumes: the ENDORSED light direction (Tasks 3–7 as ruled — the dark round re-renders THE RULED DIRECTION, not a second design pass).
- Produces: dark per-surface rulings (ledger Round 6) — the dark counterpart the spec's AA table extends.

- [ ] **Step 1: The dark re-render**

Apply `?t=dark`: document root gains the class; the prototype-local `.dark` sketch derives the ruled surfaces' tokens (direction-level values — the from-zero production `.dark` block in `packages/ui` is the milestone build's, #162). Every recomposed surface re-renders unchanged in composition — only the palette flips.

- [ ] **Step 2: Capture + the ONE reaction round (HITL)**

The full surface set, both variants where affordances differ, desktop + mobile, `?t=dark&v=…`. Captures to `.scratch/164-captures/dark-*`. The owner reacts ONCE, per #162 — rulings verbatim → `## Round 6 — dark (the one round)`. If the round surfaces a light-direction change, that change records as a follow-up ruling for the spec (a re-run of light rounds is NOT this ticket's volume).

- [ ] **Step 3: Gates + branch-local commit** — Task 3 Step 4 shape, message `feat(prototype): #164 round 6 — the one dark re-render (branch-only)`.

**Not here:** no production `.dark` block in `packages/ui/tokens.css` (#162's build item); no next-themes/toggle primitive work (the milestone's); no second dark round — one, then stop.

---

### Task 9: Consolidate, resolve the wayfinder ticket, close the arc

**Files:**
- Create (staged temp): `/home/jeius/Projects/sevendays/.scratch/164-resolution.md` → posted as #164's resolution comment
- Modify: map #158's body via `gh issue edit 158 --body-file` (Decisions-so-far pointer + fog graduation)
- Modify (main-tree, owner-committed): `PRODUCT.md`'s Operating Context line — the Philippines hedge tightens to the three evidenced cities (Calamba, Iligan, Dipolog; recon already carries the evidence)

**Interfaces:**
- Consumes: the complete rulings ledger (`.scratch/2026-09-30-164-rulings.md`), the direction contract, the capture set.
- Produces: the closed ticket, the map pointer, the graduated fog — #166's (spec ticket's) direct inputs.

- [ ] **Step 1: Consolidate the rulings**

Re-read the ledger end-to-end; reconcile round sections against the captures (`/home/jeius/Projects/sevendays/.scratch/164-captures/`). Every ruling is attributable (round + surface + variant + theme); contradictions between rounds are resolved by the LATER ruling and marked superseded inline — never silently.

- [ ] **Step 2: The resolution comment (staged + verified)**

Write `.scratch/164-resolution.md` from the ledger: the endorsed direction in summary, the per-surface/per-theme rulings (or the ledger's faithful index + the ledger/contract/capture pointers as linked assets — wayfinder: assets are linked, not pasted), the variant law as composed, the #163/#161/#165 carry-ins as ruled into compositions, the fallback status if Task 1's Step 4 path was taken, and the branch name for the build to mine (`prototype/164-landing-redesign` — throwaway, nothing merges). Then:

```bash
gh issue comment 164 --body-file /home/jeius/Projects/sevendays/.scratch/164-resolution.md
gh api repos/jeius/sevendays/issues/164/comments --jq '.[-1].body' | head -20   # read-back: the posted body
```

Expected: the read-back matches the staged file's head. Then close:

```bash
gh issue close 164
```

- [ ] **Step 3: The map update (staged + verified)**

Fetch #158's body, append to **Decisions so far** (one line, name-wrapped link per the wayfinder's refer-by-name law), and graduate the fog: strike the `Per-surface redesign treatments beyond the ruled direction, in both themes` line from **Not yet specified** (now the ticket's rulings; the spec ticket consumes them) and refresh the `v1-pick classes for the redesign` line to note the prototype's variant-composition findings exist. Write via `gh issue edit 158 --body-file` from a temp file; read back with `gh issue view 158 --json body` before moving on. Sibling sessions may have edited the body mid-arc — re-fetch, patch onto the CURRENT body, never a stale copy (wayfinder lesson).

- [ ] **Step 4: The main-tree wrap (owner-committed)**

- `PRODUCT.md`: tighten the inferred-market line to the evidenced three cities (one edit; the recon section above carries the facts).
- The rulings ledger, direction contract, and capture set stay in `.scratch/` (local working artifacts — `.scratch` is the house's session-record seat, per the #111 precedent's session records).
- The worktree STAYS at `.worktrees/164-landing-redesign` on its branch (the build's mine-able source — the M3 throwaway-branch practice; the 131 worktree is the standing precedent for leaving them).
- Dev stacks stopped; **no main commits by the arc** — the owner commits `PRODUCT.md`, this plan file, and any `.scratch` artifacts they want kept, on their cadence.

**Not here:** no spec writing (#166's ticket — next on the map after this resolves); no execution-ticket cutting (the spec ticket's loop); no build work; no v1 picks (nothing merged); no `graphify update .` (main-tree code unchanged).



