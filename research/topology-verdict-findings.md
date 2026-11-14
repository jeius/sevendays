# Research #283 — Topology verdict: Smart Placement, Singapore DB, PH staff

**Date:** 2026-11-14 · **Question:** Given the Supabase project is in Singapore and staff use the admin from the Philippines, is Cloudflare worker placement a real lever for admin-read latency, or out of scope for the M8 spec?

## Verdict: ENABLE — region-hint placement on the api worker (one wrangler key)

Placement is a real, quantified lever — likely the single largest lever on the cold admin read — and it is exactly Cloudflare's documented pattern for our topology (edge frontend + service-bound backend Worker placed next to the database). The change is one config key on `apps/api` only:

```toml
# apps/api/wrangler.toml
[placement]
region = "aws:ap-southeast-1"
```

Do **not** use `mode = "smart"` — it provably cannot relocate this worker to Singapore (see "Why region mode, not smart mode"). Do **not** place `apps/admin` or `apps/landing` — they serve HTML to PH users and must stay at the edge; Cloudflare's own split-pattern keeps "the edge Worker... close to the user" and the backend "close to your database" ([Workers placement docs](https://developers.cloudflare.com/workers/configuration/smart-placement/)).

This resolves to one small ticket (config key + verification), which keeps the M8 lever list inside map #279's "≤2 tickets → post-flight batch" charter condition.

## Evidence

### 1. Where the workers execute today

