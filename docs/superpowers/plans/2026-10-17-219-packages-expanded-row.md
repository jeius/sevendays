# M7 Ticket 08 — The Packages Expanded Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 2 and 3 are UI-bearing and load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule, spec #94 amendment): Task 2 composes the expanded-row content, and **Task 3 renders it for an owner-reacted variants round in BOTH themes and BOTH postures** (the ticket's third AC). Task 3's round is the only controller interaction inside the build; everything else runs to the gates.

**Goal:** The packages table's expanded row answers the whole question (ticket #219, spec § *CMS UX maturation — the system*, the #165 pre-named expanded-row ticket): the **full description**, a **duration line** (`durationMinutes` renders nowhere today), **frames as a chip row** (frame numbers), and **inclusions as bullet points** (label + print size + attires) — **pure rendering, zero API work** (`ServicePackageRead` already carries every field). **Unpriced rows show a blank price cell** (the no-price law, ADR-0020 — made runnable by moving `peso` to a lib seam and pinning `peso(null) === null`). **Both postures render the one composition** — the desktop `ExpandPanel` and the mobile stacked reveal — so the two never drift. Theme-aware throughout; the string forms (duration line, chip prefix, bullet grammar) land as `TODO(owner-copy)` proposals and settle in Task 3's owner round.

