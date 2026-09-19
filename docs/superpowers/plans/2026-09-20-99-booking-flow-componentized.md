# Booking Flow Componentized, Zero Flow Changes (M3 ticket #99) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The booking flow (`/book` wizard + `/booking/:id` confirmation) is componentized onto the #58 vocabulary — `ChoiceCard`, `HourChipGrid` + `HourChip`, `StepProgress` (composed on the shared `progress` primitive), `ConfirmationCard` — with `SummaryRail` / `RejectionCard` restyled and the rejection card moved onto a white card surface, with **zero flow changes**: step count, question copy, gating, back-button behavior, the `1fr + 16rem` rail layout, the progress bar's position, and every `data-*` seam survive verbatim, so the M2 CDP scenario passes read-only and the mutating e2e stays green, both **without a single script or test edit**.

**Architecture:** The rest of landing already wears the #111-endorsed system (white cards on the petrol wash, `buttonVariants` CTAs, the shared `badge`, focus rings). This ticket brings the last unstyled surface family onto that ground: the wizard's step content moves inside a white card floating on the wash (which is also what makes the destructive-bearing past-hint and rejection card rule-compliant — they render on card, never bare on wash), the rail becomes its own white card, and the five #58 names extract as landing-local Tier-2 components. The contact gate is restated as a Zod schema in the lib (predicate-identical to M2's inline expression, pinned by a new lib-seam suite) so the step can render inline errors through plain `Input`/`Label`/`Textarea` primitives — no bespoke wrapper, no gate drift. All buttons stay native `<button type='button'>` elements carrying `buttonVariants` classes (the #98 pattern), because the CDP scripts click them by tag position.

**Tech Stack:** TanStack Start (file routes), `@sevendays/ui` primitives (`button`, `badge` via `WalkInBadge`, `input`, `label`, `textarea`, `progress`), Zod 4, Tailwind v4 semantic tokens, pnpm + Turborepo, Biome, the M2 CDP verify scripts (read-only + the mutating e2e).

