# ADR-0003: Vitest 4 with a per-workspace config requirement

**Status:** Accepted
**Date:** 2026-08-30

## Context

`packages/config` exports a shared vitest base (`@sevendays/config/vitest`, built to `dist/`) providing reporters (default + blob), istanbul coverage, and `passWithNoTests`. The root `vitest.config.ts` composes it into two projects (`packages/`, `apps/` with jsdom), and workspaces relied on that shared config plus vitest's defaults to find their tests.

The 2026-08-30 upgrade of `apps/api` from vitest ^2 to ^4.1.11 broke that assumption. Observed behavior:

1. **Discovery from inside a workspace stopped working.** Run from `apps/api`, vitest 4 reported "No test files found" (exit 0) even though `src/index.test.ts` exists — with the default glob, with an explicit filter, and with `--dir src`. The root config's project topology does not serve runs started inside a workspace.
2. **`passWithNoTests` turned the miss into a silent green.** Root `pnpm test` (turbo) stayed fully green while the api suite executed zero tests. The miss was only caught because the audit ran the binary directly and read the RUN banner.
3. A root-level run *did* discover the api test file, but crashed its worker: the root config's `apps` project sets `environment: 'jsdom'` and jsdom was never installed anywhere (`ERR_MODULE_NOT_FOUND: jsdom`).

## Decision

- **Every workspace that owns tests must have its own `vitest.config.ts`**, extending `@sevendays/config/vitest`, with an explicit `include` glob and the runtime-appropriate `environment` (`node` for api/services; `jsdom` only where a DOM is genuinely needed).
- `apps/api` sets `environment: 'node'`, `include: ['src/**/*.test.ts']`. `landing`/`admin` get the same treatment when they grow real tests; their `test` scripts are deliberate no-ops until then.
- The shared base keeps `passWithNoTests`, because turbo runs workspaces that legitimately have none — which is exactly why the per-workspace config is mandatory: the "no tests" assertion lives at the workspace boundary where it is meaningful, not at the run boundary where it hides regressions.
- jsdom becomes a devDependency of a workspace the day that workspace's tests need a DOM — never assumed from a shared config.

## Alternatives Considered

- **Workspace globs in the root config only (the vitest 2 status quo)** — rejected: it silently broke on the major upgrade, and the failure mode (green run, zero tests) is worse than the cost of a few small config files.
- **Remove `passWithNoTests` from the shared base** — rejected: landing/admin legitimately have no tests today; failing them would gate the whole repo on scaffolding state.
- **Install jsdom at the root for the `apps` project** — rejected: the root should not carry a test-environment dependency for workspaces that do not exist yet; with per-workspace configs, the root project's environment setting is no longer load-bearing.

## Consequences

- One ~10-line config file per testing workspace.
- After any vitest major upgrade, re-verify discovery per workspace: run the workspace's tests directly and confirm the test count is >0, not just that turbo is green.
- The root config's projects remain for root-level runs and coverage merging; they no longer carry the discovery burden for individual workspaces.