**Architecture:** Four tasks, admin-only code (zero api / api-client / types / db / landing changes): (1) the two pure lib seams, TDD — `lib/package-expanded-row.ts` (the render-model derivation: `expandedRowModel(row) → { description, durationLine, frameChips, inclusionLines }`) and `lib/peso.ts` (`peso` moves out of `components/cms/shared.tsx` so the no-price law is test-pinnable; the three screen importers retarget, `shared.tsx` stops defining it) — 2 new suites, +12 its (admin floor 21/217 → **23/229**); (2) the composition — a new `PackageExpandedContent` component renders the model once, wired into both postures in `packages-table.tsx` (the file's now-false "render nowhere" header comment amends with it); (3) the owner-reacted variants round — both themes, both postures, a seeded spread of states (a duration set via the editor, an unpriced row, multi-frame rows), rulings applied and the copy markers retired; (4) gates + docs rotation — this ticket ticks exactly **one** `docs/plan.md` M7 box (its own) — then the PR, the pre-ruled **PICK clean** v1 pick, the issue close, and `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes, zero migrations, zero api/types/api-client/landing work — lucide-react **1.37.0** (probed live against the installed dist this session: `clock.mjs` exists — `Clock` is the one new icon), `Badge` from `@sevendays/ui` (the outline-variant chip), Tailwind v4 semantic utilities, `Intl.NumberFormat('en-PH')` (probed live on this Node: `₱1,100.00` / `₱125.50` / `₱0.00` — full-ICU Node, never edit the expectation), vitest plain-node (the admin lib-seam posture — no component/DOM tests), pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#219 "M7 ticket 08: the packages expanded row"](https://github.com/jeius/sevendays/issues/219), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *CMS UX maturation — the system* pins the ruling: "full description + a duration line (`durationMinutes` renders nowhere today) + frames as a chip row (frame numbers) + inclusions as bullet points (label + print size + attires). `ServicePackageRead` already carries it — pure rendering, zero API work. Unpriced = blank price cell. Packages table only; both postures (desktop panel + mobile stacked reveal)"; User Story 48 is its acceptance; § *Testing Decisions* pins "the expanded-row composition" as an admin lib-seam law; § *v1-pick classes* pre-rules this payload **PICK clean** — the CMS UX system row: "Admin surfaces exist on both editions"). The ticket's three acceptance criteria, verbatim: the expanded-row composition pinned by an admin lib-seam test · unpriced = blank price cell · both postures render; owner-reacted rendered variants, both themes. Key recon facts (2026-10-17, main `eb63d28` — post-#218; every file below read this session):

- **The surfaces this ticket grows (pinned):** the desktop reveal is `packages-table.tsx:303-306` — `<ExpandPanel open={expanded} colSpan={4}>{row.description}</ExpandPanel>` — description only. The mobile stacked reveal is `packages-table.tsx:346-364` — the `Collapse` block renders the description `<p>`, the Featured badge, then `RowIconActions`. The file's header comment (`packages-table.tsx:9-10`) says "`durationMinutes`, `frames`, and resolved `inclusions` render nowhere — the editor's concern (Task 6)" — that sentence goes false the moment Task 2 lands and amends with it. The collapsed row's second line (the truncated description, N2) and the whole-row click toggle are untouched.
- **`ExpandPanel` is shared — additive use only:** `cms/shared.tsx:288-309` renders children inside `text-muted-foreground px-2 pb-3 text-sm`; six screens consume it (packages, lookups, studio services, add-ons, testimonials, branches). This ticket changes NO shared primitive: the composition owns its text colors explicitly, so the desktop panel's muted wrapper is overridden per-element and the mobile posture (no wrapper) renders identically.
- **The read shape already carries everything (zero API work, confirmed):** `ServicePackageRead` (`packages/types/src/package.ts:193-199`) = the base fields + `durationMinutes: number | null` (nullable — "the catalog specifies no durations", ADR-0005) + `frames: { id, frameNumber }[]` + `inclusions: ResolvedPackageInclusion[]` (kind `framed_picture | print | privilege`, `quantity` nullable, `printSize: { id, code, description } | null`, `attires: { id, name }[]`, `description: string | null`). Array order IS render order (the API renumbers in-transaction per #137); the seam never sorts.
- **Realistic fixtures are seed-pinned:** `packages/db/scripts/catalog.ts` — e.g. Basic Package: one frame (`8x10` Toga), prints `2×2R / 5×2x2 / 4×1x1` (all Toga), plus the six universal privileges (`High Resolution soft copies`, `Usage of Toga and Hood`, …). Attires join with `/` in catalog order (the file's own canonical convention). **Every seeded `durationMinutes` is null** — the variants round sets one via the CMS itself (the editor exposes `Duration (minutes)` at `package-editor.tsx:820`, owner-ratified helper copy `DURATION_HELPER = 'Optional'`), and unprices a row via the #212 Priced checkbox (unchecked saves null). No DB surgery, no seed change.
- **`peso` today (the move's blast radius, swept):** defined once at `cms/shared.tsx:47-51`; imported by exactly three screens — `packages-table.tsx`, `addons-screen.tsx`, `studio-services-screen.tsx` (multi-line imports from `#/components/cms/shared`). `package-editor.tsx` does not use it. No test pins it anywhere in admin (landing's `format.test.ts` pins its own copy as `₱1,100.00` — the precedent this plan re-pins for admin).
- **No composition of record exists:** the #131 prototype's packages reveal (`prototype/131-admin-cms-compositions`, worktree `ac9daca`) was description-only — rounds 1–9 never designed duration/chips/bullets. Task 3's owner round is therefore the design gate for the string forms, exactly as the Submissions tab and the status palette were for #218.
- **Baselines (live, per AGENTS.md post-#218; admin re-verified by running the suite this session: 21 files / 217 tests passed):** types 17 files / 167 tests; api 30 passed + 1 skipped files (31) / 422 passed + 3 skipped; api-client 5 files / 45 tests; **admin 21 files / 217 tests**; landing 10 files / 92 tests; db 4 files. After Task 1: **admin 23 files / 229 tests** (+12 its: peso 3, package-expanded-row 9). Every other package's floor is untouched by this ticket. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)
- **The one `docs/plan.md` box this ticket ticks (Task 4):** `docs/plan.md:177` — `- [ ] Admin — the packages expanded row (#165): full description + a duration line + frames as chips + inclusions as bullet points (label + print size + attires; zero API work); Unpriced = blank price cell` — flips to `- [✅]` with a dated annotation. Nothing else in the M7 block changes; the milestone-level "Verify: owner-accepted rendered variants" box stays unticked until the close-out ticket (#225-class) — this ticket's round is evidence toward it, not the tick.
- **Sibling fences (spec § Sequencing; the tickets' own bodies):** NOT here, regardless of temptation: **upload UI maturation** — #220 (drag-and-drop, in-flight cancel, leave-confirm; the tray and picker stay exactly as they are); **Settings Account/Users tabs + forgot-password** — #221; **the Resend/sending-domain work** — #222; **the landing redesign** — #223/#224 (zero landing files change — the landing's own spec-sheet surface is the redesign's, not this ticket's); **the package editor** — untouched (its fields, its Save vocabulary, its Priced checkbox are #139/#218/#212's; this ticket only reads what it edits); **any packages-editor or public read change** — the wire is already right. The expanded row is **packages-table only** — no other screen's reveal changes (the spec says so verbatim).

## Global Constraints

- **Branch & baseline:** `feat/219-packages-expanded-row` off main `eb63d28` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#219)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, variants screenshots, the owner's rulings) lands in gitignored `.superpowers/sdd/2026-10-17-219-packages-expanded-row/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (lucide/react/Badge all installed). Every task commits only with the checks green **for the packages it touched** (this ticket touches only `apps/admin` + docs — `pnpm --filter @sevendays/admin fix` then `test -- --run` then `typecheck` is the per-task gate; run `pnpm --filter @sevendays/admin fix` BEFORE committing and accept its rewrites). No `pnpm build:packages` is needed (no `packages/` source changes). Never stage `graphify-out/` churn (dirty graph files are expected, per AGENTS.md). Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (Task 4 — code was modified).
- **The zero-API law (binding, the ticket's own headline):** only `apps/admin/src/**` and docs files change. `ServicePackageRead` is imported from `@sevendays/types`, never re-declared; no route, no wrapper, no schema, no migration, no seed edit. If a task seems to need one, stop — the read shape already carries it.
- **The no-price law (binding, ADR-0020):** an unpriced row (`priceCents: null`) renders a **blank** price cell in both postures — never `₱0.00`, never a sentinel, never "POA". The collapsed cells already render `{peso(row.priceCents)}`; Task 1 moves `peso` to `lib/peso.ts` and pins `peso(null) === null` so the law is runnable, and the three importers retarget (the cells themselves do not change).
- **Copy law:** every string the executor must produce lands verbatim in this plan's fenced blocks. New unrated staff-facing copy carries the house `TODO(owner-copy)` marker per the on-disk convention — here exactly three string forms: the duration line (`'60 minutes'` beside a `Clock` icon), the chip prefix (`'Frame 1'`), and the bullet grammar (`'1 framed picture · 8x10 · Toga'`; privileges render their description alone — an attire suffix would duplicate the subject, e.g. "Usage of Barong · Barong"). Task 3's owner round ratifies or retunes them; markers retire as ruled; if a grammar retunes, the seam and its suite change in the same commit.
- **Theme law (binding, #217's ramp):** the composition uses semantic tokens and tailwind utilities only (`text-foreground`, `text-muted-foreground`, the outline `Badge`) — no new tokens, no `packages/ui` change, no new `TODO(token-ruling)` sites. Both themes render from the same classes; the round verifies dark, never a second class set.
- **Posture law (binding):** ONE composition component serves both postures — the desktop `ExpandPanel` and the mobile stacked reveal render the same `PackageExpandedContent`; duplicating the markup in the mobile block is a defect. The `ExpandPanel` primitive itself is not modified (six screens share it).
- **Scope fence (verbatim):** Task 1 edits only `apps/admin/src/lib/{package-expanded-row.test.ts (new), package-expanded-row.ts (new), peso.test.ts (new), peso.ts (new)}` + the peso move's four touchings: `apps/admin/src/components/cms/shared.tsx` (delete the definition) and the import lines of `apps/admin/src/components/{packages/packages-table.tsx, addons/addons-screen.tsx, studio-services/studio-services-screen.tsx}`. Task 2 edits only `apps/admin/src/components/packages/{package-expanded-content.tsx (new), packages-table.tsx}`. Task 3 edits only the files Tasks 1–2 landed (string/class retunes) + writes evidence. Task 4 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/`, and works the PR/pick/issue — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
apps/admin/src/lib/
  package-expanded-row.ts           # create (T1) — expandedRowModel: description, durationLine, frameChips, inclusionLines
  package-expanded-row.test.ts      # create (T1) — the 9-it composition suite (the ticket's first AC)
  peso.ts                           # create (T1) — peso moved from cms/shared.tsx (the no-price law's runnable half)
  peso.test.ts                      # create (T1) — the 3-it suite (₱1,100.00 precedent + null → null + ₱0.00)
apps/admin/src/components/
  cms/shared.tsx                    # modify (T1) — the peso definition deleted (no other change)
  packages/package-expanded-content.tsx  # create (T2) — the one composition both postures render
  packages/packages-table.tsx       # modify (T1 import + T2) — header comment, both reveals
  addons/addons-screen.tsx          # modify (T1) — peso import retarget (one line)
  studio-services/studio-services-screen.tsx  # modify (T1) — peso import retarget (one line)
docs/plan.md docs/progress.md AGENTS.md graphify-out/ docs/agents/v1-picks.md  # T4
```

---

### Task 1: The two lib seams (TDD) — the composition model + peso to lib

Plain data in and out; the Task 2 component renders what this task derives. The modules never import React. This is the ticket's "the expanded-row composition pinned by an admin lib-seam test" acceptance criterion, plus the runnable half of "unpriced = blank price cell".

**Files:**
- Create (test-first): `apps/admin/src/lib/package-expanded-row.test.ts`, `apps/admin/src/lib/peso.test.ts`
- Create: `apps/admin/src/lib/package-expanded-row.ts`, `apps/admin/src/lib/peso.ts`
- Modify: `apps/admin/src/components/cms/shared.tsx` (delete the `peso` definition — nothing else), and the `peso` import lines in `apps/admin/src/components/packages/packages-table.tsx`, `apps/admin/src/components/addons/addons-screen.tsx`, `apps/admin/src/components/studio-services/studio-services-screen.tsx`

**Interfaces:**
- Produces (what Task 2 consumes): from `package-expanded-row.ts` — `ExpandedRowModel` (`{ description: string; durationLine: string | null; frameChips: string[]; inclusionLines: string[] }`) and `expandedRowModel(row: ServicePackageRead): ExpandedRowModel`. From `peso.ts` — `peso(cents: number | null): string | null` (same signature, new home).
- Consumes: `@sevendays/types`' `ServicePackageRead`, `ResolvedPackageInclusion`, `PackageInclusionKind` — imported as types, never re-declared.

**Not here:** any component (Task 2); any editor change; any API/wire change (zero-API law); upload maturation (#220).

- [ ] **Step 1: Write the failing tests (a) — the composition suite**

Create `apps/admin/src/lib/package-expanded-row.test.ts` with exactly:

```ts
import type {
  PackageInclusionKind,
  ResolvedPackageInclusion,
  ServicePackageRead,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { expandedRowModel } from './package-expanded-row.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const T0 = new Date('2026-10-17T00:00:00.000Z');

function inclusion(
  kind: PackageInclusionKind,
  overrides: Partial<ResolvedPackageInclusion> = {}
): ResolvedPackageInclusion {
  return {
    id: UUID,
    kind,
    quantity: kind === 'privilege' ? null : 1,
    frameId: null,
    description: null,
    createdAt: T0,
    updatedAt: T0,
    printSize: null,
    attires: [],
    ...overrides,
  };
}

function printSize(code: string): { id: string; code: string; description: string } {
  return { id: UUID, code, description: `${code} print.` };
}

function attire(name: string): { id: string; name: string } {
  return { id: UUID, name };
}

function row(overrides: Partial<ServicePackageRead> = {}): ServicePackageRead {
  return {
    id: UUID,
    name: 'Basic Package',
    description: 'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
    priceCents: 90000,
    durationMinutes: null,
    isActive: true,
    coverImageUrl: null,
    slug: 'basic-package',
    isFeatured: false,
    createdAt: T0,
    updatedAt: T0,
    frames: [],
    inclusions: [],
    ...overrides,
  };
}

describe('durationLine (the line durationMinutes gets)', () => {
  it('null renders nothing — the catalog specifies no durations (absent, never a placeholder)', () => {
    expect(expandedRowModel(row({ durationMinutes: null })).durationLine).toBeNull();
  });

  it('formats with pluralization — 60 → "60 minutes", 1 → "1 minute"', () => {
    expect(expandedRowModel(row({ durationMinutes: 60 })).durationLine).toBe('60 minutes');
    expect(expandedRowModel(row({ durationMinutes: 1 })).durationLine).toBe('1 minute');
  });
});

describe('frameChips (frames as a chip row, by frame number)', () => {
  it('labels each frame "Frame N" in served array order (never re-sorted); no frames → no chips', () => {
    const model = expandedRowModel(
      row({
        frames: [
          { id: UUID, frameNumber: 2 },
          { id: UUID, frameNumber: 1 },
        ],
      })
    );
    expect(model.frameChips).toEqual(['Frame 2', 'Frame 1']);
    expect(expandedRowModel(row()).frameChips).toEqual([]);
  });
});

describe('inclusionLines (label + print size + attires, " · " between parts)', () => {
  it('framed_picture: count + noun + print size + attires (attires joined "/" in served order)', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('framed_picture', {
            printSize: printSize('8x10'),
            attires: [attire('Toga')],
          }),
          inclusion('framed_picture', {
            quantity: 2,
            printSize: printSize('11x14'),
            attires: [attire('Filipiniana'), attire('Executive')],
          }),
        ],
      })
    );
    expect(model.inclusionLines).toEqual([
      '1 framed picture · 8x10 · Toga',
      '2 framed pictures · 11x14 · Filipiniana/Executive',
    ]);
  });

  it('print: same grammar; a null print size drops its part (no stray separator)', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('print', { quantity: 4, printSize: printSize('2R'), attires: [attire('Toga')] }),
          inclusion('print', { quantity: 4, attires: [attire('Toga')] }),
        ],
      })
    );
    expect(model.inclusionLines).toEqual(['4 prints · 2R · Toga', '4 prints · Toga']);
  });

  it('privilege: the description stands alone — no attire suffix (it would duplicate the subject); a null description falls back to "Privilege"', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('privilege', { description: 'Usage of Executive Attire', attires: [attire('Executive')] }),
          inclusion('privilege', { description: 'High Resolution soft copies' }),
          inclusion('privilege'),
        ],
      })
    );
    expect(model.inclusionLines).toEqual([
      'Usage of Executive Attire',
      'High Resolution soft copies',
      'Privilege',
    ]);
  });

  it('a null quantity on a picture kind drops the count prefix, never renders "null"', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('framed_picture', {
            quantity: null,
            printSize: printSize('8x10'),
            attires: [attire('Toga')],
          }),
        ],
      })
    );
    expect(model.inclusionLines).toEqual(['framed picture · 8x10 · Toga']);
  });

  it('zero attires on a picture kind drops the attire part (no trailing separator)', () => {
    const model = expandedRowModel(
      row({
        inclusions: [inclusion('print', { quantity: 4, printSize: printSize('2R') })],
      })
    );
    expect(model.inclusionLines).toEqual(['4 prints · 2R']);
  });
});