**Spec:** Implements ticket [#99 "M3 ticket 05 — booking wizard componentized, zero flow changes"](https://github.com/jeius/sevendays/issues/99) under spec [#94 (Milestone 3 — UI/UX Design System)](https://github.com/jeius/sevendays/issues/94), § "Component inventory — the canonical record" (the booking-flow variant-C table) + § "Landing refactor, surface by surface" (the booking-flow ruling). Key recon facts (2026-09-20, main `7d93829`):

- **Sibling fences (shared roadmap — do not cross):** #98 landed (PR #110) and owns every non-booking landing surface — this ticket consumes its ground (`WalkInBadge` wrapper, `buttonVariants` + focus-ring idiom, the white-card-on-wash pattern) and never re-touches `site-header/footer/mobile-nav`, `index/services/about/branches` routes, or the catalog cards; #101 owns milestone close-out — `/prototype-tokens`, `prototype/`, and the systematic owner-screenshot pass are NOT ours (screenshots still ride this ticket's PR per spec testing decision 5); `packages/ui` gains nothing (ADR-0017 two-tier rule — every new component is landing-local). `docs/plan.md` line 101 is this ticket's checkbox alone.
- **The seam contract (re-derived from the committed scripts — the whole contract, including the structural traps):**
  - `booking-wizard.mjs` (15 read-only checks) clicks `section[data-step='1'|'2'|'3'] button` — the **first button inside each step section must remain the first choice card** (no leading buttons in any step section; the back button renders outside the sections, only at step > 1); clicks `section[data-step='2'] button[data-offering='${id}']` — `data-offering` stays on the offering cards; clicks `section[data-step='4'] button` (first button = the **first hour chip** — the date input is an `input`, nothing before the chip grid may be a button) and `section[data-step='4'] > button` — the step-4 **Continue must stay a DIRECT child of the `<section>`**; reads `[data-back]`, `[data-past-hint]`, `[data-summary-rail]` (innerText must contain `Your booking` + the live total + add-on name), `[data-rejection-card]` (innerText must contain `already passed in the Philippines` and `API reason:`); asserts the contact gate via `section[data-step='5'] button[type='button']:last-of-type` `.disabled` flipping after `setInput` on `input[placeholder='Full name']`, `input[placeholder='Email']`, `input[placeholder='Phone (+63…)']` — the placeholders are byte-frozen; and asserts the `/booking/:id` not-found renders 404 + `Booking not found.` + `Start a new booking`.
  - `booking-e2e.mjs` (7 MUTATING checks — the AC's "not broken") additionally clicks `section[data-step='3'] > button` (step-3 Continue — direct child; the Continue/Skip pair must stay **exclusively rendered**, exactly one in the DOM, or the first direct-child button could be Skip), fills `section[data-step='5'] textarea` (the notes field stays a `textarea`), and asserts the SSR read-back literals `Booking confirmed ✓`, `(PHT)`, `A confirmation email was sent to ${email}.`, `Need to change something? Call the branch.`, and **no `Add-on` string when the booking carries none** (the `Add-on` row label renders only per record row — keep it that way).
  - **Copy frozen verbatim everywhere:** the five `QUESTIONS`, `Continue · ${peso(…)}`, `Skip — no add-ons`, `Continue`, `Booking…` / `Confirm booking · ${peso(…)}`, `← Back`, `Service Packages`, `Studio Services` (+ `at ${branchName}`), `Choose a branch first — services are bookable per branch.`, `No add-ons apply to this booking.`, `All times are Philippine time (PHT, UTC+8). Bookings in the past are rejected.`, `That time has already passed — pick a later slot.`, `REJECTION_COPY` + `We couldn't complete that booking` + `API reason: `, the WalkInBadge texts, and every confirmation-page literal above.
- **Verified current state (live reads, 2026-09-20):** `routes/book.tsx` is the last island-styled surface (the #98 gate's 15 `text-neutral`/`bg-neutral` line matches) with the hand-rolled width-div bar and the third hand-rolled pill (`book.tsx:118` — this ticket sweeps it onto `WalkInBadge`); `routes/booking.$id.tsx`'s card has `rounded-xl border p-6` with **no background** (renders wash-on-wash since #97) and a plain-anchor not-found; `SummaryRail` is border-only (no `bg-card`, heading not ink); `RejectionCard` is `bg-destructive/10` — on the wash canvas, the exact placement-rule violation the ticket names; `WalkInBadge` is the live `badge` wrapper (`variant='outline'` in the generated union — #98-verified); landing's lib-seam suite is **6 files / 56 tests green** (recorded baseline).
- **Primitive/API facts (grep-verified at the true sources):** `@base-ui/react@1.8.0` `ProgressRoot` takes `value` on a 0–100 scale (`min`/`max` default 0/100, `ProgressRoot.d.ts`) and the indicator sets `width: ${percentageValue}%` (`ProgressIndicator.mjs`) — so `<Progress value={(step / 5) * 100} />` is the correct wiring, and `packages/ui`'s `Progress` wrapper passes `className` + aria props through (`progress.tsx`); `@sevendays/ui` exports `./components/*` (`package.json` exports map) — `input`, `label`, `textarea`, `progress`, `button` all resolve; `Input`/`Textarea` pass every native prop through (placeholder, min, onChange, onBlur, aria-*) and style `aria-invalid` with the destructive ring natively; `AppointmentWithAddons` and `TIME_SLOTS` are exported from `@sevendays/types` / `lib/booking` as imported below; zod `^4.5.1` is a landing dependency (`.trim().min(1, msg)` chains as written).
- **Tokens used (all live in `packages/ui/src/tokens.css`):** `bg-card`, `border-brand-gray-cool`, `text-brand-ink`, `text-muted-foreground`/`text-muted-text`, `text-brand-700`, `border-primary`/`bg-primary`/`text-primary-foreground`, `bg-brand-50`, `hover:border-brand-400`, `text-destructive`, `border-destructive/50`, `focus-visible:ring-brand-focus-ring` + `ring-3` (the #98 idiom).
- **Parked / out of scope:** booking-flow UX (frozen on the M2 map — no step, copy, gating, or navigation changes); real availability / `Slot` vocabulary (v2; `HourChipGrid` is v2-transient, token-fit only); confirmation-email visuals (M2 plain HTML stands); the v1 edition (booking-free — the flow doesn't exist there; no variant work, the v1-picks ledger row is the triager's at merge); `packages/ui` changes; owner screenshots beyond the PR's (the systematic pass is #101's).

## Global Constraints

- **Branch & baseline:** `feat/99-booking-flow` in the worktree `/home/jeius/Projects/sevendays/.worktrees/99-booking-flow`, based on main `7d93829`. Setup: `git worktree add .worktrees/99-booking-flow -b feat/99-booking-flow` from the main checkout, then in the worktree `pnpm install` + `pnpm build:packages` + `pnpm --filter @sevendays/api build` + `pnpm check` (expect green at the recorded #111 baseline, 35/35 turbo tasks). This plan file is the branch's first commit (copy it from the main checkout).
- **Zero flow changes — the frozen list:** 5 steps with the `QUESTIONS` copy verbatim; the gate predicates (`canConfirm` = branch + offering + scheduledAt + the three contact fields non-empty after trim; step-4 Continue `disabled={scheduledAt === null}`); back-button behavior (`wizard.goBack`, only at step > 1, outside the step sections); the rail layout class `md:grid-cols-[1fr_16rem]` byte-for-byte; the progress bar's position (directly above the grid, inside the page container); every copy literal in the seam contract above. The contact gate's Zod restatement must stay predicate-identical — Task 1's tests are the proof, and the CDP gate flip (check 12) is the live proof.
- **Scripts and tests are READ-ONLY.** `apps/landing/scripts/verify/*.mjs` and `apps/landing/src/lib/*.test.ts`: zero edits, zero exceptions (#98's single ruled script-edit exception was that ticket's; nothing here needs one — no expectation pins anything this restyle changes). If a script fails, the surface broke a seam: fix the surface, never the script. The ONE new test file (`booking-contact.test.ts`) is additive — the six existing files stay byte-untouched (6 files / 56 tests → 7 / 62).
- **Component discipline (#58 / ADR-0017):** `ChoiceCard`, `HourChipGrid` + `HourChip`, `StepProgress`, `ConfirmationCard` are landing-local Tier-2 components in `apps/landing/src/components/booking/`; `SummaryRail` / `RejectionCard` keep their names and files; `StepProgress` composes `@sevendays/ui/components/progress`; `HourChipGrid` is v2-transient — token-fit styling only, no structural investment; the contact step gets **no bespoke wrapper component** (plain `Input`/`Label`/`Textarea` in the route); no renames, no consolidation, no new shared primitives.
- **Semantics adjudication (agent ruling, surfaced in the PR):** choice cards and hour chips stay native `<button type='button'>` with `aria-pressed` — the M2 keyboard flow (Tab + Enter per card) is toggle-button semantics, and true `role='radio'`/`role='checkbox'` groups would promise arrow-key navigation the frozen flow doesn't have. The #58 "radio single-select / checkbox multi-select" line lives in the component's usage (branch/offering steps single, add-ons multi) and its doc comment.
- **Destructive placement rule (spec § Implementation Decisions):** destructive-bearing text renders on white/card surfaces only. The step content moving onto a white card satisfies it for the past-hint and the contact-step inline errors; `RejectionCard` renders `bg-card` + `border-destructive/50`.
- **Tokens, not island colors:** every `text-neutral-*` / `bg-neutral-*` / `ring-neutral-*` in the touched files sweeps to the tokens above; after this ticket the island grep over routes + components must print its OK fallback (book.tsx was the last holder). No new CSS, no new tokens, no `styles.css` edits.
- **Copy pins — owner-ratified/CDP-asserted literals** are quoted verbatim in the task snippets and must land byte-identical. **Agent-authored copy (all veto-flagged in the PR):** the three contact error messages and four contact labels pinned in Tasks 1/3; the booking-not-found supporting sentence pinned in Task 4; no other new customer-facing strings.
- **UI-skills line (AGENTS.md, ruled #111):** UI work loads the installed UI/UX skill set at execution time — this ticket names `prototype` + `ui-ux-pro-max`. The composed screens reuse the #111-endorsed card system verbatim (no new composition vocabulary), so the owner's react-to-rendered-variants channel is this ticket's PR screenshots (the #98 precedent); #101 runs the systematic pass.
- **Gates (repo AGENTS.md):** `pnpm check` green before the PR; `graphify update .` after code changes; tick checkboxes with `- [✅]`; update `docs/progress.md` (Task 6 pins the entry); pnpm-only; `async`/`await`; Biome canonical form via `pnpm --filter @sevendays/landing fix` — never hand-formatting.

---

### Task 1: The seam guard + the contact gate as a Zod schema (lib, test-first)

**Files:**
- Modify: `apps/landing/src/lib/booking.ts` (zod import + `contactSchema` + `contactFieldErrors`)
- Create: `apps/landing/src/lib/booking-contact.test.ts`

**Interfaces:**
- Consumes: zod 4 (`z.string().trim().min(1, msg)`), the M2 gate's exact predicate.
- Produces: `contactSchema` (`{ name, email, phone, notes }` — the three contact fields non-empty after trim, notes free-form) and `contactFieldErrors(fields) → Partial<Record<'name' | 'email' | 'phone', string>>`. The route's `canConfirm` consumes the schema (Task 3); the step's inline errors consume the messages.

**Not here:** no route changes (Tasks 3–4); no UI (the messages' rendering is Task 3); the six existing lib-seam test files are not touched — the new suite is a separate file so "tests pass unchanged" stays literally true.

- [ ] **Step 1: Seam guard — pin the contract before touching anything**

```bash
grep -n "data-step\|data-back\|data-offering\|data-past-hint\|data-rejection-card\|data-summary-rail\|placeholder=\|last-of-type\|> button\|textarea" apps/landing/scripts/verify/booking-wizard.mjs apps/landing/scripts/verify/booking-e2e.mjs
grep -n "already passed in the Philippines\|API reason\|Your booking\|Booking confirmed\|Booking not found\|Start a new booking\|confirmation email was sent\|Need to change something" apps/landing/scripts/verify/booking-wizard.mjs apps/landing/scripts/verify/booking-e2e.mjs
pnpm --filter @sevendays/landing test 2>&1 | grep -E "Test Files|Tests "
```

Record all three outputs in the Task 1 commit message (the selector inventory, the literal inventory, and the baseline `6 passed (6)` / `56 passed (56)`). Any selector or literal these greps surface is frozen through the rewrite — the recon table above is the expectation; if a grep shows something moved, re-pin the affected Task 3/4 snippet to the actual line before proceeding.

- [ ] **Step 2: The schema in the lib**

In `apps/landing/src/lib/booking.ts`, add `import { z } from 'zod';` directly below `import { useMemo, useState } from 'react';`, then insert this block directly above `export type WizardSubmitResult`:

```ts
// ---------------------------------------------------------------------------
// Contact step (#99): the M2 confirm gate restated as a schema. The
// predicate is UNCHANGED — name/email/phone non-empty after trim, notes
// never gates — and the messages feed the step's inline Zod errors (#58
// ruling: plain primitives + inline errors, no bespoke wrapper).
// booking-contact.test.ts pins the equivalence with the old expression.
// ---------------------------------------------------------------------------
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your full name.'),
  email: z.string().trim().min(1, 'Please enter your email — your confirmation goes there.'),
  phone: z.string().trim().min(1, 'Please enter a phone number.'),
  notes: z.string(),
});

export type ContactField = 'name' | 'email' | 'phone';

/** Field → first Zod message for the invalid contact fields (notes never errors). */
export function contactFieldErrors(fields: unknown): Partial<Record<ContactField, string>> {
  const result = contactSchema.safeParse(fields);
  if (result.success) return {};
  const errors: Partial<Record<ContactField, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key === 'name' || key === 'email' || key === 'phone') {
      errors[key] ??= issue.message;
    }
  }
  return errors;
}
```

- [ ] **Step 3: The equivalence suite (new file — the existing six stay untouched)**

Create `apps/landing/src/lib/booking-contact.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { contactFieldErrors, contactSchema } from './booking';

// The M2 gate, restated as a schema (#99): the confirm button's predicate is
// UNCHANGED — name/email/phone non-empty after trim; notes never gates.
// These tests pin the equivalence with the old inline expression
// (name.trim() !== '' && email.trim() !== '' && phone.trim() !== '') so the
// restyle cannot drift the gate the CDP scenario flips (check 12).
describe('contactSchema (the step-5 gate)', () => {
  it('accepts the three fields filled — the gate opens', () => {
    const result = contactSchema.safeParse({
      name: 'A Customer',
      email: 'customer@example.com',
      phone: '+63 917 000 0000',
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects all-empty — the gate stays shut', () => {
    const result = contactSchema.safeParse({ name: '', email: '', phone: '', notes: '' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only fields — trim before the min, like the old predicate', () => {
    const result = contactSchema.safeParse({ name: '   ', email: ' ', phone: '\t', notes: '' });
    expect(result.success).toBe(false);
  });

  it('never gates on notes — any value, long or empty', () => {
    const result = contactSchema.safeParse({
      name: 'A Customer',
      email: 'customer@example.com',
      phone: '+63 917 000 0000',
      notes: 'x'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('carries one message per invalid contact field, in the pinned wording', () => {
    expect(contactFieldErrors({ name: '', email: '', phone: '', notes: '' })).toEqual({
      name: 'Please enter your full name.',
      email: 'Please enter your email — your confirmation goes there.',
      phone: 'Please enter a phone number.',
    });
  });

  it('returns no errors once every contact field is valid', () => {
    expect(
      contactFieldErrors({ name: 'A', email: 'b@example.com', phone: '+63 917', notes: '' })
    ).toEqual({});
  });
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing test
git add apps/landing/src/lib/booking.ts apps/landing/src/lib/booking-contact.test.ts
git commit -m "feat(landing): the contact gate as a Zod schema + equivalence suite (#99)

Predicate identical to the M2 inline expression (three non-empty trims, notes
free); messages feed the step-5 inline errors. New suite file — the six
existing lib-seam files untouched (6/56 baseline recorded). <record: the
Step 1 seam-guard outputs>"
```

Expected: `Test Files 7 passed (7)` / `Tests 62 passed (62)` — the 56 baseline + 6 new.

---

### Task 2: The #58 components + the SummaryRail / RejectionCard restyle

**Files:**
- Create: `apps/landing/src/components/booking/choice-card.tsx`
- Create: `apps/landing/src/components/booking/hour-chip-grid.tsx`
- Create: `apps/landing/src/components/booking/step-progress.tsx`
- Create: `apps/landing/src/components/booking/confirmation-card.tsx`
- Modify: `apps/landing/src/components/booking/summary-rail.tsx` (restyle only)
- Modify: `apps/landing/src/components/booking/rejection-card.tsx` (restyle only)

**Interfaces:**
- Consumes: `@sevendays/ui/components/progress`, the `cn` package, `TIME_SLOTS` + `BookingWizard`/`REJECTION_COPY` from `../../lib/booking`, `confirmationTotalCents` from `../../lib/booking-read`, `AppointmentWithAddons` from `@sevendays/types`, `peso`/`phDateTime` from `../../lib/format`.
- Produces: `ChoiceCard({ selected, onSelect, offeringId?, children })` — a native `<button type='button'>` with `aria-pressed` and `data-offering` passthrough; `HourChipGrid({ value, onSelect })` + `HourChip({ time, selected, onSelect })`; `StepProgress({ step, className? })`; `ConfirmationCard({ record, branchName, offeringName })` — the route joins names, the card renders the snapshot only; `SummaryRail` / `RejectionCard` with unchanged prop contracts, system-styled.

**Not here:** no route consumes these yet (Tasks 3–4 wire them); no `WalkInBadge` edits (the live wrapper is consumed as-is in Task 3); no shared-package changes.

- [ ] **Step 1: `ChoiceCard`**

Create `apps/landing/src/components/booking/choice-card.tsx` with exactly:

```tsx
import { cn } from 'cn';
import type { ReactNode } from 'react';

// The wizard's select card (#58 inventory): one shell for the branch /
// offering / add-on steps — radio semantics where the step is single-select
// (branch, offering), checkbox semantics where it's multi-select (add-ons).
// Frozen-flow adjudication (#99): the M2 keyboard behavior is Tab + Enter
// per card, so the honest ARIA mapping is the toggle button (aria-pressed) —
// real radio/checkbox roles would promise arrow-key group navigation the
// frozen flow doesn't have. offeringId is the CDP seam (data-offering).
export function ChoiceCard({
  selected,
  onSelect,
  offeringId,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  offeringId?: string;
  children: ReactNode;
}) {
  return (
    <button
      type='button'
      aria-pressed={selected}
      data-offering={offeringId}
      onClick={onSelect}
      className={cn(
        'focus-visible:ring-brand-focus-ring rounded-xl border p-4 text-left transition-colors focus-visible:ring-3',
        selected
          ? 'border-primary bg-brand-50 ring-1 ring-primary'
          : 'border-brand-gray-cool bg-card hover:border-brand-400'
      )}
    >
      {children}
    </button>
  );
}
```

(`data-offering={undefined}` omits the attribute — React drops undefined props — so branch/add-on cards render without it.)

- [ ] **Step 2: `HourChipGrid` + `HourChip`**

Create `apps/landing/src/components/booking/hour-chip-grid.tsx` with exactly:

```tsx
import { cn } from 'cn';
import { TIME_SLOTS } from '../../lib/booking';

// The placeholder hour grid (#58 inventory — deliberately not Slot-named;
// Slot is glossary domain language for real availability, which v1 doesn't
// have). v2-transient: the availability rebuild may replace the whole
// control — token-fit styling only, no structural investment.
export function HourChipGrid({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (time: string) => void;
}) {
  return (
    <div className='mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5'>
      {TIME_SLOTS.map((t) => (
        <HourChip key={t} time={t} selected={value === t} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function HourChip({
  time,
  selected,
  onSelect,
}: {
  time: string;
  selected: boolean;
  onSelect: (time: string) => void;
}) {
  return (
    <button
      type='button'
      aria-pressed={selected}
      onClick={() => onSelect(time)}
      className={cn(
        'focus-visible:ring-brand-focus-ring rounded-lg border px-2 py-2 font-mono text-sm transition-colors focus-visible:ring-3',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-brand-gray-cool bg-card hover:border-brand-400'
      )}
    >
      {time}
    </button>
  );
}
```

- [ ] **Step 3: `StepProgress`**

Create `apps/landing/src/components/booking/step-progress.tsx` with exactly:

```tsx
import { Progress } from '@sevendays/ui/components/progress';

const TOTAL_STEPS = 5;

// The wizard's step indicator (#58: composed on the shared progress
// primitive — replaces the hand-rolled width div). Base UI's value scale is
// 0–100 (min 0 / max 100 defaults), so step N of 5 renders N/5 × 100.
export function StepProgress({ step, className }: { step: number; className?: string }) {
  return (
    <Progress
      value={(step / TOTAL_STEPS) * 100}
      aria-label={`Booking step ${step} of ${TOTAL_STEPS}`}
      className={className}
    />
  );
}
```

- [ ] **Step 4: `ConfirmationCard`**

Create `apps/landing/src/components/booking/confirmation-card.tsx` with exactly:

```tsx
import type { AppointmentWithAddons } from '@sevendays/types';
import { confirmationTotalCents } from '../../lib/booking-read';
import { peso, phDateTime } from '../../lib/format';

// The /booking/:id snapshot read-back (#58: extracted from the confirmation
// page). Every literal is owner-pinned from the M2 prototype and asserted by
// the e2e — copy is frozen. The card renders record snapshot values only;
// names join at the route (the snapshot rule is enforced by the lib
// signatures — prices never come from the catalog).
export function ConfirmationCard({
  record,
  branchName,
  offeringName,
}: {
  record: AppointmentWithAddons;
  branchName: string;
  offeringName: string;
}) {
  return (
    <div className='mx-auto mt-8 max-w-lg rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <p className='text-brand-ink font-semibold text-lg'>Booking confirmed ✓</p>
      <dl className='mt-4 space-y-2 text-sm'>
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>Confirmation #</dt>
          <dd className='font-mono'>{record.id}</dd>
        </div>
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>Branch</dt>
          <dd>{branchName}</dd>
        </div>
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>Booking</dt>
          <dd>{offeringName}</dd>
        </div>
        {record.addonServices.map((a) => (
          <div key={a.addonServiceId} className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Add-on</dt>
            <dd>
              {a.name} · {peso(a.priceCents)}
            </dd>
          </div>
        ))}
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>Schedule</dt>
          <dd>{phDateTime(record.scheduledAt.toISOString())} (PHT)</dd>
        </div>
        <div className='flex justify-between gap-4 border-t pt-2 font-semibold'>
          <dt>Total</dt>
          <dd>{peso(confirmationTotalCents(record))}</dd>
        </div>
      </dl>
      <p className='mt-4 text-sm'>A confirmation email was sent to {record.customerEmail}.</p>
      <p className='text-muted-foreground mt-1 text-sm'>Need to change something? Call the branch.</p>
    </div>
  );
}
```

- [ ] **Step 5: `SummaryRail` + `RejectionCard` restyles**

In `apps/landing/src/components/booking/summary-rail.tsx`, replace the `<aside>` opening tag and the heading line with exactly (everything between them — the `<dl>` rows — is untouched):

```tsx
    <aside
      data-summary-rail
      className='md:sticky md:top-6 h-fit rounded-xl border border-brand-gray-cool bg-card p-4 shadow-sm'
    >
      <p className='text-brand-ink font-semibold text-sm'>Your booking</p>
```

In `apps/landing/src/components/booking/rejection-card.tsx`, replace the `<div>` opening tag's className with exactly:

```tsx
      className='mt-4 rounded-xl border border-destructive/50 bg-card p-4 shadow-sm'
```

(The white-card surface is the ticket's destructive-placement ruling: the card renders inside the step-5 white card after Task 3, and the `text-destructive` heading measures 4.77:1 on it. The texts, `role='alert'`, and `data-rejection-card` are untouched.)

- [ ] **Step 6: Format + typecheck + tests + commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test
git add apps/landing/src/components/booking/
git commit -m "feat(landing): the #58 booking components — ChoiceCard, HourChipGrid + HourChip, StepProgress, ConfirmationCard; rail + rejection restyles (#99)

StepProgress composes the shared progress primitive; ChoiceCard/HourChip are
aria-pressed toggle buttons (frozen-flow adjudication); rejection card moves
to the white surface (destructive placement rule)."
```

Expected: typecheck green (the new files are unwired but must compile), tests 62/62 (nothing lib-level moved).

---

### Task 3: `book.tsx` onto the components — the full restyle

**Files:**
- Modify: `apps/landing/src/routes/book.tsx` (rewrite of the component body; loader, `searchSchema`, and `QUESTIONS` unchanged)

**Interfaces:**
- Consumes: everything from Task 1 (`contactSchema`, `contactFieldErrors`) and Task 2 (`ChoiceCard`, `HourChipGrid`, `StepProgress`, the restyled `SummaryRail`/`RejectionCard`), plus `WalkInBadge`, `Input`/`Label`/`Textarea`, `buttonVariants`, `cn`.
- Produces: the wizard on the system — white step card + rail on the wash, `StepProgress` where the width div was, all five steps composed on `ChoiceCard`/`HourChipGrid`, the contact step on plain primitives with inline Zod errors, the step-1 pill collapsed onto `WalkInBadge` (the third duplicate dies), zero flow changes.

**Not here:** `booking.$id.tsx` (Task 4); no loader/query/search-param edits; no copy changes beyond the pinned contact labels/errors; no new state beyond the per-field `touched` map.

- [ ] **Step 1: Rewrite the file**

Replace the ENTIRE file `apps/landing/src/routes/book.tsx` with exactly:

```tsx
import { buttonVariants } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { cn } from 'cn';
import { useState } from 'react';
import { z } from 'zod';
import { ChoiceCard } from '../components/booking/choice-card';
import { HourChipGrid } from '../components/booking/hour-chip-grid';
import { RejectionCard } from '../components/booking/rejection-card';
import { StepProgress } from '../components/booking/step-progress';
import { SummaryRail } from '../components/booking/summary-rail';
import { WalkInBadge } from '../components/walk-in-badge';
import { createAppointment } from '../lib/api.functions';
import {
  contactFieldErrors,
  contactSchema,
  phDateInputMin,
  type RejectionReason,
  useBookingWizard,
} from '../lib/booking';
import { peso } from '../lib/format';
import {
  addonServiceQueries,
  branchQueries,
  servicePackageQueries,
  studioServiceQueries,
} from '../lib/queries';

const searchSchema = z.object({
  branch: z.string().min(1).optional(),
  package: z.string().min(1).optional(),
  service: z.string().min(1).optional(),
});

export const Route = createFileRoute('/book')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(branchQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(addonServiceQueries.all()),
    ]);
  },
  component: BookPage,
});

const QUESTIONS = [
  'Where would you like to book?',
  'What are you booking?',
  'Any add-ons? (optional)',
  'When? (Philippine time)',
  'Last — your details',
];

function BookPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: addons } = useSuspenseQuery(addonServiceQueries.all());

  const wizard = useBookingWizard(search, {
    catalog: { branches, packages, services, addons },
    createAppointment: (args) => createAppointment({ data: args }),
  });
  const [rejection, setRejection] = useState<{
    reason: RejectionReason;
    apiMessage: string;
  } | null>(null);
  // Inline Zod errors (#58 ruling): a field shows its message only after the
  // customer blurs it still-invalid — display-only state, never part of the
  // gate. The gate itself is the M2 predicate restated as contactSchema
  // (booking-contact.test.ts pins the equivalence).
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });

  async function handleSubmit() {
    setRejection(null);
    const result = await wizard.submit();
    if (result.ok) {
      navigate({ to: '/booking/$id', params: { id: result.appointmentId } });
    } else {
      setRejection(result.rejection);
    }
  }

  const contactFields = {
    name: wizard.name,
    email: wizard.email,
    phone: wizard.phone,
    notes: wizard.notes,
  };
  const canConfirm =
    wizard.branchId !== null &&
    wizard.offering !== null &&
    wizard.scheduledAt !== null &&
    contactSchema.safeParse(contactFields).success;
  const contactErrors = contactFieldErrors(contactFields);

  return (
    <div className='mx-auto max-w-5xl px-6 py-12'>
      {/* Position frozen (M2): the bar sits above the rail grid, full
          container width. */}
      <StepProgress step={wizard.step} className='mt-6' />
      {/* Layout frozen (M2): 1fr + 16rem rail. The step content moves onto
          the white card (#92 atmosphere) — which also puts every
          destructive-bearing text (past hint, inline errors, rejection
          card) on a card surface per the spec placement rule. */}
      <div className='mt-6 grid gap-8 md:grid-cols-[1fr_16rem]'>
        <div className='rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
          {wizard.step > 1 && (
            <button
              type='button'
              data-back
              onClick={wizard.goBack}
              className='text-muted-foreground mb-4 text-sm underline'
            >
              ← Back
            </button>
          )}
          <h2 className='text-brand-ink font-bold text-2xl'>{QUESTIONS[wizard.step - 1]}</h2>

          {wizard.step === 1 && (
            <section data-step='1' className='mt-5 grid gap-3 sm:grid-cols-2'>
              {wizard.branchChoices.map((b) => (
                <ChoiceCard
                  key={b.id}
                  selected={wizard.branchId === b.id}
                  onSelect={() => {
                    wizard.setBranch(b.id);
                    wizard.goNext();
                  }}
                >
                  <span className='text-brand-ink block font-semibold'>{b.name}</span>
                  <span className='text-muted-foreground mt-1 block text-sm'>{b.address}</span>
                  <span className='mt-2 block'>
                    <WalkInBadge acceptsWalkIns={b.acceptsWalkIns} />
                  </span>
                </ChoiceCard>
              ))}
            </section>
          )}

          {wizard.step === 2 && (
            <section data-step='2' className='mt-5 space-y-6'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>Service Packages</p>
                <div className='mt-2 grid gap-3 sm:grid-cols-2'>
                  {packages.map((p) => (
                    <ChoiceCard
                      key={p.id}
                      offeringId={p.id}
                      selected={
                        wizard.offering?.kind === 'package' && wizard.offering.id === p.id
                      }
                      onSelect={() => wizard.chooseOffering({ kind: 'package', id: p.id })}
                    >
                      <span className='text-brand-ink block font-semibold'>{p.name}</span>
                      <span className='mt-1 block font-semibold'>{peso(p.priceCents)}</span>
                    </ChoiceCard>
                  ))}
                </div>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Studio Services {wizard.branchId ? `at ${wizard.branchName}` : ''}
                </p>
                {!wizard.branchId ? (
                  <p className='text-muted-foreground mt-2 text-sm'>
                    Choose a branch first — services are bookable per branch.
                  </p>
                ) : (
                  <div className='mt-2 grid gap-3 sm:grid-cols-2'>
                    {services
                      .filter(
                        (s) =>
                          wizard.branchId !== null && s.bookableBranchIds.includes(wizard.branchId)
                      )
                      .map((s) => (
                        <ChoiceCard
                          key={s.id}
                          offeringId={s.id}
                          selected={
                            wizard.offering?.kind === 'service' && wizard.offering.id === s.id
                          }
                          onSelect={() => wizard.chooseOffering({ kind: 'service', id: s.id })}
                        >
                          <span className='text-brand-ink block font-semibold'>{s.name}</span>
                          <span className='mt-1 block font-semibold'>{peso(s.priceCents)}</span>
                        </ChoiceCard>
                      ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {wizard.step === 3 && (
            <section data-step='3' className='mt-5'>
              {wizard.applicableAddons.length === 0 ? (
                <p className='text-muted-foreground'>No add-ons apply to this booking.</p>
              ) : (
                <div className='grid gap-3 sm:grid-cols-2'>
                  {wizard.applicableAddons.map((a) => (
                    <ChoiceCard
                      key={a.id}
                      selected={wizard.addonIds.includes(a.id)}
                      onSelect={() => wizard.toggleAddon(a.id)}
                    >
                      <span className='text-brand-ink block font-semibold'>{a.name}</span>
                      <span className='text-muted-foreground mt-1 block text-sm'>
                        {a.description}
                      </span>
                      <span className='mt-1 block font-medium'>{peso(a.priceCents)}</span>
                    </ChoiceCard>
                  ))}
                </div>
              )}
              {/* Exactly one of these renders (M2 behavior) — both must stay
                  DIRECT children of the section: the e2e clicks
                  `section[data-step='3'] > button` for Continue. */}
              {wizard.addonIds.length > 0 ? (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className={cn(
                    buttonVariants(),
                    'focus-visible:ring-brand-focus-ring mt-4 focus-visible:ring-3'
                  )}
                >
                  Continue · {peso(wizard.totalCents)}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className='text-muted-foreground mt-4 text-sm underline'
                >
                  Skip — no add-ons
                </button>
              )}
            </section>
          )}

          {wizard.step === 4 && (
            <section data-step='4' className='mt-5'>
              <Input
                type='date'
                value={wizard.date}
                min={phDateInputMin(new Date())}
                onChange={(e) => wizard.setDate(e.target.value)}
              />
              <HourChipGrid value={wizard.time} onSelect={wizard.setTime} />
              <p className='text-muted-foreground mt-2 text-xs'>
                All times are Philippine time (PHT, UTC+8). Bookings in the past are rejected.
              </p>
              {wizard.isPast && (
                <p data-past-hint className='text-destructive mt-2 text-sm'>
                  That time has already passed — pick a later slot.
                </p>
              )}
              {/* DIRECT child of the section — the scripts click
                  `section[data-step='4'] > button`; the chips live inside
                  HourChipGrid's wrapping div. */}
              <button
                type='button'
                disabled={wizard.scheduledAt === null}
                onClick={wizard.goNext}
                className={cn(
                  buttonVariants(),
                  'focus-visible:ring-brand-focus-ring mt-4 focus-visible:ring-3'
                )}
              >
                Continue
              </button>
            </section>
          )}

          {wizard.step === 5 && (
            <section data-step='5' className='mt-5 grid gap-3'>
              {/* Contact step (#58): plain primitives + inline Zod errors, no
                  bespoke wrapper. Labels are new copy (veto-flagged);
                  placeholders are CDP-frozen byte-for-byte. */}
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-name'>Full name</Label>
                <Input
                  id='contact-name'
                  placeholder='Full name'
                  value={wizard.name}
                  aria-invalid={touched.name && contactErrors.name !== undefined}
                  aria-describedby={
                    touched.name && contactErrors.name ? 'contact-name-error' : undefined
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  onChange={(e) => wizard.setName(e.target.value)}
                />
                {touched.name && contactErrors.name && (
                  <p id='contact-name-error' className='text-destructive text-sm'>
                    {contactErrors.name}
                  </p>
                )}
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-email'>Email</Label>
                <Input
                  id='contact-email'
                  type='email'
                  placeholder='Email'
                  value={wizard.email}
                  aria-invalid={touched.email && contactErrors.email !== undefined}
                  aria-describedby={
                    touched.email && contactErrors.email ? 'contact-email-error' : undefined
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  onChange={(e) => wizard.setEmail(e.target.value)}
                />
                {touched.email && contactErrors.email && (
                  <p id='contact-email-error' className='text-destructive text-sm'>
                    {contactErrors.email}
                  </p>
                )}
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-phone'>Phone</Label>
                <Input
                  id='contact-phone'
                  placeholder='Phone (+63…)'
                  value={wizard.phone}
                  aria-invalid={touched.phone && contactErrors.phone !== undefined}
                  aria-describedby={
                    touched.phone && contactErrors.phone ? 'contact-phone-error' : undefined
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  onChange={(e) => wizard.setPhone(e.target.value)}
                />
                {touched.phone && contactErrors.phone && (
                  <p id='contact-phone-error' className='text-destructive text-sm'>
                    {contactErrors.phone}
                  </p>
                )}
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-notes'>Notes (optional)</Label>
                <Textarea
                  id='contact-notes'
                  placeholder='Notes (optional — tell the studio anything useful)'
                  value={wizard.notes}
                  onChange={(e) => wizard.setNotes(e.target.value)}
                />
              </div>
              {rejection && (
                <RejectionCard reason={rejection.reason} apiMessage={rejection.apiMessage} />
              )}
              <button
                type='button'
                disabled={!canConfirm || wizard.submitting}
                onClick={handleSubmit}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'focus-visible:ring-brand-focus-ring mt-1 focus-visible:ring-3'
                )}
              >
                {wizard.submitting ? 'Booking…' : `Confirm booking · ${peso(wizard.totalCents)}`}
              </button>
            </section>
          )}
        </div>

        <SummaryRail wizard={wizard} />
      </div>
    </div>
  );
}
```

Structural notes the typecheck cannot catch (each maps to a script selector — Task 5 proves them live): `TIME_SLOTS` is no longer imported here (the grid owns it); the step-3 Continue/Skip pair stays exclusively rendered and directly under the section; the step-4 Continue stays a direct section child; the step-5 confirm remains the section's only button; `data-back` renders only at step > 1, outside the sections.

- [ ] **Step 2: Format + typecheck + tests + build**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing build
```

Expected: all green — 62/62 tests (no lib change), typecheck over the new component wiring, SSR build over the restyle.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/routes/book.tsx
git commit -m "feat(landing): the /book wizard onto the #58 components, zero flow changes (#99)

White step card on the wash; StepProgress over the shared progress primitive;
ChoiceCard/HourChipGrid for the select steps; WalkInBadge collapses the third
pill; contact step on plain Input/Label/Textarea + inline Zod errors
(blur-gated, M2 gate predicate unchanged); every data-* seam and frozen copy
literal verbatim."
```

---

### Task 4: `booking.$id.tsx` — ConfirmationCard + the not-found on the system

**Files:**
- Modify: `apps/landing/src/routes/booking.$id.tsx` (component + notFoundComponent rewrite; loader unchanged)

**Interfaces:**
- Consumes: `ConfirmationCard` (Task 2), `branchNameFor` / `offeringNameFor` (names join at the route), `buttonVariants`, `Link`, `cn`.
- Produces: the confirmation page as a thin route over the extracted card, on the page rhythm; the not-found wearing the system card (the #98 package-not-found pattern, literals byte-identical).

**Not here:** no loader/query/404-mapping edits; no copy changes to the card (Task 2 pinned it frozen); the not-found's supporting sentence is the ticket's one new string (veto-flagged).

- [ ] **Step 1: Rewrite the file**

Replace the ENTIRE file `apps/landing/src/routes/booking.$id.tsx` with exactly:

```tsx
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ConfirmationCard } from '../components/booking/confirmation-card';
import { toNotFoundError } from '../lib/api-404';
import { branchNameFor, offeringNameFor } from '../lib/booking-read';
import {
  appointmentQueries,
  branchQueries,
  servicePackageQueries,
  studioServiceQueries,
} from '../lib/queries';

export const Route = createFileRoute('/booking/$id')({
  loader: async ({ params, context: { queryClient } }) => {
    // The appointment read gates the 404; the catalog reads feed the name
    // joins. Only the appointment's 404 maps to not-found — the catalog
    // reads are lists with no 404 path, so their failures pass through to
    // the error boundary untouched.
    const catalogPromise = Promise.all([
      queryClient.ensureQueryData(branchQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
    ]);
    try {
      const record = await queryClient.ensureQueryData(appointmentQueries.byId(params.id));
      await catalogPromise;
      return record;
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  component: BookingConfirmation,
  // Unknown id → uniform not-found (copy veto-flagged at PR review). The
  // plain anchor's dependency-free posture ends here — the state wears the
  // system card like the package not-found (#98 precedent); the literals
  // are CDP-asserted and byte-identical.
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl px-6'>
      <div className='mt-16 flex flex-col items-center gap-4 rounded-xl border border-brand-gray-cool bg-card p-10 text-center shadow-sm'>
        <h1 className='text-brand-ink font-semibold text-2xl'>Booking not found.</h1>
        <p className='text-muted-text text-sm'>
          This booking doesn't exist or is no longer available.
        </p>
        <Link
          to='/book'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
          )}
        >
          Start a new booking
        </Link>
      </div>
    </div>
  ),
});

function BookingConfirmation() {
  const record = Route.useLoaderData();
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());

  return (
    <div className='mx-auto max-w-5xl px-6 py-12'>
      <ConfirmationCard
        record={record}
        branchName={branchNameFor(record, branches)}
        offeringName={offeringNameFor(record, { packages, services })}
      />
    </div>
  );
}
```

(TanStack `Link` renders `href='/book'` — the CDP not-found check matches on the rendered text anyway, and the route is registered.)

- [ ] **Step 2: Format + typecheck + tests + build + commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing build
git add apps/landing/src/routes/booking.\$id.tsx
git commit -m "feat(landing): /booking/:id onto ConfirmationCard + the not-found on the system (#99)

Snapshot card extracted (#58) and set on the white card; not-found joins the
#98 package-not-found pattern (literals byte-identical, supporting sentence
veto-flagged)."
```

---

### Task 5: Verification — CDP read-only + the mutating e2e + gates (controller-run, evidence-only)

**Files:**
- No source files created. Fixes, if a gate fails, land in the file the failure names — then the gate re-runs.
- Expected outcome: NO-COMMIT (all green).

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: the evidence pack — the booking-wizard CDP scenario read-only over the restyled flow (15 checks), the two sibling regressions, the MUTATING e2e (7 checks — the AC's "not broken"), the static seam/island gates, the full repo gate.

**Not here:** no script or test edits ever — a FAIL means a surface broke a seam; fix the surface. The e2e writes two real rows to the live Supabase dev stack (by design since M2 — tiny volume, studio reconciles); record both booking ids in the evidence; the M2 close-out precedent (delete after evidence) is the controller's call, noted either way.

- [ ] **Step 1: Env + browser readiness (controller)**

Copy the gitignored env files from the main checkout (never commit them): `apps/landing/.env.local` (`API_URL`) and `apps/api/.dev.vars`. Resolve the headless Chrome binary per the #97/#98 precedent — `google-chrome` if present, else the Playwright headless shell (`find ~/.cache/ms-playwright -name chrome-headless-shell -type f | head -1`, nested per-version dir — glob the cache root, never a remembered path). Verify port 9222 is not already held (`ss -tlnp`).

- [ ] **Step 2: Boot the three-terminal stack**

```bash
pnpm --filter @sevendays/api dev      # terminal 1 — port 8787, seeded catalog
pnpm --filter @sevendays/landing dev  # terminal 2 — port 3000; confirm from its log
<chrome-binary> --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify-99 about:blank  # terminal 3
```

Sandbox/WSL fallbacks per the SDD channel quirks: servers run as background tasks; grep each log for its actual port before probing.

- [ ] **Step 3: The read-only regressions**

```bash
node apps/landing/scripts/verify/booking-wizard.mjs   # THE ticket's scenario — 15/15
node apps/landing/scripts/verify/content-pages.mjs    # sibling regression — 16/16
node apps/landing/scripts/verify/packages-pages.mjs   # sibling regression — 12/12
```

Expected: every check `PASS`, exit 0 — the component extraction moved no seam. Any FAIL: the surface broke a seam — fix the surface, never the script; re-run. (The likely failure shapes are all designed against: a button before the first choice card, the Continue buttons wrapped off the section's direct children, a placeholder rewrite, a `data-offering` drop, or a rail/rejection text change.)

- [ ] **Step 4: The mutating e2e (AC: "the mutating e2e is not broken")**

```bash
node apps/landing/scripts/verify/booking-e2e.mjs      # 7/7 — writes 2 real rows
```

Expected: both bookings redirect, snapshot, and read back green — the `section[data-step='3'] > button` Continue, the step-5 `textarea`, and the confirmation literals all survive. Record the two booking ids from the `BOOKINGS` tail in the evidence file.

- [ ] **Step 5: The static gates**

```bash
grep -rn 'text-neutral-\|bg-neutral-\|ring-neutral-' apps/landing/src/routes apps/landing/src/components --include='*.tsx' | grep -v prototype || echo "NO ISLAND COLORS IN SURFACES — OK"
grep -rn 'rounded-full border px-2 py-0.5' apps/landing/src --include='*.tsx' | grep -v prototype || echo "NO HAND-ROLLED PILLS — OK"
grep -c '<section data-step=' apps/landing/src/routes/book.tsx
grep -rn "data-offering" apps/landing/src/components/booking/choice-card.tsx
grep -n "QUESTIONS\[wizard.step - 1\]" apps/landing/src/routes/book.tsx
```

Expected: the island grep prints `NO ISLAND COLORS IN SURFACES — OK` (book.tsx was the last holder — the fallback MUST fire now); the pill grep prints `NO HAND-ROLLED PILLS — OK` (the third pill died onto `WalkInBadge`); `data-step` count 5; the choice-card `data-offering` line present; the QUESTIONS line present.

- [ ] **Step 6: The repo gate**

```bash
pnpm check
```

Expected: green across all workspaces.

- [ ] **Step 7: Evidence file + teardown**

Write `.superpowers/sdd/2026-09-20-99-booking-flow-componentized/task-5-evidence.md` (per-gate results, check counts 15/16/12/7, the two booking ids, any fallback that fired). Kill Chrome + both dev servers. If (and only if) a gate forced a fix: commit it under `fix(landing): …` with the gate named; otherwise no commit.

---

### Task 6: Docs, PR, handover

**Files:**
- Modify: `docs/progress.md` (header line + What-Exists entry), `docs/plan.md` (tick line 101), this plan file (✅ ticks)
- Refresh: `graphify-out/`

**Interfaces:**
- Consumes: Tasks 1–5 incl. the evidence pack.
- Produces: pushed branch + open PR closing #99; the owner merges (per-surface screenshots on main ride the PR — the flow exists only on main; v1 is booking-free).

**Not here:** `docs/plan.md` lines 100/103 (siblings — 100 is #98's, already ticked; 103 is #101's, stays unticked until close-out); the v1-picks ledger (the triager's at merge — this ticket's paths don't exist on `v1`, the skip-class row is mechanical); `/prototype-tokens` (#101).

- [ ] **Step 1: The progress.md entries**

Prepend to the `Last updated` header line: `2026-09-20 (#99 M3 ticket 05 — booking wizard componentized, zero flow changes: ChoiceCard / HourChipGrid + HourChip / StepProgress / ConfirmationCard extracted, SummaryRail + RejectionCard on the system, contact gate restated as contactSchema (predicate unchanged), third pill collapsed onto WalkInBadge, white-card step surface + rejection card on white — PR <NN>.. Prior 2026-09-16: ` (keeping the existing #111 entry as the new Prior). Add the What-Exists bullet after the #111 remediation bullet (pinned structure: what landed, the contact-gate equivalence ruling, the aria-pressed adjudication, the not-found sentence + contact copy veto-flags, CDP + e2e + check evidence).

- [ ] **Step 2: Tick the roadmap checkbox**

`docs/plan.md` line 101 `- [ ] Booking flow componentized onto the #58 vocabulary …` → `- [✅]` with a dated annotation naming the landed facts (the four extracts, rail/rejection restyles, zero flow changes, seams verbatim, CDP 15/15 + e2e 7/7). Verify the line number first: `grep -n "Booking flow componentized" docs/plan.md`.

- [ ] **Step 3: Tick this plan + graphify + full check**

Tick every completed step (`- [✅]`), then:

```bash
graphify update .
pnpm check
```

- [ ] **Step 4: Commit, push, open the PR**

```bash
git add docs/ graphify-out
git commit -m "docs: #99 close-out — progress record, roadmap tick, plan ticks, graph refresh"
git push -u origin feat/99-booking-flow
gh pr create --base main --head feat/99-booking-flow \
  --title "feat(landing): #99 M3 ticket 05 — booking wizard componentized, zero flow changes" \
  --body-file <staged body file>
```

Body sections: Summary · AC→evidence mapping (the ticket's 6 ACs) · screenshots of `/book` (each step) + `/booking/:id` on main · execution rulings (aria-pressed toggle-button adjudication, contact labels + error copy + not-found sentence as veto-flagged agent copy, max-w-5xl rhythm adoption, contact-gate-as-schema with equivalence suite, white-card step surface satisfying the destructive-placement rule) · verification (CDP 15/15 + 16/16 + 12/12, e2e 7/7 with the two booking ids, tests 62/62, `pnpm check` green, island-grep OK) · deferred minors · scope fence · Closes #99 · standing v1-picks note (booking paths absent on v1 — triager's row at merge).

- [ ] **Step 5: The completion report — then STOP**

Evidence pack + AC mapping + state + flags to the owner. Then STOP.

---

## Self-Review

- **Spec coverage (ticket ACs):** AC 1 (the four components exist per #58; StepProgress composes the shared `progress`) → Task 2 Steps 1–4 (Base UI value semantics grep-verified at `@base-ui/react@1.8.0`). AC 2 (SummaryRail/RejectionCard restyled; rejection on white) → Task 2 Step 5 + the white-card step surface (Task 3). AC 3 (contact step: plain primitives + inline Zod errors, no wrapper) → Tasks 1 + 3 Step 1 (blur-gated display; `contactSchema` gate predicate-identical, pinned by 6 tests). AC 4 (zero flow changes) → Global Constraints frozen list + Task 3's verbatim `QUESTIONS`/`md:grid-cols-[1fr_16rem]`/gate predicates/back behavior/progress position. AC 5 (seams verbatim; CDP read-only passes; mutating e2e unbroken) → Task 5 Steps 3–4, with the structural traps (direct-child Continues, first-button choice cards, exclusive step-3 render, step-5-only-button confirm, byte-frozen placeholders) designed into Tasks 2–3 and named in the code comments. AC 6 (lib-seam tests pass unchanged + `pnpm check`) → the six existing test files byte-untouched (new suite is a 7th file; 56 → 62), Tasks 3–6 gates.
- **Sibling fences:** #98's surfaces, chrome, and catalog cards untouched; #101's gallery/prototype untouched; `packages/ui` untouched (two-tier rule); landing-local components + the two booking routes + one lib block + docs only.
- **Placeholder scan:** every authored/rewritten file is pinned verbatim in full; `<record: …>` directives name their source greps; the only execution-authored prose is Task 6's progress bullet and PR body, both structure-pinned.
- **Type/signature consistency:** `ChoiceCard({ selected, onSelect, offeringId?, children })` matches every Task 3 call site (branch: no offeringId; offering: offeringId + selected predicates preserved from the old inline JSX; add-ons: includes-check); `HourChipGrid({ value, onSelect })` wired to `wizard.setTime`; `StepProgress({ step, className? })` wired at the bar's old position; `ConfirmationCard({ record, branchName, offeringName })` matches Task 4's joins; `contactSchema`/`contactFieldErrors` consumed exactly as Task 1 exports them; `SummaryRail`/`RejectionCard` prop contracts unchanged (className-only edits).
- **Claim strength vs. proof:** the Base UI progress value semantics are source-verified (ProgressRoot.d.ts min/max defaults + ProgressIndicator.mjs width-%), pinned with the fix path (re-read the d.ts if the installed version moved); the CDP/e2e selector inventory is re-derived from the committed scripts in this pass, not from memory; the test baseline (6 files / 56 tests) is a live run recorded 2026-09-20; the badge `outline` variant and `WalkInBadge` wrapper are verified live from the landed #98 files; the token list is grep-verified against `packages/ui/src/tokens.css`.



