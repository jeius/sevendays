# M2 Ticket 06 — Landing Content Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The landing site's remaining content surfaces go live over the real API — `/services` showcasing the four Studio Services (description, price, per-branch bookability chips, one-line Add-on Services cross-reference), `/branches` with address/phone/walk-in badge/"Book at this branch" deep links, `/about` with story + testimonial placeholders and the empty M5 portfolio-grid slot, and home's Studio Services teaser strip + branches strip + credibility blurb (GitHub issue #44, parent spec #37).

**Architecture:** Pure frontend ticket on `apps/landing` — every read it needs already exists (`branches.list()` from M1.4, `studioServices.list()` from ticket 04). One new server function (`getStudioServices`) + query factory join the ticket-05 data layer; one new lib-seam helper (`bookableBranchNames`) turns a service's `bookableBranchIds` into branch-name chips using the branches read's order. Five presentational components follow the ticket-05 house rule (pages compose components; only layout/heading/copy lives in routes; data only through `queries.ts` factories). The three new routes are flat file routes (no children, unlike `/packages`). The committed CDP harness gains a content-pages scenario, and ticket-05's home article-count check is scoped to the featured strip's section — #44's new strips would otherwise break it.

**Tech Stack:** TanStack Start/Router 1.170.x (file routes via `tsr generate`, loaders + `useSuspenseQuery` SSR pattern), @tanstack/react-query 5.102.x, `@sevendays/api-client` (Hono RPC + `unwrap()` gate), Zod-validated shared types via `@sevendays/types`, Tailwind v4 (CSS-first, `packages/ui` tokens), Vitest 4 for the lib-seam suite, raw-CDP Node scenarios for page checks.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ Information architecture route table, § Testing Decisions) + ticket `.scratch/m2-booking-flow-tickets/06.md` (= GitHub issue #44, parent #37). The plan argues from the spec; executors read both.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-06-landing-content-pages`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges.
- **Scope fence (siblings share roadmap checkboxes):** ticket 06 delivers the home services-teaser + branches strips + credibility blurb, the `/services` `/branches` `/about` routes, and the harness extension (new scenario + scoping patch). NOT here: the booking form `/book` itself (#45 — deep-link hrefs exist across this ticket, the route doesn't until #45); `/booking/:id` (#46); Resend email (#47); the CMS (M5); any `apps/api`, `packages/db`, `packages/api-client`, or `packages/types` change — every read this ticket renders shipped in tickets 01/04 (`branchSchema`, `studioServiceWithBranchesSchema`, `branches.list()`, `studioServices.list()`), so NO `pnpm build:packages` is needed; any schema/migration/seed change; any visual design pass (M2's bar is data-complete, visually-rough — standing charting decision).
- **`docs/plan.md`'s "Landing pages: …" checkbox (line 65) spans tickets 05 (#43) + 06 (#44)** — per ticket-05's standing constraint, whoever closes the LATER of the two ticks it. This ticket IS the later: Task 6 ticks it with the ✅ emoji only after Tasks 1–5 are committed. GitHub issue #44's acceptance boxes stay owner-ticked — note the criterion→task mapping in the PR description, don't edit the issue.
- **Copy is pinned owner-ratified (clarify rounds 2026-09-08), verbatim everywhere it appears:** walk-in badge renders BOTH states — `Walk-ins welcome` when `acceptsWalkIns` is true, `No walk-ins` when false (owner choice: the negative state is explicit); home strip headings `Our services` and `Our branches`; the `/services` cross-reference line `Looking for add-ons? Makeup, hairstyle, and more can attach to your booking.`; `/about` story placeholder `Our studio story is coming soon.`; testimonials placeholder `What clients say is coming soon.`; home blurb placeholder `Our studio blurb is coming soon.` (derived from the ratified placeholder pattern — flagged for owner veto at PR review, same mechanism as ticket 05's `Packages` nav item); teaser strip-end link `View all services`; `/branches` CTA `Book at this branch` (spec-verbatim from the IA route table); offering-card CTAs read `Book now` (ticket-05 standing ruling, inherited); page h1s `Services` / `Branches` / `About` and section headings `Testimonials` / `Portfolio` (route-name-derived convention — veto-flagged). Story/blurb/testimonial placeholders carry `TODO(owner-copy)` comments at the call site — replaced when the client supplies copy (TODO(seed)-style posture). No other customer-presentable copy may be invented — anything new goes back to the owner.
- **Deep-link grammar is spec-pinned:** `/book?branch=${branch.id}` and `/book?service=${service.id}` (uuid ids, per the IA table's `?branch=&package=&service=`). Every one is a plain `<a>` — TanStack Router's typed `Link` resolves against the generated tree and `/book` doesn't exist until #45; each anchor carries the convert-in-#45 comment (ticket-05 ruling).
- **`peso` is the existing `src/lib/format.ts` helper — reused, not redefined.** Pinned outputs on this repo's Node 26 toolchain (ICU-complete, probed live 2026-09-08): `peso(150000)` = `₱1,500.00` (Photo Recovery), `peso(80000)` = `₱800.00` (Tarpaulin & Bulletin Printing), `peso(50000)` = `₱500.00` (Portraits & ID Photo), `peso(120000)` = `₱1,200.00` (Picture Framing). If a pinned literal fails on an executor's machine, the fix is a full-ICU Node environment — never edit the expectation.
- **Bookability-chip semantics are pinned and pure (tested, not eyeballed):** `bookableBranchNames(service, branches)` maps the service's `bookableBranchIds` to names in the branches read's order (the API serves name-ascending), and DROPS ids absent from the branches list (never rendered). Live seed state (`packages/db/scripts/catalog.ts` — never invent data): all four services bookable at all three branches; walk-in flags Calamba `false`, Iligan `false`, Dipolog `true`; branch phones are `TODO(seed)` placeholders and render verbatim.
- **Landing unit tests exist ONLY at the lib seam** (spec § Testing Decisions 5: no permanent page/unit harness in M2). This plan adds exactly one test file (`bookable-branches.test.ts` — suite goes 11 → 15). Page behavior (what a customer sees) is verified by the Task 5 CDP scenarios plus the milestone's end-to-end verification. Do not add route-level vitest suites.
- **Sentry spans on the new server function** (`.cursorrules`): wrap the handler body in `startSpan({ name: 'GET /api/v1/studio-services' }, ...)` exactly like the existing `getBranches`.
- **Biome-clean commits:** `pnpm exec biome check --write <files>` on every created/modified code file before committing (project `fix` scripts call the `biome` bin; `apps/landing/biome.json` covers `scripts/**` too — the CDP scenarios are linted, not exempt).
- **`noUncheckedIndexedAccess` is on:** index access in new code is guarded (`if (!row) ...`), never `!`.
- **CDP harness requirements (verification-only):** Chrome/Chromium with `--remote-debugging-port=9222`, `pnpm --filter @sevendays/api dev` (port 8787, seeded compose db), and the landing dev server (port 3000, `API_URL` set in `apps/landing/.env.local`). Scenarios are committed (owner ruling 2026-09-08: tickets 06–10 extend the same harness) and take URLs from `LANDING_VERIFY_URL` / `API_VERIFY_URL` (defaults `http://localhost:3000` / `http://127.0.0.1:8787`). Failures name the failing check and exit 1.
- **Commit style:** unscoped conventional subjects, bullet bodies when wordy; one commit per task.

---

## File Structure

```
apps/landing/src/lib/api.functions.ts              (mod, Task 1) + getStudioServices
apps/landing/src/lib/queries.ts                    (mod, Task 1) + studioServiceQueries
apps/landing/src/lib/bookable-branches.ts          (new, Task 1) bookableBranchNames — chip-order + unknown-id semantics
apps/landing/src/lib/bookable-branches.test.ts     (new, Task 1) 4 ordering/guard tests
apps/landing/src/components/walk-in-badge.tsx      (new, Task 2) both-state badge
apps/landing/src/components/branch-card.tsx        (new, Task 2) full card for /branches
apps/landing/src/components/branch-strip-item.tsx  (new, Task 2) home branches-strip item
apps/landing/src/components/service-card.tsx       (new, Task 2) full card for /services
apps/landing/src/components/service-teaser-item.tsx (new, Task 2) home teaser item
apps/landing/src/components/site-header.tsx        (mod, Task 2) nav + Services/Branches/About
apps/landing/src/routes/index.tsx                  (mod, Task 3) + teaser strip, branches strip, blurb
apps/landing/src/routes/services.tsx               (new, Task 4) /services
apps/landing/src/routes/branches.tsx               (new, Task 4) /branches
apps/landing/src/routes/about.tsx                  (new, Task 4) /about
apps/landing/src/routeTree.gen.ts                  (regen, Task 4) via pnpm generate-routes — never hand-edited
apps/landing/scripts/verify/packages-pages.mjs     (mod, Task 5) home article-count scoped to the featured-strip section
apps/landing/scripts/verify/content-pages.mjs      (new, Task 5) scenario for #44's surfaces
docs/plan.md                                       (mod, Task 6) landing-pages checkbox → - [✅]
docs/progress.md                                   (mod, Task 6) ticket-06 landed bullet
```

Component rule (inherited from ticket 05): pages compose the shared components; only layout/heading/copy text lives in routes. All data flows through `queries.ts` factories — no page imports `api.functions` directly.

---

### Task 1: Data layer — studio-services server fn, query factory, bookable-branch names (TDD)

**Files:**
- Create: `apps/landing/src/lib/bookable-branches.ts`, `apps/landing/src/lib/bookable-branches.test.ts`
- Modify: `apps/landing/src/lib/api.functions.ts`, `apps/landing/src/lib/queries.ts`

**Interfaces:**
- Consumes: `getApiClient().studioServices.list(): Promise<StudioServiceWithBranches[]>` (ticket-04 wrapper, `unwrap()`-gated) and the `Branch` / `StudioServiceWithBranches` types from `@sevendays/types`.
- Produces (Tasks 3–4 consume these exact names):
  - `api.functions.ts`: `getStudioServices(): Promise<StudioServiceWithBranches[]>` (no-arg server fn, Sentry span).
  - `queries.ts`: `studioServiceQueries.all()` → `queryOptions({ queryKey: ['studio-services'], queryFn })`.
  - `bookable-branches.ts`: `bookableBranchNames(service: StudioServiceWithBranches, branches: Branch[]): string[]`.

**Not here:** no route changes (Tasks 3–4), no components (Task 2), no branch-data changes (`branchQueries` / `getBranches` exist and are consumed as-is), no api-client or types changes.

- [ ] **Step 1: Write the failing test** — create `apps/landing/src/lib/bookable-branches.test.ts`:

```ts
import type { Branch, StudioServiceWithBranches } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { bookableBranchNames } from './bookable-branches';

function branch(name: string): Branch {
  return {
    id: crypto.randomUUID(),
    name,
    address: 'test address',
    phone: '+63 900 000 000',
    acceptsWalkIns: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function service(bookableBranchIds: string[]): StudioServiceWithBranches {
  return {
    id: crypto.randomUUID(),
    name: 'Photo Recovery',
    description: 'test service',
    priceCents: 150000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    bookableBranchIds,
  };
}

// The three live branches, in the API's name-ascending order.
const CALAMBA = branch('Calamba Main Branch');
const ILIGAN = branch('Iligan Branch');
const DIPOLOG = branch('Dipolog Branch');
const BRANCHES = [CALAMBA, ILIGAN, DIPOLOG];

describe('bookableBranchNames', () => {
  it('orders chip names by the branches read, not the service id order', () => {
    const s = service([DIPOLOG.id, CALAMBA.id]);
    expect(bookableBranchNames(s, BRANCHES)).toEqual([
      'Calamba Main Branch',
      'Dipolog Branch',
    ]);
  });

  it('drops ids absent from the branches list (never rendered)', () => {
    const s = service([CALAMBA.id, crypto.randomUUID()]);
    expect(bookableBranchNames(s, BRANCHES)).toEqual(['Calamba Main Branch']);
  });

  it('empty bookability renders no chips', () => {
    expect(bookableBranchNames(service([]), BRANCHES)).toEqual([]);
  });

  it('all three branches render all three names in list order', () => {
    const s = service([DIPOLOG.id, ILIGAN.id, CALAMBA.id]);
    expect(bookableBranchNames(s, BRANCHES)).toEqual([
      'Calamba Main Branch',
      'Iligan Branch',
      'Dipolog Branch',
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sevendays/landing test`
Expected: FAIL — cannot resolve `./bookable-branches` (4 existing files still pass; the failure is the missing module).

- [ ] **Step 3: Implement `bookable-branches.ts`** — create `apps/landing/src/lib/bookable-branches.ts`:

```ts
import type { Branch, StudioServiceWithBranches } from '@sevendays/types';

/**
 * Branch-name chips for a Studio Service card (/services): the branches this
 * service is bookable at, in the branches read's order (name-ascending from
 * the API) — chip order is stable regardless of the service's id order.
 * Ids missing from the branches list are dropped, never rendered.
 */
export function bookableBranchNames(
  service: StudioServiceWithBranches,
  branches: Branch[],
): string[] {
  const bookable = new Set(service.bookableBranchIds);
  return branches.filter((b) => bookable.has(b.id)).map((b) => b.name);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (15 tests — 11 existing + 4 new).

- [ ] **Step 5: Add the server function and query factory** — extend `apps/landing/src/lib/api.functions.ts` (keep everything already there untouched) with:

```ts
export const getStudioServices = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/studio-services' }, async () => {
    return getApiClient().studioServices.list();
  });
});
```

Then extend `apps/landing/src/lib/queries.ts` — add `getStudioServices` to the existing import from `./api.functions` and append:

```ts
export const studioServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['studio-services'],
      queryFn: () => getStudioServices(),
    }),
};
```

- [ ] **Step 6: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/bookable-branches.ts src/lib/bookable-branches.test.ts src/lib/api.functions.ts src/lib/queries.ts
git add apps/landing/src/lib/bookable-branches.ts apps/landing/src/lib/bookable-branches.test.ts apps/landing/src/lib/api.functions.ts apps/landing/src/lib/queries.ts
git commit -m "feat(landing): studio-services data layer + bookable-branch chip names"
```

