# M6 Ticket 06 — The Audit Log Viewer Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **The UI-bearing tasks (4, 5) load the installed UI/UX skill set at execution time: `prototype` + `ui-ux-pro-max`, plus `design-system` / `ui-styling` as relevant (AGENTS.md rule, spec #94 amendment, ruled in #111) — Task 4 is the owner-reacted rendered-variants gate the ticket names.**

**Goal:** The Audit Log's owner-only viewer (§ The Audit Log — Viewer of the M6 spec) becomes executable code: a filterable (entity, actor, action, UTC date range), newest-first, paginated table at `/audit-log` reading the `audit_log` rows #185's write side records — no joins anywhere (the snapshotted `actorEmail` + inline `summary` are the whole row) — via session+role-gated admin server functions over `packages/db` (ADR-0023's data path; zero api files), with the "Audit Log" nav entry in the Overview group beside Analytics visible to the owner role alone (ADR-0018: `role === 'admin'`). The M6 roadmap box at `docs/plan.md:150` — left unticked by #185 with the words "the box stays unticked until the owner screen lands at #188" — **is ticked by this ticket**.

**Architecture:** Six tasks: (1) the pure filter/pagination seam `apps/admin/src/lib/audit/filters.ts` — tolerant search-param schema (invalid values drop, never throw), UTC day-window math, page-window math, the entity/action label maps, the wire→row parse through `@sevendays/types`' landed `auditLogRowSchema` ("the #188 viewer parses rows through it" — its own doc comment); (2) the read module `packages/db/src/audit-read.ts` (the #186 probes precedent — drizzle's typed builder lives in `packages/db` because `apps/admin` deliberately carries no `drizzle-orm` dependency) + the two owner-gated server fns + the query factories; (3) the owner role through the shell — the nav taxonomy extracted to a testable `src/lib/nav.ts` with `visibleNavGroups(role)`, the sidebar consuming it, the shell context carrying `role`; (4) the rendered-variants checkpoint — an ungated prototype route over mock rows, screenshots, the owner's ratification on #188; (5) the real route + screen in the ratified composition (search-param filters, keepPreviousData pagination, curated failure + empty states); (6) gates + docs rotation (box TICKED) + PR/merge + the v1 pick (the spec's class ledger pre-rules the payload **PICK clean** — "The client's operating record from day 1; both editions by construction"; the nav wrinkle from #197's ruled v1 divergence is pre-ruled below) + ledger row + issue close.

**Tech Stack:** everything is already installed — **zero new dependencies, zero manifest changes** (the drizzle reads ride `packages/db`'s existing `drizzle-orm` 0.45.2; `Table`/`Select`/`Badge`/`Button`/`Input` from `packages/ui`; `PageHeader` from the CMS shared library; `formatUtc` from the dashboard's deterministic formatters). TanStack Start server functions behind a session+role gate (ADR-0023 + ADR-0018), TanStack Query v5 `queryOptions` + `keepPreviousData` (grep-proven: re-exported from `@tanstack/query-core` 5.102.8 via `export * from "@tanstack/query-core"`), zod 4.5.1, BetterAuth 1.7.5's `admin()` plugin (the session user's `role` field — typecheck-spike-proven 2026-10-10 through our own `createAuth`), vitest 4 plain-node (the admin lib-seam pattern), pnpm + Turborepo, `gh` CLI, `@playwright/test` 1.63.0 as the Task 4 screenshot driver only.

