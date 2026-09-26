# M5 Ticket 05 — Admin screens: shared CMS patterns + the packages surface (UI-bearing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **UI-bearing ticket:** before Task 4 (the first composition task), load the skill set `prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling` (AGENTS.md UI rule; spec #94 amendment) — all four are installed skills (`prototype` at `~/.agents/skills/prototype/`, the rest under the repo's `.agents/skills/`). The skills drive composition quality INSIDE the fences below; where a skill suggests something beyond a fence, the fence wins. New compositions (named per task) get rendered-variant screenshots recorded to ticket #139 for the owner's morning reaction — the gate is the RECORDING, never the reaction (owner asleep; no clarify calls).

**Goal:** The admin's catalog-core screens go real on the prototype-ruled compositions. This ticket ships (1) the shared CMS pattern library every later screen consumes — Sheet editors (mobile bottom sheets), the Motion-for-React popup recipe, `@dnd-kit` drag-handle reorder, the consolidated table format (dot under identity, icon actions, animated row expand, ~700px container-query stacked rows) — and (2) the packages surface: the packages table (Featured as an in-name primary badge, slug out of the table) and the FULL package editor (Core/Cover/Advanced cards; Frames/Prints/Privileges as `bg-card` section groups behind a Separator; framed-picture and print rows keep the four-attire chips while privilege rows drop them; dnd rows with solid drag backgrounds; cover upload through ticket 02's presign seam; slug as the advanced field behind the break-links warning). The screens consume ticket 03's `/api/v1/admin/*` subtree through NEW typed + Zod-parsed api-client wrappers (ADR-0006) reached via the M4 `getSessionScopedApiClient` server-function seam — every save is the atomic package PUT with array order = position.

**Architecture:** Eight tasks: (1) the ordering gate + branch + the four new dependencies (`motion` 13.4.2, the `@dnd-kit` trio — ONE task, versions locked from the prototype) + `MotionConfig reducedMotion='user'` at the app root, (2) the api-client admin wrappers (service packages CRUD, branches, studio services + branch matrix, GET-only lookup lists, presign) + the admin server-function seam (`apps/admin/src/lib/admin.functions.ts`) + query factories, (3) the pure editor-state seam (`lib/package-editor-state.ts` — state↔read, state→payload, validation, conflict mapping) + the cover-upload client loop (`lib/cover-upload.ts`), (4) the shared pattern library (`components/cms/shared.tsx` — ported from the prototype branch with the pinned deltas), (5) the packages table screen (consolidated format, optimistic deactivate/reactivate, mobile stacked rows), (6) the package editor (create + edit routes, Core/Cover/Advanced, inclusions with dnd + attire chips, cover loop wired, slug advanced, conflict→field mapping), (7) evidence: rendered-variant frames + the CDP smoke (create → edit → deactivate → reactivate through the real UI) recorded to ticket #139, (8) full gates + docs rotation + PR/merge + v1 pick + ledger + ticket close. Zero schema changes, zero `packages/types` changes, zero migrations, no new shadcn primitives (all 22 on disk cover the compositions — verified by name).

**Tech Stack:** react 19.2.8 / react-dom 19.2.8, `@tanstack/react-start` 1.168.58 + `@tanstack/react-query` 5.102.8 + `@tanstack/react-router` 1.170.39 (all installed; `@tanstack/react-form` 1.33.5 stays installed-but-unused — the editor is controlled state, per the prototype), Tailwind CSS 4.3.3 (native container queries), `lucide-react` 1.37.0, zod 4.5.1, `@base-ui/react` 1.8.x via `@sevendays/ui` (22 primitives + `hooks/use-mobile`), biome + typescript 6.0.3 via `@sevendays/config`. **NEW dependencies (this ticket's only manifest change, Task 1):** `motion` **13.4.2** (exact — the spec pins it; import from `'motion/react'`, NEVER framer-motion), `@dnd-kit/core` **6.3.1**, `@dnd-kit/sortable` **10.0.0**, `@dnd-kit/utilities` **3.2.2** (exact — the prototype's locked resolution). `api-client` is consumed as source (`./src/index.ts` exports) — only the API needs `pnpm --filter @sevendays/api build` before client typecheck.

