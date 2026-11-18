# Plan: #322 — Admin logo: login lockup reads site settings; sidebar rail sliver fixed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The uploaded studio logo renders in the admin login lockup (bug A) and stops squishing to a 15×36 sliver in the sidebar's collapsed icon rail (bug B) — both surfaces riding ONE pure brand-lockup seam.

**Architecture:** A new lib-seam module (`#/lib/brand-lockup`) holds the resolved lockup model (logo URL / brand name / monogram fallback, defaults through `resolveSiteSettings`) plus the pinned class vocabulary for the rail posture, the chip geometry guard, and the fit ruling. The sidebar brand block and the login `AdminLockup` both consume it; the login route adopts the shell loader's guarded site-settings prime so SSR paints the brand. No API work — `logoImageUrl` already resolves on the wire; bug A is purely a consumer gap.

**Tech Stack:** TanStack Start + TanStack Query (admin), Tailwind v4 class vocabulary, vitest plain-node lib-seam tests (the admin suite's posture — no DOM tests).

**Spec:** GitHub issue #322 (its "Fix plan" section is authoritative); full diagnosis preserved at `.scratch/logo-diagnosis-2026-11-18/FINDINGS.md` (gitignored — the issue quotes its substance).

## Scope fences

**In scope (admin chrome only):** the shared brand-lockup seam + its lib-seam pins; the sidebar brand block (`admin-sidebar.tsx`); the login lockup + its loader prime (`login.tsx`); docs/floors/graphify.

**NOT here (siblings / out of scope):**

- Route `<title>` metas (`'X | Sevendays Admin'` across `_shell.*.tsx`, `login_.reset.tsx`) — tool names in the browser tab, not brand chrome; the brand-suffix seam is the landing's #224 ruling. Untouched.
- `login_.reset.tsx` renders no lockup (meta only) — untouched.
- The Site tab's logo editor + preview (`site-tab.tsx`) — already `object-contain p-1`; it is the fit precedent, not a fix site.
- The landing's logo surfaces — their own chrome (#223), already correct; zero landing files.
- Zero api / api-client / packages edits — `logoImageUrl` resolves at the API (ADR-0019); bug A is the admin consumer never reading it. No DB/DDL/deps/secrets.
- No ADR — no architectural choice here; every piece follows an existing pattern (the lib-seam convention, the shell's guarded prime, the footer row's rail classes).
- #238 / #222 / #192 — untouched, no shared roadmap checkbox rides this fix.
- No v1 pick/ledger work in this branch — post-merge, main-only (`docs/agents/v1-picks.md`).

## Owner rulings

- **Logo fit: bare `object-contain`, NO padding — owner-ruled 2026-11-18** (this plan's clarify round: contain confirmed, and the `p-1` hair of padding explicitly ruled OUT — "it's a logo, no padding"). The uploaded logo is 751×492 ≈ 1.53:1; a 36×36 `object-cover` box center-crops its sides, and contain shows it whole. The Site tab's editor preview keeps its own `object-contain p-1` (out of scope — its fit LAW agrees; only the chrome is ruled here). If the owner ever flips to cover: exactly ONE constant changes (`LOGO_IMG_CLASSES`) plus its one pin — nothing else.
- **Login wordmark:** the resolved `brandName` (not the literal `'Sevendays'`) — that IS the ticket's stated fix ("same pattern the sidebar already uses"). The `Admin` kicker stays fixed on both surfaces — it names the tool, not the brand (the sidebar's existing #223 ruling).

## Global Constraints

- Verbatim values this plan introduces (use exactly; do not paraphrase):
  - `LOCKUP_MONOGRAM = '7d'`
  - `BRAND_ROW_RAIL_CLASSES = 'group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0'`
  - `LOGO_CHIP_GEOMETRY_CLASSES = 'shrink-0 group-data-[collapsible=icon]:size-8'`
  - `LOGO_IMG_CLASSES = 'size-full object-contain'` (bare contain, NO padding — the owner's 2026-11-18 ruling)
  - Every comment block in the tasks is written out in full — land it verbatim.
- Per-task gates: `pnpm --filter @sevendays/admin test -- --run` AND `pnpm --filter @sevendays/admin typecheck` — both green before each task's commit. Final gate: `pnpm check` green at the repo root (lint + format + typecheck + test). Do not commit code that fails it for the packages/apps touched.
- No `packages/*` source edits in this plan. On a fresh clone only, run `pnpm build:packages` first (AGENTS.md); `@sevendays/types`' built `dist/` already carries `EMPTY_SITE_SETTINGS` / `resolveSiteSettings` / `SITE_SETTINGS_DEFAULTS` unchanged.
- Test floors (current, per AGENTS.md): admin 33 files / 352 tests — this plan takes them to **34 files / 360 tests** (+8 seam pins; restate from the actual run). api / api-client / landing untouched by this plan — their floors must not move.
- Admin suite posture is lib-seam-only: plain-node `src/lib/*.test.ts`, no component/DOM tests, no new test deps.
- The geometry fixture loop is the VISUAL verifier per ADR-0022 — local, controller-run, NEVER part of `pnpm check` (Task 4 Step 5). `.scratch/` is gitignored; nothing from it gets committed.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #322.
- UI-bearing work (AGENTS.md): execution loads the installed UI/UX skill set — **`ui-ux-pro-max`** for this ticket (`design`/`design-system` only if a composition question opens). #322 is a fix on EXISTING compositions (the #223/#59 chrome), not a new composition — the #94/#111 rendered-variants round does not apply; the skill's brand-asset + accessibility rules gate the review instead (audit below).

## Design (one paragraph, pinned before Task 1)

One pure seam, `apps/admin/src/lib/brand-lockup.ts`, owns everything both brand surfaces share: `brandLockup(raw)` resolves the model through `resolveSiteSettings(raw ?? EMPTY_SITE_SETTINGS)` (query-pending `undefined` and failed `null` both render the monogram fallback + default name — never a throw, never broken chrome), and four exported constants pin the rendering vocabulary the lib-seam suite can lock without a DOM: the monogram, the brand row's rail posture (the footer row's own `group-data-[collapsible=icon]` trio — column, tightened gap, `px-0` because the 48px rail minus `SidebarHeader` `p-2` leaves 32px and the row's `px-2` must go), the chip geometry guard (`shrink-0` so the flex row can never crush the `overflow-hidden` span — the measured 15×36 sliver — plus `size-8` in the rail so the chip fits those 32px), and the fit (bare `object-contain`, no padding — the owner's 2026-11-18 ruling; logos never crop). The sidebar consumes the seam in place of its inline resolve; the login `AdminLockup` consumes the same seam behind `useQuery(siteSettingsQuery.all())`, and the login route adds the shell loader's guarded `staleTime: 'static'` prime so SSR paints the brand server-side with the 7d monogram as the never-blocking fallback.

### UI skill audit (`ui-ux-pro-max`, run against this plan 2026-11-18)

The skill's CSV searches for "logo fit inside a colored chip" returned no verified match (ux-domain hits were text-measure/chip-collection guidance; a style-domain retry hit nothing) — the applicable guidance is the skill's own brand-asset rule set, and the plan passes it:

- **Brand assets verbatim, proportions preserved:** the logo renders from `logoImageUrl` (the owner-uploaded object, never recolored or re-pathed), and `object-contain` is exactly the "don't modify proportions" law — `object-cover` was the proportion violation this ticket fixes. The rule's "clear space" sub-clause (padding) is overridden by the owner's explicit 2026-11-18 no-padding ruling — user rulings beat skill recommendations. Visual trade of that ruling, named once: a transparent-background logo shown bare-contain in a 36px chip can expose thin letterbox bands of the tokened chip fill top/bottom — same fill the incumbent monogram chip shows, in kind.
- **Contextual semantics:** the logo is decorative beside visible text — `alt=''` + `aria-hidden='true'` on both surfaces, with the resolved `brandName` as the accessible text. Not a control: no touch-target, contrast-ratio, or interaction-state duties apply.
- **Token-driven theming, both modes:** the chips ride semantic tokens (`bg-sidebar-primary` sidebar / `bg-primary` login); the shared `.dark` block covers both — both-themes verification is the owner demo law (M7 closed on it).
- **Sizing rhythm, not invention:** the rail step-down to `size-8` is the design system's own rail law — the footer avatar (`size-8`) and the primitive's menu button (`group-data-[collapsible=icon]:size-8!`, `packages/ui/src/components/sidebar.tsx:457`) already step to 8 in the rail; the chip joins the rhythm.
- **Image scaling:** the one adjacent CSV hit ("images should scale with container") is satisfied by `size-full` + contain inside the fixed chip — no fixed-size overflow.

---

## Task 1 — the brand-lockup seam (model + pinned vocabulary, TDD)

**Files:**
- Create: `apps/admin/src/lib/brand-lockup.ts`
- Test: `apps/admin/src/lib/brand-lockup.test.ts`

**Interfaces:**
- Consumes: `EMPTY_SITE_SETTINGS`, `resolveSiteSettings`, `SiteSettings` from `@sevendays/types` (all already exported, unchanged).
- Produces (exact, what Tasks 2–3 import):
  - `interface BrandLockup { logoImageUrl: string | null; brandName: string }`
  - `function brandLockup(raw: SiteSettings | null | undefined): BrandLockup`
  - `const LOCKUP_MONOGRAM: '7d'`-valued string
  - `const BRAND_ROW_RAIL_CLASSES: string`
  - `const LOGO_CHIP_GEOMETRY_CLASSES: string`
  - `const LOGO_IMG_CLASSES: string`

- [ ] **Step 1: Write the failing test — `apps/admin/src/lib/brand-lockup.test.ts`, full file:**

```ts
import {
  EMPTY_SITE_SETTINGS,
  SITE_SETTINGS_DEFAULTS,
  type SiteSettings,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import {
  BRAND_ROW_RAIL_CLASSES,
  LOCKUP_MONOGRAM,
  LOGO_CHIP_GEOMETRY_CLASSES,
  LOGO_IMG_CLASSES,
  brandLockup,
} from './brand-lockup';

const LOGO_URL = 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.png';

const withLogo: SiteSettings = {
  ...EMPTY_SITE_SETTINGS,
  brandName: 'Sevendays Studio',
  logoImageUrl: LOGO_URL,
};

describe('brandLockup (#322 bug A: the login lockup reads site settings)', () => {
  it('carries the logo URL when set — the <img src> both surfaces render', () => {
    const lockup = brandLockup(withLogo);
    expect(lockup.logoImageUrl).toBe(LOGO_URL);
    expect(lockup.brandName).toBe('Sevendays Studio');
  });

  it('null raw (query pending or failed) resolves the defaults — the monogram fallback, never a throw', () => {
    const lockup = brandLockup(null);
    expect(lockup.logoImageUrl).toBeNull();
    expect(lockup.brandName).toBe(SITE_SETTINGS_DEFAULTS.brandName);
  });

  it('undefined raw resolves identically to null (the SSR/hydration first render)', () => {
    expect(brandLockup(undefined)).toEqual(brandLockup(null));
  });

  it('honors resolveSiteSettings defaults per field — set logo + null brandName resolves both', () => {
    const lockup = brandLockup({
      ...EMPTY_SITE_SETTINGS,
      brandName: null,
      logoImageUrl: LOGO_URL,
    });
    expect(lockup.logoImageUrl).toBe(LOGO_URL);
    expect(lockup.brandName).toBe(SITE_SETTINGS_DEFAULTS.brandName);
  });
});

describe('the lockup geometry/fit vocabulary (#322 bug B: the rail sliver)', () => {
  it('pins the brand row rail posture — column, tightened gap, no horizontal padding', () => {
    expect(BRAND_ROW_RAIL_CLASSES).toContain('group-data-[collapsible=icon]:flex-col');
    expect(BRAND_ROW_RAIL_CLASSES).toContain('group-data-[collapsible=icon]:gap-2');
    expect(BRAND_ROW_RAIL_CLASSES).toContain('group-data-[collapsible=icon]:px-0');
  });

  it('pins the chip geometry guard — never shrinks, steps to size-8 in the rail', () => {
    expect(LOGO_CHIP_GEOMETRY_CLASSES).toContain('shrink-0');
    expect(LOGO_CHIP_GEOMETRY_CLASSES).toContain('group-data-[collapsible=icon]:size-8');
  });

  it('pins the fit ruling — bare contain, no padding (owner 2026-11-18), never cover', () => {
    // toBe pins the WHOLE string: object-contain, no p- utility, nothing else.
    expect(LOGO_IMG_CLASSES).toBe('size-full object-contain');
  });

  it('pins the monogram fallback glyph', () => {
    expect(LOCKUP_MONOGRAM).toBe('7d');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @sevendays/admin test -- --run src/lib/brand-lockup.test.ts`
Expected: FAIL — `Cannot find module './brand-lockup'` (or its `#/lib/brand-lockup` alias resolution error). Zero tests run.

- [ ] **Step 3: Write the minimal implementation — `apps/admin/src/lib/brand-lockup.ts`, full file:**

```ts
import { EMPTY_SITE_SETTINGS, resolveSiteSettings, type SiteSettings } from '@sevendays/types';

// The brand lockup seam (#322): ONE model for every surface that renders the
// studio's brand mark — the sidebar's brand block and the login page's
// lockup. The login lockup was built in M4, pre-CMS, and never wired when
// the M7 redesign rode the rest of the chrome (#322 bug A); this seam makes
// the wiring one call for both surfaces, and pins the geometry/fit
// vocabulary the collapsed icon rail needs (#322 bug B) as constants the
// lib-seam suite can lock (the admin suite is lib-seam-only — no DOM
// tests).

export interface BrandLockup {
  /** The resolved logo URL — the <img src> when set; null renders the monogram fallback. */
  logoImageUrl: string | null;
  /** The resolved studio name (SITE_SETTINGS_DEFAULTS.brandName when unset). */
  brandName: string;
}

// The monogram fallback when no logo is set — the pre-CMS chip's own glyph.
export const LOCKUP_MONOGRAM = '7d';

// The collapsed icon-rail posture for the sidebar brand row (#322 bug B):
// the footer row's own pattern — column stack, tightened gap, no horizontal
// padding. The rail is 48px; SidebarHeader p-2 leaves 32px, so the row's
// px-2 must go or the logo chip squashes to a sliver.
export const BRAND_ROW_RAIL_CLASSES =
  'group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0';

// The logo chip's geometry guard (#322 bug B): never shrink (a flex row can
// crush an overflow-hidden span below its size — the measured 15×36
// sliver), and step size-9 → size-8 in the rail so the chip fits the 32px
// inner width the rail leaves.
export const LOGO_CHIP_GEOMETRY_CLASSES = 'shrink-0 group-data-[collapsible=icon]:size-8';

// The logo fit (#322, owner-ruled 2026-11-18): bare object-contain — logos
// never crop, and NO padding (the owner ruled the p-1 hair out: it's a
// logo). The uploaded logo is 751×492 (~1.53:1); a 36×36 object-cover box
// center-crops its sides.
export const LOGO_IMG_CLASSES = 'size-full object-contain';

// The resolved lockup model: null/undefined raw (query pending, failed, or
// a born-empty row) resolves through the defaults seam — the chrome never
// renders broken (M7 #215's law).
export function brandLockup(raw: SiteSettings | null | undefined): BrandLockup {
  const settings = resolveSiteSettings(raw ?? EMPTY_SITE_SETTINGS);
  return { logoImageUrl: settings.logoImageUrl, brandName: settings.brandName };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @sevendays/admin test -- --run src/lib/brand-lockup.test.ts`
Expected: PASS — 8 tests (2 describes × 4).

- [ ] **Step 5: Gate + commit**

Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`
Expected: the full admin suite green — 34 files / 360 tests (33 files / 352 + this file's 8).

```bash
git add apps/admin/src/lib/brand-lockup.ts apps/admin/src/lib/brand-lockup.test.ts
git commit -m "fix(admin): #322 — the brand-lockup seam (settings-carried model + rail/fit vocabulary)"
```

**Not here:** no component consumes the seam yet — Tasks 2–3.

**Why pinned string constants are safe for Tailwind (controller pre-flight, verified 2026-11-18):** the admin CSS (`apps/admin/src/styles.css`) carries no `@source` restrictions, so Tailwind v4's automatic content detection scans every non-gitignored source file — including `.ts` string constants like these. Stronger still, every utility the seam pins is ALREADY in today's built CSS (grep-proven against `apps/admin/dist/client/assets/styles-CVmPbFIT.css`): the rail trio + `shrink-0` come from the sidebar's own footer row (`admin-sidebar.tsx:128-129`), `object-contain` + `p-1` from the Site tab preview, `size-full` from today's logo `img` — and `group-data-[collapsible=icon]:size-8` from the sidebar primitive's menu button (`packages/ui/src/components/sidebar.tsx:457`). The constants change NO compilation outcome; they pin vocabulary. Task 2's gate still re-proves the one variant this plan newly composes onto the chip.

## Task 2 — sidebar brand block rides the seam (bug B: the rail sliver)

**Files:**
- Modify: `apps/admin/src/components/admin-sidebar.tsx` (controller pre-flight 2026-11-18: lines verified verbatim — the `@sevendays/types` import at line 8, the M7 comment + resolve at lines 63–67, the brand block at lines 71–94)

**Interfaces:**
- Consumes: Task 1's `brandLockup`, `BRAND_ROW_RAIL_CLASSES`, `LOGO_CHIP_GEOMETRY_CLASSES`, `LOGO_IMG_CLASSES`, `LOCKUP_MONOGRAM`.
- Produces: nothing downstream — the login lockup (Task 3) mirrors this consumption, not imports from it.

- [ ] **Step 1: Swap the imports.** Delete line 8 (`import { EMPTY_SITE_SETTINGS, resolveSiteSettings } from '@sevendays/types';` — nothing else in the file uses it after Step 2) and insert the seam import in the `#/lib` block, alphabetically between `auth-client` and `cms-queries` (biome organize-imports order):

```ts
import {
  BRAND_ROW_RAIL_CLASSES,
  LOCKUP_MONOGRAM,
  LOGO_CHIP_GEOMETRY_CLASSES,
  LOGO_IMG_CLASSES,
  brandLockup,
} from '#/lib/brand-lockup';
```

- [ ] **Step 2: Replace the resolve with the seam.** The block at lines 63–67 currently reads:

```tsx
  // M7 #223: the brand block consumes site settings — the studio's name
  // and logo (when set) ride the sidebar; the 7d monogram is the fallback.
  // The "Admin" kicker stays fixed — it names the tool, not the brand.
  const { data: rawSettings } = useQuery(siteSettingsQuery.all());
  const settings = resolveSiteSettings(rawSettings ?? EMPTY_SITE_SETTINGS);
```

Replace it with:

```tsx
  // M7 #223: the brand block consumes site settings — the studio's name
  // and logo (when set) ride the sidebar; the 7d monogram is the fallback.
  // The "Admin" kicker stays fixed — it names the tool, not the brand.
  // #322: both brand surfaces ride the brand-lockup seam (#/lib/brand-lockup)
  // — the model AND the rail/fit vocabulary are pinned there.
  const { data: rawSettings } = useQuery(siteSettingsQuery.all());
  const lockup = brandLockup(rawSettings);
```

- [ ] **Step 3: Replace the brand block (lines 71–94, `SidebarHeader` through its closing tag).** Current block for exact match:

```tsx
      <SidebarHeader>
        <div className='flex items-center gap-3 px-2 py-2'>
          {settings.logoImageUrl ? (
            <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center overflow-hidden rounded-lg'>
              <img
                src={settings.logoImageUrl}
                alt=''
                aria-hidden='true'
                className='size-full object-cover'
              />
            </span>
          ) : (
            <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
              7d
            </span>
          )}
          <div className='group-data-[collapsible=icon]:hidden'>
            <p className='text-sm leading-tight font-semibold'>{settings.brandName}</p>
            <p className='text-sidebar-foreground/60 font-mono text-[0.65rem] tracking-widest uppercase'>
              Admin
            </p>
          </div>
        </div>
      </SidebarHeader>
```

Replace it with (the three #322 moves at once: the row gains the footer's rail posture; BOTH chip branches gain the geometry guard — `shrink-0` alone stops the crush, `size-8` fits the rail's 32px inner width; the img gains the contain fit):

```tsx
      <SidebarHeader>
        <div className={`flex items-center gap-3 px-2 py-2 ${BRAND_ROW_RAIL_CLASSES}`}>
          {lockup.logoImageUrl ? (
            <span
              className={`bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center overflow-hidden rounded-lg ${LOGO_CHIP_GEOMETRY_CLASSES}`}
            >
              <img src={lockup.logoImageUrl} alt='' aria-hidden='true' className={LOGO_IMG_CLASSES} />
            </span>
          ) : (
            <span
              className={`bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold ${LOGO_CHIP_GEOMETRY_CLASSES}`}
            >
              {LOCKUP_MONOGRAM}
            </span>
          )}
          <div className='group-data-[collapsible=icon]:hidden'>
            <p className='text-sm leading-tight font-semibold'>{lockup.brandName}</p>
            <p className='text-sidebar-foreground/60 font-mono text-[0.65rem] tracking-widest uppercase'>
              Admin
            </p>
          </div>
        </div>
      </SidebarHeader>
```

- [ ] **Step 4: Gate — suite + typecheck + the built-CSS proof.**

Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`
Expected: green — 34 files / 360 tests, unchanged from Task 1 (no new tests; the seam pins are Task 1's).

Run: `pnpm --filter @sevendays/admin build && grep -o 'group-data-.\{0,40\}size-8' apps/admin/dist/client/assets/styles-*.css`
Expected: build exits 0 and the grep prints at least `group-data-\[collapsible\=icon\]\:size-8` — proving the rail step-down utility the chip now references resolves to a real rule in the CSS the browser loads. (The rule pre-exists via the primitive's own menu button — `packages/ui/src/components/sidebar.tsx:457` — so this proves presence, and the cascade order is the footer row's own proven `group-data-[collapsible=icon]:px-0`-over-`px-2` mechanism: the variant's `:is(:where(.group)[data-collapsible=icon] *)` selector outranks the plain `size-9`.)

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/admin-sidebar.tsx
git commit -m "fix(admin): #322 — sidebar brand block rides the lockup seam; rail sliver fixed (shrink-0 + size-8 step + contain)"
```

**Not here:** the login lockup (Task 3); the `overflow-hidden` on the img chip branch stays — harmless under `object-contain` (nothing overflows; it only ever cropped under `object-cover`), and it keeps the chip branches visually identical in shape.

## Task 3 — login lockup reads site settings (bug A), server-primed

**Files:**
- Modify: `apps/admin/src/routes/login.tsx` (controller pre-flight 2026-11-18: verified verbatim — imports at lines 12–22, the Route at lines 33–37, `AdminLockup` at lines 48–62, the file-top comment block at lines 1–11)

**Interfaces:**
- Consumes: Task 1's `brandLockup`, `LOCKUP_MONOGRAM`, `LOGO_IMG_CLASSES`; the existing `siteSettingsQuery` (`#/lib/cms-queries`); the root router context's `queryClient` (`RouterContext`, `__root.tsx` — every loader receives it).
- Produces: nothing downstream.

- [ ] **Step 1: Add the three imports.** `useQuery` goes immediately before the `@tanstack/react-router` line (biome order: `react-query` < `react-router`); the two `#/lib` imports go between `auth-client` and `save-contract`:

```ts
import { useQuery } from '@tanstack/react-query';
```

```ts
import { LOCKUP_MONOGRAM, LOGO_IMG_CLASSES, brandLockup } from '#/lib/brand-lockup';
import { siteSettingsQuery } from '#/lib/cms-queries';
```

- [ ] **Step 2: Add the loader to the Route.** The Route (lines 33–37) currently reads:

```tsx
export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Sign in | Sevendays Admin' }] }),
  component: LoginPage,
});
```

Replace with (the shell loader's guarded prime, `_shell.tsx:40-44`, verbatim in posture — `'static'` is the removed-`ensureQueryData` replacement per that file's own M8 #289 note):

```tsx
export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Sign in | Sevendays Admin' }] }),
  // #322: prime the settings read so the lockup's brand renders server-side
  // (the shell loader's own guarded pattern, _shell.tsx): a failed read
  // renders the 7d monogram fallback and never blocks the form.
  loader: async ({ context: { queryClient } }) => {
    await queryClient
      .query({ ...siteSettingsQuery.all(), staleTime: 'static' })
      .catch(() => undefined);
  },
  component: LoginPage,
});
```

- [ ] **Step 3: Replace `AdminLockup` (lines 48–62).** Current block for exact match:

```tsx
function AdminLockup() {
  return (
    <div className='flex items-center gap-3'>
      <span className='bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
        7d
      </span>
      <span className='flex items-baseline gap-2.5'>
        <span className='text-lg leading-tight font-semibold text-white'>Sevendays</span>
        <span className='font-mono text-[0.65rem] tracking-widest text-brand-300 uppercase'>
          Admin
        </span>
      </span>
    </div>
  );
}
```

Replace with (the ink-band styling stays this component's own — the sidebar's `bg-sidebar-primary` chip colors do not transfer; `shrink-0` on the img branch is cheap insurance for the flex row, no rail variant here):

```tsx
// #322: the lockup reads site settings — the same seam the sidebar's brand
// block rides (the logo when set, the 7d monogram fallback when not, the
// resolved brand name). Built in M4 pre-CMS, it stayed hardcoded when the
// M7 redesign wired the rest of the chrome.
function AdminLockup() {
  const { data: rawSettings } = useQuery(siteSettingsQuery.all());
  const lockup = brandLockup(rawSettings);
  return (
    <div className='flex items-center gap-3'>
      {lockup.logoImageUrl ? (
        <span className='bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
          <img src={lockup.logoImageUrl} alt='' aria-hidden='true' className={LOGO_IMG_CLASSES} />
        </span>
      ) : (
        <span className='bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
          {LOCKUP_MONOGRAM}
        </span>
      )}
      <span className='flex items-baseline gap-2.5'>
        <span className='text-lg leading-tight font-semibold text-white'>{lockup.brandName}</span>
        <span className='font-mono text-[0.65rem] tracking-widest text-brand-300 uppercase'>
          Admin
        </span>
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Extend the file-top comment.** Append one line to the header comment block (after the `#242` paragraph, lines 9–11, as a new line 12 above the first `import`):

```text
// #322: the AdminLockup consumes site settings (the brand-lockup seam) —
// server-primed by this route's loader, the 7d monogram as fallback.
```

- [ ] **Step 5: Gate.**

Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin build`
Expected: all three green (34 files / 360 tests unchanged; the build proves the loader's SSR path compiles).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/routes/login.tsx
git commit -m "fix(admin): #322 — login lockup reads site settings via the brand-lockup seam (server-primed)"
```

**Not here:** no `login_.reset.tsx` change (it renders no lockup — meta only); no new login tests — the admin suite is lib-seam-only and the seam's behavior IS Task 1's suite; the SSR paint and the fallback-on-failed-read are visually verified by Task 4 Step 5's local loop posture.

## Task 4 — docs, floors, graphify, and the visual verifier

**Files:**
- Modify: `docs/progress.md` (append a dated section at file end — the house pattern, after the `## 2026-11-13 — #275` section)
- Modify: `AGENTS.md` (the admin test-floor sentence in "Current status of `pnpm test`")
- Local only (never committed): `.scratch/` + `/tmp/logo-debug/` loop replay

**Interfaces:**
- Consumes: the finished Tasks 1–3; the green run's ACTUAL counts.
- Produces: the durable record; nothing code-side.

- [ ] **Step 1: `docs/progress.md` — append this section verbatim at the end of the file:**

```markdown
## 2026-11-18 — #322: the admin brand chrome reads site settings; the rail sliver fixed

The owner-reported logo pair landed: the login lockup (built M4, pre-CMS, never wired when the M7 redesign rode the rest of the chrome) now consumes site settings — the same seam as the sidebar's brand block — and the sidebar's logo chip no longer squashes to a 15×36 sliver in the collapsed icon rail. **The seam:** `apps/admin/src/lib/brand-lockup.ts` — `brandLockup(raw)` resolves `{ logoImageUrl, brandName }` through `resolveSiteSettings` (query-pending/failed/born-empty all render the `7d` monogram fallback + the default name, never a throw), plus the pinned rendering vocabulary as constants (`LOCKUP_MONOGRAM`; `BRAND_ROW_RAIL_CLASSES` — the footer row's own rail trio; `LOGO_CHIP_GEOMETRY_CLASSES` — `shrink-0` + the `size-8` rail step-down fitting the 48px rail's 32px inner width; `LOGO_IMG_CLASSES` — bare `object-contain`, no padding). **Sidebar:** the brand row gains the rail posture, both chip branches gain the geometry guard, and the img's fit moves cover→contain (owner-ruled 2026-11-18: logos never crop, and no padding — the p-1 hair was explicitly ruled out; the Site tab preview's own contain fit agrees on the law, and one constant flips if the owner ever rules cover). **Login:** `AdminLockup` rides `useQuery(siteSettingsQuery.all())` + the seam behind the shell loader's guarded `staleTime: 'static'` prime (SSR paints the brand; a failed read renders the monogram and never blocks the form); the resolved `brandName` replaces the literal wordmark; the ink-band styling stays the component's own. **Regression net:** eight lib-seam pins (`brand-lockup.test.ts` — the model's four resolution laws + the four vocabulary pins); the geometry fixture loop stays the visual verifier per ADR-0022 (local, controller-run, never in `pnpm check`). Admin floor 33→34 files / 352→360 tests; api/api-client/landing untouched. **Not bugs:** the route `<title>` metas' "Sevendays Admin" stays (tool name, not brand chrome); the teaser-api logo 404 is the ship-split topology artifact (expected until #192's cutover — never hunt it as lost media).
```

- [ ] **Step 2: `AGENTS.md` — update the admin floor.** In "Current status of `pnpm test`", the admin paragraph's sentence begins `admin floor 33 files / 352 tests (` — change the counts to the ACTUAL green-run counts (expected **34 files / 360 tests**; restate from the run, not from this line), and append to the end of that parenthetical pin list — before its closing `)` which is followed by `. The api and landing suites remain the behavioral backbones.`:

```text
; + #322's eight brand-lockup seam pins — the settings-carried lockup model (logo set → img src, null → 7d monogram, defaults honored) + the rail-posture/geometry/fit class vocabulary
```

- [ ] **Step 3: Final gate + docs commit.**

Run: `pnpm check`
Expected: green at the repo root — lint + format + typecheck + test across every workspace; api/api-client/landing floors unmoved; admin at its new 34-file/360-test floor.

```bash
git add docs/progress.md AGENTS.md
git commit -m "docs: #322 — progress section + admin test floors (34 files / 360)"
```

- [ ] **Step 4: Graphify.** Per the repo rule (AGENTS.md graphify section):

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#322 graph update"
```

(The pre-existing dirty `graphify-out/cache/last_query_stamp` rides along — dirty graph files are expected, not a reason to skip.)

- [ ] **Step 5: The visual verifier (LOCAL, controller-run — never a gate, never in `pnpm check`, nothing committed).** Replay the #322 diagnosis loop against the fixed classes:

  1. `pnpm --filter @sevendays/admin build` (already green from Task 3), then note the fresh stylesheet: `ls apps/admin/dist/client/assets/styles-*.css`.
  2. `mkdir -p /tmp/logo-debug && cp .scratch/logo-diagnosis-2026-11-18/fixture.html .scratch/logo-diagnosis-2026-11-18/loop2-geometry.mjs /tmp/logo-debug/` (the loop pins the `file:///tmp/logo-debug/fixture.html` URL; `.scratch/` copies stay the untouched durable record).
  3. In `/tmp/logo-debug/fixture.html`, three edits — the `<link rel='stylesheet'>` href to the fresh `styles-*.css` hash; the `#brand-row` div's class to `flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0`; the `#logo-box` span's class to gain ` shrink-0 group-data-[collapsible=icon]:size-8` and the `#logo-img`'s to `size-full object-contain`.
  4. In `/tmp/logo-debug/loop2-geometry.mjs`, adapt the exit law to the NEW by-design geometry — collapsed logo box ≈ **32×32** (`size-8` in the rail's 32px inner width), expanded **36×36**: RED (exit 1) when the collapsed box's width or height is `< 31` (sub-pixel tolerance) — the old `< 36` criterion described the bug, not the fix. Keep logging both postures.
  5. Run from the repo root (so `@playwright/test` resolves): `node /tmp/logo-debug/loop2-geometry.mjs` — expect GREEN with collapsed ≈32×32 / expanded 36×36 and the screenshot under `/tmp/logo-debug/artifacts/`.
  6. Post-deploy (owner-gated, after merge + the usual deploy): re-run `loop1-login.mjs` against the deployment to confirm the /login main now contains the logo `<img>` and fires the logo request — the loop's original RED criterion, now expected GREEN.

**Not here:** no `docs/plan.md` edit — no milestone box rides #322 (the M7 site-settings consumption box was ticked by #223/#224 and never promised the login lockup). No v1 pick in-branch — the merger triages the squash commit post-merge per `docs/agents/v1-picks.md`. No issue-close in this plan's tasks — the controller closes #322 on the evidence (the merged PR + the visual verifier's output).

---

## Self-review checklist (controller pass — run before handoff)

- [✅] Placeholder scan: no TBD/TODO/"as appropriate"/paraphrased strings — every value the executor must land is quoted verbatim. (grep 2026-11-18: only legitimate spread-syntax `...` hits + this line.)
- [✅] Step-checkbox count: `grep -c '^- \[ \] \*\*Step'` on this file = 21. (Verified 2026-11-18.)
- [✅] Cross-task signature match: `brandLockup` / `LOCKUP_MONOGRAM` / `LOGO_IMG_CLASSES` (Tasks 1→2→3), `BRAND_ROW_RAIL_CLASSES` / `LOGO_CHIP_GEOMETRY_CLASSES` (Tasks 1→2) — names and exports identical at every use.
- [✅] Mocked-boundary / test-semantics re-derivation: Task 1's suite tests a PURE function (no mocks, no DOM) — nothing to re-derive; its assertions target parsed OUTPUT (`brandLockup`'s return), never throw-semantics.
- [✅] Count recount: +8 admin tests (4 model + 4 vocabulary), one new file — 33/352 → 34/360, stated identically in Global Constraints, Task 1 Step 5, Task 4 Steps 1–2, and this checklist. (Recounted from the Task 1 test blocks: 4 + 4 its.)
- [✅] Sibling fences: route-title metas, `login_.reset.tsx`, Site tab, landing, api/packages, #238/#222/#192, v1-picks — each named "not here" with its reason.
- [✅] Spec coverage: issue #322's Fix A (login wiring, settings pattern, ink-band styling kept) = Task 3; Fix B (shrink-0 + footer rail posture + centered lone logo) = Task 2 Step 3; fit ruling = Global Constraints + Task 1 constants; regression seam (pure lib seam, both consumers, class constants pinned, geometry loop as ADR-0022 verifier) = Tasks 1–2 + Task 4 Step 5. No gap.



