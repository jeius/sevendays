# M2 Ticket 05 — Landing Packages Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The landing site's packages surfaces go live over the real API — home hero with Book-now CTA and the featured strip (`is_featured`, price ascending; fallback first-4-by-price when none flagged), `/packages` listing every active package as full-detail cards, `/packages/:slug` with description, price, inclusions (frames, print sizes, attires) and a placeholder cover panel — plus package deep links into the future booking form, the prototype's server functions and query-key factories folded into the real build, the glossary branch content landed, and a committed scripted CDP check harness (GitHub issue #43, parent spec #37).

**Architecture:** Pure frontend ticket on `apps/landing` — the API reads it needs (packages list with resolved inclusions, by-slug) landed in ticket 04. The prototype's landing data layer (`getServicePackages` server fn + `servicePackageQueries` factory, prototype ruling: fold in, shared-schema-validated at the seam) is recreated against the real api-client, extended with `getServicePackageBySlug(slug)` and a `bySlug(slug)` query option (404s must not be cached — unknown slugs stay 404s on every visit). A tiny shared `format.ts` promotes the prototype's `peso` helper verbatim. Pages are server-rendered via loaders using `queryClient.ensureQueryData` (the pre-flight pattern); unknown slugs map `ApiClientError(404)` → TanStack Router `notFound()` → a route-level `notFoundComponent`. UI behavior is verified by a committed raw-CDP script (prototype `prototype-verify` prior art) — no permanent page unit harness in M2 (spec § Testing Decisions 5).

