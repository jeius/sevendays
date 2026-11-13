# Plan: #273 — Branch Maps button v2: pasted Google/Apple Maps links replace coordinate entry

Parent: follow-up to #248 (landed 2026-11-13, e33c2f0/#272). The owner's redesign ruling, 2026-11-13.

## Scope fences

**In scope:** nullable `google_maps_url`/`apple_maps_url` text columns on branches (migration 0014, the 0013 posture); the wire shapes in `packages/types` (any-https validation, independently optional — NO pair rule); the API's create/update persistence (reads ride the row spread); the admin branch Sheet — the two lat/lng inputs **hidden** (their state/payload code stays, dormant), two link inputs added where they stood; the landing card button relabeled **`Open in Maps`** over the owner-ruled device law (Google base, Apple augments), driven by two new pure seams (`mapsHrefFor`, `isAppleUserAgent`) with the device flag read **server-side** in the `/branches` route; the seam tests pinning all of it; the `docs/progress.md` bullet recording the #248 **set-aside** (code kept dormant, possible future revival).

**NOT here (siblings / out of scope):**
- #248's coordinate code is NOT removed: the columns, wire fields, pair-rule machinery, `atMostSixDp` export, and `mapsUrlFor` all stay in-tree, dormant. No delete, no deprecation sweep — only the Sheet inputs hide and the card stops calling `mapsUrlFor`.
- No brand/host enforcement on the pasted links (any https URL passes — the owner may paste Apple links into either field; the field *names* are the contract, validation is transport-only).
- No embeds, no static maps, no geocoding, no QR — links open a new tab exactly as #248's button did.
- No booking surface, home strip, or booking-wizard work; the button lives on `/branches` cards only (unchanged surface).
- No v1-branch edits here — the v1 pick keeps the button last in the single-CTA row after `Call {branch}` (the relabel arrives via the pick; the transform note is unchanged).
- #239's roadmap checkbox stays unticked.

## Owner rulings (ratified 2026-11-13, this plan round)

- **Model:** the two pasted links REPLACE stored coordinates as the button's source. #248's coordinate path is **set aside, not removed** — inputs hidden, code dormant, documented for possible future revival.
- **Validation:** any valid **https URL** per field, independently optional. No pair rule, no host allowlist (an Apple device viewer gets the Apple link by *field*, not by URL sniffing).
- **Sheet:** hide the two lat/lng inputs; the two link inputs stand where they did.
- **Render:** the button relabels to **`Open in Maps`** (MapPin icon stays, outline variant, new tab, same focus ring).
- **Device law — Google is the base, Apple augments:** Apple devices (iPhone/iPad/Mac UA) open the Apple link when set, else the Google link; non-Apple devices open the Google link; **no links set → no button, even where stored coordinates exist** (the coordinate gate no longer feeds the render).
- **Both editions** (book-free, clean pick).

## Global Constraints

