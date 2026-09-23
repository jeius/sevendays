# M4 Ticket 03 — Login UI + _shell Session Gate (owner-ruled hybrid composition) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The browser-visible half of admin auth: a staff member reaches `/login`, signs in with CLI-provisioned credentials, and lands in the gated admin shell at the URL they aimed for; arriving signed-out at any admin URL bounces to `/login` preserving the aimed URL; the shell's user card shows the signed-in identity from the gate's own session fetch and signs out to revocation; wrong credentials render one generic line; the v2-stub screens render unchanged behind the gate — on the design system, in the owner-ruled composition, with `pnpm check` green.

**Architecture:** Six tasks: (1) the browser auth client + the `/login` route (public, outside `_shell`) transcribing the owner-ruled hybrid composition, (2) the `_shell` `beforeLoad` session gate with redirect preservation + identity-in-context, (3) the sidebar user card's live identity + inline sign-out, (4) the live dev verification (curl gate matrix + provisioning a second staff user + revocation + rendered frames), (5) the full gate + docs rotation + PR/merge with the watched deploy, (6) the v1 pick + ledger row + issue close. Every type-inference claim in Tasks 1–2 was spike-proven against the installed toolchain during planning (throwaway files + `tsc --noEmit` in `apps/admin`, then deleted, tree restored); the composition and every owner-facing string were ratified by the owner reacting to rendered variants in-session (spec #94 amendment) and are pinned verbatim in Global Constraints — executors transcribe, they do not redesign.

