# Ticket 275 — footer socials join the copyright row; brand icons readable on ink — implementation plan

**Goal:** The landing footer's socials band dissolves — its whole cluster (social icons + email icon + phone link) moves to the copyright row (`© …` left, cluster right, `justify-between` from `sm+`, stacked left-aligned below `sm`) — and the four brand glyphs stop being black asset `<img>`s that vanish on the ink band: they render as monochrome `currentColor` components from one shared module in `packages/ui` (brand-300 → white on hover in the footer, label-foreground in the admin Site tab), the admin Site tab adopts them (fixing its dark-theme invisibility), and the black asset SVGs delete from both apps.

**Spec:** issue #275 (parent #239, item 18 — https://github.com/jeius/sevendays/issues/275). The owner's rulings are all in the spec's Implementation Decisions (grilled 2026-11-13): whole-cluster move, explicit stack below `sm`, keep the copyright row's rhythm (`mt-6` + hairline + `pt-4`, © text untouched), gmail included, mechanism C (shared `currentColor` module, both apps adopt, asset files deleted), monochrome only (no multicolor brand marks — the ink band's restraint).

**Architecture:** zero API, schema, or seam work — `socialLinksFor`/`footerContactFor` and their tests are untouched (the #215 collapse laws hold upstream, as today). One new file in `packages/ui` (four icon components, resolved via the existing `./components/*` export map — no package.json change). `site-footer.tsx` deletes its socials section and merges the cluster into the copyright row; `site-tab.tsx` swaps `img` refs for components. This plan is the inverse fence of #247's "Not here" ("Landing footer relayout beyond the icon swap; visual-baseline re-capture") — both are T9's deliverables now.

## Global Constraints

- Branch `feat/275-footer-socials-copyright-row` off current main; commit style `type(scope): … (#275)`. Never commit secrets. Tick boxes `- [✅]` (GitHub issues / docs, never plain `[x]`).
- Every find/replace below must match exactly once at execution time; a ≠1 match means the file drifted — stop and reconcile.
- **Monochrome law:** every glyph renders `fill='currentColor'` — no baked hex, no multicolor official brand marks. The component's `aria-hidden='true'` default stays (the anchors' `sr-only` spans are the accessible names, as today).
- Gates per touched workspace: `pnpm --filter @sevendays/ui fix && pnpm --filter @sevendays/ui typecheck` (ui has no test script); `pnpm --filter @sevendays/{landing,admin} fix && pnpm --filter @sevendays/{landing,admin} test -- --run && pnpm --filter @sevendays/{landing,admin} typecheck`; final `pnpm check` green with every floor unchanged — **landing 16 files / 123 tests, admin 27 files / 279 tests** (this plan adds no tests and breaks none: the spec's testing decision is no-new-seams, and the rendering changes sit below every seam's test line).
- If biome rewrites a long class-string ordering, accept `fix`'s rewrite; do not hand-reorder beyond it.
- **Deletion list (Task 4) is exhaustive:** `apps/{landing,admin}/public/brand/{instagram,facebook,tiktok,gmail}.svg` — 8 files, nothing else. The favicon set (`favicon.svg`, `favicon-64.png`, `apple-touch-icon.png` at each app's `public/` root) and the `!public/**/*.svg` biome exclusion in both apps **stay** (`favicon.svg` is still an owner asset that biome must not touch).
- The ADR-0022 visual re-baseline is **post-deploy owner-gated work (Task 6), never part of `pnpm check`** — commit-green and smoke-green stay separate verdicts.
- `docs/progress.md` entry at close; `graphify update .` after the code lands; v1-picks ledger row post-merge per `docs/agents/v1-picks.md` (needs the merged sha + CI runs — the #247 pattern).

### Not here

- No multicolor/official brand-mark styling; no © text change; no branches-band, top-chrome-row, or `LINK_ON_INK` (phone) change.
- No admin chrome/footer work beyond the Site tab's four icon rows; no API/schema/types changes; no favicon work.
- No component/DOM test infrastructure; no `socialLinksFor`/`footerContactFor` edits.
- No re-capture of visual baselines inside the PR — Task 6, after deploy, on intent.

---

### Task 1: `packages/ui` — the shared brand icon module

**Files:**
- Create: `packages/ui/src/components/brand-icons.tsx`

**Interfaces:**
- Produces: `InstagramIcon`, `FacebookIcon`, `TiktokIcon`, `GmailIcon` — each `(props: SVGProps<SVGSVGElement>) => JSX.Element`, one 24×24 single-path glyph, `fill='currentColor'` + `aria-hidden='true'` defaults overridable via props. Import path (both apps): `@sevendays/ui/components/brand-icons` (the existing `./components/*` export map resolves it — no package.json edit).

- [ ] **Step 1: extract the four path `d` values** (each asset is single-path — verified; the values paste into Step 2 byte-for-byte, no reformatting):

  ```bash
  for f in instagram facebook tiktok gmail; do
    echo "== $f"; grep -o 'd="[^"]*"' "apps/landing/public/brand/$f.svg" | sed 's/^d="//; s/"$//'
  done
  ```

  Keep the output in view — Step 2 consumes it. Cross-check the admin copies are identical before Task 4 deletes them: `cmp apps/landing/public/brand/gmail.svg apps/admin/public/brand/gmail.svg` (×4) — identical expected (they were committed as copies); a mismatch = stop and ask.

- [ ] **Step 2: write the module** — `packages/ui/src/components/brand-icons.tsx`, exactly this shape (paste each printed `d` string into its component's `d` attribute — one line each, verbatim):

  ```tsx
  import type { SVGProps } from 'react';

  // The studio's brand glyphs (from the owner's #247 asset set, verbatim path
  // data): monochrome `currentColor` components so every surface colors them —
  // the footer's ink band (brand-300 → white on hover) and the admin's
  // label-foreground rows, both themes (#275). Decorative by default — the
  // consumer's sr-only text is the accessible name.
  function InstagramIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
        <path d='<the instagram d string printed in Step 1>' />
      </svg>
    );
  }

  function FacebookIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
        <path d='<the facebook d string printed in Step 1>' />
      </svg>
    );
  }

  function TiktokIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
        <path d='<the tiktok d string printed in Step 1>' />
      </svg>
    );
  }

  function GmailIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
        <path d='<the gmail d string printed in Step 1>' />
      </svg>
    );
  }

  export { FacebookIcon, GmailIcon, InstagramIcon, TiktokIcon };
  ```

  The `<path>` `d` values are the ONLY unpasted parts — everything else is literal. (The `<the … d string printed in Step 1>` markers are paste slots for the Step 1 output, not prose to invent.)

- [ ] **Step 3: gates** — `pnpm --filter @sevendays/ui fix && pnpm --filter @sevendays/ui typecheck`. Expect: fix rewrites nothing (or only quote/format cosmetics it applies itself); typecheck green.

- [ ] **Step 4: commit** — `git add packages/ui/src/components/brand-icons.tsx && git commit -m "feat(ui): shared brand icon glyphs — currentColor components for the four socials (#275)"`

### Task 2: Landing — the merged copyright row

**Files:**
- Modify: `apps/landing/src/components/site-footer.tsx` (imports ~line 1-7, module scope after `LINK_ON_INK` ~line 18, the socials section + copyright section, lines ~90-129)

**Interfaces:**
- Consumes: `InstagramIcon`, `FacebookIcon`, `TiktokIcon`, `GmailIcon` from Task 1 (`@sevendays/ui/components/brand-icons`).
- Consumes (unchanged): `socialLinksFor` → `{ key: 'instagram' | 'facebook' | 'tiktok'; href; label }[]`, `footerContactFor` → `{ email; phone } | null` — the #215 collapse laws hold upstream, untouched.

- [ ] **Step 1: imports + the key→component record** — add this import beside the existing `@sevendays/ui/components/button` import (biome's import sort places it; accept `fix`'s ordering):

  ```tsx
  import { FacebookIcon, GmailIcon, InstagramIcon, TiktokIcon } from '@sevendays/ui/components/brand-icons';
  ```

  and add at module scope, directly under the `LINK_ON_INK` const:

  ```tsx
  // T9 (#275): the footer's brand glyphs — the socialLinksFor key resolves to
  // its shared currentColor component (the gmail glyph is addressed directly
  // at its anchor below).
  const SOCIAL_ICONS = {
    instagram: InstagramIcon,
    facebook: FacebookIcon,
    tiktok: TiktokIcon,
  } as const;
  ```

- [ ] **Step 2: dissolve the socials section into the copyright row** — replace BOTH trailing sections (everything from the socials gate to the copyright block's closing `</div>` inclusive) — the exact old span:

  ```tsx
        {(socials.length > 0 || contact !== null) && (
          <div className='mt-6 border-white/20 border-t pt-5'>
            <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
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
              {contact?.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className='inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                >
                  <img src='/brand/gmail.svg' alt='' aria-hidden='true' className='size-4' />
                  <span className='sr-only'>{contact.email}</span>
                </a>
              ) : null}
              {contact?.phone ? (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className={LINK_ON_INK}>
                  {contact.phone}
                </a>
              ) : null}
            </div>
          </div>
        )}
        <div className='mt-6 border-white/20 border-t pt-4'>
          <p className='text-white/70 text-xs'>
            © 2026 {settings.brandName} {settings.brandTagline}
          </p>
        </div>
  ```

  with:

  ```tsx
  {/* T9 (#275): the socials band dissolved — the cluster rides the copyright
      row (© left, cluster right from sm+; stacked left-aligned below sm).
      The icons are currentColor glyphs now: brand-300 at rest, white on
      hover — the on-ink link vocabulary. */}
  <div className='mt-6 flex flex-col gap-2 border-white/20 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
    <p className='text-white/70 text-xs'>
      © 2026 {settings.brandName} {settings.brandTagline}
    </p>
    {socials.length > 0 || contact !== null ? (
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
        {socials.map((social) => {
          const SocialIcon = SOCIAL_ICONS[social.key];
          return (
            <a
              key={social.key}
              href={social.href}
              className='inline-flex items-center gap-1.5 rounded-sm text-brand-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            >
              <SocialIcon className='size-4' />
              <span className='sr-only'>{social.label}</span>
            </a>
          );
        })}
        {contact?.email ? (
          <a
            href={`mailto:${contact.email}`}
            className='inline-flex items-center gap-1.5 rounded-sm text-brand-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          >
            <GmailIcon className='size-4' />
            <span className='sr-only'>{contact.email}</span>
          </a>
        ) : null}
        {contact?.phone ? (
          <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className={LINK_ON_INK}>
            {contact.phone}
          </a>
        ) : null}
      </div>
    ) : null}
  </div>
  ```

  What changed, so the reviewer can check each ruling: the section's `mt-6 … pt-5` rhythm is gone (the row keeps the copyright section's `mt-6 … pt-4` verbatim); the gate moved inside the always-rendered row (no socials + no contact → `©` alone, left-aligned — `justify-between` with one child); both icon anchors gained `text-brand-300` (hover/focus classes unchanged from #247's treatment); the phone anchor and `LINK_ON_INK` are byte-identical; `sr-only` accessible names unchanged.

- [ ] **Step 3: gates** — `pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing test -- --run && pnpm --filter @sevendays/landing typecheck`. Floors unchanged (16 files / 123 tests — the rendering change sits below every seam's test line).

- [ ] **Step 4: commit** — `git add apps/landing/src/components/site-footer.tsx && git commit -m "feat(landing): footer socials join the copyright row, icons readable on ink (#275)"`

### Task 3: Admin — the Site tab adopts the shared icons

**Files:**
- Modify: `apps/admin/src/components/settings/site-tab.tsx` (the react type import, `ICON_FIELDS` ~lines 87-102, `iconTextField` ~lines 242-248)

**Interfaces:**
- Consumes: the Task 1 components via `@sevendays/ui/components/brand-icons` (the export map resolves for admin exactly as `@sevendays/ui/components/button` already does).

- [ ] **Step 1: imports** — extend the file's existing react import (a mixed value+type line, controller-verified: `import { type ReactNode, useEffect, useRef, useState } from 'react';` — it carries `ReactNode` for `Row`'s label plus three live hooks) to also carry the two new inline types. Replace that exact line with:

  ```tsx
  import { type ComponentType, type ReactNode, type SVGProps, useEffect, useRef, useState } from 'react';
  ```

  and add beside the other `@sevendays/ui` component imports:

  ```tsx
  import { FacebookIcon, GmailIcon, InstagramIcon, TiktokIcon } from '@sevendays/ui/components/brand-icons';
  ```

  (Do NOT convert the line to a pure `import type` — the three hooks are live values and dropping them breaks the file; biome `fix` settles ordering.)

- [ ] **Step 2: `ICON_FIELDS` carries components** — replace the whole `ICON_FIELDS` const — the exact old block:

  ```tsx
  const ICON_FIELDS: { key: TextKeys; label: string; icon: string; placeholder?: string }[] = [
    {
      key: 'socialInstagram',
      label: 'Instagram URL',
      icon: '/brand/instagram.svg',
      placeholder: 'https://…',
    },
    {
      key: 'socialFacebook',
      label: 'Facebook URL',
      icon: '/brand/facebook.svg',
      placeholder: 'https://…',
    },
    { key: 'socialTiktok', label: 'TikTok URL', icon: '/brand/tiktok.svg', placeholder: 'https://…' },
    { key: 'contactEmail', label: 'Studio email', icon: '/brand/gmail.svg' },
  ];
  ```

  with:

  ```tsx
  const ICON_FIELDS: {
    key: TextKeys;
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    placeholder?: string;
  }[] = [
    { key: 'socialInstagram', label: 'Instagram URL', icon: InstagramIcon, placeholder: 'https://…' },
    { key: 'socialFacebook', label: 'Facebook URL', icon: FacebookIcon, placeholder: 'https://…' },
    { key: 'socialTiktok', label: 'TikTok URL', icon: TiktokIcon, placeholder: 'https://…' },
    { key: 'contactEmail', label: 'Studio email', icon: GmailIcon },
  ];
  ```

- [ ] **Step 3: `iconTextField` renders the component** — in the `iconTextField` arrow const, change the signature's `icon: string` parameter to `Icon: ComponentType<SVGProps<SVGSVGElement>>` and replace its `<img src={icon} alt='' aria-hidden='true' className='size-3.5' />` line with:

  ```tsx
        <Icon className='size-3.5' />
  ```

  Nothing else in `iconTextField` moves — `aria-label` stays the plain label string (the icon is decorative), the `Row`/grid/`Input` wiring is untouched. The two render sites (`ICON_FIELDS.filter(...).map((field) => iconTextField(field.key, field.label, field.icon, field.placeholder))`) need NO edit — `field.icon` is now a component and flows through as-is; typecheck proves it. The icons inherit the label's foreground (`currentColor`, no text class on the glyph) — identical in light, visible in dark: the fix this task exists for.

- [ ] **Step 4: gates** — `pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`. Floors unchanged (27 files / 279 tests — no seam sees the icon swap; nothing pins `ICON_FIELDS`).

- [ ] **Step 5: commit** — `git add apps/admin/src/components/settings/site-tab.tsx && git commit -m "feat(admin): Site tab icon rows adopt the shared brand icons — dark-theme visible (#275)"`

### Task 4: Delete the superseded asset files + the first full check

**Files:**
- Delete: `apps/landing/public/brand/{instagram,facebook,tiktok,gmail}.svg`, `apps/admin/public/brand/{instagram,facebook,tiktok,gmail}.svg` (8 files — the exhaustive list; the `brand/` dirs empty and vanish, untracked-empty)

- [ ] **Step 1: pre-deletion gates** — the Task 1 `cmp` cross-check landed identical (if not: stop and ask), and both apps typecheck green with zero `/brand/` references in src:

  ```bash
  grep -rn "brand/" apps/landing/src apps/admin/src   # expect: no matches
  grep -rn "/brand/" e2e/                             # expect: no matches
  ```

- [ ] **Step 2: delete** —

  ```bash
  git rm apps/landing/public/brand/instagram.svg apps/landing/public/brand/facebook.svg \
         apps/landing/public/brand/tiktok.svg apps/landing/public/brand/gmail.svg \
         apps/admin/public/brand/instagram.svg apps/admin/public/brand/facebook.svg \
         apps/admin/public/brand/tiktok.svg apps/admin/public/brand/gmail.svg
  ls apps/landing/public apps/admin/public   # favicon.svg, favicon-64.png, apple-touch-icon.png, photos/… — all still present
  ```

- [ ] **Step 3: the full gate** — `pnpm check` green end to end (first full-workspace run of the branch — every floor unchanged: landing 16/123, admin 27/279, api/api-client at their AGENTS.md floors, untouched).

- [ ] **Step 4: commit** — `git commit -m "chore(assets): delete the black brand SVGs — superseded by the shared currentColor icon module (#275)"` (the `git rm` already staged the deletions).

### Task 5: Live look, records, PR

- [ ] **Step 1: live look on the dev stack — landing first** (both apps pin `:3000` + ws `:9229` — run serially, never in parallel; see the local-stack quirks): `pnpm --filter @sevendays/landing dev`, then with the Site tab's socials + contact all set (set them via admin, or they're already set on the dev DB):
  - ≥640px viewport: the footer's last row is `© 2026 …` left + the cluster right (socials, gmail icon, phone — today's order); icons read **brand-300 on ink**, hover brightens to white; phone link unchanged (mono brand-300).
  - <640px: © above, cluster below, both left-aligned.
  - 320px-wide viewport, both themes: no horizontal overflow (the #247 law re-checked — the cluster is narrower than the old email-string case).
  - Collapse law live: clear all three socials + the contact email + phone in the Site tab, save, reload — the row degrades to `©` alone, left-aligned. Set only the phone — `©` + the phone link.
  - Then `pnpm --filter @sevendays/admin dev`: Site tab icon rows (3 socials + Studio email) show their glyphs matching the label color in **both themes** (ThemeToggle) — dark theme no longer hides them; light theme looks as today.

- [ ] **Step 2: records** — `docs/progress.md` entry in the house style (`## 2026-11-13 — #275: footer socials join the copyright row + ink-readable brand icons …`, the dense paragraph: the composition ruling, the mechanism-C swap, the admin dark fix, the asset deletion, floors unchanged, the Task 6 baseline regen flagged open until taken); `graphify update .`.

- [ ] **Step 3: commit + PR** — `git add docs/progress.md graphify-out && git commit -m "docs(progress): #275 entry — the T9 footer row + shared brand icons"`, push, open the PR closing #275. The PR body states: the 16 ADR-0022 baselines WILL drift by intent (every fullPage capture includes the footer) — re-capture is Task 6 after deploy, never part of `pnpm check`.

### Task 6: Post-merge, owner-gated — baseline re-capture + the v1-picks row

Not in the PR. Runs after the squash-merge lands and CI deploys teaser (never a bare local `wrangler deploy` — it wipes the CI-passed vars; the #264/#255 lesson).

- [ ] **Step 1: re-baseline on intent** —

  ```bash
  E2E_BASE_URL=<teaser-landing-deployment> E2E_API_URL=<teaser-api-deployment> \
    pnpm test:e2e -- --update-snapshots e2e/visual
  ```

  Watch the run for `error code: 1102` (the teaser worker's CPU cap — #255/#259): if it fires, wait for the worker to recover and re-run; never accept a blank/mid-band capture. Then **eyeball all 16 PNGs** against the ruling: last footer row = `©` left + cluster right at desktop widths, stacked left below `sm`, icons visible on ink in both themes (the footer is theme-fixed ink, so both themes' captures show the same band).

- [ ] **Step 2: commit the baselines** — `git add e2e/visual/redesign.spec.ts-snapshots && git commit -m "chore(e2e): re-baseline the 16 visuals — the #275 footer row (#275)"` and push to main.

- [ ] **Step 3: v1-picks ledger row** — triage pick/skip/split per ADR-0015 against the v1 branch, then add the row to `docs/agents/v1-picks.md` (needs the merged sha + CI runs — post-verdict, the #247/#271 pattern).

## Rollback

Revert the PR — one new ui module, two small render diffs, 8 deleted static files, no data/schema/API surface. The Task 6 baselines revert with their own commit if the row is ever reverted.

## Not here

Multicolor brand marks; ©/branches-band/top-row/`LINK_ON_INK` changes; admin chrome beyond the four icon rows; API/schema/types/favicons; component-test infrastructure; `socialLinksFor`/`footerContactFor` edits; baseline re-capture inside the PR (Task 6 is post-deploy, on intent).


