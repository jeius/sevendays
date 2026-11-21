# Plan: #334 — Service covers: teaser variant pass + owner reaction

**Goal:** The #94 rendered-variants gate for the services-cover spec: one variant pass on the feature's own surfaces — the admin editor's four cover preview states (bound / pending-removal / stored / empty) in both themes, and the landing's two postures (the home services strip + the /services list) with a real cover beside the documented stand-in fallback, both themes — with the owner's reactions recorded on [#334](https://github.com/jeius/sevendays/issues/334) before the feature is called done. **Zero code changes** — the pass verifies #331 + #332 + #333's landed work (branch `service-covers` at `75d5865`, held unpushed for the owner's integration call) and gives spec [#330](https://github.com/jeius/sevendays/issues/330) its closing note.

**Spec:** [#334](https://github.com/jeius/sevendays/issues/334) (labeled `ready-for-agent`), authoritatively settled by its parent spec [#330](https://github.com/jeius/sevendays/issues/330), repo copy `docs/specs/2026-11-19-services-cover-photos-spec.md` (the "Rendered-variants step" bullet: "one teaser walk (a real cover beside a fallback service, all four editor preview states, both themes) before the feature is called done"). The code tickets are executed complete on the shared branch — #331 (api spine, SDD 5/5), #332 (admin editor, SDD 5/5), #333 (landing consumption, SDD 5/5) — their closes + v1 picks deferred to the owner's integration call. The template is #338's executed plan (`docs/superpowers/plans/2026-11-21-338-create-button-polish-teaser-pass.md` — the same ticket shape, owner-blessed as the template for #334/#341) as executed by #341's (`docs/superpowers/plans/2026-11-21-341-image-viewer-teaser-pass.md`), whose **pre-merge local-serve environment ruling is baked in from the start** here — the branch-held constraint was known at plan time, so no template inheritance-and-amendment is needed.

**Execution mode:** controller-executed **interactive** (the sdd-execution carve-out — SDD is for code-change cycles; owner-gated passes with zero code diff run controller-executed, keeping its rigor: verified literals, verbatim bodies, evidence-cited closes). Steps use checkbox (`- [ ]`) syntax for tracking; the controller ends turns at the owner gates (the go gate, Task 1 Step 7; the reaction ask, Task 4 Step 2).

**Controller pre-flight (2026-11-21, worktree HEAD `75d5865`) — every literal below probed live today:**

- The branch `service-covers` at `.worktrees/service-covers` carries #331+#332+#333 (`75d5865`, clean, unpushed — the owner's integration call pending; this plan commits on top of the tip, Task 1 Step 6). Floors on the branch: api 33 passed + 1 skipped (34) / **482 passed + 3 skipped**, types **197**, landing 18 files / **138 tests**, admin 34 files / **364 tests** (the branch AGENTS.md, with #331's eleven service-cover pins, #332's four editor seam pins, #333's four service-image seam pins named in place).
- **The environment spike (run today, read-only):** `wrangler dev --remote` in `apps/api` boots the branch api as a **remote preview** — the log's binding table shows `env.MEDIA_BUCKET (sevendays-media) R2 Bucket` (the REAL bucket) alongside every `.dev.vars` var flowing (DATABASE_URL, MEDIA_PUBLIC_BASE_URL, the R2 S3 trio, all "(hidden)"), reaching **"Ready on http://localhost:8787"**; `GET /api/v1/studio-services` answered **200 OK with `coverImageUrl: null` on all four rows** — one probe proving three facts: migration 0015 is applied to the live DB (the column query succeeds), the branch read shape resolves, and the remote preview runs real worker semantics. **Why `--remote` is load-bearing:** `commitUpload` is binding-only (`apps/api/src/services/media.ts:114-168` — `bucket.head` → `bucket.get` → promote, "no S3 credentials involved"), and plain local dev binds the Miniflare R2 **sim** — a real-bucket staging PUT (presign hands real S3 URLs from `.dev.vars`' credentials) would MISS the sim's HEAD and the commit would fail typed `not_found`. Remote preview carries the real binding, so the owner's presign → browser PUT → commit → bind chain is real end to end. The spike was read-only (one public GET), deployed nothing, and its session was killed.
- **Zero env swaps needed:** both frontends' `.env.local` already carry `API_URL=http://127.0.0.1:8787` (the documented local-dev stack) — the pass boots the api leg in remote mode and nothing else changes. `apps/admin/.env.local` also carries the auth server env: `DATABASE_URL` is the live pooler (probed — the owner's account signs in locally), `BETTER_AUTH_URL=http://localhost:3000`. Admin entity reads/writes/presign are all `createServerFn` (`apps/admin/src/lib/admin.functions.ts`) calling `process.env.API_URL` (`apps/admin/src/lib/api.server.ts:8`) — server-to-server, no browser CORS exposure.
- **The R2 bucket CORS already allows the local admin:** `http://localhost:3000` is one of the three admin origins (exact match, no trailing slash — `docs/media-bucket-runbook.md:20`), so the owner's browser-direct XHR PUT to the presigned URL lands in the real bucket from the local serve.
- Live data (probed via the public read): four active services — **Photo Recovery, Picture Framing, Portraits & ID Photo, Tarpaulin & Bulletin Printing** — all coverless today. The pass needs exactly one real cover: **the owner's** (their photo, their service choice — Task 2 Step 2's choreography).
- **The admin editor's DOM** (read from the branch source): the row's Edit control is a ghost icon Button `aria-label='Edit'` inside the row (`studio-services-screen.tsx:514-524` — scope it by `getByRole('row').filter({ hasText: <service> })`); the edit sheet's title IS the service name (`studio-services-screen.tsx:743` — `editing.row.name`; the create sheet's title is `'New service'`, so a title-anchored locator never confuses them); the sheet is Base UI `Dialog.Popup` (`packages/ui/src/components/sheet.tsx:49`) → `role='dialog'`; the Cover block is the one `div.rounded-lg.border.p-4` under the dialog (`studio-services-screen.tsx:833-908`), carrying the four-state preview: **bound** = `img[src^='blob:']` (`coverStatus.previewUrl`), **pending-removal / empty** = the `div.bg-muted` tile with the Image glyph (`svg.size-8`, no img), **stored** = `img` at the resolved `coverImageUrl` (`:840-860`); the machine's status lines render as `p.text-muted-foreground.text-xs` — `Presigning…` / `Uploading… N%` / **`Cover ready — save to bind it.`** / `Upload failed: …` (`:889-906`); the buttons are `Upload cover` (outline) + `Remove cover` (ghost) (`:875-887`); the sheet footer's **Cancel** closes without saving (`shared.tsx` LightEntityEditor — `setVisible(false)`, and the async Save contract closes only on a resolved-true save); the sheet slides via a 0.3s `motion.div` transition — settle after every open/close.
- **The landing postures' DOM:** the home strip anchors `section[data-strip='services']` (`home-image-led.tsx:241`) — and it is a **marquee**: the track (`div.flex.w-max`, `md:animate-[marquee_45s_linear_infinite]`, paused on hover, `motion-reduce` disables on md+) renders the four `ServiceImageCard`s **three times** — the originals plus two `aria-hidden='true'` loop copies (`home-image-led.tsx:255-277`), so the DOM holds twelve card imgs and the count law must scope to the originals via `div:not([aria-hidden]) > a:has(h3)`; the rig pauses the track at capture time (`addStyleTag`, runtime-only — the visual suite's determinism pattern, never a code change). Each card is an `<a>` (the `/book` Link) whose first child is the card img, `alt=''` + `aria-hidden='true'` + `loading='lazy'` (`home-cards.tsx:28-34`); /services renders `article` ServiceCards (Reveal-wrapped) inside `div.mt-6.grid` under the one `section.mx-auto.max-w-5xl` (the call-visit strip's `max-w-5xl` is an inner div, not the section — `services.tsx:41-58,64-68`; the img at `service-card.tsx:71-77`, same laws). The precedence helper is `serviceImage(service) = coverImageUrl ?? serviceBackground(name)` (`apps/landing/src/lib/service-image.ts:22-26`), and the stand-in map's paths are pinned there: `/photos/service-recovery.jpg`, `/photos/service-framing.jpg`, `/photos/service-id.jpg`, `/photos/service-printing.jpg`, default `/photos/cover-portrait.jpg`.
- **Theme mechanics:** the admin topbar carries the shared `ThemeToggle` (`aria-label='Toggle theme'` — `admin-topbar.tsx:21`, `packages/ui/src/components/theme-toggle.tsx`); next-themes **0.4.6** class strategy through the packages/ui provider seam (default light, default storageKey `'theme'`). **The open-sheet dark trick:** next-themes 0.4.6 registers `addEventListener("storage")` (probed in the installed dist) — a second same-origin page writing `localStorage.theme` re-skins the OPEN sheet live (the sheet's tokens are pure CSS off `html.dark`; no reload, which would drop the bound/pending editor state). The landing act (no state to lose) uses the #341 mechanism: `localStorage.setItem('theme', …)` + reload, asserting `html.dark`.
- **Ports:** the api dev on 8787 (`wrangler.toml [dev]`); **both frontends pin `--port 3000`** (`package.json` dev scripts) — the admin act and the landing act run **serially** (admin first — its bind feeds the landing), with the api leg up across both.
- `@playwright/test` **1.63.0** resolves at the worktree root (probed via its package.json); Node v26.x at the repo root (global `fetch` for the scripts' API probes — re-verify at execution). The admin act is **headed** (the owner signs in — the #310 go gate; zero credentials read, stored, or passed); the landing act is **headless** (public surface, nothing to gate).
- `.superpowers/` is gitignored (`.gitignore:39-40`) — the pass's scratch root is `.superpowers/334-teaser-pass/`.
- Standing flag, NOT this ticket: the nightly E2E's ADR-0022 landing visual baselines (light) have failed 3 consecutive scheduled runs (latest `44845874350`, 2026-11-21T00:45Z; also `44651735229`, `44434041556`) — landing-side baseline drift predating this pass. Flagged to the owner in the pass comment (Task 4), triaged apart; nothing in this plan touches it.
- Sentry note: the remote-preview api carries `.dev.vars`' `SENTRY_DSN` with `ENVIRONMENT=dev` — any capture lands as ordinary dev-environment noise (the existing local-dev posture); the pass adds no new capture surface.

## Scope fences

**In scope:** the capture rig under gitignored `.superpowers/334-teaser-pass/` (two scripts + twelve PNGs + two capture-logs — nothing committed from it); the owner's cover bind (their photo, their service choice — a real live-data write through the feature's own flow, headed); the headless landing act; the owner's three reactions recorded on #334; the disposition (the closes + the #330 closing note + `docs/progress.md` + this plan's execution ticks + graphify).

**NOT here (siblings / out of scope):**

- **Zero code changes.** The pass verifies landed work. Any fix the owner names in their reaction is a NEW ticket (via the triage discipline) — never an edit inside this pass, never a "quick" in-pass patch.
- **The push / PR / merge of `service-covers`** — owner-initiated at their integration call (with the #331–#333 closes + the v1 picks/ledger riding that ceremony). This plan *gates nothing on it* and never executes any of it; the pass's record commits ride the branch's eventual push (the #341 pattern).
- **The one-write law:** the pass's only live-data write is the **owner's bind-save** (their cover, one service). `Remove cover` + `Cancel` are editor-state-only actions (never saved — the sheet's close-only-on-success contract means Cancel commits nothing). No replace-save, no clear-with-save, no entity delete — every one of those rides a real post-commit object delete the pass must not trigger.
- **The owner's cover is not undone after the pass.** It is their real content: the teaser serves it once integration lands, and the fallback matrix needs it beside the stand-ins.
- **The nightly E2E visual-baseline failures** — flagged in the pass comment only; their triage is its own ticket.
- **No `packages/` changes, no test changes, no floor movement, no `pnpm check` run** — the pass changes zero code, so the check gate has nothing to gate; the floors hold by absence (the branch's recorded floors, pre-flight above).
- **#330 stays open** — this pass posts its closing NOTE (Task 4); the spec's close belongs to the owner's integration call, never to the capture alone.
- **No teaser/v1 deploy of any kind** — the `wrangler dev --remote` session is a dev server, not a deploy; the bare-deploy law (`#263/#264`) stands untouched.

## Owner rulings (recorded)

- **The pass is an owner-reaction gate over the ruled implementation, not a design exploration** (spec #330's rendered-variants bullet; the #338/#341 precedent). The rendering matrix is fixed: 4 editor preview states × 2 themes, 2 landing postures × 2 themes — twelve shots, no variants to explore. Any tuning the reaction demands becomes fix tickets, then a re-pass.
- **The cover is the owner's content** (the #341 caption-population ruling's analog — there the owner added captions via their teaser admin; here the feature exists only on the branch, so the owner binds through the feature's own editor flow on the local serve): the owner picks the service and the JPG and performs the upload + Save; the controller drives navigation, theme flips, and capture only, plus editor-state-only actions (Remove + Cancel — never saved). The owner's photo is never controller-invented and the service choice is never controller-picked.
- **The reactions answer the three ruled surfaces separately, then the whole** — the editor Cover field register, the landing cover-beside-fallback adjacency, and the overall verdict each get an explicit answer (Task 4 Step 2's three-question ask).

## Global Constraints

- **The api leg is `wrangler dev --remote`** (the spike-proven posture; the pre-flight explains why plain local dev cannot commit). It is a dev server — never `wrangler deploy` against any environment (the #263/#264 law), never any other account mutation.
- **Zero env swaps.** Both frontends' `.env.local` already point `API_URL` at `127.0.0.1:8787`; nothing is backed up, edited, or restored — the pass boots and stops serves, nothing more.
- **Zero credentials, zero logins by the controller.** The owner signs the visible Chromium within `CAPTURE_LOGIN_TIMEOUT_MS` (default 180000); a timeout exits non-zero → stop and wait for the owner (never a headless credential fallback, never an unannounced second fire).
- **Owner-hand waits are blocking:** every step that needs the owner's hands (open the editor, upload, Save) waits up to `CAPTURE_OWNER_TIMEOUT_MS` (default 300000) with a printed console guidance line, and never auto-advances. The script never registers a `filechooser` handler (the owner's native picker stays theirs) and never clicks `Upload cover` or `Save`.
- **All pass artifacts live under `.superpowers/334-teaser-pass/`** (gitignored) — outside every suite per ADR-0022; never `pnpm check`, never `test:e2e`. Nothing under `.superpowers/` is committed.
- **Capture order:** Act 1 (admin) light first, dark via the page2-storage trick (assert `html.dark`), restored to light after each dark capture; Act 2 (landing) light first, then `localStorage.theme='dark'` + reload (assert `html.dark`).
- **Verbatim values:** both capture scripts (Task 1 Steps 3–4) are landed verbatim — their locators and asserts are pinned to the pre-flight's verified DOM; the #334 comment body (Task 4 Step 3) is the pinned shape whose execution-derived slots (the date; the branch tip; the service covered; the covered URL's host; the owner's verdict words) are filled from the recorded facts, never paraphrased.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits reference #334, prefix `docs:` / `chore(graphify):` — this plan lands records only. The plan file itself commits on the `service-covers` branch at write time (the sibling precedent — #332's `2405e55`, #333's `cc63d32` — so it rides the push when the owner calls it); the post-pass records (progress, execution ticks) commit on the branch per the #341 flow.

## UI skill audit (`ui-ux-pro-max` + `prototype`, run at plan time 2026-11-21)

Loaded per the ticket's named skill set (the #94-amendment discipline; the controller re-loads both at execution time). The searches (`"decorative image alt text"`, `"empty state placeholder"`, `"upload feedback loading state"`) return the governing guidelines this pass renders visible for the owner:

- **Decorative semantics:** the landing card photos are `alt=''` + `aria-hidden` — machine-checked on all eight captured card imgs (4 cards × 2 surfaces), so the owner judges the tints, not the semantics.
- **Realistic placeholder state:** the editor's empty and pending-removal states render the Image-icon muted tile — the same composition the package/branch editors run (spec §5's port law); shots 07/08 let the owner judge its register beside the real-cover states.
- **Loading/feedback states:** the machine's status vocabulary (Presigning… / Uploading… N% / "Cover ready — save to bind it.") — shot 01 frames the completed bound state with its status line, the seam's contract made visible.
- **Consistent composition as the token law:** the covered landing card must read as the SAME house card (the photo-IS-the-card treatment riding identical tints) — shots 09–12 frame covered and fallback cards side by side in one region so the adjacency is judged directly (the spec's "a real cover beside a fallback service").
- **Both themes tested before delivery, never inferred from one** — the skill's pre-delivery rule is literally this pass's design: light + dark per surface.
- **`prototype`:** the rig is the throwaway artifact answering "does the rendered feature pass the owner's eye" — gitignored by design; the issue record is the capture (the skill's capture rule adapted to a zero-code pass per the #338/#341 precedent — no throwaway branch to preserve).

No design recommendation applies — the tri-state law, the fallback posture, the picker-only JPG upload, and the card treatment are owner-settled and shipped; the pass judges rendering. The owner's reactions override anything this audit or the skills recommend (recorded in the reactions, Task 4).

---

## Task 1 — staging: the api leg + the rig + the plan record (no browser yet)

**Files:**
- Create: `.superpowers/334-teaser-pass/act1-admin.mjs` (gitignored scratch — never committed)
- Create: `.superpowers/334-teaser-pass/act2-landing.mjs` (gitignored scratch — never committed)
- Commit: `docs/superpowers/plans/2026-11-21-334-service-covers-teaser-pass.md` (this file)

**Interfaces:**
- Consumes: the branch serves (api remote preview 8787; admin/landing dev 3000); `@playwright/test` 1.63.0 (worktree-root-resolvable); the pre-flight's verified DOM.
- Produces: the rig + the booted api leg (Task 2 consumes both); twelve PNGs + two capture-logs (Tasks 2–3 produce, Task 4 consumes).

- [✅] **Step 1: Verify the branch-build provenance.** The pass reacts to the exact code that will merge — no push, no PR, no merge happens in this pass:

```bash
git rev-parse --short HEAD && git status --short && node -e "console.log(require('@playwright/test/package.json').version)"
```

Expected: HEAD is this plan's commit atop #331+#332+#333's `75d5865` (record the actual tip — the pass comment cites it); worktree clean; the version prints `1.63.0`. If a newer commit has landed on the branch since, proceed — the capture-log records the actual tip.

- [✅] **Step 2: Boot the api leg in remote mode and prove the born-null state.** Run in the background (the session survives this turn):

```bash
pnpm --filter @sevendays/api exec wrangler dev --remote
```

Wait for `Ready on http://localhost:8787` in its output, then probe:

```bash
curl -s http://localhost:8787/api/v1/studio-services | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('rows:',j.length,'covered:',j.filter(s=>s.coverImageUrl).length,'names:',j.map(s=>s.name).join(' | '))})"
```

Expected: `rows: 4, covered: 0` and the four names — the born-null state, the migration proven live (a 200 with the resolved field means 0015 is applied). **If any row carries a coverImageUrl, STOP and report** — the pass expects the born-null catalog; reconcile with the owner before firing (the re-fire path in Task 2's script tolerates an already-bound service only when the owner names that state at the go gate). Leave the api leg running — both acts consume it; it stops at Task 3 Step 5.

- [✅] **Step 3: Write the admin-act script verbatim** to `.superpowers/334-teaser-pass/act1-admin.mjs`:

```js
// #334 — Act 1: the admin editor's four cover preview states, both themes.
// Walks the LOCAL admin serve (branch build) through the cover field's
// rendering matrix: bound (a fresh upload's blob preview), pending-removal
// (Remove without save), stored (the bound cover's resolved URL), empty
// (a coverless service's placeholder) — each light, then dark via the
// page2-storage trick (next-themes 0.4.6 syncs the open sheet across
// same-origin pages; a reload would drop the editor state), restored to
// light after each dark capture. Eight PNGs + a capture-log.
//
// THE ONE-WRITE LAW: the pass's only live-data write is the OWNER's
// bind-save. The controller's script never registers a filechooser
// handler (the owner's native picker stays theirs) and never clicks
// 'Upload cover' or 'Save' — it waits on the owner's hands with printed
// guidance and CAPTURE_OWNER_TIMEOUT_MS (default 300000), and 'Remove
// cover' + 'Cancel' are editor-state-only (the sheet's close-only-on-
// success contract means Cancel commits nothing).
//
// Auth is headed interactive (the #310 census rule): no credentials are
// read, stored, or passed — the owner signs in the visible Chromium
// within CAPTURE_LOGIN_TIMEOUT_MS (default 180000); a timeout exits
// non-zero and the pass stops for the owner.
//
// Two paths by the fire-time probe:
//   fresh-bind     — the named service is coverless: the owner uploads
//                    and SAVES (the bind is the pass's one write).
//   already-bound  — a previous fire bound the cover: the owner uploads
//                    and STOPS at 'Cover ready — save to bind it.' (never
//                    saves — a replace-save would delete the stored
//                    object); the script captures the bound state and
//                    Cancels. One orphaned covers/<uuid>.jpg (the unsaved
//                    commit's final object) is the path's cost — recorded
//                    in the log as orphanedCover and disclosed in the
//                    record comment.
//
// Usage (only after the owner's "go", with the service they named):
//   DISPLAY=:0 CAPTURE_SERVICE='<service name>' \
//     node .superpowers/334-teaser-pass/act1-admin.mjs
// Prereq: the api leg remote preview on 8787 (Task 1 Step 2); the admin
// serve on 3000 (Task 2 Step 1); @playwright/test at the worktree root.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.CAPTURE_BASE_URL ?? 'http://localhost:3000';
const apiBase = process.env.CAPTURE_API_BASE ?? 'http://localhost:8787';
const service = process.env.CAPTURE_SERVICE;
const outDir = resolve(process.env.CAPTURE_OUT_DIR ?? '.superpowers/334-teaser-pass');
const loginTimeout = Number(process.env.CAPTURE_LOGIN_TIMEOUT_MS ?? 180_000);
const ownerTimeout = Number(process.env.CAPTURE_OWNER_TIMEOUT_MS ?? 300_000);

if (!service) {
  console.error(
    '[gate] CAPTURE_SERVICE is required — the owner names the service they will cover at the go gate (Task 1 Step 7). Stop.',
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const log = {
  base,
  apiBase,
  service,
  path: null,
  boundUrl: null,
  orphanedCover: false,
  otherServices: [],
  shots: [],
  asserts: [],
  error: null,
  failures: 0,
  startedAt: new Date().toISOString(),
};

function assert(name, ok, detail = '') {
  log.asserts.push({ name, ok, detail });
  if (!ok) log.failures += 1;
  console.log(`[${ok ? 'ok' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

const out = (name) => resolve(outDir, name);

// The fire-time probe: the named service must exist and be active; its
// cover state picks the path. Re-probed after the bind (the bind must be
// LIVE before the stored-state walk).
async function probeServices() {
  const res = await fetch(`${apiBase}/api/v1/studio-services`);
  if (!res.ok) throw new Error(`the api probe failed: ${res.status}`);
  const rows = await res.json();
  const row = rows.find((r) => r.name === service);
  if (!row) {
    throw new Error(
      `service "${service}" not found among: ${rows.map((r) => r.name).join(' | ')}`,
    );
  }
  if (!row.isActive) throw new Error(`service "${service}" is not active`);
  return {
    coveredUrl: row.coverImageUrl ?? null,
    otherNames: rows.filter((r) => r.name !== service).map((r) => r.name),
  };
}

const settle = (page, ms) => page.waitForTimeout(ms);

async function shotElement(page, selector, name) {
  const file = out(`${name}.png`);
  await page.locator(selector).first().screenshot({ path: file });
  console.log(`[shot] ${name}.png`);
  log.shots.push({ name, file });
}

// The open-sheet dark flip: a second same-origin page writes the theme
// storage key — next-themes 0.4.6's storage listener re-skins the open
// sheet live (pure CSS off html.dark; no reload, which would drop the
// editor state). Restored to light after every dark capture.
async function flipTheme(page2, page, value) {
  await page2.evaluate((v) => localStorage.setItem('theme', v), value);
  const dark = value === 'dark';
  await page.waitForFunction(
    (d) => document.documentElement.classList.contains('dark') === d,
    dark,
    { timeout: 10_000 },
  );
  await settle(page, 400);
}

// The row's edit control: the ghost icon button aria-label='Edit' inside
// the row whose cells carry the service name (studio-services-screen.tsx
// :514-524; the edit sheet's title is the row's name, so the dialog
// locator never matches the 'New service' create sheet).
async function openEditor(page, name) {
  const row = page.getByRole('row').filter({ hasText: name });
  await row.first().waitFor({ state: 'visible', timeout: 30_000 });
  await row.first().getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.locator("[role='dialog']", { hasText: name });
  await dialog.waitFor({ state: 'visible', timeout: 30_000 });
  await dialog.locator('div.rounded-lg.border.p-4').first().waitFor({ state: 'visible' });
  await settle(page, 800); // the sheet's 0.3s slide + token settle
  return dialog;
}

// The editor's Cover block: the one rounded-lg border p-4 div under the
// dialog (studio-services-screen.tsx:833-908 — the four-state preview,
// the two buttons, the status lines, the JPG hint all live inside it).
const coverBlockIn = (dialog) => dialog.locator('div.rounded-lg.border.p-4');

const browser = await chromium.launch({ headless: false });
try {
  // The fire-time probe picks the path.
  const probed = await probeServices();
  log.otherServices = probed.otherNames;
  log.boundUrl = probed.coveredUrl;
  if (probed.coveredUrl) {
    log.path = 'already-bound';
    log.orphanedCover = true;
    console.log(
      `[probe] "${service}" is ALREADY bound (${probed.coveredUrl}) — a previous fire's save landed. Path: the owner uploads and STOPS at 'Cover ready — save to bind it.' (never saves — a replace-save would delete the stored object); the bound shots capture, then Cancel.`,
    );
  } else {
    log.path = 'fresh-bind';
    console.log(`[probe] "${service}" is coverless — path: fresh bind (the pass's one write).`);
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  // page2 — the theme driver for the open-sheet dark flips (same origin).
  const page2 = await context.newPage();

  // Headed login — the owner signs the visible window (the #310 pattern).
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  console.log('[auth] waiting for your sign-in in the opened Chromium…');
  await page.waitForSelector('[data-shell-main]', { timeout: loginTimeout });
  console.log('[auth] signed in.');
  await page2.goto(`${base}/login`, { waitUntil: 'load' });
  await settle(page, 1500);

  // ---- The bound state (the owner's hands) --------------------------------
  console.log(
    `\n[owner] Open "${service}"'s editor — the pencil (Edit) icon at its row's right end.`,
  );
  const dialog = page.locator("[role='dialog']", { hasText: service });
  await dialog.waitFor({ state: 'visible', timeout: ownerTimeout });
  assert(
    'the edit sheet opened on the named service (the title is the row name)',
    (await dialog.count()) === 1,
  );
  const coverBlock = coverBlockIn(dialog);
  assert('the editor carries exactly one Cover block', (await coverBlock.count()) === 1);

  console.log(
    log.path === 'fresh-bind'
      ? `\n[owner] Upload your cover JPG (JPG only, up to 10 MiB) — stop when the preview says "Cover ready — save to bind it."`
      : `\n[owner] Upload your cover JPG — STOP at "Cover ready — save to bind it." and do NOT save (I capture, then Cancel).`,
  );
  const boundImg = coverBlock.locator("img[src^='blob:']");
  await boundImg.waitFor({ state: 'visible', timeout: ownerTimeout });
  const readyLine = dialog.locator('p', { hasText: 'Cover ready — save to bind it.' });
  await readyLine.waitFor({ state: 'visible', timeout: ownerTimeout });
  assert(
    'bound state: the fresh upload previews as the local object URL (blob:)',
    (await boundImg.count()) === 1,
  );
  assert(
    'bound state: the machine status line renders ("Cover ready — save to bind it.")',
    (await readyLine.count()) === 1,
  );
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'01-editor-bound-light');

  await flipTheme(page2, page, 'dark');
  assert('dark applied with the sheet open (html.dark)', await page.evaluate(() => document.documentElement.classList.contains('dark')));
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'02-editor-bound-dark');
  await flipTheme(page2, page, 'light');

  if (log.path === 'fresh-bind') {
    console.log(`\n[owner] Click Save now.`);
    await dialog.waitFor({ state: 'detached', timeout: ownerTimeout });
    console.log('[bind] the sheet closed on a resolved-true save — the cover is bound.');
  } else {
    console.log('[capture] cancelling the unsaved bound preview…');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.waitFor({ state: 'detached', timeout: 30_000 });
  }
  await settle(page, 1500); // the list re-fetch after the sheet closes

  // ---- The stored state ----------------------------------------------------
  const probedAfter = await probeServices();
  assert(
    'the bind is LIVE on the read (coverImageUrl resolved)',
    typeof probedAfter.coveredUrl === 'string' && probedAfter.coveredUrl.length > 0,
    String(probedAfter.coveredUrl),
  );
  log.boundUrl = probedAfter.coveredUrl;
  const storedDialog = await openEditor(page, service);
  const storedImg = storedDialog.locator(`img[src="${log.boundUrl}"]`);
  assert(
    'stored state: the editor previews the resolved coverImageUrl (exact src)',
    (await storedImg.count()) === 1,
    log.boundUrl,
  );
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'03-editor-stored-light');

  await flipTheme(page2, page, 'dark');
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'04-editor-stored-dark');
  await flipTheme(page2, page, 'light');

  // ---- The pending-removal state (editor-state-only, never saved) ----------
  await storedDialog.getByRole('button', { name: 'Remove cover', exact: true }).click();
  const pendingTile = coverBlockIn(storedDialog).locator('div.bg-muted');
  await pendingTile.waitFor({ state: 'visible', timeout: 30_000 });
  assert(
    'pending-removal: the stored preview is gone, the placeholder tile shows',
    (await storedImg.count()) === 0 && (await pendingTile.count()) === 1,
  );
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'05-editor-pending-removal-light');

  await flipTheme(page2, page, 'dark');
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'06-editor-pending-removal-dark');
  await flipTheme(page2, page, 'light');

  await storedDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await storedDialog.waitFor({ state: 'detached', timeout: 30_000 });
  await settle(page, 800);

  // ---- Cancel kept the stored cover (the #332 AC, live-proven) -------------
  const keptDialog = await openEditor(page, service);
  assert(
    'closing without saving kept the stored cover (the stored preview returns)',
    (await keptDialog.locator(`img[src="${log.boundUrl}"]`).count()) === 1,
  );
  await keptDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await keptDialog.waitFor({ state: 'detached', timeout: 30_000 });
  await settle(page, 800);

  // ---- The empty state (a coverless sibling service) -----------------------
  const emptyName = log.otherServices[0];
  if (!emptyName) throw new Error('no coverless sibling service found for the empty state');
  const emptyDialog = await openEditor(page, emptyName);
  const emptyBlock = coverBlockIn(emptyDialog);
  assert(
    `empty state (${emptyName}): the placeholder tile shows, no cover preview of any kind`,
    (await emptyBlock.locator('img').count()) === 0 &&
      (await emptyBlock.locator('div.bg-muted').count()) === 1,
  );
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'07-editor-empty-light');

  await flipTheme(page2, page, 'dark');
  await shotElement(page, "[role='dialog'] div.rounded-lg.border.p-4",'08-editor-empty-dark');
  await flipTheme(page2, page, 'light');

  await emptyDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await emptyDialog.waitFor({ state: 'detached', timeout: 30_000 });

  await page2.close();
} catch (err) {
  // A mid-walk abort (an owner-hand timeout, a failed save holding the
  // sheet, a throw inside a helper) must still land the log.
  log.failures += 1;
  log.error = String(err?.stack ?? err);
  console.error('[error] the act aborted:', err);
} finally {
  await browser.close();
}

log.finishedAt = new Date().toISOString();
writeFileSync(resolve(outDir, 'capture-log-admin.json'), JSON.stringify(log, null, 2));
console.log(
  JSON.stringify(
    {
      service: log.service,
      path: log.path,
      boundUrl: log.boundUrl,
      orphanedCover: log.orphanedCover,
      shots: log.shots.length,
      failures: log.failures,
    },
    null,
    2,
  ),
);
process.exit(log.failures === 0 ? 0 : 1);
```

- [✅] **Step 4: Write the landing-act script verbatim** to `.superpowers/334-teaser-pass/act2-landing.mjs`:

```js
// #334 — Act 2: the landing's two service postures, both themes. Walks
// the LOCAL landing serve (branch build) through the serviceImage
// precedence law as rendered: the home services strip
// (section[data-strip='services'], ServiceImageCard Links) and the
// /services list (article ServiceCards) — four shots, light first, then
// localStorage theme=dark + reload (html.dark asserted). Headless — the
// landing is public, there is no login, so the #310 headed-login rule
// has nothing to gate.
//
// The law under capture: the covered service's card renders the stored
// cover (the EXACT resolved coverImageUrl as src); every coverless
// service renders its documented stand-in fallback (the serviceBackground
// map, apps/landing/src/lib/service-image.ts:8-15 — paths pinned below
// verbatim); every card img is decorative + lazy (alt='' + aria-hidden +
// loading=lazy) — the treatment identical either way, which is exactly
// what the owner judges in the shots.
//
// Usage: node .superpowers/334-teaser-pass/act2-landing.mjs
// Prereq: the api leg remote preview on 8787 with the owner's bind LIVE
// (exactly one covered service — the gate below); the landing serve on
// 3000 (Task 3 Step 1); @playwright/test at the worktree root.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.CAPTURE_BASE_URL ?? 'http://localhost:3000';
const apiBase = process.env.CAPTURE_API_BASE ?? 'http://localhost:8787';
const outDir = resolve(process.env.CAPTURE_OUT_DIR ?? '.superpowers/334-teaser-pass');

// The stand-in map's paths (service-image.ts:8-15), pinned verbatim.
const STAND_INS = [
  '/photos/service-recovery.jpg',
  '/photos/service-framing.jpg',
  '/photos/service-id.jpg',
  '/photos/service-printing.jpg',
  '/photos/cover-portrait.jpg',
];

mkdirSync(outDir, { recursive: true });
const log = {
  base,
  apiBase,
  covered: null,
  fallbackNames: [],
  shots: [],
  asserts: [],
  error: null,
  failures: 0,
  startedAt: new Date().toISOString(),
};

function assert(name, ok, detail = '') {
  log.asserts.push({ name, ok, detail });
  if (!ok) log.failures += 1;
  console.log(`[${ok ? 'ok' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

const out = (name) => resolve(outDir, name);
const settle = () => page.waitForTimeout(1500); // hydration + reveal + lazy loads

async function shot(page, selector, name) {
  const file = out(`${name}.png`);
  await page.locator(selector).first().screenshot({ path: file });
  console.log(`[shot] ${name}.png`);
  log.shots.push({ name, file });
}

// The fire-time gate: exactly ONE covered service — the owner's bind must
// be live before Act 2 (the landing reads the same api the admin saved
// through). Zero or two+ covers means the pass's design is broken: stop.
const res = await fetch(`${apiBase}/api/v1/studio-services`);
if (!res.ok) {
  console.error(`[gate] the api probe failed: ${res.status} — is the api leg up (Task 1 Step 2)? Stop.`);
  writeFileSync(resolve(outDir, 'capture-log-landing.json'), JSON.stringify(log, null, 2));
  process.exit(1);
}
const rows = await res.json();
const coveredRows = rows.filter((r) => r.coverImageUrl);
if (coveredRows.length !== 1) {
  console.error(
    `[gate] expected exactly one covered service (the owner's bind), found ${coveredRows.length} — reconcile before Act 2. Stop.`,
  );
  writeFileSync(resolve(outDir, 'capture-log-landing.json'), JSON.stringify(log, null, 2));
  process.exit(1);
}
log.covered = { name: coveredRows[0].name, url: coveredRows[0].coverImageUrl };
log.fallbackNames = rows.filter((r) => !r.coverImageUrl).map((r) => r.name);
console.log(
  `[gate] covered: ${log.covered.name} (${log.covered.url}); fallbacks: ${log.fallbackNames.join(' | ')}.`,
);

const browser = await chromium.launch({}); // headless — public surface, no login exists
let page;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  page = await context.newPage();

  // One card-law check over one surface: count, the covered card's exact
  // src, every fallback card's stand-in src, the decorative+lazy img laws,
  // and the decode gate (a broken cover URL is a REAL finding — the R2
  // object must load).
  async function checkCards(scopeSel, cardCss, surface) {
    const scope = page.locator(scopeSel);
    await scope.waitFor({ state: 'visible', timeout: 30_000 });
    const cards = scope.locator(cardCss);
    const count = await cards.count();
    assert(`${surface}: one card per active service (4)`, count === 4, String(count));
    let decoded = true;
    try {
      await page.waitForFunction(
        (sel) =>
          [...document.querySelectorAll(`${sel} img`)].every(
            (im) => im.complete && im.naturalWidth > 0,
          ),
        scopeSel,
        { timeout: 15_000 },
      );
    } catch {
      decoded = false;
    }
    assert(`${surface}: every card img decoded (complete + naturalWidth > 0)`, decoded);
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const name = (await card.locator('h3').first().textContent())?.trim();
      const img = card.locator('img').first();
      const src = await img.getAttribute('src');
      const isCovered = name === log.covered.name;
      assert(
        `${surface}: ${name} renders ${isCovered ? 'the stored cover (exact src)' : 'a documented stand-in fallback'}`,
        isCovered ? src === log.covered.url : STAND_INS.includes(src),
        src,
      );
      assert(
        `${surface}: ${name} img is decorative + lazy (alt='' + aria-hidden + loading=lazy)`,
        (await img.getAttribute('alt')) === '' &&
          (await img.getAttribute('aria-hidden')) === 'true' &&
          (await img.getAttribute('loading')) === 'lazy',
      );
    }
  }

  // ---- Light -----------------------------------------------------------------
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.locator("section[data-strip='services']").scrollIntoViewIfNeeded();
  await settle();
  // The strip is a marquee: the track runs the four cards THREE times (the
  // two aria-hidden loop copies) under a 45s animation. Pause the track at
  // capture time (runtime-only — the visual suite's determinism pattern);
  // the asserts and the shot run over the four originals via the
  // not-[aria-hidden] wrapper selector.
  await page.addStyleTag({
    content: "[data-strip='services'] .flex.w-max { animation-play-state: paused !important; }",
  });
  await checkCards("section[data-strip='services']", 'div:not([aria-hidden]) > a:has(h3)', 'home strip light');
  await shot(page, "section[data-strip='services']", '09-home-services-strip-light');

  await page.goto(`${base}/services`, { waitUntil: 'networkidle' });
  await page.locator('section.max-w-5xl').first().scrollIntoViewIfNeeded();
  await settle();
  await checkCards('section.max-w-5xl', 'article', '/services list light');
  await shot(page, 'section.max-w-5xl', '10-services-list-light');

  // ---- Dark (localStorage + reload — the #341 mechanism; no state to lose) ---
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  assert(
    'dark applied (html.dark)',
    await page.evaluate(() => document.documentElement.classList.contains('dark')),
  );
  await page.locator("section[data-strip='services']").scrollIntoViewIfNeeded();
  await settle();
  await page.addStyleTag({
    content: "[data-strip='services'] .flex.w-max { animation-play-state: paused !important; }",
  });
  await checkCards("section[data-strip='services']", 'div:not([aria-hidden]) > a:has(h3)', 'home strip dark');
  await shot(page, "section[data-strip='services']", '11-home-services-strip-dark');

  await page.goto(`${base}/services`, { waitUntil: 'networkidle' });
  await page.locator('section.max-w-5xl').first().scrollIntoViewIfNeeded();
  await settle();
  await checkCards('section.max-w-5xl', 'article', '/services list dark');
  await shot(page, 'section.max-w-5xl', '12-services-list-dark');
} catch (err) {
  log.failures += 1;
  log.error = String(err?.stack ?? err);
  console.error('[error] the act aborted:', err);
} finally {
  if (browser) await browser.close();
}

log.finishedAt = new Date().toISOString();
writeFileSync(resolve(outDir, 'capture-log-landing.json'), JSON.stringify(log, null, 2));
console.log(
  JSON.stringify(
    { covered: log.covered?.name, shots: log.shots.length, failures: log.failures },
    null,
    2,
  ),
);
process.exit(log.failures === 0 ? 0 : 1);
```

- [✅] **Step 5: Syntax gates.**

```bash
node --check .superpowers/334-teaser-pass/act1-admin.mjs
node --check .superpowers/334-teaser-pass/act2-landing.mjs
```

Expected: both silent (exit 0).

- [✅] **Step 6: Commit the plan record.**

```bash
git add docs/superpowers/plans/2026-11-21-334-service-covers-teaser-pass.md
git commit -m "docs: the #334 service-covers teaser-pass plan (the spec branch's owner gate)"
```

- [✅] **Step 7: The go-gate announcement (STOP here — end the turn).** End the turn with this message and do NOT fire the admin act until the owner's next message says go AND names the service:

> The #334 variant pass is staged. Act 1 opens a Chromium window on your desktop for the **local admin** login (you sign in, ≤180 s; no credentials are shared or stored — it's the branch build at localhost, reading the same live data). Then, with your hands: open the editor of the service you want to carry the cover, upload **your** cover JPG (JPG only, up to 10 MiB), and click Save — that bind is the pass's one real write and it stays (the teaser serves it once integration lands). I capture the editor's four preview states in both themes around your hands, then the landing's two postures headlessly. **Say go — and name the service you'll cover** (e.g. "Photo Recovery").

This step's box is ticked only when the owner has said go and named the service.

**Not here:** no login automation of any kind (no filled fields, no stored credentials — the script's auth block waits, never types); no editor/sheet interaction beyond navigation, the theme flips, `Remove cover` + `Cancel` (editor-state-only — never `Upload cover`, never `Save`); no issue comments yet (Task 4 owns all issue writes); no capture firing (Task 2 — and only after the go).

## Task 2 — the admin act: the owner's bind + the four preview states (the go gate)

**Files:**
- Consumes: `.superpowers/334-teaser-pass/act1-admin.mjs` (Task 1); the api leg (Task 1 Step 2); the owner's "go" + named service.
- Produces: eight PNGs + `capture-log-admin.json` under `.superpowers/334-teaser-pass/`.

All commands run from the **worktree root** (the scripts resolve `@playwright/test` and the relative scratch path from there).

- [✅] **Step 1: Boot the admin serve and probe it.** Run in the background:

```bash
pnpm --filter @sevendays/admin dev
```

Wait for its `Local: http://localhost:3000/` line, then probe (a status probe — dev HTML carries NUL bytes):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
```

Expected: `200`. (The admin reads/writes/presign all proxy to `127.0.0.1:8787` via the already-set `API_URL` — no env work.)

- [✅] **Step 2: Fire (ONLY after the owner's "go" AND the named service — never before).** Substitute the service the owner named at Task 1 Step 7:

```bash
DISPLAY=:0 CAPTURE_SERVICE='<the owner's named service>' node .superpowers/334-teaser-pass/act1-admin.mjs
```

Expected: the probe line (fresh-bind or already-bound), the `[auth]` wait — the owner signs in the visible Chromium — then the two `[owner]` guidance lines (open the editor; upload the JPG and stop at "Cover ready — save to bind it."), the bound-state asserts, shot 01–02 (bound, light/dark), the `[owner] Click Save now.` line (fresh-bind) or the Cancel line (already-bound), the bind-LIVE assert, shots 03–04 (stored), the pending-removal asserts + shots 05–06, the cancel-kept assert, the empty-state asserts + shots 07–08, and the closing JSON verdict: `shots: 8, failures: 0` with `boundUrl` a resolved URL and `path` recording which branch ran. Exit 0.

- [✅] **Step 3: The failure branches.** Any `[FAIL]` line, a non-zero exit, or a thrown abort = **STOP and diagnose before presenting** — never present broken evidence. Diagnosis order: (a) the serves (the api leg's `Ready on 8787` line alive; the admin serve's 200 — a dead serve fails the very first assert); (b) the owner-hand timeouts (`[error]` naming a waitFor timeout on an `[owner]` step = the owner stepped away — this is the wait-for-owner-answers block, not a retry: re-announce Task 1 Step 7's message and end the turn); (c) a failed SAVE (the sheet holding past `Click Save now.` = the save contract resolved false — read the editor's error lines in the log/screenshot, diagnose the conflict, never blind-retry); (d) the rig itself (locators against the branch DOM — only after (a)–(c) are green). A diagnosed rig defect is fixed in the script and the WHOLE act re-fires (one clean run, not stitched halves — the log and shots must come from a single execution). A re-fire after a landed bind runs the script's `already-bound` path automatically (the fire-time probe picks it; the unsaved re-upload's commit leaves one orphaned `covers/<uuid>.jpg` — recorded as `orphanedCover` and disclosed in the record comment; never a replace-save). Never retake a shot to "improve" it — the pass records what the branch build serves; a retake is only for a FAILED assert, diagnosed first.

- [✅] **Step 4: Verify the artifacts before presenting.**

```bash
ls .superpowers/334-teaser-pass/ && cat .superpowers/334-teaser-pass/capture-log-admin.json
```

Expected: exactly eight PNGs (`01-editor-bound-light.png` … `08-editor-empty-dark.png`) + `capture-log-admin.json` (act2's artifacts join later); every `asserts` entry (10) has `ok: true`; `failures: 0`; `boundUrl` is an absolute resolved URL; `path` and `orphanedCover` recorded. Any red → Step 3's branch, not the reaction.

- [✅] **Step 5: Stop the admin serve** (both apps pin :3000 — the landing act needs it next).

**Not here:** no editor saves, uploads, or replaces by the controller (`Remove cover` + `Cancel` only — the one-write law); no navigation beyond `/studio-services` and the login redirect; no second fire without diagnosis (and an owner-hand timeout is a stop-and-wait, never a retry); no screenshots beyond the eight (the asserts carry the rest).

## Task 3 — the landing act: both postures, both themes (headless)

**Files:**
- Consumes: `.superpowers/334-teaser-pass/act2-landing.mjs` (Task 1); the api leg with the bind LIVE; the owner's bound cover.
- Produces: four PNGs + `capture-log-landing.json` under `.superpowers/334-teaser-pass/`.

- [✅] **Step 1: Boot the landing serve and probe both postures.** Run in the background:

```bash
pnpm --filter @sevendays/landing dev
```

Wait for its `Local: http://localhost:3000/` line, then probe (dev HTML carries NUL bytes — `-a`; `-o | wc -l` counts occurrences on the one-line document):

```bash
curl -s http://localhost:3000/ | grep -a -o "data-strip='services'" | wc -l
curl -s http://localhost:3000/services | grep -a -o "<article" | wc -l
```

Expected: ≥ 1 and ≥ 4 — the serve renders both postures over the live data (the landing's `API_URL` already points at the local api leg).

- [✅] **Step 2: Fire.** Nothing is gated here — the landing is public and headless:

```bash
node .superpowers/334-teaser-pass/act2-landing.mjs
```

Expected: the `[gate]` line (covered: the owner's service + its resolved URL; the three fallbacks named), then the four `checkCards` passes (10 asserts each — the 4-card count over the marquee's four originals via the not-[aria-hidden] selector on the strip and over the four articles on /services, the decode gate, per card the exact-cover-or-stand-in src law and the decorative+lazy img laws) and the dark-applied assert — 41 asserts total — plus four `[shot]` lines (the strip shots pause the marquee track — runtime-only `addStyleTag`), closing with the JSON verdict: `shots: 4, failures: 0`. Exit 0.

- [✅] **Step 3: The failure branch.** Any `[FAIL]`, a non-zero exit, or the `[gate]` tripping = **STOP and diagnose before presenting**. Diagnosis order: (a) the serves (a dead api leg trips the gate's probe — Task 1 Step 2's posture; a dead landing serve fails the first `checkCards` wait); (b) the bind state (the gate demands exactly one covered service — zero means Task 2's bind never landed, two+ means an earlier fire bound twice: reconcile with the owner); (c) a decode-gate failure is REAL evidence (a broken cover URL fails `naturalWidth > 0` — that is a finding, never a rig bug to fix away — stop and present it); (d) the rig itself (the card selectors against the branch DOM — only after (a)–(c) are green). A diagnosed rig defect is fixed in the script and the WHOLE act re-fires (one clean run). Never retake a shot to "improve" it.

- [✅] **Step 4: Verify the artifacts before presenting.**

```bash
ls .superpowers/334-teaser-pass/ && cat .superpowers/334-teaser-pass/capture-log-landing.json
```

Expected: twelve PNGs total now (`09-home-services-strip-light.png` … `12-services-list-dark.png` joining act1's eight) + both capture-logs; every `asserts` entry (41) has `ok: true`; `failures: 0`; `covered.name` is the owner's service and `covered.url` the resolved URL. Any red → Step 3's branch, not the reaction.

- [✅] **Step 5: Stop both serves** (the landing dev server and the api's remote-preview session). Nothing to restore — the pass performed zero env swaps (Global Constraints); the scratch stays gitignored.

**Not here:** no navigation beyond `/` and `/services` (the pass is scoped, not a walkthrough); no booking-flow pages (the spec-pinned fact: booking has no imagery — nothing to consume there); no clicks on the landing beyond scrolling (the cards deep-link to `/book` — never followed); no screenshots beyond the four.

## Task 4 — the owner reactions + disposition

**Files:**
- Consumes: the twelve PNGs + both capture-logs (Tasks 2–3).
- Modify: `docs/progress.md` (append a dated section at file end — the house pattern); graphify output.
- Issue writes: #334 comment (+ close on approve), #330 closing NOTE (a comment — the close rides the owner's integration call) — approve path.

- [✅] **Step 1: Present the twelve PNGs in-session** (Read renders them), one line each naming surface, state, and the matrix leg it proves — in file order (01 the editor's bound preview … 12 the dark /services list). Do not editorialize the renderings; the owner judges. Name where each ruled decision is judged: the editor Cover field register (shots 01–08 — the four states, the placeholder tile, the machine's status lines, both themes) and the landing cover-beside-fallback adjacency with the treatment identity (shots 09–12 — the covered card riding the house tints beside the stand-ins). One framing fact to state when presenting: the home strip is the ruled **marquee** — the shot is the paused window (the track runs the cards three times; ~3 cards fit a desktop frame), so the /services grid shots (10/12) are the full-adjacency frame — all four cards visible at once. The serves are down (Task 3 Step 5) — offer to re-boot them if the owner wants to walk any surface themselves before answering.

- [✅] **Step 2: Ask the reactions — AskUserQuestion, three questions in ONE call** (ask and block; never assume while the owner may be AFK):

1. "The editor's Cover field register — the four preview states (the blob preview with 'Cover ready — save to bind it.', the stored cover preview, the muted Image-icon placeholder on pending-removal and empty), both themes: approve or adjust?" — options `Approve` / `Adjust`.
2. "The landing's cover-beside-fallback — the covered card riding the identical house treatment (ink wash + scrim, decorative lazy img) beside the documented stand-ins on the home strip and /services, both themes: approve or adjust?" — options `Approve` / `Adjust`.
3. "The services-cover feature overall, as rendered: approve or fix-list?" — options `Approve` / `Fix-list`.

The owner's words ARE the record — quote them verbatim per question in Step 3's comment (the "Other" field carries nuance; quote it too). Any `Adjust` or `Fix-list` routes through Step 4b even if another question approved.

- [✅] **Step 3: Record on #334** — post this body verbatim (the angle-bracket slots fill from the recorded facts: the date; the branch tip from Task 1 Step 1; the covered service's name; the covered URL's host; the already-bound orphan disclosure only if that path ran; the three verdicts quoted exactly):

```markdown
## Variant pass — the services-cover feature (verifying #331 + #332 + #333's landed work)

**Provenance:** a LOCAL serve of the `service-covers` branch tip `<tip>` — the exact code that will merge; the pass ran **pre-merge** per the owner's hold on the push + the spec's rendered-variants law (#330's before-done bullet; the #341 environment precedent). The api leg ran as a `wrangler dev --remote` preview on 8787 — the REAL `MEDIA_BUCKET (sevendays-media)` binding + the live DB (migration 0015 proven applied by the reads) — so the owner's bind through the editor's own flow (presign → browser PUT → commit → Save) is the real production write; the admin + landing dev serves rode `localhost:3000` serially (both apps pin the port), their already-set `API_URL=127.0.0.1:8787` untouched — zero env swaps. Captured <date> — headed Chromium for the admin act (the owner signed in; no credentials shared, stored, or committed; the owner's hands performed the upload + Save — the pass's one real write), headless for the landing act; light first, then dark (the admin's open sheet re-skinned live via next-themes' storage sync; the landing via localStorage + reload, `html.dark` asserted). Tooling: `.superpowers/334-teaser-pass/act1-admin.mjs` + `act2-landing.mjs` (gitignored, outside every suite per ADR-0022); twelve PNGs + two capture-logs.

**The matrix (twelve shots + the assert logs):**

| Shot | Surface | Leg |
|---|---|---|
| 01–02 | editor bound state — the fresh upload's blob preview + "Cover ready — save to bind it." | light / dark |
| 03–04 | editor stored state — the resolved coverImageUrl preview | light / dark |
| 05–06 | editor pending-removal — the placeholder tile after Remove (unsaved) | light / dark |
| 07–08 | editor empty state — a coverless service's placeholder | light / dark |
| 09–10 | home services strip + /services list — the covered card beside the stand-in fallbacks | light |
| 11–12 | the same two postures | dark |

**DOM-level proofs (capture-logs):** the owner's bind went through the feature's own flow on `<service>` and the read answers the resolved `coverImageUrl` (host `<host>`); the editor's four preview states asserted from their DOM discriminators — `img[src^='blob:']` + the machine's status line on bound, the exact resolved URL as the stored src, the `bg-muted` Image-glyph tile on pending-removal and empty — and **closing without saving kept the stored cover** (reopened, the stored src returned — #332's AC live-proven); the landing precedence asserted exact: the covered card's src IS the resolved `coverImageUrl` on both postures in both themes, every coverless card's src is one of the five documented stand-in paths (`service-image.ts`'s map, pinned verbatim in the rig), and all eight card imgs carry `alt=''` + `aria-hidden` + `loading='lazy'` (the treatment law — identical tints either way, judged in shots 09–12). <Only if the already-bound path ran: one orphaned `covers/<uuid>.jpg` from the re-fire's unsaved re-upload — the disclosed cost of the plan's already-bound path; the owner can remove it per the runbook.>

**Owner's reactions:** the editor Cover field register — <verdict words, verbatim>. The landing cover-beside-fallback — <verdict words, verbatim>. Overall — <verdict words, verbatim>.

**Flagged apart (not this ticket):** the nightly E2E's ADR-0022 landing visual baselines (light) have failed 3 consecutive scheduled runs (latest 44845874350, 2026-11-21T00:45Z; also 44651735229, 44434041556) — landing-side baseline drift predating this pass; needs its own triage.
```

- [✅] **Step 4a (Approve path — all three verdicts approve): close out.**

```bash
gh issue close 334 --reason completed --comment "The variant pass is rendered and the owner's three reactions record above — the acceptance boxes hold: the feature walk covered the editor's four preview states and both landing postures in both themes (on the branch build pre-merge — the same code serves the teaser when integration is called); the owner's bind went through the feature's own flow; the findings were none. The services-cover feature is accepted; #330's rendered-variants gate is satisfied."
gh issue comment 330 --body "Closing note: the services-cover spec's rendered-variants gate is satisfied by the #334 variant pass (its comment carries the twelve-shot matrix, the DOM-level proofs, and the owner's three reactions — the editor field register and the cover-beside-fallback adjacency both approved). The implementation is #331 + #332 + #333 on the service-covers branch; the pass verified it on the branch build pre-merge. The spec is done pending the owner's integration call."
```

Then append the progress section verbatim at the end of `docs/progress.md` (the date slot fills at execution; the verdict phrasing is the approve-path text):

```markdown
## 2026-11-21 — #334: the services-cover feature accepted — the variant pass + the owner's reactions

The #94 rendered-variants gate for the services-cover spec (#330) is closed: one variant pass walked the admin editor's four cover preview states (bound / pending-removal / stored / empty) and the landing's two postures (the home services strip + the /services list) across both themes — twelve PNGs + two capture-logs under gitignored .superpowers/334-teaser-pass/ (outside every suite per ADR-0022). The pass ran pre-merge on a local branch-build serve (the #341 environment precedent — the branch held unpushed): the api leg as a `wrangler dev --remote` preview (the real sevendays-media binding + the live DB — plain local dev's R2 sim would miss the real-bucket staging PUT and fail the commit; the spike proved the posture before the plan pinned it), the admin + landing dev serves on :3000 serially, zero env swaps (both frontends' API_URL already pointed at the local api). The owner's bind went through the feature's own editor flow (their photo, their service choice — the pass's one real write, staying live for the teaser when integration lands); DOM proofs rode with the shots: the four preview states from their DOM discriminators, closing-without-saving keeping the stored cover (#332's AC live-proven), the landing precedence exact on both postures both themes (the covered card's src IS the resolved coverImageUrl; every coverless card one of the five pinned stand-ins), and the decorative+lazy img laws on all eight card imgs. The owner's three reactions recorded on #334 — the editor Cover field register, the landing cover-beside-fallback, and the overall — all approve; #334 is closed and #330 carries the pass's closing note (the spec's close rides the owner's integration call). Zero code changes in this ticket — the pass verified #331 + #332 + #333's landed work; floors untouched (api 482+3, types 197, landing 18/138, admin 34/364).
```

Then:

```bash
git add docs/progress.md
git commit -m "docs: #334 — progress section; the services-cover feature accepted on the variant pass"
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#334 graph update"
```

- [ ] **Step 4b (Adjust / Fix-list path): record + route, never fix.** Post the Step 3 comment with the verdicts quoted; keep #334 AND #330 open; post a brief #330 note recording the pass + that findings are routed to fix tickets (honest, not the approve note); skip the Step 4a closes and the approve-path progress text (the progress entry instead records the pass + the findings, drafted from the owner's recorded words — no invented text). Propose the follow-up path to the owner: each finding becomes its own fix ticket via the triage discipline; the re-pass after fixes re-runs Tasks 1–3 (the rig is staged — the already-bound path covers a re-fire after any landed bind).

- [✅] **Step 5: Self-review tick + records.** `grep -c '<!-- APPEND' docs/superpowers/plans/2026-11-21-334-service-covers-teaser-pass.md` → 0 (anchors consumed); amend this plan's checkboxes to reflect what actually ran (the #338/#341 precedent — `docs:` commits; the plan file rides the branch's eventual push). The serves stopped at Task 3 Step 5; nothing to restore (zero env swaps). **The push/PR stays held — nothing is pushed in this pass; the integration call (with the #331–#333 closes + the v1 picks/ledger) is the owner's.**

**Not here:** no v1 pick work (rides the integration ceremony, main-only); no AGENTS.md edit (floors don't move; zero code); no ADR (no architectural choice — acceptance tooling on the #310/#338/#341 pattern); no fix implementation even for a one-line tuning (the fix-list is NEW tickets, always); no #330 close (the owner's integration call, never the capture alone).

---

## Self-review checklist (controller pass — run before handoff)

- [✅] **Placeholder scan:** no TBD/TODO/"as appropriate"/paraphrase requests — both scripts, the comment body, the close comments, and the progress section are verbatim; the only execution-derived slots (the date; the branch tip; the service covered; the covered URL's host; the already-bound disclosure; the owner's verdict words) are marked as such in the text. (Run 2026-11-21: the only grep hits are the Global Constraints bullet that NAMES the slots and the checklist lines quoting the markers — self-referential.)
- [✅] **Step-checkbox count:** `grep -c '^- \[ \] \*\*Step'` on this file = **23 raw / 23 real** (Task 1: 7, Task 2: 5, Task 3: 5, Task 4: 6 — Steps 1, 2, 3, 4a, 4b, 5). Fenced script/comment blocks quote no `- [ ] **Step`-shaped lines, and this checklist's own lines are ticked (`[✅]`), so the raw grep never inflates. (Verified mechanically at write time — run the grep; fix at the source if the arithmetic drifts.)
- [✅] **Shot-name consistency:** the twelve filenames named in the scripts' shot calls, Task 2 Step 4's expected list, Task 3 Step 4's expected list, Task 4 Step 1's presentation order, and the comment body's matrix table all match exactly (01–08 admin, 09–12 landing). (Run 2026-11-21: 12 shot invocations counted across the two scripts — 8 + 4 — and every consumer names the same twelve.)
- [✅] **Assert-count integrity:** act1's log carries 10 asserts (sheet-opened, cover-block count, blob count, ready line, dark-applied, bind-LIVE, stored-exact, pending-removal, cancel-kept, empty) and act2's 41 (4 checkCards × 10 — the card count, the decode gate, and 2 per card × 4 cards — plus the dark-applied assert); Task 2 Step 4 says 10, Task 3 Step 2 says 41, Task 3 Step 4 says 41. (Recounted from the actual `assert(` call sites at write time.)
- [✅] **Cross-reference consistency:** the Cover-field locators cite the verified DOM (`div.rounded-lg.border.p-4` block; `img[src^='blob:']` bound; `div.bg-muted` placeholder; the exact status line "Cover ready — save to bind it."; `button[aria-label='Edit']` row-scoped; the sheet title = the row name — never matching the 'New service' create sheet); the stand-in paths match `service-image.ts:8-15` verbatim; the stored-src assert reads the resolved URL as an exact attribute match; the theme flips assert `html.dark` in both acts; the dark-open-sheet mechanism (next-themes 0.4.6 storage listener) is probed in the pre-flight; the Cancel-keeps-cover assert mirrors #332's AC. (Anchors read from the branch source at plan time; the rig re-proves them at execution.)
- [✅] **Gate integrity:** the go gate (Task 1 Step 7 → end of turn; the fire requires "go" AND the named service) and the reaction gate (Task 4 Step 2, ask-and-block) are both blocking; the scripts never fire before their prerequisites (act1's CAPTURE_SERVICE gate exits 1 without the service; act2's exactly-one-covered gate exits 1 without the live bind); the plan never posts to an issue before the reactions record. The owner-hand waits (open editor / upload / Save) are blocking with printed guidance and never auto-advance.
- [✅] **Sibling fences:** the push/PR/merge + the #331–#333 closes + the v1 picks (owner-initiated integration ceremony), the nightly-baseline triage, every code change, the #330 close — all named in Scope fences with their owners; no fence doubles as a step. The one-write law is fenced AND script-enforced (no `Upload cover`/`Save` clicks by the controller; `Remove cover`/`Cancel` are state-only).

---

## Execution record (2026-11-21 — what actually ran)

**Filled slots:** branch tip `75ee91e` (this plan's commit — Task 1 Step 6 was satisfied at write time); service **Portraits & ID Photo**; bound URL host `pub-0e2d375a0ded418f84366c03cf37e4a8.r2.dev` (`covers/4b05b618-fd5e-45a6-ab7d-848c9ebbfe6f.jpg`); verdicts **Approve / Approve / Approve** (the owner's selected words, no Other-nuance). Artifact truth: act1 8 shots / 10 asserts all ok (exit 0); act2 4 shots / 41 asserts all ok (exit 0) — each from a single clean execution.

**Ruling 1 — the reconciliation (Task 1 Step 2's STOP branch + Task 2 Step 3's branch (b), both exercised):** the first admin fire aborted at the editor-open owner-hand wait (Task 1 Step 7's re-announce given; the owner's next "go" re-fired). The re-fire's probe answered **already-bound** — during the first fire's window the owner had performed the bind themselves, outside the automation page (the automation wrote nothing). Per the STOP law the act was killed at its auth wait (zero shots, zero writes, zero orphans), the owner confirmed the bind as theirs and chose the script's already-bound path; the re-fire ran it clean (the bound shots ride the re-fire's unsaved re-upload; Cancel, never a replace-save; `orphanedCover: true` recorded — one orphaned `covers/<uuid>.jpg`, disclosed in the #334 record).

**Ruling 2 — the act2 rig defect (Task 3 Step 3's branch (d), exercised):** the landing act's first run failed 1 of 41 asserts — the decode gate scoped `section[data-strip='services'] img` (12 imgs: the 4 originals + 8 aria-hidden marquee loop copies), while every other assert scopes the four originals via `div:not([aria-hidden]) > a:has(h3)`; the paused track's viewport-disjoint lazy copies never decode. Diagnosed a rig defect, not a broken URL (the covered R2 object decoded on three other passes in the same run); the gate re-scoped to `${scopeSel} ${cardCss}` and the **whole act re-fired clean** — the recorded log + shots come from that single execution (the plan's one-clean-run law). Both rulings are disclosed in the #334 record's Execution record paragraph (issuecomment-7062255446).

**Disposition (Step 4a ran; 4b not taken):** #334 closed completed; #330 carries the closing note (issuecomment-7062257726); `docs/progress.md` section committed (`b2e2e3f`). The push/PR/merge stays held — the integration call (with the #331–#333 closes + the v1 picks/ledger) is the owner's.