**Tech Stack:** better-auth `1.7.5` (lockfile-resolved; v1.7 docs line — `better-auth.com/docs/llms.txt`), TanStack Start/Router (resolved `@tanstack/react-start@1.168.56` / `@tanstack/react-router@1.170.38` — the #118/#119-pinned line), `@sevendays/ui` (Tier-1 primitives: card, input, label, button + the semantic token layer), zod 4 (`^4.5.1`, already a dependency), pnpm + Turborepo, `chrome-headless-shell` (for rendered frames), GitHub Actions + `gh` CLI.

**Spec:** Implements ticket [#120 "M4 ticket 03 — Login UI + _shell session gate (UI-bearing; variants per #94)"](https://github.com/jeius/sevendays/issues/120) (label `ready-for-agent`), whose parent is the M4 spec `docs/specs/2026-09-22-m4-admin-auth-spec.md` (issue #117 — § Login UI + shell gate is this ticket's section, over § The admin auth server's "Client" + "Session checks server-side" subsections). Key recon facts (2026-09-22, main `ad8e123` — #118 + #119 are merged and live in dev):

- **The owner's variant rulings (2026-09-22, in-session HITL — the ticket's first AC):** three login compositions were rendered on a throwaway prototype route (`/prototype-login?variant=A|B|C` + a user-card affordance strip) on the live design system, screenshot into `.superpowers/sdd/2026-09-22-120-login-shell-gate/`, and reacted to by the owner. Rulings: **composition = a HYBRID — variant B (split: ink brand band left, wash form panel right) at `lg` and up; variant C (full ink canvas with a soft petrol glow, card floating) below `lg`**; **card copy = the "Warm" set** (h1 "Welcome back" / subline "Sign in to the Sevendays studio console" / caption "Accounts are provisioned by the studio owner."); **user card = "Option 2 — inline button"** (avatar + name + email + an inline logout icon button; one click signs out; the collapsed icon rail stacks avatar above the logout button). The prototype is captured at branch `prototype/120-login-variants` (commit `84aebd0`, never merged — prototype-skill rule 6); main keeps only the ruling, which this plan transcribes. Every owner-facing string is pinned in Global Constraints.
- **The mounting/type claims are spike-proven end-to-end (2026-09-22, this machine, then deleted with the tree restored):** a pathless layout with `beforeLoad: async ({ location }) => { const session = await getSession(); if (!session) throw redirect({ to: '/spike-login', search: { redirect: location.href } }); return { user: { name: session.user.name, email: session.user.email } }; }` typechecks clean in `apps/admin`, as does reading that return via `Route.useRouteContext()` in the layout component; a login route with `validateSearch: z.object({ redirect: z.string().optional() })` types `Route.useSearch()`'s `redirect` as `string | undefined`; `createAuthClient()` from `better-auth/react` with the calls `authClient.signIn.email({ email, password })` (destructured `{ data, error }`; `error.code: string | undefined`, `error.status: number`, `error.message`; after an `if (error) return` the `data.user.name` is `string`) and `authClient.signOut()` all typecheck. The spike also proved ordering matters: `redirect({ to: '/login', search: { redirect } })` is typed AGAINST the login route's `validateSearch` schema — the login route (Task 1) must exist before or with the gate (Task 2); both land before typecheck in this plan's task order, which satisfies it.
- **The client needs NO plugin and NO configuration:** `createAuthClient()` with no args resolves same-origin `/api/auth` (the BetterAuth v1.7 client docs: "If the auth server is running on the same domain as your client, you can skip this step" — baseURL omission is the documented same-origin form). CORRECTED at the final review (2026-09-23): better-auth 1.7.5's client sets `credentials: "include"` itself (`dist/client/config.mjs:39`) — the session cookie rides by that config, not the bare Fetch default; `@better-fetch/fetch@1.3.2` has zero credentials overrides (that grep holds). The same-origin conclusion is unchanged. There is no `adminClient` and no `useSession` hook in this build (the spec: session checks are server-side; identity flows from the gate).
- **Search-param parsing is JSON-ish (live-verified this session, recorded for the executor):** TanStack Router's default search parsing turns `?err=1` into the NUMBER `1` — a `z.literal('1')`/`z.boolean()` schema throws and the router 307-canonicalizes to the serialized form (`?err=1` → `?err=true`). This plan's only search param is `redirect`, whose value is always a path STRING (`/packages`), so plain `z.string().optional()` is correct and needs no coercion; the guard against open redirects happens at navigation-consumption (pinned in Task 1), not in the schema.
- **Prior-cycle rulings that bind this ticket:** T1-R1 — the committed `routeTree.gen.ts` is the `tsr generate` form WITHOUT the vite `Register` footer; a running dev server re-adds the footer, so after Task 4 stops the dev server the file is restored to HEAD (`git checkout -- apps/admin/src/routeTree.gen.ts`) and the Task 6 v1 pick applies the footer-less hunk. T5-R1 — auth POSTs force origin validation; curl probes to `/api/auth/sign-in/email` and `/sign-out` MUST send `Origin: http://localhost:3000` (browsers send it natively — only curl needs the explicit header). T5-R2 — the session cookie is `better-auth.session_token` with value `<token>.<signature>`; probes never compare full cookie strings to row tokens.
- **Repo state (live reads, 2026-09-22):** `apps/admin/src/routes/_shell.tsx` is the pathless layout (`SidebarProvider` → `AdminSidebar` + `AdminTopbar` → `SidebarInset` → `Outlet`) with NO `beforeLoad` yet — its header comment already says "M4's login can mount outside it without restructuring". `apps/admin/src/components/admin-sidebar.tsx`'s `SidebarFooter` renders the placeholder identity (`SO` chip, "Studio Owner", "Owner") with the comment "the data swaps, the shell stays" — Task 2/3 perform exactly that swap; the rail-collapse idiom in-file is `group-data-[collapsible=icon]:hidden` on the text block. `apps/admin/src/lib/auth.functions.ts` (#119) exports `getSession`/`ensureSession` — the gate consumes `getSession` AS-IS (it returns `{ session, user } | null`); this ticket never edits it, `auth.ts`, `auth.config.ts`, or `routes/api/auth/$.ts` (#119's frozen set). The token layer already maps `--background` to the petrol wash base and `--card` to white GLOBALLY (`packages/ui/src/tokens.css`) — the register is reached with semantic classes only (`bg-background`, `bg-card`, `bg-brand-ink`, `text-brand-200`/`text-brand-300`, `bg-brand-deep/60`), no theme edits. House patterns followed: per-route `head` titles (`'Packages | Sevendays Admin'` — login gets `'Sign in | Sevendays Admin'`), one `h1` per screen (stub-screen precedent: `text-lg font-semibold`), `autocomplete="email"` / `autocomplete="current-password"` (WCAG 2.2 accessible-authentication — password managers and paste stay enabled). Screenshot tooling lesson (live-verified this session): `chrome-headless-shell` screenshot mode HANGS on this WSL host with GPU compositing or `--virtual-time-budget` against vite's HMR websocket — the working invocation is `--headless --disable-gpu --no-sandbox --screenshot=… --window-size=W,H --hide-scrollbars` (dbus stderr noise is expected); the binary lives at `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`. `pnpm check` baseline is 35/35 turbo tasks (#119-recorded; this ticket adds NO test files — the spec's testing posture verifies admin auth wiring by the live gate, not a suite; admin's no-op `test` script is the known standing gap). Dev port 3000 must be verified free before boot (the #119 pattern).
- **Sibling fences (spec § Tickets; `docs/plan.md`'s M4 block):** #121 owns the api verification instance, `requireSession`, appointments-list gating, and the admin seam's `getSessionScopedApiClient()` — any edit under `apps/api`, any `api.server.ts`/`api.functions.ts` change is OUT of this ticket. #122 owns the live Worker secret/var puts on all four targets, the teaser/v1 live gates, and the docs rotation beyond progress/plan.md (`tech-stack.md` Auth section, `AGENTS.md` auth-state flip, CONTEXT glossaries) plus roadmap checkboxes 3 and 8 — not here. Shared roadmap checkbox discipline: `docs/plan.md` line 117's checkbox ("Login UI + shell gate: … sign-out in the shell user card") is EXACTLY this ticket's deliverable → ticked with a dated annotation in Task 5; checkboxes 3 and 8 stay unticked (#122).
- **v1-picks state:** the ledger (`docs/agents/v1-picks.md`) is drained through #119 (row commit `ad8e123`). This PR is booking-free by construction and touches only admin-app files → **PICK** expected (v1-paths: the four app files whole + the footer-less routeTree hunk per T1-R1 or seed-side regeneration; main-only: the docs rotation and this plan, content-dropped per the classifier's edition-vocabulary rule).

## Global Constraints

- **Branch & baseline:** `feat/120-login-shell-gate` off main `ad8e123` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#120)` squash style; every commit below is pinned verbatim.
- **Gates (repo AGENTS.md, verbatim duties):** do not commit code that fails `pnpm check` (lint + format + typecheck + test; expected 35/35 turbo tasks — this ticket adds no test files and no check-pipeline scripts, so the count is unchanged from the #119-recorded baseline; if it differs, reconcile before proceeding). After any fresh clone, `pnpm build:packages` must precede `pnpm check`. Tick checklist boxes with `- [✅]`, never `[x]`. Run `graphify update .` at close (code was modified). Evidence lands in gitignored `.superpowers/sdd/2026-09-22-120-login-shell-gate/` (the variant frames already live there).
- **Version pins:** `better-auth` resolves `1.7.5` (verify with `pnpm --filter @sevendays/admin list better-auth --depth 0` before Task 4; anything else is a STOP). The `beforeLoad`/`redirect`/`validateSearch`/`useRouteContext`/`createAuthClient` shapes below are the spike-validated forms against the resolved `@tanstack/react-start@1.168.56` / `@tanstack/react-router@1.170.38` — do not substitute another mounting style, another client import, or another session-check path. Every BetterAuth doc consult during execution uses the **v1.7** line (`https://better-auth.com/docs/llms.txt`), never unversioned pages.
- **Owner-ratified strings (verbatim — the variants ruling, 2026-09-22; never paraphrase, never let an executor re-draft):** card h1 **"Welcome back"**; card subline **"Sign in to the Sevendays studio console"**; footer caption **"Accounts are provisioned by the studio owner."**; generic failure line **"Invalid email or password."**; ink-band kicker **"Internal tool"** (rendered uppercase by class); ink-band headline **"The studio's appointments, catalog, and branches — behind one door."**; ink-band subline **"Staff sign-in only."** (the prototype's second sentence moves out — the provisioning sentence lives ONCE, in the card caption; single-sourced by the plan); mobile mono line **"Studio staff only"** (rendered uppercase by class); submit button **"Sign in"**; field labels **"Email"** / **"Password"**; page title **"Sign in | Sevendays Admin"**; sign-out icon button `aria-label` **"Sign out"**; placeholder identity strings ("SO", "Studio Owner", "Owner") are DELETED, not kept anywhere.
- **The composition ruling (verbatim transcription target):** ONE component — below `lg`: full `bg-brand-ink` canvas, a decorative `bg-brand-deep/60` blur-3xl glow circle, the admin lockup (`7d` chip + "Sevendays" + "Admin" kicker) on ink, the white `Card` (`w-full max-w-sm`), the mono line below. At `lg`+: a two-column `lg:grid-cols-[1.1fr_1fr]` — left column the ink band (lockup top, kicker + headline + subline bottom), right column the wash panel (`lg:bg-background`) centering the same Card; the mobile-only lockup and mono line hide at `lg`. The Card's content is IDENTICAL in both modes. The user card: avatar chip (initials from the display name), name (truncate), email second line (truncate, muted) — the "Option 2" ruling — plus a ghost icon `Button` with `LogOut` icon (`aria-label="Sign out"`, `hover:text-destructive`); collapsed icon-rail: the footer row becomes a column (avatar above the logout button).
- **The per-request rule (ADR-0011, binding) and its one browser-side exception:** every SERVER auth path stays per-request exactly as #119 built it (the route handler and the session fns construct `createAuth()` inside request scope — this ticket adds NO server auth code and edits none). `auth-client.ts`'s `authClient` is the sanctioned exception: a module-scope, stateless browser fetch wrapper with no DB handle and no request-scoped I/O — module scope is correct for it, and it is the ONLY new auth object this ticket creates.
- **Credential/cookie facts (dist-verified, do not re-litigate):** same-origin `/api/auth` needs no baseURL and no `credentials` option (CORRECTED at the final review: better-auth 1.7.5's client sets `credentials: "include"` itself — `dist/client/config.mjs:39`; `@better-fetch/fetch@1.3.2` has zero overrides; the same-origin conclusion is unchanged); curl POSTs to auth endpoints send `Origin: http://localhost:3000` (T5-R1); the dev cookie is `better-auth.session_token` with value `<token>.<signature>` (T5-R2 — never compare a full cookie string to a stored token).
- **Search-param rule:** `/login`'s `validateSearch` is exactly `z.object({ redirect: z.string().optional() })` (no coercion — `redirect` values are always path strings); navigation consumes it ONLY through the pinned guard (starts with `/`, not `//`, else fall back to `/`). Do not add params, do not coerce booleans/numbers here (the JSON-parse lesson is recorded in the header for future routes, not this one).
- **Secrets (standing rule):** this ticket creates NO new env values, secrets, or example files — dev `.env.local` from #119 already carries everything the dev server needs (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `API_URL`). The Task 4 staff password is generated in-session (`openssl rand -base64 18`), lives only in that invocation's shell, and is NEVER echoed into evidence, the PR body, or any file (the #119 GC rule, unchanged).
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment block below lands verbatim in content; `pnpm --filter @sevendays/admin fix` (biome check --write) then normalizes quoting/ordering/line-wrapping to house style — accept its rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–3 edit only: `apps/admin/src/lib/auth-client.ts` (create), `apps/admin/src/routes/login.tsx` (create), `apps/admin/src/routes/_shell.tsx` (beforeLoad + context pass), `apps/admin/src/components/admin-sidebar.tsx` (identity swap + sign-out), `apps/admin/src/routeTree.gen.ts` (tool-regenerated). Task 4 writes only gitignored evidence + the dev database's NEW user row. Task 5 rotates `docs/progress.md` + `docs/plan.md` (checkbox 5) and writes gitignored `pr-body.md`. NOT here: any edit to `auth.ts` / `auth.config.ts` / `auth.functions.ts` / `routes/api/auth/$.ts` (#119's frozen set); anything under `apps/api`, `apps/landing`, or `packages/*`; the api seam's session-scoped client, `requireSession`, appointments gating (#121); live Worker secrets, teaser/v1 verification, tech-stack/AGENTS/CONTEXT rotation, roadmap checkboxes 3 and 8 (#122); any test file (admin has no vitest — the spec's testing posture verifies this ticket by the live gate); any role-gated UI or role display (identity is name/email only — `role` renders nowhere in v1 per the spec); a Settings→Users screen or user management (out of scope); redesigning the composition (it is owner-ruled — any deviation from the pinned markup/composition is a STOP-and-report, not an improvisation).
- **Type-error policy:** if `pnpm typecheck` flags anything in the new files, fix it at the type level without changing runtime semantics and without `any`; the spike-validated shapes are known-good, so a type error means something outside this plan's fence moved — reconcile it, do not reshape the mounting.

---

### Task 1: The browser auth client + the `/login` route (the owner-ruled hybrid composition)

**Files:**
- Create: `apps/admin/src/lib/auth-client.ts`
- Create: `apps/admin/src/routes/login.tsx`
- Modify (tool-written): `apps/admin/src/routeTree.gen.ts` (via `generate-routes`)

**Interfaces:**
- Consumes: `createAuthClient` from `better-auth/react` (same-origin `/api/auth` default — GC facts); `Button`, `Card`/`CardHeader`/`CardDescription`/`CardContent`, `Input`, `Label` from `@sevendays/ui/components/*` (Tier-1, on disk); `z` from `zod`; the `/api/auth/*` surface #119 mounted (`signIn.email` posts there; the cookie rides the same-origin Fetch default).
- Produces: `authClient` (the app's single browser auth client — Task 3's sign-out is its only other consumer) and the public `/login` route — the staff front door, OUTSIDE `_shell` (the pathless layout never wraps it, so the gate never runs for it). Task 2's `redirect({ to: '/login', … })` resolves against this route's `validateSearch` — this task landing first is what makes the gate typecheck.

**Not here:** the `_shell` gate (Task 2); the sidebar identity/sign-out (Task 3); `useSession`/`authClient.getSession` anywhere (session checks are server-side — the spec's ruling); a "forgot password" affordance (v1 resets are the owner CLI per `docs/staff-provisioning.md`); an already-signed-in redirect away from `/login` (not in the spec — do not add).

- [ ] **Step 1: Create the auth client**

Create `apps/admin/src/lib/auth-client.ts` with exactly this content (biome may reflow afterwards — content is the pin):

```ts
// The browser-side auth client (M4 spec § The admin auth server, "Client"):
// createAuthClient() with no baseURL resolves same-origin /api/auth. The
// session cookie rides by client-side config: better-auth 1.7.5's client
// sets credentials: "include" itself (dist/client/config.mjs:39 — corrected
// at the #120 final review; the planning-time "zero overrides" claim was
// wrong for this half), and @better-fetch/fetch 1.3.2 adds no override.
// Module scope is correct for THIS object: a stateless fetch wrapper with
// no DB handle — the per-request rule (ADR-0011) binds the server
// instances, not the browser client. #120's login form (signIn) and the
// shell user card (signOut) are its only callers.
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({});
```

- [ ] **Step 2: Create the login route**

Create `apps/admin/src/routes/login.tsx` with exactly this content (the owner-ruled hybrid composition; every string is a GC pin):

```tsx
// /login — the staff front door (M4 spec § Login UI + shell gate): public,
// outside the _shell layout, so the gate never runs for it. The composition
// is the owner-ruled hybrid (2026-09-22 variants pass, prototype branch
// prototype/120-login-variants): variant B's split ink band at lg+, variant
// C's ink canvas with petrol glow below lg — one component, the card
// identical in both. Credential failures render ONE generic line (no
// which-field signal); the redirect round-trip consumes the gate's preserved
// aimed URL through the open-redirect guard.
import { Button } from '@sevendays/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@sevendays/ui/components/card';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { authClient } from '#/lib/auth-client';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Sign in | Sevendays Admin' }] }),
  component: LoginPage,
});

// Open-redirect guard: the aimed URL only ever navigates same-origin — a
// relative path, never protocol-relative, never absolute.
function safeRedirect(target: string | undefined): string {
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}

function AdminLockup() {
  return (
    <div className='flex items-center gap-3'>
      <span className='bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
        7d
      </span>
      <span className='flex items-baseline gap-2.5'>
        <span className='text-lg leading-tight font-semibold text-white'>
          Sevendays
        </span>
        <span className='font-mono text-[0.65rem] tracking-widest text-brand-300 uppercase'>
          Admin
        </span>
      </span>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFailure(false);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      // Generic by design (AC): one fixed line for ANY failure — wrong
      // credentials, throttling, network — never a which-field signal.
      setFailure(true);
      setSubmitting(false);
      return;
    }
    await navigate({ href: safeRedirect(redirectTo) });
  };

  return (
    // Below lg (variant C): the whole canvas is ink with the glow behind the
    // card. At lg+ (variant B): a two-column split — the ink band left, the
    // wash panel (lg:bg-background) centering the card right.
    <main className='bg-brand-ink relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden p-6 lg:grid lg:grid-cols-[1.1fr_1fr] lg:p-0'>
      <div
        aria-hidden='true'
        className='bg-brand-deep/60 absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full blur-3xl lg:left-[18%]'
      />
      {/* The band — variant B's left column, lg+ only */}
      <section className='relative hidden w-full flex-col justify-between gap-16 p-14 lg:flex'>
        <AdminLockup />
        <div className='max-w-md space-y-4 pb-8'>
          <p className='font-mono text-[0.65rem] tracking-[0.18em] text-brand-200 uppercase'>
            Internal tool
          </p>
          <p className='text-2xl leading-snug font-semibold text-white'>
            The studio's appointments, catalog, and branches — behind one door.
          </p>
          <p className='text-sm text-brand-200'>Staff sign-in only.</p>
        </div>
      </section>
      {/* The form column — centered on ink (C) / on wash (B) */}
      <section className='relative flex w-full flex-col items-center justify-center gap-8 p-6 lg:min-h-svh lg:bg-background'>
        <div className='lg:hidden'>
          <AdminLockup />
        </div>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <h1 className='text-lg font-semibold'>Welcome back</h1>
            <CardDescription>Sign in to the Sevendays studio console</CardDescription>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={(event) => void onSubmit(event)}>
              <div className='space-y-2'>
                <Label htmlFor='login-email'>Email</Label>
                <Input
                  id='login-email'
                  type='email'
                  autoComplete='email'
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='login-password'>Password</Label>
                <Input
                  id='login-password'
                  type='password'
                  autoComplete='current-password'
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {failure && (
                <p role='alert' className='text-destructive text-sm'>
                  Invalid email or password.
                </p>
              )}
              <Button type='submit' className='w-full' disabled={submitting}>
                Sign in
              </Button>
              <p className='text-center text-xs text-muted-foreground'>
                Accounts are provisioned by the studio owner.
              </p>
            </form>
          </CardContent>
        </Card>
        <p className='font-mono text-[0.65rem] tracking-[0.18em] text-brand-300 uppercase lg:hidden'>
          Studio staff only
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Regenerate the route tree and typecheck**

`tsc` does not regenerate the route tree (the #119 finding — pre-generation, `'/login'` fails against `keyof FileRoutesByPath`), so generate first:

```bash
pnpm --filter @sevendays/admin generate-routes
pnpm --filter @sevendays/admin typecheck
git status --short
```

Expected: `tsr generate` prints its benign `replaceRouteChunk` circular-dependency warning; typecheck green (the spike proved this exact file's shapes); `git status` shows the two new files + a modified `routeTree.gen.ts` (the `/login` entry joining the tree — committed in the `tsr generate` form, footer-less per T1-R1) — nothing else.

- [ ] **Step 4: Verify the tree and the client-surface gates**

```bash
grep -n "LoginRoute\|'/login'" apps/admin/src/routeTree.gen.ts | head -5
grep -rn "createAuthClient" apps/admin/src --include="*.ts" --include="*.tsx"
grep -rn "authClient" apps/admin/src/routes apps/admin/src/components --include="*.ts" --include="*.tsx"
```

Expected: the generated tree carries the `/login` route; `createAuthClient` appears ONLY in `src/lib/auth-client.ts`; `authClient` appears ONLY in `src/routes/login.tsx` (Tasks 2–3 add the sidebar's consumer — anything else is a STOP-and-report finding).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/auth-client.ts apps/admin/src/routes/login.tsx apps/admin/src/routeTree.gen.ts
git commit -m "feat(admin): /login — the owner-ruled hybrid login screen (#120)

Public route outside _shell, transcribed from the owner-reacted variants
(prototype branch prototype/120-login-variants): variant B's split ink
band at lg+, variant C's ink canvas with petrol glow below lg, one card
— h1 Welcome back, subline Sign in to the Sevendays studio console,
caption Accounts are provisioned by the studio owner. Wrong credentials
render one generic line (no which-field signal); the redirect search
param is consumed only through the open-redirect guard; email/password
autocomplete attrs keep password managers working (WCAG 2.2). The
browser client is better-auth/react's createAuthClient() — same-origin
/api/auth, zero credentials overrides (dist-verified), module-scope
correct for a stateless fetch wrapper. Spike-proven shapes
(react-start 1.168.56); routeTree regenerated via tsr generate."
```

---

### Task 2: The `_shell` session gate + identity in context

**Files:**
- Modify: `apps/admin/src/routes/_shell.tsx`
- Modify: `apps/admin/src/components/admin-sidebar.tsx` (the identity swap — the placeholder's own "the data swaps, the shell stays" contract)

**Interfaces:**
- Consumes: `getSession` from `#/lib/auth.functions` (#119's server fn, untouched — returns `{ session, user } | null` over a per-request auth instance); `redirect` from `@tanstack/react-router`; Task 1's `/login` route (the redirect's `search` types against its `validateSearch` — the spike proved the pairing, and Task 1 landed first).
- Produces: the gate — every screen under `_shell` (all seven stub routes) renders only for a session; signed-out navigations bounce to `/login` with the aimed URL preserved (`search: { redirect: location.href }`); and the shell layout's context carries `{ user: { name, email } }` from THE GATE'S OWN session fetch (the AC: identity renders with no extra API call), passed to `AdminSidebar` as a prop.

**Not here:** the sign-out affordance (Task 3 — this task only swaps the identity data); touching `auth.functions.ts` or any #119 file; gating anything OUTSIDE `_shell` (the login route and `/api/auth/*` stay public); rendering `role` anywhere (identity is name/email per the spec).

- [ ] **Step 1: Add the gate to `_shell.tsx`**

Replace `apps/admin/src/routes/_shell.tsx`'s contents with exactly this (the layout body is unchanged — `beforeLoad` and the context read are the additions; biome may reflow formatting — content is the pin):

```tsx
// The admin app shell (pathless — no URL segment): everything staff-facing
// renders through it, gated on a session — the M4 spec's beforeLoad gate.
// Signed-out arrivals at ANY admin URL bounce to /login preserving the aimed
// URL (location.href rides the redirect search param; /login's round-trip
// consumes it). Variant A per #59: labeled sidebar + sticky top bar; the
// sidebar collapses to the icon rail via the top-bar trigger.

import { SidebarInset, SidebarProvider } from '@sevendays/ui/components/sidebar';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AdminSidebar } from '#/components/admin-sidebar';
import { AdminTopbar } from '#/components/admin-topbar';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_shell')({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { user: { name: session.user.name, email: session.user.email } };
  },
  component: ShellLayout,
});

function ShellLayout() {
  // The gate's own session fetch is the identity source — no extra call.
  const { user } = Route.useRouteContext();
  return (
    <SidebarProvider>
      <AdminSidebar user={user} />
      <SidebarInset>
        <AdminTopbar />
        <div className='flex-1 space-y-6 p-6' data-shell-main>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Swap the sidebar's placeholder identity for the session's**

In `apps/admin/src/components/admin-sidebar.tsx`: (a) add a props interface and the initials helper beside the existing `NavGroup` interface; (b) change the component signature to accept `user`; (c) replace the `SidebarFooter` placeholder block. The pinned edits:

(a + b) — insert after the `NavGroup` interface and change the signature:

```tsx
interface AdminSidebarProps {
  user: { name: string; email: string };
}

// Initials for the avatar chip: first letters of the first two name words.
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
```

and `export function AdminSidebar()` → `export function AdminSidebar({ user }: AdminSidebarProps)`.

(c) — replace the `SidebarFooter`'s inner block (the placeholder row) with:

```tsx
      <SidebarFooter>
        {/* Identity from the gate's session fetch (#120) — the data swapped,
            the shell unchanged. Sign-out lands here with Task 3. */}
        <div className='flex items-center gap-3 px-2 py-1.5'>
          <span className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
            {initials(user.name)}
          </span>
          <div className='min-w-0 group-data-[collapsible=icon]:hidden'>
            <p className='truncate text-sm leading-tight font-medium'>{user.name}</p>
            <p className='text-sidebar-foreground/60 truncate text-xs'>{user.email}</p>
          </div>
        </div>
      </SidebarFooter>
```

Also delete the now-stale header-comment sentence "the user card is placeholder data until M4 auth" (the file's top comment block) — replace with "the user card renders the gate's session identity (#120)". The placeholder strings "SO", "Studio Owner", "Owner" die here (GC).

- [ ] **Step 3: Typecheck + the no-extra-call gate**

```bash
pnpm --filter @sevendays/admin typecheck
grep -rn "getSession\|useSession\|authClient" apps/admin/src/components --include="*.tsx"
grep -rn "createAuth(" apps/admin/src --include="*.ts" --include="*.tsx"
```

Expected: typecheck green (the spike proved the `beforeLoad` → `useRouteContext` chain); the components grep returns ZERO rows — no component fetches a session or touches `authClient` (identity arrives as a prop from the gate; Task 3 adds exactly ONE `authClient` row, the sign-out handler); the `createAuth(` grep shows exactly the #119 set (`auth.ts` definition, `auth.config.ts` fenced CLI entry, `auth.functions.ts` ×2 inside spans, `routes/api/auth/$.ts` inside handlers) — this ticket added NONE.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/routes/_shell.tsx apps/admin/src/components/admin-sidebar.tsx
git commit -m "feat(admin): _shell beforeLoad session gate with redirect preservation (#120)

Every admin screen now renders only for a session: beforeLoad calls
#119's getSession server fn; no session -> redirect to /login carrying
the aimed URL (location.href in the redirect search param — /login's
round-trip consumes it). The gate's own fetch is the identity source:
beforeLoad returns { user: { name, email } } into route context and the
layout passes it to the sidebar — no extra API call. The sidebar
footer's placeholder identity swaps for the real one (initials avatar,
name, email — the Option-2 ruling's identity lines); sign-out lands
next. Spike-proven against react-start 1.168.56."
```

---

### Task 3: Sign-out in the user card (the Option-2 inline affordance)

**Files:**
- Modify: `apps/admin/src/components/admin-sidebar.tsx`

**Interfaces:**
- Consumes: `authClient.signOut()` from `#/lib/auth-client` (Task 1 — POSTs `/api/auth/sign-out`, revokes the session row server-side, clears the cookie); `useNavigate` from `@tanstack/react-router`; `Button` from `@sevendays/ui/components/button`; `LogOut` from `lucide-react`; the `user` prop Task 2 added.
- Produces: the AC's sign-out completion — clicking the affordance revokes the session (BetterAuth's own endpoint → the row dies) and lands on `/login`; the collapsed icon rail stacks avatar above the logout button (the owner-ruled Option-2 collapsed state).

**Not here:** any confirmation dialog (not in the spec — one click signs out; a shared-computer story 3 assumes intention); a menu (the owner explicitly picked the inline button OVER the menu); sign-out anywhere else (topbar stays untouched); post-sign-out navigation anywhere but `/login`.

- [ ] **Step 1: Add the affordance and handler**

In `apps/admin/src/components/admin-sidebar.tsx`: (a) extend the imports; (b) add the handler inside `AdminSidebar`; (c) replace the `SidebarFooter` block from Task 2 with the full Option-2 form. Pinned edits:

(a) — imports (merge into the existing import blocks; `useNavigate` joins the `@tanstack/react-router` import that already carries `Link, useMatchRoute`):

```tsx
import { Button } from '@sevendays/ui/components/button';
import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { authClient } from '#/lib/auth-client';
```

(b) — first lines inside `AdminSidebar`:

```tsx
  const navigate = useNavigate();

  // Sign-out (M4 spec § Login UI + shell gate): revoke the session through
  // BetterAuth's own endpoint (the row dies server-side), then land on
  // /login — arriving signed-out at the shell would bounce there anyway;
  // this makes the revocation visible and immediate.
  const onSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: '/login' });
  };
```

(c) — the `SidebarFooter` block becomes:

```tsx
      <SidebarFooter>
        {/* Identity from the gate's session fetch; sign-out inline (the
            owner-ruled Option 2: one click, no menu). In the collapsed icon
            rail the row becomes a column — avatar above the logout button. */}
        <div className='flex items-center gap-3 px-2 py-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0'>
          <span className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
            {initials(user.name)}
          </span>
          <div className='min-w-0 flex-1 group-data-[collapsible=icon]:hidden'>
            <p className='truncate text-sm leading-tight font-medium'>{user.name}</p>
            <p className='text-sidebar-foreground/60 truncate text-xs'>{user.email}</p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Sign out'
            className='text-sidebar-foreground/60 hover:text-destructive size-8 shrink-0'
            onClick={() => void onSignOut()}
          >
            <LogOut aria-hidden='true' />
          </Button>
        </div>
      </SidebarFooter>
```

- [ ] **Step 2: Typecheck + the affordance gate**

```bash
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin lint
grep -rn "authClient" apps/admin/src --include="*.ts" --include="*.tsx"
grep -c "Studio Owner\|>SO<" apps/admin/src/components/admin-sidebar.tsx || echo "placeholder gone"
```

Expected: typecheck/lint green; the `authClient` grep shows exactly TWO files — `lib/auth-client.ts` (the export) and `components/admin-sidebar.tsx` (the handler; `routes/login.tsx`'s consumer landed in Task 1 — three rows total across the app, no more); the placeholder grep prints `0` + "placeholder gone" (no hard-coded identity remains).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/admin-sidebar.tsx
git commit -m "feat(admin): signed-in identity + inline sign-out in the sidebar user card (#120)

The owner-ruled Option 2: avatar initials, name, email (truncate), and
a ghost icon button with LogOut (aria-label Sign out, destructive on
hover) — one click revokes the session through BetterAuth's sign-out
endpoint and lands on /login, no menu. The collapsed icon rail stacks
avatar above the logout button. The gate's session remains the only
identity source — the button calls authClient.signOut, nothing else."
```

---

### Task 4: The live dev verification — gate matrix, provisioning, revocation, frames (controller-run)

**Files:**
- Create (gitignored): `.superpowers/sdd/2026-09-22-120-login-shell-gate/evidence.md` (written at Step 6)
- Database side-effect: ONE new `user` row (+ its session rows, cascaded away only by sign-out revocation — the row itself STAYS as this ticket's dev residue, matching #119's precedent)

**Interfaces:**
- Consumes: Tasks 1–3 (the route, the gate, the card); #119's `/api/auth/*` surface and `create-staff` CLI; the dev env values already in `apps/admin/.env.local`; `packages/db/.env`'s `DATABASE_MIGRATE_URL` for the row check; the proven interactive-pty provisioning driver (`.superpowers/sdd/2026-09-22-119-admin-auth-server/task5-step3d.sh` — the #119 ruling: this CLI's password prompt requires TRUE interactive typing; piped stdin doubles the password).
- Produces: the ticket's verification ACs, evidenced — `/login` answering 200 with the ruled composition; signed-out shell URLs bouncing to `/login` with the aimed URL preserved; a real sign-in through the app's own HTTP surface; identity + unchanged stubs rendered behind the gate; sign-out revoking the session (the old cookie dies); the generic wrong-password response; rendered frames of the shipped screen at desktop + mobile.

**Not here:** the deployed teaser/v1 targets (#122 — the teaser admin still cannot authenticate until its `BETTER_AUTH_SECRET` put; the green deploy legs are Task 5's landing proof); UI-automation form-filling (no browser backend in this environment — the interactive form behaviors are covered by the pinned code paths, the owner-validated prototype frames, and the manual checklist riding the PR body); touching committed code (a failure here is a finding for Tasks 1–3, not an edit permission); deleting #119's `owner@sevendays.test` row (this ticket provisions a SECOND user beside it).

**Pinned expectations (GC facts):** the dev cookie is `better-auth.session_token` (value `<token>.<signature>`); every auth POST carries `Origin: http://localhost:3000` (T5-R1); gate redirects serialize the aimed URL into the search param (`Location: /login?redirect=%2F…` — URL-encoded; assert with a prefix match on `/login?redirect=`); `/api/auth/sign-in/email` allows ~3 attempts per 10s (this task makes exactly 2: one correct, one wrong — spaced ≥10s; if a 429 ever appears, wait 10s and re-run the single call); `chrome-headless-shell` screenshots require `--disable-gpu --no-sandbox` on this WSL host and hang with `--virtual-time-budget` against vite HMR (the working invocation is pinned below).

- [ ] **Step 1: Boot the dev server, run the signed-out gate matrix**

```bash
cd /home/jeius/Projects/sevendays
(ss -tlnp 2>/dev/null | grep :3000 && echo "PORT BUSY — stop it first") || echo "port 3000 free"
pnpm build:packages
(pnpm --filter @sevendays/admin dev > /tmp/sevendays-admin-dev-120.log 2>&1 &)
for i in $(seq 1 60); do curl -fsS -o /dev/null http://localhost:3000/login 2>/dev/null && break; sleep 2; done
echo "=== signed-out: / ==="
curl -sS -i http://localhost:3000/ | grep -iE '^HTTP/|^location:'
echo "=== signed-out: /packages (deep link) ==="
curl -sS -i http://localhost:3000/packages | grep -iE '^HTTP/|^location:'
echo "=== signed-out: /login ==="
curl -sS -o /tmp/login-page.html -w 'HTTP %{http_code}\n' http://localhost:3000/login
grep -c 'Welcome back' /tmp/login-page.html
grep -c 'Sign in to the Sevendays studio console' /tmp/login-page.html
```

Expected: `/` and `/packages` each answer `307` (or 302) with `location: /login?redirect=%2F` and `location: /login?redirect=%2Fpackages` respectively — the gate bouncing signed-out arrivals WITH the aimed URL preserved; `/login` answers 200 carrying both pinned copy strings (the SSR HTML — if the redirect Location differs in encoding, accept any form that starts `/login?redirect=` and record the exact shape in the evidence; a 200 for `/` without a session is a STOP — the gate did not mount).

- [ ] **Step 2: Provision the verification user — ONE Bash invocation, interactive pty**

The password lives only in this invocation's environment (GC). The driver is #119's proven one, extended to answer the CLI's existing-users confirmation (a SECOND user triggers it — feed `y` when it appears, then the password when prompted):

```bash
set -o pipefail
cd /home/jeius/Projects/sevendays
export STAFF_PASS=$(openssl rand -base64 18)
python3 - <<'PY'
import os, pty, select, subprocess, sys, termios, time

password = os.environ["STAFF_PASS"]
cmd = ["pnpm", "--filter", "@sevendays/admin", "create-staff",
       "--email", "login-ui@sevendays.test", "--name", "Login UI Check"]

master, slave = pty.openpty()
attrs = termios.tcgetattr(slave)
attrs[3] &= ~termios.ECHO                      # the password never echoes
termios.tcsetattr(slave, termios.TCSANOW, attrs)

p = subprocess.Popen(cmd, stdin=slave, stdout=slave, stderr=slave, close_fds=True)
os.close(slave)

confirm_fed, pass_fed = False, False
deadline = time.time() + 240
while time.time() < deadline:
    r, _, _ = select.select([master], [], [], 1.0)
    if master in r:
        try:
            chunk = os.read(master, 4096)
        except OSError:
            break
        if not chunk:
            break
        text = chunk.decode("utf-8", "replace")
        sys.stdout.write(text); sys.stdout.flush()
        low = text.lower()
        if not confirm_fed and ("already exist" in low or "y/n" in low):
            time.sleep(0.5); os.write(master, b"y\r"); confirm_fed = True
        if not pass_fed and "password" in low:
            time.sleep(0.5); os.write(master, password.encode() + b"\r"); pass_fed = True
    elif p.poll() is not None:
        break
try:
    rc = p.wait(timeout=60)
except subprocess.TimeoutExpired:
    p.kill(); rc = 1
sys.exit(rc)
PY
PROVISION_RC=$?
echo "provisioner exit: $PROVISION_RC"
[ "$PROVISION_RC" -eq 0 ] || { echo "PROVISIONING FAILED"; exit 1; }
sleep 3
echo "=== row check ==="
( cd packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const users = await sql\`select email, name, role from \"user\" order by email\`;
console.log(JSON.stringify(users));
await sql.end();
" )
```

Expected: the CLI's confirmation answered, prompt shows masked input, user created; the row check shows TWO users — #119's `owner@sevendays.test` untouched + this ticket's `login-ui@sevendays.test` (`Login UI Check`, `admin`).

- [ ] **Step 3: Sign in, verify the gated shell + identity + stubs, fail wrong, sign out, prove revocation — ONE Bash invocation**

```bash
set -o pipefail
cd /home/jeius/Projects/sevendays
echo "=== SIGN-IN (correct password) ==="
RESP=$(curl -sS -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' -H 'Origin: http://localhost:3000' \
  -d "{\"email\":\"login-ui@sevendays.test\",\"password\":\"$STAFF_PASS\"}")
printf '%s\n' "$RESP" | grep -i '^HTTP/'
printf '%s\n' "$RESP" | grep -io 'set-cookie: better-auth.session_token=[^;]*' | sed -E 's/=(.{8}).*/=\1…(redacted)/'
COOKIE=$(printf '%s\n' "$RESP" | grep -io 'set-cookie: better-auth.session_token=[^;]*' | cut -d' ' -f2-)
[ -n "$COOKIE" ] || { echo "NO COOKIE — STOP"; exit 1; }
echo "=== GATED / WITH SESSION (identity + dashboard stub) ==="
curl -sS -o /tmp/shell-home.html -w 'HTTP %{http_code}\n' -H "Cookie: $COOKIE" http://localhost:3000/
grep -c 'Login UI Check' /tmp/shell-home.html
grep -c 'login-ui@sevendays.test' /tmp/shell-home.html
grep -c 'data-stub-screen' /tmp/shell-home.html
echo "=== GATED /packages WITH SESSION (stub unchanged) ==="
curl -sS -o /tmp/shell-packages.html -w 'HTTP %{http_code}\n' -H "Cookie: $COOKIE" http://localhost:3000/packages
grep -c 'Package catalog CRUD' /tmp/shell-packages.html
sleep 10
echo "=== WRONG PASSWORD (generic 401 — the response the form renders generically) ==="
curl -sS -w '\nHTTP %{http_code}\n' -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' -H 'Origin: http://localhost:3000' \
  -d "{\"email\":\"login-ui@sevendays.test\",\"password\":\"${STAFF_PASS}x\"}"
echo "=== SIGN-OUT (revokes the session row) ==="
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' -X POST http://localhost:3000/api/auth/sign-out \
  -H 'Origin: http://localhost:3000' -H "Cookie: $COOKIE"
echo "=== THE OLD COOKIE IS DEAD (gate bounces again) ==="
curl -sS -i -H "Cookie: $COOKIE" http://localhost:3000/ | grep -iE '^HTTP/|^location:'
```

Expected, in order: sign-in `200` + redacted `set-cookie: better-auth.session_token=…`; `/` with the cookie `200` carrying the identity THREE ways — name `Login UI Check` ≥1, email `login-ui@sevendays.test` ≥1 (the sidebar card) — and `data-stub-screen` ≥1 (the dashboard stub rendering behind the gate, unchanged); `/packages` with the cookie `200` carrying the pinned stub blurb `Package catalog CRUD`; wrong password `401` with `"code":"INVALID_EMAIL_OR_PASSWORD"` (the server's generic response — the form renders its fixed line for it, per the pinned code); sign-out `200`; then `/` with the SAME cookie answers `307` + `location: /login?redirect=%2F` — revocation proven through the gate itself.

- [ ] **Step 4: Rendered frames of the shipped screen**

```bash
cd /home/jeius/Projects/sevendays/.superpowers/sdd/2026-09-22-120-login-shell-gate
BIN=~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
timeout 30 "$BIN" --headless --disable-gpu --no-sandbox --screenshot=login-desktop.png --window-size=1440,900 --hide-scrollbars "http://localhost:3000/login" >/dev/null 2>&1
timeout 30 "$BIN" --headless --disable-gpu --no-sandbox --screenshot=login-mobile.png --window-size=375,812 --hide-scrollbars "http://localhost:3000/login" >/dev/null 2>&1
ls -la login-desktop.png login-mobile.png
```

Expected: both PNGs written. The desktop frame shows the hybrid's `lg` form — ink band left (lockup, "INTERNAL TOOL" kicker, the ruled headline, "Staff sign-in only."), wash panel with the white card right; the mobile frame shows variant C — full ink canvas, glow, lockup on ink, card, "STUDIO STAFF ONLY" mono line. Record both in the evidence (they are this ticket's "composition transcribed" proof beside the owner's variant frames).

- [ ] **Step 5: Stop the dev server, restore the route tree (T1-R1)**

```bash
pkill -f "vite dev --port 3000" && echo "admin dev stopped" || echo "already stopped"
sleep 1
cd /home/jeius/Projects/sevendays && git checkout -- apps/admin/src/routeTree.gen.ts
git status --short
```

Expected: the running dev server re-added the vite `Register` footer to `routeTree.gen.ts` (T1-R1); the restore returns it to the committed `tsr generate` form; `git status` clean (nothing from this task touched tracked files).

- [ ] **Step 6: Write the evidence file**

Write `.superpowers/sdd/2026-09-22-120-login-shell-gate/evidence.md` with: the Step 1 redirect matrix (exact `Location` shapes), Step 2's CLI tail + the two-user row check, Step 3's outputs with every secret/password/token value redacted (the password is NOT recorded — note it was generated in-session, pty-typed, discarded; the cookie appears only as its 8-char prefix), Step 4's two frames, and the T1-R1 routeTree restore note. Quote the same blocks into Task 5's PR body.

---

### Task 5: Full gate, docs rotation, PR, merge, and the watched deploy

**Files:**
- Modify: `docs/progress.md` (rotate the `_Last updated:` line + prepend the session paragraph)
- Modify: `docs/plan.md` (tick M4 checkbox 5 with a dated annotation)
- Create (gitignored): `.superpowers/sdd/2026-09-22-120-login-shell-gate/pr-body.md`
- The squash-merge PR `(#120)` + its watched deploy

**Interfaces:**
- Consumes: Tasks 1–4 (the branch state + evidence); the docs conventions (progress.md's single-paragraph session record + bottom `_Last updated:` line; plan.md's `_(date: …)_` annotation style — #118/#119's M4-box annotations are the direct precedent).
- Produces: the merged main whose push exercises the deploy legs; the docs state #121/#122's sessions read; the evidence block Task 6's ledger row cites; the PR body carrying the owner's manual checklist (the interactive form behaviors — the spec's "CDP/manual pass" — for the owner to confirm at review).

**Not here:** ticking M4 checkboxes 3 or 8 (#122's); touching `tech-stack.md` / `AGENTS.md` / CONTEXT files (#122's rotation); closing any issue other than #120; re-running the live matrix (Task 4's evidence is the record).

- [ ] **Step 1: The full gate**

```bash
pnpm check
graphify update .
```

Expected: `pnpm check` green, 35/35 turbo tasks (no test files or check-pipeline scripts were added — count unchanged from the #119-recorded baseline; if it differs, reconcile before proceeding). `graphify update .` rewrites `graphify-out/` (expected house noise — commit it in Step 4).

- [ ] **Step 2: Rotate `docs/progress.md`**

Replace the current `_Last updated: 2026-09-22 (M4 ticket 02 landed — …` line (progress.md line 7 — the one beginning `_Last updated: 2026-09-22 (M4 ticket 02 landed:`) with:

```markdown
_Last updated: 2026-09-22 (M4 ticket 03 landed — the admin app has a front door: `/login` transcribes the owner-ruled hybrid composition (split ink band at `lg`+ / ink canvas below — variants rendered and reacted in-session per #94, prototype branch `prototype/120-login-variants`); the `_shell` `beforeLoad` gate bounces signed-out arrivals to `/login` preserving the aimed URL and returns them there after sign-in; the sidebar user card renders the gate's own session identity (name/email, no extra call) with an inline sign-out that revokes the session and lands back at `/login`; wrong credentials render one generic line; the v2-stub screens render unchanged behind the gate. #121/#122 remain.)_
```

Then insert this paragraph directly under `# Progress` (above the #119 paragraph):

```markdown
2026-09-22 — #120 M4 ticket 03, the login UI + `_shell` session gate, landed as the browser-visible half of admin auth. The composition is owner-ruled, not agent-drafted: three `/login` variants (centered wash card / split ink band / ink canvas) plus a user-card affordance strip were rendered on a throwaway prototype route over the live design system (`prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling` loaded at planning per the AGENTS.md UI rule), screenshotted, and reacted to in-session — the owner ruled a HYBRID (variant B's split ink band at `lg`+, variant C's ink canvas with petrol glow below), the "Warm" card copy set, and the "Option 2" inline-button user card (captured at branch `prototype/120-login-variants`, commit `84aebd0`; frames + verdict in `.superpowers/sdd/2026-09-22-120-login-shell-gate/`). The build: `apps/admin/src/lib/auth-client.ts` (`createAuthClient()` from `better-auth/react`, same-origin `/api/auth`, zero credentials overrides in better-fetch 1.3.2 / better-auth 1.7.5's client — dist-grepped; module scope is correct for the stateless browser client, the one ADR-0011 exception), `apps/admin/src/routes/login.tsx` (public, outside `_shell`; the hybrid composition; h1 "Welcome back" / subline "Sign in to the Sevendays studio console" / caption "Accounts are provisioned by the studio owner."; ONE generic failure line "Invalid email or password."; `autocomplete="email"`/`"current-password"` per WCAG 2.2; the `redirect` search param consumed only through the open-redirect guard), the `_shell` gate (`beforeLoad` → #119's `getSession`; no session → `redirect({ to: '/login', search: { redirect: location.href } })`; returns `{ user }` into route context — the layout passes it to the sidebar, so identity renders from the gate's own fetch with no extra API call), and the sidebar user card swap (initials avatar + name + email + a ghost `LogOut` icon button — one click `authClient.signOut()` then `/login`; the collapsed icon rail stacks avatar above the button). Every type-inference claim (beforeLoad → server-fn → redirect-search typing → `useRouteContext`; the `authClient` call shapes with `error.code`/`error.status`) was spike-proven against the resolved react-start 1.168.56 / react-router 1.170.38 at planning time, throwaway files deleted. Verified live in dev (curl matrix + frames): signed-out `/` and `/packages` bounce `307` to `/login?redirect=%2F…` (aimed URL preserved); `/login` answers 200 with the ruled copy; a second staff user (`login-ui@sevendays.test`, provisioned via the #119-proven interactive-pty driver — #119's owner row untouched) signs in through the app's own HTTP surface; the gated `/` renders name + email + the unchanged dashboard stub; wrong password → the generic 401; sign-out revokes the row and the old cookie bounces again. `pnpm check` 35/35; v1 pick + ledger row per the runbook. NOT yet true: the deployed teaser admin still cannot authenticate until #122 puts `BETTER_AUTH_SECRET` (the green deploy legs are this ticket's landing proof); no api verification or appointments gating yet (#121).
```

- [ ] **Step 3: Tick `docs/plan.md` M4 checkbox 5**

The checkbox at plan.md line 117 (`Login UI + shell gate: …`) — `- [ ]` → `- [✅]`, and append inside its trailing text (after `sign-out in the shell user card`):

```markdown
 _(2026-09-22: ticket #120 landed — `/login` transcribes the owner-ruled hybrid (split ink band at `lg`+ / ink canvas below; Warm copy — variants rendered + reacted in-session per #94, prototype branch `prototype/120-login-variants`); the `_shell` gate preserves the aimed URL through the round-trip; sign-out is the user card's inline button (Option 2) revoking via BetterAuth's own endpoint; verified live with the gate matrix, sign-in, identity, unchanged stubs, and revocation — stub screens render exactly as M3 left them.)_
```

- [ ] **Step 4: Commit docs, open the PR**

```bash
git add docs/progress.md docs/plan.md graphify-out
git commit -m "docs: M4 login UI + shell gate landed — progress rotation + checkbox 5 ticked (#120)

progress.md carries the session record (owner-ruled hybrid composition
with the variants provenance, the gate round-trip, the identity/sign-out
card, the live matrix incl. revocation); plan.md's Login UI + shell gate
box ticked with its dated annotation; checkboxes 3/8 stay open for #122."
gh pr create --title "M4 ticket 03 — Login UI + _shell session gate" --body-file .superpowers/sdd/2026-09-22-120-login-shell-gate/pr-body.md
```

(The `pr-body.md` contents — fill the evidence quotes from Task 4's evidence file, then commit nothing from the sdd dir itself:)

```markdown
Implements #120 — the login UI + `_shell` session gate (M4 ticket 03, UI-bearing). Spec: #117, plan: docs/superpowers/plans/2026-09-22-120-login-shell-gate.md.

## Acceptance criteria → evidence

- **UI-bearing ticket: skill set named, owner-reacted variants precede the build** — `prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling` loaded at planning; three compositions + a user-card strip rendered on the live design system and reacted to in-session (2026-09-22). Rulings: hybrid composition (B split ink band at `lg`+ / C ink canvas below), Warm copy set, Option-2 inline-button user card. Prototype captured at branch `prototype/120-login-variants` (84aebd0, throwaway); frames in the SDD workspace.
- **`/login` public, outside `_shell`, on the design system's petrol-wash / white-card register, from `packages/ui` primitives** — Card/Input/Label/Button only; the register reached through the semantic tokens (`--background` = wash, `--card` = white, `--brand-ink` band/canvas). <quote Step 1's /login 200 + copy greps, and the desktop/mobile frames>
- **`_shell` `beforeLoad` gate with aimed-URL preservation + return-to-aimed round-trip** — <quote Step 1's redirect matrix (/, /packages)> and <quote Step 3's sign-in → 200 with cookie>; the form consumes `redirect` only through the open-redirect guard (pinned code).
- **Sign-out affordance completes to revocation + `/login`** — <quote Step 3's sign-out 200 + the old-cookie bounce>.
- **Identity (name/email) from the gate's session fetch, no extra API call** — beforeLoad returns `{ user }` into context; grep gate: zero session/authClient reads in components. <quote Step 3's identity greps on the gated HTML>.
- **Credential failures render generically** — one fixed line for ANY error (pinned code); the server side answers the generic 401. <quote Step 3's wrong-password response>.
- **v2-stub screens unchanged behind the gate** — <quote Step 3's stub greps>; no stub file was touched (scope fence).
- **`pnpm check` green** — 35/35 turbo tasks.

## Owner manual pass (the spec's "CDP/manual" leg — confirm at review)

With `pnpm --filter @sevendays/admin dev` running: (1) visit `http://localhost:3000/packages` signed out → lands on `/login` with the aimed URL in the address bar; (2) submit wrong credentials → one generic line, no field signal; (3) sign in (`login-ui@sevendays.test`, password from the provisioning run — or re-provision per `docs/staff-provisioning.md`) → lands on `/packages`, identity in the sidebar card; (4) collapse the sidebar to the icon rail → avatar above the logout button; (5) click sign-out → back at `/login`, and the back button does not re-enter the shell.

## Not here (fences)

No api verification / appointments gating / session-scoped client (#121); no live Worker secrets, teaser/v1 gates, or tech-stack/AGENTS/CONTEXT rotation (#122 — the deployed teaser admin cannot authenticate until its `BETTER_AUTH_SECRET` put; the green deploy legs are this PR's landing proof); no landing/api/db changes; no new tests (admin's vitest gap is standing — the spec's testing posture verifies this ticket by the live gate).
```

- [ ] **Step 5: Merge and watch the deploy run**

```bash
gh pr view --json url -q .url
gh pr merge --squash --delete-branch
gh run list --branch main --limit 1
gh run watch <run-id> --exit-status
```

Expected: the push-triggered run executes `check` then `Deploy teaser (main)` — all steps green including `Deploy admin (sevendays-admin)` (the login route + gate ride the build; `BETTER_AUTH_SECRET` is still absent on the teaser Worker, so deployed login remains #122's leg — the green deploy is the landing proof, the #118/#119 precedent). Record the run URL in the evidence file. Local main ff to the squash sha; branch deleted.

---

### Task 6: v1 pick + ledger row + issue close (the runbook tail)

**Files:**
- The pick executes ONLY in `~/Projects/sevendays-v1-seed` (never check `v1` out in the main workspace — runbook rule)
- Modify (on main, after the pick): `docs/agents/v1-picks.md` (the ledger row)

**Interfaces:**
- Consumes: the squash sha Task 5 merged (`git log origin/main -1 --format=%H` after the merge); the runbook `docs/agents/v1-picks.md` verbatim procedures (classifier `scripts/v1-triage.mjs`, locks incl. `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed`).
- Produces: the v1 edition carrying the login UI + gate + user card (v1's `/login` renders but cannot authenticate until #122's v1 secrets — expected and noted in the row); the ledger row keeping main and v1 reconciled.

**Not here:** touching the database (the `login-ui@sevendays.test` row lives in the SHARED dev database — the pick carries no data); any v1-side login verification (needs #122's secrets); closing any issue other than #120.

- [ ] **Step 1: Reconcile the backlog (main order)**

```bash
cd ~/Projects/sevendays-v1-seed && git status --short && git log --oneline -3
tail -5 ~/Projects/sevendays/docs/agents/v1-picks.md
```

Expected: the seed is clean at #119's pick sha (`624b424`) or later; the ledger's last row is #119's (`ad8e123`). Drain anything pending before this ticket's pick — main order, always.

- [ ] **Step 2: Triage + pick this PR's squash**

Run the classifier per the runbook against the squash sha. Pre-mapped expectation: **PICK** (booking-free by construction). v1-paths: `apps/admin/src/lib/auth-client.ts` (new — whole), `apps/admin/src/routes/login.tsx` (new — whole), `apps/admin/src/routes/_shell.tsx` (the gate hunk), `apps/admin/src/components/admin-sidebar.tsx` (the user-card hunks), `apps/admin/src/routeTree.gen.ts` (the `/login` hunk, footer-less per T1-R1 — or drop the hunk and run `pnpm --filter @sevendays/admin generate-routes` in the seed; either way the tree must carry `/login` before the seed's typecheck). Main-only: `docs/progress.md`, `docs/plan.md` (edition vocabulary — #121/#122 references; content-drop per the classifier), `docs/superpowers/plans/*` (this file), `graphify-out/` (regenerated in the seed per the runbook).

- [ ] **Step 3: Locks, push, watch (runbook verbatim)**

```bash
cd ~/Projects/sevendays-v1-seed && pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build && pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed
cd ~/Projects/sevendays-v1-seed && git push
gh run watch <the-v1-push-run-id> --exit-status
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/book
```

Expected: `pnpm check` green in the seed (the four files + regenerated tree typecheck there identically — the spike-proven shapes travel); audit exit 0; the push run shows `check` + `Deploy v1 (private)` success; live curls: landing `200`, `/book` `404`. Time-box one hour of conflict work per the runbook — beyond that, STOP and hand the row to the owner.

- [ ] **Step 4: Ledger row on main**

Back in the main workspace, append the row to `docs/agents/v1-picks.md`: date, #120, the squash sha, `pick`, the seed pick sha, and a notes cell covering: the two new files applied whole, the `_shell`/sidebar hunks, the routeTree handling (footer-less hunk per T1-R1 or seed regeneration), the main-only docs drops, locks (check/build/audit results + run id), and the note that v1's `/login` renders but stays un-authenticatable until #122's v1 secret puts. Commit + push directly to main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #120 login UI + shell gate picked (#120)"
git push
```

- [ ] **Step 5: Close the issue**

```bash
gh issue close 120 --comment "Login UI + shell gate landed via PR #<pr-number> (squash <sha>): /login transcribes the owner-ruled hybrid composition (split ink band lg+ / ink canvas below — variants rendered + reacted in-session, prototype branch prototype/120-login-variants), the _shell beforeLoad gate preserves the aimed URL through the sign-in round-trip, the user card renders the gate's session identity with the Option-2 inline sign-out (revocation verified live), wrong credentials render one generic line, and the stub screens render unchanged behind the gate. Live evidence (gate matrix, sign-in, identity, revocation, frames) quoted in the PR; pnpm check 35/35. v1 picked as <seed-sha>, ledger row recorded. #121/#122 unblocked/next."
```

---

## Self-Review (recorded at planning time)

- **Spec coverage vs ticket AC:** UI-bearing with the skill set named and owner-reacted variants preceding the build → the planning-time variants pass (skills loaded: `prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling`; rulings pinned in GC + the prototype branch `84aebd0` + frames in the SDD workspace). `/login` public outside `_shell`, on the register, from `packages/ui` primitives → Task 1 (Card/Input/Label/Button only; semantic tokens reach the wash/white/ink register with no theme edits — recon-verified the tokens map `--background` to the wash globally). `_shell` gate with aimed-URL preservation + return-to-aimed → Tasks 1 (guard + consumption) and 2 (`beforeLoad` redirect with `location.href`), verified live in Task 4 Step 1. Sign-out affordance completing to revocation + `/login` → Task 3 (Option-2 inline button) + Task 4 Step 3 (sign-out 200 → old cookie bounces). Identity from the gate's fetch, no extra call → Task 2's context pass + the Step 3 component grep gate. Credential failures generic → Task 1's pinned single failure line (any error) + Task 4's wrong-password 401. Stubs unchanged behind the gate → Task 4 Step 3's stub greps + the scope fence (no stub file touched). `pnpm check` green → Task 5 Step 1 (35/35, count re-derived below).
- **Sibling fences:** #121 (api verification, `requireSession`, appointments gating, the session-scoped seam client — nothing under `apps/api`, no `api.server.ts`/`api.functions.ts` edits here), #122 (live puts, teaser/v1 gates, tech-stack/AGENTS/CONTEXT rotation, checkboxes 3/8) — each fenced in the header and per-task Not-here blocks. Shared roadmap checkbox: line 117's box 5 is exactly this ticket → ticked in Task 5 Step 3; boxes 3/8 explicitly left for #122.
- **Type consistency:** `getSession`/`ensureSession` are #119's frozen exports — this plan only CALLS `getSession` (Task 2); `createAuth` appears in zero new files (the Task 2 Step 3 grep pins the unchanged #119 set). `AdminSidebar`'s prop `{ user: { name: string; email: string } }` is introduced in Task 2 and consumed unchanged in Task 3. File names referenced identically across tasks, commits, and docs: `apps/admin/src/lib/auth-client.ts`, `apps/admin/src/routes/login.tsx`, `apps/admin/src/routes/_shell.tsx`, `apps/admin/src/components/admin-sidebar.tsx`. The pinned code blocks in Tasks 1–3 are the exact forms that typechecked in `apps/admin` on 2026-09-22 (the spike), modulo biome's formatting pass.
- **Counts re-derived:** `pnpm check` 35/35 (no test files, no check-pipeline scripts). Task 4 makes exactly 2 `/sign-in/email` POSTs (1 correct, 1 wrong, spaced ≥10s — under the ~3/10s default) + 1 sign-out POST. Exactly 2 new source files + 2 modified + the regenerated routeTree; exactly 1 roadmap tick (box 5); exactly 1 new dev-database user row (`login-ui@sevendays.test`) beside #119's untouched `owner@sevendays.test`; 2 rendered frames (`login-desktop.png`, `login-mobile.png`). The owner manual checklist carries exactly 5 items, quoted once (PR body) — the plan does not restate them as separate verifiable claims.
- **Mocked-boundary check:** no mocks exist in this plan — every Task 4 probe asserts against the real HTTP surface, the real session cookie, and the real database row; the screenshots judge the real rendered screen (the WSL screenshot invocation is pinned with its `--disable-gpu --no-sandbox` requirement — a known host quirk, not an assumption). The interactive form behaviors (typing, click, visual error) are covered three ways without UI automation: the pinned code paths (submit → `{ error }` → fixed line → `navigate`), the owner-validated prototype frames of the identical treatments, and the PR-body manual checklist the owner confirms at review — the spec's own "CDP/manual pass" wording sanctions exactly this split.

