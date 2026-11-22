# ADR-0022: Standalone Playwright as the browser-E2E and visual-regression foundation

**Status:** Accepted
**Date:** 2026-10-05

## Context

Browser-driven verification today lives in ad-hoc CDP harnesses (`booking-e2e`, `cms-reflection` — plain Node over chrome-remote-interface), born per-milestone as exit gates against the local stack. M6 needs a **post-deploy production smoke** (the verify gate, #181) and M7 needs **visual regression** on the redesigned landing (its flagship consumer) — both walk real browsers against real deployments, which the harnesses were never shaped for (hand-rolled waits and selectors, no screenshot discipline, no traces). The 2026-09-30 ruling seats a pre-flight browser-test foundation in M6, built once ahead of its consumers (the M2-pre-flight pattern). The open question was the runner: vitest browser mode or standalone Playwright. The fact that reframed it (recorded by #179): `@vitest/browser-playwright` is an **optional** peer of vitest 4.1.11 — listed in the lockfile, never resolved — so browser mode was never already-paid-for; either option brings new devDependencies plus the same browser download.

## Decision

**Standalone `@playwright/test`, housed at a top-level `e2e/`.** One root `playwright.config.ts`; `@playwright/test` as a root devDependency; a root `test:e2e` script deliberately **outside turbo's `test` task** so `pnpm check` stays browserless. Playwright owns browser E2E + visual regression (navigation fixtures, `webServer` orchestration, `storageState` auth, `toHaveScreenshot`, the trace viewer, codegen); **vitest stays the in-process unit/integration umbrella exactly as ADR-0003 rules it** — that ADR governs per-workspace test configs and never covered out-of-process E2E (the CDP harnesses weren't under it either).

- **Engine scope:** chromium-only at landing; firefox/webkit are a documented later addition for smoke breadth — deliberately never for visual baselines (per-engine snapshot matrices are exactly the noise to avoid).
- **CI posture:** on-demand (`workflow_dispatch`) + **nightly**, with cached browsers (`PLAYWRIGHT_BROWSERS_PATH`); **never PR-gating** — the PR gate stays exactly `pnpm check` + `pnpm build`, local runs remain the primary loop, and a minimal PR smoke is a documented future option deliberately not taken (free-Actions-minutes cost posture; the first consumer is post-deploy by nature; visual regression on PRs is rendering-noise against the owner-reacted-variants discipline).
- **Classification:** owner tooling, **main-only, never picked** to `v1` (the CDP-harness class) via one `paths.txt` edit adding `e2e`, `playwright.config.ts`, and the workflow path — the last is load-bearing: `.github/workflows/` is not seeded out, and a scheduled workflow picked to `v1` would fire nightly against files that don't exist there.
- **Suite taxonomy** (pinned in the M6 spec): `e2e/smoke/` now; `e2e/visual/` arrives with M7's regression.

## Alternatives Considered

- **Vitest browser mode (`@vitest/browser-playwright`)** — rejected: not already-paid-for (optional peer, never resolved — the fact correction); it would couple the browser loop to the unit umbrella ADR-0003 scopes to in-process work, and either way new devDependencies land.
- **Extend the CDP harnesses** — rejected: hand-rolled orchestration, no visual regression, no traces/codegen; the harnesses are exit-gate scripts for the local stack, not a foundation for deployed-environment suites.
- **Playwright inside a workspace package** — rejected: the suites walk all apps from outside; the root home keeps browser tooling edition-classified and out of every app's dependency graph.

## Consequences

- Two browser-test systems coexist through M6 by design: the CDP harnesses remain the exit-gate class of record for already-shipped surfaces (M6 rewrites none); scenarios port **by consumption** from M7 (rewritten surfaces are born in Playwright), the booking-cluster harnesses port last (v2's payload), `confirmation-emails.mjs` (Resend polling, not browser-driven) rides with `booking-e2e` or survives as plain-node tooling; retirement targets ~M7 end. No big-bang port.
- The M6 verify gate's smoke (`e2e/smoke/`) is the foundation's first consumer — nightly on the teaser deployment, owner-run dispatch on the v1 production domain; it never joins `pnpm check`.
- M7's redesign visual regression is the flagship consumer; M7's verification posture stays tool-neutral by ruling (its gates hold either way, the visual layer rides whichever foundation exists at build time).
- `paths.txt` grows the three foundation paths; every future file under `e2e/` inherits main-only classification automatically.

## Amendment — 2026-11-22: CMS-content masking policy (#346)

The visual baselines originally rode the "advisory drift" contract: CMS content edits surfaced as nightly-red diffs and the owner re-baselined on intent. That contract failed its first real exposure — the nightly went red **every scheduled run for eight nights** (11-14 → 11-21) once the owner began curating real content (gallery repopulation 9 → ~20 photos, testimonial swap, site logo), with the drift compounding through #344/#345. Diagnosis: run-log + artifact evidence on #346; the same class had already absorbed one round at a72008e (11-09).

The owner picked masking: **baselines now assert layout/chrome only.** Every CMS-content region is either (a) **clamped + masked** — Playwright compares image dimensions before masks apply, so variable-height regions (mosaic walls, testimonials, the about story, the gallery tab row, the footer branch grid, the announcement strip) are pinned to fixed heights via injected CSS before any measurement, then masked; or (b) **masked only** — fixed-height boxes (brand lockups, cover panels, service rows) whose wrapper exists in both the img and placeholder branches of `CoverPanel`. The implementation lives in `e2e/visual/redesign.spec.ts` (`SHARED_STABILIZE_CSS` / `STABILIZE_CSS` / `SHARED_MASK_SELECTORS` / `MASK_SELECTORS`); the clamps clip their interiors, so reveal wrappers inside them are stamped shown (IntersectionObserver honors overflow clipping and would otherwise hang the reveal gate). Mask locators are proven tolerant of zero-match (skipped) and multi-match (all masked) elements at capture time.

Consequences: a nightly red now means a **layout/chrome drift, a broken capture gate, or a CMS-fed region not yet in the mask list** — re-baseline only on intentional layout changes. Documented residuals stay advisory (geometry-class, rare): hero copy, page-head h1s/descriptions, the featured heading, grid item counts, and the text panels beside masked covers (names, descriptions, inclusions, prices).
