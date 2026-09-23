# M5 Prototype: Admin CMS Compositions (wayfinder #131) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking; per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **UI-bearing ticket:** before Task 2, load the skill set `prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling` (AGENTS.md UI rule; spec #94 amendment). The skills drive composition quality INSIDE the fences below; where a skill suggests something beyond a fence, the fence wins — the owner reacts to what is actually rendered.

**Goal:** Render every admin CMS surface the M5 spec will describe as composed, working screens on a throwaway route over the live design system, so the owner can react in-session and answer the ticket's question — **which compositions need owner-reacted variants vs. fall out of the design system as-is**. The deliverable is frames + per-screen verdicts, not a build: nothing here merges, no real CMS behavior is implemented, and main keeps only the rulings.

**Architecture:** One throwaway route `/prototype-cms` in `apps/admin` — public (outside `_shell`, no session friction, same posture as `/login`), rendering its own shell-lookalike chrome: `SidebarProvider` + a prototype-local sidebar (the real #59 nav taxonomy extended with the M5 destinations: Gallery, Testimonials, Lookups) + the real `AdminTopbar`. A zod-validated search param carries `screen` / `variant` / `edit` / `confirm` so every composition — including open-dialog and open-confirm states — has a deep-linkable URL the headless screenshot pass can hit directly. All data is local fixtures transcribed from the seed's catalog source; upload, reorder, and save are simulated in component state — **no API calls, no R2, no auth, no schema work**. Three genuinely-open composition axes render as A/B variants; everything else is a single composition the owner confirms or flags for iteration.

**Tech Stack:** TanStack Start file routes (auto-registered), Tailwind v4 semantic utilities over `@sevendays/ui/tokens.css`, the 22 `@sevendays/ui` primitives on disk (`alert-dialog`, `badge`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `field`, `input`, `label`, `popover`, `progress`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `table`, `textarea`, `tooltip`), `lucide-react` icons (already an admin dep), zod v4 for the search schema. **No new dependencies** — in particular no drag-and-drop library (see variant V2).

**Spec:** Wayfinder ticket [#131 "M5 prototype: admin CMS compositions"](https://github.com/jeius/sevendays/issues/131) (label `wayfinder:prototype`, HITL) on map [#128 "Wayfinder map: M5 Admin CMS spec"](https://github.com/jeius/sevendays/issues/128). The owner-ruled default shape (map Notes rulings 1–11 + the #131 body) is the composition brief: table-first screens; dialog/sheet editing for light entities; a dedicated package edit page (inclusions editor with reorder, cover upload, slug as an advanced field); a gallery manager with batch upload + categories; checkbox matrices on the service/add-on forms; deactivate behind a confirm, never delete.

**Scope fence — the closed siblings this plan must NOT implement:**

- [M5 research: R2 media pipeline](https://github.com/jeius/sevendays/issues/129) — the presign/HEAD/promote mechanics exist here only as on-screen helper text and a simulated local upload. No bucket, no binding, no network call.
- [M5 grilling: catalog write model](https://github.com/jeius/sevendays/issues/130) — its decided shapes are the screens' *content contract* (field lists below come from it verbatim), but no route, service, schema, migration, or api-client work happens in this plan.
- [M5 grilling: landing integration](https://github.com/jeius/sevendays/issues/132) — no landing file is touched; the trim-rule semantics appear only as static deactivated-row states in the admin fixtures.

**Screen inventory** (8 composed screens + cross-cutting states; `?screen=` values are the deep links):

| # | Screen key | Composition brief |
|---|---|---|
| 1 | `packages` | Table-first list: cover thumb, name + slug subline, price, featured, status, Edit / Deactivate actions |
| 2 | `package-editor` | The dedicated edit page: core fields, cover upload (simulated), slug advanced field, frames + inclusions editor with reorder (variant V2) |
| 3 | `studio-services` | Table + light-entity editor + the branch bookability checkbox matrix (variant V3) |
| 4 | `add-ons` | Table + light-entity editor + the applies-to-service matrix; editor chrome is variant V1 (Dialog vs Sheet) |
| 5 | `branches` | Table + light-entity editor (name/address/phone/walk-in/active; business hours + slot capacity are v2 — absent on purpose) |
| 6 | `lookups` | Print sizes + attires as two stacked card tables with the same light-entity editing |
| 7 | `gallery` | Manager: category rail + photo card grid + simulated batch upload + per-photo edit dialog |
| 8 | `testimonials` | Table + light-entity dialog editor (quote / person / position / active) |

Cross-cutting states rendered inside the above: deactivate behind an `alert-dialog` confirm, deactivated-row treatment (badge + dimmed), empty states, and a per-screen "prototype: nothing persists" honesty caption.

**Variant axes** — the ticket's open question, operationalized so the owner's verdicts answer it:

- **V1 — light-entity editor chrome** (`?screen=add-ons&variant=a|b`): A = centered `Dialog`; B = right-side `Sheet`. The ruling generalizes to studio services, branches, lookups, and testimonials editors.
- **V2 — inclusions reorder affordance** (`?screen=package-editor&variant=a|b`): A = numbered rows with explicit up/down icon buttons; B = the same buttons plus a `GripVertical` drag-handle presentation. Both variants move rows via the buttons — no dnd dependency; B exists so the owner can react to the drag affordance *look* and rule whether the build tickets need a real dnd library.
- **V3 — matrix presentation** (inside `?screen=studio-services&variant=a|b` editor): A = compact `Table`, one row, branches as checkbox columns; B = one card per branch with a checkbox stack. The ruling generalizes to the add-on applies-to matrix.

Everything else renders as a single composition: per screen, the owner rules "falls out of the design system as-is" or names the iteration.

## Global Constraints

- **Worktree + branch (throwaway).** Work happens in the worktree `/home/jeius/Projects/sevendays/.worktrees/131-admin-cms` on branch `prototype/131-admin-cms-compositions`, created off `main` @ `40c836b`. All paths below are relative to that worktree root unless absolute. **Nothing merges to `main`;** every new file opens with the pinned PROTOTYPE header comment. Prototype-skill rule (house precedent #57/#120): main keeps the verdicts, the branch is the evidence.
- **Skills at execution.** `prototype` + `ui-ux-pro-max` + `design-system` + `ui-styling` load before Task 2 and stay loaded through Task 5. The pinned fixtures, copy, and composition specs below are the fence; the skills own spacing, hierarchy, and micro-layout within it. What the owner sees must be exactly what these constraints pin.
- **Gates (repo AGENTS.md, verbatim duties).** Do not commit code that fails `pnpm check` (lint + format + typecheck + test). Expected baseline: **35/35 turbo tasks** per the #119–#122 record — this plan adds **no test files** (prototype rules: no tests, no polish; admin's `test` script stays the documented no-op), so the count must not move; if it differs, reconcile before proceeding. Fresh-worktree order: `pnpm install` → `pnpm build:packages` → `pnpm --filter @sevendays/api build` → `pnpm check` (the shared client resolves the API's `AppType` from built `dist/`). The per-screen gates are `pnpm --filter @sevendays/admin build` + the dev-server render smoke in Task 1. Formatting fixups: `pnpm fix`, then re-run check.
- **Fixture law.** Catalog values are transcribed **verbatim from `packages/db/scripts/catalog.ts`** (the seed's single source of truth — the executor never invents catalog data). Gallery-category, gallery-photo, and testimonial rows have **no catalog source** (the M5 tables do not exist yet): their fixtures below are PROTOTYPE-ONLY synthetics, flagged in-file, and real content arrives with the build tickets. Three flag assignments are PROTOTYPE-ONLY state exercises, also flagged in-file: Basic Package `isFeatured: true`, Package A `isActive: false`, print size `8R` `isActive: false`. Uploads/reorder/save mutate component state only — the plan's word for this on-screen is pinned in the copy inventory ("Prototype: changes stay on this page.").
- **Peso format:** `₱1,100.00` — `en-PH`, 2 fraction digits, `₱` prefix (the landing `apps/landing/src/lib/format.ts` precedent, test-pinned there as `peso(110000) → '₱1,100.00'`). The prototype carries a local 3-line helper in `shared.tsx`; no import from landing.
- **Copy inventory (verbatim — owner-visible; transcribe, never re-draft).** Screen h1s: `Packages`, `Studio services`, `Add-ons`, `Branches`, `Lookups`, `Gallery`, `Testimonials`; the editor's h1 is the package name (`Basic Package`). Screen sublines: packages — "Everything on the landing site's /packages page, editable in place."; studio-services — "Standalone services bookable on their own, with per-branch availability."; add-ons — "Extras attached at booking time, with the services they apply to."; branches — "The three studio locations. Hours and slot capacity arrive with v2."; lookups — "Shared catalog vocabularies used by package inclusions."; gallery — "The /about portfolio — upload in batches, organize by category."; testimonials — "Client quotes shown on the /about page, ordered." Editor back link: `← Back to packages`. Primary actions: `New package`, `New studio service`, `New add-on`, `New branch`, `New print size`, `New attire`, `New testimonial`, `New category`, `Upload photos`. Editor/dialog save buttons: `Save changes`. Deactivate confirm: title `Deactivate <name>?`, body "Deactivated items are hidden from the landing site immediately. History is untouched, and you can reactivate any time.", buttons `Deactivate` (destructive) / `Cancel`. The row action on a deactivated row is `Reactivate` (direct, no confirm). Slug advanced field: collapsible trigger `Advanced`, label `Slug`, warning line "Changing the slug breaks links that point here." Simulated-upload caption (package cover + gallery toolbar): "Uploads are simulated in this prototype — nothing is stored." Editor header caption: "Prototype: changes stay on this page." Empty states: packages — "No packages yet."; gallery (all) — "No photos yet."; gallery (filtered) — "No photos in this category yet."; testimonials — "No testimonials yet."
- **Status-badge ruling rendered for reaction (single composition, owner confirms):** active rows carry no badge; deactivated rows carry an outline `Deactivated` badge at 60% row opacity. Deactivated packages remain editable in place (deactivate ≠ lock).
- **Screenshot mechanics (WSL-pinned, #120-verified).** Binary: `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` (if that versioned dir is absent, `ls ~/.cache/ms-playwright | grep headless` and adapt the path — never change the flags). Invocation pattern: `--headless --disable-gpu --no-sandbox --screenshot=<file> --window-size=<W>,<H> --hide-scrollbars "<url>"` under `timeout 30`; GPU compositing and `--virtual-time-budget` hang against vite HMR on this host; dbus stderr noise is expected. Dev server: `pnpm --filter @sevendays/admin dev`, port 3000 (verify free first; if vite increments, read the printed port and use it in every frame URL). Evidence lands in `/home/jeius/Projects/sevendays/.superpowers/sdd/2026-09-24-131-admin-cms-compositions/` (absolute — outside the worktree, gitignored).
- **Not here (plan-level fences).** No edits outside `apps/admin/src/routes/prototype-cms.tsx` + `apps/admin/src/components/prototype-cms/**` on the worktree; the four M3 stub screens, the real `AdminSidebar`, `_shell`, api, db, packages/ui, and landing stay untouched. No `docs/plan.md` Milestone 5 checkbox moves — those stay unticked until the spec ticket cuts and the build tickets land their deliverables (this prototype is evidence, not an M5 line item). No `docs/progress.md` update, no `graphify update` (both track main; this branch never lands — #57 precedent). No v1-picks triage (only squash-merged PRs to main are triaged; this branch is never merged). No new dependencies, no test files, no dark mode (parked by absence in the token layer).
- **Wayfinder mechanics.** The ticket is HITL: Tasks 1–5 produce the frames; **Task 6 is the owner reaction itself**. The ticket is **not** closed and the map's Decisions-so-far is **not** edited until the owner's verdicts are recorded in-session (the #57-plan precedent: handover ≠ resolution).

---

### Task 1: Scaffold — worktree, fixtures, nav registry, route, prototype chrome

**Files:**
- Create: `apps/admin/src/components/prototype-cms/nav.tsx`
- Create: `apps/admin/src/components/prototype-cms/fixtures.ts`
- Create: `apps/admin/src/routes/prototype-cms.tsx`
- Create: `apps/admin/src/components/prototype-cms/proto-sidebar.tsx`

**Interfaces:**
- Consumes: `@sevendays/ui` (`sidebar`, `separator` primitives), `AdminTopbar` (`#/components/admin-topbar`), zod (admin dep).
- Produces: `ScreenKey` (8-key union), `NAV_GROUPS` (sidebar taxonomy incl. the three NEW destinations), `SCREENS` (a `Record<ScreenKey, ComponentType<ScreenProps>>` registry where every not-yet-built screen renders a labeled stub card), `searchSchema` (`screen`/`variant`/`edit`/`confirm`), the fixture rows every later task renders, and the booted route at `/prototype-cms`. Tasks 2–4 only add screen files and swap registry entries — the scaffold's shape is frozen here.

**Not here:** any screen composition (Tasks 2–4); touching the real sidebar or stub routes; any state beyond the registry stub.

- [ ] **Step 1: Worktree + branch + green baseline**

```bash
git worktree add .worktrees/131-admin-cms -b prototype/131-admin-cms-compositions 40c836b
cd .worktrees/131-admin-cms
pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check
```

Expected: check green at the recorded count (35/35). If the count differs, reconcile before writing any code.

- [ ] **Step 2: Write `nav.tsx` — screen keys, taxonomy, registry, search schema**

Create `apps/admin/src/components/prototype-cms/nav.tsx` with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #131: screen registry + nav taxonomy for
// the admin CMS composition route. The three NEW destinations (Gallery,
// Testimonials, Lookups) render inside the ruled #59 group taxonomy as the
// IA proposal the owner reacts to. Never merges; delete with the route.
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Images,
  LayoutDashboard,
  MapPin,
  Package,
  PlusCircle,
  Quote,
  Settings,
  Tags,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { z } from 'zod';

export const SCREEN_KEYS = [
  'packages',
  'package-editor',
  'studio-services',
  'add-ons',
  'branches',
  'lookups',
  'gallery',
  'testimonials',
] as const;

export type ScreenKey = (typeof SCREEN_KEYS)[number];

export type ScreenProps = { variant: 'a' | 'b'; search: Search };

export const searchSchema = z.object({
  screen: z.enum(SCREEN_KEYS).default('packages'),
  variant: z.enum(['a', 'b']).default('a'),
  // Optional deep-link states so the headless screenshot pass can capture
  // open dialogs/sheets/confirms without interaction:
  edit: z.string().optional(), // entity id → open that row's editor
  confirm: z.string().optional(), // entity id → open its deactivate confirm
});

export type Search = z.infer<typeof searchSchema>;

// Sidebar taxonomy: the #59 groups with the M5 additions placed as the IA
// proposal (Gallery + Testimonials in Catalog; Lookups in Studio — the
// owner rules on these placements in the reaction pass). Items without a
// `key` are the real shell's inert destinations (Dashboard/Appointments/
// Settings), rendered for shell realism with no prototype screen behind them.
export interface NavItem {
  label: string;
  icon: LucideIcon;
  // Absent = inert destination of the real shell; no prototype screen.
  key?: ScreenKey;
  // Flags the M5 additions with a small "new" badge.
  isNew?: boolean;
}

export const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard },
      { label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { label: 'Packages', icon: Package, key: 'packages' },
      { label: 'Studio services', icon: Wrench, key: 'studio-services' },
      { label: 'Add-ons', icon: PlusCircle, key: 'add-ons' },
      { label: 'Gallery', icon: Images, key: 'gallery', isNew: true },
      { label: 'Testimonials', icon: Quote, key: 'testimonials', isNew: true },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { label: 'Branches', icon: MapPin, key: 'branches' },
      { label: 'Lookups', icon: Tags, key: 'lookups', isNew: true },
      { label: 'Settings', icon: Settings },
    ],
  },
];

// Registry: every screen key maps to a component. Tasks 2–4 replace stubs.
export const SCREENS: Record<ScreenKey, ComponentType<ScreenProps>> = {
  packages: StubScreen,
  'package-editor': StubScreen,
  'studio-services': StubScreen,
  'add-ons': StubScreen,
  branches: StubScreen,
  lookups: StubScreen,
  gallery: StubScreen,
  testimonials: StubScreen,
};

function StubScreen({ variant: _variant }: ScreenProps) {
  return <p className='text-muted-foreground text-sm'>Composition lands in a later task.</p>;
}
```

The package-editor screen has **no sidebar entry** — it is reached from the packages table's Edit action (exactly as the real screen will be); the registry keeps it switchable by URL for the frame pass.

- [ ] **Step 3: Write `fixtures.ts` — pinned data**

Create `apps/admin/src/components/prototype-cms/fixtures.ts` with exactly this content:

```ts
// PROTOTYPE (throwaway) — wayfinder #131: local fixtures for the admin CMS
// composition route. Catalog values are transcribed verbatim from
// packages/db/scripts/catalog.ts (the seed's single source of truth). Rows
// and flag assignments marked PROTOTYPE-ONLY are synthetic state exercises —
// the gallery/testimonial tables do not exist yet and real content arrives
// with the M5 build tickets. Nothing here persists; every mutation in the
// screens is local component state.

export type InclusionKind = 'framed_picture' | 'print' | 'privilege';

export interface InclusionRow {
  id: string;
  kind: InclusionKind;
  quantity: number | null; // privileges: null
  printSize: string | null; // code; privileges: null
  attires: string[]; // attire names in catalog order (Toga, Filipiniana, Executive, Uniform)
  description: string | null; // privileges carry the text; others null
  frameId: string | null; // framed_picture rows only
}

export interface FrameRow {
  id: string;
  // Display order only — the write model renumbers from array order (#130).
  frameNumber: number;
}

export interface PackageRow {
  id: string;
  name: string;
  description: string;
  slug: string;
  priceCents: number;
  durationMinutes: number | null;
  isFeatured: boolean;
  isActive: boolean;
  coverImageUrl: string | null; // null renders the placeholder block
  frames: FrameRow[];
  // Position = array order (the #130 write shape).
  inclusions: InclusionRow[];
}

export interface StudioServiceRow {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  // branch ids this service is bookable at (the checkbox matrix)
  branchIds: string[];
}

export interface AddonRow {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  // studio-service ids this add-on applies to (the checkbox matrix)
  studioServiceIds: string[];
}

export interface BranchRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  acceptsWalkIns: boolean;
  isActive: boolean;
}

export interface PrintSizeRow {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
}

export interface AttireRow {
  id: string;
  name: string;
  isActive: boolean;
}

export interface GalleryCategoryRow {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
}

export interface GalleryPhotoRow {
  id: string;
  // PROTOTYPE-ONLY: photoUrl stays null — thumbs render placeholder blocks.
  photoUrl: string | null;
  title: string;
  caption: string | null;
  categoryId: string | null; // null = uncategorized (hidden on landing reads)
  position: number;
  isActive: boolean;
}

export interface TestimonialRow {
  id: string;
  quote: string;
  person: string;
  position: number;
  isActive: boolean;
}

// — Lookups (catalog.ts verbatim; the 8R isActive:false flag is PROTOTYPE-ONLY) —

export const printSizes: PrintSizeRow[] = [
  { id: 'ps-1x1', code: '1x1', description: 'One by one inch portrait print.', isActive: true },
  {
    id: 'ps-2x2',
    code: '2x2',
    description: 'Two by two inch portrait print (standard ID size).',
    isActive: true,
  },
  { id: 'ps-2r', code: '2R', description: '2R wallet-size portrait print.', isActive: true },
  {
    id: 'ps-8r',
    code: '8R',
    description:
      '8R print — nominally the same physical size as 8x10; both appear in the price list. Client to confirm at seed review whether they merge.',
    isActive: false,
  },
  { id: 'ps-8x10', code: '8x10', description: '8x10 inch print, commonly framed.', isActive: true },
  {
    id: 'ps-11x14',
    code: '11x14',
    description: '11x14 inch print, commonly framed.',
    isActive: true,
  },
];

export const attires: AttireRow[] = [
  { id: 'at-toga', name: 'Toga', isActive: true },
  { id: 'at-filipiniana', name: 'Filipiniana', isActive: true },
  { id: 'at-executive', name: 'Executive', isActive: true },
  { id: 'at-uniform', name: 'Uniform', isActive: true },
];

// — Branches (catalog.ts verbatim; phones are the seed's TODO(seed) placeholders) —

export const branches: BranchRow[] = [
  {
    id: 'br-calamba',
    name: 'Calamba Main Branch',
    address: 'DBAN, Calamba, Misamis Occidental',
    phone: '+63 900 000 001',
    acceptsWalkIns: false,
    isActive: true,
  },
  {
    id: 'br-iligan',
    name: 'Iligan Branch',
    address: 'Iligan City, Lanao del Norte',
    phone: '+63 900 000 002',
    acceptsWalkIns: false,
    isActive: true,
  },
  {
    id: 'br-dipolog',
    name: 'Dipolog Branch',
    address: 'Dipolog City, Zamboanga del Norte',
    phone: '+63 900 000 003',
    acceptsWalkIns: true,
    isActive: true,
  },
];

// — Studio services (catalog.ts verbatim; matrix assignments PROTOTYPE-ONLY) —

export const studioServices: StudioServiceRow[] = [
  {
    id: 'ss-photo-recovery',
    name: 'Photo Recovery',
    description: 'Restore scanned or damaged photographs.',
    priceCents: 150000,
    isActive: true,
    branchIds: ['br-calamba', 'br-iligan', 'br-dipolog'],
  },
  {
    id: 'ss-tarpaulin',
    name: 'Tarpaulin & Bulletin Printing',
    description: 'Large-format tarpaulin and bulletin printing.',
    priceCents: 80000,
    isActive: true,
    branchIds: ['br-calamba', 'br-dipolog'],
  },
  {
    id: 'ss-portraits-id',
    name: 'Portraits & ID Photo',
    description: 'Studio portraits and ID photos.',
    priceCents: 50000,
    isActive: true,
    branchIds: ['br-calamba', 'br-iligan', 'br-dipolog'],
  },
  {
    id: 'ss-framing',
    name: 'Picture Framing',
    description: 'Custom framing for prints and artwork.',
    priceCents: 120000,
    isActive: true,
    branchIds: ['br-calamba'],
  },
];

// — Add-ons (catalog.ts verbatim; matrix assignments PROTOTYPE-ONLY) —

export const addons: AddonRow[] = [
  {
    id: 'addon-makeup',
    name: 'Makeup',
    description: 'Professional makeup for the session.',
    priceCents: 12000,
    isActive: true,
    studioServiceIds: ['ss-portraits-id'],
  },
  {
    id: 'addon-hairstyle',
    name: 'Hairstyle',
    description: 'Styled hair for the session.',
    priceCents: 6000,
    isActive: true,
    studioServiceIds: ['ss-portraits-id'],
  },
];

// — Packages (catalog.ts verbatim: Basic, D, A; flags marked PROTOTYPE-ONLY) —

// Universal privileges, seeded per package (privilegeSeeds): the same six
// rows on every package; attireLinks per privilegeSeeds.
const privilegeRows = (prefix: string): InclusionRow[] => [
  { id: `${prefix}-p1`, kind: 'privilege', quantity: null, printSize: null, attires: [], description: 'High Resolution soft copies', frameId: null },
  { id: `${prefix}-p2`, kind: 'privilege', quantity: null, printSize: null, attires: ['Toga'], description: 'Usage of Toga and Hood', frameId: null },
  { id: `${prefix}-p3`, kind: 'privilege', quantity: null, printSize: null, attires: [], description: 'Usage of Ladies Accessories', frameId: null },
  { id: `${prefix}-p4`, kind: 'privilege', quantity: null, printSize: null, attires: ['Executive'], description: 'Usage of Executive Attire', frameId: null },
  { id: `${prefix}-p5`, kind: 'privilege', quantity: null, printSize: null, attires: [], description: 'Usage of Barong', frameId: null },
  { id: `${prefix}-p6`, kind: 'privilege', quantity: null, printSize: null, attires: ['Filipiniana'], description: 'Usage of Filipiniana', frameId: null },
];

export const packages: PackageRow[] = [
  {
    id: 'pkg-basic',
    name: 'Basic Package',
    description: 'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
    slug: 'basic-package',
    priceCents: 90000,
    durationMinutes: null,
    isFeatured: true, // PROTOTYPE-ONLY flag: exercises the Featured badge
    isActive: true,
    coverImageUrl: null,
    frames: [{ id: 'fr-basic-1', frameNumber: 1 }],
    inclusions: [
      { id: 'inc-basic-f1', kind: 'framed_picture', quantity: 1, printSize: '8x10', attires: ['Toga'], description: null, frameId: 'fr-basic-1' },
      { id: 'inc-basic-r1', kind: 'print', quantity: 2, printSize: '2R', attires: ['Toga'], description: null, frameId: null },
      { id: 'inc-basic-r2', kind: 'print', quantity: 5, printSize: '2x2', attires: ['Toga'], description: null, frameId: null },
      { id: 'inc-basic-r3', kind: 'print', quantity: 4, printSize: '1x1', attires: ['Toga'], description: null, frameId: null },
      ...privilegeRows('basic'),
    ],
  },
  {
    id: 'pkg-d',
    name: 'Package D',
    description: 'Two framed pictures (11x14 Toga, 8x10 Filipiniana/Executive) with Toga and Filipiniana/Executive prints.',
    slug: 'package-d',
    priceCents: 180000,
    durationMinutes: null,
    isFeatured: false,
    isActive: true,
    coverImageUrl: null,
    frames: [
      { id: 'fr-d-1', frameNumber: 1 },
      { id: 'fr-d-2', frameNumber: 2 },
    ],
    inclusions: [
      { id: 'inc-d-f1', kind: 'framed_picture', quantity: 1, printSize: '11x14', attires: ['Toga'], description: null, frameId: 'fr-d-1' },
      { id: 'inc-d-f2', kind: 'framed_picture', quantity: 1, printSize: '8x10', attires: ['Filipiniana', 'Executive'], description: null, frameId: 'fr-d-2' },
      { id: 'inc-d-r1', kind: 'print', quantity: 4, printSize: '2R', attires: ['Toga'], description: null, frameId: null },
      { id: 'inc-d-r2', kind: 'print', quantity: 5, printSize: '2x2', attires: ['Toga'], description: null, frameId: null },
      { id: 'inc-d-r3', kind: 'print', quantity: 4, printSize: '1x1', attires: ['Toga'], description: null, frameId: null },
      { id: 'inc-d-r4', kind: 'print', quantity: 4, printSize: '2R', attires: ['Filipiniana', 'Executive'], description: null, frameId: null },
      { id: 'inc-d-r5', kind: 'print', quantity: 6, printSize: '2x2', attires: ['Filipiniana', 'Executive'], description: null, frameId: null },
      ...privilegeRows('d'),
    ],
  },
  {
    id: 'pkg-a',
    name: 'Package A',
    description: '1 framed 11x14 Toga with Toga prints.',
    slug: 'package-a',
    priceCents: 110000,
    durationMinutes: null,
    isFeatured: false,
    isActive: false, // PROTOTYPE-ONLY flag: exercises the deactivated row state
    coverImageUrl: null,
    frames: [{ id: 'fr-a-1', frameNumber: 1 }],
    inclusions: [
      { id: 'inc-a-f1', kind: 'framed_picture', quantity: 1, printSize: '11x14', attires: ['Toga'], description: null, frameId: 'fr-a-1' },
      { id: 'inc-a-r1', kind: 'print', quantity: 4, printSize: '2R', attires: ['Toga'], description: null, frameId: null },
      { id: 'inc-a-r2', kind: 'print', quantity: 5, printSize: '2x2', attires: ['Toga'], description: null, frameId: null },
      { id: 'inc-a-r3', kind: 'print', quantity: 4, printSize: '1x1', attires: ['Toga'], description: null, frameId: null },
      ...privilegeRows('a'),
    ],
  },
];

// — Gallery + testimonials (PROTOTYPE-ONLY synthetics — no catalog source) —

export const galleryCategories: GalleryCategoryRow[] = [
  { id: 'gc-graduation', name: 'Graduation', position: 1, isActive: true },
  { id: 'gc-portraits', name: 'Portraits', position: 2, isActive: true },
  { id: 'gc-events', name: 'Events', position: 3, isActive: true },
];

export const galleryPhotos: GalleryPhotoRow[] = [
  { id: 'gp-1', photoUrl: null, title: 'Cap and gown', caption: 'Classic graduation portrait', categoryId: 'gc-graduation', position: 1, isActive: true },
  { id: 'gp-2', photoUrl: null, title: 'The toss', caption: null, categoryId: 'gc-graduation', position: 2, isActive: true },
  { id: 'gp-3', photoUrl: null, title: 'Diploma handshake', caption: null, categoryId: 'gc-graduation', position: 3, isActive: true },
  { id: 'gp-4', photoUrl: null, title: 'Gray backdrop portrait', caption: 'Studio portrait series', categoryId: 'gc-portraits', position: 4, isActive: true },
  { id: 'gp-5', photoUrl: null, title: 'Family portrait', caption: null, categoryId: 'gc-portraits', position: 5, isActive: false },
  { id: 'gp-6', photoUrl: null, title: 'Id photo set', caption: null, categoryId: 'gc-portraits', position: 6, isActive: true },
  { id: 'gp-7', photoUrl: null, title: 'Branch opening day', caption: 'Dipolog branch, 2025', categoryId: 'gc-events', position: 7, isActive: true },
  { id: 'gp-8', photoUrl: null, title: 'Behind the scenes', caption: null, categoryId: null, position: 8, isActive: true },
];

export const testimonials: TestimonialRow[] = [
  { id: 'tm-1', quote: 'The whole shoot felt easy and the photos came out beautiful.', person: 'Maria S.', position: 1, isActive: true },
  { id: 'tm-2', quote: 'Fast turnaround — we had our prints in a week.', person: 'Juan D.', position: 2, isActive: true },
  { id: 'tm-3', quote: 'They handled our batch of 200 graduates smoothly.', person: 'Calamba National High School', position: 3, isActive: true },
];
```

- [ ] **Step 4: Write the route `prototype-cms.tsx` — shell-lookalike + switcher**

Create `apps/admin/src/routes/prototype-cms.tsx` with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #131: the admin CMS composition showcase.
// Public (outside _shell — no session friction, /login posture), local
// fixtures only: no API, no auth, no persistence. Renders its own
// shell-lookalike chrome (prototype sidebar + the real AdminTopbar) with a
// search-param screen switcher so every composition, including open
// dialog/sheet/confirm states, is a deep-linkable URL for the frame pass.
// Never merges; delete this file (and components/prototype-cms/) when the
// M5 build tickets land.
import { SidebarInset, SidebarProvider } from '@sevendays/ui/components/sidebar';
import { createFileRoute } from '@tanstack/react-router';
import { AdminTopbar } from '#/components/admin-topbar';
import { ProtoSidebar } from '#/components/prototype-cms/proto-sidebar';
import { SCREENS, searchSchema } from '#/components/prototype-cms/nav';

export const Route = createFileRoute('/prototype-cms')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: 'CMS prototype | Sevendays Admin' }] }),
  component: PrototypeCms,
});

function PrototypeCms() {
  const search = Route.useSearch();
  const Screen = SCREENS[search.screen];
  return (
    <SidebarProvider>
      <ProtoSidebar active={search.screen} variant={search.variant} />
      <SidebarInset>
        <AdminTopbar />
        <div className='flex-1 space-y-6 p-6' data-prototype-cms={search.screen}>
          <Screen variant={search.variant} search={search} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 5: Write `proto-sidebar.tsx` — the extended-nav chrome**

Create `apps/admin/src/components/prototype-cms/proto-sidebar.tsx`. It mirrors the real `AdminSidebar`'s structure (same primitives, same #59 variant-A labeled groups, same icon-rail collapse behavior, same header lockup, same footer card posture) with these pinned deltas — compose it following the real file (`apps/admin/src/components/admin-sidebar.tsx`) line-for-line where not delta'd:

1. Items come straight from `NAV_GROUPS` (icons included there). Items **with** a `key` render `<SidebarMenuButton render={<Link to='/prototype-cms' search={{ screen: item.key, variant }} />} isActive={item.key === active} tooltip={item.label}>` — screen switching rides search params, preserving the current `variant`. Items **without** a `key` (Dashboard / Appointments / Settings) render a plain `SidebarMenuButton` — no `Link`, never active, no click behavior — so the shell reads exactly like the real one.
2. Items carrying `isNew` render a small `Badge` (`variant='outline'`, `text-[0.6rem]`, content `new`) after the label — visually flagging the M5 additions for the IA reaction.
3. The footer user card renders a static PROTOTYPE-ONLY identity (`name: 'Studio Owner'`, `email: 'owner@sevendays.test'`) with the same initials-avatar + ghost `LogOut` icon-button posture as the real sidebar, but **no sign-out wiring** (the button renders; the `onClick` is absent). Flagged PROTOTYPE-ONLY in a comment — the real identity strings deleted by #120 stay deleted everywhere real.

**Not here:** any screen body (Tasks 2–4); sign-out behavior; nav changes to the real sidebar.

- [ ] **Step 6: Boot + render smoke**

```bash
pnpm --filter @sevendays/admin dev &
sleep 8
curl -s 'http://localhost:3000/prototype-cms' | grep -o 'data-prototype-cms="packages"' | head -1
curl -s 'http://localhost:3000/prototype-cms?screen=gallery' | grep -o 'data-prototype-cms="gallery"' | head -1
```

Expected: both greps match (SSR renders the route; the stub screens are keyed). Read the printed port if vite increments. Leave the dev server running for Tasks 2–5 or stop it and re-boot per task.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/routes/prototype-cms.tsx apps/admin/src/components/prototype-cms apps/admin/src/routeTree.gen.ts
git commit -m "prototype(#131): /prototype-cms scaffold — registry, fixtures, shell-lookalike chrome"
```

---

### Task 2: Shared compositions + the packages table + the package editor

**Files:**
- Create: `apps/admin/src/components/prototype-cms/shared.tsx`
- Create: `apps/admin/src/components/prototype-cms/screens/packages.tsx`
- Create: `apps/admin/src/components/prototype-cms/screens/package-editor.tsx`
- Modify: `apps/admin/src/components/prototype-cms/nav.tsx` (two registry swaps: `packages`, `package-editor`)

**Interfaces:**
- Consumes: `fixtures.ts` (`packages`, `printSizes`, `attires`), `nav.tsx` (`ScreenProps`), `@sevendays/ui` primitives (`alert-dialog`, `badge`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `field`, `input`, `label`, `select`, `separator`, `table`, `textarea`), `lucide-react` icons, `@tanstack/react-router` `Link`.
- Produces: the shared building blocks every later screen reuses — `PageHeader` (h1 + subline + actions slot), `peso` (cents → peso string), `StatusBadge` (outline `Deactivated` badge; active rows carry none), `DeactivateConfirm` (controlled `AlertDialog` with the pinned copy), `EmptyState` (pinned line + optional action) — plus the two hardest compositions and the local-state mutation idiom (`useState` over the fixture array; confirm flips `isActive`; reorder moves array elements) that Tasks 3–4 copy.

**Not here:** the matrix screens and their V1/V3 variants (Task 3); gallery/testimonials (Task 4); any persistence beyond component state; any real upload (the cover control is simulated per the pinned caption).

- [ ] **Step 1: `shared.tsx` — the five shared pieces**

Create `apps/admin/src/components/prototype-cms/shared.tsx`. Header comment pinned:

```tsx
// PROTOTYPE (throwaway) — wayfinder #131: shared composition pieces for the
// admin CMS screens. Copy is pinned by the plan's Global Constraints —
// transcribe, never re-draft. Nothing persists.
```

Contents, each exactly as pinned:

1. **`peso`** — verbatim from the landing precedent (test-pinned there as `₱1,100.00`):

```ts
export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
```

2. **`PageHeader`** — props `{ title, subline?, actions? }`; renders the h1 (`text-2xl font-semibold tracking-tight`, the one h1 per screen — house rule) over the muted subline (`text-muted-foreground text-sm`), with `actions` right-aligned on the same row.
3. **`StatusBadge`** — props `{ isActive }`; `isActive` renders nothing; `!isActive` renders `<Badge variant='outline'>Deactivated</Badge>`. Screens dim deactivated rows to `opacity-60` (the badge alone is not the ruling — the pair is).
4. **`DeactivateConfirm`** — a controlled `AlertDialog`: props `{ name, open, onOpenChange, onConfirm }`; title, body, and buttons from the pinned copy inventory (`Deactivate <name>?` / "Deactivated items are hidden…" / `Deactivate` destructive + `Cancel`). `onConfirm` never deletes — the screen's handler flips `isActive` (ruling: deactivate, never delete).
5. **`EmptyState`** — props `{ line, children? }`; a centered muted line inside a dashed-border card (the `StubScreen` posture from `apps/admin/src/components/stub-screen.tsx`), `children` = the optional action button.

- [ ] **Step 2: `screens/packages.tsx` — the table-first list**

Create `apps/admin/src/components/prototype-cms/screens/packages.tsx`, export `PackagesScreen`. Composition spec (skill-driven layout, pinned structure and copy):

- Local state: `const [rows, setRows] = useState(packages)` — all mutations stay here.
- `PageHeader` with h1 `Packages`, the pinned subline, and the `New package` primary `Button` whose `onClick` is a deliberate no-op (the affordance is the composition; the pinned honesty caption below the table covers the posture — wiring a create flow is build-ticket work).
- A `Card` wrapping a `Table`: columns **Cover** (40×30 `rounded-md` block: `bg-muted` with a centered `Image` lucide icon when `coverImageUrl` is null — every fixture row is null, so the placeholder state is the state), **Name** (name semibold + `slug` in `font-mono text-xs text-muted-foreground` beneath), **Price** (`peso(priceCents)`, right-aligned), **Featured** (the word `Featured` in a `Badge variant='secondary'` when `isFeatured`, else —), **Status** (`StatusBadge`), **Actions** (right-aligned: `Edit` ghost button → `<Link to='/prototype-cms' search={{ screen: 'package-editor', variant }}>`; `Deactivate` ghost-destructive button opening `DeactivateConfirm` for that row — on a deactivated row the action reads `Reactivate` and reactivates directly).
- Row treatment: inactive rows get `opacity-60` + the badge; Package A (the `isActive: false` fixture) must visibly demonstrate this.
- Below the table, the pinned honesty caption: `Prototype: changes stay on this page.` (`text-xs text-muted-foreground`).
- `data-prototype-screen='packages'` on the screen's root element (the frame pass keys off these).

- [ ] **Step 3: `screens/package-editor.tsx` — the dedicated edit page (V2 variants)**

Create `apps/admin/src/components/prototype-cms/screens/package-editor.tsx`, export `PackageEditorScreen`. It always renders the `pkg-basic` fixture (Basic Package — one frame, three prints, six privileges: enough to exercise every row kind; the owner reacts to the composition, not to fixture switching). Composition spec:

- Local state: `const [pkg, setPkg] = useState(structuredClone(packages[0]))` (the `pkg-basic` row) — plus helpers `moveInclusion(id, dir)` and `setCover(objectUrl | null)`. `moveInclusion` swaps the row with its neighbor **inside the same section** (a frame group for `framed_picture` rows, the prints or privileges flat list otherwise) by mutating the one underlying `inclusions` array — sections are views over it, and position = array order is the #130 write shape.
- **Header row:** `← Back to packages` (`Link` back to `?screen=packages`, `text-sm text-muted-foreground`) · h1 = `Basic Package` · `StatusBadge` · right-aligned primary `Save changes` whose `onClick` re-derives `frames` frameNumbers from array order and writes the (local) pkg state — followed by the pinned editor caption `Prototype: changes stay on this page.`
- **Layout:** two-column at `xl` (core/cover/slug column ~1/3, inclusions editor ~2/3), stacked below — the owner should see the stack in the mobile-width frames.
- **Core card** (`Card` + `field` primitives): `Name` (`Input`, prefilled), `Description` (`Textarea`, prefilled), `Price` (`Input` with a `₱` adornment, value `900` — pin: **peso units, not cents**, with helper "Stored as centavos."), `Duration (minutes)` (`Input`, empty — nullable in the schema; helper "Optional"), `Featured` (`Checkbox` + label, checked per fixture), `Active` (`Checkbox` + label).
- **Cover card:** 3:2 preview block — `coverImageUrl` null renders the same `bg-muted` + `Image`-icon placeholder as the table; below it `Upload cover` (a real `<input type='file' accept='image/*'>`, visually a `Button` + hidden input, `onChange` → `URL.createObjectURL` → sets local cover) and `Remove cover` (ghost, clears). The pinned simulated-upload caption sits under the actions.
- **Slug advanced card:** `Collapsible`, trigger `Advanced`; content = `Slug` label + `Input` prefilled `basic-package` + the pinned warning line. Collapsed by default (the "advanced field" ruling made visible).
- **Inclusions editor card** — the composition the ticket names. Structure:
  - **Frames:** one group per `frames` entry, header `Frame 1` / `Frame 2` (mono badge) + `Add frame` ghost button (appends a frame at the end). Frame groups render in array order; the editor never shows a frameNumber input (renumber-on-save is the model).
  - Inside each frame group: its `framed_picture` inclusion rows (`kind === 'framed_picture' && row.frameId === frame.id`).
  - **Prints:** a flat section under the frame groups, header `Prints` + `Add print` ghost button.
  - **Privileges:** a flat section, header `Privileges` + `Add privilege` ghost button (appends an empty-description privilege row).
  - **Row anatomy** (all three kinds): kind icon (`Frame`/`Image`/`Gift` lucide) · for framed+print rows a quantity `Input` (type number, width `ch`-bounded) · for print rows a `Select` over `printSizes` codes · description `Input` (privileges: prefilled text; framed+print: placeholder `Description (optional)`) · **attire checkboxes**: the four `attires` names as inline `Checkbox`+label chips (checked per the row's `attires`) · remove (`X` ghost icon) · **reorder** per variant V2.
  - **V2-a** (`variant === 'a'`): `ArrowUp` / `ArrowDown` ghost icon buttons, disabled at the section's ends, moving the row within its own section (frames section = within the frame's group; prints/privileges = within their flat arrays).
  - **V2-b** (`variant === 'b'`): the same buttons plus a `GripVertical` muted icon on the row's left — the drag affordance rendered for reaction, honestly non-functional (no dnd dependency; the owner's verdict decides whether the build tickets add one).
  - Section counts render in the headers (`Prints · 3`) so save-side count drift is visible.
- `data-prototype-screen='package-editor'` on the root.

- [ ] **Step 4: Swap the registry entries**

In `apps/admin/src/components/prototype-cms/nav.tsx`: import `PackagesScreen` and `PackageEditorScreen` from their files and replace the `packages` / `'package-editor'` stub values in `SCREENS`. No other registry line moves.

- [ ] **Step 5: Verify + commit**

```bash
pnpm --filter @sevendays/admin build
curl -s 'http://localhost:3000/prototype-cms' | grep -o 'Basic Package' | head -1
curl -s 'http://localhost:3000/prototype-cms?screen=package-editor' | grep -o 'Frame 1' | head -1
```

Expected: build green; both greps match (the table renders the fixture; the editor renders its frame group).

```bash
git add apps/admin/src/components/prototype-cms
git commit -m "prototype(#131): shared pieces + packages table + package editor (V2 reorder variants)"
```

---

### Task 3: The matrix screens (studio services, add-ons) + branches + lookups

**Files:**
- Create: `apps/admin/src/components/prototype-cms/screens/studio-services.tsx`
- Create: `apps/admin/src/components/prototype-cms/screens/add-ons.tsx`
- Create: `apps/admin/src/components/prototype-cms/screens/branches.tsx`
- Create: `apps/admin/src/components/prototype-cms/screens/lookups.tsx`
- Modify: `apps/admin/src/components/prototype-cms/nav.tsx` (four registry swaps)

**Interfaces:**
- Consumes: everything Task 2 produced (`PageHeader`, `StatusBadge`, `DeactivateConfirm`, `EmptyState`, `peso`, the local-state idiom), `fixtures.ts` (`studioServices`, `addons`, `branches`, `printSizes`, `attires`), `Sheet` + `Dialog` for the V1 chrome variants, `Checkbox` + `Table` + `Card` for the V3 matrix variants.
- Produces: the two checkbox-matrix compositions (the #130 full-replace semantics rendered as UI), the V1 editor-chrome A/B, and the four remaining catalog screens. `LightEntityEditor` — the shared form-shell each screen composes (title = entity name, the entity's fields, `Save changes` / `Cancel`) — may be factored into `shared.tsx` if the screens would otherwise drift; its chrome is the variant's only job.

**Not here:** gallery/testimonials (Task 4); any real matrix persistence (checkbox state is local; the "full-replace PUT" exists only as the reaction context); editing branch hours/capacity (v2 — absent on purpose, the pinned subline says so).

- [ ] **Step 1: `screens/studio-services.tsx` — table + editor + branch matrix (V3)**

Export `StudioServicesScreen`. Composition spec:

- Table (the packages posture): **Name** (+ truncated description subline), **Price** (`peso`, right-aligned), **Bookable at** (the branch names from `branchIds` as muted text — the list view of the matrix), **Status**, **Actions** (`Edit` opens the editor for that row; `Deactivate`/`Reactivate` per the Task 2 idiom). `New studio service` primary (no-op per the pinned posture). Root `data-prototype-screen='studio-services'`.
- **Editor** — opens for the row in `search.edit` (controlled `open`), always in a centered `Dialog` on this screen: **V1 (Dialog-vs-Sheet) is pinned to the add-ons screen only**, one representative carries the A/B and its ruling generalizes. What varies here is **V3, the matrix inside the editor**:
  - Fields: `Name`, `Description` (`Textarea`), `Price` (₱ units + centavos helper, Task 2 posture), `Active` (`Checkbox`).
  - **V3-a** (`variant === 'a'`): under the section heading `Bookable at branches`, a compact `Table` — one row, three columns headed by the branch names, each cell a `Checkbox` bound to `branchIds`.
  - **V3-b** (`variant === 'b'`): the same heading, then one small `Card` per branch — branch name semibold + address muted, its `Checkbox` + `Bookable` label beneath.
  - Matrix changes write straight into the row's local `branchIds` (full-replace on save is the model; no per-cell save affordance).
- `search.edit` semantics (all screens, pinned once here): when `search.edit` matches a fixture `id`, that row's editor renders `open` on mount — this is how the frame pass captures open-editor states without interaction. Cancel/`onOpenChange`(false) closes it client-side only.

- [ ] **Step 2: `screens/add-ons.tsx` — table + editor + applies-to matrix (V1 carrier)**

Export `AddOnsScreen`. Same table posture as studio services (columns Name/description, Price, **Applies to** (studio-service names), Status, Actions; `New add-on` primary). The editor carries **V1**, the axis ruling the owner generalizes:

- **V1-a** (`variant === 'a'`): centered `Dialog`.
- **V1-b** (`variant === 'b'`): right-side `Sheet`.
- Identical content in both: `Name`, `Description`, `Price`, `Active`, then the applies-to matrix under `Applies to services` — **fixed presentation** (the branch-card style from V3-b; the add-on matrix doesn't need its own axis). Changes write into the row's local `studioServiceIds`.
- `search.edit` + `search.confirm` semantics as pinned in Step 1.

- [ ] **Step 3: `screens/branches.tsx` — table + editor**

Export `BranchesScreen`. Table columns: **Name**, **Address**, **Phone** (`font-mono text-sm`), **Walk-ins** (`Badge variant='secondary'` reading `Walk-in friendly` when `acceptsWalkIns`, else —), **Status**, **Actions**. Editor (centered `Dialog`, both variants): `Name`, `Address`, `Phone`, `Accepts walk-ins` (`Checkbox`), `Active` (`Checkbox`). **No hours/capacity fields anywhere** — the pinned subline carries the v2 note. `New branch` primary (no-op; ruling 1 says create is included in M5 — the composition to react to is the editor, and it is identical for create).

- [ ] **Step 4: `screens/lookups.tsx` — print sizes + attires on one screen**

Export `LookupsScreen`. Composition: two stacked `Card`s, each `PageHeader`-less with a card title + its `New` button (`New print size` / `New attire`) + a `Table`:

- **Print sizes:** `Code` (`font-mono`), `Description` (the `8R` row's long seed description must wrap visibly — it exercises real content), `Status` (the `8R` fixture shows the deactivated treatment), `Actions` (`Edit` → centered `Dialog` with `Code` + `Description` + `Active`; `Deactivate`/`Reactivate`).
- **Attires:** `Name`, `Status`, `Actions` (`Edit` → centered `Dialog` with `Name` + `Active`; `Deactivate`/`Reactivate`).
- The one-screen-vs-two-nav-items question rides the Task 6 reaction list — render one screen (this step), flag the alternative there.

- [ ] **Step 5: Registry swaps + verify + commit**

Swap the four registry entries in `nav.tsx` (`studio-services`, `add-ons`, `branches`, `lookups`). Then:

```bash
pnpm --filter @sevendays/admin build
curl -s 'http://localhost:3000/prototype-cms?screen=studio-services&variant=a&edit=ss-tarpaulin' | grep -o 'Bookable at branches' | head -1
curl -s 'http://localhost:3000/prototype-cms?screen=add-ons&variant=b&edit=addon-makeup' | grep -o 'Applies to services' | head -1
```

Expected: build green; both greps match (the matrix editors render open from the deep link).

```bash
git add apps/admin/src/components/prototype-cms
git commit -m "prototype(#131): matrix screens (V3 branch matrix, V1 dialog-vs-sheet) + branches + lookups"
```

---

### Task 4: The new-entity screens — gallery manager + testimonials

**Files:**
- Create: `apps/admin/src/components/prototype-cms/screens/gallery.tsx`
- Create: `apps/admin/src/components/prototype-cms/screens/testimonials.tsx`
- Modify: `apps/admin/src/components/prototype-cms/nav.tsx` (two registry swaps)

**Interfaces:**
- Consumes: Task 2's shared pieces, `fixtures.ts` (`galleryCategories`, `galleryPhotos`, `testimonials`), `Dialog` (photo editor + testimonial editor — light entities), `Select` (category assignment), `Input` (hidden multi-file), lucide `Images`/`ImagePlus`/`GripVertical`.
- Produces: the batch-upload composition (ruling 9: batch is the norm) and the category organization the /about tabs will read from. All upload/persist behavior is simulated per the pinned captions.

**Not here:** any R2 call, presign flow, or real key scheme (that seam is #129's, rendered here only as the pinned caption); landing's tab rendering (that's #132's, not even rendered here); multi-tag categories (out of scope per the map).

- [ ] **Step 1: `screens/gallery.tsx` — the manager**

Export `GalleryScreen`. Composition spec:

- **Layout:** category rail left (fixed width ~220px, `Card`) + photo grid right; stacked on narrow widths (rail becomes a horizontal scroll strip — skill's call within the fence that both postures exist for the mobile frames).
- **Rail:** `All photos` entry (count in muted parens) + one entry per category (`Graduation (3)`) in position order + `New category` ghost button (appends an inline `Input` + confirm — the create affordance rendered, locally appended to the category list). Active rail entry is highlighted (`bg-accent` posture of the sidebar's menu button). Selecting an entry filters the grid.
- **Toolbar** (above the grid): the filter's name as the section heading and the pinned simulated-upload caption. `New category` lives only in the rail (one home, pinned — the owner reacts to it there). Empty-filter state: the pinned `EmptyState` line (`No photos in this category yet.` / `No photos yet.` for All).
- **Batch upload (simulated):** `Upload photos` wraps a hidden `<input type='file' multiple accept='image/*'>`; `onChange` appends one `GalleryPhotoRow` per file — `title` = filename minus extension, `categoryId` = the currently-selected rail category (`null` under All photos), `position` = max+1, `isActive` true, `photoUrl` = `URL.createObjectURL(file)` so the fresh thumbs render for real. New cards animate in at the grid end.
- **Photo grid:** responsive card grid (3–4 columns desktop). Card: 4:3 thumb (`photoUrl` `object-cover`; null → `bg-muted` + `Image` icon; the one `isActive: false` fixture dims + `StatusBadge`), `title` (`text-sm font-medium`), category badge (`Badge variant='outline'`; `Uncategorized` muted for null — the state that stays absent from landing reads), position chip (`#1` mono, top-left overlay). Card hover/footer actions: `Edit`, `Deactivate`/`Reactivate` (confirm via `DeactivateConfirm`), and position `ArrowUp`/`ArrowDown` (single-axis reorder, the same V2-a affordance as inclusions — no separate axis; if the owner rules drag here too, it folds into V2's verdict).
- **Photo editor:** `Edit` opens a centered `Dialog`: thumb preview, `Title` (`Input`), `Caption` (`Textarea`), `Category` (`Select` over categories + `Uncategorized`), `Active` (`Checkbox`), `Save changes`/`Cancel`. `search.edit=gp-2` opens it on load (frame pass).
- Root `data-prototype-screen='gallery'`.

- [ ] **Step 2: `screens/testimonials.tsx` — table + dialog editor**

Export `TestimonialsScreen`. Table columns: **Quote** (truncated single line, full quote in the editor), **Person**, **Position** (`#1` mono — the about-slot order, ruling 8), **Status**, **Actions** (`Edit` / `Deactivate`-`Reactivate`; **no drag**, position is edited in the dialog). Editor: centered `Dialog` with `Quote` (`Textarea`), `Person` (`Input`), `Position` (`Input` type number), `Active` (`Checkbox`), `Save changes`/`Cancel`; `search.edit=tm-1` opens it on load. `New testimonial` primary (no-op posture). Empty state renders the pinned line if the local list ever empties. Root `data-prototype-screen='testimonials'`.

- [ ] **Step 3: Registry swaps + verify + commit**

Swap `gallery` + `testimonials` in `nav.tsx`. Then:

```bash
pnpm --filter @sevendays/admin build
curl -s 'http://localhost:3000/prototype-cms?screen=gallery' | grep -o 'Upload photos' | head -1
curl -s 'http://localhost:3000/prototype-cms?screen=testimonials&edit=tm-1' | grep -o 'Maria S.' | head -1
```

Expected: build green; both greps match.

```bash
git add apps/admin/src/components/prototype-cms
git commit -m "prototype(#131): gallery manager (batch upload + categories) + testimonials"
```

---

### Task 5: The frame pass + full gates

**Files:**
- Create (untracked evidence): 14 PNG frames in `/home/jeius/Projects/sevendays/.superpowers/sdd/2026-09-24-131-admin-cms-compositions/`

**Interfaces:**
- Consumes: the finished route (Tasks 1–4), the pinned screenshot mechanics, the running dev server.
- Produces: the complete frame set (desktop 1440×900 unless noted) the owner reacts to in Task 6, plus the green gates.

**Not here:** any further composition changes (findings go to the Task 6 reaction list, not into a Task 5 redesign); committing the frames (the evidence dir is gitignored).

- [ ] **Step 1: Capture the frame matrix**

Dev server on :3000 (re-boot if needed). From the evidence dir, with `BIN` = the pinned `chrome-headless-shell` path, capture every row (the URL is the query string appended to `http://localhost:3000/prototype-cms`):

| File | Query | Window | What it must show |
|---|---|---|---|
| `packages.png` | `?screen=packages` | 1440×900 | Full table; Package A dimmed + `Deactivated`; Basic's `Featured` badge; slug sublines |
| `package-editor-a.png` | `?screen=package-editor&variant=a` | 1440×900 | Two-column editor; Frame 1 group; prints + privileges sections; up/down reorder buttons; collapsed `Advanced` |
| `package-editor-b.png` | `?screen=package-editor&variant=b` | 1440×900 | Same with the `GripVertical` handles |
| `package-editor-advanced.png` | `?screen=package-editor` | 1440×900 | `Advanced` expanded with the slug warning line (temporary `defaultOpen` on the Collapsible for this frame only — revert after capture) |
| `studio-services-a.png` | `?screen=studio-services&variant=a&edit=ss-tarpaulin` | 1440×900 | Editor open over the table; **V3-a** checkbox-column matrix |
| `studio-services-b.png` | `?screen=studio-services&variant=b&edit=ss-tarpaulin` | 1440×900 | Same with **V3-b** branch cards |
| `add-ons-dialog.png` | `?screen=add-ons&variant=a&edit=addon-makeup` | 1440×900 | **V1-a** centered dialog + applies-to matrix |
| `add-ons-sheet.png` | `?screen=add-ons&variant=b&edit=addon-makeup` | 1440×900 | **V1-b** right-side sheet, identical content |
| `add-ons-confirm.png` | `?screen=add-ons&confirm=addon-hairstyle` | 1440×900 | `DeactivateConfirm` open over the list with the pinned copy |
| `branches.png` | `?screen=branches` | 1440×900 | Table with walk-in badge (Dipolog); editor closed |
| `lookups.png` | `?screen=lookups` | 1440×900 | Both lookup tables; `8R` dimmed + deactivated badge |
| `gallery.png` | `?screen=gallery` | 1440×900 | Rail with counts; grid with placeholder thumbs; `#5` dimmed; `Uncategorized` badge on `#8` |
| `packages-mobile.png` | `?screen=packages` | 375×812 | Table's narrow posture |
| `gallery-mobile.png` | `?screen=gallery` | 375×812 | Rail strip + stacked grid |

Invocation pattern (one per row; `timeout 30` each; dbus stderr noise expected):

```bash
timeout 30 "$BIN" --headless --disable-gpu --no-sandbox \
  --screenshot=packages.png --window-size=1440,900 --hide-scrollbars \
  "http://localhost:3000/prototype-cms?screen=packages" >/dev/null 2>&1
```

- [ ] **Step 2: Read back every frame**

`ls -la` the evidence dir and eyeball each PNG (`file` sizes ≥ tens of KB; a ~5KB PNG is a blank/blocked frame — re-capture that row). The `edit=`/`confirm=` rows must show the open state, not the closed table.

- [ ] **Step 3: Full gates**

```bash
pnpm check
```

Expected: green at the recorded task count (35/35 — no test files were added; admin's no-op `test` script is the standing documented gap). Then confirm the tree holds only the planned files:

```bash
git status --short
```

Expected: only `apps/admin/src/routes/prototype-cms.tsx`, `apps/admin/src/components/prototype-cms/**`, `routeTree.gen.ts`. Fixups (`pnpm fix`) if formatting moved.

- [ ] **Step 4: Push the throwaway branch**

```bash
git push -u origin prototype/131-admin-cms-compositions
```

Expected: branch on origin (evidence + provenance, #57/#120 precedent). Nothing opens a PR.

---

### Task 6: The owner reaction (HITL) → verdicts → wayfinder resolution

**Files:**
- No source files. One comment on issue #131, one resolution comment + close (only after verdicts), one map-body append.

**Interfaces:**
- Consumes: the frame set + the running dev server (owner browses live if they want interaction, not just frames).
- Produces: the ticket's answer — the per-screen/axis verdicts — recorded on #131 and indexed on map #128.

**Not here:** any code change during the reaction (verdicts first; iterations are follow-up work, not mid-review edits); closing the ticket before the owner has actually ruled (HITL).

- [ ] **Step 1: Present the frames in-session**

Walk the owner through the 14 frames in inventory order (packages → editor (a/b/advanced) → matrices (a/b) → V1 pair → confirm → branches → lookups → gallery → mobile pair), then leave the dev server up for live clicking. Elicit one verdict per item on this pinned checklist:

1. **Per screen (8):** falls out of the design system as-is — or name the iteration.
2. **V1:** add-on editor — Dialog (a) or Sheet (b)?
3. **V2:** inclusions reorder — plain buttons (a), or buttons + drag handle (b) — and if (b): does the *build* need a real dnd library?
4. **V3:** branch matrix — checkbox columns (a) or branch cards (b)?
5. **IA:** Gallery + Testimonials in Catalog, Lookups in Studio — right groups? Lookups one screen or two nav items?
6. **States:** deactivated badge + 60% dim; no badge on active — confirmed?
7. **Copy:** the pinned sublines/empty-states/confirm wording — confirmed verbatim?

- [ ] **Step 2: Record the verdicts on #131 (handover comment)**

Stage the body as a temp file and verify the write (wayfinder lesson):

```bash
cat > /tmp/131-frames.md <<'EOF'
## Frames ready for reaction

Branch: `prototype/131-admin-cms-compositions` (throwaway — never merges; main keeps the rulings)

Frames: `.superpowers/sdd/2026-09-24-131-admin-cms-compositions/` (14 PNGs, listed in the plan's Task 5 matrix). Live: `pnpm --filter @sevendays/admin dev` → `/prototype-cms?screen=…&variant=…`.

**React to (the ticket's question):** per-screen verdicts (8), V1 dialog-vs-sheet, V2 reorder affordance (+ real-dnd question), V3 matrix presentation, IA placement of the three new destinations, the deactivated-state treatment, and the pinned copy set.

<owner verdicts recorded here per the Task 6 Step 1 checklist>

Ticket stays open until the owner reacts (HITL).
EOF
gh issue comment 131 --body-file /tmp/131-frames.md
gh api repos/jeius/sevendays/issues/131/comments --jq '.[-1].body' | head -5
```

- [ ] **Step 3: After the owner rules — resolve the wayfinder ticket**

Only once the verdicts are in-hand (same session, per the HITL contract):

1. Post the **resolution comment** on #131: the verdicts restated as decisions (per-screen as-is/iterate; V1/V2/V3 picks; IA placement; state + copy confirmations), frames + branch referenced as provenance.
2. `gh issue close 131`.
3. Append the one-line gist to map #128's **Decisions so far**: `[M5 prototype: admin CMS compositions](…/issues/131): <gist — the picked variants + which screens iterate>`.
4. Graduate any fog the verdicts sharpened (e.g., a real-dnd-library need for the build tickets lands as a line in the map's **Not yet specified** or a new ticket if it's sharp; a "one screen vs two" ruling updates the spec ticket's raw material — the map's destination, the M5 spec, consumes the verdicts verbatim).

---

## Self-Review

- **Spec coverage:** the ticket's composition list — table-first screens on the four stub-named surfaces (`packages`/`studio-services`/`add-ons`/`branches` — Tasks 2–3), new gallery/testimonials/lookups screens (Tasks 3–4), dialog/sheet editing for light entities (V1, Task 3), a dedicated package edit page with inclusions reorder + cover upload + slug-advanced (Task 2), gallery manager with batch upload + categories (Task 4), checkbox matrices on service/add-on forms (Task 3), deactivate behind a confirm, never delete (the shared idiom, Task 2 + every screen) — all rendered; the open question is operationalized as three axes + a per-screen checklist (Task 6).
- **Sibling fence:** #129 appears only as pinned helper text + simulated upload; #130 only as field lists and the array-order/position semantics; #132 not at all (no landing file touched). No route/service/schema/client work anywhere in the plan.
- **Fixture law:** every catalog literal transcribed from `packages/db/scripts/catalog.ts` (sizes, attires, branches, studio services, add-ons, Basic/D/A packages with their exact frames/prints/privileges); the three gallery/testimonial synthetic sets and three flag exercises are marked PROTOTYPE-ONLY both here and in the pinned file content.
- **No placeholders:** the four scaffold files are verbatim; every owner-visible string is pinned verbatim in Global Constraints and quoted once per use site; screen bodies are pinned as element-by-element composition specs (structure, primitives, states, variants) with layout micro-decisions explicitly delegated to the loaded skill set — that delegation is stated, not implied, and is the prototype skill's contracted role.
- **Gates:** fresh-worktree order, `pnpm check` at a pinned count with reconcile-first wording, per-task build + curl greps, the frame read-back step, push-without-PR. No test files → the count must not move.
- **Cross-task names:** `ScreenProps { variant, search }` (Task 1) matches every screen's signature (Tasks 2–4); `peso`/`PageHeader`/`StatusBadge`/`DeactivateConfirm`/`EmptyState` produced in Task 2 Step 1 are consumed under the same names in Tasks 3–4; `search.edit`/`search.confirm` defined once (Task 3 Step 1, applies to all screens) and used by the Task 5 frame URLs; fixture ids used by frame URLs (`ss-tarpaulin`, `addon-makeup`, `addon-hairstyle`, `gp-2`, `tm-1`) all exist in `fixtures.ts`.
- **Counted claims:** 8 screens × verdicts + 3 axes + IA + states + copy = the 7-item Task 6 checklist; 14 frame rows in Task 5 (12 desktop + 2 mobile) — matches the file list and the Task 6 presentation order.