(Body bullets: `getStudioServices server fn + studioServiceQueries factory — the read wrapper itself landed in ticket 04. bookableBranchNames pins chip order to the branches read and drops unknown ids. Lib-seam tests 11 → 15 (spec § Testing Decisions 5).`)

### Task 2: Shared page components (presentational)

**Files:**
- Create: `apps/landing/src/components/walk-in-badge.tsx`, `apps/landing/src/components/branch-card.tsx`, `apps/landing/src/components/branch-strip-item.tsx`, `apps/landing/src/components/service-card.tsx`, `apps/landing/src/components/service-teaser-item.tsx`
- Modify: `apps/landing/src/components/site-header.tsx`

**Interfaces:**
- Consumes: `peso(cents: number): string` (existing `src/lib/format.ts`), `bookableBranchNames(service, branches)` (Task 1), `Branch` + `StudioServiceWithBranches` from `@sevendays/types`.
- Produces (Tasks 3–4 consume these exact names):
  - `WalkInBadge({ acceptsWalkIns }: { acceptsWalkIns: boolean })` — renders `Walk-ins welcome` or `No walk-ins` (both states explicit, owner-ratified).
  - `BranchCard({ branch }: { branch: Branch })` — name, address, phone, badge, `Book at this branch` deep link (`/book?branch=<uuid>`).
  - `BranchStripItem({ branch }: { branch: Branch })` — name, address, badge (no phone; the strip pins address + badge only, per spec).
  - `ServiceCard({ service, branchNames }: { service: StudioServiceWithBranches; branchNames: string[] })` — name, price, description, bookability chips, `Book now` deep link (`/book?service=<uuid>`). Branch names are passed in pre-resolved — the component takes no branches prop, so /services resolves via `bookableBranchNames` before rendering (single call site, single convention).
  - `ServiceTeaserItem({ service }: { service: StudioServiceWithBranches })` — name, price, `Book now` deep link.
  - `SiteHeader()` — nav gains `Services`, `Branches`, `About`.