describe('expandedRowModel (the seeded Basic Package, whole)', () => {
  it('derives the exact model — description passthrough, no duration, one chip, ten bullet lines in served order', () => {
    const basic = row({
      frames: [{ id: UUID, frameNumber: 1 }],
      inclusions: [
        inclusion('framed_picture', { printSize: printSize('8x10'), attires: [attire('Toga')] }),
        inclusion('print', { quantity: 2, printSize: printSize('2R'), attires: [attire('Toga')] }),
        inclusion('print', { quantity: 5, printSize: printSize('2x2'), attires: [attire('Toga')] }),
        inclusion('print', { quantity: 4, printSize: printSize('1x1'), attires: [attire('Toga')] }),
        inclusion('privilege', { description: 'High Resolution soft copies' }),
        inclusion('privilege', { description: 'Usage of Toga and Hood' }),
        inclusion('privilege', { description: 'Usage of Ladies Accessories' }),
        inclusion('privilege', {
          description: 'Usage of Executive Attire',
          attires: [attire('Executive')],
        }),
        inclusion('privilege', { description: 'Usage of Barong' }),
        inclusion('privilege', { description: 'Usage of Filipiniana', attires: [attire('Filipiniana')] }),
      ],
    });
    expect(expandedRowModel(basic)).toEqual({
      description: 'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
      durationLine: null,
      frameChips: ['Frame 1'],
      inclusionLines: [
        '1 framed picture · 8x10 · Toga',
        '2 prints · 2R · Toga',
        '5 prints · 2x2 · Toga',
        '4 prints · 1x1 · Toga',
        'High Resolution soft copies',
        'Usage of Toga and Hood',
        'Usage of Ladies Accessories',
        'Usage of Executive Attire',
        'Usage of Barong',
        'Usage of Filipiniana',
      ],
    });
  });
});
```

- [ ] **Step 2: Write the failing tests (b) — the peso suite**

Create `apps/admin/src/lib/peso.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { peso } from './peso.js';

