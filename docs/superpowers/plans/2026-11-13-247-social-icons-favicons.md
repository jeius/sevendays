# Ticket 247 — social brand SVG icons + favicons on both apps — implementation plan

**Goal:** The studio's social links stop rendering word labels and render the owner's brand SVG assets (Instagram / Facebook / TikTok) on both surfaces — the landing footer links and the admin Settings Site tab's social rows — and both apps get a proper favicon set (SVG + 64×64 PNG + 180×180 apple-touch-icon). The favicon half is an owner add-on outside #247's text, landed in the same branch.

**Spec:** issue #247 (parent #239, item 16). Owner rulings at plan time (2026-11-13): **both surfaces** get the icons; favicon set = **180×180 PNG + SVG** beside the ready 64×64 PNG; assets live in the **apps' `public/` dirs** (never code-embedded — "the owner's assets, verbatim" is the #247 law).

**Architecture:** zero API work, zero schema/type work. The landing's `socialLinksFor` seam is untouched (its `key` field already names the asset: `` `/brand/${social.key}.svg` ``); only `site-footer.tsx`'s rendering swaps label text for an icon + `sr-only` label. The admin's `site-tab.tsx` grows an icon beside each social row label via `Row`'s label becoming a `ReactNode`. Favicons are static files + three `links` entries in each app's root `head()`. `apps/admin/public/` does not exist yet — created here.

**Favicon basis (2026 consensus, Evil Martians "three files" + favicon.io):** SVG icon first (crisp at every size, dark-mode-capable inside the asset itself), a PNG fallback with `sizes`, and `apple-touch-icon.png` 180×180 for iOS home screen. No `.ico` (no asset; both link tags cover every current browser), no web manifest (not a PWA).

## Global Constraints

- Branch `feat/247-social-icons-favicons` off current main; commit style `type(scope): … (#247)` (the favicon commits ride the same branch/PR — the owner bundled them). Never commit secrets. Tick boxes `- [✅]`.
- Owner asset placement round happens BEFORE Task 2 (the user places the files themselves). Exact expected paths — anything else at the gate = stop and ask:

  ```text
  apps/landing/public/brand/instagram.svg
  apps/landing/public/brand/facebook.svg
  apps/landing/public/brand/tiktok.svg
  apps/landing/public/brand/gmail.svg     (the #247-comment email glyph — owner ruling 2026-11-13)
  apps/landing/public/favicon.svg
  apps/landing/public/favicon-64.png      (64×64)
  apps/landing/public/apple-touch-icon.png (180×180)
  apps/admin/public/brand/instagram.svg    (same four files, copied — separate deployment)
  apps/admin/public/brand/facebook.svg
  apps/admin/public/brand/tiktok.svg
  apps/admin/public/brand/gmail.svg
  apps/admin/public/favicon.svg
  apps/admin/public/favicon-64.png
  apps/admin/public/apple-touch-icon.png
  ```

- Assets are consumed verbatim via `<img src>` — never edited, inlined, recolored, or run through a transformer. `public/` is served as-is by the Workers asset config; confirm nothing in either app's vite/wrangler config excludes `.svg` (Step 1 gate).
- Every find/replace below must match exactly once at execution time; a ≠1 match means the file drifted — stop and reconcile.
- Gates per touched workspace (`landing`, `admin`): `pnpm --filter @sevendays/{landing,admin} fix` (must rewrite nothing) → `test -- --run` → `typecheck`; final `pnpm check`. Test floors UNCHANGED: landing 16 files / 123 tests, admin 27 files / 279 tests — this plan adds no tests and breaks none (the `socialLinksFor` seam and its tests are untouched; the rendering swap is below the seam's test line).
- Both themes verified on the admin Site tab (the icons ride the Card surface in light and dark); the landing footer is always the ink band, one theme.
- `docs/progress.md` updated, v1-picks ledger row (pick/skip/split per ADR-0015 — this is main-only work until picked), `graphify update .` at close.

### Not here

- The landing footer keeps its layout law (icons replace the word label text only — no new row, no size change beyond the icon box).
- No `.ico` file, no web manifest / 192–512 PNGs, no `theme-color` meta (not asked for; say so in the PR body if the owner wants them later).
- No e2e/visual baseline work inside this plan — the footer pixel change may flag the ADR-0022 visual suite's landing baselines; that suite never joins `pnpm check` and re-capture is the owner's follow-up call (flagged in the PR body, not silently done).

---

### Task 1: Placement gate + config sanity

- [ ] **Step 1: owner placement round.** Ask the user to place the twelve files at the paths above. Verify presence and shape — a missing file, a wrong size, or a non-SVG stops the plan:

  ```bash
  ls apps/landing/public/brand apps/admin/public/brand
  file apps/landing/public/favicon-64.png apps/landing/public/apple-touch-icon.png \
       apps/admin/public/favicon-64.png apps/admin/public/apple-touch-icon.png
  # expect: each PNG's dimensions line reads 64 x 64 / 180 x 180 respectively
  head -1 apps/landing/public/brand/instagram.svg   # expect XML/SVG opener, not HTML error page
  ```

- [ ] **Step 2: asset-config sanity.** Grep both apps' vite + wrangler configs for any asset include/exclude that would drop `public/` SVGs/PNGs (landing already serves `/photos/sd.png` from `public/`, so the path is proven there; admin's `public/` is new — confirm the vite/vite-plugin cloudflare default picks it up by checking `apps/admin` builds and serves one in `dev`). No edits expected; a mismatch = stop and ask.