**Not here:** no routes (Tasks 3–4), no data fetching (components receive props only), no component unit tests — page-level rendering is verified by the Task 5 CDP scenarios (spec § Testing Decisions 5).

- [ ] **Step 1: Create `walk-in-badge.tsx`**

```tsx
// Walk-in badge with BOTH states explicit (owner-ratified): customers on a
// booking-only branch must see the negative, not silence. Visible text so the
// CDP scenario can assert both states against the live seed.
export function WalkInBadge({ acceptsWalkIns }: { acceptsWalkIns: boolean }) {
  const label = acceptsWalkIns ? 'Walk-ins welcome' : 'No walk-ins';
  return <span className='rounded-full border px-2 py-0.5 text-xs'>{label}</span>;
}
```

- [ ] **Step 2: Create `branch-card.tsx`**

```tsx
import type { Branch } from '@sevendays/types';
import { WalkInBadge } from './walk-in-badge';

// Full branch card (/branches): address, phone, walk-in badge, and the
// branch deep link — spec's /branches row verbatim. Branch phones are
// TODO(seed) placeholders and render verbatim until the client supplies
// real numbers.
export function BranchCard({ branch }: { branch: Branch }) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-6'>
      <h3 className='font-semibold text-xl'>{branch.name}</h3>
      <p className='text-neutral-700'>{branch.address}</p>
      <p className='text-neutral-700'>{branch.phone}</p>
      <WalkInBadge acceptsWalkIns={branch.acceptsWalkIns} />
      {/* Plain anchor: /book arrives with ticket #45; convert to typed Links then. */}
      <a
        href={`/book?branch=${branch.id}`}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Book at this branch
      </a>
    </article>
  );
}
```