describe('peso (the no-price law’s runnable half, M7 #219)', () => {
  it('formats the landing-pinned precedent — ₱1,100.00 / ₱125.50 (full-ICU Node; never edit the expectation — fix the runtime instead)', () => {
    expect(peso(110000)).toBe('₱1,100.00');
    expect(peso(12550)).toBe('₱125.50');
  });

  it('null (unpriced, ADR-0020) answers null — the price cell renders blank, never a sentinel', () => {
    expect(peso(null)).toBeNull();
  });

  it('zero is a price, not an absence — ₱0.00', () => {
    expect(peso(0)).toBe('₱0.00');
  });
});
```

- [ ] **Step 3: Run red**

`pnpm --filter @sevendays/admin test -- --run` — both new files fail to resolve their imports (`package-expanded-row.js`, `peso.js` do not exist). Capture the red output to the evidence dir.

- [ ] **Step 4: Write the two modules + move peso**

(a) Create `apps/admin/src/lib/package-expanded-row.ts` with exactly:

```ts
// The packages expanded row's composition seam (M7 #219): one pure
// derivation from ServicePackageRead to the render model both postures
// (the desktop ExpandPanel and the mobile stacked reveal) render.
// durationMinutes renders nowhere else in the table; frames chip by
// frame number; inclusions render as bullet lines — label + print size +
// attires for picture kinds, the description alone for privileges (an
// attire suffix would duplicate the subject: "Usage of Barong · Barong").
// Array order IS render order (the server renumbers in-transaction) —
// the seam never sorts. Pure rendering, zero API work: the read shape
// already carries every field.
//
// TODO(owner-copy): the three string forms — the duration line ("60
// minutes" beside a Clock icon), the chip prefix ("Frame 1"), and the
// bullet grammar ("1 framed picture · 8x10 · Toga") — await the owner's
// ratification (#134 open items); the variants round retunes them here
// and the suite follows in the same commit.
import type {
  PackageInclusionKind,
  ResolvedPackageInclusion,
  ServicePackageRead,
} from '@sevendays/types';

