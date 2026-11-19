# Create Button Polish Spec

*Drafted 2026-11-19 from wayfinder map [jeius/sevendays#324](https://github.com/jeius/sevendays/issues/324) — the owner accepted all recommended answers at charting ([the charting record](https://github.com/jeius/sevendays/issues/324#issuecomment-6994349920)); the spec was drafted from those rulings as [issue #335](https://github.com/jeius/sevendays/issues/335) (resolving task [ticket #327](https://github.com/jeius/sevendays/issues/327)). Status: **owner-settled at charting, 2026-11-19**; not yet sliced into tickets — ready for a `/to-tickets` handoff. This document is the repo copy of issue #335.*

## Problem Statement

The admin CMS opens every create flow from a bare text button, across two visual registers: the full-size default `Button` (the PageHeader action on every list screen, the EmptyState action when a list is empty, the packages table's link-button) and the small outline `size='sm'` CardAction button (the lookups screen's per-section cards) — plus one ghost (`size='sm'`) on the gallery. Every other action idiom in the app carries an icon — row edits carry `SquarePen`, the gallery's inline "New category" already leads with the lucide `Plus` — so the create actions read as the CMS's unfinished corners. One label also sits a register longer than its siblings: "New studio service" against "New package", "New branch", "New add-on". The owner ruled the polish at charting: the lucide `Plus` on every admin CMS create action and the one rename, nothing else.

## Solution

- **The lucide `Plus` on every admin CMS create action** — 21 button sites across eight labels; twenty gain the icon, and the gallery's "New category" already carries it (the in-repo precedent, verify-only).
- **One icon law, carried by the shared Button primitive** — sizing, spacing, and rendering come from `packages/ui`'s existing `[&_svg]` rules; zero per-site tuning, zero `packages/ui` changes.
- **"New studio service" shortens to "New service"** everywhere the string appears — five code sites, census-complete.
- **Nothing else moves** — no other label changes, no vocabulary churn beyond the one rename; the Users tab's "Create user" is provisioning, not CMS content, and stays as-is.

## User Stories

1. As a Staff User, I want every create button to carry the same Plus affordance, so that the create action reads at a glance in every list I scan.
2. As a Staff User, I want the icon to look the same on the page headers and the small card actions, so that neither register looks unfinished next to the other.
3. As a Staff User, I want the studio-services create action to say "New service", so that it matches the register of its sibling actions ("New package", "New branch", "New add-on").
4. As an Owner, I want the icon applied to every CMS create action with no site missed, so that the result doesn't drift screen to screen (the census mandate).
5. As an Owner, I want no other copy to move, so that owner-ratified strings stay put.
6. As an Owner, I want to react to the rendered polish on the teaser before it is called done, so that visual acceptance stays a real gate (the #94 amendment).
7. As an implementer, I want the icon law to come from the shared Button primitive, so that no per-site sizing or spacing decisions are invented.
8. As an implementer, I want the gallery's "New category" named as the precedent, so that the composition has prior art to follow verbatim.

## Implementation Decisions

**D1 — The icon law (mechanics).** The markup is `<Plus aria-hidden='true' />` as the button's **first child**, label text after — verbatim the in-repo precedent, the gallery screen's "New category" button (`apps/admin/src/components/gallery/gallery-screen.tsx:723-732`). Sizing and spacing come from the primitive, never per-site: the shared Button (`packages/ui/src/components/button.tsx`) already carries `[&_svg:not([class*='size-'])]:size-4` + `[&_svg]:shrink-0 [&_svg]:pointer-events-none`, with per-size gaps (`gap-1.5` on default/lg, `gap-1` on sm/xs). The glyph renders 16px in **both** registers — the h-8 full-size default Button and the h-7 `size='sm'` outline CardAction — with automatic spacing. No size classes, no `data-icon` attribute, no className tweaks. **Zero `packages/ui` changes** — pure app-side composition over the primitive's existing law.

**D2 — The census (every site).** Twenty-one create-action button sites across eight labels: twenty gain the icon, one already carries it. Line numbers are today's anchors.

- **Studio services** (`apps/admin/src/components/studio-services/studio-services-screen.tsx`): PageHeader action (`:457`) and EmptyState button (`:486`) — full-size — icon + **rename**.
- **Branches** (`apps/admin/src/components/branches/branches-screen.tsx`): PageHeader action (`:424`) and EmptyState button (`:461`) — full-size — icon.
- **Testimonials** (`apps/admin/src/components/testimonials/testimonials-screen.tsx`): PageHeader action (`:500`) and EmptyState button (`:546`) — full-size — icon.
- **Add-ons** (`apps/admin/src/components/addons/addons-screen.tsx`): PageHeader action (`:480`) and EmptyState button (`:509`) — full-size — icon.
- **Packages**: PageHeader action (`apps/admin/src/routes/_shell.packages.index.tsx:36`) and EmptyState button (`apps/admin/src/components/packages/packages-table.tsx:198`) — the same full-size `<Button render={<Link to='/packages/new' />}>` — icon.
- **Lookups** (`apps/admin/src/components/lookups/lookups-screen.tsx`), two sections, five sites each: **Print sizes** — the small outline `size='sm'` CardAction button on the four card postures (error `:668`, pending `:689`, empty `:716`, loaded `:743`) plus the full-size EmptyState button (`:724`); **Attires** (the census finding — see Further Notes) — the identical shape (error `:937`, pending `:957`, empty `:981`, loaded `:1008`, EmptyState `:989`). Icon only, both registers.
- **Gallery** (`apps/admin/src/components/gallery/gallery-screen.tsx`): "New category" (`:723-732`) — ghost `size='sm'` — **already carries the Plus** (`:730`); verify-only, the precedent.

Imports (all `lucide-react`): add `Plus` to the existing import in six files (`studio-services-screen.tsx:39`, `branches-screen.tsx:32`, `testimonials-screen.tsx:54`, `addons-screen.tsx:46`, `lookups-screen.tsx:40`, `packages-table.tsx:28`); a new import in `_shell.packages.index.tsx` (imports no lucide today); `gallery-screen.tsx` already imports it — untouched.

**D3 — The rename.** "New studio service" → "New service" at exactly five code sites — a case-insensitive repo-wide census confirms these are all of them:

1. Both button labels — `studio-services-screen.tsx:457` and `:486`.
2. The create-mode editor title — `studio-services-screen.tsx:658` (`title={editing.mode === 'create' ? 'New studio service' : editing.row.name}`).
3. The screen's mode-switch doc comment — `studio-services-screen.tsx:82` ("create (from `New studio service`)").
4. The route's header comment — `apps/admin/src/routes/_shell.studio-services.tsx:3` ("the `New studio service` action").

**D4 — The boundary (explicitly not this spec).** "Create user" (`apps/admin/src/components/settings/users-tab.tsx:394` full-size, `:406` size-sm) is staff provisioning, not a CMS entity action — untouched. The other entities' create-mode editor titles stay: "New branch" (`branches-screen.tsx:636`), "New testimonial" (`testimonials-screen.tsx:737`), "New add-on" (`addons-screen.tsx:683`), "New print size" (`lookups-screen.tsx:450`), "New attire" (`lookups-screen.tsx:498`), "New package" (`package-editor.tsx:755`). The `New package | Sevendays Admin` head meta (`_shell.packages.new.tsx:10`) is a page title, not a create action. `package-editor.tsx`'s existing `Plus` import (`:73`) serves the frames/inclusions chip UI — untouched. "New password" / "New temporary password" are form field labels, not buttons.

## Testing Decisions

A good test here pins externally observable contracts, not internals: what a caller gets from a seam, never how the seam is wired inside. This spec adds none, deliberately: both changes are pure composition and strings with no seam behind them — the icon law is the primitive's, already shipped in `packages/ui`, and no lib-seam pins exist for button labels or icon children (the admin suite is lib-seam-only; button text lives outside its seams). Nothing to update, nothing to add; the floors hold at their current counts, and `pnpm check` green remains the gate (typecheck catches a missed import, lint/format the usual).

## Out of Scope

- **Implementing the polish** — downstream: `/to-tickets` → SDD.
- **"Create user" (staff provisioning)** and every other non-CMS action (D4).
- **Any label change beyond the one rename** — the other entities' editor titles, the packages head meta, and the form-field labels all stay.
- **Any `packages/ui` change** — the primitive already carries the whole icon law (D1).

## Further Notes

- **Census delta vs the charting list (flagged for the owner)**: the charting enumeration named seven labels; the code census found the eighth — the lookups screen's **Attires** section, byte-identical in shape to print sizes' five sites — covered by the ruling's own words ("Plus icon on **all** admin CMS create actions") and carried in D2.
- **The rendered-variants step** (the #94 amendment): no *new* composition exists — the icon joins established, owner-accepted buttons at two registers, and the one icon-bearing precedent (the gallery's New category) is already live — so the owner reaction is one teaser screenshot pass (a full-size PageHeader create button, a small outline CardAction create button, and the renamed "New service" button, both themes) before merge. Skill set: `prototype` + `ui-ux-pro-max`, loaded at draft time for this spec; owner rulings recorded as overrides — the icon family is **lucide** (the pinned `components.json` trio vocabulary, ADR-0017) over the skill's default-library recommendation (Phosphor), and the icons-domain searches applied (the decorative `aria-hidden` law, token-sized icons, primitive gap alignment).
- **Delivery split**: not yet sliced — the spec is ready for a `/to-tickets` handoff; [issue #335](https://github.com/jeius/sevendays/issues/335) is the canonical copy.
- **Docs note**: historical M5 plan documents (`docs/superpowers/plans/2026-09-24-131-m5-prototype-admin-cms-compositions.md`, `docs/superpowers/plans/2026-09-26-140-m5-06-admin-screens-2.md`) quote the old label verbatim as records of executed plans — left as-is, not living copy.
