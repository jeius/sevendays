# Plan: #333 — Service covers: landing consumes coverImageUrl — stand-ins demote to fallback

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every landing surface where studio services render prefers the real cover: the home `ServiceImageCard` and the `/services` `ServiceCard` render `service.coverImageUrl` first, with today's name-matched stand-in photos demoted to the **documented no-cover fallback** (owner ruling — the home stays photo-led with zero admin work: every service always renders a photo). One pure precedence helper carries the rule, pinned in the landing lib-seam suite. Card compositions are untouched — the photo-IS-the-card treatment (two-layer ink wash + bottom scrim, the measured white-on-ink AA pairs) rides identically for covers and fallbacks; the photo stays decorative (`alt=''` + aria-hidden) and lazy-loaded. The booking flow renders no imagery (spec-pinned, verified live in pre-flight) — nothing to consume there.

**Architecture:** Landing-only, zero api/types/admin/api-client edits — #331's spine already delivers `coverImageUrl` end-to-end (the API resolves the absolute URL at read time; the api-client Zod-parses the canonical `studioServiceWithBranchesSchema`; the landing's `getStudioServices` server fn + `studioServiceQueries.all()` cache it; both cards' props are already typed `StudioServiceWithBranches`, which carries `coverImageUrl: string | null`). The work is one lib seam + two src swaps: (1) `apps/landing/src/lib/service-image.ts` lands the stand-in map `serviceBackground` MOVED VERBATIM from `home-cards.tsx` (the five-way matching body byte-identical — only its role demotes) beside the new precedence helper `serviceImage(service)` = `service.coverImageUrl ?? serviceBackground(service.name)`, with the four seam pins beside them; (2) `home-cards.tsx` deletes its map copy (it survives Task 1 untouched and dies in Task 2 with its last consumer — the retire-with-last-caller law, the #332 builders' precedent) and both cards swap their img `src` to the helper, their comments documenting the demotion. No visual decision rides anywhere: the img element's tints, scrim, `alt`, and `loading` attributes are byte-untouched — a cover and a fallback render through the identical treatment.