**Tech Stack:** TanStack Start/Router 1.170.x (file routes via `tsr generate`, loaders + `useSuspenseQuery` SSR pattern), @tanstack/react-query 5.102.x, `@sevendays/api-client` (Hono RPC + `unwrap()` gate), Zod-validated shared types via `@sevendays/types`, Tailwind v4 (CSS-first, `packages/ui` tokens), Vitest 4 for the two lib-level unit suites, raw-CDP Node script for page checks.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ Information architecture, § Shared client, § Testing Decisions) + ticket `.scratch/m2-booking-flow-tickets/05.md` (= GitHub issue #43, parent #37). The plan argues from the spec; executors read both.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-05-landing-packages-pages`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges.
- **Task order is fixed:** Task 1 lands the glossary docs FIRST, as its own commit before any code commit — the spec makes the glossary a precondition ("merges or its content lands before or with this build"). If either cherry-pick conflicts, STOP and hand back to the owner (context re-reads may be needed); do not hand-merge past a conflict.
- **Scope fence (siblings share roadmap checkboxes):** ticket 05 delivers home hero + featured strip, `/packages`, `/packages/:slug`, deep-link hrefs, the folded-in data layer, glossary landing, and the CDP harness. NOT here: ticket #44's home strips (Studio Services teaser, branches strip, credibility blurb) and its `/services`, `/branches`, `/about` routes; the booking form `/book` itself (#45 — the CTA links exist but the route doesn't until #45); `/booking/:id` (#46); Resend email (#47); any `apps/api`, `packages/db`, `packages/api-client`, or `packages/types` change (reads suffice; the api-client mock is untouched — it mirrors the API, not pages); any schema/migration/seed change.
- **`docs/plan.md`'s "Landing pages: home (featured strip, …), packages list, package detail by slug, …" checkbox spans tickets 05 (#43) + 06 (#44)** — it stays unticked until BOTH land; whoever closes the later of the two ticks it with the ✅ emoji. GitHub issue #43's acceptance boxes are the owner's to tick — note the criterion mapping in the PR description, don't edit the issue.
- **Copy is pinned owner-ratified (2026-09-08), verbatim everywhere it appears:** hero headline `Sevendays Photography`; ALL booking CTAs (hero + every card + detail page) read `Book now`; featured heading `Featured packages`, switching to `Our packages` when the fallback path renders; detail inclusions heading `Inclusions`; cover placeholder text `Cover photo coming soon`; not-found copy `Package not found.` with a `Browse all packages` link to `/packages`; the `/packages` nav item and the `/packages` page h1 read `Packages` (route-name-derived — the one copy string NOT owner-ratified; flagged for owner veto at PR review). No tagline anywhere. No other customer-presentable copy is invented — anything new goes back to the owner.
- **CTA deep links are `/book?package=${p.id}` (uuid, per the spec's deep-link table)** — #45's wizard consumes `?package=`; pre-#45 the href is verified as a well-formed link only (the CDP check asserts the href, not a landing page). Branch deep links come with #44's branches strip; this ticket adds package links only.
- **`peso` is the prototype helper verbatim** (spec residual: prototype `peso`/`phDateTime` promoted to shared landing helpers; this ticket needs only `peso` — `phDateTime` arrives with the form/confirmation tickets):

```ts
export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
```

  Pinned outputs on this repo's Node 26 toolchain (ICU-complete): `peso(90000)` = `₱900.00`, `peso(110000)` = `₱1,100.00`, `peso(150000)` = `₱1,500.00`, `peso(160000)` = `₱1,600.00`. If the pinned literals fail on an executor's machine, the fix is a full-ICU Node environment — never edit the expectation.
- **Featured-strip ordering is pinned and pure (tested, not eyeballed):** `featured = packages.filter(p => p.isFeatured)` sorted by `priceCents` ascending; if `featured.length === 0`, fall back to ALL active packages sorted by `priceCents` ascending, `slice(0, 4)`; ties break by `name` ascending. With the owner-approved seeded catalog (`docs/catalog.md`; never invent data) the featured path renders Basic ₱900.00 → Package A ₱1,100.00 → Package B ₱1,500.00 → Package C ₱1,600.00, and a no-flags catalog renders the same four under the `Our packages` heading.
- **Slug URLs are stable under renames by construction:** the route keys on `servicePackages.slug` (seed/server-assigned from the name, never rewritten on rename — the schema's own contract). No page may key a URL or query on package name or id.
- **Unknown/inactive slug = uniform not-found:** `getServicePackageBySlug` throws `ApiClientError` with `status === 404` (API wording `'Package not found.'`, pinned in ticket 04); the `$slug` loader catches exactly `ApiClientError` with `status === 404` and throws TanStack Router's `notFound()`; everything else propagates to the router error boundary.
- **Landing unit tests exist ONLY at the lib seam** (`format.test.ts`, `featured.test.ts`, `package-slug.test.ts` — spec § Testing Decisions 5: no permanent page/unit harness in M2). Page behavior (what a customer sees) is verified by the Task 6 CDP script plus the milestone's end-to-end verification. Do not add route-level vitest suites beyond these three files.
- **`packages/types` is untouched by this plan** — every shape these pages render (`servicePackageWithInclusionsSchema`, `resolvedInclusionSchema`, `resolvedFrameSchema`) already exists. No `pnpm build:packages` needed (its `dist/` is current from ticket 04).
- **Sentry spans on every new server function** (`.cursorrules`): wrap the handler body in `startSpan({ name: 'GET /api/v1/...' }, ...)` exactly like the existing `getBranches`.
- **Biome-clean commits:** `pnpm exec biome check --write <files>` on every created/modified code file before committing (project `fix` scripts call the `biome` bin; `apps/landing/biome.json` covers `scripts/**` too — the CDP harness is linted, not exempt).
- **`noUncheckedIndexedAccess` is on:** index access in new code is guarded (`if (!row) ...`), never `!`.
- **CDP harness requirements (verification-only):** Chrome/Chromium with `--remote-debugging-port=9222`, `pnpm --filter @sevendays/api dev` (port 8787), and the landing dev server (port 3000, `API_URL` set in `apps/landing/.env.local`). The scripts are committed (owner ruling 2026-09-08: tickets 06–10 extend the same harness) and take the landing base URL from `LANDING_VERIFY_URL` (default `http://localhost:3000`). Failures name the failing check and exit 1.
- **Commit style:** unscoped conventional subjects, bullet bodies when wordy; one commit per task.

---

## File Structure

```
apps/landing/CONTEXT.md                            (mod, Task 1) + glossary terms from docs/booking-flow-glossary
apps/api/CONTEXT.md                                (mod, Task 1) + glossary terms from docs/booking-flow-glossary
apps/landing/vitest.config.ts                      (new, Task 2) node env, src/**/*.test.ts include
apps/landing/package.json                          (mod, Task 2) + "test": "vitest run", + devDeps vitest
apps/landing/src/lib/format.ts                     (new, Task 2) peso — prototype helper verbatim
apps/landing/src/lib/format.test.ts                (new, Task 2) 3 pinned-output tests
apps/landing/src/lib/api.functions.ts              (mod, Task 2) + getServicePackages, getServicePackageBySlug
apps/landing/src/lib/queries.ts                    (mod, Task 2) + servicePackageQueries.all / .bySlug(slug)
apps/landing/src/lib/featured.ts                     (new, Task 4) selectFeaturedPackages + heading constants
apps/landing/src/lib/featured.test.ts                (new, Task 4) fallback ordering + fallback/featured headings contract
apps/landing/src/lib/package-slug.ts                 (new, Task 5) toNotFoundError — 404 → router notFound mapping
apps/landing/src/lib/package-slug.test.ts            (new, Task 5) bySlug happy path + 404-no-cache + $slug loader notFound mapping
apps/landing/src/components/site-header.tsx        (new, Task 3) brand + nav (Packages, Book now)
apps/landing/src/components/package-card.tsx       (new, Task 3) full-detail card + Book now deep link
apps/landing/src/components/inclusions-list.tsx    (new, Task 3) frames / print sizes / attires rendering
apps/landing/src/components/cover-panel.tsx        (new, Task 3) initials placeholder panel
apps/landing/src/routes/index.tsx                  (mod, Task 4) hero + Book-now CTA + featured strip + fallback
apps/landing/src/routes/packages/index.tsx         (new, Task 5) /packages — all active packages
apps/landing/src/routes/packages/$slug.tsx         (new, Task 5) /packages/:slug + notFoundComponent
apps/landing/src/routeTree.gen.ts                  (regen, Task 5) via pnpm generate-routes — never hand-edited
apps/landing/scripts/verify/lib.mjs                (new, Task 6) CDP driver (jsonHttp/evaluate/go/text/click helpers)
apps/landing/scripts/verify/packages-pages.mjs     (new, Task 6) 10-check scenario for #43's surfaces
docs/progress.md                                   (mod, Task 7) ticket-05 landed bullet
```

Component rule: pages compose the four shared components; only layout/heading/copy text lives in routes. All data flows through `queries.ts` factories — no page imports `api.functions` directly.

---

### Task 1: Land the glossary branch content (doc duty — spec precondition)

**Files:**
- Modify: `apps/landing/CONTEXT.md`
- Modify: `apps/api/CONTEXT.md`

**Interfaces:**
- Consumes: branch `docs/booking-flow-glossary` — commits `fb8eef2` (landing CONTEXT.md: Studio Service term + Services page term + generalized Booking flow) and `2255a09` (api CONTEXT.md: generalized Add-on Service / Appointment + Deactivated (Studio Service)).
- Produces: both CONTEXT.md files carrying the drafted glossary terms on this branch — issue #43's "Glossary branch content landed" criterion, satisfied without merging the docs branch itself (its content lands with this ticket per the spec's "or").

**Not here:** no code, no page copy (page copy is owner-ratified in Global Constraints), no edits to `docs/plan.md` checkboxes, no merge of `docs/booking-flow-glossary` itself.

- [ ] **Step 1: Cut the feature branch from up-to-date main**

```bash
git checkout main && git pull --ff-only && git checkout -b feat/m2-05-landing-packages-pages
```

- [ ] **Step 2: Cherry-pick the two glossary commits (landing first, api second)**

```bash
git cherry-pick fb8eef2 2255a09
```

Expected: both apply cleanly (they touch only `apps/landing/CONTEXT.md` and `apps/api/CONTEXT.md`; neither file changed on `main` since the branch diverged — verified pre-plan: `git diff main...docs/booking-flow-glossary --stat` shows exactly those two files, +29/−4).

- [ ] **Step 3: On conflict, stop — do not hand-merge**

If either pick conflicts: `git cherry-pick --abort`, then report back to the owner. The glossary wording is owner-drafted; an agent-resolved conflict risks silently editing owner language.

- [ ] **Step 4: Verify the landed terms**

```bash
grep -c "Studio Service" apps/landing/CONTEXT.md apps/api/CONTEXT.md
```

Expected: `apps/landing/CONTEXT.md` contains the **Studio Service**, **Services page**, and generalized **Booking flow** terms; `apps/api/CONTEXT.md` contains the generalized **Add-on Service**, **Appointment**, and **Deactivated (Studio Service)** terms (the grep count is ≥2 in each file — read both files to confirm the six entries, not just the count).

- [ ] **Step 5: Commit**

```bash
git add apps/landing/CONTEXT.md apps/api/CONTEXT.md
git commit -m "docs: land booking-flow glossary terms in both contexts' CONTEXT.md"
```

(Body bullet: `Content of docs/booking-flow-glossary (fb8eef2, 2255a09) — issue #43 doc duty; the docs branch itself stays unmerged.`)

---

### Task 2: Landing data layer — server functions, query factories, `peso` (TDD)

**Files:**
- Create: `apps/landing/vitest.config.ts`, `apps/landing/src/lib/format.ts`, `apps/landing/src/lib/format.test.ts`
- Modify: `apps/landing/package.json`, `apps/landing/src/lib/api.functions.ts`, `apps/landing/src/lib/queries.ts`

**Interfaces:**
- Consumes: `getApiClient().servicePackages.list(): Promise<ServicePackageWithInclusions[]>` and `.bySlug(args: { param: { slug: string } }): Promise<ServicePackageWithInclusions>` (ticket 04's wrappers, `unwrap()`-gated; `ApiClientError` from `@sevendays/api-client` carries `status`).
- Produces (Tasks 4 and 5 consume these exact names):
  - `format.ts`: `export function peso(cents: number): string` (verbatim body in Global Constraints).
  - `api.functions.ts`: `getServicePackages(): Promise<ServicePackageWithInclusions[]>`, `getServicePackageBySlug(slug: string): Promise<ServicePackageWithInclusions>` (takes the bare string, wraps it in `{ param: { slug } }` internally — callers never touch RPC arg shapes).
  - `queries.ts`: `servicePackageQueries.all()` → `queryOptions({ queryKey: ['service-packages'], queryFn })`, and `servicePackageQueries.bySlug(slug: string)` → `queryOptions({ queryKey: ['service-packages', 'by-slug', slug], queryFn, retry: false, staleTime: Infinity })` — the 404 contract: a rejected (non-404-too) fetch is NOT cached, so an unknown slug re-fetches on every visit while a success caches.

**Not here:** no route changes (Tasks 4–5), no components (Task 3), no featured/selection logic (that lives beside the queries in Task 4 — the data layer stays selection-free), no api-client changes.

- [ ] **Step 1: Write the failing test for `peso`** — create `apps/landing/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { peso } from './format';

describe('peso', () => {
  it('renders a package price the way every page shows it', () => {
    expect(peso(110000)).toBe('₱1,100.00');
  });

  it('renders the cheapest seeded package exactly', () => {
    expect(peso(90000)).toBe('₱900.00');
  });

  it('keeps cents exact (no rounding drift)', () => {
    expect(peso(12550)).toBe('₱125.50');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @sevendays/landing exec vitest run src/lib/format.test.ts`
Expected: FAIL — cannot resolve `./format` (the vitest config doesn't exist yet either; install deps first, Step 3 covers config — order within the red phase: write config + deps so the runner exists, then see THIS test fail on the missing module).

- [ ] **Step 3: Add the test harness** — in `apps/landing/package.json`: add `"test": "vitest run"` (replacing the `"echo \"no tests yet\" && exit 0"` script) and add `"vitest": "^4.1.11"` to `devDependencies` (then `pnpm install`). Create `apps/landing/vitest.config.ts`:

```ts
import { baseConfig } from '@sevendays/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write the minimal implementation** — create `apps/landing/src/lib/format.ts` with exactly the `peso` body from Global Constraints, plus this header comment above it:

```ts
// Money display for the landing site — promoted verbatim from the prototype
// (wayfinder #33, spec residual). Cent-denominated ints in, peso string out.
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (3 tests).

- [ ] **Step 6: Add the two server functions** — extend `apps/landing/src/lib/api.functions.ts` (keep `getBranches` and its comment untouched):

```ts
export const getServicePackages = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/service-packages' }, async () => {
    return getApiClient().servicePackages.list();
  });
});

/**
 * Package detail by slug. Takes the bare slug string (route param) and wraps
 * it into the RPC arg shape here, so route loaders never see the envelope.
 * Unknown/inactive slugs reject with ApiClientError(404) — the loader maps
 * that to the router's notFound().
 */
export const getServicePackageBySlug = createServerFn()
  .validator((input: string) => input)
  .handler(async ({ data }) => {
    return startSpan({ name: 'GET /api/v1/service-packages/:slug' }, async () => {
      return getApiClient().servicePackages.bySlug({ param: { slug: data } });
    });
  });

<!-- AMENDED AT EXECUTION (2026-09-08): the original snippet used a bare
`handler(async (slug: string) => ...)` — impossible on @tanstack/start-client-core
1.170.x, whose handlers always receive an options object ({ context, data, method,
serverFnMeta }; verified against its shipped type tests). The validator + `{ data }`
shape above is the required form; callers pass `{ data: slug }`. -->
```

- [ ] **Step 7: Add the query factory** — extend `apps/landing/src/lib/queries.ts` (keep `branchQueries` untouched):

```ts
export const servicePackageQueries = {
  all: () =>
    queryOptions({
      queryKey: ['service-packages'],
      queryFn: () => getServicePackages(),
    }),
  /**
   * Detail by slug. `retry: false` + `staleTime: Infinity` encode the 404
   * contract: an unknown slug must never be cached (revisit = re-fetch, the
   * 404 stays a 404), while a fetched package lives for the session.
   */
  bySlug: (slug: string) =>
    queryOptions({
      queryKey: ['service-packages', 'by-slug', slug],
      queryFn: () => getServicePackageBySlug(slug),
      retry: false,
      staleTime: Infinity,
    }),
};
```

- [ ] **Step 8: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/format.ts src/lib/format.test.ts src/lib/api.functions.ts src/lib/queries.ts vitest.config.ts package.json
git add apps/landing/vitest.config.ts apps/landing/package.json apps/landing/src/lib/format.ts apps/landing/src/lib/format.test.ts apps/landing/src/lib/api.functions.ts apps/landing/src/lib/queries.ts pnpm-lock.yaml
git commit -m "feat(landing): packages data layer — server fns, query factories, shared peso helper"
```

(Body bullets: `Prototype's getServicePackages + query-key factories fold in per the spec ruling; extended with getServicePackageBySlug + bySlug(slug) — 404s uncached (retry:false, staleTime:Infinity). peso promoted verbatim from the prototype. Vitest harness added to the landing app (lib-seam tests only, spec § Testing Decisions 5).`)

### Task 3: Shared page components (presentational)

**Files:**
- Create: `apps/landing/src/components/site-header.tsx`, `apps/landing/src/components/package-card.tsx`, `apps/landing/src/components/inclusions-list.tsx`, `apps/landing/src/components/cover-panel.tsx`

**Interfaces:**
- Consumes: `peso(cents: number): string` (Task 2), `ServicePackageWithInclusions` + `ResolvedPackageInclusion` from `@sevendays/types`.
- Produces (Tasks 4–5 consume these exact names):
  - `SiteHeader()` — brand + nav.
  - `PackageCard({ pkg }: { pkg: ServicePackageWithInclusions })` — cover panel, name, price, description, inclusions, `Book now` deep link.
  - `InclusionsList({ pkg }: { pkg: ServicePackageWithInclusions })` — `Inclusions` heading + frames/prints/privileges rendering.
  - `CoverPanel({ name }: { name: string })` — initials placeholder + `Cover photo coming soon`.

**Not here:** no routes (Tasks 4–5), no data fetching (components receive props only), no component unit tests — page-level rendering is verified by the Task 6 CDP script (spec § Testing Decisions 5); the testable logic these components call (`peso`, selection, 404 mapping) is tested in Tasks 2/4/5.

**Deliberate `<a>`-not-`<Link>` ruling:** every `/book` deep link (and the header's nav links) is a plain anchor, because TanStack Router's `Link` `to` is typed against the generated route tree and `/book` does not exist until ticket #45. A typed `Link` here cannot typecheck. Converting to typed Links is a #45 follow-up; each anchor carries that comment.

- [ ] **Step 1: Create `site-header.tsx`**

```tsx
import { Link } from '@tanstack/react-router';

// Site-wide header: brand + primary nav. M2's bar is data-complete,
// visually-rough — plain flex, no design pass (spec non-goal).
export function SiteHeader() {
  return (
    <header className='flex items-center justify-between p-6'>
      <Link to='/' className='font-bold text-xl'>
        Sevendays Photography
      </Link>
      <nav className='flex items-center gap-6'>
        {/* Plain anchor: /book arrives with ticket #45; convert to typed Links then. */}
        <a href='/packages' className='hover:underline'>
          Packages
        </a>
        <a
          href='/book'
          className='rounded-md bg-neutral-900 px-4 py-2 text-white'
        >
          Book now
        </a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create `cover-panel.tsx`**

```tsx
// Placeholder cover panel (spec: initials block until R2 cover photos, M5).
// The placeholder line is VISIBLE text so the CDP check can assert it.
export function CoverPanel({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div className='flex h-40 flex-col items-center justify-center gap-1 rounded-md bg-neutral-200'>
      <span className='font-bold text-3xl text-neutral-500'>{initials}</span>
      <span className='text-neutral-500 text-xs'>Cover photo coming soon</span>
    </div>
  );
}
```

- [ ] **Step 3: Create `inclusions-list.tsx`**

```tsx
import type {
  ResolvedPackageInclusion,
  ServicePackageWithInclusions,
} from '@sevendays/types';

/**
 * Inclusions per the detail spec: frames (each framed picture hangs off its
 * frame — ADR-0009), then prints (count × size), then privileges
 * (quantityless). Plain lists, no design pass.
 */
export function InclusionsList({ pkg }: { pkg: ServicePackageWithInclusions }) {
  const framed = pkg.inclusions.filter((i) => i.kind === 'framed_picture');
  const prints = pkg.inclusions.filter((i) => i.kind === 'print');
  const privileges = pkg.inclusions.filter((i) => i.kind === 'privilege');

  return (
    <div className='flex flex-col gap-2'>
      <h4 className='font-semibold'>Inclusions</h4>
      {pkg.frames.map((frame) => {
        const inFrame = framed.filter((i) => i.frameId === frame.id);
        if (inFrame.length === 0) return null;
        return (
          <div key={frame.id}>
            <p className='font-medium'>Frame {frame.frameNumber}</p>
            <ul className='list-disc pl-6'>
              {inFrame.map((i) => (
                <InclusionLine key={i.id} inclusion={i} />
              ))}
            </ul>
          </div>
        );
      })}
      <ul className='list-disc pl-6'>
        {prints.map((i) => (
          <InclusionLine key={i.id} inclusion={i} />
        ))}
        {privileges.map((i) => (
          <InclusionLine key={i.id} inclusion={i} />
        ))}
      </ul>
    </div>
  );
}

function InclusionLine({ inclusion }: { inclusion: ResolvedPackageInclusion }) {
  const size = inclusion.printSize ? inclusion.printSize.code : null;
  const attires =
    inclusion.attires.length > 0
      ? inclusion.attires.map((a) => a.name).join(', ')
      : null;
  const parts = [
    inclusion.quantity !== null ? `×${inclusion.quantity}` : null,
    size,
    inclusion.description,
    attires,
  ].filter((part): part is string => part !== null);
  return <li>{parts.join(' · ')}</li>;
}
```

- [ ] **Step 4: Create `package-card.tsx`**

```tsx
import type { ServicePackageWithInclusions } from '@sevendays/types';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { InclusionsList } from './inclusions-list';

// Full-detail package card (spec: /packages shows full details, no separate
// detail navigation needed from listings) — reused on the home strip and the
// detail page.
export function PackageCard({ pkg }: { pkg: ServicePackageWithInclusions }) {
  return (
    <article className='flex flex-col gap-3 rounded-lg border p-6'>
      <CoverPanel name={pkg.name} />
      <h3 className='font-semibold text-xl'>{pkg.name}</h3>
      <p className='font-medium text-lg'>{peso(pkg.priceCents)}</p>
      <p className='text-neutral-700'>{pkg.description}</p>
      <InclusionsList pkg={pkg} />
      {/* Plain anchor: /book arrives with ticket #45 (deep link ?package=<id>). */}
      <a
        href={`/book?package=${pkg.id}`}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Book now
      </a>
    </article>
  );
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/components/`
Expected: clean (no type errors — `Link to='/'` resolves because the `/` route exists in the generated tree).

- [ ] **Step 6: Commit**

```bash
git add apps/landing/src/components/
git commit -m "feat(landing): shared package card, inclusions, cover, header components"
```

---

### Task 4: Home — hero, Book-now CTA, featured strip with fallback (TDD)

**Files:**
- Create: `apps/landing/src/lib/featured.ts`, `apps/landing/src/lib/featured.test.ts`
- Modify: `apps/landing/src/routes/index.tsx`

**Interfaces:**
- Consumes: `servicePackageQueries.all()` (Task 2), `PackageCard` + `SiteHeader` (Task 3), `ServicePackageWithInclusions` type.
- Produces: `selectFeaturedPackages(packages: ServicePackageWithInclusions[]): { heading: string; packages: ServicePackageWithInclusions[] }`; exports `FEATURED_HEADING = 'Featured packages'`, `FALLBACK_HEADING = 'Our packages'`, `FEATURED_COUNT = 4`. Task 6's CDP script re-derives (not imports) this rule against live API data.

**Not here:** no Studio Services teaser / branches strip / credibility blurb (#44's home slices — the probe page's branch rendering dies here and `branchQueries` stays unconsumed until #44), no `/packages` routes (Task 5), no booking CTA target (plain anchor per Task 3's ruling).

- [ ] **Step 1: Write the failing tests** — create `apps/landing/src/lib/featured.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ServicePackageWithInclusions } from '@sevendays/types';
import {
  FALLBACK_HEADING,
  FEATURED_HEADING,
  selectFeaturedPackages,
} from './featured';

let n = 0;
function pkg(
  overrides: Partial<ServicePackageWithInclusions> = {},
): ServicePackageWithInclusions {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    name: `Package ${n}`,
    description: 'test package',
    priceCents: 100000,
    durationMinutes: null,
    isActive: true,
    coverImageKey: null,
    slug: `package-${n}`,
    isFeatured: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    inclusions: [],
    frames: [],
    ...overrides,
  };
}

// The owner-approved seeded catalog's first four, pinned for the narrative
// tests (docs/catalog.md — never invent data in place of these).
const BASIC = { name: 'Basic Package', priceCents: 90000, slug: 'basic-package', isFeatured: true };
const A = { name: 'Package A', priceCents: 110000, slug: 'package-a', isFeatured: true };
const B = { name: 'Package B', priceCents: 150000, slug: 'package-b', isFeatured: true };
const C = { name: 'Package C', priceCents: 160000, slug: 'package-c', isFeatured: true };

describe('selectFeaturedPackages', () => {
  it('featured path: only flagged packages, price ascending, featured heading', () => {
    const result = selectFeaturedPackages([
      pkg(C),
      pkg(BASIC),
      pkg({ name: 'Package D', priceCents: 200000 }),
      pkg(A),
      pkg(B),
    ]);
    expect(result.heading).toBe(FEATURED_HEADING);
    expect(result.packages.map((p) => p.slug)).toEqual([
      'basic-package',
      'package-a',
      'package-b',
      'package-c',
    ]);
  });

  it('featured path is not capped at four (the cap belongs to the fallback)', () => {
    const five = [pkg(BASIC), pkg(A), pkg(B), pkg(C), pkg({ name: 'Package D', priceCents: 200000, isFeatured: true })];
    const result = selectFeaturedPackages(five);
    expect(result.packages).toHaveLength(5);
  });

  it('fallback path: no flags → first four by price, fallback heading', () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      pkg({ name: `P${i + 1}`, priceCents: 100000 + i * 10000 }),
    );
    const result = selectFeaturedPackages(eleven);
    expect(result.heading).toBe(FALLBACK_HEADING);
    expect(result.packages).toHaveLength(4);
    expect(result.packages.map((p) => p.name)).toEqual(['P1', 'P2', 'P3', 'P4']);
  });

  it('fallback ties break by name ascending', () => {
    const result = selectFeaturedPackages([
      pkg({ name: 'Zeta', priceCents: 90000 }),
      pkg({ name: 'Alpha', priceCents: 90000 }),
    ]);
    expect(result.packages.map((p) => p.name)).toEqual(['Alpha', 'Zeta']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sevendays/landing test`
Expected: FAIL — cannot resolve `./featured`.

- [ ] **Step 3: Implement `featured.ts`**

```ts
import type { ServicePackageWithInclusions } from '@sevendays/types';

// Home featured strip (spec: is_featured, price ascending; fallback
// first-4-by-price when none flagged; heading switch owner-ratified).
export const FEATURED_HEADING = 'Featured packages';
export const FALLBACK_HEADING = 'Our packages';
export const FEATURED_COUNT = 4;

export function selectFeaturedPackages(
  packages: ServicePackageWithInclusions[],
): { heading: string; packages: ServicePackageWithInclusions[] } {
  const byPrice = (a: ServicePackageWithInclusions, b: ServicePackageWithInclusions) =>
    a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  const featured = packages.filter((p) => p.isFeatured).sort(byPrice);
  if (featured.length > 0) {
    return { heading: FEATURED_HEADING, packages: featured };
  }
  return {
    heading: FALLBACK_HEADING,
    packages: [...packages].sort(byPrice).slice(0, FEATURED_COUNT),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (7 tests total — 3 `peso` + 4 featured).

- [ ] **Step 5: Rewrite `apps/landing/src/routes/index.tsx`** (the probe page dies):

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PackageCard } from '../components/package-card';
import { SiteHeader } from '../components/site-header';
import { selectFeaturedPackages } from '../lib/featured';
import { servicePackageQueries } from '../lib/queries';

export const Route = createFileRoute('/')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(servicePackageQueries.all());
  },
  component: Home,
});

function Home() {
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
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
      <section className='mt-12'>
        <h2 className='font-semibold text-2xl'>{heading}</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {strip.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/featured.ts src/lib/featured.test.ts src/routes/index.tsx
git add apps/landing/src/lib/featured.ts apps/landing/src/lib/featured.test.ts apps/landing/src/routes/index.tsx
git commit -m "feat(landing): home hero + featured packages strip with fallback"
```

(Body bullets: `is_featured, price ascending; fallback first-4-by-price under the owner-ratified "Our packages" heading; ties by name. Probe page replaced. Branches/services teaser strips are #44.`)

### Task 5: `/packages` + `/packages/:slug` — routes and the 404 mapping (TDD)

**Files:**
- Create: `apps/landing/src/lib/package-slug.ts`, `apps/landing/src/lib/package-slug.test.ts`, `apps/landing/src/routes/packages/index.tsx`, `apps/landing/src/routes/packages/$slug.tsx`
- Modify: `apps/landing/src/routeTree.gen.ts` (via `generate-routes` — never hand-edited)

**Interfaces:**
- Consumes: `servicePackageQueries.all()` / `.bySlug(slug)` (Task 2), `PackageCard` + `SiteHeader` (Task 3), `ApiClientError` from `@sevendays/api-client`, `notFound()`/`isNotFound()` from `@tanstack/react-router` (1.170.x — presence spike-verified pre-plan).
- Produces: `toNotFoundError(err: unknown): unknown` — returns `notFound()` for `ApiClientError(404)`, otherwise returns the error untouched; two file routes `/packages/` and `/packages/$slug` (the `$slug` param is the stable URL key).

**Not here:** no booking CTA target route (`/book` is #45), no branch/package cross-links beyond the card CTA (branch links are #44), no auth of any kind.

- [ ] **Step 1: Write the failing tests** — create `apps/landing/src/lib/package-slug.test.ts`:

```ts
import { ApiClientError } from '@sevendays/api-client';
import type { ServicePackageWithInclusions } from '@sevendays/types';
import { isNotFound } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { getServicePackageBySlug } from './api.functions';
import { toNotFoundError } from './package-slug';
import { servicePackageQueries } from './queries';

// The seam, not the network: the server fn is mocked so these tests prove
// query-factory + 404-mapping behavior without a Start runtime. Page-level
// rendering is the Task 6 CDP script's job (spec § Testing Decisions 5).
vi.mock('./api.functions', () => ({
  getServicePackageBySlug: vi.fn(),
}));

const mockedGet = vi.mocked(getServicePackageBySlug);

function basicPackage(): ServicePackageWithInclusions {
  return {
    slug: 'basic-package',
    priceCents: 90000,
  } as ServicePackageWithInclusions;
}

describe('servicePackageQueries.bySlug', () => {
  it('happy path: returns the fetched package (bare slug passed through)', async () => {
    const pkg = basicPackage();
    mockedGet.mockResolvedValueOnce(pkg);
    await expect(
      servicePackageQueries.bySlug('basic-package').queryFn(),
    ).resolves.toBe(pkg);
    expect(mockedGet).toHaveBeenCalledWith({ data: 'basic-package' });
  });

  it('404 contract: a rejected slug is NOT cached — each visit re-fetches', async () => {
    const err = new ApiClientError(404, { error: 'Package not found.' });
    mockedGet.mockRejectedValue(err);
    const queryFn = servicePackageQueries.bySlug('gone-package').queryFn;
    await expect(queryFn()).rejects.toBe(err);
    await expect(queryFn()).rejects.toBe(err);
    expect(mockedGet).toHaveBeenCalledTimes(2);
    const options = servicePackageQueries.bySlug('gone-package');
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBe(Infinity);
  });
});

describe('toNotFoundError', () => {
  it('maps ApiClientError(404) to the router not-found error', () => {
    const err = new ApiClientError(404, { error: 'Package not found.' });
    expect(isNotFound(toNotFoundError(err))).toBe(true);
  });

  it('passes everything else through untouched', () => {
    const serverErr = new ApiClientError(500, { error: 'Internal Server Error' });
    expect(toNotFoundError(serverErr)).toBe(serverErr);
    const plain = new Error('plain');
    expect(toNotFoundError(plain)).toBe(plain);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sevendays/landing test`
Expected: FAIL — cannot resolve `./package-slug`.

- [ ] **Step 3: Implement `package-slug.ts`**

```ts
import { ApiClientError } from '@sevendays/api-client';
import { notFound } from '@tanstack/react-router';

/**
 * Loader seam for /packages/$slug: unknown/inactive slugs reject with
 * ApiClientError(404) (ticket 04's pinned wording). Map exactly that to the
 * router's not-found error so the route's notFoundComponent renders;
 * anything else (500, network, Zod drift) propagates to the error boundary
 * untouched.
 */
export function toNotFoundError(err: unknown): unknown {
  if (err instanceof ApiClientError && err.status === 404) {
    return notFound();
  }
  return err;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (11 tests — 3 `peso` + 4 featured + 4 by-slug/404).

- [ ] **Step 5: Create the two routes** — `apps/landing/src/routes/packages/index.tsx`:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PackageCard } from '../../components/package-card';
import { SiteHeader } from '../../components/site-header';
import { servicePackageQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(servicePackageQueries.all());
  },
  component: PackagesPage,
});

function PackagesPage() {
  // The API serves only ACTIVE packages here; inactive are invisible
  // (landing CONTEXT.md: Deactivated (Service Package)).
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <h1 className='mt-10 font-bold text-4xl'>Packages</h1>
      <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
        {packages.map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </div>
    </div>
  );
}
```

And `apps/landing/src/routes/packages/$slug.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PackageCard } from '../../components/package-card';
import { SiteHeader } from '../../components/site-header';
import { toNotFoundError } from '../../lib/package-slug';
import { servicePackageQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/$slug')({
  loader: async ({ params, context: { queryClient } }) => {
    try {
      return await queryClient.ensureQueryData(
        servicePackageQueries.bySlug(params.slug),
      );
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  component: PackageDetail,
  // Unknown/inactive slug → uniform not-found (owner-ratified copy).
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mt-16 flex flex-col items-center gap-4'>
        <h1 className='font-semibold text-2xl'>Package not found.</h1>
        {/* Plain anchor: keeps the not-found page dependency-free. */}
        <a href='/packages' className='underline'>
          Browse all packages
        </a>
      </div>
    </div>
  ),
});

function PackageDetail() {
  const pkg = Route.useLoaderData();

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mx-auto mt-10 max-w-2xl'>
        <PackageCard pkg={pkg} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Regenerate the route tree**

Run: `pnpm --filter @sevendays/landing generate-routes`
Expected: `src/routeTree.gen.ts` gains the `/packages/` and `/packages/$slug` routes (regenerated file is committed; it is biome-excluded).

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/package-slug.ts src/lib/package-slug.test.ts src/routes/packages/`
Expected: clean — including the typed `Route.useLoaderData()` and the `$slug` loader's param inference through the generated tree.

- [ ] **Step 8: Commit**

```bash
git add apps/landing/src/lib/package-slug.ts apps/landing/src/lib/package-slug.test.ts apps/landing/src/routes/packages/ apps/landing/src/routeTree.gen.ts
git commit -m "feat(landing): /packages list + slug detail with uniform not-found"
```

(Body bullets: `Detail URLs keyed on slug (stable under renames); ApiClientError(404) maps to the router notFound() — owner copy "Package not found." + browse link; bySlug 404s never cached.`)

---

### Task 6: Scripted CDP verification harness (committed, tickets 06–10 extend it)

> **AMENDED AT EXECUTION (2026-09-08):** the scenario snippet below originally hard-coded `peso(90000)` and `'Basic Package'` — contradicting this task's own "never hard-codes catalog values" Interfaces line (plan defect; caught in review). The committed harness derives both: `cheapest = Math.min(...packages.map(p => p.priceCents))` and `basic.name` from the live API response. Snippet corrected accordingly. The scenario ships **12 checks** (the 10/11 counts in the File Structure and Interfaces lines are stale; committed file is the truth).

**Files:**
- Create: `apps/landing/scripts/verify/lib.mjs`, `apps/landing/scripts/verify/packages-pages.mjs`

**Interfaces:**
- Consumes: live stack — seeded API (port 8787), landing dev server (port 3000, `API_URL` in `apps/landing/.env.local`), Chrome/Chromium with `--remote-debugging-port=9222`. Reads `GET /api/v1/service-packages` for expected data (re-derives the featured rule; never hard-codes catalog values).
- Produces: `connect()` from `scripts/verify/lib.mjs` → `{ send, evaluate, wait, go, text, close }` — the driver surface tickets 06–10 reuse. The scenario exits 1 on any failed check.

**Not here:** no booking-submit scenario (#45 extends the harness with one), no admin checks, no CI wiring (owner runs it at verification time — same posture as the prototype), no permanent page unit tests (spec § Testing Decisions 5).

- [ ] **Step 1: Create the driver** — `apps/landing/scripts/verify/lib.mjs` (adapted from the prototype's `cdp-drive.mjs`; evaluate now THROWS so scenario catches map to FAIL):

```js
// Verification driver for the landing pages' scripted CDP checks (issue #43;
// prior art: the prototype's prototype-verify scripts). Raw CDP over Node's
// built-in WebSocket — no browser-automation dependency. Committed by owner
// ruling (2026-09-08): tickets 06–10 extend this harness. Needs Chrome/
// Chromium on --remote-debugging-port=9222.
const CDP_HTTP = process.env.CDP_HTTP ?? 'http://127.0.0.1:9222';

async function jsonHttp(path, opts) {
  const res = await fetch(`${CDP_HTTP}${path}`, opts);
  return res.json();
}

export async function connect() {
  const targets = await jsonHttp('/json/list');
  let page = targets.find((t) => t.type === 'page');
  if (!page) {
    page = await jsonHttp(`/json/new?${encodeURIComponent('about:blank')}`, {
      method: 'PUT',
    });
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  function send(method, params = {}) {
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return new Promise((res) => pending.set(msgId, res));
  }
  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.result?.exceptionDetails) {
      throw new Error(
        r.result.exceptionDetails.exception?.description ?? 'eval failed',
      );
    }
    return r.result?.result?.value;
  }
  const wait = (ms) => evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);
  async function go(url) {
    await send('Page.enable');
    await send('Page.navigate', { url });
    await evaluate(
      `new Promise((res) => { if (document.readyState === 'complete') res(1); else addEventListener('load', () => res(1)); })`,
    );
    await wait(1500);
  }
  const text = () => evaluate('document.body.innerText');
  const close = () => ws.close();
  return { send, evaluate, wait, go, text, close };
}
```

- [ ] **Step 2: Create the scenario** — `apps/landing/scripts/verify/packages-pages.mjs` (11 checks):

```js
// Scripted CDP checks for the landing packages surfaces (issue #43). Read-
// only over the live stack: seeded API (8787) + landing dev (3000) + Chrome
// CDP (9222). The featured rule and peso are RE-DERIVED here (not imported)
// so the script verifies deployed pages, not build artifacts — keep the two
// in sync via this comment.
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function selectFeatured(packages) {
  const byPrice = (a, b) =>
    a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  const featured = packages.filter((p) => p.isFeatured).sort(byPrice);
  if (featured.length > 0) return featured;
  return [...packages].sort(byPrice).slice(0, 4);
}

const cheapest = Math.min(...packages.map((p) => p.priceCents));

const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
    cents / 100,
  );

async function main() {
  const res = await fetch(`${API}/api/v1/service-packages`);
  const packages = await res.json();
  const strip = selectFeatured(packages);
  const basic = packages.find((p) => p.slug === 'basic-package');
  if (!basic) throw new Error('seed drift: basic-package missing from the live API');

  const page = await connect();
  const { go, text, evaluate, close } = page;

  // Home: hero, CTA, featured strip
  await go(`${LANDING}/`);
  const home = await text();
  check('home: hero headline', home.includes('Sevendays Photography'));
  const heroCta = await evaluate(
    `[...document.querySelectorAll('a')].some(a => a.textContent.trim() === 'Book now' && a.getAttribute('href') === '/book')`,
  );
  check('home: Book-now CTA deep-links /book', heroCta === true);
  check(
    'home: featured heading (live catalog has flags)',
    home.includes('Featured packages'),
  );
  const homeCards = await evaluate(`document.querySelectorAll('article').length`);
  check(
    'home: strip shows the expected featured cards',
    homeCards === strip.length,
    `expected ${strip.length}, got ${homeCards}`,
  );
  const positions = strip.map((p) => home.indexOf(p.name));
  check(
    'home: strip ordered price-ascending',
    positions.every((pos, i) => pos >= 0 && (i === 0 || positions[i - 1] < pos)),
  );
  const stripLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?package="]')].map(a => a.getAttribute('href'))`,
  );
  check(
    'home: strip cards deep-link /book?package=<id>',
    strip.every((p) => stripLinks.includes(`/book?package=${p.id}`)),
  );

  // /packages: every active package, full details
  await go(`${LANDING}/packages`);
  const listText = await text();
  const listCards = await evaluate(`document.querySelectorAll('article').length`);
  check(
    '/packages: every active package renders',
    listCards === packages.length,
    `expected ${packages.length}, got ${listCards}`,
  );
  check(
    '/packages: full details (cheapest price + inclusions visible)',
    listText.includes(peso(cheapest)) && listText.includes('Inclusions')
  );

  // /packages/:slug: by-slug detail + deep link
  await go(`${LANDING}/packages/basic-package`);
  const detail = await text();
  check(
    '/packages/:slug renders by slug (name, price, cover placeholder, inclusions)',
    detail.includes(basic.name) &&
      detail.includes(peso(basic.priceCents)) &&
      detail.includes('Cover photo coming soon') &&
      detail.includes('Inclusions')
  );
  const detailLink = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?package="]')].map(a => a.getAttribute('href'))[0] ?? null`,
  );
  check('detail: deep link targets the uuid', detailLink === `/book?package=${basic.id}`);

  // Unknown slug: uniform not-found
  await go(`${LANDING}/packages/not-a-real-slug`);
  const missing = await text();
  check(
    'unknown slug: uniform not-found (owner copy + browse link)',
    missing.includes('Package not found.') && missing.includes('Browse all packages'),
  );
  check('unknown slug: not an error boundary', !missing.includes('Error'));

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

- [ ] **Step 3: Bring up the stack and run the scenario**

```bash
# Terminal A: seeded API on 8787 (its configured DATABASE_URL)
pnpm --filter @sevendays/api dev
# Terminal B: landing dev on 3000 (API_URL=http://127.0.0.1:8787 in apps/landing/.env.local)
pnpm --filter @sevendays/landing dev
# Terminal C: Chrome with CDP
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify
# Terminal D:
node apps/landing/scripts/verify/packages-pages.mjs
```

Expected: `11/11 checks passed`, exit 0.

**Fallback-path note (AC "fallback path verified when none are flagged"):** the live API is seeded with 4 featured packages, so the script exercises the featured path live; the fallback path is proven by Task 4's unit tests (heading switch, first-4-by-price, cap, ties). To see the fallback live, temporarily unset the flags in the DB, re-run the script's home section (expect `Our packages`), and restore — read-only posture otherwise; this spot-check is optional and never part of the committed script.

**Known failure mode (pre-approved fix):** if `/packages/basic-package` fails because the GET server fn rejects arg-passing at runtime, switch `getServicePackageBySlug` to `createServerFn({ method: 'POST' })` — the prototype's proven arg shape (`createAppointment` posts with a validator + `{ data }`); the validator/handler bodies stay identical.

- [ ] **Step 4: Lint and commit**

```bash
pnpm --filter @sevendays/landing exec biome check --write scripts/verify/
git add apps/landing/scripts/verify/
git commit -m "test(landing): scripted CDP checks for the packages pages"
```

(Body bullets: `Committed per owner ruling — tickets 06–10 extend this harness; prototype prototype-verify prior art; read-only, exits 1 on any failed check.`)

### Task 7: Full gate + docs + handoff

**Files:**
- Modify: `docs/progress.md`

**Interfaces:**
- Consumes: Tasks 1–6 complete and committed.

**Not here:** no `docs/plan.md` checkbox ticks (the landing-pages box spans tickets 05 (#43) + 06 (#44) and stays unticked until BOTH land), no GitHub issue edits, no PR (owner opens it), no ADR — this ticket introduces no new architectural decision (the featured rule, the by-slug 404 mapping, the uncached-bySlug posture, and the committed CDP harness are applications of the spec's standing rulings, not choices; the `<a>`-not-`<Link>` ruling is a temporary constraint documented at the call sites, revisited in #45).

- [ ] **Step 1: Repo-wide gate**

```bash
pnpm check && pnpm build
```

Expected: green — including the landing app's new `test` script (11 lib-seam tests), `lint`, `typecheck` across all apps/packages, and a clean `vite build` of the landing app (SSR bundle includes the two new routes).

- [ ] **Step 2: Verify the two remaining acceptance criteria mechanically**

```bash
grep -c "Studio Service" apps/landing/CONTEXT.md apps/api/CONTEXT.md
git log --oneline main..HEAD
```

Expected: the grep confirms Task 1's landed glossary terms (AC: "Glossary branch content landed"); the log shows one commit per task, all on `feat/m2-05-landing-packages-pages` (AC: "Detail URLs are slug-keyed" is proven by Task 5's routes + Task 6's by-slug checks). Leave issue #43's checkboxes to the owner — note the criterion→task mapping in the PR description when the owner asks for the handoff summary.

- [ ] **Step 3: Update `docs/progress.md`** — add one bullet to the landed-work list (ticket-04 sibling style; place it newest-adjacent, i.e. directly after the ticket-04 bullet):

```markdown
- **M2 ticket 05 — landing packages pages (#43 → .scratch/m2-booking-flow-tickets/05.md):** home hero + Book-now CTA + featured strip (`is_featured`, price ascending, ties by name; none flagged → first-4-by-price under the "Our packages" heading — heading switch owner-ratified 2026-09-08), `/packages` (all active packages, full-detail cards), `/packages/:slug` (description, `peso` price, Inclusions by frame/print/privilege, initials cover placeholder "Cover photo coming soon"). Detail URLs keyed on slug (rename-stable); `ApiClientError(404)` → router `notFound()` → owner copy "Package not found." + browse link; `bySlug` query options `retry: false` + `staleTime: Infinity` so a 404 is never cached. Deep links `/book?package=<uuid>` as plain anchors (typed Links wait for #45's route). Prototype's `getServicePackages` + query-key factories folded in; extended with `getServicePackageBySlug` + `bySlug(slug)`; `peso` promoted verbatim; landing gained a vitest harness — lib-seam tests only (11: peso ×3, featured-selection ×4, bySlug/404-mapping ×4), spec § Testing Decisions 5. Glossary landed: both contexts' CONTEXT.md carry the drafted terms (cherry-picked fb8eef2 + 2255a09; the docs branch itself stays unmerged). Committed CDP harness `apps/landing/scripts/verify/` (driver + 11-check scenario, read-only, exit 1 on failure) — owner ruling: tickets 06–10 extend it; live run 11/11 green against the seeded API. Full `pnpm check` + `pnpm build` green. NOT landed: home services teaser/branches strip/credibility blurb + /services /branches /about (#44), the booking form itself (#45) — `docs/plan.md`'s landing-pages checkbox stays unticked until #44.
```

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md
git commit -m "docs: M2 ticket 05 landed — landing packages pages"
```

---

## Acceptance criteria mapping (for the PR description)

- Home shows featured packages with prices; fallback path verified when none are flagged → Tasks 4 (unit: both paths, ordering, cap, ties) + 6 (live: featured path; fallback spot-check optional).
- `/packages` lists all active packages with full details; `/packages/:slug` renders by slug with inclusions → Tasks 5 (routes) + 6 (live checks).
- Detail URLs are slug-keyed and stable under catalog renames → Task 5 (route keys on `slug` only; Global Constraints: no page keys on name/id).
- Landing UI verified by scripted browser checks (CDP-style, prototype prior art) — no permanent unit harness in M2 → Task 6 (committed scenario) + Global Constraints (lib-seam tests only).
- Glossary branch content landed; contexts' CONTEXT.md carry the drafted terms → Task 1.