- [ ] **Step 3: Create `branch-strip-item.tsx`**

```tsx
import type { Branch } from '@sevendays/types';
import { WalkInBadge } from './walk-in-badge';

// Home branches-strip item: address + walk-in badge only (the strip's
// spec-pinned shape — the full card is /branches' job).
export function BranchStripItem({ branch }: { branch: Branch }) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-4'>
      <h3 className='font-semibold'>{branch.name}</h3>
      <p className='text-neutral-700'>{branch.address}</p>
      <WalkInBadge acceptsWalkIns={branch.acceptsWalkIns} />
    </article>
  );
}
```

- [ ] **Step 4: Create `service-card.tsx`**

```tsx
import type { StudioServiceWithBranches } from '@sevendays/types';
import { peso } from '../lib/format';

// Studio Service card (/services): description + price + per-branch
// bookability chips + the add-on cross-reference rendered by the route
// (spec's /services row). Bookability names arrive pre-resolved — the
// component takes no branches prop (single call-site convention).
export function ServiceCard({
  service,
  branchNames,
}: {
  service: StudioServiceWithBranches;
  branchNames: string[];
}) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-6'>
      <h3 className='font-semibold text-xl'>{service.name}</h3>
      <p className='font-medium text-lg'>{peso(service.priceCents)}</p>
      <p className='text-neutral-700'>{service.description}</p>
      <div className='flex flex-wrap gap-1'>
        {branchNames.map((name) => (
          <span key={name} className='rounded-full border px-2 py-0.5 text-xs'>
            {name}
          </span>
        ))}
      </div>
      {/* Plain anchor: /book arrives with ticket #45; convert to typed Links then. */}
      <a
        href={`/book?service=${service.id}`}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Book now
      </a>
    </article>
  );
}
```

- [ ] **Step 5: Create `service-teaser-item.tsx`**

```tsx
import type { StudioServiceWithBranches } from '@sevendays/types';
import { peso } from '../lib/format';

// Home teaser item (owner-ratified shape): name + price + Book now deep
// link — user story 7 (book from any page via service deep links).
export function ServiceTeaserItem({ service }: { service: StudioServiceWithBranches }) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-4'>
      <h3 className='font-semibold'>{service.name}</h3>
      <p className='font-medium'>{peso(service.priceCents)}</p>
      {/* Plain anchor: /book arrives with ticket #45; convert to typed Links then. */}
      <a
        href={`/book?service=${service.id}`}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Book now
      </a>
    </article>
  );
}
```

- [ ] **Step 6: Update `site-header.tsx`** — replace the `nav` block (brand `Link` and the Book-now anchor stay untouched):

```tsx
      <nav className='flex items-center gap-6'>
        {/* Plain anchors: /book arrives with ticket #45; convert to typed Links then. */}
        <a href='/packages' className='hover:underline'>
          Packages
        </a>
        <a href='/services' className='hover:underline'>
          Services
        </a>
        <a href='/branches' className='hover:underline'>
          Branches
        </a>
        <a href='/about' className='hover:underline'>
          About
        </a>
        <a href='/book' className='rounded-md bg-neutral-900 px-4 py-2 text-white'>
          Book now
        </a>
      </nav>
```

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/components/`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add apps/landing/src/components/
git commit -m "feat(landing): branch/service cards, strips, walk-in badge, expanded nav"
```