- After editing anything under `packages/types` or `packages/db`, run `pnpm build:packages`, then `pnpm --filter @sevendays/api build` before `pnpm check`.
- Migration discipline: `pnpm --filter @sevendays/db db:generate` (never hand-edit `packages/db/migrations`), then `pnpm --filter @sevendays/db db:migrate` (DATABASE_MIGRATE_URL already in `packages/db/.env`). The local test DB needs NO manual migration (`apps/api/test/global-setup.ts` migrates at suite start).
- **Test-DB env (machine-specific):** the test DB is `postgres://postgres:postgres@localhost:5433/sevendays_test`, container `sevendays-test-db-5433` (`docker start` first). **Every api-suite command carries the variable INLINE** — workers' shells do NOT inherit exports. NEVER touch port 5432 (`lactalink-test-db`, another project's).
- `pnpm check` (lint + format + typecheck + test) + `pnpm build` green before commit, for the packages/apps touched. Test floors this plan must not regress and should reach (post-#248): api 455 passed + 3 skipped (+ this plan's additions), api-client 5 files / 45 (unchanged), admin 27 files / 288 (+ additions), landing 17 files / 128 (+ additions), types 18 files / 183 (+ additions).
- Zod semantics: assert on parsed OUTPUT; admin write failures are RESOLVED `{ ok: false, ... }`; the validator's 400 envelope is `{ error: 'Invalid request payload.', details: [{ path, message }] }` (verified live in #248 — new 400 pins use this envelope).
- Known consumer sweep (the #248 lesson — the read schema's new REQUIRED keys break every literal): `packages/api-client/test/mock-api.ts` BRANCHES (both entries), `apps/landing/src/lib/{bookable-branches,booking-read,booking}.test.ts` fixture builders, `apps/landing/src/lib/branch-maps.test.ts`'s own `branch()` fixture, `apps/admin/src/lib/light-entity-state.test.ts` fixtures, `apps/api/test/cms-schema-contracts.test.ts` branch ROW literal, `apps/api/test/admin-entities.test.ts` fixtures if any assert full shapes.
- No new secrets, no new deps, no ADR (a link column + a UA pick — no architectural choice; the #248 set-aside is recorded in `docs/progress.md`).
- Verbatim strings this plan introduces are quoted in full — use them exactly.

## Design (one paragraph, pinned before Task 1)

Two nullable `text` columns land beside 0013's coordinates (migration 0014). The wire row/read gain `googleMapsUrl`/`appleMapsUrl` as required-nullable fields — `z.url().refine(v => v.startsWith('https://'), 'Must be an https URL.')` (the `coverImageUrl` precedent; controller-verified against installed zod 4.5.1: https passes, http/garbage reject, `.nullable().default(null)` parses omitted to null) — and create/update carry them `.nullable().default(null)` with **no** cross-field rule (each independently optional; a plain-object `.extend` chain, no refine needed). The API write sites gain two lines each; reads ride `toBranchRead`'s spread. The admin state gains two raw strings (`''` = clear-to-null) with a client-side https-URL mirror (`new URL(v)` + protocol check); the lat/lng inputs disappear from the Sheet but their state/payload/flip code is untouched (dormant — a save sends `null` coordinates, which is the full-object PUT law and harmless where the button no longer reads them; the flip still re-sends stored values). The landing splits the render decision into two pure seams in `branch-maps.ts`: `isAppleUserAgent(ua: string): boolean` (iPhone/iPad/iPod/Macintosh tokens) and `mapsHrefFor(branch, isApple: boolean): string | null` implementing the fallback matrix; the device flag is **client-side, effect-driven** in `BranchCard` — `useState(false)` + `useEffect(() => setIsApple(isAppleUserAgent(navigator.userAgent)), [])` — because the installed TanStack Router's documented loader args carry NO `request` object (verified against the v1 data-loading docs, 2026-11-13; the server-side read was an unprovable inference and is dropped). SSR and first paint render the Google-base matrix; Apple devices swap the href post-mount (an effect-driven update — no hydration mismatch; on an Apple-only link the button appears post-mount). `mapsUrlFor` stays exported beside the new seams, dormant, its comment updated to say so. The button's label becomes `Open in Maps`; everything else about the anchor (variant, icon, ring, new tab, last-in-row placement) is unchanged.

## Task 1: DB — two nullable link columns + migration 0014

**Files:**
- Modify: `packages/db/src/schema/branches.ts`
- Create (generated): `packages/db/migrations/0014_*.sql` + `meta/` journal entries

**Interfaces:** Produces `branches.googleMapsUrl: text('google_maps_url')` and `branches.appleMapsUrl: text('apple_maps_url')`, both nullable — the exact drizzle names later tasks pin to.

- [ ] **Step 1: Add the columns** — after `longitude` (line 36), before `createdAt`:

```ts
    // Pasted Maps links (M7 #273, the owner's v2 of #248): the branch's
    // Google/Apple Maps share URLs, entered manually in the admin — the
    // button's source of truth (stored coordinates are SET ASIDE, dormant;
    // see the #273 progress bullet). Any https URL passes; each is
    // independently optional.
    googleMapsUrl: text('google_maps_url'),
    appleMapsUrl: text('apple_maps_url'),
```

(`text` is already imported.)

- [ ] **Step 2: Generate** — `pnpm --filter @sevendays/db db:generate`; the 0014 SQL must contain exactly two `ALTER TABLE "branches" ADD COLUMN` statements (`"google_maps_url" text`, `"apple_maps_url" text`, nullable). Anything else: STOP and re-check.
- [ ] **Step 3: Apply** — `pnpm --filter @sevendays/db db:migrate` (exit 0). No manual test-DB step (global-setup migrates at suite start).
- [ ] **Step 4: Commit** — `git add packages/db/src/schema/branches.ts packages/db/migrations/` → `feat(db): nullable google/apple maps url columns on branches (#273)`.

## Task 2: Wire schemas — packages/types + consumer sweep

**Files:**
- Modify: `packages/types/src/branch.ts`
- Modify (the #248 sweep list, all gaining `googleMapsUrl: null, appleMapsUrl: null`): `packages/api-client/test/mock-api.ts` (both BRANCHES entries), `apps/landing/src/lib/bookable-branches.test.ts` / `booking-read.test.ts` / `booking.test.ts` (fixture builders), `apps/landing/src/lib/branch-maps.test.ts` (its `branch()` fixture), `apps/admin/src/lib/light-entity-state.test.ts` (fixtures/pins as needed), `apps/api/test/cms-schema-contracts.test.ts` (branch ROW literal), `apps/api/test/admin-entities.test.ts` (fixtures if they assert full shapes)
- Test: `packages/types/src/branch.test.ts`

**Interfaces:** Produces `branchSchema`/`branchReadSchema` with `googleMapsUrl`/`appleMapsUrl: string | null` REQUIRED keys; create/update with `.nullable().default(null)` + https-only refinement; module-private `mapsLinkSchema = z.url().refine((v) => v.startsWith('https://'), 'Must be an https URL.')`.

- [ ] **Step 1: Failing tests** (new describe in branch.test.ts, the file's fixture style):

```ts
describe('branch maps links (#273)', () => {
  it('branchSchema accepts null links on the row', () => {
    const { success } = branchSchema.safeParse({ ...row, googleMapsUrl: null, appleMapsUrl: null });
    expect(success).toBe(true);
  });

  it('createBranchSchema defaults omitted links to null', () => {
    const parsed = createBranchSchema.parse(bareCreate);
    expect(parsed.googleMapsUrl).toBeNull();
    expect(parsed.appleMapsUrl).toBeNull();
  });

  it('createBranchSchema accepts an https link and rejects http', () => {
    expect(createBranchSchema.safeParse({ ...bareCreate, googleMapsUrl: 'https://maps.app.goo.gl/x' }).success).toBe(true);
    expect(createBranchSchema.safeParse({ ...bareCreate, googleMapsUrl: 'http://maps.app.goo.gl/x' }).success).toBe(false);
  });

  it('createBranchSchema rejects a non-URL string', () => {
    expect(createBranchSchema.safeParse({ ...bareCreate, appleMapsUrl: 'not a url' }).success).toBe(false);
  });

  it('each link is independently optional — one set, other null', () => {
    const parsed = createBranchSchema.parse({ ...bareCreate, appleMapsUrl: 'https://maps.apple.com/?q=studio' });
    expect(parsed.appleMapsUrl).toBe('https://maps.apple.com/?q=studio');
    expect(parsed.googleMapsUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run red** — `pnpm --filter @sevendays/types test` FAIL.
- [ ] **Step 3: Implement** — in `branch.ts`, add the module-private schema above `branchSchema`; in `branchSchema` (after `longitude`):

```ts
  // Pasted Maps links (M7 #273): the button's source — coordinates (#248)
  // are set aside, dormant (kept in-tree for possible future revival).
  googleMapsUrl: mapsLinkSchema.nullable(),
  appleMapsUrl: mapsLinkSchema.nullable(),
```

In `branchWriteBase`'s `.extend({...})` (beside latitude/longitude):

```ts
    // #273: independently optional — no pair rule. Omitted = null.
    googleMapsUrl: mapsLinkSchema.nullable().default(null),
    appleMapsUrl: mapsLinkSchema.nullable().default(null),
```

(`updateBranchSchema`'s extend chain is untouched — no refinement wraps these.)
- [ ] **Step 4: Green** — types suite PASS.
- [ ] **Step 5: Consumer sweep** — add the two keys per the Files list; root `pnpm typecheck` proves it (the runtime-zod sites — mock-api, cms-schema-contracts, branch-maps.test fixtures — are the ones typecheck can't see; sweep them by hand).
- [ ] **Step 6: Gates + commit** — `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm typecheck` all 0 → commit the swept files + branch.ts/.test.ts as `feat(types): branch maps-link wire schemas — https-only, independently optional (#273)`.

## Task 3: API — persist the links

**Files:**
- Modify: `apps/api/src/services/admin-entities.ts` (the two branch write sites only)
- Test: `apps/api/test/admin-entities.test.ts`

- [ ] **Step 1: Failing tests** (branches describe; `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test` inline on every run; container `sevendays-test-db-5433` started first):

```ts
  it('PUT with both links persists them; the read carries them (#273)', async () => {
    const { token } = await signUpSession(url, 'admin-branches-links@sevendays.test');
    const res = await app.request(`/api/v1/admin/branches/${ids.branchA}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: JSON.stringify({
        name: 'Test Branch A', address: '1 Test St', phone: '+63 900 000 001',
        acceptsWalkIns: false, isActive: true,
        latitude: null, longitude: null,
        googleMapsUrl: 'https://maps.app.goo.gl/abc',
        appleMapsUrl: 'https://maps.apple.com/?q=sevendays',
      }),
    }, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { googleMapsUrl: string | null; appleMapsUrl: string | null };
    expect(body.googleMapsUrl).toBe('https://maps.app.goo.gl/abc');
    expect(body.appleMapsUrl).toBe('https://maps.apple.com/?q=sevendays');
  });

  it('PUT with an http link answers the 400 envelope (#273)', async () => {
    const { token } = await signUpSession(url, 'admin-branches-links-400@sevendays.test');
    const res = await app.request(`/api/v1/admin/branches/${ids.branchA}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: JSON.stringify({
        name: 'Test Branch A', address: '1 Test St', phone: '+63 900 000 001',
        acceptsWalkIns: false, isActive: true, googleMapsUrl: 'http://maps.app.goo.gl/abc',
      }),
    }, testEnv(url));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details: { path: string[] }[] };
    expect(body.error).toBe('Invalid request payload.');
    expect(body.details.some((d) => d.path.includes('googleMapsUrl'))).toBe(true);
  });
```

- [ ] **Step 2: Red** (round-trip fails on null; the 400 may pass via the validator — keep it as the envelope pin).
- [ ] **Step 3: Implement** — in `createAdminBranch`'s `.values({...})` and `updateAdminBranch`'s `.set({...})`, beside the latitude/longitude lines:

```ts
          googleMapsUrl: input.googleMapsUrl,
          appleMapsUrl: input.appleMapsUrl,
```

- [ ] **Step 4: Green + commit** — file PASS → `feat(api): branch create/update persist the maps links (#273)`.

## Task 4: Admin — link inputs replace the coordinate inputs

**Files:**
- Modify: `apps/admin/src/lib/light-entity-state.ts`
- Modify: `apps/admin/src/components/branches/branches-screen.tsx`
- Test: `apps/admin/src/lib/light-entity-state.test.ts`

**Interfaces:** `BranchEditorState` gains `googleMapsUrl: string` / `appleMapsUrl: string` (`''` = clear); `LightFieldErrors` gains `googleMapsUrl?: string` / `appleMapsUrl?: string`; payload builders emit `string | null`; `branchStateFromRead` maps `null → ''` else the string.

- [ ] **Step 1: Failing tests** (9-ish pins, the file's style): round-trip strings ↔ null; payload parses `'https://…'` → the string and `''` → null (both fields); validation rejects `http://` and `not a url` with inline errors; `''` valid (clear); flip re-sends row values (`row.googleMapsUrl`); state's latitude/longitude behavior unchanged (dormant pins still pass).
- [ ] **Step 2: Red** → **Step 3: Implement**:
  a) State interface (after `longitude: string;`): the two `string` fields with the comment `// #273: pasted Maps share links ('' = clear). The lat/lng inputs are hidden (#248 set aside) but their state/payload code stays dormant.`
  b) `branchStateFromRead` / `newBranchState`: `null → ''` mappings; `''` defaults.
  c) Module-private validator (beside `validateCoordinate`):

```ts
// #273: any https URL — transport check only (no host allowlist, owner-ruled).
function validateMapsLink(input: string, label: string): string | undefined {
  const trimmed = input.trim();
  if (trimmed === '') {
    return undefined;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') {
      return `${label} must be an https URL.`;
    }
    return undefined;
  } catch {
    return `${label} must be a valid URL.`;
  }
}
```

  d) `validateBranchState` grows the two checks (same pattern as latitude/longitude).
  e) `buildBranchCreatePayload`/`buildBranchUpdatePayload` emit `googleMapsUrl: state.googleMapsUrl.trim() === '' ? null : state.googleMapsUrl.trim()` (and the apple twin); `buildBranchFlipPayload` emits `row.googleMapsUrl` / `row.appleMapsUrl` (a flip re-sends stored values — the #248 law, unchanged).
- [ ] **Step 4: Green** → **Step 5: Sheet wiring** in `branches-screen.tsx`:
  - DELETE the two-coordinate `grid grid-cols-2` Field block (the latitude/longitude Inputs) and the `latitudeId`/`longitudeId` `useId` lines — replaced in place by:

```tsx
          <div className='space-y-4'>
            <Field>
              <FieldLabel htmlFor={googleMapsId}>Google Maps URL</FieldLabel>
              <Input
                id={googleMapsId}
                type='url'
                placeholder='https://maps.app.goo.gl/…'
                value={editorState.googleMapsUrl}
                onChange={(e) => setEditorState({ ...editorState, googleMapsUrl: e.target.value })}
              />
              {fieldErrors.googleMapsUrl ? (
                <p className='text-destructive text-xs'>{fieldErrors.googleMapsUrl}</p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor={appleMapsId}>Apple Maps URL</FieldLabel>
              <Input
                id={appleMapsId}
                type='url'
                placeholder='https://maps.apple.com/…'
                value={editorState.appleMapsUrl}
                onChange={(e) => setEditorState({ ...editorState, appleMapsUrl: e.target.value })}
              />
              {fieldErrors.appleMapsUrl ? (
                <p className='text-destructive text-xs'>{fieldErrors.appleMapsUrl}</p>
              ) : null}
            </Field>
          </div>
```

  - The `handleEditorSave` veto check grows `|| errors.googleMapsUrl || errors.appleMapsUrl`; the two new `useId`s replace the deleted pair.
  - Description line becomes EXACTLY: `description='Name, address, phone, the walk-in flag, and optional map links.'`
  - The state's latitude/longitude fields and payload code are NOT touched (dormant).
- [ ] **Step 6: Suite + commit** — `pnpm --filter @sevendays/admin test` green → `feat(admin): google/apple maps link inputs replace the coordinate fields (#273)`.

## Task 5: Landing — the device-law seams + the Open in Maps button

**Files:**
- Modify: `apps/landing/src/lib/branch-maps.ts` + `.test.ts`
- Modify: `apps/landing/src/components/branch-card.tsx`

**Interfaces:** Produces `isAppleUserAgent(ua: string): boolean` and `mapsHrefFor(branch: BranchRead, isApple: boolean): string | null` (the fallback matrix); `mapsUrlFor` stays exported, dormant.

- [ ] **Step 1: Failing tests** (extend branch-maps.test.ts; the fixture gains the two null keys):

```ts
describe('isAppleUserAgent (#273)', () => {
  it('matches iPhone, iPad, iPod, Macintosh UAs', () => {
    expect(isAppleUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isAppleUserAgent('Mozilla/5.0 (iPad; CPU OS 16_0')).toBe(true);
    expect(isAppleUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)').toBe(true);
  });
  it('rejects Windows/Android/Linux UAs', () => {
    expect(isAppleUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(isAppleUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(false);
  });
});

describe('mapsHrefFor — Google base, Apple augments (#273)', () => {
  const G = 'https://maps.app.goo.gl/g';
  const A = 'https://maps.apple.com/?q=a';
  it('both set: Apple → apple, non-Apple → google', () => {
    const b = branch({ googleMapsUrl: G, appleMapsUrl: A });
    expect(mapsHrefFor(b, true)).toBe(A);
    expect(mapsHrefFor(b, false)).toBe(G);
  });
  it('google only: both devices → google', () => {
    const b = branch({ googleMapsUrl: G });
    expect(mapsHrefFor(b, true)).toBe(G);
    expect(mapsHrefFor(b, false)).toBe(G);
  });
  it('apple only: Apple → apple, non-Apple → null', () => {
    const b = branch({ appleMapsUrl: A });
    expect(mapsHrefFor(b, true)).toBe(A);
    expect(mapsHrefFor(b, false)).toBeNull();
  });
  it('neither → null even with stored coordinates (#248 dormant)', () => {
    const b = branch({ latitude: 14.16598, longitude: 121.2485 });
    expect(mapsHrefFor(b, true)).toBeNull();
    expect(mapsHrefFor(b, false)).toBeNull();
  });
});
```

- [ ] **Step 2: Red** → **Step 3: Implement** in `branch-maps.ts` (keep `mapsUrlFor` above, comment amended to open `// DORMANT since #273 — kept for possible future revival:`):

```ts
// The device law (#273, OWNER-RULED): Google is the base, Apple augments.
export function isAppleUserAgent(ua: string): boolean {
  return /iPhone|iPad|iPod|Macintosh/i.test(ua);
}

export function mapsHrefFor(branch: BranchRead, isApple: boolean): string | null {
  if (isApple && branch.appleMapsUrl !== null) {
    return branch.appleMapsUrl;
  }
  return branch.googleMapsUrl;
}
```

- [ ] **Step 4: Green** → **Step 5: The card** — in `branch-card.tsx`: replace `const mapsUrl = mapsUrlFor(branch);` with the effect-driven device state (`useState(false)` + the one-line `useEffect`; `useEffect` joins the react import) and `const mapsHref = mapsHrefFor(branch, isApple);`; the anchor gates on `mapsHref`, its `href={mapsHref}`, and its label becomes `Open in Maps` — the comment block becomes:

```tsx
          {/* #273 (OWNER-RULED): Open in Maps opens the pasted link in a
              new tab — Apple devices prefer the Apple link when set, else
              the Google link; cards without links render nothing. The
              device flag is effect-driven (SSR renders the Google base). */}
```

  (`mapsUrlFor`'s import is removed from the card; nothing else in the row changes.)
- [ ] **Step 6: Suite + typecheck + commit** — landing green (17 files / 128 + the new pins) → `feat(landing): Open in Maps over the pasted links — Google base, Apple augments (#273)`.

## Task 6: Gates + docs

- [ ] `pnpm build:packages && pnpm --filter @sevendays/api build && TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check && pnpm build` — all 0; floors: api 457+3 (455 + 2), admin 288 + additions, landing 128 + additions, types 183 + additions, api-client 45.
- [ ] `docs/progress.md` #273 bullet (dense, house voice): the two pasted link fields replace coordinate entry end to end; **#248's coordinate path SET ASIDE — code kept dormant (columns, wire fields, pair rule, mapsUrlFor) for possible future revival, inputs hidden**; the device law (Google base, Apple augments, effect-driven client pick — TanStack loaders carry no request object); the relabel to `Open in Maps`; the v1 pick note (button last after `Call {branch}`, unchanged); floor movement. No roadmap tick.
- [ ] Commit `docs(progress): #273 branch maps links landed` + `pnpm exec graphify update .` (churn unstaged).

## Acceptance-criteria mapping (issue #273)

- Migration/nullable/nothing breaks → T1 (+ T3 whole-file run).
- Staff paste links; saves persist; bad pastes inline-error → T2–T4 (https refinement pinned at the wire + the client mirror).
- Apple→Apple-link-when-set, else Google; relabel → T5 (the matrix + UA seams; the effect wiring).
- No links → no button even with coordinates → T5's fourth matrix test (the dormant law).
- Coordinate code kept + documented → T4 (state/payload untouched) + T6 (the set-aside bullet).
- Both editions + gates green → T6 (+ the post-merge v1 pick: clean — no booking paths; the branch-card transform re-applies).

