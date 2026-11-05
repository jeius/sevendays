# e2e — the browser-test foundation (ADR-0022, M6 #189)

Standalone `@playwright/test`, chromium-only, walking **deployed** environments — never local dev servers, never part of `pnpm check` (the root package is not a pnpm workspace member, so turbo's `test` task cannot see `test:e2e`; the PR gate stays `pnpm check` + `pnpm build`, browserless).

## Running

```bash
pnpm exec playwright install chromium   # once per machine (~150 MB)
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
E2E_ADMIN_URL=https://sevendays-admin.pahamajulius.workers.dev \
pnpm test:e2e
```

`E2E_BASE_URL` has no default on purpose: the config fails fast with a curated message when it is unset — a smoke run against the wrong target is worse than no run. The three URLs cover the six public legs; the authenticated leg additionally wants `E2E_SMOKE_STAFF_EMAIL` + `E2E_SMOKE_STAFF_PASSWORD` (the dev `smoke-staff` account, provisioned per `docs/staff-provisioning.md`, sealed in the GitHub environment) — without them that one leg fails with the same curated posture, never a silent skip. In CI all five values arrive from the workflow's GitHub environment (`.github/workflows/e2e.yml`).

## Taxonomy

- `smoke/` — the production smoke (#190, spec #182 § The verify gate): seven presence/status-level assertions over the deployed stack — api health, the landing home, the CMS-fed /about surface, a live media asset URL'd from the gallery payload, the booking page serving (never submitting), the admin sign-in page, and a real `smoke-staff` sign-in reaching the Analytics Dashboard. #189's one-probe foundation spec was this suite's doorway and is superseded (deleted when the seven landed).
- `visual/` — the redesign visual suite (#225, ADR-0022's flagship consumer): the 8 redesigned public surfaces × light + dark as 16 committed `expect.toHaveScreenshot` baselines — see the Visual regression section below.

## Visual regression (ADR-0022, #225)

`e2e/visual/redesign.spec.ts` seats the ADR-0022 flagship consumer: the 8 redesigned public surfaces (`/`, `/packages`, `/packages/<slug>`, `/services`, `/branches`, `/about`, `/share-your-story`, the global not-found) × light + dark = **16 committed baselines** in `e2e/visual/redesign.spec.ts-snapshots/`.

Mechanics that keep the baselines honest:

- **Both themes, pinned before load** — an init script seeds next-themes' default `theme` localStorage key (`light` | `dark`); the class-strategy provider (packages/ui seam, `attribute="class"`, `enableSystem` false) applies the class pre-paint. No toggle clicks, no system fallback.
- **The detail slug is never hardcoded** — the run derives `/packages/<slug>` from the LIVE `/api/v1/service-packages` payload, so the visual run wants `E2E_API_URL` set alongside `E2E_BASE_URL` (the `requiredEnv` contract, same as the smoke). An empty catalog is a red run with a named message, never a skip.
- **Motion is deterministic** — the config's `expect.toHaveScreenshot` block (`animations: 'disabled'`, `caret: 'hide'`, `maxDiffPixelRatio: 0.01`) cancels the infinite services-marquee loop to its initial state and fast-forwards the one-shot reveals; the home test additionally masks the looping track (`[class*='marquee']` — the only element whose class embeds the `marquee` animation, collapsed entirely on a zero-service read), and every test walks the page once before capture so the IntersectionObserver-driven reveals fire below the fold (a fullPage capture reads beyond the viewport without scrolling).

```bash
E2E_BASE_URL=<teaser> E2E_API_URL=<teaser-api> pnpm test:e2e -- e2e/visual            # compare
E2E_BASE_URL=<teaser> E2E_API_URL=<teaser-api> pnpm test:e2e -- --update-snapshots e2e/visual   # re-baseline on INTENT, then eyeball every PNG
```

Baselines are **advisory on the nightly** — CMS content edits surface as drift in the nightly log; re-baselining (`--update-snapshots`) is the owner's deliberate act, always followed by an eyeball pass over every PNG before committing (a masked-wrong or empty-content baseline is a false green forever). Chromium-only forever; no per-engine baselines; never PR-gating.

## Rulings that bind every suite here

- **Chromium-only** at landing; firefox/webkit are a later addition for smoke breadth only — never for visual baselines (per-engine snapshot matrices are the noise to avoid).
- **Never PR-gating** — CI is nightly + `workflow_dispatch` (`.github/workflows/e2e.yml`, cached browsers); local runs are the primary loop; commit-green and smoke-green stay separate verdicts.
- **Main-only, never picked to v1** — the CDP-harness class (`scripts/seed-v1/paths.txt`).
- **Read-only plus at most the sign-in act** (#190's posture) — the deployed environments hold the studio's real data.
