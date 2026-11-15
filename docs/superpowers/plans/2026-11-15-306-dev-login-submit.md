# #306 — The dev admin login form's submit never fires its handler — diagnosis plan

**Goal:** identify the root cause of the dev-mode admin login form's dead submit (`localhost:3000`, hydrated page, valid form, no POST, no pending state, no console error / pageerror) and land exactly one of the brief's two sanctioned outcomes: **(A) a fix** that makes the GUI login work end-to-end in dev with the root cause recorded as a comment at the fix site, or **(B) a wontfix-with-record close** — only if the cause is proven to be a dev tooling/environment interaction rather than app code, with the diagnosis evidence on #306. Production login is untouched throughout (the deployed teaser's login is owner-verified working, #294 round 2).

**Architecture (the investigation design):** a discrimination ladder, not a guess-and-patch. The submit pipeline has four surfaces — (1) the user gesture, (2) the browser's default action → native `submit` event dispatch, (3) React's delegated listener at the root container, (4) the handler body itself — and the observed symptoms (clicks alive on `type='button'` toggles, `checkValidity() === true`, zero network) already narrow it to (1)–(3). One master bisector (`form.requestSubmit()`, which bypasses the button entirely) splits the ladder in two; each arm has cheap, decisive probes; an unresolved survivor goes through a one-variable-at-a-time bisect of the four dev-only suspects (`devtools()` vite plugin, the `<TanStackDevtools>` mount, the Sentry `instrument.ts` import, the PostHog provider). The fix never lands before the cause is identified — "it started working" without a named mechanism is not a close.

