# ADR-0024: Hyperdrive connection caching (BURNED)

**Status:** Burned — reverted 2026-11-12 (#261/#262)
**Date:** 2026-11-11 (burned 2026-11-12)

## What happened

Hyperdrive was deployed against the live Supabase project
and FAILED: Cloudflare→Supabase stalls (P0, 2026-11-11).
Reverted the same day; the worker was restored by hand.

This document is a tombstone — the decision text was never
merged (the branch was squash-reverted). The number 0024 is
NOT reused; ADR-0025 took the next seat.

## Where things stand

- The re-land recipe is preserved in issue #260's resolution
  comment and stays PARKED by standing ruling.
- Placement (ADR-0026) is the topology lever that shipped.
- A future Hyperdrive attempt composes UNDER the read cache
  (ADR-0025) at the SIN execution site.