- All production api traffic is binding-borne: both frontends bind `API` → `sevendays-api` (`apps/landing/wrangler.jsonc:7`, `apps/admin/wrangler.jsonc:7`) and route production fetches through it (ADR-0016; `apps/admin/src/lib/api.server.ts:27-38`, `apps/landing/src/lib/api.server.ts:32`). Nothing dials the api directly in production.
- Service bindings default to co-location: "By default, both Workers run on the same thread of the same Cloudflare server" with "zero overhead or added latency" ([Service bindings docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)). So **the api worker today executes at whichever colo serves the frontend's user** — no placement keys exist anywhere (`apps/api/wrangler.toml` has no `[placement]` block; neither frontend config does).
- Philippines users are served locally: Cloudflare operates Manila PoPs (mnl01/mnl06) plus Cebu City ([Cloudflare global network](https://www.cloudflare.com/network/), [Cebu launch blog](https://blog.cloudflare.com/cebu-city-cloudflare-138th-datacenter/)). Historically PH fell back to Singapore/Hong Kong, and still does during MNL maintenance (re-routing notices on [Cloudflare Status](https://www.cloudflarestatus.com/) through Oct–Nov 2026) or when a PH ISP's peering is suboptimal.
- Net: PH staff requests land at MNL (typical) / CEB / SIN / HKG (fallback), and the api worker runs right there with the frontend.

### 2. What the DB leg costs today (per cold admin read)

Per map #279's key facts: every admin read is a cold path — the api's `requireSession` (1–2 DB queries) then the entity query, over a **fresh postgres client per request** (ADR-0011; `packages/db/src/client.ts:14`, `prepare: false`) dialing the Supavisor transaction pooler (ADR-0007).

A fresh PostgreSQL connection with TLS costs roughly **4–5 round trips before the first query returns**:

| Step | RTTs |
|---|---|
| TCP handshake | 1 |
| SSLRequest / SSLResponse (Postgres negotiates TLS *after* startup begins) | 1 |
| TLS 1.3 handshake | 1 |
| SCRAM-SHA-256 exchange (client-first → server-first → client-final → confirm) | 2 |

Sources: [PostgreSQL SASL/SCRAM protocol docs](https://www.postgresql.org/docs/current/sasl-authentication.html); Postgres-TLS-after-startup behavior (the SSLRequest extra hop) is per the wire protocol; Cloudflare's own serverless-postgres write notes the added PBKDF2 (4096 SHA-256 iterations) CPU cost on every fresh auth. Then add 2–4 more RTTs for the queries themselves (session verify + entity read + counts).

Cross-checking the RTTs against distance (TeleGeography rule of thumb ≈ 10 ms RTT per 1,000 km of fiber):

| Leg | Distance | Real-world RTT |
|---|---|---|
| MNL ↔ SIN | ~2,400 km | ~25–30 ms fiber minimum; **50–90 ms typical internet** (AAG cable data + ISP measurements; degradations have hit 150–180 ms) |
| MNL ↔ HKG | ~1,100 km | ~32 ms (AAG listed RTD) |
| HKG ↔ SIN | ~2,600 km | 30–35 ms premium direct / 50–70 ms typical internet |
| SIN colo ↔ Supabase ap-southeast-1 | intra-metro | **1–6 ms** |

**Today, from MNL:** connect ≈ 4–5 × 50–90 ms ≈ **200–450 ms**, queries ≈ 2–4 × 50–90 ms ≈ **100–360 ms** → the DB-attributable leg of a cold admin read is roughly **300–800 ms**. (From the SIN fallback colo it is near-zero — the honest variance; see Verification.)

### 3. What placement changes

With `[placement] region = "aws:ap-southeast-1"` (GA placement hints, announced [2026-01-22](https://developers.cloudflare.com/changelog/post/2026-01-22-explicit-placement-hints)): "Workers run in the Cloudflare data center with the lowest latency to the specified cloud region" — i.e. the api pins to a SIN-metro colo a few ms from both Supavisor ap-southeast-1 and the pooler front door.

- The binding fetch from the admin (MNL) is forwarded to the placed location: cost ≈ one Cloudflare-backbone round trip MNL↔SIN ≈ **30–70 ms** (the docs' "zero overhead" for bindings applies only to the co-located default; cross-colo forwarding is ordinary backbone routing).
- The api's fresh Supavisor dial becomes intra-metro: connect ≈ 4–5 × 1–6 ms ≈ **5–30 ms**, queries ≈ **5–25 ms**.
- **Net per cold admin read: roughly 150–600 ms saved** for staff landing at MNL/CEB (and HKG); **neutral** for staff already landing at SIN (there the api is effectively local today, and pinning changes nothing that matters).

That is not noise — it is the dominant physical cost of the cold path, and it composes with (does not duplicate) the map's other levers: the session-cache amortization kills 1–2 query RTTs, placement kills the connect + geo RTTs, SWR/staleTime shrinks how often the cold path runs at all.

Placement applies to our transport: it "only affects the execution of fetch event handlers" — and both frontends call `binding.fetch(...)` (fetch handler), not RPC entrypoints, so the forwarded-invocation path is exactly ours ([placement docs](https://developers.cloudflare.com/workers/configuration/smart-placement/)).

### 4. Why region mode, not smart mode

Smart mode ("analyze where the Worker runs fastest and forward") has two mechanics that kill it **for this worker specifically**:

1. "Smart Placement only considers locations where the Worker has previously run. It cannot place your Worker in a location that does not normally receive traffic." The api runs only at colos where landing/admin traffic lands: MNL/CEB for PH visitors, plus wherever teaser/E2E traffic originates (CI runners → US/EU colos). **SIN is not in the candidate set**, so smart mode can at best keep the api at MNL — it cannot reach the DB's metro.
2. It "requires consistent traffic to the Worker from multiple locations" — admin-only volume is a few staff; the analyzer would likely sit at `INSUFFICIENT_INVOCATIONS` forever.

The region hint sidesteps both: it is deterministic, needs no traffic analysis, and pins to the metro we name. Smart mode remains the documented all-plans baseline ("Smart Placement is available on all Workers plans"; the hints are described as "an extension of Smart Placement"); neither the docs nor the changelog states a paid-plan gate for region hints — if a gate surfaced at deploy time it would fail loudly in CI (`wrangler deploy` rejecting the key), which is the one-line fallback check.

### 5. Side effects and risks (named, bounded)

- **ADR-0025/#263 public edge cache warms SIN-only.** The read-through cache lives in the api worker; today it warms per user colo, pinned it warms only at SIN. PH *warm* public reads (60 s TTL) pay the +30–70 ms forwarded hop instead of ~0; PH *cold* public reads save the same ~200–450 ms dial the admin saves. Public/landing reads are explicitly out of M8 scope (#279), but the spec should note the warm-path trade — net still favorable while cold-path savings dominate at teaser volumes.
- **The admin's own direct-DB paths are untouched** (ADR-0023 audit reads / metrics DB probes, the shell's session check): the admin worker stays at the edge, so those keep paying MNL→SIN fresh dials. They are out of M8's main list already (Analytics tuned; Audit Log is owner-only, low traffic). Do not "fix" them by placing the admin — that would add ~50–90 ms to *every* admin page response.
- **Minor wart:** an Oct 2026 community report of `wrangler workers versions list/get` HTTP 500s for Workers deployed with a placement region (deploy/serve unaffected).
- **Dev/test unaffected:** placement is deploy-time routing; `wrangler dev`, vitest, and the loopback suite never see it.

### 6. Verification (fits the "cheap measurement only" ruling — no traces)

- After deploy: the `cf-placement` response header (e.g. `remote-SIN`) on any api response through the admin, and the Workers services API placement status — both documented observability seams for placement.
- Before/after: the existing whole-request `durationMs` in the Application Log already brackets the effect at the read level; adding `request.cf.colo` to the access-log line (one field, PII-free) would also pin down where staff actually land — the one unknown the math depends on. That belongs to the map's baseline-capture ticket, not this verdict.

### 7. Other topology levers — considered and killed

| Lever | Verdict | Evidence |
|---|---|---|
| Supabase read replicas | Dead — Pro plan and up, not free-tier | [Supabase read replicas docs](https://supabase.com/docs/guides/platform/read-replicas) + [usage billing](https://supabase.com/docs/guides/platform/manage-your-usage/read-replicas) |
| Region move of the Supabase project | Anti-lever — no PH region exists; SIN is already the closest Supabase region to the audience, and free-tier region is fixed at project creation | Supabase regions list (17 AWS regions, no Philippines) |
| Supavisor pooler config | Nothing to change — already transaction mode + `prepare: false` (ADR-0007, amended 2026-09-02; explicit transactions verified live) | `docs/adr/0007-database-connection-topology.md` |
| Hyperdrive | Out of scope by standing ruling (parked in #260 after the 2026-11-11 platform-fault revert) | Map #279 Out of scope |
| Sentry traces to measure | Out of scope by CPU-cap ruling; `cf-placement` + `durationMs` cover placement verification cheaply | Map #279 Notes |

## Sources

Primary (Cloudflare): [Workers placement / Smart Placement configuration](https://developers.cloudflare.com/workers/configuration/smart-placement/) · [Service bindings runtime docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) · [Placement hints changelog 2026-01-22](https://developers.cloudflare.com/changelog/post/2026-01-22-explicit-placement-hints) · [Cloudflare global network map](https://www.cloudflare.com/network/) · [Cebu City 138th datacenter blog](https://blog.cloudflare.com/cebu-city-cloudflare-138th-datacenter/). Protocol/latency: [PostgreSQL SASL (SCRAM-SHA-256) docs](https://www.postgresql.org/docs/current/sasl-authentication.html) · [Supabase read replicas](https://supabase.com/docs/guides/platform/read-replicas). Local: ADR-0007/0011/0016/0025, `apps/api/wrangler.toml`, `apps/{admin,landing}/wrangler.jsonc`, `apps/{admin,landing}/src/lib/api.server.ts`, `packages/db/src/client.ts`, map #279 notes.
