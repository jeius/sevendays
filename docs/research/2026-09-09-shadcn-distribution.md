# Research: shadcn distribution across two Tailwind v4 apps

- **Ticket:** [jeius/sevendays#56](https://github.com/jeius/sevendays/issues/56) (child of wayfinder map [#55](https://github.com/jeius/sevendays/issues/55))
- **Date:** 2026-09-09
- **Status:** Research complete — one recommendation, below. Gates the component-inventory ticket's shared-vs-per-app ruling and the design-system spec's ADR.
- **Branch:** `research/shadcn-distribution-56` (throwaway; findings summarized in the #56 resolution comment)

---

## TL;DR — Recommendation

Adopt the **official shadcn monorepo pattern**: turn `packages/ui` into a real shared component library (primitives + semantic tokens + utils), with one `components.json` per workspace, the shadcn CLI routing primitives into `packages/ui` and app-specific compositions into each app. Use **Base UI** as the primitive base for every newly generated component (shadcn's default since 2026-07-02; Radix remains supported but nothing here uses it yet). Rewrite `packages/ui`'s stale, unimported `globals.css` into the Tailwind v4 token file and have each app `@import` it so the semantic token layer is genuinely shared; **landing's brand custom properties and its nine bespoke components stay app-local**.

This amends AGENTS.md ("each app owns its UI, but shared tokens live in `packages/ui`" becomes "shared **primitives + semantic tokens** live in `packages/ui`; brand and page components stay in each app") and therefore earns an ADR with the spec.

---

## 1. Local repo state (verified 2026-09-09)

Facts checked directly in the working tree:

| Fact | Evidence |
|---|---|
| `packages/ui` exports only `globals.css` | `packages/ui/package.json` — `exports: { "./globals.css": "./src/globals.css" }` |
| `packages/ui/src/globals.css` is **stale and dead** | Still uses Tailwind v3 directives (`@tailwind base/components/utilities`), old HSL-format tokens, and only 6 variables (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--border`, `--radius`). `grep -rn '@sevendays/ui'` across both apps' `src/` **and** `package.json`s finds zero references — no app imports it or depends on the package. |
| Both apps duplicate the full token set locally | `apps/landing/src/styles.css` and `apps/admin/src/styles.css` each carry identical, current shadcn Tailwind v4 token blocks (full oklch zinc palette, `@custom-variant dark`, `tw-animate-css` import) **plus** landing's brand custom properties (`--sea-ink`, `--lagoon`, `--palm`, `--sand`, …). Two unintegrated token layers in the same `:root`. |
| Both apps have per-app `components.json` | `style: "new-york"`, `baseColor: "zinc"`, `tailwind.css: "src/styles.css"`, empty `tailwind.config`, `#/`-prefixed aliases, `iconLibrary: lucide`. Identical in both apps. |
| No shadcn primitives generated yet | No `components/ui/` directory in either app. Neither app has `@radix-ui/*` or `@base-ui/*` dependencies (checked both `package.json`s). |
| `apps/landing` is brand-heavy, app-local | 9 hand-built components in `apps/landing/src/components/` (`branch-card`, `cover-panel`, `package-card`, `service-card`, `site-header`, …) — bespoke brand components, none shadcn-generated. Plus custom CSS (`.nav-link`, `.rise-in`, keyframes) in `styles.css`. |
| `apps/admin` is greenfield | No `components/` directory at all; `src/` has routes/lib/integrations only. |
| Both apps hand-roll `cn` | `apps/landing/src/lib/utils.ts` and `apps/admin/src/lib/utils.ts` each contain the classic `twMerge(clsx(...))` helper; both depend on `clsx` + `tailwind-merge`. |
| Stack | Both apps: Tailwind v4.3, `@tailwindcss/vite`, TanStack Start on Cloudflare Workers, pnpm + Turborepo. |

**Implication:** the AGENTS.md rule "shared tokens live in `packages/ui`" is currently aspirational — the apps drifted to duplicated inline tokens and `packages/ui` rotted. Any pattern chosen here must first decide what `packages/ui` *is for*.

---

## 2. Stack facts verified from primary sources (with dates)

### 2.1 shadcn CLI monorepo support — landed 2024-12-20

Source: `apps/v4/content/docs/changelog/2024-12-monorepo.mdx` in `shadcn-ui/ui` (fetched raw via GitHub API, 2026-09-09); https://ui.shadcn.com/docs/monorepo (fetched 2026-09-09).

- Changelog, dated **2024-12-20**: "The CLI now understands the monorepo structure and will install the components, dependencies and registry dependencies to the correct paths and handle imports for you."
- Current docs prescribe a workspace layout where **`packages/ui` is a shared component library** (`src/components/`, `src/hooks/`, `src/lib/utils.ts`, `src/styles/globals.css`) and each workspace has its own `components.json` — "Every workspace must have a components.json file."
- The CLI splits by destination: `add button` installs the primitive into `packages/ui`; `add login-01` installs primitives into `packages/ui` and the composed block component into the app's `components/`. Apps import via `import { Button } from "@workspace/ui/components/button"`.
- Constraint: "Ensure you have the same `style`, `iconLibrary` and `baseColor` in both components.json files," and "the shared package must export any path referenced by another workspace."
- For Tailwind v4: "leave the tailwind config empty in the components.json file." The shared `globals.css` in `packages/ui` is the canonical stylesheet the app(s) point at.
- The template's current `style` value is **`base-nova`** (seen at lines 119/142 of `apps/v4/content/docs/(root)/monorepo.mdx`), replacing the `new-york` value our apps still carry.

### 2.2 Base UI is the default primitive layer — 2026-07-02; Radix NOT deprecated

Primary source: `apps/v4/content/docs/changelog/2026-07-base-ui-default.mdx` in `shadcn-ui/ui`, dated **2026-07-02** ("July 2026 - Base UI as the Default"). This confirms the ticket's suspicion and supersedes the stale `ui-styling` skill prose ("shadcn is built on Radix").

Timeline (all from that entry): shadcn/ui launched **January 2023** built on Radix. Base UI "tagged a beta" in **2025**; **December 2025** brought `npx shadcn create` with both libraries; **January 2026** brought full Base UI docs; **2026-07-02** made Base UI the default.

Key quotes:

- "Starting today, **Base UI is the default component library in shadcn/ui**." (2026-07-02)
- "Base UI is stable. It's at 1.6.0 with 6M+ weekly downloads." (shadcn's own claim; not independently checked against npm — see §5 Uncertainties)
- "**Radix is not being deprecated.** We still support it, and every update and new component will ship for both libraries (unless a component only exists in Base UI)."
- "**You do not need to migrate.** … If your app works, keep shipping."
- Opt out for scripted setups: `npx shadcn init -b radix`. Registry authors: "Ship a `registry:base` config if you want to pin a specific library."
- **Migration path for existing generated components** is an agent skill, not a codemod: `npx skills add shadcn/ui`, then e.g. "migrate accordion to base-ui". Rationale: "You own the code. You've added variants, changed classes, threaded new props. A codemod handles the components you never touched and breaks on the ones you did." It is progressive ("migrate one component and its usage at a time while your project stays green"), leaves a report per component in `.migration/`, and commits one commit per component. Mechanical renames get applied everywhere — "(`asChild` is now `render`)"; behavior changes get flagged, never silently patched.
- The registry now ships **three primitive bases**: `apps/v4/registry/bases/` contains `base`, `radix`, and `aria` (React Aria added July 2026 — `2026-07-react-aria.mdx`). So "shadcn" in 2026 is a component distribution system over a swappable headless base, not Radix-specific.
- Base UI itself (https://base-ui.com, fetched 2026-09-09): "Base UI is a library of unstyled UI components", MIT-licensed, package `@base_ui/react`, built by "the creators of Radix, Floating UI, and Material UI" under the MUI org, and — directly relevant to migration — "We intentionally kept our APIs close to Radix UI for an easier migration path."

**For this repo:** both apps have zero Radix and zero Base UI dependencies today, so there is nothing to migrate — new `shadcn init/add` defaults to Base UI automatically. The documented Radix→Base UI migration machinery matters only as future-proofing context.

### 2.3 Registry namespaces — `@scope/name`, decentralized

Source: `apps/v4/content/docs/registry/namespace.mdx` in `shadcn-ui/ui` (fetched raw, 2026-09-09); live page https://ui.shadcn.com/docs/registry timed out twice (see §5).

- "Registry namespaces are prefixed with `@` and provide a way to configure multiple resource sources" — e.g. `@shadcn/button`, `@v0/dashboard`, `@acme/auth-utils` from your company's private registry.
- Configured in `components.json` under `"registries": { "@acme-ui": "https://registry.acme.com/ui/{name}.json", … }`, with optional per-registry auth headers (`Authorization: Bearer ${INTERNAL_TOKEN}`).
- "We intentionally designed the namespace system to be decentralized" — an open source registry index exists, but any namespace is usable without central approval.
- Related 2026 changelog entries: GitHub-hosted registries (**2026-06**, `2026-06-github-registries.mdx`) and private GitHub registries (**2026-08**, `2026-08-private-github-registries.mdx`).

### 2.4 Tailwind v4 CSS-first `@theme` — tokens are ordinary CSS custom properties

Source: https://tailwindcss.com/docs/theme (Tailwind **v4.3** docs, fetched 2026-09-09); https://ui.shadcn.com/docs/tailwind-v4 (fetched 2026-09-09).

- "Theme variables are special CSS variables defined using the @theme directive that influence which utility classes exist in your project." Namespaced variables (`--color-*`, `--radius-*`, `--font-*`) each generate utilities **and** remain plain CSS variables.
- `@theme inline` matters for shadcn's exact pattern: when a theme variable references another variable (`--color-background: var(--background)`), plain `@theme` emits `var(--background)` where the variable was defined, which "might resolve to unexpected values because of how variables are resolved in CSS" — `inline` inlines the resolved reference into the utility. This is why shadcn's v4 stylesheet keeps raw values in `:root`/`.dark` and maps them under `@theme inline`.
- Presets are gone; sharing is now trivially CSS: "Since theme variables are defined in CSS, sharing them across projects is just a matter of throwing them into their own CSS file that you can import in each project." The docs explicitly note these can be published as npm packages and `@import`ed. **This is the official answer to what `packages/ui`'s tokens file should be.**
- shadcn's Tailwind v4 migration (https://ui.shadcn.com/docs/tailwind-v4): tokens moved to OKLCH, `:root`/`.dark` moved out of `@layer base`, `@theme inline` added, `tailwindcss-animate` → `tw-animate-css` (2025-03-19), `forwardRef` removed in favor of `React.ComponentProps` + `data-slot` attributes, and the migration is "non-breaking" for existing v3 apps. Our apps' styles.css already reflect this modern shape (oklch, `tw-animate-css`, `@custom-variant dark`) — only `packages/ui/src/globals.css` is left behind.

### 2.5 `cn` package — 2026-09-03 (this week)

Source: `apps/v4/content/docs/changelog/2026-09-cn.mdx` in `shadcn-ui/ui`, dated **2026-09-03**.

- "Every shadcn component now imports `cn` from the `cn` package" — a drop-in replacement for `twMerge(clsx(...))` (github.com/shadcn-ui/cn). "`npx shadcn init` installs `cn` and generates a one-line `lib/utils.ts`"; the `utils` registry item still exists and re-exports it.
- Directly relevant: our apps each carry a hand-rolled `cn` in `lib/utils.ts`; adopting the shared-package pattern is the natural moment to consolidate on the `cn` package instead of maintaining a third copy in `packages/ui`.

---

## 3. Pattern comparison

### A. Per-app CLI generation + shared tokens file (the AGENTS.md status quo)

Each app runs `npx shadcn add <component>` independently; the only shared artifact is a tokens CSS file (`packages/ui/globals.css`) that each app `@import`s.

- **Pros:** maximum app autonomy — each app owns every line of its primitives and can brand/restyle them independently; zero cross-app coupling; smallest conceptual model; matches the current AGENTS.md rule with no amendment or ADR. Tailwind v4 makes the shared-tokens half genuinely easy (§2.4).
- **Cons:** every primitive exists twice with two dependency sets (`@base_ui/react` versions, `cn` imports) that drift independently; a bug fix or variant added for admin's tables never reaches landing's booking form; `pnpm check`-gatekeeping two divergent copies of identical code. With admin about to generate dozens of CRUD primitives (data table, form, dialog, select, calendar, command palette…) and landing needing a subset of the same for the booking flow, duplication compounds quickly.
- **Verdict:** defensible if the apps' primitive sets barely overlap. They will overlap — both are forms-and-dialogs apps under one brand.

### B. Shared component package — the official monorepo pattern (2024-12 → present)

`packages/ui` becomes a workspace shadcn package: primitives + hooks + `cn`/utils + canonical tokens CSS. Each app keeps its own `components.json`; the CLI routes primitives to `packages/ui` and app-composed blocks to the app. Apps import `@sevendays/ui/components/*`.

- **Pros:** this is exactly what shadcn's own monorepo template and docs now prescribe (§2.1), so the CLI does the heavy lifting — path routing, dependency installation, import rewriting are built in. One copy of each primitive; Base UI stays version-locked across apps; admin's greenfield build populates the library, and landing consumes only what it needs. Components ship as source (no build step, no version-publishing dance inside the workspace). The shared `globals.css` doubles as the fix for our stale-tokens problem: the semantic layer becomes genuinely single-sourced, with brand remapping layered per app.
- **Cons:** amends the AGENTS.md rule ("each app owns its UI") → needs an ADR. Adds coupling discipline: `style`/`iconLibrary`/`baseColor` must stay in sync across three `components.json` files, and `packages/ui` must export every path another workspace references. Landing's brand-heavy aesthetic means it will often restyle primitives via the semantic token layer rather than use defaults — a real, but manageable, discipline (that is precisely what the `--primary`/`--radius`-style tokens are for). Re-restyling a shared primitive for one app tempts in-app forks — mitigate by keeping primitives stock and pushing brand into tokens/utilities.
- **Verdict:** the ecosystem-endorsed default, and shadcn's CLI support makes it low-friction. Best fit for two apps under one brand, one of which is an empty slate.

### C. Namespaced/private registry distribution (`@sevendays/...` registry)

Publish our components as a registry and consume via `"registries"` in `components.json` — optionally backed by a private GitHub registry.

- **Pros:** the most powerful distribution mechanism (versioned, auth'd, org-wide, works across repo boundaries); also unlocks v0-style item composition and AI-prompt/config resources.
- **Cons:** built for distribution *across* projects/organizations — for a two-app private monorepo it adds a registry to host, authenticate, and keep in sync, while workspace-internal imports already solve the sharing problem with zero infrastructure. Dependent on GitHub-registry features that only landed June–August 2026 (§2.3), i.e. the least-settled surface of the three.
- **Verdict:** overkill today. Revisit if a third consumer (docs site, storybook app, second product) appears.

---

## 4. Fit against this repo's constraints

- **`apps/landing` brand-heavy (9 hand-built components, brand custom props, default zinc semantic tokens):** recommendation deliberately leaves all nine components and the brand property layer exactly where they are. The integration of landing's "two unintegrated token layers" is addressed orthogonally: once the semantic token layer is shared, landing re-maps `--primary`/`--background`/`--ring`/etc. onto `--sea-ink`/`--lagoon`/`--foam` values in its own `styles.css` — brand in the brand layer, mechanics in the shared layer. (That remap itself is design work for the component-inventory/spec ticket, not this one.)
- **`apps/admin` greenfield:** gets the biggest win — it can `shadcn add` freely, everything lands in `packages/ui`, and nothing needs retrofitting later.
- **`packages/ui` exports only a dead `globals.css`:** whichever pattern wins, this must be fixed; the recommendation turns the dead file into the live canonical stylesheet and gives the package real exports. Doing nothing is the only option that leaves the AGENTS.md rule false.
- **AGENTS.md / ADR:** the shared-component pattern amends a written rule → ADR required (per the ticket and repo conventions). The amendment is small and matches where the ecosystem went.
- **Tailwind v4 + TanStack Start on Cloudflare Workers, pnpm + Turborepo:** all neutral-to-positive. The shared package is plain source TSX + CSS consumed by each app's own Vite pipeline (no build step, no SSR incompatibility — shadcn's monorepo template runs exactly this shape on Vite). `@import "@sevendays/ui/tokens.css"` is a build-time CSS resolution under `@tailwindcss/vite`. Worker bundle size is unchanged: components are tree-shaken per-import either way.

---

## 5. Recommendation (shaped to this repo)

**Adopt pattern B — the official shadcn monorepo pattern with Base UI as the base — implemented as:**

1. **`packages/ui` becomes a real shadcn workspace package.** Give it its own `components.json`, source exports (`./components/*`, `./lib/utils`, `./hooks/*`), and the canonical tokens stylesheet. Fix the stale `globals.css`: it is still Tailwind-v3-era (`@tailwind` directives, partial HSL token set) while both apps carry the current v4 block inline. Replace it with the shadcn v4 shape (raw oklch values in `:root`/`.dark` + `@theme inline` mapping), since Tailwind v4's official sharing story is exactly "a CSS file you import in each project" (§2.4).
2. **Per-app `components.json` stays, aligned to the shared package.** Update both apps' aliases to point `ui`/`utils` at `@sevendays/ui/...` and ensure "the same `style`, `iconLibrary` and `baseColor`" across all three files (§2.1). Note both files still say `new-york` while the current template uses `base-nova` — pick one value and apply it everywhere during setup.
3. **Generate primitives once, into `packages/ui`, via the CLI.** Admin drives the initial inventory (tables, forms, dialogs, selects, calendars); landing pulls the primitives its booking flow needs. Composed, page-specific components (login-form-style blocks, and all of landing's nine brand components) stay in each app.
4. **New components use Base UI** — the default since 2026-07-02. Nothing in this repo uses Radix yet, so there is no migration to run; simply don't add `-b radix`. If scripts ever call `shadcn init` non-interactively, pass the base flag explicitly to pin the choice (§2.2).
5. **Consolidate on the `cn` package** for the shared package's util instead of copying `lib/utils.ts` a third time (the hand-rolled copies in both apps can migrate opportunistically — it is a drop-in replacement, §2.5).
6. **Amend AGENTS.md** to: "Shared primitives and semantic tokens live in `packages/ui`; brand and page-specific components stay in each app." Write the ADR alongside the design-system spec (ADR candidates: shared-package pattern, Base UI as default base, tokens-file topology).

**Sequencing note:** token-brand integration for landing (remapping the semantic layer onto `--sea-ink`/`--lagoon`) is design work that belongs to the component-inventory/spec ticket; this research only establishes that the shared semantic layer is the right substrate for that remap.

---

## 6. Sources

| Claim | Source | URL / path | Date |
|---|---|---|---|
| CLI monorepo support ("installs to correct paths") | shadcn changelog | https://ui.shadcn.com/changelog (`2024-12-monorepo.mdx` in `shadcn-ui/ui`) | 2024-12-20 |
| Monorepo layout, per-workspace `components.json`, shared `packages/ui`, export requirements | shadcn monorepo docs | https://ui.shadcn.com/docs/monorepo | fetched 2026-09-09 |
| Base UI default; Radix supported; `init -b radix`; skill-based migration; `asChild`→`render`; Base UI 1.6.0/6M wk | shadcn changelog `2026-07-base-ui-default.mdx` | https://ui.shadcn.com/changelog (raw via GitHub API) | 2026-07-02 |
| Three registry bases (`base`, `radix`, `aria`) | shadcn-ui/ui repo tree | `apps/v4/registry/bases/` | 2026-09-09 |
| Base UI identity, MIT, `@base_ui/react`, Radix-adjacent APIs | Base UI official site | https://base-ui.com | fetched 2026-09-09 |
| `@scope/name` namespaces, `registries` config, decentralized design | shadcn registry namespace docs | `apps/v4/content/docs/registry/namespace.mdx` (raw via GitHub API); https://ui.shadcn.com/docs/registry | fetched 2026-09-09 |
| GitHub registries (public/private) | shadcn changelog entries | `2026-06-github-registries.mdx`, `2026-08-private-github-registries.mdx` | 2026-06 / 2026-08 |
| `@theme` / `@theme inline`, tokens-as-CSS-vars, cross-project sharing via imported CSS file | Tailwind v4.3 docs | https://tailwindcss.com/docs/theme | fetched 2026-09-09 (page states v4.3) |
| shadcn Tailwind v4 migration (oklch, `@theme inline`, non-breaking, tw-animate-css) | shadcn Tailwind v4 docs | https://ui.shadcn.com/docs/tailwind-v4 | fetched 2026-09-09 |
| `cn` package replaces `lib/utils.ts` helper | shadcn changelog | `2026-09-cn.mdx` | 2026-09-03 |
| All local-repo facts in §1 | This repo | `packages/ui/package.json`, `packages/ui/src/globals.css`, `apps/*/components.json`, `apps/*/src/styles.css`, `apps/*/package.json`, `apps/landing/src/components/` | checked 2026-09-09 |

## 7. Uncertainties (flagged, not guessed)

- **Base UI "1.6.0, 6M+ weekly downloads"** is shadcn's claim in its own changelog; I did not independently verify against npm. Irrelevant to the recommendation (the default is the default regardless of download counts).
- **`base-nova` style semantics:** verified the value appears in the current monorepo doc and across the Base UI component docs; I did not read a page defining the style preset in full. Operative requirement for us is only "same style value in all `components.json` files."
- **`ui.shadcn.com/docs/registry` live page** timed out twice; namespace facts were verified from the same documentation's source in the `shadcn-ui/ui` repo instead. Content is first-party either way.
- **`shadcn create` vs `shadcn init` behavior** inside an *existing* monorepo (the docs cover `create` scaffolding a new one) is not fully documented — expect to run `init`/`add` per workspace here; treat exact incantations as implementation detail for the spec ticket.
