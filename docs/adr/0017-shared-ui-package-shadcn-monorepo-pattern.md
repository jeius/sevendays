# ADR-0017: Shared UI package — the shadcn monorepo pattern

**Status:** Accepted
**Date:** 2026-09-14

## Context

Two TanStack Start apps (`landing`, `admin`) share one brand but until now owned their UI independently — AGENTS.md's rule was "each app owns its UI, shared tokens live in `packages/ui`". In practice that rule had already rotted: `packages/ui` was a dead tokens-only package (stale v3-era stylesheet) while both apps duplicated the full Tailwind v4 oklch token block inline in their own `styles.css`. Admin is UI-greenfield and about to generate dozens of CRUD primitives (tables, forms, dialogs, calendars) that overlap landing's booking-flow needs — per-app generation would duplicate every primitive with drift-prone dependency sets. shadcn's own monorepo docs now prescribe a first-class pattern (CLI monorepo support since 2024-12-20), and since 2026-07-02 shadcn's default primitive base is Base UI, not Radix. The decision was researched on wayfinder map #55 (ticket #56, research notes on branch `research/shadcn-distribution-56`) and is consumed by the M3 UI/UX design-system spec (`docs/specs/2026-09-14-ui-ux-design-system-spec.md`).

## Decision

`packages/ui` is the shared design-system library — semantic tokens plus shadcn-generated primitives plus utils — using the official shadcn monorepo pattern: one `components.json` per workspace (both apps and the package), all three pinning the same `style`/`iconLibrary`/`baseColor`, so `shadcn add` routes primitives into `packages/ui` while app-composed blocks land in the requesting app. All new primitives use the Base UI base. Brand and page-specific (composed) components stay app-local. Within that split, a strict two-tier vocabulary applies: Tier 1 primitives keep their registry names verbatim; Tier 2 composed components are app-local PascalCase; there is no shared-composed middle tier in v1.

## Alternatives Considered

- **Per-app CLI generation + shared tokens only (the status quo reading of the old rule)** — maximum app autonomy, but every primitive exists twice with drift-prone dependency sets, and the admin CRUD wave makes the duplication compound. Rejected.
- **Namespaced/private registry (`@sevendays/...`)** — built for org-scale distribution across repos; overkill for a two-app monorepo. Deferred with a pinned trigger: revisit if a third consumer appears. The same trigger gates the shared-composed middle tier.

## Consequences

- AGENTS.md's UI rule is amended: *shared primitives + semantic tokens live in `packages/ui`; brand and page-specific components stay in each app.* Both apps depend on `@sevendays/ui` for UI foundations; a breaking change there now touches both apps at once.
- Primitives ship as source inside the repo (shadcn's model), so upgrades are deliberate per-component edits, not dependency bumps — and they must be generated through one pinned CLI version across workspaces to avoid registry drift.
- The `cn` helper consolidates on the `cn` package instead of per-app hand-rolled copies.
- The middle-tier ban accepts some duplicated composition logic across apps until a third consumer appears; that's the deliberate price of a simple, legible two-tier system.
- Landing's nine bespoke brand components and its brand custom-property layer stay app-local by design; admin builds greenfield on the shared library from day one.
