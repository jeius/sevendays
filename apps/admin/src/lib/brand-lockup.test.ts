import { EMPTY_SITE_SETTINGS, SITE_SETTINGS_DEFAULTS, type SiteSettings } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import {
  BRAND_ROW_RAIL_CLASSES,
  brandLockup,
  LOCKUP_MONOGRAM,
  LOGO_CHIP_GEOMETRY_CLASSES,
  LOGO_IMG_CLASSES,
} from './brand-lockup';

const LOGO_URL = 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.png';

const withLogo: SiteSettings = {
  ...EMPTY_SITE_SETTINGS,
  brandName: 'Sevendays Studio',
  logoImageUrl: LOGO_URL,
};

describe('brandLockup (#322 bug A: the login lockup reads site settings)', () => {
  it('carries the logo URL when set, the <img src> both surfaces render', () => {
    const lockup = brandLockup(withLogo);
    expect(lockup.logoImageUrl).toBe(LOGO_URL);
    expect(lockup.brandName).toBe('Sevendays Studio');
  });

  it('null raw (query pending or failed) resolves the defaults, the monogram fallback, never a throw', () => {
    const lockup = brandLockup(null);
    expect(lockup.logoImageUrl).toBeNull();
    expect(lockup.brandName).toBe(SITE_SETTINGS_DEFAULTS.brandName);
  });

  it('undefined raw resolves identically to null (the SSR/hydration first render)', () => {
    expect(brandLockup(undefined)).toEqual(brandLockup(null));
  });

  it('honors resolveSiteSettings defaults per field, set logo + null brandName resolves both', () => {
    const lockup = brandLockup({
      ...EMPTY_SITE_SETTINGS,
      brandName: null,
      logoImageUrl: LOGO_URL,
    });
    expect(lockup.logoImageUrl).toBe(LOGO_URL);
    expect(lockup.brandName).toBe(SITE_SETTINGS_DEFAULTS.brandName);
  });
});

describe('the lockup geometry/fit vocabulary (#322 bug B: the rail sliver)', () => {
  it('pins the brand row rail posture, column, tightened gap, no horizontal padding', () => {
    expect(BRAND_ROW_RAIL_CLASSES).toContain('group-data-[collapsible=icon]:flex-col');
    expect(BRAND_ROW_RAIL_CLASSES).toContain('group-data-[collapsible=icon]:gap-2');
    expect(BRAND_ROW_RAIL_CLASSES).toContain('group-data-[collapsible=icon]:px-0');
  });

  it('pins the chip geometry guard, never shrinks, steps to size-8 in the rail', () => {
    expect(LOGO_CHIP_GEOMETRY_CLASSES).toContain('shrink-0');
    expect(LOGO_CHIP_GEOMETRY_CLASSES).toContain('group-data-[collapsible=icon]:size-8');
  });

  it('pins the fit ruling, bare contain, no padding (owner 2026-11-18), never cover', () => {
    // toBe pins the WHOLE string: object-contain, no p- utility, nothing else.
    expect(LOGO_IMG_CLASSES).toBe('size-full object-contain');
  });

  it('pins the monogram fallback glyph', () => {
    expect(LOCKUP_MONOGRAM).toBe('SD');
  });
});