export interface ExpandedRowModel {
  description: string;
  durationLine: string | null;
  frameChips: string[];
  inclusionLines: string[];
}

function durationLineFrom(minutes: number | null): string | null {
  if (minutes == null) return null;
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

function inclusionLabel(
  kind: PackageInclusionKind,
  quantity: number | null,
  description: string | null
): string {
  if (description) return description;
  if (kind === 'privilege') return 'Privilege';
  const noun = kind === 'framed_picture' ? 'framed picture' : 'print';
  if (quantity == null) return noun;
  return `${quantity} ${quantity === 1 ? noun : `${noun}s`}`;
}

function inclusionLine(inclusion: ResolvedPackageInclusion): string {
  const parts: (string | null)[] = [
    inclusionLabel(inclusion.kind, inclusion.quantity, inclusion.description),
    inclusion.printSize?.code ?? null,
  ];
  if (inclusion.kind !== 'privilege' && inclusion.attires.length > 0) {
    parts.push(inclusion.attires.map((attire) => attire.name).join('/'));
  }
  return parts.filter((part): part is string => part != null).join(' · ');
}

export function expandedRowModel(row: ServicePackageRead): ExpandedRowModel {
  return {
    description: row.description,
    durationLine: durationLineFrom(row.durationMinutes),
    frameChips: row.frames.map((frame) => `Frame ${frame.frameNumber}`),
    inclusionLines: row.inclusions.map(inclusionLine),
  };
}
```

(b) Create `apps/admin/src/lib/peso.ts` with exactly:

```ts
// The peso seam (moved from components/cms/shared.tsx, M7 #219): the
// format stays pinned to the landing precedent (₱1,100.00), and the move
// makes the no-price law runnable — null (unpriced, ADR-0020) answers
// null, and the table's price cell renders nothing. The lib home keeps
// the plain-node suite free of component imports.
export function peso(cents: number | null): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
```

(c) In `apps/admin/src/components/cms/shared.tsx`, delete the definition and its doc comment (lines 47–51 at `eb63d28`):

```tsx
/** Peso format pinned to the landing precedent (test-pinned there as ₱1,100.00). Null (unpriced, ADR-0020) renders nothing. */
export function peso(cents: number | null): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}
```

Nothing else in `shared.tsx` changes (the file's own consumers of `peso` — there are none; only the export leaves).

(d) Retarget the three importers — in each of `packages/packages-table.tsx`, `addons/addons-screen.tsx`, `studio-services/studio-services-screen.tsx`: remove `peso,` from the multi-line `#/components/cms/shared` import block and add the lib import beside the other `#/lib/…` imports (biome's fix pass orders it):