### Task 2: Landing — footer icons + favicon links

**Files:** `apps/landing/src/components/site-footer.tsx`, `apps/landing/src/routes/__root.tsx`

- [ ] **Step 1: the social link rendering** — in `site-footer.tsx`, replace the socials map block (lines 93–97):

  ```tsx
              {socials.map((social) => (
                <a key={social.key} href={social.href} className={LINK_ON_INK}>
                  {social.label}
                </a>
              ))}
  ```

  with (#247: the owner's brand assets verbatim; the word label demotes to screen-reader text so the link still announces — the #215 hide-law is upstream in `socialLinksFor` and untouched):

  ```tsx
              {socials.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  className='inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                >
                  <img
                    src={`/brand/${social.key}.svg`}
                    alt=''
                    aria-hidden='true'
                    className='size-4'
                  />
                  <span className='sr-only'>{social.label}</span>
                </a>
              ))}
  ```

  Note `LINK_ON_INK` is no longer on these anchors (its text sizing is inert over an sr-only label; the hover/focus laws are kept verbatim in the new class string — same hover target `hover:text-white`, same focus ring). If biome flags the long class string ordering, accept `fix`'s rewrite; do not hand-reorder beyond it.

- [ ] **Step 2: the contact email link joins the icon treatment** (#247 comment, owner ruling 2026-11-09 moved from #241 — the ~312px unbreakable email string overflowed the 320px viewport; the icon fixes the overflow class entirely). In `site-footer.tsx`, replace the email link block (lines 98–102):

  ```tsx
              {contact?.email ? (
                <a href={`mailto:${contact.email}`} className={LINK_ON_INK}>
                  {contact.email}
                </a>
              ) : null}
  ```

  with (same anchor class string as the socials' — one treatment; the accessible name carries the address; the phone link below it stays text — the comment moves only the email):

  ```tsx
              {contact?.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className='inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                >
                  <img src='/brand/gmail.svg' alt='' aria-hidden='true' className='size-4' />
                  <span className='sr-only'>{contact.email}</span>
                </a>
              ) : null}
  ```

  The #215 law holds upstream: `footerContactFor` returns null only when BOTH are unset, and this block already guards on `contact?.email` — a set phone with an empty email renders the phone link only.

- [ ] **Step 3: favicon links** — in `__root.tsx`, replace the `links:` array (lines 52–57) with:

  ```ts
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'icon',
        href: '/favicon-64.png',
        type: 'image/png',
        sizes: '64x64',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  ```

- [ ] **Step 4: gates** — `pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing test -- --run && pnpm --filter @sevendays/landing typecheck`; floors unchanged (123). Commit: `feat(landing): footer socials + contact email render the owner's brand SVGs + favicon set (#247)`.

### Task 3: Admin — Site tab icons + favicon links

**Files:** `apps/admin/src/components/settings/site-tab.tsx`, `apps/admin/src/routes/__root.tsx`

- [ ] **Step 1: Row label becomes a ReactNode** — replace the `Row` signature (line 95):

  ```tsx
  function Row({ label, children }: { label: string; children: ReactNode }) {
  ```

  with:

  ```tsx
  function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  ```

  (The `<span>` inside stays — a fragment label from Step 2 wraps it.)

- [ ] **Step 2: the icon-bearing rows get their own render** — replace `SOCIAL_FIELDS` (lines 87–91) with:

  ```tsx
  const ICON_FIELDS: { key: TextKeys; label: string; icon: string; placeholder?: string }[] = [
    { key: 'socialInstagram', label: 'Instagram URL', icon: '/brand/instagram.svg', placeholder: 'https://…' },
    { key: 'socialFacebook', label: 'Facebook URL', icon: '/brand/facebook.svg', placeholder: 'https://…' },
    { key: 'socialTiktok', label: 'TikTok URL', icon: '/brand/tiktok.svg', placeholder: 'https://…' },
    { key: 'contactEmail', label: 'Studio email', icon: '/brand/gmail.svg' },
  ];
  ```

  Then add an `iconTextField` arrow const directly after the existing `textField` const (same post-early-return position, so `editorState`'s non-null narrowing holds; `textField` itself stays untouched for every other field):

  ```tsx
  const iconTextField = (key: TextKeys, label: string, icon: string, placeholder?: string) => (
    <Row key={key} label={
      <span className='inline-flex items-center gap-1.5'>
        <img src={icon} alt='' aria-hidden='true' className='size-3.5' />
        {label}
      </span>
    }>
      <Input
        aria-label={label}
        className='h-8 text-sm'
        value={editorState[key]}
        placeholder={placeholder}
        onChange={(e) => setField(key, e.target.value)}
      />
      {fieldErrors[key] ? (
        <p className='col-start-2 text-destructive text-xs'>{fieldErrors[key]}</p>
      ) : null}
    </Row>
  );
  ```

  and replace the socials render line (line 385) with:

  ```tsx
          {ICON_FIELDS.filter((f) => f.key !== 'contactEmail').map((field) =>
            iconTextField(field.key, field.label, field.icon, field.placeholder)
          )}
  ```

  and in the Contact card replace `{textField('contactEmail', 'Studio email')}` (line 392) with:

  ```tsx
          {ICON_FIELDS.filter((f) => f.key === 'contactEmail').map((field) =>
            iconTextField(field.key, field.label, field.icon, field.placeholder)
          )}
  ```

  (The filter split keeps each icon row in its ruled card — socials under "Banner & social", the email under "Contact" — while one list owns the icon wiring. `aria-label` stays the plain string — the icon is decorative; the Row's grid layout is unchanged, so the 10rem label column now holds icon + text. `placeholder` stays optional: the email field keeps no placeholder, as today.)

- [ ] **Step 3: favicon links** — in `__root.tsx`, apply the exact same `links` replacement as Task 2 Step 3 (identical four-entry array, same file names — both apps serve the same favicon set from their own `public/`).

- [ ] **Step 4: gates** — `pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`; floors unchanged (279). Commit: `feat(admin): Site tab social + email rows carry brand SVGs + favicon set (#247)`.

### Task 4: Both-themes verification, records, close

- [ ] **Step 1: live look.** `pnpm --filter @sevendays/landing dev` + `pnpm --filter @sevendays/admin dev`: landing footer shows the four icons with links intact (set all three socials + a contact email in the Site tab, save, reload the landing; clear them, reload — the row collapses and the email icon vanishes while the phone link remains, the #215 law per the #247 comment); **the #247-comment 320px check: at a 320px-wide viewport the landing page has NO horizontal overflow, BOTH themes** (the email-icon change exists to kill the old ~312px-string overflow); admin Site tab shows icon + label on the social rows AND the Studio email row in BOTH themes (ThemeToggle); both apps' browser tabs show the favicon (hard-refresh — favicons cache hard). Empty-link hiding on the admin side is N/A (editor inputs always render).
- [ ] **Step 2: full gate.** `pnpm check` green (all workspaces; floors unchanged everywhere).
- [ ] **Step 3: records.** `docs/progress.md` entry (socials icons + favicon set, both apps); v1-picks ledger row per `docs/agents/v1-picks.md`; PR body flags the possible ADR-0022 landing visual-baseline drift (footer pixels changed) as the owner's follow-up call; `graphify update .`.

## Rollback

Revert the PR — static files and two small render diffs; no data, schema, or API surface touched.

## Not here

Landing footer relayout beyond the icon swap; `.ico`/manifest/theme-color; visual-baseline re-capture; any `socialLinksFor`/types/API change (the seam and its tests are deliberately untouched).
