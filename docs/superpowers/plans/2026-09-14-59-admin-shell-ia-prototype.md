# Admin App Shell + IA Prototype (wayfinder #59) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Build three structurally different admin app-shell + IA variants (labeled sidebar / top bar / icon rail) over the same appointments-dashboard content, on a throwaway branch wearing the real shared tokens, so the owner can pick the shell and settle wayfinder #59.

**Architecture:** One throwaway TanStack Start route in `apps/admin` (`/prototype-shell`, gated by a `?variant=a|b|c` search param) renders one of three shell variants, each owning its full layout markup. The dashboard content the shells carry — appointments table with branch/status filters and in-memory status update — lives in one shared module fed by a mock-data module shaped exactly like `packages/db/src/schema/appointments.ts`. A floating bottom switcher (dev-only) cycles variants with arrows and `←`/`→` keys. Nothing merges to `main`; the branch is the reaction artifact and the primary source for the ruling.

**Tech Stack:** TanStack Start (file routes, `validateSearch` + zod), Tailwind v4 semantic utilities from `@sevendays/ui/tokens.css`, lucide-react icons, hand-rolled elements (no component library), Biome, Python 3 for the ui-ux-pro-max recon script.

**Spec:** This plan implements wayfinder ticket [#59 "Prototype: admin app shell + IA"](https://github.com/jeius/sevendays/issues/59) on map [#55 "Wayfinder map: UI/UX design system milestone"](https://github.com/jeius/sevendays/issues/55). Key spec facts:

- **Deliverable** (from #59): rough prototype variants for layout and navigation — sidebar vs top bar; nav taxonomy over the known surfaces: Appointments, Catalog (packages / add-ons / studio services), Branches, Settings — plus a dashboard skeleton over the appointments surface: list, branch/status filter, status update. The shell must **anticipate M5's CMS (content editing, R2 image upload) without building it**. The owner picks the variant; the ruling is shell + IA, not pixel polish.
- **The prototype wears the brand-mapped tokens** from the token-unification ticket: `packages/ui/src/tokens.css` is live on `main` (merged via PR #91), `apps/admin/src/styles.css` already imports it. Reactions are real; admin is never left at zinc defaults.
- **Admin is tool-neutral** (#90 ruling, 2026-09-13): clean working surfaces, not landing's atmosphere. The current semantic layer is the interim teal preset; the logo-palette swap rides [#92](https://github.com/jeius/sevendays/issues/92)/the milestone and will re-map beneath these utilities — **reactions focus on structure, density, and IA, not on specific hues**.
- **Dates note** (staleness guard): the ticket calls the appointments surface "the concrete M4 surface" (charted 2026-09-09). The 2026-09-11 delivery-versions restructure moved the appointments dashboard to v2 (`docs/plan.md` § v2, ruling 6 of #62). That changes *when* the real dashboard is built, not what the prototype needs: the appointments shapes are the only concrete, schema-real admin surface that exists today, so the skeleton is still built over them. The shell ruling is unaffected.
- **Fenced out — sibling boundaries:** no component vocabulary is established here (that is [Grilling: component vocabulary + inventory](https://github.com/jeius/sevendays/issues/58), open); no `components.json`/shadcn CLI setup (milestone execution per #56's ruling); no token edits (#92 owns the palette layer); no charts or dashboard data-viz content (map fog "Admin dashboard data-viz" graduates only after this IA ruling — the KPI/stat chips here are skeleton placeholders, not the decision); no auth (M4), no CMS screens (M5 — reached only as stub surfaces), no real routes/nav wiring (milestone execution).
- **Parked / out of scope:** dark mode (v1), Storybook/visual tooling, formal a11y audit, executing the milestone, `docs/progress.md` updates (throwaway branch; progress docs update when validated work lands on `main`), `graphify update` (the graph tracks `main`).

## Global Constraints

- **Work happens in the worktree** `/home/jeius/Projects/sevendays/.worktrees/59-admin-shell` on branch `prototype/59-admin-shell-ia`, created off `main` @ `add0cef` (verify before creating: `git -C /home/jeius/Projects/sevendays rev-parse --short HEAD`; if `main` moved, branch off the current HEAD instead and note the new sha in the handover comment). This plan file lives in the main tree — executors read it from `/home/jeius/Projects/sevendays/docs/superpowers/plans/2026-09-14-59-admin-shell-ia-prototype.md` and run everything else inside the worktree.
- **Everything is throwaway-branch work.** Nothing merges to `main`; `main` keeps only the ruling later. Every prototype file starts with a `// PROTOTYPE (throwaway) — wayfinder #59` header comment.
- **No tests for prototype code** (prototype rules: no tests, no polish). The gates are: existing suites stay green, admin builds, the route renders. `pnpm check` must pass at the end (repo rule: don't commit code that fails it for touched packages). `@sevendays/admin`'s `test` script is a documented no-op — a pass there is expected, not evidence.
- **Wear the tokens, never edit them.** No changes to `packages/ui/*` and no changes to `apps/admin/src/styles.css`. Only semantic-token utilities in variant markup (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, `bg-sidebar*`, `font-mono`, …). Admin's `body` still carries the starter's atmospheric gradients — each shell covers the viewport with its own opaque `min-h-dvh bg-background` surface so the tool-neutral reaction isn't polluted; the gradients themselves are milestone cleanup, not ours.
- **No new dependencies, no component library.** shadcn/Base UI setup is milestone work (#56 ruling). Use hand-rolled utility-styled native elements (`button`, `select`, `input`, `table`) and `lucide-react` icons (already a dependency). Only these icon names — all long-standing lucide exports: `LayoutDashboard`, `CalendarDays`, `Package`, `PlusCircle`, `Wrench`, `MapPin`, `Settings`, `Search`, `Bell`, `ChevronLeft`, `ChevronRight`.
- **Mock data is pinned to owner-approved sources** — never invented catalog data (repo rule). Enum values and field names mirror `packages/db/src/schema/appointments.ts`; names/prices mirror `packages/db/scripts/catalog.ts` seeds:

  | Literal | Value |
  |---|---|
  | statuses | `pending`, `confirmed`, `completed`, `cancelled`, `no_show` |
  | kinds | `scheduled`, `walk_in`, `visitation` |
  | branches | Calamba Main Branch (DBAN, Calamba, Misamis Occidental) · Iligan Branch (Iligan City, Lanao del Norte) · Dipolog Branch (Dipolog City, Zamboanga del Norte) |
  | packages + `bookedPriceCents` | Basic Package 90000 · Package A 110000 · Package B 150000 · Package C 160000 · Package D 180000 · Package E 200000 · Package F 220000 · Package G 300000 · Package H 300000 · CP-1 240000 · CP-2 220000 |
  | add-ons (notes copy only) | Makeup 12000 · Hairstyle |
  | studio services | Photo Recovery 150000 · Tarpaulin & Bulletin Printing |

- **Dates are now-relative, never hard-coded** (rot rule): rows are generated from *today's midnight + offset* (not `Date.now()`), so SSR and client hydration render identical strings and the data never rots into the past. Derived labels: `Today` / `Tomorrow` / `Yesterday`, else `Tue, Sep 15` format.
- **Intl outputs are pinned from a live probe** (Node 22-class, full ICU — `node -e` verified 2026-09-14): peso via `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` → `₱900.00`, `₱1,500.00`, `₱3,000.00`; day via `toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })` → `Tue, Sep 15`; time via `toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })` → `2:30 PM`. If the executor's runtime renders differently, that's a partial-ICU Node — fix the Node, never edit the expectation.
- **`.env.local` is gitignored** — the fresh worktree won't have `apps/admin/.env.local` (30 bytes, key `API_URL`) and `dotenv -e` hard-fails without it. Task 1 copies it from the main tree. The prototype route itself never calls the API — state is in-memory only (prototype rule).
- **Admin dev server** runs on port 3000 (`vite dev --port 3000`, non-strict — it falls forward to 3001+ if taken; read the printed URL). Landing also uses 3000; don't run both.
- **ui-ux-pro-max is advisory.** Run the pinned searches in Task 1 and fold the guidance into variant styling (spacing rhythm, contrast, focus states); the variant *structure* is decided by this plan. Never use `--persist` (no `design-system/` files in the repo). Python 3.12.3 confirmed present.
- **Type-inference facts, spiked in this package's typecheck (2026-09-14, spike files deleted):** `navigate({ search: { variant } })` against a `validateSearch` zod enum requires the literal union — a `string` (or a generic `K extends string`) key fails with `TS2322`; the switcher therefore owns `type VariantKey = 'a' | 'b' | 'c'`. `noUncheckedIndexedAccess` is on: every array-indexed value is `T | undefined` — index access feeding property access gets a guard (`?? fallback` + early return, or `find()` + null check), never a non-null assertion.
- **The floating switcher is dev-only** (`import.meta.env.DEV`) so a stray merge can't ship it.
- pnpm-only, `async`/`await` style, single quotes + semicolons, `import type` for type-only imports (Biome enforces).
- **HITL close-out:** #59 stays **OPEN** after the handover — it resolves when the owner reacts. No map edits, no ticket close, no Decisions-so-far append in this plan's scope.

---

### Task 1: Worktree, baseline, and ui-ux-pro-max recon

**Files:**
- Create: git worktree `.worktrees/59-admin-shell` (branch `prototype/59-admin-shell-ia`)
- Create: `apps/admin/.env.local` in the worktree (copy, gitignored)

**Interfaces:**
- Consumes: `main` @ `add0cef`; `apps/admin/.env.local` from the main tree; the installed ui-ux-pro-max skill (Python 3.12.3).
- Produces: a runnable worktree every later task commits to; a distilled design-guidance note recorded in the Task 4 commit message (structure stays as planned; styling absorbs the guidance).

- [ ] **Step 1: Create the worktree**

From `/home/jeius/Projects/sevendays` (main tree):

```bash
git -C /home/jeius/Projects/sevendays rev-parse --short HEAD   # expect add0cef; if not, branch off current HEAD
git -C /home/jeius/Projects/sevendays worktree add .worktrees/59-admin-shell -b prototype/59-admin-shell-ia main
cp /home/jeius/Projects/sevendays/apps/admin/.env.local /home/jeius/Projects/sevendays/.worktrees/59-admin-shell/apps/admin/.env.local
```

- [ ] **Step 2: Baseline green check**

From the worktree root:

```bash
pnpm install && pnpm build:packages && pnpm test
```

Expected: install links, packages build, tests pass (`@sevendays/admin` no-op pass expected). If the baseline is red, stop and report — do not prototype on a broken base.

- [ ] **Step 3: Run the pinned ui-ux-pro-max searches**

From the main-tree repo root (the skill scripts live there):

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "internal admin operations dashboard photography studio" --design-system --density 8 -p "Sevendays Admin"
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "navigation sidebar taxonomy information architecture" --domain ux
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "table filter status workflow" --domain ux
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "admin dashboard layout" --stack shadcn
```

Distill what applies (spacing rhythm, density, contrast/focus rules, nav-depth guidance) into a short note — it rides the Task 4 commit message and shapes variant styling. No `--persist`, no repo files from this. If a search returns empty/off-topic, retry once narrower per the skill's contract, then move on — the plan's structure does not depend on the outputs.

- [ ] **Step 4: Nothing to commit**

Worktree creation and the gitignored env copy leave the branch clean. Proceed to Task 2.

---

### Task 2: Mock data module

**Files:**
- Create: `apps/admin/src/prototype/data.ts`

**Interfaces:**
- Consumes: nothing (leaf module; enums + literals from Global Constraints).
- Produces (later tasks import exactly these): types `PrototypeStatus`, `PrototypeKind`, `PrototypeBranch`, `PrototypeAppointment`, `PrototypeFilters`; values `prototypeStatuses`, `prototypeBranches`, `prototypeAppointments`; functions `formatPeso(cents: number): string`, `formatDayLabel(date: Date): string`, `formatTimeLabel(date: Date): string`, `branchShortName(branchId: string): string`, `dayOffsetOf(date: Date): number`, `filterAppointments(rows: PrototypeAppointment[], filters: PrototypeFilters): PrototypeAppointment[]`, hook `usePrototypeAppointments()` returning `{ rows, visible, filters, setFilters, updateStatus }`.

- [ ] **Step 1: Write `apps/admin/src/prototype/data.ts`**

Create with exactly this content:

```ts
// PROTOTYPE (throwaway) — wayfinder #59: admin app shell + IA variants.
// Mock data shaped like packages/db/src/schema/appointments.ts (same enum
// values, same field names) so the dashboard skeleton reacts against real
// shapes. Catalog literals mirror packages/db/scripts/catalog.ts seeds.
// Never shipped: the milestone spec owns the real admin build.
import { useCallback, useState } from 'react';

export type PrototypeStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PrototypeKind = 'scheduled' | 'walk_in' | 'visitation';

export interface PrototypeBranch {
  id: string;
  name: string;
  shortName: string;
  address: string;
}

export interface PrototypeAppointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  branchId: string;
  offering: string;
  offeringKind: 'package' | 'studio_service';
  scheduledAt: Date;
  status: PrototypeStatus;
  kind: PrototypeKind;
  bookedPriceCents: number;
  notes: string | null;
}

export interface PrototypeFilters {
  branchId: string | 'all';
  status: PrototypeStatus | 'all';
}

export const prototypeStatuses: PrototypeStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
];

export const prototypeBranches: PrototypeBranch[] = [
  {
    id: 'br-calamba',
    name: 'Calamba Main Branch',
    shortName: 'Calamba',
    address: 'DBAN, Calamba, Misamis Occidental',
  },
  {
    id: 'br-iligan',
    name: 'Iligan Branch',
    shortName: 'Iligan',
    address: 'Iligan City, Lanao del Norte',
  },
  {
    id: 'br-dipolog',
    name: 'Dipolog Branch',
    shortName: 'Dipolog',
    address: 'Dipolog City, Zamboanga del Norte',
  },
];

// Anchored to today's midnight (not Date.now()) so SSR and client
// hydration render identical strings and the rows never rot into the past.
function todayAt(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const prototypeAppointments: PrototypeAppointment[] = [
  {
    id: 'ap-001',
    customerName: 'Juan dela Cruz',
    customerEmail: 'juan.delacruz@example.com',
    customerPhone: '+63 917 000 0001',
    branchId: 'br-calamba',
    offering: 'Basic Package',
    offeringKind: 'package',
    scheduledAt: todayAt(1, 10, 0),
    status: 'pending',
    kind: 'scheduled',
    bookedPriceCents: 90000,
    notes: null,
  },
  {
    id: 'ap-002',
    customerName: 'Maria Santos',
    customerEmail: 'maria.santos@example.com',
    customerPhone: '+63 917 000 0002',
    branchId: 'br-iligan',
    offering: 'Package B',
    offeringKind: 'package',
    scheduledAt: todayAt(0, 14, 0),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 150000,
    notes: 'Wants the Filipiniana shots first.',
  },
  {
    id: 'ap-003',
    customerName: 'Angelo Reyes',
    customerEmail: 'angelo.reyes@example.com',
    customerPhone: '+63 917 000 0003',
    branchId: 'br-dipolog',
    offering: 'Package E',
    offeringKind: 'package',
    scheduledAt: todayAt(-1, 9, 0),
    status: 'completed',
    kind: 'scheduled',
    bookedPriceCents: 200000,
    notes: null,
  },
  {
    id: 'ap-004',
    customerName: 'Kristine Ramos',
    customerEmail: 'kristine.ramos@example.com',
    customerPhone: '+63 917 000 0004',
    branchId: 'br-calamba',
    offering: 'Package A',
    offeringKind: 'package',
    scheduledAt: todayAt(-1, 15, 0),
    status: 'no_show',
    kind: 'scheduled',
    bookedPriceCents: 110000,
    notes: 'No answer on follow-up call.',
  },
  {
    id: 'ap-005',
    customerName: 'Pedro Villanueva',
    customerEmail: 'pedro.villanueva@example.com',
    customerPhone: '+63 917 000 0005',
    branchId: 'br-iligan',
    offering: 'Photo Recovery',
    offeringKind: 'studio_service',
    scheduledAt: todayAt(1, 16, 30),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 150000,
    notes: 'Bringing two scanned wedding photos.',
  },
  {
    id: 'ap-006',
    customerName: 'Ana Lim',
    customerEmail: 'ana.lim@example.com',
    customerPhone: '+63 917 000 0006',
    branchId: 'br-dipolog',
    offering: 'Package D',
    offeringKind: 'package',
    scheduledAt: todayAt(2, 11, 0),
    status: 'cancelled',
    kind: 'visitation',
    bookedPriceCents: 180000,
    notes: 'Cancelled — rescheduling next month.',
  },
  {
    id: 'ap-007',
    customerName: 'Jose Ocampo',
    customerEmail: 'jose.ocampo@example.com',
    customerPhone: '+63 917 000 0007',
    branchId: 'br-calamba',
    offering: 'Tarpaulin & Bulletin Printing',
    offeringKind: 'studio_service',
    scheduledAt: todayAt(0, 10, 30),
    status: 'pending',
    kind: 'walk_in',
    bookedPriceCents: 80000,
    notes: null,
  },
  {
    id: 'ap-008',
    customerName: 'Grace Fernandez',
    customerEmail: 'grace.fernandez@example.com',
    customerPhone: '+63 917 000 0008',
    branchId: 'br-iligan',
    offering: 'Package G',
    offeringKind: 'package',
    scheduledAt: todayAt(3, 13, 0),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 300000,
    notes: null,
  },
  {
    id: 'ap-009',
    customerName: 'Miguel Torres',
    customerEmail: 'miguel.torres@example.com',
    customerPhone: '+63 917 000 0009',
    branchId: 'br-dipolog',
    offering: 'Basic Package',
    offeringKind: 'package',
    scheduledAt: todayAt(-2, 13, 30),
    status: 'completed',
    kind: 'walk_in',
    bookedPriceCents: 90000,
    notes: null,
  },
  {
    id: 'ap-010',
    customerName: 'Liza Aquino',
    customerEmail: 'liza.aquino@example.com',
    customerPhone: '+63 917 000 0010',
    branchId: 'br-calamba',
    offering: 'Package C',
    offeringKind: 'package',
    scheduledAt: todayAt(1, 9, 0),
    status: 'pending',
    kind: 'scheduled',
    bookedPriceCents: 160000,
    notes: 'Graduation rush — needs prints in five days.',
  },
  {
    id: 'ap-011',
    customerName: 'Rafael Mendoza',
    customerEmail: 'rafael.mendoza@example.com',
    customerPhone: '+63 917 000 0011',
    branchId: 'br-iligan',
    offering: 'Package H',
    offeringKind: 'package',
    scheduledAt: todayAt(2, 14, 0),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 300000,
    notes: 'With Makeup + Hairstyle add-ons.',
  },
  {
    id: 'ap-012',
    customerName: 'Carmen Garcia',
    customerEmail: 'carmen.garcia@example.com',
    customerPhone: '+63 917 000 0012',
    branchId: 'br-dipolog',
    offering: 'Package F',
    offeringKind: 'package',
    scheduledAt: todayAt(-1, 16, 0),
    status: 'cancelled',
    kind: 'scheduled',
    bookedPriceCents: 220000,
    notes: null,
  },
];

export function formatPeso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}

export function dayOffsetOf(date: Date): number {
  // Normalize BOTH sides to local midnight before diffing: carrying
  // time-of-day in the numerator mislabels afternoon rows by a day
  // (review finding, Task 2 round 1). Clone first — never mutate the row.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDayLabel(date: Date): string {
  const diff = dayOffsetOf(date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function branchShortName(branchId: string): string {
  return prototypeBranches.find((b) => b.id === branchId)?.shortName ?? branchId;
}

export function filterAppointments(
  rows: PrototypeAppointment[],
  filters: PrototypeFilters,
): PrototypeAppointment[] {
  return rows.filter(
    (r) =>
      (filters.branchId === 'all' || r.branchId === filters.branchId) &&
      (filters.status === 'all' || r.status === filters.status),
  );
}

// In-memory only (prototype rule): the status-update interaction is the
// thing being prototyped, so state stays client-side and resets on reload.
export function usePrototypeAppointments() {
  const [rows, setRows] = useState(prototypeAppointments);
  const [filters, setFilters] = useState<PrototypeFilters>({ branchId: 'all', status: 'all' });
  const visible = filterAppointments(rows, filters);
  const updateStatus = useCallback((id: string, status: PrototypeStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);
  return { rows, visible, filters, setFilters, updateStatus };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sevendays/admin typecheck
```

Expected: clean (module is unreferenced yet — `noUnusedLocals` does not flag exported members).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/prototype/data.ts
git commit -m "prototype(#59): mock appointments module — schema-shaped, seed-priced, now-relative"
```

---

### Task 3: Shared dashboard content — appointments table + stub surfaces

**Files:**
- Create: `apps/admin/src/prototype/appointments-table.tsx`
- Create: `apps/admin/src/prototype/stub-surface.tsx`

**Interfaces:**
- Consumes: `data.ts` exports (`PrototypeAppointment`, `PrototypeStatus`, `prototypeStatuses`, `branchShortName`, `formatDayLabel`, `formatPeso`, `formatTimeLabel`).
- Produces: `AppointmentsTable({ appointments, onStatusChange, dense }: { appointments: PrototypeAppointment[]; onStatusChange: (id: string, status: PrototypeStatus) => void; dense?: boolean })`; `StubSurface({ title, blurb }: { title: string; blurb: string })`; `stubBlurbs` const + `StubScreen` type (`'appointments' | 'packages' | 'addons' | 'services' | 'branches' | 'settings'`) used by all three variants.

- [ ] **Step 1: Write `apps/admin/src/prototype/appointments-table.tsx`**

Create with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #59: the one dashboard content module
// shared by all three shell variants, so reactions compare shells and IA,
// not table styling. Hand-rolled from semantic tokens only — no component
// library (that's milestone work).
import {
  branchShortName,
  formatDayLabel,
  formatPeso,
  formatTimeLabel,
  prototypeStatuses,
  type PrototypeAppointment,
  type PrototypeStatus,
} from './data';

const statusBadgeClass: Record<PrototypeStatus, string> = {
  pending: 'border-border bg-secondary text-secondary-foreground',
  confirmed: 'border-primary/30 bg-primary/10 text-primary',
  completed: 'border-foreground/20 bg-foreground/5 text-foreground',
  cancelled: 'border-destructive/30 bg-destructive/10 text-destructive',
  no_show: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

const statusLabel: Record<PrototypeStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export function AppointmentsTable({
  appointments,
  onStatusChange,
  dense = false,
}: {
  appointments: PrototypeAppointment[];
  onStatusChange: (id: string, status: PrototypeStatus) => void;
  dense?: boolean;
}) {
  const cell = dense ? 'px-2 py-1.5' : 'px-4 py-3';
  const text = dense ? 'text-xs' : 'text-sm';

  if (appointments.length === 0) {
    return (
      <p className='text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center text-sm'>
        No appointments match these filters.
      </p>
    );
  }

  return (
    <div className='overflow-x-auto rounded-lg border border-border'>
      <table className='w-full border-collapse text-left'>
        <thead>
          <tr className='bg-muted/50 text-muted-foreground text-xs tracking-wide uppercase'>
            <th className={`${cell} font-medium`}>Customer</th>
            <th className={`${cell} font-medium`}>Offering</th>
            <th className={`${cell} font-medium`}>Branch</th>
            <th className={`${cell} font-medium`}>When</th>
            <th className={`${cell} font-medium`}>Price</th>
            <th className={`${cell} font-medium`}>Status</th>
          </tr>
        </thead>
        <tbody className={text}>
          {appointments.map((a) => (
            <tr
              key={a.id}
              className='border-border border-t hover:bg-muted/30'
              title={a.notes ?? undefined}
            >
              <td className={cell}>
                <div className='text-foreground font-medium'>{a.customerName}</div>
                <div className='text-muted-foreground text-xs'>{a.customerEmail}</div>
              </td>
              <td className={cell}>
                <div className='text-foreground'>{a.offering}</div>
                <div className='text-muted-foreground text-xs'>
                  {a.offeringKind === 'package' ? 'Package' : 'Studio service'}
                  {a.kind === 'walk_in' ? ' · walk-in' : ''}
                  {a.kind === 'visitation' ? ' · visitation' : ''}
                </div>
              </td>
              <td className={`${cell} text-muted-foreground`}>{branchShortName(a.branchId)}</td>
              <td className={`${cell} font-mono text-xs whitespace-nowrap`}>
                <span className='text-foreground'>{formatDayLabel(a.scheduledAt)}</span>
                <span className='text-muted-foreground'> · {formatTimeLabel(a.scheduledAt)}</span>
              </td>
              <td className={`${cell} font-mono whitespace-nowrap`}>
                {formatPeso(a.bookedPriceCents)}
              </td>
              <td className={cell}>
                <div className='flex items-center gap-2 whitespace-nowrap'>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass[a.status]}`}
                  >
                    {statusLabel[a.status]}
                  </span>
                  <select
                    value={a.status}
                    onChange={(e) => onStatusChange(a.id, e.currentTarget.value as PrototypeStatus)}
                    aria-label={`Update status for ${a.customerName}`}
                    className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-1.5 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none'
                  >
                    {prototypeStatuses.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/admin/src/prototype/stub-surface.tsx`**

Create with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #59: placeholder screens behind nav
// items whose real surface belongs to a later milestone. They exist so the
// nav taxonomy is clickable and feels real — the ruling is shell + IA.
export const stubBlurbs = {
  appointments: {
    title: 'Appointments',
    blurb:
      'The full bookings worklist. List, branch/status filters, and status updates are stubbed on the dashboard screen here; the real surface is the appointments dashboard, now v2 payload.',
  },
  packages: {
    title: 'Packages',
    blurb:
      'Package catalog CRUD — create, edit, deactivate. Cover-photo uploads land here with M5 CMS and its R2 media bucket.',
  },
  addons: {
    title: 'Add-ons',
    blurb:
      'Add-on services catalog (Makeup, Hairstyle, …) and which studio services they apply to. M5 CMS surface.',
  },
  services: {
    title: 'Studio services',
    blurb:
      'Studio services catalog (Photo Recovery, Tarpaulin & Bulletin Printing, …) and per-branch bookability. M5 CMS surface.',
  },
  branches: {
    title: 'Branches',
    blurb:
      'Branch info editing — name, address, phone, walk-in flag, business hours, slot capacity. M5 CMS surface.',
  },
  settings: {
    title: 'Settings',
    blurb:
      'Admin settings — surfaces with M4 admin auth (staff accounts and sessions). Shape TBD by that milestone.',
  },
} as const;

export type StubScreen = keyof typeof stubBlurbs;

export function StubSurface({ title, blurb }: { title: string; blurb: string }) {
  return (
    <section className='bg-card/50 border-border flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center'>
      <h2 className='text-foreground text-lg font-semibold'>{title}</h2>
      <p className='text-muted-foreground mt-2 max-w-md text-sm'>{blurb}</p>
      <p className='text-muted-foreground/70 mt-4 font-mono text-xs'>
        stub — not built in this prototype
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm --filter @sevendays/admin typecheck
git add apps/admin/src/prototype/appointments-table.tsx apps/admin/src/prototype/stub-surface.tsx
git commit -m "prototype(#59): shared appointments table + milestone stub surfaces"
```

Expected: typecheck clean.

---

### Task 4: Variant A — labeled sidebar shell

**Files:**
- Create: `apps/admin/src/prototype/variant-a-sidebar.tsx`

**Interfaces:**
- Consumes: `AppointmentsTable` (Task 3), `StubSurface`, `stubBlurbs`, `StubScreen` (Task 3), `usePrototypeAppointments`, `prototypeBranches`, `prototypeStatuses`, `formatPeso`, `dayOffsetOf` (Task 2).
- Produces: `export function VariantASidebar()` — rendered by the route (Task 7). Root element carries `data-shell-variant='a'` (smoke-test marker).

- [ ] **Step 1: Write `apps/admin/src/prototype/variant-a-sidebar.tsx`**

Create with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #59 variant A: labeled sidebar shell.
// Fixed left sidebar with grouped nav, sticky top bar with search/user,
// KPI cards + filter bar + appointments table on the dashboard screen.
// The sidebar is desktop-only here (hidden below md); a mobile drawer is
// out of prototype scope — the ruling is shell + IA.
import type { LucideIcon } from 'lucide-react';
import { Bell, CalendarDays, LayoutDashboard, MapPin, Package, PlusCircle, Search, Settings, Wrench } from 'lucide-react';
import { useState } from 'react';
import { AppointmentsTable } from './appointments-table';
import { StubSurface, stubBlurbs, type StubScreen } from './stub-surface';
import {
  dayOffsetOf,
  formatPeso,
  prototypeBranches,
  prototypeStatuses,
  usePrototypeAppointments,
} from './data';

type Screen = 'dashboard' | StubScreen;

interface NavItem {
  id: Screen;
  label: string;
  icon: LucideIcon;
}

const navGroups: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { id: 'packages', label: 'Packages', icon: Package },
      { id: 'addons', label: 'Add-ons', icon: PlusCircle },
      { id: 'services', label: 'Studio services', icon: Wrench },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { id: 'branches', label: 'Branches', icon: MapPin },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const screenTitle: Record<Screen, string> = {
  dashboard: 'Dashboard',
  appointments: stubBlurbs.appointments.title,
  packages: stubBlurbs.packages.title,
  addons: stubBlurbs.addons.title,
  services: stubBlurbs.services.title,
  branches: stubBlurbs.branches.title,
  settings: stubBlurbs.settings.title,
};

export function VariantASidebar() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const { rows, visible, filters, setFilters, updateStatus } = usePrototypeAppointments();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const sessionsToday = rows.filter((r) => dayOffsetOf(r.scheduledAt) === 0).length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const confirmedValue = rows
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + r.bookedPriceCents, 0);
  const walkInCount = rows.filter((r) => r.kind === 'walk_in').length;

  const onStatusChange = (id: string, status: (typeof prototypeStatuses)[number]) => {
    updateStatus(id, status);
    const row = rows.find((r) => r.id === id);
    if (row) setLastUpdate(`${row.customerName} → ${status}`);
  };

  return (
    <div className='bg-background text-foreground flex min-h-dvh' data-shell-variant='a'>
      <aside className='bg-sidebar text-sidebar-foreground sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border md:flex'>
        <div className='flex items-center gap-3 px-4 py-5'>
          <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
            7d
          </span>
          <div>
            <p className='text-sm leading-tight font-semibold'>Sevendays</p>
            <p className='text-sidebar-foreground/60 font-mono text-[0.65rem] tracking-widest uppercase'>
              Admin
            </p>
          </div>
        </div>
        <nav className='flex-1 space-y-4 overflow-y-auto px-3 py-2'>
          {navGroups.map((group) => (
            <div key={group.heading ?? 'main'}>
              {group.heading && (
                <p className='text-sidebar-foreground/50 px-3 pt-2 pb-1 font-mono text-[0.65rem] tracking-widest uppercase'>
                  {group.heading}
                </p>
              )}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setScreen(item.id)}
                  aria-current={screen === item.id ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    screen === item.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'hover:bg-sidebar-accent/60 text-sidebar-foreground/80'
                  }`}
                >
                  <item.icon className='size-4 shrink-0' aria-hidden='true' />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className='border-sidebar-border border-t p-3'>
          <div className='flex items-center gap-3 rounded-md px-2 py-1.5'>
            <span className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold'>
              SO
            </span>
            <div>
              <p className='text-sm leading-tight font-medium'>Studio Owner</p>
              <p className='text-sidebar-foreground/60 text-xs'>Owner</p>
            </div>
          </div>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border px-6 backdrop-blur'>
          <h1 className='text-sm font-semibold'>{screenTitle[screen]}</h1>
          <div className='ml-auto flex items-center gap-3'>
            <input
              type='search'
              placeholder='Search…'
              aria-label='Search'
              className='border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring hidden w-56 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none sm:block'
            />
            <button
              type='button'
              aria-label='Notifications'
              className='text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md p-2'
            >
              <Bell className='size-4' aria-hidden='true' />
            </button>
          </div>
        </header>

        <main className='flex-1 space-y-6 p-6'>
          {screen !== 'dashboard' ? (
            <StubSurface title={stubBlurbs[screen].title} blurb={stubBlurbs[screen].blurb} />
          ) : (
            <>
              <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                <KpiCard label="Today's sessions" value={String(sessionsToday)} />
                <KpiCard label='Pending review' value={String(pendingCount)} />
                <KpiCard label='Confirmed value' value={formatPeso(confirmedValue)} />
                <KpiCard label='Walk-ins' value={String(walkInCount)} />
              </section>

              <section className='space-y-3'>
                <div className='flex flex-wrap items-center gap-3'>
                  <select
                    value={filters.branchId}
                    onChange={(e) => setFilters((f) => ({ ...f, branchId: e.currentTarget.value }))}
                    aria-label='Filter by branch'
                    className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none'
                  >
                    <option value='all'>All branches</option>
                    {prototypeBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, status: e.currentTarget.value as typeof f.status }))
                    }
                    aria-label='Filter by status'
                    className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none'
                  >
                    <option value='all'>All statuses</option>
                    {prototypeStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', '-')}
                      </option>
                    ))}
                  </select>
                  <p className='text-muted-foreground ml-auto font-mono text-xs'>
                    {visible.length} / {rows.length} appointments
                  </p>
                </div>

                <AppointmentsTable appointments={visible} onStatusChange={onStatusChange} />

                <p className='text-muted-foreground h-4 font-mono text-xs' aria-live='polite'>
                  {lastUpdate ? `status updated — ${lastUpdate}` : ''}
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className='bg-card text-card-foreground rounded-xl border p-4 shadow-sm'>
      <p className='text-muted-foreground text-xs tracking-wide uppercase'>{label}</p>
      <p className='mt-1 text-2xl font-semibold'>{value}</p>
    </article>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm --filter @sevendays/admin typecheck
git add apps/admin/src/prototype/variant-a-sidebar.tsx
git commit -m "prototype(#59): variant A — labeled sidebar shell

<fold in the distilled ui-ux-pro-max guidance from Task 1 here: what was
adopted (spacing rhythm, density, contrast/focus rules), what was skipped>"
```

Expected: typecheck clean.

---

### Task 5: Variant B — top-bar shell

**Files:**
- Create: `apps/admin/src/prototype/variant-b-topbar.tsx`

**Interfaces:**
- Consumes: same Task 2/3 modules as Variant A (`AppointmentsTable`, `StubSurface`, `stubBlurbs`, `StubScreen`, `usePrototypeAppointments`, `prototypeBranches`, `prototypeStatuses`, `dayOffsetOf`).
- Produces: `export function VariantBTopbar()` — rendered by the route (Task 7). Root element carries `data-shell-variant='b'`.

- [ ] **Step 1: Write `apps/admin/src/prototype/variant-b-topbar.tsx`**

Create with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #59 variant B: top-bar shell.
// No sidebar: one sticky top nav with a two-tier Catalog section (the
// Catalog button reveals a secondary row), centered content column, and a
// compact page header with inline stats instead of KPI cards. Structurally
// the opposite bet from A: horizontal IA, narrower content, less chrome.
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, LayoutDashboard, MapPin, Package, PlusCircle, Settings, Wrench } from 'lucide-react';
import { useState } from 'react';
import { AppointmentsTable } from './appointments-table';
import { StubSurface, stubBlurbs, type StubScreen } from './stub-surface';
import { dayOffsetOf, prototypeBranches, prototypeStatuses, usePrototypeAppointments } from './data';

type Screen = 'dashboard' | StubScreen;

const primaryNav: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'branches', label: 'Branches', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const catalogNav: { id: StubScreen; label: string; icon: LucideIcon }[] = [
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'addons', label: 'Add-ons', icon: PlusCircle },
  { id: 'services', label: 'Studio services', icon: Wrench },
];

const isCatalogScreen = (s: Screen) =>
  s === 'packages' || s === 'addons' || s === 'services';

export function VariantBTopbar() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { rows, visible, filters, setFilters, updateStatus } = usePrototypeAppointments();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const todayCount = rows.filter((r) => dayOffsetOf(r.scheduledAt) === 0).length;

  const onStatusChange = (id: string, status: (typeof prototypeStatuses)[number]) => {
    updateStatus(id, status);
    const row = rows.find((r) => r.id === id);
    if (row) setLastUpdate(`${row.customerName} → ${status}`);
  };

  const navButtonClass = (active: boolean) =>
    `flex items-center gap-2 border-b-2 px-1 py-1 text-sm transition-colors ${
      active
        ? 'border-primary text-foreground font-medium'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className='bg-background text-foreground min-h-dvh' data-shell-variant='b'>
      <header className='bg-background/95 sticky top-0 z-10 border-b border-border backdrop-blur'>
        <div className='mx-auto flex h-14 max-w-6xl items-center gap-6 px-6'>
          <div className='flex items-center gap-2.5'>
            <span className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold'>
              7d
            </span>
            <span className='text-sm font-semibold tracking-tight'>Sevendays Admin</span>
          </div>
          <nav className='flex items-center gap-5'>
            {primaryNav.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setScreen(item.id)}
                aria-current={screen === item.id ? 'page' : undefined}
                className={navButtonClass(screen === item.id)}
              >
                <item.icon className='size-4' aria-hidden='true' />
                <span className='hidden sm:inline'>{item.label}</span>
              </button>
            ))}
            <button
              type='button'
              onClick={() => {
                setCatalogOpen((o) => !o || !isCatalogScreen(screen));
                if (!catalogOpen && !isCatalogScreen(screen)) setScreen('packages');
              }}
              aria-expanded={catalogOpen}
              aria-current={isCatalogScreen(screen) ? 'page' : undefined}
              className={navButtonClass(isCatalogScreen(screen))}
            >
              <Package className='size-4' aria-hidden='true' />
              <span className='hidden sm:inline'>Catalog</span>
            </button>
          </nav>
          <span className='bg-secondary text-secondary-foreground ml-auto flex size-8 items-center justify-center rounded-full text-xs font-semibold'>
            SO
          </span>
        </div>
        {catalogOpen && (
          <div className='border-border bg-muted/40 border-t'>
            <div className='mx-auto flex max-w-6xl items-center gap-2 px-6 py-2'>
              <span className='text-muted-foreground mr-1 font-mono text-[0.65rem] tracking-widest uppercase'>
                Catalog
              </span>
              {catalogNav.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setScreen(item.id)}
                  aria-current={screen === item.id ? 'page' : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                    screen === item.id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground border'
                  }`}
                >
                  <item.icon className='size-3.5' aria-hidden='true' />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className='mx-auto max-w-6xl space-y-6 px-6 py-8'>
        {screen !== 'dashboard' ? (
          <StubSurface title={stubBlurbs[screen].title} blurb={stubBlurbs[screen].blurb} />
        ) : (
          <>
            <div className='flex flex-wrap items-end justify-between gap-4'>
              <div>
                <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
                <p className='text-muted-foreground mt-1 font-mono text-xs'>
                  {rows.length} bookings · {pendingCount} pending · {todayCount} today
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <select
                  value={filters.branchId}
                  onChange={(e) => setFilters((f) => ({ ...f, branchId: e.currentTarget.value }))}
                  aria-label='Filter by branch'
                  className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none'
                >
                  <option value='all'>All branches</option>
                  {prototypeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.shortName}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, status: e.currentTarget.value as typeof f.status }))
                  }
                  aria-label='Filter by status'
                  className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none'
                >
                  <option value='all'>All statuses</option>
                  {prototypeStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', '-')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AppointmentsTable appointments={visible} onStatusChange={onStatusChange} />

            <p className='text-muted-foreground h-4 font-mono text-xs' aria-live='polite'>
              {lastUpdate ? `status updated — ${lastUpdate}` : ''}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm --filter @sevendays/admin typecheck
git add apps/admin/src/prototype/variant-b-topbar.tsx
git commit -m "prototype(#59): variant B — top-bar shell with two-tier catalog nav"
```

Expected: typecheck clean.

---

### Task 6: Variant C — icon-rail shell

**Files:**
- Create: `apps/admin/src/prototype/variant-c-rail.tsx`

**Interfaces:**
- Consumes: same Task 2/3 modules as Variants A/B (`AppointmentsTable` with `dense`, `StubSurface`, `stubBlurbs`, `StubScreen`, `usePrototypeAppointments`, `prototypeBranches`, `prototypeStatuses`, `dayOffsetOf`, `formatPeso`).
- Produces: `export function VariantCRail()` — rendered by the route (Task 7). Root element carries `data-shell-variant='c'`.

- [ ] **Step 1: Write `apps/admin/src/prototype/variant-c-rail.tsx`**

Create with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #59 variant C: icon-rail shell.
// Narrow always-visible icon rail (labels via tooltip), full-width content
// with no max-width — the most "tool" of the three and the one that
// anticipates M5's wide CMS editors (image-heavy package editing) most
// directly. Dense table, mono micro-stats, minimal chrome.
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, LayoutDashboard, MapPin, Package, PlusCircle, Settings, Wrench } from 'lucide-react';
import { useState } from 'react';
import { AppointmentsTable } from './appointments-table';
import { StubSurface, stubBlurbs, type StubScreen } from './stub-surface';
import { dayOffsetOf, formatPeso, prototypeBranches, prototypeStatuses, usePrototypeAppointments } from './data';

type Screen = 'dashboard' | StubScreen;

const railItems: { id: Screen; label: string; icon: LucideIcon; group: number }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 0 },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, group: 0 },
  { id: 'packages', label: 'Packages', icon: Package, group: 1 },
  { id: 'addons', label: 'Add-ons', icon: PlusCircle, group: 1 },
  { id: 'services', label: 'Studio services', icon: Wrench, group: 1 },
  { id: 'branches', label: 'Branches', icon: MapPin, group: 2 },
  { id: 'settings', label: 'Settings', icon: Settings, group: 2 },
];

export function VariantCRail() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const { rows, visible, filters, setFilters, updateStatus } = usePrototypeAppointments();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const sessionsToday = rows.filter((r) => dayOffsetOf(r.scheduledAt) === 0).length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const confirmedValue = rows
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + r.bookedPriceCents, 0);

  const onStatusChange = (id: string, status: (typeof prototypeStatuses)[number]) => {
    updateStatus(id, status);
    const row = rows.find((r) => r.id === id);
    if (row) setLastUpdate(`${row.customerName} → ${status}`);
  };

  let lastGroup = -1;

  return (
    <div className='bg-background text-foreground flex min-h-dvh' data-shell-variant='c'>
      <aside className='bg-sidebar border-sidebar-border sticky top-0 flex h-dvh w-16 shrink-0 flex-col items-center border-r py-3'>
        <span className='bg-sidebar-primary text-sidebar-primary-foreground mb-2 flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
          7d
        </span>
        <nav className='flex flex-1 flex-col items-center gap-1'>
          {railItems.map((item) => {
            const divider = lastGroup !== -1 && item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id} className='flex flex-col items-center'>
                {divider && <span className='border-sidebar-border my-1 block h-px w-8 border-t' />}
                <button
                  type='button'
                  onClick={() => setScreen(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={screen === item.id ? 'page' : undefined}
                  className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
                    screen === item.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  }`}
                >
                  <item.icon className='size-4.5' aria-hidden='true' />
                </button>
              </div>
            );
          })}
        </nav>
        <span className='bg-primary text-primary-foreground mt-2 flex size-8 items-center justify-center rounded-full text-xs font-semibold'>
          SO
        </span>
      </aside>

      <div className='min-w-0 flex-1 p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-lg font-semibold tracking-tight'>
              {screen === 'dashboard' ? 'Dashboard' : stubBlurbs[screen].title}
            </h1>
            <p className='text-muted-foreground mt-1 font-mono text-[0.65rem] tracking-widest uppercase'>
              {screen === 'dashboard'
                ? 'sevendays admin — all branches'
                : 'stub surface — later milestone'}
            </p>
          </div>
          {screen === 'dashboard' && (
            <div className='flex items-center gap-3'>
              <select
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.currentTarget.value }))}
                aria-label='Filter by branch'
                className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-2.5 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none'
              >
                <option value='all'>All branches</option>
                {prototypeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.currentTarget.value as typeof f.status }))
                }
                aria-label='Filter by status'
                className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-2.5 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none'
              >
                <option value='all'>All statuses</option>
                {prototypeStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', '-')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {screen !== 'dashboard' ? (
          <div className='mt-6'>
            <StubSurface title={stubBlurbs[screen].title} blurb={stubBlurbs[screen].blurb} />
          </div>
        ) : (
          <div className='mt-4 space-y-3'>
            <div className='flex flex-wrap gap-2'>
              <StatChip label='today' value={String(sessionsToday)} />
              <StatChip label='pending' value={String(pendingCount)} />
              <StatChip label='confirmed value' value={formatPeso(confirmedValue)} />
              <StatChip label='showing' value={`${visible.length}/${rows.length}`} />
            </div>
            <AppointmentsTable appointments={visible} onStatusChange={onStatusChange} dense />
            <p className='text-muted-foreground h-4 font-mono text-xs' aria-live='polite'>
              {lastUpdate ? `status updated — ${lastUpdate}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className='border-border bg-card text-muted-foreground rounded-md border px-2 py-1 font-mono text-xs'>
      {label} <span className='text-foreground font-semibold'>{value}</span>
    </span>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm --filter @sevendays/admin typecheck
git add apps/admin/src/prototype/variant-c-rail.tsx
git commit -m "prototype(#59): variant C — icon-rail shell, dense tool posture"
```

Expected: typecheck clean.

---

### Task 7: Route, floating switcher, build + render smoke

**Files:**
- Create: `apps/admin/src/prototype/switcher.tsx`
- Create: `apps/admin/src/routes/prototype-shell.tsx`
- Modify (generated): `apps/admin/src/routeTree.gen.ts` — regenerated by the router plugin, committed alongside

**Interfaces:**
- Consumes: `VariantASidebar`, `VariantBTopbar`, `VariantCRail` (Tasks 4–6).
- Produces: route `/prototype-shell` accepting `?variant=a|b|c` (zod-validated, defaults to `a`), TanStack-Start file-route registered automatically on build/dev; `PrototypeSwitcher({ options, current })` + `VariantKey` type + `VariantOption { key: VariantKey; label: string }` from `switcher.tsx`.

- [ ] **Step 1: Write `apps/admin/src/prototype/switcher.tsx`**

Create with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #59 variant switcher: a floating
// bottom bar for flipping shells. Deliberately high-contrast so it reads
// as evaluation chrome, not part of any variant's design.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

// The union lives here (not in the route) because navigate()'s search param
// is typed by validateSearch's zod enum — a plain `string` key does not
// satisfy it (spiked in this package's typecheck, 2026-09-14).
export type VariantKey = 'a' | 'b' | 'c';

export interface VariantOption {
  key: VariantKey;
  label: string;
}

export function PrototypeSwitcher({
  options,
  current,
}: {
  options: VariantOption[];
  current: VariantKey;
}) {
  const navigate = useNavigate();

  const cycle = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.key === current);
    // noUncheckedIndexedAccess: indexed access is T | undefined — guard it.
    const next = options[(i + dir + options.length) % options.length] ?? options[0];
    if (!next) return;
    navigate({ to: '/prototype-shell', search: { variant: next.key }, replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      cycle(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const label = options.find((o) => o.key === current)?.label ?? current;

  return (
    <div className='bg-foreground text-background fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1 shadow-lg'>
      <button
        type='button'
        onClick={() => cycle(-1)}
        aria-label='Previous variant'
        className='hover:bg-background/15 rounded-full p-2'
      >
        <ChevronLeft className='size-4' aria-hidden='true' />
      </button>
      <span className='min-w-44 text-center font-mono text-xs font-semibold tracking-wider uppercase'>
        {label}
      </span>
      <button
        type='button'
        onClick={() => cycle(1)}
        aria-label='Next variant'
        className='hover:bg-background/15 rounded-full p-2'
      >
        <ChevronRight className='size-4' aria-hidden='true' />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/admin/src/routes/prototype-shell.tsx`**

Create with exactly this content:

```tsx
// PROTOTYPE (throwaway) — wayfinder #59: admin app shell + IA variants.
// Three structurally different shells over the same appointments content
// (list, branch/status filters, in-memory status update). Switch with
// ?variant=a|b|c or the floating bar. Never ships: delete with the rest of
// apps/admin/src/prototype/ when the milestone work lands.
import type { ReactElement } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { VariantASidebar } from '../prototype/variant-a-sidebar';
import { VariantBTopbar } from '../prototype/variant-b-topbar';
import { VariantCRail } from '../prototype/variant-c-rail';
import { PrototypeSwitcher, type VariantOption } from '../prototype/switcher';

const variantSchema = z.object({
  variant: z.enum(['a', 'b', 'c']).default('a'),
});

const variants: (VariantOption & { Component: () => ReactElement })[] = [
  { key: 'a', label: 'A — Sidebar shell', Component: VariantASidebar },
  { key: 'b', label: 'B — Top-bar shell', Component: VariantBTopbar },
  { key: 'c', label: 'C — Icon-rail shell', Component: VariantCRail },
];

export const Route = createFileRoute('/prototype-shell')({
  validateSearch: (search: Record<string, unknown>) => variantSchema.parse(search),
  component: PrototypeShellPage,
});

function PrototypeShellPage() {
  const { variant } = Route.useSearch();
  const current = variants.find((v) => v.key === variant);
  if (!current) return null;
  const Current = current.Component;
  return (
    <>
      <Current />
      {import.meta.env.DEV && (
        <PrototypeSwitcher
          options={variants.map(({ key, label }) => ({ key, label }))}
          current={current.key}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Build (regenerates routeTree)**

```bash
pnpm --filter @sevendays/admin build
```

Expected: success, `routeTree.gen.ts` now includes `/prototype-shell`. If Biome formatting is enforced by the build and fails, run `pnpm --filter @sevendays/admin fix` and rebuild.

- [ ] **Step 4: Render smoke test**

```bash
pnpm --filter @sevendays/admin dev &
sleep 10
for v in a b c; do
  port=3000
  curl -s "http://localhost:$port/prototype-shell?variant=$v" | grep -o "data-shell-variant=\"$v\"" | head -1
done
curl -s "http://localhost:3000/prototype-shell" | grep -o 'data-shell-variant="a"' | head -1
kill %1
```

Read the dev-server startup output for the actual port (pinned 3000, falls forward if taken) and adjust. Expected: each loop iteration prints its `data-shell-variant="X"` match — SSR rendered the right shell per param, and the bare URL defaults to variant A. The rendered HTML carries class names, not computed colors; color judgment happens in the owner's browser.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/routes/prototype-shell.tsx apps/admin/src/prototype/switcher.tsx apps/admin/src/routeTree.gen.ts
git commit -m "prototype(#59): /prototype-shell route + floating variant switcher"
```

---

### Task 8: Full check, push, and ticket handover

**Files:**
- No new source files. Possibly formatting fixups across touched files.

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: pushed branch `prototype/59-admin-shell-ia` on origin + a handover comment on issue #59. The ticket is **not** closed — it's HITL; it resolves when the owner reacts.

- [ ] **Step 1: Repo-wide check**

```bash
pnpm check
```

Expected: lint, format, typecheck, test all green (`@sevendays/admin` test is a documented no-op — that's expected, not a failure). If formatting fails: `pnpm fix`, re-run `pnpm check`, commit fixups as `chore(#59): prototype check fixups`.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin prototype/59-admin-shell-ia
```

- [ ] **Step 3: Post the handover comment on #59**

Stage the body as a temp file and verify the write (per wayfinder lessons):

```bash
cat > /tmp/59-handover.md <<'EOF'
## Prototype ready for reaction

Branch: `prototype/59-admin-shell-ia` (throwaway — nothing merges until the shell + IA is validated)

**Run it:**
```bash
git worktree add .worktrees/59-admin-shell prototype/59-admin-shell-ia 2>/dev/null || git -C .worktrees/59-admin-shell pull
cp apps/admin/.env.local .worktrees/59-admin-shell/apps/admin/.env.local 2>/dev/null || true
cd .worktrees/59-admin-shell && pnpm install && pnpm --filter @sevendays/admin dev
```
Then open `/prototype-shell` on the printed port. Cycle variants with the floating bar or `←`/`→`; the URL (`?variant=a|b|c`) is shareable.

**What it is:** three structurally different admin shells over the same dashboard content (appointments table with branch/status filters + in-memory status update, mock rows shaped like the real schema at real seed prices):

- **A — Sidebar shell**: grouped left nav (Overview / Catalog / Studio), top bar with search, KPI cards. The classic bet.
- **B — Top-bar shell**: horizontal nav with a two-tier Catalog section, centered content column, inline stats instead of KPI cards. The light bet.
- **C — Icon-rail shell**: narrow icon rail, full-width content, dense table, mono micro-stats. The tool bet — widest content area, anticipates M5's image-heavy CMS editors most directly.

Nav taxonomy in every variant: Dashboard, Appointments, Catalog (Packages / Add-ons / Studio services), Branches, Settings. Non-dashboard screens are stubs naming their owning milestone (M4 auth / M5 CMS / v2 dashboard) — they exist so the IA feels clickable, not as designs.

**React to:** the shell (which variant, or a mix — "B's nav with C's density" is a valid answer), the nav taxonomy and grouping, where filters and status updates live, density. **Not** colors: the tokens are the interim preset layer; the logo-palette swap rides #92/the milestone underneath these same utilities.

**Recorded findings from the ui-ux-pro-max recon:** <paste the Task 1 Step 3 distillation here>

Ticket stays open until the owner reacts (HITL).
EOF
gh issue comment 59 --body-file /tmp/59-handover.md
gh api repos/jeius/sevendays/issues/59/comments --jq '.[-1].body' | head -5
```

Expected: the read-back shows the comment body. Do **not** close the ticket and do **not** edit the map's Decisions-so-far — the resolution comment and map pointer happen after the owner reacts.

---

## Self-Review

- **Spec coverage:** layout + navigation variants, sidebar vs top bar (Task 4 vs Task 5; Task 6's icon rail is the third structural bet — prototype skill demands radically different, three was always the intent) ✓; nav taxonomy over the known surfaces — Appointments, Catalog (packages/add-ons/studio services), Branches, Settings, rendered clickable in all three variants with stub screens naming each surface's owning milestone ✓; dashboard skeleton over the appointments surface — list (Task 3 table), branch/status filter (per-variant filter bars), status update (in-memory select, surfaced via the live `lastUpdate` line) ✓; M5 CMS anticipated without building (stub copy names R2 uploads; variant C's full-width content area is the explicit structural bet) ✓; wears the brand-mapped tokens (`@sevendays/ui/tokens.css` already imported by admin; semantic utilities only; no zinc defaults anywhere) ✓; owner picks the variant → HITL handover, ticket stays open (Task 8) ✓. Fenced and not done, deliberately: component vocabulary (#58), token/palette work (#92), charts/data-viz (map fog), auth/CMS mechanics, `components.json` setup.
- **Placeholder scan:** two `<paste/fold …>` directives are execution-time record injections (Task 4's commit message carries the Task 1 recon distillation; Task 8's handover comment carries the same) — each names its source exactly; unknowable pre-run by nature. The stub copy's "Shape TBD by that milestone" is the artifact's honest text about M4, not a plan placeholder. No TBD/TODO/Similar-to-Task patterns otherwise.
- **Type consistency:** all cross-module names verified by grep in both definition and consumption — `usePrototypeAppointments` → `{ rows, visible, filters, setFilters, updateStatus }` used identically in all three variants; `AppointmentsTable({ appointments, onStatusChange, dense? })` matches every call site; `StubSurface`/`stubBlurbs`/`StubScreen` shared; `VariantKey`/`VariantOption` flow from switcher to route. Two inference claims were **spiked in the consuming package before pinning** (not assumed): `navigate({ search })` requires the literal variant union (a `string` or generic key fails TS2322 — switcher owns the union), and `noUncheckedIndexedAccess` requires guards on `options[i]`/`variants.find(...)` (both guarded, no non-null assertions).
- **Mocked boundaries / asserted counts:** no mocks in this plan (prototype hits no API — `apps/admin/.env.local`'s `API_URL` is only needed to boot the dev script). Counts appearing in prose: 3 branches, 5 statuses, 3 kinds, 12 mock rows, 3 variants — each matches the code blocks (12 `ap-00X` rows; `prototypeStatuses` 5 entries; `prototypeBranches` 3 entries). Smoke greps target `data-shell-variant="$v"`, which every variant root carries.
- **Rot guard:** no hard-coded calendar dates anywhere — mock rows derive from today's midnight; Intl outputs pinned with the full-ICU fix path in Global Constraints.
