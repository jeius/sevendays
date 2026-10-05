# e2e — the browser-test foundation (ADR-0022, M6 #189)

Standalone `@playwright/test`, chromium-only, walking **deployed** environments — never local dev servers, never part of `pnpm check` (the root package is not a pnpm workspace member, so turbo's `test` task cannot see `test:e2e`; the PR gate stays `pnpm check` + `pnpm build`, browserless).

## Running

```bash
pnpm exec playwright install chromium   # once per machine (~150 MB)
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev pnpm test:e2e
```

`E2E_BASE_URL` has no default on purpose: the config fails fast with a curated message when it is unset — a smoke run against the wrong target is worse than no run.

## Taxonomy

- `smoke/` — deployed-stack presence assertions. The one-probe foundation spec is #189's; #190 lands the seven production assertions (health, home, CMS-fed surface, live media asset, booking page serves, admin sign-in page, real staff sign-in).
- `visual/` — arrives with M7's redesign regression; deliberately absent now.

## Rulings that bind every suite here

- **Chromium-only** at landing; firefox/webkit are a later addition for smoke breadth only — never for visual baselines (per-engine snapshot matrices are the noise to avoid).
- **Never PR-gating** — CI is nightly + `workflow_dispatch` (`.github/workflows/e2e.yml`, cached browsers); local runs are the primary loop; commit-green and smoke-green stay separate verdicts.
- **Main-only, never picked to v1** — the CDP-harness class (`scripts/seed-v1/paths.txt`).
- **Read-only plus at most the sign-in act** (#190's posture) — the deployed environments hold the studio's real data.