**Spec:** Implements ticket [#188 "M6 ticket 06: the Audit Log viewer screen"](https://github.com/jeius/sevendays/issues/188) (label `ready-for-agent`; blocked by #185 — **landed 2026-10-06**), whose parent is the M6 spec `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (issue #182 — § The Audit Log's **Viewer** bullet is this ticket's ruling: "a dedicated owner-scoped screen in the admin CMS, named 'Audit Log' — a filterable table (entity, actor, action, date), newest first, paginated. Nav entry 'Audit Log' in the Overview group beside Analytics, owner-role-only visibility; composition variants at execution (#94/#111). It never joins the all-staff Analytics Dashboard — person-level by the standing rule"; § v1-pick classes pre-rules the payload **PICK clean**; ADR-0023 rules the data path; ADR-0018 rules the role vocabulary). Key recon facts (2026-10-10, main `a079242`; admin suite re-run live this session: **14 files / 140 tests** — AGENTS.md's "13 files / 132 tests" is stale, superseded by #201–#203's follow-ups; this ticket's close-out corrects it):

- **The record it reads (#185, landed):** `packages/db/src/schema/audit-log.ts` — `audit_log` (`id` uuid PK, `occurredAt` timestamptz, `actorId`/`actorEmail`/`entity`/`action` text, `entityId`/`summary` text nullable, `requestId` text; one `occurred_at` index; no FKs; unbounded retention; born-empty on migrations, populated live since 2026-10-06 by every committed CMS write). The vocabulary is canonical in `packages/types/src/audit.ts`: `auditEntitySchema` = the nine router segments (`branch`, `print-size`, `gallery-photo`, `attire`, `addon-service`, `studio-service`, `service-package`, `gallery-category`, `testimonial`), `auditActionSchema` = `create | update | deactivate | reorder`, `auditLogRowSchema` with `occurredAt: z.coerce.date()` (ISO strings coerce back to Dates client-side — the designed RPC-boundary round trip). **The media commit records as `gallery-photo`/`create`** (its row rides the gallery-photo persist) — the nine-entity enum is complete; no tenth filter value exists.
- **The role law (ADR-0018):** owner → `role = 'admin'` (BetterAuth's admin-plugin gate literal — do not rename), staff → `role = 'staff'`, and the column is **nullable** (`role: text('role')`) — null fails the owner check. The admin's auth instance mounts `admin()` (`apps/admin/src/lib/auth.ts`), and the plugin's user model carries `role: string` (`better-auth/dist/plugins/admin/admin.d.mts:42`) — **spike-proven 2026-10-10**: a throwaway file reading `session?.user.role` through our own `createAuth(...)` passed `pnpm --filter @sevendays/admin typecheck` clean, then was deleted (`git status` clean of it).
- **The data path (ADR-0023, the #186/#187 seam precedent):** `apps/admin/src/lib/metrics/metrics.functions.ts` — server fns gate themselves (`requireMetricsSession` throwing `Unauthorized`), construct `createDbClient(env.dbUrl)` **per call** (ADR-0011), resolve plain-object unions `{ ok: true, data } | { ok: false, reason: 'not-configured' | 'unavailable' }` (the #155 class-erasure law), map source failures to `unavailable` with ONE log-only `console.error` line, wrap in `startSpan`. **`apps/admin` has NO `drizzle-orm` dependency** — #186 ruled the workaround ("static SQL over a structural exec seam so no drizzle type reaches apps/admin", `packages/db/src/probes.ts`); for this ticket's *dynamic* filtered reads, the whole drizzle query lives in `packages/db` (which owns `drizzle-orm` 0.45.2) as a new `audit-read` module — the admin imports only `@sevendays/db`, zero manifest changes.
- **The nav + shell:** `apps/admin/src/routes/_shell.tsx`'s beforeLoad gates on `getSession()` and returns `{ user: { name, email } }` into route context — this ticket adds `role`. `apps/admin/src/components/admin-sidebar.tsx` holds the nav taxonomy inline (`navGroups`, the #59 ruling: Overview = Analytics + Appointments, Catalog, Studio) — Task 3 extracts it to `src/lib/nav.ts` so the owner-visibility law is lib-seam testable. Icons: `ScrollText` (grep-proven present in the installed lucide-react's `dist/esm/icons/scroll-text.*`).
- **The screen vocabulary:** `PageHeader` from `#/components/cms/shared` (title + subline + actions row); `formatUtc(iso)` from `#/components/dashboard/format.ts` (deterministic `YYYY-MM-DD HH:mm` UTC slice — SSR/hydration-stable, no locale Intl); search params via `validateSearch: <zod schema>` directly (the `_shell.index.tsx` precedent — TanStack accepts the standard-schema form); search-param navigation via `search={{ ... }}` (the `WindowToggle` precedent). **v1 nav wrinkle:** #197's ruled v1 divergence re-added Overview with Analytics only and **no Appointments** (#169's simplified nav) — Task 6's pick pre-rules the resolution (v1's `lib/nav.ts` = main's minus the Appointments item; the sidebar hunk resolves to main's consumption shape).
- **Sibling fences (spec § Sequencing; docs/plan.md M6 block):** this ticket owns the Audit Log **viewer screen** and TICKS the M6 audit box. NOT here, regardless of temptation: **any `apps/api` file at all** (the write side is landed #185; reads are admin-side per ADR-0023 — zero api changes in this PR, the #186/#187 precedent); `packages/db` **schema or migrations** (`audit-read.ts` is a read module over the existing table — `db:generate` never runs); `packages/types` (the row schema is landed; the wire type is admin-internal); `packages/ui` (nothing moves — the screen composes existing primitives); the dashboard routes/widgets (`_shell.index.tsx` untouched); the appointments stub (`_shell.appointments.tsx`); `apps/admin/CONTEXT.md` (the Audit Log glossary term already landed with #185); any ADR (ADR-0023 + ADR-0018 rule the path and the roles); M5.5 user management; CSV export or retention pruning (the spec rules both v2-if-ever); the production smoke (#190); the ship runbook (#191); the M6 close (#192).
- **Baselines (live, 2026-10-10):** `apps/admin` = **14 files / 140 tests** (re-run this session). Per the ledger's #198/#203 rows: api 27 files + 1 skipped / 338 passed + 3 skipped, api-client 5 files / 33 tests, landing 6 files / 26 tests (v1 floors; main's landing floor may sit higher — only the admin suite changes here), types 14 files / 118 tests, `pnpm check` 35/35 turbo tasks. After this ticket: **admin 17 files / 164 tests** (three new lib-seam files: +16 filters, +4 queries, +4 nav — executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions). **Working-tree note:** the checkout carries one uncommitted local change — `apps/admin/package.json`'s dev script port `3000` → `3001` (the owner's bring-up convenience from the #187 thread). Leave it untouched: never stage it, never commit it; Task 4 reads the live port from the script mechanically (pinned command below).

## Global Constraints

- **Branch & baseline:** `feat/188-audit-log-viewer` off main `a079242` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#188)` squash style; every commit below is pinned verbatim. Evidence (test output, variant screenshots) lands in gitignored `.superpowers/sdd/2026-10-10-188-audit-log-viewer-screen/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes exist in this ticket — `pnpm-lock.yaml` is untouched and `pnpm install` never needs to run** (the drizzle reads ride packages/db's existing dep; the UI composes existing primitives). Every task commits only with `pnpm check` green for the packages it touched (`docker compose up -d db` first — the api suite runs in `pnpm check` and needs the test db; the admin's new tests are plain-node and db-free). **After any `packages/db/src` edit, run `pnpm build:packages` before admin typecheck/tests** (the admin resolves `@sevendays/db` from gitignored `dist/`; turbo's `typecheck` builds `^` but `test` does not — the explicit build closes the gap). Biome canonical form via `pnpm --filter @sevendays/admin fix` / `--filter @sevendays/db fix` before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **The role law (ADR-0018, binding):** the owner is `role === 'admin'` — the BetterAuth admin-plugin's literal, never renamed; `'staff'` and `null`/`undefined` both fail. Three layers, all required: (a) the **server fns** gate on session AND role (the metrics seam's `Unauthorized` throw + the role check — server fns are directly callable, so they gate themselves); (b) the **route's** beforeLoad re-checks the role off the shell context and redirects a non-owner to `/` (the nav's hidden entry is not the gate); (c) the **nav** renders the Audit Log item only through `visibleNavGroups(role)`.
- **The data path (ADR-0023 + ticket, binding):** reads are admin server functions over `packages/db` — **zero `apps/api` files, zero api routes**. The dynamic drizzle query lives in `packages/db/src/audit-read.ts` (the #186 probes precedent — no drizzle import ever appears in `apps/admin`); the admin constructs `createDbClient(process.env.DATABASE_URL)` **per call** (ADR-0011 — never module scope). Ordering inside each fn: read `dbUrl` first (null → the `not-configured` union return — no db means no auth either, one curated state for both); then the session+role gate (`Unauthorized` throw — the only throw a fn permits); then the read inside try/catch → `unavailable` with ONE log-only `console.error` line (the #155 leak-safe law: loud detail never in the payload, never in the UI). A `startSpan` wraps each handler (the server-fn house rule, no-op without a DSN).
- **The result union + never-500 law (binding, the #186/#187 shape):** `AuditResult<T> = { ok: true; data: T } | { ok: false, reason: 'not-configured' | 'unavailable' }`. The screen renders for any owner session regardless of source health; a thrown query error (including `Unauthorized`) maps to the same curated `unavailable` line; nothing bubbles to a route error boundary.
- **The wire contract (binding):** the server fns return rows as plain objects with `occurredAt` an **ISO string** (Dates do not survive the RPC boundary; `z.coerce.date()` restores them). The client parses through `@sevendays/types`' `auditLogRowSchema` — the parse is the boundary guard and is **loud** (a malformed row throws → the query's error state, never a silently dropped entry).
- **The query contract (binding):** newest-first is `occurredAt DESC, id DESC` (the `id` tiebreaker gives rows written in one transaction a stable order — `occurredAt` alone ties). Page size is **20, fixed** (no user control). Filters are URL search params (shareable, SSR-stable — the WindowToggle precedent): `page`, `entity`, `action`, `actor` (an exact `actorEmail` match), `from`/`to` (`YYYY-MM-DD`). **Date windows are UTC day boundaries by design** (the display clock is UTC via `formatUtc` — window matches display): `from` → that day's `00:00:00.000Z` inclusive; `to` → the **next** day's `00:00:00.000Z` exclusive (an inclusive day); `from` after `to` yields an **empty window** (0 rows), not an error. **Every filter change resets `page` to 1.** A stale `?page=` beyond the end self-heals: the response carries the clamped page and the screen replace-navigates to it. staleTime 30s (page) / 5m (actors — a studio's staff list barely moves), `refetchOnWindowFocus: true` stated explicitly, `placeholderData: keepPreviousData` on the page query (page flips keep the table painted). No server-side cache, no polling.
- **Copy pins (owner-ratifiable at Task 4, pinned here as the working defaults):** page title `Audit Log`; subline `Who changed what, when — every CMS write, newest first.`; tab title `Audit Log | Sevendays Admin`; nav label `Audit Log` (Overview, directly after Analytics); table headers `When (UTC)` / `Actor` / `Action` / `Entity` / `Summary`; the `All` filter option; filter labels `Entity` / `Action` / `Actor` / `From` / `To`; `Clear filters`; footer `Page {X} of {Y} · {N} entries`; pagination `Previous` / `Next`; curated lines `Audit Log source not configured.` and `Audit Log source unavailable.`; empty lines `No audit rows yet — they start with the first CMS write.` (unfiltered) and `No audit rows match these filters.` (filtered); loading line `Loading audit rows…`. Entity labels: `Branches`, `Print sizes`, `Gallery photos`, `Attires`, `Add-ons`, `Studio services`, `Packages`, `Gallery categories`, `Testimonials`. Action labels: `Create`, `Update`, `Deactivate`, `Reorder`. The row's `title` attribute carries `requestId` (the Application Log correlation affordance — hover reveals it, no column). The null-summary cell renders a muted `—`.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–5 edit only: `apps/admin/src/lib/audit/filters.ts` + `filters.test.ts` + `queries.ts` + `queries.test.ts` + `audit.functions.ts` (create all five), `packages/db/src/audit-read.ts` + `packages/db/src/index.ts` (create + one export line), `apps/admin/src/lib/nav.ts` + `nav.test.ts` (create both), `apps/admin/src/components/admin-sidebar.tsx` + `apps/admin/src/routes/_shell.tsx` (modify), `apps/admin/src/components/audit/audit-log-screen.tsx` (create), `apps/admin/src/routes/_shell.audit-log.tsx` (create), `apps/admin/src/routeTree.gen.ts` (regen, Task 5's commit). Task 4 additionally creates then DELETES `apps/admin/src/routes/prototype-audit.tsx` (untracked throughout — never committed). Task 6 rotates `docs/plan.md` (the M6 audit box — **TICKED**), `docs/progress.md`, `AGENTS.md`, and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: everything in the header's sibling-fences bullet, and `apps/admin/package.json` (the owner's uncommitted port change rides above the branch — never staged).

## File Structure

```text
packages/db/
  src/audit-read.ts                              # create (Task 2) — the filtered, paginated reads over audit_log (drizzle lives here)
  src/index.ts                                   # modify (Task 2) — one export line
apps/admin/
  src/lib/audit/
    filters.ts                                   # create (Task 1) — search schema, UTC windows, page math, labels, wire parse
    filters.test.ts                              # create (Task 1) — 16 lib-seam tests
    audit.functions.ts                           # create (Task 2) — the two owner-gated server fns
    queries.ts                                   # create (Task 2) — the query factories (keepPreviousData page query)
    queries.test.ts                              # create (Task 2) — 4 options-object tests
  src/lib/nav.ts                                 # create (Task 3) — the taxonomy + visibleNavGroups(role)
  src/lib/nav.test.ts                            # create (Task 3) — 4 owner-visibility tests
  src/components/admin-sidebar.tsx               # modify (Task 3) — consumes visibleNavGroups; role joins the user prop
  src/routes/_shell.tsx                          # modify (Task 3) — the context's user gains role
  src/routes/prototype-audit.tsx                 # temporary (Task 4 — untracked, deleted pre-PR)
  src/components/audit/audit-log-screen.tsx      # create (Task 5) — the ratified composition
  src/routes/_shell.audit-log.tsx                # create (Task 5) — the owner-gated route
  src/routeTree.gen.ts                           # regen (Task 5's commit — generate-routes)
docs/plan.md docs/progress.md AGENTS.md docs/agents/v1-picks.md   # Task 6
```

---

### Task 1: `apps/admin` — the pure filter/pagination seam (TDD)

**Files:**
- Create (test-first): `apps/admin/src/lib/audit/filters.test.ts`
- Create: `apps/admin/src/lib/audit/filters.ts`

**Interfaces:**
- Consumes: `@sevendays/types`' `auditEntitySchema`, `auditActionSchema`, `auditLogRowSchema`, `AuditEntity`, `AuditAction`, `AuditLogRow` (all landed at #185 — nothing is added to packages/types).
- Produces (what Tasks 2–5 consume): `AUDIT_PAGE_SIZE` (20), `auditLogSearchSchema`, `AuditLogSearch`, `auditDateWindow(search) → { start: string | null; endExclusive: string | null }`, `pageWindow(total, page) → { page, totalPages, offset, hasPrev, hasNext }`, `AUDIT_ENTITY_LABELS`, `AUDIT_ACTION_LABELS`, `hasActiveFilters(search) → boolean`, `AuditWireRow`, `parseAuditWireRows(rows: unknown) → AuditLogRow[]` — full shapes fenced below.

**Not here:** any DB access (Task 2); server fns or factories (Task 2); nav/role logic (Task 3 — the role law lives in the fns and the route, never in this seam); any UI (Tasks 4–5).

- [ ] **Step 1: Write the failing tests — `apps/admin/src/lib/audit/filters.test.ts`**

```ts
// The Audit Log viewer's pure-seam contract (#188): tolerant search-param
// parsing (invalid values drop — a stale shared URL never 500s a visit),
// UTC day windows, page math, the label maps, and the wire→row parse
// through the landed auditLogRowSchema. Plain-node, no DOM (the admin
// lib-seam pattern).
import { auditActionSchema, auditEntitySchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_PAGE_SIZE,
  auditDateWindow,
  auditLogSearchSchema,
  hasActiveFilters,
  pageWindow,
  parseAuditWireRows,
} from './filters';

describe('auditLogSearchSchema (tolerant parse — invalid drops, never throws)', () => {
  it('an empty search parses to the defaults (page 1, no filters)', () => {
    expect(auditLogSearchSchema.parse({})).toEqual({
      page: 1,
      entity: undefined,
      action: undefined,
      actor: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it('page coerces from the URL string form and rejects garbage to 1', () => {
    expect(auditLogSearchSchema.parse({ page: '3' }).page).toBe(3);
    expect(auditLogSearchSchema.parse({ page: 'abc' }).page).toBe(1);
    expect(auditLogSearchSchema.parse({ page: '0' }).page).toBe(1);
    expect(auditLogSearchSchema.parse({ page: '-2' }).page).toBe(1);
  });

  it('a valid entity and action parse; unknown values drop to undefined (stale URLs survive)', () => {
    const parsed = auditLogSearchSchema.parse({
      entity: 'service-package',
      action: 'deactivate',
    });
    expect(parsed.entity).toBe('service-package');
    expect(parsed.action).toBe('deactivate');
    // Assert on the PARSED OUTPUT (z.object strips/rejects silently) — an
    // unknown enum value is absent, and the rest of the search survives.
    const dropped = auditLogSearchSchema.parse({
      entity: 'not-an-entity',
      action: 'delete',
      actor: 'owner@studio.test',
    });
    expect(dropped.entity).toBeUndefined();
    expect(dropped.action).toBeUndefined();
    expect(dropped.actor).toBe('owner@studio.test');
  });

  it('a malformed date drops to undefined; a well-formed one survives', () => {
    expect(auditLogSearchSchema.parse({ from: '2026-13-99' }).from).toBeUndefined();
    expect(auditLogSearchSchema.parse({ from: '10/06/2026' }).from).toBeUndefined();
    expect(auditLogSearchSchema.parse({ from: '2026-10-06' }).from).toBe('2026-10-06');
  });
});

describe('auditDateWindow (UTC day boundaries — the display clock is UTC)', () => {
  it('from/to bracket their days — to is inclusive-day, exclusive-instant', () => {
    expect(auditDateWindow({ page: 1, from: '2026-10-01', to: '2026-10-06' })).toEqual({
      start: '2026-10-01T00:00:00.000Z',
      endExclusive: '2026-10-07T00:00:00.000Z',
    });
  });

  it('month and year rollovers compute the next day correctly', () => {
    expect(auditDateWindow({ page: 1, to: '2026-10-31' }).endExclusive).toBe(
      '2026-11-01T00:00:00.000Z'
    );
    expect(auditDateWindow({ page: 1, to: '2026-12-31' }).endExclusive).toBe(
      '2027-01-01T00:00:00.000Z'
    );
  });

  it('either side alone yields a half-open window', () => {
    expect(auditDateWindow({ page: 1, from: '2026-10-01' })).toEqual({
      start: '2026-10-01T00:00:00.000Z',
      endExclusive: null,
    });
    expect(auditDateWindow({ page: 1, to: '2026-10-06' })).toEqual({
      start: null,
      endExclusive: '2026-10-07T00:00:00.000Z',
    });
  });

  it('from after to yields an empty window, not an error', () => {
    const window = auditDateWindow({ page: 1, from: '2026-10-08', to: '2026-10-06' });
    expect(
      window.start !== null && window.endExclusive !== null && window.start > window.endExclusive
    ).toBe(true);
  });

  it('a calendar-invalid day (regex-valid, NaN-parsing) drops its side to null', () => {
    expect(auditDateWindow({ page: 1, from: '2026-02-31' }).start).toBeNull();
    expect(auditDateWindow({ page: 1, to: '2026-02-31' }).endExclusive).toBeNull();
  });
});

describe('pageWindow', () => {
  it('an empty log is page 1 of 1 with no offset', () => {
    expect(pageWindow(0, 1)).toEqual({
      page: 1,
      totalPages: 1,
      offset: 0,
      hasPrev: false,
      hasNext: false,
    });
  });

  it('45 rows are three pages; page 2 sits at offset 20 with both neighbors', () => {
    expect(pageWindow(45, 2)).toEqual({
      page: 2,
      totalPages: 3,
      offset: AUDIT_PAGE_SIZE,
      hasPrev: true,
      hasNext: true,
    });
    expect(pageWindow(20, 1).totalPages).toBe(1);
    expect(pageWindow(21, 1).totalPages).toBe(2);
  });

  it('a stale page beyond the end clamps to the last real page', () => {
    expect(pageWindow(45, 99)).toEqual({
      page: 3,
      totalPages: 3,
      offset: 40,
      hasPrev: true,
      hasNext: false,
    });
  });
});

describe('the label maps + parseAuditWireRows', () => {
  it('every entity and action enum value is labeled', () => {
    expect(Object.keys(AUDIT_ENTITY_LABELS).sort()).toEqual(
      [...auditEntitySchema.options].sort()
    );
    expect(Object.keys(AUDIT_ACTION_LABELS).sort()).toEqual(
      [...auditActionSchema.options].sort()
    );
  });

  it('parseAuditWireRows coerces ISO strings to Dates and strips unknown keys', () => {
    const rows = parseAuditWireRows([
      {
        id: '0d6ee72a-1b1c-4c0e-8c9f-3a1f2f0f9b11',
        occurredAt: '2026-10-06T09:05:17.721Z',
        actorId: 'actor-1',
        actorEmail: 'owner@studio.test',
        entity: 'branch',
        entityId: '7e0e4c3a-9a4b-4d8e-a2b1-6f5c4d3e2f10',
        action: 'update',
        summary: 'Makati',
        requestId: 'req_abc123',
        injectedKey: 'must-not-survive',
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.occurredAt).toBeInstanceOf(Date);
    expect(rows[0]?.occurredAt.toISOString()).toBe('2026-10-06T09:05:17.721Z');
    expect(Object.hasOwn(rows[0] as object, 'injectedKey')).toBe(false);
  });

  it('parseAuditWireRows throws on a malformed row (loud, never silent)', () => {
    expect(() =>
      parseAuditWireRows([{ id: 'not-a-uuid', occurredAt: 'nope' }])
    ).toThrow();
  });
});

describe('hasActiveFilters', () => {
  it('defaults are inactive; each filter alone is active', () => {
    expect(hasActiveFilters(auditLogSearchSchema.parse({}))).toBe(false);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ entity: 'branch' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ action: 'create' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ actor: 'owner@studio.test' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ from: '2026-10-01' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ to: '2026-10-06' }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/audit/filters.test.ts` — fails on the missing module `./filters`. Record the red in the evidence dir.

- [ ] **Step 3: Write `apps/admin/src/lib/audit/filters.ts`**

```ts
// The Audit Log viewer's pure seam (#188, spec § The Audit Log — Viewer):
// search-param normalization, UTC day windows, page math, the label maps,
// and the wire→row parse — every fn pure so the lib-seam suite pins the
// filter/pagination semantics the screen rides. The role law (ADR-0018)
// lives in the server fns and the route, never here. Rows parse through
// the landed auditLogRowSchema ("the #188 viewer parses rows through it").
import {
  auditActionSchema,
  auditEntitySchema,
  auditLogRowSchema,
  type AuditAction,
  type AuditEntity,
  type AuditLogRow,
} from '@sevendays/types';
import { z } from 'zod';

export const AUDIT_PAGE_SIZE = 20;

const DAY_MS = 86_400_000;

// Search params arrive as strings and may be stale or hand-edited: every
// field is tolerant — an invalid value drops to its default (the metrics
// env reader's posture), never a thrown validation. z.object semantics do
// the entity/action narrowing; .catch() is the drop.
const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .refine(isCalendarDay, 'not a calendar day')
  .optional()
  .catch(undefined);

export const auditLogSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  entity: auditEntitySchema.optional().catch(undefined),
  action: auditActionSchema.optional().catch(undefined),
  actor: z.string().min(1).optional().catch(undefined),
  from: dateParam,
  to: dateParam,
});

export type AuditLogSearch = z.infer<typeof auditLogSearchSchema>;

// A regex-valid but calendar-invalid day is not a day: 2026-13-99 passes
// the \d{2} slots and 2026-02-31 ROLLS OVER to March in V8 instead of
// parsing NaN (controller-probed live 2026-10-10) — the round-trip check
// catches both, dropping the side to null (a half-open window, the
// tolerant posture of every field here).
function isCalendarDay(day: string): boolean {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

function dayStartUtc(day: string): Date | null {
  return isCalendarDay(day) ? new Date(`${day}T00:00:00.000Z`) : null;
}

// UTC day boundaries by design (occurredAt is timestamptz and the screen
// displays UTC via formatUtc — the window matches the display): from →
// that day's 00:00Z inclusive; to → the NEXT day's 00:00Z exclusive (an
// inclusive day). from after to leaves start > end — an empty window
// (0 rows), not an error.
export function auditDateWindow(search: AuditLogSearch): {
  start: string | null;
  endExclusive: string | null;
} {
  const from = search.from === undefined ? null : dayStartUtc(search.from);
  const to = search.to === undefined ? null : dayStartUtc(search.to);
  return {
    start: from === null ? null : from.toISOString(),
    endExclusive: to === null ? null : new Date(to.getTime() + DAY_MS).toISOString(),
  };
}

// Page math over the filtered total: totalPages never below 1 (an empty
// log is page 1 of 1), page clamps into range (a stale ?page=99 after a
// filter narrows resolves to the last real page), offset is the SQL skip.
export function pageWindow(total: number, page: number): {
  page: number;
  totalPages: number;
  offset: number;
  hasPrev: boolean;
  hasNext: boolean;
} {
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), totalPages);
  return {
    page: clamped,
    totalPages,
    offset: (clamped - 1) * AUDIT_PAGE_SIZE,
    hasPrev: clamped > 1,
    hasNext: clamped < totalPages,
  };
}

// Filter-option and cell copy — the nine entity families and four
// actions, human-labeled once (owner-ratifiable at the variants step).
export const AUDIT_ENTITY_LABELS: Record<AuditEntity, string> = {
  branch: 'Branches',
  'print-size': 'Print sizes',
  'gallery-photo': 'Gallery photos',
  attire: 'Attires',
  'addon-service': 'Add-ons',
  'studio-service': 'Studio services',
  'service-package': 'Packages',
  'gallery-category': 'Gallery categories',
  testimonial: 'Testimonials',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Create',
  update: 'Update',
  deactivate: 'Deactivate',
  reorder: 'Reorder',
};

export function hasActiveFilters(search: AuditLogSearch): boolean {
  return (
    search.entity !== undefined ||
    search.action !== undefined ||
    search.actor !== undefined ||
    search.from !== undefined ||
    search.to !== undefined
  );
}

// What the server fns serialize: occurredAt an ISO string (Dates do not
// survive the RPC boundary; the schema's coerce.date() restores them).
export type AuditWireRow = Omit<AuditLogRow, 'occurredAt'> & { occurredAt: string };

// The RPC boundary guard: parses wire rows back through the landed
// auditLogRowSchema. A malformed row is a server bug — the throw surfaces
// as the query's error state, never a silently dropped entry.
export function parseAuditWireRows(rows: unknown): AuditLogRow[] {
  return auditLogRowSchema.array().parse(rows);
}
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run src/lib/audit/filters.test.ts` (16 tests green), then `pnpm --filter @sevendays/admin fix`, then `pnpm --filter @sevendays/admin test` (the whole suite stays green: **15 files / 156 tests** — the other suites untouched), then `pnpm --filter @sevendays/admin typecheck`. Commit:

```bash
git add apps/admin/src/lib/audit/filters.ts apps/admin/src/lib/audit/filters.test.ts
git commit -m "feat(admin): the Audit Log viewer's pure filter/pagination seam (#188)"
```

### Task 2: `packages/db` + `apps/admin` — the read module, the owner-gated server fns, the query factories (TDD)

**Files:**
- Create: `packages/db/src/audit-read.ts`
- Modify: `packages/db/src/index.ts` (one export line)
- Create (test-first): `apps/admin/src/lib/audit/queries.test.ts`
- Create: `apps/admin/src/lib/audit/audit.functions.ts`, `apps/admin/src/lib/audit/queries.ts`

**Interfaces:**
- Consumes: Task 1's `auditLogSearchSchema`, `AUDIT_PAGE_SIZE`, `auditDateWindow`, `pageWindow`, `parseAuditWireRows`, `AuditWireRow`, `AuditLogSearch`; `@sevendays/db`'s `createDbClient`, `Database` (re-exported type), the `auditLog` table (re-exported through `client.ts`'s `export * from './schema/index.js'`).
- Produces (what Tasks 4–5 consume): from `@sevendays/db`: `AuditLogQueryParams`, `AuditLogRowData`, `runAuditLogPage(db, params) → Promise<{ rows: AuditLogRowData[]; total: number }>`, `runAuditActors(db) → Promise<string[]>`; from `#/lib/audit/audit.functions`: `AuditResult<T>`, `fetchAuditLogPage` (validator `auditLogSearchSchema`), `fetchAuditActors`; from `#/lib/audit/queries`: `AuditLogPage`, `auditQueries.page(search)`, `auditQueries.actors()` — full shapes fenced below.

**Not here:** any schema/migration change (`db:generate` never runs — the table is #185's, landed); any `apps/api` file; the nav/role plumbing (Task 3); any UI (Tasks 4–5); any db-backed test (the read module is thin over drizzle exactly as `probes.ts` is — untested-at-DB by house precedent; the pure seams carry the coverage).

- [ ] **Step 1: Write `packages/db/src/audit-read.ts`**

The reads live in `packages/db` because `apps/admin` deliberately carries no `drizzle-orm` dependency (#186's ruling — "no drizzle type reaches apps/admin"; the probes precedent). The typed query builder binds every filter value safely — never string interpolation. Full file:

```ts
// The Audit Log viewer's read module (#188, ADR-0023 — the #186 probes
// precedent extended to dynamic queries): the filtered, newest-first,
// paginated reads over audit_log. This module exists because apps/admin
// owns no drizzle-orm dependency by ruling — the typed builder (and its
// safe parameter binding) lives here, beside the schema it reads; the
// admin passes the per-request client and structural params only. No
// joins anywhere: the row is self-describing by design (actorEmail
// snapshotted at write, summary inline — #185). Ordering is occurredAt
// DESC with id DESC as the tiebreaker (rows sharing a timestamp — e.g.
// written in one transaction — keep a stable order). The row's
// occurredAt field carries an ISO STRING (not a Date): the result
// crosses an RPC boundary where Dates do not survive, and the viewer's
// landed auditLogRowSchema coerces the string back — one shape, the
// AuditWireRow convention, no mapping anywhere.
import { and, asc, count, desc, eq, gte, lt, type SQL } from 'drizzle-orm';

import { type Database, auditLog } from './client.js';

export type AuditLogQueryParams = {
  limit: number;
  offset: number;
  entity?: string;
  action?: string;
  actor?: string;
  /** Inclusive ISO instant (a from-day's 00:00Z) or undefined. */
  occurredFromIso?: string;
  /** Exclusive ISO instant (the day after a to-day's 00:00Z) or undefined. */
  occurredToExclusiveIso?: string;
};

export type AuditLogRowData = {
  id: string;
  /** ISO string — the RPC-boundary convention (see the module comment). */
  occurredAt: string;
  actorId: string;
  actorEmail: string;
  entity: string;
  entityId: string | null;
  action: string;
  summary: string | null;
  requestId: string;
};

function buildConditions(params: AuditLogQueryParams): SQL | undefined {
  const conditions = [
    params.entity === undefined ? undefined : eq(auditLog.entity, params.entity),
    params.action === undefined ? undefined : eq(auditLog.action, params.action),
    params.actor === undefined ? undefined : eq(auditLog.actorEmail, params.actor),
    params.occurredFromIso === undefined
      ? undefined
      : gte(auditLog.occurredAt, new Date(params.occurredFromIso)),
    params.occurredToExclusiveIso === undefined
      ? undefined
      : lt(auditLog.occurredAt, new Date(params.occurredToExclusiveIso)),
  ].filter((condition) => condition !== undefined);
  return conditions.length === 0 ? undefined : and(...conditions);
}

export async function runAuditLogPage(
  db: Database,
  params: AuditLogQueryParams
): Promise<{ rows: AuditLogRowData[]; total: number }> {
  const where = buildConditions(params);
  const [totals, rows] = await Promise.all([
    db.select({ total: count() }).from(auditLog).where(where),
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(params.limit)
      .offset(params.offset),
  ]);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      entity: row.entity,
      entityId: row.entityId,
      action: row.action,
      summary: row.summary,
      requestId: row.requestId,
    })),
    total: totals[0]?.total ?? 0,
  };
}

export async function runAuditActors(db: Database): Promise<string[]> {
  const rows = await db
    .selectDistinct({ actorEmail: auditLog.actorEmail })
    .from(auditLog)
    .orderBy(asc(auditLog.actorEmail));
  return rows.map((row) => row.actorEmail);
}
```

- [ ] **Step 2: Export it — `packages/db/src/index.ts`**

The file's export block (currently two lines) gains one:

```ts
export * from './audit-read.js';
export * from './client.js';
export * from './probes.js';
```

(Biome's import-order fix may reorder the three lines — accept the rewrite.) Then rebuild the package the admin resolves: `pnpm build:packages`.

- [ ] **Step 3: Write the failing tests — `apps/admin/src/lib/audit/queries.test.ts`**

```ts
// The viewer's query-contract tests (#188): the spec's caching posture
// (page stale at 30s, actors at 5m), revalidate-on-focus stated
// explicitly, keepPreviousData on the page query, and search-keyed cache
// identity. Asserts the OPTIONS objects only — the server fns are never
// invoked from a plain-node test (the RPC wrapper needs request context;
// module import is safe, the metrics-queries precedent).
import { keepPreviousData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { auditLogSearchSchema } from './filters';
import { auditQueries } from './queries';

describe('auditQueries (spec-verbatim caching posture)', () => {
  it('the page query stales at 30s, revalidates on focus, and keeps previous data', () => {
    expect(auditQueries.page(auditLogSearchSchema.parse({}))).toMatchObject({
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      placeholderData: keepPreviousData,
    });
  });

  it('the page key carries the full search — every filter is cache identity', () => {
    const base = auditQueries.page(auditLogSearchSchema.parse({})).queryKey;
    expect(auditQueries.page(auditLogSearchSchema.parse({ entity: 'branch' })).queryKey).not.toEqual(
      base
    );
    expect(auditQueries.page(auditLogSearchSchema.parse({ page: '2' })).queryKey).not.toEqual(base);
    expect(
      auditQueries.page(auditLogSearchSchema.parse({ from: '2026-10-01', to: '2026-10-06' }))
        .queryKey
    ).not.toEqual(base);
  });

  it('the actors query stales at 5 minutes under the audit prefix', () => {
    expect(auditQueries.actors()).toMatchObject({
      queryKey: ['audit', 'actors'],
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    });
  });

  it('the actors key is stable across calls (one cache entry)', () => {
    expect(auditQueries.actors().queryKey).toEqual(auditQueries.actors().queryKey);
  });
});
```

- [ ] **Step 4: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/audit/queries.test.ts` — fails on the missing module `./queries` (and `./audit.functions` through it). Record the red.

- [ ] **Step 5: Write `apps/admin/src/lib/audit/audit.functions.ts`**

```ts
// The Audit Log viewer's server functions (#188, ADR-0023): the reads are
// admin-side over packages/db — the api stays domain-pure, zero api
// routes, zero api files. The gate is the metrics seam's discipline PLUS
// the role law (ADR-0018): the audit record is person-level — owner-only
// by the standing rule — so the gate demands a session AND
// role === 'admin' (the BetterAuth plugin's literal for the owner;
// 'staff' and null both fail). Ordering inside each fn: dbUrl first (no
// db means no auth either — one curated not-configured state for both),
// then the gate (the only throw a fn permits), then the read inside
// try/catch → unavailable with one log-only line (the #155 law: the loud
// detail never rides the payload). Sentry span per the server-fn house
// rule (no-op when Sentry is uninitialized).
import { startSpan } from '@sentry/tanstackstart-react';
import { createDbClient, runAuditActors, runAuditLogPage } from '@sevendays/db';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { createAuth } from '../auth';
import { auditDateWindow, auditLogSearchSchema, pageWindow, AUDIT_PAGE_SIZE } from './filters';

export type AuditResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not-configured' | 'unavailable' };

function readDbUrl(): string | null {
  const value = process.env.DATABASE_URL;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

async function requireAuditSession(): Promise<void> {
  const session = await createAuth().api.getSession({
    headers: getRequestHeaders(),
  });
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

export const fetchAuditLogPage = createServerFn({ method: 'GET' })
  .validator(auditLogSearchSchema)
  .handler(async ({ data }) => {
    return startSpan({ name: 'audit log page' }, async () => {
      const dbUrl = readDbUrl();
      if (dbUrl === null) {
        return { ok: false as const, reason: 'not-configured' as const };
      }
      await requireAuditSession();
      try {
        const window = auditDateWindow(data);
        // The offset rides the UNCLAMPED page: a stale high page reads an
        // empty window harmlessly, and pageWindow(total, …) in the
        // response tells the screen the clamped truth (it self-heals the
        // URL). All pagination math lives in the one tested seam.
        const offset = (data.page - 1) * AUDIT_PAGE_SIZE;
        const result = await runAuditLogPage(createDbClient(dbUrl), {
          limit: AUDIT_PAGE_SIZE,
          offset,
          entity: data.entity,
          action: data.action,
          actor: data.actor,
          occurredFromIso: window.start ?? undefined,
          occurredToExclusiveIso: window.endExclusive ?? undefined,
        });
        const display = pageWindow(result.total, data.page);
        return {
          ok: true as const,
          data: {
            rows: result.rows,
            total: result.total,
            page: display.page,
            totalPages: display.totalPages,
          },
        };
      } catch (error) {
        console.error(
          '[audit] Audit Log source unavailable:',
          error instanceof Error ? error.message : error
        );
        return { ok: false as const, reason: 'unavailable' as const };
      }
    });
  });

export const fetchAuditActors = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'audit log actors' }, async () => {
    const dbUrl = readDbUrl();
    if (dbUrl === null) {
      return { ok: false as const, reason: 'not-configured' as const };
    }
    await requireAuditSession();
    try {
      return { ok: true as const, data: await runAuditActors(createDbClient(dbUrl)) };
    } catch (error) {
      console.error(
        '[audit] Audit Log actor source unavailable:',
        error instanceof Error ? error.message : error
      );
      return { ok: false as const, reason: 'unavailable' as const };
    }
  });
});
```

- [ ] **Step 6: Write `apps/admin/src/lib/audit/queries.ts`**

```ts
// The viewer's query factories (#188): the page query keys on the FULL
// search (every filter is cache identity — a filter change is a new
// entry), parses rows through the landed auditLogRowSchema at the RPC
// boundary, and keeps previous data across page flips. Actors are
// long-stale — a studio's staff list barely moves. No server-side cache;
// no polling.
import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { AuditLogRow } from '@sevendays/types';

import { fetchAuditActors, fetchAuditLogPage } from './audit.functions';
import { parseAuditWireRows, type AuditLogSearch } from './filters';

export type AuditLogPage = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  totalPages: number;
};

export const auditQueries = {
  page: (search: AuditLogSearch) =>
    queryOptions({
      queryKey: ['audit', 'page', search] as const,
      queryFn: async () => {
        const result = await fetchAuditLogPage({ data: search });
        return result.ok
          ? { ok: true as const, data: { ...result.data, rows: parseAuditWireRows(result.data.rows) } }
          : result;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      placeholderData: keepPreviousData,
    }),
  actors: () =>
    queryOptions({
      queryKey: ['audit', 'actors'],
      queryFn: fetchAuditActors,
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    }),
};
```

- [ ] **Step 7: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run src/lib/audit` (16 filters + 4 queries green), then `pnpm --filter @sevendays/db fix` and `pnpm --filter @sevendays/admin fix`, then `pnpm --filter @sevendays/db test` (untouched — the db suite's four files: catalog-rows, client-transaction, migrate, verify-appointment-row; **their counts must not change**), then `pnpm build:packages` once more if `fix` touched `packages/db/src`, then `pnpm check` (35/35). Admin floor now **16 files / 160 tests**. Commit:

```bash
git add packages/db/src/audit-read.ts packages/db/src/index.ts apps/admin/src/lib/audit/audit.functions.ts apps/admin/src/lib/audit/queries.ts apps/admin/src/lib/audit/queries.test.ts
git commit -m "feat(admin,db): the audit read module + owner-gated server fns + query factories (#188)"
```

### Task 3: `apps/admin` — the owner role through the shell: the nav taxonomy extracted, the gate testable (TDD)

**Files:**
- Create (test-first): `apps/admin/src/lib/nav.test.ts`
- Create: `apps/admin/src/lib/nav.ts`
- Modify: `apps/admin/src/routes/_shell.tsx:20`

**Interfaces:**
- Consumes: nothing from Tasks 1–2 (independent — may run in parallel with them).
- Produces (what Tasks 4–5 consume): `NavTo`, `NavItem` (gains `ownerOnly?: boolean`), `NavGroup`, `navGroups`, `visibleNavGroups(role: string | null | undefined) → NavGroup[]` from `#/lib/nav`; the shell route context's `user` widens to `{ name: string; email: string; role: string | null }` (what `_shell.audit-log.tsx`'s beforeLoad gates on, Task 5).

**Not here:** the audit route itself (Task 5); the screen (Tasks 4–5); **the sidebar's consumption of `visibleNavGroups` (Task 5 — sequencing law, ruled at execution: widening `NavTo` with `/audit-log` breaks the sidebar's `Link to={item.to}` / `matchRoute` typing until the route file registers the route, so the rewiring lands where the route exists)**; any change to the appointments stub or the dashboard routes; any M5.5 user-management surface (the role is read, never written).

- [ ] **Step 1: Write the failing tests — `apps/admin/src/lib/nav.test.ts`**

```ts
// The owner-visibility law, lib-seam-pinned (#188, ADR-0018): the nav's
// owner-only entries — Audit Log, person-level by the standing rule —
// render for role === 'admin' alone ('staff' and null both fail; the
// column is nullable in the user table). Plain-node over the extracted
// taxonomy (the data was inline in admin-sidebar.tsx since #139 — the
// extraction makes the law testable).
import { describe, expect, it } from 'vitest';

import { navGroups, visibleNavGroups } from './nav';

describe('visibleNavGroups (the ADR-0018 gate)', () => {
  it('the owner (role admin) sees Audit Log in Overview, directly after Analytics', () => {
    const overview = visibleNavGroups('admin').find((group) => group.heading === 'Overview');
    expect(overview?.items.map((item) => item.to)).toEqual(['/', '/audit-log', '/appointments']);
  });

  it('staff (role staff) see no Audit Log entry anywhere — Analytics and Appointments unaffected', () => {
    const items = visibleNavGroups('staff').flatMap((group) => group.items);
    expect(items.some((item) => item.to === '/audit-log')).toBe(false);
    expect(items.some((item) => item.to === '/')).toBe(true);
    expect(items.some((item) => item.to === '/appointments')).toBe(true);
  });

  it('a null role (the column is nullable) fails the owner gate too', () => {
    expect(visibleNavGroups(null).flatMap((group) => group.items).some((item) => item.to === '/audit-log')).toBe(false);
    expect(visibleNavGroups(undefined).flatMap((group) => group.items).some((item) => item.to === '/audit-log')).toBe(false);
  });

  it("Audit Log is the taxonomy's only owner-only item, and no group vanishes for staff", () => {
    const ownerOnly = navGroups.flatMap((group) => group.items.filter((item) => item.ownerOnly));
    expect(ownerOnly.map((item) => item.to)).toEqual(['/audit-log']);
    expect(visibleNavGroups('staff').map((group) => group.heading)).toEqual(
      navGroups.map((group) => group.heading)
    );
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/nav.test.ts` — fails on the missing module `./nav`. Record the red.

- [ ] **Step 3: Create `apps/admin/src/lib/nav.ts`**

The taxonomy moves here verbatim from `admin-sidebar.tsx` (the #59 ruling, icons unchanged) with two deltas: `NavTo` gains `'/audit-log'`, and the Overview group gains the owner-only Audit Log item **directly after Analytics** (the spec: "Nav entry 'Audit Log' in the Overview group beside Analytics"). Full file:

```ts
// The shell's nav taxonomy (#59 ruling, extracted from admin-sidebar.tsx
// at #188 so the owner-visibility law is testable): navGroups is data,
// visibleNavGroups is the role filter. Owner-only entries — Audit Log
// (M6 #188: the who/what/when record is person-level by the standing
// rule "aggregates are shared; anything person-level is owner-scoped")
// — render for role === 'admin' alone (ADR-0018's BetterAuth mapping:
// the owner holds the admin plugin's 'admin' literal; 'staff' and null
// both fail; the role column is nullable).
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CalendarDays,
  Images,
  MapPin,
  Package,
  PlusCircle,
  Quote,
  ScrollText,
  Settings,
  Tags,
  Wrench,
} from 'lucide-react';

export type NavTo =
  | '/'
  | '/audit-log'
  | '/appointments'
  | '/packages'
  | '/add-ons'
  | '/studio-services'
  | '/gallery'
  | '/testimonials'
  | '/branches'
  | '/lookups'
  | '/settings';

export interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

// The ruled taxonomy (#59), icons carried from the prototype unchanged.
// Overview carries the Analytics dashboard (#186) and — owner-only — the
// Audit Log (#188, beside Analytics); Appointments stays the v2 teaser
// stub; Catalog and Studio carry the live CMS surfaces.
export const navGroups: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Analytics', icon: Activity },
      { to: '/audit-log', label: 'Audit Log', icon: ScrollText, ownerOnly: true },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/packages', label: 'Packages', icon: Package },
      { to: '/add-ons', label: 'Add-ons', icon: PlusCircle },
      { to: '/studio-services', label: 'Studio services', icon: Wrench },
      { to: '/gallery', label: 'Gallery', icon: Images },
      { to: '/testimonials', label: 'Testimonials', icon: Quote },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { to: '/branches', label: 'Branches', icon: MapPin },
      { to: '/lookups', label: 'Lookups', icon: Tags },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function visibleNavGroups(role: string | null | undefined): NavGroup[] {
  if (role === 'admin') {
    return navGroups;
  }
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.ownerOnly !== true),
    }))
    .filter((group) => group.items.length > 0);
}
```

- [ ] **Step 4: Green, then rewire the shell**

`pnpm --filter @sevendays/admin test -- --run src/lib/nav.test.ts` (4 tests green). Then one edit:

(a) `apps/admin/src/routes/_shell.tsx` — the gate's context return widens (line 20):

```ts
    return {
      user: {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role ?? null,
      },
    };
```

(The spike-proven field: the admin plugin types `role` on the session user — read through our own `createAuth`, typecheck-clean 2026-10-10. The `?? null` is honest: the column is nullable, and nav treats null as non-owner.)

- [ ] **Step 5: Gates + commit**

`pnpm --filter @sevendays/admin fix`, then `pnpm --filter @sevendays/admin test` (**17 files / 164 tests** — the full new floor), then `pnpm --filter @sevendays/admin typecheck`, then `pnpm check` (35/35 — no other package touched since Task 2). Commit:

```bash
git add apps/admin/src/lib/nav.ts apps/admin/src/lib/nav.test.ts apps/admin/src/routes/_shell.tsx
git commit -m "feat(admin): the owner role through the shell — nav taxonomy extracted, the Audit Log entry owner-gated (#188)"
```

### Task 4: The rendered variants — the owner's ratification gate

**Skill set:** `prototype` (the rendering discipline) + `ui-ux-pro-max`, with `design-system` / `ui-styling` as relevant — loaded at execution time (AGENTS.md rule). This task is the ticket's "Rendered variants at execution" clause; the #186/#187 pattern: compositions rendered as frames over mock data, the owner reacts, the ratified composition lands in Task 5.

**Files:**
- Create (UNTRACKED — never committed, deleted at Step 5): `apps/admin/src/routes/prototype-audit.tsx`
- Evidence: `.superpowers/sdd/2026-10-10-188-audit-log-viewer-screen/variants/*.png`

**Not here:** any committed change in this task besides the copy/label adjustments the owner's ruling asks for (they amend Task 1's `filters.ts` label maps — the only durable outputs are those adjustments and the issue comment).

- [ ] **Step 1: The prototype route (ungated, mock data — the prototype-tokens precedent)**

Create `apps/admin/src/routes/prototype-audit.tsx` — a TOP-LEVEL route (outside `_shell`, so no session gate and `playwright screenshot` can reach it), rendering the viewer's composition candidates over inline mock rows plus the failure/empty rehearsal. Full file:

```tsx
// PROTOTYPE ONLY (#188 Task 4) — untracked, deleted before the PR. The
// owner-reacted rendered variants: the Audit Log viewer's composition
// candidates over mock rows (no server fns, no env, no gate — the
// prototype-tokens precedent). Copy is Task 1's pinned set.
import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sevendays/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { createFileRoute } from '@tanstack/react-router';

import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '#/lib/audit/filters';

export const Route = createFileRoute('/prototype-audit')({
  head: () => ({ meta: [{ title: 'Audit Log variants | prototype' }] }),
  component: PrototypeAuditPage,
});

// Six rows spanning the vocabulary: all four actions, a null summary
// (the reorder grain), a long email + long summary (the truncation
// cases), and a fresh-seconds-ago row (the newest-first head).
const ROWS = [
  {
    occurredAt: '2026-10-10 04:12',
    actorEmail: 'owner@sevendaysstudio.test',
    action: 'update',
    entity: 'service-package',
    summary: 'Love Story Anniversary',
  },
  {
    occurredAt: '2026-10-10 04:09',
    actorEmail: 'owner@sevendaysstudio.test',
    action: 'create',
    entity: 'gallery-photo',
    summary: '1730f2e0-cover.jpg',
  },
  {
    occurredAt: '2026-10-09 08:41',
    actorEmail: 'staff.magdalena@sevendaysstudio.test',
    action: 'reorder',
    entity: 'addon-service',
    summary: null,
  },
  {
    occurredAt: '2026-10-09 08:40',
    actorEmail: 'staff.magdalena@sevendaysstudio.test',
    action: 'deactivate',
    entity: 'print-size',
    summary: '12R Metallic',
  },
  {
    occurredAt: '2026-10-08 14:02',
    actorEmail: 'owner@sevendaysstudio.test',
    action: 'update',
    entity: 'branch',
    summary: 'Sevendays Studio Makati — ground floor unit G-21, Victory Mall, Kalayaan Avenue corner A. Arnaiz Avenue, Makati City (retouched 2026-10-08)',
  },
  {
    occurredAt: '2026-10-07 09:15',
    actorEmail: 'staff.jose@sevendaysstudio.test',
    action: 'create',
    entity: 'testimonial',
    summary: 'The Nadal family',
  },
];

const ACTORS = [
  'owner@sevendaysstudio.test',
  'staff.jose@sevendaysstudio.test',
  'staff.magdalena@sevendaysstudio.test',
];

function SectionHeading({ children }: { children: string }) {
  return <h2 className='mt-10 mb-3 text-lg font-semibold'>{children}</h2>;
}

function Toolbar({ labeled }: { labeled: boolean }) {
  const controlClass = labeled ? 'flex flex-col gap-1' : 'flex items-center gap-2';
  const labelFor = (text: string) =>
    labeled ? <span className='text-muted-foreground text-xs font-medium'>{text}</span> : null;
  return (
    <div className='flex flex-wrap items-end gap-3'>
      <label className={`${controlClass} text-xs font-medium`}>
        {labelFor('Entity')}
        <Select defaultValue='all'>
          <SelectTrigger className='w-44'>
            <SelectValue placeholder='Entity' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All</SelectItem>
            {Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className={`${controlClass} text-xs font-medium`}>
        {labelFor('Action')}
        <Select defaultValue='all'>
          <SelectTrigger className='w-36'>
            <SelectValue placeholder='Action' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All</SelectItem>
            {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className={`${controlClass} text-xs font-medium`}>
        {labelFor('Actor')}
        <Select defaultValue='all'>
          <SelectTrigger className='w-56'>
            <SelectValue placeholder='Actor' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All</SelectItem>
            {ACTORS.map((actor) => (
              <SelectItem key={actor} value={actor}>
                {actor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className={`${controlClass} text-xs font-medium`}>
        {labelFor('From')}
        <Input type='date' className='w-40' defaultValue='2026-10-01' />
      </label>
      <label className={`${controlClass} text-xs font-medium`}>
        {labelFor('To')}
        <Input type='date' className='w-40' defaultValue='2026-10-10' />
      </label>
      <Button variant='ghost' size='sm' className={labeled ? 'self-end' : ''}>
        Clear filters
      </Button>
    </div>
  );
}

function Rows({ badge }: { badge: boolean }) {
  return (
    <>
      {ROWS.map((row, index) => (
        <TableRow key={index} title='req_9f2c… (hover carries requestId — the correlation affordance)'>
          <TableCell className='w-44 py-2 tabular-nums'>{row.occurredAt}</TableCell>
          <TableCell className='max-w-56 truncate py-2'>{row.actorEmail}</TableCell>
          <TableCell className='w-28 py-2'>
            {badge ? (
              <Badge variant='outline'>{AUDIT_ACTION_LABELS[row.action as keyof typeof AUDIT_ACTION_LABELS]}</Badge>
            ) : (
              <span className='text-muted-foreground'>{AUDIT_ACTION_LABELS[row.action as keyof typeof AUDIT_ACTION_LABELS]}</span>
            )}
          </TableCell>
          <TableCell className='w-40 py-2'>{AUDIT_ENTITY_LABELS[row.entity as keyof typeof AUDIT_ENTITY_LABELS]}</TableCell>
          <TableCell className='max-w-72 truncate py-2'>
            {row.summary ?? <span className='text-muted-foreground'>—</span>}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function HeaderCells() {
  return (
    <>
      <TableHead className='w-44'>When (UTC)</TableHead>
      <TableHead>Actor</TableHead>
      <TableHead className='w-28'>Action</TableHead>
      <TableHead className='w-40'>Entity</TableHead>
      <TableHead>Summary</TableHead>
    </>
  );
}

function Footer() {
  return (
    <div className='flex items-center justify-between'>
      <p className='text-muted-foreground text-xs'>Page 1 of 14 · 268 entries</p>
      <div className='flex gap-2'>
        <Button variant='outline' size='sm' disabled>
          Previous
        </Button>
        <Button variant='outline' size='sm'>
          Next
        </Button>
      </div>
    </div>
  );
}

function PrototypeAuditPage() {
  return (
    <main className='mx-auto max-w-5xl space-y-4 p-6'>
      <h1 className='text-2xl font-semibold'>#188 Audit Log viewer variants</h1>
      <p className='text-muted-foreground text-sm'>
        Who changed what, when — every CMS write, newest first.
      </p>

      <SectionHeading>Variant A — toolbar row + badge actions (the working default)</SectionHeading>
      <div className='space-y-4' aria-label='Variant A'>
        <Toolbar labeled={false} />
        <Table>
          <TableHeader>
            <TableRow>
              <HeaderCells />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Rows badge />
          </TableBody>
        </Table>
        <Footer />
      </div>

      <SectionHeading>Variant B — labeled filter grid + muted actions (the denser read)</SectionHeading>
      <div className='space-y-4' aria-label='Variant B'>
        <Toolbar labeled />
        <Table>
          <TableHeader>
            <TableRow>
              <HeaderCells />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Rows badge={false} />
          </TableBody>
        </Table>
        <Footer />
      </div>

      <SectionHeading>Variant C — the failure + empty rehearsal (the curated states)</SectionHeading>
      <div className='space-y-3' aria-label='Variant C'>
        <div className='border-input rounded-lg border p-6 text-sm text-muted-foreground'>
          Audit Log source not configured.
        </div>
        <div className='border-input rounded-lg border p-6 text-sm text-muted-foreground'>
          Audit Log source unavailable.
        </div>
        <div className='border-input rounded-lg border p-6 text-sm text-muted-foreground'>
          No audit rows yet — they start with the first CMS write.
        </div>
        <div className='border-input rounded-lg border p-6 text-sm text-muted-foreground'>
          No audit rows match these filters.
        </div>
        <div className='border-input rounded-lg border p-6 text-sm text-muted-foreground'>
          Loading audit rows…
        </div>
      </div>
    </main>
  );
}
```

(The `routeTree.gen.ts` regen this route triggers is EXPECTED and LOCAL ONLY — the file is untracked and deleted in Step 5; after deletion, `git checkout -- apps/admin/src/routeTree.gen.ts` restores the committed tree byte-identically. Nothing routeTree-shaped ever reaches the PR from this task.)

- [ ] **Step 2: Render + frame**

With the dev server up (`pnpm --filter @sevendays/admin dev`), frame all variants (chromium from #189's foundation). The dev port is read from the live script — the checkout's uncommitted local change serves **3001** (the committed script says 3000; the command reads whichever is live, so it works either way):

```bash
mkdir -p .superpowers/sdd/2026-10-10-188-audit-log-viewer-screen/variants
PORT=$(node -e 'console.log(/--port (\d+)/.exec(require("./apps/admin/package.json").scripts.dev)?.[1] ?? "3000")')
pnpm exec playwright screenshot --viewport-size=1280,2400 "http://localhost:${PORT}/prototype-audit" .superpowers/sdd/2026-10-10-188-audit-log-viewer-screen/variants/variants-desktop.png
pnpm exec playwright screenshot --viewport-size=390,2400 "http://localhost:${PORT}/prototype-audit" .superpowers/sdd/2026-10-10-188-audit-log-viewer-screen/variants/variants-mobile.png
```

- [ ] **Step 3: The owner's reaction (the gate)**

Post the decision request on #188 (the frames stay local — the #186/#187 evidence precedent; the owner has the checkout):

```bash
gh issue comment 188 --body "Rendered variants for the Audit Log viewer are up (Task 4): .superpowers/sdd/2026-10-10-188-audit-log-viewer-screen/variants/ in the working checkout — run \`pnpm --filter @sevendays/admin dev\` and open /prototype-audit to react live. Decisions requested: (1) composition — A the inline toolbar row + badge actions (the working default) / B the labeled filter grid + muted action text, or a mix; (2) the requestId affordance — hover-title on the row (the current pin) vs a truncated Request column vs omitted; (3) any copy nits on the labels, headers, empty lines, or the page subline. React here; the ratified composition then lands in Task 5 and this prototype route is deleted."
```

The executor applies the owner's ruling: composition asks reshape Task 5's screen; copy asks amend Task 1's label maps and this task's pinned lines (a label-map change updates `filters.ts` only — its tests assert key coverage, not text; **never change the enum keys, only the labels**). Then:

- [ ] **Step 4: `pnpm check` re-run** (the adjustments keep it green — **17 files / 164 tests**; a label change must not move the count).

- [ ] **Step 5: Delete the prototype + restore the tree**

```bash
rm apps/admin/src/routes/prototype-audit.tsx
git checkout -- apps/admin/src/routeTree.gen.ts
git status --short   # expects: nothing outside the known-modified files (or clean, if Tasks 1–3 are committed and no ruling asked for copy changes)
```

Commit only if the owner's ruling amended files (otherwise this task has no commit by design — Task 5 lands the ratified composition):

```bash
git add apps/admin/src/lib/audit/filters.ts
git commit -m "feat(admin): the owner-ratified Audit Log copy — variant labels adjusted (#188)"
```

(If the owner's reaction arrives after the PR opens, the same adjustment lands as a PR commit before merge — the PR body names the variants evidence; the merge gate includes the reaction.)

### Task 5: `apps/admin` — the owner-gated route + the screen (the ratified composition)

**Files:**
- Create: `apps/admin/src/routes/_shell.audit-log.tsx`
- Create: `apps/admin/src/components/audit/audit-log-screen.tsx`
- Modify: `apps/admin/src/components/admin-sidebar.tsx` (moved here from Task 3 at execution — the route must exist before the sidebar's `Link`/`matchRoute` typing accepts `/audit-log`)
- Regen (this task's commit): `apps/admin/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: Task 1's `auditLogSearchSchema`, `AuditLogSearch`, `AUDIT_ENTITY_LABELS`, `AUDIT_ACTION_LABELS`, `AUDIT_PAGE_SIZE`, `hasActiveFilters`, `pageWindow`; Task 2's `auditQueries`; Task 3's `visibleNavGroups` + shell context `user.role`; the shared `PageHeader`, `formatUtc`, and the `packages/ui` table/select/badge/button/input primitives.
- Produces: the live screen at `/audit-log` (owner-only) — the ticket's deliverable; nothing downstream consumes it.

**Not here:** the Analytics Dashboard (`_shell.index.tsx` is untouched — the Audit Log never joins it, the standing rule); the appointments stub; the sidebar (Task 3 landed the nav); any change to `packages/ui` or `packages/types`.

**The composition below is Variant A (toolbar row + badge actions) — the working default.** If Task 4's ruling picked B or a mix, transpose the toolbar/badge treatment accordingly (the data wiring, states, and pagination are NOT variant-adjustable — only the toolbar posture, the action presentation, and copy are).

- [ ] **Step 1: Create `apps/admin/src/routes/_shell.audit-log.tsx`**

```tsx
// The Audit Log screen's route (#188, spec § The Audit Log — Viewer):
// owner-only, re-gated HERE even though the nav hides the entry and the
// server fns gate themselves — a staff arrival at the bare URL lands on
// their own dashboard, never on person-level history (the standing
// rule). Filters are shareable search params (the WindowToggle
// precedent), tolerant by construction (Task 1's catch-everything
// schema — a stale shared URL never fails a visit).
import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuditLogScreen } from '#/components/audit/audit-log-screen';
import { auditLogSearchSchema } from '#/lib/audit/filters';

export const Route = createFileRoute('/_shell/audit-log')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  validateSearch: auditLogSearchSchema,
  head: () => ({ meta: [{ title: 'Audit Log | Sevendays Admin' }] }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const search = Route.useSearch();
  return <AuditLogScreen search={search} />;
}
```

- [ ] **Step 2: Create `apps/admin/src/components/audit/audit-log-screen.tsx`**

```tsx
// The Audit Log screen (#188, spec § The Audit Log — Viewer): the
// owner-only, filterable, newest-first, paginated table over the durable
// record — no joins anywhere (the snapshotted actorEmail + inline
// summary are the whole row, #185's design). Filters ride URL search
// params; every filter change resets to page 1; a stale page beyond the
// end self-heals via replace-navigation (the response carries the
// clamped truth — pageWindow, the one tested math). The row's title
// carries requestId — the Application Log correlation affordance without
// a column. UTC throughout (formatUtc) — SSR/hydration-stable. Curated
// failure states follow the never-500 law: any thrown query error
// (including a role-gate Unauthorized) renders the unavailable line.
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sevendays/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { PageHeader } from '#/components/cms/shared';
import { formatUtc } from '#/components/dashboard/format';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  hasActiveFilters,
  pageWindow,
  type AuditLogSearch,
} from '#/lib/audit/filters';
import { auditQueries } from '#/lib/audit/queries';

const ALL = 'all';

function FilterSelect({
  label,
  value,
  triggerClass,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  triggerClass: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className='flex flex-col gap-1 text-xs font-medium'>
      <span className='text-muted-foreground'>{label}</span>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : next)}
      >
        <SelectTrigger className={triggerClass}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className='flex flex-col gap-1 text-xs font-medium'>
      <span className='text-muted-foreground'>{label}</span>
      <Input
        type='date'
        className='w-40'
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
      />
    </label>
  );
}

export function AuditLogScreen({ search }: { search: AuditLogSearch }) {
  const navigate = useNavigate();
  const pageQuery = useQuery(auditQueries.page(search));
  const actorsQuery = useQuery(auditQueries.actors());

  const patchSearch = (patch: Partial<AuditLogSearch>) => {
    void navigate({
      to: '/audit-log',
      search: { ...search, ...patch, page: patch.page ?? 1 },
    });
  };

  const data = pageQuery.data?.ok === true ? pageQuery.data.data : null;
  const window = data === null ? null : pageWindow(data.total, search.page);

  // A stale ?page beyond the end (a shared URL whose filters narrowed
  // since) self-heals: replace to the clamped page so rows and footer
  // agree. Primitive deps only — the object identity of pageWindow's
  // result is not stable.
  const clampedPage = window?.page;
  useEffect(() => {
    if (clampedPage !== undefined && clampedPage !== search.page) {
      void navigate({
        to: '/audit-log',
        search: { ...search, page: clampedPage },
        replace: true,
      });
    }
  }, [clampedPage, search, navigate]);

  const actors = actorsQuery.data?.ok === true ? actorsQuery.data.data : [];
  const unavailable =
    pageQuery.isError || (pageQuery.data !== undefined && !pageQuery.data.ok);

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Audit Log'
        subline='Who changed what, when — every CMS write, newest first.'
      />

      <div className='flex flex-wrap items-end gap-3'>
        <FilterSelect
          label='Entity'
          value={search.entity}
          triggerClass='w-44'
          options={Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(entity) => patchSearch({ entity })}
        />
        <FilterSelect
          label='Action'
          value={search.action}
          triggerClass='w-36'
          options={Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(action) => patchSearch({ action })}
        />
        <FilterSelect
          label='Actor'
          value={search.actor}
          triggerClass='w-56'
          options={actors.map((actor) => ({ value: actor, label: actor }))}
          onChange={(actor) => patchSearch({ actor })}
        />
        <FilterDate label='From' value={search.from} onChange={(from) => patchSearch({ from })} />
        <FilterDate label='To' value={search.to} onChange={(to) => patchSearch({ to })} />
        {hasActiveFilters(search) ? (
          <Button variant='ghost' size='sm' className='self-end' onClick={() => patchSearch({})}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {pageQuery.isPending ? (
        <p className='text-muted-foreground text-sm'>Loading audit rows…</p>
      ) : unavailable ? (
        <p className='text-muted-foreground text-sm'>
          {pageQuery.data !== undefined && !pageQuery.data.ok && pageQuery.data.reason === 'not-configured'
            ? 'Audit Log source not configured.'
            : 'Audit Log source unavailable.'}
        </p>
      ) : data !== null && data.total === 0 ? (
        <p className='text-muted-foreground text-sm'>
          {hasActiveFilters(search)
            ? 'No audit rows match these filters.'
            : 'No audit rows yet — they start with the first CMS write.'}
        </p>
      ) : data !== null && data.rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-44'>When (UTC)</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead className='w-28'>Action</TableHead>
              <TableHead className='w-40'>Entity</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id} title={row.requestId}>
                <TableCell className='tabular-nums'>{formatUtc(row.occurredAt.toISOString())}</TableCell>
                <TableCell className='max-w-56 truncate'>{row.actorEmail}</TableCell>
                <TableCell>
                  <Badge variant='outline'>{AUDIT_ACTION_LABELS[row.action]}</Badge>
                </TableCell>
                <TableCell>{AUDIT_ENTITY_LABELS[row.entity]}</TableCell>
                <TableCell className='max-w-72 truncate'>
                  {row.summary ?? <span className='text-muted-foreground'>—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {data !== null && window !== null ? (
        <div className='flex items-center justify-between'>
          <p className='text-muted-foreground text-xs'>
            Page {window.page} of {window.totalPages} · {data.total}{' '}
            {data.total === 1 ? 'entry' : 'entries'}
          </p>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={!window.hasPrev}
              onClick={() => patchSearch({ page: window.page - 1 })}
            >
              <ChevronLeft aria-hidden='true' />
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={!window.hasNext}
              onClick={() => patchSearch({ page: window.page + 1 })}
            >
              Next
              <ChevronRight aria-hidden='true' />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

(The final `: null` branch covers the transient stale-high-page render — an empty row list before the self-heal effect fires; the effect replaces the URL within a frame.)

- [ ] **Step 3: Rewire the sidebar (moved from Task 3 at execution — the route now exists)**

`apps/admin/src/components/admin-sidebar.tsx` — the taxonomy and its types leave the file. The icon import shrinks to `LogOut` (the nav icons now live in `#/lib/nav`); the local `NavTo`/`NavItem`/`NavGroup`/`navGroups` definitions are deleted; the header comment's taxonomy paragraph points at `#/lib/nav`. The full set of edits:

The import block replaces the lucide import and adds the nav import:

```ts
import { LogOut } from 'lucide-react';
import { authClient } from '#/lib/auth-client';
import { visibleNavGroups } from '#/lib/nav';
```

The props interface widens:

```ts
interface AdminSidebarProps {
  user: { name: string; email: string; role: string | null };
}
```

And inside `AdminSidebar`, `navGroups.map(...)` becomes:

```ts
  const groups = visibleNavGroups(user.role);
```

with the render's `{navGroups.map((group, index) => (…))}` becoming `{groups.map((group, index) => (…))}` — everything else in the file (the rail logic, the user card, sign-out) is untouched.

- [ ] **Step 4: Regenerate the route tree + verify the gate live**

```bash
pnpm --filter @sevendays/admin generate-routes
```

`routeTree.gen.ts` gains the `/audit-log` route — it joins this task's commit (a regenerable the v1 pick WANTS to carry: v1 gains the route too). Then, with the dev server up and the local db reachable, verify the gate by hand: signed out → `/audit-log` bounces to `/login` (the shell gate); signed in as the owner (`role=admin`) → the screen renders; and a staff-role account (if one exists locally; else note deferred) sees no nav entry and `/audit-log` redirects to `/`. Record what was verifiable in the evidence dir (owner-role check is the required one; the staff-role check may ride the owner's own account if no staff row exists — the nav.test.ts suite already pins the staff law).

- [ ] **Step 5: Gates + commit**

`pnpm --filter @sevendays/admin fix`, then `pnpm --filter @sevendays/admin test` (**17 files / 164 tests**), then `pnpm --filter @sevendays/admin typecheck`, then `pnpm check` (35/35), then `pnpm --filter @sevendays/admin build`. Commit:

```bash
git add apps/admin/src/routes/_shell.audit-log.tsx apps/admin/src/components/audit/audit-log-screen.tsx apps/admin/src/components/admin-sidebar.tsx apps/admin/src/routeTree.gen.ts
git commit -m "feat(admin): the Audit Log screen — owner-gated route, filters, table, pagination (#188)"
```

### Task 6: Gates, docs rotation (the audit box TICKED), PR/merge, the v1 pick, ledger, issue close

**Files:**
- Modify: `docs/plan.md` (M6 audit box — **ticked**), `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (ledger row, post-merge)

**Interfaces:**
- Consumes: Tasks 1–5 merged on the branch (+ Task 4's owner reaction recorded on the issue).
- Produces: main carrying the Audit Log whole (write side #185 + viewer #188); the v1 pick landed; issue #188 closed; the M6 audit roadmap box ticked.

**Not here:** the production smoke (#190); the ship runbook (#191); the M6 close (#192); `apps/admin/CONTEXT.md` (the Audit Log glossary term landed with #185 and already describes the screen — no edit).

- [ ] **Step 1: Full repo gates**

`docker compose up -d db`, then `pnpm check` then `pnpm build`. Expected: check 35/35 turbo tasks; build green. Floors: **admin 17 files / 164 tests** (the viewer's lib-seam coverage: the tolerant search schema, UTC windows, page math, labels, wire parse, the query contracts, the owner-visibility nav law); api 27 files + 1 skipped / 338 passed + 3 skipped, api-client 5 files / 33 tests, types 14 files / 118 tests, the db suite's four files — all untouched. If any count differs, reconcile before proceeding — do not loosen assertions.

- [ ] **Step 2: Rotate the docs**

(a) `docs/plan.md`, Milestone 6 block — the audit box (the line beginning `- [ ] The mutation **Audit Log**`). Two edits. First, `- [ ] The mutation **Audit Log**` → `- [✅] The mutation **Audit Log**`. Second, the annotation's tail — change

```markdown
; the box stays unticked until the owner screen lands at #188)_
```

to

```markdown
; the owner screen landed 2026-10-10 via #188 — the owner-only, filterable (entity / actor / action / UTC date), newest-first, paginated table at /audit-log, reads via session+role-gated admin server fns over packages/db's audit-read module (ADR-0023 — zero api files, no joins), the nav entry beside Analytics behind the ADR-0018 role gate, +3 admin lib-seam files / +24 tests)_
```

(b) `docs/progress.md` — three edits. First, the dated entry at the very top (after the `# Progress` heading's blank line):

```markdown
2026-10-10 — #188, M6 ticket 06, the Audit Log viewer screen, landed: the owner-only view over the record #185 writes — a filterable (entity, actor, action, UTC date range), newest-first, paginated table (page size 20; occurredAt DESC with id DESC as the stable tiebreaker) at `/audit-log`, no joins anywhere (the snapshotted actorEmail + inline summary are the whole row; requestId rides the row's hover title as the Application Log correlation affordance). Reads via admin server functions per ADR-0023 (zero api files): `packages/db/src/audit-read.ts` (the #186 probes precedent extended to dynamic queries — the drizzle typed builder lives in packages/db because apps/admin owns no drizzle-orm dependency by ruling; safe bound filters, count + page in two queries) behind a session+ROLE gate (ADR-0018: `role === 'admin'` — the owner's BetterAuth literal; 'staff' and null both fail) in `apps/admin/src/lib/audit/audit.functions.ts`, resolving the `AuditResult` union with the curated not-configured / unavailable states (the never-500 law; one log-only line per failure). The pure seam (`filters.ts`) owns the tolerant search schema (invalid values drop, never throw), UTC day windows (from inclusive, to next-day-exclusive; calendar-invalid days drop their side), the pageWindow math (clamp + offset — the single source the fn and screen share), the label maps, and the wire parse through the landed `auditLogRowSchema`; queries keepPreviousData across page flips at staleTime 30s (actors 5m). The nav taxonomy extracted to `src/lib/nav.ts` with `visibleNavGroups(role)` (owner-only entries render for 'admin' alone — lib-seam tested); the shell context carries `role` (the admin plugin's session typing, spike-proven); the route re-gates in beforeLoad (non-owners redirect to `/`) — three layers, the server fn / the route / the nav. Owner-reacted rendered variants rode Task 4 (the ungated prototype-over-mocks pattern). Gates: admin 14→17 files / 140→164 tests, `pnpm check` 35/35, `pnpm build` green; zero new dependencies, zero manifest changes. The M6 audit box is TICKED. NOT landed: the production smoke (#190), the ship runbook (#191), the M6 close (#192).
```

Second, in the Known Gaps list, the audit write-side bullet's tail (the sentence ending the bullet that begins `- The api's **Audit Log write side** is live (M6 #185, 2026-10-06):`) — change

```markdown
The owner-scoped viewer screen (filters, pagination, nav entry) is #188's; **no read path exists yet**.
```

to

```markdown
The owner-scoped **viewer screen is live** (M6 #188, 2026-10-10): the filterable, newest-first, paginated table at `/audit-log` (filters by entity, actor, action, and UTC date; page size 20; requestId on row hover), owner-only by the ADR-0018 role gate (nav beside Analytics, route redirect, role-checked server fns), reading via admin server fns over packages/db's audit-read module (ADR-0023 — zero api files, no joins).
```

Third, in "Immediate Next Steps" item 1, change `#188 (now unblocked off #185 — the write side landed 2026-10-06)` to `#188 (landed 2026-10-10 — the Audit Log viewer screen; the audit box is TICKED)`.

(c) `AGENTS.md` — two edits. In the "Current status of `pnpm test`" section, change `The metrics seam's lib-seam suite joins them (M6 #186 + #187): the CF GraphQL + R2 dataset documents, the HogQL documents + munging, the DB probes, and the curated failure states — admin floor 13 files / 132 tests.` to `The metrics seam's lib-seam suite joins them (M6 #186 + #187): the CF GraphQL + R2 dataset documents, the HogQL documents + munging, the DB probes, and the curated failure states — and the Audit Log viewer's seam joins too (M6 #188: the filter/pagination data fns, the query factories, the owner-visibility nav law) — admin floor 17 files / 164 tests (superseding the 14/140 the #201–#203 follow-ups had left the doc behind).` And in the "The DB is provisioned…" bullet, change `failed validations and rolled-back transactions record nothing; the owner viewer screen is #188's.` to `failed validations and rolled-back transactions record nothing; the owner viewer screen is live (M6 #188): the filterable (entity/actor/action/UTC date), newest-first, paginated table at /audit-log behind the ADR-0018 role gate (nav beside Analytics, owner-only), reading via session+role-gated admin server fns over packages/db's audit-read module (ADR-0023 — zero api files, no joins; requestId on row hover correlates the Application Log).`

- [ ] **Step 3: graphify + commit**

Run: `graphify update .` then commit:

```bash
git add docs/plan.md docs/progress.md AGENTS.md graphify-out
git commit -m "docs: #188 — the M6 audit box TICKED (the viewer landed), progress + AGENTS rotation (#188)"
```

- [ ] **Step 4: PR, review, squash-merge**

```bash
git push -u origin feat/188-audit-log-viewer
gh pr create --base main --title "feat(admin): the Audit Log viewer screen — owner-only, filterable, paginated (#188)" --body-file - <<'EOF'
## What

Implements #188 (M6 ticket 06) — § The Audit Log (Viewer) of the M6 spec (#182), reading the record #185 writes; ADR-0023 rules the data path, ADR-0018 the role gate.

- The screen at /audit-log: filterable (entity, actor, action, UTC date range), newest-first (occurredAt DESC, id DESC), paginated (page size 20, keepPreviousData flips), no joins — actorEmail snapshotted + summary inline are the row; requestId rides the row hover title.
- Reads via admin server fns (zero api files): packages/db's new audit-read module (the #186 probes precedent — drizzle stays in packages/db; apps/admin owns no drizzle-orm by ruling) behind a session+role gate (role === 'admin', ADR-0018), resolving the AuditResult union with the curated not-configured/unavailable states; the never-500 law holds.
- The owner role through the shell: nav taxonomy extracted to src/lib/nav.ts with visibleNavGroups(role) (lib-seam tested); the shell context carries role (admin-plugin typing, spike-proven); the route re-gates in beforeLoad (non-owners → /); nav entry "Audit Log" in Overview beside Analytics, owner-only.
- The pure seam owns the tolerant search schema (invalid values drop), UTC day windows, the pageWindow clamp/offset math, label maps, and the wire parse through the landed auditLogRowSchema.
- Variants: owner-reacted (Task 4 evidence in .superpowers/). admin 14→17 files / 140→164 tests; pnpm check 35/35, build green; zero new dependencies. The M6 audit box is TICKED.

The smoke is #190's; the ship runbook #191's; the M6 close #192's.
EOF
```

After CI green on the PR AND the owner's variant reaction is recorded (Task 4's gate — the PR stays open for it if the reaction is pending), squash-merge. The squash commit title: `feat(admin): the Audit Log viewer screen — owner-only, filterable, paginated (#188) (#PR_NUMBER)`.

- [ ] **Step 5: The v1 pick (per `docs/agents/v1-picks.md`) — a SPLIT whose code core is PICK clean**

Classification (pre-ruled by the spec's class ledger: "Audit Log (table + transactional writes + owner screen) | **PICK clean** | The client's operating record from day 1; both editions by construction"):

- **v1-paths, picked:** `packages/db/src/audit-read.ts` + `packages/db/src/index.ts`; `apps/admin/src/lib/audit/filters.ts` + `filters.test.ts` + `audit.functions.ts` + `queries.ts` + `queries.test.ts`; `apps/admin/src/lib/nav.ts` + `nav.test.ts`; `apps/admin/src/components/audit/audit-log-screen.tsx`; `apps/admin/src/routes/_shell.audit-log.tsx`; `apps/admin/src/routes/_shell.tsx`; `apps/admin/src/routeTree.gen.ts` (the regen — v1 WANTS the route set change); `apps/admin/src/components/admin-sidebar.tsx` (the one expected conflict — below).
- **Main-only, dropped:** `docs/plan.md`, `docs/progress.md`, `AGENTS.md` (content-dropped — v1 keeps its client-safe rewrite, the #145/#146 ruling recurring; the hunk will be a UU to resolve to v1's side), the plan file (`git rm` the clean-add), `graphify-out/`.
- **The admin-sidebar.tsx conflict is pre-ruled:** v1's copy is #197's ruled divergence (the taxonomy inline, Overview = Analytics only, Appointments absent per #169). Resolution: take MAIN's consumption shape (the `#/lib/nav` import, `visibleNavGroups`, the widened user prop) — and since the taxonomy now lives in the picked `lib/nav.ts`, edit v1's `lib/nav.ts` to drop the Appointments item (the #169 ruling recurring — v1 sheds booking). Record exactly this in the Split line.
- **The routeTree regen rides:** the route set change is intentional on v1; if the cherry-pick's routeTree hunk conflicts, run `pnpm --filter @sevendays/admin generate-routes` on v1 and commit the regen.
- **No lockfile change exists** (zero new dependencies): `pnpm install --frozen-lockfile` must be green with NO `pnpm-lock.yaml` diff — a diff means the pick carried something extra; re-examine before committing.

Execute per the runbook: `cd ~/Projects/sevendays-v1-seed && git switch v1 && git pull --ff-only origin v1 && git fetch origin main`, `git cherry-pick -n <main-sha>`, drop the main-only paths (`git rm -qrf --ignore-unmatch -- docs/plan.md docs/progress.md AGENTS.md docs/superpowers/plans/2026-10-10-188-audit-log-viewer-screen.md graphify-out` — DU exits expected; resolve AGENTS.md UU to v1's version), resolve the sidebar per the pre-rule, commit with the provenance + `Split:` line:

```text
Split: main-only paths dropped — docs/plan.md, docs/progress.md, AGENTS.md, docs/superpowers/plans/…188….md, graphify-out/
Ruled v1 divergence re-applied: lib/nav.ts drops the Appointments item (the #169 ruling, recurring at the taxonomy's new home); admin-sidebar.tsx resolved to main's consumption shape; routeTree regenerated (v1 gains /audit-log)
Lockfile untouched (zero new dependencies)
```

Then the locks: `pnpm install --frozen-lockfile` (assert no lockfile diff), `pnpm build:packages && pnpm --filter @sevendays/api build`, `pnpm check` (35/35; **v1 admin floor expected 17 files / 164 tests** — the viewer's tests are booking-free; reconcile actuals), `pnpm build`, the export audit (`cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` — exit 0), push v1, and confirm the run shows `check` + `Deploy v1 (private)` success with `Deploy teaser (main)` skipped.

- [ ] **Step 6: Ledger + issue close**

Append one row to `docs/agents/v1-picks.md`'s ledger table (the established format) with the actual SHAs: date 2026-10-10, issue #188, main squash SHA, verdict `split`, v1 SHA, and the description naming: the viewer (the filterable newest-first paginated table at /audit-log — entity/actor/action/UTC-date filters, page size 20, the requestId hover title, the curated states); packages/db's audit-read module + the owner-gated server fns + the factories (keepPreviousData, 30s/5m); the nav extraction + the three-layer role gate (fn/route/nav, ADR-0018); the SPLIT classification (the spec's PICK-clean core; the main-only drops; the re-applied #169 Appointments drop at lib/nav.ts, the #197 sidebar divergence resolved to main's consumption shape, the routeTree regen); the locks' results (incl. the v1 admin floor 17/164 and the no-lockfile-change assertion); the CI run numbers; the variant-ratification note (owner-reacted, Task 4). Commit the ledger row to main:

```bash
git checkout main && git pull && git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #188 ledger row — the Audit Log viewer picked (#188)"
git push
```

Then close the issue:

```bash
gh issue close 188 --comment "Landed via #<PR_NUMBER> (main) + the v1 split <v1_SHA>. admin 17 files / 164 tests on main (the viewer's lib-seam suites: filter/pagination data fns, query contracts, the owner-visibility nav law); pnpm check 35/35 + pnpm build green; the M6 audit box is TICKED — the record (#185) and its owner view (#188) are both whole. The owner's variant reaction is recorded on this issue (Task 4). Remaining M6: the smoke (#190), the runbook (#191), the close (#192)."
```