**Spec:** Implements ticket [#139 "M5 ticket 05 — Admin screens: shared CMS patterns + the packages surface"](https://github.com/jeius/sevendays/issues/139) (label `ready-for-agent`), whose parent is the M5 spec `docs/specs/2026-09-24-m5-admin-cms-spec.md` (issue #134 — this ticket's sections: § Admin UI compositions (the #131 rulings, verbatim — THE authority for every visual/interaction decision), § The media pipeline (the presign/commit product behavior), the admin half of § Testing posture, § Open items riding the build). Key recon facts (2026-09-26, branch `feat/137-m5-03-admin-write-model` at Task 2):

- **The composition of record is the prototype BRANCH, not its plan doc.** `prototype/131-admin-cms-compositions` (rounds through `ac9daca`) carries the applied render: `apps/admin/src/components/prototype-cms/shared.tsx` (640 lines — the Motion recipe through round 9's exit-flash fix), `screens/packages.tsx` (291 — the consolidated table), `screens/package-editor.tsx` (651 — the dnd editor). Every component this plan ports names its source path; port with `git show prototype/131-admin-cms-compositions:<path>` and apply the pinned deltas. The nine amendment rounds are digested in the source headers (rounds 1–9: icon tooltips → chevron-last → identity tooltips → bottom-sheet confirms → mobile editor sheets → expand-border enclosure → keyframe channel → Motion-for-React everywhere → overlay flash fix).
- **The dependency of record is ticket 03's COMMITTED PLAN** (`docs/superpowers/plans/2026-09-26-137-m5-03-admin-write-model.md`) once #137's PR merges — mid-flight today on `feat/137-m5-03-admin-write-model` (Tasks 1–2 landed: `admin-shared.ts`, the gated `admin.ts` root chain, `admin-branches.ts`, `admin-print-sizes.ts`). The endpoints this ticket consumes: `GET/POST /api/v1/admin/service-packages` + `GET/PUT /:id` (atomic save, canonical `servicePackageReadSchema` reads with `coverImageUrl`), the same quartet under `/admin/branches` (`branchSchema` reads) and `/admin/studio-services` (`studioServiceWithBranchesSchema` reads) plus `PUT /admin/studio-services/:id/branches` `{ branchIds }`, `GET /admin/print-sizes` + `GET /admin/attires` (the editor's lookup vocabularies, deactivated rows included), and `POST /admin/media/presign` `{ purpose: 'package-cover', contentType: 'image/jpeg' }` → `{ key, uploadUrl }` (ticket 02's seam, live since #136). All uniqueness collisions arrive as 400 + `{ error, details: [{ path, message }] }` — no 409 anywhere.
- **The client wrapper seam is THIS ticket's** (#137 deliberately left `packages/api-client` untouched — its Task 9 gate is command-only): wrappers are thin functions over the RPC client (`raw.api.v1.admin.…`), each response through `unwrap()` (ADR-0006's single parsing gate), request types inferred via `InferRequestType` (never hand-typed — the house pattern in `routes/service-packages.ts`).
- **Every admin API call runs SERVER-side.** M4's seam (`apps/admin/src/lib/api.server.ts`): server functions read the httpOnly session cookie from the incoming request via `getRequestHeaders().get('cookie')` and forward `Authorization: Bearer` over the service binding (prod) / `API_URL` (dev). The browser never holds the token — and never calls the API directly, with ONE by-design exception: the cover file's PUT goes browser → the presigned R2 URL (ADR-0019; the bucket CORS lists the admin origins).
- **Mutation payloads are presence-encoded (types are #135's, consumed as-is):** `createServicePackageSchema` carries `coverImageKey?` (staging key at create); `updateServicePackageSchema` carries `slug` + `coverImageKey: string | null | absent` (string = bind fresh staging key, null = clear, absent = unchanged) + frame TOKENS (`frames: [{ id: string }]` — echo existing frame uuids, mint fresh tokens for new frames) + `inclusions[]` where picture kinds need `attireIds.length >= 1` and privileges need `description` min-1 — both enforced by the schema's `superRefine`s, mirrored client-side by this ticket's `validateEditorState`.
- **The admin app has NO test suite and gains NONE here** (#143 seats the lib-seam suite). The seams #143 will test are structured NOW as pure functions in `lib/package-editor-state.ts` (state→payload, validation, conflict→field-error mapping) — exported, JSDoc'd with the seam note, untested this ticket. Admin's `test` script stays the documented no-op; no test files anywhere; the repo check count must not move.
- **Sibling fences (spec § Tickets; `docs/plan.md` M5 block):** this ticket owns HALF of M5 checkbox 5 ("Admin screens — catalog core" — the packages surface + the shared patterns) and ticks NOTHING there; the checkbox stays unticked until #140 (branches + the two matrices + add-ons + the bulk bar) lands and ticks it at its close. NOT here, regardless of temptation: the branches/studio-services/add-ons screens, the `LightEntityEditor`'s per-entity field forms, and the bulk bar (#140); the gallery/testimonials/lookups screens and their CRUD wrappers (#141 — the TWO GET-only lookup lists the package editor consumes are this ticket's, agent ruling AQ-2); any public read or trim rule (#138); any landing file (#142); admin lib-seam tests, the seed-contract demotion, `cms-reflection.mjs` (#143); the appointments/settings stubs (v2/M5.5); the four owner-copy strings that belong to #140's screens ("No studio services yet." / "No add-ons yet." / "No branches yet."); the two token decisions as brand values (flag-only).

## Global Constraints

- **Branch & ordering gate (binding, controller ruling):** `feat/139-m5-05-admin-screens-core`, cut off **main** — but ONLY after the controller merges #137's PR (the admin write model this ticket consumes): the admin routers (`admin-service-packages.ts`, `admin-studio-services.ts`, …), the api suite floor, and the AppType the client resolves all assume #137's post-merge state. Task 1 Step 0 verifies the artifacts on main and STOPS (report; do not re-create #137's work) if any is missing. This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#139)` squash style; every commit below is pinned verbatim. Evidence (frames, smoke script, gate runs) lands in gitignored `/home/jeius/Projects/sevendays/.superpowers/sdd/2026-09-26-139-m5-05/`.
- **Skills at execution (AGENTS.md UI rule + #94 amendment, verbatim duties):** load `prototype` + `ui-ux-pro-max` before Task 4 and keep `design-system` + `ui-styling` loaded through Task 6; the skills own spacing, hierarchy, and micro-layout WITHIN the pinned compositions — composition decisions INSIDE the #131 rulings are not re-litigated. Every NEW composition (this plan names them: create-mode editor, cover-upload status line + captions, save-guard row marking, deactivated-attire dimmed chips, deactivated-sizes note placement, toast copy) gets a rendered-variant screenshot in Task 7 recorded on ticket #139 for the owner's morning reaction; no ticket gate waits on the verdicts (controller ruling: owner asleep, no clarify calls — genuinely open decisions take the agent ruling + OPEN-QUESTIONS-listing route, enumerated in Task 7's comment).
- **The #131 rulings bind verbatim (composition law — the build ports them, never re-drafts):**
  - **Sheet for all catalog add/edit** — the shared editor chrome is `LightEntityEditor` (right-side Sheet desktop; bottom sheet < 768px via `useIsMobile`, `rounded-t-xl`, `max-md:max-h-[85dvh]`, body `flex-1 overflow-y-auto`). Its first CONSUMERS are #140's light entities; this ticket ships the shell + the confirm/editor animation pattern. **The package editor is a dedicated route, NOT a Sheet** (agent ruling AQ-1: the #131 composition of record renders it as a page — the map's pre-#131 owner ruling named "a dedicated package edit page"; nine amendment rounds never moved it into a Sheet; #139 AC-2's "the Sheet editor" reads as the shared Sheet-editor pattern family this ticket establishes).
  - **The Motion-for-React popup recipe (round 8 + 9, port verbatim from the prototype's `shared.tsx`):** popups and overlays are Base UI components composed with `motion.div` through the `render` prop (NOT function/spread props); the conditional portal sits inside `<AnimatePresence>` with `keepMounted` on the Portal; components rendered conditionally by their parent hold a local `visible` latch — close requests flip only the latch, and the parent is informed via `onExitComplete` (the canonical parent-conditional recipe; the CDP-probed failure mode is zero exit animations when the parent unmounts in the same commit); transitions `duration: 0.3, ease: 'easeOut'`; the DeactivateConfirm's overlay rides the same recipe (opacity 0→1→0) — the round-9 fix for the fill-mode-none flash; desktop confirm animates scale 0.95 + fade, mobile bottom sheets animate translateY(100%) (confirm) and translateX(100%)↔0 (right sheet) / translateY(100%) (bottom sheet); `MotionConfig reducedMotion='user'` wraps the app at `__root.tsx`'s `RootDocument` (Task 1).
  - **Reorder = drag handle only, `@dnd-kit` pinned — up/down buttons die.** Handle-only grips (listeners + attributes on the grip alone); sensors `PointerSensor { distance: 4 }` (desktop small-movement threshold) + `TouchSensor { delay: 300, tolerance: 8 }` (the ~300ms long-press so scroll never fights drag — the spec ruling; the prototype's editor shipped PointerSensor-only and the build closes that gap) + `KeyboardSensor` with `sortableKeyboardCoordinates`; dragged rows carry a solid background (`bg-card shadow-sm relative z-10`); section-scoped reorder derives from the filtered section list and applies by row identity — NEVER raw array index — so a drag can never cross another section's rows (the prototype's `reorderInclusions` discipline, ported).
  - **The consolidated table format (port the prototype's `packages.tsx` structure exactly):** status dot LEADS the identity line (`size-2.5 rounded-full bg-green-500` active / `bg-gray-400` deactivated, + `sr-only` text — color is never the only signal); description sits UNDER the identity, one-line truncate, indented `pl-4.5` (dot + gap) to share the name's left edge, HIDDEN while the row is expanded (the reveal carries the full text — deduplicated expansion); the name truncates with a hover tooltip carrying the full text (`ActionTooltip`); Featured is a `Badge variant='default'` (`text-xs`, content `Featured`) beside the name — the dedicated column dies; slug is out of the table entirely; actions are icons revealed on hover/focus-within (`opacity-0 group-hover:opacity-100 group-focus-within:opacity-100` on the row's `group` class): Edit = SquarePen, Deactivate = PowerOff (destructive tint), Reactivate = Power (green tint), each `size='icon-sm'` ghost with aria-label + tooltip carrying the same text; the expand chevron renders AFTER the icons, always visible, rotates when open (`aria-expanded` intact); the chevron is the keyboard/AT toggle while the whole identity row click toggles expansion (actions cell stops propagation); row expand/collapse is ANIMATED (the grid `0fr↔1fr` `Collapse`); when open, the identity row drops its bottom border and the panel's cell carries the closing border (A2 enclosure); `tabular-nums` on the price cell; the Actions header renders empty; no chevron when a row has nothing to reveal; price `peso(cents)` = `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100)` (the landing precedent, `₱1,100.00`).
  - **Mobile (< 768px, `useIsMobile`; tables at ~700px CONTAINER query):** dialogs and editors become bottom sheets (rulings above); the table folds into stacked two-line rows below a 700px container width (Tailwind v4 native `@container` on the wrapping Card + `@max-[700px]:hidden` desktop table / `hidden @max-[700px]:flex` stacked list — restructure-never-shrink; the horizontal-scroll wrapper is the named anti-pattern); stacked rows: line 1 = dot + name + price (right, `tabular-nums`), line 2 = truncated description (`pl-4.5`, hidden while expanded), the whole two-line header toggles the animated reveal; the reveal carries the FULL description + the Featured badge + the icon actions (visible, no hover semantics on touch).
- **The two open token decisions RIDE FLAGGED (controller ruling — never silently hardcoded, never promoted):** the status-dot + reactivate-icon palette stays Tailwind defaults (`bg-green-500` / `bg-gray-400` / `text-green-600`) with `/* TODO(token-ruling): status-dot palette pending the owner's design-system ruling (#134 open items) */` at `StatusBadge` and the reactivate button; the card-radius step-down stays a usage-site `className` override (`rounded-lg` on every Card that renders one step down from the primitive's own radius) with the same `TODO(token-ruling)` comment at the packages Card + editor cards — `packages/ui/tokens.css` and the Card primitive are untouched.
- **Owner-copy pins (verbatim — transcribe, never re-draft):** packages h1 `Packages`; subline `Everything on the landing site&apos;s /packages page, editable in place.`; primary action `New package`; editor back link `← Back to packages`; save `Save changes` / `Cancel`; deactivate confirm title `Deactivate <name>?`, body `Deactivated items are hidden from the landing site immediately. History is untouched, and you can reactivate any time.`, buttons `Deactivate` (destructive) / `Cancel`; reactivate is direct, no confirm; slug trigger `Advanced`, label `Slug`, warning `Changing the slug breaks links that point here.`; empty-table line `No packages yet.`; empty frame-group line `No framed pictures in this frame yet.` — render-site comment `// TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)`. Field helpers rendered in the #131 frames (owner-ratified by the copy confirmation): Price `Stored as centavos.`, Duration `Optional`. Agent-authored strings (rendered-variant-flagged, not owner copy): cover constraint line `JPG only, up to 50 MiB.`, upload status texts (`Presigning…` / `Uploading… <pct>%` / `Cover ready — save to bind it.` / `Upload failed: <message>`), the editor's create-mode h1 `New package`, toasts `Saved.` / error-carrying failure toasts. The second unplanned string THIS ticket carries: `Deactivated sizes stay on existing packages but disappear from new pickers.` — same `TODO(owner-copy)` marker, rendered under the Prints section header when the print-size vocabulary holds ≥ 1 deactivated row (placement is agent ruling AQ-3). The prototype's honesty captions ("Prototype: changes stay on this page." / "Uploads are simulated…") do NOT carry into the build.
- **Where API calls run (binding):** every admin-API call rides a server function in `apps/admin/src/lib/admin.functions.ts` — `createServerFn` + Sentry `startSpan` (house rule) + `getSessionScopedApiClient(getRequestHeaders().get('cookie'))` (the M4 seam; the `_shell` gate guarantees the session). Read fns are `method: 'GET'`; mutation fns are `method: 'POST'` with a zod `.validator`. Mutations RETURN result values, never throw, so error DETAILS survive the serialization boundary: `{ ok: true; data: T } | { ok: false; status: number; message: string; details?: unknown }` (the wrapper's thrown `ApiClientError` is caught inside the server fn and narrowed). The ONE browser-direct call is the cover file's `PUT uploadUrl` (XHR, for progress) — ADR-0019 by design.
- **Client data flow (binding):** query factories in `apps/admin/src/lib/cms-queries.ts` (`queryOptions` + server-fn `queryFn`, the `branchQueries`/landing pattern); components `useQuery`; mutations `useMutation` — table deactivate/reactivate is OPTIMISTIC (`onMutate` patches the list cache from a snapshot, `onError` rolls back + error toast, `onSettled` invalidates); editor save is non-optimistic (form state is the source of truth): success → invalidate packages + by-id → toast `Saved.` → (create) navigate to the new id's edit route / (edit) stay; failure → `conflictFieldErrors` maps 400 details to per-field errors (rendered at the matching Field), anything else toasts the API message. Toaster (`sonner`) is already mounted in `__root.tsx`.
- **Gates (repo AGENTS.md + controller rulings, verbatim duties):** after the Task 1 manifest change run `pnpm install` (lockfile committed). Before anything that typechecks the client or apps: `pnpm build:packages && pnpm --filter @sevendays/api build` (the client resolves `AppType` from built `dist/`); the per-task HARD typecheck gate is `pnpm --filter @sevendays/admin typecheck` (+ `pnpm --filter @sevendays/api-client typecheck` in Task 2) after that build. Every task commits only with `pnpm check` green for the packages it touched (api tests need the compose db up: `docker compose up -d db` first — this ticket adds no api tests but the check fan-out runs them). Biome canonical form via `pnpm --filter @sevendays/admin fix` (and `--filter @sevendays/api-client fix` after Task 2) before committing — accept its rewrites. Tick checklist boxes with `- [✅]`, never `[x]`. Never commit secrets (`VERIFY_STAFF_EMAIL`/`VERIFY_STAFF_PASSWORD` are operator-env, never committed; `.env.local`/`.dev.vars` are gitignored). Route-tree regen: `pnpm --filter @sevendays/admin generate-routes` (or let `vite dev`/`build` regen) and COMMIT `routeTree.gen.ts` with the routes. Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Baselines (binding — re-measure at Task 1 Step 0 on post-#137 main):** `apps/api` = **23 test files / 262 passed + 3 skipped** (the 3 skips are #136's runIf-gated LIVE harness; the vitest-4 "close timed out" exit noise is pre-existing); `packages/types` = 13 files / 112 tests; `packages/db` = 22 passed + 8 skipped; `packages/api-client` = 4 files (unwrap/create/app-type/loopback suites); `apps/landing` = its current lib-seam floor; `apps/admin` = the no-op `test` script (the documented gap). `pnpm check` = **35/35 turbo tasks**. **This plan adds ZERO test files and ZERO scripts → every count and the check total must NOT move;** if any differs at a gate, reconcile against this plan's file list before diagnosing (do not loosen, do not "fix" by adding tests — #143 owns that).
- **Version pins (probed 2026-09-26 on `feat/137-m5-03-admin-write-model`; verify with `pnpm --filter @sevendays/admin list react react-dom @tanstack/react-start @tanstack/react-query @tanstack/react-router tailwindcss lucide-react zod --depth 0` at Step 0; anything else resolves → STOP and report):** react `19.2.8`, react-dom `19.2.8`, `@tanstack/react-start` `1.168.58`, `@tanstack/react-query` `5.102.8`, `@tanstack/react-router` `1.170.39`, `@tanstack/react-router-ssr-query` `1.167.2`, tailwindcss `4.3.3`, lucide-react `1.37.0`, zod `4.5.1`, `@base-ui/react` `1.8.x` (via `@sevendays/ui`), better-auth `1.7.5`, typescript `6.0.3`, node `v26.7.0`. NEW deps (exact, prototype-locked): `motion@13.4.2`, `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`. No shadcn pulls: every primitive the compositions use is on disk in `packages/ui/src/components/` — `alert-dialog badge button card checkbox collapsible dialog dropdown-menu field input label popover progress select separator sheet sidebar skeleton sonner table textarea tooltip` + `hooks/use-mobile` — verified by name against the component specs below.
- **Screenshot + smoke mechanics (WSL-pinned; #131-verified pattern AMENDED for the gate):** every admin surface this ticket frames sits behind the `_shell` session gate — the #131 frames worked because the prototype route was public, so the build captures them from a SIGNED-IN CDP session instead of `--screenshot`: ONE real Chrome on `--remote-debugging-port=9222` with a dedicated `--user-data-dir=<evidence>/chrome-profile`; sign in through the real `/login` once (manual or smoke step 1); frames are `Page.captureScreenshot` over that connection (`send` from the landing harness's `connect()` — `apps/landing/scripts/verify/lib.mjs`, imported by RELATIVE path from the evidence dir, read-only reuse, no landing file edits), written base64→PNG; mobile frames set the viewport first via `Emulation.setDeviceMetricsOverride` (375×812, mobile) and reset after. The headless-shell `--screenshot` pattern (`~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`, flags `--headless --disable-gpu --no-sandbox --screenshot=<file> --window-size=<W>,<H> --hide-scrollbars "<url>"` under `timeout 30`; GPU compositing and `--virtual-time-budget` hang against vite HMR on this host; dbus stderr noise expected) stays the tool for any PUBLIC URL (e.g. the login frame). Dev stack: `docker compose up -d db` + `pnpm --filter @sevendays/api dev` (:8787) + `pnpm --filter @sevendays/admin dev` (:3000 — verify free first; if vite increments, read the printed port and use it everywhere). Staff credentials: env `VERIFY_STAFF_EMAIL`/`VERIFY_STAFF_PASSWORD` on the operator machine; if unset, provision once via `pnpm --filter @sevendays/admin create-staff` (documented owner-CLI). Local presign needs the owner-minted R2 S3 tokens in `apps/api/.dev.vars` (#136: without them the Worker boots fine but presign fails loudly) — the smoke's cover leg is runIf-gated on a presign probe succeeding.
- **Scope fence (verbatim):** Tasks 1–8 edit only: `apps/admin/package.json` (deps, Task 1), `apps/admin/src/routes/__root.tsx` (MotionConfig wrap, Task 1), `packages/api-client/src/routes/admin.ts` (create), `packages/api-client/src/index.ts` (wire the `admin` group), `apps/admin/src/lib/admin.functions.ts` (create), `apps/admin/src/lib/cms-queries.ts` (create), `apps/admin/src/lib/package-editor-state.ts` (create), `apps/admin/src/lib/cover-upload.ts` (create), `apps/admin/src/components/cms/shared.tsx` (create), `apps/admin/src/components/packages/packages-table.tsx` (create), `apps/admin/src/components/packages/package-editor.tsx` (create), `apps/admin/src/routes/_shell.packages.tsx` (rewrite — StubScreen out), `apps/admin/src/routes/_shell.packages.new.tsx` (create), `apps/admin/src/routes/_shell.packages.$packageId.edit.tsx` (create), `apps/admin/src/routeTree.gen.ts` (regen). Task 8 rotates `docs/progress.md` (a What-Exists entry), and appends NOTHING to `docs/plan.md` (M5 checkbox 5 is shared with #140 — it stays unticked; #140 ticks it). NOT here: branches/studio-services/add-ons screens or their field forms, the bulk bar, any LightEntityEditor consumer (#140); gallery/testimonials/lookups screens, their wrappers beyond the two GET-only lists, gallery/testimonial/lookup entity types (#141); public reads/trim rules (#138); landing (#142); any test file, any test-script change, admin vitest setup, `cms-reflection.mjs` (#143); `packages/db`, `packages/types` source, `packages/ui` source (EXCEPTION — PD6, controller ruling 2026-09-26: `packages/ui/src/components/sonner.tsx` gains exactly one re-export line `export { toast } from 'sonner';` — the shadcn convention; `sonner` is already `packages/ui`'s dependency and the admin's `toast` consumers need a sanctioned path; the token flags are comments at usage sites); appointments/settings stubs (v2/M5.5); migrations. **Task-order note (PD6, same ruling): the two editor route FILES (`_shell.packages.new.tsx`, `_shell.packages.$packageId.edit.tsx`) may land as minimal stubs in Task 5 (the typed router's Links validate against the registered tree — this fence already lists them as in-ticket creates); Task 6 replaces the stub bodies with the editor.**

## File Structure

```text
packages/api-client/src/
  routes/admin.ts             # create (Task 2) — adminServicePackages/adminBranches/adminStudioServices/adminPrintSizes/adminAttires/adminMedia route groups over raw.api.v1.admin.*
  index.ts                    # modify (Task 2) — ApiClient grows `admin: ReturnType<typeof adminRoutes>`
apps/admin/
  package.json                # modify (Task 1) — motion + @dnd-kit trio (exact)
  src/
    routes/
      __root.tsx                          # modify (Task 1) — MotionConfig reducedMotion='user' around the app tree
      _shell.packages.tsx                 # rewrite (Task 5) — the real table page (StubScreen out)
      _shell.packages.new.tsx             # create (Task 6) — /packages/new, the editor in create mode
      _shell.packages.$packageId.edit.tsx # create (Task 6) — /packages/$packageId/edit
      routeTree.gen.ts                    # regen + commit (Tasks 5–6)
    lib/
      admin.functions.ts      # create (Task 2) — the session-scoped server fns (reads, package saves, presign)
      cms-queries.ts          # create (Task 2) — adminPackageQueries/adminBranchQueries/adminStudioServiceQueries/adminLookupQueries factories
      package-editor-state.ts # create (Task 3) — PURE seam (#143's test targets): state↔read, state→payload, validateEditorState, conflictFieldErrors
      cover-upload.ts         # create (Task 3) — presign → XHR PUT → status events loop (framework-free, callback-driven)
    components/
      cms/shared.tsx          # create (Task 4) — the pattern library ported from prototype-cms/shared.tsx
      packages/
        packages-table.tsx    # create (Task 5)
        package-editor.tsx    # create (Task 6)
```

---

### Task 1: Ordering gate, branch, dependencies, MotionConfig at the root

**Files:**
- Modify: `apps/admin/package.json` (the ONLY manifest change of the ticket), `pnpm-lock.yaml`
- Modify: `apps/admin/src/routes/__root.tsx` (MotionConfig wrap)

**Interfaces:**
- Produces: the branch environment; `motion/react` + `@dnd-kit/*` importable in `apps/admin`; `MotionConfig reducedMotion='user'` wrapping every route (Tasks 4–6's animations assume it — the `reducedMotion` OS preference must govern all popup/overlay motion).

**Not here:** any wrapper or screen (Tasks 2+); any `packages/ui` change; any shadcn pull (the 22 on-disk primitives cover every composition — do not run `shadcn add`).

- [ ] **Step 0: Verify the ordering dependency (#137 merged to main)**

```bash
git fetch origin
git show origin/main:apps/api/src/routes/admin-service-packages.ts >/dev/null && echo ROUTES-PRESENT || echo MISSING
git show origin/main:apps/api/src/routes/admin-studio-services.ts >/dev/null && echo ROUTES-PRESENT || echo MISSING
git show origin/main:docs/superpowers/plans/2026-09-26-137-m5-03-admin-write-model.md >/dev/null && echo PLAN-PRESENT || echo MISSING
```

Expected: all three `PRESENT` lines. Then cut the branch and bring it up:

```bash
git switch main && git pull origin main
git switch -c feat/139-m5-05-admin-screens-core
git add docs/superpowers/plans/2026-09-26-139-m5-05-admin-screens-core.md
git commit -m "docs: #139 implementation plan"
pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build
docker compose up -d db && pnpm --filter @sevendays/api test
```

Expected: api suite **23 files / 262 passed + 3 skipped** (the post-#137 floor). `pnpm --filter @sevendays/admin list react @tanstack/react-start tailwindcss --depth 0` → the pinned versions. **Anything missing or any count off → STOP and report** (ordering dependency violated; do not re-create #137's work).

- [ ] **Step 1: The dependencies — one manifest change, versions exact**

```bash
pnpm --filter @sevendays/admin add motion@13.4.2 @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2
```

Expected: lockfile resolves `motion 13.4.2` exactly (the spec pins it; `@dnd-kit/*` at the prototype-locked versions). Diff check: `apps/admin/package.json` gains exactly these four `dependencies` lines and NOTHING else moves.

- [ ] **Step 2: MotionConfig at the app root**

In `apps/admin/src/routes/__root.tsx`: add `import { MotionConfig } from 'motion/react';` and wrap the app tree inside `RootDocument`'s body so every route (login included — the confirm animates there nowhere, but the wrap is app-wide by ruling):

```tsx
<PostHogProvider>
  <MotionConfig reducedMotion='user'>
    {children}
    <Toaster />
  </MotionConfig>
  <TanStackDevtools …as-is… />
  <Scripts />
</PostHogProvider>
```

(Devtools and `Scripts` stay outside the wrap — only the app tree animates.) One appended comment line above the wrap:

```tsx
// The #131 popup ruling: every popup/overlay animation runs on the Motion
// channel with the OS reduced-motion preference honored app-wide.
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin fix
git add apps/admin/package.json pnpm-lock.yaml apps/admin/src/routes/__root.tsx
git commit -m "feat(admin): #139 deps — motion 13.4.2 + @dnd-kit (exact) + MotionConfig at the root"
```

Expected: typecheck green; only the three files staged.

---

### Task 2: The api-client admin wrappers + the admin server-function seam + query factories

**Files:**
- Create: `packages/api-client/src/routes/admin.ts`
- Modify: `packages/api-client/src/index.ts` (the `admin` group on `ApiClient`)
- Create: `apps/admin/src/lib/admin.functions.ts`
- Create: `apps/admin/src/lib/cms-queries.ts`

**Interfaces:**
- Consumes: #137's admin subtree through the built `AppType` (`raw.api.v1.admin.*`); `unwrap()`; the read-shape schemas from `@sevendays/types`: `servicePackageReadSchema` (→ `ServicePackageRead`), `branchSchema` (→ `Branch`), `studioServiceWithBranchesSchema` (→ `StudioServiceWithBranches`, carrying `bookableBranchIds` + `applicableAddonServiceIds`), `printSizeSchema` (→ `PrintSize`), `attireSchema` (→ `Attire`), `mediaPresignResponseSchema` (→ `MediaPresignResponse`); the payload schemas `createServicePackageSchema` / `updateServicePackageSchema` / `mediaPresignRequestSchema`.
- Produces: `ApiClient.admin` = `{ servicePackages, branches, studioServices, printSizes, attires, media }` — each a thin group over the RPC client, every response through `unwrap()`, request args inferred via `InferRequestType` (never hand-typed). The admin server fns (`admin.functions.ts`) and the query factories (`cms-queries.ts`) are the ONLY consumers in `apps/admin`.
- Exact wrapper surface (pinned; #140/#141 extend `admin.ts` later, they do not edit these):
  - `adminServicePackages(raw)`: `list(): Promise<ServicePackageRead[]>` · `byId(args): Promise<ServicePackageRead>` · `create(json: CreateServicePackageInput): Promise<ServicePackageRead>` · `update(args: { param: { id }; json: UpdateServicePackageInput }): Promise<ServicePackageRead>`
  - `adminBranches(raw)`: `list(): Promise<Branch[]>` · `byId(args): Promise<Branch>` · `create(json: CreateBranchInput): Promise<Branch>` · `update(args): Promise<Branch>` (list + byId are the only calls this ticket's screens make; create/update ride along for #140 per the controller ruling)
  - `adminStudioServices(raw)`: `list(): Promise<StudioServiceWithBranches[]>` · `byId(args)` · `create` · `update` · `setBranchMatrix(args: { param: { id }; json: StudioServiceBranchMatrixInput }): Promise<StudioServiceWithBranches>` (same ride-along posture)
  - `adminPrintSizes(raw)`: `list(): Promise<PrintSize[]>` — GET-only (agent ruling AQ-2: the package editor consumes the lookup vocabulary incl. deactivated rows; the lookups SCREEN + its CRUD wrappers are #141's)
  - `adminAttires(raw)`: `list(): Promise<Attire[]>` — GET-only, same ruling
  - `adminMedia(raw)`: `presign(json: MediaPresignRequest): Promise<MediaPresignResponse>` (POST — ticket 02's route, typed over `raw.api.v1.admin.media.presign.$post`)
- Server fns (each `createServerFn` + `startSpan({ name: '<VERB> /api/v1/admin/…' })`; reads GET, writes POST with a `.validator`; every one resolves the session-scoped client INSIDE the handler via `getSessionScopedApiClient(getRequestHeaders().get('cookie'))`):
  - Reads (throw on failure — query error state carries the message): `fetchAdminPackages()`, `fetchAdminBranches()`, `fetchAdminStudioServices()`, `fetchAdminPrintSizes()`, `fetchAdminAttires()` (no args), and `fetchAdminPackage` — arg-carrying GET: `.validator(z.object({ id: z.uuid() }))`, called as `fetchAdminPackage({ data: { id } })`
  - Writes (RESULT VALUES, never throw — details must survive the serialization boundary): `presignAdminCoverUpload(json: MediaPresignRequest)` and `saveAdminPackageCreate(json: CreateServicePackageInput)` and `saveAdminPackageUpdate(json: { id: string; payload: UpdateServicePackageInput })`, each returning `{ ok: true; data: T } | { ok: false; status: number; message: string; details?: unknown }` — the handler try/catches the wrapper's `ApiClientError` and narrows (`status`, `error.details` carried through verbatim)
- Query factories (`cms-queries.ts`, the `branchQueries` shape): `adminPackageQueries = { all: () => queryOptions({ queryKey: ['admin', 'service-packages'], queryFn: fetchAdminPackages }), byId: (id: string) => queryOptions({ queryKey: ['admin', 'service-packages', id], queryFn: () => fetchAdminPackage({ data: { id } }) }) }`; `adminBranchQueries.all()` (key `['admin', 'branches']`); `adminStudioServiceQueries.all()`; `adminLookupQueries = { printSizes: …, attires: … }` (keys `['admin', 'print-sizes']` / `['admin', 'attires']`).

**Not here:** any gallery/testimonial/category/lookup CRUD wrapper (#141); any UI; any test file (the api-client suite must stay green UNCHANGED — its 4 files/counts move in Task 8's reconciliation only if this task broke something, which is a fix-there signal).

- [ ] **Step 1: Write `packages/api-client/src/routes/admin.ts`**

Model each group EXACTLY on `packages/api-client/src/routes/service-packages.ts` (the house pattern: `InferRequestType` over the indexed endpoint type, `unwrap(res, schema)` per call, one-line JSDoc per method naming the route). File header comment (verbatim):

```ts
/**
 * Admin wrappers (M5 #139, ADR-0006): the gated /api/v1/admin subtree's
 * client surface. Every response passes unwrap() — a shape drift from the
 * API fails loudly here. Grows with the CMS tickets (#140 matrices riders,
 * #141 gallery/testimonials/lookups).
 */
```

Type-flow law (pinned): paths ride `raw.api.v1.admin['service-packages']` (etc.) so a route rename in the API breaks THIS file's compile — the drift-kill. The matrices PUT is `raw.api.v1.admin['studio-services'][':id']['branches'].$put(args)`. Schema imports come from `@sevendays/types`; no schema redefined locally.

- [ ] **Step 2: Wire the group into `ApiClient`**

`packages/api-client/src/index.ts`: import `adminRoutes` from `./routes/admin.js`, add `admin: ReturnType<typeof adminRoutes>;` to the `ApiClient` interface, `admin: adminRoutes(raw),` to the factory return, and export the admin arg types the app needs: `export type { CreateServicePackageArgs, UpdateServicePackageArgs, PresignArgs } from './routes/admin.js';` (define those aliases in `admin.ts` via `InferRequestType`, matching the `CreateAppointmentArgs` precedent). The existing keys/exports move NOWHERE (the M4 callers — `api.functions.ts`, `auth.functions.ts` — keep compiling untouched).

- [ ] **Step 3: Write the server-fn seam + query factories**

`apps/admin/src/lib/admin.functions.ts` — header comment (verbatim):

```ts
// The admin CMS server functions (M5 #139): every /api/v1/admin call rides
// the M4 session-scoped client seam (ADR-0004/0016) — the cookie is read
// from the INCOMING request server-side and forwarded as Bearer over the
// service binding; the browser never holds the token. Mutations return
// result values (never throw) so the API's field-level error details
// survive the server-fn serialization boundary — the editor maps them to
// per-field errors via lib/package-editor-state.ts.
```

Per-fn shape (reads; the POST fns add `{ method: 'POST' }` + `.validator(<zod schema>)` and take `({ data })`):

```ts
export const fetchAdminPackages = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/service-packages' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.servicePackages.list();
  });
});
```

Validators use the shared schemas — never redefined: `.validator(createServicePackageSchema)` (create), `.validator(z.object({ id: z.uuid(), payload: updateServicePackageSchema }))` (update), `.validator(mediaPresignRequestSchema)` (presign). Write-fn failure narrowing (every write fn carries exactly this shape):

```ts
try {
  return { ok: true, data: await client.admin.servicePackages.create(data) };
} catch (error) {
  if (error instanceof ApiClientError) {
    return { ok: false, status: error.status, message: error.message, details: error.details };
  }
  throw error; // not an API failure (serialization, session loss) — loud
}
```

`apps/admin/src/lib/cms-queries.ts` — the factories pinned above, importing the fns from `./admin.functions`.

- [ ] **Step 4: The type-flow gate + commit**

```bash
pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/api-client typecheck && pnpm --filter @sevendays/api-client test
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/api-client fix
git add packages/api-client/src/routes/admin.ts packages/api-client/src/index.ts apps/admin/src/lib/admin.functions.ts apps/admin/src/lib/cms-queries.ts
git commit -m "feat(api-client,admin): #139 admin wrappers + session-scoped server fns + cms query factories"
```

Expected: client typecheck + suite green (counts unchanged from the Step 0 floor), admin typecheck green (nothing consumes the new modules yet — compilation is the proof the types flow).

---

### Task 3: The pure editor-state seam + the cover-upload loop

**Files:**
- Create: `apps/admin/src/lib/package-editor-state.ts`
- Create: `apps/admin/src/lib/cover-upload.ts`

**Interfaces:**
- Consumes: `ServicePackageRead`, `CreateServicePackageInput`, `UpdateServicePackageInput`, `PrintSize`, `Attire` (types); the schema's semantics (`superRefine` rules — frame tokens unique, framed_picture ⇒ known token, other kinds ⇒ no frameId, picture kinds need ≥ 1 attire, privilege description min-1).
- Produces (the seams #143's lib-seam suite targets — pure, DOM-free, framework-free; JSDoc each export with `#143 seam:` so the suite finds them):
  - `interface PackageEditorState { name: string; description: string; priceCents: number; durationInput: string; isFeatured: boolean; isActive: boolean; slug: string; coverImageUrl: string | null; coverImageKey: string | null | undefined; frames: { token: string }[]; inclusions: EditorInclusion[] }` where `EditorInclusion = { key: string; kind: PackageInclusionKind; quantityInput: string; printSizeId: string | null; frameToken: string | null; attireIds: string[]; description: string }` — `key` is a client-only React key (existing rows: their inclusion uuid; new rows: crypto.randomUUID()); `quantityInput`/`durationInput` are raw input strings (the empty-string-is-null mapping lives in the builders, so a cleared field never becomes a silent 0); `coverImageKey: undefined` = unchanged (absent from the PUT), `null` = clear, string = fresh staging key to bind.
  - `editorStateFromRead(read: ServicePackageRead): PackageEditorState` — frames echo their uuids as tokens (in frames array order); framed_picture inclusions map `frameId` (the resolved uuid) to `frameToken`; `quantityInput = String(quantity)`; `durationInput = durationMinutes == null ? '' : String(durationMinutes)`; `coverImageKey: undefined`; `coverImageUrl` from the read.
  - `newEditorState(): PackageEditorState` — create mode: empty strings, `priceCents: 0`, `isActive: true`, `coverImageKey: undefined`, no frames/inclusions.
  - `buildCreatePayload(state): CreateServicePackageInput` — `quantity: quantityInput === '' ? null : Number(quantityInput)`, `durationMinutes` likewise; `frames` map to `{ id: token }` in ARRAY ORDER; `inclusions` in ARRAY ORDER with `frameId: frameToken` for framed_picture and `frameId: undefined` (absent) otherwise; `attireIds` in the lookups' array order filtered to membership — **the callers pass the lookups in, and the builders pin attireIds to that order** (junction positions become deterministic — the server renumbers from array order); `coverImageKey` included ONLY when `typeof state.coverImageKey === 'string'`.
  - `buildUpdatePayload(state): UpdateServicePackageInput` — the same mapping plus `slug: state.slug` and the three-state cover encoding (`undefined` = property ABSENT from the object, `null` = explicit clear, string = bind).
  - `buildRowFlipPayload(row: ServicePackageRead, isActive: boolean): UpdateServicePackageInput` — the table's deactivate/reactivate: the READ re-shaped back into the update payload with ONLY `isActive` flipped (frames echo uuids, inclusions map their resolved `printSize.id`/`attires[].id` back to ids in resolved order, `coverImageKey` ABSENT — the cover is untouched by a flip; `slug` from the read). The absence of a key is what makes the flip never re-verify or clobber media — pin that in the JSDoc.
  - `validateEditorState(state): EditorFieldErrors` where `EditorFieldErrors = { name?: string; description?: string; price?: string; inclusions: Record<string, InclusionFieldErrors> }` and `InclusionFieldErrors = { quantity?: string; printSizeId?: string; attires?: string; description?: string }` — mirrors the schema's rules in client order: name/description min-1; a parseable price ≥ 0; every framed_picture/print needs ≥ 1 attireIds (`attires: 'Pick at least one attire.'`); every framed_picture needs a frameToken (`frameToken` failures surface at the frame, message `framed pictures need a frame`); privileges need a non-empty trimmed description (`description: 'Privileges need a description.'`); quantity, when present, parses to a positive integer. Empty errors object = valid.
  - `conflictFieldErrors(details: unknown): Record<string, string>` — defensively narrows the API's `details` (`Array<{ path: string[]; message: string }>`, the `AdminDetail` shape from #137's `admin-shared.ts`) into a flat `Record<firstPathSegment, message>`; anything non-conforming returns `{}` (the caller toasts the message instead). `#143 seam: conflicts → field-error mapping`.
  - `PESO_HELPER = 'Stored as centavos.'`, `DURATION_HELPER = 'Optional'` — the owner-ratified helper strings as named constants so the components never re-inline copy.
- `lib/cover-upload.ts` (framework-free, callback-driven — #143's presign→upload→bind seam):
  - `export type CoverUploadStatus = { phase: 'idle' } | { phase: 'presigning' } | { phase: 'uploading'; sent: number; total: number } | { phase: 'bound'; stagingKey: string; previewUrl: string } | { phase: 'failed'; message: string }`
  - `export async function uploadCover(file: File, presign: (req: MediaPresignRequest) => Promise<MediaPresignResponse>, onStatus: (status: CoverUploadStatus) => void): Promise<void>` — the loop: (1) client pre-checks BEFORE any network call: `file.type !== 'image/jpeg'` → `failed('Only JPG files are supported.')`; `file.size > 50 * 1024 * 1024` → `failed('That file is over the 50 MiB cap.')` (the commit re-verifies server-side — #136's contract; the client check is courtesy, never trusted); (2) `presigning` → `presign({ purpose: 'package-cover', contentType: 'image/jpeg' })`; (3) `uploading` — XHR PUT to `uploadUrl` with `Content-Type: image/jpeg` and upload-progress events mapped to `{ sent, total }` (fetch has no upload progress — the spec's XHR ruling); non-2xx → `failed('Upload failed: ' + status)`; (4) `bound` with `stagingKey = key` and `previewUrl = URL.createObjectURL(file)`.

**Not here:** any React component (Tasks 4–6); any test file (#143 seats the suite — these exports are structured FOR it, per the JSDoc seam notes); any call to the wrappers (the fns take the presign function as a parameter — the component wires `presignAdminCoverUpload` in).

- [ ] **Step 1: Write `package-editor-state.ts`**

Implement the exact surface above. The file opens with (verbatim):

```ts
// The package editor's pure seam (M5 #139): editor state ↔ the atomic save
// payload. Everything here is a plain function over plain data — no React,
// no network — so #143's lib-seam suite can pin state → payload (frames/
// inclusions ordering), validation, and conflict → field-error mapping
// without rendering a component. Array order IS position: frames[] and
// inclusions[] serialize in array order and the server renumbers from it
// (#137); the editor's job is to keep displayed order = array order.
```

Mapping rules pinned (each as its own small function, composed by the builders): `quantityFromInput(input: string): number | null`; `durationFromInput(input: string): number | null` (empty/`NaN`/`<= 0` → null for duration, but quantity keeps `null` only for empty — a `0`/`NaN` quantity is a validation error, not a silent null: the schema wants positive-int-or-null); `tokenFor(existing: string | null): string` (null → `crypto.randomUUID()`).

- [ ] **Step 2: Write `cover-upload.ts`**

Implement the loop above with a real `XMLHttpRequest` (wrapped in a `Promise`, `upload.onprogress` → `onStatus`, `load`/`error`/`abort` → resolve/reject the phase machine). Object URLs are revoked by the CALLER (the editor revokes on replace/unmount — pin in the JSDoc). Header comment (verbatim):

```ts
// The cover upload loop (M5 #139, ADR-0019): presign (server-side, through
// the admin server fn) → browser-direct XHR PUT to the presigned URL (the
// one by-design browser call; the bucket CORS lists the admin origins) →
// the staging key rides the NEXT atomic package save, whose commit is the
// real verify/promote gate (#136/#137). Framework-free on purpose: #143's
// lib-seam suite drives this loop with a fake presign + a stubbed XHR.
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin fix
git add apps/admin/src/lib/package-editor-state.ts apps/admin/src/lib/cover-upload.ts
git commit -m "feat(admin): #139 editor-state seam + cover-upload loop (pure, #143-ready)"
```

Expected: typecheck green (no consumers yet — the exports compile standalone).

---

### Task 4: The shared CMS pattern library (`components/cms/shared.tsx`)

**Files:**
- Create: `apps/admin/src/components/cms/shared.tsx`

**Interfaces:**
- Consumes: `@sevendays/ui` (`alert-dialog`, `badge`, `button`, `dialog`, `sheet`, `table`, `tooltip` primitives), `useIsMobile` (`@sevendays/ui/hooks/use-mobile`), `cn` (`cn` package), `motion/react` (`AnimatePresence`, `motion`), lucide (`ChevronDown`, `Power`, `PowerOff`).
- Produces (the library Tasks 5–6 and #140/#141 consume — exact export list; ALL ported from `prototype/131-admin-cms-compositions:apps/admin/src/components/prototype-cms/shared.tsx` with the pinned deltas; read the source with `git show prototype/131-admin-cms-compositions:apps/admin/src/components/prototype-cms/shared.tsx` before writing — the round 1–9 amendment digests live in its header and JSDoc and are the implementation law):
  - `peso(cents: number): string` — verbatim port.
  - `PageHeader({ title, subline?, actions? })` — verbatim port (one h1 per screen, `text-2xl font-semibold tracking-tight`; muted subline; right-aligned actions slot).
  - `StatusBadge({ isActive })` — ported (dot + `sr-only` text) WITH the `TODO(token-ruling)` comment pinned in Global Constraints.
  - `EmptyState({ line, children? })` — ported (dashed-border card, centered muted line, optional action slot).
  - `Collapse({ open, children })` — verbatim port (the `grid-rows-[0fr↔1fr]` transition — the animated expand/close mechanism).
  - `ExpandRow` / `ExpandPanel({ open, colSpan, children })` — verbatim ports (the A2 border enclosure; `ComponentProps<typeof TableRow>` passthrough so ref/style/onClick flow).
  - `ActionTooltip({ label, button })` — verbatim port (tooltip content IS the aria-label text).
  - `RowIconActions({ edit, isActive, onDeactivate, onReactivate })` — ported with the `TODO(token-ruling)` comment at the green reactivate tint.
  - `RowActionsCluster({ edit, isActive, onDeactivate, onReactivate, onToggle?, expanded? })` — verbatim port (hover/focus-within reveal; chevron last, always visible, rotates).
  - `DeactivateConfirm({ name, open, onOpenChange, onConfirm })` — verbatim port of the round-9 component: the visible-latch + `AnimatePresence onExitComplete` + `AlertDialogPortal keepMounted` + motion overlay (round 9's flash fix) + motion content (desktop scale 0.95 / mobile translateY(100%)); the pinned confirm copy; `AlertDialogAction variant='destructive'`. The `className` dock string ports verbatim (max-sm bottom dock + sm re-center).
  - `LightEntityEditor({ title, description, open, onOpenChange, onSave, saveLabel?, children })` — PORTED WITH DELTAS (the prototype's `chrome` prop dies — V1 ruled Sheet everywhere; the prototype's footer no-ops become real callbacks; the prototype caption becomes the required `description` prop): `SheetContent` with `side={isMobile ? 'bottom' : 'right'}`, the motion render-prop variants (desktop `translateX(100%)↔0`, mobile `translateY(100%)↔0`, opacity alongside, 300ms ease-out), `className={cn('max-md:max-h-[85dvh]', isMobile && 'rounded-t-xl')}`; header (title + description) / `flex-1 space-y-5 overflow-y-auto px-6 pb-6` body / footer (Cancel outline + `saveLabel ?? 'Save changes'` primary calling `onSave`); the visible-latch + `onExitComplete` discipline identical to the confirm. No first consumer in this ticket — #140's screens consume it; the export + the Task 7 smoke keep it honest.
  - The file carries NO prototype-branch comment history; it opens with (verbatim):

```tsx
// The shared CMS pattern library (M5 #139): the compositions every admin
// screen consumes, ruled by #131 and ported from the composition of record
// (branch prototype/131-admin-cms-compositions, rounds 1–9). Copy is pinned
// by the ticket plan's Global Constraints — transcribe, never re-draft.
// Token flags: the status palette + radius step-down are flagged TODO at
// their use sites pending the owner's design-system ruling — never promote
// them into packages/ui silently.
```

**Not here:** any packages-specific composition (Tasks 5–6); any consumer; any `packages/ui` edit; any dialog-chrome variant of the editor (V1 ruled Sheet).

- [ ] **Step 1: Port the library**

Load the skill set FIRST (Global Constraints): `prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling`. Read the prototype source, then write `shared.tsx` with the exact export list and deltas above. Where the prototype's inline comments carry load-bearing mechanics (the close-latch rationale, the overlay-flash probe, the 640–768px band note), carry a CONDENSED version of the comment at the component (the mechanics are the maintenance law; the round-by-round history stays on the prototype branch).

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin fix
git add apps/admin/src/components/cms/shared.tsx
git commit -m "feat(admin): #139 shared CMS pattern library — Motion popups, expand tables, Sheet shell (from #131)"
```

---

### Task 5: The packages table screen

**Files:**
- Create: `apps/admin/src/components/packages/packages-table.tsx`
- Rewrite: `apps/admin/src/routes/_shell.packages.tsx` (StubScreen out)
- Regen + commit: `apps/admin/src/routeTree.gen.ts` (no route shape change — no new file route here; commit only if the regen moved it)

**Interfaces:**
- Consumes: `adminPackageQueries.all()`, `buildRowFlipPayload` (Task 3), the pattern library (Task 4), `useQuery`/`useMutation`/`useQueryClient`/`toast`.
- Produces: `PackagesTable` — the consolidated-format table over live `ServicePackageRead[]`; the route renders `PageHeader` + the table + the `DeactivateConfirm` wiring.
- Composition spec (structure pinned; micro-layout to the loaded skills):
  - Columns: **Cover** (`w-14`: a live `coverImageUrl` renders `img h-[30px] w-10 rounded-md object-cover alt=''`; null renders the `bg-muted` + `Image`-icon block — the placeholder the landing also renders until #142's CoverPanel) · **Name** (identity cell: dot-leads line — `StatusBadge`, truncated name with `ActionTooltip` full text, `Featured` primary badge when `isFeatured`; line 2 = truncated description `pl-4.5`, hidden while expanded) · **Price** (right, `tabular-nums`, `peso(priceCents)`) · **Actions** (empty header; the cluster). SLUG RENDERS NOWHERE (P2 ruling).
  - Whole-row click toggles the animated expand (deduplicated: truncated line hides, the `ExpandPanel` reveal carries the full description); actions cell stops propagation; the chevron is the keyboard toggle.
  - Edit = `SquarePen` ghost icon rendering `render={<Link to='/packages/$packageId/edit' params={{ packageId: row.id }} />}` (the prototype's `text-foreground!` normalization ports — the global `a { color: var(--brand-700) }` rule paints anchor-rendered buttons brand).
  - Deactivate: opens `DeactivateConfirm` for that row; `onConfirm` fires `useMutation` calling `saveAdminPackageUpdate({ data: { id: row.id, payload: buildRowFlipPayload(row, false) } })` — optimistic: `onMutate` cancels the list query, snapshots `['admin','service-packages']`, patches the row's `isActive` locally; `onError` rolls back + `toast.error`; `onSettled` invalidates. Reactivate: direct, no confirm, same mutation with `true`.
  - The `Card` wrapping the table carries `@container rounded-lg` + the `TODO(token-ruling)` radius comment; the stacked mobile list ports the prototype verbatim (two-line header button, `Collapse` reveal with full description + Featured badge + `RowIconActions`).
  - Empty state: `No packages yet.` + a `New package` action linking `/packages/new`. Pending state: skeleton rows (`Skeleton` primitive) — the skills style them within the fence.
  - Route: `_shell.packages.tsx` keeps the gate context + `head` title `Packages | Sevendays Admin`, renders `PageHeader` (title/subline/actions = `New package` → `Link to='/packages/new'`) + `PackagesTable`. The prototype's honesty caption line does NOT port.
- Data notes: `ServicePackageRead` carries `frames` + resolved `inclusions` — the table ignores them (the editor's concern); `durationMinutes` renders nowhere in the table (no ruled slot; the editor owns it).

**Not here:** the editor routes (Task 6); branch/service/add-on tables (#140); any bulk bar (checkbox column — #140); any pagination/sort/filter (no ruling asks for them; #140's bulk ruling may revisit).

- [ ] **Step 1: Write `packages-table.tsx`**

Port the prototype's `screens/packages.tsx` structure onto the live read shape: the local `useState(packages)` fixture row becomes the `useQuery(adminPackageQueries.all())` + optimistic-mutation wiring; `setActive` becomes the `buildRowFlipPayload` mutation; the Edit `Link` retargets from the prototype search-param to the real route. Keep the render tree element-for-element where the prototype is pinned (identity cell anatomy, actions cluster, expand pair, mobile list) — this IS the AC-4 table ruling.

- [ ] **Step 2: Rewrite the route + regen + verify**

```bash
pnpm --filter @sevendays/admin generate-routes
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin build
```

Expected: typecheck + build green. Boot the stack for a render smoke (compose db + api dev + admin dev; sign in with the operator creds):

```bash
curl -s http://localhost:3000/packages | grep -o 'Packages' | head -1
```

Expected: matches (SSR renders through the gate — unauthenticated curl gets the /login redirect instead, which is ALSO a valid proof; run it signed-in from the browser in Task 7 regardless). Then:

```bash
pnpm --filter @sevendays/admin fix
git add apps/admin/src/components/packages/packages-table.tsx apps/admin/src/routes/_shell.packages.tsx apps/admin/src/routeTree.gen.ts
git commit -m "feat(admin): #139 packages table — consolidated format, optimistic flips, mobile stack"
```

---

### Task 6: The package editor — create + edit routes

**Files:**
- Create: `apps/admin/src/components/packages/package-editor.tsx`
- Create: `apps/admin/src/routes/_shell.packages.new.tsx`
- Create: `apps/admin/src/routes/_shell.packages.$packageId.edit.tsx`
- Regen + commit: `apps/admin/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: everything prior — `editorStateFromRead`/`newEditorState`/`buildCreatePayload`/`buildUpdatePayload`/`validateEditorState`/`conflictFieldErrors` (Task 3), `uploadCover` + the `CoverUploadStatus` state it drives via `onStatus`, wired to `presignAdminCoverUpload` (Tasks 2–3), the pattern library (Task 4), `adminPackageQueries.byId`, `adminLookupQueries` (Task 2), `@dnd-kit` (Task 1).
- Produces: `PackageEditor({ mode: 'create' | 'edit', packageId? })` — the full editor over live data; two routes mounting it (`/packages/new` create; `/packages/$packageId/edit` edit, param validated as uuid by the route's `params` typing — the loader/useQuery id).
- Composition spec (the #131 per-screen ruling + the prototype's `package-editor.tsx`, ported onto live data; deltas where the prototype simulated):
  - **Header:** `← Back to packages` (Link to `/packages`) · h1 = the package name (edit) / `New package` (create — AQ-6's variant) · `StatusBadge` (edit only) · right: primary `Save changes` (+ the save-gate posture below). No prototype honesty caption.
  - **Layout:** the prototype's `grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)]` — left card column, Separator (horizontal stacked / vertical xl), the inclusions area. Every Card carries `rounded-lg` + the radius `TODO(token-ruling)` comment.
  - **Core card:** Name · Description (`Textarea rows={3}`) · Price (`₱` adornment, `type='number'`, `tabular-nums`, value `priceCents/100`, change → `Math.round(n*100)`, helper `Stored as centavos.`) · Duration (minutes) (`number`, empty-null, helper `Optional`) · Featured + Active checkboxes (the `flex flex-wrap gap-6` label pair). All `Field`/`FieldLabel`/`FieldDescription` per the prototype.
  - **Cover card (the Task 3 loop, wired):** `aspect-[3/2]` preview — precedence: fresh `uploadStatus.phase === 'bound'` shows the local `previewUrl`; else `coverImageUrl` shows the img; else the `bg-muted` + `Image` placeholder (verbatim posture). Below: `Upload cover` (outline, hidden `<input type='file' accept='image/jpeg'>`) + `Remove cover` (ghost) + the status line (`uploadCoverStatus` rendered as the agent-authored texts; per-file status for the ONE-file leg — the AC-3 wording) + `JPG only, up to 50 MiB.` The status line and captions are NEW compositions → Task 7 variant frames. `Remove cover` sets `coverImageKey: null` (clears on save); re-upload replaces the key; unmount/replace revokes object URLs (the Task 3 JSDoc contract). The PREVIEW reflects state, never commits — binding happens only through the atomic save (the commit is the verify gate).
  - **Advanced card:** the `Collapsible` (trigger `Advanced` + chevron) rendering the slug `Field` (label `Slug`, warning `Changing the slug breaks links that point here.`) — EDIT MODE ONLY; create mode renders NO Advanced card (the server generates the slug at create — AQ-6). Collapsed by default.
  - **Inclusions area:** `Inclusions` h2; the three `bg-card` section groups (`rounded-lg border bg-card p-4`): **Frames** (per-frame sub-groups `bg-muted/20 rounded-lg border p-3` with the mono `Frame N` outline badge — N = index+1, never an input; empty group renders `No framed pictures in this frame yet.` with the `TODO(owner-copy)` comment; `Add frame` appends `{ token: crypto.randomUUID() }`), **Prints · N** + `Add print`, **Privileges · N** + `Add privilege`. Inserts go WITHIN their section's block of the underlying array (the prototype's contiguous-section discipline — displayed order MUST equal array order).
  - **Row anatomy** (`InclusionEditorRow`, ported): grip (handle-only dnd) · kind icon (`Frame`/`Image`/`Gift`) · quantity input `w-16` (framed+print; hidden for privileges) · print-size `Select` `w-24` (print rows; options = ACTIVE sizes only, the explicit `SelectValue` render resolves ANY current value's label incl. deactivated — `printSizes.find(...)?.code ?? '—'`) · description `Input flex-1 min-w-40` (privileges carry text; pictures placeholder `Description (optional)`) · remove `X` · the four-attire chip row (`rounded-full border px-2 py-1 text-xs` label+Checkbox chips) on framed+print rows ONLY (privileges drop them — the T8-scoped ruling). Attire chips render the full vocabulary; a DEACTIVATED attire's chip renders `opacity-60` (AQ-4's variant). When the size vocabulary holds a deactivated row, a muted `text-xs` note renders under the Prints section header: `Deactivated sizes stay on existing packages but disappear from new pickers.` (`TODO(owner-copy)`, AQ-3).
  - **dnd:** per-section `DndContext` + `SortableContext` (`verticalListSortingStrategy`, `closestCenter`); sensors `PointerSensor { distance: 4 }` + `TouchSensor { delay: 300, tolerance: 8 }` + `KeyboardSensor(sortableKeyboardCoordinates)` (ONE `useSensors` set shared by the three contexts, built once); `reorderInclusions(matches, activeId, overId)` ported verbatim (identity-based, section-scoped); frame sub-groups scope their matches to `kind === 'framed_picture' && frameToken === frame.token`.
  - **Save gate:** `Save changes` runs `validateEditorState`; failures render inline (the row's offending input/chip row gets `border-destructive` + the error text as a muted destructive line; Core errors render under their Field) + `toast.error('Fix the highlighted fields.')`; a clean state builds the payload and fires the mutation. Server failure: `conflictFieldErrors(details)` maps 400s to the same inline slots (a `slug` conflict marks the slug Field even when collapsed — auto-expand the Advanced card in that case), else `toast.error(message)`.
  - **Save mutations (non-optimistic):** create → `saveAdminPackageCreate`; success → invalidate `adminPackageQueries.all` + toast `Saved.` + navigate to `/packages/$id/edit`. Edit → `saveAdminPackageUpdate({ data: { id, payload } })`; success → invalidate `all` + `byId(id)` + toast `Saved.` (stay on the route). `priceCents: 0` with an empty price input is the create default — validation demands a parseable ≥ 0 number, so an untouched create is caught by the name/description rules first (both min-1).
  - **Routes:** `_shell.packages.new.tsx` (`head`: `New package | Sevendays Admin`) and `_shell.packages.$packageId.edit.tsx` (`head`: `Edit package | Sevendays Admin`) both render inside the gated shell (the `_shell` gate covers them — no per-route beforeLoad).

**Not here:** matrices/branches/service editors (#140); privilege-chip additions (the ruling DROPS them); frame-number editing (renumber-on-save is the model); any old-slug redirect concern (#134 Out of Scope).

- [ ] **Step 1: Write `package-editor.tsx` + the two routes**

Port the prototype's editor structure onto the state seam: the prototype's `pkg` useState + inline helpers become `PackageEditorState` + the Task 3 builders; the fixture Select becomes the `adminLookupQueries.printSizes` vocabulary; the simulated upload becomes the `uploadCover` loop. Keep the pinned render anatomy above element-for-element. The editor loads BOTH lookups alongside the package (`useQuery` × 3 in edit; × 2 in create) and renders skeleton posture while pending (skills style it within the fence).

- [ ] **Step 2: Regen + gates + commit**

```bash
pnpm --filter @sevendays/admin generate-routes
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin build
pnpm --filter @sevendays/admin fix
git add apps/admin/src/components/packages/package-editor.tsx apps/admin/src/routes/_shell.packages.new.tsx "apps/admin/src/routes/_shell.packages.\$packageId.edit.tsx" apps/admin/src/routeTree.gen.ts
git commit -m "feat(admin): #139 the full package editor — Core/Cover/Advanced, dnd inclusions, cover loop, slug advanced"
```

Expected: typecheck + build green (the edit route's `params` infers `{ packageId: string }` through the file-route convention — if the routeTree regen lags the new file, run `generate-routes` again before diagnosing).

---

### Task 7: Evidence — rendered variants + the CDP smoke, recorded on the ticket

**Files:**
- Create (untracked evidence, gitignored): frames + `smoke.mjs` + `smoke-output.txt` under `/home/jeius/Projects/sevendays/.superpowers/sdd/2026-09-26-139-m5-05/`
- One comment on issue #139 (via `gh`) — the ticket's variant record.

**Interfaces:**
- Consumes: the finished screens (Tasks 5–6), the pinned screenshot + smoke mechanics, the dev stack, the operator's staff creds.
- Produces: AC-1's deliverable — rendered variants of every NEW composition recorded for the owner's morning reaction (the gate is the RECORDING, never the reaction — controller ruling), plus the AC-2 walk proven end-to-end on the real UI.

**Not here:** any code change driven by the owner's future verdicts (morning iterations are follow-up work); committing any evidence file (the dir is gitignored); building the durable `cms-reflection.mjs` harness (#143's — the smoke here is ticket evidence, uncommitted, superseded by #143).

- [ ] **Step 1: Boot the stack and capture the frame matrix**

Stack: `docker compose up -d db` + `pnpm --filter @sevendays/api dev` + `pnpm --filter @sevendays/admin dev` (:3000). Bring up the real Chrome on `:9222` with the dedicated user-data-dir (mechanics in Global Constraints), sign in through the real `/login` (operator creds — this session feeds EVERY frame; all gated pages), and capture each row below via `Page.captureScreenshot` (mobile rows: `Emulation.setDeviceMetricsOverride` 375×812 first, reset after). A `capture` helper (URL → override → navigate → settle (`wait(1500)`) → screenshot → write PNG) cribbed into `smoke.mjs` keeps this one function reused by Step 2's session:

| File | URL / action | Window | What it must show |
|---|---|---|---|
| `table-desktop.png` | `/packages` | 1440×900 | Live seeded catalog in the consolidated format; dot-under-identity; Featured badge; expanded row (click one) with full description |
| `table-mobile.png` | `/packages` | 375×812 | Stacked two-line rows; expanded reveal (description + badge + actions) |
| `confirm-desktop.png` | deactivate action open | 1440×900 | The confirm over the table, pinned copy |
| `confirm-mobile.png` | same | 375×812 | Bottom-sheet dock (`rounded-t-xl`) |
| `editor-create.png` | `/packages/new` | 1440×900 | NEW composition: empty editor, no Advanced card (AQ-6) |
| `editor-edit-desktop.png` | an existing package's edit | 1440×900 | Two-column; Core/Cover/Advanced; Frames/Prints/Privileges groups; chips; grips |
| `editor-edit-mobile.png` | same | 375×812 | Stacked layout; bottom-sheet-scale touch posture; grips reachable, no scroll fight |
| `editor-advanced.png` | Advanced expanded | 1440×900 | Slug + break-links warning (auto-expanded via the collapsed trigger click) |
| `cover-status.png` | mid-upload state | 1440×900 | Status line (with owner tokens: `Uploading… n%` → `Cover ready…`; without: `Upload failed: …` — the presign-failure frame is REQUIRED evidence either way) |
| `save-guards.png` | a privilege row with empty description + a print row with no attire, Save clicked | 1440×900 | NEW composition: inline destructive marks + toast |
| `deactivated-vocab.png` | a package whose vocab state renders both note + dimmed chip | 1440×900 | NEW compositions AQ-3 + AQ-4 (seed/live catalog has the inactive 8R size — drive a print row's Select to confirm its option is ABSENT while the note shows) |

Read every PNG back (`ls -la`; a ~5KB file is a blank frame — recapture that row).

The `deactivated-vocab.png` row needs a deactivated lookup to be honest — the seeded catalog's lookups are ALL ACTIVE (since #135's backfill), so stage the state through the admin API seam and REVERT after capture: sign in over HTTP (`POST http://localhost:3000/api/auth/sign-in/email` with `{ email, password }` — the operator creds; BetterAuth returns the token in the response body), `GET http://localhost:8787/api/v1/admin/print-sizes` (Bearer the token) → take `8R`'s id + fields → `PUT /api/v1/admin/print-sizes/:id` with the FULL object and `isActive: false` → capture the frame (the note renders; a print row's Select options lose `8R` while an existing reference would still label) → `PUT` it back with `isActive: true` (the revert is NOT optional — upsert-by-name seed tolerance does not extend to left-behind deactivations). This mutates only the seeded dev stack the verify harnesses already drive (#143's scratch-package precedent); the live Supabase catalog is never touched by the dev stack's evidence work.

- [ ] **Step 2: The CDP smoke (AC-2's walk)**

Write `smoke.mjs` in the evidence dir (imports `connect` from `../../../apps/landing/scripts/verify/lib.mjs` by relative path; creds from `process.env.VERIFY_STAFF_EMAIL`/`VERIFY_STAFF_PASSWORD` — never logged). Drive the UI with the booking harness's exact helpers cribbed from `apps/landing/scripts/verify/booking-e2e.mjs` (lines 67–78): `click(sel)` = `evaluate('…?.click()')`, `setInput(sel, value)` = the native-setter + bubbled `input`/`change` `Event` pattern (React-controlled inputs ignore plain value writes — that helper is the proven workaround). File inputs (the cover leg) ride the raw `send` channel: `DOM.getDocument` → `DOM.querySelector` (the hidden `input[type=file]`) → `DOM.setFileInputFiles({ files: [<abs path to a generated tiny JPEG>], nodeId })`. Steps, each state-asserted via `text()`/`evaluate`:

1. `go('/login')` → fill email/password → submit → assert the shell renders (`data-shell-main` present).
2. `go('/packages')` → assert the seeded catalog renders (a known seed name present; the table header posture present).
3. `go('/packages/new')` → fill Name (`smoke-<epoch>`), Description, Price (`123.45`) → `Add frame` → `Add print` (pick the first active size; toggle the first attire chip) → `Add privilege` (description `Smoke privilege`) → `Save changes` → assert the redirect to `/packages/<id>/edit` and the h1 = the name.
4. `go('/packages')` → assert the new row renders with `₱123.45` (`tabular-nums` cell text) → expand it (row click) → assert the full description in the reveal.
5. On the edit route: change Price to `150` → `Save changes` → `Saved.` toast → fresh `go` to the route → assert `₱150.00` (the round-trip through the atomic PUT).
6. Deactivate from the table (confirm open → `Deactivate`) → assert the dot flips to gray (`sr-only` text `Deactivated` present, row dimmed). Reactivate (direct) → assert green returns.
7. Cover leg (runIf): `fetch('<api>/api/v1/admin/media/presign', …)` unauthenticated 401 probe first for stack sanity; then attempt an upload via the file input with a tiny generated JPEG — if presign fails for lack of owner tokens, RECORD `presign-unavailable` in the output (the AC-3 status-line evidence is the failure frame from Step 1) and continue; if it succeeds, assert the `Cover ready` status, save, and assert the read's `coverImageUrl` present.

```bash
node .superpowers/sdd/2026-09-26-139-m5-05/smoke.mjs 2>&1 | tee .superpowers/sdd/2026-09-26-139-m5-05/smoke-output.txt
```

Expected: every step PASS (or the runIf cover leg recorded); the smoke leaves the scratch package DEACTIVATED (the UI has no delete — that is the point; the compose db keeps it).

- [ ] **Step 3: Record on the ticket (AC-1's gate)**

Post ONE comment on #139 (`gh issue comment 139 --body-file <tmp>`): the frame list (paths in the evidence dir), the smoke output summary, and the AGENT RULINGS enumerated for morning reaction — AQ-1 (editor = route, not Sheet), AQ-2 (the two GET-only lookup wrappers), AQ-3 (deactivated-sizes note placement), AQ-4 (dimmed deactivated-attire chips), AQ-5 (client-side save guards mirroring the schema + inline marking), AQ-6 (create-mode: no Advanced/slug card; `New package` h1), AQ-7 (agent-authored strings: cover captions/status texts, toasts, `New package` h1), AQ-8 (scratch smoke package left deactivated in compose), AQ-9 (api-client `admin` group shape). Verify the write (`gh api repos/jeius/sevendays/issues/139/comments --jq '.[-1].body' | head -5`).

---

### Task 8: Full gates, docs rotation, PR/merge, close

**Files:**
- Modify: `docs/progress.md` (one What-Exists entry)
- No `docs/plan.md` edit (M5 checkbox 5 stays unticked — shared with #140)

- [ ] **Step 1: The full gate**

```bash
pnpm check
```

Expected: **35/35 turbo tasks** green (no test files, no scripts — every suite count at the Step 0 floor; the api suite needs the compose db up). `git status --short` → only the fenced files + `docs/progress.md`. `pnpm fix` at the repo root if formatting moved anything.

- [ ] **Step 2: Docs rotation**

Append the What-Exists entry to `docs/progress.md` (house shape — dated one-liner + substance):

```
2026-09-26 — #139 M5 ticket 05, the admin catalog-core screens, landed: the shared CMS pattern library (components/cms/shared.tsx — the #131 rulings ported: Motion-for-React popups with the visible-latch + onExitComplete recipe and the round-9 overlay fix, MotionConfig reducedMotion at the root, @dnd-kit handle-only reorder with Pointer distance-4 + Touch 300ms-long-press + Keyboard sensors and section-scoped identity-based reorder, the consolidated table format with dot-under-identity + hover icon actions + animated expand + the ~700px container-query mobile stack, Sheet editors as mobile bottom sheets) and the packages surface — the table (Featured as an in-name badge, slug out, optimistic deactivate/reactivate through buildRowFlipPayload full-object PUTs) and the full editor (create + edit routes; Core/Cover/Advanced cards; Frames/Prints/Privileges bg-card groups with four-attire chips on framed/print rows only; cover upload through the #136 presign seam with client pre-checks + XHR progress + status line, the staging key riding the atomic save whose commit is the verify gate; slug behind the break-links warning, edit-only; conflict details mapped to inline field errors). New api-client admin wrappers (service packages, branches, studio services + branch matrix rider, GET-only print-size/attire lists, presign) + the admin.functions.ts session-scoped server-fn seam (mutations return result values so field details survive serialization). New deps: motion 13.4.2 + @dnd-kit (exact). Agent rulings AQ-1..9 + rendered variants recorded on #139 for the owner's morning reaction; the pure editor-state seam (lib/package-editor-state.ts) is structured as #143's first test targets. No tests added (admin suite seats in #143); check 35/35.
```

- [ ] **Step 3: graphify + PR + merge**

```bash
git add docs/progress.md
git commit -m "docs: #139 progress entry — admin catalog-core screens landed"
graphify update .
git push -u origin feat/139-m5-05-admin-screens-core
gh pr create --title "M5 ticket 05 — admin screens: shared CMS patterns + the packages surface (#139)" --body-file <tmp describing the eight tasks + gates + evidence pointers>
```

Merge squash per the repo flow (controller/owner merges — the executor opens the PR and records the v1 pick ONLY post-merge).

- [ ] **Step 4: The v1 pick + ledger + ticket close (post-merge)**

Per `docs/agents/v1-picks.md`: this PR is a predicted clean PICK (new files + the `__root.tsx` MotionConfig wrap and the `_shell.packages.tsx` rewrite are edition-neutral surfaces) — triage pick/skip/split, add the ledger row. Close #139 with the owner-handoff note (frames + AQ list + the morning-reaction pointer).

---

## Self-Review

- **Spec coverage:** every #139 body clause maps to a task — Sheet pattern + animation recipe (Tasks 4/6 smoke), dnd handle reorder with the sensor set (Tasks 3/6), Motion popup pattern incl. `MotionConfig` (Tasks 1/4), consolidated table format (Tasks 4/5), mobile bottom sheets + stacked rows (Tasks 4/5/6 + frames), packages table w/ Featured badge + slug-out (Task 5), the full editor w/ cards/groups/chips/dnd/slug-advanced (Task 6), cover upload through the ticket-02 seam w/ per-file status + the atomic PUT (Tasks 3/6 + smoke step 7), owner-copy + token flags (Global Constraints + render sites), rendered variants recorded (Task 7 = AC-1). The five ACs map: AC-1 → Task 7 Step 3; AC-2 → Tasks 5–6 + smoke steps 2–6; AC-3 → Task 3 + Task 6 cover card + smoke step 7 (runIf); AC-4 → Tasks 4–6 + mobile frames; AC-5 → per-task gates + Task 8.
- **Sibling fence:** #140 owns branches/matrices/add-ons/the bulk bar (the wrappers' create/update riders land HERE per the controller ruling, with zero screens consuming them this ticket — pinned per method); #141 owns gallery/testimonials/lookups screens + CRUD wrappers (the two GET-only lists are AQ-2, flagged); #138/#142/#143 untouched. `docs/plan.md` checkbox 5 stays unticked (shared with #140 — explicit in Task 8).
- **No placeholders:** every owner-visible string pinned verbatim (Global Constraints) or flagged agent-authored; every ported component names its `git show` source path; the wrapper/server-fn/pure-seam surfaces are pinned to exact names + types; the smoke's steps + assertions are enumerated; the only SKILL-delegated decisions (skeleton styling, micro-layout) are stated as the skills' contracted role.
- **Probe-literal discipline:** version pins probed on the working tree (Task 1 Step 0 re-verifies against post-#137 main and STOPS on drift); the presign contract, cap constants, schema rules, and read shapes were read from `packages/types` + `apps/api/src/services/media.ts` + `routes/admin-media.ts` at plan time, not paraphrased; the chrome-headless-shell mechanics are the #131-verified pattern with the documented fallback.
- **Cross-task names:** `PackageEditorState`/`EditorInclusion` (Task 3) match the editor's consumption (Task 6); `uploadCover`/`CoverUploadStatus` (Task 3) match the Cover card; the wrapper group names (Task 2) match the server fns' calls; `buildRowFlipPayload` (Task 3) is Task 5's mutation payload; the AQ numbering (Task 7 Step 3) is the same list the OPEN QUESTIONS report carries.
- **Counted claims:** 8 tasks; 11 evidence frames; 7 smoke steps; 4 new dependency lines; 22 primitives verified by name; wrapper methods = 4+4+5+1+1+1 = 16; every count appears in exactly one place (the smoke output mirrors the steps, not a separate total).