**Tech Stack:** landing-only (TanStack Start + Tailwind v4), zero new dependencies, zero `packages/ui` changes, zero api/types/admin changes, vitest lib-seam pins (plain-node — the house rule: no component/DOM tests; the rendered behavior rides #334's teaser walk).

**Spec:** [GitHub issue #333](https://github.com/jeius/sevendays/issues/333), authoritatively settled by its parent spec — [issue #330](https://github.com/jeius/sevendays/issues/330), repo copy `docs/specs/2026-11-19-services-cover-photos-spec.md` (§6 Landing consumption; §7 Test pins, the landing bullet). The rendered-variants gate is the sibling ticket #334 (teaser walk + owner reaction), NOT this plan.

## Worktree law (owner-ruled 2026-11-21): this plan continues on the shared spec branch

**Execution site:** `.worktrees/service-covers`, branch **`service-covers`** — the #331 and #332 cycles landed here (tip **`69cfeaf`** = #332's post-flight graphify commit), the owner ruled to hold the branch locally and stack ticket after ticket. **BASE for this plan's first task = `69cfeaf`.** No push/PR/rebase happens until the owner calls for it; #331's and #332's PRs, closes, and v1 picks are deferred with the branch. After THIS ticket, #334 (the teaser owner-reaction pass) continues on the same branch.

**Controller pre-flight (2026-11-21, HEAD 69cfeaf):** every before-block below was read byte-exact at the cited anchors today; the landing suite was live-run **17 files / 134 tests passed** and `pnpm --filter @sevendays/landing typecheck` green; the booking-flow no-imagery fact was re-verified live (`grep -rn "<img\|background-image\|serviceBackground" apps/landing/src/routes/book.tsx apps/landing/src/components/booking/` → **0 matches**); the five stand-in photos exist under `apps/landing/public/photos/` (`service-recovery.jpg`, `service-framing.jpg`, `service-id.jpg`, `service-printing.jpg`, `cover-portrait.jpg`); the four seeded service names were read from the seeder at `packages/db/scripts/catalog.ts:553–568` (`Photo Recovery`, `Tarpaulin & Bulletin Printing`, `Portraits & ID Photo`, `Picture Framing`); `packages/types` dist carries `coverImageUrl` (the worktree's #331-built dist); the stand-in photo paths are referenced nowhere in landing src except the map itself.

## Scope fences

**In scope (landing app only):** `apps/landing/src/lib/service-image.ts` (NEW, + its test), `apps/landing/src/components/home-cards.tsx`, `apps/landing/src/components/service-card.tsx`, `docs/progress.md`, `AGENTS.md` (landing floor), graphify.

**NOT here (siblings / out of scope):**

- **#334 — the teaser walk + owner reaction** — the #94 rendered-variants gate for the whole feature. Nothing here is "done done" until it records.
- **The card treatment** — tints, scrim, `alt=''` + `aria-hidden`, `loading='lazy'`, hover transforms: byte-untouched in both files. A cover and a fallback render through the identical markup; there is no cover-specific styling in this plan and none may be invented.
- **The stand-in map's matching logic** — the five `includes` branches move verbatim; no re-tuning, no new stand-ins, no default change. Only the map's ROLE demotes (owner ruling) and its HOME moves (lib, for the seam).
- **The booking flow** — renders no imagery today (verified live, 0 matches across `book.tsx` + `components/booking/`); the spec pins "if booking imagery is ever added it consumes the cover by this law" — a fence for the future, not work here.
- **The api/types/admin/api-client surfaces** — all live since #331/#332 (`69cfeaf`). Zero edits; the landing's data chain (`getStudioServices` → api-client parse → react-query → card props) already carries `coverImageUrl`.
- **The e2e visual baselines** (`e2e/visual/`, ADR-0022) — no catalog row stores a cover (the column is born-null, #331), so every card still renders its stand-in after this ticket: zero visual delta by construction. E2E never runs under `pnpm check` anyway; no baseline edit rides here.
- **No v1 pick/ledger work in this branch** — post-merge, main-only per `docs/agents/v1-picks.md`.
- **No ADR** — the consumption law is the spec's §6 (a named owner ruling), the read shape the branchReadSchema precedent; no new mechanics.
- **No `docs/plan.md` edit** — no milestone box rides this ticket.

## Owner rulings + skill audit

**Owner rulings carried from the spec (charting record, map #324):** the stand-ins STAY as the documented no-cover fallback (skill guidance prefers real imagery everywhere; the owner chose the zero-admin-work fallback — the home stays photo-led either way); the card compositions are untouched (a real cover rides the exact same tints); booking imagery is out (none exists). These override any skill recommendation to the contrary — recorded here per the #111 discipline.

**UI skill posture (the AGENTS.md rule, honestly applied):** this ticket names the spec's set (`prototype` + `ui-ux-pro-max`) but loads nothing at execution time — the spec's draft-time audit already ruled both surfaces (they are established, owner-ruled compositions; the spec's §UI/UX audit explicitly finds "no **new** composition exists — both surfaces are established… this spec only extends them"), and this plan makes ZERO styling or composition decisions: the only rendered change is the img `src` expression. The decorative-image law the audit pinned (`alt=''` + aria-hidden behind text, bounded `object-cover`) is already these cards' law and stays byte-identical. The rendered-variants owner-reaction step is #334's, on the deployed teaser, after this lands.

## Global Constraints

- **Verbatim values this plan introduces (use exactly; do not paraphrase):**
  - The lib file path: `apps/landing/src/lib/service-image.ts`; its exports: `serviceBackground(name: string): string` (the moved map — name and body unchanged) and `serviceImage(service: Pick<StudioServiceWithBranches, 'name' | 'coverImageUrl'>): string`.
  - The precedence law's whole body: `return service.coverImageUrl ?? serviceBackground(service.name);`
  - The four pin titles exactly as Task 1 Step 1 writes them.
  - The seeded names in pins (from `packages/db/scripts/catalog.ts:553–568`): `Photo Recovery`, `Tarpaulin & Bulletin Printing`, `Portraits & ID Photo`, `Picture Framing`; the unseeded default-case name the pin uses: `Something Not Seeded`.
  - The five photo paths (files verified in `apps/landing/public/photos/`): `/photos/service-recovery.jpg`, `/photos/service-framing.jpg`, `/photos/service-id.jpg`, `/photos/service-printing.jpg`, `/photos/cover-portrait.jpg`.
- **BASE:** branch `service-covers` @ `69cfeaf` (the #332 tip). The plan commits on the branch BEFORE the first dispatch.
- **Dist consumers:** landing typecheck consumes `packages/types` dist — already current from #331 (verified in pre-flight); no rebuild needed (types don't change in this plan).
- **Test DB:** the landing suite is plain-node lib-seam (no DB) — no `TEST_DATABASE_URL` needed for the per-task gates. The final `pnpm check` (Task 3) still prefixes `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test` for the api leg (container `sevendays-test-db-5433`, a STANDALONE container — `docker start sevendays-test-db-5433` if down, never compose).
- **Floors (live-confirmed 2026-11-21 @ 69cfeaf):** landing **17 files / 134 tests** → **18 files / 138 tests** after Task 1 (+4 pins), unchanged by Tasks 2–3. admin **34 files / 364 tests**, api **482 passed + 3 skipped** (34 files; AGENTS.md's companion leg reads `33 passed + 1 skipped (34)` — both unmoved), types **197** (18 files), db **4 files** (22 passed + 8 skipped; 30 passed under TEST_DATABASE_URL), api-client **45** (5 files) — NONE may move. A differing count means drift: stop and reconcile.
- **Per-task gates:** `pnpm --filter @sevendays/landing test -- --run` AND `pnpm --filter @sevendays/landing typecheck` — both green before each task's commit. Final gate: `pnpm fix` then `pnpm check` green at the repo root (with the TEST_DATABASE_URL prefix above).
- **Filtered-evidence command:** plan-filtered `pnpm test -- --run <files>` runs the WHOLE workspace suite in this repo (the #331 lesson); for per-file RED/GREEN evidence use `pnpm exec vitest run <files>` from the repo root (pinned for the executor since #332).
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #333. Prefixes: `feat(landing):` for the code tasks, `docs:` / `chore(graphify):` for Task 3.
- **The name census law (#332's lesson):** `serviceBackground` remains a live, documented name after this plan (the lib export + the component comments name it). The census in Task 2 Step 3 counts CALL SITES, not mentions — every file naming it in a comment is bookkept there.

---

## Task 1 — the seam: service-image lib (map moved verbatim + the precedence helper, +4 pins, TDD)

The stand-in map leaves `home-cards.tsx` for its lib home beside the new precedence helper — the five-way matching body byte-identical, only the role demoted (owner ruling) and the home moved (the landing lib-seam law: pure logic lives in `src/lib/` beside its pins — the mosaic/spanFor precedent). The components are untouched in this task: `home-cards.tsx` keeps its own map copy through Task 1 (the app is green with the duplicate — the map dies in Task 2 with its last consumer, the #332 builders'-retirement precedent).

**Files:**
- Create (test-first): `apps/landing/src/lib/service-image.test.ts` (+4 pins)
- Create: `apps/landing/src/lib/service-image.ts` (the moved map + the helper)

**Interfaces:**
- Consumes: `StudioServiceWithBranches` from `@sevendays/types` (type-only; `coverImageUrl: string | null` live since #331).
- Produces (Task 2 consumes exactly these): `serviceBackground(name: string): string` and `serviceImage(service: Pick<StudioServiceWithBranches, 'name' | 'coverImageUrl'>): string`, both exported from `apps/landing/src/lib/service-image.ts`.

- [ ] **Step 1: Write the four failing pins.** Create `apps/landing/src/lib/service-image.test.ts` with EXACTLY this content:

```ts
// The service-card photography precedence (#333, spec #330 §6): a stored
// cover wins; the name-matched stand-ins are the DOCUMENTED NO-COVER
// FALLBACK (owner ruling at charting, map #324 — the home stays
// photo-led with zero admin work). Pinned so a future "swap the
// stand-ins" or "change the precedence" edit moves the seam and the
// suite together.
import type { StudioServiceWithBranches } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { serviceImage } from './service-image';

// The wire only yields `string | null` (the Zod-parsed read); the widened
// param exists so the absent-field pin can name `undefined` explicitly —
// that pin is the helper's own defensive ?? contract, not a wire state.
const s = (name: string, coverImageUrl: string | null | undefined = null) =>
  ({ name, coverImageUrl }) as Pick<StudioServiceWithBranches, 'name' | 'coverImageUrl'>;

describe('serviceImage (#333 — cover-first precedence, the documented fallback)', () => {
  it('a stored cover wins — the resolved URL renders verbatim', () => {
    expect(
      serviceImage(s('Photo Recovery', 'https://pub-test.r2.dev/covers/aaaa.jpg'))
    ).toBe('https://pub-test.r2.dev/covers/aaaa.jpg');
  });

  it('a null cover falls back to the name-matched stand-in', () => {
    expect(serviceImage(s('Photo Recovery'))).toBe('/photos/service-recovery.jpg');
    expect(serviceImage(s('Picture Framing'))).toBe('/photos/service-framing.jpg');
  });

  it('an absent cover falls back too — ?? treats undefined like null (the defensive pin)', () => {
    expect(serviceImage(s('Picture Framing', undefined))).toBe('/photos/service-framing.jpg');
  });

  it('every documented stand-in still resolves — the four seeded names + the default', () => {
    expect(serviceImage(s('Photo Recovery'))).toBe('/photos/service-recovery.jpg');
    expect(serviceImage(s('Tarpaulin & Bulletin Printing'))).toBe('/photos/service-printing.jpg');
    expect(serviceImage(s('Portraits & ID Photo'))).toBe('/photos/service-id.jpg');
    expect(serviceImage(s('Picture Framing'))).toBe('/photos/service-framing.jpg');
    expect(serviceImage(s('Something Not Seeded'))).toBe('/photos/cover-portrait.jpg');
  });
});
```

- [ ] **Step 2: Run the pins to verify the RED state (filtered — see Global Constraints).**

Run: `pnpm exec vitest run apps/landing/src/lib/service-image.test.ts`
Expected: the file FAILS to collect — vitest reports a resolve error (`Cannot find module './service-image'` or the equivalent `Failed to resolve import`) — all four pins fail on the missing module, not on assertions. That module-missing RED is the TDD gate. Record it honestly.

- [ ] **Step 3: Land the lib file.** Create `apps/landing/src/lib/service-image.ts` with EXACTLY this content:

```ts
import type { StudioServiceWithBranches } from '@sevendays/types';

// The studio-service card photography (#333, spec #330 §6). The map is the
// M2 stand-in set moved VERBATIM from home-cards.tsx — the body unchanged,
// the role demoted: these name-matched photos are the DOCUMENTED NO-COVER
// FALLBACK (owner ruling at charting, map #324 — the home stays photo-led
// with zero admin work: every service always renders a photo).
export function serviceBackground(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('recover')) return '/photos/service-recovery.jpg';
  if (n.includes('fram')) return '/photos/service-framing.jpg';
  if (n.includes('id') || n.includes('portrait')) return '/photos/service-id.jpg';
  if (n.includes('print') || n.includes('tarp')) return '/photos/service-printing.jpg';
  return '/photos/cover-portrait.jpg';
}

// The one precedence helper both service cards consume: the resolved cover
// URL when the API answered one (#331's spine), else the stand-in. `??` —
// a null cover (born-null rows) and an absent field both fall back; the
// seam pins the law. The card treatment is identical either way (the
// photo IS the card — tints, scrim, alt='', lazy).
export function serviceImage(
  service: Pick<StudioServiceWithBranches, 'name' | 'coverImageUrl'>
): string {
  return service.coverImageUrl ?? serviceBackground(service.name);
}
```

The function is `home-cards.tsx:14–21` copied byte-for-byte — do NOT retype from memory; copy from the before-block quoted in Task 2 Step 1(a) (the two must stay identical until Task 2 deletes the component copy).

- [ ] **Step 4: GREEN + gates.**

Run: `pnpm exec vitest run apps/landing/src/lib/service-image.test.ts` → **4 passed**.
Run: `pnpm --filter @sevendays/landing test -- --run` → **18 files / 138 tests passed** (the floor moves 134 → 138 here; every other count unchanged from the pre-flight).
Run: `pnpm --filter @sevendays/landing typecheck` → green (the components still carry their own map; the new lib file is self-contained).

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/lib/service-image.ts apps/landing/src/lib/service-image.test.ts
git commit -m "feat(landing): #333 — the service-image seam: cover-first precedence + the stand-in map's lib home"
```

**Not here:** no component edit (both cards still render `serviceBackground(service.name)` until Task 2); no change to the map's matching logic; no booking-flow edit.

---

## Task 2 — the consumption: both cards swap to the helper; the component map copy retires (+0 pins, the composition port)

The two img `src` expressions swap to `serviceImage(service)` and `home-cards.tsx` deletes its map copy — the duplicate from Task 1 dies with its last consumer. ZERO rendered attributes change besides the `src` expression itself: the className strings, `alt=''`, `aria-hidden='true'`, and `loading='lazy'` lines are copied verbatim into the after-blocks — if a diff shows any of them moving, stop, that is not this plan.

**Files:**
- Modify: `apps/landing/src/components/home-cards.tsx` (map deleted, import added, src swapped, comment added)
- Modify: `apps/landing/src/components/service-card.tsx` (import swapped, src swapped, header comment updated)

**Interfaces:**
- Consumes: Task 1's `serviceImage` from `../lib/service-image`.
- Produces: nothing new — both cards render through the seam.

- [ ] **Step 1: `home-cards.tsx` — three edits.**

(a) DELETE the map block. Current block (lines 12–21, byte-exact) plus its trailing blank line (line 22):

```tsx
// The full-image service-card backgrounds (stand-ins; M5 swaps for the
// studio's own service shots).
export function serviceBackground(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('recover')) return '/photos/service-recovery.jpg';
  if (n.includes('fram')) return '/photos/service-framing.jpg';
  if (n.includes('id') || n.includes('portrait')) return '/photos/service-id.jpg';
  if (n.includes('print') || n.includes('tarp')) return '/photos/service-printing.jpg';
  return '/photos/cover-portrait.jpg';
}
```

Delete the comment + function + ONE trailing blank line, leaving the file to flow from the card-system comment's blank line straight into `// The ruled service treatment:` (the map's only truthful successor comment lives in the lib now). The deletion removes 11 lines; after this task's three edits the file stands at 61 lines, exporting exactly one symbol: `ServiceImageCard`.

(b) ADD the import. Current import block (lines 1–4, byte-exact):

```tsx
import type { StudioServiceWithBranches } from '@sevendays/types';
import { Link } from '@tanstack/react-router';
import { CalendarPlus } from 'lucide-react';
import { bookAriaLabel, peso } from '../lib/format';
```

Becomes (the new line sorted after `../lib/format` — biome's module-path order):

```tsx
import type { StudioServiceWithBranches } from '@sevendays/types';
import { Link } from '@tanstack/react-router';
import { CalendarPlus } from 'lucide-react';
import { bookAriaLabel, peso } from '../lib/format';
import { serviceImage } from '../lib/service-image';
```

(`import type { StudioServiceWithBranches }` STAYS — the card's props use it.)

(c) SWAP the img src and add the demotion comment. Current block (lines 34–40, byte-exact):

```tsx
      <img
        src={serviceBackground(service.name)}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105'
        loading='lazy'
      />
```

Replace with:

```tsx
      {/* #333: the stored cover renders first — the serviceBackground
          stand-ins are the documented no-cover fallback (owner ruling —
          the home stays photo-led with zero admin work). The treatment
          below is identical either way: the photo IS the card. */}
      <img
        src={serviceImage(service)}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105'
        loading='lazy'
      />
```

- [ ] **Step 2: `service-card.tsx` — three edits.**

(a) SWAP the import. Current lines 9–10 + 16 (byte-exact, with line 16 last in the file's import block):

```tsx
import { peso } from '../lib/format';
import { useTruncated } from '../lib/use-truncated';
```
…later…
```tsx
import { serviceBackground } from './home-cards';
```

Becomes — line 16 deleted, the new import sorted between the two existing lib imports (`format` < `service-image` < `use-truncated`):

```tsx
import { peso } from '../lib/format';
import { serviceImage } from '../lib/service-image';
import { useTruncated } from '../lib/use-truncated';
```

(b) UPDATE the header comment's provenance clause. Current block (lines 18–22, byte-exact):

```tsx
// The studio-service row (/services), OWNER-RULED Round 3: the cover image
// IS the card — full-bleed themed background (the serviceBackground mapping
// the home marquee shares), the two-layer ink wash + bottom scrim keeping
// every text zone at the measured white-on-ink AA pair (#111's law),
// content anchored bottom, and the CTA PINNED at the bottom-right corner.
```

Replace with (the parenthetical alone changes — the ruling sentence around it is untouched):

```tsx
// The studio-service row (/services), OWNER-RULED Round 3: the cover image
// IS the card — full-bleed themed background (since #333 the serviceImage
// precedence both service surfaces share: the stored cover first, the
// serviceBackground stand-ins as the documented no-cover fallback — owner
// ruling, the home stays photo-led with zero admin work), the two-layer
// ink wash + bottom scrim keeping every text zone at the measured
// white-on-ink AA pair (#111's law), content anchored bottom, and the CTA
// PINNED at the bottom-right corner.
```

(c) SWAP the img src — the expression alone. Current block (lines 68–74, byte-exact):

```tsx
      <img
        src={serviceBackground(service.name)}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.05] motion-reduce:transition-none'
        loading='lazy'
      />
```

Only `src={serviceBackground(service.name)}` → `src={serviceImage(service)}`; every other line byte-identical (note this card's OWN className — duration-700 + the motion-reduce clause — do not sync it with home-cards').

- [ ] **Step 3: The name census (bookkept, #332's lesson) + gates.**

The census — every command with its exact expected output; a deviation is a straggler, stop and reconcile:

1. `grep -c "export function serviceBackground" apps/landing/src/lib/service-image.ts` → `1` (the ONE definition).
2. `grep -c "export function serviceBackground" apps/landing/src/components/home-cards.tsx` → `0` (the copy retired).
3. `grep -rn "serviceBackground(" apps/landing/src` → exactly TWO hits, BOTH in `apps/landing/src/lib/service-image.ts` (the `export function serviceBackground(…)` definition line + the body call inside `serviceImage`). Any hit in any OTHER file is a straggler. Comments MAY name `serviceBackground` (service-card's header clause, home-cards' img comment) — those are bookkept mentions, not call sites; the `(` is what marks a call or definition.
4. `grep -rn "import.*serviceBackground" apps/landing/src` → no output (no import of the old path remains anywhere).

Then the gates: `pnpm --filter @sevendays/landing typecheck` → green, and `pnpm --filter @sevendays/landing test -- --run` → **18 files / 138 tests passed** (unchanged from Task 1 — this task adds no pins).

- [ ] **Step 4: Commit.**

```bash
git add apps/landing/src/components/home-cards.tsx apps/landing/src/components/service-card.tsx
git commit -m "feat(landing): #333 — both service cards consume the cover (the stand-ins demote to the documented fallback)"
```

**Not here:** no booking-flow edit (0 img matches there — pre-flight); no treatment/classname change in either file; no e2e baseline edit; no admin/api/types work.

---

## Task 3 — docs rotation + floors + graphify + the final gate

**Files:**
- Modify: `docs/progress.md` (append one dated section at file end — the house pattern)
- Modify: `AGENTS.md` (the landing floor sentence: one exact-string edit)
- Local/commit: graphify output

**Interfaces:**
- Consumes: Tasks 1–2 landed; the green runs' ACTUAL counts.
- Produces: the durable record; nothing code-side.

- [ ] **Step 1: `docs/progress.md` — append this section verbatim at the end of the file (after the `## 2026-11-21 — #332: …` section):**

```markdown
## 2026-11-21 — #333: service covers, the landing consumes coverImageUrl — stand-ins demote to fallback

Every landing surface where studio services render now prefers the real cover (spec #330 §6): the home `ServiceImageCard` and the /services `ServiceCard` render `service.coverImageUrl` first, with the name-matched stand-ins demoted to the documented no-cover fallback (owner ruling at charting — the home stays photo-led with zero admin work: every service always renders a photo). The law lives in one pure precedence helper, `serviceImage(service)` (`apps/landing/src/lib/service-image.ts`), beside the stand-in map `serviceBackground` (moved verbatim from `home-cards.tsx` — the body unchanged, only the role demoted): `service.coverImageUrl ?? serviceBackground(service.name)`, so a null cover (born-null rows, #331) and an absent field both fall back. Card compositions are untouched — the photo-IS-the-card treatment (two-layer ink wash + bottom scrim, the measured white-on-ink AA pairs) rides identically for covers and fallbacks; the photo stays decorative (`alt=''` + aria-hidden) and lazy-loaded. The booking flow renders no imagery (spec-pinned, verified live — zero `<img>` in the book route + components); if booking imagery is ever added it consumes the cover by this law. Pins: landing 138 (18 files; +4 — cover wins / null falls back / absent falls back / the five-way stand-in map over the four seeded names + the default); api/types/db/api-client/admin floors unmoved. The teaser owner-reaction pass is #334 — the feature is not "done done" until it records.
```

- [ ] **Step 2: `AGENTS.md` — the landing floor edit.**

(a) Replace the exact string `+ #224's two redesign-II seams — the page-head composition, the about story paragraphs — 17 files / 134 tests)` with `+ #224's two redesign-II seams — the page-head composition, the about story paragraphs; + #333's four service-image seam pins — the cover-first precedence (cover wins, null falls back, absent falls back) and the five-way stand-in map — 18 files / 138 tests)` (one occurrence, in the landing suite's floor sentence).
(b) Verify with: `grep -c "18 files / 138 tests" AGENTS.md` → `1`, and `grep -c "17 files / 134 tests" AGENTS.md` → `0`. (No other floor sentence changes: admin 364, api 482+3, types 197, db, api-client did not move.)

- [ ] **Step 3: Format + the final repo gate.**

Run: `pnpm fix` then `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check`
Expected: green at the repo root — lint + format + typecheck + test across every workspace, with floors: landing **138** (18 files); admin **364** (34 files); api **482 passed + 3 skipped** (34 files); types **197** (18 files); db **4 files** (22 passed + 8 skipped; 30 passed under TEST_DATABASE_URL); api-client **45** (5 files). Any other count means drift: stop and reconcile. (The api leg needs the standalone container `sevendays-test-db-5433` up — `docker start sevendays-test-db-5433` if down; the truncate-race lesson says never race a shared 5433 window — this container is the exclusive one.)

- [ ] **Step 4: Docs + graphify commits.**

```bash
git add docs/progress.md AGENTS.md
git commit -m "docs: #333 — progress section + the landing floor for the service-image seam"
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#333 graph update"
```

**Not here:** no issue-close in this plan's tasks — the controller closes #333 on the evidence; #334 (the owner's teaser walk) stays open and continues on this same worktree/branch (the branch law — no push/PR/rebase until the owner calls for the #331/#332/#333 push); no v1 pick in-branch — post-merge, main-only per `docs/agents/v1-picks.md`; no `docs/plan.md` edit — no milestone box rides this ticket.

---

## Self-review checklist (controller pass — run before handoff)

- [✅] Placeholder scan: no TBD/TODO/"as appropriate"/paraphrased strings — every value the executor must land is quoted verbatim; no leftover APPEND anchors. (grep 2026-11-21: zero hits outside this line.)
- [✅] Step-checkbox count: `grep -c '^- \[ \] \*\*Step'` on this file = **13** (Task 1: 5, Task 2: 4, Task 3: 4).
- [✅] Before-block byte-fidelity: all four quoted component blocks (the map `home-cards.tsx:12–21`, the home img `34–40`, the /services header comment `18–22`, the /services img `68–74`) verified byte-exact against the live files by script at plan time; the import blocks match lines 1–4 and 9–10+16 read in the same pass. The lib file's map is instructed to be COPIED from the Task 2 before-block, not retyped.
- [✅] Cross-task consistency: Task 1's produced names (`serviceImage`, `serviceBackground` from `../lib/service-image`) are exactly what Task 2's imports and src swaps reference; the map exists in BOTH home-cards.tsx and the lib between Tasks 1–2 by design (the retire-with-last-caller law — stated in both tasks); Task 3's AGENTS.md edit consumes the floor Task 1 moves (134→138) and Task 2 preserves.
- [✅] Floor math recounted from the actual test blocks: landing 134 + 4 (the four pins in Task 1 Step 1) = **138**, files 17 + 1 = **18** — matching Global Constraints, Task 1 Step 4, Task 2 Step 3, Task 3 Steps 1–3. No other suite's count appears anywhere as moving.
- [✅] Census honesty (#332's lesson): `serviceBackground` remains a live name in comments and the lib export — the Task 2 Step 3 census counts CALL/DEFINITION sites (the `(` marker: exactly TWO post-plan hits, both in the lib), not mentions, and every comment that names it is bookkept in the census text.
- [✅] Boundary re-check: no mocks anywhere in this plan (pure-function pins over a pure seam — nothing to re-derive); the pin fixtures pass through `serviceImage` only (`serviceBackground` is never imported by the test — the map is pinned THROUGH the fallback path, one law one pin).
- [✅] Spec coverage: §6's "both surfaces consume the resolved cover first" = Task 2 (src swaps); "one pure precedence helper beside the stand-in map" = Task 1 (the lib pair); "documented no-cover fallback in both files' comments" = Task 2 Steps 1(c) + 2(b); "card tints, scrim, alt, lazy laws unchanged" = the Task 2 preamble + byte-untouched attribute lines; "booking flow: nothing to build" = the scope fence + live-verified pre-flight; §7's landing pins = Task 1 Step 1 (cover wins / null / absent / the five-way map). No gap.




