# ADR-0015: Two-edition delivery — one filter-repo seed plus cherry-pick maintenance

**Status:** Accepted
**Date:** 2026-09-11

## Context

The owner ruled versioned delivery (#62): v1 is a booking-free **full handover** (repo + accounts) delivered free after polish; v2 is the complete booking system, delivered later as paid work. Booking is already built and merged, and it is embedded in shared files — CTAs in the site header/cards/hero, the `/appointments` mount line, `appointmentQueries`, `phDateTime`, the `env.ts` `RESEND_API_KEY` + `LANDING_ORIGIN` pair, `CreateAppointmentArgs` — behind a typed cascade (ADR-0006): the API mount, the api-client group, and landing's booking server functions are one compile-time unit, so there is no "booking-free API, untouched landing" compilable state. The kill-switch idea was superseded: **absence is the only lock that holds** (#62 ruling 5) — no commit in the handed-over repo may ever have contained booking code. Research (#68) showed build-time exclusion cannot satisfy this (it gates deployments while shipping all source), and that neither a pure release branch nor a pure on-demand export is good alone.

## Decision

**Compose the two workable mechanisms** (ruled in #70):

1. **Seed once.** A single `git filter-repo` pass over the current history — booking-only paths removed (`--invert-paths`), embedded shared-file references scrubbed by content-rewrite rules keyed to the absence inventory (#71, content per #72) — seeds a long-lived **`v1` branch in this monorepo**, executed early in the v1 edition while the inventory is fresh. History is rewritten exactly once, at the seed.
2. **Maintain by cherry-pick.** Every non-booking PR squash-merged to main is cherry-picked (`-x`) to `v1`; booking PRs are skipped; mixed PRs are split. Two locks keep the branch honest: **CI** (typecheck + test on the branch — the typed cascade fails any incomplete cut) and a **continuous private deploy** of `v1` to unadvertised owner infra, which also exercises the env-shed (`env.ts` without the Resend pair) for months before handover. Main stays a strict superset of `v1` by patch content; main is never merged into `v1`.
3. **Export plain.** The handover export is a `git clone --single-branch --branch v1` — so the client's repo **shares `v1`'s SHAs forever**, and post-handover fixes land as mechanical fast-forward pushes from `v1`. The **teaser** is main itself, continuously auto-deployed to unadvertised owner infra (the owner's own deployment per #62; doubles as staging for the booking-bearing build).
4. **v2 lands as a fresh change-set.** The v2 build-out happens on main as normal work; at delivery the client's repo advances to main's tree state as **new commits on the client's own lineage** — no merge (histories are unrelated after the seed rewrite), no patch-mining, no deploy-only. Booking enters the client's repo exactly once, as explicit paid work.
5. **Audit regardless.** No mechanism proves absence by itself: a `git log -S/-G` token sweep keyed to the #71 inventory runs over the **exported artifact** before handover (a Handover-milestone checkbox).

## Alternatives Considered

- **Release branch maintained by discipline alone** — rejected as the sole mechanism: no pre-booking tag exists to fork from, so the clean start would itself need a replay/export, and pick/skip/split cost runs from day one. Adopted as the maintenance half of the compose.
- **On-demand `git filter-repo` export at handover** — rejected as the sole mechanism: cost concentrates at the worst moment, one missed path or scrub rule leaks booking code into handed-over history permanently, and post-handover fixes diverge (direct patch = permanent fork; re-export = second disjoint handover). Adopted as the seeding half.
- **Build-time exclusion** (route-generator ignores, Vite `define`/DCE, conditional mounts) — rejected outright per #68: the deployed artifact retains all source and flag machinery, the `env.ts` email pair survives, and the client would own the flag — absence in name only. It gates deployments; it never produces a booking-free artifact.
- **Squashed snapshot export** — held as the documented fallback if pick/split discipline proves too costly in practice: absence trivially satisfied, provenance discarded.

## Consequences

- A standing per-PR discipline: triage pick/skip/split on every merged PR; conflict pressure grows with unsynced windows; the discipline never changes after handover (paid v1 fixes are developed on main, picked to `v1`, pushed as fast-forwards).
- `-x` provenance lines reference main SHAs absent from the export — cosmetic commit-message text, accepted under the history standard.
- Historical revisions on `v1` won't typecheck (scrubbed imports of removed files) — the history is an audit artifact, not a runnable lineage; HEAD always builds and deploys.
- The continuous private deploy is standing owner infra; under the inherit-in-place handover (#75) it is plausibly the very Workers app the client inherits.
- ADR-numbering gaps from doc scrubs are accepted in the export (ADR-0013 kept, annotated).
- One-way door: after clients hold `v1`-SHA repos, the mechanism can only be replaced by another full handover — the squashed-snapshot fallback included.