(Body bullets: `Walk-in badge renders both states (owner-ratified); strip items pin address+badge only; service cards render bookability as per-branch chips; deep links /book?branch= & /book?service= as plain anchors (#45 converts to typed Links).`)

---

### Task 3: Home — services teaser strip, branches strip, credibility blurb

**Files:**
- Modify: `apps/landing/src/routes/index.tsx`

**Interfaces:**
- Consumes: `servicePackageQueries.all()` + `studioServiceQueries.all()` (Task 1), `branchQueries.all()` (existing), `ServiceTeaserItem` + `BranchStripItem` (Task 2).
- Produces: home gains the `Our services` strip (teaser items + strip-end `View all services` link), the `Our branches` strip (address + badge items), and the blurb paragraph — copy per Global Constraints.

**Not here:** no /services /branches /about routes (Task 4), no featured-strip rework (Task 4's home edits are copy-only, below the strips), no booking CTA target (plain anchor per the standing ruling).

- [ ] **Step 1: Rewrite `apps/landing/src/routes/index.tsx`** — the whole file becomes:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { BranchStripItem } from '../components/branch-strip-item';
import { PackageCard } from '../components/package-card';
import { ServiceTeaserItem } from '../components/service-teaser-item';
import { SiteHeader } from '../components/site-header';
import { selectFeaturedPackages } from '../lib/featured';
import { branchQueries, servicePackageQueries, studioServiceQueries } from '../lib/queries';

export const Route = createFileRoute('/')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
  },
  component: Home,
});

function Home() {
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { heading, packages: strip } = selectFeaturedPackages(packages);

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <section className='mt-10 flex flex-col gap-4'>
        <h1 className='font-bold text-5xl'>Sevendays Photography</h1>
        {/* Plain anchor: /book arrives with ticket #45. */}
        <a
          href='/book'
          className='rounded-md bg-neutral-900 px-6 py-3 text-center text-white text-xl'
        >
          Book now
        </a>
      </section>
      {/* TODO(owner-copy): placeholder blurb — replaced when the client supplies copy. */}
      <p className='mt-8 text-neutral-700'>Our studio blurb is coming soon.</p>
      <section className='mt-12' data-strip='featured'>
        <h2 className='font-semibold text-2xl'>{heading}</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {strip.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
      <section className='mt-12' data-strip='services'>
        <h2 className='font-semibold text-2xl'>Our services</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s) => (
            <ServiceTeaserItem key={s.id} service={s} />
          ))}
        </div>
        {/* Plain anchor: /services exists as of this ticket. */}
        <a href='/services' className='mt-4 inline-block underline'>
          View all services
        </a>
      </section>
      <section className='mt-12' data-strip='branches'>
        <h2 className='font-semibold text-2xl'>Our branches</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b) => (
            <BranchStripItem key={b.id} branch={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/routes/index.tsx
git add apps/landing/src/routes/index.tsx
git commit -m "feat(landing): home services teaser + branches strips + credibility blurb"
```

(Body bullets: `Strips render from live API data (studio-services + branches reads); teaser items deep-link /book?service=<uuid>; strip-end View all services link; blurb is the owner-ratified placeholder (TODO(owner-copy)).`)

### Task 4: `/services`, `/branches`, `/about` routes

**Files:**
- Create: `apps/landing/src/routes/services.tsx`, `apps/landing/src/routes/branches.tsx`, `apps/landing/src/routes/about.tsx`
- Modify: `apps/landing/src/routeTree.gen.ts` (via `generate-routes` — never hand-edited)

**Interfaces:**
- Consumes: `studioServiceQueries.all()`, `branchQueries.all()`, `bookableBranchNames(service, branches)` (Task 1); `ServiceCard` + `BranchCard` (Task 2).
- Produces: three flat file routes `/services`, `/branches`, `/about` in the generated tree.

**Not here:** no booking CTA target (`/book` is #45), no portfolio content or real story/testimonial copy (M5/owner), no auth.

- [ ] **Step 1: Create `apps/landing/src/routes/services.tsx`**

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ServiceCard } from '../components/service-card';
import { SiteHeader } from '../components/site-header';
import { bookableBranchNames } from '../lib/bookable-branches';
import { branchQueries, studioServiceQueries } from '../lib/queries';

export const Route = createFileRoute('/services')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
  },
  component: ServicesPage,
});

function ServicesPage() {
  // The API serves only ACTIVE services here; inactive are invisible
  // (landing CONTEXT.md: Deactivated (Studio Service)).
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <h1 className='mt-10 font-bold text-4xl'>Services</h1>
      {/* One-line Add-on Services cross-reference (owner-ratified copy). */}
      <p className='mt-2 text-neutral-700'>
        Looking for add-ons? Makeup, hairstyle, and more can attach to your booking.
      </p>
      <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
        {services.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            branchNames={bookableBranchNames(s, branches)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/landing/src/routes/branches.tsx`**

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { BranchCard } from '../components/branch-card';
import { SiteHeader } from '../components/site-header';
import { branchQueries } from '../lib/queries';

export const Route = createFileRoute('/branches')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(branchQueries.all());
  },
  component: BranchesPage,
});

