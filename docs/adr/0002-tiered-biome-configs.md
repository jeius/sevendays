# ADR-0002: Tiered Biome configs — bundled workspaces vs libraries

**Status:** Accepted
**Date:** 2026-08-29

## Context

ADR-0001 left every workspace on one shared Biome base with the barrel-file rules
(`noBarrelFile`, `noReExportAll`, `noNamespaceImport`) globally off, because the
`packages/*` barrels are the architecture. But apps and packages have different
consumption models: apps are bundled (Vite builds landing/admin, wrangler bundles
api), while `types`/`db`/`ui` are consumed as source and can keep barrels as their
public API — the consuming app's bundler tree-shakes the graph. A census confirmed
the split is free: the bundle-perf rules produce **0 findings in apps** and **13 in
packages** (5 barrels, 7 `export *`, 1 namespace import — the deliberate API
surface). Separately, the base preset was manually relaxed from `all` to
`recommended` (the preset-relaxation commit); the tiers are built on that calm base.

## Decision

Three **delta fragments** in `packages/config/src/biome/`, consumed by extending
base + the fragment (two entries in the consumer's `extends` array):

| Fragment | Content | Consumers |
|---|---|---|
| `base.json` | Runtime-neutral: formatter, organizeImports, `recommended` + nursery preset, domains, `tailwindDirectives`, vcs. Trio off, `noDefaultExport` off. | root, `packages/config` |
| `vite.json` | Trio + `noCommonJs` at **error**; `jsxQuoteStyle: single`, `noHeadElement: off`, `useSortedClasses: on` (moved out of base) | `landing`, `admin` |
| `node.json` | Empty — the calm library tier; future home for node-only rules | `types`, `db`, `ui` |
| `worker.json` | Trio + `noCommonJs` at **error** (no JSX/class settings — api has no markup) | `api` |

Naming parallels the ts variants (`ts/vite`, `ts/node`); `worker` is added because
`api` shares `ts/node` with the libraries but is bundled, and strict ts-parallelism
would have left api without the perf rules. Consumers extend via package exports:
`@sevendays/config/biome/base` + `@sevendays/config/biome/<fragment>`.

## Alternatives Considered

- **Variant extends variant (base nested under vite/node/worker)** — rejected:
  Biome 2.5.11 fails to propagate the parent's `files.includes` through a nested
  extends chain (effective include set collapses to the child's negations; every
  consumer linted 0 files). Fragments are pure deltas; consumers list base first,
  fragment second (later-wins merge).
- **Strict ts-parallelism (`node.json` shared by api + libraries)** — rejected:
  would force the library tier's calm rules onto bundled api, leaving the perf
  rules permanently disarmed.
- **Inline per-workspace overrides** — rejected: policy would be scattered across
  8 files instead of evolving in one place per tier.
- **`preset: "all"` in the app tiers** — rejected: the maximal style guards were
  relaxed repo-wide (the preset-relaxation commit) and that preference should not silently re-enter
  through a tier boundary.

## Consequences

- Bundle-friendliness is now *enforced* where it matters (no barrels, no `export *`,
  no namespace imports, no CommonJS in apps) at zero migration cost — apps already
  comply.
- Libraries keep barrels as public API; "neat and readable" tier = calm
  recommended preset + organizeImports, with a named fragment to hang future
  node-only rules on.
- App-shaped settings (`useSortedClasses`, `noHeadElement`, `jsxQuoteStyle`) no
  longer leak into the library tier or root; base is runtime-neutral.
- Adding a workspace = pick a tier; adding a tier rule = one fragment file.
- Biome's nested-extends `files` propagation is a known trap; if a future Biome
  release fixes it, fragments can be collapsed into self-extending variants
  without touching consumers.
