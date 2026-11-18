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
  // resolveSiteSettings is annotated : SiteSettings, so TS sees brandName as
  // string | null even though the fn defines it by construction (the default
  // is always applied) — the assertion is type-level only, a no-op at runtime.
  return { logoImageUrl: settings.logoImageUrl, brandName: settings.brandName as string };
}