function BranchesPage() {
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <h1 className='mt-10 font-bold text-4xl'>Branches</h1>
      <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
        {branches.map((b) => (
          <BranchCard key={b.id} branch={b} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/landing/src/routes/about.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '../components/site-header';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <h1 className='mt-10 font-bold text-4xl'>About</h1>
      {/* TODO(owner-copy): static studio story — replaced when the client supplies copy. */}
      <p className='mt-4 text-neutral-700'>Our studio story is coming soon.</p>
      <section className='mt-10'>
        <h2 className='font-semibold text-2xl'>Testimonials</h2>
        {/* TODO(owner-copy): testimonial placeholders — client copy pending. */}
        <p className='mt-2 text-neutral-700'>What clients say is coming soon.</p>
      </section>
      <section className='mt-10'>
        <h2 className='font-semibold text-2xl'>Portfolio</h2>
        {/* Empty M5 drop-in slot: portfolio items render here when content lands. */}
        <div
          className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3'
          data-portfolio-grid
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Regenerate the route tree**

Run: `pnpm --filter @sevendays/landing generate-routes`
Expected: `src/routeTree.gen.ts` gains `/services`, `/branches`, `/about` (regenerated file is committed; it is biome-excluded).

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/routes/services.tsx src/routes/branches.tsx src/routes/about.tsx`
Expected: clean — the three flat routes resolve in the regenerated tree.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/src/routes/services.tsx apps/landing/src/routes/branches.tsx apps/landing/src/routes/about.tsx apps/landing/src/routeTree.gen.ts
git commit -m "feat(landing): /services, /branches, /about content pages"
```

(Body bullets: `/services renders the four Studio Services with per-branch bookability chips + the owner-ratified add-on cross-reference; /branches renders all 3 with address, phone, walk-in badge, "Book at this branch" deep link; /about carries the placeholder story/testimonials + the empty M5 portfolio grid.`)

---

### Task 5: CDP harness — scope ticket-05's home check + new content-pages scenario

> **Order matters:** Task 3's home change breaks ticket-05's committed scenario (its home check counts ALL `<article>`s; after Task 3 home renders 4 featured + 4 teaser + 3 strip-item articles = 11 ≠ 4). Step 1 scopes it BEFORE any live run.

**Files:**
- Modify: `apps/landing/scripts/verify/packages-pages.mjs`
- Create: `apps/landing/scripts/verify/content-pages.mjs`

**Interfaces:**
- Consumes: live stack — seeded API (port 8787), landing dev server (port 3000, `API_URL` in `apps/landing/.env.local`), Chrome/Chromium with `--remote-debugging-port=9222`; `connect()` from `scripts/verify/lib.mjs`. Reads `GET /api/v1/studio-services` + `GET /api/v1/branches` for expected data (re-derives everything; never hard-codes catalog values).
- Produces: `content-pages.mjs` — 16-check scenario for #44's surfaces; ticket-05's scenario stays green alongside the new strips. Both exit 1 on any failed check.

**Not here:** no booking-submit scenario (#45 extends the harness with one), no admin checks, no CI wiring (owner runs it at verification time), no permanent page unit tests (spec § Testing Decisions 5).

- [ ] **Step 1: Scope ticket-05's home article-count check** — in `apps/landing/scripts/verify/packages-pages.mjs`, replace:

```js
  const homeCards = await evaluate(`document.querySelectorAll('article').length`);
  check(
    'home: strip shows the expected featured cards',
    homeCards === strip.length,
    `expected ${strip.length}, got ${homeCards}`
  );
```

with:

```js
  // Ticket 06 added services/branches strips to home; count cards inside the
  // featured strip's section only (data-strip='featured').
  const homeCards = await evaluate(
    `document.querySelector("section[data-strip='featured']")?.querySelectorAll('article').length ?? 0`
  );
  check(
    'home: strip shows the expected featured cards',
    homeCards === strip.length,
    `expected ${strip.length}, got ${homeCards}`
  );
```

(The strip-ordering and deep-link checks on home are unaffected — package names/links are unique to the featured strip.)

- [ ] **Step 2: Create the scenario** — `apps/landing/scripts/verify/content-pages.mjs` (16 checks):

```js
// Scripted CDP checks for the landing content pages (issue #44). Read-only
// over the live stack: seeded API (8787) + landing dev (3000) + Chrome CDP
// (9222). All expectations are RE-DERIVED from the live API responses (not
// imported, not hard-coded). Seeded state this scenario leans on (like
// ticket-05's "live catalog has flags" check): walk-in flags include BOTH
// true and false (Calamba/Iligan false, Dipolog true).
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

async function main() {
  const [servicesRes, branchesRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/branches`),
  ]);
  const services = await servicesRes.json();
  const branches = await branchesRes.json();
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('seed drift: no studio services from the live API');
  }
  if (!Array.isArray(branches) || branches.length === 0) {
    throw new Error('seed drift: no branches from the live API');
  }
  const chipNamesFor = (s) =>
    branches.filter((b) => s.bookableBranchIds.includes(b.id)).map((b) => b.name);

  const page = await connect();
  const { go, text, evaluate, close } = page;

  // Home: strips + blurb
  await go(`${LANDING}/`);
  const home = await text();
  check(
    'home: services teaser strip renders the live services',
    services.every((s) => home.includes(s.name))
  );
  check(
    'home: branches strip renders all branches',
    branches.every((b) => home.includes(b.address))
  );
  check(
    'home: walk-in badges show both states (live seed has both)',
    home.includes('Walk-ins welcome') && home.includes('No walk-ins')
  );
  const teaserLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?service="]')].map(a => a.getAttribute('href'))`
  );
  check(
    'home: teaser items deep-link /book?service=<id>',
    services.every((s) => teaserLinks.includes(`/book?service=${s.id}`))
  );
  const viewAll = await evaluate(
    `[...document.querySelectorAll('a')].some(a => a.textContent.trim() === 'View all services' && a.getAttribute('href') === '/services')`
  );
  check('home: strip-end View all services links /services', viewAll === true);
  check(
    'home: credibility blurb placeholder visible',
    home.includes('Our studio blurb is coming soon.')
  );

  // /services: the offerings with bookability
  await go(`${LANDING}/services`);
  const servicesText = await text();
  const svcArticles = await evaluate(`
    (() => {
      const articles = [...document.querySelectorAll('article')];
      const services = ${JSON.stringify(services)};
      return services.map((s) => {
        const a = articles.find((el) => el.querySelector('h3')?.textContent === s.name);
        return a ? a.textContent : null;
      });
    })()
  `);
  check(
    '/services: every active service renders a card',
    svcArticles.length === services.length && svcArticles.every((t) => t !== null),
    `expected ${services.length}, got ${svcArticles.filter((t) => t !== null).length}`
  );
  check(
    '/services: prices visible (peso re-derived from the live API)',
    services.every((s, i) => svcArticles[i] !== null && svcArticles[i].includes(peso(s.priceCents)))
  );
  check(
    '/services: bookability chips carry the re-derived branch names',
    services.every((s, i) => {
      if (svcArticles[i] === null) return false;
      return chipNamesFor(s).every((n) => svcArticles[i].includes(n));
    })
  );
  check(
    '/services: one-line add-on cross-reference visible',
    servicesText.includes(
      'Looking for add-ons? Makeup, hairstyle, and more can attach to your booking.'
    )
  );
  const svcLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?service="]')].map(a => a.getAttribute('href'))`
  );
  check(
    '/services: cards deep-link /book?service=<id>',
    services.every((s) => svcLinks.includes(`/book?service=${s.id}`))
  );

  // /branches: address, phone, badge, deep link
  await go(`${LANDING}/branches`);
  const branchArticles = await evaluate(`
    (() => {
      const articles = [...document.querySelectorAll('article')];
      const branches = ${JSON.stringify(branches)};
      return branches.map((b) => {
        const a = articles.find((el) => el.querySelector('h3')?.textContent === b.name);
        return a ? a.textContent : null;
      });
    })()
  `);
  check(
    '/branches: all branches render name + address + phone',
    branchArticles.every((t, i) => {
      if (t === null) return false;
      return t.includes(branches[i].address) && t.includes(branches[i].phone);
    })
  );
  check(
    '/branches: walk-in badges show both states (live seed has both)',
    branchArticles.some((t, i) => t !== null && branches[i].acceptsWalkIns && t.includes('Walk-ins welcome')) &&
      branchArticles.some((t, i) => t !== null && !branches[i].acceptsWalkIns && t.includes('No walk-ins'))
  );
  const branchLinks = await evaluate(
    `[...document.querySelectorAll('a')].filter(a => a.textContent.trim() === 'Book at this branch').map(a => a.getAttribute('href'))`
  );
  check(
    '/branches: Book at this branch deep-links /book?branch=<id>',
    branches.every((b) => branchLinks.includes(`/book?branch=${b.id}`))
  );

  // /about: placeholders + empty portfolio grid
  await go(`${LANDING}/about`);
  const about = await text();
  const portfolioCount = await evaluate(
    `document.querySelector('[data-portfolio-grid]')?.querySelectorAll('article, img').length ?? null`
  );
  check(
    '/about: story + testimonial placeholders render',
    about.includes('Our studio story is coming soon.') &&
      about.includes('What clients say is coming soon.')
  );
  check(
    '/about: empty portfolio grid is the M5 drop-in slot',
    portfolioCount === 0,
    `grid articles/imgs: ${portfolioCount}`
  );

  close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('SCENARIO ERROR:', e.message);
  process.exit(1);
});
```

- [ ] **Step 3: Bring up the stack and run BOTH scenarios**

```bash
# Terminal A: seeded API on 8787 (its configured DATABASE_URL)
pnpm --filter @sevendays/api dev
# Terminal B: landing dev on 3000 (API_URL=http://127.0.0.1:8787 in apps/landing/.env.local)
pnpm --filter @sevendays/landing dev
# Terminal C: Chrome with CDP
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify
# Terminal D:
node apps/landing/scripts/verify/packages-pages.mjs   # ticket-05 regression: still exits 0
node apps/landing/scripts/verify/content-pages.mjs    # new: 16/16 checks passed, exit 0
```

Expected: ticket-05's scenario stays green (12/12) and the new scenario reports `16/16 checks passed`, exit 0.

- [ ] **Step 4: Lint and commit**

```bash
pnpm --filter @sevendays/landing exec biome check --write scripts/verify/
git add apps/landing/scripts/verify/
git commit -m "test(landing): content-pages CDP scenario + scoped ticket-05 home check"
```

(Body bullets: `16 checks for #44's surfaces, expectations re-derived from the live API; ticket-05's home article-count scoped to section[data-strip='featured'] since the new strips add articles to home; committed per the tickets 06–10 harness ruling.`)

