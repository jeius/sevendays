# Admin Shell + IA (Variant A) + the Tier-1 Pull-List (M3 ticket #100) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Give the admin app its decided shell — variant A labeled sidebar grouped Overview / Catalog / Studio, collapsible to the icon-rail posture via the top-bar trigger, sticky top bar with search + notifications, user card, every non-dashboard destination a clickable stub naming its owning milestone, the dashboard an honest v2 empty state — on top of the full Tier-1 pull-list generated into `packages/ui` (Base UI base, registry names verbatim), a mounted `sonner` Toaster, and the decided form substrate (TanStack Form + zod-4 Standard Schema + `field`) proven type-safe.

**Architecture:** The pull-list generates through the #95 infra (ADR-0017) but with `packages/ui` as the **cwd workspace** — plan-time dry-runs proved that only from the package workspace do ALL 21 files land in the package (from an app, `sidebar`'s `use-mobile` hook routes app-local while `sidebar.tsx` lands in the package — an unresolvable cross-workspace import). The shell is Tier-2 admin-local composition (`admin-sidebar`, `admin-topbar`, `stub-screen`, a `_shell` pathless layout route) over the generated `sidebar`/`sheet`/`button`/`input`/`separator`/`badge` primitives and the already-live `--sidebar-*` tool-neutral token mapping. TanStack Router `Link` owns `aria-current` natively (`link.js:241`), so the shell never hand-sets it. URLs stay flat; the shell wraps routes in a pathless layout so M4's login mounts outside it without restructuring.

**Tech Stack:** shadcn CLI pinned `4.21.0`, Base UI (`@base-ui/react`), `sonner` 2.x (+ registry-required `next-themes`), TanStack Router/Start (file-based routes), `@tanstack/react-form` 1.33.x with Standard Schema validators (zod 4), Tailwind v4 CSS-first, pnpm workspaces + Turborepo, Biome, TypeScript via `@sevendays/config`.

