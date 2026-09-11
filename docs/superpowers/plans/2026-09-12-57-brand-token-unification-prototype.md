# Brand → shadcn Token Unification Prototype (wayfinder #57) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Apply the owner's shadcn preset (`b1uGsTYZ6`) as the brand→semantic token mapping, make `packages/ui` the single shared token source for both apps, and mount a throwaway showcase route so the owner can react to the mapped look on real components.

**Architecture:** The shadcn CLI writes the preset into `apps/landing/src/styles.css` (per its `components.json`). We then lift the token layer (brand primitives + shadcn semantic tokens + `@theme inline` mapping) out of both apps' stylesheets into a new `packages/ui/src/tokens.css`, imported by both apps — concretely testing the distribution ruling from research ticket #56 (shared semantic tokens in `packages/ui`) and the Tailwind v4 package-import mechanics. A `/prototype-tokens` route in landing renders representative shadcn-style components using only semantic utilities. No variant switcher: the owner authored the mapping in the shadcn editor, and the iteration loop is edit-preset → re-apply → refresh.

**Tech Stack:** Tailwind v4 (CSS-first `@theme`), TanStack Start (file routes, auto-registered), shadcn CLI v3 `apply` command, pnpm workspaces, Biome, Vitest.

**Spec:** This plan implements wayfinder ticket [#57 "Prototype: brand → shadcn token unification"](https://github.com/jeius/sevendays/issues/57) on map [#55 "Wayfinder map: UI/UX design system milestone"](https://github.com/jeius/sevendays/issues/55). Key spec facts:

- **Deliverable** (from #57): brand palette re-expressed as shadcn semantic tokens (oklch), Fraunces/Manrope wired as `--font-*`, radius/chart/sidebar tokens included — landing first, mirrored into admin — so the owner can react on real components.
- **The mapping question is answered by the owner's preset**, not hand-derived variants (owner decision, 2026-09-12): `pnpm dlx shadcn@latest apply --preset b1uGsTYZ6`.
- **Fixed inputs** (map #55 charting rulings): the brand itself — sea-ink/lagoon/palm palette, Fraunces/Manrope typefaces. No rebrand. "Minor visual redesign" never extends to identity.
- **Shared-definition question** (#56 resolution, adopted on the map): shared primitives + semantic tokens live in `packages/ui`; each app imports them. AGENTS.md's "shared tokens live in packages/ui" line becomes true again through this work.
- **Parked / out of scope:** dark mode (v1), Storybook/visual tooling, formal a11y audit, executing the milestone, `docs/progress.md` updates (this branch is throwaway; progress docs update when validated work lands on main), `graphify update` (same reason — the graph tracks main).
- **Stack fact** (owner-corrected): shadcn/ui primitives are **Base UI**, not Radix. Some installed skill prose still says Radix — ignore it.

## Global Constraints

- **Work happens in the worktree** `/home/jeius/Projects/sevendays/.worktrees/57-brand-tokens` on branch `prototype/57-brand-token-unification` (created off `main` @ f29ce87). All paths below are relative to that worktree root unless absolute. Baseline verified: `pnpm install` + `pnpm build:packages` + `pnpm test` all green (2026-09-12).
- **Everything here is throwaway-branch work.** Nothing merges to `main`; `main` keeps only the validated decision later. Prototype code is marked as such at the top of each file.
- **No tests for prototype code** (prototype rules: no tests, no polish). The gates are: existing suites stay green, both apps build, the route renders. `pnpm check` must pass at the end (repo rule: don't commit code that fails it for touched packages).
- **Brand palette and typefaces are fixed inputs.** Never invent new brand hues. oklch reference values for the fixed palette (used as fallbacks where the preset doesn't reach):

  | Token | Hex | oklch |
  |---|---|---|
  | sea-ink | `#173a40` | `oklch(0.325 0.041 210.2)` |
  | sea-ink-soft | `#416166` | `oklch(0.470 0.038 208.2)` |
  | lagoon | `#4fb8b2` | `oklch(0.720 0.097 190.1)` |
  | lagoon-deep | `#328f97` | `oklch(0.599 0.086 203.3)` |
  | palm | `#2f6a4a` | `oklch(0.475 0.081 157.5)` |
  | sand | `#e7f0e8` | `oklch(0.946 0.014 148.8)` |
  | foam | `#f3faf5` | `oklch(0.978 0.010 155.1)` |

- **Do not delete or redesign the `.dark` blocks.** Dark mode is parked: whatever `.dark` content exists after the preset apply is carried into the shared file unchanged, sight unseen.
- **Leave `packages/ui/src/globals.css` (the stale v3-era file) and its `./globals.css` export untouched** — cleaning it up is milestone work, not prototype work.
- **Leave both apps' app-specific CSS (hero gradients, `island-shell`, `nav-link`, `display-title`, etc.) in place, app-local.** Only the token layer moves.
- pnpm-only, `async`/`await` style, single-quoted imports matching existing files (Biome enforces).

---

### Task 1: Apply the owner's shadcn preset to landing

**Files:**
- Modify (by CLI, not by hand): `apps/landing/src/styles.css` — the shadcn-managed token block is rewritten to the preset's values; possibly font setup changes.
- Possibly modify (by CLI): `apps/landing/components.json`, `apps/landing/package.json` — only if the CLI adds a font dependency.

**Interfaces:**
- Consumes: preset ID `b1uGsTYZ6` (owner-authored in the shadcn editor), `apps/landing/components.json` (`css: src/styles.css`, so that's where tokens land).
- Produces: a post-apply `apps/landing/src/styles.css` whose semantic token values come from the preset. Tasks 2–3 read these blocks; the inspection record from Step 2 drives their conditionals.

- [ ] **Step 1: Run the preset apply**

From the worktree root:

```bash
pnpm dlx shadcn@latest apply --preset b1uGsTYZ6 -y -c apps/landing
```

`-y` skips the interactive confirmation (prompts hang agent shells). Expected: output listing applied parts (theme, possibly font), no errors. If the CLI errors on the `-c` flag resolving, `cd apps/landing && pnpm dlx shadcn@latest apply --preset b1uGsTYZ6 -y` is the fallback form.

- [ ] **Step 2: Inspect and record what the preset wrote**

```bash
git status --short
git diff -- apps/landing
```

Record in the Task 1 commit message (these facts drive Task 2's conditionals):
1. The preset's `--primary`, `--accent`, `--ring`, `--background`, `--foreground`, `--radius` values (exact oklch).
2. Whether font parts were applied (Google Fonts import? package dep? `--font-sans` value? any `--font-serif`?).
3. Whether `--chart-1..5` and `--sidebar-*` tokens were written, or remain at previous values.
4. Whether a `.dark` block was written/changed, and whether it's preset-branded or still default.
5. Whether the free-floating brand vars (`--sea-ink` … `--hero-b`) were touched (expected: not — they're not shadcn-managed tokens).

- [ ] **Step 3: Verify landing still builds**

```bash
pnpm --filter @sevendays/landing build
```

Expected: build succeeds. (CSS-only token value changes can't break types; this guards against CLI accidents.)

- [ ] **Step 4: Commit**

```bash
git add -A apps/landing
git commit -m "prototype(#57): apply owner shadcn preset b1uGsTYZ6 to landing

<paste the Step 2 inspection record here>"
```

---

### Task 2: Lift the token layer into packages/ui as the single shared source

**Files:**
- Create: `packages/ui/src/tokens.css`
- Modify: `packages/ui/package.json` (add export)
- Modify: `apps/landing/package.json`, `apps/admin/package.json` (add `@sevendays/ui` workspace dep)
- Modify: `apps/landing/src/styles.css`, `apps/admin/src/styles.css` (cut token blocks, add import)

**Interfaces:**
- Consumes: post-apply `apps/landing/src/styles.css` blocks from Task 1; the fallback oklch table in Global Constraints.
- Produces: `@sevendays/ui/tokens.css` export consumed by both apps via `@import "@sevendays/ui/tokens.css";`. Downstream (Task 3, and later the milestone) relies on: semantic utilities (`bg-primary`, `text-muted-foreground`, `ring-ring`, `bg-chart-1`…, `bg-sidebar`, …) and brand utilities (`bg-sea-ink`, `bg-lagoon`, `bg-palm`, `bg-sand`, `bg-foam`, `bg-sea-ink-soft`, `bg-lagoon-deep`) all existing in both apps, plus `font-sans` / `font-serif` utilities.

- [ ] **Step 1: Create `packages/ui/src/tokens.css` by assembling moved blocks**

Assemble in this order (cut-and-paste from `apps/landing/src/styles.css` post-Task-1, not retyped):

```css
/* PROTOTYPE (wayfinder #57) — shared token source for both apps.
   Brand primitives (fixed inputs) + shadcn semantic layer (owner preset
   b1uGsTYZ6) + the Tailwind v4 @theme mapping. Imported by each app's
   styles.css. Throwaway candidate: the milestone spec decides its final home.
   Dark mode is PARKED for v1: the .dark block below is carried over
   as-found, not designed. */

:root {
  /* — Brand primitives (fixed inputs, hex) — */
  /* <paste the --sea-ink … --hero-b :root block from landing styles.css> */
}

:root {
  /* — shadcn semantic layer (preset b1uGsTYZ6) — */
  /* <paste the post-apply --background … --sidebar-ring :root block> */
}

.dark {
  /* <paste the .dark block(s) as found post-apply, unchanged> */
}

:root {
  /* — Preset-gap fallbacks: only add a line if the preset did NOT write it — */
  --sidebar: oklch(0.978 0.010 155.1);            /* foam */
  --sidebar-foreground: oklch(0.325 0.041 210.2); /* sea-ink */
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: oklch(0.946 0.014 148.8);     /* sand */
  --sidebar-accent-foreground: oklch(0.325 0.041 210.2);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
  --chart-1: oklch(0.599 0.086 203.3); /* lagoon-deep */
  --chart-2: oklch(0.475 0.081 157.5); /* palm */
  --chart-3: oklch(0.325 0.041 210.2); /* sea-ink */
  --chart-4: oklch(0.720 0.097 190.1); /* lagoon */
  --chart-5: oklch(0.470 0.038 208.2); /* sea-ink-soft */
  --font-sans: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  --font-serif: 'Fraunces', Georgia, serif;
}

@theme inline {
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --color-sea-ink: var(--sea-ink);
  --color-sea-ink-soft: var(--sea-ink-soft);
  --color-lagoon: var(--lagoon);
  --color-lagoon-deep: var(--lagoon-deep);
  --color-palm: var(--palm);
  --color-sand: var(--sand);
  --color-foam: var(--foam);
  /* <paste the full --color-background … --color-sidebar-ring @theme inline
     mapping block from landing styles.css> */
  /* keep the --radius-sm/md/lg/xl calc() lines from that block */
}
```

Conditional rules (driven by Task 1's Step 2 record — apply each only if true):
- If the preset wrote `--chart-*` values, drop the `--chart-*` fallback lines above.
- If the preset wrote `--sidebar-*` values, drop the `--sidebar-*` fallback lines above (keep `var()`-based ones only where the preset genuinely omitted that token).
- If the preset set `--font-sans` to something other than Manrope, keep the fallback line (Manrope is a fixed input) and note the conflict in the commit message for the owner to resolve in the shadcn editor.
- `--font-serif: 'Fraunces'…` always stays — shadcn presets manage `--font-sans`/`--font-mono`; the serif display face is our addition.
- If the preset's font part removed the Google Fonts `@import url(…Fraunces…Manrope…)` line from `styles.css` and replaced it with a package dep, leave that mechanism per-app exactly as the CLI left it — fonts load per app; only the `--font-*` mappings are shared.

- [ ] **Step 2: Export it from the package**

In `packages/ui/package.json`, extend `exports` (keep the existing `./globals.css` entry untouched):

```json
"exports": {
  "./globals.css": "./src/globals.css",
  "./tokens.css": "./src/tokens.css"
}
```

- [ ] **Step 3: Add the workspace dependency to both apps**

In `apps/landing/package.json` and `apps/admin/package.json` `dependencies`, add (match the existing `"@sevendays/…": "workspace:*"` style and keep keys alphabetized as the file has them):

```json
"@sevendays/ui": "workspace:*"
```

Then from the worktree root:

```bash
pnpm install
```

Expected: link created, lockfile updated, no resolution errors.

- [ ] **Step 4: Cut the token blocks from both apps and import the shared file**

In **both** `apps/landing/src/styles.css` and `apps/admin/src/styles.css`:
1. Delete the `:root { --sea-ink … --hero-b … }` block, the shadcn `:root` token block, the `.dark` block(s), and the entire `@theme inline { … }` block — everything that now lives in `tokens.css`. Both apps start from identical copies, so the same cuts apply to both. Keep: the Google Fonts `@import url(...)` (or the CLI's replacement font mechanism), `@import "tailwindcss"`, `@import "tw-animate-css"`, `@plugin "@tailwindcss/typography"`, `@custom-variant dark`, and every app-specific rule below (`body` gradients, `island-shell`, `nav-link`, `@layer base`, etc.).
2. Add directly after `@import "tw-animate-css";`:

```css
@import "@sevendays/ui/tokens.css";
```

Note: app CSS still references the brand vars (`var(--sea-ink)`, `var(--sand)`, `var(--hero-a)`, …) — they now resolve from the shared file. `@layer base { * { @apply border-border outline-ring/50 } }` still works: those utilities are generated from the shared `@theme`.

- [ ] **Step 5: Build both apps and prove the chain generated utilities**

```bash
pnpm --filter @sevendays/landing build && pnpm --filter @sevendays/admin build
```

Expected: both succeed. Then find the built client CSS and confirm preset + brand utilities landed:

```bash
find apps/landing -name '*.css' -path '*build*' -o -name '*.css' -path '*.output*' | head -5
# grep the found asset(s) for the preset's --primary oklch value from Task 1, and for 'sea-ink'
```

Expected: the preset's primary oklch literal and the brand var both appear in built CSS. If the find pattern matches nothing (output layout varies), the Task 3 render smoke is the fallback proof — note it and move on.

- [ ] **Step 6: Commit**

```bash
git add packages/ui apps/landing apps/admin pnpm-lock.yaml
git commit -m "prototype(#57): shared token layer in packages/ui, both apps import it

<note which fallbacks fired and any font-sans conflict>"
```

---

### Task 3: Throwaway showcase route /prototype-tokens

**Files:**
- Create: `apps/landing/src/routes/prototype-tokens.tsx`

**Interfaces:**
- Consumes: semantic utilities (`bg-primary`, `text-primary-foreground`, `bg-secondary`, `text-muted-foreground`, `border-input`, `ring-ring`, `bg-chart-1..5`, `bg-sidebar*`, `border-sidebar-border`), brand utilities (`bg-sea-ink` etc.), `font-sans`/`font-serif`, and the real `SiteHeader` from `../components/site-header`.
- Produces: route `/prototype-tokens` (file routes are auto-registered into routeTree by the TanStack Start plugin on dev/build — no manual registration). Marker attribute `data-prototype-tokens` is what the smoke test greps for.

- [ ] **Step 1: Write the route file**

Create `apps/landing/src/routes/prototype-tokens.tsx` with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #57: brand → shadcn token unification.
// Renders representative shadcn-style components using ONLY semantic tokens
// so the preset mapping can be judged on real UI. Not linked from any nav.
// Delete this file when the design-system milestone work lands.
import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '../components/site-header';

export const Route = createFileRoute('/prototype-tokens')({
  component: PrototypeTokensPage,
});

function PrototypeTokensPage() {
  return (
    <div className='mx-auto max-w-5xl p-6 pb-24' data-prototype-tokens>
      <SiteHeader />

      <header className='mt-10'>
        <p className='text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase'>
          Wayfinder #57 · Preset b1uGsTYZ6
        </p>
        <h1 className='text-foreground mt-2 font-serif text-5xl font-bold'>
          Sevendays Photography
        </h1>
        <p className='text-foreground mt-3 max-w-prose'>
          Display headings render in Fraunces via <code>font-serif</code>;
          this body copy renders in Manrope via <code>font-sans</code>. Every
          color below is a semantic token — react to the mapping, not to
          individual hex values.
        </p>
      </header>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>Buttons</h2>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            className='bg-primary text-primary-foreground focus-visible:ring-ring rounded-md px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          >
            Book now
          </button>
          <button
            type='button'
            className='bg-secondary text-secondary-foreground rounded-md px-4 py-2 text-sm font-medium'
          >
            Secondary
          </button>
          <button
            type='button'
            className='border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground rounded-md border px-4 py-2 text-sm font-medium'
          >
            Outline
          </button>
          <button
            type='button'
            className='text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm font-medium'
          >
            Ghost
          </button>
          <button
            type='button'
            className='rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white'
          >
            Destructive
          </button>
          <button
            type='button'
            disabled
            className='bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium opacity-50'
          >
            Disabled
          </button>
        </div>
      </section>

      <section className='mt-10 grid gap-6 md:grid-cols-2'>
        <div>
          <h2 className='text-foreground font-serif text-2xl font-semibold'>Package card</h2>
          <article className='bg-card text-card-foreground mt-4 flex flex-col gap-3 rounded-xl border p-6 shadow-sm'>
            <div className='bg-secondary aspect-[4/3] rounded-lg' />
            <h3 className='font-serif text-2xl font-semibold'>Signature Portrait</h3>
            <p className='text-foreground text-lg font-semibold'>₱3,500</p>
            <p className='text-muted-foreground text-sm'>
              A 90-minute session at any branch: one outfit change, guided
              posing, and twenty hand-edited photos delivered in seven days.
            </p>
            <button
              type='button'
              className='bg-primary text-primary-foreground mt-2 rounded-md px-4 py-2 text-center text-sm font-medium'
            >
              Book now
            </button>
          </article>
        </div>

        <div>
          <h2 className='text-foreground font-serif text-2xl font-semibold'>Form</h2>
          <div className='mt-4 flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-name' className='text-foreground text-sm font-medium'>
                Full name
              </label>
              <input
                id='proto-name'
                type='text'
                placeholder='Juan dela Cruz'
                className='border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none'
              />
              <p className='text-muted-foreground text-xs'>
                Helper text in muted-foreground.
              </p>
            </div>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-email' className='text-foreground text-sm font-medium'>
                Email
              </label>
              <input
                id='proto-email'
                type='email'
                defaultValue='not-an-email'
                className='rounded-md border border-destructive bg-background px-3 py-2 text-sm text-destructive focus-visible:ring-destructive focus-visible:ring-2 focus-visible:outline-none'
              />
              <p className='text-xs text-destructive'>
                Enter a valid email address.
              </p>
            </div>
          </div>

          <h2 className='text-foreground mt-8 font-serif text-2xl font-semibold'>Badges</h2>
          <div className='mt-4 flex flex-wrap gap-2'>
            <span className='bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
              Confirmed
            </span>
            <span className='bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
              Pending
            </span>
            <span className='border-border text-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium'>
              Walk-in
            </span>
          </div>
        </div>
      </section>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Chart palette (CSS stand-in)
        </h2>
        <div className='bg-card mt-4 flex h-40 items-end gap-3 rounded-xl border p-6'>
          <div className='bg-chart-1 h-3/5 w-full rounded-t-sm' title='chart-1' />
          <div className='bg-chart-2 h-2/5 w-full rounded-t-sm' title='chart-2' />
          <div className='bg-chart-3 h-4/5 w-full rounded-t-sm' title='chart-3' />
          <div className='bg-chart-4 h-3/5 w-full rounded-t-sm' title='chart-4' />
          <div className='bg-chart-5 h-2/5 w-full rounded-t-sm' title='chart-5' />
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          chart-1…chart-5, left to right. The brand has no five-hue ramp — these
          fallbacks are a brand tonal ramp unless the preset supplied its own.
        </p>
      </section>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Admin sidebar mock
        </h2>
        <aside className='bg-sidebar mt-4 w-64 rounded-xl border border-sidebar-border p-3'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground rounded-lg px-3 py-2 font-serif font-bold'>
            Sevendays Admin
          </div>
          <nav className='mt-3 flex flex-col gap-1'>
            <span className='bg-sidebar-accent text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm font-medium'>
              Dashboard
            </span>
            <span className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm'>
              Appointments
            </span>
            <span className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm'>
              Packages
            </span>
            <span className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm'>
              Branches
            </span>
          </nav>
        </aside>
      </section>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Brand primitives (fixed inputs)
        </h2>
        <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7'>
          <Swatch cls='bg-sea-ink' label='sea-ink' sub='text' />
          <Swatch cls='bg-sea-ink-soft' label='sea-ink-soft' sub='muted text' />
          <Swatch cls='bg-lagoon' label='lagoon' sub='bright accent' />
          <Swatch cls='bg-lagoon-deep' label='lagoon-deep' sub='interactive' />
          <Swatch cls='bg-palm' label='palm' sub='kicker green' />
          <Swatch cls='bg-sand' label='sand' sub='soft surface' />
          <Swatch cls='bg-foam' label='foam' sub='lightest surface' />
        </div>
      </section>

      <footer className='mt-12 border-t border-border pt-4'>
        <p className='text-muted-foreground text-xs'>
          Prototype for wayfinder #57 — preset b1uGsTYZ6 applied 2026-09-12.
          Throwaway: this route never ships.
        </p>
      </footer>
    </div>
  );
}

function Swatch({ cls, label, sub }: { cls: string; label: string; sub: string }) {
  return (
    <figure>
      <div className={`h-16 rounded-lg border border-border ${cls}`} />
      <figcaption className='mt-1 text-xs'>
        <span className='text-foreground font-medium'>{label}</span>{' '}
        <span className='text-muted-foreground'>({sub})</span>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 2: Typecheck + build**

```bash
pnpm --filter @sevendays/landing build
```

Expected: success (routeTree regenerates including `/prototype-tokens`). If Biome formatting is enforced by the build and fails, run `pnpm --filter @sevendays/landing fix` and rebuild.

- [ ] **Step 3: Render smoke test**

```bash
pnpm --filter @sevendays/landing dev &
sleep 8
curl -s http://localhost:3000/prototype-tokens | grep -o 'data-prototype-tokens' | head -1
curl -s http://localhost:3000/prototype-tokens | grep -o 'Sevendays Admin' | head -1
kill %1
```

Note the port the dev server prints if not 3000 (vite default is 5173 for this setup — check the startup output and adjust the URLs). Expected: both greps print a match — SSR rendered the route. The rendered HTML carries class names, not computed colors; the built-CSS grep in Task 2 Step 5 is the proof the tokens generate. Color judgment happens in the owner's browser.

- [ ] **Step 4: Commit**

```bash
git add apps/landing/src/routes/prototype-tokens.tsx apps/landing/src/routeTree.gen.ts
git commit -m "prototype(#57): /prototype-tokens showcase route (throwaway)"
```

---

### Task 4: Full check, push, and ticket handover

**Files:**
- No new source files. Possibly formatting fixups across touched files.

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: pushed branch `prototype/57-brand-token-unification` on origin + a handover comment on issue #57. The ticket is **not** closed — it's HITL; it resolves when the owner reacts.

- [ ] **Step 1: Repo-wide check**

```bash
pnpm check
```

Expected: lint, format, typecheck, test all green (`@sevendays/admin` test is a documented no-op — that's expected, not a failure). If formatting fails: `pnpm fix`, re-run `pnpm check`, commit fixups as `chore(#57): prototype check fixups`.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin prototype/57-brand-token-unification
```

- [ ] **Step 3: Post the handover comment on #57**

Stage the body as a temp file and verify the write (per wayfinder lessons):

```bash
cat > /tmp/57-handover.md <<'EOF'
## Prototype ready for reaction

Branch: `prototype/57-brand-token-unification` (throwaway — nothing merges until the mapping is validated)

**Run it:**
```bash
git worktree add .worktrees/57-brand-tokens prototype/57-brand-token-unification 2>/dev/null || git -C .worktrees/57-brand-tokens pull
cd .worktrees/57-brand-tokens && pnpm install && pnpm --filter @sevendays/landing dev
```
Then open `/prototype-tokens` on the printed port.

**What it is:** your preset `b1uGsTYZ6` applied via `shadcn apply`, lifted into a shared `packages/ui/src/tokens.css` that both apps import (#56 recommendation, concretely tested), plus a throwaway showcase route rendering semantic-token-only components: buttons, package card, form states, badges, chart palette, admin sidebar mock, brand swatches.

**React to:** primary/accent/ring mapping, muted-foreground text color, radius, chart ramp (brand-tonal fallback unless the preset set one), sidebar mapping, Fraunces/Manrope as `--font-serif`/`--font-sans`.

**Iterate:** adjust the preset in the shadcn editor, then re-run `pnpm dlx shadcn@latest apply --preset <id> -y -c apps/landing` and re-do the lift (or ask the agent session to).

**Recorded findings from the apply:** <paste Task 1 Step 2 record — preset primary/accent/ring/radius values, font mechanism, chart/sidebar/dark coverage, any conflicts>

Ticket stays open until the owner reacts (HITL).
EOF
gh issue comment 57 --body-file /tmp/57-handover.md
gh issue view 57 --json comments --jq '.comments[-1].body' | head -5
```

Expected: the read-back shows the comment body. Do **not** close the ticket and do **not** edit the map's Decisions-so-far — the resolution comment and map pointer happen after the owner reacts.

---

## Self-Review

- **Spec coverage:** preset apply (Task 1) ✓; oklch semantic re-expression (preset carries it; fallback table in constraints) ✓; Fraunces/Manrope as `--font-*` (Task 2 Step 1 fallbacks + `@theme`) ✓; radius/chart/sidebar included (preset + explicit fallbacks) ✓; landing first, mirrored into admin (Task 2 wires both, builds both) ✓; react on real components (Task 3 showcase + real `SiteHeader`) ✓; shared-definition question demonstrated (Task 2) ✓; dark parked (constraint + unchanged carry-over) ✓.
- **Placeholder scan:** the two `<paste …>` directives in Task 2 Step 1 are cut-and-paste operations on blocks that only exist after Task 1 runs (the preset's literal values are unknowable pre-apply) — each names its source block and destination exactly. No other placeholders.
- **Type consistency:** showcase uses only utilities guaranteed by Task 2's `@theme inline` (`font-serif`, `bg-chart-1..5`, `bg-sidebar*`, brand `bg-*`); `SiteHeader` import path and `createFileRoute` signature match `apps/landing/src/routes/about.tsx` on this branch.
