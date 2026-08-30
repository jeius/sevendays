# ADR-0001: Pin TypeScript to ^6.0.3 and standardize on Biome for lint + format

**Status:** Accepted
**Date:** 2026-08-29

## Context

The repo had four different `typescript` specifiers across six manifests (`^5.7.0` in `apps/api`, `^6.0.2`/`^6.0.4` elsewhere) and split tooling: ESLint (with `@tanstack/eslint-config`) for lint, Prettier for format, with per-app configs. Meanwhile TypeScript 7.0 (the Go-based compiler) became npm `latest`, and Biome 2.5 matured into a single fast binary covering lint + format.

Two forces: (a) consolidate tooling — three config systems for the same job is overhead a solo maintainer doesn't need; (b) decide the TS line deliberately — TS 7 is a new compiler generation with breaking changes (strict-by-default, ES5 dropped, classic Node resolution removed), and adopting it "because it's latest" is not a reasoned position for a repo whose apps depend on TanStack Start + Vite 8 + Cloudflare Workers toolchains.

## Decision

- **TypeScript `^6.0.3` in every manifest.** The `^6.0.3` range caps at `<7`, so installs stay on the final 6.x line while the repo is young. TS 7 adoption is deferred until the app toolchains (TanStack Start, Cloudflare Workers types) declare compatibility.
- **Biome 2.5.11 (pinned exact, root devDep only) replaces ESLint + Prettier everywhere.** Shared base config lives at `packages/config/biome.base.json` (same consume pattern as `tsconfig.base.json`); each workspace has a thin `biome.json` with `"root": false` extending it by relative path. Scripts call the `biome` bin directly.
- **Maximal ruleset**: `preset: "all"` + `nursery.recommended: true`. Deviations, each with a reason: `project`/`qwik`/`solid` domains off (React repo; module-graph import rules duplicate `tsc --noEmit`, and Qwik/Solid rules cross-fire), barrel-file rules off (re-export barrels in `packages/*` are the architecture), `noHeadElement` off (false positive on TanStack Start's root route), `noDefaultExport` off (TanStack route files require default exports), `noExplicitAny`/`noUnusedVariables` downgraded to warn. Nursery `useSortedClasses` on (info severity) for Tailwind class ordering.
- Rollout in two commits: config/deps first, then a repo-wide `biome check --write` so the mechanical diff never mixes with the config diff.

## Alternatives Considered

- **TypeScript 7.0 (npm latest)** — rejected for now: Go-compiler generation change with breaking changes; the value is speed, and this repo's typecheck is ~3s. Revisit when app toolchains support it.
- **Nested `extends: "//"` root-inheritance pattern** — rejected: we want the base config versioned in `packages/config` like the tsconfig base, not implicit root inheritance.
- **Keep `@tanstack/eslint-config` alongside Biome** — rejected: two lint runs for a handful of router-specific rules is not worth the dual toolchain; accepted loss.
- **Keep Prettier for Markdown/YAML** — rejected: Biome doesn't format those, but the IDE's markdown formatter covers them; repo tooling stays single-tool.

## Consequences

- Lint + format run in one tool (~150ms for the repo), one config system, one suppression comment syntax (`biome-ignore`).
- Maximal ruleset means Biome minor-version bumps can introduce new findings; upgrades are no longer invisible (pinned exact version makes this explicit).
- Nursery rules are unstable by definition; `useSortedClasses` may change behavior between versions.
- TanStack ESLint plugin rules (router file conventions) are no longer enforced by CI tooling — the router CLI (`tsr generate`) remains the correctness mechanism.
- pnpm 11 build-script policy now lives in `allowBuilds` in `pnpm-workspace.yaml`; the old `onlyBuiltDependencies` in `package.json` was ignored by pnpm 11 and was removed.