```tsx
import { peso } from '#/lib/peso';
```

- [ ] **Step 5: Green + the grep gate + gates + commit**

`pnpm --filter @sevendays/admin test -- --run` — **23 files / 229 tests passed** (217 + the 12 new). Then the grep gate (both from the repo root; capture output to the evidence dir):

```bash
grep -rn "export function peso" apps/admin/src
grep -rn "Intl.NumberFormat" apps/admin/src
```

Expected: the first answers exactly `apps/admin/src/lib/peso.ts` (one site); the second answers exactly the same single site (the format lives once). Then `pnpm --filter @sevendays/admin fix` → `test -- --run` → `typecheck`. Commit:

```bash
git add apps/admin/src/lib/package-expanded-row.ts apps/admin/src/lib/package-expanded-row.test.ts apps/admin/src/lib/peso.ts apps/admin/src/lib/peso.test.ts apps/admin/src/components/cms/shared.tsx apps/admin/src/components/packages/packages-table.tsx apps/admin/src/components/addons/addons-screen.tsx apps/admin/src/components/studio-services/studio-services-screen.tsx
git commit -m "feat(admin): the expanded-row seam - the render model pinned, peso to lib with the no-price law (#219)"
```

### Task 2: The composition — one component, both postures (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule) before composing. One new component renders the Task 1 model; both postures in `packages-table.tsx` render it. No shared primitive changes; no query changes; the collapsed row, the toggle, the segment, and the dialogs are untouched.

**Files:**
- Create: `apps/admin/src/components/packages/package-expanded-content.tsx`
- Modify: `apps/admin/src/components/packages/packages-table.tsx`

**Interfaces:**
- Consumes: Task 1's `expandedRowModel`; `Badge` from `@sevendays/ui` (outline variant — the chip); `Clock` from lucide-react (probed: `clock.mjs` exists in the installed 1.37.0).
- Produces: `PackageExpandedContent({ row }: { row: ServicePackageRead })` — rendered by `packages-table.tsx` inside the desktop `ExpandPanel` and inside the mobile `Collapse` block.