**Tech Stack:** TanStack Start admin app (`@sevendays/admin`) on the CF vite plugin dev runtime, better-auth 1.7.5 react client, react 19.2.8. Verification is a scripted browser run (the brief's AC); the browser-driving skill is `browser-use:web-gui-tester` plus throwaway Playwright probe scripts per the #294 walk precedent.

**Spec:** the #306 agent brief — https://github.com/jeius/sevendays/issues/306 (triaged `bug` + `ready-for-agent` 2026-11-15; the brief is the contract, this plan its execution). Finding provenance: the #294 round-1 repro pass (2026-11-15) — the walk characterized the symptom live (hydrated, valid, no POST, no error) and worked around it via the documented curl sign-in + cookie injection (`.superpowers/sdd/2026-11-15-294-gallery-rail-mobile/task-2-evidence.md`), but never diagnosed the root cause.

**Diagnosis ruling (the process skill):** the executor loads `superpowers:systematic-debugging` before Task 2 and follows it — reproduce first, isolate second, fix only after the cause is named. This plan is that discipline's checklist, specialized to this stack.

**UI ruling (the #94 amendment):** this ticket is **not UI-bearing** — no surface's pixels change; the login card's design, copy, and pending vocabulary are owner-ratified record and stay byte-identical. The walk skills load for browser driving only. If — and only if — the diagnosed fix turns out to alter the form's rendered markup (not just its behavior), the executor stops, loads `ui-ux-pro-max` + `ui-styling` per #94, and re-rules with the owner before that edit.

**Scope fence (sibling tickets):** #307 (the M8 fire-and-forget priming hydration race on cold CMS-route loads) is a separate ticket — its candidate levers are pinned there. This ticket's diagnosis runs on **warm loads** (reload before every pass); if the repro somehow only bites on cold loads, that is the 4D hand-off, not a fix here (Task 4). #294 is closed — nothing here re-opens its surfaces.

## Global Constraints

- Branch `fix/306-dev-login-submit` off current `main` (at `6f74c36` or later). Per-task commits with the subjects pinned per task, each ending `(#306)`. **Task 4 may produce no code commit at all** (the wontfix branch) — that is a sanctioned shape, not a missing step.
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with the floors **byte-identical** unless the fix legitimately adds a pinned test (the brief's AC allows exactly that; if a floor moves, reconcile against the test tree and record why in the PR body — never pad): **admin 30 files / 310**; **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped**; **types 18 files / 188**; **db 4 files (2 + 2 skipped) / 22 passed + 8 skipped**; **api-client 5 files / 45**; **landing 17 files / 134**. (Fresh clone: `pnpm build:packages` + `pnpm --filter @sevendays/api build` first.)
- **Version pins (read from `apps/admin/node_modules` 2026-11-15 @ `6f74c36`):** better-auth **1.7.5** (no version change — brief out-of-scope); `@tanstack/react-start` **1.168.60**; `@tanstack/react-router` **1.170.41**; `@tanstack/react-devtools` **0.10.13**; `@cloudflare/vite-plugin` **1.54.2**; react / react-dom **19.2.8**.
- **Plan-time static probes (all verified 2026-11-15 @ `6f74c36`):**
  - The login route (`apps/admin/src/routes/login.tsx`): the sign-in form is `<form className='space-y-4' onSubmit={(event) => void onSubmit(event)}>` whose submit `Button` is `type='submit' disabled={submitting}`; the handler's first statements are `event.preventDefault(); setSubmitting(true)` — so **any handler run at all would show the pending state**; its absence means the handler truly never runs. The forgot-mode form and the sign-in form share `id='login-email'` but render conditionally (never both) — **not** a candidate.
  - `apps/admin/src/lib/auth-client.ts`: `createAuthClient({})` — same-origin `/api/auth` on :3000, served by the admin worker's catch-all `src/routes/api/auth/$.ts`. The login POST never touches the api app (:8787); the api is in the stack only for post-login shell reads.
  - The vite plugin stack (`apps/admin/vite.config.ts`), in order: `devtools()` → `cloudflare({ viteEnvironment: { name: 'ssr' } })` → `tailwindcss()` → `tanstackStart()` → `viteReact()`.
  - `__root.tsx` mounts `<TanStackDevtools config={{ position: 'bottom-right' }} …>` and wraps the tree in `<PostHogProvider>` unconditionally; `router.tsx` imports `./instrument` (Sentry) first.
  - **PostHog cannot run in dev:** the provider's init guard is `typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY`, and `apps/admin/.env.local` carries only `VITE_SENTRY_DSN` (names-only read) — the key is absent, so no autocapture listeners attach. Task 3's bisect corroborates this empirically; it is not a suspect ladder arm on its own.
  - **No global listeners in app code:** `grep -rn addEventListener apps/admin/src` yields only the batch-upload abort-signal wiring — no document-level `submit`/`click` interception exists app-side.
  - The documented sign-in probe (`docs/staff-provisioning.md`): `POST http://localhost:3000/api/auth/sign-in/email` with the `Origin: http://localhost:3000` header (its absence answers `403 MISSING_OR_NULL_ORIGIN` — found live in #242); dev cookies are not `__Secure-`-prefixed.
- **Local dev stack posture (the #294-proven channels, reused verbatim):** the diagnosis runs **fully isolated on the compose test DB** (`sevendays-test-db-5433`, migrations applied). **api** — `wrangler dev -e walk` over a gitignored `apps/api/.dev.vars.walk` (a `sed` copy of `.dev.vars` with `DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test`; deleted after — wrangler dev secrets outrank shell env AND `--var`). **admin** — a temporary, checksum-verified swap of the `DATABASE_URL` + `API_URL` lines in `apps/admin/.env.local` (`API_URL=http://localhost:8787` for the session; the CF vite plugin resolves the worker's `process.env` from `.env.local`, shadowing shell env) — record `sha256sum apps/admin/.env.local` before, restore byte-for-byte after, verify the sha. **The local api (:8787) joins the stack** (post-login shell reads ride the server-to-server RPC client). **:3000 is serial-only** — the landing app is never started (it also pins :3000). Isolation proof before any probe: `GET :8787/api/v1/testimonials` answers `[]`. Known dev-stack quirks: TanStack dev HTML carries NUL bytes (`grep -a` when grepping dev-server output); both admin dev processes pin ws :9229 (serial only).
- **Warm-load discipline (#307 fence):** every repro/probe/walk pass reloads `/login` and waits for settle before interacting — a cold-load-only repro is the Task 4 branch 4D, never a fix here. The #307 hydration race (SSR skeleton vs primed data) has no mechanism on `/login` (no priming loader), but the discipline costs nothing and keeps the evidence unconfounded.
- **Staff account (test DB 5433):** the #294 walk left `gallery-walk@local.test` in the 5433 `user` table — its interactive password is known only to that session, so if it does not sign in, create a fresh throwaway per the documented path (the password is prompted interactively and never rides a flag): `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/admin create-staff --email login-probe@local.test --name 'Login Probe'`. Throwaway dev-DB rows only — nothing touches deployed environments.
- **The diagnosis contract:** every probe's exact readings land in the evidence file **before** the next probe runs; no fix is applied while any ladder arm is unresolved; bisect steps revert (`git diff` clean, verified) before the next variable; the repro either reproduces or the plan stops (Task 2's stop rule). "It works now" without a named mechanism does not close anything.
- **Probe hygiene:** throwaway probe/walk scripts live in `.superpowers/sdd/2026-11-15-306-dev-login-submit/` (gitignored, the #294 precedent) or `/tmp/login-probe/` — never committed; browser captures to `/tmp/login-probe/`. All probes run local-only — the deployed teaser is never poked except Task 7's read-only deploy watch.
- **Close paths pre-sanctioned by the brief:** `completed` (a fix landed) or `wontfix` (wontfix-with-record, dev-tooling cause proven). The only owner-escalation trigger is branch 4D (cold-load-only repro → #307 territory): record on #306, **ask the owner** whether #306 folds into #307, and wait — never assume while the owner may be AFK.
- **Deploy through CI only.** The push to main fires the `Deploy teaser (main)` run — both legs (`Deploy admin (sevendays-admin)`, `Deploy api (sevendays-api)`) must go green. **Never run any local bare `wrangler deploy`** (the #263/#264 lesson — it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`). On the wontfix branch (no code change), the deploy watch still runs (docs commits ride the same pipeline) — green on both legs, no prod behavior change expected.
- **No api/api-client/types/db change, no `packages/ui` change, no BetterAuth version change, no `wrangler.jsonc` change, no login-screen redesign, no pending-vocabulary change** (`SIGNING_IN_LABEL`/`SENDING_LABEL` and the disabled/aria-busy pattern stay byte-identical). The sanctioned app edits are exactly: Task 4's fix + its root-cause comment at the fix site (branch A/B), or none (branch C/D).
- `docs/plan.md` has no #306 box (post-M8 standalone bug) — untouched. AGENTS.md is untouched (no floor movement, no contract change).

### Not here

- **No #307 work** — the priming race, its levers, and `cms-queries` are fenced; the only interaction is the 4D hand-off record.
- **No BetterAuth upgrade, no auth config change** (`auth.ts` / `auth.config.ts` / `auth.functions.ts` untouched unless the diagnosis names them — and then only the named mechanism, never a hardening pass).
- **No component/DOM test additions to the admin suite** (the no-DOM-tests house rule) — a fix pins its law as a lib-seam test only if a pure seam actually exists post-fix; otherwise floors stay byte-identical.
- **No production-side changes** — the deployed teaser's login is verified working and must stay so; Task 7's deploy watch is the regression gate.
- **No redesign of the workaround** — the documented curl + cookie-injection channel (`docs/staff-provisioning.md`, the #294 precedent) stays as-is regardless of branch; branch C adds one runbook line to it, nothing more.
- **No e2e/visual-suite edits** — `e2e/visual/` is landing-only (ADR-0022) and never joins `pnpm check`.
- **No `docs/architecture.md`/`docs/tech-stack.md` edits; no new ADR** unless the diagnosis lands an architectural decision (a dev-runtime workaround policy would qualify — decide with the owner, never silently).

---

### Task 1: branch + plan commit

**Files:**
- Commit: this plan file (the branch's first commit)

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b fix/306-dev-login-submit
  git add docs/superpowers/plans/2026-11-15-306-dev-login-submit.md
  git commit -m "docs: the #306 dev-login-submit diagnosis plan (#306)"
  ```

### Task 2: the live repro + the discrimination ladder (P0–P4) — controller-run, no commit

If the repro does not reproduce, the plan stops — a diagnosis without a repro is a guess. Evidence lands in `.superpowers/sdd/2026-11-15-306-dev-login-submit/evidence.md` as the task runs (one section per step, readings verbatim).

**Files:**
- None on the repo. Evidence + throwaway probe scripts in `.superpowers/sdd/2026-11-15-306-dev-login-submit/`; captures in `/tmp/login-probe/` (never committed).

**Interfaces:**
- Consumes: the dev-stack posture (Global Constraints), the documented sign-in probe, `browser-use:web-gui-tester` for interactive driving + plain node/Playwright scripts for the instrumented passes (the #294 `task2-walk.mjs` pattern).
- Produces: the repro record (the four symptoms re-confirmed) + the ladder readings that decide Task 4's branch; the warm-loaded stack reused by Tasks 3–5.

- [ ] **Step 1: start the stack (the proven channels) + the staff account**

  ```bash
  # Terminal A — the local API (:8787) over the env-scoped dev-vars copy:
  sed 's|^DATABASE_URL=.*|DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test|' apps/api/.dev.vars > apps/api/.dev.vars.walk
  cd apps/api && pnpm exec wrangler dev -e walk
  # Terminal B — the admin (:3000) after the checksum-verified .env.local swap:
  #   sha256sum apps/admin/.env.local   # record it
  #   swap DATABASE_URL → 5433 test DB, API_URL → http://localhost:8787
  pnpm --filter @sevendays/admin dev
  ```

  Wait for both readiness lines. Isolation proof: `GET :8787/api/v1/testimonials` → `[]`. Sign in or create the staff account per the Global Constraints account rule (try `gallery-walk@local.test`; else `create-staff` the pinned throwaway with an interactive password).

- [ ] **Step 2: reproduce (P0 — the warm-load repro, the plan's stop gate)**

  In a **fresh browser context with no injected cookies** (the whole point — the #294 cookie workaround is off), open `http://localhost:3000`, land on `/login`, let hydration settle. Then, via real events only:

  1. Fill both inputs (`login-email`, `login-password`) — click each, type the account's credentials.
  2. Record the pre-click state: `document.querySelectorAll('form').length`, `form.checkValidity()`, whether any node matches `:invalid`.
  3. Click the `Sign in` button. Watch: the network log (any request at all to `/api/auth/sign-in/email`), the button label (does it ever show `Signing in…`), console messages, `pageerror` events.
  4. Reload (warm load — the P0 discipline), re-fill, press **Enter** in the password field. Watch the same four channels.

  **Expected (red — the repro):** both gestures produce no POST, no pending label, no console error, no pageerror — matching the issue's four symptoms. **Also record the forgot-mode controls as the live-witness baseline:** click `Forgot password?` (the panel must switch — React events alive), then `Back to sign in`.

  **Stop rule:** if the submit **works** on this warm repro (POST fires, the shell loads) — the bug does not reproduce today. Do not edit anything: post the pass on #306 as a triage note with the stack posture + probe readings, flip it back to `needs-info`, and stop. The plan ends there.

- [ ] **Step 3: P2 — the master bisector, `form.requestSubmit()`**

  All probes below run through the browser tool's `evaluate` (or an equivalent throwaway Playwright script) on a warm-loaded, filled `/login`. **Install the instrument first, then bisect:**

  ```js
  () => {
    // The sign-in form owns the password input — locate via the button, not querySelector,
    // so a stray extra form can't mis-target the probe.
    const btn = [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes('Sign in'));
    const form = btn?.closest('form');
    if (!form) return { fatal: 'no submit button inside a form' };
    window.__probe = { submit: 0, invalid: 0 };
    form.addEventListener('submit', () => {
      window.__probe.submit++;
      console.warn('[probe] native submit fired');
    });
    form.addEventListener('invalid', () => window.__probe.invalid++, true);
    const propsKey = Object.keys(form).find((k) => k.startsWith('__reactProps$'));
    const fiberKey = Object.keys(form).find((k) => k.startsWith('__reactFiber$'));
    return {
      formCount: document.querySelectorAll('form').length,
      btnType: btn.type, btnDisabled: btn.disabled,
      formAssoc: btn.form === form, checkValidity: form.checkValidity(),
      noValidate: form.noValidate,
      propsKey: propsKey ?? null, fiberKey: fiberKey ?? null,
      propsOnSubmit: propsKey ? typeof form[propsKey].onSubmit : null,
    };
  }
  ```

  **Expected sanity before bisecting:** `formAssoc: true`, `checkValidity: true`, `propsOnSubmit: 'function'`, exactly one form. If `propsOnSubmit` is `undefined`/missing → **React never attached (or lost) the handler prop** — record it and go to Task 4 branch A with this as the prime evidence (a hydration/DOM-swap mechanism). If `formAssoc: false` → the button↔form association is broken — record, branch A. Otherwise bisect:

  ```js
  () => { document.querySelector('button[type="submit"]').form.requestSubmit(); return window.__probe; }
  ```

  - **Branch α — handler runs, POST fires, the shell loads:** the JS chain is healthy end-to-end; the breakage is only in how the user gesture initiates submission → Task 2 Step 4 (P3).
  - **Branch β — `window.__probe.submit === 0` and `invalid === 0`:** the submit event never dispatches even on the direct API call → Task 2 Step 5 (P4).
  - **Branch β' — `invalid > 0`:** interactive validation is failing despite `checkValidity() === true` — record which field reports invalid and why (`el.validity`), branch A.

- [ ] **Step 4: P3 — the gesture→default-action arm (branch α)**

  Install the who-dunnit layer (late document-level bubble listeners see `defaultPrevented` already set; the patched `preventDefault` names the caller):

  ```js
  () => {
    ['click', 'keydown'].forEach((t) =>
      document.addEventListener(t, (e) => {
        if (e.defaultPrevented) console.warn('[probe] defaultPrevented', t, e.target?.tagName);
      })
    );
    const orig = EventTarget.prototype.preventDefault;
    EventTarget.prototype.preventDefault = function (...a) {
      if (this instanceof Event && ['click', 'keydown', 'submit'].includes(this.type)) {
        console.warn('[probe] preventDefault', this.type, new Error().stack);
      }
      return orig.apply(this, a);
    };
    return 'installed';
  }
  ```

  Then click the real `Sign in` button and record: whether the patched `preventDefault` logged (and whose stack — the frame above `[probe]` is the culprit), whether the document listener saw `defaultPrevented`, and where the click actually landed:

  ```js
  () => {
    const btn = [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes('Sign in'));
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { hitIsButton: hit === btn || btn.contains(hit), hitTag: hit?.tagName,
             hitText: hit?.textContent?.slice(0, 40) ?? null };
  }
  ```

  (A `hit` that is not the button — e.g. an iframe or overlay — names an intercepting surface; the TanStack devtools mounts bottom-right, the card is centered, but a stale-size overlay is exactly what this probe exists for. Run it at the walk viewport **and** at 1280×800.)

  Also re-press Enter with the keydown listener live. Record everything; the culprit frame or the clean reading decides Task 4.

- [ ] **Step 5: P4 — the dispatch/delegation arm (branch β)**

  With the Step 3 instrument still installed, re-run `requestSubmit()` and additionally record whether the **native** listener on the form fired at all:

  - `window.__probe.submit === 0` after a direct `requestSubmit()` **and** the Step 3 patched `preventDefault` logged a `submit` entry → someone cancels the submit event before default dispatch — the patched stack names them. Branch A (or B, per who it is).
  - `submit === 0` **and no preventDefault log** → the event is never dispatched — React-delegation-adjacent but below it; go to Task 3's one-variable bisect (P5) with this reading as the baseline, since the app layer has nothing left to name.
  - `submit > 0` but the React handler still silent → **delegation death**: the event reaches the DOM, React's root-container listener doesn't fire it. Record the form's `__reactProps$`/`__reactFiber$` keys (Step 3's `propsOnSubmit` was healthy) and go to P5 — this reading in hand, the bisect is decisive.

- [ ] **Step 6: tear down nothing yet; write the evidence file**

  The stack stays up for Task 3. Summarize in `evidence.md`: the repro record (Step 2), the P2 branch taken with readings, the P3/P4 readings (whichever arm ran), and the named suspect or the honest "unresolved, entering bisect". Commit nothing.

### Task 3: the one-variable dev-only bisect (P5) + local prod parity — controller-run, no commit

Runs only if the ladder left the cause unnamed (P4's second or third bullet). Each step flips **one** dev-only variable, restarts the admin, warm-loads, re-fills, clicks, records — then **reverts** and verifies `git diff` clean before the next. If an earlier step already named the culprit, skip to Task 4.

**Files:**
- Edited ad hoc and always reverted: `apps/admin/vite.config.ts`, `apps/admin/src/routes/__root.tsx`, `apps/admin/src/router.tsx` (never committed in this task).

- [ ] **Step 1: bisect the four dev-only suspects, one restart per variable**

  1. `vite.config.ts`: comment the `devtools(),` line (unique in the file) → restart → warm repro.
  2. `__root.tsx`: comment the whole `<TanStackDevtools …> … </TanStackDevtools>` JSX block (lines 76–86 at plan time; content-anchored) → restart → warm repro.
  3. `router.tsx`: comment `import './instrument';` (unique) → restart → warm repro.
  4. `__root.tsx`: bypass the PostHog wrapper — replace `<PostHogProvider>…</PostHogProvider>` with its bare children → restart → warm repro. (Statically unlikely per the Global Constraints pin; one restart proves it.)

  Record per variable: revived or not, with the same four symptom channels. If a variable revives the submit, the culprit surface is named — stop bisecting, revert, and go to Task 4 with the reading. If **all four** leave the submit dead, run Step 2.

- [ ] **Step 2: local prod parity (corroboration only)**

  ```bash
  pnpm --filter @sevendays/admin build
  cd apps/admin && dotenv -e .env.local -- pnpm exec vite preview --port 4173
  ```

  Warm-load `http://localhost:4173/login`, fill, click. If the form submits → the defect is dev-runtime-specific (the deployed teaser's working login is consistent — the brief's "dev-only as far as observed" holds). If it **also** fails → the app code itself carries the defect and the teaser's "working" is environment-shaped (different cookie config/origin) — record this carefully; it strengthens branch A and adds a prod-relevant note for the owner. **Caveat pinned:** the preview env channel is unproven (the #294 walks proved only the dev channel); if the auth POST answers 5xx on missing env wiring, record it and treat the probe as skipped, not as parity evidence. Kill the preview server after.

- [ ] **Step 3: restore obligations, write the evidence**

  Every bisect edit reverted (`git diff` clean, verified). Summarize the bisect table + the parity verdict in `evidence.md`. The stack stays up for Task 5. Commit nothing.

### Task 4: the fork — fix or document (the evidence decides)

**Files (branch-dependent):**
- Branch A (app-code fix): edit + comment at the named site (e.g. `apps/admin/src/routes/login.tsx`, or wherever the diagnosis named) — exactly one mechanism, no hardening pass.
- Branch B (dev tooling/config fix): the named config/runtime lever (e.g. `vite.config.ts` / `__root.tsx`) — behavior-preserving in prod, verified by Task 7's deploy watch.
- Branch C (wontfix-with-record): `docs/staff-provisioning.md` only — one runbook line, no code.
- Branch D (cold-load-only repro): no edit — the record + the owner ask.

- [ ] **Step 1: take the branch the evidence names (decision table)**

  - **4A/4B — the cause is named** (a probe reading or a bisect variable identified the mechanism, quoted in `evidence.md`): implement the minimal fix at that site. If the fix removes or diminishes a dev convenience (e.g. dropping the devtools plugin), flag it in the PR body and the #306 comment as a dev-experience trade-off the owner may re-rule — never silently. Then the root-cause comment **at the fix site**, this template filled from the evidence file (the slots quote `evidence.md` verbatim — no paraphrase):

    ```tsx
    // #306 root cause (diagnosed 2026-11-<d>): <the mechanism, 1–3 sentences —
    // naming the exact actor and quoting the decisive probe reading from
    // .superpowers/sdd/2026-11-15-306-dev-login-submit/evidence.md verbatim>.
    // Fix: <what changed and why this is the minimal lever>.
    ```

    Commit: `git commit -m "fix(admin): <the named mechanism, one line> (#306)"`.
  - **4C — the cause is a dev tooling/environment interaction with no clean fix** (proven, not assumed): no code. Write the one runbook line after the documented probe in `docs/staff-provisioning.md` (the section "With `pnpm --filter @sevendays/admin dev` running (port 3000)"), this template filled from `evidence.md`:

    ```markdown
    > The dev login **UI** is dead by <root cause — 1–2 sentences>: the form's
    > submit never fires its handler (<decisive evidence line>). Mint the
    > session with the probe below and inject the cookies in the browser
    > (the #294 walk pattern) — or fix the cause; the production login is
    > unaffected (<the parity/teaser evidence line>).
    ```

    Commit: `git commit -m "docs: record the dev login submit root cause in the staff-provisioning runbook (#306)"`.
  - **4D — the repro only bites on cold loads** (the warm-load discipline failed to reproduce after three honest attempts, and a cold load does): **stop**. Post the readings on #306 as a comment cross-referencing #307's mechanism, **ask the owner** whether #306 folds into #307 or stays open as its own diagnosis, and wait — never assume while the owner may be AFK. The plan ends there (Tasks 5–8 do not run on this branch).

  **Never-branch:** the diagnosis exhausted the ladder *and* the bisect without naming anything — do not invent a sixth suspect mid-task. Post the full probe record on #306, leave it **open** (`needs-info`), and stop. An unresolved state with a complete evidence trail is an honest deliverable; a shotgun fix is not.

### Task 5: the verification walk (branches A/B only — the brief's ACs, scripted)

The stack from Task 2 is still live (restart per the Global Constraints posture if it died). Scripted browser run — the walk script lives in `.superpowers/sdd/2026-11-15-306-dev-login-submit/login-walk.mjs` (plain node over the repo's installed Playwright, the #294 pattern; `pnpm exec playwright install chromium` first if the browser is missing). Captures to `/tmp/login-probe/`.

**Files:**
- None on the repo.

- [ ] **Step 1: AC1 — the end-to-end GUI login**

  Fresh context (no injected cookies), `http://localhost:3000`, warm load. Fill both inputs via real events; **click** `Sign in`. Assert: a POST to `/api/auth/sign-in/email` fires and answers **200**; the browser lands off `/login` (the shell route); a CMS screen renders its data (the local api :8787 serves the reads). Capture `/tmp/login-probe/after-login-shell.png`.

- [ ] **Step 2: AC2 — the Enter path**

  Fresh context, warm load, fill both inputs, **press Enter** in the password field. Same assertions as Step 1.

- [ ] **Step 3: AC3 — the credential-failure path (the anti-enumeration law intact)**

  Fresh context, fill a valid-shape email + a wrong password, click `Sign in`. Assert: the POST answers 401 and the ONE generic line renders (`role='alert'`, text `Invalid email or password.`) — the failure branch works and the generic-by-design law is untouched.

- [ ] **Step 4: AC4 — the forgot-password toggle + reset posture (the same card hosts both modes)**

  From the login screen: click `Forgot password?` → the reset panel swaps in (heading `Reset your password`); submit the account email → the generic line (`If that account exists, a reset link is on its way.`) renders regardless of outcome (the anti-enumeration design; the email round-trip itself is out of scope — dev has no Resend); `Back to sign in` returns the sign-in panel. The sign-in form still submits after the round-trip (one click → 200 → the shell).

- [ ] **Step 5: the walk verdict**

  All four ACs green → Task 6. Any failure → stop, post the reading + capture on #306, leave open — never iterate the fix blind (a failing walk after a fix means the mechanism was misnamed; re-enter the ladder at the failing probe).

### Task 6: the progress record

**Files:**
- Branch A/B — edit: `docs/progress.md` (one What-Exists bullet).
- Branch C — edit: `docs/progress.md` (one Known-Gaps line).

- [ ] **Step 1: append the record (branch-shaped, the slots filled from the evidence)**

  Branch A/B — directly after the last What-Exists bullet (content-anchored: the `## Known Gaps / Not Yet Done` heading must still follow it):

  ```text
  - The **dev admin login works end-to-end via the UI** (2026-11-15, #306): the sign-in form's dead submit — hydrated page, valid form, no POST, no error — was root-caused to <mechanism> and fixed by <the minimal lever>. Verified by the scripted walk: click and Enter paths both POST `/api/auth/sign-in/email` (200) and land the shell; the credential-failure line and the forgot-password toggle/reset posture unchanged. Production login was never broken (the deployed teaser, owner-verified in #294 round 2) and is regression-gated by the deploy watch.
  ```

  Branch C — append under `## Known Gaps / Not Yet Done`:

  ```text
  - The **dev admin login UI's submit never fires** (2026-11-15, #306, wontfix-with-record): root-caused to <mechanism — a dev tooling/environment interaction, not app code>; the workaround is the documented sign-in probe + cookie injection (`docs/staff-provisioning.md`). Production login unaffected.
  ```

  Commit: `git commit -m "docs: the #306 dev-login record in progress.md (#306)"`.

### Task 7: gates, push, PR, merge, watch the deploy

**Files:** none new.

- [ ] **Step 1: gates** — from the repo root (fresh clone: `pnpm build:packages` + `pnpm --filter @sevendays/api build` first):

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Green 35/35, floors per the Global Constraints (byte-identical on branches C/D; on A/B identical unless the fix legitimately added a pinned test — any move is reconciled and recorded in the PR body, never padded).

- [ ] **Step 2: push + PR** (the title is branch-shaped: A/B `fix(admin): the dev login form's submit works — <mechanism one-liner> (#306)`; C `docs: record the dev login submit root cause in the runbook (#306)`. The body's branch lines: A/B quote the mechanism + the walk verdict; C quotes the root cause + the wontfix-with-record ruling source):

  ```bash
  git push -u origin HEAD
  gh pr create --title "<the branch-shaped title per above>" --body-file - <<'EOF'
  #306, found during the #294 walks: on the dev admin (:3000), the sign-in form's submit never fired its handler — hydrated page, valid form, no POST to /api/auth/sign-in/email, no pending state, no console error, no pageerror. Production login was never affected (owner-verified on the teaser, #294 round 2).

  - **Root cause (diagnosed <date>):** <mechanism — 2–4 sentences; the decisive probe reading quoted from the evidence file>.
  - **The change:** <branch A/B: the minimal fix + the root-cause comment at the fix site | branch C: none — wontfix-with-record, the runbook line in docs/staff-provisioning.md>.
  - **Verified:** the scripted walk (click + Enter → 200 → the shell; the generic failure line; the forgot toggle/reset posture) <branch A/B only — omit on C>; `pnpm check` 35/35, floors <byte-identical | as recorded>.
  - <If the fix diminishes a dev convenience: the trade-off line for the owner's re-ruling.>
  EOF
  ```

- [ ] **Step 3: CI green on the PR, then squash-merge.** Record the merge SHA.

- [ ] **Step 4: watch the deploy** — `gh run list --branch main --limit 1`, verify the run's head SHA matches the merge SHA (the #271 lesson), then `gh run watch <run-id>` until the `Deploy teaser (main)` legs finish. **Both legs green: `Deploy admin (sevendays-admin)` AND `Deploy api (sevendays-api)`.** Record the run id (the restore vehicle: `gh run rerun <run-id>`). On branch C the code is unchanged — green is the expectation, never skipped.

### Task 8: the evidence comment, the close, graphify, the v1 pick

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row — main-side, direct commit per the ledger precedent)

- [ ] **Step 1: post the evidence comment on #306 and close it** (branch-shaped; fill every `<…>` from `evidence.md` verbatim):

  ```bash
  gh issue comment 306 --body "Root cause diagnosed (full probe record: the plan's evidence file — key readings below).
  - Repro: warm load, fresh context — click and Enter both dead (no POST, no pending label, no console error, no pageerror); the forgot-mode toggle stayed live (events alive).
  - Decisive probe: <the P2 branch + the reading that named the mechanism>.
  - <Branch A/B> Fix: <mechanism one-liner> — PR #<PR>, merge <sha>, deploy run <run-id> both legs green. Walk: click + Enter → 200 → the shell; failure line + forgot posture intact.
  - <Branch C> wontfix-with-record: <mechanism> — a dev tooling/environment interaction, not app code; workaround recorded in docs/staff-provisioning.md; production login unaffected (teaser owner-verified, #294 round 2)."
  gh issue close 306 --reason <completed | not planned>
  ```

- [ ] **Step 2: graphify** — only on branches A/B (a symbol's behavior changed):

  ```bash
  git checkout main && git pull --ff-only
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#306 graph update"
  git push origin main
  ```

  (Branch C is docs-only — no graph update; the checkout/pull above is unnecessary.)

- [ ] **Step 3: the v1 pick** — triage per `docs/agents/v1-picks.md`: `node scripts/v1-triage.mjs <merge-sha>`. Expected shape: **A/B → SPLIT** (the fix's file — e.g. `login.tsx` or `vite.config.ts` — v1-paths; `docs/progress.md` and the plan file are main-only drops) or **C → main-only** (docs-only: v1 drops `docs/`; if the classifier returns nothing to pick, record that verdict in the ledger row and skip the cherry-pick). Execute the pick per the runbook (cherry-pick the squash commit onto `v1`, resolve main-only paths as drops), then from the **main repo root**:

  ```bash
  pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  node scripts/audit-v1-absence.mjs HEAD --repo <v1-worktree-path>   # main-root invocation — the in-worktree run MODULE_NOT_FOUNDs (the #286 lesson); expect exit 0 / PASS 0/18
  git push origin v1
  ```

  Watch the run **sha-verified** (the #271 lesson): `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Record the actual v1 floors (expected: **admin 30 files / 310**; **api 31 files (30 passed + 1 skipped) / 392 passed + 3 skipped** — v1's own; on branch C with no pick, no v1 run happens — record the skip).

- [ ] **Step 4: the ledger row** — one row appended to `docs/agents/v1-picks.md` (the #294/#289 rows as the format template; `<…>` cells execution-filled):

  ```text
  | 2026-11-<d> | #<PR> | <merge-sha> | <actual classifier class> | <v1-sha | no-pick> | #306 — the dev admin login form's submit never fired its handler (root-caused <mechanism>; <branch A/B: fixed by the minimal lever + the root-cause comment at the fix site, verified by the scripted walk — click/Enter → 200 → shell, failure line + forgot posture intact | branch C: wontfix-with-record, the runbook workaround line>; production login unaffected throughout). Classifier <actual> — <v1-paths + main-only drops, or "docs-only, nothing to pick">. Content pass <clean | findings>. Locks on <v1-sha>: <floors as recorded | no-pick skip>. Run <run-id | —>: <leg verdicts>. Main side: PR #<PR> squash-merged after CI green; the evidence comment on #306. |
  ```

  Commit:

  ```bash
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #306 ledger row - the dev-login submit fix (carries)"
  git push origin main
  ```

---

## Self-review notes for the executor

- **Pin inventory (all read/probed 2026-11-15 @ `6f74c36`):** the version pins; the `login.tsx` handler shape (`preventDefault` → `setSubmitting(true)` first — the no-pending-state observation proves the handler never ran); the shared `id='login-email'` conditional render (not a candidate); `createAuthClient({})` same-origin; the admin's own `/api/auth` catch-all serving the POST on :3000; the vite plugin stack order; the `__root.tsx` devtools/PostHog mounts; the router's first-import Sentry instrument; the PostHog init guard + the absent `VITE_POSTHOG_KEY`; the app-source global-listener grep (0 submit/click hits); the documented curl probe + the `Origin` requirement; the check floors (admin 30/310, api 34 files / 471+3sk, types 18/188, db 4 files / 22+8sk, api-client 5/45, landing 17/134); the dev-stack posture channels (proven live in the #294 walks); the 5433 staff-row precedent.
- **No type-inference spike needed** — the plan makes no library inference claim; every behavioral claim is proven live by the ladder before any edit. The two semantics the probes rely on are HTML-spec facts, not version claims: `requestSubmit()` runs interactive validation (fires `invalid`, not `submit`, when invalid) and dispatches the `submit` event directly, bypassing the submit button — which is exactly what makes it the master bisector between the gesture arm (P3) and the dispatch arm (P4).
- **The ladder's discrimination logic, stated once:** clicks alive on `type='button'` toggles prove React's event system works — so the failure is submit-specific. `requestSubmit()` bypasses the button: if it works, the button↔form activation path is broken (P3: association/overlay/preventDefault); if it doesn't, the dispatch/delegation layer is (P4: native listeners + React props keys). Either way one reading names the arm; the bisect (P5) exists for the residual "unnamed" case, not as a first resort.
- **Test-count arithmetic:** branches C/D move nothing. Branches A/B move nothing unless the fix leaves a pure seam worth pinning (the no-DOM-tests house rule stands) — if a floor moves, reconcile against the test tree and say so in the PR body; never pad.
- **If line numbers shifted** (an intervening commit): every edit/anchor here is content-anchored, not line-anchored; a ≠1 match means drift — stop and reconcile.
- **The stop rules are load-bearing:** Task 2 Step 2's no-repro stop, Task 4's never-branch, and Task 5's failing-walk stop all leave #306 **open** with the evidence trail — an honest unresolved state outranks a plausible fix every time. The brief's two close paths are the only closes; branch 4D adds the owner to the loop before anything moves.
- **Every deliberate non-feature has its pin:** no #307 work, no BetterAuth/config hardening, no DOM tests, no production changes, no redesign, no e2e edits, no ADR (unless the diagnosis lands a policy decision — owner first). A reviewer proposing any should be pointed at the matching pin.

