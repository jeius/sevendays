# ADR-0018: Two-role staff model — the admin gate stays owner-held

**Status:** Accepted
**Date:** 2026-09-24

## Context

M4 closed with owner-operated provisioning: `create-staff` wraps BetterAuth's CLI and hardcodes `--role admin` (`apps/admin/package.json`), so every provisioned user holds `role=admin`. The same auth instance mounts BetterAuth's `admin()` plugin (`apps/admin/src/lib/auth.ts`), which ships a complete user-management HTTP surface under `/api/auth/admin/*` — create and list users, set roles, ban, revoke sessions, impersonate — and gates it to `role=admin` holders. With a single (owner) account that exposure is harmless; the first real staff member provisioned as-is would hold all of it from first sign-in, no dashboard UI required.

The roadmap adds dashboard user management — the owner creates staff in the admin UI — as its own milestone after the CMS milestone ("M5.5", spec pending). This ADR pins the role model now, so M5 planning and any interim provisioning agree with it, and so the M4-era glossary note ("carries a role (admin) for future gates") stops pointing at a one-role future.

## Decision

1. **Two domain roles.** `owner` — the super admin, exactly one holder (the studio owner); wields all user management. `staff` — admin-dashboard users for content work; never holds user-management power.
2. **BetterAuth mapping.** The plugin's privileged role string stays `admin` — that literal is the gate. Mapping: owner → `role=admin`; staff → `role=staff` (an ordinary string the plugin does not treat as admin). Do not hand `admin` to staff, and do not rename the gate value.
3. **Power boundary.** The admin-plugin surface is owner-only, enforced by the plugin's own role gate. The M5.5 users page calls it server-side over the per-request instance (ADR-0011) behind a role gate; every other admin surface stays session-gated (the M4 shell gate) and is shared by all staff.
4. **Interim rule (effective now, until M5.5 ships).** Provision anyone other than the owner with a trailing `--role staff` on `create-staff` — spike-verified 2026-09-24: the trailing flag overrides the script's hardcoded `--role admin`, and the CLI accepts the arbitrary string (created a `role=staff` row, verified in the database, then deleted it).

## Alternatives Considered

- **One role (everyone `admin`)** — rejected: least-privilege violated by default; the first hire gains user management, impersonation, and session revocation with zero code changes.
- **Rename the privileged role to `owner`** — rejected: the plugin gates on the literal `admin`; renaming means fighting its authorization semantics for naming taste. The domain vocabulary (owner/staff) lives in docs and eventually UI; the gate string stays `admin`.
- **Full permission matrix now** — deferred: two roles cover every known need through M5.5; the plugin's permission system is there when a real third capability split appears.

## Consequences

- `create-staff`'s script default (`--role admin`) is wrong for staff until M5.5 flips it; the runbook carries the interim `--role staff` rule, and provisioning should verify the created row's role — nothing validates the vocabulary at write time.
- The M4 glossary's "role (admin)" forward note is superseded by this mapping (updated in the same commit).
- Still open for the M5.5 spec: users-page capability scope (create, reset, deactivate, session audit), the invite flow (temporary password via the email provider vs owner handoff), and whether content surfaces ever need a finer gate than "signed in".
- Both editions run the same auth surfaces, so this model is shared content; the docs hunks here are written edition-free for the picks flow.

---
