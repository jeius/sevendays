# packages/ui Becomes the Shared Primitive Library (M3 ticket #95) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Make `packages/ui` the shared shadcn/Base-UI primitive library per ADR-0017: one `components.json` per workspace (landing, admin, `packages/ui`) with identical `style`/`iconLibrary`/`baseColor`, `shadcn add` from either app routing primitives into `packages/ui`, `cn` consolidated on the `cn` npm package (both apps' hand-rolled helpers deleted), `packages/ui` joining the check pipeline over its TypeScript source, and the `button` primitive generated on the Base UI base and rendered for real in both apps through the shared import.

**Architecture:** The official shadcn monorepo pattern (docs: <https://ui.shadcn.com/docs/monorepo>, verified live 2026-09-14): the routing switch is the **app-side `components.json` aliases** — `"ui": "@sevendays/ui/components"` and `"utils": "@sevendays/ui/lib/utils"` — so the CLI writes primitives into `packages/ui` while app-composed blocks stay in the requesting app. `packages/ui` ships **source** (exports point at `src/*.tsx`/`src/*.ts`, the `api-client` precedent; ADR-0017: primitives ship as source, no build-publishing dance) and gains the house check pipeline (tsc typecheck + a compile-gate build, Biome lint/format — mirroring `packages/types`' script set). The tracer: `shadcn@4.21.0 add button` run from landing lands `packages/ui/src/components/button.tsx`, imported and rendered in landing's `/prototype-tokens` gallery (the milestone's living gallery, sanctioned to live until close-out #101) and on admin's probe index page (replaced by the shell in #100).

**Tech Stack:** shadcn CLI pinned `4.21.0`, Base UI (`@base-ui/react`), `cn` npm package (`^0.3.0`, shadcn-ui org), Tailwind v4 CSS-first, TanStack Start on Vite, pnpm workspaces + Turborepo, Biome, TypeScript via `@sevendays/config`.

**Spec:** This plan implements ticket [#95 "M3 ticket 01 — packages/ui becomes the shared primitive library (ADR-0017 infra)"](https://github.com/jeius/sevendays/issues/95) under spec [#94 (Milestone 3 — UI/UX Design System)](https://github.com/jeius/sevendays/issues/94); ruling record ADR-0017; distribution research on branch `research/shadcn-distribution-56` (`docs/research/2026-09-09-shadcn-distribution.md`). Key spec facts and recon findings:

- **Sibling fences (shared roadmap — do not cross):** #96 (token swap) owns every token **value** in `packages/ui/src/tokens.css` and both apps' stylesheets — this ticket must not change token values or typography; #97/#98 own product-surface restyling; #100 owns generating the remaining 18 pull-list primitives and the admin shell — **only `button` generates here**; #101 owns gallery deletion and close-out. Sibling checkboxes stay unticked until their tickets land.
- **The style ruling (agent decision, owner-overridable — see Global Constraints):** shadcn CLI 4.21's registry encodes the headless base **in the `style` value** (`base-*` → Base UI, `radix-*` and legacy `new-york` → Radix — verified against the live registry and `https://ui.shadcn.com/schema.json` on 2026-09-14). There is no "new-york look on Base UI" style, so the ticket's "pinned to the apps' current new-york posture" and "Base UI base, no `@radix-ui` deps" criteria cannot both hold literally. The plan pins **`base-rhea`** — Base UI with the rhea look, the family landing's `components.json` already records (as `radix-rhea`, written by the #57 preset apply). This honors both criteria as closely as the registry allows and avoids the spec's explicitly-named base-nova churn.
- **Verified recon facts** (2026-09-14, this checkout): both apps' `src/lib/utils.ts` hand-roll `cn` and are **imported by nothing** (`grep -rn "lib/utils" apps` → zero hits), so the cn migration is a pure delete + dependency swap; `clsx` + `tailwind-merge` are dependencies of both apps with no other consumers; landing already carries CLI-era deps from the #57 apply (`shadcn@^4.21.0`, `cn@^0.2.6` unused, `class-variance-authority`, `radix-ui@^1.6.7` — the last imported by nothing, pre-existing, fenced out below); `packages/ui` today exports only `./globals.css` (a dead Tailwind v3-era file, zero references) + `./tokens.css`, and has lint/format scripts only; `packages/api-client` is the house precedent for a source-exporting package (no `build`), `packages/types` for the tsc `tsconfig.build.json` pattern; both apps' tsconfig map `#/*` → `./src/*` and extend `@sevendays/config/ts/vite` (`moduleResolution: Bundler`, so subpath exports resolve); `/prototype-tokens` exists on main with a hand-rolled Buttons section at lines ~31–72.
- **Parked / out of scope:** dark mode, chart tokens, Storybook/visual-regression tooling (spec quality-bar rulings); the Tier-2 composed tier (nothing composes here — only the Tier-1 tracer renders); the `/prototype-tokens` gallery's content beyond the tracer section (#96 renders the new layer there); `AGENTS.md`'s milestone/status docs beyond the one pinned bullet edit in Task 6.

## Global Constraints

- **Branch:** `feat/95-ui-shared-library` off `main`, in the main checkout (`/home/jeius/Projects/sevendays`). This is main-landing work (not a throwaway worktree branch). Expected starting state: `git status` clean apart from the known untracked `graphify-out/cache/` file. The plan file itself is the branch's first commit.
- **Every `shadcn` invocation pins the version**: `pnpm dlx shadcn@4.21.0 …` — one CLI version across workspaces (ADR-0017 consequence). Never `shadcn@latest`. The CLI version that ran the #57 apply; `apps/landing` also carries it as a dependency (`shadcn@^4.21.0`), unused by this plan.
- **The style trio is `base-rhea` / `lucide` / `zinc`** in all three `components.json` files. Rationale (recorded here and surfaced in the PR body for owner review): `base-*` is the only family that generates on Base UI (the ticket's hard AC); within it, rhea is the look landing's file already records via `radix-rhea`; `zinc` is the apps' actual on-disk `baseColor` (the spec's "neutral" prose described the docs template, not the apps — the AC's "apps' current posture" governs). **Override path:** if the owner rules a different `base-*` style before execution, change the literal in the three Task-2 files and proceed — nothing else in the plan depends on the specific look. Do not proceed with any non-`base-*` style; it breaks the Base-UI AC.
- **No Radix anywhere this ticket introduces:** after generation, `packages/ui` must depend on `@base-ui/react` (exact spelling — hyphenated, as the generated imports show), never `@radix-ui/*` or `radix-ui`. The pre-existing, unused `radix-ui@^1.6.7` dependency in `apps/landing/package.json` stays untouched (fenced out — #96/#101 cleanup, not infra).
- **Tier-1 primitives are registry-verbatim:** no hand edits to generated component source. The only permitted transformation is `pnpm --filter @sevendays/ui fix` (Biome quote/format normalization — the repo's standing format gate), which must not be skipped or the repo check fails.
- **Token ground is frozen:** no value changes in `packages/ui/src/tokens.css`, `apps/*/src/styles.css`, or any `--*` token. If any `shadcn` command writes or appends to a CSS file (it should not — both stylesheets carry the full v4 token set from the #57 apply), record it in the commit message and `git checkout -- <file>` to revert, then re-verify the render steps; token content is #96's.
- **`packages/ui` ships source:** its `exports` point into `src/`; the `build` script (tsc → `dist/`, gitignored) is a compile gate only — nothing consumes `dist`. No component unit tests ship for Tier-1 generated source (spec testing decision 3), so the package gets **no `test` script** — Turbo skips it naturally.
- **Gates (from repo AGENTS.md):** `pnpm install` after every manifest change; on fresh clones `pnpm build:packages` before `pnpm check`; `pnpm check` (lint + format + typecheck + test) must be green for every touched workspace before the PR; `graphify update .` after code changes; tick checkboxes with `- [✅]`; update `docs/progress.md` (Task 6 pins the entry).
- pnpm-only; `async`/`await` style; Biome-enforced single quotes and house formatting (run the package's `fix` script rather than hand-formatting).

---

### Task 1: packages/ui becomes a real workspace package with a check pipeline

**Files:**
- Rewrite: `packages/ui/package.json` (exports, scripts, dependencies)
- Rewrite: `packages/ui/biome.json` (react tier, drop the globals.css override)
- Create: `packages/ui/tsconfig.json`, `packages/ui/tsconfig.build.json`
- Create: `packages/ui/src/lib/utils.ts`
- Delete: `packages/ui/src/globals.css` (dead Tailwind v3-era file, zero references)

**Interfaces:**
- Consumes: `@sevendays/config/ts/react` (base `moduleResolution: Bundler` + `jsx: react-jsx`), `@sevendays/config/biome/{base,vite}`, npm `cn@^0.3.0`, `class-variance-authority@^0.7.1` (the deps generated primitives import; `@base-ui/react` arrives via the CLI in Task 3).
- Produces: package `@sevendays/ui` with exports `./tokens.css` (unchanged), `./components/*` → `./src/components/*.tsx`, `./lib/*` → `./src/lib/*.ts`, `./hooks/*` → `./src/hooks/*.ts` (dirs may not exist yet — glob exports are inert until they do); scripts `build`/`typecheck`/`lint`/`format`/`fix`/`fix:unsafe` so Tasks 3–6 and `pnpm check`/`pnpm build:packages` cover the package.

**Not here:** no `components.json` yet (Task 2), no primitives (Task 3), no token changes (#96), no app changes (Tasks 4–5).

- [ ] **Step 1: Prove `globals.css` is dead, then delete it**

```bash
grep -rn "globals.css" apps packages --include='*.ts' --include='*.tsx' --include='*.css' --include='*.json' --include='*.html' | grep -v node_modules | grep -v "tokens.css"
```

Expected: exactly two hits, both owned by this task — (1) `packages/ui/package.json`'s own `"./globals.css"` export line (Step 2 removes it) and (2) `packages/ui/biome.json`'s lint override `"includes": ["src/globals.css"]` (Step 4's rewrite removes it — a lint-config reference, not a consumer; ruling recorded during execution 2026-09-14). Any OTHER hit (a real import/consumer in app or package code): STOP and report — do not delete. Then:

```bash
git rm packages/ui/src/globals.css
```

- [ ] **Step 2: Rewrite `packages/ui/package.json`**

Replace the whole file with exactly:

```json
{
  "name": "@sevendays/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tokens.css": "./src/tokens.css",
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./hooks/*": "./src/hooks/*.ts"
  },
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "lint": "biome lint",
    "format": "biome format",
    "fix": "biome check --fix .",
    "fix:unsafe": "biome check --fix --unsafe .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "cn": "^0.3.0"
  },
  "peerDependencies": {
    "react": "^19.2.0"
  },
  "devDependencies": {
    "@sevendays/config": "workspace:*",
    "@types/react": "^19.2.0",
    "react": "^19.2.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^6.0.3"
  }
}
```

Notes: the `./globals.css` export is gone with its file; `tailwindcss` devDep is retained (present today; #96's token work may want it); `react` is both peer (consumers provide it — both apps run `react@^19.2.0`) and devDep (the package's own typecheck compiles TSX); `typescript` matches sibling packages (`^6.0.3`, as in `packages/types`).

- [ ] **Step 3: Create the tsconfigs**

`packages/ui/tsconfig.json`:

```json
{
  "extends": "@sevendays/config/ts/react",
  "include": ["src"],
  "exclude": ["node_modules", "dist", ".turbo", "coverage"]
}
```

`packages/ui/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "noEmit": false,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

(`packages/types`' build pattern; the emitted `dist/` is a compile gate — nothing imports it.)

- [ ] **Step 4: Rewrite `packages/ui/biome.json`**

Replace the whole file with exactly (react tier instead of node — the package gains TSX; the globals.css at-rule override dies with the file):

```json
{
  "root": false,
  "extends": ["@sevendays/config/biome/base", "@sevendays/config/biome/vite"]
}
```

- [ ] **Step 5: Create `packages/ui/src/lib/utils.ts`**

Exactly:

```ts
// The components.json `utils` alias target for every workspace (docs monorepo
// pattern) — a re-export, not a copy: the implementation is the `cn` package.
export { cn } from 'cn';
```

- [ ] **Step 6: Install and run the package pipeline**

```bash
pnpm install
pnpm --filter @sevendays/ui lint && pnpm --filter @sevendays/ui format && pnpm --filter @sevendays/ui typecheck && pnpm --filter @sevendays/ui build
```

Expected: all green over the one-file TS source; `packages/ui/dist/` appears (gitignored). If `typecheck` fails resolving `cn`, check `node_modules/cn` exists after install and that its package exports TypeScript types — record what's missing and report rather than working around.

- [ ] **Step 7: Commit**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "build(ui): packages/ui joins the check pipeline as a source-shipping workspace package (#95)

- exports: tokens.css (unchanged) + ./components/*, ./lib/*, ./hooks/* globs into src/
- scripts: tsc build gate + typecheck; biome lint/format (types' pattern)
- dead v3-era src/globals.css + its export deleted (zero references, grep-proven)
- cn + class-variance-authority deps, react peer; tsconfig on @sevendays/config/ts/react"
```

---

### Task 2: The components.json trio — base-rhea/lucide/zinc, aliases routed

**Files:**
- Create: `packages/ui/components.json`
- Rewrite: `apps/landing/components.json` (style `radix-rhea` → `base-rhea`; aliases rewired; CLI-written extras kept)
- Rewrite: `apps/admin/components.json` (style `new-york` → `base-rhea`; aliases rewired)

**Interfaces:**
- Consumes: the exports added in Task 1 (`@sevendays/ui/components/*`, `/lib/*` must be resolvable alias targets).
- Produces: the routing switch the CLI reads — with `ui`/`utils` pointing into the shared package, `shadcn add <primitive>` from either app writes `packages/ui/src/components/<primitive>.tsx`; with `components`/`lib`/`hooks` staying `#/…`, composed blocks land app-local. This satisfies AC 1 (identical `style`/`iconLibrary`/`baseColor`, current posture) and sets up AC 2.

**Not here:** no generation (Task 3), no app code changes (Tasks 4–5). The `tailwind.css` field change below is a pointer change only — no CSS file content changes (#96's ground).

- [ ] **Step 1: Create `packages/ui/components.json`**

Exactly:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-rhea",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/tokens.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@sevendays/ui/components",
    "utils": "@sevendays/ui/lib/utils",
    "ui": "@sevendays/ui/components",
    "lib": "@sevendays/ui/lib",
    "hooks": "@sevendays/ui/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Rewrite `apps/admin/components.json`**

Exactly:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-rhea",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/tokens.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "#/components",
    "utils": "@sevendays/ui/lib/utils",
    "ui": "@sevendays/ui/components",
    "lib": "#/lib",
    "hooks": "#/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 3: Rewrite `apps/landing/components.json`**

Exactly (same trio values as admin; the extra `rtl`/`menuColor`/`menuAccent`/`registries` keys are the CLI's own from the #57 apply — kept verbatim to avoid config churn):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-rhea",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/tokens.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "#/components",
    "utils": "@sevendays/ui/lib/utils",
    "ui": "@sevendays/ui/components",
    "lib": "#/lib",
    "hooks": "#/hooks"
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

Design notes, so the executor isn't tempted to "fix" them: `tailwind.css` points at the shared package's stylesheet (docs pattern — the CLI's token detection/writes, if any, target the shared layer, never an app-local file); `rsc: false` (TanStack Start, not React Server Components); both apps' tsconfig already map `#/*` → `./src/*`, so the app-local aliases resolve unchanged.

- [ ] **Step 4: Sanity-check the trio and commit**

```bash
grep -h '"style"\|"baseColor"\|"iconLibrary"' apps/landing/components.json apps/admin/components.json packages/ui/components.json
```

Expected: three identical pairs — `"style": "base-rhea"`, `"baseColor": "zinc"`, `"iconLibrary": "lucide"`.

```bash
git add apps/landing/components.json apps/admin/components.json packages/ui/components.json
git commit -m "build(ui): components.json trio — base-rhea/lucide/zinc, aliases route primitives to @sevendays/ui (#95)

Agent ruling recorded in the plan + PR: CLI 4.21 encodes the headless base in
style (base-* = Base UI, radix-*/new-york = Radix); base-rhea keeps landing's
rhea look (its file said radix-rhea from the #57 apply) on the mandated Base UI
base. baseColor zinc = the apps' on-disk posture (spec's 'neutral' was docs-template prose)."
```

---

### Task 3: Generate the `button` tracer into packages/ui (Base UI base)

**Files:**
- Created by the CLI (not by hand): `packages/ui/src/components/button.tsx`
- Modified by the CLI: `packages/ui/package.json` (primitive deps — expected `@base-ui/react`), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: the Task-2 routing (run from the landing workspace so its `components.json` drives the CLI).
- Produces: `@sevendays/ui/components/button` — the import Tasks 4–5 render; the proof for AC 2 (`shadcn add` routes into `packages/ui`), AC 5 (button generated, both apps render it), AC 6 (Base UI base, no `@radix-ui`, registry-verbatim name).

**Not here:** the other 18 pull-list primitives — #100 generates them through this same path; generating any of them now crosses the sibling fence. No hand edits to the generated file (Biome `fix` only).

- [ ] **Step 1: Generate from the landing workspace**

```bash
pnpm dlx shadcn@4.21.0 add button -y -c apps/landing
```

Expected: output naming the file written to the shared package path. If the CLI errors resolving the `-c` path, the fallback form is `cd apps/landing && pnpm dlx shadcn@4.21.0 add button -y` (then return to the repo root — the rest of the plan assumes root).

- [ ] **Step 2: Inspect and record what the CLI did**

```bash
git status --short
cat packages/ui/src/components/button.tsx
git diff packages/ui/package.json
```

Record in the commit message (these facts gate the next steps):
1. The generated file's import lines — expect `@base-ui/react/button` (Base UI; the registry item's literal import), `cn`, `class-variance-authority`, React types.
2. What `packages/ui/package.json` gained — expected `@base-ui/react`; the CLI installs the primitive's dependencies into the package it writes to.
3. Whether ANY file under `apps/` changed — expected: none (routing proof; a `button.tsx` under `apps/landing/src/components/` means the aliases were not picked up — STOP and re-check Task 2).
4. Whether any CSS file changed — expected: none. If the CLI appended tokens anywhere, revert per Global Constraints (`git checkout -- <file>`) and record it.

- [ ] **Step 3: Assert the Base-UI/no-Radix invariant**

```bash
grep -in "radix" packages/ui/src/components/button.tsx packages/ui/package.json || echo "NO RADIX — OK"
grep -n "@base-ui/react" packages/ui/src/components/button.tsx packages/ui/package.json
```

Expected: "NO RADIX — OK" from the first command; the second shows the hyphenated `@base-ui/react` in both the import and the manifest. Any radix hit: STOP and report — do not hand-patch generated code.

- [ ] **Step 4: House-format, then run the package pipeline over the generated TSX**

```bash
pnpm --filter @sevendays/ui fix
pnpm --filter @sevendays/ui lint && pnpm --filter @sevendays/ui format && pnpm --filter @sevendays/ui typecheck && pnpm --filter @sevendays/ui build
```

Expected: all green (the `fix` run normalizes the CLI's double quotes to the repo's Biome style — the only permitted transformation; `typecheck` proves the package compiles the TSX against its `ts/react` config; `build` emits it into the ignored `dist/`). If typecheck flags missing types for `@base-ui/react` or `cn`, confirm the versions installed in Step 2 ship `.d.ts` files (`ls node_modules/@base-ui/react/*.d.ts` from the workspace root's linked path) and report rather than adding shims.

- [ ] **Step 5: Prove the admin route reaches the shared package too (dry run)**

```bash
pnpm dlx shadcn@4.21.0 add button -y --dry-run -c apps/admin
```

Expected: the dry-run plans the same destination — `packages/ui/src/components/button.tsx` — with no writes under `apps/admin/` (satisfies the "from either app" half of AC 2 without a second generation or an overwrite prompt). Record the printed destination in the commit message.

- [ ] **Step 6: Commit**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): generate the button primitive into packages/ui via shadcn 4.21.0 — Base UI base (#95)

<paste the Step 2 inspection record: generated imports, package.json additions,
no-app-writes confirmation, any CSS revert; plus Step 5's dry-run destination>"
```

---

### Task 4: Render the tracer in both apps through the shared import

**Files:**
- Modify: `apps/landing/src/routes/prototype-tokens.tsx` (add a shared-primitives section)
- Modify: `apps/admin/src/routes/index.tsx` (render one Button on the probe page)

**Interfaces:**
- Consumes: `import { Button } from '@sevendays/ui/components/button'` — resolved through the Task-1 exports by both apps' bundler configs (`moduleResolution: Bundler` + Vite exports resolution; both apps already resolve `@sevendays/ui/tokens.css` through the same mechanism since #91).
- Produces: the end-to-end distribution proof (AC 5): CLI → package → app import → built + SSR-rendered output. The landing section lives in the milestone's living gallery (deleted at #101 close-out); the admin button rides the probe page (replaced by #100's shell). Neither is a product-surface restyle — #97/#98 own those.

**Not here:** no restyling of any existing surface, no swap of hand-rolled buttons for the shared one anywhere else, no booking-flow components (#99).

- [ ] **Step 1: Add the shared-primitives section to the landing gallery**

In `apps/landing/src/routes/prototype-tokens.tsx`, add the import after the existing `SiteHeader` import (line 6):

```tsx
import { Button } from '@sevendays/ui/components/button';
```

Then insert a new section directly **before** the `<section className='mt-10 grid gap-6 md:grid-cols-2'>` line (the "Package card" section — a unique anchor in this file):

```tsx
      <section className='mt-10' data-tier1-tracer>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Shared primitives (<code>@sevendays/ui</code>)
        </h2>
        <p className='text-muted-foreground mt-1 text-sm'>
          Tier-1 tracer (M3 #95): the registry <code>button</code>, generated into packages/ui and
          imported through the shared package — the distribution-path proof, not a restyle.
        </p>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <Button>Tier-1 default</Button>
          <Button variant='outline'>Tier-1 outline</Button>
        </div>
      </section>
```

If the app's typecheck rejects `variant='outline'` (the variant union is whatever the registry generated in Task 3), drop that line — the tracer needs at least the default variant rendered; record the union's actual names in the commit message.

- [ ] **Step 2: Render one Button on the admin probe page**

In `apps/admin/src/routes/index.tsx`, add the import after the existing `branchQueries` import:

```tsx
import { Button } from '@sevendays/ui/components/button';
```

Then, immediately after the closing `</ul>` of the branches list and before the closing `</div>` of the page wrapper, add:

```tsx
      {/* M3 #95 tracer — proves the shared-primitive distribution path; replaced by the shell (#100). */}
      <div className='mt-6'>
        <Button variant='outline'>Tier-1 tracer</Button>
      </div>
```

(Same variant rule as Step 1: drop `variant='outline'` if the generated union lacks it.)

- [ ] **Step 3: Build both apps and prove the utilities landed in the built CSS**

```bash
pnpm --filter @sevendays/landing build && pnpm --filter @sevendays/admin build
```

Expected: both succeed (TanStack Start emits `dist/`, not `.output/`). Then check Tailwind actually generated the button's utilities — its v4 automatic source detection must have scanned `packages/ui/src` (both apps' Vite pipelines compile the workspace source; whether the CSS scan followed is what this proves):

```bash
find apps/landing/dist -name '*.css' | head -3
find apps/admin/dist -name '*.css' | head -3
# for each CSS file found:
grep -c "translate-y-px" <file>
```

`translate-y-px` comes from the generated button's `active:…:translate-y-px` class — if Tailwind scanned the package, the count is ≥ 1 in each app's CSS. **Fallback if the count is 0:** add `@source "../../../packages/ui/src";` on its own line directly after the `@import "@sevendays/ui/tokens.css";` line in that app's `src/styles.css`, rebuild that app, re-grep. Record which apps needed the fallback (it is a legitimate outcome, not an error — but the fallback line itself is the only permitted styles.css change; #96's freeze covers values, and this line adds none).

- [ ] **Step 4: SSR render smoke on both apps**

```bash
pnpm --filter @sevendays/landing dev &
sleep 8
curl -s http://localhost:5173/prototype-tokens | grep -o 'data-tier1-tracer' | head -1
curl -s http://localhost:5173/prototype-tokens | grep -o 'group/button' | head -1
kill %1
pnpm --filter @sevendays/admin dev &
sleep 8
curl -s http://localhost:5173/ | grep -o 'Tier-1 tracer' | head -1
curl -s http://localhost:5173/ | grep -o 'group/button' | head -1
kill %1
```

Notes: check each dev server's startup output for its actual port (Vite defaults to 5173; if landing holds it, admin prints the next one — adjust the second pair of curls). Expected: every grep prints a match — `data-tier1-tracer` proves the section rendered, `group/button` (the base-rhea button's own class string, present verbatim in SSR HTML) and the admin label prove the **shared component** rendered through each app's pipeline, not just static markup. If SSR HTML lacks `group/button` while the build succeeded, report — do not swap in a hand-rolled button.

- [ ] **Step 5: Commit**

```bash
git add apps/landing/src/routes/prototype-tokens.tsx apps/admin/src/routes/index.tsx apps/landing/src/styles.css apps/admin/src/styles.css
git commit -m "feat(ui): button tracer rendered through @sevendays/ui in both apps (#95)

Landing: /prototype-tokens gallery section (data-tier1-tracer). Admin: probe
index page. <record: variant union names; which apps needed the @source
fallback; the curl grep results>"
```

(The `styles.css` paths in `git add` are harmless no-ops for untouched files; if the fallback fired, they carry the `@source` line.)

---

### Task 5: cn migration — the `cn` package replaces the hand-rolled helpers

**Files:**
- Delete: `apps/landing/src/lib/utils.ts`, `apps/admin/src/lib/utils.ts`
- Modify: `apps/landing/package.json`, `apps/admin/package.json` (drop `clsx` + `tailwind-merge`; landing's `cn` `^0.2.6` → `^0.3.0`; admin gains `cn` `^0.3.0`)
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: nothing — recon proved both helpers are imported by zero files (re-asserted in Step 1), so this is a pure delete + dependency swap with no import rewrites.
- Produces: AC 3 — the hand-rolled helpers are gone and the `cn` package (`^0.3.0`) is both apps' declared class-merge dependency; the actual `import { cn } from 'cn'` call sites arrive with the milestone's composed components (#97+), which now have nothing local to accidentally import.

**Not here:** landing's unused `radix-ui@^1.6.7` dependency stays (pre-existing from #91, fenced in Global Constraints); no `lib/utils.ts` re-export shims in the apps — the canonical utils alias target is `@sevendays/ui/lib/utils` (Task 1).

- [ ] **Step 1: Re-assert zero usage, then delete the helpers**

```bash
grep -rn "lib/utils" apps --include='*.ts' --include='*.tsx'
```

Expected: no output (recon-verified 2026-09-14; Tasks 1–4 added no such imports). Any hit: that file's import must become `import { cn } from 'cn';` (the package) — rewrite it, note it in the commit. Then:

```bash
git rm apps/landing/src/lib/utils.ts apps/admin/src/lib/utils.ts
```

- [ ] **Step 2: Swap the dependencies in both apps' package.json**

In `apps/landing/package.json` `dependencies`: delete the `"clsx": "^2.1.1"` and `"tailwind-merge": "^3.6.0"` lines; change `"cn": "^0.2.6"` to `"cn": "^0.3.0"` (keep keys alphabetized as the file has them).

In `apps/admin/package.json` `dependencies`: delete the `"clsx": "^2.1.1"` and `"tailwind-merge": "^3.6.0"` lines; add `"cn": "^0.3.0"` in alphabetical position (after `"class-variance-authority"`).

Then:

```bash
pnpm install
```

Expected: lockfile updated, no resolution errors; `pnpm why clsx` and `pnpm why tailwind-merge` at the root report no remaining dependents among the workspaces this ticket touches (transitive dependents elsewhere in the tree are out of scope — record, don't chase).

- [ ] **Step 3: Verify both apps still typecheck and build**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/landing build && pnpm --filter @sevendays/admin build
```

Expected: all green (pure deletion — nothing referenced the removed files or deps).

- [ ] **Step 4: Commit**

```bash
git add apps/landing apps/admin pnpm-lock.yaml
git commit -m "refactor(ui): both apps on the cn package — hand-rolled helpers + clsx/tailwind-merge deleted (#95)

<record: the Step 1 grep result, any import rewrites, pnpm why findings>"
```

---

### Task 6: Docs, gates, PR, handover

**Files:**
- Modify: `AGENTS.md` (the `packages/ui` directory bullet), `docs/progress.md` (What Exists entry), this plan file (✅ ticks)
- Refresh: `graphify-out/`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: pushed branch `feat/95-ui-shared-library` + an open PR to `main` closing #95; the owner merges it and ticks #95's boxes (house pattern — the AC evidence pack rides the PR body and the completion report).

**Not here:** #96+#100+#101 stay untouched in every doc; the v1-picks ledger gets this PR's row at merge time by the standing discipline (paths here are `packages/ui` + shared-infra — main-only; expected verdict skip, but that call belongs to the triager, not this plan).

- [ ] **Step 1: Update the AGENTS.md `packages/ui` bullet**

Replace:

```markdown
- `packages/ui` — the shared design system (ADR-0017): semantic token layer (`@sevendays/ui/tokens.css`, imported by both apps) live today; the shared shadcn/Base-UI primitive library lands with M3. Apps are Tailwind v4 and own their `@theme` styles
```

with:

```markdown
- `packages/ui` — the shared design system (ADR-0017): semantic token layer (`@sevendays/ui/tokens.css`, imported by both apps) plus the shared shadcn/Base-UI primitive library — M3 #95 wired `shadcn add` from either app to route primitives here (`components.json` trio pinned `base-rhea`/lucide/zinc; `button` live; `cn` comes from the `cn` package). Apps are Tailwind v4 and own their `@theme` styles
```

- [ ] **Step 2: Add the progress.md entry**

In `docs/progress.md`, at the end of the `## What Exists` section's list (immediately before the `## Known Gaps / Not Yet Done` heading), add:

```markdown
- **M3 ticket 01 — packages/ui shared primitive library (#95):** the shadcn monorepo pattern (ADR-0017) is live end to end: one `components.json` per workspace (landing, admin, `packages/ui`) all pinning `base-rhea`/lucide/zinc — an agent ruling (CLI 4.21 encodes the headless base in the `style` value; base-rhea keeps landing's rhea look on the mandated Base UI base; owner-overridable, recorded in the PR), app aliases `ui`/`utils` routing `shadcn@4.21.0 add` output into `packages/ui`, the `button` tracer generated on Base UI and rendered in both apps through `@sevendays/ui/components/button` (landing `/prototype-tokens` gallery + admin probe index), `cn@0.3.0` replacing both apps' deleted hand-rolled `lib/utils` helpers (clsx/tailwind-merge dropped), and `packages/ui` in the check pipeline (tsc build/typecheck + Biome over TSX source; source-shipping exports; no Tier-1 unit tests per spec). NOT landed: the remaining 18 pull-list primitives + admin shell (#100), the logo-palette token swap (#96), surface restyles (#97–#99).
```

- [ ] **Step 3: Tick this plan's boxes and format the docs**

Tick every completed step in this plan file with `- [✅]`. Then:

```bash
pnpm exec biome check --write AGENTS.md docs/progress.md docs/superpowers/plans/2026-09-14-95-ui-shared-primitive-library.md
```

- [ ] **Step 4: graphify + full check**

```bash
graphify update .
pnpm check
```

Expected: graph refresh touches `graphify-out/` only; `pnpm check` green across all workspaces (`@sevendays/admin`'s test remains a documented no-op — expected; `packages/ui` has no test script by design). Any failure: fix at the source and re-run — do not commit red.

- [ ] **Step 5: Commit, push, open the PR**

```bash
git add AGENTS.md docs/progress.md docs/superpowers/plans/2026-09-14-95-ui-shared-primitive-library.md graphify-out
git commit -m "docs: #95 close-out — AGENTS.md ui bullet, progress record, plan ticks, graph refresh"
git push -u origin feat/95-ui-shared-library
gh pr create --base main --head feat/95-ui-shared-library \
  --title "feat(ui): #95 packages/ui shared primitive library — shadcn monorepo pattern (ADR-0017)" \
  --body "Implements #95 (M3 ticket 01). Closes #95.

## What landed
- **components.json trio** (landing, admin, packages/ui): identical style/iconLibrary/baseColor, app aliases route \`shadcn add\` primitives into \`packages/ui\` while composed blocks stay app-local.
- **\`button\` tracer** generated via \`shadcn@4.21.0\` on the **Base UI base** (\`@base-ui/react\`; zero radix deps introduced) and rendered in both apps through \`@sevendays/ui/components/button\` (landing gallery section \`data-tier1-tracer\` + admin probe page) — the CLI → package → app-import → check-pipeline path proven end to end, including built-CSS utility generation (with \`@source\` fallback where needed) and SSR smoke.
- **\`cn@0.3.0\`** replaces both apps' hand-rolled \`lib/utils\` helpers (deleted; \`clsx\` + \`tailwind-merge\` dropped; zero-import proven by grep).
- **\`packages/ui\` joins the check pipeline**: tsc build gate + typecheck + Biome over its TSX source; source-shipping exports (\`api-client\` precedent); no Tier-1 unit tests (spec testing decision); dead v3-era \`globals.css\` + export deleted.

## Owner review point — the style ruling
shadcn CLI 4.21 encodes the headless base in the \`style\` value (\`base-*\` → Base UI, \`radix-*\`/legacy \`new-york\` → Radix; verified against the live registry + schema). The ticket's \"current new-york posture\" and \"Base UI base\" criteria cannot both hold literally, so this PR pins **\`base-rhea\`** — Base UI with the rhea look landing's \`components.json\` already recorded (via \`radix-rhea\` from the #57 apply). Veto before merge if you'd rather have \`base-nova\` (the docs default look) — it's a three-file literal + regenerate.

## AC mapping
AC 1 trio identical/pinned → Task 2 · AC 2 routing both directions → Tasks 3.1 + 3.5 · AC 3 cn package + helpers deleted → Task 5 · AC 4 check pipeline, no Tier-1 tests → Tasks 1 + 6.4 · AC 5 button in both apps → Task 4 · AC 6 Base UI/no radix, registry-verbatim → Task 3.3 · AC 7 \`pnpm check\` green → Task 6.4.

Standing v1-picks discipline applies to this PR at merge (paths are main-only shared infra; expected skip — triager's call)."
```

- [ ] **Step 6: The completion report — then STOP**

One message to the owner, containing:

1. **The evidence pack** (verbatim from the working record): Task 3's inspection record (generated imports, package.json additions, no-app-writes, dry-run destination), Task 4's built-CSS grep counts per app and which needed the `@source` fallback, all four SSR curl greps, Task 5's grep + `pnpm why` findings, Task 6's `pnpm check` tail.
2. **The AC mapping** (as pinned in the PR body).
3. **State:** branch `feat/95-ui-shared-library` pushed, PR open with `Closes #95` — the owner merges and ticks #95's boxes; the merge gets the standing v1-picks triage.
4. **Flags:** (a) the style ruling and its override path (owner review point in the PR); (b) any deviation from plan-time expectations (variant-union name changes, CLI behavior differences from the recorded 4.21.0 probe, fallbacks that fired) — stated plainly with what was done; (c) confirmation that token values were untouched (#96's ground is intact).

Then STOP. The turn ends with the report; nothing in this ticket runs after it.

---

## Self-Review

- **Spec coverage:** AC 1 (trio, identical three fields, current posture) → Task 2 (full files pinned verbatim; posture ruling documented with override path). AC 2 (routing, both directions) → Task 3 Step 1 (real generation from landing) + Step 5 (admin dry-run — proves the admin side without a second write or an overwrite prompt). AC 3 (cn package, helpers deleted) → Task 5. AC 4 (check pipeline, no Tier-1 tests) → Task 1 (scripts + tsconfigs; no `test` script by design) + Task 6 Step 4. AC 5 (button, both apps, shared import) → Task 4 (pinned JSX, build + built-CSS + SSR proofs with the `@source` fallback). AC 6 (Base UI, no radix, registry-verbatim) → Task 3 Steps 2–4 (grep invariants; Biome `fix` as the only permitted transformation). AC 7 (`pnpm check` green) → Task 6 Step 4. ADR-0017 obligations: pinned CLI version (Global Constraints), source-shipping package (Task 1), AGENTS.md amendment rides the already-updated bullet (Task 6 Step 1's wording completes what #94's spec commit started).
- **Sibling fences:** #96 — token values frozen (Global Constraints; Task 3 Step 2's revert instruction; Task 4's `@source`-only CSS exception); #100 — only `button` generated (Task 3 Not-here); #97–#99 — no product surface touched (Task 4's tracer surfaces are the gallery and the probe page, both scheduled for later tickets' replacement); #101 — gallery untouched beyond one section. The docs bullets in Task 6 name what has NOT landed.
- **Placeholder scan:** the two `<record: …>` / `<paste …>` directives in commit-message steps name their source steps exactly (house pattern — inspection records only exist after the step runs). Every file the executor authors by hand (configs, tsconfigs, utils.ts, JSX, docs bullets, PR body) is pinned verbatim in fenced blocks. CLI-generated content is intentionally not pinned — it is registry output, gated by property assertions (imports, deps, destination), which is the ticket's own acceptance mechanism.
- **Type/signature consistency:** the import `@sevendays/ui/components/button` matches Task 1's exports glob (`./components/*` → `./src/components/*.tsx`) and Task 3's generated path; the `utils` alias target `@sevendays/ui/lib/utils` matches Task 1's `./lib/*` export and the Task 1 Step 5 file; `cn@^0.3.0` is consistent across Tasks 1/5 and matches the probed npm latest (0.3.0, 2026-09-14); react `^19.2.0` matches both apps' dependencies; the tsconfigs mirror `packages/types`' working pattern on the `ts/react` variant; `base-rhea`/`zinc`/`lucide` are byte-identical across the three Task-2 files and quoted identically everywhere downstream.
- **Claim strength vs. proof:** the routing mechanism and alias shape come from the live docs (fetched 2026-09-14, quoted in Architecture); style→base encoding from the live registry + schema; the one claim not provable without executing the real chain — Tailwind v4 source-scanning across the workspace boundary — is turned into an in-plan verification with a pinned fallback (Task 4 Step 3), and the SSR smoke (Step 4) closes the loop on the render itself.