**Spec:** Implements ticket [#100 "M3 ticket 06 — admin shell + IA (variant A) + the Tier-1 pull-list"](https://github.com/jeius/sevendays/issues/100) under spec [#94 (Milestone 3 — UI/UX Design System)](https://github.com/jeius/sevendays/issues/94), § "Admin shell & IA (tickets #59 + #93)". Rulings: #59 (variant A + collapsible sidebar; nav taxonomy; prototype as reference), #93 (dashboard ships as a v2 stub — no KPI cards, no filter bar, no table, no chart anything). Primary source for the shell's structure and copy: branch `prototype/59-admin-shell-ia` (throwaway, kept, never merged — values and rulings are adopted, not code). Key recon facts (2026-09-15, this checkout + live probes):

- **Sibling fences (shared roadmap — do not cross):** #97–#99 own every landing surface and the booking flow — this ticket touches no landing file except none at all (it doesn't); #101 owns milestone close-out (the `/prototype-tokens` gallery deletion, the M3 verify checkbox in `docs/plan.md` line 103); `docs/plan.md` line 102 is this ticket's checkbox alone — tick it in Task 6, never lines 99–101 or 103. The v1-picks ledger gets this PR's row at merge time (standing discipline — this one is v1-track: admin is IN the artifact; expected verdict pick, but the call belongs to the triager).
- **Verified state (2026-09-15):** `packages/ui` ships `button` + `./components/*`/`./lib/*`/`./hooks/*` source exports and is in the check pipeline (#95); `packages/ui/src/tokens.css` already carries the full admin tool-neutral `--sidebar-*` set (white sidebar, ink foreground, petrol primary) mapped in `@theme` — #96/#103 landed it; `apps/admin/src/styles.css` already imports the shared layer + the `@source "../../../packages/ui/src";` fallback line; island vocabulary grep over `apps/admin/src` + `packages/ui/src` is **already zero** (Task 5 re-proves it as the AC's gate, it is not new work); admin deps already include `lucide-react`, `cn`, `class-variance-authority`, `zod@^4.5.1`. Baseline `pnpm check` is green in the execution worktree at `main` @ `385712d`.
- **Live-registry facts (probed 2026-09-15):** `shadcn@4.21.0 add <18 names>` from `packages/ui` plans **21 files** — the 18 requested + transitive `tooltip.tsx` (sidebar's dependency) + `src/hooks/use-mobile.ts` (sidebar's `useIsMobile`) + an idempotent `button.tsx` overwrite (same CLI version as #95 → identical content) — and **deps `cn` + `sonner` + `next-themes`** (the registry's sonner wrapper imports `useTheme` from `next-themes`; without a provider it resolves `theme = "system"` — inert but required). The base-rhea `sidebar` uses the **Base UI `render`-prop pattern, not `asChild`** (typed `useRender.ComponentProps<"button">`), exposes `isActive` + `tooltip` props on `SidebarMenuButton`, contains **no `aria-current` anywhere**, persists collapse via the `sidebar_state` cookie (7-day max-age, client-side), and needs no TooltipProvider. The base-rhea `field` is context-free (no `FieldInput` subcomponent — it styles children via `data-slot`/`data-invalid`), and `FieldError` takes `errors?: Array<{ message?: string }>`.
- **The zod-4 form fact:** `@tanstack/zod-form-adapter@0.42.1` peers on `zod ^3.x` (probed) — incompatible with the repo's `zod 4.5.1`. TanStack Form's current first-party mechanism is **Standard Schema**: zod 4 schemas passed directly to `validators` (verified against the live docs). Global Constraints pins the ruling; Task 2's spike makes it typecheck-enforced.
- **Parked / out of scope:** M4 auth mechanics (the user card is placeholder content), M5 CMS surfaces incl. R2 uploads, any dashboard content (v2 payload — #93), real search/notifications wiring (nothing to search until CMS/auth), dark mode, chart anything, landing surfaces (#97–#99), the shared-composed tier (banned), CONTEXT.md changes (component names are not domain language).

## Global Constraints

- **Branch & baseline:** `feat/100-admin-shell-ia` in the worktree `/home/jeius/Projects/sevendays/.worktrees/100-admin-shell-ia` (created via the using-git-worktrees skill; `pnpm install` + `pnpm build:packages` + `pnpm check` all green at plan time). Repo-root commands in this plan run from the worktree root. This plan file is the branch's first commit. Expected `git status`: clean.
- **Every `shadcn` invocation pins the version** (`pnpm dlx shadcn@4.21.0 …` — the #95/ADR-0017 rule) **and the pull-list runs with `packages/ui` as the cwd workspace** (not `-c apps/admin`): the cwd workspace's aliases own non-primitive outputs, and only the package workspace routes the `use-mobile` hook into the package with self-referencing imports its exports map resolves. Both #95 proofs (real write from landing, dry-run from admin) keep the trio's "from either app" AC standing — nothing about the trio's config changes here.
- **The pull-list is registry-verbatim:** `card input label textarea field select checkbox dialog alert-dialog table badge skeleton sonner dropdown-menu sidebar sheet progress separator` — 18 names (the spec's 19 minus `button`, live from #95). The CLI transitively lands `tooltip` + the `use-mobile` hook; both are expected, registry-verbatim, and stay. Expected `packages/ui/package.json` additions: `sonner` + `next-themes` (registry-required; `next-themes` stays permanently — never remove it to "clean up").
- **No hand edits to generated source.** The only permitted transformation is `pnpm --filter @sevendays/ui fix` (Biome normalization). One narrow exception: if typecheck fails on an import the CLI left pointing at `@/registry/…` or `@/app/…` (a packaging artifact — plan-time evidence says the CLI rewrites registry aliases to workspace aliases, so this is not expected), record the exact offending lines in the commit message + PR and delete just that import + its usage. Anything else that doesn't compile: STOP and report.
- **No Radix anywhere this ticket introduces:** after generation, `grep -ri radix packages/ui/src packages/ui/package.json` must return zero hits. Base UI subpaths (`@base-ui/react/…`) are expected.
- **Token ground is frozen (post-#96):** no value changes to `packages/ui/src/tokens.css`, `apps/*/src/styles.css`, or any `--*` token. The admin tool-neutral `--sidebar-*` mapping is already live — this ticket consumes it, never edits it. If any `shadcn` command writes a CSS file, `git checkout -- <file>`, record it, re-verify.
- **The form-substrate ruling (owner review point, surfaced in the PR):** the substrate is `@tanstack/react-form@^1.33.5` (probed latest 1.33.5) with **Standard Schema validators — zod 4 schemas passed directly to `validators`**. Do NOT install `@tanstack/zod-form-adapter` (peers `zod ^3.x`; repo is zod 4.5.1 — it cannot coexist). Task 2's spike proves the claim typecheck-enforced in `apps/admin`, then is deleted (evidence = the commit message + this plan).
- **IA rulings (agent decisions, owner-overridable, surfaced in the PR):** flat URLs — `/appointments`, `/packages`, `/add-ons`, `/studio-services`, `/branches`, `/settings`, with `/` = dashboard (the sidebar groups carry the taxonomy; URLs stay flat like landing's). The shell lives in a pathless layout route `routes/_shell.tsx` so M4's login mounts outside it without restructuring. Stub copy is pinned verbatim in Task 3 (adapted from the #59 blurbs the owner reacted to, with the appointments/dashboard lines reflecting #93's stub ruling).
- **Dashboard discipline:** the dashboard is a `StubScreen` empty state naming v2. Nothing from the prototype's dashboard ships — no KPI cards, no filter bar, no appointments table, no `StatCard`, no chart tokens or chart vocabulary anywhere. Task 5 greps for `chart` across `apps/admin/src` + `packages/ui/src` and expects zero.
- **The four #59 deferred minors — resolution pinned up front (Task 5 proves each):** (1) **`currentTarget` inside state updaters** — the offender sites were the prototype's filter/status selects, which #93's stub ruling unships; no shipped handler reads `currentTarget` inside an updater (grep gate over `apps/admin/src` = zero), and the pattern note rides the v2 record via Task 6's progress entry. (2) **Real nav semantics for Catalog** — fixed by construction: every nav item is a TanStack `Link` to a real route (Task 3). (3) **Dual `aria-current`** — fixed by construction: the shell never hand-sets `aria-current` (zero in admin source; TanStack `Link` sets it natively and the generated sidebar never does — Task 5 proves the SSR count is exactly 1 per screen). (4) **Catalog-toggle no-op** — variant B's two-tier Catalog toggle, and variant B does not ship; nothing to port.
- **Env for dev:** `apps/admin/.env.local` (gitignored; holds `API_URL` only) does not exist in a fresh worktree — copy it from the main checkout before any dev-server step (Task 5 Step 1). Never commit it.
- **Gates (repo AGENTS.md):** `pnpm install` after every manifest change; `pnpm check` green for every touched workspace before the PR; `graphify update .` after code changes; tick checkboxes with `- [✅]`; update `docs/progress.md` (Task 6 pins the entry). Admin's `test` script stays the documented no-op — no test infra lands in this ticket.
- pnpm-only; `async`/`await` style; formatting via the workspaces' Biome `fix` scripts, never by hand.

---

### Task 1: The Tier-1 pull-list generated into packages/ui

**Files:**
- Created by the CLI (not by hand): `packages/ui/src/components/{card,input,label,textarea,field,select,checkbox,dialog,alert-dialog,table,badge,skeleton,sonner,dropdown-menu,sidebar,sheet,progress,separator,tooltip}.tsx` and `packages/ui/src/hooks/use-mobile.ts` — 20 new files
- Overwritten by the CLI (idempotent, same CLI version as #95): `packages/ui/src/components/button.tsx`
- Modified by the CLI: `packages/ui/package.json` (expected: `+ sonner`, `+ next-themes`), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: the #95 infra — `packages/ui/components.json` (aliases all point at `@sevendays/ui/*`), the `./components/*`/`./lib/*`/`./hooks/*` source exports, the check-pipeline scripts.
- Produces: `@sevendays/ui/components/<name>` for all 19 spec names + `tooltip`; `@sevendays/ui/hooks/use-mobile` exporting `useIsMobile`; the sidebar surface Task 4 composes (verified names, base-rhea): `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupContent`, `SidebarGroupLabel`, `SidebarGroupSeparator`, `SidebarHeader`, `SidebarInset`, `SidebarMenu`, `SidebarMenuButton` (render-prop + `isActive` + `tooltip` props), `SidebarMenuItem`, `SidebarProvider`, `SidebarTrigger`, `useSidebar`. Task 4 uses exactly these names — Step 3 records the generated export list as the authoritative set.

**Not here:** no admin code (Tasks 3–5), no token edits (frozen), no rendering of the non-shell primitives (they are validated by generation + the package pipeline — spec testing decision 3: no component unit tests for Tier-1; the shell-borne ones — sidebar, sheet, button, input, separator, badge, sonner, tooltip — get validated by use in Tasks 4–5).

- [ ] **Step 1: Dry-run gate — confirm the plan-time plan still holds**

```bash
cd packages/ui && pnpm dlx shadcn@4.21.0 add card input label textarea field select checkbox dialog alert-dialog table badge skeleton sonner dropdown-menu sidebar sheet progress separator --dry-run -y; cd ../..
```

Expected (plan-time output, 2026-09-15): `Files (21) +20 new, ~1 overwrite` — every `src/components/*.tsx` path relative to `packages/ui` (the 18 names + `tooltip` + `~ button.tsx` overwrite) plus `src/hooks/use-mobile.ts`; `Dependencies (3): cn, sonner, next-themes`. If the output differs (registry drift): proceed only if every requested name still lands under `packages/ui/src/components/` — otherwise STOP and report the drift.

- [ ] **Step 2: Generate for real**

```bash
cd packages/ui && pnpm dlx shadcn@4.21.0 add card input label textarea field select checkbox dialog alert-dialog table badge skeleton sonner dropdown-menu sidebar sheet progress separator -y; cd ../..
```

- [ ] **Step 3: Inspect and record what the CLI did**

```bash
git status --short
git diff packages/ui/package.json
ls packages/ui/src/components packages/ui/src/hooks
grep -n 'export {' packages/ui/src/components/sidebar.tsx
grep -c 'aria-current' packages/ui/src/components/sidebar.tsx
grep -rn '@/registry\|@/app(' packages/ui/src || echo "NO LEFTOVER REGISTRY PATHS — OK"
grep -n 'hooks/use-mobile' packages/ui/src/components/sidebar.tsx
```

Record in the commit message (these facts gate the next steps): (1) `git status` shows writes ONLY under `packages/ui` + `pnpm-lock.yaml` — any write under `apps/` is a routing failure: STOP; (2) the `package.json` diff — expected exactly `sonner` + `next-themes` added to dependencies (anything else: record; if it's a Radix package, STOP — Global Constraints); (3) the component file list — 21 `.tsx` files (20 new + `button.tsx`) + `use-mobile.ts`; (4) the sidebar export list (Task 4's authoritative surface); (5) `aria-current` count in sidebar.tsx — expected `0` (TanStack Link owns it); (6) no leftover `@/registry`/`@/app(` paths; (7) sidebar imports its hook as `@sevendays/ui/hooks/use-mobile` (self-reference, resolvable through the package's own exports).

- [ ] **Step 4: Assert the Base-UI/no-Radix invariant across everything generated**

```bash
grep -ri radix packages/ui/src packages/ui/package.json || echo "NO RADIX — OK"
grep -rn '@base-ui/react' packages/ui/src/components/sidebar.tsx | head -3
```

Expected: `NO RADIX — OK`, and Base UI subpath imports in the sidebar source. Any radix hit: STOP and report.

- [ ] **Step 5: House-format, prove the button overwrite is idempotent, run the package pipeline**

```bash
pnpm --filter @sevendays/ui fix
git diff --stat packages/ui/src/components/button.tsx || true
pnpm --filter @sevendays/ui lint && pnpm --filter @sevendays/ui format && pnpm --filter @sevendays/ui typecheck && pnpm --filter @sevendays/ui build
```

Expected: after `fix`, the button diff is **empty** (the CLI rewrote the file to the same content #95 generated; Biome re-normalized it to the landed form). If the button diff is non-empty after `fix`: record it verbatim in the commit — do not hand-edit toward "clean"; registry drift is an owner-review fact. `lint`/`format`/`typecheck`/`build` all green over the 21-file source (typecheck is where an unresolved CLI import would surface — the Global Constraints exception rule applies if it does).

- [ ] **Step 6: Commit**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): the Tier-1 pull-list into packages/ui — 18 names + transitive tooltip/use-mobile (#100)

<paste the Step 3 inspection record + the Step 5 button-diff result>"
```

---

### Task 2: The decided form substrate — TanStack Form + zod 4 proven in the consuming app

**Files:**
- Modify: `apps/admin/package.json` (add `@tanstack/react-form`), `pnpm-lock.yaml`
- Create then delete (spike, never committed): `apps/admin/src/spike-form-substrate.tsx`

**Interfaces:**
- Consumes: `@sevendays/ui/components/field` (`Field`, `FieldLabel`, `FieldError` — Task 1), `@sevendays/ui/components/input` (Task 1), `zod@^4.5.1` (already a dependency).
- Produces: the declared substrate — `@tanstack/react-form` installed in admin with the Standard-Schema validator pattern proven type-safe against zod 4 + the `field` primitive. M4/M5 forms build on exactly this trio; no form ships in this ticket.

**Not here:** no forms on any screen, no login (M4), no `@tanstack/zod-form-adapter` (banned by Global Constraints — zod-3 peers), no permanent example files (the spike's evidence is the commit message + this plan; a living example would be dead code until M4).

- [ ] **Step 1: Install the dependency**

```bash
pnpm --filter @sevendays/admin add '@tanstack/react-form@^1.33.5'
```

Expected: `apps/admin/package.json` gains `"@tanstack/react-form": "^1.33.5"` in alphabetical position (after `@tanstack/react-devtools`, before `@tanstack/react-query` — keep the file's existing key order convention); lockfile updated. Probed latest at plan time: 1.33.5.

- [ ] **Step 2: Write the spike**

Create `apps/admin/src/spike-form-substrate.tsx` with exactly:

```tsx
// SPIKE — deleted before this task's commit (writing-implementation-plans
// discipline: prove inference claims in the consuming package, leave no
// dead code). Proves the decided form substrate end to end under tsc:
// TanStack Form validators accept zod-4 schemas DIRECTLY (Standard Schema
// — the first-party mechanism; the zod-3-era @tanstack/zod-form-adapter
// is not installable beside zod 4.5.1), and the shared `field` primitive
// renders the errors. If this file compiles, M4/M5's forms have their
// pattern; nothing here ships.
import { useForm } from '@tanstack/react-form';
import { Field, FieldError, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import { z } from 'zod';

const spikeSchema = z.object({
  email: z.email(),
});

export function SpikeFormSubstrate() {
  const form = useForm({
    defaultValues: { email: '' },
    validators: { onChange: spikeSchema },
  });

  return (
    <Field>
      <FieldLabel htmlFor='spike-email'>Email</FieldLabel>
      <form.Field name='email'>
        {(field) => (
          <>
            <Input
              id='spike-email'
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              aria-invalid={field.state.meta.errors.length > 0}
            />
            <FieldError
              errors={field.state.meta.errors.map((error) =>
                typeof error === 'string' ? { message: error } : error
              )}
            />
          </>
        )}
      </form.Field>
    </Field>
  );
}
```

What tsc proves by compiling this: the zod-4 schema type-flows into `validators.onChange` (the claim that replaces the un-installable adapter), `form.Field name='email'` is literal-typed against the schema's keys, and `field.state.meta.errors` maps into `FieldError`'s `Array<{ message?: string }>` shape. Note `e.currentTarget.value` is read synchronously, never inside an updater — the #59 currentTarget minor's pattern rule, honored from the first line of form code. _(Execution correction 2026-09-15: form-core 1.33.5 exposes field errors only at `field.state.meta.errors` (`FieldLikeMetaDerived`, `types.d.ts:238`, errors member at :242) — the original snippet's `field.state.errors` no longer exists; M4/M5 forms read field errors at `meta.errors`.)_

- [ ] **Step 3: Run the typecheck gate**

```bash
pnpm --filter @sevendays/admin typecheck
```

Expected: PASS. Two pinned fallbacks, both recorded in the commit if they fire: (a) if the `FieldError` errors-prop typing rejects the mapped array, render errors as children instead — `<FieldError>{field.state.errors.map(String).join(', ')}</FieldError>` — the validator claim is unaffected; (b) if `validators: { onChange: spikeSchema }` itself does not typecheck against zod 4, STOP and report — the substrate ruling (Global Constraints) reopens as an owner decision, do not improvise an adapter install.

- [ ] **Step 4: Delete the spike**

```bash
rm apps/admin/src/spike-form-substrate.tsx
git status --short
```

Expected: only `apps/admin/package.json` + `pnpm-lock.yaml` changed.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/package.json pnpm-lock.yaml
git commit -m "feat(admin): the decided form substrate — @tanstack/react-form with zod-4 Standard Schema validators (#100)

@tanstack/zod-form-adapter NOT installed: peers zod ^3.x, repo is zod 4.5.1
(probed 2026-09-15); TanStack Form's first-party mechanism is Standard
Schema — schemas passed directly to validators. Spike proven under
admin typecheck and deleted per plan <record: which fallbacks fired, if any>"
```

---

### Task 3: The IA — routes, titles, and stub screens

**Files:**
- Create: `apps/admin/src/components/stub-screen.tsx`
- Create: `apps/admin/src/routes/_shell.tsx` (pathless layout, passthrough in this task — Task 4 gives it the real shell)
- Create: `apps/admin/src/routes/_shell.index.tsx` (dashboard — the honest v2 empty state)
- Create: `apps/admin/src/routes/_shell.appointments.tsx`, `_shell.packages.tsx`, `_shell.add-ons.tsx`, `_shell.studio-services.tsx`, `_shell.branches.tsx`, `_shell.settings.tsx`
- Delete: `apps/admin/src/routes/index.tsx` (the #24/#95 probe page — branches list + button tracer; replaced by the shell's dashboard)

**Interfaces:**
- Consumes: `@sevendays/ui/components/badge` (Task 1); the TanStack Start file-route conventions (`tsr.config.json` → `src/routes`, auto-generated `routeTree.gen.ts`).
- Produces: seven rendered routes — `/` (dashboard stub), `/appointments` (v2), `/packages` (M5), `/add-ons` (M5), `/studio-services` (M5), `/branches` (M5), `/settings` (M4) — each with a `head` title `<Screen> | Sevendays Admin` (landing's pattern, #82); `StubScreen({ title, blurb, milestone })` for Task 4-free reuse; the `_shell` layout route id `/_shell` that Task 4's composition mounts under. `src/lib/queries.ts` + `api.functions.ts` + `api.server.ts` stay untouched — they are the app's API seam for M4/M5; only the probe page that imported them dies.

**Not here:** no shell chrome (Task 4 — this task's `_shell.tsx` is a deliberate passthrough), no landing files, no gallery.

- [ ] **Step 1: Create `stub-screen.tsx`**

Exactly:

```tsx
// Admin-local Tier 2 (spec #94): the placeholder surface behind every nav
// destination whose real screen belongs to a later milestone (#59: the stubs
// exist so the IA is clickable — "IA, not designs"). Copy adapted from the
// #59 prototype blurbs the owner reacted to; the appointments + dashboard
// lines carry #93's stub ruling. One h1 per screen lives here.
import { Badge } from '@sevendays/ui/components/badge';

interface StubScreenProps {
  title: string;
  blurb: string;
  milestone: 'M4' | 'M5' | 'v2';
}

export function StubScreen({ title, blurb, milestone }: StubScreenProps) {
  return (
    <section
      data-stub-screen={milestone}
      className='bg-card/50 border-border flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center'
    >
      <h1 className='text-foreground text-lg font-semibold'>{title}</h1>
      <p className='text-muted-foreground mt-2 max-w-md text-sm'>{blurb}</p>
      <Badge variant='outline' className='mt-4 font-mono text-xs'>
        arrives with {milestone}
      </Badge>
    </section>
  );
}
```

(`border-dashed` + `bg-card/50` is the prototype's stub posture, token-fit. If the generated `badge` variant union lacks `outline`, drop the `variant` prop and record the actual union in the commit — the badge is decorative here, its presence is the point.)

- [ ] **Step 2: Create the passthrough `_shell.tsx`**

Exactly (Task 4 replaces only the `component` body):

```tsx
// The admin app shell layout (pathless — no URL segment): everything
// staff-facing renders through it, so M4's login can mount outside it
// without restructuring. Variant A per #59; composition lands with #100's
// shell task.
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_shell')({
  component: ShellLayout,
});

function ShellLayout() {
  return <Outlet />;
}
```

- [ ] **Step 3: Create the seven route files**

`apps/admin/src/routes/_shell.index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/')({
  head: () => ({ meta: [{ title: 'Dashboard | Sevendays Admin' }] }),
  component: DashboardPage,
});

function DashboardPage() {
  // The honest empty state (#93): the appointments dashboard — its cards,
  // filters, and table — is v2 payload, created wholesale then. Nothing
  // dashboard-shaped ships in v1, so this screen ships empty on purpose.
  return (
    <StubScreen
      title='Dashboard'
      blurb='This screen ships empty for now — the appointments dashboard arrives with v2.'
      milestone='v2'
    />
  );
}
```

`apps/admin/src/routes/_shell.appointments.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/appointments')({
  head: () => ({ meta: [{ title: 'Appointments | Sevendays Admin' }] }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  return (
    <StubScreen
      title='Appointments'
      blurb='The bookings worklist — list, branch/status filters, status updates. The real surface is the appointments dashboard, now v2 payload.'
      milestone='v2'
    />
  );
}
```

`apps/admin/src/routes/_shell.packages.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/packages')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
  component: PackagesPage,
});

function PackagesPage() {
  return (
    <StubScreen
      title='Packages'
      blurb='Package catalog CRUD — create, edit, deactivate. Cover-photo uploads land here with M5 CMS and its R2 media bucket.'
      milestone='M5'
    />
  );
}
```

`apps/admin/src/routes/_shell.add-ons.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/add-ons')({
  head: () => ({ meta: [{ title: 'Add-ons | Sevendays Admin' }] }),
  component: AddOnsPage,
});

function AddOnsPage() {
  return (
    <StubScreen
      title='Add-ons'
      blurb='Add-on services (Makeup, Hairstyle, …) and which studio services they apply to. M5 CMS surface.'
      milestone='M5'
    />
  );
}
```

`apps/admin/src/routes/_shell.studio-services.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/studio-services')({
  head: () => ({ meta: [{ title: 'Studio services | Sevendays Admin' }] }),
  component: StudioServicesPage,
});

function StudioServicesPage() {
  return (
    <StubScreen
      title='Studio services'
      blurb='Studio services catalog (Photo Recovery, Tarpaulin & Bulletin Printing, …) and per-branch bookability. M5 CMS surface.'
      milestone='M5'
    />
  );
}
```

`apps/admin/src/routes/_shell.branches.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Admin' }] }),
  component: BranchesPage,
});

function BranchesPage() {
  return (
    <StubScreen
      title='Branches'
      blurb='Branch info editing — name, address, phone, walk-in flag, business hours, slot capacity. M5 CMS surface.'
      milestone='M5'
    />
  );
}
```

`apps/admin/src/routes/_shell.settings.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/settings')({
  head: () => ({ meta: [{ title: 'Settings | Sevendays Admin' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <StubScreen
      title='Settings'
      blurb='Admin settings — surfaces with M4 admin auth (staff accounts and sessions). Shape TBD by that milestone.'
      milestone='M4'
    />
  );
}
```

If the router plugin rewrites any `createFileRoute` string on generation (check `routeTree.gen.ts` after the Step 5 build — the plugin owns these literals), accept its spelling and record it; the URLs above are the contract.

- [ ] **Step 4: Delete the probe index route**

```bash
git rm apps/admin/src/routes/index.tsx
```

The branches-list probe (connectivity + parse verification, #24) and the #95 button tracer die here by design — #95's plan scheduled this page for shell replacement. `src/lib/queries.ts` and its seam stay (M4/M5's first reads go through them).

- [ ] **Step 5: Format, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin build
```

Expected: all green; `routeTree.gen.ts` regenerates with the seven `_shell` routes and no `/` conflict (the old `index.tsx` is gone).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src
git commit -m "feat(admin): the ruled IA — 7 stub routes behind a pathless _shell layout (#100)

Flat URLs (/appointments /packages /add-ons /studio-services /branches
/settings, / = dashboard v2-stub); titles 'X | Sevendays Admin'; copy from
the #59 blurbs with #93's stub ruling; probe index (branches list #24 +
button tracer #95) deleted per plan — lib seam stays for M4/M5."
```

---

### Task 4: The shell — sidebar, top bar, layout composition, Toaster

**Files:**
- Create: `apps/admin/src/components/admin-sidebar.tsx`
- Create: `apps/admin/src/components/admin-topbar.tsx`
- Modify: `apps/admin/src/routes/_shell.tsx` (passthrough → the shell composition; the `createFileRoute('/_shell')` id stays)
- Modify: `apps/admin/src/routes/__root.tsx` (mount the Toaster)

**Interfaces:**
- Consumes: the Task-1 sidebar surface (`SidebarProvider`, `Sidebar collapsible='icon'`, `SidebarHeader/Content/Footer`, `SidebarGroup(+Label/Content/Separator)`, `SidebarMenu(+Item/Button)`, `SidebarInset`, `SidebarTrigger`, `useSidebar` — `SidebarMenuButton` composes via the Base UI **`render` prop**, with `isActive` styling and `tooltip`), `Button`, `Input`, `Separator`, `badge` (via `StubScreen`), `sonner`'s `Toaster`, `Link`/`useMatchRoute` from `@tanstack/react-router`, lucide icons.
- Produces: the variant A shell — labeled grouped sidebar (Overview / Catalog / Studio) collapsing to the icon-rail posture (tooltips + group dividers) via the top-bar trigger (`sidebar_state` cookie, 7-day, client-side; SSR default = open); sticky top bar (trigger + search + notifications); wordmark + user card; `Toaster` mounted app-wide. Mobile: the primitive's own Sheet disclosure (below its `useIsMobile` breakpoint), which is the AC's mobile-nav half.

**Not here:** no auth (user card is placeholder data until M4), no real search/notifications wiring (nothing to search until CMS/auth — present-but-inert is the ruled IA), no `dropdown-menu` usage (generates in Task 1 for M4/M5; the prototype's bell was a bare button and stays one).

- [ ] **Step 1: Create `admin-sidebar.tsx`**

Exactly:

```tsx
// Admin-local Tier 2 (spec #94): the shell's sidebar — variant A's labeled
// grouped nav (#59 ruling: Overview / Catalog / Studio), collapsing to the
// variant C icon-rail posture (tooltips + group dividers) via the top bar's
// trigger. Brand = wordmark + primary only (the tool-neutral mapping);
// the user card is placeholder data until M4 auth.
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  LayoutDashboard,
  MapPin,
  Package,
  PlusCircle,
  Settings,
  Wrench,
} from 'lucide-react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupSeparator,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@sevendays/ui/components/sidebar';

type NavTo =
  | '/'
  | '/appointments'
  | '/packages'
  | '/add-ons'
  | '/studio-services'
  | '/branches'
  | '/settings';

interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

// The ruled taxonomy (#59), icons carried from the prototype unchanged.
const navGroups: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/packages', label: 'Packages', icon: Package },
      { to: '/add-ons', label: 'Add-ons', icon: PlusCircle },
      { to: '/studio-services', label: 'Studio services', icon: Wrench },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { to: '/branches', label: 'Branches', icon: MapPin },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const matchRoute = useMatchRoute();
  const { state } = useSidebar();
  // Group dividers belong to the icon-rail posture only (#59 variant C);
  // the labeled posture separates groups by its labels + spacing.
  const rail = state === 'collapsed';

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className='flex items-center gap-3 px-2 py-2'>
          <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
            7d
          </span>
          <div className='group-data-[collapsible=icon]:hidden'>
            <p className='text-sm leading-tight font-semibold'>Sevendays</p>
            <p className='text-sidebar-foreground/60 font-mono text-[0.65rem] tracking-widest uppercase'>
              Admin
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, index) => (
          <SidebarGroup key={group.heading}>
            {rail && index > 0 && <SidebarGroupSeparator />}
            <SidebarGroupLabel>{group.heading}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    {/* render-prop delegation (Base UI, not asChild): the Link
                        becomes the menu button. TanStack's Link owns
                        aria-current natively; the primitive's isActive owns
                        styling — exactly one aria-current per screen (the
                        #59 dual-aria-current minor, fixed by construction). */}
                    <SidebarMenuButton
                      render={<Link to={item.to} />}
                      tooltip={item.label}
                      isActive={Boolean(
                        matchRoute({ to: item.to, fuzzy: item.to !== '/' })
                      )}
                    >
                      <item.icon aria-hidden='true' />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {/* Placeholder identity until M4 auth — the data swaps, the shell stays. */}
        <div className='flex items-center gap-3 px-2 py-1.5'>
          <span className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold'>
            SO
          </span>
          <div className='group-data-[collapsible=icon]:hidden'>
            <p className='text-sm leading-tight font-medium'>Studio Owner</p>
            <p className='text-sidebar-foreground/60 text-xs'>Owner</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
```

Two pinned fallbacks, recorded in the commit if they fire: (a) if `SidebarGroupSeparator` is not in Task 1's recorded export list, replace its usage with `<Separator className='my-1' />` from `@sevendays/ui/components/separator`; (b) if `useMatchRoute` rejects the `fuzzy` option spelling in the installed router version, use `matchRoute({ to: item.to })` for non-root items and `matchRoute({ to: '/', fuzzy: false })` for Dashboard — never drop Dashboard's exact match (a fuzzy `/` highlights everywhere). _(Execution notes 2026-09-15: fallback (a) fired — the primitive exports `SidebarSeparator`, no `SidebarGroupSeparator` — and the two text wrappers carry `group-data-[collapsible=icon]:hidden` per the T4 review: `SidebarHeader`/`SidebarFooter` don't clip in the rail posture, unlike `SidebarContent`; fallback (b) is dead — `fuzzy?: boolean` exists on the installed router.)_

- [ ] **Step 2: Create `admin-topbar.tsx`**

Exactly:

```tsx
// Admin-local Tier 2 (spec #94): the sticky top bar — sidebar collapse
// trigger, search, notifications (#59 variant A). Search is present but
// inert: nothing to search until M5's catalog + M4's auth land; the IA is
// the deliverable, the wiring is theirs.
import { Bell } from 'lucide-react';
import { Button } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Separator } from '@sevendays/ui/components/separator';
import { SidebarTrigger } from '@sevendays/ui/components/sidebar';

export function AdminTopbar() {
  return (
    <header className='bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur'>
      <SidebarTrigger />
      <Separator orientation='vertical' className='h-4' />
      <Input
        type='search'
        placeholder='Search…'
        aria-label='Search'
        className='hidden w-56 sm:block'
      />
      <Button variant='ghost' size='icon' aria-label='Notifications' className='ml-auto'>
        <Bell aria-hidden='true' />
      </Button>
    </header>
  );
}
```

(If the generated `SidebarTrigger` already exposes accessible text of its own — check its source — drop nothing here; the extra `aria-label` on `Button`/`Input` stands either way. The `border-b` + `bg-background/95 backdrop-blur` posture is the prototype's sticky-bar posture on semantic tokens.)

- [ ] **Step 3: Compose the shell in `_shell.tsx`**

Replace the Task-3 passthrough — the route id and file path stay, only the component changes:

```tsx
// The admin app shell (pathless — no URL segment): everything staff-facing
// renders through it, so M4's login can mount outside it without
// restructuring. Variant A per #59: labeled sidebar + sticky top bar; the
// sidebar collapses to the icon rail via the top-bar trigger.
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AdminSidebar } from '#/components/admin-sidebar';
import { AdminTopbar } from '#/components/admin-topbar';
import {
  SidebarInset,
  SidebarProvider,
} from '@sevendays/ui/components/sidebar';

export const Route = createFileRoute('/_shell')({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
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

(The generated `SidebarInset` renders the `<main>` element — the wrapper div keeps the content padding off it. If Task 1's recorded sidebar source shows `SidebarInset` is a `div` instead, wrap the content in `<main className='flex-1 space-y-6 p-6' data-shell-main>` and keep the div out — exactly one `<main>` per screen either way.)

- [ ] **Step 4: Mount the Toaster in `__root.tsx`**

In `apps/admin/src/routes/__root.tsx`: add the import after the `PostHogProvider` import:

```tsx
import { Toaster } from '@sevendays/ui/components/sonner';
```

Then inside `RootDocument`'s `<PostHogProvider>` block, immediately after `{children}` and before `<TanStackDevtools`:

```tsx
        {children}
        <Toaster />
```

(App-wide by construction — every future screen, inside or outside the shell, toasts through one mount. The registry wrapper's `next-themes` `useTheme` resolves to `'system'` with no provider; light-only is the ruling, so nothing to configure.)

- [ ] **Step 5: Format, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin build
```

Expected: all green. If typecheck rejects a `render={<Link … />}` composition detail (prop merge on the delegated element), fix it at the composition site (this file) — never inside the generated primitive.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src
git commit -m "feat(admin): the variant A shell — collapsible sidebar, sticky top bar, Toaster (#100)

Sidebar: labeled groups (Overview/Catalog/Studio) collapsing to the icon
rail (tooltips + group dividers) via the trigger; wordmark + user card
(placeholder until M4). Link owns aria-current; isActive owns styling.
<record: which Task-4 fallbacks fired, if any>"
```

---

### Task 5: Verification — SSR smoke, a11y + look gates, the minors, full check

**Files:**
- No source files created. Fixes, if any gate fails, land in the files the gate names — then re-run the gate.
- Refresh: none here (graphify + docs ride Task 6).

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: the evidence pack for the PR + completion report — the runnable checks behind ACs 1–10 (the interactive keyboard/screen-reader pass and the owner's screenshots are the PR's owner-acceptance items; everything assertable statically or over SSR HTML is asserted here).

**Not here:** no M2 CDP regressions (landing-scoped — those run under #97–#99/#101), no dark mode, no mobile-Sheet interaction automation (client-side; covered by the primitive's Base UI semantics + the owner pass).

- [ ] **Step 1: Bring the dev env into the worktree**

```bash
cp /home/jeius/Projects/sevendays/apps/admin/.env.local apps/admin/.env.local
git check-ignore -q apps/admin/.env.local && echo "ignored — OK"
```

Expected: `ignored — OK` (it holds `API_URL` only; it must never be committed).

- [ ] **Step 2: Build admin**

```bash
pnpm --filter @sevendays/admin build
```

Expected: green (TanStack Start emits `dist/`).

- [ ] **Step 3: SSR smoke over every route**

```bash
pnpm --filter @sevendays/admin dev &
sleep 8
```

(The dev script pins `--port 3000`.) Then, recording every result for the evidence pack:

```bash
for path in / /appointments /packages /add-ons /studio-services /branches /settings; do
  echo "== $path =="
  curl -sf "http://localhost:3000$path" | grep -c 'data-sidebar="sidebar"'
  curl -sf "http://localhost:3000$path" | grep -o 'aria-current="page"' | wc -l
  curl -sf "http://localhost:3000$path" | grep -o 'arrives with M[45]\|arrives with v2' | head -1
done
curl -sf http://localhost:3000/ | grep -o 'data-sonner-toaster' | head -1
curl -sf http://localhost:3000/ | grep -o 'data-slot="sidebar-trigger"' | head -1
curl -sf http://localhost:3000/ | grep -o 'Studio Owner' | head -1
curl -sf http://localhost:3000/appointments | grep -o 'Appointments | Sevendays Admin' | head -1
kill %1
```

Expected per route: sidebar count `1` (the shell renders everywhere), aria-current count **exactly `1`** (the active nav link — the dual-aria-current minor's proof), one `arrives with …` line matching the route's milestone (`/` and `/appointments` → v2; `/packages`, `/add-ons`, `/studio-services`, `/branches` → M5; `/settings` → M4). Plus on `/`: `data-sonner-toaster`, `data-slot="sidebar-trigger"`, `Studio Owner`; on `/appointments`: the `<title>` string. Any count off: fix in the file the assertion names and re-run — the aria-current count is the one most likely to catch a hand-set duplicate (delete the duplicate, never the Link's).

- [ ] **Step 4: A11y source gates**

```bash
grep -rn 'aria-current' apps/admin/src --include='*.tsx' || echo "NO HAND-SET ARIA-CURRENT — OK"
grep -c 'aria-current' packages/ui/src/components/sidebar.tsx
grep -n "aria-label='Search'" apps/admin/src/components/admin-topbar.tsx
grep -rn '<h1' apps/admin/src/components/stub-screen.tsx
```

Expected: no hand-set `aria-current` anywhere in admin source (Link-native only); sidebar primitive count `0`; the search input's label present; exactly one `<h1` in `stub-screen.tsx` (one per screen).

- [ ] **Step 5: Look gates — tool-neutral, island-free, chart-free**

```bash
grep -rni 'island' apps/admin/src apps/admin/components.json packages/ui/src || echo "NO ISLAND VOCABULARY — OK"
grep -rn 'wash' apps/admin/src --include='*.tsx' --include='*.css' || echo "NO LANDING WASH IN ADMIN — OK"
grep -rni 'chart' apps/admin/src || echo "NO CHART IN ADMIN — OK"
grep -rni 'chart' packages/ui/src --include='*.tsx' || echo "NO CHART IN COMPONENTS — OK"
grep -c -- '--chart' packages/ui/src/tokens.css || echo "NO CHART TOKENS — OK"
grep -c 'sidebar' packages/ui/src/tokens.css
```

Expected: all four "— OK" lines print plus a `--chart` count of `0` (the island grep was already zero on main — this re-proof is the AC's gate; note `tokens.css`'s header comment legitimately says "No `--chart-*` tokens ship" — that's why the chart gates split by what they check: admin source, component source, and actual token declarations); `tokens.css` sidebar count `≥ 8` (the `--sidebar-*` mapping lines — the tool-neutral surface the shell wears, landed with #96; zero would mean the token file drifted — STOP and check git history before touching anything).

- [ ] **Step 6: The four #59 minors — final proof**

```bash
grep -rn 'currentTarget' apps/admin/src --include='*.tsx' --include='*.ts' || echo "NO CURRENTTARGET SITES — OK"
```

Expected: `NO CURRENTTARGET SITES — OK`. The four minors stand resolved as: (1) currentTarget-in-updater — offender sites unshipped (prototype filter/status selects, #93); zero shipped sites (this grep) + the pattern honored in the Task-2 spike's handler; (2) Catalog nav semantics — real `Link`s to real routes (Step 3's 200s); (3) dual aria-current — zero hand-set (Step 4) + HTML count exactly 1 (Step 3); (4) catalog-toggle — variant B unshipped, nothing ported. All four go in the PR body's AC mapping verbatim.

- [ ] **Step 7: Full check**

```bash
pnpm check
```

Expected: green across all workspaces (`@sevendays/admin`'s test remains the documented no-op; `packages/ui` has no test script by design). Any failure: fix at the source, re-run — do not commit red.

- [ ] **Step 8: Commit (only if a gate forced a fix)**

```bash
git add -A
git commit -m "fix(admin): verification-gate fixes from the #100 evidence pass

<record: which gate failed, what changed>"
```

If no gate failed, skip — the evidence pack rides Task 6's PR body with no extra commit.

---

### Task 6: Docs, gates, PR, handover

**Files:**
- Rewrite: `apps/admin/README.md` (the last starter remnant — "Welcome to your new TanStack Start app!")
- Modify: `AGENTS.md` (the `packages/ui` directory bullet), `docs/progress.md` (What Exists entry), `docs/plan.md` (tick line 102), this plan file (✅ ticks)
- Refresh: `graphify-out/`

**Interfaces:**
- Consumes: everything from Tasks 1–5, including Task 5's evidence pack.
- Produces: pushed branch `feat/100-admin-shell-ia` + an open PR to `main` closing #100; the owner merges, takes the interactive keyboard/screen-reader pass + per-surface screenshots, and ticks #100's boxes (house pattern — evidence pack rides the PR body and the completion report).

**Not here:** `docs/plan.md` lines 99–101 + 103 stay unticked (#97–#99, #101 own them); the v1-picks ledger row is the triager's at merge (expected pick — admin is in the artifact — but never this plan's call); `.cta.json`/`.prettierignore` stay (tooling metadata, not look); CONTEXT.md untouched (spec ruling).

- [ ] **Step 1: Replace the starter README**

Replace the whole of `apps/admin/README.md` with exactly:

```md
# Sevendays Admin

Internal dashboard for the Sevendays Photography studio (3 branches). Ships the app shell + information architecture (M3): labeled sidebar collapsing to an icon rail, stub screens naming their owning milestones. Staff auth lands with M4, content management (incl. R2 cover-photo uploads) with M5, and the appointments dashboard with v2.

## Commands (from the repo root)

- Dev: `pnpm --filter @sevendays/admin dev`
- Build: `pnpm --filter @sevendays/admin build`
- Lint / format / typecheck ride the repo's `pnpm lint` / `pnpm fix` / `pnpm typecheck`

Deployed as a Cloudflare Worker (TanStack Start on `@cloudflare/vite-plugin`) — see `wrangler.jsonc` and `docs/architecture.md`.

The UI is the shared design system: Tier-1 primitives live in `packages/ui` (ADR-0017) on the Base UI base; app components here compose them app-locally. Dev requires `apps/admin/.env.local` (`API_URL`) — see `.env.example`.
```

- [ ] **Step 2: Update the AGENTS.md `packages/ui` bullet**

Replace:

```markdown
- `packages/ui` — the shared design system (ADR-0017): semantic token layer (`@sevendays/ui/tokens.css`, imported by both apps) plus the shared shadcn/Base-UI primitive library — M3 #95 wired `shadcn add` from either app to route primitives here (`components.json` trio pinned `base-rhea`/lucide/zinc; `button` live; `cn` comes from the `cn` package). Apps are Tailwind v4 and own their `@theme` styles
```

with:

```markdown
- `packages/ui` — the shared design system (ADR-0017): semantic token layer (`@sevendays/ui/tokens.css`, imported by both apps) plus the shared shadcn/Base-UI primitive library — M3 #95 wired `shadcn add` from either app to route primitives here (`components.json` trio pinned `base-rhea`/lucide/zinc; the full Tier-1 pull-list live — 19 registry names plus the transitive `tooltip` primitive and `use-mobile` hook, #100; `cn` comes from the `cn` package). Apps are Tailwind v4 and own their `@theme` styles
```

- [ ] **Step 3: Add the progress.md entry**

In `docs/progress.md`, immediately after the `M3 ticket 01 — packages/ui shared primitive library (#95)` bullet (the last entry of `## What Exists`), add:

```markdown
- **M3 ticket 06 — admin shell + IA + the Tier-1 pull-list (#100):** admin wears its decided shell — variant A labeled sidebar (Overview / Catalog / Studio taxonomy, #59) collapsing to the icon-rail posture (tooltips + group dividers) via the top-bar trigger (`sidebar_state` cookie), sticky top bar (search + notifications, present-but-inert), wordmark + placeholder user card (real identity with M4); every non-dashboard destination is a clickable stub naming its owning milestone, and the dashboard is the honest v2 empty state (#93 — no KPI/filter/table/`StatCard`, no chart vocabulary, `grep`-gated). The full Tier-1 pull-list is live in `packages/ui` — 18 names generated this ticket (`button` was #95's) plus the transitive `tooltip` primitive and `use-mobile` hook, all Base UI, registry-verbatim, with `sonner` + `next-themes` as registry-required deps and the Toaster mounted app-wide. The decided form substrate shipped as `@tanstack/react-form` + zod-4 Standard Schema validators + `field` — `@tanstack/zod-form-adapter` is zod-3-only and was NOT installed (owner review point in the PR; spike-proven under admin typecheck). The four #59 deferred minors resolved: real `Link`s fix Catalog semantics; single native `aria-current` (Link-owned, never hand-set — SSR count exactly 1); variant B's catalog toggle and the filter-select `currentTarget`-in-updater sites die unshipped (#93) — the hoisting pattern stays the rule for every future handler (v2's dashboard annex inherits the note). Flat URLs + the `_shell` pathless layout are agent rulings surfaced in the PR. NOT landed: M4 auth, M5 CMS surfaces, any dashboard content (v2).
```

- [ ] **Step 4: Tick the roadmap checkbox**

In `docs/plan.md`, replace:

```markdown
- [ ] Admin shell (variant A, per prototype #59): collapsible labeled sidebar + sticky top bar, grouped nav taxonomy (Overview / Catalog / Studio), user card; stub screens named for their owning milestones incl. the v2-stub dashboard (no KPI cards, no table — #93); Tier-1 pull-list generated into `packages/ui`; `Toaster` mounted; the #59 deferred prototype minors fixed at build
```

with:

```markdown
- [✅] Admin shell (variant A, per prototype #59): collapsible labeled sidebar + sticky top bar, grouped nav taxonomy (Overview / Catalog / Studio), user card; stub screens named for their owning milestones incl. the v2-stub dashboard (no KPI cards, no table — #93); Tier-1 pull-list generated into `packages/ui`; `Toaster` mounted; the #59 deferred prototype minors fixed at build _(2026-09-15: ticket 06 (#100) — 18 names generated this ticket + `button` from #95, transitively landing `tooltip` + the `use-mobile` hook; Toaster mounted; flat URLs + `_shell` pathless layout + the zod-4 Standard-Schema form substrate are agent rulings surfaced in the PR)_
```

- [ ] **Step 5: Tick this plan's boxes and format the docs**

Tick every completed step in this plan file with `- [✅]`. Then:

```bash
pnpm exec biome check --write AGENTS.md docs/progress.md docs/plan.md docs/superpowers/plans/2026-09-15-100-admin-shell-ia-tier1-pull-list.md apps/admin/README.md
```

- [ ] **Step 6: graphify + full check**

```bash
graphify update .
pnpm check
```

Expected: graph refresh touches `graphify-out/` only (the pre-existing untracked `graphify-out/cache/` file from the main checkout is expected); `pnpm check` green.

- [ ] **Step 7: Commit, push, open the PR**

```bash
git add AGENTS.md docs/ apps/admin/README.md graphify-out
git commit -m "docs: #100 close-out — admin README, AGENTS.md ui bullet, progress record, roadmap tick, plan ticks, graph refresh"
git push -u origin feat/100-admin-shell-ia
gh pr create --base main --head feat/100-admin-shell-ia \
  --title "feat(admin): #100 M3 ticket 06 — admin shell + IA (variant A) + the Tier-1 pull-list" \
  --body "Implements #100 (M3 ticket 06). Closes #100.

## What landed
- **The Tier-1 pull-list** in \`packages/ui\`: 18 registry names generated via \`shadcn@4.21.0\` on the Base UI base (run from the package workspace — see review point 3), transitively landing \`tooltip\` + the \`use-mobile\` hook; \`sonner\` + \`next-themes\` added as registry-required deps; \`button\` overwrite verified idempotent; zero radix (grep-proven); package pipeline green.
- **The variant A shell** (\`#59\` ruling): labeled grouped sidebar (Overview / Catalog / Studio) collapsing to the icon-rail posture (tooltips + group dividers) via the top-bar trigger; sticky top bar (search + notifications); wordmark + user card (placeholder until M4); \`Toaster\` mounted app-wide.
- **The IA**: 7 routes on flat URLs behind a pathless \`_shell\` layout — every non-dashboard screen a clickable \`StubScreen\` naming its owning milestone (M4 auth / M5 CMS incl. R2 / v2 appointments dashboard); the dashboard the honest v2 empty state (#93 — no KPI, no filter bar, no table, no chart vocabulary; grep-gated).
- **The form substrate**: \`@tanstack/react-form\` + zod-4 Standard Schema validators + \`field\`, spike-proven under admin typecheck.

## Owner review points (agent rulings, overridable)
1. **Form substrate**: the spec's \`@tanstack/zod-form-adapter\` peers on zod ^3 — incompatible with the repo's zod 4.5.1. Shipped the first-party Standard Schema path (schemas passed directly to \`validators\`) instead; adapter NOT installed.
2. **Flat URLs + \`_shell\` pathless layout**: sidebar groups carry the taxonomy; URLs stay flat; the layout route lets M4's login mount outside the shell.
3. **Generation cwd**: the pull-list ran from \`packages/ui\` (not \`-c apps/admin\`) — from an app, \`sidebar\`'s \`use-mobile\` hook routes app-local while \`sidebar.tsx\` lands in the package (unresolvable import); from the package, all 21 files land with self-referencing imports. #95's from-either-app proof stands.
4. **Transitive pulls**: \`tooltip\` + \`use-mobile\` arrive via \`sidebar\`'s registry deps; \`next-themes\` rides the sonner wrapper (inert without a provider — light-only is the ruling).
5. **The four #59 minors**: real \`Link\`s fix Catalog semantics; single native \`aria-current\` (SSR count exactly 1); variant B's catalog toggle + the \`currentTarget\`-in-updater sites die unshipped per #93 — the hoisting pattern is recorded for v2's dashboard.

## Owner acceptance (beyond the runnable gates)
Interactive keyboard + screen-reader pass on the shell (collapse, mobile sheet, tooltips) and per-surface screenshots — the PR's visual gate per spec testing decision 5.

## AC mapping
AC 1 variant A shell + collapse → Task 4 (+5.3) · AC 2 top bar + user card → Task 4 · AC 3 stubs clickable → Task 3 (+5.3) · AC 4 dashboard stub / no chart → Task 3 (+5.5) · AC 5 19-primitive pull-list → Task 1 · AC 6 Toaster → Task 4.4 (+5.3) · AC 7 tool-neutral / island-free → Task 5.5 · AC 8 four #59 minors → GC table (+5.3/5.4/5.6) · AC 9 disclosure navigation → Tasks 1+4 semantics (+5.4) + owner pass · AC 10 \`pnpm check\` green → Tasks 1.5 / 5.7 / 6.6.

Standing v1-picks discipline applies at merge (admin is in the artifact — expected pick; triager's call)."
```

- [ ] **Step 8: The completion report — then STOP**

One message to the owner, containing:

1. **The evidence pack** (verbatim from the working record): Task 1's inspection record (file list, dep diff, sidebar export list, no-app-writes, no-radix, button idempotency), Task 2's typecheck result + which fallbacks fired (if any), Task 5's full SSR smoke table (per-route counts), the a11y/look/minor gate outputs, `pnpm check` tail.
2. **The AC mapping** (as pinned in the PR body).
3. **State:** branch `feat/100-admin-shell-ia` pushed, PR open with `Closes #100` — the owner takes the keyboard/SR pass + screenshots, merges, and ticks #100's boxes; the merge gets the standing v1-picks triage.
4. **Flags:** the five owner review points from the PR body (form substrate, URLs/layout, generation cwd, transitive pulls, minors resolution), plus any deviation from plan-time expectations (registry drift, fallbacks that fired) stated plainly with what was done.

Then STOP. The turn ends with the report; nothing in this ticket runs after it.

---

## Self-Review

- **Spec coverage (ticket ACs):** AC 1 (variant A shell, labeled grouped sidebar, collapsible icon rail with tooltips + group dividers via an owner toggle) → Task 4 (`Sidebar collapsible='icon'`, per-item `tooltip`, rail-only group separators, `SidebarTrigger` in the top bar; Task 5.3 proves render). AC 2 (sticky top bar search + notifications; user card at sidebar bottom) → Task 4 Steps 2 (top bar) + 1 (`SidebarFooter` card). AC 3 (every destination clickable; stubs name owning milestones) → Task 3's seven routes + pinned copy (M4/M5/v2 in every blurb + badge). AC 4 (dashboard = honest v2 stub, no chart anything) → Task 3 `_shell.index.tsx` + Task 5.5's `chart` grep gate; nothing dashboard-shaped is authored anywhere. AC 5 (full 19-primitive pull-list, registry-verbatim, Base UI) → Task 1 (18 names + `button` from #95 = 19; transitive `tooltip`/`use-mobile` documented; Steps 3–4 assert registry fidelity + no-radix). AC 6 (sonner Toaster app-wide) → Task 4 Step 4 (`__root.tsx`, outside the shell layout so it is app-wide) + Task 5.3. AC 7 (tool-neutral look, island remnants gone) → consumed `--sidebar-*` mapping + wordmark/primary-only sidebar (Task 4 Step 1) + Task 5.5's island/wash gates (already zero on main — re-proven as the gate; the starter README, the last visible starter remnant, dies in Task 6 Step 1). AC 8 (four #59 minors) → Global Constraints' pinned resolution table + Task 5 proofs (5.3 aria-current count, 5.4 zero hand-set, 5.6 zero currentTarget; catalog-toggle dies unshipped). AC 9 (disclosure navigation, keyboard + SR pass) → Base UI sheet/tooltip/trigger semantics from the generated substrate + Task 5.3/5.4 assertions + the owner's interactive pass (PR "Owner acceptance" — the spec's testing decision makes visual/interactive acceptance the owner's, not a script's). AC 10 (`pnpm check` green incl. `packages/ui`) → Task 1 Step 5 (package pipeline), Task 5 Step 7, Task 6 Step 6.
- **Sibling fences:** #97–#99 — no landing file is touched by any task (Tasks 3–5 are admin + packages/ui only; Task 6's doc edits are the shared bullet, progress, roadmap line 102 — never lines 99–101/103); #101 — the `/prototype-tokens` gallery and milestone close-out untouched; #95's landed work — `button.tsx` only changes if the CLI's overwrite drifts (recorded, never hand-edited); the v1-picks ledger — untouched, triager's at merge. The shared roadmap checkbox (line 102) is ticked in Task 6 only, after every gate above it is green.
- **Placeholder scan:** the `<paste …>` / `<record: …>` directives name their source steps exactly (house pattern — inspection records exist only after the step runs). Every file the executor authors by hand (spike, stub-screen, 8 route files, sidebar, topbar, layout, README, AGENTS.md/progress/plan.md edits, PR body) is pinned verbatim in fenced blocks; CLI-generated content is intentionally unpinned — it is registry output gated by property assertions (imports, deps, destination, no-radix, export list), the ticket's own acceptance mechanism. Fallbacks are pinned as exact alternative code, not prose.
- **Type/signature consistency:** `StubScreen({ title, blurb, milestone })` is defined once (Task 3 Step 1) and called with exactly those props in all seven route files (Task 3 Step 3); `AdminSidebar`/`AdminTopbar` are exported from their Task-4 files and imported by name in `_shell.tsx`; the sidebar surface Task 4 consumes matches the names Task 1 Step 3 records as authoritative, with pinned fallbacks for the two lowest-confidence names (`SidebarGroupSeparator`, `useMatchRoute` fuzzy); `@sevendays/ui/components/<name>` imports resolve through the package's `./components/*` export (unchanged since #95) and `./hooks/use-mobile` through `./hooks/*`; `@tanstack/react-form@^1.33.5` is the probed latest (2026-09-15) and appears identically in Global Constraints and Task 2; `zod@^4.5.1` matches admin's manifest; the flat-URL list is byte-identical across Global Constraints, `NavTo`, Task 3's files, and Task 5's curl loop.
- **Claim strength vs. proof:** generation routing/hook placement — proven by two plan-time dry-runs (quoted in Architecture + Global Constraints); sidebar composition API (`render` prop, `isActive`, `tooltip`, no `aria-current`, `sidebar_state` cookie, no TooltipProvider) — from the live registry item; sonner's `next-themes` import — from the viewed generated source; zod-4 Standard Schema validation — from the live docs + adapter peer-range probe, and made executor-verifiable by the Task-2 spike (typecheck-enforced, deleted after); TanStack `Link` aria-current — from the installed router's `link.js:241`; Tailwind scanning of `packages/ui/src` — already proven in production by #95's landed `@source` line (Task 5 assumes the landed state, it does not re-derive it); the one thing no plan can prove — owner acceptance of the shipped look — is explicitly routed to the PR's owner-acceptance section rather than claimed.

