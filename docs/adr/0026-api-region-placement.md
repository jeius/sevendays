# ADR-0026: Region placement of the api worker — the SIN hint

**Status:** Accepted
**Date:** 2026-11-14

## Context

The M8 spec (`docs/specs/2026-11-14-m8-admin-cms-latency-spec.md`, ratified 2026-11-14) and its baseline walk (#280) measured every admin catalog read at **2.5–5.0 s wall clock** with cpuTime of only 14–39 ms — about 99% of the wait is database I/O, and warm refetches are exactly as slow as cold ones. The topology verdict (#283, durable record `research/topology-verdict-findings.md` @ `5c4b1a4`) localized the cost: the api worker executes at whichever colo serves the frontend's user (service bindings co-locate by default — ADR-0016), so for staff in the Philippines every request pays a fresh Supavisor connect and its queries over a Manila→Singapore chain — a fresh Postgres TLS + SCRAM handshake is 4–5 round trips at 50–90 ms each plus 2–4 more for the queries, roughly **300–800 ms of DB-attributable cost per cold admin read**, before the episodic Supavisor connect degradation (~2.3 s connects — the 2026-11-09 P0 signature) that made the measured numbers worse than the model. The database stays where it is: Supabase ap-southeast-1 (Singapore) is already the closest region to the audience, the free tier fixes the region at project creation, and no Philippines region exists.

The first attempt at connection relief, Hyperdrive, was reverted after the 2026-11-11 platform episode (**ADR-0024 is burned**; the re-land recipe stays parked in #260). Placement is the remaining free-tier-native topology lever.

## Decision

**Pin the api worker to the database's metro with a region placement hint — region mode (targeted), never Smart Placement:**

```toml
# apps/api/wrangler.toml
[placement]
region = "aws:ap-southeast-1"
```

Region hints are GA (Cloudflare changelog, 2026-01-22): "Workers run in the Cloudflare data center with the lowest latency to the specified cloud region" — deterministic, no traffic analysis needed, free-plan available. Wrangler 4.127.1 (the pinned install) validates and forwards the targeted format (`parseConfigPlacement` → `{ mode: "targeted", region }` on the version-upload request; proven by dry-run + dist inspection, 2026-11-14).

**Why not Smart Placement:** smart mode "only considers locations where the Worker has previously run" — the api runs at MNL/CEB (PH visitors) plus the CI runners' US/EU colos; **Singapore is not in the candidate set**, so smart mode cannot reach the DB's metro. Its analyzer also "requires consistent traffic from multiple locations" — a few staff's admin volume would sit at `INSUFFICIENT_INVOCATIONS` indefinitely.

**The frontends stay at the edge.** Placing `landing` or `admin` would add a cross-metro hop to every page response for every visitor; Cloudflare's documented split pattern is an edge Worker close to the user and a backend Worker close to the database. The service binding (ADR-0016) forwards the admin's api calls to the placed worker: one Cloudflare-backbone round trip MNL↔SIN ≈ **30–70 ms** per request — the accepted trade against the ~200–450 ms of connect + query RTTs saved intra-metro (**~150–600 ms net per cold admin read**, modelled; the #280 baseline suggests the episodic connect-degradation share is larger still).

**The deploy path is CI only.** The hint rides `wrangler.toml` into CI's deploy legs (`Deploy teaser (main)` → `sevendays-api`; the v1 pick → `sevendays-v1-api`). A bare local deploy is forbidden — the #263/#264 lesson (it wipes the CI-passed `--var`s; the only restore is `gh run rerun`).

**Acknowledged side effect on the public cache (ADR-0025):** the read-through edge cache lives in the api worker, so it now warms in Singapore only. PH *warm* public reads (inside the 60 s TTL) pay the ~30–70 ms forward hop instead of ~0; PH *cold* public reads save the same intra-metro dial the admin saves. Net favorable; public/landing reads are out of M8's scope (owner acknowledgment on record — spec user story 14).

**Accepted residual:** the admin worker's own direct-DB paths — the shell gate's `getSession`, the Audit Log viewer, the Users tab (ADR-0023) — keep their cross-metro connect penalty: the placement lever cannot reach them while they run at the edge, and the owner ratified them as an accepted residual (2026-11-14, spec § Out of scope) as owner-only, low-frequency screens.

## Alternatives Considered

- **Smart Placement (`mode = "smart"`)** — the free-plan default, but provably unable to relocate this worker: the candidate-set failure (SIN was never run at) and the traffic-volume failure (admin-only volume starves the analyzer) above.
- **Placing the frontends too** — anti-lever: adds ~50–90 ms to every admin/landing page response for every PH visitor.
- **Hyperdrive** — the right product shape for the connect cost, but blocked on the 2026-11-11 platform episode (#260; reverted #261/#262, ADR-0024 burned). When it re-lands it composes UNDER the read cache (ADR-0025), at the (now SIN) execution site — not instead of placement.
- **Supabase read replicas** — Pro plan and up; the deployment stays free-tier until handover (owner ruling).
- **Moving the Supabase project** — no PH region exists; the free-tier region is fixed at creation; SIN is already optimal.
- **Supavisor pooler config changes** — nothing to change: transaction mode + `prepare: false` are already live (ADR-0007, amended 2026-09-02).

## Consequences

- **Every api request executes in the SIN metro** regardless of arrival colo. Verification: the `cf-placement` response header — present on all responses once placement is enabled (`remote-<airport>` when routed by placement, `local-<airport>` when the worker ran at the arrival location; the header is absent entirely without placement — the pinned pre-change state on #285). #285 records the live header evidence and the before/after access-log comparison against the #280 table; the M8 exit gate (#289) re-runs the full baseline walk against the ratified target. The Workers API placement-status endpoint exists as a fallback, but an Oct 2026 community report of `wrangler workers versions list/get` HTTP 500s on placement-region workers makes the header the preferred seam.
- **Dev/test unaffected** — placement is deploy-time routing; `wrangler dev`, vitest, and the loopback suite never see it.
- The M4-era "measure before adding machinery" posture is discharged by the #280 baseline: the machinery here is one config key, and its proof is the comparison the exit gate runs.