---

### Task 6: Full gate + docs + handoff

**Files:**
- Modify: `docs/plan.md` (landing-pages checkbox → `- [✅]`), `docs/progress.md` (ticket-06 bullet)

**Interfaces:**
- Consumes: Tasks 1–5 complete and committed.

**Not here:** no GitHub issue edits (#44's acceptance boxes are the owner's — note the criterion→task mapping in the PR description), no PR (owner opens it), no ADR — this ticket introduces no new architectural decision (the chip-resolution convention, the strip-scoped harness check, and the TODO(owner-copy) placeholder posture are applications of standing rulings; deep-link grammar and page shapes are spec-pinned).

- [ ] **Step 1: Repo-wide gate**

```bash
pnpm check && pnpm build
```

Expected: green — including the landing app's `test` script (15 lib-seam tests), `lint`, `typecheck` across all apps/packages, and a clean `vite build` of the landing app (SSR bundle includes the three new routes).

- [ ] **Step 2: Verify the acceptance criteria mechanically**

```bash
node apps/landing/scripts/verify/content-pages.mjs   # if the Task 5 stack is still up
git log --oneline main..HEAD
```

Expected: `16/16 checks passed` (the scenario IS the mechanical proof of #44's four criteria — mapping below); one commit per task, all on `feat/m2-06-landing-content-pages`. Leave issue #44's checkboxes to the owner.

- [ ] **Step 3: Tick the `docs/plan.md` checkbox** — the landing-pages checkbox (line 65) spans tickets 05 (#43) + 06 (#44); this ticket is the later, so it ticks. Change:

```markdown
- [ ] Landing pages: home (featured strip, Studio Services teaser, branches strip), packages list, package detail by slug, branches, services (Studio Services showcase), about — reading from `apps/api`
```

to (✅ emoji per AGENTS.md, never plain `[x]`):

```markdown
- [✅] Landing pages: home (featured strip, Studio Services teaser, branches strip), packages list, package detail by slug, branches, services (Studio Services showcase), about — reading from `apps/api`
```

- [ ] **Step 4: Update `docs/progress.md`** — add one bullet to the landed-work list, directly after the ticket-05 bullet (keeps the landing tickets adjacent):

```markdown
- **M2 ticket 06 — landing content pages (#44 → .scratch/m2-booking-flow-tickets/06.md):** home gained the Studio Services teaser strip (`Our services`; items name + `peso` price + `Book now` deep link `/book?service=<uuid>`, strip-end `View all services` link), the branches strip (`Our branches`; address + walk-in badge), and the credibility-blurb placeholder. New routes: `/services` (four Studio Services, description + `peso` price + per-branch bookability chips via `bookableBranchNames` — branches-read order, unknown ids dropped — plus the owner-ratified add-on cross-reference line), `/branches` (all 3 branches: address, phone, walk-in badge with both states `Walk-ins welcome`/`No walk-ins`, "Book at this branch" deep link `/book?branch=<uuid>`), `/about` (story/testimonial placeholders TODO(owner-copy), empty portfolio grid as the M5 drop-in slot). Nav expanded (Packages/Services/Branches/About + Book now). Data layer: `getStudioServices` + `studioServiceQueries` joined the ticket-05 pattern; NO api/db/types changes (reads all pre-existing). Lib-seam tests 11 → 15 (`bookableBranchNames` ×4). CDP harness: new `content-pages.mjs` scenario (16 checks, expectations re-derived from the live API) + ticket-05's home check scoped to `section[data-strip='featured']` (the new strips would have broken its article count). Copy owner-ratified 2026-09-08 (clarify rounds); `Our studio blurb is coming soon.` derived from the ratified placeholder pattern (veto-flagged at PR review like ticket-05's `Packages` nav item). Full `pnpm check` + `pnpm build` green; live CDP runs green (ticket-05 regression + new scenario). `docs/plan.md`'s landing-pages checkbox ticked ✅ (spans tickets 05+06; 06 landed later). NOT landed: booking form `/book` (#45 — deep links exist, route doesn't), `/booking/:id` (#46), Resend email (#47).
```

- [ ] **Step 5: Commit the docs**

```bash
git add docs/plan.md docs/progress.md
git commit -m "docs: M2 ticket 06 landed — content pages; M2 landing-pages checkbox ticked"
```

---

## Acceptance criteria mapping (for the PR description)

- `/services renders the four offerings with per-branch bookability` → Task 4 (route + chips via `bookableBranchNames`) + Task 5 (live checks: cards, peso prices, chips, cross-reference, deep links).
- `/branches renders all 3 branches with address, phone, walk-in badge, and working Book deep link` → Tasks 2/4 (`BranchCard`) + Task 5 (live checks incl. per-id `/book?branch=` href assertions).
- `/about renders story + testimonial placeholders + empty portfolio grid` → Task 4 (route) + Task 5 (placeholder + empty-grid checks).
- `Home teaser/branches strips render from live API data` → Task 3 (strips over `studioServiceQueries`/`branchQueries`) + Task 5 (live checks re-derived from API responses).