**Not here:** any change to `cms/shared.tsx` (Task 1's peso deletion was its only edit); the editor; the collapsed-row anatomy; upload maturation (#220); any landing file.

- [ ] **Step 1: Write `package-expanded-content.tsx`**

Create `apps/admin/src/components/packages/package-expanded-content.tsx` with exactly:

```tsx
// The packages expanded row's content (M7 #219, spec § the packages
// expanded row): the whole answer — the full description, a duration
// line (durationMinutes renders nowhere else in the table), frames as a
// chip row (frame numbers), and inclusions as bullet points (label +
// print size + attires). Pure rendering over the unchanged
// ServicePackageRead — zero API work. ONE composition serves both
// postures (the desktop ExpandPanel and the mobile stacked reveal), so
// the two never drift; every string comes from the lib seam
// (package-expanded-row.ts), pinned by its suite.
import type { ServicePackageRead } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { Clock } from 'lucide-react';
import { expandedRowModel } from '#/lib/package-expanded-row';

export function PackageExpandedContent({ row }: { row: ServicePackageRead }) {
  const { description, durationLine, frameChips, inclusionLines } = expandedRowModel(row);
  return (
    <div className='space-y-2.5'>
      {/* The description is the panel's primary content — foreground in
          both postures (the desktop panel's muted wrapper is overridden
          by the explicit class; the round may restore muted). */}
      <p className='text-foreground text-sm leading-relaxed'>{description}</p>
      {/* TODO(owner-copy): the duration line's form (Clock + "60 minutes")
          awaits the owner's ratification (#134 open items). */}
      {durationLine ? (
        <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
          <Clock className='size-3.5' aria-hidden='true' />
          {durationLine}
        </p>
      ) : null}
      {frameChips.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {frameChips.map((chip) => (
            <Badge key={chip} variant='outline' className='text-xs'>
              {chip}
            </Badge>
          ))}
        </div>
      ) : null}
      {inclusionLines.length > 0 ? (
        // Index keys are safe here: a row's inclusion lines are a static
        // per-render list (rows themselves key by row.id; the model
        // re-derives whole on every refetch) and duplicate lines are
        // lawful (two identical print rows), so the line text is not a
        // stable key.
        <ul className='text-muted-foreground list-disc space-y-0.5 pl-5 text-sm'>
          {inclusionLines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Wire both postures in `packages-table.tsx`**

(a) Add the import beside the other `#/components/…` imports:

```tsx
import { PackageExpandedContent } from '#/components/packages/package-expanded-content';
```

(b) Amend the file-header comment's now-false sentence. Replace:

```tsx
// `durationMinutes`, `frames`, and resolved `inclusions` render nowhere —
// the editor's concern (Task 6).
```

with:

```tsx
// `durationMinutes`, `frames`, and resolved `inclusions` render in the
// expanded row (#219) — the editor edits them, the table answers them.
```

(c) The desktop reveal. Replace:

```tsx
                      {/* T3 desktop reveal: the FULL description. */}
                      <ExpandPanel open={expanded} colSpan={4}>
                        {row.description}
                      </ExpandPanel>
```

with:

```tsx
                      {/* T3 desktop reveal (#219): the whole answer —
                          description, duration, frames, inclusions. */}
                      <ExpandPanel open={expanded} colSpan={4}>
                        <PackageExpandedContent row={row} />
                      </ExpandPanel>
```

(d) The mobile stacked reveal. Replace the description paragraph — the first child of the `Collapse` block's inner `div`:

```tsx
                      {/* B1: the mobile reveal carries the FULL description —
                      the dedup hides line 2 while expanded, so without this
                      paragraph the description is nowhere on packages
                      mobile. */}
                      <p className='text-muted-foreground text-sm'>{row.description}</p>
```

with:

```tsx
                      {/* B1 (#219): the mobile reveal renders the SAME
                      composition as the desktop panel — one component,
                      never drift. The dedup still hides line 2 while
                      expanded. */}
                      <PackageExpandedContent row={row} />
```

The Featured badge and the `RowIconActions` row stay after it, unchanged. The collapsed row's truncated second line (N2), the whole-row toggle, the status segment, and both dialogs are untouched.

- [ ] **Step 3: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (**23 files / 229 tests** unchanged — Task 2 adds no suite) → `typecheck`. Commit:

```bash
git add apps/admin/src/components/packages/package-expanded-content.tsx apps/admin/src/components/packages/packages-table.tsx
git commit -m "feat(admin): the expanded row rendered - both postures, one composition, theme-aware (#219)"
```

### Task 3: The owner-reacted variants round (controller interaction — both themes, both postures)

The ticket's third AC: "Both postures render; owner-reacted rendered variants, both themes." Light is judged first, the dark counterpart in the same round (#162's ruling). This is the design gate for the three `TODO(owner-copy)` string forms — no composition of record exists for this content (the #131 prototype's reveal was description-only).

**Files:**
- Modify (only if the round retunes): `apps/admin/src/lib/package-expanded-row.ts`, `apps/admin/src/lib/package-expanded-row.test.ts` (the suite's pinned strings follow a grammar retune in the same commit), `apps/admin/src/components/packages/package-expanded-content.tsx`, `apps/admin/src/components/packages/packages-table.tsx`

**Interfaces:** none new — string/class-level retunes and evidence only.

**Not here:** the milestone-level "Verify: owner-accepted rendered variants" checkbox in `docs/plan.md` (that box is the close-out ticket's — this round is evidence toward it); any other screen's reveal; the editor; any API surface.

- [ ] **Step 1: Seed the spread and capture both themes × both postures**

Run the admin dev server (`pnpm --filter @sevendays/admin dev`) and prepare the states — all through the CMS itself, no DB surgery: (a) set `Duration (minutes)` to `60` on Basic Package and save (the editor field is live at `package-editor.tsx:820`); (b) unprice one package (the Priced checkbox unchecked → saves `null`, #212); (c) leave a multi-frame row standing (e.g. Package D — frames 1 and 2); (d) keep a deactivated row visible (segment All). Then capture, in BOTH themes (the topbar toggle): the expanded row on (1) a duration-bearing row, (2) a multi-frame row, (3) the unpriced row, (4) a deactivated row — each in the desktop posture (wide viewport, the table above the 700px container fold) AND the stacked posture (narrow the viewport below the 700px container width); plus the COLLAPSED unpriced row's blank price cell in both postures; plus one row with no duration (the line's absence). Save every capture to the evidence dir.

- [ ] **Step 2: The owner reacts; apply the rulings**

Present the captures (light first, dark in the same round). Record the rulings in the evidence dir. Then apply: (a) any copy retune edits `package-expanded-row.ts`'s string forms (duration line, chip prefix, bullet grammar — including the privilege description-alone ruling if the owner prefers the attire suffix) AND the suite's pinned expectations in the same change; (b) any class retune edits `package-expanded-content.tsx` (e.g. the description back to muted); (c) the three `TODO(owner-copy)` markers retire as ruled — each replaced by a dated note in the house shape (`// (owner-reacted 2026-10-XX, #219's variants round): …`); a marker survives verbatim only where the owner explicitly defers. If the round rules an interactive-text color change, re-measure contrast first (the #218 one-liner against `#ffffff` light / `#1b1e22` dark, ≥ 4.5 for text) — the composed classes here are non-interactive text on token backgrounds, so this only triggers on a retune onto tailwind palette classes.

- [ ] **Step 3: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (**23 files / 229 tests**; if the grammar retuned, the suite's expectations changed with it — the count holds) → `typecheck`. Commit (skip if the round changed nothing — then fold Step 1's evidence into Task 4):

```bash
git add apps/admin/src/lib/package-expanded-row.ts apps/admin/src/lib/package-expanded-row.test.ts apps/admin/src/components/packages/package-expanded-content.tsx apps/admin/src/components/packages/packages-table.tsx
git commit -m "chore(admin): the expanded-row variants round settled - copy and classes as ruled, both themes (#219)"
```

### Task 4: Gates, docs rotation, PR, v1 pick, issue close, graphify

- [ ] **Step 1: The full check**

`pnpm check` (lint + format + typecheck + test across the repo — green; the only touched package is admin, everything else is floor-unchanged: types 17/167, api 31 files 422+3, api-client 5/45, landing 10/92, admin **23/229**).

- [ ] **Step 2: `docs/plan.md` — ONE box tick (pinned edit)**

`docs/plan.md:177` flips from `- [ ] Admin — the packages expanded row (#165): …` to `- [✅]` with this annotation appended at its line's end:

```text
 _(2026-10-XX, #219: both postures render one composition — the full description foreground, the duration line (60 → "60 minutes", null renders nothing) beside a Clock icon, frames as outline-badge chips (Frame N), inclusions as bullet lines (label + print size + attires; privileges description-alone) over the unchanged ServicePackageRead, zero API work; unpriced = blank price cell with peso moved to lib and pinned (peso(null) → null); the expanded-row composition pinned by the package-expanded-row seam suite; owner-reacted variants round closed, both themes)_
```

Nothing else in the M7 block changes — the milestone-level "Verify: owner-accepted rendered variants" box stays unticked (the close-out ticket's).

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md`**

(a) progress.md gains a dated entry narrating: the composition (both postures, one component), the seam suite + the peso move, the round's outcome, and the floors (admin 23/229). (b) AGENTS.md, two edits: in *Current status of `pnpm test`*, the admin sentence's floor clause `admin floor 21 files / 217 tests (the #212 unpriced-editor seam pins, + #214's five cover/tray seam pins, + #215's six site-settings seam pins, + #218's three interaction-system seams — save-contract, status-segment, submissions-state)` becomes `admin floor 23 files / 229 tests (the #212 unpriced-editor seam pins, + #214's five cover/tray seam pins, + #215's six site-settings seam pins, + #218's three interaction-system seams — save-contract, status-segment, submissions-state; + #219's two expanded-row seams — package-expanded-row, peso)`; and in the Engineering Rules block, one sentence appended to the CMS-interaction-system paragraph's end: `The packages table's expanded row is live (M7 #219): the full description, a duration line, frames as chips, and inclusions as bullets on both postures — one composition over the unchanged read shape, zero API work; unpriced rows keep the blank price cell (peso pinned in lib).`

- [ ] **Step 4: The docs commit**

```bash
git add docs/plan.md docs/progress.md AGENTS.md
git commit -m "docs(m7): #219 closes the packages expanded row - plan box, progress entry, AGENTS floors (#219)"
```

- [ ] **Step 5: PR + squash merge**

Push `feat/219-packages-expanded-row`; open the PR against main titled `The packages expanded row — the whole answer on both postures (#219)`; body: the three ACs each answered with its evidence pointer (the seam suite output; the peso null pin + the blank-cell capture; the both-postures × both-themes captures + the owner's rulings). Squash-merge.

- [ ] **Step 6: The v1 pick (pre-ruled PICK clean)**

Per the spec's class ledger (the CMS UX system row: "interaction ticket, expanded row, upload UI — **PICK clean** — Admin surfaces exist on both editions") and `docs/agents/v1-picks.md`: run the classifier over the squash commit — every code path this ticket touches is `apps/admin/**` (both editions carry the admin verbatim), so the expected verdict is **pick** with zero content-drops; the docs files (`docs/**`, `AGENTS.md`, `graphify-out/`) are main-only per the runbook and never pick. Append the ledger row (date, PR #, main SHA, `pick`, v1 SHA, the one-line summary: "#219 — M7 ticket 08, the packages expanded row: one composition on both postures — description, duration line, frames as chips, inclusions as bullets over the unchanged read shape; peso to lib, the no-price law pinned"). Commit the ledger on main.

- [ ] **Step 7: Issue close + graphify**

Close #219 with a comment mapping each AC to its evidence (the seam suite, the peso pin + the blank-cell capture, the both-postures/both-themes round). Then `graphify update .` and commit the graph churn (`chore(graphify): post-#219 graph update (code modified: the packages expanded-row surface across admin)`).



